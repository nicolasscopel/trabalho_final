import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from '../../../src/config/env.js';

const PEPPER = 'x'.repeat(32);
const SESSION = 's'.repeat(32);

describe('loadConfig', () => {
  it('usa padrões em desenvolvimento sem banco nem segredos', () => {
    expect(loadConfig({})).toEqual({
      ambiente: 'development',
      porta: 3000,
      databaseUrl: undefined,
      dbPoolMax: 5,
      cpfPepper: undefined,
      sessionSecret: undefined,
      appBaseUrl: 'http://localhost:3000',
      exporSandboxVerificacao: true,
    });
  });

  it('lê os valores informados', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      PORT: '8080',
      DATABASE_URL: 'postgresql://usuario:senha@host-pooler.exemplo/db?sslmode=require',
      DB_POOL_MAX: '2',
      CPF_PEPPER: PEPPER,
      SESSION_SECRET: SESSION,
      APP_BASE_URL: 'https://semana.exemplo.com/',
    });
    expect(config.ambiente).toBe('production');
    expect(config.porta).toBe(8080);
    expect(config.dbPoolMax).toBe(2);
    expect(config.sessionSecret).toBe(SESSION);
    expect(config.appBaseUrl).toBe('https://semana.exemplo.com');
    expect(config.exporSandboxVerificacao).toBe(false);
  });

  it('usa VERCEL_PROJECT_PRODUCTION_URL / VERCEL_URL e EXPOR_SANDBOX_VERIFICACAO quando informados', () => {
    const comVercelUrl = loadConfig({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://usuario:senha@host-pooler.exemplo/db?sslmode=verify-full',
      CPF_PEPPER: PEPPER,
      SESSION_SECRET: SESSION,
      VERCEL_URL: 'semana-preview.vercel.app',
      EXPOR_SANDBOX_VERIFICACAO: 'true',
    });
    expect(comVercelUrl.appBaseUrl).toBe('https://semana-preview.vercel.app');
    expect(comVercelUrl.exporSandboxVerificacao).toBe(true);

    const comProdUrl = loadConfig({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://usuario:senha@host-pooler.exemplo/db?sslmode=verify-full',
      CPF_PEPPER: PEPPER,
      SESSION_SECRET: SESSION,
      VERCEL_URL: 'semana-preview.vercel.app',
      VERCEL_PROJECT_PRODUCTION_URL: 'semana.vercel.app',
    });
    expect(comProdUrl.appBaseUrl).toBe('https://semana.vercel.app');
    expect(comProdUrl.exporSandboxVerificacao).toBe(false);
  });

  it('exige DATABASE_URL, CPF_PEPPER e SESSION_SECRET em produção', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(
      /DATABASE_URL.*\n.*CPF_PEPPER.*\n.*SESSION_SECRET/s,
    );
  });

  it('rejeita valores inválidos', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(ConfigError);
    expect(() => loadConfig({ NODE_ENV: 'staging' })).toThrow(ConfigError);
    expect(() => loadConfig({ DATABASE_URL: 'mysql://x' })).toThrow(ConfigError);
    expect(() => loadConfig({ CPF_PEPPER: 'curto' })).toThrow(ConfigError);
    expect(() => loadConfig({ SESSION_SECRET: 'curto' })).toThrow(ConfigError);
    expect(() => loadConfig({ APP_BASE_URL: 'ftp://x' })).toThrow(ConfigError);
    expect(() => loadConfig({ EXPOR_SANDBOX_VERIFICACAO: 'sim' })).toThrow(ConfigError);
  });

  it('não vaza o valor das variáveis na mensagem de erro', () => {
    const segredo = 'mysql://usuario:senha-super-secreta@host/db';
    expect(() => loadConfig({ DATABASE_URL: segredo })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining('senha-super-secreta') }),
    );
  });
});
