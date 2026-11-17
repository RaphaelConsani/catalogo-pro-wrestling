import { esc, formatarData } from '../util/texto.js';
import { formatarNota } from '../util/nota.js';
import { nomeLado } from '../db/lutas.js';
import { htmlEstrelas } from './nota.js';

// Card tipográfico da luta (sem imagens), na cor da empresa.
// 5 estrelas: borda dourada com brilho + selo. 4½ ou mais: nota dourada.
export function htmlCardLuta(item, ctx) {
  const { luta, evento, empresa, nota } = item;
  const cinco = nota === 5;
  const alta = nota != null && nota >= 4.5;
  const lados = luta.lados.map((l, i) => {
    const venceu = luta.resultado === 'vitoria' && luta.ladoVencedor === i;
    return `<span class="card-luta-lado${venceu ? ' venceu' : ''}">${esc(nomeLado(l, ctx))}</span>`;
  });
  const detalhes = [item.tipo?.nome, ...item.estipulacoes.map((e) => e.nome)].filter(Boolean).map(esc).join(' · ');
  return `<button type="button" class="card-luta${cinco ? ' cinco-estrelas' : ''}${alta ? ' nota-alta' : ''}" data-luta="${luta.id}"
      style="--cor-empresa:${esc(empresa?.cor ?? '#3a4152')}">
    ${cinco ? '<span class="selo-cinco">★ 5 Stars</span>' : ''}
    <span class="card-luta-topo">${esc(empresa?.sigla || empresa?.nome || '?')} · ${esc(evento?.nome ?? '?')} · ${evento?.data ? formatarData(evento.data) : 'Sem data'}</span>
    <span class="card-luta-confronto">${lados.join('<span class="card-luta-vs">vs</span>')}</span>
    ${item.titulo ? `<span class="card-luta-titulo">♛ ${esc(item.titulo.nome)}</span>` : ''}
    <span class="card-luta-rodape">
      <span class="card-luta-detalhes">${detalhes}</span>
      <span class="card-luta-nota">
        ${htmlEstrelas(nota, `estrelas-pequenas${alta ? ' cinco' : ''}`)}
        <strong>${esc(formatarNota(nota))}</strong>
      </span>
    </span>
  </button>`;
}
