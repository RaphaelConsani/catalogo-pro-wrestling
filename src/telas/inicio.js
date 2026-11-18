import { ativos } from '../db/repo.js';
import { ultimasLutas, confronto } from '../db/lutas.js';
import { htmlEstrelas } from '../componentes/nota.js';
import { esc, formatarData } from '../util/texto.js';
import { formatarNota, classeFaixa } from '../util/nota.js';

const RESULTADO = { draw: 'Draw', time_limit_draw: 'Time Limit Draw', no_contest: 'No Contest' };

export async function telaInicio(container) {
  container.innerHTML = `
    <section class="tela-cabecalho">
      <span class="tela-rotulo">Início</span>
      <h1 class="tela-titulo">Bem-vindo ao ringue</h1>
    </section>
    <section class="secao-inicio">
      <h2 class="secao-inicio-titulo">Últimas lutas registradas</h2>
      <div class="ultimas"></div>
    </section>`;

  const [itens, eventos, wrestlers, equipes, empresas, tipos] = await Promise.all([
    ultimasLutas(10),
    ...['eventos', 'wrestlers', 'equipes', 'empresas', 'tiposMatch'].map(ativos),
  ]);
  const mapa = (l) => new Map(l.map((x) => [x.id, x]));
  const ctx = { eventos: mapa(eventos), wrestlers: mapa(wrestlers), equipes: mapa(equipes), empresas: mapa(empresas), tipos: mapa(tipos) };

  const el = container.querySelector('.ultimas');
  if (!itens.length) {
    el.innerHTML = `<div class="vazio"><div>
      <div class="vazio-icone" aria-hidden="true">★</div>
      <strong>Nenhuma luta registrada ainda</strong>
      <span><a href="#/nova-luta">Registrar a primeira luta</a></span>
    </div></div>`;
    return;
  }

  el.innerHTML = itens
    .map(({ luta, visualizacoes }) => {
      const ev = ctx.eventos.get(luta.eventoId);
      const emp = ctx.empresas.get(ev?.empresaId);
      // Nota mais recente = última visualização (por data).
      const nota = visualizacoes.at(-1)?.nota ?? null;
      const resultado =
        luta.resultado === 'vitoria'
          ? `Venceu: ${(luta.lados[luta.ladoVencedor] && confronto({ lados: [luta.lados[luta.ladoVencedor]] }, ctx)) || '?'}`
          : RESULTADO[luta.resultado];
      return `<a class="luta-linha${nota === 5 ? ' destaque' : ''}" href="#/luta/${luta.id}/editar" style="--cor-empresa:${esc(emp?.cor ?? 'var(--borda-forte)')}">
        <span class="luta-linha-nota${classeFaixa(nota)}">
          ${htmlEstrelas(nota, 'estrelas-pequenas')}
          <strong>${esc(formatarNota(nota))}</strong>
        </span>
        <span class="luta-linha-corpo">
          <span class="luta-linha-confronto">${esc(confronto(luta, ctx))}</span>
          <span class="luta-linha-meta">${esc(ev?.nome ?? '?')} · ${formatarData(ev?.data)} · ${esc(emp?.sigla ?? '')} · ${esc(ctx.tipos.get(luta.tipoMatchId)?.nome ?? '')}</span>
        </span>
        <span class="luta-linha-resultado">${esc(resultado)}${visualizacoes.length > 1 ? `<small>${visualizacoes.length} visualizações</small>` : ''}</span>
      </a>`;
    })
    .join('');
}
