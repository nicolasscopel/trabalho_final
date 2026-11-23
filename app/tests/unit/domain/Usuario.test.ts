import { describe, expect, it } from 'vitest';
import { Email } from '../../../src/domain/Email.js';
import { ValidationError } from '../../../src/domain/errors.js';
import { Usuario, type UsuarioProps } from '../../../src/domain/Usuario.js';

describe('Email', () => {
  it('normaliza espaços e maiúsculas', () => {
    expect(Email.parse('  Fulano.Teste@Exemplo.COM ').valor).toBe('fulano.teste@exemplo.com');
  });

  it.each(['sem-arroba', 'a@b', 'a b@exemplo.com', '', `${'a'.repeat(250)}@x.com`])(
    'rejeita "%s"',
    (entrada) => {
      expect(() => Email.parse(entrada)).toThrow(ValidationError);
    },
  );
});

describe('Usuario', () => {
  const base: UsuarioProps = {
    id: '00000000-0000-4000-8000-000000000001',
    nome: '  Maria   Fictícia  da Silva ',
    email: 'maria.ficticia@exemplo.com',
    cpfHash: 'a'.repeat(64),
    senhaHash: 'scrypt$16384$8$1$c2FsdA==$aGFzaA==',
    emailVerificado: false,
    papel: 'participante',
    criadoEm: new Date('2026-11-23T10:00:00Z'),
  };

  it('normaliza o nome (usado no certificado)', () => {
    expect(Usuario.restaurar(base).nome).toBe('Maria Fictícia da Silva');
  });

  it('rejeita nome curto demais', () => {
    expect(() => Usuario.restaurar({ ...base, nome: ' A ' })).toThrow(ValidationError);
  });

  it('rejeita papel desconhecido', () => {
    expect(() => Usuario.restaurar({ ...base, papel: 'admin' as never })).toThrow(ValidationError);
  });

  it('só pode se inscrever com e-mail verificado', () => {
    expect(Usuario.restaurar(base).podeSeInscrever).toBe(false);
    expect(Usuario.restaurar({ ...base, emailVerificado: true }).podeSeInscrever).toBe(true);
  });

  it('identifica a coordenação', () => {
    expect(Usuario.restaurar(base).ehCoordenacao).toBe(false);
    expect(Usuario.restaurar({ ...base, papel: 'coordenacao' }).ehCoordenacao).toBe(true);
  });

  it('nunca expõe cpfHash/senhaHash na visão pública nem no JSON', () => {
    const usuario = Usuario.restaurar(base);
    const json = JSON.stringify(usuario);
    expect(usuario.toPublico()).not.toHaveProperty('cpfHash');
    expect(usuario.toPublico()).not.toHaveProperty('senhaHash');
    expect(json).not.toContain(base.cpfHash);
    expect(json).not.toContain('scrypt$');
  });
});
