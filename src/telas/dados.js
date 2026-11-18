import { exportarBackup, lerBackup, importarBackup, lerConfig, BackupInvalido, DIAS_LEMBRETE } from '../db/backup.js';
import { exportarExcel } from '../db/excel.js';
import { contarAtivos } from '../db/repo.js';
import { db } from '../db/schema.js';
import { confirmar, avisar } from '../componentes/dialogo.js';
import { toast } from '../componentes/toast.js';
import { esc, plural } from '../util/texto.js';
import { lerSync, prepararSubstituicao, cancelarSubstituicao, substituirNuvem, idDispositivo } from '../db/sincronizacao.js';
import { montarCartaoSync, montarCartaoDuplicados } from '../componentes/cartoes-sync.js';

const DIA_MS = 86400000;

function quando(iso) {
  const d = new Date(iso);
  const data = d.toLocaleDateString('pt-BR');
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dias = Math.floor((Date.now() - d.getTime()) / DIA_MS);
  const ha = dias <= 0 ? 'hoje' : dias === 1 ? 'ontem' : `há ${dias} dias`;
  return { texto: `${data} às ${hora}`, ha, dias };
}

export async function telaDados(container) {
  container.innerHTML = `
    <section class="tela-cabecalho">
      <span class="tela-rotulo">Backup e exportação</span>
      <h1 class="tela-titulo">Dados</h1>
      <p class="tela-descricao"></p>
    </section>
    <div class="dados-grade">
      <section class="sync-cartao"></section>
      <section class="duplicados-cartao" hidden></section>
      <section class="dados-cartao dados-backup">
        <span class="dados-icone" aria-hidden="true">⤓</span>
        <h2>Backup</h2>
        <div class="dados-ultimo"></div>
        <ul class="dados-conteudo"></ul>
        <p class="dados-dica">Um arquivo .json com tudo, inclusive as imagens. Guarde no iCloud Drive ou em outro lugar seguro.</p>
        <button type="button" class="botao botao-primario exportar-backup">Exportar backup</button>
      </section>
      <section class="dados-cartao">
        <span class="dados-icone" aria-hidden="true">⤒</span>
        <h2>Restaurar backup</h2>
        <p>Carrega um arquivo de backup e <strong>substitui tudo</strong> o que está no app pelo conteúdo dele.</p>
        <p class="dados-dica">Antes de trocar, o app mostra o que tem no arquivo e pede confirmação.</p>
        <label class="botao botao-fantasma importar-backup">
          Escolher arquivo…
          <input type="file" accept=".json,application/json" hidden />
        </label>
      </section>
      <section class="dados-cartao">
        <span class="dados-icone" aria-hidden="true">▦</span>
        <h2>Excel</h2>
        <p>Planilha com as abas <strong>Lutas</strong> (uma linha por luta) e <strong>Visualizações</strong> (todo o histórico).</p>
        <p class="dados-dica">Serve pra consultar e analisar fora do app. Não é backup: não volta pro app.</p>
        <button type="button" class="botao botao-fantasma exportar-excel">Exportar pra Excel</button>
      </section>
    </div>`;

  const $ = (s) => container.querySelector(s);

  async function renderDescricao() {
    const ligada = Boolean((await lerSync())?.chave);
    $('.tela-descricao').textContent = ligada
      ? 'Os dados ficam neste aparelho e sincronizados na nuvem. O backup continua sendo a sua cópia de segurança: exporte de vez em quando e guarde fora do app.'
      : 'Tudo fica salvo só neste navegador. Exporte o backup com frequência e guarde o arquivo fora do app.';
  }
  const duplicados = montarCartaoDuplicados($('.duplicados-cartao'), { idDispositivo });
  montarCartaoSync($('.sync-cartao'), { aoMudar: () => { renderDescricao(); duplicados.render(); } });
  renderDescricao();
  duplicados.render();

  async function renderBackup() {
    const [ultimo, lutas, vis, wrestlers, eventos, imagens] = await Promise.all([
      lerConfig('ultimoBackup'),
      contarAtivos('lutas'), contarAtivos('visualizacoes'), contarAtivos('wrestlers'), contarAtivos('eventos'),
      db.imagens.count(),
    ]);
    if (ultimo) {
      const q = quando(ultimo);
      const atrasado = q.dias >= DIAS_LEMBRETE;
      $('.dados-backup .dados-ultimo').innerHTML = `<span class="dados-ultimo-rotulo">Último backup</span>
        <strong class="${atrasado ? 'atrasado' : ''}">${esc(q.ha)}</strong><small>${esc(q.texto)}</small>`;
    } else {
      $('.dados-backup .dados-ultimo').innerHTML = `<span class="dados-ultimo-rotulo">Último backup</span>
        <strong class="${lutas ? 'atrasado' : ''}">nenhum ainda</strong>`;
    }
    $('.dados-conteudo').innerHTML = [
      plural(lutas, 'luta', 'lutas'), plural(vis, 'visualização', 'visualizações'),
      plural(eventos, 'evento', 'eventos'), plural(wrestlers, 'wrestler', 'wrestlers'), plural(imagens, 'imagem', 'imagens'),
    ].map((t) => `<li>${t}</li>`).join('');
  }

  // Botão ocupado enquanto trabalha (arquivo grande com imagens pode demorar).
  async function ocupado(botao, texto, tarefa) {
    const original = botao.textContent;
    botao.disabled = true;
    botao.textContent = texto;
    try {
      return await tarefa();
    } finally {
      botao.disabled = false;
      botao.textContent = original;
    }
  }

  $('.exportar-backup').addEventListener('click', async (e) => {
    try {
      await ocupado(e.currentTarget, 'Gerando…', exportarBackup);
      toast('Backup exportado');
      renderBackup();
    } catch (erro) {
      console.error(erro);
      toast('Não deu pra gerar o backup', 'erro');
    }
  });

  $('.exportar-excel').addEventListener('click', async (e) => {
    try {
      const r = await ocupado(e.currentTarget, 'Gerando…', exportarExcel);
      toast(`Planilha exportada (${plural(r.lutas, 'luta', 'lutas')})`);
    } catch (erro) {
      console.error(erro);
      toast('Não deu pra gerar a planilha', 'erro');
    }
  });

  const entrada = $('.importar-backup input');
  entrada.addEventListener('change', async () => {
    const arquivo = entrada.files[0];
    entrada.value = '';
    if (!arquivo) return;
    let lido;
    try {
      lido = await lerBackup(arquivo);
    } catch (erro) {
      if (!(erro instanceof BackupInvalido)) console.error(erro);
      return avisar({ titulo: 'Arquivo não aceito', mensagem: erro instanceof BackupInvalido ? erro.message : 'Não deu pra ler esse arquivo.' });
    }
    const r = lido.resumo;
    const atuais = await contarAtivos('lutas');
    const sincronizando = Boolean((await lerSync())?.chave);
    const ok = await confirmar({
      titulo: 'Substituir tudo por este backup?',
      mensagem: [
        `Backup de ${r.exportadoEm ? quando(r.exportadoEm).texto : 'data desconhecida'}:`,
        `• ${plural(r.lutas, 'luta', 'lutas')} e ${plural(r.visualizacoes, 'visualização', 'visualizações')}`,
        `• ${plural(r.eventos, 'evento', 'eventos')}, ${plural(r.wrestlers, 'wrestler', 'wrestlers')} e ${plural(r.empresas, 'empresa', 'empresas')}`,
        `• ${plural(r.backlog, 'item', 'itens')} no backlog e ${plural(r.imagens, 'imagem', 'imagens')}`,
        '',
        atuais
          ? `Tudo o que está no app agora (${plural(atuais, 'luta', 'lutas')}) será apagado. Isso não pode ser desfeito.`
          : 'O app está sem lutas; nada importante será perdido.',
        ...(sincronizando ? ['', 'A sincronização está ligada: a nuvem e o outro aparelho também serão substituídos por este backup.'] : []),
      ].join('\n'),
      confirmarTexto: 'Substituir tudo',
      perigo: atuais > 0,
    });
    if (!ok) return;
    const botao = $('.importar-backup');
    botao.classList.add('ocupado');
    try {
      if (sincronizando) await prepararSubstituicao();
      await importarBackup(lido.backup);
    } catch (erro) {
      console.error(erro);
      if (sincronizando) await cancelarSubstituicao();
      botao.classList.remove('ocupado');
      return avisar({ titulo: 'Não deu pra restaurar', mensagem: 'Nada foi alterado: o app continua com os dados de antes.' });
    }
    let aviso = `Backup restaurado: ${plural(r.lutas, 'luta', 'lutas')}`;
    if (sincronizando) {
      // Substitui a nuvem agora; sem internet, fica marcado e termina na próxima sincronização.
      const foi = await substituirNuvem().catch(() => false);
      aviso += foi ? ' (nuvem também substituída)' : ' · a nuvem será substituída quando a internet voltar';
    }
    // Recarrega pra todas as telas (e o cache de imagens) começarem do zero.
    sessionStorage.setItem('avisoPosImportacao', aviso);
    location.reload();
  });

  renderBackup();
}
