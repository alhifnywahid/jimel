/**
 * lib.ts - small shared utilities.
 */

export const nowSec = () => Math.floor(Date.now() / 1000);

/** Email TTL (minutes) from env, fallback 60. */
export function ttlMinutes(env: { MESSAGE_TTL_MINUTES?: string }): number {
  const n = Number.parseInt(env.MESSAGE_TTL_MINUTES || "", 10);
  return Number.isFinite(n) && n > 0 ? n : 60;
}

/**
 * List of domains whose catch-all is already pointed at this Worker.
 * MAIL_DOMAINS = "a.com,b.io,c.dev" (comma-separated). First domain = default.
 * Normalized lowercase+trim; duplicates & empties dropped.
 */
export function mailDomains(env: { MAIL_DOMAINS?: string }): string[] {
  const seen = new Set<string>();
  for (const raw of (env.MAIL_DOMAINS || "").split(",")) {
    const d = raw.trim().toLowerCase();
    if (d) seen.add(d);
  }
  return [...seen];
}

/** Normalize an address: lowercase + trim. */
export function normAddress(a: string): string {
  return (a || "").trim().toLowerCase();
}

/** Take the localpart from "x@domain". */
export function localPart(address: string): string {
  return normAddress(address).split("@")[0] || "";
}

/** Validate localpart: letters/digits, 1-64 chars (sudevmail style: alphanumeric). */
export function isValidPrefix(prefix: string): boolean {
  return /^[a-z0-9]{1,64}$/.test(prefix);
}

/** Random prefix (default 12 chars) - used when the client sends no prefix. */
export function randomPrefix(len = 12): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < len; i++) out += chars[bytes[i]! % chars.length];
  return out;
}

/** UUID for the email id. */
export const uuid = () => crypto.randomUUID();

/**
 * For HTML-only emails, the old sudevmail returned body_text = "undefined".
 * We clean it so it is genuinely empty.
 */
export function cleanText(s: string | undefined | null): string {
  const t = (s ?? "").trim();
  return t === "undefined" ? "" : t;
}
