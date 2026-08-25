import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { exportToCsv } from '@/lib/csv'
import { CERTIFICATION_LABELS, EQUIPMENT_TYPE_LABELS } from '@/types/db'
import type { CertificationType, EquipmentType } from '@/types/db'

interface ReportDef {
  key: string
  title: string
  description: string
  run: () => Promise<void>
}

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString('ru-RU') : '')

export function ReportsPage() {
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const reports: ReportDef[] = [
    {
      key: 'employees',
      title: 'Все сотрудники',
      description: 'Полный список сотрудников со всеми данными карточки.',
      run: async () => {
        const { data } = await supabase.from('employees').select('*').order('full_name')
        exportToCsv(
          'sotrudniki',
          ['ФИО', 'Табельный номер', 'Цех', 'Участок', 'Подразделение', 'Должность', 'Телефон', 'E-mail'],
          (data ?? []).map((e) => [e.full_name, e.tabel_number, e.workshop, e.site, e.department, e.position_title, e.phone, e.email])
        )
      },
    },
    {
      key: 'certifications',
      title: 'Сертификаты',
      description: 'Все сертификаты сотрудников со статусом.',
      run: async () => {
        const { data } = await supabase
          .from('certifications_with_status')
          .select('type, certificate_no, expiry_date, status, employees ( full_name )')
        type Row = { type: CertificationType; certificate_no: string | null; expiry_date: string | null; status: string; employees: { full_name: string } | null }
        exportToCsv(
          'sertifikaty',
          ['Сотрудник', 'Вид сертификата', 'Номер', 'Действует до', 'Статус'],
          ((data as unknown as Row[]) ?? []).map((r) => [r.employees?.full_name ?? '', CERTIFICATION_LABELS[r.type], r.certificate_no, fmtDate(r.expiry_date), r.status])
        )
      },
    },
    {
      key: 'certifications-expired',
      title: 'Просроченные сертификаты',
      description: 'Только сертификаты с истёкшим сроком действия.',
      run: async () => {
        const { data } = await supabase
          .from('certifications_with_status')
          .select('type, certificate_no, expiry_date, employees ( full_name )')
          .eq('status', 'expired')
        type Row = { type: CertificationType; certificate_no: string | null; expiry_date: string | null; employees: { full_name: string } | null }
        exportToCsv(
          'sertifikaty_prosrochennye',
          ['Сотрудник', 'Вид сертификата', 'Номер', 'Просрочено с'],
          ((data as unknown as Row[]) ?? []).map((r) => [r.employees?.full_name ?? '', CERTIFICATION_LABELS[r.type], r.certificate_no, fmtDate(r.expiry_date)])
        )
      },
    },
    {
      key: 'certifications-warning',
      title: 'Сертификаты, которые скоро заканчиваются',
      description: 'Сертификаты в пределах предупреждающего срока.',
      run: async () => {
        const { data } = await supabase
          .from('certifications_with_status')
          .select('type, certificate_no, expiry_date, employees ( full_name )')
          .eq('status', 'warning')
        type Row = { type: CertificationType; certificate_no: string | null; expiry_date: string | null; employees: { full_name: string } | null }
        exportToCsv(
          'sertifikaty_skoro_zakanchivayutsya',
          ['Сотрудник', 'Вид сертификата', 'Номер', 'Действует до'],
          ((data as unknown as Row[]) ?? []).map((r) => [r.employees?.full_name ?? '', CERTIFICATION_LABELS[r.type], r.certificate_no, fmtDate(r.expiry_date)])
        )
      },
    },
    {
      key: 'trainings',
      title: 'Обучение',
      description: 'Все записи об обучении сотрудников.',
      run: async () => {
        const { data } = await supabase.from('trainings').select('title, training_date, format, organizer_name, employees ( full_name )')
        type Row = { title: string; training_date: string | null; format: string; organizer_name: string | null; employees: { full_name: string } | null }
        exportToCsv(
          'obuchenie',
          ['Сотрудник', 'Название', 'Дата', 'Формат', 'Организатор'],
          ((data as unknown as Row[]) ?? []).map((r) => [r.employees?.full_name ?? '', r.title, fmtDate(r.training_date), r.format, r.organizer_name])
        )
      },
    },
    {
      key: 'briefings',
      title: 'Инструктажи',
      description: 'Журнал всех инструктажей.',
      run: async () => {
        const { data } = await supabase.from('briefings').select('type, briefing_date, reason, conducted_by, employees ( full_name )')
        type Row = { type: string; briefing_date: string; reason: string | null; conducted_by: string | null; employees: { full_name: string } | null }
        exportToCsv(
          'instruktazhi',
          ['Сотрудник', 'Вид', 'Дата', 'Причина', 'Кто проводил'],
          ((data as unknown as Row[]) ?? []).map((r) => [r.employees?.full_name ?? '', r.type, fmtDate(r.briefing_date), r.reason, r.conducted_by])
        )
      },
    },
    {
      key: 'knowledge-checks',
      title: 'Проверки знаний',
      description: 'Результаты проверок знаний и выданные допуски.',
      run: async () => {
        const { data } = await supabase
          .from('knowledge_checks_with_status')
          .select('check_type, check_date, result, admission, expiry_date, status, employees ( full_name )')
        type Row = { check_type: string | null; check_date: string; result: string | null; admission: string | null; expiry_date: string | null; status: string; employees: { full_name: string } | null }
        exportToCsv(
          'proverki_znaniy',
          ['Сотрудник', 'Вид проверки', 'Дата', 'Результат', 'Допуск', 'Срок действия', 'Статус'],
          ((data as unknown as Row[]) ?? []).map((r) => [r.employees?.full_name ?? '', r.check_type, fmtDate(r.check_date), r.result, r.admission, fmtDate(r.expiry_date), r.status])
        )
      },
    },
    {
      key: 'ppe',
      title: 'СИЗ',
      description: 'Выданные средства индивидуальной защиты.',
      run: async () => {
        const { data } = await supabase
          .from('ppe_items_with_status')
          .select('name, category, size, quantity, issue_date, expiry_date, status, employees ( full_name )')
        type Row = { name: string; category: string | null; size: string | null; quantity: number | null; issue_date: string | null; expiry_date: string | null; status: string; employees: { full_name: string } | null }
        exportToCsv(
          'siz',
          ['Сотрудник', 'Наименование', 'Категория', 'Размер', 'Кол-во', 'Дата выдачи', 'Замена до', 'Статус'],
          ((data as unknown as Row[]) ?? []).map((r) => [r.employees?.full_name ?? '', r.name, r.category, r.size, r.quantity, fmtDate(r.issue_date), fmtDate(r.expiry_date), r.status])
        )
      },
    },
    {
      key: 'equipment',
      title: 'Средства безопасности',
      description: 'Когти, пояса, инструмент, электроинструмент, лестницы, стремянки.',
      run: async () => {
        const { data } = await supabase
          .from('safety_equipment_with_status')
          .select('equipment_type, inventory_number, next_test_date, result, status, department, responsible, employees ( full_name )')
        type Row = { equipment_type: EquipmentType; inventory_number: string | null; next_test_date: string | null; result: string | null; status: string; department: string | null; responsible: string | null; employees: { full_name: string } | null }
        exportToCsv(
          'sredstva_bezopasnosti',
          ['Тип', 'Инв. номер', 'Закреплено за', 'Следующее испытание', 'Результат', 'Статус'],
          ((data as unknown as Row[]) ?? []).map((r) => [
            EQUIPMENT_TYPE_LABELS[r.equipment_type],
            r.inventory_number,
            r.employees?.full_name ?? r.department ?? r.responsible ?? '',
            fmtDate(r.next_test_date),
            r.result,
            r.status,
          ])
        )
      },
    },
    {
      key: 'equipment-expired',
      title: 'Просроченные испытания',
      description: 'Средства безопасности с истёкшим сроком испытания.',
      run: async () => {
        const { data } = await supabase
          .from('safety_equipment_with_status')
          .select('equipment_type, inventory_number, next_test_date, department, responsible, employees ( full_name )')
          .eq('status', 'expired')
        type Row = { equipment_type: EquipmentType; inventory_number: string | null; next_test_date: string | null; department: string | null; responsible: string | null; employees: { full_name: string } | null }
        exportToCsv(
          'prosrochennye_ispytaniya',
          ['Тип', 'Инв. номер', 'Закреплено за', 'Просрочено с'],
          ((data as unknown as Row[]) ?? []).map((r) => [
            EQUIPMENT_TYPE_LABELS[r.equipment_type],
            r.inventory_number,
            r.employees?.full_name ?? r.department ?? r.responsible ?? '',
            fmtDate(r.next_test_date),
          ])
        )
      },
    },
  ]

  async function handleRun(report: ReportDef) {
    setBusyKey(report.key)
    try {
      await report.run()
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Отчёты</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Выгрузка данных в файл, который открывается в Excel — для печати, архива или отправки руководству.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <div key={report.key} className="flex flex-col justify-between rounded-xl border border-border bg-surface p-4">
            <div>
              <h3 className="font-medium text-ink">{report.title}</h3>
              <p className="mt-1 text-xs text-ink-muted">{report.description}</p>
            </div>
            <button
              onClick={() => handleRun(report)}
              disabled={busyKey === report.key}
              className="mt-4 rounded-lg bg-brand-800 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {busyKey === report.key ? 'Формируем…' : 'Скачать в Excel'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
