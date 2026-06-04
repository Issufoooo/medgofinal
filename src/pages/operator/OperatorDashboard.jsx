import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useOrderCounts } from '../../hooks/useOrders'
import { OrderCard } from '../../components/dashboard/OrderCard'
import { Spinner } from '../../components/ui/Spinner'
import { getNextAction } from '../../lib/constants'
import { getOrdersForOperator } from '../../services/orderService'

function IconGrid(){return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>}
function IconNew(){return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>}
function IconRx(){return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>}
function IconSearch(){return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg>}
function IconClient(){return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v8a2 2 0 01-2 2h-2M9 8h6M7 21h10M9 12h6"/></svg>}
function IconCheck(){return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>}
function IconDelivery(){return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17h6m-6 0a2 2 0 11-4 0m4 0a2 2 0 104 0m2 0h2a2 2 0 100 0m0 0h1a1 1 0 001-1v-3.586a1 1 0 00-.293-.707l-2.414-2.414A1 1 0 0016.586 9H15V6a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h2"/></svg>}
function IconClock(){return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
function IconShield(){return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
function IconRefresh(){return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M5.7 18.3A8 8 0 0018.3 5.7L20 4M4 20l1.7-1.7"/></svg>}
function IconAlert(){return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m0 3.75h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>}
function IconPackage(){return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>}

const OPERATOR_TABS = [
  { id:'overview', label:'Painel geral', short:'Geral', status:null, Icon:IconGrid, description:'Resumo operacional, prioridades e bloqueios sem repetir filtros.', tone:'slate' },
  { id:'new', label:'Entrada', short:'Entrada', status:'NEW', Icon:IconNew, title:'Novos pedidos', action:'Triar', description:'Primeira leitura do pedido antes de avançar.', tone:'slate' },
  { id:'prescription', label:'Receitas', short:'Receita', status:'PRESCRIPTION_PENDING', Icon:IconRx, title:'Documentos pendentes', action:'Validar', description:'Confirmar receita, anexo ou exigência documental.', tone:'amber' },
  { id:'validation', label:'Validação', short:'Validar', status:'IN_VALIDATION', Icon:IconSearch, title:'Em análise', action:'Resolver', description:'Conferir dados e decidir o próximo passo.', tone:'violet' },
  { id:'pharmacy', label:'Farmácia', short:'Farmácia', status:'AWAITING_PHARMACY', Icon:IconShield, title:'Stock e preço', action:'Escolher', description:'Escolher farmácia, confirmar disponibilidade e valor.', tone:'blue' },
  { id:'client', label:'Cliente', short:'Cliente', status:'AWAITING_CLIENT', Icon:IconClient, title:'A confirmar', action:'Contactar', description:'Pedidos à espera de resposta ou confirmação do cliente.', tone:'orange' },
  { id:'ready', label:'Prontos', short:'Prontos', status:'CONFIRMED', Icon:IconCheck, title:'Prontos para entrega', action:'Atribuir', description:'Pedidos confirmados que devem seguir para preparação ou rota.', tone:'teal' },
  { id:'preparation', label:'Preparação', short:'Prep.', status:'IN_PREPARATION', Icon:IconPackage, title:'Em preparação', action:'Acompanhar', description:'Pedidos já enviados para preparação antes da rota.', tone:'indigo' },
  { id:'delivery', label:'Em entrega', short:'Entrega', status:'IN_DELIVERY', Icon:IconDelivery, title:'Em entrega', action:'Monitorar', description:'Pedidos que já estão em rota de entrega.', tone:'cyan' },
]

const TAB_BY_ID = Object.fromEntries(OPERATOR_TABS.map(tab => [tab.id, tab]))

const STATUS_TO_TAB = OPERATOR_TABS.reduce((acc, tab) => {
  if (tab.status) acc[tab.status] = tab.id
  return acc
}, {})

const TONE = {
  slate: 'border-slate-200 bg-white text-slate-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-800',
  violet: 'border-violet-200 bg-violet-50 text-violet-800',
  blue: 'border-blue-200 bg-blue-50 text-blue-800',
  orange: 'border-orange-200 bg-orange-50 text-orange-800',
  teal: 'border-teal-200 bg-teal-50 text-teal-800',
  indigo: 'border-indigo-200 bg-indigo-50 text-indigo-800',
  cyan: 'border-cyan-200 bg-cyan-50 text-cyan-800',
}

const ACTIVE_TAB = {
  slate: 'border-slate-900 bg-slate-900 text-white shadow-sm',
  amber: 'border-amber-500 bg-amber-500 text-white shadow-sm',
  violet: 'border-violet-500 bg-violet-500 text-white shadow-sm',
  blue: 'border-blue-500 bg-blue-500 text-white shadow-sm',
  orange: 'border-orange-500 bg-orange-500 text-white shadow-sm',
  teal: 'border-teal-500 bg-teal-500 text-white shadow-sm',
  indigo: 'border-indigo-500 bg-indigo-500 text-white shadow-sm',
  cyan: 'border-cyan-500 bg-cyan-500 text-white shadow-sm',
}

const OPERATED_STATUSES = ['NEW', 'PRESCRIPTION_PENDING', 'IN_VALIDATION', 'AWAITING_PHARMACY', 'AWAITING_CLIENT', 'CONFIRMED']

function minutesSince(iso) {
  if (!iso) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
}

function countFor(counts, status, allActiveOrders) {
  if (!status) return counts._total ?? allActiveOrders.length
  return counts[status] || 0
}

function EmptyOrders({ activeTab, search }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
        {search ? <IconSearch /> : <activeTab.Icon />}
      </div>
      <p className="font-extrabold text-slate-800">{search ? 'Nada encontrado nesta fila' : 'Fila limpa neste momento'}</p>
      <p className="mx-auto mt-1 max-w-[340px] text-sm text-slate-400">
        {search ? 'Tenta pesquisar por outro medicamento, cliente, referência ou morada.' : 'Quando houver pedidos nesta etapa, eles aparecem aqui automaticamente.'}
      </p>
    </div>
  )
}

function MetricBox({ label, value, tone = 'slate' }) {
  const cls = {
    slate: 'bg-slate-50 border-slate-200 text-slate-900',
    teal: 'bg-teal-50 border-teal-200 text-teal-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    orange: 'bg-orange-50 border-orange-200 text-orange-800',
  }[tone]
  return (
    <div className={`rounded-xl border px-3 py-2 text-center ${cls}`}>
      <p className="text-lg font-extrabold leading-none">{value || 0}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide opacity-60">{label}</p>
    </div>
  )
}

function DeskHeader({ allActiveOrders, counts, urgent, isFetching }) {
  const ready = (counts.CONFIRMED || 0) + (counts.IN_PREPARATION || 0)
  const delivery = counts.IN_DELIVERY || 0

  return (
    <header className="dashboard-header">
      <div className="grid gap-3 xl:grid-cols-[minmax(360px,1fr)_auto] xl:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="section-label">Mesa do operador</p>
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
              <IconRefresh /> polling 20s
            </span>
            {isFetching && <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse2" />}
          </div>
          <h1 className="mt-1 text-2xl font-extrabold leading-tight text-slate-950">Operação de pedidos</h1>
          <p className="mt-0.5 max-w-3xl text-sm text-slate-500">Painel geral e filas separadas para triagem, receita, validação, farmácia, cliente e entrega.</p>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:min-w-[460px]">
          <MetricBox label="activos" value={counts._total ?? allActiveOrders.length} />
          <MetricBox label="prioridade" value={urgent} tone={urgent > 0 ? 'orange' : 'teal'} />
          <MetricBox label="prontos" value={ready} tone="teal" />
          <MetricBox label="entrega" value={delivery} tone="amber" />
        </div>
      </div>
    </header>
  )
}

function OperatorTabBar({ activeTabId, counts, allActiveOrders, onSelect }) {
  return (
    <nav className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      <div className="scroll-x flex gap-1.5">
        {OPERATOR_TABS.map(tab => {
          const active = activeTabId === tab.id
          const value = countFor(counts, tab.status, allActiveOrders)
          return (
            <button
              key={tab.id}
              onClick={() => onSelect(tab.id)}
              className={`inline-flex min-w-max items-center gap-2 rounded-xl border px-3 py-2 text-xs font-extrabold transition-all ${active ? ACTIVE_TAB[tab.tone] : 'border-transparent bg-slate-50 text-slate-500 hover:bg-white hover:text-slate-900 hover:border-slate-200'}`}
            >
              <tab.Icon />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.short}</span>
              {value > 0 && <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${active ? 'bg-white/20 text-white' : 'bg-white text-slate-500'}`}>{value}</span>}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

function PriorityCard({ tab, count, onSelect }) {
  const hasItems = count > 0
  return (
    <button
      onClick={() => onSelect(tab.id)}
      className={`rounded-2xl border px-3 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${TONE[tab.tone]} ${hasItems ? '' : 'opacity-80'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/70 shadow-sm"><tab.Icon /></span>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] opacity-60">{tab.label}</p>
            <p className="truncate text-sm font-extrabold leading-tight">{tab.title}</p>
          </div>
        </div>
        <p className="text-2xl font-extrabold leading-none">{count || 0}</p>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-current/10 pt-2">
        <span className="truncate text-xs font-semibold opacity-70">{tab.description}</span>
        <span className="shrink-0 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-extrabold shadow-sm">{tab.action}</span>
      </div>
    </button>
  )
}

function StuckPanel({ stuck, onSelectStatus }) {
  return (
    <section className="rounded-2xl border border-orange-200 bg-orange-50 p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-orange-800">
          <IconClock />
          <div>
            <h2 className="text-sm font-extrabold leading-tight">Pedidos parados</h2>
            <p className="text-xs text-orange-700/80">Sem avanço há 30 minutos ou mais.</p>
          </div>
        </div>
        <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-extrabold text-orange-700">{stuck.length}</span>
      </div>

      <div className="mt-3 space-y-2">
        {stuck.length === 0 ? (
          <div className="rounded-xl border border-orange-100 bg-white/70 px-3 py-2 text-xs font-semibold text-orange-700">Nenhum bloqueio crítico agora.</div>
        ) : stuck.map(order => (
          <button key={order.id} onClick={() => onSelectStatus(order.status)} className="w-full rounded-xl border border-orange-100 bg-white px-3 py-2 text-left transition hover:bg-orange-50">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-sm font-extrabold text-slate-900">{order.medication_name_snapshot}</p>
              <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-extrabold text-orange-700">{order.minutes} min</span>
            </div>
            <p className="mt-0.5 truncate text-xs text-slate-500">{order.customer?.full_name || 'Cliente'} · {order.action.label}</p>
          </button>
        ))}
      </div>
    </section>
  )
}

function PipelineCompact({ counts, allActiveOrders, onSelect }) {
  return (
    <section className="dashboard-panel">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="section-label mb-0.5">Painel geral</p>
          <h2 className="text-base font-extrabold leading-tight text-slate-950">Estado das filas</h2>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-extrabold text-slate-500">cada card abre a aba certa</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {OPERATOR_TABS.filter(tab => tab.status).map(tab => (
          <PriorityCard key={tab.id} tab={tab} count={countFor(counts, tab.status, allActiveOrders)} onSelect={onSelect} />
        ))}
      </div>
    </section>
  )
}

function SearchBox({ search, setSearch, activeTab }) {
  return (
    <section className="dashboard-panel">
      <div className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_auto] lg:items-center">
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><IconSearch /></span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por medicamento, cliente, referência ou morada..."
            className="input h-11 pl-10 text-sm"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 btn-icon-sm" aria-label="Limpar pesquisa">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          )}
        </div>
        <div className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-extrabold ${TONE[activeTab.tone]}`}>
          <activeTab.Icon />
          {activeTab.title || activeTab.label}
        </div>
      </div>
    </section>
  )
}

function OverviewPanel({ allActiveOrders, counts, stuck, onSelectTab, onSelectStatus, isLoading }) {
  const recentOrders = allActiveOrders.slice(0, 6)

  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
      <main className="min-w-0 space-y-3">
        <PipelineCompact counts={counts} allActiveOrders={allActiveOrders} onSelect={onSelectTab} />

        <section className="dashboard-panel">
          <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <p className="section-label mb-0.5">Mesa activa</p>
              <h2 className="text-base font-extrabold leading-tight text-slate-950">Últimos pedidos em operação</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-extrabold text-slate-500">{recentOrders.length} mostrado(s)</span>
          </div>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Spinner size="lg" />
              <p className="text-sm text-slate-400">A carregar pedidos...</p>
            </div>
          ) : recentOrders.length === 0 ? (
            <EmptyOrders activeTab={TAB_BY_ID.overview} />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
              {recentOrders.map(order => <OrderCard key={order.id} order={order} />)}
            </div>
          )}
        </section>
      </main>

      <aside className="space-y-3 xl:sticky xl:top-4 xl:self-start">
        <StuckPanel stuck={stuck} onSelectStatus={onSelectStatus} />
        <section className="dashboard-panel">
          <p className="section-label mb-0.5">Rotina da mesa</p>
          <h2 className="text-base font-extrabold leading-tight text-slate-950">Ordem recomendada</h2>
          <div className="mt-3 space-y-2 text-sm text-slate-500">
            <p><span className="font-extrabold text-slate-800">1.</span> Resolver primeiro pedidos parados ou com receita pendente.</p>
            <p><span className="font-extrabold text-slate-800">2.</span> Confirmar farmácia e preço antes de contactar o cliente.</p>
            <p><span className="font-extrabold text-slate-800">3.</span> Enviar pedidos confirmados para preparação e entrega.</p>
          </div>
        </section>
      </aside>
    </div>
  )
}

function QueuePanel({ activeTab, visibleOrders, search, setSearch, stuck, onSelectStatus, isLoading }) {
  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
      <main className="min-w-0 space-y-3">
        <section className={`rounded-2xl border p-3 shadow-sm ${TONE[activeTab.tone]}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/75 shadow-sm"><activeTab.Icon /></span>
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] opacity-60">Fila operacional</p>
                  <h2 className="truncate text-lg font-extrabold leading-tight">{activeTab.title}</h2>
                </div>
              </div>
              <p className="mt-2 max-w-3xl text-sm font-semibold opacity-75">{activeTab.description}</p>
            </div>
            <span className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white/75 px-3 py-2 text-xs font-extrabold shadow-sm">Próxima acção: {activeTab.action}</span>
          </div>
        </section>

        <SearchBox search={search} setSearch={setSearch} activeTab={activeTab} />

        <section className="dashboard-panel">
          <div className="mb-3 flex flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="section-label mb-0.5">Lista da fila</p>
              <h2 className="text-base font-extrabold leading-tight text-slate-950">{activeTab.label}</h2>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <span>{visibleOrders.length} pedido(s)</span>
              {search && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">pesquisa aplicada</span>}
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Spinner size="lg" />
              <p className="text-sm text-slate-400">A carregar pedidos...</p>
            </div>
          ) : visibleOrders.length === 0 ? (
            <EmptyOrders activeTab={activeTab} search={search} />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
              {visibleOrders.map(order => <OrderCard key={order.id} order={order} />)}
            </div>
          )}
        </section>
      </main>

      <aside className="space-y-3 xl:sticky xl:top-4 xl:self-start">
        <StuckPanel stuck={stuck} onSelectStatus={onSelectStatus} />
        <section className="dashboard-panel">
          <p className="section-label mb-0.5">Orientação</p>
          <h2 className="text-base font-extrabold leading-tight text-slate-950">Como usar esta fila</h2>
          <p className="mt-2 text-sm text-slate-500">Esta aba mostra apenas pedidos da etapa seleccionada. Abre o card para validar, confirmar preço, contactar cliente ou avançar o estado.</p>
        </section>
      </aside>
    </div>
  )
}

export function OperatorDashboard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')

  const requestedTab = searchParams.get('tab') || 'overview'
  const activeTab = TAB_BY_ID[requestedTab] || TAB_BY_ID.overview

  /*
   * Intentionally uses one polling query instead of Supabase Realtime here.
   * The previous implementation subscribed multiple times to the same
   * `orders-realtime` channel through useOrders(), which can throw:
   * "cannot add postgres_changes callbacks ... after subscribe()".
   * Polling every 20s is stable and enough for the operator dashboard.
   */
  const {
    data: allActiveOrders = [],
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['operator-dashboard-orders'],
    queryFn: () => getOrdersForOperator({ statusFilter: 'ALL', search: '' }),
    refetchInterval: 20_000,
  })

  const { data: counts = {} } = useOrderCounts()

  const urgent = (counts.NEW || 0) + (counts.PRESCRIPTION_PENDING || 0) + (counts.IN_VALIDATION || 0) + (counts.AWAITING_PHARMACY || 0)

  const stuck = useMemo(() => allActiveOrders
    .filter(o => OPERATED_STATUSES.includes(o.status))
    .map(o => ({ ...o, minutes: minutesSince(o.updated_at || o.created_at), action: getNextAction(o.status) }))
    .filter(o => o.minutes >= 30)
    .sort((a,b) => b.minutes - a.minutes)
    .slice(0, 5), [allActiveOrders])

  const visibleOrders = useMemo(() => {
    const term = search.trim().toLowerCase()

    return allActiveOrders.filter((order) => {
      const matchesStatus = !activeTab.status || order.status === activeTab.status

      if (!matchesStatus) return false
      if (!term) return true

      const haystack = [
        order.medication_name_snapshot,
        order.tracking_token,
        order.delivery_address,
        order.customer?.full_name,
        order.customer?.whatsapp_number,
        order.customer?.phone,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(term)
    })
  }, [allActiveOrders, activeTab.status, search])

  const selectTab = (tabId) => {
    setSearch('')
    if (tabId === 'overview') {
      setSearchParams({})
      return
    }
    setSearchParams({ tab: tabId })
  }

  const selectStatus = (status) => {
    selectTab(STATUS_TO_TAB[status] || 'overview')
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-shell">
        <DeskHeader allActiveOrders={allActiveOrders} counts={counts} urgent={urgent} isFetching={isFetching} />
        <OperatorTabBar activeTabId={activeTab.id} counts={counts} allActiveOrders={allActiveOrders} onSelect={selectTab} />

        {activeTab.id === 'overview' ? (
          <OverviewPanel
            allActiveOrders={allActiveOrders}
            counts={counts}
            stuck={stuck}
            onSelectTab={selectTab}
            onSelectStatus={selectStatus}
            isLoading={isLoading}
          />
        ) : (
          <QueuePanel
            activeTab={activeTab}
            visibleOrders={visibleOrders}
            search={search}
            setSearch={setSearch}
            stuck={stuck}
            onSelectStatus={selectStatus}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  )
}
