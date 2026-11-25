import type { Atividade } from '../domain/Atividade.js';
import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from '../domain/errors.js';
import { Inscricao, type StatusInscricao } from '../domain/Inscricao.js';
import { type Papel, Usuario } from '../domain/Usuario.js';
import { COLUNAS_ATIVIDADE, type LinhaAtividade, mapearAtividade } from './AtividadeRepository.js';
import type { BancoDados } from './types.js';

interface LinhaInscricao {
  id: string;
  usuario_id: string;
  atividade_id: string;
  status: StatusInscricao;
  presente: boolean;
  criado_em: Date;
  cancelada_em: Date | null;
}

interface LinhaInscricaoComAtividade extends LinhaInscricao {
  atividade_titulo: string;
  atividade_descricao: string | null;
  atividade_inicio: Date;
  atividade_fim: Date;
  atividade_carga_horaria_minutos: number;
  atividade_vagas: number;
  atividade_vagas_ocupadas: number;
}

interface LinhaInscritoCoordenacao {
  inscricao_id: string;
  usuario_id: string;
  usuario_nome: string;
  usuario_email: string;
  status: StatusInscricao;
  presente: boolean;
  criado_em: Date;
}

export interface InscricaoComAtividade {
  inscricao: Inscricao;
  atividade: Atividade;
}

export interface DadosCertificadoInscricao extends InscricaoComAtividade {
  participanteNome: string;
}

export interface InscritoCoordenacao {
  inscricaoId: string;
  usuarioId: string;
  nome: string;
  email: string;
  status: StatusInscricao;
  presente: boolean;
  criadoEm: Date;
}

function mapearInscricao(linha: LinhaInscricao): Inscricao {
  return Inscricao.restaurar({
    id: linha.id,
    usuarioId: linha.usuario_id,
    atividadeId: linha.atividade_id,
    status: linha.status,
    presente: linha.presente,
    criadoEm: new Date(linha.criado_em),
    canceladaEm: linha.cancelada_em ? new Date(linha.cancelada_em) : null,
  });
}

export class InscricaoRepository {
  constructor(private readonly db: BancoDados) {}

  /**
   * Inscreve um usuário em uma atividade de forma atômica e segura sob carga.
   *
   * Ordem fixa de locks (usuarios -> atividades) para evitar deadlocks:
   * 1. `SELECT ... FROM usuarios FOR UPDATE` serializa inscrições/cancelamentos
   *    do mesmo usuário (choque de horário sem corrida).
   * 2. `UPDATE atividades SET vagas_ocupadas = vagas_ocupadas + 1 WHERE ... AND
   *    vagas_ocupadas < vagas` impede overbooking mesmo com 30+ chamadas simultâneas.
   */
  async inscreverAtomicamente(
    usuarioId: string,
    atividadeId: string,
  ): Promise<InscricaoComAtividade> {
    return this.db.transacao(async (cliente) => {
      const { rows: usuarios } = await cliente.query<{
        id: string;
        nome: string;
        email: string;
        cpf_hash: string;
        senha_hash: string;
        email_verificado: boolean;
        papel: Papel;
        criado_em: Date;
      }>(
        `SELECT id, nome, email, cpf_hash, senha_hash, email_verificado, papel, criado_em
           FROM usuarios
          WHERE id = $1
          FOR UPDATE`,
        [usuarioId],
      );
      const u = usuarios[0];
      if (!u) {
        throw new UnauthorizedError('Sessão inválida.');
      }
      const usuario = Usuario.restaurar({
        id: u.id,
        nome: u.nome,
        email: u.email,
        cpfHash: u.cpf_hash,
        senhaHash: u.senha_hash,
        emailVerificado: u.email_verificado,
        papel: u.papel,
        criadoEm: new Date(u.criado_em),
      });
      if (!usuario.podeSeInscrever) {
        throw new ForbiddenError('Confirme seu e-mail antes de se inscrever em atividades.');
      }

      const { rows: atividades } = await cliente.query<LinhaAtividade>(
        `SELECT ${COLUNAS_ATIVIDADE} FROM atividades WHERE id = $1`,
        [atividadeId],
      );
      if (!atividades[0]) {
        throw new NotFoundError('Atividade não encontrada.');
      }
      const atividadeAlvo = mapearAtividade(atividades[0]);

      const { rows: ativas } = await cliente.query<LinhaAtividade>(
        `SELECT a.id, a.titulo, a.descricao, a.inicio, a.fim,
                a.carga_horaria_minutos, a.vagas, a.vagas_ocupadas
           FROM inscricoes i
           JOIN atividades a ON a.id = i.atividade_id
          WHERE i.usuario_id = $1 AND i.status = 'ativa'`,
        [usuarioId],
      );
      if (ativas.some((linha) => linha.id === atividadeId)) {
        throw new ConflictError('Você já está inscrito nesta atividade.');
      }
      const atividadesAtivas = ativas.map(mapearAtividade);
      if (atividadeAlvo.encontrarConflito(atividadesAtivas)) {
        throw new ConflictError(
          'Horário em conflito com outra atividade em que você já está inscrito.',
        );
      }

      const { rows: atividadesAtualizadas } = await cliente.query<LinhaAtividade>(
        `UPDATE atividades
            SET vagas_ocupadas = vagas_ocupadas + 1
          WHERE id = $1 AND vagas_ocupadas < vagas
          RETURNING ${COLUNAS_ATIVIDADE}`,
        [atividadeId],
      );
      if (!atividadesAtualizadas[0]) {
        throw new ConflictError('Não há vagas disponíveis para esta atividade.');
      }

      const { rows: inscricoes } = await cliente.query<LinhaInscricao>(
        `INSERT INTO inscricoes (usuario_id, atividade_id)
         VALUES ($1, $2)
         RETURNING id, usuario_id, atividade_id, status, presente, criado_em, cancelada_em`,
        [usuarioId, atividadeId],
      );

      return {
        inscricao: mapearInscricao(inscricoes[0]!),
        atividade: mapearAtividade(atividadesAtualizadas[0]),
      };
    });
  }

  /**
   * Cancela uma inscrição do usuário autenticado devolvendo a vaga à atividade.
   * Mantém a ordem de lock iniciando por `usuarios FOR UPDATE`.
   */
  async cancelarAtomicamente(
    inscricaoId: string,
    usuarioIdSolicitante: string,
    agora: Date = new Date(),
  ): Promise<Inscricao> {
    return this.db.transacao(async (cliente) => {
      const { rowCount: usuarioExiste } = await cliente.query(
        'SELECT id FROM usuarios WHERE id = $1 FOR UPDATE',
        [usuarioIdSolicitante],
      );
      if (!usuarioExiste) {
        throw new UnauthorizedError('Sessão inválida.');
      }

      const { rows } = await cliente.query<LinhaInscricao>(
        `SELECT id, usuario_id, atividade_id, status, presente, criado_em, cancelada_em
           FROM inscricoes
          WHERE id = $1
          FOR UPDATE`,
        [inscricaoId],
      );
      const linha = rows[0];
      if (!linha) {
        throw new NotFoundError('Inscrição não encontrada.');
      }

      const inscricao = mapearInscricao(linha);
      // Anti-IDOR: usuário não pode descobrir nem cancelar inscrição de outra pessoa.
      if (!inscricao.pertenceA(usuarioIdSolicitante)) {
        throw new NotFoundError('Inscrição não encontrada.');
      }

      inscricao.cancelar(agora);

      await cliente.query(
        `UPDATE inscricoes
            SET status = 'cancelada', cancelada_em = $2
          WHERE id = $1`,
        [inscricaoId, inscricao.canceladaEm],
      );
      await cliente.query(
        `UPDATE atividades
            SET vagas_ocupadas = vagas_ocupadas - 1
          WHERE id = $1 AND vagas_ocupadas > 0`,
        [inscricao.atividadeId],
      );

      return inscricao;
    });
  }

  async listarPorUsuario(usuarioId: string): Promise<InscricaoComAtividade[]> {
    const { rows } = await this.db.query<LinhaInscricaoComAtividade>(
      `SELECT i.id, i.usuario_id, i.atividade_id, i.status, i.presente, i.criado_em, i.cancelada_em,
              a.titulo AS atividade_titulo,
              a.descricao AS atividade_descricao,
              a.inicio AS atividade_inicio,
              a.fim AS atividade_fim,
              a.carga_horaria_minutos AS atividade_carga_horaria_minutos,
              a.vagas AS atividade_vagas,
              a.vagas_ocupadas AS atividade_vagas_ocupadas
         FROM inscricoes i
         JOIN atividades a ON a.id = i.atividade_id
        WHERE i.usuario_id = $1
        ORDER BY a.inicio ASC, i.criado_em DESC`,
      [usuarioId],
    );

    return rows.map((r) => ({
      inscricao: mapearInscricao(r),
      atividade: mapearAtividade({
        id: r.atividade_id,
        titulo: r.atividade_titulo,
        descricao: r.atividade_descricao,
        inicio: r.atividade_inicio,
        fim: r.atividade_fim,
        carga_horaria_minutos: r.atividade_carga_horaria_minutos,
        vagas: r.atividade_vagas,
        vagas_ocupadas: r.atividade_vagas_ocupadas,
      }),
    }));
  }

  async listarPorAtividade(
    atividadeId: string,
    busca?: string,
  ): Promise<InscritoCoordenacao[]> {
    const { rowCount } = await this.db.query('SELECT id FROM atividades WHERE id = $1', [
      atividadeId,
    ]);
    if (!rowCount) {
      throw new NotFoundError('Atividade não encontrada.');
    }

    const filtroLimpo = busca?.trim();
    const filtroEscapado = filtroLimpo ? filtroLimpo.replace(/[\\%_]/g, '\\$&') : null;
    const { rows } = await this.db.query<LinhaInscritoCoordenacao>(
      `SELECT i.id AS inscricao_id,
              u.id AS usuario_id,
              u.nome AS usuario_nome,
              u.email AS usuario_email,
              i.status,
              i.presente,
              i.criado_em
         FROM inscricoes i
         JOIN usuarios u ON u.id = i.usuario_id
        WHERE i.atividade_id = $1
          AND i.status = 'ativa'
          AND ($2::text IS NULL OR u.nome ILIKE '%' || $2 || '%' ESCAPE '\\' OR u.email ILIKE '%' || $2 || '%' ESCAPE '\\')
        ORDER BY u.nome ASC`,
      [atividadeId, filtroEscapado],
    );

    return rows.map((r) => ({
      inscricaoId: r.inscricao_id,
      usuarioId: r.usuario_id,
      nome: r.usuario_nome,
      email: r.usuario_email,
      status: r.status,
      presente: r.presente,
      criadoEm: new Date(r.criado_em),
    }));
  }

  async atualizarPresenca(inscricaoId: string, presente: boolean): Promise<Inscricao> {
    return this.db.transacao(async (cliente) => {
      const { rows } = await cliente.query<LinhaInscricao>(
        `SELECT id, usuario_id, atividade_id, status, presente, criado_em, cancelada_em
           FROM inscricoes
          WHERE id = $1
          FOR UPDATE`,
        [inscricaoId],
      );
      const linha = rows[0];
      if (!linha) {
        throw new NotFoundError('Inscrição não encontrada.');
      }

      const inscricao = mapearInscricao(linha);
      if (presente) {
        inscricao.registrarPresenca();
      } else {
        inscricao.removerPresenca();
      }

      await cliente.query('UPDATE inscricoes SET presente = $2 WHERE id = $1', [
        inscricaoId,
        inscricao.presente,
      ]);

      return inscricao;
    });
  }

  /**
   * Busca apenas os dados necessários para o certificado (sem CPF hash,
   * senha hash ou e-mail do participante).
   */
  async buscarDadosCertificado(inscricaoId: string): Promise<DadosCertificadoInscricao | null> {
    const { rows } = await this.db.query<LinhaInscricaoComAtividade & { usuario_nome: string }>(
      `SELECT i.id, i.usuario_id, i.atividade_id, i.status, i.presente, i.criado_em, i.cancelada_em,
              u.nome AS usuario_nome,
              a.titulo AS atividade_titulo,
              a.descricao AS atividade_descricao,
              a.inicio AS atividade_inicio,
              a.fim AS atividade_fim,
              a.carga_horaria_minutos AS atividade_carga_horaria_minutos,
              a.vagas AS atividade_vagas,
              a.vagas_ocupadas AS atividade_vagas_ocupadas
         FROM inscricoes i
         JOIN usuarios u ON u.id = i.usuario_id
         JOIN atividades a ON a.id = i.atividade_id
        WHERE i.id = $1`,
      [inscricaoId],
    );

    const r = rows[0];
    if (!r) return null;

    return {
      inscricao: mapearInscricao(r),
      atividade: mapearAtividade({
        id: r.atividade_id,
        titulo: r.atividade_titulo,
        descricao: r.atividade_descricao,
        inicio: r.atividade_inicio,
        fim: r.atividade_fim,
        carga_horaria_minutos: r.atividade_carga_horaria_minutos,
        vagas: r.atividade_vagas,
        vagas_ocupadas: r.atividade_vagas_ocupadas,
      }),
      participanteNome: Usuario.normalizarNome(r.usuario_nome),
    };
  }
}
