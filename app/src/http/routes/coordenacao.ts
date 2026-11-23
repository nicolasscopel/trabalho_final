import { Router } from 'express';
import { ValidationError } from '../../domain/errors.js';
import type { AtividadeRepository } from '../../repositories/AtividadeRepository.js';
import type { InscricaoRepository } from '../../repositories/InscricaoRepository.js';
import type { SessionService } from '../../security/SessionService.js';
import { exigirAutenticacao, exigirPapel } from '../middlewares/auth.js';
import { serializarAtividade, serializarInscricao } from '../serializers.js';
import { exigirObjeto, lerBooleano, lerData, lerInteiro, validarUuid } from '../validation.js';

export type RepositorioAtividadesCoordenacao = Pick<AtividadeRepository, 'criar' | 'excluir'>;
export type RepositorioInscricoesCoordenacao = Pick<
  InscricaoRepository,
  'listarPorAtividade' | 'atualizarPresenca'
>;

export interface DependenciasCoordenacao {
  atividadeRepo: RepositorioAtividadesCoordenacao;
  inscricaoRepo: RepositorioInscricoesCoordenacao;
  sessionService: SessionService;
}

export function rotasCoordenacao(deps: DependenciasCoordenacao): Router {
  const router = Router();
  router.use(exigirAutenticacao(deps.sessionService));
  router.use(exigirPapel('coordenacao'));

  router.post('/atividades', async (req, res) => {
    const corpo = exigirObjeto(req.body);
    if (typeof corpo.titulo !== 'string') {
      throw new ValidationError('O título deve ter entre 3 e 200 caracteres.');
    }

    let descricao: string | null = null;
    if (corpo.descricao !== undefined && corpo.descricao !== null) {
      if (typeof corpo.descricao !== 'string') {
        throw new ValidationError('Descrição inválida.');
      }
      const limpa = corpo.descricao.trim();
      descricao = limpa ? limpa : null;
    }

    const inicio = lerData(corpo.inicio, 'inicio');
    const fim = lerData(corpo.fim, 'fim');
    const cargaHorariaMinutos = lerInteiro(corpo.cargaHorariaMinutos, 'cargaHorariaMinutos');
    const vagas = lerInteiro(corpo.vagas, 'vagas');

    const atividade = await deps.atividadeRepo.criar({
      titulo: corpo.titulo,
      descricao,
      inicio,
      fim,
      cargaHorariaMinutos,
      vagas,
    });

    res.status(201).json({ atividade: serializarAtividade(atividade) });
  });

  router.delete('/atividades/:atividadeId', async (req, res) => {
    const atividadeId = validarUuid(req.params.atividadeId, 'atividadeId');
    await deps.atividadeRepo.excluir(atividadeId);
    res.json({ mensagem: 'Atividade excluída com sucesso.' });
  });

  router.get('/atividades/:atividadeId/inscritos', async (req, res) => {
    const atividadeId = validarUuid(req.params.atividadeId, 'atividadeId');
    const busca = typeof req.query.busca === 'string' ? req.query.busca : undefined;

    const inscritos = await deps.inscricaoRepo.listarPorAtividade(atividadeId, busca);
    res.json({
      inscritos: inscritos.map((item) => ({
        ...item,
        criadoEm: item.criadoEm.toISOString(),
      })),
    });
  });

  router.patch('/inscricoes/:inscricaoId/presenca', async (req, res) => {
    const inscricaoId = validarUuid(req.params.inscricaoId, 'inscricaoId');
    const corpo = exigirObjeto(req.body);
    const presente = lerBooleano(corpo.presente, 'presente');

    const inscricao = await deps.inscricaoRepo.atualizarPresenca(inscricaoId, presente);
    res.json({ inscricao: serializarInscricao(inscricao) });
  });

  return router;
}
