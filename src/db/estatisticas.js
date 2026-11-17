// Cálculos dos dashboards, sobre as lutas enriquecidas de carregarCatalogo().
// Regras (docs/ESCOPO.md):
//   - médias e rankings usam a nota mais recente de cada luta (item.nota)
//   - contagens e calendário usam a primeira visualização (item.primeiraVisualizacao)
// Filtros (docs/DECISOES.md, etapa 6): ano da 1ª visualização e empresa principal do evento.

export const anoAssistido = (item) => (item.primeiraVisualizacao ? Number(item.primeiraVisualizacao.slice(0, 4)) : null);

export function filtrar(itens, { ano = '', empresa = '' } = {}) {
  return itens.filter((i) => {
    if (!i.primeiraVisualizacao) return false;
    if (ano && anoAssistido(i) !== Number(ano)) return false;
    if (empresa && i.evento?.empresaId !== empresa) return false;
    return true;
  });
}

export const anosAssistidos = (itens) =>
  [...new Set(itens.map(anoAssistido).filter(Boolean))].sort((a, b) => b - a);

const media = (ns) => (ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : null);
export const notaMedia = (itens) => media(itens.map((i) => i.nota).filter((n) => n != null));

const intervalo = (min, max) => Array.from({ length: max - min + 1 }, (_, k) => min + k);

export function lutasPorAno(itens) {
  const anos = itens.map(anoAssistido).filter(Boolean);
  if (!anos.length) return [];
  return intervalo(Math.min(...anos), Math.max(...anos)).map((ano) => ({ ano, qtd: anos.filter((a) => a === ano).length }));
}

// Com ano: os 12 meses dele. Sem ano: todos os meses do primeiro ao último com luta.
export function lutasPorMes(itens, ano = '') {
  const meses = itens.map((i) => i.primeiraVisualizacao.slice(0, 7));
  const contagem = new Map();
  for (const m of meses) contagem.set(m, (contagem.get(m) ?? 0) + 1);
  let chaves;
  if (ano) {
    chaves = intervalo(1, 12).map((m) => `${ano}-${String(m).padStart(2, '0')}`);
  } else {
    if (!meses.length) return [];
    const ordenados = [...contagem.keys()].sort();
    const [a0, m0] = ordenados[0].split('-').map(Number);
    const [a1, m1] = ordenados.at(-1).split('-').map(Number);
    chaves = intervalo(a0 * 12 + m0 - 1, a1 * 12 + m1 - 1).map((k) => `${Math.floor(k / 12)}-${String((k % 12) + 1).padStart(2, '0')}`);
  }
  return chaves.map((mes) => ({ mes, qtd: contagem.get(mes) ?? 0 }));
}

// Média da nota por grupo (empresa, tipo...). Lutas sem nota não entram na média, mas contam.
export function mediaPor(itens, chave) {
  const grupos = new Map();
  for (const i of itens) {
    const id = chave(i);
    if (!id) continue;
    if (!grupos.has(id)) grupos.set(id, []);
    grupos.get(id).push(i);
  }
  return [...grupos].map(([id, lista]) => ({ id, qtd: lista.length, media: notaMedia(lista) }))
    .filter((g) => g.media != null)
    .sort((a, b) => b.media - a.media || b.qtd - a.qtd);
}

export function rankingWrestlers(itens, minimo = 5) {
  const porWrestler = new Map();
  for (const i of itens) {
    for (const id of new Set(i.luta.wrestlersIds)) {
      if (!porWrestler.has(id)) porWrestler.set(id, []);
      porWrestler.get(id).push(i);
    }
  }
  return [...porWrestler].map(([id, lista]) => ({ id, qtd: lista.length, media: notaMedia(lista) }))
    .filter((w) => w.media != null && w.qtd >= minimo)
    .sort((a, b) => b.media - a.media || b.qtd - a.qtd);
}

// Quantidade de lutas em cada nota (0 a 5, passos de ¼).
export function distribuicaoNotas(itens) {
  const contagem = Array(21).fill(0);
  for (const i of itens) if (i.nota != null) contagem[Math.round(i.nota * 4)]++;
  return contagem.map((qtd, k) => ({ nota: k / 4, qtd }));
}

// Lutas de 4.50 pra cima: maior nota primeiro, depois a assistida por último.
export const destaques = (itens) =>
  itens.filter((i) => i.nota != null && i.nota >= 4.5)
    .sort((a, b) => b.nota - a.nota || (b.primeiraVisualizacao ?? '').localeCompare(a.primeiraVisualizacao ?? ''));

// Calendário: [['2026-03-14', 3], ...] só com os dias que tiveram luta no ano.
export function calendario(itens, ano) {
  const contagem = new Map();
  for (const i of itens) {
    if (anoAssistido(i) !== Number(ano)) continue;
    contagem.set(i.primeiraVisualizacao, (contagem.get(i.primeiraVisualizacao) ?? 0) + 1);
  }
  return [...contagem].sort(([a], [b]) => a.localeCompare(b));
}

const diaUTC = (iso) => {
  const [a, m, d] = iso.split('-').map(Number);
  return Date.UTC(a, m - 1, d) / 86400000;
};

export const FAIXAS_ATRASO = [
  { nome: 'Mesmo dia', ate: 0 },
  { nome: 'Até 1 semana', ate: 7 },
  { nome: 'Até 1 mês', ate: 31 },
  { nome: 'Até 1 ano', ate: 365 },
  { nome: 'Até 5 anos', ate: 1826 },
  { nome: 'Mais de 5 anos', ate: Infinity },
];

// Dias entre a data do evento e a 1ª visualização (assistir antes da data conta como mesmo dia).
export function atraso(itens) {
  const lista = itens
    .filter((i) => i.evento?.data && i.primeiraVisualizacao)
    .map((i) => ({ item: i, dias: Math.max(0, diaUTC(i.primeiraVisualizacao) - diaUTC(i.evento.data)) }));
  const faixas = FAIXAS_ATRASO.map((f) => ({ nome: f.nome, qtd: 0 }));
  for (const { dias } of lista) faixas[FAIXAS_ATRASO.findIndex((f) => dias <= f.ate)].qtd++;
  const dias = lista.map((l) => l.dias).sort((a, b) => a - b);
  const meio = Math.floor(dias.length / 2);
  const mediana = !dias.length ? null : dias.length % 2 ? dias[meio] : Math.round((dias[meio - 1] + dias[meio]) / 2);
  const maior = lista.reduce((m, l) => (!m || l.dias > m.dias ? l : m), null);
  return { faixas, mediana, maior, total: lista.length };
}

// 0 -> "mesmo dia" · 12 -> "12 dias" · 95 -> "3 meses" · 800 -> "2 anos e 2 meses"
export function formatarDias(dias) {
  if (dias === 0) return 'mesmo dia';
  if (dias < 31) return `${dias} ${dias === 1 ? 'dia' : 'dias'}`;
  const mesesTotal = Math.round(dias / 30.44);
  if (mesesTotal < 12) return `${mesesTotal} ${mesesTotal === 1 ? 'mês' : 'meses'}`;
  const anos = Math.floor(mesesTotal / 12);
  const meses = mesesTotal % 12;
  const txtAnos = `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
  return meses ? `${txtAnos} e ${meses} ${meses === 1 ? 'mês' : 'meses'}` : txtAnos;
}
