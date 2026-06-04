/**
 * ThankYouPage — Página de confirmação após criação do pedido.
 *
 * Estratégia WhatsApp (Meta Cloud API — custo zero):
 *   O cliente inicia a conversa via wa.me ANTES de o operador enviar qualquer
 *   mensagem. Isso abre a janela gratuita de 24h da Meta, evitando custo por
 *   mensagem template iniciada pelo negócio.
 *
 * NÃO enviar tracking link automático aqui — o operador envia após confirmar
 * farmácia e preço (estado AWAITING_CLIENT).
 */

import { useSearchParams, Link } from 'react-router-dom'
import { useQuery }             from '@tanstack/react-query'
import { supabase }             from '../../lib/supabase'

function CheckIcon() {
  return (
    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
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

export function ThankYouPage() {
  const [params] = useSearchParams()
  const token    = params.get('token')
  const medName  = params.get('med') || 'o seu medicamento'

  // Buscar WhatsApp público e nome da plataforma do system_config
  const { data: cfg } = useQuery({
    queryKey: ['public-config-thankyou'],
    queryFn: async () => {
      const { data } = await supabase
        .from('system_config')
        .select('key, value')
        .in('key', ['whatsapp_number', 'platform_name', 'operation_name'])
      return Object.fromEntries((data || []).map(r => [r.key, r.value]))
    },
    staleTime: 5 * 60_000,
  })

  const platformName = cfg?.operation_name || cfg?.platform_name || 'MedGo'
  const waNumber     = cfg?.whatsapp_number || ''

  // Mensagem que o cliente vai enviar — abre janela gratuita de 24h
  const waMessage = waNumber
    ? `Olá ${platformName}! Acabei de fazer um pedido de *${medName}*. ` +
      (token ? `Referência: ${token}` : '')
    : ''

  const waLink = waNumber
    ? `https://wa.me/${waNumber.replace(/\D/g, '')}?text=${encodeURIComponent(waMessage)}`
    : null

  return (
    <div className="min-h-svh bg-gradient-to-b from-teal-50 to-white px-4 py-12">
      <div className="max-w-lg mx-auto space-y-6">

        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-3xl bg-teal-500 flex items-center justify-center mx-auto shadow-lg shadow-teal-200">
            <CheckIcon />
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

        {/* Próximos passos */}
        <div className="card p-5 space-y-3">
          <h2 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">O que acontece agora?</h2>
          <div className="space-y-3">
            {[
              {
                step: '1',
                title: 'Validação',
                desc:  'A equipa verifica a disponibilidade do medicamento na farmácia parceira.',
                tone:  'teal',
              },
              {
                step: '2',
                title: 'Confirmação de preço',
                desc:  'Receberá uma mensagem WhatsApp com o preço final para confirmar antes de pagar.',
                tone:  'slate',
              },
              {
                step: '3',
                title: 'Entrega',
                desc:  'Após confirmação, o motoboy parte para a entrega no endereço indicado.',
                tone:  'slate',
              },
            ].map(s => (
              <div key={s.step} className={`flex gap-3 p-3 rounded-xl border ${s.tone === 'teal' ? 'bg-teal-50 border-teal-200' : 'bg-slate-50 border-slate-100'}`}>
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

        {/* CTA WhatsApp — cliente inicia a conversa */}
        {waLink && (
          <div className="card p-5 space-y-3">
            <h2 className="font-extrabold text-slate-900 text-sm">Fique a par em tempo real</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Envie-nos uma mensagem agora para receber actualizações directamente no WhatsApp.
            </p>
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#1ebe5c] text-white font-semibold py-3 px-4 transition-colors"
            >
              <WhatsAppIcon />
              Falar com a {platformName}
            </a>
            <p className="text-xs text-center text-slate-400">
              Ao enviar a mensagem, a equipa consegue identificar o seu pedido automaticamente.
            </p>
          </div>
        )}

        {/* Links */}
        <div className="flex flex-col gap-3">
          <p className="text-center text-xs text-slate-400 leading-relaxed px-4">
            O link de acompanhamento será enviado pela equipa depois de confirmar farmácia, disponibilidade e valor final.
          </p>
          <Link to="/" className="btn-secondary text-center">
            Voltar ao início
          </Link>
        </div>

      </div>
    </div>
  )
}
