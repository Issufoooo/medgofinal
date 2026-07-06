import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { CategoryBadge } from '../ui/Badge'
import { Spinner } from '../ui/Spinner'

export function MedicationSearch({ size = 'lg', autoFocus = false, initialQuery = '' }) {
  const navigate   = useNavigate()
  const [query,     setQuery]     = useState(initialQuery)
  const [results,   setResults]   = useState([])
  const [loading,   setLoading]   = useState(false)
  const [open,      setOpen]      = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const inputRef  = useRef(null)
  const listRef   = useRef(null)
  const timerRef  = useRef(null)
  const isLg      = size === 'lg'

  useEffect(() => {
    if (autoFocus) setTimeout(() => inputRef.current?.focus(), 50)
  }, [autoFocus])

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const fn = (e) => {
      if (!listRef.current?.contains(e.target) && !inputRef.current?.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  // Busca principal — ilike para prefix matching instantâneo
  // "par" → Paracetamol, "amox" → Amoxicilina, etc.
  const search = useCallback(async (q) => {
    const trimmed = q.trim()

    // Sem texto → mostrar venda livre
    if (trimmed.length === 0) {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('medications')
          .select('id, commercial_name, generic_name, dosage, category, requires_prescription')
          .eq('category', 'FREE')
          .eq('is_visible', true)
          .is('deleted_at', null)
          .order('commercial_name', { ascending: true })
          .limit(8)
        setResults(data || [])
        setOpen(true)
        setActiveIdx(-1)
      } catch { /* silent */ } finally {
        setLoading(false)
      }
      return
    }

    // Com texto → prefix ilike em nome comercial + genérico
    setLoading(true)
    try {
      // Tenta primeiro nome comercial começa por q (ex: "par" → Paracetamol)
      const { data: prefixData } = await supabase
        .from('medications')
        .select('id, commercial_name, generic_name, dosage, category, requires_prescription')
        .or(`commercial_name.ilike.${trimmed}%,generic_name.ilike.${trimmed}%`)
        .eq('is_visible', true)
        .is('deleted_at', null)
        .order('commercial_name', { ascending: true })
        .limit(6)

      // Se prefix não deu resultados suficientes, tenta contém (ex: "cilina" → Amoxicilina)
      let combined = prefixData || []
      if (combined.length < 3 && trimmed.length >= 2) {
        const { data: containsData } = await supabase
          .from('medications')
          .select('id, commercial_name, generic_name, dosage, category, requires_prescription')
          .or(`commercial_name.ilike.%${trimmed}%,generic_name.ilike.%${trimmed}%`)
          .eq('is_visible', true)
          .is('deleted_at', null)
          .order('commercial_name', { ascending: true })
          .limit(8)

        // Merge sem duplicados
        const ids = new Set(combined.map(m => m.id))
        const extra = (containsData || []).filter(m => !ids.has(m.id))
        combined = [...combined, ...extra].slice(0, 8)
      }

      setResults(combined)
      setOpen(true)
      setActiveIdx(-1)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (e) => {
    const v = e.target.value
    setQuery(v)
    clearTimeout(timerRef.current)
    // 150ms — rápido o suficiente para parecer instantâneo
    timerRef.current = setTimeout(() => search(v), 150)
  }

  const handleFocus = () => {
    if (open && results.length > 0) return
    search(query)
  }

  const handleSelect = (med) => {
    setOpen(false)
    setQuery('')
    navigate(`/pedido/${med.id}`)
  }

  const handleKeyDown = (e) => {
    if (!open || !results.length) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIdx(i => Math.min(i + 1, results.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIdx(i => Math.max(i - 1, -1))
        break
      case 'Enter':
        if (activeIdx >= 0) { e.preventDefault(); handleSelect(results[activeIdx]) }
        break
      case 'Escape':
        setOpen(false)
        break
    }
  }

  return (
    <div className="relative w-full">
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          {loading
            ? <Spinner size="sm" />
            : (
              <svg className={isLg ? 'w-5 h-5' : 'w-4 h-4'} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
              </svg>
            )
          }
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder="ex: Paracetamol, Amoxicilina..."
          className={`w-full bg-white text-slate-900 placeholder:text-slate-400 border-0 focus:ring-0 focus:outline-none transition-all duration-150 ${
            isLg ? 'pl-12 pr-4 py-4 text-base rounded-2xl' : 'pl-10 pr-4 py-3 text-sm rounded-xl input'
          }`}
          autoComplete="off"
          aria-label="Pesquisar medicamento"
          aria-autocomplete="list"
          aria-expanded={open}
        />
      </div>

      {open && (
        <ul
          ref={listRef}
          className="absolute z-50 w-full mt-3 bg-white rounded-3xl shadow-card-xl border border-slate-100 overflow-hidden animate-scale-in"
          role="listbox"
        >
          {/* Header quando sem texto */}
          {query.trim().length === 0 && results.length > 0 && (
            <li className="px-5 pt-3 pb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Medicamentos de venda livre
              </span>
            </li>
          )}

          {results.length === 0 && !loading && query.trim().length > 0 && (
            <li className="px-5 py-6 text-sm text-slate-500 text-center">
              Nenhum resultado para <strong>"{query}"</strong>
              <p className="text-xs text-slate-400 mt-1">Verifique a ortografia ou tente um nome genérico</p>
            </li>
          )}

          {results.map((med, i) => (
            <li
              key={med.id}
              role="option"
              aria-selected={i === activeIdx}
              onClick={() => handleSelect(med)}
              className={`flex items-start justify-between gap-3 px-5 py-3.5 cursor-pointer border-b border-slate-50 last:border-0 transition-colors duration-100 ${
                i === activeIdx ? 'bg-teal-50' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex-1 min-w-0">
                {/* Highlight da parte que bate com a query */}
                <p className="font-semibold text-slate-900 text-sm leading-tight">
                  {query.trim().length > 0
                    ? <HighlightMatch text={med.commercial_name} query={query.trim()} />
                    : med.commercial_name
                  }
                </p>
                {(med.generic_name || med.dosage) && (
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {[med.generic_name, med.dosage].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <CategoryBadge category={med.category} />
                <svg className="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </li>
          ))}

          {results.length > 0 && (
            <li
              onClick={() => { setOpen(false); navigate(`/medicamentos?q=${encodeURIComponent(query)}`) }}
              className="px-5 py-3 text-sm text-teal-700 font-semibold text-center cursor-pointer hover:bg-teal-50 border-t border-slate-100 transition-colors"
            >
              Ver todos os resultados →
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

// Realça a parte do texto que bate com a query
function HighlightMatch({ text, query }) {
  if (!query || !text) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: '#ccfbf1', color: '#0f766e', borderRadius: 3, padding: '0 1px' }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}
