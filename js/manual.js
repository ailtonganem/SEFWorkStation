// js/manual.js - Conteúdo Principal e Estrutura do Manual do Usuário SEFWorkStation
// v2.0 - REFATORADO: Atualiza a lista de módulos para incluir ITCD, Solução de Problemas e Dicas Avançadas, e reordena para uma melhor organização.
// v1.18.0 - CORRIGIDO: Adicionada a flag `isManualCompleto` para facilitar a identificação do objeto principal do manual.
// v1.17.0 - Adiciona descrição do novo Menu de Usuário à Visão Geral da Interface.
// ... (histórico anterior)

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ManualConteudo = window.SEFWorkStation.ManualConteudo || {};

const secoesDoManual = [];

// Seção 1: Introdução e Configuração Inicial (Sempre presente)
secoesDoManual.push({
    idSecaoDOM: "manual-intro-config",
    tituloSecaoDisplay: "1. Introdução e Configuração Inicial",
    anchorText: "Introdução e Configuração",
    subsecoes: [
        {
            idSubSecaoDOM: "manual-intro-pasta",
            tituloSubsecaoDisplay: "1.1. Selecionando a Pasta da Aplicação (Primeiro Uso)",
            conteudoMarkdown: `
Ao iniciar o SEFWorkStation pela primeira vez, você será solicitado a selecionar uma pasta no seu computador. Esta pasta será o local principal onde a aplicação armazenará:

* **Base de Dados Interna:** Embora o IndexedDB seja gerenciado pelo navegador, ele é vinculado à origem da pasta que você seleciona.
* **Anexos:** Arquivos vinculados a documentos, contribuintes, etc., serão salvos na subpasta \`attachments_sef\` dentro da pasta escolhida. As subpastas são organizadas por tipo de entidade (ex: \`documents\`, \`contribuintes\`) e depois pelo ID da entidade.
* **Backups:** Backups automáticos e manuais (arquivos \`.zip\` ou \`.json\`) serão salvos na subpasta \`backups/\`.
* **E-mails Gerados:** Arquivos \`.eml\` criados pelo compositor de e-mail são salvos na subpasta \`email/\`.

**Importância da Escolha:**
É **crucial** escolher uma pasta em um local seguro e que seja incluída em suas rotinas de backup regulares (ex: HD externo, pendrive, serviço de sincronização em nuvem que respeite arquivos locais como Dropbox, Google Drive configurado para espelhamento, etc.). A integridade dos seus dados depende da segurança desta pasta.

**Permissões:**
O navegador solicitará permissão para ler e escrever nesta pasta. É essencial conceder essas permissões para o funcionamento completo da aplicação (salvar anexos, realizar backups no sistema de arquivos, salvar e-mails gerados). Se a permissão não for concedida ou for revogada, algumas funcionalidades podem ser limitadas.

Uma vez selecionada, a aplicação lembrará desta pasta. O nome da pasta selecionada é exibido no rodapé da aplicação (Header - Linha 4). Você não pode alterar a pasta raiz diretamente pela interface após a seleção inicial, para evitar a perda de acesso aos dados. Se precisar mudar, será necessário limpar os dados do site nas configurações do navegador e reiniciar a aplicação para que ela solicite uma nova pasta (isso apagará as preferências salvas no navegador, mas não os dados na pasta antiga).
            `
        },
        {
            idSubSecaoDOM: "manual-intro-interface",
            tituloSubsecaoDisplay: "1.2. Visão Geral da Interface",
            conteudoMarkdown: `
A interface do SEFWorkStation é dividida em algumas áreas principais:

*   **Cabeçalho (Header):** Localizado no topo da página, é persistente e contém:
    *   **Linha 1 (Principal):**
        *   Logo/Nome da Aplicação (\`SEFWorkStation\`, com o "SEF" em vermelho): Clicar aqui leva à página inicial (Dashboard Informativo).
        *   Menus Suspensos dos Módulos: "Documentos", "Contribuintes", "Servidores", "Processos", "ITCD", "Comunicação", "Tarefas", "Notas Rápidas", "Compartilhamento", "Utilidades". Cada menu oferece ações específicas do módulo.
        *   **Controles da Direita:**
            *   **Notificações (🔔):** Alerta sobre prazos de tarefas e recursos.
            *   **Menu de Usuário (👤):** Exibe o nome do usuário atual e, ao clicar, oferece atalhos para "Meu Perfil", "Minhas Tarefas" e "Mudar de Usuário".
            *   **Controles de Tema:** Botões para alternar entre Tema Claro/Escuro (☀️/🌙) e Modo de Alto Contraste (🔆).
    *   **Linha 2 (Busca e Filtros Globais de Documentos):**
        *   Campo de Pesquisa Global: Permite buscar em todos os documentos por palavras-chave.
        *   Filtros Rápidos para Documentos: Menus suspensos para filtrar a lista de documentos por Tipo, Categoria, Tag e Ordenação (Mais Recentes/Mais Antigos). Estes filtros são aplicados principalmente na view "Gerir Documentos".
    *   **Linha 3 (Acesso Rápido e Ações Rápidas):**
        *   Acesso Rápido a Documentos: Um menu suspenso que lista documentos recentes ou favoritos para acesso rápido.
        *   Botões "Salvar DB" e "Restaurar DB": Atalhos para as funcionalidades de backup e restauração rápida da base de dados (.json).
    *   **Linha 4 (Barra de Status/Informações):**
        *   Exibe filtros ativos para documentos.
        *   Contagem total de documentos (ou modelos, dependendo da view).
        *   Status do último backup automático.
        *   Status da conexão com LocalStorage e IndexedDB.
        *   Versão da aplicação e informações do desenvolvedor.
*   **Área de Conteúdo Principal (\`main-page\` > \`.main-content-wrapper\`):** Localizada abaixo do cabeçalho, é onde o conteúdo específico do módulo selecionado ou da página atual é exibido.
*   **Notificações Toast:** Mensagens de feedback (sucesso, erro, aviso, informação) aparecem no canto superior direito da tela e geralmente desaparecem automaticamente após alguns segundos. Erros críticos podem permanecer até serem dispensados.

**Navegação:**
*   A navegação principal é feita através dos menus suspensos na Linha 1 do cabeçalho.
*   Links internos e botões dentro das páginas de cada módulo permitem acessar sub-funcionalidades.
*   A aplicação possui um sistema de histórico de navegação interno. O botão "Voltar" (se presente na tela) ou a função de voltar do navegador, tentará retornar à tela anterior dentro do SEFWorkStation.
            `
        }
    ]
});

// Adiciona seções dos módulos dinamicamente
// A ordem neste array define a ordem em que as seções aparecerão no menu da ajuda.
const modulosConteudoNomes = [
    "Documentos", 
    "Contribuintes", 
    "Processos", 
    "Servidores", 
    "Itcd", // NOVO
    "Comunicacao",
    "Tarefas", 
    "NotasRapidas", 
    "Utilidades", 
    "Configuracoes",
    "Compartilhamento",
    "SolucaoProblemas", // NOVO
    "DicasAvancadas"  // NOVO
];

modulosConteudoNomes.forEach(nomeModulo => {
    if (window.SEFWorkStation &&
        window.SEFWorkStation.ManualConteudo &&
        window.SEFWorkStation.ManualConteudo[nomeModulo]) {
        secoesDoManual.push(window.SEFWorkStation.ManualConteudo[nomeModulo]);
    } else {
        console.warn(`[Manual.JS DEBUG] Conteúdo para o módulo do manual '${nomeModulo}' não encontrado em window.SEFWorkStation.ManualConteudo.${nomeModulo}. Esta seção não será incluída.`);
    }
});

window.SEFWorkStation.ManualUsuario = {
    idInterno: "manual-usuario-app",
    tituloPrincipal: "Manual do Usuário Completo SEFWorkStation",
    isManualCompleto: true, // Flag para identificação fácil
    introducao: `
Bem-vindo ao Manual do Usuário completo do SEFWorkStation!

Este guia detalhado foi elaborado para ajudá-lo a compreender e utilizar todas as funcionalidades da aplicação, desde a configuração inicial até as operações mais avançadas de cada módulo.

O SEFWorkStation é uma ferramenta poderosa projetada para otimizar seu fluxo de trabalho, gerenciando documentos, contribuintes, processos, tarefas, comunicações e muito mais, tudo em um ambiente offline seguro e eficiente.

**Como Usar Este Manual:**
*   **Navegação:** Utilize o menu lateral na página de Ajuda para saltar diretamente para as seções de seu interesse. Dentro de cada seção do manual, os subtópicos são numerados para facilitar a referência.
*   **Busca:** A funcionalidade de busca na Central de Ajuda também indexa o conteúdo deste manual.
*   **Leitura Sequencial:** Para um entendimento completo, você pode ler as seções na ordem apresentada.

Esperamos que este manual seja um recurso valioso para você aproveitar ao máximo o SEFWorkStation!
    `,
    secoes: secoesDoManual.filter(sec => sec)
};