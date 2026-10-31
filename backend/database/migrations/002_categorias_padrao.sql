-- Categorias padrão (dados de referência: fazem parte do esquema, por isso ficam numa migration).
-- Os `codigo` e os nomes dos ícones (Lucide) são os mesmos que o front usa.
INSERT INTO categorias (usuario_id, codigo, nome, icone, tipo, sistema) VALUES
  (NULL, 'alimentacao',       'Alimentação',       'Utensils',  'DESPESA', FALSE),
  (NULL, 'transporte',        'Transporte',        'Car',       'DESPESA', FALSE),
  (NULL, 'moradia',           'Moradia',           'Home',      'DESPESA', FALSE),
  (NULL, 'energia',           'Conta de Energia',  'Lightbulb', 'DESPESA', FALSE),
  (NULL, 'agua',              'Conta de Água',     'Droplets',  'DESPESA', FALSE),
  (NULL, 'salario',           'Salário',           'Banknote',  'RECEITA', FALSE),
  (NULL, 'investimentos',     'Investimentos',     'TrendingUp','RECEITA', FALSE),
  (NULL, 'consultorias',      'Consultorias',      'Briefcase', 'RECEITA', FALSE),
  (NULL, 'ajuste-financeiro', 'Ajuste Financeiro', 'Scale',     'DESPESA', TRUE);
