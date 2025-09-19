
// Basic types for deployment without Prisma dependency

export type UserRole = 'client' | 'lawyer' | 'lvj_admin' | 'marketing';
export type Language = 'en' | 'ar' | 'pt';
export type RenderMode = 'light' | 'dark';

// Custom types for the application
export interface CaseWithRelations {
  id: string;
  caseNumber: string;
  visaType: string;
  destinationCountry: string;
  overallStatus: string;
  completionPercentage: number;
  client: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  caseManager?: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
  lawyer?: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Module 2 (Document Management & Journey Tracking) Types
export type DocumentStatus = 'pending_review' | 'approved' | 'rejected' | 'missing';

export interface CaseDocument {
  id: string;
  case_id: string;
  type_id: string;
  file_name: string;
  mime_type: string;
  drive_file_id?: string;
  drive_folder_id?: string;
  status: DocumentStatus;
  version: number;
  uploaded_by: string;
  created_at: any;
  updated_at: any;
  rejection_reason?: string;
  type_category?: string;
}

export type StageStatus = 'not_started' | 'in_progress' | 'blocked' | 'completed';

export interface JourneyStage {
  id: string;
  case_id: string;
  title: string;
  order: number;
  status: StageStatus;
  depends_on?: string[];
  due_date?: string;
}

export interface JourneySummary {
  stages: JourneyStage[];
  completionPercentage: number;
}

// Module 3 (Communication & Advanced Features) Types
export type PaymentStatus = 'pending'|'awaiting_review'|'paid'|'overdue'|'waived'|'rejected';
export type PaymentMethod = 'online'|'bank_transfer'|'cash';

export interface InternalMessage {
  id: string;
  case_id: string;
  sender_id: string;
  text: string;
  message_type: 'question' | 'note' | 'system';
  is_urgent?: boolean;
  status: 'unread' | 'read' | 'answered';
  parent_message_id?: string | null;
  thread_order?: number;
  created_at: any;
  updated_at: any;
}

export interface Payment {
  id: string;
  case_id: string;
  title: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_method: PaymentMethod;
  due_date?: string | null;
  pay_link?: string;
  provider_transaction_id?: string | null;
}
