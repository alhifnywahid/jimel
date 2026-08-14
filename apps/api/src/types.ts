/**
 * types.ts - tipe khusus infrastruktur Worker (apps/api).
 *
 * DTO kontrak API (Envelope, EmailHeader, dll) TIDAK di sini - itu tinggal di
 * @jimel/shared supaya dipakai bareng frontend tanpa bisa drift. File ini hanya
 * menyimpan tipe yang terikat runtime Cloudflare (D1, DO, binding) - detail yang
 * tidak boleh bocor ke luar Worker.
 */

/** Binding lingkungan Worker (wrangler.toml). */
export interface Env {
  DB: D1Database;
  INBOX: DurableObjectNamespace;
  ASSETS: Fetcher;
  /** Daftar domain aktif, comma-separated. Domain pertama = default. */
  MAIL_DOMAINS: string;
  MESSAGE_TTL_MINUTES: string;
}

/** Row alamat di D1. */
export interface AddressRow {
  address: string;
  created_at: number;
  expires_at: number;
}

/** Row email penuh di D1. */
export interface EmailRow {
  id: string;
  address: string;
  sender: string;
  sender_name: string;
  subject: string;
  body_text: string;
  body_html: string;
  received_at: number;
  expires_at: number;
  is_read: number;
}
