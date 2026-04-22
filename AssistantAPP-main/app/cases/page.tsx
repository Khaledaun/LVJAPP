'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import AppShell from '@/components/lvj/app-shell'
import TrafficLightBadge from '@/components/lvj/traffic-light-badge'
import { IconDots } from '@/components/lvj/icons'

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
  completionPercentage?: number
  caseNumber?: string
  dueDate?: string | null
  counselName?: string | null
}

type Staff = { id: string; name: string | null; email: string | null }

type Density = 'compact' | 'comfortable' | 'spacious'

const DENSITY_PADDING: Record<Density, string> = {
  compact:     '8px 18px',
  comfortable: '14px 18px',
  spacious:    '22px 18px',
}

const initials = (name?: string) =>
  (name ?? '').split(' ').filter(Boolean).map(s => s[0]).slice(0, 2).join('').toUpperCase() || '—'

export default function CasesPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('updatedAt_desc')
  const [visaType, setVisaType] = useState('all')
  const [origin, setOrigin] = useState('all')
  const [lead, setLead] = useState('all')
  const [density, setDensity] = useState<Density>('comfortable')

  const qs = new URLSearchParams({ search, status, sort, visaType, origin, lead })
  const { data } = useSWR<{ items: CaseItem[] }>(`/api/cases?${qs.toString()}`, fetcher)
  const cases = data?.items ?? []

  const { data: staffData } = useSWR<{ items: Staff[] }>('/api/staff', fetcher)
  const staff = staffData?.items ?? []

  const visaOptions = useMemo(() => ([
    ['all', 'All visa types'],
    ['work', 'Work'],
    ['spouse', 'Spouse/Family'],
    ['student', 'Student'],
    ['tourist', 'Tourist'],
    ['extension', 'Extension'],
    ['asylum', 'Asylum'],
    ['other', 'Other'],
  ] as const), [])

  const originOptions = useMemo(() => ([
    ['all', 'All origins'],
    ['IL', 'Israel'], ['US', 'United States'], ['CA', 'Canada'], ['GB', 'United Kingdom'],
    ['MX', 'Mexico'], ['IN', 'India'], ['PH', 'Philippines'],
  ] as const), [])

  const statusFilters = useMemo(() => ([
    { value: 'all',               label: `All · ${cases.length}` },
    { value: 'in_review',          label: `In Review` },
    { value: 'documents_pending',  label: `Docs Pending` },
    { value: 'approved',           label: `Approved` },
    { value: 'blocked',            label: `Blocked` },
    { value: 'denied',             label: `Denied` },
    { value: 'draft',              label: `Draft` },
  ]), [cases.length])

  return (
    <AppShell
      crumbs={['Workspace', 'Cases']}
      sidebar={{
        user: { name: 'Laila Al-Jabari', role: 'Partner · Admin', initial: 'L' },
        badges: { cases: cases.length },
      }}
    >
      <div className="lvj-page-head">
        <div>
          <div className="kicker">Case registry</div>
          <h1>All cases</h1>
          <p className="lede">
            Every matter on the firm&rsquo;s books, filterable by counsel, service type, and
            traffic-light status.
          </p>
        </div>
        <div className="actions">
          <button className="lvj-btn ghost" type="button">Export CSV</button>
          <Link href="/cases/new" className="lvj-btn">+ New Case</Link>
        </div>
      </div>

      {/* Search + secondary filters (preserved from the original data contract) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr',
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div className="lvj-field" style={{ marginBottom: 0 }}>
          <input
            type="text"
            aria-label="Search cases"
            placeholder="Search by title, applicant, or email"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="lvj-field" style={{ marginBottom: 0 }}>
          <select value={visaType} onChange={e => setVisaType(e.target.value)} aria-label="Visa type">
            {visaOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="lvj-field" style={{ marginBottom: 0 }}>
          <select value={origin} onChange={e => setOrigin(e.target.value)} aria-label="Origin">
            {originOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="lvj-field" style={{ marginBottom: 0 }}>
          <select value={lead} onChange={e => setLead(e.target.value)} aria-label="Counsel lead">
            <option value="all">All leads</option>
            {staff.map(s => (
              <option key={s.id} value={s.id}>
                {s.name || 'Staff'}{s.email ? ` – ${s.email}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Status chips + density toggle + sort */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 22,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {statusFilters.map(f => {
          const selected = status === f.value
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatus(f.value)}
              className="lvj-chip"
              aria-pressed={selected}
              style={
                selected
                  ? { borderColor: 'var(--ink)', background: 'var(--ink)', color: 'var(--ivory)' }
                  : { cursor: 'pointer' }
              }
            >
              {f.label}
            </button>
          )
        })}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--rule)' }}>
            <span
              style={{
                fontSize: 9.5,
                letterSpacing: '.2em',
                textTransform: 'uppercase',
                color: 'var(--stone-3)',
                padding: '0 12px',
              }}
            >
              Density
            </span>
            {(['compact', 'comfortable', 'spacious'] as Density[]).map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setDensity(v)}
                title={v}
                aria-pressed={density === v}
                style={{
                  padding: '7px 11px',
                  borderLeft: '1px solid var(--rule)',
                  background: density === v ? 'var(--ink)' : 'transparent',
                  color: density === v ? 'var(--ivory)' : 'var(--stone-4)',
                  border: 'none',
                  fontFamily: 'var(--lvj-mono)',
                  fontSize: 10.5,
                  letterSpacing: '.1em',
                  cursor: 'pointer',
                }}
              >
                {v === 'compact' ? 'C' : v === 'comfortable' ? 'M' : 'L'}
              </button>
            ))}
          </div>

          <div className="lvj-field" style={{ marginBottom: 0, minWidth: 180 }}>
            <select value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort">
              <option value="updatedAt_desc">Updated (new → old)</option>
              <option value="updatedAt_asc">Updated (old → new)</option>
              <option value="createdAt_desc">Created (new → old)</option>
              <option value="createdAt_asc">Created (old → new)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="lvj-card">
        <table className="lvj-tbl">
          <thead>
            <tr>
              <th style={{ width: 44 }}>
                <input type="checkbox" aria-label="Select all" />
              </th>
              <th>Case</th>
              <th>Applicant</th>
              <th>Service</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Counsel</th>
              <th>Due</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {cases.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', color: 'var(--stone-3)', padding: 40 }}>
                  No cases found.
                </td>
              </tr>
            ) : cases.map(c => {
              const pct = c.completionPercentage ?? 0
              const barColor =
                c.status === 'denied' || c.status === 'blocked' ? 'var(--lvj-red)' :
                c.status === 'approved' ? 'var(--lvj-green)' :
                'var(--emerald)'
              return (
                <tr key={c.id} style={{ ['--rowpad' as any]: DENSITY_PADDING[density] }}>
                  <td>
                    <input type="checkbox" aria-label={`Select ${c.title}`} />
                  </td>
                  <td style={{ maxWidth: 260 }}>
                    <Link href={`/cases/${c.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div className="case-title">{c.title}</div>
                      <div className="case-id">{c.caseNumber ?? c.id}</div>
                    </Link>
                  </td>
                  <td>
                    <div className="applicant">
                      <div className="av">{initials(c.applicantName)}</div>
                      <div>
                        <div className="nm">{c.applicantName ?? '—'}</div>
                        <div className="em">{c.applicantEmail ?? '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td
                    className="caps"
                    style={{
                      fontFamily: 'var(--lvj-serif)',
                      fontSize: 14,
                      fontStyle: 'italic',
                      color: 'var(--stone-4)',
                    }}
                  >
                    {c.visaType ?? '—'}
                  </td>
                  <td><TrafficLightBadge status={c.status} /></td>
                  <td style={{ width: 140 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1, height: 2, background: 'var(--stone-1)' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: barColor }} />
                      </div>
                      <span
                        style={{
                          fontFamily: 'var(--lvj-mono)',
                          fontSize: 10.5,
                          color: 'var(--stone-3)',
                        }}
                      >
                        {pct}%
                      </span>
                    </div>
                  </td>
                  <td className="caps">{c.counselName ?? c.assigneeId ?? '—'}</td>
                  <td className="caps">{c.dueDate ?? '—'}</td>
                  <td style={{ color: 'var(--stone-3)' }}>
                    <IconDots />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div
          style={{
            padding: '16px 22px',
            borderTop: '1px solid var(--rule)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontFamily: 'var(--lvj-mono)',
            fontSize: 11,
            color: 'var(--stone-3)',
            letterSpacing: '.08em',
          }}
        >
          <span>Showing {cases.length === 0 ? '0' : `1–${cases.length}`} of {cases.length}</span>
          <span>‹ 1 ›</span>
        </div>
      </div>
    </AppShell>
  )
}
