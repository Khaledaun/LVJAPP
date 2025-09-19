'use client'
import { useCallback, useEffect, useState } from 'react'
import type { JourneySummary } from '@/module2-gemini/types'
import { getJourney } from '@/module2-gemini/lib/db-operations'
import { toast } from '@/module2-gemini/lib/toast'

export function useJourney(caseId: string) {
  const [data, setData] = useState<JourneySummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await getJourney(caseId)
      setData(res)
    } catch (e:any) {
      setError(e.message || 'Failed to load journey')
      toast.error('Failed to load journey')
      console.error('Operation failed:', e)
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => { if (caseId) load() }, [caseId, load])

  return { data, loading, error, reload: load }
}
