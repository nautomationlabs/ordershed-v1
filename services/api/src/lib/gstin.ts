/**
 * GSTIN: 2-digit state code, 10-character PAN, entity number, 'Z', check character.
 * The check character is a mod-36 checksum over the first 14 characters (alternate weights 1 and 2).
 * Checking it locally catches typos before we pay for a provider lookup.
 */
const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export function normaliseGstin(input: string): string {
  return input.replace(/\s+/g, '').toUpperCase();
}

export function gstinCheckChar(first14: string): string {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const product = CHARS.indexOf(first14[i]!) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return CHARS[(36 - (sum % 36)) % 36]!;
}

export function isValidGstin(gstin: string): boolean {
  return PATTERN.test(gstin) && gstinCheckChar(gstin.slice(0, 14)) === gstin[14];
}

/** The PAN embedded in a GSTIN (characters 3–12). */
export const panOf = (gstin: string) => gstin.slice(2, 12);
