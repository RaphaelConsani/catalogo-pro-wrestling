import { db } from './schema.js';
import { agora } from '../util/ids.js';

// Backup completo em JSON, com as imagens embutidas (base64).
// Vai TUDO, inclusive registros com exclusão lógica (excluidoEm) e itens concluídos
// do backlog: a fase 2 ("importar e mesclar") vai precisar deles pra saber o que foi apagado.
// A tabela config fica de fora (é do aparelho: data do último backup, lembrete).

export const APP = 'catalogo-pro-wrestling';
export const FORMATO = 1;
const TABELAS = ['empresas', 'eventos', 'wrestlers', 'equipes', 'tiposMatch', 'estipulacoes', 'titulos', 'plataformas', 'metodosVitoria', 'lutas', 'visualizacoes', 'backlog'];

// ---------- Config (data do último backup, lembrete) ----------

export const lerConfig = async (chave) => (await db.config.get(chave))?.valor ?? null;
export const gravarConfig = (chave, valor) => db.config.put({ chave, valor });

// ---------- Exportar ----------

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

export async function montarBackup() {
  const tabelas = {};
  await db.transaction('r', [...TABELAS, 'imagens'], async () => {
    for (const t of TABELAS) tabelas[t] = await db.table(t).toArray();
    tabelas.imagens = await db.imagens.toArray();
  });
  const imagens = [];
  for (const { blob, ...resto } of tabelas.imagens) {
    imagens.push({ ...resto, mimeType: resto.mimeType || blob.type, dados: await blobParaBase64(blob) });
  }
  tabelas.imagens = imagens;
  return { app: APP, formato: FORMATO, versaoBanco: db.verno, exportadoEm: agora(), tabelas };
}

export const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function baixarArquivo(blob, nome) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export async function exportarBackup() {
  const backup = await montarBackup();
  const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
  baixarArquivo(blob, `${APP}-backup-${hojeISO()}.json`);
  await gravarConfig('ultimoBackup', backup.exportadoEm);
  window.dispatchEvent(new CustomEvent('backup-feito'));
  return backup;
}

// ---------- Importar ----------

export class BackupInvalido extends Error {}

// Lê e confere o arquivo; devolve o backup e um resumo pro diálogo de confirmação.
export async function lerBackup(arquivo) {
  let dados;
  try {
    dados = JSON.parse(await arquivo.text());
  } catch {
    throw new BackupInvalido('O arquivo não é um JSON válido.');
  }
  if (dados?.app !== APP || !dados.tabelas) throw new BackupInvalido('Esse arquivo não é um backup do Catálogo de Pro Wrestling.');
  if (dados.formato > FORMATO) throw new BackupInvalido('Esse backup foi feito por uma versão mais nova do app. Atualize o app antes de importar.');
  for (const t of [...TABELAS, 'imagens']) {
    const lista = dados.tabelas[t] ?? [];
    if (!Array.isArray(lista) || lista.some((r) => !r || typeof r.id !== 'string' || !r.id)) {
      throw new BackupInvalido(`O backup está corrompido (tabela "${t}").`);
    }
    if (t === 'imagens' && lista.some((r) => typeof r.dados !== 'string')) throw new BackupInvalido('O backup está corrompido (imagens).');
    dados.tabelas[t] = lista;
  }
  const ativos = (t) => dados.tabelas[t].filter((r) => !r.excluidoEm).length;
  return {
    backup: dados,
    resumo: {
      exportadoEm: dados.exportadoEm ?? null,
      lutas: ativos('lutas'),
      visualizacoes: ativos('visualizacoes'),
      eventos: ativos('eventos'),
      wrestlers: ativos('wrestlers'),
      empresas: ativos('empresas'),
      backlog: dados.tabelas.backlog.filter((r) => !r.excluidoEm && !r.concluidoEm).length,
      imagens: dados.tabelas.imagens.length,
    },
  };
}

// Substitui todo o conteúdo do banco pelo do backup (numa transação só: ou vai tudo, ou nada).
export async function importarBackup(backup) {
  const imagens = backup.tabelas.imagens.map(({ dados, ...resto }) => ({ ...resto, blob: base64ParaBlob(dados, resto.mimeType) }));
  await db.transaction('rw', [...TABELAS, 'imagens', 'config'], async () => {
    for (const t of [...TABELAS, 'imagens']) await db.table(t).clear();
    for (const t of TABELAS) await db.table(t).bulkAdd(backup.tabelas[t]);
    await db.imagens.bulkAdd(imagens);
    // O que está no app agora é exatamente o conteúdo de um arquivo de backup.
    await db.config.put({ chave: 'ultimoBackup', valor: backup.exportadoEm ?? agora() });
    await db.config.delete('lembreteDispensadoEm');
  });
}

// ---------- Lembrete de 7 dias ----------

export const DIAS_LEMBRETE = 7;
const DIA_MS = 86400000;

// Devolve null (sem lembrete) ou { dias, nunca } pra montar a faixa.
export async function situacaoLembrete() {
  const [ultimo, dispensado] = await Promise.all([lerConfig('ultimoBackup'), lerConfig('lembreteDispensadoEm')]);
  if (dispensado === hojeISO()) return null;
  let base = ultimo;
  if (!base) {
    // Nunca exportou: conta a partir da 1ª luta registrada (app vazio não lembra).
    let primeira = null;
    await db.lutas.each((l) => {
      if (!l.excluidoEm && (!primeira || l.criadoEm < primeira)) primeira = l.criadoEm;
    });
    if (!primeira) return null;
    base = primeira;
  }
  const dias = Math.floor((Date.now() - new Date(base).getTime()) / DIA_MS);
  if (dias < DIAS_LEMBRETE) return null;
  return { dias, nunca: !ultimo };
}

export const dispensarLembrete = () => gravarConfig('lembreteDispensadoEm', hojeISO());
