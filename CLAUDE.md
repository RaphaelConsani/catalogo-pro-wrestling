# Catálogo de Pro Wrestling · Regras de trabalho

App web pessoal pra catalogar lutas de pro wrestling assistidas e o backlog. O escopo completo está em [docs/ESCOPO.md](docs/ESCOPO.md).

## Regras

- **Não tome nenhuma decisão sozinho.** Se houver qualquer dúvida ou premissa a adotar, pergunte antes de executar. Avisar depois que já fez não serve.
- **Trabalhe por etapas**, na ordem abaixo. No fim de cada etapa, mostre o que foi feito, diga como testar e espere aprovação antes de começar a próxima.
- **Idioma:** a interface fica em português. Termos de wrestling (Singles, Tag Team, No DQ, Pinfall, Draw, Time Limit Draw, No Contest etc.) ficam em inglês.
- **Commits** pequenos e descritivos ao fim de cada etapa aprovada.
- **Nunca salve backups JSON nem dados pessoais dentro da pasta do projeto.** O repositório é público.
- **Fase 2** (iPhone e "importar e mesclar") está fora do trabalho atual, mas nenhuma decisão de modelagem pode dificultá-la (ex.: IDs precisam ser únicos globalmente).
- **Conferir eu mesmo antes de entregar.** O usuário prefere que o Claude verifique o app e o banco por conta própria (Chrome headless com perfil temporário no scratchpad, via DevTools Protocol), inclusive com prints, em vez de pedir pra ele checar o IndexedDB.
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
- [ ] Etapa 3 · Registro de luta
- [ ] Etapas 4 a 9

### Pendências e lembretes pra próximas etapas

- Etapa 3: campo de duração com máscara `mm:ss` já pré-formatada no input (guardar em segundos). Perguntar se minutos acima de 59 (ex.: `65:30`) são aceitos assim ou se prefere `h:mm:ss` nesses casos.
- Etapa 3: ao excluir uma luta, marcar também as visualizações dela como excluídas (a contagem de uso de plataformas depende disso).
- Etapa 3: reaproveitar `src/componentes/seletor-wrestlers.js` nos lados da luta.
- Etapa 4: dourado (`--ouro*` em `tema.css`) é reservado pras lutas 5★ e acima de 4½.
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
