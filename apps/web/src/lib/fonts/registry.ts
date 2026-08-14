/**
 * Font registry - versi Vite (tanpa next/font).
 * Daftar ini DISESUAIKAN dengan font yang sudah diunduh user ke D:\project\automation\.fonts
 * lalu di-subset ke WOFF2 variable (latin + latin-ext) di web/public/fonts/ supaya load cepat.
 * Setiap key memetakan ke var CSS --font-<key> yang dideklarasikan via @font-face di globals.css.
 */

export const fontRegistry = {
  geist: { label: "Geist" },
  inter: { label: "Inter" },
  plusJakartaSans: { label: "Plus Jakarta Sans" },
  roboto: { label: "Roboto" },
  openSans: { label: "Open Sans" },
  notoSans: { label: "Noto Sans" },
  montserrat: { label: "Montserrat" },
  nunito: { label: "Nunito" },
  encodeSans: { label: "Encode Sans" },
  redditSansCondensed: { label: "Reddit Sans Condensed" },
  signika: { label: "Signika" },
  kottaOne: { label: "Kotta One" },
} as const;

export type FontKey = keyof typeof fontRegistry;

export const fontKeys = Object.keys(fontRegistry) as FontKey[];

export const fontOptions = fontKeys.map((key) => ({
  key,
  label: fontRegistry[key].label,
}));
