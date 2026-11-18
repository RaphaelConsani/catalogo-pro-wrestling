import { ativos } from './repo.js';
import { ordenarVisualizacoes, confronto, nomeLado } from './lutas.js';
import { normalizar } from '../util/texto.js';

// Carrega tudo o que as telas de consulta precisam e devolve as lutas "enriquecidas".
// Regras (docs/ESCOPO.md):
//   - nota da luta = nota da visualização MAIS RECENTE (por data)
//   - contagens/calendário usam a PRIMEIRA visualização
export async function carregarCatalogo() {
  const nomes = ['lutas', 'visualizacoes', 'eventos', 'empresas', 'wrestlers', 'equipes', 'tiposMatch', 'estipulacoes', 'titulos', 'plataformas', 'metodosVitoria'];
  const listas = await Promise.all(nomes.map(ativos));
  const [lutas, visualizacoes, eventos, empresas, wrestlers, equipes, tipos, estipulacoes, titulos, plataformas, metodos] = listas;
  const mapa = (l) => new Map(l.map((x) => [x.id, x]));
  const ctx = {
    eventos: mapa(eventos),
    empresas: mapa(empresas),
    wrestlers: mapa(wrestlers),
    equipes: mapa(equipes),
    tipos: mapa(tipos),
    estipulacoes: mapa(estipulacoes),
    titulos: mapa(titulos),
    plataformas: mapa(plataformas),
    metodos: mapa(metodos),
  };

  const visPorLuta = new Map();
  for (const v of visualizacoes) {
    if (!visPorLuta.has(v.lutaId)) visPorLuta.set(v.lutaId, []);
    visPorLuta.get(v.lutaId).push(v);
  }

  const itens = lutas.map((luta) => {
    const vs = ordenarVisualizacoes(visPorLuta.get(luta.id) ?? []);
    const evento = ctx.eventos.get(luta.eventoId) ?? null;
    const empresa = ctx.empresas.get(evento?.empresaId) ?? null;
    const empresasIds = [evento?.empresaId, ...(evento?.parceirasIds ?? [])].filter(Boolean);
    const tipo = ctx.tipos.get(luta.tipoMatchId) ?? null;
    const estips = luta.estipulacoesIds.map((id) => ctx.estipulacoes.get(id)).filter(Boolean);
    const titulo = ctx.titulos.get(luta.tituloId) ?? null;
    const item = {
      luta,
      visualizacoes: vs,
      evento,
      empresa,
      empresasIds,
      tipo,
      estipulacoes: estips,
      titulo,
      nota: vs.at(-1)?.nota ?? null,
      primeiraVisualizacao: vs[0]?.data ?? null,
      ultimaVisualizacao: vs.at(-1)?.data ?? null,
      ano: evento?.data ? Number(evento.data.slice(0, 4)) : null,
      confronto: confronto(luta, ctx),
    };
    item.busca = normalizar(
      [
        item.confronto,
        ...luta.wrestlersIds.map((id) => ctx.wrestlers.get(id)?.nome ?? ''),
        evento?.nome,
        ...empresasIds.map((id) => `${ctx.empresas.get(id)?.nome ?? ''} ${ctx.empresas.get(id)?.sigla ?? ''}`),
        tipo?.nome,
        ...estips.map((e) => e.nome),
        titulo?.nome,
        ctx.metodos.get(luta.metodoVitoriaId)?.nome,
        luta.observacoes,
      ].join(' '),
    );
    return item;
  });

  return { itens, ctx, listas: { eventos, empresas, wrestlers, equipes, tipos, estipulacoes, titulos, plataformas, metodos } };
}

// Como um wrestler se saiu numa luta: 'vitoria' | 'derrota' | 'empate' | 'no_contest'
export function desfechoPara(luta, wrestlerId) {
  if (luta.resultado === 'no_contest') return 'no_contest';
  if (luta.resultado !== 'vitoria') return 'empate';
  const lado = luta.lados.findIndex((l) => l.wrestlersIds.includes(wrestlerId));
  return lado === luta.ladoVencedor ? 'vitoria' : 'derrota';
}

export const NOME_RESULTADO = { vitoria: 'Vitória', draw: 'Draw', time_limit_draw: 'Time Limit Draw', no_contest: 'No Contest' };

export function textoResultado(luta, ctx) {
  if (luta.resultado !== 'vitoria') return NOME_RESULTADO[luta.resultado];
  const lado = luta.lados[luta.ladoVencedor];
  return lado ? nomeLado(lado, ctx) : '?';
}
