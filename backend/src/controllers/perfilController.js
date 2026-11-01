function criarPerfilController(service) {
  return {
    async buscar(req, res) {
      res.json(await service.buscar(req.usuarioId));
    },
    async atualizar(req, res) {
      res.json(await service.atualizar(req.usuarioId, req.body));
    },
  };
}

module.exports = { criarPerfilController };
