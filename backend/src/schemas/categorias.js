const { z } = require('zod');

// Esquema = a descrição do formato aceito. Fica separado da rota para a regra ser lida (e testada) em um lugar só.
// strictObject: campo desconhecido (ex.: "usuarioId") é ERRO, não é ignorado em silêncio.
const criarCategoria = z.strictObject(
  {
    name: z
      .string({ error: 'Informe o nome da categoria.' })
      .trim()
      .min(1, { error: 'Informe o nome da categoria.' })
      .max(50, { error: 'O nome pode ter no máximo 50 caracteres.' }),
    type: z.enum(['receita', 'despesa'], { error: 'O tipo deve ser "receita" ou "despesa".' }),
    // Nome de ícone Lucide em PascalCase (ex.: "ShoppingCart"). O front usa um ícone padrão se não conhecer o nome.
    icon: z
      .string({ error: 'Informe o ícone.' })
      .regex(/^[A-Z][A-Za-z0-9]{0,49}$/, { error: 'Ícone inválido.' }),
  },
  { error: 'Envie um objeto JSON com name, type e icon.' },
);

module.exports = { criarCategoria };
