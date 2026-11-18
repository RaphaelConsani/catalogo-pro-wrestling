import { db } from '../db/schema.js';
import { lerSync, aoMudarEstado, ativar, desligar, sincronizar, gerarChave } from '../db/sincronizacao.js';
import { encontrarDuplicados, juntar, manterOsDois, NOME_TABELA } from '../db/duplicados.js';
import { lerChaveDoBackup, BackupInvalido } from '../db/backup.js';
import { usosDe } from '../db/usos.js';
import { confirmar, avisar } from './dialogo.js';
import { toast } from './toast.js';
import { esc, formatarData, plural } from '../util/texto.js';
import { formatarNota } from '../util/nota.js';

// Cartões da tela Dados: Sincronização e Possíveis duplicados (fase 2).

const hora = (iso) => {
  const d = new Date(iso);
  const hoje = d.toDateString() === new Date().toDateString();
  const h = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return hoje ? `hoje às ${h}` : `${d.toLocaleDateString('pt-BR')} às ${h}`;
};

async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    toast('Chave copiada');
  } catch {
    toast('Não deu pra copiar: selecione a chave e copie', 'erro');
  }
}

// ---------- Sincronização ----------

export function montarCartaoSync(el, { aoMudar } = {}) {
  el.classList.add('dados-cartao', 'dados-sync');
  let conf = null;
  let estado = null;
  let mostrandoChave = false;
  let entrando = false;

  function htmlDesligada() {
    return `
      <span class="dados-icone" aria-hidden="true">☁</span>
      <h2>Sincronização</h2>
      <p>Deixa o Mac e o iPhone sempre com os mesmos dados, pela internet. Funciona sem internet também: sincroniza quando a conexão voltar.</p>
      ${entrando ? `
        <form class="sync-entrar" novalidate>
          <label class="campo-rotulo" for="sync-chave">Chave do outro aparelho</label>
          <div class="sync-linha">
            <input id="sync-chave" class="campo-entrada sync-chave-campo" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Cole a chave aqui" />
            <button type="submit" class="botao botao-primario">Entrar</button>
          </div>
          <p class="dados-dica">A chave fica em Dados → Sincronização → “Mostrar chave” no outro aparelho. Também dá pra
            <label class="sync-arquivo">ler de um arquivo de backup<input type="file" accept=".json,application/json" hidden /></label>.</p>
          <button type="button" class="botao botao-fantasma botao-pequeno sync-voltar">Voltar</button>
        </form>`
      : `<p class="dados-dica">No primeiro aparelho, crie a chave. Nos outros, cole a mesma chave.</p>
        <div class="sync-acoes">
          <button type="button" class="botao botao-primario sync-criar">Criar chave (primeiro aparelho)</button>
          <button type="button" class="botao botao-fantasma sync-tenho">Já tenho uma chave</button>
        </div>`}`;
  }

  function htmlLigada() {
    const s = estado?.situacao;
    const status = {
      ok: estado.ultimaSync ? `Sincronizado ${hora(estado.ultimaSync)}` : 'Sincronizado',
      sincronizando: 'Sincronizando…',
      offline: 'Sem conexão: sincroniza quando a internet voltar',
      erro: `Problema: ${estado.erro ?? 'erro desconhecido'}`,
    }[s] ?? '';
    return `
      <span class="dados-icone" aria-hidden="true">☁</span>
      <h2>Sincronização</h2>
      <div class="dados-ultimo"><span class="dados-ultimo-rotulo">Ligada neste aparelho</span>
        <strong class="sync-situacao ${esc(s)}">${esc(status)}</strong></div>
      <p class="dados-dica">Sincroniza sozinha ao abrir o app, alguns segundos depois de cada alteração e a cada minuto com o app aberto.</p>
      ${mostrandoChave ? `<div class="sync-chave">
          <code>${esc(conf.chave)}</code>
          <button type="button" class="botao botao-fantasma botao-pequeno sync-copiar">Copiar</button>
          <p class="dados-dica">No outro aparelho: Dados → Sincronização → “Já tenho uma chave” e cole. Guarde a chave como uma senha: quem tiver ela vê e altera seus dados.</p>
        </div>` : ''}
      <div class="sync-acoes">
        <button type="button" class="botao botao-primario sync-agora"${s === 'sincronizando' ? ' disabled' : ''}>Sincronizar agora</button>
        <button type="button" class="botao botao-fantasma sync-mostrar">${mostrandoChave ? 'Esconder chave' : 'Mostrar chave'}</button>
        <button type="button" class="botao botao-fantasma sync-desligar">Desligar neste aparelho</button>
      </div>`;
  }

  async function render() {
    conf = await lerSync();
    el.innerHTML = conf?.chave ? htmlLigada() : htmlDesligada();
    el.classList.toggle('ligada', Boolean(conf?.chave));
    if (entrando) el.querySelector('#sync-chave')?.focus();
  }

  async function entrarCom(modo, chave, botao) {
    if (botao) {
      botao.disabled = true;
      botao.textContent = modo === 'criar' ? 'Criando…' : 'Entrando…';
    }
    try {
      await ativar(modo, chave);
      entrando = false;
      mostrandoChave = modo === 'criar';
      toast(modo === 'criar' ? 'Sincronização ligada. Copie a chave pro outro aparelho.' : 'Sincronização ligada');
      await render();
      aoMudar?.();
    } catch (e) {
      console.error(e);
      await avisar({ titulo: 'Não deu pra ligar a sincronização', mensagem: e.status === 0 ? 'Sem conexão com a internet.' : e.message });
      render();
    }
  }

  el.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.classList.contains('sync-criar')) {
      const ok = await confirmar({
        titulo: 'Criar a chave?',
        mensagem: 'Faça isso só no primeiro aparelho (o que tem os seus dados). Depois você copia a chave e cola no outro.',
        confirmarTexto: 'Criar chave',
      });
      if (ok) entrarCom('criar', gerarChave(), b);
    }
    if (b.classList.contains('sync-tenho')) {
      entrando = true;
      render();
    }
    if (b.classList.contains('sync-voltar')) {
      entrando = false;
      render();
    }
    if (b.classList.contains('sync-agora')) {
      const r = await sincronizar();
      if (r?.erro) toast(r.erro.status === 0 ? 'Sem conexão' : 'Não deu pra sincronizar', 'erro');
      else toast(r.mudou ? `Sincronizado: ${plural(r.mudou, 'alteração recebida', 'alterações recebidas')}` : 'Tudo sincronizado');
      aoMudar?.();
    }
    if (b.classList.contains('sync-mostrar')) {
      mostrandoChave = !mostrandoChave;
      render();
    }
    if (b.classList.contains('sync-copiar')) copiar(conf.chave);
    if (b.classList.contains('sync-desligar')) {
      const ok = await confirmar({
        titulo: 'Desligar neste aparelho?',
        mensagem: 'Os dados continuam aqui e na nuvem; só param de sincronizar neste aparelho. Pra ligar de novo, use a mesma chave (“Já tenho uma chave”).',
        confirmarTexto: 'Desligar',
      });
      if (!ok) return;
      await desligar();
      mostrandoChave = false;
      render();
    }
  });

  el.addEventListener('submit', (e) => {
    e.preventDefault();
    const chave = el.querySelector('#sync-chave').value;
    entrarCom('entrar', chave, e.target.querySelector('button[type="submit"]'));
  });

  el.addEventListener('change', async (e) => {
    if (!e.target.matches('.sync-arquivo input')) return;
    const arquivo = e.target.files[0];
    e.target.value = '';
    if (!arquivo) return;
    try {
      el.querySelector('#sync-chave').value = await lerChaveDoBackup(arquivo);
      toast('Chave lida do backup. Toque em Entrar.');
    } catch (erro) {
      avisar({ titulo: 'Arquivo não aceito', mensagem: erro instanceof BackupInvalido ? erro.message : 'Não deu pra ler esse arquivo.' });
    }
  });

  // Atualiza a situação sem redesenhar enquanto se digita a chave. Saiu da tela: para de ouvir.
  let parar = null;
  parar = aoMudarEstado((novo) => {
    if (parar && !el.isConnected) return parar();
    const mudouSituacao = novo.situacao !== estado?.situacao || novo.ultimaSync !== estado?.ultimaSync;
    estado = novo;
    if (mudouSituacao && !entrando) render();
  });
}

// ---------- Possíveis duplicados ----------

async function descrever(tabela, r) {
  if (tabela === 'lutas') {
    const [evento, wrestlers, vis] = await Promise.all([
      db.eventos.get(r.eventoId),
      db.wrestlers.bulkGet(r.wrestlersIds ?? []),
      db.visualizacoes.where('lutaId').equals(r.id).filter((v) => !v.excluidoEm).toArray(),
    ]);
    const nomes = new Map(wrestlers.filter(Boolean).map((w) => [w.id, w.nome]));
    const confronto = r.lados.map((l) => l.wrestlersIds.map((id) => nomes.get(id) ?? '?').join(' & ')).join(' vs ');
    vis.sort((a, b) => a.data.localeCompare(b.data));
    return {
      titulo: confronto,
      linhas: [
        `${evento?.nome ?? '?'} · ${formatarData(evento?.data)}`,
        vis.length ? `${plural(vis.length, 'visualização', 'visualizações')} · nota ${formatarNota(vis.at(-1).nota)}` : 'sem visualizações',
      ],
    };
  }
  const usos = await usosDe(tabela, r.id);
  return {
    titulo: r.nome + (tabela === 'eventos' && r.data ? ` · ${formatarData(r.data)}` : ''),
    linhas: [usos.length ? `Usado em ${usos.join(', ')}` : 'Não é usado em nada'],
  };
}

export function montarCartaoDuplicados(el, { idDispositivo }) {
  el.classList.add('dados-cartao', 'dados-duplicados');

  async function render() {
    const lista = await encontrarDuplicados();
    el.hidden = !lista.length;
    if (!lista.length) return el.replaceChildren();
    const origem = (r) => (r.criadoNo && r.criadoNo === idDispositivo() ? 'criado neste aparelho' : 'criado em outro aparelho');
    const blocos = await Promise.all(lista.map(async (p, i) => {
      const [da, db_] = await Promise.all([descrever(p.tabela, p.a), descrever(p.tabela, p.b)]);
      const lado = (r, d, lado) => `<div class="dup-opcao">
        <strong>${esc(d.titulo)}</strong>
        ${d.linhas.map((l) => `<small>${esc(l)}</small>`).join('')}
        <small class="dup-origem">${esc(origem(r))} em ${esc(formatarData(r.criadoEm?.slice(0, 10)))}</small>
        <button type="button" class="botao botao-fantasma botao-pequeno" data-ficar="${lado}" data-par="${i}">Ficar com este</button>
      </div>`;
      return `<div class="dup-par">
        <span class="dup-tipo">${esc(NOME_TABELA[p.tabela])}</span>
        <div class="dup-opcoes">${lado(p.a, da, 'a')}${lado(p.b, db_, 'b')}</div>
        <button type="button" class="botao botao-fantasma botao-pequeno dup-manter" data-par="${i}">Manter os dois</button>
      </div>`;
    }));
    el.innerHTML = `
      <span class="dados-icone" aria-hidden="true">⧉</span>
      <h2>Possíveis duplicados <span class="dup-contagem">${lista.length}</span></h2>
      <p>Registrados em aparelhos diferentes antes de sincronizar. Escolha qual fica: o outro é excluído e tudo que apontava pra ele passa pro que ficou${lista.some((p) => p.tabela === 'lutas') ? ' (nas lutas, as visualizações das duas viram uma luta só)' : ''}.</p>
      <div class="dup-lista">${blocos.join('')}</div>`;
    el._lista = lista;
  }

  el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-par]');
    if (!b) return;
    const p = el._lista[b.dataset.par];
    b.disabled = true;
    try {
      if (b.classList.contains('dup-manter')) {
        await manterOsDois(p.tabela, p.a.id, p.b.id);
        toast('Os dois foram mantidos');
      } else {
        const [fica, sai] = b.dataset.ficar === 'a' ? [p.a, p.b] : [p.b, p.a];
        await juntar(p.tabela, fica.id, sai.id);
        toast(`${NOME_TABELA[p.tabela]} juntado`);
      }
    } catch (erro) {
      console.error(erro);
      toast('Não deu pra resolver esse duplicado', 'erro');
    }
    render();
  });

  window.addEventListener('dados-sincronizados', () => el.isConnected && render());
  return { render };
}
