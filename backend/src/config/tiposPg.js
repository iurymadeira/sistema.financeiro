// O driver `pg` converte colunas DATE em objetos Date do JavaScript, no fuso do servidor:
// "2026-05-10" pode virar 09/05 ou 11/05 dependendo da máquina. Nossas datas são só "AAAA-MM-DD"
// (ADR 0003), então pedimos o texto cru do Postgres. Rode uma vez, antes de qualquer consulta.
const { types } = require('pg');

const DATE_OID = 1082;
types.setTypeParser(DATE_OID, (valor) => valor);
