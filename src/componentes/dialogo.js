// Diálogo de confirmação no tema do app (substitui o confirm() do navegador).
export function confirmar({ titulo, mensagem, confirmarTexto = 'Confirmar', perigo = false, cancelarTexto = 'Cancelar' }) {
  return new Promise((resolve) => {
    const d = document.createElement('dialog');
    d.className = 'dialogo';
    d.innerHTML = `
      <h3></h3>
      <p></p>
      <div class="dialogo-acoes">
        ${cancelarTexto ? `<button type="button" class="botao botao-fantasma" value="nao"></button>` : ''}
        <button type="button" class="botao ${perigo ? 'botao-perigo' : 'botao-primario'}" value="sim"></button>
      </div>`;
    d.querySelector('h3').textContent = titulo;
    d.querySelector('p').textContent = mensagem;
    d.querySelector('[value="sim"]').textContent = confirmarTexto;
    if (cancelarTexto) d.querySelector('[value="nao"]').textContent = cancelarTexto;
    d.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (b) d.close(b.value);
      else if (e.target === d) d.close('nao');
    });
    d.addEventListener('close', () => {
      resolve(d.returnValue === 'sim');
      d.remove();
    });
    document.body.append(d);
    d.showModal();
    d.querySelector('[value="sim"]').focus();
  });
}

export const avisar = ({ titulo, mensagem }) =>
  confirmar({ titulo, mensagem, confirmarTexto: 'Entendi', cancelarTexto: '' });
