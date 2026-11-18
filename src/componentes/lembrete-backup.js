import { situacaoLembrete, dispensarLembrete, exportarBackup } from '../db/backup.js';
import { toast } from './toast.js';
import { ehIOS } from '../util/aparelho.js';

// Faixa abaixo do menu quando faz 7 dias ou mais sem backup (ou sem nenhum, contando
// da 1ª luta). Some ao exportar; o ✕ esconde até o dia seguinte.
export function montarLembreteBackup(el) {
  async function atualizar() {
    let s = null;
    try {
      // Com a sincronização, o lembrete fica só no Mac (decisão da fase 2).
      s = ehIOS() ? null : await situacaoLembrete();
    } catch (erro) {
      console.error('Erro ao conferir o lembrete de backup:', erro);
    }
    if (!s) {
      el.hidden = true;
      el.replaceChildren();
      return;
    }
    el.hidden = false;
    el.innerHTML = `<div class="lembrete-conteudo">
      <span class="lembrete-icone" aria-hidden="true">!</span>
      <span class="lembrete-texto">${s.nunca
        ? `Você ainda não fez nenhum backup. Suas lutas estão só neste navegador.`
        : `Faz ${s.dias} dias desde o último backup.`}</span>
      <button type="button" class="botao botao-primario botao-pequeno lembrete-exportar">Exportar agora</button>
      <button type="button" class="botao-icone lembrete-fechar" aria-label="Lembrar amanhã" title="Lembrar amanhã">✕</button>
    </div>`;
  }

  el.addEventListener('click', async (e) => {
    if (e.target.closest('.lembrete-fechar')) {
      await dispensarLembrete();
      return atualizar();
    }
    const b = e.target.closest('.lembrete-exportar');
    if (b) {
      b.disabled = true;
      b.textContent = 'Gerando…';
      try {
        await exportarBackup();
        toast('Backup exportado');
      } catch (erro) {
        console.error(erro);
        toast('Não deu pra gerar o backup', 'erro');
        atualizar();
      }
    }
  });

  window.addEventListener('backup-feito', atualizar);
  return { atualizar };
}
