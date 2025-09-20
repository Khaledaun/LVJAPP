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
    <div className="min-h-screen bg-background">
      {/* Brand Header */}
      <header className="w-full bg-primary border-b border-border">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="flex h-16 items-center">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded bg-accent flex items-center justify-center shadow-sm">
                <span className="text-accent-foreground font-bold text-sm">LVJ</span>
              </div>
              <span className="font-bold text-xl text-primary-foreground">Case Assistant</span>
            </div>
          </div>
        </div>
      </header>

      {/* Sign-in Form */}
      <main className="flex items-center justify-center p-6 min-h-[calc(100vh-4rem)]">
        <div className="w-full max-w-sm bg-card border border-border rounded-xl p-6 space-y-5 shadow-lg">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Welcome Back</h1>
            <p className="text-sm text-muted-foreground">Sign in to your account</p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-foreground">Email</label>
              <input 
                className="w-full border border-border bg-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors" 
                type="email" 
                value={email} 
                onChange={e=>setEmail(e.target.value)} 
                placeholder="Enter your email"
              />
            </div>

            <form onSubmit={signInDev} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-foreground">Access code</label>
                <input 
                  className="w-full border border-border bg-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors" 
                  type="password" 
                  name="password" 
                  value={code} 
                  onChange={e=>setCode(e.target.value)} 
                  placeholder="Enter access code"
                />
                <p className="text-xs text-muted-foreground">Use DEV_LOGIN_CODE from .env (default: <code className="bg-secondary px-1 py-0.5 rounded text-xs">lvjdev</code>).</p>
              </div>
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full px-4 py-2.5 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold rounded-lg disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex-1 h-px bg-border"></span>
              <span className="bg-background px-2 font-medium">or</span>
              <span className="flex-1 h-px bg-border"></span>
            </div>

            <button 
              onClick={sendMagicLink} 
              disabled={loading} 
              className="w-full px-4 py-2.5 border border-border bg-background hover:bg-secondary text-foreground font-semibold rounded-lg disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              Email me a magic link
            </button>
          </div>

          {msg && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">{msg}</div>}
          {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{err}</div>}

          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            Email login only activates if <code className="bg-secondary px-1 py-0.5 rounded text-xs">EMAIL_FROM</code> is set. Without SendGrid, the link prints in server logs.
          </p>
        </div>
      </main>
    </div>
  )
}
