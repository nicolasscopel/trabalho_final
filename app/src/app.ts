import express, { type Express } from 'express';
import path from 'node:path';
import type { Ambiente } from './config/env.js';
import type { VerificavelSaude } from './db/Database.js';
import { rotaNaoEncontrada, tratarErros } from './http/middlewares/errorHandler.js';
import { rotasAtividades, type RepositorioAtividadesPublico } from './http/routes/atividades.js';
import { type RepositorioAuth, rotasAuth } from './http/routes/auth.js';
import {
  type RepositorioAtividadesCoordenacao,
  type RepositorioInscricoesCoordenacao,
  rotasCoordenacao,
} from './http/routes/coordenacao.js';
import { type RepositorioInscricoesUsuario, rotasInscricoes } from './http/routes/inscricoes.js';
import { rotasHealth } from './http/routes/health.js';
import { AtividadeRepository } from './repositories/AtividadeRepository.js';
import { InscricaoRepository } from './repositories/InscricaoRepository.js';
import type { BancoDados } from './repositories/types.js';
import { UsuarioRepository } from './repositories/UsuarioRepository.js';
import type { CpfHasher } from './security/CpfHasher.js';
import { PasswordHasher } from './security/PasswordHasher.js';
import type { SessionService } from './security/SessionService.js';
import { TokenService } from './security/TokenService.js';
import { type EnviadorEmail, SandboxEnviadorEmail } from './services/EmailService.js';

export const PASTA_PUBLIC = path.resolve(import.meta.dirname, '../public');

export interface RepositoriosApp {
  usuarios: RepositorioAuth;
  atividades: RepositorioAtividadesPublico & RepositorioAtividadesCoordenacao;
  inscricoes: RepositorioInscricoesUsuario & RepositorioInscricoesCoordenacao;
}

export interface DependenciasApp {
  db?: VerificavelSaude | BancoDados | undefined;
  repositorios?: RepositoriosApp | undefined;
  cpfHasher?: CpfHasher | undefined;
  passwordHasher?: PasswordHasher | undefined;
  tokenService?: TokenService | undefined;
  sessionService?: SessionService | undefined;
  enviadorEmail?: EnviadorEmail | undefined;
  ambiente?: Ambiente | undefined;
  appBaseUrl?: string | undefined;
  exporSandboxVerificacao?: boolean | undefined;
}

function ehBancoCompleto(db: unknown): db is BancoDados {
  return (
    typeof db === 'object' &&
    db !== null &&
    typeof (db as BancoDados).query === 'function' &&
    typeof (db as BancoDados).transacao === 'function'
  );
}

function temPing(db: unknown): db is VerificavelSaude {
  return typeof db === 'object' && db !== null && typeof (db as VerificavelSaude).ping === 'function';
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

  app.use('/health', rotasHealth(temPing(deps.db) ? deps.db : undefined));

  const repos =
    deps.repositorios ??
    (ehBancoCompleto(deps.db)
      ? {
          usuarios: new UsuarioRepository(deps.db),
          atividades: new AtividadeRepository(deps.db),
          inscricoes: new InscricaoRepository(deps.db),
        }
      : undefined);

  if (repos && deps.cpfHasher && deps.sessionService) {
    const ambiente = deps.ambiente ?? 'development';
    const appBaseUrl = deps.appBaseUrl ?? 'http://localhost:3000';
    const passwordHasher = deps.passwordHasher ?? new PasswordHasher();
    const tokenService = deps.tokenService ?? new TokenService();
    const enviadorEmail = deps.enviadorEmail ?? new SandboxEnviadorEmail();
    const exporSandboxVerificacao = deps.exporSandboxVerificacao ?? false;

    app.use(
      '/api/auth',
      rotasAuth({
        usuarioRepo: repos.usuarios,
        cpfHasher: deps.cpfHasher,
        passwordHasher,
        tokenService,
        sessionService: deps.sessionService,
        enviadorEmail,
        appBaseUrl,
        ambiente,
        exporSandboxVerificacao,
      }),
    );
    app.use('/api/atividades', rotasAtividades(repos.atividades));
    app.use('/api/inscricoes', rotasInscricoes(repos.inscricoes, deps.sessionService));
    app.use(
      '/api/coordenacao',
      rotasCoordenacao({
        atividadeRepo: repos.atividades,
        inscricaoRepo: repos.inscricoes,
        sessionService: deps.sessionService,
      }),
    );
  } else {
    app.use('/api', (_req, res) => {
      res.status(503).json({
        erro: {
          codigo: 'SERVICO_INDISPONIVEL',
          mensagem: 'Aplicação iniciada sem banco ou chaves de segurança configuradas.',
        },
      });
    });
  }

  app.use(express.static(PASTA_PUBLIC));

  app.use(rotaNaoEncontrada);
  app.use(tratarErros);

  return app;
}
