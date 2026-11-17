// Tela provisória usada até cada etapa implementar a tela de verdade.
export function telaProvisoria({ rotulo, titulo, descricao, icone, etapa }) {
  return (container) => {
    container.innerHTML = `
      <section class="tela-cabecalho">
        <span class="tela-rotulo">${rotulo}</span>
        <h1 class="tela-titulo">${titulo}</h1>
        <p class="tela-descricao">${descricao}</p>
      </section>
      <div class="vazio">
        <div>
          <div class="vazio-icone" aria-hidden="true">${icone}</div>
          <strong>Em construção</strong>
          <span>${etapa}</span>
        </div>
      </div>
    `;
  };
}
