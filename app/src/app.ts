import express, { type Express } from 'express';
import type { VerificavelSaude } from './db/Database.js';
import { rotaNaoEncontrada, tratarErros } from './http/middlewares/errorHandler.js';
import { rotasHealth } from './http/routes/health.js';

export interface DependenciasApp {
  db?: VerificavelSaude | undefined;
}

/**
 * Monta o app Express SEM chamar `listen`.
 * - Local: src/server.ts chama `listen`.
 * - Testes: o supertest usa o app direto.
 * - Vercel (Etapa de deploy): exportará este app como handler serverless.
 */
export function createApp(deps: DependenciasApp = {}): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  app.use('/health', rotasHealth(deps.db));

  app.use(rotaNaoEncontrada);
  app.use(tratarErros);

  return app;
}
