-- A rota /calcular (a única que usava esta tabela) foi removida (ADR 0023).
-- A tabela guardava UMA configuração global (id = 1) para todos os usuários, o que não serve para um sistema com contas.
-- Migrations já aplicadas nunca são editadas: a limpeza é uma migration nova.
DROP TABLE configuracao_financeira;
