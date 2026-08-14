# Bantuan

Butuh bantuan memakai atau men-deploy JIMEL? Ini tempatnya. Untuk melaporkan bug atau mengusulkan fitur, pakai [Issues](https://github.com/alhifnywahid/jimel/issues).

## Coba dulu ini

Sebagian besar pertanyaan yang masuk terjawab di tiga tempat berikut:

1. **[README](README.md)** - cara pasang, konfigurasi, arsitektur, batasan.
2. **Halaman `/docs` di instansmu** - referensi API lengkap dengan contoh `curl` dan contoh respons.
3. **Daftar masalah umum di bawah.**

## Masalah umum

**Email tidak masuk sama sekali.**
Hampir selalu catch-all Email Routing yang belum diarahkan. Cloudflare Dashboard → domainmu → **Email** → **Email Routing** → **Routing rules** → **Catch-all address** → Edit → Action **Send to a Worker** → pilih `tempmail` → Enabled → Save. Kalau baru pertama kali, aktifkan dulu Email Routing agar MX record dibuat otomatis. Langkah ini perlu diulang untuk **setiap** domain.

**Email masuk tapi tidak muncul di UI, baru terlihat setelah refresh.**
WebSocket kemungkinan diblokir jaringanmu. Frontend semestinya turun ke polling tiap 8 detik. Buka DevTools → Network → tab WS untuk melihat apakah koneksinya ditutup.

**Alamat yang saya buat hilang.**
Alamat punya TTL (`MESSAGE_TTL_MINUTES`, default 60 menit) dan dibersihkan cron. Ini memang perilakunya. Ubah nilainya di `apps/api/wrangler.toml` lalu deploy ulang.

**Inbox mengembalikan 404.**
Alamat itu belum pernah diklaim, atau sudah kadaluarsa. Klaim dulu lewat `POST /api/address/generate`.

**`npm run setup` berhenti bilang domain belum diatur.**
Sebutkan domainnya di perintah: `npm run setup -- domainkamu.com`. Domain itu harus sudah ada di akun Cloudflare-mu.

**Worker deploy sukses tapi UI blank.**
Frontend belum di-build. Jalankan `npm run build` lalu `npm run deploy`, atau cukup `npm run setup` yang sudah mencakup keduanya.

**Bisa pakai domain gratis / subdomain workers.dev untuk menerima email?**
Tidak. Email Routing butuh domain yang nameserver-nya di Cloudflare. Subdomain `*.workers.dev` tidak bisa menerima email.

## Masih belum beres?

- **[Buka issue](https://github.com/alhifnywahid/jimel/issues/new/choose)** - untuk bug atau usulan fitur. Sertakan versi/commit, langkah reproduksi, dan pesan error apa adanya.
- **[Discussions](https://github.com/alhifnywahid/jimel/discussions)** - untuk pertanyaan pemakaian, ide, atau memamerkan hasil deploy-mu.
- **Kanal komunitas** - tautan Telegram dan WhatsApp ada di sidebar aplikasi, menu **Komunitas**.

## Sebelum bertanya

Sertakan hal-hal ini agar tidak perlu bolak-balik:

- perintah yang kamu jalankan dan pesan error lengkapnya,
- Node.js dan versi wrangler (`node -v`, `npx wrangler --version`),
- apakah masalahnya di lokal (`npm run dev`) atau setelah deploy,
- isi `[vars]` di `wrangler.toml` - **tanpa** `database_id` atau data akunmu.

Jangan pernah menempel isi email sungguhan, token API, atau kredensial ke dalam issue.

## Laporan keamanan

Bukan lewat issue publik - baca [SECURITY.md](SECURITY.md).

## Ekspektasi waktu balasan

Project ini digarap satu orang di waktu luang. Biasanya dibalas dalam beberapa hari, tapi tidak ada jaminan SLA. Tidak ada dukungan komersial.
