// Endpoint temporário de migração — executar UMA VEZ e depois remover
// GET /api/migrate?secret=scooby_migrate_2024
const { createClient } = require('@supabase/supabase-js')

module.exports = async function handler(req, res) {
  if (req.query.secret !== 'scooby_migrate_2024') {
    return res.status(401).json({ erro: 'Não autorizado' })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  // Verifica se a coluna bloqueados já existe
  const { data: check } = await supabase
    .from('store_state')
    .select('bloqueados')
    .eq('id', 1)
    .single()

  if (check !== null && 'bloqueados' in (check || {})) {
    return res.status(200).json({ ok: true, msg: 'Colunas já existem — nada a fazer.' })
  }

  // Tenta upsert com os novos campos para forçar o schema cache a reconhecê-los
  // Se falhar com PGRST204, retorna instruções SQL
  const { error } = await supabase.from('store_state').upsert({
    id: 1,
    bloqueados: [],
    whatsappNumero: null,
    pixChave: null,
    pixTipo: null,
    pixNome: null,
  })

  if (error?.code === 'PGRST204') {
    return res.status(200).json({
      ok: false,
      msg: 'Colunas não existem. Execute o SQL abaixo no Supabase SQL Editor:',
      sql: `ALTER TABLE store_state
  ADD COLUMN IF NOT EXISTS "whatsappNumero" text,
  ADD COLUMN IF NOT EXISTS "pixChave" text,
  ADD COLUMN IF NOT EXISTS "pixTipo" text,
  ADD COLUMN IF NOT EXISTS "pixNome" text,
  ADD COLUMN IF NOT EXISTS bloqueados jsonb DEFAULT '[]';`,
    })
  }

  if (error) return res.status(500).json({ erro: error.message })

  return res.status(200).json({ ok: true, msg: 'Colunas criadas/atualizadas com sucesso!' })
}
