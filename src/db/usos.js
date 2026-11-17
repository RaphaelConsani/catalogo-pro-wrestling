import { db } from './schema.js';
import { plural } from '../util/texto.js';

// Lista onde um registro é usado (só considera registros ativos).
// Retorna frases como ["3 eventos", "1 título"]; vazio = pode excluir.
const vivo = (r) => !r.excluidoEm;
const contar = (tabela, filtro) => db.table(tabela).filter((r) => vivo(r) && filtro(r)).count();
const ladosUsam = (r, f) => (r.lados ?? []).some(f);
// Item do backlog já concluído não prende o cadastro.
const contarBacklog = (filtro) => contar('backlog', (r) => !r.concluidoEm && filtro(r));

const REGRAS = {
  empresas: (id) => [
    [contar('eventos', (r) => r.empresaId === id || (r.parceirasIds ?? []).includes(id)), 'evento', 'eventos'],
    [contar('wrestlers', (r) => r.empresaId === id), 'wrestler', 'wrestlers'],
    [contar('titulos', (r) => r.empresaId === id), 'título', 'títulos'],
  ],
  eventos: (id) => [
    [contar('lutas', (r) => r.eventoId === id), 'luta', 'lutas'],
    [contarBacklog((r) => r.eventoId === id), 'item do backlog', 'itens do backlog'],
  ],
  wrestlers: (id) => [
    [contar('lutas', (r) => (r.wrestlersIds ?? []).includes(id)), 'luta', 'lutas'],
    [contar('equipes', (r) => (r.membrosIds ?? []).includes(id)), 'equipe', 'equipes'],
    [contarBacklog((r) => ladosUsam(r, (l) => (l.wrestlersIds ?? []).includes(id))), 'item do backlog', 'itens do backlog'],
  ],
  equipes: (id) => [
    [contar('lutas', (r) => ladosUsam(r, (l) => l.equipeId === id)), 'luta', 'lutas'],
    [contarBacklog((r) => ladosUsam(r, (l) => l.equipeId === id)), 'item do backlog', 'itens do backlog'],
  ],
  tiposMatch: (id) => [
    [contar('lutas', (r) => r.tipoMatchId === id), 'luta', 'lutas'],
    [contarBacklog((r) => r.tipoMatchId === id), 'item do backlog', 'itens do backlog'],
  ],
  estipulacoes: (id) => [
    [contar('lutas', (r) => (r.estipulacoesIds ?? []).includes(id)), 'luta', 'lutas'],
    [contarBacklog((r) => (r.estipulacoesIds ?? []).includes(id)), 'item do backlog', 'itens do backlog'],
  ],
  titulos: (id) => [[contar('lutas', (r) => r.tituloId === id), 'luta', 'lutas']],
  plataformas: (id) => [[contar('visualizacoes', (r) => r.plataformaId === id), 'visualização', 'visualizações']],
  metodosVitoria: (id) => [[contar('lutas', (r) => r.metodoVitoriaId === id), 'luta', 'lutas']],
};

export async function usosDe(tabela, id) {
  const regras = REGRAS[tabela]?.(id) ?? [];
  const contagens = await Promise.all(regras.map(([p]) => p));
  return regras.map(([, s, p], i) => (contagens[i] ? plural(contagens[i], s, p) : null)).filter(Boolean);
}
