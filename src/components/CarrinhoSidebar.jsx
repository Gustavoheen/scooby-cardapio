import { CONFIG } from '../config'

export function CarrinhoSidebar({ itens, subtotal, remover, adicionar, onFinalizar, taxaEntrega = CONFIG.taxaEntrega }) {
  const total = subtotal + taxaEntrega

  return (
    <div className="bg-scooby-card border border-scooby-borda rounded-2xl flex flex-col max-h-[calc(100vh-8rem)] overflow-hidden">

      {/* Cabeçalho */}
      <div className="p-4 border-b border-scooby-borda flex-shrink-0">
        <h2 className="text-scooby-amarelo font-bold text-lg">🛒 Seu Pedido</h2>
      </div>

      {/* Vazio */}
      {itens.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <span className="text-5xl mb-3">🍔</span>
          <p className="text-gray-400 text-sm">Adicione itens do cardápio ao lado para começar seu pedido!</p>
        </div>
      )}

      {/* Lista de itens */}
      {itens.length > 0 && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {itens.map(linha => (
              <div key={linha.chave} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium leading-tight">
                    {linha.item.nome}
                    {linha.variacao && <span className="text-gray-400 text-xs ml-1">({linha.variacao})</span>}
                  </p>
                  <p className="text-scooby-amarelo text-xs mt-0.5">
                    R$ {(linha.preco * linha.qtd).toFixed(2).replace('.', ',')}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => remover(linha.chave)}
                    className="w-7 h-7 rounded-full bg-scooby-borda hover:bg-red-800 text-white font-bold flex items-center justify-center transition text-sm"
                  >−</button>
                  <span className="text-white font-bold w-5 text-center text-sm">{linha.qtd}</span>
                  <button
                    onClick={() => adicionar(linha.item, linha.variacao ? { label: linha.variacao, preco: linha.preco } : null)}
                    className="w-7 h-7 rounded-full bg-scooby-vermelho hover:bg-red-700 text-white font-bold flex items-center justify-center transition text-sm"
                  >+</button>
                </div>
              </div>
            ))}
          </div>

          {/* Totais + botão */}
          <div className="border-t border-scooby-borda p-4 flex-shrink-0 space-y-2">
            <div className="flex justify-between text-gray-400 text-sm">
              <span>Subtotal</span>
              <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="flex justify-between text-gray-400 text-sm">
              <span>Taxa de entrega</span>
              <span>R$ {taxaEntrega.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="flex justify-between text-white font-bold text-base pt-1 border-t border-scooby-borda">
              <span>Total</span>
              <span className="text-scooby-amarelo">R$ {total.toFixed(2).replace('.', ',')}</span>
            </div>
            <button
              onClick={onFinalizar}
              className="w-full mt-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition active:scale-95"
            >
              Finalizar Pedido
            </button>
          </div>
        </>
      )}
    </div>
  )
}
