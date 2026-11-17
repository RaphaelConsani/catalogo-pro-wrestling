// Navegação por hash (#/biblioteca, #/wrestler/<id>): funciona no GitHub Pages
// e no app instalado sem configuração extra.

const rotas = [];

export function definirRota(padrao, renderizar) {
  // "/wrestler/:id" -> regex com grupos nomeados; "*" = qualquer caminho (página não encontrada)
  const regex = padrao === '*'
    ? /^.*$/
    : new RegExp('^' + padrao.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '/?$');
  rotas.push({ padrao, regex, renderizar });
}

export function caminhoAtual() {
  return location.hash.replace(/^#/, '') || '/';
}

export function iniciarRouter(container, aoNavegar) {
  const navegar = () => {
    const caminho = caminhoAtual();
    const rota = rotas.find((r) => r.regex.test(caminho)) ?? rotas.find((r) => r.padrao === '*');
    const params = rota.regex.exec(caminho)?.groups ?? {};
    // Contêiner novo a cada navegação: se uma tela assíncrona terminar depois
    // que o usuário já saiu dela, ela escreve num elemento desconectado.
    const tela = document.createElement('div');
    tela.className = 'tela';
    container.replaceChildren(tela);
    Promise.resolve(rota.renderizar(tela, params)).catch((erro) => console.error('Erro ao abrir a tela:', erro));
    window.scrollTo(0, 0);
    aoNavegar?.(caminho);
  };
  window.addEventListener('hashchange', navegar);
  navegar();
}
