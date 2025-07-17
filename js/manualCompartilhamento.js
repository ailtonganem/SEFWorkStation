// js/manualCompartilhamento.js - Conteúdo do Manual do Usuário para o Módulo de Compartilhamento
// v1.3 - Reescreve seção de configuração para ser um passo a passo mais claro e detalhado, prevenindo erros.
// v1.2 - Detalha o passo a passo para configuração da pasta compartilhada.
// v1.1 - Adiciona subseção sobre Histórico de Envios.
// v1.0 - Conteúdo detalhado para a funcionalidade de compartilhamento.

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ManualConteudo = window.SEFWorkStation.ManualConteudo || {};

window.SEFWorkStation.ManualConteudo.Compartilhamento = {
    idSecaoDOM: "manual-modulo-compartilhamento",
    tituloSecaoDisplay: "12. Compartilhamento entre Usuários",
    anchorText: "Módulo Compartilhamento",
    subsecoes: [
        {
            idSubSecaoDOM: "comp-visao-geral",
            tituloSubsecaoDisplay: "12.1. Visão Geral do Sistema de Compartilhamento",
            conteudoMarkdown: `
O sistema de compartilhamento do SEFWorkStation permite que você envie cópias de itens (como Documentos, Tarefas, etc.) para outros usuários da aplicação de forma segura e offline, utilizando uma pasta sincronizada por um serviço de nuvem como o OneDrive.

**Como Funciona:**
O processo é desenhado para ser robusto e não depender de um servidor central, mantendo a filosofia offline da aplicação.

1.  **Pasta Compartilhada:** Ambos os usuários (remetente e destinatário) devem ter acesso a uma mesma pasta compartilhada no sistema de arquivos, idealmente sincronizada por um serviço como o OneDrive. O nome padrão esperado para esta pasta é \`SEFWorkStation_Compartilhado\`.
2.  **Envio (Remetente):**
    *   O remetente seleciona um item no SEFWorkStation (ex: um documento) e clica em "Compartilhar".
    *   Ele escolhe um ou mais destinatários (outros servidores cadastrados no sistema).
    *   O SEFWorkStation cria dois arquivos na pasta compartilhada: um arquivo \`.sefshare.zip\` (contendo os dados e anexos) e um arquivo \`.meta\` (com informações sobre quem enviou para quem).
    *   O sistema então abre o compositor de e-mail para que o remetente possa enviar uma notificação ao destinatário.
3.  **Recebimento (Destinatário):**
    *   Após a notificação e a sincronização da pasta, o destinatário acessa a **Central de Importação** no seu SEFWorkStation.
    *   Ele pode selecionar o pacote \`.sefshare.zip\` recebido e o sistema mostrará os itens para importação.
    *   O destinatário pode então importar uma cópia daquele item para a sua própria base de dados local.

**Importante:** O sistema compartilha uma **cópia** do item. As alterações feitas pelo destinatário no item importado **não** serão refletidas no item original do remetente, e vice-versa. É um sistema de envio de informações, não de edição colaborativa em tempo real.
`
        },
        {
            idSubSecaoDOM: "comp-configuracao",
            tituloSubsecaoDisplay: "12.2. Configuração Inicial (Obrigatória)",
            conteudoMarkdown: `
Para usar a funcionalidade de compartilhamento, cada usuário precisa realizar duas configurações simples, mas essenciais. Siga este passo a passo detalhado.

#### Passo 1: Criar e Compartilhar a Pasta no seu Computador (Exemplo usando OneDrive)

Esta etapa é feita **fora** do SEFWorkStation, no seu explorador de arquivos (Windows Explorer, Finder, etc.).

1.  **Crie a Pasta:**
    *   Navegue até o diretório principal do seu OneDrive no seu computador (a pasta que sincroniza com a nuvem).
    *   Dentro dela, crie uma nova pasta com o nome **exato**: \`SEFWorkStation_Compartilhado\`.
2.  **Compartilhe a Pasta com seus Colegas:**
    *   Clique com o botão direito do mouse sobre a nova pasta \`SEFWorkStation_Compartilhado\`.
    *   No menu que aparece, procure pela opção "Compartilhar" (geralmente com um ícone do OneDrive).
    *   Uma janela de compartilhamento do OneDrive se abrirá.
    *   Digite os e-mails dos colegas com quem você deseja compartilhar itens.
    *   **Crucial:** Certifique-se de que a permissão esteja definida como **"Pode editar"** ou **"Edição"**. Isso é necessário para que o SEFWorkStation dos seus colegas possa atualizar o status dos arquivos de compartilhamento quando eles importarem um item.
    *   Envie o convite.
3.  **Para quem recebe o convite:**
    *   Seus colegas receberão um e-mail com um link para acessar a pasta. Eles devem clicar e seguir as instruções para adicionar a pasta compartilhada ao OneDrive deles.
    *   É fundamental que eles garantam que a pasta \`SEFWorkStation_Compartilhado\` apareça no explorador de arquivos deles e esteja sendo sincronizada pelo cliente OneDrive.

#### Passo 2: Configurar o SEFWorkStation (Todos os usuários devem fazer)

Agora, dentro da aplicação SEFWorkStation:

1.  **Defina sua Identidade de Usuário:**
    *   No menu superior, vá para **Configurações**.
    *   Na seção "Identidade e Compartilhamento", localize o campo "**Usuário Atual da Aplicação**".
    *   Selecione **seu próprio nome** na lista de servidores cadastrados. Se seu nome não estiver na lista, você precisa primeiro se cadastrar como um servidor no **Módulo de Servidores**.
    *   **Esta etapa é obrigatória.** Sem ela, o sistema não saberá quem você é para enviar ou receber itens.
2.  **Selecione a Pasta Compartilhada no Sistema:**
    *   Ainda na mesma seção de "Identidade e Compartilhamento", clique no botão **"Selecionar"** ao lado de "Pasta Compartilhada (OneDrive)".
    *   Uma janela do seu sistema de arquivos será aberta.
    *   Navegue até a pasta \`SEFWorkStation_Compartilhado\` que você criou e configurou no Passo 1.
    *   Clique em "Selecionar pasta".
    *   O navegador solicitará sua permissão para que o SEFWorkStation possa ler e escrever nesta pasta. **Você deve conceder essa permissão.**
    *   O nome da pasta aparecerá no campo de texto, confirmando a seleção para a sessão atual.
3.  **Salve as Preferências:**
    *   Role até o final da página de Configurações e clique no botão grande "**Salvar Todas as Preferências**". Isso salvará sua identidade de usuário. A referência à pasta compartilhada é geralmente mantida por sessão e será solicitada novamente se necessário.

Com estes passos concluídos, você e sua equipe estão prontos para trocar informações através do SEFWorkStation.
`
        },
        {
            idSubSecaoDOM: "comp-enviando",
            tituloSubsecaoDisplay: "12.3. Como Compartilhar um Item",
            conteudoMarkdown: `
Depois de configurar seu usuário e a pasta, compartilhar um item é simples.

1.  **Localize o Item:** Navegue até o item que deseja compartilhar (ex: visualize um Documento em "Gerir Documentos").
2.  **Clique em Compartilhar:** Na tela de visualização do item, procure e clique no botão "**Compartilhar**" (geralmente com um ícone de compartilhamento 🔗 ou 📤).
3.  **Selecione os Destinatários:**
    *   Uma janela (modal) aparecerá, permitindo que você escolha para quem deseja enviar.
    *   Comece a digitar o nome de um **Servidor** ou **Grupo de Servidores** cadastrado no sistema.
    *   Uma lista de sugestões aparecerá. Clique nos nomes para adicioná-los à lista de destinatários.
    *   Você pode adicionar múltiplos servidores e/ou grupos.
4.  **Confirme o Compartilhamento:**
    *   Clique no botão "**Compartilhar e Notificar**" (ou similar).
    *   O sistema fará o seguinte em segundo plano:
        *   Criará o arquivo \`.sefshare.zip\` contendo os dados do item e, opcionalmente, seus anexos.
        *   Salvará um registro deste envio no seu Histórico local.
        *   Abrirá o **Compositor de E-mail** com uma mensagem padrão, já endereçada aos e-mails dos servidores e membros dos grupos que você selecionou.
5.  **Envie a Notificação:**
    *   Revise o e-mail pré-preenchido e clique em "**Gerar E-mail (.eml)**".
    *   Abra o arquivo \`.eml\` salvo em seu cliente de e-mail e envie-o para que seus colegas saibam que há um novo item para eles. O arquivo .sefshare.zip **não é anexado automaticamente**, você deve enviá-lo por outros meios ou garantir que o destinatário tenha acesso à pasta sincronizada.
`
        },
        {
            idSubSecaoDOM: "comp-recebendo-importando",
            tituloSubsecaoDisplay: "12.4. Recebendo e Importando Itens",
            conteudoMarkdown: `
Quando um colega compartilha um item com você, o processo de recebimento é o seguinte:

1.  **Receba o Pacote:** Você receberá um arquivo com a extensão \`.sefshare.zip\` enviado pelo seu colega (seja por e-mail ou outro meio). Salve este arquivo em seu computador.
2.  **Acesse a Central de Importação:** No SEFWorkStation, navegue até **Compartilhamento > Itens Recebidos**.
3.  **Selecione o Arquivo:**
    *   Clique no botão "**Selecionar Arquivo de Compartilhamento**".
    *   Na janela que se abre, localize e selecione o arquivo \`.sefshare.zip\` que você recebeu.
4.  **Tela de Revisão:**
    *   Após a seleção, o sistema analisará o pacote e exibirá uma tela de revisão com os itens contidos nele.
    *   **Resolução de Conflitos:** Se um item do pacote tiver o **mesmo ID interno** de um item já existente na sua base de dados, o sistema marcará como um "Conflito" e apresentará opções:
        *   **Sobrescrever item local:** A sua versão local do item será substituída pela versão que você está importando. **Use com cuidado.**
        *   **Ignorar este item:** A importação daquele item específico é cancelada, mantendo sua versão local intacta.
    *   Para itens novos (sem conflito), você pode simplesmente optar por importá-los ou ignorá-los.
5.  **Importe os Itens:**
    *   Após revisar e selecionar as ações para cada item, clique no botão "**Confirmar e Importar Itens Selecionados**".
    *   O sistema processará a importação.
6.  **Confirmação:**
    *   Uma mensagem de sucesso será exibida.
    *   Os itens importados agora estão disponíveis em seus respectivos módulos (ex: um documento importado aparecerá em "Gerir Documentos").
`
        },
        {
            idSubSecaoDOM: "comp-historico",
            tituloSubsecaoDisplay: "12.5. Central de Compartilhamento e Histórico de Envios",
            conteudoMarkdown: `
A Central de Compartilhamento permite que você gerencie o processo de envio em lote e rastreie todos os itens que você compartilhou com outros usuários.

**Acesso:**
*   Navegue até **Compartilhamento > Central de Compartilhamento**.

**Aba "Compartilhar em Lote":**
*   Esta aba permite que você selecione múltiplos itens de um mesmo tipo (ex: vários documentos) e os compartilhe de uma só vez para um grupo de destinatários, gerando um único pacote \`.sefshare.zip\` e uma única notificação por e-mail.

**Aba "Histórico de Envios":**
*   **Listagem de Envios:** A tela exibe uma tabela com todos os seus envios, ordenados do mais recente para o mais antigo.
*   **Ações na Lista de Histórico:**
    *   **Visualizar Detalhes (clicando no título):** Leva para uma nova página com todos os detalhes do pacote compartilhado, incluindo os itens enviados e o status de importação de cada destinatário.
    *   **Revogar Compartilhamento (🔗):** Esta ação tenta apagar os arquivos (\`.meta\` e \`.sefshare.zip\`) da pasta compartilhada, impedindo futuras importações por destinatários que ainda não o fizeram.
    *   **Excluir Registro de Envio (🗑️):** Remove o registro do seu histórico local e também tenta apagar os arquivos da pasta compartilhada.
*   **Rastreamento de Importação:** Na tela de detalhes do envio, você pode ver o status de importação para cada destinatário. Este status é atualizado quando um destinatário importa o item e seu serviço de nuvem sincroniza o arquivo \`.meta\` atualizado de volta para a sua pasta.
`
        }
    ]
};