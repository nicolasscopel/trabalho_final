import { Router } from 'express';
import type { InscricaoRepository } from '../../repositories/InscricaoRepository.js';
import type { SessionService } from '../../security/SessionService.js';
import { exigirAutenticacao } from '../middlewares/auth.js';
import { serializarAtividade, serializarInscricao } from '../serializers.js';
import { exigirObjeto, validarUuid } from '../validation.js';

export type RepositorioInscricoesUsuario = Pick<
  InscricaoRepository,
  'inscreverAtomicamente' | 'cancelarAtomicamente' | 'listarPorUsuario'
>;

export function rotasInscricoes(
  inscricaoRepo: RepositorioInscricoesUsuario,
  sessionService: SessionService,
): Router {
  const router = Router();
  router.use(exigirAutenticacao(sessionService));

  router.get('/minhas', async (req, res) => {
    const lista = await inscricaoRepo.listarPorUsuario(req.usuarioSessao!.usuarioId);
    res.json({
      inscricoes: lista.map(({ inscricao, atividade }) => ({
        ...serializarInscricao(inscricao),
        atividade: serializarAtividade(atividade),
      })),
    });
  });

  router.post('/', async (req, res) => {
    const corpo = exigirObjeto(req.body);
    const atividadeId = validarUuid(corpo.atividadeId, 'atividadeId');

    const resultado = await inscricaoRepo.inscreverAtomicamente(
      req.usuarioSessao!.usuarioId,
      atividadeId,
    );

    res.status(201).json({
      inscricao: serializarInscricao(resultado.inscricao),
      atividade: serializarAtividade(resultado.atividade),
    });
  });

  router.post('/:id/cancelar', async (req, res) => {
    const inscricaoId = validarUuid(req.params.id, 'inscricaoId');
    const inscricao = await inscricaoRepo.cancelarAtomicamente(
      inscricaoId,
      req.usuarioSessao!.usuarioId,
    );
    res.json({ inscricao: serializarInscricao(inscricao) });
  });

  return router;
}
