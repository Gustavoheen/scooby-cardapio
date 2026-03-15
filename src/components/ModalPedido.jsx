import { useState } from 'react'
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
    `🍔 *NOVO PEDIDO — ${CONFIG.nomeLoja}*\n` +
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
    (dados.pagamento === 'Pix' ? `\n📎 *Envie o comprovante do Pix para confirmar seu pedido.*` : '')
  )
}

// Tela do Pix
function TelaPix({ total, onConfirmar }) {
  const [copiado, setCopiado] = useState(false)

  function copiarChave() {
    navigator.clipboard.writeText(CONFIG.pixChave)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 3000)
  }

  return (
    <div className="space-y-5">
      <div className="bg-scooby-escuro rounded-2xl p-5 border border-scooby-borda text-center space-y-3">
        <div className="text-5xl">📱</div>
        <p className="text-gray-300 text-sm">Abra o app do seu banco e faça um Pix para:</p>

        <div className="bg-scooby-card rounded-xl p-4 space-y-2">
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide">Tipo de chave</p>
            <p className="text-white font-semibold">{CONFIG.pixTipo}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide">Chave Pix</p>
            <p className="text-scooby-amarelo font-bold text-lg">{CONFIG.pixChave}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide">Favorecido</p>
            <p className="text-white font-semibold">{CONFIG.pixNome}</p>
          </div>
          <div className="pt-2 border-t border-scooby-borda">
            <p className="text-gray-400 text-xs uppercase tracking-wide">Valor a pagar</p>
            <p className="text-green-400 font-bold text-2xl">
              R$ {total.toFixed(2).replace('.', ',')}
            </p>
          </div>
        </div>

        <button
          onClick={copiarChave}
          className={`w-full py-2 rounded-xl font-bold text-sm transition ${
            copiado ? 'bg-green-600 text-white' : 'bg-scooby-borda hover:bg-scooby-vermelho text-white'
          }`}
        >
          {copiado ? '✅ Chave copiada!' : '📋 Copiar chave Pix'}
        </button>
      </div>

      <div className="bg-yellow-900/40 border border-yellow-600/50 rounded-xl px-4 py-3 text-yellow-300 text-sm text-center">
        ⚠️ O pedido só será preparado e enviado após a <strong>confirmação do pagamento</strong>.
      </div>

      <button
        onClick={onConfirmar}
        className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition active:scale-95"
      >
        💬 Enviar pedido no WhatsApp
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

export function ModalPedido({ itens, subtotal, onFechar, onConcluir, taxaEntrega = CONFIG.taxaEntrega, cupons = [], tempoEntrega = CONFIG.tempoEntrega }) {
  const [etapa, setEtapa] = useState('form') // 'form' | 'pix'
  const [clienteRecuperado, setClienteRecuperado] = useState(null) // nome do cliente encontrado
  const [enderecosSalvos, setEnderecosSalvos] = useState([])       // lista de endereços salvos
  const [enderecoSelecionado, setEnderecoSelecionado] = useState(null) // índice ou 'novo'
  const [dados, setDados] = useState({
    nome: '',
    telefone: '',
    tipoEntrega: 'entrega',
    rua: '', numero: '', bairro: '', complemento: '',
    pagamento: 'Pix',
    troco: '',
    observacao: '',
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
    if (dados.pagamento === 'Pix') {
      setEtapa('pix')
    } else {
      enviarWhatsApp()
    }
  }

  function enviarWhatsApp() {
    const msg = formatarMensagemWhatsApp(dados, itens, subtotal, taxaEntrega, desconto, cupomAplicado, tempoEntrega)
    window.location.href = `whatsapp://send?phone=${CONFIG.whatsappNumero}&text=${msg}`
    salvarPedido(dados, itens, subtotal, taxaEntrega, desconto, cupomAplicado)
    salvarClienteAPI(dados)
    onConcluir()
  }

  const mostrarSeletorEnderecos = clienteRecuperado && enderecosSalvos.length > 0 && dados.tipoEntrega === 'entrega'
  const mostrarFormEndereco = dados.tipoEntrega === 'entrega' && (enderecosSalvos.length === 0 || enderecoSelecionado === 'novo' || enderecoSelecionado !== null)

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70">
      <div className="bg-scooby-card w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-scooby-borda max-h-[92dvh] sm:max-h-[90vh] flex flex-col">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-5 border-b border-scooby-borda flex-shrink-0">
          <h2 className="text-scooby-amarelo font-bold text-lg">
            {etapa === 'form' ? '📋 Finalizar Pedido' : '💰 Pagamento via Pix'}
          </h2>
          <button onClick={onFechar} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        {/* Conteúdo */}
        <div className="overflow-y-auto flex-1 p-5">
          {etapa === 'form' && (
            <div className="space-y-4">

              {/* Telefone */}
              <div>
                <label className="text-gray-300 text-sm font-medium block mb-1">Telefone *</label>
                <input
                  type="tel"
                  placeholder="(32) 9 9999-9999"
                  value={dados.telefone}
                  onChange={e => handleTelefoneChange(e.target.value)}
                  className="w-full bg-scooby-escuro border border-scooby-borda text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-scooby-amarelo"
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
                <label className="text-gray-300 text-sm font-medium block mb-1">Seu nome *</label>
                <input
                  type="text"
                  placeholder="Ex: João Silva"
                  value={dados.nome}
                  onChange={e => setDados(d => ({ ...d, nome: e.target.value }))}
                  className="w-full bg-scooby-escuro border border-scooby-borda text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-scooby-amarelo"
                />
                {erros.nome && <p className="text-red-400 text-xs mt-1">{erros.nome}</p>}
              </div>

              {/* Tipo de entrega */}
              <div>
                <label className="text-gray-300 text-sm font-medium block mb-2">Tipo de entrega *</label>
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
                  <label className="text-gray-300 text-sm font-medium block mb-2">📍 Seus endereços salvos</label>
                  <div className="space-y-2">
                    {enderecosSalvos.map((end, idx) => (
                      <button
                        key={idx}
                        onClick={() => selecionarEndereco(idx)}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition text-sm ${
                          enderecoSelecionado === idx
                            ? 'bg-scooby-vermelho/20 border-scooby-amarelo text-white'
                            : 'bg-scooby-escuro border-scooby-borda text-gray-300 hover:border-gray-500'
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
                    <label className="text-gray-300 text-sm font-medium block">Endereço selecionado</label>
                  )}
                  {(enderecoSelecionado === 'novo' || enderecosSalvos.length === 0) && (
                    <label className="text-gray-300 text-sm font-medium block">Endereço de entrega *</label>
                  )}

                  <div>
                    <input
                      type="text"
                      placeholder="Rua *"
                      value={dados.rua}
                      onChange={e => setDados(d => ({ ...d, rua: e.target.value }))}
                      className="w-full bg-scooby-escuro border border-scooby-borda text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-scooby-amarelo"
                    />
                    {erros.rua && <p className="text-red-400 text-xs mt-1">{erros.rua}</p>}
                  </div>

                  <div className="flex gap-2">
                    <div className="w-1/3">
                      <input
                        type="text"
                        placeholder="Número *"
                        value={dados.numero}
                        onChange={e => setDados(d => ({ ...d, numero: e.target.value }))}
                        className="w-full bg-scooby-escuro border border-scooby-borda text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-scooby-amarelo"
                      />
                      {erros.numero && <p className="text-red-400 text-xs mt-1">{erros.numero}</p>}
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Complemento (opcional)"
                        value={dados.complemento}
                        onChange={e => setDados(d => ({ ...d, complemento: e.target.value }))}
                        className="w-full bg-scooby-escuro border border-scooby-borda text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-scooby-amarelo"
                      />
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Bairro *"
                      value={dados.bairro}
                      onChange={e => setDados(d => ({ ...d, bairro: e.target.value }))}
                      className="w-full bg-scooby-escuro border border-scooby-borda text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-scooby-amarelo"
                    />
                    {erros.bairro && <p className="text-red-400 text-xs mt-1">{erros.bairro}</p>}
                  </div>

                  <p className="text-gray-500 text-xs">Taxa de entrega: R$ {taxaEntrega.toFixed(2).replace('.', ',')}</p>
                </div>
              )}

              {/* Pagamento */}
              <div>
                <label className="text-gray-300 text-sm font-medium block mb-2">Forma de pagamento *</label>
                <div className="grid grid-cols-2 gap-2">
                  {PAGAMENTOS.map(p => (
                    <button
                      key={p}
                      onClick={() => setDados(d => ({ ...d, pagamento: p }))}
                      className={`py-2.5 rounded-xl text-sm font-semibold border transition ${
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
                  <label className="text-gray-300 text-sm font-medium block mb-1">Precisa de troco?</label>
                  <input
                    type="number"
                    placeholder="Ex: 50,00 (deixe em branco se não precisar)"
                    value={dados.troco}
                    onChange={e => setDados(d => ({ ...d, troco: e.target.value }))}
                    className="w-full bg-scooby-escuro border border-scooby-borda text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-scooby-amarelo"
                  />
                  <p className="text-gray-500 text-xs mt-1">Informe o valor que vai pagar para calcularmos o troco.</p>
                </div>
              )}

              {/* Observação */}
              <div>
                <label className="text-gray-300 text-sm font-medium block mb-1">Observações (opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Ex: sem cebola, ponto da carne..."
                  value={dados.observacao}
                  onChange={e => setDados(d => ({ ...d, observacao: e.target.value }))}
                  className="w-full bg-scooby-escuro border border-scooby-borda text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-scooby-amarelo resize-none"
                />
              </div>

              {/* Cupom de desconto */}
              {cupons.filter(c => c.ativo).length > 0 && (
                <div>
                  <label className="text-gray-300 text-sm font-medium block mb-1">🎟 Cupom de desconto</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Digite o código"
                      value={cupomInput}
                      onChange={e => { setCupomInput(e.target.value.toUpperCase()); setCupomAplicado(null); setErroCupom('') }}
                      className="flex-1 bg-scooby-escuro border border-scooby-borda text-white rounded-xl px-4 py-3 text-sm font-mono uppercase focus:outline-none focus:border-scooby-amarelo"
                    />
                    <button
                      type="button"
                      onClick={aplicarCupom}
                      className="bg-scooby-borda hover:bg-scooby-vermelho text-white font-bold px-4 rounded-xl text-sm transition"
                    >Aplicar</button>
                  </div>
                  {erroCupom && <p className="text-red-400 text-xs mt-1">{erroCupom}</p>}
                  {cupomAplicado && (
                    <p className="text-green-400 text-xs mt-1 font-semibold">
                      ✅ Cupom aplicado: {cupomAplicado.tipo === 'percentual' ? `${cupomAplicado.valor}% de desconto` : `R$ ${Number(cupomAplicado.valor).toFixed(2)} de desconto`}
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
                <div className="flex justify-between font-bold text-white border-t border-scooby-borda pt-1.5">
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

          {etapa === 'pix' && (
            <TelaPix
              total={totalComDesconto}
              onConfirmar={enviarWhatsApp}
            />
          )}
        </div>
      </div>
    </div>
  )
}
