/**
 * ThankYouPage — Página de confirmação após criação do pedido.
 *
 * Fluxo com WhatsApp API:
 *   O cliente inicia a primeira mensagem via wa.me com a referência do pedido.
 *   Quando a API/webhook estiver ligada, essa conversa fica associada ao pedido
 *   e o operador consegue continuar o atendimento pelo painel.
 */

import { useSearchParams, Link } from 'react-router-dom'
import { useQuery }             from '@tanstack/react-query'
import { supabase }             from '../../lib/supabase'
import { getConfig, interpolate } from '../../services/notificationService'

function CheckIcon() {
  return (
    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"
        style={{
          strokeDasharray: 24,
          strokeDashoffset: 24,
          animation: 'checkDraw 0.5s 0.35s cubic-bezier(.65,0,.35,1) forwards',
        }}
      />
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884"/>
    </svg>
  )
}


const DEFAULT_PUBLIC_WHATSAPP = '258842017232'

function normalizePublicWhatsApp(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return DEFAULT_PUBLIC_WHATSAPP
  if (digits.startsWith('258')) return digits
  if (/^8[2-7]\d{7}$/.test(digits)) return `258${digits}`
  return digits
}

export function ThankYouPage() {
  const [params] = useSearchParams()
  const token    = params.get('token')
  const medName  = params.get('med') || 'o seu medicamento'

  // Config partilhada (mesmas chaves/templates usados pelo notificationService
  // do lado do operador — fonte única de verdade para mensagens WhatsApp).
  const { data: cfg } = useQuery({
    queryKey: ['public-config-thankyou'],
    queryFn: getConfig,
    staleTime: 5 * 60_000,
  })

  // Nome do cliente vem da própria reserva (RPC pública, só para complementar
  // o template — não é obrigatório para a página funcionar).
  const { data: orderInfo } = useQuery({
    queryKey: ['thankyou-order', token],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_order_by_token', { p_token: token })
      return data?.[0] || null
    },
    enabled: !!token,
    staleTime: 60_000,
  })

  const platformName = cfg?.platformName || 'MedGo'
  const rawWaNumber   = cfg?.platformPhone || import.meta.env.VITE_PUBLIC_WHATSAPP_NUMBER || DEFAULT_PUBLIC_WHATSAPP
  const waNumber      = normalizePublicWhatsApp(rawWaNumber)

  const trackingUrl = token && cfg?.trackingBaseUrl
    ? `${cfg.trackingBaseUrl.replace(/\/$/, '')}/acompanhar/${token}`
    : ''

  // Mensagem inicial enviada pelo cliente — usa o template configurado em
  // Configurações → Templates ("Pedido criado"). Se ainda não foi definido,
  // cai num texto-base para a página nunca ficar sem CTA funcional.
  const orderCreatedTemplate = cfg?.templates?.order_created
  const waMessage = orderCreatedTemplate
    ? interpolate(orderCreatedTemplate, {
        customer_name:   orderInfo?.customer_name || '',
        medication_name: medName,
        tracking_url:    trackingUrl,
        platform_name:   platformName,
        platform_phone:  rawWaNumber,
      })
    : `Olá ${platformName}! Acabei de fazer um pedido de *${medName}*. ` +
      (token ? `A referência do meu pedido é: ${token}. ` : '') +
      `Quero continuar o atendimento por aqui.`

  const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`

  return (
    <div className="min-h-svh bg-gradient-to-b from-teal-50 to-white px-4 py-12">
      <div className="max-w-lg mx-auto space-y-6">

        {/* Hero */}
        <div className="text-center space-y-4 animate-fade-up">
          <div className="relative w-20 h-20 mx-auto">
            <span className="absolute inset-0 rounded-3xl bg-teal-400 animate-ping" style={{ animationDuration: '1.8s', animationIterationCount: 2, opacity: 0.35 }} />
            <div className="relative w-20 h-20 rounded-3xl bg-teal-500 flex items-center justify-center mx-auto shadow-lg shadow-teal-200 animate-scale-in">
              <CheckIcon />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Pedido recebido!</h1>
            <p className="text-slate-500 mt-2 leading-relaxed">
              O seu pedido de <strong>{medName}</strong> foi criado com sucesso.
              A equipa da {platformName} vai validar a disponibilidade e entrar em contacto.
            </p>
          </div>
          {token && (
            <div className="inline-block rounded-2xl bg-slate-100 border border-slate-200 px-4 py-2">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Referência do pedido</p>
              <p className="font-mono font-bold text-slate-700 text-lg tracking-widest mt-0.5">{token}</p>
            </div>
          )}
        </div>

        {/* CTA WhatsApp — primeira mensagem do cliente */}
        <div className="card p-5 space-y-4 border-2 border-green-200 bg-[linear-gradient(180deg,#f0fdf4_0%,#ffffff_100%)] animate-fade-up" style={{ animationDelay: '120ms', animationFillMode: 'backwards' }}>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-green-600">Próximo passo obrigatório</p>
              <h2 className="mt-1 text-lg font-extrabold text-slate-950">Envie a primeira mensagem no WhatsApp</h2>
              <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                Toque no botão abaixo e envie a mensagem pré-preenchida. A conversa fica ligada a este pedido para o operador continuar o atendimento pela API.
              </p>
            </div>
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="wa-btn w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] text-white font-extrabold py-4 px-4 shadow-lg shadow-green-200/70"
            >
              <span className="wa-btn-icon"><WhatsAppIcon /></span>
              Abrir WhatsApp e enviar mensagem
            </a>
            <div className="rounded-2xl border border-green-200 bg-white/80 px-4 py-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Mensagem preparada</p>
              <p className="mt-1 text-sm text-slate-700 leading-relaxed">{waMessage}</p>
            </div>
        </div>

        {/* Próximos passos */}
        <div className="card p-5 space-y-3 animate-fade-up" style={{ animationDelay: '220ms', animationFillMode: 'backwards' }}>
          <h2 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">O que acontece agora?</h2>
          <div className="space-y-3">
            {[
              {
                step: '1',
                title: 'Pedido registado',
                desc:  'O pedido já entrou na fila do operador para validação.',
                tone:  'teal',
              },
              {
                step: '2',
                title: 'WhatsApp vinculado',
                desc:  'Depois da sua primeira mensagem, a conversa fica associada à referência do pedido.',
                tone:  'slate',
              },
              {
                step: '3',
                title: 'Confirmação e entrega',
                desc:  'O operador confirma disponibilidade, preço e avanço da entrega pelo WhatsApp.',
                tone:  'slate',
              },
            ].map((s, i) => (
              <div
                key={s.step}
                className={`flex gap-3 p-3 rounded-xl border transition-colors animate-fade-up ${s.tone === 'teal' ? 'bg-teal-50 border-teal-200' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'}`}
                style={{ animationDelay: `${300 + i * 90}ms`, animationFillMode: 'backwards' }}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${s.tone === 'teal' ? 'bg-teal-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {s.step}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{s.title}</p>
                  <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Links */}
        <div className="flex flex-col gap-3 animate-fade-up" style={{ animationDelay: '600ms', animationFillMode: 'backwards' }}>
          <p className="text-center text-xs text-slate-400 leading-relaxed px-4">
            As próximas actualizações, confirmação de preço e acompanhamento serão enviados no WhatsApp ligado a este pedido.
          </p>
          <Link to="/" className="btn-secondary text-center transition-transform hover:-translate-y-0.5">
            Voltar ao início
          </Link>
        </div>

      </div>
    </div>
  )
}
