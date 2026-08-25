import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { DocumentRow } from '@/types/db'
import { useAuth } from '@/context/AuthContext'

const BUCKET = 'documents'
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']

interface Props {
  entityType: string
  entityId: string
  /** вызывается после успешной загрузки нового файла с его id (например, чтобы привязать document_id к сертификату) */
  onUploaded?: (doc: DocumentRow) => void
}

export function DocumentUpload({ entityType, entityId, onUploaded }: Props) {
  const { profile } = useAuth()
  const canManage = profile?.role === 'admin'
  const [docs, setDocs] = useState<DocumentRow[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadDocs = useCallback(async () => {
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('uploaded_at', { ascending: false })
    setDocs((data as DocumentRow[]) ?? [])
  }, [entityType, entityId])

  useEffect(() => {
    loadDocs()
  }, [loadDocs])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Можно загружать только файлы PDF, JPG или PNG.')
      return
    }
    if (file.size > 15 * 1024 * 1024) {
      setError('Файл слишком большой (максимум 15 МБ).')
      return
    }

    setBusy(true)
    try {
      const path = `${entityType}/${entityId}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file)
      if (uploadError) throw uploadError

      const { data: inserted, error: insertError } = await supabase
        .from('documents')
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          file_path: path,
          file_name: file.name,
          file_type: file.type,
        })
        .select()
        .single()
      if (insertError) throw insertError

      await loadDocs()
      if (inserted) onUploaded?.(inserted as DocumentRow)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить документ')
    } finally {
      setBusy(false)
    }
  }

  async function handleOpen(doc: DocumentRow) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(doc.file_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function handleDelete(doc: DocumentRow) {
    if (!confirm(`Удалить документ «${doc.file_name}»?`)) return
    await supabase.storage.from(BUCKET).remove([doc.file_path])
    await supabase.from('documents').delete().eq('id', doc.id)
    await loadDocs()
  }

  return (
    <div className="space-y-3">
      {docs.length === 0 && (
        <p className="text-sm text-ink-faint">Документы не загружены.</p>
      )}
      {docs.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          <button
            onClick={() => handleOpen(doc)}
            className="flex items-center gap-2 text-brand-800 hover:underline"
          >
            📄 {doc.file_name}
          </button>
          {canManage && (
            <button
              onClick={() => handleDelete(doc)}
              className="text-xs text-status-expired hover:underline"
            >
              Удалить
            </button>
          )}
        </div>
      ))}

      {canManage && (
        <div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand-800 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-700">
            {busy ? 'Загрузка…' : '⬆ Загрузить документ'}
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              disabled={busy}
              onChange={handleFile}
            />
          </label>
          {error && <p className="mt-2 text-xs text-status-expired">{error}</p>}
        </div>
      )}
    </div>
  )
}
