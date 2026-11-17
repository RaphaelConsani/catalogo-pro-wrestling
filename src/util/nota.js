// Nota na escala do Meltzer: 0 a 5 em passos de 0,25. 0 = DUD.
export const NOTA_MIN = 0;
export const NOTA_MAX = 5;
export const PASSO = 0.25;

const FRACOES = { 0: '', 0.25: '¼', 0.5: '½', 0.75: '¾' };

// 4.25 -> "****¼" · 0 -> "DUD" · null -> ""
export function formatarNota(n) {
  if (n == null) return '';
  if (n === 0) return 'DUD';
  const inteiro = Math.floor(n);
  return '*'.repeat(inteiro) + FRACOES[n - inteiro];
}

// 4.25 -> "4,25"
export const formatarNumeroNota = (n) => (n == null ? '' : n.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));

export const notaValida = (n) => typeof n === 'number' && n >= NOTA_MIN && n <= NOTA_MAX && Number.isInteger(n / PASSO);
