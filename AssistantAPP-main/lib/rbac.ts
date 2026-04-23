// Note: no `import 'server-only'` — this file mixes pure helpers used by client
// components (getRoleDisplayName, canAccessRoute) with server-only async guards
// (assertCaseAccess, assertOrgAccess, assertStaff). Server guards dynamically
// import their deps to avoid pulling next-auth / prisma into the client bundle.

export type UserRole =
  | 'client'
  | 'lvj_admin'
  | 'lvj_team'
  | 'lvj_marketing'
  | 'lawyer_admin'
  | 'lawyer_associate'
  | 'lawyer_assistant'

export type SessionUser = {
  id: string
  email?: string | null
  role: string
  officeId?: string | null
  // Sprint 0.5 · D-023 — null for platform staff (LVJ_*), non-null for
  // tenant users. Populated from the session cookie; loaded in
  // loadSessionUser() below.
  tenantId?: string | null
}

type AccessResult = { user: SessionUser }

const GLOBAL_ADMINS = new Set(['ADMIN', 'LVJ_ADMIN', 'lvj_admin'])
const LAWYER_ADMINS = new Set(['LAWYER_ADMIN', 'lawyer_admin'])
const STAFF_ROLES = new Set([
  'STAFF', 'ADMIN', 'LVJ_ADMIN', 'LVJ_TEAM', 'LVJ_MARKETING',
  'LAWYER_ADMIN', 'LAWYER_ASSOCIATE', 'LAWYER_ASSISTANT',
  'lvj_admin', 'lvj_team', 'lvj_marketing',
  'lawyer_admin', 'lawyer_associate', 'lawyer_assistant',
])

function devBypassUser(): SessionUser | null {
  if (process.env.SKIP_AUTH === '1' || process.env.NEXT_PUBLIC_SKIP_AUTH === '1') {
    // Dev bypass is a platform-staff user (tenantId=null) so sandbox
    // tests can freely read across tenants via runPlatformOp().
    return { id: 'dev-bypass', role: 'LVJ_ADMIN', officeId: null, tenantId: null }
  }
  return null
}

function forbidden(message = 'forbidden'): never {
  const err: any = new Error(message)
  err.status = 403
  throw err
}

function unauthorized(): never {
  const err: any = new Error('unauthorized')
  err.status = 401
  throw err
}

async function loadSessionUser(): Promise<SessionUser | null> {
  try {
    const nextAuth = await import('next-auth')
    const authMod = await import('@/lib/auth')
    const getServerSession = (nextAuth as any).getServerSession
    const getAuthOptions = (authMod as any).getAuthOptions
    const session = await getServerSession(getAuthOptions())
    const u: any = (session as any)?.user
    if (!u?.id) return null
    return {
      id: u.id,
      email: u.email ?? null,
      role: u.role ?? 'CLIENT',
      officeId: u.officeId ?? null,
      tenantId: u.tenantId ?? null,
    }
  } catch {
    return null
  }
}

async function loadPrisma(): Promise<any> {
  const dbMod = await import('@/lib/db')
  return (dbMod as any).getPrisma()
}

export function isGlobalAdmin(role: string | null | undefined): boolean {
  if (!role) return false
  return GLOBAL_ADMINS.has(role)
}

export function isStaff(role: string | null | undefined): boolean {
  if (!role) return false
  return STAFF_ROLES.has(role)
}

/**
 * Verify the current session user may access the given case.
 * Access is granted when the user is:
 *   - a global admin (ADMIN / LVJ_ADMIN), OR
 *   - the case's client / caseManager / lawyer, OR
 *   - a lawyer_admin attached to the same office as the case.
 */
export async function assertCaseAccess(caseId: string): Promise<AccessResult> {
  const bypass = devBypassUser()
  if (bypass) return { user: bypass }

  const user = await loadSessionUser()
  if (!user) unauthorized()

  if (isGlobalAdmin(user.role)) return { user }

  const prisma = await loadPrisma()
  const c = await prisma.case.findUnique({
    where: { id: caseId },
    select: { id: true, clientId: true, caseManagerId: true, lawyerId: true, officeId: true },
  })
  if (!c) forbidden('case not found')

  if (c.clientId === user.id || c.caseManagerId === user.id || c.lawyerId === user.id) {
    return { user }
  }

  if (LAWYER_ADMINS.has(user.role) && user.officeId && c.officeId && user.officeId === c.officeId) {
    return { user }
  }

  forbidden('no case access')
}

/**
 * Verify the current session user may access the given office (org).
 * Access is granted when the user is a global admin or belongs to the office.
 */
export async function assertOrgAccess(orgId: string): Promise<AccessResult> {
  const bypass = devBypassUser()
  if (bypass) return { user: bypass }

  const user = await loadSessionUser()
  if (!user) unauthorized()

  if (isGlobalAdmin(user.role)) return { user }
  if (user.officeId && user.officeId === orgId) return { user }

  forbidden('no org access')
}

/** Assert the user is authenticated staff (any non-client role). */
export async function assertStaff(): Promise<AccessResult> {
  const bypass = devBypassUser()
  if (bypass) return { user: bypass }
  const user = await loadSessionUser()
  if (!user) unauthorized()
  if (!isStaff(user.role)) forbidden('staff only')
  return { user }
}

export function getRoleDisplayName(role: string): string {
  const normalized = (role || '').toUpperCase()
  switch (normalized) {
    case 'ADMIN':
    case 'LVJ_ADMIN':       return 'Administrator'
    case 'STAFF':
    case 'LVJ_TEAM':        return 'Staff Member'
    case 'LVJ_MARKETING':   return 'Marketing'
    case 'LAWYER_ADMIN':    return 'Managing Attorney'
    case 'LAWYER_ASSOCIATE':return 'Associate Attorney'
    case 'LAWYER_ASSISTANT':return 'Legal Assistant'
    case 'CLIENT':          return 'Client'
    default:                return 'User'
  }
}

// Role-based route access control
export function canAccessRoute(userRole: UserRole | string, pathname: string): boolean {
  if (process.env.SKIP_AUTH === '1' || process.env.NEXT_PUBLIC_SKIP_AUTH === '1') {
    return true
  }

  const role = (userRole || '').toString()

  if (isGlobalAdmin(role)) return true

  const adminOnlyRoutes = ['/admin', '/settings/system', '/operations']
  const staffRoutes = ['/cases', '/clients', '/documents', '/dashboard', '/reports', '/intake', '/calendar', '/notifications', '/partners', '/predictor']
  const clientRoutes = ['/my-case', '/documents/view']

  if (adminOnlyRoutes.some(r => pathname.startsWith(r))) {
    return role === 'lvj_admin' || role === 'LVJ_ADMIN' || role === 'ADMIN'
  }

  if (staffRoutes.some(r => pathname.startsWith(r))) {
    return isStaff(role)
  }

  if (clientRoutes.some(r => pathname.startsWith(r))) {
    return role === 'client' || role === 'CLIENT'
  }

  return true
}
