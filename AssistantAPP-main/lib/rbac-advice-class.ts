import 'server-only'
import type { SessionUser } from './rbac'

/**
 * `advice_class` gatekeeping (PRD §4.3 R1 / D-006 / D-013).
 *
 * Contract: only a lawyer **licensed in the matter's destination
 * jurisdiction** may set `Case.adviceClass = 'attorney_approved_advice'`.
 * Anything less strict is a UPL exposure — the matrix in PRD §7.1
 * R1 calls it "High severity". `general_information` and
 * `firm_process` are unrestricted.
 *
 * Runtime state: `User.licensedJurisdictions: string[]` is NOT in
 * the Prisma schema yet (scheduled alongside the Sprint 1 auth /
 * nav extension). Until then this helper enforces a
 * **deny-by-default** policy: nobody can set the class. Code that
 * needs to lift this (tests, seeders) sets
 * `ALLOW_ATTORNEY_APPROVED=1` explicitly in the env — never in
 * production.
 *
 * When the schema gains `licensedJurisdictions`, swap the TODO
 * block below for the real check. The A-012 audit (below — peer
 * of A-002 / A-005) verifies every call site that sets the class
 * goes through this helper, so the enforcement surface doesn't
 * quietly drift.
 */

export type AdviceClass = 'general_information' | 'firm_process' | 'attorney_approved_advice'

export interface AdviceClassContext {
  user: SessionUser
  caseDestinationJurisdiction: string | null | undefined
  targetAdviceClass: AdviceClass
  /** Optional override for dev/tests. Never set in production. */
  envAllowEscape?: string
}

export class AttorneyApprovedError extends Error {
  readonly status = 403
  constructor(public readonly reason: string) {
    super(`advice_class gatekeeping: ${reason}`)
    this.name = 'AttorneyApprovedError'
  }
}

function isLawyerRole(role: string | null | undefined): boolean {
  if (!role) return false
  return (
    role === 'LAWYER_ADMIN' ||
    role === 'LAWYER_ASSOCIATE' ||
    // `LAWYER_ASSISTANT` is deliberately excluded — assistants
    // support lawyers but cannot sign off on advice.
    false
  )
}

/**
 * Throws `AttorneyApprovedError` unless the caller is allowed to
 * set `attorney_approved_advice` on a case in the given
 * destination jurisdiction. Returns void on pass.
 *
 * The only path that passes today (without `ALLOW_ATTORNEY_APPROVED=1`
 * escape hatch) is: a `LAWYER_ADMIN` / `LAWYER_ASSOCIATE` whose
 * `licensedJurisdictions` includes the case's
 * `destinationJurisdiction`. Since the field doesn't exist yet,
 * this denies in prod and warns in dev.
 */
export function assertCanSetAdviceClass(ctx: AdviceClassContext): void {
  // `general_information` and `firm_process` are always permitted.
  if (ctx.targetAdviceClass !== 'attorney_approved_advice') return

  const escape = ctx.envAllowEscape ?? process.env.ALLOW_ATTORNEY_APPROVED
  if (escape === '1' && process.env.NODE_ENV !== 'production') {
    console.warn(
      '[advice-class] ALLOW_ATTORNEY_APPROVED=1 escape hatch used in dev — never set in production',
    )
    return
  }

  if (!isLawyerRole(ctx.user.role)) {
    throw new AttorneyApprovedError(
      `role ${ctx.user.role} may not set attorney_approved_advice (LAWYER_ADMIN or LAWYER_ASSOCIATE only)`,
    )
  }

  if (!ctx.caseDestinationJurisdiction) {
    throw new AttorneyApprovedError(
      'case.destinationJurisdiction is unset — cannot verify licensing',
    )
  }

  // TODO(schema): once User.licensedJurisdictions[] lands (Sprint 1
  // auth / nav extension), replace this block with:
  //   const licensed = (ctx.user as any).licensedJurisdictions ?? []
  //   if (!licensed.includes(ctx.caseDestinationJurisdiction)) throw ...
  //
  // Until then, deny. A lawyer trying to approve PT advice needs the
  // escape hatch in dev; prod stays locked.
  throw new AttorneyApprovedError(
    `User.licensedJurisdictions schema field missing — deny-by-default until Sprint 1 auth extension`,
  )
}

/**
 * Sugar for route handlers. Returns `null` on pass or a 403
 * `NextResponse` on fail. Pair with `runAuthed` or call inside
 * a handler after the user has been resolved.
 */
export async function guardAdviceClass(
  ctx: AdviceClassContext,
): Promise<Response | null> {
  try {
    assertCanSetAdviceClass(ctx)
    return null
  } catch (err) {
    if (err instanceof AttorneyApprovedError) {
      const { NextResponse } = await import('next/server')
      return NextResponse.json(
        { ok: false, error: 'advice_class_gatekeeping', reason: err.reason },
        { status: 403 },
      )
    }
    throw err
  }
}
