'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  IconDashboard, IconFolder, IconPlus, IconCalendar, IconMsg,
  IconChart, IconBell, IconDoc, IconUser, IconGear,
} from './icons'

/**
 * LVJ Sidebar — ink ground, ivory type, gold active rail.
 * Nav structure ported from the design pack. Items can be extended
 * (see CLAUDE.md Sprint list) — Notifications / Predictor / Partners /
 * Operations arrive in later sprints and can append additional groups.
 */

export interface SidebarUser {
  name: string
  role: string
  initial?: string
}

interface NavItem {
  key: string
  icon: React.ReactNode
  label: string
  href: string
  badge?: string | number
}

interface NavGroup {
  group: string
  items: NavItem[]
}

const DEFAULT_NAV: NavGroup[] = [
  {
    group: 'Workspace',
    items: [
      { key: 'dash',   icon: <IconDashboard />, label: 'Dashboard',   href: '/dashboard' },
      { key: 'cases',  icon: <IconFolder />,    label: 'Cases',       href: '/cases' },
      { key: 'intake', icon: <IconPlus />,      label: 'New Intake',  href: '/intake' },
      { key: 'cal',    icon: <IconCalendar />,  label: 'Calendar',    href: '/calendar' },
      { key: 'msg',    icon: <IconMsg />,       label: 'Messages',    href: '/messages' },
    ],
  },
  {
    group: 'Insight',
    items: [
      { key: 'rep',   icon: <IconChart />, label: 'Reports',       href: '/reports' },
      { key: 'notif', icon: <IconBell />,  label: 'Notifications', href: '/notifications' },
    ],
  },
  {
    group: 'Administration',
    items: [
      { key: 'svc',  icon: <IconDoc />,  label: 'Service Types', href: '/admin/service-types' },
      { key: 'team', icon: <IconUser />, label: 'Team & Roles',  href: '/admin/team' },
      { key: 'set',  icon: <IconGear />, label: 'Settings',      href: '/admin/settings' },
    ],
  },
]

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false
  if (href === '/dashboard') return pathname === href
  return pathname === href || pathname.startsWith(href + '/')
}

export interface LvjSidebarProps {
  user?: SidebarUser
  nav?: NavGroup[]
  version?: string
  badges?: Record<string, string | number>
}

export function Sidebar({
  user,
  nav = DEFAULT_NAV,
  version = 'CMS · v2.4',
  badges = {},
}: LvjSidebarProps) {
  const pathname = usePathname()
  return (
    <aside className="lvj-sidebar" aria-label="Primary navigation">
      <div className="lvj-sb-mark">
        <span className="wm">LVJ</span>
        <span className="ver">{version}</span>
      </div>
      <div className="lvj-sb-sub">Immigration · Counsel Desk</div>

      {nav.map(g => (
        <div className="lvj-sb-group" key={g.group}>
          <div className="lvj-sb-group-label">{g.group}</div>
          {g.items.map(it => {
            const active = isActive(pathname, it.href)
            const badge = it.badge ?? badges[it.key]
            return (
              <Link
                key={it.key}
                href={it.href}
                className={'lvj-sb-item' + (active ? ' active' : '')}
                aria-current={active ? 'page' : undefined}
              >
                <span className="ico">{it.icon}</span>
                <span>{it.label}</span>
                {badge !== undefined && <span className="badge">{badge}</span>}
              </Link>
            )
          })}
        </div>
      ))}

      {user && (
        <div className="lvj-sb-foot">
          <div className="av">{user.initial ?? user.name.charAt(0)}</div>
          <div className="who">
            <div className="nm">{user.name}</div>
            <div className="rl">{user.role}</div>
          </div>
        </div>
      )}
    </aside>
  )
}

export default Sidebar
