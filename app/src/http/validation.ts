import { ValidationError } from '../domain/errors.js';

const REGEX_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validarUuid(valor: unknown, nomeCampo = 'identificador'): string {
  if (typeof valor !== 'string' || !REGEX_UUID.test(valor.trim())) {
    throw new ValidationError(`${nomeCampo} inválido.`);
  }
  return valor.trim().toLowerCase();
}

export function exigirObjeto(corpo: unknown): Record<string, unknown> {
  if (typeof corpo !== 'object' || corpo === null || Array.isArray(corpo)) {
    throw new ValidationError('Corpo da requisição inválido.');
  }
  return corpo as Record<string, unknown>;
}

export function lerData(valor: unknown, nomeCampo: string): Date {
  if (typeof valor !== 'string' || valor.trim() === '') {
    throw new ValidationError(`${nomeCampo} é obrigatório.`);
  }
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) {
    throw new ValidationError(`${nomeCampo} inválido.`);
  }
  return data;
}

export function lerInteiro(valor: unknown, nomeCampo: string): number {
  const num = typeof valor === 'number' ? valor : Number(valor);
  if (!Number.isInteger(num)) {
    throw new ValidationError(`${nomeCampo} deve ser um número inteiro.`);
  }
  return num;
}

export function lerBooleano(valor: unknown, nomeCampo: string): boolean {
  if (typeof valor !== 'boolean') {
    throw new ValidationError(`${nomeCampo} deve ser booleano.`);
  }
  return valor;
}
