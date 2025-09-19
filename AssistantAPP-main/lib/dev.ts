import { randomUUID } from 'crypto'

export const isDevNoDB = process.env.SKIP_DB === '1'

export type CaseStatus =
  | 'new' | 'in_review' | 'awaiting_client' | 'documents_pending'
  | 'payment_due' | 'completed' | 'closed'
export type DocState = 'requested' | 'uploaded' | 'approved' | 'rejected'
export type PaymentStatus = 'unpaid' | 'paid' | 'void'

export type MockCase = {
  id: string
  title: string
  applicantName: string
  applicantEmail: string
  status: CaseStatus
  stage: string
  createdAt: string
  updatedAt: string
}

export type MockDocument = {
  id: string
  caseId: string
  name: string
  state: DocState
  rejectionReason?: string | null
  uploadedAt?: string | null
}

export type MockMessage = {
  id: string
  caseId: string
  sender: 'client' | 'staff'
  body: string
  createdAt: string
}

export type MockPayment = {
  id: string
  caseId: string
  description: string
  amountCents: number
  currency: 'USD' | 'EUR' | 'ILS'
  status: PaymentStatus
  invoiceNumber: string
  issuedAt: string
  paidAt?: string | null
}

type Store = {
  cases: MockCase[]
  docs: MockDocument[]
  messages: MockMessage[]
  payments: MockPayment[]
}

declare global {
  // eslint-disable-next-line no-var
  var __lvjMockStore: Store | undefined
}

const nowISO = () => new Date().toISOString()

function seedStore(): Store {
  const cases: MockCase[] = [
    {
      id: 'c_003',
      title: 'Tourist Extension – Ali Ahmad',
      applicantName: 'Ali Ahmad',
      applicantEmail: 'ali@example.com',
      status: 'documents_pending',
      stage: 'Intake',
      createdAt: new Date(Date.now() - 5 * 24 * 3600e3).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 3600e3).toISOString(),
    },
    {
      id: 'c_001',
      title: 'Work Visa – John Doe',
      applicantName: 'John Doe',
      applicantEmail: 'john@example.com',
      status: 'awaiting_client',
      stage: 'Documents',
      createdAt: new Date(Date.now() - 9 * 24 * 3600e3).toISOString(),
      updatedAt: new Date(Date.now() - 6 * 3600e3).toISOString(),
    },
    {
      id: 'c_002',
      title: 'Spouse Visa – Jane Roe',
      applicantName: 'Jane Roe',
      applicantEmail: 'jane@example.com',
      status: 'new',
      stage: 'Intake',
      createdAt: new Date(Date.now() - 1 * 24 * 3600e3).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 3600e3).toISOString(),
    },
  ]

  const docs: MockDocument[] = [
    { id: randomUUID(), caseId: 'c_003', name: 'Passport', state: 'uploaded', uploadedAt: nowISO() },
    { id: randomUUID(), caseId: 'c_003', name: 'Return Ticket', state: 'requested' },

    { id: randomUUID(), caseId: 'c_001', name: 'Passport', state: 'approved', uploadedAt: nowISO() },
    { id: randomUUID(), caseId: 'c_001', name: 'Employment Contract', state: 'uploaded', uploadedAt: nowISO() },
    { id: randomUUID(), caseId: 'c_001', name: 'Bank Statements', state: 'requested' },

    { id: randomUUID(), caseId: 'c_002', name: 'Marriage Certificate', state: 'requested' },
    { id: randomUUID(), caseId: 'c_002', name: 'Photo ID', state: 'uploaded', uploadedAt: nowISO() },
  ]

  const messages: MockMessage[] = [
    { id: randomUUID(), caseId: 'c_001', sender: 'staff',  body: 'Please upload your contract.', createdAt: new Date(Date.now() - 24 * 3600e3).toISOString() },
    { id: randomUUID(), caseId: 'c_001', sender: 'client', body: 'Uploaded now, thanks!',       createdAt: new Date(Date.now() - 1 * 3600e3).toISOString() },
    { id: randomUUID(), caseId: 'c_003', sender: 'staff',  body: 'We received your docs.',      createdAt: nowISO() },
  ]

  const payments: MockPayment[] = [
    { id: randomUUID(), caseId: 'c_003', description: 'Service Fee – Filing', amountCents: 75000, currency: 'USD', status: 'unpaid', invoiceNumber: 'INV-1001', issuedAt: nowISO() },
    { id: randomUUID(), caseId: 'c_001', description: 'Case Opening Fee',     amountCents: 30000, currency: 'USD', status: 'paid',   invoiceNumber: 'INV-1000', issuedAt: nowISO(), paidAt: nowISO() },
    { id: randomUUID(), caseId: 'c_002', description: 'Case Opening Fee',     amountCents: 30000, currency: 'USD', status: 'unpaid', invoiceNumber: 'INV-1002', issuedAt: nowISO() },
  ]

  return { cases, docs, messages, payments }
}

// Global singleton store (shared across all routes/process hot reloads)
const store: Store = globalThis.__lvjMockStore ?? (globalThis.__lvjMockStore = seedStore())

function touchCase(caseId: string) {
  const c = store.cases.find(x => x.id === caseId)
  if (c) c.updatedAt = nowISO()
}

/* ------------ Public helpers (used by API routes) ------------ */
export function listCasesMock(opts?: { search?: string; status?: CaseStatus | 'all'; sort?: 'updatedAt_desc' | 'updatedAt_asc' }) {
  let data = [...store.cases]
  if (opts?.search) {
    const q = opts.search.trim().toLowerCase()
    data = data.filter(
      c => c.title.toLowerCase().includes(q)
        || c.applicantName.toLowerCase().includes(q)
        || c.applicantEmail.toLowerCase().includes(q)
    )
  }
  if (opts?.status && opts.status !== 'all') data = data.filter(c => c.status === opts.status)
  if (opts?.sort === 'updatedAt_asc') data.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
  else data.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  return data
}

export function getCaseMock(id: string) {
  return store.cases.find(c => c.id === id) || null
}

export function createCaseMock(input: { title: string; applicantName: string; applicantEmail: string }): MockCase {
  const c: MockCase = {
    id: `c_${Math.random().toString(36).slice(2, 6)}`,
    title: input.title,
    applicantName: input.applicantName,
    applicantEmail: input.applicantEmail,
    status: 'new',
    stage: 'Intake',
    createdAt: nowISO(),
    updatedAt: nowISO(),
  }
  store.cases.unshift(c)
  // Seed initial checklist + invoice for new case
  store.docs.push({ id: randomUUID(), caseId: c.id, name: 'Passport',        state: 'requested' })
  store.docs.push({ id: randomUUID(), caseId: c.id, name: 'Bank Statements', state: 'requested' })
  store.payments.push({ id: randomUUID(), caseId: c.id, description: 'Service Fee – Intake', amountCents: 50000, currency: 'USD', status: 'unpaid', invoiceNumber: `INV-${Date.now()}`, issuedAt: nowISO() })
  return c
}

export function listDocumentsMock(caseId: string) {
  return store.docs.filter(d => d.caseId === caseId)
}
export function setDocumentStateMock(docId: string, state: DocState, reason?: string | null) {
  const d = store.docs.find(x => x.id === docId); if (!d) return null
  d.state = state
  d.rejectionReason = reason ?? null
  if (state === 'uploaded') d.uploadedAt = nowISO()
  touchCase(d.caseId)
  return d
}
export function upsertUploadedDocMock(caseId: string, name: string) {
  const existing = store.docs.find(d => d.caseId === caseId && d.name === name)
  if (existing) {
    existing.state = 'uploaded'; existing.uploadedAt = nowISO()
    touchCase(caseId); return existing
  }
  const d: MockDocument = { id: randomUUID(), caseId, name, state: 'uploaded', uploadedAt: nowISO() }
  store.docs.push(d); touchCase(caseId); return d
}

export function listMessagesMock(caseId: string) {
  return store.messages.filter(m => m.caseId === caseId).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}
export function addMessageMock(caseId: string, sender: 'client' | 'staff', body: string) {
  const m: MockMessage = { id: randomUUID(), caseId, sender, body, createdAt: nowISO() }
  store.messages.push(m); touchCase(caseId); return m
}

export function listPaymentsMock(caseId: string) {
  return store.payments.filter(p => p.caseId === caseId).sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
}
export function markPaymentPaidMock(paymentId: string) {
  const p = store.payments.find(x => x.id === paymentId); if (!p) return null
  p.status = 'paid'; p.paidAt = nowISO(); touchCase(p.caseId); return p
}
export function createPaymentMock(
  caseId: string,
  data: { description: string; amountCents: number; currency?: string }
) {
  return {
    id: `pm_${Math.random().toString(36).slice(2,8)}`,
    caseId,
    description: data.description,
    amountCents: data.amountCents,
    currency: data.currency || 'USD',
    status: 'unpaid',
  }
}
