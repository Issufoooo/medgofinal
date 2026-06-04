/**
 * StockManagerDashboard — functional sections controlled from the main sidebar.
 * Sections: Visão geral | Inventário | Importar Excel | Regularizações | Movimentos | Farmácias
 */

import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useNotificationStore } from '../../store/notificationStore'
import { useInventoryOverview, useInventoryUploads, useStockSummary, useUpsertInventoryItem, useAdjustInventory } from '../../hooks/useInventory'
import { usePharmacies } from '../../hooks/usePharmacies'
import { Modal } from '../../components/ui/Modal'
import { Alert } from '../../components/ui/Alert'
import { WithErrorBoundary } from '../../components/ErrorBoundary'

import { SummaryBar }             from '../../components/stock/SummaryBar'
import { GlobalInventorySearch }  from '../../components/stock/GlobalInventorySearch'
import { PharmacyInventoryTable } from '../../components/stock/PharmacyInventoryTable'
import { MovementHistory }        from '../../components/stock/MovementHistory'
import { AdjustForm }             from '../../components/stock/AdjustForm'
import { ExcelImportModal }       from '../../components/stock/ExcelImportModal'
import { OperationsBoard }        from '../../components/stock/OperationsBoard'
import { ItemForm }               from '../../components/stock/ItemForm'
import { downloadExcelTemplate, daysSince, isStale, STALE_STOCK_DAYS } from '../../components/stock/stockUtils'

// ── Icons ──────────────────────────────────────────────────────
function IOverview()   { return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg> }
function IInventory()  { return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg> }
function IImport()     { return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg> }
function IAdjust()     { return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg> }
function IMovements()  { return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> }
function IPharmacy()   { return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg> }
function ISearch()     { return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg> }
function IPlus()       { return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg> }
function IWarning()    { return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg> }
function ICheck()      { return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg> }
function IDownload()   { return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg> }


const VALID_TAB_IDS = new Set(['overview', 'inventory', 'import', 'adjustments', 'movements', 'pharmacies'])

function dateLabel(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-MZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function latestUploadFor(uploads, pharmacyId) {
  return (uploads || [])
    .filter(u => u.pharmacy_id === pharmacyId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
}

// ── Tab configuration ─────────────────────────────────────────
const TABS = [
  {
    id: 'overview',
    label: 'Visão geral',
    Icon: IOverview,
    desc: 'Saúde geral do inventário, alertas críticos e fluxo de trabalho',
  },
  {
    id: 'inventory',
    label: 'Inventário',
    Icon: IInventory,
    desc: 'Gerir stock por farmácia — preços, quantidades e disponibilidade',
  },
  {
    id: 'import',
    label: 'Importar Excel',
    Icon: IImport,
    desc: 'Carregar planilha da farmácia para sincronizar o inventário',
  },
  {
    id: 'adjustments',
    label: 'Regularizações',
    Icon: IAdjust,
    desc: 'Ajustes manuais de quantidade com justificação obrigatória',
  },
  {
    id: 'movements',
    label: 'Movimentos',
    Icon: IMovements,
    desc: 'Registo completo de todas as entradas, saídas e sincronizações',
  },
  {
    id: 'pharmacies',
    label: 'Farmácias',
    Icon: IPharmacy,
    desc: 'Última actualização e estado do inventário por farmácia parceira',
  },
]

// ── Tab bar ───────────────────────────────────────────────────
function TabBar({ active, onSelect, criticalCount }) {
  return (
    <div className="card overflow-hidden mb-4">
      {/* Tab buttons */}
      <div className="border-b border-slate-100 bg-slate-50/60 px-1.5 pt-1.5">
        <div className="flex gap-0.5 overflow-x-auto scroll-x pb-0" style={{ WebkitOverflowScrolling: 'touch' }}>
          {TABS.map((tab) => {
            const isActive = active === tab.id
            const badge = tab.id === 'inventory' && criticalCount > 0 ? criticalCount : null
            return (
              <button
                key={tab.id}
                onClick={() => onSelect(tab.id)}
                className={`
                  group relative flex shrink-0 items-center gap-2 px-3 py-2 text-sm font-semibold
                  transition-all rounded-t-lg border-b-2
                  ${isActive
                    ? 'bg-white text-teal-700 border-b-teal-500 shadow-sm'
                    : 'text-slate-500 border-b-transparent hover:text-slate-800 hover:bg-white/60'
                  }
                `}
              >
                <span className={`shrink-0 ${isActive ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-600'} transition-colors`}>
                  <tab.Icon />
                </span>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden text-xs">{tab.label.split(' ')[0]}</span>
                {badge && (
                  <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-extrabold text-white leading-none">
                    {badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
      {/* Active tab description */}
      {TABS.filter(t => t.id === active).map(tab => (
        <div key={tab.id} className="flex items-center gap-2 px-3.5 py-2 bg-white">
          <span className="text-teal-500 shrink-0"><tab.Icon /></span>
          <div>
            <span className="text-xs font-extrabold text-slate-800 mr-2">{tab.label}</span>
            <span className="text-xs text-slate-400">{tab.desc}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Pharmacy sidebar (shared across tabs) ─────────────────────
function PharmacySidebar({ pharmacies, loading, activeId, onSelect }) {
  return (
    <aside className="lg:w-56 xl:w-60 shrink-0 space-y-1">
      <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest px-1 mb-2">Farmácias</p>
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-12 rounded-xl" />)}</div>
      ) : pharmacies.length === 0 ? (
        <div className="card p-4 text-center text-sm text-slate-400">Sem farmácias activas.</div>
      ) : pharmacies.map(p => (
        <button
          key={p.id}
          onClick={() => onSelect(p.id)}
          className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors text-sm font-medium border ${
            activeId === p.id
              ? 'bg-teal-50 border-teal-200 text-teal-700'
              : 'text-slate-600 hover:bg-slate-50 border-transparent'
          }`}
        >
          <p className="font-semibold truncate">{p.name}</p>
          {p.address && <p className="text-xs text-slate-400 truncate mt-0.5">{p.address}</p>}
        </button>
      ))}
    </aside>
  )
}

// ── TAB: Visão geral ──────────────────────────────────────────
function TabOverview({ stats, statsLoading, overview, pharmacies, activePharmacyName, onImport, onTemplate }) {
  return (
    <div className="space-y-4">
      <WithErrorBoundary minimal>
        <SummaryBar stats={stats} loading={statsLoading} />
      </WithErrorBoundary>
      <WithErrorBoundary minimal>
        <OperationsBoard
          overview={overview}
          pharmacies={pharmacies}
          activePharmacyName={activePharmacyName}
          onImport={onImport}
          onTemplate={onTemplate}
        />
      </WithErrorBoundary>
    </div>
  )
}

// ── TAB: Inventário por farmácia ──────────────────────────────
function TabInventory({ pharmacies, pharmsLoading, activePharmacy, setActivePharmacy, notify, upsertMutation, adjustMutation }) {
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [modal, setModal]             = useState(null)
  const activePharmacyName            = pharmacies.find(p => p.id === activePharmacy)?.name || ''
  const isSearching                   = search.length > 1 || statusFilter !== 'ALL'

  const handleSaveItem = async (form) => {
    try {
      await upsertMutation.mutateAsync(form)
      notify.success(modal?.id ? 'Stock actualizado.' : 'Medicamento adicionado ao inventário.')
      setModal(null)
    } catch (err) { notify.error(err.message) }
  }

  const handleAdjust = async (form) => {
    try {
      await adjustMutation.mutateAsync(form)
      notify.success('Ajuste de stock aplicado.')
      setModal(null)
    } catch (err) { notify.error(err.message) }
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><ISearch /></span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar medicamento em todas as farmácias..."
            className="input pl-10"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 btn-icon-sm">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input sm:w-48 shrink-0">
          <option value="ALL">Todos os estados</option>
          <option value="IN_STOCK">Em stock</option>
          <option value="LOW_STOCK">Stock baixo</option>
          <option value="OUT_OF_STOCK">Sem stock</option>
        </select>
      </div>

      {isSearching ? (
        <WithErrorBoundary minimal>
          <GlobalInventorySearch search={search} statusFilter={statusFilter} />
        </WithErrorBoundary>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4">
          <PharmacySidebar
            pharmacies={pharmacies}
            loading={pharmsLoading}
            activeId={activePharmacy}
            onSelect={setActivePharmacy}
          />
          {activePharmacy ? (
            <div className="flex-1 min-w-0 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-extrabold text-slate-900 text-lg leading-tight">{activePharmacyName}</h2>
                <button onClick={() => setModal('add')} className="btn-primary flex items-center gap-2">
                  <IPlus /> Adicionar medicamento
                </button>
              </div>
              <WithErrorBoundary minimal>
                <PharmacyInventoryTable
                  pharmacyId={activePharmacy}
                  pharmacyName={activePharmacyName}
                  onAdd={() => setModal('add')}
                  onEdit={item => setModal({ ...item, _type: 'edit' })}
                  onAdjust={item => setModal({ ...item, _type: 'adjust' })}
                  onHistory={() => {}}
                />
              </WithErrorBoundary>
            </div>
          ) : (
            <div className="flex-1 card p-12 text-center">
              <p className="text-slate-400 text-sm">Seleccione uma farmácia para gerir o stock.</p>
            </div>
          )}
        </div>
      )}

      <Modal open={modal === 'add'} onClose={() => setModal(null)} title="Adicionar medicamento ao inventário" size="md">
        <ItemForm pharmacyId={activePharmacy} onSave={handleSaveItem} onCancel={() => setModal(null)} loading={upsertMutation.isPending} />
      </Modal>
      <Modal open={!!modal && modal !== 'add' && modal?._type === 'edit'} onClose={() => setModal(null)} title="Editar stock" size="md">
        {modal && modal._type === 'edit' && (
          <ItemForm initial={modal} pharmacyId={activePharmacy} onSave={handleSaveItem} onCancel={() => setModal(null)} loading={upsertMutation.isPending} />
        )}
      </Modal>
      <Modal open={!!modal && modal?._type === 'adjust'} onClose={() => setModal(null)} title="Ajustar stock" size="sm">
        {modal && modal._type === 'adjust' && (
          <AdjustForm item={modal} onSave={handleAdjust} onCancel={() => setModal(null)} loading={adjustMutation.isPending} />
        )}
      </Modal>
    </div>
  )
}

// ── TAB: Importar Excel ───────────────────────────────────────
function TabImport({ pharmacies, activePharmacy, setActivePharmacy, onImport, onTemplate, uploads }) {
  const activePharmacyName = pharmacies.find(p => p.id === activePharmacy)?.name || ''

  return (
    <div className="space-y-4">
      {/* Flow steps */}
      <div className="grid gap-3 md:grid-cols-3">
        {[
          {
            step: '1',
            title: 'Baixar modelo',
            desc: 'Use o modelo Excel oficial com as colunas correctas antes de enviar à farmácia.',
            cta: 'Baixar modelo Excel',
            icon: IDownload,
            action: onTemplate,
            variant: 'secondary',
          },
          {
            step: '2',
            title: 'Farmácia preenche',
            desc: 'A farmácia insere o nome do medicamento, preço unitário e quantidade disponível no Excel.',
            icon: IPharmacy,
          },
          {
            step: '3',
            title: 'Importar e validar',
            desc: 'Carregue o ficheiro aqui. O sistema mostra criados, actualizados e erros linha a linha.',
            cta: activePharmacy ? `Importar para ${activePharmacyName}` : 'Seleccione farmácia primeiro',
            icon: IImport,
            action: activePharmacy ? onImport : null,
            variant: 'primary',
          },
        ].map((item) => {
          const Icon = item.icon
          return (
            <div key={item.step} className="card p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 border border-teal-100 text-teal-700 text-sm font-extrabold shrink-0">
                  {item.step}
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 shrink-0">
                  <Icon />
                </div>
              </div>
              <div className="flex-1">
                <p className="font-extrabold text-slate-900">{item.title}</p>
                <p className="mt-1 text-sm text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
              {item.cta && (
                <button
                  onClick={item.action || undefined}
                  disabled={!item.action}
                  className={`btn-${item.variant || 'secondary'} w-full flex items-center justify-center gap-2 ${!item.action ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {item.icon === IImport && <IImport />}
                  {item.icon === IDownload && <IDownload />}
                  {item.cta}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Pharmacy selector */}
      <div className="card p-4">
        <p className="text-sm font-extrabold text-slate-900 mb-1">Farmácia activa para importação</p>
        <p className="text-xs text-slate-400 mb-3">Todos os dados do Excel serão associados à farmácia seleccionada.</p>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <select
            value={activePharmacy || ''}
            onChange={e => setActivePharmacy(e.target.value || null)}
            className="input sm:w-72"
          >
            <option value="">Seleccione uma farmácia...</option>
            {pharmacies.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {activePharmacy && (
            <button onClick={onImport} className="btn-primary flex items-center gap-2 shrink-0">
              <IImport /> Importar ficheiro Excel
            </button>
          )}
        </div>
        {!activePharmacy && (
          <p className="mt-2 text-xs text-amber-600 flex items-center gap-1.5">
            <IWarning /> Seleccione uma farmácia para activar a importação.
          </p>
        )}
      </div>

      {/* Rules */}
      <div className="card p-4">
        <p className="text-sm font-extrabold text-slate-900 mb-3">Regras do ficheiro Excel</p>
        <div className="grid gap-2 sm:grid-cols-2 text-sm text-slate-600">
          {[
            { ok: true,  text: 'Nome comercial ou genérico na coluna A' },
            { ok: true,  text: 'Preço unitário (MZN) na coluna B — números apenas' },
            { ok: true,  text: 'Quantidade disponível na coluna C — inteiro positivo' },
            { ok: false, text: 'Não deixar linhas em branco no meio do ficheiro' },
            { ok: false, text: 'Não alterar o cabeçalho das colunas' },
            { ok: false, text: 'Não usar separadores de milhares no preço' },
          ].map((rule, i) => (
            <div key={i} className={`flex items-start gap-2 rounded-xl border p-3 ${rule.ok ? 'border-green-100 bg-green-50' : 'border-red-50 bg-red-50/60'}`}>
              <span className={`shrink-0 mt-0.5 ${rule.ok ? 'text-green-600' : 'text-red-400'}`}>
                {rule.ok ? <ICheck /> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>}
              </span>
              <span className={`text-xs ${rule.ok ? 'text-green-800' : 'text-red-700'}`}>{rule.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Import history */}
      <div className="card p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-sm font-extrabold text-slate-900">Histórico de importações</p>
            <p className="text-xs text-slate-400">Cada Excel importado fica registado com linhas criadas, actualizadas e falhadas.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">{uploads?.length || 0} registo(s)</span>
        </div>
        {(!uploads || uploads.length === 0) ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-400">
            Ainda não há importações registadas.
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {uploads.slice(0, 8).map(upload => (
              <div key={upload.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-slate-800">{upload.file_name || 'Upload sem nome'}</p>
                    <p className="mt-0.5 text-xs text-slate-500 truncate">{upload.pharmacy?.name || 'Farmácia'} · {dateLabel(upload.created_at)}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-bold text-slate-500 border border-slate-200">
                    {upload.valid_rows}/{upload.total_rows} válidas
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {upload.created_count} criados · {upload.updated_count} actualizados · {upload.failed_count} falhados
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── TAB: Regularizações ───────────────────────────────────────
function TabAdjustments({ pharmacies, pharmsLoading, activePharmacy, setActivePharmacy, notify, adjustMutation }) {
  const [adjustModal, setAdjustModal] = useState(null)
  const activePharmacyName = pharmacies.find(p => p.id === activePharmacy)?.name || ''

  const handleAdjust = async (form) => {
    try {
      await adjustMutation.mutateAsync(form)
      notify.success('Regularização aplicada.')
      setAdjustModal(null)
    } catch (err) { notify.error(err.message) }
  }

  return (
    <div className="space-y-4">
      {/* Rules panel */}
      <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <span className="shrink-0 text-amber-600 mt-0.5"><IWarning /></span>
          <div>
            <p className="text-sm font-extrabold text-amber-900 mb-2">Regras de regularização de stock</p>
            <div className="grid sm:grid-cols-3 gap-2 text-xs text-amber-800">
              <div className="flex items-start gap-1.5">
                <ICheck /><span>Cada ajuste exige uma justificação escrita obrigatória</span>
              </div>
              <div className="flex items-start gap-1.5">
                <ICheck /><span>O stock não pode ficar negativo após o ajuste</span>
              </div>
              <div className="flex items-start gap-1.5">
                <ICheck /><span>Todos os ajustes ficam registados com responsável e data</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <PharmacySidebar
          pharmacies={pharmacies}
          loading={pharmsLoading}
          activeId={activePharmacy}
          onSelect={setActivePharmacy}
        />

        {activePharmacy ? (
          <div className="flex-1 min-w-0 space-y-4">
            <div>
              <h2 className="font-extrabold text-slate-900 text-base leading-tight">{activePharmacyName}</h2>
              <p className="text-sm text-slate-500 mt-0.5">Clique em <strong>Ajustar</strong> na linha de um medicamento para registar uma regularização.</p>
            </div>
            <WithErrorBoundary minimal>
              <PharmacyInventoryTable
                pharmacyId={activePharmacy}
                pharmacyName={activePharmacyName}
                onAdjust={item => setAdjustModal(item)}
                onAdd={() => {}}
                onEdit={() => {}}
                onHistory={() => {}}
              />
            </WithErrorBoundary>
            <div>
              <p className="text-sm font-extrabold text-slate-700 mb-3">Histórico de movimentos — {activePharmacyName}</p>
              <WithErrorBoundary minimal>
                <MovementHistory pharmacyId={activePharmacy} />
              </WithErrorBoundary>
            </div>
          </div>
        ) : (
          <div className="flex-1 card p-12 text-center">
            <p className="text-slate-400 text-sm">Seleccione uma farmácia para ver itens e fazer regularizações.</p>
          </div>
        )}
      </div>

      <Modal open={!!adjustModal} onClose={() => setAdjustModal(null)} title="Regularização de stock" size="sm">
        {adjustModal && (
          <AdjustForm item={adjustModal} onSave={handleAdjust} onCancel={() => setAdjustModal(null)} loading={adjustMutation.isPending} />
        )}
      </Modal>
    </div>
  )
}

// ── TAB: Movimentos ───────────────────────────────────────────
function TabMovements({ pharmacies, pharmsLoading, activePharmacy, setActivePharmacy }) {
  const activePharmacyName = pharmacies.find(p => p.id === activePharmacy)?.name || ''
  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-4">
        <PharmacySidebar
          pharmacies={pharmacies}
          loading={pharmsLoading}
          activeId={activePharmacy}
          onSelect={setActivePharmacy}
        />
        {activePharmacy ? (
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <h2 className="font-extrabold text-slate-900 text-base leading-tight">{activePharmacyName}</h2>
              <p className="text-sm text-slate-500 mt-0.5">Todos os movimentos de stock desta farmácia — sincronizações, ajustes, reservas e consumos.</p>
            </div>
            <WithErrorBoundary minimal>
              <MovementHistory pharmacyId={activePharmacy} />
            </WithErrorBoundary>
          </div>
        ) : (
          <div className="flex-1 card p-12 text-center">
            <p className="text-slate-400 text-sm">Seleccione uma farmácia para ver o histórico de movimentos.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── TAB: Farmácias ────────────────────────────────────────────
function TabPharmacies({ pharmacies, pharmsLoading, overview, uploads }) {
  if (pharmsLoading) {
    return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[1,2,3,4,5,6].map(i => <div key={i} className="skeleton h-28 rounded-2xl" />)}</div>
  }

  if (pharmacies.length === 0) {
    return (
      <div className="card p-12 text-center">
        <p className="font-extrabold text-slate-700">Sem farmácias activas</p>
        <p className="mt-1 text-sm text-slate-400">Configure farmácias parceiras na área de Farmácias e disponibilidade do painel do proprietário.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {pharmacies.map(p => {
          const rows   = overview.filter(i => i.pharmacy_id === p.id)
          const lastUpload = latestUploadFor(uploads, p.id)
          const newest = lastUpload?.created_at || rows.map(i => i.last_synced_at || i.updated_at).filter(Boolean).sort((a, b) => new Date(b) - new Date(a))[0]
          const days   = daysSince(newest)
          const stale  = isStale(newest)
          const outOfStock = rows.filter(i => i.status === 'OUT_OF_STOCK').length
          const lowStock   = rows.filter(i => i.status === 'LOW_STOCK').length
          const noPrice    = rows.filter(i => !i.unit_price || Number(i.unit_price) <= 0).length

          return (
            <div key={p.id} className={`card p-4 border-l-4 ${stale ? 'border-l-amber-400' : 'border-l-green-400'}`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <p className="font-extrabold text-slate-900 truncate">{p.name}</p>
                  {p.address && <p className="text-xs text-slate-400 truncate mt-0.5">{p.address}</p>}
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-bold ${
                  stale ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-green-50 text-green-700 border-green-200'
                }`}>
                  {days == null ? 'sem data' : days === 0 ? 'hoje' : `${days}d atrás`}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className={`rounded-xl p-2 ${outOfStock > 0 ? 'bg-red-50 border border-red-100' : 'bg-slate-50 border border-slate-100'}`}>
                  <p className={`text-lg font-extrabold ${outOfStock > 0 ? 'text-red-700' : 'text-slate-600'}`}>{outOfStock}</p>
                  <p className="text-[10px] text-slate-400 font-medium">sem stock</p>
                </div>
                <div className={`rounded-xl p-2 ${lowStock > 0 ? 'bg-amber-50 border border-amber-100' : 'bg-slate-50 border border-slate-100'}`}>
                  <p className={`text-lg font-extrabold ${lowStock > 0 ? 'text-amber-700' : 'text-slate-600'}`}>{lowStock}</p>
                  <p className="text-[10px] text-slate-400 font-medium">stock baixo</p>
                </div>
                <div className={`rounded-xl p-2 ${noPrice > 0 ? 'bg-orange-50 border border-orange-100' : 'bg-slate-50 border border-slate-100'}`}>
                  <p className={`text-lg font-extrabold ${noPrice > 0 ? 'text-orange-700' : 'text-slate-600'}`}>{noPrice}</p>
                  <p className="text-[10px] text-slate-400 font-medium">sem preço</p>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span>{rows.length} item(ns) · {lastUpload ? `upload ${dateLabel(lastUpload.created_at)}` : 'sem upload'}</span>
                {stale && rows.length > 0 && (
                  <span className="text-amber-600 font-semibold flex items-center gap-1"><IWarning /> Actualizar stock</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────
export function StockManagerDashboard() {
  const notify = useNotificationStore()
  const [searchParams] = useSearchParams()
  const activeTab = VALID_TAB_IDS.has(searchParams.get('tab')) ? searchParams.get('tab') : 'overview'
  const activeSection = TABS.find(t => t.id === activeTab) || TABS[0]
  const [activePharmacy, setActivePharmacy] = useState(null)
  const [showImport, setShowImport] = useState(false)

  const { data: pharmacies = [], isLoading: pharmsLoading } = usePharmacies({ includeInactive: false })
  const { data: summaryStats, isLoading: summaryLoading }   = useStockSummary()
  const { data: overviewAll = [] } = useInventoryOverview()
  const { data: uploads = [] } = useInventoryUploads({ limit: 80 })
  const upsertMutation  = useUpsertInventoryItem()
  const adjustMutation  = useAdjustInventory()

  // Auto-select first pharmacy
  useEffect(() => {
    if (!activePharmacy && pharmacies.length > 0) setActivePharmacy(pharmacies[0].id)
  }, [activePharmacy, pharmacies])

  const activePharmacyName = pharmacies.find(p => p.id === activePharmacy)?.name || ''
  const criticalCount      = summaryStats?.out_of_stock || 0

  const handleImport = () => {
    if (!activePharmacy) { notify.warning('Seleccione uma farmácia antes de importar.'); return }
    setShowImport(true)
  }

  return (
    <div className="mx-auto max-w-[1500px] px-3 py-4 pb-10 md:px-5">
      <header className="dashboard-header mb-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <p className="section-label mb-0.5">Inventário por farmácia</p>
            <h1 className="text-2xl font-extrabold leading-tight text-slate-950">{activeSection.label}</h1>
            <p className="dashboard-subtitle">{activeSection.desc}</p>
          </div>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="grid grid-cols-3 gap-2 text-center lg:w-[300px]">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2"><p className="text-base font-extrabold leading-none text-slate-950">{summaryStats?.total_items ?? 0}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">registos</p></div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-2"><p className="text-base font-extrabold leading-none text-amber-700">{summaryStats?.low_stock ?? 0}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-amber-600/70">baixo</p></div>
              <div className="rounded-xl border border-teal-200 bg-teal-50 px-2.5 py-2"><p className="text-base font-extrabold leading-none text-teal-700">{pharmacies.length}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-teal-600/70">farmácias</p></div>
            </div>
            <div className="flex gap-2">
              <button onClick={downloadExcelTemplate} className="btn-secondary px-3.5"><IDownload /> Modelo</button>
              <button onClick={handleImport} disabled={!activePharmacy} className="btn-primary px-3.5"><IImport /> Importar</button>
            </div>
          </div>
        </div>
      </header>

      {/* Section content. Section switching is controlled by the main dashboard menu, not by nested tabs. */}
      {activeTab === 'overview' && (
        <TabOverview
          stats={summaryStats}
          statsLoading={summaryLoading}
          overview={overviewAll}
          pharmacies={pharmacies}
          activePharmacyName={activePharmacyName}
          onImport={handleImport}
          onTemplate={downloadExcelTemplate}
        />
      )}

      {activeTab === 'inventory' && (
        <TabInventory
          pharmacies={pharmacies}
          pharmsLoading={pharmsLoading}
          activePharmacy={activePharmacy}
          setActivePharmacy={setActivePharmacy}
          notify={notify}
          upsertMutation={upsertMutation}
          adjustMutation={adjustMutation}
        />
      )}

      {activeTab === 'import' && (
        <TabImport
          pharmacies={pharmacies}
          activePharmacy={activePharmacy}
          setActivePharmacy={setActivePharmacy}
          onImport={handleImport}
          onTemplate={downloadExcelTemplate}
          uploads={uploads}
        />
      )}

      {activeTab === 'adjustments' && (
        <TabAdjustments
          pharmacies={pharmacies}
          pharmsLoading={pharmsLoading}
          activePharmacy={activePharmacy}
          setActivePharmacy={setActivePharmacy}
          notify={notify}
          adjustMutation={adjustMutation}
        />
      )}

      {activeTab === 'movements' && (
        <TabMovements
          pharmacies={pharmacies}
          pharmsLoading={pharmsLoading}
          activePharmacy={activePharmacy}
          setActivePharmacy={setActivePharmacy}
        />
      )}

      {activeTab === 'pharmacies' && (
        <TabPharmacies
          pharmacies={pharmacies}
          pharmsLoading={pharmsLoading}
          overview={overviewAll}
          uploads={uploads}
        />
      )}

      {/* Excel import modal */}
      {showImport && activePharmacy && (
        <ExcelImportModal
          pharmacyId={activePharmacy}
          pharmacyName={activePharmacyName}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  )
}
