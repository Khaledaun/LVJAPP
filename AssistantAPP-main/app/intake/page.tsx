'use client'

import { useState } from 'react'
import AppShell from '@/components/lvj/app-shell'
import { IconCheck } from '@/components/lvj/icons'

/**
 * Intake wizard — 4-step flow, UI-only for now.
 *
 * Data capture is local state; submission will flow through the AOS Intake
 * Agent (docs/AGENT_OS.md §7.1) once AOS Phase 1 lands. At that point the
 * form POSTs to an endpoint that creates an `EligibilityLead` row, emits
 * `intake.submitted`, and routes the draft through HITL.
 */

type StepKey = 'applicant' | 'matter' | 'documents' | 'review'
type StepState = 'done' | 'cur' | 'upc'

const STEPS: { key: StepKey; label: string; title: string }[] = [
  { key: 'applicant', label: 'Applicant', title: 'Applicant' },
  { key: 'matter',    label: 'Matter',    title: 'Matter' },
  { key: 'documents', label: 'Documents', title: 'Documents' },
  { key: 'review',    label: 'Review',    title: 'Review' },
]

const SERVICE_TYPES = [
  { value: '',          label: 'Select a service…' },
  { value: 'investor',  label: 'Investor Visa · EB-5' },
  { value: 'work',      label: 'Work Visa · H-1B / O-1 / L-1' },
  { value: 'family',    label: 'Family-Based · K-1 / IR / F2' },
  { value: 'citizen',   label: 'Naturalization · N-400' },
  { value: 'waiver',    label: 'Waiver · I-601 / I-601A' },
  { value: 'asylum',    label: 'Asylum & Humanitarian' },
  { value: 'consular',  label: 'Consular Processing' },
]

interface IntakeForm {
  // step 1
  applicantName: string
  applicantEmail: string
  applicantPhone: string
  nationality: string
  dateOfBirth: string
  preferredLanguage: string
  // step 2
  serviceType: string
  matterTitle: string
  priority: 'standard' | 'expedited' | 'premium'
  targetFiling: string
  summaryForCounsel: string
  // step 3 — placeholder list; real uploader wires in Sprint 4+
  documents: { id: string; name: string; uploaded: boolean }[]
  // step 4
  consent: boolean
}

const INITIAL: IntakeForm = {
  applicantName: '',
  applicantEmail: '',
  applicantPhone: '',
  nationality: '',
  dateOfBirth: '',
  preferredLanguage: 'English',
  serviceType: '',
  matterTitle: '',
  priority: 'standard',
  targetFiling: '',
  summaryForCounsel: '',
  documents: [
    { id: 'passport',  name: 'Passport bio page',              uploaded: false },
    { id: 'id',        name: 'Government-issued ID',           uploaded: false },
    { id: 'photo',     name: 'Passport photograph',            uploaded: false },
    { id: 'prior_app', name: 'Prior US visa / refusals (if any)', uploaded: false },
  ],
  consent: false,
}

function stateFor(index: number, current: number): StepState {
  if (index < current) return 'done'
  if (index === current) return 'cur'
  return 'upc'
}

export default function IntakePage() {
  const [current, setCurrent] = useState(0)
  const [form, setForm] = useState<IntakeForm>(INITIAL)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const step = STEPS[current]

  const update = <K extends keyof IntakeForm>(key: K, value: IntakeForm[K]) =>
    setForm(f => ({ ...f, [key]: value }))

  const canAdvance = (() => {
    if (step.key === 'applicant') {
      return form.applicantName.trim() !== '' && form.applicantEmail.trim() !== ''
    }
    if (step.key === 'matter') {
      return form.serviceType !== '' && form.matterTitle.trim() !== ''
    }
    if (step.key === 'documents') return true
    if (step.key === 'review')   return form.consent
    return false
  })()

  const next = () => {
    if (!canAdvance) return
    setMsg(null)
    if (current < STEPS.length - 1) setCurrent(c => c + 1)
  }

  const back = () => {
    setMsg(null)
    if (current > 0) setCurrent(c => c - 1)
  }

  const submit = async () => {
    setSubmitting(true)
    setMsg(null)
    try {
      // Intake Agent wiring (AOS Phase 1) will replace this with a POST to
      // /api/agents/intake which emits `intake.submitted`.
      await new Promise(r => setTimeout(r, 400))
      setMsg('Intake received. A member of the legal team will be in touch shortly.')
      setCurrent(STEPS.length - 1)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell
      crumbs={['Workspace', 'New Intake', `Step ${current + 1} of ${STEPS.length}`]}
      sidebar={{ user: { name: 'Laila Al-Jabari', role: 'Partner · Admin', initial: 'L' } }}
    >
      <div style={{ maxWidth: 1080, margin: '0 auto', width: '100%' }}>
        <div className="lvj-page-head">
          <div>
            <div className="kicker">New matter</div>
            <h1>Client intake</h1>
            <p className="lede">
              A gentle, structured interview. Each field is saved automatically — the client may
              resume from any device.
            </p>
          </div>
          <div className="actions">
            <button className="lvj-btn ghost" type="button">Save draft</button>
            {current < STEPS.length - 1 ? (
              <button className="lvj-btn" type="button" disabled={!canAdvance} onClick={next}>
                Continue →
              </button>
            ) : (
              <button className="lvj-btn" type="button" disabled={!canAdvance || submitting} onClick={submit}>
                {submitting ? 'Submitting…' : 'Submit intake'}
              </button>
            )}
          </div>
        </div>

        {/* Stepper */}
        <div style={{ marginBottom: 40, padding: '0 6px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${STEPS.length},1fr)`, position: 'relative' }}>
            {STEPS.map((s, i, a) => {
              const st = stateFor(i, current)
              return (
                <div key={s.key} style={{ textAlign: 'center', position: 'relative', padding: '0 8px' }}>
                  {i < a.length - 1 && (
                    <div
                      aria-hidden
                      style={{
                        position: 'absolute', top: 16, left: '50%', right: '-50%', height: 1,
                        background: st === 'done' ? 'var(--emerald)' : 'var(--rule)', zIndex: 0,
                      }}
                    />
                  )}
                  <div
                    style={{
                      position: 'relative', width: 34, height: 34, margin: '0 auto', borderRadius: '50%',
                      background: st === 'done' ? 'var(--emerald)' : st === 'cur' ? 'var(--ink)' : 'var(--paper)',
                      border: '1px solid ' + (st === 'done' ? 'var(--emerald)' : st === 'cur' ? 'var(--ink)' : 'var(--stone-2)'),
                      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1,
                      color: st === 'upc' ? 'var(--stone-3)' : 'var(--ivory)',
                      fontFamily: st === 'upc' ? 'var(--lvj-sans)' : 'var(--lvj-serif)',
                      fontSize: 13.5,
                    }}
                  >
                    {st === 'done' ? <IconCheck width={14} height={14} strokeWidth={2} /> : i + 1}
                  </div>
                  <div style={{ marginTop: 14, fontFamily: 'var(--lvj-mono)', fontSize: 9.5, letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--stone-3)' }}>
                    Step 0{i + 1}
                  </div>
                  <div style={{ marginTop: 6, fontFamily: 'var(--lvj-serif)', fontSize: 16, fontWeight: st === 'cur' ? 400 : 300, color: st === 'upc' ? 'var(--stone-3)' : 'var(--ink)' }}>
                    {s.label}
                  </div>
                  {st === 'cur' && (
                    <div style={{ marginTop: 4, fontSize: 9.5, letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 500 }}>
                      In progress
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
          {/* Left: the step form */}
          <div className="lvj-card"><div className="lvj-card-body" style={{ padding: 32 }}>
            <div className="kicker" style={{ marginBottom: 18 }}>{step.title}</div>

            {step.key === 'applicant' && (
              <>
                <div className="lvj-field">
                  <label htmlFor="applicantName">Full legal name</label>
                  <input id="applicantName" type="text" value={form.applicantName} onChange={e => update('applicantName', e.target.value)} />
                </div>
                <div className="lvj-field">
                  <label htmlFor="applicantEmail">Email</label>
                  <input id="applicantEmail" type="email" value={form.applicantEmail} onChange={e => update('applicantEmail', e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <div className="lvj-field">
                    <label htmlFor="applicantPhone">Phone</label>
                    <input id="applicantPhone" type="text" value={form.applicantPhone} onChange={e => update('applicantPhone', e.target.value)} />
                  </div>
                  <div className="lvj-field">
                    <label htmlFor="nationality">Nationality</label>
                    <input id="nationality" type="text" value={form.nationality} onChange={e => update('nationality', e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <div className="lvj-field">
                    <label htmlFor="dob">Date of birth</label>
                    <input id="dob" type="text" placeholder="YYYY-MM-DD" value={form.dateOfBirth} onChange={e => update('dateOfBirth', e.target.value)} />
                  </div>
                  <div className="lvj-field">
                    <label htmlFor="lang">Preferred language</label>
                    <select id="lang" value={form.preferredLanguage} onChange={e => update('preferredLanguage', e.target.value)}>
                      <option>English</option>
                      <option>Arabic</option>
                      <option>Portuguese</option>
                      <option>Spanish</option>
                      <option>French</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {step.key === 'matter' && (
              <>
                <div className="lvj-field">
                  <label htmlFor="serviceType">Service type</label>
                  <select id="serviceType" value={form.serviceType} onChange={e => update('serviceType', e.target.value)}>
                    {SERVICE_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <div className="hint">Service types are administered by LVJ partners. Optional at intake.</div>
                </div>
                <div className="lvj-field">
                  <label htmlFor="matterTitle">Matter title</label>
                  <input id="matterTitle" type="text" value={form.matterTitle} onChange={e => update('matterTitle', e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <div className="lvj-field">
                    <label htmlFor="priority">Priority</label>
                    <select id="priority" value={form.priority} onChange={e => update('priority', e.target.value as IntakeForm['priority'])}>
                      <option value="standard">Standard</option>
                      <option value="expedited">Expedited</option>
                      <option value="premium">Premium</option>
                    </select>
                  </div>
                  <div className="lvj-field">
                    <label htmlFor="targetFiling">Target filing</label>
                    <input id="targetFiling" type="text" placeholder="e.g. Q2 2026" value={form.targetFiling} onChange={e => update('targetFiling', e.target.value)} />
                  </div>
                </div>
                <div className="lvj-field">
                  <label htmlFor="summary">Summary for counsel</label>
                  <textarea id="summary" value={form.summaryForCounsel} onChange={e => update('summaryForCounsel', e.target.value)} />
                </div>
              </>
            )}

            {step.key === 'documents' && (
              <>
                <p style={{ fontSize: 13, color: 'var(--stone-4)', lineHeight: 1.55, marginBottom: 20 }}>
                  Upload what you can now — you can return to this step from any device.
                  Items marked required will block case creation until submitted.
                </p>
                {form.documents.map(d => (
                  <div
                    key={d.id}
                    style={{
                      display: 'grid', gridTemplateColumns: '1fr auto', gap: 12,
                      padding: '14px 0', borderBottom: '1px solid var(--rule-soft)', alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontFamily: 'var(--lvj-serif)', fontSize: 15 }}>{d.name}</div>
                      <div style={{ fontFamily: 'var(--lvj-mono)', fontSize: 10.5, color: 'var(--stone-3)', marginTop: 2 }}>
                        {d.uploaded ? 'Uploaded' : 'Awaiting upload'}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="lvj-btn ghost sm"
                      onClick={() =>
                        setForm(f => ({
                          ...f,
                          documents: f.documents.map(x => x.id === d.id ? { ...x, uploaded: !x.uploaded } : x),
                        }))
                      }
                    >
                      {d.uploaded ? 'Undo' : 'Upload'}
                    </button>
                  </div>
                ))}
              </>
            )}

            {step.key === 'review' && (
              <>
                <dl style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '12px 16px', fontSize: 13.5 }}>
                  <dt style={{ color: 'var(--stone-3)', fontSize: 10.5, letterSpacing: '.18em', textTransform: 'uppercase' }}>Applicant</dt>
                  <dd>{form.applicantName || '—'}</dd>
                  <dt style={{ color: 'var(--stone-3)', fontSize: 10.5, letterSpacing: '.18em', textTransform: 'uppercase' }}>Contact</dt>
                  <dd>{form.applicantEmail || '—'}{form.applicantPhone ? ` · ${form.applicantPhone}` : ''}</dd>
                  <dt style={{ color: 'var(--stone-3)', fontSize: 10.5, letterSpacing: '.18em', textTransform: 'uppercase' }}>Service</dt>
                  <dd>{SERVICE_TYPES.find(s => s.value === form.serviceType)?.label ?? '—'}</dd>
                  <dt style={{ color: 'var(--stone-3)', fontSize: 10.5, letterSpacing: '.18em', textTransform: 'uppercase' }}>Title</dt>
                  <dd>{form.matterTitle || '—'}</dd>
                  <dt style={{ color: 'var(--stone-3)', fontSize: 10.5, letterSpacing: '.18em', textTransform: 'uppercase' }}>Priority</dt>
                  <dd style={{ textTransform: 'capitalize' }}>{form.priority}</dd>
                  <dt style={{ color: 'var(--stone-3)', fontSize: 10.5, letterSpacing: '.18em', textTransform: 'uppercase' }}>Documents</dt>
                  <dd>{form.documents.filter(d => d.uploaded).length} of {form.documents.length} uploaded</dd>
                </dl>

                <div className="lvj-hr-gold" />

                <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 12.5, color: 'var(--stone-4)', lineHeight: 1.55 }}>
                  <input type="checkbox" checked={form.consent} onChange={e => update('consent', e.target.checked)} />
                  <span>
                    I confirm the information above is accurate to the best of my knowledge. I
                    understand that submission does not create an attorney–client relationship
                    until a separate engagement letter is signed.
                  </span>
                </label>

                {msg && (
                  <div role="status" style={{ marginTop: 16, fontSize: 12.5, color: 'var(--lvj-green)' }}>
                    {msg}
                  </div>
                )}
              </>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button type="button" className="lvj-btn ghost sm" onClick={back} disabled={current === 0}>
                ← Back
              </button>
              {current < STEPS.length - 1 ? (
                <button type="button" className="lvj-btn sm" onClick={next} disabled={!canAdvance}>
                  Continue →
                </button>
              ) : (
                <button type="button" className="lvj-btn sm" onClick={submit} disabled={!canAdvance || submitting}>
                  {submitting ? 'Submitting…' : 'Submit intake'}
                </button>
              )}
            </div>
          </div></div>

          {/* Right: context rail */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="lvj-card ivory"><div className="lvj-card-body" style={{ padding: 28 }}>
              <div className="kicker" style={{ marginBottom: 12 }}>Applicant · live summary</div>
              <div style={{ fontFamily: 'var(--lvj-serif)', fontSize: 22, marginBottom: 4 }}>
                {form.applicantName || 'New client'}
              </div>
              <div style={{ fontFamily: 'var(--lvj-mono)', fontSize: 11, color: 'var(--stone-3)' }}>
                {form.applicantEmail || '—'}{form.nationality ? ` · ${form.nationality}` : ''}
              </div>
              <div className="lvj-hr-gold" />
              <div style={{ fontFamily: 'var(--lvj-serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--stone-4)', lineHeight: 1.6 }}>
                {form.summaryForCounsel ||
                  'Add a note for counsel on Step 02. Clear context speeds first review.'}
              </div>
            </div></div>

            <div className="lvj-card"><div className="lvj-card-body" style={{ padding: 28 }}>
              <div className="kicker" style={{ color: 'var(--emerald)', marginBottom: 14 }}>Why this matters</div>
              <div style={{ fontFamily: 'var(--lvj-serif)', fontSize: 18, marginBottom: 8 }}>
                Structured intake
              </div>
              <p style={{ fontSize: 13, color: 'var(--stone-4)', lineHeight: 1.65, marginBottom: 18 }}>
                A complete intake lets counsel open a matter on the first read. Missing or
                contradictory facts are automatically flagged for human review before any
                engagement letter is issued.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 14px', fontSize: 12 }}>
                <span style={{ color: 'var(--stone-3)', fontFamily: 'var(--lvj-mono)', fontSize: 10.5, letterSpacing: '.1em' }}>Review</span>
                <span>Lawyer within 4 business hours</span>
                <span style={{ color: 'var(--stone-3)', fontFamily: 'var(--lvj-mono)', fontSize: 10.5, letterSpacing: '.1em' }}>Privacy</span>
                <span>Encrypted at rest · attorney-client protected</span>
                <span style={{ color: 'var(--stone-3)', fontFamily: 'var(--lvj-mono)', fontSize: 10.5, letterSpacing: '.1em' }}>Resume</span>
                <span>Autosaved — return from any device</span>
              </div>
            </div></div>

            <div
              style={{
                padding: '16px 20px',
                border: '1px solid var(--emerald)',
                color: 'var(--emerald)',
                display: 'flex', gap: 12, alignItems: 'center',
                background: 'var(--emerald-mist)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
                <circle cx="8" cy="8" r="6.5" />
                <path d="M8 5v3.5M8 11v.1" />
              </svg>
              <span style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                Legal team will be notified automatically when the case is created.
              </span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
