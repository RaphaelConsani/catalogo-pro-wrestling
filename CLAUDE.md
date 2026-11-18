# Catálogo de Pro Wrestling · Regras de trabalho

App web pessoal pra catalogar lutas de pro wrestling assistidas e o backlog. O escopo completo está em [docs/ESCOPO.md](docs/ESCOPO.md).

## Regras

- **Não tome nenhuma decisão sozinho.** Se houver qualquer dúvida ou premissa a adotar, pergunte antes de executar. Avisar depois que já fez não serve.
- **Trabalhe por etapas**, na ordem abaixo. A partir da etapa 6, o Claude valida cada etapa sozinho (funcionamento e visual), faz o commit e segue pra próxima; o usuário revisa tudo **numa rodada só no fim** (combinado em 17/11/2026). As perguntas sobre decisões continuam vindo **antes** de implementar cada etapa.
- **Idioma:** a interface fica em português. Termos de wrestling (Singles, Tag Team, No DQ, Pinfall, Draw, Time Limit Draw, No Contest etc.) ficam em inglês.
- **Commits** pequenos e descritivos ao fim de cada etapa validada. **Push no `main` está autorizado** (17/11/2026): enviar sem pedir confirmação; cada push publica o site. Outros comandos que mexam na conta do GitHub (criar repositório, mudar configurações etc.) continuam precisando de confirmação.
- **Nunca salve backups JSON nem dados pessoais dentro da pasta do projeto.** O repositório é público.
- **Fase 2** (iPhone e "importar e mesclar") está fora do trabalho atual, mas nenhuma decisão de modelagem pode dificultá-la (ex.: IDs precisam ser únicos globalmente).
- **Divisão dos testes.** O Claude faz todos os testes funcionais (validações, banco, fluxos, regras) **e a validação visual** por conta própria, no Chrome headless com perfil temporário no scratchpad (via DevTools Protocol): prints de cada tela no computador (1440) e no celular (390), nas três cores de destaque, conferindo alinhamento, textos cortados, rolagem lateral e o dourado só onde deve. O usuário revisa tudo no fim, numa rodada só.
- **Revisão final.** Cada etapa validada entra na seção "Pra revisão final" abaixo: o que olhar e as escolhas que o Claude fez sozinho (detalhes de visual) pra o usuário aprovar ou mudar. Ajustes pedidos lá são feitos numa rodada só.
- **Decisões já tomadas** ficam registradas em [docs/DECISOES.md](docs/DECISOES.md). Consulte antes de perguntar de novo; acrescente cada nova decisão lá.

## Etapas da fase 1

1. **Base do projeto.** Projeto Vite com HTML, CSS e JavaScript, git iniciado, estrutura de pastas, Dexie.js, Apache ECharts e SheetJS instalados. Antes de criar o banco, apresentar o modelo de dados proposto (tabelas, campos e relações) e esperar aprovação. Depois, layout base no tema escuro e navegação entre as telas, ainda vazias.
2. **Cadastros.** Empresas, eventos, wrestlers, equipes, tipos de match, estipulações, títulos, plataformas e métodos de vitória, com criar, editar, excluir e anexo de imagem onde o escopo prevê. Antes de implementar os anexos, perguntar sobre tamanho máximo e redimensionamento das imagens.
3. **Registro de luta.** Formulário completo, seletor de wrestlers com rolagem, busca e criação na hora, lados liberados conforme o tipo, equipe preenchendo os membros, componente de nota e histórico de visualizações.
4. **Biblioteca e página do wrestler.** Cards, filtros, busca, detalhe da luta com histórico de visualizações e página do wrestler.
5. **Backlog.** Itens de luta e de evento inteiro, e o fluxo de "assisti" abrindo o formulário completo já preenchido.
6. **Dashboards.** Todos os gráficos do escopo com Apache ECharts, seguindo as regras de nota mais recente e de primeira visualização.
7. **Dados.** Exportar e importar JSON (com imagens), lembrete de 7 dias sem backup e exportação pra Excel.
8. **Publicação.** Guiar passo a passo a publicação no GitHub Pages e a instalação do app no Brave do Mac. Cada comando que envolva a conta do GitHub precisa de confirmação antes.
9. **Importação da planilha.** Só depois das etapas anteriores aprovadas. Combinar juntos como cada coluna deve ser lida antes de importar qualquer coisa.

## Andamento

- [x] Etapa 1 · Base do projeto (commit `9bae251`) + seletor de cor de destaque (commit `64ebc26`)
- [x] Etapa 2 · Cadastros
- [x] Etapa 3 · Registro de luta
- [x] Etapa 4 · Biblioteca e página do wrestler
  - As lutas de teste estão no Brave dele, mas só no endereço local (localhost). O app publicado tem banco próprio e começa vazio.
- [x] Etapa 5 · Backlog (tela em `src/telas/backlog.js`, banco em `src/db/backlog.js`, formulário da luta ganhou `modo: 'backlog'`)
- [x] Etapa 6 · Dashboards (tela em `src/telas/dashboards.js`, cálculos em `src/db/estatisticas.js`, ECharts sob demanda via `import()` de `src/util/graficos.js`)
- [x] Etapa 7 · Dados (tela em `src/telas/dados.js`, backup e lembrete em `src/db/backup.js`, Excel em `src/db/excel.js`, faixa em `src/componentes/lembrete-backup.js`; SheetJS sob demanda)
- [x] Etapa 8 · Publicação (instalado no Brave do usuário em 17/11/2026). Repositório público `RaphaelConsani/catalogo-pro-wrestling`; app em https://raphaelconsani.github.io/catalogo-pro-wrestling/ . Cada push no `main` publica sozinho (`.github/workflows/publicar.yml`). App instalável e offline: `public/manifest.webmanifest`, ícones em `public/icones/`, service worker gerado no build a partir de `src/sw-modelo.js` (plugin em `vite.config.js`). Push está autorizado pelo usuário (17/11/2026).
- [x] Etapa 9 · Importação da planilha (importado no app do usuário em 17/11/2026; regras em DECISOES.md; script de conversão ficou fora do repositório)
- [ ] **Rodada final de revisão do usuário** (lista abaixo)
- [x] **Importar evento do Cagematch** (pedido do usuário, 18/11/2026; decisões em DECISOES.md). Feito: função no Cloudflare Workers em `worker/` (publicada em https://catalogo-cagematch.raphaelconsani.workers.dev/evento?url=… ; publicar de novo com `cd worker && npx wrangler@4.156.0 deploy`, o usuário já fez login no Wrangler). No app: leitor em `src/util/cagematch.js`, plano/gravação em `src/db/cagematch.js`, painel em `src/componentes/importar-cagematch.js`, botão "Do Cagematch" no Backlog; "Assisti" usa os dados escondidos (`item.cagematch`).

### Pra revisão final (usuário)

- **Etapa 6 · Dashboards.** Olhar: a tela inteira, os filtros de ano e empresa, o mínimo do ranking, as setas do calendário, o dourado nos destaques e a troca de cor de destaque. Escolhas do Claude: linha de números no topo (lutas, nota média, 5★, wrestlers diferentes); contagem de 5★ e barras de 4.50+ da distribuição em dourado; ranking mostra 25 e destaques 12, com "Mostrar todos"; com ano escolhido some "Lutas por ano", com empresa escolhida some "Nota média por empresa".
- **Etapa 7 · Dados.** Olhar: a tela Dados (três cartões), a faixa do lembrete (aparece com 7 dias sem backup; o ✕ esconde até amanhã), o diálogo de confirmação ao restaurar e a planilha exportada no Excel. Escolhas do Claude: item "Dados" no fim do menu; "Último backup" fica vermelho com 7 dias ou mais; o backup leva também os registros excluídos (pra fase 2); restaurar recarrega o app e conta como backup feito; nomes dos arquivos `catalogo-pro-wrestling-backup-AAAA-MM-DD.json` e `catalogo-pro-wrestling-AAAA-MM-DD.xlsx`; na planilha, as lutas vão em ordem de data do evento e as visualizações em ordem de data.
- **Etapa 8 · Publicação.** Olhar: ícone do app no Dock/Launchpad (estrela ciano em fundo escuro, mesmo do favicon) e o nome curto "Pro Wrestling" na janela. Escolha do Claude: nome curto e ícone.
- **Etapa 9 · Importação.** Olhar: Biblioteca, Backlog e Dashboards com os dados reais; nomes de eventos, wrestlers e cores das empresas. As 4 lutas do WrestleDream 2025 sem nota estão no Backlog (usar "Assisti" se foram vistas); métodos de vitória das lutas importadas estão em branco.
- **Revisão · Cards ou lista** (pedido do usuário, feito em 17/11/2026). Olhar: o alternador (ícones de quadradinhos e linhas) na Biblioteca, no Backlog, na página do wrestler e nos destaques dos Dashboards; a tabela no computador e no celular. Escolhas do Claude: ícones do alternador; linha de 5★ com leve fundo dourado e nota dourada a partir de 4.50; faixa na cor da empresa no começo da linha; cabeçalho da tabela fica fixo ao rolar; o seletor de ordem ganhou as ordens por texto (Confronto, Empresa, Evento, Tipo, A–Z e Z–A) e "Assistidas há mais tempo"; no Backlog em cards, o seletor só mostra as ordens que funcionam agrupadas (se estava por Confronto/Tipo, volta pra "Adicionados por último"); no celular do Backlog, o nome do evento aparece embaixo do confronto; editar no Backlog em lista é o ícone ✎.
- **Revisão · Empresa no Backlog** (pedido do usuário, feito em 17/11/2026). Olhar: botão "Filtros" e painel com Empresa no Backlog, chip do filtro ativo, coluna Empresa na lista, ordens "Empresa (A–Z/Z–A)". Escolhas do Claude: dentro da mesma empresa, evento mais recente primeiro; com busca ou filtro, o contador mostra "N de M itens"; na visão em cards, cada grupo mostra só os itens que batem com a busca (antes mostrava o evento todo — corrigido pra bater com a lista e o contador); no celular, a barra do Backlog ficou em 3 linhas.
- **Revisão externa (18/11/2026).** Dois agentes (revisão de código e QA funcional) acharam 13 problemas; todos corrigidos e retestados (29 testes de regressão + offline), mais 8 sugestões aprovadas pelo usuário (ver DECISOES › Revisão externa). Olhar: aviso de luta repetida no Backlog, aviso de data anterior ao evento, aviso de equipe maior que o lado, cor de destaque voltando junto ao restaurar backup, nova cor verde-limão na paleta das empresas.
- **Revisão · Cores por faixa de nota** (pedido do usuário, feito em 18/11/2026). Olhar: cor da nota e das estrelas em cards, lista, detalhe, histórico, formulário, Início, página do wrestler, ranking e números dos Dashboards; barras do gráfico de distribuição; brilho só no 5.00. Escolhas do Claude: barra do ranking dourada só com média 5.00; borda dourada da linha no Início só no 5.00.
- **Revisão · Importar do Cagematch** (pedido do usuário, feito em 18/11/2026). Olhar: botão "Do Cagematch" no Backlog, painel de revisão (evento, não reconhecidos, lutas com tipo, wrestlers novos com ligação a cadastrados, equipes), itens no Backlog sem spoiler e o "Assisti" já com vencedor, título e duração. Escolhas do Claude: ver DECISOES › Importar evento do Cagematch (detalhes do Claude).

### Pendências e lembretes pra próximas etapas

- Dourado (`--ouro*` em `tema.css`) é reservado pras lutas 5★ — inclusive nos gráficos (use o neon). Nota usa as cores por faixa (`classeFaixa()`/`faixaNota()` em `src/util/nota.js`, tokens `--nota-0..4`).
- ECharts: cores passadas pra ele precisam da sintaxe antiga com vírgulas (`rgba(r, g, b, a)`); a sintaxe nova do CSS vira preto. `coresTema()` já cuida disso.
- O build ainda avisa que o pedaço dos gráficos (~600 kB) passou de 500 kB, mas ele só carrega sob demanda; o app principal ficou com ~200 kB.
- O Início ainda abre a edição ao clicar numa luta (decidido na etapa 3); o detalhe em painel está em `src/componentes/detalhe-luta.js`.
- App instalado: versão nova só assume depois que **todas as janelas do app fecharem** (service worker sem skipWaiting, de propósito).
- O fluxo de publicação usa actions na versão v4 (avisos de Node 20 descontinuado no GitHub); atualizar quando houver versão nova estável.
- Ícone da aba (favicon) é fixo em ciano; o usuário ainda não pediu pra acompanhar a cor escolhida.

## Como rodar

```
cd ~/Projetos/catalogo-pro-wrestling
npm run dev
```

O usuário roda comandos no Terminal; lembre sempre de incluir o `cd` pra pasta do projeto (na primeira vez ele rodou na pasta pessoal e deu erro).

## Estrutura

- `src/db/` — `schema.js` (Dexie, tabelas), `seed.js` (dados iniciais com IDs fixos — não alterar), `repo.js` (CRUD, exclusão lógica, duplicados, imagens), `usos.js` (onde um registro é usado)
- `src/telas/` — telas; `cadastros/entidades.js` define campos e exibição de cada cadastro
- `src/componentes/` — painel lateral, diálogo, toast, campos de formulário, seletor de wrestlers, seletor de cor de destaque
- `src/estilos/` — `tema.css` (tokens), `base.css`, `layout.css`, `componentes.css`, `cadastros.css`
- `src/util/` — ids, texto (normalizar, escapar, datas), imagem (redimensionamento)
- `worker/` — função do Cloudflare Workers que busca a página do evento no Cagematch (resolve o desafio anti-robô; só aceita o app e o localhost)
- `Prints/` — prints que o usuário manda (fora do git). Leia de lá quando ele citar um print.
