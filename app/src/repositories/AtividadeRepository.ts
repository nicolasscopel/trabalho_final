import { Atividade } from '../domain/Atividade.js';
import { ConflictError, NotFoundError } from '../domain/errors.js';
import type { BancoDados } from './types.js';

export interface LinhaAtividade {
  id: string;
  titulo: string;
  descricao: string | null;
  inicio: Date;
  fim: Date;
  carga_horaria_minutos: number;
  vagas: number;
  vagas_ocupadas: number;
}

export const COLUNAS_ATIVIDADE =
  'id, titulo, descricao, inicio, fim, carga_horaria_minutos, vagas, vagas_ocupadas';

export function mapearAtividade(linha: LinhaAtividade): Atividade {
  return Atividade.criar({
    id: linha.id,
    titulo: linha.titulo,
    descricao: linha.descricao,
    inicio: new Date(linha.inicio),
    fim: new Date(linha.fim),
    cargaHorariaMinutos: linha.carga_horaria_minutos,
    vagas: linha.vagas,
    vagasOcupadas: linha.vagas_ocupadas,
  });
}

export interface CriarAtividadeInput {
  titulo: string;
  descricao: string | null;
  inicio: Date;
  fim: Date;
  cargaHorariaMinutos: number;
  vagas: number;
}

export class AtividadeRepository {
  constructor(private readonly db: BancoDados) {}

  async listar(): Promise<Atividade[]> {
    const { rows } = await this.db.query<LinhaAtividade>(
      `SELECT ${COLUNAS_ATIVIDADE}
         FROM atividades
        ORDER BY inicio ASC, titulo ASC`,
    );
    return rows.map(mapearAtividade);
  }

  async buscarPorId(id: string): Promise<Atividade | null> {
    const { rows } = await this.db.query<LinhaAtividade>(
      `SELECT ${COLUNAS_ATIVIDADE} FROM atividades WHERE id = $1`,
      [id],
    );
    return rows[0] ? mapearAtividade(rows[0]) : null;
  }

  async criar(dados: CriarAtividadeInput): Promise<Atividade> {
    // Valida as regras de domínio antes de enviar ao banco.
    const validada = Atividade.criar({
      id: '00000000-0000-0000-0000-000000000000',
      titulo: dados.titulo,
      descricao: dados.descricao,
      inicio: dados.inicio,
      fim: dados.fim,
      cargaHorariaMinutos: dados.cargaHorariaMinutos,
      vagas: dados.vagas,
      vagasOcupadas: 0,
    });

    const { rows } = await this.db.query<LinhaAtividade>(
      `INSERT INTO atividades (titulo, descricao, inicio, fim, carga_horaria_minutos, vagas)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${COLUNAS_ATIVIDADE}`,
      [
        validada.titulo,
        validada.descricao,
        validada.inicio,
        validada.fim,
        validada.cargaHorariaMinutos,
        validada.vagas,
      ],
    );
    return mapearAtividade(rows[0]!);
  }

  /**
   * Exclui uma atividade que não possua inscrições ativas.
   *
   * Inscrições já canceladas vinculadas à atividade são removidas na mesma
   * transação para respeitar o `ON DELETE RESTRICT` do schema sem apagar
   * histórico de participantes ativos.
   */
  async excluir(id: string): Promise<void> {
    try {
      await this.db.transacao(async (cliente) => {
        const { rowCount } = await cliente.query(
          'SELECT id FROM atividades WHERE id = $1 FOR UPDATE',
          [id],
        );
        if (!rowCount) {
          throw new NotFoundError('Atividade não encontrada.');
        }

        const { rowCount: ativas } = await cliente.query(
          `SELECT 1 FROM inscricoes
            WHERE atividade_id = $1 AND status = 'ativa'
            LIMIT 1`,
          [id],
        );
        if (ativas && ativas > 0) {
          throw new ConflictError(
            'Não é possível excluir uma atividade que possui inscrições ativas.',
          );
        }

        await cliente.query(
          `DELETE FROM inscricoes WHERE atividade_id = $1 AND status = 'cancelada'`,
          [id],
        );
        await cliente.query('DELETE FROM atividades WHERE id = $1', [id]);
      });
    } catch (erro) {
      if ((erro as { code?: string }).code === '23503') {
        throw new ConflictError(
          'Não é possível excluir uma atividade que possui inscrições ativas.',
        );
      }
      throw erro;
    }
  }
}
