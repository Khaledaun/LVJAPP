import AppShell from '@/components/lvj/app-shell'
import TrafficLightBadge from '@/components/lvj/traffic-light-badge'
import { IconArrow } from '@/components/lvj/icons'

// Sample data — replaced with Prisma queries in Sprint 2 per CLAUDE.md.
const SAMPLE_CASES = [
  { id: 'LVJ-24-0142', title: 'EB-5 Investor Petition · Al-Mansouri', applicant: 'Khalid Al-Mansouri', email: 'k.mansouri@gulfco.ae',       svc: 'Investor Visa',  status: 'in_review',         due: 'Apr 28' },
  { id: 'LVJ-24-0138', title: 'O-1 Extraordinary Ability · Chen',      applicant: 'Wei Chen',           email: 'wchen@labs.io',              svc: 'Work Visa',      status: 'documents_pending', due: 'Apr 24' },
  { id: 'LVJ-24-0137', title: 'I-601A Waiver · Reyes Family',          applicant: 'Maria Reyes',        email: 'maria.r@gmail.com',          svc: 'Waiver',         status: 'blocked',           due: 'Apr 22' },
  { id: 'LVJ-24-0129', title: 'N-400 Naturalization · Okafor',         applicant: 'Daniel Okafor',      email: 'd.okafor@okaforlaw.com',     svc: 'Citizenship',    status: 'approved',          due: '—' },
  { id: 'LVJ-24-0125', title: 'Marriage-Based AOS · Haddad',           applicant: 'Yasmin Haddad',      email: 'yhaddad@outlook.com',        svc: 'Family Visa',    status: 'submitted',         due: 'May 12' },
]

const UPCOMING = [
  { d: '22', m: 'Apr', t: 'I-601A response window closes', c: 'LVJ-24-0137', s: 'blocked' },
  { d: '24', m: 'Apr', t: 'O-1 RFE reply due to USCIS',    c: 'LVJ-24-0138', s: 'documents_pending' },
  { d: '28', m: 'Apr', t: 'EB-5 biometrics appointment',   c: 'LVJ-24-0142', s: 'in_review' },
  { d: '02', m: 'May', t: 'Interview · AOS Haddad',        c: 'LVJ-24-0125', s: 'submitted' },
]

const initials = (n: string) => n.split(' ').map(s => s[0]).slice(0, 2).join('')

export default function DashboardPage() {
  return (
    <AppShell
      crumbs={['Workspace', 'Dashboard']}
      sidebar={{
        user: { name: 'Laila Al-Jabari', role: 'Partner · Admin', initial: 'L' },
        badges: { cases: 142, msg: 7 },
      }}
      topbar={{ hasUnreadNotifications: true }}
    >
      <div className="lvj-page-head">
        <div>
          <div className="kicker">Monday · Apr 22, 2026</div>
          <h1>Good morning, Laila.</h1>
          <p className="lede">
            Seven cases require counsel attention today. Three filings approach their USCIS deadlines this week.
          </p>
        </div>
        <div className="actions">
          <button className="lvj-btn ghost">Export Weekly</button>
          <button className="lvj-btn">+ New Intake</button>
        </div>
      </div>

      <div className="lvj-kpis">
        <div className="lvj-kpi hero">
          <div>
            <div className="lbl">
              <span>Active Cases · Q2</span>
              <span style={{ fontFamily: 'var(--lvj-mono)', color: 'var(--gold-soft)' }}>04/22</span>
            </div>
            <div className="val">142</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginTop: 12 }}>
            <div className="delta up">▲ 12 since Apr 1 · on pace for Q2 target (160)</div>
            <svg width="120" height="32" viewBox="0 0 120 32" style={{ opacity: .9, flex: '0 0 120px' }} aria-hidden>
              <polyline
                points="0,24 12,22 24,20 36,18 48,14 60,15 72,11 84,10 96,6 108,7 120,4"
                fill="none"
                stroke="#D4B87A"
                strokeWidth="1.2"
              />
              <circle cx="120" cy="4" r="2.5" fill="#D4B87A" />
            </svg>
          </div>
        </div>
        <div className="lvj-kpi">
          <div className="lbl"><span>Awaiting Docs</span><span style={{ color: 'var(--lvj-amber)' }}>●</span></div>
          <div className="val">28</div>
          <div className="delta">14 clients notified</div>
        </div>
        <div className="lvj-kpi">
          <div className="lbl"><span>Approved · 30d</span><span style={{ color: 'var(--lvj-green)' }}>●</span></div>
          <div className="val">19</div>
          <div className="delta up">▲ 23% vs. prior</div>
        </div>
        <div className="lvj-kpi">
          <div className="lbl"><span>Avg. Resolution</span><span>—</span></div>
          <div className="val">
            87<span style={{ fontSize: 22, color: 'var(--stone-3)', marginLeft: 6 }}>d</span>
          </div>
          <div className="delta down">▼ 4d faster</div>
        </div>
      </div>

      <div className="lvj-two">
        <div className="lvj-card">
          <div className="lvj-card-head">
            <div>
              <div className="kicker">Priority</div>
              <h3>Cases needing attention</h3>
            </div>
            <a className="lvj-chip" href="/cases">View all 142</a>
          </div>
          <table className="lvj-tbl">
            <thead>
              <tr><th>Case</th><th>Applicant</th><th>Status</th><th>Due</th><th aria-label="Open" /></tr>
            </thead>
            <tbody>
              {SAMPLE_CASES.map(c => (
                <tr key={c.id}>
                  <td>
                    <div className="case-title">{c.title}</div>
                    <div className="case-id">{c.id} · {c.svc}</div>
                  </td>
                  <td>
                    <div className="applicant">
                      <div className="av">{initials(c.applicant)}</div>
                      <div>
                        <div className="nm">{c.applicant}</div>
                        <div className="em">{c.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><TrafficLightBadge status={c.status} /></td>
                  <td className="caps">{c.due}</td>
                  <td style={{ color: 'var(--stone-3)' }}><IconArrow /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="lvj-card">
            <div className="lvj-card-head">
              <div>
                <div className="kicker">This week</div>
                <h3>Upcoming deadlines</h3>
              </div>
            </div>
            <div style={{ padding: 0 }}>
              {UPCOMING.map((e, i) => (
                <div
                  key={e.c + i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '64px 1fr',
                    gap: 18,
                    padding: '18px 22px',
                    borderTop: i > 0 ? '1px solid var(--rule-soft)' : 'none',
                  }}
                >
                  <div style={{ textAlign: 'center', borderRight: '1px solid var(--rule)', paddingRight: 10 }}>
                    <div style={{ fontFamily: 'var(--lvj-serif)', fontSize: 28, lineHeight: 1 }}>{e.d}</div>
                    <div style={{ fontSize: 9.5, letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--stone-3)', marginTop: 4 }}>{e.m}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--lvj-serif)', fontSize: 15.5, marginBottom: 6 }}>{e.t}</div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <TrafficLightBadge status={e.s} />
                      <span style={{ fontFamily: 'var(--lvj-mono)', fontSize: 10.5, color: 'var(--stone-3)' }}>{e.c}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lvj-card ivory">
            <div className="lvj-card-body" style={{ padding: 28 }}>
              <div className="kicker" style={{ color: 'var(--emerald)', marginBottom: 14 }}>Status Pulse · Live</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 60, marginBottom: 16 }}>
                {[12, 18, 14, 22, 28, 24, 32, 28, 36, 30, 38, 42].map((v, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      background: i > 7 ? 'var(--emerald)' : 'var(--stone-2)',
                      height: v * 1.5,
                      opacity: i > 7 ? 1 : .6,
                    }}
                  />
                ))}
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontFamily: 'var(--lvj-mono)',
                  fontSize: 10,
                  color: 'var(--stone-3)',
                  letterSpacing: '.1em',
                }}
              >
                <span>Jan</span><span>Apr</span><span>Jul</span><span>Oct</span>
              </div>
              <p
                style={{
                  fontFamily: 'var(--lvj-serif)',
                  fontStyle: 'italic',
                  fontSize: 14,
                  color: 'var(--stone-4)',
                  marginTop: 20,
                  lineHeight: 1.5,
                }}
              >
                Approvals have climbed steadily since the Q1 intake refresh. The emerald bars represent the last six weeks of status changes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
