// Busca a página de um evento no Cagematch e devolve o HTML pro app (que faz a leitura das lutas).
// O navegador não deixa o app ler o Cagematch direto (CORS), e o Cagematch tem um desafio
// em JavaScript (Sucuri) antes da página; esta função resolve as duas coisas.
//
// Uso: GET /evento?nr=458185  (ou ?url=https://www.cagematch.net/?id=1&nr=458185)
// Só aceita páginas de evento (id=1) do cagematch.net, pra não virar um proxy aberto.

const ORIGENS = ['https://raphaelconsani.github.io'];
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
const CACHE_SEG = 3600; // mesma página pedida de novo em 1 h não vai ao Cagematch

const origemPermitida = (o) => !!o && (ORIGENS.includes(o) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o));

function cabecalhosCors(origem) {
  return origemPermitida(origem)
    ? { 'Access-Control-Allow-Origin': origem, 'Access-Control-Allow-Methods': 'GET', 'Vary': 'Origin' }
    : {};
}

function resposta(corpo, status, origem, extra = {}) {
  const json = typeof corpo !== 'string';
  return new Response(json ? JSON.stringify(corpo) : corpo, {
    status,
    headers: { 'Content-Type': json ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8', ...cabecalhosCors(origem), ...extra },
  });
}

// Número do evento a partir de ?nr= ou de um link do Cagematch colado.
export function numeroDoEvento(params) {
  let nr = params.get('nr');
  const url = params.get('url');
  if (!nr && url) {
    let u;
    try { u = new URL(url.trim()); } catch { return null; }
    if (!/^(www\.)?cagematch\.net$/.test(u.hostname) || u.searchParams.get('id') !== '1') return null;
    nr = u.searchParams.get('nr');
  }
  return nr && /^\d{1,9}$/.test(nr) ? nr : null;
}

// O desafio monta o nome e o valor de um cookie só com textos e String.fromCharCode(n).
// Resolvido sem eval (o Workers não permite eval).
function avaliar(expr) {
  let out = '';
  let resto = expr.trim();
  const re = /^\s*(?:'([^']*)'|"([^"]*)"|String\.fromCharCode\((\d+)\))\s*(?:\+|$)/;
  while (resto) {
    const m = resto.match(re);
    if (!m) throw new Error('Desafio do Cagematch em formato desconhecido');
    out += m[1] ?? m[2] ?? String.fromCharCode(Number(m[3]));
    resto = resto.slice(m[0].length);
  }
  return out;
}

export function resolverDesafio(html) {
  const S = html.match(/S='([^']+)'/)?.[1];
  if (!S) return null;
  const js = atob(S);
  const valor = js.match(/^\w=(.*?);document\.cookie=/)?.[1];
  const nome = js.match(/document\.cookie=(.*?)\+\s*"="\s*\+/)?.[1];
  if (valor == null || nome == null) throw new Error('Desafio do Cagematch em formato desconhecido');
  return `${avaliar(nome)}=${avaliar(valor)}`;
}

const ehPaginaDeEvento = (html) => /class="MatchResults"|InformationBoxTable/.test(html);

async function buscarNoCagematch(nr) {
  const url = `https://www.cagematch.net/?id=1&nr=${nr}`;
  let r = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'manual' });
  let html = await r.text();
  const cookie = resolverDesafio(html);
  if (cookie) {
    r = await fetch(url, { headers: { 'User-Agent': UA, Cookie: cookie }, redirect: 'manual' });
    html = await r.text();
  }
  if (r.status !== 200 || !ehPaginaDeEvento(html)) {
    const erro = new Error(r.status === 200 ? 'O Cagematch não devolveu a página do evento' : `O Cagematch respondeu ${r.status}`);
    erro.status = 502;
    throw erro;
  }
  return html;
}

export default {
  async fetch(request, env, ctx) {
    const origem = request.headers.get('Origin');
    const { pathname, searchParams } = new URL(request.url);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cabecalhosCors(origem) });
    if (request.method !== 'GET' || pathname !== '/evento') return resposta({ erro: 'Não encontrado' }, 404, origem);
    // Só o app (e o endereço local de desenvolvimento) pode usar.
    if (origem && !origemPermitida(origem)) return resposta({ erro: 'Origem não permitida' }, 403, origem);

    const nr = numeroDoEvento(searchParams);
    if (!nr) return resposta({ erro: 'Link de evento do Cagematch inválido' }, 400, origem);

    const chave = new Request(`https://cache.interno/evento/${nr}`);
    const cache = caches.default;
    const guardada = await cache.match(chave);
    if (guardada) return resposta(await guardada.text(), 200, origem, { 'X-Cache': 'HIT' });

    try {
      const html = await buscarNoCagematch(nr);
      ctx.waitUntil(cache.put(chave, new Response(html, { headers: { 'Cache-Control': `max-age=${CACHE_SEG}` } })));
      return resposta(html, 200, origem, { 'X-Cache': 'MISS' });
    } catch (e) {
      return resposta({ erro: e.message }, e.status ?? 502, origem);
    }
  },
};
