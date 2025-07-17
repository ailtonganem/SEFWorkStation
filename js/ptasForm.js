// js/ptasForm.js - Lógica para Formulários de PTA
// v1.1.0 - REFATORADO: Adiciona a lógica de modal para seleção de vínculos e aplica o filtro de versionamento (EntityConfig.filterActiveItems) para garantir que apenas itens ativos sejam listados.
// v0.9.1 - Remove classe page-section para expandir a largura da visualização.
// ... (histórico anterior)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.PTAForm = (function() {
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let navigateAfterSaveOrCancelCallback;
    let refreshApplicationStateRef;
    let dbRef;
    let appModuleRef;
    let uiModuleRef;
    let ptasViewModuleRef;

    const PTAS_STORE_NAME = 'ptasStore';
    const PTA_TYPES_STORE_NAME = 'ptaTypesStore';
    const DOCUMENTS_STORE_NAME = 'documents';
    const CONTRIBUINTES_STORE_NAME = 'contribuintes';
    const TAREFAS_STORE_NAME = 'tarefasStore';
    const NOTAS_RAPIDAS_STORE_NAME = 'notasRapidasStore';
    const PROTOCOLOS_STORE_NAME = 'protocolosStore';
    const SERVIDORES_STORE_NAME = 'servidoresStore';
    const AUTUACOES_STORE_NAME = 'autuacoesStore';

    const STATUS_PTA_OPTIONS = ["Em Elaboração", "Submetido", "Em Análise", "Deferido", "Indeferido", "Arquivado", "Recurso Pendente", "Cancelado", "Convertido em Autuação", "Outro"];

    let currentPTAId = null;
    let originalPTAData = null;

    let currentFilesToAttachPTA = [];
    let existingAttachmentsPTA = [];

    let currentRelatedDocIds = [];
    let currentRelatedContribIds = [];
    let currentRelatedTarefaIds = [];
    let currentRelatedNotaRapidaIds = [];
    let currentRelatedProtocoloOriginarioIds = [];
    let currentRelatedServidorIds = [];
    let currentRelatedAutuacaoGeradaIds = [];
    let tempSelectedIdsModal = [];


    function init(
        mainWrapper,
        showFeedbackFunc,
        clearFeedbackFunc,
        navigateCb,
        refreshFunc,
        dbModuleRef,
        applicationModuleRef,
        uiRefModule,
        viewModule
    ) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedbackFunc;
        globalClearFeedbackRef = clearFeedbackFunc;
        navigateAfterSaveOrCancelCallback = navigateCb;
        refreshApplicationStateRef = refreshFunc;
        dbRef = dbModuleRef;
        appModuleRef = applicationModuleRef;
        uiModuleRef = uiRefModule;
        ptasViewModuleRef = viewModule;

        if (!dbRef) console.error("PTAForm.JS: init - Referência ao DB não fornecida!");
        if (!uiModuleRef) console.warn("PTAForm.JS: init - Módulo UI não disponível, modais podem não funcionar.");
        if (!appModuleRef) console.error("PTAForm.JS: init - appModuleRef não fornecido.");
        console.log("PTAForm.JS: Módulo inicializado (v1.1.0).");
    }

    async function renderFormularioPTA(ptaData = null, originatingView = 'gerir-ptas', usarComoBase = false, preSelectedLink = null) {
        if (globalClearFeedbackRef) globalClearFeedbackRef();
        
        const isEditing = ptaData && ptaData.id && !usarComoBase;
        currentPTAId = isEditing ? ptaData.id : null;
        originalPTAData = isEditing ? JSON.parse(JSON.stringify(ptaData)) : null;

        currentFilesToAttachPTA = [];
        existingAttachmentsPTA = (isEditing && Array.isArray(ptaData.anexos)) ? [...ptaData.anexos] : [];

        currentRelatedDocIds = (isEditing && Array.isArray(ptaData.documentosVinculadosIds)) ? [...ptaData.documentosVinculadosIds] : [];
        currentRelatedContribIds = (isEditing && Array.isArray(ptaData.contribuintesVinculadosIds)) ? [...ptaData.contribuintesVinculadosIds] : [];
        currentRelatedTarefaIds = (isEditing && Array.isArray(ptaData.tarefasVinculadasIds)) ? [...ptaData.tarefasVinculadasIds] : [];
        currentRelatedNotaRapidaIds = (isEditing && Array.isArray(ptaData.notasRapidasRelacionadasIds)) ? [...ptaData.notasRapidasRelacionadasIds] : [];
        currentRelatedServidorIds = (isEditing && Array.isArray(ptaData.servidoresVinculadosIds)) ? [...ptaData.servidoresVinculadosIds] : [];
        
        if (preSelectedLink && preSelectedLink.type === 'protocolo' && preSelectedLink.id && !isEditing) {
            currentRelatedProtocoloOriginarioIds = [preSelectedLink.id];
        } else if (isEditing && Array.isArray(ptaData.protocolosOriginariosIds)) {
             currentRelatedProtocoloOriginarioIds = [...ptaData.protocolosOriginariosIds];
        } else {
            currentRelatedProtocoloOriginarioIds = [];
        }

        currentRelatedAutuacaoGeradaIds = (isEditing && Array.isArray(ptaData.autuacoesGeradasIds)) ? [...ptaData.autuacoesGeradasIds] : [];


        const formTitle = isEditing ? "Editar PTA" : "Cadastrar Novo PTA";
        const numeroPTADisplay = isEditing && ptaData.numeroPTA ? ptaData.numeroPTA : (isEditing ? 'N/A' : 'Será gerado ao salvar');
        const feedbackAreaId = `feedback-form-pta-${currentPTAId || 'novo'}`;

        let tiposDePTAExistentes = [];
        try {
            tiposDePTAExistentes = await dbRef.getAllItems(PTA_TYPES_STORE_NAME);
            tiposDePTAExistentes.sort((a, b) => a.name.localeCompare(b.name));
        } catch (e) {
            console.warn("PTAForm.JS: Não foi possível carregar tipos de PTA existentes.", e);
        }
        const datalistOptionsHtml = tiposDePTAExistentes.map(tipo => `<option value="${tipo.name.replace(/"/g, '"')}">`).join('');

        const formHtml = `
            <div class="form-section">
                <h2 class="text-xl font-semibold mb-2">${formTitle}</h2>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">Número do PTA: ${numeroPTADisplay}</p>
                <div id="${feedbackAreaId}" class="mb-4"></div>

                <form id="form-pta">
                    <input type="hidden" id="pta-id-hidden" value="${currentPTAId || ''}">
                    <input type="hidden" id="pta-creation-date" value="${(isEditing && ptaData?.dataCriacao) ? ptaData.dataCriacao : new Date().toISOString()}">
                    <input type="hidden" id="pta-numero-original-hidden" value="${(isEditing && ptaData?.numeroPTA) ? ptaData.numeroPTA.replace(/"/g, '"') : ''}">

                    <div class="mb-4">
                        <label for="pta-numero" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Número do PTA (Manual, se houver):</label>
                        <input type="text" id="pta-numero" name="numeroPTAInput" class="form-input-text mt-1 block w-full"
                               value="${(ptaData?.numeroPTA && isEditing) ? ptaData.numeroPTA.replace(/"/g, '"') : ''}" 
                               placeholder="Deixar em branco para geração automática" ${isEditing ? 'disabled' : ''}>
                        ${isEditing && ptaData?.numeroPTA ? '<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">O número do PTA não pode ser alterado após o cadastro.</p>' : ''}
                    </div>

                    <div class="form-grid">
                        <div>
                            <label for="pta-data" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Data do PTA (Autuação/Início): <span class="text-red-500">*</span></label>
                            <input type="date" id="pta-data" name="dataPTA" class="form-input-text mt-1 block w-full" required value="${(ptaData?.dataPTA) ? ptaData.dataPTA.substring(0,10) : new Date().toISOString().substring(0,10)}">
                        </div>
                        <div>
                            <label for="pta-tipo" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de PTA: <span class="text-red-500">*</span></label>
                            <input type="text" list="tipos-pta-datalist" id="pta-tipo" name="tipoPTA" class="form-input-text mt-1 block w-full" required value="${(ptaData?.tipoPTA) ? ptaData.tipoPTA.replace(/"/g, '"') : ''}">
                            <datalist id="tipos-pta-datalist">
                                ${datalistOptionsHtml}
                            </datalist>
                        </div>
                    </div>

                    <div class="mb-4">
                        <label for="pta-assunto" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Assunto/Matéria: <span class="text-red-500">*</span></label>
                        <input type="text" id="pta-assunto" name="assuntoPTA" class="form-input-text mt-1 block w-full" required value="${(ptaData?.assuntoPTA) ? ptaData.assuntoPTA.replace(/"/g, '"') : ''}">
                    </div>

                    <div class="mb-4">
                        <label for="pta-descricao" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição Detalhada:</label>
                        <textarea id="pta-descricao" name="descricaoDetalhadaPTA" rows="4" class="form-input-text mt-1 block w-full">${(ptaData?.descricaoDetalhadaPTA) || ''}</textarea>
                    </div>

                     <div class="form-grid mt-4">
                        <div>
                            <label for="pta-responsavel" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Servidor Responsável:</label>
                            <input type="text" id="pta-responsavel" name="servidorResponsavelPTA" class="form-input-text mt-1 block w-full" value="${(ptaData?.servidorResponsavelPTA) ? ptaData.servidorResponsavelPTA.replace(/"/g, '"') : ''}" placeholder="Matrícula ou Nome do servidor">
                        </div>
                        <div>
                            <label for="pta-status" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Status do PTA:</label>
                            <select id="pta-status" name="statusPTA" class="form-input-text mt-1 block w-full">
                                ${STATUS_PTA_OPTIONS.map(s => `<option value="${s}" ${ptaData?.statusPTA === s || (!isEditing && s === 'Em Elaboração') ? 'selected' : ''}>${s}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <div class="mb-4 mt-4">
                        <label for="pta-primeiro-andamento" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Primeiro Andamento/Despacho:</label>
                        <textarea id="pta-primeiro-andamento" name="primeiroAndamentoPTA" rows="3" class="form-input-text mt-1 block w-full" placeholder="Registre o primeiro andamento ou despacho aqui. Outros podem ser adicionados na visualização.">${(ptaData?.historicoAndamentoPTA && ptaData.historicoAndamentoPTA.length > 0 && !isEditing) ? ptaData.historicoAndamentoPTA[0].descricao : ''}</textarea>
                         ${isEditing ? '<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Para adicionar novos andamentos a um PTA existente, utilize a tela de visualização do PTA.</p>' : ''}
                    </div>

                    <h3 class="text-md font-semibold my-4 pt-2 border-t dark:border-slate-600">Vínculos</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Protocolos de Origem:</label>
                            <div id="lista-protocolos-vinculados-pta" class="form-vinculos-lista"></div>
                            <button type="button" id="btn-gerenciar-protocolos-vinculados-pta" class="btn-secondary btn-sm text-xs">Gerenciar Vínculos com Protocolos</button>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Documentos Vinculados:</label>
                            <div id="lista-docs-vinculados-pta" class="form-vinculos-lista"></div>
                            <button type="button" id="btn-gerenciar-docs-vinculados-pta" class="btn-secondary btn-sm text-xs">Gerenciar Vínculos com Documentos</button>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Contribuintes Vinculados:</label>
                            <div id="lista-contribs-vinculados-pta" class="form-vinculos-lista"></div>
                            <button type="button" id="btn-gerenciar-contribs-vinculados-pta" class="btn-secondary btn-sm text-xs">Gerenciar Vínculos com Contribuintes</button>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Servidores Vinculados:</label>
                            <div id="lista-servidores-vinculados-pta" class="form-vinculos-lista"></div>
                            <button type="button" id="btn-gerenciar-servidores-vinculados-pta" class="btn-secondary btn-sm text-xs">Gerenciar Vínculos com Servidores</button>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Tarefas Vinculadas:</label>
                            <div id="lista-tarefas-vinculadas-pta" class="form-vinculos-lista"></div>
                            <button type="button" id="btn-gerenciar-tarefas-vinculados-pta" class="btn-secondary btn-sm text-xs">Gerenciar Vínculos com Tarefas</button>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Notas Rápidas Vinculadas:</label>
                            <div id="lista-notas-vinculadas-pta" class="form-vinculos-lista"></div>
                            <button type="button" id="btn-gerenciar-notas-vinculadas-pta" class="btn-secondary btn-sm text-xs">Gerenciar Vínculos com Notas Rápidas</button>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Autuações Geradas por este PTA:</label>
                            <div id="lista-autuacoes-geradas-pta" class="form-vinculos-lista"></div>
                            <button type="button" id="btn-gerenciar-autuacoes-geradas-pta" class="btn-secondary btn-sm text-xs">Gerenciar Vínculos com Autuações</button>
                        </div>
                    </div>

                    <div class="mb-6">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Anexos:</label>
                        <div id="anexos-existentes-pta-list" class="mb-2"></div>
                        <input type="file" id="pta-anexos-input" name="anexos" class="form-input-file mt-1 block w-full" multiple>
                        <div id="anexos-preview-pta-list" class="mt-2"></div>
                    </div>

                    <div class="mb-4">
                        <label for="pta-notas-internas" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Notas Internas:</label>
                        <textarea id="pta-notas-internas" name="notasInternasPTA" rows="3" class="form-input-text mt-1 block w-full">${(ptaData?.notasInternasPTA) || ''}</textarea>
                    </div>

                    <div class="form-actions">
                        <button type="button" id="btn-cancelar-pta" class="btn-secondary">Cancelar</button>
                        <button type="submit" id="btn-salvar-pta" class="btn-primary">${isEditing ? 'Atualizar PTA' : 'Salvar PTA'}</button>
                    </div>
                </form>
            </div>
        `;
        mainContentWrapperRef.innerHTML = formHtml;

        renderExistingAttachmentsPTA();
        await renderSelectedRelatedItemsPTA(); 
        await renderSelectedServidoresNoFormPTA();

        addFormEventListenersPTA(feedbackAreaId, originatingView, isEditing);
    }

    function renderExistingAttachmentsPTA() {
        const listContainer = document.getElementById('anexos-existentes-pta-list');
        if (!listContainer) return;

        listContainer.innerHTML = '';
        if (existingAttachmentsPTA.length > 0) {
            const ul = document.createElement('ul');
            ul.className = 'list-none p-0 mb-2';
            existingAttachmentsPTA.forEach((anexo, index) => {
                const li = document.createElement('li');
                li.className = 'anexo-preview-item flex justify-between items-center text-sm p-2 bg-gray-100 dark:bg-slate-600 rounded mb-1';
                li.innerHTML = `
                    <span>${anexo.fileName.replace(/"/g, '"')} (${(anexo.fileSize / 1024).toFixed(1)} KB)</span>
                    <button type="button" data-index="${index}" class="btn-remove-anexo-preview-pta text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300" title="Remover anexo existente">
                        ×
                    </button>
                `;
                ul.appendChild(li);
            });
            listContainer.appendChild(ul);

            listContainer.querySelectorAll('.btn-remove-anexo-preview-pta').forEach(button => {
                button.addEventListener('click', (event) => {
                    const indexToRemove = parseInt(event.currentTarget.dataset.index);
                    existingAttachmentsPTA.splice(indexToRemove, 1);
                    renderExistingAttachmentsPTA();
                });
            });
        }
    }
    
    async function renderSelectedServidoresNoFormPTA() { 
        const container = document.getElementById('lista-servidores-vinculados-pta');
        if (!container) return;
        container.innerHTML = '';
        if (!currentRelatedServidorIds || currentRelatedServidorIds.length === 0) {
            container.innerHTML = '<p class="text-xs text-gray-500 dark:text-gray-300">Nenhum servidor vinculado.</p>';
            return;
        }
        const ul = document.createElement('ul');
        ul.className = 'list-none p-0 space-y-1';
        for (const servidorId of currentRelatedServidorIds) {
            try {
                const servidor = await dbRef.getItemById(SERVIDORES_STORE_NAME, servidorId);
                const li = document.createElement('li');
                li.className = 'flex justify-between items-center text-xs p-1.5 bg-blue-100 dark:bg-blue-700 rounded';
                const displayName = servidor ? `${servidor.nome} (${servidor.matricula || 'S/Matr.'})` : `ID ${servidorId.substring(0, 8)} (Não encontrado)`;
                li.innerHTML = `<span class="truncate text-blue-800 dark:text-blue-200" title="${displayName.replace(/"/g, '"')}">${displayName}</span>
                                <button type="button" data-id="${servidorId}" class="btn-remove-related-servidor-pta text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm leading-none p-0.5" title="Remover vínculo com este servidor">×</button>`;
                li.querySelector('.btn-remove-related-servidor-pta').addEventListener('click', (e) => {
                    const idToRemove = e.currentTarget.dataset.id;
                    currentRelatedServidorIds = currentRelatedServidorIds.filter(id => id.toString() !== idToRemove.toString());
                    renderSelectedServidoresNoFormPTA();
                });
                ul.appendChild(li);
            } catch (error) {
                console.warn(`Erro ao renderizar servidor vinculado ID ${servidorId} para PTA:`, error);
            }
        }
        container.appendChild(ul);
    }

    async function abrirModalSelecaoServidoresParaPTA() { 
        if (!uiModuleRef || !uiModuleRef.showModal) {
            if(globalShowFeedbackRef) globalShowFeedbackRef("Erro: Funcionalidade de modal não está disponível.", "error", document.getElementById(`feedback-form-pta-${currentPTAId || 'novo'}`));
            return;
        }
        const modalId = `modal-selecionar-servidores-pta-${currentPTAId || Date.now()}`;
        tempSelectedIdsModal = [...currentRelatedServidorIds]; 

        const modalContentHtml = `
            <div class="bg-gray-100 dark:bg-slate-700 p-3 rounded-md">
                <input type="search" id="filtro-modal-servidores-pta" class="form-input-text w-full mb-3 text-sm" placeholder="Buscar por nome, matrícula, e-mail...">
                <div id="lista-servidores-modal-pta" class="overflow-y-auto flex-grow border dark:border-slate-500 rounded-md p-2 min-h-[200px] max-h-[50vh] bg-white dark:bg-slate-600">
                    <p class="text-sm text-gray-500 dark:text-gray-300">Carregando servidores...</p>
                </div>
            </div>
        `;

        const carregarServidoresNoModal = async (termoBusca = '') => {
            const listaModalEl = document.getElementById(`lista-servidores-modal-pta`);
            if (!listaModalEl) return;
            listaModalEl.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-300">Carregando...</p>';
            try {
                let servidores = await dbRef.getAllItems(SERVIDORES_STORE_NAME);
                servidores = servidores.filter(s => !s.isDeleted && s.status === 'Ativo');

                if (termoBusca) {
                    const t = termoBusca.toLowerCase();
                    servidores = servidores.filter(s =>
                        (s.nome && s.nome.toLowerCase().includes(t)) ||
                        (s.matricula && s.matricula.toLowerCase().includes(t)) ||
                        (s.email && s.email.toLowerCase().includes(t))
                    );
                }
                servidores.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));

                if (servidores.length === 0) {
                    listaModalEl.innerHTML = `<p class="text-sm text-gray-500 dark:text-gray-300">${termoBusca ? 'Nenhum servidor encontrado.' : 'Nenhum servidor ativo cadastrado.'}</p>`;
                    return;
                }

                let itemsHtml = '<ul class="space-y-1.5">';
                servidores.forEach(servidor => {
                    const isChecked = tempSelectedIdsModal.includes(servidor.id);
                    itemsHtml += `
                        <li class="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-500">
                            <label class="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" value="${servidor.id}" class="form-checkbox rounded text-blue-600 modal-servidor-pta-checkbox h-4 w-4" ${isChecked ? 'checked' : ''}>
                                <span class="text-sm text-gray-700 dark:text-gray-200">
                                    ${servidor.nome} <span class="text-xs text-gray-500 dark:text-gray-400">(${servidor.matricula || 'S/Matr.'} - ${servidor.localExercicio || 'S/Local'})</span>
                                </span>
                            </label>
                        </li>`;
                });
                itemsHtml += '</ul>';
                listaModalEl.innerHTML = itemsHtml;

                listaModalEl.querySelectorAll('.modal-servidor-pta-checkbox').forEach(cb => {
                    cb.addEventListener('change', (e) => {
                        const servidorId = e.target.value;
                        if (e.target.checked) {
                            if (!tempSelectedIdsModal.includes(servidorId)) tempSelectedIdsModal.push(servidorId);
                        } else {
                            tempSelectedIdsModal = tempSelectedIdsModal.filter(id => id !== servidorId);
                        }
                    });
                });
            } catch (error) {
                if (listaModalEl) listaModalEl.innerHTML = `<p class="text-sm text-red-500 dark:text-red-400">Erro ao carregar servidores.</p>`;
            }
        };

        const modalButtons = [
            { text: 'Cancelar', class: 'btn-secondary text-sm', callback: () => uiModuleRef.closeModal(), closesModal: true },
            {
                text: 'Confirmar Seleção',
                class: 'btn-primary text-sm',
                callback: async () => {
                    currentRelatedServidorIds = [...tempSelectedIdsModal];
                    await renderSelectedServidoresNoFormPTA();
                    uiModuleRef.closeModal();
                }
            }
        ];
        uiModuleRef.showModal('Selecionar Servidores Vinculados ao PTA', modalContentHtml, modalButtons, 'max-w-xl', modalId);
        const filtroInput = document.getElementById(`filtro-modal-servidores-pta`);
        if (filtroInput) filtroInput.addEventListener('input', () => carregarServidoresNoModal(filtroInput.value));
        await carregarServidoresNoModal();
    }

    async function renderSelectedRelatedItemsPTA() {
        await renderSelectedItemsListPTA(currentRelatedProtocoloOriginarioIds, 'lista-protocolos-vinculados-pta', PROTOCOLOS_STORE_NAME, 'protocoloOriginario', 'numeroProtocolo');
        await renderSelectedItemsListPTA(currentRelatedDocIds, 'lista-docs-vinculados-pta', DOCUMENTS_STORE_NAME, 'documento', 'title');
        await renderSelectedItemsListPTA(currentRelatedContribIds, 'lista-contribs-vinculados-pta', CONTRIBUINTES_STORE_NAME, 'contribuinte', 'nome');
        await renderSelectedItemsListPTA(currentRelatedTarefaIds, 'lista-tarefas-vinculadas-pta', TAREFAS_STORE_NAME, 'tarefa', 'titulo');
        await renderSelectedItemsListPTA(currentRelatedNotaRapidaIds, 'lista-notas-vinculadas-pta', NOTAS_RAPIDAS_STORE_NAME, 'notaRapida', 'titulo');
        await renderSelectedItemsListPTA(currentRelatedAutuacaoGeradaIds, 'lista-autuacoes-geradas-pta', AUTUACOES_STORE_NAME, 'autuacaoGerada', 'numeroAutuacao');
    }

    async function renderSelectedItemsListPTA(ids, containerId, storeName, tipoEntidade, displayField = 'title') {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`Container ${containerId} não encontrado para tipo ${tipoEntidade}`);
            return;
        }

        container.innerHTML = '';
        let labelSingular = tipoEntidade.toLowerCase();
        if (tipoEntidade === 'protocoloOriginario') labelSingular = 'protocolo de origem';
        else if (tipoEntidade === 'autuacaoGerada') labelSingular = 'autuação gerada';
        else if (tipoEntidade === 'notaRapida') labelSingular = 'nota rápida';


        if (!ids || ids.length === 0) {
            container.innerHTML = `<p class="text-xs text-gray-500 dark:text-gray-300">Nenhum ${labelSingular} vinculado.</p>`;
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
                    displayName = item[displayField] || item.nome || item.titulo || `ID ${id.toString().substring(0,8)}`;
                    if (tipoEntidade === 'protocoloOriginario' && item.numeroProtocolo) displayName = `Protocolo ${item.numeroProtocolo}`;
                    else if (tipoEntidade === 'autuacaoGerada' && item.numeroAutuacao) displayName = `Autuação ${item.numeroAutuacao}`;
                }

                li.innerHTML = `
                    <span class="truncate text-gray-700 dark:text-gray-200" title="${displayName.replace(/"/g, '"')}">${displayName}</span>
                    <button type="button" data-id="${id}" data-type="${tipoEntidade}" class="btn-remove-related-item-pta text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm leading-none p-0.5" title="Remover vínculo">×</button>
                `;
                li.querySelector('.btn-remove-related-item-pta').addEventListener('click', (e) => {
                    const idToRemove = e.currentTarget.dataset.id;
                    const typeToRemove = e.currentTarget.dataset.type;
                    if (typeToRemove === 'protocoloOriginario') currentRelatedProtocoloOriginarioIds = currentRelatedProtocoloOriginarioIds.filter(i => i.toString() !== idToRemove.toString());
                    else if (typeToRemove === 'documento') currentRelatedDocIds = currentRelatedDocIds.filter(i => i.toString() !== idToRemove.toString());
                    else if (typeToRemove === 'contribuinte') currentRelatedContribIds = currentRelatedContribIds.filter(i => i.toString() !== idToRemove.toString());
                    else if (typeToRemove === 'tarefa') currentRelatedTarefaIds = currentRelatedTarefaIds.filter(i => i.toString() !== idToRemove.toString());
                    else if (typeToRemove === 'notaRapida') currentRelatedNotaRapidaIds = currentRelatedNotaRapidaIds.filter(i => i.toString() !== idToRemove.toString());
                    else if (typeToRemove === 'autuacaoGerada') currentRelatedAutuacaoGeradaIds = currentRelatedAutuacaoGeradaIds.filter(i => i.toString() !== idToRemove.toString());
                    renderSelectedRelatedItemsPTA();
                });
                ul.appendChild(li);
            } catch (error) {
                console.warn(`Erro ao renderizar item relacionado ${tipoEntidade} ID ${id} para PTA:`, error);
            }
        }
        container.appendChild(ul);
    }

    async function abrirModalSelecaoPTA(tipoEntidade) {
        if (!uiModuleRef || !uiModuleRef.showModal) {
            globalShowFeedbackRef("Erro: Funcionalidade de modal não está disponível.", "error", document.getElementById(`feedback-form-pta-${currentPTAId || 'novo'}`));
            return;
        }

        let storeName, tituloModal, placeholderBusca, currentSelectionArrayRef, renderListCallback, displayField, subInfoCallback;
        let labelSingular = tipoEntidade.toLowerCase();

        switch (tipoEntidade) {
            case 'protocoloOriginario': 
                storeName = PROTOCOLOS_STORE_NAME;
                tituloModal = 'Selecionar Protocolos de Origem para o PTA';
                placeholderBusca = 'Buscar por número, assunto...';
                tempSelectedIdsModal = [...currentRelatedProtocoloOriginarioIds];
                currentSelectionArrayRef = currentRelatedProtocoloOriginarioIds;
                renderListCallback = () => renderSelectedItemsListPTA(currentRelatedProtocoloOriginarioIds, 'lista-protocolos-vinculados-pta', PROTOCOLOS_STORE_NAME, 'protocoloOriginario', 'numeroProtocolo');
                displayField = 'numeroProtocolo';
                labelSingular = 'Protocolo';
                subInfoCallback = (item) => `(Assunto: ${item.assunto ? item.assunto.substring(0,30) + '...' : 'N/A'})`;
                break;
            case 'documento':
                storeName = DOCUMENTS_STORE_NAME;
                tituloModal = 'Selecionar Documentos para Vincular ao PTA';
                placeholderBusca = 'Buscar por título, tipo, referência...';
                tempSelectedIdsModal = [...currentRelatedDocIds];
                currentSelectionArrayRef = currentRelatedDocIds;
                renderListCallback = () => renderSelectedItemsListPTA(currentRelatedDocIds, 'lista-docs-vinculados-pta', DOCUMENTS_STORE_NAME, 'documento', 'title');
                displayField = 'title';
                subInfoCallback = (item) => `(${item.docType || 'N/D'} - Ref: ${item.reference || 'N/A'})`;
                break;
            case 'contribuinte':
                storeName = CONTRIBUINTES_STORE_NAME;
                tituloModal = 'Selecionar Contribuintes para Vincular ao PTA';
                placeholderBusca = 'Buscar por nome, CPF/CNPJ, ID interno...';
                tempSelectedIdsModal = [...currentRelatedContribIds];
                currentSelectionArrayRef = currentRelatedContribIds;
                renderListCallback = () => renderSelectedItemsListPTA(currentRelatedContribIds, 'lista-contribs-vinculados-pta', CONTRIBUINTES_STORE_NAME, 'contribuinte', 'nome');
                displayField = 'nome';
                subInfoCallback = (item) => `(${item.numeroIdentificacao || item.cpfCnpj || 'N/A'})`;
                break;
            case 'tarefa':
                storeName = TAREFAS_STORE_NAME;
                tituloModal = 'Selecionar Tarefas para Vincular ao PTA';
                placeholderBusca = 'Buscar por título, ID, status...';
                tempSelectedIdsModal = [...currentRelatedTarefaIds];
                currentSelectionArrayRef = currentRelatedTarefaIds;
                renderListCallback = () => renderSelectedItemsListPTA(currentRelatedTarefaIds, 'lista-tarefas-vinculadas-pta', TAREFAS_STORE_NAME, 'tarefa', 'titulo');
                displayField = 'titulo';
                subInfoCallback = (item) => `(Status: ${item.status || 'N/D'}, Prazo: ${item.dataVencimento ? new Date(item.dataVencimento+'T00:00:00').toLocaleDateString() : 'N/A'})`;
                break;
            case 'notaRapida':
                storeName = NOTAS_RAPIDAS_STORE_NAME;
                tituloModal = 'Selecionar Notas Rápidas para Vincular ao PTA';
                placeholderBusca = 'Buscar por título, conteúdo...';
                tempSelectedIdsModal = [...currentRelatedNotaRapidaIds];
                currentSelectionArrayRef = currentRelatedNotaRapidaIds;
                renderListCallback = () => renderSelectedItemsListPTA(currentRelatedNotaRapidaIds, 'lista-notas-vinculadas-pta', NOTAS_RAPIDAS_STORE_NAME, 'notaRapida', 'titulo');
                displayField = 'titulo';
                subInfoCallback = (item) => `(Modif.: ${new Date(item.dataModificacao).toLocaleDateString()})`;
                break;
            case 'autuacaoGerada': 
                storeName = AUTUACOES_STORE_NAME;
                tituloModal = 'Selecionar Autuações Geradas por este PTA';
                placeholderBusca = 'Buscar por número da Autuação, assunto...';
                tempSelectedIdsModal = [...currentRelatedAutuacaoGeradaIds];
                currentSelectionArrayRef = currentRelatedAutuacaoGeradaIds;
                renderListCallback = () => renderSelectedItemsListPTA(currentRelatedAutuacaoGeradaIds, 'lista-autuacoes-geradas-pta', AUTUACOES_STORE_NAME, 'autuacaoGerada', 'numeroAutuacao');
                displayField = 'numeroAutuacao';
                labelSingular = 'Autuação';
                subInfoCallback = (item) => `(Assunto: ${item.assuntoAutuacao ? item.assuntoAutuacao.substring(0,30) + '...' : 'N/A'})`;
                break;
            default: return;
        }

        const modalId = `modal-selecionar-${tipoEntidade}-pta`;
        const modalContentHtml = `
            <div class="bg-gray-100 dark:bg-slate-700 p-4 rounded-md">
                <input type="search" id="filtro-modal-${tipoEntidade}-pta" class="form-input-text w-full mb-3 text-sm" placeholder="${placeholderBusca}">
                <div id="lista-${tipoEntidade}s-modal-pta"
                     class="overflow-y-auto flex-grow border dark:border-slate-500 rounded-md p-2 min-h-[200px] max-h-[40vh]
                            bg-gray-50 dark:bg-slate-600">
                    <p class="text-sm text-gray-500 dark:text-gray-300">Carregando...</p>
                </div>
            </div>
        `;

        const carregarItensNoModal = async (termoBusca = '') => {
            const listaModalEl = document.getElementById(`lista-${tipoEntidade}s-modal-pta`);
            if (!listaModalEl) return;
            listaModalEl.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-300">Carregando...</p>';
            try {
                let todosItens = await dbRef.getAllItems(storeName);
                
                // CORREÇÃO: Utiliza a função centralizada para filtrar itens ativos.
                let itensAtivos = window.SEFWorkStation.EntityConfig.filterActiveItems(todosItens, storeName);

                if (termoBusca) {
                    const termo = termoBusca.toLowerCase();
                    itensAtivos = itensAtivos.filter(item => {
                        if (tipoEntidade === 'protocoloOriginario') return (item.numeroProtocolo && item.numeroProtocolo.toLowerCase().includes(termo)) || (item.assunto && item.assunto.toLowerCase().includes(termo));
                        if (tipoEntidade === 'documento') return (item.title && item.title.toLowerCase().includes(termo)) || (item.reference && item.reference.toLowerCase().includes(termo));
                        if (tipoEntidade === 'contribuinte') return (item.nome && item.nome.toLowerCase().includes(termo)) || (item.cpfCnpj && item.cpfCnpj.toLowerCase().includes(termo)) || (item.numeroIdentificacao && item.numeroIdentificacao.toLowerCase().includes(termo));
                        if (tipoEntidade === 'tarefa' || tipoEntidade === 'notaRapida') return (item.titulo && item.titulo.toLowerCase().includes(termo)) || (item.conteudo && item.conteudo.toLowerCase().includes(termo));
                        if (tipoEntidade === 'autuacaoGerada') return (item.numeroAutuacao && item.numeroAutuacao.toLowerCase().includes(termo)) || (item.assuntoAutuacao && item.assuntoAutuacao.toLowerCase().includes(termo));
                        return false;
                    });
                }
                itensAtivos.sort((a, b) => ((a[displayField] || a.nome || a.titulo) || "").localeCompare((b[displayField] || b.nome || b.titulo) || ""));

                if (itensAtivos.length === 0) {
                    listaModalEl.innerHTML = `<p class="text-sm text-gray-500 dark:text-gray-300">${termoBusca ? 'Nenhum item encontrado.' : `Nenhum ${labelSingular} disponível.`}</p>`;
                    return;
                }

                let itemsHtml = '<ul class="space-y-2">';
                itensAtivos.forEach(item => {
                    const isChecked = tempSelectedIdsModal.includes(item.id);
                    const displayNameValue = item[displayField] || item.nome || item.titulo || `ID ${item.id.toString().substring(0,8)}`;
                    const finalDisplayName = (tipoEntidade === 'protocoloOriginario' || tipoEntidade === 'autuacaoGerada') ? `${labelSingular} ${displayNameValue}` : displayNameValue;
                    const subInfo = subInfoCallback(item);

                    itemsHtml += `
                        <li class="p-2 rounded hover:bg-gray-200 dark:hover:bg-slate-500">
                            <label class="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" value="${item.id}" class="form-checkbox rounded text-blue-600 modal-${tipoEntidade}-pta-checkbox" ${isChecked ? 'checked' : ''}>
                                <span class="text-sm text-gray-700 dark:text-gray-200">
                                    ${finalDisplayName} <span class="text-xs text-gray-500 dark:text-gray-400 ml-1">${subInfo}</span>
                                </span>
                            </label>
                        </li>`;
                });
                itemsHtml += '</ul>';
                listaModalEl.innerHTML = itemsHtml;

                listaModalEl.querySelectorAll(`.modal-${tipoEntidade}-pta-checkbox`).forEach(cb => {
                    cb.addEventListener('change', (e) => {
                        const itemId = e.target.value;
                        if (e.target.checked) {
                            if (!tempSelectedIdsModal.includes(itemId)) tempSelectedIdsModal.push(itemId);
                        } else {
                            tempSelectedIdsModal = tempSelectedIdsModal.filter(id => id !== itemId);
                        }
                    });
                });
            } catch (error) { console.error(`Erro ao carregar ${labelSingular}s no modal para PTA:`, error); if (listaModalEl) listaModalEl.innerHTML = `<p class="text-sm text-red-500 dark:text-red-400">Erro ao carregar ${labelSingular}s.</p>`; }
        };

        const modalButtons = [
            { text: 'Cancelar', class: 'btn-secondary text-sm', callback: () => uiModuleRef.closeModal() },
            {
                text: 'Confirmar Seleção',
                class: 'btn-primary text-sm',
                callback: () => {
                    const currentIdsArray = currentSelectionArrayRef; 
                    currentIdsArray.length = 0;
                    Array.prototype.push.apply(currentIdsArray, tempSelectedIdsModal);
                    renderListCallback();
                    uiModuleRef.closeModal();
                }
            }
        ];
        uiModuleRef.showModal(tituloModal, modalContentHtml, modalButtons, 'max-w-2xl', modalId);
        const filtroInput = document.getElementById(`filtro-modal-${tipoEntidade}-pta`);
        if (filtroInput) filtroInput.addEventListener('input', () => carregarItensNoModal(filtroInput.value));
        await carregarItensNoModal();
    }


    function addFormEventListenersPTA(feedbackAreaId, originatingView, isEditing) {
        const form = document.getElementById('form-pta');
        const feedbackAreaForm = document.getElementById(feedbackAreaId);
        const hiddenPTAIdInput = document.getElementById('pta-id-hidden');
        const numeroPTAInput = document.getElementById('pta-numero');
        const anexoInput = document.getElementById('pta-anexos-input');
        const anexoPreviewList = document.getElementById('anexos-preview-pta-list');

        document.getElementById('btn-gerenciar-protocolos-vinculados-pta')?.addEventListener('click', () => abrirModalSelecaoPTA('protocoloOriginario'));
        document.getElementById('btn-gerenciar-docs-vinculados-pta')?.addEventListener('click', () => abrirModalSelecaoPTA('documento'));
        document.getElementById('btn-gerenciar-contribs-vinculados-pta')?.addEventListener('click', () => abrirModalSelecaoPTA('contribuinte'));
        document.getElementById('btn-gerenciar-servidores-vinculados-pta')?.addEventListener('click', () => abrirModalSelecaoServidoresParaPTA());
        document.getElementById('btn-gerenciar-tarefas-vinculados-pta')?.addEventListener('click', () => abrirModalSelecaoPTA('tarefa'));
        document.getElementById('btn-gerenciar-notas-vinculadas-pta')?.addEventListener('click', () => abrirModalSelecaoPTA('notaRapida'));
        document.getElementById('btn-gerenciar-autuacoes-geradas-pta')?.addEventListener('click', () => abrirModalSelecaoPTA('autuacaoGerada'));


        if (anexoInput) {
            anexoInput.addEventListener('change', (event) => {
                currentFilesToAttachPTA = Array.from(event.target.files);
                anexoPreviewList.innerHTML = '';
                if (currentFilesToAttachPTA.length > 0) {
                    const ul = document.createElement('ul');
                    ul.className = 'list-disc pl-5 text-sm text-gray-600 dark:text-gray-400';
                    currentFilesToAttachPTA.forEach(file => {
                        const li = document.createElement('li');
                        li.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
                        ul.appendChild(li);
                    });
                    anexoPreviewList.appendChild(ul);
                }
            });
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const btnSalvar = document.getElementById('btn-salvar-pta');
            if (btnSalvar) btnSalvar.disabled = true;
            if (globalClearFeedbackRef) globalClearFeedbackRef(feedbackAreaForm);

            const dataPTAInput = document.getElementById('pta-data');
            const tipoPTAInput = document.getElementById('pta-tipo');
            const assuntoPTAInput = document.getElementById('pta-assunto');

            if (!dataPTAInput.value) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("A 'Data do PTA' é obrigatória.", "error", feedbackAreaForm);
                dataPTAInput.focus(); if(btnSalvar) btnSalvar.disabled = false; return;
            }
             if (!tipoPTAInput.value.trim()) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("O 'Tipo de PTA' é obrigatório.", "error", feedbackAreaForm);
                tipoPTAInput.focus(); if(btnSalvar) btnSalvar.disabled = false; return;
            }
            if (!assuntoPTAInput.value.trim()) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("O 'Assunto/Matéria' é obrigatório.", "error", feedbackAreaForm);
                assuntoPTAInput.focus(); if(btnSalvar) btnSalvar.disabled = false; return;
            }

            let finalPTAId = hiddenPTAIdInput.value || appModuleRef.generateUUID();
            let numeroPTAInformado = numeroPTAInput.value.trim();
            
            if (!isEditing && !numeroPTAInformado) { 
                numeroPTAInformado = await appModuleRef.generatePTANumeroIdentificacao();
            } else if (isEditing) { 
                numeroPTAInformado = document.getElementById('pta-numero-original-hidden').value || (originalPTAData && originalPTAData.numeroPTA ? originalPTAData.numeroPTA : await appModuleRef.generatePTANumeroIdentificacao());
            }

            if (!isEditing || (isEditing && numeroPTAInput.value.trim() && numeroPTAInput.value.trim() !== originalPTAData.numeroPTA)) {
                 try {
                    const todosPTAs = await dbRef.getAllItems(PTAS_STORE_NAME);
                    if (todosPTAs.some(p => p.numeroPTA === numeroPTAInformado && p.id !== finalPTAId)) {
                        if (globalShowFeedbackRef) globalShowFeedbackRef(`O número de PTA "${numeroPTAInformado}" já existe.`, "error", feedbackAreaForm);
                        numeroPTAInput.focus(); if(btnSalvar) btnSalvar.disabled = false;
                        return;
                    }
                } catch (dbError) { 
                     console.error("Erro ao verificar duplicidade de número de PTA:", dbError);
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Erro ao verificar número do PTA. Tente novamente.", "error", feedbackAreaForm);
                    if(btnSalvar) btnSalvar.disabled = false; return;
                 }
            }

            const tipoPTAInformado = tipoPTAInput.value.trim();
            try {
                const tiposExistentes = await dbRef.getAllItems(PTA_TYPES_STORE_NAME);
                if (!tiposExistentes.some(t => t.name.toLowerCase() === tipoPTAInformado.toLowerCase())) {
                    const novoTipo = { id: appModuleRef.generateUUID(), name: tipoPTAInformado };
                    await dbRef.addItem(PTA_TYPES_STORE_NAME, novoTipo);
                    if (globalShowFeedbackRef) globalShowFeedbackRef(`Novo tipo de PTA "${tipoPTAInformado}" cadastrado.`, "info", feedbackAreaForm);
                    if (refreshApplicationStateRef) await refreshApplicationStateRef();
                }
            } catch (e) {
                console.error("PTAForm.JS: Erro ao salvar novo tipo de PTA:", e);
            }

            const primeiroAndamentoTextoInput = document.getElementById('pta-primeiro-andamento');
            const primeiroAndamentoTexto = primeiroAndamentoTextoInput ? primeiroAndamentoTextoInput.value.trim() : "";
            let historicoAndamentoArray = (isEditing && originalPTAData?.historicoAndamentoPTA) ? [...originalPTAData.historicoAndamentoPTA] : [];

            if (!isEditing && primeiroAndamentoTexto) {
                historicoAndamentoArray.unshift({
                    data: new Date().toISOString(),
                    descricao: primeiroAndamentoTexto,
                    responsavel: document.getElementById('pta-responsavel').value.trim() || "Sistema",
                    tipoAndamento: "Registro Inicial"
                });
            }

            const ptaPayload = {
                id: finalPTAId,
                numeroPTA: numeroPTAInformado,
                dataPTA: new Date(dataPTAInput.value + "T00:00:00").toISOString(),
                tipoPTA: tipoPTAInformado,
                assuntoPTA: assuntoPTAInput.value.trim(),
                descricaoDetalhadaPTA: document.getElementById('pta-descricao').value.trim(),
                servidorResponsavelPTA: document.getElementById('pta-responsavel').value.trim(),
                statusPTA: document.getElementById('pta-status').value,
                historicoAndamentoPTA: historicoAndamentoArray,
                anexos: [...existingAttachmentsPTA.map(a=>({...a, ownerId: finalPTAId, ownerType: 'pta' })), 
                         ...currentFilesToAttachPTA.map(f => ({ ownerId: finalPTAId, ownerType: 'pta', fileName: f.name, fileSize: f.size, fileType: f.type, filePath: '' } ))],
                protocolosOriginariosIds: [...currentRelatedProtocoloOriginarioIds],
                documentosVinculadosIds: [...currentRelatedDocIds],
                contribuintesVinculadosIds: [...currentRelatedContribIds],
                tarefasVinculadasIds: [...currentRelatedTarefaIds],
                notasRapidasRelacionadasIds: [...currentRelatedNotaRapidaIds],
                servidoresVinculadosIds: [...currentRelatedServidorIds],
                autuacoesGeradasIds: [...currentRelatedAutuacaoGeradaIds], 
                notasInternasPTA: document.getElementById('pta-notas-internas').value.trim(),
                dataCriacao: document.getElementById('pta-creation-date').value,
                dataModificacao: new Date().toISOString(),
                isDeleted: (isEditing && originalPTAData) ? (originalPTAData.isDeleted || false) : false
            };

            if (currentFilesToAttachPTA.length > 0 && window.SEFWorkStation.SharedUtils && typeof window.SEFWorkStation.SharedUtils.getOrCreateAttachmentDirHandle === 'function') {
                const dirHandle = await window.SEFWorkStation.SharedUtils.getOrCreateAttachmentDirHandle('processos/ptas', finalPTAId);
                if (dirHandle) {
                    let anexoPayloadIndexBase = existingAttachmentsPTA.length;
                    for (let i = 0; i < currentFilesToAttachPTA.length; i++) {
                        const file = currentFilesToAttachPTA[i];
                        const anexoPayloadIndex = anexoPayloadIndexBase + i;
                        const newFileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
                        const fileHandle = await dirHandle.getFileHandle(newFileName, { create: true });
                        const writable = await fileHandle.createWritable();
                        await writable.write(file);
                        await writable.close();
                         if (ptaPayload.anexos[anexoPayloadIndex]) {
                            ptaPayload.anexos[anexoPayloadIndex].filePath = `processos/ptas/${finalPTAId}/${newFileName}`;
                        }
                    }
                } else { throw new Error("Não foi possível acessar a pasta de anexos para PTAs."); }
            }

            try {
                const idsAnterioresProtocolos = originalPTAData?.protocolosOriginariosIds || [];
                const idsAnterioresDocs = originalPTAData?.documentosVinculadosIds || [];
                const idsAnterioresContribs = originalPTAData?.contribuintesVinculadosIds || [];
                const idsAnterioresTarefas = originalPTAData?.tarefasVinculadasIds || [];
                const idsAnterioresNotas = originalPTAData?.notasRapidasRelacionadasIds || [];
                const idsAnterioresServidores = originalPTAData?.servidoresVinculadosIds || [];
                const idsAnterioresAutuacoesGeradas = originalPTAData?.autuacoesGeradasIds || []; 

                if (isEditing) {
                    await dbRef.updateItem(PTAS_STORE_NAME, ptaPayload);
                    if (globalShowFeedbackRef) globalShowFeedbackRef("PTA atualizado com sucesso!", "success", feedbackAreaForm);
                } else {
                    await dbRef.addItem(PTAS_STORE_NAME, ptaPayload);
                    if (globalShowFeedbackRef) globalShowFeedbackRef("PTA salvo com sucesso!", "success", feedbackAreaForm);
                }

                if (window.SEFWorkStation.SharedUtils && typeof window.SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais === 'function') {
                    await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(finalPTAId, PROTOCOLOS_STORE_NAME, 'ptasGeradosIds', currentRelatedProtocoloOriginarioIds, idsAnterioresProtocolos, dbRef);
                    await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(finalPTAId, DOCUMENTS_STORE_NAME, 'ptasVinculadosIds', currentRelatedDocIds, idsAnterioresDocs, dbRef);
                    await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(finalPTAId, CONTRIBUINTES_STORE_NAME, 'ptasRelacionadosIds', currentRelatedContribIds, idsAnterioresContribs, dbRef);
                    await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(finalPTAId, TAREFAS_STORE_NAME, 'ptasVinculadosIds', currentRelatedTarefaIds, idsAnterioresTarefas, dbRef);
                    await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(finalPTAId, NOTAS_RAPIDAS_STORE_NAME, 'ptasRelacionadosIds', currentRelatedNotaRapidaIds, idsAnterioresNotas, dbRef);
                    await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(finalPTAId, SERVIDORES_STORE_NAME, 'ptasVinculadosIds', currentRelatedServidorIds, idsAnterioresServidores, dbRef);
                    await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(finalPTAId, AUTUACOES_STORE_NAME, 'ptasOriginariosIds', currentRelatedAutuacaoGeradaIds, idsAnterioresAutuacoesGeradas, dbRef);
                }

                if (refreshApplicationStateRef) await refreshApplicationStateRef();

                if (navigateAfterSaveOrCancelCallback) {
                    if (ptasViewModuleRef && typeof ptasViewModuleRef.renderVisualizarPTAPage === 'function') {
                        navigateAfterSaveOrCancelCallback('visualizar-pta', { ptaId: finalPTAId, originatingView: originatingView });
                    } else {
                        navigateAfterSaveOrCancelCallback('gerir-ptas');
                    }
                }

            } catch (error) {
                console.error("PTAForm.JS: Erro ao salvar PTA no DB:", error);
                if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao salvar PTA: ${error.message}`, "error", feedbackAreaForm);
            } finally {
                if (btnSalvar) btnSalvar.disabled = false;
            }
        });

        document.getElementById('btn-cancelar-pta').addEventListener('click', () => {
             if (appModuleRef && appModuleRef.navigateBack) {
                appModuleRef.navigateBack();
            } else {
                if (navigateAfterSaveOrCancelCallback) {
                    if (isEditing && currentPTAId && ptasViewModuleRef && typeof ptasViewModuleRef.renderVisualizarPTAPage === 'function') {
                         if (appModuleRef && appModuleRef.handleMenuAction) {
                             appModuleRef.handleMenuAction('visualizar-pta', { ptaId: currentPTAId, originatingView: originatingView });
                         } else {
                             navigateAfterSaveOrCancelCallback(originatingView || 'gerir-ptas');
                         }
                    } else {
                        navigateAfterSaveOrCancelCallback(originatingView || 'gerir-ptas');
                    }
                }
            }
        });
    }

    return {
        init,
        renderFormularioPTA
    };
})();