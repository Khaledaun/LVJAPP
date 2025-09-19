'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { signOut } from 'next-auth/react'
import SimpleTopbar from '@/components/site/SimpleTopbar'

export default function ProfilePage() {
  const [session, setSession] = useState<any>(null)
  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(setSession).catch(()=>{})
  }, [])
  const email = session?.user?.email ?? '(unknown)'

  return (
    <main>
      <SimpleTopbar />
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <Link href="/cases" className="text-sm underline underline-offset-4">&larr; Back to cases</Link>
        <h1 className="text-2xl font-semibold">Your Profile</h1>
        <div className="rounded border p-4">
          <div className="text-sm">Signed in as</div>
          <div className="text-lg font-medium">{email}</div>
        </div>
        <button onClick={() => signOut({ callbackUrl: '/signin' })} className="px-3 py-2 border rounded">Sign out</button>
      </div>
    </main>
  )
}
