'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { NewCaseSchema, type NewCaseInput } from '@/lib/validators'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'

interface ServiceType {
  id: string
  title: string
  description: string | null
}

export default function NewCasePage() {
  const router = useRouter()
  const [serverErr, setServerErr] = useState<string | null>(null)
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
  const [loadingServiceTypes, setLoadingServiceTypes] = useState(true)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<NewCaseInput>({
    resolver: zodResolver(NewCaseSchema),
    defaultValues: { title: '', applicantName: '', applicantEmail: '' },
  })

  // Fetch service types on component mount
  useEffect(() => {
    const fetchServiceTypes = async () => {
      try {
        const response = await fetch('/api/service-types')
        const data = await response.json()
        if (response.ok) {
          setServiceTypes(data.serviceTypes || [])
        }
      } catch (err) {
        console.error('Failed to fetch service types:', err)
      } finally {
        setLoadingServiceTypes(false)
      }
    }
    fetchServiceTypes()
  }, [])

  const onSubmit = async (values: NewCaseInput) => {
    setServerErr(null)
    const r = await fetch('/api/cases', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok || !j?.case?.id) {
      const msg = j?.reason || j?.message || `HTTP ${r.status}`
      setServerErr(msg)
      return
    }
    router.push(`/cases/${j.case.id}`)
  }

  return (
    <main className="p-6 max-w-xl space-y-6">
      <Link href="/cases" className="text-sm underline underline-offset-4">&larr; Back to cases</Link>
      <h1 className="text-xl font-semibold">New Case</h1>

      {serverErr && <div className="text-sm text-red-600">{serverErr}</div>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Case title</label>
          <input {...register('title')} className="w-full border rounded px-3 py-2" placeholder="e.g., Work Visa – John Doe" />
          {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title.message}</p>}
        </div>

        <div>
          <label className="block text-sm mb-1">Applicant name</label>
          <input {...register('applicantName')} className="w-full border rounded px-3 py-2" placeholder="Full name" />
          {errors.applicantName && <p className="text-xs text-red-600 mt-1">{errors.applicantName.message}</p>}
        </div>

        <div>
          <label className="block text-sm mb-1">Applicant email</label>
          <input {...register('applicantEmail')} className="w-full border rounded px-3 py-2" placeholder="name@example.com" />
          {errors.applicantEmail && <p className="text-xs text-red-600 mt-1">{errors.applicantEmail.message}</p>}
        </div>

        <div>
          <label className="block text-sm mb-1">Service Type</label>
          <select {...register('serviceTypeId')} className="w-full border rounded px-3 py-2">
            <option value="">Select a service type (optional)</option>
            {loadingServiceTypes ? (
              <option disabled>Loading service types...</option>
            ) : (
              serviceTypes.map((serviceType) => (
                <option key={serviceType.id} value={serviceType.id}>
                  {serviceType.title}
                </option>
              ))
            )}
          </select>
          {errors.serviceTypeId && <p className="text-xs text-red-600 mt-1">{errors.serviceTypeId.message}</p>}
        </div>

        <div className="flex gap-2">
          <button disabled={isSubmitting} className="px-4 py-2 border rounded text-sm disabled:opacity-50">
            {isSubmitting ? 'Creating…' : 'Create case'}
          </button>
          <Link href="/cases" className="px-4 py-2 border rounded text-sm">Cancel</Link>
        </div>
      </form>
    </main>
  )
}
