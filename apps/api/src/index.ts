/**
 * index.ts - satu Worker: email() + fetch() (REST + UI) + scheduled() (purge).
 *
 * Kontrak REST TIRU PERSIS sudevmail (lihat memory sudevmail-api-contract) supaya
 * 5 project lama cukup ganti base URL:
 *   POST /api/address/generate  {prefix}  -> {id, address, createdAt, expiresAt}  (409 kalau dipakai)
 *   GET  /api/inbox/{address}             -> {address, expiresAt, emails[header]}  (404 kalau tak ada)
 *   GET  /api/email/{id}                  -> pesan penuh incl. body_text/body_html
 * Envelope: {success, data} | {success, error}. Waktu = epoch DETIK. Field row = snake_case.
 *
 * Realtime: email() menyimpan ke D1 lalu memberi tahu DO InboxRoom milik alamat
 * itu (idFromName(address)) → di-push ke tab yang konek via /ws/{address}.
 */

import type { EmailHeader, Envelope } from "@jimel/shared";
import { Hono } from "hono";
import { cors } from "hono/cors";
import PostalMime from "postal-mime";
import { InboxRoom } from "./inbox-room";
import {
  cleanText,
  isValidPrefix,
  mailDomains,
  normAddress,
  nowSec,
  ttlMinutes,
  uuid,
} from "./lib";
import type { AddressRow, EmailRow, Env } from "./types";

export { InboxRoom };

// ── Helper envelope ──
const ok = <T>(data: T): Envelope<T> => ({ success: true, data });
const fail = (error: string): Envelope<never> => ({ success: false, error });

const app = new Hono<{ Bindings: Env }>();

// Client sudevmail dipanggil cross-origin dari berbagai project → izinkan CORS.
app.use("/api/*", cors({ origin: "*", allowMethods: ["GET", "POST", "OPTIONS", "DELETE"] }));

/**
 * GET /api/domains
 * Daftar domain aktif (catch-all-nya diarahkan ke Worker ini). Domain pertama
 * = default. UI pakai ini untuk mengisi dropdown pilih domain.
 */
app.get("/api/domains", (c) => {
  return c.json(ok(mailDomains(c.env)));
});

/**
 * POST /api/address/generate  { prefix }
 * Claim satu alamat. 409 kalau prefix sudah dipakai (client re-roll di 409 saja).
 */
app.post("/api/address/generate", async (c) => {
  let body: { prefix?: string; domain?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json(fail("Invalid JSON body."), 400);
  }

  const prefix = (body.prefix ?? "").trim().toLowerCase();
  if (!isValidPrefix(prefix)) {
    return c.json(fail("prefix must be 1-64 alphanumeric characters."), 400);
  }

  // Domain harus salah satu yang aktif. Kalau client tidak mengirim, pakai default
  // (domain pertama). Ini mencegah orang meng-claim alamat di domain yang tidak
  // catch-all-nya diarahkan ke sini (email-nya tak akan pernah sampai).
  const domains = mailDomains(c.env);
  const defaultDomain = domains[0];
  if (!defaultDomain) {
    return c.json(fail("No mail domains configured."), 500);
  }
  const domain = (body.domain ?? "").trim().toLowerCase() || defaultDomain;
  if (!domains.includes(domain)) {
    return c.json(fail("Unknown domain."), 400);
  }

  const address = `${prefix}@${domain}`;
  const now = nowSec();
  const expiresAt = now + ttlMinutes(c.env) * 60;

  // INSERT ... yang gagal karena PK sudah ada = 409. Cek existing dulu supaya
  // pesan error jelas, lalu insert (race tetap ditangani oleh PK constraint).
  const existing = await c.env.DB.prepare("SELECT address FROM addresses WHERE address = ?")
    .bind(address)
    .first<{ address: string }>();
  if (existing) {
    return c.json(fail("That address is already taken."), 409);
  }

  try {
    await c.env.DB.prepare(
      "INSERT INTO addresses (address, created_at, expires_at) VALUES (?, ?, ?)",
    )
      .bind(address, now, expiresAt)
      .run();
  } catch {
    // Kemungkinan race: baris keburu dibuat request lain → tetap 409.
    return c.json(fail("That address is already taken."), 409);
  }

  return c.json(ok({ id: address, address, domain, createdAt: now, expiresAt }));
});

/**
 * GET /api/inbox/{address}
 * Daftar header email. 404 kalau alamat belum pernah di-claim (client anggap kosong).
 */
app.get("/api/inbox/:address", async (c) => {
  const address = normAddress(c.req.param("address"));

  const addr = await c.env.DB.prepare(
    "SELECT address, created_at, expires_at FROM addresses WHERE address = ?",
  )
    .bind(address)
    .first<AddressRow>();
  if (!addr) {
    return c.json(fail("Inbox not found."), 404);
  }

  const rows = await c.env.DB.prepare(
    `SELECT id, sender, sender_name, subject, received_at, is_read
       FROM emails WHERE address = ? ORDER BY received_at DESC`,
  )
    .bind(address)
    .all<Omit<EmailRow, "address" | "body_text" | "body_html" | "expires_at">>();

  const emails: EmailHeader[] = (rows.results ?? []).map((r) => ({
    id: r.id,
    sender: r.sender,
    sender_name: r.sender_name,
    subject: r.subject,
    received_at: r.received_at,
    is_read: r.is_read === 1,
  }));

  return c.json(ok({ address: addr.address, expiresAt: addr.expires_at, emails }));
});

/**
 * GET /api/email/{id}
 * Satu pesan penuh. Membaca email menandainya is_read=1.
 */
app.get("/api/email/:id", async (c) => {
  const id = c.req.param("id");
  const row = await c.env.DB.prepare("SELECT * FROM emails WHERE id = ?")
    .bind(id)
    .first<EmailRow>();
  if (!row) {
    return c.json(fail("Email not found."), 404);
  }

  if (row.is_read !== 1) {
    await c.env.DB.prepare("UPDATE emails SET is_read = 1 WHERE id = ?").bind(id).run();
  }

  return c.json(
    ok({
      id: row.id,
      address: row.address,
      sender: row.sender,
      sender_name: row.sender_name,
      subject: row.subject,
      body_text: cleanText(row.body_text),
      body_html: row.body_html ?? "",
      received_at: row.received_at,
      is_read: true,
    }),
  );
});

/**
 * DELETE /api/email/{id}
 * Hapus satu email dari inbox. Idempotent: balas {deleted:true} walau row sudah
 * tidak ada (biar UI yang meng-klik hapus dua kali tidak error).
 */
app.delete("/api/email/:id", async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare("DELETE FROM emails WHERE id = ?").bind(id).run();
  return c.json(ok({ deleted: true }));
});

/**
 * GET /ws/{address}  - upgrade WebSocket, diteruskan ke DO alamat tsb.
 * Fallback: kalau bukan upgrade, balas 426 supaya klien tahu harus polling.
 */
app.get("/ws/:address", async (c) => {
  if (c.req.header("Upgrade") !== "websocket") {
    return c.text("Expected websocket upgrade.", 426);
  }
  const address = normAddress(c.req.param("address"));
  const stub = c.env.INBOX.get(c.env.INBOX.idFromName(address));
  return stub.fetch(new Request("https://do/connect", { headers: c.req.raw.headers }));
});

const worker = {
  fetch: app.fetch,

  /**
   * email() - hanya Email Worker yang bisa terima mail. Catch-all domain
   * diarahkan ke sini. Parse → simpan ke D1 (kalau alamat pernah di-claim) →
   * beri tahu DO untuk push realtime.
   */
  async email(message: ForwardableEmailMessage, env: Env, _ctx: ExecutionContext): Promise<void> {
    const address = normAddress(message.to);

    // Hanya simpan untuk alamat yang di-claim & belum kadaluarsa. Sisanya
    // dibuang diam-diam (tidak bounce) supaya spam ke alamat acak tidak numpuk.
    const addr = await env.DB.prepare("SELECT address, expires_at FROM addresses WHERE address = ?")
      .bind(address)
      .first<AddressRow>();
    const now = nowSec();
    if (!addr || addr.expires_at <= now) return;

    // Parse MIME. postal-mime jalan di workerd (tanpa dependensi native).
    const parsed = await PostalMime.parse(message.raw);

    const id = uuid();
    const senderAddr = parsed.from?.address ?? message.from ?? "";
    const senderName = parsed.from?.name ?? "";
    const subject = parsed.subject ?? "";
    const bodyText = cleanText(parsed.text);
    const bodyHtml = parsed.html ?? "";
    const expiresAt = now + ttlMinutes(env) * 60;

    await env.DB.prepare(
      `INSERT INTO emails
         (id, address, sender, sender_name, subject, body_text, body_html, received_at, expires_at, is_read)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    )
      .bind(id, address, senderAddr, senderName, subject, bodyText, bodyHtml, now, expiresAt)
      .run();

    // Push realtime ke tab yang sedang buka inbox ini (best-effort).
    const header: EmailHeader = {
      id,
      sender: senderAddr,
      sender_name: senderName,
      subject,
      received_at: now,
      is_read: false,
    };
    try {
      const stub = env.INBOX.get(env.INBOX.idFromName(address));
      await stub.fetch(
        new Request("https://do/notify", {
          method: "POST",
          body: JSON.stringify(header),
          headers: { "Content-Type": "application/json" },
        }),
      );
    } catch {
      /* DO tidak wajib; polling REST tetap menemukan email ini */
    }
  },

  /** scheduled() - cron purge: hapus email & alamat yang sudah kadaluarsa. */
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    const now = nowSec();
    ctx.waitUntil(
      (async () => {
        await env.DB.prepare("DELETE FROM emails WHERE expires_at <= ?").bind(now).run();
        await env.DB.prepare("DELETE FROM addresses WHERE expires_at <= ?").bind(now).run();
      })(),
    );
  },
};

export default worker;
