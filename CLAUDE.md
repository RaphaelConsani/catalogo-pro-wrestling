# Catálogo de Pro Wrestling · Regras de trabalho

App web pessoal pra catalogar lutas de pro wrestling assistidas e o backlog. O escopo completo está em [docs/ESCOPO.md](docs/ESCOPO.md).

## Regras

- **Não tome nenhuma decisão sozinho.** Se houver qualquer dúvida ou premissa a adotar, pergunte antes de executar. Avisar depois que já fez não serve.
- **Trabalhe por etapas**, na ordem abaixo. A partir da etapa 6, o Claude valida cada etapa sozinho (funcionamento e visual), faz o commit e segue pra próxima; o usuário revisa tudo **numa rodada só no fim** (combinado em 17/11/2026). As perguntas sobre decisões continuam vindo **antes** de implementar cada etapa.
- **Idioma:** a interface fica em português. Termos de wrestling (Singles, Tag Team, No DQ, Pinfall, Draw, Time Limit Draw, No Contest etc.) ficam em inglês.
- **Commits** pequenos e descritivos ao fim de cada etapa validada.
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
- [ ] **Etapa 8 · Publicação — site no ar, falta o usuário instalar no Brave.** Repositório público `RaphaelConsani/catalogo-pro-wrestling`; app em https://raphaelconsani.github.io/catalogo-pro-wrestling/ . Cada push no `main` publica sozinho (`.github/workflows/publicar.yml`). App instalável e offline: `public/manifest.webmanifest`, ícones em `public/icones/`, service worker gerado no build a partir de `src/sw-modelo.js` (plugin em `vite.config.js`). Push continua precisando de confirmação do usuário.
- [ ] Etapa 9

### Pra revisão final (usuário)

- **Etapa 6 · Dashboards.** Olhar: a tela inteira, os filtros de ano e empresa, o mínimo do ranking, as setas do calendário, o dourado nos destaques e a troca de cor de destaque. Escolhas do Claude: linha de números no topo (lutas, nota média, 5★, wrestlers diferentes); contagem de 5★ e barras de 4.50+ da distribuição em dourado; ranking mostra 25 e destaques 12, com "Mostrar todos"; com ano escolhido some "Lutas por ano", com empresa escolhida some "Nota média por empresa".
- **Etapa 7 · Dados.** Olhar: a tela Dados (três cartões), a faixa do lembrete (aparece com 7 dias sem backup; o ✕ esconde até amanhã), o diálogo de confirmação ao restaurar e a planilha exportada no Excel. Escolhas do Claude: item "Dados" no fim do menu; "Último backup" fica vermelho com 7 dias ou mais; o backup leva também os registros excluídos (pra fase 2); restaurar recarrega o app e conta como backup feito; nomes dos arquivos `catalogo-pro-wrestling-backup-AAAA-MM-DD.json` e `catalogo-pro-wrestling-AAAA-MM-DD.xlsx`; na planilha, as lutas vão em ordem de data do evento e as visualizações em ordem de data.

### Pendências e lembretes pra próximas etapas

- Dourado (`--ouro*` em `tema.css`) é reservado pras lutas 5★ e acima de 4½ — inclusive nos gráficos (use o neon).
- ECharts: cores passadas pra ele precisam da sintaxe antiga com vírgulas (`rgba(r, g, b, a)`); a sintaxe nova do CSS vira preto. `coresTema()` já cuida disso.
- O build ainda avisa que o pedaço dos gráficos (~600 kB) passou de 500 kB, mas ele só carrega sob demanda; o app principal ficou com ~200 kB.
- O Início ainda abre a edição ao clicar numa luta (decidido na etapa 3); o detalhe em painel está em `src/componentes/detalhe-luta.js`.
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
- `Prints/` — prints que o usuário manda (fora do git). Leia de lá quando ele citar um print.
