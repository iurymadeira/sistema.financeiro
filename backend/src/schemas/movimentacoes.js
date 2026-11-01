const { z } = require('zod');
const { dataValida } = require('../domain/datas');

const FORMAS_DE_PAGAMENTO = ['PIX', 'Dinheiro', 'Boleto', 'Crédito', 'Débito']; // ADR 0010, igual ao CHECK do banco
const MAX_CENTAVOS = 99_999_999_999; // cabe em NUMERIC(12,2): R$ 999.999.999,99

const data = (mensagem) => z.string({ error: mensagem }).refine(dataValida, { error: 'Data inválida. Use o formato AAAA-MM-DD.' });

// Campos que POST e PATCH têm em comum (ADR 0019: a regra do campo é escrita uma vez só)
const campos = {
  amount: z
    .number({ error: 'Informe o valor em centavos (número inteiro).' })
    .int({ error: 'Informe o valor em centavos (número inteiro).' })
    .positive({ error: 'Informe um valor maior que zero.' })
    .max(MAX_CENTAVOS, { error: 'O valor é alto demais.' }),
  date: data('Informe a data.'),
  description: z.string({ error: 'A descrição deve ser um texto.' }).trim().max(250, { error: 'A descrição pode ter no máximo 250 caracteres.' }),
  method: z.enum(FORMAS_DE_PAGAMENTO, { error: 'Escolha a forma de pagamento.' }),
  recurring: z.boolean({ error: 'Informe se é recorrente.' }),
  endDate: data('Informe a data de fim.').nullable(),
};

const criarMovimentacao = z.strictObject(
  {
    categoryId: z.string({ error: 'Escolha uma categoria.' }).min(1, { error: 'Escolha uma categoria.' }),
    amount: campos.amount,
    date: campos.date,
    description: campos.description.default(''),
    method: campos.method,
    recurring: campos.recurring.default(false),
    endDate: campos.endDate.default(null),
  },
  { error: 'Envie um objeto JSON com categoryId, amount, date, method e os demais campos do contrato.' },
);

// PATCH: qualquer subconjunto dos campos editáveis (a categoria não muda; ADR do front, EDITABLE_FIELDS)
const alterarMovimentacao = z
  .strictObject(
    {
      amount: campos.amount.optional(),
      date: campos.date.optional(),
      description: campos.description.optional(),
      method: campos.method.optional(),
      recurring: campos.recurring.optional(),
      endDate: campos.endDate.optional(),
    },
    { error: 'Envie um objeto JSON com os campos a alterar.' },
  )
  .refine((corpo) => Object.keys(corpo).length > 0, { error: 'Envie ao menos um campo para alterar.' });

module.exports = { criarMovimentacao, alterarMovimentacao, FORMAS_DE_PAGAMENTO };
