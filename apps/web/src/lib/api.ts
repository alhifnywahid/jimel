/**
 * api.ts - the single door to the Worker REST API. Every tempmail fetch goes
 * through here so components never know the envelope shape / URL. Returns the data
 * already "unwrapped" from the Envelope; throws ApiError on success:false / non-2xx.
 *
 * Base URL is relative ("/api/...") - in dev it is proxied by Vite to the Worker
 * (:8787), in production the same Worker serves the FE + API.
 */

import type {
  AddressResponse,
  DomainsResponse,
  EmailFull,
  Envelope,
  InboxResponse,
} from "@jimel/shared";

/** Structured error: carries the HTTP status so callers can tell 404/409 apart. */
export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Unwrap the Envelope: return data on success, throw ApiError otherwise. */
async function unwrap<T>(res: Response): Promise<T> {
  let envelope: Envelope<T> | null = null;
  try {
    envelope = (await res.json()) as Envelope<T>;
  } catch {
    throw new ApiError(`Invalid response from the server (${res.status}).`, res.status);
  }
  if (!envelope.success) {
    throw new ApiError(envelope.error, res.status);
  }
  return envelope.data;
}

/** GET /api/domains - active domains (the first = default). */
export async function fetchDomains(): Promise<DomainsResponse> {
  return unwrap<DomainsResponse>(await fetch("/api/domains"));
}

/**
 * POST /api/address/generate - claim an address. Send prefix + domain (optional).
 * ApiError.status === 409 means the prefix is taken (the caller may re-roll).
 */
export async function generateAddress(prefix: string, domain?: string): Promise<AddressResponse> {
  const res = await fetch("/api/address/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefix, ...(domain ? { domain } : {}) }),
  });
  return unwrap<AddressResponse>(res);
}

/**
 * GET /api/inbox/{address} - email headers. 404 = inbox not claimed yet; we
 * treat it as empty (return emails: []), matching the old sudevmail client behavior.
 */
export async function fetchInbox(address: string): Promise<InboxResponse> {
  const res = await fetch(`/api/inbox/${encodeURIComponent(address)}`);
  if (res.status === 404) {
    return { address, expiresAt: 0, emails: [] };
  }
  return unwrap<InboxResponse>(res);
}

/** GET /api/email/{id} - full message (reading it marks is_read on the server). */
export async function fetchEmail(id: string): Promise<EmailFull> {
  return unwrap<EmailFull>(await fetch(`/api/email/${encodeURIComponent(id)}`));
}

/** DELETE /api/email/{id} - delete an email (idempotent on the server). */
export async function deleteEmail(id: string): Promise<void> {
  await unwrap<{ deleted: boolean }>(
    await fetch(`/api/email/${encodeURIComponent(id)}`, { method: "DELETE" }),
  );
}

/** Random 12-char prefix (lowercase + digits) - used when the user leaves it blank. */
export function randomPrefix(len = 12): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < len; i++) out += chars[bytes[i]! % chars.length];
  return out;
}
