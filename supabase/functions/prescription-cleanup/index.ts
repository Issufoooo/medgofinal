/**
 * MedGo — prescription-cleanup Edge Function
 * Apaga ficheiros de receita expirados do bucket prescription-uploads.
 * Bucket correcto: prescription-uploads (nunca "prescriptions")
 *
 * Deploy:  supabase functions deploy prescription-cleanup
 * Cron:    0 * * * *  (cada hora)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Bucket correcto
const BUCKET = 'prescription-uploads'

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const results = { deleted: 0, errors: 0, skipped: 0 }

  try {
    const { data: expired, error: fetchErr } = await supabase
      .from('prescription_refs')
      .select('id, order_id, storage_path, expires_at')
      .lt('expires_at', new Date().toISOString())
      .is('cleaned_up_at', null)
      .limit(100)

    if (fetchErr) throw fetchErr
    if (!expired?.length) {
      return new Response(
        JSON.stringify({ message: 'Nada a limpar.', ...results }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    for (const ref of expired) {
      try {
        const { error: storErr } = await supabase.storage
          .from(BUCKET)
          .remove([ref.storage_path])

        if (storErr) {
          console.warn(`[cleanup] Storage error for ${ref.storage_path}:`, storErr.message)
          results.errors++
          continue
        }

        await supabase.from('prescription_refs')
          .update({ cleaned_up_at: new Date().toISOString() })
          .eq('id', ref.id)

        await supabase.from('action_logs').insert({
          action: 'PRESCRIPTION_FILE_DELETED',
          entity_type: 'order', entity_id: ref.order_id,
          metadata: { storage_path: ref.storage_path, expired_at: ref.expires_at },
        })

        results.deleted++
      } catch (err) {
        console.error(`[cleanup] Failed ref ${ref.id}:`, err)
        results.errors++
      }
    }

    return new Response(
      JSON.stringify({ message: 'Cleanup concluído.', ...results }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
