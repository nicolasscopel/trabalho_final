import { createApp } from './app.js';
import { carregarArquivoEnv, loadConfig } from './config/env.js';
import { Database } from './db/Database.js';

carregarArquivoEnv();
const config = loadConfig();

const db = config.databaseUrl
  ? Database.conectar({ databaseUrl: config.databaseUrl, poolMax: config.dbPoolMax })
  : undefined;

if (!db) {
  console.warn('[aviso] DATABASE_URL não definida: rodando sem banco (/health/db responderá 503).');
}

const app = createApp({ db });

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
