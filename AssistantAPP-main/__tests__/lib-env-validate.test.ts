/**
 * @jest-environment node
 */
import { describe, it, expect } from '@jest/globals'
import { validateEnv } from '@/lib/env-validate'

function envFor(extra: Record<string, string>): Record<string, string | undefined> {
  return { NODE_ENV: 'production', VERCEL_ENV: 'production', ...extra }
}

describe('lib/env-validate · validateEnv', () => {
  it('detects production and surfaces missing NEXTAUTH_SECRET + CRON_SECRET as errors', () => {
    const report = validateEnv(envFor({}))
    expect(report.environment).toBe('production')
    const errorKeys = report.errors.map((e) => e.key)
    expect(errorKeys).toContain('NEXTAUTH_SECRET')
    expect(errorKeys).toContain('CRON_SECRET')
  })

  it('downgrades production errors to warnings in dev', () => {
    const report = validateEnv({ NODE_ENV: 'development' })
    expect(report.environment).toBe('development')
    expect(report.errors).toHaveLength(0)
    const warnKeys = report.warnings.map((w) => w.key)
    expect(warnKeys).toContain('NEXTAUTH_SECRET')
    expect(warnKeys).toContain('CRON_SECRET')
  })

  it('is silent on a fully-configured production env', () => {
    const report = validateEnv(
      envFor({
        NEXTAUTH_SECRET: 's',
        NEXTAUTH_URL: 'https://lvj.app',
        CRON_SECRET: 'c',
        DATABASE_URL: 'postgres://…',
        DIRECT_URL: 'postgres://…',
        GITHUB_TOKEN: 't',
        GITHUB_REPOSITORY: 'acme/repo',
      }),
    )
    expect(report.errors).toHaveLength(0)
    expect(report.warnings).toHaveLength(0)
  })

  it('warns when CSRF_MODE=enforce but NEXT_PUBLIC_APP_URL is unset', () => {
    const report = validateEnv(envFor({ NEXTAUTH_SECRET: 's', CRON_SECRET: 'c', CSRF_MODE: 'enforce' }))
    const warnKeys = report.warnings.map((w) => w.key)
    expect(warnKeys).toContain('CSRF_MODE')
  })

  it('does not warn on CSRF_MODE=off or report-only', () => {
    for (const mode of ['off', 'report-only', 'report_only']) {
      const report = validateEnv(
        envFor({ NEXTAUTH_SECRET: 's', CRON_SECRET: 'c', CSRF_MODE: mode }),
      )
      expect(report.warnings.map((w) => w.key)).not.toContain('CSRF_MODE')
    }
  })

  it('warns when RATE_LIMIT_MODE=enforce without Upstash', () => {
    const report = validateEnv(
      envFor({ NEXTAUTH_SECRET: 's', CRON_SECRET: 'c', RATE_LIMIT_MODE: 'enforce' }),
    )
    expect(report.warnings.map((w) => w.key)).toContain('RATE_LIMIT_MODE')
  })

  it('does NOT warn on RATE_LIMIT_MODE=enforce with Upstash configured', () => {
    const report = validateEnv(
      envFor({
        NEXTAUTH_SECRET: 's',
        CRON_SECRET: 'c',
        RATE_LIMIT_MODE: 'enforce',
        UPSTASH_REDIS_REST_URL: 'https://…',
        UPSTASH_REDIS_REST_TOKEN: 't',
      }),
    )
    expect(report.warnings.map((w) => w.key)).not.toContain('RATE_LIMIT_MODE')
  })

  it('warns when GITHUB_TOKEN is unset (issue-opener runs in log-only mode)', () => {
    const report = validateEnv(envFor({ NEXTAUTH_SECRET: 's', CRON_SECRET: 'c' }))
    expect(report.warnings.map((w) => w.key)).toContain('GITHUB_TOKEN')
  })

  it('warns when GITHUB_TOKEN is set but no repo slug is configured', () => {
    const report = validateEnv(
      envFor({ NEXTAUTH_SECRET: 's', CRON_SECRET: 'c', GITHUB_TOKEN: 't' }),
    )
    expect(report.warnings.map((w) => w.key)).toContain('GITHUB_REPOSITORY')
  })

  it('prefers VERCEL_ENV over NODE_ENV for environment detection (preview)', () => {
    const report = validateEnv({ VERCEL_ENV: 'preview', NODE_ENV: 'production' })
    expect(report.environment).toBe('preview')
    expect(report.errors).toHaveLength(0)
  })
})
