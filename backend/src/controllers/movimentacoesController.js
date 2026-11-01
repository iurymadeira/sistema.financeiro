function criarMovimentacoesController(service) {
  return {
    async listar(req, res) {
      res.json(await service.listar(req.usuarioId));
    },
    async criar(req, res) {
      res.status(201).json(await service.criar(req.usuarioId, req.body));
    },
    async alterar(req, res) {
      res.json(await service.atualizar(req.usuarioId, req.params.id, req.body));
    },
    async remover(req, res) {
      res.json(await service.remover(req.usuarioId, req.params.id));
    },
  };
}

module.exports = { criarMovimentacoesController };
