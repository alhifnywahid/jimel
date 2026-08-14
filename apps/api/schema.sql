-- schema.sql - tabel D1 untuk tempmail.
-- Jalankan: npm run db:init  (atau db:init:local untuk wrangler dev)

-- Alamat yang sudah di-claim (via POST /api/address/generate).
CREATE TABLE IF NOT EXISTS addresses (
  address    TEXT PRIMARY KEY,          -- full: localpart@domain (lowercase)
  created_at INTEGER NOT NULL,          -- epoch detik
  expires_at INTEGER NOT NULL           -- epoch detik
);

-- Email masuk.
CREATE TABLE IF NOT EXISTS emails (
  id          TEXT PRIMARY KEY,         -- uuid
  address     TEXT NOT NULL,            -- tujuan (lowercase)
  sender      TEXT NOT NULL DEFAULT '', -- alamat pengirim
  sender_name TEXT NOT NULL DEFAULT '', -- nama tampil pengirim
  subject     TEXT NOT NULL DEFAULT '',
  body_text   TEXT NOT NULL DEFAULT '',
  body_html   TEXT NOT NULL DEFAULT '',
  received_at INTEGER NOT NULL,         -- epoch detik
  expires_at  INTEGER NOT NULL,         -- epoch detik (untuk purge)
  is_read     INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_emails_address ON emails(address, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_expires ON emails(expires_at);
CREATE INDEX IF NOT EXISTS idx_addresses_expires ON addresses(expires_at);
