import { Router } from 'express';
import type { AtividadeRepository } from '../../repositories/AtividadeRepository.js';
import { serializarAtividade } from '../serializers.js';

export type RepositorioAtividadesPublico = Pick<AtividadeRepository, 'listar'>;

export function rotasAtividades(atividadeRepo: RepositorioAtividadesPublico): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    const atividades = await atividadeRepo.listar();
    res.json({ atividades: atividades.map(serializarAtividade) });
  });

  return router;
}
