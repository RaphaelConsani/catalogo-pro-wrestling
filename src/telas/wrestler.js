import { carregarCatalogo, desfechoPara } from '../db/catalogo.js';
import { urlsImagens } from '../db/repo.js';
import { htmlCardLuta } from '../componentes/card-luta.js';
import { abrirDetalheLuta } from '../componentes/detalhe-luta.js';
import { htmlEstrelas } from '../componentes/nota.js';
import { ORDENACOES, ordenar } from './biblioteca.js';
import { esc, iniciais, plural } from '../util/texto.js';
import { coresTema, baseGrafico, eixoCategorias, eixoValores, montarGrafico } from '../util/graficos.js';

const media = (ns) => (ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : null);
const fmt2 = (n) => n.toFixed(2);

export async function telaWrestler(container, { id }) {
  const { itens, ctx } = await carregarCatalogo();
  const w = ctx.wrestlers.get(id);
  if (!w) {
    container.innerHTML = `<div class="vazio"><div><strong>Wrestler não encontrado</strong><span>Ele pode ter sido excluído.</span></div></div>`;
    return;
  }
  const empresa = ctx.empresas.get(w.empresaId);
  const url = await urlsImagens([w.imagemId]);
  const lutas = itens.filter((i) => i.luta.wrestlersIds.includes(id));

  // Números: nota média usa a nota mais recente de cada luta.
  const notas = lutas.map((i) => i.nota).filter((n) => n != null);
  const nMedia = media(notas);
  const recorde = { vitoria: 0, derrota: 0, empate: 0, no_contest: 0 };
  for (const i of lutas) recorde[desfechoPara(i.luta, id)]++;
  const equipes = [...ctx.equipes.values()].filter((e) => e.membrosIds.includes(id));

  container.innerHTML = `
    <section class="wrestler-cabecalho" style="--cor-empresa:${esc(empresa?.cor ?? '#3a4152')}">
      <span class="moldura moldura-foto wrestler-foto${url(w.imagemId) ? '' : ' sem-imagem'}">
        ${url(w.imagemId) ? `<img src="${url(w.imagemId)}" alt="" />` : `<span class="moldura-marcador">${esc(iniciais(w.nome))}</span>`}
      </span>
      <div class="wrestler-identidade">
        <span class="tela-rotulo">Wrestler</span>
        <h1 class="tela-titulo">${esc(w.nome)}</h1>
        <p class="wrestler-sub">
          ${empresa ? `<span class="etiqueta-empresa">${esc(empresa.nome)}</span>` : '<span>Sem empresa atual</span>'}
          ${equipes.length ? `<span>${equipes.map((e) => esc(e.nome)).join(' · ')}</span>` : ''}
        </p>
      </div>
    </section>

    <section class="numeros">
      <div class="numero"><strong>${lutas.length}</strong><span>${lutas.length === 1 ? 'luta assistida' : 'lutas assistidas'}</span></div>
      <div class="numero${nMedia >= 4.5 ? ' alta' : ''}">
        <strong>${nMedia == null ? '—' : fmt2(nMedia)}</strong>
        <span>${nMedia == null ? 'nota média' : htmlEstrelas(nMedia, `estrelas-pequenas${nMedia >= 4.5 ? ' cinco' : ''}`) + ' nota média'}</span>
      </div>
      <div class="numero"><strong>${recorde.vitoria}<small>V</small> ${recorde.derrota}<small>D</small> ${recorde.empate}<small>E</small></strong>
        <span>recorde${recorde.no_contest ? ` · ${plural(recorde.no_contest, 'No Contest', 'No Contests')}` : ''}</span></div>
    </section>

    ${lutas.length ? `
    <section class="graficos-wrestler">
      <div class="grafico-caixa"><h2>Lutas por ano</h2><small>ano do evento</small><div class="grafico" data-grafico="lutas"></div></div>
      <div class="grafico-caixa"><h2>Nota média por ano</h2><small>ano do evento · nota mais recente</small><div class="grafico" data-grafico="notas"></div></div>
    </section>` : ''}

    <section class="wrestler-lutas">
      <div class="barra-ferramentas">
        <h2 class="secao-inicio-titulo">Lutas</h2>
        <span class="contador"></span>
        <select class="campo-entrada ordem" aria-label="Ordenar">
          ${Object.entries(ORDENACOES).map(([k, o]) => `<option value="${k}">${o.nome}</option>`).join('')}
        </select>
      </div>
      <div class="grade-lutas"></div>
    </section>`;

  const elGrade = container.querySelector('.grade-lutas');
  const render = (ordem) => {
    elGrade.innerHTML = lutas.length
      ? ordenar(lutas, ordem).map((i) => htmlCardLuta(i, ctx)).join('')
      : `<div class="vazio"><div><strong>Nenhuma luta assistida com ${esc(w.nome)}</strong></div></div>`;
  };
  container.querySelector('.ordem').addEventListener('change', (e) => render(e.target.value));
  elGrade.addEventListener('click', (e) => {
    const lutaId = e.target.closest('[data-luta]')?.dataset.luta;
    const item = lutaId && lutas.find((i) => i.luta.id === lutaId);
    if (item) abrirDetalheLuta(item, ctx);
  });
  render('recente');

  if (lutas.length) desenharGraficos(container, lutas);
}

function desenharGraficos(container, lutas) {
  const comAno = lutas.filter((i) => i.ano);
  if (!comAno.length) return;
  const min = Math.min(...comAno.map((i) => i.ano));
  const max = Math.max(...comAno.map((i) => i.ano));
  const anos = Array.from({ length: max - min + 1 }, (_, k) => min + k);
  const porAno = anos.map((a) => comAno.filter((i) => i.ano === a));
  const qtd = porAno.map((l) => l.length);
  const medias = porAno.map((l) => {
    const m = media(l.map((i) => i.nota).filter((n) => n != null));
    return m == null ? null : Number(m.toFixed(2));
  });

  const c = coresTema();
  const base = baseGrafico(c);
  montarGrafico(container.querySelector('[data-grafico="lutas"]'), {
    ...base,
    xAxis: eixoCategorias(c, anos),
    yAxis: eixoValores(c, { minInterval: 1 }),
    series: [{ type: 'bar', data: qtd, name: 'Lutas', barMaxWidth: 28, itemStyle: { color: c.neon, borderRadius: [4, 4, 0, 0] } }],
  });
  montarGrafico(container.querySelector('[data-grafico="notas"]'), {
    ...base,
    tooltip: { ...base.tooltip, axisPointer: { type: 'line', lineStyle: { color: c.borda } }, valueFormatter: (v) => (v == null ? '—' : fmt2(v)) },
    xAxis: eixoCategorias(c, anos),
    yAxis: eixoValores(c, { min: 0, max: 5, interval: 1 }),
    series: [{
      type: 'line', data: medias, name: 'Nota média', connectNulls: true, smooth: 0.3, symbolSize: 8,
      lineStyle: { color: c.neon, width: 3 }, itemStyle: { color: c.neon },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: c.neonFraco }, { offset: 1, color: 'rgba(0,0,0,0)' }] } },
    }],
  });
}
