import { db } from './schema.js';
import { novoId, agora } from '../util/ids.js';
import { normalizar } from '../util/texto.js';

// Registros ativos (não excluídos) de uma tabela.
export const ativos = (tabela) => db.table(tabela).filter((r) => !r.excluidoEm).toArray();

export const contarAtivos = (tabela) => db.table(tabela).filter((r) => !r.excluidoEm).count();

export async function salvar(tabela, dados) {
  const ts = agora();
  if (dados.id) {
    const atual = await db.table(tabela).get(dados.id);
    const registro = { ...atual, ...dados, atualizadoEm: ts };
    await db.table(tabela).put(registro);
    return registro;
  }
  const registro = { ...dados, id: novoId(), criadoEm: ts, atualizadoEm: ts };
  await db.table(tabela).add(registro);
  return registro;
}

// Exclusão lógica: o registro continua no banco, marcado com excluidoEm.
export async function excluir(tabela, id) {
  const ts = agora();
  await db.table(tabela).update(id, { excluidoEm: ts, atualizadoEm: ts });
}

// Procura um registro ativo "igual" ao informado (nome normalizado; em eventos, nome + data).
export async function buscarDuplicado(tabela, dados) {
  const nome = normalizar(dados.nome);
  const lista = await ativos(tabela);
  return (
    lista.find(
      (r) =>
        r.id !== dados.id &&
        normalizar(r.nome) === nome &&
        (tabela !== 'eventos' || (r.data ?? '') === (dados.data ?? '')),
    ) ?? null
  );
}

// ---- Imagens ----

const urls = new Map();

export async function salvarImagem({ blob, largura, altura }) {
  const id = novoId();
  await db.imagens.add({ id, blob, mimeType: blob.type, largura, altura, criadoEm: agora() });
  return id;
}

// Imagem substituída ou removida do cadastro: apaga de verdade (não há o que mesclar).
export async function apagarImagem(id) {
  if (!id) return;
  await db.imagens.delete(id);
  if (urls.has(id)) {
    URL.revokeObjectURL(urls.get(id));
    urls.delete(id);
  }
}

export async function urlsImagens(ids) {
  const faltando = [...new Set(ids.filter((id) => id && !urls.has(id)))];
  if (faltando.length) {
    const regs = await db.imagens.bulkGet(faltando);
    for (const r of regs) if (r) urls.set(r.id, URL.createObjectURL(r.blob));
  }
  return (id) => urls.get(id) ?? null;
}
