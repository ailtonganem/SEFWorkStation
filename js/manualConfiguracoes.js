// js/manualConfiguracoes.js
// v1.0 - Conteúdo detalhado para o Módulo de Configurações principal da aplicação.

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ManualConteudo = window.SEFWorkStation.ManualConteudo || {};

window.SEFWorkStation.ManualConteudo.Configuracoes = {
    idSecaoDOM: "manual-modulo-configuracoes",
    tituloSecaoDisplay: "10. Módulo de Configurações",
    anchorText: "Módulo Configurações",
    subsecoes: [
        {
            idSubSecaoDOM: "config-visao-geral",
            tituloSubsecaoDisplay: "10.1. Visão Geral do Módulo de Configurações",
            conteudoMarkdown: `
O Módulo de Configurações é o painel de controle central do SEFWorkStation, onde você pode personalizar a aparência da aplicação, gerenciar preferências de backup, acessar informações sobre a versão e realizar ações administrativas importantes.

**Principais Seções e Funcionalidades:**

*   **Identidade e Compartilhamento:**
    *   **Usuário Atual da Aplicação:** \`[Essencial]\` Permite que você se identifique no sistema selecionando seu próprio cadastro do Módulo de Servidores. Esta configuração é crucial para o funcionamento do Menu de Usuário, do compartilhamento de itens e da atribuição de tarefas.
    *   **Pasta Compartilhada:** Permite selecionar la pasta sincronizada (ex: OneDrive) para usar as funcionalidades de compartilhamento.

*   **Menu de Acesso Rápido:**
    *   Personalize os atalhos que aparecem no menu de acesso rápido (ícone \`+\` no cabeçalho), permitindo acesso imediato às ações que você mais utiliza.

*   **Informações da Aplicação:**
    *   Exibe a **Versão Atual** e links para o **Histórico de Versões** e o **Manual do Usuário**.

*   **Preferências do Usuário:**
    *   Defina um **Email Padrão** para ser usado como remetente no Módulo de Comunicação.

*   **Preferências de Aparência (Geral):**
    *   **Personalizar Cores do Tema:** Ajuste as cores principais para os temas Claro e Escuro.
    *   Lembrete dos controles rápidos de **Tema** (☀️/🌙) e **Alto Contraste** (🔆) no cabeçalho.

*   **Gerenciamento de Backups (Configuração):**
    *   Configure o **intervalo** e a **quantidade máxima** de backups automáticos.
    *   Selecione **quais tipos de dados** e se os **anexos físicos** devem ser incluídos nos backups automáticos.

*   **Preferências de Listagem:**
    *   Escolha quais colunas serão exibidas por padrão na tabela de "Gerir Documentos".

*   **Privacidade e Dados:**
    *   Contém a opção crítica e irreversível para **Limpar Todos os Dados da Aplicação**.

*   **Botão Salvar:**
    *   No final da página, um botão "**Salvar Todas as Preferências**" aplica todas as alterações feitas.
`
        },
        {
            idSubSecaoDOM: "config-identidade-acesso-rapido",
            tituloSubsecaoDisplay: "10.2. Identidade do Usuário e Acesso Rápido",
            conteudoMarkdown: `
Essas duas seções permitem uma personalização profunda do seu fluxo de trabalho.

**1. Identidade e Compartilhamento:**
*   **Usuário Atual da Aplicação:**
    *   **Para que serve?** Esta é a configuração mais importante para a personalização e colaboração. Ao selecionar seu nome (previamente cadastrado em **Servidores > Novo Servidor**), você está "logando" na aplicação.
    *   **O que habilita?**
        1.  O **Menu de Usuário** no cabeçalho, com seu nome e atalhos para "Meu Perfil" e "Minhas Tarefas".
        2.  A capacidade de **enviar e receber** itens via Módulo de Compartilhamento.
        3.  A filtragem correta da visão "**Minhas Tarefas**".
    *   **Como configurar:** Selecione seu nome na lista suspensa e clique em "Salvar Todas as Preferências" no final da página.
*   **Pasta Compartilhada:**
    *   Clique em "Selecionar" para escolher a pasta \`SEFWorkStation_Compartilhado\` no seu computador. Essencial para o envio e recebimento de itens.

**2. Menu de Acesso Rápido:**
*   **O que é?** O botão com um ícone de \`+\` no cabeçalho abre um menu de atalhos para as ações mais comuns.
*   **Como personalizar?**
    *   Nesta seção, você verá uma lista de ações disponíveis (ex: "Novo Documento", "Nova Tarefa", "Cadastrar Protocolo").
    *   Marque as caixas de seleção ao lado das ações que você mais usa e que deseja ter acesso rápido.
    *   Desmarque as que você não usa com frequência.
    *   Clique em "Salvar Todas as Preferências" no final da página. O menu de acesso rápido no cabeçalho será atualizado imediatamente com suas escolhas.
`
        },
        {
            idSubSecaoDOM: "config-aparencia-detalhes",
            tituloSubsecaoDisplay: "10.3. Detalhes sobre Personalização da Aparência",
            conteudoMarkdown: `
O SEFWorkStation oferece várias maneiras de ajustar a aparência para se adequar às suas preferências e necessidades de acessibilidade.

*   **Temas Claro e Escuro (☀️/🌙):** Alterne entre um tema de fundos claros e um de fundos escuros para reduzir o cansaço visual, especialmente em ambientes com pouca luz.
*   **Modo de Alto Contraste (🔆):** Ativa uma fonte mais legível (como Arial) e aumenta o peso do texto em toda a aplicação, melhorando a clareza.
*   **Personalizar Cores do Tema:** Permite um ajuste fino das cores principais dos temas. Você pode usar um seletor de cores visual ou inserir códigos hexadecimais para definir as cores de fundo e de texto. Lembre-se de manter um bom contraste para garantir a legibilidade.

Após qualquer alteração, clique em "**Salvar Todas as Preferências**" no final da página.
`
        },
        {
            idSubSecaoDOM: "config-backup-avancado",
            tituloSubsecaoDisplay: "10.4. Configurações Avançadas de Backup",
            conteudoMarkdown: `
Configure o comportamento dos backups automáticos para garantir a segurança dos seus dados com o mínimo de esforço.

*   **Quantidade Máxima de Backups Automáticos:** Defina quantos arquivos \`.zip\` de backup automático o sistema deve manter. Ao atingir o limite, o mais antigo é excluído para dar lugar ao novo.
*   **Intervalo do Backup Automático:** Escolha a frequência (ou desative) com que o sistema verificará se há dados novos para salvar em um backup.
*   **Dados do Backup Automático:** Selecione quais tipos de dados (Documentos, Contribuintes, Tarefas, etc.) serão incluídos nos backups automáticos.
*   **Incluir Anexos Físicos:** Decida se os arquivos físicos anexados às entidades devem ser incluídos nos backups automáticos em ZIP.

Lembre-se que backups manuais completos (em **Utilidades > Backup / Restauração ZIP**) ainda são recomendados e devem ser guardados em locais seguros.
`
        },
        {
            idSubSecaoDOM: "config-privacidade-limpeza",
            tituloSubsecaoDisplay: "10.5. Privacidade e Limpeza de Dados",
            conteudoMarkdown: `
Esta seção contém uma ferramenta poderosa e perigosa.

*   **Limpar Todos os Dados da Aplicação:** \`[AÇÃO CRÍTICA E IRREVERSÍVEL!]\`
    *   Este botão apaga **todos os dados de conteúdo** (documentos, contribuintes, tarefas, etc.) do banco de dados do SEFWorkStation no seu navegador.
    *   **O que é mantido:** Preferências de interface e o nome da pasta raiz da aplicação.
    *   **O que NÃO é apagado por esta ação:** Os arquivos físicos na sua pasta \`attachments_sef\` e \`backups/\`.
    *   **Use com extrema cautela.** É recomendado para reiniciar a aplicação do zero ou em caso de problemas graves com os dados. **Sempre faça um backup completo antes de usar esta opção!**
`
        }
    ]
};