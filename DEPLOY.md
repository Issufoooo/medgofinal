# MedGo — Guia de Deploy Completo (Supabase Novo do Zero)

## Pré-requisitos

- Node.js 20+
- Conta [Supabase](https://supabase.com) (gratuita serve para começar)
- Conta [Vercel](https://vercel.com) ou [Cloudflare Pages](https://pages.cloudflare.com)
- Supabase CLI: `npm install -g supabase`
- Meta Business Manager (para WhatsApp, quando estiver pronto)

---

## PASSO 1 — Criar projecto Supabase novo

1. Ir a [supabase.com](https://supabase.com) → New Project
2. Escolher nome, password da BD, região (recomendado: `eu-central-1` Frankfurt ou o mais próximo disponível)
3. Aguardar o projecto ficar `Active` (~2 minutos)
4. Guardar:
   - **Project URL**: `https://xxxxxxxxxxxx.supabase.co`
   - **Anon Key**: `eyJ...` (em Project Settings → API)
   - **Service Role Key**: (em Project Settings → API — manter em segredo)

---

## PASSO 2 — Executar SQL (ordem obrigatória)

Ir a **SQL Editor** no Supabase e executar os ficheiros nesta ordem exacta:

```
1. supabase/setup/00_schema_base.sql          — enums, tabelas, índices, triggers
2. supabase/setup/01_storage.sql              — bucket prescription-uploads e policies
3. supabase/setup/02_rls_policies.sql         — RLS completo
4. supabase/setup/03_functions_triggers.sql   — funções de negócio
5. supabase/setup/04_system_config.sql        — configurações da plataforma
6. supabase/setup/05_seed_demo_data.sql       — zonas iniciais + GRANTs Data API (sem dados fictícios)
```

> **Alternativa rápida**: executar o ficheiro único `supabase/setup/supabase_full_setup.sql`
> que contém tudo na ordem certa. Não inclui os profiles internos.

> **Demo opcional**: o setup final é limpo e não cria farmácia/medicamentos fictícios. Para testar rapidamente com Paracetamol e outros exemplos, executa depois `supabase/setup/05b_seed_demo_data_optional.sql`. Não uses esse ficheiro em produção real.

### Verificação após execução

No SQL Editor, correr:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```
Deve mostrar: `action_logs`, `blacklist`, `customers`, `delivery_zones`,
`inventory_movements`, `inventory_uploads`, `medications`, `order_status_history`, `orders`,
`pharmacies`, `pharmacy_inventory`, `prescription_refs`, `profiles`, `system_config`.

### Data API grants

O setup final já inclui os GRANTs necessários para a Data API/PostgREST funcionar mesmo quando **Automatically expose new tables** estiver OFF.

A segurança continua a ser controlada por RLS. Os GRANTs apenas permitem que `anon` e `authenticated` chamem a API conforme as policies definidas:

```sql
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
```

Se o frontend devolver erros 403 em queries normais, primeiro confirma se o `supabase_full_setup.sql` foi executado até ao fim.

---

## PASSO 3 — Criar utilizadores internos no Supabase Auth

Para cada utilizador interno (owner, operator, motoboy, stock_manager):

1. Supabase → **Authentication → Users → Add User**
2. Preencher: email + password forte
3. **Copiar o UUID** gerado (coluna "User UID")

Repetir para:
- `owner@medgo.co.mz`
- `operador@medgo.co.mz`
- `motoboy@medgo.co.mz`
- `stock@medgo.co.mz`

---

## PASSO 4 — Inserir Profiles

1. Abrir `supabase/setup/06_create_internal_profiles_template.sql`
2. Substituir os UUIDs placeholder pelos UUIDs reais copiados no passo anterior
3. Executar no SQL Editor

Verificar:
```sql
SELECT id, full_name, role, is_active FROM profiles ORDER BY role;
```

---

## PASSO 5 — Configurar Storage

O bucket `prescription-uploads` foi criado automaticamente pelo SQL `01_storage.sql`.

Verificar em Supabase → **Storage**:
- Deve existir `prescription-uploads` como bucket **privado**

---

## PASSO 6 — Configurar Edge Functions

### 6.1 Instalar CLI e ligar ao projecto

```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF
```
O `project-ref` está em Project Settings → General.

### 6.2 Configurar Secrets (nunca ficam no código ou .env)

```bash
# Supabase Service Role (necessário para as Edge Functions lerem/escreverem na BD)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key

# WhatsApp Meta Cloud API (configurar quando tiver conta Meta Business aprovada)
supabase secrets set WHATSAPP_ACCESS_TOKEN=seu-access-token
supabase secrets set WHATSAPP_PHONE_NUMBER_ID=seu-phone-number-id
supabase secrets set WHATSAPP_VERIFY_TOKEN=qualquer-string-aleatoria-para-verificacao
supabase secrets set WHATSAPP_APP_SECRET=seu-app-secret-da-meta
```

### 6.3 Deploy das funções

```bash
supabase functions deploy whatsapp-send
supabase functions deploy whatsapp-webhook
supabase functions deploy prescription-cleanup
supabase functions deploy order-timeout-check
```

### 6.4 Configurar crons (schedules)

No painel Supabase → **Edge Functions → Schedule**:

| Função                  | Cron           | Descrição                        |
|-------------------------|----------------|----------------------------------|
| `prescription-cleanup`  | `0 * * * *`    | Cada hora                        |
| `order-timeout-check`   | `*/15 * * * *` | Cada 15 minutos                  |

> `whatsapp-send` e `whatsapp-webhook` são invocadas on-demand, não têm cron.

### 6.5 Registar webhook na Meta (quando WhatsApp estiver activo)

1. Meta Developers → App → WhatsApp → Configuration
2. **Callback URL**: `https://SEU_PROJECT_REF.supabase.co/functions/v1/whatsapp-webhook`
3. **Verify Token**: o mesmo valor em `WHATSAPP_VERIFY_TOKEN`
4. Subscrever: `messages`

---

## PASSO 7 — Configurar variáveis de ambiente

Copiar `.env.example` para `.env`:

```bash
cp .env.example .env
```

Preencher:

```env
VITE_SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
VITE_APP_URL=https://medgo.co.mz
VITE_SENTRY_DSN=                    # opcional — preencher após criar projecto Sentry
```

---

## PASSO 8 — Configurar Sentry (monitorização de erros)

1. Criar conta em [sentry.io](https://sentry.io) (gratuito)
2. New Project → React
3. Copiar o DSN para `VITE_SENTRY_DSN` no `.env`
4. No Vercel, adicionar também `VITE_SENTRY_DSN` nas variáveis de ambiente

---

## PASSO 9 — Testar localmente

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000` e verificar:

- [ ] Página pública carrega sem erros
- [ ] Se quiseres testar com dados demo, executa antes `supabase/setup/05b_seed_demo_data_optional.sql`
- [ ] Com inventário real ou demo, consegue criar pedido sem receita
- [ ] ThankYouPage mostra a referência e incentiva confirmação pelo WhatsApp
- [ ] Não aparece link de tracking imediatamente após criar pedido
- [ ] Link `/acompanhar/TOKEN` funciona quando usado após confirmação operacional
- [ ] Login como owner funciona
- [ ] Dashboard do operador mostra o pedido criado
- [ ] Operador consegue confirmar farmácia e preço
- [ ] Stock_manager consegue ver inventário

---

## PASSO 10 — Configurar plataforma no dashboard

Depois de entrar como **Owner** em `/login`:

Ir a **Configurações** e preencher:

| Campo                            | Valor                          |
|----------------------------------|--------------------------------|
| `platform_name`                  | MedGo                          |
| `operation_name`                 | MedGo                          |
| `whatsapp_number`                | 258XXXXXXXXX (sem espaços)     |
| `tracking_base_url`              | https://medgo.co.mz            |
| `platform_markup_percent`        | 10                             |
| `cash_on_delivery_fee_percent`   | 5                              |
| `low_stock_threshold`            | 5                              |
| `client_confirm_timeout_minutes` | 60                             |
| `prescription_timeout_minutes`   | 1440                           |
| `whatsapp_enabled`               | false (true após Meta aprovada)|

---

## PASSO 11 — Deploy Vercel

### Opção A — Via CLI

```bash
npm run build    # verificar que não há erros
npx vercel --prod
```

### Opção B — Via GitHub (recomendado)

1. Push do código para repositório GitHub
2. Vercel → New Project → Import from GitHub
3. Adicionar variáveis de ambiente no Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_APP_URL`
   - `VITE_SENTRY_DSN`
4. Deploy automático em cada push para `main`

### Build settings no Vercel

| Campo           | Valor         |
|-----------------|---------------|
| Framework       | Vite          |
| Build Command   | `npm run build` |
| Output Dir      | `dist`        |
| Install Command | `npm install` |

---

## PASSO 12 — Activar WhatsApp (quando conta Meta estiver aprovada)

1. No Supabase → Edge Functions → Secrets: confirmar `WHATSAPP_ACCESS_TOKEN` e `WHATSAPP_PHONE_NUMBER_ID`
2. No dashboard Owner → Configurações: mudar `whatsapp_enabled` para `true`
3. Testar envio: criar um pedido de teste e confirmar o preço — o cliente deve receber mensagem

---

## Checklist final antes de ir ao ar

**Base de dados:**
- [ ] Todas as 13 tabelas criadas
- [ ] RLS activado em todas
- [ ] Profiles inseridos com roles correctos
- [ ] Bucket `prescription-uploads` privado e activo
- [ ] system_config preenchido

**Aplicação:**
- [ ] `npm run build` sem erros
- [ ] Login de todos os roles funciona
- [ ] Fluxo completo de pedido: criação → confirmação → entrega
- [ ] Upload de receita funciona
- [ ] Tracking em `/acompanhar/:token` funciona

**Edge Functions:**
- [ ] `whatsapp-send` deployed
- [ ] `whatsapp-webhook` deployed
- [ ] `prescription-cleanup` deployed com cron
- [ ] `order-timeout-check` deployed com cron

**Monitorização:**
- [ ] Sentry configurado (opcional mas recomendado)

---

## Resolução de problemas frequentes

**"column total_price is a generated column"**
→ Algum serviço está a tentar escrever `total_price`. Nunca incluir em INSERT/UPDATE.
→ Verificar `orderService.js` — confirmPharmacyAndPrice não deve ter `total_price` nos extraFields.

**Notificações WhatsApp não chegam**
→ Verificar `whatsapp_enabled = 'true'` em system_config
→ Verificar secrets `WHATSAPP_ACCESS_TOKEN` e `WHATSAPP_PHONE_NUMBER_ID` no Supabase
→ Consultar `action_logs` onde `action = 'NOTIFICATION_FAILED'`

**Stock negativo ou reservas duplicadas**
→ As funções `reserve_stock_for_order` e `release_stock_for_order` têm guardas atómicas
→ Consultar `inventory_movements` para ver o histórico exacto

**Edge Functions não executam**
→ `supabase functions list` — verificar se estão deployed
→ `supabase functions logs prescription-cleanup` — ver erros

**Upload de receita falha**
→ Verificar que o bucket se chama `prescription-uploads` (não `prescriptions`)
→ Verificar Storage Policies em Supabase

**Cliente vê página em branco**
→ ErrorBoundary deve mostrar ecrã de erro, não branco
→ Verificar Sentry para o erro exacto
