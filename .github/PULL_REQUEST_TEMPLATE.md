## What changed

<!-- Keep it short. If there is a related issue: Closes #123 -->

## Why

<!-- What problem it solves. If already discussed in an issue, just link it. -->

## How to test it

<!-- Steps so a reviewer can verify it themselves. -->

1.
2.

## Screenshots

<!-- Required if there is a visual change. Include dark & light mode if relevant. -->

## Checklist

- [ ] `npm run lint:fix` is clean
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds
- [ ] Tested locally (`npm run dev`)
- [ ] Comments explain the **why**, not the mechanism, and are in English following the surrounding code
- [ ] Architecture boundaries kept - `packages/shared` stays DTO-only, D1 types do not leak into the frontend
- [ ] Documentation updated if behavior or the API changed (README, `/docs`, CHANGELOG)

## Notes for the reviewer

<!-- Parts you are unsure about, trade-offs you made, or things intentionally left undone. -->
