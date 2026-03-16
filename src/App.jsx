import { useState, useEffect, useRef } from 'react'
import Admin from './pages/Admin'
import { categorias, ADICIONAIS } from './data/cardapio'
import { useCarrinho } from './hooks/useCarrinho'
import { CardItem } from './components/CardItem'
import { DrawerCarrinho } from './components/DrawerCarrinho'
import { CarrinhoSidebar } from './components/CarrinhoSidebar'
import { ModalPedido } from './components/ModalPedido'
import { CONFIG } from './config'

function calcLojaAberta(state) {
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
  return minAgora >= minAbertu && minAgora < minFecha
}

export default function App() {
  if (window.location.pathname === '/admin') return <Admin />

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
    <div className="min-h-screen bg-scooby-escuro text-white relative">

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
          <div className="flex overflow-x-auto gap-1.5 py-2.5" style={{ scrollbarWidth: 'none' }}>
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
          </div>
        </div>
      </div>

      {/* ── LAYOUT PRINCIPAL ── */}
      <div ref={conteudoRef} className="relative z-10 max-w-7xl mx-auto px-4 py-6">

        {/* Combos/Promoções */}
        {combosAtivos.length > 0 && (
          <div className="mb-6">
            <h2 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
              <span className="w-1 h-6 bg-scooby-vermelho rounded-full inline-block"></span>
              🎉 Promoções do Dia
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {combosAtivos.map(combo => {
                const descricaoItens = combo.itens.map(it => `${it.quantidade}x ${it.label}`).join(' + ')
                return (
                  <div key={combo.id} className="bg-scooby-card border-2 border-scooby-vermelho rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden hover:border-scooby-amarelo transition-all hover:shadow-lg hover:shadow-black/30">
                    <div className="absolute top-3 right-3">
                      <span className="bg-scooby-vermelho text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">PROMOÇÃO</span>
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-base leading-tight pr-20">{combo.nome}</h3>
                      <p className="text-gray-400 text-xs mt-1 leading-relaxed">{descricaoItens}</p>
                      {combo.descricao && <p className="text-green-400 text-xs font-semibold mt-1">🎉 {combo.descricao}</p>}
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-scooby-borda">
                      <span className="text-green-400 font-black text-lg">R$ {Number(combo.precoCombo).toFixed(2).replace('.', ',')}</span>
                      <button
                        onClick={lojaAberta ? () => adicionarCombo(combo) : undefined}
                        disabled={!lojaAberta}
                        className={`flex items-center gap-1.5 font-bold text-sm px-4 py-2 rounded-xl transition active:scale-95 ${lojaAberta ? 'bg-scooby-vermelho hover:bg-red-700 text-white cursor-pointer' : 'bg-scooby-borda text-gray-500 cursor-not-allowed'}`}
                      >
                        <span className="text-lg leading-none">+</span>
                        {lojaAberta ? 'Adicionar' : 'Fechado'}
                      </button>
                    </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
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
        <div className="fixed bottom-5 left-0 right-0 z-30 flex justify-center px-4 lg:hidden">
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
