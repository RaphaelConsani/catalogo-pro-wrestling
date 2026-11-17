import { carregarCatalogo } from '../db/catalogo.js';
import {
  filtrar, anosAssistidos, notaMedia, lutasPorAno, lutasPorMes, mediaPor, rankingWrestlers,
  distribuicaoNotas, destaques, calendario, atraso, formatarDias,
} from '../db/estatisticas.js';
import { htmlCardLuta } from '../componentes/card-luta.js';
import { abrirDetalheLuta } from '../componentes/detalhe-luta.js';
import { htmlEstrelas } from '../componentes/nota.js';
import { esc, plural, formatarData } from '../util/texto.js';
import { formatarNota, formatarNumeroNota } from '../util/nota.js';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const RANKING_INICIAL = 25;
const DESTAQUES_INICIAL = 12;

// Filtros, mínimo do ranking e ano do calendário ficam guardados durante a sessão.
const estado = { ano: '', empresa: '', minimo: 5, anoCalendario: null };

const fmtMedia = (m) => (m == null ? '—' : formatarNumeroNota(m));

export async function telaDashboards(container) {
  // Começa a baixar o ECharts junto com os dados.
  const [{ itens, ctx, listas }, g] = await Promise.all([carregarCatalogo(), import('../util/graficos.js')]);
  const assistidas = filtrar(itens);
  const anos = anosAssistidos(assistidas);
  const empresas = [...listas.empresas].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  if (estado.ano && !anos.includes(Number(estado.ano))) estado.ano = '';
  if (estado.empresa && !ctx.empresas.has(estado.empresa)) estado.empresa = '';

  container.innerHTML = `
    <section class="tela-cabecalho">
      <span class="tela-rotulo">Estatísticas</span>
      <h1 class="tela-titulo">Dashboards</h1>
    </section>
    <div class="barra-ferramentas dash-filtros">
      <label class="dash-filtro"><span>Ano em que assisti</span>
        <select class="campo-entrada" data-filtro="ano">
          <option value="">Todos</option>${anos.map((a) => `<option value="${a}">${a}</option>`).join('')}
        </select>
      </label>
      <label class="dash-filtro"><span>Empresa</span>
        <select class="campo-entrada" data-filtro="empresa">
          <option value="">Todas</option>${empresas.map((e) => `<option value="${e.id}">${esc(e.nome)}</option>`).join('')}
        </select>
      </label>
    </div>
    <div class="dash-conteudo"></div>`;

  const elConteudo = container.querySelector('.dash-conteudo');
  for (const el of container.querySelectorAll('[data-filtro]')) {
    el.value = estado[el.dataset.filtro];
    el.addEventListener('change', () => {
      estado[el.dataset.filtro] = el.value;
      estado.anoCalendario = null;
      render();
    });
  }

  let graficos = [];
  const montar = (seletor, opcoes) => {
    const el = elConteudo.querySelector(seletor);
    if (el) graficos.push(g.montarGrafico(el, opcoes));
  };

  function render() {
    for (const gr of graficos) gr.dispose();
    graficos = [];
    const lista = filtrar(itens, estado);

    if (!lista.length) {
      elConteudo.innerHTML = `<div class="vazio"><div>
        <div class="vazio-icone" aria-hidden="true">◔</div>
        <strong>${assistidas.length ? 'Nenhuma luta assistida com esses filtros' : 'Nenhuma luta registrada ainda'}</strong>
        <span>${assistidas.length ? 'Troque o ano ou a empresa.' : '<a href="#/nova-luta">Registrar a primeira luta</a>'}</span>
      </div></div>`;
      return;
    }

    const media = notaMedia(lista);
    const cincos = lista.filter((i) => i.nota === 5).length;
    const qtdWrestlers = [...new Set(lista.flatMap((i) => i.luta.wrestlersIds))].length;
    const empresaFiltro = ctx.empresas.get(estado.empresa);

    elConteudo.innerHTML = `
      <section class="numeros">
        <div class="numero"><strong>${lista.length}</strong><span>${lista.length === 1 ? 'luta assistida' : 'lutas assistidas'}</span></div>
        <div class="numero${media >= 4.5 ? ' alta' : ''}"><strong>${fmtMedia(media)}</strong>
          <span>${media == null ? '' : htmlEstrelas(media, `estrelas-pequenas${media >= 4.5 ? ' cinco' : ''}`)} nota média</span></div>
        <div class="numero${cincos ? ' alta' : ''}"><strong>${cincos}</strong><span>${cincos === 1 ? 'luta 5 estrelas' : 'lutas 5 estrelas'}</span></div>
        <div class="numero"><strong>${qtdWrestlers}</strong><span>wrestlers diferentes</span></div>
      </section>

      <section class="dash-grade">
        <div class="grafico-caixa dash-largo">
          <h2>Lutas por mês</h2><small>${estado.ano ? `${estado.ano} · ` : ''}pela 1ª visualização</small>
          <div class="grafico" data-grafico="mes"></div>
        </div>
        ${estado.ano ? '' : `
        <div class="grafico-caixa">
          <h2>Lutas por ano</h2><small>pela 1ª visualização</small>
          <div class="grafico" data-grafico="ano"></div>
        </div>`}
        <div class="grafico-caixa${estado.ano ? ' dash-largo' : ''}">
          <h2>Distribuição das notas</h2><small>nota mais recente</small>
          <div class="grafico" data-grafico="distribuicao"></div>
        </div>
        ${empresaFiltro ? '' : `
        <div class="grafico-caixa">
          <h2>Nota média por empresa</h2><small>empresa principal do evento · nota mais recente</small>
          <div class="grafico grafico-barras-h" data-grafico="empresas"></div>
        </div>`}
        <div class="grafico-caixa${empresaFiltro ? ' dash-largo' : ''}">
          <h2>Nota média por tipo de match</h2><small>nota mais recente</small>
          <div class="grafico grafico-barras-h" data-grafico="tipos"></div>
        </div>
      </section>

      <section class="grafico-caixa dash-secao dash-ranking"></section>
      <section class="grafico-caixa dash-secao dash-calendario"></section>
      <section class="grafico-caixa dash-secao dash-atraso"></section>
      <section class="dash-secao dash-destaques"></section>`;

    const c = g.coresTema();
    desenharPorMes(lista, c);
    if (!estado.ano) desenharPorAno(lista, c);
    desenharDistribuicao(lista, c);
    if (!empresaFiltro) desenharMedias('[data-grafico="empresas"]', mediaPor(lista, (i) => i.evento?.empresaId), (id) => ctx.empresas.get(id), c, true);
    desenharMedias('[data-grafico="tipos"]', mediaPor(lista, (i) => i.luta.tipoMatchId), (id) => ctx.tipos.get(id), c, false);
    renderRanking(lista);
    renderCalendario(lista);
    renderAtraso(lista, c);
    renderDestaques(lista);
  }

  // ---------- Gráficos ----------
  function desenharPorMes(lista, c) {
    const dados = lutasPorMes(lista, estado.ano);
    const rotulos = dados.map(({ mes }) => {
      const [a, m] = mes.split('-');
      return estado.ano ? MESES[m - 1] : `${MESES[m - 1]}/${a.slice(2)}`;
    });
    const muitos = dados.length > 36;
    const base = g.baseGrafico(c);
    montar('[data-grafico="mes"]', {
      ...base,
      grid: { ...base.grid, bottom: muitos ? 44 : 8 },
      xAxis: g.eixoCategorias(c, rotulos),
      yAxis: g.eixoValores(c, { minInterval: 1 }),
      dataZoom: muitos ? [
        { type: 'inside', startValue: dados.length - 36, endValue: dados.length - 1 },
        { type: 'slider', height: 20, bottom: 8, borderColor: c.borda, fillerColor: c.neonFraco, textStyle: { color: c.textoFraco },
          handleStyle: { color: c.neon }, dataBackground: { lineStyle: { color: c.borda }, areaStyle: { color: c.vazio } } },
      ] : undefined,
      series: [{ type: 'bar', name: 'Lutas', data: dados.map((d) => d.qtd), barMaxWidth: 28, itemStyle: { color: c.neon, borderRadius: [4, 4, 0, 0] } }],
    });
  }

  function desenharPorAno(lista, c) {
    const dados = lutasPorAno(lista);
    montar('[data-grafico="ano"]', {
      ...g.baseGrafico(c),
      xAxis: g.eixoCategorias(c, dados.map((d) => d.ano)),
      yAxis: g.eixoValores(c, { minInterval: 1 }),
      series: [{ type: 'bar', name: 'Lutas', data: dados.map((d) => d.qtd), barMaxWidth: 36, itemStyle: { color: c.neon, borderRadius: [4, 4, 0, 0] } }],
    });
  }

  // Barras de 4.50 pra cima em dourado (são as lutas de destaque).
  function desenharDistribuicao(lista, c) {
    const dados = distribuicaoNotas(lista);
    const base = g.baseGrafico(c);
    montar('[data-grafico="distribuicao"]', {
      ...base,
      tooltip: { ...base.tooltip, formatter: ([p]) => `${esc(formatarNota(dados[p.dataIndex].nota))}<br><strong>${plural(p.value, 'luta', 'lutas')}</strong>` },
      xAxis: { ...g.eixoCategorias(c, dados.map((d) => (d.nota === 0 ? 'DUD' : formatarNumeroNota(d.nota)))), axisLabel: { color: c.textoSuave, interval: 3 } },
      yAxis: g.eixoValores(c, { minInterval: 1 }),
      series: [{
        type: 'bar', name: 'Lutas', barCategoryGap: '20%',
        data: dados.map((d) => ({ value: d.qtd, itemStyle: { color: d.nota >= 4.5 ? c.ouro : c.neon, borderRadius: [3, 3, 0, 0] } })),
      }],
    });
  }

  // Barras horizontais com a média; rótulo traz a quantidade de lutas.
  function desenharMedias(seletor, dados, buscar, c, corDaEmpresa) {
    const el = elConteudo.querySelector(seletor);
    if (!el) return;
    if (!dados.length) {
      el.classList.add('grafico-vazio');
      el.textContent = 'Sem notas pra calcular.';
      return;
    }
    const linhas = [...dados].reverse(); // ECharts desenha de baixo pra cima
    el.style.height = `${Math.max(160, linhas.length * 34 + 24)}px`;
    const nome = (id) => {
      const x = buscar(id);
      return corDaEmpresa ? x?.sigla || x?.nome || '?' : x?.nome ?? '?';
    };
    const base = g.baseGrafico(c);
    montar(seletor, {
      ...base,
      grid: { ...base.grid, right: 96 },
      tooltip: {
        ...base.tooltip,
        formatter: ([p]) => {
          const d = linhas[p.dataIndex];
          return `${esc(buscar(d.id)?.nome ?? '?')}<br><strong>${fmtMedia(d.media)} ★</strong> · ${plural(d.qtd, 'luta', 'lutas')}`;
        },
      },
      xAxis: g.eixoValores(c, { min: 0, max: 5, interval: 1 }),
      yAxis: { ...g.eixoCategorias(c, linhas.map((d) => nome(d.id))), axisLabel: { color: c.texto, fontWeight: 600, width: 140, overflow: 'truncate' } },
      series: [{
        type: 'bar', barMaxWidth: 20,
        data: linhas.map((d) => ({
          value: Number(d.media.toFixed(2)),
          itemStyle: { color: corDaEmpresa ? buscar(d.id)?.cor ?? c.neon : c.neon, borderRadius: [0, 4, 4, 0] },
        })),
        label: {
          show: true, position: 'right', color: c.textoSuave, fontFamily: c.fonte,
          formatter: (p) => `{n|${fmtMedia(linhas[p.dataIndex].media)}}  ${linhas[p.dataIndex].qtd}`,
          rich: { n: { color: c.texto, fontWeight: 700, fontFamily: c.fonte } },
        },
      }],
    });
  }

  // ---------- Ranking de wrestlers ----------
  function renderRanking(lista) {
    const el = elConteudo.querySelector('.dash-ranking');
    let todos = false;
    const desenhar = () => {
      const ranking = rankingWrestlers(lista, estado.minimo);
      const mostrar = todos ? ranking : ranking.slice(0, RANKING_INICIAL);
      el.innerHTML = `
        <div class="dash-secao-topo">
          <div><h2>Ranking de wrestlers</h2><small>nota média · nota mais recente de cada luta</small></div>
          <label class="dash-minimo"><span>Mínimo de lutas</span>
            <span class="dash-minimo-controle">
              <button type="button" class="botao-icone" data-minimo="-1" aria-label="Diminuir mínimo" ${estado.minimo <= 1 ? 'disabled' : ''}>−</button>
              <input type="number" class="campo-entrada" min="1" max="999" value="${estado.minimo}" aria-label="Mínimo de lutas" />
              <button type="button" class="botao-icone" data-minimo="1" aria-label="Aumentar mínimo">+</button>
            </span>
          </label>
        </div>
        ${ranking.length ? `<ol class="ranking">${mostrar.map((w, k) => linhaRanking(w, k)).join('')}</ol>
          ${ranking.length > RANKING_INICIAL ? `<button type="button" class="botao botao-fantasma botao-pequeno dash-mais" data-ranking-todos>
            ${todos ? 'Mostrar menos' : `Mostrar todos (${ranking.length})`}</button>` : ''}`
        : `<p class="dash-nada">Nenhum wrestler com ${plural(estado.minimo, 'luta', 'lutas')} ou mais.</p>`}`;
    };
    const linhaRanking = (w, k) => {
      const wr = ctx.wrestlers.get(w.id);
      const emp = ctx.empresas.get(wr?.empresaId);
      const alta = w.media >= 4.5;
      return `<li class="ranking-linha${alta ? ' alta' : ''}">
        <span class="ranking-posicao">${k + 1}</span>
        <a class="ranking-nome" href="#/wrestler/${w.id}">${esc(wr?.nome ?? '?')}${emp ? `<small>${esc(emp.sigla || emp.nome)}</small>` : ''}</a>
        <span class="ranking-barra"><span style="width:${(w.media / 5) * 100}%"></span></span>
        <span class="ranking-qtd">${plural(w.qtd, 'luta', 'lutas')}</span>
        <strong class="ranking-nota">${fmtMedia(w.media)}</strong>
      </li>`;
    };
    const definirMinimo = (n) => {
      if (!Number.isFinite(n)) return;
      estado.minimo = Math.min(999, Math.max(1, Math.round(n)));
      desenhar();
    };
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-minimo]');
      if (b) return definirMinimo(estado.minimo + Number(b.dataset.minimo));
      if (e.target.closest('[data-ranking-todos]')) {
        todos = !todos;
        desenhar();
      }
    });
    el.addEventListener('change', (e) => {
      if (e.target.matches('input[type="number"]')) definirMinimo(Number(e.target.value));
    });
    desenhar();
  }

  // ---------- Calendário de atividade ----------
  function renderCalendario(lista) {
    const el = elConteudo.querySelector('.dash-calendario');
    const anosLista = anosAssistidos(lista);
    const anoAtual = new Date().getFullYear();
    const menor = Math.min(...anosLista, anoAtual);
    const maior = Math.max(...anosLista, anoAtual);
    if (estado.ano) estado.anoCalendario = Number(estado.ano);
    else if (!estado.anoCalendario || estado.anoCalendario < menor || estado.anoCalendario > maior) estado.anoCalendario = anosLista[0] ?? anoAtual;
    let grafico = null;

    const desenhar = () => {
      const ano = estado.anoCalendario;
      const dados = calendario(lista, ano);
      const total = dados.reduce((s, [, n]) => s + n, 0);
      const dias = dados.length;
      el.innerHTML = `
        <div class="dash-secao-topo">
          <div><h2>Calendário de atividade</h2><small>lutas por dia · pela 1ª visualização</small></div>
          <div class="dash-ano">
            ${estado.ano ? '' : `<button type="button" class="botao-icone" data-ano="-1" aria-label="Ano anterior" ${ano <= menor ? 'disabled' : ''}>‹</button>`}
            <strong>${ano}</strong>
            ${estado.ano ? '' : `<button type="button" class="botao-icone" data-ano="1" aria-label="Próximo ano" ${ano >= maior ? 'disabled' : ''}>›</button>`}
          </div>
        </div>
        <p class="dash-resumo">${total ? `${plural(total, 'luta', 'lutas')} em ${plural(dias, 'dia', 'dias')}` : 'Nenhuma luta assistida neste ano.'}</p>
        <div class="dash-calendario-rolagem"><div class="grafico grafico-calendario"></div></div>`;
      grafico?.dispose();
      graficos = graficos.filter((x) => x !== grafico);
      const c = g.coresTema();
      const maxDia = Math.max(1, ...dados.map(([, n]) => n));
      const base = g.baseGrafico(c);
      grafico = g.montarGrafico(el.querySelector('.grafico-calendario'), {
        ...base,
        tooltip: {
          ...base.tooltip, trigger: 'item',
          formatter: (p) => `${formatarData(p.value[0])}<br><strong>${plural(p.value[1], 'luta', 'lutas')}</strong>`,
        },
        visualMap: {
          show: false, min: 1, max: maxDia,
          inRange: { color: [c.neonFraco, c.neon] },
        },
        calendar: {
          range: String(ano), top: 28, left: 36, right: 8, bottom: 4, cellSize: ['auto', 15],
          splitLine: { show: false },
          itemStyle: { color: c.vazio, borderColor: c.fundo, borderWidth: 3 },
          yearLabel: { show: false },
          monthLabel: { nameMap: MESES, color: c.textoSuave, fontFamily: c.fonte },
          dayLabel: { firstDay: 0, nameMap: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'], color: c.textoFraco, fontFamily: c.fonte, fontSize: 10 },
        },
        series: [{ type: 'heatmap', coordinateSystem: 'calendar', data: dados, itemStyle: { borderRadius: 3, borderColor: c.fundo, borderWidth: 3 } }],
      });
      graficos.push(grafico);
    };
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-ano]');
      if (!b) return;
      estado.anoCalendario += Number(b.dataset.ano);
      desenhar();
    });
    desenhar();
  }

  // ---------- Atraso evento → 1ª visualização ----------
  function renderAtraso(lista, c) {
    const el = elConteudo.querySelector('.dash-atraso');
    const a = atraso(lista);
    const m = a.maior;
    el.innerHTML = `
      <div class="dash-secao-topo">
        <div><h2>Atraso pra assistir</h2><small>da data do evento até a 1ª visualização</small></div>
      </div>
      ${a.total ? `
      <div class="dash-atraso-corpo">
        <div class="grafico" data-grafico="atraso"></div>
        <div class="dash-atraso-numeros">
          <div class="numero"><strong>${esc(formatarDias(a.mediana))}</strong><span>atraso mediano</span></div>
          <div class="numero"><strong>${esc(formatarDias(m.dias))}</strong><span>maior atraso</span>
            <button type="button" class="dash-maior" data-luta="${m.item.luta.id}">${esc(m.item.confronto)}<small>${esc(m.item.evento.nome)} · ${formatarData(m.item.evento.data)}</small></button>
          </div>
        </div>
      </div>` : '<p class="dash-nada">Nenhuma luta com data do evento.</p>'}`;
    el.querySelector('.dash-maior')?.addEventListener('click', () => abrirDetalheLuta(m.item, ctx));
    if (!a.total) return;
    const base = g.baseGrafico(c);
    montar('[data-grafico="atraso"]', {
      ...base,
      tooltip: { ...base.tooltip, formatter: ([p]) => `${esc(p.name)}<br><strong>${plural(p.value, 'luta', 'lutas')}</strong>` },
      xAxis: { ...g.eixoCategorias(c, a.faixas.map((f) => f.nome)), axisLabel: { color: c.textoSuave, interval: 0, width: 70, overflow: 'break' } },
      yAxis: g.eixoValores(c, { minInterval: 1 }),
      series: [{ type: 'bar', name: 'Lutas', data: a.faixas.map((f) => f.qtd), barMaxWidth: 48, itemStyle: { color: c.neon, borderRadius: [4, 4, 0, 0] } }],
    });
  }

  // ---------- Lutas 5★ e acima de 4½ ----------
  function renderDestaques(lista) {
    const el = elConteudo.querySelector('.dash-destaques');
    const dados = destaques(lista);
    let todos = false;
    const desenhar = () => {
      const mostrar = todos ? dados : dados.slice(0, DESTAQUES_INICIAL);
      el.innerHTML = `
        <div class="dash-secao-topo">
          <div><h2 class="dash-titulo-ouro">★ 5 Stars e acima de 4½</h2><small>nota mais recente · de 4.50 pra cima</small></div>
          <span class="contador">${plural(dados.length, 'luta', 'lutas')}</span>
        </div>
        ${dados.length ? `<div class="grade-lutas">${mostrar.map((i) => htmlCardLuta(i, ctx)).join('')}</div>
          ${dados.length > DESTAQUES_INICIAL ? `<button type="button" class="botao botao-fantasma botao-pequeno dash-mais" data-destaques-todos>
            ${todos ? 'Mostrar menos' : `Mostrar todas (${dados.length})`}</button>` : ''}`
        : '<p class="dash-nada">Nenhuma luta com 4.50 ★ ou mais.</p>'}`;
    };
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-destaques-todos]')) {
        todos = !todos;
        return desenhar();
      }
      const id = e.target.closest('[data-luta]')?.dataset.luta;
      const item = id && dados.find((i) => i.luta.id === id);
      if (item) abrirDetalheLuta(item, ctx);
    });
    desenhar();
  }

  render();
}
