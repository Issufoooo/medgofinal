import { Spinner } from '../ui/Spinner'
import { useInventoryOverview } from '../../hooks/useInventory'
import { stockBg, stockDot, stockText, fmt } from './stockUtils'
import { STOCK_STATUS_LABEL } from '../../lib/constants'

export function GlobalInventorySearch({ search, statusFilter }) {
  const { data: items = [], isLoading } = useInventoryOverview({ search, statusFilter })

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>
  if (!items.length) return (
    <div className="card p-12 text-center">
      <p className="font-semibold text-slate-700 mb-1">Nenhum resultado</p>
      <p className="text-sm text-slate-400">Tente outro termo ou filtro.</p>
    </div>
  )

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            {['Medicamento', 'Farmácia', 'Estado', 'Stock', 'Preço'].map(h => (
              <th key={h} className={`px-4 py-3 text-xs font-extrabold text-slate-400 uppercase tracking-wide ${h === 'Stock' || h === 'Preço' ? 'text-right' : 'text-left'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id} className={`border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors ${item.status === 'OUT_OF_STOCK' ? 'opacity-60' : ''}`}>
              <td className="px-4 py-3">
                <p className="font-semibold text-slate-900">{item.medication_name}</p>
                {item.generic_name && <p className="text-xs text-slate-400">{item.generic_name}</p>}
              </td>
              <td className="px-4 py-3 text-slate-600">{item.pharmacy_name}</td>
              <td className="px-4 py-3">
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${stockBg(item.status)}`}>
                  <span className={stockDot(item.status)} />
                  <span className={stockText(item.status)}>{STOCK_STATUS_LABEL[item.status]}</span>
                </div>
              </td>
              <td className={`px-4 py-3 text-right text-base font-extrabold ${stockText(item.status)}`}>{item.quantity}</td>
              <td className="px-4 py-3 text-right text-slate-600">{fmt(item.unit_price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
