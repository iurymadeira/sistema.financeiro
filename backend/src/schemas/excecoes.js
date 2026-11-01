const { z } = require('zod');
const { dataValida } = require('../domain/datas');

// null (ou ausente) = "segue o que a regra manda". Mesmo formato que o front envia (apiRepository).
const salvarExcecao = z.strictObject(
  {
    amount: z
      .number({ error: 'Informe o valor em centavos (número inteiro).' })
      .int({ error: 'Informe o valor em centavos (número inteiro).' })
      .positive({ error: 'Informe um valor maior que zero.' })
      .max(99_999_999_999, { error: 'O valor é alto demais.' })
      .nullish(),
    date: z.string({ error: 'A data deve ser um texto.' }).refine(dataValida, { error: 'Data inválida. Use o formato AAAA-MM-DD.' }).nullish(),
    cancelled: z.boolean({ error: 'Informe se o mês foi cancelado.' }).default(false),
  },
  { error: 'Envie um objeto JSON com amount, date e cancelled.' },
);

module.exports = { salvarExcecao };
