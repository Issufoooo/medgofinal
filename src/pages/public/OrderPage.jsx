import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { DeliveryMap } from '../../components/public/DeliveryMap'
import { PrescriptionUpload } from '../../components/public/PrescriptionUpload'
import { CategoryBadge } from '../../components/ui/Badge'
import { Alert } from '../../components/ui/Alert'
import { Spinner } from '../../components/ui/Spinner'
import { upsertCustomer } from '../../services/customerService'
import { uploadPrescription } from '../../services/prescriptionService'
import { auditLog } from '../../services/auditService'
import { getPricingConfig, calculatePrices } from '../../services/priceService'
import { PAYMENT_METHOD, ORDER_STATUS } from '../../lib/constants'
import { useMapConfig } from '../../hooks/useMapConfig'
import { useZonesWithDistance } from '../../hooks/useZones'

const PAYMENT_OPTIONS = [
  { value: PAYMENT_METHOD.CASH_ON_DELIVERY, label: 'Dinheiro na entrega', desc: 'O pagamento é feito no momento da entrega.' },
  { value: PAYMENT_METHOD.MPESA,            label: 'M-Pesa',              desc: 'Pagamento móvel através do M-Pesa.' },
  { value: PAYMENT_METHOD.EMOLA,            label: 'e-Mola',              desc: 'Pagamento móvel através do e-Mola.' },
]

const fmt = (v) =>
  new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN', minimumFractionDigits: 0 }).format(v || 0)

function Field({ label, required, error, hint, children }) {
  return (
    <div>
      <label className="label">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="label-hint">{hint}</p>}
      {error && (
        <p className="field-error">
          <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
          {error}
        </p>
      )}
    </div>
  )
}

function PillIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
}

export function OrderPage() {
  const { medicationId } = useParams()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    fullName: '',
    whatsapp: '',
    addressDetail: '',
    paymentMethod: PAYMENT_METHOD.CASH_ON_DELIVERY,
  })
  const [mapLocation, setMapLocation] = useState(null)
  const [prescriptionFile, setPrescriptionFile] = useState(null)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [pricingConfig, setPricingConfig] = useState({ markupPercent: 0, codFeePercent: 0 })
  // Anti-spam: honeypot (bots fill it, humans do not) + rate limit
  const [honeypot, setHoneypot] = useState('')
  const lastSubmitRef = useRef(0)
  const SUBMIT_COOLDOWN_MS = 8000

  useEffect(() => {
    getPricingConfig().then(setPricingConfig).catch(() => {})
  }, [])

  const { data: mapConfig } = useMapConfig()
  const { data: zones = [] } = useZonesWithDistance()

  const { data: medication, isLoading, isError } = useQuery({
    queryKey: ['medication', medicationId],
    queryFn: async () => {
      const { data, error } = await supabase.from('medications').select('*').eq('id', medicationId).eq('is_visible', true).single()
      if (error) throw error
      return data
    },
  })

  const set = (field, val) => {
    setForm((f) => ({ ...f, [field]: val }))
    setErrors((e) => ({ ...e, [field]: '' }))
  }

  const handleLocationSelect = useCallback((loc) => {
    setMapLocation(loc)
    setErrors((e) => ({ ...e, mapLocation: '' }))
  }, [])

  const validate = () => {
    const e = {}
    if (!form.fullName.trim()) e.fullName = 'Campo obrigatório'
    if (!form.whatsapp.trim()) e.whatsapp = 'Campo obrigatório'
    else if (!/^[\d\s+\-()]{8,}$/.test(form.whatsapp)) e.whatsapp = 'Número inválido'
    if (!mapLocation) e.mapLocation = 'Indique a localização de entrega no mapa'
    else if (!mapLocation.zone) e.mapLocation = 'A localização está fora da área de cobertura'
    if ((medication?.requires_prescription || medication?.category === 'RESTRICTED_MONITORED') && !prescriptionFile) {
      e.prescription = medication?.category === 'RESTRICTED_MONITORED'
        ? 'Anexe a documentação necessária para avaliação'
        : 'A receita médica é obrigatória'
    }
    return e
  }

  const handleSubmit = async (evt) => {
    evt.preventDefault()
    // Honeypot: bots fill the hidden field, humans leave it empty
    if (honeypot) return
    // Rate limit: prevent double-submit or rapid resubmission
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    const now = Date.now()
    if (now - lastSubmitRef.current < SUBMIT_COOLDOWN_MS) {
      setSubmitError(`Por favor aguarde alguns segundos antes de tentar novamente.`)
      return
    }
    lastSubmitRef.current = now
    setSubmitting(true); setSubmitError('')
    try {
      const fullAddress = [mapLocation.address, form.addressDetail].filter(Boolean).join(' — ')
      const { customer } = await upsertCustomer({
        fullName: form.fullName,
        whatsappNumber: form.whatsapp,
        addressNotes: fullAddress,
        zoneId: mapLocation.zone?.id,
        lastKnownLat: mapLocation.lat || null,
        lastKnownLng: mapLocation.lng || null,
      })
      const isRestrictedMed = medication.category === 'RESTRICTED_MONITORED'
      const needsRx = medication.requires_prescription || isRestrictedMed
      const initialStatus = needsRx ? ORDER_STATUS.PRESCRIPTION_PENDING : ORDER_STATUS.IN_VALIDATION
      const { data: order, error: orderErr } = await supabase.from('orders').insert({
        customer_id: customer.id,
        medication_id: medicationId,
        medication_name_snapshot: medication.commercial_name,
        zone_id: mapLocation.zone?.id || null,
        delivery_address: fullAddress,
        delivery_fee: mapLocation.zone?.delivery_fee ?? 0,
        delivery_lat: mapLocation.lat,
        delivery_lng: mapLocation.lng,
        delivery_distance_km: mapLocation.distanceKm,
        payment_method: form.paymentMethod,
        status: initialStatus,
        customer_notes: form.addressDetail || null,
        prescription_status: needsRx ? 'PENDING' : null,
      }).select().single()
      if (orderErr) throw orderErr
      await supabase.from('order_status_history').insert({ order_id: order.id, from_status: null, to_status: initialStatus, notes: 'Pedido criado pelo cliente' })

      // Upload receita — rollback do pedido se falhar (evitar pedido aberto sem receita)
      if (prescriptionFile && needsRx) {
        try {
          await uploadPrescription(order.id, prescriptionFile)
        } catch (uploadErr) {
          await supabase.from('orders').update({
            status: ORDER_STATUS.CANCELLED,
            cancellation_reason: 'Falha no upload da receita — pedido cancelado automaticamente.',
          }).eq('id', order.id)
          await supabase.from('order_status_history').insert({
            order_id: order.id, from_status: initialStatus,
            to_status: ORDER_STATUS.CANCELLED, notes: 'Cancelado: falha no envio da receita.',
          })
          throw new Error(
            'Não foi possível enviar a receita médica. O pedido foi cancelado. ' +
            'Por favor tente novamente. (' + (uploadErr?.message || 'erro de upload') + ')'
          )
        }
      }

      await auditLog({ action: 'ORDER_CREATED', entityType: 'order', entityId: order.id, metadata: { medicationId, zoneId: mapLocation.zone?.id, distanceKm: mapLocation.distanceKm, needsRx } })
      // Não enviamos WhatsApp automático aqui.
      // Estratégia oficial: o cliente inicia a conversa primeiro na ThankYouPage,
      // reduzindo custo e evitando enviar tracking/pagamento antes da confirmação operacional.
      navigate('/obrigado?token=' + order.tracking_token)
    } catch (err) {
      const message = err?.message || 'Ocorreu um erro ao enviar o pedido. Por favor tente novamente.'
      const friendlyMessage = /row-level security|violates row-level|permission denied|policy/i.test(message)
        ? 'Não foi possível registar o pedido por causa das permissões da base de dados. Aplica o patch SQL de produção e tenta novamente.'
        : message
      setSubmitError(friendlyMessage)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading) return <div className="flex justify-center py-24"><Spinner size="xl" /></div>

  if (isError || !medication) {
    return (
      <div className="page-wrap-sm py-16 text-center">
        <div className="w-20 h-20 rounded-[1.75rem] bg-slate-100 flex items-center justify-center mx-auto mb-4"><PillIcon /></div>
        <p className="text-slate-500 mb-6">Medicamento não encontrado ou indisponível.</p>
        <Link to="/medicamentos" className="btn-primary inline-flex">Ver medicamentos</Link>
      </div>
    )
  }

  const isRestricted = medication.category === 'RESTRICTED_MONITORED'
  const submitLabel = isRestricted ? 'Solicitar avaliação acompanhada' : 'Enviar pedido'

  const deliveryFee = mapLocation?.zone?.delivery_fee ?? 0
  const hasCodFee = form.paymentMethod === PAYMENT_METHOD.CASH_ON_DELIVERY && pricingConfig.codFeePercent > 0

  return (
    <div className="min-h-[82svh] bg-[linear-gradient(180deg,#f8fffe_0%,#ffffff_28%,#ffffff_100%)]">
      <div className="page-wrap-sm py-8 pb-safe">
        <Link to="/medicamentos" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 mb-6 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Medicamentos
        </Link>
        <div className="mb-8">
          <p className="section-label mb-2">{isRestricted ? 'Solicitação especial' : 'Pedido'}</p>
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight mb-2">
            {isRestricted ? 'Solicitação acompanhada' : 'Solicitar medicamento'}
          </h1>
          <p className="text-slate-500 text-sm md:text-base max-w-xl leading-relaxed">
            {isRestricted
              ? 'Este medicamento exige avaliação especial antes de ser dispensado. Preencha os dados e a equipa acompanha o processo com a documentação necessária.'
              : 'Preencha os seus dados e indique a morada no mapa. A taxa de entrega é calculada automaticamente pela distância.'}
          </p>
        </div>

        {/* Restricted banner */}
        {isRestricted && (
          <Alert type="warning" className="mb-6">
            <strong>Medicamento de venda restrita.</strong> Este pedido requer análise e aprovação antes de avançar.
            A equipa MedGo entrará em contacto para confirmar a documentação necessária.
            O processo pode demorar mais do que um pedido normal.
          </Alert>
        )}

        {submitError && <Alert type="error" className="mb-6">{submitError}</Alert>}
        <form onSubmit={handleSubmit} noValidate className="space-y-8">
          {/* Honeypot — hidden from humans, bots fill it automatically */}
          <div aria-hidden="true" style={{ display: 'none', visibility: 'hidden', position: 'absolute', left: '-9999px' }}>
            <label htmlFor="phone_confirm">Confirmar telefone (não preencher)</label>
            <input id="phone_confirm" name="phone_confirm" type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={e => setHoneypot(e.target.value)} />
          </div>
          {/* Medication */}
          <div className={`card-lg p-5 md:p-6 border ${isRestricted ? 'border-orange-200 bg-orange-50/30' : 'border-teal-100 bg-[linear-gradient(180deg,#f4fffd_0%,#ffffff_100%)]'}`}>
            <p className={`text-xs font-extrabold uppercase tracking-widest mb-3 ${isRestricted ? 'text-orange-600' : 'text-teal-600'}`}>
              {isRestricted ? 'Medicamento restrito solicitado' : 'Medicamento solicitado'}
            </p>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-extrabold text-slate-950 text-lg leading-tight">{medication.commercial_name}</h3>
                {medication.generic_name && <p className="text-sm text-slate-500 mt-1">{medication.generic_name}</p>}
                <div className="flex flex-wrap gap-2 mt-3">
                  <CategoryBadge category={medication.category} />
                  {medication.dosage && <span className="badge bg-slate-100 text-slate-600">{medication.dosage}</span>}
                </div>
              </div>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isRestricted ? 'bg-orange-100 text-orange-700' : 'bg-teal-100 text-teal-700'}`}><PillIcon /></div>
            </div>
          </div>

          {/* Prescription */}
          {(medication.requires_prescription || isRestricted) && (
            <section className="space-y-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-950">
                  {isRestricted ? 'Documentação necessária' : 'Receita médica'}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {isRestricted
                    ? 'Envie a receita médica e qualquer outro documento relevante para análise pela equipa.'
                    : 'Este medicamento exige receita médica válida. Anexe o documento antes de continuar.'}
                </p>
              </div>
              <PrescriptionUpload onChange={setPrescriptionFile} />
              {errors.prescription && <p className="field-error">{errors.prescription}</p>}
            </section>
          )}

          {/* Personal data */}
          <section className="space-y-4">
            <h2 className="text-base font-extrabold text-slate-950">Os seus dados</h2>
            <Field label="Nome completo" required error={errors.fullName}>
              <input type="text" className="input" placeholder="O seu nome completo" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} autoComplete="name" />
            </Field>
            <Field label="Número de WhatsApp" required error={errors.whatsapp} hint="Usaremos este número para confirmar o pedido.">
              <input type="tel" className="input" placeholder="+258 8X XXX XXXX" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} autoComplete="tel" inputMode="tel" />
            </Field>
          </section>

          {/* Delivery map */}
          <section className="space-y-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-950">Localização de entrega</h2>
              <p className="text-sm text-slate-500 mt-1">Clique no mapa ou pesquise o endereço. A taxa é calculada automaticamente pela distância à sede.</p>
            </div>
            {mapConfig ? (
              <DeliveryMap referencePoint={mapConfig} zones={zones} onLocationSelect={handleLocationSelect} />
            ) : (
              <div className="skeleton h-48 rounded-2xl" />
            )}
            {errors.mapLocation && <p className="field-error">{errors.mapLocation}</p>}
            {mapLocation?.zone && (
              <Field label="Detalhe adicional de morada">
                <textarea rows={2} className="input resize-none" placeholder="Portão azul, 2.º andar, perto de Y... (opcional)" value={form.addressDetail} onChange={(e) => set('addressDetail', e.target.value)} />
              </Field>
            )}
          </section>

          {/* Payment */}
          <section className="space-y-3">
            <h2 className="text-base font-extrabold text-slate-950">Forma de pagamento</h2>
            {PAYMENT_OPTIONS.map((opt) => {
              const isSelected = form.paymentMethod === opt.value
              const showCodWarning = opt.value === 'CASH_ON_DELIVERY' && pricingConfig.codFeePercent > 0
              return (
                <label key={opt.value} className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${isSelected ? 'border-teal-500 bg-teal-50/40' : 'border-slate-200 hover:border-teal-200 hover:bg-slate-50'}`}>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-teal-500' : 'border-slate-300'}`}>
                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 text-sm">{opt.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                    {showCodWarning && (
                      <p className="text-xs text-amber-600 font-medium mt-0.5">
                        Pode incluir taxa adicional de {pricingConfig.codFeePercent}% quando o preço final for confirmado.
                      </p>
                    )}
                  </div>
                  <input type="radio" name="payment" value={opt.value} checked={isSelected} onChange={() => set('paymentMethod', opt.value)} className="sr-only" />
                </label>
              )
            })}
          </section>

          {/* Summary */}
          {mapLocation?.zone && (
            <div className="card p-5 bg-slate-50 border border-slate-200">
              <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-3">Resumo do pedido</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600"><span>Medicamento</span><span className="font-semibold text-slate-800">{medication.commercial_name}</span></div>
                <div className="flex justify-between text-slate-600"><span>Zona</span><span className="font-semibold text-slate-800">{mapLocation.zone.name}</span></div>
                <div className="flex justify-between text-slate-600"><span>Distância</span><span className="font-semibold text-slate-800">{mapLocation.distanceKm?.toFixed(1)} km</span></div>
                <div className="flex justify-between text-slate-600"><span>Taxa de entrega</span><span className="font-semibold text-slate-800">{fmt(deliveryFee)}</span></div>
                {hasCodFee && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700">
                    <p className="text-xs font-bold">Pagamento na entrega</p>
                    <p className="text-xs leading-relaxed mt-0.5">Pode ter taxa adicional de {pricingConfig.codFeePercent}% sobre o valor confirmado do produto. O total será apresentado antes de avançar.</p>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-2 flex justify-between">
                  <span className="font-semibold text-slate-700">Preço do medicamento</span>
                  <span className="text-xs text-slate-400 italic">Confirmado pela equipa após verificação</span>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !mapLocation?.zone}
            className={`ship-submit-btn w-full ${isRestricted ? 'ship-submit-btn--restricted' : ''} ${submitting ? 'is-submitting' : ''}`}
            aria-busy={submitting}
          >
            <span className="ship-submit-btn__content">
              <span className="ship-submit-btn__icon" aria-hidden="true">
                <span className="ship-submit-btn__route" />
                <span className="ship-submit-btn__parcel" />
                <span className="ship-submit-btn__van">
                  <span className="ship-submit-btn__van-cabin" />
                  <span className="ship-submit-btn__van-window" />
                  <span className="ship-submit-btn__van-wheel ship-submit-btn__van-wheel--a" />
                  <span className="ship-submit-btn__van-wheel ship-submit-btn__van-wheel--b" />
                </span>
                <span className="ship-submit-btn__check">✓</span>
              </span>
              <span className="ship-submit-btn__text">
                <span className="ship-submit-btn__label">
                  {submitting ? 'A registar pedido' : submitLabel}
                </span>
                <span className="ship-submit-btn__hint">
                  {submitting ? 'Só demora alguns segundos' : mapLocation?.zone ? 'Confirmar dados e enviar' : 'Seleccione uma zona no mapa'}
                </span>
              </span>
            </span>
          </button>
          <p className="text-xs text-center text-slate-400 leading-relaxed">
            {isRestricted
              ? 'Ao enviar, confirma que os dados são correctos. A equipa analisará o pedido e entrará em contacto por WhatsApp.'
              : 'Ao enviar, confirma que os dados estão correctos. A equipa contacta-o por WhatsApp para confirmar disponibilidade e os próximos passos.'}
          </p>
        </form>
      </div>
    </div>
  )

}
