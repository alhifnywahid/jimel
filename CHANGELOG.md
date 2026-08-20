# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed

- **Git-connected deploys failed with `Missing entry-point to Worker script or to assets directory`.** Workers Builds runs its commands from the repository root, where there was no Worker config - `wrangler.toml` lived in `apps/api/`. The build itself always succeeded; only the deploy step failed, which is why a Worker deployed earlier by `npm run setup` (which ran wrangler from `apps/api/`) stayed live while every push silently stopped shipping. The config now sits at the repo root with root-relative paths, so the Deploy to Cloudflare button and Workers Builds work with no dashboard setup.

### Changed

- **Zero-config database.** The `database_id` is no longer needed in `wrangler.toml`. Cloudflare auto-provisions the D1 database on the first deploy, and the Worker now creates its own tables on first run (`ensureSchema()`), so there is nothing to set up by hand.

### Added

- **Deploy to Cloudflare button** and a Git-connected (Workers Builds) flow: one click clones the repo, provisions resources, deploys, and wires up CI/CD so every `git push` auto-deploys. Domains are managed by editing `MAIL_DOMAINS` in `wrangler.toml` and pushing - no CLI required.

## [1.0.0] - 2026-08-14

First release.

### Added

- **A single Worker** serving the UI, REST API, WebSocket, and email receiver all at once (Hono + Cloudflare Static Assets with `run_worker_first`).
- **Email receiving** via the `email()` handler - the Email Routing catch-all is forwarded to the Worker, the MIME is parsed with postal-mime, then stored in D1. Email to an unclaimed address is discarded without a bounce.
- **Realtime push** via a Durable Object with WebSocket Hibernation, one object per email address (`/ws/{address}`).
- **REST polling fallback** every 8 seconds when the WebSocket fails, automatically stopping once the WebSocket is ready.
- **REST API** following the sudevmail contract so old clients only need to swap the base URL:
  `GET /api/domains`, `POST /api/address/generate`, `GET /api/inbox/{address}`,
  `GET /api/email/{id}`, `DELETE /api/email/{id}`.
- **Multi-domain** via `MAIL_DOMAINS` (comma-separated) in `wrangler.toml`; the first domain becomes the default and the UI shows a picker dropdown.
- **Custom or random addresses** - the prefix can be typed manually, with an automatic re-roll on `409` if the previous prefix was randomly generated.
- **TTL & automatic cleanup** - expired emails and addresses follow `MESSAGE_TTL_MINUTES`, deleted by the `scheduled()` cron every 10 minutes.
- **Frontend** with Vite + React 19 + TypeScript strict + Tailwind v4 + shadcn/ui: inbox list, email content view, address panel with a copy button, dark/light theme, color presets, and sidebar layout settings.
- **Built-in API documentation page** at the `/docs` route, complete with `curl` examples, response examples, and a ready-to-paste prompt for AI.
- **Community menu** in the sidebar for Telegram and WhatsApp links.
- **`npm run setup`** - one idempotent command that logs in to Cloudflare, creates/uses D1, writes `database_id` and `MAIL_DOMAINS`, sets up the schema, builds the frontend, deploys the Worker, then prints the manual catch-all steps.
- **npm workspaces monorepo** with `packages/shared` as the only API contract that crosses the network boundary.
- Biome as the single formatter and linter.

### Notes

- The API is intentionally unauthenticated. The consequences and how to secure it are explained in the [README](README.md#security-and-limitations) and [SECURITY.md](SECURITY.md).
- The Email Routing catch-all is set up manually in the Cloudflare dashboard - it is not automated, so there is no need to request an API token with broad access to your account.

[Unreleased]: https://github.com/alhifnywahid/jimel/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/alhifnywahid/jimel/releases/tag/v1.0.0
