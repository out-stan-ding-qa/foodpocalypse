import type { Request, Response } from "express";
import { ACCESS_COOKIE } from "./cookies.js";
import { verifyAccessToken, type AccessClaims } from "./jwt.js";

export function cookieValue(req: Request, name: string): string | undefined {
  const value = req.cookies?.[name];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export async function readAccessUser(
  req: Request,
): Promise<AccessClaims | undefined> {
  const token = cookieValue(req, ACCESS_COOKIE);
  if (!token) {
    return undefined;
  }
  try {
    return await verifyAccessToken(token);
  } catch {
    return undefined;
  }
}

export async function requireUser(
  req: Request,
  res: Response,
): Promise<AccessClaims | undefined> {
  const user = await readAccessUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return undefined;
  }
  return user;
}
