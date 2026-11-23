/**
 * Testes de integração do schema contra um Postgres REAL.
 *
 * Só rodam se TEST_DATABASE_URL estiver definida (use um banco/branch de
 * teste no Neon, nunca o de produção). Tudo acontece em um schema temporário
 * dentro de uma transação que termina em ROLLBACK: nada fica gravado.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { listarMigracoes, PASTA_MIGRACOES } from '../../src/db/migrate.js';

const url = process.env.TEST_DATABASE_URL?.trim();

describe.skipIf(!url)('schema do banco (integração)', () => {
  let cliente: pg.Client;

  /** Executa `sql` esperando que o banco recuse com o código/constraint informados. */
  async function esperarRecusa(sql: string, parametros: unknown[], constraint: string) {
    await cliente.query('SAVEPOINT tentativa');
    let erroDoBanco: unknown;
    try {
      await cliente.query(sql, parametros);
    } catch (erro) {
      erroDoBanco = erro;
    } finally {
      await cliente.query('ROLLBACK TO SAVEPOINT tentativa');
    }
    expect(erroDoBanco, `Esperava violação de ${constraint}, mas o comando passou.`).toBeDefined();
    expect((erroDoBanco as { constraint?: string }).constraint).toBe(constraint);
  }

  async function criarUsuario(sufixo: string): Promise<string> {
    const { rows } = await cliente.query<{ id: string }>(
      `INSERT INTO usuarios (nome, email, cpf_hash, senha_hash)
       VALUES ($1, $2, $3, 'scrypt$teste') RETURNING id`,
      [`Pessoa Fictícia ${sufixo}`, `ficticia.${sufixo}@exemplo.com`, sufixo.padEnd(64, '0')],
    );
    return rows[0]!.id;
  }

  async function criarAtividade(vagas: number): Promise<string> {
    const { rows } = await cliente.query<{ id: string }>(
      `INSERT INTO atividades (titulo, inicio, fim, carga_horaria_minutos, vagas)
       VALUES ('Palestra Fictícia', '2026-11-24 10:00-03', '2026-11-24 11:00-03', 60, $1)
       RETURNING id`,
      [vagas],
    );
    return rows[0]!.id;
  }

  beforeAll(async () => {
    cliente = new pg.Client({ connectionString: url });
    await cliente.connect();
    await cliente.query('BEGIN');
    const schema = `teste_${Date.now()}`;
    await cliente.query(`CREATE SCHEMA ${schema}`);
    await cliente.query(`SET LOCAL search_path TO ${schema}`);
    for (const nome of await listarMigracoes()) {
      await cliente.query(await readFile(path.join(PASTA_MIGRACOES, nome), 'utf8'));
    }
  });

  afterAll(async () => {
    if (!cliente) return;
    await cliente.query('ROLLBACK').catch(() => undefined);
    await cliente.end();
  });

  it('impede overbooking: o UPDATE condicional não passa do limite de vagas', async () => {
    const atividadeId = await criarAtividade(1);
    const incrementar = `UPDATE atividades SET vagas_ocupadas = vagas_ocupadas + 1
                          WHERE id = $1 AND vagas_ocupadas < vagas`;
    expect((await cliente.query(incrementar, [atividadeId])).rowCount).toBe(1);
    expect((await cliente.query(incrementar, [atividadeId])).rowCount).toBe(0);

    // Mesmo um UPDATE "sem cuidado" é barrado pelo CHECK do banco.
    await esperarRecusa(
      'UPDATE atividades SET vagas_ocupadas = vagas_ocupadas + 1 WHERE id = $1',
      [atividadeId],
      'atividades_sem_overbooking',
    );
  });

  it('impede atividade com início depois do fim', async () => {
    await esperarRecusa(
      `INSERT INTO atividades (titulo, inicio, fim, carga_horaria_minutos, vagas)
       VALUES ('Palestra Fictícia', '2026-11-24 12:00-03', '2026-11-24 11:00-03', 60, 10)`,
      [],
      'atividades_periodo_valido',
    );
  });

  it('impede duas inscrições ativas iguais, mas permite reinscrever após cancelar', async () => {
    const usuarioId = await criarUsuario('a1');
    const atividadeId = await criarAtividade(10);
    const inscrever = 'INSERT INTO inscricoes (usuario_id, atividade_id) VALUES ($1, $2)';

    await cliente.query(inscrever, [usuarioId, atividadeId]);
    await esperarRecusa(inscrever, [usuarioId, atividadeId], 'inscricoes_ativa_unica');

    await cliente.query(
      `UPDATE inscricoes SET status = 'cancelada', cancelada_em = now()
        WHERE usuario_id = $1 AND atividade_id = $2`,
      [usuarioId, atividadeId],
    );
    await cliente.query(inscrever, [usuarioId, atividadeId]);
  });

  it('impede presença em inscrição cancelada', async () => {
    const usuarioId = await criarUsuario('b2');
    const atividadeId = await criarAtividade(10);
    await esperarRecusa(
      `INSERT INTO inscricoes (usuario_id, atividade_id, status, cancelada_em, presente)
       VALUES ($1, $2, 'cancelada', now(), true)`,
      [usuarioId, atividadeId],
      'inscricoes_presenca_somente_ativa',
    );
  });

  it('impede e-mail e cpf_hash duplicados', async () => {
    await criarUsuario('c3');
    await esperarRecusa(
      `INSERT INTO usuarios (nome, email, cpf_hash, senha_hash)
       VALUES ('Outra Pessoa', 'ficticia.c3@exemplo.com', $1, 'x')`,
      ['d4'.padEnd(64, '0')],
      'usuarios_email_unico',
    );
    await esperarRecusa(
      `INSERT INTO usuarios (nome, email, cpf_hash, senha_hash)
       VALUES ('Outra Pessoa', 'outra@exemplo.com', $1, 'x')`,
      ['c3'.padEnd(64, '0')],
      'usuarios_cpf_hash_unico',
    );
  });
});
