# Decisões tomadas

Registro das decisões combinadas com o usuário, pra não perguntar de novo. Acrescente cada nova decisão na seção da etapa.

## Gerais

- Arquivo de escopo antigo (`Escopo Catalogo de Matches.md`): detalhes incorporados ao `docs/ESCOPO.md` e arquivo apagado.
- Navegação por hash (`#/biblioteca`, `#/wrestler/<id>`, `#/cadastros/<entidade>`).
- Projeto Vite (template vanilla) na raiz, npm, branch `main`.
- SheetJS: versão oficial do CDN do SheetJS (0.20.3), não a do registro npm.
- Pasta `Prints/` e arquivos de dados (`*backup*.json`, `catalogo-*.json`, `.xlsx`, `.xls`, `.csv`) no `.gitignore`.

## Visual

- Só tema escuro. Neon na interface; **dourado reservado** pras lutas 5★ e acima de 4½.
- Cor de destaque escolhida pelo usuário na barra superior (3 bolinhas): ciano `#22e6ff` (padrão), roxo `#a855ff`, vermelho `#ff3b5c`. No vermelho, a cor de perigo vira laranja `#ff8a3d`.
- A cor escolhida fica na tabela `config` (chave `corAcento`, vai no backup), com cópia em localStorage só pra não piscar ao carregar.
- Menu na barra superior; "Nova luta" em destaque como botão.
- Fontes embutidas (@fontsource): Anton (títulos) + Barlow (texto).

## Modelo de dados

- IDs UUID (`crypto.randomUUID()`), `criadoEm`/`atualizadoEm` em todo registro.
- **Exclusão lógica** (`excluidoEm`), por causa do "importar e mesclar" da fase 2.
- Imagens em tabela separada (`imagens`); imagem substituída/removida é apagada de verdade.
- Lado da luta: `{ equipeId?, wrestlersIds[] }`; resultado `vitoria | draw | time_limit_draw | no_contest` + `ladoVencedor` (índice).
- Luta guarda `wrestlersIds[]` (cópia) pra consultas; empresa e data vêm sempre do evento.
- Nota mais recente e primeira visualização são calculadas a partir de `visualizacoes`.
- **Nota obrigatória** em toda visualização (0 a 5, passos de 0,25).
- **Duração** digitada em `mm:ss`, com o campo já pré-formatado; guardada em segundos.
- **Backlog:** ao registrar a luta pelo "assisti", o item sai do backlog. Evento inteiro: o usuário marca como concluído manualmente quando terminar de registrar as lutas.
- **Data do evento** obrigatória na interface; pode faltar só em dados importados da planilha (etapa 9).
- Dados iniciais com IDs fixos (`src/db/seed.js`): 6 métodos de vitória, 10 tipos de match, 20 estipulações. Plataformas não vêm pré-cadastradas.
- Tipos de match iniciais: Singles 2×1, Tag Team 2×2, Trios 2×3, Triple Threat 3×1, Fatal 4-Way 4×1, Four Corners Tag 4×2; variáveis: Multi-Man 2×4, Battle Royal 10×1, Gauntlet 3×1, Handicap 2×1.

## Etapa 2 · Cadastros

- Imagens: redimensionadas automaticamente pra no máx. 800px no lado maior, WebP (fallback PNG/JPEG se o navegador não gerar WebP). Sem recorte: a proporção original é guardada e o enquadramento é feito na exibição (pôster 2:3, foto de wrestler/equipe quadrada, logo inteiro sem corte) — o usuário deixou essa escolha comigo ("o que ficar melhor visualmente").
- Excluir item em uso: **bloqueado**, mostrando onde é usado (ex.: "2 eventos, 2 wrestlers").
- Tela de Cadastros: **painel de blocos** com contagem; clicando abre a lista.
- Criar/editar: **painel lateral** à direita.
- Nomes repetidos: **só wrestler pode repetir** (aviso + salvar mesmo assim). Evento é bloqueado só se nome **e** data forem iguais. Demais listas: bloqueado (ignorando maiúsculas e acentos).
- Membros de equipe: mesmo seletor da luta, com criação de wrestler na hora. Equipe exige pelo menos 2 membros.
- Cor da empresa: paleta de 12 cores + seletor livre + campo hex.
- Avisos (toasts) no canto inferior esquerdo, pra não cobrir o painel lateral.

## Etapa 3 · Registro de luta

- Nota: **estrelas + ajuste fino** (clica na estrela pra nota cheia, botões −¼/+¼), com a nota em número ao lado.
- Nota 0 é exibida como **DUD**.
- Duração: sempre `mm:ss`, minutos podem passar de 59 (ex.: `65:30`, até 3 dígitos). **Opcional.**
- Tipos fixos: número de lados e de wrestlers por lado **exato** (pra luta desigual existe Handicap).
- Tipos variáveis: dá pra adicionar e remover lados/wrestlers até o mínimo de 2 lados e 1 wrestler por lado.
- Método de vitória: aparece e é obrigatório **só quando há vencedor**; some em Draw, Time Limit Draw e No Contest.
- Visualização: data e nota obrigatórias, **plataforma opcional**, data vem com hoje.
- Depois de salvar uma luta nova: formulário limpa mas **mantém evento, data e plataforma** (pra registrar o show em sequência).
- Evento pode ser **criado na hora** no formulário (nome, data, empresa; pôster e parceiras depois em Cadastros).
- Título em disputa: primeiro os da empresa principal e parceiras do evento, depois todos os outros.
- Pra testar edição nesta etapa: lista de **últimas lutas registradas no Início**, cada uma abrindo a edição (base do Início definitivo).

## Etapa 4 · Biblioteca e página do wrestler

- Card da luta: **só texto, tipográfico** (sem imagens), na cor da empresa.
- Destaque 5 estrelas: **borda dourada com brilho** que passa devagar + selo "★ 5 STARS". De 4½ pra cima, a nota fica dourada.
- Filtros: empresa, wrestler, tipo, estipulação, ano do evento, faixa de nota + evento, título em disputa, resultado, plataforma e "assisti mais de uma vez". A busca por texto sempre existe.
- Filtro de empresa considera **principal + parceiras** (os dashboards continuam usando só a principal).
- Ordenação padrão: **assistidas por último** (visualização mais recente); dá pra trocar.
- Carregamento: **rolagem infinita**, 60 cards por vez.
- Detalhe da luta: **painel lateral**, com histórico de visualizações e botão de editar.
- Página do wrestler: cabeçalho com números (foto, empresa, total de lutas, nota média, recorde) + lista de lutas + mini gráficos (lutas por ano e nota média por ano, pelo **ano do evento**).
- Acesso à página do wrestler: nomes clicáveis no detalhe da luta + botão "Ver página" em Cadastros > Wrestlers.
- Formato da nota em todo o app (cards, detalhe, histórico, filtros, formulário, página do wrestler): **número com ponto e duas casas + ★**, no estilo dos sites de wrestling — `4.25 ★`, `5.00 ★`, `4.50 ★`. Nota 0 continua **DUD**. Substitui o `****¼` (decidido na etapa 4).
