import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { StatusBadge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'

const fmt = (v) => (v != null ? new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN', minimumFractionDigits: 0 }).format(v) : '—')
const fmtTs = (iso) => iso ? new Date(iso).toLocaleString('pt-MZ', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—'

function IconKpi({ children, tone = 'teal' }) {
  const map = {
    slate: 'bg-slate-100 text-slate-700',
    teal: 'bg-teal-100 text-teal-700',
    green: 'bg-green-100 text-green-700',
    orange: 'bg-orange-100 text-orange-700',
    red: 'bg-red-100 text-red-700',
  }
  return <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${map[tone]}`}>{children}</div>
}

function IconChart(){return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M5 19h14"/></svg>}
function IconOrders(){return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 104 0M9 5a2 2 0 012 2h2a2 2 0 012-2"/></svg>}
function IconCheck(){return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>}
function IconCancel(){return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>}
function IconRevenue(){return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
function IconClock(){return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3M12 22a10 10 0 100-20 10 10 0 000 20z"/></svg>}
function IconMedicine(){return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 6.5l7 7a3.536 3.536 0 11-5 5l-7-7a3.536 3.536 0 115-5z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l7 7"/></svg>}
function IconMap(){return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.553 2.776A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m-6 3l6-3"/></svg>}
function IconPharmacy(){return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M4 11h16M5 21h14a1 1 0 001-1V7a2 2 0 00-2-2H6a2 2 0 00-2 2v13a1 1 0 001 1z"/></svg>}
function IconUsers(){return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-1a4 4 0 00-5.356-3.77M9 20H4v-1a4 4 0 015.356-3.77M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>}
function IconSettings(){return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.427 1.756 2.925 0 3.352a1.724 1.724 0 00-1.066 2.572c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.427 1.756-2.925 1.756-3.352 0a1.724 1.724 0 00-2.572-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.427-1.756-2.925 0-3.352a1.724 1.724 0 001.066-2.572c-.94-1.543.826-3.31 2.37-2.37.996.607 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}
function IconDelivery(){return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17h6m-6 0a2 2 0 11-4 0m4 0a2 2 0 104 0m2 0h2a2 2 0 100 0m0 0h1a1 1 0 001-1v-3.586a1 1 0 00-.293-.707l-2.414-2.414A1 1 0 0016.586 9H15V6a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h2"/></svg>}

const KPI_CARDS = [
  { key:'total_orders', label:'Total pedidos', tone:'slate', Icon:IconOrders },
  { key:'active_orders', label:'Pedidos activos', tone:'teal', Icon:IconChart },
  { key:'delivered_today', label:'Entregues hoje', tone:'green', Icon:IconCheck },
  { key:'cancelled_today', label:'Cancelados hoje', tone:'red', Icon:IconCancel },
  { key:'pending_cancellations', label:'A aprovar', tone:'orange', Icon:IconClock },
  { key:'receita_estimada', label:'Receita estimada', tone:'teal', Icon:IconRevenue, currency:true },
]

const MANAGEMENT_AREAS = [
  { to:'/dono/cancelamentos', title:'Cancelamentos', desc:'Pedidos que exigem aprovação do dono.', state:'Pronto', tone:'orange', Icon:IconCancel },
  { to:'/dono/medicamentos', title:'Catálogo base', desc:'Nomes clínicos, categorias e visibilidade no site. Preços ficam no inventário.', state:'Pronto', tone:'teal', Icon:IconMedicine },
  { to:'/dono/farmacias', title:'Farmácias e disponibilidade', desc:'Parceiros, contactos e notas operacionais.', state:'Pronto', tone:'blue', Icon:IconPharmacy },
  { to:'/dono/zonas', title:'Zonas e taxas', desc:'Cobertura e regras de entrega por distância.', state:'Pronto', tone:'green', Icon:IconMap },
  { to:'/dono/utilizadores', title:'Utilizadores', desc:'Gestão de acessos, perfis e estado da equipa.', state:'Parcial', tone:'violet', Icon:IconUsers },
  { to:'/dono/configuracoes', title:'Configurações', desc:'WhatsApp templates, números e parâmetros globais.', state:'Pronto', tone:'slate', Icon:IconSettings },
  { to:'/dashboard', title:'Operação de pedidos', desc:'Supervisão do fluxo do operador e pedidos activos.', state:'Pronto', tone:'indigo', Icon:IconOrders },
  { to:'/stock',     title:'Inventário por farmácia', desc:'Preços, quantidades e disponibilidade real de cada farmácia parceira.', state:'Pronto', tone:'blue',   Icon:IconPharmacy },
  { to:'/motoboy', title:'Monitor de entregas', desc:'Supervisão da rota, recolha e entrega dos motoboys.', state:'Pronto', tone:'cyan', Icon:IconDelivery },
]

const TONE_STYLES = {
  slate: 'bg-slate-50 border-slate-200 text-slate-700',
  teal: 'bg-teal-50 border-teal-200 text-teal-700',
  green: 'bg-green-50 border-green-200 text-green-700',
  orange: 'bg-orange-50 border-orange-200 text-orange-700',
  red: 'bg-red-50 border-red-200 text-red-700',
  violet: 'bg-violet-50 border-violet-200 text-violet-700',
  blue: 'bg-blue-50 border-blue-200 text-blue-700',
  indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  cyan: 'bg-cyan-50 border-cyan-200 text-cyan-700',
}

const OWNER_SECTIONS = [
  { key: 'command',    label: 'Comando',          desc: 'Decisões pendentes, pedidos parados e risco de stock.' },
  { key: 'operation',  label: 'Operação',         desc: 'Pedidos recentes, filas activas e bloqueios operacionais.' },
  { key: 'management', label: 'Gestão',           desc: 'Atalhos administrativos reais para controlar o sistema.' },
  { key: 'reports',    label: 'Relatório rápido', desc: 'Leitura executiva do dia, stock crítico e receita estimada.' },
]
const VALID_OWNER_TABS = new Set(OWNER_SECTIONS.map(s => s.key))

function StatePill({ state }) {
  const map = {
    'Pronto': 'bg-green-50 text-green-700 border-green-200',
    'Parcial': 'bg-amber-50 text-amber-700 border-amber-200',
    'Em preparação': 'bg-slate-50 text-slate-600 border-slate-200',
  }
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${map[state]}`}>{state}</span>
}


function ageLabel(iso) {
  if (!iso) return 'sem data'
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 60) return `${Math.max(0, min)}min`
  if (min < 1440) return `${Math.floor(min / 60)}h`
  return `${Math.floor(min / 1440)}d`
}

function DecisionCard({ title, count, desc, to, tone = 'orange' }) {
  const map = {
    orange: 'border-orange-200 bg-orange-50 text-orange-900',
    teal: 'border-teal-200 bg-teal-50 text-teal-900',
    red: 'border-red-200 bg-red-50 text-red-900',
    blue: 'border-blue-200 bg-blue-50 text-blue-900',
  }
  return (
    <Link to={to} className={`rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm ${map[tone] || map.orange}`}>
      <p className="text-2xl font-extrabold leading-none">{count}</p>
      <p className="mt-2 font-extrabold">{title}</p>
      <p className="mt-1 text-xs opacity-75 leading-relaxed">{desc}</p>
    </Link>
  )
}

function OwnerCommandCenter({ pendingCancels, riskOrders, stockRisk }) {
  const oldOrders = riskOrders.filter(o => {
    const min = Math.floor((Date.now() - new Date(o.updated_at || o.created_at).getTime()) / 60000)
    return min >= 45
  })
  const criticalStock = stockRisk.filter(i => i.status === 'OUT_OF_STOCK' || i.unit_price == null)
  return (
    <section className="grid gap-3 lg:grid-cols-[1fr_1.05fr]">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
        <DecisionCard title="Decisões pendentes" count={pendingCancels.length} to="/dono/cancelamentos" tone="orange" desc="Cancelamentos ou casos que exigem decisão do dono." />
        <DecisionCard title="Pedidos parados" count={oldOrders.length} to="/dashboard" tone="red" desc="Pedidos activos sem avanço recente na operação." />
        <DecisionCard title="Risco de stock" count={criticalStock.length} to="/stock" tone="teal" desc="Itens sem stock, preço ou com disponibilidade crítica." />
      </div>
      <div className="card p-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <p className="section-label mb-1">Sala de controlo</p>
            <h2 className="text-lg font-extrabold text-slate-900">O que precisa de atenção</h2>
          </div>
          <Link to="/dashboard" className="text-sm font-semibold text-teal-600 hover:text-teal-800">Abrir operação →</Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-sm font-extrabold text-slate-900 mb-3">Pedidos mais antigos</p>
            <div className="space-y-2">
              {riskOrders.slice(0, 4).length === 0 ? <p className="text-sm text-slate-400">Sem bloqueios de pedido.</p> : riskOrders.slice(0, 4).map(order => (
                <div key={order.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 border border-slate-100">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{order.medication_name_snapshot}</p>
                    <p className="text-xs text-slate-400 truncate">{order.customer?.full_name || 'Cliente'} · {order.status}</p>
                  </div>
                  <span className="text-xs font-bold text-orange-600 shrink-0">{ageLabel(order.updated_at || order.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-sm font-extrabold text-slate-900 mb-3">Stock crítico</p>
            <div className="space-y-2">
              {stockRisk.slice(0, 4).length === 0 ? <p className="text-sm text-slate-400">Sem risco crítico de stock.</p> : stockRisk.slice(0, 4).map(item => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 border border-slate-100">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{item.medication_name}</p>
                    <p className="text-xs text-slate-400 truncate">{item.pharmacy_name}</p>
                  </div>
                  <span className={`text-xs font-bold shrink-0 ${item.status === 'OUT_OF_STOCK' ? 'text-red-600' : 'text-amber-600'}`}>{item.quantity} un.</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export function OwnerDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_dashboard_stats')
      return Array.isArray(data) ? data[0] : data
    },
    refetchInterval: 30000,
  })

  const { data: recentOrders = [], isLoading: recentLoading } = useQuery({
    queryKey: ['recent-orders'],
    queryFn: async () => {
      const { data } = await supabase
        .from('orders')
        .select('id,status,medication_name_snapshot,total_price,created_at,customer:customers(full_name)')
        .order('created_at', { ascending: false })
        .limit(8)
      return data || []
    },
    refetchInterval: 20000,
  })

  const { data: pendingCancels = [] } = useQuery({
    queryKey: ['pending-cancellation-requests'],
    queryFn: async () => {
      const { data } = await supabase
        .from('cancellation_requests')
        .select('id,reason,created_at,order:orders(medication_name_snapshot),requested_by_profile:profiles!cancellation_requests_requested_by_fkey(full_name)')
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false })
      return data || []
    },
    refetchInterval: 30000,
  })

  const { data: liveSummary = [] } = useQuery({
    queryKey: ['owner-live-summary'],
    queryFn: async () => {
      const { data } = await supabase
        .from('orders')
        .select('status')
        .in('status', ['NEW', 'PRESCRIPTION_PENDING', 'IN_VALIDATION', 'AWAITING_CLIENT', 'IN_DELIVERY'])
      return data || []
    },
    refetchInterval: 15000,
  })

  // Estimated revenue from delivered orders today
  const { data: revenueData } = useQuery({
    queryKey: ['owner-revenue-today'],
    queryFn: async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const { data } = await supabase
        .from('orders')
        .select('total_price')
        .eq('status', 'DELIVERED')
        .gte('delivered_at', today.toISOString())   // use delivered_at — accurate delivery date
        .not('total_price', 'is', null)
      return (data || []).reduce((sum, row) => sum + (parseFloat(row.total_price) || 0), 0)
    },
    refetchInterval: 60000,
  })


  const { data: riskOrders = [] } = useQuery({
    queryKey: ['owner-risk-orders'],
    queryFn: async () => {
      const { data } = await supabase
        .from('orders')
        .select('id,status,medication_name_snapshot,created_at,updated_at,customer:customers(full_name)')
        .in('status', ['NEW','PRESCRIPTION_PENDING','IN_VALIDATION','AWAITING_PHARMACY','CONFIRMED'])
        .order('updated_at', { ascending: true })
        .limit(8)
      return data || []
    },
    refetchInterval: 30000,
  })

  const { data: stockRisk = [] } = useQuery({
    queryKey: ['owner-stock-risk'],
    queryFn: async () => {
      const { data } = await supabase
        .from('inventory_overview')
        .select('id,medication_name,pharmacy_name,quantity,status,unit_price,last_synced_at,updated_at')
        .or('status.eq.LOW_STOCK,status.eq.OUT_OF_STOCK')
        .limit(8)
      return data || []
    },
    refetchInterval: 60000,
  })

  const liveCounts = liveSummary.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1
    return acc
  }, {})

  // Merge revenue into stats object for KPI display
  const statsWithRevenue = stats ? { ...stats, receita_estimada: revenueData ?? 0 } : undefined

  const [searchParams] = useSearchParams()
  const activeTab = VALID_OWNER_TABS.has(searchParams.get('tab')) ? searchParams.get('tab') : 'command'
  const activeSection = OWNER_SECTIONS.find(s => s.key === activeTab) || OWNER_SECTIONS[0]

  return (
    <div className="dashboard-page">
      <div className="dashboard-shell-loose">
        <section className="dashboard-header">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="section-label mb-0.5">Centro de decisão</p>
              <h1 className="text-2xl font-extrabold leading-tight text-slate-950">{activeSection.label}</h1>
              <p className="dashboard-subtitle">{activeSection.desc}</p>
            </div>
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
              <div className="grid grid-cols-4 gap-2 text-center lg:w-[360px]">
                {[{ label:'Novos', value: liveCounts.NEW || 0 },{ label:'Receitas', value: liveCounts.PRESCRIPTION_PENDING || 0 },{ label:'Em rota', value: liveCounts.IN_DELIVERY || 0 },{ label:'Canc.', value: pendingCancels.length || 0 }].map(item => (
                  <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2"><p className="text-base font-extrabold leading-none text-slate-950">{item.value}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{item.label}</p></div>
                ))}
              </div>
              <div className="flex gap-2">
                <Link to="/dashboard" className="btn-secondary px-3.5">Pedidos</Link>
                <Link to="/stock" className="btn-secondary px-3.5">Stock</Link>
                <Link to="/dono/configuracoes" className="btn-primary px-3.5">Configurações</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-3 xl:grid-cols-6">
          {KPI_CARDS.map(({ key, label, tone, Icon, currency }) => {
            const rawValue = statsWithRevenue?.[key]
            const displayValue = statsLoading ? null : currency && rawValue != null ? fmt(rawValue) : (rawValue ?? 0)
            return (
              <div key={key} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <IconKpi tone={tone}><Icon /></IconKpi>
                  <div className="min-w-0">
                    {statsLoading ? <div className="skeleton h-6 w-16 rounded-lg" /> : <p className={`truncate font-extrabold text-slate-950 leading-tight ${currency ? 'text-base' : 'text-xl'}`}>{displayValue}</p>}
                    <p className="mt-0.5 truncate text-[11px] font-bold leading-tight text-slate-500">{label}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </section>

        {activeTab === 'command' && (
          <div className="space-y-4">
            <OwnerCommandCenter pendingCancels={pendingCancels} riskOrders={riskOrders} stockRisk={stockRisk} />
            {pendingCancels.length > 0 && (
              <section className="overflow-hidden rounded-3xl border border-orange-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-orange-100 bg-orange-50 px-5 py-4"><div><p className="text-sm font-extrabold text-orange-900">Decisão pendente</p><p className="mt-0.5 text-xs text-orange-700/80">Cancelamentos aguardando aprovação.</p></div><Link to="/dono/cancelamentos" className="btn-accent">Rever agora</Link></div>
                <div className="divide-y divide-slate-100">{pendingCancels.slice(0, 4).map(item => <div key={item.id} className="px-5 py-4"><p className="font-extrabold text-slate-900">{item.order?.medication_name_snapshot}</p><p className="mt-1 text-sm text-slate-500">{item.reason}</p></div>)}</div>
              </section>
            )}
          </div>
        )}

        {activeTab === 'operation' && (
          <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
              <div className="mb-4 flex items-center justify-between"><div><p className="section-label mb-1">Pedidos recentes</p><h3 className="text-xl font-extrabold text-slate-950">Fluxo operacional</h3></div><Link to="/dashboard" className="btn-secondary">Abrir operação</Link></div>
              {recentLoading ? <Spinner /> : recentOrders.length === 0 ? <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">Sem pedidos recentes.</div> : <div className="space-y-2">{recentOrders.slice(0, 7).map(order => <div key={order.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate font-extrabold text-slate-900">{order.medication_name_snapshot}</p><p className="truncate text-sm text-slate-500">{order.customer?.full_name || 'Cliente'} · {fmtTs(order.created_at)}</p></div><StatusBadge status={order.status} /></div></div>)}</div>}
            </section>
            <section className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm"><p className="section-label mb-1 text-red-500">Risco operacional</p><h3 className="text-xl font-extrabold text-red-950">Pedidos mais antigos</h3><div className="mt-4 space-y-2">{riskOrders.length === 0 ? <div className="rounded-2xl bg-white p-4 text-sm font-semibold text-red-700">Sem bloqueios críticos.</div> : riskOrders.slice(0, 6).map(o => <div key={o.id} className="rounded-2xl bg-white p-3"><p className="truncate font-extrabold text-slate-900">{o.medication_name_snapshot}</p><p className="text-xs text-slate-500">{o.customer?.full_name || 'Cliente'} · {ageLabel(o.updated_at || o.created_at)}</p></div>)}</div></section>
          </div>
        )}

        {activeTab === 'management' && (
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {MANAGEMENT_AREAS.map(({ to, title, desc, state, tone, Icon }) => <Link key={to} to={to} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-card-md"><div className="flex items-start justify-between gap-3"><div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${TONE_STYLES[tone] || TONE_STYLES.slate}`}><Icon /></div><StatePill state={state} /></div><h3 className="mt-3 font-extrabold text-slate-900 group-hover:text-teal-700">{title}</h3><p className="mt-1.5 text-xs leading-relaxed text-slate-500">{desc}</p></Link>)}
          </section>
        )}

        {activeTab === 'reports' && (
          <div className="grid gap-4 xl:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm"><p className="section-label mb-1">Stock crítico</p><h3 className="text-xl font-extrabold text-slate-950">Impacto na venda</h3><div className="mt-4 space-y-2">{stockRisk.length === 0 ? <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Sem stock crítico.</div> : stockRisk.map(item => <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"><p className="font-extrabold text-slate-900">{item.medication_name}</p><p className="text-sm text-slate-500">{item.pharmacy_name} · {item.quantity} unidade(s) · {fmt(item.unit_price)}</p></div>)}</div></section>
            <section className="rounded-2xl border border-teal-200 bg-teal-50 p-4 shadow-sm"><p className="section-label mb-1 text-teal-600">Leitura executiva</p><h3 className="text-xl font-extrabold text-teal-950">Hoje</h3><p className="mt-3 text-sm leading-relaxed text-teal-700">Acompanha receita entregue, pedidos pendentes, stock crítico e cancelamentos. Para números financeiros oficiais, confirma no gateway e nas entregas concluídas.</p><div className="mt-4 rounded-2xl bg-white p-4"><p className="text-sm font-semibold text-slate-500">Receita estimada entregue</p><p className="mt-1 text-3xl font-extrabold text-teal-700">{fmt(revenueData || 0)}</p></div></section>
          </div>
        )}
      </div>
    </div>
  )
}
