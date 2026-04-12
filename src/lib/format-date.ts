/**
 * Parse a timestamp from any of the formats we receive (ISO 8601 from
 * Fuel Finder, or "DD/MM/YYYY HH:mm:ss") and render in UK style.
 *
 * Output: "10/04/2026, 18:43"
 */
export function formatUKDateTime(input: string | undefined | null): string {
  if (!input) return '';

  // Try ISO first
  let date = new Date(input);

  // "DD/MM/YYYY HH:mm:ss" format — JS Date parses this inconsistently across browsers
  if (isNaN(date.getTime())) {
    const m = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/);
    if (m) {
      const [, dd, mm, yyyy, hh, mi, ss] = m;
      date = new Date(
        parseInt(yyyy, 10),
        parseInt(mm, 10) - 1,
        parseInt(dd, 10),
        parseInt(hh, 10),
        parseInt(mi, 10),
        parseInt(ss, 10),
      );
    }
  }

  if (isNaN(date.getTime())) return input; // give up — show raw

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/London',
  }).format(date);
}
