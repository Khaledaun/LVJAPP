'use client'
import React from 'react'
import { Circle, Clock, CheckCircle, XCircle, Pause, AlertTriangle } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Define status types that map to traffic light colors
export type TrafficLightStatus = 
  | 'not_started' | 'draft' | 'inactive'     // Gray
  | 'in_progress' | 'pending_review' | 'awaiting' | 'documents_pending' | 'in_review' | 'submitted' // Yellow
  | 'completed' | 'approved' | 'active' | 'paid'    // Green
  | 'blocked' | 'rejected' | 'failed' | 'overdue' | 'denied' // Red

// Traffic light variant styles with high contrast for accessibility
const trafficLightVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      status: {
        // Gray - Not started, draft, inactive
        not_started: 'border-gray-300 bg-gray-100 text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200',
        draft: 'border-gray-300 bg-gray-100 text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200',
        inactive: 'border-gray-300 bg-gray-100 text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200',
        
        // Yellow - In progress, pending, awaiting
        in_progress: 'border-amber-400 bg-amber-100 text-amber-900 dark:border-amber-500 dark:bg-amber-900 dark:text-amber-100',
        pending_review: 'border-amber-400 bg-amber-100 text-amber-900 dark:border-amber-500 dark:bg-amber-900 dark:text-amber-100',
        awaiting: 'border-amber-400 bg-amber-100 text-amber-900 dark:border-amber-500 dark:bg-amber-900 dark:text-amber-100',
        documents_pending: 'border-amber-400 bg-amber-100 text-amber-900 dark:border-amber-500 dark:bg-amber-900 dark:text-amber-100',
        in_review: 'border-amber-400 bg-amber-100 text-amber-900 dark:border-amber-500 dark:bg-amber-900 dark:text-amber-100',
        submitted: 'border-amber-400 bg-amber-100 text-amber-900 dark:border-amber-500 dark:bg-amber-900 dark:text-amber-100',
        
        // Green - Completed, approved, active
        completed: 'border-green-500 bg-green-100 text-green-900 dark:border-green-400 dark:bg-green-900 dark:text-green-100',
        approved: 'border-green-500 bg-green-100 text-green-900 dark:border-green-400 dark:bg-green-900 dark:text-green-100',
        active: 'border-green-500 bg-green-100 text-green-900 dark:border-green-400 dark:bg-green-900 dark:text-green-100',
        paid: 'border-green-500 bg-green-100 text-green-900 dark:border-green-400 dark:bg-green-900 dark:text-green-100',
        
        // Red - Blocked, rejected, failed
        blocked: 'border-red-500 bg-red-100 text-red-900 dark:border-red-400 dark:bg-red-900 dark:text-red-100',
        rejected: 'border-red-500 bg-red-100 text-red-900 dark:border-red-400 dark:bg-red-900 dark:text-red-100',
        failed: 'border-red-500 bg-red-100 text-red-900 dark:border-red-400 dark:bg-red-900 dark:text-red-100',
        overdue: 'border-red-500 bg-red-100 text-red-900 dark:border-red-400 dark:bg-red-900 dark:text-red-100',
        denied: 'border-red-500 bg-red-100 text-red-900 dark:border-red-400 dark:bg-red-900 dark:text-red-100',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      }
    },
    defaultVariants: {
      size: 'md',
    },
  }
)

// Icon mapping for accessibility and visual enhancement
const getStatusIcon = (status: TrafficLightStatus, size: 'sm' | 'md' | 'lg' = 'md') => {
  const iconSize = size === 'sm' ? 10 : size === 'lg' ? 16 : 12
  
  // Gray statuses
  if (['not_started', 'draft', 'inactive'].includes(status)) {
    return <Circle size={iconSize} className="fill-current" />
  }
  
  // Yellow statuses
  if (['in_progress', 'pending_review', 'awaiting', 'documents_pending', 'in_review', 'submitted'].includes(status)) {
    if (status === 'in_progress') {
      return <Clock size={iconSize} className="fill-current" />
    }
    return <AlertTriangle size={iconSize} className="fill-current" />
  }
  
  // Green statuses
  if (['completed', 'approved', 'active', 'paid'].includes(status)) {
    return <CheckCircle size={iconSize} className="fill-current" />
  }
  
  // Red statuses
  if (['blocked', 'rejected', 'failed', 'overdue', 'denied'].includes(status)) {
    if (status === 'blocked') {
      return <Pause size={iconSize} className="fill-current" />
    }
    return <XCircle size={iconSize} className="fill-current" />
  }
  
  // Fallback
  return <Circle size={iconSize} className="fill-current" />
}

// Get traffic light color for semantic meaning
const getTrafficLightColor = (status: TrafficLightStatus): 'gray' | 'yellow' | 'green' | 'red' => {
  if (['not_started', 'draft', 'inactive'].includes(status)) return 'gray'
  if (['in_progress', 'pending_review', 'awaiting', 'documents_pending', 'in_review', 'submitted'].includes(status)) return 'yellow'
  if (['completed', 'approved', 'active', 'paid'].includes(status)) return 'green'
  if (['blocked', 'rejected', 'failed', 'overdue', 'denied'].includes(status)) return 'red'
  return 'gray'
}

// Format status text for display
const formatStatusText = (status: TrafficLightStatus): string => {
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

export interface TrafficLightBadgeProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof trafficLightVariants> {
  status: TrafficLightStatus
  showIcon?: boolean
  showText?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function TrafficLightBadge({ 
  className, 
  status, 
  showIcon = true, 
  showText = true,
  size = 'md',
  ...props 
}: TrafficLightBadgeProps) {
  const trafficLightColor = getTrafficLightColor(status)
  
  return (
    <div 
      className={cn(trafficLightVariants({ status, size }), className)} 
      role="status"
      aria-label={`Status: ${formatStatusText(status)} (${trafficLightColor} light)`}
      {...props}
    >
      {showIcon && getStatusIcon(status, size)}
      {showText && (
        <span className="sr-only md:not-sr-only">
          {formatStatusText(status)}
        </span>
      )}
    </div>
  )
}

// Hook to check if feature is enabled
export function useTrafficLightFeature() {
  // Default to true if environment variable is not set
  const isEnabled = process.env.NEXT_PUBLIC_ENABLE_TRAFFIC_LIGHT_STATUS !== 'false'
  return isEnabled
}

// Legacy badge function for backward compatibility
export const trafficLightBadge = (status: TrafficLightStatus, size: 'sm' | 'md' | 'lg' = 'md') => {
  return trafficLightVariants({ status, size })
}