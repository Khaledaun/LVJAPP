'use client'
import React from 'react'
import { TrafficLightBadge, type TrafficLightStatus } from '@/components/ui/TrafficLightBadge'
import StatusTimeline from '@/components/journey/StatusTimeline'

export default function TrafficLightDemo() {
  const statuses: TrafficLightStatus[] = [
    'not_started', 'draft', 'inactive',
    'in_progress', 'pending_review', 'awaiting', 'documents_pending', 'in_review', 'submitted',
    'completed', 'approved', 'active', 'paid',
    'blocked', 'rejected', 'failed', 'overdue', 'denied'
  ]

  const mockStages = [
    {
      id: 'stage-1',
      title: 'Document Collection',
      status: 'completed' as const,
      due_date: '2024-01-15'
    },
    {
      id: 'stage-2', 
      title: 'Legal Review',
      status: 'in_progress' as const,
      due_date: '2024-01-20'
    },
    {
      id: 'stage-3',
      title: 'Client Interview',
      status: 'blocked' as const,
      due_date: '2024-01-25'
    },
    {
      id: 'stage-4',
      title: 'Final Submission',
      status: 'not_started' as const
    }
  ]

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Traffic Light Status UI Demo</h1>
        
        <div className="space-y-8">
          {/* All Status Examples */}
          <section className="bg-white p-6 rounded-lg border shadow-sm">
            <h2 className="text-xl font-semibold mb-6">All Status Types with Traffic Light Pattern</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {statuses.map((status) => (
                <div key={status} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm font-medium">{status.replace(/_/g, ' ')}</span>
                  <TrafficLightBadge status={status} size="sm" />
                </div>
              ))}
            </div>
          </section>

          {/* Size Variants */}
          <section className="bg-white p-6 rounded-lg border shadow-sm">
            <h2 className="text-xl font-semibold mb-6">Size Variants</h2>
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm">Small:</span>
                <TrafficLightBadge status="in_progress" size="sm" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Medium:</span>
                <TrafficLightBadge status="in_progress" size="md" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Large:</span>
                <TrafficLightBadge status="in_progress" size="lg" />
              </div>
            </div>
          </section>

          {/* Accessibility Features */}
          <section className="bg-white p-6 rounded-lg border shadow-sm">
            <h2 className="text-xl font-semibold mb-6">Accessibility Features</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Icon + Text (Default)</h3>
                <div className="flex gap-2 flex-wrap">
                  <TrafficLightBadge status="completed" />
                  <TrafficLightBadge status="in_progress" />
                  <TrafficLightBadge status="blocked" />
                  <TrafficLightBadge status="not_started" />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">Icon Only (Color-blind support)</h3>
                <div className="flex gap-2 flex-wrap">
                  <TrafficLightBadge status="completed" showText={false} />
                  <TrafficLightBadge status="in_progress" showText={false} />
                  <TrafficLightBadge status="blocked" showText={false} />
                  <TrafficLightBadge status="not_started" showText={false} />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">Text Only (High contrast)</h3>
                <div className="flex gap-2 flex-wrap">
                  <TrafficLightBadge status="completed" showIcon={false} />
                  <TrafficLightBadge status="in_progress" showIcon={false} />
                  <TrafficLightBadge status="blocked" showIcon={false} />
                  <TrafficLightBadge status="not_started" showIcon={false} />
                </div>
              </div>
            </div>
          </section>

          {/* StatusTimeline Integration */}
          <section className="bg-white p-6 rounded-lg border shadow-sm">
            <h2 className="text-xl font-semibold mb-6">Case Journey Timeline (Enhanced)</h2>
            <StatusTimeline stages={mockStages} />
          </section>

          {/* Color Meaning Guide */}
          <section className="bg-white p-6 rounded-lg border shadow-sm">
            <h2 className="text-xl font-semibold mb-6">Traffic Light Color Guide</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="mb-2">
                  <TrafficLightBadge status="not_started" showText={false} />
                </div>
                <h3 className="font-medium text-gray-600">Gray</h3>
                <p className="text-xs text-gray-500">Not started, draft, inactive</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="mb-2">
                  <TrafficLightBadge status="in_progress" showText={false} />
                </div>
                <h3 className="font-medium text-amber-600">Yellow</h3>
                <p className="text-xs text-gray-500">In progress, pending, awaiting</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="mb-2">
                  <TrafficLightBadge status="completed" showText={false} />
                </div>
                <h3 className="font-medium text-green-600">Green</h3>
                <p className="text-xs text-gray-500">Completed, approved, active</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="mb-2">
                  <TrafficLightBadge status="blocked" showText={false} />
                </div>
                <h3 className="font-medium text-red-600">Red</h3>
                <p className="text-xs text-gray-500">Blocked, rejected, failed</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}