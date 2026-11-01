function criarExcecoesController(service) {
  return {
    async listar(req, res) {
      res.json(await service.listar(req.usuarioId));
    },
    async salvar(req, res) {
      const excecao = await service.salvar(req.usuarioId, req.params.id, req.params.originalDate, req.body);
      if (excecao === null) return res.status(204).end(); // ficou igual à regra: nada guardado
      res.json(excecao);
    },
    async remover(req, res) {
      await service.remover(req.usuarioId, req.params.id, req.params.originalDate);
      res.status(204).end();
    },
  };
}

module.exports = { criarExcecoesController };
