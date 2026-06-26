var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_nodemailer = __toESM(require("nodemailer"), 1);
var import_imapflow = require("imapflow");
var import_mailparser = require("mailparser");
var import_crypto = __toESM(require("crypto"), 1);
var import_fs = __toESM(require("fs"), 1);
var rateLimitMap = /* @__PURE__ */ new Map();
function rateLimit(ip, maxPerMinute = 20) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 6e4 });
    return true;
  }
  if (entry.count >= maxPerMinute) return false;
  entry.count++;
  return true;
}
var DATA_DIR = import_path.default.join(process.cwd(), ".texflow_data");
var VAULT_FILE = import_path.default.join(DATA_DIR, "texflow_vault.json");
if (!import_fs.default.existsSync(DATA_DIR)) import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
function readVault() {
  try {
    if (import_fs.default.existsSync(VAULT_FILE))
      return JSON.parse(import_fs.default.readFileSync(VAULT_FILE, "utf8"));
  } catch {
  }
  return {};
}
function writeVault(vault) {
  import_fs.default.writeFileSync(VAULT_FILE, JSON.stringify(vault), "utf8");
}
var JWT_SECRET = import_crypto.default.createHash("sha256").update(VAULT_FILE + "texflow-jwt-v1").digest("hex");
var JWT_EXPIRY_SECONDS = 60 * 60 * 12;
function base64url(s) {
  return Buffer.from(s).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function signToken(payload) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify(payload));
  const sig = import_crypto.default.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  return `${header}.${body}.${sig}`;
}
function verifyToken(token) {
  try {
    const [header, body, sig] = token.split(".");
    const expected = import_crypto.default.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, "base64").toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1e3)) return null;
    return payload;
  } catch {
    return null;
  }
}
function requireAuth(req, res, next) {
  const header = req.headers["authorization"] || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Unauthorized" });
  req.jwtPayload = payload;
  next();
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json({ limit: "50mb" }));
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/ping", (_req, res) => res.json({ ok: true }));
  app.post("/api/auth/login", (req, res) => {
    const { username, passwordHash } = req.body;
    if (!username || !passwordHash)
      return res.status(400).json({ error: "username and passwordHash required" });
    const vault = readVault();
    const team = Array.isArray(vault.team) ? vault.team : [];
    const member = team.find(
      (t) => (t.username?.toLowerCase() === username.toLowerCase() || t.name?.toLowerCase() === username.toLowerCase() || t.id?.toLowerCase() === username.toLowerCase()) && t.passwordHash === passwordHash && t.status === "ACTIVE" && !t.deleted
    );
    if (member) {
      const token = signToken({
        sub: member.id,
        name: member.name,
        role: member.role,
        iat: Math.floor(Date.now() / 1e3),
        exp: Math.floor(Date.now() / 1e3) + JWT_EXPIRY_SECONDS
      });
      return res.json({ success: true, token, user: member });
    }
    const SEED_HASH = "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9";
    const activeTeam = team.filter((t) => !t.deleted);
    if (username === "admin" && passwordHash === SEED_HASH && activeTeam.length === 0) {
      const adminUser = { id: "admin", name: "Administrator", role: "ADMIN", status: "ACTIVE" };
      const token = signToken({
        sub: "admin",
        name: "Administrator",
        role: "ADMIN",
        seedAdmin: true,
        iat: Math.floor(Date.now() / 1e3),
        exp: Math.floor(Date.now() / 1e3) + JWT_EXPIRY_SECONDS
      });
      return res.json({ success: true, token, user: adminUser, mustChangePassword: true });
    }
    return res.status(401).json({ error: "Invalid credentials" });
  });
  app.get("/api/auth/me", (req, res) => {
    const header = req.headers["authorization"] || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ error: "Unauthorized" });
    const vault = readVault();
    const team = Array.isArray(vault.team) ? vault.team : [];
    const member = team.find((t) => t.id === payload.sub && t.status === "ACTIVE" && !t.deleted);
    if (!member && !payload.seedAdmin)
      return res.status(401).json({ error: "User not found or inactive" });
    const user = member || { id: "admin", name: "Administrator", role: "ADMIN", status: "ACTIVE" };
    const mustChangePassword = Boolean(payload.seedAdmin) && !vault.admin_seed_changed;
    return res.json({ success: true, user, mustChangePassword });
  });
  app.get("/api/data", requireAuth, (_req, res) => {
    res.json({ success: true, data: readVault() });
  });
  app.get("/api/shard/:key", requireAuth, (req, res) => {
    const vault = readVault();
    const key = req.params.key;
    if (!(key in vault)) return res.status(404).json({ error: "key not found" });
    res.json({ success: true, key, data: vault[key] });
  });
  app.post("/api/shard", requireAuth, (req, res) => {
    const { key, data } = req.body;
    if (!key) return res.status(400).json({ error: "key required" });
    const vault = readVault();
    vault[key] = data;
    writeVault(vault);
    res.json({ success: true });
  });
  app.post("/api/email/send", requireAuth, async (req, res) => {
    const ip = req.ip || "unknown";
    if (!rateLimit(ip, 10)) {
      return res.status(429).json({ error: "Too many requests \u2014 slow down." });
    }
    try {
      const { config, to, subject, text, html } = req.body;
      const { smtpHost, smtpPort, smtpUser, smtpPass } = config ?? {};
      if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
        return res.status(400).json({ error: "Missing SMTP configuration" });
      }
      const transporter = import_nodemailer.default.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass }
      });
      const info = await transporter.sendMail({
        from: smtpUser,
        to,
        subject,
        text,
        html
      });
      res.json({ success: true, messageId: info.messageId });
    } catch (error) {
      console.error("SMTP Error:", error?.code || error?.message);
      res.status(500).json({ error: "Failed to send email. Check SMTP settings." });
    }
  });
  app.post("/api/email/inbox", requireAuth, async (req, res) => {
    const ip = req.ip || "unknown";
    if (!rateLimit(ip, 20)) {
      return res.status(429).json({ error: "Too many requests \u2014 slow down." });
    }
    try {
      const { config, folder = "INBOX" } = req.body;
      let imapHost = config?.smtpHost ?? "";
      if (imapHost.startsWith("smtp.")) {
        imapHost = imapHost.replace("smtp.", "imap.");
      }
      const client = new import_imapflow.ImapFlow({
        host: imapHost,
        port: 993,
        secure: true,
        auth: { user: config.smtpUser, pass: config.smtpPass },
        logger: false
      });
      await client.connect();
      let imapFolder = "INBOX";
      try {
        const list = await client.list();
        const targetLower = folder.toLowerCase();
        const match = list.find((l) => l.name.toLowerCase() === targetLower) || list.find((l) => l.path.toLowerCase().includes(targetLower));
        if (match && folder !== "INBOX") {
          imapFolder = match.path;
        }
        if (!match && folder !== "INBOX") {
          const specialUseMap = {
            SENT: "\\Sent",
            TRASH: "\\Trash",
            STARRED: "\\Flagged",
            DRAFTS: "\\Drafts"
          };
          const specialUse = specialUseMap[folder.toUpperCase()];
          if (specialUse) {
            const specialMatch = list.find(
              (l) => l.specialUse === specialUse
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
      const messages = [];
      try {
        const status = client.mailbox;
        const total = status && typeof status === "object" && "exists" in status ? status.exists : 0;
        if (total > 0) {
          const start = Math.max(1, total - 19);
          const fetchRange = `${start}:${total}`;
          for await (const message of client.fetch(
            fetchRange,
            { source: true, envelope: true, flags: true },
            { uid: true }
          )) {
            const parsed = await (0, import_mailparser.simpleParser)(message.source);
            messages.push({
              id: message.uid.toString(),
              sender: parsed.from?.text || message.envelope?.from?.[0]?.address,
              subject: parsed.subject || "(No Subject)",
              preview: parsed.text ? parsed.text.substring(0, 100) : "",
              html: parsed.textAsHtml || parsed.html,
              time: parsed.date ? parsed.date.toISOString() : (/* @__PURE__ */ new Date()).toISOString(),
              isRead: message.flags?.has("\\Seen") || false,
              isStarred: message.flags?.has("\\Flagged") || false,
              attachments: parsed.attachments ? parsed.attachments.map((a) => ({
                filename: a.filename,
                contentType: a.contentType,
                size: a.size
              })) : []
            });
            if (messages.length >= 20) break;
          }
        }
      } finally {
        lock.release();
        try {
          await client.logout();
        } catch {
        }
      }
      res.json({ emails: messages.reverse() });
    } catch (error) {
      console.error("IMAP Error:", error?.code || error?.message);
      res.status(500).json({ error: "Failed to fetch inbox. Check IMAP settings." });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
