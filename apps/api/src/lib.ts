/**
 * lib.ts - util kecil dipakai bersama.
 */

export const nowSec = () => Math.floor(Date.now() / 1000);

/** TTL email (menit) dari env, fallback 60. */
export function ttlMinutes(env: { MESSAGE_TTL_MINUTES?: string }): number {
  const n = Number.parseInt(env.MESSAGE_TTL_MINUTES || "", 10);
  return Number.isFinite(n) && n > 0 ? n : 60;
}

/**
 * Daftar domain yang catch-all-nya sudah diarahkan ke Worker ini.
 * MAIL_DOMAINS = "a.com,b.io,c.dev" (comma-separated). Domain pertama = default.
 * Dinormalisasi lowercase+trim, duplikat & kosong dibuang.
 */
export function mailDomains(env: { MAIL_DOMAINS?: string }): string[] {
  const seen = new Set<string>();
  for (const raw of (env.MAIL_DOMAINS || "").split(",")) {
    const d = raw.trim().toLowerCase();
    if (d) seen.add(d);
  }
  return [...seen];
}

/** Normalisasi alamat: lowercase + trim. */
export function normAddress(a: string): string {
  return (a || "").trim().toLowerCase();
}

/** Ambil localpart dari "x@domain". */
export function localPart(address: string): string {
  return normAddress(address).split("@")[0] || "";
}

/** Validasi localpart: huruf/angka, 1–64 char (ikut gaya sudevmail: alfanumerik). */
export function isValidPrefix(prefix: string): boolean {
  return /^[a-z0-9]{1,64}$/.test(prefix);
}

/** Prefix acak (default 12 char) - dipakai kalau client tidak mengirim prefix. */
export function randomPrefix(len = 12): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < len; i++) out += chars[bytes[i]! % chars.length];
  return out;
}

/** UUID untuk id email. */
export const uuid = () => crypto.randomUUID();

/**
 * Untuk email HTML-only, sudevmail lama mengembalikan body_text = "undefined".
 * Kita bersihkan supaya benar-benar kosong.
 */
export function cleanText(s: string | undefined | null): string {
  const t = (s ?? "").trim();
  return t === "undefined" ? "" : t;
}
