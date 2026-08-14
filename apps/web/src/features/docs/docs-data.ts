/**
 * docs-data.ts - sumber konten dokumentasi API Worker JIMEL.
 *
 * Dipisah dari komponen supaya isi dokumentasi (endpoint, contoh) gampang
 * dirawat di satu tempat, dan komponen cukup me-render-nya (Clean Code: data
 * terpisah dari presentasi).
 */

export type HttpMethod = "GET" | "POST" | "DELETE" | "WS";

export interface ParamDoc {
  name: string;
  required: boolean;
  desc: string;
}

export interface EndpointDoc {
  id: string;
  method: HttpMethod;
  path: string;
  title: string;
  summary: string;
  params?: ParamDoc[];
  /** Contoh perintah curl (atau catatan WS). */
  request: string;
  /** Contoh respons JSON sukses. */
  response: string;
  notes?: string[];
}

/** Kontrak envelope dipakai SEMUA endpoint REST. */
export const ENVELOPE_NOTE = `Semua respons REST dibungkus "envelope" seragam:

  Sukses : { "success": true,  "data": <hasil> }
  Gagal  : { "success": false, "error": "<pesan>" }

Cek "success" dulu sebelum membaca "data". Semua stempel waktu = epoch DETIK
(bukan milidetik), dan field pada objek email pakai snake_case.`;

export const ENDPOINTS: EndpointDoc[] = [
  {
    id: "domains",
    method: "GET",
    path: "/api/domains",
    title: "Ambil daftar domain",
    summary:
      "Daftar domain aktif yang catch-all-nya sudah diarahkan ke Worker ini. Domain pertama = default. Pakai ini untuk mengisi pilihan domain sebelum membuat alamat.",
    request: `curl -s https://YOUR_WORKER_URL/api/domains`,
    response: `{
  "success": true,
  "data": ["jimel.email", "mail2.io"]
}`,
  },
  {
    id: "generate",
    method: "POST",
    path: "/api/address/generate",
    title: "Buat alamat (pilih / acak)",
    summary:
      "Klaim satu alamat inbox. Kirim prefix pilihanmu, atau prefix acak buatanmu sendiri. domain opsional - kalau kosong dipakai domain default. Alamat berlaku sampai expiresAt.",
    params: [
      {
        name: "prefix",
        required: true,
        desc: "Bagian sebelum @. 1–64 karakter alfanumerik (a-z, 0-9).",
      },
      {
        name: "domain",
        required: false,
        desc: "Salah satu dari /api/domains. Kosong = domain default (yang pertama).",
      },
    ],
    request: `curl -s -X POST https://YOUR_WORKER_URL/api/address/generate \\
  -H "Content-Type: application/json" \\
  -d '{ "prefix": "belanja01", "domain": "jimel.email" }'`,
    response: `{
  "success": true,
  "data": {
    "id": "belanja01@jimel.email",
    "address": "belanja01@jimel.email",
    "domain": "jimel.email",
    "createdAt": 1786649171,
    "expiresAt": 1786652771
  }
}`,
    notes: [
      "409 jika prefix sudah dipakai orang lain - buat prefix acak baru lalu coba lagi.",
      "400 jika prefix tidak valid atau domain tidak dikenal.",
      "Untuk alamat ACAK: buat sendiri string acak (mis. 12 huruf/angka) sebagai prefix, tak ada endpoint khusus.",
    ],
  },
  {
    id: "inbox",
    method: "GET",
    path: "/api/inbox/{address}",
    title: "Ambil daftar email (inbox)",
    summary:
      "Header semua email pada satu alamat, urut terbaru dulu. Body TIDAK disertakan di sini (ringan) - ambil per email lewat endpoint detail.",
    params: [
      {
        name: "address",
        required: true,
        desc: "Alamat lengkap, mis. belanja01@jimel.email (di path URL).",
      },
    ],
    request: `curl -s https://YOUR_WORKER_URL/api/inbox/belanja01@jimel.email`,
    response: `{
  "success": true,
  "data": {
    "address": "belanja01@jimel.email",
    "expiresAt": 1786652771,
    "emails": [
      {
        "id": "0f54064f-bdb3-4c51-ba48-8667e6840329",
        "sender": "noreply@github.com",
        "sender_name": "GitHub",
        "subject": "[GitHub] Your launch code",
        "received_at": 1786649211,
        "is_read": false
      }
    ]
  }
}`,
    notes: [
      "404 jika alamat belum pernah dibuat - perlakukan sebagai inbox kosong.",
    ],
  },
  {
    id: "email",
    method: "GET",
    path: "/api/email/{id}",
    title: "Ambil detail email",
    summary:
      "Isi penuh satu email termasuk body_text dan body_html. Memanggil ini otomatis menandai email sebagai sudah dibaca (is_read = true).",
    params: [
      {
        name: "id",
        required: true,
        desc: "id email dari daftar inbox (di path URL).",
      },
    ],
    request: `curl -s https://YOUR_WORKER_URL/api/email/0f54064f-bdb3-4c51-ba48-8667e6840329`,
    response: `{
  "success": true,
  "data": {
    "id": "0f54064f-bdb3-4c51-ba48-8667e6840329",
    "address": "belanja01@jimel.email",
    "sender": "noreply@github.com",
    "sender_name": "GitHub",
    "subject": "[GitHub] Your launch code",
    "body_text": "Your code is 72150777",
    "body_html": "",
    "received_at": 1786649211,
    "is_read": true
  }
}`,
    notes: ["404 jika email tidak ada / sudah kadaluarsa dan terhapus."],
  },
  {
    id: "delete",
    method: "DELETE",
    path: "/api/email/{id}",
    title: "Hapus email",
    summary:
      "Hapus satu email dari inbox. Idempotent: tetap balas deleted:true walau email sudah tidak ada.",
    params: [
      {
        name: "id",
        required: true,
        desc: "id email yang mau dihapus (di path URL).",
      },
    ],
    request: `curl -s -X DELETE https://YOUR_WORKER_URL/api/email/0f54064f-bdb3-4c51-ba48-8667e6840329`,
    response: `{
  "success": true,
  "data": { "deleted": true }
}`,
  },
  {
    id: "ws",
    method: "WS",
    path: "/ws/{address}",
    title: "Notifikasi realtime (WebSocket)",
    summary:
      "Buka WebSocket untuk menerima email baru secara realtime tanpa polling. Server mengirim {type:'ready'} saat siap, lalu {type:'email', email:{...header}} tiap ada email masuk. Kirim 'ping' untuk keep-alive (dibalas {type:'pong'}).",
    params: [
      {
        name: "address",
        required: true,
        desc: "Alamat yang mau dipantau (di path URL).",
      },
    ],
    request: `// Browser / Node (ws)
const ws = new WebSocket("wss://YOUR_WORKER_URL/ws/belanja01@jimel.email");
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.type === "email") console.log("Email baru:", msg.email.subject);
};`,
    response: `{ "type": "ready" }
{ "type": "email", "email": { "id": "...", "sender": "...", "subject": "...", "received_at": 1786649211, "is_read": false } }`,
    notes: [
      "Kalau WS gagal/tertutup, cukup polling GET /api/inbox tiap beberapa detik sebagai fallback.",
    ],
  },
];

/** Prompt siap-tempel supaya AI lain bisa langsung mengintegrasikan API ini. */
export const AI_PROMPT = `Kamu terhubung ke API tempmail (email sekali pakai). Base URL: https://YOUR_WORKER_URL
Semua respons berbentuk envelope: {"success":true,"data":...} atau {"success":false,"error":"..."}.
Waktu = epoch detik. Tanpa autentikasi.

Endpoint:
- GET  /api/domains                 -> string[] domain aktif (pertama = default)
- POST /api/address/generate        -> body {prefix, domain?}; balas {address, expiresAt, ...}; 409 jika prefix dipakai
- GET  /api/inbox/{address}         -> {address, expiresAt, emails:[{id,sender,sender_name,subject,received_at,is_read}]}
- GET  /api/email/{id}              -> email penuh incl. body_text/body_html (menandai sudah dibaca)
- DELETE /api/email/{id}            -> {deleted:true}

Alur khas: ambil /api/domains -> buat alamat via /api/address/generate (prefix acak jika perlu) ->
poll /api/inbox/{address} sampai email tujuan muncul -> ambil /api/email/{id} untuk baca kode/isi.`;
