import { randomUUID } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { users, webauthnCredentials } from "../db/schema.js";
import { hashEmail, isValidEmail, normalizeEmail } from "../auth/email.js";
import { hashPassword, verifyPassword } from "../auth/password.js";
import { verifyAccessToken, verifyRefreshToken } from "../auth/jwt.js";
import { putChallenge, takeChallenge } from "../auth/challenges.js";
import { issueSession } from "../auth/session.js";
import {
  ACCESS_COOKIE,
  clearAuthCookies,
  clearWebAuthnCookie,
  REFRESH_COOKIE,
  setWebAuthnCookie,
  WEBAUTHN_COOKIE,
} from "../auth/cookies.js";
import {
  checkAuthenticationResponse,
  checkRegistrationResponse,
  createAuthenticationOptions,
  createRegistrationOptions,
  publicKeyFromStore,
  publicKeyToStore,
} from "../auth/webauthn.js";

export const authRouter = Router();

const GENERIC_AUTH_ERROR = "Invalid email or password";
const GENERIC_REGISTER_ERROR = "Unable to create account";
const GENERIC_PASSKEY_ERROR = "Passkey verification failed";

let dummyPasswordHash: Promise<string> | undefined;

function dummyHash(): Promise<string> {
  dummyPasswordHash ??= hashPassword("timing-equalization-unused");
  return dummyPasswordHash;
}

function cookie(req: Request, name: string): string | undefined {
  const value = req.cookies?.[name];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

async function optionalUser(req: Request) {
  const token = cookie(req, ACCESS_COOKIE);
  if (!token) {
    return undefined;
  }
  try {
    return await verifyAccessToken(token);
  } catch {
    return undefined;
  }
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
  const token = cookie(req, ACCESS_COOKIE);
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
  const token = cookie(req, REFRESH_COOKIE);
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
  clearWebAuthnCookie(res);
  res.status(204).end();
});

authRouter.post("/passkey/register/options", async (req, res) => {
  try {
    const session = await optionalUser(req);
    const db = getDb();
    const emailRaw =
      typeof req.body?.email === "string" ? req.body.email : "";
    const password =
      typeof req.body?.password === "string" ? req.body.password : "";

    let userId: string;
    let email: string;
    let passwordHash: string | undefined;
    let blocked = false;
    let excludeCredentialIds: string[] = [];

    if (session) {
      userId = session.sub;
      email = session.email || emailRaw || `user-${session.sub}`;
      const existing = db
        .select({ credentialId: webauthnCredentials.credentialId })
        .from(webauthnCredentials)
        .where(eq(webauthnCredentials.userId, userId))
        .all();
      excludeCredentialIds = existing.map((row) => row.credentialId);
    } else {
      if (!isValidEmail(emailRaw)) {
        sendError(res, 400, GENERIC_REGISTER_ERROR);
        return;
      }
      if (password && (password.length < 8 || password.length > 128)) {
        sendError(res, 400, GENERIC_REGISTER_ERROR);
        return;
      }
      email = normalizeEmail(emailRaw);
      const existing = db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.emailHash, hashEmail(email)))
        .get();
      userId = existing?.id ?? randomUUID();
      blocked = Boolean(existing);
      if (password) {
        passwordHash = await hashPassword(password);
      }
    }

    const options = await createRegistrationOptions({
      userId,
      email,
      excludeCredentialIds,
    });

    const nonce = putChallenge({
      type: "register",
      challenge: options.challenge,
      userId,
      email,
      passwordHash,
      blocked,
    });
    setWebAuthnCookie(res, nonce);
    res.json({ options });
  } catch {
    sendError(res, 500, GENERIC_REGISTER_ERROR);
  }
});

authRouter.post("/passkey/register/verify", async (req, res) => {
  try {
    const nonce = cookie(req, WEBAUTHN_COOKIE);
    if (!nonce) {
      sendError(res, 400, GENERIC_PASSKEY_ERROR);
      return;
    }
    const record = takeChallenge(nonce);
    clearWebAuthnCookie(res);
    if (!record || record.type !== "register" || record.blocked) {
      sendError(res, 400, GENERIC_PASSKEY_ERROR);
      return;
    }

    const verification = await checkRegistrationResponse({
      response: req.body,
      challenge: record.challenge,
    });

    if (!verification.verified || !verification.registrationInfo) {
      sendError(res, 400, GENERIC_PASSKEY_ERROR);
      return;
    }

    const { credential } = verification.registrationInfo;
    const db = getDb();
    const session = await optionalUser(req);
    const now = Date.now();

    const existingUser = db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, record.userId))
      .get();

    if (!existingUser) {
      db.insert(users)
        .values({
          id: record.userId,
          emailHash: hashEmail(record.email),
          passwordHash: record.passwordHash ?? null,
          createdAt: now,
        })
        .run();
    } else if (!session || session.sub !== record.userId) {
      sendError(res, 400, GENERIC_PASSKEY_ERROR);
      return;
    }

    db.insert(webauthnCredentials)
      .values({
        id: randomUUID(),
        userId: record.userId,
        credentialId: credential.id,
        publicKey: publicKeyToStore(credential.publicKey),
        counter: credential.counter,
        createdAt: now,
      })
      .run();

    await issueSession(res, {
      userId: record.userId,
      email: record.email.includes("@") ? record.email : undefined,
    });
    res.json({ id: record.userId });
  } catch {
    sendError(res, 400, GENERIC_PASSKEY_ERROR);
  }
});

authRouter.post("/passkey/login/options", async (req, res) => {
  try {
    const db = getDb();
    const emailRaw =
      typeof req.body?.email === "string" ? req.body.email : "";
    let allowCredentialIds: string[] = [];
    let userId: string | undefined;

    if (emailRaw) {
      if (!isValidEmail(emailRaw)) {
        sendError(res, 400, GENERIC_AUTH_ERROR);
        return;
      }
      const user = db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.emailHash, hashEmail(emailRaw)))
        .get();
      if (user) {
        userId = user.id;
        allowCredentialIds = db
          .select({ credentialId: webauthnCredentials.credentialId })
          .from(webauthnCredentials)
          .where(eq(webauthnCredentials.userId, user.id))
          .all()
          .map((row) => row.credentialId);
      }
    }

    const options = await createAuthenticationOptions({ allowCredentialIds });
    const nonce = putChallenge({
      type: "authenticate",
      challenge: options.challenge,
      userId,
    });
    setWebAuthnCookie(res, nonce);
    res.json({ options });
  } catch {
    sendError(res, 500, GENERIC_AUTH_ERROR);
  }
});

authRouter.post("/passkey/login/verify", async (req, res) => {
  try {
    const nonce = cookie(req, WEBAUTHN_COOKIE);
    if (!nonce) {
      sendError(res, 401, GENERIC_AUTH_ERROR);
      return;
    }
    const record = takeChallenge(nonce);
    clearWebAuthnCookie(res);
    if (!record || record.type !== "authenticate") {
      sendError(res, 401, GENERIC_AUTH_ERROR);
      return;
    }

    const credentialId =
      typeof req.body?.id === "string" ? req.body.id : undefined;
    if (!credentialId) {
      sendError(res, 401, GENERIC_AUTH_ERROR);
      return;
    }

    const db = getDb();
    const stored = db
      .select()
      .from(webauthnCredentials)
      .where(eq(webauthnCredentials.credentialId, credentialId))
      .get();

    if (!stored || (record.userId && stored.userId !== record.userId)) {
      sendError(res, 401, GENERIC_AUTH_ERROR);
      return;
    }

    const verification = await checkAuthenticationResponse({
      response: req.body,
      challenge: record.challenge,
      credentialId: stored.credentialId,
      publicKey: publicKeyFromStore(stored.publicKey),
      counter: stored.counter,
    });

    if (!verification.verified) {
      sendError(res, 401, GENERIC_AUTH_ERROR);
      return;
    }

    db.update(webauthnCredentials)
      .set({ counter: verification.authenticationInfo.newCounter })
      .where(eq(webauthnCredentials.id, stored.id))
      .run();

    await issueSession(res, { userId: stored.userId });
    res.json({ id: stored.userId });
  } catch {
    sendError(res, 401, GENERIC_AUTH_ERROR);
  }
});
