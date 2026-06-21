import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

serve(async (req) => {

  // Resolver CORS primeiro
  if (req.method === "OPTIONS") {
    return new Response(
      null,
      {
        status: 204,
        headers: corsHeaders,
      }
    );
  }


  try {

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({
          error: "Only POST allowed"
        }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }


    // Ler body com segurança
    const text = await req.text();


    if (!text) {
      return new Response(
        JSON.stringify({
          error: "Empty request body"
        }),
        {
          status: 400,
          headers:{
            ...corsHeaders,
            "Content-Type":"application/json"
          }
        }
      );
    }


    const body = JSON.parse(text);


    console.log(
      "INCOMING:",
      JSON.stringify(body)
    );


    const {
      phone,
      message
    } = body;



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
      );
    }



    // ENV
    const token =
      Deno.env.get("WHATSAPP_TOKEN");

    const phoneId =
      Deno.env.get("WHATSAPP_PHONE_ID");



    if (!token || !phoneId){

      return new Response(
        JSON.stringify({
          error:"Missing WhatsApp env variables"
        }),
        {
          status:500,
          headers:{
            ...corsHeaders,
            "Content-Type":"application/json"
          }
        }
      );

    }



    const response = await fetch(
      `https://graph.facebook.com/v21.0/${phoneId}/messages`,
      {
        method:"POST",
        headers:{
          "Authorization":`Bearer ${token}`,
          "Content-Type":"application/json"
        },

        body:JSON.stringify({

          messaging_product:"whatsapp",

          to:phone,

          type:"text",

          text:{
            body:message
          }

        })
      }
    );



    const result = await response.json();


    console.log(
      "WHATSAPP RESPONSE:",
      JSON.stringify(result)
    );



    return new Response(
      JSON.stringify(result),
      {
        status:response.status,
        headers:{
          ...corsHeaders,
          "Content-Type":"application/json"
        }
      }
    );


  } catch(error){

    console.log(
      "SEND ERROR:",
      error
    );


    return new Response(
      JSON.stringify({
        error:String(error)
      }),
      {
        status:500,
        headers:{
          ...corsHeaders,
          "Content-Type":"application/json"
        }
      }
    );

  }


});
