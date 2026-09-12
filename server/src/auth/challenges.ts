import { randomUUID } from "node:crypto";

const TTL_MS = 5 * 60 * 1000;

export type RegisterChallenge = {
  type: "register";
  challenge: string;
  userId: string;
  email: string;
  passwordHash?: string;
  blocked: boolean;
};

export type AuthenticateChallenge = {
  type: "authenticate";
  challenge: string;
  userId?: string;
};

export type ChallengeInput = RegisterChallenge | AuthenticateChallenge;
export type ChallengeRecord = ChallengeInput & { expiresAt: number };

const challenges = new Map<string, ChallengeRecord>();

function sweep(): void {
  const now = Date.now();
  for (const [key, record] of challenges) {
    if (record.expiresAt <= now) {
      challenges.delete(key);
    }
  }
}

export function putChallenge(record: ChallengeInput): string {
  sweep();
  const nonce = randomUUID();
  challenges.set(nonce, { ...record, expiresAt: Date.now() + TTL_MS });
  return nonce;
}

export function takeChallenge(nonce: string): ChallengeRecord | undefined {
  sweep();
  const record = challenges.get(nonce);
  if (!record) {
    return undefined;
  }
  challenges.delete(nonce);
  if (record.expiresAt <= Date.now()) {
    return undefined;
  }
  return record;
}
