import * as admin from 'firebase-admin'
import type { InternalMessage } from './types'

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

export async function listMessages(caseId: string) {
  const snap = await db().collection('internal_messages').where('case_id','==', caseId).orderBy('created_at','asc').get()
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as InternalMessage[]
}

export async function postMessage({ caseId, senderId, text, messageType='question', isUrgent=false, parentMessageId=null }:
  { caseId: string; senderId: string; text: string; messageType?: 'question'|'note'|'system'; isUrgent?: boolean; parentMessageId?: string | null }) {
  const doc = await db().collection('internal_messages').add({
    case_id: caseId,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
    sender_id: senderId,
    text,
    message_type: messageType,
    is_urgent: !!isUrgent,
    status: 'unread',
    parent_message_id: parentMessageId,
    thread_order: 1,
  })
  return { messageId: doc.id }
}

export async function updateMessageStatus(messageId: string, status: 'read'|'answered') {
  await db().collection('internal_messages').doc(messageId).update({
    status,
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
    answered_at: status === 'answered' ? admin.firestore.FieldValue.serverTimestamp() : null,
  })
  return { updated: true }
}
