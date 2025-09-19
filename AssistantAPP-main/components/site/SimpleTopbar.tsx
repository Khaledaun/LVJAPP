'use client'

import Link from 'next/link'
import { signOut } from 'next-auth/react'

export default function SimpleTopbar() {
  return (
    <div className="w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/cases" className="font-semibold">LVJ Case Assistant</Link>
          <nav className="text-sm text-muted-foreground flex gap-3">
            <Link href="/cases">Cases</Link>
            <Link href="/profile">Profile</Link>
          </nav>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/signin' })}
          className="text-sm px-3 py-1.5 border rounded"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
