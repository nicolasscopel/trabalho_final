import { Router } from 'express';
import { ForbiddenError, NotFoundError } from '../../domain/errors.js';
import type { InscricaoRepository } from '../../repositories/InscricaoRepository.js';
import type { SessionService } from '../../security/SessionService.js';
import { CertificadoService, nomeArquivoCertificado } from '../../services/CertificadoService.js';
import { exigirAutenticacao } from '../middlewares/auth.js';
import { serializarAtividade, serializarInscricao } from '../serializers.js';
import { exigirObjeto, validarUuid } from '../validation.js';

export type RepositorioInscricoesUsuario = Pick<
  InscricaoRepository,
  'inscreverAtomicamente' | 'cancelarAtomicamente' | 'listarPorUsuario' | 'buscarDadosCertificado'
>;

export function rotasInscricoes(
  inscricaoRepo: RepositorioInscricoesUsuario,
  sessionService: SessionService,
  certificadoService: CertificadoService = new CertificadoService(),
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

  router.get('/:id/certificado', async (req, res) => {
    const inscricaoId = validarUuid(req.params.id, 'inscricaoId');
    const dados = await inscricaoRepo.buscarDadosCertificado(inscricaoId);

    // Anti-IDOR: oculta existência de inscrições de outros usuários com 404.
    if (!dados || !dados.inscricao.pertenceA(req.usuarioSessao!.usuarioId)) {
      throw new NotFoundError('Inscrição não encontrada.');
    }
    if (!dados.inscricao.podeEmitirCertificado) {
      throw new ForbiddenError(
        'Certificado disponível apenas para inscrições ativas com presença confirmada.',
      );
    }

    const pdf = await certificadoService.gerarPdf({
      inscricaoId: dados.inscricao.id,
      participanteNome: dados.participanteNome,
      atividadeTitulo: dados.atividade.titulo,
      atividadeInicio: dados.atividade.inicio,
      atividadeFim: dados.atividade.fim,
      cargaHorariaMinutos: dados.atividade.cargaHorariaMinutos,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${nomeArquivoCertificado(dados.inscricao.id)}"`,
    );
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(pdf);
  });

  return router;
}
