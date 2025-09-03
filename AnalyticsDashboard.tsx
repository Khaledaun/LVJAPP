

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
import { 
  TrendingUp, TrendingDown, Minus, 
  Users, FileText, DollarSign, Clock, 
  Activity, CheckCircle, AlertTriangle,
  RefreshCw, Download, Calendar
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface MetricCard {
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
  billableHours?: number;
  totalHours?: number;
  revenue?: number;
  target?: number;
  [key: string]: any;
}

interface AnalyticsDashboardProps {
  className?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AnalyticsDashboard({ className }: AnalyticsDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      setMetrics([
        {
          key: 'total_cases',
          title: 'Total Cases',
          value: 156,
          change: 12,
          trend: 'up',
          color: 'blue',
          icon: <FileText className="h-4 w-4" />
        },
        {
          key: 'active_clients',
          title: 'Active Clients',
          value: 89,
          change: 5,
          trend: 'up',
          color: 'green',
          icon: <Users className="h-4 w-4" />
        },
        {
          key: 'revenue',
          title: 'Revenue',
          value: '$45,230',
          change: -2,
          trend: 'down',
          color: 'yellow',
          icon: <DollarSign className="h-4 w-4" />
        },
        {
          key: 'avg_completion',
          title: 'Avg. Completion Time',
          value: '14 days',
          change: 0,
          trend: 'stable',
          color: 'purple',
          icon: <Clock className="h-4 w-4" />
        }
      ]);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const getRevenueData = (): ChartData[] => {
    return metrics.map((metric, index) => ({
      name: metric.title,
      value: typeof metric.value === 'string' ? parseFloat(metric.value.replace(/[^0-9.-]+/g, '')) || 0 : Number(metric.value),
      revenue: Number(metric.value) || 0,
      target: 50000 + (index * 5000)
    }));
  };

  const getProductivityData = (): ChartData[] => {
    return [
      { name: 'Jan', value: 120, billableHours: 120, totalHours: 160 },
      { name: 'Feb', value: 135, billableHours: 135, totalHours: 170 },
      { name: 'Mar', value: 145, billableHours: 145, totalHours: 165 },
      { name: 'Apr', value: 140, billableHours: 140, totalHours: 175 },
      { name: 'May', value: 155, billableHours: 155, totalHours: 180 },
      { name: 'Jun', value: 150, billableHours: 150, totalHours: 170 }
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
          <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of your law firm's performance and metrics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
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
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
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
          <TabsTrigger value="productivity">Productivity</TabsTrigger>
          <TabsTrigger value="cases">Cases</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Revenue Overview</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                  Revenue chart placeholder
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Case Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <RechartsResponsiveContainer width="100%" height={350}>
                  <RechartsPieChart>
                    <Pie
                      data={[
                        { name: 'Active', value: 45 },
                        { name: 'Pending', value: 25 },
                        { name: 'Completed', value: 20 },
                        { name: 'On Hold', value: 10 }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent! * 100).toFixed(0)}%`}
                    >
                      {([
                        { name: 'Active', value: 45 },
                        { name: 'Pending', value: 25 },
                        { name: 'Completed', value: 20 },
                        { name: 'On Hold', value: 10 }
                      ].map((entry, index) => (
                        <RechartsCell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      )) as any)}
                    </Pie>
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
                Monthly revenue and targets comparison
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RechartsResponsiveContainer width="100%" height={400}>
                <RechartsBarChart data={getRevenueData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <RechartsXAxis dataKey="name" />
                  <RechartsYAxis />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#8884d8" />
                  <Bar dataKey="target" fill="#82ca9d" />
                </RechartsBarChart>
              </RechartsResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="productivity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Productivity Metrics</CardTitle>
              <CardDescription>
                Billable vs total hours comparison
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RechartsResponsiveContainer width="100%" height={400}>
                <RechartsLineChart data={getProductivityData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <RechartsXAxis dataKey="name" />
                  <RechartsYAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="billableHours"
                    stroke="#8884d8"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalHours"
                    stroke="#82ca9d"
                    strokeWidth={2}
                  />
                </RechartsLineChart>
              </RechartsResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cases" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Case Analytics</CardTitle>
              <CardDescription>
                Case completion and performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RechartsResponsiveContainer width="100%" height={400}>
                <RechartsAreaChart data={getProductivityData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <RechartsXAxis dataKey="name" />
                  <RechartsYAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="value"
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
