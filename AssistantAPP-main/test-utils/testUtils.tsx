import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'
import { SessionProvider } from 'next-auth/react'

// Mock session for testing
const mockSession = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'admin',
    name: 'Test User'
  },
  expires: '2024-12-31'
}

// Custom render function that includes providers
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <SessionProvider session={mockSession}>
        {children}
      </SessionProvider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...options })
}

// Test utilities for dashboard testing
export const testUtils = {
  // Wait for loading states to complete
  waitForDataLoad: async (timeout = 2000) => {
    return new Promise(resolve => setTimeout(resolve, timeout))
  },

  // Mock API responses
  mockApiResponse: (endpoint: string, response: any) => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(response),
      } as Response)
    )
  },

  // Mock API error
  mockApiError: (endpoint: string, error: string) => {
    global.fetch = jest.fn(() =>
      Promise.reject(new Error(error))
    )
  },

  // Check if element exists and is visible
  expectElementVisible: (element: HTMLElement | null) => {
    expect(element).toBeInTheDocument()
    expect(element).toBeVisible()
  },

  // Check metric card content
  expectMetricCard: (container: HTMLElement, title: string, value: string) => {
    const titleElement = container.querySelector(`[data-testid="metric-${title.toLowerCase().replace(/\s+/g, '-')}"]`)
    expect(titleElement).toBeInTheDocument()
    expect(container).toHaveTextContent(title)
    expect(container).toHaveTextContent(value)
  },

  // Check chart rendering
  expectChartRendered: (container: HTMLElement, chartType: string) => {
    const chart = container.querySelector(`[data-testid="${chartType}"]`)
    expect(chart).toBeInTheDocument()
  },

  // Simulate period selection
  simulatePeriodChange: async (user: any, container: HTMLElement, period: string) => {
    const select = container.querySelector('[data-testid="period-selector"]')
    if (select) {
      await user.click(select)
      const option = container.querySelector(`[data-value="${period}"]`)
      if (option) {
        await user.click(option)
      }
    }
  },

  // Simulate tab click
  simulateTabClick: async (user: any, container: HTMLElement, tabName: string) => {
    const tab = container.querySelector(`[data-value="${tabName}"]`)
    if (tab) {
      await user.click(tab)
    }
  },

  // Simulate refresh button click
  simulateRefresh: async (user: any, container: HTMLElement) => {
    const refreshButton = container.querySelector('[data-testid="refresh-button"]')
    if (refreshButton) {
      await user.click(refreshButton)
    }
  },

  // Simulate export button click
  simulateExport: async (user: any, container: HTMLElement) => {
    const exportButton = container.querySelector('[data-testid="export-button"]')
    if (exportButton) {
      await user.click(exportButton)
    }
  }
}

// Export everything from testing-library
export * from '@testing-library/react'

// Override render method
export { customRender as render }