-- Esquema inicial. Cada arquivo de migration roda dentro de UMA transação (ver src/db/migrate.js):
-- se algo falhar, nada fica pela metade.

CREATE TABLE usuarios (
    id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome        VARCHAR(100) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    senha_hash  VARCHAR(255) NOT NULL,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Categorias padrão do sistema têm usuario_id NULL e um `codigo` estável (o mesmo id que o front usa).
-- Categorias criadas pelo usuário pertencem a ele. "Excluir" = arquivar (ADR 0011): o histórico não quebra.
CREATE TABLE categorias (
    id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id  INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    codigo      VARCHAR(50),
    nome        VARCHAR(50) NOT NULL,
    icone       VARCHAR(50) NOT NULL,
    tipo        VARCHAR(7) NOT NULL CHECK (tipo IN ('RECEITA', 'DESPESA')),
    sistema     BOOLEAN NOT NULL DEFAULT FALSE,   -- "Ajuste Financeiro": só aparece no histórico
    arquivada   BOOLEAN NOT NULL DEFAULT FALSE,
    CHECK ((usuario_id IS NULL) = (codigo IS NOT NULL))  -- padrão tem código; do usuário não
);
CREATE UNIQUE INDEX categorias_codigo_unico ON categorias (codigo) WHERE codigo IS NOT NULL;
-- Mesmo nome, no mesmo tipo e para o mesmo dono, não se repete (sem diferenciar maiúsculas)
CREATE UNIQUE INDEX categorias_nome_unico ON categorias (COALESCE(usuario_id, 0), tipo, lower(nome));

-- Dinheiro em NUMERIC(12,2) no banco (exato, nunca float); a API converte de/para centavos (ADR 0017).
CREATE TABLE transacoes (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id      INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    categoria_id    INTEGER NOT NULL REFERENCES categorias(id),
    forma_pagamento VARCHAR(8) NOT NULL
        CHECK (forma_pagamento IN ('PIX', 'Dinheiro', 'Boleto', 'Crédito', 'Débito')),
    descricao       VARCHAR(250) NOT NULL DEFAULT '',
    valor           NUMERIC(12,2) NOT NULL CHECK (valor > 0),
    tipo            VARCHAR(7) NOT NULL CHECK (tipo IN ('RECEITA', 'DESPESA')),
    data_transacao  DATE NOT NULL,
    recorrente      BOOLEAN NOT NULL DEFAULT FALSE,
    intervalo       INTEGER NOT NULL DEFAULT 1 CHECK (intervalo >= 1),
    data_fim        DATE,                          -- NULL = indeterminada (ADR 0008)
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (data_fim IS NULL OR (recorrente AND data_fim >= data_transacao))
);
-- A tela sempre busca "as do usuário, por data"
CREATE INDEX transacoes_usuario_data ON transacoes (usuario_id, data_transacao);

-- Exceção = ajuste de UM mês de uma recorrência (ADR 0013). Um mês, no máximo uma exceção.
CREATE TABLE transacao_excecoes (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    transacao_pai_id  BIGINT NOT NULL REFERENCES transacoes(id) ON DELETE CASCADE,
    data_original     DATE NOT NULL,
    nova_data         DATE,
    novo_valor        NUMERIC(12,2) CHECK (novo_valor > 0),
    cancelado         BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (transacao_pai_id, data_original),
    -- a nova data fica no mesmo mês da original
    CHECK (nova_data IS NULL OR date_trunc('month', nova_data) = date_trunc('month', data_original))
);
