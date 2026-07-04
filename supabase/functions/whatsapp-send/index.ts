/**
 * MedGo — whatsapp-send Edge Function
 * Envia mensagem WhatsApp via Meta Cloud API.
 *
 * Secrets necessários:
 *   WHATSAPP_ACCESS_TOKEN   — token permanente do Meta
 *   WHATSAPP_PHONE_NUMBER_ID — ID do número no Meta Business
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Only POST allowed" }, 405);

  try {
    const text = await req.text();
    if (!text) return json({ error: "Empty request body" }, 400);

    const body = JSON.parse(text);
    console.log("[whatsapp-send] INCOMING:", JSON.stringify(body));

    const { phone, message } = body;
    if (!phone || !message) return json({ error: "Missing phone or message" }, 400);

    // Suporta múltiplos nomes de secret para compatibilidade
    const token =
      Deno.env.get("WHATSAPP_ACCESS_TOKEN") ||   // nome correcto (adicionado 16 Jun)
      Deno.env.get("WHATSAPP_ACESS_TOKEN")  ||   // typo (adicionado primeiro)
      Deno.env.get("WHATSAPP_TOKEN");             // nome antigo como fallback

    const phoneId =
      Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || // nome correcto
      Deno.env.get("WHATSAPP_PHONE_ID");          // nome antigo como fallback

    if (!token || !phoneId) {
      console.error("[whatsapp-send] Secrets em falta. Verifica WHATSAPP_ACCESS_TOKEN e WHATSAPP_PHONE_NUMBER_ID");
      return json({ error: "Missing WhatsApp env variables", hint: "Check WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in Supabase Secrets" }, 500);
    }

    // Normalizar número (garantir prefixo 258)
    const digits = String(phone).replace(/\D/g, "");
    const to = digits.startsWith("258") ? digits : `258${digits}`;

    console.log(`[whatsapp-send] Sending to ${to}, messageLength=${message.length}`);

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: message },
        }),
      }
    );

    const result = await response.json();
    console.log("[whatsapp-send] Meta API response:", JSON.stringify(result));

    if (!response.ok) {
      console.error("[whatsapp-send] Meta API error:", response.status, JSON.stringify(result));
    }

    return json(result, response.ok ? 200 : response.status);

  } catch (error) {
    console.error("[whatsapp-send] FATAL ERROR:", error);
    return json({ error: String(error) }, 500);
  }
});
