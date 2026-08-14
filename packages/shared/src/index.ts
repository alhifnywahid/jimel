/**
 * @jimel/shared - Kontrak API tempmail (satu sumber kebenaran).
 *
 * Ini DTO yang menyeberang boundary jaringan antara Worker (apps/api) dan
 * frontend (apps/web). Keduanya bergantung pada paket ini, bukan mendefinisikan
 * bentuknya sendiri-sendiri - jadi tidak bisa drift. Tidak ada tipe framework
 * (D1, Durable Object, dsb) di sini; itu detail infrastruktur milik apps/api.
 *
 * Konvensi wire (tiru sudevmail): waktu = epoch DETIK, field row = snake_case.
 */

/** Envelope respons seragam untuk semua endpoint REST. */
export type Envelope<T> = { success: true; data: T } | { success: false; error: string };

/** Header email untuk daftar inbox (tanpa body). */
export interface EmailHeader {
  id: string;
  sender: string;
  sender_name: string;
  subject: string;
  received_at: number;
  is_read: boolean;
}

/** Pesan penuh - respons GET /api/email/{id}. */
export interface EmailFull {
  id: string;
  address: string;
  sender: string;
  sender_name: string;
  subject: string;
  body_text: string;
  body_html: string;
  received_at: number;
  is_read: boolean;
}

/** Respons POST /api/address/generate. */
export interface AddressResponse {
  id: string;
  address: string;
  domain: string;
  createdAt: number;
  expiresAt: number;
}

/** Respons GET /api/domains - daftar domain yang catch-all-nya diarahkan ke Worker. */
export type DomainsResponse = string[];

/** Respons GET /api/inbox/{address}. */
export interface InboxResponse {
  address: string;
  expiresAt: number;
  emails: EmailHeader[];
}

/** Pesan yang dikirim Durable Object ke klien via WebSocket /ws/{address}. */
export type WsMessage =
  | { type: "ready" }
  | { type: "email"; email: EmailHeader }
  | { type: "pong" };
