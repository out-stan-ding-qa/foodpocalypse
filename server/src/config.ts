import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const serverDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

dotenv.config({ path: path.join(serverDir, ".env") });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

const sqlitePath = process.env.SQLITE_PATH || "./data/foodpocalypse.sqlite";

export const config = {
  port: Number(process.env.PORT || 3001),
  nodeEnv: process.env.NODE_ENV || "development",
  isProd: process.env.NODE_ENV === "production",
  jwtSecret: required("JWT_SECRET"),
  emailPepper: required("EMAIL_PEPPER"),
  webauthnRpId: required("WEBAUTHN_RP_ID"),
  webauthnRpName: process.env.WEBAUTHN_RP_NAME || "Foodpocalypse",
  webauthnOrigin: required("WEBAUTHN_ORIGIN"),
  sqlitePath: path.isAbsolute(sqlitePath)
    ? sqlitePath
    : path.resolve(serverDir, sqlitePath),
};
