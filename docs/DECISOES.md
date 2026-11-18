# Decisões tomadas

Registro das decisões combinadas com o usuário, pra não perguntar de novo. Acrescente cada nova decisão na seção da etapa.

## Gerais

- Arquivo de escopo antigo (`Escopo Catalogo de Matches.md`): detalhes incorporados ao `docs/ESCOPO.md` e arquivo apagado.
- Navegação por hash (`#/biblioteca`, `#/wrestler/<id>`, `#/cadastros/<entidade>`).
- Projeto Vite (template vanilla) na raiz, npm, branch `main`.
- SheetJS: versão oficial do CDN do SheetJS (0.20.3), não a do registro npm.
- Pasta `Prints/` e arquivos de dados (`*backup*.json`, `catalogo-*.json`, `.xlsx`, `.xls`, `.csv`) no `.gitignore`.

## Visual

- Só tema escuro. Neon na interface; **dourado reservado** pras lutas 5★ (até 18/11/2026 valia também de 4½ pra cima; ver "Cores por faixa de nota").
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
- Destaque 5 estrelas: **borda dourada com brilho** que passa devagar + selo "★ 5 STARS". ~~De 4½ pra cima, a nota fica dourada.~~ Substituído pelas cores por faixa de nota (18/11/2026).
- Filtros: empresa, wrestler, tipo, estipulação, ano do evento, faixa de nota + evento, título em disputa, resultado, plataforma e "assisti mais de uma vez". A busca por texto sempre existe.
- Filtro de empresa considera **principal + parceiras** (os dashboards continuam usando só a principal).
- Ordenação padrão: **assistidas por último** (visualização mais recente); dá pra trocar.
- Carregamento: **rolagem infinita**, 60 cards por vez.
- Detalhe da luta: **painel lateral**, com histórico de visualizações e botão de editar.
- Página do wrestler: cabeçalho com números (foto, empresa, total de lutas, nota média, recorde) + lista de lutas + mini gráficos (lutas por ano e nota média por ano, pelo **ano do evento**).
- Acesso à página do wrestler: nomes clicáveis no detalhe da luta + botão "Ver página" em Cadastros > Wrestlers.
- Formato da nota em todo o app (cards, detalhe, histórico, filtros, formulário, página do wrestler): **número com ponto e duas casas + ★**, no estilo dos sites de wrestling — `4.25 ★`, `5.00 ★`, `4.50 ★`. Nota 0 continua **DUD**. Substitui o `****¼` (decidido na etapa 4).

## Etapa 5 · Backlog

- Item de luta é cadastrado pela tela Backlog, num painel lateral que **reusa o formulário da luta** mostrando só evento, tipo, estipulações e lados.
- Item concluído (luta registrada pelo "assisti" ou evento concluído) **some da lista**; fica no banco marcado como concluído.
- Item de evento inteiro tem **"Registrar luta"** (abre a Nova luta com o evento preenchido) e **"Concluir evento"**; o card mostra quantas lutas daquele evento já foram registradas.
- Tela **agrupada por evento** (evento inteiro e lutas avulsas do mesmo evento juntos), cards na cor da empresa, com busca e ordem por data do evento ou por data em que foi adicionado.

## Etapa 6 · Dashboards

- Ranking de wrestlers: mínimo de lutas **ajustável na tela, começa em 5**.
- Filtros no topo que valem pra todos os gráficos: **ano** (ou Todos) e **empresa** (só a principal).
- O filtro de ano usa o **ano da 1ª visualização** (como as contagens e o calendário).
- Calendário de atividade: **um ano por vez**, estilo GitHub, com setas pra trocar de ano.
- Atraso evento → 1ª visualização: **barras por faixa** (mesmo dia, até 1 semana, até 1 mês, até 1 ano, até 5 anos, mais de 5 anos) + atraso mediano e maior atraso.
- Lista de lutas 5★ e acima de 4½: **de 4.50 pra cima**.
- Nota média por empresa e por tipo: **todas aparecem**, com a quantidade de lutas no rótulo (sem mínimo).
- ECharts carregado **sob demanda** (`import()` dinâmico) nos Dashboards e na página do wrestler.

## Forma de trabalho (a partir da etapa 6)

- O Claude valida sozinho funcionamento **e visual** de cada etapa, faz o commit e segue; o usuário revisa tudo numa rodada só no fim. Perguntas de decisão continuam vindo antes de implementar. Etapas 8 (comandos no GitHub) e 9 (leitura das colunas) continuam precisando do usuário.

## Etapa 7 · Dados

- Tela própria **"Dados"** no menu: exportar backup JSON, importar backup, exportar Excel e data do último backup.
- Importar backup **substitui tudo**, depois de mostrar o resumo do arquivo (quantidades e data do backup) e pedir confirmação. Mesclar fica pra fase 2.
- Lembrete de 7 dias sem backup: **faixa no topo** de todas as telas com "Exportar agora"; some ao exportar. O ✕ esconde **até o dia seguinte**.
- Sem nenhum backup feito, os 7 dias contam **a partir da 1ª luta registrada**; app vazio não mostra lembrete.
- Excel: aba **Lutas** (uma linha por luta: evento, data, empresa, lados, vencedor, método, título, duração, nota mais recente, 1ª visualização) e aba **Visualizações** (todo o histórico).

## Etapa 8 · Publicação

- Commits continuam com o e-mail pessoal (o usuário não vê problema; projeto sem dados sensíveis).
- Repositório **catalogo-pro-wrestling** (público) → app em `https://<usuário>.github.io/catalogo-pro-wrestling/`.
- Publicação **automática a cada push** (GitHub Actions → GitHub Pages).
- App **instalável e funcionando offline**: manifesto com nome, ícone e janela própria + service worker.
- Endereço continua `raphaelconsani.github.io/catalogo-pro-wrestling` por enquanto (cogitou-se esconder o nome com organização ou outro serviço; ficou pra depois — mudar exige exportar e restaurar o backup no endereço novo).
- **Push autorizado** sem confirmação a cada vez (17/11/2026). Demais comandos na conta do GitHub continuam pedindo confirmação.

## Etapa 9 · Importação da planilha

- A planilha é convertida por um script (fora do repositório) num **arquivo de backup** do app, salvo fora do projeto; o usuário restaura em Dados → Restaurar backup (o app publicado estava vazio).
- Aba "Dados" ignorada (são contagens). Abas "Matches" (assistidas) e "Backlog".
- Uma luta pode ocupar várias linhas (continuação = linha sem data/empresa/evento). Lados por coluna; o "X" entre colunas indica o formato do Backlog.
- Tipo da luta sai da contagem de lados/wrestlers; o texto da coluna "Tipo" vira estipulação (tabela combinada na conversa de 17/11/2026). Estipulações novas criadas: No Count Out, Tornado, Extreme Rules, Double Dog Collar, Fight Without Honor, FreeFall.
- Lutas da aba Matches sem data de visualização e sem nota vão pro backlog. Luta com nota e sem data de visualização usa a data do evento.
- Método de vitória fica **em branco** na importação (o formulário pede ao editar).
- Itens do Backlog que já estão assistidos em Matches são **pulados**.
- Empresas com nome completo e cor sugeridos (sem dourado; AEW em prata `#cbd5e1`).
- Nomes: espaços sobrando removidos, maiúsculas/minúsculas unificadas, erros de digitação corrigidos; nomes antigos de um mesmo wrestler unificados no nome atual. Eventos repetidos com/sem prefixo da empresa unificados.
- Equipes não são criadas na importação.

## Revisão final · Cards ou lista

- Biblioteca, Backlog, página do wrestler e destaques dos Dashboards ganham a opção de ver em **cards** (como já era) ou **lista** (tabela compacta).
- Cada tela **lembra a sua escolha**, mesmo depois de fechar o app.
- Biblioteca (e wrestler/destaques): colunas **Nota, Confronto, Empresa, Evento, Data, Tipo, Assistida em**.
- Backlog: **tabela corrida** (sem agrupar por evento), com o evento numa coluna e as ações em cada linha.
- Celular: **esconde colunas**, ficando Nota, Confronto e Data.
- Clicar no **cabeçalho ordena** pela coluna (de novo inverte); o seletor de ordem acompanha.

## Revisão final · Empresa no Backlog

- Backlog ganha filtro de **empresa** igual ao da Biblioteca: botão "Filtros" com painel (por ora só Empresa) e chip do filtro ativo. Considera **principal + parceiras** do evento.
- Ordem por **empresa** (A–Z e Z–A) no seletor, nas duas visões; na lista, **coluna Empresa separada** com cabeçalho ordenável (escondida no celular).

## Revisão externa (agentes de código e de QA, 18/11/2026)

- Backlog em cards: com busca, cada grupo mostra **só os itens que batem** com a busca (igual à lista e ao contador). Decidido pelo Claude na rodada anterior e aprovado depois pelo usuário; registrado aqui.
- Duração com 1 ou 2 dígitos vale como segundos ("45" → 00:45).
- Paleta de cores das empresas **sem o dourado** (o `#f5c542` sai; entra um verde-limão).
- Cor de destaque **vai no backup** (como já estava combinado na etapa 1); restaurar aplica a cor.
- Backlog: luta repetida (mesmo evento, tipo e lados) mostra **aviso com "Adicionar mesmo assim"**.
- Visualização: data **no futuro é bloqueada**; data **anterior ao evento só avisa** (pede confirmação ao salvar).
- Busca da Biblioteca também encontra o **método de vitória**.
- Página não encontrada sem o texto de "Em construção".
- Equipe com mais membros que o tipo permite: preenche **até o limite** e avisa quem ficou de fora.
- Destaques 4.50+: desempate entre notas iguais pela **visualização mais recente**.
- Excel: nota 0 sai como **DUD** (texto).
- App atualizado: a versão nova só assume quando todas as janelas do app fecharem (evita falha nos gráficos/Excel com o app aberto).

## Cores por faixa de nota (18/11/2026)

- A nota ganha **cor por faixa**, fixa (não muda com a cor de destaque), paleta "frio → quente": 0–0.75 cinza `#8b93a7` · 1–1.75 vermelho `#f87171` · 2–2.75 rosa `#f472b6` · 3–3.75 roxo `#a78bfa` · 4–4.75 azul-ciano `#38bdf8` · **5.00 dourado**.
- **Brilho dourado só no 5.00**, em todo o app. De 4.50 a 4.75 a nota deixa de ser dourada (fica na faixa 4).
- A cor da faixa vai no **número da nota**, nas **estrelinhas** e nas **barras do gráfico de distribuição** dos Dashboards. Médias (Dashboards, wrestler, ranking) usam a faixa da média (ex.: 4.83 → faixa 4).
- Continua igual: seção de destaques lista 4.50+ (título dourado); borda girando, selo, fundo dourado da linha e contagem de 5★ só pro 5★.
- Detalhes do Claude: no ranking, a barra fica dourada só com média 5.00 (as outras seguem no neon); no Início, a borda dourada da linha passou a valer só pro 5.00.

## Importar evento do Cagematch (18/11/2026)

- Entrada: **colar o link do evento** no app. O app chama uma função no **Cloudflare Workers** (pasta `worker/`), que busca a página, resolve o desafio anti-robô do Cagematch (Sucuri) e devolve o HTML; a leitura das lutas é feita no app. O app continua no GitHub Pages. Contornar o desafio foi autorizado pelo usuário.
- Worker: só aceita páginas de evento (`id=1`) do cagematch.net, só responde ao endereço do app e ao localhost, guarda a página em cache por 1 hora.
- Lutas importadas vão pro **Backlog** (um item de luta por match).
- Wrestler que não existe é **criado na hora**, com a **empresa do evento**; o **número do Cagematch** fica guardado no wrestler pra reconhecer nas próximas importações.
- Equipes: **liga à equipe existente pelo nome ou cria** com os membros da luta. Lado com mais de uma equipe junta fica só com os wrestlers.
- Tipo de match deduzido pela **quantidade de lados e de wrestlers**; quando não encaixar, o usuário escolhe na revisão.
- Títulos e estipulações: reconhecidos pelo nome; o que não for reconhecido o usuário **escolhe ou cria na tela de revisão**.
- Evento criado se não existir (nome, data, empresa); empresa reconhecida pelo nome completo ou sigla.
- Vencedor, duração e título ficam **guardados escondidos** no item do Backlog (sem spoiler) e só preenchem o formulário no "Assisti". Método de vitória fica em branco (o Cagematch não mostra).
- Tela: botão **"Do Cagematch"** na barra do Backlog abre um painel: colar o link → revisão → "Adicionar N lutas ao Backlog". Repetidas (já no Backlog ou já assistidas) vêm **desmarcadas** com aviso.
- Detalhes do Claude: dark matches vêm desmarcadas; títulos e estipulações não reconhecidos aparecem uma vez cada ("Escolha…" obrigatório: criar, não registrar/ignorar ou usar um cadastrado); "Title" e "Championship" contam como o mesmo título; wrestler novo pode ser ligado a um cadastrado com outro nome (o número do Cagematch passa pra ele); wrestler com mesmo nome de um cadastrado é ligado sozinho; empresa nova (se a do evento não existir) vem com sigla sugerida e cor cinza, editáveis; método de vitória é preenchido quando o Cagematch escreve "by DQ", "by Count Out" etc.

## Escolhas do Claude aprovadas (rodada final, 18/11/2026)

O usuário aprovou tudo o que já vinha usando e pediu que, daqui pra frente, o Claude faça a validação (funcional e visual) sem rodada de revisão dele. Lista que estava no CLAUDE.md:

- **Etapa 6 · Dashboards.** Olhar: a tela inteira, os filtros de ano e empresa, o mínimo do ranking, as setas do calendário, o dourado nos destaques e a troca de cor de destaque. Escolhas do Claude: linha de números no topo (lutas, nota média, 5★, wrestlers diferentes); contagem de 5★ e barras de 4.50+ da distribuição em dourado; ranking mostra 25 e destaques 12, com "Mostrar todos"; com ano escolhido some "Lutas por ano", com empresa escolhida some "Nota média por empresa".
- **Etapa 7 · Dados.** Olhar: a tela Dados (três cartões), a faixa do lembrete (aparece com 7 dias sem backup; o ✕ esconde até amanhã), o diálogo de confirmação ao restaurar e a planilha exportada no Excel. Escolhas do Claude: item "Dados" no fim do menu; "Último backup" fica vermelho com 7 dias ou mais; o backup leva também os registros excluídos (pra fase 2); restaurar recarrega o app e conta como backup feito; nomes dos arquivos `catalogo-pro-wrestling-backup-AAAA-MM-DD.json` e `catalogo-pro-wrestling-AAAA-MM-DD.xlsx`; na planilha, as lutas vão em ordem de data do evento e as visualizações em ordem de data.
- **Etapa 8 · Publicação.** Olhar: ícone do app no Dock/Launchpad (estrela ciano em fundo escuro, mesmo do favicon) e o nome curto "Pro Wrestling" na janela. Escolha do Claude: nome curto e ícone.
- **Etapa 9 · Importação.** Olhar: Biblioteca, Backlog e Dashboards com os dados reais; nomes de eventos, wrestlers e cores das empresas. As 4 lutas do WrestleDream 2025 sem nota estão no Backlog (usar "Assisti" se foram vistas); métodos de vitória das lutas importadas estão em branco.
- **Revisão · Cards ou lista** (pedido do usuário, feito em 17/11/2026). Olhar: o alternador (ícones de quadradinhos e linhas) na Biblioteca, no Backlog, na página do wrestler e nos destaques dos Dashboards; a tabela no computador e no celular. Escolhas do Claude: ícones do alternador; linha de 5★ com leve fundo dourado e nota dourada a partir de 4.50; faixa na cor da empresa no começo da linha; cabeçalho da tabela fica fixo ao rolar; o seletor de ordem ganhou as ordens por texto (Confronto, Empresa, Evento, Tipo, A–Z e Z–A) e "Assistidas há mais tempo"; no Backlog em cards, o seletor só mostra as ordens que funcionam agrupadas (se estava por Confronto/Tipo, volta pra "Adicionados por último"); no celular do Backlog, o nome do evento aparece embaixo do confronto; editar no Backlog em lista é o ícone ✎.
- **Revisão · Empresa no Backlog** (pedido do usuário, feito em 17/11/2026). Olhar: botão "Filtros" e painel com Empresa no Backlog, chip do filtro ativo, coluna Empresa na lista, ordens "Empresa (A–Z/Z–A)". Escolhas do Claude: dentro da mesma empresa, evento mais recente primeiro; com busca ou filtro, o contador mostra "N de M itens"; na visão em cards, cada grupo mostra só os itens que batem com a busca (antes mostrava o evento todo — corrigido pra bater com a lista e o contador); no celular, a barra do Backlog ficou em 3 linhas.
- **Revisão externa (18/11/2026).** Dois agentes (revisão de código e QA funcional) acharam 13 problemas; todos corrigidos e retestados (29 testes de regressão + offline), mais 8 sugestões aprovadas pelo usuário (ver DECISOES › Revisão externa). Olhar: aviso de luta repetida no Backlog, aviso de data anterior ao evento, aviso de equipe maior que o lado, cor de destaque voltando junto ao restaurar backup, nova cor verde-limão na paleta das empresas.
- **Revisão · Cores por faixa de nota** (pedido do usuário, feito em 18/11/2026). Olhar: cor da nota e das estrelas em cards, lista, detalhe, histórico, formulário, Início, página do wrestler, ranking e números dos Dashboards; barras do gráfico de distribuição; brilho só no 5.00. Escolhas do Claude: barra do ranking dourada só com média 5.00; borda dourada da linha no Início só no 5.00.
- **Revisão · Importar do Cagematch** (pedido do usuário, feito em 18/11/2026; **validado pelo usuário em 18/11/2026**). Olhar: botão "Do Cagematch" no Backlog, painel de revisão (evento, não reconhecidos, lutas com tipo, wrestlers novos com ligação a cadastrados, equipes), itens no Backlog sem spoiler e o "Assisti" já com vencedor, título e duração. Escolhas do Claude: ver DECISOES › Importar evento do Cagematch (detalhes do Claude).

## Fase 2 · Sincronização entre Mac e iPhone (18/11/2026)

- Em vez de "importar e mesclar" manual, **sincronização automática pelo Cloudflare** (Workers + banco D1). O backup JSON continua existindo.
- Proteção por **chave secreta**: o app gera no primeiro aparelho; o usuário copia e cola uma vez no outro. A chave vai no backup JSON (recupera o acesso se perder os aparelhos).
- **Imagens sincronizam** junto com os dados.
- Mesmo registro editado nos dois aparelhos: vale a **edição mais recente** (exclusão conta como edição).
- **Possíveis duplicados** (registrados em aparelhos diferentes antes de sincronizar): lutas (mesmo evento, tipo e lados) e cadastros (mesmo nome; evento = nome + data). As duas cópias ficam; aviso "Possíveis duplicados (N)" na tela Dados. **O usuário escolhe qual fica**; o outro é excluído e tudo que apontava pra ele passa pro que ficou (lutas: as visualizações viram uma luta só). "Manter os dois" também é opção.
- **Cor de destaque igual** nos dois aparelhos (sincroniza).
- **Lembrete de 7 dias sem backup continua só no Mac** (não aparece no iPhone).
- Sincroniza **automaticamente** (ao abrir, alguns segundos depois de cada alteração, quando a internet volta) com **indicador discreto no topo**; "Sincronizar agora" na tela Dados.
- **Restaurar backup** com a sincronização ligada **substitui em todo lugar** (aparelho, nuvem e, na próxima sincronização, o outro aparelho). O diálogo de confirmação avisa.
- Detalhes do Claude: ícone de nuvem no topo (antes das cores) com uma bolinha de situação (verde = sincronizado, neon piscando = sincronizando, cinza = sem conexão, âmbar = problema), que leva à tela Dados; na tela Dados, os cartões "Sincronização" e "Possíveis duplicados" ficam no alto, na largura toda (duplicados só aparece quando existe algum); a chave tem 43 caracteres, aparece em "Mostrar chave" com botão Copiar e também pode ser lida de um arquivo de backup; sincroniza 4 s depois de cada alteração, ao voltar pro app, quando a internet volta e a cada 1 min com o app aberto; chegou coisa de outro aparelho, a tela atual se redesenha (menos formulários e painéis abertos, pra não perder o que está sendo digitado); ao ligar, o que já existia no aparelho fica marcado como "criado neste aparelho"; imagem trocada ou removida de um cadastro some do cadastro nos dois aparelhos, mas o arquivo antigo fica guardado no outro (sem efeito visível); no celular, o menu do topo ganhou um esmaecido na borda direita (substituído pelo menu ☰ no mesmo dia).

## Navegação no celular (18/11/2026)

- No celular (até 720px), o menu vira um botão **☰ no topo** que abre a lista com todas as telas. No Mac continua a barra de sempre.
- Detalhes do Claude: o ☰ fica à esquerda do logo e vira ✕ quando aberto; a lista desce do topo na largura toda, com a tela atual marcada por uma barra lateral e "Nova luta" como botão; fecha ao escolher uma tela, ao tocar fora ou com Esc; o nome "Catálogo Pro Wrestling" volta a aparecer no topo do celular (some só em telas com 360px ou menos); sai o esmaecido do menu que rolava pro lado.

## Textos (18/11/2026)

- Resultado no Início: **"Venceu:"** (não "Vence:"): a luta já aconteceu, "vence" parece previsão.
