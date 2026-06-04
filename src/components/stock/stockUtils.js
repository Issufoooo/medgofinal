import * as XLSX from 'xlsx'

// ── Constants ─────────────────────────────────────────────────
export const VALID_CATEGORIES = ['FREE', 'PRESCRIPTION', 'RESTRICTED_MONITORED']
export const STALE_STOCK_DAYS = 7

// ── Date helpers ──────────────────────────────────────────────
export function daysSince(value) {
  if (!value) return null
  const diff = Date.now() - new Date(value).getTime()
  if (Number.isNaN(diff)) return null
  return Math.max(0, Math.floor(diff / 86_400_000))
}

export function isStale(value) {
  const days = daysSince(value)
  return days === null || days >= STALE_STOCK_DAYS
}

// ── Formatters ────────────────────────────────────────────────
export const fmt = v =>
  v != null
    ? new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN', minimumFractionDigits: 2 }).format(v)
    : '—'

export const fmtDate = iso =>
  iso
    ? new Date(iso).toLocaleString('pt-MZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '—'

// ── Stock display helpers ─────────────────────────────────────
export function stockDot(status) {
  if (status === 'IN_STOCK')  return 'stock-dot-green'
  if (status === 'LOW_STOCK') return 'stock-dot-amber'
  return 'stock-dot-red'
}
export function stockText(status) {
  if (status === 'IN_STOCK')  return 'text-green-700'
  if (status === 'LOW_STOCK') return 'text-amber-600'
  return 'text-red-600'
}
export function stockBg(status) {
  if (status === 'IN_STOCK')  return 'bg-green-50 border-green-200'
  if (status === 'LOW_STOCK') return 'bg-amber-50 border-amber-200'
  return 'bg-red-50 border-red-200'
}

// ── Excel template download ───────────────────────────────────
export function downloadExcelTemplate() {
  const headers = [
    'codigo_interno', 'nome_comercial', 'nome_generico', 'dosagem',
    'forma', 'embalagem', 'categoria', 'preco_farmacia', 'quantidade',
    'validade', 'observacoes',
  ]
  const example = [
    'MED-001', 'Paracetamol 500mg', 'Paracetamol', '500mg',
    'Comprimido', 'Caixa 20', 'FREE', '35.00', '100', '2026-12-31', '',
  ]
  const ws = XLSX.utils.aoa_to_sheet([headers, example])
  ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 4, 14) }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Inventario')

  const instrHeaders = ['Campo', 'Obrigatório', 'Descrição', 'Exemplos']
  const instrRows = [
    ['codigo_interno', 'Não',  'Código interno da farmácia',            'MED-001'],
    ['nome_comercial', 'Sim',  'Nome comercial do medicamento',          'Paracetamol 500mg Bayer'],
    ['nome_generico',  'Não',  'Princípio activo (DCI)',                 'Paracetamol'],
    ['dosagem',        'Não',  'Concentração',                           '500mg, 10mg/ml'],
    ['forma',          'Não',  'Forma farmacêutica',                     'Comprimido, Xarope, Injectável'],
    ['embalagem',      'Não',  'Tamanho da embalagem',                   'Caixa 20, Frasco 100ml'],
    ['categoria',      'Sim',  'FREE | PRESCRIPTION | RESTRICTED_MONITORED', 'FREE'],
    ['preco_farmacia', 'Sim',  'Preço da farmácia em MZN (número)',      '35.00'],
    ['quantidade',     'Sim',  'Unidades em stock (número inteiro)',      '100'],
    ['validade',       'Não',  'Data de validade (YYYY-MM-DD)',           '2026-12-31'],
    ['observacoes',    'Não',  'Notas internas',                         'Refrigerar a 2-8°C'],
  ]
  const wsInstr = XLSX.utils.aoa_to_sheet([instrHeaders, ...instrRows])
  wsInstr['!cols'] = [{ wch: 20 }, { wch: 13 }, { wch: 45 }, { wch: 30 }]
  XLSX.utils.book_append_sheet(wb, wsInstr, 'Instruções')
  XLSX.writeFile(wb, 'MedGo_Modelo_Inventario.xlsx')
}

// ── Excel parser ──────────────────────────────────────────────
export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
        const errors = []
        const valid = []

        rows.forEach((row, idx) => {
          const rowNum = idx + 2
          const rowErrors = []
          const name = String(row['nome_comercial'] || '').trim()
          const category = String(row['categoria'] || '').trim().toUpperCase()
          const price = parseFloat(String(row['preco_farmacia']).replace(',', '.'))
          const qty = parseInt(String(row['quantidade']), 10)

          if (!name) rowErrors.push('nome_comercial obrigatório')
          if (!VALID_CATEGORIES.includes(category)) rowErrors.push(`categoria inválida: "${row['categoria']}" — use FREE, PRESCRIPTION ou RESTRICTED_MONITORED`)
          if (isNaN(price) || price < 0) rowErrors.push('preco_farmacia deve ser número ≥ 0')
          if (isNaN(qty) || qty < 0) rowErrors.push('quantidade deve ser inteiro ≥ 0')

          if (rowErrors.length) {
            errors.push({ row: rowNum, name: name || '(sem nome)', errors: rowErrors })
          } else {
            valid.push({
              commercial_name:    name,
              generic_name:       String(row['nome_generico'] || '').trim() || null,
              dosage:             String(row['dosagem'] || '').trim() || null,
              pharmaceutical_form: String(row['forma'] || '').trim() || null,
              package_size:       String(row['embalagem'] || '').trim() || null,
              category,
              unit_price:         price,
              quantity:           qty,
              notes:              String(row['observacoes'] || '').trim() || null,
            })
          }
        })

        resolve({ valid, errors, total: rows.length })
      } catch (err) {
        reject(new Error('Ficheiro Excel inválido ou corrompido: ' + err.message))
      }
    }
    reader.onerror = () => reject(new Error('Erro ao ler o ficheiro.'))
    reader.readAsBinaryString(file)
  })
}
