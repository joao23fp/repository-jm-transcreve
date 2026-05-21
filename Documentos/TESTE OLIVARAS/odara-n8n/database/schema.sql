-- ============================================================
-- ODARA RIO — Schema do Banco de Dados
-- Integração Belle × Clint via n8n
-- ============================================================

-- ---------------------------------------------------------------
-- CLIENTES
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes (
    id              SERIAL PRIMARY KEY,
    belle_id        INTEGER UNIQUE,
    clint_id        VARCHAR(100),
    clint_contact_uuid VARCHAR(36),                          -- UUID do contato no Clint (adicionado 21/05/2026)
    nome            VARCHAR(255) NOT NULL,
    telefone        VARCHAR(30),
    celular         VARCHAR(30),
    cpf             VARCHAR(20),
    email           VARCHAR(255),
    dt_nascimento   DATE,
    sexo            VARCHAR(20),
    temperatura     VARCHAR(20),    -- Quente / Morno / Frio
    rating          SMALLINT,
    pontos          INTEGER,
    uf              VARCHAR(2),
    cidade          VARCHAR(100),
    tipo_origem     VARCHAR(100),
    origem          VARCHAR(255),
    observacao      TEXT,
    ativo           BOOLEAN DEFAULT TRUE,
    criado_em       TIMESTAMP DEFAULT NOW(),
    atualizado_em   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clientes_belle_id  ON clientes(belle_id);
CREATE INDEX IF NOT EXISTS idx_clientes_telefone  ON clientes(telefone);
CREATE INDEX IF NOT EXISTS idx_clientes_cpf       ON clientes(cpf);
CREATE INDEX IF NOT EXISTS idx_clientes_clint_id  ON clientes(clint_id);

-- ---------------------------------------------------------------
-- AGENDAMENTOS
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agendamentos (
    id                          SERIAL PRIMARY KEY,
    belle_id                    INTEGER UNIQUE,           -- codConsulta da Belle
    clint_card_id               VARCHAR(100),
    cliente_id                  INTEGER REFERENCES clientes(id),
    belle_cliente_cod           VARCHAR(20),
    nome_cliente                VARCHAR(255),
    celular_cliente             VARCHAR(30),
    nome_profissional           VARCHAR(255),
    cod_profissional            VARCHAR(20),
    nome_sala                   VARCHAR(100),
    servicos                    JSONB,                    -- array [{cod, nome}]
    dt_agenda                   DATE,
    hr_consulta                 VARCHAR(10),
    data_hora                   TIMESTAMP,                -- dt_agenda + hr_consulta combinados
    status                      VARCHAR(50),              -- Marcado / Atendido / Cancelado
    tipo                        VARCHAR(50),
    observacao                  TEXT,

    -- Controle de notificações
    confirmacao_enviada         BOOLEAN DEFAULT FALSE,
    confirmacao_enviada_em      TIMESTAMP,
    confirmacao_resposta        VARCHAR(20),              -- confirmado / cancelado / sem_resposta
    confirmacao_respondida_em   TIMESTAMP,
    lembrete_dia_enviado        BOOLEAN DEFAULT FALSE,
    lembrete_dia_enviado_em     TIMESTAMP,
    pos_atendimento_enviado     BOOLEAN DEFAULT FALSE,
    pos_atendimento_enviado_em  TIMESTAMP,
    followup_24h_enviado        BOOLEAN DEFAULT FALSE,
    followup_24h_enviado_em     TIMESTAMP,
    tarefa_sem_resposta_criada  BOOLEAN DEFAULT FALSE,

    sinc_em                     TIMESTAMP DEFAULT NOW(),
    criado_em                   TIMESTAMP DEFAULT NOW(),
    atualizado_em               TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agendamentos_belle_id   ON agendamentos(belle_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente_id ON agendamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_data_hora  ON agendamentos(data_hora);
CREATE INDEX IF NOT EXISTS idx_agendamentos_status     ON agendamentos(status);

-- ---------------------------------------------------------------
-- VENDAS / PROTOCOLOS
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vendas (
    id                          SERIAL PRIMARY KEY,
    belle_id                    INTEGER UNIQUE,           -- codOrcamento / idVenda
    clint_card_id               VARCHAR(100),
    clint_deal_uuid             VARCHAR(36),              -- UUID do deal no Clint (adicionado 21/05/2026)
    clint_fields_synced         BOOLEAN DEFAULT FALSE,    -- dados do protocolo já enviados ao Clint
    cliente_id                  INTEGER REFERENCES clientes(id),
    belle_cliente_cod           INTEGER,
    nome_protocolo              VARCHAR(255),
    tipo_plano                  VARCHAR(100),
    servicos                    JSONB,                    -- array de serviços com sessões
    valor_bruto                 NUMERIC(10,2),
    valor_final                 NUMERIC(10,2),
    forma_pagamento             VARCHAR(100),
    sessoes_total               INTEGER,
    sessoes_realizadas          INTEGER DEFAULT 0,
    data_venda                  DATE,
    data_inicio                 DATE,
    data_fim_prevista           DATE,
    vendedor                    VARCHAR(100),
    status_plano                VARCHAR(50),              -- Aprovado / Rescindido / etc.

    -- Controle de automações
    renovacao_oferta_enviada    BOOLEAN DEFAULT FALSE,
    renovacao_enviada_em        TIMESTAMP,
    upsell_enviado              BOOLEAN DEFAULT FALSE,
    upsell_enviado_em           TIMESTAMP,
    nps_enviado                 BOOLEAN DEFAULT FALSE,
    nps_enviado_em              TIMESTAMP,
    migrado_pos_venda           BOOLEAN DEFAULT FALSE,
    migrado_pos_venda_em        TIMESTAMP,

    criado_em                   TIMESTAMP DEFAULT NOW(),
    atualizado_em               TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendas_belle_id        ON vendas(belle_id);
CREATE INDEX IF NOT EXISTS idx_vendas_cliente_id      ON vendas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_vendas_status          ON vendas(status_plano);
CREATE INDEX IF NOT EXISTS idx_vendas_clint_deal_uuid ON vendas(clint_deal_uuid);

-- ---------------------------------------------------------------
-- SESSÕES REALIZADAS
-- Populada pelo workflow 00d (a cada 30min) com base em agendamentos
-- com status 'Atendido' cruzados com protocolos ativos da paciente
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessoes (
    id                  SERIAL PRIMARY KEY,
    venda_id            INTEGER REFERENCES vendas(id),
    agendamento_id      INTEGER REFERENCES agendamentos(id),
    cliente_id          INTEGER REFERENCES clientes(id),
    belle_cliente_cod   VARCHAR(20),
    servico_cod         VARCHAR(20),
    servico_nome        VARCHAR(200),
    numero_sessao       INTEGER,                          -- 1ª, 2ª, 3ª sessão do protocolo
    data_realizada      DATE,
    profissional        VARCHAR(100),
    criado_em           TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessoes_venda_id    ON sessoes(venda_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_cliente_id  ON sessoes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_data        ON sessoes(data_realizada);

-- ---------------------------------------------------------------
-- TABELA DE MAPEAMENTO: labels Clint → códigos de serviço Belle
-- Populada pelo workflow MAP-C (execução única)
-- belle_cod e belle_nome preenchidos manualmente após execução
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS servicos_mapeamento (
    id              SERIAL PRIMARY KEY,
    belle_cod       VARCHAR(20),
    belle_nome      VARCHAR(200),
    clint_label     VARCHAR(200) UNIQUE,
    auto_matched    BOOLEAN DEFAULT FALSE,
    ativo           BOOLEAN DEFAULT TRUE,
    criado_em       TIMESTAMP DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- LEADS
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
    id                          SERIAL PRIMARY KEY,
    clint_id                    VARCHAR(100) UNIQUE,
    belle_id                    INTEGER,
    nome                        VARCHAR(255),
    telefone                    VARCHAR(30),
    cpf                         VARCHAR(20),
    email                       VARCHAR(255),
    origem                      VARCHAR(100),             -- instagram / whatsapp / indicacao / trafego_pago
    utm_source                  VARCHAR(100),
    utm_medium                  VARCHAR(100),
    utm_campaign                VARCHAR(100),
    status                      VARCHAR(50) DEFAULT 'novo', -- novo / em_negociacao / convertido / perdido
    convertido_em               TIMESTAMP,

    -- Controle de nurturing
    nurturing_7d_enviado        BOOLEAN DEFAULT FALSE,
    nurturing_7d_enviado_em     TIMESTAMP,
    nurturing_30d_enviado       BOOLEAN DEFAULT FALSE,
    nurturing_30d_enviado_em    TIMESTAMP,
    nurturing_60d_enviado       BOOLEAN DEFAULT FALSE,
    nurturing_60d_enviado_em    TIMESTAMP,

    criado_em                   TIMESTAMP DEFAULT NOW(),
    atualizado_em               TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_clint_id  ON leads(clint_id);
CREATE INDEX IF NOT EXISTS idx_leads_telefone  ON leads(telefone);
CREATE INDEX IF NOT EXISTS idx_leads_status    ON leads(status);

-- ---------------------------------------------------------------
-- LOG DE MENSAGENS
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mensagens_log (
    id                  SERIAL PRIMARY KEY,
    cliente_id          INTEGER REFERENCES clientes(id),
    lead_id             INTEGER REFERENCES leads(id),
    agendamento_id      INTEGER REFERENCES agendamentos(id),
    venda_id            INTEGER REFERENCES vendas(id),
    tipo                VARCHAR(100),   -- confirmacao_24h / lembrete_dia / pos_atendimento /
                                        -- followup_24h / nps / renovacao / upsell /
                                        -- aniversario / nurturing_7d / nurturing_30d / nurturing_60d
    canal               VARCHAR(50) DEFAULT 'whatsapp',
    mensagem            TEXT,
    status_envio        VARCHAR(50) DEFAULT 'enviado',
    resposta            TEXT,
    respondida_em       TIMESTAMP,
    enviada_em          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mensagens_cliente_id    ON mensagens_log(cliente_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_agendamento_id ON mensagens_log(agendamento_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_tipo          ON mensagens_log(tipo);

-- ---------------------------------------------------------------
-- TAREFAS
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tarefas (
    id              SERIAL PRIMARY KEY,
    cliente_id      INTEGER REFERENCES clientes(id),
    agendamento_id  INTEGER REFERENCES agendamentos(id),
    venda_id        INTEGER REFERENCES vendas(id),
    tipo            VARCHAR(100),   -- reagendamento / confirmacao_manual / renovacao /
                                    -- upsell / reativacao / sem_engajamento
    descricao       TEXT,
    responsavel     VARCHAR(100),   -- vendedora / especialista
    prioridade      VARCHAR(20) DEFAULT 'normal',
    status          VARCHAR(50) DEFAULT 'pendente',
    criada_em       TIMESTAMP DEFAULT NOW(),
    concluida_em    TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tarefas_cliente_id ON tarefas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_status     ON tarefas(status);

-- ---------------------------------------------------------------
-- FUNÇÃO: Atualiza updated_at automaticamente
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clientes_ts      BEFORE UPDATE ON clientes      FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();
CREATE TRIGGER trg_agendamentos_ts  BEFORE UPDATE ON agendamentos  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();
CREATE TRIGGER trg_vendas_ts        BEFORE UPDATE ON vendas        FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();
CREATE TRIGGER trg_leads_ts         BEFORE UPDATE ON leads         FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();
