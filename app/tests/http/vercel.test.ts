import { existsSync } from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { criarAppDeAmbiente } from '../../src/bootstrap.js';
import { resolverPastaFontesPadrao } from '../../src/services/CertificadoService.js';

describe('Preparação serverless para Vercel', () => {
  it('mantém /health ativo e /api em 503 quando faltam variáveis obrigatórias em produção', async () => {
    const erroSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const app = criarAppDeAmbiente({ NODE_ENV: 'production' });

      const health = await request(app).get('/health');
      expect(health.status).toBe(200);
      expect(health.body).toEqual({ status: 'ok' });

      const healthDb = await request(app).get('/health/db');
      expect(healthDb.status).toBe(503);
      expect(healthDb.body).toEqual({ status: 'erro', banco: 'nao_configurado' });

      const api = await request(app).get('/api/atividades');
      expect(api.status).toBe(503);
      expect(api.body.erro.codigo).toBe('SERVICO_INDISPONIVEL');
    } finally {
      erroSpy.mockRestore();
    }
  });

  it('localiza a pasta de fontes empacotadas e verifica o entrypoint api/index.ts', async () => {
    const pastaFontes = resolverPastaFontesPadrao();
    expect(existsSync(path.join(pastaFontes, 'LiberationSans-Regular.ttf'))).toBe(true);

    const mod = await import('../../api/index.js');
    expect(typeof mod.default).toBe('function');

    const health = await request(mod.default).get('/health');
    expect(health.status).toBe(200);
  });
});
