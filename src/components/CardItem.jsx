import { useState } from 'react'
import { createPortal } from 'react-dom'
import { ADICIONAIS, categorias } from '../data/cardapio'

const BEBIDAS = categorias.find(c => c.id === 'bebidas')?.itens || []

// ── Modal genérico para selecionar variação (tamanho ou proteína) ──
function ModalVariacao({ item, campo, titulo, onEscolher, onFechar }) {
  const opcoes = item[campo]

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70" onClick={onFechar}>
      <div
        className="bg-scooby-card border border-scooby-borda rounded-2xl p-6 w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-scooby-amarelo font-bold text-base leading-tight mb-1">{item.nome}</h3>
        <p className="text-gray-400 text-xs mb-4">{item.descricao}</p>

        <p className="text-white font-semibold text-sm mb-3">{titulo}</p>
        <div className="flex flex-col gap-2">
          {opcoes.map(op => (
            <button
              key={op.label}
              onClick={() => onEscolher(op)}
              className="flex items-center justify-between bg-scooby-escuro hover:bg-scooby-vermelho border border-scooby-borda hover:border-scooby-amarelo text-white rounded-xl px-4 py-3 transition"
            >
              <span className="font-medium text-sm">{op.label}</span>
              <span className="text-scooby-amarelo font-bold">R$ {op.preco.toFixed(2).replace('.', ',')}</span>
            </button>
          ))}
        </div>

        <button onClick={onFechar} className="mt-4 w-full text-gray-500 hover:text-white text-xs transition">
          Cancelar
        </button>
      </div>
    </div>,
    document.body
  )
}

// ── Modal de adicionais ──
function ModalAdicionais({ adicionais, onContinuar, onPular }) {
  const [selecionados, setSelecionados] = useState([])

  function toggle(adicional) {
    setSelecionados(prev =>
      prev.find(a => a.id === adicional.id)
        ? prev.filter(a => a.id !== adicional.id)
        : [...prev, adicional]
    )
  }

  if (adicionais.length === 0) {
    // Sem adicionais disponíveis, pula direto
    return createPortal(
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70">
        <div className="bg-scooby-card border border-scooby-borda rounded-2xl p-6 w-full max-w-sm text-center">
          <p className="text-gray-400 text-sm mb-4">Nenhum adicional disponível no momento.</p>
          <button onClick={() => onContinuar([])} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition active:scale-95">
            Continuar →
          </button>
        </div>
      </div>,
      document.body
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70">
      <div className="bg-scooby-card border border-scooby-borda rounded-2xl p-6 w-full max-w-sm">
        <h3 className="text-scooby-amarelo font-bold text-base mb-1">Quer adicionar algo?</h3>
        <p className="text-gray-400 text-xs mb-4">Selecione os adicionais desejados</p>

        <div className="flex flex-col gap-2 mb-5">
          {adicionais.map(ad => {
            const marcado = selecionados.find(a => a.id === ad.id)
            return (
              <button
                key={ad.id}
                onClick={() => toggle(ad)}
                className={`flex items-center justify-between border rounded-xl px-4 py-3 transition ${
                  marcado
                    ? 'bg-scooby-vermelho border-scooby-amarelo text-white'
                    : 'bg-scooby-escuro border-scooby-borda text-white hover:border-gray-500'
                }`}
              >
                <span className="font-medium text-sm">{ad.emoji} {ad.nome}</span>
                <span className="text-scooby-amarelo font-bold text-sm">+ R$ {ad.preco.toFixed(2).replace('.', ',')}</span>
              </button>
            )
          })}
        </div>

        <button
          onClick={() => onContinuar(selecionados)}
          className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition active:scale-95 mb-2"
        >
          Continuar →
        </button>
        <button onClick={onPular} className="w-full text-gray-500 hover:text-white text-xs transition py-1">
          Pular
        </button>
      </div>
    </div>,
    document.body
  )
}

// ── Modal de bebidas ──
function ModalBebidas({ onEscolher, onPular }) {
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70">
      <div className="bg-scooby-card border border-scooby-borda rounded-2xl p-6 w-full max-w-sm max-h-[85vh] flex flex-col">
        <h3 className="text-scooby-amarelo font-bold text-base mb-1">Quer beber algo?</h3>
        <p className="text-gray-400 text-xs mb-4">Escolha uma bebida para acompanhar</p>

        <div className="flex flex-col gap-2 overflow-y-auto flex-1 mb-4">
          {BEBIDAS.map(beb => (
            <button
              key={beb.id}
              onClick={() => onEscolher(beb)}
              className="flex items-center justify-between bg-scooby-escuro hover:bg-scooby-vermelho border border-scooby-borda hover:border-scooby-amarelo text-white rounded-xl px-4 py-3 transition"
            >
              <span className="font-medium text-sm">{beb.nome}</span>
              <span className="text-scooby-amarelo font-bold text-sm">R$ {beb.preco.toFixed(2).replace('.', ',')}</span>
            </button>
          ))}
        </div>

        <button onClick={onPular} className="w-full text-gray-500 hover:text-white text-xs transition py-1">
          Não, obrigado
        </button>
      </div>
    </div>,
    document.body
  )
}

// ── Card principal ──
export function CardItem({ item, adicionar, lojaAberta = true, desativado = false, adicionaisDisponiveis = ADICIONAIS }) {
  const [etapa, setEtapa] = useState(null) // null | 'variacao' | 'adicionais' | 'bebidas'
  const [variacaoEscolhida, setVariacaoEscolhida] = useState(null)

  const temTamanhos  = !!item.tamanhos
  const temProteinas = !!item.proteinas
  const temVariacao  = temTamanhos || temProteinas

  function handleAdicionar() {
    if (temVariacao) {
      setEtapa('variacao')
    } else {
      setEtapa('adicionais')
    }
  }

  function handleVariacaoEscolhida(variacao) {
    setVariacaoEscolhida(variacao)
    setEtapa('adicionais')
  }

  function handleAdicionaisContinuar(adicionais) {
    // Adiciona o item principal
    adicionar(item, variacaoEscolhida)
    // Adiciona cada adicional como item separado
    adicionais.forEach(ad => {
      adicionar({ id: ad.id, nome: ad.nome, preco: ad.preco })
    })
    setEtapa('bebidas')
  }

  function handleAdicionaisPular() {
    adicionar(item, variacaoEscolhida)
    setEtapa('bebidas')
  }

  function handleBebidaEscolhida(bebida) {
    adicionar(bebida)
    fechar()
  }

  function fechar() {
    setEtapa(null)
    setVariacaoEscolhida(null)
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
      <div className={`bg-scooby-card border rounded-2xl overflow-hidden flex flex-col transition-all ${desativado ? 'border-gray-700 opacity-60' : 'border-scooby-borda hover:border-scooby-amarelo/40 hover:shadow-lg hover:shadow-black/30'}`}>

        {/* Foto do produto */}
        {item.imagem ? (
          <div className="relative w-full" style={{ paddingBottom: '56.25%' /* 16:9 */ }}>
            <img
              src={item.imagem}
              alt={item.nome}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
            />
            {desativado && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="bg-gray-800 text-gray-300 text-xs font-semibold px-3 py-1 rounded-full border border-gray-600">
                  Esgotado
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full bg-gray-800/60" style={{ paddingBottom: '56.25%' }} />
        )}

        {/* Conteúdo do card */}
        <div className="p-4 flex flex-col flex-1 justify-between">
          <div>
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="text-white font-bold text-base leading-tight">{item.nome}</h3>
              {desativado && !item.imagem && (
                <span className="flex-shrink-0 bg-gray-700 text-gray-400 text-xs font-semibold px-2 py-0.5 rounded-full">
                  Esgotado
                </span>
              )}
            </div>
            <p className="text-gray-400 text-xs leading-relaxed mb-1">{item.descricao}</p>

            {temTamanhos && (
              <div className="flex gap-2 mb-3 flex-wrap">
                {item.tamanhos.map(t => (
                  <span key={t.label} className="text-xs bg-scooby-borda text-gray-300 px-2.5 py-1 rounded-full">
                    {t.label}: R$ {t.preco.toFixed(2).replace('.', ',')}
                  </span>
                ))}
              </div>
            )}

            {temProteinas && (
              <div className="flex gap-1 mb-3 flex-wrap">
                {item.proteinas.map(p => (
                  <span key={p.label} className="text-xs bg-scooby-borda text-gray-300 px-2.5 py-1 rounded-full">
                    {p.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-scooby-borda">
            <span className={`font-black text-base ${desativado ? 'text-gray-500' : 'text-scooby-amarelo'}`}>{precoExibido}</span>
            <button
              onClick={(!lojaAberta || desativado) ? undefined : handleAdicionar}
              disabled={!lojaAberta || desativado}
              className={`flex items-center gap-1.5 font-bold text-sm px-4 py-2 rounded-xl transition active:scale-95 ${
                desativado
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : lojaAberta
                    ? 'bg-scooby-vermelho hover:bg-red-700 text-white cursor-pointer'
                    : 'bg-scooby-borda text-gray-500 cursor-not-allowed'
              }`}
            >
              <span className="text-lg leading-none">+</span>
              {desativado ? 'Esgotado' : lojaAberta ? 'Adicionar' : 'Fechado'}
            </button>
          </div>
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
          titulo="Escolha o tipo de proteína:"
          onEscolher={handleVariacaoEscolhida}
          onFechar={fechar}
        />
      )}

      {etapa === 'adicionais' && (
        <ModalAdicionais
          adicionais={adicionaisDisponiveis}
          onContinuar={handleAdicionaisContinuar}
          onPular={handleAdicionaisPular}
        />
      )}

      {etapa === 'bebidas' && (
        <ModalBebidas
          onEscolher={handleBebidaEscolhida}
          onPular={fechar}
        />
      )}
    </>
  )
}
