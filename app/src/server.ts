import { criarAppDeConfig } from './bootstrap.js';
import { carregarArquivoEnv, loadConfig } from './config/env.js';

carregarArquivoEnv();
const config = loadConfig();
const { app, db } = criarAppDeConfig(config);

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
