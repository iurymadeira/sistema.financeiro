// Controller: traduz HTTP <-> service. Sem regra de negócio, sem SQL.
function criarCategoriasController(service) {
  return {
    async listar(req, res) {
      res.json(await service.listar(req.usuarioId));
    },
    async criar(req, res) {
      res.status(201).json(await service.criar(req.usuarioId, req.body));
    },
  };
}

module.exports = { criarCategoriasController };
