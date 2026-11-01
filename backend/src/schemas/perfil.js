const { z } = require('zod');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/; // mesma regra do front (Configuracoes)
const FOTO = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

// Qualquer subconjunto dos campos. `photo: null` remove a foto. Senha NÃO passa por aqui (POST /me/password, depois do login).
const alterarPerfil = z
  .strictObject(
    {
      name: z.string({ error: 'Informe seu nome.' }).trim().min(1, { error: 'Informe seu nome.' }).max(100, { error: 'O nome pode ter no máximo 100 caracteres.' }),
      email: z
        .string({ error: 'Informe um e-mail válido.' })
        .trim()
        .toLowerCase()
        .max(150, { error: 'O e-mail pode ter no máximo 150 caracteres.' })
        .regex(EMAIL, { error: 'Informe um e-mail válido.' }),
      photo: z
        .string({ error: 'A foto deve ser uma imagem em texto (data URL).' })
        .max(200_000, { error: 'A foto é grande demais.' })
        .regex(FOTO, { error: 'Formato de foto inválido. Use JPEG, PNG ou WebP.' })
        .nullable(),
    },
    { error: 'Envie um objeto JSON com os campos a alterar.' },
  )
  .partial()
  .refine((corpo) => Object.keys(corpo).length > 0, { error: 'Envie ao menos um campo para alterar.' });

module.exports = { alterarPerfil };
