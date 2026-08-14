/**
 * types.ts - view-model email untuk UI JIMEL + pemetaan dari DTO wire.
 *
 * Komponen (mail-view, mail-sidebar) memakai bentuk yang enak untuk render ini,
 * BUKAN DTO mentah dari server. Pemetaan snake_case→camelCase, epoch detik→ISO,
 * dan "sender/sender_name"→"from" dilakukan di sini - satu tempat, bukan tersebar
 * di komponen (Law of Demeter: komponen tak perlu tahu bentuk data server).
 */

import type { EmailFull, EmailHeader } from "@jimel/shared";

export type Recipient = {
  name: string;
  email: string;
};

/**
 * Email untuk tampilan. `body` undefined = header saja (isi belum diambil);
 * diisi setelah GET /api/email/{id}. Field metadata (replyTo dst) opsional
 * karena backend tempmail tidak selalu menyediakannya.
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

/** Nama tampil pengirim: pakai sender_name, fallback bagian sebelum "@". */
function senderName(header: Pick<EmailHeader, "sender" | "sender_name">): string {
  return header.sender_name.trim() || header.sender.split("@")[0] || header.sender;
}

/** Recipient dari sebuah alamat email penuh (localpart jadi nama tampil). */
function recipientOf(address: string): Recipient {
  return { name: address.split("@")[0] || address, email: address };
}

/** epoch DETIK → ISO string (view pakai date-fns atas Date). */
const secToIso = (sec: number): string => new Date(sec * 1000).toISOString();

/**
 * Header → Mail (tanpa body). `address` = inbox aktif, dipakai mengisi "kepada".
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

/** Gabungkan isi penuh ke Mail yang sudah ada (menambah body + metadata). */
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

/** Fallback untuk email HTML-only: buang tag jadi teks polos (ringan, cukup). */
function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
