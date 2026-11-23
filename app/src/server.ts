import { randomBytes } from 'node:crypto';
import { createApp } from './app.js';
import { carregarArquivoEnv, loadConfig } from './config/env.js';
import { Database } from './db/Database.js';
import { CpfHasher } from './security/CpfHasher.js';
import { SessionService } from './security/SessionService.js';

carregarArquivoEnv();
const config = loadConfig();

const db = config.databaseUrl
  ? Database.conectar({ databaseUrl: config.databaseUrl, poolMax: config.dbPoolMax })
  : undefined;

if (!db) {
  console.warn('[aviso] DATABASE_URL não definida: rodando sem banco (/health/db responderá 503).');
}

const cpfHasher = config.cpfPepper ? new CpfHasher(config.cpfPepper) : undefined;
if (!cpfHasher) {
  console.warn('[aviso] CPF_PEPPER não definido: rotas /api/* responderão 503.');
}

let segredoSessao = config.sessionSecret;
if (!segredoSessao) {
  segredoSessao = randomBytes(32).toString('base64url');
  console.warn(
    '[aviso] SESSION_SECRET não definida no .env: usando chave temporária em memória (adicione SESSION_SECRET com 32+ chars para manter sessões ao reiniciar).',
  );
}

const app = createApp({
  db,
  ambiente: config.ambiente,
  appBaseUrl: config.appBaseUrl,
  cpfHasher,
  sessionService: new SessionService(segredoSessao),
  exporSandboxVerificacao: config.ambiente === 'development',
});

const servidor = app.listen(config.porta, () => {
  console.log(`Servidor (${config.ambiente}) em http://localhost:${config.porta}`);
});

async function encerrar(sinal: string): Promise<void> {
  console.log(`\nRecebido ${sinal}, encerrando...`);
  servidor.close();
  await db?.fechar();
  process.exit(0);
}

process.on('SIGINT', () => void encerrar('SIGINT'));
process.on('SIGTERM', () => void encerrar('SIGTERM'));
