import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import crypto from "crypto";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";

// ── Simple in-memory rate limiter ────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function rateLimit(ip: string, maxPerMinute = 20): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= maxPerMinute) return false;
  entry.count++;
  return true;
}

// ── Vault (JSON file used in web/dev server mode) ────────────────────────────
const DATA_DIR  = path.join(process.cwd(), ".texflow_data");
const VAULT_FILE = path.join(DATA_DIR, "texflow_vault.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function readVault(): Record<string, unknown> {
  try {
    if (fs.existsSync(VAULT_FILE))
      return JSON.parse(fs.readFileSync(VAULT_FILE, "utf8"));
  } catch { /* corrupt — start fresh */ }
  return {};
}

function writeVault(vault: Record<string, unknown>): void {
  fs.writeFileSync(VAULT_FILE, JSON.stringify(vault), "utf8");
}

// ── JWT (same algorithm as electron/main.cjs) ─────────────────────────────────
const JWT_SECRET = crypto
  .createHash("sha256")
  .update(VAULT_FILE + "texflow-jwt-v1")
  .digest("hex");
const JWT_EXPIRY_SECONDS = 60 * 60 * 12; // 12 hours

function base64url(s: string) {
  return Buffer.from(s).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function signToken(payload: Record<string, unknown>): string {
  const header  = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body    = base64url(JSON.stringify(payload));
  const sig     = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  return `${header}.${body}.${sig}`;
}
function verifyToken(token: string): Record<string, unknown> | null {
  try {
    const [header, body, sig] = token.split(".");
    const expected = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${header}.${body}`)
      .digest("base64")
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, "base64").toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

function requireAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const header = req.headers["authorization"] || "";
  const token  = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Unauthorized" });
  (req as any).jwtPayload = payload;
  next();
}

async function startServer() {
  const app  = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // ── Public health/ping endpoints ─────────────────────────────────────────────
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/ping",   (_req, res) => res.json({ ok: true }));

  // ── Auth: login ──────────────────────────────────────────────────────────────
  app.post("/api/auth/login", (req, res) => {
    const { username, passwordHash } = req.body;
    if (!username || !passwordHash)
      return res.status(400).json({ error: "username and passwordHash required" });

    const vault = readVault();
    const team  = Array.isArray(vault.team) ? (vault.team as any[]) : [];

    const member = team.find((t: any) =>
      (t.username?.toLowerCase() === username.toLowerCase() ||
       t.name?.toLowerCase()     === username.toLowerCase() ||
       t.id?.toLowerCase()       === username.toLowerCase()) &&
      t.passwordHash === passwordHash &&
      t.status === "ACTIVE" &&
      !t.deleted
    );
    if (member) {
      const token = signToken({
        sub: member.id, name: member.name, role: member.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + JWT_EXPIRY_SECONDS,
      });
      return res.json({ success: true, token, user: member });
    }

    // Seed admin — first boot only
    const SEED_HASH = "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9";
    const activeTeam = team.filter((t: any) => !t.deleted);
    if (username === "admin" && passwordHash === SEED_HASH && activeTeam.length === 0) {
      const adminUser = { id: "admin", name: "Administrator", role: "ADMIN", status: "ACTIVE" };
      const token = signToken({
        sub: "admin", name: "Administrator", role: "ADMIN", seedAdmin: true,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + JWT_EXPIRY_SECONDS,
      });
      return res.json({ success: true, token, user: adminUser, mustChangePassword: true });
    }

    return res.status(401).json({ error: "Invalid credentials" });
  });

  // ── Auth: me (session revalidation) ─────────────────────────────────────────
  app.get("/api/auth/me", (req, res) => {
    const header = req.headers["authorization"] || "";
    const token  = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ error: "Unauthorized" });

    const vault  = readVault();
    const team   = Array.isArray(vault.team) ? (vault.team as any[]) : [];
    const member = team.find((t: any) => t.id === payload.sub && t.status === "ACTIVE" && !t.deleted);

    if (!member && !payload.seedAdmin)
      return res.status(401).json({ error: "User not found or inactive" });

    const user = member || { id: "admin", name: "Administrator", role: "ADMIN", status: "ACTIVE" };
    const mustChangePassword = Boolean(payload.seedAdmin) && !vault.admin_seed_changed;
    return res.json({ success: true, user, mustChangePassword });
  });

  // ── Data: full vault ─────────────────────────────────────────────────────────
  app.get("/api/data", requireAuth, (_req, res) => {
    res.json({ success: true, data: readVault() });
  });

  // ── Data: single shard read ──────────────────────────────────────────────────
  app.get("/api/shard/:key", requireAuth, (req, res) => {
    const vault = readVault();
    const key   = req.params.key;
    if (!(key in vault)) return res.status(404).json({ error: "key not found" });
    res.json({ success: true, key, data: vault[key] });
  });

  // ── Data: shard write ────────────────────────────────────────────────────────
  app.post("/api/shard", requireAuth, (req, res) => {
    const { key, data } = req.body;
    if (!key) return res.status(400).json({ error: "key required" });
    const vault = readVault();
    vault[key]  = data;
    writeVault(vault);
    res.json({ success: true });
  });

  // ── Email send ──────────────────────────────────────────────────────────────
  app.post("/api/email/send", requireAuth, async (req, res) => {
    // Rate-limit: max 10 send calls per minute per IP
    const ip = req.ip || "unknown";
    if (!rateLimit(ip, 10)) {
      return res.status(429).json({ error: "Too many requests — slow down." });
    }

    try {
      const { config, to, subject, text, html } = req.body;
      const { smtpHost, smtpPort, smtpUser, smtpPass } = config ?? {};

      if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
        return res.status(400).json({ error: "Missing SMTP configuration" });
      }

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });

      const info = await transporter.sendMail({
        from: smtpUser,
        to,
        subject,
        text,
        html,
      });

      res.json({ success: true, messageId: info.messageId });
    } catch (error: any) {
      // Do NOT echo the full error — it may contain credentials
      console.error("SMTP Error:", error?.code || error?.message);
      res.status(500).json({ error: "Failed to send email. Check SMTP settings." });
    }
  });

  // ── Email inbox ─────────────────────────────────────────────────────────────
  app.post("/api/email/inbox", requireAuth, async (req, res) => {
    const ip = req.ip || "unknown";
    if (!rateLimit(ip, 20)) {
      return res.status(429).json({ error: "Too many requests — slow down." });
    }

    try {
      const { config, folder = "INBOX" } = req.body;
      let imapHost: string = config?.smtpHost ?? "";
      if (imapHost.startsWith("smtp.")) {
        imapHost = imapHost.replace("smtp.", "imap.");
      }

      const client = new ImapFlow({
        host: imapHost,
        port: 993,
        secure: true,
        auth: { user: config.smtpUser, pass: config.smtpPass },
        logger: false as any,
      });

      await client.connect();

      // Fuzzy-match folder name to actual IMAP path
      let imapFolder = "INBOX";
      try {
        const list = await client.list();
        const targetLower = folder.toLowerCase();
        const match =
          list.find((l) => l.name.toLowerCase() === targetLower) ||
          list.find((l) => l.path.toLowerCase().includes(targetLower));
        if (match && folder !== "INBOX") {
          imapFolder = match.path;
        }
        if (!match && folder !== "INBOX") {
          const specialUseMap: Record<string, string> = {
            SENT: "\\Sent",
            TRASH: "\\Trash",
            STARRED: "\\Flagged",
            DRAFTS: "\\Drafts",
          };
          const specialUse = specialUseMap[folder.toUpperCase()];
          if (specialUse) {
            const specialMatch = list.find(
              (l) => (l as any).specialUse === specialUse
            );
            if (specialMatch) imapFolder = specialMatch.path;
          }
        }
      } catch (e) {
        console.warn("Could not list folders, defaulting to INBOX", e);
      }

      let lock;
      try {
        lock = await client.getMailboxLock(imapFolder);
      } catch {
        lock = await client.getMailboxLock("INBOX");
      }

      const messages: any[] = [];
      try {
        const status = client.mailbox;
        const total = status && typeof status === 'object' && 'exists' in status ? status.exists : 0;

        // FIX #8: Skip fetch entirely when mailbox is empty — avoids IMAP range error
        if (total > 0) {
          const start = Math.max(1, total - 19);
          const fetchRange = `${start}:${total}`;
          for await (const message of client.fetch(
            fetchRange,
            { source: true, envelope: true, flags: true },
            { uid: true }
          )) {
            const parsed: any = await simpleParser(message.source as any);
            messages.push({
              id: message.uid.toString(),
              sender:
                parsed.from?.text || message.envelope?.from?.[0]?.address,
              subject: parsed.subject || "(No Subject)",
              preview: parsed.text ? parsed.text.substring(0, 100) : "",
              html: parsed.textAsHtml || parsed.html,
              time: parsed.date
                ? parsed.date.toISOString()
                : new Date().toISOString(),
              isRead: message.flags?.has("\\Seen") || false,
              isStarred: message.flags?.has("\\Flagged") || false,
              attachments: parsed.attachments
                ? parsed.attachments.map((a: any) => ({
                    filename: a.filename,
                    contentType: a.contentType,
                    size: a.size,
                  }))
                : [],
            });
            if (messages.length >= 20) break;
          }
        }
      } finally {
        lock.release();
        try {
          await client.logout();
        } catch {
          /* ignore logout errors */
        }
      }

      res.json({ emails: messages.reverse() });
    } catch (error: any) {
      console.error("IMAP Error:", error?.code || error?.message);
      res.status(500).json({ error: "Failed to fetch inbox. Check IMAP settings." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
