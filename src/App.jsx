import { useState, useEffect, useRef } from 'react'

function BannerCupom({ cupons }) {
  const agora = Date.now()
  const cupom = (cupons || []).find(c =>
    c.ativo && c.codigo &&
    (!c.validadeAte || new Date(c.validadeAte).getTime() > agora)
  )

  const [tempo, setTempo] = useState('')

  useEffect(() => {
    if (!cupom?.validadeAte) { setTempo(''); return }
    function atualizar() {
      const diff = new Date(cupom.validadeAte).getTime() - Date.now()
      if (diff <= 0) { setTempo('Expirado'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTempo(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }
    atualizar()
    const id = setInterval(atualizar, 1000)
    return () => clearInterval(id)
  }, [cupom?.validadeAte])

  if (!cupom) return null

  const desconto = cupom.tipo === 'percentual'
    ? `${cupom.valor}% de desconto`
    : `R$ ${Number(cupom.valor).toFixed(2).replace('.', ',')} de desconto`

  return (
    <div className="bg-gradient-to-r from-emerald-900 via-green-800 to-emerald-900 border-b border-emerald-600/60 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-3 text-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl animate-bounce">🎟</span>
          <div>
            <p className="text-white font-black text-sm sm:text-base">
              Oferta especial! <span className="text-scooby-amarelo">{desconto}</span>
            </p>
            <p className="text-emerald-300 text-xs">
              Use o código{' '}
              <span className="font-mono font-black text-white bg-emerald-700 px-2 py-0.5 rounded tracking-widest">{cupom.codigo}</span>
              {' '}na hora de pedir
            </p>
          </div>
        </div>
        {tempo && tempo !== 'Expirado' && (
          <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-xl">
            <span className="text-emerald-400 text-xs font-semibold">⏱ Acaba em</span>
            <span className="text-white font-black text-lg font-mono tracking-widest">{tempo}</span>
          </div>
        )}
        {tempo === 'Expirado' && (
          <span className="text-red-400 text-xs font-semibold">Cupom expirado</span>
        )}
        {!cupom.validadeAte && (
          <span className="text-emerald-400 text-xs font-semibold italic">Por tempo limitado!</span>
        )}
      </div>
    </div>
  )
}

function ContadorFechamento({ horarioFechamento, lojaStatus }) {
  const [tempo, setTempo] = useState('')
  useEffect(() => {
    if (lojaStatus === 'aberta' || lojaStatus === 'fechada') { setTempo(''); return }
    function calcTempo() {
      const agora = new Date()
      const [hF, mF] = horarioFechamento.split(':').map(Number)
      const fechamento = new Date()
      fechamento.setHours(hF, mF, 0, 0)
      const diff = fechamento.getTime() - agora.getTime()
      if (diff <= 0) { setTempo(''); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTempo(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }
    calcTempo()
    const id = setInterval(calcTempo, 1000)
    return () => clearInterval(id)
  }, [horarioFechamento, lojaStatus])
  if (!tempo) return null
  return (
    <div className="flex items-center gap-1.5 bg-black/30 px-2.5 py-1 rounded-xl ml-auto">
      <span className="text-orange-400 text-xs font-semibold">⏱ Encerra em</span>
      <span className="text-white font-black text-sm font-mono tracking-widest">{tempo}</span>
    </div>
  )
}

import Admin from './pages/Admin'
import AcompanharPedido from './pages/AcompanharPedido'
import Garcom from './pages/Garcom'
import { categorias, ADICIONAIS } from './data/cardapio'
import { useCarrinho } from './hooks/useCarrinho'
import { CardItem } from './components/CardItem'
import { DrawerCarrinho } from './components/DrawerCarrinho'
import { CarrinhoSidebar } from './components/CarrinhoSidebar'
import { ModalPedido } from './components/ModalPedido'
import { CONFIG } from './config'

function calcLojaAberta(state) {
  if (import.meta.env.DEV || window.location.hostname.endsWith('vercel.app')) return true
  const status = state.lojaStatus
  if (status === 'aberta') return true
  if (status === 'fechada') return false
  // 'auto' ou indefinido: verifica horário
  const abertura  = state.horarioAbertura  || CONFIG.horarioAbertura
  const fechamento = state.horarioFechamento || CONFIG.horarioFechamento
  const agora = new Date()
  const [hA, mA] = abertura.split(':').map(Number)
  const [hF, mF] = fechamento.split(':').map(Number)
  const minAgora  = agora.getHours() * 60 + agora.getMinutes()
  const minAbertu = hA * 60 + mA
  const minFecha  = hF * 60 + mF
  const diasPermitidos = state.diasFuncionamento ?? [0,1,2,3,4,5,6]
  if (!diasPermitidos.includes(agora.getDay())) return false
  return minAgora >= minAbertu && minAgora < minFecha
}

export default function App() {
  if (window.location.pathname === '/admin') return <Admin />
  if (window.location.pathname === '/acompanhar') return <AcompanharPedido />
  if (window.location.pathname === '/garcom') return <Garcom />

  const [categoriaAtiva, setCategoriaAtiva] = useState(categorias[0].id)
  const [drawerAberto, setDrawerAberto] = useState(false)
  const [modalAberto, setModalAberto] = useState(false)
  const [pedidoConcluido, setPedidoConcluido] = useState(false)
  const [modalAdmin, setModalAdmin] = useState(false)
  const [senhaAdmin, setSenhaAdmin] = useState('')
  const [erroAdmin, setErroAdmin] = useState(false)
  const [cardapioState, setCardapioState] = useState({ precos: {}, desativados: [] })

  const lojaAberta = calcLojaAberta(cardapioState)

  useEffect(() => {
    fetch('/api/cardapio-state').then(r => r.json()).then(setCardapioState).catch(() => {})
  }, [])

  // Auto-atualização: verifica novo deploy a cada 60s e recarrega silenciosamente
  useEffect(() => {
    let versaoAtual = null
    async function checarVersao() {
      try {
        const r = await fetch('/api/version')
        const { version } = await r.json()
        if (!versaoAtual) { versaoAtual = version; return }
        if (version !== versaoAtual) window.location.reload()
      } catch {}
    }
    checarVersao()
    const id = setInterval(checarVersao, 60000)
    return () => clearInterval(id)
  }, [])

  // Mantém ref atualizada com estado atual (usada no effect de limpeza)
  const cardapioStateRef = useRef(cardapioState)
  useEffect(() => { cardapioStateRef.current = cardapioState }, [cardapioState])

  // Auto-limpeza: quando a loja fecha no horário agendado (modo auto), apaga combos e cupons
  useEffect(() => {
    function verificarFechamento() {
      const state = cardapioStateRef.current
      const isAuto = !state.lojaStatus || state.lojaStatus === 'auto'
      if (!isAuto) return
      if (calcLojaAberta(state)) return
      const temPromos = (state.promocoes || []).length > 0
      const temCupons = (state.cupons || []).length > 0
      if (!temPromos && !temCupons) return
      fetch('/api/cardapio-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...state, promocoes: [], cupons: [] }),
      }).then(() => {
        setCardapioState(prev => ({ ...prev, promocoes: [], cupons: [] }))
      }).catch(() => {})
    }
    verificarFechamento()
    const id = setInterval(verificarFechamento, 60000)
    return () => clearInterval(id)
  }, [])

  const taxaEntrega = cardapioState.taxaEntrega ?? CONFIG.taxaEntrega
  const tempoEntrega = cardapioState.tempoEntrega ?? CONFIG.tempoEntrega

  const adicionaisDisponiveis = ADICIONAIS
    .filter(ad => !cardapioState.desativados.includes(ad.id))
    .map(ad => {
      const override = cardapioState.precos[ad.id]
      return override !== undefined ? { ...ad, preco: override } : ad
    })

  function aplicarOverrides(itens) {
    const precosVariacoes = cardapioState.precosVariacoes || {}
    return itens.map(item => {
      const desativado = cardapioState.desativados.includes(item.id)
      const precoOverride = cardapioState.precos[String(item.id)]

      let itemAtualizado = { ...item }

      if (precoOverride && !item.proteinas && !item.tamanhos) {
        itemAtualizado = { ...itemAtualizado, preco: precoOverride }
      }
      if (item.proteinas) {
        itemAtualizado = {
          ...itemAtualizado,
          proteinas: item.proteinas.map(p => {
            const chave = `${item.id}-${p.label}`
            return precosVariacoes[chave] !== undefined ? { ...p, preco: precosVariacoes[chave] } : p
          }),
        }
      }
      if (item.tamanhos) {
        itemAtualizado = {
          ...itemAtualizado,
          tamanhos: item.tamanhos.map(t => {
            const chave = `${item.id}-${t.label}`
            return precosVariacoes[chave] !== undefined ? { ...t, preco: precosVariacoes[chave] } : t
          }),
        }
      }
      return desativado ? { ...itemAtualizado, _desativado: true } : itemAtualizado
    })
  }

  function handleLoginAdmin(e) {
    e.preventDefault()
    if (senhaAdmin === 'scooby2024') {
      window.location.href = '/admin'
    } else {
      setErroAdmin(true)
      setSenhaAdmin('')
      setTimeout(() => setErroAdmin(false), 3000)
    }
  }

  const { itens, adicionar, remover, limpar, totalItens, subtotal } = useCarrinho()

  const combosAtivos = (cardapioState.promocoes || []).filter(p => p.ativo && p.nome && p.precoCombo)

  function adicionarCombo(combo) {
    const nomeCombo = combo.itens.map(it => `${it.quantidade}x ${it.label}`).join(' + ')
    adicionar({ id: `combo-${combo.id}`, nome: combo.nome || nomeCombo, preco: parseFloat(combo.precoCombo) })
  }

  const categoriaExibida = categorias.find(c => c.id === categoriaAtiva)
  const conteudoRef = useRef(null)
  const scrollCategoriasRef = useRef(null)

  function handleCategoriaChange(catId) {
    setCategoriaAtiva(catId)
    if (conteudoRef.current) {
      const top = conteudoRef.current.getBoundingClientRect().top + window.scrollY - 56
      if (window.scrollY > top) {
        window.scrollTo({ top, behavior: 'smooth' })
      }
    }
  }

  function handleFinalizar() {
    setDrawerAberto(false)
    setModalAberto(true)
  }

  function handleConcluir() {
    limpar()
    setModalAberto(false)
    setPedidoConcluido(true)
    setTimeout(() => setPedidoConcluido(false), 5000)
  }

  return (
    <div className="min-h-[100dvh] bg-scooby-escuro text-white relative">

      {/* Watermark desktop — logo centralizada e transparente cobrindo a página toda */}
      <div
        className="hidden lg:block fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: 'url(/logo-desktop.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.07,
        }}
      />

      {/* Watermark mobile — banner cobrindo a página toda */}
      <div
        className="block lg:hidden fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: 'url(/logo-mobile.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
          opacity: 0.08,
        }}
      />

      {/* ── BANNER CUPOM ── */}
      <BannerCupom cupons={cardapioState.cupons} />

      {/* ── HERO / HEADER ── */}
      <header className="relative z-10 border-b border-scooby-borda/50">

        {/* Botão admin — canto superior direito */}
        <div className="absolute top-3 right-4 z-10">
          <button
            onClick={() => setModalAdmin(true)}
            className="text-gray-500 hover:text-gray-300 transition text-xs flex items-center gap-1"
            title="Área administrativa"
          >
            ⚙️ Admin
          </button>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-10 flex flex-col items-center gap-4">
          {/* Logo principal — só no desktop (no mobile o fundo já é a imagem) */}
          <img
            src="/logo-desktop.png"
            alt="Scooby-Doo Lanches"
            className="hidden lg:block w-40 h-40 object-contain drop-shadow-2xl"
          />

          <div className="text-center">
            <h1 className="text-scooby-amarelo font-black text-3xl tracking-wide uppercase drop-shadow">
              Scooby-Doo Lanches
            </h1>
            <p className="text-gray-300 lg:text-gray-400 text-sm mt-1">Hamburgueria &amp; Delivery — {CONFIG.cidade}</p>

            <div className="flex flex-wrap justify-center gap-2 mt-3">
              <span className={`text-xs px-3 py-1.5 rounded-full font-semibold border ${lojaAberta ? 'bg-green-900/50 border-green-700 text-green-400' : 'bg-red-900/50 border-red-700 text-red-400'}`}>
                {lojaAberta ? '🟢 Aberto agora' : '🔴 Fechado agora'}
              </span>
              <span className="bg-scooby-card border border-scooby-borda text-gray-300 text-xs px-3 py-1.5 rounded-full">
                ⏰ {cardapioState.horarioAbertura || CONFIG.horarioAbertura} – {cardapioState.horarioFechamento || CONFIG.horarioFechamento}
              </span>
              <span className="bg-scooby-card border border-scooby-borda text-gray-300 text-xs px-3 py-1.5 rounded-full">
                🚗 Entrega R$ {taxaEntrega.toFixed(2).replace('.', ',')}
              </span>
              <span className="bg-scooby-card border border-scooby-borda text-gray-300 text-xs px-3 py-1.5 rounded-full">
                ⏱ {tempoEntrega}
              </span>
              <a
                href="/acompanhar"
                className="bg-blue-900/50 border border-blue-700 text-blue-300 hover:text-white hover:bg-blue-800 text-xs px-3 py-1.5 rounded-full transition font-semibold"
              >
                📍 Acompanhar pedido
              </a>
            </div>

            {!lojaAberta && (
              <div className="mt-4 bg-red-900/40 border border-red-700/60 text-red-300 text-sm font-medium px-5 py-3 rounded-2xl text-center max-w-sm">
                😴 Estamos fechados no momento.<br />
                <span className="text-red-400 font-bold">Abrimos às {cardapioState.horarioAbertura || CONFIG.horarioAbertura}h</span>
              </div>
            )}
          </div>

          {/* Botão carrinho — tablet */}
          {totalItens > 0 && (
            <button
              onClick={() => setDrawerAberto(true)}
              className="hidden sm:flex lg:hidden items-center gap-3 bg-scooby-vermelho hover:bg-red-700 text-white font-bold py-3 px-6 rounded-2xl shadow-lg transition"
            >
              <span className="bg-black/30 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">{totalItens}</span>
              <span>Meu pedido</span>
              <span className="text-yellow-300">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
            </button>
          )}
        </div>
      </header>

      {/* ── ABAS DE CATEGORIA ── */}
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur border-b border-scooby-borda shadow-lg">
        <div className="max-w-7xl mx-auto px-3">
          <div className="relative">
            <div ref={scrollCategoriasRef} className="flex overflow-x-auto gap-1.5 py-2.5" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
              {categorias.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoriaChange(cat.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition whitespace-nowrap ${
                    categoriaAtiva === cat.id
                      ? 'bg-scooby-amarelo text-black shadow'
                      : 'text-gray-400 hover:text-white hover:bg-scooby-borda'
                  }`}
                >
                  {cat.emoji} {cat.nome.split(' ').slice(1).join(' ')}
                </button>
              ))}
              <div className="flex-shrink-0 w-8" />
            </div>
            {/* Gradiente + seta clicável */}
            <div
              className="absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-black/90 to-transparent cursor-pointer flex items-center justify-center"
              onClick={() => {
                const el = scrollCategoriasRef.current
                if (!el) return
                const novaPos = el.scrollLeft + el.clientWidth * 0.6
                if (novaPos >= el.scrollWidth - el.clientWidth - 5) {
                  el.scrollTo({ left: 0, behavior: 'smooth' })
                } else {
                  el.scrollTo({ left: novaPos, behavior: 'smooth' })
                }
              }}
            >
              <span className="text-scooby-vermelho font-bold text-lg animate-bounce-x">›</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── LAYOUT PRINCIPAL ── */}
      <div ref={conteudoRef} className="relative z-10 max-w-7xl mx-auto px-4 py-6">

        {/* Combos/Promoções */}
        {combosAtivos.length > 0 && (
          <div className="mb-6">
            <h2 className="text-white font-bold text-lg mb-3 flex items-center gap-2 flex-wrap">
              <span className="w-1 h-6 bg-scooby-vermelho rounded-full inline-block"></span>
              🎉 Promoções do Dia
              <ContadorFechamento
                horarioFechamento={cardapioState.horarioFechamento || CONFIG.horarioFechamento}
                lojaStatus={cardapioState.lojaStatus}
              />
            </h2>
            <div className="flex flex-col gap-2">
              {combosAtivos.map(combo => {
                const descricaoItens = combo.itens.map(it => `${it.quantidade}x ${it.label}`).join(' + ')
                return (
                  <div key={combo.id} className="bg-scooby-card border border-scooby-vermelho/60 rounded-xl px-3 py-2.5 flex items-center gap-3 hover:border-scooby-amarelo transition-all">
                    <span className="text-xl flex-shrink-0">🎉</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm leading-tight">{combo.nome}</p>
                      <p className="text-gray-500 text-xs truncate">{descricaoItens}{combo.descricao ? ` · ${combo.descricao}` : ''}</p>
                    </div>
                    <span className="text-green-400 font-black text-sm flex-shrink-0">R$ {Number(combo.precoCombo).toFixed(2).replace('.', ',')}</span>
                    <button
                      onClick={lojaAberta ? () => adicionarCombo(combo) : undefined}
                      disabled={!lojaAberta}
                      className={`flex-shrink-0 w-9 h-9 rounded-xl font-bold text-xl flex items-center justify-center transition active:scale-90 ${lojaAberta ? 'bg-scooby-vermelho hover:bg-red-700 text-white' : 'bg-scooby-borda text-gray-500 cursor-not-allowed'}`}
                    >+</button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Layout flex original */}
        <div className="lg:flex lg:gap-8 lg:items-start">

          {/* Cardápio */}
          <main className="flex-1 pb-32 lg:pb-6">
            <h2 className="text-white font-bold text-lg mb-5 flex items-center gap-2">
              <span className="w-1 h-6 bg-scooby-amarelo rounded-full inline-block"></span>
              {categoriaExibida.nome}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {aplicarOverrides(categoriaExibida.itens).map(item => (
                <CardItem
                  key={item.id}
                  item={item}
                  adicionar={adicionar}
                  lojaAberta={lojaAberta}
                  desativado={cardapioState.desativados.includes(item.id)}
                  adicionaisDisponiveis={adicionaisDisponiveis}
                />
              ))}
            </div>
          </main>

          {/* Sidebar carrinho — desktop */}
          <aside className="hidden lg:block w-80 xl:w-96 flex-shrink-0 sticky top-16">
            <CarrinhoSidebar
              itens={itens}
              subtotal={subtotal}
              remover={remover}
              adicionar={adicionar}
              onFinalizar={handleFinalizar}
              taxaEntrega={taxaEntrega}
            />
          </aside>
        </div>
      </div>

      {/* ── RODAPÉ ── */}
      <footer className="border-t border-scooby-borda mt-4 py-8 text-center">
        <img src="/logo-nova.png" alt="Scooby-Doo Lanches" className="w-20 h-20 object-contain mx-auto mb-3 opacity-70" />
        <p className="text-gray-500 text-xs">© {new Date().getFullYear()} Scooby-Doo Lanches — Todos os direitos reservados</p>
        <p className="text-gray-600 text-xs mt-1">{CONFIG.cidade}</p>
      </footer>

      {/* ── BOTÃO FLUTUANTE — mobile ── */}
      {totalItens > 0 && !drawerAberto && !modalAberto && lojaAberta && (
        <div className="fixed bottom-[env(safe-area-inset-bottom,20px)] left-0 right-0 z-30 flex justify-center px-4 lg:hidden" style={{ bottom: 'max(20px, env(safe-area-inset-bottom))' }}>
          <button
            onClick={() => setDrawerAberto(true)}
            className="w-full max-w-sm bg-scooby-vermelho hover:bg-red-700 text-white font-bold py-4 px-6 rounded-2xl shadow-2xl flex items-center justify-between transition active:scale-95"
          >
            <span className="bg-black/30 text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center">
              {totalItens}
            </span>
            <span>Ver meu pedido</span>
            <span className="text-yellow-300 font-semibold">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
          </button>
        </div>
      )}

      {/* ── TOAST ── */}
      {pedidoConcluido && (
        <div className="fixed top-6 left-0 right-0 flex justify-center z-50 px-4">
          <div className="bg-green-600 text-white font-bold py-3 px-6 rounded-2xl shadow-xl text-sm">
            ✅ Pedido enviado! Acompanhe pelo WhatsApp.
          </div>
        </div>
      )}

      {/* ── DRAWER — mobile ── */}
      {drawerAberto && (
        <DrawerCarrinho
          itens={itens}
          subtotal={subtotal}
          remover={remover}
          adicionar={adicionar}
          onFechar={() => setDrawerAberto(false)}
          onFinalizar={handleFinalizar}
          taxaEntrega={taxaEntrega}
        />
      )}

      {/* ── MODAL PEDIDO ── */}
      {modalAberto && (
        <ModalPedido
          itens={itens}
          subtotal={subtotal}
          onFechar={() => setModalAberto(false)}
          onConcluir={handleConcluir}
          taxaEntrega={taxaEntrega}
          cupons={cardapioState.cupons || []}
          tempoEntrega={tempoEntrega}
          pixChave={cardapioState.pixChave}
          pixTipo={cardapioState.pixTipo}
          pixNome={cardapioState.pixNome}
          whatsappNumero={cardapioState.whatsappNumero}
          adicionar={adicionar}
          remover={remover}
        />
      )}

      {/* ── MODAL LOGIN ADMIN ── */}
      {modalAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-scooby-card border border-scooby-borda rounded-2xl p-7 w-full max-w-xs text-center">
            <img src="/logo-nova.png" alt="Logo" className="w-16 h-16 object-contain mx-auto mb-4" />
            <h2 className="text-scooby-amarelo font-bold text-lg mb-1">Área Administrativa</h2>
            <p className="text-gray-400 text-xs mb-5">Digite a senha para acessar o painel</p>
            <form onSubmit={handleLoginAdmin} className="space-y-3">
              <input
                type="password"
                placeholder="Senha"
                value={senhaAdmin}
                onChange={e => setSenhaAdmin(e.target.value)}
                autoFocus
                className={`w-full bg-scooby-escuro border text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition ${
                  erroAdmin ? 'border-red-500' : 'border-scooby-borda focus:border-scooby-amarelo'
                }`}
              />
              {erroAdmin && <p className="text-red-400 text-xs">Senha incorreta. Tente novamente.</p>}
              <button
                type="submit"
                className="w-full bg-scooby-vermelho hover:bg-red-700 text-white font-bold py-3 rounded-xl transition"
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => { setModalAdmin(false); setSenhaAdmin(''); setErroAdmin(false) }}
                className="w-full text-gray-500 hover:text-white text-xs transition py-1"
              >
                Cancelar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
