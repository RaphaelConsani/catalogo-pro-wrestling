import { esc } from '../util/texto.js';
import { prepararImagem } from '../util/imagem.js';
import { criarSeletorWrestlers } from './seletor-wrestlers.js';

// Construtores de campos de formulário. Cada um devolve { el, ler(), erro() }:
//   ler()  -> valor atual
//   erro() -> mensagem de validação ou null

function envolver(rotulo, obrigatorio, dica = '') {
  const el = document.createElement('div');
  el.className = 'campo';
  el.innerHTML = `
    <label class="campo-rotulo">${esc(rotulo)}${obrigatorio ? ' <span class="campo-obrigatorio">*</span>' : ''}</label>
    <div class="campo-controle"></div>
    ${dica ? `<small class="campo-dica">${esc(dica)}</small>` : ''}
    <small class="campo-erro" hidden></small>`;
  // Qualquer interação com o campo limpa o erro mostrado.
  const limpar = () => {
    if (!el.classList.contains('com-erro')) return;
    el.classList.remove('com-erro');
    el.querySelector('.campo-erro').hidden = true;
  };
  for (const evento of ['input', 'change', 'click']) el.addEventListener(evento, limpar);
  return { el, controle: el.querySelector('.campo-controle') };
}

export function mostrarErro(campo, mensagem) {
  const e = campo.el.querySelector('.campo-erro');
  e.hidden = !mensagem;
  e.textContent = mensagem ?? '';
  campo.el.classList.toggle('com-erro', Boolean(mensagem));
}

export function campoTexto({ rotulo, valor = '', obrigatorio = false, placeholder = '', maximo = 120 }) {
  const { el, controle } = envolver(rotulo, obrigatorio);
  controle.innerHTML = `<input type="text" class="campo-entrada" maxlength="${maximo}" placeholder="${esc(placeholder)}" />`;
  const input = controle.querySelector('input');
  input.value = valor ?? '';
  return {
    el,
    ler: () => input.value.trim(),
    erro: () => (obrigatorio && !input.value.trim() ? 'Campo obrigatório.' : null),
  };
}

export function campoData({ rotulo, valor = '', obrigatorio = false }) {
  const { el, controle } = envolver(rotulo, obrigatorio);
  controle.innerHTML = `<input type="date" class="campo-entrada" />`;
  const input = controle.querySelector('input');
  input.value = valor ?? '';
  return {
    el,
    ler: () => input.value || null,
    erro: () => (obrigatorio && !input.value ? 'Informe a data.' : null),
  };
}

export function campoNumero({ rotulo, valor = 1, minimo = 1, maximo = 99, obrigatorio = true }) {
  const { el, controle } = envolver(rotulo, obrigatorio);
  controle.innerHTML = `<input type="number" class="campo-entrada campo-numero" min="${minimo}" max="${maximo}" step="1" />`;
  const input = controle.querySelector('input');
  input.value = valor ?? minimo;
  return {
    el,
    ler: () => Number(input.value),
    erro: () => {
      const n = Number(input.value);
      return Number.isInteger(n) && n >= minimo && n <= maximo ? null : `Use um número inteiro de ${minimo} a ${maximo}.`;
    },
  };
}

export function campoInterruptor({ rotulo, valor = false, dica = '' }) {
  const { el, controle } = envolver(rotulo, false, dica);
  controle.innerHTML = `<label class="interruptor"><input type="checkbox" /><span></span></label>`;
  const input = controle.querySelector('input');
  input.checked = Boolean(valor);
  return { el, ler: () => input.checked, erro: () => null };
}

// opcoes: [{ id, nome, cor? }]
export function campoSelecao({ rotulo, valor = null, opcoes, obrigatorio = false, vazio = 'Nenhuma' }) {
  const { el, controle } = envolver(rotulo, obrigatorio);
  controle.innerHTML = `<select class="campo-entrada">
    <option value="">${obrigatorio ? 'Escolha…' : esc(vazio)}</option>
    ${opcoes.map((o) => `<option value="${o.id}">${esc(o.nome)}</option>`).join('')}
  </select>`;
  const select = controle.querySelector('select');
  select.value = valor ?? '';
  return {
    el,
    select,
    ler: () => select.value || null,
    erro: () => (obrigatorio && !select.value ? 'Escolha uma opção.' : null),
  };
}

// Várias opções como chips liga/desliga (ex.: empresas parceiras).
export function campoMultiChips({ rotulo, valor = [], opcoes, dica = '' }) {
  const { el, controle } = envolver(rotulo, false, dica);
  let escolhidos = new Set(valor);
  let ocultos = new Set();
  const render = () => {
    const visiveis = opcoes.filter((o) => !ocultos.has(o.id));
    controle.innerHTML = visiveis.length
      ? `<div class="chips-opcoes">${visiveis
          .map(
            (o) => `<button type="button" class="chip-opcao${escolhidos.has(o.id) ? ' ligado' : ''}"
              data-id="${o.id}" aria-pressed="${escolhidos.has(o.id)}" style="--cor:${esc(o.cor ?? 'var(--neon)')}">${esc(o.nome)}</button>`,
          )
          .join('')}</div>`
      : '<span class="campo-dica">Nenhuma opção disponível.</span>';
  };
  controle.addEventListener('click', (e) => {
    const b = e.target.closest('.chip-opcao');
    if (!b) return;
    const id = b.dataset.id;
    escolhidos.has(id) ? escolhidos.delete(id) : escolhidos.add(id);
    render();
  });
  render();
  return {
    el,
    ler: () => [...escolhidos].filter((id) => !ocultos.has(id)),
    erro: () => null,
    ocultar(ids) {
      ocultos = new Set(ids);
      render();
    },
  };
}

// Cores prontas que funcionam bem no tema escuro + seletor livre + hex.
// Sem dourado: ele é reservado pras lutas 5★ e acima de 4½.
export const PALETA_EMPRESAS = [
  '#ff3b5c', '#e11d48', '#ff8a3d', '#84cc16', '#39d98a', '#14b8a6',
  '#22e6ff', '#3b82f6', '#6366f1', '#a855ff', '#ec4899', '#cbd5e1',
];

export function campoCor({ rotulo, valor = '#22e6ff', obrigatorio = true }) {
  const { el, controle } = envolver(rotulo, obrigatorio);
  controle.innerHTML = `
    <div class="cor-paleta">
      ${PALETA_EMPRESAS.map((c) => `<button type="button" class="cor-amostra" data-cor="${c}" style="--cor:${c}" aria-label="Cor ${c}"></button>`).join('')}
    </div>
    <div class="cor-livre">
      <input type="color" class="cor-seletor" aria-label="Escolher outra cor" />
      <input type="text" class="campo-entrada cor-hex" maxlength="7" placeholder="#000000" aria-label="Código hex" />
    </div>`;
  const seletor = controle.querySelector('.cor-seletor');
  const hex = controle.querySelector('.cor-hex');
  const valida = (v) => /^#[0-9a-f]{6}$/i.test(v);
  const definir = (v) => {
    hex.value = v;
    if (valida(v)) seletor.value = v;
    for (const a of controle.querySelectorAll('.cor-amostra')) {
      a.setAttribute('aria-pressed', String(a.dataset.cor.toLowerCase() === v.toLowerCase()));
    }
  };
  controle.addEventListener('click', (e) => {
    const a = e.target.closest('.cor-amostra');
    if (a) definir(a.dataset.cor);
  });
  seletor.addEventListener('input', () => definir(seletor.value));
  hex.addEventListener('input', () => {
    let v = hex.value.trim();
    if (v && !v.startsWith('#')) v = '#' + v;
    definir(v);
  });
  definir(valor || '#22e6ff');
  return {
    el,
    ler: () => hex.value.trim().toLowerCase(),
    erro: () => (valida(hex.value.trim()) ? null : 'Use uma cor no formato #RRGGBB.'),
  };
}

// Anexo de imagem com pré-visualização. formato: 'logo' | 'poster' | 'foto'.
// ler() -> { imagemId (atual), nova ({blob,largura,altura} | null), remover (bool) }
export function campoImagem({ rotulo, imagemId = null, urlAtual = null, formato = 'foto' }) {
  const { el, controle } = envolver(rotulo, false, 'Opcional. A imagem é reduzida automaticamente (máx. 800px).');
  let nova = null;
  let remover = false;
  let urlPrevia = null;
  controle.innerHTML = `
    <div class="imagem-campo">
      <div class="moldura moldura-${formato} imagem-previa"></div>
      <div class="imagem-acoes">
        <label class="botao botao-fantasma botao-pequeno">
          Escolher imagem<input type="file" accept="image/*" hidden />
        </label>
        <button type="button" class="botao botao-fantasma botao-pequeno imagem-remover">Remover</button>
        <small class="imagem-info"></small>
      </div>
    </div>`;
  const previa = controle.querySelector('.imagem-previa');
  const arquivo = controle.querySelector('input[type=file]');
  const botaoRemover = controle.querySelector('.imagem-remover');
  const info = controle.querySelector('.imagem-info');

  const render = () => {
    const url = nova ? urlPrevia : remover ? null : urlAtual;
    previa.innerHTML = url ? `<img src="${url}" alt="" />` : `<span class="moldura-vazia">Sem imagem</span>`;
    botaoRemover.hidden = !url;
  };

  async function usar(file) {
    if (!file) return;
    info.textContent = 'Processando…';
    try {
      nova = await prepararImagem(file);
      remover = false;
      if (urlPrevia) URL.revokeObjectURL(urlPrevia);
      urlPrevia = URL.createObjectURL(nova.blob);
      info.textContent = `${nova.largura}×${nova.altura} · ${Math.round(nova.blob.size / 1024)} KB`;
    } catch (erro) {
      info.textContent = erro.message || 'Não foi possível ler essa imagem.';
    }
    render();
  }

  arquivo.addEventListener('change', () => usar(arquivo.files[0]));
  botaoRemover.addEventListener('click', () => {
    nova = null;
    remover = true;
    info.textContent = '';
    render();
  });
  previa.addEventListener('dragover', (e) => {
    e.preventDefault();
    previa.classList.add('arrastando');
  });
  previa.addEventListener('dragleave', () => previa.classList.remove('arrastando'));
  previa.addEventListener('drop', (e) => {
    e.preventDefault();
    previa.classList.remove('arrastando');
    usar(e.dataTransfer.files[0]);
  });
  render();
  return { el, ler: () => ({ imagemId, nova, remover }), erro: () => null };
}

export async function campoWrestlers({ rotulo, valor = [], obrigatorio = false, minimo = 0 }) {
  const { el, controle } = envolver(rotulo, obrigatorio);
  const seletor = await criarSeletorWrestlers({ selecionados: valor });
  controle.append(seletor.el);
  return {
    el,
    ler: () => seletor.valor(),
    erro: () => (seletor.valor().length < minimo ? `Escolha pelo menos ${minimo} wrestlers.` : null),
  };
}
