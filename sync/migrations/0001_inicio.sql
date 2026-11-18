-- Conta única (um usuário): hash da chave secreta e a "geração" dos dados.
-- A geração muda quando um backup é restaurado com a sincronização ligada:
-- aparelhos com geração antiga apagam o que têm e baixam tudo de novo.
CREATE TABLE conta (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  chave_hash TEXT NOT NULL,
  geracao INTEGER NOT NULL DEFAULT 1,
  criada_em TEXT NOT NULL
);

-- Um registro de qualquer tabela do app (dados = JSON do registro, imagens em base64).
-- versao cresce a cada gravação aceita: é o cursor que cada aparelho usa pra baixar o que mudou.
CREATE TABLE registros (
  tabela TEXT NOT NULL,
  id TEXT NOT NULL,
  dados TEXT NOT NULL,
  atualizado_em TEXT NOT NULL,
  versao INTEGER NOT NULL,
  dispositivo TEXT,
  PRIMARY KEY (tabela, id)
);
CREATE INDEX registros_versao ON registros (versao);
