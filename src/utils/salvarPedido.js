import { CONFIG } from '../config'

export async function salvarPedido(dados, itens, subtotal, taxaEntregaDinamica = CONFIG.taxaEntrega, desconto = 0, cupomAplicado = null) {
  const taxa = dados.tipoEntrega === 'entrega' ? taxaEntregaDinamica : 0
  const total = subtotal + taxa - desconto

  const itensPedido = itens
    .map(l => `${l.qtd}x ${l.item.nome}${l.variacao ? ` (${l.variacao})` : ''} R$${(l.preco * l.qtd).toFixed(2)}`)
    .join(' | ')

  const agora = new Date()
  const payload = {
    data:         agora.toLocaleDateString('pt-BR'),
    hora:         agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    nomeCliente:  dados.nome,
    telefone:     dados.telefone || '',
    tipoEntrega:  dados.tipoEntrega === 'entrega' ? 'Entrega' : 'Retirada',
    endereco:     dados.tipoEntrega === 'entrega'
      ? `${dados.rua}, ${dados.numero}${dados.complemento ? `, ${dados.complemento}` : ''} — ${dados.bairro}`
      : 'Retirar no local',
    itensPedido,
    subtotal:     subtotal.toFixed(2),
    taxaEntrega:  taxa.toFixed(2),
    desconto:     desconto.toFixed(2),
    cupom:        cupomAplicado ? cupomAplicado.codigo : '',
    total:        total.toFixed(2),
    pagamento:    dados.pagamento,
    observacao:   dados.observacao || '',
  }

  try {
    const resp = await fetch('/api/pedido', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const result = await resp.json()
    return result.numeroPedido || null
  } catch (err) {
    console.warn('Falha ao salvar pedido:', err)
    return null
  }
}
