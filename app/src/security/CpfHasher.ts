import { createHmac } from 'node:crypto';
import type { Cpf } from '../domain/Cpf.js';

/**
 * Transforma o CPF em `cpf_hash` com HMAC-SHA256 + pepper (segredo do .env).
 *
 * - Determinístico: o mesmo CPF gera o mesmo hash -> permite login por CPF e
 *   UNIQUE no banco sem guardar o CPF.
 * - Sem o pepper, um vazamento do banco não permite recuperar o CPF por força
 *   bruta (são só ~10^9 CPFs possíveis, então um SHA-256 puro NÃO bastaria).
 * - Trocar o pepper invalida todos os hashes existentes: guarde-o com cuidado.
 */
export class CpfHasher {
  static readonly TAMANHO_MINIMO_PEPPER = 32;

  readonly #pepper: string;

  constructor(pepper: string) {
    if (pepper.length < CpfHasher.TAMANHO_MINIMO_PEPPER) {
      throw new Error(
        `CPF_PEPPER deve ter pelo menos ${CpfHasher.TAMANHO_MINIMO_PEPPER} caracteres.`,
      );
    }
    this.#pepper = pepper;
  }

  /** Retorna 64 caracteres hexadecimais (coluna `cpf_hash char(64)`). */
  hash(cpf: Cpf): string {
    return createHmac('sha256', this.#pepper).update(cpf.digitos).digest('hex');
  }
}
