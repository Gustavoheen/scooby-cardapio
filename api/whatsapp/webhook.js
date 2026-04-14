/**
 * Webhook WhatsApp — Scooby-Doo Lanches
 *
 * 3 estados apenas:
 * - novo     → saudação fixa (1 msg, zero token)
 * - ativo    → IA controla TUDO (pedido, preço, endereço, pagamento, reclamação, dúvida)
 * - humano   → atendente assumiu, bot silencia
 */

const { createClient } = require('@supabase/supabase-js')
const { enviarTexto, enviarImagem } = require('../_lib/evolution')
const { gerarPixCopiaCola } = require('../_lib/pix')
const { chatComIA } = require('../_lib/gemini')
const { transcreverAudio } = require('../_lib/whisper')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const LINK_CARDAPIO = 'https://www.scoobydoolanches.com.br'
const NOME_LOJA = 'Scooby-Doo Lanches'
const SESSION_TIMEOUT_MS = 6 * 60 * 60 * 1000

// ─── Helpers ───────────────────────────────────────────────

function limparTelefone(jid) {
  let tel = (jid || '').replace(/@.*$/, '').replace(/\D/g, '')
  if (tel.startsWith('55') && tel.length === 12) tel = tel.slice(0, 4) + '9' + tel.slice(4)
  return tel
}

function extrairTextoMensagem(msg) {
  if (!msg) return ''
  return (msg.conversation || msg.extendedTextMessage?.text || msg.buttonsResponseMessage?.selectedButtonId || msg.buttonsResponseMessage?.selectedDisplayText || msg.listResponseMessage?.singleSelectReply?.selectedRowId || msg.listResponseMessage?.title || msg.templateButtonReplyMessage?.selectedId || msg.templateButtonReplyMessage?.selectedDisplayText || '').trim()
}

function extrairImagem(msg) { return !!(msg?.imageMessage) }
function extrairAudio(msg) { return msg?.audioMessage ? { mimetype: msg.audioMessage.mimetype || 'audio/ogg' } : null }

async function buscarConfig() {
  const { data } = await supabase.from('store_state').select('*').eq('id', 1).single()
  return data || {}
}

function estaAberto(config) {
  const status = config.lojaStatus
  if (status === 'fechada') return false
  if (status === 'aberta') return true

  // Auto: verificar dia da semana e horário (timezone Brasília)
  const agora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))

  // Verificar dia da semana se configurado
  const diasFuncionamento = config.diasFuncionamento || []
  if (diasFuncionamento.length > 0) {
    const diasMap = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']
    const diaAtual = diasMap[agora.getDay()]
    if (!diasFuncionamento.includes(diaAtual)) return false
  }

  // Verificar horário com aritmética de minutos (evita bug de comparação de string)
  const minAtual = agora.getHours() * 60 + agora.getMinutes()
  const [hAb, mAb] = (config.horarioAbertura || '18:00').split(':').map(Number)
  const [hFe, mFe] = (config.horarioFechamento || '23:00').split(':').map(Number)
  const minAbertura = hAb * 60 + mAb
  let minFechamento = hFe * 60 + mFe
  if (minFechamento < minAbertura) minFechamento += 24 * 60 // suporte a fechamento após meia-noite

  return minAtual >= minAbertura && minAtual <= minFechamento
}

function formatarDiasFuncionamento(config) {
  const dias = config.diasFuncionamento || []
  if (!dias.length) return ''
  const nomeDias = { domingo: 'Dom', segunda: 'Seg', terca: 'Ter', quarta: 'Qua', quinta: 'Qui', sexta: 'Sex', sabado: 'Sáb' }
  return dias.map(d => nomeDias[d] || d).join(', ')
}

// ─── Sessão ────────────────────────────────────────────────

async function buscarSessao(tel) {
  const { data } = await supabase.from('scooby_whatsapp_sessions').select('*').eq('telefone', tel).single()
  return data
}

async function upsertSessao(tel, updates) {
  const { data } = await supabase.from('scooby_whatsapp_sessions').upsert({ telefone: tel, ...updates, updated_at: new Date().toISOString() }, { onConflict: 'telefone' }).select().single()
  return data
}

async function salvarHistorico(tel, role, text) {
  try {
    const s = await buscarSessao(tel)
    if (!s) return
    const h = (s.ia_historico || []).slice(-40)
    h.push({ role, text })
    await supabase.from('scooby_whatsapp_sessions').update({ ia_historico: h }).eq('telefone', tel)
  } catch {}
}

async function enviarBot(tel, texto) {
  const result = await enviarTexto(tel, texto)
  await salvarHistorico(tel, 'model', texto)
  // Salvar msg ID pra detectar human takeover
  const msgId = result?.key?.id || result?.messageId || null
  if (msgId) {
    try {
      const s = await buscarSessao(tel)
      const ids = (s?.bot_msg_ids || []).slice(-20)
      ids.push(msgId)
      await supabase.from('scooby_whatsapp_sessions').update({ bot_msg_ids: ids }).eq('telefone', tel)
    } catch {}
  }
  return result
}

// ─── Cliente ───────────────────────────────────────────────

async function buscarCliente(tel) {
  const telLimpo = tel.replace(/^55/, '')
  const { data } = await supabase.from('clients').select('*').or(`telefone.eq.${tel},telefone.eq.${telLimpo}`).limit(1).single()
  return data
}

async function salvarCliente(tel, dados) {
  const telLimpo = tel.replace(/^55/, '')
  const existing = await buscarCliente(tel)
  const enderecos = existing?.enderecos || []
  if (dados.endereco && dados.endereco !== 'Retirar no local' && !enderecos.includes(dados.endereco)) enderecos.push(dados.endereco)
  await supabase.from('clients').upsert({ telefone: telLimpo, nome: dados.nome || existing?.nome, pagamento: dados.pagamento || existing?.pagamento, tipoEntrega: dados.tipoEntrega || existing?.tipoEntrega, enderecos, atualizadoEm: new Date().toISOString() }, { onConflict: 'telefone' })
}

// ─── Injetar pedido ────────────────────────────────────────

async function injetarPedido(sessao, config) {
  const pedido = sessao.ia_pedido
  const dados = sessao.dados_cliente || {}
  const tel = sessao.telefone
  const telLimpo = tel.replace(/^55/, '')
  const taxa = Number(config.taxaEntrega) || 3
  const temEntrega = dados.tipoEntrega === 'Entrega'
  const subtotal = pedido.subtotal || 0
  const total = subtotal + (temEntrega ? taxa : 0)

  const agora = new Date()
  const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
  const dataRef = new Date(agora)
  if (dataRef.getHours() < 5) dataRef.setDate(dataRef.getDate() - 1)
  const hoje = dataRef.toLocaleDateString('pt-BR')

  const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true }).filter('data->>data', 'eq', hoje)
  const numeroPedido = `${hoje.replace(/\//g, '')}-${String((count || 0) + 1).padStart(3, '0')}`

  const itensPedido = pedido.itens.map(i => `${i.qtd}x ${i.nome}${i.variacao ? ` (${i.variacao})` : ''} R$${(i.preco_unit * i.qtd).toFixed(2)}`).join(' | ')

  const id = Date.now()
  await supabase.from('orders').insert({ id, data: {
    data: hoje, hora, nomeCliente: dados.nome || sessao.nome_contato || 'Cliente WhatsApp',
    telefone: telLimpo, tipoEntrega: dados.tipoEntrega || 'Retirada',
    endereco: dados.endereco || 'Retirar no local', itensPedido,
    subtotal: subtotal.toFixed(2), taxaEntrega: (temEntrega ? taxa : 0).toFixed(2),
    desconto: '0.00', cupom: '', total: total.toFixed(2),
    pagamento: dados.pagamento || 'Pix', observacao: pedido.observacao || '',
    numeroPedido, origem: 'whatsapp', status: 'recebido',
    troco: dados.troco || '',
  }})

  salvarCliente(tel, dados).catch(() => {})
  return { numeroPedido, total, id }
}

// ─── Main handler ──────────────────────────────────────────

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  try {
    const body = req.body
    const eventNorm = ((body.event || '') + '').toUpperCase().replace(/\./g, '_')
    if (eventNorm !== 'MESSAGES_UPSERT') return res.status(200).json({ ok: true, skip: body.event })

    const data = body.data
    if (!data?.key?.remoteJid) return res.status(200).json({ ok: true, skip: 'no jid' })
    // Ignorar grupos, status/stories, broadcasts
    if (data.key.remoteJid.includes('@g.us')) return res.status(200).json({ ok: true, skip: 'group' })
    if (data.key.remoteJid === 'status@broadcast') return res.status(200).json({ ok: true, skip: 'status' })
    if (data.key.remoteJid.includes('@broadcast')) return res.status(200).json({ ok: true, skip: 'broadcast' })
    // Ignorar reações
    if (data.message?.reactionMessage) return res.status(200).json({ ok: true, skip: 'reaction' })
    // Ignorar mensagens de protocolo (recibo, edição, revogação)
    if (data.message?.protocolMessage || data.message?.editedMessage) return res.status(200).json({ ok: true, skip: 'protocol' })

    const telefone = limparTelefone(data.key.remoteJid)
    const fromMe = data.key.fromMe === true
    const msgId = data.key.id
    const nomeContato = data.pushName || ''

    // Números admin — bot NUNCA responde (dono, atendentes)
    const ADMINS = ['5532999301657', '553299301657']
    if (ADMINS.includes(telefone)) return res.status(200).json({ ok: true, skip: 'admin' })

    // ─── MENSAGEM DA ATENDENTE/DONO ───
    if (fromMe) {
      const msgTexto = extrairTextoMensagem(data.message)
      if (msgTexto) {
        await salvarHistorico(telefone, 'model', `👤 ${msgTexto}`)
        const sessao = await buscarSessao(telefone)
        const botIds = sessao?.bot_msg_ids || []
        if (!botIds.includes(msgId)) {
          // Humano mandou mensagem → bot silencia nessa conversa
          await upsertSessao(telefone, { humano_ativo: true, estado: 'humano' })
        }
      }
      return res.status(200).json({ ok: true, handled: 'outgoing' })
    }

    // ─── IGNORAR SE HUMANO INICIOU A CONVERSA ───
    // Se não existe sessão e a msg é do cliente, o bot pode responder (cliente iniciou)
    // Se existe sessão com humano_ativo, o bot não responde
    // Isso é checado mais abaixo no fluxo

    // ─── IGNORAR MÍDIA (foto, vídeo, sticker, documento) — exceto áudio ───
    const msg = data.message || {}
    if (msg.imageMessage || msg.videoMessage || msg.stickerMessage || msg.documentMessage) {
      // Se tem pedido ativo com PIX pendente e é imagem → pode ser comprovante
      const sessaoCheck = await buscarSessao(telefone)
      if (msg.imageMessage && sessaoCheck?.ultimo_pedido_id) {
        const { data: pedRow } = await supabase.from('orders').select('data').eq('id', sessaoCheck.ultimo_pedido_id).single()
        if (pedRow?.data?.pagamento === 'Pix' && !pedRow?.data?.pixComprovante) {
          await supabase.from('orders').update({ data: { ...pedRow.data, pixComprovante: true, pixComprovanteEm: new Date().toISOString() } }).eq('id', sessaoCheck.ultimo_pedido_id)
          await enviarBot(telefone, `✅ *Comprovante recebido!*\nEstamos conferindo. Obrigado! 🙏`)
          return res.status(200).json({ ok: true, action: 'comprovante' })
        }
      }
      // Foto/vídeo/sticker aleatório → ignorar
      return res.status(200).json({ ok: true, skip: 'media' })
    }

    // ─── MENSAGEM DO CLIENTE ───
    let texto = extrairTextoMensagem(data.message)

    // Transcrever áudio
    const audioInfo = extrairAudio(data.message)
    if (!texto && audioInfo) {
      const base64 = data.message?.audioMessage?.base64 || data.message?.base64 || body.base64 || data.base64 || null
      if (base64) {
        texto = await transcreverAudio(null, base64, audioInfo.mimetype)
      } else {
        // Fallback: buscar via Evolution API
        try {
          const { API_URL, API_KEY, INSTANCE } = require('../_lib/evolution')
          const mediaRes = await fetch(`${API_URL()}/chat/getBase64FromMediaMessage/${INSTANCE()}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', apikey: API_KEY() },
            body: JSON.stringify({ message: { key: data.key, message: data.message } }),
          })
          const mediaData = await mediaRes.json()
          if (mediaData?.base64) texto = await transcreverAudio(null, mediaData.base64, mediaData.mimetype || audioInfo.mimetype)
        } catch {}
      }
      if (!texto) {
        await enviarBot(telefone, `Não consegui ouvir seu áudio 🎙️\nPode digitar o que deseja? 😊`)
        return res.status(200).json({ ok: true, action: 'audio_falhou' })
      }
      texto = texto.trim()
    }

    if (!texto) return res.status(200).json({ ok: true, skip: 'no text' })

    // ─── FILTRO: ignorar mensagens que não são pedido/dúvida ───
    // Mensagens muito curtas sem intenção clara → ignorar se sessão já ativa
    const sessaoPreCheck = await buscarSessao(telefone)
    if (sessaoPreCheck && sessaoPreCheck.estado === 'ativo') {
      const textoClean = texto.toLowerCase().replace(/[^a-záàâãéèêíïóôõúç0-9\s]/g, '').trim()
      // Mensagens vazias de conteúdo (emojis, risada, ok solto, etc)
      const irrelevante = /^(k{2,}|haha|rs{2,}|ok|blz|beleza|valeu|obrigad[oa]|tmj|show|top|massa|dale|bom|boa|ta|tá|sim|uhum|hmm|ah|oh|ata|entendi|kkkk|kkkkk)$/i.test(textoClean)
      if (irrelevante && !sessaoPreCheck.ia_pedido) {
        // Não tem pedido em andamento e msg é irrelevante → ignorar
        return res.status(200).json({ ok: true, skip: 'irrelevante' })
      }
    }

    // Salvar mensagem do cliente
    await salvarHistorico(telefone, 'user', texto)

    // Buscar/criar sessão
    let sessao = await buscarSessao(telefone)
    const config = await buscarConfig()
    const modoBot = config.bot_ativo || 'auto'
    if (modoBot === 'desligado') return res.status(200).json({ ok: true, skip: 'bot_desligado' })

    // Timeout — resetar sessão antiga
    if (sessao?.updated_at && (Date.now() - new Date(sessao.updated_at).getTime() > SESSION_TIMEOUT_MS)) {
      sessao = await upsertSessao(telefone, { estado: 'novo', humano_ativo: false, nome_contato: nomeContato, bot_msg_ids: [], ia_historico: [], ia_pedido: null, dados_cliente: null })
    }
    if (!sessao) {
      sessao = await upsertSessao(telefone, { estado: 'novo', humano_ativo: false, nome_contato: nomeContato, bot_msg_ids: [], ia_historico: [], ia_pedido: null, dados_cliente: null })
    }

    // Humano ativo → bot silencia (timeout de 2h, não 5min)
    if (sessao.humano_ativo) {
      // Se faz mais de 2h que humano assumiu, devolver pro bot
      const diff = Date.now() - new Date(sessao.updated_at).getTime()
      if (diff < 2 * 60 * 60 * 1000) {
        return res.status(200).json({ ok: true, skip: 'humano_ativo' })
      }
      // Timeout — devolver pro bot
      await upsertSessao(telefone, { humano_ativo: false, estado: 'novo' })
      sessao = await buscarSessao(telefone)
    }

    // Fora do horário — sempre re-verificar o status real da loja
    const aberto = modoBot === 'ligado' ? true : estaAberto(config)
    if (!aberto) {
      if (sessao.estado !== 'fora_horario') {
        // Primeira mensagem fora do horário → avisar uma única vez
        const diasStr = formatarDiasFuncionamento(config)
        const linhaHorario = `🕐 Horário: *${config.horarioAbertura || '18:00'} às ${config.horarioFechamento || '23:00'}*`
        const linhaDias = diasStr ? `\n📅 Funcionamento: *${diasStr}*` : ''
        await enviarBot(telefone,
          `Olá${nomeContato ? `, ${nomeContato}` : ''}! 👋\n\n` +
          `O *${NOME_LOJA}* está *fechado* no momento.\n` +
          `${linhaHorario}${linhaDias}\n\n` +
          `Volte quando estivermos abertos! 😊`
        )
        await upsertSessao(telefone, { estado: 'fora_horario', nome_contato: nomeContato })
      }
      // Se já enviou o aviso (estado === 'fora_horario'), silêncio total — humano pode assumir
      return res.status(200).json({ ok: true, action: 'fora_horario' })
    }

    // Loja abriu → se sessão estava marcada como fora do horário, resetar para novo
    if (sessao.estado === 'fora_horario') {
      sessao = await upsertSessao(telefone, { estado: 'novo', nome_contato: nomeContato })
    }

    // ═══════════════════════════════════════════
    // 3 ESTADOS APENAS
    // ═══════════════════════════════════════════

    // ═══ NOVO — saudação fixa (zero token) ═══
    if (sessao.estado === 'novo') {
      await enviarBot(telefone,
        `Olá${nomeContato ? `, ${nomeContato}` : ''}! 👋\n\n` +
        `Bem-vindo ao *${NOME_LOJA}*! 🍔🌭\n\n` +
        `Faça seu pedido pelo nosso cardápio digital:\n` +
        `👉 ${LINK_CARDAPIO}\n\n` +
        `Ou se preferir, é só me dizer o que deseja por aqui! 😋`
      )
      await upsertSessao(telefone, { estado: 'ativo', nome_contato: nomeContato, ia_historico: sessao.ia_historico || [], ia_pedido: null, dados_cliente: null })
      return res.status(200).json({ ok: true, action: 'saudacao' })
    }

    // ═══ HUMANO — silêncio ═══
    if (sessao.estado === 'humano') {
      return res.status(200).json({ ok: true, skip: 'humano' })
    }

    // ═══ ATIVO — IA controla TUDO ═══
    const historico = sessao.ia_historico || []

    // Contexto extra: dados do cliente se já tiver
    const clienteDB = await buscarCliente(telefone)
    const taxaEntrega = Number(config.taxaEntrega) || 3
    let contextoExtra = `\n[INFO SISTEMA: Taxa de entrega: R$${taxaEntrega.toFixed(2)}, Tempo entrega: ${config.tempoEntrega || '40 a 60 min'}, Horário: ${config.horarioAbertura || '18:00'} às ${config.horarioFechamento || '23:00'}]`
    // Se já tem pedido feito, informar a IA
    if (sessao.ultimo_pedido_id) {
      contextoExtra += `\n[INFO SISTEMA: Este cliente JÁ FEZ um pedido nesta sessão. NÃO tente anotar novo pedido a menos que ele peça explicitamente. Apenas responda perguntas sobre tempo de entrega, status, etc. Se perguntar "quanto tempo", use o tempo de entrega informado acima.]`
    }
    // Promoções ativas
    if (config.promocoes?.length > 0) {
      const promoAtivas = config.promocoes.filter(p => p.ativo !== false)
      if (promoAtivas.length > 0) contextoExtra += `\n[INFO SISTEMA: Promoções ativas: ${promoAtivas.map(p => p.titulo || p.nome).join(', ')}]`
    }
    if (config.cupons?.length > 0) {
      const cuponsAtivos = config.cupons.filter(c => c.ativo !== false)
      if (cuponsAtivos.length > 0) contextoExtra += `\n[INFO SISTEMA: Cupons ativos: ${cuponsAtivos.map(c => `${c.codigo} (${c.tipo === 'percentual' ? c.valor + '%' : 'R$' + c.valor})`).join(', ')}]`
    }
    if (clienteDB) {
      contextoExtra += `\n[INFO SISTEMA: Cliente cadastrado: ${clienteDB.nome || ''}, tel: ${clienteDB.telefone || ''}`
      if (clienteDB.enderecos?.length > 0) contextoExtra += `, último endereço: ${clienteDB.enderecos[clienteDB.enderecos.length - 1]}`
      contextoExtra += `]`
    }
    if (sessao.nome_contato) contextoExtra += `\n[INFO SISTEMA: Nome WhatsApp: ${sessao.nome_contato}]`

    const msgParaIA = contextoExtra ? texto + contextoExtra : texto

    const { texto: respostaIA, pedido } = await chatComIA(historico.filter(m => !m.text.startsWith('[INFO')), msgParaIA)

    await enviarBot(telefone, respostaIA)

    // Se IA pediu pra encaminhar pro humano
    if (respostaIA.toLowerCase().includes('atendente') && respostaIA.toLowerCase().includes('aguarde')) {
      await upsertSessao(telefone, { humano_ativo: true, estado: 'humano' })
      // Criar alerta
      await supabase.from('scooby_alertas').insert({ telefone, nome_contato: sessao.nome_contato || nomeContato, tipo: 'reclamacao_geral', mensagem: texto, status: 'aberto' }).catch(() => {})
      return res.status(200).json({ ok: true, action: 'encaminhado_humano' })
    }

    if (pedido) {
      // IA gerou JSON do pedido → injetar no sistema
      const dados = pedido.dados_extraidos || {}

      // Preencher dados faltantes
      if (!dados.nome && (clienteDB?.nome || sessao.nome_contato || nomeContato)) {
        dados.nome = clienteDB?.nome || sessao.nome_contato || nomeContato
      }
      if (dados.nome) {
        dados.nome = dados.nome.replace(/^(me chamo|meu nome [eé]|sou o|sou a|eu sou|nome:?)\s*/i, '').replace(/[.!,]+$/, '').trim()
      }
      if (!dados.endereco && clienteDB?.enderecos?.length > 0) {
        dados.endereco = clienteDB.enderecos[clienteDB.enderecos.length - 1]
      }
      if (!dados.tipoEntrega) dados.tipoEntrega = dados.endereco ? 'Entrega' : 'Retirada'
      if (!dados.pagamento) dados.pagamento = 'Pix'

      // Validar se tem tudo pra injetar
      const faltaNome = !dados.nome || dados.nome.length < 2
      const faltaEndereco = dados.tipoEntrega === 'Entrega' && !dados.endereco
      const faltaPagamento = !dados.pagamento

      if (faltaNome || faltaEndereco || faltaPagamento) {
        // IA vai continuar perguntando o que falta na próxima msg
        await upsertSessao(telefone, { ia_pedido: pedido, dados_cliente: dados })
        return res.status(200).json({ ok: true, action: 'pedido_incompleto' })
      }

      // Tudo completo → injetar
      sessao.ia_pedido = pedido
      sessao.dados_cliente = dados
      const resultado = await injetarPedido(sessao, config)

      // PIX
      if (dados.pagamento === 'Pix') {
        const pixChave = config.pixChave || config.pix_chave || ''
        const pixNome = config.pixNome || config.pix_nome || 'SCOOBY DOO LANCHES'
        if (pixChave && resultado.total > 0) {
          const copiaCola = gerarPixCopiaCola({ chave: pixChave, nome: pixNome, cidade: 'Visconde do Rio Branco', valor: resultado.total, txid: `PED${resultado.numeroPedido}` })
          await enviarBot(telefone, `🏦 *PIX — Pedido #${resultado.numeroPedido}*\nValor: *R$ ${resultado.total.toFixed(2).replace('.', ',')}*\nChave: *${pixChave}*`)
          await enviarTexto(telefone, copiaCola)
          await enviarBot(telefone, `👆 Segure a mensagem acima pra copiar!\n\n⚠️ *Envie o comprovante aqui* 🧾`)
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(copiaCola)}`
          enviarImagem(telefone, qrUrl, `📱 QR Code PIX`).catch(() => {})
        }
      }

      await upsertSessao(telefone, { estado: 'ativo', ultimo_pedido_id: resultado.id, ia_pedido: null, dados_cliente: null })
      return res.status(200).json({ ok: true, action: 'pedido_injetado', numeroPedido: resultado.numeroPedido })
    }

    // Detectar comprovante PIX (imagem)
    if (extrairImagem(data.message) && sessao.ultimo_pedido_id) {
      const { data: pedRow } = await supabase.from('orders').select('data').eq('id', sessao.ultimo_pedido_id).single()
      if (pedRow) {
        await supabase.from('orders').update({ data: { ...pedRow.data, pixComprovante: true, pixComprovanteEm: new Date().toISOString() } }).eq('id', sessao.ultimo_pedido_id)
      }
      await enviarBot(telefone, `✅ *Comprovante recebido!*\nEstamos conferindo. Obrigado! 🙏`)
      return res.status(200).json({ ok: true, action: 'comprovante' })
    }

    // Detectar reclamação
    const textoLower = texto.toLowerCase()
    if (sessao.ultimo_pedido_id) {
      const isAtraso = /atras|demor|cadê|cade|não chegou|esperando|ta demorando/i.test(textoLower)
      const isQualidade = /ruim|horrível|péssimo|frio|errado|trocado|reclamar|lixo/i.test(textoLower)
      if (isAtraso || isQualidade) {
        await supabase.from('scooby_alertas').insert({
          telefone, nome_contato: sessao.nome_contato || nomeContato,
          tipo: isAtraso ? 'atraso' : 'qualidade', mensagem: texto,
          pedido_id: sessao.ultimo_pedido_id, status: 'aberto',
        }).catch(() => {})
        // IA já respondeu acima com empatia — o alerta foi criado pro admin
      }
    }

    return res.status(200).json({ ok: true, action: 'ia' })
  } catch (err) {
    console.error('[Webhook]', err)
    return res.status(200).json({ ok: false, error: err.message })
  }
}
