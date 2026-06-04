-- ═══════════════════════════════════════════════════════════════════════════
-- MedGo — 01_storage.sql
-- Buckets e policies de storage.
-- Executar DEPOIS de 00_schema_base.sql.
-- ═══════════════════════════════════════════════════════════════════════════

-- Bucket: prescription-uploads (privado — acesso só via service role ou signed URL)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'prescription-uploads',
  'prescription-uploads',
  FALSE,
  10485760, -- 10MB
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg','image/jpg','image/png','image/webp','application/pdf'];

-- Policy: cliente anon pode fazer upload de receita
CREATE POLICY "anon_upload_prescription"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'prescription-uploads');

-- Policy: operador e owner podem ver receitas
CREATE POLICY "staff_view_prescriptions"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'prescription-uploads'
  AND (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('owner','operator')
        AND is_active = TRUE
    )
  )
);

-- Policy: owner pode apagar ficheiros (cleanup manual)
CREATE POLICY "owner_delete_prescriptions"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'prescription-uploads'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'owner' AND is_active = TRUE
  )
);
