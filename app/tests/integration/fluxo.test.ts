/**
 * Testes de integração dos repositórios e concorrência contra Postgres REAL.
 *
 * Só rodam quando TEST_DATABASE_URL está definida no .env.
 * Usa um schema temporário por execução e remove o schema no afterAll.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { listarMigracoes, PASTA_MIGRACOES } from '../../src/db/migrate.js';
import { ConflictError, NotFoundError } from '../../src/domain/errors.js';
import { AtividadeRepository } from '../../src/repositories/AtividadeRepository.js';
import { InscricaoRepository } from '../../src/repositories/InscricaoRepository.js';
import type { BancoDados } from '../../src/repositories/types.js';
import { UsuarioRepository } from '../../src/repositories/UsuarioRepository.js';
import { CpfHasher } from '../../src/security/CpfHasher.js';
import { TokenService } from '../../src/security/TokenService.js';

const url = process.env.TEST_DATABASE_URL?.trim();

/**
 * Wrapper compatível com PgBouncer (-pooler do Neon): aplica `SET LOCAL search_path`
 * dentro de cada transação para isolar o teste em um schema temporário.
 */
class BancoSchemaTemporario implements BancoDados {
  constructor(
    private readonly pool: pg.Pool,
    private readonly schema: string,
  ) {}

  async query<T extends pg.QueryResultRow = pg.QueryResultRow>(
    sql: string,
    parametros: unknown[] = [],
  ): Promise<pg.QueryResult<T>> {
    const cliente = await this.pool.connect();
    try {
      await cliente.query('BEGIN');
      await cliente.query(`SET LOCAL search_path TO ${this.schema}`);
      const res = await cliente.query<T>(sql, parametros);
      await cliente.query('COMMIT');
      return res;
    } catch (erro) {
      await cliente.query('ROLLBACK').catch(() => undefined);
      throw erro;
    } finally {
      cliente.release();
    }
  }

  async transacao<T>(fn: (cliente: pg.PoolClient) => Promise<T>): Promise<T> {
    const cliente = await this.pool.connect();
    try {
      await cliente.query('BEGIN');
      await cliente.query(`SET LOCAL search_path TO ${this.schema}`);
      const res = await fn(cliente);
      await cliente.query('COMMIT');
      return res;
    } catch (erro) {
      await cliente.query('ROLLBACK').catch(() => undefined);
      throw erro;
    } finally {
      cliente.release();
    }
  }
}

describe.skipIf(!url)('repositórios e concorrência (integração Postgres)', () => {
  let pool: pg.Pool;
  let schema: string;
  let db: BancoSchemaTemporario;
  let usuarioRepo: UsuarioRepository;
  let atividadeRepo: AtividadeRepository;
  let inscricaoRepo: InscricaoRepository;
  const tokenService = new TokenService();
  const cpfHasher = new CpfHasher('z'.repeat(32));

  beforeAll(async () => {
    pool = new pg.Pool({
      connectionString: url,
      max: 10,
      enableChannelBinding: true,
    });
    schema = `teste_fluxo_${Date.now()}`;
    await pool.query(`CREATE SCHEMA ${schema}`);
    db = new BancoSchemaTemporario(pool, schema);

    await db.transacao(async (cliente) => {
      for (const nome of await listarMigracoes()) {
        await cliente.query(await readFile(path.join(PASTA_MIGRACOES, nome), 'utf8'));
      }
    });

    usuarioRepo = new UsuarioRepository(db);
    atividadeRepo = new AtividadeRepository(db);
    inscricaoRepo = new InscricaoRepository(db);
  });

  afterAll(async () => {
    if (!pool) return;
    await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`).catch(() => undefined);
    await pool.end();
  });

  async function criarParticipanteVerificado(sufixo: string) {
    const tok = tokenService.gerar();
    const usuario = await usuarioRepo.criarComTokenVerificacao(
      {
        nome: `Participante Fictício ${sufixo}`,
        email: `ficticio.${sufixo}@exemplo.local`,
        cpfHash: cpfHasher.hash({ digitos: sufixo.padStart(11, '1').slice(0, 11) } as never),
        senhaHash: 'scrypt$teste',
      },
      tok,
    );
    return usuarioRepo.verificarEmailPorToken(tok.tokenHash);
  }

  it('fluxo completo no Postgres: verificação, inscrição, cancelamento e presença', async () => {
    const usuario = await criarParticipanteVerificado('90000000100');
    const atividade = await atividadeRepo.criar({
      titulo: 'Palestra Postgres Fictícia',
      descricao: null,
      inicio: new Date('2026-11-27T19:00:00-03:00'),
      fim: new Date('2026-11-27T20:00:00-03:00'),
      cargaHorariaMinutos: 60,
      vagas: 2,
    });

    const primeira = await inscricaoRepo.inscreverAtomicamente(usuario.id, atividade.id);
    expect(primeira.atividade.vagasOcupadas).toBe(1);

    const cancelada = await inscricaoRepo.cancelarAtomicamente(primeira.inscricao.id, usuario.id);
    expect(cancelada.status).toBe('cancelada');

    const aposCancelar = await atividadeRepo.buscarPorId(atividade.id);
    expect(aposCancelar?.vagasOcupadas).toBe(0);

    // Reinscrição após cancelar
    const segunda = await inscricaoRepo.inscreverAtomicamente(usuario.id, atividade.id);
    expect(segunda.atividade.vagasOcupadas).toBe(1);

    const presentes = await inscricaoRepo.atualizarPresenca(segunda.inscricao.id, true);
    expect(presentes.podeEmitirCertificado).toBe(true);

    const busca = await inscricaoRepo.listarPorAtividade(atividade.id, '90000000100');
    expect(busca).toHaveLength(1);
    expect(busca[0]?.presente).toBe(true);
  });

  it('suporta 30 solicitações simultâneas sem overbooking nem deadlocks', async () => {
    const atividade = await atividadeRepo.criar({
      titulo: 'Oficina Concorrência Fictícia',
      descricao: null,
      inicio: new Date('2026-11-28T14:00:00-03:00'),
      fim: new Date('2026-11-28T16:00:00-03:00'),
      cargaHorariaMinutos: 120,
      vagas: 10,
    });

    const participantes = await Promise.all(
      Array.from({ length: 30 }, (_, idx) =>
        criarParticipanteVerificado(`80000${String(idx).padStart(6, '0')}`),
      ),
    );

    const resultados = await Promise.allSettled(
      participantes.map((u) => inscricaoRepo.inscreverAtomicamente(u.id, atividade.id)),
    );

    const sucessos = resultados.filter((r) => r.status === 'fulfilled');
    const falhas = resultados.filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected',
    );

    expect(sucessos).toHaveLength(10);
    expect(falhas).toHaveLength(20);
    for (const falha of falhas) {
      expect(falha.reason).toBeInstanceOf(ConflictError);
    }

    const final = await atividadeRepo.buscarPorId(atividade.id);
    expect(final?.vagasOcupadas).toBe(10);
  }, 15_000);

  it('impede choque de horário quando o mesmo usuário envia 5 inscrições simultâneas', async () => {
    const usuario = await criarParticipanteVerificado('70000000100');
    const atividades = await Promise.all(
      Array.from({ length: 5 }, (_, idx) =>
        atividadeRepo.criar({
          titulo: `Sala Paralela ${idx + 1}`,
          descricao: null,
          inicio: new Date('2026-11-29T19:00:00-03:00'),
          fim: new Date('2026-11-29T20:00:00-03:00'),
          cargaHorariaMinutos: 60,
          vagas: 20,
        }),
      ),
    );

    const resultados = await Promise.allSettled(
      atividades.map((a) => inscricaoRepo.inscreverAtomicamente(usuario.id, a.id)),
    );

    const sucessos = resultados.filter((r) => r.status === 'fulfilled');
    const falhas = resultados.filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected',
    );

    expect(sucessos).toHaveLength(1);
    expect(falhas).toHaveLength(4);
    for (const falha of falhas) {
      expect(falha.reason).toBeInstanceOf(ConflictError);
    }
  });

  it('impede excluir atividade com inscrição ativa e permite após cancelamento', async () => {
    const usuario = await criarParticipanteVerificado('60000000100');
    const atividade = await atividadeRepo.criar({
      titulo: 'Atividade Exclusão Postgres',
      descricao: null,
      inicio: new Date('2026-11-30T10:00:00-03:00'),
      fim: new Date('2026-11-30T11:00:00-03:00'),
      cargaHorariaMinutos: 60,
      vagas: 5,
    });

    const insc = await inscricaoRepo.inscreverAtomicamente(usuario.id, atividade.id);
    await expect(atividadeRepo.excluir(atividade.id)).rejects.toBeInstanceOf(ConflictError);

    await inscricaoRepo.cancelarAtomicamente(insc.inscricao.id, usuario.id);
    await atividadeRepo.excluir(atividade.id);

    expect(await atividadeRepo.buscarPorId(atividade.id)).toBeNull();
    await expect(atividadeRepo.excluir(atividade.id)).rejects.toBeInstanceOf(NotFoundError);
  });
});
