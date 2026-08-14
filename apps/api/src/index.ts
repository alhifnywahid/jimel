/**
 * index.ts - one Worker: email() + fetch() (REST + UI) + scheduled() (purge).
 *
 * The REST contract MIRRORS sudevmail EXACTLY (see the sudevmail-api-contract memory)
 * so the 5 legacy projects only need to swap their base URL:
 *   POST /api/address/generate  {prefix}  -> {id, address, createdAt, expiresAt}  (409 if taken)
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
 * POST /api/address/generate  { prefix }
 * Claim one address. 409 if the prefix is already taken (client re-rolls only on 409).
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

  // An INSERT that fails because the PK already exists = 409. Check existing first
  // for a clear error message, then insert (a race is still handled by the PK constraint).
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
    // Likely a race: another request created the row first -> still 409.
    return c.json(fail("That address is already taken."), 409);
  }

  return c.json(ok({ id: address, address, domain, createdAt: now, expiresAt }));
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
        await env.DB.prepare("DELETE FROM emails WHERE expires_at <= ?").bind(now).run();
        await env.DB.prepare("DELETE FROM addresses WHERE expires_at <= ?").bind(now).run();
      })(),
    );
  },
};

export default worker;
