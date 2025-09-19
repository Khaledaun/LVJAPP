import * as admin from 'firebase-admin'
import Stripe from 'stripe'
import type { Payment, PaymentMethod } from './types'

let _app: admin.app.App | null = null
function getAdmin() {
  if (_app) return _app
  if (!admin.apps.length) {
    _app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      } as any),
      projectId: process.env.FIREBASE_PROJECT_ID,
    })
  } else {
    _app = admin.app()
  }
  return _app!
}
export function db() { return getAdmin().firestore() }

export async function listPayments(caseId: string): Promise<Payment[]> {
  const snap = await db().collection('payments').where('case_id','==', caseId).orderBy('created_at','desc').get()
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Payment[]
}

export async function createPayment({ caseId, title, amount, currency, method='online', dueDate=null }:
  { caseId: string; title: string; amount: number; currency: string; method?: PaymentMethod; dueDate?: string | null }) {
  const doc = await db().collection('payments').add({
    case_id: caseId,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
    title,
    amount,
    currency,
    status: 'pending',
    payment_method: method,
    due_date: dueDate,
  })
  return { paymentId: doc.id }
}

export async function createPayLink({ paymentId, provider='stripe' }: { paymentId: string; provider?: 'stripe'|'paypal' }) {
  const ref = db().collection('payments').doc(paymentId)
  const snap = await ref.get()
  if (!snap.exists) throw new Error('Payment not found')
  const p = snap.data() as any
  if (p.payment_method !== 'online') throw new Error('Not online payment method')
  if (provider === 'stripe') {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe not configured')
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: '2024-06-20' as any })
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price_data: { currency: p.currency, product_data: { name: p.title || `Payment ${paymentId}` }, unit_amount: Math.round(p.amount * 100) }, quantity: 1 }],
      success_url: `${process.env.PUBLIC_BASE_URL || ''}/payments/${paymentId}?status=success`,
      cancel_url: `${process.env.PUBLIC_BASE_URL || ''}/payments/${paymentId}?status=cancel`,
      metadata: { paymentId },
    })
    await ref.update({ pay_link: session.url })
    return { url: session.url, provider: 'stripe' }
  }
  const url = `${process.env.PUBLIC_BASE_URL || ''}/paypal/pay?pid=${paymentId}`
  await ref.update({ pay_link: url })
  return { url, provider: 'paypal' }
}

export async function sendPaymentReminder({ paymentId, to, subject='Payment Reminder', html }: { paymentId: string; to: string[]; subject?: string; html: string }) {
  // This function would call the email provider; it is intentionally a pass-through
  return { queued: true }
}
