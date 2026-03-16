# Tutorial Completo — Scooby-Doo Lanches
## Arquitetura, Funcionamento e Manutenção

---

## 1. VISÃO GERAL DO SISTEMA

O Scooby-Doo Lanches é um **cardápio digital** com painel administrativo.
O cliente acessa pelo celular, monta o pedido e envia pelo WhatsApp.
O dono usa o painel Admin para gerenciar pedidos, cardápio e configurações.

```
CLIENTE
  └─ Celular/PC → scoobydoolanches.com.br
                    │
                    ├── Vê o cardápio (React)
                    ├── Adiciona itens ao carrinho
                    └── Envia pedido → WhatsApp + salva no banco

DONO/ATENDENTE
  └─ scoobydoolanches.com.br/admin
        │
        ├── Ver pedidos em tempo real
        ├── Imprimir cupom (impressora térmica)
        ├── Editar preços/cardápio
        └── Configurar loja (horário, pix, segurança)
```

---

## 2. STACK TECNOLÓGICA

| Componente | Tecnologia | Onde fica |
|------------|------------|-----------|
| Frontend (telas) | React + Vite + Tailwind | `src/` |
| Backend (APIs) | Vercel Serverless Functions | `api/` |
| Banco de dados | Supabase (PostgreSQL) | Nuvem Supabase |
| Hospedagem | Vercel | scoobydoolanches.com.br |
| Fotos dos produtos | Supabase Storage | Bucket `cardapio` |
| Impressão térmica | QZ Tray (app local) | PC do atendente |
| Deploy automático | GitHub → Vercel | Push = deploy |

---

## 3. ESTRUTURA DE ARQUIVOS

```
scooby-cardapio/
│
├── src/                          ← Todo o código React (frontend)
│   ├── App.jsx                   ← Página principal do cardápio
│   ├── config.js                 ← Configurações (WhatsApp, Pix, etc.)
│   ├── data/
│   │   └── cardapio.js           ← Lista completa de produtos e preços
│   ├── components/
│   │   ├── CardItem.jsx          ← Card de produto (foto + preço + botão)
│   │   ├── CarrinhoSidebar.jsx   ← Carrinho lateral (desktop)
│   │   ├── DrawerCarrinho.jsx    ← Carrinho gaveta (mobile)
│   │   └── ModalPedido.jsx       ← Formulário de finalização do pedido
│   ├── pages/
│   │   └── Admin.jsx             ← Painel administrativo completo
│   ├── hooks/
│   │   └── useCarrinho.js        ← Lógica do carrinho de compras
│   └── utils/
│       ├── salvarPedido.js       ← Envia pedido para a API
│       ├── qzCert.js             ← Certificado para impressora térmica
│       └── formatarMoeda.js      ← Formatação de preços
│
├── api/                          ← Serverless Functions (backend)
│   ├── pedido.js                 ← CRUD de pedidos
│   ├── cardapio-state.js         ← Configurações da loja
│   ├── clientes.js               ← Dados dos clientes
│   ├── qz-sign.js                ← Assinatura para impressora QZ Tray
│   └── migrate.js                ← Diagnóstico de migração do banco
│
├── supabase/
│   └── schema.sql                ← Estrutura do banco de dados
│
├── certs/                        ← Certificados QZ Tray (local, não sobe ao GitHub)
│
├── .github/workflows/
│   └── testes.yml                ← Testes automáticos (2x por semana)
│
└── public/                       ← Arquivos estáticos (logos, favicon)
```

---

## 4. BANCO DE DADOS (Supabase)

### Tabelas

#### `orders` — Pedidos
```sql
id         bigint     → número único do pedido (timestamp)
data       jsonb      → todos os dados do pedido em JSON
criadoEm   timestamp  → quando o pedido foi feito
```

O campo `data` contém: nomeCliente, telefone, itensPedido, total,
pagamento, tipoEntrega, endereco, observacao, numeroPedido, etc.

#### `store_state` — Configurações da Loja
```sql
id               int        → sempre 1 (documento único)
precos           jsonb      → mapa de preços customizados (id_item → preço)
desativados      jsonb      → lista de ids de itens desativados/esgotados
precosVariacoes  jsonb      → preços customizados de variações
taxaEntrega      numeric    → taxa de entrega em R$
tempoEntrega     text       → ex: "40 a 60 min"
promocoes        jsonb      → lista de promoções ativas
cupons           jsonb      → cupons de desconto
senhaCliente     text       → senha do painel admin (padrão: scooby2024)
lojaStatus       text       → "aberta" | "fechada" | "auto"
horarioAbertura  text       → ex: "18:00"
horarioFechamento text      → ex: "23:00"
whatsappNumero   text       → número WhatsApp para contato
pixChave         text       → chave Pix
pixTipo          text       → tipo da chave Pix
pixNome          text       → nome do titular do Pix
bloqueados       jsonb      → telefones bloqueados de fazer pedidos
atualizadoEm     timestamp  → última atualização
```

#### `clients` — Clientes
```sql
telefone     text   → chave primária (número normalizado)
nome         text   → nome do cliente
pagamento    text   → último método de pagamento usado
tipoEntrega  text   → última preferência de entrega
enderecos    jsonb  → lista de endereços salvos
atualizadoEm timestamp
```

---

## 5. COMO FUNCIONA O FLUXO DE PEDIDO

```
1. Cliente acessa o cardápio
   └── App.jsx carrega /api/cardapio-state (preços, horário, status)

2. Cliente monta o carrinho
   └── CardItem.jsx → adiciona ao carrinho (useCarrinho.js)

3. Clique em "Finalizar Pedido"
   └── ModalPedido.jsx → pede nome, telefone, endereço, pagamento

4. Ao confirmar:
   ├── salvarPedido.js → POST /api/pedido → salva no Supabase
   ├── Se o cliente tem telefone → POST /api/clientes → salva/atualiza dados
   └── Abre WhatsApp com mensagem formatada

5. No painel Admin:
   └── Pedidos aparecem em tempo real (auto-refresh a cada 30s)
```

---

## 6. PAINEL ADMINISTRATIVO

**Acesso:** scoobydoolanches.com.br/admin

**Senhas:**
- Senha normal (Júlio): `scooby2024`
- Senha master (Gustavo): `scooby_master_dev#2024`

**O que você pode fazer:**

| Aba | Função |
|-----|--------|
| Pedidos | Ver todos os pedidos, imprimir, excluir, mandar WhatsApp |
| Cardápio | Ativar/desativar itens, alterar preços, gerenciar promoções |
| Clientes | Ver histórico, editar nome, excluir cliente |
| Configurações | Horário, taxa, Pix, segurança/bloqueios |

---

## 7. IMPRESSORA TÉRMICA (QZ Tray)

### Como funciona:
1. **QZ Tray** é um programa que roda no PC da loja
2. Ele faz a "ponte" entre o navegador e a impressora USB
3. O site assina digitalmente para provar que é confiável

### Setup (PC novo):
1. Baixe e instale QZ Tray: https://qz.io/download/
2. Copie o arquivo `certs/certificate.pem` para:
   `C:\Users\[seu-usuario]\AppData\Roaming\qz\certs\scooby.pem`
3. Reinicie o QZ Tray
4. Acesse o admin → o QZ Tray se conecta automaticamente

### Se pedir "confiar no site":
- Já deve ter o certificado instalado
- Se não funcionar, verifique se o arquivo `scooby.pem` está na pasta certa

---

## 8. FOTOS DOS PRODUTOS

As fotos ficam no **Supabase Storage** (bucket `cardapio`), com acesso público.

**URL das fotos:** `https://nufvtxhsckbaddurgcyx.supabase.co/storage/v1/object/public/cardapio/ARQUIVO.jpg`

Para adicionar/trocar uma foto:
1. Acesse supabase.com → projeto → Storage → bucket `cardapio`
2. Faça upload do arquivo com o mesmo nome (ex: `SKU001_HAMBURGER.jpg`)
3. A foto vai aparecer automaticamente no cardápio

Para associar uma nova foto a um produto:
1. Edite `src/data/cardapio.js`
2. Encontre o item pelo `id` e altere o campo `imagem`

---

## 9. DEPLOY AUTOMÁTICO

**Fluxo:**
```
Você edita código → git commit → git push → GitHub → Vercel faz deploy automático
```

**Tempo:** deploy leva ~2 minutos
**URL de produção:** https://scoobydoolanches.com.br

Para verificar deploys: https://vercel.com/gustavoheens-projects/scooby-cardapio

---

## 10. SEGURANÇA ANTI-SPAM

O sistema tem 3 camadas de proteção contra pedidos falsos:

1. **Honeypot** — campo oculto `_hp` no formulário. Bots preenchem, humanos não. Pedido é rejeitado silenciosamente.

2. **Rate Limiting** — máximo 5 pedidos por hora por número de telefone.

3. **Blocklist** — Admin pode bloquear um número de telefone. Pedidos desse número são rejeitados com mensagem de erro.

---

## 11. VARIÁVEIS DE AMBIENTE (Segredos)

Ficam no painel da Vercel (não ficam no código):

| Variável | O que é |
|----------|---------|
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_KEY` | Chave de acesso total ao banco |
| `RESEND_API_KEY` | Chave para enviar emails |
| `QZ_PRIVATE_KEY` | Chave privada para assinar impressão |
| `BLOB_READ_WRITE_TOKEN` | Token para Vercel Blob storage |

**NUNCA** coloque essas variáveis no código ou no GitHub.

---

## 12. MANUTENÇÃO COMUM

### Alterar preço de um item
→ Admin → Aba Cardápio → clique no preço → edite → salvar

### Desativar um item (esgotado)
→ Admin → Aba Cardápio → toggle ao lado do item

### Alterar horário de funcionamento
→ Admin → Aba Configurações → Horário

### Abrir/Fechar loja manualmente
→ Admin → botão "Abrir Loja" / "Fechar Loja" no topo

### Adicionar cupom de desconto
→ Admin → Aba Configurações → Cupons

### Ver e excluir pedidos
→ Admin → Aba Pedidos → botão de lixeira

### Bloquear um número spam
→ Admin → Aba Configurações → Segurança → informe o número → Bloquear

---

## 13. BACKUP E RECUPERAÇÃO

**Backup automático:** O GitHub é o backup do código.
Tag `v1.0-fotos-producao` = versão estável com todas as fotos.

**Para recuperar em caso de problema:**
```bash
git clone https://github.com/Gustavoheen/scooby-cardapio.git
cd scooby-cardapio
npm install
npm run dev  # desenvolvimento local
```

**Os dados dos pedidos** ficam no Supabase (banco de dados em nuvem).
Supabase faz backups automáticos diários.

---

## 14. MIGRAÇÃO SQL PENDENTE

As colunas abaixo precisam ser adicionadas ao banco manualmente.
**O site funciona sem elas**, mas as configurações de WhatsApp, Pix e
lista negra não serão salvas até a migração ser feita.

**Passos:**
1. Acesse https://supabase.com → seu projeto
2. Clique em "SQL Editor" no menu lateral
3. Cole e execute o SQL abaixo:

```sql
ALTER TABLE store_state
  ADD COLUMN IF NOT EXISTS "whatsappNumero" text,
  ADD COLUMN IF NOT EXISTS "pixChave" text,
  ADD COLUMN IF NOT EXISTS "pixTipo" text,
  ADD COLUMN IF NOT EXISTS "pixNome" text,
  ADD COLUMN IF NOT EXISTS bloqueados jsonb DEFAULT '[]';
```

4. Clique em "Run"
5. Pronto — as configurações passam a ser salvas permanentemente

---

## 15. CONTATOS E LINKS

| Serviço | URL | Para quê |
|---------|-----|----------|
| Site | scoobydoolanches.com.br | Cardápio dos clientes |
| Admin | scoobydoolanches.com.br/admin | Painel da loja |
| GitHub | github.com/Gustavoheen/scooby-cardapio | Código-fonte e backup |
| Vercel | vercel.com/gustavoheens-projects/scooby-cardapio | Deploy e logs |
| Supabase | supabase.com | Banco de dados |
