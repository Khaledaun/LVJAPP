'use client'
import React from 'react'
import ExternalPartnersManager from '@/components/ExternalPartnersManager';
import TermsGate from '@/components/auth/TermsGate'
import { useParams } from 'next/navigation'
import useSWR from 'swr'
import { useState } from 'react'
import Link from 'next/link'
import { CaseTabs } from '@/components/case/CaseTabs'
import SimpleTopbar from '@/components/site/SimpleTopbar'

type TabKey = 'overview' | 'documents' | 'messages' | 'payments'
const fetcher = (u: string) => fetch(u).then(r => r.json())
const norm = (s: any) => String(s ?? '').toLowerCase()

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState<TabKey>('overview')
  const { data, isLoading } = useSWR<{ case: any }>(`/api/cases/${id}`, fetcher)

  if (isLoading) return <main><TermsGate /><SimpleTopbar /><div className="p-6">Loading…</div></main>
  if (!data?.case) {
    return (
      <main>
        <TermsGate />
        <SimpleTopbar />
        <div className="p-6 space-y-4">
          <Link href="/cases" className="text-sm underline underline-offset-4">&larr; Back to cases</Link>
          <div className="text-sm text-red-600">Case not found.</div>
        </div>
      </main>
    )
  }
  const c = data.case

  return (
    <main>
      <TermsGate />
      <SimpleTopbar />
      <ExternalPartnersManager caseId={params.id} />
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        <Link href="/cases" className="text-sm underline underline-offset-4">&larr; Back to cases</Link>

        <div>
          <h1 className="text-2xl font-semibold">{c.title}</h1>
          <div className="text-sm text-muted-foreground">
            {c.applicantName} • {c.applicantEmail} • {norm(c.status)}
          </div>
        </div>

        <CaseTabs active={tab} onChange={setTab} />

        {tab === 'overview'  && <Overview  id={c.id} />}
        {tab === 'documents' && <Documents id={c.id} />}
        {tab === 'messages'  && <SafeMessages id={c.id} />}
        {tab === 'payments'  && <Payments  id={c.id} />}
      </div>
    </main>
  )
}

/* --- Tab bodies (same as before) --- */

function Overview({ id }: { id: string }) {
  const { data } = useSWR<{ timeline: { id: string; at?: string; when?: string; text: string }[] }>(`/api/cases/${id}/timeline`, fetcher)
  const items = data?.timeline ?? []
  return (
    <section className="space-y-3">
      <h2 className="font-medium">Activity</h2>
      {items.length === 0 ? (
        <div className="rounded border p-6 text-sm text-muted-foreground">No activity yet.</div>
      ) : (
        <ul className="space-y-2">
          {items.map(it => (
            <li key={it.id} className="text-sm">
              <span className="text-muted-foreground">
                {new Date(it.when ?? it.at ?? '').toLocaleString()} —{' '}
              </span>
              {it.text}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Documents({ id }: { id: string }) {
  const { data, mutate } = useSWR<{ items: { id: string; name: string; state: string; rejectionReason?: string }[] }>(`/api/cases/${id}/documents`, fetcher)
  const [name, setName] = useState('Bank Statements (PDF)')
  const [liveMsg, setLiveMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const uploadMock = async () => {
    if (!name.trim()) return
    await fetch(`/api/cases/${id}/documents`, {
      method: 'POST',
      headers:{'content-type':'application/json'},
      body: JSON.stringify({ action: 'uploadMock', name })
    })
    setName(''); mutate()
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true); setLiveMsg('Preparing upload…')
    try {
      // 1) Ask server for signed URL
      const r1 = await fetch(`/api/cases/${id}/documents/upload-url`, {
        method: 'POST',
        headers: {'content-type':'application/json'},
        body: JSON.stringify({ filename: file.name, contentType: file.type || 'application/octet-stream', size: file.size })
      })
      const j1 = await r1.json().catch(async () => ({ ok:false, reason:`http-${r1.status}` }))
      if (!j1?.ok) {
        setLiveMsg('Live storage is not configured. Use “Upload (mock)”.')
        setBusy(false)
        return
      }

      // 2) PUT to GCS
      setLiveMsg('Uploading to storage…')
      const put = await fetch(j1.url, { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file })
      if (!put.ok) {
        const t = await put.text().catch(()=>'')
        setLiveMsg(`Upload failed (${put.status}). ${t.slice(0,120)}`)
        setBusy(false)
        return
      }

      // 3) Finalize (save in DB)
      setLiveMsg('Saving…')
      const r2 = await fetch(`/api/cases/${id}/documents/complete`, {
        method: 'POST',
        headers: {'content-type':'application/json'},
        body: JSON.stringify({ objectName: j1.objectName, filename: file.name, contentType: file.type || 'application/octet-stream', size: file.size })
      })

      // Try JSON first, fall back to text
      let j2: any = null, raw2: string | undefined
      try { j2 = await r2.clone().json() } catch { raw2 = await r2.text().catch(()=>undefined) }

      if (!r2.ok || !j2?.ok) {
        const msg =
          (j2 && (j2.reason || j2.message)) ||
          raw2 ||
          `HTTP ${r2.status}`
        setLiveMsg(`Finalize failed: ${msg}`)
        setBusy(false)
        ;(e.target as any).value = ''
        return
      }

      setLiveMsg('Uploaded.')
      setBusy(false)
      ;(e.target as any).value = ''
      mutate()
    } catch (err: any) {
      setLiveMsg(`Error: ${err?.message || String(err)}`)
      setBusy(false)
    }
  }

  const cycle = async (docId: string, stateRaw: string) => {
    const s = (stateRaw || '').toLowerCase()
    const next = s === 'requested' ? 'uploaded' : s === 'uploaded' ? 'approved' : s === 'approved' ? 'rejected' : 'requested'
    await fetch(`/api/cases/${id}/documents`, {
      method: 'POST',
      headers:{'content-type':'application/json'},
      body: JSON.stringify({ action: 'setState', id: docId, state: next })
    })
    mutate()
  }

  const items = (data?.items ?? []).map(d => ({ ...d, state: (d.state || '').toLowerCase() }))
  const badge = (s: string) =>
    s === 'approved' ? 'bg-green-100' :
    s === 'uploaded' ? 'bg-blue-100' :
    s === 'rejected' ? 'bg-red-100'  : 'bg-gray-100'

  return (
    <section className="space-y-3">
      <h2 className="font-medium">Documents</h2>

      {/* Live upload (if enabled) */}
      <div className="flex items-center gap-3 flex-wrap">
        <input type="file" onChange={onFile} disabled={busy} />
        {liveMsg && <span className="text-xs text-muted-foreground">{liveMsg}</span>}
      </div>

      {/* Mock upload (always available) */}
      <div className="flex gap-2">
        <input className="border rounded px-3 py-2 w-full" placeholder="Fake-upload a document name…" value={name} onChange={e => setName(e.target.value)} />
        <button onClick={uploadMock} className="px-3 py-2 border rounded">Upload (mock)</button>
      </div>

      {items.length === 0 ? (
        <div className="rounded border p-6 text-sm text-muted-foreground">No documents yet. Use the file picker (live, if configured) or “Upload (mock)”.</div>
      ) : (
        <div className="grid gap-2">
          {items.map(d => (
            <div key={d.id} className="flex items-center justify-between rounded border p-3">
              <div>
                <div className="font-medium">{d.name}</div>
                <div className="text-xs text-muted-foreground">{d.rejectionReason ? `Rejected: ${d.rejectionReason}` : '—'}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded ${badge(d.state)}`}>{d.state}</span>
                <button onClick={() => cycle(d.id, d.state)} className="text-sm px-2 py-1 border rounded">Advance</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function Payments({ id }: { id: string }) {
  const { data, mutate, isLoading } = useSWR<{ items: { id: string; title?: string; description?: string; amountCents?: number; amount?: number; currency?: string; status: string }[] }>(
    `/api/cases/${id}/payments`,
    fetcher
  )

  const markPaid = async (paymentId: string) => {
    try {
      const r = await fetch(`/api/cases/${id}/payments`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'markPaid', id: paymentId }),
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        throw new Error(j?.reason || j?.message || `HTTP ${r.status}`)
      }
      mutate()
    } catch (e: any) {
      alert(e?.message || 'Failed to mark paid')
    }
  }

  const items = (data?.items ?? []).map(p => {
    const amount = typeof p.amountCents === 'number' ? (p.amountCents / 100) : (p.amount ?? 0)
    const label = p.title || p.description || 'Invoice'
    const status = (p.status || '').toLowerCase()
    const currency = p.currency || 'USD'
    return { ...p, amount, label, status, currency }
  })

  return (
    <section className="space-y-3">
      <h2 className="font-medium">Payments</h2>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-16 rounded border animate-pulse bg-muted/20" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded border p-6 text-sm text-muted-foreground">No invoices yet.</div>
      ) : (
        <div className="grid gap-2">
          {items.map(inv => (
            <div key={inv.id} className="flex items-center justify-between rounded border p-3">
              <div>
                <div className="font-medium">{inv.label}</div>
                <div className="text-xs text-muted-foreground">
                  {inv.currency} {inv.amount.toFixed(2)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded ${inv.status === 'paid' ? 'bg-green-100' : 'bg-yellow-100'}`}>
                  {inv.status}
                </span>
                {inv.status !== 'paid' && (
                  <button onClick={() => markPaid(inv.id)} className="text-sm px-2 py-1 border rounded">
                    Mark paid
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}



class LVJErrorBoundary extends React.Component<{ children: React.ReactNode; label?: string }, { err?: any }> {
  constructor(props: any) {
    super(props)
    this.state = { err: undefined }
  }
  static getDerivedStateFromError(err: any) {
    return { err }
  }
  componentDidCatch(err: any, info: any) {
    console.error('[Messages boundary]', err, info)
  }
  render() {
    if (this.state.err) {
      const msg = this.state.err?.message || String(this.state.err)
      return <div className="rounded border p-3 text-sm text-red-600">Messages failed: {msg}</div>
    }
    return this.props.children as any
  }
}

function Messages({ id }: { id: string }) {
  const { data, mutate, isLoading } = useSWR<{ items: { id: string; from: 'client'|'staff'; text: string; at: string }[] }>(
    `/api/cases/${id}/messages`,
    fetcher
  )
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const items = data?.items ?? []

  const send = async () => {
    const t = text.trim()
    if (!t) return
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch(`/api/cases/${id}/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: t }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j?.ok) {
        setErr(j?.reason || j?.message || `HTTP ${res.status}`)
      } else {
        setText('')
        mutate()
      }
    } catch (e: any) {
      setErr(e?.message || 'Network error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="font-medium">Messages</h2>

      {err && <div className="text-sm text-red-600">{String(err)}</div>}

      <div className="space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 rounded border animate-pulse bg-muted/20" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded border p-3 text-sm text-muted-foreground">No messages yet.</div>
        ) : (
          items.map(m => (
            <div key={m.id} className="rounded border p-3">
              <div className="text-xs text-muted-foreground">
                {m.from === 'staff' ? 'LVJ Staff' : 'Client'} • {new Date(m.at).toLocaleString()}
              </div>
              <div className="text-sm whitespace-pre-wrap">{m.text}</div>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type a message"
          className="flex-1 px-3 py-2 border rounded"
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
        />
        <button
          onClick={send}
          disabled={busy || !text.trim()}
          className="px-3 py-2 border rounded text-sm disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </section>
  )
}


function SafeMessages({ id }: { id: string }) {
  return (
    <LVJErrorBoundary label="messages">
      <Messages id={id} />
    </LVJErrorBoundary>
  )
}
