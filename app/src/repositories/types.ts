import type pg from 'pg';

export interface QueryRunner {
  query<T extends pg.QueryResultRow = pg.QueryResultRow>(
    sql: string,
    parametros?: unknown[],
  ): Promise<pg.QueryResult<T>>;
}

export interface BancoDados extends QueryRunner {
  transacao<T>(fn: (cliente: pg.PoolClient) => Promise<T>): Promise<T>;
}
