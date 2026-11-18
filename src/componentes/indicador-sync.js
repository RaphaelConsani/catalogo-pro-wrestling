import { aoMudarEstado } from '../db/sincronizacao.js';

// Ícone de nuvem no topo com a situação da sincronização (leva pra tela Dados).
// Some quando a sincronização está desligada neste aparelho.
const NUVEM = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M7 18h10.5a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.4 9.1 4.5 4.5 0 0 0 7 18z"/></svg>`;

const TEXTOS = {
  ok: 'Sincronizado',
  sincronizando: 'Sincronizando…',
  offline: 'Sem conexão: sincroniza quando a internet voltar',
  erro: 'Problema na sincronização (veja em Dados)',
};

const hora = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export function montarIndicadorSync(el) {
  el.innerHTML = NUVEM;
  aoMudarEstado((e) => {
    el.hidden = e.situacao === 'desligada';
    el.className = `indicador-sync ${e.situacao}`;
    const texto = e.situacao === 'ok' && e.ultimaSync ? `Sincronizado às ${hora(e.ultimaSync)}` : TEXTOS[e.situacao] ?? '';
    el.title = texto;
    el.setAttribute('aria-label', texto);
  });
}
