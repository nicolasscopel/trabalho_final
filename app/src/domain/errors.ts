/**
 * Hierarquia de erros da aplicação.
 *
 * Cada erro carrega o status HTTP e um código estável. O middleware de erro
 * (src/http/middlewares/errorHandler.ts) converte esses erros em respostas JSON.
 *
 * Regra de privacidade: mensagens de erro NUNCA devem conter dados pessoais
 * (CPF, e-mail, senha, token). Escreva mensagens genéricas.
 */
export abstract class AppError extends Error {
  abstract readonly status: number;
  abstract readonly codigo: string;

  constructor(mensagem: string) {
    super(mensagem);
    this.name = new.target.name;
  }
}

/** Dados de entrada inválidos (400). */
export class ValidationError extends AppError {
  readonly status = 400;
  readonly codigo = 'VALIDACAO';
}

/** Usuário não autenticado ou credenciais inválidas (401). */
export class UnauthorizedError extends AppError {
  readonly status = 401;
  readonly codigo = 'NAO_AUTENTICADO';
}

/** Usuário autenticado, mas sem permissão para o recurso (403). */
export class ForbiddenError extends AppError {
  readonly status = 403;
  readonly codigo = 'ACESSO_NEGADO';
}

/** Recurso inexistente (ou que o usuário não pode saber que existe) (404). */
export class NotFoundError extends AppError {
  readonly status = 404;
  readonly codigo = 'NAO_ENCONTRADO';
}

/** Regra de negócio violada: sem vagas, choque de horário, duplicidade... (409). */
export class ConflictError extends AppError {
  readonly status = 409;
  readonly codigo = 'CONFLITO';
}
