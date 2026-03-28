// Script: comprime e faz upload das fotos para Supabase Storage (bucket público)
// Uso: node scripts/upload-fotos-supabase.mjs
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { readFileSync } from 'fs'
import { join } from 'path'

// Lê credenciais do .env.local
const envVars = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n')
    .filter(l => l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).replace(/^"|"$/g,'').replace(/\\n/g,'').trim()] })
)

const supabase = createClient(envVars.SUPABASE_URL, envVars.SUPABASE_SERVICE_KEY)
const BASE = 'C:/Users/Gustavo/Downloads/cardapio_fotos_completo/cardapio'
const BUCKET = 'cardapio'

const FOTOS = [
  { arquivo: 'hamburgueres/SKU001_HAMBURGER.jpg',                         id: 1   },
  { arquivo: 'hamburgueres/SKU002_CHEESE_BURGUER.jpg',                    id: 2   },
  { arquivo: 'hamburgueres/SKU003_BACON_BURGER.jpg',                      id: 3   },
  { arquivo: 'hamburgueres/SKU004_EGG_BURGUER.jpg',                       id: 4   },
  { arquivo: 'hamburgueres/SKU005_CALABRESA_BURGUER.jpg',                 id: 5   },
  { arquivo: 'hamburgueres/SKU006_CHEESE_EGG_BURGUER.jpg',                id: 6   },
  { arquivo: 'hamburgueres/SKU007_CHEESE_BACON_BURGUER.jpg',              id: 7   },
  { arquivo: 'hamburgueres/SKU008_EGG_BACON_BURGUER.jpg',                 id: 8   },
  { arquivo: 'hamburgueres/SKU009_CHEESE_CALABRESA_BURGUER.jpg',          id: 9   },
  { arquivo: 'hamburgueres/SKU010_EGG_CALABRESA_BURGUER.jpg',             id: 10  },
  { arquivo: 'hamburgueres/SKU011_CHEESE_EGG_CALABRESA_BURGUER.jpg',      id: 11  },
  { arquivo: 'hamburgueres/SKU012_CHEESE_EGG_BACON_BURGUER.jpg',          id: 12  },
  { arquivo: 'hamburgueres_duplos/SKU013_HAMBURGER_DUPLO.jpg',            id: 101 },
  { arquivo: 'hamburgueres_duplos/SKU014_CHEESE_BURGUER_DUPLO.jpg',       id: 102 },
  { arquivo: 'hamburgueres_duplos/SKU015_BACON_BURGER_DUPLO.jpg',         id: 103 },
  { arquivo: 'hamburgueres_duplos/SKU016_EGG_BURGUER_DUPLO.jpg',          id: 104 },
  { arquivo: 'hamburgueres_duplos/SKU017_CALABRESA_BURGUER_DUPLO.jpg',    id: 105 },
  { arquivo: 'hamburgueres_duplos/SKU018_CHEESE_EGG_BURGUER_DUPLO.jpg',   id: 106 },
  { arquivo: 'hamburgueres_duplos/SKU019_CHEESE_BACON_BURGUER_DUPLO.jpg', id: 107 },
  { arquivo: 'hamburgueres_duplos/SKU020_EGG_BACON_BURGUER_DUPLO.jpg',    id: 108 },
  { arquivo: 'hamburgueres_duplos/SKU021_CHEESE_CALABRESA_BURGUER_DUPLO.jpg', id: 109 },
  { arquivo: 'hamburgueres_duplos/SKU022_EGG_CALABRESA_BURGUER_DUPLO.jpg',    id: 110 },
  { arquivo: 'hamburgueres_duplos/SKU023_CHEESE_EGG_CALABRESA_BURGUER_DUPLO.jpg', id: 111 },
  { arquivo: 'hamburgueres_duplos/SKU024_CHEESE_EGG_BACON_BURGUER_DUPLO.jpg',    id: 112 },
  { arquivo: 'artesanais/SKU025_SIMPLES_ARTESANAL.jpg',                   id: 201 },
  { arquivo: 'artesanais/SKU026_BACON_BURGER_ARTESANAL.jpg',              id: 202 },
  { arquivo: 'artesanais/SKU027_X_BURGUER_ARTESANAL.jpg',                 id: 203 },
  { arquivo: 'artesanais/SKU028_EGG_BURGUER_ARTESANAL.jpg',               id: 204 },
  { arquivo: 'artesanais/SKU029_X_BACON_ARTESANAL.jpg',                   id: 205 },
  { arquivo: 'artesanais/SKU030_X_EGG_BACON_ARTESANAL.jpg',               id: 206 },
  { arquivo: 'artesanais/SKU031_ARTESANAL_X_EGG_DUPLO.jpg',               id: 207 },
  { arquivo: 'especiais/SKU032_LACADOR.jpg',                              id: 401 },
  { arquivo: 'especiais/SKU033_ESPECIAL.jpg',                             id: 402 },
  { arquivo: 'especiais/SKU034_CHEESE_TUDO.jpg',                          id: 403 },
  { arquivo: 'pao_linguica/SKU035_PAO_LINGUICA_SIMPLES.jpg',              id: 301 },
  { arquivo: 'pao_linguica/SKU036_PAO_LINGUICA_TRADICIONAL.jpg',          id: 302 },
  { arquivo: 'pao_linguica/SKU037_PAO_LINGUICA_DA_CASA.jpg',              id: 303 },
  { arquivo: 'macarrao/SKU038_MACARRAO_ALHO_OLEO_BACON.jpg',              id: 501 },
  { arquivo: 'macarrao/SKU039_MACARRAO_BOLONHESA.jpg',                    id: 502 },
  { arquivo: 'macarrao/SKU040_MACARRAO_BOLONHESA_BIG.jpg',                id: 503 },
  { arquivo: 'macarrao/SKU041_MACARRAO_FRANGO.jpg',                       id: 504 },
  { arquivo: 'macarrao/SKU042_MACARRAO_FRANGO_BIG.jpg',                   id: 505 },
  { arquivo: 'porcoes/SKU043_BATATA_200G_QUEIJO_BACON.jpg',               id: 601 },
  { arquivo: 'porcoes/SKU044_BATATA_400G_QUEIJO_BACON.jpg',               id: 602 },
  { arquivo: 'porcoes/SKU045_PORCAO_CONTRA_FILE_INTEIRA.jpg',             id: 603 },
  { arquivo: 'porcoes/SKU046_MEIA_PORCAO_CONTRA_FILE.jpg',                id: 604 },
  { arquivo: 'porcoes/SKU047_PORCAO_PERNIL_INTEIRA.jpg',                  id: 605 },
  { arquivo: 'porcoes/SKU048_MEIA_PORCAO_PERNIL.jpg',                     id: 606 },
  { arquivo: 'bebidas/SKU049_COCA_COLA_2L.jpg',                           id: 701 },
  { arquivo: 'bebidas/SKU050_FANTA_LARANJA_2L.jpg',                       id: 702 },
  { arquivo: 'bebidas/SKU051_GUARANA_1L.jpg',                             id: 703 },
  { arquivo: 'bebidas/SKU052_COCA_COLA_1L.jpg',                           id: 704 },
  { arquivo: 'bebidas/SKU053_COCA_COLA_600ML.jpg',                        id: 705 },
  { arquivo: 'bebidas/SKU054_COCA_COLA_LATA.jpg',                         id: 706 },
  { arquivo: 'bebidas/SKU055_FANTA_LARANJA_LATA.jpg',                     id: 707 },
  { arquivo: 'bebidas/SKU056_MONSTER_ENERGETICO.jpg',                     id: 708 },
  { arquivo: 'bebidas/SKU057_BRAHMA_LATAO.jpg',                           id: 709 },
  { arquivo: 'bebidas/SKU058_SKOL_LATAO.jpg',                             id: 710 },
  { arquivo: 'bebidas/SKU059_SUCO_TIAL_UVA_1L.jpg',                       id: 711 },
  { arquivo: 'bebidas/SKU060_SUCO_TIAL_UVA_LATA.jpg',                     id: 712 },
  { arquivo: 'bebidas/SKU061_DEL_VALLE_UVA_1L.jpg',                       id: 713 },
  { arquivo: 'bebidas/SKU062_DEL_VALLE_LARANJA_1L.jpg',                   id: 714 },
  { arquivo: 'bebidas/SKU063_DEL_VALLE_UVA_LATA.jpg',                     id: 715 },
  { arquivo: 'bebidas/SKU064_AGUA_SEM_GAS.jpg',                           id: 716 },
  { arquivo: 'bebidas/SKU065_AGUA_COM_GAS.jpg',                           id: 717 },
]

async function garantirBucket() {
  const { data: buckets } = await supabase.storage.listBuckets()
  const existe = buckets?.find(b => b.name === BUCKET)
  if (!existe) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true })
    if (error) throw new Error('Erro ao criar bucket: ' + error.message)
    console.log(`Bucket '${BUCKET}' criado com acesso público.`)
  } else {
    console.log(`Bucket '${BUCKET}' já existe.`)
  }
}

async function main() {
  await garantirBucket()
  console.log(`\nComprimindo e enviando ${FOTOS.length} fotos...\n`)
  const resultado = {}

  for (const { arquivo, id } of FOTOS) {
    const caminho = join(BASE, arquivo)
    const nomeArquivo = arquivo.split('/').pop()

    try {
      // Comprime: max 900px, qualidade 82% — web-otimizado
      const buffer = await sharp(caminho)
        .resize(900, 900, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 82, progressive: true })
        .toBuffer()

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(nomeArquivo, buffer, {
          contentType: 'image/jpeg',
          upsert: true,
        })

      if (error) throw error

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(nomeArquivo)
      resultado[id] = data.publicUrl
      const kb = Math.round(buffer.length / 1024)
      console.log(`  ✓  id:${id}  ${nomeArquivo}  (${kb}KB)`)
    } catch (err) {
      console.error(`  ✗  id:${id}  ${nomeArquivo}  →  ${err.message}`)
    }
  }

  console.log('\n\n// ── RESULTADO (cole no cardapio.js) ──')
  console.log('export const IMAGENS = ' + JSON.stringify(resultado, null, 2))
}

main().catch(console.error)
