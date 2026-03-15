const { createClient } = require('@supabase/supabase-js')

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const supabase = getSupabase()

  try {
    if (req.method === 'GET') {
      const { telefone } = req.query
      if (!telefone) return res.status(400).json({ erro: 'Informe o telefone' })

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('telefone', telefone)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return res.status(200).json(data || null)
    }

    if (req.method === 'POST') {
      const { telefone, nome, pagamento, tipoEntrega, enderecos } = req.body
      if (!telefone) return res.status(400).json({ erro: 'Informe o telefone' })

      const { error } = await supabase
        .from('clients')
        .upsert({
          telefone,
          nome,
          pagamento,
          tipoEntrega,
          enderecos: enderecos || [],
          atualizadoEm: new Date().toISOString(),
        }, { onConflict: 'telefone' })

      if (error) throw error
      return res.status(200).json({ sucesso: true })
    }
    if (req.method === 'PUT') {
      const { telefone, nome } = req.body
      if (!telefone) return res.status(400).json({ erro: 'Informe o telefone' })
      const { error } = await supabase
        .from('clients')
        .update({ nome, atualizadoEm: new Date().toISOString() })
        .eq('telefone', telefone)
      if (error) throw error
      return res.status(200).json({ sucesso: true })
    }

    if (req.method === 'DELETE') {
      const { telefone } = req.query
      if (!telefone) return res.status(400).json({ erro: 'Informe o telefone' })
      const { error } = await supabase.from('clients').delete().eq('telefone', telefone)
      if (error) throw error
      return res.status(200).json({ sucesso: true })
    }
  } catch (err) {
    return res.status(500).json({ erro: err.message })
  }

  return res.status(405).end()
}
