/**
 * index.ts - one Worker: email() + fetch() (REST + UI) + scheduled() (purge).
 *
 * The REST contract MIRRORS sudevmail EXACTLY (see the sudevmail-api-contract memory)
 * so the 5 legacy projects only need to swap their base URL:
 *   POST /api/address/generate  {prefix}  -> {id, address, createdAt, expiresAt, created}
 *       Idempotent: an existing address is OPENED (created:false), not refused, so one
 *       inbox can be shared. Send {exclusive:true} to get the old 409-if-taken behavior.
 *   GET  /api/inbox/{address}             -> {address, expiresAt, emails[header]}  (404 if missing)
 *   GET  /api/email/{id}                  -> full message incl. body_text/body_html
 * Envelope: {success, data} | {success, error}. Time = epoch SECONDS. Row fields = snake_case.
 *
 * Realtime: email() stores to D1 then notifies that address's InboxRoom DO
 * (idFromName(address)) -> pushed to tabs connected via /ws/{address}.
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

// ── Envelope helper ──
const ok = <T>(data: T): Envelope<T> => ({ success: true, data });
const fail = (error: string): Envelope<never> => ({ success: false, error });

const app = new Hono<{ Bindings: Env }>();

// The D1 database is auto-provisioned empty (Deploy to Cloudflare / Workers Builds),
// so the Worker owns its schema and creates the tables on first use. IF NOT EXISTS
// makes this idempotent; the flag keeps it to one batch per isolate, not per request.
let schemaReady = false;
async function ensureSchema(env: Env): Promise<void> {
  if (schemaReady) return;
  await env.DB.batch([
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS addresses (
         address    TEXT PRIMARY KEY,
         created_at INTEGER NOT NULL,
         expires_at INTEGER NOT NULL
       )`,
    ),
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS emails (
         id          TEXT PRIMARY KEY,
         address     TEXT NOT NULL,
         sender      TEXT NOT NULL DEFAULT '',
         sender_name TEXT NOT NULL DEFAULT '',
         subject     TEXT NOT NULL DEFAULT '',
         body_text   TEXT NOT NULL DEFAULT '',
         body_html   TEXT NOT NULL DEFAULT '',
         received_at INTEGER NOT NULL,
         expires_at  INTEGER NOT NULL,
         is_read     INTEGER NOT NULL DEFAULT 0
       )`,
    ),
    env.DB.prepare(
      "CREATE INDEX IF NOT EXISTS idx_emails_address ON emails(address, received_at DESC)",
    ),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_emails_expires ON emails(expires_at)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_addresses_expires ON addresses(expires_at)"),
  ]);
  schemaReady = true;
}

// Every API/WS request goes through the schema guard first (cheap after the first).
app.use("*", async (c, next) => {
  await ensureSchema(c.env);
  await next();
});

// The sudevmail client is called cross-origin from several projects -> allow CORS.
app.use("/api/*", cors({ origin: "*", allowMethods: ["GET", "POST", "OPTIONS", "DELETE"] }));

/**
 * GET /api/domains
 * List of active domains (their catch-all points at this Worker). First domain
 * = default. The UI uses this to fill the domain picker dropdown.
 */
app.get("/api/domains", (c) => {
  return c.json(ok(mailDomains(c.env)));
});

/**
 * POST /api/address/generate  { prefix, domain?, exclusive? }
 *
 * Claim an address, or OPEN it if it already exists ("claim or open"). The call is
 * idempotent: two browsers asking for the same address both get it and both see the
 * same inbox, because an address is a mailbox name, not an owned resource - there is
 * no auth here, so refusing the second caller protected nothing and only made a
 * still-live inbox unreachable.
 *
 * `created` in the reply tells the two cases apart (true = the row was just inserted).
 * An already-existing address keeps its ORIGINAL createdAt/expiresAt - opening an
 * inbox must not silently extend its lifetime. An expired row is reclaimed as new
 * (its emails are already gone or about to be purged by cron).
 *
 * `exclusive: true` restores the old behavior and replies 409 when the address exists.
 * Automations that want a fresh throwaway address (random prefix + re-roll on 409)
 * should send it, so a collision does not hand them somebody else's inbox.
 */
app.post("/api/address/generate", async (c) => {
  let body: { prefix?: string; domain?: string; exclusive?: boolean };
  try {
    body = await c.req.json();
  } catch {
    return c.json(fail("Invalid JSON body."), 400);
  }

  const prefix = (body.prefix ?? "").trim().toLowerCase();
  if (!isValidPrefix(prefix)) {
    return c.json(fail("prefix must be 1-64 alphanumeric characters."), 400);
  }

  // The domain must be one of the active ones. If the client sends none, use the
  // default (first domain). This stops people from claiming an address on a domain
  // whose catch-all is NOT pointed here (its email would never arrive).
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

  const existing = await c.env.DB.prepare(
    "SELECT address, created_at, expires_at FROM addresses WHERE address = ?",
  )
    .bind(address)
    .first<AddressRow>();

  // A row past its TTL is treated as absent: its emails are already purged, so the
  // address is free to be reclaimed with a fresh lifetime.
  const live = existing && existing.expires_at > now ? existing : null;

  if (live) {
    if (body.exclusive === true) {
      return c.json(fail("That address is already taken."), 409);
    }
    // Open the existing inbox, keeping its original lifetime.
    return c.json(
      ok({
        id: address,
        address,
        domain,
        createdAt: live.created_at,
        expiresAt: live.expires_at,
        created: false,
      }),
    );
  }

  // INSERT OR REPLACE covers both "brand new" and "expired row being reclaimed",
  // and makes a race with a concurrent identical request harmless.
  await c.env.DB.prepare(
    "INSERT OR REPLACE INTO addresses (address, created_at, expires_at) VALUES (?, ?, ?)",
  )
    .bind(address, now, expiresAt)
    .run();

  return c.json(ok({ id: address, address, domain, createdAt: now, expiresAt, created: true }));
});

/**
 * GET /api/inbox/{address}
 * List of email headers. 404 if the address was never claimed (client treats it as empty).
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
 * One full message. Reading an email marks it is_read=1.
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
 * Delete one email from the inbox. Idempotent: replies {deleted:true} even when the
 * row is already gone (so a UI that clicks delete twice does not error).
 */
app.delete("/api/email/:id", async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare("DELETE FROM emails WHERE id = ?").bind(id).run();
  return c.json(ok({ deleted: true }));
});

/**
 * GET /ws/{address}  - upgrade WebSocket, forwarded to that address's DO.
 * Fallback: if it is not an upgrade, reply 426 so the client knows to poll.
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
   * email() - only an Email Worker can receive mail. The domain catch-all is
   * pointed here. Parse -> store to D1 (if the address was claimed) ->
   * notify the DO to push realtime.
   */
  async email(message: ForwardableEmailMessage, env: Env, _ctx: ExecutionContext): Promise<void> {
    await ensureSchema(env);
    const address = normAddress(message.to);

    // Only store for claimed, unexpired addresses. Everything else is dropped
    // silently (no bounce) so spam to random addresses does not pile up.
    const addr = await env.DB.prepare("SELECT address, expires_at FROM addresses WHERE address = ?")
      .bind(address)
      .first<AddressRow>();
    const now = nowSec();
    if (!addr || addr.expires_at <= now) return;

    // Parse MIME. postal-mime runs on workerd (no native dependencies).
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

    // Push realtime to tabs currently viewing this inbox (best-effort).
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
      /* the DO is optional; REST polling still finds this email */
    }
  },

  /** scheduled() - cron purge: delete expired emails & addresses. */
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    const now = nowSec();
    ctx.waitUntil(
      (async () => {
        await ensureSchema(env);
        await env.DB.prepare("DELETE FROM emails WHERE expires_at <= ?").bind(now).run();
        await env.DB.prepare("DELETE FROM addresses WHERE expires_at <= ?").bind(now).run();
      })(),
    );
  },
};

export default worker;
