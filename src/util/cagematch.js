// Leitura da página de um evento do Cagematch (o HTML chega pela função em worker/).
// Só lê: não consulta nem grava nada no banco. Quem liga aos cadastros é src/db/cagematch.js.

export const URL_FUNCAO = 'https://catalogo-cagematch.raphaelconsani.workers.dev/evento';

// Aceita o link de uma página de evento (id=1), com ou sem www, inclusive a aba "Card".
export function numeroDoLink(texto) {
  let u;
  try {
    u = new URL(String(texto ?? '').trim());
  } catch {
    return null;
  }
  if (!/^(www\.)?cagematch\.net$/i.test(u.hostname) || u.searchParams.get('id') !== '1') return null;
  const nr = u.searchParams.get('nr');
  return nr && /^\d{1,9}$/.test(nr) ? nr : null;
}

export async function buscarEvento(nr) {
  let r;
  try {
    r = await fetch(`${URL_FUNCAO}?nr=${encodeURIComponent(nr)}`);
  } catch {
    throw new Error('Sem conexão com a internet (ou o serviço de busca está fora do ar).');
  }
  if (!r.ok) {
    const corpo = await r.json().catch(() => ({}));
    throw new Error(corpo.erro || `O serviço de busca respondeu ${r.status}.`);
  }
  return lerEvento(await r.text(), nr);
}

// ---------- Leitura ----------

const limpar = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

// "?id=2&nr=4324&name=..." -> { id: '2', nr: '4324' }
function idDoLink(a) {
  const q = new URLSearchParams((a.getAttribute('href') ?? '').replace(/^[^?]*\?/, ''));
  return { id: q.get('id'), nr: q.get('nr') };
}

// "14.11.2026" -> "2026-11-14"
const dataIso = (s) => {
  const m = /(\d{2})\.(\d{2})\.(\d{4})/.exec(s ?? '');
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};

function lerInformacoes(doc) {
  const info = {};
  for (const linha of doc.querySelectorAll('.InformationBoxRow')) {
    const rotulo = limpar(linha.querySelector('.InformationBoxTitle')?.textContent).replace(/:$/, '');
    const conteudo = linha.querySelector('.InformationBoxContents');
    if (rotulo && conteudo) info[rotulo] = conteudo;
  }
  return info;
}

// Resultado escrito depois do confronto: "A vs. B - Double Count Out (6:45)"
const RESULTADOS = [
  [/^time limit draw$/i, 'time_limit_draw'],
  [/^(draw|double count ?out|double dq|double disqualification|double pin(fall)?|double knockout|double ko)$/i, 'draw'],
  [/^no contest$/i, 'no_contest'],
];
// "A defeats B by DQ" -> método de vitória (nome igual ao cadastro inicial)
const METODOS = [
  [/^(dq|disqualification)$/i, 'Disqualification'],
  [/^count ?out$/i, 'Count Out'],
  [/^submission$/i, 'Submission'],
  [/^(ko|tko|knockout)$/i, 'Knockout'],
  [/^referee stoppage$/i, 'Referee Stoppage'],
  [/^pin(fall)?$/i, 'Pinfall'],
];

// Transforma o HTML do resultado num texto com marcadores ⟦n⟧ no lugar dos links.
function marcar(el) {
  const links = [];
  let texto = '';
  for (const no of el.childNodes) {
    if (no.nodeType === 3) texto += no.textContent;
    else if (no.nodeName === 'A') {
      const { id, nr } = idDoLink(no);
      links.push({ id, nr, nome: limpar(no.textContent) });
      texto += `⟦${links.length - 1}⟧`;
    } else texto += no.textContent;
  }
  return { texto: texto.replace(/\s+/g, ' ').trim(), links };
}

// Um lado: "A, Team (B & C) & D" -> wrestlers e equipes citadas
function lerLado(texto, links) {
  let s = texto;
  const campeao = /\(c\)/i.test(s);
  s = s.replace(/\(c\)/gi, ' ');
  const equipes = [];
  // Equipe com membros: ⟦n⟧ (membros)
  s = s.replace(/⟦(\d+)⟧\s*\(([^()]*)\)/g, (_, i, membros) => {
    equipes.push({ ...links[i], membrosTexto: membros });
    return ` ${membros} `;
  });
  const wrestlers = [];
  const avisos = [];
  for (let parte of s.split(/,|&|\band\b/i)) {
    parte = limpar(parte);
    if (!parte) continue;
    const m = /^⟦(\d+)⟧$/.exec(parte);
    if (m) {
      const l = links[m[1]];
      if (l.id === '2') wrestlers.push({ nome: l.nome, cagematchId: l.nr });
      // Equipe sem membros listados: não dá pra saber quem lutou.
      else avisos.push(`“${l.nome}” aparece sem os membros; confira os wrestlers deste lado.`);
    } else if (!/⟦/.test(parte)) {
      wrestlers.push({ nome: parte, cagematchId: null }); // wrestler sem página no Cagematch
    }
  }
  // Lado = exatamente uma equipe com todos os membros dela.
  const equipe = equipes.length === 1 && limpar(s.replace(/[,&]|\band\b/gi, ' ')) === limpar(equipes[0].membrosTexto.replace(/[,&]|\band\b/gi, ' '))
    ? { nome: equipes[0].nome, cagematchId: equipes[0].nr ? `${equipes[0].id}-${equipes[0].nr}` : null }
    : null;
  return { wrestlers, equipe, campeao, avisos };
}

function lerResultado(el) {
  const { texto: original, links } = marcar(el);
  let s = original;
  const trocaTitulo = /TITLE CHANGE/i.test(s);
  s = s.replace(/-?\s*TITLE CHANGE\s*!*/gi, ' ');
  s = s.replace(/\(w\/[^)]*\)/gi, ' '); // managers e acompanhantes
  s = s.replace(/\[\d+\]/g, ' '); // placar de série ("[3]")
  s = limpar(s);

  let duracaoSeg = null;
  s = s.replace(/\((\d{1,3}):(\d{2})(?::(\d{2}))?\)\s*$/, (_, a, b, c) => {
    duracaoSeg = c != null ? Number(a) * 3600 + Number(b) * 60 + Number(c) : Number(a) * 60 + Number(b);
    return '';
  });
  s = limpar(s);

  let resultado = null;
  let semResultado = false;
  const fim = /\s-\s*([^-⟦]+)$/.exec(s);
  if (fim) {
    const r = RESULTADOS.find(([re]) => re.test(limpar(fim[1])));
    if (r) {
      resultado = r[1];
      s = limpar(s.slice(0, fim.index));
    }
  }

  let metodo = null;
  s = s.replace(/\sby\s+([A-Za-z' ]+?)\s*$/i, (todo, m) => {
    const achado = METODOS.find(([re]) => re.test(limpar(m)));
    if (!achado) return todo;
    metodo = achado[1];
    return '';
  });

  let textosLados;
  let vencedor = null;
  const vitoria = /\s(defeats?)\s/i.exec(s);
  if (vitoria) {
    textosLados = [s.slice(0, vitoria.index), ...s.slice(vitoria.index + vitoria[0].length).split(/\s+and\s+/i)];
    vencedor = 0;
    resultado = 'vitoria';
  } else if (/\svs\.?\s/i.test(s)) {
    textosLados = s.split(/\s+vs\.?\s+/i);
    if (!resultado) semResultado = true; // card de evento que ainda não aconteceu
  } else {
    return { erro: 'Formato do resultado não reconhecido', texto: original };
  }

  const lados = textosLados.map((t) => lerLado(t, links));
  return {
    texto: limpar(el.textContent),
    lados: lados.map(({ wrestlers, equipe }) => ({ wrestlers, equipe })),
    campeoes: lados.map((l, i) => (l.campeao ? i : null)).filter((i) => i != null),
    avisos: lados.flatMap((l) => l.avisos),
    resultado,
    semResultado,
    ladoVencedor: vencedor,
    metodo,
    duracaoSeg,
    trocaTitulo,
  };
}

// Palavras do tipo de match que não são estipulação (o tipo sai da contagem de lados).
const PALAVRAS_TIPO = [
  /\b(singles|tag team|mixed tag team|trios|handicap|tornado tag team|tag)\b/gi,
  /\b(\d+|two|three|four|five|six|eight|ten|twelve)[- ]?(man|woman|women|men|way|person|team)\b/gi,
  /\b(triple threat|fatal (4|four)[- ]?way|four corners)\b/gi,
  /\b(dark|pre-show|preshow|tournament|first round|second round|quarter ?final|semi ?final|final|block [a-z]|series #?\d+|best of (three|five|seven) series)\b/gi,
  /#\d+/g,
  /\bmatch\b/gi,
];
// Tipos de match que só o texto revela (a contagem de lados não basta).
const TIPOS_POR_TEXTO = [
  [/battle royal|royal rumble|rumble/i, 'Battle Royal'],
  [/gauntlet/i, 'Gauntlet'],
  [/handicap/i, 'Handicap'],
];

function lerTipo(el) {
  const titulos = [];
  let texto = '';
  for (const no of el?.childNodes ?? []) {
    if (no.nodeName === 'A' && idDoLink(no).id === '5') {
      titulos.push({ nome: limpar(no.textContent), cagematchId: idDoLink(no).nr });
      texto += ' ';
    } else texto += no.textContent;
  }
  texto = limpar(texto);
  const tipoPorTexto = TIPOS_POR_TEXTO.find(([re]) => re.test(texto))?.[1] ?? null;
  let resto = texto;
  for (const [re] of TIPOS_POR_TEXTO) resto = resto.replace(re, ' ');
  for (const re of PALAVRAS_TIPO) resto = resto.replace(re, ' ');
  resto = limpar(resto.replace(/\s[-–]\s/g, ' '));
  // Torneios e ligas ("World Tag League 2026 Block B") não são estipulação.
  if (/\b(league|tournament|cup|climax|grand prix|block [a-z]|round|final|series)\b/i.test(texto)) resto = '';
  return { textoTipo: texto, titulos, tipoPorTexto, estipulacaoTexto: resto || null, darkMatch: /\bdark\b|pre-?show/i.test(texto) };
}

// html: página inteira do evento · nr: número do evento no Cagematch
export function lerEvento(html, nr = null) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const info = lerInformacoes(doc);
  const nome = limpar(info['Name of the event']?.textContent) || limpar(doc.querySelector('h1.TextHeader')?.textContent);
  if (!nome) throw new Error('Não encontrei um evento nessa página do Cagematch.');
  const empresas = [...(info.Promotion?.querySelectorAll('a') ?? [])].map((a) => ({ nome: limpar(a.textContent), cagematchId: idDoLink(a).nr }));
  if (!empresas.length && info.Promotion) empresas.push({ nome: limpar(info.Promotion.textContent), cagematchId: null });

  const lutas = [...doc.querySelectorAll('.Match')].map((m, i) => {
    const tipo = lerTipo(m.querySelector('.MatchType'));
    const res = m.querySelector('.MatchResults');
    const resultado = res ? lerResultado(res) : { erro: 'Luta sem resultado', texto: '' };
    return { ordem: i + 1, ...tipo, ...resultado };
  });

  return {
    cagematchId: nr,
    nome,
    data: dataIso(info.Date?.textContent),
    empresas,
    lutas,
  };
}
