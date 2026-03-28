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
        .from('store_state')
        .select('*')
        .eq('id', 1)
        .single()
      if (error && error.code !== 'PGRST116') throw error
      return res.status(200).json(data || { precos: {}, desativados: [] })
    }

    if (req.method === 'POST') {
      const {
        precos = {}, desativados = [], precosVariacoes = {},
        taxaEntrega, tempoEntrega, promocoes, cupons,
        senhaCliente, lojaStatus, horarioAbertura, horarioFechamento,
        whatsappNumero, pixChave, pixTipo, pixNome, bloqueados, diasFuncionamento, senhaGarcom,
      } = req.body

      const estado = {
        id: 1,
        precos,
        desativados,
        precosVariacoes,
        atualizadoEm: new Date().toISOString(),
      }
      if (taxaEntrega !== undefined) estado.taxaEntrega = taxaEntrega
      if (tempoEntrega !== undefined) estado.tempoEntrega = tempoEntrega
      if (promocoes !== undefined) estado.promocoes = promocoes
      if (cupons !== undefined) estado.cupons = cupons
      if (senhaCliente !== undefined) estado.senhaCliente = senhaCliente
      if (lojaStatus !== undefined) estado.lojaStatus = lojaStatus
      if (horarioAbertura !== undefined) estado.horarioAbertura = horarioAbertura
      if (horarioFechamento !== undefined) estado.horarioFechamento = horarioFechamento
      if (whatsappNumero !== undefined) estado.whatsappNumero = whatsappNumero
      if (pixChave !== undefined) estado.pixChave = pixChave
      if (pixTipo !== undefined) estado.pixTipo = pixTipo
      if (pixNome !== undefined) estado.pixNome = pixNome
      if (bloqueados !== undefined) estado.bloqueados = bloqueados
      if (diasFuncionamento !== undefined) estado.diasFuncionamento = diasFuncionamento
      if (senhaGarcom !== undefined) estado.senhaGarcom = senhaGarcom

      let { error } = await supabase.from('store_state').upsert(estado)

      // PGRST204 = coluna não existe no schema do Supabase ainda.
      // Tenta progressivamente removendo campos mais novos até salvar o que for possível.
      if (error?.code === 'PGRST204') {
        const camposOpcionais = [
          'senhaGarcom', 'diasFuncionamento', 'bloqueados', 'whatsappNumero', 'pixChave', 'pixTipo', 'pixNome',
          'cupons', 'promocoes', 'precosVariacoes', 'taxaEntrega', 'tempoEntrega',
          'horarioAbertura', 'horarioFechamento', 'senhaCliente',
        ]
        let estadoTentativa = { ...estado }
        let camposFalharam = []
        for (const campo of camposOpcionais) {
          if (!error || error.code !== 'PGRST204') break
          camposFalharam.push(campo)
          delete estadoTentativa[campo]
          const retry = await supabase.from('store_state').upsert(estadoTentativa)
          error = retry.error
        }
        if (!error && camposFalharam.length > 0) {
          // Salvo parcialmente — retorna aviso com colunas faltando
          return res.status(200).json({
            sucesso: true,
            aviso: `Colunas ausentes no banco: ${camposFalharam.join(', ')}. Execute a migração SQL para habilitar todos os recursos.`,
          })
        }
      }
      if (error) throw error
      return res.status(200).json({ sucesso: true })
    }
  } catch (err) {
    return res.status(500).json({ erro: err.message })
  }

  return res.status(405).end()
}
