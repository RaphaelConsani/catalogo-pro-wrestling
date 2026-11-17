// Mensagem curta no canto da tela.
let caixa;

export function toast(texto, tipo = 'ok') {
  if (!caixa) {
    caixa = document.createElement('div');
    caixa.className = 'toasts';
    caixa.setAttribute('role', 'status');
    document.body.append(caixa);
  }
  const t = document.createElement('div');
  t.className = `toast toast-${tipo}`;
  t.textContent = texto;
  caixa.append(t);
  requestAnimationFrame(() => t.classList.add('visivel'));
  setTimeout(() => {
    t.classList.remove('visivel');
    setTimeout(() => t.remove(), 250);
  }, 2600);
}
