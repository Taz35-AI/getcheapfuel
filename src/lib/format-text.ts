// UK postcode parts:
// Outward: 1-2 letters + 1 digit + optional letter/digit (e.g. "UB3", "SW1V")
// Inward: 1 digit + 2 letters (e.g. "1LL", "5EL")
const POSTCODE_OUTER = /^[A-Z]{1,2}\d[A-Z\d]?$/i;
const POSTCODE_INNER = /^\d[A-Z]{2}$/i;

/**
 * Convert ALL-CAPS or mixed-case addresses to Title Case while keeping
 * UK postcodes fully uppercase.
 *
 *   "SHEPISTON LANE, HAYES, UB3 1LL"  →  "Shepiston Lane, Hayes, UB3 1LL"
 *   "QUEENS HEAD FILLING STATION"     →  "Queens Head Filling Station"
 */
export function toTitleCase(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .split(/(\s+|,|\/)/) // keep delimiters
    .map((token) => {
      if (!token.trim()) return token;
      if (POSTCODE_OUTER.test(token) || POSTCODE_INNER.test(token)) {
        return token.toUpperCase();
      }
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    })
    .join('');
}
