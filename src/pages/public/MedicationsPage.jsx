import { useMemo, useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { MedicationSearch } from '../../components/public/MedicationSearch'
import { CategoryBadge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'

const CATS = [
  { value: 'ALL', label: 'Todos', desc: 'Ver tudo' },
  { value: 'FREE', label: 'Venda livre', desc: 'Pedido simples' },
  { value: 'PRESCRIPTION', label: 'Com receita', desc: 'Requer documento' },
  { value: 'RESTRICTED_MONITORED', label: 'Acompanhado', desc: 'Avaliação especial' },
]

const CATEGORY_META = {
  FREE: {
    title: 'Venda livre',
    desc: 'Simples de pedir. Confirmamos disponibilidade e valor pelo WhatsApp antes de qualquer cobrança.',
    cta: 'Pedir medicamento',
    tone: 'teal',
  },
  PRESCRIPTION: {
    title: 'Com receita',
    desc: 'Prepare a receita médica. O pedido só avança depois da validação.',
    cta: 'Pedir com receita',
    tone: 'amber',
  },
  RESTRICTED_MONITORED: {
    title: 'Pedido acompanhado',
    desc: 'Exige avaliação cuidadosa e documentação antes de qualquer confirmação.',
    cta: 'Solicitar avaliação',
    tone: 'orange',
  },
}

function SearchOffIcon() {
  return (
    <svg className="w-12 h-12 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.5 15.5L20 20M10.75 17.5a6.75 6.75 0 100-13.5 6.75 6.75 0 000 13.5z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.5 10.75h4.5" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}

function MedicationCard({ med }) {
  const meta = CATEGORY_META[med.category] || CATEGORY_META.FREE
  const toneCls = {
    teal: 'bg-teal-50 border-teal-100 text-teal-700',
    amber: 'bg-amber-50 border-amber-100 text-amber-700',
    orange: 'bg-orange-50 border-orange-100 text-orange-700',
  }[meta.tone]

  return (
    <Link
      to={`/pedido/${med.id}`}
      className="card p-5 hover:shadow-card-md hover:-translate-y-0.5 border border-slate-200 hover:border-teal-100 transition-all duration-200 group flex flex-col"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="font-extrabold text-slate-900 group-hover:text-teal-700 transition-colors leading-tight text-base">
            {med.commercial_name}
          </h3>
          {med.generic_name && (
            <p className="text-sm text-slate-500 mt-1 line-clamp-1">{med.generic_name}</p>
          )}
        </div>
        <CategoryBadge category={med.category} />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {med.dosage && (
          <span className="text-xs font-medium text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full">
            {med.dosage}
          </span>
        )}
        {med.pharmaceutical_form && (
          <span className="text-xs font-medium text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full">
            {med.pharmaceutical_form}
          </span>
        )}
        {med.package_size && (
          <span className="text-xs font-medium text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full">
            {med.package_size}
          </span>
        )}
      </div>

      <div className={`rounded-2xl border px-3.5 py-3 mb-4 ${toneCls}`}>
        <p className="text-xs font-extrabold uppercase tracking-widest mb-1">{meta.title}</p>
        <p className="text-xs leading-relaxed opacity-90">{meta.desc}</p>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
        <span className="text-sm font-bold text-slate-700">{meta.cta}</span>
        <span className="text-teal-500"><ArrowIcon /></span>
      </div>
    </Link>
  )
}

export function MedicationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [cat, setCat] = useState('ALL')
  const urlQuery = searchParams.get('q') || ''

  useEffect(() => {
    if (urlQuery) {
      const t = setTimeout(() => {
        setSearchParams(p => { p.delete('q'); return p }, { replace: true })
      }, 100)
      return () => clearTimeout(t)
    }
  }, [])

  const { data: medications = [], isLoading } = useQuery({
    queryKey: ['medications-page', cat],
    queryFn: async () => {
      let q = supabase
        .from('medications')
        .select('id,commercial_name,generic_name,dosage,pharmaceutical_form,category,requires_prescription,package_size')
        .eq('is_visible', true)
        .is('deleted_at', null)
        .order('commercial_name')

      if (cat !== 'ALL') q = q.eq('category', cat)

      const { data } = await q.limit(120)
      return data || []
    },
  })

  const filtered = useMemo(() => {
    if (!urlQuery.trim()) return medications
    const q = urlQuery.toLowerCase()
    return medications.filter(m =>
      m.commercial_name?.toLowerCase().includes(q) ||
      m.generic_name?.toLowerCase().includes(q)
    )
  }, [medications, urlQuery])

  const countLabel = `${filtered.length} medicamento${filtered.length === 1 ? '' : 's'}`

  const handleCat = (val) => {
    setCat(val)
    setSearchParams(p => { p.delete('q'); return p }, { replace: true })
  }

  return (
    <div className="bg-[linear-gradient(180deg,#f8fffe_0%,#ffffff_26%,#ffffff_100%)] min-h-[82svh]">
      <div className="page-wrap py-10 md:py-12">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-8 items-end mb-8 md:mb-10">
          <div>
            <p className="section-label mb-2">O que temos disponível</p>
            <h1 className="text-3xl md:text-5xl font-extrabold text-slate-950 mb-3 tracking-tight text-balance">
              Encontre o medicamento e veja como pedir
            </h1>
            <p className="text-slate-500 text-base md:text-lg leading-relaxed max-w-2xl">
              Medicamentos simples, com receita ou com acompanhamento especial — indicamos logo o que é necessário para cada caso.
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-2 shadow-card-lg">
            <MedicationSearch size="md" initialQuery={urlQuery} />
          </div>
        </div>

        {urlQuery && (
          <div className="flex items-center gap-3 mb-5 max-w-3xl">
            <div className="flex-1 flex items-center gap-2 rounded-xl bg-teal-50 border border-teal-200 px-4 py-2.5">
              <svg className="w-4 h-4 text-teal-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
              </svg>
              <p className="text-sm font-semibold text-teal-800">
                A mostrar resultados para <span className="italic">"{urlQuery}"</span>
              </p>
            </div>
            <Link to="/medicamentos" replace className="text-sm font-semibold text-slate-500 hover:text-slate-800 whitespace-nowrap transition-colors">
              Limpar
            </Link>
          </div>
        )}

        <div className="scroll-x flex gap-2 pb-2 mb-8">
          {CATS.map((c) => (
            <button
              key={c.value}
              onClick={() => handleCat(c.value)}
              className={`px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-150 shrink-0 border ${
                cat === c.value
                  ? 'bg-navy-950 text-white border-navy-950'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-teal-200 hover:text-teal-700'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {cat !== 'ALL' && (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 mb-8 shadow-card-sm">
            <p className="text-xs font-extrabold uppercase tracking-widest text-teal-600 mb-1">
              {CATS.find(c => c.value === cat)?.label}
            </p>
            <p className="text-sm text-slate-500">
              {CATEGORY_META[cat]?.desc || CATS.find(c => c.value === cat)?.desc}
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Spinner size="lg" />
            <p className="text-sm text-slate-400">A carregar medicamentos...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card-lg text-center py-16 px-6 border border-slate-200 bg-white">
            <div className="flex justify-center mb-4">
              <SearchOffIcon />
            </div>
            <p className="font-bold text-slate-800 mb-2 text-lg">Nenhum medicamento encontrado</p>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-5">
              {urlQuery
                ? `Não encontrámos resultados para "${urlQuery}". Tente outro nome ou limpe a pesquisa.`
                : 'Tente outro nome ou mude o tipo de pedido.'}
            </p>
            {urlQuery && (
              <Link to="/medicamentos" replace className="btn-secondary inline-flex">
                Limpar pesquisa
              </Link>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-400 font-medium mb-4">{countLabel}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((med) => <MedicationCard key={med.id} med={med} />)}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
