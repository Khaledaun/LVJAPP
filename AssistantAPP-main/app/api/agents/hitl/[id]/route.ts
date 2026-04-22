import { NextRequest, NextResponse } from 'next/server'
import { assertStaff } from '@/lib/rbac'
import { approve, reject } from '@/lib/agents/hitl'
import { dispatch } from '@/lib/events'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  let invoker: string
  try {
    const { user } = await assertStaff()
    invoker = user.id
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'forbidden' }, { status: err?.status ?? 403 })
  }

  let body: any
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }

  const decision = body?.decision
  if (decision !== 'approve' && decision !== 'reject') {
    return NextResponse.json({ error: 'decision must be "approve" or "reject"' }, { status: 400 })
  }

  try {
    if (decision === 'approve') {
      await approve(params.id, invoker, body?.diff)
      await dispatch('hitl.approved', { id: params.id, approverId: invoker })
    } else {
      const reason = String(body?.reason ?? '').trim()
      if (!reason) return NextResponse.json({ error: 'reason required' }, { status: 400 })
      await reject(params.id, invoker, reason)
      await dispatch('hitl.rejected', { id: params.id, approverId: invoker, reason })
    }
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal error' }, { status: 500 })
  }
}
