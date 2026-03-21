const { createClient } = require('@supabase/supabase-js')

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const supabase = getSupabase()

  try {
    if (req.method === 'GET') {
      const { numero } = req.query
      if (numero) {
        const { data, error } = await supabase.from('mesas').select('*').eq('numero', parseInt(numero)).single()
        if (error) throw error
        return res.status(200).json(data)
      }
      const { data, error } = await supabase.from('mesas').select('*').order('numero')
      if (error) throw error
      return res.status(200).json(data || [])
    }

    if (req.method === 'POST') {
      // Adiciona itens a uma mesa
      const { numero, itens } = req.body
      if (!numero || !itens?.length) return res.status(400).json({ erro: 'Informe numero e itens' })

      const { data: mesa, error: fetchErr } = await supabase.from('mesas').select('*').eq('numero', numero).single()
      if (fetchErr) throw fetchErr

      // Mescla novos itens com existentes (agrupa por nome+variacao)
      const itensAtuais = mesa.itens || []
      const mapa = {}
      for (const i of itensAtuais) {
        const k = `${i.nome}||${i.variacao || ''}`
        mapa[k] = { ...i }
      }
      for (const i of itens) {
        const k = `${i.nome}||${i.variacao || ''}`
        if (mapa[k]) mapa[k].qtd += i.qtd
        else mapa[k] = { ...i }
      }
      const novosItens = Object.values(mapa)
      const total = novosItens.reduce((s, i) => s + i.preco * i.qtd, 0)

      const updates = { status: 'aberta', itens: novosItens, total }
      if (mesa.status === 'fechada') updates.aberta_em = new Date().toISOString()

      const { error } = await supabase.from('mesas').update(updates).eq('numero', numero)
      if (error) throw error

      // Cria pedido de cozinha com os itens desta rodada (para auto-impressão)
      const agora = new Date()
      const hoje = agora.toLocaleDateString('pt-BR')
      const { count: ordCount } = await supabase
        .from('orders').select('*', { count: 'exact', head: true }).filter('data->>data', 'eq', hoje)
      const numeroPedido = `${hoje.replace(/\//g, '')}-${String((ordCount || 0) + 1).padStart(3, '0')}`

      const itensPedido = itens
        .map(i => `${i.qtd}x ${i.nome}${i.variacao ? ` (${i.variacao})` : ''}`)
        .join(' | ')
      const totalRodada = itens.reduce((s, i) => s + i.preco * i.qtd, 0)

      const pedidoPayload = {
        nomeCliente: `Mesa ${numero}`,
        itensPedido,
        total: totalRodada.toFixed(2),
        subtotal: totalRodada.toFixed(2),
        taxaEntrega: 0,
        pagamento: 'Mesa',
        tipoEntrega: 'Retirada',
        mesa: String(numero),
        origem: 'cozinha',
        status: 'recebido',
        data: hoje,
        hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        numeroPedido,
      }
      await supabase.from('orders').insert({ id: Date.now(), data: pedidoPayload })

      return res.status(200).json({ sucesso: true, numeroPedido })
    }

    if (req.method === 'PATCH') {
      const { numero } = req.query
      if (!numero) return res.status(400).json({ erro: 'Informe o numero da mesa' })

      const { action, pagamento, troco } = req.body || {}

      if (action === 'resetar') {
        const { error } = await supabase.from('mesas').update({
          status: 'fechada', itens: [], total: 0, nome_cliente: '', aberta_em: null
        }).eq('numero', numero)
        if (error) throw error
        return res.status(200).json({ sucesso: true })
      }

      if (action === 'fechar') {
        const { data: mesa, error: fetchErr } = await supabase.from('mesas').select('*').eq('numero', parseInt(numero)).single()
        if (fetchErr) throw fetchErr
        if (mesa.status !== 'aberta') return res.status(400).json({ erro: 'Mesa não está aberta' })

        // Remove pedidos de cozinha desta mesa para não duplicar no histórico
        await supabase.from('orders')
          .delete()
          .filter('data->>mesa', 'eq', String(numero))
          .filter('data->>origem', 'eq', 'cozinha')

        const agora = new Date()
        const hoje = agora.toLocaleDateString('pt-BR')
        const { count } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .filter('data->>data', 'eq', hoje)
        const numeroPedido = `${hoje.replace(/\//g, '')}-${String((count || 0) + 1).padStart(3, '0')}`

        const itensPedido = (mesa.itens || [])
          .map(i => `${i.qtd}x ${i.nome}${i.variacao ? ` (${i.variacao})` : ''}`)
          .join(' | ')

        const payload = {
          nomeCliente: `Mesa ${numero}`,
          telefone: '',
          itensPedido,
          total: Number(mesa.total).toFixed(2),
          subtotal: Number(mesa.total).toFixed(2),
          taxaEntrega: 0,
          pagamento: pagamento || 'Balcão',
          troco: troco || '',
          tipoEntrega: 'Retirada',
          mesa: String(numero),
          origem: 'mesa',
          status: 'concluido',
          data: hoje,
          hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          numeroPedido,
        }

        const id = Date.now()
        const { error: insertErr } = await supabase.from('orders').insert({ id, data: payload })
        if (insertErr) throw insertErr

        const { error: updateErr } = await supabase.from('mesas').update({
          status: 'fechada', itens: [], total: 0, nome_cliente: '', aberta_em: null
        }).eq('numero', numero)
        if (updateErr) throw updateErr

        return res.status(200).json({ sucesso: true, numeroPedido })
      }

      // Remover item específico por índice
      if (action === 'remover-item') {
        const { itemIdx } = req.body
        const { data: mesa, error: fetchErr } = await supabase.from('mesas').select('*').eq('numero', parseInt(numero)).single()
        if (fetchErr) throw fetchErr

        const novosItens = (mesa.itens || []).filter((_, i) => i !== itemIdx)
        const total = novosItens.reduce((s, i) => s + i.preco * i.qtd, 0)
        const updates = { itens: novosItens, total }
        if (novosItens.length === 0) { updates.status = 'fechada'; updates.aberta_em = null }

        const { error } = await supabase.from('mesas').update(updates).eq('numero', numero)
        if (error) throw error
        return res.status(200).json({ sucesso: true })
      }

      return res.status(400).json({ erro: 'Ação desconhecida' })
    }
  } catch (err) {
    return res.status(500).json({ erro: err.message })
  }

  return res.status(405).end()
}
