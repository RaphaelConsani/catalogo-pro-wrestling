import { abrirPainel } from './painel.js';
import { htmlEstrelas } from './nota.js';
import { esc, formatarData } from '../util/texto.js';
import { formatarNota, classeFaixa } from '../util/nota.js';
import { segundosParaDuracao } from '../util/duracao.js';
import { NOME_RESULTADO } from '../db/catalogo.js';

// Detalhe da luta no painel lateral, com o histórico de visualizações.
// item: entrada de carregarCatalogo().itens · ctx: mapas do catálogo
export function abrirDetalheLuta(item, ctx) {
  const { luta, evento, empresa, nota, visualizacoes } = item;

  const lados = luta.lados
    .map((l, i) => {
      const venceu = luta.resultado === 'vitoria' && luta.ladoVencedor === i;
      const equipe = l.equipeId ? ctx.equipes.get(l.equipeId) : null;
      const nomes = l.wrestlersIds
        .map((id) => {
          const w = ctx.wrestlers.get(id);
          return w ? `<a href="#/wrestler/${id}">${esc(w.nome)}</a>` : '<span>(wrestler excluído)</span>';
        })
        .join('');
      return `<div class="detalhe-lado${venceu ? ' venceu' : ''}">
        ${venceu ? '<span class="detalhe-venceu">Venceu</span>' : ''}
        ${equipe ? `<strong class="detalhe-equipe">${esc(equipe.nome)}</strong>` : ''}
        <div class="detalhe-wrestlers">${nomes}</div>
      </div>`;
    })
    .join('<span class="detalhe-vs">vs</span>');

  const parceiras = (evento?.parceirasIds ?? []).map((id) => ctx.empresas.get(id)?.sigla).filter(Boolean);
  const info = [
    ['Resultado', luta.resultado === 'vitoria' ? `Vitória${luta.metodoVitoriaId ? ` por ${esc(ctx.metodos.get(luta.metodoVitoriaId)?.nome ?? '?')}` : ''}` : NOME_RESULTADO[luta.resultado]],
    ['Tipo', esc(item.tipo?.nome ?? '?')],
    ['Estipulações', item.estipulacoes.length ? item.estipulacoes.map((e) => esc(e.nome)).join(', ') : null],
    ['Título', item.titulo ? `♛ ${esc(item.titulo.nome)}` : null],
    ['Duração', luta.duracaoSeg != null ? segundosParaDuracao(luta.duracaoSeg) : null],
    ['Evento', `${esc(evento?.nome ?? '?')} · ${formatarData(evento?.data)}<br><small>${esc(empresa?.nome ?? '')}${parceiras.length ? ` × ${parceiras.map(esc).join(' × ')}` : ''}</small>`],
    ['Link', luta.link ? `<a href="${esc(luta.link)}" target="_blank" rel="noopener noreferrer">${esc(luta.link.replace(/^https?:\/\//, ''))}</a>` : null],
  ].filter(([, v]) => v);

  const historico = visualizacoes
    .map((v, i) => {
      const plat = ctx.plataformas.get(v.plataformaId);
      const recente = i === visualizacoes.length - 1;
      return `<li class="${recente ? 'recente' : ''}">
        <span class="hist-ordem">${i + 1}ª</span>
        <span class="hist-data">${formatarData(v.data)}</span>
        <span class="hist-nota${classeFaixa(v.nota)}">${htmlEstrelas(v.nota, 'estrelas-pequenas')}<strong>${esc(formatarNota(v.nota))}</strong></span>
        <span class="hist-plataforma">${esc(plat?.nome ?? '—')}</span>
      </li>`;
    })
    .join('');

  const conteudo = document.createElement('div');
  conteudo.className = `detalhe-luta${nota === 5 ? ' cinco-estrelas' : ''}`;
  conteudo.style.setProperty('--cor-empresa', empresa?.cor ?? '#3a4152');
  conteudo.innerHTML = `
    <div class="detalhe-nota${classeFaixa(nota)}">
      ${htmlEstrelas(nota)}
      <strong>${esc(formatarNota(nota))}</strong>
      <small>nota mais recente</small>
    </div>
    <div class="detalhe-lados">${lados}</div>
    <dl class="detalhe-info">${info.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
    ${luta.observacoes ? `<div class="detalhe-obs"><h3>Observações</h3><p></p></div>` : ''}
    <div class="detalhe-historico">
      <h3>Visualizações <span>${visualizacoes.length}</span></h3>
      <ol>${historico}</ol>
    </div>`;
  if (luta.observacoes) conteudo.querySelector('.detalhe-obs p').textContent = luta.observacoes;

  const rodape = document.createElement('div');
  rodape.className = 'formulario-acoes';
  rodape.innerHTML = `<span class="espaco"></span>
    <button type="button" class="botao botao-fantasma" data-fechar>Fechar</button>
    <a class="botao botao-primario" href="#/luta/${luta.id}/editar">Editar luta</a>`;

  abrirPainel({
    titulo: item.confronto,
    subtitulo: `${empresa?.sigla ?? ''} · ${evento?.nome ?? ''}`,
    conteudo,
    rodape,
  });
}
