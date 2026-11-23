import { Router } from 'express';
import type { VerificavelSaude } from '../../db/Database.js';

/**
 * GET /health     -> a aplicação está no ar (não toca no banco).
 * GET /health/db  -> o banco responde a um `SELECT 1`.
 *
 * Nenhuma das respostas expõe detalhes de erro ou da conexão.
 */
export function rotasHealth(db?: VerificavelSaude): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json({ status: 'ok' });
  });

  router.get('/db', async (_req, res) => {
    if (!db) {
      res.status(503).json({ status: 'erro', banco: 'nao_configurado' });
      return;
    }
    try {
      await db.ping();
      res.json({ status: 'ok', banco: 'ok' });
    } catch (erro) {
      console.error('[health] banco indisponível:', (erro as Error).message);
      res.status(503).json({ status: 'erro', banco: 'indisponivel' });
    }
  });

  return router;
}
