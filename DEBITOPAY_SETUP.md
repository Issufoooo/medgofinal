# MedGo — Débito Pay Sandbox Setup

## Dados confirmados

- Merchant ID: `844d4ae3-6993-40b4-95bf-c8ae384d7311`
- Wallet ID: `52539`
- Ambiente: `sandbox`
- Domínio: `medgo-mz.app`
- Chave: `sk_sandbox_...` — guardar apenas como Supabase Secret.

## 1. Rodar SQL

No Supabase SQL Editor, rodar:

```text
supabase/setup/10_debitopay_sandbox_ready.sql
```

## 2. Configurar Secrets no Supabase

No terminal com Supabase CLI:

```bash
supabase secrets set DEBITOPAY_API_KEY="sk_sandbox_..."
supabase secrets set DEBITOPAY_WALLET_ID="52539"
supabase secrets set DEBITOPAY_MERCHANT_ID="844d4ae3-6993-40b4-95bf-c8ae384d7311"
supabase secrets set DEBITOPAY_API_BASE_URL="https://my.debito.co.mz/api/v1"
```

Opcional, se a Débito Pay permitir secret de webhook:

```bash
supabase secrets set DEBITOPAY_WEBHOOK_SECRET="um-segredo-teu"
```

## 3. Fazer deploy das Edge Functions

```bash
supabase functions deploy debitopay-create-payment
supabase functions deploy debitopay-webhook
```

## 4. Configurar webhook na Débito Pay

Quando a function estiver publicada, adicionar em Débito Pay → Developers → Webhooks:

```text
https://PROJECT_REF.supabase.co/functions/v1/debitopay-webhook
```

## 5. Fluxo no MedGo

1. Operador confirma farmácia e preço.
2. Pedido fica com `payment_status = PENDING`.
3. Operador abre o detalhe do pedido e clica em `Enviar cobrança M-Pesa`.
4. Edge Function chama a Débito Pay.
5. Débito Pay pede pagamento ao cliente.
6. Webhook confirma pagamento e o pedido muda para `CONFIRMED` no pagamento.

Nunca colocar a chave `sk_sandbox` na Vercel nem em variável `VITE_`.
