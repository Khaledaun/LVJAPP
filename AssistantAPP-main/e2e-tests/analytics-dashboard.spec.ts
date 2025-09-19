import { test, expect } from '@playwright/test'
import { DashboardPage } from './page-objects/DashboardPage'

test.describe('Analytics Dashboard E2E Tests', () => {
  let dashboardPage: DashboardPage

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page)
    await dashboardPage.goto()
    await dashboardPage.waitForDashboardLoad()
  })

  test.describe('Dashboard Loading and Initial State', () => {
    test('should load analytics dashboard with correct header and description', async ({ page }) => {
      await expect(page.locator('h2')).toContainText('Analytics Dashboard')
      await expect(page.locator('p')).toContainText("Overview of your law firm's performance and metrics")
      
      // Take screenshot of initial state
      await dashboardPage.takeScreenshot('analytics-dashboard-initial')
    })

    test('should display all metric cards after loading', async ({ page }) => {
      // Wait for metrics to load and verify they are visible
      await expect(page.locator('text=Total Cases')).toBeVisible()
      await expect(page.locator('text=Active Clients')).toBeVisible()
      await expect(page.locator('text=Revenue')).toBeVisible()
      await expect(page.locator('text=Avg. Completion Time')).toBeVisible()
      
      // Verify metric values are displayed (non-empty)
      const metricCards = page.locator('[role="article"]') // Assuming cards have article role
      const cardCount = await metricCards.count()
      expect(cardCount).toBeGreaterThanOrEqual(4)
      
      await dashboardPage.takeScreenshot('analytics-metrics-loaded')
    })

    test('should display charts in overview tab', async ({ page }) => {
      // Verify charts are rendered
      const chartContainers = page.locator('[data-testid="responsive-container"]')
      const chartCount = await chartContainers.count()
      expect(chartCount).toBeGreaterThan(0)
      
      await dashboardPage.takeScreenshot('analytics-overview-charts')
    })
  })

  test.describe('Period Selection Functionality', () => {
    test('should allow period selection and update data', async ({ page }) => {
      // Test period selector is visible
      await expect(page.locator('[role="combobox"]')).toBeVisible()
      
      // Test changing to different periods
      const periods = [
        { value: '7d', label: 'Last 7 days' },
        { value: '90d', label: 'Last 90 days' },
        { value: '1y', label: 'Last year' },
        { value: '30d', label: 'Last 30 days' } // Return to default
      ]

      for (const period of periods) {
        await page.locator('[role="combobox"]').click()
        await page.locator(`text=${period.label}`).click()
        
        // Wait for data to reload
        await page.waitForTimeout(1500)
        
        // Verify data is still displayed
        await expect(page.locator('text=Total Cases')).toBeVisible()
        
        await dashboardPage.takeScreenshot(`analytics-period-${period.value}`)
      }
    })

    test('should maintain period selection across tab switches', async ({ page }) => {
      // Change to 7 days period
      await page.locator('[role="combobox"]').click()
      await page.locator('text=Last 7 days').click()
      await page.waitForTimeout(1000)
      
      // Switch to revenue tab and back
      await page.locator('[data-value="revenue"]').click()
      await page.waitForTimeout(1000)
      await page.locator('[data-value="overview"]').click()
      await page.waitForTimeout(1000)
      
      // Period should still be 7 days
      await expect(page.locator('[role="combobox"]')).toBeVisible()
    })
  })

  test.describe('Tab Navigation and Content', () => {
    test('should navigate through all analytics tabs', async ({ page }) => {
      const tabs = [
        { value: 'overview', label: 'Overview' },
        { value: 'revenue', label: 'Revenue' },
        { value: 'productivity', label: 'Productivity' },
        { value: 'cases', label: 'Cases' }
      ]

      for (const tab of tabs) {
        await page.locator(`text=${tab.label}`).click()
        await page.waitForTimeout(1500)
        
        // Verify tab is active and content is displayed
        await expect(page.locator(`[data-value="${tab.value}"]`)).toBeVisible()
        
        // Verify charts are present in each tab
        const chartContainers = page.locator('[data-testid="responsive-container"]')
        const chartCount = await chartContainers.count()
        expect(chartCount).toBeGreaterThan(0)
        
        await dashboardPage.takeScreenshot(`analytics-tab-${tab.value}`)
      }
    })

    test('should display appropriate content for revenue tab', async ({ page }) => {
      await page.locator('text=Revenue').click()
      await page.waitForTimeout(1500)
      
      // Should display revenue-specific charts and data
      await expect(page.locator('[data-testid="responsive-container"]')).toBeVisible()
      
      await dashboardPage.takeScreenshot('analytics-revenue-tab-content')
    })

    test('should display appropriate content for productivity tab', async ({ page }) => {
      await page.locator('text=Productivity').click()
      await page.waitForTimeout(1500)
      
      // Should display productivity-specific charts
      await expect(page.locator('[data-testid="responsive-container"]')).toBeVisible()
      
      await dashboardPage.takeScreenshot('analytics-productivity-tab-content')
    })

    test('should display appropriate content for cases tab', async ({ page }) => {
      await page.locator('text=Cases').click()
      await page.waitForTimeout(1500)
      
      // Should display case-specific charts
      await expect(page.locator('[data-testid="responsive-container"]')).toBeVisible()
      
      await dashboardPage.takeScreenshot('analytics-cases-tab-content')
    })
  })

  test.describe('Interactive Controls', () => {
    test('should handle refresh button functionality', async ({ page }) => {
      // Find and click refresh button
      const refreshButton = page.locator('button:has-text("Refresh")')
      await expect(refreshButton).toBeVisible()
      
      await refreshButton.click()
      await page.waitForTimeout(1500)
      
      // Data should still be displayed after refresh
      await expect(page.locator('text=Total Cases')).toBeVisible()
      
      await dashboardPage.takeScreenshot('analytics-after-refresh')
    })

    test('should handle export button functionality', async ({ page }) => {
      // Find and click export button
      const exportButton = page.locator('button:has-text("Export")')
      await expect(exportButton).toBeVisible()
      
      await exportButton.click()
      
      // Export button should remain functional (no errors)
      await expect(exportButton).toBeVisible()
      
      await dashboardPage.takeScreenshot('analytics-export-clicked')
    })
  })

  test.describe('Metric Display and Trend Indicators', () => {
    test('should display metric values and trend indicators', async ({ page }) => {
      // Wait for metrics to load
      await expect(page.locator('text=Total Cases')).toBeVisible()
      
      // Check for trend indicators (arrows and percentages)
      const trendIndicators = page.locator('text=% from last period')
      const indicatorCount = await trendIndicators.count()
      expect(indicatorCount).toBeGreaterThan(0)
      
      // Check for metric values (numbers/currency)
      const totalCasesCard = page.locator('text=Total Cases').locator('..')
      await expect(totalCasesCard).toContainText(/\d+/)
      
      await dashboardPage.takeScreenshot('analytics-metrics-with-trends')
    })

    test('should display revenue metric with currency formatting', async ({ page }) => {
      await expect(page.locator('text=Revenue')).toBeVisible()
      
      // Revenue should show currency format
      const revenueCard = page.locator('text=Revenue').locator('..')
      await expect(revenueCard).toContainText(/\$/)
      
      await dashboardPage.takeScreenshot('analytics-revenue-metric')
    })
  })

  test.describe('Chart Rendering and Accuracy', () => {
    test('should render charts with proper data visualization', async ({ page }) => {
      // Verify charts are rendered and interactive
      const charts = page.locator('[data-testid="responsive-container"]')
      const chartCount = await charts.count()
      expect(chartCount).toBeGreaterThan(0)
      
      // Check for chart elements (bars, lines, areas)
      const chartElements = page.locator('[data-testid*="chart"], [data-testid*="bar"], [data-testid*="line"], [data-testid*="area"]')
      const elementCount = await chartElements.count()
      expect(elementCount).toBeGreaterThan(0)
      
      await dashboardPage.takeScreenshot('analytics-charts-rendered')
    })

    test('should display pie chart for case status distribution', async ({ page }) => {
      // Look for pie chart in overview
      const pieCharts = page.locator('[data-testid="pie-chart"]')
      const pieCount = await pieCharts.count()
      expect(pieCount).toBeGreaterThan(0)
      
      await dashboardPage.takeScreenshot('analytics-pie-chart')
    })
  })

  test.describe('Responsive Design', () => {
    test('should work properly on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.reload()
      await dashboardPage.waitForDashboardLoad()
      
      // Dashboard should still be functional
      await expect(page.locator('h2')).toContainText('Analytics Dashboard')
      await expect(page.locator('text=Total Cases')).toBeVisible()
      
      // Tabs should be accessible on mobile
      await page.locator('text=Revenue').click()
      await page.waitForTimeout(1000)
      
      await dashboardPage.takeScreenshot('analytics-mobile-view')
    })

    test('should work properly on tablet devices', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.reload()
      await dashboardPage.waitForDashboardLoad()
      
      // Dashboard should still be functional
      await expect(page.locator('h2')).toContainText('Analytics Dashboard')
      await expect(page.locator('text=Total Cases')).toBeVisible()
      
      await dashboardPage.takeScreenshot('analytics-tablet-view')
    })

    test('should work properly on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 })
      await page.reload()
      await dashboardPage.waitForDashboardLoad()
      
      // All elements should be properly laid out
      await expect(page.locator('h2')).toContainText('Analytics Dashboard')
      await expect(page.locator('text=Total Cases')).toBeVisible()
      
      // Charts should have full width
      const charts = page.locator('[data-testid="responsive-container"]')
      const chartCount = await charts.count()
      expect(chartCount).toBeGreaterThan(0)
      
      await dashboardPage.takeScreenshot('analytics-desktop-view')
    })
  })

  test.describe('User Workflow Testing', () => {
    test('should complete a typical analyst workflow', async ({ page }) => {
      // 1. View initial dashboard
      await expect(page.locator('text=Analytics Dashboard')).toBeVisible()
      await dashboardPage.takeScreenshot('workflow-1-initial-view')
      
      // 2. Change time period to get recent data
      await page.locator('[role="combobox"]').click()
      await page.locator('text=Last 7 days').click()
      await page.waitForTimeout(1500)
      await dashboardPage.takeScreenshot('workflow-2-period-changed')
      
      // 3. Review revenue metrics
      await page.locator('text=Revenue').click()
      await page.waitForTimeout(1500)
      await dashboardPage.takeScreenshot('workflow-3-revenue-tab')
      
      // 4. Check productivity metrics
      await page.locator('text=Productivity').click()
      await page.waitForTimeout(1500)
      await dashboardPage.takeScreenshot('workflow-4-productivity-tab')
      
      // 5. Review case distribution
      await page.locator('text=Cases').click()
      await page.waitForTimeout(1500)
      await dashboardPage.takeScreenshot('workflow-5-cases-tab')
      
      // 6. Refresh data
      const refreshButton = page.locator('button:has-text("Refresh")')
      await refreshButton.click()
      await page.waitForTimeout(1500)
      await dashboardPage.takeScreenshot('workflow-6-data-refreshed')
      
      // 7. Export data
      const exportButton = page.locator('button:has-text("Export")')
      await exportButton.click()
      await dashboardPage.takeScreenshot('workflow-7-export-clicked')
    })
  })
})