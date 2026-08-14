# Contributing Guide

Thanks for taking the time to work on JIMEL. This document is short - just enough to make your PR easy to review.

## Before writing code

- **Bug?** Open an issue with the Bug report template. Include reproduction steps.
- **New feature?** Open an issue first (Feature request template) before writing much code. A 10-minute discussion is better than a 500-line PR that turns out not to fit the project's direction.
- **Small fixes** (typo, docs, a single line) can go straight to a PR without an issue.

## Setting up your environment

You need Node.js 20+ and a (free) Cloudflare account if you want to test all the way through deploy.

```bash
git clone https://github.com/alhifnywahid/jimel.git
cd jimel
npm install
npm run db:init:local     # create the tables in local D1
npm run dev               # Worker + API at http://127.0.0.1:8787
npm run dev:web           # second terminal, UI with HMR at http://localhost:5173
```

This is an npm workspaces monorepo - run `npm install` **at the root only**, not inside `apps/*`.

## Workflow

1. Fork, then create a branch off `main`: `git switch -c fix/empty-inbox`
2. Make your changes.
3. Run the checks before committing:

   ```bash
   npm run lint:fix
   npm run typecheck
   npm run build
   ```

4. Commit with a message that explains **why**, not just what. The [Conventional Commits](https://www.conventionalcommits.org) format is preferred but not enforced:

   ```
   fix(web): do not re-poll after the WebSocket is ready
   ```

5. Open a PR. Fill in the template. If there is a visual change, attach a screenshot.

## Code style

The one and only formatter and linter is [Biome](https://biomejs.dev) - its config is in `biome.json`. `npm run lint:fix` handles almost everything. Do not add Prettier or ESLint.

Beyond that:

- **TypeScript strict.** Avoid `any`; if you truly need it, add a comment explaining why.
- **Comments explain the why, not the mechanism.** `// dedupe: the DO may send the same header twice on reconnect` is useful. `// increment i` is not.
- **Comment language follows the surrounding code** - comments in this project are in English.
- **Intention-revealing names.** `expiresAt` not `e`, `loadInbox` not `doStuff`.
- **Small functions, single responsibility.** If you need the word "and" to describe a function, split it.

## Architecture boundaries

This is what people get wrong most often in PRs, so please read it:

- **`packages/shared`** only holds contracts that cross the network - DTOs and WebSocket message types. No logic, no imports from `apps/*`.
- **Infrastructure types stay where they belong.** D1 row types and `Env` live in `apps/api/src/types.ts` and must not leak into the frontend.
- **The frontend has its own view-models** in `apps/web/src/features/mail/types.ts`, mapped from DTOs. React components never touch the database row shape, so a schema change does not ripple into the UI.
- **Import direction is always inward.** `apps/*` may import `packages/shared`; never the other way around.
- **Pure utils go in `lib.ts`.** Side-effect-free functions (domain parsing, prefix validation, time calculation) go there so they can be tested on their own.

## What may be rejected

So you don't waste effort writing it:

- **Adding authentication to the API.** No-auth is a design decision (see the README). If you need a private instance, use Cloudflare Access.
- **Swapping Biome for ESLint/Prettier.**
- **Adding a heavy dependency** for something that could be 20 lines. The Worker has a bundle size limit.
- **Large unrelated refactors** to the change you are bringing. Split those into their own PR.
- **New external services** (Redis, queue, another database). This project's goal is to keep running entirely inside a single Worker.

## Reporting a security vulnerability

Not through a public issue - read [SECURITY.md](SECURITY.md).

## License

By submitting a PR, you agree that your contribution is licensed under the [MIT](LICENSE) license, the same as this project.
