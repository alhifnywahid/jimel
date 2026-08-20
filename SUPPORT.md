# Support

Need help using or deploying JIMEL? This is the place. To report a bug or propose a feature, use [Issues](https://github.com/alhifnywahid/jimel/issues).

## Try these first

Most incoming questions are answered in these three places:

1. **[README](README.md)** - how to install, configure, architecture, limitations.
2. **The `/docs` page on your instance** - the full API reference with `curl` and response examples.
3. **The list of common problems below.**

## Common problems

**No email arrives at all.**
It is almost always the Email Routing catch-all that has not been pointed. Cloudflare Dashboard → your domain → **Email** → **Email Routing** → **Routing rules** → **Catch-all address** → Edit → Action **Send to a Worker** → pick `tempmail` → Enabled → Save. If this is your first time, enable Email Routing first so the MX record is created automatically. This step must be repeated for **every** domain.

**Email arrives but does not show up in the UI, only appears after a refresh.**
The WebSocket is likely blocked by your network. The frontend should fall back to polling every 8 seconds. Open DevTools → Network → WS tab to see whether the connection is being closed.

**The address I created is gone.**
Addresses have a TTL (`MESSAGE_TTL_MINUTES`, default 60 minutes) and are cleaned up by cron. This is the intended behavior. Change the value in `wrangler.toml` and redeploy.

**The inbox returns 404.**
That address has never been claimed, or it has expired. Claim it first via `POST /api/address/generate`.

**`npm run setup` stops saying the domain is not set.**
Pass the domain in the command: `npm run setup -- yourdomain.com`. That domain must already exist in your Cloudflare account.

**The Worker deploys successfully but the UI is blank.**
The frontend has not been built. Run `npm run build` then `npm run deploy`, or just `npm run setup` which covers both.

**Can I use a free domain / workers.dev subdomain to receive email?**
No. Email Routing needs a domain whose nameservers are on Cloudflare. A `*.workers.dev` subdomain cannot receive email.

## Still stuck?

- **[Open an issue](https://github.com/alhifnywahid/jimel/issues/new/choose)** - for a bug or feature request. Include your version/commit, reproduction steps, and the error message as-is.
- **[Discussions](https://github.com/alhifnywahid/jimel/discussions)** - for usage questions, ideas, or showing off your deployment.
- **Community channels** - Telegram and WhatsApp links are in the app sidebar, under the **Community** menu.

## Before you ask

Include these so there is no back and forth:

- the command you ran and the full error message,
- Node.js and wrangler versions (`node -v`, `npx wrangler --version`),
- whether the problem is local (`npm run dev`) or after deploy,
- the `[vars]` section in `wrangler.toml` - **without** `database_id` or your account data.

Never paste real email contents, API tokens, or credentials into an issue.

## Security reports

Not through a public issue - read [SECURITY.md](SECURITY.md).

## Response time expectations

This project is built by one person in their spare time. Replies usually come within a few days, but there is no SLA guarantee. There is no commercial support.
