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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.')
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseKey)

    const today = new Date()
    const dateStr = today.toISOString().split('T')[0]
    const currentTime = today.getHours().toString().padStart(2, '0') + ':' + today.getMinutes().toString().padStart(2, '0')

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('appointment_date', dateStr)
      .neq('status', 'Cancelado')

    if (error) throw error
    if (!appointments || appointments.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const instanceId = "3F55EFFCBDE761620C2CEA958B74C323"
    const token = "41D5947E5F902FB837FDA3C2"
    const zapiUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`

    let sentCount = 0

    for (const apt of appointments) {
      const remindersSent: string[] = apt.reminders_sent || []
      const appointmentTime = apt.appointment_time
      const [aptHours, aptMinutes] = appointmentTime.split(':').map(Number)
      const [curHours, curMinutes] = currentTime.split(':').map(Number)

      const aptTotalMinutes = aptHours * 60 + aptMinutes
      const curTotalMinutes = curHours * 60 + curMinutes
      const diffMinutes = aptTotalMinutes - curTotalMinutes

      const cleanPhone = apt.client_phone.replace(/\D/g, '')
      const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`

      if (diffMinutes <= 30 && diffMinutes > 20 && !remindersSent.includes('30min')) {
        const message =
          `*MD BARBEARIA* ✂️\n\n` +
          `⏰ *Faltam 30 minutos para o seu horário!*\n\n` +
          `📅 *Data:* ${apt.appointment_date.split('-').reverse().join('/')}\n` +
          `🕒 *Horário:* ${apt.appointment_time}\n` +
          `📍 *Endereço:* Rua Vereador Raimundo Lima, 248 - Centro, Tianguá - CE\n\n` +
          `Não se atrase! Estamos te esperando! 🚀`

        const resp = await fetch(zapiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'client-token': token,
          },
          body: JSON.stringify({ phone: formattedPhone, message }),
        })

        if (resp.ok) {
          const updated = [...remindersSent, '30min']
          await supabase.from('appointments').update({ reminders_sent: updated }).eq('id', apt.id)
          sentCount++
        }
      }

      if (diffMinutes <= 15 && diffMinutes > 5 && !remindersSent.includes('15min')) {
        const message =
          `*MD BARBEARIA* ✂️\n\n` +
          `🔥 *Faltam apenas 15 minutos!*\n\n` +
          `📅 *Data:* ${apt.appointment_date.split('-').reverse().join('/')}\n` +
          `🕒 *Horário:* ${apt.appointment_time}\n` +
          `📍 *Endereço:* Rua Vereador Raimundo Lima, 248 - Centro, Tianguá - CE\n\n` +
          `Já estamos prontos para te atender! 💈`

        const resp = await fetch(zapiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'client-token': token,
          },
          body: JSON.stringify({ phone: formattedPhone, message }),
        })

        if (resp.ok) {
          const updated = [...remindersSent, '15min']
          await supabase.from('appointments').update({ reminders_sent: updated }).eq('id', apt.id)
          sentCount++
        }
      }
    }

    return new Response(JSON.stringify({ success: true, sent: sentCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})
