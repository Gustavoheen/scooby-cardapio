import { useState, useEffect, useCallback, useRef } from 'react'
import qz from 'qz-tray'
import { CERTIFICATE, assinarQZ } from '../utils/qzCert'
import * as XLSX from 'xlsx'
import { categorias, ADICIONAIS } from '../data/cardapio'
import { CONFIG } from '../config'

const SENHA_MASTER = 'scooby_master_dev#2024'
const NOME_MASTER = 'Gustavo'
const SENHA_JULIO_PADRAO = 'scooby2024'
const WHATSAPP_DEV = '5532999301657'

function hoje() {
  return new Date().toLocaleDateString('pt-BR')
}

function ontem() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toLocaleDateString('pt-BR')
}

function filtrarPedidos(pedidos, dataFiltro, pagamentoFiltro) {
  return pedidos.filter(p => {
    if (dataFiltro) {
      // data do pedido — fallback para criadoEm caso não tenha (pedidos antigos do garçom)
      const dataPedido = p.data || (p.criadoEm ? new Date(p.criadoEm).toLocaleDateString('pt-BR') : '')
      if (dataPedido !== dataFiltro) return false
    }
    if (pagamentoFiltro && p.pagamento !== pagamentoFiltro) return false
    return true
  })
}

// ── ESC/POS — impressão direta na térmica ────────────────────────
const COLS = 24 // papel 80mm com fonte 2x: 24 caracteres por linha

function encode(str) {
  // Normaliza acentos para ASCII puro (NFD decompose + remove combining chars)
  // Garante compatibilidade com qualquer impressora térmica sem depender de code page
  const ascii = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x00-\x7F]/g, '?')
  return ascii.split('').map(c => c.charCodeAt(0))
}

function gerarEscPos(pedido) {
  const bytes = []
  const push   = (...b) => bytes.push(...b)
  const txt    = (s) => bytes.push(...encode(String(s)))
  const nl     = (n = 1) => { for (let i = 0; i < n; i++) push(0x0A) }
  const centro = () => push(0x1B, 0x61, 0x01)
  const esq    = () => push(0x1B, 0x61, 0x00)
  const bold   = (on) => push(0x1B, 0x45, on ? 1 : 0)
  const grande = (_on) => {} // tamanho fixo 2x2 via GS ! abaixo
  const linha  = () => { txt('-'.repeat(COLS)); nl() }

  function row(left, right) {
    const r = String(right)
    const l = String(left).substring(0, COLS - r.length - 1)
    const pad = COLS - l.length - r.length
    txt(l + ' '.repeat(Math.max(1, pad)) + r); nl()
  }

  function wrapTxt(s, prefix = '') {
    const width = COLS - prefix.length
    const words = s.split(' ')
    let line = ''
    for (const w of words) {
      if ((line + ' ' + w).trim().length <= width) line = (line + ' ' + w).trim()
      else { txt(prefix + line); nl(); line = w }
    }
    if (line) { txt(prefix + line); nl() }
  }

  function printItem(item) {
    const m = item.match(/^(.+?)\s+(R\$[\d.,]+)$/)
    if (!m) { wrapTxt(item, '  '); return }
    const [, nome, preco] = m
    if (nome.length + 1 + preco.length <= COLS) { row(nome, preco); return }
    // Nome longo: quebra em linhas, preço na última
    const W = COLS - 2
    const words = nome.split(' ')
    const lines = []
    let cur = ''
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w
      if (t.length <= W) cur = t
      else { if (cur) lines.push(cur); cur = w }
    }
    if (cur) lines.push(cur)
    lines.slice(0, -1).forEach(l => { txt('  ' + l); nl() })
    const last = '  ' + lines[lines.length - 1]
    txt(last + ' '.repeat(Math.max(1, COLS - last.length - preco.length)) + preco); nl()
  }

  // Init
  push(0x1B, 0x40)       // ESC @ reset
  push(0x1D, 0x21, 0x11) // GS ! — fonte 2x largura + 2x altura (padrao legivel em 80mm)

  // Cabeçalho
  centro(); bold(true); grande(true)
  txt('SCOOBY-DOO'); nl()
  txt('LANCHES'); nl()
  grande(false)
  txt('Hamburguer Artesanal'); nl()
  bold(false); esq(); linha()

  row('Pedido:', pedido.numeroPedido || pedido.id || '—')
  row('Data:', `${pedido.data} ${pedido.hora}`)
  linha()

  bold(true); txt('ITENS:'); nl(); bold(false)
  pedido.itensPedido.split(' | ').forEach(printItem)
  linha()

  row('Subtotal:', `R$ ${pedido.subtotal}`)
  if (pedido.tipoEntrega === 'Entrega') row('Taxa entrega:', `R$ ${pedido.taxaEntrega}`)
  if (pedido.desconto && parseFloat(pedido.desconto) > 0) row('Desconto:', `-R$ ${pedido.desconto}`)
  linha()
  bold(true); row('TOTAL:', `R$ ${pedido.total}`); bold(false)
  linha()

  row('Pagamento:', pedido.pagamento)
  row('Tipo:', pedido.tipoEntrega)
  linha()

  bold(true); txt('CLIENTE:'); nl(); bold(false)
  txt(pedido.nomeCliente); nl()
  if (pedido.telefone) { txt(`Tel: ${pedido.telefone}`); nl() }
  if (pedido.tipoEntrega === 'Entrega' && pedido.endereco) wrapTxt(`End: ${pedido.endereco}`)
  if (pedido.observacao) { linha(); bold(true); txt('OBS:'); bold(false); nl(); wrapTxt(pedido.observacao) }

  linha()
  centro(); txt('Obrigado pela preferencia!'); nl()
  esq()

  nl(3)
  push(0x1D, 0x56, 0x41, 0x10) // GS V — corte parcial

  return new Uint8Array(bytes)
}

function gerarCupom(pedido, alturaMm) {
  const itens = pedido.itensPedido.split(' | ').map(i => `<div class="item">• ${i}</div>`).join('')
  const pageSize = alturaMm ? `76mm ${alturaMm}mm` : '76mm auto'
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Pedido</title>
<style>
  @page { size: ${pageSize} !important; margin: 0 !important; }
  html { margin: 0; padding: 0; width: 76mm; height: auto; overflow: hidden; }
  * { box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; font-size: 11px; width: 72mm; margin: 2mm; padding: 0; color: #000; height: auto; overflow: hidden; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  * { color: #000 !important; -webkit-font-smoothing: none; font-weight: 500; }
  .center { text-align: center; }
  .bold { font-weight: 900; }
  .big { font-size: 13px; font-weight: 900; }
  .line { border-top: 1px dashed #000; margin: 3px 0; }
  .row { display: flex; justify-content: space-between; margin: 1px 0; }
  .item { margin: 1px 0; font-size: 10.5px; }
  .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 13px; margin: 2px 0; }
</style></head>
<body>
  <div class="center bold big">SCOOBY-DOO LANCHES</div>
  <div class="center" style="font-size:9px">Hamburguer Artesanal</div>
  <div class="line"></div>
  <div class="row"><span>Pedido:</span><span class="bold">${pedido.numeroPedido || pedido.id || '—'}</span></div>
  <div class="row"><span>Data:</span><span>${pedido.data} ${pedido.hora}</span></div>
  <div class="line"></div>
  <div class="bold" style="margin-bottom:3px">ITENS:</div>
  ${itens}
  <div class="line"></div>
  <div class="row"><span>Subtotal:</span><span>R$ ${pedido.subtotal}</span></div>
  ${pedido.tipoEntrega === 'Entrega' ? `<div class="row"><span>Taxa entrega:</span><span>R$ ${pedido.taxaEntrega}</span></div>` : ''}
  ${pedido.desconto && parseFloat(pedido.desconto) > 0 ? `<div class="row"><span>Desconto:</span><span>- R$ ${pedido.desconto}</span></div>` : ''}
  <div class="line"></div>
  <div class="total-row"><span>TOTAL:</span><span>R$ ${pedido.total}</span></div>
  <div class="line"></div>
  <div class="row"><span>Pagamento:</span><span>${pedido.pagamento}</span></div>
  <div class="row"><span>Tipo:</span><span>${pedido.tipoEntrega}</span></div>
  <div class="line"></div>
  <div class="bold">CLIENTE:</div>
  <div>${pedido.nomeCliente}</div>
  ${pedido.telefone ? `<div>Tel: ${pedido.telefone}</div>` : ''}
  ${pedido.tipoEntrega === 'Entrega' && pedido.endereco ? `<div style="margin-top:2px">End: ${pedido.endereco}</div>` : ''}
  ${pedido.observacao ? `<div class="line"></div><div class="bold">OBS:</div><div>${pedido.observacao}</div>` : ''}
  <div class="line"></div>
  <div class="center" style="font-size:9px;margin-top:3px">Obrigado pela preferência!</div>
</body></html>`
}

function imprimirPedido(pedido) {
  // Passo 1: renderiza invisível para medir a altura real do conteúdo
  // 76mm a 96dpi = 58 * 96 / 25.4 ≈ 219px
  const medidor = window.open('', '_blank', 'width=287,height=100,left=-9999,top=-9999')
  if (!medidor) { alert('Permita pop-ups para imprimir.'); return }
  medidor.document.write(gerarCupom(pedido))
  medidor.document.close()

  setTimeout(() => {
    const alturaPixels = medidor.document.body.scrollHeight
    // Converte px (96dpi) para mm: 1px = 25.4/96 mm
    const alturaMm = Math.ceil(alturaPixels * 25.4 / 96) + 6
    medidor.close()

    // Passo 2: abre janela de impressão com @page já no tamanho exato
    const w = window.open('', '_blank', `width=287,height=${alturaPixels + 40},left=0,top=0`)
    if (!w) { alert('Permita pop-ups para imprimir.'); return }
    w.document.write(gerarCupom(pedido, alturaMm))
    w.document.close()
    setTimeout(() => {
      w.focus()
      w.print()
      w.onafterprint = () => w.close()
    }, 300)
  }, 400)
}

function CardStat({ label, valor, sub, cor }) {
  return (
    <div className="bg-scooby-card border border-scooby-borda rounded-2xl p-4">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className={`font-bold text-2xl ${cor}`}>{valor}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  )
}

function gerarMsgWhatsApp(pedido) {
  const id = pedido.numeroPedido || pedido.id
  const itens = pedido.itensPedido.replace(/ \| /g, '\n• ')
  const isPix = pedido.pagamento === 'Pix'
  const linhas = [
    `Olá ${pedido.nomeCliente}! 😊 Recebemos seu pedido na *Scooby-Doo Lanches*.`,
    ``,
    `📋 *Pedido:* ${id}`,
    `🍔 *Itens:*\n• ${itens}`,
    `💰 *Total:* R$ ${pedido.total}`,
    `💳 *Pagamento:* ${pedido.pagamento}`,
  ]
  if (isPix) linhas.push(`\n⚠️ Aguardando comprovante do Pix para confirmar e iniciar o preparo!`)
  else if (pedido.tipoEntrega === 'Entrega') linhas.push(`\n🛵 Seu pedido será entregue em breve!`)
  else linhas.push(`\n🏠 Seu pedido estará pronto para retirada em breve!`)
  return encodeURIComponent(linhas.join('\n'))
}

function CardPedido({ pedido, onImprimir, onExcluir, onConfirmarPix, onAtualizarStatus, selecionado, onToggleSelecionado, infoImpressao, isNovo = false, onMarcarVisto }) {
  const [expandido, setExpandido] = useState(false)
  const detalhesRef = useRef(null)
  const id = pedido.numeroPedido || pedido.id
  const tel = pedido.telefone?.replace(/\D/g, '')
  const waLink = tel ? `https://wa.me/55${tel}?text=${gerarMsgWhatsApp(pedido)}` : null

  useEffect(() => {
    if (expandido && detalhesRef.current) {
      setTimeout(() => detalhesRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60)
    }
  }, [expandido])

  const corPagamento = {
    'Pix': 'bg-blue-900 text-blue-300',
    'Dinheiro': 'bg-green-900 text-green-300',
    'Cartão de Débito': 'bg-purple-900 text-purple-300',
    'Cartão de Crédito': 'bg-purple-900 text-purple-300',
  }[pedido.pagamento] || 'bg-gray-800 text-gray-300'

  const corTipo = pedido.tipoEntrega === 'Entrega'
    ? 'bg-orange-900/50 text-orange-300'
    : 'bg-teal-900/50 text-teal-300'

  return (
    <div className={`border rounded-xl overflow-hidden transition-all duration-300 ${
      isNovo
        ? 'bg-blue-950 border-blue-500 shadow-lg shadow-blue-500/30 animate-pulse-border'
        : 'bg-scooby-card border-scooby-borda'
    } ${selecionado ? '!border-scooby-amarelo' : ''}`}>
      {/* Banner de novo pedido */}
      {isNovo && (
        <div className="bg-blue-600 text-white text-xs font-bold text-center py-1 tracking-widest animate-pulse">
          🔔 NOVO PEDIDO!
        </div>
      )}
      {/* Linha principal */}
      <div className="flex items-stretch">
        {/* Checkbox */}
        <div
          className="flex items-center px-3 cursor-pointer hover:bg-scooby-borda/20 transition"
          onClick={e => { e.stopPropagation(); onToggleSelecionado(id) }}
        >
          <input
            type="checkbox"
            checked={selecionado}
            onChange={() => onToggleSelecionado(id)}
            className="w-4 h-4 cursor-pointer accent-yellow-400"
            onClick={e => e.stopPropagation()}
          />
        </div>

        {/* Botão expandir */}
        <button
          onClick={() => { setExpandido(e => !e); if (isNovo) onMarcarVisto?.() }}
          className="flex-1 text-left py-3 pr-3 flex items-center gap-3 hover:bg-scooby-borda/30 transition min-w-0"
        >
          {/* Hora + número */}
          <div className="flex-shrink-0 text-center w-12">
            <p className="text-scooby-amarelo font-bold text-xs leading-tight">{pedido.hora}</p>
            <p className="text-gray-600 text-xs">#{pedido.numeroPedido?.split('-').pop() || '—'}</p>
          </div>

          <div className="w-px h-8 bg-scooby-borda flex-shrink-0" />

          {/* Cliente + itens */}
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">{pedido.nomeCliente}</p>
            <p className="text-gray-400 text-xs truncate">{pedido.itensPedido.replace(/ \| /g, ' · ')}</p>
          </div>

          {/* Total + badges */}
          <div className="flex-shrink-0 text-right">
            <p className="text-scooby-amarelo font-bold text-sm">R$ {pedido.total}</p>
            <div className="flex gap-1 mt-0.5 justify-end">
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${corPagamento}`}>
                {pedido.pagamento === 'Cartão de Débito' ? 'Déb' : pedido.pagamento === 'Cartão de Crédito' ? 'Créd' : pedido.pagamento}
              </span>
              {pedido.pagamento === 'Pix' && (
                pedido.pixConfirmado
                  ? <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold bg-green-900 text-green-300">✓ Pago</span>
                  : <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold bg-yellow-900 text-yellow-300 animate-pulse">⏳ Aguard.</span>
              )}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${corTipo}`}>
                {pedido.tipoEntrega === 'Entrega' ? '🛵' : '🏠'}
              </span>
              {pedido.status === 'preparando' && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold bg-orange-900 text-orange-300">🍔 Prep.</span>
              )}
              {(pedido.status === 'saiu_entrega' || pedido.status === 'pronto_retirada') && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold bg-blue-900 text-blue-300">
                  {pedido.status === 'saiu_entrega' ? '🛵 Enviado' : '🏠 Pronto'}
                </span>
              )}
              {pedido.status === 'entregue' && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold bg-green-900 text-green-300">✅ Concluído</span>
              )}
              {pedido.cupom && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold bg-emerald-900 text-emerald-300 font-mono">🎟 {pedido.cupom}</span>
              )}
              {pedido.origem === 'garcom' && pedido.mesa && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold bg-blue-900 text-blue-300">🍽️ Mesa {pedido.mesa}</span>
              )}
              {pedido.origem === 'garcom' && !pedido.mesa && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold bg-amber-900 text-amber-300">👨‍🍳 Garçom</span>
              )}
            </div>
            {infoImpressao
              ? <p className="text-xs text-green-500 mt-0.5">🖨️ {infoImpressao.hora}</p>
              : <p className="text-xs text-gray-700 mt-0.5">não impresso</p>
            }
          </div>

          <span className="text-gray-500 text-xs flex-shrink-0 ml-1">{expandido ? '▲' : '▼'}</span>
        </button>

        {/* Botão WhatsApp */}
        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            onClick={e => e.stopPropagation()}
            title={`Contatar ${pedido.nomeCliente} via WhatsApp`}
            className="flex items-center justify-center px-3 text-green-400 hover:text-green-300 hover:bg-green-900/20 transition border-l border-scooby-borda flex-shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </a>
        )}
      </div>

      {/* Detalhes expandidos */}
      {expandido && (
        <div ref={detalhesRef} className="border-t border-scooby-borda bg-scooby-escuro px-4 py-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Itens do pedido</p>
              <div className="space-y-1">
                {pedido.itensPedido.split(' | ').map((item, i) => (
                  <p key={i} className="text-gray-200 text-sm">• {item}</p>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide">Cliente</p>
                <div className="flex items-center gap-2">
                  <p className="text-white text-sm">{pedido.nomeCliente}</p>
                  {waLink && (
                    <a href={waLink} target="_blank" rel="noreferrer" className="text-green-400 text-xs hover:underline">
                      📱 {pedido.telefone}
                    </a>
                  )}
                </div>
              </div>
              {pedido.tipoEntrega === 'Entrega' && pedido.endereco && (
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide">Endereço</p>
                  <p className="text-white text-sm">{pedido.endereco}</p>
                </div>
              )}
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide">Pagamento</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white text-sm">{pedido.pagamento}</p>
                  {pedido.pagamento === 'Pix' && (
                    pedido.pixConfirmado
                      ? <span className="text-xs font-semibold text-green-400">
                          ✅ Comprovante confirmado {pedido.pixConfirmadoEm ? `às ${new Date(pedido.pixConfirmadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
                        </span>
                      : <button
                          onClick={() => onConfirmarPix(pedido)}
                          className="text-xs font-bold px-3 py-1 rounded-lg bg-green-700 hover:bg-green-600 text-white transition"
                        >
                          ✅ Confirmar Pix
                        </button>
                  )}
                </div>
              </div>
              {pedido.observacao && (
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide">Observação</p>
                  <p className="text-yellow-300 text-sm">{pedido.observacao}</p>
                </div>
              )}
            </div>
          </div>

          {/* Botões de status */}
          <div className="border-t border-scooby-borda pt-3">
            <p className="text-gray-500 text-xs uppercase tracking-wide mb-2">Status do pedido</p>
            <div className="flex flex-wrap gap-2">
              {(!pedido.status || pedido.status === 'recebido') && (
                <button
                  onClick={() => onAtualizarStatus(pedido, 'preparando')}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-orange-900/60 hover:bg-orange-800 text-orange-300 transition"
                >
                  🍔 Iniciar preparo
                </button>
              )}
              {pedido.status === 'preparando' && pedido.tipoEntrega === 'Entrega' && (
                <button
                  onClick={() => onAtualizarStatus(pedido, 'saiu_entrega')}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-900/60 hover:bg-blue-800 text-blue-300 transition"
                >
                  🛵 Saiu para entrega
                </button>
              )}
              {pedido.status === 'preparando' && pedido.tipoEntrega === 'Retirada' && (
                <button
                  onClick={() => onAtualizarStatus(pedido, 'pronto_retirada')}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-teal-900/60 hover:bg-teal-800 text-teal-300 transition"
                >
                  🏠 Pronto para retirada
                </button>
              )}
              {(pedido.status === 'saiu_entrega' || pedido.status === 'pronto_retirada') && (
                <button
                  onClick={() => onAtualizarStatus(pedido, 'entregue')}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-green-900/60 hover:bg-green-800 text-green-300 transition"
                >
                  ✅ Finalizar / Concluído
                </button>
              )}
              {pedido.status === 'entregue' && (
                <span className="text-xs text-green-400 font-semibold">✅ Pedido concluído</span>
              )}
            </div>
          </div>

          {pedido.cupom && parseFloat(pedido.desconto) > 0 && (
            <div className="border-t border-scooby-borda pt-3">
              <div className="bg-emerald-900/30 border border-emerald-600/50 rounded-xl px-4 py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-emerald-300 font-bold text-sm">🎟 Cupom aplicado: <span className="font-mono">{pedido.cupom}</span></p>
                  <p className="text-emerald-400 text-xs">Desconto de R$ {Number(pedido.desconto).toFixed(2).replace('.', ',')} neste pedido</p>
                </div>
                <span className="text-emerald-300 font-black text-lg">-R$ {Number(pedido.desconto).toFixed(2).replace('.', ',')}</span>
              </div>
            </div>
          )}

          <div className="border-t border-scooby-borda pt-3 flex flex-wrap items-center gap-3 text-sm">
            <span className="text-gray-400">Subtotal: <span className="text-white">R$ {pedido.subtotal}</span></span>
            {pedido.tipoEntrega === 'Entrega' && <span className="text-gray-400">Entrega: <span className="text-white">R$ {pedido.taxaEntrega}</span></span>}
            <span className="text-gray-400">Total: <span className="text-scooby-amarelo font-bold">R$ {pedido.total}</span></span>
            <div className="ml-auto flex gap-2">
              {waLink && (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-900/50 hover:bg-green-800/50 text-green-300 transition"
                >
                  💬 Contatar cliente
                </a>
              )}
              <button
                onClick={() => onImprimir(pedido, 'manual')}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                  infoImpressao ? 'bg-blue-900 hover:bg-blue-800 text-blue-200' : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
              >
                🖨️ {infoImpressao ? 'Reimprimir' : 'Imprimir'}
              </button>
              <button
                onClick={() => onExcluir(pedido)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-800/60 text-red-300 transition"
              >
                🗑️ Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CardCliente({ cliente: c, onExcluir, onEditar }) {
  const [editando, setEditando] = useState(false)
  const [novoNome, setNovoNome] = useState(c.nome)
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    if (!novoNome.trim()) return
    setSalvando(true)
    await onEditar(c, novoNome.trim())
    setSalvando(false)
    setEditando(false)
  }

  return (
    <div className="bg-scooby-card border border-scooby-borda rounded-2xl px-5 py-4 flex flex-wrap gap-4 items-center">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-scooby-vermelho flex items-center justify-center font-bold text-white text-lg flex-shrink-0">
        {c.nome.charAt(0).toUpperCase()}
      </div>

      {/* Info principal */}
      <div className="flex-1 min-w-0">
        {editando ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={novoNome}
              onChange={e => setNovoNome(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') salvar(); if (e.key === 'Escape') setEditando(false) }}
              className="bg-scooby-escuro border border-scooby-amarelo text-white rounded-lg px-3 py-1 text-sm focus:outline-none w-48"
            />
            <button onClick={salvar} disabled={salvando} className="text-xs text-green-400 hover:text-green-300 font-semibold">
              {salvando ? '...' : '✓ Salvar'}
            </button>
            <button onClick={() => { setEditando(false); setNovoNome(c.nome) }} className="text-xs text-gray-500 hover:text-gray-300">
              Cancelar
            </button>
          </div>
        ) : (
          <p className="text-white font-semibold">{c.nome}</p>
        )}
        <div className="flex flex-wrap gap-3 mt-0.5">
          {c.telefone !== '—' && (
            <a href={`https://wa.me/55${c.telefone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-green-400 text-xs hover:underline">
              📱 {c.telefone}
            </a>
          )}
          {c.endereco && c.endereco !== 'Retirar no local' && (
            <p className="text-gray-500 text-xs truncate max-w-xs">📍 {c.endereco}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 flex-shrink-0 text-center">
        <div>
          <p className="text-white font-bold text-lg">{c.pedidos.length}</p>
          <p className="text-gray-500 text-xs">pedidos</p>
        </div>
        <div>
          <p className="text-scooby-amarelo font-bold text-lg">R$ {c.totalGasto.toFixed(2).replace('.', ',')}</p>
          <p className="text-gray-500 text-xs">total gasto</p>
        </div>
        <div>
          <p className="text-gray-300 font-bold text-lg">R$ {(c.totalGasto / c.pedidos.length).toFixed(2).replace('.', ',')}</p>
          <p className="text-gray-500 text-xs">ticket médio</p>
        </div>
      </div>

      {/* Último pedido */}
      <div className="text-xs text-gray-500 flex-shrink-0">
        <p>Último pedido</p>
        <p className="text-gray-300">{c.pedidos[0]?.data} {c.pedidos[0]?.hora}</p>
      </div>

      {/* Ações */}
      <div className="flex gap-2 flex-shrink-0">
        {!editando && c.telefone !== '—' && (
          <button
            onClick={() => setEditando(true)}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition"
            title="Editar nome"
          >
            ✏️
          </button>
        )}
        <button
          onClick={() => onExcluir(c)}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-800/60 text-red-300 transition"
          title="Excluir cliente e pedidos"
        >
          🗑️
        </button>
      </div>
    </div>
  )
}

export default function Admin() {
  const [autenticado, setAutenticado] = useState(false)
  const [senha, setSenha] = useState('')
  const [pedidos, setPedidos] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [dataFiltro, setDataFiltro] = useState('')
  const [filtroRapido, setFiltroRapido] = useState('hoje')
  const [pagamentoFiltro, setPagamentoFiltro] = useState('')
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null)
  const [debugInfo, setDebugInfo] = useState('')
  const [novaVersao, setNovaVersao] = useState(false)
  const [lojaStatus, setLojaStatus] = useState('auto') // 'auto' | 'aberta' | 'fechada'
  const [horarioAberturaEditado, setHorarioAberturaEditado] = useState(CONFIG.horarioAbertura)
  const [horarioFechamentoEditado, setHorarioFechamentoEditado] = useState(CONFIG.horarioFechamento)
  const [diasFuncionamento, setDiasFuncionamento] = useState([0,1,2,3,4,5,6])
  const [salvandoStatus, setSalvandoStatus] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState('pedidos')
  const [buscaCliente, setBuscaCliente] = useState('')
  const [bloqueados, setBloqueados] = useState([])
  const [novoBloquear, setNovoBloquear] = useState('')

  // ── Estado da aba Cardápio ─────────────────────────────────
  const [cardapioState, setCardapioState] = useState({ precos: {}, desativados: [] })
  const [precosEditados, setPrecosEditados] = useState({})
  const [desativadosEditados, setDesativadosEditados] = useState([])
  const [salvandoCardapio, setSalvandoCardapio] = useState(false)
  const [msgCardapio, setMsgCardapio] = useState('')
  const [solicitacaoTexto, setSolicitacaoTexto] = useState('')
  const [precosVariacoesEditados, setPrecosVariacoesEditados] = useState({})
  const [taxaEntregaEditada, setTaxaEntregaEditada] = useState(CONFIG.taxaEntrega)
  const [tempoEntregaEditado, setTempoEntregaEditado] = useState(CONFIG.tempoEntrega)
  const [promocoesEditadas, setPromocoesEditadas] = useState([])
  const [cuponsEditados, setCuponsEditados] = useState([])
  const [isMaster, setIsMaster] = useState(false)
  const [senhaClienteAtual, setSenhaClienteAtual] = useState(SENHA_JULIO_PADRAO)
  // Para troca de senha:
  const [senhaAtualInput, setSenhaAtualInput] = useState('')
  const [novaSenhaInput, setNovaSenhaInput] = useState('')
  const [confirmarSenhaInput, setConfirmarSenhaInput] = useState('')
  const [msgSenha, setMsgSenha] = useState('')
  const [salvandoSenha, setSalvandoSenha] = useState(false)

  // ── Estado da aba Caixa ────────────────────────────────────
  const [caixaData, setCaixaData] = useState(hoje)
  const [caixaSaldoInicial, setCaixaSaldoInicial] = useState(
    () => localStorage.getItem('scooby_saldo_inicial') || ''
  )
  const [caixaValorFisico, setCaixaValorFisico] = useState(
    () => localStorage.getItem('scooby_valor_fisico') || ''
  )
  const [caixaDetalhe, setCaixaDetalhe] = useState(null) // 'Pix' | 'Dinheiro' | 'Débito' | 'Crédito' | 'Balcão' | null

  // ── Estado da aba Configurações ────────────────────────────
  const [whatsappEditado, setWhatsappEditado] = useState(CONFIG.whatsappNumero)
  const [pixChaveEditada, setPixChaveEditada] = useState(CONFIG.pixChave)
  const [pixTipoEditado, setPixTipoEditado] = useState(CONFIG.pixTipo)
  const [pixNomeEditado, setPixNomeEditado] = useState(CONFIG.pixNome)
  const [senhaGarcomEditada, setSenhaGarcomEditada] = useState('garcom2024')
  const [salvandoConfig, setSalvandoConfig] = useState(false)
  const [msgConfig, setMsgConfig] = useState('')

  // ── Estado da aba Mesas ─────────────────────────────────────
  const [mesas, setMesas] = useState([])
  const [mesaFechando, setMesaFechando] = useState(null) // numero da mesa sendo fechada
  const [pagamentoMesa, setPagamentoMesa] = useState('Dinheiro')
  const [trocoMesa, setTrocoMesa] = useState('')
  const [fechandoMesa, setFechandoMesa] = useState(false)

  function buscarMesas() {
    fetch('/api/mesa').then(r => r.json()).then(setMesas).catch(() => {})
  }

  async function fecharMesa() {
    if (!mesaFechando || fechandoMesa) return
    setFechandoMesa(true)
    try {
      const r = await fetch(`/api/mesa?numero=${mesaFechando}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fechar', pagamento: pagamentoMesa, troco: trocoMesa }),
      })
      const j = await r.json()
      if (!r.ok || j.erro) throw new Error(j.erro || 'Erro')
      buscarMesas()
      buscarPedidos()
      setMesaFechando(null)
      setPagamentoMesa('Dinheiro')
      setTrocoMesa('')
    } catch (e) {
      alert('Erro ao fechar mesa: ' + e.message)
    }
    setFechandoMesa(false)
  }

  async function resetarMesa(numero) {
    if (!confirm(`Resetar Mesa ${numero} sem cobrar? Os itens serão apagados.`)) return
    await fetch(`/api/mesa?numero=${numero}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resetar' }),
    })
    buscarMesas()
  }

  function buildPayload(extras = {}) {
    const precosFinal = {}
    Object.entries(precosEditados).forEach(([id, val]) => {
      const num = parseFloat(String(val).replace(',', '.'))
      if (!isNaN(num) && num > 0) precosFinal[id] = num
    })
    return {
      precos: precosFinal,
      desativados: desativadosEditados,
      precosVariacoes: precosVariacoesEditados,
      taxaEntrega: parseFloat(String(taxaEntregaEditada).replace(',', '.')) || CONFIG.taxaEntrega,
      tempoEntrega: tempoEntregaEditado.trim() || CONFIG.tempoEntrega,
      promocoes: promocoesEditadas,
      cupons: cuponsEditados,
      lojaStatus,
      horarioAbertura: horarioAberturaEditado,
      horarioFechamento: horarioFechamentoEditado,
      diasFuncionamento,
      ...extras,
    }
  }

  async function salvarStatusLoja(novoStatus) {
    setSalvandoStatus(true)
    setLojaStatus(novoStatus)
    try {
      await fetch('/api/cardapio-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload({ lojaStatus: novoStatus })),
      })
    } catch {}
    setSalvandoStatus(false)
  }

  const buscarPedidos = useCallback(async () => {
    try {
      const res = await fetch('/api/pedido')
      if (res.ok) {
        const dados = await res.json()
        const lista = dados

        if (isFirstFetchRef.current) {
          // Primeira carga: salva TODOS os IDs como baseline — nenhum será tratado como novo
          isFirstFetchRef.current = false
          pedidosVistosRef.current = new Set(lista.map(p => p.id))
        } else {
          // Polls subsequentes: detecta pedidos cujo ID não estava no baseline
          const novos = lista.filter(p => !pedidosVistosRef.current.has(p.id))
          if (novos.length > 0) {
            // Atualiza baseline com todos os IDs atuais
            pedidosVistosRef.current = new Set(lista.map(p => p.id))
            novos.forEach(p => {
              if (autoPrintRef.current) handleImprimirRef.current?.(p, 'auto')
            })
            setPedidosNovos(prev => {
              const next = new Set(prev)
              novos.forEach(p => next.add(p.numeroPedido || p.id))
              return next
            })
            tocarSomNotificacaoRef.current?.()
            setDebugInfo(`🔔 ${novos.length} novo(s)! Total: ${lista.length}`)
          } else {
            setDebugInfo(`${lista.length} pedidos na API`)
          }
        }

        // Mescla mesas abertas no topo da lista como entradas "em consumação"
        try {
          const resMesas = await fetch('/api/mesa')
          if (resMesas.ok) {
            const mesasData = await resMesas.json()
            setMesas(mesasData)
            const abertas = (mesasData || []).filter(m => m.status === 'aberta')
            const mesasPedidos = abertas.map(m => ({
              id: `mesa-${m.numero}`,
              numeroPedido: `Mesa ${m.numero}`,
              nomeCliente: `Mesa ${m.numero}`,
              status: 'consumacao',
              itensPedido: (m.itens || []).map(i => `${i.qtd}x ${i.nome}`).join(' | '),
              total: Number(m.total).toFixed(2),
              pagamento: '—',
              tipoEntrega: 'Mesa',
              criadoEm: m.aberta_em,
              _mesaNumero: m.numero,
            }))
            setPedidos([...mesasPedidos, ...lista])
          } else {
            setPedidos(lista)
          }
        } catch {
          setPedidos(lista)
        }

        setUltimaAtualizacao(new Date().toLocaleTimeString('pt-BR'))
      }
    } catch (err) {
      console.error('Erro ao buscar pedidos:', err)
      setDebugInfo(`Erro: ${err.message}`)
    }
  }, [])

  useEffect(() => {
    // Carrega estado do cardápio E verifica sessão salva
    fetch('/api/cardapio-state')
      .then(r => r.json())
      .then(estado => {
        const julioAtual = estado.senhaCliente || SENHA_JULIO_PADRAO
        setSenhaClienteAtual(julioAtual)
        setCardapioState(estado)
        setPrecosEditados(estado.precos || {})
        setDesativadosEditados(estado.desativados || [])
        setPrecosVariacoesEditados(estado.precosVariacoes || {})
        setTaxaEntregaEditada(estado.taxaEntrega ?? CONFIG.taxaEntrega)
        setTempoEntregaEditado(estado.tempoEntrega ?? CONFIG.tempoEntrega)
        setPromocoesEditadas(estado.promocoes || [])
        setCuponsEditados(estado.cupons || [])
        setWhatsappEditado(estado.whatsappNumero || CONFIG.whatsappNumero)
        setPixChaveEditada(estado.pixChave || CONFIG.pixChave)
        setPixTipoEditado(estado.pixTipo || CONFIG.pixTipo)
        if (estado.senhaGarcom) setSenhaGarcomEditada(estado.senhaGarcom)
        setPixNomeEditado(estado.pixNome || CONFIG.pixNome)
        setLojaStatus(estado.lojaStatus || 'auto')
        setBloqueados(estado.bloqueados || [])
        setHorarioAberturaEditado(estado.horarioAbertura || CONFIG.horarioAbertura)
        setHorarioFechamentoEditado(estado.horarioFechamento || CONFIG.horarioFechamento)
        setDiasFuncionamento(estado.diasFuncionamento ?? [0,1,2,3,4,5,6])
        // Restaura sessão
        const salvo = sessionStorage.getItem('admin_auth')
        if (salvo === 'master') {
          setIsMaster(true)
          setAutenticado(true)
        } else if (salvo === 'julio') {
          setIsMaster(false)
          setAutenticado(true)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!autenticado) return
    setCarregando(true)
    buscarPedidos().finally(() => setCarregando(false))
    const interval = setInterval(buscarPedidos, 15000)
    return () => clearInterval(interval)
  }, [autenticado, buscarPedidos])

  // Auto-atualização: detecta novo deploy e avisa o admin
  useEffect(() => {
    let versaoAtual = null
    async function checarVersao() {
      try {
        const r = await fetch('/api/version')
        const { version } = await r.json()
        if (!versaoAtual) { versaoAtual = version; return }
        if (version !== versaoAtual) setNovaVersao(true)
      } catch {}
    }
    checarVersao()
    const id = setInterval(checarVersao, 60000)
    return () => clearInterval(id)
  }, [])

  function toggleDesativado(id) {
    setDesativadosEditados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function handlePrecoChange(id, valor) {
    setPrecosEditados(prev => ({ ...prev, [String(id)]: valor }))
  }

  function handlePrecoVariacaoChange(itemId, label, valor) {
    setPrecosVariacoesEditados(prev => ({ ...prev, [`${itemId}-${label}`]: valor }))
  }

  async function salvarCardapio() {
    setSalvandoCardapio(true)
    setMsgCardapio('')
    try {
      const payload = buildPayload()
      const res = await fetch('/api/cardapio-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        setMsgCardapio(json.aviso ? `⚠️ ${json.aviso}` : '✅ Alterações salvas com sucesso!')
      } else {
        setMsgCardapio(`Erro ao salvar: ${json.erro || res.status}`)
      }
    } catch (err) {
      setMsgCardapio(`Erro de conexão: ${err.message}`)
    } finally {
      setSalvandoCardapio(false)
      setTimeout(() => setMsgCardapio(''), 4000)
    }
  }

  function enviarSolicitacao() {
    if (!solicitacaoTexto.trim()) return
    fetch('/api/change-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'alteracao_estrutural', descricao: solicitacaoTexto }),
    }).catch(() => {})
    const mensagem = encodeURIComponent(
      `🍔 *SOLICITAÇÃO DE ALTERAÇÃO — Scooby-Doo Lanches*\n` +
      `${'─'.repeat(28)}\n\n` +
      `${solicitacaoTexto}\n\n` +
      `_Enviado pelo painel administrativo_`
    )
    window.location.href = `whatsapp://send?phone=${WHATSAPP_DEV}&text=${mensagem}`
    setSolicitacaoTexto('')
  }

  function handleLogin(e) {
    e.preventDefault()
    if (senha === SENHA_MASTER) {
      sessionStorage.setItem('admin_auth', 'master')
      setIsMaster(true)
      setAutenticado(true)
    } else if (senha === senhaClienteAtual) {
      sessionStorage.setItem('admin_auth', 'julio')
      setIsMaster(false)
      setAutenticado(true)
    } else {
      alert('Senha incorreta!')
    }
  }

  async function salvarConfiguracoes() {
    setSalvandoConfig(true)
    setMsgConfig('')
    try {
      await fetch('/api/cardapio-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload({
          whatsappNumero: whatsappEditado.trim(),
          pixChave: pixChaveEditada.trim(),
          pixTipo: pixTipoEditado.trim(),
          pixNome: pixNomeEditado.trim(),
          senhaGarcom: senhaGarcomEditada.trim() || 'garcom2024',
        })),
      })
      setMsgConfig('✅ Configurações salvas com sucesso!')
    } catch {
      setMsgConfig('❌ Erro ao salvar. Tente novamente.')
    } finally {
      setSalvandoConfig(false)
      setTimeout(() => setMsgConfig(''), 3000)
    }
  }

  async function bloquearTelefone() {
    const tel = novoBloquear.replace(/\D/g, '')
    if (!tel || tel.length < 10) return
    if (bloqueados.includes(tel)) return
    const nova = [...bloqueados, tel]
    setBloqueados(nova)
    setNovoBloquear('')
    await fetch('/api/cardapio-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload({ bloqueados: nova })),
    })
  }

  async function desbloquearTelefone(tel) {
    const nova = bloqueados.filter(t => t !== tel)
    setBloqueados(nova)
    await fetch('/api/cardapio-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload({ bloqueados: nova })),
    })
  }

  async function salvarNovaSenha() {
    setMsgSenha('')
    if (!senhaAtualInput || !novaSenhaInput || !confirmarSenhaInput) {
      setMsgSenha('Preencha todos os campos.')
      return
    }
    if (senhaAtualInput !== SENHA_MASTER && senhaAtualInput !== senhaClienteAtual) {
      setMsgSenha('Senha atual incorreta.')
      return
    }
    if (novaSenhaInput !== confirmarSenhaInput) {
      setMsgSenha('As novas senhas não coincidem.')
      return
    }
    if (novaSenhaInput.length < 6) {
      setMsgSenha('A nova senha deve ter no mínimo 6 caracteres.')
      return
    }
    setSalvandoSenha(true)
    try {
      const res = await fetch('/api/cardapio-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload({ senhaCliente: novaSenhaInput })),
      })
      if (res.ok) {
        setSenhaClienteAtual(novaSenhaInput)
        setMsgSenha('✅ Senha alterada com sucesso!')
        setSenhaAtualInput('')
        setNovaSenhaInput('')
        setConfirmarSenhaInput('')
      } else {
        setMsgSenha('Erro ao salvar. Tente novamente.')
      }
    } catch {
      setMsgSenha('Erro de conexão.')
    } finally {
      setSalvandoSenha(false)
      setTimeout(() => setMsgSenha(''), 5000)
    }
  }

  const [deploying, setDeploying] = useState(false)
  const [msgDeploy, setMsgDeploy] = useState('')

  // ── Impressora ────────────────────────────────────────────────
  const [nomeImpressora, setNomeImpressora] = useState(
    localStorage.getItem('scooby_impressora') || 'ISD Tech 12'
  )
  const [mostrarGuiaImpressora, setMostrarGuiaImpressora] = useState(false)
  const [impressoraConectada, setImpressoraConectada] = useState(false)
  const [conectando, setConectando] = useState(false)

  function salvarNomeImpressora(nome) {
    setNomeImpressora(nome)
    localStorage.setItem('scooby_impressora', nome)
  }

  async function conectarImpressora() {
    setConectando(true)
    try {
      qz.security.setCertificatePromise((resolve) => resolve(CERTIFICATE))
      qz.security.setSignatureAlgorithm('SHA512')
      qz.security.setSignaturePromise((toSign) => (resolve, reject) =>
        assinarQZ(toSign).then(resolve).catch(reject)
      )
      if (!qz.websocket.isActive()) await qz.websocket.connect()
      setImpressoraConectada(true)
    } catch (err) {
      console.error('QZ Tray connect error:', err)
      alert('Não foi possível conectar ao QZ Tray.\n\nVerifique se o programa está instalado e rodando (ícone na bandeja do Windows).\n\nSe necessário, abra o Chrome, acesse https://localhost:8181 e clique em "Avançado → Continuar".')
    } finally {
      setConectando(false)
    }
  }

  // Conecta automaticamente ao abrir o painel
  useEffect(() => {
    function configurarQZ() {
      qz.security.setCertificatePromise((resolve) => resolve(CERTIFICATE))
      qz.security.setSignatureAlgorithm('SHA512')
      qz.security.setSignaturePromise((toSign) => (resolve, reject) =>
        assinarQZ(toSign).then(resolve).catch(reject)
      )
    }
    async function autoConectar() {
      try {
        configurarQZ()
        if (!qz.websocket.isActive()) await qz.websocket.connect()
        setImpressoraConectada(true)
      } catch {
        // QZ Tray não está rodando — sem erro, usuário conecta manualmente
      }
    }
    autoConectar()

    // Heartbeat: mantém conexão QZ ativa para auto-impressão funcionar
    const heartbeat = setInterval(async () => {
      if (!qz.websocket.isActive()) {
        try {
          configurarQZ()
          await qz.websocket.connect()
          setImpressoraConectada(true)
        } catch {
          setImpressoraConectada(false)
        }
      }
    }, 20000) // verifica a cada 20s

    return () => clearInterval(heartbeat)
  }, [])

  async function desconectarImpressora() {
    try { await qz.websocket.disconnect() } catch {}
    setImpressoraConectada(false)
  }

  async function imprimirEscPos(pedido, tipo = 'manual') {
    // Se WebSocket caiu, tenta reconectar antes de imprimir
    if (!qz.websocket.isActive()) {
      try {
        await qz.websocket.connect()
        setImpressoraConectada(true)
      } catch {
        // QZ Tray não está rodando
        if (tipo === 'manual') {
          // Fallback para janela do browser (funciona só com gesto do usuário)
          imprimirPedido(pedido)
        }
        // Em auto-mode: não abre window.open (bloqueado pelo browser sem gesto)
        return
      }
    }
    try {
      let impressora = nomeImpressora
      try { await qz.printers.find(impressora) } catch { impressora = await qz.printers.getDefault() }
      const config = qz.configs.create(impressora)
      const bytes = gerarEscPos(pedido)
      let bin = ''
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
      await qz.print(config, [{ type: 'raw', format: 'base64', data: btoa(bin) }])
    } catch (err) {
      console.error('Erro QZ Tray:', err)
      if (tipo === 'manual') imprimirPedido(pedido)
    }
  }

  // ── Auto-print ────────────────────────────────────────────────
  // Padrão true: em nova instalação/PC/PWA, auto-impressão já vem ligada
  const [autoPrint, setAutoPrint] = useState(() => {
    const salvo = localStorage.getItem('scooby_autoprint')
    return salvo === null ? true : salvo === 'true'
  })
  // pedidosImpressos: { [id]: { hora, tipo: 'auto'|'manual' } } — registros de impressão
  const [pedidosImpressos, setPedidosImpressos] = useState(
    () => JSON.parse(localStorage.getItem('scooby_impressos') || '{}')
  )
  const pedidosImpressosRef = useRef(pedidosImpressos)
  // pedidosVistosRef: Set de IDs já "vistos" na abertura do admin (não reimprimir histórico)
  const pedidosVistosRef = useRef(new Set())
  const autoPrintRef = useRef(autoPrint)
  const isFirstFetchRef = useRef(true)
  // handleImprimirRef: sempre aponta para a versão mais recente de handleImprimir,
  // resolvendo o stale closure do useCallback([]) em buscarPedidos
  const handleImprimirRef = useRef(null)

  // Seleção para impressão em lote
  const [selecionados, setSelecionados] = useState(new Set())

  // ── Novos pedidos (destaque azul + som) ───────────────────────
  const [pedidosNovos, setPedidosNovos] = useState(new Set())
  const tocarSomNotificacaoRef = useRef(null)
  const audioCtxRef = useRef(null)

  // ── Alerta de inatividade ─────────────────────────────────────
  const [alarmePendente, setAlarmePendente] = useState(false)
  const alarmePendenteRef = useRef(false)
  const ultimaAtividadeRef = useRef(Date.now())
  const alarmeDismissidoRef = useRef(0) // timestamp do último dismiss
  const handleAtualizarStatusRef = useRef(null)

  // Desbloqueia o AudioContext na primeira interação do usuário
  useEffect(() => {
    function iniciarAudio() {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume()
      }
    }
    window.addEventListener('click', iniciarAudio)
    return () => window.removeEventListener('click', iniciarAudio)
  }, [])

  useEffect(() => { autoPrintRef.current = autoPrint }, [autoPrint])
  useEffect(() => { pedidosImpressosRef.current = pedidosImpressos }, [pedidosImpressos])

  function toggleAutoPrint() {
    const novo = !autoPrint
    setAutoPrint(novo)
    localStorage.setItem('scooby_autoprint', String(novo))
  }

  async function handleImprimir(pedido, tipo = 'manual') {
    const id = pedido.numeroPedido || pedido.id
    if (!id) return
    try {
      await imprimirEscPos(pedido, tipo)
    } catch {
      // erro já logado dentro de imprimirEscPos
    }
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const novos = { ...pedidosImpressosRef.current, [id]: { hora, tipo } }
    pedidosImpressosRef.current = novos
    setPedidosImpressos(novos)
    localStorage.setItem('scooby_impressos', JSON.stringify(novos))
    // Impressão confirmada → avança status para "Preparando" automaticamente
    if (!pedido.status || pedido.status === 'recebido') {
      handleAtualizarStatusRef.current?.(pedido, 'preparando')
    }
  }
  // Mantém a ref atualizada com a versão mais recente do handleImprimir (todo render)
  handleImprimirRef.current = handleImprimir

  function tocarSomNotificacao() {
    try {
      const ctx = audioCtxRef.current
      if (!ctx) return
      if (ctx.state === 'suspended') ctx.resume()
      const notas = [523, 659, 784] // Dó, Mi, Sol — acorde alegre
      notas.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.value = freq
        const t = ctx.currentTime + i * 0.18
        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(0.45, t + 0.05)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
        osc.start(t)
        osc.stop(t + 0.4)
      })
    } catch { /* navegador bloqueou áudio */ }
  }
  tocarSomNotificacaoRef.current = tocarSomNotificacao

  function tocarSomAlarme() {
    try {
      const ctx = audioCtxRef.current
      if (!ctx) return
      if (ctx.state === 'suspended') ctx.resume()
      // 3 bipes urgentes curtos
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'square'
        osc.frequency.value = 880
        const t = ctx.currentTime + i * 0.35
        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(0.3, t + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28)
        osc.start(t)
        osc.stop(t + 0.28)
      }
    } catch { /* navegador bloqueou áudio */ }
  }

  function dismissAlarme() {
    setAlarmePendente(false)
    alarmePendenteRef.current = false
    ultimaAtividadeRef.current = Date.now()
    alarmeDismissidoRef.current = Date.now()
  }

  // Rastreia atividade do usuário — qualquer click/toque reseta o timer
  useEffect(() => {
    function registrar() {
      ultimaAtividadeRef.current = Date.now()
      if (alarmePendenteRef.current) dismissAlarme()
    }
    window.addEventListener('click', registrar)
    window.addEventListener('touchstart', registrar)
    window.addEventListener('keydown', registrar)
    return () => {
      window.removeEventListener('click', registrar)
      window.removeEventListener('touchstart', registrar)
      window.removeEventListener('keydown', registrar)
    }
  }, [])

  // Verifica inatividade a cada 30s
  useEffect(() => {
    const CINCO_MIN = 5 * 60 * 1000
    const interval = setInterval(() => {
      const inativo = Date.now() - ultimaAtividadeRef.current >= CINCO_MIN
      const jaPassouDismiss = Date.now() - alarmeDismissidoRef.current >= CINCO_MIN
      if (!inativo || !jaPassouDismiss) return
      // Pedidos pendentes = recebido E não impresso
      const pendentes = pedidos.filter(p => {
        const id = p.numeroPedido || p.id
        return (!p.status || p.status === 'recebido') && !pedidosImpressosRef.current[id]
      })
      if (pendentes.length > 0) {
        setAlarmePendente(true)
        alarmePendenteRef.current = true
        tocarSomAlarme()
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [pedidos])

  function marcarPedidoComoVisto(id) {
    setPedidosNovos(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  async function handleAtualizarStatus(pedido, status) {
    const res = await fetch(`/api/pedido?id=${pedido.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setPedidos(prev => prev.map(p => p.id === pedido.id
        ? { ...p, status, statusAtualizadoEm: new Date().toISOString() }
        : p
      ))
    }
  }
  handleAtualizarStatusRef.current = handleAtualizarStatus

  async function handleConfirmarPix(pedido) {
    const res = await fetch(`/api/pedido?id=${pedido.id}`, { method: 'PATCH' })
    if (res.ok) {
      setPedidos(prev => prev.map(p => p.id === pedido.id
        ? { ...p, pixConfirmado: true, pixConfirmadoEm: new Date().toISOString() }
        : p
      ))
    } else {
      alert('Erro ao confirmar Pix.')
    }
  }

  async function handleExcluirPedido(pedido) {
    const id = pedido.numeroPedido || pedido.id
    if (!window.confirm(`Excluir pedido ${id} de ${pedido.nomeCliente}?\n\nEsta ação não pode ser desfeita.`)) return
    const res = await fetch(`/api/pedido?id=${pedido.id}`, { method: 'DELETE' })
    if (res.ok) {
      setPedidos(prev => prev.filter(p => p.id !== pedido.id))
    } else {
      alert('Erro ao excluir pedido.')
    }
  }

  function toggleSelecionado(id) {
    if (!id) return
    setSelecionados(prev => {
      const novo = new Set(prev)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }

  function selecionarTodos() {
    if (selecionados.size === pedidosFiltrados.length) {
      setSelecionados(new Set())
    } else {
      setSelecionados(new Set(pedidosFiltrados.map(p => p.numeroPedido || p.id).filter(Boolean)))
    }
  }

  function imprimirSelecionados() {
    const lista = pedidosFiltrados.filter(p => selecionados.has(p.numeroPedido || p.id))
    lista.forEach((p, i) => {
      // Atraso escalonado para não abrir todas as janelas ao mesmo tempo
      setTimeout(() => handleImprimir(p, 'manual'), i * 400)
    })
    setSelecionados(new Set())
  }

  async function triggerDeploy() {
    setDeploying(true)
    setMsgDeploy('')
    try {
      const res = await fetch('/api/deploy', { method: 'POST' })
      const data = await res.json()
      if (data.sucesso) {
        setMsgDeploy('🚀 Deploy iniciado! Aguarde ~1 minuto.')
      } else {
        setMsgDeploy('Erro ao iniciar deploy.')
      }
    } catch {
      setMsgDeploy('Erro de conexão.')
    } finally {
      setDeploying(false)
      setTimeout(() => setMsgDeploy(''), 8000)
    }
  }

  // ── Dados calculados ──────────────────────────────────────────
  const dataAtiva = filtroRapido === 'hoje' ? hoje()
    : filtroRapido === 'ontem' ? ontem()
    : dataFiltro

  const pedidosFiltrados = filtrarPedidos(pedidos, dataAtiva, pagamentoFiltro)
  const pedidosHoje = pedidos.filter(p => p.data === hoje())

  const totalHoje = pedidosHoje.reduce((acc, p) => acc + parseFloat(p.total || 0), 0)
  const ticketMedio = pedidosHoje.length > 0 ? totalHoje / pedidosHoje.length : 0
  const totalGeral = pedidosFiltrados.reduce((acc, p) => acc + parseFloat(p.total || 0), 0)

  const countPix     = pedidosFiltrados.filter(p => p.pagamento === 'Pix').length
  const countDinheiro = pedidosFiltrados.filter(p => p.pagamento === 'Dinheiro').length
  const countCartao  = pedidosFiltrados.filter(p => p.pagamento?.includes('Cartão')).length

  // ── Clientes únicos agrupados por telefone ──────────────────
  const clientesMap = {}
  pedidos.forEach(p => {
    const chave = p.telefone || p.nomeCliente
    if (!clientesMap[chave]) {
      clientesMap[chave] = {
        nome: p.nomeCliente,
        telefone: p.telefone || '—',
        endereco: p.endereco,
        pedidos: [],
        totalGasto: 0,
      }
    }
    clientesMap[chave].pedidos.push(p)
    clientesMap[chave].totalGasto += parseFloat(p.total || 0)
    // Atualiza endereço com o mais recente
    if (p.endereco && p.endereco !== 'Retirar no local') {
      clientesMap[chave].endereco = p.endereco
    }
  })
  const clientes = Object.values(clientesMap)
    .sort((a, b) => b.pedidos.length - a.pedidos.length)
    .filter(c =>
      !buscaCliente ||
      c.nome.toLowerCase().includes(buscaCliente.toLowerCase()) ||
      c.telefone.includes(buscaCliente)
    )

  const todosItensFlat = categorias.flatMap(cat => cat.itens.map(item => ({
    id: item.id,
    nome: item.nome,
    preco: item.preco,
    temVariacao: !!(item.proteinas || item.tamanhos),
  })))

  function exportarExcel() {
    const lista = pedidosFiltrados.map(p => ({
      'Nº Pedido':    p.numeroPedido || p.id,
      'Data':         p.data,
      'Hora':         p.hora,
      'Cliente':      p.nomeCliente,
      'Tipo':         p.tipoEntrega,
      'Endereço':     p.endereco,
      'Itens':        p.itensPedido,
      'Subtotal':     p.subtotal,
      'Taxa Entrega': p.taxaEntrega,
      'TOTAL':        p.total,
      'Pagamento':    p.pagamento,
      'Observações':  p.observacao || '',
    }))
    const ws = XLSX.utils.json_to_sheet(lista)
    ws['!cols'] = [
      { wch: 18 }, { wch: 12 }, { wch: 8 }, { wch: 20 },
      { wch: 10 }, { wch: 30 }, { wch: 50 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 20 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Pedidos')
    const nome = dataAtiva
      ? `pedidos-${dataAtiva.replace(/\//g, '-')}.xlsx`
      : `pedidos-todos.xlsx`
    XLSX.writeFile(wb, nome)
  }

  // ── TELA DE LOGIN ─────────────────────────────────────────────
  if (!autenticado) {
    return (
      <div className="min-h-screen bg-scooby-escuro flex items-center justify-center p-4">
        <div className="bg-scooby-card border border-scooby-borda rounded-2xl p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <img src="/logo.png" alt="Logo" className="w-20 h-20 object-contain mx-auto mb-3 rounded-full" />
            <h1 className="text-scooby-amarelo font-bold text-xl">Painel Administrativo</h1>
            <p className="text-gray-400 text-sm">Scooby-Doo Lanches</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="Senha"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              className="w-full bg-scooby-escuro border border-scooby-borda text-white rounded-xl px-4 py-3 focus:outline-none focus:border-scooby-amarelo"
            />
            <button className="w-full bg-scooby-vermelho hover:bg-red-700 text-white font-bold py-3 rounded-xl transition">
              Entrar
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── PAINEL ADMIN ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-scooby-escuro text-white">
      {/* Banner nova versão */}
      {novaVersao && (
        <div className="bg-green-700 text-white text-sm font-semibold text-center py-2 px-4 flex items-center justify-center gap-3">
          <span>🔄 Nova versão disponível!</span>
          <button onClick={() => window.location.reload()} className="bg-white text-green-800 font-bold px-3 py-1 rounded-lg text-xs hover:bg-green-100 transition">
            Atualizar agora
          </button>
        </div>
      )}
      {/* Header */}
      <header className="bg-scooby-vermelho border-b-4 border-scooby-amarelo px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          {/* Logo + título */}
          <div className="flex items-center gap-2.5 min-w-0">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-contain flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-scooby-amarelo font-bold text-sm sm:text-lg leading-tight">Painel Admin</h1>
              <p className="text-yellow-200 text-xs flex items-center gap-1">
                {ultimaAtualizacao ? ultimaAtualizacao : 'Carregando...'}
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block"></span>
              </p>
              {debugInfo && <p className="text-gray-400 text-[10px] leading-tight">{debugInfo}</p>}
            </div>
          </div>

          {/* Status da loja */}
          <div className="flex items-center bg-scooby-escuro border border-scooby-borda rounded-xl p-0.5 gap-0.5">
            <button onClick={() => salvarStatusLoja('auto')} disabled={salvandoStatus}
              className={`text-xs font-bold px-2.5 py-1.5 rounded-lg transition disabled:opacity-60 ${lojaStatus === 'auto' ? 'bg-yellow-500 text-black' : 'text-gray-400'}`}>
              ⏰<span className="hidden sm:inline"> Auto</span>
            </button>
            <button onClick={() => salvarStatusLoja('aberta')} disabled={salvandoStatus}
              className={`text-xs font-bold px-2.5 py-1.5 rounded-lg transition disabled:opacity-60 ${lojaStatus === 'aberta' ? 'bg-green-600 text-white' : 'text-gray-400'}`}>
              🟢<span className="hidden sm:inline"> Aberta</span>
            </button>
            <button onClick={() => salvarStatusLoja('fechada')} disabled={salvandoStatus}
              className={`text-xs font-bold px-2.5 py-1.5 rounded-lg transition disabled:opacity-60 ${lojaStatus === 'fechada' ? 'bg-red-700 text-white' : 'text-gray-400'}`}>
              🔴<span className="hidden sm:inline"> Fechada</span>
            </button>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2">
            {isMaster && (
              <>
                {msgDeploy && <span className="text-xs text-green-300 font-semibold hidden sm:inline">{msgDeploy}</span>}
                <button onClick={triggerDeploy} disabled={deploying}
                  className="font-bold text-xs px-3 py-1.5 rounded-xl border bg-purple-800 border-purple-500 text-white disabled:opacity-50 transition">
                  {deploying ? '⏳' : '🚀'}<span className="hidden sm:inline"> {deploying ? 'Deploy...' : 'Deploy'}</span>
                </button>
              </>
            )}
            <a href="/" className="text-yellow-200 text-xs transition">← Site</a>
          </div>
        </div>
      </header>

      {/* Abas */}
      <div className="bg-scooby-card border-b border-scooby-borda">
        <div className="max-w-7xl mx-auto px-2 overflow-x-auto" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
          <div className="flex gap-0.5 pt-2 min-w-max">
            {[
              { id: 'pedidos',       label: '📋 Pedidos',        short: '📋' },
              { id: 'mesas',         label: '🍽️ Mesas',          short: '🍽️' },
              { id: 'clientes',      label: '👥 Clientes',        short: '👥' },
              { id: 'cardapio',      label: '🍔 Cardápio',        short: '🍔' },
              { id: 'combos',        label: '🎉 Combos & Cupons', short: '🎉' },
              { id: 'caixa',         label: '💰 Caixa',           short: '💰' },
              { id: 'configuracoes', label: '⚙️ Config',          short: '⚙️' },
              { id: 'seguranca',     label: '🔐 Segurança',       short: '🔐' },
            ].map(aba => (
              <button
                key={aba.id}
                onClick={() => setAbaAtiva(aba.id)}
                className={`flex-shrink-0 px-3 sm:px-5 py-2.5 rounded-t-xl font-semibold text-xs sm:text-sm transition border-b-2 whitespace-nowrap ${
                  abaAtiva === aba.id
                    ? 'bg-scooby-escuro text-scooby-amarelo border-scooby-amarelo'
                    : 'text-gray-400 hover:text-white border-transparent hover:bg-scooby-borda'
                }`}
              >
                <span className="hidden sm:inline">{aba.label}</span>
                <span className="sm:hidden">{aba.short}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── ABA MESAS ── */}
      {abaAtiva === 'mesas' && (
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-bold text-lg">Mesas</h2>
            <button onClick={buscarMesas} className="text-gray-400 hover:text-white text-sm transition">↺ Atualizar</button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => {
              const m = mesas.find(x => x.numero === n)
              const aberta = m?.status === 'aberta'
              return (
                <div key={n} className={`rounded-2xl border-2 p-4 flex flex-col gap-2 ${
                  aberta ? 'border-yellow-500 bg-yellow-500/10' : 'border-scooby-borda bg-scooby-card'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-white font-black text-2xl">{n}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      aberta ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-700 text-gray-500'
                    }`}>{aberta ? 'Aberta' : 'Livre'}</span>
                  </div>

                  {aberta && m?.itens?.length > 0 && (
                    <div className="space-y-0.5">
                      {(m.itens || []).map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="text-gray-300 truncate">{item.qtd}x {item.nome}{item.variacao ? ` (${item.variacao})` : ''}</span>
                          <button
                            onClick={async () => {
                              await fetch(`/api/mesa?numero=${n}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'remover-item', itemIdx: idx }) })
                              buscarMesas()
                            }}
                            className="text-gray-600 hover:text-red-400 ml-1 flex-shrink-0">×</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {aberta && (
                    <div className="mt-1 pt-2 border-t border-yellow-500/20">
                      <p className="text-yellow-400 font-black text-base">R$ {Number(m?.total || 0).toFixed(2).replace('.', ',')}</p>
                    </div>
                  )}

                  {aberta && (
                    <div className="flex flex-col gap-1.5 mt-1">
                      <button
                        onClick={() => { setMesaFechando(n); setPagamentoMesa('Dinheiro'); setTrocoMesa('') }}
                        className="w-full bg-green-700 hover:bg-green-600 text-white text-xs font-bold py-2 rounded-xl transition">
                        💳 Fechar conta
                      </button>
                      <button
                        onClick={() => resetarMesa(n)}
                        className="w-full bg-scooby-borda hover:bg-red-900 text-gray-400 hover:text-white text-xs py-1.5 rounded-xl transition">
                        Resetar
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Modal fechar conta */}
          {mesaFechando && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
              <div className="bg-scooby-card border border-scooby-borda rounded-2xl p-6 w-full max-w-sm">
                <h3 className="text-white font-bold text-lg mb-1">Fechar conta — Mesa {mesaFechando}</h3>
                <p className="text-yellow-400 font-black text-xl mb-4">
                  R$ {Number(mesas.find(x => x.numero === mesaFechando)?.total || 0).toFixed(2).replace('.', ',')}
                </p>

                <p className="text-gray-400 text-sm mb-2">Forma de pagamento</p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {[
                    { id: 'Dinheiro', emoji: '💵' },
                    { id: 'Pix', emoji: '📲' },
                    { id: 'Cartão de Débito', emoji: '💳' },
                    { id: 'Cartão de Crédito', emoji: '💳' },
                  ].map(p => (
                    <button key={p.id} onClick={() => setPagamentoMesa(p.id)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition ${
                        pagamentoMesa === p.id
                          ? 'border-yellow-400 bg-yellow-400/10 text-white'
                          : 'border-scooby-borda bg-scooby-escuro text-gray-400'
                      }`}>
                      <span>{p.emoji}</span>{p.id.replace('Cartão de ', '')}
                    </button>
                  ))}
                </div>

                {pagamentoMesa === 'Dinheiro' && (
                  <div className="mb-4">
                    <label className="text-gray-400 text-xs block mb-1">Troco para (opcional)</label>
                    <input
                      type="text" placeholder="Ex: 50,00" value={trocoMesa}
                      onChange={e => setTrocoMesa(e.target.value)}
                      className="w-full bg-scooby-escuro border border-scooby-borda text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-scooby-amarelo"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={() => setMesaFechando(null)}
                    className="flex-1 bg-scooby-borda hover:bg-gray-700 text-white py-3 rounded-xl text-sm transition">
                    Cancelar
                  </button>
                  <button onClick={fecharMesa} disabled={fechandoMesa}
                    className={`flex-1 font-bold py-3 rounded-xl text-sm transition ${
                      fechandoMesa ? 'bg-gray-700 text-gray-400' : 'bg-green-700 hover:bg-green-600 text-white'
                    }`}>
                    {fechandoMesa ? 'Fechando...' : '✅ Confirmar'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ABA PEDIDOS ── */}
      {abaAtiva === 'pedidos' && (
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">

          {/* Stats do dia */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            <CardStat
              label="🛒 Pedidos hoje"
              valor={pedidosHoje.length}
              sub={`${pedidosHoje.filter(p => p.tipoEntrega === 'Entrega').length} entregas · ${pedidosHoje.filter(p => p.tipoEntrega === 'Retirada').length} retiradas`}
              cor="text-white"
            />
            <CardStat
              label="💰 Total hoje"
              valor={`R$ ${totalHoje.toFixed(2).replace('.', ',')}`}
              sub={`Ticket médio: R$ ${ticketMedio.toFixed(2).replace('.', ',')}`}
              cor="text-scooby-amarelo"
            />
            <CardStat
              label="📲 Pix hoje"
              valor={`R$ ${pedidosHoje.filter(p => p.pagamento === 'Pix').reduce((a, p) => a + parseFloat(p.total || 0), 0).toFixed(2).replace('.', ',')}`}
              sub={`${pedidosHoje.filter(p => p.pagamento === 'Pix').length} pedidos`}
              cor="text-blue-400"
            />
            <CardStat
              label="💵 Dinheiro hoje"
              valor={`R$ ${pedidosHoje.filter(p => p.pagamento === 'Dinheiro').reduce((a, p) => a + parseFloat(p.total || 0), 0).toFixed(2).replace('.', ',')}`}
              sub={`${pedidosHoje.filter(p => p.pagamento === 'Dinheiro').length} pedidos`}
              cor="text-green-400"
            />
            <CardStat
              label="💳 Débito hoje"
              valor={`R$ ${pedidosHoje.filter(p => p.pagamento === 'Cartão de Débito').reduce((a, p) => a + parseFloat(p.total || 0), 0).toFixed(2).replace('.', ',')}`}
              sub={`${pedidosHoje.filter(p => p.pagamento === 'Cartão de Débito').length} pedidos`}
              cor="text-purple-400"
            />
            <CardStat
              label="💳 Crédito hoje"
              valor={`R$ ${pedidosHoje.filter(p => p.pagamento === 'Cartão de Crédito').reduce((a, p) => a + parseFloat(p.total || 0), 0).toFixed(2).replace('.', ',')}`}
              sub={`${pedidosHoje.filter(p => p.pagamento === 'Cartão de Crédito').length} pedidos`}
              cor="text-pink-400"
            />
          </div>

          {/* Filtros */}
          <div className="bg-scooby-card border border-scooby-borda rounded-2xl p-4 flex flex-wrap gap-3 items-end">
            {/* Filtro rápido */}
            <div>
              <p className="text-gray-500 text-xs mb-1.5">Período</p>
              <div className="flex gap-1.5">
                {[['hoje', 'Hoje'], ['ontem', 'Ontem'], ['todos', 'Todos']].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => { setFiltroRapido(val); setDataFiltro('') }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                      filtroRapido === val
                        ? 'bg-scooby-amarelo text-black'
                        : 'bg-scooby-escuro text-gray-400 hover:text-white border border-scooby-borda'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Data manual */}
            <div>
              <p className="text-gray-500 text-xs mb-1.5">Data específica</p>
              <input
                type="text"
                placeholder="dd/mm/aaaa"
                value={dataFiltro}
                onChange={e => { setDataFiltro(e.target.value); setFiltroRapido('') }}
                className="bg-scooby-escuro border border-scooby-borda text-white rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-scooby-amarelo w-32"
              />
            </div>

            {/* Pagamento */}
            <div>
              <p className="text-gray-500 text-xs mb-1.5">Pagamento</p>
              <select
                value={pagamentoFiltro}
                onChange={e => setPagamentoFiltro(e.target.value)}
                className="bg-scooby-escuro border border-scooby-borda text-white rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-scooby-amarelo"
              >
                <option value="">Todos</option>
                <option value="Pix">Pix</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Cartão de Débito">Débito</option>
                <option value="Cartão de Crédito">Crédito</option>
              </select>
            </div>

            <div className="flex gap-2 ml-auto flex-wrap items-center">
              {/* Impressão em lote */}
              {selecionados.size > 0 && (
                <button
                  onClick={imprimirSelecionados}
                  className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-black font-bold text-sm px-4 py-2 rounded-xl transition"
                >
                  🖨️ Imprimir {selecionados.size} selecionado{selecionados.size > 1 ? 's' : ''}
                </button>
              )}
              <button
                onClick={toggleAutoPrint}
                className={`flex items-center gap-2 font-semibold text-sm px-4 py-2 rounded-xl border-2 transition ${
                  autoPrint
                    ? impressoraConectada
                      ? 'bg-green-700 border-green-500 text-white hover:bg-green-600'
                      : 'bg-yellow-700 border-yellow-500 text-white hover:bg-yellow-600 animate-pulse'
                    : 'bg-gray-800 border-gray-600 text-gray-400 hover:text-white'
                }`}
                title={
                  autoPrint
                    ? impressoraConectada
                      ? 'Auto-impressão ligada (clique para desligar)'
                      : '⚠️ Auto-impressão ligada mas impressora desconectada — vá em Configurações e clique Conectar USB'
                    : 'Auto-impressão desligada (clique para ligar)'
                }
              >
                <span className={`w-2 h-2 rounded-full ${autoPrint ? impressoraConectada ? 'bg-green-300 animate-pulse' : 'bg-yellow-300 animate-pulse' : 'bg-gray-500'}`}></span>
                🖨️ Auto {autoPrint ? (impressoraConectada ? 'ON ✓' : 'ON ⚠️') : 'OFF'}
              </button>
              <button
                onClick={buscarPedidos}
                className="bg-scooby-borda hover:bg-scooby-vermelho text-white px-4 py-2 rounded-xl text-sm transition"
              >
                🔄 Atualizar
              </button>
              <button
                onClick={exportarExcel}
                disabled={pedidosFiltrados.length === 0}
                className="bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white font-bold px-4 py-2 rounded-xl text-sm transition"
              >
                📥 Excel ({pedidosFiltrados.length})
              </button>
            </div>
          </div>

          {/* Resumo filtro atual */}
          {pedidosFiltrados.length > 0 && (
            <div className="flex flex-wrap gap-4 text-sm text-gray-400 px-1">
              <span><strong className="text-white">{pedidosFiltrados.length}</strong> pedidos</span>
              <span>Total: <strong className="text-scooby-amarelo">R$ {totalGeral.toFixed(2).replace('.', ',')}</strong></span>
              {countPix > 0 && <span>Pix: <strong className="text-blue-400">{countPix}</strong></span>}
              {countDinheiro > 0 && <span>Dinheiro: <strong className="text-green-400">{countDinheiro}</strong></span>}
              {countCartao > 0 && <span>Cartão: <strong className="text-purple-400">{countCartao}</strong></span>}
            </div>
          )}

          {/* Lista de pedidos */}
          {carregando ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-4xl mb-3 animate-pulse">⏳</p>
              <p>Carregando pedidos...</p>
            </div>
          ) : pedidosFiltrados.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <p className="text-5xl mb-4">📋</p>
              <p className="font-semibold text-lg text-gray-400">Nenhum pedido encontrado</p>
              <p className="text-sm mt-1">
                {filtroRapido === 'hoje' ? 'Nenhum pedido recebido hoje ainda.' : 'Tente outro filtro.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Banner de cupons ativos */}
              {cuponsEditados.filter(c => c.ativo).length > 0 && (
                <div className="bg-green-900/40 border border-green-600/50 rounded-xl px-4 py-3 space-y-1">
                  <p className="text-green-300 font-bold text-sm">🎟 Cupons ativos — desconto sendo aplicado nos pedidos</p>
                  {cuponsEditados.filter(c => c.ativo).map(c => (
                    <p key={c.id} className="text-green-400 text-xs">
                      <span className="font-mono font-bold bg-green-900 px-1.5 py-0.5 rounded">{c.codigo}</span>
                      {' — '}
                      Todo pedido com este cupom terá{' '}
                      <strong>{c.tipo === 'percentual' ? `${c.valor}% de desconto` : `R$ ${Number(c.valor).toFixed(2)} de desconto`}</strong>
                    </p>
                  ))}
                </div>
              )}

              {/* Banner de alerta de inatividade */}
              {alarmePendente && (
                <div
                  onClick={dismissAlarme}
                  className="cursor-pointer flex items-center justify-between bg-red-700 text-white rounded-xl px-4 py-3 animate-pulse shadow-lg shadow-red-900/50"
                >
                  <div>
                    <p className="font-bold text-sm">⚠️ Você tem pedidos a preparar!</p>
                    <p className="text-red-200 text-xs mt-0.5">Há pedidos novos não confirmados. Clique aqui para dispensar.</p>
                  </div>
                  <span className="text-2xl ml-3">🔔</span>
                </div>
              )}

              {/* Banner de novos pedidos */}
              {pedidosNovos.size > 0 && (
                <div className="flex items-center justify-between bg-blue-600 text-white rounded-xl px-4 py-2.5 animate-pulse">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    🔔 {pedidosNovos.size} novo{pedidosNovos.size > 1 ? 's' : ''} pedido{pedidosNovos.size > 1 ? 's' : ''}!
                  </div>
                  <button
                    onClick={() => setPedidosNovos(new Set())}
                    className="text-xs bg-blue-800 hover:bg-blue-900 px-2.5 py-1 rounded-lg transition"
                  >
                    Dispensar todos
                  </button>
                </div>
              )}
              {/* Selecionar todos */}
              <div className="flex items-center gap-3 px-1 pb-1">
                <button
                  onClick={selecionarTodos}
                  className="text-xs text-gray-400 hover:text-scooby-amarelo transition font-medium"
                >
                  {selecionados.size === pedidosFiltrados.length && pedidosFiltrados.length > 0
                    ? '✓ Desmarcar todos'
                    : `Selecionar todos (${pedidosFiltrados.length})`
                  }
                </button>
                {selecionados.size > 0 && (
                  <span className="text-xs text-scooby-amarelo font-semibold">
                    {selecionados.size} selecionado{selecionados.size > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {pedidosFiltrados.map((p, i) => (
                <CardPedido
                  key={p.id || i}
                  pedido={p}
                  onImprimir={handleImprimir}
                  onExcluir={handleExcluirPedido}
                  onConfirmarPix={handleConfirmarPix}
                  onAtualizarStatus={handleAtualizarStatus}
                  selecionado={selecionados.has(p.numeroPedido || p.id)}
                  onToggleSelecionado={toggleSelecionado}
                  infoImpressao={pedidosImpressos[p.numeroPedido || p.id] || null}
                  isNovo={pedidosNovos.has(p.numeroPedido || p.id)}
                  onMarcarVisto={() => marcarPedidoComoVisto(p.numeroPedido || p.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ABA CLIENTES ── */}
      {abaAtiva === 'clientes' && (
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-scooby-amarelo font-bold text-lg">Base de Clientes</h2>
              <p className="text-gray-500 text-sm">{clientes.length} clientes cadastrados</p>
            </div>
            <input
              type="text"
              placeholder="Buscar por nome ou telefone..."
              value={buscaCliente}
              onChange={e => setBuscaCliente(e.target.value)}
              className="bg-scooby-escuro border border-scooby-borda text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-scooby-amarelo w-64"
            />
          </div>

          {clientes.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <p className="text-5xl mb-4">👥</p>
              <p className="font-semibold text-gray-400">Nenhum cliente encontrado</p>
              <p className="text-sm mt-1">Os clientes aparecerão aqui conforme fizerem pedidos.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {clientes.map((c, i) => (
                <CardCliente
                  key={i}
                  cliente={c}
                  onExcluir={async (cliente) => {
                    const total = cliente.pedidos.length
                    if (!window.confirm(`Excluir ${cliente.nome} e todos os ${total} pedidos?\n\nEsta ação não pode ser desfeita.`)) return

                    // Excluir pedido por pedido (mais confiável que filtrar por telefone)
                    let erros = 0
                    for (const p of cliente.pedidos) {
                      const res = await fetch(`/api/pedido?id=${p.id}`, { method: 'DELETE' })
                      if (!res.ok) erros++
                    }
                    if (erros > 0) {
                      alert(`Atenção: ${erros} pedido(s) não puderam ser excluídos. Tente novamente.`)
                    }
                    // Atualiza estado local removendo os pedidos do cliente
                    const idsExcluidos = new Set(cliente.pedidos.map(p => p.id))
                    setPedidos(prev => prev.filter(p => !idsExcluidos.has(p.id)))
                  }}
                  onEditar={async (cliente, novoNome) => {
                    if (cliente.telefone === '—') return
                    const res = await fetch('/api/clientes', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ telefone: cliente.telefone, nome: novoNome }),
                    })
                    if (!res.ok) alert('Erro ao salvar.')
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ABA CARDÁPIO ── */}
      {abaAtiva === 'cardapio' && (
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">

          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-scooby-amarelo font-bold text-lg">Gerenciar Cardápio</h2>
            <div className="flex items-center gap-3">
              {msgCardapio && (
                <span className={`text-sm font-semibold px-3 py-1 rounded-xl ${msgCardapio.includes('sucesso') ? 'bg-green-800 text-green-300' : 'bg-red-900 text-red-300'}`}>
                  {msgCardapio}
                </span>
              )}
              <button
                onClick={salvarCardapio}
                disabled={salvandoCardapio}
                className="bg-scooby-vermelho hover:bg-red-700 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition"
              >
                {salvandoCardapio ? 'Salvando...' : '💾 Salvar alterações'}
              </button>
            </div>
          </div>

          {/* Taxa de entrega + Tempo */}
          <div className="bg-scooby-card border border-scooby-borda rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="text-scooby-amarelo font-bold text-sm mb-3">🚗 Taxa de Entrega</h3>
              <div className="flex items-center gap-3">
                <span className="text-gray-400 text-sm">R$</span>
                <input
                  type="number"
                  step="0.50"
                  min="0"
                  value={taxaEntregaEditada}
                  onChange={e => setTaxaEntregaEditada(e.target.value)}
                  className="w-28 bg-scooby-escuro border border-scooby-borda text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-scooby-amarelo"
                />
                <span className="text-gray-500 text-xs">por entrega (atual: R$ {Number(taxaEntregaEditada).toFixed(2).replace('.', ',')})</span>
              </div>
            </div>
            <div className="border-t border-scooby-borda pt-4">
              <h3 className="text-scooby-amarelo font-bold text-sm mb-3">⏱ Tempo de Entrega</h3>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Ex: 40 a 60 min"
                  value={tempoEntregaEditado}
                  onChange={e => setTempoEntregaEditado(e.target.value)}
                  className="w-48 bg-scooby-escuro border border-scooby-borda text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-scooby-amarelo"
                />
                <span className="text-gray-500 text-xs">aparece no cabeçalho do site</span>
              </div>
            </div>

            <div className="border-t border-scooby-borda pt-4">
              <h3 className="text-scooby-amarelo font-bold text-sm mb-1">🕐 Horário de Funcionamento</h3>
              <p className="text-gray-500 text-xs mb-3">Usado quando o status está em <span className="text-yellow-400 font-semibold">⏰ Auto</span></p>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">Abre às</span>
                  <input
                    type="time"
                    value={horarioAberturaEditado}
                    onChange={e => setHorarioAberturaEditado(e.target.value)}
                    className="bg-scooby-escuro border border-scooby-borda text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-scooby-amarelo"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">Fecha às</span>
                  <input
                    type="time"
                    value={horarioFechamentoEditado}
                    onChange={e => setHorarioFechamentoEditado(e.target.value)}
                    className="bg-scooby-escuro border border-scooby-borda text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-scooby-amarelo"
                  />
                </div>
                <span className="text-gray-500 text-xs">salvo junto com "Salvar alterações"</span>
              </div>
              <div className="mt-3">
                <p className="text-gray-400 text-xs mb-2">Dias de funcionamento</p>
                <div className="flex gap-1.5 flex-wrap">
                  {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((dia, i) => (
                    <button key={i}
                      onClick={() => setDiasFuncionamento(prev =>
                        prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i].sort((a,b) => a-b)
                      )}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                        diasFuncionamento.includes(i)
                          ? 'bg-scooby-amarelo text-black border-scooby-amarelo'
                          : 'bg-scooby-escuro text-gray-500 border-scooby-borda hover:border-gray-400'
                      }`}
                    >{dia}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {categorias.map(cat => (
            <div key={cat.id} className="bg-scooby-card border border-scooby-borda rounded-2xl overflow-hidden">
              <div className="bg-scooby-borda px-5 py-3">
                <h3 className="text-scooby-amarelo font-bold text-sm">{cat.nome}</h3>
              </div>
              <div className="divide-y divide-scooby-borda">
                {cat.itens.map(item => {
                  const ativo = !desativadosEditados.includes(item.id)
                  const temVariacao = !!(item.proteinas || item.tamanhos)
                  const precoAtual = precosEditados[String(item.id)] !== undefined
                    ? precosEditados[String(item.id)]
                    : (item.preco !== undefined ? item.preco : '')
                  return (
                    <div key={item.id} className="px-5 py-3">
                      {/* Linha principal */}
                      <div className="flex items-center gap-4 flex-wrap">
                        <button
                          onClick={() => toggleDesativado(item.id)}
                          className={`flex-shrink-0 w-12 h-6 rounded-full transition-colors relative ${ativo ? 'bg-green-600' : 'bg-gray-600'}`}
                          title={ativo ? 'Clique para marcar como esgotado' : 'Clique para reativar'}
                        >
                          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${ativo ? 'right-1' : 'left-1'}`}></span>
                        </button>

                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm ${ativo ? 'text-white' : 'text-gray-500'}`}>
                            {item.nome}
                          </p>
                          <p className="text-gray-500 text-xs truncate">{item.descricao}</p>
                        </div>

                        {!temVariacao && (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-gray-500 text-xs">R$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={precoAtual}
                              onChange={e => handlePrecoChange(item.id, e.target.value)}
                              className="w-24 bg-scooby-escuro border border-scooby-borda text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-scooby-amarelo text-right"
                            />
                          </div>
                        )}

                        <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${ativo ? 'bg-green-900 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                          {ativo ? 'Ativo' : 'Esgotado'}
                        </span>
                      </div>

                      {/* Preços das variações */}
                      {temVariacao && (
                        <div className="mt-2 ml-14 flex flex-wrap gap-x-4 gap-y-2">
                          {(item.proteinas || item.tamanhos).map(v => {
                            const chave = `${item.id}-${v.label}`
                            const precoV = precosVariacoesEditados[chave] !== undefined
                              ? precosVariacoesEditados[chave]
                              : v.preco
                            return (
                              <div key={v.label} className="flex items-center gap-1.5">
                                <span className="text-gray-400 text-xs whitespace-nowrap">{v.label}:</span>
                                <span className="text-gray-500 text-xs">R$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={precoV}
                                  onChange={e => handlePrecoVariacaoChange(item.id, v.label, e.target.value)}
                                  className="w-20 bg-scooby-escuro border border-scooby-borda text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-scooby-amarelo text-right"
                                />
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}


          {/* Adicionais */}
          <div className="bg-scooby-card border border-scooby-borda rounded-2xl overflow-hidden">
            <div className="bg-scooby-borda px-5 py-3">
              <h3 className="text-scooby-amarelo font-bold text-sm">🍗 Adicionais</h3>
            </div>
            <div className="divide-y divide-scooby-borda">
              {ADICIONAIS.map(ad => {
                const ativo = !desativadosEditados.includes(ad.id)
                const precoAtual = precosEditados[ad.id] !== undefined ? precosEditados[ad.id] : ad.preco
                return (
                  <div key={ad.id} className="px-5 py-3">
                    <div className="flex items-center gap-4 flex-wrap">
                      <button
                        onClick={() => toggleDesativado(ad.id)}
                        className={`flex-shrink-0 w-12 h-6 rounded-full transition-colors relative ${ativo ? 'bg-green-600' : 'bg-gray-600'}`}
                        title={ativo ? 'Clique para desativar' : 'Clique para ativar'}
                      >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${ativo ? 'right-1' : 'left-1'}`}></span>
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-sm ${ativo ? 'text-white' : 'text-gray-500'}`}>
                          {ad.emoji} {ad.nome}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-gray-500 text-xs">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={precoAtual}
                          onChange={e => handlePrecoChange(ad.id, e.target.value)}
                          className="w-24 bg-scooby-escuro border border-scooby-borda text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-scooby-amarelo text-right"
                        />
                      </div>
                      <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${ativo ? 'bg-green-900 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                        {ativo ? 'Disponível' : 'Indisponível'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Solicitar alteração */}
          <div className="bg-scooby-card border border-scooby-borda rounded-2xl p-6 space-y-4">
            <h3 className="text-scooby-amarelo font-bold text-base">Solicitar alteração ao desenvolvedor</h3>
            <p className="text-gray-400 text-sm">
              Para alterações estruturais (novos itens, categorias, alteração de nome, etc.), envie uma solicitação via WhatsApp.
            </p>
            <textarea
              value={solicitacaoTexto}
              onChange={e => setSolicitacaoTexto(e.target.value)}
              placeholder="Ex: Adicionar novo hamburguer 'Scooby Especial' por R$ 35,00 com pão brioche, bife artesanal, cheddar e bacon."
              rows={4}
              className="w-full bg-scooby-escuro border border-scooby-borda text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-scooby-amarelo resize-none"
            />
            <button
              onClick={enviarSolicitacao}
              disabled={!solicitacaoTexto.trim()}
              className="flex items-center gap-2 bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition"
            >
              <span>📲</span>
              Enviar via WhatsApp
            </button>
          </div>

        </div>
      )}

      {/* ── ABA COMBOS & CUPONS ── */}
      {abaAtiva === 'combos' && (
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

          {/* Cabeçalho com botão salvar fixo no topo */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-bold text-lg">🎉 Combos & Cupons</h2>
              <p className="text-gray-400 text-sm">Gerencie promoções, combos e cupons de desconto</p>
            </div>
            <div className="flex items-center gap-3">
              {msgCardapio && (
                <span className={`text-sm font-semibold px-3 py-1 rounded-xl ${msgCardapio.includes('sucesso') ? 'bg-green-800 text-green-300' : 'bg-red-900 text-red-300'}`}>
                  {msgCardapio}
                </span>
              )}
              <button
                onClick={salvarCardapio}
                disabled={salvandoCardapio}
                className="bg-scooby-vermelho hover:bg-red-700 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition"
              >
                {salvandoCardapio ? 'Salvando...' : '💾 Salvar'}
              </button>
            </div>
          </div>

          {/* Promoções do Dia */}
          <div className="bg-scooby-card border border-scooby-borda rounded-2xl overflow-hidden">
            <div className="bg-scooby-borda px-5 py-3 flex items-center justify-between">
              <h3 className="text-scooby-amarelo font-bold text-sm">🎉 Promoções / Combos do Dia</h3>
              <button
                onClick={() => setPromocoesEditadas(prev => [{
                  id: Date.now().toString(36),
                  nome: '',
                  itens: [{ quantidade: 1, itemId: todosItensFlat[0]?.id || '', label: todosItensFlat[0]?.nome || '' }],
                  adicionais: [],
                  precoCombo: '',
                  descricao: '',
                  ativo: true
                }, ...prev])}
                className="bg-scooby-vermelho hover:bg-red-700 text-white text-xs font-bold px-3 py-1 rounded-lg transition"
              >+ Novo combo</button>
            </div>
            <div className="p-5 space-y-4">
              {promocoesEditadas.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-2">Nenhum combo cadastrado.</p>
              )}
              {promocoesEditadas.map((promo, idx) => (
                <div key={promo.id} className="bg-scooby-escuro border border-scooby-borda rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setPromocoesEditadas(prev => prev.map((p, i) => i === idx ? { ...p, ativo: !p.ativo } : p))}
                      className={`flex-shrink-0 w-12 h-6 rounded-full transition-colors relative ${promo.ativo ? 'bg-green-600' : 'bg-gray-600'}`}
                    >
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${promo.ativo ? 'right-1' : 'left-1'}`}></span>
                    </button>
                    <span className={`text-xs font-semibold flex-shrink-0 ${promo.ativo ? 'text-green-400' : 'text-gray-500'}`}>
                      {promo.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                    <input
                      type="text"
                      placeholder="Nome do combo (ex: Combo do Dia)"
                      value={promo.nome}
                      onChange={e => setPromocoesEditadas(prev => prev.map((p, i) => i === idx ? { ...p, nome: e.target.value } : p))}
                      className="flex-1 bg-scooby-card border border-scooby-borda text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-scooby-amarelo"
                    />
                    <button
                      onClick={() => setPromocoesEditadas(prev => prev.filter((_, i) => i !== idx))}
                      className="text-gray-500 hover:text-red-400 text-xl leading-none transition flex-shrink-0"
                    >×</button>
                  </div>
                  <div className="space-y-2">
                    <label className="text-gray-400 text-xs block">Itens inclusos no combo:</label>
                    {promo.itens.map((itemCombo, itemIdx) => (
                      <div key={itemIdx} className="flex items-center gap-2">
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => setPromocoesEditadas(prev => prev.map((p, i) => i === idx ? { ...p, itens: p.itens.map((it, ii) => ii === itemIdx ? { ...it, quantidade: Math.max(1, it.quantidade - 1) } : it) } : p))}
                            className="w-7 h-7 rounded-full bg-scooby-borda hover:bg-red-800 text-white font-bold flex items-center justify-center text-sm transition"
                          >−</button>
                          <span className="text-white font-bold w-6 text-center text-sm">{itemCombo.quantidade}</span>
                          <button
                            onClick={() => setPromocoesEditadas(prev => prev.map((p, i) => i === idx ? { ...p, itens: p.itens.map((it, ii) => ii === itemIdx ? { ...it, quantidade: it.quantidade + 1 } : it) } : p))}
                            className="w-7 h-7 rounded-full bg-scooby-vermelho hover:bg-red-700 text-white font-bold flex items-center justify-center text-sm transition"
                          >+</button>
                        </div>
                        <span className="text-gray-500 text-sm flex-shrink-0">×</span>
                        <select
                          value={itemCombo.itemId}
                          onChange={e => {
                            const selected = todosItensFlat.find(it => String(it.id) === e.target.value)
                            setPromocoesEditadas(prev => prev.map((p, i) => i === idx ? { ...p, itens: p.itens.map((it, ii) => ii === itemIdx ? { ...it, itemId: selected?.id || e.target.value, label: selected?.nome || '' } : it) } : p))
                          }}
                          className="flex-1 min-w-0 bg-scooby-card border border-scooby-borda text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-scooby-amarelo"
                        >
                          {categorias.map(cat => (
                            <optgroup key={cat.id} label={cat.nome}>
                              {cat.itens.map(item => (
                                <option key={item.id} value={item.id}>{item.nome}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        {promo.itens.length > 1 && (
                          <button
                            onClick={() => setPromocoesEditadas(prev => prev.map((p, i) => i === idx ? { ...p, itens: p.itens.filter((_, ii) => ii !== itemIdx) } : p))}
                            className="text-gray-600 hover:text-red-400 text-lg leading-none transition flex-shrink-0"
                          >×</button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => setPromocoesEditadas(prev => prev.map((p, i) => i === idx ? { ...p, itens: [...p.itens, { quantidade: 1, itemId: todosItensFlat[0]?.id || '', label: todosItensFlat[0]?.nome || '' }] } : p))}
                      className="text-scooby-amarelo hover:text-yellow-300 text-xs font-semibold transition"
                    >+ Adicionar item ao combo</button>
                  </div>
                  <div className="space-y-2">
                    <label className="text-gray-400 text-xs block">Adicionais opcionais (ex: Catupiry, Bacon extra):</label>
                    {(promo.adicionais || []).map((ad, adIdx) => (
                      <div key={adIdx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Nome do adicional (ex: Catupiry)"
                          value={ad.nome}
                          onChange={e => setPromocoesEditadas(prev => prev.map((p, i) => i === idx ? { ...p, adicionais: p.adicionais.map((a, ai) => ai === adIdx ? { ...a, nome: e.target.value } : a) } : p))}
                          className="flex-1 bg-scooby-card border border-scooby-borda text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-scooby-amarelo"
                        />
                        <span className="text-gray-500 text-xs flex-shrink-0">+R$</span>
                        <input
                          type="number" step="0.01" min="0"
                          placeholder="0,00"
                          value={ad.preco}
                          onChange={e => setPromocoesEditadas(prev => prev.map((p, i) => i === idx ? { ...p, adicionais: p.adicionais.map((a, ai) => ai === adIdx ? { ...a, preco: e.target.value } : a) } : p))}
                          className="w-24 bg-scooby-card border border-scooby-borda text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-scooby-amarelo text-right"
                        />
                        <button
                          onClick={() => setPromocoesEditadas(prev => prev.map((p, i) => i === idx ? { ...p, adicionais: p.adicionais.filter((_, ai) => ai !== adIdx) } : p))}
                          className="text-gray-600 hover:text-red-400 text-lg leading-none transition flex-shrink-0"
                        >×</button>
                      </div>
                    ))}
                    <button
                      onClick={() => setPromocoesEditadas(prev => prev.map((p, i) => i === idx ? { ...p, adicionais: [...(p.adicionais || []), { nome: '', preco: '' }] } : p))}
                      className="text-blue-400 hover:text-blue-300 text-xs font-semibold transition"
                    >+ Adicional (ex: Catupiry)</button>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-40 flex-shrink-0">
                      <label className="text-gray-400 text-xs mb-1 block">Preço do combo (R$)</label>
                      <input
                        type="number" step="0.01" min="0"
                        placeholder="Ex: 45.00"
                        value={promo.precoCombo}
                        onChange={e => setPromocoesEditadas(prev => prev.map((p, i) => i === idx ? { ...p, precoCombo: e.target.value } : p))}
                        className="w-full bg-scooby-card border border-scooby-borda text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-scooby-amarelo"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-gray-400 text-xs mb-1 block">Descrição extra (opcional)</label>
                      <input
                        type="text"
                        placeholder="Ex: Válido apenas hoje!"
                        value={promo.descricao}
                        onChange={e => setPromocoesEditadas(prev => prev.map((p, i) => i === idx ? { ...p, descricao: e.target.value } : p))}
                        className="w-full bg-scooby-card border border-scooby-borda text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-scooby-amarelo"
                      />
                    </div>
                  </div>
                  {promo.nome && promo.precoCombo && (
                    <div className="bg-scooby-card rounded-lg px-3 py-2 text-xs text-gray-400">
                      Preview: <span className="text-scooby-amarelo font-semibold">{promo.nome}</span> — {promo.itens.map(it => `${it.quantidade}x ${it.label || todosItensFlat.find(f => String(f.id) === String(it.itemId))?.nome || ''}`).join(' + ')}
                      {(promo.adicionais || []).filter(a => a.nome).length > 0 && (
                        <span className="text-orange-300"> + {promo.adicionais.filter(a => a.nome).map(a => `${a.nome}${a.preco ? ` (+R$ ${Number(a.preco).toFixed(2).replace('.', ',')})` : ''}`).join(', ')}</span>
                      )}
                      {' '}por <span className="text-green-400 font-bold">R$ {Number(promo.precoCombo).toFixed(2).replace('.', ',')}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Cupons de Desconto */}
          <div className="bg-scooby-card border border-scooby-borda rounded-2xl overflow-hidden">
            <div className="bg-scooby-borda px-5 py-3 flex items-center justify-between">
              <h3 className="text-scooby-amarelo font-bold text-sm">🎟 Cupons de Desconto</h3>
              <button
                onClick={() => setCuponsEditados(prev => [{ id: Date.now().toString(36), codigo: '', tipo: 'percentual', valor: '', ativo: true }, ...prev])}
                className="bg-scooby-vermelho hover:bg-red-700 text-white text-xs font-bold px-3 py-1 rounded-lg transition"
              >+ Novo cupom</button>
            </div>
            <div className="p-5 space-y-3">
              {cuponsEditados.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-2">Nenhum cupom cadastrado.</p>
              )}
              {cuponsEditados.map((cupom, idx) => (
                <div key={cupom.id} className="bg-scooby-escuro border border-scooby-borda rounded-xl p-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      onClick={() => setCuponsEditados(prev => prev.map((c, i) => i === idx ? { ...c, ativo: !c.ativo } : c))}
                      className={`flex-shrink-0 w-12 h-6 rounded-full transition-colors relative ${cupom.ativo ? 'bg-green-600' : 'bg-gray-600'}`}
                    >
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${cupom.ativo ? 'right-1' : 'left-1'}`}></span>
                    </button>
                    <input
                      type="text"
                      placeholder="Código (ex: SCOOBY10)"
                      value={cupom.codigo}
                      onChange={e => setCuponsEditados(prev => prev.map((c, i) => i === idx ? { ...c, codigo: e.target.value.toUpperCase() } : c))}
                      className="flex-1 min-w-0 bg-scooby-card border border-scooby-borda text-white rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:border-scooby-amarelo"
                    />
                    <select
                      value={cupom.tipo}
                      onChange={e => setCuponsEditados(prev => prev.map((c, i) => i === idx ? { ...c, tipo: e.target.value } : c))}
                      className="bg-scooby-card border border-scooby-borda text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-scooby-amarelo"
                    >
                      <option value="percentual">% desconto</option>
                      <option value="fixo">R$ fixo</option>
                    </select>
                    <input
                      type="number" step="0.01" min="0"
                      placeholder={cupom.tipo === 'percentual' ? 'Ex: 10' : 'Ex: 5.00'}
                      value={cupom.valor}
                      onChange={e => setCuponsEditados(prev => prev.map((c, i) => i === idx ? { ...c, valor: e.target.value } : c))}
                      className="w-24 bg-scooby-card border border-scooby-borda text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-scooby-amarelo text-right"
                    />
                    <span className="text-gray-500 text-sm">{cupom.tipo === 'percentual' ? '%' : 'R$'}</span>
                    <button
                      onClick={() => setCuponsEditados(prev => prev.filter((_, i) => i !== idx))}
                      className="text-gray-500 hover:text-red-400 text-lg leading-none transition"
                    >×</button>
                  </div>
                  <div className="mt-2 flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-xs">⏰ Válido até:</span>
                      <input
                        type="datetime-local"
                        value={cupom.validadeAte || ''}
                        onChange={e => setCuponsEditados(prev => prev.map((c, i) => i === idx ? { ...c, validadeAte: e.target.value } : c))}
                        className="bg-scooby-card border border-scooby-borda text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-scooby-amarelo"
                      />
                      {cupom.validadeAte && (
                        <button
                          onClick={() => setCuponsEditados(prev => prev.map((c, i) => i === idx ? { ...c, validadeAte: '' } : c))}
                          className="text-gray-600 hover:text-red-400 text-xs transition"
                        >remover</button>
                      )}
                    </div>
                  </div>
                  {cupom.codigo && (
                    <p className="text-gray-500 text-xs mt-1">
                      Clientes usam o código <span className="text-scooby-amarelo font-mono font-bold">{cupom.codigo}</span> para ganhar {cupom.tipo === 'percentual' ? `${cupom.valor}% de desconto` : `R$ ${Number(cupom.valor).toFixed(2)} de desconto`}
                      {cupom.validadeAte && <span className="text-orange-400"> · válido até {new Date(cupom.validadeAte).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}</span>}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Botão salvar inferior */}
          <div className="flex justify-end pb-4">
            <button
              onClick={salvarCardapio}
              disabled={salvandoCardapio}
              className="bg-scooby-vermelho hover:bg-red-700 disabled:opacity-50 text-white font-bold px-8 py-3 rounded-xl text-sm transition"
            >
              {salvandoCardapio ? 'Salvando...' : '💾 Salvar alterações'}
            </button>
          </div>

        </div>
      )}

      {/* ── ABA SEGURANÇA ── */}
      {/* ── ABA CONFIGURAÇÕES ── */}
      {abaAtiva === 'configuracoes' && (
        <div className="max-w-xl mx-auto px-4 py-6 space-y-6">

          {/* WhatsApp */}
          <div className="bg-scooby-card border border-scooby-borda rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-2xl">📱</span>
              <div>
                <h3 className="text-scooby-amarelo font-bold text-base">WhatsApp para pedidos</h3>
                <p className="text-gray-500 text-xs">Número que recebe os pedidos (com DDI+DDD)</p>
              </div>
            </div>
            <div>
              <label className="text-gray-300 text-sm font-medium block mb-1">Número do WhatsApp</label>
              <input
                type="tel"
                placeholder="5532999301657"
                value={whatsappEditado}
                onChange={e => setWhatsappEditado(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-scooby-escuro border border-scooby-borda text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-scooby-amarelo font-mono"
              />
              <p className="text-gray-500 text-xs mt-1">Somente números. Ex: 5532999301657</p>
            </div>
          </div>

          {/* Senha Garçom */}
          <div className="bg-scooby-card border border-scooby-borda rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-2xl">🍽️</span>
              <div>
                <h3 className="text-scooby-amarelo font-bold text-base">Senha do Garçom</h3>
                <p className="text-gray-500 text-xs">Senha para acessar a página /garcom</p>
              </div>
            </div>
            <div>
              <label className="text-gray-300 text-sm font-medium block mb-1">Senha</label>
              <input
                type="text"
                placeholder="garcom2024"
                value={senhaGarcomEditada}
                onChange={e => setSenhaGarcomEditada(e.target.value)}
                className="w-full bg-scooby-escuro border border-scooby-borda text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-scooby-amarelo font-mono"
              />
              <p className="text-gray-500 text-xs mt-1">Link do garçom: <span className="text-gray-300 font-mono">scoobydoolanches.com.br/garcom</span></p>
            </div>
          </div>

          {/* Pix */}
          <div className="bg-scooby-card border border-scooby-borda rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-2xl">💠</span>
              <div>
                <h3 className="text-scooby-amarelo font-bold text-base">Dados do Pix</h3>
                <p className="text-gray-500 text-xs">Exibidos para o cliente ao pagar via Pix</p>
              </div>
            </div>
            <div>
              <label className="text-gray-300 text-sm font-medium block mb-1">Chave Pix</label>
              <input
                type="text"
                placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                value={pixChaveEditada}
                onChange={e => setPixChaveEditada(e.target.value)}
                className="w-full bg-scooby-escuro border border-scooby-borda text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-scooby-amarelo"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-300 text-sm font-medium block mb-1">Tipo da chave</label>
                <select
                  value={pixTipoEditado}
                  onChange={e => setPixTipoEditado(e.target.value)}
                  className="w-full bg-scooby-escuro border border-scooby-borda text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-scooby-amarelo"
                >
                  <option>Telefone</option>
                  <option>CPF</option>
                  <option>CNPJ</option>
                  <option>E-mail</option>
                  <option>Chave aleatória</option>
                </select>
              </div>
              <div>
                <label className="text-gray-300 text-sm font-medium block mb-1">Nome do favorecido</label>
                <input
                  type="text"
                  placeholder="Nome no Pix"
                  value={pixNomeEditado}
                  onChange={e => setPixNomeEditado(e.target.value)}
                  className="w-full bg-scooby-escuro border border-scooby-borda text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-scooby-amarelo"
                />
              </div>
            </div>

            {/* Prévia */}
            {pixChaveEditada && (
              <div className="bg-scooby-escuro rounded-xl p-4">
                <p className="text-gray-500 text-xs mb-2">Prévia — como o cliente verá:</p>
                <p className="text-white font-mono text-sm">{pixChaveEditada}</p>
                <p className="text-gray-400 text-xs mt-0.5">{pixNomeEditado} · {pixTipoEditado}</p>
              </div>
            )}
          </div>

          {/* Horário + Entrega */}
          <div className="bg-scooby-card border border-scooby-borda rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-2xl">🕐</span>
              <div>
                <h3 className="text-scooby-amarelo font-bold text-base">Horário e entrega</h3>
                <p className="text-gray-500 text-xs">Esses valores aparecem para o cliente no site</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-300 text-sm font-medium block mb-1">Abertura</label>
                <input
                  type="time"
                  value={horarioAberturaEditado}
                  onChange={e => setHorarioAberturaEditado(e.target.value)}
                  className="w-full bg-scooby-escuro border border-scooby-borda text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-scooby-amarelo"
                />
              </div>
              <div>
                <label className="text-gray-300 text-sm font-medium block mb-1">Fechamento</label>
                <input
                  type="time"
                  value={horarioFechamentoEditado}
                  onChange={e => setHorarioFechamentoEditado(e.target.value)}
                  className="w-full bg-scooby-escuro border border-scooby-borda text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-scooby-amarelo"
                />
              </div>
            </div>
            <div>
              <label className="text-gray-300 text-sm font-medium block mb-2">Dias de funcionamento</label>
              <div className="flex gap-2 flex-wrap">
                {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((dia, i) => (
                  <button key={i}
                    onClick={() => setDiasFuncionamento(prev =>
                      prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i].sort((a,b) => a-b)
                    )}
                    className={`px-3 py-2 rounded-xl text-sm font-bold border transition ${
                      diasFuncionamento.includes(i)
                        ? 'bg-scooby-amarelo text-black border-scooby-amarelo'
                        : 'bg-scooby-escuro text-gray-500 border-scooby-borda hover:border-gray-400'
                    }`}
                  >{dia}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-300 text-sm font-medium block mb-1">Taxa de entrega (R$)</label>
                <input
                  type="number"
                  value={taxaEntregaEditada}
                  onChange={e => setTaxaEntregaEditada(e.target.value)}
                  className="w-full bg-scooby-escuro border border-scooby-borda text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-scooby-amarelo"
                  step="0.50" min="0"
                />
              </div>
              <div>
                <label className="text-gray-300 text-sm font-medium block mb-1">Tempo de entrega</label>
                <input
                  type="text"
                  placeholder="Ex: 40 a 60 min"
                  value={tempoEntregaEditado}
                  onChange={e => setTempoEntregaEditado(e.target.value)}
                  className="w-full bg-scooby-escuro border border-scooby-borda text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-scooby-amarelo"
                />
              </div>
            </div>
          </div>

          {/* Impressora */}
          <div className="bg-scooby-card border border-scooby-borda rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-2xl">🖨️</span>
              <div>
                <h3 className="text-scooby-amarelo font-bold text-base">Impressora térmica</h3>
                <p className="text-gray-500 text-xs">Configuração para impressão de cupons (PSO58 ou similar)</p>
              </div>
            </div>

            <div>
              <label className="text-gray-300 text-sm font-medium block mb-1">Nome da impressora</label>
              <input
                type="text"
                placeholder="Ex: PSO58, XP-58, POS-58"
                value={nomeImpressora}
                onChange={e => salvarNomeImpressora(e.target.value)}
                className="w-full bg-scooby-escuro border border-scooby-borda text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-scooby-amarelo font-mono"
              />
              <p className="text-gray-500 text-xs mt-1">
                Digite exatamente o nome que aparece no Windows (Painel de Controle → Dispositivos e Impressoras).
              </p>
            </div>

            <div className="flex items-center gap-3 p-3 bg-scooby-escuro rounded-xl border border-scooby-borda">
              {impressoraConectada ? (
                <button
                  onClick={desconectarImpressora}
                  className="px-4 py-2 bg-red-900/60 hover:bg-red-800/60 border border-red-700/50 text-red-300 text-sm font-semibold rounded-xl transition"
                >
                  🔌 Desconectar
                </button>
              ) : (
                <button
                  onClick={conectarImpressora}
                  disabled={conectando}
                  className="px-4 py-2 bg-green-900/60 hover:bg-green-800/60 border border-green-700/50 text-green-300 text-sm font-semibold rounded-xl transition disabled:opacity-50"
                >
                  {conectando ? '⏳ Conectando...' : '🔗 Conectar USB'}
                </button>
              )}
              <span className={`text-sm font-medium ${impressoraConectada ? 'text-green-400' : 'text-gray-500'}`}>
                {impressoraConectada ? '✅ Impressora conectada' : '⚫ Impressora desconectada'}
              </span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleImprimir({ numeroPedido: 'TESTE', data: new Date().toLocaleDateString('pt-BR'), hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), nomeCliente: 'Cliente Teste', telefone: '(32) 99999-9999', tipoEntrega: 'Entrega', endereco: 'Rua Exemplo, 123 — Centro', itensPedido: '1x X-Burguer R$25.00 | 1x Coca-Cola R$7.00', subtotal: '32.00', taxaEntrega: '5.00', desconto: '0.00', total: '37.00', pagamento: 'Pix', observacao: '' }, 'manual')}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold text-sm py-2.5 rounded-xl transition flex items-center justify-center gap-2"
              >
                🖨️ Imprimir cupom de teste
              </button>
              <button
                onClick={() => setMostrarGuiaImpressora(g => !g)}
                className="px-4 py-2.5 bg-blue-900/50 hover:bg-blue-800/50 border border-blue-700/50 text-blue-300 text-sm rounded-xl transition"
              >
                {mostrarGuiaImpressora ? 'Fechar guia' : '📖 Ver guia'}
              </button>
            </div>

            {mostrarGuiaImpressora && (
              <div className="bg-scooby-escuro rounded-xl p-4 space-y-3 text-sm">
                <p className="text-scooby-amarelo font-bold">Como configurar o QZ Tray para imprimir direto (1x por computador):</p>
                <ol className="space-y-2 text-gray-300 list-decimal list-inside">
                  <li>Baixe o QZ Tray em <span className="text-white font-mono bg-gray-800 px-1 rounded">qz.io/download</span> e instale normalmente (Next → Next → Install).</li>
                  <li>O QZ Tray vai aparecer na <span className="text-white font-semibold">bandeja do Windows</span> (barra de tarefas, canto inferior direito). Deixe rodando.</li>
                  <li>No Chrome, acesse <span className="text-white font-mono bg-gray-800 px-1 rounded">https://localhost:8181</span> e clique em <span className="text-white font-semibold">Avançado → Continuar</span> para aceitar o certificado local. Só precisa fazer isso uma vez.</li>
                  <li>Volte ao painel e clique em <span className="text-white font-semibold">🔗 Conectar QZ Tray</span> acima. Se pedir permissão, clique em <span className="text-white font-semibold">Permitir</span>.</li>
                  <li>Clique em <span className="text-white font-semibold">🖨️ Imprimir cupom de teste</span> para confirmar que está funcionando.</li>
                </ol>
                <div className="bg-green-900/30 border border-green-700/40 rounded-lg px-3 py-2 text-green-300 text-xs mt-2">
                  ✅ Após conectar uma vez, o QZ Tray inicia automático com o Windows. Basta abrir o painel e clicar em Conectar.
                </div>
                <div className="bg-yellow-900/30 border border-yellow-700/40 rounded-lg px-3 py-2 text-yellow-300 text-xs">
                  💡 O nome da impressora deve ser exatamente igual ao que aparece em <strong>Dispositivos e Impressoras</strong> no Windows (ex: ISD Tech 12).
                </div>
              </div>
            )}
          </div>

          {/* ── Segurança ── */}
          <div className="bg-scooby-card border border-scooby-borda rounded-2xl p-5 space-y-4">
            <h3 className="text-scooby-amarelo font-bold text-sm">🔒 Segurança</h3>

            <div className="space-y-1">
              <p className="text-gray-300 text-xs">✅ <strong>Honeypot</strong> — campo invisível que bloqueia bots automaticamente</p>
              <p className="text-gray-300 text-xs">✅ <strong>Rate limit</strong> — máx. 5 pedidos por número por hora</p>
              <p className="text-gray-300 text-xs">✅ <strong>Validação</strong> — pedidos incompletos ou com valor zerado são rejeitados</p>
            </div>

            <div>
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2">📵 Números bloqueados</p>
              {bloqueados.length === 0 && (
                <p className="text-gray-600 text-xs mb-2">Nenhum número bloqueado.</p>
              )}
              <div className="space-y-1 mb-3">
                {bloqueados.map(tel => (
                  <div key={tel} className="flex items-center justify-between bg-scooby-escuro rounded-lg px-3 py-2">
                    <span className="text-white text-sm font-mono">{tel}</span>
                    <button
                      onClick={() => desbloquearTelefone(tel)}
                      className="text-xs text-red-400 hover:text-red-300 font-semibold"
                    >
                      Desbloquear
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="tel"
                  placeholder="DDD + número (ex: 32999001234)"
                  value={novoBloquear}
                  onChange={e => setNovoBloquear(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && bloquearTelefone()}
                  className="flex-1 bg-scooby-escuro border border-scooby-borda text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-500 font-mono"
                />
                <button
                  onClick={bloquearTelefone}
                  className="px-4 py-2 bg-red-900/60 hover:bg-red-800/60 text-red-300 text-sm font-semibold rounded-xl transition"
                >
                  Bloquear
                </button>
              </div>
              <p className="text-gray-600 text-xs mt-1">Digite apenas números. O bloqueio impede novos pedidos desse número.</p>
            </div>
          </div>

          {msgConfig && (
            <p className={`text-sm font-semibold px-4 py-3 rounded-xl ${msgConfig.includes('✅') ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
              {msgConfig}
            </p>
          )}

          <button
            onClick={salvarConfiguracoes}
            disabled={salvandoConfig}
            className="w-full bg-scooby-amarelo hover:bg-yellow-400 disabled:opacity-50 text-black font-bold py-3 rounded-xl transition"
          >
            {salvandoConfig ? 'Salvando...' : '💾 Salvar configurações'}
          </button>

          <div className="bg-blue-900/30 border border-blue-700/40 rounded-xl px-4 py-3 text-blue-300 text-xs">
            ℹ️ As configurações de WhatsApp e Pix são salvas no banco de dados e entram em vigor imediatamente no site.
          </div>
        </div>
      )}

      {abaAtiva === 'seguranca' && (
        <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

          {/* Acesso Master */}
          <div className="bg-scooby-card border border-purple-800 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">👑</span>
              <div>
                <h3 className="text-purple-300 font-bold text-base">👑 Acesso Master — Gustavo</h3>
                <p className="text-gray-500 text-xs">Senha master gerenciada pelo desenvolvedor. Acesso completo + deploy.</p>
              </div>
            </div>
            <div className="bg-scooby-escuro rounded-xl px-4 py-3 text-sm text-gray-400">
              A senha master é gerenciada diretamente pelo desenvolvedor e não pode ser alterada por aqui.
              Em caso de necessidade, entre em contato com o desenvolvedor.
            </div>
          </div>

          {/* Alterar senha do cliente */}
          <div className="bg-scooby-card border border-scooby-borda rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-2xl">🔑</span>
              <div>
                <h3 className="text-scooby-amarelo font-bold text-base">🔑 Alterar Senha do Julio</h3>
                <p className="text-gray-500 text-xs">Senha de acesso do usuário Julio ao painel</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-gray-300 text-sm font-medium block mb-1">Senha atual</label>
                <input
                  type="password"
                  placeholder="Digite a senha atual"
                  value={senhaAtualInput}
                  onChange={e => setSenhaAtualInput(e.target.value)}
                  className="w-full bg-scooby-escuro border border-scooby-borda text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-scooby-amarelo"
                />
              </div>
              <div>
                <label className="text-gray-300 text-sm font-medium block mb-1">Nova senha</label>
                <input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={novaSenhaInput}
                  onChange={e => setNovaSenhaInput(e.target.value)}
                  className="w-full bg-scooby-escuro border border-scooby-borda text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-scooby-amarelo"
                />
              </div>
              <div>
                <label className="text-gray-300 text-sm font-medium block mb-1">Confirmar nova senha</label>
                <input
                  type="password"
                  placeholder="Digite a nova senha novamente"
                  value={confirmarSenhaInput}
                  onChange={e => setConfirmarSenhaInput(e.target.value)}
                  className="w-full bg-scooby-escuro border border-scooby-borda text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-scooby-amarelo"
                />
              </div>

              {msgSenha && (
                <p className={`text-sm font-semibold px-3 py-2 rounded-xl ${msgSenha.includes('✅') ? 'bg-green-800 text-green-300' : 'bg-red-900 text-red-300'}`}>
                  {msgSenha}
                </p>
              )}

              <button
                onClick={salvarNovaSenha}
                disabled={salvandoSenha}
                className="w-full bg-scooby-vermelho hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition"
              >
                {salvandoSenha ? 'Salvando...' : '🔒 Salvar nova senha'}
              </button>
            </div>
          </div>

          <div className="bg-yellow-900/30 border border-yellow-700/40 rounded-xl px-4 py-3 text-yellow-300 text-xs">
            ⚠️ Guarde sua senha em local seguro. Caso esqueça, o desenvolvedor pode resetá-la.
          </div>

        </div>
      )}

      {/* ── ABA CAIXA ── */}
      {abaAtiva === 'caixa' && (() => {
        const pedidosDia = pedidos.filter(p => !caixaData || p.data === caixaData)

        function soma(lista) { return lista.reduce((s, p) => s + parseFloat(p.total || 0), 0) }

        const totalGeral  = soma(pedidosDia)
        const totalPix    = soma(pedidosDia.filter(p => p.pagamento === 'Pix'))
        const totalDin    = soma(pedidosDia.filter(p => p.pagamento === 'Dinheiro'))
        const totalDeb    = soma(pedidosDia.filter(p => p.pagamento === 'Cartão de Débito'))
        const totalCred   = soma(pedidosDia.filter(p => p.pagamento === 'Cartão de Crédito'))
        const totalBalcao = soma(pedidosDia.filter(p => p.pagamento === 'Balcão'))
        const totalMaquininha = totalDeb + totalCred

        const countPix    = pedidosDia.filter(p => p.pagamento === 'Pix').length
        const countDin    = pedidosDia.filter(p => p.pagamento === 'Dinheiro').length
        const countDeb    = pedidosDia.filter(p => p.pagamento === 'Cartão de Débito').length
        const countCred   = pedidosDia.filter(p => p.pagamento === 'Cartão de Crédito').length
        const countBalcao = pedidosDia.filter(p => p.pagamento === 'Balcão').length
        const countGarcom = pedidosDia.filter(p => p.origem === 'garcom').length
        const countMesa   = pedidosDia.filter(p => p.mesa).length

        const saldoIni   = parseFloat(String(caixaSaldoInicial).replace(',', '.')) || 0
        const valorFis   = parseFloat(String(caixaValorFisico).replace(',', '.')) || 0
        const dinEsperado = saldoIni + totalDin + totalBalcao
        const diferenca  = valorFis - dinEsperado
        const temFisico  = caixaValorFisico !== ''

        const ticketMedio = pedidosDia.length > 0 ? totalGeral / pedidosDia.length : 0

        function fmt(v) { return `R$ ${v.toFixed(2).replace('.', ',')}` }
        function pct(v) { return totalGeral > 0 ? `${((v / totalGeral) * 100).toFixed(0)}%` : '—' }

        function imprimirFechamento() {
          const linhas = [
            `FECHAMENTO DE CAIXA — ${caixaData}`,
            `${'─'.repeat(38)}`,
            ``,
            `RESUMO DE VENDAS`,
            `Total de pedidos: ${pedidosDia.length}`,
            `Ticket médio:     ${fmt(ticketMedio)}`,
            `TOTAL GERAL:      ${fmt(totalGeral)}`,
            ``,
            `FORMAS DE PAGAMENTO`,
            `Pix:              ${fmt(totalPix)} (${countPix} pedidos)`,
            `Dinheiro:         ${fmt(totalDin)} (${countDin} pedidos)`,
            `Balcão (mesa):    ${fmt(totalBalcao)} (${countBalcao} pedidos)`,
            `Cartão Débito:    ${fmt(totalDeb)} (${countDeb} pedidos)`,
            `Cartão Crédito:   ${fmt(totalCred)} (${countCred} pedidos)`,
            `Maquininha total: ${fmt(totalMaquininha)}`,
            ``,
            `CONFERÊNCIA DO CAIXA FÍSICO`,
            `Saldo inicial:    ${fmt(saldoIni)}`,
            `+ Dinheiro/Balcão:${fmt(totalDin + totalBalcao)}`,
            `= Esperado:       ${fmt(dinEsperado)}`,
            `Valor físico:     ${fmt(valorFis)}`,
            `DIFERENÇA:        ${fmt(diferenca)} ${diferenca >= 0 ? '(sobra)' : '(FALTA)'}`,
            ``,
            `PEDIDOS DETALHADOS`,
            `${'─'.repeat(38)}`,
            ...pedidosDia.map(p =>
              `${p.hora || '?'}  #${(p.numeroPedido || p.id).toString().split('-').pop().padStart(3,'0')}  ${(p.nomeCliente || '').substring(0,14).padEnd(14)}  ${(p.pagamento || '').substring(0,6).padEnd(6)}  ${fmt(parseFloat(p.total||0))}`
            ),
          ]
          const win = window.open('', '_blank', 'width=600,height=800')
          win.document.write(`<pre style="font-family:monospace;font-size:13px;padding:20px;background:#fff;color:#000">${linhas.join('\n')}</pre>`)
          win.document.close()
          win.print()
        }

        return (
          <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

            {/* Cabeçalho + seletor de data */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-white font-black text-xl">💰 Dashboard Financeiro</h2>
                <p className="text-gray-400 text-sm mt-0.5">Fechamento de caixa e fluxo de pagamentos</p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-gray-400 text-xs">Data:</label>
                <input type="text" placeholder="dd/mm/aaaa" value={caixaData}
                  onChange={e => setCaixaData(e.target.value)}
                  className="bg-scooby-escuro border border-scooby-borda text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-scooby-amarelo w-32" />
                <button onClick={() => setCaixaData(hoje())}
                  className="text-xs px-3 py-2 bg-scooby-borda hover:bg-scooby-vermelho text-white rounded-xl transition">Hoje</button>
                <button onClick={() => setCaixaData(ontem())}
                  className="text-xs px-3 py-2 bg-scooby-borda hover:bg-gray-600 text-white rounded-xl transition">Ontem</button>
              </div>
            </div>

            {pedidosDia.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <p className="text-4xl mb-3">📊</p>
                <p>Nenhum pedido em {caixaData || 'esta data'}</p>
              </div>
            ) : (
              <>
                {/* Cards de resumo */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {/* Total geral */}
                  <div className="col-span-2 sm:col-span-3 lg:col-span-4 bg-gradient-to-r from-yellow-900/50 to-scooby-card border-2 border-scooby-amarelo rounded-2xl px-5 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-gray-300 text-sm font-semibold">TOTAL GERAL DO DIA</p>
                      <p className="text-scooby-amarelo font-black text-3xl mt-0.5">{fmt(totalGeral)}</p>
                      <p className="text-gray-400 text-xs mt-1">{pedidosDia.length} pedidos · ticket médio {fmt(ticketMedio)}</p>
                    </div>
                    <div className="text-right text-xs text-gray-400 space-y-0.5">
                      {countGarcom > 0 && <p>🍽️ {countGarcom} via garçom</p>}
                      {countMesa > 0 && <p>🪑 {countMesa} de mesa</p>}
                      <p>🛵 {pedidosDia.filter(p => p.tipoEntrega === 'Entrega').length} entregas</p>
                      <p>🏠 {pedidosDia.filter(p => p.tipoEntrega === 'Retirada').length} retiradas</p>
                    </div>
                  </div>

                  {/* Cards clicáveis por forma de pagamento */}
                  {[
                    { key: 'Pix',               label: '📲 Pix',        cor: 'border-blue-700/60 text-blue-400',   bg: 'bg-blue-900/20',   total: totalPix,    count: countPix },
                    { key: 'Dinheiro',           label: '💵 Dinheiro',   cor: 'border-green-700/60 text-green-400', bg: 'bg-green-900/20',  total: totalDin,    count: countDin },
                    { key: 'Cartão de Débito',   label: '💳 Débito',     cor: 'border-purple-700/60 text-purple-400',bg:'bg-purple-900/20', total: totalDeb,    count: countDeb },
                    { key: 'Cartão de Crédito',  label: '💳 Crédito',    cor: 'border-pink-700/60 text-pink-400',   bg: 'bg-pink-900/20',   total: totalCred,   count: countCred },
                    ...(totalBalcao > 0 ? [{ key: 'Balcão', label: '🍽️ Balcão', cor: 'border-amber-700/60 text-amber-400', bg: 'bg-amber-900/20', total: totalBalcao, count: countBalcao }] : []),
                  ].map(c => {
                    const ativo = caixaDetalhe === c.key
                    return (
                      <button key={c.key}
                        onClick={() => setCaixaDetalhe(ativo ? null : c.key)}
                        className={`text-left rounded-2xl px-4 py-3 border-2 transition active:scale-95 ${ativo ? c.bg + ' ' + c.cor.split(' ')[0].replace('/60','') : 'bg-scooby-card ' + c.cor.split(' ')[0]} ${ativo ? 'ring-2 ring-offset-1 ring-offset-scooby-escuro ' + c.cor.split(' ')[1].replace('text-','ring-') : ''}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-bold uppercase tracking-wide ${c.cor.split(' ')[1]}`}>{c.label}</span>
                          <span className="text-gray-500 text-xs bg-scooby-escuro px-1.5 py-0.5 rounded-full">{c.count} ped.</span>
                        </div>
                        <p className="text-white font-black text-xl">{fmt(c.total)}</p>
                        <p className={`text-xs mt-0.5 flex items-center gap-1 ${c.cor.split(' ')[1]} opacity-60`}>
                          {pct(c.total)} do total {ativo ? '▲ fechar' : '▼ ver pedidos'}
                        </p>
                      </button>
                    )
                  })}

                  {/* Maquininha total (não clicável, é soma) */}
                  {totalMaquininha > 0 && (
                    <div className="bg-scooby-card border border-scooby-borda rounded-2xl px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-300 text-xs font-bold uppercase tracking-wide">🏧 Maquininha</span>
                      </div>
                      <p className="text-white font-black text-xl">{fmt(totalMaquininha)}</p>
                      <p className="text-gray-500 text-xs mt-0.5">Déb + Créd</p>
                    </div>
                  )}

                  {/* Painel de detalhe — ocupa a linha toda */}
                  {caixaDetalhe && (() => {
                    const pedidosFiltro = pedidosDia.filter(p => p.pagamento === caixaDetalhe)
                    const totalFiltro = pedidosFiltro.reduce((s, p) => s + parseFloat(p.total || 0), 0)
                    const cores = {
                      'Pix': 'border-blue-600 bg-blue-900/20',
                      'Dinheiro': 'border-green-600 bg-green-900/20',
                      'Cartão de Débito': 'border-purple-600 bg-purple-900/20',
                      'Cartão de Crédito': 'border-pink-600 bg-pink-900/20',
                      'Balcão': 'border-amber-600 bg-amber-900/20',
                    }[caixaDetalhe] || 'border-scooby-borda bg-scooby-escuro'
                    return (
                      <div className={`col-span-2 sm:col-span-3 lg:col-span-4 border-2 rounded-2xl overflow-hidden ${cores}`}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                          <p className="text-white font-bold text-sm">
                            Pedidos em {caixaDetalhe} — {pedidosFiltro.length} pedido{pedidosFiltro.length !== 1 ? 's' : ''}
                          </p>
                          <div className="flex items-center gap-3">
                            <span className="text-scooby-amarelo font-black">{fmt(totalFiltro)}</span>
                            <button onClick={() => setCaixaDetalhe(null)} className="text-gray-400 hover:text-white text-lg leading-none">✕</button>
                          </div>
                        </div>
                        {pedidosFiltro.length === 0 ? (
                          <p className="text-gray-500 text-sm px-4 py-4">Nenhum pedido</p>
                        ) : (
                          <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
                            {pedidosFiltro.map((p, i) => (
                              <div key={p.id || i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition text-sm">
                                <span className="text-scooby-amarelo text-xs font-semibold w-10 flex-shrink-0">{p.hora || '—'}</span>
                                <span className="text-gray-500 text-xs flex-shrink-0">#{(p.numeroPedido || p.id).toString().split('-').pop()}</span>
                                <span className="text-white font-semibold flex-1 min-w-0 truncate">{p.nomeCliente}</span>
                                <span className="text-gray-400 text-xs flex-1 min-w-0 truncate hidden sm:block">{p.itensPedido?.replace(/ \| /g, ' · ')}</span>
                                {p.troco && <span className="text-gray-500 text-xs flex-shrink-0">troco p/ {p.troco}</span>}
                                {p.origem === 'garcom' && p.mesa && <span className="text-xs bg-blue-900/60 text-blue-300 px-1.5 py-0.5 rounded-full flex-shrink-0">🍽️ {p.mesa}</span>}
                                <span className="text-scooby-amarelo font-black flex-shrink-0">R$ {p.total}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>

                {/* Barra visual de distribuição */}
                <div className="bg-scooby-card border border-scooby-borda rounded-2xl px-5 py-4">
                  <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-3">Distribuição por forma de pagamento</p>
                  <div className="flex rounded-full overflow-hidden h-4 mb-3">
                    {totalPix > 0 && <div title={`Pix: ${pct(totalPix)}`} style={{ width: pct(totalPix) }} className="bg-blue-500 transition-all" />}
                    {totalDin > 0 && <div title={`Dinheiro: ${pct(totalDin)}`} style={{ width: pct(totalDin) }} className="bg-green-500 transition-all" />}
                    {totalDeb > 0 && <div title={`Débito: ${pct(totalDeb)}`} style={{ width: pct(totalDeb) }} className="bg-purple-500 transition-all" />}
                    {totalCred > 0 && <div title={`Crédito: ${pct(totalCred)}`} style={{ width: pct(totalCred) }} className="bg-pink-500 transition-all" />}
                    {totalBalcao > 0 && <div title={`Balcão: ${pct(totalBalcao)}`} style={{ width: pct(totalBalcao) }} className="bg-amber-500 transition-all" />}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs">
                    {totalPix > 0     && <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span>Pix {pct(totalPix)}</span>}
                    {totalDin > 0     && <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span>Dinheiro {pct(totalDin)}</span>}
                    {totalDeb > 0     && <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-purple-500 inline-block"></span>Débito {pct(totalDeb)}</span>}
                    {totalCred > 0    && <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-pink-500 inline-block"></span>Crédito {pct(totalCred)}</span>}
                    {totalBalcao > 0  && <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>Balcão {pct(totalBalcao)}</span>}
                  </div>
                </div>

                {/* Conferência do caixa físico */}
                <div className="bg-scooby-card border border-scooby-borda rounded-2xl px-5 py-5 space-y-4">
                  <p className="text-white font-bold text-base">🏦 Conferência do Caixa Físico</p>
                  <p className="text-gray-400 text-xs -mt-2">Registre quanto tinha no início do dia e quanto tem fisicamente agora</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-400 text-xs font-semibold uppercase tracking-wide block mb-1.5">
                        💵 Saldo inicial do caixa
                      </label>
                      <input type="text" placeholder="0,00" value={caixaSaldoInicial}
                        onChange={e => { setCaixaSaldoInicial(e.target.value); localStorage.setItem('scooby_saldo_inicial', e.target.value) }}
                        className="w-full bg-scooby-escuro border border-scooby-borda focus:border-scooby-amarelo text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition" />
                      <p className="text-gray-500 text-xs mt-1">Quanto tinha no caixa ao abrir</p>
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs font-semibold uppercase tracking-wide block mb-1.5">
                        💵 Valor físico atual no caixa
                      </label>
                      <input type="text" placeholder="0,00" value={caixaValorFisico}
                        onChange={e => { setCaixaValorFisico(e.target.value); localStorage.setItem('scooby_valor_fisico', e.target.value) }}
                        className="w-full bg-scooby-escuro border border-scooby-borda focus:border-scooby-amarelo text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition" />
                      <p className="text-gray-500 text-xs mt-1">Conte o dinheiro físico agora</p>
                    </div>
                  </div>

                  {/* Resumo do fechamento */}
                  <div className="bg-scooby-escuro rounded-xl px-4 py-4 space-y-2 text-sm">
                    <div className="flex justify-between text-gray-400">
                      <span>Saldo inicial</span>
                      <span>{fmt(saldoIni)}</span>
                    </div>
                    <div className="flex justify-between text-green-400">
                      <span>+ Dinheiro recebido</span>
                      <span>+ {fmt(totalDin)}</span>
                    </div>
                    {totalBalcao > 0 && (
                      <div className="flex justify-between text-amber-400">
                        <span>+ Balcão (mesas)</span>
                        <span>+ {fmt(totalBalcao)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-white font-semibold border-t border-scooby-borda pt-2">
                      <span>= Esperado no caixa</span>
                      <span>{fmt(dinEsperado)}</span>
                    </div>
                    {temFisico && (
                      <>
                        <div className="flex justify-between text-gray-300">
                          <span>Contagem física</span>
                          <span>{fmt(valorFis)}</span>
                        </div>
                        <div className={`flex justify-between font-black text-base border-t border-scooby-borda pt-2 ${
                          Math.abs(diferenca) < 0.01 ? 'text-green-400' : diferenca > 0 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          <span>
                            {Math.abs(diferenca) < 0.01 ? '✅ Caixa fechado!' : diferenca > 0 ? '⬆️ Sobra' : '⬇️ Falta'}
                          </span>
                          <span>
                            {Math.abs(diferenca) < 0.01 ? 'Confere' : `${diferenca > 0 ? '+' : ''}${fmt(diferenca)}`}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Separação das saídas para banco */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center text-sm">
                    <div className="bg-scooby-escuro rounded-xl p-3">
                      <p className="text-gray-400 text-xs mb-1">📲 Pix (digital)</p>
                      <p className="text-blue-400 font-black text-lg">{fmt(totalPix)}</p>
                      <p className="text-gray-600 text-xs">já na conta</p>
                    </div>
                    <div className="bg-scooby-escuro rounded-xl p-3">
                      <p className="text-gray-400 text-xs mb-1">🏧 Maquininha</p>
                      <p className="text-purple-400 font-black text-lg">{fmt(totalMaquininha)}</p>
                      <p className="text-gray-600 text-xs">débito + crédito</p>
                    </div>
                    <div className="bg-scooby-escuro rounded-xl p-3">
                      <p className="text-gray-400 text-xs mb-1">💵 No caixa físico</p>
                      <p className="text-green-400 font-black text-lg">{fmt(totalDin + totalBalcao)}</p>
                      <p className="text-gray-600 text-xs">dinheiro + balcão</p>
                    </div>
                  </div>
                </div>

                {/* Lista detalhada de pedidos */}
                <div className="bg-scooby-card border border-scooby-borda rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-scooby-borda flex items-center justify-between flex-wrap gap-3">
                    <p className="text-white font-bold">📋 Pedidos detalhados — {caixaData}</p>
                    <button onClick={imprimirFechamento}
                      className="flex items-center gap-2 bg-scooby-vermelho hover:bg-red-700 text-white font-bold text-sm px-4 py-2 rounded-xl transition">
                      🖨️ Imprimir / Exportar fechamento
                    </button>
                  </div>

                  {/* Cabeçalho tabela */}
                  <div className="hidden sm:grid grid-cols-[60px_1fr_1fr_100px_90px_90px] gap-2 px-4 py-2 bg-scooby-escuro text-gray-500 text-xs font-semibold uppercase tracking-wide">
                    <span>Hora</span>
                    <span>Cliente</span>
                    <span>Itens</span>
                    <span>Pagamento</span>
                    <span className="text-right">Total</span>
                    <span className="text-right">Origem</span>
                  </div>

                  <div className="divide-y divide-scooby-borda/50 max-h-96 overflow-y-auto">
                    {pedidosDia.map((p, i) => {
                      const corPag = {
                        'Pix': 'text-blue-400',
                        'Dinheiro': 'text-green-400',
                        'Cartão de Débito': 'text-purple-400',
                        'Cartão de Crédito': 'text-pink-400',
                        'Balcão': 'text-amber-400',
                      }[p.pagamento] || 'text-gray-400'

                      return (
                        <div key={p.id || i}
                          className="grid grid-cols-1 sm:grid-cols-[60px_1fr_1fr_100px_90px_90px] gap-1 sm:gap-2 px-4 py-3 hover:bg-scooby-borda/20 transition text-sm">
                          <span className="text-scooby-amarelo font-semibold text-xs">{p.hora || '—'}</span>
                          <div className="min-w-0">
                            <p className="text-white font-semibold truncate">{p.nomeCliente}</p>
                            <p className="text-gray-600 text-xs sm:hidden">#{(p.numeroPedido || p.id).toString().split('-').pop()}</p>
                          </div>
                          <p className="text-gray-400 text-xs truncate">{p.itensPedido?.replace(/ \| /g, ' · ')}</p>
                          <div>
                            <span className={`text-xs font-bold ${corPag}`}>{p.pagamento}</span>
                            {p.troco && <p className="text-gray-500 text-xs">troco p/ {p.troco}</p>}
                          </div>
                          <p className="text-scooby-amarelo font-black text-right">R$ {p.total}</p>
                          <div className="text-right">
                            {p.origem === 'garcom' && p.mesa
                              ? <span className="text-xs bg-blue-900/60 text-blue-300 px-1.5 py-0.5 rounded-full">🍽️ Mesa {p.mesa}</span>
                              : p.origem === 'garcom'
                              ? <span className="text-xs bg-amber-900/60 text-amber-300 px-1.5 py-0.5 rounded-full">👨‍🍳 Garçom</span>
                              : <span className="text-xs bg-scooby-escuro text-gray-500 px-1.5 py-0.5 rounded-full">🌐 Site</span>
                            }
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Rodapé com total */}
                  <div className="px-4 py-3 bg-scooby-escuro border-t border-scooby-borda flex justify-between items-center">
                    <span className="text-gray-400 text-sm">{pedidosDia.length} pedidos</span>
                    <span className="text-scooby-amarelo font-black text-lg">{fmt(totalGeral)}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )
      })()}
    </div>
  )
}
