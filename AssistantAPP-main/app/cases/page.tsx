'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { useMemo, useState } from 'react'

const fetcher = (u: string) => fetch(u).then(r => r.json())

type CaseItem = {
  id: string
  title: string
  applicantName?: string
  applicantEmail?: string
  status: string
  stage?: string
  updatedAt: string
  visaType?: string | null
  originCountry?: string | null
  assigneeId?: string | null
}

type Staff = { id: string; name: string | null; email: string | null }

export default function CasesPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('updatedAt_desc')
  const [visaType, setVisaType] = useState('all')
  const [origin, setOrigin] = useState('all')
  const [lead, setLead] = useState('all')

  const qs = new URLSearchParams({
    search,
    status,
    sort,
    visaType,
    origin,
    lead,
  })
  const { data } = useSWR<{ items: CaseItem[] }>(`/api/cases?${qs.toString()}`, fetcher)
  const cases = data?.items ?? []

  const { data: staffData } = useSWR<{ items: Staff[] }>('/api/staff', fetcher)
  const staff = staffData?.items ?? []

  const visaOptions = [
    ['all', 'All visa types'],
    ['work', 'Work'],
    ['spouse', 'Spouse/Family'],
    ['student', 'Student'],
    ['tourist', 'Tourist'],
    ['extension', 'Extension'],
    ['asylum', 'Asylum'],
    ['other', 'Other'],
  ] as const

  const originOptions = [
    ['all', 'All origins'],
    ['IL', 'Israel'],
    ['US', 'United States'],
    ['CA', 'Canada'],
    ['GB', 'United Kingdom'],
    ['MX', 'Mexico'],
    ['IN', 'India'],
    ['PH', 'Philippines'],
  ] as const

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Cases</h1>
          <p className="text-muted-foreground">Manage your immigration cases</p>
        </div>
        <Link 
          href="/cases/new" 
          className="bg-accent hover:bg-accent/90 text-accent-foreground px-4 py-2 rounded-lg font-semibold transition-colors shadow-sm"
        >
          New Case
        </Link>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 shadow-sm space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <input
            className="border border-border bg-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
            placeholder="Search by title/applicant/email"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select 
            className="border border-border bg-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors" 
            value={status} 
            onChange={e => setStatus(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="new">New</option>
            <option value="in_review">In review</option>
            <option value="awaiting_client">Awaiting client</option>
            <option value="documents_pending">Documents pending</option>
            <option value="payment_due">Payment due</option>
            <option value="completed">Completed</option>
            <option value="closed">Closed</option>
          </select>
          <select 
            className="border border-border bg-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors" 
            value={sort} 
            onChange={e => setSort(e.target.value)}
          >
            <option value="updatedAt_desc">Updated (new → old)</option>
            <option value="updatedAt_asc">Updated (old → new)</option>
            <option value="createdAt_desc">Created (new → old)</option>
            <option value="createdAt_asc">Created (old → new)</option>
          </select>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <select 
            className="border border-border bg-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors" 
            value={visaType} 
            onChange={e => setVisaType(e.target.value)}
          >
            {visaOptions.map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>

          <select 
            className="border border-border bg-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors" 
            value={origin} 
            onChange={e => setOrigin(e.target.value)}
          >
            {originOptions.map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>

          <select 
            className="border border-border bg-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors" 
            value={lead} 
            onChange={e => setLead(e.target.value)}
          >
            <option value="all">All leads</option>
            {staff.map(s => (
              <option key={s.id} value={s.id}>
                {(s.name || 'Staff')} {s.email ? `– ${s.email}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        {cases.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-muted-foreground">No cases found</p>
          </div>
        ) : cases.map(c => (
          <div key={c.id} className="p-6 flex items-center justify-between border-b border-border last:border-b-0 hover:bg-secondary/50 transition-colors">
            <div className="space-y-1">
              <div className="font-semibold text-foreground">{c.title}</div>
              <div className="text-sm text-muted-foreground">
                {c.applicantName} • {c.applicantEmail} {c.originCountry ? `• ${c.originCountry}` : ''}
                {c.visaType ? ` • ${c.visaType}` : ''}
              </div>
            </div>
            <Link 
              href={`/cases/${c.id}`} 
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors text-sm"
            >
              Open
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
