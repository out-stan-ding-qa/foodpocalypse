# Foodpocalypse

A personal diet and grocery assistant for one person. Sharing a list, pantry, or household is out of scope. Meals, recipes, and meal planning are out of scope.

The User saves Products, keeps Diet profiles, sees Recommendations (and can set Ratings that override them), and maintains one Shopping list. Domain language lives in [`CONTEXT.md`](./CONTEXT.md).

## Account management

Foodpocalypse models a single User — not a household. The same User is reached from any device by signing in. Sign-in is Email and Password only: every User has both so a new device can find them ([ADR 0002](./docs/adr/0002-password-required.md)). Email is the lookup key and does not change. Passkeys and WebAuthn are out of scope; Password is how identity works across devices, and a Passkey path would fight that model and the test plan ([ADR 0003](./docs/adr/0003-no-passkeys.md)).

## Run

```bash
cp server/.env.example server/.env
npm install
npm run dev
```

Edit `server/.env` so `JWT_SECRET` and `EMAIL_PEPPER` are long random strings. The first time the SQLite file is created, `DEFAULT_USER_EMAIL` and `DEFAULT_USER_PASSWORD` seed a User you can sign in as. The UI is at http://localhost:5173; the API is at http://127.0.0.1:3001 (Vite proxies `/api`).

This is the **local** environment (`APP_ENV=local`). It is the only one that reads `server/.env`.

```bash
npm test
npm run build
```

**Production** (`NODE_ENV=production` or `APP_ENV=production`) does not load a dotenv file. The API serves `client/dist` from the same origin after `npm run build && npm start`. See `server/.env.production.example` and [`docs/backend-design.md`](./docs/backend-design.md) (Production hosting).

### Render (current host)

Hobby workspace, **Free** web service, branch `main`. Not Starter, not a private/cron/worker service.

| Field | Value |
| --- | --- |
| Build | `npm ci && npm run build` |
| Start | `npm start` |
| `JWT_SECRET` | Render **Generate**, or any long random string |
| `EMAIL_PEPPER` | a **different** generated secret; do not rotate after first deploy |
| `DEFAULT_USER_EMAIL` | the Email you will type on sign-in (do not Generate) |
| `DEFAULT_USER_PASSWORD` | at least 8 characters (do not Generate) |

Leave `NODE_ENV`, `APP_ENV`, `PORT`, and `SQLITE_PATH` unset. Render sets `NODE_ENV=production` at **runtime**. Setting it in the dashboard also applies at build and skips `devDependencies`, so the Vue build fails. If that happens, use `npm ci --include=dev && npm run build`.

The Free instance sleeps after about 15 minutes idle. Sleep, restart, and redeploy wipe SQLite; the default User is seeded again. First request after sleep is a cold start.

If Hobby + Free still opens Stripe, look for Skip / Continue without a payment method. Do not add a card just to get past that unless you accept Render can bill overages.

Production changes under `server/src/domain/` and `server/src/routes/` start from a failing test (`docs/agents/tdd.md`).

## Docs

- [`CONTEXT.md`](./CONTEXT.md) — domain language
- [`docs/backend-design.md`](./docs/backend-design.md) — API and architecture
- [`docs/adr/`](./docs/adr/) — decisions
