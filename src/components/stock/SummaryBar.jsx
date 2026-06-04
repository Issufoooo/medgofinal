export function SummaryBar({ stats, loading }) {
  const cards = [
    { label: 'Total de registos', value: stats?.total       ?? 0, color: 'text-slate-700' },
    { label: 'Em stock',          value: stats?.in_stock    ?? 0, color: 'text-green-600' },
    { label: 'Stock baixo',       value: stats?.low_stock   ?? 0, color: 'text-amber-600' },
    { label: 'Sem stock',         value: stats?.out_of_stock ?? 0, color: 'text-red-600'  },
    { label: 'Farmácias',         value: stats?.pharmacies  ?? 0, color: 'text-teal-600'  },
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
      {cards.map(c => (
        <div key={c.label} className="card p-3.5">
          {loading
            ? <div className="skeleton h-7 w-10 rounded mb-1" />
            : <p className={`text-xl font-extrabold ${c.color}`}>{c.value}</p>
          }
          <p className="text-xs text-slate-400 font-medium mt-0.5">{c.label}</p>
        </div>
      ))}
    </div>
  )
}
