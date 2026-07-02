import { useState } from 'react'
import { Link }      from 'react-router-dom'
import { Grainient } from '../../components/public/Grainient'
import GradualBlur   from '../../components/public/GradualBlur'
import { RotatingText }       from '../../components/public/RotatingText'
import { MedicationSearch }   from '../../components/public/MedicationSearch'
import { ComoFuncionaModal }  from '../../components/public/ComoFuncionaModal'
import { MedGoLogo }          from '../../components/shared/MedGoLogo'

/* ── Icons ─────────────────────────────────────────────────────── */
function ArrowRight({ size = 16 }) {
  return (
    <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3"/>
    </svg>
  )
}
function PlayCircle({ size = 18 }) {
  return (
    <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" strokeWidth={1.8}/>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 8l6 4-6 4V8z"/>
    </svg>
  )
}
function CheckCircle({ size = 15 }) {
  return (
    <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
  )
}

/* ── Floating order card (right side visual) ─────────────────── */
function HeroCard() {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.82)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.9)',
      borderRadius: 24,
      padding: '24px',
      boxShadow: '0 24px 60px -12px rgba(15,118,110,0.18), 0 8px 24px -8px rgba(0,0,0,0.08)',
      width: '100%',
      maxWidth: 340,
      animation: 'heroCardIn 0.7s cubic-bezier(.16,1,.3,1) 0.3s both',
    }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:'#f0fdfa', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="18" height="18" fill="none" stroke="#0d9488" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 20.25l9.75-9.75a4.243 4.243 0 00-6-6L4.5 14.25a4.243 4.243 0 006 6z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 10.5l5.25 5.25"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize:11, fontWeight:700, color:'#0d9488', textTransform:'uppercase', letterSpacing:'0.06em', lineHeight:1 }}>Pedido recebido</p>
            <p style={{ fontSize:14, fontWeight:700, color:'#0f172a', lineHeight:1.2, marginTop:2 }}>Em confirmação</p>
          </div>
        </div>
        <div style={{ width:28, height:28, borderRadius:'50%', background:'#14b8a6', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="13" height="13" fill="none" stroke="white" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
          </svg>
        </div>
      </div>

      {/* Steps */}
      <div style={{ background:'#f8fafc', borderRadius:12, padding:'12px 14px', marginBottom:14, display:'flex', flexDirection:'column', gap:10 }}>
        {[
          { label:'Pedido enviado',              done:true  },
          { label:'Disponibilidade a confirmar', done:true, pulse:true },
          { label:'Confirmação antes de avançar',done:false },
        ].map(s => (
          <div key={s.label} style={{ display:'flex', alignItems:'center', gap:9 }}>
            <span style={{
              width:8, height:8, borderRadius:'50%', flexShrink:0,
              background: s.done ? '#14b8a6' : '#e2e8f0',
              boxShadow: s.pulse ? '0 0 0 3px rgba(20,184,166,0.2)' : 'none',
            }}/>
            <span style={{ fontSize:12, fontWeight: s.done ? 600 : 400, color: s.done ? '#0f172a' : '#94a3b8' }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* WhatsApp row */}
      <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:12, padding:'10px 12px', display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:32, height:32, borderRadius:8, background:'white', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
          <svg width="16" height="16" fill="#25D366" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884"/>
          </svg>
        </div>
        <div>
          <p style={{ fontSize:12, fontWeight:700, color:'#15803d' }}>Acompanhamento pelo WhatsApp</p>
          <p style={{ fontSize:11, color:'#64748b', marginTop:1 }}>Confirmação antes de qualquer cobrança</p>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:12 }}>
        {[
          { val:'< 2h',     lbl:'Tempo médio'   },
          { val:'Maputo',   lbl:'& Matola'       },
        ].map(s => (
          <div key={s.val} style={{ background:'#f8fafc', borderRadius:10, padding:'8px 10px', textAlign:'center' }}>
            <p style={{ fontSize:16, fontWeight:800, color:'#0f766e', fontFamily:"'Khand',system-ui,sans-serif", letterSpacing:'-0.02em', lineHeight:1 }}>{s.val}</p>
            <p style={{ fontSize:10, fontWeight:600, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:3 }}>{s.lbl}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Page ──────────────────────────────────────────────────────── */
export function HomePage() {
  const [comoOpen, setComoOpen] = useState(false)

  return (
    <div style={{ overflowX:'hidden', background:'#fff' }}>

      {/* ── HERO — full-viewport ──────────────────────────────── */}
      <section style={{ position:'relative', minHeight:'100svh', display:'flex', alignItems:'center', overflow:'hidden' }}>

        {/* Animated background */}
        <Grainient
          className="z-0"
          timeSpeed={0.07} colorBalance={0.28} warpStrength={0.6}
          warpFrequency={2.0} warpSpeed={0.6} warpAmplitude={90}
          grainAmount={0.03} contrast={0.9} saturation={1.0}
          color1="#ccfbf1" color2="#14b8a6" color3="#f97316"
        />

        {/* Left-to-right overlay so text stays readable */}
        <div style={{
          position:'absolute', inset:0, zIndex:1,
          background:'linear-gradient(105deg, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.92) 38%, rgba(255,255,255,0.55) 62%, rgba(255,255,255,0) 100%)',
        }}/>

        {/* Content grid */}
        <div style={{
          position:'relative', zIndex:2,
          width:'100%', maxWidth:1280,
          margin:'0 auto',
          padding:'7rem 4rem 5rem',
          display:'grid',
          gridTemplateColumns:'1fr 1fr',
          gap:'4rem',
          alignItems:'center',
        }} className="hero-grid">

          {/* ── LEFT — text ────────────────────────────────────── */}
          <div style={{ maxWidth:560 }}>

            {/* Chip */}
            <div style={{
              display:'inline-flex', alignItems:'center', gap:8,
              background:'#e0f2fe', borderRadius:9999,
              padding:'6px 14px',
              marginBottom:28,
              animation:'fadeInUp 0.5s cubic-bezier(0.4,0,0.2,1) both',
            }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'#0369a1', flexShrink:0 }}/>
              <span style={{ fontSize:11, fontWeight:700, color:'#0369a1', textTransform:'uppercase', letterSpacing:'0.1em', fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif" }}>
                Entrega ao domicílio · Maputo &amp; Matola
              </span>
            </div>

            {/* Headline */}
            <h1 style={{
              fontFamily:"'Khand',system-ui,sans-serif",
              fontWeight:700,
              fontSize:'clamp(2.6rem,5vw,4.5rem)',
              lineHeight:1.05,
              letterSpacing:'-0.025em',
              color:'#0a192f',
              marginBottom:24,
              animation:'fadeInUp 0.5s cubic-bezier(0.4,0,0.2,1) 0.08s both',
            }}>
              Medicamentos<br/>
              <span style={{ color:'#14b8a6' }}>
                <RotatingText
                  texts={['com cuidado.','com confiança.','ao domicílio.','confirmados.']}
                  interval={3200}
                  wordClassName=""
                />
              </span>
            </h1>

            {/* Description */}
            <p style={{
              fontSize:'1.1rem',
              fontWeight:400,
              lineHeight:1.65,
              color:'#475569',
              marginBottom:32,
              maxWidth:480,
              fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif",
              animation:'fadeInUp 0.5s cubic-bezier(0.4,0,0.2,1) 0.16s both',
            }}>
              A MedGo leva os seus medicamentos até si — com confirmação de disponibilidade
              e valor antes de qualquer cobrança.
            </p>

            {/* CTA buttons */}
            <div style={{
              display:'flex', flexWrap:'wrap', gap:12, marginBottom:40,
              animation:'fadeInUp 0.5s cubic-bezier(0.4,0,0.2,1) 0.24s both',
            }}>
              <Link
                to="/medicamentos"
                className="hero-btn-primary"
                style={{
                  display:'inline-flex', alignItems:'center', gap:8,
                  background:'#0c2b64',
                  color:'white',
                  fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif",
                  fontWeight:600,
                  fontSize:'0.95rem',
                  padding:'0.8rem 1.6rem',
                  borderRadius:9999,
                  textDecoration:'none',
                  transition:'all 0.2s ease',
                  boxShadow:'0 4px 16px rgba(12,43,100,0.28)',
                }}
              >
                Ver medicamentos <ArrowRight />
              </Link>

              <button
                onClick={() => setComoOpen(true)}
                className="hero-btn-secondary"
                style={{
                  display:'inline-flex', alignItems:'center', gap:8,
                  background:'rgba(255,255,255,0.5)',
                  backdropFilter:'blur(8px)',
                  WebkitBackdropFilter:'blur(8px)',
                  border:'1px solid rgba(0,0,0,0.1)',
                  color:'#0f172a',
                  fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif",
                  fontWeight:600,
                  fontSize:'0.95rem',
                  padding:'0.8rem 1.6rem',
                  borderRadius:9999,
                  cursor:'pointer',
                  transition:'all 0.2s ease',
                }}
              >
                <PlayCircle /> Como funciona
              </button>
            </div>

            {/* Trust indicators */}
            <div style={{
              display:'flex', flexWrap:'wrap', gap:20,
              animation:'fadeInUp 0.5s cubic-bezier(0.4,0,0.2,1) 0.32s both',
            }}>
              {[
                'Confirmação antes de avançar',
                'Receita quando necessário',
                'Acompanhamento em tempo real',
              ].map(t => (
                <div key={t} style={{ display:'flex', alignItems:'center', gap:6, color:'#0f766e' }}>
                  <CheckCircle />
                  <span style={{ fontSize:12, fontWeight:600, color:'#475569', fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif" }}>{t}</span>
                </div>
              ))}
            </div>

            {/* Search */}
            <div style={{
              marginTop:36,
              background:'rgba(255,255,255,0.85)',
              backdropFilter:'blur(10px)',
              border:'1px solid rgba(20,184,166,0.2)',
              borderRadius:14,
              padding:10,
              boxShadow:'0 4px 20px rgba(20,184,166,0.1)',
              animation:'fadeInUp 0.5s cubic-bezier(0.4,0,0.2,1) 0.38s both',
            }}>
              <MedicationSearch />
            </div>
          </div>

          {/* ── RIGHT — floating card ──────────────────────────── */}
          <div style={{ display:'flex', justifyContent:'center', alignItems:'center' }} className="hero-card-col">
            <HeroCard />
          </div>
        </div>

        <GradualBlur position="bottom" height="80px" strength={2} divCount={7} curve="bezier" zIndex={5}/>
      </section>

      {/* ── SOCIAL PROOF STRIP ──────────────────────────────── */}
      <section style={{ background:'#f8fafc', borderTop:'1px solid #e2e8f0', borderBottom:'1px solid #e2e8f0', padding:'20px 4rem' }}>
        <div style={{ maxWidth:1280, margin:'0 auto', display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'center', gap:'2.5rem' }}>
          {[
            { val:'< 2h',      lbl:'Tempo médio de entrega'     },
            { val:'2 zonas',   lbl:'Maputo e Matola'            },
            { val:'100%',      lbl:'Confirmado antes de cobrar' },
            { val:'Seg–Sáb',   lbl:'08h00 – 20h00'             },
          ].map((s, i) => (
            <div key={s.val} style={{ display:'flex', alignItems:'center', gap: i < 3 ? '2.5rem' : 0 }}>
              <div style={{ textAlign:'center' }}>
                <p style={{ fontSize:'1.6rem', fontWeight:700, color:'#0f766e', fontFamily:"'Khand',system-ui,sans-serif", letterSpacing:'-0.02em', lineHeight:1 }}>{s.val}</p>
                <p style={{ fontSize:11, fontWeight:600, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em', marginTop:3, fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif" }}>{s.lbl}</p>
              </div>
              {i < 3 && <div style={{ width:1, height:32, background:'rgba(0,0,0,0.1)' }}/>}
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS — compact, 3 steps ─────────────────── */}
      <section style={{ padding:'5rem 4rem', background:'white' }}>
        <div style={{ maxWidth:1280, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:'3rem' }}>
            <p style={{ fontSize:11, fontWeight:700, color:'#14b8a6', textTransform:'uppercase', letterSpacing:'0.14em', marginBottom:10, fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif" }}>
              Como funciona
            </p>
            <h2 style={{ fontFamily:"'Khand',system-ui,sans-serif", fontWeight:700, fontSize:'clamp(1.8rem,3vw,2.6rem)', letterSpacing:'-0.025em', color:'#0a192f', lineHeight:1.1 }}>
              Um pedido simples, com confirmação antes de avançar.
            </h2>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'2rem' }} className="steps-grid">
            {[
              {
                n:'01', icon:(
                  <svg width="22" height="22" fill="none" stroke="#0d9488" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 20.25l9.75-9.75a4.243 4.243 0 00-6-6L4.5 14.25a4.243 4.243 0 006 6z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 10.5l5.25 5.25"/>
                  </svg>
                ),
                title:'Escolha o medicamento',
                desc:'Pesquise no catálogo e submeta a solicitação com os seus dados de entrega.',
              },
              {
                n:'02', icon:(
                  <svg width="22" height="22" fill="none" stroke="#0d9488" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
                  </svg>
                ),
                title:'A equipa confirma',
                desc:'Verificamos disponibilidade e enviamos o preço final pelo WhatsApp antes de qualquer cobrança.',
              },
              {
                n:'03', icon:(
                  <svg width="22" height="22" fill="none" stroke="#0d9488" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11a2 2 0 012 2v3m0 0h3l3 3v4a2 2 0 01-2 2h-1M5 17a2 2 0 100 4 2 2 0 000-4zm11 0a2 2 0 100 4 2 2 0 000-4z"/>
                  </svg>
                ),
                title:'Receba em casa',
                desc:'Confirme e aguarde. O motoboy sai e pode acompanhar a entrega em tempo real.',
              },
            ].map((step, i) => (
              <div key={step.n} style={{
                background:'#f8fafc',
                border:'1px solid #e2e8f0',
                borderRadius:16,
                padding:'28px 24px',
                position:'relative',
                transition:'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(20,184,166,0.3)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(20,184,166,0.1)'; e.currentTarget.style.transform='translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='#e2e8f0'; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='none' }}
              >
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16 }}>
                  <div style={{ width:44, height:44, borderRadius:12, background:'#f0fdfa', border:'1px solid #ccfbf1', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {step.icon}
                  </div>
                  <span style={{ fontSize:'2.2rem', fontWeight:800, color:'#e2e8f0', fontFamily:"'Khand',system-ui,sans-serif", lineHeight:1 }}>{step.n}</span>
                </div>
                <h3 style={{ fontFamily:"'Khand',system-ui,sans-serif", fontWeight:700, fontSize:'1.15rem', letterSpacing:'-0.01em', color:'#0a192f', marginBottom:8 }}>{step.title}</h3>
                <p style={{ fontSize:13, color:'#64748b', lineHeight:1.6, fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif" }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────── */}
      <section style={{
        margin:'0 4rem 5rem',
        borderRadius:24,
        overflow:'hidden',
        position:'relative',
        background:'linear-gradient(135deg,#0c2b64 0%,#0f766e 60%,#134e4a 100%)',
        padding:'4rem',
      }} className="cta-section">
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(rgba(255,255,255,0.06) 1px,transparent 1px)', backgroundSize:'24px 24px', pointerEvents:'none' }}/>
        <div style={{ position:'relative', maxWidth:640, margin:'0 auto', textAlign:'center' }}>
          <p style={{ fontSize:11, fontWeight:700, color:'rgba(20,184,166,0.9)', textTransform:'uppercase', letterSpacing:'0.14em', marginBottom:16, fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif" }}>
            Pronto para começar?
          </p>
          <h2 style={{ fontFamily:"'Khand',system-ui,sans-serif", fontWeight:700, fontSize:'clamp(1.8rem,3vw,2.8rem)', letterSpacing:'-0.025em', color:'white', lineHeight:1.1, marginBottom:16 }}>
            Comece pelo catálogo.<br/>A confirmação vem antes.
          </h2>
          <p style={{ fontSize:14, color:'rgba(255,255,255,0.65)', lineHeight:1.65, marginBottom:32, fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif" }}>
            Pesquise, envie a solicitação e aguarde a confirmação da equipa. Simples, claro e sem pressão.
          </p>
          <div style={{ display:'flex', justifyContent:'center', flexWrap:'wrap', gap:12 }}>
            <Link to="/medicamentos" style={{
              display:'inline-flex', alignItems:'center', gap:8,
              background:'#14b8a6', color:'white',
              fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif",
              fontWeight:700, fontSize:'0.95rem',
              padding:'0.85rem 1.8rem', borderRadius:9999,
              textDecoration:'none',
              boxShadow:'0 4px 20px rgba(20,184,166,0.4)',
              transition:'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 8px 28px rgba(20,184,166,0.5)' }}
            onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 4px 20px rgba(20,184,166,0.4)' }}
            >
              Ver medicamentos <ArrowRight />
            </Link>
            <button onClick={() => setComoOpen(true)} style={{
              display:'inline-flex', alignItems:'center', gap:8,
              background:'rgba(255,255,255,0.1)', backdropFilter:'blur(8px)',
              border:'1px solid rgba(255,255,255,0.2)', color:'white',
              fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif",
              fontWeight:600, fontSize:'0.95rem',
              padding:'0.85rem 1.8rem', borderRadius:9999, cursor:'pointer',
              transition:'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.18)' }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.1)' }}
            >
              <PlayCircle /> Como funciona
            </button>
          </div>
        </div>
      </section>

      <ComoFuncionaModal open={comoOpen} onClose={() => setComoOpen(false)} />
    </div>
  )
}
