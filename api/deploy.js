// Rate limiting simples em memória — max 1 deploy por 5 minutos
let lastDeploy = 0
const COOLDOWN_MS = 5 * 60 * 1000

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const now = Date.now()
  if (now - lastDeploy < COOLDOWN_MS) {
    const restante = Math.ceil((COOLDOWN_MS - (now - lastDeploy)) / 1000)
    return res.status(429).json({ erro: `Aguarde ${restante}s antes de novo deploy.` })
  }

  const hookUrl = process.env.DEPLOY_HOOK_URL
  if (!hookUrl) return res.status(500).json({ erro: 'Deploy hook não configurado' })

  try {
    lastDeploy = now
    const r = await fetch(hookUrl, { method: 'POST' })
    const data = await r.json()
    return res.status(200).json({ sucesso: true, job: data.job?.id || null })
  } catch (err) {
    lastDeploy = 0 // resetar em caso de falha
    return res.status(500).json({ erro: err.message })
  }
}
