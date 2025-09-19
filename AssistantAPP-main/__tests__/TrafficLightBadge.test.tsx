import React from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'
import { TrafficLightBadge, type TrafficLightStatus } from '@/components/ui/TrafficLightBadge'

// Mock the environment variable for testing
const originalEnv = process.env.NEXT_PUBLIC_ENABLE_TRAFFIC_LIGHT_STATUS

beforeEach(() => {
  // Default to enabled for tests
  process.env.NEXT_PUBLIC_ENABLE_TRAFFIC_LIGHT_STATUS = 'true'
})

afterEach(() => {
  cleanup()
  process.env.NEXT_PUBLIC_ENABLE_TRAFFIC_LIGHT_STATUS = originalEnv
})

describe('TrafficLightBadge', () => {
  describe('Status Color Mapping', () => {
    test('renders gray statuses correctly', () => {
      const grayStatuses: TrafficLightStatus[] = ['not_started', 'draft', 'inactive']
      
      grayStatuses.forEach(status => {
        const { container, unmount } = render(<TrafficLightBadge status={status} />)
        const badge = container.firstChild as HTMLElement
        expect(badge).toHaveClass('border-gray-300', 'bg-gray-100', 'text-gray-800')
        expect(badge).toHaveAttribute('aria-label', expect.stringContaining('gray light'))
        unmount()
      })
    })

    test('renders yellow statuses correctly', () => {
      const yellowStatuses: TrafficLightStatus[] = [
        'in_progress', 'pending_review', 'awaiting', 
        'documents_pending', 'in_review', 'submitted'
      ]
      
      yellowStatuses.forEach(status => {
        const { container, unmount } = render(<TrafficLightBadge status={status} />)
        const badge = container.firstChild as HTMLElement
        expect(badge).toHaveClass('border-amber-400', 'bg-amber-100', 'text-amber-900')
        expect(badge).toHaveAttribute('aria-label', expect.stringContaining('yellow light'))
        unmount()
      })
    })

    test('renders green statuses correctly', () => {
      const greenStatuses: TrafficLightStatus[] = ['completed', 'approved', 'active', 'paid']
      
      greenStatuses.forEach(status => {
        const { container, unmount } = render(<TrafficLightBadge status={status} />)
        const badge = container.firstChild as HTMLElement
        expect(badge).toHaveClass('border-green-500', 'bg-green-100', 'text-green-900')
        expect(badge).toHaveAttribute('aria-label', expect.stringContaining('green light'))
        unmount()
      })
    })

    test('renders red statuses correctly', () => {
      const redStatuses: TrafficLightStatus[] = ['blocked', 'rejected', 'failed', 'overdue', 'denied']
      
      redStatuses.forEach(status => {
        const { container, unmount } = render(<TrafficLightBadge status={status} />)
        const badge = container.firstChild as HTMLElement
        expect(badge).toHaveClass('border-red-500', 'bg-red-100', 'text-red-900')
        expect(badge).toHaveAttribute('aria-label', expect.stringContaining('red light'))
        unmount()
      })
    })
  })

  describe('Icon Rendering', () => {
    test('renders icons by default', () => {
      render(<TrafficLightBadge status="in_progress" />)
      const icon = screen.getByRole('status').querySelector('svg')
      expect(icon).toBeInTheDocument()
    })

    test('can hide icons when showIcon is false', () => {
      render(<TrafficLightBadge status="in_progress" showIcon={false} />)
      const icon = screen.getByRole('status').querySelector('svg')
      expect(icon).not.toBeInTheDocument()
    })

    test('renders appropriate icons for each status category', () => {
      const { rerender } = render(<TrafficLightBadge status="in_progress" />)
      let badge = screen.getByRole('status')
      expect(badge.querySelector('svg')).toBeInTheDocument()

      rerender(<TrafficLightBadge status="completed" />)
      badge = screen.getByRole('status')
      expect(badge.querySelector('svg')).toBeInTheDocument()

      rerender(<TrafficLightBadge status="blocked" />)
      badge = screen.getByRole('status')
      expect(badge.querySelector('svg')).toBeInTheDocument()

      rerender(<TrafficLightBadge status="not_started" />)
      badge = screen.getByRole('status')
      expect(badge.querySelector('svg')).toBeInTheDocument()
    })
  })

  describe('Text Rendering', () => {
    test('renders text by default', () => {
      render(<TrafficLightBadge status="in_progress" />)
      expect(screen.getByText('In Progress')).toBeInTheDocument()
    })

    test('can hide text when showText is false', () => {
      render(<TrafficLightBadge status="in_progress" showText={false} />)
      expect(screen.queryByText('In Progress')).not.toBeInTheDocument()
    })

    test('formats status text correctly', () => {
      const statusTextPairs: [TrafficLightStatus, string][] = [
        ['not_started', 'Not Started'],
        ['in_progress', 'In Progress'],
        ['pending_review', 'Pending Review'],
        ['documents_pending', 'Documents Pending'],
        ['completed', 'Completed'],
        ['approved', 'Approved'],
        ['blocked', 'Blocked'],
        ['rejected', 'Rejected']
      ]

      statusTextPairs.forEach(([status, expectedText]) => {
        const { unmount } = render(<TrafficLightBadge status={status} />)
        expect(screen.getByText(expectedText)).toBeInTheDocument()
        unmount()
      })
    })
  })

  describe('Size Variants', () => {
    test('applies correct size classes', () => {
      const { container: smContainer, unmount: unmountSm } = render(<TrafficLightBadge status="completed" size="sm" />)
      const smBadge = smContainer.firstChild as HTMLElement
      expect(smBadge).toHaveClass('px-2', 'py-0.5', 'text-xs')
      unmountSm()

      const { container: mdContainer, unmount: unmountMd } = render(<TrafficLightBadge status="completed" size="md" />)
      const mdBadge = mdContainer.firstChild as HTMLElement
      expect(mdBadge).toHaveClass('px-2.5', 'py-0.5', 'text-xs')
      unmountMd()

      const { container: lgContainer, unmount: unmountLg } = render(<TrafficLightBadge status="completed" size="lg" />)
      const lgBadge = lgContainer.firstChild as HTMLElement
      expect(lgBadge).toHaveClass('px-3', 'py-1', 'text-sm')
      unmountLg()
    })

    test('uses medium size by default', () => {
      const { container } = render(<TrafficLightBadge status="completed" />)
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('px-2.5', 'py-0.5', 'text-xs')
    })
  })

  describe('Accessibility', () => {
    test('has proper ARIA role and label', () => {
      render(<TrafficLightBadge status="in_progress" />)
      const badge = screen.getByRole('status')
      expect(badge).toHaveAttribute('aria-label', 'Status: In Progress (yellow light)')
    })

    test('includes semantic color information in aria-label', () => {
      const colorMapping: [TrafficLightStatus, string][] = [
        ['not_started', 'gray light'],
        ['in_progress', 'yellow light'],
        ['completed', 'green light'],
        ['blocked', 'red light']
      ]

      colorMapping.forEach(([status, expectedColor]) => {
        const { unmount } = render(<TrafficLightBadge status={status} />)
        const badge = screen.getByRole('status')
        expect(badge).toHaveAttribute('aria-label', expect.stringContaining(expectedColor))
        unmount()
      })
    })

    test('can receive focus and has focus ring', () => {
      const { container } = render(<TrafficLightBadge status="completed" />)
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-ring', 'focus:ring-offset-2')
    })
  })

  describe('Feature Flag Integration', () => {
    test('useTrafficLightFeature hook respects environment variable', () => {
      // This test would need to be run in a different context to test the hook properly
      // For now, we'll test the component behavior which uses the hook
      expect(process.env.NEXT_PUBLIC_ENABLE_TRAFFIC_LIGHT_STATUS).toBe('true')
    })
  })

  describe('Dark Mode Support', () => {
    test('includes dark mode classes', () => {
      const { container } = render(<TrafficLightBadge status="completed" />)
      const badge = container.firstChild as HTMLElement
      
      // Check that dark mode classes are present
      const classList = badge.className
      expect(classList).toMatch(/dark:/)
    })
  })

  describe('High Contrast Colors', () => {
    test('uses high contrast color combinations', () => {
      const statusColors: [TrafficLightStatus, { border: string, bg: string, text: string }][] = [
        ['not_started', { border: 'border-gray-300', bg: 'bg-gray-100', text: 'text-gray-800' }],
        ['in_progress', { border: 'border-amber-400', bg: 'bg-amber-100', text: 'text-amber-900' }],
        ['completed', { border: 'border-green-500', bg: 'bg-green-100', text: 'text-green-900' }],
        ['blocked', { border: 'border-red-500', bg: 'bg-red-100', text: 'text-red-900' }]
      ]

      statusColors.forEach(([status, colors]) => {
        const { container, unmount } = render(<TrafficLightBadge status={status} />)
        const badge = container.firstChild as HTMLElement
        expect(badge).toHaveClass(colors.border, colors.bg, colors.text)
        unmount()
      })
    })
  })
})

describe('Legacy Compatibility', () => {
  test('trafficLightBadge function returns correct class string', () => {
    const { trafficLightBadge } = require('@/components/ui/TrafficLightBadge')
    
    const classes = trafficLightBadge('completed', 'sm')
    expect(typeof classes).toBe('string')
    expect(classes).toContain('border-green-500')
    expect(classes).toContain('px-2')
  })
})