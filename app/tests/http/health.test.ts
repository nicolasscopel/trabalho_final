import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';

describe('GET /health', () => {
  it('responde 200 mesmo sem banco', async () => {
    const resposta = await request(createApp()).get('/health');
    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ status: 'ok' });
  });

  it('não expõe o header x-powered-by', async () => {
    const resposta = await request(createApp()).get('/health');
    expect(resposta.headers['x-powered-by']).toBeUndefined();
  });
});

describe('GET /health/db', () => {
  it('503 quando o banco não está configurado', async () => {
    const resposta = await request(createApp()).get('/health/db');
    expect(resposta.status).toBe(503);
    expect(resposta.body.banco).toBe('nao_configurado');
  });

  it('200 quando o ping funciona', async () => {
    const db = { ping: vi.fn().mockResolvedValue(undefined) };
    const resposta = await request(createApp({ db })).get('/health/db');
    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ status: 'ok', banco: 'ok' });
    expect(db.ping).toHaveBeenCalledOnce();
  });

  it('503 sem detalhes internos quando o ping falha', async () => {
    const erroSecreto = 'password authentication failed for user "neondb_owner"';
    const db = { ping: vi.fn().mockRejectedValue(new Error(erroSecreto)) };
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const resposta = await request(createApp({ db })).get('/health/db');
    expect(resposta.status).toBe(503);
    expect(resposta.body).toEqual({ status: 'erro', banco: 'indisponivel' });
    expect(JSON.stringify(resposta.body)).not.toContain('neondb_owner');
  });
});

describe('erros genéricos', () => {
  it('404 em JSON para rota inexistente', async () => {
    const resposta = await request(createApp()).get('/nao-existe');
    expect(resposta.status).toBe(404);
    expect(resposta.body.erro.codigo).toBe('NAO_ENCONTRADO');
  });

  it('400 para JSON malformado', async () => {
    const resposta = await request(createApp())
      .post('/health')
      .set('Content-Type', 'application/json')
      .send('{"quebrado":');
    expect(resposta.status).toBe(400);
    expect(resposta.body.erro.codigo).toBe('JSON_INVALIDO');
  });
});
