# Changelog — Scooby-Doo Lanches

## [2026-03-21] — Sessão de Melhorias

### 🍽️ Sistema de Mesas (novo)
- **`api/mesa.js`** — novo endpoint para gerenciar mesas (GET, POST, PATCH, DELETE)
- **Supabase** — criada tabela `mesas` com 10 registros (Mesa 1–10)
- **Admin — Aba Mesas** — grid das 10 mesas com status, itens, total e botões de ação
  - "Fechar conta": seleciona forma de pagamento (Dinheiro/Pix/Débito/Crédito) e gera pedido final
  - "Resetar": limpa a mesa sem cobrar
- **Garçom (`/garcom`)** — fluxo de mesa reformulado:
  - Seleção de mesa por grade de botões (1–10) com total acumulado em amarelo
  - Itens adicionados à mesa persistem (não criam pedido imediatamente)
  - Ao confirmar: tela de sucesso 2 segundos → volta automático para início
- **Impressão de cozinha** — ao adicionar itens à mesa, cria pedido `origem: cozinha` para auto-impressão
- **Fechamento de mesa** — apaga pedidos de cozinha antes de criar o pedido final (evita duplicação)
- **Pedidos tab** — mesas abertas aparecem no topo com tag "em consumação"

### 🔐 Senha do Garçom configurável
- **Admin — Configurações** — novo campo "Senha do Garçom" (editável pelo Júlio)
- **`api/cardapio-state.js`** — campo `senhaGarcom` adicionado
- **Supabase** — coluna `senhaGarcom` adicionada à tabela `store_state`
- **`/garcom`** — valida senha contra `cardapioState.senhaGarcom` (fallback: `garcom2024`)

### 🖨️ Impressão ESC/POS
- **Codificação** — substituído mapa de caracteres PC850 por normalização NFD pura (ASCII)
  - Remove acentos automaticamente (ã→a, ç→c, etc.)
  - Compatível com qualquer impressora térmica independente do fabricante
  - Removido comando `ESC t` (código de página) — sem dependência de firmware
- **Papel 80mm** — `COLS` ajustado para 24 colunas com fonte 2×2 (`GS ! 0x11`)
- **Nova impressora** — padrão atualizado para ISD Tech 12

### 🔄 Auto-atualização de versão
- **`api/version.js`** — novo endpoint que retorna o ID do deploy Vercel
- **`App.jsx`** — polling a cada 60s; recarrega silenciosamente ao detectar novo deploy
- **`Admin.jsx`** — polling a cada 60s; exibe banner "🔄 Nova versão disponível!" com botão de atualização

### 🎉 Combos no cardápio
- Layout compacto horizontal no mobile — cada combo em uma linha com ícone, nome, descrição resumida, preço e botão `+`
- Antes: cards grandes empilhados (1 coluna no mobile)

### 📱 WhatsApp
- Link corrigido de `web.whatsapp.com/send` para `wa.me` (link universal)
  - Mobile: abre o app WhatsApp instalado
  - Desktop: abre o WhatsApp Web
  - Sem crash para clientes que não têm o WhatsApp Web aberto

### 🐛 Correções de bugs
- **Auto-impressão** — corrigido bug onde `pedidosVistosRef` era inicializado do `localStorage`
  - Primeiro fetch agora salva TODOS os IDs como baseline
  - Polls seguintes detectam apenas IDs novos da sessão atual
- **Impressão automática** — corrigido para não imprimir todos os pedidos do dia ao abrir o admin
- **Cache API** — headers `Cache-Control: no-store` adicionados ao `GET /api/pedido`

### 🛠️ Infraestrutura
- **QZ Tray heartbeat** — reconexão automática a cada 20s se WebSocket cair
- Dependência de `localStorage scooby_vistos` removida completamente
