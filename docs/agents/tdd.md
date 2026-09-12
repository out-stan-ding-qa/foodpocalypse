# TDD (domain and routes)

Applies to `server/src/domain/` and `server/src/routes/`. Tests live in `server/test/`.

## Loop

1. Write a test for the intended behavior. **Done when it fails** on current code (`npm test -w server`) for the reason you expect.
2. Change production code until that test passes. **Done when `npm test -w server` is green** and no extra behavior landed.

One behavior per cycle. New files under those directories are production code: start at step 1.

Seams: domain functions (unit) and HTTP routes (integration, in-process app, temp SQLite). Not Vue, not copy outside these paths.
