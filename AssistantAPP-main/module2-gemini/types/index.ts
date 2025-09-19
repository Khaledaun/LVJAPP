// Export ALL shared types for Module 2
export type DocumentStatus = 'pending_review' | 'approved' | 'rejected' | 'missing'

export interface DocumentData {
  caseId: string
  documentTypeId: string
  fileName: string
  mimeType: string
  base64Content: string
  uploadedBy: string
}

export interface CaseDocument {
  id: string
  case_id: string
  type_id: string
  file_name: string
  mime_type: string
  drive_file_id?: string
  drive_folder_id?: string
  status: DocumentStatus
  version: number
  uploaded_by: string
  created_at: any
  updated_at: any
  rejection_reason?: string
  type_category?: string
}

export type JourneyStatus = 'not_started' | 'in_progress' | 'blocked' | 'completed'

export interface JourneyStage {
  id: string
  case_id: string
  title: string
  order: number
  status: JourneyStatus
  depends_on?: string[]
  due_date?: string
}

export interface JourneySummary {
  stages: JourneyStage[]
  completionPercentage: number
}
