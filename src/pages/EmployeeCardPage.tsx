import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { CertificationWithStatus, Employee } from '@/types/db'
import { CERTIFICATION_LABELS } from '@/types/db'
import { StatusBadge, statusBorderClass } from '@/components/StatusBadge'
import { CertificationFormModal } from '@/components/CertificationFormModal'
import { EmployeeFormModal } from '@/components/EmployeeFormModal'

const TABS = [
  { key: 'certification', label: 'Обучение и сертификация' },
  { key: 'training', label: 'Обучение', soon: true },
  { key: 'briefings', label: 'Инструктажи', soon: true },
  { key: 'knowledge', label: 'Проверка знаний и допуск', soon: true },
  { key: 'ppe', label: 'СИЗ', soon: true },
  { key: 'equipment', label: 'Закреплённые средства безопасности', soon: true },
]

export function EmployeeCardPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const canManage = profile?.role === 'admin'
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [certifications, setCertifications] = useState<CertificationWithStatus[]>([])
  const [activeTab, setActiveTab] = useState('certification')
  const [modalOpen, setModalOpen] = useState<'new' | string | null>(null)
  const [editEmployeeOpen, setEditEmployeeOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadEmployee = useCallback(async () => {
    if (!id) return
    const { data } = await supabase.from('employees').select('*').eq('id', id).single()
    setEmployee(data as Employee | null)
  }, [id])

  const loadCertifications = useCallback(async () => {
    if (!id) return
    const { data } = await supabase
      .from('certifications_with_status')
      .select('*')
      .eq('employee_id', id)
      .order('expiry_date', { ascending: true, nullsFirst: false })
    setCertifications((data as CertificationWithStatus[]) ?? [])
  }, [id])

  useEffect(() => {
    setLoading(true)
    Promise.all([loadEmployee(), loadCertifications()]).finally(() => setLoading(false))
  }, [loadEmployee, loadCertifications])

  async function handleDelete(certId: string) {
    if (!confirm('Удалить эту запись о сертификации?')) return
    await supabase.from('certifications').delete().eq('id', certId)
    loadCertifications()
  }

  if (loading) return <p className="text-ink-faint">Загрузка…</p>
  if (!employee) return <p className="text-ink-faint">Сотрудник не найден.</p>

  const editingCert = certifications.find((c) => c.id === modalOpen) ?? null

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
              onClick={() => !tab.soon && setActiveTab(tab.key)}
              className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition ${
                tab.soon
                  ? 'cursor-not-allowed border-transparent text-ink-faint/50'
                  : activeTab === tab.key
                    ? 'border-accent-500 text-brand-800'
                    : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              {tab.label}
              {tab.soon && <span className="ml-1 text-[10px] uppercase">скоро</span>}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'certification' && (
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

          {certifications.length === 0 && (
            <p className="rounded-xl border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-ink-faint">
              У сотрудника пока нет добавленных сертификатов.
            </p>
          )}

          <div className="space-y-3">
            {certifications.map((cert) => (
              <div
                key={cert.id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border border-l-4 ${statusBorderClass(cert.status)} bg-surface px-5 py-4`}
              >
                <div>
                  <div className="font-medium text-ink">{CERTIFICATION_LABELS[cert.type]}</div>
                  <div className="mt-0.5 text-sm text-ink-muted">
                    {cert.certificate_no && <>№ {cert.certificate_no} · </>}
                    Действует до:{' '}
                    <span className="font-mono">{cert.expiry_date ? formatDate(cert.expiry_date) : '—'}</span>
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
                    <>
                      <button
                        onClick={() => setModalOpen(cert.id)}
                        className="text-sm text-brand-800 hover:underline"
                      >
                        Изменить
                      </button>
                      <button
                        onClick={() => handleDelete(cert.id)}
                        className="text-sm text-status-expired hover:underline"
                      >
                        Удалить
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab !== 'certification' && (
        <p className="rounded-xl border border-dashed border-border bg-surface px-4 py-10 text-center text-sm text-ink-faint">
          Этот раздел появится на следующем этапе разработки.
        </p>
      )}

      {modalOpen && (
        <CertificationFormModal
          employeeId={employee.id}
          existing={editingCert}
          onClose={() => setModalOpen(null)}
          onSaved={() => {
            loadCertifications()
          }}
        />
      )}

      {editEmployeeOpen && (
        <EmployeeFormModal
          existing={employee}
          onClose={() => setEditEmployeeOpen(false)}
          onSaved={() => {
            loadEmployee()
          }}
        />
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

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('ru-RU')
}
