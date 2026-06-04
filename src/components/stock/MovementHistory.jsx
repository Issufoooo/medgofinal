import { Spinner } from '../ui/Spinner'
import { useInventoryMovements } from '../../hooks/useInventory'
import { fmtDate } from './stockUtils'

const TYPE_LABEL = {
  SYNC:          'Sincronização',
  ADJUSTMENT:    'Ajuste manual',
  ORDER_RESERVE: 'Reserva (pedido)',
  ORDER_RELEASE: 'Liberação (cancelamento)',
  ORDER_FULFILL: 'Consumo (entrega)',
}
const TYPE_COLOR = {
  SYNC:          'text-teal-600',
  ADJUSTMENT:    'text-slate-600',
  ORDER_RESERVE: 'text-blue-600',
  ORDER_RELEASE: 'text-amber-600',
  ORDER_FULFILL: 'text-green-600',
}

export function MovementHistory({ pharmacyId }) {
  const { data: movements = [], isLoading } = useInventoryMovements(pharmacyId)

  if (isLoading) return <div className="flex justify-center py-8"><Spinner size="md" /></div>

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            {['Medicamento', 'Tipo', 'Antes', 'Alteração', 'Depois', 'Data'].map((h, i) => (
              <th key={h} className={`px-4 py-3 text-xs font-extrabold text-slate-400 uppercase tracking-wide ${i > 1 ? 'text-right' : 'text-left'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {movements.length === 0 ? (
            <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">Sem movimentos registados.</td></tr>
          ) : movements.map(m => (
            <tr key={m.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors">
              <td className="px-4 py-3 font-medium text-slate-800">{m.medication?.commercial_name || '—'}</td>
              <td className={`px-4 py-3 text-xs font-semibold ${TYPE_COLOR[m.movement_type] || 'text-slate-500'}`}>{TYPE_LABEL[m.movement_type] || m.movement_type}</td>
              <td className="px-4 py-3 text-right text-slate-500">{m.quantity_before}</td>
              <td className={`px-4 py-3 text-right font-bold ${m.quantity_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {m.quantity_change >= 0 ? '+' : ''}{m.quantity_change}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-slate-800">{m.quantity_after}</td>
              <td className="px-4 py-3 text-xs text-slate-400">
                {fmtDate(m.created_at)}
                {m.performed_by_profile?.full_name && <p className="text-slate-300">{m.performed_by_profile.full_name}</p>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
