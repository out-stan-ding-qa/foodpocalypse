const GTIN_LENGTHS = new Set([8, 12, 13, 14]);

function checkDigit(body: string): number {
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    const digit = Number(body[body.length - 1 - i]);
    sum += i % 2 === 0 ? digit * 3 : digit;
  }
  return (10 - (sum % 10)) % 10;
}

function hasValidCheckDigit(digits: string): boolean {
  const body = digits.slice(0, -1);
  const actual = Number(digits.slice(-1));
  return checkDigit(body) === actual;
}

function isRestrictedCirculation(digits: string): boolean {
  if (digits.length === 14) {
    return isRestrictedCirculation(digits.slice(1));
  }
  if (digits.length === 13 && digits.startsWith("0")) {
    return isRestrictedCirculation(digits.slice(1));
  }
  if (digits.length === 13) {
    const prefix = Number(digits.slice(0, 2));
    return prefix >= 20 && prefix <= 29;
  }
  if (digits.length === 12) {
    const numberSystem = digits[0];
    return numberSystem === "2" || numberSystem === "4" || numberSystem === "5";
  }
  return false;
}

export function parseUpc(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  const candidates = digits.length === 11 ? [`0${digits}`] : [digits];
  for (const code of candidates) {
    if (!GTIN_LENGTHS.has(code.length)) {
      continue;
    }
    if (/^0+$/.test(code)) {
      continue;
    }
    if (!hasValidCheckDigit(code)) {
      continue;
    }
    if (isRestrictedCirculation(code)) {
      continue;
    }
    return code;
  }
  return null;
}
