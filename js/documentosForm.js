// js/documentosForm.js
// v8.2.0 - CORRIGIDO: Implementa o gerenciamento de estado para TODOS os tipos de vínculos definidos em entityConfig, resolvendo a inoperância de botões de vínculo (ITCD, Destinatários, etc.).
// v8.1.0 - CORRIGIDO: Padroniza os nomes das propriedades de relacionamento para [entidade]VinculadosIds e adiciona retrocompatibilidade para ler os nomes antigos.
// v8.0.0 - Implementa a funcionalidade completa de vinculação de entidades (Tarefas, Contribuintes, etc.) no formulário de documentos.
// ... (histórico anterior)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.DocumentosForm = (function() {
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let navigateBackRef;
    let refreshAppCallbackRef;
    let dbModuleRef;
    let viewModuleRef;
    let appModuleRef;
    let uiModuleRef;
    let sharedUtilsRef; 

    const ID_FORM_DOCUMENTO = 'form-documento';
    const ID_TITULO_DOCUMENTO = 'doc-titulo';
    const ID_TIPO_DOCUMENTO = 'doc-tipo';
    const ID_DOC_ID_DISPLAY = 'doc-id-display';
    const ID_CONTEUDO_EDITOR = 'doc-conteudo-editor';
    const ID_NOTAS_INTERNAS_DOCUMENTO = 'doc-notas-internas';
    const ID_CATEGORIAS_DOCUMENTO_CONTAINER = 'doc-categorias-container';
    const ID_TAGS_DOCUMENTO_CONTAINER = 'doc-tags-container';
    const ID_INPUT_NOVA_CATEGORIA_DOC = 'input-nova-categoria-doc';
    const ID_INPUT_NOVA_TAG_DOC = 'input-nova-tag-doc';
    const ID_IS_TEMPLATE_CHECKBOX_TOP = 'doc-is-template-top';
    const ID_IS_FAVORITE_CHECKBOX_TOP = 'doc-is-favorite-top';
    const ID_BTN_INSERIR_PLACEHOLDER = 'btn-inserir-placeholder-doc';
    const ID_PLACEHOLDER_DROPDOWN_CONTAINER = 'placeholder-dropdown-doc-form-container';


    const ID_ANEXOS_EXISTENTES_DOC_LIST = 'anexos-existentes-doc-list';
    const ID_DOC_ANEXOS_INPUT = 'doc-anexos-input';
    const ID_ANEXOS_PREVIEW_DOC_LIST = 'anexos-preview-doc-list';

    let currentDocumentoId = null;
    let originatingView = 'gerir';
    let originalDocumentoData = null;
    let onFormCloseCallback = null;
    let quillEditorInstance = null;

    let currentFilesToAttachDoc = [];
    let existingAttachmentsDoc = [];

    // Arrays para armazenar IDs de entidades vinculadas
    let currentRelatedDocIdsDoc = [];
    let currentRelatedContribIdsDoc = [];
    let currentRelatedRecursoIdsDoc = [];
    let currentRelatedTarefaIdsDoc = [];
    let currentRelatedNotaRapidaIdsDoc = [];
    let currentRelatedProtocoloIdsDoc = [];
    let currentRelatedPTAIdsDoc = [];
    let currentRelatedAutuacaoIdsDoc = [];
    let currentRelatedServidorIdsDoc = [];
    let currentRelatedAvaliacaoITCDIdsDoc = [];
    let currentRelatedCalculoITCDIdsDoc = [];
    let currentRelatedEmailGeradoIdsDoc = [];
    let currentRelatedDestinatarioIdsDoc = [];

    let tempSelectedIdsModal = [];

    // Mapeamento dos arrays de estado para fácil acesso
    function getEntityStateArray(storeName) {
        const stateMap = {
            'documents': currentRelatedDocIdsDoc,
            'contribuintes': currentRelatedContribIdsDoc,
            'recursos': currentRelatedRecursoIdsDoc,
            'tarefasStore': currentRelatedTarefaIdsDoc,
            'notasRapidasStore': currentRelatedNotaRapidaIdsDoc,
            'protocolosStore': currentRelatedProtocoloIdsDoc,
            'ptasStore': currentRelatedPTAIdsDoc,
            'autuacoesStore': currentRelatedAutuacaoIdsDoc,
            'servidoresStore': currentRelatedServidorIdsDoc,
            'itcdAvaliacoesStore': currentRelatedAvaliacaoITCDIdsDoc,
            'itcdCalculosStore': currentRelatedCalculoITCDIdsDoc,
            'comunicacaoEmailsGeradosStore': currentRelatedEmailGeradoIdsDoc,
            'comunicacaoDestinatariosStore': currentRelatedDestinatarioIdsDoc
        };
        return stateMap[storeName];
    }


    function init(mainWrapper, showFeedback, clearFeedback, navigateBackFunc, refreshCallback, db, viewMod, appMod, uiMod, utilsRef, onCloseCallback = null) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedback;
        globalClearFeedbackRef = clearFeedback;
        navigateBackRef = navigateBackFunc;
        refreshAppCallbackRef = refreshCallback;
        dbModuleRef = db;
        viewModuleRef = viewMod;
        appModuleRef = appMod;
        uiModuleRef = uiMod;
        sharedUtilsRef = utilsRef; 
        onFormCloseCallback = onCloseCallback;
        console.log("DocumentosForm.JS: Módulo inicializado (v8.2.0).");
    }

    async function popularDropdownPlaceholders(dropdownContainerId) {
        const dropdownContainer = document.getElementById(dropdownContainerId);
        if (!dropdownContainer) {
            console.error("DocumentosForm.JS: Dropdown de placeholders não encontrado:", dropdownContainerId);
            return;
        }

        dropdownContainer.innerHTML = '<div class="p-2 text-xs text-gray-500 dark:text-gray-400">Carregando placeholders...</div>';
        const placeholders = [];
        const placeholdersPadrao = window.SEFWorkStation.EntityConfig.PLACEHOLDERS_PADRAO_SISTEMA || [];

        placeholdersPadrao.forEach(phNome => {
            placeholders.push({
                nomeExibicao: `Padrão: ${phNome.toLowerCase().replace(/_/g, ' ')}`,
                nomeInterno: phNome,
                descricao: `Campo padrão '${phNome.toLowerCase().replace(/_/g, ' ')}' do contribuinte.`
            });
        });

        try {
            if (!dbModuleRef || !dbModuleRef.STORES || !dbModuleRef.STORES.CONTRIBUINTES_PLACEHOLDERS) {
                console.warn("DocumentosForm.JS: Store de placeholders de contribuinte não definida em dbModuleRef.");
            } else {
                const placeholdersPersonalizadosDB = await dbModuleRef.getAllItems(dbModuleRef.STORES.CONTRIBUINTES_PLACEHOLDERS);
                placeholdersPersonalizadosDB.forEach(phDB => {
                    if (!placeholdersPadrao.includes(phDB.nomePlaceholderNormalizado)) {
                        placeholders.push({
                            nomeExibicao: phDB.nomeExibicao || phDB.nomePlaceholderNormalizado,
                            nomeInterno: phDB.nomePlaceholderNormalizado,
                            descricao: phDB.descricao || `Mapeado para campo: ${phDB.campoContribuinte}`
                        });
                    }
                });
            }
        } catch (e) {
            console.warn("DocumentosForm.JS: Erro ao buscar placeholders personalizados:", e);
            dropdownContainer.innerHTML = '<div class="p-2 text-xs text-red-500">Erro ao carregar placeholders personalizados.</div>';
            return;
        }

        placeholders.sort((a, b) => a.nomeExibicao.localeCompare(b.nomeExibicao));
        dropdownContainer.innerHTML = ''; 

        if (placeholders.length === 0) {
            dropdownContainer.innerHTML = '<div class="p-2 text-xs text-gray-500 dark:text-gray-400">Nenhum placeholder configurado. Crie em "Contribuintes > Gerir Placeholders".</div>';
            return;
        }

        placeholders.forEach(ph => {
            const itemEl = document.createElement('a'); 
            itemEl.href = '#';
            itemEl.className = 'block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200';
            itemEl.textContent = ph.nomeExibicao;
            itemEl.title = ph.descricao;
            itemEl.dataset.placeholderValue = `{{${ph.nomeInterno}}}`;
            itemEl.addEventListener('click', (e) => {
                e.preventDefault();
                const placeholderValue = e.currentTarget.dataset.placeholderValue;
                const quill = SEFWorkStation.EditorTexto.getInstancia(ID_CONTEUDO_EDITOR);
                if (quill) {
                    const range = quill.getSelection(true); 
                    const insertIndex = range ? range.index : quill.getLength(); 
                    quill.insertText(insertIndex, placeholderValue, Quill.sources.USER);
                    quill.setSelection(insertIndex + placeholderValue.length, Quill.sources.SILENT); 
                    quill.focus(); 
                }
                 if (uiModuleRef && uiModuleRef.closeAllDropdowns) {
                    uiModuleRef.closeAllDropdowns();
                }
            });
            dropdownContainer.appendChild(itemEl);
        });
    }

    async function renderNovoDocumentoForm(docData = null, originView = 'gerir', usarComoBase = false, preSelectedLink = null) {
        currentDocumentoId = (docData && docData.id && !usarComoBase) ? docData.id : null;
        originatingView = originView;
        originalDocumentoData = (docData && docData.id && !usarComoBase) ? JSON.parse(JSON.stringify(docData)) : null;

        const isEditing = !!(docData && docData.id && !usarComoBase);
        
        // Reset/Initialize state for links, now using the getter function
        const allLinkableConfigs = window.SEFWorkStation.EntityConfig.getAllConfigs().filter(c => c.isLinkable);
        
        allLinkableConfigs.forEach(config => {
            const stateArray = getEntityStateArray(config.storeName);
            if (stateArray) {
                const propNameStandard = `${config.storeName}VinculadosIds`;
                const propNameLegacyMap = { 'notasRapidasStore': 'notasRapidasRelacionadasIds' };
                const propNameLegacy = propNameLegacyMap[config.storeName];
                
                // Prioriza o nome novo, mas usa o antigo como fallback
                stateArray.length = 0; // Limpa o array
                const ids = (isEditing && docData[propNameStandard]) || (isEditing && propNameLegacy && docData[propNameLegacy]) || [];
                stateArray.push(...ids);
            }
        });

        if (preSelectedLink) {
            const entityConfig = window.SEFWorkStation.EntityConfig.getAllConfigs(); 
            for (const config of entityConfig) {
                 if (preSelectedLink.type === config.labelSingular.toLowerCase().replace(/\s/g, '')) {
                    const currentIdsArray = getEntityStateArray(config.storeName);
                    if (currentIdsArray && !currentIdsArray.includes(preSelectedLink.id)) {
                        currentIdsArray.push(preSelectedLink.id);
                    }
                    break;
                }
            }
            if (!currentDocumentoId && !usarComoBase) docData = {};
        }

        if (appModuleRef && typeof appModuleRef.setCurrentViewTarget === 'function') {
            appModuleRef.setCurrentViewTarget('form', !currentDocumentoId, { id: currentDocumentoId, originatingView: originView });
        }
        if (globalClearFeedbackRef) globalClearFeedbackRef();

        const pageTitle = currentDocumentoId ? (docData && docData.isTemplate ? "Editar Modelo de Documento" : "Editar Documento") : "Novo Documento";
        const docIdParaExibir = currentDocumentoId || (usarComoBase && docData ? `Novo (Baseado em: ${docData.id.substring(0,8)}...)` : 'Novo (ID será gerado ao salvar)');


        if (!dbModuleRef || !dbModuleRef.STORES) {
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro: Configuração do banco de dados ausente.", "error");
            return;
        }
        const tipos = await dbModuleRef.getAllItems(dbModuleRef.STORES.DOCUMENT_TYPES);
        const todasCategorias = await dbModuleRef.getAllItems(dbModuleRef.STORES.DOCUMENT_CATEGORIES);
        const todasTags = await dbModuleRef.getAllItems(dbModuleRef.STORES.DOCUMENT_TAGS);

        const tiposDatalistHtml = tipos.sort((a,b) => a.name.localeCompare(b.name)).map(tipo => `<option value="${tipo.name.replace(/"/g, '"')}"></option>`).join('');
        const categoriasDatalistHtml = todasCategorias.sort((a,b) => a.name.localeCompare(b.name)).map(cat => `<option value="${cat.name.replace(/"/g, '"')}"></option>`).join('');
        const tagsDatalistHtml = todasTags.sort((a,b) => a.name.localeCompare(b.name)).map(tag => `<option value="${tag.name.replace(/"/g, '"')}"></option>`).join('');

        // Gera HTML para a seção de vínculos
        let vinculosHtml = '';
        const allEntityConfigs = window.SEFWorkStation.EntityConfig.getAllConfigs();
        for (const config of allEntityConfigs) {
            if (config.storeName !== dbModuleRef.STORES.DOCUMENTS && config.isLinkable) { // Não permite vincular a si mesmo
                vinculosHtml += `
                    <div class="md:col-span-1">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">${config.labelPlural}:</label>
                        <div id="lista-${config.storeName}-vinculados-doc" class="form-vinculos-lista"></div>
                        <button type="button" id="btn-gerenciar-${config.storeName}-vinculados-doc"
                                class="btn-secondary btn-sm text-xs" data-entity-store="${config.storeName}">Gerenciar Vínculos</button>
                    </div>
                `;
            }
        }

        const formHtml = `
            <div class="page-header flex justify-between items-start">
                <div>
                    <h2 class="text-2xl font-semibold mb-1">${pageTitle}</h2>
                    <p class="text-xs text-gray-500 dark:text-gray-400">ID do Documento: <span id="${ID_DOC_ID_DISPLAY}">${docIdParaExibir}</span></p>
                </div>
                <div class="flex flex-col sm:flex-row items-end sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 mt-1 sm:mt-0">
                    <label class="checkbox-label inline-flex items-center">
                        <input type="checkbox" id="${ID_IS_TEMPLATE_CHECKBOX_TOP}" name="isTemplate" class="form-checkbox h-4 w-4">
                        <span class="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Modelo</span>
                    </label>
                    <label class="checkbox-label inline-flex items-center">
                        <input type="checkbox" id="${ID_IS_FAVORITE_CHECKBOX_TOP}" name="isFavorite" class="form-checkbox h-4 w-4">
                        <span class="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Favorito ⭐</span>
                    </label>
                </div>
            </div>
            <form id="${ID_FORM_DOCUMENTO}" class="space-y-6 mt-4">
                <input type="hidden" id="doc-id" value="${currentDocumentoId || ''}">

                <div>
                    <label for="${ID_TITULO_DOCUMENTO}" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Título do Documento: <span class="text-red-500">*</span></label>
                    <input type="text" id="${ID_TITULO_DOCUMENTO}" name="titulo" class="form-input-text mt-1 block w-full" required>
                </div>

                <h3 class="text-md font-semibold pt-2 border-t dark:border-slate-600">Classificação</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3">
                    <div>
                        <label for="${ID_TIPO_DOCUMENTO}" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo: <span class="text-red-500">*</span></label>
                        <input type="text" list="tipos-documento-datalist" id="${ID_TIPO_DOCUMENTO}" name="docType" class="form-input-text mt-1 block w-full" placeholder="Digite ou selecione um tipo..." required>
                        <datalist id="tipos-documento-datalist">${tiposDatalistHtml}</datalist>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Categorias: <span class="text-red-500">*</span></label>
                        <div id="${ID_CATEGORIAS_DOCUMENTO_CONTAINER}" class="mt-1 space-y-2 form-vinculos-lista" style="min-height: 38px; padding-top: 0.25rem; padding-bottom: 0.25rem;">
                            <p class="text-xs text-gray-400 dark:text-gray-500 italic p-1">Nenhuma categoria selecionada.</p>
                        </div>
                        <div class="flex items-center mt-1">
                            <input type="text" list="categorias-doc-datalist" id="${ID_INPUT_NOVA_CATEGORIA_DOC}" class="form-input-text flex-grow text-sm" placeholder="Nova Categoria (ex: Nivel1 / Nivel2)">
                             <datalist id="categorias-doc-datalist">${categoriasDatalistHtml}</datalist>
                        </div>
                         <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Pressione Enter ou selecione da lista para adicionar.</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Tags:</label>
                        <div id="${ID_TAGS_DOCUMENTO_CONTAINER}" class="mt-1 space-y-2 form-vinculos-lista" style="min-height: 38px; padding-top: 0.25rem; padding-bottom: 0.25rem;">
                             <p class="text-xs text-gray-400 dark:text-gray-500 italic p-1">Nenhuma tag selecionada.</p>
                        </div>
                        <div class="flex items-center mt-1">
                            <input type="text" list="tags-doc-datalist" id="${ID_INPUT_NOVA_TAG_DOC}" class="form-input-text flex-grow text-sm" placeholder="Nova Tag">
                             <datalist id="tags-doc-datalist">${tagsDatalistHtml}</datalist>
                        </div>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Pressione Enter, vírgula ou selecione da lista para adicionar.</p>
                    </div>
                </div>

                <div>
                    <label for="${ID_CONTEUDO_EDITOR}" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Conteúdo do Documento: <span class="text-red-500">*</span></label>
                    
                    <div class="flex items-center gap-2 mb-1 mt-1">
                        <div class="relative inline-block dropdown-container" id="placeholder-dropdown-doc-wrapper">
                            <button type="button" id="${ID_BTN_INSERIR_PLACEHOLDER}" data-dropdown-trigger="${ID_PLACEHOLDER_DROPDOWN_CONTAINER}" class="btn-secondary btn-sm text-xs py-1 px-2">
                                Inserir Placeholder {}
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="ml-1 dropdown-arrow"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </button>
                            <div id="${ID_PLACEHOLDER_DROPDOWN_CONTAINER}" class="dropdown-content absolute z-50 mt-1 w-72 rounded-md shadow-lg bg-white dark:bg-slate-700 ring-1 ring-black dark:ring-slate-500 ring-opacity-5 focus:outline-none hidden" style="max-height: 250px; overflow-y: auto; border-color: var(--dropdown-border-light) !important;">
                                </div>
                        </div>
                    </div>

                    <div id="${ID_CONTEUDO_EDITOR}" style="min-height: 350px; border: 1px solid var(--input-border-light);" class="mt-1 bg-white dark:bg-slate-800/60 text-gray-800 dark:text-gray-100 quill-editor-styles">
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Use as ferramentas do editor para formatação.</p>
                </div>

                <div>
                    <label for="${ID_NOTAS_INTERNAS_DOCUMENTO}" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Notas Internas (Markdown, Opcional):</label>
                    <textarea id="${ID_NOTAS_INTERNAS_DOCUMENTO}" name="internalNotes" class="form-input-text mt-1 block w-full" rows="3" placeholder="Para conteúdo em Markdown ou notas simples..."></textarea>
                </div>

                <div class="mb-6 border dark:border-slate-600 p-4 rounded-lg">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Anexos:</label>
                    <div id="${ID_ANEXOS_EXISTENTES_DOC_LIST}" class="mb-2"></div>
                    <input type="file" id="${ID_DOC_ANEXOS_INPUT}" name="anexos" class="form-input-file mt-1 block w-full" multiple>
                    <div id="${ID_ANEXOS_PREVIEW_DOC_LIST}" class="mt-2"></div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Mantenha pressionado Ctrl (ou Cmd) para selecionar múltiplos arquivos.</p>
                </div>

                <!-- Seção de Vínculos -->
                <h3 class="text-md font-semibold my-4 pt-2 border-t dark:border-slate-600">Vincular a Outras Entidades:</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    ${vinculosHtml}
                </div>

                <div class="form-actions flex justify-end space-x-3 pt-4">
                    <button type="button" id="btn-cancelar-doc" class="btn-secondary">Cancelar</button>
                    ${isEditing ? `<button type="button" id="btn-salvar-nova-versao-doc" class="btn-secondary">Salvar como Nova Versão</button>` : ''}
                    <button type="button" id="btn-salvar-como-modelo-doc" class="btn-secondary">Salvar como Modelo</button>
                    <button type="button" id="btn-salvar-e-novo-doc" class="btn-secondary">Salvar e Novo</button>
                    <button type="submit" id="btn-salvar-doc-principal" class="btn-primary">Salvar ${currentDocumentoId ? (docData && docData.isTemplate ? "Modelo" : "Documento") : "Documento"}</button>
                </div>
            </form>
        `;
        mainContentWrapperRef.innerHTML = formHtml;

        const editorQuillDiv = document.getElementById(ID_CONTEUDO_EDITOR);
        if (!editorQuillDiv) {
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico: Falha ao inicializar o editor de texto.", "error");
        } else {
            if (SEFWorkStation.EditorTexto && typeof SEFWorkStation.EditorTexto.criarEditorQuill === 'function') {
                quillEditorInstance = SEFWorkStation.EditorTexto.criarEditorQuill(
                    ID_CONTEUDO_EDITOR,
                    { placeholder: 'Digite o conteúdo do documento aqui...' }
                );
                if (!quillEditorInstance && globalShowFeedbackRef) globalShowFeedbackRef("Erro ao inicializar editor. Tente recarregar.", "error");
            } else {
                editorQuillDiv.innerHTML = '<p class="text-red-500 dark:text-red-400">Erro ao carregar editor de texto. Contacte o suporte.</p>';
            }
        }

        const dataToFill = usarComoBase && docData ? { ...docData, id: null, title: `${docData.title || ''} (Cópia)` } : docData;
        if (dataToFill) {
            preencherFormularioComDados(dataToFill, todasCategorias, todasTags);
        } else {
            const uuidDisplayElement = document.getElementById(ID_DOC_ID_DISPLAY);
            if (uuidDisplayElement) uuidDisplayElement.textContent = 'Novo (ID será gerado ao salvar)';
            SEFWorkStation.SharedUtils.preencherChips(ID_CATEGORIAS_DOCUMENTO_CONTAINER, [], todasCategorias, dbModuleRef.STORES.DOCUMENT_CATEGORIES, "categoria");
            SEFWorkStation.SharedUtils.preencherChips(ID_TAGS_DOCUMENTO_CONTAINER, [], todasTags, dbModuleRef.STORES.DOCUMENT_TAGS, "tag");
            renderExistingAttachmentsDocList();
        }

        await renderSelectedRelatedItemsDoc();
        addFormEventListeners(originView, isEditing); 
    }

    function renderExistingAttachmentsDocList() {
        const listContainer = document.getElementById(ID_ANEXOS_EXISTENTES_DOC_LIST);
        if (!listContainer) return;

        listContainer.innerHTML = '';
        if (existingAttachmentsDoc.length > 0) {
            const ul = document.createElement('ul');
            ul.className = 'list-none p-0 mb-2';
            existingAttachmentsDoc.forEach((anexo, index) => {
                if (!anexo || !anexo.fileName) return;
                const li = document.createElement('li');
                li.className = 'anexo-preview-item flex justify-between items-center text-sm p-2 bg-gray-100 dark:bg-slate-600 rounded mb-1';
                li.innerHTML = `
                    <span>${anexo.fileName.replace(/"/g, '"')} (${anexo.fileSize ? (anexo.fileSize / 1024).toFixed(1) + ' KB' : 'Tamanho desconhecido'})</span>
                    <button type="button" data-index="${index}" class="btn-remove-anexo-existente-doc text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300" title="Remover anexo existente">
                        ×
                    </button>
                `;
                ul.appendChild(li);
            });
            listContainer.appendChild(ul);

            listContainer.querySelectorAll('.btn-remove-anexo-existente-doc').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const indexToRemove = parseInt(event.currentTarget.dataset.index);
                    const anexoRemovido = existingAttachmentsDoc[indexToRemove];

                    if (anexoRemovido) {
                        existingAttachmentsDoc.splice(indexToRemove, 1);
                        renderExistingAttachmentsDocList();
                        if(anexoRemovido.id && dbModuleRef) {
                            await dbModuleRef.deleteItem(dbModuleRef.STORES.ATTACHMENTS, anexoRemovido.id);
                        }
                    }
                });
            });
        }
    }

    function preencherFormularioComDados(doc, todasCategorias, todasTags) {
        document.getElementById('doc-id').value = doc.id || '';
        const uuidDisplayElement = document.getElementById(ID_DOC_ID_DISPLAY);
        if (uuidDisplayElement) {
            uuidDisplayElement.textContent = doc.id || 'Novo (ID será gerado ao salvar)';
        }
        document.getElementById(ID_TITULO_DOCUMENTO).value = doc.title || '';
        document.getElementById(ID_TIPO_DOCUMENTO).value = doc.docType || '';

        if (quillEditorInstance && SEFWorkStation.EditorTexto && typeof SEFWorkStation.EditorTexto.setConteudoHtml === 'function') {
            SEFWorkStation.EditorTexto.setConteudoHtml(ID_CONTEUDO_EDITOR, doc.content || '');
        } else if (quillEditorInstance) {
            quillEditorInstance.root.innerHTML = doc.content || '';
        }

        document.getElementById(ID_NOTAS_INTERNAS_DOCUMENTO).value = doc.internalNotes || '';
        document.getElementById(ID_IS_TEMPLATE_CHECKBOX_TOP).checked = !!doc.isTemplate;
        document.getElementById(ID_IS_FAVORITE_CHECKBOX_TOP).checked = !!doc.isFavorite;

        SEFWorkStation.SharedUtils.preencherChips(ID_CATEGORIAS_DOCUMENTO_CONTAINER, doc.categories || [], todasCategorias, dbModuleRef.STORES.DOCUMENT_CATEGORIES, "categoria");
        SEFWorkStation.SharedUtils.preencherChips(ID_TAGS_DOCUMENTO_CONTAINER, doc.tags || [], todasTags, dbModuleRef.STORES.DOCUMENT_TAGS, "tag");

        currentFilesToAttachDoc = [];
        existingAttachmentsDoc = doc.anexos ? [...doc.anexos] : [];
        renderExistingAttachmentsDocList();

        originalDocumentoData = JSON.parse(JSON.stringify(doc));
    }

    async function obterDadosDoFormularioDocumento() {
        const feedbackAreaForm = document.getElementById(`feedback-form-doc-${currentDocumentoId || 'novo'}`) || mainContentWrapperRef;
        const docId = document.getElementById('doc-id').value;
        const titulo = document.getElementById(ID_TITULO_DOCUMENTO).value.trim();
        const tipoDocInput = document.getElementById(ID_TIPO_DOCUMENTO).value.trim();
        const categorias = SEFWorkStation.SharedUtils.obterItensDosChips(ID_CATEGORIAS_DOCUMENTO_CONTAINER);

        if (!titulo) {
            globalShowFeedbackRef("O título do documento é obrigatório.", "error", feedbackAreaForm);
            document.getElementById(ID_TITULO_DOCUMENTO).focus();
            return null;
        }
        if (!tipoDocInput) {
            globalShowFeedbackRef("O tipo do documento é obrigatório.", "error", feedbackAreaForm);
            document.getElementById(ID_TIPO_DOCUMENTO).focus();
            return null;
        }
        if (categorias.length === 0) {
            globalShowFeedbackRef("Ao menos uma categoria deve ser selecionada/criada.", "error", feedbackAreaForm);
            document.getElementById(ID_INPUT_NOVA_CATEGORIA_DOC).focus();
            return null;
        }

        let conteudoDoEditor = '';
        if (quillEditorInstance && SEFWorkStation.EditorTexto && typeof SEFWorkStation.EditorTexto.getConteudoHtml === 'function') {
            conteudoDoEditor = SEFWorkStation.EditorTexto.getConteudoHtml(ID_CONTEUDO_EDITOR);
            if (!conteudoDoEditor.replace(/<(.|\n)*?>/g, '').trim() && !conteudoDoEditor.includes("<img")) {
                globalShowFeedbackRef("O conteúdo do documento é obrigatório.", "error", feedbackAreaForm);
                if (quillEditorInstance) SEFWorkStation.EditorTexto.focarEditor(ID_CONTEUDO_EDITOR);
                return null;
            }
        } else if (quillEditorInstance) {
            conteudoDoEditor = quillEditorInstance.root.innerHTML;
             if (!quillEditorInstance.getText().trim() && !conteudoDoEditor.includes("<img")) {
                globalShowFeedbackRef("O conteúdo do documento é obrigatório.", "error", feedbackAreaForm);
                if (quillEditorInstance) quillEditorInstance.focus();
                return null;
            }
        }


        const idParaPayload = docId || (appModuleRef ? appModuleRef.generateUUID() : `temp-uuid-${Date.now()}`);

        // Padroniza os nomes das propriedades ao salvar
        const documento = {
            id: idParaPayload,
            title: titulo,
            docType: SEFWorkStation.DocumentosTipos && SEFWorkStation.DocumentosTipos.normalizeTypeNameForStorage
                       ? SEFWorkStation.DocumentosTipos.normalizeTypeNameForStorage(tipoDocInput)
                       : tipoDocInput,
            reference: idParaPayload, 
            content: conteudoDoEditor,
            internalNotes: document.getElementById(ID_NOTAS_INTERNAS_DOCUMENTO).value.trim(),
            categories: categorias,
            tags: SEFWorkStation.SharedUtils.obterItensDosChips(ID_TAGS_DOCUMENTO_CONTAINER),
            isTemplate: document.getElementById(ID_IS_TEMPLATE_CHECKBOX_TOP).checked,
            isFavorite: document.getElementById(ID_IS_FAVORITE_CHECKBOX_TOP).checked,
            isDeleted: false,
            creationDate: (docId && originalDocumentoData) ? originalDocumentoData.creationDate : new Date().toISOString(),
            modificationDate: new Date().toISOString(),
            anexos: [...existingAttachmentsDoc],
            // Nomes padronizados aqui:
            documentosVinculadosIds: [...currentRelatedDocIdsDoc],
            contribuintesVinculadosIds: [...currentRelatedContribIdsDoc],
            recursosVinculadosIds: [...currentRelatedRecursoIdsDoc],
            tarefasVinculadasIds: [...currentRelatedTarefaIdsDoc],
            notasRapidasRelacionadasIds: [...currentRelatedNotaRapidaIdsDoc],
            protocolosVinculadosIds: [...currentRelatedProtocoloIdsDoc],
            ptasVinculadosIds: [...currentRelatedPTAIdsDoc],
            autuacoesVinculadasIds: [...currentRelatedAutuacaoIdsDoc],
            servidoresVinculadosIds: [...currentRelatedServidorIdsDoc],
            itcdAvaliacoesStoreVinculadosIds: [...currentRelatedAvaliacaoITCDIdsDoc],
            itcdCalculosStoreVinculadosIds: [...currentRelatedCalculoITCDIdsDoc],
            comunicacaoEmailsGeradosStoreVinculadosIds: [...currentRelatedEmailGeradoIdsDoc],
            comunicacaoDestinatariosStoreVinculadosIds: [...currentRelatedDestinatarioIdsDoc]
        };
        
        if(docId && originalDocumentoData && originalDocumentoData.creationDate) {
            documento.creationDate = originalDocumentoData.creationDate;
        }

        const isEditing = !!docId;
        if (!isEditing && appModuleRef && typeof appModuleRef.generateDocumentReference === 'function') {
            documento.reference = await appModuleRef.generateDocumentReference(documento.docType);
        } else if (isEditing && originalDocumentoData && originalDocumentoData.reference) {
            documento.reference = originalDocumentoData.reference;
        } else if (!documento.reference) { 
             documento.reference = `DOC-${documento.id.substring(0,8)}`;
        }


        return documento;
    }

    async function salvarDocumentoInterno(eventOrDocumento, isSavingAsModelo = false, customTargetView = null, returnDocumentoSemNavegar = false, saveAsNewVersion = false) {
        const feedbackAreaForm = document.getElementById(`feedback-form-doc-${currentDocumentoId || 'novo'}`) || mainContentWrapperRef;
        if (eventOrDocumento && typeof eventOrDocumento.preventDefault === 'function') {
            eventOrDocumento.preventDefault();
        }
        if (globalClearFeedbackRef) globalClearFeedbackRef(feedbackAreaForm);

        let documento = await obterDadosDoFormularioDocumento();
        if (eventOrDocumento && typeof eventOrDocumento.preventDefault !== 'function' && typeof eventOrDocumento === 'object') {
            documento = eventOrDocumento;
        }
        
        if (!documento) return null;

        const isEditing = !!currentDocumentoId;

        if (isEditing && saveAsNewVersion && originalDocumentoData) {
            const archivedVersion = { ...originalDocumentoData };
            archivedVersion.id = appModuleRef.generateUUID(); 
            archivedVersion.isArchivedVersion = true;
            archivedVersion.versionOf = currentDocumentoId; 
            await dbModuleRef.addItem(dbModuleRef.STORES.DOCUMENTS, archivedVersion);
        }

        if (isSavingAsModelo) {
            documento.isTemplate = true;
        }

        const tipoDocNomeNormalizado = documento.docType;
        if (tipoDocNomeNormalizado) {
            if (SEFWorkStation.DocumentosTipos && typeof SEFWorkStation.DocumentosTipos.isValidTypeName === 'function') {
                if (!SEFWorkStation.DocumentosTipos.isValidTypeName(tipoDocNomeNormalizado)) {
                    globalShowFeedbackRef(`Nome do Tipo de Documento inválido: "${SEFWorkStation.DocumentosTipos.formatTypeNameForDisplay(tipoDocNomeNormalizado)}".`, "error", feedbackAreaForm);
                    document.getElementById(ID_TIPO_DOCUMENTO).focus();
                    return null;
                }
                try {
                    const tiposExistentes = await dbModuleRef.getAllItems(dbModuleRef.STORES.DOCUMENT_TYPES);
                    if (!tiposExistentes.some(t => t.name.toLowerCase() === tipoDocNomeNormalizado.toLowerCase())) {
                        if (appModuleRef && typeof appModuleRef.generateUUID === 'function') {
                            await dbModuleRef.addItem(dbModuleRef.STORES.DOCUMENT_TYPES, { id: appModuleRef.generateUUID(), name: tipoDocNomeNormalizado });
                            if (globalShowFeedbackRef) globalShowFeedbackRef(`Novo Tipo de Documento "${SEFWorkStation.DocumentosTipos.formatTypeNameForDisplay(tipoDocNomeNormalizado)}" criado.`, "info", feedbackAreaForm);
                            if (refreshAppCallbackRef) await refreshAppCallbackRef(false);
                        }
                    }
                } catch (error) {
                    globalShowFeedbackRef("Erro ao processar Tipo de Documento.", "error", feedbackAreaForm);
                    return null;
                }
            }
        }

        if (originalDocumentoData && Array.isArray(originalDocumentoData.anexos)) {
            const anexosRemovidos = originalDocumentoData.anexos.filter(originalAnexo =>
                !existingAttachmentsDoc.some(existingAnexo => existingAnexo.id === originalAnexo.id)
            );
            for (const anexo of anexosRemovidos) {
                await sharedUtilsRef.tryDeleteSingleAttachmentFile(anexo.filePath);
                await dbModuleRef.deleteItem(dbModuleRef.STORES.ATTACHMENTS, anexo.id);
            }
        }
        
        let savedAttachments = [...existingAttachmentsDoc];

        if (currentFilesToAttachDoc.length > 0 && sharedUtilsRef) {
            const dirHandle = await sharedUtilsRef.getOrCreateAttachmentDirHandle('documents', documento.id);
            if (dirHandle) {
                for (const file of currentFilesToAttachDoc) {
                    try {
                        const newFileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
                        const fileHandle = await dirHandle.getFileHandle(newFileName, { create: true });
                        const writable = await fileHandle.createWritable();
                        await writable.write(file);
                        await writable.close();
                        
                        const anexoPayload = {
                            id: await appModuleRef.generateUUID(), 
                            ownerId: documento.id,
                            ownerType: 'documento',
                            fileName: file.name,
                            filePath: `attachments_sef/documents/${documento.id}/${newFileName}`,
                            fileType: file.type,
                            fileSize: file.size,
                            uploadDate: new Date().toISOString()
                        };
                        
                        await dbModuleRef.addItem(dbModuleRef.STORES.ATTACHMENTS, anexoPayload);
                        savedAttachments.push({
                           id: anexoPayload.id,
                           fileName: anexoPayload.fileName,
                           filePath: anexoPayload.filePath,
                           fileSize: anexoPayload.fileSize,
                           fileType: anexoPayload.fileType,
                           uploadDate: anexoPayload.uploadDate
                        });
                    } catch (fsError) {
                        globalShowFeedbackRef(`Erro ao salvar anexo "${file.name}": ${fsError.message}.`, "error", feedbackAreaForm);
                    }
                }
            } else {
                globalShowFeedbackRef("Não foi possível acessar/criar a pasta de anexos. Novos anexos não foram salvos fisicamente.", "warning", feedbackAreaForm);
            }
        }
        documento.anexos = savedAttachments;
        
        currentFilesToAttachDoc = [];
        const anexoInputElement = document.getElementById(ID_DOC_ANEXOS_INPUT);
        if (anexoInputElement) anexoInputElement.value = null;
        const previewAnexosNovos = document.getElementById(ID_ANEXOS_PREVIEW_DOC_LIST);
        if (previewAnexosNovos) previewAnexosNovos.innerHTML = '';

        let idsRelacionadosAnteriores = {};
        if(currentDocumentoId && originalDocumentoData) {
            const allEntityConfigs = window.SEFWorkStation.EntityConfig.getAllConfigs();
            for (const entity of allEntityConfigs) {
                 if (entity.isLinkable) {
                    const propNameStandard = `${entity.storeName}VinculadosIds`;
                    const propNameLegacyMap = {
                        'documents': 'relatedDocuments',
                        'contribuintes': 'relatedContribuintes',
                        'notasRapidasStore': 'notasRapidasRelacionadasIds'
                    };
                    const propNameLegacy = propNameLegacyMap[entity.storeName];
                    
                    idsRelacionadosAnteriores[entity.storeName] = (originalDocumentoData[propNameStandard] || (propNameLegacy ? originalDocumentoData[propNameLegacy] : undefined)) || [];
                }
            }
        }

        try {
            await dbModuleRef.updateItem(dbModuleRef.STORES.DOCUMENTS, documento);
            let feedbackMsg = isSavingAsModelo ? "Modelo salvo com sucesso!" : "Documento salvo com sucesso!";
            if(saveAsNewVersion) feedbackMsg += " Nova versão criada.";

            globalShowFeedbackRef(feedbackMsg, "success", feedbackAreaForm);

            if (SEFWorkStation.SharedUtils && typeof SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais === 'function') {
                const allEntityConfigs = window.SEFWorkStation.EntityConfig.getAllConfigs();
                for (const entity of allEntityConfigs) {
                    if (entity.isLinkable && entity.targetLinkField) {
                        const documentoFieldName = `${entity.storeName}VinculadosIds`;
                         await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(
                            documento.id,
                            entity.storeName,
                            entity.targetLinkField,
                            documento[documentoFieldName] || [],
                            idsRelacionadosAnteriores[entity.storeName] || [],
                            dbModuleRef
                        );
                    }
                }
            }

            if (refreshAppCallbackRef) await refreshAppCallbackRef();
            if (returnDocumentoSemNavegar) return documento;

            if (customTargetView) {
                if (appModuleRef && appModuleRef.handleMenuAction) appModuleRef.handleMenuAction(customTargetView);
            } else {
                if (appModuleRef && appModuleRef.handleMenuAction) {
                    appModuleRef.handleMenuAction('visualizar-documento', { docId: documento.id, originatingView: originatingView });
                } else {
                    if (navigateBackRef) navigateBackRef();
                }
            }
            return documento;
        } catch (error) {
            globalShowFeedbackRef(`Erro crítico ao salvar documento: ${error.message}. Verifique o console.`, "error", feedbackAreaForm);
            return null;
        }
    }
    
    async function renderSelectedRelatedItemsDoc() {
        const allEntityConfigs = window.SEFWorkStation.EntityConfig.getAllConfigs();
        for (const config of allEntityConfigs) {
            if (config.storeName !== dbModuleRef.STORES.DOCUMENTS && config.isLinkable) { 
                const containerId = `lista-${config.storeName}-vinculados-doc`;
                const currentIdsArray = getEntityStateArray(config.storeName);
                if (currentIdsArray) {
                    await renderSelectedItemsListDoc(currentIdsArray, containerId, config);
                }
            }
        }
    }

    async function renderSelectedItemsListDoc(ids, containerId, entityConfig) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        if (!ids || ids.length === 0) {
            container.innerHTML = `<p class="text-xs text-gray-500 dark:text-gray-400">Nenhum ${entityConfig.labelSingular.toLowerCase()} vinculado.</p>`;
            return;
        }

        const ul = document.createElement('ul');
        ul.className = 'list-none p-0 space-y-1';
        for (const id of ids) {
            try {
                const item = await dbModuleRef.getItemById(entityConfig.storeName, id);
                const li = document.createElement('li');
                li.className = 'flex justify-between items-center text-xs p-1.5 bg-gray-200 dark:bg-slate-600 rounded';
                let displayName = item ? (item[entityConfig.displayField] || `ID ${id.toString().substring(0,8)}`) : `ID ${String(id).substring(0,8)} (não encontrado)`;
                
                li.innerHTML = `
                    <span class="truncate text-gray-700 dark:text-gray-200" title="${String(displayName).replace(/"/g, '"')}">${displayName}</span>
                    <button type="button" data-id="${id}" data-store-name="${entityConfig.storeName}" class="btn-remove-related-item-doc text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm leading-none p-0.5" title="Remover vínculo">×</button>
                `;
                li.querySelector('.btn-remove-related-item-doc').addEventListener('click', handleRemoveRelatedItemDoc);
                ul.appendChild(li);
            } catch (error) {
                console.warn(`Erro ao renderizar item vinculado ${entityConfig.labelSingular} ID ${id} para documento:`, error);
            }
        }
        container.appendChild(ul);
    }
    
    function handleRemoveRelatedItemDoc(event) {
        const idToRemove = event.currentTarget.dataset.id;
        const storeNameToRemove = event.currentTarget.dataset.storeName;
        
        const currentIdsArray = getEntityStateArray(storeNameToRemove);

        if (Array.isArray(currentIdsArray)) {
            const index = currentIdsArray.indexOf(idToRemove);
            if (index > -1) currentIdsArray.splice(index, 1);
        }
        renderSelectedRelatedItemsDoc();
    }
    
    async function abrirModalSelecaoDoc(storeName) {
        const entityConfig = window.SEFWorkStation.EntityConfig.getConfigByStoreName(storeName);
        if (!entityConfig) return;

        if (!uiModuleRef || !uiModuleRef.showModal) {
            globalShowFeedbackRef("Erro: Funcionalidade de modal não está disponível.", "error");
            return;
        }

        const currentIdsArray = getEntityStateArray(storeName);
        if(!currentIdsArray) return;

        tempSelectedIdsModal = [...currentIdsArray];
        const modalId = `modal-selecionar-${storeName}-doc-${Date.now()}`;
        
        const modalContentHtml = `
            <div class="bg-gray-100 dark:bg-slate-700 p-3 rounded-md">
                <input type="search" id="filtro-modal-${storeName}-doc" class="form-input-text w-full mb-3 text-sm" placeholder="Buscar ${entityConfig.labelSingular.toLowerCase()} por ${entityConfig.displayField}..."/>
                <div id="lista-${storeName}-modal-doc" class="overflow-y-auto flex-grow border dark:border-slate-500 rounded-md p-2 min-h-[200px] max-h-[50vh] bg-white dark:bg-slate-600">
                    <p class="text-sm text-gray-500 dark:text-gray-300">Carregando...</p>
                </div>
            </div>`;
            
        const carregarItensNoModal = async (termoBusca = '') => {
            const listaModalEl = document.getElementById(`lista-${storeName}-modal-doc`);
            if (!listaModalEl) return;
            listaModalEl.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-300">Carregando...</p>';
            try {
                if (!dbModuleRef || !dbModuleRef.getAllItems) throw new Error("DB não acessível para carregar itens do modal");
                const todosItensDB = await dbModuleRef.getAllItems(entityConfig.storeName);
                let todosItens = window.SEFWorkStation.EntityConfig.filterActiveItems(todosItensDB, entityConfig.storeName);
                todosItens = todosItens.filter(item => item.id !== currentDocumentoId);

                if (termoBusca) {
                    const t = termoBusca.toLowerCase();
                    todosItens = todosItens.filter(item =>
                        (item[entityConfig.displayField] && String(item[entityConfig.displayField]).toLowerCase().includes(t)) ||
                        (item.id && String(item.id).toLowerCase().includes(t)) ||
                        (entityConfig.secondaryField && item[entityConfig.secondaryField] && String(item[entityConfig.secondaryField]).toLowerCase().includes(t))
                    );
                }
                todosItens.sort((a, b) => String(a[entityConfig.displayField] || "").localeCompare(String(b[entityConfig.displayField] || "")));

                if (todosItens.length === 0) {
                    listaModalEl.innerHTML = `<p class="text-sm text-gray-500 dark:text-gray-400">${termoBusca ? 'Nenhum item encontrado.' : `Nenhum ${entityConfig.labelSingular.toLowerCase()} disponível.`}</p>`;
                    return;
                }
                let itemsHtml = '<ul class="space-y-1.5">';
                todosItens.forEach(item => {
                    const isChecked = tempSelectedIdsModal.includes(item.id);
                    const displayName = item[entityConfig.displayField] || `ID ${item.id.toString().substring(0,8)}`;
                    const subInfo = entityConfig.secondaryField && item[entityConfig.secondaryField] ? `(${item[entityConfig.secondaryField]})` : '';
                    itemsHtml += `
                        <li class="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-500">
                            <label class="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" value="${item.id}" class="form-checkbox rounded modal-${storeName}-doc-checkbox h-4 w-4" ${isChecked ? 'checked' : ''}>
                                <span class="text-sm text-gray-700 dark:text-gray-200">${displayName} <span class="text-xs text-gray-500 dark:text-gray-400 ml-1">${subInfo}</span></span>
                            </label>
                        </li>`;
                });
                itemsHtml += '</ul>';
                listaModalEl.innerHTML = itemsHtml;
                listaModalEl.querySelectorAll(`.modal-${storeName}-doc-checkbox`).forEach(cb => {
                    cb.addEventListener('change', (e) => {
                        const itemId = e.target.value;
                        if (e.target.checked) { if (!tempSelectedIdsModal.includes(itemId)) tempSelectedIdsModal.push(itemId); } 
                        else { tempSelectedIdsModal = tempSelectedIdsModal.filter(id => id !== itemId); }
                    });
                });
            } catch (error) { if (listaModalEl) listaModalEl.innerHTML = `<p class="text-sm text-red-500 dark:text-red-400">Erro ao carregar.</p>`; }
        };

        const modalButtons = [
            { text: 'Cancelar', class: 'btn-secondary text-sm', callback: () => uiModuleRef.closeModal(), closesModal: true },
            { text: 'Confirmar Seleção', class: 'btn-primary text-sm', callback: async () => {
                currentIdsArray.length = 0;
                Array.prototype.push.apply(currentIdsArray, tempSelectedIdsModal);
                await renderSelectedRelatedItemsDoc();
                uiModuleRef.closeModal();
            }}
        ];
        uiModuleRef.showModal(`Selecionar ${entityConfig.labelPlural} para Vincular`, modalContentHtml, modalButtons, 'max-w-2xl', modalId);
        const filtroInput = document.getElementById(`filtro-modal-${storeName}-doc`);
        if (filtroInput) filtroInput.addEventListener('input', () => carregarItensNoModal(filtroInput.value));
        await carregarItensNoModal();
    }

    function addFormEventListeners(originView, isEditing) {
        const formEl = document.getElementById(ID_FORM_DOCUMENTO);

        document.getElementById('btn-salvar-doc-principal')?.addEventListener('click', (event) => {
            salvarDocumentoInterno(event, false, null, false, false);
        });
        
        document.getElementById('btn-salvar-nova-versao-doc')?.addEventListener('click', (event) => {
            salvarDocumentoInterno(event, false, null, false, true);
        });

        if (formEl) {
            formEl.addEventListener('submit', (event) => {
                 event.preventDefault();
            });
        }

        document.getElementById('btn-salvar-como-modelo-doc')?.addEventListener('click', async () => {
            const documento = await obterDadosDoFormularioDocumento();
            if (documento) {
                 await salvarDocumentoInterno(documento, true, 'gerenciar-modelos');
            }
        });

        document.getElementById('btn-salvar-e-novo-doc')?.addEventListener('click', async () => {
            const documentoAtual = await obterDadosDoFormularioDocumento();
            if (documentoAtual) {
                const documentoSalvo = await salvarDocumentoInterno(documentoAtual, false, null, true);
                if (documentoSalvo) {
                    if (quillEditorInstance && SEFWorkStation.EditorTexto.destruirEditor) {
                        SEFWorkStation.EditorTexto.destruirEditor(ID_CONTEUDO_EDITOR);
                    }
                    quillEditorInstance = null; 
                    renderNovoDocumentoForm(null, originatingView);
                }
            }
        });

        const btnCancelar = document.getElementById('btn-cancelar-doc');
        if (btnCancelar) {
            btnCancelar.addEventListener('click', () => {
                if (quillEditorInstance && SEFWorkStation.EditorTexto.destruirEditor) {
                    SEFWorkStation.EditorTexto.destruirEditor(ID_CONTEUDO_EDITOR);
                }
                quillEditorInstance = null;

                if (onFormCloseCallback && typeof onFormCloseCallback === 'function') {
                    onFormCloseCallback();
                } else if (navigateBackRef && typeof navigateBackRef === 'function') {
                    navigateBackRef();
                } else if (appModuleRef && appModuleRef.irParaHome) {
                    appModuleRef.irParaHome();
                }
            });
        }

        const inputNovaCategoriaEl = document.getElementById(ID_INPUT_NOVA_CATEGORIA_DOC);
        if (inputNovaCategoriaEl) {
            inputNovaCategoriaEl.addEventListener('keypress', async function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const valor = this.value.trim();
                    if (valor) {
                        const nomeNormalizadoParaArmazenar = SEFWorkStation.DocumentosCategorias.normalizeCategoryNameForStorage(valor);
                        await sharedUtilsRef.adicionarItemChipContainer(ID_CATEGORIAS_DOCUMENTO_CONTAINER, nomeNormalizadoParaArmazenar, dbModuleRef.STORES.DOCUMENT_CATEGORIES, "categoria", dbModuleRef, globalShowFeedbackRef, appModuleRef);
                    }
                    this.value = '';
                }
            });
            inputNovaCategoriaEl.addEventListener('input', async function(e) {
                 if (e.inputType === undefined) { 
                    const valor = this.value.trim();
                     if (valor) {
                        const nomeNormalizadoParaArmazenar = SEFWorkStation.DocumentosCategorias.normalizeCategoryNameForStorage(valor);
                        await sharedUtilsRef.adicionarItemChipContainer(ID_CATEGORIAS_DOCUMENTO_CONTAINER, nomeNormalizadoParaArmazenar, dbModuleRef.STORES.DOCUMENT_CATEGORIES, "categoria", dbModuleRef, globalShowFeedbackRef, appModuleRef);
                    }
                    this.value = '';
                }
            });
        }

        const inputNovaTagEl = document.getElementById(ID_INPUT_NOVA_TAG_DOC);
        if (inputNovaTagEl) {
            inputNovaTagEl.addEventListener('keypress', async function(e) {
                if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    const tagValue = this.value.trim().replace(/,$/, '');
                    if (tagValue) {
                        await sharedUtilsRef.adicionarItemChipContainer(ID_TAGS_DOCUMENTO_CONTAINER, tagValue, dbModuleRef.STORES.DOCUMENT_TAGS, "tag", dbModuleRef, globalShowFeedbackRef, appModuleRef);
                    }
                    this.value = '';
                }
            });
             inputNovaTagEl.addEventListener('input', async function(e){ 
                 if (e.inputType === undefined) {
                    const tagValue = this.value.trim().replace(/,$/, '');
                    if (tagValue) {
                        await sharedUtilsRef.adicionarItemChipContainer(ID_TAGS_DOCUMENTO_CONTAINER, tagValue, dbModuleRef.STORES.DOCUMENT_TAGS, "tag", dbModuleRef, globalShowFeedbackRef, appModuleRef);
                    }
                    this.value = '';
                }
            });
        }

        const allEntityConfigs = window.SEFWorkStation.EntityConfig.getAllConfigs();
        for (const config of allEntityConfigs) {
             if (config.storeName !== dbModuleRef.STORES.DOCUMENTS && config.isLinkable) {
                const btnGerenciar = document.getElementById(`btn-gerenciar-${config.storeName}-vinculados-doc`);
                if (btnGerenciar) {
                    btnGerenciar.addEventListener('click', (e) => {
                        const entityStoreNameClicked = e.currentTarget.dataset.entityStore;
                        abrirModalSelecaoDoc(entityStoreNameClicked);
                    });
                }
            }
        }

        const anexoInputElement = document.getElementById(ID_DOC_ANEXOS_INPUT);
        const anexoPreviewListEl = document.getElementById(ID_ANEXOS_PREVIEW_DOC_LIST);
        if (anexoInputElement && anexoPreviewListEl) {
            anexoInputElement.addEventListener('change', (event) => {
                currentFilesToAttachDoc = Array.from(event.target.files);
                anexoPreviewListEl.innerHTML = '';
                if (currentFilesToAttachDoc.length > 0) {
                    const ul = document.createElement('ul');
                    ul.className = 'list-disc pl-5 text-sm text-gray-600 dark:text-gray-400';
                    currentFilesToAttachDoc.forEach(file => {
                        const li = document.createElement('li');
                        li.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
                        ul.appendChild(li);
                    });
                    anexoPreviewListEl.appendChild(ul);
                }
            });
        }
        
        const btnInserirPlaceholder = document.getElementById(ID_BTN_INSERIR_PLACEHOLDER);
        if (btnInserirPlaceholder && uiModuleRef && typeof uiModuleRef.setupDropdownEventListeners === 'function') {
            const formWrapperForDropdown = document.getElementById(ID_FORM_DOCUMENTO); 
            if (formWrapperForDropdown) {
                uiModuleRef.setupDropdownEventListeners(formWrapperForDropdown);
            }
             if (btnInserirPlaceholder) {
                btnInserirPlaceholder.addEventListener('click', async (event) => {
                    event.stopPropagation(); 
                    await popularDropdownPlaceholders(ID_PLACEHOLDER_DROPDOWN_CONTAINER);
                });
            }
        }
    }

    return {
        init,
        renderNovoDocumentoForm
    };
})();