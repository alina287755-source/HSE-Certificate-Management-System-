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
  telegram_chat_id: string | null
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

// ---------------------------------------------------------------------------
// Обучение
// ---------------------------------------------------------------------------

export type TrainingFormat = 'webinar' | 'online' | 'offline' | 'other'
export type OrganizerType = 'external' | 'kazakhtelecom_trainer'

export const TRAINING_FORMAT_LABELS: Record<TrainingFormat, string> = {
  webinar: 'Вебинар',
  online: 'Онлайн',
  offline: 'Офлайн',
  other: 'Другое',
}

export const ORGANIZER_TYPE_LABELS: Record<OrganizerType, string> = {
  external: 'Сторонняя организация',
  kazakhtelecom_trainer: 'Тренер АО «Казахтелеком»',
}

export interface Training {
  id: string
  employee_id: string
  title: string
  training_date: string | null
  format: TrainingFormat
  organizer_type: OrganizerType | null
  organizer_name: string | null
  language: string | null
  duration_hours: number | null
  document_id: string | null
  comment: string | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Инструктажи
// ---------------------------------------------------------------------------

export type BriefingType = 'primary' | 'repeat' | 'unscheduled' | 'targeted'

export const BRIEFING_TYPE_LABELS: Record<BriefingType, string> = {
  primary: 'Первичный',
  repeat: 'Повторный',
  unscheduled: 'Внеплановый',
  targeted: 'Целевой',
}

export interface Briefing {
  id: string
  employee_id: string
  type: BriefingType
  briefing_date: string
  reason: string | null
  conducted_by: string | null
  conducted_by_position: string | null
  comment: string | null
  document_id: string | null
  created_at: string
}

export interface EmployeeBriefingStatus {
  employee_id: string
  last_repeat_date: string | null
  next_repeat_due: string | null
  status: Status
}

// ---------------------------------------------------------------------------
// Проверка знаний и допуск
// ---------------------------------------------------------------------------

export interface KnowledgeCheck {
  id: string
  employee_id: string
  check_date: string
  check_type: string | null
  result: string | null
  admission: string | null
  expiry_date: string | null
  conducted_by: string | null
  commission: string | null
  protocol_number: string | null
  document_id: string | null
  comment: string | null
  created_at: string
  updated_at: string
}

export interface KnowledgeCheckWithStatus extends KnowledgeCheck {
  status: Status
}

// ---------------------------------------------------------------------------
// СИЗ и спецодежда
// ---------------------------------------------------------------------------

export interface PPEItem {
  id: string
  employee_id: string
  name: string
  category: string | null
  size: string | null
  quantity: number | null
  issue_date: string | null
  expiry_date: string | null
  doc_number: string | null
  document_id: string | null
  comment: string | null
  created_at: string
  updated_at: string
}

export interface PPEItemWithStatus extends PPEItem {
  status: Status
}

// ---------------------------------------------------------------------------
// Средства безопасности (когти, пояса, инструмент, эл. инструмент, лестницы, стремянки)
// ---------------------------------------------------------------------------

export type EquipmentType = 'claws' | 'belt' | 'insulated_tool' | 'power_tool' | 'ladder' | 'stepladder'

export const EQUIPMENT_TYPE_LABELS: Record<EquipmentType, string> = {
  claws: 'Когти',
  belt: 'Предохранительный пояс',
  insulated_tool: 'Инструмент с изолированными рукоятками',
  power_tool: 'Электроинструмент',
  ladder: 'Лестница',
  stepladder: 'Стремянка',
}

export interface SafetyEquipment {
  id: string
  equipment_type: EquipmentType
  name: string | null
  model: string | null
  inventory_number: string | null
  employee_id: string | null
  department: string | null
  responsible: string | null
  location: string | null
  issue_date: string | null
  last_test_date: string | null
  next_test_date: string | null
  result: string | null
  document_id: string | null
  comment: string | null
  created_at: string
  updated_at: string
}

export interface SafetyEquipmentWithStatus extends SafetyEquipment {
  status: Status
}

