import { abrirPainel, fecharPainel } from './painel.js';
import { campoCor } from './campos.js';
import { toast } from './toast.js';
import { numeroDoLink, buscarEvento } from '../util/cagematch.js';
import { prepararImportacao, marcarRepetidas, pendencias, salvarImportacao, tipoCombina } from '../db/cagematch.js';
import { esc, formatarData, plural, normalizar } from '../util/texto.js';

// Painel "Importar do Cagematch" (tela Backlog): colar o link -> revisar -> adicionar ao Backlog.
// Na revisão não aparece vencedor nem duração (sem spoiler).
export function abrirImportarCagematch({ aoConcluir }) {
  const conteudo = document.createElement('div');
  conteudo.className = 'cm-importar';
  conteudo.innerHTML = `
    <form class="cm-busca" novalidate>
      <label class="campo-rotulo" for="cm-link">Link do evento no Cagematch</label>
      <div class="cm-busca-linha">
        <input id="cm-link" type="url" class="campo-entrada" placeholder="https://www.cagematch.net/?id=1&nr=…" autocomplete="off" />
        <button type="submit" class="botao botao-primario">Buscar</button>
      </div>
      <small class="campo-dica">Abra o evento no Cagematch, copie o endereço da página e cole aqui.</small>
      <p class="campo-erro cm-erro" hidden></p>
    </form>
    <div class="cm-revisao"></div>`;

  const rodape = document.createElement('div');
  rodape.className = 'formulario-acoes cm-rodape';
  rodape.innerHTML = `<ul class="cm-pendencias"></ul><span class="espaco"></span>
    <button type="button" class="botao botao-fantasma" data-fechar>Cancelar</button>
    <button type="button" class="botao botao-primario cm-salvar" disabled>Adicionar ao Backlog</button>`;

  const $ = (s) => conteudo.querySelector(s);
  const erro = (msg) => {
    $('.cm-erro').textContent = msg ?? '';
    $('.cm-erro').hidden = !msg;
  };
  let plano = null;

  $('.cm-busca').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nr = numeroDoLink($('#cm-link').value);
    if (!nr) return erro('Esse não parece o link de um evento do Cagematch (ele tem “?id=1&nr=” no endereço).');
    const botao = $('.cm-busca button');
    botao.disabled = true;
    botao.textContent = 'Buscando…';
    erro(null);
    try {
      const lido = await buscarEvento(nr);
      if (!lido.lutas.length) throw new Error('Esse evento ainda não tem lutas no Cagematch.');
      plano = await prepararImportacao(lido);
      renderRevisao();
    } catch (falha) {
      console.error(falha);
      plano = null;
      $('.cm-revisao').replaceChildren();
      atualizarRodape();
      erro(falha.message || 'Não foi possível buscar o evento.');
    } finally {
      botao.disabled = false;
      botao.textContent = 'Buscar';
    }
  });

  // ---------- Revisão ----------
  const tiposPorId = () => new Map(plano.cad.tipos.map((t) => [t.id, t]));
  const nomeLado = (l, lado) =>
    lado.equipe?.nome ?? (lado.wrestlers.length <= 2 ? lado.wrestlers.map((w) => w.nome).join(' & ') : `${lado.wrestlers.slice(0, -1).map((w) => w.nome).join(', ')} & ${lado.wrestlers.at(-1).nome}`);
  const opcoes = (lista, atual) => lista.map((x) => `<option value="${x.id}"${x.id === atual ? ' selected' : ''}>${esc(x.nome)}</option>`).join('');
  const porNome = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR');

  function htmlEvento() {
    const ev = plano.evento;
    const existente = ev.existenteId && plano.cad.eventos.find((e) => e.id === ev.existenteId);
    if (existente) {
      const emp = plano.cad.empresas.find((e) => e.id === existente.empresaId);
      return `<section class="cm-bloco cm-evento">
        <span class="cm-selo cm-selo-ok">Evento já cadastrado</span>
        <h3>${esc(existente.nome)}</h3>
        <p>${formatarData(existente.data)} · ${esc(emp?.nome ?? '')}</p>
      </section>`;
    }
    const empresas = [...plano.cad.empresas].sort(porNome);
    return `<section class="cm-bloco cm-evento">
      <span class="cm-selo cm-selo-novo">Evento novo</span>
      <div class="cm-grade">
        <label class="campo"><span class="campo-rotulo">Nome</span><input class="campo-entrada" data-ev="nome" value="${esc(ev.nome)}" /></label>
        <label class="campo"><span class="campo-rotulo">Data</span><input type="date" class="campo-entrada" data-ev="data" value="${esc(ev.data ?? '')}" /></label>
        <label class="campo"><span class="campo-rotulo">Empresa</span>
          <select class="campo-entrada" data-ev="empresa">
            ${ev.novaEmpresa ? `<option value="nova"${ev.empresaId ? '' : ' selected'}>Nova: ${esc(ev.novaEmpresa.nome)}</option>` : ''}
            ${!ev.empresaId && !ev.novaEmpresa ? '<option value="" selected>Escolha…</option>' : ''}
            ${opcoes(empresas, ev.empresaId)}
          </select></label>
      </div>
      ${ev.novaEmpresa && !ev.empresaId ? `<div class="cm-nova-empresa">
        <label class="campo"><span class="campo-rotulo">Sigla da empresa nova</span><input class="campo-entrada" data-ev="sigla" maxlength="12" value="${esc(ev.novaEmpresa.sigla)}" /></label>
        <div class="cm-cor"></div>
      </div>` : ''}
    </section>`;
  }

  function htmlEscolhas() {
    const usadas = plano.lutas.filter((l) => l.incluir);
    const titulos = [...plano.pendTitulos].filter(([k]) => usadas.some((l) => l.tituloChave === k));
    const estips = [...plano.pendEstipulacoes].filter(([k]) => usadas.some((l) => l.estipulacaoChave === k));
    if (!titulos.length && !estips.length) return '';
    const linha = (tipo, k, p, lista, nenhum) => `<div class="cm-escolha">
      <span class="cm-escolha-texto"><small>${tipo === 'titulo' ? 'Título' : 'Estipulação'} no Cagematch</small>${esc(p.texto)}</span>
      <select class="campo-entrada${p.escolha ? '' : ' cm-falta'}" data-escolha="${tipo}" data-chave="${esc(k)}">
        <option value=""${p.escolha ? '' : ' selected'}>Escolha…</option>
        <option value="criar"${p.escolha === 'criar' ? ' selected' : ''}>Criar “${esc(p.texto)}”</option>
        <option value="nenhum"${p.escolha === 'nenhum' ? ' selected' : ''}>${nenhum}</option>
        ${lista.length ? `<optgroup label="Usar um cadastrado">${opcoes([...lista].sort(porNome), p.escolha)}</optgroup>` : ''}
      </select></div>`;
    return `<section class="cm-bloco">
      <h3>Não reconhecidos</h3>
      <p class="campo-dica">Escolha uma vez; vale pra todas as lutas com o mesmo texto.</p>
      ${titulos.map(([k, p]) => linha('titulo', k, p, plano.cad.titulos, 'Não registrar título')).join('')}
      ${estips.map(([k, p]) => linha('estipulacao', k, p, plano.cad.estipulacoes, 'Ignorar (sem estipulação)')).join('')}
    </section>`;
  }

  function htmlLutas() {
    const tipos = tiposPorId();
    const listaTipos = [...plano.cad.tipos].sort(porNome);
    const nomeEstip = (l) => (l.estipulacaoId ? plano.cad.estipulacoes.find((e) => e.id === l.estipulacaoId)?.nome : l.estipulacaoTexto);
    const cards = plano.lutas.map((l, i) => {
      if (l.erro) {
        return `<div class="cm-luta cm-luta-erro"><span class="cm-luta-num">${l.ordem}</span>
          <div><strong>Não consegui ler esta luta</strong><small>${esc(l.texto || l.erro)}</small></div></div>`;
      }
      const tipo = tipos.get(l.tipoId);
      const tipoRuim = l.incluir && (!tipo || !tipoCombina(tipo, l.lados));
      const selos = [
        l.darkMatch && '<span class="cm-selo">Dark match</span>',
        l.repetida === 'backlog' && '<span class="cm-selo cm-selo-aviso">Já no Backlog</span>',
        l.repetida === 'assistida' && '<span class="cm-selo cm-selo-aviso">Já assistida</span>',
        l.semResultado && '<span class="cm-selo">Ainda não aconteceu</span>',
      ].filter(Boolean).join('');
      const detalhes = [l.titulos[0] && `♛ ${esc(l.titulos[0].nome)}`, nomeEstip(l) && esc(nomeEstip(l))].filter(Boolean).join(' · ');
      return `<div class="cm-luta${l.incluir ? '' : ' cm-desmarcada'}" data-indice="${i}">
        <label class="cm-luta-marca"><input type="checkbox" data-incluir ${l.incluir ? 'checked' : ''} aria-label="Importar luta ${l.ordem}" /><span class="cm-luta-num">${l.ordem}</span></label>
        <div class="cm-luta-corpo">
          ${selos ? `<div class="cm-selos">${selos}</div>` : ''}
          <strong class="cm-luta-confronto">${l.lados.map((lado) => esc(nomeLado(l, lado))).join(' <span>vs</span> ')}</strong>
          ${detalhes ? `<small class="cm-luta-detalhes">${detalhes}</small>` : ''}
          ${l.avisos?.length ? `<small class="cm-luta-aviso">${l.avisos.map(esc).join(' ')}</small>` : ''}
        </div>
        <select class="campo-entrada cm-tipo${tipoRuim ? ' cm-falta' : ''}" data-tipo aria-label="Tipo da luta ${l.ordem}">
          ${tipo ? '' : '<option value="" selected>Tipo…</option>'}
          ${opcoes(listaTipos, l.tipoId)}
        </select>
      </div>`;
    });
    const n = plano.lutas.filter((l) => l.incluir).length;
    return `<section class="cm-bloco">
      <h3>Lutas <span class="cm-contador">${n} de ${plano.lutas.length} marcadas</span></h3>
      <div class="cm-lutas">${cards.join('')}</div>
    </section>`;
  }

  function htmlNovos() {
    const usadas = plano.lutas.filter((l) => l.incluir);
    const chaves = new Set(usadas.flatMap((l) => l.ladosChaves.flat()));
    const novos = [...plano.wrestlers.values()].filter((w) => chaves.has(w.chave) && (!w.existenteId || w.ligadoNaRevisao));
    const ligados = [...plano.wrestlers.values()].filter((w) => chaves.has(w.chave) && w.existenteId && !w.ligadoNaRevisao).length;
    const equipesUsadas = new Set(usadas.flatMap((l) => l.equipesChaves).filter(Boolean));
    const equipesNovas = [...plano.equipes.entries()].filter(([k, e]) => equipesUsadas.has(k) && !e.existenteId);
    const equipesLigadas = [...plano.equipes.entries()].filter(([k, e]) => equipesUsadas.has(k) && e.existenteId).length;
    const empresa = plano.evento.empresaId ? plano.cad.empresas.find((e) => e.id === plano.evento.empresaId) : plano.evento.novaEmpresa;
    return `<section class="cm-bloco">
      <h3>Wrestlers</h3>
      <p class="campo-dica">${plural(ligados, 'já cadastrado', 'já cadastrados')}.
        ${novos.length ? `${plural(novos.length, 'novo vai ser criado', 'novos vão ser criados')}${empresa ? ` com a empresa ${esc(empresa.sigla || empresa.nome)}` : ''}. Se algum já existe com outro nome, escolha ele ao lado.` : ''}</p>
      ${novos.map((w) => `<div class="cm-novo">
        <span>${esc(w.nome)}${w.cagematchId ? '' : ' <small>(sem página no Cagematch)</small>'}</span>
        <input class="campo-entrada" list="cm-wrestlers" data-ligar="${esc(w.chave)}" placeholder="Criar novo" aria-label="Ligar ${esc(w.nome)} a um wrestler cadastrado"
          value="${w.existenteId ? esc(plano.cad.wrestlers.find((x) => x.id === w.existenteId)?.nome ?? '') : ''}" />
      </div>`).join('')}
      ${equipesNovas.length || equipesLigadas ? `<h3 class="cm-sub">Equipes</h3>
        <p class="campo-dica">${plural(equipesLigadas, 'já cadastrada', 'já cadastradas')}.${equipesNovas.length ? ' Novas (desmarque pra não criar):' : ''}</p>
        ${equipesNovas.map(([k, e]) => `<label class="cm-equipe"><input type="checkbox" data-equipe="${esc(k)}" ${e.criar ? 'checked' : ''} /> ${esc(e.nome)}</label>`).join('')}` : ''}
    </section>`;
  }

  function renderRevisao() {
    const lista = [...plano.cad.wrestlers].sort(porNome);
    $('.cm-revisao').innerHTML = `
      <datalist id="cm-wrestlers">${lista.map((w) => `<option value="${esc(w.nome)}"></option>`).join('')}</datalist>
      <div class="cm-evento-caixa">${htmlEvento()}</div>
      <div class="cm-escolhas-caixa">${htmlEscolhas()}</div>
      <div class="cm-lutas-caixa">${htmlLutas()}</div>
      <div class="cm-novos-caixa">${htmlNovos()}</div>`;
    montarCor();
    atualizarRodape();
  }

  // Redesenha só o que depende das lutas marcadas (mantém o foco nos campos do evento).
  function renderParcial() {
    $('.cm-escolhas-caixa').innerHTML = htmlEscolhas();
    $('.cm-lutas-caixa').innerHTML = htmlLutas();
    $('.cm-novos-caixa').innerHTML = htmlNovos();
    atualizarRodape();
  }

  let cor = null;
  function montarCor() {
    const caixa = $('.cm-cor');
    if (!caixa) return;
    cor = campoCor({ rotulo: 'Cor da empresa nova', valor: plano.evento.novaEmpresa.cor });
    caixa.append(cor.el);
    caixa.addEventListener('click', () => (plano.evento.novaEmpresa.cor = cor.ler()));
    caixa.addEventListener('input', () => (plano.evento.novaEmpresa.cor = cor.ler()));
  }

  function atualizarRodape() {
    const botao = rodape.querySelector('.cm-salvar');
    const lista = rodape.querySelector('.cm-pendencias');
    if (!plano) {
      botao.disabled = true;
      lista.replaceChildren();
      return;
    }
    const p = pendencias(plano);
    const n = plano.lutas.filter((l) => l.incluir).length;
    botao.disabled = p.length > 0;
    botao.textContent = n ? `Adicionar ${plural(n, 'luta', 'lutas')} ao Backlog` : 'Adicionar ao Backlog';
    lista.innerHTML = p.slice(0, 3).map((t) => `<li>${esc(t)}</li>`).join('') + (p.length > 3 ? `<li>e mais ${p.length - 3}…</li>` : '');
  }

  // ---------- Eventos da revisão ----------
  $('.cm-revisao').addEventListener('input', (e) => {
    const campo = e.target.dataset.ev;
    if (campo === 'nome') plano.evento.nome = e.target.value;
    if (campo === 'data') plano.evento.data = e.target.value || null;
    if (campo === 'sigla') plano.evento.novaEmpresa.sigla = e.target.value;
    if (campo) atualizarRodape();
  });

  $('.cm-revisao').addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.ev === 'empresa') {
      plano.evento.empresaId = t.value && t.value !== 'nova' ? t.value : null;
      return renderRevisao();
    }
    if (t.dataset.escolha) {
      const mapa = t.dataset.escolha === 'titulo' ? plano.pendTitulos : plano.pendEstipulacoes;
      mapa.get(t.dataset.chave).escolha = t.value || null;
      t.classList.toggle('cm-falta', !t.value);
      return renderParcial();
    }
    const card = t.closest('.cm-luta[data-indice]');
    if (card) {
      const l = plano.lutas[card.dataset.indice];
      if (t.matches('[data-incluir]')) l.incluir = t.checked;
      if (t.matches('[data-tipo]')) l.tipoId = t.value || null;
      marcarRepetidas(plano); // repetida marcada de propósito continua marcada
      return renderParcial();
    }
    if (t.dataset.equipe) {
      plano.equipes.get(t.dataset.equipe).criar = t.checked;
      return atualizarRodape();
    }
    if (t.dataset.ligar) {
      const w = plano.wrestlers.get(t.dataset.ligar);
      const nome = normalizar(t.value);
      const achado = nome ? plano.cad.wrestlers.find((x) => normalizar(x.nome) === nome) : null;
      if (nome && !achado) {
        toast('Wrestler não encontrado. Escolha um nome da lista ou deixe em branco pra criar.', 'erro');
        t.value = '';
      }
      w.existenteId = achado?.id ?? null;
      w.ligadoNaRevisao = Boolean(achado);
      marcarRepetidas(plano);
      return renderParcial();
    }
  });

  // ---------- Salvar ----------
  rodape.querySelector('.cm-salvar').addEventListener('click', async (e) => {
    const botao = e.currentTarget;
    if (!plano || botao.disabled || pendencias(plano).length) return;
    botao.disabled = true;
    try {
      const r = await salvarImportacao(plano);
      fecharPainel();
      const extras = [r.wrestlersCriados && plural(r.wrestlersCriados, 'wrestler novo', 'wrestlers novos'), r.equipesCriadas && plural(r.equipesCriadas, 'equipe nova', 'equipes novas')].filter(Boolean);
      toast(`${plural(r.lutas, 'luta adicionada', 'lutas adicionadas')} ao Backlog${extras.length ? ` · ${extras.join(' · ')}` : ''}`);
      await aoConcluir?.(r);
    } catch (falha) {
      console.error(falha);
      toast('Não foi possível salvar a importação.', 'erro');
      botao.disabled = false;
    }
  });

  abrirPainel({ titulo: 'Importar do Cagematch', subtitulo: 'Backlog', conteudo, rodape, largo: true });
}
