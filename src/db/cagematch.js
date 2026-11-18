import { db } from './schema.js';
import { ativos } from './repo.js';
import { novoId, agora } from '../util/ids.js';
import { normalizar } from '../util/texto.js';

// Importação de um evento do Cagematch pro Backlog (decisões em docs/DECISOES.md).
// prepararImportacao(lido) monta o "plano" (o que existe, o que será criado, o que falta escolher);
// a tela de revisão edita o plano; salvarImportacao(plano) grava tudo numa transação.

// Comparação de títulos: "AEW International Title" = "AEW International Championship"
const chaveTitulo = (s) => normalizar(s).replace(/\b(the|title|championship|belt)\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
// Comparação de estipulações: "Ladder Match" = "Ladder"
const chaveEstipulacao = (s) => normalizar(s).replace(/\bmatch\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
const chaveNome = (s) => normalizar(s).replace(/[^a-z0-9]+/g, ' ').trim();

// Chave de um wrestler lido: número do Cagematch ou, sem página lá, o nome.
const chaveWrestler = (w) => (w.cagematchId ? `cm:${w.cagematchId}` : `nome:${chaveNome(w.nome)}`);

async function carregarCadastros() {
  const [empresas, eventos, wrestlers, equipes, tipos, estipulacoes, titulos, metodos, backlog, lutas] = await Promise.all([
    ...['empresas', 'eventos', 'wrestlers', 'equipes', 'tiposMatch', 'estipulacoes', 'titulos', 'metodosVitoria'].map(ativos),
    db.backlog.filter((r) => !r.excluidoEm && !r.concluidoEm).toArray(),
    ativos('lutas'),
  ]);
  return { empresas, eventos, wrestlers, equipes, tipos, estipulacoes, titulos, metodos, backlog, lutas };
}

function acharEmpresa(cad, nome) {
  const n = chaveNome(nome);
  return cad.empresas.find((e) => chaveNome(e.nome) === n || chaveNome(e.sigla) === n) ?? null;
}

// Sigla sugerida pra empresa nova: prefixo em maiúsculas do nome do evento ("AEW Full Gear" -> AEW)
// ou as iniciais do nome da empresa.
function siglaSugerida(nomeEvento, nomeEmpresa) {
  const prefixo = /^([A-Z0-9]{2,8})\s/.exec(nomeEvento ?? '')?.[1];
  if (prefixo) return prefixo;
  return (nomeEmpresa ?? '').split(/\s+/).filter((p) => /^[A-Za-z]/.test(p)).map((p) => p[0].toUpperCase()).join('').slice(0, 8);
}

// Tipo pela quantidade de lados e de wrestlers por lado (ou pelo texto, em Battle Royal etc.).
function deduzirTipo(cad, luta) {
  const porNome = (nome) => cad.tipos.find((t) => normalizar(t.nome) === normalizar(nome)) ?? null;
  if (luta.tipoPorTexto) return porNome(luta.tipoPorTexto);
  const tamanhos = luta.lados.map((l) => l.wrestlers.length);
  const n = tamanhos.length;
  const iguais = tamanhos.every((t) => t === tamanhos[0]);
  if (iguais) {
    const exato = cad.tipos.find((t) => !t.variavel && t.numLados === n && t.wrestlersPorLado === tamanhos[0]);
    if (exato) return exato;
  }
  if (n === 2 && !iguais) return porNome('Handicap');
  if (n === 2 && iguais && tamanhos[0] >= 4) return porNome('Multi-Man');
  if (n >= 5 && iguais && tamanhos[0] === 1) return porNome('Battle Royal');
  return null;
}

// Tipo escolhido aceita esses lados? (mesma regra do formulário da luta)
export function tipoCombina(tipo, lados) {
  if (!tipo) return false;
  if (tipo.variavel) return lados.length >= 2 && lados.every((l) => l.wrestlers.length >= 1);
  return lados.length === tipo.numLados && lados.every((l) => l.wrestlers.length === tipo.wrestlersPorLado);
}

const assinatura = (lados) => lados.map((l) => [...l].sort().join(',')).sort().join('|');

// lido: resultado de lerEvento() (src/util/cagematch.js)
export async function prepararImportacao(lido) {
  const cad = await carregarCadastros();

  // ---- Empresa e evento ----
  const [principal, ...outras] = lido.empresas;
  const empresa = principal ? acharEmpresa(cad, principal.nome) : null;
  const parceirasIds = outras.map((e) => acharEmpresa(cad, e.nome)?.id).filter(Boolean);
  const eventoExistente =
    cad.eventos.find((e) => lido.cagematchId && e.cagematchId === lido.cagematchId) ??
    cad.eventos.find((e) => chaveNome(e.nome) === chaveNome(lido.nome) && (e.data ?? null) === (lido.data ?? null)) ??
    null;

  // ---- Wrestlers e equipes citados ----
  const porCagematch = new Map(cad.wrestlers.filter((w) => w.cagematchId).map((w) => [w.cagematchId, w]));
  const wrestlers = new Map(); // chave -> { chave, nome, cagematchId, existenteId, porNome }
  const equipes = new Map(); // nome normalizado -> { nome, cagematchId, existenteId, criar }
  for (const luta of lido.lutas) {
    if (luta.erro) continue;
    for (const lado of luta.lados) {
      for (const w of lado.wrestlers) {
        const chave = chaveWrestler(w);
        if (wrestlers.has(chave)) continue;
        let existente = w.cagematchId ? porCagematch.get(w.cagematchId) : null;
        let porNome = false;
        if (!existente) {
          const mesmos = cad.wrestlers.filter((x) => chaveNome(x.nome) === chaveNome(w.nome) && (!w.cagematchId || !x.cagematchId));
          existente = mesmos[0] ?? null;
          porNome = Boolean(existente);
        }
        wrestlers.set(chave, { chave, nome: w.nome, cagematchId: w.cagematchId, existenteId: existente?.id ?? null, porNome });
      }
      if (lado.equipe) {
        const k = chaveNome(lado.equipe.nome);
        if (!equipes.has(k)) {
          const existente = cad.equipes.find((e) => chaveNome(e.nome) === k) ?? null;
          equipes.set(k, { nome: lado.equipe.nome, cagematchId: lado.equipe.cagematchId, existenteId: existente?.id ?? null, criar: true });
        }
      }
    }
  }

  // ---- Títulos e estipulações que não foram reconhecidos (uma escolha por texto) ----
  const pendTitulos = new Map(); // chave -> { texto, escolha: null | 'criar' | 'nenhum' | id }
  const pendEstipulacoes = new Map();
  const acharTitulo = (nome) => cad.titulos.find((t) => chaveTitulo(t.nome) === chaveTitulo(nome)) ?? null;
  const acharEstipulacao = (texto) => cad.estipulacoes.find((e) => chaveEstipulacao(e.nome) === chaveEstipulacao(texto)) ?? null;
  const metodoPorNome = (nome) => cad.metodos.find((m) => normalizar(m.nome) === normalizar(nome))?.id ?? null;

  const lutas = lido.lutas.map((l) => {
    if (l.erro) return { ...l, incluir: false };
    const tipo = deduzirTipo(cad, l);
    const titulo = l.titulos[0] ?? null;
    const tituloExistente = titulo ? acharTitulo(titulo.nome) : null;
    if (titulo && !tituloExistente) pendTitulos.set(chaveTitulo(titulo.nome), pendTitulos.get(chaveTitulo(titulo.nome)) ?? { texto: titulo.nome, escolha: null });
    const estipulacao = l.estipulacaoTexto ? acharEstipulacao(l.estipulacaoTexto) : null;
    if (l.estipulacaoTexto && !estipulacao) {
      const k = chaveEstipulacao(l.estipulacaoTexto);
      pendEstipulacoes.set(k, pendEstipulacoes.get(k) ?? { texto: l.estipulacaoTexto, escolha: null });
    }
    return {
      ...l,
      incluir: !l.darkMatch,
      tipoId: tipo?.id ?? null,
      tipoDeduzido: Boolean(tipo),
      tituloId: tituloExistente?.id ?? null,
      tituloChave: titulo && !tituloExistente ? chaveTitulo(titulo.nome) : null,
      estipulacaoId: estipulacao?.id ?? null,
      estipulacaoChave: l.estipulacaoTexto && !estipulacao ? chaveEstipulacao(l.estipulacaoTexto) : null,
      metodoVitoriaId: l.metodo ? metodoPorNome(l.metodo) : null,
      ladosChaves: l.lados.map((lado) => lado.wrestlers.map(chaveWrestler)),
      equipesChaves: l.lados.map((lado) => (lado.equipe ? chaveNome(lado.equipe.nome) : null)),
      repetida: null,
    };
  });

  const plano = {
    lido,
    cad,
    evento: {
      existenteId: eventoExistente?.id ?? null,
      nome: lido.nome,
      data: lido.data,
      empresaId: eventoExistente?.empresaId ?? empresa?.id ?? null,
      parceirasIds,
      // Empresa não cadastrada: criada com o nome do Cagematch (sigla e cor editáveis na revisão).
      novaEmpresa: !eventoExistente && !empresa && principal ? { nome: principal.nome, sigla: siglaSugerida(lido.nome, principal.nome), cor: '#94a3b8' } : null,
    },
    wrestlers,
    equipes,
    pendTitulos,
    pendEstipulacoes,
    lutas,
  };
  marcarRepetidas(plano);
  return plano;
}

// ID final de um wrestler do plano (existente, ou null se ainda vai ser criado).
const idFinal = (plano, chave) => plano.wrestlers.get(chave)?.existenteId ?? null;

// Luta repetida = mesmo evento, tipo e lados que um item pendente do Backlog ou uma luta já registrada.
// Só dá pra comparar quando o evento já existe e todos os wrestlers já existem.
export function marcarRepetidas(plano) {
  const eventoId = plano.evento.existenteId;
  for (const l of plano.lutas) {
    const anterior = l.repetida;
    l.repetida = null;
    if (l.erro || !eventoId || !l.tipoId) continue;
    const lados = l.ladosChaves.map((ch) => ch.map((c) => idFinal(plano, c)));
    if (lados.some((ids) => ids.some((id) => !id))) continue;
    const ass = assinatura(lados);
    const igual = (x) => x.eventoId === eventoId && x.tipoMatchId === l.tipoId && assinatura(x.lados.map((y) => y.wrestlersIds)) === ass;
    if (plano.cad.lutas.some(igual)) l.repetida = 'assistida';
    else if (plano.cad.backlog.some((b) => b.tipo === 'luta' && igual(b))) l.repetida = 'backlog';
    // Repetida vem desmarcada; se deixou de ser repetida, volta a valer a regra padrão.
    if (l.repetida && !anterior) l.incluir = false;
    if (!l.repetida && anterior) l.incluir = !l.darkMatch;
  }
}

// O que ainda impede salvar (mensagens pra tela de revisão).
export function pendencias(plano) {
  const p = [];
  const ev = plano.evento;
  if (!ev.existenteId) {
    if (!ev.nome?.trim()) p.push('Dê um nome ao evento.');
    if (!ev.data) p.push('O evento está sem data no Cagematch; preencha a data.');
    if (!ev.empresaId && !ev.novaEmpresa) p.push('Escolha a empresa do evento.');
    if (ev.novaEmpresa && !ev.novaEmpresa.sigla?.trim()) p.push('Preencha a sigla da empresa nova.');
  }
  const usadas = plano.lutas.filter((l) => l.incluir);
  if (!usadas.length) p.push('Marque pelo menos uma luta.');
  const tipos = new Map(plano.cad.tipos.map((t) => [t.id, t]));
  for (const l of usadas) {
    if (!l.tipoId) p.push(`Escolha o tipo da luta ${l.ordem}.`);
    else if (!tipoCombina(tipos.get(l.tipoId), l.lados)) p.push(`O tipo escolhido na luta ${l.ordem} não combina com os lados dela.`);
    const todos = l.ladosChaves.flat();
    const final = todos.map((c) => idFinal(plano, c) ?? c);
    if (new Set(final).size !== final.length) p.push(`Na luta ${l.ordem}, o mesmo wrestler aparece mais de uma vez.`);
  }
  const chavesUsadas = (campo) => new Set(usadas.map((l) => l[campo]).filter(Boolean));
  for (const [k, t] of plano.pendTitulos) if (chavesUsadas('tituloChave').has(k) && !t.escolha) p.push(`Escolha o que fazer com o título “${t.texto}”.`);
  for (const [k, e] of plano.pendEstipulacoes) if (chavesUsadas('estipulacaoChave').has(k) && !e.escolha) p.push(`Escolha o que fazer com a estipulação “${e.texto}”.`);
  return p;
}

// Grava empresa, evento, wrestlers, equipes, títulos, estipulações e os itens do Backlog.
export async function salvarImportacao(plano) {
  const ts = agora();
  const novo = (dados) => ({ ...dados, id: novoId(), criadoEm: ts, atualizadoEm: ts });
  const usadas = plano.lutas.filter((l) => l.incluir);
  const tabelas = ['empresas', 'eventos', 'wrestlers', 'equipes', 'titulos', 'estipulacoes', 'backlog'].map((t) => db.table(t));

  return db.transaction('rw', tabelas, async () => {
    const ev = plano.evento;
    // ---- Empresa e evento ----
    let empresaId = ev.empresaId;
    if (!ev.existenteId && !empresaId && ev.novaEmpresa) {
      const e = novo({ nome: ev.novaEmpresa.nome.trim(), sigla: ev.novaEmpresa.sigla.trim(), cor: ev.novaEmpresa.cor });
      await db.empresas.add(e);
      empresaId = e.id;
    }
    let eventoId = ev.existenteId;
    if (eventoId) {
      // Guarda o número do Cagematch no evento que já existia (reconhece na próxima vez).
      const atual = await db.eventos.get(eventoId);
      if (atual && !atual.cagematchId && plano.lido.cagematchId) await db.eventos.update(eventoId, { cagematchId: plano.lido.cagematchId, atualizadoEm: ts });
    } else {
      const e = novo({ nome: ev.nome.trim(), data: ev.data, empresaId, parceirasIds: ev.parceirasIds.filter((id) => id !== empresaId), imagemId: null, cagematchId: plano.lido.cagematchId ?? null });
      await db.eventos.add(e);
      eventoId = e.id;
    }

    // ---- Wrestlers: só os das lutas marcadas ----
    const chavesUsadas = new Set(usadas.flatMap((l) => l.ladosChaves.flat()));
    const ids = new Map();
    let criadosW = 0;
    for (const chave of chavesUsadas) {
      const w = plano.wrestlers.get(chave);
      if (w.existenteId) {
        ids.set(chave, w.existenteId);
        if (w.cagematchId) {
          const atual = await db.wrestlers.get(w.existenteId);
          if (atual && !atual.cagematchId) await db.wrestlers.update(w.existenteId, { cagematchId: w.cagematchId, atualizadoEm: ts });
        }
      } else {
        const r = novo({ nome: w.nome, empresaId, imagemId: null, cagematchId: w.cagematchId ?? null });
        await db.wrestlers.add(r);
        ids.set(chave, r.id);
        criadosW++;
      }
    }

    // ---- Equipes: liga à existente ou cria com os membros da luta ----
    const equipesIds = new Map();
    let criadasE = 0;
    const equipeDe = async (k, membrosIds) => {
      if (!k) return null;
      if (equipesIds.has(k)) return equipesIds.get(k);
      const e = plano.equipes.get(k);
      let id = e.existenteId;
      if (!id && e.criar) {
        const r = novo({ nome: e.nome, membrosIds, imagemId: null, cagematchId: e.cagematchId ?? null });
        await db.equipes.add(r);
        id = r.id;
        criadasE++;
      }
      equipesIds.set(k, id ?? null);
      return id ?? null;
    };

    // ---- Títulos e estipulações escolhidos na revisão ----
    const resolvidos = new Map();
    const resolver = async (tabela, pend, chave, dados) => {
      if (!chave) return null;
      const k = `${tabela}:${chave}`;
      if (resolvidos.has(k)) return resolvidos.get(k);
      const { escolha, texto } = pend.get(chave);
      let id = null;
      if (escolha === 'criar') {
        const r = novo({ nome: texto, ...dados });
        await db.table(tabela).add(r);
        id = r.id;
      } else if (escolha && escolha !== 'nenhum') id = escolha;
      resolvidos.set(k, id);
      return id;
    };

    // ---- Itens do Backlog ----
    for (const l of usadas) {
      const lados = [];
      for (const [i, chaves] of l.ladosChaves.entries()) {
        const wrestlersIds = chaves.map((c) => ids.get(c));
        lados.push({ equipeId: await equipeDe(l.equipesChaves[i], wrestlersIds), wrestlersIds });
      }
      const tituloId = l.tituloId ?? (await resolver('titulos', plano.pendTitulos, l.tituloChave, { empresaId }));
      const estipulacaoId = l.estipulacaoId ?? (await resolver('estipulacoes', plano.pendEstipulacoes, l.estipulacaoChave, {}));
      await db.backlog.add(novo({
        tipo: 'luta',
        eventoId,
        tipoMatchId: l.tipoId,
        estipulacoesIds: estipulacaoId ? [estipulacaoId] : [],
        lados,
        // Escondido no Backlog (sem spoiler): só preenche o formulário no "Assisti".
        cagematch: {
          eventoNr: plano.lido.cagematchId ?? null,
          ordem: l.ordem,
          resultado: l.resultado ?? null,
          vencedorIds: l.ladoVencedor != null ? lados[l.ladoVencedor].wrestlersIds : [],
          metodoVitoriaId: l.metodoVitoriaId ?? null,
          tituloId,
          duracaoSeg: l.duracaoSeg ?? null,
        },
      }));
    }
    return { eventoId, lutas: usadas.length, wrestlersCriados: criadosW, equipesCriadas: criadasE };
  });
}
