import { carregarCatalogo, NOME_RESULTADO } from '../db/catalogo.js';
import { htmlCardLuta } from '../componentes/card-luta.js';
import { abrirDetalheLuta } from '../componentes/detalhe-luta.js';
import { esc, normalizar, formatarData, plural } from '../util/texto.js';
import { formatarNota } from '../util/nota.js';

const LOTE = 60;

export const ORDENACOES = {
  recente: { nome: 'Assistidas por último', comparar: (a, b) => cmp(b.ultimaVisualizacao, a.ultimaVisualizacao) },
  evento_desc: { nome: 'Evento mais recente', comparar: (a, b) => cmp(b.evento?.data, a.evento?.data) },
  evento_asc: { nome: 'Evento mais antigo', comparar: (a, b) => cmp(a.evento?.data, b.evento?.data) },
  nota_desc: { nome: 'Maior nota', comparar: (a, b) => (b.nota ?? -1) - (a.nota ?? -1) },
  nota_asc: { nome: 'Menor nota', comparar: (a, b) => (a.nota ?? 99) - (b.nota ?? 99) },
  duracao_desc: { nome: 'Mais longa', comparar: (a, b) => (b.luta.duracaoSeg ?? -1) - (a.luta.duracaoSeg ?? -1) },
};
const cmp = (a, b) => (a ?? '').localeCompare(b ?? '');

// Ordena com desempate pela luta cadastrada mais recentemente.
export const ordenar = (itens, chave) =>
  [...itens].sort((a, b) => ORDENACOES[chave].comparar(a, b) || cmp(b.luta.criadoEm, a.luta.criadoEm));

const NOTAS = Array.from({ length: 21 }, (_, i) => i * 0.25);

// Filtros e ordenação ficam guardados durante a sessão (voltar pra Biblioteca mantém tudo).
const FILTROS_VAZIOS = {
  busca: '', empresa: '', wrestler: '', tipo: '', estipulacao: '', ano: '', notaMin: '', notaMax: '',
  evento: '', titulo: '', resultado: '', plataforma: '', revistas: false,
};
const estado = { ordem: 'recente', filtros: { ...FILTROS_VAZIOS }, painelAberto: false };

function aplicarFiltros(itens) {
  const f = estado.filtros;
  const termo = normalizar(f.busca);
  return itens.filter((it) => {
    if (termo && !termo.split(' ').every((p) => it.busca.includes(p))) return false;
    if (f.empresa && !it.empresasIds.includes(f.empresa)) return false;
    if (f.wrestler && !it.luta.wrestlersIds.includes(f.wrestler)) return false;
    if (f.tipo && it.luta.tipoMatchId !== f.tipo) return false;
    if (f.estipulacao && !it.luta.estipulacoesIds.includes(f.estipulacao)) return false;
    if (f.ano && String(it.ano) !== f.ano) return false;
    if (f.notaMin !== '' && (it.nota ?? -1) < Number(f.notaMin)) return false;
    if (f.notaMax !== '' && (it.nota ?? 99) > Number(f.notaMax)) return false;
    if (f.evento && it.luta.eventoId !== f.evento) return false;
    if (f.titulo === '__com' && !it.luta.tituloId) return false;
    if (f.titulo && f.titulo !== '__com' && it.luta.tituloId !== f.titulo) return false;
    if (f.resultado && it.luta.resultado !== f.resultado) return false;
    if (f.plataforma && !it.visualizacoes.some((v) => v.plataformaId === f.plataforma)) return false;
    if (f.revistas && it.visualizacoes.length < 2) return false;
    return true;
  });
}

const opcoes = (lista, rotulo = (x) => x.nome) => lista.map((x) => `<option value="${x.id}">${esc(rotulo(x))}</option>`).join('');
const porNome = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR');

export async function telaBiblioteca(container) {
  const { itens, ctx, listas } = await carregarCatalogo();
  const anos = [...new Set(itens.map((i) => i.ano).filter(Boolean))].sort((a, b) => b - a);
  const notaOpcoes = NOTAS.map((n) => `<option value="${n}">${formatarNota(n)}</option>`).join('');

  const DEF_FILTROS = [
    ['empresa', 'Empresa', opcoes([...listas.empresas].sort(porNome)), (id) => ctx.empresas.get(id)?.sigla || ctx.empresas.get(id)?.nome],
    ['wrestler', 'Wrestler', opcoes([...listas.wrestlers].sort(porNome)), (id) => ctx.wrestlers.get(id)?.nome],
    ['tipo', 'Tipo de match', opcoes([...listas.tipos].sort(porNome)), (id) => ctx.tipos.get(id)?.nome],
    ['estipulacao', 'Estipulação', opcoes([...listas.estipulacoes].sort(porNome)), (id) => ctx.estipulacoes.get(id)?.nome],
    ['ano', 'Ano do evento', anos.map((a) => `<option value="${a}">${a}</option>`).join(''), (a) => a],
    ['notaMin', 'Nota mínima', notaOpcoes, (n) => `Nota ≥ ${formatarNota(Number(n))}`],
    ['notaMax', 'Nota máxima', notaOpcoes, (n) => `Nota ≤ ${formatarNota(Number(n))}`],
    ['evento', 'Evento', opcoes([...listas.eventos].sort((a, b) => cmp(b.data, a.data)), (e) => `${e.nome} · ${formatarData(e.data)}`), (id) => ctx.eventos.get(id)?.nome],
    ['titulo', 'Título em disputa', `<option value="__com">Qualquer título</option>${opcoes([...listas.titulos].sort(porNome))}`, (id) => (id === '__com' ? 'Com título' : ctx.titulos.get(id)?.nome)],
    ['resultado', 'Resultado', Object.entries(NOME_RESULTADO).map(([k, v]) => `<option value="${k}">${v}</option>`).join(''), (r) => NOME_RESULTADO[r]],
    ['plataforma', 'Plataforma', opcoes([...listas.plataformas].sort(porNome)), (id) => ctx.plataformas.get(id)?.nome],
  ];

  container.innerHTML = `
    <section class="tela-cabecalho">
      <span class="tela-rotulo">Acervo</span>
      <h1 class="tela-titulo">Biblioteca</h1>
    </section>
    <div class="barra-ferramentas biblioteca-barra">
      <input type="search" class="campo-entrada busca" placeholder="Buscar wrestler, evento, empresa, estipulação…" aria-label="Buscar lutas" />
      <button type="button" class="botao botao-fantasma alternar-filtros" aria-expanded="false">Filtros</button>
      <select class="campo-entrada ordem" aria-label="Ordenar">
        ${Object.entries(ORDENACOES).map(([k, o]) => `<option value="${k}">${o.nome}</option>`).join('')}
      </select>
    </div>
    <div class="painel-filtros" hidden>
      ${DEF_FILTROS.map(([k, rotulo, html]) => `
        <label class="campo"><span class="campo-rotulo">${rotulo}</span>
          <select class="campo-entrada" data-filtro="${k}"><option value="">${k.startsWith('nota') ? 'Qualquer' : 'Todos'}</option>${html}</select>
        </label>`).join('')}
      <label class="filtro-check"><input type="checkbox" data-filtro="revistas" /> Assisti mais de uma vez</label>
    </div>
    <div class="filtros-ativos"></div>
    <p class="contador biblioteca-contador"></p>
    <div class="grade-lutas"></div>
    <div class="sentinela" aria-hidden="true"></div>`;

  const $ = (s) => container.querySelector(s);
  const elGrade = $('.grade-lutas');
  const elBusca = $('.busca');
  const elPainel = $('.painel-filtros');
  let resultado = [];
  let mostrados = 0;

  // Restaura o estado da sessão nos controles.
  elBusca.value = estado.filtros.busca;
  $('.ordem').value = estado.ordem;
  for (const el of container.querySelectorAll('[data-filtro]')) {
    const v = estado.filtros[el.dataset.filtro];
    if (el.type === 'checkbox') el.checked = v;
    else el.value = v;
  }
  elPainel.hidden = !estado.painelAberto;

  function renderAtivos() {
    const ativos = DEF_FILTROS.filter(([k]) => estado.filtros[k] !== '').map(([k, , , rotulo]) => [k, rotulo(estado.filtros[k])]);
    if (estado.filtros.revistas) ativos.push(['revistas', 'Assisti mais de uma vez']);
    $('.alternar-filtros').textContent = ativos.length ? `Filtros (${ativos.length})` : 'Filtros';
    $('.filtros-ativos').innerHTML = ativos.length
      ? ativos.map(([k, r]) => `<span class="chip">${esc(r ?? '?')}<button type="button" class="chip-remover" data-limpar="${k}" aria-label="Remover filtro">✕</button></span>`).join('') +
        '<button type="button" class="limpar-filtros">Limpar filtros</button>'
      : '';
  }

  function atualizar() {
    resultado = ordenar(aplicarFiltros(itens), estado.ordem);
    mostrados = 0;
    elGrade.replaceChildren();
    renderAtivos();
    const filtrando = resultado.length !== itens.length;
    $('.biblioteca-contador').textContent = filtrando
      ? `${resultado.length} de ${plural(itens.length, 'luta', 'lutas')}`
      : plural(itens.length, 'luta', 'lutas');
    if (!resultado.length) {
      elGrade.innerHTML = `<div class="vazio"><div>
        <div class="vazio-icone" aria-hidden="true">▦</div>
        <strong>${itens.length ? 'Nenhuma luta encontrada' : 'Nenhuma luta registrada ainda'}</strong>
        <span>${itens.length ? 'Tente outra busca ou limpe os filtros.' : '<a href="#/nova-luta">Registrar a primeira luta</a>'}</span>
      </div></div>`;
      return;
    }
    mostrarMais();
  }

  function mostrarMais() {
    if (mostrados >= resultado.length) return;
    const lote = resultado.slice(mostrados, mostrados + LOTE);
    elGrade.insertAdjacentHTML('beforeend', lote.map((it) => htmlCardLuta(it, ctx)).join(''));
    mostrados += lote.length;
  }

  // Rolagem infinita: quando a sentinela aparece, carrega o próximo lote.
  const observador = new IntersectionObserver((entradas) => {
    if (!container.isConnected) return observador.disconnect();
    if (entradas.some((e) => e.isIntersecting)) mostrarMais();
  }, { rootMargin: '600px' });
  observador.observe($('.sentinela'));

  let espera;
  elBusca.addEventListener('input', () => {
    clearTimeout(espera);
    espera = setTimeout(() => {
      estado.filtros.busca = elBusca.value;
      atualizar();
    }, 150);
  });
  $('.ordem').addEventListener('change', (e) => {
    estado.ordem = e.target.value;
    atualizar();
  });
  $('.alternar-filtros').addEventListener('click', () => {
    estado.painelAberto = !estado.painelAberto;
    elPainel.hidden = !estado.painelAberto;
    $('.alternar-filtros').setAttribute('aria-expanded', String(estado.painelAberto));
  });
  elPainel.addEventListener('change', (e) => {
    const el = e.target.closest('[data-filtro]');
    if (!el) return;
    estado.filtros[el.dataset.filtro] = el.type === 'checkbox' ? el.checked : el.value;
    atualizar();
  });
  $('.filtros-ativos').addEventListener('click', (e) => {
    const k = e.target.closest('[data-limpar]')?.dataset.limpar;
    const tudo = e.target.closest('.limpar-filtros');
    if (!k && !tudo) return;
    const chaves = tudo ? Object.keys(FILTROS_VAZIOS).filter((c) => c !== 'busca') : [k];
    for (const c of chaves) {
      estado.filtros[c] = FILTROS_VAZIOS[c];
      const el = container.querySelector(`[data-filtro="${c}"]`);
      if (el.type === 'checkbox') el.checked = false;
      else el.value = '';
    }
    atualizar();
  });
  elGrade.addEventListener('click', (e) => {
    const id = e.target.closest('[data-luta]')?.dataset.luta;
    const item = id && itens.find((i) => i.luta.id === id);
    if (item) abrirDetalheLuta(item, ctx);
  });

  atualizar();
}
