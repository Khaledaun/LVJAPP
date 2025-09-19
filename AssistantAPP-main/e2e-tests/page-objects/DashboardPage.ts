import { test, expect, Page } from '@playwright/test'

class DashboardPage {
  constructor(private page: Page) {}

  // Navigation methods
  async goto() {
    await this.page.goto('/dashboard')
  }

  // Period selector methods
  async selectPeriod(period: string) {
    await this.page.locator('[data-testid="period-selector"]').click()
    await this.page.locator(`[data-value="${period}"]`).click()
  }

  // Tab methods
  async clickTab(tabName: string) {
    await this.page.locator(`[data-value="${tabName}"]`).click()
  }

  // Refresh and export methods
  async clickRefresh() {
    await this.page.locator('[data-testid="refresh-button"]').click()
  }

  async clickExport() {
    await this.page.locator('[data-testid="export-button"]').click()
  }

  // Verification methods
  async expectMetricCard(title: string, value: string) {
    const card = this.page.locator(`text=${title}`).locator('..').locator('..')
    await expect(card).toContainText(title)
    await expect(card).toContainText(value)
  }

  async expectChartVisible(chartType: string) {
    await expect(this.page.locator(`[data-testid="${chartType}"]`)).toBeVisible()
  }

  async expectLoadingComplete() {
    await this.page.waitForLoadState('networkidle')
    await expect(this.page.locator('[data-testid="skeleton"]')).toHaveCount(0)
  }

  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}.png`,
      fullPage: true
    })
  }

  // Wait for specific elements
  async waitForDashboardLoad() {
    await expect(this.page.locator('h2')).toBeVisible({ timeout: 10000 })
    await this.page.waitForTimeout(2000) // Wait for data to load
  }

  // Check responsive design
  async checkMobileView() {
    await this.page.setViewportSize({ width: 375, height: 667 })
    await this.waitForDashboardLoad()
  }

  async checkTabletView() {
    await this.page.setViewportSize({ width: 768, height: 1024 })
    await this.waitForDashboardLoad()
  }

  async checkDesktopView() {
    await this.page.setViewportSize({ width: 1920, height: 1080 })
    await this.waitForDashboardLoad()
  }
}

export { DashboardPage }