// js/manualServidores.js - Conteúdo do Manual do Usuário para o Módulo de Servidores
// v1.2.0 - Adiciona seção sobre a importância do Servidor como identidade do usuário e para o novo Menu de Usuário.
// v1.1 - Adiciona menção aos e-mails relacionados na tela de visualização.
// v1.0 - Conteúdo detalhado para Servidores, Grupos de Servidores e Calendário de Ausências.

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ManualConteudo = window.SEFWorkStation.ManualConteudo || {};

window.SEFWorkStation.ManualConteudo.Servidores = {
    idSecaoDOM: "manual-modulo-servidores",
    tituloSecaoDisplay: "5. Módulo de Servidores", // Ajustar numeração conforme necessário
    anchorText: "Módulo Servidores",
    subsecoes: [
        {
            idSubSecaoDOM: "serv-visao-geral",
            tituloSubsecaoDisplay: "5.1. Visão Geral do Módulo de Servidores",
            conteudoMarkdown: `
O Módulo de Servidores é projetado para gerenciar informações sobre os colaboradores ou membros da equipe que utilizam ou são referenciados dentro do SEFWorkStation. Ele permite não apenas cadastrar dados básicos, mas também organizar servidores em grupos e registrar seus períodos de ausência, como férias e licenças.

**Principais Funcionalidades Detalhadas:**

*   **Identidade do Usuário no Sistema:**
    *   Um registro no Módulo de Servidores representa um **usuário** dentro da aplicação. Para que funcionalidades como "Meu Perfil", "Minhas Tarefas" e o sistema de **Compartilhamento** funcionem corretamente, cada pessoa que utiliza a aplicação deve ter um cadastro como servidor.
    *   **Configuração Obrigatória:** Após se cadastrar, cada usuário deve ir em **Configurações > Identidade e Compartilhamento** e selecionar seu próprio nome no campo "Usuário Atual da Aplicação". Somente após essa configuração o Menu de Usuário aparecerá no cabeçalho e você poderá enviar e receber itens compartilhados.

*   **Cadastro de Servidores:**
    *   Registre informações detalhadas para cada servidor, incluindo Nome Completo, Matrícula/ID Funcional (que pode ser gerado automaticamente ou informado manualmente), Setor/Lotação, E-mail, Cargo/Função, Telefone e Área de Atuação.
    *   Defina o Status Atual do servidor (ex: Ativo, Inativo, Férias, Licença, Desligado).
    *   Adicione observações gerais sobre o servidor.

*   **Histórico de Status e Períodos de Ausência:**
    *   Mantenha um registro de todos os períodos de ausência de um servidor, como Férias Regulamentares, Férias Prêmio, Licenças diversas, Afastamentos, etc.
    *   Para cada período, registre a Data de Início, Data de Fim (opcional, se for um período aberto ou de um único dia), o Tipo de Ausência e Observações.
    *   Este histórico é crucial para o planejamento e para a funcionalidade do Calendário de Ausências.

*   **Dias de Trabalho Remoto:**
    *   Configure para cada servidor quais dias da semana ele habitualmente realiza trabalho remoto (teletrabalho).
    *   Esta informação pode ser usada em relatórios ou para visualização no Dashboard.

*   **Grupos de Servidores:**
    *   Crie e gerencie grupos de servidores (ex: "Equipe Fiscalização ICMS", "Setor de TI", "Comissão de Análise de Processos").
    *   Adicione servidores cadastrados como membros a um ou mais grupos.
    *   É possível também adicionar e-mails avulsos a um grupo, para destinatários que não são servidores cadastrados no sistema, mas que precisam receber comunicações destinadas ao grupo.
    *   Grupos podem ser úteis para atribuição de tarefas em lote (se implementado), envio de e-mails para equipes, ou para filtros em relatórios.

*   **Calendário de Ausências:**
    *   Uma visualização em formato de calendário que exibe todos os períodos de ausência registrados para os servidores.
    *   Permite filtros por servidor específico ou por tipo de ausência.
    *   Facilita o planejamento de atividades, a visualização de disponibilidade da equipe e a gestão de substituições.

*   **Vínculos com Outras Entidades:**
    *   Servidores podem ser vinculados como responsáveis ou envolvidos em:
        *   Documentos
        *   Tarefas (um servidor é geralmente o "Responsável Principal" por uma tarefa)
        *   Notas Rápidas
        *   Processos (Protocolos, PTAs, Autuações)
        *   **E-mails:** Quando um servidor cadastrado é destinatário de um e-mail gerado pelo Módulo de Comunicação, esse e-mail é automaticamente vinculado ao seu perfil.
    *   Esses vínculos ajudam a rastrear a participação e responsabilidade dos servidores nas diversas atividades gerenciadas pelo sistema.

*   **Lixeira:**
    *   Servidores excluídos são movidos para a Lixeira Global, de onde podem ser restaurados ou excluídos permanentemente.

**Acesso às Funcionalidades do Módulo de Servidores (Menu Principal "Servidores"):**
*   **Novo Servidor:** Abre o formulário para cadastrar um novo servidor.
*   **Gerir Servidores:** Exibe a lista de todos os servidores cadastrados, com opções de busca, filtro e ações.
*   **Gerir Grupos de Servidores:** Interface para criar, editar, visualizar e excluir grupos de servidores, além de gerenciar seus membros.
*   **Calendário de Ausências:** Apresenta a visualização em calendário dos períodos de ausência dos servidores.
`
        },
        {
            idSubSecaoDOM: "serv-identidade-usuario",
            tituloSubsecaoDisplay: "5.2. A Importância do Servidor como Identidade do Usuário",
            conteudoMarkdown: `
No SEFWorkStation, o cadastro de um servidor vai além de um simples registro de contato; ele **define a identidade de um usuário** dentro da aplicação. Para que funcionalidades personalizadas e de colaboração funcionem corretamente, é **essencial** que cada pessoa que utiliza a aplicação tenha seu próprio cadastro como servidor e o defina como seu usuário atual.

**Passos Essenciais para Configurar sua Identidade:**

1.  **Cadastre-se como Servidor:**
    *   Se você ainda não o fez, a primeira etapa é ir em **Servidores > Novo Servidor** e criar um registro com suas próprias informações (Nome, Matrícula, E-mail, etc.).
    *   Certifique-se de que seu status esteja como **"Ativo"**.

2.  **Defina seu Usuário nas Configurações:**
    *   Após se cadastrar, vá até **Configurações**.
    *   Na seção "Identidade e Compartilhamento", localize o menu suspenso **"Usuário Atual da Aplicação"**.
    *   Selecione o seu nome na lista.
    *   Role até o final da página e clique em **"Salvar Todas as Preferências"**.

**Impacto da Configuração da Identidade:**

Uma vez que sua identidade de usuário está definida:

*   **Menu de Usuário:** O seu nome (ou primeiro nome) aparecerá no canto superior direito do cabeçalho. Clicar nele abrirá um menu com atalhos personalizados:
    *   **Meu Perfil:** Leva diretamente para a tela de visualização do seu próprio cadastro de servidor.
    *   **Minhas Tarefas:** Abre uma visualização da lista de tarefas filtrada para mostrar apenas as tarefas pelas quais você é responsável.
    *   **Mudar de Usuário:** Um atalho que o leva diretamente para a opção de seleção de usuário na página de Configurações, caso precise alternar (por exemplo, em um computador compartilhado).
*   **Compartilhamento:** Você poderá enviar e receber itens compartilhados. O sistema usará seu perfil para identificá-lo como remetente e para mostrar itens que foram enviados especificamente para você.
*   **Atribuições e Responsabilidades:** Ao criar uma tarefa e selecionar um "Responsável", o sistema estará vinculando a um registro de servidor específico.

Sem definir um usuário atual, muitas dessas funcionalidades personalizadas e colaborativas permanecerão desativadas ou não funcionarão como esperado.
`
        },
        {
            idSubSecaoDOM: "serv-cadastrar-editar",
            tituloSubsecaoDisplay: "5.3. Cadastrando e Editando Servidores",
            conteudoMarkdown: `
O cadastro de servidores é o ponto de partida para gerenciar sua equipe e suas atividades dentro do sistema.

**Para Cadastrar um Novo Servidor:**
1.  No menu principal, navegue até **Servidores > Novo Servidor**.
2.  Preencha os campos:
    *   **Nome Completo:** \`[Obrigatório]\` Nome do servidor.
    *   **Matrícula/ID Funcional:** \`[Obrigatório]\` Identificador único do servidor na organização. Se deixado em branco, o sistema pode tentar gerar um automaticamente (ex: \`SERV-00001\`) ou você pode informar um valor. O sistema verificará a unicidade.
    *   **Setor/Lotação:** \`[Obrigatório]\` Unidade administrativa onde o servidor está lotado ou exerce suas funções.
    *   **E-mail:** \`[Obrigatório]\` Endereço de e-mail principal do servidor. Validado para formato básico. Este e-mail é fundamental para as funcionalidades de notificação e compartilhamento.
    *   **Cargo/Função:** (Opcional) Cargo ou função principal desempenhada pelo servidor.
    *   **Telefone:** (Opcional) Número de telefone de contato.
    *   **Status Atual:** (Padrão: "Ativo") Selecione o status atual do servidor na lista (Ativo, Inativo, Férias, Licença, etc.).
    *   **Área de Atuação:** (Opcional) Campo de texto para descrever a área de especialização ou atuação principal do servidor (ex: "Fiscalização de Substituição Tributária", "Desenvolvimento de Sistemas", "Análise Jurídica Contenciosa").
    *   **Dias de Trabalho Remoto:** Marque as caixas de seleção para os dias da semana em que o servidor habitualmente trabalha remotamente.
    *   **Observações:** (Opcional) Campo para quaisquer notas ou informações adicionais sobre o servidor.
    *   **Histórico de Status e Ausências:**
        *   Clique em "**Adicionar Período de Ausência**" para registrar um novo período.
        *   Para cada período, informe:
            *   **Data de Início:** \`[Obrigatório]\`
            *   **Data de Fim:** (Opcional) Deixe em branco se for um período em aberto ou um evento de um único dia (neste caso, o sistema considera o próprio dia de início como o dia do evento).
            *   **Tipo de Ausência:** \`[Obrigatório]\` Selecione na lista (Férias Regulamentares, Férias Prêmio, Licença, Afastado, Outro).
            *   **Observação:** (Opcional) Detalhes sobre a ausência.
        *   Você pode adicionar múltiplos períodos. Use o botão "**×**" para remover um período adicionado por engano.
    *   **Vincular a Outras Entidades:** Permite associar o servidor a Documentos, Tarefas (onde ele pode ser o responsável ou apenas envolvido), Notas Rápidas, Protocolos, PTAs e Autuações.
        *   Clique em "Gerenciar Vínculos" para cada tipo de entidade para abrir um modal de seleção.
3.  **Ações no final do formulário:**
    *   **Cancelar:** Descarta o novo cadastro.
    *   **Salvar Servidor:** Salva o novo servidor e geralmente navega para sua tela de visualização.

**Para Editar um Servidor Existente:**
1.  Vá em **Servidores > Gerir Servidores**.
2.  Localize o servidor na lista (use a busca ou filtros).
3.  Clique no ícone de **lápis (✏️ Editar)** na linha do servidor.
4.  O formulário será aberto com os dados preenchidos. Faça as alterações.
    *   A matrícula, uma vez salva, geralmente não pode ser alterada para manter a integridade referencial.
5.  Clique em **"Atualizar Servidor"**.

**Importante:**
*   Manter o status e os períodos de ausência atualizados é fundamental para a precisão do Calendário de Ausências e para o planejamento de atividades que dependem da disponibilidade do servidor.
*   O campo "Servidor Responsável" em Tarefas, Protocolos, PTAs e Autuações geralmente se refere ao servidor principal designado para aquela atividade/processo, enquanto a seção de "Vínculos" no cadastro do servidor pode indicar outros envolvimentos.
`
        },
        {
            idSubSecaoDOM: "serv-grupos",
            tituloSubsecaoDisplay: "5.4. Gerenciando Grupos de Servidores",
            conteudoMarkdown: `
Grupos de Servidores permitem organizar colaboradores em equipes, setores, comissões ou qualquer outra agregação lógica que faça sentido para o seu trabalho. Isso facilita a comunicação e, potencialmente, a atribuição de responsabilidades em grupo.

**Acesso à Gestão de Grupos:**
*   No menu principal, navegue até **Servidores > Gerir Grupos de Servidores**.

**Funcionalidades da Página "Gerir Grupos de Servidores":**

*   **Listagem de Grupos Existentes:**
    *   Todos os grupos criados são exibidos em uma tabela, mostrando: Nome do Grupo, Descrição (parcial), Quantidade de Servidores Membros e Quantidade de Outros E-mails (avulsos).
    *   A lista é ordenável clicando nos cabeçalhos das colunas.

*   **Criar Novo Grupo:**
    *   Clique no botão "**Novo Grupo**" no canto superior direito da página.
    *   O formulário de criação de grupo será exibido.

*   **Formulário de Criação/Edição de Grupo:**
    *   **Nome do Grupo:** \`[Obrigatório]\` Um nome único e descritivo para o grupo (ex: "Equipe de Auditoria Externa", "Núcleo de Suporte Técnico").
    *   **Descrição (Opcional):** Um breve texto explicando o propósito ou composição do grupo.
    *   **Membros do Grupo:**
        *   Clique no botão "**Adicionar/Remover Membros**".
        *   Uma janela modal será aberta, permitindo:
            *   **Buscar Servidores Cadastrados:** Um campo de busca filtra a lista de todos os servidores ativos e com e-mail cadastrado no sistema. Marque as caixas de seleção ao lado dos servidores que deseja adicionar ao grupo.
            *   **Adicionar E-mail Avulso:** Um campo para digitar endereços de e-mail de pessoas que não são servidores cadastrados no SEFWorkStation, mas que precisam fazer parte deste grupo de comunicação (ex: consultores externos, contatos de outras instituições).
            *   **Membros Selecionados:** A modal exibirá uma lista dos servidores e e-mails avulsos já adicionados ao grupo no modal.
        *   Clique em "Confirmar Membros" no modal para aplicar as seleções ao grupo.
        *   Os membros selecionados (servidores e e-mails avulsos) aparecerão listados no formulário principal do grupo. Você pode remover membros individuais clicando no "X" ao lado de cada um.
    *   **Salvar/Atualizar:** Clique para salvar o novo grupo ou as alterações em um grupo existente.

*   **Ações na Lista de Grupos:**
    *   **Visualizar (👁️):** Abre uma tela que exibe os detalhes do grupo, incluindo o nome, descrição e a lista completa de membros servidores e e-mails avulsos.
    *   **Editar (✏️):** Abre o formulário preenchido com os dados do grupo para modificação.
    *   **Excluir (🗑️):** Move o grupo para a Lixeira Global. Isso não exclui os servidores membros, apenas o agrupamento em si.

**Utilidade dos Grupos:**
*   **Comunicação:** Ao usar o Módulo de Comunicação para escrever um novo e-mail, você poderá selecionar um Grupo de Servidores como destinatário. O e-mail será então endereçado para todos os servidores membros (que tenham e-mail cadastrado) e para todos os e-mails avulsos listados no grupo.
*   **Organização e Delegação:** Facilita a visualização de equipes e pode ser usado como referência ao delegar tarefas ou processos (embora a atribuição direta de tarefas/processos a grupos inteiros possa depender de implementações futuras).
`
        },
        {
            idSubSecaoDOM: "serv-calendario-ausencias",
            tituloSubsecaoDisplay: "5.5. Calendário de Ausências",
            conteudoMarkdown: `
O Calendário de Ausências oferece uma visão consolidada de todos os períodos de férias, licenças e outros afastamentos registrados para os servidores. É uma ferramenta essencial para planejamento e gestão da disponibilidade da equipe.

**Acesso ao Calendário:**
*   No menu principal, navegue até **Servidores > Calendário de Ausências**.

**Funcionalidades do Calendário:**

*   **Visualização:**
    *   O calendário é exibido no formato mensal por padrão (\`dayGridMonth\`), mas você pode alternar para visualizações de semana (\`timeGridWeek\`, \`listWeek\`) ou dia (\`timeGridDay\`) usando os botões no cabeçalho do calendário.
    *   Cada período de ausência de um servidor é representado como um evento no calendário.
    *   **Cores dos Eventos:** As ausências são coloridas de acordo com o tipo para fácil distinção:
        *   Férias Regulamentares: Azul
        *   Férias Prêmio: Azul-petróleo (Teal)
        *   Licença: Vermelho
        *   Afastado: Laranja
        *   Outro: Cinza
    *   **Eventos "All-Day":** As ausências são tratadas como eventos de dia inteiro. Se um período não tiver data de fim, ele pode ser exibido como um evento de um único dia (o dia de início) ou se estender visualmente dependendo da configuração do calendário.

*   **Navegação:**
    *   Use os botões **"Anterior" (ᐊ)** e **"Próximo" (ᐅ)** no cabeçalho do calendário para navegar entre meses, semanas ou dias.
    *   O botão **"Hoje"** retorna o calendário para a data atual.

*   **Filtros (acima do calendário):**
    *   **Servidor:** Um menu suspenso permite selecionar um servidor específico para ver apenas as suas ausências. Selecione "Todos" para ver as ausências de todos os servidores.
    *   **Tipo de Ausência:** Um menu suspenso permite filtrar por um tipo específico de ausência (ex: mostrar apenas "Férias Regulamentares"). Selecione "Todos" para ver todos os tipos.
    *   Após selecionar os filtros, clique em "**Aplicar Filtros**".
    *   Clique em "**Limpar Filtros**" para remover os filtros aplicados e mostrar todas as ausências.

*   **Detalhes do Evento (Tooltip):**
    *   Ao passar o mouse sobre um evento de ausência no calendário, um "tooltip" (pequena caixa de informação) aparecerá mostrando:
        *   Tipo de Ausência.
        *   Matrícula do Servidor.
        *   Observação (se houver alguma registrada para aquele período de ausência).

*   **Clicar em um Evento:**
    *   Clicar em um evento de ausência no calendário geralmente navegará para a tela de **visualização detalhada do servidor** correspondente, permitindo que você veja todas as informações daquele servidor, incluindo seu histórico completo de ausências e outras informações cadastrais.

**Importância do Calendário:**
*   **Planejamento de Equipe:** Veja rapidamente quem estará ausente e quando, facilitando a distribuição de tarefas e o planejamento de substituições.
*   **Gestão de Férias e Licenças:** Acompanhe os períodos de férias e licenças de toda a equipe.
*   **Evitar Conflitos:** Ajuda a identificar possíveis conflitos de agenda ou períodos com muitos servidores ausentes simultaneamente.

**Notas:**
*   Para que as ausências apareçam corretamente no calendário, é fundamental que os "Períodos de Ausência" sejam registrados corretamente no cadastro de cada servidor (em "Servidores > Gerir Servidores > Editar Servidor").
*   Servidores com status "Desligado" ou "Inativo" geralmente não terão suas ausências futuras exibidas, ou podem ser filtrados por padrão, dependendo da implementação. A lógica principal foca em servidores ativos.
*   O calendário não permite a edição direta dos períodos de ausência (arrastar e soltar eventos). Para modificar um período de ausência, você deve editar o cadastro do servidor correspondente.
`
        }
    ]
};