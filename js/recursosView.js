// js/recursosView.js - Lógica para Visualização de Recursos
// v4.2.2 - CORREÇÃO: Reimplementa a função `renderLinkedItemsSectionRecurso` que estava ausente, corrigindo o ReferenceError.
// v4.2.1 - CORREÇÃO: Adota injeção de dependência explícita para o uiModuleRef, resolvendo bugs e inconsistências.
// v4.2.0 - CORREÇÃO: Adiciona a função 'addEventListenersToLinkedItems' que estava faltando, resolvendo o ReferenceError.
// ... (histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.RecursosView = (function() {
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let navigateToListCallback;
    let navigateToFormCallback;
    let refreshApplicationStateRef;
    let dbRef;
    let appModuleRef;
    let uiModuleRef;
    let sharingModuleRef;
    let sharedUtilsRef;

    const RECURSOS_STORE_NAME = 'recursos';
    const CONTRIBUINTES_STORE_NAME = 'contribuintes';
    const DOCUMENTS_STORE_NAME = 'documents';
    const NOTAS_RAPIDAS_STORE_NAME = 'notasRapidasStore';
    const TAREFAS_STORE_NAME = 'tarefasStore';
    const PROTOCOLOS_STORE_NAME = 'protocolosStore';
    const PTAS_STORE_NAME = 'ptasStore';
    const AUTUACOES_STORE_NAME = 'autuacoesStore';
    const SERVIDORES_STORE_NAME = 'servidoresStore';
    const SERVIDORES_GRUPOS_STORE_NAME = 'servidoresGruposStore';

    let currentRecursoId = null;
    let currentRecursoData = null;

    function init(
        mainWrapper,
        showFeedbackFunc,
        clearFeedbackFunc,
        navigateToListCb,
        navigateToFormCbFunc,
        refreshFunc,
        dbModuleRef,
        applicationModuleRef,
        uiRefModule,
        sharingMod,
        utilsMod
    ) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedbackFunc;
        globalClearFeedbackRef = clearFeedbackFunc;
        navigateToListCallback = navigateToListCb;
        navigateToFormCallback = navigateToFormCbFunc;
        refreshApplicationStateRef = refreshFunc;
        dbRef = dbModuleRef;
        appModuleRef = applicationModuleRef;
        uiModuleRef = uiRefModule;
        sharingModuleRef = sharingMod;
        sharedUtilsRef = utilsMod;
        console.log("RecursosView.JS: Módulo inicializado (v4.2.2).");
    }

    async function abrirModalCompartilhamento(item, feedbackAreaEl, storeName) {
        if (!uiModuleRef || !sharingModuleRef || !sharedUtilsRef) {
            globalShowFeedbackRef("Funcionalidade de compartilhamento não está pronta.", "error", feedbackAreaEl, 0);
            return;
        }

        let tempSelectedRecipients = [];
        const config = window.SEFWorkStation.EntityConfig.getConfigByStoreName(storeName);
        const tipoItem = config ? config.labelSingular : 'Item';
        const tituloItem = item[config.displayField] || `ID ${item.id}`;
    
        const modalId = `modal-share-item-${item.id}`;
        const modalContentHtml = `
            <div id="feedback-modal-share-${item.id}" class="mb-3 text-sm"></div>
            <p class="text-sm text-gray-600 dark:text-gray-300 mb-2">Você está compartilhando o item: <strong>${tituloItem}</strong>.</p>
            <div class="mb-4">
                <label for="search-share-recipients-${item.id}" class="block text-sm font-medium">Buscar Servidores ou Grupos:</label>
                <input type="search" id="search-share-recipients-${item.id}" class="form-input-text w-full mt-1" placeholder="Digite para buscar...">
                <div id="suggestions-share-recipients-${item.id}" class="max-h-40 overflow-y-auto border dark:border-slate-600 rounded-md mt-1"></div>
            </div>
            <div>
                <h4 class="text-sm font-medium">Destinatários Selecionados:</h4>
                <div id="selected-share-recipients-${item.id}" class="mt-1 p-2 border dark:border-slate-500 rounded-md bg-gray-100 dark:bg-slate-700 min-h-[40px] max-h-24 overflow-y-auto">
                    <p class="text-xs text-gray-500">Nenhum destinatário selecionado.</p>
                </div>
            </div>
            <div class="mt-4 space-y-2">
                <label class="flex items-center text-sm">
                    <input type="checkbox" id="share-include-vinculos" class="form-checkbox rounded text-blue-600" checked>
                    <span class="ml-2 text-gray-700 dark:text-gray-200">Incluir todos os itens vinculados</span>
                </label>
                <label class="flex items-center text-sm">
                    <input type="checkbox" id="share-include-anexos" class="form-checkbox rounded text-blue-600" checked>
                    <span class="ml-2 text-gray-700 dark:text-gray-200">Incluir anexos físicos (gera arquivo .zip)</span>
                </label>
            </div>
        `;
    
        const modal = uiModuleRef.showModal(`Compartilhar ${tipoItem}`, modalContentHtml, [
            { text: 'Cancelar', class: 'btn-secondary', closesModal: true },
            { 
                text: 'Compartilhar e Notificar', 
                class: 'btn-primary', 
                callback: async () => {
                    if (tempSelectedRecipients.length === 0) {
                        globalShowFeedbackRef("Selecione ao menos um destinatário.", "warning", document.getElementById(`feedback-modal-share-${item.id}`));
                        return false; 
                    }
                    const incluirVinculos = document.getElementById('share-include-vinculos').checked;
                    const incluirAnexos = document.getElementById('share-include-anexos').checked;
    
                    const metaData = await sharingModuleRef.shareItem([{ entityId: item.id, storeName: storeName }], tempSelectedRecipients, { incluirVinculos, incluirAnexos });
                    if (metaData) {
                        sharingModuleRef.prepareNotificationEmail(metaData);
                    }
                    return true;
                },
                closesModal: true
            }
        ], 'max-w-lg', modalId);
        
        const searchInput = modal.querySelector(`#search-share-recipients-${item.id}`);
        const suggestionsContainer = modal.querySelector(`#suggestions-share-recipients-${item.id}`);
        const selectedContainer = modal.querySelector(`#selected-share-recipients-${item.id}`);
        
        const allServers = await dbRef.getAllItems(SERVIDORES_STORE_NAME);
        const allGroups = await dbRef.getAllItems(SERVIDORES_GRUPOS_STORE_NAME);
        
        const allPossibleRecipients = [
            ...allServers.filter(s => !s.isDeleted && s.email).map(s => ({ id: s.id, nome: s.nome, email: s.email, tipo: 'Servidor' })),
            ...allGroups.filter(g => !g.isDeleted).map(g => ({ id: g.id, nome: g.nomeGrupo, tipo: 'Grupo' }))
        ].sort((a,b) => a.nome.localeCompare(b.nome));
    
        const updateSelectedList = () => {
            selectedContainer.innerHTML = tempSelectedRecipients.length > 0 ? '' : '<p class="text-xs text-gray-500">Nenhum destinatário selecionado.</p>';
            tempSelectedRecipients.forEach(rec => {
                const pill = document.createElement('span');
                pill.className = 'inline-flex items-center px-2 py-1 mr-1 mt-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-700 text-blue-800 dark:text-blue-200';
                pill.innerHTML = `<span>${rec.nome} (${rec.tipo})</span> <button data-id="${rec.id}" class="ml-1.5">×</button>`;
                pill.querySelector('button').addEventListener('click', (e) => {
                    tempSelectedRecipients = tempSelectedRecipients.filter(r => r.id !== e.currentTarget.dataset.id);
                    updateSelectedList();
                });
                selectedContainer.appendChild(pill);
            });
        };
    
        searchInput.addEventListener('input', () => {
            const termo = searchInput.value.toLowerCase();
            suggestionsContainer.innerHTML = '';
            if(!termo) return;
    
            const filtered = allPossibleRecipients.filter(r => r.nome.toLowerCase().includes(termo) && !tempSelectedRecipients.some(s => s.id === r.id));
            
            filtered.slice(0, 10).forEach(rec => {
                const itemEl = document.createElement('div');
                itemEl.className = 'p-2 hover:bg-gray-100 dark:hover:bg-slate-600 cursor-pointer text-sm';
                itemEl.textContent = `${rec.nome} (${rec.tipo})`;
                itemEl.addEventListener('click', () => {
                    tempSelectedRecipients.push(rec);
                    searchInput.value = '';
                    suggestionsContainer.innerHTML = '';
                    updateSelectedList();
                });
                suggestionsContainer.appendChild(itemEl);
            });
        });
    }
    
    function addEventListenersToLinkedItems(viewContainer) {
        if (!viewContainer || !appModuleRef || !appModuleRef.handleMenuAction) {
            console.warn("RecursosView: Não foi possível adicionar listeners a itens vinculados (dependências ausentes).");
            return;
        }

        const setupListener = (selector, action) => {
            viewContainer.querySelectorAll(selector).forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const itemId = e.currentTarget.dataset.id;
                    if (itemId) {
                        const dataKeyMap = {
                            'visualizar-documento': 'docId',
                            'visualizar-contribuinte': 'contribuinteId',
                            'visualizar-nota-rapida': 'notaId',
                            'visualizar-tarefa': 'tarefaId',
                            'visualizar-recurso': 'recursoId'
                        };
                        const dataKey = dataKeyMap[action] || 'id';
                        appModuleRef.handleMenuAction(action, { [dataKey]: itemId, originatingView: 'view-recurso' });
                    }
                });
            });
        };
        
        setupListener('.link-view-related-documento-from-recurso', 'visualizar-documento');
        setupListener('.link-view-related-contrib-from-recurso', 'visualizar-contribuinte');
        setupListener('.link-view-related-nota-from-recurso', 'visualizar-nota-rapida');
        setupListener('.link-view-related-tarefa-from-recurso', 'visualizar-tarefa');
    }

    async function renderLinkedItemsSectionRecurso(recurso) {
        if (!recurso) {
            return '<p class="text-sm text-gray-500 dark:text-gray-400">Dados do recurso indisponíveis.</p>';
        }
        let html = '';
        let hasAnyLink = false;
    
        const processLinksForEntity = async (ids, storeName, singularName, pluralName, linkClassPrefix, displayField1, displayField2 = null) => {
            if (!ids || ids.length === 0) return '';
            let itemsHtml = '';
            let count = 0;
            for (const id of ids) {
                try {
                    const item = await dbRef.getItemById(storeName, id);
                    if (item && !item.isDeleted && !item.isExcluida && !item.isArchivedVersion) {
                        hasAnyLink = true;
                        count++;
                        let displayName = item[displayField1] || item.nome || item.titulo || `ID ${id.substring(0,8)}`;
                        if (displayField2 && item[displayField2]) {
                            displayName += ` (${item[displayField2]})`;
                        } else if (displayField2 === 'id_short') {
                            displayName += ` (ID: ${item.id.substring(0,8)})`;
                        }
                        itemsHtml += `<li class="p-1 border-b border-gray-200 dark:border-slate-700 last:border-b-0"><a href="#" class="${linkClassPrefix} text-blue-600 hover:underline dark:text-blue-400 text-xs" data-id="${id}">${displayName}</a></li>`;
                    }
                } catch (e) {
                    console.warn(`Erro ao buscar ${singularName} ID ${id} (de Recurso):`, e);
                }
            }
            if (count > 0) {
                return `<div><h4 class="text-md font-semibold mb-1 text-gray-700 dark:text-gray-200">${pluralName}:</h4><ul class="list-none space-y-1">${itemsHtml}</ul></div>`;
            }
            return '';
        };
    
        let allSectionsHtml = '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">';
    
        // Documentos
        allSectionsHtml += await processLinksForEntity(recurso.documentosVinculadosIds, DOCUMENTS_STORE_NAME, 'Documento', 'Documentos Vinculados', 'link-view-related-documento-from-recurso', 'title', 'reference');
        // Notas Rápidas
        allSectionsHtml += await processLinksForEntity(recurso.notasRapidasRelacionadasIds, NOTAS_RAPIDAS_STORE_NAME, 'Nota Rápida', 'Notas Rápidas Vinculadas', 'link-view-related-nota-from-recurso', 'titulo', 'id_short');
        // Tarefas
        allSectionsHtml += await processLinksForEntity(recurso.tarefasVinculadasIds, TAREFAS_STORE_NAME, 'Tarefa', 'Tarefas Vinculadas', 'link-view-related-tarefa-from-recurso', 'titulo', 'dataVencimento');
        // Outros Contribuintes
        let contribsSecHtml = '';
        let contribsSecCount = 0;
        if (recurso.contribuintesVinculadosIds && recurso.contribuintesVinculadosIds.length > 0) {
            let itemsHtmlList = '';
            for (const id of recurso.contribuintesVinculadosIds) {
                if (id === recurso.contribuintePrincipalId) continue;
                try {
                    const item = await dbRef.getItemById(CONTRIBUINTES_STORE_NAME, id);
                    if (item && !item.isDeleted) {
                        hasAnyLink = true;
                        contribsSecCount++;
                        itemsHtmlList += `<li class="p-1 border-b border-gray-200 dark:border-slate-700 last:border-b-0"><a href="#" class="link-view-related-contrib-from-recurso text-blue-600 hover:underline dark:text-blue-400 text-xs" data-id="${id}">${item.nome || `ID ${id.substring(0,8)}`} (${item.cpfCnpj || 'N/A'})</a></li>`;
                    }
                } catch (e) { console.warn(`Erro ao buscar Contribuinte Sec. ID ${id} (de Recurso):`, e); }
            }
             if (contribsSecCount > 0) {
                 contribsSecHtml = `<div><h4 class="text-md font-semibold mb-1 text-gray-700 dark:text-gray-200">Outros Contribuintes:</h4><ul class="list-none space-y-1">${itemsHtmlList}</ul></div>`;
             }
        }
        allSectionsHtml += contribsSecHtml;
        
        allSectionsHtml += '</div>';
    
        if (!hasAnyLink) {
            return '<p class="text-sm text-gray-500 dark:text-gray-400">Nenhum item diretamente vinculado a este recurso.</p>';
        }
    
        return allSectionsHtml;
    }
    
    async function renderVisualizarRecursoPage(recursoId, originatingView = 'gerir-recursos') {
        currentRecursoId = recursoId;
        const feedbackAreaId = `feedback-recurso-view-${recursoId}`;

        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (!mainContentWrapperRef) {
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico ao renderizar visualização do recurso.", "error");
            return;
        }
        mainContentWrapperRef.innerHTML = `<div id="recurso-view-container-${recursoId}" class="view-recurso-container"><p class="loading-text p-4">A carregar recurso...</p></div>`;
        const viewContainer = document.getElementById(`recurso-view-container-${recursoId}`);
        
        try {
            currentRecursoData = await dbRef.getItemById(RECURSOS_STORE_NAME, recursoId);

            if (!currentRecursoData || currentRecursoData.isArchivedVersion) {
                if(globalShowFeedbackRef && viewContainer) globalShowFeedbackRef("Recurso não encontrado ou é uma versão arquivada.", "error", viewContainer);
                if(appModuleRef && appModuleRef.handleMenuAction) appModuleRef.handleMenuAction('gerir-recursos');
                return;
            }
            
            if (currentRecursoData.isDeleted && originatingView !== 'lixeira-global' && originatingView !== 'lixeira') {
                 if (globalShowFeedbackRef) globalShowFeedbackRef("Este recurso está na lixeira.", "info", viewContainer);
                 viewContainer.innerHTML = `<div class="p-4"><p class="feedback-message info">Este recurso (ID: ${recursoId}) encontra-se na lixeira. Para visualizá-lo ou restaurá-lo, acesse a Lixeira.</p>
                                           <button id="btn-voltar-view-recurso" class="btn-secondary mt-4">Voltar</button></div>`;
                document.getElementById('btn-voltar-view-recurso')?.addEventListener('click', () => {
                    if (appModuleRef && appModuleRef.navigateBack) appModuleRef.navigateBack();
                });
                return;
            }

            const statusBadgeClass = SEFWorkStation.RecursosListagens ? SEFWorkStation.RecursosListagens.getStatusBadgeClass(currentRecursoData.status) : 'bg-gray-200';
            const prioridadeBadgeClass = SEFWorkStation.RecursosListagens ? SEFWorkStation.RecursosListagens.getPrioridadeBadgeClass(currentRecursoData.prioridade) : 'bg-gray-200';


            let contribuinteHtml = '<p class="text-sm text-gray-500 dark:text-gray-400">Nenhum contribuinte principal vinculado.</p>';
            if (currentRecursoData.contribuintePrincipalId) {
                try {
                    const contr = await dbRef.getItemById(CONTRIBUINTES_STORE_NAME, currentRecursoData.contribuintePrincipalId);
                    if (contr && !contr.isDeleted && !contr.isArchivedVersion) {
                        contribuinteHtml = `<a href="#" class="link-view-related-contrib-from-recurso text-blue-600 hover:underline dark:text-blue-400" data-id="${contr.id}">${contr.nome} (${contr.cpfCnpj || 'N/A'})</a>`;
                    } else if (contr && (contr.isDeleted || contr.isArchivedVersion)) {
                        contribuinteHtml = `<span class="text-sm text-gray-400 dark:text-gray-500" title="Este contribuinte está na lixeira ou é uma versão arquivada.">${contr.nome} (Inativo)</span>`;
                    } else {
                         contribuinteHtml = `<p class="text-sm text-orange-500 dark:text-orange-400">Contribuinte vinculado (ID: ${currentRecursoData.contribuintePrincipalId}) não encontrado ou inválido.</p>`;
                    }
                } catch (e) { console.warn("RecursosView.JS: Erro ao buscar contribuinte vinculado:", e); }
            }
            
            let andamentosDecisoesArray = currentRecursoData.despachosDecisoes || [];
            let andamentosHtml = '<p class="text-sm text-gray-500 dark:text-gray-400">Nenhum andamento/decisão registrado.</p>';
            if (andamentosDecisoesArray.length > 0) {
                andamentosHtml = '<ul class="list-disc list-inside space-y-2 pl-1 text-sm">';
                andamentosDecisoesArray.sort((a, b) => new Date(b.data) - new Date(a.data)).forEach(item => {
                    andamentosHtml += `
                        <li class="historico-item border-b border-gray-200 dark:border-slate-700 pb-1.5 mb-1.5 last:border-b-0 last:pb-0 last:mb-0">
                            <strong class="font-medium">${new Date(item.data).toLocaleString()}:</strong>
                            <p class="ml-4 my-0.5 whitespace-pre-wrap">${item.texto || item.descricao}</p> 
                            ${item.tipoAndamento ? `<span class="text-xs text-gray-500 dark:text-gray-400 ml-4">Tipo: ${item.tipoAndamento}</span>` : ''}
                            ${item.responsavel ? `<br><span class="text-xs text-gray-500 dark:text-gray-400 ml-4">Responsável: ${item.responsavel}</span>` : ''}
                        </li>`;
                });
                andamentosHtml += '</ul>';
            }
            
            const anexoHtml = (anexos) => {
                if (!anexos || anexos.length === 0) return '<p class="text-sm text-gray-500 dark:text-gray-400">Nenhum anexo.</p>';
                return `<ul class="list-none p-0 space-y-2">${anexos.map(anexo => {
                    if (anexo && anexo.fileName && typeof anexo.fileSize === 'number') {
                        return `<li class="anexo-preview-item"><span>${anexo.fileName} (${(anexo.fileSize / 1024).toFixed(1)} KB)</span>
                                <button class="btn-link btn-download-anexo-recurso text-xs" data-anexo-path="${anexo.filePath || ''}" data-anexo-name="${anexo.fileName}" title="Baixar/Abrir Anexo">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-download inline-block" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg> Abrir</button>
                                </li>`;
                    } return '';
                }).join('')}</ul>`;
            };
            
            const linkedItemsHtmlContent = await renderLinkedItemsSectionRecurso(currentRecursoData);

            const viewHtml = `
                <div id="${feedbackAreaId}" class="mb-4"></div>
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                    <h2 class="text-2xl font-semibold mb-1">${currentRecursoData.titulo || "Recurso Sem Título"}</h2>
                     <div class="actions-group flex flex-wrap gap-2 section-not-for-print">
                        <button id="btn-voltar-view-recurso" class="btn-secondary btn-sm">Voltar</button>
                        ${!currentRecursoData.isDeleted ? `<button id="btn-editar-recurso-view" class="btn-primary btn-sm">Editar</button>` : ''}
                        ${!currentRecursoData.isDeleted ? `<button id="btn-share-recurso-view" class="btn-secondary bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white btn-sm" title="Compartilhar este recurso"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-share-fill inline-block mr-1" viewBox="0 0 16 16"><path d="M11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5z"/></svg> Compartilhar</button>` : ''}
                    </div>
                </div>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">ID: ${currentRecursoData.numeroIdentificacao || currentRecursoData.id}</p>

                <div class="space-y-6">
                    <div class="card">
                        <h3 class="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-200 border-b pb-2 dark:border-slate-700">Detalhes Principais</h3>
                        <dl class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                            <div class="info-item"><dt>Status:</dt><dd><span class="badge-status ${statusBadgeClass}">${currentRecursoData.status || 'Não definido'}</span></dd></div>
                            <div class="info-item"><dt>Prioridade:</dt><dd><span class="badge-prioridade ${prioridadeBadgeClass}">${currentRecursoData.prioridade || 'Não definida'}</span></dd></div>
                            <div class="info-item"><dt>Prazo de Resposta:</dt><dd>${currentRecursoData.dataLimiteResposta ? new Date(currentRecursoData.dataLimiteResposta+'T00:00:00').toLocaleDateString() : 'Não definida'}</dd></div>
                            <div class="info-item"><dt>Data de Apresentação:</dt><dd>${currentRecursoData.dataApresentacao ? new Date(currentRecursoData.dataApresentacao+'T00:00:00').toLocaleDateString() : 'Não definida'}</dd></div>
                            <div class="info-item"><dt>Tipo de Recurso:</dt><dd>${currentRecursoData.tipoRecurso || 'Não especificado'}</dd></div>
                            <div class="md:col-span-2 lg:col-span-3 info-item"><dt>Contribuinte Principal:</dt><dd>${contribuinteHtml}</dd></div>
                            <div class="md:col-span-2 lg:col-span-3 info-item"><dt>Link Externo:</dt><dd>${currentRecursoData.linkExterno ? `<a href="${currentRecursoData.linkExterno}" target="_blank" class="text-blue-600 hover:underline dark:text-blue-400 break-all">${currentRecursoData.linkExterno}</a>` : 'Nenhum'}</dd></div>
                        </dl>
                    </div>

                    <div class="card">
                        <h3 class="text-lg font-semibold mb-2">Descrição</h3>
                        <div class="prose dark:prose-invert max-w-none text-sm">${currentRecursoData.descricao ? currentRecursoData.descricao.replace(/\n/g, '<br>') : '<p class="text-gray-500 dark:text-gray-400">Nenhuma descrição detalhada.</p>'}</div>
                    </div>
                    
                     <div class="card">
                        <div class="flex justify-between items-center mb-2"><h3 class="text-lg font-semibold">Andamentos e Decisões</h3>${!currentRecursoData.isDeleted ? `<button id="btn-add-andamento-recurso-view" class="btn-secondary btn-sm text-xs">Adicionar Andamento</button>` : ''}</div>
                        <div class="andamentos-decisoes-container">${andamentosHtml}</div>
                    </div>

                    <div class="card section-not-for-print"><h3 class="text-lg font-semibold mb-2">Itens Vinculados</h3>${linkedItemsHtmlContent}</div>

                    <div class="card section-not-for-print"><h3 class="text-lg font-semibold mb-2">Anexos</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div><h4 class="text-md font-medium mb-1">Anexo da Decisão:</h4>${anexoHtml(currentRecursoData.anexoDecisaoFinalPath ? [{fileName: currentRecursoData.anexoDecisaoFinalPath.split('/').pop(), fileSize: currentRecursoData.anexoDecisaoSize || 0, filePath: currentRecursoData.anexoDecisaoFinalPath}] : [])}</div>
                            <div><h4 class="text-md font-medium mb-1">Anexos Gerais:</h4>${anexoHtml(currentRecursoData.anexos)}</div>
                        </div>
                    </div>
                </div>

                <div class="mt-8 flex flex-wrap gap-2 section-not-for-print">
                    <button id="btn-enviar-email-recurso-view" class="btn-secondary">Enviar por Email</button>
                    ${!currentRecursoData.isDeleted ? `<button id="btn-excluir-recurso-view" class="btn-delete">Mover para Lixeira</button>` : 
                        (originatingView === 'lixeira-global' || originatingView === 'lixeira' ?
                            `<button id="btn-restaurar-recurso-view" class="btn-secondary">Restaurar</button>
                             <button id="btn-excluir-permanente-recurso-view" class="btn-delete">Excluir Permanentemente</button>`
                             : '')
                    }
                </div>
            `;
            if(viewContainer) viewContainer.innerHTML = viewHtml;
            addEventListenersToRecursoView(currentRecursoData, originatingView, document.getElementById(feedbackAreaId));

        } catch (error) {
            console.error("RecursosView.JS: Erro ao renderizar recurso:", error);
            if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao carregar recurso: ${error.message}`, "error", viewContainer);
        }
    }
    
    function getStatusBadgeClassRecurso(status) {
        if (window.SEFWorkStation.RecursosListagens) {
            return window.SEFWorkStation.RecursosListagens.getStatusBadgeClass(status);
        }
        return 'bg-gray-200 text-gray-700 dark:bg-gray-500 dark:text-gray-100'; // Fallback
    }

    function getPrioridadeBadgeClassRecurso(prioridade) {
         if (window.SEFWorkStation.RecursosListagens) {
            return window.SEFWorkStation.RecursosListagens.getPrioridadeBadgeClass(prioridade);
        }
        return 'bg-gray-400 text-white'; // Fallback
    }

    function addEventListenersToRecursoView(recursoData, originatingView, localFeedbackArea) {
        const viewContainer = document.getElementById(`recurso-view-container-${recursoData.id}`);
        if (!viewContainer) return;

        addEventListenersToLinkedItems(viewContainer);

        viewContainer.querySelector('#btn-voltar-view-recurso')?.addEventListener('click', () => {
            if (appModuleRef && appModuleRef.navigateBack) {
                appModuleRef.navigateBack();
            } else {
                 if (appModuleRef && appModuleRef.handleMenuAction) {
                    appModuleRef.handleMenuAction(originatingView || 'gerir-recursos');
                }
            }
        });

        viewContainer.querySelector('#btn-editar-recurso-view')?.addEventListener('click', () => {
            if (navigateToFormCallback) {
                navigateToFormCallback(recursoData, originatingView);
            }
        });
        
        viewContainer.querySelector('#btn-add-andamento-recurso-view')?.addEventListener('click', () => {
            if (uiModuleRef && typeof uiModuleRef.showModal === 'function') {
                const modalId = `modal-add-andamento-${recursoData.id}`;
                const modalHtml = `
                    <div id="feedback-modal-andamento" class="mb-3"></div>
                    <form id="form-novo-andamento-recurso">
                        <div class="mb-3">
                            <label for="andamento-texto" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição do Andamento/Decisão:</label>
                            <textarea id="andamento-texto" rows="4" class="form-input-text mt-1 block w-full" required></textarea>
                        </div>
                        <div class="mb-3">
                             <label for="andamento-tipo" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo (Opcional):</label>
                            <input type="text" id="andamento-tipo" class="form-input-text mt-1 block w-full" placeholder="Ex: Despacho, Decisão, Informação">
                        </div>
                        <div class="mb-3">
                             <label for="andamento-responsavel" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Responsável (Opcional):</label>
                            <input type="text" id="andamento-responsavel" class="form-input-text mt-1 block w-full">
                        </div>
                    </form>
                `;
                const modalButtons = [
                    { text: 'Cancelar', class: 'btn-secondary', callback: () => uiModuleRef.closeModal() },
                    { 
                        text: 'Salvar Andamento', 
                        class: 'btn-primary', 
                        callback: async () => {
                            const textoAndamento = document.getElementById('andamento-texto').value.trim();
                            const tipoAndamento = document.getElementById('andamento-tipo').value.trim();
                            const responsavelAndamento = document.getElementById('andamento-responsavel').value.trim();
                            const feedbackModalEl = document.getElementById('feedback-modal-andamento');

                            if (!textoAndamento) {
                                if (globalShowFeedbackRef && feedbackModalEl) globalShowFeedbackRef("A descrição do andamento é obrigatória.", "error", feedbackModalEl, 3000);
                                return false; 
                            }
                            try {
                                const recursoAtual = await dbRef.getItemById(RECURSOS_STORE_NAME, recursoData.id);
                                if (!recursoAtual) {
                                    if (globalShowFeedbackRef && feedbackModalEl) globalShowFeedbackRef("Recurso não encontrado para adicionar andamento.", "error", feedbackModalEl, 0);
                                    return true; 
                                }
                                recursoAtual.despachosDecisoes = recursoAtual.despachosDecisoes || [];
                                recursoAtual.despachosDecisoes.push({
                                    data: new Date().toISOString(),
                                    texto: textoAndamento, 
                                    tipoAndamento: tipoAndamento || 'Andamento Manual',
                                    responsavel: responsavelAndamento || (appModuleRef && appModuleRef.getUserPreference ? appModuleRef.getUserPreference('userName') || 'Usuário Atual' : 'Usuário Atual')
                                });
                                recursoAtual.modificationDate = new Date().toISOString();
                                await dbRef.updateItem(RECURSOS_STORE_NAME, recursoAtual);
                                if (globalShowFeedbackRef && localFeedbackArea) globalShowFeedbackRef("Novo andamento adicionado com sucesso!", "success", localFeedbackArea);
                                await renderVisualizarRecursoPage(recursoData.id, originatingView); 
                                return true; 
                            } catch (error) {
                                console.error("Erro ao salvar andamento:", error);
                                if (globalShowFeedbackRef && feedbackModalEl) globalShowFeedbackRef("Erro ao salvar andamento: " + error.message, "error", feedbackModalEl, 0);
                                return false; 
                            }
                        } 
                    }
                ];
                uiModuleRef.showModal("Adicionar Andamento/Decisão ao Recurso", modalHtml, modalButtons, 'max-w-lg', modalId);
            } else {
                if (globalShowFeedbackRef && localFeedbackArea) globalShowFeedbackRef("Funcionalidade de modal não disponível.", "error", localFeedbackArea);
            }
        });
        
        viewContainer.querySelector('#btn-share-recurso-view')?.addEventListener('click', () => {
            abrirModalCompartilhamento(recursoData, localFeedbackArea, RECURSOS_STORE_NAME);
        });

        viewContainer.querySelector('#btn-enviar-email-recurso-view')?.addEventListener('click', () => {
            if (!appModuleRef || typeof appModuleRef.handleMenuAction !== 'function') {
                if (globalShowFeedbackRef && localFeedbackArea) globalShowFeedbackRef("Erro: Funcionalidade de navegação não disponível.", "error", localFeedbackArea);
                return;
            }
            if (!currentRecursoData) {
                if (globalShowFeedbackRef && localFeedbackArea) globalShowFeedbackRef("Erro: Dados do recurso não carregados.", "error", localFeedbackArea);
                return;
            }
        
            const anexosParaCompositor = [];
            (currentRecursoData.anexos || []).forEach(anexo => {
                anexosParaCompositor.push({
                    fileName: anexo.fileName,
                    filePath: anexo.filePath,
                    fileSize: anexo.fileSize,
                    id: anexo.id || anexo.fileName,
                    ownerType: 'recurso',
                    ownerId: currentRecursoData.id
                });
            });
        
            if (currentRecursoData.anexoDecisaoFinalPath) {
                const fileName = currentRecursoData.anexoDecisaoFinalPath.split('/').pop();
                anexosParaCompositor.push({
                    fileName: fileName,
                    filePath: currentRecursoData.anexoDecisaoFinalPath,
                    fileSize: currentRecursoData.anexoDecisaoSize || 0,
                    id: fileName,
                    ownerType: 'recurso',
                    ownerId: currentRecursoData.id
                });
            }
            
            const corpoHtmlRecurso = currentRecursoData.descricao ? `<p>${currentRecursoData.descricao.replace(/\n/g, '<br>')}</p>` : "";
        
            const dadosParaCompositor = {
                assunto: `Recurso: ${currentRecursoData.titulo || currentRecursoData.numeroIdentificacao || currentRecursoData.id}`,
                corpoHtml: corpoHtmlRecurso,
                anexos: anexosParaCompositor,
                origem: "recurso",
                idEntidadeOrigem: currentRecursoData.id,
                originatingView: 'view-recurso'
            };
            appModuleRef.handleMenuAction('escrever-email', dadosParaCompositor);
        });

        viewContainer.querySelector('#btn-excluir-recurso-view')?.addEventListener('click', async () => {
            if (confirm(`Tem certeza que deseja mover o recurso "${currentRecursoData.titulo || 'ID ' + currentRecursoData.id}" para a lixeira?`)) {
                const recursoParaLixeira = await dbRef.getItemById(RECURSOS_STORE_NAME, currentRecursoData.id);
                if (recursoParaLixeira) {
                    recursoParaLixeira.isDeleted = true;
                    recursoParaLixeira.modificationDate = new Date().toISOString();
                    await dbRef.updateItem(RECURSOS_STORE_NAME, recursoParaLixeira);
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Recurso movido para a lixeira.", "success", localFeedbackArea);
                    if (refreshApplicationStateRef) await refreshApplicationStateRef();
                    
                    if (appModuleRef && appModuleRef.navigateBack) appModuleRef.navigateBack();
                    else if (appModuleRef && appModuleRef.handleMenuAction) appModuleRef.handleMenuAction(originatingView || 'gerir-recursos');
                }
            }
        });
        
        viewContainer.querySelector('#btn-restaurar-recurso-view')?.addEventListener('click', async () => {
            currentRecursoData.isDeleted = false;
            currentRecursoData.modificationDate = new Date().toISOString();
            await dbRef.updateItem(RECURSOS_STORE_NAME, currentRecursoData);
            if (globalShowFeedbackRef) globalShowFeedbackRef("Recurso restaurado da lixeira.", "success", localFeedbackArea);
            if (refreshApplicationStateRef) await refreshApplicationStateRef();
            renderVisualizarRecursoPage(currentRecursoData.id, originatingView); 
        });

        viewContainer.querySelector('#btn-excluir-permanente-recurso-view')?.addEventListener('click', async () => {
            if (confirm(`EXCLUSÃO PERMANENTE: Tem certeza que deseja excluir permanentemente o recurso "${currentRecursoData.titulo || 'ID ' + currentRecursoData.id}"? Esta ação NÃO PODE ser desfeita e os anexos serão apagados.`)) {
                if (window.SEFWorkStation && window.SEFWorkStation.SharedUtils && typeof window.SEFWorkStation.SharedUtils.tryDeleteEntityAttachmentFolder === 'function') {
                   await window.SEFWorkStation.SharedUtils.tryDeleteEntityAttachmentFolder('recursos', currentRecursoData.id, globalShowFeedbackRef, localFeedbackArea);
                }
                
                if (window.SEFWorkStation.SharedUtils && typeof window.SEFWorkStation.SharedUtils.desvincularEntidadeDeTodasAsOutras === 'function') {
                    await window.SEFWorkStation.SharedUtils.desvincularEntidadeDeTodasAsOutras(currentRecursoData.id, RECURSOS_STORE_NAME, dbRef);
                }

                await dbRef.deleteItem(RECURSOS_STORE_NAME, currentRecursoData.id);
                if (globalShowFeedbackRef) globalShowFeedbackRef("Recurso excluído permanentemente.", "success", localFeedbackArea);
                if (refreshApplicationStateRef) await refreshApplicationStateRef();
                
                if (appModuleRef && appModuleRef.navigateBack) appModuleRef.navigateBack();
                else if (appModuleRef && appModuleRef.handleMenuAction) appModuleRef.handleMenuAction(originatingView || 'lixeira-global');
            }
        });

        viewContainer.querySelectorAll('.btn-download-anexo-recurso').forEach(button => {
            button.addEventListener('click', async (event) => {
                const anexoPath = event.currentTarget.dataset.anexoPath;
                const anexoFileName = event.currentTarget.dataset.anexoName;

                if (!window.directoryHandle) {
                    if (globalShowFeedbackRef && localFeedbackArea) globalShowFeedbackRef("Pasta da aplicação não definida.", "error", localFeedbackArea);
                    return;
                }
                 if (!anexoPath) {
                    if (globalShowFeedbackRef && localFeedbackArea) globalShowFeedbackRef(`Caminho do anexo "${anexoFileName}" não definido.`, "error", localFeedbackArea);
                    return;
                }
                try {
                    const attachmentsRootSefDir = await window.directoryHandle.getDirectoryHandle('attachments_sef', { create: false });
                    const pathParts = anexoPath.split('/');
                    let currentHandle = attachmentsRootSefDir;
                    for (let i = 0; i < pathParts.length - 1; i++) {
                        currentHandle = await currentHandle.getDirectoryHandle(pathParts[i], { create: false });
                    }
                    const fileHandle = await currentHandle.getFileHandle(pathParts[pathParts.length - 1], { create: false });
                    const file = await fileHandle.getFile();

                    const url = URL.createObjectURL(file);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = anexoFileName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    if (globalShowFeedbackRef && localFeedbackArea) globalShowFeedbackRef(`Anexo "${anexoFileName}" pronto para download/abertura.`, 'success', localFeedbackArea);

                } catch (error) {
                    console.error(`RecursosView.JS: Erro ao aceder anexo "${anexoFileName}" em "${anexoPath}":`, error);
                    if (globalShowFeedbackRef && localFeedbackArea) globalShowFeedbackRef(`Erro ao abrir/baixar anexo "${anexoFileName}": ${error.message}. Verifique se o arquivo existe na pasta da aplicação.`, 'error', localFeedbackArea);
                }
            });
        });
    }

    return {
        init,
        renderVisualizarRecursoPage
    };
})();