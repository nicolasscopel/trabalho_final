import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';
import { ValidationError } from '../domain/errors.js';

function scryptAsync(
  senha: string,
  salt: Buffer,
  tamanho: number,
  opcoes: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(senha, salt, tamanho, opcoes, (erro, chave) => (erro ? reject(erro) : resolve(chave)));
  });
}

export interface ParametrosScrypt {
  /** Custo de CPU/memória (potência de 2). */
  N: number;
  r: number;
  p: number;
}

/** Padrão razoável para servidor; ~16 MiB de memória por hash. */
export const PARAMETROS_PADRAO: ParametrosScrypt = { N: 16384, r: 8, p: 1 };

const TAMANHO_SALT = 16;
const TAMANHO_CHAVE = 64;

/**
 * Hash de senha com scrypt (nativo do Node, sem dependência externa).
 *
 * Formato armazenado em `usuarios.senha_hash`:
 *   scrypt$N$r$p$<salt base64>$<hash base64>
 * Os parâmetros ficam no próprio hash, então dá para aumentar o custo no futuro
 * sem quebrar senhas antigas.
 */
export class PasswordHasher {
  static readonly TAMANHO_MINIMO = 8;
  static readonly TAMANHO_MAXIMO = 128;

  constructor(private readonly parametros: ParametrosScrypt = PARAMETROS_PADRAO) {}

  static validarForca(senha: unknown): asserts senha is string {
    if (
      typeof senha !== 'string' ||
      senha.length < PasswordHasher.TAMANHO_MINIMO ||
      senha.length > PasswordHasher.TAMANHO_MAXIMO
    ) {
      throw new ValidationError(
        `A senha deve ter entre ${PasswordHasher.TAMANHO_MINIMO} e ${PasswordHasher.TAMANHO_MAXIMO} caracteres.`,
      );
    }
  }

  async hash(senha: string): Promise<string> {
    PasswordHasher.validarForca(senha);
    const { N, r, p } = this.parametros;
    const salt = randomBytes(TAMANHO_SALT);
    const chave = await scryptAsync(senha, salt, TAMANHO_CHAVE, PasswordHasher.opcoes(this.parametros));
    return ['scrypt', N, r, p, salt.toString('base64'), chave.toString('base64')].join('$');
  }

  /** Compara em tempo constante. Retorna `false` (sem lançar) para hash malformado. */
  async verificar(senha: string, armazenado: string): Promise<boolean> {
    const partes = armazenado.split('$');
    if (partes.length !== 6 || partes[0] !== 'scrypt') return false;

    const [, nStr, rStr, pStr, saltB64, chaveB64] = partes as [string, string, string, string, string, string];
    const parametros: ParametrosScrypt = { N: Number(nStr), r: Number(rStr), p: Number(pStr) };
    if (![parametros.N, parametros.r, parametros.p].every((n) => Number.isInteger(n) && n > 0)) {
      return false;
    }

    const salt = Buffer.from(saltB64, 'base64');
    const esperado = Buffer.from(chaveB64, 'base64');
    if (esperado.length === 0) return false;

    const calculado = await scryptAsync(senha, salt, esperado.length, PasswordHasher.opcoes(parametros));
    return timingSafeEqual(calculado, esperado);
  }

  private static opcoes({ N, r, p }: ParametrosScrypt): ScryptOptions {
    // maxmem precisa comportar 128 * N * r bytes (+ folga).
    return { N, r, p, maxmem: 256 * N * r };
  }
}
