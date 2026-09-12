import http from "node:http";
import type { AddressInfo } from "node:net";
import type { Express } from "express";

export class CookieJar {
  private readonly values = new Map<string, string>();

  absorb(res: Response): void {
    for (const line of res.headers.getSetCookie()) {
      const pair = line.split(";", 1)[0] ?? "";
      const eq = pair.indexOf("=");
      if (eq < 0) {
        continue;
      }
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      const cleared = /Max-Age=0/i.test(line) || /Expires=Thu, 01 Jan 1970/i.test(line);
      if (!value || cleared) {
        this.values.delete(name);
      } else {
        this.values.set(name, value);
      }
    }
  }

  header(): string {
    return [...this.values.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
  }

  has(name: string): boolean {
    return this.values.has(name);
  }

  clear(): void {
    this.values.clear();
  }
}

export async function startTestServer(app: Express) {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const { port } = server.address() as AddressInfo;
  const jar = new CookieJar();

  async function request(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    const cookie = jar.header();
    if (cookie) {
      headers.set("Cookie", cookie);
    }
    const res = await fetch(`http://127.0.0.1:${port}${path}`, { ...init, headers });
    jar.absorb(res);
    return res;
  }

  return {
    request,
    jar,
    async close() {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    },
  };
}
