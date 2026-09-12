export function normalizeUpc(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 14) {
    return null;
  }
  return digits;
}

export function extractUpcFromText(text: string): string | null {
  const matches = text.match(/\b\d{8,14}\b/g);
  if (!matches) {
    return null;
  }
  return normalizeUpc(matches[0]);
}

const NUTRIENT_PATTERNS: Array<[string, RegExp]> = [
  ["calories", /(?:energy|calories)[:\s]+(\d+(?:\.\d+)?)/i],
  ["fat", /(?:total\s+)?fat[:\s]+(\d+(?:\.\d+)?)\s*g/i],
  ["carbs", /carbohydrate[s]?[:\s]+(\d+(?:\.\d+)?)\s*g/i],
  ["fiber", /(?:dietary\s+)?fiber[:\s]+(\d+(?:\.\d+)?)\s*g/i],
  ["sugar", /sugars?[:\s]+(\d+(?:\.\d+)?)\s*g/i],
  ["protein", /protein[:\s]+(\d+(?:\.\d+)?)\s*g/i],
  ["sodium", /sodium[:\s]+(\d+(?:\.\d+)?)\s*m?g/i],
  ["iron", /iron[:\s]+(\d+(?:\.\d+)?)/i],
  ["calcium", /calcium[:\s]+(\d+(?:\.\d+)?)/i],
  ["vitaminB12", /(?:vitamin\s*b-?12|b12)[:\s]+(\d+(?:\.\d+)?)/i],
];

export function parseNutritionFromText(
  text: string,
): Record<string, number | string | null> {
  const nutrition: Record<string, number | string> = {};
  for (const [key, pattern] of NUTRIENT_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) {
      nutrition[key] = Number(match[1]);
    }
  }
  return nutrition;
}

export function hasMeaningfulNutrition(
  nutrition: Record<string, unknown>,
): boolean {
  return Object.values(nutrition).some(
    (value) => value !== null && value !== undefined && value !== "",
  );
}

export function guessProductNameFromText(text: string): string | null {
  const skip =
    /nutrition|facts|serving|calories|ingredients|barcode|net wt|best before/i;
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length < 3 || trimmed.length > 80) {
      continue;
    }
    if (skip.test(trimmed) || /^\d/.test(trimmed)) {
      continue;
    }
    return trimmed;
  }
  return null;
}
