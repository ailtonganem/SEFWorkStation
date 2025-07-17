// js/manualUtilidades.js - Conteúdo do Manual do Usuário para o Módulo de Utilidades
// v1.3 - CORREÇÃO: Adiciona a linha de inicialização que estava faltando para window.SEFWorkStation.
// v1.2 - Adiciona menção ao Gerenciador Central de Anexos.
// v1.1 - Atualiza conteúdo da subseção de Relatórios.
// v1.0 - Conteúdo detalhado para Lixeira, Backups, Relatórios e Conversor.

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ManualConteudo = window.SEFWorkStation.ManualConteudo || {};

window.SEFWorkStation.ManualConteudo.Utilidades = {
    idSecaoDOM: "manual-modulo-utilidades",
    tituloSecaoDisplay: "9. Módulo de Utilidades", // Ajustar numeração conforme necessário
    anchorText: "Módulo Utilidades",
    subsecoes: [
        {
            idSubSecaoDOM: "util-visao-geral",
            tituloSubsecaoDisplay: "9.1. Visão Geral do Módulo de Utilidades",
            conteudoMarkdown: `
O Módulo de Utilidades agrupa um conjunto de ferramentas administrativas e de manutenção essenciais para a gestão dos seus dados e o bom funcionamento do SEFWorkStation. São funcionalidades que, embora não usadas no dia a dia da criação de conteúdo, são cruciais para a segurança, recuperação e análise das informações.

**Principais Funcionalidades Detalhadas:**

*   **Lixeira Global:**
    *   Um local centralizado para onde todos os itens excluídos (Documentos, Contribuintes, Tarefas, etc.) são movidos antes de uma exclusão permanente.
    *   Permite visualizar itens por tipo, restaurá-los para suas listas ativas ou excluí-los definitivamente do sistema.

*   **Central de Relatórios:**
    *   Oferece uma variedade de relatórios predefinidos para extrair e analisar informações de diferentes módulos (ex: Ausências de Servidores, Documentos por Tipo, Tarefas por Status).
    *   Os resultados podem ser exportados para o formato CSV.

*   **Gerenciar Anexos:**
    *   Uma nova ferramenta que permite visualizar, buscar, baixar e excluir **todos os anexos** de todas as entidades do sistema em um único local, facilitando a gestão do espaço em disco.

*   **Backup e Restauração (ZIP):**
    *   A ferramenta principal e recomendada para criar backups completos ou seletivos da sua base de dados, incluindo a opção de incluir os arquivos físicos de anexos.

*   **Gerir Backups ZIP:**
    *   Lista todos os backups no formato ZIP (manuais e automáticos) que foram registrados pelo sistema, permitindo baixar, restaurar ou excluir esses backups.

*   **Salvar Base de Dados (.json):**
    *   Uma forma rápida de exportar **apenas os metadados** de todas as stores para um único arquivo \`.json\`.

*   **Conversor de JSON (Sistema Antigo):**
    *   Uma ferramenta específica para importar documentos de um formato JSON legado de uma versão anterior do sistema.

**Acesso às Funcionalidades do Módulo de Utilidades (Menu Principal "Utilidades"):**
*   **Lixeira Global:** Abre a interface da lixeira.
*   **Central de Relatórios:** Abre a página para seleção e geração de relatórios.
*   **Gerenciar Anexos:** Abre o gerenciador central de anexos.
*   **Backup / Restauração ZIP:** Leva à tela para exportar e importar backups completos/seletivos.
*   **Gerir Backups ZIP:** Exibe a lista de backups ZIP registrados.
*   **Salvar Base de Dados (.json):** Executa diretamente a ação de salvar os metadados.
*   **Conversor de JSON (Sistema Antigo):** Abre a ferramenta de importação de JSON legado.

Manter backups regulares e entender como usar a lixeira são práticas essenciais para a segurança e manutenção dos seus dados no SEFWorkStation.
`
        },
        {
            idSubSecaoDOM: "util-lixeira",
            tituloSubsecaoDisplay: "9.2. Lixeira Global",
            conteudoMarkdown: `
A Lixeira Global é para onde vão todos os itens (documentos, contribuintes, tarefas, etc.) que você "exclui" através da interface principal de cada módulo. Ela funciona como uma segunda chance, permitindo que você revise os itens antes de removê-los permanentemente ou, caso tenha excluído algo por engano, restaurá-lo.

**Acesso:**
*   No menu principal, navegue até **Utilidades > Lixeira Global**.

**Interface da Lixeira Global:**

*   **Abas por Tipo de Entidade:**
    *   A lixeira é organizada em abas, cadauma correspondendo a um tipo principal de entidade que pode ser excluída.
    *   Clique em uma aba para ver os itens daquele tipo que estão atualmente na lixeira.

*   **Ações para Itens Individuais na Lixeira:**
    *   **Restaurar (↩️):** Move o item de volta para sua lista ativa.
    *   **Excluir Permanentemente (🗑️🔥):** Remove o item **definitivamente** do banco de dados. Esta ação é irreversível e tenta apagar os anexos físicos associados.

*   **Ações para a Aba Atual:**
    *   **Esvaziar Lixeira de [Tipo de Entidade]:** Exclui permanentemente todos os itens da aba selecionada.

É uma boa prática revisar a lixeira periodicamente para decidir o que restaurar ou o que pode ser removido de forma definitiva para liberar espaço.
`
        },
        {
            idSubSecaoDOM: "util-relatorios",
            tituloSubsecaoDisplay: "9.3. Central de Relatórios",
            conteudoMarkdown: `
A Central de Relatórios permite extrair informações consolidadas e específicas de diversos módulos da aplicação, ajudando na análise de dados, acompanhamento de métricas e tomada de decisões.

**Acesso:**
*   No menu principal, navegue até **Utilidades > Central de Relatórios**.

**Interface da Central de Relatórios:**

1.  **Seleção do Tipo de Relatório:**
    *   Um menu suspenso ("Tipo de Relatório") lista todos os relatórios disponíveis.
2.  **Parâmetros do Relatório:**
    *   Após selecionar um tipo, campos de filtro específicos aparecem (ex: período, status, tipo específico, etc.).
3.  **Geração do Relatório:**
    *   Clique no botão "**Gerar Relatório**". Os resultados são exibidos em uma **tabela** na tela.
    *   **Exportar CSV:** Um botão permite exportar os dados da tabela para um arquivo \`.csv\`.
    *   **Imprimir:** Um botão para enviar a tabela de resultados para a impressora.

**Tipos de Relatórios Disponíveis (Exemplos):**
*   Ausências de Servidores por Período.
*   Servidores com Dias de Trabalho Remoto.
*   Documentos por Tipo, Categoria ou Tag.
*   Tarefas por Status ou Responsável.
*   **Visão Geral de Entidade:** Um relatório poderoso que permite selecionar um item específico (um documento, um contribuinte, etc.) e ver uma lista completa de todos os outros itens do sistema que estão vinculados a ele.
`
        },
        {
            idSubSecaoDOM: "util-backup",
            tituloSubsecaoDisplay: "9.4. Backup e Restauração",
            conteudoMarkdown: `
Manter backups regulares dos seus dados no SEFWorkStation é **extremamente importante**. A aplicação oferece funcionalidades robustas para isso.

**Tipos de Backup:**

1.  **Backup / Restauração ZIP (Recomendado):**
    *   **Acesso:** Menu **Utilidades > Backup / Restauração ZIP**.
    *   **Exportar:** Permite criar um backup seletivo (escolhendo quais dados incluir) ou completo. Inclui a opção de adicionar os arquivos físicos de anexos, criando um pacote \`.zip\` completo.
    *   **Restaurar:** Permite restaurar de um arquivo \`.zip\` ou \`.json\`. Oferece dois modos:
        *   **Substituir Tudo:** \`[CUIDADO!]\` Apaga os dados atuais e os substitui pelos do backup.
        *   **Mesclar com Existentes:** Adiciona os dados do backup, sobrescrevendo itens com o mesmo ID.
2.  **Gerir Backups ZIP:**
    *   **Acesso:** Menu **Utilidades > Gerir Backups ZIP**.
    *   Lista os backups automáticos e manuais ZIP que o sistema registrou. Permite baixar, restaurar ou excluir esses backups.
3.  **Salvar Base de Dados (.json):**
    *   **Acesso:** Menu **Utilidades > Salvar Base de Dados (.json)** ou pelo atalho (💾) no cabeçalho.
    *   Cria um backup rápido **apenas dos metadados** (sem anexos físicos) na pasta raiz da aplicação.

**Estratégia de Backup Recomendada:**
1.  **Configure o Backup Automático:** Em **Configurações**, defina um intervalo e o que incluir.
2.  **Faça Backups Manuais ZIP Completos Regularmente:** E salve-os em um local externo seguro (HD externo, nuvem, etc.).
`
        },
        {
            idSubSecaoDOM: "util-conversor",
            tituloSubsecaoDisplay: "9.5. Conversor de JSON (Sistema Antigo)",
            conteudoMarkdown: `
Esta ferramenta é uma utilidade específica para importar documentos de um formato JSON legado de uma versão anterior do sistema (que usava a chave \`"respostas"\`).

**Como Usar:**
1.  **Acesso:** Menu **Utilidades > Conversor de JSON (Sistema Antigo)**.
2.  **Selecionar Arquivo:** Escolha o arquivo \`.json\` do sistema antigo.
3.  **Iniciar Conversão:** Clique no botão para iniciar. O sistema lerá o arquivo e tentará adicionar os documentos encontrados à sua base de dados atual.

**Importante:** Faça um backup completo da sua base de dados atual **ANTES** de usar o conversor.
`
        }
    ]
};