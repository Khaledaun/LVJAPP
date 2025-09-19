'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react'

interface ServiceType {
  id: string
  title: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export default function ServiceTypesAdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newServiceType, setNewServiceType] = useState({ title: '', description: '' })
  const [editingServiceType, setEditingServiceType] = useState({ title: '', description: '' })

  // Check authorization
  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user || session.user.role !== 'LVJ_ADMIN') {
      router.push('/dashboard')
      return
    }
  }, [session, status, router])

  // Fetch service types
  useEffect(() => {
    fetchServiceTypes()
  }, [])

  const fetchServiceTypes = async () => {
    try {
      const response = await fetch('/api/service-types')
      const data = await response.json()
      if (response.ok) {
        setServiceTypes(data.serviceTypes || [])
      } else {
        setError(data.error || 'Failed to fetch service types')
      }
    } catch (err) {
      setError('Failed to fetch service types')
    } finally {
      setLoading(false)
    }
  }

  const handleAddServiceType = async () => {
    if (!newServiceType.title.trim()) {
      setError('Title is required')
      return
    }

    try {
      const response = await fetch('/api/service-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newServiceType),
      })

      const data = await response.json()
      if (response.ok) {
        setServiceTypes([...serviceTypes, data.serviceType])
        setNewServiceType({ title: '', description: '' })
        setShowAddForm(false)
        setError(null)
      } else {
        setError(data.error || 'Failed to create service type')
      }
    } catch (err) {
      setError('Failed to create service type')
    }
  }

  const handleEditServiceType = async (id: string) => {
    if (!editingServiceType.title.trim()) {
      setError('Title is required')
      return
    }

    try {
      const response = await fetch(`/api/service-types/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingServiceType),
      })

      const data = await response.json()
      if (response.ok) {
        setServiceTypes(serviceTypes.map(st => 
          st.id === id ? data.serviceType : st
        ))
        setEditingId(null)
        setError(null)
      } else {
        setError(data.error || 'Failed to update service type')
      }
    } catch (err) {
      setError('Failed to update service type')
    }
  }

  const handleDeleteServiceType = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service type?')) return

    try {
      const response = await fetch(`/api/service-types/${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      if (response.ok) {
        setServiceTypes(serviceTypes.filter(st => st.id !== id))
        setError(null)
      } else {
        setError(data.error || 'Failed to delete service type')
      }
    } catch (err) {
      setError('Failed to delete service type')
    }
  }

  const startEdit = (serviceType: ServiceType) => {
    setEditingId(serviceType.id)
    setEditingServiceType({
      title: serviceType.title,
      description: serviceType.description || '',
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingServiceType({ title: '', description: '' })
  }

  if (status === 'loading' || loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">Loading...</div>
      </div>
    )
  }

  if (!session?.user || session.user.role !== 'LVJ_ADMIN') {
    return null
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Service Type Management</h1>
          <p className="text-gray-600">Manage service types for case intake</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          Add Service Type
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="mb-6 p-4 border rounded-lg bg-gray-50">
          <h3 className="text-lg font-semibold mb-4">Add New Service Type</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title *</label>
              <input
                type="text"
                value={newServiceType.title}
                onChange={(e) => setNewServiceType({ ...newServiceType, title: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="e.g., Work Visa"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={newServiceType.description}
                onChange={(e) => setNewServiceType({ ...newServiceType, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows={3}
                placeholder="Brief description of this service type"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddServiceType}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Save size={16} />
                Save
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setNewServiceType({ title: '', description: '' })
                  setError(null)
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                <X size={16} />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service Types List */}
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Service Types ({serviceTypes.length})</h2>
        </div>
        
        {serviceTypes.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            No service types found. Click "Add Service Type" to create one.
          </div>
        ) : (
          <div className="divide-y">
            {serviceTypes.map((serviceType) => (
              <div key={serviceType.id} className="px-6 py-4">
                {editingId === serviceType.id ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Title *</label>
                      <input
                        type="text"
                        value={editingServiceType.title}
                        onChange={(e) => setEditingServiceType({ 
                          ...editingServiceType, 
                          title: e.target.value 
                        })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Description</label>
                      <textarea
                        value={editingServiceType.description}
                        onChange={(e) => setEditingServiceType({ 
                          ...editingServiceType, 
                          description: e.target.value 
                        })}
                        className="w-full px-3 py-2 border rounded-lg"
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditServiceType(serviceType.id)}
                        className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        <Save size={14} />
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex items-center gap-2 px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                      >
                        <X size={14} />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{serviceType.title}</h3>
                      {serviceType.description && (
                        <p className="text-gray-600 mt-1">{serviceType.description}</p>
                      )}
                      <div className="text-sm text-gray-500 mt-2">
                        Created: {new Date(serviceType.createdAt).toLocaleDateString()}
                        {serviceType.updatedAt !== serviceType.createdAt && (
                          <span className="ml-3">
                            Updated: {new Date(serviceType.updatedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => startEdit(serviceType)}
                        className="flex items-center gap-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Pencil size={14} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteServiceType(serviceType.id)}
                        className="flex items-center gap-1 px-3 py-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        <Link href="/dashboard" className="text-blue-600 hover:underline">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  )
}