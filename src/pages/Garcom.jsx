import { useState, useEffect } from 'react'
import { categorias, ADICIONAIS } from '../data/cardapio'

const ESTADO_KEY    = 'garcom_estado'
const PENDENTES_KEY = 'garcom_pendentes'
const CARRINHO_KEY  = 'garcom_carrinho'

function salvarEstado(e) {
  try { localStorage.setItem(ESTADO_KEY, JSON.stringify(e)) } catch {}
}
function carregarEstadoSalvo() {
  try { const s = localStorage.getItem(ESTADO_KEY); return s ? JSON.parse(s) : null } catch { return null }
}
function salvarPendentes(l) {
  try { localStorage.setItem(PENDENTES_KEY, JSON.stringify(l)) } catch {}
}
function carregarPendentes() {
  try { const s = localStorage.getItem(PENDENTES_KEY); return s ? JSON.parse(s) : [] } catch { return [] }
}

// ── Banner offline ─────────────────────────────────────────────
function BannerOffline({ pendentes }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-red-700 text-white text-xs font-bold text-center py-2 px-3 flex items-center justify-center gap-2">
      <span>📵</span> Sem internet — pedidos serão enviados ao reconectar
      {pendentes > 0 && <span className="bg-white text-red-700 px-2 py-0.5 rounded-full font-black">{pendentes} na fila</span>}
    </div>
  )
}

// ── Header padrão ─────────────────────────────────────────────
function Header({ titulo, onVoltar, direita }) {
  return (
    <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3.5 border-b border-[#222] bg-[#111]">
      {onVoltar && (
        <button onClick={onVoltar} className="text-gray-400 active:text-white p-1 -ml-1">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      <div className="flex-1 min-w-0">
        <h2 className="text-white font-bold text-base truncate">{titulo}</h2>
      </div>
      {direita}
    </div>
  )
}

// ── Seletor de variação ────────────────────────────────────────
function SeletorVariacao({ item, onConfirmar, onFechar, precosVariacoes }) {
  const opcoes = item.proteinas || item.tamanhos || []
  const [sel, setSel] = useState(opcoes[0] || null)

  function preco(op) {
    const k = `${item.id}-${op.label}`
    return precosVariacoes[k] !== undefined ? precosVariacoes[k] : op.preco
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70" onClick={onFechar}>
      <div className="bg-[#1a1a1a] border border-[#333] rounded-t-2xl w-full p-5 pb-10 max-w-md mx-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-white font-bold">{item.nome}</p>
          <button onClick={onFechar} className="text-gray-400 text-xl leading-none p-1">✕</button>
        </div>
        <p className="text-gray-400 text-xs mb-3">{item.proteinas ? 'Escolha a proteína:' : 'Escolha o tamanho:'}</p>
        <div className="space-y-2 mb-5">
          {opcoes.map(op => (
            <button key={op.label} onClick={() => setSel(op)}
              className={`w-full flex justify-between items-center px-4 py-3 rounded-xl border transition ${
                sel?.label === op.label ? 'border-yellow-400 bg-yellow-400/10 text-white' : 'border-[#333] bg-[#222] text-gray-300'
              }`}>
              <span className="text-sm font-medium">{op.label}</span>
              <span className="text-yellow-400 font-bold text-sm">R$ {preco(op).toFixed(2).replace('.', ',')}</span>
            </button>
          ))}
        </div>
        <button onClick={() => sel && onConfirmar(item, { label: sel.label, preco: preco(sel) })}
          className="w-full bg-red-600 text-white font-bold py-3.5 rounded-xl active:scale-95">
          Adicionar ao pedido
        </button>
      </div>
    </div>
  )
}

// ── Card item ──────────────────────────────────────────────────
function CardItem({ item, adicionar, remover, desativado, precosVariacoes, getQtd }) {
  const [showVar, setShowVar] = useState(false)
  const temProteinas = !!item.proteinas
  const temTamanhos = !!item.tamanhos
  const temVar = temProteinas || temTamanhos

  function precoBase() {
    if (item.proteinas) {
      const f = item.proteinas[0]; const k = `${item.id}-${f.label}`
      return precosVariacoes[k] !== undefined ? precosVariacoes[k] : f.preco
    }
    return precosVariacoes[String(item.id)] !== undefined ? precosVariacoes[String(item.id)] : item.preco ?? 0
  }

  // Itens com tamanhos (Meio/Inteiro): exibe cada variação inline com +/- próprio
  if (temTamanhos) {
    return (
      <div className={desativado ? 'opacity-40' : ''}>
        <div className="flex items-center gap-3 px-4 pt-3 pb-1">
          {item.imagem && (
            <img src={item.imagem} alt={item.nome} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-[#222]"
              onError={e => { e.target.style.display = 'none' }} />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm">{item.nome}</p>
            {item.descricao && <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{item.descricao}</p>}
          </div>
        </div>
        {item.tamanhos.map(tam => {
          const k = `${item.id}-${tam.label}`
          const p = precosVariacoes[k] !== undefined ? precosVariacoes[k] : tam.preco
          const qtd = getQtd(k)
          return (
            <div key={tam.label} className="flex items-center gap-3 px-4 py-2.5 border-b border-[#2a2a2a] pl-6">
              <span className="text-gray-300 text-sm flex-1">{tam.label}</span>
              <span className="text-yellow-400 font-bold text-sm mr-2">R$ {p.toFixed(2).replace('.', ',')}</span>
              {qtd > 0 ? (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => remover(k)}
                    className="w-8 h-8 rounded-full bg-[#333] text-white font-bold flex items-center justify-center text-lg active:scale-90">−</button>
                  <span className="text-white font-bold w-5 text-center text-sm">{qtd}</span>
                  <button onClick={() => !desativado && adicionar(item, { label: tam.label, preco: p })}
                    className="w-8 h-8 rounded-full bg-red-600 text-white font-bold flex items-center justify-center text-lg active:scale-90">+</button>
                </div>
              ) : (
                <button onClick={() => !desativado && adicionar(item, { label: tam.label, preco: p })} disabled={desativado}
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0 active:scale-90 ${
                    desativado ? 'bg-[#333] text-gray-600 cursor-not-allowed' : 'bg-red-600 text-white shadow'
                  }`}>+</button>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const qtd = temVar ? 0 : getQtd(`${item.id}-`)

  function onAdd() {
    if (desativado) return
    if (temProteinas) { setShowVar(true); return }
    const p = precosVariacoes[String(item.id)] !== undefined ? precosVariacoes[String(item.id)] : item.preco ?? 0
    adicionar({ ...item, preco: p })
  }

  return (
    <>
      <div className={`flex items-center gap-3 px-4 py-3.5 border-b border-[#2a2a2a] ${desativado ? 'opacity-40' : ''}`}>
        {item.imagem && (
          <img src={item.imagem} alt={item.nome} className="w-14 h-14 rounded-xl object-cover flex-shrink-0 bg-[#222]"
            onError={e => { e.target.style.display = 'none' }} />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">{item.nome}</p>
          {item.descricao && <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{item.descricao}</p>}
          <p className="text-yellow-400 font-bold text-sm mt-1">
            {temProteinas ? 'A partir de ' : ''}R$ {precoBase().toFixed(2).replace('.', ',')}
          </p>
          {desativado && <p className="text-red-400 text-xs">Esgotado</p>}
        </div>
        {!temVar && qtd > 0 ? (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => remover(`${item.id}-`)}
              className="w-9 h-9 rounded-full bg-[#333] text-white font-bold flex items-center justify-center text-lg active:scale-90">−</button>
            <span className="text-white font-bold w-5 text-center text-sm">{qtd}</span>
            <button onClick={onAdd}
              className="w-9 h-9 rounded-full bg-red-600 text-white font-bold flex items-center justify-center text-lg active:scale-90">+</button>
          </div>
        ) : (
          <button onClick={onAdd} disabled={desativado}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0 active:scale-90 ${
              desativado ? 'bg-[#333] text-gray-600 cursor-not-allowed' : 'bg-red-600 text-white shadow'
            }`}>+</button>
        )}
      </div>
      {showVar && (
        <SeletorVariacao item={item} precosVariacoes={precosVariacoes}
          onConfirmar={(it, v) => { adicionar(it, v); setShowVar(false) }}
          onFechar={() => setShowVar(false)} />
      )}
    </>
  )
}

// ── Hook carrinho persistido ───────────────────────────────────
function useCarrinho() {
  const [itens, setItens] = useState(() => {
    try { const s = localStorage.getItem(CARRINHO_KEY); return s ? JSON.parse(s) : [] } catch { return [] }
  })

  useEffect(() => {
    try { localStorage.setItem(CARRINHO_KEY, JSON.stringify(itens)) } catch {}
  }, [itens])

  function adicionar(item, variacao = null) {
    const chave = `${item.id}-${variacao?.label || ''}`
    setItens(p => {
      const ex = p.find(i => i.chave === chave)
      if (ex) return p.map(i => i.chave === chave ? { ...i, qtd: i.qtd + 1 } : i)
      return [...p, { chave, item, variacao: variacao?.label || null, preco: variacao?.preco ?? item.preco ?? 0, qtd: 1 }]
    })
  }

  function remover(chave) {
    setItens(p => {
      const ex = p.find(i => i.chave === chave)
      if (!ex) return p
      if (ex.qtd <= 1) return p.filter(i => i.chave !== chave)
      return p.map(i => i.chave === chave ? { ...i, qtd: i.qtd - 1 } : i)
    })
  }

  function limpar() {
    setItens([])
    try { localStorage.removeItem(CARRINHO_KEY) } catch {}
  }

  function getQtd(chave) { return itens.find(i => i.chave === chave)?.qtd || 0 }

  const total      = itens.reduce((s, i) => s + i.preco * i.qtd, 0)
  const totalItens = itens.reduce((s, i) => s + i.qtd, 0)

  return { itens, adicionar, remover, limpar, getQtd, total, totalItens }
}

// ═══════════════════════════════════════════════════════════════
// TELAS
// ═══════════════════════════════════════════════════════════════

function TelaPin({ onEntrar, senhaCorreta }) {
  const [pin, setPin] = useState('')
  const [erro, setErro] = useState(false)

  function verificar() {
    const senha = senhaCorreta || 'garcom2024'
    if (pin === senha || pin === 'scooby2024') { onEntrar() }
    else { setErro(true); setPin(''); setTimeout(() => setErro(false), 2000) }
  }

  return (
    <div className="h-[100dvh] bg-[#111] flex flex-col items-center justify-center px-6 overflow-hidden">
      <div className="mb-8 text-center">
        <div className="text-6xl mb-3">🍔</div>
        <h1 className="text-yellow-400 font-black text-2xl tracking-wide">GARÇOM</h1>
        <p className="text-gray-500 text-sm mt-1">Scooby-Doo Lanches</p>
      </div>
      <div className="w-full max-w-xs space-y-4">
        <div>
          <label className="text-gray-400 text-xs font-semibold uppercase tracking-wide block mb-2">Senha de acesso</label>
          <input type="password" placeholder="Digite a senha" value={pin}
            onChange={e => setPin(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && verificar()}
            autoFocus
            className={`w-full bg-[#1a1a1a] border text-white rounded-xl px-4 py-4 text-center text-lg tracking-widest focus:outline-none transition ${
              erro ? 'border-red-500' : 'border-[#333] focus:border-yellow-400'
            }`} />
          {erro && <p className="text-red-400 text-xs text-center mt-2">Senha incorreta</p>}
        </div>
        <button onClick={verificar}
          className="w-full bg-red-600 active:scale-95 text-white font-black py-4 rounded-xl text-lg transition">
          Entrar
        </button>
      </div>
    </div>
  )
}

function TelaTipo({ onSelecionar }) {
  return (
    <div className="h-[100dvh] bg-[#111] flex flex-col items-center justify-center px-6 gap-5 overflow-hidden">
      <div className="text-center mb-2">
        <h2 className="text-white font-black text-2xl">Novo Pedido</h2>
        <p className="text-gray-500 text-sm mt-1">Como é este pedido?</p>
      </div>
      <button onClick={() => onSelecionar('mesa')}
        className="w-full max-w-xs bg-[#1a1a1a] border-2 border-[#333] active:border-yellow-400 active:scale-95 text-white font-bold py-8 rounded-2xl transition flex flex-col items-center gap-2">
        <span className="text-5xl">🍽️</span>
        <span className="text-xl font-black">Mesa</span>
        <span className="text-gray-400 text-xs font-normal">Consumo no local · pagamento no balcão</span>
      </button>
      <button onClick={() => onSelecionar('entrega')}
        className="w-full max-w-xs bg-[#1a1a1a] border-2 border-[#333] active:border-yellow-400 active:scale-95 text-white font-bold py-8 rounded-2xl transition flex flex-col items-center gap-2">
        <span className="text-5xl">🛵</span>
        <span className="text-xl font-black">Entrega</span>
        <span className="text-gray-400 text-xs font-normal">Delivery via garçom</span>
      </button>
    </div>
  )
}

function TelaMesaSelecao({ onSelecionar, onVoltar }) {
  const [mesas, setMesas] = useState([])

  useEffect(() => {
    fetch('/api/mesa').then(r => r.json()).then(setMesas).catch(() => {})
  }, [])

  return (
    <div className="h-[100dvh] bg-[#111] flex flex-col overflow-hidden">
      <Header titulo="🍽️ Qual mesa?" onVoltar={onVoltar} />
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => {
            const m = mesas.find(x => x.numero === n)
            const aberta = m?.status === 'aberta'
            return (
              <button key={n} onClick={() => onSelecionar(n)}
                className={`flex flex-col items-center justify-center py-8 rounded-2xl border-2 font-bold transition active:scale-95 ${
                  aberta
                    ? 'border-yellow-400 bg-yellow-400/10 text-white'
                    : 'border-[#333] bg-[#1a1a1a] text-gray-300'
                }`}>
                <span className="text-5xl font-black">{n}</span>
                <span className={`text-xs mt-2 font-semibold ${aberta ? 'text-yellow-400' : 'text-gray-600'}`}>
                  {aberta ? `R$ ${Number(m?.total || 0).toFixed(2).replace('.', ',')}` : 'Livre'}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function TelaDados({ tipo, dadosIniciais, onAvancar, onVoltar }) {
  const [nome, setNome]           = useState(dadosIniciais.nomeCliente || '')
  const [mesa, setMesa]           = useState(dadosIniciais.mesa || '')
  const [tel, setTel]             = useState(dadosIniciais.telefone || '')
  const [rua, setRua]             = useState(dadosIniciais.rua || '')
  const [numero, setNumero]       = useState(dadosIniciais.numero || '')
  const [bairro, setBairro]       = useState(dadosIniciais.bairro || '')
  const [complemento, setCompl]   = useState(dadosIniciais.complemento || '')

  function avancar() {
    if (!nome.trim()) { alert('Informe o nome do cliente'); return }
    if (tipo === 'mesa' && !mesa.trim()) { alert('Informe o número da mesa'); return }
    if (tipo === 'entrega' && !rua.trim()) { alert('Informe a rua'); return }
    onAvancar({
      nomeCliente: nome.trim(),
      mesa: tipo === 'mesa' ? mesa.trim() : '',
      telefone: tel.replace(/\D/g, ''),
      tipoEntrega: tipo === 'mesa' ? 'Retirada' : 'Entrega',
      rua: rua.trim(), numero: numero.trim(),
      bairro: bairro.trim(), complemento: complemento.trim(),
    })
  }

  const inp = 'w-full bg-[#1a1a1a] border border-[#333] focus:border-yellow-400 text-white rounded-xl px-4 py-3.5 text-sm focus:outline-none transition'
  const lbl = 'text-gray-400 text-xs uppercase tracking-wide font-semibold block mb-1.5'

  return (
    <div className="h-[100dvh] bg-[#111] flex flex-col overflow-hidden">
      <Header titulo={tipo === 'mesa' ? '🍽️ Dados da Mesa' : '🛵 Dados da Entrega'} onVoltar={onVoltar} />

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div>
          <label className={lbl}>Nome do cliente *</label>
          <input type="text" placeholder="Ex: João Silva" value={nome} onChange={e => setNome(e.target.value)} className={inp} />
        </div>
        {tipo === 'mesa' && (
          <div>
            <label className={lbl}>Número da mesa *</label>
            <input type="number" inputMode="numeric" placeholder="5" value={mesa} onChange={e => setMesa(e.target.value)} className={inp} />
          </div>
        )}
        <div>
          <label className={lbl}>Telefone {tipo === 'entrega' ? '*' : '(opcional)'}</label>
          <input type="tel" inputMode="tel" placeholder="(32) 99999-9999" value={tel} onChange={e => setTel(e.target.value)} className={inp} />
        </div>
        {tipo === 'entrega' && (
          <>
            <div>
              <label className={lbl}>Rua *</label>
              <input type="text" placeholder="Nome da rua" value={rua} onChange={e => setRua(e.target.value)} className={inp} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Número</label>
                <input type="text" placeholder="123" value={numero} onChange={e => setNumero(e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Bairro</label>
                <input type="text" placeholder="Bairro" value={bairro} onChange={e => setBairro(e.target.value)} className={inp} />
              </div>
            </div>
            <div>
              <label className={lbl}>Complemento</label>
              <input type="text" placeholder="Apto, referência..." value={complemento} onChange={e => setCompl(e.target.value)} className={inp} />
            </div>
          </>
        )}
        {/* Espaço extra para o teclado não bloquear o botão */}
        <div className="h-4" />
      </div>

      <div className="flex-shrink-0 px-4 pb-safe pt-4 border-t border-[#222] bg-[#111]"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
        <button onClick={avancar}
          className="w-full bg-red-600 active:scale-95 text-white font-black py-4 rounded-xl text-base transition">
          Avançar para o cardápio →
        </button>
      </div>
    </div>
  )
}

function TelaCardapio({ dados, tipo, cardapioState, carrinho, onAvancar, onVoltar }) {
  const { itens, adicionar, remover, getQtd, total, totalItens } = carrinho
  const [catAtiva, setCatAtiva] = useState(categorias[0].id)
  const [showCarrinho, setShowCarrinho] = useState(false)
  const [obs, setObs] = useState('')

  const pv = { ...(cardapioState.precosVariacoes || {}), ...(cardapioState.precos || {}) }
  const desativados = cardapioState.desativados || []
  const catExibida = categorias.find(c => c.id === catAtiva)

  if (showCarrinho) {
    return (
      <div className="h-[100dvh] bg-[#111] flex flex-col overflow-hidden">
        <Header titulo="🛒 Itens do pedido" onVoltar={() => setShowCarrinho(false)} />
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {itens.length === 0 && <p className="text-gray-500 text-center py-10">Nenhum item adicionado</p>}
          {itens.map(i => (
            <div key={i.chave} className="flex items-center gap-3 bg-[#1a1a1a] rounded-xl px-4 py-3 border border-[#2a2a2a]">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold">{i.item.nome}</p>
                {i.variacao && <p className="text-gray-400 text-xs">{i.variacao}</p>}
                <p className="text-yellow-400 text-xs font-bold">R$ {(i.preco * i.qtd).toFixed(2).replace('.', ',')}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => remover(i.chave)}
                  className="w-9 h-9 rounded-full bg-[#333] text-white font-bold flex items-center justify-center active:scale-90 text-lg">−</button>
                <span className="text-white font-bold w-5 text-center">{i.qtd}</span>
                <button onClick={() => adicionar(i.item, i.variacao ? { label: i.variacao, preco: i.preco } : null)}
                  className="w-9 h-9 rounded-full bg-red-600 text-white font-bold flex items-center justify-center active:scale-90 text-lg">+</button>
              </div>
            </div>
          ))}

          {/* Obs geral */}
          <div>
            <label className="text-gray-400 text-xs uppercase tracking-wide font-semibold block mb-1.5">Observação</label>
            <textarea placeholder="Ex: sem cebola, ponto da carne..." value={obs} onChange={e => setObs(e.target.value)}
              rows={3}
              className="w-full bg-[#1a1a1a] border border-[#333] focus:border-yellow-400 text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition resize-none" />
          </div>

          {/* Para levar — só mesa */}
          {tipo === 'mesa' && (
            <label className="flex items-center gap-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3.5 cursor-pointer">
              <input type="checkbox" checked={obs.includes('PARA LEVAR')}
                onChange={e => setObs(prev => e.target.checked
                  ? ('PARA LEVAR. ' + prev.replace('PARA LEVAR. ', '')).trim()
                  : prev.replace('PARA LEVAR. ', '').trim()
                )}
                className="w-5 h-5 rounded accent-yellow-400 cursor-pointer" />
              <div>
                <p className="text-white font-semibold text-sm">🥡 Lanche para levar</p>
                <p className="text-gray-500 text-xs">Embalar para o cliente levar</p>
              </div>
            </label>
          )}
          <div className="h-4" />
        </div>

        <div className="flex-shrink-0 px-4 pt-4 border-t border-[#222] bg-[#111]"
          style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          <div className="flex justify-between mb-3">
            <span className="text-gray-400 text-sm">{totalItens} {totalItens === 1 ? 'item' : 'itens'}</span>
            <span className="text-yellow-400 font-black text-lg">R$ {total.toFixed(2).replace('.', ',')}</span>
          </div>
          <button onClick={() => totalItens > 0 ? onAvancar(obs) : alert('Adicione ao menos um item')}
            className="w-full bg-red-600 active:scale-95 text-white font-black py-4 rounded-xl transition">
            {tipo === 'mesa' ? 'Confirmar pedido →' : 'Escolher pagamento →'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[100dvh] bg-[#111] flex flex-col overflow-hidden">
      <Header
        titulo={tipo === 'mesa' ? `🍽️ Mesa ${dados.mesa}` : `🛵 Entrega — ${dados.nomeCliente}`}
        onVoltar={onVoltar}
        direita={totalItens > 0 && (
          <button onClick={() => setShowCarrinho(true)}
            className="flex-shrink-0 bg-red-600 text-white font-bold text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 active:scale-95">
            <span className="bg-black/30 w-5 h-5 rounded-full flex items-center justify-center">{totalItens}</span>
            R$ {total.toFixed(2).replace('.', ',')}
          </button>
        )}
      />

      {/* Abas */}
      <div className="flex-shrink-0 overflow-x-auto bg-[#141414] border-b border-[#222]" style={{ scrollbarWidth: 'none' }}>
        <div className="flex gap-1 px-3 py-2 min-w-max">
          {categorias.map(cat => (
            <button key={cat.id} onClick={() => setCatAtiva(cat.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition whitespace-nowrap ${
                catAtiva === cat.id ? 'bg-yellow-400 text-black' : 'text-gray-400'
              }`}>{cat.emoji} {cat.nome.split(' ').slice(1).join(' ')}</button>
          ))}
          <button onClick={() => setCatAtiva('adicionais')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
              catAtiva === 'adicionais' ? 'bg-yellow-400 text-black' : 'text-gray-400'
            }`}>➕ Adicionais</button>
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide px-4 py-3 sticky top-0 bg-[#111]">
          {catAtiva === 'adicionais' ? '➕ Adicionais' : catExibida?.nome}
        </p>
        {catAtiva === 'adicionais'
          ? ADICIONAIS.filter(ad => !desativados.includes(ad.id)).map(ad => {
              const pr = (cardapioState.precos || {})[ad.id] ?? ad.preco
              const q = getQtd(`${ad.id}-`)
              return (
                <div key={ad.id} className="flex items-center gap-3 px-4 py-3.5 border-b border-[#2a2a2a]">
                  <span className="text-2xl w-10 text-center">{ad.emoji}</span>
                  <div className="flex-1">
                    <p className="text-white font-semibold text-sm">{ad.nome}</p>
                    <p className="text-yellow-400 font-bold text-xs">R$ {pr.toFixed(2).replace('.', ',')}</p>
                  </div>
                  {q > 0 ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => remover(`${ad.id}-`)}
                        className="w-9 h-9 rounded-full bg-[#333] text-white font-bold flex items-center justify-center text-lg active:scale-90">−</button>
                      <span className="text-white font-bold w-5 text-center">{q}</span>
                      <button onClick={() => adicionar({ ...ad, preco: pr })}
                        className="w-9 h-9 rounded-full bg-red-600 text-white font-bold flex items-center justify-center text-lg active:scale-90">+</button>
                    </div>
                  ) : (
                    <button onClick={() => adicionar({ ...ad, preco: pr })}
                      className="w-10 h-10 rounded-full bg-red-600 text-white font-bold flex items-center justify-center text-2xl active:scale-90">+</button>
                  )}
                </div>
              )
            })
          : (catExibida?.itens || []).map(item => (
              <CardItem key={item.id} item={item} adicionar={adicionar} remover={remover}
                desativado={desativados.includes(item.id)} precosVariacoes={pv} getQtd={getQtd} />
            ))
        }
        <div className="h-24" />
      </div>

      {/* Botão flutuante */}
      {totalItens > 0 && (
        <div className="absolute bottom-0 left-0 right-0 px-4 bg-gradient-to-t from-[#111] via-[#111]/90 to-transparent pt-8 pb-4"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <button onClick={() => setShowCarrinho(true)}
            className="w-full bg-red-600 active:scale-95 text-white font-black py-4 rounded-xl flex items-center justify-between px-5 shadow-2xl">
            <span className="bg-black/30 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">{totalItens}</span>
            <span>Ver pedido</span>
            <span className="text-yellow-300">R$ {total.toFixed(2).replace('.', ',')}</span>
          </button>
        </div>
      )}
    </div>
  )
}

function TelaPagamento({ dados, tipo, itens, total, obs, taxaEntrega, onEnviar, onVoltar, offline }) {
  const [pagamento, setPagamento] = useState('Pix')
  const [troco, setTroco] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  // Mesa: pagamento sempre no balcão, sem seleção
  if (tipo === 'mesa') {
    return <ConfirmarMesa dados={dados} itens={itens} total={total} obs={obs}
      onEnviar={onEnviar} onVoltar={onVoltar} offline={offline} />
  }

  const taxa = taxaEntrega ?? 5
  const totalFinal = total + taxa

  async function confirmar() {
    if (enviando) return
    setEnviando(true); setErro('')
    const payload = buildPayload(dados, tipo, itens, totalFinal, pagamento, obs, taxa, troco)

    if (!navigator.onLine) {
      enfileirar(payload)
      setEnviando(false)
      onEnviar(null, true)
      return
    }

    try {
      const r = await fetch('/api/pedido', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const j = await r.json()
      if (!r.ok || j.erro) throw new Error(j.erro || 'Erro')
      onEnviar(j.numeroPedido, false)
    } catch (e) {
      if (!navigator.onLine || e.message.toLowerCase().includes('fetch') || e.message.toLowerCase().includes('network') || e.message.toLowerCase().includes('failed to')) {
        enfileirar(payload); setEnviando(false); onEnviar(null, true)
      } else {
        setErro(e.message); setEnviando(false)
      }
    }
  }

  const opts = [
    { id: 'Pix', label: 'Pix', emoji: '📲' },
    { id: 'Dinheiro', label: 'Dinheiro', emoji: '💵' },
    { id: 'Cartão de Débito', label: 'Débito', emoji: '💳' },
    { id: 'Cartão de Crédito', label: 'Crédito', emoji: '💳' },
  ]

  return (
    <div className="h-[100dvh] bg-[#111] flex flex-col overflow-hidden">
      <Header titulo="💳 Pagamento" onVoltar={onVoltar}
        direita={offline && <span className="text-xs text-red-400 font-semibold">📵 Offline</span>} />

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {/* Resumo */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl px-4 py-4">
          <p className="text-gray-400 text-xs uppercase tracking-wide font-semibold mb-2">Resumo · Entrega</p>
          <p className="text-gray-300 text-sm mb-2">{dados.nomeCliente}</p>
          {itens.map(i => (
            <div key={i.chave} className="flex justify-between text-xs text-gray-500 py-0.5">
              <span>{i.qtd}× {i.item.nome}{i.variacao ? ` (${i.variacao})` : ''}</span>
              <span>R$ {(i.preco * i.qtd).toFixed(2).replace('.', ',')}</span>
            </div>
          ))}
          <div className="flex justify-between text-xs text-gray-500 py-0.5 mt-1 pt-1 border-t border-[#2a2a2a]">
            <span>Taxa de entrega</span>
            <span>R$ {taxa.toFixed(2).replace('.', ',')}</span>
          </div>
          <div className="flex justify-between mt-2 pt-2 border-t border-[#333]">
            <span className="text-white font-bold">Total</span>
            <span className="text-yellow-400 font-black text-lg">R$ {totalFinal.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>

        <div>
          <p className="text-gray-400 text-xs uppercase tracking-wide font-semibold mb-3">Forma de pagamento</p>
          <div className="grid grid-cols-2 gap-2">
            {opts.map(p => (
              <button key={p.id} onClick={() => setPagamento(p.id)}
                className={`flex flex-col items-center gap-1.5 py-4 rounded-xl border-2 font-bold text-sm transition ${
                  pagamento === p.id ? 'border-yellow-400 bg-yellow-400/10 text-white' : 'border-[#333] bg-[#1a1a1a] text-gray-400'
                }`}>
                <span className="text-2xl">{p.emoji}</span>{p.label}
              </button>
            ))}
          </div>
        </div>

        {pagamento === 'Dinheiro' && (
          <div>
            <label className="text-gray-400 text-xs uppercase tracking-wide font-semibold block mb-1.5">Troco para (opcional)</label>
            <input type="text" placeholder="Ex: 50,00" value={troco} onChange={e => setTroco(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#333] focus:border-yellow-400 text-white rounded-xl px-4 py-3.5 text-sm focus:outline-none transition" />
          </div>
        )}

        {offline && (
          <div className="bg-orange-900/40 border border-orange-700 text-orange-300 text-sm px-4 py-3 rounded-xl">
            📵 Sem internet — o pedido será enviado automaticamente ao reconectar.
          </div>
        )}
        {erro && <div className="bg-red-900/50 border border-red-700 text-red-300 text-sm px-4 py-3 rounded-xl">{erro}</div>}
        <div className="h-2" />
      </div>

      <div className="flex-shrink-0 px-4 pt-4 border-t border-[#222] bg-[#111]"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
        <button onClick={confirmar} disabled={enviando}
          className={`w-full font-black py-4 rounded-xl text-base transition ${
            enviando ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-red-600 active:scale-95 text-white'
          }`}>
          {enviando ? '⏳ Enviando...' : `✅ Confirmar — R$ ${totalFinal.toFixed(2).replace('.', ',')}`}
        </button>
      </div>
    </div>
  )
}

// Mesa: adiciona itens à mesa (sem criar pedido — admin fecha a conta)
function ConfirmarMesa({ dados, itens, total, obs, onEnviar, onVoltar }) {
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  async function confirmar() {
    if (enviando) return
    setEnviando(true); setErro('')

    if (!navigator.onLine) {
      setErro('Sem internet. Verifique a conexão.')
      setEnviando(false)
      return
    }

    try {
      const itensMesa = itens.map(i => ({
        nome: i.item.nome,
        variacao: i.variacao || null,
        preco: i.preco,
        qtd: i.qtd,
      }))
      const r = await fetch('/api/mesa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero: parseInt(dados.mesa), itens: itensMesa }),
      })
      const j = await r.json()
      if (!r.ok || j.erro) throw new Error(j.erro || 'Erro')
      onEnviar()
    } catch (e) {
      setErro(e.message); setEnviando(false)
    }
  }

  return (
    <div className="h-[100dvh] bg-[#111] flex flex-col overflow-hidden">
      <Header titulo={`🍽️ Mesa ${dados.mesa} — Confirmar`} onVoltar={onVoltar} />

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl px-4 py-4">
          <p className="text-gray-400 text-xs uppercase tracking-wide font-semibold mb-3">Itens a adicionar</p>
          <div className="flex justify-between items-center text-sm mb-3 pb-2 border-b border-[#2a2a2a]">
            <span className="text-yellow-400 font-bold">Mesa {dados.mesa}</span>
          </div>
          {itens.map(i => (
            <div key={i.chave} className="flex justify-between text-sm py-1.5 border-b border-[#1f1f1f]">
              <span className="text-gray-200">{i.qtd}× {i.item.nome}{i.variacao ? ` (${i.variacao})` : ''}</span>
              <span className="text-gray-400">R$ {(i.preco * i.qtd).toFixed(2).replace('.', ',')}</span>
            </div>
          ))}
          {obs && <p className="text-yellow-400/70 text-xs mt-3 italic">📝 {obs}</p>}
          <div className="flex justify-between mt-3 pt-3 border-t border-[#333]">
            <span className="text-white font-bold">Subtotal</span>
            <span className="text-yellow-400 font-black text-xl">R$ {total.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-[#1a2a1a] border border-green-800/60 rounded-2xl px-4 py-4">
          <span className="text-3xl">🍽️</span>
          <div>
            <p className="text-green-400 font-bold text-sm">Consumo em andamento</p>
            <p className="text-gray-500 text-xs">O pagamento é feito ao fechar a conta no admin</p>
          </div>
        </div>

        {erro && <div className="bg-red-900/50 border border-red-700 text-red-300 text-sm px-4 py-3 rounded-xl">{erro}</div>}
      </div>

      <div className="flex-shrink-0 px-4 pt-4 border-t border-[#222] bg-[#111]"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
        <button onClick={confirmar} disabled={enviando}
          className={`w-full font-black py-4 rounded-xl text-base transition ${
            enviando ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-red-600 active:scale-95 text-white'
          }`}>
          {enviando ? '⏳ Adicionando...' : `✅ Adicionar à Mesa ${dados.mesa}`}
        </button>
      </div>
    </div>
  )
}

function TelaConfirmadoMesa({ dados, total, onNovoPedido, onMaisItens }) {
  useEffect(() => {
    const t = setTimeout(onNovoPedido, 2000)
    return () => clearTimeout(t)
  }, [onNovoPedido])

  return (
    <div className="h-[100dvh] bg-[#111] flex flex-col items-center justify-center px-6 text-center overflow-hidden">
      <div className="text-7xl mb-4">✅</div>
      <h2 className="text-white font-black text-2xl mb-2">Itens adicionados!</h2>
      <p className="text-yellow-400 font-black text-3xl mb-2">Mesa {dados.mesa}</p>
      <p className="text-gray-400 text-sm mb-6">R$ {Number(total).toFixed(2).replace('.', ',')} adicionados à conta</p>
      <p className="text-gray-600 text-xs">Voltando em instantes...</p>
    </div>
  )
}

function TelaConfirmado({ numeroPedido, tipo, dados, total, eraOffline, pendentes, onNovoPedido, onMaisItens }) {
  if (tipo === 'mesa') {
    return <TelaConfirmadoMesa dados={dados} total={total} onNovoPedido={onNovoPedido} onMaisItens={onMaisItens} />
  }

  return (
    <div className="h-[100dvh] bg-[#111] flex flex-col items-center justify-center px-6 text-center overflow-hidden">
      <div className="text-7xl mb-4">{eraOffline ? '📵' : '✅'}</div>
      <h2 className="text-white font-black text-2xl mb-2">{eraOffline ? 'Pedido salvo!' : 'Pedido lançado!'}</h2>
      <p className="text-gray-400 text-sm mb-6 max-w-xs">
        {eraOffline
          ? `Sem internet. Será enviado automaticamente ao reconectar.${pendentes > 1 ? ` (${pendentes} na fila)` : ''}`
          : 'Pedido registrado no sistema com sucesso.'}
      </p>

      <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl px-6 py-5 w-full max-w-xs mb-8 text-left space-y-2">
        {numeroPedido && (
          <div className="flex justify-between">
            <span className="text-gray-400 text-sm">Pedido</span>
            <span className="text-yellow-400 font-black">#{numeroPedido.split('-').pop()}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-400 text-sm">Cliente</span>
          <span className="text-white font-semibold text-sm">{dados.nomeCliente}</span>
        </div>
        <div className="flex justify-between pt-2 border-t border-[#2a2a2a]">
          <span className="text-gray-400 text-sm">Total</span>
          <span className="text-yellow-400 font-black text-lg">R$ {Number(total).toFixed(2).replace('.', ',')}</span>
        </div>
      </div>

      <button onClick={onNovoPedido}
        className="w-full max-w-xs bg-red-600 active:scale-95 text-white font-black py-4 rounded-xl text-base transition mb-3">
        + Novo pedido
      </button>
      <a href="/admin" className="text-gray-500 text-sm">Ver painel admin</a>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────
function buildPayload(dados, tipo, itens, totalFinal, pagamento, obs, taxa, troco) {
  const agora = new Date()
  return {
    data: agora.toLocaleDateString('pt-BR'),
    hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    nomeCliente: dados.nomeCliente || (tipo === 'mesa' ? `Mesa ${dados.mesa}` : 'Cliente'),
    telefone: dados.telefone || '',
    itensPedido: itens.map(i => `${i.qtd}x ${i.item.nome}${i.variacao ? ` (${i.variacao})` : ''}`).join(' | '),
    total: Number(totalFinal).toFixed(2),
    pagamento,
    tipoEntrega: dados.tipoEntrega,
    rua: dados.rua || '', numero: dados.numero || '',
    bairro: dados.bairro || '', complemento: dados.complemento || '',
    observacao: obs || '',
    troco: troco || '',
    mesa: dados.mesa || '',
    origem: 'garcom',
    taxaEntrega: taxa,
  }
}

function enfileirar(payload) {
  const lista = carregarPendentes()
  lista.push({ ...payload, _id: Date.now() })
  salvarPendentes(lista)
}

// ── Garçom principal ───────────────────────────────────────────
export default function Garcom() {
  const [tela, setTela]         = useState('pin')
  const [tipo, setTipo]         = useState('')
  const [dados, setDados]       = useState({})
  const [obs, setObs]           = useState('')
  const [numeroPedido, setNum]  = useState('')
  const [eraOffline, setEraOff] = useState(false)
  const [offline, setOffline]   = useState(!navigator.onLine)
  const [pendentes, setPend]    = useState(() => carregarPendentes().length)

  const carrinho = useCarrinho()
  const [cardapioState, setCardapioState] = useState({ precos: {}, desativados: [], precosVariacoes: {} })

  // Restaurar fluxo
  useEffect(() => {
    const s = carregarEstadoSalvo()
    if (s?.logado && s.tela && s.tela !== 'pin') {
      setTela(s.tela); setTipo(s.tipo || ''); setDados(s.dados || {}); setObs(s.obs || '')
    }
  }, [])

  // Salvar fluxo
  useEffect(() => {
    if (tela === 'pin') return
    salvarEstado({ logado: true, tela, tipo, dados, obs })
  }, [tela, tipo, dados, obs])

  useEffect(() => {
    fetch('/api/cardapio-state').then(r => r.json()).then(setCardapioState).catch(() => {})
  }, [])

  useEffect(() => {
    async function enviarFila() {
      const lista = carregarPendentes()
      if (!lista.length) return
      const rest = []
      for (const item of lista) {
        const { _id, ...body } = item
        try {
          const r = await fetch('/api/pedido', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
          if (!r.ok) rest.push(item)
        } catch { rest.push(item) }
      }
      salvarPendentes(rest)
      setPend(rest.length)
    }

    function onOnline() { setOffline(false); enviarFila() }
    function onOffline() { setOffline(true) }

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    if (navigator.onLine) enviarFila()
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) }
  }, [])

  function novoFluxo() {
    carrinho.limpar(); setObs(''); setNum(''); setEraOff(false)
    setTela('tipo')
    salvarEstado({ logado: true, tela: 'tipo', tipo: '', dados: {}, obs: '' })
  }

  function voltarParaCardapio() {
    carrinho.limpar(); setObs('')
    setTela('cardapio')
    salvarEstado({ logado: true, tela: 'cardapio', tipo, dados, obs: '' })
  }

  const taxa = tipo === 'entrega' ? (cardapioState.taxaEntrega ?? 5) : 0

  return (
    <div className="h-[100dvh] overflow-hidden bg-[#111]"
      style={{ touchAction: 'manipulation', overscrollBehavior: 'none' }}>
      {offline && <BannerOffline pendentes={pendentes} />}

      {tela === 'pin' && (
        <TelaPin
          senhaCorreta={cardapioState.senhaGarcom}
          onEntrar={() => { setTela('tipo'); salvarEstado({ logado: true, tela: 'tipo', tipo: '', dados: {}, obs: '' }) }} />
      )}
      {tela === 'tipo' && (
        <TelaTipo onSelecionar={t => {
          setTipo(t)
          setTela(t === 'mesa' ? 'mesa-selecao' : 'dados')
        }} />
      )}
      {tela === 'mesa-selecao' && (
        <TelaMesaSelecao
          onSelecionar={n => { setDados({ mesa: String(n), tipoEntrega: 'Retirada' }); setTela('cardapio') }}
          onVoltar={() => setTela('tipo')} />
      )}
      {tela === 'dados' && (
        <TelaDados tipo={tipo} dadosIniciais={dados}
          onAvancar={d => { setDados(d); setTela('cardapio') }}
          onVoltar={() => setTela('tipo')} />
      )}
      {tela === 'cardapio' && (
        <TelaCardapio dados={dados} tipo={tipo} cardapioState={cardapioState}
          carrinho={carrinho} obs={obs}
          onAvancar={o => { setObs(o); setTela('pagamento') }}
          onVoltar={() => setTela(tipo === 'mesa' ? 'mesa-selecao' : 'dados')} />
      )}
      {tela === 'pagamento' && (
        <TelaPagamento dados={dados} tipo={tipo}
          itens={carrinho.itens} total={carrinho.total} obs={obs}
          taxaEntrega={cardapioState.taxaEntrega ?? 5}
          offline={offline}
          onEnviar={(num, wasOff) => { setNum(num || ''); setEraOff(wasOff); if (wasOff) setPend(carregarPendentes().length); setTela('confirmado') }}
          onVoltar={() => setTela('cardapio')} />
      )}
      {tela === 'confirmado' && (
        <TelaConfirmado numeroPedido={numeroPedido} tipo={tipo} dados={dados}
          total={carrinho.total + taxa} eraOffline={eraOffline} pendentes={pendentes}
          onNovoPedido={novoFluxo}
          onMaisItens={voltarParaCardapio} />
      )}
    </div>
  )
}
