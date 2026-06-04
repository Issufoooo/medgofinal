-- ═══════════════════════════════════════════════════════════════════════════
-- MedGo — 00_schema_base.sql
-- Schema base limpo para Supabase novo do zero.
-- Executar PRIMEIRO. Não tem dependências externas.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Extensões ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─── Enums ────────────────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM (
  'owner', 'operator', 'motoboy', 'stock_manager'
);

CREATE TYPE order_status AS ENUM (
  'PRESCRIPTION_PENDING',
  'IN_VALIDATION',
  'AWAITING_PHARMACY',
  'CONFIRMED_PHARMACY',
  'AWAITING_CLIENT',
  'CONFIRMED',
  'IN_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'FAILED'
);

CREATE TYPE payment_method_type AS ENUM (
  'CASH_ON_DELIVERY',
  'MPESA',
  'EMOLA'
);

CREATE TYPE payment_status_type AS ENUM (
  'PENDING',
  'AWAITING_CONFIRMATION',
  'CONFIRMED',
  'FAILED',
  'REFUNDED'
);

CREATE TYPE blacklist_severity AS ENUM (
  'WARNING', 'SUSPENDED', 'BLOCKED'
);

CREATE TYPE stock_status AS ENUM (
  'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'
);

CREATE TYPE inventory_movement_type AS ENUM (
  'SYNC', 'ADJUSTMENT', 'ORDER_RESERVE', 'ORDER_RELEASE', 'ORDER_FULFILL'
);

CREATE TYPE medication_category AS ENUM (
  'FREE', 'PRESCRIPTION', 'RESTRICTED_MONITORED'
);

-- ─── Função auxiliar: timestamp automático ────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── Função auxiliar: tracking token ─────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_tracking_token()
RETURNS TEXT AS $$
BEGIN
  RETURN upper(substring(replace(gen_random_uuid()::text, '-', '') FROM 1 FOR 10));
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- TABELAS
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── profiles (utilizadores internos — ligados ao Supabase Auth) ──────────
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  phone         TEXT,
  role          user_role NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER tr_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── delivery_zones ───────────────────────────────────────────────────────
CREATE TABLE delivery_zones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  delivery_fee  NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Zonas por distância a partir do ponto de referência do mapa MedGo.
  -- Usado por DeliveryMap, OrderPage e ZonesPage.
  min_km        NUMERIC(6,2) NOT NULL DEFAULT 0,
  max_km        NUMERIC(6,2) NOT NULL DEFAULT 999,
  color         TEXT NOT NULL DEFAULT '#14b8a6',
  -- Campos legados mantidos como nullable apenas por compatibilidade.
  lat           NUMERIC(10,7),
  lng           NUMERIC(10,7),
  radius_km     NUMERIC(6,2),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT delivery_zones_distance_check CHECK (min_km >= 0 AND max_km > min_km),
  CONSTRAINT delivery_zones_color_check CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);
CREATE TRIGGER tr_delivery_zones_updated_at
  BEFORE UPDATE ON delivery_zones
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── pharmacies ───────────────────────────────────────────────────────────
CREATE TABLE pharmacies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  address       TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  whatsapp_number TEXT,
  zone_id       UUID REFERENCES delivery_zones(id),
  lat           NUMERIC(10,7),
  lng           NUMERIC(10,7),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER tr_pharmacies_updated_at
  BEFORE UPDATE ON pharmacies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── medications ──────────────────────────────────────────────────────────
CREATE TABLE medications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commercial_name     TEXT NOT NULL,
  generic_name        TEXT,
  dosage              TEXT,
  pharmaceutical_form TEXT,
  package_size        TEXT,
  category            medication_category NOT NULL DEFAULT 'FREE',
  requires_prescription BOOLEAN NOT NULL DEFAULT FALSE,
  is_visible          BOOLEAN NOT NULL DEFAULT TRUE,
  aliases             TEXT[],
  description         TEXT,
  notes               TEXT,
  created_by          UUID REFERENCES profiles(id),
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_medications_visible ON medications(is_visible) WHERE deleted_at IS NULL;
CREATE INDEX idx_medications_search ON medications
  USING gin(to_tsvector('portuguese', commercial_name || ' ' || COALESCE(generic_name, '')));
CREATE TRIGGER tr_medications_updated_at
  BEFORE UPDATE ON medications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── customers (clientes públicos — sem autenticação) ─────────────────────
CREATE TABLE customers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name        TEXT NOT NULL,
  whatsapp_number  TEXT NOT NULL UNIQUE,
  address_notes    TEXT,
  zone_id          UUID REFERENCES delivery_zones(id),
  order_count      INT NOT NULL DEFAULT 0,
  is_blacklisted   BOOLEAN NOT NULL DEFAULT FALSE,
  last_order_at    TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_customers_whatsapp ON customers(whatsapp_number);
CREATE TRIGGER tr_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── blacklist (usa whatsapp_number — nunca customer_phone) ───────────────
CREATE TABLE blacklist (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_number  TEXT NOT NULL UNIQUE,
  customer_name    TEXT,
  severity         blacklist_severity NOT NULL DEFAULT 'WARNING',
  reason           TEXT,
  notes            TEXT,
  added_by         UUID REFERENCES profiles(id),
  expires_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_blacklist_whatsapp ON blacklist(whatsapp_number);
CREATE TRIGGER tr_blacklist_updated_at
  BEFORE UPDATE ON blacklist
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── orders ───────────────────────────────────────────────────────────────
-- REGRA CRÍTICA: total_price é GENERATED ALWAYS — NUNCA escrever directamente.
-- O sistema escreve apenas: medication_price, delivery_fee, cod_fee_amount e campos base relacionados.
-- O Postgres calcula total_price = medication_price + delivery_fee + cod_fee_amount.
CREATE TABLE orders (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_token           TEXT UNIQUE NOT NULL DEFAULT generate_tracking_token(),
  customer_id              UUID NOT NULL REFERENCES customers(id),
  medication_id            UUID REFERENCES medications(id),
  medication_name_snapshot TEXT NOT NULL,
  zone_id                  UUID REFERENCES delivery_zones(id),
  pharmacy_id              UUID REFERENCES pharmacies(id),
  assigned_operator_id     UUID REFERENCES profiles(id),
  assigned_motoboy_id      UUID REFERENCES profiles(id),

  -- Estado
  status                   order_status NOT NULL DEFAULT 'IN_VALIDATION',

  -- Preços (apenas estes podem ser escritos pelo frontend)
  delivery_fee             NUMERIC(10,2),
  pharmacy_price           NUMERIC(10,2),
  medication_price         NUMERIC(10,2),
  platform_markup_amount   NUMERIC(10,2),
  cod_fee_amount           NUMERIC(10,2),
  price_adjustment_reason  TEXT,

  -- COLUNA GERADA — NUNCA ESCREVER
  -- total = medicamento + entrega + taxa COD (se aplicável)
  total_price              NUMERIC(10,2) GENERATED ALWAYS AS (
    COALESCE(medication_price, 0) + COALESCE(delivery_fee, 0) + COALESCE(cod_fee_amount, 0)
  ) STORED,

  -- Pagamento
  payment_method           payment_method_type NOT NULL DEFAULT 'CASH_ON_DELIVERY',
  payment_status           payment_status_type NOT NULL DEFAULT 'PENDING',
  payment_reference        TEXT,

  -- Receita
  prescription_status      TEXT DEFAULT NULL,

  -- Endereços e notas
  delivery_address         TEXT,
  customer_notes           TEXT,
  operator_notes           TEXT,
  cancellation_reason      TEXT,

  -- Timestamps
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW(),
  price_confirmed_at       TIMESTAMPTZ,
  client_confirmed_at      TIMESTAMPTZ,
  dispatched_at            TIMESTAMPTZ,
  delivered_at             TIMESTAMPTZ
);
CREATE INDEX idx_orders_status          ON orders(status);
CREATE INDEX idx_orders_customer        ON orders(customer_id);
CREATE INDEX idx_orders_tracking        ON orders(tracking_token);
CREATE INDEX idx_orders_created_at      ON orders(created_at DESC);
CREATE INDEX idx_orders_awaiting_timeout ON orders(price_confirmed_at)
  WHERE status = 'AWAITING_CLIENT' AND price_confirmed_at IS NOT NULL;
CREATE TRIGGER tr_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── order_status_history ─────────────────────────────────────────────────
CREATE TABLE order_status_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status order_status,
  to_status   order_status NOT NULL,
  changed_by  UUID REFERENCES profiles(id),
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_osh_order ON order_status_history(order_id);

-- ─── prescription_refs ────────────────────────────────────────────────────
-- Bucket: prescription-uploads (não "prescriptions")
CREATE TABLE prescription_refs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  storage_path   TEXT NOT NULL,
  file_name      TEXT,
  file_size      INT,
  mime_type      TEXT,
  expires_at     TIMESTAMPTZ,
  cleaned_up_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_prescription_refs_order   ON prescription_refs(order_id);
CREATE INDEX idx_prescription_refs_cleanup ON prescription_refs(expires_at, cleaned_up_at)
  WHERE cleaned_up_at IS NULL;

-- ─── pharmacy_inventory ───────────────────────────────────────────────────
CREATE TABLE pharmacy_inventory (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id       UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  medication_id     UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  quantity          INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit_price        NUMERIC(10,2),
  status            stock_status NOT NULL DEFAULT 'OUT_OF_STOCK',
  notes             TEXT,
  last_synced_at    TIMESTAMPTZ,
  last_updated_by   UUID REFERENCES profiles(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (pharmacy_id, medication_id)
);
CREATE INDEX idx_inventory_pharmacy  ON pharmacy_inventory(pharmacy_id);
CREATE INDEX idx_inventory_status    ON pharmacy_inventory(status);
CREATE TRIGGER tr_inventory_updated_at
  BEFORE UPDATE ON pharmacy_inventory
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── inventory_movements ──────────────────────────────────────────────────
CREATE TABLE inventory_movements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id    UUID NOT NULL REFERENCES pharmacy_inventory(id) ON DELETE CASCADE,
  pharmacy_id     UUID NOT NULL REFERENCES pharmacies(id),
  medication_id   UUID NOT NULL REFERENCES medications(id),
  movement_type   inventory_movement_type NOT NULL,
  quantity_before INT NOT NULL,
  quantity_change INT NOT NULL,
  quantity_after  INT NOT NULL,
  notes           TEXT,
  performed_by    UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_movements_inventory ON inventory_movements(inventory_id);
CREATE INDEX idx_movements_pharmacy  ON inventory_movements(pharmacy_id);

-- ─── inventory_uploads ────────────────────────────────────────────────────
-- Um registo por importação Excel. Permite controlar a frescura do inventário por farmácia.
CREATE TABLE inventory_uploads (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id    UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  uploaded_by    UUID REFERENCES profiles(id),
  file_name      TEXT,
  total_rows     INT NOT NULL DEFAULT 0,
  valid_rows     INT NOT NULL DEFAULT 0,
  created_count  INT NOT NULL DEFAULT 0,
  updated_count  INT NOT NULL DEFAULT 0,
  failed_count   INT NOT NULL DEFAULT 0,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_inventory_uploads_pharmacy ON inventory_uploads(pharmacy_id, created_at DESC);
CREATE INDEX idx_inventory_uploads_uploaded_by ON inventory_uploads(uploaded_by);

-- ─── action_logs (auditoria imutável) ────────────────────────────────────
CREATE TABLE action_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES profiles(id),
  actor_role  TEXT,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   UUID,
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_action_logs_entity ON action_logs(entity_type, entity_id);
CREATE INDEX idx_action_logs_action ON action_logs(action);

-- ─── system_config ────────────────────────────────────────────────────────
CREATE TABLE system_config (
  key         TEXT PRIMARY KEY,
  value       TEXT,
  description TEXT,
  is_public   BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
