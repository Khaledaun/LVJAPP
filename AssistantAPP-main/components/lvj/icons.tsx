import * as React from 'react'

// Hairline 16px icon set, ported from the LVJ Case Management design pack.
// Every icon is a stroked path using currentColor so callers control hue via
// text color (sidebar stone-3 → gold-soft on active, topbar stone-4, etc.).

type Props = React.SVGProps<SVGSVGElement>

const base = (p: Props) => ({
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.1,
  ...p,
})

export const IconDashboard = (p: Props) => (
  <svg {...base(p)}>
    <rect x="2" y="2" width="5" height="5" />
    <rect x="9" y="2" width="5" height="5" />
    <rect x="2" y="9" width="5" height="5" />
    <rect x="9" y="9" width="5" height="5" />
  </svg>
)

export const IconFolder = (p: Props) => (
  <svg {...base(p)}>
    <path d="M1.5 4h4l1.2 1.5H14.5v8H1.5z" />
  </svg>
)

export const IconPlus = (p: Props) => (
  <svg {...base(p)}>
    <path d="M8 2v12M2 8h12" />
  </svg>
)

export const IconUser = (p: Props) => (
  <svg {...base(p)}>
    <circle cx="8" cy="6" r="3" />
    <path d="M2 14c0-3 3-5 6-5s6 2 6 5" />
  </svg>
)

export const IconBell = (p: Props) => (
  <svg {...base(p)}>
    <path d="M4 12h8M8 2v1.5M3.5 12V8a4.5 4.5 0 019 0v4M6.5 13.5a1.5 1.5 0 003 0" />
  </svg>
)

export const IconGear = (p: Props) => (
  <svg {...base(p)}>
    <circle cx="8" cy="8" r="2.2" />
    <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6L13 13M3 13l1.4-1.4M11.6 4.4L13 3" />
  </svg>
)

export const IconDoc = (p: Props) => (
  <svg {...base(p)}>
    <path d="M3 1.5h7l3 3V14.5H3z" />
    <path d="M10 1.5V4.5H13" />
  </svg>
)

export const IconMsg = (p: Props) => (
  <svg {...base(p)}>
    <path d="M2 3h12v8H7l-3 2.5V11H2z" />
  </svg>
)

export const IconChart = (p: Props) => (
  <svg {...base(p)}>
    <path d="M2 14V2M2 14h12M5 11V8M8 11V5M11 11V7" />
  </svg>
)

export const IconCalendar = (p: Props) => (
  <svg {...base(p)}>
    <rect x="2" y="3" width="12" height="11" />
    <path d="M2 6h12M5 1.5V4M11 1.5V4" />
  </svg>
)

export const IconSearch = (p: Props) => (
  <svg {...base({ width: 14, height: 14, strokeWidth: 1.2, ...p })}>
    <circle cx="7" cy="7" r="4.5" />
    <path d="M10.5 10.5L14 14" />
  </svg>
)

export const IconArrow = (p: Props) => (
  <svg {...base({ width: 11, height: 11, strokeWidth: 1.3, ...p })}>
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
)

export const IconCheck = (p: Props) => (
  <svg {...base({ width: 11, height: 11, strokeWidth: 1.6, ...p })}>
    <path d="M3 8l3.5 3.5L13 5" />
  </svg>
)

export const IconDots = (p: Props) => (
  <svg width={14} height={3} viewBox="0 0 14 3" fill="currentColor" {...p}>
    <circle cx="1.5" cy="1.5" r="1" />
    <circle cx="7" cy="1.5" r="1" />
    <circle cx="12.5" cy="1.5" r="1" />
  </svg>
)
