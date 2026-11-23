import { ValidationError } from './errors.js';

const MASCARA = '***.***.***-**';

/**
 * Value object de CPF.
 *
 * - Valida formato e dígitos verificadores.
 * - O CPF NÃO é armazenado: ele só existe em memória até ser convertido em
 *   `cpf_hash` pelo CpfHasher (HMAC-SHA256 com pepper).
 * - `toString()`/`toJSON()` devolvem uma máscara, para que um `console.log`
 *   ou `JSON.stringify` acidental não vaze o número.
 */
export class Cpf {
  readonly #digitos: string;

  private constructor(digitos: string) {
    this.#digitos = digitos;
  }

  /** Aceita "000.000.000-00" ou "00000000000". Lança ValidationError se inválido. */
  static parse(entrada: unknown): Cpf {
    if (typeof entrada !== 'string') {
      throw new ValidationError('CPF inválido.');
    }
    const digitos = entrada.replace(/[.\-\s]/g, '');
    if (!Cpf.ehValido(digitos)) {
      // Mensagem genérica de propósito: não ecoar o valor recebido.
      throw new ValidationError('CPF inválido.');
    }
    return new Cpf(digitos);
  }

  static ehValido(digitos: string): boolean {
    if (!/^\d{11}$/.test(digitos)) return false;
    if (/^(\d)\1{10}$/.test(digitos)) return false; // 000..., 111..., etc.

    const dv1 = Cpf.calcularDigito(digitos.slice(0, 9));
    const dv2 = Cpf.calcularDigito(digitos.slice(0, 9) + dv1);
    return digitos.endsWith(`${dv1}${dv2}`);
  }

  /** Calcula um dígito verificador a partir dos dígitos anteriores. */
  static calcularDigito(base: string): number {
    const pesoInicial = base.length + 1;
    let soma = 0;
    for (let i = 0; i < base.length; i++) {
      soma += Number(base[i]) * (pesoInicial - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  }

  /** Apenas os 11 dígitos. Use somente para calcular o hash. */
  get digitos(): string {
    return this.#digitos;
  }

  toString(): string {
    return MASCARA;
  }

  toJSON(): string {
    return MASCARA;
  }
}
