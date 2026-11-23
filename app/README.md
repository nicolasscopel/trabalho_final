# app/ — Semana Acadêmica (inscrição, presença e certificado)

Stack definida na Etapa 1: **Node.js 22 + TypeScript + Express 5**, **PostgreSQL (Neon)** com `pg` + SQL puro (sem ORM), **PDFKit** (etapa de certificado) e **Vercel** (etapa de deploy).

## Como rodar

```bash
cd app
npm install
cp .env.example .env      # preencha DATABASE_URL e CPF_PEPPER (nunca commitar o .env)
npm test                  # testes unitários e HTTP (não precisam de banco)
npm run dev               # http://localhost:3000/health
npm run db:migrate        # aplica db/migrations/*.sql no banco do DATABASE_URL
```

| Script | O que faz |
| --- | --- |
| `npm run dev` | Servidor local com recarga automática (`tsx watch`). |
| `npm test` | Roda todos os testes uma vez (Vitest). Os de integração só rodam com `TEST_DATABASE_URL`. |
| `npm run typecheck` | Checagem de tipos do TypeScript, sem gerar arquivos. |
| `npm run build` / `npm start` | Compila para `dist/` e roda a versão compilada. |
| `npm run db:migrate` | Aplica as migrações pendentes (registradas em `schema_migrations`). |

## Estrutura

```text
app/
├── db/migrations/001_schema_inicial.sql  # tabelas, constraints e índices (revisar antes de aplicar!)
├── src/
│   ├── app.ts            # monta o Express (sem listen) — usado por server, testes e Vercel
│   ├── server.ts         # servidor local (listen + encerramento limpo)
│   ├── config/env.ts     # lê/valida variáveis de ambiente (nunca loga valores)
│   ├── db/
│   │   ├── Database.ts   # pool do pg, query(), transacao(), ping()
│   │   └── migrate.ts    # executor das migrações SQL
│   ├── domain/           # regras de negócio puras (sem banco, sem HTTP)
│   │   ├── errors.ts     # AppError -> ValidationError(400), Unauthorized(401), Forbidden(403), NotFound(404), Conflict(409)
│   │   ├── Cpf.ts        # valida CPF; toString/JSON mascarados
│   │   ├── Email.ts      # normaliza e valida e-mail
│   │   ├── Usuario.ts    # participante/coordenação; toPublico() sem hashes
│   │   ├── Atividade.ts  # validações, vagas e choque de horário
│   │   └── Inscricao.ts  # cancelar, presença, podeEmitirCertificado, pertenceA (anti-IDOR)
│   ├── security/
│   │   ├── CpfHasher.ts      # HMAC-SHA256 + pepper -> cpf_hash
│   │   ├── PasswordHasher.ts # scrypt com salt -> senha_hash
│   │   └── TokenService.ts   # token de verificação de e-mail (só o SHA-256 vai ao banco)
│   └── http/
│       ├── middlewares/errorHandler.ts  # erros -> JSON, sem vazar detalhes
│       └── routes/health.ts             # GET /health e GET /health/db
└── tests/
    ├── unit/         # domínio, segurança e config
    ├── http/         # rotas via supertest (banco simulado)
    └── integration/  # schema contra Postgres real (TEST_DATABASE_URL), com ROLLBACK
```

## Regras que valem para todo o código

- Dados **100% fictícios** em testes (CPFs de teste são gerados por `tests/helpers/cpfFicticio.ts`).
- O CPF **nunca** é salvo: só o `cpf_hash`. Senhas só como `senha_hash` (scrypt). Tokens só como hash.
- Mensagens de erro e logs não podem conter CPF, e-mail, senha, token ou `DATABASE_URL`.
- Regras críticas existem em **dois lugares**: na classe de domínio (mensagem amigável) e como `CHECK`/`UNIQUE` no banco (garantia sob concorrência).
