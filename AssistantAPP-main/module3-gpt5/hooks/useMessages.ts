'use client'
import { useCallback, useEffect, useState } from 'react'
import type { InternalMessage } from '@/module3-gpt5/types'
import { fetchMessages, sendMessage, setMessageStatus } from '@/module3-gpt5/lib/db-operations'
import { toast } from '@/module3-gpt5/lib/toast'

export function useMessages(caseId: string, currentUserId: string) {
  const [items, setItems] = useState<InternalMessage[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchMessages(caseId)
      setItems(data)
    } catch (e:any) {
      toast.error('Failed to load messages')
      console.error('Operation failed:', e)
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => { if (caseId) load() }, [caseId, load])

  const post = useCallback(async (text: string) => {
    try {
      await sendMessage({ caseId, senderId: currentUserId, text })
      await load()
    } catch (e:any) {
      toast.error('Failed to send message')
      console.error('Operation failed:', e)
      throw e
    }
  }, [caseId, currentUserId, load])

  const setStatus = useCallback(async (messageId: string, status: 'read'|'answered') => {
    try {
      await setMessageStatus(messageId, status)
      await load()
    } catch (e:any) {
      toast.error('Failed to update status')
      console.error('Operation failed:', e)
      throw e
    }
  }, [load])

  return { items, loading, reload: load, post, setStatus }
}
