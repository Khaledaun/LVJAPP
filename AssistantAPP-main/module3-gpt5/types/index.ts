export type Role = 'client' | 'lvj_admin' | 'lvj_team' | 'lvj_marketing' | 'lawyer_admin' | 'lawyer_associate' | 'lawyer_assistant'

export type PaymentStatus = 'pending'|'awaiting_review'|'paid'|'overdue'|'waived'|'rejected'
export type PaymentMethod = 'online'|'bank_transfer'|'cash'

export interface InternalMessage {
  id: string
  case_id: string
  sender_id: string
  text: string
  message_type: 'question' | 'note' | 'system'
  is_urgent?: boolean
  status: 'unread' | 'read' | 'answered'
  parent_message_id?: string | null
  thread_order?: number
  created_at: any
  updated_at: any
}

export interface Payment {
  id: string
  case_id: string
  title: string
  amount: number
  currency: string
  status: PaymentStatus
  payment_method: PaymentMethod
  due_date?: string | null
  pay_link?: string
  provider_transaction_id?: string | null
}
