-- Perfil do usuário (rotas GET/PATCH /me): foto e um nome/e-mail de demonstração para o usuário provisório.
-- A foto é guardada como "data URL" (imagem pequena, já reduzida pelo front para 256x256).
ALTER TABLE usuarios ADD COLUMN foto TEXT
    CHECK (foto IS NULL OR (length(foto) <= 200000 AND foto ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$'));

-- O usuário provisório é achado pela marca '!sem-login' na senha (migration 004), NÃO pelo e-mail:
-- o e-mail agora pode ser editado pelo próprio usuário (PATCH /me), então não serve de chave.
UPDATE usuarios SET nome = 'Marina', email = 'marina@exemplo.com' WHERE senha_hash = '!sem-login';
