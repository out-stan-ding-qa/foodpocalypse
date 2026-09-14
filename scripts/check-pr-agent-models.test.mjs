import assert from "node:assert/strict";
import test from "node:test";
import {
  assertEnglishDeprecationsPage,
  evaluateConfiguredModels,
  parseDeprecationsHtml,
  parseEnglishDate,
  parseGaFlashVersion,
  parsePrAgentModels,
  toGeminiApiId,
} from "./check-pr-agent-models.mjs";

const SAMPLE_HTML = `
<table>
  <tr>
    <td><b>Model</b></td>
    <td><b>Release date</b></td>
    <td><b>Shutdown date</b></td>
    <td><b>Recommended replacement</b></td>
  </tr>
  <tr>
    <td><code>gemini-3.8-flash</code></td>
    <td>September 2, 2026</td>
    <td>No shutdown date announced</td>
    <td></td>
  </tr>
  <tr>
    <td><code>gemini-3.7-flash</code></td>
    <td>August 13, 2026</td>
    <td>No shutdown date announced</td>
    <td></td>
  </tr>
  <tr>
    <td><code>gemini-2.5-flash</code></td>
    <td>June 17, 2025</td>
    <td>No shutdown date announced</td>
    <td></td>
  </tr>
  <tr>
    <td><code>gemini-3.1-flash-lite</code></td>
    <td>May 7, 2026</td>
    <td>May 7, 2027</td>
    <td><code>gemini-3.5-flash-lite</code></td>
  </tr>
  <tr class="row-gray">
    <td><code>gemini-2.0-flash</code></td>
    <td>February 5, 2025</td>
    <td>June 1, 2026</td>
    <td><code>gemini-3.6-flash</code></td>
  </tr>
</table>
`;

test("parsePrAgentModels reads primary and fallbacks", () => {
  const parsed = parsePrAgentModels(`
[config]
model = "gemini/gemini-3.7-flash"
fallback_models = ["gemini/gemini-2.5-flash"]
`);
  assert.deepEqual(parsed, {
    model: "gemini/gemini-3.7-flash",
    fallbacks: ["gemini/gemini-2.5-flash"],
  });
});

test("toGeminiApiId strips the LiteLLM provider prefix", () => {
  assert.equal(toGeminiApiId("gemini/gemini-3.7-flash"), "gemini-3.7-flash");
  assert.equal(toGeminiApiId("anthropic/claude-3-haiku"), null);
});

test("parseDeprecationsHtml reads shutdown dates and gray rows", () => {
  const byId = parseDeprecationsHtml(SAMPLE_HTML);
  assert.equal(byId.get("gemini-3.7-flash").shutdownDate, null);
  assert.equal(byId.get("gemini-3.7-flash").alreadyShutdown, false);
  assert.equal(byId.get("gemini-2.0-flash").alreadyShutdown, true);
  assert.equal(
    byId.get("gemini-2.0-flash").replacement,
    "gemini-3.6-flash",
  );
  assert.equal(
    parseEnglishDate("May 7, 2027").toISOString().slice(0, 10),
    "2027-05-07",
  );
});

test("evaluate fails decommissioned and already-shut-down models", () => {
  const deprecations = parseDeprecationsHtml(SAMPLE_HTML);
  const today = new Date("2026-09-13T00:00:00Z");
  const findings = evaluateConfiguredModels({
    configured: ["gemini/gemini-2.0-flash", "gemini/missing-model"],
    deprecations,
    liveIds: new Set(["gemini-2.0-flash"]),
    today,
  });
  assert.ok(
    findings.some((finding) =>
      finding.level === "fail" &&
      finding.message.includes("already shut down"),
    ),
  );
  assert.ok(
    findings.some((finding) =>
      finding.level === "fail" &&
      finding.message.includes("not served"),
    ),
  );
});

test("evaluate warns when primary Flash is behind current GA", () => {
  const deprecations = parseDeprecationsHtml(SAMPLE_HTML);
  const findings = evaluateConfiguredModels({
    configured: ["gemini/gemini-3.7-flash", "gemini/gemini-2.5-flash"],
    deprecations,
    liveIds: new Set(["gemini-3.7-flash", "gemini-2.5-flash"]),
    today: new Date("2026-09-13T00:00:00Z"),
  });
  assert.equal(
    findings.filter((finding) => finding.level === "fail").length,
    0,
  );
  assert.ok(
    findings.some((finding) =>
      finding.message.includes("behind current GA Flash gemini-3.8-flash"),
    ),
  );
  assert.equal(
    findings.filter((finding) => finding.message.includes("fallback")).length,
    0,
  );
});

test("evaluate fails when shutdown is within the fail window", () => {
  const deprecations = parseDeprecationsHtml(SAMPLE_HTML);
  const findings = evaluateConfiguredModels({
    configured: ["gemini/gemini-3.1-flash-lite"],
    deprecations,
    liveIds: new Set(["gemini-3.1-flash-lite"]),
    today: new Date("2027-05-01T00:00:00Z"),
    failDays: 14,
  });
  assert.ok(
    findings.some(
      (finding) =>
        finding.level === "fail" && finding.message.includes("shuts down in"),
    ),
  );
});

test("parseGaFlashVersion ignores preview and lite IDs", () => {
  assert.deepEqual(parseGaFlashVersion("gemini-3.8-flash"), {
    major: 3,
    minor: 8,
  });
  assert.equal(parseGaFlashVersion("gemini-3.5-flash-lite"), null);
  assert.equal(parseGaFlashVersion("gemini-3-flash-preview"), null);
});

test("assertEnglishDeprecationsPage rejects auto-translated docs", () => {
  assert.throws(
    () =>
      assertEnglishDeprecationsPage(
        '<html lang="pt-BR-x-mtfrom-en">gemini-2.5-flash</html>',
      ),
    /auto-translated/,
  );
  assert.doesNotThrow(() =>
    assertEnglishDeprecationsPage('<html lang="en">gemini-2.5-flash</html>'),
  );
});
