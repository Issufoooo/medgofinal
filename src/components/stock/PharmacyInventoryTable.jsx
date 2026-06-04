import { useState } from 'react'
import { usePharmacyInventory, useRemoveInventoryItem } from '../../hooks/useInventory'
import { useNotificationStore } from '../../store/notificationStore'
import { Modal } from '../ui/Modal'
import { Alert } from '../ui/Alert'
import { Spinner } from '../ui/Spinner'
import { STOCK_STATUS_LABEL } from '../../lib/constants'
import { stockBg, stockDot, stockText, fmt, fmtDate, isStale } from './stockUtils'

function IEdit()  { return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg> }
function ITrash() { return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg> }

export function PharmacyInventoryTable({ pharmacyId, pharmacyName, onAdd, onEdit, onAdjust }) {
  const { data: items = [], isLoading } = usePharmacyInventory(pharmacyId)
  const removeMutation = useRemoveInventoryItem()
  const notify = useNotificationStore()
  const [confirmDelete, setConfirmDelete] = useState(null)

  const handleDelete = async (item) => {
    try {
      await removeMutation.mutateAsync(item.id)
      notify.success('Medicamento removido do inventário.')
      setConfirmDelete(null)
    } catch (err) {
      notify.error(err.message)
    }
  }

  if (isLoading) return <div className="flex justify-center py-8"><Spinner size="md" /></div>

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {['Medicamento', 'Estado', 'Stock', 'Preço unit.', 'Actualizado', ''].map((h, i) => (
                <th key={i} className={`px-4 py-3 text-xs font-extrabold text-slate-400 uppercase tracking-wide ${i === 2 || i === 3 ? 'text-right' : 'text-left'} ${i === 5 ? 'w-28' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-sm">
                  Sem medicamentos registados nesta farmácia.
                  <button onClick={onAdd} className="ml-2 text-teal-600 font-semibold hover:text-teal-700">Adicionar →</button>
                </td>
              </tr>
            ) : items.map(item => (
              <tr key={item.id} className={`border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors ${item.status === 'OUT_OF_STOCK' ? 'opacity-60' : ''}`}>
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900 leading-tight">{item.medication_name}</p>
                  {item.generic_name && <p className="text-xs text-slate-400 mt-0.5">{item.generic_name}{item.dosage ? ` · ${item.dosage}` : ''}</p>}
                </td>
                <td className="px-4 py-3">
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${stockBg(item.status)}`}>
                    <span className={stockDot(item.status)} /><span className={stockText(item.status)}>{STOCK_STATUS_LABEL[item.status] || item.status}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`text-lg font-extrabold ${stockText(item.status)}`}>{item.quantity}</span>
                  <span className="text-xs text-slate-400 ml-1">un.</span>
                </td>
                <td className="px-4 py-3 text-right text-slate-600 font-medium">{fmt(item.unit_price)}</td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {fmtDate(item.last_synced_at || item.updated_at)}
                  {isStale(item.last_synced_at || item.updated_at) && (
                    <span className="ml-2 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">confirmar</span>
                  )}
                  {item.last_updated_by_name && <p className="text-slate-300">por {item.last_updated_by_name}</p>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => onAdjust(item)} className="btn-icon-sm" title="Ajustar stock">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                    </button>
                    <button onClick={() => onEdit(item)} className="btn-icon-sm" title="Editar"><IEdit /></button>
                    <button onClick={() => setConfirmDelete(item)} className="btn-icon-sm text-red-400 hover:text-red-600 hover:bg-red-50" title="Remover"><ITrash /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Remover medicamento" size="sm">
        {confirmDelete && (
          <div className="space-y-4">
            <Alert type="warning">
              Vai remover <strong>{confirmDelete.medication_name}</strong> do inventário de {pharmacyName}. Esta acção não pode ser desfeita.
            </Alert>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete)} disabled={removeMutation.isPending} className="btn-danger flex-1">
                {removeMutation.isPending && <Spinner size="sm" />} Remover
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
