/**
 * Aplica as migrações SQL de `db/migrations/` em ordem alfabética.
 *
 * Uso: `npm run db:migrate` (lê DATABASE_URL do .env).
 * Cada arquivo roda em uma transação e é registrado em `schema_migrations`,
 * então rodar de novo só aplica o que ainda falta.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { carregarArquivoEnv, loadConfig } from '../config/env.js';
import { Database } from './Database.js';

export const PASTA_MIGRACOES = path.resolve(import.meta.dirname, '../../db/migrations');

// Número arbitrário: impede duas execuções simultâneas da migração.
const CHAVE_LOCK = 8_2026_11;

export async function listarMigracoes(pasta = PASTA_MIGRACOES): Promise<string[]> {
  const arquivos = await readdir(pasta);
  return arquivos.filter((nome) => nome.endsWith('.sql')).sort();
}

export async function migrar(db: Database, pasta = PASTA_MIGRACOES): Promise<string[]> {
  const aplicadasAgora: string[] = [];

  await db.transacao(async (cliente) => {
    await cliente.query('SELECT pg_advisory_xact_lock($1)', [CHAVE_LOCK]);
    await cliente.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        nome       text PRIMARY KEY,
        aplicada_em timestamptz NOT NULL DEFAULT now()
      )`);

    const { rows } = await cliente.query<{ nome: string }>('SELECT nome FROM schema_migrations');
    const jaAplicadas = new Set(rows.map((linha) => linha.nome));

    for (const nome of await listarMigracoes(pasta)) {
      if (jaAplicadas.has(nome)) continue;
      const sql = await readFile(path.join(pasta, nome), 'utf8');
      await cliente.query(sql);
      await cliente.query('INSERT INTO schema_migrations (nome) VALUES ($1)', [nome]);
      aplicadasAgora.push(nome);
    }
  });

  return aplicadasAgora;
}

async function main(): Promise<void> {
  carregarArquivoEnv();
  const config = loadConfig();
  if (!config.databaseUrl) {
    console.error('DATABASE_URL não definida. Configure o arquivo .env (veja .env.example).');
    process.exitCode = 1;
    return;
  }

  const db = Database.conectar({ databaseUrl: config.databaseUrl, poolMax: 1 });
  try {
    const aplicadas = await migrar(db);
    console.log(
      aplicadas.length > 0
        ? `Migrações aplicadas: ${aplicadas.join(', ')}`
        : 'Banco já está atualizado. Nenhuma migração pendente.',
    );
  } finally {
    await db.fechar();
  }
}

// Só executa quando chamado diretamente (não quando importado em testes).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((erro: Error) => {
    console.error('Falha na migração:', erro.message);
    process.exitCode = 1;
  });
}
