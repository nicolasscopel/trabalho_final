import pg from 'pg';

export interface OpcoesBanco {
  databaseUrl: string;
  poolMax: number;
}

/** O mínimo que a rota de health precisa saber do banco (facilita testes). */
export interface VerificavelSaude {
  ping(): Promise<void>;
}

/**
 * Acesso ao Postgres (Neon) com `pg` + SQL puro.
 *
 * - SSL: a connection string do Neon já traz `sslmode=require`.
 * - Pool pequeno de propósito: na Vercel cada instância serverless tem o seu
 *   próprio pool; use a URL *pooled* do Neon (host com `-pooler`).
 * - `transacao()` é a base para inscrição/cancelamento atômicos
 *   (BEGIN ... SELECT ... FOR UPDATE ... COMMIT).
 */
export class Database implements VerificavelSaude {
  constructor(private readonly pool: pg.Pool) {}

  static conectar({ databaseUrl, poolMax }: OpcoesBanco): Database {
    const pool = new pg.Pool({
      connectionString: databaseUrl,
      max: poolMax,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      // O `pg` ignora `channel_binding=require` da URL do Neon; isto ativa o
      // SCRAM-SHA-256-PLUS quando o servidor oferece (proteção contra MITM).
      enableChannelBinding: true,
    });
    // Sem isso, um erro em conexão ociosa derruba o processo.
    pool.on('error', (erro) => {
      console.error('[db] erro em conexão ociosa:', erro.message);
    });
    return new Database(pool);
  }

  query<T extends pg.QueryResultRow = pg.QueryResultRow>(
    sql: string,
    parametros: unknown[] = [],
  ): Promise<pg.QueryResult<T>> {
    return this.pool.query<T>(sql, parametros);
  }

  /** Executa `fn` dentro de BEGIN/COMMIT; faz ROLLBACK se `fn` lançar. */
  async transacao<T>(fn: (cliente: pg.PoolClient) => Promise<T>): Promise<T> {
    const cliente = await this.pool.connect();
    try {
      await cliente.query('BEGIN');
      const resultado = await fn(cliente);
      await cliente.query('COMMIT');
      return resultado;
    } catch (erro) {
      await cliente.query('ROLLBACK').catch(() => undefined);
      throw erro;
    } finally {
      cliente.release();
    }
  }

  async ping(): Promise<void> {
    await this.pool.query('SELECT 1');
  }

  async fechar(): Promise<void> {
    await this.pool.end();
  }
}
