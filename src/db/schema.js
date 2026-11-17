import Dexie from 'dexie';
import { metodosVitoriaIniciais, tiposMatchIniciais, estipulacoesIniciais } from './seed.js';

// Banco local (IndexedDB). Modelo aprovado na etapa 1 — ver docs/ESCOPO.md.
//
// Regras gerais de todos os registros:
// - id: UUID (crypto.randomUUID()), único globalmente (necessário pra fase 2)
// - criadoEm / atualizadoEm: ISO string
// - excluidoEm: ISO string quando excluído (exclusão lógica); ausente quando ativo
//
// Só os campos usados em buscas e filtros entram no índice; os demais
// campos existem nos registros normalmente. "*" = índice multiEntry (arrays).
export const db = new Dexie('catalogo-pro-wrestling');

db.version(1).stores({
  // nome, sigla, cor, imagemId?
  empresas: 'id, nome',
  // nome, data (YYYY-MM-DD; obrigatória na interface, pode faltar só em dados importados da planilha),
  // empresaId, parceirasIds[], imagemId?
  eventos: 'id, nome, data, empresaId, *parceirasIds',
  // nome, empresaId?, imagemId?
  wrestlers: 'id, nome, empresaId',
  // nome, membrosIds[], imagemId?
  equipes: 'id, nome, *membrosIds',
  // nome, numLados, wrestlersPorLado, variavel
  tiposMatch: 'id, nome',
  // nome
  estipulacoes: 'id, nome',
  // nome, empresaId
  titulos: 'id, nome, empresaId',
  // nome
  plataformas: 'id, nome',
  // nome
  metodosVitoria: 'id, nome',
  // eventoId, tipoMatchId, estipulacoesIds[], lados[{ equipeId?, wrestlersIds[] }],
  // resultado ('vitoria' | 'draw' | 'time_limit_draw' | 'no_contest'), ladoVencedor? (índice),
  // metodoVitoriaId?, tituloId?, duracaoSeg (digitada como mm:ss), link?, observacoes?,
  // wrestlersIds[] (cópia de todos os wrestlers dos lados, pra consultas)
  lutas: 'id, eventoId, tipoMatchId, *estipulacoesIds, tituloId, *wrestlersIds',
  // lutaId, data, nota (obrigatória, 0–5 em passos de 0,25), plataformaId
  visualizacoes: 'id, lutaId, data, plataformaId',
  // tipo ('luta' | 'evento'), eventoId, tipoMatchId?, estipulacoesIds[], lados[]
  // (sai do backlog quando a luta é registrada ou o evento é marcado como concluído)
  backlog: 'id, tipo, eventoId',
  // blob, mimeType
  imagens: 'id',
  // chave, valor (ex.: ultimoBackup)
  config: 'chave',
});

// Roda uma única vez, quando o banco é criado.
db.on('populate', (tx) => {
  const ts = new Date().toISOString();
  const carimbar = (lista) => lista.map((r) => ({ ...r, criadoEm: ts, atualizadoEm: ts }));
  tx.table('metodosVitoria').bulkAdd(carimbar(metodosVitoriaIniciais));
  tx.table('tiposMatch').bulkAdd(carimbar(tiposMatchIniciais));
  tx.table('estipulacoes').bulkAdd(carimbar(estipulacoesIniciais));
});
