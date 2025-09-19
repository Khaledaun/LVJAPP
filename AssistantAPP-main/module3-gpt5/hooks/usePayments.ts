'use client'
import { useCallback, useEffect, useState } from 'react'
import type { Payment } from '@/module3-gpt5/types'
import { fetchPayments, createPayment, generatePayLink } from '@/module3-gpt5/lib/db-operations'
import { toast } from '@/module3-gpt5/lib/toast'

export function usePayments(caseId: string) {
  const [items, setItems] = useState<Payment[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchPayments(caseId)
      setItems(data)
    } catch (e:any) {
      toast.error('Failed to load payments')
      console.error('Operation failed:', e)
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => { if (caseId) load() }, [caseId, load])

  const create = useCallback(async (args: { title: string; amount: number; currency: string }) => {
    try {
      await createPayment({ caseId, ...args })
      toast.success('Payment created')
      await load()
    } catch (e:any) {
      toast.error('Create failed')
      console.error('Operation failed:', e)
      throw e
    }
  }, [caseId, load])

  const link = useCallback(async (paymentId: string) => {
    try {
      const res = await generatePayLink(paymentId)
      toast.success('Pay link generated')
      await load()
      return res
    } catch (e:any) {
      toast.error('Link failed')
      console.error('Operation failed:', e)
      throw e
    }
  }, [load])

  return { items, loading, reload: load, create, link }
}
