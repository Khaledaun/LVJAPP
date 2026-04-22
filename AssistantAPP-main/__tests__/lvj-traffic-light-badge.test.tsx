/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import TrafficLightBadge, { resolveStatus } from '@/components/lvj/traffic-light-badge'

describe('TrafficLightBadge — status → (color,label) map', () => {
  it('maps red / amber / green / gray families correctly', () => {
    expect(resolveStatus('blocked')).toEqual({ color: 'red',   label: 'Blocked' })
    expect(resolveStatus('denied')).toEqual({ color: 'red',    label: 'Denied' })
    expect(resolveStatus('in_review')).toEqual({ color: 'amber', label: 'In Review' })
    expect(resolveStatus('documents_pending')).toEqual({ color: 'amber', label: 'Docs Pending' })
    expect(resolveStatus('approved')).toEqual({ color: 'green', label: 'Approved' })
    expect(resolveStatus('draft')).toEqual({ color: 'gray',   label: 'Draft' })
  })

  it('falls back to gray + raw label for unknown statuses', () => {
    expect(resolveStatus('banana')).toEqual({ color: 'gray', label: 'banana' })
  })

  it('renders the right class and accessible name', () => {
    render(<TrafficLightBadge status="approved" />)
    const el = screen.getByRole('status')
    expect(el).toHaveClass('lvj-tl', 'lvj-tl-green')
    expect(el).toHaveAttribute('aria-label', 'Status: Approved (green light)')
    expect(el.textContent).toContain('Approved')
  })

  it('supports a custom label override', () => {
    render(<TrafficLightBadge status="in_review" label="Under USCIS Review" />)
    const el = screen.getByRole('status')
    expect(el.textContent).toContain('Under USCIS Review')
    expect(el).toHaveAttribute('aria-label', 'Status: Under USCIS Review (amber light)')
  })
})
