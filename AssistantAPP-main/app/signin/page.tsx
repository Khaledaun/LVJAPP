'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Mail, Lock, Shield, Zap, ArrowRight, ChevronRight } from 'lucide-react'

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
    <div className="min-h-screen bg-gradient-to-br from-[#F6F6F6] via-gray-50 to-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-4 mb-6">
            <div className="h-14 w-14 rounded-2xl bg-[#0C1F19] flex items-center justify-center shadow-xl">
              <span className="text-[#F9D366] font-bold text-2xl">LVJ</span>
            </div>
            <div className="text-left">
              <div className="text-3xl font-bold text-[#0C1F19] tracking-tight">Case Assistant</div>
              <div className="text-sm text-gray-600 font-medium">Professional Legal Management</div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-[#F9D366] to-yellow-400 h-1 w-20 mx-auto rounded-full"></div>
        </div>

        {/* Sign-in Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100 backdrop-blur-sm">
          <div className="text-center space-y-3 mb-8">
            <h1 className="text-4xl font-bold text-[#0C1F19] tracking-tight">Welcome Back</h1>
            <p className="text-lg text-gray-600 font-medium">Sign in to access your legal dashboard</p>
          </div>

          <form onSubmit={signInDev} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-[#0C1F19] block mb-2">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-[#F9D366] transition-colors" />
                </div>
                <input 
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 bg-gray-50/50 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-[#F9D366]/20 focus:border-[#F9D366] focus:bg-white transition-all duration-300 placeholder-gray-400" 
                  type="email" 
                  value={email} 
                  onChange={e=>setEmail(e.target.value)} 
                  placeholder="Enter your email address"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#0C1F19] block mb-2">Access Code</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-[#F9D366] transition-colors" />
                </div>
                <input 
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 bg-gray-50/50 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-[#F9D366]/20 focus:border-[#F9D366] focus:bg-white transition-all duration-300 placeholder-gray-400" 
                  type="password" 
                  name="password" 
                  value={code} 
                  onChange={e=>setCode(e.target.value)} 
                  placeholder="Enter your access code"
                  required
                />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <span className="text-xs">💡</span>
                  <span>Development code:</span>
                  <code className="bg-gray-100 px-2 py-1 rounded font-mono text-[#0C1F19] font-semibold">lvjdev</code>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full py-4 bg-gradient-to-r from-[#F9D366] to-yellow-400 hover:from-yellow-400 hover:to-[#F9D366] text-[#0C1F19] font-bold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0"
            >
              <div className="flex items-center justify-center gap-3">
                <Shield className="w-5 h-5" />
                <span className="text-lg">{loading ? 'Signing you in...' : 'Sign In Securely'}</span>
                <ArrowRight className="w-5 h-5" />
              </div>
            </button>
          </form>

          <div className="flex items-center gap-4 my-6 text-sm text-gray-500">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gray-200"></div>
            <span className="font-semibold text-gray-400 bg-white px-3">or</span>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gray-200"></div>
          </div>

          <button 
            onClick={sendMagicLink} 
            disabled={loading} 
            className="w-full py-4 border-2 border-gray-200 hover:border-[#0C1F19] text-[#0C1F19] font-bold rounded-xl disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 hover:bg-gray-50 group"
          >
            <div className="flex items-center justify-center gap-3">
              <Zap className="w-5 h-5 group-hover:text-[#F9D366] transition-colors" />
              <span>Email me a magic link</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Status Messages */}
          {msg && (
            <div className="mt-6 p-4 bg-green-50 border-l-4 border-green-400 rounded-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-5 h-5 bg-green-400 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">{msg}</p>
                </div>
              </div>
            </div>
          )}

          {err && (
            <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-5 h-5 bg-red-400 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{err}</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500 leading-relaxed">
              Email authentication requires proper <span className="font-mono bg-gray-100 px-1 py-0.5 rounded text-[#0C1F19]">EMAIL_FROM</span> configuration.<br />
              Without SendGrid setup, magic links appear in server logs.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <div className="flex items-center justify-center gap-6 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#0C1F19]"></div>
              <span>Forest Green</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#F9D366]"></div>
              <span>Warm Yellow</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-3 h-3" />
              <span>Secure</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
