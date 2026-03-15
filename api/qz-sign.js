import crypto from 'crypto'

export default function handler(req, res) {
  const { toSign } = req.query
  if (!toSign) return res.status(400).json({ error: 'toSign required' })

  const privateKey = process.env.QZ_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!privateKey) return res.status(500).json({ error: 'Chave não configurada' })

  try {
    const sign = crypto.createSign('SHA512')
    sign.update(toSign)
    const signature = sign.sign(privateKey, 'base64')
    res.status(200).send(signature)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
