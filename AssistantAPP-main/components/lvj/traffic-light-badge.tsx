import * as React from 'react'

/**
 * TrafficLightBadge — the LVJ status spine.
 * Every status maps to one of four colours (red / amber / green / gray) with
 * a human label. Ported from the design pack's status map; WCAG-AA colours
 * with role="status" + aria-label for screen readers.
 */

export type TrafficLightColor = 'red' | 'amber' | 'green' | 'gray'

export type TrafficLightStatus =
  // red — blocked / terminal negative
  | 'blocked' | 'rejected' | 'denied' | 'overdue' | 'failed'
  // amber — in-flight / needs attention
  | 'in_progress' | 'pending_review' | 'awaiting' | 'documents_pending'
  | 'in_review' | 'submitted'
  // green — approved / positive terminal
  | 'completed' | 'approved' | 'active' | 'paid'
  // gray — not-started / neutral
  | 'not_started' | 'draft' | 'inactive' | 'new'

const MAP: Record<TrafficLightStatus, [TrafficLightColor, string]> = {
  blocked:           ['red',   'Blocked'],
  rejected:          ['red',   'Rejected'],
  denied:            ['red',   'Denied'],
  overdue:           ['red',   'Overdue'],
  failed:            ['red',   'Failed'],
  in_progress:       ['amber', 'In Progress'],
  pending_review:    ['amber', 'Pending Review'],
  awaiting:          ['amber', 'Awaiting'],
  documents_pending: ['amber', 'Docs Pending'],
  in_review:         ['amber', 'In Review'],
  submitted:         ['amber', 'Submitted'],
  completed:         ['green', 'Completed'],
  approved:          ['green', 'Approved'],
  active:            ['green', 'Active'],
  paid:              ['green', 'Paid'],
  not_started:       ['gray',  'Not Started'],
  draft:             ['gray',  'Draft'],
  inactive:          ['gray',  'Inactive'],
  new:               ['gray',  'New'],
}

export function resolveStatus(status: string): { color: TrafficLightColor; label: string } {
  const entry = (MAP as Record<string, [TrafficLightColor, string]>)[status]
  if (entry) return { color: entry[0], label: entry[1] }
  return { color: 'gray', label: status }
}

export function TrafficLightBadge({
  status,
  label,
  className,
}: {
  status: TrafficLightStatus | string
  label?: string
  className?: string
}) {
  const { color, label: mapped } = resolveStatus(status)
  const display = label ?? mapped
  return (
    <span
      className={`lvj-tl lvj-tl-${color}${className ? ' ' + className : ''}`}
      role="status"
      aria-label={`Status: ${display} (${color} light)`}
    >
      <span className="dot" />
      {display}
    </span>
  )
}

export default TrafficLightBadge
