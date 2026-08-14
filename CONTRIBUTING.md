# Panduan Kontribusi

Terima kasih sudah mau ikut menggarap JIMEL. Dokumen ini singkat saja - cukup untuk membuat PR-mu mudah di-review.

## Sebelum menulis kode

- **Bug?** Buka issue dengan template Bug report. Sertakan langkah reproduksi.
- **Fitur baru?** Buka issue dulu (template Feature request) sebelum menulis banyak kode. Lebih baik berdiskusi 10 menit daripada PR 500 baris yang ternyata tidak sejalan dengan arah project.
- **Perbaikan kecil** (typo, dokumentasi, satu baris) boleh langsung PR tanpa issue.

## Menyiapkan lingkungan

Butuh Node.js 20+ dan akun Cloudflare (gratis) kalau mau menguji sampai deploy.

```bash
git clone https://github.com/alhifnywahid/jimel.git
cd jimel
npm install
npm run db:init:local     # buat tabel di D1 lokal
npm run dev               # Worker + API di http://127.0.0.1:8787
npm run dev:web           # terminal kedua, UI dengan HMR di http://localhost:5173
```

Ini monorepo npm workspaces - jalankan `npm install` **hanya di root**, bukan di dalam `apps/*`.

## Alur kerja

1. Fork, lalu buat branch dari `main`: `git switch -c fix/inbox-kosong`
2. Kerjakan perubahanmu.
3. Jalankan pemeriksaan sebelum commit:

   ```bash
   npm run lint:fix
   npm run typecheck
   npm run build
   ```

4. Commit dengan pesan yang menjelaskan **kenapa**, bukan hanya apa. Format [Conventional Commits](https://www.conventionalcommits.org) disukai tapi tidak dipaksakan:

   ```
   fix(web): jangan polling ulang setelah WebSocket siap
   ```

5. Buka PR. Isi templatenya. Kalau ada perubahan tampilan, lampirkan screenshot.

## Gaya kode

Formatter dan linter satu-satunya adalah [Biome](https://biomejs.dev) - konfigurasinya di `biome.json`. `npm run lint:fix` menyelesaikan hampir semuanya. Jangan tambahkan Prettier atau ESLint.

Selain itu:

- **TypeScript strict.** Hindari `any`; kalau benar-benar perlu, beri komentar alasannya.
- **Komentar menjelaskan alasan, bukan mekanisme.** `// dedupe: DO bisa mengirim header yang sama dua kali saat reconnect` berguna. `// increment i` tidak.
- **Bahasa komentar mengikuti sekitarnya** - komentar di project ini berbahasa Indonesia.
- **Nama yang mengungkap maksud.** `expiresAt` bukan `e`, `loadInbox` bukan `doStuff`.
- **Fungsi kecil, satu tanggung jawab.** Kalau butuh kata "dan" untuk menjelaskan sebuah fungsi, pecah.

## Batas arsitektur

Ini yang paling sering keliru di PR, jadi tolong dibaca:

- **`packages/shared`** hanya berisi kontrak yang menyeberangi jaringan - DTO dan tipe pesan WebSocket. Tanpa logika, tanpa impor dari `apps/*`.
- **Tipe infrastruktur tinggal di tempatnya.** Tipe row D1 dan `Env` ada di `apps/api/src/types.ts` dan tidak boleh bocor ke frontend.
- **Frontend punya view-model sendiri** di `apps/web/src/features/mail/types.ts`, dipetakan dari DTO. Komponen React tidak menyentuh bentuk row database, supaya perubahan skema tidak merembet ke UI.
- **Arah impor selalu ke dalam.** `apps/*` boleh mengimpor `packages/shared`; sebaliknya tidak pernah.
- **Util murni ke `lib.ts`.** Fungsi tanpa efek samping (parsing domain, validasi prefix, hitung waktu) taruh di situ supaya bisa diuji sendiri.

## Yang mungkin ditolak

Supaya tidak sia-sia menulisnya:

- **Menambahkan autentikasi ke API.** Tanpa auth itu keputusan desain (lihat README). Kalau butuh instans privat, pakai Cloudflare Access.
- **Menukar Biome dengan ESLint/Prettier.**
- **Menambah dependency berat** untuk sesuatu yang bisa 20 baris. Worker punya batas ukuran bundle.
- **Refactor besar yang tidak berkaitan** dengan perubahan yang kamu bawa. Pisahkan ke PR sendiri.
- **Layanan eksternal baru** (Redis, queue, database lain). Tujuan project ini adalah tetap berjalan penuh di dalam satu Worker.

## Melaporkan celah keamanan

Jangan lewat issue publik - baca [SECURITY.md](SECURITY.md).

## Lisensi

Dengan mengirim PR, kamu setuju kontribusimu dilisensikan di bawah [MIT](LICENSE), sama seperti project ini.
