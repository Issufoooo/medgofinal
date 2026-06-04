import { supabase } from '../lib/supabase'

// Bucket correcto: prescription-uploads (não "prescriptions")
const BUCKET = 'prescription-uploads'

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
const MAX_SIZE_MB   = 10
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

export function validatePrescriptionFile(file) {
  const errors = []
  if (!ALLOWED_TYPES.includes(file.type)) {
    errors.push(`Tipo não suportado: ${file.type}. Use JPG, PNG, WEBP ou PDF.`)
  }
  if (file.size > MAX_SIZE_BYTES) {
    errors.push(`Ficheiro demasiado grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo ${MAX_SIZE_MB}MB.`)
  }
  return errors
}

export async function uploadPrescription(orderId, file) {
  const validationErrors = validatePrescriptionFile(file)
  if (validationErrors.length) {
    throw new Error(validationErrors.join(' '))
  }

  const ext  = file.name.split('.').pop().toLowerCase()
  const path = `${orderId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })

  if (uploadErr) throw new Error('Upload falhou: ' + uploadErr.message)

  // Calcular data de expiração a partir do system_config
  let expiresAt = null
  const { data: cfg } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'prescription_timeout_minutes')
    .single()

  const minutes = parseInt(cfg?.value || '1440', 10)
  expiresAt = new Date(Date.now() + minutes * 60_000).toISOString()

  const { data: ref, error: refErr } = await supabase
    .from('prescription_refs')
    .insert({
      order_id:     orderId,
      storage_path: path,
      file_name:    file.name,
      file_size:    file.size,
      mime_type:    file.type,
      expires_at:   expiresAt,
    })
    .select()
    .single()

  if (refErr) throw new Error('Erro ao registar referência da receita: ' + refErr.message)

  // Actualizar o status da receita no pedido
  await supabase
    .from('orders')
    .update({ prescription_status: 'UPLOADED' })
    .eq('id', orderId)

  return { path, ref }
}

export async function getPrescriptionUrl(storagePath) {
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 3600) // 1h válido
  return data?.signedUrl || null
}

export async function getPrescriptionRefs(orderId) {
  const { data, error } = await supabase
    .from('prescription_refs')
    .select('*')
    .eq('order_id', orderId)
    .is('cleaned_up_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

/**
 * getPrescriptionSignedUrl(orderId)
 * Importado por OrderDetailPage. Recebe o order ID, busca o storage_path
 * da receita mais recente não-expirada, e devolve uma signed URL válida por 1h.
 */
export async function getPrescriptionSignedUrl(orderId) {
  const { data: refs, error } = await supabase
    .from('prescription_refs')
    .select('storage_path')
    .eq('order_id', orderId)
    .is('cleaned_up_at', null)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error || !refs?.length) return null

  return getPrescriptionUrl(refs[0].storage_path)
}

/**
 * approvePrescription — marca a receita do pedido como aprovada.
 */
export async function approvePrescription({ orderId, reviewedBy, reviewedByRole }) {
  const { error } = await supabase
    .from('orders')
    .update({ prescription_status: 'APPROVED' })
    .eq('id', orderId)

  if (error) throw new Error('Erro ao aprovar receita: ' + error.message)

  await supabase.from('action_logs').insert({
    actor_id:    reviewedBy   || null,
    actor_role:  reviewedByRole || null,
    action:      'PRESCRIPTION_APPROVED',
    entity_type: 'order',
    entity_id:   orderId,
    metadata:    { reviewed_by: reviewedBy },
  })
}

/**
 * rejectPrescription — marca a receita do pedido como rejeitada.
 */
export async function rejectPrescription({ orderId, reviewedBy, reviewedByRole, rejectReason, status }) {
  const { error } = await supabase
    .from('orders')
    .update({ prescription_status: status || 'REJECTED' })
    .eq('id', orderId)

  if (error) throw new Error('Erro ao rejeitar receita: ' + error.message)

  await supabase.from('action_logs').insert({
    actor_id:    reviewedBy   || null,
    actor_role:  reviewedByRole || null,
    action:      'PRESCRIPTION_REJECTED',
    entity_type: 'order',
    entity_id:   orderId,
    metadata:    { reason: rejectReason, status },
  })
}
