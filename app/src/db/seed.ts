/**
 * Seed local com dados 100% FICTÍCIOS para facilitar testes manuais.
 *
 * Uso:
 *   npm run db:seed            # cria atividades fictícias se a tabela estiver vazia
 *   npm run db:seed -- --coord # também cria uma conta fictícia de coordenação (se não existir)
 */
import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { carregarArquivoEnv, loadConfig } from '../config/env.js';
import { Database } from './Database.js';
import { Cpf } from '../domain/Cpf.js';
import { Email } from '../domain/Email.js';
import { Usuario } from '../domain/Usuario.js';
import { AtividadeRepository } from '../repositories/AtividadeRepository.js';
import { CpfHasher } from '../security/CpfHasher.js';
import { PasswordHasher } from '../security/PasswordHasher.js';

function gerarCpfFicticio(base9: string): string {
  const dv1 = Cpf.calcularDigito(base9);
  const dv2 = Cpf.calcularDigito(base9 + dv1);
  return `${base9}${dv1}${dv2}`;
}

async function seedAtividades(db: Database): Promise<number> {
  const repo = new AtividadeRepository(db);
  const existentes = await repo.listar();
  if (existentes.length > 0) return 0;

  const amostras = [
    {
      titulo: 'Abertura: Engenharia de Software com Agentes',
      descricao: 'Palestra fictícia de abertura da Semana Acadêmica.',
      inicio: new Date('2026-11-25T19:00:00-03:00'),
      fim: new Date('2026-11-25T20:30:00-03:00'),
      cargaHorariaMinutos: 90,
      vagas: 40,
    },
    {
      titulo: 'Minicurso: Concorrência em PostgreSQL',
      descricao: 'Prática fictícia com transações e locks no Postgres.',
      inicio: new Date('2026-11-25T20:30:00-03:00'),
      fim: new Date('2026-11-25T22:00:00-03:00'),
      cargaHorariaMinutos: 90,
      vagas: 25,
    },
    {
      titulo: 'Oficina: Privacidade e Segurança em APIs Web',
      descricao: 'Discussão fictícia sobre proteção de dados pessoais.',
      inicio: new Date('2026-11-26T19:00:00-03:00'),
      fim: new Date('2026-11-26T21:00:00-03:00'),
      cargaHorariaMinutos: 120,
      vagas: 30,
    },
  ];

  for (const item of amostras) {
    await repo.criar(item);
  }
  return amostras.length;
}

async function main(): Promise<void> {
  carregarArquivoEnv();
  const config = loadConfig();
  if (!config.databaseUrl) {
    console.error('DATABASE_URL não definida no .env.');
    process.exitCode = 1;
    return;
  }

  const db = Database.conectar({ databaseUrl: config.databaseUrl, poolMax: 1 });
  try {
    const criadas = await seedAtividades(db);
    console.log(
      criadas > 0
        ? `Atividades fictícias criadas: ${criadas}`
        : 'Tabela de atividades já possui registros; nenhuma criada.',
    );

    if (process.argv.includes('--coord')) {
      if (!config.cpfPepper) {
        console.error('CPF_PEPPER obrigatório para criar usuário de coordenação.');
        process.exitCode = 1;
        return;
      }

      const nome = Usuario.normalizarNome(
        process.env.SEED_COORD_NOME ?? 'Coordenação Fictícia',
      );
      const email = Email.parse(process.env.SEED_COORD_EMAIL ?? 'coordenacao@semana.ficticia');
      const cpfBruto = process.env.SEED_COORD_CPF ?? gerarCpfFicticio('900000001');
      const cpf = Cpf.parse(cpfBruto);
      const senha = process.env.SEED_COORD_SENHA ?? randomBytes(12).toString('base64url');
      PasswordHasher.validarForca(senha);

      const cpfHash = new CpfHasher(config.cpfPepper).hash(cpf);
      const senhaHash = await new PasswordHasher().hash(senha);

      const { rowCount } = await db.query(
        `INSERT INTO usuarios (nome, email, cpf_hash, senha_hash, email_verificado, papel)
         VALUES ($1, $2, $3, $4, true, 'coordenacao')
         ON CONFLICT DO NOTHING`,
        [nome, email.valor, cpfHash, senhaHash],
      );

      if (rowCount && rowCount > 0) {
        console.log('Conta fictícia de coordenação criada:');
        console.log(`  CPF (fictício): ${cpf.digitos}`);
        if (!process.env.SEED_COORD_SENHA) {
          console.log(`  Senha gerada nesta execução: ${senha}`);
        }
      } else {
        console.log('Conta de coordenação com este CPF/e-mail já existe.');
      }
    }
  } finally {
    await db.fechar();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((erro: Error) => {
    console.error('Falha no seed:', erro.message);
    process.exitCode = 1;
  });
}
