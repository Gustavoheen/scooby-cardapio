const { Resend } = require('resend')

const resend = new Resend(process.env.RESEND_API_KEY)
const EMAIL_DESTINO = 'ghenriique30@gmail.com'

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') return res.status(405).end()

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    const descricao = body.descricao || '(sem descrição)'
    const dataFormatada = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: [EMAIL_DESTINO],
      subject: '📋 Nova solicitação de alteração — Scooby-Doo Lanches',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#1e1e1e;color:#fff;border-radius:12px;overflow:hidden;">
          <div style="background:#CC0000;padding:24px;text-align:center;">
            <h1 style="color:#FFD700;margin:0;font-size:20px;">🍔 Scooby-Doo Lanches</h1>
            <p style="color:#fff;margin:8px 0 0;font-size:14px;">Nova solicitação de alteração no cardápio</p>
          </div>
          <div style="padding:24px;">
            <p style="color:#aaa;font-size:13px;margin-top:0;">📅 ${dataFormatada}</p>
            <div style="background:#2e2e2e;border-radius:8px;padding:16px;margin:16px 0;">
              <p style="color:#FFD700;font-weight:bold;margin:0 0 8px;">Descrição:</p>
              <p style="color:#fff;margin:0;white-space:pre-wrap;">${descricao}</p>
            </div>
          </div>
        </div>
      `,
    })

    if (error) return res.status(500).json({ erro: error.message })

    return res.status(200).json({ ok: true, id: data.id })
  } catch (err) {
    return res.status(500).json({ erro: err.message })
  }
}
