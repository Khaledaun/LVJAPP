import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const caseId = req.nextUrl.searchParams.get('caseId')
  if (!caseId) return Response.json({ error: 'caseId required' }, { status: 400 })
  // Implementer: return messages for caseId
  return Response.json({ messages: [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action } = body
  if (action === 'post') {
    const { caseId, senderId, text } = body
    if (!caseId || !senderId || !text) return Response.json({ error: 'Missing fields' }, { status: 400 })
    // Implementer: store message
    return Response.json({ messageId: 'msg_placeholder' })
  }
  if (action === 'status') {
    const { messageId, status } = body
    if (!messageId || !['read','answered'].includes(status)) return Response.json({ error: 'Invalid status' }, { status: 400 })
    // Implementer: update status
    return Response.json({ updated: true })
  }
  if (action === 'notify') {
    const { to, subject, html } = body
    if (!to || !subject || !html) return Response.json({ error: 'to, subject, html required' }, { status: 400 })
    // Implementer: send email via your provider
    return Response.json({ sent: true })
  }
  return Response.json({ error: 'Unsupported action' }, { status: 400 })
}
