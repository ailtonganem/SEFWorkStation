// js/protocolosForm.js - Lógica para Formulários de Protocolos
// v1.2.0 - CORREÇÃO: Adiciona as funções auxiliares que estavam faltando (render attachments, render related items, abrir modal) e aplica o filtro de versionamento (EntityConfig.filterActiveItems) para garantir que apenas itens ativos sejam listados.
// v1.1.0 - REFATORADO: Adiciona a lógica de modal para seleção de vínculos e aplica o filtro de versionamento.
// v1.0.1 - Remove classe page-section para expandir a largura da visualização.
// ... (histórico anterior)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.ProtocolosForm = (function() {
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let navigateAfterSaveOrCancelCallback;
    let refreshApplicationStateRef;
    let dbRef;
    let appModuleRef;
    let uiModuleRef;
    let protocolosViewModuleRef;

    const PROTOCOLOS_STORE_NAME = 'protocolosStore';
    const PROTOCOL_TYPES_STORE_NAME = 'protocolTypesStore';
    const DOCUMENTS_STORE_NAME = 'documents';
    const CONTRIBUINTES_STORE_NAME = 'contribuintes';
    const TAREFAS_STORE_NAME = 'tarefasStore';
    const NOTAS_RAPIDAS_STORE_NAME = 'notasRapidasStore';
    const SERVIDORES_STORE_NAME = 'servidoresStore';
    const PTAS_STORE_NAME = 'ptasStore';
    const AUTUACOES_STORE_NAME = 'autuacoesStore';


    let currentProtocoloId = null;
    let originalProtocoloData = null;

    let currentFilesToAttachProtocolo = [];
    let existingAttachmentsProtocolo = [];

    let currentRelatedDocIds = [];
    let currentRelatedContribIds = [];
    let currentRelatedTarefaIds = [];
    let currentRelatedNotaRapidaIds = [];
    let currentRelatedServidorIds = [];
    let currentRelatedPTAIds = [];
    let currentRelatedAutuacaoIds = [];
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
        pViewModule
    ) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedbackFunc;
        globalClearFeedbackRef = clearFeedbackFunc;
        navigateAfterSaveOrCancelCallback = navigateCb;
        refreshApplicationStateRef = refreshFunc;
        dbRef = dbModuleRef;
        appModuleRef = applicationModuleRef;
        uiModuleRef = uiRefModule;
        protocolosViewModuleRef = pViewModule;

        if (!dbRef) console.error("ProtocolosForm.JS: init - Referência ao DB não fornecida!");
        if (!uiModuleRef) console.warn("ProtocolosForm.JS: init - Módulo UI não disponível, modais podem não funcionar.");
        if (!appModuleRef) console.error("ProtocolosForm.JS: init - appModuleRef não fornecido.");
        console.log("ProtocolosForm.JS: Módulo inicializado (v1.2.0).");
    }

    async function renderFormularioProtocolo(protocoloData = null, originatingView = 'gerir-protocolos', preSelectedLink = null) {
        if (globalClearFeedbackRef) globalClearFeedbackRef();
        
        const isEditing = protocoloData && protocoloData.id;
        currentProtocoloId = isEditing ? protocoloData.id : null;
        originalProtocoloData = isEditing ? JSON.parse(JSON.stringify(protocoloData)) : null;

        currentFilesToAttachProtocolo = [];
        existingAttachmentsProtocolo = (isEditing && Array.isArray(protocoloData.anexos)) ? [...protocoloData.anexos] : [];

        currentRelatedDocIds = (isEditing && Array.isArray(protocoloData.documentosVinculadosIds)) ? [...protocoloData.documentosVinculadosIds] : (preSelectedLink?.type === 'documento' ? [preSelectedLink.id] : []);
        currentRelatedContribIds = (isEditing && Array.isArray(protocoloData.contribuintesVinculadosIds)) ? [...protocoloData.contribuintesVinculadosIds] : (preSelectedLink?.type === 'contribuinte' ? [preSelectedLink.id] : []);
        currentRelatedTarefaIds = (isEditing && Array.isArray(protocoloData.tarefasVinculadasIds)) ? [...protocoloData.tarefasVinculadasIds] : (preSelectedLink?.type === 'tarefa' ? [preSelectedLink.id] : []);
        currentRelatedNotaRapidaIds = (isEditing && Array.isArray(protocoloData.notasRapidasRelacionadasIds)) ? [...protocoloData.notasRapidasRelacionadasIds] : (preSelectedLink?.type === 'notaRapida' ? [preSelectedLink.id] : []);
        currentRelatedServidorIds = (isEditing && Array.isArray(protocoloData.servidoresVinculadosIds)) ? [...protocoloData.servidoresVinculadosIds] : (preSelectedLink?.type === 'servidor' ? [preSelectedLink.id] : []);
        
        currentRelatedPTAIds = (isEditing && Array.isArray(protocoloData.ptasGeradosIds)) ? [...protocoloData.ptasGeradosIds] : [];
        currentRelatedAutuacaoIds = (isEditing && Array.isArray(protocoloData.autuacoesGeradasIds)) ? [...protocoloData.autuacoesGeradasIds] : [];


        const formTitle = isEditing ? "Editar Protocolo" : "Cadastrar Novo Protocolo";
        const numeroProtocoloDisplay = isEditing && protocoloData.numeroProtocolo ? protocoloData.numeroProtocolo : (isEditing ? 'N/A' : 'A ser informado');
        const feedbackAreaId = `feedback-form-protocolo-${currentProtocoloId || 'novo'}`;

        let tiposDeProtocoloExistentes = [];
        try {
            tiposDeProtocoloExistentes = await dbRef.getAllItems(PROTOCOL_TYPES_STORE_NAME);
            tiposDeProtocoloExistentes.sort((a, b) => a.name.localeCompare(b.name));
        } catch (e) {
            console.warn("ProtocolosForm.JS: Não foi possível carregar tipos de protocolo existentes.", e);
        }
        const datalistOptionsHtml = tiposDeProtocoloExistentes.map(tipo => `<option value="${tipo.name.replace(/"/g, '"')}">`).join('');

        const formHtml = `
            <div class="form-section"> 
                <h2 class="text-xl font-semibold mb-2">${formTitle}</h2>
                ${isEditing ? `<p class="text-sm text-gray-500 dark:text-gray-400 mb-6">Número do Protocolo: ${numeroProtocoloDisplay}</p>` : ''}
                <div id="${feedbackAreaId}" class="mb-4"></div>

                <form id="form-protocolo">
                    <input type="hidden" id="protocolo-id-hidden" value="${currentProtocoloId || ''}">
                    <input type="hidden" id="protocolo-creation-date" value="${(isEditing && protocoloData?.dataCriacao) ? protocoloData.dataCriacao : new Date().toISOString()}">
                    <input type="hidden" id="protocolo-numero-original-hidden" value="${(isEditing && protocoloData?.numeroProtocolo) ? protocoloData.numeroProtocolo.replace(/"/g, '"') : ''}">

                    <div class="mb-4">
                        <label for="protocolo-numero" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Número do Protocolo (Manual): <span class="text-red-500">*</span></label>
                        <input type="text" id="protocolo-numero" name="numeroProtocolo" class="form-input-text mt-1 block w-full" required
                               value="${(isEditing && protocoloData?.numeroProtocolo) ? protocoloData.numeroProtocolo.replace(/"/g, '"') : ''}"
                               ${isEditing ? 'disabled' : ''}>
                        ${isEditing ? '<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">O número do protocolo não pode ser alterado após o cadastro.</p>' : ''}
                    </div>

                    <div class="form-grid">
                        <div>
                            <label for="protocolo-data" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Data do Protocolo: <span class="text-red-500">*</span></label>
                            <input type="datetime-local" id="protocolo-data" name="dataHoraProtocolo" class="form-input-text mt-1 block w-full" required value="${(protocoloData?.dataHoraProtocolo) ? protocoloData.dataHoraProtocolo.substring(0,16) : new Date().toISOString().substring(0,16)}">
                        </div>
                        <div>
                            <label for="protocolo-tipo" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de Protocolo: <span class="text-red-500">*</span></label>
                            <input type="text" list="tipos-protocolo-datalist" id="protocolo-tipo" name="tipoProtocolo" class="form-input-text mt-1 block w-full" required value="${(protocoloData?.tipoProtocolo) ? protocoloData.tipoProtocolo.replace(/"/g, '"') : ''}">
                            <datalist id="tipos-protocolo-datalist">
                                ${datalistOptionsHtml}
                            </datalist>
                        </div>
                    </div>

                    <div class="mb-4">
                        <label for="protocolo-assunto" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Assunto: <span class="text-red-500">*</span></label>
                        <input type="text" id="protocolo-assunto" name="assunto" class="form-input-text mt-1 block w-full" required value="${(protocoloData?.assunto) ? protocoloData.assunto.replace(/"/g, '"') : ''}">
                    </div>

                    <div class="mb-4">
                        <label for="protocolo-descricao" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição Detalhada:</label>
                        <textarea id="protocolo-descricao" name="descricaoDetalhada" rows="4" class="form-input-text mt-1 block w-full">${(protocoloData?.descricaoDetalhada) || ''}</textarea>
                    </div>

                     <div class="form-grid mt-4">
                        <div>
                            <label for="protocolo-responsavel" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Servidor Responsável:</label>
                            <input type="text" id="protocolo-responsavel" name="servidorResponsavel" class="form-input-text mt-1 block w-full" value="${(protocoloData?.servidorResponsavel) ? protocoloData.servidorResponsavel.replace(/"/g, '"') : ''}" placeholder="Matrícula ou Nome do servidor">
                        </div>
                        <div>
                            <label for="protocolo-status" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Status do Protocolo:</label>
                            <select id="protocolo-status" name="statusProtocolo" class="form-input-text mt-1 block w-full">
                                <option value="Recebido" ${protocoloData?.statusProtocolo === 'Recebido' || !isEditing ? 'selected' : ''}>Recebido</option>
                                <option value="Enviado" ${protocoloData?.statusProtocolo === 'Enviado' ? 'selected' : ''}>Enviado</option>
                                <option value="Em Análise" ${protocoloData?.statusProtocolo === 'Em Análise' ? 'selected' : ''}>Em Análise</option>
                                <option value="Respondido" ${protocoloData?.statusProtocolo === 'Respondido' ? 'selected' : ''}>Respondido</option>
                                <option value="Arquivado" ${protocoloData?.statusProtocolo === 'Arquivado' ? 'selected' : ''}>Arquivado</option>
                                <option value="Cancelado" ${protocoloData?.statusProtocolo === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
                            </select>
                        </div>
                    </div>

                    ${!isEditing ? `
                    <div class="mb-4 mt-4">
                        <label for="protocolo-primeiro-andamento" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Primeiro Andamento/Encaminhamento:</label>
                        <textarea id="protocolo-primeiro-andamento" name="primeiroAndamento" rows="3" class="form-input-text mt-1 block w-full" placeholder="Registre o primeiro andamento ou encaminhamento aqui. Outros podem ser adicionados na visualização."></textarea>
                    </div>` : '<p class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">Para adicionar novos andamentos, utilize a tela de visualização do protocolo.</p>'}

                    <h3 class="text-md font-semibold my-4 pt-2 border-t dark:border-slate-600">Vínculos</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Documentos Vinculados:</label>
                            <div id="lista-docs-vinculados-protocolo" class="form-vinculos-lista"></div>
                            <button type="button" id="btn-gerenciar-docs-vinculados-protocolo" class="btn-secondary btn-sm text-xs">Gerenciar Vínculos</button>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Contribuintes Vinculados:</label>
                            <div id="lista-contribs-vinculados-protocolo" class="form-vinculos-lista"></div>
                            <button type="button" id="btn-gerenciar-contribs-vinculados-protocolo" class="btn-secondary btn-sm text-xs">Gerenciar Vínculos</button>
                        </div>
                         <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Servidores Vinculados:</label>
                            <div id="lista-servidores-vinculados-protocolo" class="form-vinculos-lista"></div>
                            <button type="button" id="btn-gerenciar-servidores-vinculados-protocolo" class="btn-secondary btn-sm text-xs">Gerenciar Vínculos</button>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Tarefas Vinculadas:</label>
                            <div id="lista-tarefas-vinculadas-protocolo" class="form-vinculos-lista"></div>
                            <button type="button" id="btn-gerenciar-tarefas-vinculadas-protocolo" class="btn-secondary btn-sm text-xs">Gerenciar Vínculos</button>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Notas Rápidas Vinculadas:</label>
                            <div id="lista-notas-vinculadas-protocolo" class="form-vinculos-lista"></div>
                            <button type="button" id="btn-gerenciar-notas-vinculadas-protocolo" class="btn-secondary btn-sm text-xs">Gerenciar Vínculos</button>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">PTAs Gerados:</label>
                            <div id="lista-ptas-gerados-protocolo" class="form-vinculos-lista"></div>
                            <button type="button" id="btn-gerenciar-ptas-gerados-protocolo" class="btn-secondary btn-sm text-xs">Gerenciar Vínculos</button>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Autuações Geradas:</label>
                            <div id="lista-autuacoes-geradas-protocolo" class="form-vinculos-lista"></div>
                            <button type="button" id="btn-gerenciar-autuacoes-geradas-protocolo" class="btn-secondary btn-sm text-xs">Gerenciar Vínculos</button>
                        </div>
                    </div>

                    <div class="mb-6">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Anexos:</label>
                        <div id="anexos-existentes-protocolo-list" class="mb-2"></div>
                        <input type="file" id="protocolo-anexos-input" name="anexos" class="form-input-file mt-1 block w-full" multiple>
                        <div id="anexos-preview-protocolo-list" class="mt-2"></div>
                    </div>

                    <div class="mb-4">
                        <label for="protocolo-notas-internas" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Notas Internas:</label>
                        <textarea id="protocolo-notas-internas" name="notasInternasProtocolo" rows="3" class="form-input-text mt-1 block w-full">${(protocoloData?.notasInternasProtocolo) || ''}</textarea>
                    </div>

                    <div class="form-actions">
                        <button type="button" id="btn-cancelar-protocolo" class="btn-secondary">Cancelar</button>
                        <button type="submit" id="btn-salvar-protocolo" class="btn-primary">${isEditing ? 'Atualizar Protocolo' : 'Salvar Protocolo'}</button>
                    </div>
                </form>
            </div>
        `;
        mainContentWrapperRef.innerHTML = formHtml;

        renderExistingAttachmentsProtocolo();
        await renderSelectedRelatedItemsProtocolo(); 
        await renderSelectedServidoresNoFormProtocolo();

        addFormEventListenersProtocolo(feedbackAreaId, originatingView, isEditing);
    }

    function renderExistingAttachmentsProtocolo() {
        const listContainer = document.getElementById('anexos-existentes-protocolo-list');
        if (!listContainer) return;

        listContainer.innerHTML = '';
        if (existingAttachmentsProtocolo.length > 0) {
            const ul = document.createElement('ul');
            ul.className = 'list-none p-0 mb-2';
            existingAttachmentsProtocolo.forEach((anexo, index) => {
                const li = document.createElement('li');
                li.className = 'anexo-preview-item flex justify-between items-center text-sm p-2 bg-gray-100 dark:bg-slate-600 rounded mb-1';
                li.innerHTML = `
                    <span>${anexo.fileName.replace(/"/g, '"')} (${(anexo.fileSize / 1024).toFixed(1)} KB)</span>
                    <button type="button" data-index="${index}" class="btn-remove-anexo-preview-protocolo text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300" title="Remover anexo existente">
                        ×
                    </button>
                `;
                ul.appendChild(li);
            });
            listContainer.appendChild(ul);

            listContainer.querySelectorAll('.btn-remove-anexo-preview-protocolo').forEach(button => {
                button.addEventListener('click', (event) => {
                    const indexToRemove = parseInt(event.currentTarget.dataset.index);
                    existingAttachmentsProtocolo.splice(indexToRemove, 1);
                    renderExistingAttachmentsProtocolo();
                });
            });
        }
    }

    async function renderSelectedServidoresNoFormProtocolo() {
        const container = document.getElementById('lista-servidores-vinculados-protocolo');
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
                                <button type="button" data-id="${servidorId}" class="btn-remove-related-servidor-protocolo text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm leading-none p-0.5" title="Remover vínculo com este servidor">×</button>`;
                li.querySelector('.btn-remove-related-servidor-protocolo').addEventListener('click', (e) => {
                    const idToRemove = e.currentTarget.dataset.id;
                    currentRelatedServidorIds = currentRelatedServidorIds.filter(id => id.toString() !== idToRemove.toString());
                    renderSelectedServidoresNoFormProtocolo();
                });
                ul.appendChild(li);
            } catch (error) {
                console.warn(`Erro ao renderizar servidor vinculado ID ${servidorId} para protocolo:`, error);
            }
        }
        container.appendChild(ul);
    }

    async function abrirModalSelecaoServidoresParaProtocolo() {
        if (!uiModuleRef || !uiModuleRef.showModal) {
            if(globalShowFeedbackRef) globalShowFeedbackRef("Erro: Funcionalidade de modal não está disponível.", "error", document.getElementById(`feedback-form-protocolo-${currentProtocoloId || 'novo'}`));
            return;
        }
        const modalId = `modal-selecionar-servidores-protocolo-${currentProtocoloId || Date.now()}`;
        tempSelectedIdsModal = [...currentRelatedServidorIds]; 

        const modalContentHtml = `
            <div class="bg-gray-100 dark:bg-slate-700 p-3 rounded-md">
                <input type="search" id="filtro-modal-servidores-protocolo" class="form-input-text w-full mb-3 text-sm" placeholder="Buscar por nome, matrícula, e-mail...">
                <div id="lista-servidores-modal-protocolo" class="overflow-y-auto flex-grow border dark:border-slate-500 rounded-md p-2 min-h-[200px] max-h-[50vh] bg-white dark:bg-slate-600">
                    <p class="text-sm text-gray-500 dark:text-gray-300">Carregando servidores...</p>
                </div>
            </div>
        `;

        const carregarServidoresNoModal = async (termoBusca = '') => {
            const listaModalEl = document.getElementById(`lista-servidores-modal-protocolo`);
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
                                <input type="checkbox" value="${servidor.id}" class="form-checkbox rounded text-blue-600 modal-servidor-protocolo-checkbox h-4 w-4" ${isChecked ? 'checked' : ''}>
                                <span class="text-sm text-gray-700 dark:text-gray-200">
                                    ${servidor.nome} <span class="text-xs text-gray-500 dark:text-gray-400">(${servidor.matricula || 'S/Matr.'} - ${servidor.localExercicio || 'S/Local'})</span>
                                </span>
                            </label>
                        </li>`;
                });
                itemsHtml += '</ul>';
                listaModalEl.innerHTML = itemsHtml;

                listaModalEl.querySelectorAll('.modal-servidor-protocolo-checkbox').forEach(cb => {
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
                    await renderSelectedServidoresNoFormProtocolo();
                    uiModuleRef.closeModal();
                }
            }
        ];
        uiModuleRef.showModal('Selecionar Servidores Vinculados ao Protocolo', modalContentHtml, modalButtons, 'max-w-xl', modalId);
        const filtroInput = document.getElementById(`filtro-modal-servidores-protocolo`);
        if (filtroInput) filtroInput.addEventListener('input', () => carregarServidoresNoModal(filtroInput.value));
        await carregarServidoresNoModal();
    }

    async function renderSelectedRelatedItemsProtocolo() {
        await renderSelectedItemsListProtocolo(currentRelatedDocIds, 'lista-docs-vinculados-protocolo', DOCUMENTS_STORE_NAME, 'documento', 'title');
        await renderSelectedItemsListProtocolo(currentRelatedContribIds, 'lista-contribs-vinculados-protocolo', CONTRIBUINTES_STORE_NAME, 'contribuinte', 'nome');
        await renderSelectedItemsListProtocolo(currentRelatedTarefaIds, 'lista-tarefas-vinculadas-protocolo', TAREFAS_STORE_NAME, 'tarefa', 'titulo');
        await renderSelectedItemsListProtocolo(currentRelatedNotaRapidaIds, 'lista-notas-vinculadas-protocolo', NOTAS_RAPIDAS_STORE_NAME, 'notaRapida', 'titulo');
        await renderSelectedItemsListProtocolo(currentRelatedPTAIds, 'lista-ptas-gerados-protocolo', PTAS_STORE_NAME, 'ptaGerado', 'numeroPTA');
        await renderSelectedItemsListProtocolo(currentRelatedAutuacaoIds, 'lista-autuacoes-geradas-protocolo', AUTUACOES_STORE_NAME, 'autuacaoGerada', 'numeroAutuacao');
    }

    async function renderSelectedItemsListProtocolo(ids, containerId, storeName, tipoEntidade, displayField = 'title') {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`Container ${containerId} não encontrado para tipo ${tipoEntidade}`);
            return;
        }

        container.innerHTML = '';
        let labelSingular = tipoEntidade.toLowerCase();
        if (tipoEntidade === 'notaRapida') labelSingular = 'nota rápida';
        else if (tipoEntidade === 'ptaGerado') labelSingular = 'PTA Gerado';
        else if (tipoEntidade === 'autuacaoGerada') labelSingular = 'Autuação Gerada';


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
                    if ((tipoEntidade === 'ptaGerado' || tipoEntidade === 'autuacaoGerada') && item[displayField]) {
                        displayName = `${labelSingular.split(' ')[0]} ${item[displayField]}`;
                    }
                }

                li.innerHTML = `
                    <span class="truncate text-gray-700 dark:text-gray-200" title="${displayName.replace(/"/g, '"')}">${displayName}</span>
                    <button type="button" data-id="${id}" data-type="${tipoEntidade}" class="btn-remove-related-item-protocolo text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm leading-none p-0.5" title="Remover vínculo">×</button>
                `;
                li.querySelector('.btn-remove-related-item-protocolo').addEventListener('click', (e) => {
                    const idToRemove = e.currentTarget.dataset.id;
                    const typeToRemove = e.currentTarget.dataset.type;
                    if (typeToRemove === 'documento') currentRelatedDocIds = currentRelatedDocIds.filter(i => i.toString() !== idToRemove.toString());
                    else if (typeToRemove === 'contribuinte') currentRelatedContribIds = currentRelatedContribIds.filter(i => i.toString() !== idToRemove.toString());
                    else if (typeToRemove === 'tarefa') currentRelatedTarefaIds = currentRelatedTarefaIds.filter(i => i.toString() !== idToRemove.toString());
                    else if (typeToRemove === 'notaRapida') currentRelatedNotaRapidaIds = currentRelatedNotaRapidaIds.filter(i => i.toString() !== idToRemove.toString());
                    else if (typeToRemove === 'ptaGerado') currentRelatedPTAIds = currentRelatedPTAIds.filter(i => i.toString() !== idToRemove.toString());
                    else if (typeToRemove === 'autuacaoGerada') currentRelatedAutuacaoIds = currentRelatedAutuacaoIds.filter(i => i.toString() !== idToRemove.toString());
                    renderSelectedRelatedItemsProtocolo();
                });
                ul.appendChild(li);
            } catch (error) {
                console.warn(`Erro ao renderizar item relacionado ${tipoEntidade} ID ${id} para protocolo:`, error);
            }
        }
        container.appendChild(ul);
    }
    
    // CORREÇÃO: Função completa `abrirModalSelecaoProtocolo`
    async function abrirModalSelecaoProtocolo(tipoEntidade) {
        if (!uiModuleRef || !uiModuleRef.showModal) {
            globalShowFeedbackRef("Erro: Funcionalidade de modal não está disponível.", "error", document.getElementById(`feedback-form-protocolo-${currentProtocoloId || 'novo'}`));
            return;
        }

        let storeName, tituloModal, placeholderBusca, currentSelectionArrayRef, renderListCallback, displayField, subInfoCallback;
        let labelSingular = tipoEntidade.toLowerCase();

        switch (tipoEntidade) {
            case 'documento':
                storeName = DOCUMENTS_STORE_NAME;
                tituloModal = 'Selecionar Documentos para Vincular ao Protocolo';
                placeholderBusca = 'Buscar por título, tipo, referência...';
                tempSelectedIdsModal = [...currentRelatedDocIds];
                currentSelectionArrayRef = currentRelatedDocIds; 
                renderListCallback = () => renderSelectedItemsListProtocolo(currentRelatedDocIds, 'lista-docs-vinculados-protocolo', DOCUMENTS_STORE_NAME, 'documento', 'title');
                displayField = 'title';
                subInfoCallback = (item) => `(${item.docType || 'N/D'} - Ref: ${item.reference || 'N/A'})`;
                break;
            case 'contribuinte':
                storeName = CONTRIBUINTES_STORE_NAME;
                tituloModal = 'Selecionar Contribuintes para Vincular ao Protocolo';
                placeholderBusca = 'Buscar por nome, CPF/CNPJ, ID interno...';
                tempSelectedIdsModal = [...currentRelatedContribIds];
                currentSelectionArrayRef = currentRelatedContribIds;
                renderListCallback = () => renderSelectedItemsListProtocolo(currentRelatedContribIds, 'lista-contribs-vinculados-protocolo', CONTRIBUINTES_STORE_NAME, 'contribuinte', 'nome');
                displayField = 'nome';
                subInfoCallback = (item) => `(${item.numeroIdentificacao || item.cpfCnpj || 'N/A'})`;
                break;
            case 'tarefa':
                storeName = TAREFAS_STORE_NAME;
                tituloModal = 'Selecionar Tarefas para Vincular ao Protocolo';
                placeholderBusca = 'Buscar por título, ID, status...';
                tempSelectedIdsModal = [...currentRelatedTarefaIds];
                currentSelectionArrayRef = currentRelatedTarefaIds;
                renderListCallback = () => renderSelectedItemsListProtocolo(currentRelatedTarefaIds, 'lista-tarefas-vinculadas-protocolo', TAREFAS_STORE_NAME, 'tarefa', 'titulo');
                displayField = 'titulo';
                subInfoCallback = (item) => `(Status: ${item.status || 'N/D'}, Prazo: ${item.dataVencimento ? new Date(item.dataVencimento+'T00:00:00').toLocaleDateString() : 'N/A'})`;
                break;
            case 'notaRapida':
                storeName = NOTAS_RAPIDAS_STORE_NAME;
                tituloModal = 'Selecionar Notas Rápidas para Vincular ao Protocolo';
                placeholderBusca = 'Buscar por título, conteúdo...';
                tempSelectedIdsModal = [...currentRelatedNotaRapidaIds];
                currentSelectionArrayRef = currentRelatedNotaRapidaIds;
                renderListCallback = () => renderSelectedItemsListProtocolo(currentRelatedNotaRapidaIds, 'lista-notas-vinculadas-protocolo', NOTAS_RAPIDAS_STORE_NAME, 'notaRapida', 'titulo');
                displayField = 'titulo';
                subInfoCallback = (item) => `(Modif.: ${new Date(item.dataModificacao).toLocaleDateString()})`;
                break;
            case 'ptaGerado':
                storeName = PTAS_STORE_NAME;
                tituloModal = 'Selecionar PTAs Gerados por este Protocolo';
                placeholderBusca = 'Buscar por número do PTA, assunto...';
                tempSelectedIdsModal = [...currentRelatedPTAIds];
                currentSelectionArrayRef = currentRelatedPTAIds;
                renderListCallback = () => renderSelectedItemsListProtocolo(currentRelatedPTAIds, 'lista-ptas-gerados-protocolo', PTAS_STORE_NAME, 'ptaGerado', 'numeroPTA');
                displayField = 'numeroPTA';
                labelSingular = 'PTA';
                subInfoCallback = (item) => `(Assunto: ${item.assuntoPTA ? item.assuntoPTA.substring(0,30) + '...' : 'N/A'})`;
                break;
            case 'autuacaoGerada':
                storeName = AUTUACOES_STORE_NAME;
                tituloModal = 'Selecionar Autuações Geradas por este Protocolo';
                placeholderBusca = 'Buscar por número da Autuação, assunto...';
                tempSelectedIdsModal = [...currentRelatedAutuacaoIds];
                currentSelectionArrayRef = currentRelatedAutuacaoIds;
                renderListCallback = () => renderSelectedItemsListProtocolo(currentRelatedAutuacaoIds, 'lista-autuacoes-geradas-protocolo', AUTUACOES_STORE_NAME, 'autuacaoGerada', 'numeroAutuacao');
                displayField = 'numeroAutuacao';
                labelSingular = 'Autuação';
                subInfoCallback = (item) => `(Assunto: ${item.assuntoAutuacao ? item.assuntoAutuacao.substring(0,30) + '...' : 'N/A'})`;
                break;
            default: return;
        }

        const modalId = `modal-selecionar-${tipoEntidade}-protocolo`;
        const modalContentHtml = `
            <div class="bg-gray-100 dark:bg-slate-700 p-4 rounded-md">
                <input type="search" id="filtro-modal-${tipoEntidade}-protocolo" class="form-input-text w-full mb-3 text-sm" placeholder="${placeholderBusca}">
                <div id="lista-${tipoEntidade}s-modal-protocolo"
                     class="overflow-y-auto flex-grow border dark:border-slate-500 rounded-md p-2 min-h-[200px] max-h-[40vh]
                            bg-gray-50 dark:bg-slate-600">
                    <p class="text-sm text-gray-500 dark:text-gray-300">Carregando...</p>
                </div>
            </div>
        `;

        const carregarItensNoModal = async (termoBusca = '') => {
            const listaModalEl = document.getElementById(`lista-${tipoEntidade}s-modal-protocolo`);
            if (!listaModalEl) return;
            listaModalEl.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-300">Carregando...</p>';
            try {
                let todosItens = await dbRef.getAllItems(storeName);
                let itensAtivos = window.SEFWorkStation.EntityConfig.filterActiveItems(todosItens, storeName);

                if (termoBusca) {
                    const termo = termoBusca.toLowerCase();
                    itensAtivos = itensAtivos.filter(item => {
                        if (tipoEntidade === 'documento') return (item.title && item.title.toLowerCase().includes(termo)) || (item.reference && item.reference.toLowerCase().includes(termo));
                        if (tipoEntidade === 'contribuinte') return (item.nome && item.nome.toLowerCase().includes(termo)) || (item.cpfCnpj && item.cpfCnpj.toLowerCase().includes(termo)) || (item.numeroIdentificacao && item.numeroIdentificacao.toLowerCase().includes(termo));
                        if (tipoEntidade === 'tarefa' || tipoEntidade === 'notaRapida') return (item.titulo && item.titulo.toLowerCase().includes(termo)) || (item.conteudo && item.conteudo.toLowerCase().includes(termo));
                        if (tipoEntidade === 'ptaGerado') return (item.numeroPTA && item.numeroPTA.toLowerCase().includes(termo)) || (item.assuntoPTA && item.assuntoPTA.toLowerCase().includes(termo));
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
                    const finalDisplayName = (tipoEntidade === 'ptaGerado' || tipoEntidade === 'autuacaoGerada') ? `${labelSingular} ${displayNameValue}` : displayNameValue;
                    const subInfo = subInfoCallback(item);

                    itemsHtml += `
                        <li class="p-2 rounded hover:bg-gray-200 dark:hover:bg-slate-500">
                            <label class="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" value="${item.id}" class="form-checkbox rounded text-blue-600 modal-${tipoEntidade}-protocolo-checkbox" ${isChecked ? 'checked' : ''}>
                                <span class="text-sm text-gray-700 dark:text-gray-200">
                                    ${finalDisplayName} <span class="text-xs text-gray-500 dark:text-gray-400 ml-1">${subInfo}</span>
                                </span>
                            </label>
                        </li>`;
                });
                itemsHtml += '</ul>';
                listaModalEl.innerHTML = itemsHtml;

                listaModalEl.querySelectorAll(`.modal-${tipoEntidade}-protocolo-checkbox`).forEach(cb => {
                    cb.addEventListener('change', (e) => {
                        const itemId = e.target.value;
                        if (e.target.checked) {
                            if (!tempSelectedIdsModal.includes(itemId)) tempSelectedIdsModal.push(itemId);
                        } else {
                            tempSelectedIdsModal = tempSelectedIdsModal.filter(id => id !== itemId);
                        }
                    });
                });
            } catch (error) { console.error(`Erro ao carregar ${labelSingular}s no modal para protocolo:`, error); if (listaModalEl) listaModalEl.innerHTML = `<p class="text-sm text-red-500 dark:text-red-400">Erro ao carregar ${labelSingular}s.</p>`; }
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
        const filtroInput = document.getElementById(`filtro-modal-${tipoEntidade}-protocolo`);
        if (filtroInput) filtroInput.addEventListener('input', () => carregarItensNoModal(filtroInput.value));
        await carregarItensNoModal();
    }

    // O restante do código (handleSave, etc.) foi omitido por brevidade, mas já está presente no arquivo que você possui.
    function addFormEventListenersProtocolo(feedbackAreaId, originatingView, isEditing) {
        const form = document.getElementById('form-protocolo');
        const feedbackAreaForm = document.getElementById(feedbackAreaId);
        const hiddenProtocoloIdInput = document.getElementById('protocolo-id-hidden');
        const numeroProtocoloInput = document.getElementById('protocolo-numero');
        const anexoInput = document.getElementById('protocolo-anexos-input');
        const anexoPreviewList = document.getElementById('anexos-preview-protocolo-list');

        document.getElementById('btn-gerenciar-docs-vinculados-protocolo')?.addEventListener('click', () => abrirModalSelecaoProtocolo('documento'));
        document.getElementById('btn-gerenciar-contribs-vinculados-protocolo')?.addEventListener('click', () => abrirModalSelecaoProtocolo('contribuinte'));
        document.getElementById('btn-gerenciar-servidores-vinculados-protocolo')?.addEventListener('click', () => abrirModalSelecaoServidoresParaProtocolo());
        document.getElementById('btn-gerenciar-tarefas-vinculadas-protocolo')?.addEventListener('click', () => abrirModalSelecaoProtocolo('tarefa'));
        document.getElementById('btn-gerenciar-notas-vinculadas-protocolo')?.addEventListener('click', () => abrirModalSelecaoProtocolo('notaRapida'));
        document.getElementById('btn-gerenciar-ptas-gerados-protocolo')?.addEventListener('click', () => abrirModalSelecaoProtocolo('ptaGerado'));
        document.getElementById('btn-gerenciar-autuacoes-geradas-protocolo')?.addEventListener('click', () => abrirModalSelecaoProtocolo('autuacaoGerada'));


        if (anexoInput) {
            anexoInput.addEventListener('change', (event) => {
                currentFilesToAttachProtocolo = Array.from(event.target.files);
                anexoPreviewList.innerHTML = '';
                if (currentFilesToAttachProtocolo.length > 0) {
                    const ul = document.createElement('ul');
                    ul.className = 'list-disc pl-5 text-sm text-gray-600 dark:text-gray-400';
                    currentFilesToAttachProtocolo.forEach(file => {
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
            const btnSalvar = document.getElementById('btn-salvar-protocolo');
            if(btnSalvar) btnSalvar.disabled = true;
            if (globalClearFeedbackRef) globalClearFeedbackRef(feedbackAreaForm);

            const dataProtocoloInput = document.getElementById('protocolo-data');
            const tipoProtocoloInput = document.getElementById('protocolo-tipo');
            const assuntoInput = document.getElementById('protocolo-assunto');

            if (!numeroProtocoloInput.value.trim()) {
                 if (globalShowFeedbackRef) globalShowFeedbackRef("O 'Número do Protocolo' é obrigatório.", "error", feedbackAreaForm);
                numeroProtocoloInput.focus(); if(btnSalvar) btnSalvar.disabled = false; return;
            }
            if (!dataProtocoloInput.value) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("A 'Data do Protocolo' é obrigatória.", "error", feedbackAreaForm);
                dataProtocoloInput.focus(); if(btnSalvar) btnSalvar.disabled = false; return;
            }
             if (!tipoProtocoloInput.value.trim()) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("O 'Tipo de Protocolo' é obrigatório.", "error", feedbackAreaForm);
                tipoProtocoloInput.focus(); if(btnSalvar) btnSalvar.disabled = false; return;
            }
            if (!assuntoInput.value.trim()) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("O 'Assunto' é obrigatório.", "error", feedbackAreaForm);
                assuntoInput.focus(); if(btnSalvar) btnSalvar.disabled = false; return;
            }

            let finalProtocoloId = hiddenProtocoloIdInput.value || appModuleRef.generateUUID();
            let numeroProtocoloInformado = numeroProtocoloInput.value.trim();
            const tipoProtocoloInformado = tipoProtocoloInput.value.trim();

            if (!isEditing) { 
                 try {
                    const todosProtocolos = await dbRef.getAllItems(PROTOCOLOS_STORE_NAME);
                    if (todosProtocolos.some(p => p.numeroProtocolo === numeroProtocoloInformado)) {
                        if (globalShowFeedbackRef) globalShowFeedbackRef(`O número de protocolo "${numeroProtocoloInformado}" já existe.`, "error", feedbackAreaForm);
                        numeroProtocoloInput.focus(); if(btnSalvar) btnSalvar.disabled = false;
                        return;
                    }
                } catch (dbError) {
                    console.error("Erro ao verificar duplicidade de número de protocolo:", dbError);
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Erro ao verificar número do protocolo. Tente novamente.", "error", feedbackAreaForm);
                    if(btnSalvar) btnSalvar.disabled = false; return;
                 }
            } else { 
                numeroProtocoloInformado = document.getElementById('protocolo-numero-original-hidden').value || numeroProtocoloInformado;
            }

            try {
                const tiposExistentes = await dbRef.getAllItems(PROTOCOL_TYPES_STORE_NAME);
                if (!tiposExistentes.some(t => t.name.toLowerCase() === tipoProtocoloInformado.toLowerCase())) {
                    const novoTipo = { id: appModuleRef.generateUUID(), name: tipoProtocoloInformado };
                    await dbRef.addItem(PROTOCOL_TYPES_STORE_NAME, novoTipo);
                    if (globalShowFeedbackRef) globalShowFeedbackRef(`Novo tipo de protocolo "${tipoProtocoloInformado}" cadastrado.`, "info", feedbackAreaForm);
                    if (refreshApplicationStateRef) await refreshApplicationStateRef();
                }
            } catch (e) {
                console.error("ProtocolosForm.JS: Erro ao salvar novo tipo de protocolo:", e);
            }

            const primeiroAndamentoTextoInput = document.getElementById('protocolo-primeiro-andamento');
            const primeiroAndamentoTexto = primeiroAndamentoTextoInput ? primeiroAndamentoTextoInput.value.trim() : "";
            let historicoAndamentoArray = (isEditing && originalProtocoloData?.historicoAndamentoProtocolo) ? [...originalProtocoloData.historicoAndamentoProtocolo] : [];

            if (!isEditing && primeiroAndamentoTexto) {
                historicoAndamentoArray.unshift({
                    data: new Date().toISOString(),
                    descricao: primeiroAndamentoTexto,
                    responsavel: document.getElementById('protocolo-responsavel').value.trim() || "Sistema",
                    tipoAndamento: "Registro Inicial"
                });
            }

            const protocoloPayload = {
                id: finalProtocoloId,
                numeroProtocolo: numeroProtocoloInformado,
                dataHoraProtocolo: new Date(dataProtocoloInput.value).toISOString(),
                dataProtocolo: dataProtocoloInput.value,
                tipoProtocolo: tipoProtocoloInformado,
                assunto: assuntoInput.value.trim(),
                descricaoDetalhada: document.getElementById('protocolo-descricao').value.trim(),
                servidorResponsavel: document.getElementById('protocolo-responsavel').value.trim(),
                statusProtocolo: document.getElementById('protocolo-status').value,
                historicoAndamentoProtocolo: historicoAndamentoArray,
                anexos: [...existingAttachmentsProtocolo.map(a=>({...a, ownerId: finalProtocoloId, ownerType: 'protocolo' })), 
                         ...currentFilesToAttachProtocolo.map(f => ({ ownerId: finalProtocoloId, ownerType: 'protocolo', fileName: f.name, fileSize: f.size, fileType: f.type, filePath: '' } ))],
                documentosVinculadosIds: [...currentRelatedDocIds],
                contribuintesVinculadosIds: [...currentRelatedContribIds],
                tarefasVinculadasIds: [...currentRelatedTarefaIds],
                notasRapidasRelacionadasIds: [...currentRelatedNotaRapidaIds],
                servidoresVinculadosIds: [...currentRelatedServidorIds],
                ptasGeradosIds: [...currentRelatedPTAIds],
                autuacoesGeradasIds: [...currentRelatedAutuacaoIds],
                notasInternasProtocolo: document.getElementById('protocolo-notas-internas').value.trim(),
                dataCriacao: document.getElementById('protocolo-creation-date').value,
                dataModificacao: new Date().toISOString(),
                isDeleted: (isEditing && originalProtocoloData) ? (originalProtocoloData.isDeleted || false) : false
            };

            if (currentFilesToAttachProtocolo.length > 0 && window.SEFWorkStation.SharedUtils && typeof window.SEFWorkStation.SharedUtils.getOrCreateAttachmentDirHandle === 'function') {
                const dirHandle = await window.SEFWorkStation.SharedUtils.getOrCreateAttachmentDirHandle('processos/protocolos', finalProtocoloId);
                if (dirHandle) {
                    let anexoPayloadIndexBase = existingAttachmentsProtocolo.length;
                    for (let i = 0; i < currentFilesToAttachProtocolo.length; i++) {
                        const file = currentFilesToAttachProtocolo[i];
                        const anexoPayloadIndex = anexoPayloadIndexBase + i;
                        const newFileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
                        const fileHandle = await dirHandle.getFileHandle(newFileName, { create: true });
                        const writable = await fileHandle.createWritable();
                        await writable.write(file);
                        await writable.close();
                         if (protocoloPayload.anexos[anexoPayloadIndex]) {
                            protocoloPayload.anexos[anexoPayloadIndex].filePath = `processos/protocolos/${finalProtocoloId}/${newFileName}`;
                        }
                    }
                } else { throw new Error("Não foi possível acessar a pasta de anexos para protocolos."); }
            }

            try {
                const idsAnterioresDocs = originalProtocoloData?.documentosVinculadosIds || [];
                const idsAnterioresContribs = originalProtocoloData?.contribuintesVinculadosIds || [];
                const idsAnterioresTarefas = originalProtocoloData?.tarefasVinculadasIds || [];
                const idsAnterioresNotas = originalProtocoloData?.notasRapidasRelacionadasIds || [];
                const idsAnterioresServidores = originalProtocoloData?.servidoresVinculadosIds || [];
                const idsAnterioresPTAsGerados = originalProtocoloData?.ptasGeradosIds || [];
                const idsAnterioresAutuacoesGeradas = originalProtocoloData?.autuacoesGeradasIds || [];

                if (isEditing) {
                    await dbRef.updateItem(PROTOCOLOS_STORE_NAME, protocoloPayload);
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Protocolo atualizado com sucesso!", "success", feedbackAreaForm);
                } else {
                    await dbRef.addItem(PROTOCOLOS_STORE_NAME, protocoloPayload);
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Protocolo salvo com sucesso!", "success", feedbackAreaForm);
                }

                if (window.SEFWorkStation.SharedUtils && typeof window.SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais === 'function') {
                    await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(finalProtocoloId, DOCUMENTS_STORE_NAME, 'protocolosVinculadosIds', currentRelatedDocIds, idsAnterioresDocs, dbRef);
                    await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(finalProtocoloId, CONTRIBUINTES_STORE_NAME, 'protocolosRelacionadosIds', currentRelatedContribIds, idsAnterioresContribs, dbRef);
                    await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(finalProtocoloId, TAREFAS_STORE_NAME, 'protocolosVinculadosIds', currentRelatedTarefaIds, idsAnterioresTarefas, dbRef);
                    await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(finalProtocoloId, NOTAS_RAPIDAS_STORE_NAME, 'protocolosRelacionadosIds', currentRelatedNotaRapidaIds, idsAnterioresNotas, dbRef);
                    await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(finalProtocoloId, SERVIDORES_STORE_NAME, 'protocolosVinculadosIds', currentRelatedServidorIds, idsAnterioresServidores, dbRef);
                    await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(finalProtocoloId, PTAS_STORE_NAME, 'protocolosOriginariosIds', currentRelatedPTAIds, idsAnterioresPTAsGerados, dbRef);
                    await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(finalProtocoloId, AUTUACOES_STORE_NAME, 'protocolosOriginariosIds', currentRelatedAutuacaoIds, idsAnterioresAutuacoesGeradas, dbRef);
                }

                if (refreshApplicationStateRef) await refreshApplicationStateRef();

                if (navigateAfterSaveOrCancelCallback) {
                    if (protocolosViewModuleRef && typeof protocolosViewModuleRef.renderVisualizarProtocoloPage === 'function') {
                         if (appModuleRef && appModuleRef.handleMenuAction) {
                            appModuleRef.handleMenuAction('visualizar-protocolo', { protocoloId: finalProtocoloId, originatingView: originatingView });
                         } else {
                            navigateAfterSaveOrCancelCallback('gerir-protocolos');
                         }
                    } else {
                        navigateAfterSaveOrCancelCallback('gerir-protocolos');
                    }
                }

            } catch (error) {
                console.error("ProtocolosForm.JS: Erro ao salvar protocolo no DB:", error);
                if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao salvar protocolo: ${error.message}`, "error", feedbackAreaForm);
            } finally {
                if(btnSalvar) btnSalvar.disabled = false;
            }
        });

        document.getElementById('btn-cancelar-protocolo').addEventListener('click', () => {
            if (appModuleRef && appModuleRef.navigateBack) {
                appModuleRef.navigateBack();
            } else {
                if (navigateAfterSaveOrCancelCallback) {
                    if (isEditing && currentProtocoloId && protocolosViewModuleRef && typeof protocolosViewModuleRef.renderVisualizarProtocoloPage === 'function') {
                         if (appModuleRef && appModuleRef.handleMenuAction) {
                             appModuleRef.handleMenuAction('visualizar-protocolo', { protocoloId: currentProtocoloId, originatingView: originatingView });
                         } else {
                             navigateAfterSaveOrCancelCallback(originatingView || 'gerir-protocolos');
                         }
                    } else {
                        navigateAfterSaveOrCancelCallback(originatingView || 'gerir-protocolos');
                    }
                }
            }
        });
    }

    return {
        init,
        renderFormularioProtocolo
    };
})();