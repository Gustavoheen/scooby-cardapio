const { createClient } = require('@supabase/supabase-js')

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
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
      const { error } = await supabase
        .from('orders')
        .insert({ id, data: req.body })
      if (error) throw error
      return res.status(200).json({ sucesso: true })
    }
  } catch (err) {
    return res.status(500).json({ erro: err.message })
  }

  return res.status(405).end()
}
