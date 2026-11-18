// Endereço que não existe (ex.: link antigo ou digitado errado).
export function telaNaoEncontrada(container) {
  container.innerHTML = `
    <section class="tela-cabecalho">
      <span class="tela-rotulo">Erro</span>
      <h1 class="tela-titulo">Página não encontrada</h1>
    </section>
    <div class="vazio"><div>
      <div class="vazio-icone" aria-hidden="true">?</div>
      <strong>Esse endereço não existe</strong>
      <span><a href="#/">Voltar pro Início</a></span>
    </div></div>`;
}
