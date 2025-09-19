'use client'
import React, { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const params = useSearchParams()
  const callbackUrl = params.get('callbackUrl') || '/'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      const res = await signIn('credentials', { redirect: false, email, password, callbackUrl })
      if (res?.error) { setError(res.error); return }
      router.push(callbackUrl)
    } catch (e: any) {
      setError('Failed to sign in')
      console.error('SignIn failed:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm p-4 border rounded-xl space-y-3">
        <h1 className="text-lg font-semibold">Sign in</h1>
        <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full border rounded-lg px-3 py-2" required />
        <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full border rounded-lg px-3 py-2" required />
        <button type="submit" disabled={loading} className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white">{loading?'Signing in…':'Sign in'}</button>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <p className="text-xs text-gray-500">In non‑prod, demo login: demo@lvj.local / demo</p>
      </form>
    </div>
  )
}
