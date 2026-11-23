import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../../domain/errors.js';

interface CorpoErro {
  erro: { codigo: string; mensagem: string };
}

function corpo(codigo: string, mensagem: string): CorpoErro {
  return { erro: { codigo, mensagem } };
}

/** 404 para rotas inexistentes. */
export const rotaNaoEncontrada: RequestHandler = (_req, res) => {
  res.status(404).json(corpo('NAO_ENCONTRADO', 'Rota não encontrada.'));
};

/**
 * Converte erros em respostas JSON.
 *
 * Privacidade: no log vão apenas nome/código/mensagem do erro. NÃO logamos o
 * corpo da requisição nem `erro.detail` do Postgres, que pode conter valores
 * como "Key (email)=(fulano@...) already exists".
 */
export const tratarErros: ErrorRequestHandler = (erro: unknown, _req, res, _next) => {
  if (erro instanceof AppError) {
    res.status(erro.status).json(corpo(erro.codigo, erro.message));
    return;
  }

  // JSON malformado no corpo da requisição (lançado pelo express.json()).
  if (typeof erro === 'object' && erro !== null && (erro as { type?: string }).type === 'entity.parse.failed') {
    res.status(400).json(corpo('JSON_INVALIDO', 'Corpo da requisição não é um JSON válido.'));
    return;
  }

  const e = erro as { name?: string; code?: string; message?: string };
  console.error('[erro interno]', { nome: e?.name, codigo: e?.code, mensagem: e?.message });
  res.status(500).json(corpo('ERRO_INTERNO', 'Erro interno. Tente novamente mais tarde.'));
};
