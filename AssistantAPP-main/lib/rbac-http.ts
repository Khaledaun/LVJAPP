import 'server-only'
import { NextResponse } from 'next/server'
import {
  assertCaseAccess as _assertCaseAccess,
  assertOrgAccess as _assertOrgAccess,
  assertStaff as _assertStaff,
  type SessionUser,
} from './rbac'

// HTTP-layer auth guards. Wraps the assert* helpers from lib/rbac.ts
// (which throw on failure) so API route handlers can turn an auth
// failure into a proper 401 / 403 NextResponse without boilerplate
// try/catch at every call site.
//
// Usage in a route:
//   const g = await guardCaseAccess(params.id)
//   if (!g.ok) return g.response
//   // ... handler continues, g.user is available
//
// This file is server-only (imports next/server). lib/rbac.ts is
// deliberately NOT server-only because it also exports pure helpers
// used by client components (getRoleDisplayName, canAccessRoute).
// Keeping HTTP response wiring here preserves that split.

export type GuardOk = { ok: true; user: SessionUser }
export type GuardFail = { ok: false; response: Response }
export type GuardResult = GuardOk | GuardFail

function toErrorResponse(err: any): Response {
  const status = typeof err?.status === 'number' ? err.status : 401
  const message = typeof err?.message === 'string' ? err.message : 'unauthorized'
  return NextResponse.json({ error: message }, { status })
}

export async function guardCaseAccess(caseId: string): Promise<GuardResult> {
  try {
    const r = await _assertCaseAccess(caseId)
    return { ok: true, user: r.user }
  } catch (err) {
    return { ok: false, response: toErrorResponse(err) }
  }
}

export async function guardOrgAccess(orgId: string): Promise<GuardResult> {
  try {
    const r = await _assertOrgAccess(orgId)
    return { ok: true, user: r.user }
  } catch (err) {
    return { ok: false, response: toErrorResponse(err) }
  }
}

export async function guardStaff(): Promise<GuardResult> {
  try {
    const r = await _assertStaff()
    return { ok: true, user: r.user }
  } catch (err) {
    return { ok: false, response: toErrorResponse(err) }
  }
}
