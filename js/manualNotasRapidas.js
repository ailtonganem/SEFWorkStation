// js/manualNotasRapidas.js - Conteúdo do Manual do Usuário para o Módulo de Notas Rápidas
// v1.2 - Adiciona seção de Histórico de Versões.
// v1.1 - CORRIGIDO: Conteúdo correto para o Módulo de Notas Rápidas.
// v1.0 - Estrutura inicial (com conteúdo incorreto de tarefas).

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ManualConteudo = window.SEFWorkStation.ManualConteudo || {};

window.SEFWorkStation.ManualConteudo.NotasRapidas = {
    idSecaoDOM: "manual-modulo-notas-rapidas",
    tituloSecaoDisplay: "8. Módulo de Notas Rápidas", // Ajustar numeração conforme o progresso
    anchorText: "Módulo Notas Rápidas",
    subsecoes: [
        {
            idSubSecaoDOM: "notas-visao-geral",
            tituloSubsecaoDisplay: "8.1. Visão Geral do Módulo de Notas Rápidas",
            conteudoMarkdown: `
O Módulo de Notas Rápidas é um espaço versátil para registrar informações de forma ágil, lembretes, ideias, rascunhos ou qualquer anotação que precise ser acessada e organizada rapidamente. Ele combina a simplicidade de um bloco de notas com funcionalidades de formatação, organização visual e vinculação.

**Principais Funcionalidades Detalhadas:**

*   **Criação e Edição de Notas:**
    *   **Título (Opcional):** Um título curto para identificar sua nota. Se não for fornecido, o sistema pode usar um trecho do conteúdo ou um identificador automático.
    *   **Conteúdo (Markdown/Editor Rico):** O corpo da nota é criado utilizando um editor de texto rico (baseado no Quill.js) que oferece formatação visual. O conteúdo também pode ser interpretado e renderizado como Markdown na visualização, permitindo formatação como:
        *   Cabeçalhos (\`# Título\`, \`## Subtítulo\`)
        *   Negrito (\`**texto**\`), Itálico (\`*texto*\`)
        *   Listas com marcadores (\`* Item\`) ou numeradas (\`1. Item\`)
        *   Links (\`[Texto do Link](URL)\`)
        *   Blocos de citação (\`> Texto citado\`) e código.
    *   **Cores:** Atribua uma cor de fundo à sua nota para fácil diferenciação visual na listagem em grade. Uma paleta de cores predefinidas está disponível, além da opção de escolher uma cor personalizada via seletor ou código hexadecimal.
    *   **Favoritos:** Marque notas importantes com uma estrela (⭐) para que se destaquem e possam ser filtradas facilmente.
    *   **Anexos:** É possível anexar arquivos diretamente às notas rápidas, útil para guardar pequenos arquivos de referência junto com suas anotações.

*   **Organização e Visualização:**
    *   **Layout Flexível:** Visualize suas notas em:
        *   **Grade:** Um layout estilo "post-it", onde cada nota aparece como um cartão colorido, mostrando título e um trecho do conteúdo. Ideal para uma visão geral.
        *   **Lista:** Um formato tabular mais tradicional, com colunas para Título, trecho do Conteúdo, Data de Modificação, Cor, status de Favorita, e botões de ação.
    *   **Filtros:**
        *   **Buscar:** Pesquise por palavras-chave no título ou no conteúdo das notas.
        *   **Filtrar por Cor:** Exiba apenas notas de uma cor específica.
        *   **Filtrar por Favoritas:** Mostre somente as notas marcadas como favoritas.
    *   **Ordenação:** Na visualização em lista, é possível ordenar as notas por data de modificação, título, ou outros critérios disponíveis.

*   **Vínculos com Outras Entidades:**
    *   Conecte suas notas rápidas a outros itens do SEFWorkStation, como:
        *   Documentos
        *   Contribuintes
        *   Recursos
        *   Tarefas
        *   Processos (Protocolos, PTAs, Autuações)
        *   Servidores
    *   Esses vínculos são úteis para adicionar informações contextuais a uma entidade sem precisar editar o conteúdo principal da mesma. Por exemplo, uma nota sobre um detalhe específico de um processo ou um lembrete sobre uma tarefa.
    *   Os vínculos são tipicamente bidirecionais, aparecendo tanto na nota quanto na entidade vinculada.

*   **Lixeira:**
    *   Notas excluídas (marcadas com a flag \`isExcluida\`) são movidas para a Lixeira Global, de onde podem ser restauradas ou excluídas permanentemente.

**Acesso às Funcionalidades do Módulo de Notas Rápidas (Menu Principal "Notas Rápidas"):**
*   **Nova Nota Rápida:**
    *   Abre o formulário para criar uma nova nota. Esta ação pode ser acessada diretamente do menu ou, de forma contextual, a partir da tela de visualização de outras entidades (ex: um botão "Adicionar Nota" na visualização de um Documento). Neste último caso, o formulário pode abrir em um modal e já vir com o vínculo para a entidade de origem pré-selecionado.
*   **Gerir Notas Rápidas:** Exibe a página principal do módulo, com a lista/grade de todas as notas ativas, filtros, e opções de visualização e ações em lote.

**Casos de Uso Comuns:**
*   Anotações de reuniões ou chamadas telefônicas.
*   Lembretes pessoais ou de equipe.
*   Rascunho de ideias ou parágrafos para documentos futuros.
*   Checklists rápidos (usando a formatação de lista com marcadores do Markdown).
*   Guardar trechos de código, links úteis ou informações de referência rápida.
*   Adicionar contexto a um documento ou processo sem alterar o item original.

A simplicidade, combinada com a formatação Markdown, cores, favoritos e vínculos, torna o Módulo de Notas Rápidas uma ferramenta ágil e poderosa para a organização do dia a dia.
                    `
        },
        {
            idSubSecaoDOM: "notas-criar-editar",
            tituloSubsecaoDisplay: "8.2. Criando e Editando Notas Rápidas",
            conteudoMarkdown: `
O processo de criação e edição de notas rápidas é projetado para ser ágil e intuitivo.

**Para Criar uma Nova Nota Rápida:**
1.  **Acesso:**
    *   **Menu Principal:** Clique em **Notas Rápidas > Nova Nota Rápida**. Isso geralmente abrirá o formulário de criação em uma página dedicada.
    *   **Contextual (a partir de outras entidades):** Muitas telas de visualização (ex: de um Documento, Tarefa, Contribuinte) possuem um botão "Adicionar Nota" ou similar. Clicar neste botão tipicamente abre o formulário de nova nota em um **modal** (uma janela sobreposta), e o vínculo com a entidade de origem (ex: o Documento que você estava visualizando) já vem pré-selecionado.
2.  **Preenchimento do Formulário:**
    *   **Título (Opcional):** Embora opcional, um título ajuda a identificar a nota rapidamente nas listagens. Se não preenchido, o sistema pode usar as primeiras palavras do conteúdo ou um identificador genérico.
    *   **Conteúdo (Markdown/Editor Rico):** \`[Obrigatório]\` Este é o corpo principal da sua nota.
        *   O formulário utiliza um editor de texto rico (Quill.js) que oferece uma barra de ferramentas com opções de formatação como negrito, itálico, listas, links, etc.
        *   Você pode colar conteúdo formatado de outras fontes.
        *   O conteúdo é armazenado de forma que pode ser interpretado e exibido como Markdown na visualização da nota. Você pode, inclusive, digitar diretamente com sintaxe Markdown se preferir (ex: \`## Subtítulo\`, \`* item de lista\`).
    *   **Cor da Nota:**
        *   Um seletor com cores predefinidas (Amarelo Padrão, Azul Claro, etc.) está disponível para escolha rápida.
        *   Um seletor de cores do tipo "color picker" (\`<input type="color">\`) permite escolher qualquer cor visualmente.
        *   Um campo de texto exibe e permite que você digite diretamente o código hexadecimal da cor (ex: \`#FFDAB9\`). As três opções são interligadas: mudar uma atualiza as outras.
        *   A cor padrão é geralmente um amarelo claro (\`#FFFFE0\`).
    *   **Favorita:** Marque esta caixa de seleção para que a nota seja destacada com uma estrela (⭐) e possa ser facilmente filtrada entre as favoritas.
    *   **Vínculos com Outras Entidades:** (Mais proeminente no formulário de página principal do que no modal)
        *   Permite associar a nota a Documentos, Contribuintes, Recursos, Tarefas, Processos (Protocolos, PTAs, Autuações) e outros Servidores.
        *   Para cada tipo de entidade, clique no botão "Gerenciar Vínculos" para abrir um modal de seleção, onde você pode buscar e marcar os itens desejados.
        *   Os itens selecionados aparecerão como "pills" no formulário.
    *   **Anexos:** (Mais proeminente no formulário de página principal)
        *   Clique em "Escolher arquivos" para anexar um ou mais arquivos à nota.
3.  **Salvar:**
    *   No formulário de página principal, clique em "**Salvar Nota**".
    *   Em um modal, o botão de confirmação também será "Salvar Nota" ou similar.
    *   A nota é salva e você geralmente é redirecionado para a lista de notas ou, se estava em um modal, o modal fecha e a tela de origem pode ser atualizada.

**Para Editar uma Nota Rápida Existente:**
1.  Vá em **Notas Rápidas > Gerir Notas Rápidas**.
2.  Localize a nota que deseja editar na grade ou na lista.
3.  **Opções de Edição:**
    *   **Menu de Contexto (⋮):** Na visualização em grade, cada card de nota possui um botão de menu de contexto (três pontos verticais). Clique nele para ver opções como "Editar".
    *   **Botão Editar na Lista (✏️):** Na visualização em lista, cada linha de nota tem um ícone de lápis. Clicar nele também abre o formulário de edição.
    *   **A partir da Visualização Detalhada:** Se você clicar no título da nota (ou na área de conteúdo do card) para abrir a tela de visualização completa da nota, haverá um botão "**Editar**" nela.
4.  O formulário de edição será aberto.
5.  Faça as alterações necessárias.
6.  Clique em "**Atualizar Nota**".

**Dicas:**
*   Para notas muito curtas, você pode omitir o título e focar apenas no conteúdo.
*   Use as cores para organizar visualmente suas notas por tema, prioridade ou qualquer critério que funcione para você.
*   A funcionalidade de vinculação é poderosa para adicionar contexto rápido a outros itens do sistema sem sobrecarregar a descrição principal desses itens.
`
        },
        {
            idSubSecaoDOM: "notas-gerenciar-visualizar",
            tituloSubsecaoDisplay: "8.3. Gerenciando e Visualizando Notas Rápidas",
            conteudoMarkdown: `
A página "Gerir Notas Rápidas" é o seu painel central para interagir com todas as suas notas, oferecendo diferentes formas de visualização e organização.

**Acesso:**
*   No menu principal, navegue até **Notas Rápidas > Gerir Notas Rápidas**.

**Interface de Gerenciamento:**

*   **Barra de Ferramentas Superior:**
    *   **Botão "Nova Nota Rápida":** Leva ao formulário de criação de nota (geralmente na página principal).
    *   **Campo de Busca:** Permite pesquisar por palavras-chave no título ou no conteúdo de todas as notas ativas.
    *   **Filtros:**
        *   **Cor:** Um seletor (geralmente um dropdown ou uma paleta de cores) para filtrar notas por uma cor de fundo específica.
        *   **Favoritas:** Uma caixa de seleção (checkbox) para mostrar apenas as notas que foram marcadas como favoritas (⭐).
    *   **Controles de Layout:** Botões para alternar a visualização principal das notas entre:
        *   **Grade (Ícone de Grade ▦):** Exibe as notas como cartões coloridos, no estilo "post-it". Cada card mostra o título (se houver), um trecho do conteúdo (com barra de rolagem se for longo), a data da última modificação, e um indicador de favorito. Este layout é bom para uma visão geral rápida.
        *   **Lista (Ícone de Lista ☰):** Apresenta as notas em um formato de tabela mais tradicional. As colunas geralmente incluem: Checkbox de seleção, Título (clicável para visualização), um resumo do Conteúdo, Data de Modificação, um pequeno quadrado com a Cor da nota, status de Favorita (⭐), e uma coluna de Ações.
    *   **Botão "Ver Lixeira":** Leva para a visualização da lixeira de notas rápidas. Quando na lixeira, este botão muda para "Voltar para Notas" para retornar à lista principal.

*   **Barra de Ações em Lote (aparece quando uma ou mais notas são selecionadas):**
    *   Ao marcar o checkbox de uma ou mais notas (disponível em ambos os layouts, grade e lista), uma barra de ações contextuais surge acima da área das notas.
    *   **Contador:** Informa quantas notas estão selecionadas (ex: "3 notas selecionadas").
    *   **Ações Disponíveis (para notas ativas):**
        *   **Favoritar:** Marca todas as notas selecionadas como favoritas.
        *   **Desfavoritar:** Remove a marcação de favorita das notas selecionadas.
        *   **Mover para Lixeira:** Envia todas as notas selecionadas para a lixeira.
    *   **Ações Disponíveis (quando na Lixeira):**
        *   **Restaurar Selecionadas:** Move as notas selecionadas de volta para a lista principal de notas ativas.
        *   **Excluir Permanentemente Selecionadas:** Apaga definitivamente as notas selecionadas do sistema. Esta ação é irreversível.
    *   **Checkbox "Selecionar Todas":** No cabeçalho da barra de ações em lote, permite selecionar ou desmarcar todas as notas atualmente visíveis (respeitando os filtros aplicados).

*   **Interação em Modo Grade:**
    *   **Clicar na área de conteúdo/título do card:** Geralmente abre a tela de visualização detalhada da nota.
    *   **Checkbox de Seleção:** No canto do card, para selecionar a nota para ações em lote.
    *   **Menu de Contexto (⋮):** Um botão com três pontos verticais em cada card. Ao clicar, abre um pequeno menu com ações rápidas para aquela nota específica:
        *   Visualizar Detalhes
        *   Editar
        *   Marcar/Desmarcar Favorita
        *   Mover para Lixeira
    *   **Interação em Modo Lista:**
        *   **Checkbox de Seleção:** Na primeira coluna de cada linha.
        *   **Clicar no Título:** Abre a tela de visualização detalhada da nota.
        *   **Coluna de Ações:** Contém botões individuais para:
            *   Visualizar (👁️)
            *   Editar (✏️)
            *   Excluir (🗑️ - move para lixeira)

**Tela de Visualização Detalhada da Nota:**
*   Acessada ao clicar no título/conteúdo de uma nota, ou pela opção "Visualizar Detalhes".
*   Exibe todas as informações da nota:
    *   Título completo (se houver).
    *   ID da Nota (Numérico e UUID) e status de Favorita (⭐).
    *   Datas de criação e última modificação.
    *   Conteúdo completo da nota, com o Markdown renderizado para HTML (formatação visualizada).
    *   Lista de Anexos, com botões para download/abertura.
    *   Lista de todas as Entidades Vinculadas (Documentos, Contribuintes, etc.), com links para navegar até elas.
*   **Ações disponíveis na tela de visualização:**
    *   **Voltar:** Retorna à página "Gerir Notas Rápidas".
    *   **Editar:** Abre o formulário de edição completo da nota.
    *   **Enviar por Email:** Abre o compositor de e-mail com o título e conteúdo da nota pré-preenchidos.
    *   **Mover para Lixeira / Restaurar / Excluir Permanentemente:** Ações dependendo se a nota está ativa ou já na lixeira.
`
        },
        {
            idSubSecaoDOM: "notas-versionamento",
            tituloSubsecaoDisplay: "8.4. Histórico de Versões das Notas",
            conteudoMarkdown: `
Assim como no Módulo de Documentos, as Notas Rápidas também possuem um sistema de versionamento automático para proteger seu trabalho contra perdas acidentais.

**Como Funciona:**
*   **Salvamento Automático da Versão Anterior:** Sempre que você **salva uma alteração** em uma nota rápida existente, o sistema cria uma cópia da versão anterior (o estado da nota antes da sua edição) e a armazena como uma versão arquivada.
*   **Versionamento no Ato de Salvar:** O histórico é criado apenas quando você clica em "Atualizar Nota", não a cada letra digitada.

**Acessando o Histórico de Versões:**
1.  Abra uma nota rápida para **visualização** (clicando no título ou no card dela na página "Gerir Notas Rápidas").
2.  Role a tela para baixo. Se existirem versões anteriores, você verá a seção "**Histórico de Versões**".
3.  A seção listará todas as versões anteriores salvas, com a data e hora em que foram arquivadas.

**Ações no Histórico de Versões:**
*   **Visualizar:** Clique em "Visualizar" para abrir uma janela (modal) que exibe o conteúdo completo daquela versão específica, apenas para leitura. Isso é útil para comparar com a versão atual ou para copiar trechos de texto.
*   **Restaurar:** Clicar em "Restaurar" reverte a nota principal para o estado daquela versão selecionada.
    *   O sistema primeiro arquiva a versão **atual** da nota (para que você não perca seu trabalho mais recente) e depois aplica o conteúdo da versão antiga que você escolheu restaurar.
    *   A página de visualização da nota será atualizada para mostrar o conteúdo restaurado.

Este sistema oferece uma camada extra de segurança, garantindo que suas anotações e rascunhos possam ser recuperados mesmo após múltiplas edições.
`
        }
    ]
};