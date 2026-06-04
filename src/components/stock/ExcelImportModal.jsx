import { useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { useNotificationStore } from '../../store/notificationStore'
import { Modal } from '../ui/Modal'
import { Alert } from '../ui/Alert'
import { Spinner } from '../ui/Spinner'
import { parseExcelFile, downloadExcelTemplate, fmt } from './stockUtils'
import { createInventoryUpload } from '../../services/inventoryService'

export function ExcelImportModal({ pharmacyId, pharmacyName, onClose }) {
  const { profile } = useAuthStore()
  const notify = useNotificationStore()
  const qc = useQueryClient()
  const fileRef = useRef(null)

  const [parsing, setParsing]     = useState(false)
  const [importing, setImporting] = useState(false)
  const [preview, setPreview]     = useState(null)
  const [done, setDone]           = useState(false)
  const [fileName, setFileName]   = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [importResult, setImportResult] = useState(null)

  const isExcelFile = (file) => {
    const name = file?.name?.toLowerCase() || ''
    return name.endsWith('.xlsx') || name.endsWith('.xls')
  }

  const processFile = async (file) => {
    if (!file) return

    if (!isExcelFile(file)) {
      notify.warning('Formato inválido. Envie um ficheiro Excel (.xlsx ou .xls).')
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    setParsing(true)
    setPreview(null)
    setDone(false)
    setFileName(file.name)
    setImportResult(null)

    try {
      const result = await parseExcelFile(file)
      setPreview(result)
    } catch (err) {
      notify.error(err.message)
    } finally {
      setParsing(false)
    }
  }

  const handleFile = async (e) => {
    await processFile(e.target.files?.[0])
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    await processFile(e.dataTransfer.files?.[0])
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleImport = async () => {
    if (!preview?.valid?.length) return
    setImporting(true)

    let created = 0
    let updated = 0
    let failed = 0
    const failureNotes = []

    try {
      for (const row of preview.valid) {
        try {
          let medId
          const { data: existing, error: findErr } = await supabase
            .from('medications')
            .select('id')
            .ilike('commercial_name', row.commercial_name)
            .is('deleted_at', null)
            .limit(1)

          if (findErr) throw new Error(findErr.message)

          if (existing?.length) {
            medId = existing[0].id
          } else {
            const { data: newMed, error: medErr } = await supabase
              .from('medications')
              .insert({
                commercial_name: row.commercial_name,
                generic_name: row.generic_name,
                dosage: row.dosage,
                pharmaceutical_form: row.pharmaceutical_form,
                package_size: row.package_size,
                category: row.category,
                is_visible: true,
                requires_prescription: row.category !== 'FREE',
              })
              .select('id').single()
            if (medErr) throw new Error(medErr.message)
            medId = newMed.id
          }

          const { data: inv, error: invFetchErr } = await supabase
            .from('pharmacy_inventory')
            .select('id, quantity')
            .eq('pharmacy_id', pharmacyId)
            .eq('medication_id', medId)
            .maybeSingle()

          if (invFetchErr) throw new Error(invFetchErr.message)

          const oldQty = inv?.quantity ?? 0
          const newQty = row.quantity
          const now = new Date().toISOString()
          let inventoryId = inv?.id

          if (inventoryId) {
            const { error: updateErr } = await supabase.from('pharmacy_inventory').update({
              quantity: newQty,
              unit_price: row.unit_price,
              notes: row.notes,
              last_synced_at: now,
              last_updated_by: profile?.id ?? null,
            }).eq('id', inventoryId)
            if (updateErr) throw new Error(updateErr.message)
            updated++
          } else {
            const { data: createdInv, error: invErr } = await supabase.from('pharmacy_inventory').insert({
              pharmacy_id: pharmacyId,
              medication_id: medId,
              quantity: newQty,
              unit_price: row.unit_price,
              notes: row.notes,
              last_synced_at: now,
              last_updated_by: profile?.id ?? null,
            }).select('id').single()
            if (invErr) throw new Error(invErr.message)
            inventoryId = createdInv.id
            created++
          }

          if (inventoryId) {
            await supabase.from('inventory_movements').insert({
              inventory_id: inventoryId,
              pharmacy_id: pharmacyId,
              medication_id: medId,
              movement_type: 'SYNC',
              quantity_before: oldQty,
              quantity_after: newQty,
              quantity_change: newQty - oldQty,
              notes: `Importação Excel${fileName ? ` — ${fileName}` : ''}`,
              performed_by: profile?.id ?? null,
            })
          }
        } catch (err) {
          failed++
          failureNotes.push(`${row.commercial_name}: ${err.message}`)
        }
      }

      await createInventoryUpload({
        pharmacyId,
        uploadedBy: profile?.id,
        fileName,
        totalRows: preview.total,
        validRows: preview.valid.length,
        createdCount: created,
        updatedCount: updated,
        failedCount: failed + (preview.errors?.length || 0),
        notes: failureNotes.slice(0, 8).join(' | ') || null,
      })

      qc.invalidateQueries({ queryKey: ['inventory'] })
      qc.invalidateQueries({ queryKey: ['pharmacy-inventory', pharmacyId] })
      qc.invalidateQueries({ queryKey: ['stock-summary'] })
      qc.invalidateQueries({ queryKey: ['inventory-uploads'] })
      setImportResult({ created, updated, failed: failed + (preview.errors?.length || 0), total: preview.total })
      setDone(true)
      notify.success(`${created + updated} linha(s) importada(s)${failed > 0 ? `, ${failed} falhou` : ''}.`)
    } catch (err) {
      notify.error(err.message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Importar Excel de inventário" size="lg">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
          <div>
            <p className="text-sm font-extrabold text-slate-800">{pharmacyName}</p>
            <p className="text-xs text-slate-400">Farmácia de destino</p>
          </div>
          <button onClick={downloadExcelTemplate} className="btn-secondary btn-sm flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            Baixar modelo
          </button>
        </div>

        {!done ? (
          <>
            <div>
              <label className="label">Ficheiro Excel (.xlsx ou .xls)</label>
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileRef.current?.click()}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click() }}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragEnter={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`relative flex min-h-[170px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-8 text-center transition-all ${
                  isDragging
                    ? 'border-teal-400 bg-teal-50 shadow-inner'
                    : fileName
                      ? 'border-teal-200 bg-teal-50/50 hover:border-teal-300'
                      : 'border-slate-200 bg-slate-50 hover:border-teal-300 hover:bg-teal-50/40'
                }`}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFile}
                  className="sr-only"
                />

                <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${isDragging ? 'bg-teal-500 text-white' : 'bg-white text-teal-600 shadow-sm'}`}>
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01.88-7.903A5 5 0 1116.9 6L17 6a5 5 0 011 9.9M12 12v9m0-9l-3 3m3-3l3 3" />
                  </svg>
                </div>

                <p className="text-sm font-extrabold text-slate-900">
                  {isDragging ? 'Largue o ficheiro aqui' : fileName ? fileName : 'Arraste o Excel da farmácia para aqui'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {fileName ? 'Clique ou arraste outro ficheiro para substituir.' : 'Ou clique para escolher o ficheiro no computador.'}
                </p>
                <p className="mt-3 rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Formatos aceites: .xlsx, .xls
                </p>
              </div>
            </div>

            {parsing && <div className="skeleton h-24 rounded-xl" />}

            {preview && (
              <div className="space-y-3">
                {preview.errors.length > 0 && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 max-h-40 overflow-y-auto">
                    <p className="text-xs font-extrabold text-red-700 uppercase tracking-widest mb-2">
                      {preview.errors.length} linha(s) com erros — não serão importadas
                    </p>
                    <div className="space-y-1">
                      {preview.errors.map((e, i) => (
                        <div key={i} className="text-xs text-red-600">
                          <span className="font-semibold">Linha {e.row} — {e.name}:</span> {e.errors.join('; ')}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {preview.valid.length > 0 ? (
                  <div>
                    <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-2">
                      {preview.valid.length} de {preview.total} linhas válidas para importar
                    </p>
                    <div className="rounded-xl border border-slate-200 overflow-hidden max-h-52 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            {['Medicamento', 'Categoria', 'Preço', 'Qtd'].map((h, i) => (
                              <th key={h} className={`px-3 py-2 font-semibold text-slate-500 ${i > 1 ? 'text-right' : 'text-left'}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {preview.valid.map((r, i) => (
                            <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                              <td className="px-3 py-2 font-medium text-slate-800">{r.commercial_name}</td>
                              <td className="px-3 py-2 text-slate-500">{r.category}</td>
                              <td className="px-3 py-2 text-right text-slate-700">{r.unit_price.toFixed(2)}</td>
                              <td className="px-3 py-2 text-right text-slate-700">{r.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <Alert type="warning">Nenhuma linha válida para importar. Corrija os erros e tente novamente.</Alert>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleImport} disabled={!preview?.valid?.length || importing} className="btn-primary flex-1">
                {importing ? <><Spinner size="sm" /> A importar...</> : `Importar ${preview?.valid?.length || 0} linhas`}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-100 flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <div>
              <p className="font-extrabold text-slate-900">Importação concluída</p>
              <p className="text-sm text-slate-500 mt-1">O inventário foi actualizado e o upload ficou registado no histórico.</p>{importResult && <p className="mt-2 text-xs font-semibold text-slate-400">Criados: {importResult.created} · Atualizados: {importResult.updated} · Falhados: {importResult.failed}</p>}
            </div>
            <button onClick={onClose} className="btn-primary">Fechar</button>
          </div>
        )}
      </div>
    </Modal>
  )
}
