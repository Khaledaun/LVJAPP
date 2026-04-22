'use client'

import * as React from 'react'

export interface PendingRow {
  id: string
  agentId: string
  gateId: string
  correlationId: string
  caseId: string | null
  leadId: string | null
  approverRole: string
  createdAt: string
  slaDueAt: string
  payload: unknown
}

export function ApprovalsClient({ initial }: { initial: PendingRow[] }) {
  const [rows, setRows] = React.useState<PendingRow[]>(initial)
  const [selected, setSelected] = React.useState<PendingRow | null>(initial[0] ?? null)
  const [reason, setReason] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [msg, setMsg] = React.useState<string | null>(null)

  async function decide(decision: 'approve' | 'reject') {
    if (!selected) return
    if (decision === 'reject' && reason.trim() === '') {
      setMsg('A rejection reason is required.'); return
    }
    setBusy(true); setMsg(null)
    try {
      const res = await fetch(`/api/agents/hitl/${selected.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reason: decision === 'reject' ? reason : undefined }),
      })
      if (!res.ok) {
        const err = await res.text().catch(() => '')
        setMsg(`Failed: ${err || res.status}`); return
      }
      const remaining = rows.filter(r => r.id !== selected.id)
      setRows(remaining)
      setSelected(remaining[0] ?? null)
      setReason('')
      setMsg(decision === 'approve' ? 'Approved.' : 'Rejected.')
    } finally {
      setBusy(false)
    }
  }

  if (rows.length === 0) {
    return (
      <div className="lvj-card"><div className="lvj-card-body" style={{ padding: 40, textAlign: 'center' }}>
        <div className="kicker" style={{ marginBottom: 8 }}>Queue empty</div>
        <div style={{ fontFamily: 'var(--lvj-serif)', fontSize: 20 }}>Nothing to approve.</div>
        <p style={{ fontSize: 13, color: 'var(--stone-4)', marginTop: 8 }}>
          The runtime will surface items here as agents request review.
        </p>
      </div></div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24, alignItems: 'flex-start' }}>
      <div className="lvj-card">
        {rows.map((r, i) => {
          const due = new Date(r.slaDueAt)
          const ms  = due.getTime() - Date.now()
          const late = ms < 0
          const label = late
            ? `Overdue ${Math.floor(Math.abs(ms) / 60000)}m`
            : `Due in ${Math.floor(ms / 60000)}m`
          const isSelected = selected?.id === r.id
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelected(r)}
              style={{
                width: '100%',
                textAlign: 'left',
                background: isSelected ? 'var(--ivory)' : 'transparent',
                border: 'none',
                borderTop: i > 0 ? '1px solid var(--rule-soft)' : 'none',
                padding: '14px 18px',
                cursor: 'pointer',
                fontFamily: 'var(--lvj-sans)',
                fontWeight: 300,
                color: 'var(--ink)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontFamily: 'var(--lvj-serif)', fontSize: 15 }}>{r.agentId}</span>
                <span
                  style={{
                    fontFamily: 'var(--lvj-mono)', fontSize: 10.5, letterSpacing: '.06em',
                    color: late ? 'var(--lvj-red)' : 'var(--stone-3)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--stone-3)', marginTop: 4 }}>
                gate <span style={{ fontFamily: 'var(--lvj-mono)' }}>{r.gateId}</span>
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--stone-3)', marginTop: 2, fontFamily: 'var(--lvj-mono)' }}>
                {r.caseId ? `case ${r.caseId}` : r.leadId ? `lead ${r.leadId}` : r.correlationId}
              </div>
            </button>
          )
        })}
      </div>

      {selected && (
        <div className="lvj-card"><div className="lvj-card-body" style={{ padding: 28 }}>
          <div className="kicker" style={{ marginBottom: 8 }}>
            {selected.agentId} · {selected.gateId}
          </div>
          <h2 style={{ fontFamily: 'var(--lvj-serif)', fontWeight: 300, fontSize: 28, marginBottom: 6 }}>
            Review request
          </h2>
          <div style={{ fontSize: 11.5, color: 'var(--stone-3)', fontFamily: 'var(--lvj-mono)', marginBottom: 20 }}>
            Approver: {selected.approverRole} · correlation {selected.correlationId}
          </div>

          <div
            style={{
              background: 'var(--ivory)',
              border: '1px solid var(--rule)',
              padding: 16,
              fontFamily: 'var(--lvj-mono)',
              fontSize: 12,
              color: 'var(--stone-4)',
              whiteSpace: 'pre-wrap',
              marginBottom: 20,
              maxHeight: 360,
              overflow: 'auto',
            }}
          >
            {JSON.stringify(selected.payload, null, 2)}
          </div>

          <div className="lvj-field">
            <label htmlFor="reason">Rejection reason (required for reject)</label>
            <textarea id="reason" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. UPL risk on paragraph 2; tone not appropriate for a denial." />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button type="button" className="lvj-btn" disabled={busy} onClick={() => decide('approve')}>
              {busy ? '…' : 'Approve'}
            </button>
            <button type="button" className="lvj-btn ghost" disabled={busy} onClick={() => decide('reject')}>
              {busy ? '…' : 'Reject'}
            </button>
          </div>

          {msg && (
            <div
              role="status"
              style={{
                marginTop: 14,
                fontSize: 12.5,
                color: msg.startsWith('Failed') ? 'var(--lvj-red)' : 'var(--lvj-green)',
              }}
            >
              {msg}
            </div>
          )}
        </div></div>
      )}
    </div>
  )
}
