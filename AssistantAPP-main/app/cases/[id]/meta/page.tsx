'use client'
import { useParams, useRouter } from 'next/navigation'
import useSWR from 'swr'
import Link from 'next/link'
import { useState } from 'react'

const fetcher = (u: string) => fetch(u).then(r => r.json())

const VISA_TYPES = [
  { value: '', label: '— Select —' },
  { value: 'work', label: 'Work' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'student', label: 'Student' },
  { value: 'tourist', label: 'Tourist' },
  { value: 'extension', label: 'Extension' },
  { value: 'asylum', label: 'Asylum' },
  { value: 'other', label: 'Other' },
]

export default function EditMetaPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const { data: caseRes } = useSWR<{ case: any }>(`/api/cases/${id}`, fetcher)
  const { data: staffRes } = useSWR<{ items: { id: string; name?: string; email?: string }[] }>(`/api/staff`, fetcher)

  const kase = caseRes?.case
  const staff = staffRes?.items ?? []

  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const visaType = (form.get('visaType') as string) || null
    const originCountry = (form.get('originCountry') as string)?.trim() || null
    const assigneeId = (form.get('assigneeId') as string) || null

    setSaving(true); setMsg(null)
    const r = await fetch(`/api/cases/${id}/meta`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ visaType, originCountry, assigneeId }),
    })
    setSaving(false)
    if (r.ok) {
      setMsg('Saved.')
      // go back to case page
      setTimeout(() => router.push(`/cases/${id}`), 600)
    } else {
      const t = await r.text().catch(()=>'')
      setMsg(`Save failed: ${t || r.status}`)
    }
  }

  if (!kase) return <main className="p-6">Loading…</main>

  return (
    <main className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Edit Case Meta</h1>
        <Link href={`/cases/${id}`} className="text-sm underline">Back to case</Link>
      </div>

      <div className="text-sm text-muted-foreground">
        {kase.title} • {kase.applicantName} ({kase.applicantEmail})
      </div>

      <form onSubmit={save} className="space-y-4 max-w-md">
        <label className="block">
          <div className="text-sm mb-1">Visa type</div>
          <select name="visaType" defaultValue={kase.visaType ?? ''} className="w-full border rounded px-2 py-2">
            {VISA_TYPES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
          </select>
        </label>

        <label className="block">
          <div className="text-sm mb-1">Origin (country code, e.g. IL, US)</div>
          <input name="originCountry" defaultValue={kase.originCountry ?? ''} className="w-full border rounded px-2 py-2" placeholder="IL" />
        </label>

        <label className="block">
          <div className="text-sm mb-1">Lead (staff)</div>
          <select name="assigneeId" defaultValue={kase.assigneeId ?? ''} className="w-full border rounded px-2 py-2">
            <option value="">— None —</option>
            {staff.map(s => (
              <option key={s.id} value={s.id}>{s.name || s.email}</option>
            ))}
          </select>
        </label>

        <button type="submit" disabled={saving} className="border rounded px-3 py-2">
          {saving ? 'Saving…' : 'Save'}
        </button>
        {msg && <div className="text-sm">{msg}</div>}
      </form>
    </main>
  )
}
