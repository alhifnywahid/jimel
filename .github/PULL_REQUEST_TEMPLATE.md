## Apa yang berubah

<!-- Singkat saja. Kalau ada issue terkait: Closes #123 -->

## Kenapa

<!-- Masalah apa yang diselesaikan. Kalau sudah dibahas di issue, cukup tautkan. -->

## Cara mengujinya

<!-- Langkah agar reviewer bisa memverifikasi sendiri. -->

1.
2.

## Screenshot

<!-- Wajib kalau ada perubahan tampilan. Sertakan dark & light mode kalau relevan. -->

## Checklist

- [ ] `npm run lint:fix` bersih
- [ ] `npm run typecheck` lolos
- [ ] `npm run build` berhasil
- [ ] Diuji lokal (`npm run dev`)
- [ ] Komentar menjelaskan **alasan**, bukan mekanisme, dan berbahasa Indonesia mengikuti sekitarnya
- [ ] Batas arsitektur dijaga - `packages/shared` tetap hanya DTO, tipe D1 tidak bocor ke frontend
- [ ] Dokumentasi diperbarui kalau perilaku atau API berubah (README, `/docs`, CHANGELOG)

## Catatan untuk reviewer

<!-- Bagian yang kamu ragu, trade-off yang kamu ambil, atau hal yang sengaja belum dikerjakan. -->
