import { ativos, contarAtivos, salvar, excluir, buscarDuplicado, salvarImagem, apagarImagem, urlsImagens } from '../../db/repo.js';
import { usosDe } from '../../db/usos.js';
import { abrirPainel, fecharPainel } from '../../componentes/painel.js';
import { confirmar, avisar } from '../../componentes/dialogo.js';
import { mostrarErro } from '../../componentes/campos.js';
import { toast } from '../../componentes/toast.js';
import { esc, normalizar, iniciais, plural } from '../../util/texto.js';
import { ENTIDADES } from './entidades.js';

// ---------- Painel de blocos (#/cadastros) ----------

export async function telaCadastros(container) {
  container.innerHTML = `
    <section class="tela-cabecalho">
      <span class="tela-rotulo">Configuração</span>
      <h1 class="tela-titulo">Cadastros</h1>
      <p class="tela-descricao">Tudo o que as lutas usam: empresas, eventos, wrestlers e as listas de apoio.</p>
    </section>
    <div class="blocos"></div>`;
  const chaves = Object.keys(ENTIDADES);
  const contagens = await Promise.all(chaves.map((k) => contarAtivos(ENTIDADES[k].tabela)));
  container.querySelector('.blocos').innerHTML = chaves
    .map((k, i) => {
      const d = ENTIDADES[k];
      return `<a class="bloco" href="#/cadastros/${k}">
        <span class="bloco-icone" aria-hidden="true">${d.icone}</span>
        <span class="bloco-numero">${contagens[i]}</span>
        <span class="bloco-nome">${esc(d.titulo)}</span>
      </a>`;
    })
    .join('');
}

// ---------- Lista de um cadastro (#/cadastros/:entidade) ----------

async function carregarContexto() {
  const [empresas, wrestlers] = await Promise.all([ativos('empresas'), ativos('wrestlers')]);
  return {
    empresas: new Map(empresas.map((e) => [e.id, e])),
    wrestlers: new Map(wrestlers.map((w) => [w.id, w])),
    url: () => null,
  };
}

function htmlCartao(def, reg, ctx) {
  const c = def.cartao(reg, ctx);
  const url = ctx.url(c.imagemId);
  const midia = url
    ? `<img src="${url}" alt="" loading="lazy" />`
    : `<span class="moldura-marcador">${esc(def.formato === 'logo' ? c.marcador : def.formato === 'poster' ? c.marcador : iniciais(c.marcador))}</span>`;
  return `<button type="button" class="cartao cartao-${def.formato}" data-id="${reg.id}" style="${c.cor ? `--cor-empresa:${esc(c.cor)}` : ''}">
    <span class="moldura moldura-${def.formato}${url ? '' : ' sem-imagem'}">${midia}</span>
    <span class="cartao-texto">
      <span class="cartao-titulo">${esc(c.titulo)}</span>
      ${c.subtitulo ? `<span class="cartao-subtitulo">${esc(c.subtitulo)}</span>` : ''}
      ${c.selo ? `<span class="selo">${esc(c.selo)}</span>` : ''}
    </span>
  </button>`;
}

function htmlLinha(def, reg, ctx) {
  const l = def.linha(reg, ctx);
  return `<button type="button" class="linha" data-id="${reg.id}" style="${l.cor ? `--cor-empresa:${esc(l.cor)}` : ''}">
    <span class="linha-titulo">${esc(l.titulo)}</span>
    ${l.selo ? `<span class="selo">${esc(l.selo)}</span>` : ''}
    ${l.meta ? `<span class="linha-meta">${esc(l.meta)}</span>` : ''}
    <span class="linha-seta" aria-hidden="true">›</span>
  </button>`;
}

export async function telaCadastro(container, { entidade }) {
  const def = ENTIDADES[entidade];
  if (!def) {
    location.hash = '#/cadastros';
    return;
  }

  container.innerHTML = `
    <section class="tela-cabecalho">
      <a class="voltar" href="#/cadastros">‹ Cadastros</a>
      <h1 class="tela-titulo">${esc(def.titulo)}</h1>
    </section>
    <div class="barra-ferramentas">
      <input type="search" class="campo-entrada busca" placeholder="Buscar ${esc(def.titulo.toLowerCase())}…" aria-label="Buscar" />
      <span class="contador"></span>
      <button type="button" class="botao botao-primario novo">＋ ${esc(def.novo)}</button>
    </div>
    <div class="lista lista-${def.visual}${def.formato ? ` lista-${def.formato}` : ''}"></div>`;

  const elLista = container.querySelector('.lista');
  const elBusca = container.querySelector('.busca');
  const elContador = container.querySelector('.contador');
  let registros = [];
  let ctx;

  async function recarregar() {
    ctx = await carregarContexto();
    registros = (await ativos(def.tabela)).sort((a, b) => def.ordenar(a, b, ctx));
    if (def.visual === 'cartoes') ctx.url = await urlsImagens([...registros.map((r) => r.imagemId), ...[...ctx.empresas.values()].map((e) => e.imagemId)]);
    else ctx.url = await urlsImagens([]);
    render();
  }

  function render() {
    const termo = normalizar(elBusca.value);
    const visiveis = termo ? registros.filter((r) => normalizar(def.busca(r, ctx)).includes(termo)) : registros;
    elContador.textContent = termo
      ? `${visiveis.length} de ${registros.length}`
      : plural(registros.length, def.singular, def.titulo.toLowerCase());
    if (!visiveis.length) {
      elLista.innerHTML = `<div class="vazio"><div>
        <div class="vazio-icone" aria-hidden="true">${def.icone}</div>
        <strong>${termo ? 'Nada encontrado' : `Nenhum${def.novo.startsWith('Nova') ? 'a' : ''} ${esc(def.singular)} cadastrad${def.novo.startsWith('Nova') ? 'a' : 'o'}`}</strong>
        <span>${termo ? 'Tente outro termo de busca.' : `Use o botão “${esc(def.novo)}”.`}</span>
      </div></div>`;
      return;
    }
    elLista.innerHTML = visiveis.map((r) => (def.visual === 'cartoes' ? htmlCartao(def, r, ctx) : htmlLinha(def, r, ctx))).join('');
  }

  elBusca.addEventListener('input', render);
  container.querySelector('.novo').addEventListener('click', () => abrirFormulario(def, null, ctx, recarregar));
  elLista.addEventListener('click', (e) => {
    const item = e.target.closest('[data-id]');
    if (!item) return;
    const reg = registros.find((r) => r.id === item.dataset.id);
    if (reg) abrirFormulario(def, reg, ctx, recarregar);
  });

  await recarregar();
}

// ---------- Formulário (painel lateral) ----------

async function abrirFormulario(def, reg, ctx, aoSalvar) {
  // Recarrega o contexto pra incluir itens criados na hora (ex.: wrestlers pelo seletor).
  const ctxForm = await carregarContexto();
  ctxForm.url = await urlsImagens([reg?.imagemId]);
  const campos = await def.campos(reg ?? {}, ctxForm);

  const form = document.createElement('form');
  form.className = 'formulario';
  form.noValidate = true;
  for (const c of Object.values(campos)) form.append(c.el);

  const rodape = document.createElement('div');
  rodape.className = 'formulario-acoes';
  rodape.innerHTML = `
    ${reg ? `<button type="button" class="botao botao-perigo-fantasma excluir">Excluir</button>` : ''}
    <span class="espaco"></span>
    <button type="button" class="botao botao-fantasma" data-fechar>Cancelar</button>
    <button type="submit" class="botao botao-primario salvar">Salvar</button>`;
  rodape.querySelector('.salvar').setAttribute('form', 'form-cadastro');
  form.id = 'form-cadastro';

  abrirPainel({ titulo: reg ? reg.nome : def.novo, subtitulo: reg ? `Editar ${def.singular}` : def.titulo, conteudo: form, rodape });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const botao = rodape.querySelector('.salvar');
    if (botao.disabled) return;

    let valido = true;
    for (const c of Object.values(campos)) {
      const erro = c.erro();
      mostrarErro(c, erro);
      if (erro) valido = false;
    }
    if (!valido) return;

    const valores = Object.fromEntries(Object.entries(campos).map(([k, c]) => [k, c.ler()]));
    const dados = { ...def.montar(valores), ...(reg ? { id: reg.id } : {}) };

    const duplicado = await buscarDuplicado(def.tabela, dados);
    if (duplicado) {
      if (def.duplicado === 'bloquear') {
        mostrarErro(campos.nome, def.mensagemDuplicado ?? `Já existe ${def.novo.startsWith('Nova') ? 'uma' : 'um'} ${def.singular} com esse nome.`);
        return;
      }
      const seguir = await confirmar({
        titulo: 'Nome repetido',
        mensagem: `Já existe um ${def.singular} chamado “${duplicado.nome}”. Salvar mesmo assim?`,
        confirmarTexto: 'Salvar mesmo assim',
      });
      if (!seguir) return;
    }

    botao.disabled = true;
    try {
      if (campos.imagem) {
        const img = valores.imagem;
        if (img.nova) {
          dados.imagemId = await salvarImagem(img.nova);
          await apagarImagem(img.imagemId);
        } else if (img.remover) {
          dados.imagemId = null;
          await apagarImagem(img.imagemId);
        } else {
          dados.imagemId = img.imagemId ?? null;
        }
      }
      await salvar(def.tabela, dados);
      toast(reg ? 'Alterações salvas' : `${def.singular[0].toUpperCase() + def.singular.slice(1)} “${dados.nome}” criad${def.novo.startsWith('Nova') ? 'a' : 'o'}`);
      fecharPainel();
      await aoSalvar();
    } catch (erro) {
      console.error(erro);
      toast('Não foi possível salvar.', 'erro');
      botao.disabled = false;
    }
  });

  rodape.querySelector('.excluir')?.addEventListener('click', async () => {
    const usos = await usosDe(def.tabela, reg.id);
    if (usos.length) {
      await avisar({
        titulo: 'Não dá pra excluir',
        mensagem: `“${reg.nome}” está em uso: ${usos.join(', ')}. Remova esses vínculos antes de excluir.`,
      });
      return;
    }
    const ok = await confirmar({
      titulo: `Excluir ${def.singular}?`,
      mensagem: `“${reg.nome}” vai sair de todas as listas.`,
      confirmarTexto: 'Excluir',
      perigo: true,
    });
    if (!ok) return;
    await excluir(def.tabela, reg.id);
    toast(`“${reg.nome}” excluíd${def.novo.startsWith('Nova') ? 'a' : 'o'}`);
    fecharPainel();
    await aoSalvar();
  });
}
