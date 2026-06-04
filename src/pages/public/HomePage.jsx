import { Link } from 'react-router-dom'
import { Grainient } from '../../components/public/Grainient'
import GradualBlur from '../../components/public/GradualBlur'
import { RotatingText } from '../../components/public/RotatingText'
import { MedicationSearch } from '../../components/public/MedicationSearch'

// ── Icons ──────────────────────────────────────────────────────
function PillIcon({ size = 'w-5 h-5' }) {
  return (
    <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 20.25l9.75-9.75a4.243 4.243 0 00-6-6L4.5 14.25a4.243 4.243 0 006 6z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 10.5l5.25 5.25" />
    </svg>
  )
}

function InfoIcon({ size = 'w-5 h-5' }) {
  return (
    <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function CheckIcon({ size = 'w-4 h-4' }) {
  return (
    <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function ShieldIcon({ size = 'w-6 h-6' }) {
  return (
    <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3.75l7.5 3v5.25c0 4.95-3.15 8.1-7.5 9.75-4.35-1.65-7.5-4.8-7.5-9.75V6.75l7.5-3z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-5" />
    </svg>
  )
}

function ChatIcon({ size = 'w-6 h-6' }) {
  return (
    <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  )
}

function TruckIcon({ size = 'w-6 h-6' }) {
  return (
    <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11a2 2 0 012 2v3m0 0h3l3 3v4a2 2 0 01-2 2h-1M5 17a2 2 0 100 4 2 2 0 000-4zm11 0a2 2 0 100 4 2 2 0 000-4z" />
    </svg>
  )
}

function DocumentIcon({ size = 'w-6 h-6' }) {
  return (
    <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7.5 3.75h6l4.5 4.5v12a1.5 1.5 0 01-1.5 1.5h-9a1.5 1.5 0 01-1.5-1.5v-15a1.5 1.5 0 011.5-1.5z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 3.75v4.5H18M9 13.5h6M9 17h4" />
    </svg>
  )
}

function ArrowDownIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}

// ── Content ───────────────────────────────────────────────────
const STEPS = [
  {
    n: '01',
    title: 'Escolha o medicamento',
    text: 'Pesquise pelo nome e veja se é um pedido simples, com receita ou acompanhado.',
    Icon: PillIcon,
    accent: 'blue',
  },
  {
    n: '02',
    title: 'A equipa confirma',
    text: 'Depois da solicitação, confirmamos disponibilidade, farmácia e valor antes de avançar.',
    Icon: ChatIcon,
    accent: 'teal',
  },
  {
    n: '03',
    title: 'Receba orientação e entrega',
    text: 'Com tudo confirmado, recebe os próximos passos e acompanha o pedido até à entrega.',
    Icon: TruckIcon,
    accent: 'blue',
  },
]

const ORDER_TYPES = [
  {
    tag: 'Venda livre',
    title: 'Pedido simples',
    text: 'Para medicamentos comuns que não exigem receita. A equipa confirma disponibilidade e valor antes de avançar.',
    cta: 'Pedir medicamento',
    Icon: PillIcon,
    accent: 'blue',
  },
  {
    tag: 'Com receita',
    title: 'Pedido com documento',
    text: 'Envie a receita quando necessário. A validação faz parte do processo antes da confirmação.',
    cta: 'Pedir com receita',
    Icon: DocumentIcon,
    accent: 'teal',
  },
  {
    tag: 'Acompanhado',
    title: 'Pedido com mais cuidado',
    text: 'Para casos que precisam de orientação adicional. A equipa indica o que é necessário para prosseguir.',
    cta: 'Solicitar avaliação',
    Icon: ShieldIcon,
    accent: 'navy',
  },
]

const PROMISES = [
  {
    Icon: ShieldIcon,
    title: 'Disponibilidade verificada',
    text: 'A confirmação acontece com base no inventário real das farmácias parceiras.',
  },
  {
    Icon: ChatIcon,
    title: 'Valor antes de avançar',
    text: 'O pedido só segue depois de a equipa confirmar disponibilidade, preço e próximos passos.',
  },
  {
    Icon: TruckIcon,
    title: 'Entrega conforme zona',
    text: 'A entrega depende da zona, farmácia selecionada e confirmação operacional.',
  },
]

const accentStyles = {
  blue: {
    soft: 'bg-teal-50 border-teal-100 text-teal-700',
    dot: 'bg-teal-500',
    ring: 'ring-teal-100',
    line: 'bg-teal-500',
  },
  teal: {
    soft: 'bg-teal-50 border-teal-100 text-teal-700',
    dot: 'bg-teal-500',
    ring: 'ring-teal-100',
    line: 'bg-teal-500',
  },
  navy: {
    soft: 'bg-slate-50 border-slate-200 text-slate-800',
    dot: 'bg-orange-400',
    ring: 'ring-slate-100',
    line: 'bg-slate-900',
  },
}

// ── Hero decorative card ──────────────────────────────────────
function HeroCard() {
  return (
    <div className="relative mx-auto max-w-md">
      <div className="absolute -inset-8 rounded-full bg-teal-200/40 blur-3xl pointer-events-none" />
      <div className="relative rounded-[2rem] border border-teal-100 bg-white/90 p-5 shadow-card-xl backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between rounded-[1.4rem] border border-teal-100 bg-teal-50/80 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-teal-600 shadow-card">
              <PillIcon size="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-teal-500">Pedido recebido</p>
              <p className="text-base font-extrabold leading-none text-slate-950">Pedido em confirmação</p>
            </div>
          </div>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-white">
            <CheckIcon />
          </span>
        </div>

        <div className="space-y-3 rounded-[1.4rem] border border-slate-100 bg-white p-4">
          {[
            { label: 'Pedido enviado', color: 'bg-teal-600', done: true },
            { label: 'Disponibilidade em confirmação', color: 'bg-teal-500', done: true },
            { label: 'Valor confirmado antes de avançar', color: 'bg-slate-300' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
              <span className={`text-sm ${item.done ? 'font-semibold text-slate-800' : 'text-slate-500'}`}>{item.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-[1.4rem] border border-teal-100 bg-teal-50 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-teal-700 shadow-card">
              <ChatIcon size="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-900">Acompanhamento depois da solicitação</p>
              <p className="text-xs leading-relaxed text-slate-500">A equipa confirma disponibilidade, valor e próximos passos pelo canal definido no pedido.</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-4 py-2 text-xs font-semibold text-teal-700">
          <span className="h-2 w-2 rounded-full bg-orange-400" />
          Confirmação clara antes de avançar.
        </div>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────
export function HomePage() {
  return (
    <div className="overflow-x-hidden bg-white text-slate-900">
      {/* HERO */}
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#f0fdfa_0%,#ffffff_38%,#ccfbf1_72%,#ecfeff_100%)]" aria-label="Apresentação MedGo">
        <Grainient
          className="opacity-55 mix-blend-multiply"
          timeSpeed={0.08}
          colorBalance={0.26}
          warpStrength={0.58}
          warpFrequency={2.2}
          warpSpeed={0.65}
          warpAmplitude={92}
          blendAngle={18}
          grainAmount={0.035}
          contrast={0.92}
          saturation={0.95}
          color1="#ffffff"
          color2="#ccfbf1"
          color3="#14b8a6"
        />
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(204,251,241,0.92),transparent_34%),radial-gradient(circle_at_88%_16%,rgba(20,184,166,0.32),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.48),rgba(255,255,255,0.80)_64%,#ffffff)]" />
        <div className="absolute right-[8%] top-24 h-2 w-2 rounded-full bg-orange-400/70 shadow-[0_0_24px_rgba(249,115,22,0.35)]" />

        <div className="page-wrap relative z-10 py-16 sm:py-20 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="max-w-2xl">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-teal-100 bg-white/80 px-4 py-2 text-xs font-bold text-teal-700 shadow-card backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-teal-500 shadow-[0_0_16px_rgba(20,184,166,0.5)]" />
                Maputo · Matola · pedido assistido
              </div>

              <h1 className="font-black tracking-tight text-slate-950 leading-[0.95]" style={{ fontSize: 'clamp(2.55rem, 6vw, 4.7rem)' }}>
                <span className="block mb-1">Medicamentos com</span>
                <span className="block min-h-[1.08em] text-teal-600">
                  <RotatingText
                    texts={['facilidade.', 'confiança.', 'acompanhamento.', 'cuidado.']}
                    interval={3000}
                    wordClassName="text-teal-600"
                  />
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-base md:text-lg leading-relaxed text-slate-600">
                Escolha o medicamento, envie a solicitação e receba confirmação de disponibilidade e valor antes de qualquer cobrança.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link
                  to="/medicamentos"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-600 px-7 py-4 text-sm font-extrabold text-white shadow-card-lg transition hover:-translate-y-0.5 hover:bg-teal-700"
                >
                  <PillIcon size="w-4 h-4" />
                  Ver medicamentos
                </Link>
                <a
                  href="#como-funciona"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-teal-200 bg-white px-7 py-4 text-sm font-extrabold text-teal-700 shadow-card transition hover:-translate-y-0.5 hover:bg-teal-50"
                  onClick={e => {
                    e.preventDefault()
                    document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                >
                  Como funciona <ArrowDownIcon />
                </a>
              </div>

              <div className="mt-8 max-w-xl rounded-[1.65rem] border border-teal-100 bg-white/85 p-3 shadow-card-md backdrop-blur-md">
                <MedicationSearch />
              </div>

              <p className="mt-5 max-w-lg text-xs leading-relaxed text-slate-500">
                A MedGo não substitui consulta médica. Pedidos com receita ou acompanhamento seguem um processo mais cuidadoso.
              </p>
            </div>

            <div className="hidden lg:block">
              <HeroCard />
            </div>
          </div>
        </div>

        <GradualBlur
          position="bottom"
          height="110px"
          strength={2.2}
          divCount={8}
          curve="bezier"
          exponential
          zIndex={5}
        />
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="section-sm bg-white scroll-mt-20">
        <div className="page-wrap">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.2em] text-teal-600">Como funciona</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-950 leading-snug">
              Um pedido simples, com confirmação antes de avançar.
            </h2>
            <p className="mt-3 text-slate-500 leading-relaxed">
              O processo foi pensado para evitar surpresas: primeiro solicita, depois a equipa confirma.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {STEPS.map((step) => {
              const Icon = step.Icon
              const s = accentStyles[step.accent]
              return (
                <div key={step.n} className="rounded-[1.75rem] border border-teal-100 bg-white p-6 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-md">
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${s.soft}`}>
                      <Icon size="w-5 h-5" />
                    </div>
                    <span className="text-5xl font-black leading-none text-teal-100 select-none">{step.n}</span>
                  </div>
                  <h3 className="mb-2 text-lg font-extrabold text-slate-950">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500">{step.text}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* TIPOS DE PEDIDO */}
      <section className="section-sm border-y border-teal-100 bg-[linear-gradient(180deg,#f7fbff,#ffffff)]">
        <div className="page-wrap">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.35fr] lg:items-center">
            <div>
              <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.2em] text-teal-600">Tipos de pedido</p>
              <h2 className="mb-4 text-2xl md:text-3xl font-extrabold text-slate-950 leading-snug">
                Cada medicamento tem o seu caminho certo.
              </h2>
              <p className="mb-6 max-w-sm leading-relaxed text-slate-500">
                A experiência muda conforme o tipo de medicamento. Alguns pedidos são simples; outros exigem receita ou orientação adicional.
              </p>
              <Link to="/medicamentos" className="inline-flex items-center gap-1.5 text-sm font-extrabold text-teal-600 transition-colors hover:text-teal-800">
                Ver catálogo completo <ChevronRight />
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {ORDER_TYPES.map((type) => {
                const Icon = type.Icon
                const s = accentStyles[type.accent]
                return (
                  <div key={type.title} className="group flex min-h-[260px] flex-col rounded-[1.75rem] border border-teal-100 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-md">
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${s.soft}`}>
                        <Icon size="w-5 h-5" />
                      </div>
                      <span className="rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-teal-700">
                        {type.tag}
                      </span>
                    </div>
                    <h3 className="mb-2 text-lg font-extrabold leading-tight text-slate-950">{type.title}</h3>
                    <p className="flex-1 text-sm leading-relaxed text-slate-500">{type.text}</p>
                    <Link to="/medicamentos" className="mt-5 inline-flex items-center gap-1 text-xs font-extrabold uppercase tracking-[0.14em] text-teal-600 transition-colors group-hover:text-teal-800">
                      {type.cta} <ChevronRight />
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CONFIANÇA */}
      <section className="section-sm bg-white">
        <div className="page-wrap">
          <div className="overflow-hidden rounded-[2.25rem] border border-teal-100 bg-[linear-gradient(135deg,#f7fbff_0%,#ffffff_58%,#eef7ff_100%)] shadow-card-xl">
            <div className="relative px-6 py-12 md:px-12 md:py-14">
              <div className="absolute right-10 top-10 h-2 w-2 rounded-full bg-orange-400/70" />
              <div className="mb-10 max-w-2xl">
                <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.22em] text-teal-600">A nossa promessa</p>
                <h2 className="mb-4 text-3xl md:text-4xl font-extrabold leading-tight tracking-tight text-slate-950">
                  Menos pressa. Mais confirmação.
                </h2>
                <p className="max-w-xl leading-relaxed text-slate-600">
                  A MedGo funciona como um pedido assistido: confirmamos o essencial antes de qualquer avanço, para o cliente decidir com segurança.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {PROMISES.map((promise) => {
                  const Icon = promise.Icon
                  return (
                    <div key={promise.title} className="rounded-2xl border border-teal-100 bg-white p-5 shadow-card">
                      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-teal-100 bg-teal-50 text-teal-700">
                        <Icon />
                      </div>
                      <p className="mb-2 font-extrabold leading-snug text-slate-950">{promise.title}</p>
                      <p className="text-sm leading-relaxed text-slate-500">{promise.text}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATÁLOGO CTA */}
      <section className="section-sm bg-[linear-gradient(180deg,#ffffff,#f7fbff)]">
        <div className="page-wrap">
          <div className="grid gap-8 rounded-[2rem] border border-teal-100 bg-white px-8 py-10 shadow-card-lg md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.2em] text-teal-600">Catálogo</p>
              <h2 className="mb-2 text-xl md:text-2xl font-extrabold text-slate-950">
                Encontre o medicamento que precisa.
              </h2>
              <p className="max-w-md text-sm leading-relaxed text-slate-500">
                O catálogo mostra medicamentos que podem ser solicitados. Disponibilidade e valor são confirmados pela equipa antes de qualquer cobrança.
              </p>
            </div>
            <Link to="/medicamentos" className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-600 px-6 py-3.5 text-sm font-extrabold text-white shadow-card-md transition hover:-translate-y-0.5 hover:bg-teal-700">
              Abrir catálogo
            </Link>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="section-sm border-t border-teal-50 bg-white">
        <div className="page-wrap">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.2em] text-teal-600">Pronto para começar?</p>
            <h2 className="mb-4 text-3xl md:text-4xl font-extrabold tracking-tight text-slate-950 text-balance">
              Comece pelo catálogo. A confirmação vem depois.
            </h2>
            <p className="mx-auto mb-8 max-w-lg text-base leading-relaxed text-slate-500">
              Pesquise, envie a solicitação e aguarde a confirmação da equipa. Simples, claro e sem pressão.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/medicamentos" className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-600 px-8 py-4 text-sm font-extrabold text-white shadow-card-lg transition hover:-translate-y-0.5 hover:bg-teal-700">
                <PillIcon size="w-4 h-4" /> Ver medicamentos
              </Link>
              <button
                onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-teal-200 bg-white px-8 py-4 text-sm font-extrabold text-teal-700 transition hover:-translate-y-0.5 hover:bg-teal-50"
              >
                <InfoIcon /> Entender o processo
              </button>
            </div>
            <p className="mt-6 text-xs text-slate-400">
              Segunda a sábado, 08h00–20h00 · Maputo e Matola
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
