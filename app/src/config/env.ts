/**
 * Leitura e validação das variáveis de ambiente.
 *
 * - `loadConfig` recebe o objeto de ambiente por parâmetro para ser testável.
 * - Mensagens de erro citam o NOME da variável, nunca o valor.
 */

export type Ambiente = 'development' | 'test' | 'production';

export interface Config {
  ambiente: Ambiente;
  porta: number;
  /** Opcional em desenvolvimento/teste (o /health funciona sem banco). */
  databaseUrl: string | undefined;
  dbPoolMax: number;
  /** Segredo do HMAC do CPF. Opcional em desenvolvimento/teste. */
  cpfPepper: string | undefined;
  /** Segredo do cookie de sessão. Opcional em desenvolvimento/teste. */
  sessionSecret: string | undefined;
  /** URL base para montar links de verificação de e-mail. */
  appBaseUrl: string;
  /** Define se o link de verificação sandbox é retornado na API (útil para testes fictícios). */
  exporSandboxVerificacao: boolean;
}

export class ConfigError extends Error {
  constructor(problemas: string[]) {
    super(`Configuração inválida:\n- ${problemas.join('\n- ')}`);
    this.name = 'ConfigError';
  }
}

const AMBIENTES: readonly Ambiente[] = ['development', 'test', 'production'];
const TAMANHO_MINIMO_SEGREDO = 32;

function inteiroPositivo(
  valor: string | undefined,
  padrao: number,
  nome: string,
  problemas: string[],
): number {
  if (valor === undefined || valor === '') return padrao;
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero <= 0) {
    problemas.push(`${nome} deve ser um número inteiro positivo.`);
    return padrao;
  }
  return numero;
}

function textoOpcional(valor: string | undefined): string | undefined {
  const limpo = valor?.trim();
  return limpo ? limpo : undefined;
}

function lerBooleanoOpcional(
  valor: string | undefined,
  padrao: boolean,
  nome: string,
  problemas: string[],
): boolean {
  const limpo = textoOpcional(valor)?.toLowerCase();
  if (limpo === undefined) return padrao;
  if (limpo === 'true') return true;
  if (limpo === 'false') return false;
  problemas.push(`${nome} deve ser true ou false.`);
  return padrao;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const problemas: string[] = [];

  const ambienteBruto = env.NODE_ENV ?? 'development';
  const ambiente = (AMBIENTES as readonly string[]).includes(ambienteBruto)
    ? (ambienteBruto as Ambiente)
    : 'development';
  if (ambiente !== ambienteBruto) {
    problemas.push(`NODE_ENV deve ser um de: ${AMBIENTES.join(', ')}.`);
  }

  const porta = inteiroPositivo(env.PORT, 3000, 'PORT', problemas);
  const dbPoolMax = inteiroPositivo(env.DB_POOL_MAX, 5, 'DB_POOL_MAX', problemas);
  const databaseUrl = textoOpcional(env.DATABASE_URL);
  const cpfPepper = textoOpcional(env.CPF_PEPPER);
  const sessionSecret = textoOpcional(env.SESSION_SECRET);
  const urlVercel =
    textoOpcional(env.VERCEL_PROJECT_PRODUCTION_URL) ?? textoOpcional(env.VERCEL_URL);
  const fallbackBaseUrl = urlVercel ? `https://${urlVercel}` : `http://localhost:${porta}`;
  const appBaseUrlBruta = textoOpcional(env.APP_BASE_URL) ?? fallbackBaseUrl;
  const appBaseUrl = appBaseUrlBruta.replace(/\/+$/, '');
  const exporSandboxVerificacao = lerBooleanoOpcional(
    env.EXPOR_SANDBOX_VERIFICACAO,
    ambiente === 'development',
    'EXPOR_SANDBOX_VERIFICACAO',
    problemas,
  );

  if (databaseUrl && !/^postgres(ql)?:\/\//.test(databaseUrl)) {
    problemas.push('DATABASE_URL deve começar com postgres:// ou postgresql://.');
  }
  if (cpfPepper && cpfPepper.length < TAMANHO_MINIMO_SEGREDO) {
    problemas.push(`CPF_PEPPER deve ter pelo menos ${TAMANHO_MINIMO_SEGREDO} caracteres.`);
  }
  if (sessionSecret && sessionSecret.length < TAMANHO_MINIMO_SEGREDO) {
    problemas.push(`SESSION_SECRET deve ter pelo menos ${TAMANHO_MINIMO_SEGREDO} caracteres.`);
  }
  if (!/^https?:\/\//.test(appBaseUrl)) {
    problemas.push('APP_BASE_URL deve começar com http:// ou https://.');
  }
  if (ambiente === 'production') {
    if (!databaseUrl) problemas.push('DATABASE_URL é obrigatória em produção.');
    if (!cpfPepper) problemas.push('CPF_PEPPER é obrigatório em produção.');
    if (!sessionSecret) problemas.push('SESSION_SECRET é obrigatório em produção.');
  }

  if (problemas.length > 0) {
    throw new ConfigError(problemas);
  }

  return {
    ambiente,
    porta,
    databaseUrl,
    dbPoolMax,
    cpfPepper,
    sessionSecret,
    appBaseUrl,
    exporSandboxVerificacao,
  };
}

/** Carrega `.env` (se existir) para `process.env`, usando o recurso nativo do Node 22. */
export function carregarArquivoEnv(caminho = '.env'): void {
  try {
    process.loadEnvFile(caminho);
  } catch (erro) {
    if ((erro as NodeJS.ErrnoException).code !== 'ENOENT') throw erro;
  }
}
