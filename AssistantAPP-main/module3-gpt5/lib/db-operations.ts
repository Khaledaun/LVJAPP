// Database abstraction layer for Module 3 (no direct DB client imports in components)
// Components call these; you can reimplement internals to use your own DB stack.

import type { InternalMessage, Payment } from '@/module3-gpt5/types'

// --- Messages ---
export async function fetchMessages(caseId: string): Promise<InternalMessage[]> {
  const res = await fetch(`/api/messages?caseId=${encodeURIComponent(caseId)}`, { cache: 'no-store' })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Failed to load messages')
  return json.messages || []
}

export async function sendMessage(params: { caseId: string; senderId: string; text: string; messageType?: 'question'|'note'|'system'; isUrgent?: boolean; parentMessageId?: string | null }) {
  const res = await fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'post', ...params }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Failed to send message')
  return json
}

export async function setMessageStatus(messageId: string, status: 'read'|'answered') {
  const res = await fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'status', messageId, status }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Failed to update status')
  return json
}

// --- Payments ---
export async function fetchPayments(caseId: string): Promise<Payment[]> {
  const res = await fetch(`/api/payments?caseId=${encodeURIComponent(caseId)}`, { cache: 'no-store' })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Failed to load payments')
  return json.payments || []
}

export async function createPayment(data: { caseId: string; title: string; amount: number; currency: string; method?: 'online'|'bank_transfer'|'cash'; dueDate?: string | null }) {
  const res = await fetch('/api/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'create', ...data }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Failed to create payment')
  return json
}

export async function generatePayLink(paymentId: string, provider?: 'stripe'|'paypal') {
  const res = await fetch('/api/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'pay-link', paymentId, provider }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Failed to create pay link')
  return json
}
