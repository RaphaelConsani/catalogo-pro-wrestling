import { formatarNota, classeFaixa, NOTA_MAX, PASSO } from '../util/nota.js';

// Estrelas com preenchimento parcial (quartos). Serve pra exibição em qualquer tela.
export function htmlEstrelas(n, classe = '') {
  const estrelas = [];
  for (let i = 0; i < NOTA_MAX; i++) {
    const preenchido = Math.max(0, Math.min(1, (n ?? 0) - i)) * 100;
    estrelas.push(`<span class="estrela" style="--preenchido:${preenchido}%" aria-hidden="true">★</span>`);
  }
  return `<span class="estrelas ${classe}">${estrelas.join('')}</span>`;
}

// Campo "Nota": clica na estrela pra nota cheia, −¼/+¼ pro ajuste fino.
export function criarCampoNota({ valor = null, aoMudar } = {}) {
  let nota = valor;
  const el = document.createElement('div');
  el.className = 'nota-campo';

  function render() {
    const estrelas = Array.from({ length: NOTA_MAX }, (_, i) => {
      const preenchido = Math.max(0, Math.min(1, (nota ?? 0) - i)) * 100;
      return `<button type="button" class="estrela" data-valor="${i + 1}" style="--preenchido:${preenchido}%"
        aria-label="${i + 1} estrela${i ? 's' : ''}">★</button>`;
    }).join('');
    el.className = `nota-campo${classeFaixa(nota)}`;
    el.innerHTML = `
      <span class="estrelas estrelas-campo">${estrelas}</span>
      <span class="nota-ajuste">
        <button type="button" class="botao-icone nota-menos" aria-label="Diminuir ¼" ${nota == null || nota <= 0 ? 'disabled' : ''}>−¼</button>
        <button type="button" class="botao-icone nota-mais" aria-label="Aumentar ¼" ${nota != null && nota >= NOTA_MAX ? 'disabled' : ''}>+¼</button>
      </span>
      <span class="nota-texto${nota == null ? ' vazia' : ''}">
        ${nota == null ? 'Sem nota' : `<strong>${formatarNota(nota)}</strong>`}
      </span>`;
  }

  function definir(n, avisar = true) {
    nota = n == null ? null : Math.min(NOTA_MAX, Math.max(0, Math.round(n / PASSO) * PASSO));
    render();
    if (avisar) aoMudar?.(nota);
  }

  el.addEventListener('click', (e) => {
    const estrela = e.target.closest('.estrela');
    if (estrela) return definir(Number(estrela.dataset.valor));
    if (e.target.closest('.nota-menos')) return definir((nota ?? 0) - PASSO);
    if (e.target.closest('.nota-mais')) return definir((nota ?? 0) + PASSO);
  });

  render();
  return { el, valor: () => nota, definir: (n) => definir(n, false) };
}
