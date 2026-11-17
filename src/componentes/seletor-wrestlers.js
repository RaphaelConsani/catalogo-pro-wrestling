import { ativos, salvar } from '../db/repo.js';
import { esc, normalizar } from '../util/texto.js';
import { toast } from './toast.js';

// Seletor de wrestlers com rolagem, busca e criação na hora.
// Usado nas equipes (etapa 2) e nos lados das lutas (etapa 3).
//
// opcoes:
//   selecionados: ids já escolhidos (a ordem é mantida)
//   aoMudar(ids): chamado a cada alteração feita pelo usuário
//   limite: máximo de escolhidos (null = sem limite)
//   compacto: a lista só aparece com a busca em foco (usado nos lados da luta)
export async function criarSeletorWrestlers({ selecionados = [], aoMudar, limite = null, compacto = false } = {}) {
  let wrestlers = [];
  let empresas = new Map();
  let escolhidos = [...selecionados];
  let busca = '';

  const el = document.createElement('div');
  el.className = `seletor${compacto ? ' seletor-compacto' : ''}`;
  el.innerHTML = `
    <div class="seletor-escolhidos"></div>
    <input type="search" class="campo-entrada seletor-busca" placeholder="Buscar ou criar wrestler…" autocomplete="off" />
    <ul class="seletor-lista" role="listbox" aria-multiselectable="true"></ul>`;
  const elEscolhidos = el.querySelector('.seletor-escolhidos');
  const elBusca = el.querySelector('.seletor-busca');
  const elLista = el.querySelector('.seletor-lista');

  async function carregar() {
    const [ws, es] = await Promise.all([ativos('wrestlers'), ativos('empresas')]);
    wrestlers = ws.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    empresas = new Map(es.map((e) => [e.id, e]));
  }

  const porId = (id) => wrestlers.find((w) => w.id === id);

  const etiquetaEmpresa = (w) => {
    const e = empresas.get(w.empresaId);
    return e ? `<span class="seletor-empresa" style="--cor:${esc(e.cor)}">${esc(e.sigla || e.nome)}</span>` : '';
  };

  function mudou() {
    renderEscolhidos();
    renderLista();
    aoMudar?.([...escolhidos]);
  }

  function renderEscolhidos() {
    elEscolhidos.innerHTML = escolhidos.length
      ? escolhidos
          .map((id) => {
            const w = porId(id);
            return `<span class="chip">${esc(w?.nome ?? '(wrestler excluído)')}
              <button type="button" class="chip-remover" data-remover="${id}" aria-label="Remover ${esc(w?.nome ?? '')}">✕</button></span>`;
          })
          .join('')
      : '<span class="seletor-vazio">Nenhum wrestler escolhido</span>';
  }

  function renderLista() {
    const termo = normalizar(busca);
    const filtrados = termo ? wrestlers.filter((w) => normalizar(w.nome).includes(termo)) : wrestlers;
    const cheio = limite != null && escolhidos.length >= limite;
    const existeIgual = termo && wrestlers.some((w) => normalizar(w.nome) === termo);
    const criar = busca.trim() && !cheio
      ? `<li class="seletor-item seletor-criar" data-criar>
           <span>＋ ${existeIgual ? 'Criar outro' : 'Criar wrestler'} “${esc(busca.trim())}”</span>
           ${existeIgual ? '<small>já existe um com esse nome</small>' : ''}
         </li>`
      : '';
    const itens = filtrados
      .map((w) => {
        const sel = escolhidos.includes(w.id);
        const bloqueado = cheio && !sel;
        return `<li class="seletor-item${sel ? ' selecionado' : ''}${bloqueado ? ' bloqueado' : ''}" role="option" aria-selected="${sel}" aria-disabled="${bloqueado}" data-id="${w.id}">
          <span class="seletor-marca" aria-hidden="true">${sel ? '✓' : ''}</span>
          <span class="seletor-nome">${esc(w.nome)}</span>${etiquetaEmpresa(w)}
        </li>`;
      })
      .join('');
    elLista.innerHTML =
      criar + (itens || (busca ? '' : '<li class="seletor-nada">Nenhum wrestler cadastrado ainda</li>'));
  }

  async function criarNaHora() {
    const nome = busca.trim();
    if (!nome) return;
    const novo = await salvar('wrestlers', { nome, empresaId: null, imagemId: null });
    await carregar();
    if (limite == null || escolhidos.length < limite) escolhidos.push(novo.id);
    busca = '';
    elBusca.value = '';
    toast(`Wrestler “${nome}” criado`);
    mudou();
    elBusca.focus();
  }

  function alternar(id) {
    if (!escolhidos.includes(id) && limite != null && escolhidos.length >= limite) return;
    escolhidos = escolhidos.includes(id) ? escolhidos.filter((x) => x !== id) : [...escolhidos, id];
    mudou();
  }

  elBusca.addEventListener('input', () => {
    busca = elBusca.value;
    renderLista();
  });
  elBusca.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const primeiro = elLista.querySelector('[data-id]:not(.bloqueado)');
    if (primeiro && busca.trim()) {
      const id = primeiro.dataset.id;
      if (!escolhidos.includes(id)) alternar(id);
      busca = '';
      elBusca.value = '';
      renderLista();
    } else if (busca.trim() && !(limite != null && escolhidos.length >= limite)) {
      criarNaHora();
    }
  });
  elLista.addEventListener('click', (e) => {
    const item = e.target.closest('.seletor-item');
    if (!item) return;
    if (item.hasAttribute('data-criar')) criarNaHora();
    else alternar(item.dataset.id);
  });
  elEscolhidos.addEventListener('click', (e) => {
    const b = e.target.closest('[data-remover]');
    if (b) alternar(b.dataset.remover);
  });

  if (compacto) {
    // Lista aberta só enquanto a busca (ou a própria lista) tem o foco.
    elBusca.addEventListener('focus', () => el.classList.add('aberto'));
    el.addEventListener('focusout', () =>
      setTimeout(() => {
        if (!el.contains(document.activeElement)) el.classList.remove('aberto');
      }, 120),
    );
    elLista.addEventListener('mousedown', (e) => e.preventDefault()); // mantém o foco na busca ao clicar
  }

  await carregar();
  renderEscolhidos();
  renderLista();

  return {
    el,
    valor: () => [...escolhidos],
    definir(ids) {
      escolhidos = [...ids];
      renderEscolhidos();
      renderLista();
    },
    definirLimite(n) {
      limite = n;
      renderLista();
    },
    async recarregar() {
      await carregar();
      renderEscolhidos();
      renderLista();
    },
  };
}
