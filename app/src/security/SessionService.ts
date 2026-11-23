import { createHmac, timingSafeEqual } from 'node:crypto';
import { PAPEIS, type Papel } from '../domain/Usuario.js';

export const COOKIE_SESSAO = 'sa_sessao';
const OITO_HORAS_MS = 8 * 60 * 60 * 1000;

export interface SessaoUsuario {
  usuarioId: string;
  papel: Papel;
  expiraEm: number;
}

/**
 * Tokens de sessão stateless assinados com HMAC-SHA256.
 *
 * - Compatível com ambiente serverless (Vercel) sem tabela extra de sessões.
 * - Formato: `<payload base64url>.<assinatura base64url>`.
 */
export class SessionService {
  static readonly TAMANHO_MINIMO_SEGREDO = 32;

  readonly #segredo: string;

  constructor(
    segredo: string,
    private readonly validadeMs: number = OITO_HORAS_MS,
  ) {
    if (segredo.length < SessionService.TAMANHO_MINIMO_SEGREDO) {
      throw new Error(
        `SESSION_SECRET deve ter pelo menos ${SessionService.TAMANHO_MINIMO_SEGREDO} caracteres.`,
      );
    }
    this.#segredo = segredo;
  }

  criarToken(usuario: { id: string; papel: Papel }, agora: Date = new Date()): string {
    const payload = {
      sub: usuario.id,
      papel: usuario.papel,
      exp: agora.getTime() + this.validadeMs,
    };
    const corpo = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const assinatura = this.assinar(corpo);
    return `${corpo}.${assinatura}`;
  }

  verificarToken(token: string, agora: Date = new Date()): SessaoUsuario | null {
    const partes = token.split('.');
    if (partes.length !== 2) return null;

    const [corpo, assinatura] = partes as [string, string];
    if (!corpo || !assinatura) return null;

    const esperada = this.assinar(corpo);
    const bufRecebida = Buffer.from(assinatura, 'utf8');
    const bufEsperada = Buffer.from(esperada, 'utf8');
    if (bufRecebida.length !== bufEsperada.length || !timingSafeEqual(bufRecebida, bufEsperada)) {
      return null;
    }

    try {
      const bruto = JSON.parse(Buffer.from(corpo, 'base64url').toString('utf8')) as {
        sub?: unknown;
        papel?: unknown;
        exp?: unknown;
      };
      if (
        typeof bruto.sub !== 'string' ||
        bruto.sub.length === 0 ||
        typeof bruto.papel !== 'string' ||
        !(PAPEIS as readonly string[]).includes(bruto.papel) ||
        typeof bruto.exp !== 'number' ||
        !Number.isFinite(bruto.exp) ||
        agora.getTime() >= bruto.exp
      ) {
        return null;
      }
      return {
        usuarioId: bruto.sub,
        papel: bruto.papel as Papel,
        expiraEm: bruto.exp,
      };
    } catch {
      return null;
    }
  }

  get maxAgeSegundos(): number {
    return Math.max(1, Math.floor(this.validadeMs / 1000));
  }

  private assinar(corpo: string): string {
    return createHmac('sha256', this.#segredo).update(corpo).digest('base64url');
  }
}

export function lerCookie(headerCookie: string | undefined, nome: string): string | undefined {
  if (!headerCookie) return undefined;
  for (const parte of headerCookie.split(';')) {
    const idx = parte.indexOf('=');
    if (idx <= 0) continue;
    const chave = parte.slice(0, idx).trim();
    if (chave !== nome) continue;
    const valor = parte.slice(idx + 1).trim();
    try {
      return decodeURIComponent(valor);
    } catch {
      return valor;
    }
  }
  return undefined;
}

export function formatarCookieSessao(
  token: string,
  opcoes: { seguro: boolean; maxAgeSegundos: number },
): string {
  const atributos = [
    `${COOKIE_SESSAO}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${opcoes.maxAgeSegundos}`,
  ];
  if (opcoes.seguro) {
    atributos.push('Secure');
  }
  return atributos.join('; ');
}

export function formatarCookieLimparSessao(seguro: boolean): string {
  const atributos = [
    `${COOKIE_SESSAO}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (seguro) {
    atributos.push('Secure');
  }
  return atributos.join('; ');
}
