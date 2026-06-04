import { useState } from 'react'
import { Spinner } from '../ui/Spinner'

export function AdjustForm({ item, onSave, onCancel, loading }) {
  const [delta, setDelta]   = useState('')
  const [reason, setReason] = useState('')
  const [error, setError]   = useState('')

  const parsedDelta = parseInt(delta)
  const preview     = !isNaN(parsedDelta) ? Math.max(0, item.quantity + parsedDelta) : null

  const handleSubmit = () => {
    if (!delta || isNaN(parsedDelta)) { setError('Introduza um valor de ajuste'); return }
    if (!reason.trim())               { setError('Indique o motivo do ajuste'); return }
    onSave({ inventoryId: item.id, adjustmentQty: parsedDelta, reason })
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
        <p className="text-xs text-slate-400 mb-0.5">Medicamento</p>
        <p className="font-semibold text-slate-900">{item.medication_name}</p>
        <p className="text-sm text-slate-500 mt-1">
          Stock actual: <strong className="text-slate-800">{item.quantity} unidades</strong>
        </p>
      </div>

      <div>
        <label className="label">Ajuste (positivo para adicionar, negativo para remover)</label>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setDelta(d => String((parseInt(d) || 0) - 1))} className="btn-icon border border-slate-200 w-10 h-10 text-lg">−</button>
          <input
            type="number" step="1" value={delta}
            onChange={e => { setDelta(e.target.value); setError('') }}
            placeholder="0" className="input text-center text-lg font-bold flex-1"
          />
          <button type="button" onClick={() => setDelta(d => String((parseInt(d) || 0) + 1))} className="btn-icon border border-slate-200 w-10 h-10 text-lg">+</button>
        </div>
        {preview !== null && (
          <p className="label-hint">Novo stock: <strong className="text-slate-800">{preview} unidades</strong></p>
        )}
      </div>

      <div>
        <label className="label">Motivo do ajuste <span className="text-red-500">*</span></label>
        <textarea
          rows={2} value={reason}
          onChange={e => { setReason(e.target.value); setError('') }}
          placeholder="Ex: Contagem física, devolução, expirado..."
          className="input resize-none"
        />
      </div>

      {error && <p className="field-error">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button onClick={onCancel} className="btn-secondary flex-1">Cancelar</button>
        <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1">
          {loading && <Spinner size="sm" />} Aplicar ajuste
        </button>
      </div>
    </div>
  )
}
