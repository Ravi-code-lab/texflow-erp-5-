import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";

// ── Simple in-memory rate limiter ────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function rateLimit(ip: string, maxPerMinute = 20): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true; // allowed
  }
  if (entry.count >= maxPerMinute) return false; // blocked
  entry.count++;
  return true;
}

// ── API key auth middleware ───────────────────────────────────────────────────
// On first startup an API key is generated and printed to the server console.
// The Electron main process / LAN clients must send it as:
//   Authorization: Bearer <API_KEY>
// The key can also be set via env var TEXFLOW_API_KEY for reproducible deploys.
const API_KEY: string =
  process.env.TEXFLOW_API_KEY || crypto.randomBytes(24).toString("hex");

if (!process.env.TEXFLOW_API_KEY) {
  console.log("\n========================================");
  console.log("  TexFlow Server API Key (save this!):");
  console.log(`  ${API_KEY}`);
  console.log("========================================\n");
}

function requireAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const header = req.headers["authorization"] || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  // Constant-time comparison to avoid timing attacks
  if (
    token.length !== API_KEY.length ||
    !crypto.timingSafeEqual(Buffer.from(token), Buffer.from(API_KEY))
  ) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check — no auth required (used by LAN clients to detect server)
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
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
