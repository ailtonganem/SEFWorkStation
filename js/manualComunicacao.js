// js/manualComunicacao.js - Conteúdo do Manual do Usuário para o Módulo de Comunicação
// v1.0 - Conteúdo detalhado para E-mails, Destinatários e Grupos de Destinatários.

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ManualConteudo = window.SEFWorkStation.ManualConteudo || {};

window.SEFWorkStation.ManualConteudo.Comunicacao = {
    idSecaoDOM: "manual-modulo-comunicacao",
    tituloSecaoDisplay: "6. Módulo de Comunicação", // Ajustar numeração conforme necessário
    anchorText: "Módulo Comunicação",
    subsecoes: [
        {
            idSubSecaoDOM: "comunic-visao-geral",
            tituloSubsecaoDisplay: "6.1. Visão Geral do Módulo de Comunicação",
            conteudoMarkdown: `
O Módulo de Comunicação do SEFWorkStation oferece ferramentas para facilitar a preparação e o gerenciamento de suas comunicações por e-mail, mantendo um registro das mensagens geradas e organizando seus contatos.

**Principais Funcionalidades Detalhadas:**

*   **Compositor de E-mail Avançado:**
    *   Crie novos e-mails utilizando um editor de texto rico (baseado no Quill.js), permitindo formatação completa (fontes, tamanhos, cores, listas, links, imagens embutidas, etc.).
    *   **Destinatários:** Adicione destinatários nos campos "Para", "CC" (Com Cópia) e "CCO" (Com Cópia Oculta). Você pode:
        *   Digitar e-mails manualmente.
        *   Buscar e selecionar Destinatários Individuais previamente cadastrados no sistema.
        *   Buscar e selecionar Grupos de Destinatários (que podem conter tanto destinatários cadastrados quanto e-mails avulsos).
        *   Buscar e selecionar Servidores cadastrados (que possuam e-mail) ou Grupos de Servidores.
    *   **Assunto:** Defina o assunto do e-mail.
    *   **Anexos:**
        *   Anexe arquivos do seu computador.
        *   Se o e-mail estiver sendo composto a partir de uma entidade do sistema (ex: um Documento, um Processo), os anexos dessa entidade de origem podem ser selecionados para inclusão no e-mail.
    *   **Geração de Arquivo .eml:** Ao finalizar a composição, o sistema gera um arquivo no formato \`.eml\`. Este arquivo pode ser salvo localmente e depois aberto no seu cliente de e-mail padrão (Outlook, Thunderbird, Mail do Windows, etc.) para envio. O SEFWorkStation não envia e-mails diretamente; ele prepara o arquivo para que você o envie usando seu programa de e-mail configurado.

*   **Gerenciamento de E-mails Criados:**
    *   Todos os e-mails gerados através do compositor são registrados em uma lista.
    *   Para cada e-mail, você pode ver: Assunto, Destinatário Principal, Data de Geração, Status (ex: "Gerado", "Enviado Manualmente").
    *   **Ações:**
        *   Visualizar os detalhes do e-mail gerado (destinatários, corpo, lista de anexos registrados).
        *   Abrir o arquivo \`.eml\` correspondente para envio.
        *   Editar o e-mail (reabre no compositor com os dados preenchidos).
        *   Marcar o status como "Enviado Manualmente" após o envio pelo seu cliente de e-mail.
        *   Excluir o registro do e-mail gerado (não apaga o arquivo .eml já salvo, apenas o registro no sistema).

*   **Gerenciamento de Destinatários Individuais:**
    *   Cadastre contatos frequentes com Nome, E-mail, Empresa/Organização, Telefone e Observações.
    *   Esses destinatários cadastrados podem ser facilmente buscados e adicionados ao compor novos e-mails.

*   **Gerenciamento de Grupos de Destinatários:**
    *   Crie grupos para agrupar múltiplos destinatários sob um único nome (ex: "Clientes VIP", "Fornecedores TI").
    *   Um grupo pode conter:
        *   Destinatários Individuais já cadastrados no sistema.
        *   E-mails avulsos (que não precisam estar cadastrados individualmente).
    *   Ao selecionar um grupo no compositor de e-mail, todos os seus membros (com e-mail válido) serão adicionados como destinatários.

**Acesso às Funcionalidades do Módulo de Comunicação (Menu Principal "Comunicação"):**
*   **Escrever Novo E-mail:** Abre o compositor de e-mail.
*   **Gerir E-mails Criados:** Lista todos os e-mails que foram gerados e salvos pelo sistema.
*   --- (Divisor no menu) ---
*   **Novo Destinatário:** Abre o formulário para cadastrar um contato individual.
*   **Gerir Destinatários:** Lista todos os destinatários individuais cadastrados.
*   **Novo Grupo de Destinatários:** Abre o formulário para criar um novo grupo de contatos.
*   **Gerir Grupos de Destinatários:** Lista todos os grupos de destinatários criados.

**Fluxo de Trabalho Típico para Envio de E-mail:**
1.  **Cadastrar Destinatários/Grupos (Opcional, mas recomendado para uso frequente):**
    *   Adicione contatos individuais em "Novo Destinatário".
    *   Crie grupos em "Novo Grupo de Destinatários", adicionando membros (cadastrados ou avulsos).
2.  **Compor o E-mail:**
    *   Acesse "Escrever Novo E-mail".
    *   Preencha o Remetente (seu e-mail), Destinatários (Para, CC, CCO), Assunto e Corpo.
    *   Adicione anexos, se necessário.
3.  **Gerar Arquivo .eml:**
    *   Clique em "Gerar E-mail (.eml)".
    *   O arquivo será salvo na sua pasta de downloads ou em \`SUA_PASTA_RAIZ_DA_APLICACAO/email/\`.
    *   Um registro do e-mail gerado também será salvo em "Gerir E-mails Criados".
4.  **Enviar o E-mail:**
    *   Abra o arquivo \`.eml\` salvo com seu programa de e-mail padrão (Outlook, Thunderbird, etc.).
    *   O e-mail será aberto como uma nova mensagem, pronta para ser enviada. Revise e envie.
5.  **Atualizar Status (Opcional):**
    *   Em "Gerir E-mails Criados", você pode localizar o e-mail enviado e marcar seu status como "Enviado Manualmente".

Este módulo visa agilizar a preparação de e-mails, especialmente quando se trata de comunicações padronizadas ou para múltiplos destinatários, mantendo um histórico organizado dentro do SEFWorkStation.
`
        },
        {
            idSubSecaoDOM: "comunic-compositor",
            tituloSubsecaoDisplay: "6.2. Compositor de E-mail",
            conteudoMarkdown: `
O Compositor de E-mail é a ferramenta central para criar suas mensagens.

**Acesso:**
*   Clique em **Comunicação > Escrever Novo E-mail**.
*   Ou, a partir de algumas entidades (como Documentos, Processos, Tarefas), pode haver um botão "Enviar por Email" que abre o compositor com informações da entidade de origem já pré-preenchidas.

**Interface do Compositor:**

*   **Remetente (De):**
    *   Seu endereço de e-mail.
    *   Pode ser preenchido automaticamente se você configurou um "Email Padrão do Usuário" nas Configurações da aplicação. Caso contrário, você precisará digitá-lo. \`[Obrigatório]\`

*   **Destinatários (Para, CC, CCO):**
    *   Cada campo ("Para:", "CC:", "CCO:") possui uma área para exibir os destinatários já adicionados (como "pills" ou etiquetas) e um campo de input abaixo.
    *   **Para adicionar:**
        *   **Digitar Manualmente:** Comece a digitar um endereço de e-mail no campo de input. Se for um e-mail válido, pressione Enter ou vírgula. O e-mail será adicionado como um destinatário "Manual".
        *   **Buscar Contatos Cadastrados:** Comece a digitar um nome ou parte de um e-mail. Uma lista de sugestões aparecerá abaixo do campo, incluindo:
            *   Destinatários Individuais cadastrados.
            *   Grupos de Destinatários.
            *   Servidores cadastrados (com e-mail).
            *   Grupos de Servidores.
            Clique em uma sugestão para adicioná-la. Se um grupo for selecionado, todos os seus membros válidos serão efetivamente incluídos no envio, embora o grupo apareça como uma única pill no campo.
    *   **Remover Destinatário:** Clique no "X" ao lado de uma pill de destinatário para removê-lo daquele campo.
    *   Pelo menos um destinatário em "Para", "CC" ou "CCO" é necessário.

*   **Assunto:** \`[Obrigatório]\` O título do seu e-mail.
    *   Se você veio de uma entidade de origem (ex: um Documento), o assunto pode ser pré-preenchido com o título da entidade.

*   **Corpo do E-mail:**
    *   Um editor de texto rico (Quill.js) é fornecido, com uma barra de ferramentas completa para formatação (fontes, tamanhos, cores, negrito, itálico, listas, links, imagens embutidas, etc.).
    *   Se veio de uma entidade de origem, o corpo do e-mail pode ser pré-preenchido com o conteúdo ou descrição daquela entidade.

*   **Anexos:**
    *   **Anexos da Origem:** Se o e-mail foi iniciado a partir de uma entidade que possui anexos (ex: Documento, Processo), esses anexos aparecerão listados com caixas de seleção. Marque os que deseja incluir no e-mail.
    *   **Adicionar Novos Anexos:** Use o botão "Escolher arquivos" para selecionar arquivos do seu computador. Eles serão listados na área "Novos Anexos".

*   **Ações:**
    *   **Cancelar:** Fecha o compositor e descarta o e-mail atual. Se você veio de outra tela, geralmente retorna para ela.
    *   **Gerar E-mail (.eml):** \`[Ação Principal]\`
        1.  Valida os campos obrigatórios (Remetente, pelo menos um Destinatário, Assunto, Corpo).
        2.  Coleta todos os dados: remetente, destinatários (resolvendo grupos), assunto, corpo HTML e texto puro, e anexos selecionados (lendo os arquivos do seu disco, se forem novos, ou do sistema de arquivos da aplicação, se forem da origem).
        3.  Constrói um arquivo no formato \`.eml\` padrão, que é um formato de arquivo de e-mail universal.
        4.  Inicia o download deste arquivo \`.eml\` para o seu computador (geralmente para a pasta "Downloads" ou para \`SUA_PASTA_RAIZ_DA_APLICACAO/email/\`).
        5.  Cria um registro deste e-mail gerado na seção **Comunicação > Gerir E-mails Criados**, com status inicial "Gerado".
        6.  Se a opção "Limpar formulário após gerar" (ou similar) estiver ativa (ou for o comportamento padrão para novos e-mails), os campos do compositor são limpos, prontos para uma nova mensagem. Se você estava editando um e-mail gerado, geralmente retorna para a visualização do e-mail atualizado.

**Importante sobre o Envio:**
*   O SEFWorkStation **não envia o e-mail diretamente**. Ele apenas o prepara.
*   Após gerar o arquivo \`.eml\`, você precisa localizá-lo no seu computador e abri-lo com seu cliente de e-mail padrão (Outlook, Thunderbird, Apple Mail, etc.).
*   O e-mail será aberto em seu cliente como uma nova mensagem, com todos os campos (De, Para, CC, CCO, Assunto, Corpo, Anexos) preenchidos.
*   Revise a mensagem no seu cliente de e-mail e clique em "Enviar" por lá.
*   Opcionalmente, volte ao SEFWorkStation, vá em "Gerir E-mails Criados", localize o e-mail e marque seu status como "Enviado Manualmente" para seu controle.
`
        },
        {
            idSubSecaoDOM: "comunic-emails-gerados",
            tituloSubsecaoDisplay: "6.3. Gerenciando E-mails Criados",
            conteudoMarkdown: `
Esta seção permite que você visualize e gerencie o histórico de todos os e-mails que foram preparados e gerados usando o Compositor de E-mail do SEFWorkStation.

**Acesso:**
*   No menu principal, navegue até **Comunicação > Gerir E-mails Criados**.

**Interface da Listagem:**

*   **Tabela de E-mails:**
    *   Exibe uma lista de todos os e-mails gerados, com colunas como:
        *   **Assunto:** O assunto do e-mail. Clicável para visualizar detalhes.
        *   **Para (Principal):** O primeiro destinatário do campo "Para".
        *   **Data Geração:** Quando o arquivo .eml foi criado.
        *   **Status:** Indica se o e-mail está "Gerado" (apenas preparado) ou "Enviado Manualmente" (marcado por você após o envio real).
        *   **Ações:** Botões para interagir com cada registro.
    *   A lista é ordenável clicando nos cabeçalhos das colunas.

*   **Filtros (acima da tabela):**
    *   **Buscar:** Pesquisa por termos no Assunto, Destinatários ou Nome do Arquivo .eml.
    *   **Status:** Filtra por "Gerado" ou "Enviado Manualmente".
    *   **Período de Geração:** Filtros de Data de Início e Data de Fim.
    *   Clique em "Aplicar Filtros" para atualizar a lista.

*   **Ações na Lista (para cada e-mail):**
    *   **Visualizar Detalhes (👁️ ou clicando no Assunto):** Abre uma tela de visualização com todos os detalhes do e-mail gerado (destinatários, corpo, lista de anexos registrados).
    *   **Abrir .eml (📤):** Tenta localizar e abrir o arquivo \`.eml\` correspondente no seu sistema de arquivos com o cliente de e-mail padrão. O arquivo precisa estar acessível na pasta \`SUA_PASTA_RAIZ_DA_APLICACAO/email/\`.
    *   **Editar o e-mail (reabre no compositor com os dados preenchidos).
    *   **Marcar o status como "Enviado Manualmente" após o envio pelo seu cliente de e-mail.
    *   **Excluir Registro (🗑️):** Remove o registro do e-mail da lista do SEFWorkStation. **Importante:** Esta ação **não apaga o arquivo .eml** que já foi salvo no seu computador, apenas o registro no sistema. Se você também quiser excluir o arquivo físico, precisará fazê-lo manualmente na pasta "email".

**Tela de Visualização de E-mail Gerado:**
*   Exibe todos os detalhes do e-mail: Remetente, Para, CC, CCO, Assunto, Data de Geração, Status, Data de Envio Manual (se aplicável), e o Corpo HTML (renderizado).
*   Lista os nomes dos arquivos que foram anexados ao \`.eml\`.
*   **Ações na Tela de Visualização:**
    *   **Voltar:** Retorna à lista de e-mails gerados.
    *   **Editar:** Reabre este e-mail no Compositor, permitindo que você faça alterações e gere um novo arquivo \`.eml\` (que substituirá o registro anterior ou criará um novo, dependendo da implementação).
    *   **Marcar como Enviado / Marcar como Não Enviado:** Alterna o status do e-mail. Se marcado como enviado, registra a data/hora atual como a data de envio manual.
    *   **Abrir Arquivo .eml:** Mesmo comportamento do botão na lista.
    *   **Excluir Registro:** Remove o registro do sistema.
`
        },
        {
            idSubSecaoDOM: "comunic-destinatarios",
            tituloSubsecaoDisplay: "6.4. Gerenciando Destinatários Individuais",
            conteudoMarkdown: `
Cadastrar destinatários individuais facilita a adição de contatos frequentes ao compor e-mails, evitando a necessidade de digitar o endereço de e-mail toda vez e reduzindo erros.

**Acesso:**
*   **Novo Destinatário:** Menu **Comunicação > Novo Destinatário**.
*   **Gerir Destinatários:** Menu **Comunicação > Gerir Destinatários**.

**Formulário de Cadastro/Edição de Destinatário:**
*   **Nome:** \`[Obrigatório]\` Nome completo do contato.
*   **E-mail:** \`[Obrigatório]\` Endereço de e-mail principal. O sistema verifica o formato e a unicidade (não permite dois destinatários com o mesmo e-mail).
*   **Empresa/Organização:** (Opcional) Nome da empresa ou organização à qual o contato pertence.
*   **Telefone:** (Opcional) Número de telefone.
*   **Observações:** (Opcional) Campo para quaisquer notas adicionais sobre o contato.
*   **Salvar/Atualizar:** Grava as informações.

**Página "Gerir Destinatários":**
*   **Listagem:** Exibe todos os destinatários individuais cadastrados (que não estão na lixeira), com colunas para Nome, E-mail, Empresa/Organização e Ações.
*   **Busca:** Permite pesquisar por Nome, E-mail ou Empresa.
*   **Ações na Lista (para cada destinatário):**
    *   **Visualizar (👁️):** Abre uma tela de visualização com todos os detalhes do destinatário.
    *   **Editar (✏️):** Abre o formulário para modificar os dados do destinatário.
    *   **Excluir (🗑️):** Move o destinatário para a Lixeira Global. Se o destinatário for membro de algum Grupo de Destinatários, ele será removido desses grupos.

**Uso no Compositor de E-mail:**
Ao digitar nos campos "Para", "CC" ou "CCO" do compositor, os destinatários individuais cadastrados que corresponderem ao termo digitado aparecerão como sugestões, facilitando sua seleção.
`
        },
        {
            idSubSecaoDOM: "comunic-grupos-destinatarios",
            tituloSubsecaoDisplay: "6.5. Gerenciando Grupos de Destinatários",
            conteudoMarkdown: `
Grupos de Destinatários permitem agrupar vários contatos (sejam eles Destinatários Individuais cadastrados ou apenas endereços de e-mail avulsos) sob um único nome de grupo. Isso é extremamente útil para enviar e-mails para equipes, listas de distribuição ou qualquer conjunto recorrente de destinatários.

**Acesso:**
*   **Novo Grupo de Destinatários:** Menu **Comunicação > Novo Grupo de Destinatários**.
*   **Gerir Grupos de Destinatários:** Menu **Comunicação > Gerir Grupos de Destinatários**.

**Formulário de Criação/Edição de Grupo de Destinatários:**
*   **Nome do Grupo:** \`[Obrigatório]\` Um nome único e descritivo para o grupo (ex: "Clientes VIP", "Fornecedores TI").
*   **Descrição (Opcional):** Um breve texto sobre o propósito ou os membros do grupo.
*   **Membros do Grupo:**
    *   Clique no botão "**Adicionar/Remover Membros**". Uma janela modal será aberta.
    *   **Na modal:**
        *   **Buscar Destinatários Cadastrados:** Pesquise e selecione Destinatários Individuais já existentes no sistema para adicionar ao grupo. Marque as caixas de seleção.
        *   **Adicionar E-mail Avulso:** Digite um endereço de e-mail que não está (e não precisa estar) cadastrado como um Destinatário Individual e clique em "Adicionar E-mail". Útil para contatos esporádicos que fazem parte do grupo.
        *   **Membros Selecionados:** A modal exibirá uma lista dos destinatários e e-mails avulsos que você já adicionou a este grupo.
    *   Clique em "Confirmar Membros" no modal. Os membros selecionados aparecerão listados no formulário principal do grupo.
    *   Você pode remover membros diretamente no formulário principal clicando no "X" ao lado de cada um.
*   **Salvar/Atualizar:** Grava o grupo.

**Página "Gerir Grupos de Destinatários":**
*   **Listagem:** Exibe todos os grupos criados (que não estão na lixeira), com colunas para Nome do Grupo, Descrição, número de Destinatários Cadastrados membros e número de E-mails Avulsos membros.
*   **Busca:** Pesquisa por Nome ou Descrição do grupo.
*   **Ações na Lista (para cada grupo):**
    *   **Visualizar (👁️):** Abre uma tela que mostra os detalhes do grupo, incluindo a lista completa de todos os membros (cadastrados e avulsos).
    *   **Editar (✏️):** Abre o formulário para modificar o nome, descrição ou membros do grupo.
    *   **Excluir (🗑️):** Move o grupo para a Lixeira Global. Isso não exclui os destinatários individuais que eram membros, apenas o agrupamento.

**Uso no Compositor de E-mail:**
*   Ao digitar nos campos "Para", "CC" ou "CCO" do compositor, os Grupos de Destinatários que corresponderem ao termo digitado aparecerão como sugestões.
*   Selecionar um grupo adicionará (de forma expandida no momento do envio do \`.eml\`) todos os seus membros com e-mails válidos ao campo correspondente do e-mail. No formulário do compositor, o grupo aparece como uma única "pill".

Os Grupos de Destinatários são distintos dos Grupos de Servidores. Enquanto Grupos de Servidores são focados na organização interna da equipe (e podem ser usados para e-mails se os servidores tiverem e-mail cadastrado), os Grupos de Destinatários são especificamente para agrupar contatos de e-mail, que podem ser internos ou externos.
`
        }
    ]
};