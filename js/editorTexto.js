// js/editorTexto.js - Módulo para Gerenciamento de Editores de Texto com Quill.js
// v1.0 - Implementação inicial com Quill.js

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.EditorTexto = (function() {
    const instanciasAtivas = {}; // Armazena as instâncias ativas do Quill por ID do container

    // Configuração padrão para uma barra de ferramentas "completa" do Quill
    const toolbarOpcoesCompletas = [
        [{ 'font': [] }, { 'size': ['small', false, 'large', 'huge'] }], // Dropdowns de fonte e tamanho
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],

        ['bold', 'italic', 'underline', 'strike'],        // Botões de formatação básica
        [{ 'color': [] }, { 'background': [] }],          // Botões de cor de texto e fundo

        [{ 'script': 'sub'}, { 'script': 'super' }],      // Subscrito/Sobrescrito
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],          // Recuo
        [{ 'direction': 'rtl' }, { 'align': [] }],        // Direção do texto e alinhamento

        ['link', 'image', 'video', 'blockquote', 'code-block'], // Inserção de mídia e blocos

        ['clean']                                         // Remover formatação
    ];

    /**
     * Cria e inicializa uma instância do Quill.js em um elemento container.
     * @param {string} elementoContainerId - O ID do elemento DIV que será o container do editor.
     * @param {object} [opcoesConfig] - Opções de configuração para o Quill.
     * @param {Array|string|object} [opcoesConfig.toolbar] - Configuração da barra de ferramentas. Pode ser um array de opções, o ID de um container de toolbar customizado, ou um objeto. Padrão: toolbarOpcoesCompletas.
     * @param {string} [opcoesConfig.theme='snow'] - Tema do Quill ('snow' ou 'bubble').
     * @param {string} [opcoesConfig.placeholder='Digite o conteúdo aqui...'] - Texto de placeholder para o editor.
     * @param {string} [opcoesConfig.bounds='document.body'] - Elemento de contorno para tooltips e dropdowns do editor.
     * @param {object} [opcoesConfig.modulosAdicionais={}] - Módulos adicionais do Quill a serem carregados.
     * @returns {Quill|null} A instância do Quill criada ou null em caso de erro.
     */
    function criarEditorQuill(elementoContainerId, opcoesConfig = {}) {
        const elemento = document.getElementById(elementoContainerId);
        if (!elemento) {
            console.error(`EditorTexto: Elemento container com ID "${elementoContainerId}" não encontrado.`);
            return null;
        }

        // Limpa o conteúdo anterior do elemento para evitar múltiplas inicializações no mesmo container
        elemento.innerHTML = '';

        const configuracaoFinal = {
            modules: {
                toolbar: opcoesConfig.toolbar || toolbarOpcoesCompletas,
                history: { delay: 500, maxStack: 100, userOnly: true },
                ...opcoesConfig.modulosAdicionais
            },
            theme: opcoesConfig.theme || 'snow',
            placeholder: opcoesConfig.placeholder || 'Digite o conteúdo aqui...',
            bounds: opcoesConfig.bounds || document.body
        };

        try {
            const quill = new Quill(elemento, configuracaoFinal);
            instanciasAtivas[elementoContainerId] = quill;
            console.log(`EditorTexto: Instância do Quill criada para o container "${elementoContainerId}".`);
            return quill;
        } catch (error) {
            console.error(`EditorTexto: Erro ao inicializar Quill no container "${elementoContainerId}":`, error);
            return null;
        }
    }

    /**
     * Obtém uma instância ativa do Quill.
     * @param {string} editorId - O ID do elemento container do editor.
     * @returns {Quill|null} A instância do Quill ou null se não encontrada.
     */
    function getInstancia(editorId) {
        return instanciasAtivas[editorId] || null;
    }

    /**
     * Obtém o conteúdo HTML de uma instância do Quill.
     * @param {string} editorId - O ID do elemento container do editor.
     * @returns {string|null} O HTML do conteúdo ou null se o editor não for encontrado.
     */
    function getConteudoHtml(editorId) {
        const quill = getInstancia(editorId);
        return quill ? quill.root.innerHTML : null;
    }

    /**
     * Define o conteúdo HTML de uma instância do Quill.
     * @param {string} editorId - O ID do elemento container do editor.
     * @param {string} html - O HTML a ser inserido.
     */
    function setConteudoHtml(editorId, html) {
        const quill = getInstancia(editorId);
        if (quill) {
            // Limpa o conteúdo anterior antes de colar o novo HTML.
            // Usar setContents com um Delta vazio é uma forma segura de limpar.
            quill.setContents([]); 
            if (html && typeof html === 'string' && html.trim() !== '') {
                // dangerouslyPasteHTML é útil para colar HTML arbitrário.
                // O primeiro argumento 0 significa colar no início do editor.
                quill.clipboard.dangerouslyPasteHTML(0, html);
            }
        } else {
            console.warn(`EditorTexto: Tentativa de setar conteúdo para editor não existente: ${editorId}`);
        }
    }
    
    /**
     * Obtém o texto puro de uma instância do Quill.
     * @param {string} editorId - O ID do elemento container do editor.
     * @returns {string|null} O texto puro ou null.
     */
    function getTextoPuro(editorId) {
        const quill = getInstancia(editorId);
        return quill ? quill.getText() : null; // getText() já retorna o texto puro com quebras de linha \n
    }

    /**
     * Limpa o conteúdo de uma instância do Quill.
     * @param {string} editorId - O ID do elemento container do editor.
     */
    function limparConteudo(editorId) {
        const quill = getInstancia(editorId);
        if (quill) {
            quill.setContents([]); // Define o conteúdo como um Delta vazio
        }
    }
    
    /**
     * Foca em uma instância do Quill.
     * @param {string} editorId - O ID do elemento container do editor.
     */
    function focarEditor(editorId) {
        const quill = getInstancia(editorId);
        if (quill) {
            quill.focus();
        }
    }

    /**
     * "Destroi" ou limpa uma instância do Quill.
     * Quill não tem um método 'destroy' direto para remover todos os listeners e o DOM que ele criou dentro do container.
     * A melhor prática é remover o elemento container do DOM se ele foi criado dinamicamente,
     * ou, no mínimo, desabilitar o editor e remover a referência.
     * @param {string} editorId - O ID do elemento container do editor.
     */
    function destruirEditor(editorId) {
        const quill = getInstancia(editorId);
        if (quill) {
            if (typeof quill.disable === 'function') {
                quill.disable(); // Desabilita o editor
            }
            // Para uma limpeza mais completa, seria ideal que o elemento container fosse removido do DOM
            // por quem o criou. Aqui, apenas removemos a referência da instância.
            // const editorElement = document.getElementById(editorId);
            // if (editorElement) editorElement.innerHTML = ''; // Limpa o conteúdo do container
            delete instanciasAtivas[editorId];
            console.log(`EditorTexto: Instância do Quill para "${editorId}" removida das instâncias ativas.`);
        }
    }

    // API Pública do Módulo EditorTexto
    return {
        criarEditorQuill,
        getInstancia,
        getConteudoHtml,
        setConteudoHtml,
        getTextoPuro,
        limparConteudo,
        focarEditor,
        destruirEditor
    };
})();