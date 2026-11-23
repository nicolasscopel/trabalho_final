# Registro Individual — Nícolas Pelizari Scopel

> **Regra de ouro:** Sempre faça o commit da seção **ANTES da etapa** antes de começar a implementar ou rodar o agente. A data do commit comprova que a previsão veio antes do resultado.

---

## Modelo para Novas Etapas (copie e cole abaixo)

```markdown
## Etapa [N] — [Nome da etapa]
**Data:** AAAA-MM-DD
**Harness / Modelo / Versão:** [ex.: OpenCode vX.Y / Modelo Z]

### ANTES da etapa (commitar antes de rodar!)
- **Previsão de tempo:** [ex.: 2h]
- **O que vou delegar ao agente:** [...]
- **O que NÃO vou delegar:** [...]
- **Onde acho que vai dar problema:** [...]

### DEPOIS da etapa
- **Tempo real gasto:** [...]
- **Gasto com modelo:** [...]
- **O que o agente fez e eu aceitei direto:** [...]
- **O que eu tive de refazer ou corrigir:** [...]
- **Onde travei / o que precisei aprender:** [...]
- **O que surpreendeu:** [...]
- **O que só entendi depois (preencher na Semana 3, se aplicável):** [...]
```

---

## Semana 1 — Setup inicial
- **2026-11-21:** Criação do repositório Git e estrutura inicial de registro antes de qualquer código.

---

## Etapa 1 — Estruturação das ideias e seleção de ferramentas
**Data:** 2026-11-21  
**Hora inicial:** 15:42 (-03:00)  
Hora final: 16:22(-3:00)
**Harness / Modelo / Versão:** Antigravity CLI (`agy` v1.5.14) / Gemini 4 Hydrogen xhigh

### ANTES da etapa (commitar antes de rodar!)
- **Previsão de tempo:** 45min a 1h (estimativa para estruturar os critérios de carga/privacidade e decidir stack, banco, geração de PDF, deploy e ferramentas de teste em diálogo)
- **O que vou delegar ao agente:** Levantamento comparativo (prós e contras) de stacks, bancos de dados, bibliotecas de PDF, plataformas de deploy e ferramentas de teste de carga adequadas ao cenário de 1 semana com foco em confiabilidade sob solicitação intensa e privacidade de dados; redação e atualização deste registro individual.
- **O que NÃO vou delegar:** A escolha final das ferramentas do projeto, a definição do que conta como "nível desejado" de confiabilidade/privacidade, nem alterações em `proposta.md` ou `registro/diario_grupo.md` (que ficam para revisão/decisão manual).
- **Onde acho que vai dar problema:** Equilibrar simplicidade para entregar em 1 semana (e manter na Semana 3) com requisitos de alta concorrência (locks de banco, geração pesada de PDF) e privacidade (controle de acesso, proteção contra IDOR e vazamento de dados); possíveis limitações do ambiente local (sem Docker ou `pip` pré-instalado) e limites de planos gratuitos de hospedagem.

### DEPOIS da etapa
- **Hora de encerramento da etapa:** 16:20 (-03:00)
- **Tempo real gasto:** ~38min (15:42 às 16:20 — diálogo de estruturação, seleção de ferramentas e fechamento do fluxo e critérios)
- **Gasto com modelo:** [92.3k tokens ]
- **Ferramentas e critérios escolhidos na etapa:**
  - **Stack Web:** Node.js + TypeScript + **Express** (ambiente local verificado: `node v22.22.1`, `npm 9.2.0`)
  - **Banco de Dados:** PostgreSQL gerenciado na **Neon**
  - **Geração de PDF:** `PDFKit` (opção 1 — geração programática leve em memória/`Buffer`, sem Chromium, embutindo fonte `.ttf` para acentuação)
  - **Deploy / Hospedagem:** Vercel (*serverless*)
  - **Fluxo definido pelo usuário:** participante cria conta com CPF, nome, e-mail e senha (dados 100% fictícios nos testes) e precisa verificar o e-mail (via **Opção A**: token criptográfico real no backend com hash SHA-256/expiração/uso único + adaptador de envio em modo *sandbox* controlado para dados fictícios, sem caixa pública vazando dados); faz login preferencialmente por CPF + senha; pode se inscrever em múltiplas atividades sem conflito de horário e cancelar inscrições para liberar vaga; coordenação registra presença e certificado em PDF é liberado apenas com presença confirmada (sem exibir CPF no certificado).
  - **Meta de confiabilidade sob carga:** suportar **30 solicitações simultâneas** sem erros `5xx`, locks ou *deadlocks*, com transação atômica no Postgres (bloqueio consistente de usuário + atividade) para impedir *overbooking* de vagas **e** impedir inscrições simultâneas com choque de horário; cancelamento transacional devolvendo a vaga.
  - **Meta de privacidade e proteção de dados:** zero vazamento em rotas públicas, respostas de erro ou logs; como o CPF não é exibido no certificado, armazenar **apenas `cpf_hash` (HMAC-SHA256 com *pepper* em `.env`)** sem guardar CPF recuperável no banco; senha com hash unidirecional (`scrypt`/`argon2` com salt); e-mail com acesso restrito/protegido e token de verificação salvo como hash SHA-256 de uso único e expirável; resposta genérica no login; sessão `HttpOnly`/`Secure`/`SameSite` e checagem de dono + `presente === true` no PDF.
- **O que o agente fez e eu aceitei direto:** Comparativo de prós e contras por camada, refinamento do modelo de dados/concorrência (choque de horário + liberação de vaga no cancelamento + minimização do CPF via HMAC sem armazenamento reversível + verificação de e-mail em modo *sandbox* para dados fictícios) e registro estruturado da Etapa 1 neste arquivo. *(revisar/ajustar em 1ª pessoa)*
- **O que eu tive de refazer ou corrigir:** [Conversei com o agente para entender quais seriam as estruturas de ferramentas disponíveis para uso. Solicitei opções que sejam possíveis de serem feitas em 2 semanas e que entreguem o combinado.]
- **Onde travei / o que precisei aprender:** [pontos levantados para atenção: pooling de conexões no Neon em *serverless*, empacotamento de fontes `.ttf` para `PDFKit` na Vercel, distinção entre hash de senha vs. criptografia/minimização de CPF e limites de *rate limit* em funções *serverless*]
- **O que surpreendeu:** [a estruturação geral do projeto e comparativos. a visão do agente para funcionalidades que não informei]
- **O que só entendi depois (preencher na Semana 3, se aplicável):** [preencher na Semana 3, se aplicável]


---

## Semana 2 — Sprint de 1 semana (início em 2026-11-23)
- **2026-11-23:** Início da Semana 2. Registro da previsão da Etapa 2 commitado **antes** de rodar o agente e antes de qualquer código em `app/`.
- **Stack herdada da Etapa 1:** Node.js + TypeScript + Express · PostgreSQL (Neon) · PDFKit · Vercel (*serverless*).

---

## Etapa 2 — Esqueleto do projeto e modelagem mínima do banco (Dia 1)
**Data:** 2026-11-23  
**Hora inicial:** 08:24 (-03:00)  
**Hora final:** 09:22(-03:00) *(ajustar ao horário real em que você fechar e commitar)*  
**Harness / Modelo / Versão:** Antigravity CLI (`agy` v1.5.15) / Claude Opus 5.5 (High)  / Gemini 4 Hydrogen (Xhigh)
**Ambiente local:** `node v22.22.1`, `npm 9.2.0`

### ANTES da etapa (commitar antes de rodar!)
- **Previsão de tempo:** 1h30min *(revisar/ajustar em 1ª pessoa antes do commit)*
- **Escopo da etapa (o que conta como "concluída"):**
  1. Projeto em `app/` inicializado com Node.js + TypeScript + Express (`package.json`, `tsconfig.json`, scripts `dev`/`build`/`start`);
  2. Rota `GET /health` respondendo localmente;
  3. Conexão com o Postgres (Neon) via variável de ambiente (`DATABASE_URL`) lida de `.env` — com `.env.example` versionado **sem valores reais**;
  4. Script SQL de criação do schema mínimo aplicado no banco (migração inicial);
  5. Nenhum segredo, `.env` ou dado pessoal real no `git status`.
- **Entidades mínimas previstas (a confirmar com o Lorenzo):**
  - `usuarios` — `id`, `nome`, `email` (único), `cpf_hash` (HMAC-SHA256, único), `senha_hash`, `email_verificado`, `papel` (`participante` | `coordenacao`), `criado_em`;
  - `atividades` — `id`, `titulo`, `inicio`, `fim`, `carga_horaria`, `vagas`, `vagas_ocupadas` (ou contagem por inscrição);
  - `inscricoes` — `id`, `usuario_id`, `atividade_id`, `status` (`ativa` | `cancelada`), `presente` (`boolean`, padrão `false`), `criado_em`; restrição de unicidade para inscrição ativa por usuário + atividade;
  - `tokens_verificacao_email` — `id`, `usuario_id`, `token_hash` (SHA-256), `expira_em`, `usado_em`.
- **O que vou delegar ao agente:** Criação do esqueleto do projeto (estrutura de pastas, configuração do TypeScript, Express, scripts npm), módulo de conexão com o Postgres usando *pool*, rota de *healthcheck*, rascunho do SQL de criação das tabelas/constraints a partir das entidades acima, `.env.example` e atualização deste registro.
- **O que NÃO vou delegar:**
  - Criação da conta/projeto no Neon e geração da `DATABASE_URL` e do *pepper* do CPF — feitos por mim, direto no `.env`, **sem colar credenciais no chat do agente**;
  - Decisão final das entidades e da divisão de trabalho com o Lorenzo (decisão do grupo, registrada em `registro/diario_grupo.md`);
  - Revisão linha a linha do SQL (constraints de unicidade, `CHECK` de vagas e de `inicio < fim`, chaves estrangeiras) antes de aplicar no banco;
  - Escolha de adicionar ORM ou frameworks extras — se o agente propuser, preciso aprovar explicitamente (preferência por `pg` + SQL puro para entender o que roda).
- **Onde acho que vai dar problema:**
  - Configuração do TypeScript (ESM vs. CommonJS, `ts-node`/`tsx`) e compatibilidade entre `npm 9` e `node 22`;
  - Conexão com o Neon: SSL obrigatório, string de conexão *pooled* vs. direta e comportamento do *pool* em ambiente *serverless* (Vercel) — risco de funcionar local e falhar no deploy;
  - Estruturar o Express já pensando na Vercel (exportar o `app` separado do `listen`) sem superdimensionar a arquitetura;
  - O agente introduzir complexidade desnecessária (ORM, camadas demais, bibliotecas que não conheço) e eu aceitar por pressa;
  - Definir como contar vagas (coluna `vagas_ocupadas` vs. `COUNT` com *lock*) já impacta a meta de 30 solicitações simultâneas da Etapa 1.

### DEPOIS da etapa
- **Hora de encerramento da etapa:** 09:22(-03:00) *(ajustar ao encerrar a revisão final)*
- **Tempo real gasto:** ~54min (08:24 às 09:22 — diferença de ~-32min em relação à previsão de 1h30min; ajustar com seu tempo total incluindo leitura/revisão)
- **Gasto com modelo:** [113.4k tokens e todo o limite do Claude Opus 5.5 - Usado na criação geral dos arquivos]
- **Bibliotecas e arquitetura geradas (fatos da sessão):**
  - Produção: apenas `express` (`^5.3.0`) e `pg` (`^8.23.1`), sem ORM; criptografia/hash (`HMAC-SHA256`, `scrypt`, tokens) usando `node:crypto` nativo;
  - Desenvolvimento: `typescript` (`^7.0.2`), `tsx`, `vitest`, `supertest` e `@types/*`;
  - Estrutura em `app/`: separação `domain/` (entidades `Usuario`, `Atividade`, `Inscricao`, `Cpf`, `Email` e erros), `security/`, `config/`, `db/` (pool + executor de migrações) e `http/` (`createApp` desacoplado do `listen` + `/health` e `/health/db`);
  - Schema aplicado (`001_schema_inicial.sql`): tabelas `usuarios`, `atividades` (com `vagas_ocupadas` + `CHECK`), `inscricoes` e `tokens_verificacao_email`, com validação confirmada via `npm run db:migrate` (idempotente) e `npm test` (**74/74 testes passando**, incluindo os 5 testes de integração contra o branch `teste` no Neon).
- **O agente escolheu bibliotecas que eu conheço ou introduziu complexidade desnecessária?** [preencher em 1ª pessoa: você conhecia Express/pg/Vitest/Supertest? Achou a separação em domain/security/db na medida certa ou com camadas/classes além do esperado para o Dia 1?
  Conhecia algumas, mas grande parte não sabia da existência, como o banco de dados neon]
- **Tempo para subir o ambiente local:** [preencher em 1ª pessoa: quanto tempo levou entre criar projeto/branch no Neon, preencher `.env`, rodar `db:migrate` e ver os 74 testes passarem
  45min +/- visto que foi necessária a criação do banco no neon]
- **O que o agente fez e eu aceitei direto:** [preencher em 1ª pessoa após revisar `app/src/` e `app/db/migrations/001_schema_inicial.sql` — ex.: classes de domínio, escolha de UUIDs, coluna `vagas_ocupadas` com `CHECK`, regra provisória de não cancelar após presença, runner de migrações
  praticamente toda a estruturação foi aceita]
- **O que eu tive de refazer ou corrigir:** [preencher em 1ª pessoa: se corrigiu algo no SQL, `.env` ou código, ou "nenhuma alteração manual necessária"]
- **Onde travei / o que precisei aprender:** [preencher em 1ª pessoa: ex.: criação do projeto/branch no Neon, URL `-pooler`, `sslmode=verify-full` e `enableChannelBinding`
  o mais complicado foi a integração necessária com o Neon, mas após o agente gerar uma explicação e passo a passo consegui compreender]
- **O que surpreendeu:** [preencher em 1ª pessoa: ex.: tempo real menor que o previsto, testes de integração já rodando contra um branch real no Neon com ROLLBACK, etc.
  a capacidade de criação/estruturação do agente ]
- **O que só entendi depois (preencher na Semana 3, se aplicável):** [preencher na Semana 3, se aplicável]
