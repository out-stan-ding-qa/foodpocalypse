import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const DEPRECATIONS_URL =
  "https://ai.google.dev/gemini-api/docs/deprecations?hl=en";
export const WARN_DAYS = 60;
export const FAIL_DAYS = 14;

const GEMINI_MODELS_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";
const USER_AGENT =
  "Mozilla/5.0 (compatible; FoodpocalypseModelCheck/1.0; +https://github.com/out-stan-ding-qa/foodpocalypse)";
const FETCH_HEADERS = {
  "user-agent": USER_AGENT,
  accept: "text/html,application/xhtml+xml",
  "accept-language": "en",
};

export function parsePrAgentModels(toml) {
  const model = toml.match(/^\s*model\s*=\s*"([^"]+)"/m)?.[1];
  if (!model) {
    throw new Error("No model = \"...\" found in .pr_agent.toml");
  }
  const fallbackBlock =
    toml.match(/^\s*fallback_models\s*=\s*\[([\s\S]*?)\]/m)?.[1] ?? "";
  const fallbacks = [...fallbackBlock.matchAll(/"([^"]+)"/g)].map(
    (match) => match[1],
  );
  return { model, fallbacks };
}

export function toGeminiApiId(litellmId) {
  if (litellmId.startsWith("gemini/")) {
    return litellmId.slice("gemini/".length);
  }
  return null;
}

export function parseEnglishDate(text, now = new Date()) {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed || /no shutdown date/i.test(trimmed)) {
    return null;
  }
  const parsed = Date.parse(`${trimmed} UTC`);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return new Date(parsed);
}

function stripTags(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseGaFlashVersion(modelId) {
  const match = /^gemini-(\d+)(?:\.(\d+))?-flash$/.exec(modelId);
  if (!match) {
    return null;
  }
  return { major: Number(match[1]), minor: Number(match[2] ?? 0) };
}

function compareFlashVersion(a, b) {
  return a.major - b.major || a.minor - b.minor;
}

export function parseDeprecationsHtml(html) {
  const rows = [...html.matchAll(/<tr([^>]*)>([\s\S]*?)<\/tr>/gi)];
  const byId = new Map();

  for (const [, attrs, body] of rows) {
    const cells = [...body.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(
      (match) => stripTags(match[1]),
    );
    if (cells.length < 3) {
      continue;
    }
    const id = cells[0];
    if (!/^gemini-[\w.-]+$/.test(id)) {
      continue;
    }
    const alreadyShutdown = /\brow-gray\b/.test(attrs);
    const replacement = cells[3]?.match(/gemini-[\w.-]+/)?.[0] ?? null;
    byId.set(id, {
      id,
      shutdownDate: parseEnglishDate(cells[2]),
      alreadyShutdown,
      replacement,
    });
  }

  return byId;
}

function daysUntil(date, today) {
  const start = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  const end = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  return Math.round((end - start) / 86_400_000);
}

export function newestGaFlash(deprecations) {
  let newest = null;
  for (const entry of deprecations.values()) {
    if (entry.alreadyShutdown) {
      continue;
    }
    if (entry.shutdownDate) {
      continue;
    }
    const version = parseGaFlashVersion(entry.id);
    if (!version) {
      continue;
    }
    if (!newest || compareFlashVersion(version, newest.version) > 0) {
      newest = { id: entry.id, version };
    }
  }
  return newest;
}

export function evaluateConfiguredModels({
  configured,
  deprecations,
  liveIds,
  today,
  warnDays = WARN_DAYS,
  failDays = FAIL_DAYS,
}) {
  const findings = [];
  const newest = newestGaFlash(deprecations);

  configured.forEach((litellmId, index) => {
    const role = index === 0 ? "primary" : "fallback";
    const geminiId = toGeminiApiId(litellmId);
    if (!geminiId) {
      findings.push({
        level: "warn",
        message: `${role} ${litellmId} is not a Gemini model; skipped Google deprecation checks.`,
      });
      return;
    }

    if (liveIds && !liveIds.has(geminiId)) {
      findings.push({
        level: "fail",
        message: `${role} ${geminiId} is not served by the Gemini API (removed, renamed, or typo).`,
      });
    }

    const entry = deprecations.get(geminiId);
    if (!entry) {
      findings.push({
        level: "warn",
        message: `${role} ${geminiId} is not on Google's deprecations page; confirm the model ID.`,
      });
    } else if (entry.alreadyShutdown) {
      const replacement = entry.replacement
        ? ` Recommended replacement: ${entry.replacement}.`
        : "";
      findings.push({
        level: "fail",
        message: `${role} ${geminiId} is already shut down.${replacement}`,
      });
    } else if (entry.shutdownDate) {
      const days = daysUntil(entry.shutdownDate, today);
      const replacement = entry.replacement
        ? ` Recommended replacement: ${entry.replacement}.`
        : "";
      if (days <= 0) {
        findings.push({
          level: "fail",
          message: `${role} ${geminiId} shutdown date ${entry.shutdownDate.toISOString().slice(0, 10)} has passed.${replacement}`,
        });
      } else if (days <= failDays) {
        findings.push({
          level: "fail",
          message: `${role} ${geminiId} shuts down in ${days} day(s) (${entry.shutdownDate.toISOString().slice(0, 10)}).${replacement}`,
        });
      } else if (days <= warnDays) {
        findings.push({
          level: "warn",
          message: `${role} ${geminiId} shuts down in ${days} day(s) (${entry.shutdownDate.toISOString().slice(0, 10)}).${replacement}`,
        });
      }
    }

    if (role === "primary" && newest) {
      const current = parseGaFlashVersion(geminiId);
      if (current && compareFlashVersion(current, newest.version) < 0) {
        findings.push({
          level: "warn",
          message: `${role} ${geminiId} is behind current GA Flash ${newest.id}.`,
        });
      }
    }
  });

  return findings;
}

export function assertEnglishDeprecationsPage(html) {
  if (/x-mtfrom-en/i.test(html)) {
    throw new Error(
      "Deprecations page was auto-translated; refetch with hl=en.",
    );
  }
}

async function fetchDeprecationsHtml() {
  const response = await fetch(DEPRECATIONS_URL, {
    headers: FETCH_HEADERS,
  });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch deprecations page: HTTP ${response.status}`,
    );
  }
  const html = await response.text();
  assertEnglishDeprecationsPage(html);
  return html;
}

async function listLiveGeminiIds(apiKey) {
  const ids = new Set();
  let pageToken = "";

  do {
    const url = new URL(GEMINI_MODELS_URL);
    url.searchParams.set("pageSize", "1000");
    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }
    const response = await fetch(url, {
      headers: { "x-goog-api-key": apiKey, "user-agent": USER_AGENT },
    });
    const body = await response.json();
    if (!response.ok) {
      throw new Error(
        `Gemini models.list failed: HTTP ${response.status} ${body.error?.message ?? ""}`.trim(),
      );
    }
    for (const model of body.models ?? []) {
      const name = String(model.name ?? "").replace(/^models\//, "");
      if (name) {
        ids.add(name);
      }
    }
    pageToken = body.nextPageToken ?? "";
  } while (pageToken);

  return ids;
}

function printFindings(findings) {
  if (findings.length === 0) {
    console.log("OK: configured PR-Agent Gemini models are current.");
    return;
  }
  for (const finding of findings) {
    const prefix = finding.level === "fail" ? "error" : "warning";
    console.log(`::${prefix}::${finding.message}`);
    console.log(`[${finding.level.toUpperCase()}] ${finding.message}`);
  }
}

export async function checkPrAgentModels({
  toml,
  html,
  liveIds,
  today = new Date(),
} = {}) {
  const { model, fallbacks } = parsePrAgentModels(toml);
  const deprecations = parseDeprecationsHtml(html);
  if (deprecations.size === 0) {
    throw new Error(
      "Parsed 0 models from the deprecations page; the HTML layout may have changed.",
    );
  }
  return evaluateConfiguredModels({
    configured: [model, ...fallbacks],
    deprecations,
    liveIds,
    today,
  });
}

async function main() {
  const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
  const toml = await readFile(resolve(root, ".pr_agent.toml"), "utf8");
  const html = await fetchDeprecationsHtml();
  const apiKey = process.env.GEMINI_API_KEY;
  let liveIds = null;

  if (!apiKey) {
    const message =
      "GEMINI_API_KEY is unset; skipping live Gemini API availability check.";
    if (process.env.REQUIRE_LIVE === "1") {
      throw new Error(message);
    }
    console.log(`::warning::${message}`);
    console.log(`[WARN] ${message}`);
  } else {
    liveIds = await listLiveGeminiIds(apiKey);
  }

  const findings = await checkPrAgentModels({
    toml,
    html,
    liveIds,
    today: new Date(),
  });
  printFindings(findings);
  if (findings.some((finding) => finding.level === "fail")) {
    process.exitCode = 1;
  }
}

const invoked = process.argv[1] && resolve(process.argv[1]);
const thisFile = resolve(fileURLToPath(import.meta.url));
if (invoked && thisFile === invoked) {
  main().catch((error) => {
    console.error(error.message ?? error);
    process.exitCode = 1;
  });
}
