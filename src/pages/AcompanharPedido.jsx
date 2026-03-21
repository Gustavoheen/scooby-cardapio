import { useState, useEffect } from 'react'
import { CONFIG } from '../config'

const ETAPAS = [
  { key: 'recebido',        label: 'Pedido recebido',       icon: '📋' },
  { key: 'preparando',      label: 'Em preparo',            icon: '🍔' },
  { key: 'saiu_entrega',    label: 'Saiu para entrega',     icon: '🛵' },
  { key: 'pronto_retirada', label: 'Pronto para retirada',  icon: '🏠' },
  { key: 'entregue',        label: 'Entregue / Concluído',  icon: '✅' },
]

function ordemStatus(status) {
  const idx = { recebido: 0, preparando: 1, saiu_entrega: 2, pronto_retirada: 2, entregue: 3 }
  return idx[status] ?? 0
}

function TimelineStatus({ status, tipoEntrega }) {
  const etapas = tipoEntrega === 'Retirada'
    ? ETAPAS.filter(e => e.key !== 'saiu_entrega')
    : ETAPAS.filter(e => e.key !== 'pronto_retirada')

  const ordemAtual = ordemStatus(status)

  return (
    <div className="space-y-2">
      {etapas.map((etapa, i) => {
        const ordemEtapa = ordemStatus(etapa.key)
        const concluida = ordemAtual >= ordemEtapa
        const atual = status === etapa.key || (etapa.key === 'recebido' && status === 'recebido')
        const isLast = i === etapas.length - 1

        return (
          <div key={etapa.key} className="flex items-start gap-3">
            {/* Linha vertical */}
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 border-2 transition-all ${
                concluida
                  ? 'bg-green-600 border-green-500 text-white'
                  : 'bg-scooby-escuro border-scooby-borda text-gray-600'
              } ${atual && !isLast ? 'ring-2 ring-green-400/50 animate-pulse' : ''}`}>
                {concluida ? (isLast ? '✓' : etapa.icon) : etapa.icon}
              </div>
              {!isLast && (
                <div className={`w-0.5 h-6 mt-1 ${concluida && ordemAtual > ordemEtapa ? 'bg-green-600' : 'bg-scooby-borda'}`} />
              )}
            </div>
            {/* Label */}
            <div className="pt-1.5">
              <p className={`text-sm font-semibold ${concluida ? 'text-white' : 'text-gray-600'}`}>
                {etapa.label}
              </p>
              {atual && status !== 'entregue' && (
                <p className="text-green-400 text-xs">← agora</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CardAcompanhamento({ pedido }) {
  return (
    <div className="bg-scooby-card border border-scooby-borda rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-scooby-escuro px-4 py-3 flex items-center justify-between border-b border-scooby-borda">
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-wide">Pedido</p>
          <p className="text-scooby-amarelo font-black text-lg tracking-wide">
            #{pedido.numeroPedido?.split('-').pop() || pedido.id}
          </p>
        </div>
        <div className="text-right">
          <p className="text-gray-400 text-xs">{pedido.data} às {pedido.hora}</p>
          <p className="text-white font-bold text-sm">R$ {pedido.total}</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Itens */}
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Itens</p>
          <div className="space-y-0.5">
            {pedido.itensPedido.split(' | ').map((item, i) => (
              <p key={i} className="text-gray-300 text-sm">• {item}</p>
            ))}
          </div>
        </div>

        {/* Status timeline */}
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-3">Status</p>
          <TimelineStatus status={pedido.status || 'recebido'} tipoEntrega={pedido.tipoEntrega} />
        </div>

        {pedido.statusAtualizadoEm && (
          <p className="text-gray-600 text-xs text-right">
            Atualizado às {new Date(pedido.statusAtualizadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  )
}

export default function AcompanharPedido() {
  const params = new URLSearchParams(window.location.search)
  const telParam = params.get('tel') || ''

  const [telefone, setTelefone] = useState(telParam)
  const [pedidos, setPedidos] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [buscado, setBuscado] = useState(false)

  async function buscar(tel) {
    const chave = (tel || telefone).replace(/\D/g, '')
    if (chave.length < 10) { setErro('Informe um telefone válido com DDD.'); return }
    setCarregando(true)
    setErro('')
    try {
      const resp = await fetch(`/api/pedido?telefone=${chave}`)
      if (!resp.ok) throw new Error()
      const data = await resp.json()
      setPedidos(data)
      setBuscado(true)
      if (data.length === 0) setErro('Nenhum pedido encontrado para este número.')
    } catch {
      setErro('Não foi possível buscar seus pedidos. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  // Auto-busca se telefone veio pela URL
  useEffect(() => {
    if (telParam.replace(/\D/g, '').length >= 10) {
      buscar(telParam)
    }
  }, [])

  // Auto-refresh a cada 30s se já buscou
  useEffect(() => {
    if (!buscado) return
    const interval = setInterval(() => buscar(), 30000)
    return () => clearInterval(interval)
  }, [buscado, telefone])

  return (
    <div className="min-h-[100dvh] bg-scooby-escuro text-white">
      {/* Header */}
      <header className="border-b border-scooby-borda/50 px-4 py-4 flex items-center gap-3">
        <a href="/" className="text-gray-400 hover:text-white text-sm transition">← Cardápio</a>
        <div className="flex-1" />
        <h1 className="text-scooby-amarelo font-bold text-base">📍 Acompanhar Pedido</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Logo e instrução */}
        <div className="text-center space-y-1">
          <p className="text-white font-bold text-lg">{CONFIG.nomeLoja}</p>
          <p className="text-gray-400 text-sm">Informe seu telefone para ver o status do seu pedido</p>
        </div>

        {/* Busca */}
        <div className="flex gap-2">
          <input
            type="tel"
            placeholder="(32) 9 9999-9999"
            value={telefone}
            onChange={e => setTelefone(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && buscar()}
            className="flex-1 bg-scooby-card border border-scooby-borda text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-scooby-amarelo"
          />
          <button
            onClick={() => buscar()}
            disabled={carregando}
            className="bg-scooby-vermelho hover:bg-red-700 text-white font-bold px-5 rounded-xl transition active:scale-95 disabled:opacity-60"
          >
            {carregando ? '...' : 'Buscar'}
          </button>
        </div>

        {erro && <p className="text-red-400 text-sm text-center">{erro}</p>}

        {/* Pedidos */}
        {pedidos.length > 0 && (
          <div className="space-y-4">
            <p className="text-gray-500 text-xs text-center">
              {pedidos.length === 1 ? '1 pedido encontrado' : `${pedidos.length} pedidos encontrados`}
              {' · '}atualiza automaticamente
            </p>
            {pedidos.map(p => (
              <CardAcompanhamento key={p.id} pedido={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
