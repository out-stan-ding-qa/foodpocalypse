import { jwtVerify, SignJWT } from "jose";
import { config } from "../config.js";

const secret = new TextEncoder().encode(config.jwtSecret);

export type AccessClaims = {
  sub: string;
  email?: string;
  typ: "access";
};

export type RefreshClaims = {
  sub: string;
  email?: string;
  typ: "refresh";
};

export async function signAccessToken(input: {
  userId: string;
  email?: string;
}): Promise<string> {
  return new SignJWT({
    typ: "access",
    ...(input.email ? { email: input.email } : {}),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(input.userId)
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secret);
}

export async function signRefreshToken(input: {
  userId: string;
  email?: string;
}): Promise<string> {
  return new SignJWT({
    typ: "refresh",
    ...(input.email ? { email: input.email } : {}),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(input.userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<AccessClaims> {
  const { payload } = await jwtVerify(token, secret);
  if (payload.typ !== "access" || typeof payload.sub !== "string") {
    throw new Error("Invalid access token");
  }
  return {
    sub: payload.sub,
    typ: "access",
    email: typeof payload.email === "string" ? payload.email : undefined,
  };
}

export async function verifyRefreshToken(token: string): Promise<RefreshClaims> {
  const { payload } = await jwtVerify(token, secret);
  if (payload.typ !== "refresh" || typeof payload.sub !== "string") {
    throw new Error("Invalid refresh token");
  }
  return {
    sub: payload.sub,
    typ: "refresh",
    email: typeof payload.email === "string" ? payload.email : undefined,
  };
}
