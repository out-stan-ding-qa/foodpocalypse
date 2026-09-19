import type { APIRequestContext } from "@playwright/test";
import { E2E_USER } from "./auth";

type TrafficLight = "green" | "yellow" | "red";

async function readError(res: { json: () => Promise<unknown> }): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error || "Request failed";
  } catch {
    return "Request failed";
  }
}

/** Register the e2e User, or log in if already registered (reuse / re-run). */
export async function ensureE2eUser(request: APIRequestContext): Promise<void> {
  const registered = await request.post("/api/auth/register", {
    data: { email: E2E_USER.email, password: E2E_USER.password },
  });
  if (registered.ok()) {
    return;
  }
  const loggedIn = await request.post("/api/auth/login", {
    data: { email: E2E_USER.email, password: E2E_USER.password },
  });
  if (!loggedIn.ok()) {
    throw new Error(
      `Could not register or sign in e2e User: ${await readError(loggedIn)}`,
    );
  }
}

export async function createProduct(
  request: APIRequestContext,
  body: { name: string; brand?: string } = { name: "E2E Yogurt" },
): Promise<{ id: string; name: string }> {
  const res = await request.post("/api/products", { data: body });
  if (!res.ok()) {
    throw new Error(`create Product failed: ${await readError(res)}`);
  }
  const json = (await res.json()) as { product: { id: string; name: string } };
  return json.product;
}

export async function createDietProfile(
  request: APIRequestContext,
  body: { name: string; nutrients?: string[] } = {
    name: "E2E Low sodium",
    nutrients: ["proteins"],
  },
): Promise<{ id: string; name: string }> {
  const res = await request.post("/api/diet-profiles", {
    data: {
      name: body.name,
      nutrients: body.nutrients ?? ["proteins"],
    },
  });
  if (!res.ok()) {
    throw new Error(`create Diet profile failed: ${await readError(res)}`);
  }
  const json = (await res.json()) as { dietProfile: { id: string; name: string } };
  return json.dietProfile;
}

export async function setProductRating(
  request: APIRequestContext,
  productId: string,
  dietProfileId: string,
  rating: TrafficLight | null,
): Promise<void> {
  const res = await request.post(`/api/products/${productId}/ratings`, {
    data: { dietProfileId, rating },
  });
  if (!res.ok()) {
    throw new Error(`set Rating failed: ${await readError(res)}`);
  }
}
