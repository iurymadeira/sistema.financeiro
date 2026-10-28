CREATE DATABASE IF NOT EXISTS financeiro_db;
USE financeiro_db;

-- 1. Tabela de Usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Categorias
CREATE TABLE IF NOT EXISTS categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NULL,
    nome VARCHAR(50) NOT NULL,
    icone VARCHAR(50) NULL,
    tipo ENUM('RECEITA', 'DESPESA', 'NEUTRO') NOT NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- 3. Tabela de Formas de Pagamento / Transferência
CREATE TABLE IF NOT EXISTS formas_pagamento (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(50) NOT NULL UNIQUE
);

-- 4. Tabela de Transações
CREATE TABLE IF NOT EXISTS transacoes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    categoria_id INT NOT NULL,
    forma_pagamento_id INT NULL,
    descricao VARCHAR(250) NULL,
    valor DECIMAL(10,2) NOT NULL,
    tipo ENUM('RECEITA', 'DESPESA') NOT NULL,
    data_transacao DATE NOT NULL,
    recorrente BOOLEAN DEFAULT FALSE,
    intervalo INT DEFAULT 1,
    data_fim DATE NULL,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id),
    FOREIGN KEY (forma_pagamento_id) REFERENCES formas_pagamento(id)
);

-- 5. Tabela de Exceções de Recorrência
CREATE TABLE IF NOT EXISTS transacao_excecoes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    transacao_pai_id BIGINT NOT NULL,
    data_original DATE NOT NULL,
    nova_data DATE NULL,
    novo_valor DECIMAL(10,2) NULL,
    cancelado BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (transacao_pai_id) REFERENCES transacoes(id) ON DELETE CASCADE
);

-- Estado completo da aplicação para o modo local de usuário único.
CREATE TABLE IF NOT EXISTS estado_aplicacao (
    id TINYINT PRIMARY KEY,
    dados JSON NOT NULL,
    atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Categorias Padrão do Sistema
INSERT INTO categorias (usuario_id, nome, icone, tipo) VALUES
(NULL, 'Ajuste de Saldo', 'sliders', 'NEUTRO'),
(NULL, 'Alimentação', 'utensils', 'DESPESA'),
(NULL, 'Transporte', 'car', 'DESPESA'),
(NULL, 'Moradia', 'home', 'DESPESA'),
(NULL, 'Salário', 'briefcase', 'RECEITA'),
(NULL, 'Investimentos', 'trending-up', 'RECEITA');

-- Formas de Pagamento Padrão
INSERT INTO formas_pagamento (nome) VALUES
('Pix'),
('Boleto'),
('Dinheiro'),
('Cartão de Crédito'),
('Cartão de Débito');
