import { esc, formatarData } from '../util/texto.js';
import { formatarNota } from '../util/nota.js';
import { htmlCabecalho } from './visao.js';

// Visão em lista (tabela compacta) das lutas: Biblioteca, página do wrestler e destaques.
// "opcional" = coluna escondida no celular (lá ficam Nota, Confronto e Data).
export const COLUNAS_LUTAS = [
  { chave: 'nota', rotulo: 'Nota', ordem: ['nota_desc', 'nota_asc'], seta: ['▼', '▲'], classe: 'col-nota' },
  { chave: 'confronto', rotulo: 'Confronto', ordem: ['confronto_asc', 'confronto_desc'], seta: ['▲', '▼'], classe: 'col-confronto' },
  { chave: 'empresa', rotulo: 'Empresa', ordem: ['empresa_asc', 'empresa_desc'], seta: ['▲', '▼'], classe: 'col-empresa opcional' },
  { chave: 'evento', rotulo: 'Evento', ordem: ['eventonome_asc', 'eventonome_desc'], seta: ['▲', '▼'], classe: 'col-evento opcional' },
  { chave: 'data', rotulo: 'Data', ordem: ['evento_desc', 'evento_asc'], seta: ['▼', '▲'], classe: 'col-data' },
  { chave: 'tipo', rotulo: 'Tipo', ordem: ['tipo_asc', 'tipo_desc'], seta: ['▲', '▼'], classe: 'col-tipo opcional' },
  { chave: 'assistida', rotulo: 'Assistida em', ordem: ['recente', 'antiga'], seta: ['▼', '▲'], classe: 'col-assistida opcional' },
];

export function htmlLinhaLuta(item) {
  const { luta, evento, empresa, nota } = item;
  const alta = nota != null && nota >= 4.5;
  const cinco = nota === 5;
  return `<tr class="linha-luta${alta ? ' nota-alta' : ''}${cinco ? ' cinco-estrelas' : ''}" data-luta="${luta.id}" tabindex="0"
      style="--cor-empresa:${esc(empresa?.cor ?? '#3a4152')}">
    <td class="col-nota">${nota == null ? '—' : esc(formatarNota(nota))}</td>
    <td class="col-confronto">${esc(item.confronto)}</td>
    <td class="col-empresa opcional"><span class="sigla-empresa">${esc(empresa?.sigla || empresa?.nome || '—')}</span></td>
    <td class="col-evento opcional">${esc(evento?.nome ?? '—')}</td>
    <td class="col-data">${evento?.data ? formatarData(evento.data) : '—'}</td>
    <td class="col-tipo opcional">${esc(item.tipo?.nome ?? '—')}</td>
    <td class="col-assistida opcional">${item.ultimaVisualizacao ? formatarData(item.ultimaVisualizacao) : '—'}</td>
  </tr>`;
}

// itens já ordenados; mais linhas podem ser acrescentadas depois no <tbody> (rolagem infinita).
export const htmlTabelaLutas = (itens, ordemAtual) =>
  `<table class="tabela-lutas">${htmlCabecalho(COLUNAS_LUTAS, ordemAtual)}<tbody>${itens.map(htmlLinhaLuta).join('')}</tbody></table>`;

// Enter numa linha abre o detalhe, como o clique (a linha recebe foco pelo Tab).
export function ligarTecladoLinhas(el) {
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('tr[data-luta]')) e.target.click();
  });
}
