import AppShell from '@/components/lvj/app-shell'
import { assertStaff } from '@/lib/rbac'
import { validateEnv, type EnvFinding } from '@/lib/env-validate'
import { csrfMode } from '@/lib/csrf'
import { rateLimitMode } from '@/lib/rate-limit'
import { isFeatureFlagEnabled, getManifest } from '@/lib/agents/invoke'
import { isSubscribed, listSubscribed } from '@/lib/agents/orchestrator'
import '@/lib/agents/register'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * /admin/status — staff-only deploy readiness dashboard.
 *
 * Read-only SSR page. Server-rendered because every field is cheap
 * to compute at request time and the page is a one-shot operator
 * check, not an interactive surface. Same data source as
 * `/api/status` (validateEnv + flag modes + agent state); this page
 * is the human-readable version.
 *
 * Never calls the DB — it's a synchronous snapshot of env + flags +
 * agent registry. Safe to render even when Postgres is down.
 */

const AGENT_IDS = ['intake', 'drafting', 'email'] as const

export default async function StatusPage() {
  await assertStaff()

  const env = validateEnv()
  const flags = {
    csrfMode: csrfMode(),
    rateLimitMode: rateLimitMode(),
  }
  const agents = AGENT_IDS.map((id) => {
    const manifest = getManifest(id)
    return {
      id,
      known: manifest !== undefined,
      featureFlag: manifest?.featureFlag ?? null,
      featureFlagEnabled: manifest ? isFeatureFlagEnabled(manifest.featureFlag) : false,
      subscribed: isSubscribed(id),
    }
  })
  const subscribed = listSubscribed()
  const gitSha =
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.SOURCE_COMMIT ??
    process.env.GIT_COMMIT ??
    null
  const ok = env.errors.length === 0

  return (
    <AppShell
      crumbs={['Administration', 'Deploy Status']}
      sidebar={{ user: { name: 'Laila Al-Jabari', role: 'Partner · Admin', initial: 'L' } }}
    >
      <main className="mx-auto max-w-4xl space-y-8 p-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Deploy status</h1>
          <p className="text-sm text-muted-foreground">
            Read-only snapshot of env, flag modes, and agent subscriptions. Mirrors{' '}
            <code className="text-xs">GET /api/status</code>.
          </p>
        </header>

        <section aria-labelledby="overall" className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <h2 id="overall" className="text-base font-medium">
              Overall
            </h2>
            <span
              className={
                'rounded-full px-3 py-1 text-xs font-medium ' +
                (ok ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900')
              }
            >
              {ok ? 'OK' : `FAIL · ${env.errors.length} error(s)`}
            </span>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted-foreground">Environment</dt>
            <dd className="font-mono">{env.environment}</dd>
            <dt className="text-muted-foreground">Git SHA</dt>
            <dd className="font-mono">{gitSha ?? '—'}</dd>
            <dt className="text-muted-foreground">CSRF mode</dt>
            <dd className="font-mono">{flags.csrfMode}</dd>
            <dt className="text-muted-foreground">Rate-limit mode</dt>
            <dd className="font-mono">{flags.rateLimitMode}</dd>
          </dl>
        </section>

        <FindingsSection title="Env errors" findings={env.errors} tone="error" />
        <FindingsSection title="Env warnings" findings={env.warnings} tone="warning" />

        <section aria-labelledby="agents" className="rounded-lg border p-4">
          <h2 id="agents" className="text-base font-medium">
            Phase-1 agents
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Flags default OFF. Flip a flag (`AGENT_*_ENABLED=1`) and{' '}
            <code className="text-xs">POST /api/agents/bootstrap</code> to bind.
          </p>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">Agent</th>
                <th className="py-2 pr-4">Feature flag</th>
                <th className="py-2 pr-4">Flag on?</th>
                <th className="py-2 pr-4">Subscribed?</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="py-2 pr-4 font-mono">{a.id}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{a.featureFlag ?? '—'}</td>
                  <td className="py-2 pr-4">{a.featureFlagEnabled ? 'yes' : 'no'}</td>
                  <td className="py-2 pr-4">{a.subscribed ? 'yes' : 'no'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted-foreground">
            {subscribed.length === 0
              ? 'No agents subscribed.'
              : `Subscribed: ${subscribed.join(', ')}.`}
          </p>
        </section>
      </main>
    </AppShell>
  )
}

function FindingsSection({
  title,
  findings,
  tone,
}: {
  title: string
  findings: EnvFinding[]
  tone: 'error' | 'warning'
}) {
  if (findings.length === 0) return null
  const toneClass =
    tone === 'error'
      ? 'border-red-200 bg-red-50'
      : 'border-amber-200 bg-amber-50'
  return (
    <section aria-labelledby={title.toLowerCase().replace(/\s+/g, '-')} className={`rounded-lg border p-4 ${toneClass}`}>
      <h2 id={title.toLowerCase().replace(/\s+/g, '-')} className="text-base font-medium">
        {title} ({findings.length})
      </h2>
      <ul className="mt-2 space-y-1 text-sm">
        {findings.map((f, i) => (
          <li key={`${f.key}-${i}`} className="flex items-start gap-2">
            <code className="shrink-0 rounded bg-white/60 px-2 py-0.5 text-xs">{f.key}</code>
            <span>{f.message}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
