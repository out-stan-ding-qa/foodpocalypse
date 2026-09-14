import { randomUUID } from "node:crypto";
import { Router, type Response } from "express";
import { eq } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { users } from "../db/schema.js";
import { hashEmail, isValidEmail, normalizeEmail } from "../auth/email.js";
import { hashPassword, verifyPassword } from "../auth/password.js";
import { verifyAccessToken, verifyRefreshToken } from "../auth/jwt.js";
import { issueSession } from "../auth/session.js";
import { cookieValue } from "../auth/request.js";
import {
  ACCESS_COOKIE,
  clearAuthCookies,
  REFRESH_COOKIE,
} from "../auth/cookies.js";

export const authRouter = Router();

const GENERIC_AUTH_ERROR = "Invalid email or password";
const GENERIC_REGISTER_ERROR = "Unable to create account";

let dummyPasswordHash: Promise<string> | undefined;

function dummyHash(): Promise<string> {
  dummyPasswordHash ??= hashPassword("timing-equalization-unused");
  return dummyPasswordHash;
}

function sendError(res: Response, status: number, error: string) {
  res.status(status).json({ error });
}

authRouter.post("/register", async (req, res) => {
  try {
    const email =
      typeof req.body?.email === "string" ? req.body.email : "";
    const password =
      typeof req.body?.password === "string" ? req.body.password : "";

    if (!isValidEmail(email) || password.length < 8 || password.length > 128) {
      sendError(res, 400, GENERIC_REGISTER_ERROR);
      return;
    }

    const db = getDb();
    const emailHash = hashEmail(email);
    const existing = db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.emailHash, emailHash))
      .get();

    if (existing) {
      await dummyHash();
      sendError(res, 400, GENERIC_REGISTER_ERROR);
      return;
    }

    const userId = randomUUID();
    db.insert(users)
      .values({
        id: userId,
        emailHash,
        passwordHash: await hashPassword(password),
        createdAt: Date.now(),
      })
      .run();

    await issueSession(res, { userId, email: normalizeEmail(email) });
    res.status(201).json({ id: userId });
  } catch {
    sendError(res, 500, GENERIC_REGISTER_ERROR);
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const email =
      typeof req.body?.email === "string" ? req.body.email : "";
    const password =
      typeof req.body?.password === "string" ? req.body.password : "";

    if (!isValidEmail(email) || password.length < 1) {
      sendError(res, 401, GENERIC_AUTH_ERROR);
      return;
    }

    const db = getDb();
    const row = db
      .select()
      .from(users)
      .where(eq(users.emailHash, hashEmail(email)))
      .get();

    const passwordHash = row?.passwordHash ?? (await dummyHash());
    const matches = await verifyPassword(passwordHash, password);

    if (!row || !row.passwordHash || !matches) {
      sendError(res, 401, GENERIC_AUTH_ERROR);
      return;
    }

    await issueSession(res, { userId: row.id, email: normalizeEmail(email) });
    res.json({ id: row.id });
  } catch {
    sendError(res, 500, GENERIC_AUTH_ERROR);
  }
});

authRouter.get("/me", async (req, res) => {
  const token = cookieValue(req, ACCESS_COOKIE);
  if (!token) {
    sendError(res, 401, "Unauthorized");
    return;
  }
  try {
    const claims = await verifyAccessToken(token);
    res.json({ id: claims.sub, email: claims.email });
  } catch {
    sendError(res, 401, "Unauthorized");
  }
});

authRouter.post("/refresh", async (req, res) => {
  const token = cookieValue(req, REFRESH_COOKIE);
  if (!token) {
    sendError(res, 401, "Unauthorized");
    return;
  }
  try {
    const claims = await verifyRefreshToken(token);
    await issueSession(res, { userId: claims.sub, email: claims.email });
    res.json({ id: claims.sub });
  } catch {
    sendError(res, 401, "Unauthorized");
  }
});

authRouter.post("/logout", (_req, res) => {
  clearAuthCookies(res);
  res.status(204).end();
});
