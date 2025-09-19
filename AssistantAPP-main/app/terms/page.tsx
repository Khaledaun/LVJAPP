'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import SimpleTopbar from '@/components/site/SimpleTopbar'

export default function TermsPage() {
  const [accepted, setAccepted] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/terms/status').then(r=>r.json()).then(d=>setAccepted(d.accepted)).catch(()=>setAccepted(false))
  }, [])

  async function accept() {
    setLoading(true)
    await fetch('/api/terms/accept', { method: 'POST' })
    setLoading(false)
    router.push('/cases')
  }

  return (
    <main>
      <SimpleTopbar />
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Terms of Service</h1>
        <div className="rounded border p-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Please review and accept the latest LVJ Case Assistant Terms of Service to continue.
          </p>
          <div className="text-sm leading-relaxed">
            <p><strong>Version:</strong> {process.env.NEXT_PUBLIC_TERMS_VERSION || 'v1'}</p>
            <p className="mt-2">• You consent to secure communication and document storage related to your case.</p>
            <p>• Do not upload sensitive data not related to your case.</p>
            <p>• Payments are processed via trusted third parties.</p>
          </div>
        </div>
        <button
          onClick={accept}
          disabled={loading}
          className="px-3 py-2 border rounded bg-black text-white disabled:opacity-60"
        >
          {loading ? 'Saving…' : 'I Agree'}
        </button>
      </div>
    </main>
  )
}
