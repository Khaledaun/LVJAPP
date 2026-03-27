

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import dynamic from 'next/dynamic';

// Import recharts components with proper typing
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';

// Type assertion helpers for Recharts components
const RechartsResponsiveContainer = ResponsiveContainer as any;
const RechartsAreaChart = AreaChart as any;
const RechartsPieChart = PieChart as any;
const RechartsBarChart = BarChart as any;
const RechartsLineChart = LineChart as any;
const RechartsXAxis = XAxis as any;
const RechartsYAxis = YAxis as any;
const RechartsCell = Cell as any;
const RechartsBar = Bar as any;
const RechartsLine = Line as any;
const RechartsArea = Area as any;
const RechartsPie = Pie as any;

import { 
  TrendingUp, TrendingDown, Minus, 
  DollarSign, CreditCard, FileText, Clock, 
  Activity, CheckCircle, AlertTriangle,
  RefreshCw, Download, Calendar, Users
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface BillingMetric {
  key: string;
  title: string;
  value: string | number;
  change?: number;
  trend: 'up' | 'down' | 'stable';
  color: string;
  icon: React.ReactNode;
  metadata?: Record<string, any>;
}

interface ChartData {
  name: string;
  value: number;
  revenue?: number;
  expenses?: number;
  profit?: number;
  [key: string]: any;
}

interface BillingDashboardProps {
  className?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function BillingDashboard({ className }: BillingDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [metrics, setMetrics] = useState<BillingMetric[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadBillingData();
  }, [selectedPeriod]);

  const loadBillingData = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      setMetrics([
        {
          key: 'total_revenue',
          title: 'Total Revenue',
          value: '$125,430',
          change: 15,
          trend: 'up',
          color: 'green',
          icon: <DollarSign className="h-4 w-4" />
        },
        {
          key: 'outstanding_invoices',
          title: 'Outstanding Invoices',
          value: '$23,450',
          change: -8,
          trend: 'down',
          color: 'yellow',
          icon: <FileText className="h-4 w-4" />
        },
        {
          key: 'paid_invoices',
          title: 'Paid This Month',
          value: '$89,230',
          change: 12,
          trend: 'up',
          color: 'blue',
          icon: <CheckCircle className="h-4 w-4" />
        },
        {
          key: 'avg_payment_time',
          title: 'Avg. Payment Time',
          value: '18 days',
          change: 0,
          trend: 'stable',
          color: 'purple',
          icon: <Clock className="h-4 w-4" />
        }
      ]);
    } catch (error) {
      console.error('Error loading billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBillingData();
    setRefreshing(false);
  };

  const getRevenueData = (): ChartData[] => {
    return [
      { name: 'Jan', value: 45000, revenue: 45000, expenses: 32000, profit: 13000 },
      { name: 'Feb', value: 52000, revenue: 52000, expenses: 35000, profit: 17000 },
      { name: 'Mar', value: 48000, revenue: 48000, expenses: 33000, profit: 15000 },
      { name: 'Apr', value: 61000, revenue: 61000, expenses: 38000, profit: 23000 },
      { name: 'May', value: 55000, revenue: 55000, expenses: 36000, profit: 19000 },
      { name: 'Jun', value: 67000, revenue: 67000, expenses: 41000, profit: 26000 }
    ];
  };

  const getInvoiceStatusData = () => {
    return [
      { name: 'Paid', value: 65, color: '#00C49F' },
      { name: 'Pending', value: 25, color: '#FFBB28' },
      { name: 'Overdue', value: 10, color: '#FF8042' }
    ];
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-red-600" />;
      default:
        return <Minus className="h-3 w-3 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Billing Dashboard</h2>
          <p className="text-muted-foreground">
            Track revenue, invoices, and financial performance
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32" data-testid="period-selector">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            data-testid="refresh-button"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" data-testid="export-button">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              <div className={`text-${metric.color}-600`}>
                {metric.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              {metric.change !== undefined && (
                <div className={`flex items-center text-xs ${getTrendColor(metric.trend)}`}>
                  {getTrendIcon(metric.trend)}
                  <span className="ml-1">
                    {Math.abs(metric.change)}% from last period
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Revenue vs Expenses</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <RechartsResponsiveContainer width="100%" height={350}>
                  <RechartsAreaChart data={getRevenueData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <RechartsXAxis dataKey="name" />
                    <RechartsYAxis />
                    <Tooltip />
                    <RechartsArea
                      type="monotone"
                      dataKey="revenue"
                      stackId="1"
                      stroke="#8884d8"
                      fill="#8884d8"
                    />
                    <RechartsArea
                      type="monotone"
                      dataKey="expenses"
                      stackId="2"
                      stroke="#82ca9d"
                      fill="#82ca9d"
                    />
                  </RechartsAreaChart>
                </RechartsResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Invoice Status</CardTitle>
              </CardHeader>
              <CardContent>
                <RechartsResponsiveContainer width="100%" height={350}>
                  <RechartsPieChart>
                    <RechartsPie
                      data={getInvoiceStatusData()}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {(getInvoiceStatusData().map((entry, index) => (
                        <RechartsCell key={`cell-${index}`} fill={entry.color} />
                      )) as any)}
                    </RechartsPie>
                    <Tooltip />
                  </RechartsPieChart>
                </RechartsResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
              <CardDescription>
                Monthly revenue, expenses, and profit analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RechartsResponsiveContainer width="100%" height={400}>
                <RechartsBarChart data={getRevenueData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <RechartsXAxis dataKey="name" />
                  <RechartsYAxis />
                  <Tooltip />
                  <RechartsBar dataKey="revenue" fill="#8884d8" />
                  <RechartsBar dataKey="expenses" fill="#82ca9d" />
                  <RechartsBar dataKey="profit" fill="#ffc658" />
                </RechartsBarChart>
              </RechartsResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Analytics</CardTitle>
              <CardDescription>
                Invoice generation and payment tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RechartsResponsiveContainer width="100%" height={400}>
                <RechartsLineChart data={getRevenueData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <RechartsXAxis dataKey="name" />
                  <RechartsYAxis />
                  <Tooltip />
                  <RechartsLine
                    type="monotone"
                    dataKey="revenue"
                    stroke="#8884d8"
                    strokeWidth={2}
                  />
                </RechartsLineChart>
              </RechartsResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Analytics</CardTitle>
              <CardDescription>
                Payment processing and collection metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RechartsResponsiveContainer width="100%" height={400}>
                <RechartsAreaChart data={getRevenueData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <RechartsXAxis dataKey="name" />
                  <RechartsYAxis />
                  <Tooltip />
                  <RechartsArea
                    type="monotone"
                    dataKey="profit"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.6}
                  />
                </RechartsAreaChart>
              </RechartsResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
