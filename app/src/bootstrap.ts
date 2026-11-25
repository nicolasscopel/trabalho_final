import { randomBytes } from 'node:crypto';
import type { Express } from 'express';
import { createApp } from './app.js';
import { type Config, loadConfig } from './config/env.js';
import { Database } from './db/Database.js';
import { CpfHasher } from './security/CpfHasher.js';
import { SessionService } from './security/SessionService.js';

export interface AplicacaoInicializada {
  app: Express;
  db: Database | undefined;
}

/** Constrói a aplicação Express + conexão com o banco a partir de uma `Config` validada. */
export function criarAppDeConfig(config: Config): AplicacaoInicializada {
  const db = config.databaseUrl
    ? Database.conectar({ databaseUrl: config.databaseUrl, poolMax: config.dbPoolMax })
    : undefined;

  if (!db) {
    console.warn('[aviso] DATABASE_URL não definida: rodando sem banco (/health/db responderá 503).');
  }

  const cpfHasher = config.cpfPepper ? new CpfHasher(config.cpfPepper) : undefined;
  if (!cpfHasher) {
    console.warn('[aviso] CPF_PEPPER não definido: rotas /api/* responderão 503.');
  }

  let segredoSessao = config.sessionSecret;
  if (!segredoSessao) {
    segredoSessao = randomBytes(32).toString('base64url');
    console.warn(
      '[aviso] SESSION_SECRET não definida no .env: usando chave temporária em memória (adicione SESSION_SECRET com 32+ chars para manter sessões ao reiniciar).',
    );
  }

  const app = createApp({
    db,
    ambiente: config.ambiente,
    appBaseUrl: config.appBaseUrl,
    cpfHasher,
    sessionService: new SessionService(segredoSessao),
    exporSandboxVerificacao: config.exporSandboxVerificacao,
  });

  return { app, db };
}

/**
 * Inicialização resiliente para ambiente serverless (Vercel): caso falte
 * alguma variável de ambiente obrigatória, expõe um app mínimo em modo 503
 * (mantendo `/health` ativo) sem vazar valores nos logs.
 */
export function criarAppDeAmbiente(env: NodeJS.ProcessEnv = process.env): Express {
  try {
    const config = loadConfig(env);
    return criarAppDeConfig(config).app;
  } catch (erro) {
    console.error('[config]', erro instanceof Error ? erro.message : 'Configuração inválida.');
    return createApp();
  }
}
