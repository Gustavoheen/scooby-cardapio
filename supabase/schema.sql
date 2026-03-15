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
