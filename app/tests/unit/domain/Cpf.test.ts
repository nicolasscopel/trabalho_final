import { describe, expect, it } from 'vitest';
import { Cpf } from '../../../src/domain/Cpf.js';
import { ValidationError } from '../../../src/domain/errors.js';
import { cpfFicticio, formatarCpf } from '../../helpers/cpfFicticio.js';

describe('Cpf', () => {
  const valido = cpfFicticio('123456789'); // 12345678909

  it('aceita CPF válido com ou sem pontuação', () => {
    expect(Cpf.parse(valido).digitos).toBe(valido);
    expect(Cpf.parse(formatarCpf(valido)).digitos).toBe(valido);
  });

  it('aceita CPF com 11 dígitos mesmo sem dígito verificador válido para testes fictícios', () => {
    expect(Cpf.parse('00000000000').digitos).toBe('00000000000');
    expect(Cpf.parse('000.000.000-00').digitos).toBe('00000000000');
    expect(Cpf.parse('12345678900').digitos).toBe('12345678900');
  });

  it.each([
    ['tamanho errado', '1234567890'],
    ['letras', '1234567890a'],
    ['vazio', ''],
  ])('rejeita %s', (_caso, entrada) => {
    expect(() => Cpf.parse(entrada)).toThrow(ValidationError);
  });

  it('rejeita tipos que não são string', () => {
    expect(() => Cpf.parse(12345678909)).toThrow(ValidationError);
    expect(() => Cpf.parse(undefined)).toThrow(ValidationError);
  });

  it('não ecoa o valor recebido na mensagem de erro', () => {
    try {
      Cpf.parse('98765432100');
      expect.unreachable();
    } catch (erro) {
      expect((erro as Error).message).not.toContain('98765432100');
    }
  });

  it('mascara o CPF em toString/JSON para não vazar em logs', () => {
    const cpf = Cpf.parse(valido);
    expect(String(cpf)).toBe('***.***.***-**');
    expect(JSON.stringify({ cpf })).not.toContain(valido);
  });
});
