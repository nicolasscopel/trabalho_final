import { Cpf } from '../../src/domain/Cpf.js';

/**
 * Gera um CPF FICTÍCIO com dígitos verificadores válidos a partir de 9 dígitos.
 * Use sempre bases inventadas nos testes — nunca CPFs reais.
 */
export function cpfFicticio(base9: string): string {
  if (!/^\d{9}$/.test(base9)) throw new Error('base9 deve ter 9 dígitos');
  const dv1 = Cpf.calcularDigito(base9);
  const dv2 = Cpf.calcularDigito(base9 + dv1);
  return `${base9}${dv1}${dv2}`;
}

/** Formata 11 dígitos como 000.000.000-00. */
export function formatarCpf(digitos: string): string {
  return digitos.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}
