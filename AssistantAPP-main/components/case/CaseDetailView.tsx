
'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

// Import the new module components
import DocumentUpload from '@/components/documents/DocumentUpload'
import DocumentList from '@/components/documents/DocumentList'
import JourneyTracker from '@/components/journey/JourneyTracker'
import MessageCenter from '@/components/messaging/MessageCenter'
import PaymentSystem from '@/components/advanced/PaymentSystem'
import AdminDashboard from '@/components/advanced/AdminDashboard'

interface CaseDetailViewProps {
  caseId: string
  userId: string
  userRole: string
  caseData: {
    caseNumber: string
    visaType: string
    destinationCountry: string
    overallStatus: string
    completionPercentage: number
    client: {
      firstName: string | null
      lastName: string | null
      email: string
    }
  }
}

export default function CaseDetailView({ caseId, userId, userRole, caseData }: CaseDetailViewProps) {
  const [activeTab, setActiveTab] = useState('overview')

  const isAdmin = userRole === 'lvj_admin' || userRole === 'lvj_team'
  const isLawyer = userRole.includes('LAWYER')
  const isClient = userRole === 'client'

  return (
    <div className="container mx-auto p-6">
      {/* Case Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {caseData.caseNumber}
            </h1>
            <p className="text-gray-600 mt-1">
              {caseData.visaType} • {caseData.destinationCountry}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant={caseData.overallStatus === 'ACTIVE' ? 'default' : 'secondary'}>
              {caseData.overallStatus}
            </Badge>
            <div className="text-right">
              <p className="text-sm text-gray-600">Progress</p>
              <p className="text-lg font-semibold">{caseData.completionPercentage}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="journey">Journey</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          {(isAdmin || isLawyer) && (
            <TabsTrigger value="admin">Admin</TabsTrigger>
          )}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>Client Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p><strong>Name:</strong> {caseData.client.firstName} {caseData.client.lastName}</p>
                  <p><strong>Email:</strong> {caseData.client.email}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Case Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p><strong>Status:</strong> {caseData.overallStatus}</p>
                  <p><strong>Progress:</strong> {caseData.completionPercentage}%</p>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${caseData.completionPercentage}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab('documents')}
                  >
                    Upload Documents
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setActiveTab('messages')}
                  >
                    Send Message
                  </Button>
                  {!isClient && (
                    <Button 
                      variant="outline"
                      onClick={() => setActiveTab('journey')}
                    >
                      Update Journey
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Upload Documents</CardTitle>
                  <CardDescription>
                    Upload required documents for your case
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DocumentUpload 
                    caseId={caseId} 
                    documentTypeId="general"
                    onUploaded={(docId) => {
                      console.log('Document uploaded:', docId)
                      // Refresh document list
                    }}
                  />
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Document List</CardTitle>
                  <CardDescription>
                    All documents related to this case
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DocumentList caseId={caseId} />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Journey Tab */}
        <TabsContent value="journey" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Case Journey</CardTitle>
              <CardDescription>
                Track the progress of your case through different stages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <JourneyTracker caseId={caseId} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Internal Messages</CardTitle>
              <CardDescription>
                Communicate with the case team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MessageCenter caseId={caseId} currentUserId={userId} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
              <CardDescription>
                Manage case-related payments and invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentSystem caseId={caseId} currentUserId={userId} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admin Tab (restricted access) */}
        {(isAdmin || isLawyer) && (
          <TabsContent value="admin" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Admin Dashboard</CardTitle>
                <CardDescription>
                  Administrative tools and case management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AdminDashboard caseId={caseId} currentUserId={userId} />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
