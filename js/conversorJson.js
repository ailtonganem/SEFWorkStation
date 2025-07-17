// js/conversorJson.js - Módulo para Converter e Importar JSON do Sistema Antigo (v2.0)
// v1.2 - Adiciona botão de ajuda contextual.
// v1.1 - Ajusta o layout para ocupar toda a largura da página.
// v1.0 - Estrutura inicial e funcionalidade de importação da chave "respostas"

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.ConversorJson = (function() {
    let mainContentWrapperRef;
    let showGlobalFeedbackRef;
    let clearGlobalFeedbackRef;
    let dbRef; // Referência para SEFWorkStation.DB
    let refreshApplicationStateRef; // Para atualizar a aplicação após a importação
    let ajudaModuleRef; // Adicionado

    const DOCUMENTOS_TARGET_STORE_NAME = 'documents'; // Store de destino no novo sistema
    const ANTIGO_JSON_DOCS_KEY = 'respostas'; // Chave esperada no JSON antigo

    /**
     * Inicializa o módulo ConversorJson.
     * @param {HTMLElement} mainWrapper - O contêiner principal do conteúdo.
     * @param {Function} showFeedbackFunc - Função para exibir feedback global.
     * @param {Function} clearFeedbackFunc - Função para limpar feedback global.
     * @param {object} dbModuleRef - Referência ao módulo SEFWorkStation.DB.
     * @param {Function} refreshFunc - Função para atualizar o estado da aplicação.
     */
    function init(mainWrapper, showFeedbackFunc, clearFeedbackFunc, dbModuleRef, refreshFunc) {
        mainContentWrapperRef = mainWrapper;
        showGlobalFeedbackRef = showFeedbackFunc;
        clearGlobalFeedbackRef = clearFeedbackFunc;
        dbRef = dbModuleRef;
        refreshApplicationStateRef = refreshFunc;
        ajudaModuleRef = window.SEFWorkStation.Ajuda; // Adicionado

        if (!dbRef) {
            console.error("ConversorJson.JS: init - Referência ao módulo DB (dbRef) não fornecida!");
        }
        if (!mainContentWrapperRef) {
            console.error("ConversorJson.JS: init - mainContentWrapperRef não fornecido.");
        }
        if (!ajudaModuleRef) {
            console.warn("ConversorJson.JS: init - Módulo de Ajuda não encontrado.");
        }
        console.log("ConversorJson.JS: Módulo Conversor de JSON inicializado (v1.2).");
    }

    /**
     * Renderiza a página da ferramenta de conversão de JSON.
     */
    function renderConversorPage() {
        if (clearGlobalFeedbackRef) clearGlobalFeedbackRef();
        if (!mainContentWrapperRef) {
            console.error("ConversorJson.JS: renderConversorPage - mainContentWrapperRef não definido.");
            if (showGlobalFeedbackRef) showGlobalFeedbackRef("Erro crítico ao tentar renderizar a página do conversor.", "error");
            return;
        }
        console.log("ConversorJson.JS: Renderizando página do Conversor de JSON (Sistema Antigo).");

        if (window.SEFWorkStation.App && typeof window.SEFWorkStation.App.setCurrentViewTarget === 'function') {
            window.SEFWorkStation.App.setCurrentViewTarget('conversor-json-v2');
        }

        const feedbackAreaId = "feedback-conversor-json";
        const pageHtml = `
            <div class="page-section max-w-none px-4 sm:px-6 lg:px-8" id="conversor-json-container">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-100">Conversor de JSON (Sistema Antigo)</h2>
                    <button type="button" id="ajuda-conversor-json" class="p-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-300" title="Ajuda sobre o Conversor de JSON">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-question-circle-fill" viewBox="0 0 16 16">
                            <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.496 6.033h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286a.237.237 0 0 0 .241.247zm2.325 6.443c.61 0 1.029-.394 1.029-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94 0 .533.425.927 1.01.927z"/>
                        </svg>
                    </button>
                </div>
                <div id="${feedbackAreaId}" class="mb-6"></div>

                <div class="section-box p-4 mb-6 border dark:border-slate-700 rounded-lg max-w-3xl mx-auto">
                    <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">
                        Esta ferramenta permite importar documentos de um arquivo JSON gerado pelo sistema antigo (que utiliza a chave "<code>${ANTIGO_JSON_DOCS_KEY}</code>" para a lista de documentos).
                        Os documentos encontrados serão adicionados à base de dados atual.
                    </p>
                    <p class="text-xs text-orange-600 dark:text-orange-400 mb-3">
                        <strong>Atenção:</strong> Esta operação adicionará os documentos do arquivo JSON aos documentos já existentes. Não substitui toda a base de dados.
                        Recomenda-se fazer um backup do sistema atual antes de prosseguir, caso deseje reverter.
                    </p>
                    <div class="mb-3">
                        <label for="conversor-json-file-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Selecione o arquivo JSON do sistema antigo:
                        </label>
                        <input type="file" id="conversor-json-file-input" accept=".json" class="form-input-file w-full max-w-md">
                        <p id="selected-conversor-file-name" class="text-sm text-gray-500 dark:text-gray-400 mt-1"></p>
                    </div>
                    <button id="btn-iniciar-conversao" class="btn-primary" disabled>Iniciar Conversão e Importação</button>
                </div>
            </div>
        `;
        mainContentWrapperRef.innerHTML = pageHtml;
        addConversorPageEventListeners(document.getElementById(feedbackAreaId));
    }

    /**
     * Adiciona event listeners aos elementos da página do conversor.
     * @param {HTMLElement} feedbackDisplayArea - Onde exibir feedback.
     */
    function addConversorPageEventListeners(feedbackDisplayArea) {
        const jsonFileInput = document.getElementById('conversor-json-file-input');
        const selectedFileNameEl = document.getElementById('selected-conversor-file-name');
        const btnIniciarConversao = document.getElementById('btn-iniciar-conversao');
        const btnAjuda = document.getElementById('ajuda-conversor-json');

        if (jsonFileInput) {
            jsonFileInput.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (file && file.name.endsWith('.json')) {
                    selectedFileNameEl.textContent = `Arquivo selecionado: ${file.name}`;
                    btnIniciarConversao.disabled = false;
                    console.log(`ConversorJson.JS: Arquivo JSON selecionado: ${file.name}`);
                } else {
                    selectedFileNameEl.textContent = 'Por favor, selecione um arquivo .json';
                    btnIniciarConversao.disabled = true;
                    if (file) { 
                         if (showGlobalFeedbackRef) showGlobalFeedbackRef("Formato de arquivo inválido. Por favor, selecione um arquivo .json.", "error", feedbackDisplayArea);
                    }
                }
            });
        }

        if (btnIniciarConversao) {
            btnIniciarConversao.addEventListener('click', async () => {
                const file = jsonFileInput.files[0];
                if (!file) {
                    if (showGlobalFeedbackRef) showGlobalFeedbackRef("Nenhum arquivo JSON selecionado.", "warning", feedbackDisplayArea);
                    return;
                }

                if (!dbRef || typeof dbRef.addItem !== 'function') {
                     if (showGlobalFeedbackRef) showGlobalFeedbackRef("Erro: Funcionalidade de banco de dados não disponível.", "error", feedbackDisplayArea);
                     console.error("ConversorJson.JS: dbRef.addItem não está definido.");
                     return;
                }

                if (showGlobalFeedbackRef) showGlobalFeedbackRef(`Iniciando conversão do arquivo "${file.name}"...`, "info", feedbackDisplayArea);
                console.log(`ConversorJson.JS: Iniciando conversão do arquivo: ${file.name}`);

                try {
                    const jsonString = await file.text();
                    const jsonData = JSON.parse(jsonString);
                    console.log("ConversorJson.JS: JSON parseado com sucesso.");

                    if (!jsonData || typeof jsonData !== 'object') {
                        throw new Error("O conteúdo do arquivo JSON é inválido ou não é um objeto.");
                    }

                    if (!jsonData.hasOwnProperty(ANTIGO_JSON_DOCS_KEY) || !Array.isArray(jsonData[ANTIGO_JSON_DOCS_KEY])) {
                        throw new Error(`A chave "${ANTIGO_JSON_DOCS_KEY}" não foi encontrada no arquivo JSON ou não contém uma lista de documentos.`);
                    }

                    const documentosAntigos = jsonData[ANTIGO_JSON_DOCS_KEY];
                    console.log(`ConversorJson.JS: Encontrados ${documentosAntigos.length} documentos na chave "${ANTIGO_JSON_DOCS_KEY}".`);

                    if (documentosAntigos.length === 0) {
                        if (showGlobalFeedbackRef) showGlobalFeedbackRef("Nenhum documento encontrado no arquivo JSON sob a chave esperada.", "info", feedbackDisplayArea);
                        return;
                    }

                    let adicionadosComSucesso = 0;
                    let errosNaAdicao = 0;

                    for (const docAntigo of documentosAntigos) {
                        
                        const documentoParaAdicionar = { ...docAntigo };
                        
                        documentoParaAdicionar.isTemplate = docAntigo.isModel || docAntigo.isTemplate || false;
                        documentoParaAdicionar.isFavorite = docAntigo.isFavorite || false;
                        documentoParaAdicionar.isDeleted = docAntigo.isDeleted || false;
                        documentoParaAdicionar.creationDate = docAntigo.creationDate || new Date().toISOString();
                        documentoParaAdicionar.modificationDate = docAntigo.modificationDate || new Date().toISOString();
                        documentoParaAdicionar.anexos = docAntigo.anexos || [];

                        if (typeof documentoParaAdicionar.id !== 'number' || isNaN(documentoParaAdicionar.id)) {
                            console.warn(`ConversorJson.JS: Documento do JSON antigo com ID inválido ou ausente ("${documentoParaAdicionar.id}"). Será gerado um novo ID. Título: ${documentoParaAdicionar.title}`);
                            delete documentoParaAdicionar.id;
                        }

                        try {
                            await dbRef.addItem(DOCUMENTOS_TARGET_STORE_NAME, documentoParaAdicionar);
                            adicionadosComSucesso++;
                        } catch (error) {
                            errosNaAdicao++;
                            console.error(`ConversorJson.JS: Erro ao adicionar documento (Título: ${docAntigo.title}, ID antigo: ${docAntigo.id}) ao DB:`, error);
                        }
                    }

                    let feedbackMsg = `Conversão concluída. ${adicionadosComSucesso} documento(s) adicionado(s) com sucesso.`;
                    if (errosNaAdicao > 0) {
                        feedbackMsg += ` ${errosNaAdicao} documento(s) falharam ao ser adicionados (ver console para detalhes).`;
                    }
                    if (showGlobalFeedbackRef) showGlobalFeedbackRef(feedbackMsg, errosNaAdicao > 0 ? "warning" : "success", feedbackDisplayArea);
                    
                    console.log(`ConversorJson.JS: ${feedbackMsg}`);

                    if (adicionadosComSucesso > 0 && refreshApplicationStateRef) {
                        await refreshApplicationStateRef();
                    }

                    jsonFileInput.value = '';
                    selectedFileNameEl.textContent = '';
                    btnIniciarConversao.disabled = true;

                } catch (error) {
                    console.error("ConversorJson.JS: Erro durante a conversão/importação:", error);
                    if (showGlobalFeedbackRef) showGlobalFeedbackRef(`Erro no processo: ${error.message}. Verifique o console.`, "error", feedbackDisplayArea);
                }
            });
        }

        if(btnAjuda) {
            btnAjuda.addEventListener('click', (e) => {
                e.preventDefault();
                if(ajudaModuleRef && ajudaModuleRef.mostrarTopicoDeAjuda) {
                    ajudaModuleRef.mostrarTopicoDeAjuda('manual-modulo-utilidades', 'util-conversor');
                }
            });
        }
    }

    return {
        init,
        renderConversorPage
    };
})();