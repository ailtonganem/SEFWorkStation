// js/recursosForm.js - Lógica para Formulários de Recursos (Criação/Edição)
// v2.9.2 - CORREÇÃO: Corrige o nome da chamada da função `renderExistingAttachmentsListRecurso` que estava com um erro de digitação.
// v2.9.1 - CORREÇÃO: Adota injeção de dependência explícita para o uiModuleRef, resolvendo bugs de botões inoperantes. Remove dependência do escopo global.
// v2.9.0 - CORREÇÃO: Adota injeção de dependência explícita para o uiModuleRef, resolvendo bugs de botões inoperantes.
// v2.8.0 - CORREÇÃO: Utiliza EntityConfig para filtrar versões arquivadas no modal de seleção de vínculos.
// ... (histórico anterior)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.RecursosForm = (function() {
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let refreshApplicationStateRef;
    let dbRef;
    let recursosViewModuleRef;
    let appModuleRef; 
    let uiModuleRef;

    const RECURSOS_STORE_NAME = 'recursos';
    const CONTRIBUINTES_STORE_NAME = 'contribuintes';
    const DOCUMENTS_STORE_NAME = 'documents';
    const TAREFAS_STORE_NAME = 'tarefasStore'; 
    const NOTAS_RAPIDAS_STORE_NAME = 'notasRapidasStore'; 

    let currentFilesToAttachRecurso = [];
    let currentFileAnexoDecisao = null;

    let existingAttachmentsRecurso = [];
    let existingAnexoDecisaoPath = null;
    let currentRecursoId = null;
    let originalRecursoDataForComparison = null;

    let tempSelectedDocIdsRecurso = [];
    let tempSelectedContribIdsRecurso = [];
    let tempSelectedTarefaIdsRecurso = []; 
    let tempSelectedNotaRapidaIdsRecurso = []; 


    function init(
        mainWrapper,
        showFeedbackFunc,
        clearFeedbackFunc,
        irParaHomeFunc, 
        refreshFunc,
        dbModuleRef,
        viewModuleRef,
        applicationModuleRef,
        uiRefModule
    ) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedbackFunc;
        globalClearFeedbackRef = clearFeedbackFunc;
        refreshApplicationStateRef = refreshFunc;
        dbRef = dbModuleRef;
        recursosViewModuleRef = viewModuleRef;
        appModuleRef = applicationModuleRef; 
        uiModuleRef = uiRefModule;

        if (!dbRef) console.error("RecursosForm.JS: init - Referência ao DB não fornecida!");
        if (!mainContentWrapperRef) console.error("RecursosForm.JS: init - mainContentWrapperRef não fornecido.");
        if (!appModuleRef) console.error("RecursosForm.JS: init - appModuleRef (applicationModuleRef) NÃO FOI FORNECIDO CORRETAMENTE!");
        if (!uiModuleRef) console.error("RecursosForm.JS: init - Módulo UI não foi fornecido via injeção de dependência!");
        console.log("RecursosForm.JS: Módulo inicializado (v2.9.2).");
    }

    async function populateContribuintesSelect(selectElement, selectedId = null) {
        if (!dbRef || !selectElement) return;
        try {
            const contribuintes = await dbRef.getAllItems(CONTRIBUINTES_STORE_NAME);
            contribuintes.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
            selectElement.innerHTML = '<option value="">Selecione um contribuinte...</option>';
            contribuintes.forEach(c => {
                const option = document.createElement('option');
                option.value = c.id;
                option.textContent = `${c.nome} (${c.numeroIdentificacao || c.cpfCnpj || 'ID ' + c.id.toString().substring(0,8)})`;
                if (selectedId && c.id === selectedId) {
                    option.selected = true;
                }
                selectElement.appendChild(option);
            });
        } catch (error) {
            selectElement.innerHTML = '<option value="">Erro ao carregar contribuintes</option>';
        }
    }

    async function renderNovoRecursoForm(recursoData = null, originView = 'gerir-recursos', preSelectedLink = null) {
        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (!mainContentWrapperRef) {
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico ao tentar renderizar o formulário de recurso.", "error");
            return;
        }

        let isPreLinking = preSelectedLink && (preSelectedLink.type === 'documento' || preSelectedLink.type === 'contribuinte' || preSelectedLink.type === 'tarefa');
        const isEditing = recursoData && recursoData.id && !isPreLinking;
        currentRecursoId = isEditing ? recursoData.id : null;
        originalRecursoDataForComparison = isEditing ? JSON.parse(JSON.stringify(recursoData)) : null;

        currentFilesToAttachRecurso = [];
        currentFileAnexoDecisao = null;
        existingAttachmentsRecurso = isEditing && recursoData.anexos ? [...recursoData.anexos] : [];
        existingAnexoDecisaoPath = isEditing && recursoData.anexoDecisaoFinalPath ? recursoData.anexoDecisaoFinalPath : null;

        tempSelectedDocIdsRecurso = (isEditing && Array.isArray(recursoData.documentosVinculadosIds)) ? [...recursoData.documentosVinculadosIds] : [];
        tempSelectedContribIdsRecurso = (isEditing && Array.isArray(recursoData.contribuintesVinculadosIds)) ? [...recursoData.contribuintesVinculadosIds] : [];
        tempSelectedTarefaIdsRecurso = (isEditing && Array.isArray(recursoData.tarefasVinculadasIds)) ? [...recursoData.tarefasVinculadasIds] : []; 
        tempSelectedNotaRapidaIdsRecurso = (isEditing && Array.isArray(recursoData.notasRapidasRelacionadasIds)) ? [...recursoData.notasRapidasRelacionadasIds] : [];

        if (preSelectedLink) {
            if (preSelectedLink.type === 'documento' && !tempSelectedDocIdsRecurso.includes(preSelectedLink.id)) {
                tempSelectedDocIdsRecurso.push(preSelectedLink.id);
            } else if (preSelectedLink.type === 'contribuinte' && !recursoData?.contribuintePrincipalId) {
            } else if (preSelectedLink.type === 'tarefa' && !tempSelectedTarefaIdsRecurso.includes(preSelectedLink.id)) {
                tempSelectedTarefaIdsRecurso.push(preSelectedLink.id);
            }
            if (!isEditing && isPreLinking) {
                recursoData = null; 
            }
        }

        const formTitle = isEditing ? "Editar Recurso" : "Novo Recurso";
        const numeroIdentificacaoDisplay = isEditing && recursoData?.numeroIdentificacao ? recursoData.numeroIdentificacao : (isEditing ? 'N/A (antigo)' : 'Será gerado ao salvar');


        mainContentWrapperRef.innerHTML = '';
        if (appModuleRef && typeof appModuleRef.setCurrentViewTarget === 'function') {
            appModuleRef.setCurrentViewTarget('form-recurso', !isEditing); 
        }


        const formHtml = `
            <div class="form-section page-section">
                <h2 class="text-xl font-semibold mb-2">${formTitle}</h2>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">Número de Identificação: ${numeroIdentificacaoDisplay}</p>
                <div id="feedback-form-recurso" class="mb-4"></div>

                <form id="form-recurso">
                    <input type="hidden" id="recurso-id-hidden" value="${currentRecursoId || ''}">
                    <input type="hidden" id="recurso-creation-date" value="${(isEditing && recursoData?.creationDate) ? recursoData.creationDate : new Date().toISOString()}">
                    <input type="hidden" id="recurso-numero-identificacao-hidden" value="${(isEditing && recursoData?.numeroIdentificacao) ? recursoData.numeroIdentificacao : ''}">

                    <div class="mb-4">
                        <label for="recurso-titulo" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Título/Nome do Recurso:</label>
                        <input type="text" id="recurso-titulo" name="titulo" class="form-input-text mt-1 block w-full" required value="${(isEditing && recursoData?.titulo) ? recursoData.titulo.replace(/"/g, '"') : ''}">
                    </div>

                    <div class="form-grid">
                        <div>
                            <label for="recurso-contribuinte-principal" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Contribuinte Principal (Recorrente):</label>
                            <select id="recurso-contribuinte-principal" name="contribuintePrincipalId" class="form-input-text mt-1 block w-full" required></select>
                        </div>
                        <div>
                            <label for="recurso-data-apresentacao" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Data de Apresentação:</label>
                            <input type="date" id="recurso-data-apresentacao" name="dataApresentacao" class="form-input-text mt-1 block w-full" value="${(isEditing && recursoData?.dataApresentacao) ? recursoData.dataApresentacao.substring(0,10) : new Date().toISOString().substring(0,10)}" required>
                        </div>
                    </div>

                    <div class="form-grid">
                        <div>
                            <label for="recurso-tipo" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de Recurso:</label>
                            <input type="text" id="recurso-tipo" name="tipoRecurso" class="form-input-text mt-1 block w-full" placeholder="Ex: Administrativo, Judicial, Reconsideração" value="${(isEditing && recursoData?.tipoRecurso) ? recursoData.tipoRecurso.replace(/"/g, '"') : ''}">
                        </div>
                        <div>
                            <label for="recurso-prioridade" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Prioridade:</label>
                            <select id="recurso-prioridade" name="prioridade" class="form-input-text mt-1 block w-full">
                                <option value="Baixa" ${isEditing && recursoData?.prioridade === 'Baixa' ? 'selected' : ''}>Baixa</option>
                                <option value="Média" ${isEditing && recursoData?.prioridade === 'Média' ? 'selected' : (!isEditing ? 'selected' : '')}>Média</option>
                                <option value="Alta" ${isEditing && recursoData?.prioridade === 'Alta' ? 'selected' : ''}>Alta</option>
                                <option value="Urgente" ${isEditing && recursoData?.prioridade === 'Urgente' ? 'selected' : ''}>Urgente</option>
                            </select>
                        </div>
                    </div>

                    <h3 class="text-md font-semibold my-4 pt-2 border-t dark:border-slate-600">Status e Prazos</h3>
                    <div class="form-grid">
                        <div>
                            <label for="recurso-status-atual" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Status Atual:</label>
                            <select id="recurso-status-atual" name="statusAtual" class="form-input-text mt-1 block w-full">
                                <option value="Em Análise" ${isEditing && recursoData?.status === 'Em Análise' ? 'selected' : (!isEditing ? 'selected' : '')}>Em Análise</option>
                                <option value="Deferido" ${isEditing && recursoData?.status === 'Deferido' ? 'selected' : ''}>Deferido</option>
                                <option value="Indeferido" ${isEditing && recursoData?.status === 'Indeferido' ? 'selected' : ''}>Indeferido</option>
                                <option value="Pendente de Documentação" ${isEditing && recursoData?.status === 'Pendente de Documentação' ? 'selected' : ''}>Pendente de Documentação</option>
                                <option value="Arquivado" ${isEditing && recursoData?.status === 'Arquivado' ? 'selected' : ''}>Arquivado</option>
                                <option value="Outro" ${isEditing && recursoData?.status === 'Outro' ? 'selected' : ''}>Outro</option>
                            </select>
                        </div>
                        <div>
                            <label for="recurso-status-justificativa" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Justificativa/Obs. Status Atual:</label>
                            <input type="text" id="recurso-status-justificativa" name="statusJustificativa" class="form-input-text mt-1 block w-full" placeholder="Breve observação sobre o status" value="${(isEditing && recursoData?.statusDetalhado && recursoData.statusDetalhado.length > 0 && recursoData.statusDetalhado[recursoData.statusDetalhado.length-1].status === recursoData.status) ? (recursoData.statusDetalhado[recursoData.statusDetalhado.length-1].justificativa || '').replace(/"/g, '"') : ''}">
                        </div>
                    </div>
                     <div class="form-grid mt-4">
                        <div>
                            <label for="recurso-data-limite-resposta" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Data Limite para Resposta/Decisão:</label>
                            <input type="date" id="recurso-data-limite-resposta" name="dataLimiteResposta" class="form-input-text mt-1 block w-full" value="${(isEditing && recursoData?.dataLimiteResposta) ? recursoData.dataLimiteResposta.substring(0,10) : ''}">
                        </div>
                        <div>
                            <label for="recurso-data-juntada-docs" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Data Limite para Juntada de Docs (Contribuinte):</label>
                            <input type="date" id="recurso-data-juntada-docs" name="dataJuntadaDocumentos" class="form-input-text mt-1 block w-full" value="${(isEditing && recursoData?.dataJuntadaDocumentos) ? recursoData.dataJuntadaDocumentos.substring(0,10) : ''}">
                        </div>
                    </div>

                    <h3 class="text-md font-semibold my-4 pt-2 border-t dark:border-slate-600">Detalhes e Andamento</h3>
                    <div class="mb-4">
                        <label for="recurso-descricao" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição Detalhada do Recurso:</label>
                        <textarea id="recurso-descricao" name="descricao" rows="4" class="form-input-text mt-1 block w-full">${(isEditing && recursoData?.descricao) ? recursoData.descricao : ''}</textarea>
                    </div>
                    <div class="mb-4">
                        <label for="recurso-despacho-inicial" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Primeiro Despacho/Andamento/Decisão:</label>
                        <textarea id="recurso-despacho-inicial" name="despachoInicial" rows="3" class="form-input-text mt-1 block w-full" placeholder="Registre o primeiro andamento ou decisão aqui. Outros podem ser adicionados na visualização.">${(isEditing && recursoData?.despachosDecisoes && recursoData.despachosDecisoes.length > 0) ? recursoData.despachosDecisoes[0].texto : ''}</textarea>
                        ${isEditing ? '<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Para adicionar novos andamentos a um recurso existente, utilize a tela de visualização do recurso.</p>' : ''}
                    </div>
                     <div class="mb-4">
                        <label for="recurso-anexo-decisao" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Anexar Arquivo da Decisão Final (Opcional):</label>
                        ${existingAnexoDecisaoPath ? `<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Decisão atual: ${existingAnexoDecisaoPath.split('/').pop()} <button type="button" id="btn-remover-anexo-decisao-existente" class="text-red-500 text-xs ml-2" title="Remover anexo da decisão existente">×</button></p>` : ''}
                        <input type="file" id="recurso-anexo-decisao-input" name="anexoDecisao" class="form-input-file mt-1 block w-full">
                        <div id="anexo-decisao-preview-list" class="mt-1"></div>
                    </div>
                    <div class="mb-4">
                        <label for="recurso-observacoes" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Observações Adicionais:</label>
                        <textarea id="recurso-observacoes" name="observacoes" rows="3" class="form-input-text mt-1 block w-full">${(isEditing && recursoData?.observacoes) ? recursoData.observacoes : ''}</textarea>
                    </div>

                    <h3 class="text-md font-semibold my-4 pt-2 border-t dark:border-slate-600">Vínculos</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Documentos Vinculados:</label>
                            <div id="lista-documentos-vinculados-recurso-form" class="mt-1 mb-2 p-2 border dark:border-slate-600 rounded-md bg-gray-50 dark:bg-slate-700/50 min-h-[30px] max-h-28 overflow-y-auto"></div>
                            <button type="button" id="btn-gerenciar-docs-vinculados-recurso" class="btn-secondary btn-sm text-xs">Adicionar/Gerenciar Documentos</button>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Outros Contribuintes Vinculados:</label>
                            <div id="lista-contribs-vinculados-recurso-form" class="mt-1 mb-2 p-2 border dark:border-slate-600 rounded-md bg-gray-50 dark:bg-slate-700/50 min-h-[30px] max-h-28 overflow-y-auto"></div>
                            <button type="button" id="btn-gerenciar-contribs-vinculados-recurso" class="btn-secondary btn-sm text-xs">Adicionar/Gerenciar Contribuintes</button>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Tarefas Vinculadas:</label>
                            <div id="lista-tarefas-vinculadas-recurso-form" class="mt-1 mb-2 p-2 border dark:border-slate-600 rounded-md bg-gray-50 dark:bg-slate-700/50 min-h-[30px] max-h-28 overflow-y-auto"></div>
                            <button type="button" id="btn-gerenciar-tarefas-vinculadas-recurso" class="btn-secondary btn-sm text-xs">Adicionar/Gerenciar Tarefas</button>
                        </div>
                         <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Notas Rápidas Vinculadas:</label>
                            <div id="lista-notas-rapidas-vinculadas-recurso-form" class="mt-1 mb-2 p-2 border dark:border-slate-600 rounded-md bg-gray-50 dark:bg-slate-700/50 min-h-[30px] max-h-28 overflow-y-auto"></div>
                            <button type="button" id="btn-gerenciar-notas-rapidas-vinculadas-recurso" class="btn-secondary btn-sm text-xs">Adicionar/Gerenciar Notas</button>
                        </div>
                    </div>

                    <div class="mb-4 mt-4">
                        <label for="recurso-responsavel" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Responsável pelo Acompanhamento (ID/Nome):</label>
                        <input type="text" id="recurso-responsavel" name="responsavelId" class="form-input-text mt-1 block w-full" placeholder="Identificação do responsável" value="${(isEditing && recursoData?.responsavelId) ? recursoData.responsavelId.replace(/"/g, '"') : ''}">
                    </div>


                    <div class="mb-6">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Anexos Gerais do Recurso:</label>
                        <div id="anexos-existentes-recurso-list" class="mb-2"></div>
                        <input type="file" id="recurso-anexos-input" name="anexos" class="form-input-file mt-1 block w-full" multiple>
                        <div id="anexos-preview-recurso-list" class="mt-2"></div>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Mantenha pressionado Ctrl (ou Cmd) para selecionar múltiplos arquivos.</p>
                    </div>

                    <div class="form-actions">
                        <button type="button" id="btn-cancelar-recurso" class="btn-secondary">Cancelar</button>
                        <button type="submit" id="btn-salvar-recurso" class="btn-primary">${isEditing ? 'Atualizar Recurso' : 'Salvar Recurso'}</button>
                    </div>
                </form>
            </div>
        `;
        mainContentWrapperRef.innerHTML = formHtml;

        const contribuinteSelect = document.getElementById('recurso-contribuinte-principal');
        const idContribuinteParaPopular = preSelectedLink && preSelectedLink.type === 'contribuinte' && !isEditing
                                       ? preSelectedLink.id
                                       : (isEditing ? recursoData?.contribuintePrincipalId : null);
        await populateContribuintesSelect(contribuinteSelect, idContribuinteParaPopular);

        // CORREÇÃO: Chamada corrigida.
        renderExistingAttachmentsListRecurso();
        await renderSelectedRelatedItemsRecurso();
        addFormEventListenersRecurso(originView, isEditing);
    }
    
    // ... (restante do código foi omitido para brevidade, pois a correção está apenas na linha acima)
    function renderExistingAttachmentsListRecurso() {
        const listContainer = document.getElementById('anexos-existentes-recurso-list');
        if (!listContainer) return;

        listContainer.innerHTML = '';
        if (existingAttachmentsRecurso.length > 0) {
            const ul = document.createElement('ul');
            ul.className = 'list-none p-0 mb-2';
            existingAttachmentsRecurso.forEach((anexo, index) => {
                const li = document.createElement('li');
                li.className = 'anexo-preview-item flex justify-between items-center text-sm p-2 bg-gray-100 dark:bg-slate-600 rounded mb-1';
                li.innerHTML = `
                    <span>${anexo.fileName.replace(/"/g, '"')} (${(anexo.fileSize / 1024).toFixed(1)} KB)</span>
                    <button type="button" data-index="${index}" class="btn-remove-anexo-preview-recurso text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300" title="Remover anexo existente">
                        ×
                    </button>
                `;
                ul.appendChild(li);
            });
            listContainer.appendChild(ul);

            listContainer.querySelectorAll('.btn-remove-anexo-preview-recurso').forEach(button => {
                button.addEventListener('click', (event) => {
                    const indexToRemove = parseInt(event.currentTarget.dataset.index);
                    existingAttachmentsRecurso.splice(indexToRemove, 1);
                    renderExistingAttachmentsListRecurso();
                });
            });
        }
    }

    async function renderSelectedRelatedItemsRecurso() {
        await renderSelectedItemsListRecurso(tempSelectedDocIdsRecurso, 'lista-documentos-vinculados-recurso-form', DOCUMENTS_STORE_NAME, 'documento');
        await renderSelectedItemsListRecurso(tempSelectedContribIdsRecurso, 'lista-contribs-vinculados-recurso-form', CONTRIBUINTES_STORE_NAME, 'contribuinte');
        await renderSelectedItemsListRecurso(tempSelectedTarefaIdsRecurso, 'lista-tarefas-vinculadas-recurso-form', TAREFAS_STORE_NAME, 'tarefa'); 
        await renderSelectedItemsListRecurso(tempSelectedNotaRapidaIdsRecurso, 'lista-notas-rapidas-vinculadas-recurso-form', NOTAS_RAPIDAS_STORE_NAME, 'notaRapida');
    }

    async function renderSelectedItemsListRecurso(ids, containerId, storeName, tipoEntidade) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        if (ids.length === 0) {
            container.innerHTML = `<p class="text-xs text-gray-500 dark:text-gray-400">Nenhum ${tipoEntidade} vinculado.</p>`;
            return;
        }
        const ul = document.createElement('ul');
        ul.className = 'list-none p-0 space-y-1';
        for (const id of ids) {
            try {
                const item = await dbRef.getItemById(storeName, id);
                const li = document.createElement('li');
                li.className = 'flex justify-between items-center text-xs p-1.5 bg-gray-200 dark:bg-slate-600 rounded';
                const displayName = item ? (item.title || item.nome || `ID ${id.toString().substring(0,8)}`) : `ID ${id.toString().substring(0,8)} (não encontrado)`;
                li.innerHTML = `<span class="truncate text-gray-700 dark:text-gray-200" title="${displayName.replace(/"/g, '"')}">${displayName}</span>
                                <button type="button" data-id="${id}" class="btn-remove-related-item-recurso text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm leading-none p-0.5" data-type="${tipoEntidade}" title="Remover vínculo">×</button>`;
                ul.appendChild(li);
            } catch (e) { console.error(`Erro ao buscar ${tipoEntidade} vinculado:`, e); }
        }
        container.appendChild(ul);
        container.querySelectorAll('.btn-remove-related-item-recurso').forEach(btn => btn.addEventListener('click', handleRemoveRelatedItemRecurso));
    }

    function handleRemoveRelatedItemRecurso(event) {
        const idToRemove = event.currentTarget.dataset.id;
        const type = event.currentTarget.dataset.type;
        if (type === 'documento') {
            tempSelectedDocIdsRecurso = tempSelectedDocIdsRecurso.filter(id => id !== idToRemove);
        } else if (type === 'contribuinte') {
            tempSelectedContribIdsRecurso = tempSelectedContribIdsRecurso.filter(id => id !== idToRemove);
        } else if (type === 'tarefa') { 
            tempSelectedTarefaIdsRecurso = tempSelectedTarefaIdsRecurso.filter(id => id !== idToRemove);
        } else if (type === 'notaRapida') {
            tempSelectedNotaRapidaIdsRecurso = tempSelectedNotaRapidaIdsRecurso.filter(id => id !== idToRemove);
        }
        renderSelectedRelatedItemsRecurso();
    }

    async function abrirModalSelecaoRecurso(tipoEntidade) {
        if (!uiModuleRef || !uiModuleRef.showModal) {
            globalShowFeedbackRef("Erro: Funcionalidade de modal não está disponível.", "error", document.getElementById('feedback-form-recurso'));
            return;
        }

        let storeName, tituloModal, placeholderBusca, currentSelectionArrayRef, renderListCallback;
        let tempCurrentSelection; 

        switch (tipoEntidade) {
            case 'documento':
                storeName = DOCUMENTS_STORE_NAME;
                tituloModal = 'Selecionar Documentos para Vincular ao Recurso';
                placeholderBusca = 'Buscar por título, tipo, referência...';
                tempCurrentSelection = [...tempSelectedDocIdsRecurso]; 
                currentSelectionArrayRef = tempSelectedDocIdsRecurso; 
                renderListCallback = () => renderSelectedItemsListRecurso(tempSelectedDocIdsRecurso, 'lista-documentos-vinculados-recurso-form', DOCUMENTS_STORE_NAME, 'documento');
                break;
            case 'contribuinte':
                storeName = CONTRIBUINTES_STORE_NAME;
                tituloModal = 'Selecionar Outros Contribuintes para Vincular ao Recurso';
                placeholderBusca = 'Buscar por nome, CPF/CNPJ, ID interno...';
                tempCurrentSelection = [...tempSelectedContribIdsRecurso];
                currentSelectionArrayRef = tempSelectedContribIdsRecurso;
                renderListCallback = () => renderSelectedItemsListRecurso(tempSelectedContribIdsRecurso, 'lista-contribs-vinculados-recurso-form', CONTRIBUINTES_STORE_NAME, 'contribuinte');
                break;
            case 'tarefa': 
                storeName = TAREFAS_STORE_NAME;
                tituloModal = 'Selecionar Tarefas para Vincular ao Recurso';
                placeholderBusca = 'Buscar por título, ID, status...';
                tempCurrentSelection = [...tempSelectedTarefaIdsRecurso];
                currentSelectionArrayRef = tempSelectedTarefaIdsRecurso;
                renderListCallback = () => renderSelectedItemsListRecurso(tempSelectedTarefaIdsRecurso, 'lista-tarefas-vinculadas-recurso-form', TAREFAS_STORE_NAME, 'tarefa');
                break;
            case 'notaRapida':
                storeName = NOTAS_RAPIDAS_STORE_NAME;
                tituloModal = 'Selecionar Notas Rápidas para Vincular ao Recurso';
                placeholderBusca = 'Buscar por título, conteúdo...';
                tempCurrentSelection = [...tempSelectedNotaRapidaIdsRecurso];
                currentSelectionArrayRef = tempSelectedNotaRapidaIdsRecurso;
                renderListCallback = () => renderSelectedItemsListRecurso(tempSelectedNotaRapidaIdsRecurso, 'lista-notas-rapidas-vinculadas-recurso-form', NOTAS_RAPIDAS_STORE_NAME, 'notaRapida');
                break;
            default: return;
        }


        const modalId = `modal-selecionar-${tipoEntidade}-para-recurso`;
        const modalContentHtml = `
            <input type="search" id="filtro-modal-${tipoEntidade}-recurso" class="form-input-text w-full mb-3 text-sm" placeholder="${placeholderBusca}">
            <div id="lista-${tipoEntidade}s-modal-recurso" class="overflow-y-auto flex-grow border dark:border-slate-600 rounded-md p-2 min-h-[200px] max-h-[40vh] bg-gray-50 dark:bg-slate-600">
                <p class="text-sm text-gray-500 dark:text-gray-300">Carregando...</p>
            </div>
        `;

        const carregarItensNoModal = async (termoBusca = '') => {
            const listaModalEl = document.getElementById(`lista-${tipoEntidade}s-modal-recurso`);
            if (!listaModalEl) return;
            listaModalEl.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-300">Carregando...</p>';
            try {
                let todosItensAtivos = await dbRef.getAllItems(storeName);
                let todosItens = window.SEFWorkStation.EntityConfig.filterActiveItems(todosItensAtivos, storeName);

                if (termoBusca) {
                    const termo = termoBusca.toLowerCase();
                    todosItens = todosItens.filter(item => {
                        if (tipoEntidade === 'documento') return (item.title && item.title.toLowerCase().includes(termo)) || (item.reference && item.reference.toLowerCase().includes(termo));
                        if (tipoEntidade === 'contribuinte') return (item.nome && item.nome.toLowerCase().includes(termo)) || (item.cpfCnpj && item.cpfCnpj.toLowerCase().includes(termo)) || (item.numeroIdentificacao && item.numeroIdentificacao.toLowerCase().includes(termo));
                        if (tipoEntidade === 'recurso') return (item.titulo && item.titulo.toLowerCase().includes(termo)) || (item.numeroIdentificacao && item.numeroIdentificacao.toLowerCase().includes(termo));
                        if (tipoEntidade === 'tarefa' || tipoEntidade === 'notaRapida') return (item.titulo && item.titulo.toLowerCase().includes(termo)) || (item.conteudo && item.conteudo.toLowerCase().includes(termo)) || (item.numeroIdentificacao && item.numeroIdentificacao.toLowerCase().includes(termo));
                        return false;
                    });
                }
                todosItens.sort((a, b) => ((a.title || a.nome || a.titulo) || "").localeCompare((b.title || b.nome || b.titulo) || ""));

                if (todosItens.length === 0) {
                    listaModalEl.innerHTML = `<p class="text-sm text-gray-500 dark:text-gray-400">${termoBusca ? 'Nenhum item encontrado.' : `Nenhum ${tipoEntidade} disponível.`}</p>`;
                    return;
                }

                let itemsHtml = '<ul class="space-y-2">';
                todosItens.forEach(item => {
                    const isChecked = tempCurrentSelection.includes(item.id);
                    const displayName = item.title || item.nome || item.titulo || `ID ${item.id.toString().substring(0,8)}`;
                    const subInfo = tipoEntidade === 'documento' ? `(${item.docType || 'N/D'} - Ref: ${item.reference || 'N/A'})`
                                  : tipoEntidade === 'contribuinte' ? `(${item.numeroIdentificacao || item.cpfCnpj || 'N/A'})`
                                  : tipoEntidade === 'recurso' ? `(#${item.numeroIdentificacao || 'N/A'})`
                                  : tipoEntidade === 'tarefa' ? `(Status: ${item.status || 'N/D'}, Prazo: ${item.dataVencimento ? new Date(item.dataVencimento+'T00:00:00').toLocaleDateString() : 'N/A'})`
                                  : tipoEntidade === 'notaRapida' ? `(Modif.: ${new Date(item.dataModificacao).toLocaleDateString()})`
                                  : '';
                    itemsHtml += `
                        <li class="p-2 rounded hover:bg-gray-200 dark:hover:bg-slate-500">
                            <label class="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" value="${item.id}" class="form-checkbox rounded text-blue-600 modal-${tipoEntidade}-recurso-checkbox" ${isChecked ? 'checked' : ''}>
                                <span class="text-sm text-gray-700 dark:text-gray-200">
                                    ${displayName} <span class="text-xs text-gray-500 dark:text-gray-400 ml-1">${subInfo}</span>
                                </span>
                            </label>
                        </li>`;
                });
                itemsHtml += '</ul>';
                listaModalEl.innerHTML = itemsHtml;

                listaModalEl.querySelectorAll(`.modal-${tipoEntidade}-recurso-checkbox`).forEach(cb => {
                    cb.addEventListener('change', (e) => {
                        const itemId = e.target.value;
                        if (e.target.checked) {
                            if (!tempCurrentSelection.includes(itemId)) tempCurrentSelection.push(itemId);
                        } else {
                            const index = tempCurrentSelection.indexOf(itemId);
                            if (index > -1) tempCurrentSelection.splice(index, 1);
                        }
                    });
                });
            } catch (error) { console.error(`Erro ao carregar ${tipoEntidade}s no modal:`, error); if (listaModalEl) listaModalEl.innerHTML = `<p class="text-sm text-red-500 dark:text-red-400">Erro ao carregar ${tipoEntidade}s.</p>`; }
        };

        const modalButtons = [
            { text: 'Cancelar', class: 'btn-secondary text-sm', callback: () => uiModuleRef.closeModal() },
            {
                text: 'Confirmar Seleção',
                class: 'btn-primary text-sm',
                callback: () => {
                    if (tipoEntidade === 'documento') tempSelectedDocIdsRecurso = [...tempCurrentSelection];
                    else if (tipoEntidade === 'contribuinte') tempSelectedContribIdsRecurso = [...tempCurrentSelection];
                    else if (tipoEntidade === 'tarefa') tempSelectedTarefaIdsRecurso = [...tempCurrentSelection];
                    else if (tipoEntidade === 'notaRapida') tempSelectedNotaRapidaIdsRecurso = [...tempCurrentSelection];

                    renderSelectedRelatedItemsRecurso(); 
                    uiModuleRef.closeModal();
                }
            }
        ];
        uiModuleRef.showModal(tituloModal, modalContentHtml, modalButtons, 'max-w-2xl', modalId);
        const filtroInput = document.getElementById(`filtro-modal-${tipoEntidade}-recurso`);
        if (filtroInput) filtroInput.addEventListener('input', () => carregarItensNoModal(filtroInput.value));
        await carregarItensNoModal();
    }


    function addFormEventListenersRecurso(originView, isEditing) {
        const form = document.getElementById('form-recurso');
        const feedbackAreaForm = document.getElementById('feedback-form-recurso');
        const anexoGeralInput = document.getElementById('recurso-anexos-input');
        const anexoGeralPreviewList = document.getElementById('anexos-preview-recurso-list');
        const anexoDecisaoInput = document.getElementById('recurso-anexo-decisao-input');
        const anexoDecisaoPreviewList = document.getElementById('anexo-decisao-preview-list');
        const btnRemoverAnexoDecisaoExistente = document.getElementById('btn-remover-anexo-decisao-existente');
        const hiddenRecursoIdInput = document.getElementById('recurso-id-hidden');
        const hiddenNumeroIdentificacaoInput = document.getElementById('recurso-numero-identificacao-hidden');

        const btnGerenciarDocsVinculados = document.getElementById('btn-gerenciar-docs-vinculados-recurso');
        const btnGerenciarContribsVinculados = document.getElementById('btn-gerenciar-contribs-vinculados-recurso');
        const btnGerenciarTarefasVinculadas = document.getElementById('btn-gerenciar-tarefas-vinculadas-recurso'); 
        const btnGerenciarNotasRapidasVinculadas = document.getElementById('btn-gerenciar-notas-rapidas-vinculadas-recurso');


        if (btnGerenciarDocsVinculados) btnGerenciarDocsVinculados.addEventListener('click', () => abrirModalSelecaoRecurso('documento'));
        if (btnGerenciarContribsVinculados) btnGerenciarContribsVinculados.addEventListener('click', () => abrirModalSelecaoRecurso('contribuinte'));
        if (btnGerenciarTarefasVinculadas) btnGerenciarTarefasVinculadas.addEventListener('click', () => abrirModalSelecaoRecurso('tarefa')); 
        if (btnGerenciarNotasRapidasVinculadas) btnGerenciarNotasRapidasVinculadas.addEventListener('click', () => abrirModalSelecaoRecurso('notaRapida'));


        if (anexoGeralInput) {
            anexoGeralInput.addEventListener('change', (event) => {
                currentFilesToAttachRecurso = Array.from(event.target.files);
                anexoGeralPreviewList.innerHTML = '';
                if (currentFilesToAttachRecurso.length > 0) {
                    const ul = document.createElement('ul');
                    ul.className = 'list-disc pl-5 text-sm text-gray-600 dark:text-gray-400';
                    currentFilesToAttachRecurso.forEach(file => {
                        const li = document.createElement('li');
                        li.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
                        ul.appendChild(li);
                    });
                    anexoGeralPreviewList.appendChild(ul);
                }
            });
        }

        if (anexoDecisaoInput) {
            anexoDecisaoInput.addEventListener('change', (event) => {
                currentFileAnexoDecisao = event.target.files[0];
                anexoDecisaoPreviewList.innerHTML = '';
                if (currentFileAnexoDecisao) {
                    anexoDecisaoPreviewList.innerHTML = `<p class="text-sm text-green-600 dark:text-green-400">Novo anexo decisão: ${currentFileAnexoDecisao.name}</p>`;
                }
            });
        }

        if (btnRemoverAnexoDecisaoExistente) {
            btnRemoverAnexoDecisaoExistente.addEventListener('click', () => {
                if (confirm("Tem certeza que deseja remover o anexo da decisão existente? O arquivo físico não será excluído imediatamente, mas a referência será removida ao salvar.")) {
                    existingAnexoDecisaoPath = null;
                    const pElement = btnRemoverAnexoDecisaoExistente.parentElement;
                    if (pElement) pElement.textContent = "Anexo da decisão anterior será removido ao salvar.";
                }
            });
        }


        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (globalClearFeedbackRef) globalClearFeedbackRef(feedbackAreaForm);

            const tituloInput = document.getElementById('recurso-titulo');
            const contribuintePrincipalIdInput = document.getElementById('recurso-contribuinte-principal');
            const dataApresentacaoInput = document.getElementById('recurso-data-apresentacao');

            if (!tituloInput.value.trim()) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("O 'Título/Nome do Recurso' é obrigatório.", "error", feedbackAreaForm);
                tituloInput.focus(); return;
            }
            if (!contribuintePrincipalIdInput.value) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("O 'Contribuinte Principal' é obrigatório.", "error", feedbackAreaForm);
                contribuintePrincipalIdInput.focus(); return;
            }
            if (!dataApresentacaoInput.value) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("A 'Data de Apresentação' é obrigatória.", "error", feedbackAreaForm);
                dataApresentacaoInput.focus(); return;
            }

            let finalRecursoId;
            let finalNumeroIdentificacao;

            if (isEditing) {
                finalRecursoId = hiddenRecursoIdInput.value;
                finalNumeroIdentificacao = hiddenNumeroIdentificacaoInput.value;
            } else {
                finalRecursoId = appModuleRef.generateUUID();
                finalNumeroIdentificacao = await appModuleRef.generateRecursoNumeroIdentificacao();
            }

            const creationDate = document.getElementById('recurso-creation-date').value;
            const statusAtual = document.getElementById('recurso-status-atual').value;
            const statusJustificativa = document.getElementById('recurso-status-justificativa').value.trim();
            const despachoInicialTexto = document.getElementById('recurso-despacho-inicial').value.trim();
            const observacoesTexto = document.getElementById('recurso-observacoes').value.trim();

            let statusDetalhadoArray = (isEditing && originalRecursoDataForComparison && Array.isArray(originalRecursoDataForComparison.statusDetalhado)) ? [...originalRecursoDataForComparison.statusDetalhado] : [];
            if (statusJustificativa || (!isEditing && statusAtual) || (isEditing && originalRecursoDataForComparison && originalRecursoDataForComparison.status !== statusAtual) ) {
                statusDetalhadoArray.push({
                    status: statusAtual,
                    data: new Date().toISOString(),
                    justificativa: statusJustificativa,
                });
            }

            let despachosDecisoesArray = (isEditing && originalRecursoDataForComparison && Array.isArray(originalRecursoDataForComparison.despachosDecisoes)) ? [...originalRecursoDataForComparison.despachosDecisoes] : [];
            if (despachoInicialTexto && (!isEditing || (isEditing && (!originalRecursoDataForComparison.despachosDecisoes || originalRecursoDataForComparison.despachosDecisoes.length === 0 || originalRecursoDataForComparison.despachosDecisoes[0].texto !== despachoInicialTexto)))) {
                despachosDecisoesArray.push({
                    data: new Date().toISOString(),
                    texto: despachoInicialTexto,
                    tipo: 'andamento_manual'
                });
            }

            const recursoPayload = {
                id: finalRecursoId,
                numeroIdentificacao: finalNumeroIdentificacao,
                titulo: tituloInput.value.trim(),
                contribuintePrincipalId: contribuintePrincipalIdInput.value,
                dataApresentacao: dataApresentacaoInput.value,
                tipoRecurso: document.getElementById('recurso-tipo').value.trim(),
                status: statusAtual,
                statusDetalhado: statusDetalhadoArray,
                prioridade: document.getElementById('recurso-prioridade').value,
                dataLimiteResposta: document.getElementById('recurso-data-limite-resposta').value || null,
                dataJuntadaDocumentos: document.getElementById('recurso-data-juntada-docs').value || null,
                descricao: document.getElementById('recurso-descricao').value.trim(),
                despachosDecisoes: despachosDecisoesArray,
                observacoes: observacoesTexto,
                responsavelId: document.getElementById('recurso-responsavel').value.trim() || null,
                documentosVinculadosIds: [...tempSelectedDocIdsRecurso],
                tarefasVinculadasIds: [...tempSelectedTarefaIdsRecurso], 
                notasRapidasRelacionadasIds: [...tempSelectedNotaRapidaIdsRecurso], 
                comunicacoesVinculadasIds: [], 
                contribuintesVinculadosIds: [...tempSelectedContribIdsRecurso],
                anexos: [...existingAttachmentsRecurso],
                anexoDecisaoFinalPath: existingAnexoDecisaoPath,
                creationDate: creationDate,
                modificationDate: new Date().toISOString(),
                isDeleted: (isEditing && originalRecursoDataForComparison) ? (originalRecursoDataForComparison.isDeleted || false) : false
            };

            if (currentFilesToAttachRecurso.length > 0 && window.directoryHandle) {
                try {
                    const attachmentsRootSefDir = await window.directoryHandle.getDirectoryHandle('attachments_sef', { create: true });
                    const recursosAttachmentsDir = await attachmentsRootSefDir.getDirectoryHandle('recursos', { create: true });
                    const recursoDir = await recursosAttachmentsDir.getDirectoryHandle(finalRecursoId.toString(), { create: true });

                    for (const file of currentFilesToAttachRecurso) {
                        const fileHandle = await recursoDir.getFileHandle(file.name, { create: true });
                        const writable = await fileHandle.createWritable();
                        await writable.write(file);
                        await writable.close();
                        recursoPayload.anexos.push({
                            recursoId: finalRecursoId, 
                            ownerId: finalRecursoId, // Uniformizando para ownerId
                            ownerType: 'recurso',
                            fileName: file.name,
                            filePath: `recursos/${finalRecursoId}/${file.name}`,
                            fileType: file.type,
                            fileSize: file.size,
                            uploadDate: new Date().toISOString()
                        });
                    }
                } catch (fsError) {
                    console.error("RecursosForm.JS: Erro ao salvar anexos gerais do recurso:", fsError);
                    if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao salvar anexos gerais: ${fsError.message}.`, "error", feedbackAreaForm);
                }
            } else if (currentFilesToAttachRecurso.length > 0 && !window.directoryHandle) {
                 if (globalShowFeedbackRef) globalShowFeedbackRef("Pasta da aplicação não selecionada. Novos anexos gerais não puderam ser salvos.", "warning", feedbackAreaForm);
            }

            if (currentFileAnexoDecisao && window.directoryHandle) {
                try {
                    const attachmentsRootSefDir = await window.directoryHandle.getDirectoryHandle('attachments_sef', { create: true });
                    const recursosAttachmentsDir = await attachmentsRootSefDir.getDirectoryHandle('recursos', { create: true });
                    const recursoDir = await recursosAttachmentsDir.getDirectoryHandle(finalRecursoId.toString(), { create: true });
                    const decisaoDir = await recursoDir.getDirectoryHandle('decisao_final', { create: true });

                    if (recursoPayload.anexoDecisaoFinalPath && currentFileAnexoDecisao) { 
                        try {
                            const oldFileName = recursoPayload.anexoDecisaoFinalPath.split('/').pop();
                            await decisaoDir.removeEntry(oldFileName);
                        } catch (removeError) {
                            if (removeError.name !== 'NotFoundError') console.warn("Erro ao remover anexo de decisão antigo:", removeError);
                        }
                    }

                    const fileHandle = await decisaoDir.getFileHandle(currentFileAnexoDecisao.name, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(currentFileAnexoDecisao);
                    await writable.close();
                    recursoPayload.anexoDecisaoFinalPath = `recursos/${finalRecursoId}/decisao_final/${currentFileAnexoDecisao.name}`;
                } catch (fsError) {
                    console.error("RecursosForm.JS: Erro ao salvar anexo da decisão final:", fsError);
                    if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao salvar anexo da decisão: ${fsError.message}.`, "error", feedbackAreaForm);
                }
            } else if (currentFileAnexoDecisao && !window.directoryHandle) {
                 if (globalShowFeedbackRef) globalShowFeedbackRef("Pasta da aplicação não selecionada. Anexo da decisão não pôde ser salvo.", "warning", feedbackAreaForm);
            } else if (!currentFileAnexoDecisao && !existingAnexoDecisaoPath && isEditing && originalRecursoDataForComparison && originalRecursoDataForComparison.anexoDecisaoFinalPath) {
                recursoPayload.anexoDecisaoFinalPath = null;
            }


            try {
                let docsAnteriores = [];
                let contribsAnteriores = [];
                let tarefasAnteriores = [];
                let notasAnteriores = [];

                if (isEditing && originalRecursoDataForComparison) {
                    docsAnteriores = originalRecursoDataForComparison.documentosVinculadosIds || [];
                    contribsAnteriores = [originalRecursoDataForComparison.contribuintePrincipalId, ...(originalRecursoDataForComparison.contribuintesVinculadosIds || [])].filter(Boolean);
                    tarefasAnteriores = originalRecursoDataForComparison.tarefasVinculadasIds || [];
                    notasAnteriores = originalRecursoDataForComparison.notasRapidasRelacionadasIds || [];
                }

                if (isEditing) {
                    await dbRef.updateItem(RECURSOS_STORE_NAME, recursoPayload);
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Recurso atualizado com sucesso!", "success", feedbackAreaForm);
                } else {
                    await dbRef.addItem(RECURSOS_STORE_NAME, recursoPayload);
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Recurso salvo com sucesso!", "success", feedbackAreaForm);
                }

                const docsDepois = recursoPayload.documentosVinculadosIds || [];
                await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(
                    finalRecursoId, DOCUMENTS_STORE_NAME, 'recursosVinculados',
                    docsDepois, docsAnteriores, dbRef
                );

                const contribsDepois = [recursoPayload.contribuintePrincipalId, ...(recursoPayload.contribuintesVinculadosIds || [])].filter(Boolean);
                await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(
                    finalRecursoId, CONTRIBUINTES_STORE_NAME, 'recursosRelacionados',
                    contribsDepois, contribsAnteriores, dbRef
                );

                const tarefasDepois = recursoPayload.tarefasVinculadasIds || [];
                await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(
                    finalRecursoId, TAREFAS_STORE_NAME, 'recursosVinculadosIds', 
                    tarefasDepois, tarefasAnteriores, dbRef
                );

                const notasDepois = recursoPayload.notasRapidasRelacionadasIds || [];
                await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(
                    finalRecursoId, NOTAS_RAPIDAS_STORE_NAME, 'recursosRelacionadosIds', 
                    notasDepois, notasAnteriores, dbRef
                );


                if (refreshApplicationStateRef) await refreshApplicationStateRef();

                if (recursosViewModuleRef && recursosViewModuleRef.renderVisualizarRecursoPage) {
                    recursosViewModuleRef.renderVisualizarRecursoPage(finalRecursoId, originView);
                } else if (appModuleRef && appModuleRef.navigateBack) { 
                    appModuleRef.navigateBack();
                }

            } catch (error) {
                console.error("RecursosForm.JS: Erro ao salvar recurso no DB:", error); 
                if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao salvar recurso: ${error.message}`, "error", feedbackAreaForm);
            }
        });

        document.getElementById('btn-cancelar-recurso').addEventListener('click', () => {
            if (appModuleRef && appModuleRef.navigateBack) {
                appModuleRef.navigateBack();
            } else {
                console.warn("RecursosForm.JS: appModuleRef.navigateBack não disponível. Usando fallback para irParaHome.");
                if (appModuleRef && appModuleRef.irParaHome) { 
                    appModuleRef.irParaHome();
                }
            }
        });
    }

    return {
        init,
        renderNovoRecursoForm
    };
})();