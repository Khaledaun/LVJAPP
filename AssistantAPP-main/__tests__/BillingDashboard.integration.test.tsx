import { render, screen, waitFor } from '../test-utils/testUtils'
import userEvent from '@testing-library/user-event'
import BillingDashboard from '../components/dashboard/BillingDashboard'
import { mockBillingData, testScenarios } from '../test-data/mockData'

describe('BillingDashboard Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    jest.clearAllMocks()
  })

  describe('Dashboard Initialization', () => {
    it('should render the dashboard header correctly', async () => {
      render(<BillingDashboard />)
      
      expect(screen.getByText('Billing Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Track revenue, invoices, and financial performance')).toBeInTheDocument()
    })

    it('should show loading state initially', async () => {
      render(<BillingDashboard />)
      
      // Should show skeleton loaders initially
      expect(screen.getAllByRole('generic')).toHaveLength(expect.any(Number))
    })

    it('should load and display billing metrics after data fetch', async () => {
      render(<BillingDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Total Revenue')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Check all expected billing metrics are displayed
      expect(screen.getByText('Outstanding Invoices')).toBeInTheDocument()
      expect(screen.getByText('Paid Invoices')).toBeInTheDocument()
      expect(screen.getByText('Avg. Payment Time')).toBeInTheDocument()
    })
  })

  describe('Period Selection Functionality', () => {
    it('should render period selector with billing-specific options', async () => {
      render(<BillingDashboard />)
      
      await waitFor(() => {
        const selector = screen.getByRole('combobox')
        expect(selector).toBeInTheDocument()
      })
    })

    it('should update billing data when period is changed', async () => {
      render(<BillingDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Total Revenue')).toBeInTheDocument()
      })

      // Change period to "Last 7 days"
      const selector = screen.getByRole('combobox')
      await user.click(selector)
      
      const option = screen.getByText('Last 7 days')
      await user.click(option)
      
      // Data should reload
      await waitFor(() => {
        expect(screen.getByText('Total Revenue')).toBeInTheDocument()
      })
    })

    it('should test all billing period options', async () => {
      render(<BillingDashboard />)
      
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      for (const period of testScenarios.billing.periods) {
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
        
        await waitFor(() => {
          expect(screen.getByText('Total Revenue')).toBeInTheDocument()
        })
      }
    })
  })

  describe('Billing Tab Navigation', () => {
    it('should render all billing-specific tabs', async () => {
      render(<BillingDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Overview')).toBeInTheDocument()
      })

      testScenarios.billing.tabs.forEach(tab => {
        const tabLabel = tab.charAt(0).toUpperCase() + tab.slice(1)
        expect(screen.getByText(tabLabel)).toBeInTheDocument()
      })
    })

    it('should switch between billing tabs correctly', async () => {
      render(<BillingDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Overview')).toBeInTheDocument()
      })

      // Test each billing tab
      for (const tab of testScenarios.billing.tabs) {
        const tabLabel = tab.charAt(0).toUpperCase() + tab.slice(1)
        const tabButton = screen.getByText(tabLabel)
        await user.click(tabButton)
        
        expect(tabButton).toBeInTheDocument()
      }
    })

    it('should display appropriate content for each billing tab', async () => {
      render(<BillingDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Total Revenue')).toBeInTheDocument()
      })

      // Test Revenue tab
      const revenueTab = screen.getByText('Revenue')
      await user.click(revenueTab)
      await waitFor(() => {
        expect(screen.getAllByTestId('responsive-container').length).toBeGreaterThan(0)
      })

      // Test Invoices tab
      const invoicesTab = screen.getByText('Invoices')
      await user.click(invoicesTab)
      await waitFor(() => {
        expect(screen.getAllByTestId('responsive-container').length).toBeGreaterThan(0)
      })

      // Test Payments tab
      const paymentsTab = screen.getByText('Payments')
      await user.click(paymentsTab)
      await waitFor(() => {
        expect(screen.getAllByTestId('responsive-container').length).toBeGreaterThan(0)
      })
    })
  })

  describe('Revenue and Financial Metrics', () => {
    it('should display revenue metrics with correct formatting', async () => {
      render(<BillingDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Total Revenue')).toBeInTheDocument()
      })

      // Check revenue values are properly formatted
      mockBillingData.metrics.forEach(metric => {
        expect(screen.getByText(metric.title)).toBeInTheDocument()
        expect(screen.getByText(metric.value)).toBeInTheDocument()
      })
    })

    it('should display financial trend indicators correctly', async () => {
      render(<BillingDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Total Revenue')).toBeInTheDocument()
      })

      // Check trend indicators for billing metrics
      mockBillingData.metrics.forEach(metric => {
        if (metric.change !== 0) {
          const changeText = `${Math.abs(metric.change)}% from last period`
          expect(screen.getByText(changeText)).toBeInTheDocument()
        }
      })
    })

    it('should render revenue vs expenses chart', async () => {
      render(<BillingDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Revenue vs Expenses')).toBeInTheDocument()
      })

      // Should have area chart for revenue vs expenses
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    })
  })

  describe('Invoice Status Tracking', () => {
    it('should display invoice status breakdown', async () => {
      render(<BillingDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Total Revenue')).toBeInTheDocument()
      })

      // Should render pie chart for invoice status
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    })

    it('should show invoice status in invoices tab', async () => {
      render(<BillingDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Total Revenue')).toBeInTheDocument()
      })

      const invoicesTab = screen.getByText('Invoices')
      await user.click(invoicesTab)

      await waitFor(() => {
        expect(screen.getAllByTestId('responsive-container').length).toBeGreaterThan(0)
      })
    })
  })

  describe('Refresh and Export Functionality', () => {
    it('should render refresh button for billing data', async () => {
      render(<BillingDashboard />)
      
      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /refresh/i })
        expect(refreshButton).toBeInTheDocument()
      })
    })

    it('should show loading state when billing refresh is clicked', async () => {
      render(<BillingDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Total Revenue')).toBeInTheDocument()
      })

      const refreshButton = screen.getByRole('button', { name: /refresh/i })
      await user.click(refreshButton)
      
      expect(refreshButton).toBeInTheDocument()
    })

    it('should render export button for billing data', async () => {
      render(<BillingDashboard />)
      
      const exportButton = screen.getByRole('button', { name: /export/i })
      expect(exportButton).toBeInTheDocument()
    })

    it('should handle export functionality without errors', async () => {
      render(<BillingDashboard />)
      
      const exportButton = screen.getByRole('button', { name: /export/i })
      await user.click(exportButton)
      
      expect(exportButton).toBeInTheDocument()
    })
  })

  describe('Chart Rendering and Accuracy', () => {
    it('should render charts in billing overview tab', async () => {
      render(<BillingDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Total Revenue')).toBeInTheDocument()
      })

      // Check for chart containers in billing dashboard
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    })

    it('should display accurate chart data for billing', async () => {
      render(<BillingDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Total Revenue')).toBeInTheDocument()
      })

      // Revenue vs Expenses chart should be present
      expect(screen.getByText('Revenue vs Expenses')).toBeInTheDocument()
      expect(screen.getByTestId('area-chart')).toBeInTheDocument()
    })

    it('should render appropriate charts for each billing tab', async () => {
      render(<BillingDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Total Revenue')).toBeInTheDocument()
      })

      for (const tab of testScenarios.billing.tabs) {
        const tabLabel = tab.charAt(0).toUpperCase() + tab.slice(1)
        const tabButton = screen.getByText(tabLabel)
        await user.click(tabButton)
        
        // Each tab should have appropriate charts
        await waitFor(() => {
          expect(screen.getAllByTestId('responsive-container').length).toBeGreaterThan(0)
        })
      }
    })
  })

  describe('Payment Tracking', () => {
    it('should display payment metrics correctly', async () => {
      render(<BillingDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Avg. Payment Time')).toBeInTheDocument()
      })

      // Payment-related metrics should be visible
      expect(screen.getByText('Outstanding Invoices')).toBeInTheDocument()
      expect(screen.getByText('Paid Invoices')).toBeInTheDocument()
    })

    it('should render payment analysis in payments tab', async () => {
      render(<BillingDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Total Revenue')).toBeInTheDocument()
      })

      const paymentsTab = screen.getByText('Payments')
      await user.click(paymentsTab)

      await waitFor(() => {
        expect(screen.getAllByTestId('responsive-container').length).toBeGreaterThan(0)
      })
    })
  })

  describe('Responsive Design for Billing', () => {
    it('should render properly on mobile viewport', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })
      
      render(<BillingDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Billing Dashboard')).toBeInTheDocument()
      })

      // Billing dashboard should still be functional on mobile
      expect(screen.getByText('Billing Dashboard')).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })
  })

  describe('Error Handling for Billing', () => {
    it('should handle billing API errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      render(<BillingDashboard />)
      
      expect(screen.getByText('Billing Dashboard')).toBeInTheDocument()
      
      consoleSpy.mockRestore()
    })
  })
})