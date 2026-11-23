import { createHash, randomBytes } from 'node:crypto';

export interface TokenGerado {
  /** Valor em texto puro: vai SOMENTE no link enviado por e-mail. Nunca salvar. */
  token: string;
  /** SHA-256 em hex: é isto que vai para `tokens_verificacao_email.token_hash`. */
  tokenHash: string;
  expiraEm: Date;
}

export interface EstadoToken {
  expiraEm: Date;
  usadoEm: Date | null;
}

const UMA_HORA_MS = 60 * 60 * 1000;

/**
 * Tokens de uso único (verificação de e-mail).
 *
 * Como o token tem 256 bits aleatórios, um SHA-256 simples (sem salt) é
 * suficiente para armazená-lo: não há como adivinhar por força bruta.
 */
export class TokenService {
  constructor(private readonly validadeMs: number = 24 * UMA_HORA_MS) {}

  gerar(agora: Date = new Date()): TokenGerado {
    const token = randomBytes(32).toString('base64url');
    return {
      token,
      tokenHash: TokenService.hash(token),
      expiraEm: new Date(agora.getTime() + this.validadeMs),
    };
  }

  static hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** Válido = ainda não usado e não expirado. */
  static estaValido(estado: EstadoToken, agora: Date = new Date()): boolean {
    return estado.usadoEm === null && agora.getTime() < estado.expiraEm.getTime();
  }
}
