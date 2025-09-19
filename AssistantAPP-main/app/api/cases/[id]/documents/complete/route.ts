import { logAudit } from '@/lib/audit'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/db'
import { assertCaseAccess } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

export const runtime = 'nodejs'
export const revalidate = 0
export const fetchCache = 'force-no-store'

function normalizeDocCreate(caseId: string, body: any) {
  return {
    caseId,
    name: String(body.name ?? body.filename ?? 'Document'),
    mimeType: body?.mimeType ? String(body.mimeType)
      : body?.contentType ? String(body.contentType)
      : null,
    sizeBytes: body?.sizeBytes != null ? Number(body.sizeBytes)
      : body?.size != null ? Number(body.size)
      : null,
    gcsBucket: process.env.GCS_BUCKET ?? null,
    gcsObject: String(body.objectName ?? ''),
    // Force the correct state at create time
    state: 'uploaded' as any,
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    if (!body?.objectName) {
      return NextResponse.json({ ok: false, reason: 'missing-objectName' }, { status: 400 })
    }

    await assertCaseAccess(params.id)
    const prisma = await getPrisma()
    const data: any = normalizeDocCreate(params.id, body)

    const doc = await prisma.document.create({ data })
    await logAudit(prisma, { action: 'document.upload.complete', caseId: params.id, diff: { documentId: doc.id, objectName: data.gcsObject } });
    return NextResponse.json({ ok: true, item: doc })
  } catch (err: any) {
    console.error('/documents/complete error:', err)
    return NextResponse.json(
      { ok: false, error: err?.code ?? err?.name ?? 'ERR', message: err?.message ?? String(err) },
      { status: 500 }
    )
  }
}
