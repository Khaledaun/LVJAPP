'use client'
import React from 'react'
import PaymentSystem from '@/module3-gpt5/components/PaymentSystem'
import ReportGenerator from '@/module3-gpt5/components/ReportGenerator'

interface AdminDashboardProps { caseId: string; currentUserId: string }

export default function AdminDashboard({ caseId }: AdminDashboardProps) {
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <PaymentSystem caseId={caseId} />
      <ReportGenerator />
    </div>
  )
}
