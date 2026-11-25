# Diário do Grupo — Cenário 8

- **Integrantes:** Lorenzo Costa Schauenberg e Nícolas Pelizari Scopel
- **Teto de gasto definido:** `[definir em grupo antes de seguir — ex.: US$ 10,00]`
- **Stack / Serviço de deploy definidos:** `Node.js 22 + TypeScript + Express 5 · PostgreSQL (Neon) · PDFKit · Vercel (serverless)`

---

## Log de Gastos com Modelos / APIs

| Data       | Integrante | Harness / Modelo / Versão                                                            | Gasto na sessão                                       | Acumulado          | Observação                                                         |
| ---------- | ---------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------- | ------------------ | ------------------------------------------------------------------ |
| 2026-11-21 | —          | —                                                                                    | R$ 0,00 / US$ 0,00                                    | R$ 0,00 / US$ 0,00                  | Setup inicial do repositório                                                      |
| 2026-11-21 | Nícolas    | Antigravity CLI (`agy` v1.5.14) / Gemini 4 Hydrogen (Xhigh)                          | `[informar US$/R$]` (92.3k tokens)                    | 92.3k tokens (`[atualizar US$/R$]`) | Etapa 1: definição de stack, fluxo e critérios                                    |
| 2026-11-23 | Nícolas    | Antigravity CLI (`agy` v1.5.15) / Claude Opus 5.5 (High) + Gemini 4 Hydrogen (Xhigh) | `[informar US$/R$]` (113.4k tokens + limite Opus 5.5) | 205.7k tokens + limite Opus 5.5     | Etapa 2: esqueleto do projeto, domínio, schema no Neon e 74 testes                |
| 2026-11-23 | Nícolas    | Antigravity CLI / Gemini 4 Hydrogen (Xhigh)                                          | `[informar US$/R$]` (176k tokens)                     | 381.7k tokens + limite Opus 5.5     | Etapa 3 (Passo 2.2): autenticação, inscrição, presença e painel                   |
| 2026-11-25 | Nícolas    | Antigravity CLI / Gemini 4 Hydrogen (XHigh)                                          | `[informar US$/R$]` (159k tokens)                     | 540.7k tokens + limite Opus 5.5     | Etapa 4 (Passo 2.3): geração de certificado em PDF (`PDFKit`)                     |
| 2026-11-25 | Nícolas    | Antigravity CLI / Gemini 4 Hydrogen (XHigh)                                          | `[informar US$/R$]` (98k tokens; 257k acum. na sessão) | 638.7k tokens + limite Opus 5.5     | Etapa 5 (Passo 2.4): deploy na Vercel, correção `coordenacao.js` e CPF fictício |

---

## Semana 1 — Alinhamento com o Professor
- **Data da conversa:** `AAAA-MM-DD`
- **O que foi combinado como "entregue" na Semana 2:** `[anotar ajustes feitos em aula]`
- **Como combinamos observar:** `[anotar ajustes feitos em aula]`

---

## Semana 2 — Decisões e Cortes de Escopo
> Registrem aqui o que foi decidido em grupo e, principalmente, **o que foi cortado no fim da Semana 2 e por quê**.

- **Data de fechamento da Semana 2 (Passo 2.5):** `2026-11-25` *(tag prevista: `fim-semana-2`)*
- **Decisões de divisão de trabalho:**
  - Na branch `nicolas`, Nícolas conduziu a definição de stack/fluxo (Etapa 1) e a implementação ponta a ponta do MVP em `app/` (Etapas 2 a 5: schema no Neon, autenticação, inscrições concorrentes, painel da coordenação, geração de certificado em PDF com `PDFKit` e deploy *serverless* na Vercel).
  - *[Completar com a divisão/contribuição de Lorenzo ao consolidar o repositório do grupo.]*
- **Comparação com os critérios de "entregue" (`proposta.md`):**
  1. **Formulário de inscrição com dados fictícios:** Entregue (cadastro com verificação de e-mail em *sandbox*, login e inscrição transacional atômica contra *overbooking* e choque de horário, mais cancelamento).
  2. **Tela da coordenação para listar inscritos e marcar presença:** Entregue (`/coordenacao.html` com criação/exclusão de atividades, filtro por nome/e-mail e marcação de presença).
  3. **Geração de certificado em PDF apenas para presença confirmada:** Entregue (`GET /api/inscricoes/:id/certificado` com `PDFKit` + fontes `Liberation` SIL OFL empacotadas, bloqueio `403` sem presença e `404` anti-IDOR).
  4. **Aplicação publicada fora de `localhost`:** Entregue na Vercel (`api/index.ts` + `vercel.json` + Neon PostgreSQL), validada em produção com 5 participantes fictícios (`13` suítes / `94` testes locais passando).
- **Cortes e simplificações formalizados até o fim da Semana 2:**
  1. **Envio automático de e-mails reais (confirmação e entrega de certificados):** cortado conforme previsto em `proposta.md`; mantido em modo *sandbox* controlado (`EXPOR_SANDBOX_VERIFICACAO=true`) por usar apenas dados 100% fictícios e evitar dependência de SMTP/domínio na Semana 2.
  2. **Leitura de QR Code para presença:** cortado conforme previsto em `proposta.md`; presença permanece registrada manualmente pela coordenação com busca por nome/e-mail.
  3. **Editor visual de layout do certificado:** cortado conforme previsto em `proposta.md`; adotado modelo único fixo em A4 paisagem.
  4. **Validação matemática de dígitos verificadores de CPF:** comentada na Etapa 5 (`app/src/domain/Cpf.ts`) para permitir cadastros fictícios simples (como `00000000000`) nos testes manuais em produção, mantendo formato de 11 dígitos e unicidade por `cpf_hash` no banco (candidato a revisão na Semana 3).
- **Totais consolidados da Semana 2 (Etapas 2 a 5 na branch `nicolas`):**
  - **Previsão somada vs. tempo real:** `6h30min` previstos (`1h30 + 2h00 + 1h30 + 1h30`) contra `4h45min` reais (`54min + 44min + 18min + 2h49min`) — saldo líquido `-1h45min`, mas com estouro de `+1h19min` na Etapa 5 (deploy + testes reais).
  - **Tokens consumidos na Semana 2:** `546.4k tokens` + limite do Claude Opus 5.5 (`638.7k tokens` acumulados desde a Etapa 1).
- **Checkpoint da Semana 2 (em aula — 2 minutos):**
  - **O que entrou no ar:** aplicação web completa na Vercel + Neon (inscrição, presença, PDF e proteção anti-IDOR).
  - **O que ficou de fora:** envio real de e-mails, QR Code, editor de certificado e validação estrita de dígitos de CPF.
  - **Previsão vs. realidade:** etapas de geração de código foram mais rápidas que o previsto (`18min`–`54min`), mas o deploy/teste ponta a ponta levou `2h49min` (quase o dobro do previsto).
  - **Primeiras surpresas / achados com o agente:** um bug real na aba da coordenação (`ev.currentTarget.reset()` após `await` em `coordenacao.js`) passou pelos testes de API da Etapa 3 e só apareceu no uso real no navegador; além da necessidade de ajustar o projeto para *serverless* (`outputDirectory`, `includeFiles` das fontes, `EXPOR_SANDBOX_VERIFICACAO`).
  - **Perguntas do professor / turma após apresentar:** `[anotar após o checkpoint em aula]`

---

## Semana 3 — Viver com o Sistema (Manutenção e Dívida Técnica)
- **Problemas / pedidos simulados testados na Semana 3:** `[listar]`
- **Principais descobertas ao tentar alterar o código da Semana 2:** `[listar]`
- **Checkpoint da Semana 3 (em aula):** `[principais pontos apresentados em 2 minutos e perguntas do professor]`

---

## Semana 4 — Fechamento e Apresentação
- **Data do congelamento final do código (até quinta):** `AAAA-MM-DD`
- **Perguntas da turma/professor na apresentação (sexta):** `[anotar para eventual uso no artigo]`
