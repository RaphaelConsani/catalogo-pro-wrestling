import { db } from './schema.js';
import { salvar, excluir } from './repo.js';
import { agora } from '../util/ids.js';

// Itens do backlog: tipo 'luta' (evento, tipo, estipulações, lados) ou 'evento' (evento inteiro).
// Concluído = luta registrada pelo "assisti" ou evento marcado como concluído:
// some da lista, mas fica no banco com concluidoEm.

export const backlogPendente = () => db.backlog.filter((r) => !r.excluidoEm && !r.concluidoEm).toArray();

export const carregarItem = async (id) => {
  const item = await db.backlog.get(id);
  return item && !item.excluidoEm ? item : null;
};

export const salvarItemLuta = (dados) => salvar('backlog', { estipulacoesIds: [], ...dados, tipo: 'luta' });

export const salvarItemEvento = (eventoId) => salvar('backlog', { tipo: 'evento', eventoId });

// Evento inteiro já pendente no backlog (pra não duplicar).
export const eventoNoBacklog = async (eventoId) =>
  (await backlogPendente()).some((r) => r.tipo === 'evento' && r.eventoId === eventoId);

// lutaId: a luta registrada a partir do item (só no "assisti" de item de luta).
export async function concluirItem(id, lutaId = null) {
  const ts = agora();
  await db.backlog.update(id, { concluidoEm: ts, atualizadoEm: ts, ...(lutaId ? { lutaId } : {}) });
}

export const removerItem = (id) => excluir('backlog', id);
