import AppShell from '@/components/lvj/app-shell'
import { assertStaff } from '@/lib/rbac'
import { listPending } from '@/lib/agents/hitl'
import { ApprovalsClient, type PendingRow } from './ApprovalsClient'

export const dynamic = 'force-dynamic'

/**
 * /admin/approvals — HITL queue.
 * docs/AGENT_OS.md §10.
 *
 * Server component loads pending rows; client sub-tree handles the
 * approve / reject actions.
 */
export default async function ApprovalsPage() {
  await assertStaff()
  let pending: PendingRow[] = []
  try {
    const rows = await listPending(100)
    pending = rows.map(r => ({
      id: r.id,
      agentId: r.agentId,
      gateId: r.gateId,
      correlationId: r.correlationId,
      caseId: r.caseId,
      leadId: r.leadId,
      approverRole: r.approverRole,
      createdAt: r.createdAt.toISOString(),
      slaDueAt: r.slaDueAt.toISOString(),
      payload: r.payload,
    }))
  } catch {
    // DB unavailable — render an empty queue; the client will show the empty state.
  }

  return (
    <AppShell
      crumbs={['Administration', 'HITL Approvals']}
      sidebar={{ user: { name: 'Laila Al-Jabari', role: 'Partner · Admin', initial: 'L' } }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        <div className="lvj-page-head">
          <div>
            <div className="kicker">Human in the loop</div>
            <h1>Approvals queue</h1>
            <p className="lede">
              Every agent action that requires partner or counsel review lands here.
              Queue is sorted by SLA — review the top-most item first.
            </p>
          </div>
        </div>

        <ApprovalsClient initial={pending} />
      </div>
    </AppShell>
  )
}
