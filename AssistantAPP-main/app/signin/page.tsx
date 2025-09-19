'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'

export default function SignInPage() {
  const [email, setEmail] = useState('you@example.com')
  const [code, setCode]   = useState('lvjdev')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function signInDev(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErr(null); setMsg(null)
    await signIn('credentials', { email, password: code, redirect: true, callbackUrl: '/cases' })
  }

  async function sendMagicLink() {
    setLoading(true); setErr(null); setMsg(null)
    const res = await signIn('email', { email, redirect: false, callbackUrl: '/cases' })
    setLoading(false)
    if (res?.ok) {
      setMsg('If email is configured, check your inbox. Otherwise, copy the magic link from server logs.')
    } else {
      setErr('Could not start email sign-in.')
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm border rounded-xl p-6 space-y-5">
        <h1 className="text-xl font-semibold">Sign in</h1>

        <div className="space-y-1">
          <label className="text-sm">Email</label>
          <input className="w-full border rounded px-3 py-2" type="email" value={email} onChange={e=>setEmail(e.target.value)} />
        </div>

        <form onSubmit={signInDev} className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm">Access code (dev)</label>
            <input className="w-full border rounded px-3 py-2" type="password" name="password" value={code} onChange={e=>setCode(e.target.value)} placeholder="lvjdev" />
            <p className="text-xs text-muted-foreground">Use DEV_LOGIN_CODE from .env (default: <code>lvjdev</code>).</p>
          </div>
          <button type="submit" disabled={loading} className="w-full px-3 py-2 border rounded bg-black text-white disabled:opacity-60">
            {loading ? 'Signing in…' : 'Sign in (dev)'}
          </button>
        </form>

        <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="flex-1 h-px bg-gray-200" />or<span className="flex-1 h-px bg-gray-200" /></div>

        <button onClick={sendMagicLink} disabled={loading} className="w-full px-3 py-2 border rounded">
          Email me a magic link
        </button>

        {msg && <div className="text-sm text-green-700">{msg}</div>}
        {err && <div className="text-sm text-red-600">{err}</div>}

        <p className="text-xs text-muted-foreground text-center mt-2">
          Email login only activates if <code>EMAIL_FROM</code> is set. Without SendGrid, the link prints in server logs.
        </p>
      </div>
    </main>
  )
}
