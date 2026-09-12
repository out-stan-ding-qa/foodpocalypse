import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";

export type Me = { id: string; email?: string };

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error || "Request failed";
  } catch {
    return "Request failed";
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(path, {
    ...options,
    credentials: "include",
    headers,
  });

  if (res.status === 401 && retry && path !== "/api/auth/refresh") {
    const refreshed = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    if (refreshed.ok) {
      return api<T>(path, options, false);
    }
  }

  if (res.status === 204) {
    return undefined as T;
  }

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  return (await res.json()) as T;
}

export function getMe(): Promise<Me> {
  return api<Me>("/api/auth/me", { method: "GET" });
}

export function register(email: string, password: string) {
  return api<{ id: string }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function login(email: string, password: string) {
  return api<{ id: string }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function logout() {
  return api<void>("/api/auth/logout", { method: "POST" });
}

export function passkeyRegisterOptions(body: {
  email?: string;
  password?: string;
}) {
  return api<{ options: PublicKeyCredentialCreationOptionsJSON }>(
    "/api/auth/passkey/register/options",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

export function passkeyRegisterVerify(credential: unknown) {
  return api<{ id: string }>("/api/auth/passkey/register/verify", {
    method: "POST",
    body: JSON.stringify(credential),
  });
}

export function passkeyLoginOptions(email?: string) {
  return api<{ options: PublicKeyCredentialRequestOptionsJSON }>(
    "/api/auth/passkey/login/options",
    {
      method: "POST",
      body: JSON.stringify(email ? { email } : {}),
    },
  );
}

export function passkeyLoginVerify(credential: unknown) {
  return api<{ id: string }>("/api/auth/passkey/login/verify", {
    method: "POST",
    body: JSON.stringify(credential),
  });
}
