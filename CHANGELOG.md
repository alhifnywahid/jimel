# Changelog

Semua perubahan penting pada project ini dicatat di sini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.1.0/), dan project ini memakai [Semantic Versioning](https://semver.org/lang/id/).

## [Belum dirilis]

## [1.0.0] - 2026-08-14

Rilis pertama.

### Ditambahkan

- **Worker tunggal** yang melayani UI, REST API, WebSocket, dan penerima email sekaligus (Hono + Cloudflare Static Assets dengan `run_worker_first`).
- **Penerimaan email** lewat handler `email()` - Email Routing catch-all diteruskan ke Worker, MIME diparse dengan postal-mime, lalu disimpan ke D1. Email ke alamat yang belum diklaim dibuang tanpa bounce.
- **Realtime push** lewat Durable Object dengan WebSocket Hibernation, satu objek per alamat email (`/ws/{address}`).
- **Fallback polling** REST tiap 8 detik saat WebSocket gagal, otomatis berhenti begitu WebSocket siap.
- **REST API** mengikuti kontrak sudevmail agar klien lama cukup mengganti base URL:
  `GET /api/domains`, `POST /api/address/generate`, `GET /api/inbox/{address}`,
  `GET /api/email/{id}`, `DELETE /api/email/{id}`.
- **Multi-domain** lewat `MAIL_DOMAINS` (comma-separated) di `wrangler.toml`; domain pertama menjadi default dan UI menampilkan dropdown pemilih.
- **Alamat kustom atau acak** - prefix bisa diketik sendiri, re-roll otomatis pada `409` bila prefix sebelumnya hasil pengacakan.
- **TTL & pembersihan otomatis** - email dan alamat kadaluarsa mengikuti `MESSAGE_TTL_MINUTES`, dihapus cron `scheduled()` tiap 10 menit.
- **Frontend** Vite + React 19 + TypeScript strict + Tailwind v4 + shadcn/ui: daftar inbox, tampilan isi email, panel alamat dengan tombol salin, tema dark/light, preset warna, dan pengaturan layout sidebar.
- **Halaman dokumentasi API bawaan** di route `/docs`, lengkap dengan contoh `curl`, contoh respons, dan prompt siap-tempel untuk AI.
- **Menu Komunitas** di sidebar untuk tautan Telegram dan WhatsApp.
- **`npm run setup`** - satu perintah idempotent yang login ke Cloudflare, membuat/memakai D1, menulis `database_id` dan `MAIL_DOMAINS`, menyiapkan skema, membangun frontend, men-deploy Worker, lalu mencetak langkah manual catch-all.
- **Monorepo npm workspaces** dengan `packages/shared` sebagai satu-satunya kontrak API yang menyeberangi batas jaringan.
- Biome sebagai formatter dan linter tunggal.

### Catatan

- API sengaja tanpa autentikasi. Konsekuensi dan cara mengamankannya dijelaskan di [README](README.md#keamanan-dan-batasan) dan [SECURITY.md](SECURITY.md).
- Catch-all Email Routing diatur manual di dashboard Cloudflare - tidak diotomatiskan, agar tidak perlu meminta API token dengan akses luas ke akunmu.

[Belum dirilis]: https://github.com/alhifnywahid/jimel/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/alhifnywahid/jimel/releases/tag/v1.0.0
