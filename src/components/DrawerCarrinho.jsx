import { useEffect } from 'react'
import { CONFIG } from '../config'

export function DrawerCarrinho({ itens, subtotal, remover, adicionar, onFechar, onFinalizar, taxaEntrega = CONFIG.taxaEntrega }) {
  const total = subtotal + taxaEntrega

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  if (itens.length === 0) {
    return (
      <div className="fixed inset-0 z-40 flex justify-end" onClick={onFechar}>
        <div className="fixed inset-0 bg-black/60" />
        <div
          className="relative z-50 w-full max-w-sm bg-scooby-card h-full flex flex-col items-center justify-center p-8"
          onClick={e => e.stopPropagation()}
        >
          <span className="text-6xl mb-4">🛒</span>
          <p className="text-gray-400 text-center">Seu carrinho está vazio.<br />Adicione itens do cardápio!</p>
          <button onClick={onFechar} className="mt-6 text-scooby-amarelo hover:underline">Fechar</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onFechar}>
      <div className="fixed inset-0 bg-black/60" />
      <div
        className="relative z-50 w-full max-w-sm bg-scooby-card flex flex-col h-full"
        onClick={e => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-4 border-b border-scooby-borda">
          <h2 className="text-scooby-amarelo font-bold text-lg">🛒 Seu Pedido</h2>
          <button onClick={onFechar} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        {/* Itens */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {itens.map(linha => (
            <div key={linha.chave} className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-gray-800 text-sm font-medium truncate">
                  {linha.item.nome}
                  {linha.variacao && <span className="text-gray-400 text-xs ml-1">({linha.variacao})</span>}
                </p>
                <p className="text-scooby-amarelo text-xs">
                  R$ {(linha.preco * linha.qtd).toFixed(2).replace('.', ',')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => remover(linha.chave)}
                  className="w-7 h-7 rounded-full bg-scooby-borda hover:bg-red-800 text-gray-700 hover:text-white font-bold flex items-center justify-center transition"
                >
                  −
                </button>
                <span className="text-gray-800 font-bold w-4 text-center">{linha.qtd}</span>
                <button
                  onClick={() => adicionar(linha.item, linha.variacao ? { label: linha.variacao, preco: linha.preco } : null)}
                  className="w-7 h-7 rounded-full bg-scooby-vermelho hover:bg-red-700 text-white font-bold flex items-center justify-center transition"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Totais e botão finalizar */}
        <div className="border-t border-scooby-borda p-4 space-y-2">
          <div className="flex justify-between text-gray-400 text-sm">
            <span>Subtotal</span>
            <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
          </div>
          <div className="flex justify-between text-gray-400 text-sm">
            <span>Taxa de entrega</span>
            <span>R$ {taxaEntrega.toFixed(2).replace('.', ',')}</span>
          </div>
          <div className="flex justify-between text-gray-800 font-bold text-lg">
            <span>Total</span>
            <span className="text-scooby-amarelo">R$ {total.toFixed(2).replace('.', ',')}</span>
          </div>
          <button
            onClick={onFinalizar}
            className="w-full mt-2 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition active:scale-95"
          >
            Finalizar Pedido
          </button>
        </div>
      </div>
    </div>
  )
}
