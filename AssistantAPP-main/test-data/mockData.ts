// Realistic test data that mimics production scenarios
export const mockAnalyticsData = {
  defaultPeriod: '30d',
  metrics: [
    {
      key: 'total_cases',
      title: 'Total Cases',
      value: 156,
      change: 12,
      trend: 'up',
      color: 'blue',
    },
    {
      key: 'active_clients',
      title: 'Active Clients',
      value: 89,
      change: 5,
      trend: 'up',
      color: 'green',
    },
    {
      key: 'revenue',
      title: 'Revenue',
      value: '$45,230',
      change: -2,
      trend: 'down',
      color: 'yellow',
    },
    {
      key: 'avg_completion',
      title: 'Avg. Completion Time',
      value: '14 days',
      change: 0,
      trend: 'stable',
      color: 'purple',
    }
  ],
  revenueData: [
    { name: 'Jan', value: 45000, target: 50000, cases: 12 },
    { name: 'Feb', value: 52000, target: 50000, cases: 18 },
    { name: 'Mar', value: 48000, target: 50000, cases: 15 },
    { name: 'Apr', value: 61000, target: 50000, cases: 22 },
    { name: 'May', value: 55000, target: 50000, cases: 19 },
    { name: 'Jun', value: 67000, target: 50000, cases: 28 }
  ],
  caseStatusData: [
    { name: 'Active', value: 45, color: '#0088FE' },
    { name: 'Pending', value: 25, color: '#00C49F' },
    { name: 'Completed', value: 20, color: '#FFBB28' },
    { name: 'On Hold', value: 10, color: '#FF8042' }
  ],
  periods: [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' }
  ]
}

export const mockBillingData = {
  defaultPeriod: '30d',
  metrics: [
    {
      key: 'total_revenue',
      title: 'Total Revenue',
      value: '$125,430',
      change: 15,
      trend: 'up',
      color: 'green',
    },
    {
      key: 'outstanding_invoices',
      title: 'Outstanding Invoices',
      value: '$23,450',
      change: -8,
      trend: 'down',
      color: 'red',
    },
    {
      key: 'paid_invoices',
      title: 'Paid Invoices',
      value: '$101,980',
      change: 22,
      trend: 'up',
      color: 'green',
    },
    {
      key: 'avg_payment_time',
      title: 'Avg. Payment Time',
      value: '18 days',
      change: -3,
      trend: 'up',
      color: 'blue',
    }
  ],
  revenueData: [
    { name: 'Jan', value: 45000, revenue: 45000, expenses: 32000, profit: 13000 },
    { name: 'Feb', value: 52000, revenue: 52000, expenses: 35000, profit: 17000 },
    { name: 'Mar', value: 48000, revenue: 48000, expenses: 33000, profit: 15000 },
    { name: 'Apr', value: 61000, revenue: 61000, expenses: 38000, profit: 23000 },
    { name: 'May', value: 55000, revenue: 55000, expenses: 36000, profit: 19000 },
    { name: 'Jun', value: 67000, revenue: 67000, expenses: 41000, profit: 26000 }
  ],
  invoiceStatusData: [
    { name: 'Paid', value: 65, color: '#0088FE' },
    { name: 'Pending', value: 20, color: '#00C49F' },
    { name: 'Overdue', value: 10, color: '#FF8042' },
    { name: 'Draft', value: 5, color: '#FFBB28' }
  ],
  periods: [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' }
  ]
}

export const testScenarios = {
  analytics: {
    periods: ['7d', '30d', '90d', '1y'],
    tabs: ['overview', 'revenue', 'productivity', 'cases'],
    expectedMetrics: 4,
    expectedCharts: {
      overview: 2,
      revenue: 1,
      productivity: 1,
      cases: 1
    }
  },
  billing: {
    periods: ['7d', '30d', '90d', '1y'],
    tabs: ['overview', 'revenue', 'invoices', 'payments'],
    expectedMetrics: 4,
    expectedCharts: {
      overview: 2,
      revenue: 1,
      invoices: 1,
      payments: 1
    }
  }
}

export const apiResponses = {
  analytics: {
    success: {
      data: mockAnalyticsData,
      status: 200,
      timestamp: new Date().toISOString()
    },
    loading: {
      data: null,
      status: 'loading',
      timestamp: new Date().toISOString()
    },
    error: {
      data: null,
      status: 500,
      error: 'Failed to fetch analytics data',
      timestamp: new Date().toISOString()
    }
  },
  billing: {
    success: {
      data: mockBillingData,
      status: 200,
      timestamp: new Date().toISOString()
    },
    loading: {
      data: null,
      status: 'loading',
      timestamp: new Date().toISOString()
    },
    error: {
      data: null,
      status: 500,
      error: 'Failed to fetch billing data',
      timestamp: new Date().toISOString()
    }
  }
}