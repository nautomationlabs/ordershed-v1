/** Phone numbers are stored in E.164 (+919843021877). Indian mobiles may be typed without the country code. */
export function normalisePhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, '');
  if (/^\+[1-9]\d{7,14}$/.test(digits)) return digits;
  const bare = digits.replace(/^\+/, '');
  if (/^[6-9]\d{9}$/.test(bare)) return `+91${bare}`;
  if (/^0[6-9]\d{9}$/.test(bare)) return `+91${bare.slice(1)}`;
  if (/^91[6-9]\d{9}$/.test(bare)) return `+${bare}`;
  return null;
}

/** +91 98430 •••77 — enough for the person to recognise, not enough to copy. */
export function maskPhone(e164: string): string {
  return `${e164.slice(0, e164.length - 10)} ${e164.slice(-10, -5)} •••${e164.slice(-2)}`;
}

export function maskEmail(email: string): string {
  const [user = '', domain = ''] = email.split('@');
  return `${user.slice(0, 2)}•••@${domain}`;
}

/** WhatsApp Cloud API wants the number without the '+'. */
export const waId = (e164: string) => e164.replace(/^\+/, '');
