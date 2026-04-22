'use client'

import * as React from 'react'
import { IconSearch, IconBell, IconMsg } from './icons'

/**
 * LVJ Topbar — breadcrumb + search (⌘K) + notification bell + messages icon.
 * Search + bell/msg icon-buttons are controlled by the parent via optional
 * handlers. The bell shows a gold dot when `hasUnread` is true.
 */

export interface LvjTopbarProps {
  crumbs: string[]
  searchPlaceholder?: string
  onSearchFocus?: () => void
  onSearch?: (value: string) => void
  onBellClick?: () => void
  onMessagesClick?: () => void
  hasUnreadNotifications?: boolean
}

export function Topbar({
  crumbs,
  searchPlaceholder = 'Search cases, clients, documents…',
  onSearchFocus,
  onSearch,
  onBellClick,
  onMessagesClick,
  hasUnreadNotifications = false,
}: LvjTopbarProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        onSearchFocus?.()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onSearchFocus])

  return (
    <div className="lvj-topbar">
      <nav aria-label="Breadcrumb" className="lvj-crumb">
        {crumbs.map((c, i) => (
          <span key={i}>
            {i > 0 && <span style={{ margin: '0 10px', color: 'var(--stone-2)' }}>/</span>}
            {i === crumbs.length - 1 ? <b>{c}</b> : c}
          </span>
        ))}
      </nav>

      <div className="search">
        <IconSearch />
        <input
          ref={inputRef}
          placeholder={searchPlaceholder}
          aria-label="Search"
          onFocus={onSearchFocus}
          onChange={e => onSearch?.(e.target.value)}
        />
        <span className="kbd" aria-hidden>⌘K</span>
      </div>

      <button
        type="button"
        className="icobtn"
        aria-label={hasUnreadNotifications ? 'Notifications (unread)' : 'Notifications'}
        onClick={onBellClick}
      >
        <IconBell />
        {hasUnreadNotifications && <span className="dot" aria-hidden />}
      </button>
      <button
        type="button"
        className="icobtn"
        aria-label="Messages"
        onClick={onMessagesClick}
      >
        <IconMsg />
      </button>
    </div>
  )
}

export default Topbar
