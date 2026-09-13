import "./env.js";
import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { ensureDefaultUser, resetDb } from "../src/db/index.js";
import { startTestServer } from "./http.js";

const email = "user@example.com";
const password = "correct-horse";
const defaultEmail = "owner@foodpocalypse.local";
const defaultPassword = "correct-horse";

describe("auth HTTP", () => {
  const app = createApp();
  let server: Awaited<ReturnType<typeof startTestServer>>;

  before(async () => {
    server = await startTestServer(app);
  });

  after(async () => {
    await server.close();
  });

  beforeEach(() => {
    resetDb();
    server.jar.clear();
  });

  it("registers with Email and Password and exposes the User on /me", async () => {
    const created = await server.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(created.status, 201);
    assert.equal(server.jar.has("fp_access"), true);
    assert.equal(server.jar.has("fp_refresh"), true);

    const me = await server.request("/api/auth/me");
    assert.equal(me.status, 200);
    const body = (await me.json()) as { id: string; email?: string };
    assert.equal(body.email, email);
  });

  it("rejects register without a Password", async () => {
    const res = await server.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "" }),
    });
    assert.equal(res.status, 400);
  });

  it("logs in with Email and Password", async () => {
    await server.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    await server.request("/api/auth/logout", { method: "POST" });

    const res = await server.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(res.status, 200);
    const me = await server.request("/api/auth/me");
    assert.equal(me.status, 200);
  });

  it("does not distinguish unknown Email from a wrong Password", async () => {
    const unknown = await server.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nobody@example.com", password }),
    });
    await server.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    await server.request("/api/auth/logout", { method: "POST" });
    const wrong = await server.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "not-the-password" }),
    });
    assert.equal(unknown.status, 401);
    assert.equal(wrong.status, 401);
    assert.deepEqual(await unknown.json(), await wrong.json());
  });

  it("refreshes cookies then /me still works", async () => {
    await server.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const refresh = await server.request("/api/auth/refresh", { method: "POST" });
    assert.equal(refresh.status, 200);
    const me = await server.request("/api/auth/me");
    assert.equal(me.status, 200);
  });

  it("logout ends the session", async () => {
    await server.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const logout = await server.request("/api/auth/logout", { method: "POST" });
    assert.equal(logout.status, 204);
    const me = await server.request("/api/auth/me");
    assert.equal(me.status, 401);
  });

  it("logs in as the default User on an empty database without registering", async () => {
    await ensureDefaultUser();
    const res = await server.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: defaultEmail, password: defaultPassword }),
    });
    assert.equal(res.status, 200);
    const me = await server.request("/api/auth/me");
    assert.equal(me.status, 200);
    const body = (await me.json()) as { email?: string };
    assert.equal(body.email, defaultEmail);
  });

  it("does not add the default User when a User already exists", async () => {
    await server.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    await server.request("/api/auth/logout", { method: "POST" });
    await ensureDefaultUser();
    const res = await server.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: defaultEmail, password: defaultPassword }),
    });
    assert.equal(res.status, 401);
  });
});
