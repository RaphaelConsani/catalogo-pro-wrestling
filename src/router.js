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

let redesenhar = null;
// Desenha de novo a tela atual (ex.: chegaram dados de outro aparelho).
export const redesenharTela = () => redesenhar?.();

export function iniciarRouter(container, aoNavegar) {
  const navegar = (manterRolagem = false) => {
    const caminho = caminhoAtual();
    const rota = rotas.find((r) => r.regex.test(caminho)) ?? rotas.find((r) => r.padrao === '*');
    const params = rota.regex.exec(caminho)?.groups ?? {};
    // Contêiner novo a cada navegação: se uma tela assíncrona terminar depois
    // que o usuário já saiu dela, ela escreve num elemento desconectado.
    const tela = document.createElement('div');
    tela.className = 'tela';
    // Redesenho: segura a altura enquanto a tela monta, pra rolagem não pular pro topo.
    const y = window.scrollY;
    if (manterRolagem === true) container.style.minHeight = `${container.offsetHeight}px`;
    container.replaceChildren(tela);
    Promise.resolve(rota.renderizar(tela, params))
      .then(() => {
        if (manterRolagem !== true) return;
        window.scrollTo(0, y);
        container.style.minHeight = '';
      })
      .catch((erro) => console.error('Erro ao abrir a tela:', erro));
    if (manterRolagem !== true) window.scrollTo(0, 0);
    aoNavegar?.(caminho);
  };
  redesenhar = () => navegar(true);
  window.addEventListener('hashchange', () => navegar());
  navegar();
}
