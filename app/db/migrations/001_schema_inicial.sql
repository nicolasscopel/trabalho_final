-- =====================================================================
-- 001 — Schema inicial (Semana 2, Etapa 2)
-- Rascunho gerado pelo agente: REVISAR LINHA A LINHA antes de aplicar.
--
-- Decisões embutidas (confirmar com o grupo):
--  * IDs em UUID (gen_random_uuid, nativo do Postgres 13+): não são
--    sequenciais, o que dificulta adivinhar /certificado/<id> (IDOR).
--  * CPF nunca é armazenado: apenas cpf_hash (HMAC-SHA256 em hex = 64 chars).
--  * Vagas controladas pela coluna vagas_ocupadas + CHECK no banco:
--    mesmo com 30 requisições simultâneas o banco recusa overbooking.
--    A inscrição deve fazer:
--      UPDATE atividades SET vagas_ocupadas = vagas_ocupadas + 1
--       WHERE id = $1 AND vagas_ocupadas < vagas RETURNING ...
--  * Choque de horário é verificado na aplicação dentro de uma transação
--    que trava a linha do usuário (SELECT ... FROM usuarios WHERE id = $1
--    FOR UPDATE), serializando as inscrições de um mesmo usuário.
--  * Carga horária em minutos (inteiro) para evitar arredondamentos.
-- =====================================================================

CREATE TABLE usuarios (
    id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    nome              text        NOT NULL,
    email             text        NOT NULL,
    cpf_hash          char(64)    NOT NULL,
    senha_hash        text        NOT NULL,
    email_verificado  boolean     NOT NULL DEFAULT false,
    papel             text        NOT NULL DEFAULT 'participante',
    criado_em         timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT usuarios_nome_tamanho CHECK (char_length(btrim(nome)) BETWEEN 2 AND 120),
    CONSTRAINT usuarios_email_minusculo CHECK (email = lower(btrim(email))),
    CONSTRAINT usuarios_papel_valido CHECK (papel IN ('participante', 'coordenacao')),
    CONSTRAINT usuarios_cpf_hash_hex CHECK (cpf_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT usuarios_email_unico UNIQUE (email),
    CONSTRAINT usuarios_cpf_hash_unico UNIQUE (cpf_hash)
);

CREATE TABLE atividades (
    id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo                 text        NOT NULL,
    descricao              text,
    inicio                 timestamptz NOT NULL,
    fim                    timestamptz NOT NULL,
    carga_horaria_minutos  integer     NOT NULL,
    vagas                  integer     NOT NULL,
    vagas_ocupadas         integer     NOT NULL DEFAULT 0,
    criado_em              timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT atividades_titulo_tamanho CHECK (char_length(btrim(titulo)) BETWEEN 3 AND 200),
    CONSTRAINT atividades_periodo_valido CHECK (inicio < fim),
    CONSTRAINT atividades_carga_positiva CHECK (carga_horaria_minutos > 0),
    CONSTRAINT atividades_vagas_positivas CHECK (vagas > 0),
    CONSTRAINT atividades_sem_overbooking CHECK (vagas_ocupadas BETWEEN 0 AND vagas)
);

CREATE TABLE inscricoes (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id    uuid        NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
    atividade_id  uuid        NOT NULL REFERENCES atividades (id) ON DELETE RESTRICT,
    status        text        NOT NULL DEFAULT 'ativa',
    presente      boolean     NOT NULL DEFAULT false,
    criado_em     timestamptz NOT NULL DEFAULT now(),
    cancelada_em  timestamptz,

    CONSTRAINT inscricoes_status_valido CHECK (status IN ('ativa', 'cancelada')),
    -- cancelada_em preenchido se e somente se status = 'cancelada'
    CONSTRAINT inscricoes_cancelamento_consistente
        CHECK ((status = 'cancelada') = (cancelada_em IS NOT NULL)),
    -- presença só existe em inscrição ativa
    CONSTRAINT inscricoes_presenca_somente_ativa
        CHECK (NOT (presente AND status = 'cancelada'))
);

-- Um usuário só pode ter UMA inscrição ativa por atividade
-- (pode se inscrever de novo depois de cancelar).
CREATE UNIQUE INDEX inscricoes_ativa_unica
    ON inscricoes (usuario_id, atividade_id)
    WHERE status = 'ativa';

-- Listagem de inscritos por atividade (painel da coordenação).
CREATE INDEX inscricoes_por_atividade
    ON inscricoes (atividade_id)
    WHERE status = 'ativa';

CREATE TABLE tokens_verificacao_email (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id  uuid        NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
    token_hash  char(64)    NOT NULL,
    expira_em   timestamptz NOT NULL,
    usado_em    timestamptz,
    criado_em   timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT tokens_hash_hex CHECK (token_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT tokens_hash_unico UNIQUE (token_hash)
);

CREATE INDEX tokens_por_usuario ON tokens_verificacao_email (usuario_id);
