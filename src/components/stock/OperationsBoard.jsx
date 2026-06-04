import { daysSince, isStale, STALE_STOCK_DAYS } from './stockUtils'

function InsightCard({ title, value, desc, tone = 'slate' }) {
  const map = {
    slate: 'border-slate-200 bg-white text-slate-900',
    teal:  'border-teal-200 bg-teal-50 text-teal-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    red:   'border-red-200 bg-red-50 text-red-900',
    blue:  'border-blue-200 bg-blue-50 text-blue-900',
  }
  return (
    <div className={`rounded-2xl border p-3.5 ${map[tone] || map.slate}`}>
      <p className="text-xl font-extrabold leading-tight">{value}</p>
      <p className="mt-1 text-sm font-extrabold">{title}</p>
      <p className="mt-1 text-xs opacity-70 leading-relaxed">{desc}</p>
    </div>
  )
}

export function OperationsBoard({ overview = [], pharmacies = [], activePharmacyName, onImport, onTemplate }) {
  const stale        = overview.filter(i => isStale(i.last_synced_at || i.updated_at))
  const missingPrice = overview.filter(i => i.unit_price == null || Number(i.unit_price) <= 0)
  const blocked      = overview.filter(i => i.status === 'OUT_OF_STOCK' || i.status === 'LOW_STOCK')

  const pharmacyAges = pharmacies.map(p => {
    const rows   = overview.filter(i => i.pharmacy_id === p.id)
    const newest = rows.map(i => i.last_synced_at || i.updated_at).filter(Boolean).sort((a, b) => new Date(b) - new Date(a))[0]
    return { ...p, count: rows.length, days: daysSince(newest), newest }
  }).sort((a, b) => (b.days ?? 999) - (a.days ?? 999))

  return (
    <section className="grid gap-3 xl:grid-cols-[1.35fr_0.9fr]">
      <div className="card p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="section-label mb-1">Mesa de trabalho</p>
            <h2 className="text-lg font-extrabold text-slate-900">Controlo real do inventário</h2>
            <p className="text-sm text-slate-500 mt-1">Priorize correcções antes que o operador envie preços ao cliente.</p>
          </div>
          <div className="hidden sm:flex gap-2">
            <button onClick={onTemplate} className="btn-secondary btn-sm">Modelo Excel</button>
            <button onClick={onImport}   className="btn-primary btn-sm">Importar stock</button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InsightCard title="Stock crítico"   value={blocked.length}      tone={blocked.length      ? 'amber' : 'teal'} desc="Baixo ou esgotado. Rever antes de confirmar pedidos." />
          <InsightCard title="Dados antigos"   value={stale.length}        tone={stale.length        ? 'amber' : 'teal'} desc="Registos sem confirmação recente da farmácia." />
          <InsightCard title="Sem preço"       value={missingPrice.length} tone={missingPrice.length ? 'red'   : 'teal'} desc="Itens que não podem gerar preço final com segurança." />
          <InsightCard title="Farmácia activa" value={activePharmacyName || '—'}                  tone="blue"            desc="Todas as acções manuais ficam ligadas a esta farmácia." />
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {[
            { title: '1. Receber Excel',      text: 'A farmácia envia a planilha preenchida com preço e quantidade.' },
            { title: '2. Validar importação', text: 'O gestor confere erros, novos medicamentos e alterações de preço.' },
            { title: '3. Confirmar stock',    text: 'O operador passa a usar apenas dados confirmados para vender.' },
          ].map(item => (
            <div key={item.title} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-sm font-extrabold text-slate-900">{item.title}</p>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <p className="section-label mb-1">Saúde das farmácias</p>
        <h2 className="text-lg font-extrabold text-slate-900">Última atualização</h2>
        <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
          {pharmacyAges.length === 0 ? (
            <p className="text-sm text-slate-400">Sem farmácias activas.</p>
          ) : pharmacyAges.slice(0, 8).map(p => (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{p.name}</p>
                <p className="text-xs text-slate-400">{p.count} item(ns) no inventário</p>
              </div>
              <span className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-bold ${p.days == null || p.days >= STALE_STOCK_DAYS ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                {p.days == null ? 'sem data' : p.days === 0 ? 'hoje' : `${p.days}d`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
