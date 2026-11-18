import { ativos } from '../db/repo.js';
import { db } from '../db/schema.js';
import { nomeLado } from '../db/lutas.js';
import { backlogPendente, carregarItem, salvarItemLuta, salvarItemEvento, eventoNoBacklog, concluirItem, removerItem } from '../db/backlog.js';
import { montarFormulario } from './luta/formulario.js';
import { abrirImportarCagematch } from '../componentes/importar-cagematch.js';
import { criarSeletorEvento } from '../componentes/seletor-evento.js';
import { abrirPainel, fecharPainel } from '../componentes/painel.js';
import { confirmar, avisar } from '../componentes/dialogo.js';
import { toast } from '../componentes/toast.js';
import { esc, normalizar, formatarData, plural } from '../util/texto.js';
import { lerVisao, htmlAlternarVisao, ligarAlternarVisao, htmlCabecalho } from '../componentes/visao.js';
import { cmp, porTexto } from '../util/ordenar.js';

const ORDENS = {
  adicionado: 'Adicionados por último',
  evento_desc: 'Evento mais recente',
  evento_asc: 'Evento mais antigo',
  eventonome_asc: 'Evento (A–Z)',
  eventonome_desc: 'Evento (Z–A)',
  confronto_asc: 'Confronto (A–Z)',
  confronto_desc: 'Confronto (Z–A)',
  tipo_asc: 'Tipo (A–Z)',
  tipo_desc: 'Tipo (Z–A)',
  empresa_asc: 'Empresa (A–Z)',
  empresa_desc: 'Empresa (Z–A)',
};
// Na visão em cards (agrupada por evento) não dá pra ordenar por confronto ou tipo.
const ORDENS_GRUPOS = ['adicionado', 'evento_desc', 'evento_asc', 'eventonome_asc', 'eventonome_desc', 'empresa_asc', 'empresa_desc'];
const siglaGrupo = (g) => g.empresa?.sigla || g.empresa?.nome;

// Busca e ordem ficam guardadas durante a sessão.
// Filtro de empresa: principal + parceiras do evento (igual à Biblioteca).
const estado = { busca: '', ordem: 'adicionado', filtros: { empresa: '' }, painelAberto: false };

async function carregarDados() {
  const [itens, ...listas] = await Promise.all([
    backlogPendente(),
    ...['eventos', 'empresas', 'wrestlers', 'equipes', 'tiposMatch', 'estipulacoes'].map(ativos),
  ]);
  const [eventos, empresas, wrestlers, equipes, tipos, estipulacoes] = listas.map((l) => new Map(l.map((x) => [x.id, x])));
  const ctx = { eventos, empresas, wrestlers, equipes, tipos, estipulacoes };
  // Lutas já registradas: só interessa a contagem dos eventos inteiros pendentes (usa o índice).
  const idsEventos = [...new Set(itens.filter((i) => i.tipo === 'evento').map((i) => i.eventoId))];
  const lutasPorEvento = new Map();
  if (idsEventos.length) {
    await db.lutas.where('eventoId').anyOf(idsEventos).each((l) => {
      if (!l.excluidoEm) lutasPorEvento.set(l.eventoId, (lutasPorEvento.get(l.eventoId) ?? 0) + 1);
    });
  }
  return { itens, ctx, lutasPorEvento };
}

// Mesma luta = mesmo evento, mesmo tipo e os mesmos lados (em qualquer ordem).
const assinaturaLados = (lados) => lados.map((l) => [...l.wrestlersIds].sort().join(',')).sort().join('|');
const mesmaLuta = (a, b) => a.eventoId === b.eventoId && a.tipoMatchId === b.tipoMatchId && assinaturaLados(a.lados) === assinaturaLados(b.lados);

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
    const doEvento = [g.evento?.nome, g.empresa?.nome, g.empresa?.sigla];
    for (const item of [g.inteiro, ...g.lutas].filter(Boolean)) {
      const partes = [...doEvento];
      if (item.tipo === 'luta') {
        item.confronto = item.lados.map((l) => nomeLado(l, ctx)).join(' vs ');
        item.nomeTipo = ctx.tipos.get(item.tipoMatchId)?.nome ?? '';
        partes.push(item.nomeTipo, ...item.estipulacoesIds.map((id) => ctx.estipulacoes.get(id)?.nome));
        for (const lado of item.lados) {
          partes.push(ctx.equipes.get(lado.equipeId)?.nome, ...lado.wrestlersIds.map((id) => ctx.wrestlers.get(id)?.nome));
        }
      }
      item.grupo = g;
      item.busca = normalizar(partes.filter(Boolean).join(' '));
    }
  }
  return [...grupos.values()];
}

function ordenarGrupos(grupos) {
  const porEvento = (a, b) => cmp(a.evento?.data, b.evento?.data) || cmp(a.evento?.nome, b.evento?.nome);
  const comparar = {
    adicionado: (a, b) => cmp(b.adicionadoEm, a.adicionadoEm),
    evento_desc: (a, b) => porEvento(b, a),
    evento_asc: porEvento,
    eventonome_asc: porTexto((g) => g.evento?.nome),
    eventonome_desc: porTexto((g) => g.evento?.nome, -1),
    // Mesma empresa: evento mais recente primeiro.
    empresa_asc: (a, b) => porTexto(siglaGrupo)(a, b) || porEvento(b, a),
    empresa_desc: (a, b) => porTexto(siglaGrupo, -1)(a, b) || porEvento(b, a),
  }[estado.ordem] ?? ((a, b) => cmp(b.adicionadoEm, a.adicionadoEm));
  return [...grupos].sort(comparar);
}

// ---------- Visão em lista: tabela corrida, um item por linha ----------
function ordenarItens(itens) {
  const porEvento = (a, b) => cmp(a.grupo.evento?.data, b.grupo.evento?.data) || cmp(a.grupo.evento?.nome, b.grupo.evento?.nome);
  const comparar = {
    adicionado: (a, b) => cmp(b.criadoEm, a.criadoEm),
    evento_desc: (a, b) => porEvento(b, a),
    evento_asc: porEvento,
    eventonome_asc: porTexto((i) => i.grupo.evento?.nome),
    eventonome_desc: porTexto((i) => i.grupo.evento?.nome, -1),
    confronto_asc: porTexto((i) => i.confronto),
    confronto_desc: porTexto((i) => i.confronto, -1),
    tipo_asc: porTexto((i) => i.nomeTipo),
    tipo_desc: porTexto((i) => i.nomeTipo, -1),
    empresa_asc: (a, b) => porTexto((i) => siglaGrupo(i.grupo))(a, b) || porEvento(b, a),
    empresa_desc: (a, b) => porTexto((i) => siglaGrupo(i.grupo), -1)(a, b) || porEvento(b, a),
  }[estado.ordem];
  return [...itens].sort((a, b) => comparar(a, b) || cmp(b.criadoEm, a.criadoEm));
}

const COLUNAS_BACKLOG = [
  { rotulo: 'Empresa', ordem: ['empresa_asc', 'empresa_desc'], seta: ['▲', '▼'], classe: 'col-empresa opcional' },
  { rotulo: 'Evento', ordem: ['eventonome_asc', 'eventonome_desc'], seta: ['▲', '▼'], classe: 'col-evento opcional' },
  { rotulo: 'Data', ordem: ['evento_desc', 'evento_asc'], seta: ['▼', '▲'], classe: 'col-data' },
  { rotulo: 'Confronto', ordem: ['confronto_asc', 'confronto_desc'], seta: ['▲', '▼'], classe: 'col-confronto' },
  { rotulo: 'Tipo', ordem: ['tipo_asc', 'tipo_desc'], seta: ['▲', '▼'], classe: 'col-tipo opcional' },
  { rotulo: '', classe: 'col-acoes' },
];

function htmlLinhaBacklog(item, lutasPorEvento) {
  const { evento, empresa } = item.grupo;
  const eventoInteiro = item.tipo === 'evento';
  const n = eventoInteiro ? lutasPorEvento.get(item.eventoId) ?? 0 : 0;
  const acoes = eventoInteiro
    ? `<a class="botao botao-primario botao-pequeno" href="#/backlog/${item.id}/registrar">＋ Registrar luta</a>
       <button type="button" class="botao botao-fantasma botao-pequeno" data-acao="concluir">Concluir</button>`
    : `<a class="botao botao-primario botao-pequeno" href="#/backlog/${item.id}/assisti">✓ Assisti</a>
       <button type="button" class="botao-icone" data-acao="editar" aria-label="Editar" title="Editar">✎</button>`;
  return `<tr class="linha-backlog${eventoInteiro ? ' linha-evento-inteiro' : ''}" data-item="${item.id}" style="--cor-empresa:${esc(empresa?.cor ?? '#3a4152')}">
    <td class="col-empresa opcional"><span class="sigla-empresa">${esc(empresa?.sigla || empresa?.nome || '?')}</span></td>
    <td class="col-evento opcional">${esc(evento?.nome ?? 'Evento excluído')}</td>
    <td class="col-data">${evento?.data ? formatarData(evento.data) : '—'}</td>
    <td class="col-confronto">${eventoInteiro
      ? `<strong>Evento inteiro</strong><small>${n ? plural(n, 'luta registrada', 'lutas registradas') : 'nenhuma luta registrada'}</small><span class="so-celular">${esc(evento?.nome ?? '')}</span>`
      : `${esc(item.confronto)}<span class="so-celular">${esc(evento?.nome ?? '')}</span>`}</td>
    <td class="col-tipo opcional">${esc(eventoInteiro ? '—' : item.nomeTipo || '—')}</td>
    <td class="col-acoes"><span class="acoes-linha">${acoes}
      <button type="button" class="botao-icone" data-acao="remover" aria-label="Remover do backlog" title="Remover do backlog">✕</button></span></td>
  </tr>`;
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
      <button type="button" class="botao botao-fantasma alternar-filtros" aria-expanded="false">Filtros</button>
      <select class="campo-entrada ordem" aria-label="Ordenar"></select>
      ${htmlAlternarVisao(lerVisao('backlog'))}
      <button type="button" class="botao botao-fantasma importar-cagematch">Do Cagematch</button>
      <button type="button" class="botao botao-fantasma adicionar-evento">＋ Evento inteiro</button>
      <button type="button" class="botao botao-primario adicionar-luta">＋ Luta</button>
    </div>
    <div class="painel-filtros" hidden>
      <label class="campo"><span class="campo-rotulo">Empresa</span>
        <select class="campo-entrada" data-filtro="empresa"><option value="">Todas</option></select>
      </label>
    </div>
    <div class="filtros-ativos"></div>
    <p class="contador backlog-contador"></p>
    <div class="backlog-grupos"></div>`;

  const $ = (s) => container.querySelector(s);
  $('.busca').value = estado.busca;
  let dados;
  let visao = lerVisao('backlog');

  // Opções do seletor conforme a visão (em cards, só as que funcionam agrupadas).
  function montarOrdens() {
    const chaves = visao === 'lista' ? Object.keys(ORDENS) : ORDENS_GRUPOS;
    if (!chaves.includes(estado.ordem)) estado.ordem = 'adicionado';
    $('.ordem').innerHTML = chaves.map((k) => `<option value="${k}">${ORDENS[k]}</option>`).join('');
    $('.ordem').value = estado.ordem;
  }
  montarOrdens();

  async function recarregar() {
    dados = await carregarDados();
    dados.grupos = agrupar(dados.itens, dados.ctx);
    // Opções do filtro: todas as empresas cadastradas (como na Biblioteca).
    const empresas = [...dados.ctx.empresas.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    if (estado.filtros.empresa && !dados.ctx.empresas.has(estado.filtros.empresa)) estado.filtros.empresa = '';
    const sel = $('[data-filtro="empresa"]');
    sel.innerHTML = `<option value="">Todas</option>${empresas.map((e) => `<option value="${e.id}">${esc(e.nome)}</option>`).join('')}`;
    sel.value = estado.filtros.empresa;
    render();
  }

  function renderFiltrosAtivos() {
    const id = estado.filtros.empresa;
    const e = id && dados.ctx.empresas.get(id);
    $('.alternar-filtros').textContent = e ? 'Filtros (1)' : 'Filtros';
    $('.filtros-ativos').innerHTML = e
      ? `<span class="chip">${esc(e.sigla || e.nome)}<button type="button" class="chip-remover" data-limpar="empresa" aria-label="Remover filtro">✕</button></span>
         <button type="button" class="limpar-filtros">Limpar filtros</button>`
      : '';
  }

  function render() {
    const { itens, grupos, ctx, lutasPorEvento } = dados;
    const termo = normalizar(estado.busca);
    const emp = estado.filtros.empresa;
    const daEmpresa = (g) => !emp || [g.evento?.empresaId, ...(g.evento?.parceirasIds ?? [])].includes(emp);
    const passaBusca = (i) => !termo || termo.split(' ').every((p) => i.busca.includes(p));
    // Filtra item por item (a busca pode bater em lutas diferentes do mesmo evento
    // sem bater em nenhuma sozinha); grupos sem nenhum item visível somem.
    const visiveis = ordenarGrupos(grupos.filter(daEmpresa)
      .map((g) => ({ ...g, inteiro: g.inteiro && passaBusca(g.inteiro) ? g.inteiro : null, lutas: g.lutas.filter(passaBusca) }))
      .filter((g) => g.inteiro || g.lutas.length));
    renderFiltrosAtivos();
    const nLutas = itens.filter((i) => i.tipo === 'luta').length;
    const nEventos = itens.length - nLutas;
    const nVisiveis = visiveis.reduce((n, g) => n + g.lutas.length + (g.inteiro ? 1 : 0), 0);
    $('.backlog-contador').textContent = !itens.length
      ? ''
      : nVisiveis !== itens.length
        ? `${nVisiveis} de ${plural(itens.length, 'item', 'itens')}`
        : [nLutas && plural(nLutas, 'luta', 'lutas'), nEventos && plural(nEventos, 'evento inteiro', 'eventos inteiros')].filter(Boolean).join(' · ');
    const el = $('.backlog-grupos');
    if (!visiveis.length) {
      el.innerHTML = `<div class="vazio"><div>
        <div class="vazio-icone" aria-hidden="true">☰</div>
        <strong>${itens.length ? 'Nada encontrado' : 'Backlog vazio'}</strong>
        <span>${itens.length ? 'Tente outra busca ou limpe os filtros.' : 'Adicione uma luta ou um evento inteiro que você quer assistir.'}</span>
      </div></div>`;
      return;
    }
    if (visao === 'lista') {
      const linhas = ordenarItens(visiveis.flatMap((g) => [g.inteiro, ...g.lutas].filter(Boolean)));
      el.innerHTML = `<table class="tabela-lutas tabela-backlog">${htmlCabecalho(COLUNAS_BACKLOG, estado.ordem)}
        <tbody>${linhas.map((i) => htmlLinhaBacklog(i, lutasPorEvento)).join('')}</tbody></table>`;
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
        const repetida = dados.itens.find((i) => i.tipo === 'luta' && i.id !== item?.id && mesmaLuta(i, d));
        if (repetida) {
          const seguir = await confirmar({
            titulo: 'Luta repetida',
            mensagem: 'Essa luta (mesmo evento, tipo e lados) já está no backlog. Adicionar mesmo assim?',
            confirmarTexto: 'Adicionar mesmo assim',
          });
          if (!seguir) return false; // não salvou: o formulário continua aberto
        }
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
      if (botao.disabled) return;
      botao.disabled = true; // trava antes da checagem: clique duplo não duplica o evento
      try {
        if (await eventoNoBacklog(ev.id)) return mostrarErro('Esse evento já está no backlog.');
        await salvarItemEvento(ev.id);
        fecharPainel();
        toast('Evento adicionado ao backlog');
        await recarregar();
      } catch (erro) {
        console.error(erro);
        toast('Não foi possível adicionar ao backlog.', 'erro');
      } finally {
        botao.disabled = false;
      }
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
  $('.painel-filtros').hidden = !estado.painelAberto;
  $('.alternar-filtros').setAttribute('aria-expanded', String(estado.painelAberto));
  $('.alternar-filtros').addEventListener('click', () => {
    estado.painelAberto = !estado.painelAberto;
    $('.painel-filtros').hidden = !estado.painelAberto;
    $('.alternar-filtros').setAttribute('aria-expanded', String(estado.painelAberto));
  });
  $('.painel-filtros').addEventListener('change', (e) => {
    const el = e.target.closest('[data-filtro]');
    if (!el) return;
    estado.filtros[el.dataset.filtro] = el.value;
    render();
  });
  $('.filtros-ativos').addEventListener('click', (e) => {
    if (!e.target.closest('[data-limpar], .limpar-filtros')) return;
    estado.filtros.empresa = '';
    $('[data-filtro="empresa"]').value = '';
    render();
  });
  $('.adicionar-luta').addEventListener('click', () => abrirFormLuta());
  $('.adicionar-evento').addEventListener('click', abrirFormEvento);
  $('.importar-cagematch').addEventListener('click', () => abrirImportarCagematch({ aoConcluir: recarregar }));
  ligarAlternarVisao(container.querySelector('.alternar-visao'), 'backlog', (v) => {
    visao = v;
    montarOrdens();
    render();
  });
  $('.backlog-grupos').addEventListener('click', (e) => {
    const ordem = e.target.closest('[data-ordem]')?.dataset.ordem;
    if (ordem) {
      estado.ordem = ordem;
      $('.ordem').value = ordem;
      return render();
    }
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

// Item importado do Cagematch: resultado, título e duração ficam guardados (escondidos no Backlog)
// e só preenchem o formulário aqui. O vencedor é achado pelos wrestlers (os lados podem ter sido editados).
function doCagematch(item) {
  const cm = item.cagematch;
  if (!cm) return {};
  const dados = { tituloId: cm.tituloId ?? null, duracaoSeg: cm.duracaoSeg ?? null };
  if (cm.resultado && cm.resultado !== 'vitoria') dados.resultado = cm.resultado;
  if (cm.resultado === 'vitoria' && cm.vencedorIds?.length) {
    const lado = item.lados.findIndex((l) => cm.vencedorIds.some((id) => l.wrestlersIds.includes(id)));
    if (lado >= 0) Object.assign(dados, { resultado: 'vitoria', ladoVencedor: lado, metodoVitoriaId: cm.metodoVitoriaId ?? null });
  }
  return dados;
}

// Luta do backlog: abre o formulário completo já preenchido; ao salvar, o item sai do backlog.
export async function telaAssistiBacklog(container, { id }) {
  const item = await carregarItem(id);
  if (!item || item.concluidoEm || item.tipo !== 'luta') return itemIndisponivel(container);
  await montarFormulario(container, {
    rotulo: 'Do backlog',
    inicial: { eventoId: item.eventoId, tipoMatchId: item.tipoMatchId, estipulacoesIds: item.estipulacoesIds, lados: item.lados, ...doCagematch(item) },
    aoSalvar: async (luta) => {
      // A luta já está salva: se tirar do backlog falhar, avisa e sai do formulário
      // (ficar nele deixaria salvar de novo e duplicar a luta).
      try {
        await concluirItem(item.id, luta.id);
        toast('Luta registrada e removida do backlog');
      } catch (erro) {
        console.error(erro);
        await avisar({
          titulo: 'Luta registrada',
          mensagem: 'A luta foi salva no catálogo, mas não saiu do backlog. Remova o item do backlog manualmente.',
        });
      }
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
