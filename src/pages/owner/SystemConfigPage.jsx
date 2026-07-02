import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useNotificationStore } from '../../store/notificationStore'
import { Alert } from '../../components/ui/Alert'
import { Spinner } from '../../components/ui/Spinner'
import { invalidatePricingCache } from '../../services/priceService'

// ── Chaves de template — devem coincidir exactamente com notificationService.js
// Variáveis: {{customer_name}} {{medication_name}} {{tracking_url}}
//            {{total_price}} {{medication_price}} {{delivery_fee}}
//            {{platform_name}} {{cancellation_reason}}
const TEMPLATE_DEFS = [
  {
    key: 'wa_tpl_order_created',
    label: 'Mensagem inicial do cliente',
    trigger: 'Pré-preenchida na página de agradecimento. O cliente envia esta mensagem para iniciar a conversa e vincular o pedido.',
    variables: ['{{customer_name}}', '{{medication_name}}', '{{tracking_url}}', '{{platform_name}}'],
    default: 'Olá {{platform_name}}! Acabei de fazer um pedido de *{{medication_name}}*. Quero continuar o atendimento por aqui.\n\nAcompanhar: {{tracking_url}}',
    isPublic: true,
  },
  {
    key: 'wa_tpl_price_confirmation',
    label: 'Confirmação de preço',
    trigger: 'Enviado automaticamente quando o operador confirma farmácia e preço.',
    variables: ['{{customer_name}}', '{{medication_name}}', '{{total_price}}', '{{medication_price}}', '{{delivery_fee}}', '{{tracking_url}}'],
    default: 'Olá {{customer_name}}! 💊\n\nO preço do seu pedido de *{{medication_name}}* foi confirmado:\n\n💰 Medicamento: *{{medication_price}}*\n🚚 Entrega: *{{delivery_fee}}*\n✅ Total: *{{total_price}}*\n\nPara confirmar, responda *SIM*. Para cancelar, responda *NÃO*.\n\nAcompanhe aqui: {{tracking_url}}\n\n— {{platform_name}}',
  },
  {
    key: 'wa_tpl_order_dispatched',
    label: 'Pedido despachado',
    trigger: 'Enviado automaticamente quando o motoboy confirma recolha e parte para entrega.',
    variables: ['{{customer_name}}', '{{medication_name}}', '{{tracking_url}}', '{{platform_name}}'],
    default: 'Olá {{customer_name}}! 🛵\n\nO seu pedido de *{{medication_name}}* está a caminho!\n\nO nosso motoboy está a dirigir-se à sua morada. Fique disponível.\n\nAcompanhe: {{tracking_url}}\n\n— {{platform_name}}',
  },
  {
    key: 'wa_tpl_order_delivered',
    label: 'Entrega concluída',
    trigger: 'Enviado automaticamente quando o motoboy confirma a entrega.',
    variables: ['{{customer_name}}', '{{medication_name}}', '{{platform_name}}'],
    default: 'Olá {{customer_name}}! ✅\n\nO seu pedido de *{{medication_name}}* foi entregue com sucesso.\n\nObrigado por confiar na {{platform_name}}! Qualquer questão, estamos à disposição.',
  },
  {
    key: 'wa_tpl_order_cancelled',
    label: 'Pedido cancelado',
    trigger: 'Enviado automaticamente quando um pedido é cancelado.',
    variables: ['{{customer_name}}', '{{medication_name}}', '{{cancellation_reason}}', '{{platform_name}}'],
    default: 'Olá {{customer_name}}.\n\nLamentamos informar que o seu pedido de *{{medication_name}}* foi cancelado.\n\nMotivo: {{cancellation_reason}}\n\nPara qualquer questão, contacte-nos. Estamos aqui para ajudar.\n\n— {{platform_name}}',
  },
]

const SYSTEM_FIELDS = [
  { key: 'whatsapp_number',  label: 'Número WhatsApp da operação', placeholder: '258840000000', type: 'tel',  hint: 'Número que os clientes contactam. Formato: 258840000000 (sem espaços ou +).' },
  { key: 'operation_name',   label: 'Nome da operação',             placeholder: 'MedGo',        type: 'text', hint: 'Nome usado em todas as mensagens automáticas ao cliente.' },
  { key: 'tracking_base_url',label: 'URL base de tracking',         placeholder: 'https://www.medgo-mz.app', type: 'url', hint: 'URL público do site — usado para gerar links de acompanhamento de pedidos.' },
  { key: 'wa_auto_reply',    label: 'Resposta automática de recepção', placeholder: 'Olá 👋 Recebemos a tua mensagem...', type: 'textarea', hint: 'Mensagem enviada automaticamente quando um cliente envia qualquer mensagem. Editável sem re-deploy.' },
]

const PRICING_FIELDS = [
  {
    key: 'platform_markup_percent',
    label: 'Margem da plataforma (%)',
    placeholder: '0',
    type: 'number',
    hint: 'Percentagem adicionada ao preço da farmácia. Ex: 15 = +15% sobre o preço da farmácia. Use 0 para sem margem.',
  },
  {
    key: 'cash_on_delivery_fee_percent',
    label: 'Taxa de pagamento na entrega (%)',
    placeholder: '0',
    type: 'number',
    hint: 'Taxa extra aplicada quando o cliente paga em dinheiro. Ex: 13 = +13% sobre o total. Use 0 para sem taxa.',
  },
  {
    key: 'low_stock_threshold',
    label: 'Limiar de stock baixo (unidades)',
    placeholder: '5',
    type: 'number',
    hint: 'Stock abaixo deste valor é marcado como "Stock baixo" no inventário.',
  },
]

const MAP_FIELDS = [
  { key: 'map_reference_lat',   label: 'Latitude da sede',            placeholder: '-25.9650', type: 'text', hint: 'Latitude do ponto de referência central (ex: -25.9650).' },
  { key: 'map_reference_lng',   label: 'Longitude da sede',           placeholder: '32.5699',  type: 'text', hint: 'Longitude do ponto de referência central (ex: 32.5699).' },
  { key: 'map_reference_label', label: 'Nome do ponto de referência', placeholder: 'MedGo HQ', type: 'text', hint: 'Nome exibido no mapa junto ao marcador da sede.' },
]

const PAYMENT_PROVIDERS = [
  { value: '',           label: 'Sem gateway (manual)' },
  { value: 'debitopay',  label: 'Débito Pay (M-Pesa/e-Mola)' },
  { value: 'mpesa_api',  label: 'M-Pesa API directa (Vodacom MZ)' },
  { value: 'emola_api',  label: 'e-Mola API directa' },
  { value: 'paydunya',   label: 'PayDunya' },
]

const PAYMENT_FIELDS = [
  { key: 'payment_gateway_merchant_code', label: 'Merchant ID',             placeholder: '844d4ae3-...', type: 'text',     hint: 'Identificador público do comerciante. As chaves secretas ficam nos Supabase Secrets.' },
  { key: 'payment_gateway_wallet_id',      label: 'Wallet ID',               placeholder: '52539',        type: 'text',     hint: 'Carteira Débito Pay usada para receber cobranças.' },
  { key: 'payment_gateway_webhook_secret', label: 'Webhook Secret',          placeholder: '••••••••••••', type: 'password', hint: 'Opcional. Use apenas se configurar validação de webhook no gateway.' },
]

function TemplateEditor({ def, value, onChange }) {
  const [expanded, setExpanded] = useState(false)
  const current = value || def.default

  return (
    <div className="card p-5">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start justify-between gap-3 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-extrabold text-slate-900 text-sm">{def.label}</p>
            {value && value !== def.default && (
              <span className="text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 px-1.5 py-0.5 rounded-full">Personalizado</span>
            )}
          </div>
          <p className="text-xs text-slate-500">{def.trigger}</p>
        </div>
        <svg className={`w-4 h-4 text-slate-400 transition-transform shrink-0 mt-0.5 ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {expanded && (
        <div className="mt-4 space-y-3 animate-fade-in">
          <div className="flex flex-wrap gap-1.5">
            {def.variables.map(v => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  // Insert at end of textarea (simplified)
                  onChange(current + v)
                }}
                title="Clique para inserir"
                className="font-mono text-[11px] bg-slate-50 border border-slate-200 text-slate-600 px-2 py-1 rounded-lg hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 transition-colors"
              >
                {v}
              </button>
            ))}
          </div>
          <textarea
            rows={5}
            value={current}
            onChange={e => onChange(e.target.value)}
            className="input resize-none font-mono text-xs leading-relaxed"
          />
          {value && value !== def.default && (
            <button
              type="button"
              onClick={() => onChange(def.default)}
              className="text-xs text-slate-400 hover:text-slate-700 font-medium transition-colors"
            >
              ↩ Restaurar template original
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function SystemConfigPage() {
  const notify = useNotificationStore()
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [localConfig, setLocalConfig] = useState({})
  const [dirty, setDirty] = useState(false)

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['system-config'],
    queryFn: async () => {
      const { data, error } = await supabase.from('system_config').select('key,value')
      if (error) throw error
      return data || []
    },
    onSuccess: (data) => {
      const map = {}
      data.forEach(row => { map[row.key] = row.value })
      setLocalConfig(map)
    },
  })

  const configMap = { ...configs.reduce((acc, r) => { acc[r.key] = r.value; return acc }, {}), ...localConfig }

  const setVal = (key, value) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const upserts = Object.entries(localConfig).map(([key, value]) => ({ key, value }))
      if (upserts.length === 0) { notify.info('Sem alterações para guardar.'); return }

      const { error } = await supabase.from('system_config').upsert(upserts, { onConflict: 'key' })
      if (error) throw error

      notify.success('Configurações guardadas com sucesso.')
      invalidatePricingCache()
      setDirty(false)
      qc.invalidateQueries({ queryKey: ['system-config'] })
    } catch (err) {
      notify.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 pb-10 space-y-6">

      {/* Header */}
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(155deg,#0d9488_0%,#0f766e_25%,#0a192f_100%)] px-6 py-7 text-white shadow-lg">
        <div className="absolute inset-0 dot-pattern opacity-60" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-white/70">Sistema</p>
            <h1 className="mt-2 text-2xl font-extrabold">Configurações</h1>
            <p className="mt-1.5 text-sm text-white/70">
              Parâmetros da plataforma, número WhatsApp e templates de mensagens.
            </p>
          </div>
          {dirty && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl bg-white/15 border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/25 transition-colors backdrop-blur-sm shrink-0"
            >
              {saving ? <Spinner size="sm" color="white" /> : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                </svg>
              )}
              Guardar alterações
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (
        <>
          {/* System parameters */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 mb-1">Parâmetros do sistema</h2>
              <p className="text-sm text-slate-500">Contactos, URLs e identificação da operação.</p>
            </div>

            <div className="card p-5 space-y-4">
              {SYSTEM_FIELDS.map(field => (
                <div key={field.key}>
                  <label className="label">{field.label}</label>
                  {field.type === 'textarea' ? (
                    <textarea
                      rows={3}
                      value={configMap[field.key] || ''}
                      onChange={e => setVal(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="input resize-none"
                    />
                  ) : (
                    <input
                      type={field.type}
                      value={configMap[field.key] || ''}
                      onChange={e => setVal(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="input"
                    />
                  )}
                  <p className="label-hint">{field.hint}</p>
                </div>
              ))}
            </div>
          </div>

          {/* WhatsApp integration */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 mb-1">Integração WhatsApp</h2>
              <p className="text-sm text-slate-500">Estado da integração e como funciona sem API.</p>
            </div>

            <div className="card p-5">
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                <strong>Nota de segurança:</strong> campos de API servem para preparar a integração. Em produção, tokens sensíveis devem ficar em ambiente seguro/backend, não expostos ao frontend.
              </div>
              <div className="flex items-start gap-3">
                <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${configMap['whatsapp_enabled'] === 'true' ? 'bg-teal-500' : 'bg-amber-400'}`} />
                <div>
                  <p className="font-semibold text-slate-900 text-sm">
                    {configMap['whatsapp_enabled'] === 'true' ? 'Envio automático activo' : 'Modo manual (links WhatsApp)'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {configMap['whatsapp_enabled'] === 'true'
                      ? 'Mensagens enviadas automaticamente pela Edge Function (Meta Cloud API) nas etapas configuradas.'
                      : 'Os operadores usam os botões de link WhatsApp. Nenhuma mensagem é enviada automaticamente.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Preços e margens */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 mb-1">Preços e margens</h2>
              <p className="text-sm text-slate-500">
                Define a margem da plataforma sobre o preço da farmácia e a taxa extra para pagamento na entrega.
                Estes valores são aplicados automaticamente no cálculo do total ao cliente.
              </p>
            </div>
            <div className="card p-5 space-y-4">
              {(parseFloat(configMap['platform_markup_percent'] || 0) > 0 || parseFloat(configMap['cash_on_delivery_fee_percent'] || 0) > 0) && (
                <div className="rounded-xl bg-teal-50 border border-teal-200 p-4 space-y-1.5">
                  <p className="text-xs font-extrabold text-teal-700 uppercase tracking-widest mb-2">
                    Exemplo com medicamento de 100 MZN + entrega 150 MZN
                  </p>
                  {(() => {
                    const markup = parseFloat(configMap['platform_markup_percent'] || 0)
                    const cod = parseFloat(configMap['cash_on_delivery_fee_percent'] || 0)
                    const med = 100 * (1 + markup / 100)
                    const total = med + 150
                    const totalCod = total * (1 + cod / 100)
                    return (
                      <div className="text-sm text-teal-900 space-y-1">
                        <p>Farmácia: 100 MZN + margem {markup}% = <strong>{med.toFixed(0)} MZN</strong></p>
                        <p>Total pagamento online: {med.toFixed(0)} + 150 = <strong>{total.toFixed(0)} MZN</strong></p>
                        {cod > 0 && <p>Total dinheiro na entrega: {total.toFixed(0)} + {cod}% = <strong>{totalCod.toFixed(0)} MZN</strong></p>}
                      </div>
                    )
                  })()}
                </div>
              )}
              {PRICING_FIELDS.map(field => (
                <div key={field.key}>
                  <label className="label">{field.label}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={configMap[field.key] || ''}
                    onChange={e => setVal(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="input"
                  />
                  <p className="label-hint">{field.hint}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Map reference point */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 mb-1">Ponto de referência do mapa</h2>
              <p className="text-sm text-slate-500">
                Coordenadas da sede MedGo — usadas para calcular distâncias e taxas de entrega automaticamente.
                Pode também arrastar o marcador directamente na página de Zonas.
              </p>
            </div>

            <div className="card p-5 space-y-4">
              {MAP_FIELDS.map(field => (
                <div key={field.key}>
                  <label className="label">{field.label}</label>
                  <input
                    type={field.type}
                    value={configMap[field.key] || ''}
                    onChange={e => setVal(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="input"
                  />
                  <p className="label-hint">{field.hint}</p>
                </div>
              ))}
            </div>
          </div>

          {/* WhatsApp templates */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 mb-1">Templates de mensagens</h2>
              <p className="text-sm text-slate-500">
                Personalize as mensagens enviadas em cada etapa do pedido.
                As variáveis disponíveis são: <code className="text-xs bg-slate-100 px-1 rounded">{'{nome_cliente}'}</code>,{' '}
                <code className="text-xs bg-slate-100 px-1 rounded">{'{medicamento}'}</code>,{' '}
                <code className="text-xs bg-slate-100 px-1 rounded">{'{link_tracking}'}</code>,{' '}
                <code className="text-xs bg-slate-100 px-1 rounded">{'{preco_total}'}</code>,{' '}
                <code className="text-xs bg-slate-100 px-1 rounded">{'{motivo}'}</code>.
              </p>
            </div>

            <div className="space-y-3">
              {TEMPLATE_DEFS.map(def => (
                <TemplateEditor
                  key={def.key}
                  def={def}
                  value={configMap[def.key]}
                  onChange={val => setVal(def.key, val)}
                />
              ))}
            </div>
          </div>

          {/* Payment gateway */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 mb-1">Gateway de pagamento</h2>
              <p className="text-sm text-slate-500">
                Configure a integração com M-Pesa ou e-Mola para automatizar a cobrança.
                Sem gateway configurado, os pagamentos são confirmados manualmente pelo operador.
              </p>
            </div>

            <div className="card p-5 space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                <strong>Importante:</strong> chaves reais do gateway devem ser guardadas em Supabase Secrets/Edge Functions. Não cole a sk_sandbox ou sk_live nesta página. Esta área mantém o fluxo preparado e documentado.
              </div>
              <div>
                <label className="label">Fornecedor</label>
                <select
                  value={configMap['payment_gateway_provider'] || ''}
                  onChange={e => setVal('payment_gateway_provider', e.target.value)}
                  className="input"
                >
                  {PAYMENT_PROVIDERS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <p className="label-hint">Seleccione o gateway de pagamento a usar nas cobranças automáticas.</p>
              </div>

              <div>
                <label className="label">Ambiente</label>
                <select
                  value={configMap['payment_gateway_environment'] || 'sandbox'}
                  onChange={e => setVal('payment_gateway_environment', e.target.value)}
                  className="input"
                >
                  <option value="sandbox">Sandbox (testes)</option>
                  <option value="production">Produção</option>
                </select>
                <p className="label-hint text-orange-600 font-semibold">Altere para "Produção" apenas depois de testar completamente no sandbox.</p>
              </div>

              {PAYMENT_FIELDS.map(field => (
                <div key={field.key}>
                  <label className="label">{field.label}</label>
                  <input
                    type={field.type}
                    value={configMap[field.key] || ''}
                    onChange={e => setVal(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="input"
                  />
                  <p className="label-hint">{field.hint}</p>
                </div>
              ))}

              {!configMap['payment_gateway_provider'] && (
                <div className="flex items-start gap-3 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                  <svg className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <p className="text-xs text-slate-500">
                    Sem gateway activo, o operador confirma manualmente cada pagamento na página do pedido.
                    O sistema funciona normalmente — o gateway é opcional.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Save button (sticky bottom) */}
          {dirty && (
            <div className="sticky bottom-4">
              <button onClick={handleSave} disabled={saving} className="btn-primary-lg w-full shadow-card-lg">
                {saving ? <><Spinner size="sm" /> A guardar...</> : (
                  <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg> Guardar todas as alterações</>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
