import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import StatusTimeline from '@/components/journey/StatusTimeline'

// Mock the TrafficLightBadge component and hook
jest.mock('@/components/ui/TrafficLightBadge', () => ({
  TrafficLightBadge: ({ status, size, showIcon, showText }: any) => (
    <div data-testid="traffic-light-badge" data-status={status} data-size={size}>
      {showIcon && <span data-testid="traffic-light-icon">🔴</span>}
      {showText && <span data-testid="traffic-light-text">{status}</span>}
    </div>
  ),
  useTrafficLightFeature: jest.fn()
}))

const mockStages = [
  {
    id: 'stage-1',
    title: 'Initial Review',
    status: 'completed' as const,
    due_date: '2024-01-15'
  },
  {
    id: 'stage-2', 
    title: 'Document Collection',
    status: 'in_progress' as const,
    due_date: '2024-01-20'
  },
  {
    id: 'stage-3',
    title: 'Final Approval',
    status: 'blocked' as const
  },
  {
    id: 'stage-4',
    title: 'Submission',
    status: 'not_started' as const
  }
]

describe('StatusTimeline', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('When Traffic Light Feature is Enabled', () => {
    beforeEach(() => {
      const { useTrafficLightFeature } = require('@/components/ui/TrafficLightBadge')
      useTrafficLightFeature.mockReturnValue(true)
    })

    test('renders all stages with traffic light badges', () => {
      render(<StatusTimeline stages={mockStages} />)
      
      expect(screen.getByText('Initial Review')).toBeInTheDocument()
      expect(screen.getByText('Document Collection')).toBeInTheDocument()
      expect(screen.getByText('Final Approval')).toBeInTheDocument()
      expect(screen.getByText('Submission')).toBeInTheDocument()
      
      const trafficLightBadges = screen.getAllByTestId('traffic-light-badge')
      expect(trafficLightBadges).toHaveLength(4)
    })

    test('renders due dates when provided', () => {
      render(<StatusTimeline stages={mockStages} />)
      
      expect(screen.getByText('Due: 2024-01-15')).toBeInTheDocument()
      expect(screen.getByText('Due: 2024-01-20')).toBeInTheDocument()
    })

    test('does not render due date when not provided', () => {
      render(<StatusTimeline stages={mockStages} />)
      
      // Check that stages without due_date don't show "Due:" text
      const dueTexts = screen.getAllByText(/^Due:/)
      expect(dueTexts).toHaveLength(2) // Only 2 stages have due dates
    })

    test('passes correct props to TrafficLightBadge', () => {
      render(<StatusTimeline stages={mockStages} />)
      
      const badges = screen.getAllByTestId('traffic-light-badge')
      
      expect(badges[0]).toHaveAttribute('data-status', 'completed')
      expect(badges[1]).toHaveAttribute('data-status', 'in_progress')
      expect(badges[2]).toHaveAttribute('data-status', 'blocked')
      expect(badges[3]).toHaveAttribute('data-status', 'not_started')
      
      badges.forEach(badge => {
        expect(badge).toHaveAttribute('data-size', 'sm')
      })
    })

    test('shows icons and text in traffic light badges', () => {
      render(<StatusTimeline stages={mockStages} />)
      
      const icons = screen.getAllByTestId('traffic-light-icon')
      const texts = screen.getAllByTestId('traffic-light-text')
      
      expect(icons).toHaveLength(4)
      expect(texts).toHaveLength(4)
    })
  })

  describe('When Traffic Light Feature is Disabled', () => {
    beforeEach(() => {
      const { useTrafficLightFeature } = require('@/components/ui/TrafficLightBadge')
      useTrafficLightFeature.mockReturnValue(false)
    })

    test('renders legacy badges instead of traffic light badges', () => {
      render(<StatusTimeline stages={mockStages} />)
      
      expect(screen.queryAllByTestId('traffic-light-badge')).toHaveLength(0)
      
      // Should render legacy badge elements
      const badges = screen.getAllByText(/^(completed|in_progress|blocked|not_started)$/)
      expect(badges).toHaveLength(4)
    })

    test('applies correct legacy badge styles', () => {
      render(<StatusTimeline stages={mockStages} />)
      
      const completedBadge = screen.getByText('completed').closest('span')
      expect(completedBadge).toHaveClass('bg-green-200', 'text-green-800')
      
      const inProgressBadge = screen.getByText('in_progress').closest('span')
      expect(inProgressBadge).toHaveClass('bg-blue-200', 'text-blue-800')
      
      const blockedBadge = screen.getByText('blocked').closest('span')
      expect(blockedBadge).toHaveClass('bg-red-200', 'text-red-800')
      
      const notStartedBadge = screen.getByText('not_started').closest('span')
      expect(notStartedBadge).toHaveClass('bg-gray-200', 'text-gray-700')
    })

    test('still renders stage information correctly', () => {
      render(<StatusTimeline stages={mockStages} />)
      
      expect(screen.getByText('Initial Review')).toBeInTheDocument()
      expect(screen.getByText('Document Collection')).toBeInTheDocument()
      expect(screen.getByText('Final Approval')).toBeInTheDocument()
      expect(screen.getByText('Submission')).toBeInTheDocument()
      
      expect(screen.getByText('Due: 2024-01-15')).toBeInTheDocument()
      expect(screen.getByText('Due: 2024-01-20')).toBeInTheDocument()
    })
  })

  describe('Layout and Structure', () => {
    beforeEach(() => {
      const { useTrafficLightFeature } = require('@/components/ui/TrafficLightBadge')
      useTrafficLightFeature.mockReturnValue(true)
    })

    test('renders as an unordered list', () => {
      render(<StatusTimeline stages={mockStages} />)
      
      const list = screen.getByRole('list')
      expect(list).toBeInTheDocument()
      expect(list.tagName).toBe('UL')
    })

    test('renders correct number of list items', () => {
      render(<StatusTimeline stages={mockStages} />)
      
      const listItems = screen.getAllByRole('listitem')
      expect(listItems).toHaveLength(4)
    })

    test('applies correct CSS classes for layout', () => {
      const { container } = render(<StatusTimeline stages={mockStages} />)
      
      const list = container.querySelector('ul')
      expect(list).toHaveClass('space-y-2')
      
      const listItems = container.querySelectorAll('li')
      listItems.forEach(item => {
        expect(item).toHaveClass('p-3', 'border', 'rounded-xl', 'flex', 'items-center', 'justify-between')
      })
    })
  })

  describe('Edge Cases', () => {
    test('handles empty stages array', () => {
      render(<StatusTimeline stages={[]} />)
      
      const list = screen.getByRole('list')
      expect(list).toBeInTheDocument()
      expect(screen.queryAllByRole('listitem')).toHaveLength(0)
    })

    test('handles stages without due dates', () => {
      const stagesNoDates = [
        { id: 'stage-1', title: 'Test Stage', status: 'completed' as const }
      ]
      
      render(<StatusTimeline stages={stagesNoDates} />)
      
      expect(screen.getByText('Test Stage')).toBeInTheDocument()
      expect(screen.queryByText(/^Due:/)).not.toBeInTheDocument()
    })

    test('handles missing status values gracefully', () => {
      const { useTrafficLightFeature } = require('@/components/ui/TrafficLightBadge')
      useTrafficLightFeature.mockReturnValue(false)
      
      // This shouldn't break even with weird data
      const stagesWithUndefined = [
        { id: 'stage-1', title: 'Test Stage', status: undefined as any }
      ]
      
      expect(() => {
        render(<StatusTimeline stages={stagesWithUndefined} />)
      }).not.toThrow()
    })
  })
})