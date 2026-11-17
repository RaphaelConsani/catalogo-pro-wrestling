import '@fontsource/anton/400.css';
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow/700.css';

import './estilos/tema.css';
import './estilos/base.css';
import './estilos/layout.css';
import './estilos/componentes.css';
import './estilos/cadastros.css';
import './estilos/luta.css';

import { db } from './db/schema.js';
import { definirRota, iniciarRouter } from './router.js';
import { telaProvisoria } from './telas/provisoria.js';
import { telaInicio } from './telas/inicio.js';
import { telaNovaLuta, telaEditarLuta } from './telas/luta/formulario.js';
import { telaCadastros, telaCadastro } from './telas/cadastros/cadastros.js';
import { montarSeletorAcento } from './componentes/seletor-acento.js';

const menu = [
  { caminho: '/', nome: 'Início' },
  { caminho: '/nova-luta', nome: 'Nova luta', acao: true },
  { caminho: '/biblioteca', nome: 'Biblioteca' },
  { caminho: '/dashboards', nome: 'Dashboards' },
  { caminho: '/backlog', nome: 'Backlog' },
  { caminho: '/cadastros', nome: 'Cadastros' },
];

definirRota('/', telaInicio);
definirRota('/nova-luta', telaNovaLuta);
definirRota('/luta/:id/editar', telaEditarLuta);
definirRota('/biblioteca', telaProvisoria({
  rotulo: 'Acervo', titulo: 'Biblioteca', icone: '▦',
  descricao: 'Todas as lutas assistidas em cards, com filtros e busca.',
  etapa: 'Etapa 4 · Biblioteca e página do wrestler',
}));
definirRota('/wrestler/:id', telaProvisoria({
  rotulo: 'Wrestler', titulo: 'Página do wrestler', icone: '◉',
  descricao: 'Lutas, notas e estatísticas de um wrestler.',
  etapa: 'Etapa 4 · Biblioteca e página do wrestler',
}));
definirRota('/dashboards', telaProvisoria({
  rotulo: 'Estatísticas', titulo: 'Dashboards', icone: '◔',
  descricao: 'Lutas por período, notas médias, rankings e calendário de atividade.',
  etapa: 'Etapa 6 · Dashboards',
}));
definirRota('/backlog', telaProvisoria({
  rotulo: 'Pra assistir', titulo: 'Backlog', icone: '☰',
  descricao: 'Lutas e eventos inteiros que ainda vou assistir.',
  etapa: 'Etapa 5 · Backlog',
}));
definirRota('/cadastros', telaCadastros);
definirRota('/cadastros/:entidade', telaCadastro);
definirRota('*', telaProvisoria({
  rotulo: 'Erro', titulo: 'Página não encontrada', icone: '?',
  descricao: 'Esse endereço não existe.',
  etapa: 'Use o menu acima pra voltar',
}));

const nav = document.getElementById('menu');
nav.innerHTML = menu
  .map((m) => `<a href="#${m.caminho}" data-caminho="${m.caminho}"${m.acao ? ' class="acao"' : ''}>${m.nome}</a>`)
  .join('');

function marcarAtivo(caminho) {
  for (const link of nav.querySelectorAll('a')) {
    const alvo = link.dataset.caminho;
    const ativo = alvo === '/' ? caminho === '/' : caminho.startsWith(alvo);
    link.classList.toggle('ativo', ativo);
  }
}

montarSeletorAcento(document.getElementById('seletor-acento'));
iniciarRouter(document.getElementById('app'), marcarAtivo);

// Abre o banco (cria e grava os dados iniciais na primeira vez).
db.open().catch((erro) => console.error('Erro ao abrir o banco:', erro));
