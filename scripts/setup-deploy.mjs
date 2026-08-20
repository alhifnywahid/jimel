#!/usr/bin/env node
/**
 * setup-deploy.mjs - deploy JIMEL in one shot.
 *
 * Usage:
 *   npm run setup -- yourdomain.com            # set the domain then deploy
 *   npm run setup -- jimel.email mail2.io      # multi-domain
 *   npm run setup                              # use the MAIL_DOMAINS already in wrangler.toml
 *
 * What it does automatically:
 *   1. Make sure you are logged in to Cloudflare.
 *   2. Create the D1 "tempmail" (or reuse an existing one) -> write database_id to wrangler.toml.
 *   3. Write MAIL_DOMAINS to wrangler.toml (when domains are given).
 *   4. Create the tables in production D1 (schema.sql).
 *   5. Build the frontend (apps/web -> dist).
 *   6. Deploy the Worker (FE + BE together).
 *
 * The Email Routing catch-all is set MANUALLY in the dashboard - the steps are printed at the end.
 * Idempotent: safe to run again.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WRANGLER_TOML = join(ROOT, "wrangler.toml");
const DB_NAME = "tempmail";
const TOTAL_STEPS = 6;

const domainArgs = process.argv.slice(2).filter(Boolean);

/** Run a command, output straight to the terminal. */
function run(cmd, args, opts = {}) {
	return execFileSync(cmd, args, { stdio: "inherit", shell: true, cwd: ROOT, ...opts });
}

/** Run a command, capture stdout for parsing. */
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
	console.error(`\n\x1b[1;31mFAILED:\x1b[0m ${message}\n`);
	process.exit(1);
}

/** Read MAIL_DOMAINS from wrangler.toml as a list. */
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
		`No domain configured. Two ways:

  A) Pass it on the command line (written to wrangler.toml automatically):
       npm run setup -- jimel.email
       npm run setup -- jimel.email mail2.io

  B) Edit wrangler.toml yourself on the line:
       MAIL_DOMAINS = "jimel.email,mail2.io"
     then run: npm run setup

  The domain must already exist in your Cloudflare account.`,
	);
}

// ── 1. Login ──
step(1, "Checking Cloudflare login…");
try {
	capture("npx", ["wrangler", "whoami"]);
	console.log("  Already logged in.");
} catch {
	console.log("  Not logged in - opening browser…");
	run("npx", ["wrangler", "login"]);
}

// ── 2. D1 database ──
step(2, `Preparing the D1 database "${DB_NAME}"…`);
let databaseId = "";
try {
	const existing = JSON.parse(capture("npx", ["wrangler", "d1", "list", "--json"])).find((d) => d.name === DB_NAME);
	if (existing) {
		databaseId = existing.uuid;
		console.log(`  Already exists, reusing: ${databaseId}`);
	}
} catch {
	/* list unreadable - try creating a new one */
}

if (!databaseId) {
	console.log("  Creating a new database…");
	const out = capture("npx", ["wrangler", "d1", "create", DB_NAME]);
	const match = out.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
	if (!match) fatal(`Could not read database_id from wrangler output:\n${out}`);
	databaseId = match[0];
	console.log(`  Created: ${databaseId}`);
}

// ── 3. Write configuration ──
step(3, "Writing database_id + MAIL_DOMAINS to wrangler.toml…");
if (/^database_id\s*=\s*".*"$/m.test(toml)) {
	toml = toml.replace(/^database_id\s*=\s*".*"$/m, `database_id = "${databaseId}"`);
} else {
	// The committed wrangler.toml has no database_id (Cloudflare auto-provisions it
	// for Git-connected deploys). For a CLI deploy we add it under database_name.
	toml = toml.replace(
		/^(database_name\s*=\s*".*")$/m,
		`$1\ndatabase_id = "${databaseId}"`,
	);
}
toml = toml.replace(/^MAIL_DOMAINS\s*=\s*".*"$/m, `MAIL_DOMAINS = "${domains.join(",")}"`);
writeFileSync(WRANGLER_TOML, toml);
console.log(`  database_id  = ${databaseId}`);
console.log(`  MAIL_DOMAINS = ${domains.join(",")}`);

// ── 4. Production D1 tables ──
step(4, "Creating tables in production D1…");
run("npx", ["wrangler", "d1", "execute", DB_NAME, "--remote", "--file=apps/api/schema.sql", "-y"]);

// ── 5. Build frontend ──
step(5, "Building the frontend…");
run("npm", ["run", "build"]);

// ── 6. Deploy Worker ──
step(6, "Deploying the Worker (frontend + API together)…");
let deployOut = "";
try {
	deployOut = capture("npx", ["wrangler", "deploy"]);
	console.log(deployOut);
} catch (error) {
	console.log(error.stdout ?? "");
	console.log(error.stderr ?? "");
	fatal("wrangler deploy failed - see the message above.");
}

const workerUrl = deployOut.match(/https:\/\/[^\s]+\.workers\.dev/)?.[0] ?? "";
const workerName = toml.match(/^name\s*=\s*"(.+)"$/m)?.[1] ?? "tempmail";

console.log(`
\x1b[1;32m═══ DEPLOY COMPLETE ═══\x1b[0m

  App URL   : ${workerUrl || "(see the deploy output above)"}
  Docs      : ${workerUrl ? `${workerUrl}/docs` : "<url>/docs"}
  Email dom : ${domains.join(", ")}

\x1b[1;33m═══ ONE MANUAL STEP: Email Routing catch-all ═══\x1b[0m

  Email will not arrive until the catch-all is pointed at the Worker.
  Do this for EVERY domain above:

    1. Open https://dash.cloudflare.com → pick the domain
    2. Menu \x1b[1mEmail\x1b[0m → \x1b[1mEmail Routing\x1b[0m
       (first time: click "Get started" / "Enable Email Routing",
        Cloudflare adds the MX record automatically)
    3. Tab \x1b[1mRouting rules\x1b[0m → \x1b[1mCatch-all address\x1b[0m section → Edit
    4. Action: \x1b[1mSend to a Worker\x1b[0m → pick \x1b[1m${workerName}\x1b[0m
    5. Enable it (Enabled) → \x1b[1mSave\x1b[0m

  Domains to configure: ${domains.join(", ")}

  Test: open the app URL, copy the address shown, send an email to it
  from any email account - it should arrive in realtime.

  Redeploy after code changes: \x1b[1mnpm run deploy\x1b[0m
  Add a domain later: \x1b[1mnpm run setup -- domain1.com domain2.com\x1b[0m
  (then repeat the catch-all step for the new domain)
`);
