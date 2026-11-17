import { carregarCatalogo, textoResultado, NOME_RESULTADO } from './catalogo.js';
import { segundosParaDuracao } from '../util/duracao.js';
import { APP, hojeISO } from './backup.js';

// Exportação pra Excel (SheetJS, carregado sob demanda): aba "Lutas" com uma linha
// por luta e aba "Visualizações" com todo o histórico. Só registros ativos.

const FORMATO_DATA = 'dd/mm/yyyy';
const FORMATO_NOTA = '0.00';

// Data ISO (YYYY-MM-DD) -> número de série do Excel, sem passar por fuso horário.
function serialExcel(iso) {
  if (!iso) return null;
  const [a, m, d] = iso.split('-').map(Number);
  return Date.UTC(a, m - 1, d) / 86400000 + 25569;
}

const data = (iso) => (iso ? { t: 'n', v: serialExcel(iso), z: FORMATO_DATA } : null);
const nota = (n) => (n == null ? null : { t: 'n', v: n, z: FORMATO_NOTA });

export function linhasLutas(itens, ctx) {
  const cab = ['Evento', 'Data do evento', 'Empresa', 'Parceiras', 'Tipo', 'Estipulações', 'Confronto', 'Resultado', 'Vencedor',
    'Método', 'Título', 'Duração', 'Nota', '1ª visualização', 'Visualizações', 'Link', 'Observações'];
  const ordenados = [...itens].sort((a, b) =>
    (a.evento?.data ?? '').localeCompare(b.evento?.data ?? '') || (a.luta.criadoEm ?? '').localeCompare(b.luta.criadoEm ?? ''));
  const linhas = ordenados.map((i) => {
    const l = i.luta;
    return [
      i.evento?.nome ?? '',
      data(i.evento?.data),
      i.empresa?.nome ?? '',
      (i.evento?.parceirasIds ?? []).map((id) => ctx.empresas.get(id)?.nome).filter(Boolean).join(', '),
      i.tipo?.nome ?? '',
      i.estipulacoes.map((e) => e.nome).join(', '),
      i.confronto,
      NOME_RESULTADO[l.resultado] ?? '',
      l.resultado === 'vitoria' ? textoResultado(l, ctx) : '',
      ctx.metodos.get(l.metodoVitoriaId)?.nome ?? '',
      i.titulo?.nome ?? '',
      segundosParaDuracao(l.duracaoSeg),
      nota(i.nota),
      data(i.primeiraVisualizacao),
      i.visualizacoes.length,
      l.link ?? '',
      l.observacoes ?? '',
    ];
  });
  return [cab, ...linhas];
}

export function linhasVisualizacoes(itens, ctx) {
  const cab = ['Data', 'Nota', 'Plataforma', 'Evento', 'Data do evento', 'Empresa', 'Confronto'];
  const linhas = itens
    .flatMap((i) => i.visualizacoes.map((v) => ({ i, v })))
    .sort((a, b) => a.v.data.localeCompare(b.v.data))
    .map(({ i, v }) => [
      data(v.data), nota(v.nota), ctx.plataformas.get(v.plataformaId)?.nome ?? '',
      i.evento?.nome ?? '', data(i.evento?.data), i.empresa?.nome ?? '', i.confronto,
    ]);
  return [cab, ...linhas];
}

// Largura de cada coluna pelo maior conteúdo (com limite), pra abrir legível.
function larguras(linhas) {
  return linhas[0].map((_, c) => {
    const max = Math.max(...linhas.map((l) => {
      const v = l[c];
      if (v && typeof v === 'object') return v.z === FORMATO_DATA ? 10 : 5;
      return String(v ?? '').length;
    }));
    return { wch: Math.min(60, Math.max(8, max + 2)) };
  });
}

function aba(XLSX, linhas) {
  const ws = XLSX.utils.aoa_to_sheet(linhas.map((l) => l.map((v) => (v == null ? '' : v))));
  ws['!cols'] = larguras(linhas);
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: linhas.length - 1, c: linhas[0].length - 1 } }) };
  return ws;
}

export async function exportarExcel() {
  const [XLSX, { itens, ctx }] = await Promise.all([import('xlsx'), carregarCatalogo()]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, aba(XLSX, linhasLutas(itens, ctx)), 'Lutas');
  XLSX.utils.book_append_sheet(wb, aba(XLSX, linhasVisualizacoes(itens, ctx)), 'Visualizações');
  XLSX.writeFile(wb, `${APP}-${hojeISO()}.xlsx`, { compression: true });
  return { lutas: itens.length, visualizacoes: itens.reduce((s, i) => s + i.visualizacoes.length, 0) };
}
