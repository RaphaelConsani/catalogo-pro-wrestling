# Catálogo de Pro Wrestling · Regras de trabalho

App web pessoal pra catalogar lutas de pro wrestling assistidas e o backlog. O escopo completo está em [docs/ESCOPO.md](docs/ESCOPO.md).

## Regras

- **Não tome nenhuma decisão sozinho.** Se houver qualquer dúvida ou premissa a adotar, pergunte antes de executar. Avisar depois que já fez não serve.
- **Trabalhe por etapas**, na ordem abaixo. No fim de cada etapa, mostre o que foi feito, diga como testar e espere aprovação antes de começar a próxima.
- **Idioma:** a interface fica em português. Termos de wrestling (Singles, Tag Team, No DQ, Pinfall, Draw, Time Limit Draw, No Contest etc.) ficam em inglês.
- **Commits** pequenos e descritivos ao fim de cada etapa aprovada.
- **Nunca salve backups JSON nem dados pessoais dentro da pasta do projeto.** O repositório é público.
- **Fase 2** (iPhone e "importar e mesclar") está fora do trabalho atual, mas nenhuma decisão de modelagem pode dificultá-la (ex.: IDs precisam ser únicos globalmente).

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

- [x] Etapa 1 · Base do projeto
- [ ] Etapa 2 · Cadastros
