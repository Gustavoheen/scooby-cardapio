const { createClient } = require('@supabase/supabase-js')

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const supabase = getSupabase()

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('orders')
        .select('id, data, criadoEm')
        .order('id', { ascending: false })
      if (error) throw error
      const pedidos = (data || []).map(r => ({ ...r.data, id: r.id, criadoEm: r.criadoEm }))
      return res.status(200).json(pedidos)
    }

    if (req.method === 'POST') {
      // ── 1. Honeypot — bots preenchem campos escondidos ────────────
      if (req.body._hp) {
        // Rejeita silenciosamente sem alertar o bot
        return res.status(200).json({ sucesso: true, numeroPedido: 'OK' })
      }

      // ── 2. Validação básica ───────────────────────────────────────
      const { nomeCliente, telefone, itensPedido, total } = req.body
      if (!nomeCliente?.trim() || !itensPedido?.trim() || !total || parseFloat(total) <= 0) {
        return res.status(400).json({ erro: 'Pedido inválido.' })
      }

      const telNorm = (telefone || '').replace(/\D/g, '')

      // ── 3. Carregar blocklist e checar rate limit em paralelo ─────
      const umaHoraAtras = new Date(Date.now() - 60 * 60 * 1000).toISOString()

      const [storeResult, rateResult] = await Promise.all([
        supabase.from('store_state').select('bloqueados').eq('id', 1).single(),
        telNorm
          ? supabase
              .from('orders')
              .select('*', { count: 'exact', head: true })
              .filter('data->>telefone', 'eq', telNorm)
              .gte('criadoEm', umaHoraAtras)
          : Promise.resolve({ count: 0 }),
      ])

      // ── 4. Blocklist ──────────────────────────────────────────────
      const bloqueados = storeResult.data?.bloqueados || []
      if (telNorm && bloqueados.includes(telNorm)) {
        return res.status(403).json({ erro: 'Não foi possível processar seu pedido. Entre em contato com a loja.' })
      }

      // ── 5. Rate limiting: máx 5 pedidos por hora por telefone ─────
      if (telNorm && (rateResult.count || 0) >= 5) {
        return res.status(429).json({ erro: 'Muitos pedidos em pouco tempo. Aguarde alguns minutos antes de tentar novamente.' })
      }

      // ── 6. Salvar pedido ──────────────────────────────────────────
      const id = Date.now()
      const hoje = new Date().toLocaleDateString('pt-BR')
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .filter('data->>data', 'eq', hoje)
      const numeroPedido = `${hoje.replace(/\//g, '')}-${String((count || 0) + 1).padStart(3, '0')}`

      // Remove honeypot do payload antes de salvar
      const { _hp, ...bodyLimpo } = req.body
      const payload = { ...bodyLimpo, telefone: telNorm || telefone, numeroPedido }

      const { error } = await supabase
        .from('orders')
        .insert({ id, data: payload })
      if (error) throw error
      return res.status(200).json({ sucesso: true, numeroPedido })
    }

    if (req.method === 'PATCH') {
      // Confirmar pagamento Pix
      const { id } = req.query
      if (!id) return res.status(400).json({ erro: 'Informe o id do pedido' })
      const { data: row, error: fetchErr } = await supabase.from('orders').select('data').eq('id', id).single()
      if (fetchErr) throw fetchErr
      const novaData = { ...row.data, pixConfirmado: true, pixConfirmadoEm: new Date().toISOString() }
      const { error: updateErr } = await supabase.from('orders').update({ data: novaData }).eq('id', id)
      if (updateErr) throw updateErr
      return res.status(200).json({ sucesso: true })
    }

    if (req.method === 'DELETE') {
      const { id, telefone } = req.query
      if (id) {
        const { error } = await supabase.from('orders').delete().eq('id', id)
        if (error) throw error
      } else if (telefone) {
        const { error } = await supabase.from('orders').delete().filter('data->>telefone', 'eq', telefone)
        if (error) throw error
      } else {
        return res.status(400).json({ erro: 'Informe id ou telefone' })
      }
      return res.status(200).json({ sucesso: true })
    }
  } catch (err) {
    return res.status(500).json({ erro: err.message })
  }

  return res.status(405).end()
}
