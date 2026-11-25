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
**Hora final:** 09:22 (-03:00)  
**Harness / Modelo / Versão:** Antigravity CLI (`agy` v1.5.15) / Claude Opus 5.5 (High) / Gemini 4 Hydrogen (Xhigh)
**Ambiente local:** `node v22.22.1`, `npm 9.2.0`

### ANTES da etapa (commitar antes de rodar!)
- **Previsão de tempo:** 1h30min
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
- **Hora de encerramento da etapa:** 09:22 (-03:00) *(commit `cdee506` em 09:24:33)*
- **Tempo real gasto:** ~54min (08:24 às 09:22 — diferença de ~-32min em relação à previsão de 1h30min)
- **Gasto com modelo:** 113.4k tokens e todo o limite do Claude Opus 5.5 (usado na criação geral dos arquivos)
- **Bibliotecas e arquitetura geradas (fatos da sessão):**
  - Produção: apenas `express` (`^5.3.0`) e `pg` (`^8.23.1`), sem ORM; criptografia/hash (`HMAC-SHA256`, `scrypt`, tokens) usando `node:crypto` nativo;
  - Desenvolvimento: `typescript` (`^7.0.2`), `tsx`, `vitest`, `supertest` e `@types/*`;
  - Estrutura em `app/`: separação `domain/` (entidades `Usuario`, `Atividade`, `Inscricao`, `Cpf`, `Email` e erros), `security/`, `config/`, `db/` (pool + executor de migrações) e `http/` (`createApp` desacoplado do `listen` + `/health` e `/health/db`);
  - Schema aplicado (`001_schema_inicial.sql`): tabelas `usuarios`, `atividades` (com `vagas_ocupadas` + `CHECK`), `inscricoes` e `tokens_verificacao_email`, com validação confirmada via `npm run db:migrate` (idempotente) e `npm test` (**74/74 testes passando**, incluindo os 5 testes de integração contra o branch `teste` no Neon).
- **O agente escolheu bibliotecas que eu conheço ou introduziu complexidade desnecessária?** Conhecia algumas, mas grande parte não sabia da existência, como o banco de dados Neon.
- **Tempo para subir o ambiente local:** 45min +/-, visto que foi necessária a criação do banco no Neon.
- **O que o agente fez e eu aceitei direto:** Praticamente toda a estruturação foi aceita.
- **O que eu tive de refazer ou corrigir:** Preenchi documentos com minhas chaves e verifiquei a estrutura.
- **Onde travei / o que precisei aprender:** O mais complicado foi a integração necessária com o Neon, mas após o agente gerar uma explicação e passo a passo consegui compreender.
- **O que surpreendeu:** A capacidade de criação/estruturação do agente.
- **O que só entendi depois (preencher na Semana 3, se aplicável):** `[preencher na Semana 3, se aplicável]`

---

## Etapa 3 — Inscrição, autenticação e painel de presença (Dia 2 / Passo 2.2)
**Data:** 2026-11-23  
**Hora inicial:** 10:09 (-03:00)  
**Hora final:** 10:53 (-03:00)
**Harness / Modelo / Versão:** Antigravity CLI / Gemini 4 Hydrogen (Xhigh)  
**Ambiente local:** `node v22.22.1`, `npm 9.2.0`

### ANTES da etapa (commitar antes de rodar!)
- **Previsão de tempo:** 2h00min *(revisar/ajustar estimativa pessoal antes de commitar o registro)*
- **Escopo da etapa (o que conta como "concluída"):**
  1. Cadastro de participante (nome, e-mail, CPF, senha com dados 100% fictícios), verificação de e-mail com token SHA-256 em modo *sandbox* controlado (sem rota pública vazando dados nem segredos em logs) e login por CPF + senha com cookie de sessão (`HttpOnly`, `SameSite`, `Secure` em produção);
  2. Listagem de atividades, inscrição transacional atômica no Postgres (bloqueio contra *overbooking* e choque de horário) e cancelamento devolvendo a vaga;
  3. Painel da coordenação (acesso restrito ao papel `coordenacao`) para cadastrar atividades, listar inscritos por atividade e marcar/desmarcar presença (`presente`);
  4. Interface web simples (`app/public/`) cobrindo inscrição e painel da coordenação + testes unitários, HTTP e integração/concorrência.
- **O que vou delegar ao agente:** Implementação do serviço de sessão assinada (HMAC-SHA256), adaptador de e-mail *sandbox*, repositórios SQL em `pg` com transações e *locks*, rotas Express (`/api/auth`, `/api/atividades`, `/api/inscricoes`, `/api/coordenacao`), páginas HTML/JS estáticas e suíte de testes da etapa.
- **O que NÃO vou delegar:** Definição dos valores reais no `.env` (`SESSION_SECRET`, credenciais do Neon), revisão das transações SQL e da ordem dos *locks* (`FOR UPDATE`) contra *deadlock*/condição de corrida, auditoria da política de privacidade (nenhum CPF, senha, e-mail ou token em logs/rotas públicas) e definição da divisão de tarefas com o Lorenzo no `diario_grupo.md`.
- **Onde acho que vai dar problema:**
  - Garantir ordem consistente de *locks* no Postgres entre inscrição simultânea e cancelamento para atingir a meta de 30 solicitações simultâneas sem *deadlocks* ou `5xx`;
  - Manter sessão *stateless* compatível com a Vercel (*serverless*) sem deixar de validar `email_verificado` em tempo real antes de permitir inscrições;
  - Expor a verificação de e-mail em *sandbox* de forma testável localmente na interface sem criar vazamento público de e-mails/tokens nem expor links em produção;
  - Configurar o cookie (`Secure` apenas em produção/HTTPS) para funcionar tanto localmente via HTTP (`localhost`) quanto em produção;
  - Proteger rotas contra *IDOR* no cancelamento e no acesso ao painel da coordenação.

### DEPOIS da etapa
- **Hora de encerramento da etapa:** `[10:53]`
- **Tempo real gasto:** `[44 minutos]`
- **Gasto com modelo:** `[176k tokens]`
- **Decisões implícitas que o pedido original não especificava (e o que assumimos):** `[ex.: inscrição duplicada, reinscrição após cancelamento, cancelamento com presença já marcada, presença por atividade, verificação de e-mail antes da inscrição]`
- **O que o agente fez e eu aceitei direto:** `[layout e criação das páginas]`
- **O que eu tive de refazer ou corrigir:** `[correção de funcionalidades]`
- **Onde travei / o que precisei aprender:** `[é mais difícil corrigir/alterar algo quando não foi criado com domínio]`
- **O que surpreendeu:** `[a qualidade geral da aplicação]`
- **O que só entendi depois (preencher na Semana 3, se aplicável):** `[preencher na Semana 3, se aplicável]`

---

## Etapa 4 — Geração de certificado em PDF (Dia 3 / Passo 2.3)
**Data:** 2026-11-25  
**Hora inicial:** 14:40 (-03:00)  
**Hora final:** 14:58 (-03:00)  
**Harness / Modelo / Versão:** Antigravity CLI / Gemini 4 Hydrogen (XHigh)  
**Ambiente local:** `node v22.22.1`, `npm 9.2.0`

### ANTES da etapa (commitar antes de rodar!)
- **Previsão de tempo:** 1h30min *(revisar/ajustar estimativa pessoal antes de commitar o registro)*
- **Escopo da etapa (o que conta como "concluída"):**
  1. Serviço de geração de certificado em PDF em memória (`Buffer`) usando `PDFKit`, com fontes `.ttf` embutidas no repositório (`app/assets/fonts/`) para garantir acentuação em português (`ç`, `ã`, `é`) sem depender de fontes instaladas no sistema operacional;
  2. Layout em paisagem (A4) contendo: nome do participante, título da atividade, data/período, carga horária, código de registro (ID da inscrição) e aviso discreto de ambiente de testes/dados fictícios — **sem exibir CPF, e-mail ou dados sensíveis**;
  3. Endpoint protegido `GET /api/inscricoes/:id/certificado` exigindo sessão autenticada, checando posse da inscrição (anti-IDOR: `404` para inscrição inexistente ou de outro usuário) e liberando o PDF **apenas** quando `podeEmitirCertificado === true` (`status === 'ativa' && presente === true`, retornando `403` caso contrário);
  4. Botão para baixar o certificado em PDF na interface do participante (`app/public/app.js`) quando `podeEmitirCertificado` for verdadeiro + testes unitários, HTTP e de integração contra o Postgres (Neon).
- **O que vou delegar ao agente:** Instalação de `pdfkit` e `@types/pdfkit`, cópia/empacotamento das fontes `.ttf` (SIL OFL) em `app/assets/fonts/`, implementação do `CertificadoService`, consulta SQL de dados do certificado no `InscricaoRepository`, rota `GET /api/inscricoes/:id/certificado`, atualização do botão no frontend (`app/public/app.js`) e criação dos testes da etapa.
- **O que NÃO vou delegar:** Inspeção visual do PDF gerado em leitor local (acentuação, alinhamento, nomes/títulos longos e conferência de que não há CPF), revisão da licença das fontes `.ttf` incluídas no projeto e preenchimento posterior da seção **DEPOIS** e do gasto em `registro/diario_grupo.md`.
- **Onde acho que vai dar problema:**
  - Resolução de caminho das fontes `.ttf` entre `src/` (`tsx`/Vitest) e `dist/` (`tsc` / futuro deploy na Vercel);
  - Quebra de linha ou sobreposição de textos no `PDFKit` quando o nome do participante ou o título da atividade forem longos;
  - Acentuação quebrada se alguma parte do documento usar fonte padrão do `PDFKit` em vez da `.ttf` embutida;
  - Tratamento de erros assíncronos dentro dos *streams* do `PDFKit` sem derrubar o servidor nem vazar dados em logs;
  - Proteção direta da rota contra IDOR e emissão sem presença confirmada.

### DEPOIS da etapa
- **Hora de encerramento da etapa:** 14:58 (-03:00)
- **Tempo real gasto:** ~18min (14:40 às 14:58 — diferença de -1h12min em relação à previsão de 1h30min)
- **Gasto com modelo:** 159k tokens (`[informar US$/R$]`)
- **Decisões implícitas que o pedido original não especificava (e o que assumimos):** `[nenhuma]`
- **O que o agente fez e eu aceitei direto:** `[gerou o certificado corretamente]`
- **O que eu tive de refazer ou corrigir:** `[nada]`
- **O que surpreendeu:** `[capacidade de tomada de decisão]`
- **O que só entendi depois (preencher na Semana 3, se aplicável):** `[preencher na Semana 3, se aplicável]`

---

## Etapa 5 — Hospedagem (Deploy) na Vercel e Teste Ponta a Ponta (Dia 4 / Passo 2.4)
**Data:** 2026-11-25  
**Hora inicial:** 15:06 (-03:00)  
**Hora final:** 17:55 (-03:00)  
**Harness / Modelo / Versão:** Antigravity CLI / Gemini 4 Hydrogen (XHigh)  
**Ambiente local:** `node v22.22.1`, `npm 9.2.0`

### ANTES da etapa (commitar antes de rodar!)
- **Previsão de tempo:** 1h30min *(revisar/ajustar estimativa pessoal antes de commitar o registro)*
- **Escopo da etapa (o que conta como "concluída"):**
  1. Preparar `app/` para execução *serverless* na Vercel (`api/index.ts`, `vercel.json` com `includeFiles` para `assets/fonts/**`, compartilhamento de inicialização via `bootstrap.ts`, *fallback* de `VERCEL_URL`/`VERCEL_PROJECT_PRODUCTION_URL` em `APP_BASE_URL` e flag explícita `EXPOR_SANDBOX_VERIFICACAO` para permitir testar verificação de e-mail em produção com dados 100% fictícios);
  2. Publicar a aplicação na Vercel conectada ao repositório Git (`Root Directory` = `app`) e ao PostgreSQL na Neon via variáveis de ambiente cadastradas no painel da Vercel (sem commitar `.env` nem segredos);
  3. Validar na URL pública da Vercel (fora de `localhost`): `GET /health` e `GET /health/db` retornando `ok`, fluxo completo com **5 participantes fictícios** (cadastro, verificação de e-mail, login, inscrição, marcação de presença para **3 deles** pela coordenação, download de certificado em PDF válido para quem veio e bloqueio para quem faltou).
- **O que vou delegar ao agente:** Criação do *entrypoint* `app/api/index.ts`, configuração `app/vercel.json`, extração de `criarAppDeConfig` / `criarAppDeAmbiente` em `app/src/bootstrap.ts`, ajustes em `env.ts`/`CertificadoService.ts`/`auth.ts`/`.env.example`, testes automatizados de configuração e *entrypoint* *serverless*, além do passo a passo completo para configurar e publicar na Vercel.
- **O que NÃO vou delegar:** Criação da conta/projeto na Vercel, configuração das variáveis de ambiente reais (`DATABASE_URL`, `CPF_PEPPER`, `SESSION_SECRET`, `EXPOR_SANDBOX_VERIFICACAO`) no painel da Vercel, conferência de migrações/seed no banco alvo, execução do teste ponta a ponta na URL pública e preenchimento posterior da seção **DEPOIS** e do gasto no `registro/diario_grupo.md`.
- **Onde acho que vai dar problema:**
  - Nunca utilizei a Vercel antes: risco de errar a configuração de *Root Directory* (`app`), *Output Directory* (`public`) ou conflito com detecção automática do framework Express;
  - Caminhos dos arquivos estáticos (`public/`) vs função *serverless* (`api/index.ts`) e empacotamento das fontes `.ttf` (`assets/fonts/`) no ambiente *serverless*;
  - Fluxo de verificação de e-mail em produção usando dados fictícios (já que `NODE_ENV=production` ocultava o link *sandbox* por padrão);
  - Diferenças entre o ambiente local e a Vercel (*cold start*, pool de conexões no Neon com `-pooler`, `trust proxy` e cookies `Secure` em HTTPS).

### DEPOIS da etapa
- **Hora de encerramento da etapa:** 17:55 (-03:00)
- **Tempo real gasto:** 2h49min (15:06 às 17:55 — diferença de +1h19min em relação à previsão de 1h30min)
- **Gasto com modelo:** 98k tokens nesta etapa (`257k acumulados na janela - 159k da Etapa 4`) / `[informar US$/R$]`
- **Resultado do teste ponta a ponta em produção:** Concluído na Vercel com a aplicação publicada, autenticação da coordenação, cadastro de 5 participantes fictícios, marcação de presença e emissão/bloqueio de certificados em PDF.
- **Commits da etapa (evidência cronológica no Git):**
  - `9e51b96` — Previsão (**ANTES**) da Etapa 5 em `registro/registro_nicolas.md`;
  - `9b9b29e` — Configuração *serverless* da Vercel (`api/index.ts`, `vercel.json`, `bootstrap.ts`, `env.ts`, `CertificadoService.ts`);
  - `211aff2` — Correção do reset após `await` no formulário da coordenação (`app/public/coordenacao.js`);
  - `ff7d705` — Flexibilização comentada da validação de CPF para testes fictícios (`Cpf.ts` e `Cpf.test.ts` — apesar de a mensagem do commit repetir menção ao formulário, o diff altera apenas a validação de CPF).
- **Problemas encontrados durante o desenvolvimento da etapa (e soluções aplicadas):**
  1. **Ausência de adaptação *serverless* e empacotamento para a Vercel (`9b9b29e`):** o projeto possuía apenas `src/server.ts` com `app.listen()`. Foi necessário criar `app/api/index.ts`, configurar `app/vercel.json` (`"framework": null`, `"outputDirectory": "public"` para o CDN servir os arquivos estáticos, `rewrites` de `/(.*)` para `/api` e `includeFiles: "assets/fonts/**"` para incluir as fontes `.ttf` na função *serverless*), extrair a inicialização compartilhada em `app/src/bootstrap.ts`, adicionar `app.set('trust proxy', 1)` em `app.ts`, adicionar *fallback* via `process.cwd()` em `CertificadoService.ts` e fallback automático de `VERCEL_PROJECT_PRODUCTION_URL` / `VERCEL_URL` em `APP_BASE_URL` (`env.ts`).
  2. **Verificação de e-mail em produção com dados 100% fictícios (`9b9b29e`):** como `NODE_ENV=production` ocultava o retorno do link *sandbox* e não há envio real de e-mail para endereços fictícios, foi preciso criar a variável explícita `EXPOR_SANDBOX_VERIFICACAO=true` no ambiente para conseguir validar os 5 cadastros fictícios no deploy.
  3. **Bug oculto da Etapa 3 na aba da Coordenação (`211aff2`):** o login da conta `"Coordenação Fictícia"` (`papel: "coordenacao"` no Neon) funcionava na aba Participante (`/`), mas falhava na aba Coordenação (`/coordenacao.html`). A causa era `ev.currentTarget.reset()` chamado **após** `await api(...)` nos formulários `form-coord-login` e `form-nova-atividade` em `app/public/coordenacao.js`: no navegador, `ev.currentTarget` se torna `null` depois do `await`, lançando `TypeError` logo após o cookie de sessão já ter sido gravado. Esse bug de frontend não havia sido coberto pelos testes HTTP da Etapa 3. Foi corrigido salvando `const form = ev.currentTarget` antes do `await` e tratando erros ao carregar atividades/inscritos.
  4. **Validação matemática de CPF dificultando testes manuais (`ff7d705`):** embora o sistema não consulte CPFs reais na Receita, `Cpf.ehValido` em `app/src/domain/Cpf.ts` exigia dígitos verificadores válidos (módulo 11) e bloqueava sequências como `00000000000`. Para agilizar o cadastro dos 5 participantes fictícios do teste, a checagem de dígitos repetidos e verificadores foi comentada em `Cpf.ehValido` (mantendo apenas o formato de 11 dígitos numéricos e atualizando `Cpf.test.ts`), preservando a restrição de unicidade de `cpf_hash` no banco (exigindo 5 números distintos, como `00000000000` a `00000000004`).
- **Diferenças observadas entre ambiente local e deploy:** No ambiente local tudo rodava em um único processo Express (`server.ts` servindo `public/` via `express.static` e `assets/fonts/` via `import.meta.dirname` com `NODE_ENV=development` expondo o *sandbox* automaticamente); na Vercel foi preciso separar estáticos (`outputDirectory: "public"`) da função *serverless* (`api/index.ts`), declarar explicitamente `includeFiles` para as fontes do PDF, considerar `trust proxy` para cookies `Secure` em HTTPS, configurar `Root Directory = app` / branch `nicolas` e habilitar `EXPOR_SANDBOX_VERIFICACAO=true`. *(Completar se notou mais alguma diferença na prática, ex.: cold start ou logs.)*
- **O que o agente fez e eu aceitei direto:** Configuração *serverless* inicial (`api/index.ts`, `vercel.json`, `bootstrap.ts`, ajustes em `env.ts` e `CertificadoService.ts`), diagnóstico e correção de `coordenacao.js`, flexibilização comentada de `Cpf.ehValido` + atualização dos testes (`94/94` passando) e guia passo a passo da Vercel. *(Ajustar se revisou/alterou algo manualmente.)*
- **O que eu tive de fazer manualmente / configurar na etapa:** `[ criação do projeto na Vercel, ajuste de branch/Root Directory, preenchimento das variáveis de ambiente e execução do teste dos 5 participantes]`
- **Onde travei / o que precisei aprender (primeira vez usando Vercel):** `[comecei a encontrar alguns problemas na apliacção que foi criada, cpf, menus, erros de lógica]`
- **O que surpreendeu:** `[]`
- **O que só entendi depois (preencher na Semana 3, se aplicável):** `[preencher na Semana 3, se aplicável]`
