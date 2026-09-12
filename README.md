# Foodpocalypse

A personal diet and grocery assistant for one person. Sign-in is Email and Password.

## Run

```bash
cp server/.env.example server/.env
npm install
npm run dev
```

Edit `server/.env` so `JWT_SECRET` and `EMAIL_PEPPER` are long random strings. The UI is at http://localhost:5173; the API is at http://127.0.0.1:3001 (Vite proxies `/api`).

This is the **local** environment (`APP_ENV=local`). It is the only one that reads `server/.env`.

**Production** (`NODE_ENV=production` or `APP_ENV=production`) does not load a dotenv file. Set `JWT_SECRET`, `EMAIL_PEPPER`, `PORT`, and `SQLITE_PATH` on the host. See `server/.env.production.example`. The API serves `client/dist` from the same origin after `npm run build && npm start`. The cloud provider is still TBD.

```bash
npm test
npm run build
```

Production changes under `server/src/domain/` and `server/src/routes/` start from a failing test (`docs/agents/tdd.md`).

## Docs

- [`CONTEXT.md`](./CONTEXT.md) — domain language
- [`docs/backend-design.md`](./docs/backend-design.md) — API and architecture
- [`docs/adr/`](./docs/adr/) — decisions
