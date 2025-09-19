import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

const SKIP =
  process.env.SKIP_AUTH === '1' ||
  process.env.NEXT_PUBLIC_SKIP_AUTH === '1'

export default SKIP
  ? function mockBypass() {
      return NextResponse.next()
    }
  : withAuth({
      pages: { signIn: '/signin' }, // ← our custom page
    })

export const config = {
  matcher: ['/', '/cases/:path*', '/profile', '/settings', '/admin/:path*'],
}
