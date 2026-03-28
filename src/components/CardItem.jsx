import { useState } from 'react'
import { createPortal } from 'react-dom'

// ── Modal para selecionar sabor/proteína ──
function ModalVariacao({ item, campo, titulo, onEscolher, onFechar }) {
  const opcoes = item[campo]

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70" onClick={onFechar}>
      <div
        className="bg-scooby-card border border-scooby-borda rounded-2xl p-6 w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-scooby-amarelo font-bold text-base leading-tight mb-1">{item.nome}</h3>


        <p className="text-gray-700 font-semibold text-sm mb-3">{titulo}</p>
        <div className="flex flex-col gap-2">
          {opcoes.map(op => (
            <button
              key={op.label}
              onClick={() => onEscolher(op)}
              className="flex items-center justify-between bg-white hover:bg-scooby-vermelho border border-scooby-borda hover:border-scooby-amarelo text-gray-800 hover:text-white rounded-xl px-4 py-3 transition"
            >
              <span className="font-medium text-sm">{op.label}</span>
              <span className="text-scooby-amarelo font-bold">R$ {op.preco.toFixed(2).replace('.', ',')}</span>
            </button>
          ))}
        </div>

        <button onClick={onFechar} className="mt-4 w-full text-gray-500 hover:text-gray-800 text-xs transition">
          Cancelar
        </button>
      </div>
    </div>,
    document.body
  )
}

// ── Card principal ──
export function CardItem({ item, adicionar, lojaAberta = true, desativado = false }) {
  const [etapa, setEtapa] = useState(null)

  const temTamanhos  = !!item.tamanhos
  const temProteinas = !!item.proteinas
  const temVariacao  = temTamanhos || temProteinas

  function handleAdicionar() {
    if (temVariacao) {
      setEtapa('variacao')
    } else {
      adicionar(item)
    }
  }

  function handleVariacaoEscolhida(variacao) {
    adicionar(item, variacao)
    setEtapa(null)
  }

  function fechar() {
    setEtapa(null)
  }

  // Exibição de preço
  let precoExibido
  if (temProteinas) {
    const min = Math.min(...item.proteinas.map(p => p.preco))
    const max = Math.max(...item.proteinas.map(p => p.preco))
    precoExibido = min === max
      ? `R$ ${min.toFixed(2).replace('.', ',')}`
      : `A partir de R$ ${min.toFixed(2).replace('.', ',')}`
  } else if (temTamanhos) {
    precoExibido = `R$ ${item.tamanhos[0].preco.toFixed(2).replace('.', ',')} – R$ ${item.tamanhos[1].preco.toFixed(2).replace('.', ',')}`
  } else {
    precoExibido = `R$ ${item.preco.toFixed(2).replace('.', ',')}`
  }

  return (
    <>
      {/* Card horizontal — imagem à direita */}
      <div className={`bg-scooby-card border rounded-xl overflow-hidden flex flex-row transition-all ${desativado ? 'border-gray-200 opacity-60' : 'border-scooby-borda hover:border-scooby-amarelo/60 hover:shadow-md hover:shadow-pink-100'}`}>

        {/* Conteúdo à esquerda */}
        <div className="flex-1 min-w-0 p-3 flex flex-col justify-between">
          <div>
            <h3 className="text-gray-800 font-bold text-sm leading-tight line-clamp-2 mb-1">{item.nome}</h3>

            {temVariacao && (
              <p className="text-xs text-gray-500 mt-1 italic">Escolha o sabor ao adicionar</p>
            )}
          </div>

          {/* Preço + botão */}
          <div className="flex items-center justify-between mt-2">
            <span className={`font-black text-sm ${desativado ? 'text-gray-500' : 'text-scooby-amarelo'}`}>{precoExibido}</span>
            <button
              onClick={(!lojaAberta || desativado) ? undefined : handleAdicionar}
              disabled={!lojaAberta || desativado}
              className={`flex items-center justify-center w-8 h-8 rounded-lg font-bold text-lg transition active:scale-95 flex-shrink-0 ${
                desativado
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : lojaAberta
                    ? 'bg-scooby-vermelho hover:bg-pink-800 text-white cursor-pointer'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {desativado ? '✕' : lojaAberta ? '+' : '✕'}
            </button>
          </div>
        </div>

        {/* Imagem à direita */}
        <div className="relative flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 self-center m-2 rounded-lg overflow-hidden ring-2 ring-pink-200">
          {item.imagem ? (
            <>
              <img
                src={item.imagem}
                alt={item.nome}
                loading="lazy"
                className="w-full h-full object-cover"
              />
              {desativado && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white text-xs font-semibold text-center px-1">Esgotado</span>
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full bg-pink-50 flex items-center justify-center">
              <span className="text-3xl">🍫</span>
            </div>
          )}
        </div>

      </div>

      {etapa === 'variacao' && temTamanhos && (
        <ModalVariacao
          item={item}
          campo="tamanhos"
          titulo="Escolha o tamanho:"
          onEscolher={handleVariacaoEscolhida}
          onFechar={fechar}
        />
      )}

      {etapa === 'variacao' && temProteinas && (
        <ModalVariacao
          item={item}
          campo="proteinas"
          titulo="Escolha o sabor:"
          onEscolher={handleVariacaoEscolhida}
          onFechar={fechar}
        />
      )}
    </>
  )
}
