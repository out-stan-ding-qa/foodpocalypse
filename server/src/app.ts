import path from "node:path";
import express from "express";
import cookieParser from "cookie-parser";
import { config, serverDir } from "./config.js";
import { initDb } from "./db/index.js";
import { authRouter } from "./routes/auth.js";
import { appRouter } from "./routes/app.js";

export function createApp() {
  initDb();
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", false);
  app.use(express.json({ limit: "64kb" }));
  app.use(cookieParser());
  app.use("/api/auth", authRouter);
  app.use("/api", appRouter);
  // Ahead of the SPA fallback below, so an unmatched API path never answers with index.html.
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });
  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      if (!err) {
        next();
        return;
      }
      res.status(400).json({ error: "Bad request" });
    },
  );

  if (config.isProd) {
    const dist = path.resolve(serverDir, "../client/dist");
    app.use(express.static(dist));
    app.get("/{*splat}", (_req, res) => {
      res.sendFile(path.join(dist, "index.html"));
    });
  }

  return app;
}
