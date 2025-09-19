import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const now = Date.now()
  const mk = (minsAgo: number, text: string) => ({ id: `${minsAgo}`, when: new Date(now - minsAgo*60*1000).toISOString(), text })
  return NextResponse.json({
    timeline: [
      mk(5, 'Message sent by client'),
      mk(30, 'Document uploaded: Passport'),
      mk(180, 'Case created'),
    ]
  })
}
