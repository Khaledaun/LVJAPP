'use client'
import React from 'react'

type TabKey = 'overview' | 'documents' | 'messages' | 'payments'

export function CaseTabs({
  active,
  onChange,
}: {
  active: TabKey
  onChange: (k: TabKey) => void
}) {
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'overview',  label: 'Overview' },
    { key: 'documents', label: 'Documents' },
    { key: 'messages',  label: 'Messages' },
    { key: 'payments',  label: 'Payments' },
  ]
  return (
    <div className="border-b mb-4 flex gap-2">
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={[
            'px-3 py-2 text-sm',
            active === t.key ? 'border-b-2 border-foreground font-medium' : 'text-muted-foreground'
          ].join(' ')}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
