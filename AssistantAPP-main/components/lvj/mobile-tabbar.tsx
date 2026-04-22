'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { IconDashboard, IconDoc, IconMsg, IconUser } from './icons'

/**
 * Mobile client-portal bottom tab bar.
 * Ported from the design pack's iOS mock. Active tab gets ink text and a
 * gold dot indicator; inactive tabs are stone-3.
 */

interface Tab {
  key: string
  label: string
  href: string
  icon: React.ReactNode
}

const DEFAULT_TABS: Tab[] = [
  { key: 'case', label: 'Case',     href: '/my-case',   icon: <IconDashboard width={20} height={20} /> },
  { key: 'docs', label: 'Docs',     href: '/documents', icon: <IconDoc       width={20} height={20} /> },
  { key: 'msg',  label: 'Messages', href: '/messages',  icon: <IconMsg       width={20} height={20} /> },
  { key: 'prof', label: 'Profile',  href: '/profile',   icon: <IconUser      width={20} height={20} /> },
]

export function MobileTabBar({ tabs = DEFAULT_TABS }: { tabs?: Tab[] }) {
  const pathname = usePathname() ?? ''
  return (
    <nav
      aria-label="Client portal navigation"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${tabs.length},1fr)`,
        padding: '14px 14px 26px',
        borderTop: '1px solid var(--rule)',
        background: 'var(--paper)',
        fontFamily: 'var(--lvj-sans)',
      }}
    >
      {tabs.map(t => {
        const active = pathname === t.href || pathname.startsWith(t.href + '/')
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={active ? 'page' : undefined}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 5,
              color: active ? 'var(--ink)' : 'var(--stone-3)',
              textDecoration: 'none',
            }}
          >
            <span style={{ width: 20, height: 20 }}>{t.icon}</span>
            <span style={{ fontSize: 10, letterSpacing: '.08em' }}>{t.label}</span>
            {active && (
              <span
                aria-hidden
                style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--gold)' }}
              />
            )}
          </Link>
        )
      })}
    </nav>
  )
}

export default MobileTabBar
