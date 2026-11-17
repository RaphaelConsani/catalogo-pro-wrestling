import { db } from './schema.js';
import { novoId, agora } from '../util/ids.js';

// Luta + visualizações são gravadas juntas, numa transação.
// luta: { id?, eventoId, tipoMatchId, estipulacoesIds, lados, resultado, ladoVencedor,
//         metodoVitoriaId, tituloId, duracaoSeg, link, observacoes }
// visualizacoes: [{ id?, data, nota, plataformaId }]
export async function salvarLuta(luta, visualizacoes) {
  const ts = agora();
  const wrestlersIds = [...new Set(luta.lados.flatMap((l) => l.wrestlersIds))];

  return db.transaction('rw', db.lutas, db.visualizacoes, async () => {
    let registro;
    if (luta.id) {
      const atual = await db.lutas.get(luta.id);
      registro = { ...atual, ...luta, wrestlersIds, atualizadoEm: ts };
      await db.lutas.put(registro);
    } else {
      registro = { ...luta, wrestlersIds, id: novoId(), criadoEm: ts, atualizadoEm: ts };
      await db.lutas.add(registro);
    }

    const existentes = (await db.visualizacoes.where('lutaId').equals(registro.id).toArray()).filter((v) => !v.excluidoEm);
    const mantidas = new Set(visualizacoes.filter((v) => v.id).map((v) => v.id));
    for (const v of existentes) {
      if (!mantidas.has(v.id)) await db.visualizacoes.update(v.id, { excluidoEm: ts, atualizadoEm: ts });
    }
    for (const v of visualizacoes) {
      const dados = { data: v.data, nota: v.nota, plataformaId: v.plataformaId ?? null };
      if (v.id) {
        const atual = existentes.find((e) => e.id === v.id);
        await db.visualizacoes.put({ ...atual, ...dados, atualizadoEm: ts });
      } else {
        await db.visualizacoes.add({ ...dados, id: novoId(), lutaId: registro.id, criadoEm: ts, atualizadoEm: ts });
      }
    }
    return registro;
  });
}

// Exclusão lógica da luta e das visualizações dela.
export async function excluirLuta(id) {
  const ts = agora();
  await db.transaction('rw', db.lutas, db.visualizacoes, async () => {
    await db.lutas.update(id, { excluidoEm: ts, atualizadoEm: ts });
    await db.visualizacoes
      .where('lutaId')
      .equals(id)
      .filter((v) => !v.excluidoEm)
      .modify({ excluidoEm: ts, atualizadoEm: ts });
  });
}

export const ordenarVisualizacoes = (vs) =>
  [...vs].sort((a, b) => a.data.localeCompare(b.data) || a.criadoEm.localeCompare(b.criadoEm));

export async function visualizacoesDa(lutaId) {
  const vs = await db.visualizacoes.where('lutaId').equals(lutaId).filter((v) => !v.excluidoEm).toArray();
  return ordenarVisualizacoes(vs);
}

export async function carregarLuta(id) {
  const luta = await db.lutas.get(id);
  if (!luta || luta.excluidoEm) return null;
  return { luta, visualizacoes: await visualizacoesDa(id) };
}

// Últimas lutas registradas (por data de cadastro), com as visualizações de cada uma.
export async function ultimasLutas(limite = 10) {
  const lutas = await db.lutas.orderBy('id').filter((l) => !l.excluidoEm).toArray();
  lutas.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  const escolhidas = lutas.slice(0, limite);
  return Promise.all(escolhidas.map(async (luta) => ({ luta, visualizacoes: await visualizacoesDa(luta.id) })));
}

// "The Young Bucks vs Kenny Omega & Kota Ibushi"
// ctx: { wrestlers: Map, equipes: Map }
export function nomeLado(lado, ctx) {
  const nomes = lado.wrestlersIds.map((id) => ctx.wrestlers.get(id)?.nome ?? '?');
  const equipe = lado.equipeId ? ctx.equipes.get(lado.equipeId) : null;
  if (equipe) return equipe.nome;
  if (nomes.length <= 2) return nomes.join(' & ');
  return `${nomes.slice(0, -1).join(', ')} & ${nomes.at(-1)}`;
}

export const confronto = (luta, ctx) => luta.lados.map((l) => nomeLado(l, ctx)).join(' vs ');
