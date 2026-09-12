import type { CookieOptions, Response } from "express";
import { config } from "../config.js";

export const ACCESS_COOKIE = "fp_access";
export const REFRESH_COOKIE = "fp_refresh";

function baseCookie(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "strict",
    secure: config.isProd,
    path: "/",
  };
}

export function setAuthCookies(
  res: Response,
  tokens: { access: string; refresh: string },
): void {
  res.cookie(ACCESS_COOKIE, tokens.access, {
    ...baseCookie(),
    maxAge: 15 * 60 * 1000,
  });
  res.cookie(REFRESH_COOKIE, tokens.refresh, {
    ...baseCookie(),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, baseCookie());
  res.clearCookie(REFRESH_COOKIE, baseCookie());
}
