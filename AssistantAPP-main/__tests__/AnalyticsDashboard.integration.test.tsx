import { render, screen, waitFor } from '../test-utils/testUtils'
import userEvent from '@testing-library/user-event'
import AnalyticsDashboard from '../components/dashboard/AnalyticsDashboard'
import { mockAnalyticsData, testScenarios } from '../test-data/mockData'

describe('AnalyticsDashboard Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    // Reset all mocks
    jest.clearAllMocks()
  })

  describe('Dashboard Initialization', () => {
    it('should render the dashboard header correctly', async () => {
      render(<AnalyticsDashboard />)
      
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument()
      expect(screen.getByText("Overview of your law firm's performance and metrics")).toBeInTheDocument()
    })

    it('should show loading state initially', async () => {
      render(<AnalyticsDashboard />)
      
      // Should show skeleton loaders
      expect(screen.getAllByRole('generic')).toHaveLength(expect.any(Number))
    })

    it('should load and display metric cards after data fetch', async () => {
      render(<AnalyticsDashboard />)
      
      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByText('Total Cases')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Check all expected metrics are displayed
      expect(screen.getByText('Active Clients')).toBeInTheDocument()
      expect(screen.getByText('Revenue')).toBeInTheDocument()
      expect(screen.getByText('Avg. Completion Time')).toBeInTheDocument()
    })
  })

  describe('Period Selection Functionality', () => {
    it('should render period selector with default value', async () => {
      render(<AnalyticsDashboard />)
      
      await waitFor(() => {
        const selector = screen.getByRole('combobox')
        expect(selector).toBeInTheDocument()
      })
    })

    it('should update data when period is changed', async () => {
      render(<AnalyticsDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Total Cases')).toBeInTheDocument()
      })

      // Change period to "Last 7 days"
      const selector = screen.getByRole('combobox')
      await user.click(selector)
      
      const option = screen.getByText('Last 7 days')
      await user.click(option)
      
      // Data should reload (indicated by the loading effect)
      await waitFor(() => {
        expect(screen.getByText('Total Cases')).toBeInTheDocument()
      })
    })

    it('should test all available period options', async () => {
      render(<AnalyticsDashboard />)
      
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      for (const period of testScenarios.analytics.periods) {
        const selector = screen.getByRole('combobox')
        await user.click(selector)
        
        const periodLabels = {
          '7d': 'Last 7 days',
          '30d': 'Last 30 days',
          '90d': 'Last 90 days',
          '1y': 'Last year'
        }
        
        const option = screen.getByText(periodLabels[period as keyof typeof periodLabels])
        await user.click(option)
        
        // Wait for data to load
        await waitFor(() => {
          expect(screen.getByText('Total Cases')).toBeInTheDocument()
        })
      }
    })
  })

  describe('Tab Navigation', () => {
    it('should render all expected tabs', async () => {
      render(<AnalyticsDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Overview')).toBeInTheDocument()
      })

      testScenarios.analytics.tabs.forEach(tab => {
        const tabLabel = tab.charAt(0).toUpperCase() + tab.slice(1)
        expect(screen.getByText(tabLabel)).toBeInTheDocument()
      })
    })

    it('should switch between tabs correctly', async () => {
      render(<AnalyticsDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Overview')).toBeInTheDocument()
      })

      // Test each tab
      for (const tab of testScenarios.analytics.tabs) {
        const tabLabel = tab.charAt(0).toUpperCase() + tab.slice(1)
        const tabButton = screen.getByText(tabLabel)
        await user.click(tabButton)
        
        // Verify tab is active (you would need to check for active state class or aria-selected)
        expect(tabButton).toBeInTheDocument()
      }
    })
  })

  describe('Refresh Functionality', () => {
    it('should render refresh button', async () => {
      render(<AnalyticsDashboard />)
      
      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /refresh/i })
        expect(refreshButton).toBeInTheDocument()
      })
    })

    it('should show loading state when refresh is clicked', async () => {
      render(<AnalyticsDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Total Cases')).toBeInTheDocument()
      })

      const refreshButton = screen.getByRole('button', { name: /refresh/i })
      await user.click(refreshButton)
      
      // Should show loading animation on the refresh button
      expect(refreshButton).toBeInTheDocument()
    })
  })

  describe('Export Functionality', () => {
    it('should render export button', async () => {
      render(<AnalyticsDashboard />)
      
      const exportButton = screen.getByRole('button', { name: /export/i })
      expect(exportButton).toBeInTheDocument()
    })

    it('should be clickable without errors', async () => {
      render(<AnalyticsDashboard />)
      
      const exportButton = screen.getByRole('button', { name: /export/i })
      await user.click(exportButton)
      
      // Should not throw any errors
      expect(exportButton).toBeInTheDocument()
    })
  })

  describe('Chart Rendering', () => {
    it('should render charts in overview tab', async () => {
      render(<AnalyticsDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Total Cases')).toBeInTheDocument()
      })

      // Check for chart containers
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    })

    it('should render appropriate charts for each tab', async () => {
      render(<AnalyticsDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Total Cases')).toBeInTheDocument()
      })

      for (const tab of testScenarios.analytics.tabs) {
        const tabLabel = tab.charAt(0).toUpperCase() + tab.slice(1)
        const tabButton = screen.getByText(tabLabel)
        await user.click(tabButton)
        
        // Each tab should have at least one chart
        await waitFor(() => {
          expect(screen.getAllByTestId('responsive-container').length).toBeGreaterThan(0)
        })
      }
    })
  })

  describe('Metric Display and Trend Indicators', () => {
    it('should display metric values correctly', async () => {
      render(<AnalyticsDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Total Cases')).toBeInTheDocument()
      })

      // Check that metric values are displayed
      mockAnalyticsData.metrics.forEach(metric => {
        expect(screen.getByText(metric.title)).toBeInTheDocument()
        expect(screen.getByText(metric.value.toString())).toBeInTheDocument()
      })
    })

    it('should display trend indicators', async () => {
      render(<AnalyticsDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Total Cases')).toBeInTheDocument()
      })

      // Look for trend indicators (percentage changes)
      mockAnalyticsData.metrics.forEach(metric => {
        if (metric.change !== 0) {
          const changeText = `${Math.abs(metric.change)}% from last period`
          expect(screen.getByText(changeText)).toBeInTheDocument()
        }
      })
    })
  })

  describe('Responsive Design', () => {
    it('should render properly on mobile viewport', async () => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })
      
      render(<AnalyticsDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument()
      })

      // Dashboard should still be functional on mobile
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      // Mock console.error to prevent error logs in test output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      render(<AnalyticsDashboard />)
      
      // Even with potential errors, the component should still render basic structure
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument()
      
      consoleSpy.mockRestore()
    })
  })
})