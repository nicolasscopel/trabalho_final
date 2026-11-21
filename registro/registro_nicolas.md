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
