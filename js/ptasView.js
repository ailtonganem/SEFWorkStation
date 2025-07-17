// js/ptasView.js - Lógica para Visualização de PTAs
// v0.9.1 - CORREÇÃO: Adiciona verificação para não mostrar itens vinculados que sejam versões arquivadas.
// v0.9.0 - Adiciona botão e lógica para compartilhar PTA.
// v0.8.1 - Remove classe page-section para expandir a largura da visualização.
// ... (histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.PTAView = (function() {
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

    const PTAS_STORE_NAME = 'ptasStore';
    const PTA_TYPES_STORE_NAME = 'ptaTypesStore';
    const DOCUMENTS_STORE_NAME = 'documents';
    const CONTRIBUINTES_STORE_NAME = 'contribuintes';
    const TAREFAS_STORE_NAME = 'tarefasStore';
    const NOTAS_RAPIDAS_STORE_NAME = 'notasRapidasStore';
    const PROTOCOLOS_STORE_NAME = 'protocolosStore';
    const SERVIDORES_STORE_NAME = 'servidoresStore';
    const SERVIDORES_GRUPOS_STORE_NAME = 'servidoresGruposStore';
    const AUTUACOES_STORE_NAME = 'autuacoesStore'; 


    let currentPTAId = null;
    let currentPTAData = null;

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
        autuacaoFormModuleRef, // Dependência para criar autuação
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
        console.log("PTAView.JS: Módulo inicializado (v0.9.1).");
    }

    async function abrirModalCompartilhamento(item, feedbackAreaEl, storeName) {
        if (!uiModuleRef || !sharingModuleRef || !sharedUtilsRef) {
            globalShowFeedbackRef("Funcionalidade de compartilhamento não está pronta.", "error", feedbackAreaEl);
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

    async function renderVisualizarPTAPage(ptaId, originatingView = 'gerir-ptas') {
        currentPTAId = ptaId;
        const feedbackAreaId = `feedback-pta-view-${ptaId}`;

        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (!mainContentWrapperRef) {
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico ao renderizar visualização do PTA.", "error");
            return;
        }
        mainContentWrapperRef.innerHTML = `<div id="pta-view-container-${ptaId}"><p class="loading-text p-4">A carregar PTA...</p></div>`;
        const viewContainer = document.getElementById(`pta-view-container-${ptaId}`);

        if (appModuleRef && typeof appModuleRef.setCurrentViewTarget === 'function') {
            appModuleRef.setCurrentViewTarget('view-pta');
        }

        try {
            currentPTAData = await dbRef.getItemById(PTAS_STORE_NAME, ptaId);

            if (!currentPTAData) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("PTA não encontrado.", "error", viewContainer);
                return;
            }
            
            if (currentPTAData.isDeleted && originatingView !== 'lixeira-global' && originatingView !== 'lixeira') {
                 if (globalShowFeedbackRef) globalShowFeedbackRef("Este PTA está na lixeira.", "info", viewContainer);
                 viewContainer.innerHTML = `<p class="feedback-message info p-4">Este PTA (ID: ${ptaId}) encontra-se na lixeira. Para visualizá-lo ou restaurá-lo, acesse a Lixeira.</p>
                                           <button id="btn-voltar-view-pta" class="btn-secondary mt-4">Voltar</button>`;
                document.getElementById('btn-voltar-view-pta')?.addEventListener('click', () => {
                    if (appModuleRef && appModuleRef.navigateBack) appModuleRef.navigateBack();
                });
                return;
            }

            const statusBadgeClass = getStatusBadgeClassPTA(currentPTAData.statusPTA);
            
            let tipoPTAHtml = currentPTAData.tipoPTA || 'Não especificado';
            if (currentPTAData.tipoPTAId) {
                try {
                    const tipo = await dbRef.getItemById(PTA_TYPES_STORE_NAME, currentPTAData.tipoPTAId);
                    if (tipo) tipoPTAHtml = tipo.name;
                } catch(e) { console.warn("Erro ao buscar nome do tipo de PTA:", e); }
            }

            let servidorResponsavelHtml = '<p class="text-sm text-gray-500 dark:text-gray-400">Nenhum servidor responsável.</p>';
            if (currentPTAData.servidorResponsavelId) { 
                try {
                    const servidor = await dbRef.getItemById(SERVIDORES_STORE_NAME, currentPTAData.servidorResponsavelId);
                    if (servidor && !servidor.isDeleted) {
                         servidorResponsavelHtml = `<a href="#" class="link-view-related-servidor-from-pta text-blue-600 hover:underline dark:text-blue-400" data-id="${servidor.id}">${servidor.nome} (${servidor.matricula || 'N/A'})</a>`;
                    } else if (servidor && servidor.isDeleted) {
                        servidorResponsavelHtml = `<span class="text-sm text-gray-400 dark:text-gray-500" title="Este servidor está na lixeira.">${servidor.nome} (Na Lixeira)</span>`;
                    } else {
                        servidorResponsavelHtml = `<p class="text-sm text-orange-500 dark:text-orange-400">Servidor responsável (ID: ${currentPTAData.servidorResponsavelId}) não encontrado.</p>`;
                    }
                } catch (e) { console.warn("PTAView.JS: Erro ao buscar servidor responsável:", e); }
            } else if (currentPTAData.servidorResponsavelPTA) { 
                 servidorResponsavelHtml = `<p class="text-sm">${currentPTAData.servidorResponsavelPTA}</p>`;
            }


            let andamentosHtml = '<p class="text-sm text-gray-500 dark:text-gray-400">Nenhum andamento registrado.</p>';
            if (currentPTAData.historicoAndamentoPTA && currentPTAData.historicoAndamentoPTA.length > 0) {
                andamentosHtml = '<ul class="list-disc list-inside space-y-2 pl-1 text-sm">';
                currentPTAData.historicoAndamentoPTA.sort((a, b) => new Date(b.data) - new Date(a.data)).forEach(item => {
                    andamentosHtml += `
                        <li class="historico-item border-b border-gray-200 dark:border-slate-700 pb-1.5 mb-1.5 last:border-b-0 last:pb-0 last:mb-0">
                            <strong class="font-medium">${new Date(item.data).toLocaleString()}:</strong>
                            <p class="ml-4 my-0.5">${item.descricao.replace(/\n/g, '<br>')}</p>
                            ${item.tipoAndamento ? `<span class="text-xs text-gray-500 dark:text-gray-400 ml-4">Tipo: ${item.tipoAndamento}</span>` : ''}
                            ${item.responsavel ? `<br><span class="text-xs text-gray-500 dark:text-gray-400 ml-4">Responsável: ${item.responsavel}</span>` : ''}
                        </li>`;
                });
                andamentosHtml += '</ul>';
            }

            let anexosHtml = '<p class="text-sm text-gray-500 dark:text-gray-400">Nenhum anexo.</p>';
            if (currentPTAData.anexos && currentPTAData.anexos.length > 0) {
                anexosHtml = '<ul class="list-none p-0">';
                 currentPTAData.anexos.forEach(anexo => {
                     if (anexo && anexo.fileName && typeof anexo.fileSize === 'number') {
                        anexosHtml += `
                            <li class="anexo-preview-item">
                                <span>${anexo.fileName} (${(anexo.fileSize / 1024).toFixed(1)} KB)</span>
                                <button class="btn-link btn-download-anexo-pta text-xs" data-anexo-path="${anexo.filePath || ''}" data-anexo-name="${anexo.fileName}" title="Baixar/Abrir Anexo">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-download inline-block" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
                                    Abrir
                                </button>
                            </li>`;
                     }
                });
                anexosHtml += '</ul>';
            }
            
            let linkedItemsHtml = await renderLinkedItemsSectionPTA(currentPTAData);

            const viewHtml = `
                <div id="${feedbackAreaId}" class="mb-4"></div>
                <h2 class="text-2xl font-semibold mb-1">${currentPTAData.assuntoPTA || "PTA Sem Assunto"}</h2>
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-4">Nº PTA: ${currentPTAData.numeroPTA || 'N/A'} (ID: ${currentPTAData.id})</p>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Status:</label>
                        <span class="badge-status ${statusBadgeClass}">${currentPTAData.statusPTA || 'Não definido'}</span>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Data do PTA:</label>
                        <p class="text-sm">${currentPTAData.dataPTA ? new Date(currentPTAData.dataPTA).toLocaleDateString() : 'Não definida'}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de PTA:</label>
                        <p class="text-sm">${tipoPTAHtml}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Interessado Principal:</label>
                        <p class="text-sm">${currentPTAData.interessadoPrincipal || 'Não informado'}</p>
                    </div>
                     <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Servidor Responsável:</label>
                        ${servidorResponsavelHtml}
                    </div>
                </div>

                <div class="pta-view-section">
                    <h3 class="text-lg font-semibold mb-2">Descrição Detalhada</h3>
                    <div class="prose dark:prose-invert max-w-none text-sm">${currentPTAData.descricaoDetalhadaPTA ? currentPTAData.descricaoDetalhadaPTA.replace(/\n/g, '<br>') : '<p class="text-gray-500 dark:text-gray-400">Nenhuma descrição detalhada.</p>'}</div>
                </div>

                <div class="pta-view-section mt-4">
                    <h3 class="text-lg font-semibold mb-2">Histórico de Andamento</h3>
                    ${andamentosHtml}
                </div>
                
                <div class="pta-view-section mt-4 section-not-for-print">
                    <h3 class="text-lg font-semibold mb-2">Itens Vinculados e Gerados</h3>
                    ${linkedItemsHtml}
                </div>

                <div class="pta-view-section mt-4 section-not-for-print">
                    <h3 class="text-lg font-semibold mb-2">Anexos</h3>
                    ${anexosHtml}
                </div>

                <div class="pta-view-actions mt-8 flex flex-wrap gap-2 section-not-for-print">
                    <button id="btn-voltar-view-pta" class="btn-secondary">Voltar</button>
                    ${!currentPTAData.isDeleted ? `<button id="btn-editar-pta-view" class="btn-primary">Editar PTA</button>` : ''}
                    ${!currentPTAData.isDeleted ? `<button id="btn-share-pta-view" class="btn-secondary bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white" title="Compartilhar este PTA"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-share-fill inline-block mr-1" viewBox="0 0 16 16"><path d="M11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5z"/></svg> Compartilhar</button>` : ''}
                    ${!currentPTAData.isDeleted ? `<button id="btn-add-andamento-pta-view" class="btn-secondary">Adicionar Andamento</button>` : ''}
                    ${!currentPTAData.isDeleted ? `<button id="btn-criar-autuacao-deste-pta" class="btn-primary bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600">Criar Autuação deste PTA</button>` : ''}
                    <button id="btn-enviar-email-pta-view" class="btn-secondary">Enviar por Email</button> ${!currentPTAData.isDeleted ? `<button id="btn-excluir-pta-view" class="btn-delete">Mover para Lixeira</button>` : 
                        (originatingView === 'lixeira-global' || originatingView === 'lixeira' ?
                            `<button id="btn-restaurar-pta-view" class="btn-secondary">Restaurar</button>
                             <button id="btn-excluir-permanente-pta-view" class="btn-delete">Excluir Permanentemente</button>`
                             : '')
                    }
                </div>
            `;
            viewContainer.innerHTML = viewHtml;
            addEventListenersToPTAView(currentPTAData, originatingView, document.getElementById(feedbackAreaId));

        } catch (error) {
            console.error("PTAView.JS: Erro ao renderizar PTA:", error);
            if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao carregar PTA: ${error.message}`, "error", viewContainer);
        }
    }
    
    async function renderLinkedItemsSectionPTA(pta) {
        if (!pta) return '<p class="text-sm text-gray-500 dark:text-gray-400">Dados do PTA indisponíveis.</p>';
        
        let html = '<ul class="list-none p-0 text-xs">';
        let hasLinks = false;

        const processLinks = async (ids, storeName, singularName, viewActionPrefix, dataKey, linkType = "vinculado") => {
            if (ids && ids.length > 0) {
                for (const id of ids) {
                    try {
                        const item = await dbRef.getItemById(storeName, id);
                        // CORREÇÃO: Adiciona verificação para isArchivedVersion
                        if (item && !item.isDeleted && !item.isExcluida && !item.isArchivedVersion) { 
                            hasLinks = true;
                            let displayName = item.title || item.nome || item.numeroProtocolo || `ID ${id.substring(0,8)}`;
                            if (singularName === "Protocolo" && item.numeroProtocolo) displayName = `Protocolo ${item.numeroProtocolo}`;
                            else if (singularName === "Autuação" && item.numeroAutuacao) displayName = `Autuação ${item.numeroAutuacao}`;
                            
                            html += `<li class="mb-1"><a href="#" class="link-view-related-${singularName.toLowerCase().replace(' ', '')}-from-pta text-blue-600 hover:underline dark:text-blue-400" data-id="${id}" data-type="${linkType}">${singularName}${linkType === "originario" ? " de Origem" : ""}: ${displayName}</a></li>`;
                        }
                    } catch (e) { console.warn(`Erro ao buscar ${singularName} ID ${id} (de PTA):`, e); }
                }
            }
        };
        
        if (pta.protocolosOriginariosIds && pta.protocolosOriginariosIds.length > 0) {
            html += '<h4 class="text-xs font-semibold mt-2 mb-0.5">Protocolo(s) de Origem:</h4>';
            await processLinks(pta.protocolosOriginariosIds, PROTOCOLOS_STORE_NAME, 'Protocolo', 'protocolo', 'protocoloId', "originario");
        }

        html += '<h4 class="text-xs font-semibold mt-2 mb-0.5">Outros Vínculos:</h4>';
        await processLinks(pta.documentosVinculadosIds, DOCUMENTS_STORE_NAME, 'Documento', 'documento', 'docId');
        await processLinks(pta.contribuintesVinculadosIds, CONTRIBUINTES_STORE_NAME, 'Contribuinte', 'contribuinte', 'contribuinteId');
        await processLinks(pta.tarefasVinculadasIds, TAREFAS_STORE_NAME, 'Tarefa', 'tarefa', 'tarefaId');
        await processLinks(pta.notasRapidasRelacionadasIds, NOTAS_RAPIDAS_STORE_NAME, 'Nota Rápida', 'nota', 'notaId'); 
        await processLinks(pta.servidoresVinculadosIds, SERVIDORES_STORE_NAME, 'Servidor', 'servidor', 'servidorId');

        if (pta.autuacoesGeradasIds && pta.autuacoesGeradasIds.length > 0) {
            html += '<h4 class="text-xs font-semibold mt-2 mb-0.5">Autuações Geradas:</h4>';
            await processLinks(pta.autuacoesGeradasIds, AUTUACOES_STORE_NAME, 'Autuação', 'autuacao', 'autuacaoId', "gerado");
        }
        
        if (!hasLinks) {
            html += '<li><p class="text-sm text-gray-500 dark:text-gray-400">Nenhum item vinculado ou gerado a partir deste PTA.</p></li>';
        }
        html += '</ul>';
        return html;
    }

    function addEventListenersToPTAView(ptaData, originatingView, localFeedbackArea) {
        const viewContainer = document.getElementById(`pta-view-container-${ptaData.id}`);
        if (!viewContainer) return;

        viewContainer.querySelector('#btn-voltar-view-pta')?.addEventListener('click', () => {
            if (appModuleRef && appModuleRef.navigateBack) {
                appModuleRef.navigateBack();
            } else {
                if (appModuleRef && appModuleRef.handleMenuAction) {
                    appModuleRef.handleMenuAction(originatingView || 'gerir-ptas');
                }
            }
        });

        viewContainer.querySelector('#btn-editar-pta-view')?.addEventListener('click', () => {
            if (navigateToFormCallback) {
                navigateToFormCallback(ptaData, originatingView);
            }
        });

        viewContainer.querySelector('#btn-add-andamento-pta-view')?.addEventListener('click', () => {
            if (uiModuleRef && uiModuleRef.showModal) {
                 const modalId = `modal-add-andamento-pta-${ptaData.id}`;
                const modalHtml = `
                    <div id="feedback-modal-andamento-pta" class="mb-3"></div>
                    <form id="form-novo-andamento-pta">
                        <div class="mb-3">
                            <label for="andamento-descricao-pta" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição do Andamento/Despacho:</label>
                            <textarea id="andamento-descricao-pta" rows="4" class="form-input-text mt-1 block w-full" required></textarea>
                        </div>
                        <div class="mb-3">
                             <label for="andamento-tipo-pta" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo (Opcional):</label>
                            <input type="text" id="andamento-tipo-pta" class="form-input-text mt-1 block w-full" placeholder="Ex: Despacho, Juntada, Decisão">
                        </div>
                        <div class="mb-3">
                             <label for="andamento-responsavel-pta" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Responsável (Opcional):</label>
                            <input type="text" id="andamento-responsavel-pta" class="form-input-text mt-1 block w-full">
                        </div>
                    </form>
                `;
                const modalButtons = [
                    { text: 'Cancelar', class: 'btn-secondary', callback: () => uiModuleRef.closeModal() },
                    { 
                        text: 'Salvar Andamento', 
                        class: 'btn-primary', 
                        callback: async () => {
                            const descricaoAndamento = document.getElementById('andamento-descricao-pta').value.trim();
                            const tipoAndamento = document.getElementById('andamento-tipo-pta').value.trim();
                            const responsavelAndamento = document.getElementById('andamento-responsavel-pta').value.trim();
                            const feedbackModalEl = document.getElementById('feedback-modal-andamento-pta');

                            if (!descricaoAndamento) {
                                if (globalShowFeedbackRef && feedbackModalEl) globalShowFeedbackRef("A descrição do andamento é obrigatória.", "error", feedbackModalEl, 3000);
                                return false; 
                            }
                            try {
                                const ptaAtual = await dbRef.getItemById(PTAS_STORE_NAME, ptaData.id);
                                if (!ptaAtual) {
                                    if (globalShowFeedbackRef && feedbackModalEl) globalShowFeedbackRef("PTA não encontrado para adicionar andamento.", "error", feedbackModalEl, 0);
                                    return true; 
                                }
                                ptaAtual.historicoAndamentoPTA = ptaAtual.historicoAndamentoPTA || [];
                                ptaAtual.historicoAndamentoPTA.push({
                                    data: new Date().toISOString(),
                                    descricao: descricaoAndamento, 
                                    tipoAndamento: tipoAndamento || 'Andamento Manual',
                                    responsavel: responsavelAndamento || (appModuleRef && appModuleRef.getUserPreference ? appModuleRef.getUserPreference('userName') || 'Usuário Atual' : 'Usuário Atual')
                                });
                                ptaAtual.dataModificacao = new Date().toISOString();
                                await dbRef.updateItem(PTAS_STORE_NAME, ptaAtual);
                                if (globalShowFeedbackRef && localFeedbackArea) globalShowFeedbackRef("Novo andamento adicionado com sucesso!", "success", localFeedbackArea);
                                await renderVisualizarPTAPage(ptaData.id, originatingView); 
                                return true; 
                            } catch (error) {
                                console.error("Erro ao salvar andamento do PTA:", error);
                                if (globalShowFeedbackRef && feedbackModalEl) globalShowFeedbackRef("Erro ao salvar andamento: " + error.message, "error", feedbackModalEl, 0);
                                return false; 
                            }
                        } 
                    }
                ];
                uiModuleRef.showModal("Adicionar Andamento ao PTA", modalHtml, modalButtons, 'max-w-lg', modalId);
            } else {
                if (globalShowFeedbackRef && localFeedbackArea) globalShowFeedbackRef("Funcionalidade de modal não disponível.", "error", localFeedbackArea);
            }
        });
        
        viewContainer.querySelector('#btn-criar-autuacao-deste-pta')?.addEventListener('click', () => {
            if (appModuleRef && typeof appModuleRef.handleMenuAction === 'function') {
                appModuleRef.handleMenuAction('cadastrar-autuacao', { 
                    originatingView: 'view-pta',
                    preSelectedLink: { type: 'pta', id: ptaData.id }
                });
            } else {
                 if(globalShowFeedbackRef && localFeedbackArea) globalShowFeedbackRef("Funcionalidade de Formulário de Autuação não disponível.", "error", localFeedbackArea);
                 console.error("PTAView.JS: appModuleRef.handleMenuAction não disponível para criar Autuação.");
            }
        });
        
        // CORREÇÃO APLICADA AQUI
        viewContainer.querySelector('#btn-share-pta-view')?.addEventListener('click', () => {
            abrirModalCompartilhamento(ptaData, localFeedbackArea, PTAS_STORE_NAME);
        });
        
        viewContainer.querySelector('#btn-enviar-email-pta-view')?.addEventListener('click', () => {
            if (!appModuleRef || typeof appModuleRef.handleMenuAction !== 'function') {
                if (globalShowFeedbackRef && localFeedbackArea) globalShowFeedbackRef("Erro: Funcionalidade de navegação não disponível.", "error", localFeedbackArea);
                return;
            }
            if (!currentPTAData) {
                if (globalShowFeedbackRef && localFeedbackArea) globalShowFeedbackRef("Erro: Dados do PTA não carregados.", "error", localFeedbackArea);
                return;
            }

            const anexosParaCompositor = (currentPTAData.anexos || []).map(anexo => ({
                fileName: anexo.fileName,
                filePath: anexo.filePath, 
                fileSize: anexo.fileSize,
                id: anexo.id || anexo.fileName,
                ownerType: 'pta',
                ownerId: currentPTAData.id
            }));
            
            const corpoHtmlPTA = currentPTAData.descricaoDetalhadaPTA 
                ? `<p>${currentPTAData.descricaoDetalhadaPTA.replace(/\n/g, '<br>')}</p>` 
                : "";

            const dadosParaCompositor = {
                assunto: `PTA Nº ${currentPTAData.numeroPTA || currentPTAData.id}${currentPTAData.assuntoPTA ? ` - ${currentPTAData.assuntoPTA}` : ''}`,
                corpoHtml: corpoHtmlPTA,
                anexos: anexosParaCompositor,
                origem: "pta",
                idEntidadeOrigem: currentPTAData.id,
                originatingView: 'view-pta'
            };
            appModuleRef.handleMenuAction('escrever-email', dadosParaCompositor);
        });

        viewContainer.querySelector('#btn-excluir-pta-view')?.addEventListener('click', async () => {
            if (confirm(`Tem certeza que deseja mover o PTA "${currentPTAData.numeroPTA || 'ID ' + currentPTAData.id}" para a lixeira?`)) {
                const ptaParaLixeira = await dbRef.getItemById(PTAS_STORE_NAME, currentPTAData.id);
                if (ptaParaLixeira) {
                    ptaParaLixeira.isDeleted = true;
                    ptaParaLixeira.dataModificacao = new Date().toISOString();
                    await dbRef.updateItem(PTAS_STORE_NAME, ptaParaLixeira);
                    if (globalShowFeedbackRef) globalShowFeedbackRef("PTA movido para a lixeira.", "success", localFeedbackArea);
                    if (refreshApplicationStateRef) await refreshApplicationStateRef();
                    
                    if (appModuleRef && appModuleRef.navigateBack) appModuleRef.navigateBack();
                    else if (appModuleRef && appModuleRef.handleMenuAction) appModuleRef.handleMenuAction(originatingView || 'gerir-ptas');
                }
            }
        });
        
        viewContainer.querySelector('#btn-restaurar-pta-view')?.addEventListener('click', async () => {
            currentPTAData.isDeleted = false;
            currentPTAData.dataModificacao = new Date().toISOString();
            await dbRef.updateItem(PTAS_STORE_NAME, currentPTAData);
            if (globalShowFeedbackRef) globalShowFeedbackRef("PTA restaurado da lixeira.", "success", localFeedbackArea);
            if (refreshApplicationStateRef) await refreshApplicationStateRef();
            renderVisualizarPTAPage(currentPTAData.id, originatingView); 
        });

        viewContainer.querySelector('#btn-excluir-permanente-pta-view')?.addEventListener('click', async () => {
            if (confirm(`EXCLUSÃO PERMANENTE: Tem certeza que deseja excluir permanentemente o PTA "${currentPTAData.numeroPTA || 'ID ' + currentPTAData.id}"? Esta ação NÃO PODE ser desfeita e os anexos serão apagados.`)) {
                if (window.SEFWorkStation && window.SEFWorkStation.SharedUtils && typeof window.SEFWorkStation.SharedUtils.tryDeleteEntityAttachmentFolder === 'function') {
                   await window.SEFWorkStation.SharedUtils.tryDeleteEntityAttachmentFolder('processos/ptas', currentPTAData.id, globalShowFeedbackRef, localFeedbackArea);
                }
                
                if (window.SEFWorkStation.SharedUtils && typeof window.SEFWorkStation.SharedUtils.desvincularEntidadeDeTodasAsOutras === 'function') {
                    await window.SEFWorkStation.SharedUtils.desvincularEntidadeDeTodasAsOutras(currentPTAData.id, PTAS_STORE_NAME, dbRef);
                }

                await dbRef.deleteItem(PTAS_STORE_NAME, currentPTAData.id);
                if (globalShowFeedbackRef) globalShowFeedbackRef("PTA excluído permanentemente.", "success", localFeedbackArea);
                if (refreshApplicationStateRef) await refreshApplicationStateRef();
                
                if (appModuleRef && appModuleRef.navigateBack) appModuleRef.navigateBack();
                else if (appModuleRef && appModuleRef.handleMenuAction) appModuleRef.handleMenuAction(originatingView || 'lixeira-global');
            }
        });

        viewContainer.querySelectorAll('.link-view-related-protocolo-from-pta').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const protocoloId = e.currentTarget.dataset.id;
                if (SEFWorkStation.ProtocolosView && SEFWorkStation.ProtocolosView.renderVisualizarProtocoloPage) {
                    SEFWorkStation.ProtocolosView.renderVisualizarProtocoloPage(protocoloId, 'view-pta');
                }
            });
        });
        viewContainer.querySelectorAll('.link-view-related-documento-from-pta').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const docId = e.currentTarget.dataset.id;
                if (SEFWorkStation.DocumentosView && SEFWorkStation.DocumentosView.renderVisualizarDocumentoPage) {
                    SEFWorkStation.DocumentosView.renderVisualizarDocumentoPage(docId, 'view-pta');
                }
            });
        });
        viewContainer.querySelectorAll('.link-view-related-contribuinte-from-pta').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const contribId = e.currentTarget.dataset.id;
                 if (SEFWorkStation.ContribuintesView && SEFWorkStation.ContribuintesView.renderVisualizarContribuintePage) {
                    SEFWorkStation.ContribuintesView.renderVisualizarContribuintePage(contribId, 'view-pta');
                }
            });
        });
        viewContainer.querySelectorAll('.link-view-related-tarefa-from-pta').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tarefaId = e.currentTarget.dataset.id;
                if (SEFWorkStation.TarefasView && SEFWorkStation.TarefasView.renderVisualizarTarefaPage) {
                    SEFWorkStation.TarefasView.renderVisualizarTarefaPage(tarefaId, 'view-pta');
                }
            });
        });
        viewContainer.querySelectorAll('.link-view-related-nota-from-pta').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const notaId = e.currentTarget.dataset.id;
                if (SEFWorkStation.NotasRapidasView && SEFWorkStation.NotasRapidasView.renderVisualizarNotaPage) {
                    SEFWorkStation.NotasRapidasView.renderVisualizarNotaPage(notaId, 'view-pta');
                }
            });
        });
         viewContainer.querySelectorAll('.link-view-related-servidor-from-pta').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const servidorId = e.currentTarget.dataset.id;
                if (SEFWorkStation.ServidoresView && SEFWorkStation.ServidoresView.renderVisualizarServidorPage) {
                    SEFWorkStation.ServidoresView.renderVisualizarServidorPage(servidorId, 'view-pta');
                }
            });
        });
        
        viewContainer.querySelectorAll('.link-view-related-autuacao-from-pta').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const autuacaoId = e.currentTarget.dataset.id;
                if (SEFWorkStation.AutuacaoView && SEFWorkStation.AutuacaoView.renderVisualizarAutuacaoPage) {
                    SEFWorkStation.AutuacaoView.renderVisualizarAutuacaoPage(autuacaoId, 'view-pta');
                } else { console.warn("Módulo AutuacaoView não encontrado para navegação."); }
            });
        });
        

        viewContainer.querySelectorAll('.btn-download-anexo-pta').forEach(button => {
            button.addEventListener('click', async (event) => {
                const anexoPath = event.currentTarget.dataset.anexoPath;
                const anexoFileName = event.currentTarget.dataset.anexoName;
                const feedbackElLocal = document.getElementById(feedbackAreaId);

                if (!window.directoryHandle) {
                    if (globalShowFeedbackRef && feedbackElLocal) globalShowFeedbackRef("Pasta da aplicação não definida.", "error", feedbackElLocal);
                    return;
                }
                if (!anexoPath) {
                    if (globalShowFeedbackRef && feedbackElLocal) globalShowFeedbackRef(`Caminho do anexo "${anexoFileName}" não definido.`, "error", feedbackElLocal);
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
                    a.href = url; a.download = anexoFileName;
                    document.body.appendChild(a); a.click(); document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    if (globalShowFeedbackRef && feedbackElLocal) globalShowFeedbackRef(`Anexo "${anexoFileName}" pronto para download/abertura.`, 'success', feedbackElLocal);

                } catch (error) {
                    if (globalShowFeedbackRef && feedbackElLocal) globalShowFeedbackRef(`Erro ao abrir/baixar anexo "${anexoFileName}": ${error.message}. Verifique se o arquivo existe na pasta da aplicação. Caminho esperado: attachments_sef/${anexoPath}`, 'error', feedbackElLocal);
                 }
            });
        });
    }
    
    function getStatusBadgeClassPTA(status) {
        if (SEFWorkStation.ProtocolosView && typeof SEFWorkStation.ProtocolosView.getStatusBadgeClassProtocolo === 'function') {
            return SEFWorkStation.ProtocolosView.getStatusBadgeClassProtocolo(status); 
        }
        switch (status) {
            case 'Em Elaboração': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
            case 'Submetido': return 'bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-200';
            case 'Em Análise': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-600 dark:text-yellow-100';
            case 'Deferido': return 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-200';
            case 'Indeferido': return 'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-200';
            case 'Arquivado': return 'bg-purple-100 text-purple-800 dark:bg-purple-700 dark:text-purple-200';
            case 'Recurso Pendente': return 'bg-pink-100 text-pink-800 dark:bg-pink-700 dark:text-pink-200';
            case 'Cancelado': return 'bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-300';
            case 'Convertido em Autuação': return 'bg-orange-100 text-orange-800 dark:bg-orange-700 dark:text-orange-200';
            default: return 'bg-gray-200 text-gray-700 dark:bg-gray-500 dark:text-gray-100';
        }
    }

    return {
        init,
        renderVisualizarPTAPage,
        getStatusBadgeClassPTA
    };
})();