import { db } from './schema.js';
import { agora } from '../util/ids.js';
import { normalizar } from '../util/texto.js';

// Possíveis duplicados criados em aparelhos diferentes antes de sincronizar (docs/DECISOES.md › Fase 2).
// Só entram pares de origens diferentes (criadoNo): o que foi repetido de propósito no mesmo
// aparelho (ex.: dois wrestlers com o mesmo nome) não vira aviso.
// "Manter os dois" fica guardado em config.duplicadosIgnorados (sincroniza).

export const TABELAS_CADASTRO = ['empresas', 'eventos', 'wrestlers', 'equipes', 'tiposMatch', 'estipulacoes', 'titulos', 'plataformas', 'metodosVitoria'];
export const NOME_TABELA = {
  empresas: 'Empresa', eventos: 'Evento', wrestlers: 'Wrestler', equipes: 'Equipe', tiposMatch: 'Tipo de match',
  estipulacoes: 'Estipulação', titulos: 'Título', plataformas: 'Plataforma', metodosVitoria: 'Método de vitória', lutas: 'Luta',
};

const vivos = (tabela) => db.table(tabela).filter((r) => !r.excluidoEm).toArray();
const origem = (r) => r.criadoNo ?? 'antes-da-sincronizacao';
const chavePar = (tabela, a, b) => `${tabela}:${[a, b].sort().join('|')}`;
const assinaturaLados = (lados) => lados.map((l) => [...l.wrestlersIds].sort().join(',')).sort().join('|');

async function ignorados() {
  return new Set((await db.config.get('duplicadosIgnorados'))?.valor ?? []);
}

// Agrupa por "chave de igualdade" e devolve os pares de origens diferentes.
function pares(tabela, lista, chaveDe, ign) {
  const grupos = new Map();
  for (const r of lista) {
    const k = chaveDe(r);
    if (!k) continue;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(r);
  }
  const saida = [];
  for (const g of grupos.values()) {
    for (let i = 0; i < g.length; i++) {
      for (let j = i + 1; j < g.length; j++) {
        const [a, b] = [g[i], g[j]];
        if (origem(a) === origem(b) || ign.has(chavePar(tabela, a.id, b.id))) continue;
        saida.push({ tabela, a, b });
      }
    }
  }
  return saida;
}

export async function encontrarDuplicados() {
  const ign = await ignorados();
  const lista = [];
  for (const tabela of TABELAS_CADASTRO) {
    const regs = await vivos(tabela);
    const chave = tabela === 'eventos' ? (r) => `${normalizar(r.nome)}|${r.data ?? ''}` : (r) => normalizar(r.nome);
    lista.push(...pares(tabela, regs, chave, ign));
  }
  const lutas = await vivos('lutas');
  lista.push(...pares('lutas', lutas, (l) => `${l.eventoId}|${l.tipoMatchId}|${assinaturaLados(l.lados ?? [])}`, ign));
  return lista;
}

export async function contarDuplicados() {
  return (await encontrarDuplicados()).length;
}

export async function manterOsDois(tabela, idA, idB) {
  const atual = [...(await ignorados())];
  atual.push(chavePar(tabela, idA, idB));
  await db.config.put({ chave: 'duplicadosIgnorados', valor: [...new Set(atual)], atualizadoEm: agora() });
}

// ---------- Juntar: tudo que apontava pro que sai passa pro que fica ----------

const troca = (de, para) => (id) => (id === de ? para : id);
const trocaLista = (de, para) => (lista) => [...new Set((lista ?? []).map(troca(de, para)))];

// Cada regra: [tabela, função que altera o registro e diz se mudou]
function regras(tabela, de, para) {
  const t = troca(de, para);
  const tl = trocaLista(de, para);
  const lados = (r, f) => {
    let mudou = false;
    r.lados = (r.lados ?? []).map((l) => {
      const novo = f(l);
      if (JSON.stringify(novo) !== JSON.stringify(l)) mudou = true;
      return novo;
    });
    return mudou;
  };
  const campo = (r, nome) => (r[nome] === de ? ((r[nome] = para), true) : false);
  const lista = (r, nome) => ((r[nome] ?? []).includes(de) ? ((r[nome] = tl(r[nome])), true) : false);
  const cm = (r, nome) => (r.cagematch && r.cagematch[nome] === de ? ((r.cagematch = { ...r.cagematch, [nome]: para }), true) : false);
  return {
    empresas: [
      ['eventos', (r) => campo(r, 'empresaId') | lista(r, 'parceirasIds')],
      ['wrestlers', (r) => campo(r, 'empresaId')],
      ['titulos', (r) => campo(r, 'empresaId')],
    ],
    eventos: [['lutas', (r) => campo(r, 'eventoId')], ['backlog', (r) => campo(r, 'eventoId')]],
    wrestlers: [
      ['lutas', (r) => lados(r, (l) => ({ ...l, wrestlersIds: tl(l.wrestlersIds) })) | lista(r, 'wrestlersIds')],
      ['equipes', (r) => lista(r, 'membrosIds')],
      ['backlog', (r) => {
        const m = lados(r, (l) => ({ ...l, wrestlersIds: tl(l.wrestlersIds) }));
        const v = r.cagematch?.vencedorIds?.includes(de) ? ((r.cagematch = { ...r.cagematch, vencedorIds: tl(r.cagematch.vencedorIds) }), true) : false;
        return m | v;
      }],
    ],
    equipes: [
      ['lutas', (r) => lados(r, (l) => ({ ...l, equipeId: t(l.equipeId) }))],
      ['backlog', (r) => lados(r, (l) => ({ ...l, equipeId: t(l.equipeId) }))],
    ],
    tiposMatch: [['lutas', (r) => campo(r, 'tipoMatchId')], ['backlog', (r) => campo(r, 'tipoMatchId')]],
    estipulacoes: [['lutas', (r) => lista(r, 'estipulacoesIds')], ['backlog', (r) => lista(r, 'estipulacoesIds')]],
    titulos: [['lutas', (r) => campo(r, 'tituloId')], ['backlog', (r) => cm(r, 'tituloId')]],
    plataformas: [['visualizacoes', (r) => campo(r, 'plataformaId')]],
    metodosVitoria: [['lutas', (r) => campo(r, 'metodoVitoriaId')], ['backlog', (r) => cm(r, 'metodoVitoriaId')]],
    lutas: [['visualizacoes', (r) => campo(r, 'lutaId')], ['backlog', (r) => campo(r, 'lutaId')]],
  }[tabela];
}

export async function juntar(tabela, ficaId, saiId) {
  const ts = agora();
  const lista = regras(tabela, saiId, ficaId);
  const tabelas = [...new Set([tabela, ...lista.map(([t]) => t)])];
  await db.transaction('rw', tabelas.map((t) => db.table(t)), async () => {
    for (const [t, alterar] of lista) {
      await db.table(t).toCollection().modify((r) => {
        if (r.excluidoEm && t !== 'visualizacoes') return;
        if (alterar(r)) r.atualizadoEm = ts;
      });
    }
    // Wrestler: o número do Cagematch passa pro que fica, se ele não tiver.
    const fica = await db.table(tabela).get(ficaId);
    const sai = await db.table(tabela).get(saiId);
    if (fica && sai?.cagematchId && !fica.cagematchId) await db.table(tabela).update(ficaId, { cagematchId: sai.cagematchId, atualizadoEm: ts });
    await db.table(tabela).update(saiId, { excluidoEm: ts, atualizadoEm: ts });
  });
}
