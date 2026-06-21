import { supabase } from '../lib/supabase'
import { auditLog } from './auditService'


let _cfg = null
let _cfgAt = 0

const CFG_TTL = 60000


export async function getConfig() {

  if (_cfg && Date.now() - _cfgAt < CFG_TTL) {
    return _cfg
  }


  const { data } = await supabase
    .from('system_config')
    .select('key,value')
    .in('key', [

      'operation_name',
      'platform_name',
      'platform_phone',
      'whatsapp_number',
      'tracking_base_url',
      'whatsapp_enabled',

      'wa_tpl_order_created',
      'wa_tpl_price_confirmation',
      'wa_tpl_order_dispatched',
      'wa_tpl_order_delivered',
      'wa_tpl_order_cancelled'

    ])


  const m = Object.fromEntries(
    (data || []).map(x=>[
      x.key,
      x.value
    ])
  )


  _cfg = {

    platformName:
      m.operation_name ||
      m.platform_name ||
      'MedGo',


    platformPhone:
      m.platform_phone ||
      m.whatsapp_number ||
      '',


    trackingBaseUrl:
      m.tracking_base_url ||
      window.location.origin,


    whatsappEnabled:
      m.whatsapp_enabled === 'true',


    templates:{


      order_created:
        m.wa_tpl_order_created || '',


      price_confirmation:
        m.wa_tpl_price_confirmation || '',


      order_dispatched:
        m.wa_tpl_order_dispatched || '',


      order_delivered:
        m.wa_tpl_order_delivered || '',


      order_cancelled:
        m.wa_tpl_order_cancelled || ''

    }

  }


  _cfgAt = Date.now()

  return _cfg

}



export function invalidateNotificationCache(){

  _cfg=null

}



export function interpolate(text,vars){

  return text.replace(
    /\{\{(\w+)\}\}/g,
    (_,key)=>vars[key] ?? ''
  )

}



function formatMoney(v){

  if(v===null || v===undefined)
    return '—'


  return new Intl.NumberFormat(
    'pt-MZ',
    {
      minimumFractionDigits:2
    }
  ).format(v)
  +' MZN'

}




function buildVars({
  order,
  customer,
  trackingUrl,
  config,
  cancellationReason
}){


return {


customer_name:
customer?.full_name ||
'Cliente',


medication_name:
order?.medication_name_snapshot ||
'',


tracking_url:
trackingUrl || '',


medication_price:
formatMoney(order?.medication_price),


delivery_fee:
formatMoney(order?.delivery_fee),


total_price:
formatMoney(order?.total_price),


platform_name:
config.platformName,


platform_phone:
config.platformPhone,


cancellation_reason:
cancellationReason ||
order?.cancellation_reason ||
''


}


}




async function sendViaEdgeFunction(
 phone,
 message,
 templateKey
){


const payload = {

 phone,
 message,
 templateKey

}



const response =
await supabase.functions.invoke(

 'whatsapp-send',

 {

  body: payload,

 }

)



if(response.error){

 throw new Error(
  response.error.message
 )

}



return response.data


}




export function buildWaLink(phone,message){


const clean =
phone.replace(/\D/g,'')


return (
`https://wa.me/${clean}?text=${
encodeURIComponent(message)
}`
)

}





export async function sendNotification(
templateKey,
{
 order,
 customer,
 trackingUrl,
 cancellationReason
}
){


const result={

sent:false,
reason:null,
waLink:null

}



try{


const config =
await getConfig()



const phone =
customer?.whatsapp_number



if(!phone){

 result.reason='no_phone'

 return result

}



const template =
config.templates[templateKey]



if(!template){

 result.reason=
 'template_missing'

 return result

}



const message =
interpolate(
 template,
 buildVars({
  order,
  customer,
  trackingUrl,
  config,
  cancellationReason
 })
)



result.waLink =
buildWaLink(
 phone,
 message
)



if(!config.whatsappEnabled){

 result.reason=
 'whatsapp_disabled'

 return result

}



await sendViaEdgeFunction(
 phone,
 message,
 templateKey
)



result.sent=true
result.reason='ok'



await auditLog({

 action:
 'NOTIFICATION_SENT',

 entityType:
 'order',

 entityId:
 order?.id,


metadata:{
 templateKey,
 phone
}

}).catch(()=>null)




}

catch(err){


result.reason =
err.message



console.warn(
'[Notification]',
err
)



}



return result


}





export async function buildTrackingUrl(token){


const config =
await getConfig()


return (
config.trackingBaseUrl.replace(/\/$/,'')
+
'/acompanhar/'
+
token
)


}
