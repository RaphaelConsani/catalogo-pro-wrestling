// Duração digitada como mm:ss (minutos podem passar de 59, até 3 dígitos). Guardada em segundos.

// Formata enquanto digita: só dígitos, dois últimos são os segundos. "2345" -> "23:45"
export function mascararDuracao(texto) {
  const d = String(texto).replace(/\D/g, '').replace(/^0+(?=\d{4})/, '').slice(-5);
  if (!d) return '';
  if (d.length <= 2) return d;
  return `${d.slice(0, -2)}:${d.slice(-2)}`;
}

// "23:45" -> 1425 · "45" -> 45 (só segundos) · "" -> null · inválido -> NaN
export function duracaoParaSegundos(texto) {
  if (!texto) return null;
  if (/^\d{1,2}$/.test(texto)) texto = `0:${texto.padStart(2, '0')}`;
  const m = /^(\d{1,3}):(\d{2})$/.exec(texto);
  if (!m) return NaN;
  const seg = Number(m[2]);
  if (seg > 59) return NaN;
  return Number(m[1]) * 60 + seg;
}

export function segundosParaDuracao(seg) {
  if (seg == null) return '';
  const m = Math.floor(seg / 60);
  return `${String(m).padStart(2, '0')}:${String(seg % 60).padStart(2, '0')}`;
}
