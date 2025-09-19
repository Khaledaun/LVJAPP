'use client'
import React from 'react'

type BoundaryProps = { children: React.ReactNode, fallback?: React.ReactNode }

export class ErrorBoundary extends React.Component<BoundaryProps, { hasError: boolean }> {
  constructor(props: BoundaryProps) {
    super(props); this.state = { hasError: false }
  }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error: any, info: any) { console.error('Boundary caught error', error, info) }
  render() {
    if (this.state.hasError) return this.props.fallback ?? <div className="p-4 text-red-600">Something went wrong.</div>
    return this.props.children
  }
}
