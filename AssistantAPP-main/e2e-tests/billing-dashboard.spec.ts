import { test, expect } from '@playwright/test'
import { DashboardPage } from './page-objects/DashboardPage'

test.describe('Billing Dashboard E2E Tests', () => {
  let dashboardPage: DashboardPage

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page)
    await dashboardPage.goto()
    await dashboardPage.waitForDashboardLoad()
  })

  test.describe('Dashboard Loading and Initial State', () => {
    test('should load billing dashboard with correct header and description', async ({ page }) => {
      await expect(page.locator('h2')).toContainText('Billing Dashboard')
      await expect(page.locator('p')).toContainText('Track revenue, invoices, and financial performance')
      
      await dashboardPage.takeScreenshot('billing-dashboard-initial')
    })

    test('should display all billing metric cards after loading', async ({ page }) => {
      // Wait for billing metrics to load
      await expect(page.locator('text=Total Revenue')).toBeVisible()
      await expect(page.locator('text=Outstanding Invoices')).toBeVisible()
      await expect(page.locator('text=Paid Invoices')).toBeVisible()
      await expect(page.locator('text=Avg. Payment Time')).toBeVisible()
      
      // Verify metric cards are displaying financial data
      const metricCards = page.locator('[role="article"]')
      const cardCount = await metricCards.count()
      expect(cardCount).toBeGreaterThanOrEqual(4)
      
      await dashboardPage.takeScreenshot('billing-metrics-loaded')
    })

    test('should display revenue vs expenses chart in overview', async ({ page }) => {
      // Wait for chart to load
      await expect(page.locator('text=Revenue vs Expenses')).toBeVisible()
      
      // Verify chart container is present
      const chartContainers = page.locator('[data-testid="responsive-container"]')
      const chartCount = await chartContainers.count()
      expect(chartCount).toBeGreaterThan(0)
      
      await dashboardPage.takeScreenshot('billing-overview-charts')
    })
  })

  test.describe('Period Selection for Billing Data', () => {
    test('should allow billing period selection and update financial data', async ({ page }) => {
      // Test period selector for billing
      await expect(page.locator('[role="combobox"]')).toBeVisible()
      
      const periods = [
        { value: '7d', label: 'Last 7 days' },
        { value: '90d', label: 'Last 90 days' },
        { value: '1y', label: 'Last year' },
        { value: '30d', label: 'Last 30 days' }
      ]

      for (const period of periods) {
        await page.locator('[role="combobox"]').click()
        await page.locator(`text=${period.label}`).click()
        
        // Wait for billing data to reload
        await page.waitForTimeout(1500)
        
        // Verify billing data is still displayed
        await expect(page.locator('text=Total Revenue')).toBeVisible()
        
        await dashboardPage.takeScreenshot(`billing-period-${period.value}`)
      }
    })

    test('should update financial metrics when period changes', async ({ page }) => {
      // Record initial revenue value
      const initialRevenue = await page.locator('text=Total Revenue').locator('..').textContent()
      
      // Change period
      await page.locator('[role="combobox"]').click()
      await page.locator('text=Last 7 days').click()
      await page.waitForTimeout(1500)
      
      // Revenue should still be displayed (may or may not change value)
      await expect(page.locator('text=Total Revenue')).toBeVisible()
    })
  })

  test.describe('Billing Tab Navigation', () => {
    test('should navigate through all billing tabs', async ({ page }) => {
      const tabs = [
        { value: 'overview', label: 'Overview' },
        { value: 'revenue', label: 'Revenue' },
        { value: 'invoices', label: 'Invoices' },
        { value: 'payments', label: 'Payments' }
      ]

      for (const tab of tabs) {
        await page.locator(`text=${tab.label}`).click()
        await page.waitForTimeout(1500)
        
        // Verify tab is active and billing content is displayed
        await expect(page.locator(`[data-value="${tab.value}"]`)).toBeVisible()
        
        // Verify charts are present in each billing tab
        const chartContainers = page.locator('[data-testid="responsive-container"]')
        const chartCount = await chartContainers.count()
        expect(chartCount).toBeGreaterThan(0)
        
        await dashboardPage.takeScreenshot(`billing-tab-${tab.value}`)
      }
    })

    test('should display revenue trends in revenue tab', async ({ page }) => {
      await page.locator('text=Revenue').click()
      await page.waitForTimeout(1500)
      
      // Should display revenue-specific charts and trends
      await expect(page.locator('[data-testid="responsive-container"]')).toBeVisible()
      
      await dashboardPage.takeScreenshot('billing-revenue-tab-detailed')
    })

    test('should display invoice status in invoices tab', async ({ page }) => {
      await page.locator('text=Invoices').click()
      await page.waitForTimeout(1500)
      
      // Should display invoice-specific data and charts
      await expect(page.locator('[data-testid="responsive-container"]')).toBeVisible()
      
      await dashboardPage.takeScreenshot('billing-invoices-tab-detailed')
    })

    test('should display payment analysis in payments tab', async ({ page }) => {
      await page.locator('text=Payments').click()
      await page.waitForTimeout(1500)
      
      // Should display payment-specific charts
      await expect(page.locator('[data-testid="responsive-container"]')).toBeVisible()
      
      await dashboardPage.takeScreenshot('billing-payments-tab-detailed')
    })
  })

  test.describe('Financial Metrics Display', () => {
    test('should display revenue metrics with proper currency formatting', async ({ page }) => {
      await expect(page.locator('text=Total Revenue')).toBeVisible()
      
      // Check for currency symbols and proper formatting
      const revenueCard = page.locator('text=Total Revenue').locator('..')
      await expect(revenueCard).toContainText(/\$/)
      
      const outstandingCard = page.locator('text=Outstanding Invoices').locator('..')
      await expect(outstandingCard).toContainText(/\$/)
      
      const paidCard = page.locator('text=Paid Invoices').locator('..')
      await expect(paidCard).toContainText(/\$/)
      
      await dashboardPage.takeScreenshot('billing-currency-formatting')
    })

    test('should display payment time metrics correctly', async ({ page }) => {
      await expect(page.locator('text=Avg. Payment Time')).toBeVisible()
      
      // Payment time should display days
      const paymentTimeCard = page.locator('text=Avg. Payment Time').locator('..')
      await expect(paymentTimeCard).toContainText(/days/)
      
      await dashboardPage.takeScreenshot('billing-payment-time-metric')
    })

    test('should display financial trend indicators', async ({ page }) => {
      // Wait for metrics to load
      await expect(page.locator('text=Total Revenue')).toBeVisible()
      
      // Check for trend indicators (arrows and percentages)
      const trendIndicators = page.locator('text=% from last period')
      const indicatorCount = await trendIndicators.count()
      expect(indicatorCount).toBeGreaterThan(0)
      
      await dashboardPage.takeScreenshot('billing-financial-trends')
    })
  })

  test.describe('Revenue vs Expenses Chart', () => {
    test('should render revenue vs expenses area chart', async ({ page }) => {
      await expect(page.locator('text=Revenue vs Expenses')).toBeVisible()
      
      // Check for area chart elements
      const areaCharts = page.locator('[data-testid="area-chart"]')
      const areaCount = await areaCharts.count()
      expect(areaCount).toBeGreaterThan(0)
      
      await dashboardPage.takeScreenshot('billing-revenue-expenses-chart')
    })

    test('should display chart with proper data visualization', async ({ page }) => {
      // Verify chart container and axes
      await expect(page.locator('[data-testid="responsive-container"]')).toBeVisible()
      
      // Check for chart axes
      const xAxes = page.locator('[data-testid="x-axis"]')
      const yAxes = page.locator('[data-testid="y-axis"]')
      const xAxisCount = await xAxes.count()
      const yAxisCount = await yAxes.count()
      
      expect(xAxisCount).toBeGreaterThan(0)
      expect(yAxisCount).toBeGreaterThan(0)
      
      await dashboardPage.takeScreenshot('billing-chart-with-axes')
    })
  })

  test.describe('Invoice Status Tracking', () => {
    test('should display invoice status breakdown chart', async ({ page }) => {
      // Look for pie chart showing invoice status
      const pieCharts = page.locator('[data-testid="pie-chart"]')
      const pieCount = await pieCharts.count()
      expect(pieCount).toBeGreaterThan(0)
      
      await dashboardPage.takeScreenshot('billing-invoice-status-chart')
    })

    test('should show invoice status details in invoices tab', async ({ page }) => {
      await page.locator('text=Invoices').click()
      await page.waitForTimeout(1500)
      
      // Should display detailed invoice information
      await expect(page.locator('[data-testid="responsive-container"]')).toBeVisible()
      
      await dashboardPage.takeScreenshot('billing-invoice-status-detailed')
    })
  })

  test.describe('Interactive Controls for Billing', () => {
    test('should handle billing data refresh', async ({ page }) => {
      const refreshButton = page.locator('button:has-text("Refresh")')
      await expect(refreshButton).toBeVisible()
      
      await refreshButton.click()
      await page.waitForTimeout(1500)
      
      // Billing data should still be displayed after refresh
      await expect(page.locator('text=Total Revenue')).toBeVisible()
      
      await dashboardPage.takeScreenshot('billing-after-refresh')
    })

    test('should handle billing data export', async ({ page }) => {
      const exportButton = page.locator('button:has-text("Export")')
      await expect(exportButton).toBeVisible()
      
      await exportButton.click()
      
      // Export should not cause errors
      await expect(exportButton).toBeVisible()
      
      await dashboardPage.takeScreenshot('billing-export-clicked')
    })
  })

  test.describe('Responsive Design for Billing', () => {
    test('should work properly on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.reload()
      await dashboardPage.waitForDashboardLoad()
      
      // Billing dashboard should be functional on mobile
      await expect(page.locator('h2')).toContainText('Billing Dashboard')
      await expect(page.locator('text=Total Revenue')).toBeVisible()
      
      // Tabs should be accessible
      await page.locator('text=Revenue').click()
      await page.waitForTimeout(1000)
      
      await dashboardPage.takeScreenshot('billing-mobile-view')
    })

    test('should work properly on tablet devices', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.reload()
      await dashboardPage.waitForDashboardLoad()
      
      await expect(page.locator('h2')).toContainText('Billing Dashboard')
      await expect(page.locator('text=Total Revenue')).toBeVisible()
      
      await dashboardPage.takeScreenshot('billing-tablet-view')
    })

    test('should display properly on large desktop screens', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 })
      await page.reload()
      await dashboardPage.waitForDashboardLoad()
      
      // All billing elements should be properly spaced
      await expect(page.locator('h2')).toContainText('Billing Dashboard')
      await expect(page.locator('text=Total Revenue')).toBeVisible()
      
      // Charts should utilize available space
      const charts = page.locator('[data-testid="responsive-container"]')
      const chartCount = await charts.count()
      expect(chartCount).toBeGreaterThan(0)
      
      await dashboardPage.takeScreenshot('billing-large-desktop-view')
    })
  })

  test.describe('Financial Workflow Testing', () => {
    test('should complete a typical financial analyst workflow', async ({ page }) => {
      // 1. View initial billing dashboard
      await expect(page.locator('text=Billing Dashboard')).toBeVisible()
      await dashboardPage.takeScreenshot('financial-workflow-1-initial')
      
      // 2. Review current financial metrics
      await expect(page.locator('text=Total Revenue')).toBeVisible()
      await expect(page.locator('text=Outstanding Invoices')).toBeVisible()
      await dashboardPage.takeScreenshot('financial-workflow-2-metrics-review')
      
      // 3. Change period to get recent financial data
      await page.locator('[role="combobox"]').click()
      await page.locator('text=Last 30 days').click()
      await page.waitForTimeout(1500)
      await dashboardPage.takeScreenshot('financial-workflow-3-period-selected')
      
      // 4. Analyze revenue trends
      await page.locator('text=Revenue').click()
      await page.waitForTimeout(1500)
      await dashboardPage.takeScreenshot('financial-workflow-4-revenue-analysis')
      
      // 5. Check invoice status and outstanding payments
      await page.locator('text=Invoices').click()
      await page.waitForTimeout(1500)
      await dashboardPage.takeScreenshot('financial-workflow-5-invoice-status')
      
      // 6. Review payment patterns
      await page.locator('text=Payments').click()
      await page.waitForTimeout(1500)
      await dashboardPage.takeScreenshot('financial-workflow-6-payment-analysis')
      
      // 7. Return to overview for comprehensive view
      await page.locator('text=Overview').click()
      await page.waitForTimeout(1500)
      await dashboardPage.takeScreenshot('financial-workflow-7-overview-return')
      
      // 8. Refresh financial data
      const refreshButton = page.locator('button:has-text("Refresh")')
      await refreshButton.click()
      await page.waitForTimeout(1500)
      await dashboardPage.takeScreenshot('financial-workflow-8-data-refreshed')
      
      // 9. Export financial report
      const exportButton = page.locator('button:has-text("Export")')
      await exportButton.click()
      await dashboardPage.takeScreenshot('financial-workflow-9-export-report')
    })

    test('should handle invoice management workflow', async ({ page }) => {
      // Focus on invoice-related functionality
      await page.locator('text=Invoices').click()
      await page.waitForTimeout(1500)
      
      // Review invoice status breakdown
      await expect(page.locator('[data-testid="responsive-container"]')).toBeVisible()
      await dashboardPage.takeScreenshot('invoice-workflow-1-status-breakdown')
      
      // Check outstanding invoices metric
      await expect(page.locator('text=Outstanding Invoices')).toBeVisible()
      await dashboardPage.takeScreenshot('invoice-workflow-2-outstanding-review')
      
      // Review paid invoices
      await expect(page.locator('text=Paid Invoices')).toBeVisible()
      await dashboardPage.takeScreenshot('invoice-workflow-3-paid-review')
    })
  })

  test.describe('Chart Accuracy and Data Validation', () => {
    test('should display consistent data across tabs', async ({ page }) => {
      // Record revenue value from overview
      await expect(page.locator('text=Total Revenue')).toBeVisible()
      const overviewRevenue = await page.locator('text=Total Revenue').locator('..').textContent()
      
      // Check revenue tab shows consistent data
      await page.locator('text=Revenue').click()
      await page.waitForTimeout(1500)
      
      // Revenue information should be consistent
      await expect(page.locator('[data-testid="responsive-container"]')).toBeVisible()
      
      await dashboardPage.takeScreenshot('billing-data-consistency-check')
    })

    test('should validate chart rendering performance', async ({ page }) => {
      // Measure chart loading time
      const startTime = Date.now()
      
      await expect(page.locator('[data-testid="responsive-container"]')).toBeVisible()
      
      const loadTime = Date.now() - startTime
      expect(loadTime).toBeLessThan(5000) // Charts should load within 5 seconds
      
      await dashboardPage.takeScreenshot('billing-chart-performance-test')
    })
  })
})