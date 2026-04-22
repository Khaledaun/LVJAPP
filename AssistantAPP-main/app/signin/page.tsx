'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'

/**
 * Two-panel LVJ sign-in — left brand panel (ink ground, gold accents,
 * Arabic motto), right form panel (ivory ground, emerald focus state).
 *
 * Ports the LVJ Case Management design's SignIn artboard to real
 * NextAuth credentials + magic link + SSO flows. The dev-credentials
 * provider is kept (access code field becomes "Password") so the
 * existing SKIP_AUTH / DEV_LOGIN_CODE path still works.
 */
export default function SignInPage() {
  const [email, setEmail]   = useState('laila@lvj-visa.com')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [loading, setLoading]   = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function submitCredentials(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErr(null); setMsg(null)
    const res = await signIn('credentials', {
      email,
      password,
      redirect: true,
      callbackUrl: '/dashboard',
    })
    setLoading(false)
    if (res && !res.ok) setErr('Invalid credentials.')
  }

  async function sendMagicLink() {
    setLoading(true); setErr(null); setMsg(null)
    const res = await signIn('email', { email, redirect: false, callbackUrl: '/dashboard' })
    setLoading(false)
    if (res?.ok) {
      setMsg('Check your inbox for a sign-in link. If email is not configured, see server logs.')
    } else {
      setErr('Could not start email sign-in.')
    }
  }

  async function sso() {
    setLoading(true); setErr(null); setMsg(null)
    // Wired for Sprint 1 per CLAUDE.md — activated when the Google Workspace
    // provider is configured.
    const res = await signIn('google', { callbackUrl: '/dashboard' })
    setLoading(false)
    if (res && !res.ok) setErr('Single Sign-On is not configured yet.')
  }

  return (
    <main
      className="lvj"
      style={{
        display: 'grid',
        gridTemplateColumns: '1.1fr 1fr',
        minHeight: '100vh',
        background: 'var(--paper)',
      }}
    >
      {/* Brand panel */}
      <section
        aria-label="LVJ"
        style={{
          background: 'var(--ink)',
          color: 'var(--ivory)',
          padding: '60px 70px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at 75% 20%, rgba(184,152,90,.08), transparent 55%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative' }}>
          <div style={{ fontFamily: 'var(--lvj-serif)', fontSize: 24, letterSpacing: '.32em', paddingLeft: '.32em' }}>
            LVJ
          </div>
          <div style={{ fontSize: 10, letterSpacing: '.24em', textTransform: 'uppercase', color: 'var(--gold-soft)', marginTop: 10 }}>
            Case Management · Counsel Desk
          </div>
        </div>

        <div style={{ position: 'relative', marginTop: 'auto' }}>
          <div
            lang="ar"
            dir="rtl"
            style={{
              fontFamily: 'var(--lvj-arabic)',
              fontSize: 64,
              color: 'var(--ivory)',
              marginBottom: 34,
              opacity: .95,
              letterSpacing: '.02em',
            }}
          >
            الثقة قبل الكلام
          </div>
          <div style={{ width: 48, height: 1, background: 'var(--gold)', marginBottom: 22 }} />
          <h2
            style={{
              fontFamily: 'var(--lvj-serif)',
              fontWeight: 300,
              fontSize: 48,
              lineHeight: 1.1,
              letterSpacing: '-.01em',
              marginBottom: 20,
            }}
          >
            Quiet counsel,<br />
            <em style={{ color: 'var(--gold-soft)' }}>meticulous record.</em>
          </h2>
          <p
            style={{
              fontFamily: 'var(--lvj-serif)',
              fontStyle: 'italic',
              fontSize: 17,
              color: 'var(--stone-2)',
              lineHeight: 1.55,
              maxWidth: 440,
            }}
          >
            The LVJ practice runs on a single system of record. Every case, every document, every status change — on a traffic-light spine that everyone in the firm understands at a glance.
          </p>
        </div>

        <div
          style={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 10.5,
            letterSpacing: '.22em',
            textTransform: 'uppercase',
            color: 'var(--stone-3)',
          }}
        >
          <span>Version 2.4 · April 2026</span>
          <span style={{ color: 'var(--gold-soft)' }}>Confidential · Attorney–Client</span>
        </div>
      </section>

      {/* Form panel */}
      <section
        aria-label="Sign in"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 60,
        }}
      >
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div
            className="lvj-kicker"
            style={{
              fontSize: 10.5,
              letterSpacing: '.24em',
              textTransform: 'uppercase',
              color: 'var(--stone-3)',
              marginBottom: 18,
            }}
          >
            Sign in to your desk
          </div>
          <h1
            style={{
              fontFamily: 'var(--lvj-serif)',
              fontWeight: 300,
              fontSize: 38,
              marginBottom: 8,
              lineHeight: 1.05,
            }}
          >
            Welcome back.
          </h1>
          <p
            style={{
              fontFamily: 'var(--lvj-serif)',
              fontStyle: 'italic',
              fontSize: 15,
              color: 'var(--stone-4)',
              marginBottom: 40,
            }}
          >
            Access is governed by role — counsel, paralegal, partner.
          </p>

          <form onSubmit={submitCredentials} noValidate>
            <div className="lvj-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="lvj-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 30,
                fontSize: 11.5,
              }}
            >
              <label
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  color: 'var(--stone-4)',
                }}
              >
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                />
                Remember this device
              </label>
              <a
                href="/forgot"
                style={{
                  color: 'var(--emerald)',
                  letterSpacing: '.1em',
                  textTransform: 'uppercase',
                  fontSize: 10.5,
                }}
              >
                Forgot?
              </a>
            </div>

            <button
              type="submit"
              className="lvj-btn"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: 14 }}
            >
              {loading ? 'Signing in…' : 'Continue →'}
            </button>
          </form>

          <div
            style={{
              textAlign: 'center',
              marginTop: 24,
              fontSize: 11,
              color: 'var(--stone-3)',
              letterSpacing: '.18em',
              textTransform: 'uppercase',
            }}
          >
            — or —
          </div>

          <button
            type="button"
            onClick={sendMagicLink}
            disabled={loading}
            className="lvj-btn ghost"
            style={{ width: '100%', justifyContent: 'center', padding: 13, marginTop: 18 }}
          >
            Email me a magic link
          </button>

          <button
            type="button"
            onClick={sso}
            disabled={loading}
            className="lvj-btn ghost"
            style={{ width: '100%', justifyContent: 'center', padding: 13, marginTop: 10 }}
          >
            Single Sign-On · Google Workspace
          </button>

          {msg && (
            <div role="status" style={{ marginTop: 18, fontSize: 12.5, color: 'var(--lvj-green)' }}>
              {msg}
            </div>
          )}
          {err && (
            <div role="alert" style={{ marginTop: 18, fontSize: 12.5, color: 'var(--lvj-red)' }}>
              {err}
            </div>
          )}

          <div
            style={{
              marginTop: 40,
              paddingTop: 24,
              borderTop: '1px solid var(--rule)',
              fontFamily: 'var(--lvj-mono)',
              fontSize: 10.5,
              color: 'var(--stone-3)',
              letterSpacing: '.06em',
              lineHeight: 1.6,
            }}
          >
            Protected by attorney–client privilege.
            <br />
            Sessions audited per ABA Model Rule 1.6.
          </div>
        </div>
      </section>
    </main>
  )
}
