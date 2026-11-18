import { db } from '../db/schema.js';

// Cor de acento da interface. A fonte da verdade é a tabela config (vai no backup);
// o localStorage só guarda uma cópia pra aplicar a cor antes do banco abrir e evitar
// que a página pisque em ciano ao carregar.
export const ACENTOS = [
  { id: 'ciano', nome: 'Ciano', cor: '#22e6ff' },
  { id: 'roxo', nome: 'Roxo', cor: '#a855ff' },
  { id: 'vermelho', nome: 'Vermelho', cor: '#ff3b5c' },
];

const CHAVE = 'corAcento';
const valido = (id) => ACENTOS.some((a) => a.id === id);

export function aplicar(id) {
  if (!valido(id)) return;
  document.documentElement.dataset.acento = id;
  try {
    localStorage.setItem(CHAVE, id);
  } catch {
    // sem localStorage: segue só com o banco
  }
  for (const botao of document.querySelectorAll('.acento-opcao')) {
    botao.setAttribute('aria-pressed', String(botao.dataset.acento === id));
  }
}

async function escolher(id) {
  aplicar(id);
  await db.config.put({ chave: CHAVE, valor: id, atualizadoEm: new Date().toISOString() });
}

export function montarSeletorAcento(container) {
  container.innerHTML = ACENTOS.map(
    (a) => `<button type="button" class="acento-opcao" data-acento="${a.id}"
      style="--cor: ${a.cor}" title="${a.nome}" aria-label="Cor de destaque: ${a.nome}"
      aria-pressed="false"></button>`,
  ).join('');
  container.addEventListener('click', (e) => {
    const botao = e.target.closest('.acento-opcao');
    if (botao) escolher(botao.dataset.acento);
  });

  // 1) cópia local (instantânea)  2) banco (fonte da verdade)
  let inicial = 'ciano';
  try {
    const local = localStorage.getItem(CHAVE);
    if (valido(local)) inicial = local;
  } catch {
    // ignora
  }
  aplicar(inicial);
  db.config.get(CHAVE).then((reg) => {
    if (reg && valido(reg.valor) && reg.valor !== inicial) aplicar(reg.valor);
  });
}
