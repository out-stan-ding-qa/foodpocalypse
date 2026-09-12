import { signAccessToken, signRefreshToken } from "./jwt.js";
import { setAuthCookies } from "./cookies.js";
import type { Response } from "express";

export async function issueSession(
  res: Response,
  input: { userId: string; email?: string },
): Promise<void> {
  const [access, refresh] = await Promise.all([
    signAccessToken(input),
    signRefreshToken(input),
  ]);
  setAuthCookies(res, { access, refresh });
}
