const { put, list } = require('@vercel/blob')

const KEY = 'cardapio-state.json'

async function lerEstado() {
  try {
    const { blobs } = await list({ prefix: KEY })
    if (!blobs.length) return { precos: {}, desativados: [] }
    const res = await fetch(blobs[0].url + '?t=' + Date.now(), {
      headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
    })
    return await res.json()
  } catch {
    return { precos: {}, desativados: [] }
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    if (req.method === 'GET') {
      const estado = await lerEstado()
      return res.status(200).json(estado)
    }

    if (req.method === 'POST') {
      const { precos = {}, desativados = [], precosVariacoes = {}, taxaEntrega, tempoEntrega, promocoes, cupons, senhaCliente, lojaStatus, horarioAbertura, horarioFechamento } = req.body
      const estado = { precos, desativados, precosVariacoes }
      if (taxaEntrega !== undefined) estado.taxaEntrega = taxaEntrega
      if (tempoEntrega !== undefined) estado.tempoEntrega = tempoEntrega
      if (promocoes !== undefined) estado.promocoes = promocoes
      if (cupons !== undefined) estado.cupons = cupons
      if (senhaCliente !== undefined) estado.senhaCliente = senhaCliente
      if (lojaStatus !== undefined) estado.lojaStatus = lojaStatus
      if (horarioAbertura !== undefined) estado.horarioAbertura = horarioAbertura
      if (horarioFechamento !== undefined) estado.horarioFechamento = horarioFechamento
      await put(KEY, JSON.stringify(estado), {
        access: 'private',
        contentType: 'application/json',
        allowOverwrite: true,
      })
      return res.status(200).json({ sucesso: true })
    }
  } catch (err) {
    return res.status(500).json({ erro: err.message })
  }

  return res.status(405).end()
}
