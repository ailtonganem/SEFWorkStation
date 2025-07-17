// js/manualDicasAvancadas.js
// v1.2.0 - Conteúdo expandido com mais dicas de produtividade, organização e segurança.
// v1.1 - Ajuste no título da seção (remove numeração).
// v1.0 - Conteúdo inicial para dicas avançadas.

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ManualConteudo = window.SEFWorkStation.ManualConteudo || {};

window.SEFWorkStation.ManualConteudo.DicasAvancadas = {
    idSecaoDOM: "manual-dicas-avancadas",
    tituloSecaoDisplay: "Dicas Avançadas e Atalhos",
    anchorText: "Dicas Avançadas",
    subsecoes: [
        {
            idSubSecaoDOM: "da-visao-geral",
            tituloSubsecaoDisplay: "Otimizando seu Fluxo de Trabalho",
            conteudoMarkdown: `
Esta seção reúne dicas e truques para ajudá-lo a usar o SEFWorkStation de forma mais eficiente e produtiva, aproveitando ao máximo suas funcionalidades.

**Foco em Atalhos e Eficiência:**
*   **Atalhos de Teclado do Navegador:** Lembre-se que muitos atalhos padrão do seu navegador funcionarão, como:
    *   \`Ctrl+F\` (ou \`Cmd+F\`) para buscar texto na página atual.
    *   \`Ctrl+P\` (ou \`Cmd+P\`) para imprimir a visualização atual.
*   **Atalhos da Aplicação:**
    *   **Foco na Busca Global (\`/\` ou \`Ctrl+K\`):** Em qualquer tela, pressione a tecla \`/\` (barra) ou \`Ctrl+K\` (\`Cmd+K\` no Mac) para mover o foco diretamente para o campo de pesquisa global no cabeçalho.
    *   **Salvar Formulário (\`Ctrl+Enter\` ou \`Ctrl+S\`):** Ao preencher um formulário (novo documento, tarefa, etc.), pressione \`Ctrl+Enter\` para acionar o botão de salvar principal, sem precisar usar o mouse. \`Ctrl+S\` também funciona.
    *   **Criação Rápida:**
        *   \`Ctrl+Alt+N\`: Abre o formulário de **N**ovo Documento.
        *   \`Ctrl+Alt+T\`: Abre o formulário de **N**ova **T**arefa.
*   **Atalhos do Editor de Texto (Quill.js):** Ao editar o conteúdo de Documentos, Tarefas ou Notas Rápidas:
    *   \`Ctrl+B\` para **Negrito**, \`Ctrl+I\` para *Itálico*, \`Ctrl+U\` para Sublinhado.
    *   \`Ctrl+Z\` para desfazer, \`Ctrl+Y\` para refazer.
*   **Menu de Contexto (Botão Direito):** Em muitas telas de listagem (Gerir Documentos, Tarefas, etc.), clicar com o **botão direito do mouse** em uma linha da tabela abrirá um menu com as mesmas ações disponíveis na coluna "Ações" (Visualizar, Editar, Excluir). É um atalho rápido para quem prefere o mouse.

**Ações em Lote:**
*   Nas telas "Gerir Documentos", "Gerir Tarefas", etc., utilize as caixas de seleção na primeira coluna para marcar múltiplos itens.
*   Uma vez que um ou mais itens são selecionados, uma **barra de ações contextuais** aparecerá acima da lista, permitindo aplicar uma ação (Excluir, Favoritar, Mudar Status) a todos os itens selecionados de uma vez.
`
        },
        {
            idSubSecaoDOM: "da-organizacao-avancada",
            tituloSubsecaoDisplay: "Estratégias de Organização Avançada",
            conteudoMarkdown: `
*   **Nomenclatura Consistente:**
    *   **Tipos, Categorias, Tags:** Defina e siga um padrão claro para nomear seus itens de organização. Isso tornará os filtros muito mais poderosos e os relatórios mais precisos. Ex: padronize se usará "ICMS" ou "I.C.M.S.".
    *   **Títulos:** Use títulos descritivos que facilitem a identificação rápida do conteúdo. Considere prefixos padronizados para certos tipos de documentos ou projetos (ex: "REL_VENDAS_2024_01", "TAREFA_URG_RevisarContrato").
*   **Hierarquia de Categorias Inteligente:**
    *   Planeje sua estrutura de categorias (em Documentos e Contribuintes) de forma que ela reflita seu fluxo de trabalho ou as divisões lógicas da sua informação. Use "/" para criar subníveis.
    *   *Exemplo:* Uma categoria como \`Projetos / Projeto Phoenix / Fase 02 - Análise de Requisitos\` é muito mais útil para filtrar do que três categorias separadas.
*   **Uso Combinado de Categorias e Tags:**
    *   Pense em **Categorias** como o local fixo de um item (onde ele "mora"). Um documento pertence à categoria "Contratos".
    *   Pense em **Tags** como status ou atributos temporários e transversais. O mesmo documento na categoria "Contratos" pode ter as tags \`Pendente Assinatura\` e \`Urgente Jurídico\`. Quando o status muda, você pode remover a tag antiga e adicionar uma nova, sem mudar a categoria fundamental do item.
*   **Modelos com Placeholders Detalhados:**
    *   Invista tempo na criação de Modelos de Documento bem elaborados, utilizando o máximo possível de placeholders (padrão e personalizados de contribuinte).
    *   Para placeholders que não são de contribuinte, mas variam por lote (ex: uma data específica para uma campanha), use um nome de placeholder claro (ex: \`{{DATA_CAMPANHA}}\`) e marque-o como "variável" na ferramenta de Criação em Lote.
*   **Vínculos Estratégicos:**
    *   Sempre que criar uma Tarefa relacionada a um Documento específico, ou um Documento que é parte de um Processo, crie o vínculo!
    *   Isso constrói um "mapa" da sua informação, onde você pode facilmente navegar do Processo para os Documentos relacionados, para as Tarefas pendentes daquele processo, para o Contribuinte envolvido, etc. A **Visão Geral de Entidade** nos Relatórios se torna extremamente poderosa quando os vínculos são bem feitos.
`
        },
        {
            idSubSecaoDOM: "da-produtividade-modulos",
            tituloSubsecaoDisplay: "Dicas Específicas por Módulo",
            conteudoMarkdown: `
*   **Documentos:**
    *   Use o "**Acesso Rápido**" no cabeçalho (Linha 3) para saltar diretamente para documentos que você usa com frequência, sem precisar passar pela lista "Gerir Documentos". Documentos marcados como "Favoritos" (⭐) têm prioridade nesta lista.
*   **Contribuintes:**
    *   Crie **Campos Personalizados** para todas as informações específicas de contribuintes que você precisa rastrear (ex: "ID do Sistema Antigo", "Contato do Financeiro", "Preferência de Comunicação").
    *   Use **Placeholders de Contribuinte** mapeados para esses campos personalizados para automatizar ao máximo a geração de documentos. Isso é feito em **Contribuintes > Gerir Placeholders de Contribuinte**.
*   **Processos (Protocolos, PTAs, Autuações):**
    *   Use os botões "**Criar PTA deste Protocolo**" ou "**Criar Autuação deste PTA/Protocolo**" nas telas de visualização para manter a rastreabilidade entre os diferentes estágios processuais. Isso cria automaticamente o vínculo "de origem".
*   **Tarefas:**
    *   Use as **Subtarefas** para quebrar atividades complexas em passos menores.
    *   Revise o **Calendário de Tarefas** regularmente. Use os filtros do calendário (Status, Prioridade, Responsável) para focar no que é importante.
    *   Aproveite o **arrastar e soltar** no calendário para replanejar rapidamente as datas de vencimento de tarefas.
*   **Comunicação:**
    *   Cadastre **Destinatários Individuais** e crie **Grupos de Destinatários** para os contatos e listas que você usa com frequência. Isso economiza muito tempo ao compor e-mails.
    *   Use o **Módulo de Servidores** para criar Grupos de Servidores para comunicação interna com equipes.

*   **Notas Rápidas:**
    *   Use cores para organizar visualmente suas notas na grade por tema ou prioridade.
    *   Vincule notas a outros itens para adicionar contexto rápido sem poluir o item principal. Uma nota pode ser um "lembrete pessoal" sobre um documento, por exemplo, que não precisa estar no corpo do documento em si.
`
        },
        {
            idSubSecaoDOM: "da-backup-seguranca",
            tituloSubsecaoDisplay: "Dicas de Backup e Segurança de Dados",
            conteudoMarkdown: `
A segurança dos seus dados é fundamental, especialmente em uma aplicação offline.
*   **Backup Regular é Essencial:**
    *   **Configure o Backup Automático:** Na página de Configurações, defina um intervalo (ex: diário) e as stores/anexos a serem incluídos.
    *   **Faça Backups Manuais Completos (ZIP):** Antes de grandes alterações, importações, ou em intervalos regulares (semanal/mensal), use **Utilidades > Backup / Restauração ZIP** para criar um backup completo (com todas as stores e anexos) e salve-o em um **local externo seguro** (HD externo, pendrive dedicado, serviço de nuvem confiável). Não confie apenas nos backups automáticos na mesma máquina.
*   **Escolha da Pasta da Aplicação:**
    *   No primeiro uso, escolha uma pasta em um local que **já seja incluído nas suas rotinas de backup regulares do sistema operacional**.
    *   Se você usa um serviço de sincronização em nuvem (Dropbox, Google Drive, OneDrive) que tem um cliente de desktop e sincroniza pastas locais, você pode escolher uma pasta dentro da área sincronizada por esse serviço. Isso pode oferecer uma camada adicional de backup "automático" para os arquivos físicos (anexos, backups ZIP).
*   **Não Modifique Arquivos Diretamente:** Evite renomear, mover ou excluir arquivos diretamente nas subpastas \`attachments_sef\` ou \`backups\` dentro da pasta da sua aplicação. Faça isso sempre através da interface do SEFWorkStation para manter a consistência.
*   **Teste de Restauração:** Ocasionalmente (e especialmente antes de uma grande limpeza de dados ou mudança de computador), teste o processo de restauração de um backup em um ambiente seguro ou em uma pasta de teste para garantir que você sabe como fazê-lo e que seus backups são válidos.
*   **Senha no Computador:** Como os dados estão locais, a segurança física e lógica do seu computador é importante. Use senhas fortes para o login no seu sistema operacional e bloqueie sua tela quando se ausentar.
`
        }
    ]
};