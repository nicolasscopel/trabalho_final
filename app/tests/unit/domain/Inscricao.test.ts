import { describe, expect, it } from 'vitest';
import { ConflictError } from '../../../src/domain/errors.js';
import { Inscricao, type InscricaoProps } from '../../../src/domain/Inscricao.js';

function inscricao(extra: Partial<InscricaoProps> = {}): Inscricao {
  return Inscricao.restaurar({
    id: 'inscricao-1',
    usuarioId: 'usuario-1',
    atividadeId: 'atividade-1',
    status: 'ativa',
    presente: false,
    criadoEm: new Date('2026-11-23T10:00:00Z'),
    canceladaEm: null,
    ...extra,
  });
}

describe('Inscricao', () => {
  it('cancela inscrição ativa e registra a data', () => {
    const i = inscricao();
    const agora = new Date('2026-11-24T09:00:00Z');
    i.cancelar(agora);
    expect(i.status).toBe('cancelada');
    expect(i.canceladaEm).toEqual(agora);
    expect(i.estaAtiva).toBe(false);
  });

  it('não cancela duas vezes', () => {
    const i = inscricao();
    i.cancelar();
    expect(() => i.cancelar()).toThrow(ConflictError);
  });

  it('não cancela depois de presença registrada', () => {
    const i = inscricao({ presente: true });
    expect(() => i.cancelar()).toThrow(ConflictError);
  });

  it('registra e remove presença em inscrição ativa', () => {
    const i = inscricao();
    i.registrarPresenca();
    expect(i.presente).toBe(true);
    i.removerPresenca();
    expect(i.presente).toBe(false);
  });

  it('não registra presença em inscrição cancelada', () => {
    const i = inscricao();
    i.cancelar();
    expect(() => i.registrarPresenca()).toThrow(ConflictError);
  });

  it('certificado só com inscrição ativa E presença confirmada', () => {
    expect(inscricao().podeEmitirCertificado).toBe(false);
    expect(inscricao({ presente: true }).podeEmitirCertificado).toBe(true);
    expect(
      inscricao({ status: 'cancelada', canceladaEm: new Date(), presente: false }).podeEmitirCertificado,
    ).toBe(false);
  });

  it('verifica o dono (base contra IDOR)', () => {
    const i = inscricao();
    expect(i.pertenceA('usuario-1')).toBe(true);
    expect(i.pertenceA('usuario-2')).toBe(false);
  });
});
