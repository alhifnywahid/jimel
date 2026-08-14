#!/usr/bin/env node
/**
 * setup-deploy.mjs - deploy JIMEL sekali jalan.
 *
 * Pakai:
 *   npm run setup -- domainkamu.com            # set domain lalu deploy
 *   npm run setup -- jimel.email mail2.io      # multi-domain
 *   npm run setup                              # pakai MAIL_DOMAINS yang sudah ada di wrangler.toml
 *
 * Yang dikerjakan otomatis:
 *   1. Pastikan sudah login Cloudflare.
 *   2. Buat D1 "tempmail" (atau pakai yang sudah ada) → tulis database_id ke wrangler.toml.
 *   3. Tulis MAIL_DOMAINS ke wrangler.toml (kalau domain disebutkan).
 *   4. Buat tabel di D1 produksi (schema.sql).
 *   5. Build frontend (apps/web → dist).
 *   6. Deploy Worker (FE + BE sekaligus).
 *
 * Catch-all Email Routing diatur MANUAL di dashboard - langkahnya dicetak di akhir.
 * Idempotent: aman dijalankan ulang.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const API_DIR = join(ROOT, "apps", "api");
const WRANGLER_TOML = join(API_DIR, "wrangler.toml");
const DB_NAME = "tempmail";
const TOTAL_STEPS = 6;

const domainArgs = process.argv.slice(2).filter(Boolean);

/** Jalankan perintah, output langsung ke terminal. */
function run(cmd, args, opts = {}) {
	return execFileSync(cmd, args, { stdio: "inherit", shell: true, cwd: ROOT, ...opts });
}

/** Jalankan perintah, tangkap stdout untuk diparse. */
function capture(cmd, args, opts = {}) {
	return execFileSync(cmd, args, {
		encoding: "utf8",
		shell: true,
		cwd: ROOT,
		stdio: ["ignore", "pipe", "pipe"],
		...opts,
	});
}

const step = (n, text) => console.log(`\n\x1b[1;36m[${n}/${TOTAL_STEPS}]\x1b[0m ${text}`);

function fatal(message) {
	console.error(`\n\x1b[1;31mGAGAL:\x1b[0m ${message}\n`);
	process.exit(1);
}

/** Baca MAIL_DOMAINS dari wrangler.toml sebagai daftar. */
function tomlDomains(toml) {
	const raw = toml.match(/^MAIL_DOMAINS\s*=\s*"(.*)"$/m)?.[1] ?? "";
	return raw
		.split(",")
		.map((d) => d.trim().toLowerCase())
		.filter(Boolean);
}

let toml = readFileSync(WRANGLER_TOML, "utf8");
const domains = domainArgs.length > 0 ? domainArgs : tomlDomains(toml);

if (domains.length === 0 || domains.includes("example.com")) {
	fatal(
		`Domain belum diatur. Dua cara:

  A) Sebutkan di perintah (otomatis ditulis ke wrangler.toml):
       npm run setup -- jimel.email
       npm run setup -- jimel.email mail2.io

  B) Edit sendiri apps/api/wrangler.toml pada baris:
       MAIL_DOMAINS = "jimel.email,mail2.io"
     lalu jalankan: npm run setup

  Domain harus sudah ada di akun Cloudflare-mu.`,
	);
}

// ── 1. Login ──
step(1, "Memeriksa login Cloudflare…");
try {
	capture("npx", ["wrangler", "whoami"]);
	console.log("  Sudah login.");
} catch {
	console.log("  Belum login - membuka browser…");
	run("npx", ["wrangler", "login"]);
}

// ── 2. D1 database ──
step(2, `Menyiapkan database D1 "${DB_NAME}"…`);
let databaseId = "";
try {
	const existing = JSON.parse(capture("npx", ["wrangler", "d1", "list", "--json"])).find((d) => d.name === DB_NAME);
	if (existing) {
		databaseId = existing.uuid;
		console.log(`  Sudah ada, dipakai ulang: ${databaseId}`);
	}
} catch {
	/* daftar tak terbaca - coba buat baru */
}

if (!databaseId) {
	console.log("  Membuat database baru…");
	const out = capture("npx", ["wrangler", "d1", "create", DB_NAME]);
	const match = out.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
	if (!match) fatal(`Tidak bisa membaca database_id dari output wrangler:\n${out}`);
	databaseId = match[0];
	console.log(`  Dibuat: ${databaseId}`);
}

// ── 3. Tulis konfigurasi ──
step(3, "Menulis database_id + MAIL_DOMAINS ke wrangler.toml…");
toml = toml.replace(/^database_id\s*=\s*".*"$/m, `database_id = "${databaseId}"`);
toml = toml.replace(/^MAIL_DOMAINS\s*=\s*".*"$/m, `MAIL_DOMAINS = "${domains.join(",")}"`);
writeFileSync(WRANGLER_TOML, toml);
console.log(`  database_id  = ${databaseId}`);
console.log(`  MAIL_DOMAINS = ${domains.join(",")}`);

// ── 4. Tabel D1 produksi ──
step(4, "Membuat tabel di D1 produksi…");
run("npx", ["wrangler", "d1", "execute", DB_NAME, "--remote", "--file=./schema.sql", "-y"], {
	cwd: API_DIR,
});

// ── 5. Build frontend ──
step(5, "Build frontend…");
run("npm", ["run", "build"]);

// ── 6. Deploy Worker ──
step(6, "Deploy Worker (frontend + API sekaligus)…");
let deployOut = "";
try {
	deployOut = capture("npx", ["wrangler", "deploy"], { cwd: API_DIR });
	console.log(deployOut);
} catch (error) {
	console.log(error.stdout ?? "");
	console.log(error.stderr ?? "");
	fatal("wrangler deploy gagal - lihat pesan di atas.");
}

const workerUrl = deployOut.match(/https:\/\/[^\s]+\.workers\.dev/)?.[0] ?? "";
const workerName = toml.match(/^name\s*=\s*"(.+)"$/m)?.[1] ?? "tempmail";

console.log(`
\x1b[1;32m═══ DEPLOY SELESAI ═══\x1b[0m

  URL aplikasi : ${workerUrl || "(lihat output deploy di atas)"}
  Dokumentasi  : ${workerUrl ? `${workerUrl}/docs` : "<url>/docs"}
  Domain email : ${domains.join(", ")}

\x1b[1;33m═══ SATU LANGKAH MANUAL: catch-all Email Routing ═══\x1b[0m

  Email belum akan masuk sampai catch-all diarahkan ke Worker.
  Lakukan untuk SETIAP domain di atas:

    1. Buka https://dash.cloudflare.com → pilih domain
    2. Menu \x1b[1mEmail\x1b[0m → \x1b[1mEmail Routing\x1b[0m
       (kalau baru pertama: klik "Get started" / "Enable Email Routing",
        Cloudflare menambahkan MX record otomatis)
    3. Tab \x1b[1mRouting rules\x1b[0m → bagian \x1b[1mCatch-all address\x1b[0m → Edit
    4. Action: \x1b[1mSend to a Worker\x1b[0m → pilih \x1b[1m${workerName}\x1b[0m
    5. Aktifkan (Enabled) → \x1b[1mSave\x1b[0m

  Domain yang perlu diatur: ${domains.join(", ")}

  Uji: buka URL aplikasi, salin alamat yang muncul, kirim email ke alamat itu
  dari akun email mana pun - mestinya masuk realtime.

  Deploy ulang setelah ganti kode: \x1b[1mnpm run deploy\x1b[0m
  Tambah domain nanti: \x1b[1mnpm run setup -- domain1.com domain2.com\x1b[0m
  (lalu ulangi langkah catch-all untuk domain baru)
`);
