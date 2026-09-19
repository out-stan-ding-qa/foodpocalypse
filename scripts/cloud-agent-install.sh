#!/usr/bin/env bash
# Cloud Agent environment bootstrap for Foodpocalypse.
# Idempotent: safe to run repeatedly against cached or partial state.
set -euo pipefail

cd "$(dirname "$0")/.."

# Reproducible install from the committed lockfile. `npm ci` does not rewrite
# package-lock.json, so the environment stays in sync with the repo.
npm ci

# The local API reads server/.env (gitignored). Create it once with strong
# random secrets so `npm run dev` can sign in with the seeded default User.
ENV_FILE="server/.env"
if [ ! -f "$ENV_FILE" ]; then
  cp server/.env.example "$ENV_FILE"
  jwt_secret="$(openssl rand -hex 32)"
  email_pepper="$(openssl rand -hex 32)"
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${jwt_secret}|" "$ENV_FILE"
  sed -i "s|^EMAIL_PEPPER=.*|EMAIL_PEPPER=${email_pepper}|" "$ENV_FILE"
  echo "Created ${ENV_FILE} with generated JWT_SECRET and EMAIL_PEPPER."
else
  echo "${ENV_FILE} already exists; leaving it unchanged."
fi
