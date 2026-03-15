const { createClient } = require('@supabase/supabase-js')

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
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
      const id = Date.now()

      // Gera número sequencial do dia consultando o banco
      const hoje = new Date().toLocaleDateString('pt-BR')
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .filter('data->>data', 'eq', hoje)
      const numeroPedido = `${hoje.replace(/\//g, '')}-${String((count || 0) + 1).padStart(3, '0')}`

      const payload = { ...req.body, numeroPedido }
      const { error } = await supabase
        .from('orders')
        .insert({ id, data: payload })
      if (error) throw error
      return res.status(200).json({ sucesso: true, numeroPedido })
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
