// js/ajudaConteudo.js
// v3.0 - REFORMULADO: Adiciona notas da versão 1.4 e inclui o Módulo ITCD na visão geral.
// v2.1.0 - CORRIGIDO: Remove objeto manualUsuario que causava conflito. Data da versão 1.3 corrigida.
// v1.3.1 - Adiciona detalhes sobre o novo menu de usuário às notas de versão.
// v1.3.0 - Adiciona notas da versão 1.3. Corrige versão 2.0 para 1.2.
// ... (histórico anterior)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.AjudaConteudo = {
    modulos: {
        idInterno: "visao-geral-modulos",
        titulo: "Visão Geral dos Módulos",
        lista: [
            {
                nome: "Documentos",
                idInterno: "modulo-documentos",
                descricao: "Crie, gerencie, edite e organize seus documentos. Utilize modelos, categorias, tags e realize buscas avançadas. Inclui criação de documentos em lote."
            },
            {
                nome: "Contribuintes",
                idInterno: "modulo-contribuintes",
                descricao: "Cadastre e gerencie informações detalhadas sobre contribuintes, incluindo contatos, endereços, categorias, tags e campos personalizados. Vincule-os a documentos e processos."
            },
            {
                nome: "Processos",
                idInterno: "modulo-processos",
                descricao: "Gerencie Protocolos, PTAs (Processos Tributários Administrativos) e Autuações. Registre andamentos, vincule documentos e contribuintes, e acompanhe o status."
            },
            {
                nome: "Servidores",
                idInterno: "modulo-servidores",
                descricao: "Cadastre e gerencie informações sobre servidores, seus grupos e ausências (férias, licenças)."
            },
            {
                nome: "ITCD",
                idInterno: "modulo-itcd",
                descricao: "Realize avaliações de bens (urbanos, rurais, semoventes) e efetue cálculos complexos do Imposto sobre Transmissão Causa Mortis e Doação (ITCD) conforme a legislação vigente."
            },
            {
                nome: "Comunicação",
                idInterno: "modulo-comunicacao",
                descricao: "Componha e gerencie e-mails, destinatários e grupos de destinatários para comunicação externa."
            },
            {
                nome: "Tarefas",
                idInterno: "modulo-tarefas",
                descricao: "Crie e gerencie suas tarefas, defina prioridades, prazos, responsáveis e acompanhe o progresso em formato de lista ou calendário."
            },
            {
                nome: "Notas Rápidas",
                idInterno: "modulo-notas-rapidas",
                descricao: "Crie notas rápidas para anotações ágeis, ideias ou lembretes, com suporte a Markdown e organização por tags e cores."
            },
            {
                nome: "Compartilhamento",
                idInterno: "modulo-compartilhamento",
                descricao: "Compartilhe itens com outros usuários e visualize itens recebidos através de uma pasta sincronizada."
            },
            {
                nome: "Utilidades",
                idInterno: "modulo-utilidades",
                descricao: "Ferramentas para backup e restauração da base de dados, lixeira global e outras funcionalidades administrativas."
            },
            {
                nome: "Configurações",
                idInterno: "modulo-configuracoes",
                descricao: "Personalize a aparência da aplicação, gerencie preferências de backup, e acesse informações sobre a versão."
            }
        ]
    },
    // Objeto 'manualUsuario' removido para evitar conflito com a referência direta ao manual completo.
    notasVersao: {
        idInterno: "notas-versao-principal",
        titulo: "Notas de Versão",
        versoes: [
            {
                versao: "1.4",
                data: "03/07/2025",
                novidades: [
                    "<strong>NOVO MÓDULO DE AJUDA:</strong> O sistema de Ajuda foi completamente reformulado. Agora inclui um manual do usuário detalhado e navegável, integrado diretamente na aplicação. A busca na ajuda agora cobre todo o conteúdo do manual.",
                    "<strong>INTRODUÇÃO AO MÓDULO ITCD:</strong> Adicionado o novo menu 'ITCD', preparando a estrutura para as futuras funcionalidades de cálculo e avaliação do imposto. *Funcionalidades detalhadas serão implementadas em etapas futuras.*"
                ],
                correcoes: [
                    "<strong>CONSISTÊNCIA DA INTERFACE:</strong> Várias telas de gerenciamento (listagens e formulários) foram ajustadas para remover a limitação de largura, aproveitando melhor o espaço em monitores largos.",
                    "<strong>MELHORIA DE USABILIDADE:</strong> Adicionados menus de contexto (acessíveis com o botão direito do mouse) em mais tabelas de listagem para acesso rápido às ações.",
                    "<strong>CORREÇÕES INTERNAS:</strong> Refatoração de código e correção de bugs menores para melhorar a estabilidade e o desempenho geral da aplicação."
                ]
            },
            {
                versao: "1.3",
                data: "16/06/2025",
                novidades: [
                    "<strong>NOVO MENU DE USUÁRIO:</strong> O nome do usuário no cabeçalho agora é um menu com atalhos para 'Meu Perfil' e 'Minhas Tarefas'.",
                    "<strong>NOVO MÓDULO DE DOSSIÊ DO CONTRIBUINTE:</strong> Ferramenta para gerar um relatório completo em HTML com todos os dados e vínculos de um contribuinte, pronto para impressão.",
                    "<strong>NOVO SISTEMA DE NOTIFICAÇÕES:</strong> Um novo ícone de sino (🔔) no cabeçalho alerta sobre prazos de Tarefas e Recursos que estão próximos de vencer ou já venceram.",
                    "<strong>NOVO GERENCIADOR CENTRAL DE ANEXOS:</strong> Uma nova tela em 'Utilidades' permite visualizar, buscar e gerenciar todos os anexos de todas as entidades do sistema em um único local.",
                    "<strong>HISTÓRICO DE VERSÕES:</strong> Documentos e Notas Rápidas agora salvam versões anteriores automaticamente ao serem editados, permitindo visualizar e restaurar estados passados."
                ],
                correcoes: [
                    "<strong>MELHORIA DE LAYOUT:</strong> Removida a limitação de largura (classe `page-section`) da maioria das telas de gerenciamento e visualização, aproveitando melhor o espaço em monitores largos.",
                    "<strong>MENUS DE CONTEXTO:</strong> Adicionado menu de contexto (acessível com o botão direito do mouse) às linhas das principais tabelas de listagem (Documentos, Contribuintes, Tarefas, etc.) para acesso rápido às ações.",
                    "<strong>MELHORIA DE NAVEGAÇÃO:</strong> Centralização das configurações e ações do usuário no novo menu de perfil para uma navegação mais intuitiva.",
                    "<strong>ESTABILIDADE E DESEMPENHO:</strong> Correções gerais na inicialização de módulos e gerenciamento de dependências para melhorar a robustez e a velocidade da aplicação."
                ]
            },
            {
                versao: "1.2",
                data: "10/06/2025",
                novidades: [
                    "<strong>NOVO MÓDULO DE SERVIDORES:</strong> Cadastre servidores, seus grupos e gerencie um calendário de ausências.",
                    "<strong>NOVO MÓDULO DE PROCESSOS:</strong> Gerencie Protocolos, PTAs (Processos Tributários Administrativos) e Autuações com históricos e vínculos detalhados.",
                    "<strong>NOVO MÓDULO DE COMUNICAÇÃO:</strong> Componha e-mails, gerencie destinatários e grupos, e mantenha um histórico de e-mails gerados.",
                    "<strong>NOVO MÓDULO DE COMPARTILHAMENTO:</strong> Compartilhe itens com outros usuários do SEFWorkStation e gerencie os itens recebidos.",
                    "<strong>Estrutura Matriz/Filial:</strong> Implementada a funcionalidade de vincular contribuintes em uma estrutura hierárquica de matriz e filiais.",
                    "<strong>Vínculo de E-mails a Entidades:</strong> Agora, ao compor um e-mail, o sistema automaticamente vincula a mensagem aos registros de Contribuintes e Servidores destinatários.",
                    "<strong>Campo 'Inscrição Estadual':</strong> Adicionado o campo 'Inscrição Estadual' ao cadastro de contribuintes.",
                    "<strong>Botão 'Salvar e Novo':</strong> Adicionado ao formulário de 'Novo Contribuinte' para agilizar a criação de múltiplos registros em sequência."
                ],
                correcoes: [
                    "<strong>Criação de Tags/Categorias:</strong> Corrigido um bug crítico onde a criação de uma nova tag ou categoria no formulário de contribuinte causava o redirecionamento da página para o dashboard.",
                    "<strong>Busca de Matriz:</strong> Corrigida a funcionalidade de busca no campo de vínculo de matriz, que agora inclui a pesquisa por CNPJ e exibe a lista de sugestões corretamente.",
                    "<strong>Navegação Pós-Salvamento:</strong> Ajustado o fluxo de navegação para que, após salvar um novo contribuinte, o usuário seja direcionado para a lista de 'Gerir Contribuintes' em vez da página principal.",
                    "<strong>Navegação Geral:</strong> Corrigido um erro de roteamento que impedia o acesso a alguns módulos após a refatoração da inicialização da aplicação."
                ]
            },
            {
                versao: "1.1",
                data: "05/06/2025",
                novidades: [
                    "<strong>Restaurar Base de Dados:</strong> Adicionado botão 'Restaurar DB' no cabeçalho para restaurar rapidamente a base de dados a partir de um arquivo <code>.json</code>.",
                    "<strong>Notas de Versão na Ajuda:</strong> Nova seção 'Notas de Versão' implementada no Módulo de Ajuda para detalhar o histórico de atualizações do sistema."
                ],
                correcoes: [
                    "<strong>Revisão de Ajuda Contextual:</strong> Adicionados e revisados botões de ajuda (ícone ❓) em diversas telas para facilitar o acesso rápido à documentação relevante."
                ]
            },
            {
                versao: "1.0",
                data: "03/06/2025",
                novidades: [
                    "Lançamento inicial do SEFWorkStation com funcionalidades centrais de Documentos, Contribuintes, Processos e Tarefas."
                ],
                correcoes: []
            }
        ]
    }
};