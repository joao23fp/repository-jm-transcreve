-- ============================================================
-- ODARA RIO — Reset completo do banco
-- Executar ANTES do schema.sql para limpar tudo e recriar
-- com PKs e FKs em UUID
-- ============================================================

DROP TABLE IF EXISTS tarefas           CASCADE;
DROP TABLE IF EXISTS mensagens_log     CASCADE;
DROP TABLE IF EXISTS sessoes           CASCADE;
DROP TABLE IF EXISTS servicos_mapeamento CASCADE;
DROP TABLE IF EXISTS vendas            CASCADE;
DROP TABLE IF EXISTS agendamentos      CASCADE;
DROP TABLE IF EXISTS leads             CASCADE;
DROP TABLE IF EXISTS clientes          CASCADE;
DROP TABLE IF EXISTS sync_state        CASCADE;
DROP TABLE IF EXISTS odara_leads_log   CASCADE;

DROP FUNCTION IF EXISTS atualizar_timestamp CASCADE;

-- Após executar este script, rodar schema.sql para recriar as tabelas.
