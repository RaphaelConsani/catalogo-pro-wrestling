import { ativos } from '../../db/repo.js';
import { salvarLuta, excluirLuta, carregarLuta, nomeLado } from '../../db/lutas.js';
import { criarSeletorEvento } from '../../componentes/seletor-evento.js';
import { criarSeletorWrestlers } from '../../componentes/seletor-wrestlers.js';
import { criarCampoNota } from '../../componentes/nota.js';
import { confirmar } from '../../componentes/dialogo.js';
import { toast } from '../../componentes/toast.js';
import { esc, plural } from '../../util/texto.js';
import { hoje } from '../../util/datas.js';
import { mascararDuracao, duracaoParaSegundos, segundosParaDuracao } from '../../util/duracao.js';

const RESULTADOS_SEM_VENCEDOR = [
  { id: 'draw', nome: 'Draw' },
  { id: 'time_limit_draw', nome: 'Time Limit Draw' },
  { id: 'no_contest', nome: 'No Contest' },
];

const porNome = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR');

export const telaNovaLuta = (container) => montarFormulario(container, {});

export async function telaEditarLuta(container, { id }) {
  const dados = await carregarLuta(id);
  if (!dados) {
    container.innerHTML = `<div class="vazio"><div><strong>Luta não encontrada</strong><span>Ela pode ter sido excluída.</span></div></div>`;
    return;
  }
  await montarFormulario(container, { luta: dados.luta, visualizacoes: dados.visualizacoes });
}

// opcoes:
//   luta, visualizacoes  -> edição de uma luta existente
//   inicial              -> dados pra pré-preencher uma luta nova (usado pelo backlog na etapa 5)
//   visualizacaoInicial  -> data/plataforma pré-preenchidas na 1ª visualização de uma luta nova
//   aoSalvar(luta)       -> substitui o comportamento padrão depois de salvar
export async function montarFormulario(container, { luta = null, visualizacoes = [], inicial = null, visualizacaoInicial = {}, aoSalvar = null }) {
  const editando = Boolean(luta);
  const base = luta ?? inicial ?? {};

  // ---------- Dados de apoio ----------
  const [tipos, estipulacoes, metodos, titulos, plataformas, equipes, empresas, wrestlers] = await Promise.all(
    ['tiposMatch', 'estipulacoes', 'metodosVitoria', 'titulos', 'plataformas', 'equipes', 'empresas', 'wrestlers'].map(ativos),
  );
  [tipos, estipulacoes, metodos, titulos, plataformas, equipes].forEach((l) => l.sort(porNome));
  const ctx = {
    wrestlers: new Map(wrestlers.map((w) => [w.id, w])),
    equipes: new Map(equipes.map((e) => [e.id, e])),
    empresas: new Map(empresas.map((e) => [e.id, e])),
  };

  // ---------- Estado ----------
  const estado = {
    evento: null,
    tipo: tipos.find((t) => t.id === base.tipoMatchId) ?? null,
    estipulacoesIds: new Set(base.estipulacoesIds ?? []),
    lados: (base.lados ?? []).map((l) => ({ equipeId: l.equipeId ?? null, wrestlersIds: [...l.wrestlersIds] })),
    resultado: base.resultado ?? null,
    ladoVencedor: base.ladoVencedor ?? null,
    metodoVitoriaId: base.metodoVitoriaId ?? null,
    tituloId: base.tituloId ?? null,
    visualizacoes: [],
  };
  const seletoresLados = [];

  // ---------- Estrutura ----------
  container.innerHTML = `
    <section class="tela-cabecalho">
      ${editando ? '<a class="voltar" href="#/">‹ Início</a>' : '<span class="tela-rotulo">Registro</span>'}
      <h1 class="tela-titulo">${editando ? 'Editar luta' : 'Nova luta'}</h1>
    </section>
    <form class="form-luta" novalidate>
      <section class="secao" data-secao="evento">
        <h2 class="secao-titulo"><span>1</span> Evento</h2>
        <div class="secao-corpo evento-campo"></div>
        <p class="secao-erro" hidden></p>
      </section>

      <section class="secao" data-secao="tipo">
        <h2 class="secao-titulo"><span>2</span> Tipo e estipulações</h2>
        <div class="secao-corpo">
          <div class="campo"><label class="campo-rotulo">Tipo de match <span class="campo-obrigatorio">*</span></label>
            <div class="chips-opcoes tipos"></div></div>
          <div class="campo"><label class="campo-rotulo">Estipulações</label>
            <div class="chips-opcoes estipulacoes"></div></div>
        </div>
        <p class="secao-erro" hidden></p>
      </section>

      <section class="secao" data-secao="lados">
        <h2 class="secao-titulo"><span>3</span> Lados</h2>
        <div class="secao-corpo">
          <p class="campo-dica lados-dica">Escolha o tipo de match pra liberar os lados.</p>
          <div class="lados"></div>
          <button type="button" class="botao botao-fantasma botao-pequeno adicionar-lado" hidden>＋ Adicionar lado</button>
        </div>
        <p class="secao-erro" hidden></p>
      </section>

      <section class="secao" data-secao="resultado">
        <h2 class="secao-titulo"><span>4</span> Resultado</h2>
        <div class="secao-corpo">
          <div class="campo"><label class="campo-rotulo">Resultado <span class="campo-obrigatorio">*</span></label>
            <div class="resultados"></div></div>
          <div class="campo campo-metodo" hidden><label class="campo-rotulo">Método de vitória <span class="campo-obrigatorio">*</span></label>
            <div class="chips-opcoes metodos"></div></div>
          <div class="campo"><label class="campo-rotulo" for="luta-titulo">Título em disputa</label>
            <select id="luta-titulo" class="campo-entrada titulo"></select></div>
        </div>
        <p class="secao-erro" hidden></p>
      </section>

      <section class="secao" data-secao="detalhes">
        <h2 class="secao-titulo"><span>5</span> Detalhes</h2>
        <div class="secao-corpo grade-detalhes">
          <div class="campo"><label class="campo-rotulo" for="luta-duracao">Duração</label>
            <input id="luta-duracao" class="campo-entrada duracao" inputmode="numeric" placeholder="mm:ss" autocomplete="off" />
            <small class="campo-dica">Digite só os números: 2345 vira 23:45.</small></div>
          <div class="campo"><label class="campo-rotulo" for="luta-link">Link</label>
            <input id="luta-link" class="campo-entrada link" type="url" placeholder="https://…" /></div>
          <div class="campo campo-largo"><label class="campo-rotulo" for="luta-obs">Observações</label>
            <textarea id="luta-obs" class="campo-entrada observacoes" rows="3"></textarea></div>
        </div>
        <p class="secao-erro" hidden></p>
      </section>

      <section class="secao" data-secao="visualizacoes">
        <h2 class="secao-titulo"><span>6</span> Visualizações</h2>
        <div class="secao-corpo">
          <div class="visualizacoes"></div>
          <button type="button" class="botao botao-fantasma botao-pequeno adicionar-visualizacao">＋ Adicionar visualização</button>
        </div>
        <p class="secao-erro" hidden></p>
      </section>

      <div class="barra-salvar">
        ${editando ? '<button type="button" class="botao botao-perigo-fantasma excluir-luta">Excluir luta</button>' : ''}
        <span class="espaco"></span>
        <button type="submit" class="botao botao-primario salvar-luta">${editando ? 'Salvar alterações' : 'Salvar luta'}</button>
      </div>
    </form>`;

  const $ = (s) => container.querySelector(s);
  const form = $('.form-luta');

  // ---------- 1. Evento ----------
  const seletorEvento = await criarSeletorEvento({
    valor: base.eventoId ?? null,
    aoMudar: (ev) => {
      estado.evento = ev;
      renderTitulos();
      limparErro('evento');
    },
  });
  estado.evento = seletorEvento.valor();
  $('.evento-campo').append(seletorEvento.el);

  // ---------- 2. Tipo e estipulações ----------
  function renderTipos() {
    $('.tipos').innerHTML = tipos
      .map((t) => `<button type="button" class="chip-opcao${estado.tipo?.id === t.id ? ' ligado' : ''}" data-id="${t.id}"
        aria-pressed="${estado.tipo?.id === t.id}">${esc(t.nome)}</button>`)
      .join('');
  }
  function renderEstipulacoes() {
    $('.estipulacoes').innerHTML = estipulacoes
      .map((e) => `<button type="button" class="chip-opcao${estado.estipulacoesIds.has(e.id) ? ' ligado' : ''}" data-id="${e.id}"
        aria-pressed="${estado.estipulacoesIds.has(e.id)}">${esc(e.nome)}</button>`)
      .join('');
  }
  $('.tipos').addEventListener('click', (e) => {
    const b = e.target.closest('[data-id]');
    if (!b) return;
    estado.tipo = tipos.find((t) => t.id === b.dataset.id);
    renderTipos();
    ajustarLadosAoTipo();
    limparErro('tipo');
  });
  $('.estipulacoes').addEventListener('click', (e) => {
    const b = e.target.closest('[data-id]');
    if (!b) return;
    const id = b.dataset.id;
    estado.estipulacoesIds.has(id) ? estado.estipulacoesIds.delete(id) : estado.estipulacoesIds.add(id);
    renderEstipulacoes();
  });

  // ---------- 3. Lados ----------
  const limiteLado = () => (estado.tipo && !estado.tipo.variavel ? estado.tipo.wrestlersPorLado : null);

  // carregando = abrindo uma luta já salva/pré-preenchida: respeita os lados como vieram.
  function ajustarLadosAoTipo(carregando = false) {
    const t = estado.tipo;
    if (!t) return;
    if (carregando && estado.lados.length) return renderLados();
    if (!t.variavel || estado.lados.length < t.numLados) {
      // Fixo: exatamente numLados. Variável: começa com a configuração inicial.
      const alvo = t.variavel ? Math.max(t.numLados, estado.lados.length) : t.numLados;
      while (estado.lados.length < alvo) estado.lados.push({ equipeId: null, wrestlersIds: [] });
      estado.lados.length = alvo;
    }
    if (estado.ladoVencedor != null && estado.ladoVencedor >= estado.lados.length) {
      estado.ladoVencedor = null;
      estado.resultado = null;
    }
    renderLados();
  }

  function contadorLado(i) {
    const n = estado.lados[i].wrestlersIds.length;
    const limite = limiteLado();
    const el = container.querySelector(`.lado[data-indice="${i}"] .lado-contador`);
    if (!el) return;
    el.textContent = limite ? `${n}/${limite}` : plural(n, 'wrestler', 'wrestlers');
    el.classList.toggle('alerta', limite ? n !== limite : n < 1);
  }

  async function renderLados() {
    const t = estado.tipo;
    $('.lados-dica').hidden = Boolean(t);
    $('.adicionar-lado').hidden = !t?.variavel;
    const elLados = $('.lados');
    seletoresLados.length = 0;
    elLados.replaceChildren();
    if (!t) return renderResultados();

    const podeRemover = t.variavel && estado.lados.length > 2;
    for (const [i, lado] of estado.lados.entries()) {
      const card = document.createElement('div');
      card.className = 'lado';
      card.dataset.indice = i;
      card.innerHTML = `
        <div class="lado-topo">
          <span class="lado-nome">Lado ${i + 1}</span>
          <span class="lado-contador"></span>
          <select class="campo-entrada lado-equipe" aria-label="Equipe do lado ${i + 1}">
            <option value="">Sem equipe</option>
            ${equipes.map((e) => `<option value="${e.id}">${esc(e.nome)}</option>`).join('')}
          </select>
          ${podeRemover ? `<button type="button" class="botao-icone remover-lado" aria-label="Remover lado ${i + 1}">✕</button>` : ''}
        </div>`;
      card.querySelector('.lado-equipe').value = lado.equipeId ?? '';
      const seletor = await criarSeletorWrestlers({
        selecionados: lado.wrestlersIds,
        limite: limiteLado(),
        compacto: true,
        aoMudar: (ids) => aoMudarWrestlers(i, ids),
      });
      seletoresLados[i] = seletor;
      card.append(seletor.el);
      elLados.append(card);
      contadorLado(i);
    }
    renderResultados();
  }

  async function aoMudarWrestlers(i, ids) {
    estado.lados[i].wrestlersIds = ids;
    contadorLado(i);
    limparErro('lados');
    // Wrestler criado na hora num lado: os outros seletores precisam conhecê-lo.
    if (ids.some((id) => !ctx.wrestlers.has(id))) {
      const ws = await ativos('wrestlers');
      ctx.wrestlers = new Map(ws.map((w) => [w.id, w]));
      seletoresLados.forEach((s, j) => j !== i && s.recarregar());
    }
    renderResultados();
  }

  $('.lados').addEventListener('change', (e) => {
    const select = e.target.closest('.lado-equipe');
    if (!select) return;
    const i = Number(select.closest('.lado').dataset.indice);
    const equipe = ctx.equipes.get(select.value);
    estado.lados[i].equipeId = equipe?.id ?? null;
    if (equipe) {
      // A equipe preenche os membros; dá pra editar depois.
      estado.lados[i].wrestlersIds = [...equipe.membrosIds];
      seletoresLados[i].definir(estado.lados[i].wrestlersIds);
      contadorLado(i);
      limparErro('lados');
    }
    renderResultados();
  });
  $('.lados').addEventListener('click', (e) => {
    const b = e.target.closest('.remover-lado');
    if (!b) return;
    const i = Number(b.closest('.lado').dataset.indice);
    estado.lados.splice(i, 1);
    if (estado.ladoVencedor === i) {
      estado.ladoVencedor = null;
      estado.resultado = null;
    } else if (estado.ladoVencedor > i) estado.ladoVencedor--;
    renderLados();
  });
  $('.adicionar-lado').addEventListener('click', () => {
    estado.lados.push({ equipeId: null, wrestlersIds: [] });
    renderLados();
  });

  // ---------- 4. Resultado ----------
  function renderResultados() {
    const vencedores = estado.lados.map((l, i) => {
      const nome = l.wrestlersIds.length || l.equipeId ? nomeLado(l, ctx) : `Lado ${i + 1}`;
      const ligado = estado.resultado === 'vitoria' && estado.ladoVencedor === i;
      return `<button type="button" class="resultado-opcao vencedor${ligado ? ' ligado' : ''}" data-resultado="vitoria" data-lado="${i}" aria-pressed="${ligado}">
        <small>Vitória</small><span>${esc(nome)}</span></button>`;
    });
    const outros = RESULTADOS_SEM_VENCEDOR.map((r) => {
      const ligado = estado.resultado === r.id;
      return `<button type="button" class="resultado-opcao${ligado ? ' ligado' : ''}" data-resultado="${r.id}" aria-pressed="${ligado}"><span>${r.nome}</span></button>`;
    });
    $('.resultados').innerHTML = estado.lados.length
      ? `<div class="resultados-grade">${vencedores.join('')}${outros.join('')}</div>`
      : '<p class="campo-dica">Os lados aparecem aqui depois de escolher o tipo.</p>';
    $('.campo-metodo').hidden = estado.resultado !== 'vitoria';
  }
  $('.resultados').addEventListener('click', (e) => {
    const b = e.target.closest('.resultado-opcao');
    if (!b) return;
    estado.resultado = b.dataset.resultado;
    estado.ladoVencedor = estado.resultado === 'vitoria' ? Number(b.dataset.lado) : null;
    if (estado.resultado !== 'vitoria') estado.metodoVitoriaId = null;
    renderResultados();
    renderMetodos();
    limparErro('resultado');
  });

  function renderMetodos() {
    $('.metodos').innerHTML = metodos
      .map((m) => `<button type="button" class="chip-opcao${estado.metodoVitoriaId === m.id ? ' ligado' : ''}" data-id="${m.id}"
        aria-pressed="${estado.metodoVitoriaId === m.id}">${esc(m.nome)}</button>`)
      .join('');
  }
  $('.metodos').addEventListener('click', (e) => {
    const b = e.target.closest('[data-id]');
    if (!b) return;
    estado.metodoVitoriaId = b.dataset.id;
    renderMetodos();
    limparErro('resultado');
  });

  function renderTitulos() {
    const doEvento = new Set([estado.evento?.empresaId, ...(estado.evento?.parceirasIds ?? [])].filter(Boolean));
    const opcao = (t) => {
      const e = ctx.empresas.get(t.empresaId);
      return `<option value="${t.id}">${esc(t.nome)}${e ? ` (${esc(e.sigla || e.nome)})` : ''}</option>`;
    };
    const proprios = titulos.filter((t) => doEvento.has(t.empresaId));
    const outros = titulos.filter((t) => !doEvento.has(t.empresaId));
    const select = $('.titulo');
    select.innerHTML = `<option value="">Nenhum</option>
      ${proprios.length ? `<optgroup label="Do evento">${proprios.map(opcao).join('')}</optgroup>` : ''}
      ${outros.length ? `<optgroup label="${proprios.length ? 'Outras empresas' : 'Todos'}">${outros.map(opcao).join('')}</optgroup>` : ''}`;
    select.value = estado.tituloId ?? '';
  }
  $('.titulo').addEventListener('change', (e) => (estado.tituloId = e.target.value || null));

  // ---------- 5. Detalhes ----------
  const elDuracao = $('.duracao');
  elDuracao.value = segundosParaDuracao(base.duracaoSeg ?? null);
  elDuracao.addEventListener('input', () => {
    elDuracao.value = mascararDuracao(elDuracao.value);
    limparErro('detalhes');
  });
  $('.link').value = base.link ?? '';
  $('.link').addEventListener('input', () => limparErro('detalhes'));
  $('.observacoes').value = base.observacoes ?? '';

  // ---------- 6. Visualizações ----------
  function novaVisualizacao(v = {}) {
    return { id: v.id ?? null, data: v.data ?? hoje(), plataformaId: v.plataformaId ?? null, nota: criarCampoNota({ valor: v.nota ?? null, aoMudar: () => limparErro('visualizacoes') }) };
  }

  function renderVisualizacoes() {
    const lista = $('.visualizacoes');
    lista.replaceChildren();
    const podeRemover = estado.visualizacoes.length > 1;
    estado.visualizacoes.forEach((v, i) => {
      const linha = document.createElement('div');
      linha.className = 'visualizacao';
      linha.innerHTML = `
        <span class="visualizacao-numero">${i + 1}ª</span>
        <label class="campo"><span class="campo-rotulo">Data <span class="campo-obrigatorio">*</span></span>
          <input type="date" class="campo-entrada v-data" /></label>
        <div class="campo v-nota"><span class="campo-rotulo">Nota <span class="campo-obrigatorio">*</span></span></div>
        <label class="campo"><span class="campo-rotulo">Plataforma</span>
          <select class="campo-entrada v-plataforma">
            <option value="">—</option>
            ${plataformas.map((p) => `<option value="${p.id}">${esc(p.nome)}</option>`).join('')}
          </select></label>
        ${podeRemover ? `<button type="button" class="botao-icone remover-visualizacao" aria-label="Remover visualização ${i + 1}">✕</button>` : ''}`;
      linha.querySelector('.v-data').value = v.data ?? '';
      linha.querySelector('.v-plataforma').value = v.plataformaId ?? '';
      linha.querySelector('.v-nota').append(v.nota.el);
      linha.querySelector('.v-data').addEventListener('input', (e) => {
        v.data = e.target.value;
        limparErro('visualizacoes');
      });
      linha.querySelector('.v-plataforma').addEventListener('change', (e) => (v.plataformaId = e.target.value || null));
      linha.querySelector('.remover-visualizacao')?.addEventListener('click', () => {
        estado.visualizacoes.splice(i, 1);
        renderVisualizacoes();
      });
      lista.append(linha);
    });
  }
  $('.adicionar-visualizacao').addEventListener('click', () => {
    estado.visualizacoes.push(novaVisualizacao({ plataformaId: estado.visualizacoes.at(-1)?.plataformaId }));
    renderVisualizacoes();
  });

  // ---------- Validação ----------
  function mostrarErroSecao(secao, msg) {
    const el = container.querySelector(`[data-secao="${secao}"] .secao-erro`);
    el.textContent = msg ?? '';
    el.hidden = !msg;
    el.closest('.secao').classList.toggle('com-erro', Boolean(msg));
  }
  function limparErro(secao) {
    mostrarErroSecao(secao, null);
  }

  function validar() {
    const erros = {};
    if (!estado.evento) erros.evento = 'Escolha o evento.';
    if (!estado.tipo) erros.tipo = 'Escolha o tipo de match.';
    else {
      const t = estado.tipo;
      if (t.variavel) {
        if (estado.lados.length < 2) erros.lados = 'A luta precisa de pelo menos 2 lados.';
        else if (estado.lados.some((l) => l.wrestlersIds.length < 1)) erros.lados = 'Todo lado precisa de pelo menos 1 wrestler.';
      } else {
        const errado = estado.lados.findIndex((l) => l.wrestlersIds.length !== t.wrestlersPorLado);
        if (errado >= 0) erros.lados = `${t.nome} tem ${plural(t.wrestlersPorLado, 'wrestler', 'wrestlers')} por lado. Confira o lado ${errado + 1}.`;
      }
      if (!erros.lados) {
        const todos = estado.lados.flatMap((l) => l.wrestlersIds);
        const repetido = todos.find((id, i) => todos.indexOf(id) !== i);
        if (repetido) erros.lados = `${ctx.wrestlers.get(repetido)?.nome ?? 'Um wrestler'} aparece mais de uma vez na luta.`;
      }
    }
    if (!estado.resultado) erros.resultado = 'Escolha o resultado.';
    else if (estado.resultado === 'vitoria' && !estado.metodoVitoriaId) erros.resultado = 'Escolha o método de vitória.';

    const seg = duracaoParaSegundos(elDuracao.value);
    const link = $('.link').value.trim();
    if (Number.isNaN(seg)) erros.detalhes = 'Duração inválida. Use mm:ss, com segundos de 00 a 59.';
    else if (link && !/^https?:\/\/\S+\.\S+/.test(link)) erros.detalhes = 'O link precisa começar com http:// ou https://.';

    if (!estado.visualizacoes.length) erros.visualizacoes = 'Registre pelo menos uma visualização.';
    else {
      const i = estado.visualizacoes.findIndex((v) => !v.data || v.nota.valor() == null);
      if (i >= 0) erros.visualizacoes = `Preencha a data e a nota da ${i + 1}ª visualização.`;
    }

    for (const s of ['evento', 'tipo', 'lados', 'resultado', 'detalhes', 'visualizacoes']) mostrarErroSecao(s, erros[s]);
    const primeiro = container.querySelector('.secao.com-erro');
    primeiro?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return !primeiro;
  }

  // ---------- Salvar / excluir ----------
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const botao = $('.salvar-luta');
    if (botao.disabled || !validar()) return;
    botao.disabled = true;
    const dados = {
      ...(editando ? { id: luta.id } : {}),
      eventoId: estado.evento.id,
      tipoMatchId: estado.tipo.id,
      estipulacoesIds: estipulacoes.filter((x) => estado.estipulacoesIds.has(x.id)).map((x) => x.id),
      lados: estado.lados.map((l) => ({ equipeId: l.equipeId, wrestlersIds: [...l.wrestlersIds] })),
      resultado: estado.resultado,
      ladoVencedor: estado.resultado === 'vitoria' ? estado.ladoVencedor : null,
      metodoVitoriaId: estado.resultado === 'vitoria' ? estado.metodoVitoriaId : null,
      tituloId: estado.tituloId,
      duracaoSeg: duracaoParaSegundos(elDuracao.value),
      link: $('.link').value.trim() || null,
      observacoes: $('.observacoes').value.trim() || null,
    };
    const vs = estado.visualizacoes.map((v) => ({ id: v.id, data: v.data, nota: v.nota.valor(), plataformaId: v.plataformaId }));
    try {
      const salva = await salvarLuta(dados, vs);
      if (aoSalvar) return aoSalvar(salva);
      if (editando) {
        toast('Luta atualizada');
        location.hash = '#/';
        return;
      }
      toast('Luta registrada');
      // Próxima luta do mesmo show: mantém evento, data e plataforma.
      const ultima = vs.at(-1);
      const tela = document.createElement('div');
      tela.className = 'tela';
      container.replaceWith(tela);
      await montarFormulario(tela, { inicial: { eventoId: dados.eventoId }, visualizacaoInicial: { data: ultima.data, plataformaId: ultima.plataformaId } });
      window.scrollTo(0, 0);
    } catch (erro) {
      console.error(erro);
      toast('Não foi possível salvar a luta.', 'erro');
      botao.disabled = false;
    }
  });

  $('.excluir-luta')?.addEventListener('click', async () => {
    const ok = await confirmar({
      titulo: 'Excluir luta?',
      mensagem: 'A luta e todas as visualizações dela vão sair do catálogo e dos dashboards.',
      confirmarTexto: 'Excluir',
      perigo: true,
    });
    if (!ok) return;
    await excluirLuta(luta.id);
    toast('Luta excluída');
    location.hash = '#/';
  });

  // ---------- Render inicial ----------
  renderTipos();
  renderEstipulacoes();
  renderMetodos();
  renderTitulos();
  if (estado.tipo) ajustarLadosAoTipo(true);
  else renderLados();
  estado.visualizacoes = visualizacoes.length
    ? visualizacoes.map(novaVisualizacao)
    : [novaVisualizacao(visualizacaoInicial)];
  renderVisualizacoes();
}
