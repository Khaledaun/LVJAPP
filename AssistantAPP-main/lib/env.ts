// Centralized, type-safe env access with graceful fallbacks

export const isProd = process.env.NODE_ENV === 'production'

function get(k: string, fallback?: string) {
  const v = process.env[k]
  if (!v && typeof window === 'undefined') {
    // Only warn on server to avoid client noise
    console.warn(`[env] Missing ${k}${fallback ? ` (using fallback)` : ''}`)
  }
  return v ?? fallback ?? ''
}

export const ENV = {
  NEXTAUTH_URL: get('NEXTAUTH_URL', process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'),
  NEXTAUTH_SECRET: get('NEXTAUTH_SECRET', isProd ? '' : 'dev-secret-do-not-use-in-prod'),
  PUBLIC_BASE_URL: get('PUBLIC_BASE_URL', 'http://localhost:3000'),
  // Bearer token for `/api/cron/*` handlers (see lib/cron.ts).
  // Required in production; in dev `SKIP_AUTH=1` / `SKIP_DB=1` bypasses
  // the check.
  CRON_SECRET: get('CRON_SECRET', isProd ? '' : ''),
}
