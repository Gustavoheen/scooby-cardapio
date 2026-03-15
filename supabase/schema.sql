-- ============================================================
-- Scooby-Doo Lanches — Schema Supabase
-- ============================================================

-- Pedidos do cardápio digital
CREATE TABLE IF NOT EXISTS orders (
  id bigint PRIMARY KEY,
  data jsonb,
  "criadoEm" timestamptz DEFAULT now()
);

-- Estado do cardápio (documento único, id=1)
CREATE TABLE IF NOT EXISTS store_state (
  id int PRIMARY KEY DEFAULT 1,
  precos jsonb DEFAULT '{}',
  desativados jsonb DEFAULT '[]',
  "precosVariacoes" jsonb DEFAULT '{}',
  "taxaEntrega" numeric,
  "tempoEntrega" text,
  promocoes jsonb,
  cupons jsonb,
  "senhaCliente" text,
  "lojaStatus" text,
  "horarioAbertura" text,
  "horarioFechamento" text,
  "atualizadoEm" timestamptz DEFAULT now()
);

INSERT INTO store_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Clientes do cardápio (histórico de pedidos / endereços salvos)
CREATE TABLE IF NOT EXISTS clients (
  telefone text PRIMARY KEY,
  nome text,
  pagamento text,
  "tipoEntrega" text,
  enderecos jsonb DEFAULT '[]',
  "atualizadoEm" timestamptz DEFAULT now()
);

-- RLS: leitura e escrita livres (API usa service key)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_full_access" ON clients USING (true) WITH CHECK (true);
