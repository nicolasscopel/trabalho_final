import { describe, expect, it } from 'vitest';
import { Atividade, type AtividadeProps } from '../../../src/domain/Atividade.js';
import { ValidationError } from '../../../src/domain/errors.js';

let contador = 0;
function atividade(inicio: string, fim: string, extra: Partial<AtividadeProps> = {}): Atividade {
  contador += 1;
  return Atividade.criar({
    id: `atividade-${contador}`,
    titulo: 'Palestra de Teste',
    descricao: null,
    inicio: new Date(inicio),
    fim: new Date(fim),
    cargaHorariaMinutos: 60,
    vagas: 30,
    vagasOcupadas: 0,
    ...extra,
  });
}

describe('Atividade — validação', () => {
  it('cria atividade válida', () => {
    const a = atividade('2026-11-24T10:00:00-03:00', '2026-11-24T11:00:00-03:00');
    expect(a.vagasDisponiveis).toBe(30);
    expect(a.temVaga).toBe(true);
  });

  it.each<[string, Partial<AtividadeProps>]>([
    ['título curto', { titulo: 'ab' }],
    ['carga horária zero', { cargaHorariaMinutos: 0 }],
    ['carga horária fracionada', { cargaHorariaMinutos: 1.5 }],
    ['vagas zero', { vagas: 0 }],
    ['vagas ocupadas > vagas', { vagas: 2, vagasOcupadas: 3 }],
    ['vagas ocupadas negativas', { vagasOcupadas: -1 }],
  ])('rejeita %s', (_caso, extra) => {
    expect(() => atividade('2026-11-24T10:00:00Z', '2026-11-24T11:00:00Z', extra)).toThrow(
      ValidationError,
    );
  });

  it('rejeita início igual ou depois do fim', () => {
    expect(() => atividade('2026-11-24T11:00:00Z', '2026-11-24T11:00:00Z')).toThrow(ValidationError);
    expect(() => atividade('2026-11-24T12:00:00Z', '2026-11-24T11:00:00Z')).toThrow(ValidationError);
  });

  it('rejeita data inválida', () => {
    expect(() => atividade('não é data', '2026-11-24T11:00:00Z')).toThrow(ValidationError);
  });

  it('sem vaga quando lotada', () => {
    const lotada = atividade('2026-11-24T10:00:00Z', '2026-11-24T11:00:00Z', {
      vagas: 2,
      vagasOcupadas: 2,
    });
    expect(lotada.temVaga).toBe(false);
  });
});

describe('Atividade — choque de horário', () => {
  const dezAsOnze = atividade('2026-11-24T10:00:00Z', '2026-11-24T11:00:00Z');

  it('detecta sobreposição parcial', () => {
    const outra = atividade('2026-11-24T10:30:00Z', '2026-11-24T11:30:00Z');
    expect(dezAsOnze.conflitaCom(outra)).toBe(true);
    expect(outra.conflitaCom(dezAsOnze)).toBe(true);
  });

  it('detecta atividade contida dentro da outra', () => {
    const dentro = atividade('2026-11-24T10:15:00Z', '2026-11-24T10:45:00Z');
    expect(dezAsOnze.conflitaCom(dentro)).toBe(true);
  });

  it('atividades encostadas (uma termina quando a outra começa) não conflitam', () => {
    const seguinte = atividade('2026-11-24T11:00:00Z', '2026-11-24T12:00:00Z');
    expect(dezAsOnze.conflitaCom(seguinte)).toBe(false);
  });

  it('dias diferentes não conflitam', () => {
    const outroDia = atividade('2026-11-25T10:00:00Z', '2026-11-25T11:00:00Z');
    expect(dezAsOnze.conflitaCom(outroDia)).toBe(false);
  });

  it('uma atividade não conflita consigo mesma', () => {
    expect(dezAsOnze.conflitaCom(dezAsOnze)).toBe(false);
  });

  it('encontra o conflito em uma lista de inscrições existentes', () => {
    const semConflito = atividade('2026-11-24T08:00:00Z', '2026-11-24T09:00:00Z');
    const comConflito = atividade('2026-11-24T10:59:00Z', '2026-11-24T12:00:00Z');
    expect(dezAsOnze.encontrarConflito([semConflito, comConflito])).toBe(comConflito);
    expect(dezAsOnze.encontrarConflito([semConflito])).toBeUndefined();
  });
});
