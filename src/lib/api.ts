/**
 * Returns the full URL for an API endpoint.
 *
 * On the website (Vercel), NEXT_PUBLIC_API_BASE is unset so paths stay
 * relative (e.g. "/api/fuel-prices").
 *
 * In the Capacitor app (local static bundle), NEXT_PUBLIC_API_BASE is set
 * to "https://getcheapfuel.co.uk" so API calls hit the live server.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? '';

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
