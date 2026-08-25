export type UserRole = 'admin' | 'manager' | 'employee'

export type CertificationType =
  | 'biot'
  | 'industrial_safety'
  | 'fire_safety'
  | 'slinger'
  | 'height_works'
  | 'electrical_safety_4'

export type Status = 'ok' | 'warning' | 'expired' | 'none'

export const CERTIFICATION_LABELS: Record<CertificationType, string> = {
  biot: 'БиОТ',
  industrial_safety: 'Промышленная безопасность',
  fire_safety: 'Пожарная безопасность',
  slinger: 'Стропальщик',
  height_works: 'Верхолазные работы',
  electrical_safety_4: 'Электробезопасность — IV группа',
}

export interface Employee {
  id: string
  full_name: string
  tabel_number: string | null
  photo_url: string | null
  workshop: string | null
  site: string | null
  department: string | null
  position_title: string | null
  phone: string | null
  email: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Certification {
  id: string
  employee_id: string
  type: CertificationType
  issue_date: string | null
  expiry_date: string | null
  certificate_no: string | null
  trainer: string | null
  organization: string | null
  comment: string | null
  document_id: string | null
  created_at: string
  updated_at: string
}

export interface CertificationWithStatus extends Certification {
  status: Status
}

export interface Profile {
  id: string
  full_name: string | null
  role: UserRole
  employee_id: string | null
  created_at: string
}

export interface DocumentRow {
  id: string
  entity_type: string
  entity_id: string
  file_path: string
  file_name: string
  file_type: string | null
  uploaded_by: string | null
  uploaded_at: string
}

