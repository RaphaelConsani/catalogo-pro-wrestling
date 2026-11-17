import { esc } from '../util/texto.js';

// Alternância "cards" | "lista" de uma tela. Cada tela lembra a sua escolha (por aparelho).
// localStorage pode falhar (modo privado etc.): aí vale o padrão, sem quebrar a tela.
const CHAVE = (tela) => `visao:${tela}`;

export function lerVisao(tela) {
  try {
    return localStorage.getItem(CHAVE(tela)) === 'lista' ? 'lista' : 'cards';
  } catch {
    return 'cards';
  }
}

export function gravarVisao(tela, visao) {
  try {
    localStorage.setItem(CHAVE(tela), visao);
  } catch {
    /* sem armazenamento: a escolha vale só até sair da tela */
  }
}

export function htmlAlternarVisao(visao) {
  const botao = (v, icone, rotulo) =>
    `<button type="button" class="alternar-visao-opcao${visao === v ? ' ativo' : ''}" data-visao="${v}"
      aria-pressed="${visao === v}" aria-label="${esc(rotulo)}" title="${esc(rotulo)}">${icone}</button>`;
  return `<div class="alternar-visao" role="group" aria-label="Forma de exibição">
    ${botao('cards', '<span class="icone-cards" aria-hidden="true"></span>', 'Ver em cards')}
    ${botao('lista', '<span class="icone-lista" aria-hidden="true"></span>', 'Ver em lista')}
  </div>`;
}

// Liga o clique dos botões; aoMudar(visao) redesenha a tela.
export function ligarAlternarVisao(el, tela, aoMudar) {
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-visao]');
    if (!b) return;
    const visao = b.dataset.visao;
    gravarVisao(tela, visao);
    for (const x of el.querySelectorAll('[data-visao]')) {
      x.classList.toggle('ativo', x === b);
      x.setAttribute('aria-pressed', String(x === b));
    }
    aoMudar(visao);
  });
}

// Cabeçalho ordenável: cada coluna tem [ordem padrão, ordem invertida].
// Clicar ordena pela coluna; clicar de novo inverte.
export function htmlCabecalho(colunas, ordemAtual) {
  return `<thead><tr>${colunas.map((c) => {
    if (!c.ordem) return `<th class="${c.classe ?? ''}" scope="col">${c.rotulo ? esc(c.rotulo) : '<span class="sr-only">Ações</span>'}</th>`;
    const i = c.ordem.indexOf(ordemAtual);
    const seta = i === 0 ? c.seta?.[0] ?? '▼' : i === 1 ? c.seta?.[1] ?? '▲' : '';
    const sort = i < 0 ? 'none' : (c.seta?.[i] ?? (i === 0 ? '▼' : '▲')) === '▲' ? 'ascending' : 'descending';
    return `<th class="${c.classe ?? ''}" scope="col" aria-sort="${sort}">
      <button type="button" class="ordenar-coluna${i >= 0 ? ' ativo' : ''}" data-ordem="${i === 0 ? c.ordem[1] : c.ordem[0]}">
        ${esc(c.rotulo)}<span class="seta" aria-hidden="true">${seta}</span>
      </button></th>`;
  }).join('')}</tr></thead>`;
}
