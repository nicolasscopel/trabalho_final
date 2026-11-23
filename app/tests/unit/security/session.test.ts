import { describe, expect, it } from 'vitest';
import {
  COOKIE_SESSAO,
  formatarCookieLimparSessao,
  formatarCookieSessao,
  lerCookie,
  SessionService,
} from '../../../src/security/SessionService.js';

const SEGREDO = 's'.repeat(32);

describe('SessionService', () => {
  it('exige segredo com no mínimo 32 caracteres', () => {
    expect(() => new SessionService('curto')).toThrow(/32 caracteres/);
  });

  it('cria e valida token com dados da sessão', () => {
    const svc = new SessionService(SEGREDO, 60_000);
    const agora = new Date('2026-11-23T10:00:00Z');
    const token = svc.criarToken({ id: 'user-123', papel: 'participante' }, agora);

    const sessao = svc.verificarToken(token, new Date('2026-11-23T10:00:30Z'));
    expect(sessao).toEqual({
      usuarioId: 'user-123',
      papel: 'participante',
      expiraEm: agora.getTime() + 60_000,
    });
  });

  it('rejeita token expirado ou adulterado', () => {
    const svc = new SessionService(SEGREDO, 10_000);
    const agora = new Date('2026-11-23T10:00:00Z');
    const token = svc.criarToken({ id: 'user-123', papel: 'participante' }, agora);

    expect(svc.verificarToken(token, new Date('2026-11-23T10:00:10Z'))).toBeNull();
    expect(svc.verificarToken(`${token}a`, agora)).toBeNull();
    expect(svc.verificarToken('invalido', agora)).toBeNull();

    const outroSvc = new SessionService('o'.repeat(32), 10_000);
    expect(outroSvc.verificarToken(token, agora)).toBeNull();
  });
});

describe('cookies de sessão', () => {
  it('lê cookie específico do cabeçalho Cookie', () => {
    const header = `outro=1; ${COOKIE_SESSAO}=abc.def%3D; mais=2`;
    expect(lerCookie(header, COOKIE_SESSAO)).toBe('abc.def=');
    expect(lerCookie(header, 'inexistente')).toBeUndefined();
    expect(lerCookie(undefined, COOKIE_SESSAO)).toBeUndefined();
  });

  it('formata cookie HttpOnly/SameSite e inclui Secure apenas quando solicitado', () => {
    const dev = formatarCookieSessao('tok.123', { seguro: false, maxAgeSegundos: 3600 });
    expect(dev).toContain('HttpOnly');
    expect(dev).toContain('SameSite=Lax');
    expect(dev).toContain('Max-Age=3600');
    expect(dev).not.toContain('Secure');

    const prod = formatarCookieSessao('tok.123', { seguro: true, maxAgeSegundos: 3600 });
    expect(prod).toContain('Secure');

    const limpar = formatarCookieLimparSessao(true);
    expect(limpar).toContain('Max-Age=0');
    expect(limpar).toContain('Secure');
  });
});
