import { serve } from "https://deno.land/std@0.224.0/http/server.ts"


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
}


serve(async (req) => {


  // CORS PREFLIGHT
  if (req.method === "OPTIONS") {

    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })

  }



  try {

    const body = await req.json()


    console.log(
      "REQUEST BODY",
      JSON.stringify(body)
    )


    const {
      phone,
      message,
      templateKey
    } = body



    if (!phone || !message) {

      return new Response(
        JSON.stringify({
          error:"Missing phone or message"
        }),
        {
          status:400,
          headers:{
            ...corsHeaders,
            "Content-Type":"application/json"
          }
        }
      )

    }



    const token =
      Deno.env.get("WHATSAPP_ACCESS_TOKEN")


    const phoneId =
      Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")



    if (!token || !phoneId) {

      return new Response(
        JSON.stringify({
          error:"Missing WhatsApp secrets"
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



    const metaResponse =
      await fetch(
        `https://graph.facebook.com/v21.0/${phoneId}/messages`,
        {
          method:"POST",

          headers:{
            Authorization:`Bearer ${token}`,
            "Content-Type":"application/json"
          },


          body:JSON.stringify({

            messaging_product:"whatsapp",

            recipient_type:"individual",

            to: phone.replace(/\D/g,''),

            type:"text",

            text:{
              body:message
            }

          })
        }
      )




    const metaData =
      await metaResponse.json()



    console.log(
      "META RESPONSE",
      JSON.stringify(metaData)
    )




    return new Response(
      JSON.stringify({
        success:metaResponse.ok,
        data:metaData,
        templateKey
      }),
      {
        status:metaResponse.ok ? 200 : 500,
        headers:{
          ...corsHeaders,
          "Content-Type":"application/json"
        }
      }
    )



  } catch(error) {


    console.error(
      "FUNCTION ERROR",
      error
    )


    return new Response(
      JSON.stringify({
        error:error.message
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
