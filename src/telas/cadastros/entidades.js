import {
  campoTexto,
  campoData,
  campoNumero,
  campoInterruptor,
  campoSelecao,
  campoMultiChips,
  campoCor,
  campoImagem,
  campoWrestlers,
} from '../../componentes/campos.js';
import { formatarData, plural } from '../../util/texto.js';

// Configuração de cada cadastro. ctx = { empresas: Map, wrestlers: Map, url(imagemId) }
//
// visual: 'cartoes' (grade com imagem) | 'linhas' (lista compacta)
// duplicado: 'bloquear' | 'avisar' (só wrestlers podem repetir nome)
// campos(reg, ctx) -> { chave: campo }   |   montar(valores) -> dados do registro

const porNome = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR');
const opcoesEmpresas = (ctx) => [...ctx.empresas.values()].sort(porNome);
const empresa = (ctx, id) => ctx.empresas.get(id);
const siglaEmpresa = (ctx, id) => {
  const e = empresa(ctx, id);
  return e ? e.sigla || e.nome : '';
};

export const ENTIDADES = {
  empresas: {
    tabela: 'empresas',
    titulo: 'Empresas',
    singular: 'empresa',
    novo: 'Nova empresa',
    icone: '▣',
    visual: 'cartoes',
    formato: 'logo',
    duplicado: 'bloquear',
    ordenar: porNome,
    busca: (r) => `${r.nome} ${r.sigla ?? ''}`,
    cartao: (r) => ({ titulo: r.nome, subtitulo: r.sigla, cor: r.cor, imagemId: r.imagemId, marcador: r.sigla || r.nome }),
    campos: (r = {}, ctx) => ({
      nome: campoTexto({ rotulo: 'Nome', valor: r.nome, obrigatorio: true, placeholder: 'All Elite Wrestling' }),
      sigla: campoTexto({ rotulo: 'Sigla', valor: r.sigla, obrigatorio: true, placeholder: 'AEW', maximo: 12 }),
      cor: campoCor({ rotulo: 'Cor', valor: r.cor }),
      imagem: campoImagem({ rotulo: 'Logo', imagemId: r.imagemId, urlAtual: ctx.url(r.imagemId), formato: 'logo' }),
    }),
    montar: (v) => ({ nome: v.nome, sigla: v.sigla, cor: v.cor }),
  },

  eventos: {
    tabela: 'eventos',
    titulo: 'Eventos',
    singular: 'evento',
    novo: 'Novo evento',
    icone: '◈',
    visual: 'cartoes',
    formato: 'poster',
    duplicado: 'bloquear',
    mensagemDuplicado: 'Já existe um evento com esse nome nessa data.',
    ordenar: (a, b) => (b.data ?? '').localeCompare(a.data ?? '') || porNome(a, b),
    busca: (r, ctx) => `${r.nome} ${siglaEmpresa(ctx, r.empresaId)} ${formatarData(r.data)}`,
    cartao: (r, ctx) => {
      const parceiras = (r.parceirasIds ?? []).map((id) => siglaEmpresa(ctx, id)).filter(Boolean);
      return {
        titulo: r.nome,
        subtitulo: `${formatarData(r.data)} · ${siglaEmpresa(ctx, r.empresaId)}${parceiras.length ? ' × ' + parceiras.join(' × ') : ''}`,
        cor: empresa(ctx, r.empresaId)?.cor,
        imagemId: r.imagemId,
        marcador: r.nome,
      };
    },
    campos: (r = {}, ctx) => {
      const opcoes = opcoesEmpresas(ctx);
      const campos = {
        nome: campoTexto({ rotulo: 'Nome', valor: r.nome, obrigatorio: true, placeholder: 'Wrestle Kingdom 18' }),
        data: campoData({ rotulo: 'Data', valor: r.data, obrigatorio: true }),
        empresaId: campoSelecao({ rotulo: 'Empresa principal', valor: r.empresaId, opcoes, obrigatorio: true }),
        parceirasIds: campoMultiChips({
          rotulo: 'Empresas parceiras',
          valor: r.parceirasIds ?? [],
          opcoes,
          dica: 'Opcional. Pra eventos em parceria (ex.: Forbidden Door).',
        }),
        imagem: campoImagem({ rotulo: 'Pôster', imagemId: r.imagemId, urlAtual: ctx.url(r.imagemId), formato: 'poster' }),
      };
      // A empresa principal não aparece entre as parceiras.
      const sincronizar = () => campos.parceirasIds.ocultar([campos.empresaId.ler()].filter(Boolean));
      campos.empresaId.select.addEventListener('change', sincronizar);
      sincronizar();
      return campos;
    },
    montar: (v) => ({ nome: v.nome, data: v.data, empresaId: v.empresaId, parceirasIds: v.parceirasIds }),
  },

  wrestlers: {
    tabela: 'wrestlers',
    titulo: 'Wrestlers',
    singular: 'wrestler',
    novo: 'Novo wrestler',
    icone: '◉',
    visual: 'cartoes',
    formato: 'foto',
    duplicado: 'avisar',
    ordenar: porNome,
    busca: (r, ctx) => `${r.nome} ${siglaEmpresa(ctx, r.empresaId)}`,
    cartao: (r, ctx) => ({
      titulo: r.nome,
      subtitulo: siglaEmpresa(ctx, r.empresaId) || 'Sem empresa',
      cor: empresa(ctx, r.empresaId)?.cor,
      imagemId: r.imagemId,
      marcador: r.nome,
    }),
    campos: (r = {}, ctx) => ({
      nome: campoTexto({ rotulo: 'Nome', valor: r.nome, obrigatorio: true, placeholder: 'Kazuchika Okada' }),
      empresaId: campoSelecao({ rotulo: 'Empresa atual', valor: r.empresaId, opcoes: opcoesEmpresas(ctx) }),
      imagem: campoImagem({ rotulo: 'Foto', imagemId: r.imagemId, urlAtual: ctx.url(r.imagemId), formato: 'foto' }),
    }),
    montar: (v) => ({ nome: v.nome, empresaId: v.empresaId }),
  },

  equipes: {
    tabela: 'equipes',
    titulo: 'Equipes',
    singular: 'equipe',
    novo: 'Nova equipe',
    icone: '⬢',
    visual: 'cartoes',
    formato: 'foto',
    duplicado: 'bloquear',
    ordenar: porNome,
    busca: (r, ctx) => `${r.nome} ${(r.membrosIds ?? []).map((id) => ctx.wrestlers.get(id)?.nome ?? '').join(' ')}`,
    cartao: (r, ctx) => ({
      titulo: r.nome,
      subtitulo: (r.membrosIds ?? []).map((id) => ctx.wrestlers.get(id)?.nome ?? '?').join(', '),
      imagemId: r.imagemId,
      marcador: r.nome,
      selo: plural((r.membrosIds ?? []).length, 'membro', 'membros'),
    }),
    campos: async (r = {}, ctx) => ({
      nome: campoTexto({ rotulo: 'Nome', valor: r.nome, obrigatorio: true, placeholder: 'The Young Bucks' }),
      membrosIds: await campoWrestlers({ rotulo: 'Membros', valor: r.membrosIds ?? [], obrigatorio: true, minimo: 2 }),
      imagem: campoImagem({ rotulo: 'Imagem', imagemId: r.imagemId, urlAtual: ctx.url(r.imagemId), formato: 'foto' }),
    }),
    montar: (v) => ({ nome: v.nome, membrosIds: v.membrosIds }),
  },

  tiposMatch: {
    tabela: 'tiposMatch',
    titulo: 'Tipos de match',
    singular: 'tipo de match',
    novo: 'Novo tipo de match',
    icone: '⚔',
    visual: 'linhas',
    duplicado: 'bloquear',
    ordenar: porNome,
    busca: (r) => r.nome,
    linha: (r) => ({
      titulo: r.nome,
      meta: `${plural(r.numLados, 'lado', 'lados')} × ${plural(r.wrestlersPorLado, 'wrestler', 'wrestlers')}`,
      selo: r.variavel ? 'Variável' : null,
    }),
    campos: (r = {}) => ({
      nome: campoTexto({ rotulo: 'Nome', valor: r.nome, obrigatorio: true, placeholder: 'Singles' }),
      numLados: campoNumero({ rotulo: 'Número de lados', valor: r.numLados ?? 2, minimo: 2, maximo: 60 }),
      wrestlersPorLado: campoNumero({ rotulo: 'Wrestlers por lado', valor: r.wrestlersPorLado ?? 1, minimo: 1, maximo: 30 }),
      variavel: campoInterruptor({
        rotulo: 'Tamanho variável',
        valor: r.variavel,
        dica: 'Permite adicionar lados ou wrestlers na hora de registrar a luta.',
      }),
    }),
    montar: (v) => ({ nome: v.nome, numLados: v.numLados, wrestlersPorLado: v.wrestlersPorLado, variavel: v.variavel }),
  },

  estipulacoes: {
    tabela: 'estipulacoes',
    titulo: 'Estipulações',
    singular: 'estipulação',
    novo: 'Nova estipulação',
    icone: '⛓',
    visual: 'linhas',
    duplicado: 'bloquear',
    ordenar: porNome,
    busca: (r) => r.nome,
    linha: (r) => ({ titulo: r.nome }),
    campos: (r = {}) => ({
      nome: campoTexto({ rotulo: 'Nome', valor: r.nome, obrigatorio: true, placeholder: 'No DQ' }),
    }),
    montar: (v) => ({ nome: v.nome }),
  },

  titulos: {
    tabela: 'titulos',
    titulo: 'Títulos',
    singular: 'título',
    novo: 'Novo título',
    icone: '♛',
    visual: 'linhas',
    duplicado: 'bloquear',
    ordenar: porNome,
    busca: (r, ctx) => `${r.nome} ${siglaEmpresa(ctx, r.empresaId)}`,
    linha: (r, ctx) => ({ titulo: r.nome, meta: siglaEmpresa(ctx, r.empresaId), cor: empresa(ctx, r.empresaId)?.cor }),
    campos: (r = {}, ctx) => ({
      nome: campoTexto({ rotulo: 'Nome', valor: r.nome, obrigatorio: true, placeholder: 'IWGP World Heavyweight Championship' }),
      empresaId: campoSelecao({ rotulo: 'Empresa', valor: r.empresaId, opcoes: opcoesEmpresas(ctx), obrigatorio: true }),
    }),
    montar: (v) => ({ nome: v.nome, empresaId: v.empresaId }),
  },

  plataformas: {
    tabela: 'plataformas',
    titulo: 'Plataformas',
    singular: 'plataforma',
    novo: 'Nova plataforma',
    icone: '▶',
    visual: 'linhas',
    duplicado: 'bloquear',
    ordenar: porNome,
    busca: (r) => r.nome,
    linha: (r) => ({ titulo: r.nome }),
    campos: (r = {}) => ({
      nome: campoTexto({ rotulo: 'Nome', valor: r.nome, obrigatorio: true, placeholder: 'NJPW World' }),
    }),
    montar: (v) => ({ nome: v.nome }),
  },

  metodosVitoria: {
    tabela: 'metodosVitoria',
    titulo: 'Métodos de vitória',
    singular: 'método de vitória',
    novo: 'Novo método de vitória',
    icone: '✓',
    visual: 'linhas',
    duplicado: 'bloquear',
    ordenar: porNome,
    busca: (r) => r.nome,
    linha: (r) => ({ titulo: r.nome }),
    campos: (r = {}) => ({
      nome: campoTexto({ rotulo: 'Nome', valor: r.nome, obrigatorio: true, placeholder: 'Pinfall' }),
    }),
    montar: (v) => ({ nome: v.nome }),
  },
};
