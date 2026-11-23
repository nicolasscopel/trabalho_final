import { describe, expect, it } from 'vitest';
import { Cpf } from '../../../src/domain/Cpf.js';
import { ValidationError } from '../../../src/domain/errors.js';
import { CpfHasher } from '../../../src/security/CpfHasher.js';
import { PasswordHasher } from '../../../src/security/PasswordHasher.js';
import { TokenService } from '../../../src/security/TokenService.js';
import { cpfFicticio, formatarCpf } from '../../helpers/cpfFicticio.js';

const PEPPER_TESTE = 'pepper-de-teste-com-mais-de-32-caracteres!!';

describe('CpfHasher', () => {
  const hasher = new CpfHasher(PEPPER_TESTE);
  const digitos = cpfFicticio('111444777');

  it('gera 64 caracteres hex e não contém o CPF', () => {
    const hash = hasher.hash(Cpf.parse(digitos));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(digitos);
  });

  it('é determinístico e ignora a formatação (permite login por CPF)', () => {
    expect(hasher.hash(Cpf.parse(digitos))).toBe(hasher.hash(Cpf.parse(formatarCpf(digitos))));
  });

  it('pepper diferente gera hash diferente', () => {
    const outro = new CpfHasher(`${PEPPER_TESTE}-outro`);
    expect(outro.hash(Cpf.parse(digitos))).not.toBe(hasher.hash(Cpf.parse(digitos)));
  });

  it('recusa pepper curto', () => {
    expect(() => new CpfHasher('curto')).toThrow();
  });
});

describe('PasswordHasher', () => {
  // Custo baixo só para os testes ficarem rápidos; em produção usa o padrão.
  const hasher = new PasswordHasher({ N: 1024, r: 8, p: 1 });

  it('verifica a senha correta e recusa a errada', async () => {
    const hash = await hasher.hash('senha-ficticia-123');
    expect(hash.startsWith('scrypt$1024$8$1$')).toBe(true);
    expect(hash).not.toContain('senha-ficticia-123');
    await expect(hasher.verificar('senha-ficticia-123', hash)).resolves.toBe(true);
    await expect(hasher.verificar('senha-errada-123', hash)).resolves.toBe(false);
  });

  it('usa salt aleatório (mesma senha, hashes diferentes)', async () => {
    const [a, b] = await Promise.all([hasher.hash('mesma-senha-1'), hasher.hash('mesma-senha-1')]);
    expect(a).not.toBe(b);
  });

  it('verifica hash gerado com os parâmetros padrão', async () => {
    const padrao = new PasswordHasher();
    const hash = await padrao.hash('senha-ficticia-123');
    await expect(hasher.verificar('senha-ficticia-123', hash)).resolves.toBe(true);
  });

  it('retorna false para hash malformado em vez de lançar', async () => {
    await expect(hasher.verificar('qualquer', 'nao-e-um-hash')).resolves.toBe(false);
    await expect(hasher.verificar('qualquer', 'scrypt$x$8$1$a$b')).resolves.toBe(false);
  });

  it.each(['curta', 'x'.repeat(129)])('recusa senha fora do tamanho', async (senha) => {
    await expect(hasher.hash(senha)).rejects.toThrow(ValidationError);
  });
});

describe('TokenService', () => {
  const agora = new Date('2026-11-23T10:00:00Z');
  const servico = new TokenService(60 * 60 * 1000); // 1h

  it('gera token aleatório, guarda só o hash e calcula a expiração', () => {
    const { token, tokenHash, expiraEm } = servico.gerar(agora);
    expect(token.length).toBeGreaterThanOrEqual(43);
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenHash).toBe(TokenService.hash(token));
    expect(expiraEm.toISOString()).toBe('2026-11-23T11:00:00.000Z');
  });

  it('tokens diferentes a cada geração', () => {
    expect(servico.gerar(agora).token).not.toBe(servico.gerar(agora).token);
  });

  it('é válido só se não usado e não expirado', () => {
    const expiraEm = new Date('2026-11-23T11:00:00Z');
    expect(TokenService.estaValido({ expiraEm, usadoEm: null }, agora)).toBe(true);
    expect(TokenService.estaValido({ expiraEm, usadoEm: agora }, agora)).toBe(false);
    expect(TokenService.estaValido({ expiraEm, usadoEm: null }, expiraEm)).toBe(false);
  });
});
