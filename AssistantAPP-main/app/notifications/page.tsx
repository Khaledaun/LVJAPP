'use client'

import * as React from 'react'
import AppShell from '@/components/lvj/app-shell'
import TrafficLightBadge from '@/components/lvj/traffic-light-badge'

/**
 * Notifications — firm-wide live feed.
 *
 * Data is sample-only for now. When AOS Phase 1 lands, this page will read
 * from `NotificationLog` (Sprint 0 schema) joined with `AuditLog` to render
 * the audit lineage. Channel icons correspond to the AOS event families
 * (see docs/AGENT_OS.md §8.2).
 */

type ChannelKey = 'status' | 'doc' | 'uscis' | 'msg' | 'intake'

interface NotifItem {
  id: string
  channel: ChannelKey
  title: string
  detail: string
  status: string
  when: string
  actor: string
  unread?: boolean
}

const SAMPLE: NotifItem[] = [
  { id: 'n1', channel: 'status', title: 'Case status change',    detail: 'LVJ-24-0137 · Reyes Family — I-601A moved to Blocked.',                                   status: 'blocked',          when: '2 min ago',  actor: 'system',      unread: true },
  { id: 'n2', channel: 'doc',    title: 'Document uploaded',     detail: 'Business Valuation added to EB-5 Al-Mansouri (LVJ-24-0142).',                             status: 'in_review',        when: '18 min ago', actor: 'Omar Rizk',   unread: true },
  { id: 'n3', channel: 'uscis',  title: 'USCIS correspondence',  detail: 'RFE received for O-1 Chen (LVJ-24-0138). Response window: 87 days.',                      status: 'documents_pending',when: '1h ago',     actor: 'system',      unread: true },
  { id: 'n4', channel: 'status', title: 'Case approved',         detail: 'N-400 · Okafor (LVJ-24-0129) — naturalization granted. Oath ceremony to be scheduled.',   status: 'approved',         when: '3h ago',     actor: 'system' },
  { id: 'n5', channel: 'msg',    title: 'Client message',        detail: 'Yasmin Haddad: "We received the interview letter in the mail."',                         status: 'submitted',        when: 'Yesterday',  actor: 'client' },
  { id: 'n6', channel: 'status', title: 'Status change',         detail: 'Asylum · Karimi (LVJ-24-0118) denied. 30-day appeal window opened.',                     status: 'denied',           when: 'Yesterday',  actor: 'system' },
  { id: 'n7', channel: 'doc',    title: 'Document approved',     detail: 'Source-of-Funds binder signed off by lead counsel.',                                     status: 'approved',         when: '2d ago',     actor: 'Laila A.' },
  { id: 'n8', channel: 'intake', title: 'New intake received',   detail: 'Alex Thompson · K-1 Fiancé(e) Visa — draft saved.',                                      status: 'draft',            when: '3d ago',     actor: 'client' },
]

const CHANNEL_FILTERS: { value: 'all' | ChannelKey; label: string; count: number | string }[] = [
  { value: 'all',    label: 'All events',     count: 142 },
  { value: 'status', label: 'Status changes', count: 34 },
  { value: 'doc',    label: 'Documents',      count: 28 },
  { value: 'msg',    label: 'Client messages',count: 19 },
  { value: 'uscis',  label: 'USCIS',          count: 5 },
  { value: 'intake', label: 'Intake',         count: 12 },
]

function ChannelIcon({ channel }: { channel: ChannelKey }) {
  const icons: Record<ChannelKey, { fg: string; svg: React.ReactNode }> = {
    status: {
      fg: 'var(--ink)',
      svg: (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
          <circle cx="8" cy="8" r="6" />
          <path d="M8 4v4l2.5 2" />
        </svg>
      ),
    },
    doc: {
      fg: 'var(--emerald)',
      svg: (
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M4 2h6l2.5 2.5V14H4z" />
          <path d="M10 2v3h2.5" />
          <path d="M6 9h4M6 11.5h4" />
        </svg>
      ),
    },
    uscis: {
      fg: 'var(--gold)',
      svg: (
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M2 4h12v8H2z" />
          <path d="M2 4l6 4.5L14 4" />
        </svg>
      ),
    },
    msg: {
      fg: 'var(--ink)',
      svg: (
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M2 4h12v7H6l-3 2.5V11H2z" />
        </svg>
      ),
    },
    intake: {
      fg: 'var(--stone-4)',
      svg: (
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
          <circle cx="8" cy="5.5" r="2.5" />
          <path d="M3 14c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5" />
        </svg>
      ),
    },
  }
  const v = icons[channel]
  return (
    <div
      aria-hidden
      style={{
        width: 34,
        height: 34,
        borderRadius: '50%',
        background: 'var(--ivory)',
        border: '1px solid var(--rule)',
        color: v.fg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {v.svg}
    </div>
  )
}

export default function NotificationsPage() {
  const [filter, setFilter] = React.useState<'all' | ChannelKey>('all')
  const [items, setItems] = React.useState<NotifItem[]>(SAMPLE)

  const visible = filter === 'all' ? items : items.filter(i => i.channel === filter)
  const unreadCount = items.filter(i => i.unread).length

  const markAllRead = () => setItems(items => items.map(i => ({ ...i, unread: false })))

  return (
    <AppShell
      crumbs={['Insight', 'Notifications']}
      sidebar={{
        user: { name: 'Laila Al-Jabari', role: 'Partner · Admin', initial: 'L' },
        badges: { notif: unreadCount > 0 ? unreadCount : undefined },
      }}
      topbar={{ hasUnreadNotifications: unreadCount > 0 }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        <div className="lvj-page-head">
          <div>
            <div className="kicker">Live feed</div>
            <h1>Notifications</h1>
            <p className="lede">
              Every status change, client message, and system event touching the
              practice — consolidated, with audit lineage.
            </p>
          </div>
          <div className="actions">
            <button className="lvj-btn ghost" type="button">Preferences</button>
            <button className="lvj-btn ghost" type="button" onClick={markAllRead} disabled={unreadCount === 0}>
              Mark all read
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, alignItems: 'flex-start' }}>
          <div className="lvj-card">
            {visible.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--stone-3)', fontSize: 13 }}>
                No events in this channel.
              </div>
            ) : (
              visible.map((it, i) => (
                <div
                  key={it.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '4px 44px 1fr auto',
                    gap: 16,
                    padding: '20px 24px 20px 0',
                    borderBottom: i < visible.length - 1 ? '1px solid var(--rule-soft)' : 'none',
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{ width: 3, alignSelf: 'stretch', background: it.unread ? 'var(--gold)' : 'transparent' }} />
                  <div style={{ paddingTop: 2 }}>
                    <ChannelIcon channel={it.channel} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--lvj-serif)', fontSize: 17 }}>{it.title}</span>
                      <TrafficLightBadge status={it.status} />
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--stone-4)', lineHeight: 1.5, marginBottom: 6 }}>{it.detail}</p>
                    <div style={{ fontFamily: 'var(--lvj-mono)', fontSize: 10.5, color: 'var(--stone-3)', letterSpacing: '.06em' }}>
                      by {it.actor}
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--lvj-mono)',
                      fontSize: 10.5,
                      color: 'var(--stone-3)',
                      letterSpacing: '.06em',
                      whiteSpace: 'nowrap',
                      paddingTop: 4,
                    }}
                  >
                    {it.when}
                  </div>
                </div>
              ))
            )}
          </div>

          <aside style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="lvj-card">
              <div className="lvj-card-body" style={{ padding: 24 }}>
                <div className="kicker" style={{ marginBottom: 12 }}>Filter</div>
                {CHANNEL_FILTERS.map((f, i) => {
                  const active = filter === f.value
                  return (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setFilter(f.value)}
                      aria-pressed={active}
                      style={{
                        width: '100%',
                        padding: '10px 0',
                        borderTop: i > 0 ? '1px solid var(--rule-soft)' : 'none',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 12.5,
                        color: active ? 'var(--ink)' : 'var(--stone-4)',
                        fontWeight: active ? 500 : 300,
                        cursor: 'pointer',
                        background: 'transparent',
                        border: 'none',
                        borderTopWidth: i > 0 ? 1 : 0,
                        textAlign: 'left',
                        fontFamily: 'var(--lvj-sans)',
                      }}
                    >
                      <span>{f.label}</span>
                      <span style={{ fontFamily: 'var(--lvj-mono)', fontSize: 10.5, color: 'var(--stone-3)' }}>
                        {f.count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="lvj-card ivory">
              <div className="lvj-card-body" style={{ padding: 24 }}>
                <div className="kicker" style={{ color: 'var(--emerald)', marginBottom: 10 }}>Audit integrity</div>
                <p
                  style={{
                    fontFamily: 'var(--lvj-serif)',
                    fontSize: 14,
                    color: 'var(--stone-4)',
                    lineHeight: 1.55,
                    fontStyle: 'italic',
                  }}
                >
                  Every event is persisted to the compliance audit log. Exports are
                  prepared monthly for the managing partner.
                </p>
                <div style={{ fontFamily: 'var(--lvj-mono)', fontSize: 10.5, color: 'var(--stone-3)', marginTop: 14 }}>
                  ENABLE_STATUS_NOTIFICATIONS · TRUE
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  )
}
