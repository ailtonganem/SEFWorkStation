// js/manualTarefas.js - Conteúdo do Manual do Usuário para o Módulo de Tarefas
// v1.1 - Adiciona menção e detalhe sobre a view "Minhas Tarefas".
// v1.0 - Conteúdo detalhado para o Módulo de Tarefas.

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ManualConteudo = window.SEFWorkStation.ManualConteudo || {};

window.SEFWorkStation.ManualConteudo.Tarefas = {
    idSecaoDOM: "manual-modulo-tarefas",
    tituloSecaoDisplay: "7. Módulo de Tarefas", // Ajustar numeração conforme necessário
    anchorText: "Módulo Tarefas",
    subsecoes: [
        {
            idSubSecaoDOM: "tarefas-visao-geral",
            tituloSubsecaoDisplay: "7.1. Visão Geral do Módulo de Tarefas",
            conteudoMarkdown: `
O Módulo de Tarefas do SEFWorkStation é uma ferramenta completa para ajudá-lo a organizar, priorizar e acompanhar todas as suas atividades e pendências. Ele permite que você não apenas liste suas tarefas, mas também defina detalhes importantes, prazos e visualize seu progresso de diferentes maneiras.

**Principais Funcionalidades Detalhadas:**

*   **Criação de Tarefas Detalhadas:**
    *   **Título:** Um nome conciso e claro para a tarefa.
    *   **Descrição Detalhada:** Um campo de texto rico (utilizando o editor Quill.js com opções completas de formatação, similar ao editor de documentos) para adicionar todos os detalhes, instruções, contextos ou informações necessárias para a execução da tarefa.
    *   **Subtarefas:** Quebre tarefas complexas em passos menores e gerenciáveis. Cada subtarefa pode ser marcada como concluída individualmente.
    *   **Status:** Acompanhe o progresso da tarefa com status como "Pendente", "Em Andamento", "Concluída", "Cancelada", "Aguardando Terceiros".
    *   **Prioridade:** Defina a urgência da tarefa (Baixa, Média, Alta, Urgente) para ajudar na organização.
    *   **Data de Vencimento (Prazo):** Estabeleça uma data limite para a conclusão da tarefa. Prazos vencidos ou próximos são destacados visualmente.
    *   **Responsável (Servidor):** Atribua a tarefa a um servidor específico cadastrado no sistema.
    *   **Tags:** Utilize tags para categorizar ou agrupar tarefas por projeto, tipo de atividade, cliente, etc. (Ex: \`Projeto Beta\`, \`Urgente Fiscal\`, \`Reunião\`).
    *   **Anexos:** Anexe arquivos relevantes diretamente à tarefa (ex: documentos de referência, planilhas de apoio).

*   **Gerenciamento Flexível:**
    *   **Listagem de Tarefas:** Visualize todas as suas tarefas (ou as de um responsável específico) em uma tabela, com opções de filtro e ordenação.
    *   **"Minhas Tarefas":** Um atalho no **Menu de Usuário** (no cabeçalho) leva diretamente para a lista de tarefas já filtrada para mostrar apenas as tarefas pelas quais você (o usuário atual configurado) é o responsável.
    *   **Calendário de Tarefas:** Uma visualização em calendário que exibe as tarefas de acordo com suas datas de vencimento.

*   **Vínculos com Outras Entidades:**
    *   Associe tarefas a Documentos, Contribuintes, Recursos, Notas Rápidas e Processos (Protocolos, PTAs, Autuações), e até mesmo a outros Servidores (além do responsável principal).
    *   Isso cria um contexto claro para a tarefa e facilita o acesso a informações relacionadas.

*   **Lixeira:**
    *   Tarefas excluídas (marcadas como "isExcluida") são movidas para a Lixeira Global.

**Acesso às Funcionalidades do Módulo de Tarefas (Menu Principal "Tarefas"):**
*   **Nova Tarefa:** Abre o formulário completo para criar uma nova tarefa.
*   **Gerir Tarefas (Lista):** Exibe a visualização em tabela de todas as tarefas.
*   **Gerir Tarefas (Calendário):** Abre a visualização em calendário.
`
        },
        {
            idSubSecaoDOM: "tarefas-criar-editar",
            tituloSubsecaoDisplay: "7.2. Criando e Editando Tarefas",
            conteudoMarkdown: `
O formulário de tarefas permite um registro detalhado de suas atividades.

**Para Criar uma Nova Tarefa:**
1.  No menu principal, navegue até **Tarefas > Nova Tarefa**.
2.  O formulário de criação será exibido. Preencha os campos:
    *   **Título da Tarefa:** \`[Obrigatório]\` Um nome breve e objetivo para a tarefa.
    *   **Descrição Detalhada:** (Opcional) Utilize o editor de texto rico para adicionar todos os detalhes, instruções, links, ou qualquer informação relevante. Você pode formatar o texto, inserir listas, colar imagens, etc.
    *   **Status:** (Padrão: "Pendente") Selecione o estado atual da tarefa na lista:
        *   \`Pendente\`: A tarefa ainda não foi iniciada.
        *   \`Em Andamento\`: A tarefa está sendo executada.
        *   \`Concluída\`: A tarefa foi finalizada. Marcar como concluída geralmente registra a data de conclusão automaticamente.
        *   \`Cancelada\`: A tarefa não será mais realizada.
        *   \`Aguardando Terceiros\`: O progresso da tarefa depende de uma ação externa.
    *   **Prioridade:** (Padrão: "Média") Escolha o nível de urgência: Baixa, Média, Alta, Urgente.
    *   **Responsável (Servidor):** (Opcional) Selecione um servidor cadastrado na lista suspensa. Se a tarefa tem um responsável, o sistema pode verificar a disponibilidade dele para a data de vencimento.
    *   **Data de Vencimento (Prazo):** (Opcional) Use o seletor de data para definir o prazo final para a tarefa.
        *   **Aviso de Disponibilidade:** Se um responsável e uma data de vencimento forem selecionados, o sistema pode exibir um aviso caso o responsável tenha um período de ausência registrado que coincida com o prazo da tarefa.
    *   **Subtarefas:**
        *   Para adicionar uma subtarefa, digite sua descrição no campo "Descrição da nova subtarefa..." e clique em "**Adicionar Subtarefa**".
        *   Cada subtarefa adicionada aparecerá com uma caixa de seleção (para marcar como concluída) e um campo de texto para sua descrição (que pode ser editado diretamente).
        *   Use o botão "**×**" ao lado de uma subtarefa para removê-la.
    *   **Tags:** (Opcional) Digite tags relevantes (separadas por vírgula ou Enter) para categorizar a tarefa. Sugestões de tags existentes aparecerão.
    *   **Vincular a Outras Entidades:** (Opcional) Clique nos botões "Gerenciar Vínculos" para associar a tarefa a Documentos, Contribuintes, Recursos, Processos, outros Servidores ou Notas Rápidas.
    *   **Anexos:** (Opcional) Anexe arquivos relevantes para a execução da tarefa.
3.  **Ações no final do formulário:**
    *   **Cancelar:** Descarta a nova tarefa.
    *   **Salvar Tarefa:** Salva a tarefa e geralmente navega para sua tela de visualização.

**Para Editar uma Tarefa Existente:**
1.  Vá em **Tarefas > Gerir Tarefas (Lista)** ou **Tarefas > Gerir Tarefas (Calendário)**.
2.  Localize a tarefa desejada.
3.  Na lista, clique no ícone de **lápis (✏️ Editar)**. No calendário, você pode clicar no evento da tarefa e, na tela de visualização, clicar no botão "Editar".
4.  O formulário de edição será aberto.
5.  Faça as alterações necessárias nos campos.
6.  Clique em **"Atualizar Tarefa"**.
`
        },
        {
            idSubSecaoDOM: "tarefas-listagem",
            tituloSubsecaoDisplay: "7.3. Gerir Tarefas (Visualização em Lista)",
            conteudoMarkdown: `
A visualização em lista ("Gerir Tarefas (Lista)") é a principal forma de ver e interagir com múltiplas tarefas.

**Acesso:**
*   No menu principal, navegue até **Tarefas > Gerir Tarefas (Lista)**.

**Interface da Listagem:**

*   **Tabela de Tarefas:**
    *   Exibe as tarefas que não estão na lixeira.
    *   **Colunas:** Incluem uma caixa de seleção (para ações em lote), Título (com ID da tarefa), Status (com um dropdown para alteração rápida), Prioridade (com um badge colorido), Prazo (Data de Vencimento), Responsável e Ações.
    *   **Ordenação:** Clique nos cabeçalhos das colunas "Título", "Status", "Prioridade", "Prazo" para ordenar a lista ascendentemente ou descendentemente por aquele campo.
*   **Filtros (acima da tabela):**
    *   **Buscar por Termo:** Pesquisa no Título, Descrição, ID da Tarefa, Responsável e Tags.
    *   **Status:** Dropdown para filtrar por um status específico (Pendente, Em Andamento, etc.).
    *   **Prioridade:** Dropdown para filtrar por uma prioridade específica (Baixa, Média, Alta, Urgente).
    *   **Responsável:** Campo de texto para filtrar tarefas atribuídas a um responsável específico (digite o nome).
    *   **Tag:** Dropdown para filtrar tarefas que contenham uma tag específica.
    *   **Ordenar por (Dropdown adicional):** Oferece opções de ordenação mais granulares (ex: Mais Recentes, Prazo mais próximo).
    *   Clique em "**Aplicar Filtros**" para atualizar a lista. "**Limpar Filtros**" remove todos os critérios.
*   **Ações em Lote:**
    *   Selecione múltiplas tarefas usando as caixas de seleção. Uma barra de ações contextuais aparecerá, permitindo alterar status, prioridade ou mover para a lixeira em massa.
*   **"Minhas Tarefas":**
    *   Você pode acessar uma visão filtrada das suas tarefas de duas formas:
        1.  Clicando no **Menu de Usuário** (seu nome no cabeçalho) e selecionando "**Minhas Tarefas**".
        2.  Indo para "Gerir Tarefas (Lista)" e digitando seu próprio nome no filtro "Responsável".
    *   Esta visão mostra apenas as tarefas onde você foi definido como o "Responsável", facilitando o foco no seu trabalho.
`
        },
        {
            idSubSecaoDOM: "tarefas-calendario",
            tituloSubsecaoDisplay: "7.4. Gerir Tarefas (Visualização em Calendário)",
            conteudoMarkdown: `
O Calendário de Tarefas oferece uma perspectiva visual das suas atividades, organizadas por suas datas de vencimento.

**Acesso:**
*   No menu principal, navegue até **Tarefas > Gerir Tarefas (Calendário)**.

**Interface do Calendário:**

*   **Visualização Principal:**
    *   O calendário é exibido, por padrão, na visualização mensal (\`dayGridMonth\`).
    *   Tarefas que possuem uma "Data de Vencimento" são exibidas como eventos no dia correspondente.
    *   **Tarefas sem prazo não aparecem no calendário.**
*   **Controles do Cabeçalho do Calendário:**
    *   **Navegação:** Botões **"Anterior" (ᐊ)** e **"Próximo" (ᐅ)** para mudar o mês/semana/dia.
    *   **Hoje:** Botão para retornar rapidamente à data atual.
    *   **Seletores de Visualização:** Botões para alternar entre as visualizações de Mês, Semana, Dia ou Lista.
*   **Eventos (Tarefas no Calendário):**
    *   **Cor:** A cor de fundo do evento da tarefa geralmente reflete sua prioridade ou status (ex: tarefas vencidas em vermelho).
    *   **Arrastar e Soltar (Drag and Drop):**
        *   Você pode **alterar a data de vencimento** de uma tarefa simplesmente clicando e arrastando seu evento para uma nova data no calendário.
        *   Esta ação geralmente é permitida apenas para tarefas que **não** estão com status "Concluída" ou "Cancelada".
*   **Filtros (acima do calendário):**
    *   Permitem refinar quais tarefas são exibidas no calendário por Status, Prioridade e Responsável.

Lembre-se que apenas tarefas com uma "Data de Vencimento" definida aparecerão no calendário.
`
        }
    ]
};