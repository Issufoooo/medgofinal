import { serve } from "https://deno.land/std@0.224.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
}

serve(async (req) => {

  // 🔥 CORREÇÃO PRINCIPAL
  // OPTIONS nunca deve tentar ler JSON
  if (req.method === "OPTIONS") {
    return new Response(
      "ok",
      {
        status: 200,
        headers: corsHeaders
      }
    )
  }


  try {

    const body = await req.json()

    console.log("INCOMING:", JSON.stringify(body))


    const {
      phone,
      message,
      templateKey
    } = body


    if (!phone || !message) {

      return new Response(
        JSON.stringify({
          error: "Missing phone or message"
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      )
    }


    const token = Deno.env.get(
      "WHATSAPP_ACCESS_TOKEN"
    )

    const phoneNumberId = Deno.env.get(
      "WHATSAPP_PHONE_NUMBER_ID"
    )


    if (!token || !phoneNumberId) {

      console.error(
        "Missing WhatsApp secrets"
      )

      return new Response(
        JSON.stringify({
          error:"WhatsApp secrets missing"
        }),
        {
          status:500,
          headers:{
            ...corsHeaders,
            "Content-Type":"application/json"
          }
        }
      )
    }



    const response = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method:"POST",
        headers:{
          "Authorization":
            `Bearer ${token}`,

          "Content-Type":
            "application/json"
        },

        body:JSON.stringify({

          messaging_product:"whatsapp",

          recipient_type:"individual",

          to:phone.replace(/\D/g,""),

          type:"text",

          text:{
            preview_url:true,
            body:message
          }

        })
      }
    )



    const result =
      await response.json()



    if (!response.ok) {

      console.error(
        "META ERROR:",
        result
      )

      return new Response(
        JSON.stringify({
          success:false,
          metaError:result
        }),
        {
          status:500,
          headers:{
            ...corsHeaders,
            "Content-Type":"application/json"
          }
        }
      )
    }



    console.log(
      "WHATSAPP SENT:",
      result
    )


    return new Response(
      JSON.stringify({
        success:true,
        data:result,
        templateKey
      }),
      {
        status:200,
        headers:{
          ...corsHeaders,
          "Content-Type":"application/json"
        }
      }
    )


  } catch(err) {


    console.error(
      "SEND ERROR:",
      err
    )


    return new Response(
      JSON.stringify({
        error:String(err)
      }),
      {
        status:500,
        headers:{
          ...corsHeaders,
          "Content-Type":"application/json"
        }
      }
    )

  }

})
