// Normaliza pra comparação/busca: sem acentos, minúsculo, espaços simples.
export const normalizar = (s = '') =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');

// Escapa texto do usuário antes de inserir em HTML.
const MAPA = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s = '') => String(s ?? '').replace(/[&<>"']/g, (c) => MAPA[c]);

// "2024-03-31" -> "31/03/2024"
export const formatarData = (iso) => (iso ? iso.split('-').reverse().join('/') : 'Sem data');

export const iniciais = (nome = '') =>
  nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

export const plural = (n, singular, pluralTxt) => `${n} ${n === 1 ? singular : pluralTxt}`;
