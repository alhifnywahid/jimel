/**
 * types.ts - email view-model for the JIMEL UI + mapping from the wire DTO.
 *
 * Components (mail-view, mail-sidebar) use this render-friendly shape, NOT the raw
 * server DTO. The snake_case->camelCase, epoch-seconds->ISO, and
 * "sender/sender_name"->"from" mapping happens here - one place, not scattered
 * across components (Law of Demeter: components need not know the server data shape).
 */

import type { EmailFull, EmailHeader } from "@jimel/shared";

export type Recipient = {
  name: string;
  email: string;
};

/**
 * Email for display. `body` undefined = header only (body not fetched yet);
 * filled after GET /api/email/{id}. Metadata fields (replyTo etc.) are optional
 * because the tempmail backend does not always provide them.
 */
export type Mail = {
  id: string;
  from: Recipient;
  to: Recipient[];
  subject: string;
  body?: string;
  receivedAt: string;
  isRead: boolean;
  replyTo?: string;
  mailedBy?: string;
  signedBy?: string;
};

/** Sender display name: use sender_name, fallback to the part before "@". */
function senderName(header: Pick<EmailHeader, "sender" | "sender_name">): string {
  return header.sender_name.trim() || header.sender.split("@")[0] || header.sender;
}

/** Recipient from a full email address (localpart becomes the display name). */
function recipientOf(address: string): Recipient {
  return { name: address.split("@")[0] || address, email: address };
}

/** epoch SECONDS -> ISO string (the view uses date-fns over Date). */
const secToIso = (sec: number): string => new Date(sec * 1000).toISOString();

/**
 * Header -> Mail (no body). `address` = the active inbox, used to fill "to".
 */
export function headerToMail(header: EmailHeader, address: string): Mail {
  return {
    id: header.id,
    from: { name: senderName(header), email: header.sender },
    to: [recipientOf(address)],
    subject: header.subject,
    receivedAt: secToIso(header.received_at),
    isRead: header.is_read,
  };
}

/** Merge the full contents into an existing Mail (adds body + metadata). */
export function withBody(mail: Mail, full: EmailFull): Mail {
  const body = full.body_text.trim() || stripHtml(full.body_html);
  return {
    ...mail,
    from: { name: senderName(full), email: full.sender },
    to: [recipientOf(full.address)],
    subject: full.subject,
    body,
    isRead: true,
  };
}

/** Fallback for HTML-only emails: strip tags to plain text (light, good enough). */
function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
