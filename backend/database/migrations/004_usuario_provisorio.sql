-- PROVISÓRIO: até existir cadastro e login de verdade, a API trabalha com UM usuário fixo.
-- Ele existe para que as tabelas (categorias, transacoes) já tenham dono desde o início.
-- `.invalid` é um domínio reservado (RFC 2606): nunca existe de verdade, então nunca recebe e-mail.
-- `senha_hash` '!' não é um hash válido: ninguém consegue fazer login com este usuário.
-- Sai quando o cadastro real entrar (ver ADR 0020).
INSERT INTO usuarios (nome, email, senha_hash)
VALUES ('Usuário provisório', 'provisorio@local.invalid', '!sem-login');
