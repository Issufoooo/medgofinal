import { useEffect }               from 'react'
import { useSearchParams, Link }   from 'react-router-dom'
import { useQuery }                from '@tanstack/react-query'
import { supabase }                from '../../lib/supabase'
import { getConfig, interpolate }  from '../../services/notificationService'

/* ── Icons ────────────────────────────────────────────────────── */
function CheckIcon() {
  return (
    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"
        style={{ strokeDasharray: 28, strokeDashoffset: 28,
          animation: 'checkDraw 0.5s 0.35s cubic-bezier(.65,0,.35,1) forwards' }} />
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
function ArrowRight() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3"/>
    </svg>
  )
}

/* ── Helpers ──────────────────────────────────────────────────── */
const DEFAULT_WA = '258842017232'
function normalizeWa(v) {
  const d = String(v || '').replace(/\D/g, '')
  if (!d) return DEFAULT_WA
  return d.startsWith('258') ? d : `258${d}`
}

const STEPS = [
  { n: '1', title: 'Pedido registado',      desc: 'O pedido entrou na fila do operador para validação.',                                   tone: 'teal'  },
  { n: '2', title: 'WhatsApp vinculado',    desc: 'Após a sua primeira mensagem, a conversa fica associada a este pedido.',               tone: 'slate' },
  { n: '3', title: 'Confirmação e entrega', desc: 'O operador confirma disponibilidade, preço e próximos passos pelo WhatsApp.',          tone: 'slate' },
]

/* ── Page ─────────────────────────────────────────────────────── */
export function ThankYouPage() {
  const [params] = useSearchParams()
  const token   = params.get('token')
  const medName = params.get('med') || 'o seu medicamento'

  // Scroll ao topo imediatamente ao montar
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [])

  const { data: cfg } = useQuery({
    queryKey: ['public-config-thankyou'],
    queryFn:  getConfig,
    staleTime: 5 * 60_000,
  })

  const { data: orderInfo } = useQuery({
    queryKey: ['thankyou-order', token],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_order_by_token', { p_token: token })
      return data?.[0] || null
    },
    enabled:  !!token,
    staleTime: 60_000,
  })

  const platformName = cfg?.platformName || 'MedGo'
  const waNumber     = normalizeWa(cfg?.platformPhone)
  const trackingUrl  = token && cfg?.trackingBaseUrl
    ? `${cfg.trackingBaseUrl.replace(/\/$/, '')}/acompanhar/${token}`
    : ''

  const tpl = cfg?.templates?.order_created
  const waMessage = tpl
    ? interpolate(tpl, {
        customer_name:   orderInfo?.customer_name || '',
        medication_name: medName,
        tracking_url:    trackingUrl,
        platform_name:   platformName,
        platform_phone:  cfg?.platformPhone || '',
      })
    : `Olá ${platformName}! Acabei de fazer um pedido de *${medName}*.` +
      (token ? ` Referência: ${token}.` : '') +
      ` Quero continuar o atendimento por aqui.`

  const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`

  return (
    <div className="min-h-svh bg-gradient-to-b from-teal-50 via-white to-white px-4 pt-8 pb-14">
      <div className="max-w-md mx-auto space-y-5">

        {/* ── Hero ───────────────────────────────────────────── */}
        <div className="text-center space-y-3 animate-fade-up">
          <div className="relative w-20 h-20 mx-auto">
            <span className="absolute inset-0 rounded-3xl bg-teal-400 opacity-25 animate-ping"
              style={{ animationDuration: '1.8s', animationIterationCount: 2 }} />
            <div className="relative w-20 h-20 rounded-3xl bg-teal-500 flex items-center justify-center shadow-lg shadow-teal-200">
              <CheckIcon />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Pedido recebido!</h1>
            <p className="text-slate-500 mt-1.5 leading-relaxed text-sm max-w-xs mx-auto">
              O seu pedido de <strong className="text-slate-700">{medName}</strong> foi criado.
              Confirme via WhatsApp para avançar.
            </p>
          </div>
          {token && (
            <div className="inline-flex flex-col items-center rounded-2xl bg-slate-100 border border-slate-200 px-4 py-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Referência</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="font-mono font-bold text-slate-700 text-lg tracking-widest">{token}</p>
                <button
                  onClick={() => { navigator.clipboard?.writeText(token); }}
                  title="Copiar referência"
                  className="p-1 text-slate-400 hover:text-teal-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── CTA WhatsApp — destaque máximo ─────────────────── */}
        <div
          className="animate-fade-up rounded-[1.4rem] overflow-hidden border-2 border-green-300"
          style={{ animationDelay: '80ms', animationFillMode: 'backwards',
            background: 'linear-gradient(145deg,#f0fdf4 0%,#dcfce7 40%,#ffffff 100%)',
            boxShadow: '0 8px 32px -6px rgba(34,197,94,0.20)' }}
        >
          <div className="px-5 pt-5 pb-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-green-700">Próximo passo obrigatório</p>
            </div>
            <h2 className="text-lg font-extrabold text-slate-950 leading-snug">
              Inicie a conversa no WhatsApp
            </h2>
            <p className="mt-1 text-sm text-slate-500 leading-relaxed">
              Toque no botão abaixo para abrir o WhatsApp com a mensagem já preenchida.
              A conversa fica vinculada ao seu pedido.
            </p>
          </div>
          <div className="p-4">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="group w-full inline-flex items-center justify-center gap-3 rounded-2xl text-white font-extrabold py-4 px-5 text-base transition-all duration-200 hover:scale-[1.01] hover:brightness-110 active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg,#25D366 0%,#1ebe5d 100%)',
                boxShadow: '0 6px 24px -4px rgba(37,211,102,0.45)' }}
            >
              <WhatsAppIcon />
              Abrir WhatsApp agora
              <ArrowRight />
            </a>
          </div>
        </div>

        {/* ── O que acontece agora ────────────────────────────── */}
        <div
          className="card p-5 space-y-3 animate-fade-up"
          style={{ animationDelay: '160ms', animationFillMode: 'backwards' }}
        >
          <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">O que acontece agora?</h2>
          <div className="space-y-2.5">
            {STEPS.map((s, i) => (
              <div
                key={s.n}
                className={`flex gap-3 p-3 rounded-xl border ${
                  s.tone === 'teal'
                    ? 'bg-teal-50 border-teal-200'
                    : 'bg-slate-50 border-slate-100'
                }`}
                style={{ animation: 'slideUp .3s cubic-bezier(.16,1,.3,1) backwards',
                  animationDelay: `${220 + i * 70}ms` }}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${
                  s.tone === 'teal' ? 'bg-teal-500 text-white' : 'bg-slate-200 text-slate-600'
                }`}>{s.n}</div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{s.title}</p>
                  <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Links secundários ────────────────────────────────── */}
        <div
          className="flex flex-col gap-2.5 animate-fade-up"
          style={{ animationDelay: '380ms', animationFillMode: 'backwards' }}
        >
          {token && (
            <Link to={`/acompanhar/${token}`}
              className="btn-secondary text-center hover:-translate-y-0.5 transition-transform">
              Acompanhar pedido
            </Link>
          )}
          <Link to="/" className="text-center text-sm text-slate-400 hover:text-slate-600 transition-colors py-1">
            Voltar ao início
          </Link>
        </div>

      </div>
    </div>
  )
}
