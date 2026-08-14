-- schema.sql - D1 tables for tempmail.
-- Run: npm run db:init  (or db:init:local for wrangler dev)

-- Claimed addresses (via POST /api/address/generate).
CREATE TABLE IF NOT EXISTS addresses (
  address    TEXT PRIMARY KEY,          -- full: localpart@domain (lowercase)
  created_at INTEGER NOT NULL,          -- epoch seconds
  expires_at INTEGER NOT NULL           -- epoch seconds
);

-- Incoming emails.
CREATE TABLE IF NOT EXISTS emails (
  id          TEXT PRIMARY KEY,         -- uuid
  address     TEXT NOT NULL,            -- destination (lowercase)
  sender      TEXT NOT NULL DEFAULT '', -- sender address
  sender_name TEXT NOT NULL DEFAULT '', -- sender display name
  subject     TEXT NOT NULL DEFAULT '',
  body_text   TEXT NOT NULL DEFAULT '',
  body_html   TEXT NOT NULL DEFAULT '',
  received_at INTEGER NOT NULL,         -- epoch seconds
  expires_at  INTEGER NOT NULL,         -- epoch seconds (for purge)
  is_read     INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_emails_address ON emails(address, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_expires ON emails(expires_at);
CREATE INDEX IF NOT EXISTS idx_addresses_expires ON addresses(expires_at);
