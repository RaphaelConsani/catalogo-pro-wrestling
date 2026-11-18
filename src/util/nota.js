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

// Faixa de cor da nota: 0 (0–0.75), 1 (1–1.75), 2, 3, 4 (4–4.75) e 5 (5.00, dourado com brilho).
// Serve também pra médias (4.83 fica na faixa 4). null = sem nota.
export const faixaNota = (n) => (n == null || Number.isNaN(n) ? null : n >= NOTA_MAX ? 5 : Math.max(0, Math.floor(n)));

// Classes pro HTML: " faixa faixa-N" (com espaço na frente) ou "" sem nota.
export function classeFaixa(n) {
  const f = faixaNota(n);
  return f == null ? '' : ` faixa faixa-${f}`;
}
