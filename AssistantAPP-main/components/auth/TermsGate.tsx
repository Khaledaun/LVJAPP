'use client'
import useSWR from 'swr'
import { useRouter, usePathname } from 'next/navigation'
const fetcher = (u: string) => fetch(u).then(r => r.json())

export default function TermsGate() {
  const { data } = useSWR<{ accepted: boolean }>(`/api/terms/status`, fetcher)
  const router = useRouter()
  const pathname = usePathname()
  const accepted = data?.accepted

  if (accepted === false && pathname !== '/terms') {
    // Send to terms page if not accepted
    router.replace('/terms')
  }
  return null
}
