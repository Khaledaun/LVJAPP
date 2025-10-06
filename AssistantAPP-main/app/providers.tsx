'use client'

import React, { PropsWithChildren, useEffect } from 'react'
import { SessionProvider } from 'next-auth/react'

// Mock session for testing when SKIP_AUTH is enabled
const mockSession = {
  user: {
    id: 'mock-user-id',
    email: 'admin@lvj.local',
    name: 'Sarah Johnson',
    role: 'lvj_admin'
  },
  expires: '2099-12-31T23:59:59.999Z'
}

// A resilient Session provider that won't crash if NEXTAUTH is misconfigured during build.
// If NEXTAUTH_URL/SECRET are missing in production, we still render children; sign-in will fail with a helpful error.
export default function Providers({ children }: PropsWithChildren) {
  const isSkipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === '1'
  
  return (
    <SessionProvider 
      session={isSkipAuth ? mockSession as any : undefined}
      refetchOnWindowFocus={false}
    >
      {children}
    </SessionProvider>
  )
}
