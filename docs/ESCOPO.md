# Catálogo de Pro Wrestling · Escopo

## Objetivo

App web pessoal pra catalogar as lutas assistidas e o backlog, com nota na escala do Dave Meltzer, visual caprichado e dashboards.

## Cadastros

- **Empresas:** nome, sigla, cor e logo (anexo opcional)
- **Eventos:** nome, data, empresa principal (obrigatória, usada nos dashboards), empresas parceiras (opcional) e pôster (anexo opcional)
- **Wrestlers:** nome, empresa atual (opcional) e foto (anexo opcional)
- **Equipes:** nome, membros e imagem (anexo opcional). Vale pra tag teams, trios e stables de qualquer tamanho
- **Tipos de match:** definem o número de lados e de wrestlers por lado (Singles 1 contra 1, Tag Team 2 contra 2, Trios 3 contra 3, Triple Threat 3 lados de 1...), com botão pra adicionar lado ou wrestler nas lutas de tamanho variável
- **Estipulações:** No DQ, Ladder, Cage, Anarchy in the Arena... Uma luta pode ter mais de uma
- **Títulos:** nome, ligado a uma empresa
- **Plataformas:** onde assisti
- **Métodos de vitória:** lista editável com Pinfall, Submission, Count Out, Disqualification, Knockout e Referee Stoppage

## Registro de luta

- Evento (traz a empresa e a data do evento)
- Tipo e estipulações
- Lados. Em cada lado escolho wrestlers ou uma equipe. A equipe preenche os membros sozinha e dá pra editar. O seletor tem rolagem, busca e opção de criar o wrestler na hora
- Resultado: lado vencedor, Draw, Time Limit Draw ou No Contest
- Método de vitória
- Título em disputa (opcional)
- Duração (digitada por mim, a partir do Cagematch)
- Link (opcional) e observações
- **Visualizações:** cada vez que assisto fica registrada com data, nota e plataforma, formando um histórico. A nota vai de 0 a 5 em passos de 0,25, exibida em estrelas e no formato `****¼`, e o campo se chama apenas "Nota"

## Backlog

- O item pode ser uma luta (evento, tipo, estipulações e lados) ou um evento inteiro
- Sem prioridade e sem link
- Ao marcar "assisti" numa luta, abre o formulário completo já preenchido pra eu completar com resultado, nota, data e duração
- No caso do evento inteiro, registro as lutas uma a uma depois de assistir

## Telas

Início, Nova luta, Biblioteca (cards, filtros e busca), Página do wrestler, Dashboards, Backlog e Cadastros.

## Dashboards

- **Regras:** médias e rankings usam a nota mais recente de cada luta. Contagens de lutas assistidas e o calendário consideram só a primeira visualização
- Lutas por mês e por ano
- Nota média por empresa
- Ranking de wrestlers por nota média, com mínimo de lutas
- Distribuição das notas
- Lista de lutas 5 estrelas e acima de 4½
- Nota média por tipo de match
- Calendário de atividade
- Atraso entre a data do evento e a primeira visualização

## Visual

Só tema escuro por ora, com acentos neon ou dourados, cards na cor da empresa, tipografia forte e destaque especial pras lutas 5 estrelas. Nada com cara de planilha.

## Dados

- Salvos no navegador (IndexedDB, via Dexie.js), com as imagens anexadas incluídas
- Exportar e importar JSON como backup (imagens incluídas), com lembrete se eu ficar 7 dias sem exportar
- Exportar pra Excel com SheetJS
- Importação da planilha atual na etapa 9

## Ferramentas

Vite, HTML, CSS e JavaScript, Apache ECharts, SheetJS e Dexie.js. Código no GitHub, repositório público, publicado no GitHub Pages.

## Fases

- **Fase 1, Mac:** app instalado pelo Brave (Save and Share, Install page as app), com todos os cadastros, registro, backlog, dashboards e backup JSON. Depois, a importação da planilha (etapas 1 a 9 do CLAUDE.md)
- **Fase 2, iPhone (fora do trabalho atual):** instalação pelo Safari na tela de início e função "importar e mesclar" no Mac, com revisão dos possíveis duplicados. A modelagem da fase 1 não pode dificultá-la (IDs únicos globalmente)
