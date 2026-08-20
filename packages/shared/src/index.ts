/**
 * @jimel/shared - the tempmail API contract (single source of truth).
 *
 * These are the DTOs that cross the network boundary between the Worker (apps/api)
 * and the frontend (apps/web). Both depend on this package rather than defining the
 * shapes themselves - so they cannot drift. No framework types (D1, Durable Object,
 * etc.) live here; those are infrastructure details owned by apps/api.
 *
 * Wire conventions (mirroring sudevmail): time = epoch SECONDS, row fields = snake_case.
 */

/** Uniform response envelope for every REST endpoint. */
export type Envelope<T> = { success: true; data: T } | { success: false; error: string };

/** Email header for the inbox list (no body). */
export interface EmailHeader {
  id: string;
  sender: string;
  sender_name: string;
  subject: string;
  received_at: number;
  is_read: boolean;
}

/** Full message - response of GET /api/email/{id}. */
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

/**
 * Response of POST /api/address/generate.
 *
 * The call is idempotent ("claim or open"): asking for an address that is already
 * claimed opens it instead of failing, so the same inbox can be used from several
 * browsers or devices. `created` says which of the two happened - false means the
 * address already existed, which is how a client that wants an EXCLUSIVE address
 * (e.g. an automation using a random prefix) detects a collision and re-rolls.
 */
export interface AddressResponse {
  id: string;
  address: string;
  domain: string;
  createdAt: number;
  expiresAt: number;
  created: boolean;
}

/** Response of GET /api/domains - domains whose catch-all is pointed at the Worker. */
export type DomainsResponse = string[];

/** Response of GET /api/inbox/{address}. */
export interface InboxResponse {
  address: string;
  expiresAt: number;
  emails: EmailHeader[];
}

/** Message the Durable Object sends to clients over WebSocket /ws/{address}. */
export type WsMessage =
  | { type: "ready" }
  | { type: "email"; email: EmailHeader }
  | { type: "pong" };
