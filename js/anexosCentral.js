// js/anexosCentral.js - Módulo para Gestão Centralizada de Anexos
// v1.3.0 - REFATORADO: Utiliza EntityConfig.filterActiveItems para filtrar os proprietários dos anexos.
// v1.2.0 - CORREÇÃO: Utiliza downloadAttachment para downloads e ajusta a lógica de exclusão para remover referência do item proprietário.
// v1.1.0 - Remove filtros de data para simplificar a interface.
// v1.0.0 - Implementação inicial da listagem, filtros e ações.

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.AnexosCentral = (function() {
    let mainContentWrapperRef;
    let dbRef;
    let appModuleRef;
    let uiModuleRef;
    let globalShowFeedbackRef;

    const STORE_MAP = {
        'documento': { storeName: 'documents', displayField: 'title', viewAction: 'visualizar-documento' },
        'contribuinte': { storeName: 'contribuintes', displayField: 'nome', viewAction: 'visualizar-contribuinte' },
        'recurso': { storeName: 'recursos', displayField: 'titulo', viewAction: 'visualizar-recurso' },
        'tarefa': { storeName: 'tarefasStore', displayField: 'titulo', viewAction: 'visualizar-tarefa' },
        'notaRapida': { storeName: 'notasRapidasStore', displayField: 'titulo', viewAction: 'visualizar-nota-rapida' },
        'protocolo': { storeName: 'protocolosStore', displayField: 'numeroProtocolo', viewAction: 'visualizar-protocolo' },
        'pta': { storeName: 'ptasStore', displayField: 'numeroPTA', viewAction: 'visualizar-pta' },
        'autuacao': { storeName: 'autuacoesStore', displayField: 'numeroAutuacao', viewAction: 'visualizar-autuacao' }
    };

    let allAttachmentsCache = [];
    let currentFilters = { searchTerm: '', ownerType: '' };

    function init(mainWrapper, db, app, ui, showFeedback) {
        mainContentWrapperRef = mainWrapper;
        dbRef = db;
        appModuleRef = app;
        uiModuleRef = ui;
        globalShowFeedbackRef = showFeedback;
        console.log("AnexosCentral.JS: Módulo inicializado (v1.3.0).");
    }
    
    async function renderGerenciarAnexosPage() {
        if (!mainContentWrapperRef) {
            console.error("AnexosCentral.JS: mainContentWrapperRef não definido.");
            return;
        }
        
        mainContentWrapperRef.innerHTML = `<div id="anexos-central-container" class="page-section max-w-none px-4 sm:px-6 lg:px-8"><p class="loading-text p-4">Carregando gerenciador de anexos...</p></div>`;
        const container = document.getElementById('anexos-central-container');
        const feedbackAreaId = "feedback-anexos-central";

        const ownerTypeOptions = Object.keys(STORE_MAP).map(key => `<option value="${key}">${key.charAt(0).toUpperCase() + key.slice(1)}</option>`).join('');

        const pageHtml = `
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-semibold">Gestão Centralizada de Anexos</h2>
            </div>
            <div id="${feedbackAreaId}" class="mb-4"></div>

            <div class="filtros-avancados-recursos p-4 mb-6 border dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div>
                        <label for="filtro-anexo-nome" class="block text-sm font-medium">Nome do Arquivo:</label>
                        <input type="search" id="filtro-anexo-nome" class="form-input-text mt-1 block w-full text-sm" placeholder="Pesquisar nome...">
                    </div>
                    <div>
                        <label for="filtro-anexo-tipo-dono" class="block text-sm font-medium">Tipo de Item Proprietário:</label>
                        <select id="filtro-anexo-tipo-dono" class="form-input-text mt-1 block w-full text-sm">
                            <option value="">Todos os Tipos</option>
                            ${ownerTypeOptions}
                        </select>
                    </div>
                </div>
            </div>

            <div id="lista-anexos-central-container" class="table-list-container">
                <p class="loading-text p-4">Carregando anexos...</p>
            </div>
        `;
        container.innerHTML = pageHtml;
        addEventListenersToFilters();
        await loadAndRenderAttachments();
    }

    function addEventListenersToFilters() {
        document.getElementById('filtro-anexo-nome').addEventListener('input', (e) => {
            currentFilters.searchTerm = e.target.value;
            applyFiltersAndRender();
        });
        document.getElementById('filtro-anexo-tipo-dono').addEventListener('change', (e) => {
            currentFilters.ownerType = e.target.value;
            applyFiltersAndRender();
        });
    }

    async function loadAndRenderAttachments() {
        try {
            const attachments = await dbRef.getAllItems(dbRef.STORES.ATTACHMENTS);
            
            const ownerDataMap = new Map();
            const storesToFetch = new Set(attachments.map(a => a.ownerType).filter(Boolean));
            for (const type of storesToFetch) {
                if(STORE_MAP[type]) {
                    const storeName = STORE_MAP[type].storeName;
                    const allItems = await dbRef.getAllItems(storeName);
                    // CORREÇÃO: Filtra para usar apenas itens ativos como proprietários
                    const activeItems = window.SEFWorkStation.EntityConfig.filterActiveItems(allItems, storeName);
                    activeItems.forEach(item => ownerDataMap.set(`${type}-${item.id}`, item));
                }
            }

            allAttachmentsCache = attachments.map(anexo => {
                const owner = ownerDataMap.get(`${anexo.ownerType}-${anexo.ownerId}`);
                return { ...anexo, ownerData: owner };
            }).sort((a,b) => new Date(b.uploadDate) - new Date(a.uploadDate));

            applyFiltersAndRender();
        } catch (error) {
            console.error("AnexosCentral.JS: Erro ao carregar anexos.", error);
            if (globalShowFeedbackRef) globalShowFeedbackRef("Falha ao carregar lista de anexos.", "error");
        }
    }

    // ... (restante do arquivo `anexosCentral.js` sem modificações)
    // ... (applyFiltersAndRender, renderTable, attachTableActionListeners)
    function applyFiltersAndRender() {
        let filtered = [...allAttachmentsCache];

        if (currentFilters.searchTerm) {
            const term = currentFilters.searchTerm.toLowerCase();
            filtered = filtered.filter(a => a.fileName.toLowerCase().includes(term));
        }
        if (currentFilters.ownerType) {
            filtered = filtered.filter(a => a.ownerType === currentFilters.ownerType);
        }
        
        renderTable(filtered);
    }

    function renderTable(anexos) {
        const container = document.getElementById('lista-anexos-central-container');
        if (!container) return;

        if (anexos.length === 0) {
            container.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400 py-8">Nenhum anexo encontrado com os filtros aplicados.</p>`;
            return;
        }

        let tableHtml = `
            <table class="documentos-table">
                <thead>
                    <tr>
                        <th>Nome do Arquivo</th>
                        <th>Item Proprietário</th>
                        <th>Tipo</th>
                        <th>Tamanho</th>
                        <th>Data do Upload</th>
                        <th class="text-center">Ações</th>
                    </tr>
                </thead>
                <tbody>
        `;

        anexos.forEach(anexo => {
            const ownerConfig = anexo.ownerData && STORE_MAP[anexo.ownerType] ? STORE_MAP[anexo.ownerType] : null;
            const ownerName = ownerConfig && anexo.ownerData ? (anexo.ownerData[ownerConfig.displayField] || `ID: ${anexo.ownerId}`) : 'Desconhecido';
            const ownerTypeDisplay = anexo.ownerType ? anexo.ownerType.charAt(0).toUpperCase() + anexo.ownerType.slice(1) : 'N/D';

            tableHtml += `
                <tr data-anexo-id="${anexo.id}" data-anexo-path="${anexo.filePath || ''}">
                    <td class="font-medium">${anexo.fileName}</td>
                    <td>${ownerName}</td>
                    <td>${ownerTypeDisplay}</td>
                    <td>${anexo.fileSize ? (anexo.fileSize / 1024).toFixed(1) + ' KB' : 'N/D'}</td>
                    <td>${anexo.uploadDate ? new Date(anexo.uploadDate).toLocaleString() : 'N/D'}</td>
                    <td class="actions-cell text-center">
                        ${ownerConfig && ownerConfig.viewAction && anexo.ownerData ? `
                            <button class="btn-link btn-anexo-go-to-owner" data-owner-type="${anexo.ownerType}" data-owner-id="${anexo.ownerId}" title="Ir para o item proprietário">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-box-arrow-up-right" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"/><path fill-rule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"/></svg>
                            </button>` : ''
                        }
                        <button class="btn-link btn-anexo-download" data-anexo-path="${anexo.filePath}" data-anexo-name="${anexo.fileName}" title="Baixar">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-download" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
                        </button>
                        <button class="btn-link btn-anexo-delete-central text-red-500" data-anexo-id="${anexo.id}" title="Excluir Anexo">
                             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash-fill" viewBox="0 0 16 16"><path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1H2.5zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5zM8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5zm3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0z"/></svg>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        tableHtml += `</tbody></table>`;
        container.innerHTML = tableHtml;
        attachTableActionListeners();
    }
    
    function attachTableActionListeners() {
        mainContentWrapperRef.querySelectorAll('.btn-anexo-go-to-owner').forEach(btn => {
            btn.addEventListener('click', e => {
                const { ownerType, ownerId } = e.currentTarget.dataset;
                const ownerConfig = STORE_MAP[ownerType];
                if (ownerConfig && ownerConfig.viewAction && appModuleRef.handleMenuAction) {
                    const dataKeyMap = {
                        'visualizar-documento': 'docId', 'visualizar-contribuinte': 'contribuinteId',
                        'visualizar-recurso': 'recursoId', 'visualizar-tarefa': 'tarefaId',
                        'visualizar-nota-rapida': 'notaId', 'visualizar-protocolo': 'protocoloId',
                        'visualizar-pta': 'ptaId', 'visualizar-autuacao': 'autuacaoId'
                    };
                    const dataKey = dataKeyMap[ownerConfig.viewAction] || 'id';
                    appModuleRef.handleMenuAction(ownerConfig.viewAction, { [dataKey]: ownerId });
                }
            });
        });

        mainContentWrapperRef.querySelectorAll('.btn-anexo-download').forEach(btn => {
            btn.addEventListener('click', async e => {
                const anexoPath = e.currentTarget.dataset.anexoPath;
                const anexoFileName = e.currentTarget.dataset.anexoName;
                if (window.SEFWorkStation.SharedUtils?.downloadAttachment) {
                     window.SEFWorkStation.SharedUtils.downloadAttachment(anexoPath, anexoFileName);
                }
            });
        });
        
        mainContentWrapperRef.querySelectorAll('.btn-anexo-delete-central').forEach(btn => {
            btn.addEventListener('click', async e => {
                const anexoId = parseInt(e.currentTarget.dataset.anexoId, 10);
                const anexo = allAttachmentsCache.find(a => a.id === anexoId);

                const confirmar = await uiModuleRef.showConfirmationModal(
                    'Confirmar Exclusão',
                    `Tem certeza que deseja excluir o anexo "${anexo.fileName}"? Esta ação é irreversível e o arquivo será apagado do disco.`
                );

                if (confirmar) {
                    try {
                        await window.SEFWorkStation.SharedUtils.tryDeleteSingleAttachmentFile(anexo.filePath);
                        
                        const ownerConfig = STORE_MAP[anexo.ownerType];
                        if(ownerConfig) {
                            const owner = await dbRef.getItemById(ownerConfig.storeName, anexo.ownerId);
                            if (owner && owner.anexos) {
                                owner.anexos = owner.anexos.filter(a => a.id !== anexo.id && a.filePath !== anexo.filePath);
                                if (owner.modificationDate) owner.modificationDate = new Date().toISOString();
                                if (owner.dataModificacao) owner.dataModificacao = new Date().toISOString();
                                await dbRef.updateItem(ownerConfig.storeName, owner);
                            }
                        }
                        await dbRef.deleteItem(dbRef.STORES.ATTACHMENTS, anexo.id);

                        globalShowFeedbackRef("Anexo excluído com sucesso.", "success");
                        loadAndRenderAttachments(); 
                    } catch (error) {
                        console.error("Erro ao excluir anexo:", error);
                        globalShowFeedbackRef("Falha ao excluir anexo.", "error");
                    }
                }
            });
        });
    }

    return {
        init,
        renderGerenciarAnexosPage
    };
})();