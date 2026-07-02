import { useEffect } from 'react'

function PillIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 20.25l9.75-9.75a4.243 4.243 0 00-6-6L4.5 14.25a4.243 4.243 0 006 6z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 10.5l5.25 5.25" />
    </svg>
  )
}
function ChatIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  )
}
function TruckIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11a2 2 0 012 2v3m0 0h3l3 3v4a2 2 0 01-2 2h-1M5 17a2 2 0 100 4 2 2 0 000-4zm11 0a2 2 0 100 4 2 2 0 000-4z" />
    </svg>
  )
}
function CloseIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

const STEPS = [
  { n: '01', title: 'Escolha o medicamento', text: 'Pesquise pelo nome e veja se é um pedido simples, com receita ou acompanhado.', Icon: PillIcon },
  { n: '02', title: 'A equipa confirma', text: 'Depois da solicitação, confirmamos disponibilidade, farmácia e valor antes de avançar.', Icon: ChatIcon },
  { n: '03', title: 'Receba e acompanhe', text: 'Com tudo confirmado, recebe os próximos passos e acompanha o pedido até à entrega.', Icon: TruckIcon },
]

export function ComoFuncionaModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Como funciona">
      <div className="modal-backdrop" onClick={onClose} />

      <div className="modal-panel" style={{ maxWidth: 560 }}>
        <div className="relative h-24 overflow-hidden bg-[linear-gradient(120deg,#0f766e_0%,#14b8a6_45%,#042f2e_100%)]">
          <div className="absolute inset-0 opacity-50" style={{
            backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.35), transparent 40%), radial-gradient(circle at 80% 70%, rgba(249,115,22,0.35), transparent 36%)'
          }} />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition-colors backdrop-blur-sm"
            aria-label="Fechar"
          >
            <CloseIcon />
          </button>
          <div className="relative h-full flex items-end px-6 pb-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal-100">Como funciona</p>
              <h2 className="text-xl font-extrabold text-white leading-tight">Um pedido simples, com confirmação antes de avançar.</h2>
            </div>
          </div>
        </div>

        <div className="px-6 py-6">
          <div className="space-y-1">
            {STEPS.map((step, i) => {
              const Icon = step.Icon
              return (
                <div
                  key={step.n}
                  className="flex gap-4 py-3.5 group"
                  style={{
                    animation: `comoStepIn 0.4s cubic-bezier(.16,1,.3,1) backwards`,
                    animationDelay: `${120 + i * 90}ms`,
                  }}
                >
                  <div className="flex flex-col items-center shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 border border-teal-100 text-teal-700 transition-transform duration-200 group-hover:scale-110 group-hover:bg-teal-100">
                      <Icon />
                    </div>
                    {i < STEPS.length - 1 && <div className="w-px flex-1 bg-teal-100 mt-2 min-h-[18px]" />}
                  </div>
                  <div className="pb-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-extrabold text-teal-300">{step.n}</span>
                      <h3 className="text-[15px] font-extrabold text-slate-900">{step.title}</h3>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-500">{step.text}</p>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-teal-100 bg-teal-50/70 px-4 py-3">
            <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-orange-400 shrink-0" />
            <p className="text-xs leading-relaxed text-teal-800">
              A MedGo não substitui consulta médica. Pedidos com receita ou acompanhamento seguem um processo mais cuidadoso.
            </p>
          </div>

          <button
            onClick={onClose}
            className="btn-primary-lg w-full mt-5 justify-center"
          >
            Entendi, ver medicamentos
          </button>
        </div>
      </div>
    </div>
  )
}
