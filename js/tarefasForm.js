// js/tarefasForm.js
// v2.4.0 - CORREÇÃO: Implementa as funções ausentes 'renderSelectedRelatedItemsTarefa' e 'renderSelectedItemsListTarefa', resolvendo o ReferenceError que impedia a criação e edição de tarefas.
// v2.3.0 - CORREÇÃO: Utiliza EntityConfig.filterActiveItems no modal de seleção de entidades.
// (Histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.TarefasForm = (function() {
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let navigateAfterSaveOrCancelCallback;
    let refreshApplicationStateRef;
    let dbRef;
    let appModuleRef;
    let uiModuleRef;

    const TAREFAS_STORE_NAME = 'tarefasStore';

    let currentTarefaId = null;
    let originalTarefaData = null;
    let currentOriginatingView = 'gerir-tarefas';

    const STATUS_TAREFA_OPTIONS = ["Pendente", "Em Andamento", "Concluída", "Cancelada", "Aguardando Terceiros"];
    const PRIORIDADE_TAREFA_OPTIONS = ["Baixa", "Média", "Alta", "Urgente"];

    let currentRelatedDocIds = [];
    let currentRelatedContribIds = [];
    let currentRelatedRecursoIds = [];
    let currentRelatedProcessoIds = { protocolos: [], ptas: [], autuacoes: [] };
    let currentRelatedServidorIds = [];
    let currentRelatedNotaRapidaIds = [];
    let tempSelectedIdsModal = []; 

    let currentFilesToAttachTarefa = [];
    let existingAttachmentsTarefa = [];

    const EDITOR_CONTEUDO_TAREFA_ID_PAGINA = 'tarefa-descricao-editor-pagina';
    const EDITOR_CONTEUDO_TAREFA_ID_MODAL = 'tarefa-descricao-editor-modal';

    const QUILL_TOOLBAR_OPTIONS_COMPLETAS = [
        [{ 'font': [] }, { 'size': ['small', false, 'large', 'huge'] }],
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'script': 'sub'}, { 'script': 'super' }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'list': 'check' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        [{ 'direction': 'rtl' }, { 'align': [] }],
        ['link', 'image', 'video', 'blockquote', 'code-block'],
        ['clean']
    ];


    function init(
        mainWrapper,
        showFeedbackFunc,
        clearFeedbackFunc,
        navigateCb,
        refreshFunc,
        dbModuleRef,
        applicationModuleRef,
        uiRefModule
    ) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedbackFunc;
        globalClearFeedbackRef = clearFeedbackFunc;
        navigateAfterSaveOrCancelCallback = navigateCb;
        refreshApplicationStateRef = refreshFunc;
        dbRef = dbModuleRef;
        appModuleRef = applicationModuleRef;
        uiModuleRef = uiRefModule;

        if (!dbRef) console.error("TarefasForm.JS: init - Referência ao DB não fornecida!");
        if (!appModuleRef) console.error("TarefasForm.JS: init - appModuleRef não fornecido.");
        if (!uiModuleRef) console.warn("TarefasForm.JS: init - uiModuleRef não fornecido.");
        console.log("TarefasForm.JS: Módulo inicializado (v2.4.0).");
    }

    function getEditorId(isModal) {
        return isModal ? EDITOR_CONTEUDO_TAREFA_ID_MODAL : EDITOR_CONTEUDO_TAREFA_ID_PAGINA;
    }

    const relatedEntityConfigTarefas = () => ({
        documentos: { label: 'Documentos', storeName: dbRef.STORES.DOCUMENTS, singularName: 'Documento', pluralName: 'documentos', currentIds: () => currentRelatedDocIds, displayField: 'title', idPrefix: 'DOC-', targetLinkField: 'tarefasVinculadasIds' },
        contribuintes: { label: 'Contribuintes', storeName: dbRef.STORES.CONTRIBUINTES, singularName: 'Contribuinte', pluralName: 'contribuintes', currentIds: () => currentRelatedContribIds, displayField: 'nome', refField: 'cpfCnpj', targetLinkField: 'tarefasRelacionadasIds' },
        recursos: { label: 'Recursos', storeName: dbRef.STORES.RECURSOS, singularName: 'Recurso', pluralName: 'recursos', currentIds: () => currentRelatedRecursoIds, displayField: 'titulo', refField: 'numeroIdentificacao', targetLinkField: 'tarefasVinculadasIds' },
        processos: {
            label: 'Processos (Protocolos, PTAs, Autuações)',
            stores: {
                protocolos: { storeName: dbRef.STORES.PROTOCOLOS, displayField: 'numeroProtocolo', refField: 'assuntoProtocolo', targetLinkField: 'tarefasVinculadasIds' },
                ptas: { storeName: dbRef.STORES.PTAS, displayField: 'numeroPTA', refField: 'assuntoPTA', targetLinkField: 'tarefasVinculadasIds' },
                autuacoes: { storeName: dbRef.STORES.AUTUACOES, displayField: 'numeroAutuacao', refField: 'assuntoAutuacao', targetLinkField: 'tarefasVinculadasIds' }
            },
            singularName: 'Processo', pluralName: 'processos', currentIds: () => currentRelatedProcessoIds
        },
        servidores: { label: 'Outros Servidores Envolvidos', storeName: dbRef.STORES.SERVIDORES, singularName: 'Servidor', pluralName: 'servidores', currentIds: () => currentRelatedServidorIds, displayField: 'nome', refField: 'matricula', targetLinkField: 'tarefasVinculadasIds' },
        notasrapidas: { label: 'Notas Rápidas Relacionadas', storeName: dbRef.STORES.NOTAS_RAPIDAS, singularName: 'Nota Rápida', pluralName: 'notasrapidas', currentIds: () => currentRelatedNotaRapidaIds, displayField: 'titulo', refField: 'numeroIdentificacao', targetLinkField: 'tarefasRelacionadasIds' },
    });

    async function populateServidoresDropdown(selectElementId, selectedId = null, formContainerElement) {
        const selectEl = formContainerElement.querySelector(`#${selectElementId}`);
        if (!selectEl) return;
        selectEl.innerHTML = '<option value="">Selecione um responsável...</option>';
        try {
            const servidores = await dbRef.getAllItems(dbRef.STORES.SERVIDORES);
            const servidoresAtivos = servidores.filter(s => s.status === 'Ativo' && !s.isDeleted);
            servidoresAtivos.sort((a, b) => a.nome.localeCompare(b.nome));
            servidoresAtivos.forEach(servidor => {
                const option = document.createElement('option');
                option.value = servidor.id;
                option.textContent = servidor.nome;
                if (selectedId === servidor.id) {
                    option.selected = true;
                }
                selectEl.appendChild(option);
            });
        } catch (error) {
            console.error("TarefasForm.JS: Erro ao popular dropdown de servidores:", error);
            if(globalShowFeedbackRef) globalShowFeedbackRef("Erro ao carregar lista de servidores.", "error");
        }
    }

    async function verificarDisponibilidadeResponsavel(servidorId, dataVencimentoStr, avisoElementId, formContainerElement) {
        const avisoElement = formContainerElement.querySelector(`#${avisoElementId}`);
        if (!avisoElement) return;
        avisoElement.textContent = '';
        avisoElement.classList.add('hidden');

        if (!servidorId || !dataVencimentoStr) {
            return;
        }

        try {
            const servidor = await dbRef.getItemById(dbRef.STORES.SERVIDORES, servidorId);
            if (!servidor || !servidor.periodosAusencia || !Array.isArray(servidor.periodosAusencia)) {
                return;
            }

            const dataVencimentoDate = new Date(dataVencimentoStr + "T00:00:00");

            for (const periodo of servidor.periodosAusencia) {
                if (!periodo.dataInicio) continue;

                const inicioAusencia = new Date(periodo.dataInicio + "T00:00:00");
                const fimAusencia = periodo.dataFim ? new Date(periodo.dataFim + "T23:59:59") : new Date(periodo.dataInicio + "T23:59:59");

                if (dataVencimentoDate >= inicioAusencia && dataVencimentoDate <= fimAusencia) {
                    const dataFimAusenciaStr = periodo.dataFim ? new Date(periodo.dataFim + "T00:00:00").toLocaleDateString() : new Date(periodo.dataInicio + "T00:00:00").toLocaleDateString();
                    avisoElement.textContent = `Atenção: ${servidor.nome} estará ${periodo.tipo.toLowerCase()} de ${new Date(periodo.dataInicio + "T00:00:00").toLocaleDateString()} a ${dataFimAusenciaStr}.`;
                    avisoElement.classList.remove('hidden');
                    break;
                }
            }
        } catch (error) {
            console.error("TarefasForm.JS: Erro ao verificar disponibilidade do servidor:", error);
        }
    }

    async function getFormHtml(tarefaData = null, originatingView = 'gerir-tarefas', preSelectedLink = null, isModal = false) {
        const idSuffix = isModal ? '-modal' : '-pagina';
        const isEditing = tarefaData && tarefaData.id;
        const editorContainerId = getEditorId(isModal);

        let vinculosHtml = '';
        const entityConfig = relatedEntityConfigTarefas();
        for (const key in entityConfig) {
            const entity = entityConfig[key];
            vinculosHtml += `
                <div class="md:col-span-1">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">${entity.label}:</label>
                    <div id="lista-${entity.pluralName}-vinculados-tarefa${idSuffix}" class="form-vinculos-lista mt-1"></div>
                    <button type="button" id="btn-gerenciar-${entity.pluralName}-vinculados-tarefa${idSuffix}"
                            class="btn-secondary btn-xs mt-1 btn-vincular-entidade-tarefa" data-entity-type="${key}">Gerenciar Vínculos</button>
                </div>
            `;
        }

        const formHtml = `
            <form id="form-tarefa${idSuffix}" class="space-y-4">
                <input type="hidden" id="tarefa-id-hidden${idSuffix}" value="${isEditing ? tarefaData.id : ''}">
                <input type="hidden" id="tarefa-creation-date${idSuffix}" value="${(isEditing && tarefaData?.dataCriacao) ? tarefaData.dataCriacao : new Date().toISOString()}">
                
                <div class="form-grid">
                    <div>
                        <label for="tarefa-titulo${idSuffix}" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Título da Tarefa: <span class="text-red-500">*</span></label>
                        <input type="text" id="tarefa-titulo${idSuffix}" name="titulo" class="form-input-text mt-1 block w-full" required value="${tarefaData?.titulo?.replace(/"/g, '"') || ''}">
                    </div>
                    </div>
                 <div class="mb-4 mt-4">
                    <label for="${editorContainerId}" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição Detalhada:</label>
                    <div id="${editorContainerId}" style="min-height: ${isModal ? '200px' : '300px'};" class="mt-1 bg-white dark:bg-slate-800/60 text-gray-800 dark:text-gray-100 quill-editor-styles">
                    </div>
                </div>
                <div class="form-grid">
                    <div>
                        <label for="tarefa-status${idSuffix}" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Status:</label>
                        <select id="tarefa-status${idSuffix}" name="status" class="form-input-text mt-1 block w-full">
                            ${STATUS_TAREFA_OPTIONS.map(s => `<option value="${s}" ${tarefaData?.status === s || (!isEditing && s === 'Pendente') ? 'selected' : ''}>${s}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label for="tarefa-prioridade${idSuffix}" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Prioridade:</label>
                        <select id="tarefa-prioridade${idSuffix}" name="prioridade" class="form-input-text mt-1 block w-full">
                            ${PRIORIDADE_TAREFA_OPTIONS.map(p => `<option value="${p}" ${tarefaData?.prioridade === p || (!isEditing && p === 'Média') ? 'selected' : ''}>${p}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-grid mt-4">
                    <div>
                        <label for="tarefa-responsavel${idSuffix}" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Responsável (Servidor):</label>
                        <select id="tarefa-responsavel${idSuffix}" name="servidorResponsavelId" class="form-input-text mt-1 block w-full"></select>
                        <div id="aviso-disponibilidade-responsavel${idSuffix}" class="text-xs text-yellow-600 dark:text-yellow-400 mt-1 hidden"></div>
                    </div>
                     <div>
                        <label for="tarefa-data-vencimento${idSuffix}" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Data de Vencimento:</label>
                        <input type="date" id="tarefa-data-vencimento${idSuffix}" name="dataVencimento" class="form-input-text mt-1 block w-full" value="${tarefaData?.dataVencimento || ''}">
                    </div>
                </div>

                <div id="subtarefas-container${idSuffix}" class="mt-4">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Subtarefas:</label>
                    <div id="subtarefas-lista${idSuffix}" class="space-y-2 mt-1">
                        </div>
                    <div class="flex items-center gap-2 mt-2">
                        <input type="text" id="nova-subtarefa-descricao${idSuffix}" class="form-input-text flex-grow text-sm" placeholder="Descrição da nova subtarefa...">
                        <button type="button" id="btn-add-subtarefa${idSuffix}" class="btn-secondary btn-sm text-xs">Adicionar Subtarefa</button>
                    </div>
                </div>

                <div class="mb-4 mt-4">
                    <label for="tarefa-tags${idSuffix}" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Tags (separadas por vírgula):</label>
                    <input type="text" id="tarefa-tags${idSuffix}" name="tags" class="form-input-text mt-1 block w-full" value="${(tarefaData?.tags || []).join(', ')}" placeholder="Ex: urgente, fiscal, projetoX">
                </div>

                <h3 class="text-md font-semibold my-3 pt-3 border-t dark:border-slate-600">Vincular a Outras Entidades:</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border dark:border-slate-600 rounded-md p-3">
                    ${vinculosHtml}
                </div>
                
                <div class="mt-4">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Anexos:</label>
                    <div id="lista-anexos-existentes-tarefa${idSuffix}" class="mt-2"></div>
                    <input type="file" id="tarefa-anexos${idSuffix}" name="anexos" multiple class="form-input-file mt-1 block w-full">
                    <div id="lista-novos-anexos-tarefa${idSuffix}" class="mt-2"></div>
                </div>
                ${isModal ? `<div class="feedback-form-modal-area-specific mb-3 text-sm" id="feedback-form-tarefa-modal-${currentTarefaId || 'nova-modal'}"></div>` : ''}
            </form>
        `;
        return formHtml;
    }

    async function renderNovaTarefaFormPaginaPrincipal(tarefaData = null, originatingView = 'gerir-tarefas', preSelectedLink = null) {
        if (globalClearFeedbackRef) globalClearFeedbackRef();
        mainContentWrapperRef.innerHTML = '';

        currentOriginatingView = originatingView;
        const isEditing = tarefaData && tarefaData.id;
        currentTarefaId = isEditing ? tarefaData.id : null;
        originalTarefaData = isEditing ? JSON.parse(JSON.stringify(tarefaData)) : null;
        
        currentRelatedDocIds = (isEditing && Array.isArray(tarefaData.documentosVinculadosIds)) ? [...tarefaData.documentosVinculadosIds] : (preSelectedLink?.type === 'documento' ? [preSelectedLink.id] : []);
        currentRelatedContribIds = (isEditing && Array.isArray(tarefaData.contribuintesVinculadosIds)) ? [...tarefaData.contribuintesVinculadosIds] : (preSelectedLink?.type === 'contribuinte' ? [preSelectedLink.id] : []);
        currentRelatedRecursoIds = (isEditing && Array.isArray(tarefaData.recursosVinculadosIds)) ? [...tarefaData.recursosVinculadosIds] : (preSelectedLink?.type === 'recurso' ? [preSelectedLink.id] : []);
        
        currentRelatedProcessoIds = (isEditing && typeof tarefaData.processosVinculadosIds === 'object' && tarefaData.processosVinculadosIds !== null) 
            ? JSON.parse(JSON.stringify(tarefaData.processosVinculadosIds)) 
            : {protocolos:[], ptas:[], autuacoes:[]};

        if (preSelectedLink && ['protocolo', 'pta', 'autuacao'].includes(preSelectedLink.type)) {
            const tipoProcessoPlural = preSelectedLink.type + 's';
            currentRelatedProcessoIds[tipoProcessoPlural] = currentRelatedProcessoIds[tipoProcessoPlural] || [];
            if (!currentRelatedProcessoIds[tipoProcessoPlural].includes(preSelectedLink.id)) {
                currentRelatedProcessoIds[tipoProcessoPlural].push(preSelectedLink.id);
            }
        }
        currentRelatedServidorIds = (isEditing && Array.isArray(tarefaData.servidoresVinculadosIds)) ? [...tarefaData.servidoresVinculadosIds] : (preSelectedLink?.type === 'servidor' ? [preSelectedLink.id] : []);
        currentRelatedNotaRapidaIds = (isEditing && Array.isArray(tarefaData.notasRapidasRelacionadasIds)) ? [...tarefaData.notasRapidasRelacionadasIds] : (preSelectedLink?.type === 'notaRapida' ? [preSelectedLink.id] : []);
        
        currentFilesToAttachTarefa = [];
        existingAttachmentsTarefa = (isEditing && Array.isArray(tarefaData.anexos)) ? [...tarefaData.anexos] : [];
        
        const formTitle = isEditing ? "Editar Tarefa" : "Nova Tarefa";
        const feedbackAreaId = `feedback-form-tarefa-pagina-${currentTarefaId || 'nova'}-${Date.now()}`;
        const idSuffix = '-pagina';
        let numeroIdentificacaoDisplay = isEditing ? (tarefaData?.numeroIdentificacao || 'N/A (Antiga)') : '(Será gerado ao salvar)';
        
        if (!isEditing && appModuleRef && typeof appModuleRef.generateTarefaNumeroIdentificacao === 'function') {
            numeroIdentificacaoDisplay = await appModuleRef.generateTarefaNumeroIdentificacao();
        } else if (!isEditing) { 
            numeroIdentificacaoDisplay = `TAR-TEMP-${Date.now().toString().slice(-5)}`;
            if (globalShowFeedbackRef && document.getElementById(feedbackAreaId)) {
                globalShowFeedbackRef("Erro ao gerar ID para nova tarefa. Um ID temporário será usado.", "warning", document.getElementById(feedbackAreaId));
            }
        }


        const formHtmlContent = await getFormHtml(tarefaData, originatingView, preSelectedLink, false);

        mainContentWrapperRef.innerHTML = `
            <div> 
                <div class="flex justify-between items-center mb-2">
                    <h2 class="text-xl font-semibold">${formTitle}</h2>
                    <p class="text-xs text-gray-500 dark:text-gray-400">ID da Tarefa: ${numeroIdentificacaoDisplay}</p>
                </div>
                <div id="${feedbackAreaId}" class="mb-4"></div>
                ${formHtmlContent}
                 <div class="form-actions mt-6 flex justify-end space-x-3">
                    <button type="button" id="btn-cancelar-tarefa${idSuffix}" class="btn-secondary">Cancelar</button>
                    <button type="submit" form="form-tarefa${idSuffix}" id="btn-salvar-tarefa${idSuffix}" class="btn-primary">${isEditing ? 'Atualizar Tarefa' : 'Salvar Tarefa'}</button>
                </div>
            </div>
        `;
        
        const formElement = mainContentWrapperRef.querySelector(`#form-tarefa${idSuffix}`);
        const editorContainer = mainContentWrapperRef.querySelector(`#${getEditorId(false)}`);

        if (formElement && editorContainer) {
            if (SEFWorkStation.EditorTexto && typeof SEFWorkStation.EditorTexto.criarEditorQuill === 'function') {
                const quill = SEFWorkStation.EditorTexto.criarEditorQuill(getEditorId(false), {
                    placeholder: 'Descreva os detalhes da tarefa aqui...',
                    toolbar: QUILL_TOOLBAR_OPTIONS_COMPLETAS 
                });
                if (quill && tarefaData?.descricaoDetalhada) {
                    setTimeout(() => SEFWorkStation.EditorTexto.setConteudoHtml(getEditorId(false), tarefaData.descricaoDetalhada), 100);
                }
            } else {
                editorContainer.innerHTML = "<p class='text-red-500'>Erro ao carregar editor de texto.</p>";
            }
            await attachFormEventListenersComuns(formElement, tarefaData, originatingView, isEditing, feedbackAreaId, false);

            const btnSalvarPrincipal = mainContentWrapperRef.querySelector(`#btn-salvar-tarefa${idSuffix}`);
            if(btnSalvarPrincipal) {
                 btnSalvarPrincipal.addEventListener('click', (e) => { 
                    e.preventDefault();
                    handleFormSubmit(formElement, tarefaData, originatingView, feedbackAreaId, false);
                });
            }
            const btnCancelarPrincipal = mainContentWrapperRef.querySelector(`#btn-cancelar-tarefa${idSuffix}`);
            if (btnCancelarPrincipal) {
                btnCancelarPrincipal.addEventListener('click', () => {
                    if (SEFWorkStation.EditorTexto.getInstancia(getEditorId(false))) {
                        SEFWorkStation.EditorTexto.destruirEditor(getEditorId(false));
                    }
                    if (appModuleRef && typeof appModuleRef.navigateBack === 'function') { 
                        appModuleRef.navigateBack();
                    } else if (navigateAfterSaveOrCancelCallback) { 
                        navigateAfterSaveOrCancelCallback(originatingView || 'gerir-tarefas');
                    }
                });
            }
        } else {
            console.error("TarefasForm.JS: Elemento do formulário de página principal (#form-tarefa-pagina) ou editor não encontrado após renderização.");
            const feedbackEl = document.getElementById(feedbackAreaId);
            if (globalShowFeedbackRef && feedbackEl) globalShowFeedbackRef("Erro interno ao montar o formulário de tarefa.", "error", feedbackEl);
        }
    }
    
    async function attachFormEventListenersToModal(modalContentElement, tarefaData, originatingView, isEditingModal, feedbackAreaIdNoFormulario) {
        const isEditing = !!(tarefaData && tarefaData.id);
        
        // CORREÇÃO: A variável `notaData` foi substituída pela variável correta `tarefaData`.
        currentRelatedDocIds = (isEditing && Array.isArray(tarefaData.documentosVinculadosIds)) ? [...tarefaData.documentosVinculadosIds] : [];
        currentRelatedContribIds = (isEditing && Array.isArray(tarefaData.contribuintesVinculadosIds)) ? [...tarefaData.contribuintesVinculadosIds] : [];
        currentRelatedRecursoIds = (isEditing && Array.isArray(tarefaData.recursosVinculadosIds)) ? [...tarefaData.recursosVinculadosIds] : [];
        currentRelatedProcessoIds = (isEditing && typeof tarefaData.processosVinculadosIds === 'object' && tarefaData.processosVinculadosIds !== null) 
            ? JSON.parse(JSON.stringify(tarefaData.processosVinculadosIds)) 
            : {protocolos:[], ptas:[], autuacoes:[]};
        currentRelatedServidorIds = (isEditing && Array.isArray(tarefaData.servidoresVinculadosIds)) ? [...tarefaData.servidoresVinculadosIds] : [];
        currentRelatedNotaRapidaIds = (isEditing && Array.isArray(tarefaData.notasRapidasRelacionadasIds)) ? [...tarefaData.notasRapidasRelacionadasIds] : [];
        existingAttachmentsTarefa = (isEditing && Array.isArray(tarefaData.anexos)) ? [...tarefaData.anexos] : [];
        currentFilesToAttachTarefa = [];

        await attachFormEventListenersComuns(modalContentElement, tarefaData, originatingView, isEditingModal, feedbackAreaIdNoFormulario, true);
    }

    async function attachFormEventListenersComuns(formContainerElement, tarefaData, originatingView, isEditing, feedbackAreaId, isModal) {
        const idSuffix = isModal ? '-modal' : '-pagina';
            
        await populateServidoresDropdown(`tarefa-responsavel${idSuffix}`, tarefaData?.servidorResponsavelId, formContainerElement);
        await renderSelectedRelatedItemsTarefa(idSuffix, formContainerElement); 
        renderAnexosExistentesENovosTarefa(idSuffix, formContainerElement);
        renderSubtarefasExistentes(idSuffix, formContainerElement, tarefaData?.subtarefas || []);
    
        const responsavelSelectEl = formContainerElement.querySelector(`#tarefa-responsavel${idSuffix}`);
        const dataVencimentoInputEl = formContainerElement.querySelector(`#tarefa-data-vencimento${idSuffix}`);
        const avisoDisponibilidadeElId = `aviso-disponibilidade-responsavel${idSuffix}`;
    
        const handleDisponibilidadeCheck = () => {
            if (responsavelSelectEl && dataVencimentoInputEl) {
                verificarDisponibilidadeResponsavel(responsavelSelectEl.value, dataVencimentoInputEl.value, avisoDisponibilidadeElId, formContainerElement);
            }
        };
        if(responsavelSelectEl) responsavelSelectEl.addEventListener('change', handleDisponibilidadeCheck);
        if(dataVencimentoInputEl) dataVencimentoInputEl.addEventListener('change', handleDisponibilidadeCheck);
        if (isEditing && tarefaData?.servidorResponsavelId && tarefaData?.dataVencimento) {
            handleDisponibilidadeCheck();
        }
    
        const btnsVincular = formContainerElement.querySelectorAll(`.btn-vincular-entidade-tarefa`);
        btnsVincular.forEach(btn => {
            if (btn._clickHandlerTarefaForm) { 
                btn.removeEventListener('click', btn._clickHandlerTarefaForm);
            }
            const clickHandler = async (e) => {
                e.stopPropagation();
                const entityType = e.currentTarget.dataset.entityType;
                const config = relatedEntityConfigTarefas()[entityType];
                if (config) {
                    await showSelectEntitiesModalTarefa(entityType, config.label, config.stores || config.storeName, config.currentIds, config.displayField, config.refField, config.idPrefix, originatingView, idSuffix, formContainerElement);
                } else {
                    console.warn(`TarefasForm: Configuração não encontrada para entityType: ${entityType}`);
                }
            };
            btn.addEventListener('click', clickHandler);
            btn._clickHandlerTarefaForm = clickHandler; 
        });
    
        const anexosInput = formContainerElement.querySelector(`#tarefa-anexos${idSuffix}`);
        if (anexosInput) {
            anexosInput.addEventListener('change', (event) => {
                currentFilesToAttachTarefa = Array.from(event.target.files);
                renderAnexosExistentesENovosTarefa(idSuffix, formContainerElement);
            });
        }
    
        const btnAddSubtarefa = formContainerElement.querySelector(`#btn-add-subtarefa${idSuffix}`);
        if (btnAddSubtarefa) {
            btnAddSubtarefa.addEventListener('click', () => {
                const inputDescricao = formContainerElement.querySelector(`#nova-subtarefa-descricao${idSuffix}`);
                const descricao = inputDescricao.value.trim();
                if (descricao) {
                    adicionarSubtarefaInterface(idSuffix, formContainerElement, { descricao: descricao, concluida: false });
                    inputDescricao.value = '';
                    inputDescricao.focus();
                }
            });
        }
    }
    
    async function handleModalFormSubmit(modalContentElement, tarefaDataOriginalParam, originatingViewContext, feedbackAreaIdNoFormulario) {
        return await handleFormSubmit(modalContentElement, tarefaDataOriginalParam, originatingViewContext, feedbackAreaIdNoFormulario, true);
    }

    async function handleFormSubmit(formElement, tarefaDataOriginalForm, originatingViewContext, feedbackAreaId, isModal) {
        const idSuffix = isModal ? '-modal' : '-pagina';
        const feedbackAreaEl = document.getElementById(feedbackAreaId); 
        const btnSalvarTarefaEl = formElement.querySelector(`#btn-salvar-tarefa${idSuffix}`) || document.getElementById(`btn-salvar-tarefa${idSuffix}`);

        if (btnSalvarTarefaEl) btnSalvarTarefaEl.disabled = true;

        if (globalClearFeedbackRef && feedbackAreaEl) globalClearFeedbackRef(feedbackAreaEl);
        
        const isEditing = !!(tarefaDataOriginalForm && tarefaDataOriginalForm.id);
        const tituloInput = formElement.querySelector(`#tarefa-titulo${idSuffix}`);
        const titulo = tituloInput ? tituloInput.value.trim() : '';

        if (!titulo) {
            if (globalShowFeedbackRef && feedbackAreaEl) globalShowFeedbackRef("O título da tarefa é obrigatório.", "error", feedbackAreaEl);
            if (tituloInput) tituloInput.focus();
            if(btnSalvarTarefaEl) btnSalvarTarefaEl.disabled = false;
            return false;
        }

        let numeroIdentificacaoFinal;
        if (isEditing) {
            if (tarefaDataOriginalForm && tarefaDataOriginalForm.numeroIdentificacao) {
                numeroIdentificacaoFinal = tarefaDataOriginalForm.numeroIdentificacao;
            } else { 
                let tentativas = 0;
                const MAX_TENTATIVAS_ID = 3;
                let idValidoEncontrado = false;
                do {
                    numeroIdentificacaoFinal = await appModuleRef.generateTarefaNumeroIdentificacao();
                    const tarefasExistentes = await dbRef.getAllItems(TAREFAS_STORE_NAME);
                    if (!tarefasExistentes.some(t => t.numeroIdentificacao === numeroIdentificacaoFinal)) {
                        idValidoEncontrado = true;
                    } else {
                        console.warn(`Colisão ao gerar ID para tarefa antiga (ID: ${tarefaDataOriginalForm.id}) sem numeroIdentificacao: ${numeroIdentificacaoFinal}. Tentativa ${tentativas + 1}`);
                        tentativas++;
                        if (tentativas >= MAX_TENTATIVAS_ID) {
                            if (globalShowFeedbackRef && feedbackAreaEl) globalShowFeedbackRef("Não foi possível gerar um Nº de Identificação único para esta tarefa. Tente novamente.", "error", feedbackAreaEl);
                            if(btnSalvarTarefaEl) btnSalvarTarefaEl.disabled = false;
                            return false; 
                        }
                        await new Promise(resolve => setTimeout(resolve, 50 * (tentativas + 1))); 
                    }
                } while (!idValidoEncontrado);
            }
        } else {
            let tentativas = 0;
            const MAX_TENTATIVAS_ID = 3;
            let idValidoEncontrado = false;
            do {
                numeroIdentificacaoFinal = await appModuleRef.generateTarefaNumeroIdentificacao();
                const tarefasExistentes = await dbRef.getAllItems(TAREFAS_STORE_NAME);
                if (!tarefasExistentes.some(t => t.numeroIdentificacao === numeroIdentificacaoFinal)) {
                    idValidoEncontrado = true;
                } else {
                    console.warn(`Colisão detectada para o ID de tarefa gerado automaticamente: ${numeroIdentificacaoFinal}. Tentativa ${tentativas + 1}`);
                    tentativas++;
                    if (tentativas >= MAX_TENTATIVAS_ID) {
                         if (globalShowFeedbackRef && feedbackAreaEl) globalShowFeedbackRef("Não foi possível gerar um Nº de Identificação único para a tarefa. Tente novamente.", "error", feedbackAreaEl);
                         if(btnSalvarTarefaEl) btnSalvarTarefaEl.disabled = false;
                        return false; 
                    }
                    await new Promise(resolve => setTimeout(resolve, 50 * (tentativas + 1))); 
                }
            } while (!idValidoEncontrado);
        }

        const editorId = getEditorId(isModal);
        const descricaoDetalhada = SEFWorkStation.EditorTexto.getConteudoHtml(editorId) || '';

        const responsavelSelect = formElement.querySelector(`#tarefa-responsavel${idSuffix}`);
        const servidorResponsavelId = responsavelSelect.value;
        const servidorResponsavelNome = servidorResponsavelId ? responsavelSelect.options[responsavelSelect.selectedIndex].text : null;

        const subtarefasColetadas = [];
        formElement.querySelectorAll(`#subtarefas-lista${idSuffix} .subtarefa-item-form`).forEach(itemEl => {
            const descInput = itemEl.querySelector('input[type="text"]');
            const concluidaInput = itemEl.querySelector('input[type="checkbox"]');
            if (descInput && descInput.value.trim()) {
                subtarefasColetadas.push({
                    descricao: descInput.value.trim(),
                    concluida: concluidaInput ? concluidaInput.checked : false
                });
            }
        });
        
        const tagsInput = formElement.querySelector(`#tarefa-tags${idSuffix}`);
        const tagsValor = tagsInput ? tagsInput.value : '';

        const tarefaPayload = {
            id: isEditing ? tarefaDataOriginalForm.id : appModuleRef.generateUUID(),
            titulo: titulo,
            numeroIdentificacao: numeroIdentificacaoFinal,
            descricaoDetalhada: descricaoDetalhada,
            status: formElement.querySelector(`#tarefa-status${idSuffix}`).value,
            prioridade: formElement.querySelector(`#tarefa-prioridade${idSuffix}`).value,
            dataCriacao: formElement.querySelector(`#tarefa-creation-date${idSuffix}`).value,
            dataModificacao: new Date().toISOString(),
            dataVencimento: formElement.querySelector(`#tarefa-data-vencimento${idSuffix}`).value || null,
            servidorResponsavelId: servidorResponsavelId || null,
            servidorResponsavelNome: servidorResponsavelId ? servidorResponsavelNome : (isEditing && tarefaDataOriginalForm?.servidorResponsavelNome ? tarefaDataOriginalForm.servidorResponsavelNome : null),
            subtarefas: subtarefasColetadas,
            tags: (tagsValor.split(',') || []).map(tag => tag.trim()).filter(tag => tag),
            anexos: [...existingAttachmentsTarefa.map(a => ({...a, ownerId: isEditing ? tarefaDataOriginalForm.id : appModuleRef.generateUUID(), ownerType: 'tarefa' })),
                     ...currentFilesToAttachTarefa.map(f => ({ ownerId: isEditing ? tarefaDataOriginalForm.id : appModuleRef.generateUUID(), ownerType: 'tarefa', fileName: f.name, fileSize: f.size, fileType: f.type, filePath: '' } ))],
            isExcluida: (isEditing && tarefaDataOriginalForm) ? (tarefaDataOriginalForm.isExcluida || false) : false,
            documentosVinculadosIds: [...currentRelatedDocIds],
            contribuintesVinculadosIds: [...currentRelatedContribIds],
            recursosVinculadosIds: [...currentRelatedRecursoIds],
            processosVinculadosIds: JSON.parse(JSON.stringify(currentRelatedProcessoIds)),
            servidoresVinculadosIds: [...currentRelatedServidorIds],
            notasRapidasRelacionadasIds: [...currentRelatedNotaRapidaIds],
        };

        const finalIdParaAnexos = tarefaPayload.id;
        tarefaPayload.anexos.forEach(anexo => anexo.ownerId = finalIdParaAnexos);

        try {
            if (currentFilesToAttachTarefa.length > 0 && window.SEFWorkStation.SharedUtils && typeof window.SEFWorkStation.SharedUtils.getOrCreateAttachmentDirHandle === 'function') {
                const dirHandle = await window.SEFWorkStation.SharedUtils.getOrCreateAttachmentDirHandle('tarefas', finalIdParaAnexos);
                if (dirHandle) {
                    let anexoPayloadIndexBase = existingAttachmentsTarefa.length;
                    for (let i = 0; i < currentFilesToAttachTarefa.length; i++) {
                        const file = currentFilesToAttachTarefa[i];
                        const anexoPayloadIndex = anexoPayloadIndexBase + i;
                        const newFileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
                        const fileHandle = await dirHandle.getFileHandle(newFileName, { create: true });
                        const writable = await fileHandle.createWritable();
                        await writable.write(file);
                        await writable.close();
                         if (tarefaPayload.anexos[anexoPayloadIndex]) {
                            tarefaPayload.anexos[anexoPayloadIndex].filePath = `tarefas/${finalIdParaAnexos}/${newFileName}`;
                        }
                    }
                } else { throw new Error("Não foi possível acessar a pasta de anexos para tarefas."); }
            }

            const idsAnteriores = { 
                documentos: isEditing && tarefaDataOriginalForm ? (tarefaDataOriginalForm.documentosVinculadosIds || []) : [],
                contribuintes: isEditing && tarefaDataOriginalForm ? (tarefaDataOriginalForm.contribuintesVinculadosIds || []) : [],
                recursos: isEditing && tarefaDataOriginalForm ? (tarefaDataOriginalForm.recursosVinculadosIds || []) : [],
                processos: isEditing && tarefaDataOriginalForm ? (tarefaDataOriginalForm.processosVinculadosIds || {protocolos:[], ptas:[], autuacoes:[]}) : {protocolos:[], ptas:[], autuacoes:[]},
                servidores: isEditing && tarefaDataOriginalForm ? (tarefaDataOriginalForm.servidoresVinculadosIds || []) : [],
                notasrapidas: isEditing && tarefaDataOriginalForm ? (tarefaDataOriginalForm.notasRapidasRelacionadasIds || []) : []
            };

            if (isEditing) {
                await dbRef.updateItem(TAREFAS_STORE_NAME, tarefaPayload);
            } else {
                await dbRef.addItem(TAREFAS_STORE_NAME, tarefaPayload);
            }
            
            if (window.SEFWorkStation.SharedUtils && typeof window.SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais === 'function') {
                const configRel = relatedEntityConfigTarefas();
                for (const key in configRel) {
                    if (key === 'processos') {
                        const storesProcessos = configRel.processos.stores;
                        for (const tipoProcesso in storesProcessos) {
                            const storeInfo = storesProcessos[tipoProcesso];
                            await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(
                                finalIdParaAnexos, storeInfo.storeName, storeInfo.targetLinkField,
                                tarefaPayload.processosVinculadosIds[tipoProcesso] || [],
                                (idsAnteriores.processos || {})[tipoProcesso] || [],
                                dbRef
                            );
                        }
                    } else {
                        const entity = configRel[key];
                        await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(
                            finalIdParaAnexos, entity.storeName, entity.targetLinkField,
                            entity.currentIds(), 
                            idsAnteriores[key],
                            dbRef
                        );
                    }
                }
            }

            if (SEFWorkStation.EditorTexto.getInstancia(editorId)) {
                SEFWorkStation.EditorTexto.destruirEditor(editorId);
            }
            if (refreshApplicationStateRef) await refreshApplicationStateRef();
            if (globalShowFeedbackRef && feedbackAreaEl) globalShowFeedbackRef(isEditing ? 'Tarefa atualizada com sucesso!' : 'Tarefa salva com sucesso!', 'success', feedbackAreaEl);

            if (!isModal) {
                if (navigateAfterSaveOrCancelCallback) {
                    if (appModuleRef && appModuleRef.handleMenuAction) {
                         appModuleRef.handleMenuAction('visualizar-tarefa', { tarefaId: finalIdParaAnexos, originatingView: originatingViewContext });
                    } else {
                        navigateAfterSaveOrCancelCallback(originatingViewContext || 'gerir-tarefas');
                    }
                }
            }
            if(btnSalvarTarefaEl) btnSalvarTarefaEl.disabled = false;
            return true; 

        } catch (error) {
            console.error("TarefasForm.JS: Erro ao salvar tarefa no DB:", error);
            if (globalShowFeedbackRef && feedbackAreaEl) globalShowFeedbackRef(`Erro ao salvar tarefa: ${error.message}`, "error", feedbackAreaEl);
            if(btnSalvarTarefaEl) btnSalvarTarefaEl.disabled = false;
            return false; 
        }
    }
    
    function renderAnexosExistentesENovosTarefa(idSuffix, formContainerElement) {
        const listContainer = formContainerElement.querySelector(`#lista-anexos-existentes-tarefa${idSuffix}`);
        const newListContainer = formContainerElement.querySelector(`#lista-novos-anexos-tarefa${idSuffix}`);
        if (!listContainer || !newListContainer) return;

        listContainer.innerHTML = '<h6>Anexos Atuais:</h6>';
        if (existingAttachmentsTarefa.length === 0) {
            listContainer.innerHTML += '<p class="text-xs text-gray-500">Nenhum anexo existente.</p>';
        } else {
            const ul = document.createElement('ul'); ul.className = 'list-disc list-inside';
            existingAttachmentsTarefa.forEach((anexo, index) => {
                const item = document.createElement('li');
                item.className = 'text-sm';
                item.innerHTML = `<span>${anexo.fileName}</span>
                                <button type="button" class="btn-danger-xs ml-2" data-anexo-index="${index}">Remover</button>`;
                item.querySelector('button').addEventListener('click', () => {
                    existingAttachmentsTarefa.splice(index, 1);
                    renderAnexosExistentesENovosTarefa(idSuffix, formContainerElement);
                });
                ul.appendChild(item);
            });
            listContainer.appendChild(ul);
        }

        newListContainer.innerHTML = '<h6>Novos Anexos:</h6>';
        if (currentFilesToAttachTarefa.length === 0) {
            newListContainer.innerHTML += '<p class="text-xs text-gray-500">Nenhum novo anexo selecionado.</p>';
        } else {
            const ul = document.createElement('ul'); ul.className = 'list-disc list-inside';
            currentFilesToAttachTarefa.forEach(file => { const li = document.createElement('li'); li.className = 'text-sm'; li.textContent = file.name; ul.appendChild(li); });
            newListContainer.appendChild(ul);
        }
    }

    function renderSubtarefasExistentes(idSuffix, formContainer, subtarefas = []) {
        const listaSubtarefasEl = formContainer.querySelector(`#subtarefas-lista${idSuffix}`);
        if (!listaSubtarefasEl) return;
        listaSubtarefasEl.innerHTML = '';
        (subtarefas || []).forEach((sub, index) => {
            adicionarSubtarefaInterface(idSuffix, formContainer, sub, index);
        });
    }

    function adicionarSubtarefaInterface(idSuffix, formContainer, subtarefa, index = null) {
        const listaSubtarefasEl = formContainer.querySelector(`#subtarefas-lista${idSuffix}`);
        if (!listaSubtarefasEl) return;

        const itemEl = document.createElement('div');
        itemEl.className = 'subtarefa-item-form flex items-center gap-2 p-1 bg-gray-100 dark:bg-slate-700 rounded';
        if (index !== null) itemEl.dataset.index = index;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = subtarefa.concluida || false;
        checkbox.className = 'form-checkbox rounded h-4 w-4';
        itemEl.appendChild(checkbox);

        const inputDescricao = document.createElement('input');
        inputDescricao.type = 'text';
        inputDescricao.value = subtarefa.descricao || '';
        inputDescricao.className = 'form-input-text flex-grow text-sm p-1';
        inputDescricao.placeholder = 'Descrição da subtarefa';
        itemEl.appendChild(inputDescricao);

        const btnRemover = document.createElement('button');
        btnRemover.type = 'button';
        btnRemover.innerHTML = '×';
        btnRemover.className = 'btn-delete btn-xs p-1';
        btnRemover.title = 'Remover Subtarefa';
        btnRemover.addEventListener('click', () => itemEl.remove());
        itemEl.appendChild(btnRemover);

        listaSubtarefasEl.appendChild(itemEl);
    }
    
    // CORREÇÃO: As duas funções abaixo foram implementadas
    async function renderSelectedRelatedItemsTarefa(idSuffix, formContainerElement) {
        const config = relatedEntityConfigTarefas();
        for (const key in config) {
            const entity = config[key];
            const containerId = `lista-${entity.pluralName}-vinculados-tarefa${idSuffix}`;
            await renderSelectedItemsListTarefa(idSuffix, formContainerElement, entity.pluralName, entity.currentIds, entity.stores || entity.storeName, entity.displayField, entity.idPrefix, entity.refField);
        }
    }

    async function renderSelectedItemsListTarefa(idSuffix, formContainerElement, entityPluralName, getCurrentIdsFunc, storeNameOrStores, displayField, idPrefix, refField) {
        const container = formContainerElement.querySelector(`#lista-${entityPluralName}-vinculados-tarefa${idSuffix}`);
        if (!container) return;
        container.innerHTML = '';
        
        let ids;
        if (entityPluralName === 'processos') {
            const processosObj = getCurrentIdsFunc();
            ids = [];
            if (processosObj && typeof processosObj === 'object') {
                 if (Array.isArray(processosObj.protocolos)) ids.push(...processosObj.protocolos);
                 if (Array.isArray(processosObj.ptas)) ids.push(...processosObj.ptas);
                 if (Array.isArray(processosObj.autuacoes)) ids.push(...processosObj.autuacoes);
            }
        } else {
            ids = getCurrentIdsFunc();
        }
        
        if (!Array.isArray(ids) || ids.length === 0) {
            container.innerHTML = `<p class="text-xs text-gray-500 dark:text-gray-400">Nenhum vinculado.</p>`;
            return;
        }
        const ul = document.createElement('ul'); ul.className = 'list-none p-0 space-y-1';

        for (const id of ids) {
            try {
                let item;
                let itemTipoDisplay = entityPluralName === 'processos' ? '' : entityPluralName.slice(0, -1);
                let currentDisplayField = displayField;
                let currentRefField = refField;

                if (typeof storeNameOrStores === 'object' && !Array.isArray(storeNameOrStores)) { // Para processos
                    for (const tipoProc in storeNameOrStores) {
                        const storeInfo = storeNameOrStores[tipoProc];
                        const tempItem = await dbRef.getItemById(storeInfo.storeName, id);
                        if (tempItem) {
                            item = tempItem;
                            currentDisplayField = storeInfo.displayField;
                            currentRefField = storeInfo.refField;
                            itemTipoDisplay = tipoProc.charAt(0).toUpperCase() + tipoProc.slice(1, -1);
                            break;
                        }
                    }
                } else {
                    item = await dbRef.getItemById(storeNameOrStores, id);
                }

                const li = document.createElement('li');
                li.className = 'flex justify-between items-center text-xs p-1.5 bg-gray-200 dark:bg-slate-600 rounded';
                let displayName = item ? (item[currentDisplayField] || item.nome || item.titulo || (idPrefix + String(id).substring(0,8))) : `ID ${String(id).substring(0,8)} (não encontrado)`;
                if(item && currentRefField && item[currentRefField]) displayName += ` (${item[currentRefField]})`;
                if (itemTipoDisplay && itemTipoDisplay.toLowerCase() !== entityPluralName.slice(0,-1).toLowerCase()) displayName = `${itemTipoDisplay}: ${displayName}`;


                li.innerHTML = `<span class="truncate text-gray-700 dark:text-gray-200" title="${String(displayName).replace(/"/g, '"')}">${displayName}</span>
                                <button type="button" data-id="${id}" data-entity-plural="${entityPluralName}" class="btn-remove-related-item-tarefa text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">×</button>`;
                li.querySelector('.btn-remove-related-item-tarefa').addEventListener('click', (e) => {
                    const idToRemove = e.currentTarget.dataset.id;
                    const entityPluralNameToRemove = e.currentTarget.dataset.entityPlural;
                    const configLocal = relatedEntityConfigTarefas();
                    
                    if (entityPluralNameToRemove === 'processos') {
                        for (const tipoProc in currentRelatedProcessoIds) {
                            currentRelatedProcessoIds[tipoProc] = (currentRelatedProcessoIds[tipoProc] || []).filter(i => i.toString() !== idToRemove.toString());
                        }
                    } else {
                        for(const key in configLocal) {
                            if (configLocal[key].pluralName === entityPluralNameToRemove) {
                                let currentArray = configLocal[key].currentIds();
                                if (Array.isArray(currentArray)) {
                                     const index = currentArray.indexOf(idToRemove);
                                     if (index > -1) currentArray.splice(index, 1);
                                }
                                break;
                            }
                        }
                    }
                    renderSelectedRelatedItemsTarefa(idSuffix, formContainerElement);
                });
                ul.appendChild(li);
            } catch (error) { console.warn(`Erro ao renderizar item vinculado ${entityPluralName} ID ${id} para tarefa:`, error); }
        }
        container.appendChild(ul);
    }

    async function showSelectEntitiesModalTarefa(entityType, title, stores, getCurrentIdsFunc, displayField, refField, idPrefix, originatingView, idSuffix, formContainerElement) {
         if (!uiModuleRef || !uiModuleRef.showModal) {
            globalShowFeedbackRef("Erro: Funcionalidade de modal não está disponível.", "error", formContainerElement);
            return;
        }
        const modalId = `modal-selecionar-${entityType}-tarefa${idSuffix}`;
        
        if (entityType === 'processos') {
            const processosObj = getCurrentIdsFunc();
            tempSelectedIdsModal = [];
            if (processosObj && typeof processosObj === 'object') {
                if (Array.isArray(processosObj.protocolos)) tempSelectedIdsModal.push(...processosObj.protocolos);
                if (Array.isArray(processosObj.ptas)) tempSelectedIdsModal.push(...processosObj.ptas);
                if (Array.isArray(processosObj.autuacoes)) tempSelectedIdsModal.push(...processosObj.autuacoes);
            }
        } else {
            const idsArray = getCurrentIdsFunc();
            tempSelectedIdsModal = Array.isArray(idsArray) ? [...idsArray] : [];
        }

        const modalContentHtml = `<div class="bg-gray-100 dark:bg-slate-700 p-3 rounded-md">
                <input type="search" id="filtro-modal-${entityType}-tarefa${idSuffix}" class="form-input-text w-full mb-3 text-sm" placeholder="Buscar por ${displayField}, ${refField || 'ID'}...">
                <div id="lista-${entityType}-modal-tarefa${idSuffix}" class="overflow-y-auto flex-grow border dark:border-slate-500 rounded-md p-2 min-h-[200px] max-h-[50vh] bg-white dark:bg-slate-600">
                    <p class="text-sm text-gray-500 dark:text-gray-300">Carregando...</p>
                </div></div>`;

        const carregarItensNoModal = async (termoBusca = '') => {
            const listaModalEl = document.getElementById(`lista-${entityType}-modal-tarefa${idSuffix}`);
            if (!listaModalEl) return;
            listaModalEl.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-300">Carregando...</p>';
            try {
                let todosItens = [];
                let storeNames;

                if (typeof stores === 'object' && !Array.isArray(stores)) {
                    storeNames = Object.values(stores).map(s => s.storeName);
                } else {
                    storeNames = [stores];
                }

                for (const storeName of storeNames) {
                    const itensDB = await dbRef.getAllItems(storeName);
                    const itensAtivos = window.SEFWorkStation.EntityConfig.filterActiveItems(itensDB, storeName);
                    todosItens.push(...itensAtivos.map(item => ({ ...item, _storeOriginal: storeName })));
                }

                todosItens = todosItens.filter(item => item.id !== currentTarefaId);

                if (termoBusca) {
                    const t = termoBusca.toLowerCase();
                    todosItens = todosItens.filter(item => {
                        const df = (typeof stores === 'object' && item._storeOriginal) ? Object.values(stores).find(s => s.storeName === item._storeOriginal).displayField : displayField;
                        const rf = (typeof stores === 'object' && item._storeOriginal) ? Object.values(stores).find(s => s.storeName === item._storeOriginal).refField : refField;
                        return (item[df] && String(item[df]).toLowerCase().includes(t)) ||
                               (item.id && String(item.id).toLowerCase().includes(t)) ||
                               (rf && item[rf] && String(item[rf]).toLowerCase().includes(t));
                    });
                }
                todosItens.sort((a, b) => {
                    const dfA = (typeof stores === 'object' && a._storeOriginal) ? Object.values(stores).find(s => s.storeName === a._storeOriginal).displayField : displayField;
                    const dfB = (typeof stores === 'object' && b._storeOriginal) ? Object.values(stores).find(s => s.storeName === b._storeOriginal).displayField : displayField;
                    return String(a[dfA] || a.nome || "").localeCompare(String(b[dfB] || b.nome || ""));
                });

                if (todosItens.length === 0) { listaModalEl.innerHTML = `<p class="text-sm text-gray-500 dark:text-gray-400">Nenhum item encontrado.</p>`; return; }
                let itemsHtml = '<ul class="space-y-1.5">';
                todosItens.forEach(item => {
                    const isChecked = tempSelectedIdsModal.includes(item.id);
                    const df = (typeof stores === 'object' && item._storeOriginal) ? Object.values(stores).find(s => s.storeName === item._storeOriginal).displayField : displayField;
                    const rf = (typeof stores === 'object' && item._storeOriginal) ? Object.values(stores).find(s => s.storeName === item._storeOriginal).refField : refField;
                    let tipoOriginal = '';
                     if(item._storeOriginal && stores.protocolos && item._storeOriginal === stores.protocolos.storeName) tipoOriginal = 'protocolos';
                     else if(item._storeOriginal && stores.ptas && item._storeOriginal === stores.ptas.storeName) tipoOriginal = 'ptas';
                     else if(item._storeOriginal && stores.autuacoes && item._storeOriginal === stores.autuacoes.storeName) tipoOriginal = 'autuacoes';

                    const displayName = item[df] || item.nome || item.titulo || (idPrefix + String(item.id).substring(0,8));
                    const subInfo = rf && item[rf] ? `(${item[rf]})` : '';
                    const tipoLabel = tipoOriginal ? `(${(tipoOriginal.charAt(0).toUpperCase() + tipoOriginal.slice(1, -1))})` : '';
                    itemsHtml += `<li class="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-500">
                        <label class="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" value="${item.id}" class="form-checkbox rounded modal-${entityType}-tarefa-checkbox h-4 w-4" ${isChecked ? 'checked' : ''} data-tipo-original="${tipoOriginal}">
                            <span class="text-sm text-gray-700 dark:text-gray-200">${tipoLabel} ${displayName} <span class="text-xs text-gray-500 dark:text-gray-400 ml-1">${subInfo}</span></span>
                        </label></li>`;
                });
                itemsHtml += '</ul>'; listaModalEl.innerHTML = itemsHtml;
                listaModalEl.querySelectorAll(`.modal-${entityType}-tarefa-checkbox`).forEach(cb => {
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
                if (entityType === 'processos') {
                    currentRelatedProcessoIds = { protocolos: [], ptas: [], autuacoes: [] }; 
                    for (const selectedId of tempSelectedIdsModal) {
                        let tipoOriginalEncontrado = null;
                        const checkboxCorrespondente = document.querySelector(`.modal-${entityType}-tarefa-checkbox[value="${selectedId}"]`);
                        if (checkboxCorrespondente) tipoOriginalEncontrado = checkboxCorrespondente.dataset.tipoOriginal;

                        if (tipoOriginalEncontrado && currentRelatedProcessoIds.hasOwnProperty(tipoOriginalEncontrado)) {
                            currentRelatedProcessoIds[tipoOriginalEncontrado].push(selectedId);
                        } else if (tipoOriginalEncontrado) {
                            console.warn(`Tipo de processo original desconhecido '${tipoOriginalEncontrado}' para o ID ${selectedId}`);
                        } else {
                             console.warn(`Não foi possível determinar o tipo original do processo ID ${selectedId} para vincular à tarefa.`);
                        }
                    }
                } else {
                    const idsParaAtualizar = getCurrentIdsFunc();
                     if (Array.isArray(idsParaAtualizar)) {
                        idsParaAtualizar.length = 0; 
                        Array.prototype.push.apply(idsParaAtualizar, tempSelectedIdsModal);
                    }
                }
                await renderSelectedRelatedItemsTarefa(idSuffix, formContainerElement);
                uiModuleRef.closeModal();
            }}
        ];
        uiModuleRef.showModal(title, modalContentHtml, modalButtons, 'max-w-2xl', modalId);
        const filtroInput = document.getElementById(`filtro-modal-${entityType}-tarefa${idSuffix}`);
        if (filtroInput) filtroInput.addEventListener('input', () => carregarItensNoModal(filtroInput.value));
        await carregarItensNoModal();
    }

    return {
        init,
        getFormHtml, 
        handleModalFormSubmit, 
        attachFormEventListenersToModal, 
        renderNovaTarefaFormPaginaPrincipal,
        getEditorId 
    };
})();