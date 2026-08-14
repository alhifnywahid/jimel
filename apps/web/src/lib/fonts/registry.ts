/**
 * Font registry - Vite version (no next/font).
 * This list MATCHES the fonts the user downloaded to D:\project\automation\.fonts
 * then subset into variable WOFF2 (latin + latin-ext) in web/public/fonts/ for fast loads.
 * Each key maps to the CSS var --font-<key> declared via @font-face in globals.css.
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
