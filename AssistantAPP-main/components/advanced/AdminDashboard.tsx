'use client'
import React from 'react'
import PaymentSystem from './PaymentSystem'
import ReportGenerator from './ReportGenerator'

export default function AdminDashboard({ caseId, currentUserId }: { caseId: string; currentUserId: string }) {
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <PaymentSystem caseId={caseId} currentUserId={currentUserId} />
      <ReportGenerator />
    </div>
  )
}
