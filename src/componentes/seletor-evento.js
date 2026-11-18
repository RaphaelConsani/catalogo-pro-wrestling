import { ativos, salvar, buscarDuplicado } from '../db/repo.js';
import { campoTexto, campoData, campoSelecao, mostrarErro } from './campos.js';
import { esc, normalizar, formatarData } from '../util/texto.js';
import { toast } from './toast.js';

// Escolha do evento da luta: busca + lista, ou criação na hora (nome, data e empresa).
// aoMudar(evento|null) recebe o registro completo do evento.
export async function criarSeletorEvento({ valor = null, aoMudar } = {}) {
  let eventos = [];
  let empresas = new Map();
  let escolhido = null;
  let busca = '';

  const el = document.createElement('div');
  el.className = 'seletor-evento';

  async function carregar() {
    const [evs, es] = await Promise.all([ativos('eventos'), ativos('empresas')]);
    eventos = evs.sort((a, b) => (b.data ?? '').localeCompare(a.data ?? '') || a.nome.localeCompare(b.nome, 'pt-BR'));
    empresas = new Map(es.map((e) => [e.id, e]));
  }

  const descricao = (ev) => {
    const e = empresas.get(ev.empresaId);
    return `${formatarData(ev.data)} · <span style="color:${esc(e?.cor ?? 'inherit')}">${esc(e?.sigla || e?.nome || '?')}</span>`;
  };

  function render() {
    if (escolhido) {
      const e = empresas.get(escolhido.empresaId);
      el.innerHTML = `
        <div class="evento-escolhido" style="--cor-empresa:${esc(e?.cor ?? 'var(--borda-forte)')}">
          <div>
            <strong>${esc(escolhido.nome)}</strong>
            <span>${descricao(escolhido)}</span>
          </div>
          <button type="button" class="botao botao-fantasma botao-pequeno trocar">Trocar</button>
        </div>`;
      return;
    }
    el.innerHTML = `
      <input type="search" class="campo-entrada evento-busca" placeholder="Buscar evento ou criar novo…" autocomplete="off" />
      <ul class="seletor-lista evento-lista"></ul>`;
    const input = el.querySelector('.evento-busca');
    input.value = busca;
    renderLista();
    input.addEventListener('input', () => {
      busca = input.value;
      renderLista();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const primeiro = el.querySelector('.evento-lista [data-id]');
      if (primeiro) escolher(primeiro.dataset.id);
      else if (busca.trim()) criarNaHora();
    });
  }

  function renderLista() {
    const termo = normalizar(busca);
    const filtrados = termo
      ? eventos.filter((ev) => normalizar(`${ev.nome} ${empresas.get(ev.empresaId)?.sigla ?? ''} ${formatarData(ev.data)}`).includes(termo))
      : eventos;
    const criar = `<li class="seletor-item seletor-criar" data-criar><span>＋ Criar evento${busca.trim() ? ` “${esc(busca.trim())}”` : ''}</span></li>`;
    el.querySelector('.evento-lista').innerHTML =
      criar +
      filtrados
        .slice(0, 200)
        .map((ev) => `<li class="seletor-item" data-id="${ev.id}"><span class="seletor-nome">${esc(ev.nome)}</span><small>${descricao(ev)}</small></li>`)
        .join('');
  }

  function escolher(id, avisar = true) {
    escolhido = eventos.find((e) => e.id === id) ?? null;
    busca = '';
    render();
    if (avisar) aoMudar?.(escolhido);
  }

  async function criarNaHora() {
    const opcoes = [...empresas.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const campos = {
      nome: campoTexto({ rotulo: 'Nome', valor: busca.trim(), obrigatorio: true, placeholder: 'Wrestle Kingdom 18' }),
      data: campoData({ rotulo: 'Data', obrigatorio: true }),
      empresaId: campoSelecao({ rotulo: 'Empresa principal', opcoes, obrigatorio: true }),
    };
    const d = document.createElement('dialog');
    d.className = 'dialogo dialogo-form';
    d.innerHTML = `<h3>Novo evento</h3><form class="formulario" novalidate></form>
      <p class="campo-dica">Pôster e empresas parceiras podem ser adicionados depois, em Cadastros.</p>
      <div class="dialogo-acoes">
        <button type="button" class="botao botao-fantasma" value="nao">Cancelar</button>
        <button type="button" class="botao botao-primario" value="sim">Criar evento</button>
      </div>`;
    const form = d.querySelector('form');
    for (const c of Object.values(campos)) form.append(c.el);
    document.body.append(d);
    d.showModal();
    campos.nome.el.querySelector('input').focus();

    d.addEventListener('close', () => d.remove());
    d.querySelector('[value="nao"]').addEventListener('click', () => d.close());
    let salvando = false; // evita criar o evento duas vezes (clique duplo / Enter repetido)
    const confirmar = async () => {
      if (salvando) return;
      let ok = true;
      for (const c of Object.values(campos)) {
        const erro = c.erro();
        mostrarErro(c, erro);
        if (erro) ok = false;
      }
      if (!ok) return;
      const dados = { nome: campos.nome.ler(), data: campos.data.ler(), empresaId: campos.empresaId.ler(), parceirasIds: [], imagemId: null };
      salvando = true;
      try {
        if (await buscarDuplicado('eventos', dados)) {
          mostrarErro(campos.nome, 'Já existe um evento com esse nome nessa data.');
          return;
        }
        const novo = await salvar('eventos', dados);
        await carregar();
        d.close();
        toast(`Evento “${novo.nome}” criado`);
        escolher(novo.id);
      } catch (erro) {
        console.error(erro);
        toast('Não foi possível criar o evento.', 'erro');
      } finally {
        salvando = false;
      }
    };
    d.querySelector('[value="sim"]').addEventListener('click', confirmar);
    form.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        confirmar();
      }
    });
  }

  el.addEventListener('click', (e) => {
    if (e.target.closest('.trocar')) {
      escolhido = null;
      render();
      aoMudar?.(null);
      el.querySelector('.evento-busca')?.focus();
      return;
    }
    const item = e.target.closest('.seletor-item');
    if (!item) return;
    if (item.hasAttribute('data-criar')) criarNaHora();
    else escolher(item.dataset.id);
  });

  await carregar();
  if (valor) escolher(valor, false);
  else render();

  return {
    el,
    valor: () => escolhido,
    definir: (id) => escolher(id, false),
  };
}
