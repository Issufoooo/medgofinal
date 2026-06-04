import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMyDeliveries, useDeliveryHistory, useConfirmPickup, useConfirmDelivery } from '../../hooks/useDeliveries'
import { useNotificationStore } from '../../store/notificationStore'
import { useMapConfig } from '../../hooks/useMapConfig'
import { geocodeAddress } from '../../services/mapService'
import { Modal } from '../../components/ui/Modal'
import { Spinner } from '../../components/ui/Spinner'

const fmt = (v) => (v ? new Intl.NumberFormat('pt-MZ',{style:'currency',currency:'MZN',minimumFractionDigits:0}).format(v) : null)
const PAY = { MPESA:'M-Pesa', EMOLA:'e-Mola', CASH_ON_DELIVERY:'Dinheiro na entrega', POS:'POS' }

const DELIVERY_SECTIONS = [
  { key:'now', label:'Agora', desc:'Resumo imediato das recolhas e entregas em curso.' },
  { key:'pickup', label:'Recolher', desc:'Pedidos prontos para recolha na farmácia.' },
  { key:'route', label:'Em rota', desc:'Pedidos já recolhidos e a caminho do cliente.' },
  { key:'history', label:'Histórico', desc:'Entregas concluídas recentemente.' },
]
const VALID_DELIVERY_TABS = new Set(DELIVERY_SECTIONS.map(s => s.key))

function PinIcon(){return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}
function UserIcon(){return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>}
function MoneyIcon(){return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
function WhatsIcon(){return <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884"/></svg>}
function RouteIcon(){return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>}

function DeliveryCard({ order, onPickup, onDeliver, mapConfig }) {
  const isPreparation = order.status === 'IN_PREPARATION'
  const [geocoding, setGeocoding] = useState(false)

  const handleVerRota = async () => {
    const refLat = mapConfig?.lat ?? -25.965
    const refLng = mapConfig?.lng ?? 32.5699
    if (order.delivery_lat && order.delivery_lng) {
      window.open(`https://www.openstreetmap.org/directions?from=${refLat},${refLng}&to=${order.delivery_lat},${order.delivery_lng}`, '_blank')
      return
    }
    if (!order.delivery_address) return
    setGeocoding(true)
    const coords = await geocodeAddress(order.delivery_address)
    setGeocoding(false)
    if (coords) window.open(`https://www.openstreetmap.org/directions?from=${refLat},${refLng}&to=${coords.lat},${coords.lng}`, '_blank')
    else window.open(`https://www.openstreetmap.org/search?query=${encodeURIComponent(order.delivery_address)}`, '_blank')
  }

  return (
    <article className="dashboard-panel">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-base font-extrabold leading-tight text-slate-950">{order.medication_name_snapshot}</p>
          <div className="mt-2 grid gap-1.5 text-sm text-slate-500">
            <p className="flex items-center gap-2"><UserIcon /> {order.customer?.full_name || 'Cliente'}</p>
            <p className="flex items-start gap-2"><span className="mt-0.5"><PinIcon /></span><span>{order.delivery_address || 'Morada não definida'}</span></p>
            {order.payment_method === 'CASH_ON_DELIVERY' ? (
              <div className="rounded-2xl border border-orange-200 bg-orange-50 px-3 py-3">
                <div className="flex items-center gap-2 text-orange-700"><MoneyIcon /><span className="text-xs font-extrabold uppercase tracking-wider">Cobrar na entrega</span></div>
                <p className="mt-1 text-2xl font-extrabold text-orange-800">{fmt(order.total_price) || 'Valor pendente'}</p>
              </div>
            ) : (
              <p className="flex items-center gap-2"><MoneyIcon /> {PAY[order.payment_method] || order.payment_method} {order.total_price ? `· ${fmt(order.total_price)}` : ''}</p>
            )}
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-extrabold ${isPreparation ? 'bg-indigo-50 text-indigo-700' : 'bg-teal-50 text-teal-700'}`}>
          {isPreparation ? 'Para recolher' : 'Em rota'}
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <button onClick={handleVerRota} disabled={geocoding} className="btn-secondary w-full">
          <RouteIcon /> {geocoding ? 'A localizar...' : 'Ver rota'}
        </button>
        {order.customer?.whatsapp_number && (
          <a href={`https://wa.me/${order.customer.whatsapp_number.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="btn-secondary w-full text-green-700">
            <WhatsIcon /> WhatsApp
          </a>
        )}
        {isPreparation ? (
          <button onClick={() => onPickup(order.id)} className="btn-primary w-full">Confirmar recolha</button>
        ) : (
          <button onClick={() => onDeliver(order)} className="btn-primary w-full">Concluir entrega</button>
        )}
      </div>
    </article>
  )
}

function DeliveryQueue({ title, description, orders, emptyTitle, emptyText, mapConfig, onPickup, onDeliver }) {
  return (
    <section className="dashboard-panel">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-extrabold leading-tight text-slate-950">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-extrabold text-slate-500">{orders.length}</span>
      </div>
      {orders.length === 0 ? (
        <EmptyState title={emptyTitle} text={emptyText} compact />
      ) : (
        <div className="space-y-2.5">
          {orders.map(order => <DeliveryCard key={order.id} order={order} mapConfig={mapConfig} onPickup={onPickup} onDeliver={onDeliver} />)}
        </div>
      )}
    </section>
  )
}

export function MotoboyDashboard() {
  const notify = useNotificationStore()
  const [searchParams] = useSearchParams()
  const tab = VALID_DELIVERY_TABS.has(searchParams.get('tab')) ? searchParams.get('tab') : 'now'
  const activeSection = DELIVERY_SECTIONS.find(s => s.key === tab) || DELIVERY_SECTIONS[0]
  const [deliverModal, setDeliverModal] = useState(null)
  const [notes, setNotes] = useState('')

  const { data: active = [], isLoading } = useMyDeliveries()
  const { data: history = [] } = useDeliveryHistory()
  const { data: mapConfig } = useMapConfig()
  const pickupMutation = useConfirmPickup()
  const deliverMutation = useConfirmDelivery()

  const toPickup = active.filter(o => o.status === 'IN_PREPARATION')
  const inDelivery = active.filter(o => o.status === 'IN_DELIVERY')
  const totalToCollect = active.filter(o => o.payment_method === 'CASH_ON_DELIVERY').reduce((sum, o) => sum + Number(o.total_price || 0), 0)

  const handlePickup = async (orderId) => {
    try {
      await pickupMutation.mutateAsync(orderId)
      notify.success('Recolha confirmada. Pode iniciar a rota.')
    } catch (err) { notify.error(err.message) }
  }

  const handleDeliver = async () => {
    try {
      await deliverMutation.mutateAsync({ orderId: deliverModal.id, notes })
      notify.success('Entrega concluída.')
      setDeliverModal(null)
      setNotes('')
    } catch (err) { notify.error(err.message) }
  }

  const visibleActive = tab === 'pickup' ? toPickup : tab === 'route' ? inDelivery : active

  return (
    <div className="dashboard-page">
      <div className="mx-auto max-w-5xl space-y-3">
        <header className="dashboard-header">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="section-label mb-0.5">Painel do motoboy</p>
              <h1 className="text-2xl font-extrabold leading-tight text-slate-950">{activeSection.label}</h1>
              <p className="mt-0.5 max-w-2xl text-sm text-slate-500">{activeSection.desc}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center sm:w-[420px]">
              <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-2.5 py-2"><p className="text-lg font-extrabold leading-none text-indigo-700">{toPickup.length}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-indigo-600/75">recolher</p></div>
              <div className="rounded-xl border border-teal-100 bg-teal-50 px-2.5 py-2"><p className="text-lg font-extrabold leading-none text-teal-700">{inDelivery.length}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-teal-600/75">em rota</p></div>
              <div className="rounded-xl border border-orange-100 bg-orange-50 px-2.5 py-2"><p className="text-sm font-extrabold leading-none text-orange-700">{fmt(totalToCollect) || '0 MZN'}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-orange-600/75">a cobrar</p></div>
            </div>
          </div>
        </header>

        {isLoading ? (
          <main className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm md:p-5">
            <div className="space-y-2.5">{[1,2].map(i => <div key={i} className="skeleton h-40 rounded-2xl" />)}</div>
          </main>
        ) : tab === 'now' ? (
          <main className="grid gap-3 xl:grid-cols-2">
            <DeliveryQueue
              title="Recolher"
              description="Pedidos prontos para recolha antes de iniciar a rota."
              orders={toPickup}
              emptyTitle="Nada para recolher"
              emptyText="Novas recolhas aparecem aqui quando a operação confirmar o pedido."
              mapConfig={mapConfig}
              onPickup={handlePickup}
              onDeliver={(o) => { setDeliverModal(o); setNotes('') }}
            />
            <DeliveryQueue
              title="Em rota"
              description="Pedidos recolhidos e pendentes de entrega ao cliente."
              orders={inDelivery}
              emptyTitle="Sem entregas em rota"
              emptyText="Quando confirmares a recolha, o pedido passa para esta coluna."
              mapConfig={mapConfig}
              onPickup={handlePickup}
              onDeliver={(o) => { setDeliverModal(o); setNotes('') }}
            />
          </main>
        ) : tab === 'history' ? (
          <main className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm md:p-5">
            {history.length === 0 ? <EmptyState title="Sem histórico" text="As entregas concluídas aparecem aqui." /> : <div className="grid gap-2 xl:grid-cols-2">{history.slice(0, 12).map(order => <div key={order.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-extrabold text-slate-800">{order.medication_name_snapshot}</p><p className="truncate text-xs text-slate-400">{order.customer?.full_name || 'Cliente'} · {order.delivery_address || 'sem morada'}</p></div><span className="shrink-0 text-xs font-bold text-green-600">Entregue</span></div></div>)}</div>}
          </main>
        ) : (
          <main>
            <DeliveryQueue
              title={tab === 'pickup' ? 'Recolher' : 'Em rota'}
              description={tab === 'pickup' ? 'Pedidos prontos para recolha na farmácia.' : 'Pedidos já recolhidos e a caminho do cliente.'}
              orders={visibleActive}
              emptyTitle="Sem entregas nesta fila"
              emptyText="Quando a operação atribuir pedidos, eles aparecem aqui."
              mapConfig={mapConfig}
              onPickup={handlePickup}
              onDeliver={(o) => { setDeliverModal(o); setNotes('') }}
            />
          </main>
        )}
      </div>

      <Modal open={!!deliverModal} onClose={() => setDeliverModal(null)} title="Confirmar entrega">
        {deliverModal && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-teal-100 bg-teal-50 p-4">
              <p className="font-extrabold text-teal-900">{deliverModal.medication_name_snapshot}</p>
              <p className="mt-1 text-sm text-teal-700">Confirme que o cliente recebeu o pedido correctamente antes de concluir.</p>
            </div>
            <div>
              <label className="label">Notas da entrega <span className="font-normal text-slate-400">(opcional)</span></label>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="input resize-none" placeholder="Ex.: entregue ao cliente, entregue ao segurança..." />
            </div>
            <button onClick={handleDeliver} disabled={deliverMutation.isPending} className="btn-primary-lg w-full">
              {deliverMutation.isPending ? <><Spinner size="sm" /> A confirmar...</> : 'Concluir entrega'}
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}

function EmptyState({ title, text, compact = false }) {
  return (
    <div className={`rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center ${compact ? 'p-5' : 'p-8'}`}>
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm"><RouteIcon /></div>
      <p className="font-extrabold text-slate-700">{title}</p>
      <p className="mt-1 text-sm text-slate-400">{text}</p>
    </div>
  )
}
