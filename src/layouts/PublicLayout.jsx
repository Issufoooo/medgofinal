import { useState, useEffect } from 'react'
import { Link, NavLink, useLocation, Outlet } from 'react-router-dom'
import { MedGoLogo } from '../components/shared/MedGoLogo'

function MenuIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

function HomeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10.5L12 3l9 7.5M5.25 9.75V20.25H18.75V9.75" />
    </svg>
  )
}

function BoxIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l8.25 4.5L12 12 3.75 7.5 12 3zm8.25 4.5v9L12 21l-8.25-4.5v-9" />
    </svg>
  )
}


function InfoCircleIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
  )
}

export function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navCls = ({ isActive }) =>
    `px-4 py-2.5 text-sm font-semibold rounded-full transition-colors ${
      isActive
        ? 'bg-teal-700 text-white'
        : 'text-slate-600 hover:bg-teal-50 hover:text-teal-800'
    }`

  return (
    <div className="min-h-svh flex flex-col bg-white">
      <header
        className={`sticky top-0 z-40 transition-all duration-200 ${
          scrolled
            ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-teal-100'
            : 'bg-white/90 backdrop-blur-sm border-b border-teal-100/80'
        }`}
      >
        <div className="page-wrap">
          <div className="flex items-center justify-between h-20">
            <Link to="/" className="shrink-0" aria-label="MedGo">
              <MedGoLogo size={28} />
            </Link>

            <nav className="hidden md:flex items-center gap-2">
              <NavLink to="/" end className={navCls}>Início</NavLink>
              <NavLink to="/medicamentos" className={navCls}>Medicamentos</NavLink>
              <a
                href="/#como-funciona"
                className="px-4 py-2.5 text-sm font-semibold rounded-full text-slate-600 hover:bg-teal-50 hover:text-teal-800 transition-colors"
                onClick={e => {
                  const el = document.getElementById('como-funciona')
                  if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth' }) }
                }}
              >
                Como funciona
              </a>
            </nav>

            <div className="flex items-center gap-2">
              <Link to="/medicamentos" className="hidden sm:inline-flex items-center justify-center rounded-full bg-teal-600 px-5 py-3 text-sm font-extrabold text-white shadow-card transition hover:bg-teal-700">
                Pedir medicamento
              </Link>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="md:hidden btn-icon"
                aria-label="Menu"
                aria-expanded={menuOpen}
              >
                {menuOpen ? <CloseIcon /> : <MenuIcon />}
              </button>
            </div>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-white border-t border-teal-100 animate-slide-down pb-safe">
            <div className="page-wrap py-4 space-y-2">
              <Link to="/" className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-slate-50 text-sm font-semibold text-slate-700">
                <HomeIcon />
                Início
              </Link>
              <Link to="/medicamentos" className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-slate-50 text-sm font-semibold text-slate-700">
                <BoxIcon />
                Medicamentos
              </Link>
              <a
                href="/#como-funciona"
                className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-teal-50 text-sm font-semibold text-teal-700"
                onClick={() => setMenuOpen(false)}
              >
                <InfoCircleIcon />
                Como funciona
              </a>
              <div className="pt-2">
                <Link to="/medicamentos" className="inline-flex w-full items-center justify-center rounded-full bg-teal-600 px-6 py-3 text-base font-extrabold text-white shadow-card transition hover:bg-teal-700">Pedir medicamento</Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 bg-white">
        <Outlet />
      </main>

      <footer className="border-t border-teal-100 bg-[linear-gradient(180deg,#ffffff,#f7fbff)] text-slate-500 pt-14 pb-8">
        <div className="page-wrap">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 mb-12">
            <div>
              <MedGoLogo size={24} className="mb-4" />
              <p className="text-sm leading-relaxed max-w-xs">
                Medicamentos com acompanhamento simples: escolha no catálogo, envie a solicitação e receba confirmação antes de avançar.
              </p>
            </div>
            <div>
              <p className="text-slate-950 font-semibold text-sm mb-4">Atendimento</p>
              <p className="text-sm mb-1">Segunda – Sábado</p>
              <p className="text-sm mb-4">08h00 – 20h00</p>
              <p className="text-xs leading-relaxed text-slate-500 max-w-xs">
                Em caso de urgência médica, contacte imediatamente uma unidade de saúde. A MedGo apoia pedidos e entregas, não substitui consulta médica.
              </p>
            </div>
            <div>
              <p className="text-slate-950 font-semibold text-sm mb-4">Acesso rápido</p>
              <div className="space-y-2.5 text-sm">
                <Link to="/" className="block hover:text-teal-700 transition-colors">Início</Link>
                <Link to="/medicamentos" className="block hover:text-teal-700 transition-colors">Ver medicamentos</Link>
                <a href="/#como-funciona" className="block hover:text-teal-700 transition-colors">Como funciona</a>
              </div>
            </div>
          </div>
          <div className="border-t border-teal-100 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
            <p>© {new Date().getFullYear()} MedGo · Todos os direitos reservados</p>
            <p className="text-slate-400">Maputo · Matola · Moçambique</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
