import { useState, useEffect } from 'react'
import { CONFIG } from '../config'
import { salvarPedido } from '../utils/salvarPedido'

const PAGAMENTOS = ['Pix', 'Dinheiro', 'Cartão de Débito', 'Cartão de Crédito']

function formatarMensagemWhatsApp(dados, itens, subtotal, taxaEntrega, desconto, cupomAplicado, tempoEntrega) {
  const baseTotal = subtotal + (dados.tipoEntrega === 'entrega' ? taxaEntrega : 0)
  const total = baseTotal - desconto
  const agora = new Date()
  const data = agora.toLocaleDateString('pt-BR')
  const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const linhaItens = itens.map(l => {
    const variacao = l.variacao ? ` (${l.variacao})` : ''
    return `• ${l.qtd}x ${l.item.nome}${variacao} — R$ ${(l.preco * l.qtd).toFixed(2).replace('.', ',')}`
  }).join('\n')

  return encodeURIComponent(
    `🍫 *NOVO PEDIDO — ${CONFIG.nomeLoja}*\n` +
    `${'─'.repeat(28)}\n` +
    `📅 *Data:* ${data}   🕐 *Hora:* ${hora}\n` +
    `${'─'.repeat(28)}\n\n` +
    `👤 *Nome:* ${dados.nome}\n` +
    (dados.telefone ? `📞 *Telefone:* ${dados.telefone}\n` : '') +
    `📍 *${dados.tipoEntrega === 'entrega' ? 'Endereço' : 'Retirada'}:* ${dados.tipoEntrega === 'entrega' ? `${dados.rua}, ${dados.numero}${dados.complemento ? `, ${dados.complemento}` : ''} — ${dados.bairro}` : 'Retirar no local'}\n\n` +
    `🛒 *Itens:*\n${linhaItens}\n\n` +
    `💰 *Subtotal:* R$ ${subtotal.toFixed(2).replace('.', ',')}\n` +
    (dados.tipoEntrega === 'entrega' ? `🚗 *Entrega:* R$ ${taxaEntrega.toFixed(2).replace('.', ',')}\n` : '') +
    (cupomAplicado ? `🎟 *Cupom:* ${cupomAplicado.codigo} (-R$ ${desconto.toFixed(2).replace('.', ',')})\n` : '') +
    `💵 *TOTAL: R$ ${total.toFixed(2).replace('.', ',')}*\n\n` +
    `💳 *Pagamento:* ${dados.pagamento}\n` +
    (dados.pagamento === 'Dinheiro' && dados.troco ? `💵 *Troco para:* R$ ${dados.troco}\n` : '') +
    (dados.pagamento === 'Dinheiro' && !dados.troco ? `💵 *Troco:* Não precisa\n` : '') +
    (dados.observacao ? `📝 *Obs:* ${dados.observacao}\n` : '') +
    (dados.tipoEntrega === 'entrega' ? `\n⏱ *Prazo de entrega:* ${tempoEntrega} a partir da confirmação do pedido.` : `\n⏱ *Prazo de retirada:* ${tempoEntrega} a partir da confirmação.`) +
    (dados.pagamento === 'Pix' ? `\n📎 *Envie o comprovante do Pix para confirmar seu pedido.*` : '') +
    (dados.telefone ? `\n\n📍 *Acompanhe seu pedido:* https://thalia-doces.vercel.app/acompanhar?tel=${dados.telefone.replace(/\D/g, '')}` : '')
  )
}

// ── Gerador de payload Pix (EMV BR Code) ──────────────────────────
function calcCRC16(str) {
  let crc = 0xFFFF
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1)
      crc &= 0xFFFF
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

function gerarPixPayload(chave, nome, cidade, valor) {
  const f = (id, v) => `${id}${String(v.length).padStart(2, '0')}${v}`
  const merchantInfo = f('00', 'br.gov.bcb.pix') + f('01', chave)
  const additional = f('62', f('05', '***'))
  const nomeASCII = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').substring(0, 25)
  const cidadeASCII = cidade.normalize('NFD').replace(/[\u0300-\u036f]/g, '').split('-')[0].trim().substring(0, 15)
  const payload =
    f('00', '01') +
    f('26', merchantInfo) +
    f('52', '0000') +
    f('53', '986') +
    (valor > 0 ? f('54', valor.toFixed(2)) : '') +
    f('58', 'BR') +
    f('59', nomeASCII || 'Loja') +
    f('60', cidadeASCII || 'Cidade') +
    additional +
    '6304'
  return payload + calcCRC16(payload)
}

// Tela do Pix
function TelaPix({ total, onConfirmar, pixChave, pixTipo, pixNome }) {
  const [copiado, setCopiado] = useState(false)

  const chaveRaw = pixChave || CONFIG.pixChave
  const tipo     = pixTipo  || CONFIG.pixTipo
  const nome     = pixNome  || CONFIG.pixNome

  // Formata a chave conforme o tipo exigido pelo BCB
  let chave = chaveRaw
  if (tipo === 'Telefone') {
    const digits = chaveRaw.replace(/\D/g, '')
    chave = digits.startsWith('55') ? `+${digits}` : `+55${digits}`
  } else if (tipo === 'CPF') {
    chave = chaveRaw.replace(/\D/g, '')
  } else if (tipo === 'CNPJ') {
    chave = chaveRaw.replace(/\D/g, '')
  }

  const pixPayload = gerarPixPayload(chave, nome, CONFIG.cidade, total)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&ecc=M&data=${encodeURIComponent(pixPayload)}`

  function copiarPayload() {
    navigator.clipboard.writeText(pixPayload)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 3000)
  }

  return (
    <div className="space-y-4">
      {/* QR Code */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-gray-600 text-sm text-center">Escaneie o QR Code para pagar:</p>
        <div className="bg-white rounded-xl p-2 inline-block">
          <img src={qrUrl} alt="QR Code Pix" width={180} height={180} className="block" />
        </div>
        <p className="text-green-400 font-bold text-2xl">R$ {total.toFixed(2).replace('.', ',')}</p>
        <p className="text-gray-500 text-xs">Favorecido: {nome} — {tipo}: {chave}</p>
      </div>

      {/* Copia e Cola */}
      <div className="space-y-2">
        <p className="text-gray-400 text-xs text-center">Ou use o Pix copia e cola:</p>
        <div className="bg-scooby-escuro rounded-xl px-3 py-2 border border-scooby-borda">
          <p className="text-gray-600 text-xs font-mono break-all leading-relaxed select-all">
            {pixPayload}
          </p>
        </div>
        <button
          onClick={copiarPayload}
          className={`w-full py-2.5 rounded-xl font-bold text-sm transition ${
            copiado ? 'bg-green-600 text-white' : 'bg-scooby-borda hover:bg-scooby-vermelho text-white'
          }`}
        >
          {copiado ? '✅ Código copiado!' : '📋 Copiar código Pix'}
        </button>
      </div>

      <div className="bg-yellow-900/40 border border-yellow-600/50 rounded-xl px-4 py-3 text-yellow-300 text-sm text-center">
        ⚠️ Após pagar, clique no botão abaixo e envie o comprovante pelo WhatsApp para confirmarmos seu pedido.
      </div>

      <button
        onClick={onConfirmar}
        className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition active:scale-95"
      >
        ✅ Confirmar pedido e enviar comprovante no WhatsApp
      </button>
    </div>
  )
}

// Tela de confirmação pós-pedido
function TelaConfirmado({ dados, totalComDesconto, whatsAppUrl, numeroPedido, onConcluir }) {
  const isPix = dados.pagamento === 'Pix'
  const comanda = numeroPedido ? numeroPedido.split('-')[1] : null

  return (
    <div className="space-y-5 text-center">
      <div className="text-7xl mt-2">✅</div>
      <div>
        <h3 className="text-gray-800 font-bold text-xl mb-1">Pedido Confirmado!</h3>
        <p className="text-gray-400 text-sm">Obrigado, {dados.nome.split(' ')[0]}! 🎉</p>
      </div>

      {/* Número da comanda */}
      {comanda && (
        <div className="bg-scooby-amarelo/10 border-2 border-scooby-amarelo rounded-2xl p-4">
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Número do pedido</p>
          <p className="text-scooby-amarelo font-black text-5xl tracking-widest">#{comanda}</p>
          <p className="text-gray-500 text-xs mt-2">Guarde este número para acompanhar seu pedido</p>
        </div>
      )}

      {isPix ? (
        <div className="bg-yellow-900/40 border border-yellow-600/50 rounded-xl px-4 py-3 text-yellow-300 text-sm text-center">
          ⚠️ Envie o comprovante do Pix pelo WhatsApp para confirmarmos e iniciarmos seu pedido!
        </div>
      ) : (
        <div className="bg-scooby-escuro rounded-2xl p-4 border border-scooby-borda">
          <p className="text-gray-600 text-sm">
            Acompanhe e confirme seu pedido pelo WhatsApp. 💬
          </p>
        </div>
      )}

      <a
        href={whatsAppUrl}
        target="_blank"
        rel="noreferrer"
        className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl text-base transition active:scale-95 flex items-center justify-center gap-2"
      >
        <span>💬</span>
        <span>{isPix ? 'Enviar comprovante pelo WhatsApp' : 'Acompanhar pelo WhatsApp'}</span>
      </a>

      {/* Link de rastreamento */}
      <a
        href={`/acompanhar?tel=${dados.telefone.replace(/\D/g, '')}`}
        className="block text-center text-blue-400 hover:text-blue-300 text-sm transition underline"
      >
        📍 Acompanhar status do pedido
      </a>

      <button
        onClick={onConcluir}
        className="w-full text-gray-500 hover:text-white text-sm transition py-1"
      >
        Fechar
      </button>
    </div>
  )
}

// Tela de resumo iFood-style
function TelaResumo({ dados, itens, subtotal, taxaEntrega, desconto, cupomAplicado, totalComDesconto, onConfirmar, onVoltar, adicionar, remover }) {
  if (itens.length === 0) {
    return (
      <div className="text-center py-10 space-y-4">
        <p className="text-gray-400 text-base">Seu carrinho está vazio.</p>
        <button onClick={onVoltar} className="text-scooby-amarelo underline text-sm">← Voltar ao cardápio</button>
      </div>
    )
  }

  return (
    <div className="space-y-3">

      {/* Endereço / Retirada */}
      <div
        onClick={onVoltar}
        className="flex items-start justify-between bg-scooby-escuro rounded-2xl px-4 py-3 border border-scooby-borda cursor-pointer hover:border-scooby-amarelo/50 transition group"
      >
        <div className="flex-1 min-w-0">
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-0.5">
            {dados.tipoEntrega === 'entrega' ? '📍 Endereço de entrega' : '🏃 Retirada'}
          </p>
          {dados.tipoEntrega === 'entrega' ? (
            <p className="text-gray-800 text-sm font-semibold leading-snug">
              {dados.rua}, {dados.numero}
              {dados.complemento ? `, ${dados.complemento}` : ''} — {dados.bairro}
            </p>
          ) : (
            <p className="text-gray-800 text-sm font-semibold">Retirar no local</p>
          )}
          <p className="text-gray-500 text-xs mt-0.5">👤 {dados.nome} · {dados.telefone}</p>
        </div>
        <span className="text-gray-500 group-hover:text-scooby-amarelo text-xs ml-3 mt-1 flex-shrink-0 transition">Alterar ›</span>
      </div>

      {/* Forma de pagamento */}
      <div
        onClick={onVoltar}
        className="flex items-center justify-between bg-scooby-escuro rounded-2xl px-4 py-3 border border-scooby-borda cursor-pointer hover:border-scooby-amarelo/50 transition group"
      >
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-0.5">💳 Pagamento</p>
          <p className="text-gray-800 text-sm font-semibold">
            {dados.pagamento}
            {dados.pagamento === 'Dinheiro' && dados.troco ? ` · Troco p/ R$ ${dados.troco}` : ''}
            {dados.pagamento === 'Dinheiro' && !dados.troco ? ' · Sem troco' : ''}
          </p>
        </div>
        <span className="text-gray-500 group-hover:text-scooby-amarelo text-xs transition">Alterar ›</span>
      </div>

      {/* Itens com controles +/- */}
      <div className="bg-scooby-escuro rounded-2xl border border-scooby-borda overflow-hidden">
        <p className="text-gray-500 text-xs uppercase tracking-wide px-4 pt-3 pb-2">🛒 Itens do pedido</p>
        <div className="divide-y divide-scooby-borda">
          {itens.map((l, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-gray-800 text-sm font-semibold leading-snug">
                  {l.item.nome}
                  {l.variacao && <span className="text-gray-500 font-normal text-xs"> ({l.variacao})</span>}
                </p>
                <p className="text-gray-400 text-xs">R$ {l.preco.toFixed(2).replace('.', ',')} cada</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => remover(l.chave)}
                  className="w-7 h-7 rounded-full bg-scooby-card border border-scooby-borda text-gray-800 font-bold text-lg leading-none flex items-center justify-center hover:border-scooby-vermelho hover:text-scooby-vermelho transition"
                >−</button>
                <span className="text-gray-800 font-bold text-sm w-5 text-center">{l.qtd}</span>
                <button
                  onClick={() => adicionar(l.item, l.variacao ? { label: l.variacao, preco: l.preco } : null)}
                  className="w-7 h-7 rounded-full bg-scooby-card border border-scooby-borda text-gray-800 font-bold text-lg leading-none flex items-center justify-center hover:border-green-500 hover:text-green-400 transition"
                >+</button>
                <span className="text-scooby-amarelo font-bold text-sm w-14 text-right">
                  R$ {(l.preco * l.qtd).toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="px-4 pb-3 pt-1">
          <button
            onClick={onVoltar}
            className="text-scooby-amarelo text-xs font-semibold hover:underline transition"
          >
            + Adicionar mais itens
          </button>
        </div>
      </div>

      {/* Observação */}
      {dados.observacao && (
        <div className="bg-scooby-escuro rounded-xl px-4 py-2.5 border border-scooby-borda">
          <p className="text-gray-500 text-xs">📝 {dados.observacao}</p>
        </div>
      )}

      {/* Cupom */}
      {cupomAplicado && (
        <div className="bg-emerald-900/30 border border-emerald-600/50 rounded-xl px-4 py-2.5 flex items-center justify-between">
          <div>
            <p className="text-emerald-300 font-bold text-sm">🎟 {cupomAplicado.codigo}</p>
            <p className="text-emerald-400 text-xs">
              {cupomAplicado.tipo === 'percentual' ? `${cupomAplicado.valor}% de desconto` : `R$ ${Number(cupomAplicado.valor).toFixed(2)} de desconto`}
            </p>
          </div>
          <span className="text-emerald-300 font-black">-R$ {desconto.toFixed(2).replace('.', ',')}</span>
        </div>
      )}

      {/* Totais */}
      <div className="bg-scooby-escuro rounded-2xl px-4 py-3 border border-scooby-borda space-y-1.5">
        <div className="flex justify-between text-gray-400 text-sm">
          <span>Subtotal</span>
          <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
        </div>
        {dados.tipoEntrega === 'entrega' && (
          <div className="flex justify-between text-gray-400 text-sm">
            <span>Taxa de entrega</span>
            <span>R$ {taxaEntrega.toFixed(2).replace('.', ',')}</span>
          </div>
        )}
        {cupomAplicado && (
          <div className="flex justify-between text-green-400 text-sm">
            <span>Desconto</span>
            <span>- R$ {desconto.toFixed(2).replace('.', ',')}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-gray-800 border-t border-scooby-borda pt-2">
          <span className="text-base">Total</span>
          <span className="text-scooby-amarelo text-xl font-black">R$ {totalComDesconto.toFixed(2).replace('.', ',')}</span>
        </div>
      </div>

      <button
        onClick={onConfirmar}
        className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-4 rounded-2xl text-base transition active:scale-95 shadow-lg shadow-green-900/40"
      >
        {dados.pagamento === 'Pix' ? '📱 Confirmar e pagar via Pix' : '✅ Confirmar pedido'}
      </button>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────

function normalizarTelefone(tel) {
  return tel.replace(/\D/g, '')
}

function telefoneValido(tel) {
  const digits = tel.replace(/\D/g, '')
  if (digits.length < 10 || digits.length > 11) return false
  const ddd = parseInt(digits.substring(0, 2))
  if (ddd < 11 || ddd > 99) return false
  if (digits.length === 11 && digits[2] !== '9') return false
  return true
}

function enderecoIgual(a, b) {
  return (
    a.rua.trim().toLowerCase() === b.rua.trim().toLowerCase() &&
    a.numero.trim() === b.numero.trim() &&
    a.bairro.trim().toLowerCase() === b.bairro.trim().toLowerCase()
  )
}

async function buscarClienteAPI(tel) {
  const chave = normalizarTelefone(tel)
  if (chave.length < 10) return null
  try {
    const resp = await fetch(`/api/clientes?telefone=${chave}`)
    if (!resp.ok) return null
    return await resp.json()
  } catch {
    return null
  }
}

async function salvarClienteAPI(dados, enderecoAnterior) {
  const chave = normalizarTelefone(dados.telefone)
  if (!chave) return
  try {
    // Busca endereços existentes para não sobrescrever
    const existente = await buscarClienteAPI(dados.telefone)
    const enderecosSalvos = existente?.enderecos || []
    const novoEndereco = { rua: dados.rua || '', numero: dados.numero || '', complemento: dados.complemento || '', bairro: dados.bairro || '' }
    const jaExiste = novoEndereco.rua && enderecosSalvos.some(e => enderecoIgual(e, novoEndereco))
    const enderecos = jaExiste ? enderecosSalvos : (novoEndereco.rua ? [...enderecosSalvos, novoEndereco] : enderecosSalvos)

    await fetch('/api/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telefone: chave,
        nome: dados.nome,
        pagamento: dados.pagamento,
        tipoEntrega: dados.tipoEntrega,
        enderecos,
      }),
    })
  } catch (err) {
    console.warn('Falha ao salvar cliente:', err)
  }
}

// ── Componente principal ──────────────────────────────────────────

const ENDERECO_VAZIO = { rua: '', numero: '', complemento: '', bairro: '' }

export function ModalPedido({ itens, subtotal, onFechar, onConcluir, taxaEntrega = CONFIG.taxaEntrega, cupons = [], tempoEntrega = CONFIG.tempoEntrega, pixChave, pixTipo, pixNome, whatsappNumero, adicionar, remover }) {
  const [etapa, setEtapa] = useState('form') // 'form' | 'resumo' | 'pix' | 'confirmado'
  const [whatsAppUrl, setWhatsAppUrl] = useState('')
  const [numeroPedido, setNumeroPedido] = useState(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])
  const [clienteRecuperado, setClienteRecuperado] = useState(null) // nome do cliente encontrado
  const [enderecosSalvos, setEnderecosSalvos] = useState([])       // lista de endereços salvos
  const [enderecoSelecionado, setEnderecoSelecionado] = useState(null) // índice ou 'novo'
  const [dados, setDados] = useState(() => {
    try {
      const salvo = localStorage.getItem('scooby_dados_cliente')
      if (salvo) return { observacao: '', troco: '', ...JSON.parse(salvo) }
    } catch {}
    return { nome: '', telefone: '', tipoEntrega: 'entrega', rua: '', numero: '', bairro: '', complemento: '', pagamento: 'Pix', troco: '', observacao: '' }
  })
  const [erros, setErros] = useState({})
  const [cupomInput, setCupomInput] = useState('')
  const [cupomAplicado, setCupomAplicado] = useState(null)
  const [erroCupom, setErroCupom] = useState('')

  const total = subtotal + taxaEntrega

  function aplicarCupom() {
    if (!cupomInput.trim()) return
    const encontrado = cupons.find(c => c.ativo && c.codigo.toUpperCase() === cupomInput.trim().toUpperCase())
    if (encontrado) {
      setCupomAplicado(encontrado)
      setErroCupom('')
    } else {
      setCupomAplicado(null)
      setErroCupom('Cupom inválido ou expirado.')
    }
  }

  function calcularDesconto(base) {
    if (!cupomAplicado) return 0
    if (cupomAplicado.tipo === 'percentual') return base * (parseFloat(cupomAplicado.valor) / 100)
    return Math.min(parseFloat(cupomAplicado.valor), base)
  }

  const desconto = calcularDesconto(subtotal + (dados.tipoEntrega === 'entrega' ? taxaEntrega : 0))
  const totalComDesconto = subtotal + (dados.tipoEntrega === 'entrega' ? taxaEntrega : 0) - desconto

  function handleTelefoneChange(tel) {
    setDados(d => ({ ...d, telefone: tel }))
    const chave = normalizarTelefone(tel)
    if (chave.length >= 10) {
      buscarClienteAPI(tel).then(cliente => {
        if (cliente) {
          setClienteRecuperado(cliente.nome)
          setEnderecosSalvos(cliente.enderecos || [])
          setDados(d => ({
            ...d,
            telefone: tel,
            nome: cliente.nome || d.nome,
            pagamento: cliente.pagamento || d.pagamento,
            tipoEntrega: cliente.tipoEntrega || d.tipoEntrega,
            ...ENDERECO_VAZIO,
          }))
          if (cliente.enderecos?.length === 1) {
            selecionarEndereco(0, cliente.enderecos)
          } else {
            setEnderecoSelecionado(null)
          }
        } else {
          setClienteRecuperado(null)
          setEnderecosSalvos([])
          setEnderecoSelecionado(null)
        }
      })
    } else {
      setClienteRecuperado(null)
      setEnderecosSalvos([])
      setEnderecoSelecionado(null)
    }
  }

  function selecionarEndereco(idx, lista) {
    const enderecos = lista || enderecosSalvos
    setEnderecoSelecionado(idx)
    const end = enderecos[idx]
    setDados(d => ({ ...d, rua: end.rua, numero: end.numero, complemento: end.complemento, bairro: end.bairro }))
    setErros(e => ({ ...e, rua: undefined, numero: undefined, bairro: undefined }))
  }

  function selecionarNovoEndereco() {
    setEnderecoSelecionado('novo')
    setDados(d => ({ ...d, ...ENDERECO_VAZIO }))
  }

  function validar() {
    const e = {}
    if (!dados.nome.trim()) e.nome = 'Informe seu nome'
    if (!dados.telefone.trim()) {
      e.telefone = 'Informe seu telefone'
    } else if (!telefoneValido(dados.telefone)) {
      e.telefone = 'Telefone inválido. Use o formato (DDD) 9 9999-9999'
    }
    if (dados.tipoEntrega === 'entrega') {
      if (!dados.rua.trim())    e.rua    = 'Informe a rua'
      if (!dados.numero.trim()) e.numero = 'Informe o número'
      if (!dados.bairro.trim()) e.bairro = 'Informe o bairro'
    }
    return e
  }

  function handleAvancar() {
    const e = validar()
    if (Object.keys(e).length > 0) { setErros(e); return }
    setErros({})
    // Salva dados do cliente no localStorage para pré-preencher na próxima vez
    try {
      localStorage.setItem('scooby_dados_cliente', JSON.stringify({
        nome: dados.nome, telefone: dados.telefone,
        tipoEntrega: dados.tipoEntrega, rua: dados.rua,
        numero: dados.numero, complemento: dados.complemento,
        bairro: dados.bairro, pagamento: dados.pagamento,
      }))
    } catch {}
    setEtapa('resumo')
  }

  async function handleConfirmarPagamento() {
    const msg = formatarMensagemWhatsApp(dados, itens, subtotal, taxaEntrega, desconto, cupomAplicado, tempoEntrega)
    setWhatsAppUrl(`https://wa.me/${whatsappNumero || CONFIG.whatsappNumero}?text=${msg}`)
    const numPedido = await salvarPedido(dados, itens, subtotal, taxaEntrega, desconto, cupomAplicado)
    setNumeroPedido(numPedido)
    salvarClienteAPI(dados)
    if (dados.pagamento === 'Pix') {
      setEtapa('pix')
    } else {
      setEtapa('confirmado')
    }
  }

  const mostrarSeletorEnderecos = clienteRecuperado && enderecosSalvos.length > 0 && dados.tipoEntrega === 'entrega'
  const mostrarFormEndereco = dados.tipoEntrega === 'entrega' && (enderecosSalvos.length === 0 || enderecoSelecionado === 'novo' || enderecoSelecionado !== null)

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70">
      <div className="bg-scooby-card w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-scooby-borda max-h-[92dvh] flex flex-col">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-5 border-b border-scooby-borda flex-shrink-0">
          <div className="flex items-center gap-2">
            {etapa === 'resumo' && (
              <button onClick={() => setEtapa('form')} className="text-gray-400 hover:text-white text-lg leading-none pr-1">‹</button>
            )}
            <h2 className="text-scooby-amarelo font-bold text-lg">
              {etapa === 'form' ? '📋 Finalizar Pedido'
                : etapa === 'resumo' ? '🧾 Revisar Pedido'
                : etapa === 'pix' ? '💰 Pagamento via Pix'
                : '✅ Pedido Confirmado!'}
            </h2>
          </div>
          {etapa !== 'confirmado' && (
            <button onClick={onFechar} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
          )}
        </div>

        {/* Conteúdo */}
        <div className="overflow-y-auto flex-1 p-5 overscroll-contain">
          {etapa === 'form' && (
            <div className="space-y-4">

              {/* Telefone */}
              <div>
                <label className="text-gray-700 text-sm font-medium block mb-1">Telefone *</label>
                <input
                  type="tel"
                  placeholder="(32) 9 9999-9999"
                  value={dados.telefone}
                  onChange={e => handleTelefoneChange(e.target.value)}
                  className="w-full bg-scooby-escuro border border-scooby-borda text-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-scooby-amarelo"
                />
                {erros.telefone && <p className="text-red-400 text-xs mt-1">{erros.telefone}</p>}
                {clienteRecuperado && (
                  <p className="text-green-400 text-xs mt-1 font-medium">
                    👋 Bem-vindo de volta, {clienteRecuperado}!
                  </p>
                )}
              </div>

              {/* Nome */}
              <div>
                <label className="text-gray-700 text-sm font-medium block mb-1">Seu nome *</label>
                <input
                  type="text"
                  placeholder="Ex: João Silva"
                  value={dados.nome}
                  onChange={e => setDados(d => ({ ...d, nome: e.target.value }))}
                  className="w-full bg-scooby-escuro border border-scooby-borda text-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-scooby-amarelo"
                />
                {erros.nome && <p className="text-red-400 text-xs mt-1">{erros.nome}</p>}
              </div>

              {/* Tipo de entrega */}
              <div>
                <label className="text-gray-700 text-sm font-medium block mb-2">Tipo de entrega *</label>
                <div className="flex gap-2">
                  {[['entrega', '🚗 Entrega'], ['retirada', '🏃 Retirar no local']].map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setDados(d => ({ ...d, tipoEntrega: val }))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition ${
                        dados.tipoEntrega === val
                          ? 'bg-scooby-vermelho border-scooby-amarelo text-white'
                          : 'bg-scooby-escuro border-scooby-borda text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Seletor de endereços salvos */}
              {mostrarSeletorEnderecos && (
                <div>
                  <label className="text-gray-700 text-sm font-medium block mb-2">📍 Seus endereços salvos</label>
                  <div className="space-y-2">
                    {enderecosSalvos.map((end, idx) => (
                      <button
                        key={idx}
                        onClick={() => selecionarEndereco(idx)}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition text-sm ${
                          enderecoSelecionado === idx
                            ? 'bg-scooby-vermelho/20 border-scooby-amarelo text-white'
                            : 'bg-scooby-escuro border-scooby-borda text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        <span className="flex items-start gap-2">
                          <span className="mt-0.5">{enderecoSelecionado === idx ? '✅' : '🏠'}</span>
                          <span>
                            <span className="font-semibold">{end.rua}, {end.numero}</span>
                            {end.complemento && <span className="text-gray-400"> — {end.complemento}</span>}
                            <br />
                            <span className="text-gray-400 text-xs">{end.bairro}</span>
                          </span>
                        </span>
                      </button>
                    ))}

                    {/* Opção: novo endereço */}
                    <button
                      onClick={selecionarNovoEndereco}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition text-sm ${
                        enderecoSelecionado === 'novo'
                          ? 'bg-scooby-vermelho/20 border-scooby-amarelo text-white'
                          : 'bg-scooby-escuro border-scooby-borda text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      ➕ Digitar novo endereço
                    </button>
                  </div>
                </div>
              )}

              {/* Formulário de endereço */}
              {mostrarFormEndereco && (enderecoSelecionado === 'novo' || enderecosSalvos.length === 0 || enderecoSelecionado !== null) && (
                <div className="space-y-2">
                  {enderecoSelecionado !== 'novo' && enderecosSalvos.length > 0 && (
                    <label className="text-gray-700 text-sm font-medium block">Endereço selecionado</label>
                  )}
                  {(enderecoSelecionado === 'novo' || enderecosSalvos.length === 0) && (
                    <label className="text-gray-700 text-sm font-medium block">Endereço de entrega *</label>
                  )}

                  <div>
                    <input
                      type="text"
                      placeholder="Rua *"
                      value={dados.rua}
                      onChange={e => setDados(d => ({ ...d, rua: e.target.value }))}
                      className="w-full bg-scooby-escuro border border-scooby-borda text-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-scooby-amarelo"
                    />
                    {erros.rua && <p className="text-red-400 text-xs mt-1">{erros.rua}</p>}
                  </div>

                  <div className="flex gap-2">
                    <div className="w-2/5">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Número *"
                        value={dados.numero}
                        onChange={e => setDados(d => ({ ...d, numero: e.target.value }))}
                        className="w-full bg-scooby-escuro border border-scooby-borda text-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-scooby-amarelo"
                      />
                      {erros.numero && <p className="text-red-400 text-xs mt-1">{erros.numero}</p>}
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Complemento (opcional)"
                        value={dados.complemento}
                        onChange={e => setDados(d => ({ ...d, complemento: e.target.value }))}
                        className="w-full bg-scooby-escuro border border-scooby-borda text-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-scooby-amarelo"
                      />
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Bairro *"
                      value={dados.bairro}
                      onChange={e => setDados(d => ({ ...d, bairro: e.target.value }))}
                      className="w-full bg-scooby-escuro border border-scooby-borda text-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-scooby-amarelo"
                    />
                    {erros.bairro && <p className="text-red-400 text-xs mt-1">{erros.bairro}</p>}
                  </div>

                  <p className="text-gray-500 text-xs">Taxa de entrega: R$ {taxaEntrega.toFixed(2).replace('.', ',')}</p>
                </div>
              )}

              {/* Pagamento */}
              <div>
                <label className="text-gray-700 text-sm font-medium block mb-2">Forma de pagamento *</label>
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
                  {PAGAMENTOS.map(p => (
                    <button
                      key={p}
                      onClick={() => setDados(d => ({ ...d, pagamento: p }))}
                      className={`py-3 rounded-xl text-sm font-semibold border transition ${
                        dados.pagamento === p
                          ? 'bg-scooby-vermelho border-scooby-amarelo text-white'
                          : 'bg-scooby-escuro border-scooby-borda text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      {p === 'Pix' ? '📱 Pix' : p === 'Dinheiro' ? '💵 Dinheiro' : p === 'Cartão de Débito' ? '💳 Débito' : '💳 Crédito'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Troco */}
              {dados.pagamento === 'Dinheiro' && (
                <div>
                  <label className="text-gray-700 text-sm font-medium block mb-1">Precisa de troco?</label>
                  <input
                    type="number"
                    placeholder="Ex: 50,00 (deixe em branco se não precisar)"
                    value={dados.troco}
                    onChange={e => setDados(d => ({ ...d, troco: e.target.value }))}
                    className="w-full bg-scooby-escuro border border-scooby-borda text-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-scooby-amarelo"
                  />
                  <p className="text-gray-500 text-xs mt-1">Informe o valor que vai pagar para calcularmos o troco.</p>
                </div>
              )}

              {/* Observação */}
              <div>
                <label className="text-gray-700 text-sm font-medium block mb-1">Observações (opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Ex: sem cebola, ponto da carne..."
                  value={dados.observacao}
                  onChange={e => setDados(d => ({ ...d, observacao: e.target.value }))}
                  className="w-full bg-scooby-escuro border border-scooby-borda text-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-scooby-amarelo resize-none"
                />
              </div>

              {/* Cupom de desconto */}
              {cupons.filter(c => c.ativo).length > 0 && (
                <div>
                  <label className="text-gray-700 text-sm font-medium block mb-2">🎟 Cupons disponíveis</label>
                  <div className="flex flex-col gap-2">
                    {cupons.filter(c => c.ativo).map(cupom => {
                      const aplicado = cupomAplicado?.id === cupom.id || cupomAplicado?.codigo === cupom.codigo
                      const descLabel = cupom.tipo === 'percentual'
                        ? `${cupom.valor}% de desconto`
                        : `R$ ${Number(cupom.valor).toFixed(2).replace('.', ',')} de desconto`
                      return (
                        <button
                          key={cupom.id || cupom.codigo}
                          type="button"
                          onClick={() => {
                            if (aplicado) {
                              setCupomAplicado(null)
                              setCupomInput('')
                            } else {
                              setCupomAplicado(cupom)
                              setCupomInput(cupom.codigo)
                              setErroCupom('')
                            }
                          }}
                          className={`flex items-center justify-between px-4 py-3 rounded-xl border transition active:scale-95 ${
                            aplicado
                              ? 'bg-emerald-900/50 border-emerald-500 text-white'
                              : 'bg-scooby-escuro border-scooby-borda text-gray-800 hover:border-scooby-amarelo'
                          }`}
                        >
                          <div className="text-left">
                            <p className="font-mono font-bold text-sm">{cupom.codigo}</p>
                            <p className={`text-xs ${aplicado ? 'text-emerald-300' : 'text-gray-400'}`}>{descLabel}</p>
                          </div>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                            aplicado ? 'bg-emerald-600 text-white' : 'bg-scooby-borda text-gray-600'
                          }`}>
                            {aplicado ? '✅ Aplicado' : 'Ativar'}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  {cupomAplicado && (
                    <p className="text-emerald-400 text-xs mt-2 font-semibold text-center">
                      🎉 Desconto de {cupomAplicado.tipo === 'percentual' ? `${cupomAplicado.valor}%` : `R$ ${Number(cupomAplicado.valor).toFixed(2)}`} aplicado no total!
                    </p>
                  )}
                </div>
              )}

              {/* Resumo */}
              <div className="bg-scooby-escuro rounded-xl p-4 border border-scooby-borda space-y-1.5">
                <div className="flex justify-between text-gray-400 text-sm">
                  <span>Subtotal ({itens.reduce((a, i) => a + i.qtd, 0)} itens)</span>
                  <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                {dados.tipoEntrega === 'entrega' && (
                  <div className="flex justify-between text-gray-400 text-sm">
                    <span>Taxa de entrega</span>
                    <span>R$ {taxaEntrega.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
                {cupomAplicado && (
                  <div className="flex justify-between text-green-400 text-sm">
                    <span>Desconto ({cupomAplicado.codigo})</span>
                    <span>- R$ {desconto.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-800 border-t border-scooby-borda pt-1.5">
                  <span>Total</span>
                  <span className="text-scooby-amarelo text-lg">
                    R$ {totalComDesconto.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>

              <button
                onClick={handleAvancar}
                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl text-base transition active:scale-95"
              >
                {dados.pagamento === 'Pix' ? '📱 Ver dados do Pix →' : '💬 Enviar pedido no WhatsApp'}
              </button>
            </div>
          )}

          {etapa === 'resumo' && (
            <TelaResumo
              dados={dados}
              itens={itens}
              subtotal={subtotal}
              taxaEntrega={taxaEntrega}
              desconto={desconto}
              cupomAplicado={cupomAplicado}
              totalComDesconto={totalComDesconto}
              onConfirmar={handleConfirmarPagamento}
              onVoltar={() => setEtapa('form')}
              adicionar={adicionar}
              remover={remover}
            />
          )}

          {etapa === 'pix' && (
            <TelaPix
              total={totalComDesconto}
              onConfirmar={() => setEtapa('confirmado')}
              pixChave={pixChave}
              pixTipo={pixTipo}
              pixNome={pixNome}
            />
          )}

          {etapa === 'confirmado' && (
            <TelaConfirmado
              dados={dados}
              totalComDesconto={totalComDesconto}
              whatsAppUrl={whatsAppUrl}
              numeroPedido={numeroPedido}
              onConcluir={onConcluir}
            />
          )}
        </div>
      </div>
    </div>
  )
}
