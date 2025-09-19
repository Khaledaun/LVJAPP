type Role = 'ADMIN' | 'STAFF' | 'CLIENT'
type User = { id: string; role: Role } | null

export type UserRole = 'client' | 'lvj_admin' | 'lvj_team' | 'lvj_marketing' | 'lawyer_admin' | 'lawyer_associate' | 'lawyer_assistant';

function devBypassUser(): User {
  if (process.env.SKIP_AUTH === '1' || process.env.NEXT_PUBLIC_SKIP_AUTH === '1') {
    return { id: 'dev-bypass', role: 'ADMIN' }
  }
  return null
}

function forbidden(): never {
  const err: any = new Error('forbidden')
  err.status = 403
  throw err
}

export async function assertCaseAccess(_caseId: string): Promise<{ user: User }> {
  const user = devBypassUser()
  if (user) return { user }
  // TODO: implement real session & case access checks
  forbidden()
}

export async function assertOrgAccess(_orgId: string): Promise<{ user: User }> {
  const user = devBypassUser()
  if (user) return { user }
  // TODO: implement real session & org access checks
  forbidden()
}

export function getRoleDisplayName(role: string): string {
  const normalizedRole = role.toUpperCase();
  switch (normalizedRole) {
    case 'ADMIN':
      return 'Administrator';
    case 'STAFF':
      return 'Staff Member';
    case 'CLIENT':
      return 'Client';
    default:
      return 'User';
  }
}

// Role-based route access control
export function canAccessRoute(userRole: UserRole, pathname: string): boolean {
  // In demo mode, allow all access
  if (process.env.SKIP_AUTH === '1' || process.env.NEXT_PUBLIC_SKIP_AUTH === '1') {
    return true;
  }

  // Admin roles have access to everything
  if (userRole === 'lvj_admin') {
    return true;
  }

  // Basic route access logic - can be expanded
  const adminOnlyRoutes = ['/admin', '/settings/system'];
  const lawyerRoutes = ['/cases', '/clients', '/documents'];
  const clientRoutes = ['/my-case', '/documents/view'];

  // Check admin-only routes
  if (adminOnlyRoutes.some(route => pathname.startsWith(route))) {
    return (userRole as string) === 'lvj_admin';
  }

  // Check lawyer routes
  if (lawyerRoutes.some(route => pathname.startsWith(route))) {
    return userRole.startsWith('lawyer_') || userRole.startsWith('lvj_');
  }

  // Check client routes
  if (clientRoutes.some(route => pathname.startsWith(route))) {
    return userRole === 'client';
  }

  // Default: allow access to other routes
  return true;
}
