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
import './estilos/biblioteca.css';
import './estilos/backlog.css';
import './estilos/dashboards.css';
import './estilos/dados.css';
import './estilos/lista.css';

import { db } from './db/schema.js';
// Antes de tudo: instala os ganchos que marcam o que mudou neste aparelho (sincronização).
import { iniciarSincronizacao } from './db/sincronizacao.js';
import { definirRota, iniciarRouter, redesenharTela, caminhoAtual } from './router.js';
import { telaNaoEncontrada } from './telas/nao-encontrada.js';
import { telaInicio } from './telas/inicio.js';
import { telaNovaLuta, telaEditarLuta } from './telas/luta/formulario.js';
import { telaBiblioteca } from './telas/biblioteca.js';
import { telaWrestler } from './telas/wrestler.js';
import { telaDashboards } from './telas/dashboards.js';
import { telaDados } from './telas/dados.js';
import { telaBacklog, telaAssistiBacklog, telaRegistrarEventoBacklog } from './telas/backlog.js';
import { telaCadastros, telaCadastro } from './telas/cadastros/cadastros.js';
import { montarSeletorAcento, aplicar as aplicarCor } from './componentes/seletor-acento.js';
import { montarIndicadorSync } from './componentes/indicador-sync.js';
import { montarLembreteBackup } from './componentes/lembrete-backup.js';
import { toast } from './componentes/toast.js';

const menu = [
  { caminho: '/', nome: 'Início' },
  { caminho: '/nova-luta', nome: 'Nova luta', acao: true },
  { caminho: '/biblioteca', nome: 'Biblioteca' },
  { caminho: '/dashboards', nome: 'Dashboards' },
  { caminho: '/backlog', nome: 'Backlog' },
  { caminho: '/cadastros', nome: 'Cadastros' },
  { caminho: '/dados', nome: 'Dados' },
];

definirRota('/', telaInicio);
definirRota('/nova-luta', telaNovaLuta);
definirRota('/luta/:id/editar', telaEditarLuta);
definirRota('/biblioteca', telaBiblioteca);
definirRota('/wrestler/:id', telaWrestler);
definirRota('/dashboards', telaDashboards);
definirRota('/backlog', telaBacklog);
definirRota('/backlog/:id/assisti', telaAssistiBacklog);
definirRota('/backlog/:id/registrar', telaRegistrarEventoBacklog);
definirRota('/cadastros', telaCadastros);
definirRota('/cadastros/:entidade', telaCadastro);
definirRota('/dados', telaDados);
definirRota('*', telaNaoEncontrada);

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
montarIndicadorSync(document.getElementById('indicador-sync'));
// O lembrete de backup é conferido a cada troca de tela (pega lutas recém-registradas).
const lembrete = montarLembreteBackup(document.getElementById('lembrete-backup'));
iniciarRouter(document.getElementById('app'), (caminho) => {
  marcarAtivo(caminho);
  lembrete.atualizar();
});

// Aviso deixado pela restauração de backup antes de recarregar a página.
const aviso = sessionStorage.getItem('avisoPosImportacao');
if (aviso) {
  sessionStorage.removeItem('avisoPosImportacao');
  toast(aviso);
}

// Abre o banco (cria e grava os dados iniciais na primeira vez) e liga a sincronização.
db.open()
  .then(() => iniciarSincronizacao())
  .catch((erro) => console.error('Erro ao abrir o banco:', erro));

// Chegaram dados de outro aparelho: redesenha a tela atual, menos formulários
// (perderia o que está sendo digitado) e com painel ou diálogo abertos.
const FORMULARIOS = /^\/(nova-luta|luta\/[^/]+\/editar|backlog\/[^/]+\/(assisti|registrar))/;
window.addEventListener('dados-sincronizados', (e) => {
  if (e.detail?.recomecou) {
    sessionStorage.setItem('avisoPosImportacao', 'Os dados foram substituídos por um backup restaurado em outro aparelho.');
    return location.reload();
  }
  if (FORMULARIOS.test(caminhoAtual()) || document.querySelector('.painel-raiz, dialog[open]')) return;
  redesenharTela();
});
window.addEventListener('cor-sincronizada', (e) => aplicarCor(e.detail));

// App instalável e offline: service worker só na versão publicada (no "npm run dev" atrapalharia).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch((erro) => console.error('Erro ao registrar o service worker:', erro));
}
