-- PROVISÓRIO: tabelas que existem só até as rotas antigas saírem.
-- `estado_aplicacao` guarda o estado todo do front num JSON (some quando o front usar a API relacional).
-- `configuracao_financeira` é da rota /calcular (a tabela era usada no código mas nunca foi criada).
CREATE TABLE estado_aplicacao (
    id             SMALLINT PRIMARY KEY CHECK (id = 1),
    dados          JSONB NOT NULL,
    atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE configuracao_financeira (
    id              SMALLINT PRIMARY KEY CHECK (id = 1),
    saldo_inicial   NUMERIC(12,2) NOT NULL,
    gastos_fixos    NUMERIC(12,2) NOT NULL,
    receitas_fixas  NUMERIC(12,2) NOT NULL,
    anos_projecao   INTEGER NOT NULL CHECK (anos_projecao >= 1)
);
