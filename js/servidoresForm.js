// js/servidoresForm.js - Lógica para Formulários de Servidores (Criação/Edição)
// v1.7.0 - CORREÇÃO: Utiliza EntityConfig.filterActiveItems no modal de seleção de entidades para filtrar versões arquivadas.
// v1.6.1 - Remove classe page-section para expandir a largura da visualização.
// v1.6 - Etapa 1.1: Modifica tipos de ausência e adiciona campo "Dias de Trabalho Remoto".
// (Histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.ServidoresForm = (function() {
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let navigateAfterSaveOrCancelCallback;
    let refreshApplicationStateRef;
    let dbRef;
    let appModuleRef;
    let uiModuleRef;
    let servidoresViewModuleRef;

    const SERVIDORES_STORE_NAME = 'servidoresStore';
    const DOCUMENTS_STORE_NAME = 'documents';
    const TAREFAS_STORE_NAME = 'tarefasStore';
    const NOTAS_RAPIDAS_STORE_NAME = 'notasRapidasStore';
    const PROTOCOLOS_STORE_NAME = 'protocolosStore';
    const PTAS_STORE_NAME = 'ptasStore';
    const AUTUACOES_STORE_NAME = 'autuacoesStore';

    let currentServidorId = null;
    let originalServidorData = null;

    let currentRelatedDocIds = [];
    let currentRelatedTarefaIds = [];
    let currentRelatedNotaRapidaIds = [];
    let currentRelatedProtocoloIds = [];
    let currentRelatedPTAIds = [];
    let currentRelatedAutuacaoIds = [];

    let tempSelectedIdsModal = []; 
    let currentOriginatingView = 'gerir-servidores';

    const STATUS_SERVIDOR_OPTIONS = ["Ativo", "Inativo", "Férias", "Licença", "Afastado", "Desligado", "Outro"];
    const AUSENCIA_TIPOS_OPTIONS = ["Férias Regulamentares", "Férias Prêmio", "Licença", "Afastado", "Outro"];


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
        servidoresViewModuleRef = viewModule;

        if (!dbRef) console.error("ServidoresForm.JS: init - Referência ao DB não fornecida!");
        if (!appModuleRef) console.error("ServidoresForm.JS: init - appModuleRef não fornecido.");
        if (!uiModuleRef) console.warn("ServidoresForm.JS: init - uiModuleRef não fornecido, modais podem não funcionar.");
        console.log("ServidoresForm.JS: Módulo inicializado (v1.7.0).");
    }

    function isValidEmail(email) {
        if (!email || email.trim() === '') return false; // Email é obrigatório
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    }

    function isValidTelefone(telefone) {
        if (!telefone || telefone.trim() === '') return true; // Telefone é opcional
        const re = /^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/;
        return re.test(String(telefone).replace(/[^\d]+/g, ''));
    }
    
    function renderPeriodoAusenciaFields(index, periodo = {}) {
        const tipoOptions = AUSENCIA_TIPOS_OPTIONS.map(opt => 
            `<option value="${opt}" ${periodo.tipo === opt ? 'selected' : ''}>${opt}</option>`
        ).join('');

        return `
            <div class="periodo-ausencia-item grid grid-cols-1 md:grid-cols-4 gap-3 items-center p-2 border dark:border-slate-600 rounded-md bg-gray-50 dark:bg-slate-700/50" data-index="${index}">
                <div class="md:col-span-2 grid grid-cols-2 gap-2">
                    <div>
                        <label for="periodo-inicio-${index}" class="text-xs font-medium text-gray-600 dark:text-gray-300">Início:</label>
                        <input type="date" id="periodo-inicio-${index}" name="periodoInicio" value="${periodo.dataInicio || ''}" class="form-input-text text-xs p-1 mt-0.5">
                    </div>
                     <div>
                        <label for="periodo-fim-${index}" class="text-xs font-medium text-gray-600 dark:text-gray-300">Fim:</label>
                        <input type="date" id="periodo-fim-${index}" name="periodoFim" value="${periodo.dataFim || ''}" class="form-input-text text-xs p-1 mt-0.5">
                    </div>
                </div>
                <div>
                     <label for="periodo-tipo-${index}" class="text-xs font-medium text-gray-600 dark:text-gray-300">Tipo:</label>
                    <select id="periodo-tipo-${index}" name="periodoTipo" class="form-input-text text-xs p-1 mt-0.5">${tipoOptions}</select>
                </div>
                <div class="flex items-end gap-2">
                    <div class="flex-grow">
                        <label for="periodo-obs-${index}" class="text-xs font-medium text-gray-600 dark:text-gray-300">Obs:</label>
                        <input type="text" id="periodo-obs-${index}" name="periodoObs" value="${(periodo.observacao || '').replace(/"/g, '"')}" class="form-input-text text-xs p-1 mt-0.5" placeholder="Opcional">
                    </div>
                    <button type="button" class="btn-remove-periodo-ausencia btn-delete btn-sm p-1" title="Remover Período">×</button>
                </div>
            </div>
        `;
    }
    
    function relatedEntityConfigServidor() {
        return {
            documentos: { label: 'Documentos', storeName: DOCUMENTS_STORE_NAME, singularName: 'Documento', pluralName: 'documentos', currentIds: () => currentRelatedDocIds, displayField: 'title', idPrefix: 'DOC-', targetLinkField: 'servidoresVinculadosIds' },
            tarefas: { label: 'Tarefas', storeName: TAREFAS_STORE_NAME, singularName: 'Tarefa', pluralName: 'tarefas', currentIds: () => currentRelatedTarefaIds, displayField: 'titulo', idPrefix: 'TAR-', targetLinkField: 'servidoresVinculadosIds' },
            notasRapidas: { label: 'Notas Rápidas', storeName: NOTAS_RAPIDAS_STORE_NAME, singularName: 'Nota Rápida', pluralName: 'notasrapidas', currentIds: () => currentRelatedNotaRapidaIds, displayField: 'titulo', idPrefix: 'NOTA-', targetLinkField: 'servidoresVinculadosIds' },
            protocolos: { label: 'Protocolos', storeName: PROTOCOLOS_STORE_NAME, singularName: 'Protocolo', pluralName: 'protocolos', currentIds: () => currentRelatedProtocoloIds, displayField: 'numeroProtocolo', idPrefix: 'PROT-', targetLinkField: 'servidoresVinculadosIds' },
            ptas: { label: 'PTAs', storeName: PTAS_STORE_NAME, singularName: 'PTA', pluralName: 'ptas', currentIds: () => currentRelatedPTAIds, displayField: 'numeroPTA', idPrefix: 'PTA-', targetLinkField: 'servidoresVinculadosIds' },
            autuacoes: { label: 'Autuações', storeName: AUTUACOES_STORE_NAME, singularName: 'Autuação', pluralName: 'autuacoes', currentIds: () => currentRelatedAutuacaoIds, displayField: 'numeroAutuacao', idPrefix: 'AUT-', targetLinkField: 'servidoresVinculadosIds' }
        };
    }

    async function renderNovoServidorForm(servidorData = null, originatingView = 'gerir-servidores') {
        currentOriginatingView = originatingView;
        if (globalClearFeedbackRef) globalClearFeedbackRef();

        const isEditing = servidorData && servidorData.id;
        currentServidorId = isEditing ? servidorData.id : null;
        originalServidorData = isEditing ? JSON.parse(JSON.stringify(servidorData)) : null;

        currentRelatedDocIds = (isEditing && Array.isArray(servidorData.documentosVinculadosIds)) ? [...servidorData.documentosVinculadosIds] : [];
        currentRelatedTarefaIds = (isEditing && Array.isArray(servidorData.tarefasVinculadasIds)) ? [...servidorData.tarefasVinculadasIds] : [];
        currentRelatedNotaRapidaIds = (isEditing && Array.isArray(servidorData.notasRapidasVinculadasIds)) ? [...servidorData.notasRapidasVinculadasIds] : [];
        currentRelatedProtocoloIds = (isEditing && Array.isArray(servidorData.protocolosVinculadosIds)) ? [...servidorData.protocolosVinculadosIds] : [];
        currentRelatedPTAIds = (isEditing && Array.isArray(servidorData.ptasVinculadosIds)) ? [...servidorData.ptasVinculadosIds] : [];
        currentRelatedAutuacaoIds = (isEditing && Array.isArray(servidorData.autuacoesVinculadosIds)) ? [...servidorData.autuacoesVinculadosIds] : [];


        const formTitle = isEditing ? "Editar Servidor" : "Novo Servidor";
        const feedbackAreaId = `feedback-form-servidor-${currentServidorId || 'novo'}`;
        
        let matriculaDisplayValue = servidorData?.matricula?.replace(/"/g, '"') || '';
        let matriculaPlaceholder = "Obrigatório (Ex: SERV-00001)";
        let matriculaReadonly = isEditing && servidorData?.matricula;

        if (isEditing && servidorData?.matricula) {
            matriculaPlaceholder = ''; 
        } else if (isEditing && !servidorData?.matricula) {
             matriculaDisplayValue = 'N/A (cadastro antigo)'; 
             matriculaReadonly = true; 
        } else if (!isEditing) {
            matriculaPlaceholder = "Deixe em branco para geração automática ou informe";
            matriculaReadonly = false;
        }

        mainContentWrapperRef.innerHTML = '';
        if (appModuleRef && typeof appModuleRef.setCurrentViewTarget === 'function') {
            appModuleRef.setCurrentViewTarget('form-servidor', !isEditing);
        }

        const periodosAusenciaHtml = (servidorData?.periodosAusencia || []).map((p, i) => renderPeriodoAusenciaFields(i, p)).join('');

        const entityConfig = relatedEntityConfigServidor();
        let vinculosHtml = '';
        for (const key in entityConfig) {
            const entity = entityConfig[key];
            vinculosHtml += `
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">${entity.label} Vinculados:</label>
                    <div id="lista-${entity.pluralName}-vinculados-servidor" class="form-vinculos-lista"></div>
                    <button type="button" id="btn-gerenciar-${entity.pluralName}-vinculados-servidor" 
                            class="btn-secondary btn-sm text-xs" data-entity-type="${key}">Gerenciar Vínculos</button>
                </div>
            `;
        }
        
        const diasSemana = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];
        const diasTrabalhoRemoto = servidorData?.diasTrabalhoRemoto || [];
        const trabalhoRemotoCheckboxesHtml = diasSemana.map(dia => `
            <label class="inline-flex items-center mr-3">
                <input type="checkbox" name="diasTrabalhoRemoto" value="${dia}" class="form-checkbox rounded text-blue-600" 
                       ${diasTrabalhoRemoto.includes(dia) ? 'checked' : ''}>
                <span class="ml-2 text-sm">${dia}</span>
            </label>
        `).join('');

        const formHtml = `
            <div class="form-section"> 
                <h2 class="text-xl font-semibold mb-6">${formTitle}</h2>
                <div id="${feedbackAreaId}" class="mb-4"></div>

                <form id="form-servidor">
                    <input type="hidden" id="servidor-id-hidden" value="${currentServidorId || ''}">
                    <input type="hidden" id="servidor-creation-date" value="${(isEditing && servidorData?.dataCriacao) ? servidorData.dataCriacao : new Date().toISOString()}">

                    <div class="form-grid">
                        <div>
                            <label for="servidor-nome" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome Completo: <span class="text-red-500">*</span></label>
                            <input type="text" id="servidor-nome" name="nome" class="form-input-text mt-1 block w-full" required value="${servidorData?.nome?.replace(/"/g, '"') || ''}">
                        </div>
                        <div>
                            <label for="servidor-matricula" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Matrícula/ID Funcional: <span class="text-red-500">*</span></label>
                            <input type="text" id="servidor-matricula" name="matricula" class="form-input-text mt-1 block w-full ${matriculaReadonly ? 'bg-gray-100 dark:bg-slate-700' : ''}" 
                                   value="${matriculaDisplayValue}" placeholder="${matriculaPlaceholder}" ${matriculaReadonly ? 'readonly' : ''}>
                            ${matriculaReadonly && isEditing ? '<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">A matrícula não pode ser alterada após o cadastro.</p>' : ''}
                        </div>
                    </div>
                    <div class="form-grid mt-4">
                        <div>
                            <label for="servidor-local-exercicio" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Setor/Lotação: <span class="text-red-500">*</span></label>
                            <input type="text" id="servidor-local-exercicio" name="setorLotacao" class="form-input-text mt-1 block w-full" required value="${servidorData?.setorLotacao?.replace(/"/g, '"') || ''}">
                        </div>
                        <div>
                            <label for="servidor-email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">E-mail: <span class="text-red-500">*</span></label>
                            <input type="email" id="servidor-email" name="email" class="form-input-text mt-1 block w-full" required value="${servidorData?.email?.replace(/"/g, '"') || ''}">
                            <p id="feedback-servidor-email" class="text-xs mt-1"></p>
                        </div>
                    </div>
                    <div class="form-grid mt-4">
                        <div>
                            <label for="servidor-cargo" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Cargo/Função:</label>
                            <input type="text" id="servidor-cargo" name="cargoFuncao" class="form-input-text mt-1 block w-full" value="${servidorData?.cargoFuncao?.replace(/"/g, '"') || ''}">
                        </div>
                        <div>
                            <label for="servidor-telefone" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Telefone:</label>
                            <input type="tel" id="servidor-telefone" name="telefone" class="form-input-text mt-1 block w-full" value="${servidorData?.telefone?.replace(/"/g, '"') || ''}" placeholder="(XX) XXXXX-XXXX">
                            <p id="feedback-servidor-telefone" class="text-xs mt-1"></p>
                        </div>
                    </div>
                    <div class="form-grid mt-4">
                         <div>
                            <label for="servidor-status" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Status Atual:</label>
                            <select id="servidor-status" name="status" class="form-input-text mt-1 block w-full">
                                ${STATUS_SERVIDOR_OPTIONS.map(s => `<option value="${s}" ${servidorData?.status === s || (!isEditing && s === 'Ativo') ? 'selected' : ''}>${s}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                             <label for="servidor-area-atuacao" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Área de Atuação:</label>
                             <input type="text" id="servidor-area-atuacao" name="areaAtuacao" class="form-input-text mt-1 block w-full" value="${servidorData?.areaAtuacao?.replace(/"/g, '"') || ''}" placeholder="Ex: Fiscalização, TI, Jurídico">
                        </div>
                    </div>

                    <div class="mb-4 mt-4">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Dias de Trabalho Remoto:</label>
                        <div class="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                            ${trabalhoRemotoCheckboxesHtml}
                        </div>
                    </div>

                    <div class="mb-4 mt-4">
                        <label for="servidor-observacoes" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Observações:</label>
                        <textarea id="servidor-observacoes" name="observacoes" rows="3" class="form-input-text mt-1 block w-full">${servidorData?.observacoes || ''}</textarea>
                    </div>

                    <h3 class="text-md font-semibold my-4 pt-4 border-t dark:border-slate-600">Histórico de Status e Ausências (Férias, Licenças, etc.)</h3>
                    <div id="periodos-ausencia-container" class="space-y-2 mb-2">
                        ${periodosAusenciaHtml}
                    </div>
                    <button type="button" id="btn-add-periodo-ausencia" class="btn-secondary btn-sm text-xs">Adicionar Período de Ausência</button>
                    
                    <h3 class="text-md font-semibold my-4 pt-4 border-t dark:border-slate-600">Vincular a Outras Entidades:</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        ${vinculosHtml}
                    </div>

                    <div class="form-actions mt-6">
                        <button type="button" id="btn-cancelar-servidor" class="btn-secondary">Cancelar</button>
                        <button type="submit" id="btn-salvar-servidor" class="btn-primary">${isEditing ? 'Atualizar Servidor' : 'Salvar Servidor'}</button>
                    </div>
                </form>
            </div>
        `;
        mainContentWrapperRef.innerHTML = formHtml;
        await renderSelectedRelatedItemsServidor();
        addFormEventListenersServidor(feedbackAreaId, originatingView, isEditing);
    }
    
    async function renderSelectedRelatedItemsServidor() {
        const config = relatedEntityConfigServidor();
        for (const key in config) {
            const entity = config[key];
            await renderSelectedItemsListServidor(entity.currentIds(), `lista-${entity.pluralName}-vinculados-servidor`, entity.storeName, entity.singularName, entity.displayField, entity.idPrefix);
        }
    }

    async function renderSelectedItemsListServidor(ids, containerId, storeName, tipoEntidade, displayField = 'title', idPrefix = '') {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        if (!ids || ids.length === 0) {
            container.innerHTML = `<p class="text-xs text-gray-500 dark:text-gray-400">Nenhum ${tipoEntidade.toLowerCase()} vinculado.</p>`;
            return;
        }
        const ul = document.createElement('ul');
        ul.className = 'list-none p-0 space-y-1';
        for (const id of ids) {
            try {
                const item = await dbRef.getItemById(storeName, id);
                const li = document.createElement('li');
                li.className = 'flex justify-between items-center text-xs p-1.5 bg-gray-200 dark:bg-slate-600 rounded';
                let displayName = `ID ${String(id).substring(0,8)} (não encontrado)`;
                if (item) {
                     displayName = item[displayField] || item.nome || item.titulo || item.numeroProtocolo || item.numeroPTA || item.numeroAutuacao || `${idPrefix}${String(id).substring(0,8)}`;
                     if(item.numeroIdentificacao && tipoEntidade !== "Documento") displayName += ` (${item.numeroIdentificacao})`;
                }

                li.innerHTML = `
                    <span class="truncate text-gray-700 dark:text-gray-200" title="${String(displayName).replace(/"/g, '"')}">${displayName}</span>
                    <button type="button" data-id="${id}" data-type="${tipoEntidade}" class="btn-remove-related-item-servidor text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm leading-none p-0.5" title="Remover vínculo">×</button>
                `;
                li.querySelector('.btn-remove-related-item-servidor').addEventListener('click', (e) => {
                    const idToRemove = e.currentTarget.dataset.id;
                    const typeToRemove = e.currentTarget.dataset.type;
                    const config = relatedEntityConfigServidor();
                    for (const key in config) {
                        if (config[key].singularName === typeToRemove) {
                            let currentArray = config[key].currentIds();
                            currentArray = currentArray.filter(i => String(i) !== String(idToRemove));
                            if (key === 'documentos') currentRelatedDocIds = currentArray;
                            else if (key === 'tarefas') currentRelatedTarefaIds = currentArray;
                            else if (key === 'notasRapidas') currentRelatedNotaRapidaIds = currentArray;
                            else if (key === 'protocolos') currentRelatedProtocoloIds = currentArray;
                            else if (key === 'ptas') currentRelatedPTAIds = currentArray;
                            else if (key === 'autuacoes') currentRelatedAutuacaoIds = currentArray;
                            break;
                        }
                    }
                    renderSelectedRelatedItemsServidor();
                });
                ul.appendChild(li);
            } catch (error) {
                console.warn(`Erro ao renderizar item vinculado ${tipoEntidade} ID ${id} para servidor:`, error);
            }
        }
        container.appendChild(ul);
    }

    async function abrirModalSelecaoEntidadeParaServidor(tipoEntidadeKey) {
        const entityConfig = relatedEntityConfigServidor()[tipoEntidadeKey];
        if (!entityConfig) return;

        if (!uiModuleRef || !uiModuleRef.showModal) {
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro: Funcionalidade de modal não está disponível.", "error", document.getElementById(`feedback-form-servidor-${currentServidorId || 'novo'}`));
            return;
        }
        const modalId = `modal-selecionar-${entityConfig.pluralName}-servidor`;
        tempSelectedIdsModal = [...entityConfig.currentIds()];

        const modalContentHtml = `
            <div class="bg-gray-100 dark:bg-slate-700 p-3 rounded-md">
                <input type="search" id="filtro-modal-${entityConfig.pluralName}-servidor" class="form-input-text w-full mb-3 text-sm" placeholder="Buscar por ${entityConfig.displayField} ou ID...">
                <div id="lista-${entityConfig.pluralName}-modal-servidor" class="overflow-y-auto flex-grow border dark:border-slate-500 rounded-md p-2 min-h-[200px] max-h-[50vh] bg-white dark:bg-slate-600">
                    <p class="text-sm text-gray-500 dark:text-gray-300">Carregando...</p>
                </div>
            </div>`;

        const carregarItensNoModal = async (termoBusca = '') => {
            const listaModalEl = document.getElementById(`lista-${entityConfig.pluralName}-modal-servidor`);
            if (!listaModalEl) return;
            listaModalEl.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-300">Carregando...</p>';
            try {
                // CORREÇÃO: Utiliza a função centralizada para filtrar itens deletados e arquivados
                const todosItensDB = await dbRef.getAllItems(entityConfig.storeName);
                let todosItens = window.SEFWorkStation.EntityConfig.filterActiveItems(todosItensDB, entityConfig.storeName);
                
                // Filtra o próprio servidor da lista se aplicável (não deve acontecer, mas é uma salvaguarda)
                todosItens = todosItens.filter(item => item.id !== currentServidorId);

                if (termoBusca) {
                    const t = termoBusca.toLowerCase();
                    todosItens = todosItens.filter(item => 
                        (item[entityConfig.displayField] && String(item[entityConfig.displayField]).toLowerCase().includes(t)) ||
                        (item.id && String(item.id).toLowerCase().includes(t)) ||
                        (item.numeroIdentificacao && String(item.numeroIdentificacao).toLowerCase().includes(t)) ||
                        (item.assunto && String(item.assunto).toLowerCase().includes(t)) 
                    );
                }
                todosItens.sort((a, b) => String(a[entityConfig.displayField] || a.nome || "").localeCompare(String(b[entityConfig.displayField] || b.nome || "")));

                if (todosItens.length === 0) {
                    listaModalEl.innerHTML = `<p class="text-sm text-gray-500 dark:text-gray-400">${termoBusca ? 'Nenhum item encontrado.' : `Nenhum ${entityConfig.singularName.toLowerCase()} disponível.`}</p>`;
                    return;
                }
                let itemsHtml = '<ul class="space-y-1.5">';
                todosItens.forEach(item => {
                    const isChecked = tempSelectedIdsModal.includes(item.id);
                    const displayName = item[entityConfig.displayField] || item.nome || item.titulo || item.numeroProtocolo || item.numeroPTA || item.numeroAutuacao || `${entityConfig.idPrefix}${String(item.id).substring(0,8)}`;
                    const subInfo = item.numeroIdentificacao && tipoEntidadeKey !== "documentos" ? `(${item.numeroIdentificacao})` : (item.reference ? `(Ref: ${item.reference})` : '');
                    itemsHtml += `
                        <li class="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-500">
                            <label class="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" value="${item.id}" class="form-checkbox rounded modal-${entityConfig.pluralName}-servidor-checkbox h-4 w-4" ${isChecked ? 'checked' : ''}>
                                <span class="text-sm text-gray-700 dark:text-gray-200">${displayName} <span class="text-xs text-gray-500 dark:text-gray-400 ml-1">${subInfo}</span></span>
                            </label>
                        </li>`;
                });
                itemsHtml += '</ul>';
                listaModalEl.innerHTML = itemsHtml;
                listaModalEl.querySelectorAll(`.modal-${entityConfig.pluralName}-servidor-checkbox`).forEach(cb => {
                    cb.addEventListener('change', (e) => {
                        const itemId = e.target.value;
                        if (e.target.checked) { if (!tempSelectedIdsModal.includes(itemId)) tempSelectedIdsModal.push(itemId); } 
                        else { tempSelectedIdsModal = tempSelectedIdsModal.filter(id => id !== itemId); }
                    });
                });
            } catch (error) { if (listaModalEl) listaModalEl.innerHTML = `<p class="text-sm text-red-500 dark:text-red-400">Erro ao carregar.</p>`; }
        };

        const modalButtons = [
            { text: 'Cancelar', class: 'btn-secondary text-sm', callback: () => uiModuleRef.closeModal() },
            { text: 'Confirmar Seleção', class: 'btn-primary text-sm', callback: async () => {
                const currentIdsArray = entityConfig.currentIds();
                currentIdsArray.length = 0; 
                Array.prototype.push.apply(currentIdsArray, tempSelectedIdsModal);
                await renderSelectedRelatedItemsServidor();
                uiModuleRef.closeModal();
            }}
        ];
        uiModuleRef.showModal(`Selecionar ${entityConfig.label} para Vincular ao Servidor`, modalContentHtml, modalButtons, 'max-w-2xl', modalId);
        const filtroInput = document.getElementById(`filtro-modal-${entityConfig.pluralName}-servidor`);
        if (filtroInput) filtroInput.addEventListener('input', () => carregarItensNoModal(filtroInput.value));
        await carregarItensNoModal();
    }

    function addFormEventListenersServidor(feedbackAreaId, originatingView, isEditing) {
        const form = document.getElementById('form-servidor');
        const feedbackAreaForm = document.getElementById(feedbackAreaId);
        const emailInput = document.getElementById('servidor-email');
        const feedbackEmailEl = document.getElementById('feedback-servidor-email');
        const telefoneInput = document.getElementById('servidor-telefone');
        const feedbackTelefoneEl = document.getElementById('feedback-servidor-telefone');
        const matriculaInput = document.getElementById('servidor-matricula');
        const btnSalvar = document.getElementById('btn-salvar-servidor');

        if (emailInput && feedbackEmailEl) {
             emailInput.addEventListener('blur', () => {
                const valor = emailInput.value.trim();
                feedbackEmailEl.textContent = '';
                feedbackEmailEl.className = 'text-xs mt-1';
                if (!valor && emailInput.required) {
                     feedbackEmailEl.textContent = 'E-mail é obrigatório.';
                     feedbackEmailEl.classList.add('text-red-600', 'dark:text-red-400');
                     return;
                }
                if (valor && !isValidEmail(valor)) {
                    feedbackEmailEl.textContent = 'Formato de e-mail inválido.';
                    feedbackEmailEl.classList.add('text-red-600', 'dark:text-red-400');
                } else if (valor) {
                    feedbackEmailEl.textContent = 'E-mail válido.';
                    feedbackEmailEl.classList.add('text-green-600', 'dark:text-green-400');
                }
            });
        }
        if (telefoneInput && feedbackTelefoneEl) {
            telefoneInput.addEventListener('blur', () => {
                const valor = telefoneInput.value.trim();
                feedbackTelefoneEl.textContent = '';
                feedbackTelefoneEl.className = 'text-xs mt-1';
                if (!valor) return;
                if (!isValidTelefone(valor)) {
                    feedbackTelefoneEl.textContent = 'Formato de telefone não usual.';
                    feedbackTelefoneEl.classList.add('text-yellow-600', 'dark:text-yellow-400');
                } else {
                    feedbackTelefoneEl.textContent = 'Formato de telefone aceitável.';
                    feedbackTelefoneEl.classList.add('text-green-600', 'dark:text-green-400');
                }
            });
        }

        const containerPeriodos = document.getElementById('periodos-ausencia-container');
        document.getElementById('btn-add-periodo-ausencia').addEventListener('click', () => {
            const newIndex = containerPeriodos.children.length;
            containerPeriodos.insertAdjacentHTML('beforeend', renderPeriodoAusenciaFields(newIndex));
            const novoItem = containerPeriodos.lastElementChild;
            novoItem.querySelector('.btn-remove-periodo-ausencia').addEventListener('click', () => {
                novoItem.remove();
            });
        });
        containerPeriodos.querySelectorAll('.btn-remove-periodo-ausencia').forEach(btn => {
            btn.addEventListener('click', (e) => e.currentTarget.closest('.periodo-ausencia-item').remove());
        });

        const entityConfig = relatedEntityConfigServidor();
        for (const key in entityConfig) {
            const btnGerenciar = document.getElementById(`btn-gerenciar-${entityConfig[key].pluralName}-vinculados-servidor`);
            if (btnGerenciar) {
                btnGerenciar.addEventListener('click', () => abrirModalSelecaoEntidadeParaServidor(key));
            }
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (globalClearFeedbackRef && feedbackAreaForm) globalClearFeedbackRef(feedbackAreaForm);

            const nomeInput = document.getElementById('servidor-nome');
            const setorLotacaoInput = document.getElementById('servidor-local-exercicio');

            if (!nomeInput.value.trim()) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("O 'Nome Completo' do servidor é obrigatório.", "error", feedbackAreaForm);
                nomeInput.focus(); return;
            }
            if (!setorLotacaoInput.value.trim()) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("O 'Setor/Lotação' é obrigatório.", "error", feedbackAreaForm);
                setorLotacaoInput.focus(); return;
            }
            if (!emailInput.value.trim()) {
                 if (globalShowFeedbackRef) globalShowFeedbackRef("O 'E-mail' é obrigatório.", "error", feedbackAreaForm);
                emailInput.focus(); return;
            }
             if (!isValidEmail(emailInput.value.trim())) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("Formato de e-mail inválido.", "error", feedbackAreaForm);
                emailInput.focus(); return;
            }
            
            let finalServidorId = currentServidorId || appModuleRef.generateUUID();
            let finalMatricula = matriculaInput.value.trim();

            if (!isEditing && !finalMatricula) {
                try {
                    finalMatricula = await appModuleRef.generateServidorMatricula();
                } catch (e) {
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Erro ao gerar matrícula automática. Informe manualmente ou tente novamente.", "error", feedbackAreaForm);
                    matriculaInput.focus(); return;
                }
            } else if (isEditing && originalServidorData && originalServidorData.matricula) {
                finalMatricula = originalServidorData.matricula;
            } else if (!finalMatricula && (isEditing || !isEditing)) { 
                 try {
                    finalMatricula = await appModuleRef.generateServidorMatricula();
                } catch(e) {
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Erro ao gerar matrícula automática. Informe manualmente ou tente novamente.", "error", feedbackAreaForm);
                    matriculaInput.focus(); return;
                }
            }

            if ((!isEditing || (isEditing && finalMatricula !== originalServidorData.matricula)) && finalMatricula && finalMatricula !== 'N/A (cadastro antigo)') {
                try {
                    const todosServidores = await dbRef.getAllItems(SERVIDORES_STORE_NAME);
                    if (todosServidores.some(s => s.matricula === finalMatricula && s.id !== finalServidorId)) {
                        if (globalShowFeedbackRef) globalShowFeedbackRef(`A matrícula "${finalMatricula}" já está em uso.`, "error", feedbackAreaForm);
                        matriculaInput.focus(); return;
                    }
                } catch (dbError) { console.error("Erro ao verificar duplicidade de matrícula:", dbError); }
            }
            
            const periodosAusencia = [];
            document.querySelectorAll('.periodo-ausencia-item').forEach(item => {
                const inicio = item.querySelector('input[name="periodoInicio"]').value;
                const fim = item.querySelector('input[name="periodoFim"]').value;
                const tipo = item.querySelector('select[name="periodoTipo"]').value;
                const obs = item.querySelector('input[name="periodoObs"]').value;
                if (inicio && tipo) { 
                    periodosAusencia.push({ id: appModuleRef.generateUUID(), dataInicio: inicio, dataFim: fim || null, tipo: tipo, observacao: obs });
                }
            });

            const diasTrabalhoRemotoSelecionados = [];
            document.querySelectorAll('input[name="diasTrabalhoRemoto"]:checked').forEach(checkbox => {
                diasTrabalhoRemotoSelecionados.push(checkbox.value);
            });

            const servidorPayload = {
                id: finalServidorId,
                nome: nomeInput.value.trim(),
                matricula: finalMatricula,
                setorLotacao: setorLotacaoInput.value.trim(),
                email: emailInput.value.trim(),
                cargoFuncao: document.getElementById('servidor-cargo').value.trim(),
                telefone: document.getElementById('servidor-telefone').value.trim(),
                status: document.getElementById('servidor-status').value,
                areaAtuacao: document.getElementById('servidor-area-atuacao').value.trim(),
                observacoes: document.getElementById('servidor-observacoes').value.trim(),
                dataCriacao: document.getElementById('servidor-creation-date').value,
                dataModificacao: new Date().toISOString(),
                isDeleted: (isEditing && originalServidorData) ? (originalServidorData.isDeleted || false) : false,
                periodosAusencia: periodosAusencia,
                diasTrabalhoRemoto: diasTrabalhoRemotoSelecionados,
                documentosVinculadosIds: [...currentRelatedDocIds],
                tarefasVinculadasIds: [...currentRelatedTarefaIds],
                notasRapidasVinculadasIds: [...currentRelatedNotaRapidaIds],
                protocolosVinculadosIds: [...currentRelatedProtocoloIds],
                ptasVinculadosIds: [...currentRelatedPTAIds],
                autuacoesVinculadasIds: [...currentRelatedAutuacaoIds]
            };
            
            if (typeof servidorPayload.id === 'undefined' || servidorPayload.id === null || String(servidorPayload.id).trim() === '') {
                if (globalShowFeedbackRef && feedbackAreaForm) globalShowFeedbackRef("ERRO CRÍTICO: Tentativa de salvar servidor com ID inválido ou ausente. Operação cancelada.", "error", feedbackAreaForm, 0);
                console.error("ServidoresForm.JS: ID inválido para servidorPayload:", servidorPayload.id);
                if(btnSalvar) btnSalvar.disabled = false;
                return; 
            }

            try {
                const opAnteriores = {};
                if (isEditing && originalServidorData) {
                    const conf = relatedEntityConfigServidor();
                    for(const key in conf) {
                        opAnteriores[key] = originalServidorData[`${key}VinculadosIds`] || [];
                    }
                }

                if (isEditing) {
                    await dbRef.updateItem(SERVIDORES_STORE_NAME, servidorPayload);
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Servidor atualizado com sucesso!", "success", feedbackAreaForm);
                } else {
                    await dbRef.addItem(SERVIDORES_STORE_NAME, servidorPayload);
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Servidor salvo com sucesso!", "success", feedbackAreaForm);
                }

                if (window.SEFWorkStation.SharedUtils && typeof window.SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais === 'function') {
                    const confAtualizacao = relatedEntityConfigServidor();
                    for (const key in confAtualizacao) {
                        const entity = confAtualizacao[key];
                        await window.SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(
                            finalServidorId,
                            entity.storeName,
                            entity.targetLinkField,
                            servidorPayload[`${key}VinculadosIds`] || [],
                            opAnteriores[key] || [],
                            dbRef
                        );
                    }
                }

                if (refreshApplicationStateRef) await refreshApplicationStateRef();
                if (servidoresViewModuleRef && typeof servidoresViewModuleRef.renderVisualizarServidorPage === 'function') {
                    servidoresViewModuleRef.renderVisualizarServidorPage(finalServidorId, originatingView);
                } else if (navigateAfterSaveOrCancelCallback) {
                    navigateAfterSaveOrCancelCallback(originatingView || 'gerir-servidores');
                }

            } catch (error) {
                console.error("ServidoresForm.JS: Erro ao salvar servidor no DB:", error);
                if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao salvar servidor: ${error.message}`, "error", feedbackAreaForm);
            } finally {
                if(btnSalvar) btnSalvar.disabled = false;
            }
        });

        document.getElementById('btn-cancelar-servidor').addEventListener('click', () => {
             if (appModuleRef && appModuleRef.navigateBack) {
                appModuleRef.navigateBack();
            } else {
                if (navigateAfterSaveOrCancelCallback) {
                    navigateAfterSaveOrCancelCallback(originatingView || 'gerir-servidores', currentServidorId);
                }
            }
        });
    }

    return {
        init,
        renderNovoServidorForm
    };
})();