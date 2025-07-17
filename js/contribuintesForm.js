// js/contribuintesForm.js - Lógica para Formulários de Contribuintes (Criação/Edição)
// v5.6.2 - CORREÇÃO: Utiliza SEFWorkStation.State.getDirectoryHandle() em vez da variável global obsoleta window.directoryHandle para salvar anexos, corrigindo o bug reportado.
// v5.6.1 - CORREÇÃO: ReferenceError em `renderNovoContribuinteForm` pois `renderCustomFieldInput` não estava definida no escopo da chamada.
// v5.6.0 - REFATORADO: Utiliza EntityConfig.filterActiveItems para filtrar itens vinculáveis, corrigindo o bug de versionamento.
// ... (histórico anterior)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.ContribuintesForm = (function() {
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let refreshApplicationStateRef;
    let dbRef;
    let contribuintesViewModuleRef;
    let appModuleRef; 
    let uiModuleRef;
    let ajudaModuleRef;

    const CONTRIBUINTES_STORE_NAME = 'contribuintes';
    const DOCUMENTS_STORE_NAME = 'documents';
    const RECURSOS_STORE_NAME = 'recursos';
    const NOTAS_RAPIDAS_STORE_NAME = 'notasRapidasStore';
    const TAREFAS_STORE_NAME = 'tarefasStore';
    const PROTOCOLOS_STORE_NAME = 'protocolosStore';
    const PTAS_STORE_NAME = 'ptasStore';
    const AUTUACOES_STORE_NAME = 'autuacoesStore';

    let CONTRIBUINTE_CATEGORIES_STORE_NAME;
    let CONTRIBUINTE_TAGS_STORE_NAME;

    let currentContribId = null;
    let originalContribuinteData = null;
    let currentFilesToAttachContrib = [];
    let existingAttachmentsContrib = [];

    let currentRelatedDocIds = [];
    let currentRelatedRecursoIds = [];
    let currentRelatedNotaRapidaIds = [];
    let currentRelatedTarefaIds = [];
    let currentRelatedProtocoloIds = [];
    let currentRelatedPTAIds = [];
    let currentRelatedAutuacaoIds = [];

    let tempSelectedIdsModal = [];
    let currentOriginatingView = 'gerir-contribuintes';

    let todasCategoriasContribSistemaCache = [];
    let todasTagsContribSistemaCache = [];
    let currentSelectedCategoriesForContrib = [];
    let currentSelectedTagsForContrib = [];
    
    let currentSelectedMatriz = null; 
    let todasMatrizesCache = [];

    // CORREÇÃO: Mover a definição da função para o topo do escopo do módulo.
    function renderCustomFieldInput(index, key = '', value = '') {
        return `
            <div class="custom-field-group flex items-center gap-2 mb-2">
                <input type="text" name="customFieldKey" value="${key.replace(/"/g, '"')}" class="form-input-text text-sm py-1 px-2 w-2/5" placeholder="Nome do Campo ${index + 1}">
                <input type="text" name="customFieldValue" value="${value.replace(/"/g, '"')}" class="form-input-text text-sm py-1 px-2 w-2/5" placeholder="Valor do Campo ${index + 1}">
                <button type="button" class="btn-remove-custom-field-contrib btn-delete btn-sm text-xs p-1" title="Remover Campo">×</button>
            </div>
        `;
    }

    function validarCPF(cpf) {
        cpf = String(cpf).replace(/[^\d]+/g, '');
        if (cpf === '' || cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
        let soma = 0, resto;
        for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
        resto = (soma * 10) % 11;
        if ((resto === 10) || (resto === 11)) resto = 0;
        if (resto !== parseInt(cpf.substring(9, 10))) return false;
        soma = 0;
        for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
        resto = (soma * 10) % 11;
        if ((resto === 10) || (resto === 11)) resto = 0;
        return resto === parseInt(cpf.substring(10, 11));
    }

    function validarCNPJ(cnpj) {
        cnpj = String(cnpj).replace(/[^\d]+/g, '');
        if (cnpj === '' || cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
        let tamanho = cnpj.length - 2;
        let numeros = cnpj.substring(0, tamanho);
        const digitos = cnpj.substring(tamanho);
        let soma = 0;
        let pos = tamanho - 7;
        for (let i = tamanho; i >= 1; i--) {
            soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
            if (pos < 2) pos = 9;
        }
        let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
        if (resultado !== parseInt(digitos.charAt(0))) return false;
        tamanho += 1;
        numeros = cnpj.substring(0, tamanho);
        soma = 0;
        pos = tamanho - 7;
        for (let i = tamanho; i >= 1; i--) {
            soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
            if (pos < 2) pos = 9;
        }
        resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
        return resultado === parseInt(digitos.charAt(1));
    }

    function validarEmail(email) {
        if (!email || email.trim() === '') return true;
        const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }

    function validarTelefone(telefone) {
        if (!telefone || telefone.trim() === '') return true;
        const re = /^\(?([0-9]{2})\)?[\s-]?([0-9]{4,5})[\s-]?([0-9]{4})$/;
        return re.test(String(telefone).replace(/[^\d]+/g, ''));
    }

    function init(
        mainWrapper,
        showFeedbackFunc,
        clearFeedbackFunc,
        irParaHomeFunc,
        refreshFunc,
        dbModuleRef,
        applicationModuleRef,
        uiRefModule,
        viewModule
    ) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedbackFunc;
        globalClearFeedbackRef = clearFeedbackFunc;
        refreshApplicationStateRef = refreshFunc;
        dbRef = dbModuleRef;
        contribuintesViewModuleRef = viewModule;
        appModuleRef = applicationModuleRef;
        uiModuleRef = uiRefModule;
        ajudaModuleRef = SEFWorkStation.Ajuda;


        if (window.SEFWorkStation && window.SEFWorkStation.DB && window.SEFWorkStation.DB.STORES) {
            CONTRIBUINTE_CATEGORIES_STORE_NAME = window.SEFWorkStation.DB.STORES.CONTRIBUINTE_CATEGORIES;
            CONTRIBUINTE_TAGS_STORE_NAME = window.SEFWorkStation.DB.STORES.CONTRIBUINTE_TAGS;
        } else {
            console.error("ContribuintesForm.JS: init - Constantes de Stores de Categorias/Tags do DB não encontradas!");
        }


        if (!dbRef) console.error("ContribuintesForm.JS: init - Referência ao DB não fornecida!");
        if (!mainContentWrapperRef) console.error("ContribuintesForm.JS: init - mainContentWrapperRef não fornecido.");
        if (!appModuleRef) {
            console.error("ContribuintesForm.JS: init - appModuleRef (applicationModuleRef) NÃO FOI FORNECIDO CORRETAMENTE ou é undefined!");
        }
        if (!uiModuleRef) console.warn("ContribuintesForm.JS: init - uiModuleRef não fornecido.");
        if (!ajudaModuleRef) console.warn("ContribuintesForm.JS: init - ajudaModuleRef não disponível.");
        console.log("ContribuintesForm.JS: Módulo inicializado (v5.6.2).");
    }

    async function renderNovoContribuinteForm(contribuinteData = null, originView = 'gerir-contribuintes', preSelectedLink = null) {
        currentOriginatingView = originView;
        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (!mainContentWrapperRef) {
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico ao tentar renderizar o formulário de contribuinte.", "error");
            return;
        }

        let isPreLinking = preSelectedLink && (preSelectedLink.type === 'documento' || preSelectedLink.type === 'tarefa');
        const isEditing = contribuinteData && contribuinteData.id && !isPreLinking;
        currentContribId = isEditing ? contribuinteData.id : null;
        originalContribuinteData = isEditing ? JSON.parse(JSON.stringify(contribuinteData)) : null;

        // Limpa estado anterior
        currentFilesToAttachContrib = [];
        existingAttachmentsContrib = (isEditing && Array.isArray(contribuinteData.anexos)) ? [...contribuinteData.anexos] : [];
        currentRelatedDocIds = (isEditing && Array.isArray(contribuinteData.documentosRelacionadosIds)) ? [...contribuinteData.documentosRelacionadosIds] : [];
        currentRelatedRecursoIds = (isEditing && Array.isArray(contribuinteData.recursosRelacionadosIds)) ? [...contribuinteData.recursosRelacionadosIds] : [];
        currentRelatedNotaRapidaIds = (isEditing && Array.isArray(contribuinteData.notasRapidasRelacionadasIds)) ? [...contribuinteData.notasRapidasRelacionadasIds] : [];
        currentRelatedTarefaIds = (isEditing && Array.isArray(contribuinteData.tarefasRelacionadasIds)) ? [...contribuinteData.tarefasRelacionadasIds] : [];
        currentRelatedProtocoloIds = (isEditing && Array.isArray(contribuinteData.protocolosRelacionadosIds)) ? [...contribuinteData.protocolosRelacionadosIds] : [];
        currentRelatedPTAIds = (isEditing && Array.isArray(contribuinteData.ptasRelacionadosIds)) ? [...contribuinteData.ptasRelacionadosIds] : [];
        currentRelatedAutuacaoIds = (isEditing && Array.isArray(contribuinteData.autuacoesRelacionadasIds)) ? [...contribuinteData.autuacoesRelacionadasIds] : [];

        currentSelectedCategoriesForContrib = (isEditing && Array.isArray(contribuinteData.categories)) ? [...contribuinteData.categories] : [];
        currentSelectedTagsForContrib = (isEditing && Array.isArray(contribuinteData.tags)) ? [...contribuinteData.tags] : [];
        currentSelectedMatriz = null;


        const formTitle = isEditing ? "Editar Contribuinte" : "Novo Contribuinte";
        const feedbackAreaId = `feedback-form-contribuinte-${currentContribId || 'novo'}`;

        mainContentWrapperRef.innerHTML = '';
        if (appModuleRef && typeof appModuleRef.setCurrentViewTarget === 'function') {
            appModuleRef.setCurrentViewTarget('form-contribuinte', !isEditing);
        }

        todasCategoriasContribSistemaCache = await dbRef.getAllItems(CONTRIBUINTE_CATEGORIES_STORE_NAME);
        todasCategoriasContribSistemaCache.sort((a, b) => a.name.localeCompare(b.name));
        todasTagsContribSistemaCache = await dbRef.getAllItems(CONTRIBUINTE_TAGS_STORE_NAME);
        todasTagsContribSistemaCache.sort((a, b) => a.name.localeCompare(b.name));
        
        const todosContribuintes = await dbRef.getAllItems(CONTRIBUINTES_STORE_NAME);
        todasMatrizesCache = todosContribuintes.filter(c => c.isMatriz && c.id !== currentContribId);

        if (isEditing && contribuinteData.matrizId) {
            currentSelectedMatriz = await dbRef.getItemById(CONTRIBUINTES_STORE_NAME, contribuinteData.matrizId);
        }

        const formHtml = `
            <div class="form-section"> 
                <h2 class="text-xl font-semibold mb-6">${formTitle}</h2>
                <div id="${feedbackAreaId}" class="mb-4"></div>

                <form id="form-contribuinte" onsubmit="return false;">
                    <input type="hidden" id="contrib-id-hidden" value="${currentContribId || ''}">
                    <input type="hidden" id="contrib-creation-date" value="${(isEditing && contribuinteData?.creationDate) ? contribuinteData.creationDate : new Date().toISOString()}">

                    <div class="mb-4">
                        <label for="contrib-nome" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome / Razão Social: <span class="text-red-500">*</span></label>
                        <input type="text" id="contrib-nome" name="nome" class="form-input-text mt-1 block w-full" required value="${contribuinteData?.nome?.replace(/"/g, '"') || ''}">
                    </div>

                    <div class="form-grid">
                        <div>
                            <label for="contrib-cpf-cnpj" class="block text-sm font-medium text-gray-700 dark:text-gray-300">CPF / CNPJ:</label>
                            <input type="text" id="contrib-cpf-cnpj" name="cpfCnpj" class="form-input-text mt-1 block w-full" value="${contribuinteData?.cpfCnpj?.replace(/"/g, '"') || ''}">
                            <p id="feedback-cpf-cnpj" class="text-xs mt-1"></p>
                        </div>
                        <div>
                            <label for="contrib-ie" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Inscrição Estadual:</label>
                            <input type="text" id="contrib-ie" name="inscricaoEstadual" class="form-input-text mt-1 block w-full" value="${contribuinteData?.inscricaoEstadual?.replace(/"/g, '"') || ''}">
                        </div>
                    </div>

                    <h3 class="text-md font-semibold my-4 pt-4 border-t dark:border-slate-600">Estrutura Matriz/Filial</h3>
                    <div class="mb-4 p-4 border rounded-md bg-gray-50 dark:bg-slate-800/50">
                        <div class="flex items-center mb-4">
                            <input type="checkbox" id="contrib-is-matriz" class="form-checkbox h-4 w-4 rounded text-blue-600 focus:ring-blue-500" ${isEditing && contribuinteData.isMatriz ? 'checked' : ''}>
                            <label for="contrib-is-matriz" class="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Este contribuinte é uma Matriz</label>
                        </div>
                        <div id="matriz-selection-container">
                            <label for="contrib-matriz-search" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Vincular a uma Matriz (se for Filial):</label>
                            <div id="contrib-selected-matriz" class="mt-2 mb-1"></div>
                            <div class="relative">
                                <input type="text" id="contrib-matriz-search" class="form-input-text mt-1 block w-full" placeholder="Digite o nome ou CNPJ da Matriz para buscar...">
                                <div id="contrib-matriz-suggestions" class="absolute z-10 w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-500 rounded-md shadow-lg mt-1 hidden max-h-40 overflow-y-auto"></div>
                            </div>
                        </div>
                    </div>

                    <h3 class="text-md font-semibold my-4 pt-4 border-t dark:border-slate-600">Informações de Contato</h3>
                    <div class="form-grid">
                        <div>
                            <label for="contrib-email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Email:</label>
                            <input type="email" id="contrib-email" name="email" class="form-input-text mt-1 block w-full" value="${contribuinteData?.email?.replace(/"/g, '"') || ''}">
                            <p id="feedback-email" class="text-xs mt-1"></p>
                        </div>
                        <div>
                            <label for="contrib-telefone" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Telefone:</label>
                            <input type="tel" id="contrib-telefone" name="telefone" class="form-input-text mt-1 block w-full" value="${contribuinteData?.telefone?.replace(/"/g, '"') || ''}" placeholder="(XX) XXXXX-XXXX">
                            <p id="feedback-telefone" class="text-xs mt-1"></p>
                        </div>
                    </div>
                    <div class="mb-4 mt-4">
                        <label for="contrib-endereco" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Endereço:</label>
                        <input type="text" id="contrib-endereco" name="endereco" class="form-input-text mt-1 block w-full" value="${contribuinteData?.endereco?.replace(/"/g, '"') || ''}">
                    </div>

                    <h3 class="text-md font-semibold my-4 pt-4 border-t dark:border-slate-600">Organização</h3>
                    <div class="mb-4 relative">
                        <label for="contrib-categories-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Categorias:</label>
                        <input type="text" id="contrib-categories-input" class="form-input-text mt-1 block w-full" placeholder="Digite para filtrar ou criar nova categoria (Enter para criar)">
                        <div id="contrib-categories-suggestions-dropdown" class="absolute z-10 w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-500 rounded-md shadow-lg mt-1 hidden max-h-40 overflow-y-auto"></div>
                        <div id="contrib-selected-categories-list" class="mt-2 flex flex-wrap gap-2"></div>
                    </div>

                    <div class="mb-4 relative">
                        <label for="contrib-tags-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Tags:</label>
                        <input type="text" id="contrib-tags-input" class="form-input-text mt-1 block w-full" placeholder="Digite tags (Enter ou vírgula para adicionar/criar nova)">
                        <div id="contrib-tags-autocomplete-list" class="absolute z-10 w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-500 rounded-md shadow-lg mt-1 hidden max-h-40 overflow-y-auto"></div>
                        <div id="contrib-selected-tags-list" class="mt-2 flex flex-wrap gap-2"></div>
                    </div>

                    <div class="mb-4">
                        <div class="flex items-center mb-1">
                            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">Campos Personalizados:</h4>
                            <button type="button" id="ajuda-campos-personalizados-contrib" class="ml-2 p-0.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-300" title="Ajuda sobre Campos Personalizados">
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" class="bi bi-question-circle" viewBox="0 0 16 16">
                                    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                                    <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286zm1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94z"/>
                                </svg>
                            </button>
                        </div>
                        <div id="contrib-custom-fields-container" class="space-y-2">
                            ${contribuinteData?.customFields ? contribuinteData.customFields.map((field, index) => renderCustomFieldInput(index, field.key, field.value)).join('') : renderCustomFieldInput(0)}
                        </div>
                        <button type="button" id="btn-add-custom-field-contrib" class="btn-secondary btn-sm mt-2 text-xs">Adicionar Campo</button>
                    </div>
                    <h3 class="text-md font-semibold my-4 pt-4 border-t dark:border-slate-600">Vincular a Outras Entidades:</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Documentos Relacionados:</label>
                            <div id="lista-docs-relacionados-contrib" class="mt-1 mb-2 p-2 border dark:border-slate-500 rounded-md bg-gray-100 dark:bg-slate-700 min-h-[30px] max-h-28 overflow-y-auto"></div>
                            <button type="button" id="btn-gerenciar-docs-rel-contrib" class="btn-secondary btn-sm text-xs">Gerenciar Vínculos</button>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Recursos Relacionados:</label>
                            <div id="lista-recursos-relacionados-contrib" class="mt-1 mb-2 p-2 border dark:border-slate-500 rounded-md bg-gray-100 dark:bg-slate-700 min-h-[30px] max-h-28 overflow-y-auto"></div>
                            <button type="button" id="btn-gerenciar-recursos-rel-contrib" class="btn-secondary btn-sm text-xs">Gerenciar Vínculos</button>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Notas Rápidas Vinculadas:</label>
                            <div id="lista-notas-vinculadas-contrib" class="mt-1 mb-2 p-2 border dark:border-slate-500 rounded-md bg-gray-100 dark:bg-slate-700 min-h-[30px] max-h-28 overflow-y-auto"></div>
                            <button type="button" id="btn-gerenciar-notas-vinculadas-contrib" class="btn-secondary btn-sm text-xs">Gerenciar Vínculos</button>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Tarefas Vinculadas:</label>
                            <div id="lista-tarefas-vinculadas-contrib" class="mt-1 mb-2 p-2 border dark:border-slate-500 rounded-md bg-gray-100 dark:bg-slate-700 min-h-[30px] max-h-28 overflow-y-auto"></div>
                            <button type="button" id="btn-gerenciar-tarefas-vinculadas-contrib" class="btn-secondary btn-sm text-xs">Gerenciar Vínculos</button>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Protocolos Vinculados:</label>
                            <div id="lista-protocolos-vinculados-contrib-form" class="mt-1 mb-2 p-2 border dark:border-slate-600 rounded-md bg-gray-50 dark:bg-slate-700/50 min-h-[30px] max-h-28 overflow-y-auto"></div>
                            <button type="button" id="btn-gerenciar-protocolos-vinculados-contrib" class="btn-secondary btn-sm text-xs">Gerenciar Protocolos</button>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">PTAs Vinculados:</label>
                            <div id="lista-ptas-vinculados-contrib-form" class="mt-1 mb-2 p-2 border dark:border-slate-600 rounded-md bg-gray-50 dark:bg-slate-700/50 min-h-[30px] max-h-28 overflow-y-auto"></div>
                            <button type="button" id="btn-gerenciar-ptas-vinculados-contrib" class="btn-secondary btn-sm text-xs">Gerenciar PTAs</button>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Autuações Vinculadas:</label>
                            <div id="lista-autuacoes-vinculadas-contrib-form" class="mt-1 mb-2 p-2 border dark:border-slate-600 rounded-md bg-gray-50 dark:bg-slate-700/50 min-h-[30px] max-h-28 overflow-y-auto"></div>
                            <button type="button" id="btn-gerenciar-autuacoes-vinculados-contrib" class="btn-secondary btn-sm text-xs">Gerenciar Autuações</button>
                        </div>
                    </div>
                    <div class="mb-6">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Anexos:</label>
                        <div id="anexos-existentes-contrib-list" class="mb-2"></div>
                        <input type="file" id="contrib-anexos-input" name="anexos" class="form-input-file mt-1 block w-full" multiple>
                        <div id="anexos-preview-contrib-list" class="mt-2"></div>
                    </div>
                    <div class="mb-4">
                        <label for="contrib-observacoes" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Observações:</label>
                        <textarea id="contrib-observacoes" name="observacoes" rows="3" class="form-input-text mt-1 block w-full">${contribuinteData?.observacoes || ''}</textarea>
                    </div>

                    <div class="form-actions">
                        <button type="button" id="btn-cancelar-contribuinte" class="btn-secondary">Cancelar</button>
                        ${!isEditing ? '<button type="button" id="btn-salvar-e-novo-contribuinte" class="btn-secondary">Salvar e Novo</button>' : ''}
                        <button type="button" id="btn-salvar-contribuinte" class="btn-primary">${isEditing ? 'Atualizar Contribuinte' : 'Salvar Contribuinte'}</button>
                    </div>
                </form>
            </div>
        `;
        mainContentWrapperRef.innerHTML = formHtml;
        renderExistingAttachmentsContribList();
        await renderSelectedRelatedItemsContrib();
        addFormEventListenersContrib(feedbackAreaId, isEditing, contribuinteData);
        setupCategorySelectionContrib();
        setupTagSelectionContrib();
        setupMatrizFilialSelection(); 

        const btnAjudaCamposPersonalizados = document.getElementById('ajuda-campos-personalizados-contrib');
        if (btnAjudaCamposPersonalizados && ajudaModuleRef && ajudaModuleRef.mostrarTopicoDeAjuda) {
            btnAjudaCamposPersonalizados.addEventListener('click', (e) => {
                e.preventDefault();
                ajudaModuleRef.mostrarTopicoDeAjuda('tutoriais', 'tutorial-campos-personalizados-contrib');
            });
        }
    }

    function addCustomFieldInput() {
        const container = document.getElementById('contrib-custom-fields-container');
        if (!container) return;
        const newIndex = container.children.length;
        container.insertAdjacentHTML('beforeend', renderCustomFieldInput(newIndex));
        const newGroup = container.lastElementChild;
        if (newGroup) {
            const removeButton = newGroup.querySelector('.btn-remove-custom-field-contrib');
            if (removeButton) {
                removeButton.addEventListener('click', () => newGroup.remove());
            }
        }
    }

    function renderExistingAttachmentsContribList() {
        const listContainer = document.getElementById('anexos-existentes-contrib-list');
        if (!listContainer) return;

        listContainer.innerHTML = '';
        if (existingAttachmentsContrib.length > 0) {
            const ul = document.createElement('ul');
            ul.className = 'list-none p-0 mb-2';
            existingAttachmentsContrib.forEach((anexo, index) => {
                const li = document.createElement('li');
                li.className = 'anexo-preview-item flex justify-between items-center text-sm p-2 bg-gray-100 dark:bg-slate-600 rounded mb-1';
                li.innerHTML = `
                    <span>${anexo.fileName.replace(/"/g, '"')} (${(anexo.fileSize / 1024).toFixed(1)} KB)</span>
                    <button type="button" data-index="${index}" class="btn-remove-anexo-preview-contrib text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300" title="Remover anexo existente">
                        ×
                    </button>
                `;
                ul.appendChild(li);
            });
            listContainer.appendChild(ul);

            listContainer.querySelectorAll('.btn-remove-anexo-preview-contrib').forEach(button => {
                button.addEventListener('click', (event) => {
                    const indexToRemove = parseInt(event.currentTarget.dataset.index);
                    existingAttachmentsContrib.splice(indexToRemove, 1);
                    renderExistingAttachmentsContribList();
                });
            });
        }
    }

    async function renderSelectedRelatedItemsContrib() {
        await renderSelectedItemsListContrib(currentRelatedDocIds, 'lista-docs-relacionados-contrib', DOCUMENTS_STORE_NAME, 'documento');
        await renderSelectedItemsListContrib(currentRelatedRecursoIds, 'lista-recursos-relacionados-contrib', RECURSOS_STORE_NAME, 'recurso');
        await renderSelectedItemsListContrib(currentRelatedNotaRapidaIds, 'lista-notas-vinculadas-contrib', NOTAS_RAPIDAS_STORE_NAME, 'notaRapida');
        await renderSelectedItemsListContrib(currentRelatedTarefaIds, 'lista-tarefas-vinculadas-contrib', TAREFAS_STORE_NAME, 'tarefa');
        await renderSelectedItemsListContrib(currentRelatedProtocoloIds, 'lista-protocolos-vinculados-contrib-form', PROTOCOLOS_STORE_NAME, 'protocolo');
        await renderSelectedItemsListContrib(currentRelatedPTAIds, 'lista-ptas-vinculados-contrib-form', PTAS_STORE_NAME, 'pta');
        await renderSelectedItemsListContrib(currentRelatedAutuacaoIds, 'lista-autuacoes-vinculadas-contrib-form', AUTUACOES_STORE_NAME, 'autuacao');
    }

    async function renderSelectedItemsListContrib(ids, containerId, storeName, tipoEntidade) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';
        if (!ids || ids.length === 0) {
            container.innerHTML = `<p class="text-xs text-gray-500 dark:text-gray-300">Nenhum ${tipoEntidade} vinculado.</p>`;
            return;
        }

        const ul = document.createElement('ul');
        ul.className = 'list-none p-0 space-y-1';
        for (const id of ids) {
            try {
                const item = await dbRef.getItemById(storeName, id);
                const li = document.createElement('li');
                li.className = 'flex justify-between items-center text-xs p-1.5 bg-gray-200 dark:bg-slate-600 rounded';

                let displayName = `ID ${id.toString().substring(0,8)} (não encontrado)`;
                if (item) {
                    if (['protocolo', 'pta', 'autuacao'].includes(tipoEntidade)) {
                        displayName = `${tipoEntidade.toUpperCase()} ${item.numeroProtocolo || item.numeroPTA || item.numeroAutuacao || `ID ${id.toString().substring(0,8)}`}`;
                    } else {
                        displayName = item.title || item.nome || item.titulo || `ID ${id.toString().substring(0,8)}`;
                    }
                }

                li.innerHTML = `
                    <span class="truncate text-gray-700 dark:text-gray-200" title="${displayName.replace(/"/g, '"')}">${displayName}</span>
                    <button type="button" data-id="${id}" data-type="${tipoEntidade}" class="btn-remove-related-item-contrib text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm leading-none p-0.5" title="Remover vínculo">×</button>
                `;
                li.querySelector('.btn-remove-related-item-contrib').addEventListener('click', (e) => {
                    const idToRemove = e.currentTarget.dataset.id;
                    const typeToRemove = e.currentTarget.dataset.type;
                    if (typeToRemove === 'documento') currentRelatedDocIds = currentRelatedDocIds.filter(i => i.toString() !== idToRemove.toString());
                    else if (typeToRemove === 'recurso') currentRelatedRecursoIds = currentRelatedRecursoIds.filter(i => i.toString() !== idToRemove.toString());
                    else if (typeToRemove === 'notaRapida') currentRelatedNotaRapidaIds = currentRelatedNotaRapidaIds.filter(i => i.toString() !== idToRemove.toString());
                    else if (typeToRemove === 'tarefa') currentRelatedTarefaIds = currentRelatedTarefaIds.filter(i => i.toString() !== idToRemove.toString());
                    else if (typeToRemove === 'protocolo') currentRelatedProtocoloIds = currentRelatedProtocoloIds.filter(i => i.toString() !== idToRemove.toString());
                    else if (typeToRemove === 'pta') currentRelatedPTAIds = currentRelatedPTAIds.filter(i => i.toString() !== idToRemove.toString());
                    else if (typeToRemove === 'autuacao') currentRelatedAutuacaoIds = currentRelatedAutuacaoIds.filter(i => i.toString() !== idToRemove.toString());
                    renderSelectedRelatedItemsContrib();
                });
                ul.appendChild(li);
            } catch (error) {
                console.warn(`Erro ao renderizar item relacionado ${tipoEntidade} ID ${id} para contribuinte:`, error);
            }
        }
        container.appendChild(ul);
    }

    async function abrirModalSelecaoContrib(tipoEntidade) {
        if (!uiModuleRef || !uiModuleRef.showModal) {
            globalShowFeedbackRef("Erro: Funcionalidade de modal não está disponível.", "error", document.getElementById(`feedback-form-contribuinte-${currentContribId || 'novo'}`));
            return;
        }

        let storeName, tituloModal, placeholderBusca, currentSelectionArrayRef, renderListCallback;
        let displayField = 'title';

        switch (tipoEntidade) {
            case 'documento':
                storeName = DOCUMENTS_STORE_NAME;
                tituloModal = 'Selecionar Documentos para Relacionar ao Contribuinte';
                placeholderBusca = 'Buscar por título, tipo, referência...';
                tempSelectedIdsModal = [...currentRelatedDocIds];
                renderListCallback = () => renderSelectedItemsListContrib(currentRelatedDocIds, 'lista-docs-relacionados-contrib', DOCUMENTS_STORE_NAME, 'documento');
                break;
            case 'recurso':
                storeName = RECURSOS_STORE_NAME;
                tituloModal = 'Selecionar Recursos para Relacionar ao Contribuinte';
                placeholderBusca = 'Buscar por título, número, tipo...';
                displayField = 'titulo';
                tempSelectedIdsModal = [...currentRelatedRecursoIds];
                renderListCallback = () => renderSelectedItemsListContrib(currentRelatedRecursoIds, 'lista-recursos-relacionados-contrib', RECURSOS_STORE_NAME, 'recurso');
                break;
            case 'notaRapida':
                storeName = NOTAS_RAPIDAS_STORE_NAME;
                tituloModal = 'Selecionar Notas Rápidas para Vincular ao Contribuinte';
                placeholderBusca = 'Buscar por título, conteúdo...';
                displayField = 'titulo';
                tempSelectedIdsModal = [...currentRelatedNotaRapidaIds];
                renderListCallback = () => renderSelectedItemsListContrib(currentRelatedNotaRapidaIds, 'lista-notas-vinculadas-contrib', NOTAS_RAPIDAS_STORE_NAME, 'notaRapida');
                break;
            case 'tarefa':
                storeName = TAREFAS_STORE_NAME;
                tituloModal = 'Selecionar Tarefas para Vincular ao Contribuinte';
                placeholderBusca = 'Buscar por título, ID, status...';
                displayField = 'titulo';
                tempSelectedIdsModal = [...currentRelatedTarefaIds];
                renderListCallback = () => renderSelectedItemsListContrib(currentRelatedTarefaIds, 'lista-tarefas-vinculadas-contrib', TAREFAS_STORE_NAME, 'tarefa');
                break;
            case 'protocolo':
                storeName = PROTOCOLOS_STORE_NAME;
                tituloModal = 'Selecionar Protocolos para Vincular ao Contribuinte';
                placeholderBusca = 'Buscar por número, assunto...';
                displayField = 'numeroProtocolo';
                tempSelectedIdsModal = [...currentRelatedProtocoloIds];
                renderListCallback = () => renderSelectedItemsListContrib(currentRelatedProtocoloIds, 'lista-protocolos-vinculados-contrib-form', PROTOCOLOS_STORE_NAME, 'protocolo');
                break;
            case 'pta':
                storeName = PTAS_STORE_NAME;
                tituloModal = 'Selecionar PTAs para Vincular ao Contribuinte';
                placeholderBusca = 'Buscar por número, assunto...';
                displayField = 'numeroPTA';
                tempSelectedIdsModal = [...currentRelatedPTAIds];
                renderListCallback = () => renderSelectedItemsListContrib(currentRelatedPTAIds, 'lista-ptas-vinculados-contrib-form', PTAS_STORE_NAME, 'pta');
                break;
            case 'autuacao':
                storeName = AUTUACOES_STORE_NAME;
                tituloModal = 'Selecionar Autuações para Vincular ao Contribuinte';
                placeholderBusca = 'Buscar por número, assunto...';
                displayField = 'numeroAutuacao';
                tempSelectedIdsModal = [...currentRelatedAutuacaoIds];
                renderListCallback = () => renderSelectedItemsListContrib(currentRelatedAutuacaoIds, 'lista-autuacoes-vinculadas-contrib-form', AUTUACOES_STORE_NAME, 'autuacao');
                break;
            default: return;
        }

        const modalId = `modal-selecionar-${tipoEntidade}-contrib`;
        const modalContentHtml = `
            <div class="bg-gray-100 dark:bg-slate-700 p-4 rounded-md">
                <input type="search" id="filtro-modal-${tipoEntidade}-contrib" class="form-input-text w-full mb-3 text-sm" placeholder="${placeholderBusca}">
                <div id="lista-${tipoEntidade}s-modal-contrib"
                     class="overflow-y-auto flex-grow border dark:border-slate-500 rounded-md p-2 min-h-[200px] max-h-[40vh]
                            bg-gray-50 dark:bg-slate-600">
                    <p class="text-sm text-gray-500 dark:text-gray-300">Carregando...</p>
                </div>
            </div>
        `;

        const carregarItensNoModal = async (termoBusca = '') => {
            const listaModalEl = document.getElementById(`lista-${tipoEntidade}s-modal-contrib`);
            if (!listaModalEl) return;
            listaModalEl.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-300">Carregando...</p>';
            try {
                let todosItens = await dbRef.getAllItems(storeName);
                
                // CORREÇÃO: Utiliza a função centralizada para filtrar itens ativos.
                let itensAtivos = window.SEFWorkStation.EntityConfig.filterActiveItems(todosItens, storeName);

                if (termoBusca) {
                    const termo = termoBusca.toLowerCase();
                    itensAtivos = itensAtivos.filter(item => {
                        if (tipoEntidade === 'documento') return (item.title && item.title.toLowerCase().includes(termo)) || (item.reference && item.reference.toLowerCase().includes(termo));
                        if (tipoEntidade === 'recurso') return (item.titulo && item.titulo.toLowerCase().includes(termo)) || (item.numeroIdentificacao && item.numeroIdentificacao.toLowerCase().includes(termo));
                        if (tipoEntidade === 'notaRapida' || tipoEntidade === 'tarefa') return (item.titulo && item.titulo.toLowerCase().includes(termo)) || (item.conteudo && item.conteudo.toLowerCase().includes(termo));
                        if (tipoEntidade === 'protocolo') return (item.numeroProtocolo && item.numeroProtocolo.toLowerCase().includes(termo)) || (item.assunto && item.assunto.toLowerCase().includes(termo));
                        if (tipoEntidade === 'pta') return (item.numeroPTA && item.numeroPTA.toLowerCase().includes(termo)) || (item.assuntoPTA && item.assuntoPTA.toLowerCase().includes(termo));
                        if (tipoEntidade === 'autuacao') return (item.numeroAutuacao && item.numeroAutuacao.toLowerCase().includes(termo)) || (item.assuntoAutuacao && item.assuntoAutuacao.toLowerCase().includes(termo));
                        return false;
                    });
                }
                itensAtivos.sort((a, b) => ((a[displayField] || a.nome || a.titulo || a.numeroProtocolo || a.numeroPTA || a.numeroAutuacao) || "").localeCompare((b[displayField] || b.nome || b.titulo || b.numeroProtocolo || b.numeroPTA || b.numeroAutuacao) || ""));


                if (itensAtivos.length === 0) {
                    listaModalEl.innerHTML = `<p class="text-sm text-gray-500 dark:text-gray-300">${termoBusca ? 'Nenhum item encontrado.' : `Nenhum ${tipoEntidade} disponível.`}</p>`;
                    return;
                }

                let itemsHtml = '<ul class="space-y-2">';
                itensAtivos.forEach(item => {
                    const isChecked = tempSelectedIdsModal.includes(item.id);
                    let displayName = `ID ${item.id.toString().substring(0,8)}`;
                     if (['protocolo', 'pta', 'autuacao'].includes(tipoEntidade)) {
                        displayName = `${tipoEntidade.toUpperCase()} ${item.numeroProtocolo || item.numeroPTA || item.numeroAutuacao || `ID ${item.id.toString().substring(0,8)}`}`;
                    } else {
                        displayName = item.title || item.nome || item.titulo || `ID ${item.id.toString().substring(0,8)}`;
                    }

                    const subInfo = tipoEntidade === 'documento' ? `(${item.docType || 'N/D'} - Ref: ${item.reference || 'N/A'})`
                                  : tipoEntidade === 'recurso' ? `(#${item.numeroIdentificacao || 'N/A'})`
                                  : tipoEntidade === 'notaRapida' ? `(Modif.: ${new Date(item.dataModificacao).toLocaleDateString()})`
                                  : tipoEntidade === 'tarefa' ? `(Status: ${item.status || 'N/D'}, Prazo: ${item.dataVencimento ? new Date(item.dataVencimento+'T00:00:00').toLocaleDateString() : 'N/A'})`
                                  : (tipoEntidade === 'protocolo' || tipoEntidade === 'pta' || tipoEntidade === 'autuacao') ? `(Assunto: ${(item.assunto || item.assuntoPTA || item.assuntoAutuacao || 'N/A').substring(0,30)}...)`
                                  : '';

                    itemsHtml += `
                        <li class="p-2 rounded hover:bg-gray-200 dark:hover:bg-slate-500">
                            <label class="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" value="${item.id}" class="form-checkbox rounded text-blue-600 modal-${tipoEntidade}-contrib-checkbox" ${isChecked ? 'checked' : ''}>
                                <span class="text-sm text-gray-700 dark:text-gray-200">
                                    ${displayName} <span class="text-xs text-gray-500 dark:text-gray-400 ml-1">${subInfo}</span>
                                </span>
                            </label>
                        </li>`;
                });
                itemsHtml += '</ul>';
                listaModalEl.innerHTML = itemsHtml;

                listaModalEl.querySelectorAll(`.modal-${tipoEntidade}-contrib-checkbox`).forEach(cb => {
                    cb.addEventListener('change', (e) => {
                        const itemId = e.target.value;
                        if (e.target.checked) {
                            if (!tempSelectedIdsModal.includes(itemId)) tempSelectedIdsModal.push(itemId);
                        } else {
                            tempSelectedIdsModal = tempSelectedIdsModal.filter(id => id !== itemId);
                        }
                    });
                });
            } catch (error) { console.error(`Erro ao carregar ${tipoEntidade}s no modal para contribuinte:`, error); if (listaModalEl) listaModalEl.innerHTML = `<p class="text-sm text-red-500 dark:text-red-400">Erro ao carregar ${tipoEntidade}s.</p>`; }
        };

        const modalButtons = [
            { text: 'Cancelar', class: 'btn-secondary text-sm', callback: () => uiModuleRef.closeModal() },
            {
                text: 'Confirmar Seleção',
                class: 'btn-primary text-sm',
                callback: () => {
                    if (tipoEntidade === 'documento') currentRelatedDocIds = [...tempSelectedIdsModal];
                    else if (tipoEntidade === 'recurso') currentRelatedRecursoIds = [...tempSelectedIdsModal];
                    else if (tipoEntidade === 'notaRapida') currentRelatedNotaRapidaIds = [...tempSelectedIdsModal];
                    else if (tipoEntidade === 'tarefa') currentRelatedTarefaIds = [...tempSelectedIdsModal];
                    else if (tipoEntidade === 'protocolo') currentRelatedProtocoloIds = [...tempSelectedIdsModal];
                    else if (tipoEntidade === 'pta') currentRelatedPTAIds = [...tempSelectedIdsModal];
                    else if (tipoEntidade === 'autuacao') currentRelatedAutuacaoIds = [...tempSelectedIdsModal];
                    renderListCallback();
                    uiModuleRef.closeModal();
                }
            }
        ];
        uiModuleRef.showModal(tituloModal, modalContentHtml, modalButtons, 'max-w-2xl', modalId);
        const filtroInput = document.getElementById(`filtro-modal-${tipoEntidade}-contrib`);
        if (filtroInput) filtroInput.addEventListener('input', () => carregarItensNoModal(filtroInput.value));
        await carregarItensNoModal();
    }
    
    async function handleSave(isSaveAndNew = false) {
        const btnSalvar = document.getElementById('btn-salvar-contribuinte');
        const btnSalvarNovo = document.getElementById('btn-salvar-e-novo-contribuinte');
        
        if (btnSalvar) btnSalvar.disabled = true;
        if (btnSalvarNovo) btnSalvarNovo.disabled = true;

        const feedbackAreaForm = document.getElementById(`feedback-form-contribuinte-${currentContribId || 'novo'}`);
        if (globalClearFeedbackRef) globalClearFeedbackRef(feedbackAreaForm);

        const nomeInput = document.getElementById('contrib-nome');
        const cpfCnpjInput = document.getElementById('contrib-cpf-cnpj');
        const emailInput = document.getElementById('contrib-email');
        const telefoneInput = document.getElementById('contrib-telefone');
        
        const cpfCnpj = cpfCnpjInput.value.replace(/[^\d]+/g, '');
        const email = emailInput.value.trim();
        const telefone = telefoneInput.value.trim();

        if (!nomeInput.value.trim()) {
            if (globalShowFeedbackRef) globalShowFeedbackRef("O Nome / Razão Social é obrigatório.", "error", feedbackAreaForm);
            nomeInput.focus(); 
            if (btnSalvar) btnSalvar.disabled = false;
            if (btnSalvarNovo) btnSalvarNovo.disabled = false;
            return;
        }
        if (cpfCnpj && !(validarCPF(cpfCnpj) || validarCNPJ(cpfCnpj))) {
            if (globalShowFeedbackRef) globalShowFeedbackRef("CPF/CNPJ inválido.", "error", feedbackAreaForm);
            cpfCnpjInput.focus(); 
            if (btnSalvar) btnSalvar.disabled = false;
            if (btnSalvarNovo) btnSalvarNovo.disabled = false;
            return;
        }
        if (email && !validarEmail(email)) {
            if (globalShowFeedbackRef) globalShowFeedbackRef("Email inválido.", "error", feedbackAreaForm);
            emailInput.focus(); 
            if (btnSalvar) btnSalvar.disabled = false;
            if (btnSalvarNovo) btnSalvarNovo.disabled = false;
            return;
        }
        if (telefone && !validarTelefone(telefone)) {
            if (globalShowFeedbackRef) globalShowFeedbackRef("Formato de telefone não parece válido.", "warning", feedbackAreaForm);
        }

        const isEditing = !!currentContribId;
        let finalContribId = currentContribId || (appModuleRef ? appModuleRef.generateUUID() : `TEMP-UUID-${Date.now()}`);
        let finalNumeroIdentificacao = isEditing 
            ? originalContribuinteData.numeroIdentificacao 
            : (appModuleRef ? await appModuleRef.generateContribuinteNumeroIdentificacao() : `ERR_ID_${Date.now()}`);


        const customFields = [];
        document.querySelectorAll('#contrib-custom-fields-container .custom-field-group').forEach(group => {
            const keyInput = group.querySelector('input[name="customFieldKey"]');
            const valueInput = group.querySelector('input[name="customFieldValue"]');
            if (keyInput && valueInput && keyInput.value.trim()) {
                customFields.push({ key: keyInput.value.trim(), value: valueInput.value.trim() });
            }
        });

        const contribuintePayload = {
            id: finalContribId,
            numeroIdentificacao: finalNumeroIdentificacao,
            nome: nomeInput.value.trim(),
            cpfCnpj: cpfCnpj,
            inscricaoEstadual: document.getElementById('contrib-ie').value.trim(),
            email: email,
            telefone: telefone,
            endereco: document.getElementById('contrib-endereco').value.trim(),
            isMatriz: document.getElementById('contrib-is-matriz').checked,
            matrizId: currentSelectedMatriz ? currentSelectedMatriz.id : null,
            categories: [...currentSelectedCategoriesForContrib],
            tags: [...currentSelectedTagsForContrib],
            customFields: customFields,
            anexos: [...existingAttachmentsContrib],
            documentosRelacionadosIds: [...currentRelatedDocIds],
            recursosRelacionadosIds: [...currentRelatedRecursoIds],
            notasRapidasRelacionadasIds: [...currentRelatedNotaRapidaIds],
            tarefasRelacionadasIds: [...currentRelatedTarefaIds],
            protocolosRelacionadosIds: [...currentRelatedProtocoloIds],
            ptasRelacionadosIds: [...currentRelatedPTAIds],
            autuacoesRelacionadasIds: [...currentRelatedAutuacaoIds],
            creationDate: isEditing ? originalContribuinteData.creationDate : new Date().toISOString(),
            modificationDate: new Date().toISOString(),
            isDeleted: (isEditing && originalContribuinteData) ? (originalContribuinteData.isDeleted || false) : false
        };

        try {
            if (!contribuintePayload.numeroIdentificacao || contribuintePayload.numeroIdentificacao.includes("NaN") || contribuintePayload.numeroIdentificacao.includes("ERR")) {
                throw new Error(`Número de Identificação gerado é inválido: ${contribuintePayload.numeroIdentificacao}.`);
            }
            const contribuintesExistentes = await dbRef.getAllItems(CONTRIBUINTES_STORE_NAME);
            if (contribuintesExistentes.some(c => c.numeroIdentificacao === contribuintePayload.numeroIdentificacao && c.id !== contribuintePayload.id)) {
                if (appModuleRef && typeof appModuleRef.generateContribuinteNumeroIdentificacao === 'function') {
                    console.warn(`Colisão de segurança detectada para numeroIdentificacao: ${contribuintePayload.numeroIdentificacao}. Tentando gerar um novo.`);
                    contribuintePayload.numeroIdentificacao = await appModuleRef.generateContribuinteNumeroIdentificacao();
                    if (contribuintesExistentes.some(c => c.numeroIdentificacao === contribuintePayload.numeroIdentificacao && c.id !== contribuintePayload.id)) {
                        throw new Error(`Colisão persistente ao gerar Número de Identificação: ${contribuintePayload.numeroIdentificacao}.`);
                    }
                    console.log(`Novo numeroIdentificacao gerado para evitar colisão: ${contribuintePayload.numeroIdentificacao}`);
                } else {
                     throw new Error(`Número de Identificação ${contribuintePayload.numeroIdentificacao} já existe e não foi possível gerar um novo.`);
                }
            }

            const dirHandle = SEFWorkStation.State.getDirectoryHandle();
            if (currentFilesToAttachContrib.length > 0 && dirHandle) {
                try {
                    const attachmentsRootSefDir = await dirHandle.getDirectoryHandle('attachments_sef', { create: true });
                    const contribAttachmentsDir = await attachmentsRootSefDir.getDirectoryHandle('contribuintes', { create: true });
                    const contribDir = await contribAttachmentsDir.getDirectoryHandle(finalContribId.toString(), { create: true });

                    for (const file of currentFilesToAttachContrib) {
                        const fileHandle = await contribDir.getFileHandle(file.name, { create: true });
                        const writable = await fileHandle.createWritable();
                        await writable.write(file);
                        await writable.close();
                        contribuintePayload.anexos.push({
                            ownerId: finalContribId,
                            ownerType: 'contribuinte',
                            fileName: file.name,
                            filePath: `contribuintes/${finalContribId}/${file.name}`,
                            fileType: file.type,
                            fileSize: file.size,
                            uploadDate: new Date().toISOString()
                        });
                    }
                } catch (fsError) {
                    console.error("ContribuintesForm.JS: Erro ao salvar anexos do contribuinte:", fsError);
                    if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao salvar anexos: ${fsError.message}.`, "error", feedbackAreaForm);
                }
            } else if (currentFilesToAttachContrib.length > 0 && !dirHandle) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("Pasta da aplicação não selecionada. Novos anexos não puderam ser salvos.", "warning", feedbackAreaForm);
            }


            let idsAnterioresDocs = isEditing && originalContribuinteData ? originalContribuinteData.documentosRelacionadosIds || [] : [];
            let idsAnterioresRecursos = isEditing && originalContribuinteData ? originalContribuinteData.recursosRelacionadosIds || [] : [];
            let idsAnterioresNotas = isEditing && originalContribuinteData ? originalContribuinteData.notasRapidasRelacionadasIds || [] : [];
            let idsAnterioresTarefas = isEditing && originalContribuinteData ? originalContribuinteData.tarefasRelacionadasIds || [] : [];
            let idsAnterioresProtocolos = isEditing && originalContribuinteData ? originalContribuinteData.protocolosRelacionadosIds || [] : [];
            let idsAnterioresPTAs = isEditing && originalContribuinteData ? originalContribuinteData.ptasRelacionadosIds || [] : [];
            let idsAnterioresAutuacoes = isEditing && originalContribuinteData ? originalContribuinteData.autuacoesRelacionadasIds || [] : [];
            

            if (isEditing) {
                await dbRef.updateItem(CONTRIBUINTES_STORE_NAME, contribuintePayload);
            } else {
                await dbRef.addItem(CONTRIBUINTES_STORE_NAME, contribuintePayload);
            }

            const entidadesParaAtualizar = [
                { store: DOCUMENTS_STORE_NAME, idsAtuais: contribuintePayload.documentosRelacionadosIds, idsAnteriores: idsAnterioresDocs, campoRelacionado: 'relatedContribuintes' },
                { store: RECURSOS_STORE_NAME, idsAtuais: contribuintePayload.recursosRelacionadosIds, idsAnteriores: idsAnterioresRecursos, campoRelacionado: 'contribuintesVinculadosIds' },
                { store: NOTAS_RAPIDAS_STORE_NAME, idsAtuais: contribuintePayload.notasRapidasRelacionadasIds, idsAnteriores: idsAnterioresNotas, campoRelacionado: 'contribuintesRelacionadosIds' },
                { store: TAREFAS_STORE_NAME, idsAtuais: contribuintePayload.tarefasRelacionadasIds, idsAnteriores: idsAnterioresTarefas, campoRelacionado: 'contribuintesVinculadosIds' },
                { store: PROTOCOLOS_STORE_NAME, idsAtuais: contribuintePayload.protocolosRelacionadosIds, idsAnteriores: idsAnterioresProtocolos, campoRelacionado: 'contribuintesVinculadosIds' },
                { store: PTAS_STORE_NAME, idsAtuais: contribuintePayload.ptasRelacionadosIds, idsAnteriores: idsAnterioresPTAs, campoRelacionado: 'contribuintesVinculadosIds' },
                { store: AUTUACOES_STORE_NAME, idsAtuais: contribuintePayload.autuacoesRelacionadasIds, idsAnteriores: idsAnterioresAutuacoes, campoRelacionado: 'contribuintesVinculadosIds' }
            ];

            for (const entidade of entidadesParaAtualizar) {
                 if (window.SEFWorkStation.SharedUtils && typeof window.SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais === 'function') {
                    await window.SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(
                        finalContribId,
                        entidade.store,
                        entidade.campoRelacionado,
                        entidade.idsAtuais,
                        entidade.idsAnteriores,
                        dbRef
                    );
                } else {
                    console.warn(`ContribuintesForm.JS: SharedUtils.atualizarRelacionamentosBidirecionais não está disponível para ${entidade.store}.`);
                }
            }
            
            if (isSaveAndNew) {
                if(appModuleRef && appModuleRef.showToast) appModuleRef.showToast(`Contribuinte "${contribuintePayload.nome}" salvo com sucesso!`, 'success');
                await renderNovoContribuinteForm(null, 'gerir-contribuintes');
            } else {
                if (appModuleRef && appModuleRef.handleMenuAction) {
                    if (isEditing) {
                        appModuleRef.handleMenuAction('visualizar-contribuinte', { contribuinteId: finalContribId, originatingView: currentOriginatingView });
                    } else {
                        appModuleRef.handleMenuAction('gerir-contribuintes');
                    }
                }
            }

        } catch (error) {
            console.error("ContribuintesForm.JS: Erro ao salvar contribuinte:", error);
            if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao salvar contribuinte: ${error.message}`, "error", feedbackAreaForm);
        } finally {
             if (btnSalvar) btnSalvar.disabled = false;
             if (btnSalvarNovo) btnSalvarNovo.disabled = false;
        }
    }

    function addFormEventListenersContrib(feedbackAreaId, isEditing, contribuinteData) {
        document.getElementById('btn-salvar-contribuinte').addEventListener('click', () => handleSave(false));
        const btnSalvarNovo = document.getElementById('btn-salvar-e-novo-contribuinte');
        if (btnSalvarNovo) {
            btnSalvarNovo.addEventListener('click', () => handleSave(true));
        }

        const cpfCnpjInput = document.getElementById('contrib-cpf-cnpj');
        const emailInput = document.getElementById('contrib-email');
        const telefoneInput = document.getElementById('contrib-telefone');
        const feedbackCpfCnpjEl = document.getElementById('feedback-cpf-cnpj');
        const feedbackEmailEl = document.getElementById('feedback-email');
        const feedbackTelefoneEl = document.getElementById('feedback-telefone');
        const anexoInput = document.getElementById('contrib-anexos-input');
        const anexoPreviewList = document.getElementById('anexos-preview-contrib-list');

        document.getElementById('btn-add-custom-field-contrib').addEventListener('click', addCustomFieldInput);

        document.getElementById('btn-gerenciar-docs-rel-contrib')?.addEventListener('click', () => abrirModalSelecaoContrib('documento'));
        document.getElementById('btn-gerenciar-recursos-rel-contrib')?.addEventListener('click', () => abrirModalSelecaoContrib('recurso'));
        document.getElementById('btn-gerenciar-notas-vinculadas-contrib')?.addEventListener('click', () => abrirModalSelecaoContrib('notaRapida'));
        document.getElementById('btn-gerenciar-tarefas-vinculadas-contrib')?.addEventListener('click', () => abrirModalSelecaoContrib('tarefa'));
        document.getElementById('btn-gerenciar-protocolos-vinculados-contrib')?.addEventListener('click', () => abrirModalSelecaoContrib('protocolo'));
        document.getElementById('btn-gerenciar-ptas-vinculados-contrib')?.addEventListener('click', () => abrirModalSelecaoContrib('pta'));
        document.getElementById('btn-gerenciar-autuacoes-vinculados-contrib')?.addEventListener('click', () => abrirModalSelecaoContrib('autuacao'));

        if (cpfCnpjInput && feedbackCpfCnpjEl) {
            cpfCnpjInput.addEventListener('blur', () => {
                const valor = cpfCnpjInput.value.replace(/[^\d]+/g, '');
                feedbackCpfCnpjEl.textContent = '';
                feedbackCpfCnpjEl.className = 'text-xs mt-1';
                if (valor.length === 0) return;

                let valido = false;
                if (valor.length === 11) {
                    valido = validarCPF(valor);
                    feedbackCpfCnpjEl.textContent = valido ? 'CPF válido.' : 'CPF inválido.';
                } else if (valor.length === 14) {
                    valido = validarCNPJ(valor);
                    feedbackCpfCnpjEl.textContent = valido ? 'CNPJ válido.' : 'CNPJ inválido.';
                } else {
                    feedbackCpfCnpjEl.textContent = 'Formato de CPF/CNPJ inválido.';
                }
                feedbackCpfCnpjEl.classList.add(...(valido ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400').split(' '));
            });
        }
        if (emailInput && feedbackEmailEl) {
            emailInput.addEventListener('blur', () => {
                const valor = emailInput.value;
                feedbackEmailEl.textContent = '';
                feedbackEmailEl.className = 'text-xs mt-1';
                if (valor.length === 0) return;
                const valido = validarEmail(valor);
                feedbackEmailEl.textContent = valido ? 'Email válido.' : 'Email inválido.';
                feedbackEmailEl.classList.add(...(valido ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400').split(' '));
            });
        }
        if (telefoneInput && feedbackTelefoneEl) {
            telefoneInput.addEventListener('blur', () => {
                const valor = telefoneInput.value;
                feedbackTelefoneEl.textContent = '';
                feedbackTelefoneEl.className = 'text-xs mt-1';
                if (valor.length === 0) return;
                const valido = validarTelefone(valor);
                feedbackTelefoneEl.textContent = valido ? 'Telefone com formato aceitável.' : 'Formato de telefone não usual.';
                feedbackTelefoneEl.classList.add(...(valido ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400').split(' '));
            });
        }

        if (anexoInput) {
            anexoInput.addEventListener('change', (event) => {
                currentFilesToAttachContrib = Array.from(event.target.files);
                anexoPreviewList.innerHTML = '';
                if (currentFilesToAttachContrib.length > 0) {
                    const ul = document.createElement('ul');
                    ul.className = 'list-disc pl-5 text-sm text-gray-600 dark:text-gray-400';
                    currentFilesToAttachContrib.forEach(file => {
                        const li = document.createElement('li');
                        li.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
                        ul.appendChild(li);
                    });
                    anexoPreviewList.appendChild(ul);
                }
            });
        }

        document.getElementById('btn-cancelar-contribuinte').addEventListener('click', () => {
            if (appModuleRef && appModuleRef.navigateBack) {
                appModuleRef.navigateBack();
            } else {
                if (appModuleRef && appModuleRef.handleMenuAction) {
                    appModuleRef.handleMenuAction('gerir-contribuintes');
                }
            }
        });
    }

    function setupMatrizFilialSelection() {
        const isMatrizCheckbox = document.getElementById('contrib-is-matriz');
        const searchInput = document.getElementById('contrib-matriz-search');
        const suggestionsContainer = document.getElementById('contrib-matriz-suggestions');
        const selectionContainer = document.getElementById('matriz-selection-container');

        const updateUIState = () => {
            if (isMatrizCheckbox.checked) {
                selectionContainer.style.opacity = '0.5';
                searchInput.disabled = true;
                searchInput.value = '';
                currentSelectedMatriz = null; 
                renderSelectedMatrizPill(); 
            } else {
                selectionContainer.style.opacity = '1';
                searchInput.disabled = false;
            }
        };

        const renderSelectedMatrizPill = () => {
            const container = document.getElementById('contrib-selected-matriz');
            container.innerHTML = '';
            if (currentSelectedMatriz) {
                const pill = document.createElement('span');
                pill.className = 'inline-flex items-center px-2 py-1 bg-indigo-100 dark:bg-indigo-700 text-indigo-800 dark:text-indigo-200 text-sm font-medium rounded-full';
                pill.innerHTML = `${currentSelectedMatriz.nome} <button type="button" class="ml-1.5 inline-flex text-indigo-500 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-100">×</button>`;
                pill.querySelector('button').addEventListener('click', () => {
                    currentSelectedMatriz = null;
                    isMatrizCheckbox.disabled = false;
                    renderSelectedMatrizPill();
                });
                container.appendChild(pill);
                isMatrizCheckbox.checked = false;
                isMatrizCheckbox.disabled = true;
            }
        };

        isMatrizCheckbox.addEventListener('change', updateUIState);

        searchInput.addEventListener('input', () => {
            const termo = searchInput.value.toLowerCase().trim();
            suggestionsContainer.innerHTML = '';
            
            if (termo.length < 2) {
                suggestionsContainer.classList.add('hidden');
                return;
            }
            
            const termoNumerico = termo.replace(/[^\d]/g, '');
            const sugestoes = todasMatrizesCache.filter(m => 
                m.nome.toLowerCase().includes(termo) || 
                (termoNumerico.length > 0 && m.cpfCnpj && m.cpfCnpj.includes(termoNumerico))
            );

            if (sugestoes.length > 0) {
                sugestoes.slice(0, 10).forEach(matriz => {
                    const item = document.createElement('div');
                    item.className = 'p-2 hover:bg-gray-100 dark:hover:bg-slate-600 cursor-pointer text-sm';
                    item.textContent = `${matriz.nome} (${matriz.cpfCnpj || 'ID: ' + matriz.id.substring(0,8)})`;
                    item.addEventListener('click', () => {
                        currentSelectedMatriz = { id: matriz.id, nome: matriz.nome };
                        renderSelectedMatrizPill();
                        searchInput.value = '';
                        suggestionsContainer.classList.add('hidden');
                    });
                    suggestionsContainer.appendChild(item);
                });
            } else {
                const noResultItem = document.createElement('div');
                noResultItem.className = 'p-2 text-sm text-gray-500 italic';
                noResultItem.textContent = 'Nenhuma matriz encontrada.';
                suggestionsContainer.appendChild(noResultItem);
            }
            suggestionsContainer.classList.remove('hidden');
        });
        searchInput.addEventListener('blur', () => setTimeout(() => suggestionsContainer.classList.add('hidden'), 150));
        
        renderSelectedMatrizPill();
        updateUIState();
    }

    function setupCategorySelectionContrib() {
        const filterInput = document.getElementById('contrib-categories-input');
        const suggestionsDropdown = document.getElementById('contrib-categories-suggestions-dropdown');
        const feedbackArea = document.getElementById(`feedback-form-contribuinte-${currentContribId || 'novo'}`);

        if (!filterInput || !suggestionsDropdown) return;
        renderSelectedCategoriesPillsContrib();

        filterInput.addEventListener('input', () => {
            const filterText = filterInput.value.toLowerCase().trim();
            suggestionsDropdown.innerHTML = '';
            if (filterText.length > 0) {
                const filteredCategorias = todasCategoriasContribSistemaCache.filter(cat =>
                    (SEFWorkStation.ContribuintesCategorias && SEFWorkStation.ContribuintesCategorias.formatCategoryNameForDisplay ? SEFWorkStation.ContribuintesCategorias.formatCategoryNameForDisplay(cat.name) : cat.name).toLowerCase().includes(filterText) ||
                    cat.name.toLowerCase().includes(filterText)
                );
                if (filteredCategorias.length > 0) {
                    filteredCategorias.forEach(cat => {
                        if (!currentSelectedCategoriesForContrib.includes(cat.name)) {
                            const item = document.createElement('div');
                            item.className = 'p-2 hover:bg-gray-100 dark:hover:bg-slate-600 cursor-pointer text-sm';
                            item.textContent = SEFWorkStation.ContribuintesCategorias.formatCategoryNameForDisplay(cat.name);
                            item.addEventListener('click', () => {
                                if (!currentSelectedCategoriesForContrib.includes(cat.name)) {
                                    currentSelectedCategoriesForContrib.push(cat.name);
                                }
                                renderSelectedCategoriesPillsContrib();
                                filterInput.value = '';
                                suggestionsDropdown.classList.add('hidden');
                                filterInput.focus();
                            });
                            suggestionsDropdown.appendChild(item);
                        }
                    });
                     if (suggestionsDropdown.childElementCount > 0) suggestionsDropdown.classList.remove('hidden');
                     else suggestionsDropdown.classList.add('hidden');
                } else {
                    suggestionsDropdown.classList.add('hidden');
                }
            } else {
                suggestionsDropdown.classList.add('hidden');
            }
        });
        
        filterInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); 
                const newCategoryNameRaw = filterInput.value.trim();
                if (!newCategoryNameRaw) return;

                if (!SEFWorkStation.ContribuintesCategorias || !SEFWorkStation.ContribuintesCategorias.isValidCategoryName || !SEFWorkStation.ContribuintesCategorias.normalizeCategoryNameForStorage) {
                     if (globalShowFeedbackRef) globalShowFeedbackRef("Erro: Módulo de categorias de contribuinte não carregado corretamente.", 'error', feedbackArea, 5000);
                    return;
                }

                if (!SEFWorkStation.ContribuintesCategorias.isValidCategoryName(newCategoryNameRaw)) {
                     if (globalShowFeedbackRef) globalShowFeedbackRef("Nome de categoria inválido. Use '/' para subníveis. Não pode começar/terminar com '/' nem ter '//'.", 'error', feedbackArea, 5000);
                    return;
                }
                const newCategoryNameNormalized = SEFWorkStation.ContribuintesCategorias.normalizeCategoryNameForStorage(newCategoryNameRaw);
                const existingCategory = todasCategoriasContribSistemaCache.find(cat => cat.name.toLowerCase() === newCategoryNameNormalized.toLowerCase());

                if (existingCategory) {
                    if (!currentSelectedCategoriesForContrib.includes(existingCategory.name)) {
                        currentSelectedCategoriesForContrib.push(existingCategory.name);
                        renderSelectedCategoriesPillsContrib();
                    }
                } else {
                    try {
                        filterInput.disabled = true;
                        
                        const novaCategoria = { id: appModuleRef.generateUUID(), name: newCategoryNameNormalized };
                        await dbRef.addItem(CONTRIBUINTE_CATEGORIES_STORE_NAME, novaCategoria);
                        
                        if (globalShowFeedbackRef) globalShowFeedbackRef(`Nova categoria "${SEFWorkStation.ContribuintesCategorias.formatCategoryNameForDisplay(newCategoryNameNormalized)}" criada e selecionada.`, 'success', feedbackArea, 3000);
                        
                        todasCategoriasContribSistemaCache = await dbRef.getAllItems(CONTRIBUINTE_CATEGORIES_STORE_NAME);
                        todasCategoriasContribSistemaCache.sort((a, b) => a.name.localeCompare(b.name));
                        
                        if (!currentSelectedCategoriesForContrib.includes(newCategoryNameNormalized)) {
                            currentSelectedCategoriesForContrib.push(newCategoryNameNormalized);
                        }
                        renderSelectedCategoriesPillsContrib();
                        
                    } catch (err) {
                        console.error("Erro ao criar nova categoria de contribuinte:", err);
                        if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao criar categoria: ${err.message}`, 'error', feedbackArea, 5000);
                    } finally {
                        filterInput.disabled = false;
                        filterInput.focus();
                    }
                }
                filterInput.value = '';
                suggestionsDropdown.classList.add('hidden');
            }
        });

        filterInput.addEventListener('blur', () => setTimeout(() => suggestionsDropdown.classList.add('hidden'), 150));
    }

    function renderSelectedCategoriesPillsContrib() {
        const container = document.getElementById('contrib-selected-categories-list');
        if (!container) return;
        container.innerHTML = '';
        if (currentSelectedCategoriesForContrib.length === 0) {
            container.innerHTML = '<p class="text-xs text-gray-500 dark:text-gray-400">Nenhuma categoria selecionada.</p>';
            return;
        }
        currentSelectedCategoriesForContrib.forEach(categoryName => {
            const pill = document.createElement('span');
            pill.className = 'inline-flex items-center px-2 py-1 mr-1 mt-1 bg-blue-100 dark:bg-blue-700 text-blue-800 dark:text-blue-200 text-xs font-medium rounded-full';
            const displayName = SEFWorkStation.ContribuintesCategorias && SEFWorkStation.ContribuintesCategorias.formatCategoryNameForDisplay ? SEFWorkStation.ContribuintesCategorias.formatCategoryNameForDisplay(categoryName) : categoryName;
            pill.innerHTML = `${displayName} <button type="button" class="ml-1.5 inline-flex text-blue-500 dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-100" data-category-name="${categoryName.replace(/"/g, '"')}"><svg class="h-3 w-3" stroke="currentColor" fill="none" viewBox="0 0 8 8"><path stroke-linecap="round" stroke-width="1.5" d="M1 1l6 6m0-6L1 7" /></svg></button>`;
            pill.querySelector('button').addEventListener('click', (e) => {
                e.stopPropagation();
                const catNameToRemove = e.currentTarget.dataset.categoryName;
                currentSelectedCategoriesForContrib = currentSelectedCategoriesForContrib.filter(cat => cat !== catNameToRemove);
                renderSelectedCategoriesPillsContrib();
            });
            container.appendChild(pill);
        });
    }

    function setupTagSelectionContrib() {
        const tagsInputEl = document.getElementById('contrib-tags-input');
        const autocompleteListEl = document.getElementById('contrib-tags-autocomplete-list');
        const feedbackArea = document.getElementById(`feedback-form-contribuinte-${currentContribId || 'novo'}`);

        if (!tagsInputEl || !autocompleteListEl) return;
        renderSelectedTagsPillsContrib();
        let currentTagInput = "";

        tagsInputEl.addEventListener('input', () => {
            const rawValue = tagsInputEl.value;
            const parts = rawValue.split(',');
            currentTagInput = parts[parts.length - 1].trim().toLowerCase();
            autocompleteListEl.innerHTML = '';
            if (currentTagInput.length > 0) {
                const suggestions = todasTagsContribSistemaCache.filter(tag => tag.name.toLowerCase().startsWith(currentTagInput) && !currentSelectedTagsForContrib.map(t => t.toLowerCase()).includes(tag.name.toLowerCase()));
                if (suggestions.length > 0) {
                    suggestions.forEach(tag => {
                        const item = document.createElement('div');
                        item.className = 'p-2 hover:bg-gray-100 dark:hover:bg-slate-600 cursor-pointer text-sm';
                        item.textContent = tag.name;
                        item.addEventListener('click', () => {
                            addTagToSelectedListContrib(tag.name);
                            autocompleteListEl.classList.add('hidden');
                            tagsInputEl.value = '';
                            tagsInputEl.focus();
                        });
                        autocompleteListEl.appendChild(item);
                    });
                    autocompleteListEl.classList.remove('hidden');
                } else { autocompleteListEl.classList.add('hidden'); }
            } else { autocompleteListEl.classList.add('hidden'); }
        });
        tagsInputEl.addEventListener('blur', () => setTimeout(() => autocompleteListEl.classList.add('hidden'), 150));
        
        tagsInputEl.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault(); 
                const tagToProcess = (e.key === 'Enter' ? tagsInputEl.value.trim() : currentTagInput).trim();
                
                if (tagToProcess) {
                    if (!SEFWorkStation.ContribuintesTags || !SEFWorkStation.ContribuintesTags.isValidTagName) {
                         if (globalShowFeedbackRef) globalShowFeedbackRef("Erro: Módulo de tags de contribuinte não carregado corretamente.", 'error', feedbackArea, 5000);
                        return;
                    }
                    if (!SEFWorkStation.ContribuintesTags.isValidTagName(tagToProcess)) {
                        if (globalShowFeedbackRef) globalShowFeedbackRef(`Nome de tag inválido: "${tagToProcess}". Use letras, números, espaços, '-' ou '_'. Máx 50 caracteres.`, 'error', feedbackArea, 5000);
                        return;
                    }
                    
                    const existingTag = todasTagsContribSistemaCache.find(t => t.name.toLowerCase() === tagToProcess.toLowerCase());
                    if (!existingTag) {
                        try {
                            tagsInputEl.disabled = true;
                            
                            const novaTag = { id: appModuleRef.generateUUID(), name: tagToProcess };
                            await dbRef.addItem(CONTRIBUINTE_TAGS_STORE_NAME, novaTag);

                            if (globalShowFeedbackRef) globalShowFeedbackRef(`Nova tag "${tagToProcess}" criada.`, 'success', feedbackArea, 3000);

                            todasTagsContribSistemaCache = await dbRef.getAllItems(CONTRIBUINTE_TAGS_STORE_NAME);
                            todasTagsContribSistemaCache.sort((a,b) => a.name.localeCompare(b.name));
                            
                        } catch (err) {
                            console.error("Erro ao criar nova tag de contribuinte:", err);
                            if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao criar tag: ${err.message}`, 'error', feedbackArea, 5000);
                            tagsInputEl.disabled = false;
                            return; 
                        } finally {
                            tagsInputEl.disabled = false;
                            tagsInputEl.focus();
                        }
                    }
                    addTagToSelectedListContrib(tagToProcess);
                    tagsInputEl.value = '';
                }
            }
        });
    }

    function renderSelectedTagsPillsContrib() {
        const container = document.getElementById('contrib-selected-tags-list');
        if (!container) return;
        container.innerHTML = '';
        if (currentSelectedTagsForContrib.length === 0) {
            container.innerHTML = '<p class="text-xs text-gray-500 dark:text-gray-400">Nenhuma tag selecionada.</p>';
            return;
        }
        currentSelectedTagsForContrib.forEach(tagName => {
            const pill = document.createElement('span');
            pill.className = 'inline-flex items-center px-2 py-1 mr-1 mt-1 bg-green-100 dark:bg-green-700 text-green-800 dark:text-green-200 text-xs font-medium rounded-full';
            pill.innerHTML = `${tagName} <button type="button" class="ml-1.5 inline-flex text-green-500 dark:text-green-300 hover:text-green-700 dark:hover:text-green-100" data-tag-name="${tagName.replace(/"/g, '"')}"><svg class="h-3 w-3" stroke="currentColor" fill="none" viewBox="0 0 8 8"><path stroke-linecap="round" stroke-width="1.5" d="M1 1l6 6m0-6L1 7" /></svg></button>`;
            pill.querySelector('button').addEventListener('click', (e) => {
                e.stopPropagation();
                const tagNameToRemove = e.currentTarget.dataset.tagName;
                currentSelectedTagsForContrib = currentSelectedTagsForContrib.filter(tag => tag !== tagNameToRemove);
                renderSelectedTagsPillsContrib();
            });
            container.appendChild(pill);
        });
    }

    function addTagToSelectedListContrib(tagName) {
        if (!currentSelectedTagsForContrib.map(t => t.toLowerCase()).includes(tagName.toLowerCase())) {
            currentSelectedTagsForContrib.push(tagName);
            renderSelectedTagsPillsContrib();
        }
    }

    return {
        init,
        renderNovoContribuinteForm
    };
})();