const estadoAplicacaoRepository = require('../repositories/estadoAplicacaoRepository');

exports.buscar = async (_req, res) => {
  try {
    const state = await estadoAplicacaoRepository.buscar();
    res.json({ state });
  } catch (erro) {
    console.error('Erro ao carregar dados da aplicação:', erro);
    res.status(500).json({ erro: 'Não foi possível carregar os dados da aplicação.' });
  }
};

exports.salvar = async (req, res) => {
  const { state } = req.body;
  if (
    !state ||
    typeof state !== 'object' ||
    !Array.isArray(state.movements) ||
    !Array.isArray(state.customCategories) ||
    !Array.isArray(state.exceptions)
  ) {
    return res.status(400).json({ erro: 'O estado enviado pela aplicação é inválido.' });
  }

  try {
    await estadoAplicacaoRepository.salvar(state);
    res.json({ sucesso: true });
  } catch (erro) {
    console.error('Erro ao salvar dados da aplicação:', erro);
    res.status(500).json({ erro: 'Não foi possível salvar os dados da aplicação.' });
  }
};
