// Sincronização entre aparelhos do Catálogo de Pro Wrestling (Cloudflare Workers + D1).
//
// Cada aparelho prova que é do dono com a chave secreta (Authorization: Bearer <chave>);
// o banco só guarda o hash dela. Regras (docs/DECISOES.md › Fase 2):
// - vale a edição mais recente (atualizadoEm maior); exclusão lógica conta como edição;
// - restaurar um backup "substitui em todo lugar": a geração muda e os outros aparelhos
//   recebem 409, apagam o que têm e baixam tudo de novo.
//
// Rotas (todas exigem a chave):
//   POST /ativar      { modo: 'criar' | 'entrar' }        -> { geracao }
//   GET  /baixar?desde=N                                   -> { geracao, ate, mais, registros }
//   POST /enviar      { registros: [{ tabela, id, atualizadoEm, dados }] } -> { aceitos, recusados }
//   POST /substituir                                       -> { geracao }  (apaga tudo da nuvem)
// Cabeçalhos: X-Geracao (geração que o aparelho conhece) e X-Dispositivo (id do aparelho).

const ORIGENS = ['https://raphaelconsani.github.io'];
const TABELAS = new Set([
  'empresas', 'eventos', 'wrestlers', 'equipes', 'tiposMatch', 'estipulacoes', 'titulos',
  'plataformas', 'metodosVitoria', 'lutas', 'visualizacoes', 'backlog', 'imagens', 'config',
]);
const MAX_ENVIO = 100; // registros por envio
const MAX_BAIXAR_BYTES = 2_000_000; // corta a página de download perto disso (imagens pesam)

const origemPermitida = (o) => !!o && (ORIGENS.includes(o) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o));

function cors(origem) {
  return origemPermitida(origem)
    ? {
        'Access-Control-Allow-Origin': origem,
        'Access-Control-Allow-Methods': 'GET, POST',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Geracao, X-Dispositivo',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin',
      }
    : {};
}

const json = (corpo, status, origem) =>
  new Response(typeof corpo === 'string' ? corpo : JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors(origem) },
  });

async function hash(texto) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Comparação em tempo constante (não revela quantos caracteres bateram).
function iguais(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

const chaveDoPedido = (request) => {
  const m = /^Bearer\s+(\S+)$/.exec(request.headers.get('Authorization') ?? '');
  return m && m[1].length >= 32 && m[1].length <= 200 ? m[1] : null;
};

class Erro extends Error {
  constructor(status, mensagem, extra = {}) {
    super(mensagem);
    Object.assign(this, { status, extra });
  }
}

async function autenticar(env, request) {
  const chave = chaveDoPedido(request);
  if (!chave) throw Error401();
  const conta = await env.DB.prepare('SELECT chave_hash, geracao FROM conta WHERE id = 1').first();
  if (!conta) throw new Erro(404, 'A sincronização ainda não foi ativada em nenhum aparelho.');
  if (!iguais(await hash(chave), conta.chave_hash)) throw new Erro(403, 'Chave incorreta.');
  return conta;
}
function Error401() {
  return new Erro(401, 'Falta a chave da sincronização.');
}

// Aparelho com geração antiga: precisa apagar o que tem e baixar tudo de novo.
function conferirGeracao(conta, request) {
  const g = Number(request.headers.get('X-Geracao'));
  if (g !== conta.geracao) throw new Erro(409, 'Os dados da nuvem foram substituídos por um backup.', { geracao: conta.geracao });
}

const dispositivo = (request) => (request.headers.get('X-Dispositivo') ?? '').slice(0, 64) || null;

async function ativar(env, request) {
  const chave = chaveDoPedido(request);
  if (!chave) throw Error401();
  const { modo } = await request.json().catch(() => ({}));
  const conta = await env.DB.prepare('SELECT chave_hash, geracao FROM conta WHERE id = 1').first();
  const h = await hash(chave);
  if (modo === 'criar') {
    if (conta) throw new Erro(409, 'Já existe uma chave. Use “Já tenho uma chave” e cole a chave do outro aparelho.');
    await env.DB.prepare('INSERT INTO conta (id, chave_hash, geracao, criada_em) VALUES (1, ?1, 1, ?2)').bind(h, new Date().toISOString()).run();
    return { geracao: 1 };
  }
  if (modo === 'entrar') {
    if (!conta) throw new Erro(404, 'Ainda não existe chave. Ative primeiro no outro aparelho (“Criar chave”).');
    if (!iguais(h, conta.chave_hash)) throw new Erro(403, 'Chave incorreta.');
    return { geracao: conta.geracao };
  }
  throw new Erro(400, 'Modo inválido.');
}

async function baixar(env, request, url) {
  const conta = await autenticar(env, request);
  conferirGeracao(conta, request);
  const desde = Math.max(0, Number(url.searchParams.get('desde')) || 0);
  const eu = dispositivo(request);
  const { results } = await env.DB.prepare(
    'SELECT tabela, id, dados, versao, dispositivo FROM registros WHERE versao > ?1 ORDER BY versao LIMIT 300',
  ).bind(desde).all();
  // Monta o JSON na mão: "dados" já é JSON e entra sem ser lido de novo (economiza CPU).
  const partes = [];
  let bytes = 0;
  let ate = desde;
  for (const r of results) {
    if (bytes > MAX_BAIXAR_BYTES) break;
    ate = r.versao;
    if (eu && r.dispositivo === eu) continue; // o que este aparelho mandou ele já tem
    partes.push(`{"tabela":${JSON.stringify(r.tabela)},"id":${JSON.stringify(r.id)},"dados":${r.dados}}`);
    bytes += r.dados.length;
  }
  const mais = results.length > 0 && (results.length === 300 || ate < results.at(-1).versao);
  return `{"geracao":${conta.geracao},"ate":${ate},"mais":${mais},"registros":[${partes.join(',')}]}`;
}

async function enviar(env, request) {
  const conta = await autenticar(env, request);
  conferirGeracao(conta, request);
  const { registros } = await request.json().catch(() => ({}));
  if (!Array.isArray(registros) || registros.length > MAX_ENVIO) throw new Erro(400, `Envie de 1 a ${MAX_ENVIO} registros por vez.`);
  for (const r of registros) {
    if (!TABELAS.has(r?.tabela) || typeof r.id !== 'string' || !r.id || r.id.length > 100 || typeof r.atualizadoEm !== 'string' || typeof r.dados !== 'object' || r.dados === null) {
      throw new Erro(400, 'Registro inválido.');
    }
  }
  const eu = dispositivo(request);
  // Grava só se for mais novo que o da nuvem (vale a edição mais recente).
  const sql = env.DB.prepare(`INSERT INTO registros (tabela, id, dados, atualizado_em, versao, dispositivo)
    VALUES (?1, ?2, ?3, ?4, (SELECT COALESCE(MAX(versao), 0) + 1 FROM registros), ?5)
    ON CONFLICT (tabela, id) DO UPDATE SET dados = excluded.dados, atualizado_em = excluded.atualizado_em,
      versao = excluded.versao, dispositivo = excluded.dispositivo
    WHERE excluded.atualizado_em > registros.atualizado_em`);
  const resultados = registros.length
    ? await env.DB.batch(registros.map((r) => sql.bind(r.tabela, r.id, JSON.stringify(r.dados), r.atualizadoEm, eu)))
    : [];
  const aceitos = [];
  const recusados = [];
  registros.forEach((r, i) => (resultados[i].meta.changes ? aceitos : recusados).push(`${r.tabela}/${r.id}`));
  return { aceitos, recusados };
}

async function substituir(env, request) {
  const conta = await autenticar(env, request);
  const geracao = conta.geracao + 1;
  await env.DB.batch([
    env.DB.prepare('DELETE FROM registros'),
    env.DB.prepare('UPDATE conta SET geracao = ?1 WHERE id = 1').bind(geracao),
  ]);
  return { geracao };
}

export default {
  async fetch(request, env) {
    const origem = request.headers.get('Origin');
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origem) });
    if (origem && !origemPermitida(origem)) return json({ erro: 'Origem não permitida' }, 403, origem);
    try {
      const rota = `${request.method} ${url.pathname}`;
      if (rota === 'POST /ativar') return json(await ativar(env, request), 200, origem);
      if (rota === 'GET /baixar') return json(await baixar(env, request, url), 200, origem);
      if (rota === 'POST /enviar') return json(await enviar(env, request), 200, origem);
      if (rota === 'POST /substituir') return json(await substituir(env, request), 200, origem);
      return json({ erro: 'Não encontrado' }, 404, origem);
    } catch (e) {
      if (e instanceof Erro) return json({ erro: e.message, ...e.extra }, e.status, origem);
      console.error(e);
      return json({ erro: 'Erro no servidor da sincronização.' }, 500, origem);
    }
  },
};
