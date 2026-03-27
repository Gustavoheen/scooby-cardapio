module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({ version: process.env.VERCEL_DEPLOYMENT_ID || 'dev' })
}
