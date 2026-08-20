<div align="center">

<img src="assets/readme/hero.svg" alt="JIMEL - disposable email on Cloudflare Workers, with an example temporary inbox" width="100%">

<br>

[![MIT License](https://img.shields.io/badge/license-MIT-5EEAD4?style=flat-square)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F0B429?style=flat-square&logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/workers/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Biome](https://img.shields.io/badge/Biome-2.3-60A5FA?style=flat-square&logo=biome&logoColor=white)](https://biomejs.dev)

**Disposable email inboxes on your own domain.** A single Worker serves the UI, REST API, realtime WebSocket, and email receiver all at once - no VPS, no SMTP server, no monthly bill.

English · [Bahasa Indonesia](README.id.md)

</div>

---

## Deploy in one click (Git-connected, auto-updating)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/alhifnywahid/jimel)

This is the recommended path. Clicking the button makes Cloudflare:

1. **Clone this repo** into your own GitHub account.
2. **Auto-provision** the D1 database and Durable Object and bind them to the Worker - there is no `database_id` to fill in, the Worker creates its own tables on first run.
3. **Build and deploy** the Worker.
4. **Wire up CI/CD** (Workers Builds): from then on, **every `git push` to `main` auto-deploys**. You never run a deploy command again.

After the first deploy, two manual steps remain (both one-time, both because they touch your own account and domain):

**a) Set your domains.** Edit [`wrangler.toml`](wrangler.toml) in your new repo, on the `MAIL_DOMAINS` line, then commit - the push auto-deploys:

```toml
MAIL_DOMAINS = "yourdomain.com"          # or "domain1.com,domain2.io" for several
```

**b) Point the Email Routing catch-all** (per domain, or no email will arrive):

> Cloudflare Dashboard → pick your domain → **Email** → **Email Routing** → **Routing rules** tab → **Catch-all address** → Edit → Action **Send to a Worker** → pick `tempmail` → Enabled → Save.

Open the app URL and an address is created for you right away. Send email to that address from anywhere - it shows up in realtime, no refresh.

### Adding or removing a domain later

No CLI, no login. Just edit `MAIL_DOMAINS` in `wrangler.toml` and push:

```toml
MAIL_DOMAINS = "domain1.com,domain2.io,newdomain.net"   # add: append it
MAIL_DOMAINS = "domain1.com"                            # remove: delete it from the list
```

`git push` → Cloudflare auto-deploys the change. For a **newly added** domain, do the catch-all step (b) once. For a **removed** domain, optionally turn its catch-all back off in the dashboard. The first domain in the list is always the UI default.

## Or deploy from your machine (CLI)

Prefer to drive it yourself, or not use Git-connected builds? One command does everything:

```bash
git clone https://github.com/alhifnywahid/jimel.git
cd jimel
npm install
npm run setup -- yourdomain.com
```

That logs in to Cloudflare, creates the D1 database, writes the config, builds the frontend, and deploys the Worker - then prints your app URL. Redeploy after a change with `npm run deploy`; add a domain later with `npm run setup -- domain1.com domain2.com`. The same catch-all step above still applies.

## Why this is different

Public tempmail services share the same problems: their domains are already blocklisted everywhere, any inbox can be read by anyone who guesses the address, and the API can die or start charging at any time.

JIMEL moves all of it into your own Cloudflare account:

|            | Public tempmail                  | JIMEL                              |
| ---------- | -------------------------------- | ---------------------------------- |
| Domain     | shared, often blocked            | your domain, clean reputation      |
| Cost       | free until suddenly not          | free on the Workers free tier      |
| API        | may change / be rate limited     | yours, no rate limit               |
| Realtime   | polling                          | WebSocket push                     |
| Data life  | unclear                          | a TTL you set, deleted by cron     |

## How it works

<img src="assets/readme/arsitektur.svg" alt="Email arrives via Cloudflare Email Routing into the Worker's email() handler, is stored in D1, and pushed via a Durable Object to the browser. The browser also calls the REST /api of the same Worker." width="100%">

One Worker, three entry points:

- **`email()`** - Email Routing forwards the entire catch-all here. The Worker parses the MIME ([postal-mime](https://github.com/postalsys/postal-mime)), stores it in D1, then pings that address's Durable Object. Email to an address that was never claimed is discarded silently so random spam does not pile up.
- **`fetch()`** - Hono serves `/api/*` and `/ws/*`; everything else falls through to the React SPA via Static Assets. Frontend and backend share one URL, so there is no CORS to deal with in the UI.
- **`scheduled()`** - a cron every 10 minutes deletes addresses and email past their TTL.

Realtime uses a **Durable Object with WebSocket Hibernation**: one object per email address, and idle connections do not bill for their duration. If the WebSocket fails (corporate proxy, weird network), the frontend automatically falls back to REST polling every 8 seconds - the inbox still fills.

## Features

- **Multi-domain** - one deploy serves several domains, users pick from a dropdown
- **Custom addresses** - type your own prefix, or let it be randomized
- **Realtime** - WebSocket push, automatic polling fallback
- **TTL** - email and addresses expire on their own, cleaned up by cron
- **Built-in documentation page** - open `/docs` on the deployed app; complete with `curl` examples, response examples, and a ready-to-paste prompt for AI
- **No-auth API** - intentional, so old scripts only need to swap the base URL ([see the security notes](#security-and-limitations))
- **Themes** - dark/light, several color presets, adjustable sidebar layout

## API

Base URL = your Worker URL. Every response is wrapped in an envelope `{ success, data }` or `{ success, error }`. Timestamps use **epoch seconds**.

| Method   | Endpoint                | Purpose                                                                |
| -------- | ----------------------- | ---------------------------------------------------------------------- |
| `GET`    | `/api/domains`          | list of active domains; the first one = default                        |
| `POST`   | `/api/address/generate` | claim an address - body `{ prefix, domain? }`, `409` if already in use  |
| `GET`    | `/api/inbox/{address}`  | list of email headers; `404` if the address has not been claimed        |
| `GET`    | `/api/email/{id}`       | full email content, also marks it as read                              |
| `DELETE` | `/api/email/{id}`       | delete a single email (idempotent)                                     |
| `WS`     | `/ws/{address}`         | realtime push: `ready`, `email`, `pong`                                |

```bash
# claim an address then read its inbox
curl -X POST https://tempmail.example.workers.dev/api/address/generate \
  -H 'Content-Type: application/json' \
  -d '{"prefix":"hello123"}'

curl https://tempmail.example.workers.dev/api/inbox/hello123@yourdomain.com
```

The full reference is on your app's `/docs` page - including a prompt you can paste into an AI so it immediately understands how to integrate.

## Configuration

**There is no `.env`.** The Worker does not read a `.env` file at runtime; configuration comes in as bindings from [`wrangler.toml`](wrangler.toml) at deploy time.

```toml
[vars]
MAIL_DOMAINS = "yourdomain.com,otherdomain.io"   # comma-separated; the first one = default
MESSAGE_TTL_MINUTES = "60"                        # lifetime of email & addresses
```

`npm run setup -- domain1.com domain2.com` writes those two lines and `database_id` for you. You can also edit the domains by hand and then run `npm run setup` with no arguments. After adding a domain, repeat the catch-all step in the dashboard for that new domain.

There are no secrets in this project yet. If you add one later (e.g. a webhook), use `wrangler secret put NAME` - do not put it in `wrangler.toml`.

## Development

```bash
npm install
npm run db:init:local     # create the tables in local D1
npm run dev               # Worker + API at http://127.0.0.1:8787
npm run dev:web           # UI with HMR at http://localhost:5173 (proxies to 8787)
```

`npm run dev` alone is enough to test the API. Add `dev:web` in a second terminal when working on the UI.

Other commands:

| Command                       | Purpose                                    |
| ----------------------------- | ------------------------------------------ |
| `npm run setup -- domain.com` | setup + deploy in one go (idempotent)      |
| `npm run deploy`              | redeploy after a code change               |
| `npm run typecheck`           | TypeScript across all workspaces           |
| `npm run lint` / `lint:fix`   | Biome                                      |

Testing `email()` locally without a domain: `npx wrangler dev`, then POST an `.eml` file to wrangler's local email endpoint. Make sure your `.eml` has `Message-ID` and `Date` headers, otherwise the parser rejects it.

## Structure

An npm workspaces monorepo, one `node_modules` and one lockfile at the root.

```
.
├── apps/
│   ├── api/                    Worker - Hono, D1, Durable Object, email handler
│   │   ├── src/
│   │   │   ├── index.ts        router + email() + scheduled()
│   │   │   ├── inbox-room.ts   Durable Object, WebSocket Hibernation
│   │   │   ├── lib.ts          pure utils (domain, prefix, time)
│   │   │   └── types.ts        infrastructure types (Env, D1 rows)
│   │   └── schema.sql
│   └── web/                    Frontend - Vite, React 19, Tailwind v4, shadcn/ui
│       └── src/
│           ├── features/mail/  inbox, addresses, realtime sync
│           └── features/docs/  API documentation page
├── packages/
│   └── shared/                 API contracts used by both sides (DTOs, WS message types)
├── scripts/
│   └── setup-deploy.mjs
└── wrangler.toml               Worker config - at the root so Workers Builds finds it
```

The module boundaries are kept intentionally: `packages/shared` only holds the DTOs that cross the network, the D1 infrastructure types stay in `apps/api`, and the frontend has its own view-models mapped from the DTOs - so changing the database row shape does not ripple into the React components.

## Security and limitations

**The API is public and unauthenticated. This is a design decision, not an oversight.** The consequences:

- Anyone who knows an address can read its inbox via the API. Treat every address as a short-lived secret.
- Anyone can claim an address on your domain. If your instance is used publicly, consider Cloudflare WAF rate limiting on `/api/address/generate`.
- Do not use it for anything important: real account password resets, documents, personal data.
- Emails are stored as plaintext in your D1 until the TTL expires.

If you need a private instance, the easiest way is to put Cloudflare Access in front of the Worker.

Found a vulnerability? Read [SECURITY.md](SECURITY.md) - do not open a public issue.

## Contributing

Issues and PRs are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow and code style, plus [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Need usage help rather than reporting a bug? [SUPPORT.md](SUPPORT.md).

## License

Open source under [MIT](LICENSE). In short: free to use, modify, and redeploy - including commercially - as long as the copyright notice is kept. No warranty; an instance you deploy is your responsibility.

<div align="center">

<br>

Disposable email · Use it to sign up for services, trials, and testing - not to abuse other people's services or to receive anything important.

**JIMEL** · Copyright (c) 2026 Alhifny Wahid · Released under the MIT License.

</div>
