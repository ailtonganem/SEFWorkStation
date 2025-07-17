// js/manualDocumentos.js - Conteúdo do Manual do Usuário para o Módulo de Documentos
// v1.2 - Adiciona seção de Histórico de Versões. Renumera seções subsequentes.
// v1.1 - Adiciona subseção sobre Criação de Documentos em Lote.
// v1.0 - Conteúdo detalhado para o Módulo de Documentos

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ManualConteudo = window.SEFWorkStation.ManualConteudo || {};

window.SEFWorkStation.ManualConteudo.Documentos = {
    idSecaoDOM: "manual-modulo-documentos",
    tituloSecaoDisplay: "2. Módulo de Documentos",
    anchorText: "Módulo Documentos",
    subsecoes: [
        {
            idSubSecaoDOM: "doc-visao-geral",
            tituloSubsecaoDisplay: "2.1. Visão Geral do Módulo de Documentos",
            conteudoMarkdown: `
O módulo de Documentos é uma das espinhas dorsais do SEFWorkStation. Ele foi projetado para ser uma solução completa para a criação, edição, organização e recuperação de todos os seus documentos importantes. Seja para redigir ofícios, pareceres, relatórios, minutas ou qualquer outro tipo de texto, este módulo oferece as ferramentas necessárias.

**Principais Funcionalidades Detalhadas:**

*   **Criação e Edição Avançada:**
    *   Utilize um editor de texto rico (WYSIWYG - "What You See Is What You Get") que permite formatação visual intuitiva, incluindo negrito, itálico, sublinhado, listas numeradas e com marcadores, diferentes níveis de cabeçalho, alinhamento de texto, citações, blocos de código e mais.
    *   **Colar Imagens:** Copie imagens de outras fontes (capturas de tela, arquivos) e cole-as (Ctrl+V ou Cmd+V) diretamente no editor. As imagens são convertidas para o formato base64 e incorporadas ao HTML do documento, garantindo que fiquem salvas junto com o texto, mesmo offline.
    *   **Links:** Crie hiperlinks para URLs externas ou para outros recursos.
    *   **Limpeza de Formatação:** Remova toda a formatação de um texto selecionado, útil ao colar conteúdo de fontes externas.

*   **Modelos Inteligentes:**
    *   Transforme qualquer documento em um modelo reutilizável.
    *   Modelos podem conter **placeholders** (ex: \`{{NOME_CLIENTE}}\`, \`{{DATA_VENCIMENTO}}\`) que são automaticamente substituídos por informações relevantes ao gerar um novo documento a partir do modelo, especialmente útil na criação em lote.
    *   Isso economiza tempo, garante padronização e reduz erros.

*   **Organização Multifacetada:**
    *   **Tipos de Documento:** Uma classificação primária e fundamental (Ex: "Ofício", "Relatório Anual", "Parecer Técnico"). Novos tipos podem ser criados dinamicamente durante a edição de um documento ou gerenciados em uma seção dedicada. A escolha do tipo pode influenciar a geração automática de referências.
    *   **Categorias:** Um sistema hierárquico de pastas (Ex: \`Departamentos / Financeiro / Relatórios Mensais / 2024\`). Use o caractere "/" para definir níveis de subcategoria. Um documento pode pertencer a múltiplas categorias.
    *   **Tags:** Palavras-chave flexíveis e não hierárquicas para associar documentos a temas, projetos ou status específicos (Ex: \`Urgente\`, \`Projeto Alpha\`, \`Revisão Pendente\`, \`Fiscalização\`). Um documento pode ter várias tags.

*   **Anexos Físicos:**
    *   Vincule arquivos externos de qualquer formato (PDFs, planilhas do Excel, apresentações do PowerPoint, imagens originais, etc.) diretamente aos seus documentos.
    *   Os arquivos anexados são copiados e armazenados de forma organizada dentro da pasta da aplicação (\`attachments_sef/documents/[ID_DO_DOCUMENTO]/\`), garantindo que o sistema permaneça autocontido e offline.
    *   É crucial conceder permissão de escrita à pasta da aplicação para esta funcionalidade.

*   **Vínculos Contextuais:**
    *   Crie uma teia de informações relacionando documentos a:
        *   Outros documentos (ex: referências, documentos base).
        *   Contribuintes (ex: um contrato com um cliente, uma notificação para um fornecedor).
        *   Recursos (administrativos ou judiciais).
        *   Tarefas (ex: "Elaborar minuta do documento X").
        *   Notas Rápidas (para lembretes ou informações adicionais sobre o documento).
        *   Processos (Protocolos, PTAs, Autuações).
    *   Esses vínculos são, em muitos casos, bidirecionais, facilitando a navegação e a visão 360 graus da informação.

*   **Busca e Filtragem Abrangente:**
    *   **Busca Global:** Localizada no cabeçalho da aplicação, permite pesquisar por palavras-chave em todos os campos textuais dos documentos, incluindo título, conteúdo, referência, categorias, tags e notas internas.
    *   **Filtros Rápidos:** Também no cabeçalho, refine a lista de documentos (principalmente em "Gerir Documentos") por Tipo, Categoria, Tag e Ordenação (data de modificação).

*   **Criação em Lote:**
    *   Uma ferramenta poderosa para gerar múltiplos documentos personalizados a partir de um único modelo e uma lista de contribuintes.
    *   Ideal para envio de comunicados, contratos padronizados, notificações, etc.
    *   Placeholders no modelo são substituídos pelos dados de cada contribuinte selecionado.
    *   Placeholders "variáveis" podem ser definidos para inserir dados específicos para cada documento gerado no lote.

*   **Favoritos:**
    *   Marque documentos importantes com uma estrela (⭐) para fácil acesso e destaque nas listagens e no menu de "Acesso Rápido".

*   **Notas Internas:**
    *   Um campo de texto para anotações privadas, lembretes ou informações de rascunho que não fazem parte do corpo principal do documento. Suporta formatação Markdown.

*   **Lixeira:**
    *   Documentos excluídos não são apagados permanentemente de imediato. Eles são movidos para a Lixeira Global, de onde podem ser restaurados ou excluídos de forma definitiva.

**Acesso às Funcionalidades do Módulo de Documentos (Menu Principal "Documentos"):**
*   **Novo Documento:** Abre o formulário para criar um documento do zero.
*   **Gerir Documentos:** Exibe a lista principal de todos os documentos que não são modelos nem estão na lixeira. É aqui que você pode visualizar, editar, excluir e aplicar filtros globais.
*   **Criar Documentos em Lote:** Acessa a interface para geração massiva de documentos.
*   **Gerenciar Lotes de Documentos:** Permite visualizar o histórico e os detalhes dos lotes de documentos que foram gerados.
*   **Gerir Modelos:** Mostra uma lista de todos os documentos que foram marcados como "Modelo".
*   **Gerir Tipos de Documento:** Interface para criar, editar e excluir os Tipos de Documento.
*   **Gerir Categorias:** Interface para criar, editar e excluir as Categorias de Documento.
*   **Gerir Tags:** Interface para criar, editar e excluir as Tags de Documento.
`
        },
        {
            idSubSecaoDOM: "doc-criar-editar",
            tituloSubsecaoDisplay: "2.2. Criando e Editando Documentos",
            conteudoMarkdown: `
A criação e edição de documentos são processos centrais no SEFWorkStation. O formulário é projetado para ser intuitivo e completo.

**Para Criar um Novo Documento:**
1.  No menu principal, navegue até **Documentos > Novo Documento**.
2.  O formulário será apresentado. Os campos principais são:
    *   **Título do Documento:** \`[Obrigatório]\` Um nome claro e descritivo. Ele aparecerá nas listagens e buscas.
    *   **Tipo de Documento:** \`[Obrigatório]\` Comece a digitar para ver sugestões de tipos existentes (ex: "Ofício", "Relatório", "Parecer Técnico"). Se o tipo que você precisa não existir, simplesmente digite o nome completo e ele será criado e salvo para uso futuro quando o documento for salvo. A escolha do tipo pode influenciar a geração automática do campo "Referência/Número" se este for deixado em branco.
        *   *Exemplo de criação de tipo:* Se digitar "Despacho Interno" e este tipo não existir, ele será criado.
        *   *Hierarquia de Tipos:* Você pode criar uma hierarquia usando "/". Ex: "Comunicação / Interna / Memorando".
    *   **Categorias:** \`[Obrigatório pelo menos uma]\` Organize seus documentos em uma estrutura de pastas.
        *   Comece a digitar no campo de categorias. Sugestões de categorias existentes (e suas hierarquias) aparecerão.
        *   Para criar uma nova categoria ou subcategoria, digite o caminho completo usando "/" como separador (ex: \`Contratos / Clientes / 2024\`).
        *   Pressione **Enter** após digitar o nome da categoria para adicioná-la ao documento. Se a categoria (ou parte da hierarquia) não existir, ela será criada.
        *   Um documento pode ser associado a múltiplas categorias. As categorias adicionadas aqui ficam disponíveis para outros documentos.
    *   **Tags:** Adicione palavras-chave para facilitar a busca e o agrupamento.
        *   Digite uma tag no campo e pressione **Enter** ou **vírgula (,)** para adicioná-la.
        *   Sugestões de tags existentes aparecerão conforme você digita.
        *   Se uma tag digitada não existir, ela será criada automaticamente. Um documento pode ter várias tags.
    *   **Conteúdo do Documento:** \`[Obrigatório]\` O corpo principal do seu documento.
        *   **Editor de Texto Rico (Quill.js):**
            *   **Barra de Ferramentas:** Utilize os botões para aplicar formatações como Negrito (\`B\`), Itálico (\`I\`), Sublinhado (\`U\`), Riscado (\`S\`), Listas numeradas e com marcadores, Citações (\`"\`), Blocos de código (\`</>\`), Links, Cores de texto e fundo, Tamanhos e tipos de fonte, Cabeçalhos (H1-H6), etc.
            *   **Colar Conteúdo:** Ao colar texto de outras fontes (Word, web), o editor tenta manter a formatação, mas você pode usar a opção "Limpar Formatação" (ícone de borracha) se necessário.
            *   **Colar Imagens:** Imagens copiadas para a área de transferência (Ctrl+C/Cmd+C) podem ser coladas diretamente no editor (Ctrl+V/Cmd+V). Elas são convertidas para o formato base64 e embutidas no HTML do documento, ficando salvas offline junto com o texto.
        *   **Inserir Placeholder:** Acima do editor, você encontrará o botão **"Inserir Placeholder {}"**.
            *   Clique nele para abrir um dropdown com todos os placeholders de contribuinte disponíveis (padrão do sistema e os personalizados que você criou em "Contribuintes > Gerir Placeholders").
            *   Você pode pesquisar na lista. Clique em um placeholder para inseri-lo no editor no formato \`{{NOME_DO_PLACEHOLDER}}\`.
            *   Este recurso é especialmente útil ao criar ou editar Modelos de Documento.
    *   **Notas Internas (Markdown, Opcional):** Um campo de texto simples para suas anotações privadas sobre o documento. Estas notas não são parte do conteúdo principal "imprimível", mas são pesquisáveis. Suporta a sintaxe Markdown para formatação básica (ex: \`**negrito**\`, \`*itálico*\`, \`# Título\`).
    *   **Anexos:**
        *   Clique no botão "Escolher arquivos" para abrir o seletor de arquivos do seu sistema operacional.
        *   Você pode selecionar um ou múltiplos arquivos. Os nomes dos arquivos selecionados aparecerão listados na seção "Novos Anexos para Adicionar".
        *   Ao salvar/atualizar o documento, estes arquivos serão copiados para a pasta de anexos da aplicação.
    *   **Vincular a Outras Entidades:**
        *   Esta seção permite criar links para outros itens dentro do SEFWorkStation. Para cada tipo de entidade (Documentos, Contribuintes, Recursos, Tarefas, Notas Rápidas, Protocolos, PTAs, Autuações, Servidores):
            1.  Clique no botão "Gerenciar Vínculos".
            2.  Uma janela (modal) será aberta, listando os itens disponíveis daquele tipo.
            3.  Use o campo de busca dentro do modal para encontrar os itens desejados.
            4.  Marque as caixas de seleção ao lado dos itens que você quer vincular.
            5.  Clique em "Confirmar Seleção".
            6.  Os itens selecionados aparecerão como "pills" (pequenas etiquetas) abaixo do respectivo botão "Gerenciar Vínculos", indicando que estão prontos para serem vinculados ao salvar o documento.
    *   **Opções (no cabeçalho do formulário ou em seção específica):**
        *   **Marcar como Modelo:** Se esta caixa estiver marcada, o documento será salvo como um Modelo, aparecendo na lista "Gerir Modelos" e podendo ser usado como base para novos documentos ou para criação em lote.
        *   **Marcar como Favorito ⭐:** Destaca o documento com uma estrela, facilitando sua localização em listagens e no menu de "Acesso Rápido".

3.  **Botões de Ação no final do formulário:**
    *   **Cancelar:** Descarta todas as alterações (se editando) ou o novo documento (se criando) e retorna à tela anterior (definida por \`originatingView\`).
    *   **Salvar como Modelo:** Uma forma rápida de salvar o documento atual diretamente como um modelo. O documento será marcado como modelo e salvo. Geralmente, após esta ação, o sistema pode abrir um novo formulário em branco ou retornar à lista de modelos.
    *   **Salvar e Novo:** Salva o documento atual e, em seguida, limpa o formulário para que você possa criar outro documento imediatamente, sem ter que voltar para a lista e clicar em "Novo Documento" novamente.
    *   **Salvar Documento** (ou **Atualizar Documento** se editando): A ação principal. Salva todas as informações e vínculos e, geralmente, navega para a tela de visualização do documento recém-salvo/atualizado.

**Para Editar um Documento Existente:**
1.  Acesse a lista de documentos em **Documentos > Gerir Documentos** ou, se for um modelo, em **Documentos > Gerir Modelos**.
2.  Localize o documento/modelo desejado na lista. Você pode usar os filtros de busca no cabeçalho da aplicação para encontrá-lo mais rapidamente.
3.  Na linha correspondente ao item, clique no ícone de **lápis (✏️ Editar)**.
4.  O formulário será aberto com todos os dados do documento/modelo preenchidos.
5.  Faça as alterações necessárias em qualquer um dos campos descritos acima.
6.  Clique em **"Atualizar Documento"** (ou **"Atualizar Modelo"**).
`
        },
        {
            idSubSecaoDOM: "doc-versionamento",
            tituloSubsecaoDisplay: "2.3. Histórico de Versões",
            conteudoMarkdown: `
O SEFWorkStation possui um sistema de versionamento automático para Documentos e Notas Rápidas, garantindo que você não perca versões anteriores importantes do seu trabalho.

**Como Funciona:**
*   **Salvamento Automático de Versão Anterior:** Toda vez que você **salva uma alteração** em um documento existente, o sistema automaticamente pega a versão *anterior* (o estado do documento antes das suas novas alterações) e a salva como uma versão arquivada, vinculada ao documento principal.
*   **Não cria versões a cada letra digitada:** O versionamento ocorre apenas no ato de salvar, criando um histórico de "snapshots" significativos do seu documento ao longo do tempo.
*   **O que é salvo:** A versão arquivada inclui o título, conteúdo, categorias, tags e outros metadados do documento no momento em que ele foi salvo anteriormente.

**Acessando o Histórico de Versões:**
1.  Abra um documento para **visualização** (clicando no título dele na lista "Gerir Documentos").
2.  Role a tela para baixo até encontrar a seção "**Histórico de Versões**".
3.  Esta seção listará todas as versões anteriores que foram salvas para aquele documento, com a data e hora em que cada versão foi arquivada.

**Ações no Histórico de Versões:**
*   **Visualizar:** Ao lado de cada versão listada, há um botão "Visualizar". Clicar nele abrirá uma janela (modal) mostrando o conteúdo completo daquela versão específica, apenas para leitura. Isso permite que você compare o conteúdo antigo com o atual ou copie trechos de texto.
*   **Restaurar:** O botão "Restaurar" permite que você reverta o documento principal para o estado daquela versão antiga.
    *   **Confirmação:** O sistema pedirá uma confirmação, pois esta ação substituirá o conteúdo atual do documento.
    *   **Como funciona a restauração:**
        1.  A versão **atual** do documento (a que você está prestes a substituir) é primeiro salva como uma nova versão arquivada, garantindo que você não perca seu trabalho mais recente.
        2.  Em seguida, o conteúdo, título e outros metadados da versão que você escolheu restaurar são copiados para o documento principal.
        3.  A página de visualização do documento é recarregada para mostrar o conteúdo restaurado.
    *   A versão antiga que você usou para restaurar permanece no histórico, sem ser alterada.

Este sistema oferece uma rede de segurança poderosa, permitindo que você edite seus documentos com a tranquilidade de saber que pode sempre voltar a um estado anterior se necessário.
`
        },
        {
            idSubSecaoDOM: "doc-lote",
            tituloSubsecaoDisplay: "2.4. Criando Documentos em Lote",
            conteudoMarkdown: `
A ferramenta de Criação de Documentos em Lote é uma das funcionalidades mais poderosas para otimizar a produtividade, permitindo gerar múltiplos documentos personalizados a partir de um único modelo e uma lista de contribuintes. É ideal para criar contratos, notificações, comunicados, ofícios padronizados, entre outros.

**Acesso:**
*   No menu principal, navegue até **Documentos > Criar Documentos em Lote**.

**Passo a Passo da Interface:**

**1. Seleção do Modelo e Placeholders Variáveis:**
*   **Modelo de Documento:** \`[Obrigatório]\` No primeiro campo, selecione na lista suspensa o modelo que servirá como base para todos os documentos a serem gerados. A lista contém todos os documentos que você marcou como "Modelo".
*   **Análise de Placeholders:** Após selecionar um modelo, o sistema o analisa e exibe os placeholders (\`{{...}}\`) encontrados no título e no conteúdo. Eles são classificados em três tipos:
    *   **Automático: Sistema:** Placeholders padrão como \`{{NOME}}\` ou \`{{CPF_CNPJ}}\`. Serão preenchidos automaticamente com os dados do cadastro de cada contribuinte selecionado.
    *   **Automático: Contribuinte:** Placeholders que você criou e mapeou em **Contribuintes > Gerir Placeholders de Contribuinte**. Também são preenchidos automaticamente.
    *   **Não Mapeado (Variável):** Placeholders encontrados no modelo que não são padrão do sistema nem foram mapeados por você. Estes são os **placeholders variáveis**.
*   **Marcar como Variável:** Para os placeholders não mapeados, uma caixa de seleção aparecerá ao lado. Marque esta caixa se você deseja fornecer um valor diferente para este placeholder **para cada documento/contribuinte** no lote. Se você não marcar, o placeholder (\`{{NOME_DO_PLACEHOLDER}}\`) permanecerá como texto literal no documento final.

**2. Configurações dos Documentos Gerados:**
*   **Padrão para Título:** Defina como o título de cada documento gerado será formado. As opções combinam o título do modelo original, o nome do contribuinte, a data atual e a referência do contribuinte. Exemplo: "[Título do Modelo] - [Nome do Contribuinte]".
*   **Nome para este Lote (Opcional):** Dê um nome descritivo para este lote de geração (ex: "Contratos de Serviço - Maio 2024"). Isso ajuda a identificar a operação no "Gerenciar Lotes de Documentos".
*   **Categorias e Tags Padrão:** Adicione categorias e tags que serão aplicadas a **todos** os documentos gerados neste lote, além daquelas que já vieram do modelo.

**3. Seleção de Contribuintes:**
*   Uma lista de todos os seus contribuintes ativos é exibida.
*   **Filtros:** Use os filtros por termo de busca, categoria de contribuinte e tag de contribuinte para refinar a lista e encontrar os destinatários desejados.
*   **Seleção:** Marque a caixa de seleção ao lado de cada contribuinte para o qual um documento deve ser gerado.
*   **Selecionar Todos Visíveis:** Um checkbox no topo permite selecionar (ou desmarcar) todos os contribuintes que estão atualmente visíveis na lista (respeitando os filtros aplicados).

**4. Tabela de Dados Variáveis (se aplicável):**
*   Esta seção só aparece se você marcou pelo menos um placeholder como variável no Passo 1 e selecionou pelo menos um contribuinte no Passo 3.
*   Uma tabela é exibida com:
    *   Uma linha para cada contribuinte selecionado.
    *   Uma coluna para cada placeholder que você marcou como variável.
*   **Preenchimento:** Preencha os campos da tabela com os valores específicos que você deseja para cada placeholder em cada documento. Por exemplo, para um placeholder \`{{VALOR_CONTRATO}}\`, você pode inserir "R$ 1.500,00" para o Contribuinte A e "R$ 2.300,00" para o Contribuinte B.

**5. Opções Finais e Geração:**
*   **Exibir links...:** Marque esta opção se quiser ver uma lista com links para cada documento gerado após a conclusão do processo.
*   **Resumo da Geração:** Um pequeno painel mostra um resumo de quantos documentos serão criados.
*   **Botão "Gerar Documentos em Lote":**
    *   Clique neste botão para iniciar o processo.
    *   Uma barra de progresso aparecerá, mostrando o andamento da geração.
    *   Um log detalhará o sucesso ou falha para cada documento.
*   **Resultado:**
    *   Os novos documentos são criados e salvos no sistema.
    *   Um registro do lote é criado em **Documentos > Gerenciar Lotes de Documentos**.
    *   Você será redirecionado para a página de gerenciamento de lotes, onde pode ver os detalhes desta e de outras operações.
`
        },
        {
            idSubSecaoDOM: "doc-anexos",
            tituloSubsecaoDisplay: "2.5. Anexos em Documentos",
            conteudoMarkdown: `
Os documentos no SEFWorkStation podem ter arquivos externos anexados a eles, como PDFs, planilhas, imagens, ou qualquer outro tipo de arquivo relevante.

**Como Adicionar Anexos:**
1.  Ao **criar um novo documento** ou **editar um existente**, localize a seção "Anexos" no formulário. Ela geralmente se encontra após os campos de conteúdo e notas internas.
2.  Clique no botão rotulado como "**Escolher arquivos**" (ou similar, dependendo da estilização exata). Uma janela do seu sistema operacional será aberta, permitindo que você navegue pelas suas pastas.
3.  **Seleção de Arquivos:**
    *   Você pode selecionar **um único arquivo**.
    *   Para selecionar **múltiplos arquivos de uma vez**, mantenha pressionada a tecla \`Ctrl\` (no Windows/Linux) ou \`Cmd\` (no macOS) enquanto clica nos arquivos desejados.
4.  Após selecionar os arquivos e confirmar, os nomes dos arquivos escolhidos aparecerão listados na área "Novos Anexos para Adicionar" (ou similar), geralmente com o tamanho do arquivo ao lado.
5.  **Revisão Antes de Salvar:** Antes de salvar o documento, você pode revisar a lista de novos anexos. Se você selecionou um arquivo por engano, geralmente haverá um pequeno botão "X" ou "Remover" ao lado de cada nome de arquivo na lista de pré-visualização, permitindo que você o descarte da seleção atual.
6.  **Salvamento:** Ao clicar em "Salvar Documento" (ou "Atualizar Documento"), os arquivos que você selecionou serão efetivamente copiados para a estrutura de pastas da aplicação.
    *   **Local de Armazenamento:** Os arquivos são salvos em \`SUA_PASTA_RAIZ_DA_APLICACAO/attachments_sef/documents/[ID_DO_DOCUMENTO]/nome_do_arquivo.ext\`. O \`[ID_DO_DOCUMENTO]\` é um identificador único (UUID) gerado para cada documento.
    *   **Permissões:** É crucial que o SEFWorkStation tenha permissão de escrita na pasta raiz da aplicação. Se não tiver, o salvamento dos anexos falhará, e você receberá uma mensagem de erro.

**Visualizando e Baixando Anexos:**
1.  Abra um documento para visualização (clicando no título dele na lista "Gerir Documentos" ou "Gerir Modelos").
2.  Role a tela até encontrar a seção chamada "**Anexos**".
3.  Todos os anexos vinculados a esse documento serão listados, mostrando:
    *   O nome original do arquivo.
    *   O tamanho do arquivo (geralmente em KB ou MB).
4.  Ao lado de cada anexo, você encontrará um botão "**Abrir**" (frequentemente acompanhado de um ícone de download 📥).
5.  **Ação ao Clicar em "Abrir":**
    *   **Tipos Suportados pelo Navegador:** Se o anexo for de um tipo que o seu navegador consegue exibir diretamente (como PDF, TXT, imagens comuns como JPG, PNG, GIF, SVG), o navegador tentará abri-lo em uma nova aba ou na aba atual.
    *   **Outros Tipos:** Para arquivos que o navegador não exibe nativamente (ex: .docx, .xlsx, .zip, arquivos executáveis), ou se o navegador estiver configurado para sempre baixar, o download do arquivo será iniciado para a pasta de downloads padrão do seu sistema operacional.

**Gerenciando Anexos de um Documento Existente:**
*   **Adicionar Mais Anexos:** Edite o documento. Na seção "Anexos", use o botão "Escolher arquivos" para adicionar novos arquivos, que serão incluídos aos já existentes.
*   **Remover Anexos:**
    1.  Edite o documento.
    2.  Na seção "Anexos", os arquivos já vinculados aparecerão em uma lista de "Anexos Atuais".
    3.  Cada anexo existente terá um botão "Remover" (ou um ícone "X") ao seu lado.
    4.  Clique neste botão para o anexo que deseja desvincular.
    5.  **Importante:** Ao salvar/atualizar o documento após remover um anexo desta forma, o sistema não apenas remove o registro do anexo do banco de dados, mas também **tenta excluir o arquivo físico** da pasta \`attachments_sef/documents/[ID_DO_DOCUMENTO]/\`. Se a exclusão física falhar (ex: devido a permissões ou o arquivo estar em uso), o vínculo ainda será removido no sistema, mas o arquivo poderá permanecer órfão na pasta.

**Considerações Importantes sobre Anexos:**
*   **Tamanho e Quantidade:** Não há um limite rígido imposto pela aplicação, mas o bom senso deve prevalecer. Anexos muito grandes ou uma quantidade excessiva deles podem:
    *   Aumentar significativamente o tamanho do backup da sua aplicação (se você incluir anexos no backup ZIP).
    *   Tornar o carregamento e a listagem de anexos um pouco mais lentos.
    *   Consumir mais espaço em disco.
*   **Segurança:** Como os anexos são arquivos físicos armazenados no seu computador, eles estão sujeitos às mesmas políticas de segurança e backup que você aplica aos seus outros arquivos.
*   **Não Modifique Diretamente:** Evite renomear, mover ou excluir arquivos diretamente na pasta \`attachments_sef\` fora da interface do SEFWorkStation. Isso quebrará o vínculo com o documento no sistema e pode levar a erros ou à impossibilidade de acessar o anexo através da aplicação.
`
        },
        {
            idSubSecaoDOM: "doc-busca-filtros",
            tituloSubsecaoDisplay: "2.6. Buscando e Filtrando Documentos",
            conteudoMarkdown: `
Encontrar a informação certa rapidamente é crucial. O SEFWorkStation oferece várias ferramentas para isso.

**1. Busca Global (Cabeçalho - Linha 2)**

*   **Campo "Pesquisar em todos os documentos...":** Este é o seu principal ponto de partida para buscas amplas.
    *   **Como Funciona:** Digite um ou mais termos de busca neste campo e pressione Enter ou clique no ícone de lupa (🔎) ao lado.
    *   **Onde Busca:** A pesquisa é realizada nos seguintes campos de **todos** os documentos (exceto os que estão na lixeira e, geralmente, excluindo modelos, a menos que você esteja na view de modelos):
        *   **Título do Documento:** O nome principal que você deu ao documento.
        *   **Conteúdo do Documento:** O texto completo dentro do editor principal.
        *   **Referência/Número:** O código ou número de identificação que você atribuiu.
        *   **Categorias:** Os nomes das categorias associadas.
        *   **Tags:** As tags associadas.
        *   **Notas Internas:** O conteúdo das suas notas privadas sobre o documento.
    *   **Resultados:** Você será redirecionado para uma página dedicada ("Resultados da Busca") que lista todos os documentos que contêm o(s) seu(s) termo(s) de busca. Os termos pesquisados geralmente são destacados nos resultados para fácil identificação.

**2. Filtros Rápidos (Cabeçalho - Linha 2)**

Estes menus suspensos são aplicados principalmente quando você está visualizando a lista de documentos em **Documentos > Gerir Documentos** ou a lista de modelos em **Documentos > Gerir Modelos**. Eles permitem refinar a lista exibida sem sair da página.

*   **"Todos os Tipos":**
    *   Permite selecionar um "Tipo de Documento" específico (ex: "Ofício", "Relatório").
    *   A lista de documentos será atualizada para mostrar apenas aqueles que correspondem ao tipo selecionado.
    *   Selecione "Todos os Tipos" para remover este filtro.
*   **"Todas as Categorias":**
    *   Permite selecionar uma "Categoria de Documento" específica.
    *   Lembre-se que categorias podem ser hierárquicas (ex: "Financeiro / Balancetes"). O filtro buscará documentos que estejam diretamente nessa categoria ou em suas subcategorias, dependendo da implementação exata.
    *   Selecione "Todas as Categorias" para remover este filtro.
*   **"Todas as Tags":**
    *   Permite selecionar uma "Tag de Documento" específica.
    *   A lista mostrará apenas documentos que possuem a tag selecionada.
    *   Selecione "Todas as Tags" para remover este filtro.
*   **"Ordenar por:":**
    *   **Mais Recentes:** Ordena os documentos pela data da última modificação, exibindo os modificados mais recentemente no topo.
    *   **Mais Antigos:** Ordena os documentos pela data da última modificação, exibindo os modificados há mais tempo no topo.

**3. Como os Filtros e a Busca Funcionam em Conjunto:**

*   **Filtros Rápidos são Aditivos (Geralmente):** Ao selecionar um Tipo, Categoria e Tag nos filtros rápidos, você está, na prática, aplicando uma lógica "E" (AND). Por exemplo, mostrar documentos que são do Tipo "Relatório" E estão na Categoria "Vendas" E possuem a Tag "Urgente".
*   **Busca Global com Filtros Rápidos:**
    *   Se você realizar uma Busca Global e depois aplicar filtros rápidos, os filtros serão aplicados *sobre os resultados da busca*.
    *   Se você aplicar filtros rápidos e depois realizar uma Busca Global, a busca geralmente anula os filtros rápidos e realiza uma nova pesquisa em todos os documentos (ou modelos, dependendo da view).

**4. Barra de Status/Informações (Cabeçalho - Linha 4):**

*   **"Filtros:"** Esta parte da barra de status sempre exibe um resumo dos filtros que estão ativos no momento para a listagem de documentos. Ex: "Filtros: Busca: "projeto"; Tipo: Relatório; Ordem: Mais Recentes".
*   Isso ajuda você a entender rapidamente quais critérios estão sendo usados para exibir a lista atual de documentos.

**Dicas para Buscas e Filtros Eficazes:**
*   **Seja Específico:** Quanto mais específico o termo de busca ou a combinação de filtros, mais refinados serão os resultados.
*   **Use Aspas para Frases Exatas:** Se a Busca Global suportar, usar aspas ao redor de uma frase (ex: "balancete mensal consolidado") pode retornar resultados mais precisos. (Verifique se esta funcionalidade está implementada).
*   **Limpe os Filtros:** Lembre-se de redefinir os filtros para "Todos os Tipos", "Todas as Categorias", "Todas as Tags" e limpar o campo de busca para ver todos os documentos novamente.
*   **Consistência:** Manter uma nomenclatura consistente para Tipos, Categorias e Tags ao longo do tempo facilitará muito a eficácia dos filtros.
`
        }
    ]
};