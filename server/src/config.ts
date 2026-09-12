import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadDotenvFile, resolveAppEnv } from "./appEnv.js";

export const serverDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

if (loadDotenvFile(resolveAppEnv(process.env))) {
  dotenv.config({ path: path.join(serverDir, ".env") });
}

const appEnv = resolveAppEnv(process.env);

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

const sqlitePath = process.env.SQLITE_PATH || "./data/foodpocalypse.sqlite";

export const config = {
  appEnv,
  port: Number(process.env.PORT || 3001),
  nodeEnv: process.env.NODE_ENV || "development",
  isProd: appEnv === "production",
  jwtSecret: required("JWT_SECRET"),
  emailPepper: required("EMAIL_PEPPER"),
  sqlitePath: path.isAbsolute(sqlitePath)
    ? sqlitePath
    : path.resolve(serverDir, sqlitePath),
};
