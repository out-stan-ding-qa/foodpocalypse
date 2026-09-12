import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { config } from "../config.js";

export function expectedOrigins(): string[] {
  const origin = config.webauthnOrigin;
  const origins = new Set([origin]);
  if (origin.includes("localhost")) {
    origins.add(origin.replace("localhost", "127.0.0.1"));
  }
  if (origin.includes("127.0.0.1")) {
    origins.add(origin.replace("127.0.0.1", "localhost"));
  }
  return [...origins];
}

export function publicKeyToStore(publicKey: Uint8Array): string {
  return isoBase64URL.fromBuffer(publicKey as never);
}

export function publicKeyFromStore(stored: string): Uint8Array {
  return isoBase64URL.toBuffer(stored);
}

export async function createRegistrationOptions(input: {
  userId: string;
  email: string;
  excludeCredentialIds: string[];
}) {
  return generateRegistrationOptions({
    rpName: config.webauthnRpName,
    rpID: config.webauthnRpId,
    userName: input.email,
    userID: new TextEncoder().encode(input.userId),
    attestationType: "none",
    excludeCredentials: input.excludeCredentialIds.map((id) => ({ id })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });
}

export async function checkRegistrationResponse(input: {
  response: RegistrationResponseJSON;
  challenge: string;
}) {
  return verifyRegistrationResponse({
    response: input.response,
    expectedChallenge: input.challenge,
    expectedOrigin: expectedOrigins(),
    expectedRPID: config.webauthnRpId,
    requireUserVerification: false,
  });
}

export async function createAuthenticationOptions(input: {
  allowCredentialIds: string[];
}) {
  return generateAuthenticationOptions({
    rpID: config.webauthnRpId,
    userVerification: "preferred",
    allowCredentials: input.allowCredentialIds.map((id) => ({ id })),
  });
}

export async function checkAuthenticationResponse(input: {
  response: AuthenticationResponseJSON;
  challenge: string;
  credentialId: string;
  publicKey: Uint8Array;
  counter: number;
}) {
  return verifyAuthenticationResponse({
    response: input.response,
    expectedChallenge: input.challenge,
    expectedOrigin: expectedOrigins(),
    expectedRPID: config.webauthnRpId,
    requireUserVerification: false,
    credential: {
      id: input.credentialId,
      publicKey: input.publicKey as never,
      counter: input.counter,
    },
  });
}
