/**
 * types.ts - Worker infrastructure-specific types (apps/api).
 *
 * The API contract DTOs (Envelope, EmailHeader, etc.) are NOT here - they live in
 * @jimel/shared so they can be shared with the frontend without drifting. This file
 * only holds types tied to the Cloudflare runtime (D1, DO, bindings) - details that
 * must not leak outside the Worker.
 */

/** Worker environment bindings (wrangler.toml). */
export interface Env {
  DB: D1Database;
  INBOX: DurableObjectNamespace;
  ASSETS: Fetcher;
  /** List of active domains, comma-separated. First domain = default. */
  MAIL_DOMAINS: string;
  MESSAGE_TTL_MINUTES: string;
}

/** Address row in D1. */
export interface AddressRow {
  address: string;
  created_at: number;
  expires_at: number;
}

/** Full email row in D1. */
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
