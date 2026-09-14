import "./env.js";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { appRouter } from "../src/routes/app.js";

// Express does not type `Router.stack`; this is the shape the test reads off it.
type RouteLayer = { route?: { path: string; methods: Record<string, boolean> } };

// The API surface, in mount order. Adding a route here is how a new endpoint
// gets reviewed; removing one is how a retired endpoint stays retired.
// Mirrors the "HTTP API (app)" table in docs/backend-design.md.
const EXPECTED_ROUTES = [
  "POST /products/upc-lookup",
  "GET /products",
  "POST /products",
  "GET /products/:id",
  "PATCH /products/:id",
  "POST /products/:id/stores",
  "POST /products/:id/ratings",
  "GET /stores",
  "POST /stores",
  "PATCH /stores/:id",
  "DELETE /stores/:id",
  "GET /diet-profiles",
  "POST /diet-profiles",
  "PATCH /diet-profiles/:id",
  "POST /diet-profiles/:id/nutrients",
  "DELETE /diet-profiles/:id/nutrients/:nutrient",
  "GET /shopping",
  "POST /shopping/items",
  "PATCH /shopping/items/:id",
  "POST /shopping/archive",
  "GET /shopping/history",
];

describe("API surface", () => {
  it("mounts exactly the routes this app means to expose", () => {
    const { stack } = appRouter as unknown as { stack: RouteLayer[] };
    const mounted = stack
      .filter((layer): layer is Required<RouteLayer> => Boolean(layer.route))
      .map((layer) => {
        const methods = Object.keys(layer.route.methods).join("|").toUpperCase();
        return `${methods} ${layer.route.path}`;
      });

    assert.deepEqual(mounted, EXPECTED_ROUTES);
  });
});
