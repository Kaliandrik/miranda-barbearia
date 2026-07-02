const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apiKey, content-type, client-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// @ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { clientPhone, professionalName, services, date, time, paymentMethod, total } = await req.json()

    if (!clientPhone || !services || !date || !time) {
      throw new Error("Dados obrigatórios ausentes.");
    }

    const cleanPhone = clientPhone.replace(/\D/g, "")
    const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`

    const instanceId = "3F55EFFCBDE761620C2CEA958B74C323"
    const token = "41D5947E5F902FB837FDA3C2"
    
    // Rota padrão limpa com parâmetros explícitos via Query String (Fallback)
    const zapiUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`

    const messageText = 
      `*BARBEARIA MIRANDA* ✂️\n\n` +
      `✅ *Agendamento Confirmado!*\n\n` +
      `👤 *Cliente:* ${clientPhone}\n` +
      `🪒 *Profissional:* ${professionalName}\n` +
      `📅 *Data:* ${date.split('-').reverse().join('/')}\n` +
      `🕒 *Horário:* ${time}\n` +
      `📦 *Serviço(s):* ${services.join(', ')}\n` +
      `💳 *Pagamento:* ${paymentMethod.toUpperCase()}\n` +
      `💰 *Total:* R$ ${Number(total).toFixed(2)}\n\n` +
      `O Miranda aguarda você!`

    const response = await fetch(zapiUrl, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "client-token": token,
        "Client-Token": token
      },
      body: JSON.stringify({
        phone: formattedPhone,
        message: messageText,
        // Algumas instâncias leem o token injetado diretamente no payload
        "client-token": token,
        token: token
      })
    })

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Z-API status ${response.status}: ${errorText}`);
    }

    const result = await response.json()

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, 
    })
  }
})