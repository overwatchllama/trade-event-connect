/**
 * Validation for the printed "card number" found at the bottom of a TCG card.
 *
 * Accepted formats (case-insensitive, surrounding whitespace ignored):
 *   - "25"          → numeric only
 *   - "25/102"      → numeric / set total
 *   - "025"         → leading zeros allowed (Pokémon prints these)
 *   - "TG01"        → alphanumeric prefixes (trainer gallery, promos, etc.)
 *   - "SWSH284"     → promo style
 *   - "TG01/TG30"   → alphanumeric with total
 *   - "SV-P 001"    → some promos use a space; we accept it as part of the prefix
 *
 * Rejected:
 *   - empty string after trim
 *   - more than one "/"
 *   - characters other than letters, digits, "-", " " (and a single "/")
 *   - missing left side ("/102")
 *   - missing right side ("25/")
 */

export type CardNumberValidation =
  | { ok: true; normalized: string; left: string; total: string | null }
  | { ok: false; error: string };

// Allow letters, digits, hyphen and single internal space in either side.
const SIDE = /^[A-Za-z0-9][A-Za-z0-9\- ]*$/;

export function validateCardNumber(raw: string): CardNumberValidation {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: 'Enter a card number (e.g. 25 or 25/102).' };
  }

  if ((trimmed.match(/\//g) ?? []).length > 1) {
    return {
      ok: false,
      error: 'Use only one "/" — like 25/102.',
    };
  }

  const [leftRaw, rightRaw] = trimmed.split('/');
  const left = (leftRaw ?? '').trim();
  const right = rightRaw === undefined ? null : rightRaw.trim();

  if (!left) {
    return { ok: false, error: 'Card number is missing — try something like 25/102.' };
  }
  if (!SIDE.test(left)) {
    return {
      ok: false,
      error: 'Card number can only contain letters, digits, and hyphens.',
    };
  }
  if (right !== null) {
    if (!right) {
      return { ok: false, error: 'Set total is missing after "/" — like 25/102.' };
    }
    if (!SIDE.test(right)) {
      return {
        ok: false,
        error: 'Set total can only contain letters, digits, and hyphens.',
      };
    }
  }

  return {
    ok: true,
    normalized: right ? `${left}/${right}` : left,
    left,
    total: right,
  };
}
