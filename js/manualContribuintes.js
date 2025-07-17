// js/manualContribuintes.js - Conteúdo do Manual do Usuário para o Módulo de Contribuintes
// v1.3 - Adiciona seção sobre Dossiê do Contribuinte e menção à Inscrição Estadual.
// v1.2 - Adiciona subseção sobre Matriz/Filial e atualiza campos do formulário e funcionalidades.
// v1.1 - Adiciona subseção sobre Placeholders de Contribuinte.
// v1.0 - Conteúdo detalhado para o Módulo de Contribuintes

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ManualConteudo = window.SEFWorkStation.ManualConteudo || {};

window.SEFWorkStation.ManualConteudo.Contribuintes = {
    idSecaoDOM: "manual-modulo-contribuintes",
    tituloSecaoDisplay: "3. Módulo de Contribuintes",
    anchorText: "Módulo Contribuintes",
    subsecoes: [
        {
            idSubSecaoDOM: "contrib-visao-geral",
            tituloSubsecaoDisplay: "3.1. Visão Geral do Módulo de Contribuintes",
            conteudoMarkdown: `
O Módulo de Contribuintes é essencial para centralizar e gerenciar todas as informações relevantes sobre as pessoas físicas (CPF) ou jurídicas (CNPJ) com as quais sua atividade profissional se relaciona. Isso pode incluir clientes, fornecedores, partes interessadas em processos, entre outros.

**Principais Funcionalidades Detalhadas:**

*   **Cadastro Completo e Flexível:**
    *   **Dados de Identificação:** Registre informações fundamentais como Nome Completo/Razão Social, CPF ou CNPJ (com validação de formato básico), e **Inscrição Estadual**. Um número de identificação interno é gerado automaticamente pelo sistema para referência única.
    *   **Estrutura Matriz/Filial:** Vincule contribuintes em uma hierarquia, marcando um como "Matriz" e associando outros como suas "Filiais".
    *   **Informações de Contato:** Armazene múltiplos detalhes de contato, incluindo E-mail, Telefone e Endereço completo.
    *   **Observações Gerais:** Um campo de texto livre para quaisquer notas ou observações pertinentes sobre o contribuinte.

*   **Organização Avançada:**
    *   **Categorias de Contribuinte:** Crie uma estrutura hierárquica para classificar seus contribuintes (ex: "Clientes / Ativos / Contratos Grandes"). Utilize "/" para criar subníveis.
    *   **Tags de Contribuinte:** Aplique etiquetas flexíveis para marcar contribuintes com atributos ou status (ex: \`VIP\`, \`Inativo\`, \`Pendente Follow-up\`).

*   **Campos Personalizados (Extensibilidade):**
    *   Adicione campos de informação que não são padrão no formulário (ex: "Inscrição Municipal", "Código do Cliente Legado"). Isso torna o cadastro extremamente adaptável.

*   **Placeholders Personalizados de Contribuinte:**
    *   Crie marcadores (placeholders) como \`{{IE_CLIENTE}}\` que podem ser usados em Modelos de Documento para preenchimento automático.
    *   Gerencie esses placeholders em **Contribuintes > Gerir Placeholders de Contribuinte**.

*   **Anexos Específicos do Contribuinte:**
    *   Vincule arquivos diretamente ao cadastro do contribuinte, como cópias de contrato social, procurações, etc.

*   **Vínculos Abrangentes:**
    *   Associe contribuintes a diversas outras entidades do sistema:
        *   **Documentos, E-mails, Recursos, Tarefas, Notas Rápidas e Processos.**
    *   Esses vínculos criam um mapa completo do relacionamento com o contribuinte, e são visíveis na tela de visualização de cada entidade.

*   **Dossiê do Contribuinte:**
    *   Uma ferramenta de relatório que gera uma página HTML completa e profissional com todos os dados do contribuinte e um resumo de todos os seus itens vinculados, pronta para impressão ou para salvar como PDF.

*   **Busca e Filtragem Eficiente:**
    *   Localize contribuintes rapidamente usando a busca por Nome, CPF/CNPJ, e outros campos.
    *   Filtre a lista de contribuintes por Categorias e Tags específicas.

*   **Lixeira:**
    *   Contribuintes excluídos são movidos para a Lixeira Global, permitindo restauração ou exclusão definitiva.

**Acesso às Funcionalidades do Módulo de Contribuintes (Menu Principal "Contribuintes"):**
*   **Novo Contribuinte:** Abre o formulário para adicionar um novo cadastro.
*   **Gerir Contribuintes:** Exibe a lista principal de todos os contribuintes ativos.
*   **Gerir Categorias de Contribuintes:** Interface para administrar as categorias.
*   **Gerir Tags de Contribuintes:** Interface para administrar as tags.
*   **Gerir Placeholders de Contribuinte:** Ferramenta para criar e mapear placeholders personalizados.
*   **Novo Recurso / Gerir Recursos:** Atalhos para o módulo de Recursos, que está fortemente ligado a contribuintes.
`
        },
        {
            idSubSecaoDOM: "contrib-cadastrar-editar",
            tituloSubsecaoDisplay: "3.2. Cadastrando e Editando Contribuintes",
            conteudoMarkdown: `
O formulário de contribuinte é onde você insere e atualiza todas as informações pertinentes.

**Para Cadastrar um Novo Contribuinte:**
1.  No menu principal, navegue até **Contribuintes > Novo Contribuinte**.
2.  Preencha os campos:
    *   **Nome / Razão Social:** \`[Obrigatório]\` O nome completo da pessoa física ou a razão social da pessoa jurídica.
    *   **CPF / CNPJ:** Documento de identificação fiscal.
    *   **Inscrição Estadual:** (Opcional) Número da Inscrição Estadual.
    *   **Estrutura Matriz/Filial:** Veja a próxima seção para detalhes.
    *   **Informações de Contato:** Email, Telefone e Endereço.
    *   **Organização (Categorias e Tags):** Comece a digitar para ver sugestões. Pressione **Enter** ou **vírgula** para adicionar o termo. Se não existir, a tag/categoria será criada automaticamente em segundo plano, sem interromper o seu trabalho.
    *   **Campos Personalizados:** Adicione campos extras clicando em "Adicionar Campo".
    *   **Vincular a Outras Entidades:** Associe o contribuinte a documentos, tarefas, processos, etc., clicando em "Gerenciar Vínculos".
    *   **Anexos:** Anexe arquivos relevantes clicando em "Escolher arquivos".
    *   **Observações:** Adicione notas gerais.
3.  **Ações no final do formulário:**
    *   **Cancelar:** Descarta o novo cadastro e volta à tela anterior.
    *   **Salvar e Novo:** Salva o contribuinte atual e limpa o formulário para que você possa cadastrar o próximo em sequência. Uma mensagem de sucesso rápida (toast) é exibida.
    *   **Salvar Contribuinte:** Salva o novo contribuinte e navega para a página "Gerir Contribuintes".

**Para Editar um Contribuinte Existente:**
1.  Vá em **Contribuintes > Gerir Contribuintes**.
2.  Encontre o contribuinte na lista e clique no ícone de **lápis (✏️ Editar)**.
3.  O formulário será aberto com os dados preenchidos.
4.  Faça as alterações desejadas e clique em **"Atualizar Contribuinte"** para salvar. Você será redirecionado para a tela de visualização do contribuinte atualizado.
`
        },
        {
            idSubSecaoDOM: "contrib-matriz-filial",
            tituloSubsecaoDisplay: "3.3. Configurando a Estrutura Matriz/Filial",
            conteudoMarkdown: `
O SEFWorkStation permite que você estabeleça uma relação hierárquica entre seus contribuintes, definindo quais são Matrizes e quais são suas Filiais.

**Como funciona:**
*   A relação é sempre de **Filial para Matriz**. Ou seja, no cadastro de uma filial, você aponta qual é a sua matriz. O sistema então exibe a relação inversa (as filiais) na tela da matriz.
*   Um contribuinte **não pode** ser uma Matriz e uma Filial ao mesmo tempo.

**Configurando no Formulário do Contribuinte:**
A seção "Estrutura Matriz/Filial" no formulário de cadastro/edição oferece duas opções:

1.  **Para definir um contribuinte como MATRIZ:**
    *   Marque a caixa de seleção **"Este contribuinte é uma Matriz"**.
    *   Ao fazer isso, a seção para vincular a uma matriz será desabilitada, pois uma matriz não pode ser filial de outra empresa.
    *   Salve o contribuinte. Agora ele aparecerá como uma opção na busca por matrizes ao cadastrar outras empresas.

2.  **Para definir um contribuinte como FILIAL (vincular a uma Matriz):**
    *   **NÃO** marque a caixa "Este contribuinte é uma Matriz".
    *   Na seção "Vincular a uma Matriz (se for Filial)", comece a digitar o nome ou o CNPJ da matriz no campo de busca.
    *   Uma lista suspensa aparecerá com sugestões de todos os contribuintes que já foram marcados como "Matriz" no sistema.
    *   Clique na matriz correta na lista de sugestões.
    *   Uma "pílula" azul aparecerá acima do campo de busca, confirmando a seleção. Para remover o vínculo, clique no "X" dentro da pílula.
    *   Salve o contribuinte.

**Visualizando a Estrutura:**
*   Após salvar, vá para a tela de visualização do contribuinte.
*   Haverá uma nova aba chamada "**Estrutura Organizacional**".
*   **Se você estiver visualizando uma Matriz:** Esta aba listará todas as filiais que estão vinculadas a ela.
*   **Se você estiver visualizando uma Filial:** Esta aba mostrará o nome da sua Matriz.
*   Todos os nomes na lista são links que permitem navegar diretamente entre os cadastros da matriz e suas filiais.
`
        },
        {
            idSubSecaoDOM: "contrib-categorias-gerenciar",
            tituloSubsecaoDisplay: "3.4. Gerenciando Categorias de Contribuinte",
            conteudoMarkdown: `
As Categorias de Contribuinte oferecem uma forma estruturada e hierárquica de classificar os contribuintes, semelhante a um sistema de pastas e subpastas.

**Acesso à Gestão de Categorias:**
*   No menu principal, navegue até **Contribuintes > Gerir Categorias de Contribuintes**.

**Funcionalidades:**
*   **Adicionar Nova Categoria:** Digite o nome no campo superior. Use "/" para criar subníveis (ex: \`Clientes / Ativos\`).
*   **Editar Categoria:** Clique no botão "Editar" (✏️). A alteração será refletida em todos os contribuintes que usam essa categoria.
*   **Excluir Categoria:** Clique no botão "Excluir" (🗑️). A categoria será removida da lista e de todos os contribuintes associados.
`
        },
        {
            idSubSecaoDOM: "contrib-tags-gerenciar",
            tituloSubsecaoDisplay: "3.5. Gerenciando Tags de Contribuinte",
            conteudoMarkdown: `
As Tags de Contribuinte são etiquetas flexíveis e não hierárquicas para adicionar palavras-chave ou status aos seus contribuintes.

**Acesso à Gestão de Tags:**
*   No menu principal, navegue até **Contribuintes > Gerir Tags de Contribuintes**.

**Funcionalidades:**
*   **Adicionar Nova Tag:** Digite o nome da tag e clique em "Adicionar".
*   **Editar Tag:** Clique no botão "Editar" (✏️) para renomear a tag. A mudança será aplicada a todos os contribuintes que a utilizam.
*   **Excluir Tag:** Clique no botão "Excluir" (🗑️) para remover a tag da lista e de todos os contribuintes.
`
        },
        {
            idSubSecaoDOM: "contrib-placeholders",
            tituloSubsecaoDisplay: "3.6. Gerenciando Placeholders de Contribuinte",
            conteudoMarkdown: `
A funcionalidade de "Placeholders de Contribuinte" é uma ferramenta avançada para automatizar a criação de documentos. Ela permite que você defina marcadores personalizados (placeholders) que, quando usados em um modelo de documento, são automaticamente substituídos pelos dados específicos do contribuinte.

**Acesso:**
*   No menu principal, navegue até **Contribuintes > Gerir Placeholders de Contribuinte**.

**Conceitos Fundamentais:**
*   **Placeholder:** Um marcador de texto envolto em chaves duplas, como \`{{NOME_DO_PLACEHOLDER}}\`.
*   **Placeholders Padrão:** O sistema já reconhece placeholders como \`{{NOME}}\`, \`{{CPF_CNPJ}}\`, \`{{INSCRICAO_ESTADUAL}}\`, \`{{EMAIL}}\`, etc. Estes não precisam ser cadastrados.
*   **Placeholders Personalizados:** São os placeholders que você cria para buscar dados de **Campos Personalizados** que você adicionou aos seus contribuintes.

**Como Funciona:**
1.  Vá para **Gerir Placeholders de Contribuinte**.
2.  Crie um novo placeholder, definindo:
    *   **Nome de Exibição:** Um nome amigável para você (ex: "Número do Contrato Principal").
    *   **Nome Interno:** O nome técnico para o modelo (ex: \`NUMERO_CONTRATO\`).
    *   **Mapear para Campo do Contribuinte:** Um menu suspenso listará todos os campos padrão e os campos personalizados que você já usou. Selecione o campo de onde o valor deve ser extraído.
3.  Salve o placeholder.
4.  Agora, ao usar \`{{NUMERO_CONTRATO}}\` em um modelo de documento, ele será substituído pelo valor do campo "Número do Contrato" do contribuinte selecionado.
`
        },
        {
            idSubSecaoDOM: "contrib-dossie",
            tituloSubsecaoDisplay: "3.7. Gerando um Dossiê do Contribuinte",
            conteudoMarkdown: `
O Dossiê do Contribuinte é uma poderosa ferramenta de relatório que compila todas as informações sobre um contribuinte específico em uma única página HTML, formatada profissionalmente e pronta para ser impressa ou salva como PDF.

**Acesso:**
1.  Vá em **Contribuintes > Gerir Contribuintes**.
2.  Localize o contribuinte para o qual deseja gerar o dossiê.
3.  Clique no título do contribuinte ou no ícone "Visualizar" (👁️) para abrir a tela de visualização detalhada.
4.  Na tela de visualização, clique no botão **"Gerar Dossiê"** (geralmente com um ícone de documento 📄).

**Funcionalidades do Dossiê:**

*   **Modal de Opções:** Antes de gerar, uma janela (modal) aparecerá, permitindo que você personalize o conteúdo do dossiê:
    *   **Seleção de Seções:** Marque ou desmarque quais tipos de informações vinculadas você deseja incluir (ex: Documentos, Tarefas, Processos, etc.).
    *   **Linha do Tempo:** Inclua uma linha do tempo cronológica com todos os eventos importantes relacionados ao contribuinte.
    *   **Filtro de Período:** Defina uma data de início e fim para incluir apenas eventos e itens vinculados dentro desse intervalo de tempo.
    *   **Incluir Conteúdo Completo:** Marque esta opção para que o conteúdo completo de documentos e notas seja incluído no dossiê. Se desmarcado, apenas resumos serão exibidos.
*   **Geração:** Ao clicar em "Gerar Dossiê HTML", uma nova aba do navegador será aberta com o dossiê.
*   **Conteúdo do Dossiê:**
    *   **Página de Rosto:** Uma capa com o título "Dossiê do Contribuinte", o nome do contribuinte e a data de geração.
    *   **Dados de Identificação:** Todas as informações do cadastro do contribuinte.
    *   **Linha do Tempo (se selecionada):** Uma visualização cronológica de todos os eventos.
    *   **Seções de Itens Vinculados:** Seções separadas para cada tipo de entidade (Documentos, PTAs, etc.), listando os itens em tabelas resumidas ou com conteúdo completo, conforme sua seleção.
*   **Impressão e Salvamento:**
    *   A nova aba com o dossiê pode ser impressa diretamente (Ctrl+P ou Cmd+P).
    *   A maioria dos navegadores oferece a opção de "Salvar como PDF" na janela de impressão, permitindo que você crie um arquivo PDF do dossiê.

Esta funcionalidade é ideal para consolidar informações para reuniões, auditorias, ou para arquivar um registro completo do relacionamento com um contribuinte em um determinado momento.
`
        }
    ]
};