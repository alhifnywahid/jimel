# Security Policy

## Supported versions

JIMEL is a self-hosted application. Only the latest commit on the `main` branch is supported - there are no backports to older commits.

## Reporting a security vulnerability

**Do not open a public issue for a security vulnerability.**

Use one of these private channels:

1. **GitHub Security Advisory** (recommended) - the **Security** tab in this repo → **Report a vulnerability**.
2. **Direct contact** - reach [@alhifnywahid](https://github.com/alhifnywahid) on GitHub.

Include if you can:

- the version/commit you tested,
- reproduction steps in as much detail as possible,
- the impact (whose data leaks, what an attacker can do),
- a proof of concept, if you have one.

I will confirm your report within **7 days** and keep you updated on progress until it is resolved. This is a one-person project built in spare time, so please be understanding if the fix is not instant. There is no bug bounty program.

## What is NOT a security vulnerability

Some things that may look like a bug are actually intentional design, and are already documented in the README:

- **The API has no authentication.** All `/api/*` endpoints are public. This is intentional so that old scripts only need to swap the base URL.
- **Any inbox can be read by anyone who knows the address.** The email address is the only "credential". Treat it as a short-lived secret.
- **Anyone can claim an address on your domain.** If your instance is public and this becomes a problem, add Cloudflare WAF rate limiting on `/api/address/generate`, or put Cloudflare Access in front of the Worker.
- **Emails are stored in plaintext in D1.** Until the TTL expires and cron cleans them up.

The interesting reports are the ones outside that list, for example: SQL injection, accessing an inbox without knowing its address, XSS via rendered email content, a way to read another instance's data, or escalation to the Cloudflare account of the instance owner.

## For those deploying JIMEL

The security of your instance is in your hands:

- Do not use JIMEL to receive important email (real account password resets, documents, personal data).
- Do not use the same domain as your production email.
- Set `MESSAGE_TTL_MINUTES` as needed - the shorter it is, the less data is stored.
- If you need a private instance, put Cloudflare Access in front of it.
- Never commit a `wrangler.toml` filled in with `database_id` to a public repo if you consider that ID sensitive, and use `wrangler secret put` for any secret.
