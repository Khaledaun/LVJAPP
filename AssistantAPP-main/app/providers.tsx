'use client'

import React, { PropsWithChildren, useEffect } from 'react'
import { SessionProvider } from 'next-auth/react'

// A resilient Session provider that won't crash if NEXTAUTH is misconfigured during build.
// If NEXTAUTH_URL/SECRET are missing in production, we still render children; sign-in will fail with a helpful error.
export default function Providers({ children }: PropsWithChildren) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      {children}
    </SessionProvider>
  )
}
