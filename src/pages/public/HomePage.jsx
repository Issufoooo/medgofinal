import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Grainient } from '../../components/public/Grainient'
import GradualBlur from '../../components/public/GradualBlur'
import { RotatingText } from '../../components/public/RotatingText'
import { MedicationSearch } from '../../components/public/MedicationSearch'
import { ComoFuncionaModal } from '../../components/public/ComoFuncionaModal'
import { MagneticButton } from '../../components/public/MagneticButton'
import { Reveal, RevealGroup } from '../../components/public/Reveal'
import { CountUp } from '../../components/public/CountUp'
import { useTilt } from '../../hooks/useReveal'

// ── Icons ──────────────────────────────────────────────────────
function PillIcon({ size = 'w-5 h-5' }) {
  return (
    <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 20.25l9.75-9.75a4.243 4.243 0 00-6-6L4.5 14.25a4.243 4.243 0 006 6z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 10.5l5.25 5.25" />
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
function ChevronRight() {
  return (
    <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}
function InfoIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

// ── Content ───────────────────────────────────────────────────
const STEPS_SHORT = [
  { n: '01', title: 'Escolha', Icon: PillIcon },
  { n: '02', title: 'Confirmamos', Icon: ChatIcon },
  { n: '03', title: 'Recebe', Icon: TruckIcon },
]

const ORDER_TYPES = [
  {
    tag: 'Venda livre',
    title: 'Pedido simples',
    text: 'Para medicamentos comuns que não exigem receita. A equipa confirma disponibilidade e valor antes de avançar.',
    cta: 'Pedir medicamento',
    Icon: PillIcon,
    featured: true,
  },
  {
    tag: 'Com receita',
    title: 'Pedido com documento',
    text: 'Envie a receita quando necessário. A validação faz parte do processo.',
    cta: 'Pedir com receita',
    Icon: DocumentIcon,
  },
  {
    tag: 'Acompanhado',
    title: 'Com mais cuidado',
    text: 'Para casos que precisam de orientação adicional antes de prosseguir.',
    cta: 'Solicitar avaliação',
    Icon: ShieldIcon,
  },
]

const STATS = [
  { value: 2, suffix: '', label: 'Zonas cobertas', sub: 'Maputo e Matola' },
  { value: 98, suffix: '%', label: 'Confirmado antes', sub: 'de qualquer cobrança' },
  { value: 12, suffix: 'h', label: 'Atendimento diário', sub: '08h00 – 20h00' },
]

// ── Spotlight handler (shared) ──────────────────────────────────
function handleSpotlight(e) {
  const card = e.currentTarget
  const rect = card.getBoundingClientRect()
  card.style.setProperty('--x', `${e.clientX - rect.left}px`)
  card.style.setProperty('--y', `${e.clientY - rect.top}px`)
}

// ── Hero decorative card (with subtle tilt) ─────────────────────
function HeroCard() {
  const { ref, tilt, onMouseMove, onMouseLeave } = useTilt(10)
  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="relative mx-auto max-w-md"
      style={{ perspective: 1000 }}
    >
      <div className="absolute -inset-8 rounded-full bg-teal-200/40 blur-3xl pointer-events-none animate-pulse2" style={{ animationDuration: '4s' }} />
      <div
        className="relative rounded-[2rem] border border-teal-100 bg-white/90 p-5 shadow-card-xl backdrop-blur-xl transition-transform duration-150 ease-out"
        style={{ transform: `rotateY(${tilt.x}deg) rotateX(${-tilt.y}deg)`, transformStyle: 'preserve-3d' }}
      >
        <div className="mb-4 flex items-center justify-between rounded-[1.4rem] border border-teal-100 bg-teal-50/80 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-teal-600 shadow-card">
              <PillIcon size="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-teal-500">Pedido recebido</p>
              <p className="text-base font-extrabold leading-none text-slate-950">Em confirmação</p>
            </div>
          </div>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-white">
            <CheckIcon />
          </span>
        </div>

        <div className="space-y-3 rounded-[1.4rem] border border-slate-100 bg-white p-4">
          {[
            { label: 'Pedido enviado', color: 'bg-teal-600', done: true },
            { label: 'Disponibilidade em confirmação', color: 'bg-teal-500', done: true, pulse: true },
            { label: 'Valor confirmado antes de avançar', color: 'bg-slate-300' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <span className={`h-2.5 w-2.5 rounded-full ${item.color} ${item.pulse ? 'animate-pulse2' : ''}`} />
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
              <p className="text-sm font-extrabold text-slate-900">Acompanhamento pelo WhatsApp</p>
              <p className="text-xs leading-relaxed text-slate-500">A equipa confirma disponibilidade, valor e próximos passos.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────
export function HomePage() {
  const [comoOpen, setComoOpen] = useState(false)

  return (
    <div className="overflow-x-hidden bg-white text-slate-900">

      {/* HERO */}
      <section className="relative overflow-hidden" aria-label="Apresentação MedGo" style={{ background: '#f0fdfa' }}>

        {/* ── Vídeo de fundo (Genova-style) ─────────────────────────────── */}
        <video
          autoPlay muted loop playsInline
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            zIndex: 0,
            opacity: 0.18,
          }}
        >
          <source src="https://strvid.nyc3.cdn.digitaloceanspaces.com/motionsite/dna_video.mp4" type="video/mp4" />
        </video>

        {/* Grainient por cima do vídeo — blends with it */}
        <Grainient
          className="opacity-60 mix-blend-multiply"
          timeSpeed={0.06} colorBalance={0.22} warpStrength={0.5} warpFrequency={2.0}
          warpSpeed={0.55} warpAmplitude={85} grainAmount={0.025}
          contrast={0.88} saturation={0.9} color1="#f0fdfa" color2="#ccfbf1" color3="#14b8a6"
        />

        {/* Overlay gradiente — garante legibilidade do texto à esquerda */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(105deg, rgba(240,253,250,0.97) 0%, rgba(240,253,250,0.88) 35%, rgba(240,253,250,0.55) 60%, rgba(240,253,250,0) 100%)',
          zIndex: 1, pointerEvents: 'none',
        }} />

        {/* Fundo sólido por baixo de tudo para garantir que não fica transparente */}
        <div style={{ position: 'absolute', inset: 0, background: '#f0fdfa', zIndex: -1 }} />

        <div className="absolute right-[8%] top-24 h-2 w-2 rounded-full bg-orange-400/70 shadow-[0_0_24px_rgba(249,115,22,0.35)] drift" style={{ zIndex: 2 }} />
        <div className="absolute left-[12%] top-44 h-1.5 w-1.5 rounded-full bg-teal-400/70 shadow-[0_0_18px_rgba(20,184,166,0.4)] drift-delay" style={{ zIndex: 2 }} />

        <div className="page-wrap py-14 sm:py-18 lg:py-20" style={{ position: "relative", zIndex: 2 }}>
          <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="max-w-2xl">
              <Reveal variant="fade" duration={500}>
                <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-teal-100 bg-white/80 px-4 py-2 text-xs font-bold text-teal-700 shadow-card backdrop-blur-md">
                  <span className="h-2 w-2 rounded-full bg-teal-500 shadow-[0_0_16px_rgba(20,184,166,0.5)] animate-pulse2" />
                  Maputo · Matola · pedido assistido
                </div>
              </Reveal>

              <Reveal delay={60}>
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
              </Reveal>

              <Reveal delay={130}>
                <p className="mt-6 max-w-xl text-base md:text-lg leading-relaxed text-slate-600">
                  Escolha o medicamento, envie a solicitação e receba confirmação de disponibilidade e valor antes de qualquer cobrança.
                </p>
              </Reveal>

              <Reveal delay={190}>
                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <MagneticButton strength={0.25}>
                    <Link
                      to="/medicamentos"
                      className="cta-sweep inline-flex items-center justify-center gap-2 rounded-full bg-teal-600 px-7 py-4 text-sm font-extrabold text-white shadow-card-lg transition hover:-translate-y-0.5 hover:bg-teal-700 hover:shadow-[0_12px_28px_-6px_rgba(13,148,136,0.45)]"
                    >
                      <PillIcon size="w-4 h-4" />
                      Ver medicamentos
                    </Link>
                  </MagneticButton>
                  <MagneticButton strength={0.25}>
                    <button
                      onClick={() => setComoOpen(true)}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-teal-200 bg-white px-7 py-4 text-sm font-extrabold text-teal-700 shadow-card transition hover:-translate-y-0.5 hover:bg-teal-50 hover:border-teal-300"
                    >
                      <InfoIcon /> Como funciona
                    </button>
                  </MagneticButton>
                </div>
              </Reveal>

              <Reveal delay={250}>
                <div className="mt-8 max-w-xl rounded-[1.65rem] border border-teal-100 bg-white/85 p-3 shadow-card-md backdrop-blur-md search-shell">
                  <MedicationSearch />
                </div>
              </Reveal>

              <Reveal delay={300}>
                <p className="mt-5 max-w-lg text-xs leading-relaxed text-slate-500">
                  A MedGo não substitui consulta médica. Pedidos com receita ou acompanhamento seguem um processo mais cuidadoso.
                </p>
              </Reveal>
            </div>

            <Reveal variant="scale" delay={200} className="hidden lg:block">
              <HeroCard />
            </Reveal>
          </div>

          {/* Mini step strip — replaces the old full "como funciona" section */}
          <Reveal delay={360}>
            <button
              onClick={() => setComoOpen(true)}
              className="group mt-12 flex w-full flex-wrap items-center gap-x-8 gap-y-3 rounded-2xl border border-teal-100 bg-white/70 px-5 py-4 backdrop-blur-md transition-all hover:bg-white hover:shadow-card-md text-left"
            >
              {STEPS_SHORT.map((s, i) => {
                const Icon = s.Icon
                return (
                  <div key={s.n} className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-teal-700 border border-teal-100 text-xs font-extrabold">
                      {s.n}
                    </span>
                    <span className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
                      <Icon size="w-4 h-4" /> {s.title}
                    </span>
                    {i < STEPS_SHORT.length - 1 && (
                      <span className="hidden sm:block text-teal-200 ml-3">—</span>
                    )}
                  </div>
                )
              })}
              <span className="ml-auto inline-flex items-center gap-1 text-xs font-extrabold uppercase tracking-wide text-teal-600 group-hover:text-teal-800">
                Ver processo completo <ChevronRight />
              </span>
            </button>
          </Reveal>
        </div>

        <GradualBlur position="bottom" height="90px" strength={2.2} divCount={8} curve="bezier" exponential zIndex={5} />
      </section>

      {/* TIPOS DE PEDIDO — asymmetric: 1 featured + 2 compact */}
      <section className="section-sm bg-white">
        <div className="page-wrap">
          <Reveal>
            <div className="mb-9 max-w-xl">
              <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.2em] text-teal-600">Tipos de pedido</p>
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-950 leading-snug">
                Cada medicamento tem o seu caminho certo.
              </h2>
            </div>
          </Reveal>

          <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
            {/* Featured card */}
            <Reveal variant="left" delay={60}>
              <div
                onMouseMove={handleSpotlight}
                className="spotlight-card interactive-card group relative flex h-full flex-col justify-between overflow-hidden rounded-[1.75rem] border border-teal-100 bg-[linear-gradient(135deg,#f0fdfa_0%,#ffffff_70%)] p-7"
              >
                <div>
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-teal-100 bg-white text-teal-700 shadow-card transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                      <PillIcon size="w-5 h-5" />
                    </div>
                    <span className="rounded-full border border-teal-200 bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-teal-700">
                      Venda livre
                    </span>
                  </div>
                  <h3 className="mb-2 text-2xl font-extrabold leading-tight text-slate-950">Pedido simples</h3>
                  <p className="max-w-sm text-sm leading-relaxed text-slate-500">
                    Para medicamentos comuns que não exigem receita. A equipa confirma disponibilidade e valor antes de avançar — sem complicações.
                  </p>
                </div>
                <Link to="/medicamentos" className="group/link mt-7 inline-flex w-fit items-center gap-1.5 text-sm font-extrabold uppercase tracking-[0.1em] text-teal-600 transition-colors hover:text-teal-800">
                  Pedir medicamento
                  <svg className="w-4 h-4 transition-transform duration-200 group-hover/link:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                </Link>
              </div>
            </Reveal>

            {/* Two compact cards stacked */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {ORDER_TYPES.slice(1).map((type, i) => {
                const Icon = type.Icon
                return (
                  <Reveal key={type.title} variant="right" delay={120 + i * 80}>
                    <div
                      onMouseMove={handleSpotlight}
                      className="spotlight-card interactive-card group flex h-full items-start gap-4 rounded-2xl border border-teal-100 bg-white p-5"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-teal-100 bg-teal-50 text-teal-700 transition-transform duration-300 group-hover:scale-110">
                        <Icon size="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-extrabold uppercase tracking-wide text-teal-600">{type.tag}</span>
                        <h3 className="mb-1 text-base font-extrabold leading-tight text-slate-950">{type.title}</h3>
                        <p className="text-xs leading-relaxed text-slate-500">{type.text}</p>
                        <Link to="/medicamentos" className="group/link mt-2.5 inline-flex items-center gap-1 text-xs font-extrabold text-teal-600 transition-colors hover:text-teal-800">
                          {type.cta}
                          <svg className="w-3.5 h-3.5 transition-transform duration-200 group-hover/link:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                        </Link>
                      </div>
                    </div>
                  </Reveal>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CONFIANÇA — stats with live counters + promise strip merged */}
      <section className="section-sm border-y border-teal-100 bg-[linear-gradient(180deg,#f7fbff,#ffffff)]">
        <div className="page-wrap">
          <div className="overflow-hidden rounded-[2.25rem] border border-teal-100 bg-[linear-gradient(135deg,#0f766e_0%,#0d9488_45%,#042f2e_100%)] shadow-card-xl">
            <div className="relative px-6 py-12 md:px-12 md:py-14">
              <div className="absolute right-10 top-10 h-2 w-2 rounded-full bg-orange-400/80 drift" />
              <div className="absolute left-10 bottom-10 h-1.5 w-1.5 rounded-full bg-white/40 drift-delay" />

              <Reveal>
                <div className="mb-10 max-w-2xl">
                  <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.22em] text-teal-200">A nossa promessa</p>
                  <h2 className="mb-3 text-3xl md:text-4xl font-extrabold leading-tight tracking-tight text-white">
                    Menos pressa. Mais confirmação.
                  </h2>
                  <p className="max-w-xl leading-relaxed text-teal-50/90">
                    Confirmamos o essencial antes de qualquer avanço, para decidir com segurança.
                  </p>
                </div>
              </Reveal>

              <RevealGroup
                variant="up"
                stagger={100}
                baseDelay={80}
                className="grid gap-4 sm:grid-cols-3"
              >
                {STATS.map((s) => (
                  <div key={s.label} className="rounded-2xl border border-white/15 bg-white/[0.07] p-5 backdrop-blur-sm transition-all hover:bg-white/[0.12] hover:-translate-y-1">
                    <p className="tabular-nums text-4xl font-black leading-none text-white">
                      <CountUp value={s.value} suffix={s.suffix} />
                    </p>
                    <p className="mt-2 text-sm font-bold text-teal-50">{s.label}</p>
                    <p className="text-xs text-teal-100/70">{s.sub}</p>
                  </div>
                ))}
              </RevealGroup>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="section-sm bg-white">
        <div className="page-wrap">
          <Reveal variant="scale">
            <div className="relative overflow-hidden rounded-[2rem] border border-teal-100 bg-[linear-gradient(180deg,#ffffff,#f7fbff)] px-8 py-12 text-center shadow-card-lg">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-teal-100/50 blur-2xl" />
              <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-orange-100/50 blur-2xl" />

              <div className="relative mx-auto max-w-2xl">
                <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.2em] text-teal-600">Pronto para começar?</p>
                <h2 className="mb-4 text-3xl md:text-4xl font-extrabold tracking-tight text-slate-950 text-balance">
                  Comece pelo catálogo. A confirmação vem depois.
                </h2>
                <p className="mx-auto mb-8 max-w-lg text-base leading-relaxed text-slate-500">
                  Pesquise, envie a solicitação e aguarde a confirmação da equipa. Simples, claro e sem pressão.
                </p>
                <div className="flex flex-col justify-center gap-3 sm:flex-row">
                  <MagneticButton strength={0.25}>
                    <Link to="/medicamentos" className="cta-sweep inline-flex items-center justify-center gap-2 rounded-full bg-teal-600 px-8 py-4 text-sm font-extrabold text-white shadow-card-lg transition hover:-translate-y-0.5 hover:bg-teal-700">
                      <PillIcon size="w-4 h-4" /> Ver medicamentos
                    </Link>
                  </MagneticButton>
                  <MagneticButton strength={0.25}>
                    <button
                      onClick={() => setComoOpen(true)}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-teal-200 bg-white px-8 py-4 text-sm font-extrabold text-teal-700 transition hover:-translate-y-0.5 hover:bg-teal-50"
                    >
                      <InfoIcon /> Entender o processo
                    </button>
                  </MagneticButton>
                </div>
                <p className="mt-6 text-xs text-slate-400">
                  Segunda a sábado, 08h00–20h00 · Maputo e Matola
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <ComoFuncionaModal open={comoOpen} onClose={() => setComoOpen(false)} />
    </div>
  )
}
