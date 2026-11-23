import type { Request, RequestHandler } from 'express';
import type { Ambiente } from '../../config/env.js';
import { ForbiddenError, UnauthorizedError } from '../../domain/errors.js';
import type { Papel } from '../../domain/Usuario.js';
import {
  COOKIE_SESSAO,
  lerCookie,
  type SessionService,
  type SessaoUsuario,
} from '../../security/SessionService.js';

declare global {
  namespace Express {
    interface Request {
      usuarioSessao?: SessaoUsuario;
    }
  }
}

export function exigirAutenticacao(sessionService: SessionService): RequestHandler {
  return (req, _res, next) => {
    const token = lerCookie(req.headers.cookie, COOKIE_SESSAO);
    if (!token) {
      throw new UnauthorizedError('Autenticação obrigatória.');
    }
    const sessao = sessionService.verificarToken(token);
    if (!sessao) {
      throw new UnauthorizedError('Sessão inválida ou expirada.');
    }
    req.usuarioSessao = sessao;
    next();
  };
}

export function exigirPapel(papel: Papel): RequestHandler {
  return (req, _res, next) => {
    if (!req.usuarioSessao) {
      throw new UnauthorizedError('Autenticação obrigatória.');
    }
    if (req.usuarioSessao.papel !== papel) {
      throw new ForbiddenError('Acesso restrito.');
    }
    next();
  };
}

export function requisicaoSegura(req: Request, ambiente: Ambiente): boolean {
  if (ambiente === 'production') return true;
  if (req.secure) return true;
  const proto = req.headers['x-forwarded-proto'];
  return proto === 'https' || (Array.isArray(proto) && proto.includes('https'));
}
