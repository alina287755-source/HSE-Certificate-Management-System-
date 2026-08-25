/** Экспорт массива объектов в CSV-файл, который корректно открывается в Excel
 *  (используем ; как разделитель и BOM для кириллицы). */
export function exportToCsv(filename: string, headers: string[], rows: (string | number | null)[][]) {
  const escape = (value: string | number | null) => {
    const str = value == null ? '' : String(value)
    if (str.includes(';') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const lines = [headers.map(escape).join(';'), ...rows.map((row) => row.map(escape).join(';'))]
  const csv = '\uFEFF' + lines.join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
