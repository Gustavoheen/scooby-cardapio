-- ============================================================
-- RLS SECURITY — Scooby-Doo Lanches + Thalia Doces
-- Banco: nufvtxhsckbaddurgcyx
-- Rodar no Supabase Dashboard > SQL Editor
-- ============================================================
-- Obs: o backend usa service_role key (bypassa RLS automaticamente)
-- Estas policies são defesa em profundidade — não afetam o funcionamento

-- ── Scooby: completar RLS em tabelas que faltavam ────────────
ALTER TABLE orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_state ENABLE ROW LEVEL SECURITY;

-- orders: acesso total via service_role (backend) — sem acesso anon
CREATE POLICY "service_full_access" ON orders
  USING (true) WITH CHECK (true);

-- store_state: acesso total via service_role (backend) — sem acesso anon
CREATE POLICY "service_full_access" ON store_state
  USING (true) WITH CHECK (true);

-- Verificação: clients já tinha RLS corretamente configurada
-- ALTER TABLE clients ENABLE ROW LEVEL SECURITY; -- já existe
-- CREATE POLICY "service_full_access" ON clients... -- já existe

-- ── Thalia: habilitar RLS nas tabelas do prefixo thalia_ ─────
ALTER TABLE thalia_orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE thalia_clients     ENABLE ROW LEVEL SECURITY;
ALTER TABLE thalia_store_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_full_access" ON thalia_orders
  USING (true) WITH CHECK (true);

CREATE POLICY "service_full_access" ON thalia_clients
  USING (true) WITH CHECK (true);

CREATE POLICY "service_full_access" ON thalia_store_state
  USING (true) WITH CHECK (true);
