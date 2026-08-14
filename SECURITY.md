# Kebijakan Keamanan

## Versi yang didukung

JIMEL adalah aplikasi yang di-deploy sendiri (self-hosted). Yang didukung hanya commit terbaru di branch `main` - tidak ada backport ke commit lama.

## Melaporkan celah keamanan

**Jangan buka issue publik untuk celah keamanan.**

Gunakan salah satu jalur privat berikut:

1. **GitHub Security Advisory** (disarankan) - tab **Security** di repo ini → **Report a vulnerability**.
2. **Kontak langsung** - hubungi [@alhifnywahid](https://github.com/alhifnywahid) lewat GitHub.

Sertakan kalau bisa:

- versi/commit yang kamu uji,
- langkah reproduksi sedetail mungkin,
- dampaknya (data siapa yang bocor, apa yang bisa dilakukan penyerang),
- proof of concept, kalau ada.

Saya akan mengonfirmasi laporanmu dalam **7 hari** dan mengabari perkembangannya sampai selesai. Ini project yang dikerjakan satu orang di waktu luang, jadi mohon maklum kalau perbaikannya tidak instan. Tidak ada program bug bounty.

## Yang BUKAN celah keamanan

Beberapa hal yang mungkin terlihat seperti bug sebenarnya adalah desain yang disengaja dan sudah didokumentasikan di README:

- **API tanpa autentikasi.** Semua endpoint `/api/*` publik. Ini disengaja supaya script lama cukup mengganti base URL.
- **Inbox bisa dibaca siapa pun yang tahu alamatnya.** Alamat email adalah satu-satunya "kredensial". Perlakukan sebagai rahasia jangka pendek.
- **Siapa pun bisa mengklaim alamat di domainmu.** Kalau instansmu publik dan ini jadi masalah, pasang rate limiting Cloudflare WAF di `/api/address/generate`, atau taruh Cloudflare Access di depan Worker.
- **Email disimpan plaintext di D1.** Sampai TTL habis dan cron membersihkannya.

Laporan yang menarik justru yang di luar daftar itu, misalnya: SQL injection, mengakses inbox tanpa tahu alamatnya, XSS lewat isi email yang dirender, cara membaca data milik instans lain, atau eskalasi ke akun Cloudflare pemilik instans.

## Untuk kamu yang men-deploy JIMEL

Tanggung jawab keamanan instansmu ada di tanganmu:

- Jangan pakai JIMEL untuk menerima email penting (reset password akun asli, dokumen, data pribadi).
- Jangan pakai domain yang sama dengan email produksimu.
- Atur `MESSAGE_TTL_MINUTES` seperlunya - makin pendek makin sedikit data yang tersimpan.
- Kalau perlu instans privat, pasang Cloudflare Access.
- Jangan pernah commit `wrangler.toml` yang sudah terisi `database_id` ke repo publik kalau kamu menganggap ID itu sensitif, dan pakai `wrangler secret put` untuk secret apa pun.
