import { ativos } from '../db/repo.js';
import { nomeLado } from '../db/lutas.js';
import { backlogPendente, carregarItem, salvarItemLuta, salvarItemEvento, eventoNoBacklog, concluirItem, removerItem } from '../db/backlog.js';
import { montarFormulario } from './luta/formulario.js';
import { criarSeletorEvento } from '../componentes/seletor-evento.js';
import { abrirPainel, fecharPainel } from '../componentes/painel.js';
import { confirmar } from '../componentes/dialogo.js';
import { toast } from '../componentes/toast.js';
import { esc, normalizar, formatarData, plural } from '../util/texto.js';

const ORDENS = {
  adicionado: 'Adicionados por último',
  evento_desc: 'Evento mais recente',
  evento_asc: 'Evento mais antigo',
};
// Busca e ordem ficam guardadas durante a sessão.
const estado = { busca: '', ordem: 'adicionado' };
const cmp = (a, b) => (a ?? '').localeCompare(b ?? '');

async function carregarDados() {
  const [itens, lutas, ...listas] = await Promise.all([
    backlogPendente(),
    ativos('lutas'),
    ...['eventos', 'empresas', 'wrestlers', 'equipes', 'tiposMatch', 'estipulacoes'].map(ativos),
  ]);
  const [eventos, empresas, wrestlers, equipes, tipos, estipulacoes] = listas.map((l) => new Map(l.map((x) => [x.id, x])));
  const ctx = { eventos, empresas, wrestlers, equipes, tipos, estipulacoes };
  const lutasPorEvento = new Map();
  for (const l of lutas) lutasPorEvento.set(l.eventoId, (lutasPorEvento.get(l.eventoId) ?? 0) + 1);
  return { itens, ctx, lutasPorEvento };
}

// Agrupa por evento: o evento inteiro e as lutas avulsas do mesmo evento ficam juntos.
function agrupar(itens, ctx) {
  const grupos = new Map();
  for (const item of itens) {
    const evento = ctx.eventos.get(item.eventoId) ?? null;
    if (!grupos.has(item.eventoId)) {
      const empresa = ctx.empresas.get(evento?.empresaId) ?? null;
      grupos.set(item.eventoId, { eventoId: item.eventoId, evento, empresa, inteiro: null, lutas: [], adicionadoEm: '', busca: '' });
    }
    const g = grupos.get(item.eventoId);
    if (item.tipo === 'evento') g.inteiro = item;
    else g.lutas.push(item);
    if (cmp(item.criadoEm, g.adicionadoEm) > 0) g.adicionadoEm = item.criadoEm;
  }
  for (const g of grupos.values()) {
    g.lutas.sort((a, b) => cmp(a.criadoEm, b.criadoEm));
    const partes = [g.evento?.nome, g.empresa?.nome, g.empresa?.sigla];
    for (const l of g.lutas) {
      partes.push(ctx.tipos.get(l.tipoMatchId)?.nome, ...l.estipulacoesIds.map((id) => ctx.estipulacoes.get(id)?.nome));
      for (const lado of l.lados) {
        partes.push(ctx.equipes.get(lado.equipeId)?.nome, ...lado.wrestlersIds.map((id) => ctx.wrestlers.get(id)?.nome));
      }
    }
    g.busca = normalizar(partes.filter(Boolean).join(' '));
  }
  return [...grupos.values()];
}

function ordenarGrupos(grupos) {
  const porEvento = (a, b) => cmp(a.evento?.data, b.evento?.data) || cmp(a.evento?.nome, b.evento?.nome);
  const comparar = {
    adicionado: (a, b) => cmp(b.adicionadoEm, a.adicionadoEm),
    evento_desc: (a, b) => porEvento(b, a),
    evento_asc: porEvento,
  }[estado.ordem];
  return [...grupos].sort(comparar);
}

function htmlCardEvento(item, lutasRegistradas) {
  return `<div class="card-luta card-backlog card-evento-inteiro" data-item="${item.id}">
    <span class="card-luta-topo">Evento inteiro</span>
    <span class="card-backlog-titulo">Assistir o show completo</span>
    <span class="card-backlog-info">${lutasRegistradas ? `${plural(lutasRegistradas, 'luta registrada', 'lutas registradas')} deste evento` : 'Nenhuma luta deste evento registrada ainda'}</span>
    <span class="card-backlog-acoes">
      <a class="botao botao-primario botao-pequeno" href="#/backlog/${item.id}/registrar">＋ Registrar luta</a>
      <button type="button" class="botao botao-fantasma botao-pequeno" data-acao="concluir">Concluir evento</button>
      <button type="button" class="botao-icone remover-item" data-acao="remover" aria-label="Remover do backlog" title="Remover do backlog">✕</button>
    </span>
  </div>`;
}

function htmlCardLuta(item, ctx) {
  const lados = item.lados.map((l) => `<span class="card-luta-lado">${esc(nomeLado(l, ctx))}</span>`);
  const detalhes = [ctx.tipos.get(item.tipoMatchId)?.nome, ...item.estipulacoesIds.map((id) => ctx.estipulacoes.get(id)?.nome)]
    .filter(Boolean).map(esc).join(' · ');
  return `<div class="card-luta card-backlog" data-item="${item.id}">
    <span class="card-luta-topo">${detalhes || 'Luta'}</span>
    <span class="card-luta-confronto">${lados.join('<span class="card-luta-vs">vs</span>')}</span>
    <span class="card-backlog-acoes">
      <a class="botao botao-primario botao-pequeno" href="#/backlog/${item.id}/assisti">✓ Assisti</a>
      <button type="button" class="botao botao-fantasma botao-pequeno" data-acao="editar">Editar</button>
    </span>
  </div>`;
}

function htmlGrupo(g, ctx, lutasPorEvento) {
  const e = g.empresa;
  return `<section class="grupo-backlog" style="--cor-empresa:${esc(e?.cor ?? '#3a4152')}">
    <header class="grupo-backlog-topo">
      <span class="grupo-backlog-empresa">${esc(e?.sigla || e?.nome || '?')}</span>
      <h2>${esc(g.evento?.nome ?? 'Evento excluído')}</h2>
      <span class="grupo-backlog-data">${g.evento ? formatarData(g.evento.data) : ''}</span>
    </header>
    <div class="grade-lutas">
      ${g.inteiro ? htmlCardEvento(g.inteiro, lutasPorEvento.get(g.eventoId) ?? 0) : ''}
      ${g.lutas.map((l) => htmlCardLuta(l, ctx)).join('')}
    </div>
  </section>`;
}

export async function telaBacklog(container) {
  container.innerHTML = `
    <section class="tela-cabecalho">
      <span class="tela-rotulo">Pra assistir</span>
      <h1 class="tela-titulo">Backlog</h1>
    </section>
    <div class="barra-ferramentas backlog-barra">
      <input type="search" class="campo-entrada busca" placeholder="Buscar wrestler, evento, empresa, estipulação…" aria-label="Buscar no backlog" />
      <select class="campo-entrada ordem" aria-label="Ordenar">
        ${Object.entries(ORDENS).map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}
      </select>
      <button type="button" class="botao botao-fantasma adicionar-evento">＋ Evento inteiro</button>
      <button type="button" class="botao botao-primario adicionar-luta">＋ Luta</button>
    </div>
    <p class="contador backlog-contador"></p>
    <div class="backlog-grupos"></div>`;

  const $ = (s) => container.querySelector(s);
  $('.busca').value = estado.busca;
  $('.ordem').value = estado.ordem;
  let dados;

  async function recarregar() {
    dados = await carregarDados();
    dados.grupos = agrupar(dados.itens, dados.ctx);
    render();
  }

  function render() {
    const { itens, grupos, ctx, lutasPorEvento } = dados;
    const termo = normalizar(estado.busca);
    const visiveis = ordenarGrupos(grupos.filter((g) => !termo || termo.split(' ').every((p) => g.busca.includes(p))));
    const nLutas = itens.filter((i) => i.tipo === 'luta').length;
    const nEventos = itens.length - nLutas;
    $('.backlog-contador').textContent = itens.length
      ? [nLutas && plural(nLutas, 'luta', 'lutas'), nEventos && plural(nEventos, 'evento inteiro', 'eventos inteiros')].filter(Boolean).join(' · ')
      : '';
    const el = $('.backlog-grupos');
    if (!visiveis.length) {
      el.innerHTML = `<div class="vazio"><div>
        <div class="vazio-icone" aria-hidden="true">☰</div>
        <strong>${itens.length ? 'Nada encontrado' : 'Backlog vazio'}</strong>
        <span>${itens.length ? 'Tente outra busca.' : 'Adicione uma luta ou um evento inteiro que você quer assistir.'}</span>
      </div></div>`;
      return;
    }
    el.innerHTML = visiveis.map((g) => htmlGrupo(g, ctx, lutasPorEvento)).join('');
  }

  // ---------- Painéis ----------
  async function abrirFormLuta(item = null) {
    const conteudo = document.createElement('div');
    await montarFormulario(conteudo, {
      modo: 'backlog',
      inicial: item,
      aoSalvar: async (d) => {
        await salvarItemLuta({ ...(item ? { id: item.id } : {}), ...d });
        fecharPainel();
        toast(item ? 'Item atualizado' : 'Luta adicionada ao backlog');
        await recarregar();
      },
      aoExcluir: item ? () => remover(item) : null,
    });
    abrirPainel({ titulo: item ? 'Editar item' : 'Luta pro backlog', subtitulo: 'Backlog', conteudo, largo: true });
  }

  async function abrirFormEvento() {
    const conteudo = document.createElement('div');
    conteudo.className = 'form-backlog-evento';
    conteudo.innerHTML = `
      <p class="campo-dica">Depois de assistir, registre as lutas uma a uma pelo botão “Registrar luta” e conclua o evento.</p>
      <div class="evento-campo"></div>
      <p class="campo-erro" hidden></p>`;
    const erro = conteudo.querySelector('.campo-erro');
    const mostrarErro = (msg) => {
      erro.textContent = msg ?? '';
      erro.hidden = !msg;
    };
    const seletor = await criarSeletorEvento({ aoMudar: () => mostrarErro(null) });
    conteudo.querySelector('.evento-campo').append(seletor.el);

    const rodape = document.createElement('div');
    rodape.className = 'formulario-acoes';
    rodape.innerHTML = `<span class="espaco"></span><button type="button" class="botao botao-fantasma" data-fechar>Cancelar</button>
      <button type="button" class="botao botao-primario salvar">Adicionar ao backlog</button>`;
    const botao = rodape.querySelector('.salvar');
    botao.addEventListener('click', async () => {
      const ev = seletor.valor();
      if (!ev) return mostrarErro('Escolha o evento.');
      if (await eventoNoBacklog(ev.id)) return mostrarErro('Esse evento já está no backlog.');
      botao.disabled = true;
      await salvarItemEvento(ev.id);
      fecharPainel();
      toast('Evento adicionado ao backlog');
      await recarregar();
    });
    abrirPainel({ titulo: 'Evento inteiro', subtitulo: 'Backlog', conteudo, rodape });
  }

  async function remover(item) {
    const ok = await confirmar({
      titulo: 'Remover do backlog?',
      mensagem: item.tipo === 'evento' ? 'O evento sai do backlog. As lutas já registradas continuam no catálogo.' : 'A luta sai do backlog sem ser registrada.',
      confirmarTexto: 'Remover',
      perigo: true,
    });
    if (!ok) return;
    await removerItem(item.id);
    fecharPainel();
    toast('Removido do backlog');
    await recarregar();
  }

  async function concluir(item) {
    const ev = dados.ctx.eventos.get(item.eventoId);
    const n = dados.lutasPorEvento.get(item.eventoId) ?? 0;
    const ok = await confirmar({
      titulo: 'Concluir evento?',
      mensagem: `${ev?.nome ?? 'O evento'} sai do backlog. ${n ? `${plural(n, 'luta registrada', 'lutas registradas')} dele.` : 'Nenhuma luta dele foi registrada ainda.'}`,
      confirmarTexto: 'Concluir',
    });
    if (!ok) return;
    await concluirItem(item.id);
    toast('Evento concluído');
    await recarregar();
  }

  // ---------- Eventos da tela ----------
  let espera;
  $('.busca').addEventListener('input', (e) => {
    clearTimeout(espera);
    espera = setTimeout(() => {
      estado.busca = e.target.value;
      render();
    }, 150);
  });
  $('.ordem').addEventListener('change', (e) => {
    estado.ordem = e.target.value;
    render();
  });
  $('.adicionar-luta').addEventListener('click', () => abrirFormLuta());
  $('.adicionar-evento').addEventListener('click', abrirFormEvento);
  $('.backlog-grupos').addEventListener('click', (e) => {
    const acao = e.target.closest('[data-acao]')?.dataset.acao;
    const id = e.target.closest('[data-item]')?.dataset.item;
    const item = id && dados.itens.find((i) => i.id === id);
    if (!acao || !item) return;
    if (acao === 'editar') abrirFormLuta(item);
    if (acao === 'remover') remover(item);
    if (acao === 'concluir') concluir(item);
  });

  await recarregar();
}

// ---------- "Assisti" e "Registrar luta" ----------

const itemIndisponivel = (container) => {
  container.innerHTML = `<div class="vazio"><div><strong>Item não encontrado</strong>
    <span>Ele pode já ter saído do backlog. <a href="#/backlog">Voltar ao backlog</a></span></div></div>`;
};

// Luta do backlog: abre o formulário completo já preenchido; ao salvar, o item sai do backlog.
export async function telaAssistiBacklog(container, { id }) {
  const item = await carregarItem(id);
  if (!item || item.concluidoEm || item.tipo !== 'luta') return itemIndisponivel(container);
  await montarFormulario(container, {
    rotulo: 'Do backlog',
    inicial: { eventoId: item.eventoId, tipoMatchId: item.tipoMatchId, estipulacoesIds: item.estipulacoesIds, lados: item.lados },
    aoSalvar: async (luta) => {
      await concluirItem(item.id, luta.id);
      toast('Luta registrada e removida do backlog');
      location.hash = '#/backlog';
    },
  });
}

// Evento inteiro: Nova luta com o evento preenchido; depois de salvar, já abre a próxima do mesmo show.
export async function telaRegistrarEventoBacklog(container, { id }) {
  const item = await carregarItem(id);
  if (!item || item.concluidoEm || item.tipo !== 'evento') return itemIndisponivel(container);
  await montarFormulario(container, { rotulo: 'Do backlog · evento inteiro', inicial: { eventoId: item.eventoId } });
}
