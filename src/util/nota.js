// Nota na escala do Meltzer: 0 a 5 em passos de 0,25. 0 = DUD.
export const NOTA_MIN = 0;
export const NOTA_MAX = 5;
export const PASSO = 0.25;

// Número com ponto e duas casas, como nos sites de wrestling: 4.5 -> "4.50"
export const formatarNumeroNota = (n) => (n == null ? '' : n.toFixed(2));

// 4.25 -> "4.25 ★" · 0 -> "DUD" · null -> ""
export function formatarNota(n) {
  if (n == null) return '';
  if (n === 0) return 'DUD';
  return `${formatarNumeroNota(n)} ★`;
}

export const notaValida = (n) => typeof n === 'number' && n >= NOTA_MIN && n <= NOTA_MAX && Number.isInteger(n / PASSO);
