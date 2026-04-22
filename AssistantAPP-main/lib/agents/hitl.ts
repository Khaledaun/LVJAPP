import 'server-only'
import { getPrisma } from '../db'
import type { AgentHITLGate } from './types'

/**
 * HITL primitive — create + resolve approval rows.
 * docs/AGENT_OS.md §10.2.
 *
 * Agents do not import this module directly during a run — the `invoke`
 * wrapper manages gate creation from the manifest. Admin UI and the HITL
 * resolution endpoint call `approve` / `reject` / `expireIfStale`.
 */

export interface RequestApprovalInput {
  agentId: string
  gate: AgentHITLGate
  correlationId: string
  caseId?: string
  leadId?: string
  draftId?: string
  payload: Record<string, unknown>
}

export async function requestApproval(input: RequestApprovalInput): Promise<string> {
  const prisma = await getPrisma()
  const slaDueAt = new Date(Date.now() + input.gate.slaHours * 60 * 60 * 1000)
  const row = await prisma.hITLApproval.create({
    data: {
      agentId:       input.agentId,
      gateId:        input.gate.id,
      correlationId: input.correlationId,
      caseId:        input.caseId ?? null,
      leadId:        input.leadId ?? null,
      draftId:       input.draftId ?? null,
      payload:       input.payload as any,
      approverRole:  input.gate.approverRole,
      slaDueAt,
    },
    select: { id: true },
  })
  return row.id as string
}

export async function approve(id: string, approverUserId: string, diff?: unknown): Promise<void> {
  const prisma = await getPrisma()
  await prisma.hITLApproval.update({
    where: { id },
    data: {
      status: 'APPROVED',
      decidedBy: approverUserId,
      decidedAt: new Date(),
      diff: (diff ?? null) as any,
    },
  })
}

export async function reject(id: string, approverUserId: string, reason: string): Promise<void> {
  const prisma = await getPrisma()
  await prisma.hITLApproval.update({
    where: { id },
    data: {
      status: 'REJECTED',
      decidedBy: approverUserId,
      decidedAt: new Date(),
      reason,
    },
  })
}

/** Sweep — call from a cron handler; flips PENDING rows past slaDueAt to EXPIRED. */
export async function expireStale(now: Date = new Date()): Promise<number> {
  const prisma = await getPrisma()
  const result = await prisma.hITLApproval.updateMany({
    where: { status: 'PENDING', slaDueAt: { lt: now } },
    data: { status: 'EXPIRED' },
  })
  return result.count as number
}

/** Fetch pending approvals for the admin queue, newest first. */
export async function listPending(limit = 50): Promise<any[]> {
  const prisma = await getPrisma()
  return prisma.hITLApproval.findMany({
    where: { status: 'PENDING' },
    orderBy: { slaDueAt: 'asc' },
    take: limit,
  })
}
