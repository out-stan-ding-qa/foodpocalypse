import { createHmac } from "node:crypto";
import { config } from "../config.js";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

export function hashEmail(email: string): string {
  return createHmac("sha256", config.emailPepper)
    .update(normalizeEmail(email))
    .digest("hex");
}
