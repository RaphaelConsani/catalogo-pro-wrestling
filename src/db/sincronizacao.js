import { db } from './schema.js';
import { novoId, agora } from '../util/ids.js';

// Sincronização entre aparelhos pelo Cloudflare (função em sync/). Regras em docs/DECISOES.md › Fase 2.
//
// Como o app sabe o que mandar: ganchos do Dexie marcam todo registro criado ou alterado
// neste aparelho com _pendente = 1 (e o aparelho de origem em criadoNo). O que chega da nuvem
// é gravado com o marcador _remoto e fica com _pendente = 0. Registros antigos, sem o campo,
// contam como pendentes (sobem todos na primeira sincronização).

// No "npm run dev" usa a função rodando no computador (cd sync && npx wrangler dev --port 8788).
export const URL_SYNC = import.meta.env.DEV ? 'http://localhost:8788' : 'https://catalogo-sync.raphaelconsani.workers.dev';
export const TABELAS_SYNC = ['empresas', 'eventos', 'wrestlers', 'equipes', 'tiposMatch', 'estipulacoes', 'titulos', 'plataformas', 'metodosVitoria', 'lutas', 'visualizacoes', 'backlog', 'imagens'];
// Da tabela config só estas sincronizam (o resto é do aparelho: último backup, lembrete, cursor).
export const CONFIG_SYNC = ['corAcento', 'duplicadosIgnorados'];
const POR_ENVIO = 100;
const IMAGENS_POR_ENVIO = 5;
const ESPERA_ALTERACAO = 4000; // ms depois da última alteração
const INTERVALO = 60000; // com o app aberto e visível

let dispositivo = null; // id deste aparelho (gerado uma vez)

// ---------- Ganchos: marcam o que mudou neste aparelho ----------

const sincroniza = (tabela, obj) => tabela !== 'config' || CONFIG_SYNC.includes(obj?.chave);

function instalarGanchos() {
  for (const tabela of [...TABELAS_SYNC, 'config']) {
    const t = db.table(tabela);
    t.hook('creating', (_, obj) => {
      if (!sincroniza(tabela, obj)) return;
      if (obj._remoto) {
        delete obj._remoto;
        obj._pendente = 0;
        return;
      }
      obj._pendente = 1;
      if (tabela !== 'config' && !obj.criadoNo && dispositivo) obj.criadoNo = dispositivo;
      agendar();
    });
    t.hook('updating', (mods, _, obj) => {
      if (!sincroniza(tabela, obj)) return undefined;
      if (mods._remoto) return { _remoto: undefined, _pendente: 0 };
      agendar();
      return { _pendente: 1 };
    });
  }
}
instalarGanchos(); // antes de qualquer gravação (inclusive os dados iniciais do banco)

// ---------- Configuração deste aparelho ----------

const lerConf = async (chave) => (await db.config.get(chave))?.valor ?? null;
const gravarConf = (chave, valor) => db.config.put({ chave, valor });

export const lerSync = () => lerConf('sync'); // { chave, geracao, cursor, ultimaSync, substituirPendente } | null
const gravarSync = async (mudancas) => {
  const atual = (await lerSync()) ?? {};
  await gravarConf('sync', { ...atual, ...mudancas });
};

export const idDispositivo = () => dispositivo;

// Chave nova: 32 bytes aleatórios em base64url (43 caracteres).
export function gerarChave() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ---------- Estado (pro indicador do topo e a tela Dados) ----------

const estado = { situacao: 'desligada', ultimaSync: null, erro: null };
const ouvintes = new Set();
export const lerEstado = () => ({ ...estado });
export function aoMudarEstado(fn) {
  ouvintes.add(fn);
  fn(lerEstado());
  return () => ouvintes.delete(fn);
}
function mudar(m) {
  Object.assign(estado, m);
  for (const fn of ouvintes) fn(lerEstado());
}

// ---------- Comunicação ----------

class ErroSync extends Error {
  constructor(status, mensagem, extra = {}) {
    super(mensagem);
    Object.assign(this, { status, extra });
  }
}

async function pedir(conf, metodo, rota, corpo) {
  let r;
  try {
    r = await fetch(URL_SYNC + rota, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${conf.chave}`,
        'Content-Type': 'application/json',
        'X-Geracao': String(conf.geracao ?? 0),
        'X-Dispositivo': dispositivo ?? '',
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new ErroSync(0, 'Sem conexão');
  }
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErroSync(r.status, dados.erro || `Erro ${r.status}`, dados);
  return dados;
}

// ---------- Conversões ----------

const blobParaBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

function base64ParaBlob(base64, tipo) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: tipo });
}

const quando = (tabela, r) => r.atualizadoEm ?? r.criadoEm ?? '1970-01-01T00:00:00.000Z';
const idDe = (tabela, r) => (tabela === 'config' ? r.chave : r.id);
const limpo = ({ _pendente, _remoto, ...resto }) => resto;

// ---------- Enviar ----------

async function pendentes() {
  const lista = [];
  for (const tabela of TABELAS_SYNC) {
    const regs = await db.table(tabela).filter((r) => r._pendente !== 0).toArray();
    for (const r of regs) lista.push({ tabela, r });
  }
  const conf = (await db.config.bulkGet(CONFIG_SYNC)).filter((r) => r && r._pendente !== 0);
  for (const r of conf) lista.push({ tabela: 'config', r });
  return lista;
}

async function paraEnvio({ tabela, r }) {
  let dados = limpo(r);
  if (tabela === 'imagens') {
    const { blob, ...resto } = dados;
    dados = { ...resto, mimeType: resto.mimeType || blob?.type, dados: blob ? await blobParaBase64(blob) : '' };
  }
  return { tabela, id: idDe(tabela, r), atualizadoEm: quando(tabela, r), dados };
}

async function enviar(conf) {
  const lista = await pendentes();
  const imagens = lista.filter((x) => x.tabela === 'imagens');
  const resto = lista.filter((x) => x.tabela !== 'imagens');
  const lotes = [];
  for (let i = 0; i < resto.length; i += POR_ENVIO) lotes.push(resto.slice(i, i + POR_ENVIO));
  for (let i = 0; i < imagens.length; i += IMAGENS_POR_ENVIO) lotes.push(imagens.slice(i, i + IMAGENS_POR_ENVIO));
  for (const lote of lotes) {
    const registros = await Promise.all(lote.map(paraEnvio));
    await pedir(conf, 'POST', '/enviar', { registros });
    // Aceito ou recusado (a nuvem já tem uma versão igual ou mais nova): deixa de ser pendente,
    // a não ser que tenha mudado de novo enquanto ia pra nuvem.
    await db.transaction('rw', [...new Set(lote.map((x) => x.tabela))], async () => {
      for (const [i, { tabela }] of lote.entries()) {
        const enviado = registros[i];
        const t = db.table(tabela);
        const atual = await t.get(enviado.id);
        if (atual && quando(tabela, atual) === enviado.atualizadoEm) await t.update(enviado.id, { _remoto: true, _pendente: 0 });
      }
    });
  }
  return lista.length;
}

// ---------- Baixar ----------

async function aplicar(registros) {
  const porTabela = new Map();
  for (const { tabela, id, dados } of registros) {
    if (!porTabela.has(tabela)) porTabela.set(tabela, []);
    porTabela.get(tabela).push({ id, dados });
  }
  let mudou = 0;
  let novaCor = null;
  await db.transaction('rw', [...porTabela.keys()], async () => {
    for (const [tabela, itens] of porTabela) {
      const t = db.table(tabela);
      const locais = await t.bulkGet(itens.map((x) => x.id));
      const gravar = [];
      itens.forEach(({ dados }, i) => {
        const local = locais[i];
        // Vale a edição mais recente; o que já subiu (não pendente) sempre aceita a da nuvem.
        if (local && local._pendente !== 0 && quando(tabela, local) >= quando(tabela, dados)) return;
        let reg = { ...dados, _remoto: true };
        if (tabela === 'imagens') {
          const { dados: b64, ...resto } = dados;
          reg = { ...resto, blob: base64ParaBlob(b64 ?? '', resto.mimeType), _remoto: true };
        }
        if (tabela === 'config' && dados.chave === 'corAcento') novaCor = dados.valor;
        gravar.push(reg);
      });
      // put um a um: o gancho "updating" só tira o _remoto quando o registro já existe
      for (const reg of gravar) await t.put(reg);
      mudou += gravar.length;
    }
  });
  if (novaCor) window.dispatchEvent(new CustomEvent('cor-sincronizada', { detail: novaCor }));
  return mudou;
}

async function baixar(conf) {
  let cursor = conf.cursor ?? 0;
  let mudou = 0;
  for (;;) {
    const r = await pedir({ ...conf, cursor }, 'GET', `/baixar?desde=${cursor}`);
    if (r.registros.length) mudou += await aplicar(r.registros);
    cursor = r.ate;
    await gravarSync({ cursor });
    if (!r.mais) break;
  }
  return mudou;
}

// A nuvem foi substituída por um backup em outro aparelho: apaga o que tem e baixa tudo.
async function recomecar(conf, geracao) {
  await db.transaction('rw', TABELAS_SYNC.map((t) => db.table(t)), async () => {
    for (const t of TABELAS_SYNC) await db.table(t).clear();
  });
  await gravarSync({ geracao, cursor: 0 });
  return baixar({ ...conf, geracao, cursor: 0 });
}

// ---------- Ciclo ----------

let rodando = null;
let deNovo = false;

export function sincronizar() {
  if (rodando) {
    deNovo = true;
    return rodando;
  }
  rodando = (async () => {
    let resultado = { mudou: 0 };
    try {
      do {
        deNovo = false;
        resultado = await ciclo();
      } while (deNovo);
    } finally {
      rodando = null;
    }
    return resultado;
  })();
  return rodando;
}

async function ciclo() {
  const conf = await lerSync();
  if (!conf?.chave) {
    mudar({ situacao: 'desligada', erro: null });
    return { mudou: 0 };
  }
  mudar({ situacao: 'sincronizando', erro: null });
  try {
    let atual = conf;
    if (atual.substituirPendente) {
      const { geracao } = await pedir(atual, 'POST', '/substituir');
      // A nuvem ficou vazia: tudo deste aparelho sobe de novo.
      await db.transaction('rw', TABELAS_SYNC.map((t) => db.table(t)), async () => {
        for (const t of TABELAS_SYNC) await db.table(t).toCollection().modify((r) => { r._pendente = 1; });
      });
      await gravarSync({ geracao, cursor: 0, substituirPendente: false });
      atual = { ...atual, geracao, cursor: 0, substituirPendente: false };
    }
    let mudou = 0;
    let recomecou = false;
    try {
      await enviar(atual);
      mudou = await baixar(atual);
    } catch (e) {
      if (e.status !== 409) throw e;
      mudou = await recomecar(atual, e.extra.geracao);
      recomecou = true;
    }
    const ultimaSync = agora();
    await gravarSync({ ultimaSync });
    mudar({ situacao: 'ok', ultimaSync, erro: null });
    if (mudou || recomecou) window.dispatchEvent(new CustomEvent('dados-sincronizados', { detail: { mudou, recomecou } }));
    return { mudou, recomecou };
  } catch (e) {
    console.error('Sincronização:', e);
    const semRede = e.status === 0 || !navigator.onLine;
    mudar({ situacao: semRede ? 'offline' : 'erro', erro: semRede ? 'Sem conexão' : e.message });
    return { mudou: 0, erro: e };
  }
}

let espera = null;
function agendar() {
  if (estado.situacao === 'desligada') return;
  clearTimeout(espera);
  espera = setTimeout(() => sincronizar(), ESPERA_ALTERACAO);
}

// ---------- Ativar / desligar ----------

// modo 'criar' (primeiro aparelho, chave nova) ou 'entrar' (chave de outro aparelho).
export async function ativar(modo, chave) {
  chave = String(chave ?? '').trim();
  if (chave.length < 32) throw new ErroSync(400, 'Essa chave está incompleta. Copie a chave inteira do outro aparelho.');
  const { geracao } = await pedir({ chave, geracao: 0 }, 'POST', '/ativar', { modo });
  // O que já existia neste aparelho (de antes da sincronização) passa a ser "criado aqui":
  // assim, um nome repetido no mesmo aparelho não vira aviso de duplicado.
  await db.transaction('rw', TABELAS_SYNC.map((t) => db.table(t)), async () => {
    for (const t of TABELAS_SYNC) {
      if (t === 'imagens') continue;
      await db.table(t).toCollection().modify((r) => {
        if (!r.criadoNo) r.criadoNo = dispositivo;
      });
    }
  });
  await gravarConf('sync', { chave, geracao, cursor: 0, ativadaEm: agora(), ultimaSync: null });
  mudar({ situacao: 'sincronizando' });
  ligarGatilhos();
  return sincronizar();
}

// Desliga só neste aparelho: os dados continuam aqui e na nuvem.
export async function desligar() {
  await db.config.delete('sync');
  mudar({ situacao: 'desligada', ultimaSync: null, erro: null });
}

// Restaurar backup com a sincronização ligada (substitui em todo lugar), em dois passos:
// 1) antes de restaurar: marca a substituição e espera a sincronização em andamento terminar
//    (daí em diante nenhuma sincronização baixa nada antes de esvaziar a nuvem);
// 2) depois de restaurar: esvazia a nuvem e sobe tudo. Sem internet, termina na próxima vez.
export async function prepararSubstituicao() {
  const conf = await lerSync();
  if (!conf?.chave) return false;
  await gravarSync({ substituirPendente: true });
  await rodando?.catch(() => {});
  return true;
}

// A restauração falhou (nada mudou no aparelho): desfaz a marcação.
export const cancelarSubstituicao = () => gravarSync({ substituirPendente: false });

export async function substituirNuvem() {
  const r = await sincronizar();
  return !r.erro;
}

// ---------- Início ----------

export async function iniciarSincronizacao() {
  dispositivo = await lerConf('dispositivo');
  if (!dispositivo) {
    dispositivo = novoId();
    await gravarConf('dispositivo', dispositivo);
  }
  const conf = await lerSync();
  if (!conf?.chave) return mudar({ situacao: 'desligada' });
  mudar({ situacao: 'sincronizando', ultimaSync: conf.ultimaSync ?? null });
  ligarGatilhos();
  sincronizar();
}

// Sincroniza quando a internet volta, quando o app volta a ficar visível e a cada minuto.
let gatilhos = false;
function ligarGatilhos() {
  if (gatilhos) return;
  gatilhos = true;
  window.addEventListener('online', () => estado.situacao !== 'desligada' && sincronizar());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && estado.situacao !== 'desligada') sincronizar();
  });
  setInterval(() => {
    if (document.visibilityState === 'visible' && estado.situacao !== 'desligada') sincronizar();
  }, INTERVALO);
}
