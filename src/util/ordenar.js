// Comparadores de ordenação usados pela Biblioteca e pelo Backlog.

// Strings ISO (datas) ou vazias: compara como texto, vazio primeiro.
export const cmp = (a, b) => (a ?? '').localeCompare(b ?? '');

const alfa = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });

// Ordem alfabética pelo texto que f(item) devolve; dir = 1 (A–Z) ou -1 (Z–A).
// Texto vazio vai sempre pro fim, nas duas direções.
export const porTexto = (f, dir = 1) => (a, b) => {
  const x = f(a) ?? '';
  const y = f(b) ?? '';
  if (!x || !y) return (x ? 0 : 1) - (y ? 0 : 1);
  return dir * alfa.compare(x, y);
};
