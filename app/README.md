# app/ — Semana Acadêmica (inscrição, presença e certificado)

Stack definida na Etapa 1: **Node.js 22 + TypeScript + Express 5**, **PostgreSQL (Neon)** com `pg` + SQL puro (sem ORM), **PDFKit** (etapa de certificado) e **Vercel** (etapa de deploy).

## Passo a passo para executar a Etapa 3 (Passo 2.2)

### 1. Pré-requisitos
- **Node.js >= 22.12** e `npm` instalados;
- Banco PostgreSQL no **Neon** criado (nenhum outro serviço online é necessário nesta etapa; o envio de e-mail funciona em modo *sandbox* local).

### 2. Instalar dependências e configurar o `.env`
```bash
cd app
npm install
cp .env.example .env
```

Preencha no arquivo `app/.env` *(nunca faça commit do `.env`)*:
- `DATABASE_URL`: *connection string* **pooled** (`-pooler`) do Neon com `?sslmode=verify-full`;
- `CPF_PEPPER`: segredo de 32+ caracteres para o HMAC-SHA256 do CPF;
- `SESSION_SECRET`: segredo de 32+ caracteres para assinatura do cookie de sessão;
- `APP_BASE_URL`: `http://localhost:3000` (padrão local);
- `TEST_DATABASE_URL` *(opcional)*: URL de um branch de teste separado no Neon para rodar os testes de integração.

Para gerar `CPF_PEPPER` e `SESSION_SECRET`, execute duas vezes:
```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

### 3. Aplicar as migrações e popular dados fictícios
```bash
npm run db:migrate
npm run db:seed -- --coord
```
- `db:migrate` cria as tabelas (`usuarios`, `atividades`, `inscricoes`, `tokens_verificacao_email`) de forma idempotente.
- `db:seed -- --coord` cria atividades de exemplo e uma conta fictícia de coordenação, exibindo no terminal o CPF fictício e a senha temporária gerada para essa execução.

### 4. Validar tipos, build e testes
```bash
npm run typecheck
npm run build
npm test
```
> Sem `TEST_DATABASE_URL`, os testes unitários e HTTP rodam normalmente; com `TEST_DATABASE_URL`, também executam os testes de integração e concorrência (30 inscrições simultâneas) contra o Postgres em schema temporário.

### 5. Subir o servidor local e testar no navegador
```bash
npm run dev
```

1. **Fluxo do Participante (`http://localhost:3000/`):**
   - Crie uma conta usando apenas dados **100% fictícios**;
   - Use o link de **Modo sandbox** exibido após o cadastro (ou a aba *Verificar E-mail*) para confirmar o token;
   - Entre com CPF + senha, inscreva-se em atividades (respeitando vagas e horários sem conflito) e teste cancelar uma inscrição para devolver a vaga.
2. **Fluxo da Coordenação (`http://localhost:3000/coordenacao.html`):**
   - Entre com o CPF fictício e a senha exibidos pelo `db:seed -- --coord`;
   - Cadastre ou exclua atividades (a exclusão é bloqueada caso existam inscrições ativas);
   - Selecione uma atividade, filtre inscritos por nome/e-mail e marque/remova a presença.

## Scripts disponíveis

| Script | O que faz |
| --- | --- |
| `npm run dev` | Servidor local com recarga automática (`tsx watch`). |
| `npm test` | Roda todos os testes uma vez (Vitest). Os de integração exigem `TEST_DATABASE_URL`. |
| `npm run typecheck` | Checagem de tipos do TypeScript, sem gerar arquivos. |
| `npm run build` / `npm start` | Compila para `dist/` e roda a versão compilada. |
| `npm run db:migrate` | Aplica as migrações pendentes (registradas em `schema_migrations`). |
| `npm run db:seed` | Popula atividades fictícias (`-- --coord` cria também conta fictícia de coordenação). |

## Estrutura

```text
app/
├── db/migrations/001_schema_inicial.sql  # tabelas, constraints e índices
├── public/               # interface web estática (participante, verificação e coordenação)
├── src/
│   ├── app.ts            # monta o Express (sem listen) — usado por server, testes e Vercel
│   ├── server.ts         # servidor local (listen + encerramento limpo)
│   ├── config/env.ts     # lê/valida variáveis de ambiente (nunca loga valores)
│   ├── db/
│   │   ├── Database.ts   # pool do pg, query(), transacao(), ping()
│   │   ├── migrate.ts    # executor das migrações SQL
│   │   └── seed.ts       # dados fictícios locais de atividades e coordenação
│   ├── domain/           # regras de negócio puras (Usuario, Atividade, Inscricao, Cpf, Email, errors)
│   ├── repositories/     # acesso SQL puro com transações e locks (Usuario, Atividade, Inscricao)
│   ├── security/         # CpfHasher (HMAC), PasswordHasher (scrypt), TokenService, SessionService
│   ├── services/         # EmailService (adaptador sandbox em memória)
│   └── http/
│       ├── middlewares/  # errorHandler e autenticação/papéis via cookie HttpOnly
│       └── routes/       # health, auth, atividades, inscricoes e coordenacao
└── tests/
    ├── unit/             # domínio, segurança, sessão e config
    ├── http/             # rotas via supertest (repositórios em memória)
    └── integration/      # schema e fluxo/concorrência contra Postgres real (TEST_DATABASE_URL)
```

## Regras que valem para todo o código

- Dados **100% fictícios** em testes e seeds (CPFs de teste usam `tests/helpers/cpfFicticio.ts`).
- O CPF **nunca** é salvo: só o `cpf_hash`. Senhas só como `senha_hash` (scrypt). Tokens só como hash.
- Mensagens de erro e logs não podem conter CPF, e-mail, senha, token ou `DATABASE_URL`.
- Regras críticas existem em **dois lugares**: na classe de domínio/repositório e como `CHECK`/`UNIQUE`/`FK` no banco.
