/**
 * api.ts - satu-satunya pintu ke REST Worker. Semua fetch tempmail lewat sini
 * supaya komponen tidak tahu bentuk envelope / URL. Mengembalikan data yang
 * sudah "dibuka" dari Envelope; melempar ApiError kalau success:false / non-2xx.
 *
 * Base URL relatif ("/api/...") - saat dev diteruskan proxy Vite ke Worker
 * (:8787), saat produksi Worker yang sama menyajikan FE + API.
 */

import type {
  AddressResponse,
  DomainsResponse,
  EmailFull,
  Envelope,
  InboxResponse,
} from "@jimel/shared";

/** Error terstruktur: bawa status HTTP supaya pemanggil bisa bedakan 404/409. */
export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Buka Envelope: kembalikan data kalau sukses, lempar ApiError kalau tidak. */
async function unwrap<T>(res: Response): Promise<T> {
  let envelope: Envelope<T> | null = null;
  try {
    envelope = (await res.json()) as Envelope<T>;
  } catch {
    throw new ApiError(`Respons tidak valid dari server (${res.status}).`, res.status);
  }
  if (!envelope.success) {
    throw new ApiError(envelope.error, res.status);
  }
  return envelope.data;
}

/** GET /api/domains - daftar domain aktif (yang pertama = default). */
export async function fetchDomains(): Promise<DomainsResponse> {
  return unwrap<DomainsResponse>(await fetch("/api/domains"));
}

/**
 * POST /api/address/generate - klaim alamat. Kirim prefix + domain (opsional).
 * ApiError.status === 409 berarti prefix sudah dipakai (pemanggil boleh re-roll).
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
 * GET /api/inbox/{address} - header email. 404 = inbox belum diklaim; kita
 * anggap kosong (kembalikan emails: []), sesuai perilaku client sudevmail lama.
 */
export async function fetchInbox(address: string): Promise<InboxResponse> {
  const res = await fetch(`/api/inbox/${encodeURIComponent(address)}`);
  if (res.status === 404) {
    return { address, expiresAt: 0, emails: [] };
  }
  return unwrap<InboxResponse>(res);
}

/** GET /api/email/{id} - pesan penuh (membacanya menandai is_read di server). */
export async function fetchEmail(id: string): Promise<EmailFull> {
  return unwrap<EmailFull>(await fetch(`/api/email/${encodeURIComponent(id)}`));
}

/** DELETE /api/email/{id} - hapus email (idempotent di server). */
export async function deleteEmail(id: string): Promise<void> {
  await unwrap<{ deleted: boolean }>(
    await fetch(`/api/email/${encodeURIComponent(id)}`, { method: "DELETE" }),
  );
}

/** Prefix acak 12 char (huruf kecil + angka) - dipakai kalau user tak mengisi. */
export function randomPrefix(len = 12): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < len; i++) out += chars[bytes[i]! % chars.length];
  return out;
}
