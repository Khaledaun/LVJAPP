import * as React from 'react'
import { Sidebar, type LvjSidebarProps } from './sidebar'
import { Topbar, type LvjTopbarProps } from './topbar'

/**
 * AppShell — staff layout with sidebar + topbar + page container.
 * Use `rtl` to render Arabic right-to-left with the sidebar on the right.
 */
export interface AppShellProps {
  crumbs: LvjTopbarProps['crumbs']
  children: React.ReactNode
  sidebar?: LvjSidebarProps
  topbar?: Omit<LvjTopbarProps, 'crumbs'>
  rtl?: boolean
}

export function AppShell({ crumbs, children, sidebar, topbar, rtl }: AppShellProps) {
  return (
    <div className={'lvj lvj-app' + (rtl ? ' rtl' : '')} dir={rtl ? 'rtl' : 'ltr'}>
      <Sidebar {...sidebar} />
      <div className="lvj-main">
        <Topbar crumbs={crumbs} {...topbar} />
        <div className="lvj-page">{children}</div>
      </div>
    </div>
  )
}

export default AppShell
