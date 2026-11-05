-- O front passou a usar as tabelas de verdade pela API (ADR 0025): o "pacote único" de /state não existe mais.
-- Migrations já aplicadas nunca são editadas: a limpeza é uma migration nova.
DROP TABLE estado_aplicacao;
