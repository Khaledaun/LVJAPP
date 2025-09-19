'use client'
import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import AnalyticsDashboard from './AnalyticsDashboard'
import BillingDashboard from './BillingDashboard'

export default function DashboardShell() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <div className="p-4">Checking session…</div>
  }

  if (!session) {
    return (
      <div className="p-4 space-y-2">
        <div className="text-lg font-semibold">Welcome</div>
        <p className="text-sm text-gray-600">You are not signed in. You can still browse public content.</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6">
      <div className="text-lg font-semibold">Dashboard</div>
      <div className="text-sm text-gray-600 mb-4">Signed in as {session.user?.email} (role: {session.user?.role})</div>
      
      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>
        
        <TabsContent value="analytics">
          <AnalyticsDashboard />
        </TabsContent>
        
        <TabsContent value="billing">
          <BillingDashboard />
        </TabsContent>
      </Tabs>
    </div>
  )
}
