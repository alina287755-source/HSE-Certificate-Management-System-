import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type {
  Briefing,
  CertificationWithStatus,
  Employee,
  KnowledgeCheckWithStatus,
  PPEItemWithStatus,
  SafetyEquipmentWithStatus,
  Training,
} from '@/types/db'
import {
  BRIEFING_TYPE_LABELS,
  CERTIFICATION_LABELS,
  EQUIPMENT_TYPE_LABELS,
  ORGANIZER_TYPE_LABELS,
  TRAINING_FORMAT_LABELS,
} from '@/types/db'
import { StatusBadge, statusBorderClass } from '@/components/StatusBadge'
import { CertificationFormModal } from '@/components/CertificationFormModal'
import { EmployeeFormModal } from '@/components/EmployeeFormModal'
import { TrainingFormModal } from '@/components/TrainingFormModal'
import { BriefingFormModal } from '@/components/BriefingFormModal'
import { KnowledgeCheckFormModal } from '@/components/KnowledgeCheckFormModal'
import { PPEFormModal } from '@/components/PPEFormModal'
import { EquipmentFormModal } from '@/components/EquipmentFormModal'

const TABS = [
  { key: 'certification', label: 'Обучение и сертификация' },
  { key: 'training', label: 'Обучение' },
  { key: 'briefings', label: 'Инструктажи' },
  { key: 'knowledge', label: 'Проверка знаний и допуск' },
  { key: 'ppe', label: 'СИЗ' },
  { key: 'equipment', label: 'Закреплённые средства безопасности' },
]

function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('ru-RU') : '—'
}

export function EmployeeCardPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const canManage = profile?.role === 'admin'
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [activeTab, setActiveTab] = useState('certification')
  const [editEmployeeOpen, setEditEmployeeOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadEmployee = useCallback(async () => {
    if (!id) return
    const { data } = await supabase.from('employees').select('*').eq('id', id).single()
    setEmployee(data as Employee | null)
  }, [id])

  useEffect(() => {
    setLoading(true)
    loadEmployee().finally(() => setLoading(false))
  }, [loadEmployee])

  if (loading) return <p className="text-ink-faint">Загрузка…</p>
  if (!employee || !id) return <p className="text-ink-faint">Сотрудник не найден.</p>

  return (
    <div className="space-y-6">
      <Link to="/employees" className="text-sm text-brand-800 hover:underline">
        ← Все сотрудники
      </Link>

      {/* Шапка карточки */}
      <div className="flex items-start gap-6 rounded-xl border border-border bg-surface p-6">
        <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-2xl font-semibold text-brand-800">
          {employee.photo_url ? (
            <img src={employee.photo_url} alt={employee.full_name} className="h-full w-full object-cover" />
          ) : (
            employee.full_name.split(' ').map((p) => p[0]).slice(0, 2).join('')
          )}
        </div>
        <div className="grid flex-1 grid-cols-2 gap-x-8 gap-y-2 md:grid-cols-3">
          <div className="col-span-2 md:col-span-3">
            <h1 className="text-xl font-bold text-ink">{employee.full_name}</h1>
            <p className="text-sm text-ink-muted">{employee.position_title || '—'}</p>
          </div>
          <Field label="Табельный номер" value={employee.tabel_number} mono />
          <Field label="Цех" value={employee.workshop} />
          <Field label="Участок" value={employee.site} />
          <Field label="Подразделение" value={employee.department} />
          <Field label="Телефон" value={employee.phone} />
          <Field label="E-mail" value={employee.email} />
        </div>
        {canManage && (
          <button
            onClick={() => setEditEmployeeOpen(true)}
            className="flex-shrink-0 self-start rounded-lg border border-border px-3 py-1.5 text-sm text-brand-800 hover:bg-surface-muted"
          >
            Редактировать
          </button>
        )}
      </div>

      {/* Вкладки */}
      <div className="border-b border-border">
        <nav className="-mb-px flex gap-6 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition ${
                activeTab === tab.key
                  ? 'border-accent-500 text-brand-800'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'certification' && <CertificationTab employeeId={id} canManage={canManage} />}
      {activeTab === 'training' && <TrainingTab employeeId={id} canManage={canManage} />}
      {activeTab === 'briefings' && <BriefingsTab employeeId={id} canManage={canManage} />}
      {activeTab === 'knowledge' && <KnowledgeTab employeeId={id} canManage={canManage} />}
      {activeTab === 'ppe' && <PPETab employeeId={id} canManage={canManage} />}
      {activeTab === 'equipment' && <EquipmentTab employeeId={id} canManage={canManage} />}

      {editEmployeeOpen && (
        <EmployeeFormModal existing={employee} onClose={() => setEditEmployeeOpen(false)} onSaved={loadEmployee} />
      )}
    </div>
  )
}

function Field({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-ink-faint">{label}</div>
      <div className={`text-sm text-ink ${mono ? 'font-mono' : ''}`}>{value || '—'}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Обучение и сертификация
// ---------------------------------------------------------------------------

function CertificationTab({ employeeId, canManage }: { employeeId: string; canManage: boolean }) {
  const [items, setItems] = useState<CertificationWithStatus[]>([])
  const [modalOpen, setModalOpen] = useState<'new' | string | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('certifications_with_status')
      .select('*')
      .eq('employee_id', employeeId)
      .order('expiry_date', { ascending: true, nullsFirst: false })
    setItems((data as CertificationWithStatus[]) ?? [])
  }, [employeeId])

  useEffect(() => {
    load()
  }, [load])

  async function handleDelete(certId: string) {
    if (!confirm('Удалить эту запись о сертификации?')) return
    await supabase.from('certifications').delete().eq('id', certId)
    load()
  }

  const editing = items.find((c) => c.id === modalOpen) ?? null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">Сертификация</h2>
        {canManage && (
          <button
            onClick={() => setModalOpen('new')}
            className="rounded-lg bg-brand-800 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            + Добавить сертификат
          </button>
        )}
      </div>

      {items.length === 0 && <EmptyState text="У сотрудника пока нет добавленных сертификатов." />}

      <div className="space-y-3">
        {items.map((cert) => (
          <div
            key={cert.id}
            className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border border-l-4 ${statusBorderClass(cert.status)} bg-surface px-5 py-4`}
          >
            <div>
              <div className="font-medium text-ink">{CERTIFICATION_LABELS[cert.type]}</div>
              <div className="mt-0.5 text-sm text-ink-muted">
                {cert.certificate_no && <>№ {cert.certificate_no} · </>}
                Действует до: <span className="font-mono">{formatDate(cert.expiry_date)}</span>
              </div>
              {(cert.organization || cert.trainer) && (
                <div className="mt-0.5 text-xs text-ink-faint">
                  {cert.organization}
                  {cert.organization && cert.trainer && ' · '}
                  {cert.trainer}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={cert.status} />
              {canManage && (
                <RowActions onEdit={() => setModalOpen(cert.id)} onDelete={() => handleDelete(cert.id)} />
              )}
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <CertificationFormModal employeeId={employeeId} existing={editing} onClose={() => setModalOpen(null)} onSaved={load} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Обучение
// ---------------------------------------------------------------------------

function TrainingTab({ employeeId, canManage }: { employeeId: string; canManage: boolean }) {
  const [items, setItems] = useState<Training[]>([])
  const [modalOpen, setModalOpen] = useState<'new' | string | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('trainings')
      .select('*')
      .eq('employee_id', employeeId)
      .order('training_date', { ascending: false, nullsFirst: false })
    setItems((data as Training[]) ?? [])
  }, [employeeId])

  useEffect(() => {
    load()
  }, [load])

  async function handleDelete(rowId: string) {
    if (!confirm('Удалить эту запись об обучении?')) return
    await supabase.from('trainings').delete().eq('id', rowId)
    load()
  }

  const editing = items.find((c) => c.id === modalOpen) ?? null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">Обучение</h2>
        {canManage && (
          <button onClick={() => setModalOpen('new')} className="rounded-lg bg-brand-800 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            + Добавить обучение
          </button>
        )}
      </div>

      {items.length === 0 && <EmptyState text="У сотрудника пока нет записей об обучении." />}

      <div className="space-y-3">
        {items.map((t) => (
          <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-5 py-4">
            <div>
              <div className="font-medium text-ink">{t.title}</div>
              <div className="mt-0.5 text-sm text-ink-muted">
                {TRAINING_FORMAT_LABELS[t.format]} · {formatDate(t.training_date)}
              </div>
              {(t.organizer_name || t.organizer_type) && (
                <div className="mt-0.5 text-xs text-ink-faint">
                  {t.organizer_type && ORGANIZER_TYPE_LABELS[t.organizer_type]}
                  {t.organizer_type && t.organizer_name && ' · '}
                  {t.organizer_name}
                </div>
              )}
            </div>
            {canManage && <RowActions onEdit={() => setModalOpen(t.id)} onDelete={() => handleDelete(t.id)} />}
          </div>
        ))}
      </div>

      {modalOpen && (
        <TrainingFormModal employeeId={employeeId} existing={editing} onClose={() => setModalOpen(null)} onSaved={load} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Инструктажи
// ---------------------------------------------------------------------------

function BriefingsTab({ employeeId, canManage }: { employeeId: string; canManage: boolean }) {
  const [items, setItems] = useState<Briefing[]>([])
  const [modalOpen, setModalOpen] = useState<'new' | string | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('briefings')
      .select('*')
      .eq('employee_id', employeeId)
      .order('briefing_date', { ascending: false })
    setItems((data as Briefing[]) ?? [])
  }, [employeeId])

  useEffect(() => {
    load()
  }, [load])

  async function handleDelete(rowId: string) {
    if (!confirm('Удалить эту запись об инструктаже?')) return
    await supabase.from('briefings').delete().eq('id', rowId)
    load()
  }

  const editing = items.find((c) => c.id === modalOpen) ?? null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">Инструктажи</h2>
        {canManage && (
          <button onClick={() => setModalOpen('new')} className="rounded-lg bg-brand-800 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            + Добавить инструктаж
          </button>
        )}
      </div>

      {items.length === 0 && <EmptyState text="У сотрудника пока нет записей об инструктажах." />}

      <div className="space-y-3">
        {items.map((b) => (
          <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-5 py-4">
            <div>
              <div className="font-medium text-ink">{BRIEFING_TYPE_LABELS[b.type]}</div>
              <div className="mt-0.5 text-sm text-ink-muted">{formatDate(b.briefing_date)}</div>
              {(b.reason || b.conducted_by) && (
                <div className="mt-0.5 text-xs text-ink-faint">
                  {b.reason}
                  {b.reason && b.conducted_by && ' · '}
                  {b.conducted_by}
                </div>
              )}
            </div>
            {canManage && <RowActions onEdit={() => setModalOpen(b.id)} onDelete={() => handleDelete(b.id)} />}
          </div>
        ))}
      </div>

      {modalOpen && (
        <BriefingFormModal employeeId={employeeId} existing={editing} onClose={() => setModalOpen(null)} onSaved={load} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Проверка знаний и допуск
// ---------------------------------------------------------------------------

function KnowledgeTab({ employeeId, canManage }: { employeeId: string; canManage: boolean }) {
  const [items, setItems] = useState<KnowledgeCheckWithStatus[]>([])
  const [modalOpen, setModalOpen] = useState<'new' | string | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('knowledge_checks_with_status')
      .select('*')
      .eq('employee_id', employeeId)
      .order('check_date', { ascending: false })
    setItems((data as KnowledgeCheckWithStatus[]) ?? [])
  }, [employeeId])

  useEffect(() => {
    load()
  }, [load])

  async function handleDelete(rowId: string) {
    if (!confirm('Удалить эту запись о проверке знаний?')) return
    await supabase.from('knowledge_checks').delete().eq('id', rowId)
    load()
  }

  const editing = items.find((c) => c.id === modalOpen) ?? null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">Проверка знаний и допуск</h2>
        {canManage && (
          <button onClick={() => setModalOpen('new')} className="rounded-lg bg-brand-800 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            + Добавить проверку
          </button>
        )}
      </div>

      {items.length === 0 && <EmptyState text="У сотрудника пока нет записей о проверках знаний." />}

      <div className="space-y-3">
        {items.map((k) => (
          <div key={k.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border border-l-4 ${statusBorderClass(k.status)} bg-surface px-5 py-4`}>
            <div>
              <div className="font-medium text-ink">{k.check_type || 'Проверка знаний'}</div>
              <div className="mt-0.5 text-sm text-ink-muted">
                {formatDate(k.check_date)}
                {k.expiry_date && <> · допуск до {formatDate(k.expiry_date)}</>}
              </div>
              {(k.result || k.admission) && (
                <div className="mt-0.5 text-xs text-ink-faint">
                  {k.result}
                  {k.result && k.admission && ' · '}
                  {k.admission}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={k.status} />
              {canManage && <RowActions onEdit={() => setModalOpen(k.id)} onDelete={() => handleDelete(k.id)} />}
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <KnowledgeCheckFormModal employeeId={employeeId} existing={editing} onClose={() => setModalOpen(null)} onSaved={load} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// СИЗ
// ---------------------------------------------------------------------------

function PPETab({ employeeId, canManage }: { employeeId: string; canManage: boolean }) {
  const [items, setItems] = useState<PPEItemWithStatus[]>([])
  const [modalOpen, setModalOpen] = useState<'new' | string | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('ppe_items_with_status')
      .select('*')
      .eq('employee_id', employeeId)
      .order('expiry_date', { ascending: true, nullsFirst: false })
    setItems((data as PPEItemWithStatus[]) ?? [])
  }, [employeeId])

  useEffect(() => {
    load()
  }, [load])

  async function handleDelete(rowId: string) {
    if (!confirm('Удалить эту запись о СИЗ?')) return
    await supabase.from('ppe_items').delete().eq('id', rowId)
    load()
  }

  const editing = items.find((c) => c.id === modalOpen) ?? null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">СИЗ и спецодежда</h2>
        {canManage && (
          <button onClick={() => setModalOpen('new')} className="rounded-lg bg-brand-800 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            + Добавить СИЗ
          </button>
        )}
      </div>

      {items.length === 0 && <EmptyState text="У сотрудника пока нет выданных СИЗ." />}

      <div className="space-y-3">
        {items.map((p) => (
          <div key={p.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border border-l-4 ${statusBorderClass(p.status)} bg-surface px-5 py-4`}>
            <div>
              <div className="font-medium text-ink">{p.name}{p.category ? ` (${p.category})` : ''}</div>
              <div className="mt-0.5 text-sm text-ink-muted">
                {p.size && <>Размер {p.size} · </>}
                {p.quantity != null && <>{p.quantity} шт. · </>}
                Замена до: <span className="font-mono">{formatDate(p.expiry_date)}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={p.status} />
              {canManage && <RowActions onEdit={() => setModalOpen(p.id)} onDelete={() => handleDelete(p.id)} />}
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <PPEFormModal employeeId={employeeId} existing={editing} onClose={() => setModalOpen(null)} onSaved={load} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Закреплённые средства безопасности
// ---------------------------------------------------------------------------

function EquipmentTab({ employeeId, canManage }: { employeeId: string; canManage: boolean }) {
  const [items, setItems] = useState<SafetyEquipmentWithStatus[]>([])
  const [modalOpen, setModalOpen] = useState<'new' | string | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('safety_equipment_with_status')
      .select('*')
      .eq('employee_id', employeeId)
      .order('next_test_date', { ascending: true, nullsFirst: false })
    setItems((data as SafetyEquipmentWithStatus[]) ?? [])
  }, [employeeId])

  useEffect(() => {
    load()
  }, [load])

  async function handleDelete(rowId: string) {
    if (!confirm('Удалить эту запись о средстве безопасности?')) return
    await supabase.from('safety_equipment').delete().eq('id', rowId)
    load()
  }

  const editing = items.find((c) => c.id === modalOpen) ?? null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">Закреплённые средства безопасности</h2>
        {canManage && (
          <button onClick={() => setModalOpen('new')} className="rounded-lg bg-brand-800 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            + Добавить
          </button>
        )}
      </div>

      {items.length === 0 && <EmptyState text="За сотрудником пока не закреплены когти, пояса, инструмент или лестницы." />}

      <div className="space-y-3">
        {items.map((eq) => (
          <div key={eq.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border border-l-4 ${statusBorderClass(eq.status)} bg-surface px-5 py-4`}>
            <div>
              <div className="font-medium text-ink">
                {EQUIPMENT_TYPE_LABELS[eq.equipment_type]}
                {eq.name && ` — ${eq.name}`}
              </div>
              <div className="mt-0.5 text-sm text-ink-muted">
                {eq.inventory_number && <>Инв. № {eq.inventory_number} · </>}
                Следующее испытание: <span className="font-mono">{formatDate(eq.next_test_date)}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={eq.status} />
              {canManage && <RowActions onEdit={() => setModalOpen(eq.id)} onDelete={() => handleDelete(eq.id)} />}
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <EquipmentFormModal defaultEmployeeId={employeeId} existing={editing} onClose={() => setModalOpen(null)} onSaved={load} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Общие мелкие компоненты
// ---------------------------------------------------------------------------

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <>
      <button onClick={onEdit} className="text-sm text-brand-800 hover:underline">Изменить</button>
      <button onClick={onDelete} className="text-sm text-status-expired hover:underline">Удалить</button>
    </>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-ink-faint">
      {text}
    </p>
  )
}
