import { ValidationError } from './errors.js';

// Validação propositalmente simples: a prova real de que o e-mail existe é a
// verificação por token (Etapa de cadastro), não uma regex.
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Value object de e-mail: normaliza (trim + minúsculas) e valida formato básico. */
export class Email {
  private constructor(readonly valor: string) {}

  static parse(entrada: unknown): Email {
    if (typeof entrada !== 'string') {
      throw new ValidationError('E-mail inválido.');
    }
    const normalizado = entrada.trim().toLowerCase();
    if (normalizado.length > 254 || !FORMATO_EMAIL.test(normalizado)) {
      throw new ValidationError('E-mail inválido.');
    }
    return new Email(normalizado);
  }

  toString(): string {
    return this.valor;
  }
}
