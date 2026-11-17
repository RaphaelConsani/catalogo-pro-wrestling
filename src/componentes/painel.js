// Painel lateral que desliza da direita, por cima da tela atual.
let atual = null;

export function fecharPainel() {
  if (!atual) return;
  const { raiz, aoTeclar } = atual;
  atual = null;
  document.removeEventListener('keydown', aoTeclar);
  raiz.classList.remove('aberto');
  setTimeout(() => raiz.remove(), 220);
}

// largo: painel mais largo, pra formulários com lados lado a lado.
export function abrirPainel({ titulo, subtitulo = '', conteudo, rodape, largo = false }) {
  fecharPainel();
  const raiz = document.createElement('div');
  raiz.className = 'painel-raiz';
  raiz.innerHTML = `
    <div class="painel-fundo" data-fechar></div>
    <aside class="painel${largo ? ' painel-largo' : ''}" role="dialog" aria-modal="true" aria-labelledby="painel-titulo">
      <header class="painel-topo">
        <div>
          ${subtitulo ? `<span class="painel-subtitulo"></span>` : ''}
          <h2 id="painel-titulo"></h2>
        </div>
        <button type="button" class="botao-icone" data-fechar aria-label="Fechar">✕</button>
      </header>
      <div class="painel-corpo"></div>
      <footer class="painel-rodape"></footer>
    </aside>`;
  raiz.querySelector('h2').textContent = titulo;
  if (subtitulo) raiz.querySelector('.painel-subtitulo').textContent = subtitulo;
  raiz.querySelector('.painel-corpo').append(conteudo);
  if (rodape) raiz.querySelector('.painel-rodape').append(rodape);
  else raiz.querySelector('.painel-rodape').remove();

  raiz.addEventListener('click', (e) => {
    if (e.target.closest('[data-fechar]')) fecharPainel();
  });
  const aoTeclar = (e) => {
    if (e.key === 'Escape' && !document.querySelector('dialog[open]')) fecharPainel();
  };
  document.addEventListener('keydown', aoTeclar);
  document.body.append(raiz);
  atual = { raiz, aoTeclar };
  requestAnimationFrame(() => {
    raiz.classList.add('aberto');
    raiz.querySelector('input, select, textarea')?.focus();
  });
  return raiz;
}

window.addEventListener('hashchange', fecharPainel);
