import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useNotificationStore } from '../../store/notificationStore'
import { useAuthStore } from '../../store/authStore'
import { Spinner } from '../ui/Spinner'

const CATEGORIES = ['FREE', 'PRESCRIPTION', 'RESTRICTED_MONITORED']

export function ItemForm({ initial, pharmacyId, onSave, onCancel, loading }) {
  const notify = useNotificationStore()
  const { profile } = useAuthStore()
  const qc = useQueryClient()
  const isEditing = !!initial

  const [mode, setMode]                   = useState('existing')
  const [medicationId, setMedicationId]   = useState(initial?.medication_id || '')
  const [quantity, setQuantity]           = useState(initial?.quantity ?? '')
  const [unitPrice, setUnitPrice]         = useState(initial?.unit_price ?? '')
  const [notes, setNotes]                 = useState(initial?.notes ?? '')
  const [creatingMedication, setCreatingMedication] = useState(false)
  const [errors, setErrors]               = useState({})
  const [newMedication, setNewMedication] = useState({
    commercial_name: '', generic_name: '', dosage: '',
    pharmaceutical_form: '', package_size: '', category: 'FREE',
  })

  const { data: medications = [], isLoading: medsLoading } = useQuery({
    queryKey: ['medications-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('medications')
        .select('id, commercial_name, generic_name, dosage, category')
        .eq('is_visible', true)
        .is('deleted_at', null)
        .order('commercial_name')
      return data || []
    },
    staleTime: 120_000,
  })

  const setNewMed = (key, value) => {
    setNewMedication(prev => ({ ...prev, [key]: value }))
    setErrors(prev => ({ ...prev, [key]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!pharmacyId) e.pharmacyId = 'Seleccione uma farmácia antes de adicionar stock.'
    if (mode === 'existing' && !medicationId) e.medicationId = 'Seleccione o medicamento'
    if (mode === 'new') {
      if (!newMedication.commercial_name.trim()) e.commercial_name = 'Nome comercial obrigatório'
      if (!CATEGORIES.includes(newMedication.category)) e.category = 'Categoria inválida'
    }
    if (quantity === '' || isNaN(parseInt(quantity))) e.quantity = 'Quantidade inválida'
    if (parseInt(quantity) < 0) e.quantity = 'Quantidade não pode ser negativa'
    if (unitPrice === '' || isNaN(parseFloat(unitPrice)) || parseFloat(unitPrice) < 0) e.unitPrice = 'Preço da farmácia obrigatório'
    return e
  }

  const createMedicationInsidePharmacy = async () => {
    const payload = {
      commercial_name:    newMedication.commercial_name.trim(),
      generic_name:       newMedication.generic_name.trim() || null,
      dosage:             newMedication.dosage.trim() || null,
      pharmaceutical_form: newMedication.pharmaceutical_form.trim() || null,
      package_size:       newMedication.package_size.trim() || null,
      category:           newMedication.category,
      requires_prescription: newMedication.category !== 'FREE',
      is_visible: true,
      created_by: profile?.id || null,
      notes: 'Criado pelo gestor de stock dentro do inventário de uma farmácia.',
    }

    const { data: existing } = await supabase.from('medications')
      .select('id').ilike('commercial_name', payload.commercial_name)
      .is('deleted_at', null).limit(1)

    if (existing?.length) return existing[0].id

    const { data, error } = await supabase.from('medications').insert(payload).select('id').single()
    if (error) throw new Error('Erro ao criar medicamento: ' + error.message)
    qc.invalidateQueries({ queryKey: ['medications-list'] })
    return data.id
  }

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }

    setCreatingMedication(true)
    try {
      let finalMedId = medicationId
      if (mode === 'new') {
        finalMedId = await createMedicationInsidePharmacy()
      }

      await onSave({
        pharmacyId,
        medicationId: finalMedId,
        quantity:  parseInt(quantity),
        unitPrice: parseFloat(unitPrice),
        notes:     notes.trim() || null,
      })
    } catch (err) {
      notify.error(err.message)
    } finally {
      setCreatingMedication(false)
    }
  }

  return (
    <div className="space-y-4">
      {errors.pharmacyId && <p className="field-error">{errors.pharmacyId}</p>}

      {!isEditing && (
        <div>
          <label className="label">Medicamento</label>
          <div className="flex gap-2 mb-3">
            {['existing', 'new'].map(m => (
              <button key={m} type="button" onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-xl border text-sm font-semibold transition-colors ${mode === m ? 'bg-teal-500 text-white border-teal-500' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {m === 'existing' ? 'Medicamento existente' : 'Criar novo medicamento'}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'existing' && !isEditing ? (
        <div>
          <select value={medicationId} onChange={e => { setMedicationId(e.target.value); setErrors(prev => ({ ...prev, medicationId: '' })) }} className="input" disabled={medsLoading}>
            <option value="">{medsLoading ? 'A carregar...' : 'Seleccionar medicamento...'}</option>
            {medications.map(m => (
              <option key={m.id} value={m.id}>{m.commercial_name}{m.dosage ? ` — ${m.dosage}` : ''} ({m.category})</option>
            ))}
          </select>
          {errors.medicationId && <p className="field-error">{errors.medicationId}</p>}
        </div>
      ) : mode === 'new' ? (
        <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Novo medicamento</p>
          <div>
            <label className="label">Nome comercial <span className="text-red-500">*</span></label>
            <input value={newMedication.commercial_name} onChange={e => setNewMed('commercial_name', e.target.value)} className="input" placeholder="Ex: Paracetamol 500mg Bayer" />
            {errors.commercial_name && <p className="field-error">{errors.commercial_name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nome genérico (DCI)</label>
              <input value={newMedication.generic_name} onChange={e => setNewMed('generic_name', e.target.value)} className="input" placeholder="Paracetamol" />
            </div>
            <div>
              <label className="label">Dosagem</label>
              <input value={newMedication.dosage} onChange={e => setNewMed('dosage', e.target.value)} className="input" placeholder="500mg" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Forma farmacêutica</label>
              <input value={newMedication.pharmaceutical_form} onChange={e => setNewMed('pharmaceutical_form', e.target.value)} className="input" placeholder="Comprimido" />
            </div>
            <div>
              <label className="label">Embalagem</label>
              <input value={newMedication.package_size} onChange={e => setNewMed('package_size', e.target.value)} className="input" placeholder="Caixa 20" />
            </div>
          </div>
          <div>
            <label className="label">Categoria <span className="text-red-500">*</span></label>
            <select value={newMedication.category} onChange={e => setNewMed('category', e.target.value)} className="input">
              <option value="FREE">FREE — Venda livre</option>
              <option value="PRESCRIPTION">PRESCRIPTION — Receita médica</option>
              <option value="RESTRICTED_MONITORED">RESTRICTED_MONITORED — Controlado</option>
            </select>
            {errors.category && <p className="field-error">{errors.category}</p>}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Quantidade em stock <span className="text-red-500">*</span></label>
          <input type="number" min="0" step="1" value={quantity} onChange={e => { setQuantity(e.target.value); setErrors(prev => ({ ...prev, quantity: '' })) }} className="input" placeholder="0" />
          {errors.quantity && <p className="field-error">{errors.quantity}</p>}
        </div>
        <div>
          <label className="label">Preço da farmácia (MZN) <span className="text-red-500">*</span></label>
          <input type="number" min="0" step="0.01" value={unitPrice} onChange={e => { setUnitPrice(e.target.value); setErrors(prev => ({ ...prev, unitPrice: '' })) }} className="input" placeholder="0.00" />
          {errors.unitPrice && <p className="field-error">{errors.unitPrice}</p>}
        </div>
      </div>

      <div>
        <label className="label">Notas (opcional)</label>
        <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className="input resize-none" placeholder="Ex: Refrigerar a 2-8°C" />
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={onCancel} className="btn-secondary flex-1">Cancelar</button>
        <button onClick={handleSubmit} disabled={loading || creatingMedication} className="btn-primary flex-1">
          {(loading || creatingMedication) && <Spinner size="sm" />}
          {initial ? 'Actualizar' : mode === 'new' ? 'Criar e ligar à farmácia' : 'Adicionar'}
        </button>
      </div>
    </div>
  )
}
