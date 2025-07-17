// js/protocolosView.js - Lógica para Visualização de Protocolos
// v0.15.2 - CORREÇÃO: Adiciona verificação para não mostrar itens vinculados que sejam versões arquivadas.
// v0.15.1 - CORREÇÃO: Injeta dependências de compartilhamento e implementa modal de compartilhamento.
// v0.15.0 - Adiciona botão e lógica para compartilhar Protocolo.
// ... (histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.ProtocolosView = (function() {
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

    const PROTOCOLOS_STORE_NAME = 'protocolosStore';
    const PROTOCOL_TYPES_STORE_NAME = 'protocolTypesStore';
    const DOCUMENTS_STORE_NAME = 'documents';
    const CONTRIBUINTES_STORE_NAME = 'contribuintes';
    const TAREFAS_STORE_NAME = 'tarefasStore';
    const NOTAS_RAPIDAS_STORE_NAME = 'notasRapidasStore';
    const SERVIDORES_STORE_NAME = 'servidoresStore';
    const SERVIDORES_GRUPOS_STORE_NAME = 'servidoresGruposStore';
    const PTAS_STORE_NAME = 'ptasStore';
    const AUTUACOES_STORE_NAME = 'autuacoesStore'; 


    let currentProtocoloId = null;
    let currentProtocoloData = null;

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
        console.log("ProtocolosView.JS: Módulo inicializado (v0.15.2).");
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

    async function renderVisualizarProtocoloPage(protocoloId, originatingView = 'gerir-protocolos') {
        currentProtocoloId = protocoloId;
        const feedbackAreaId = `feedback-protocolo-view-${protocoloId}`;

        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (!mainContentWrapperRef) {
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico ao renderizar visualização do protocolo.", "error");
            return;
        }
        mainContentWrapperRef.innerHTML = `<div id="protocolo-view-container-${protocoloId}"><p class="loading-text p-4">A carregar protocolo...</p></div>`;
        const viewContainer = document.getElementById(`protocolo-view-container-${protocoloId}`);

        if (appModuleRef && typeof appModuleRef.setCurrentViewTarget === 'function') {
            appModuleRef.setCurrentViewTarget('view-protocolo');
        }

        try {
            currentProtocoloData = await dbRef.getItemById(PROTOCOLOS_STORE_NAME, protocoloId);

            if (!currentProtocoloData) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("Protocolo não encontrado.", "error", viewContainer);
                return;
            }
            
            if (currentProtocoloData.isDeleted && originatingView !== 'lixeira-global' && originatingView !== 'lixeira') {
                 if (globalShowFeedbackRef) globalShowFeedbackRef("Este protocolo está na lixeira.", "info", viewContainer);
                 viewContainer.innerHTML = `<p class="feedback-message info p-4">Este protocolo (ID: ${protocoloId}) encontra-se na lixeira. Para visualizá-lo ou restaurá-lo, acesse a Lixeira.</p>
                                           <button id="btn-voltar-view-protocolo" class="btn-secondary mt-4">Voltar</button>`;
                document.getElementById('btn-voltar-view-protocolo')?.addEventListener('click', () => {
                    if (appModuleRef && appModuleRef.navigateBack) appModuleRef.navigateBack();
                });
                return;
            }

            const statusBadgeClass = getStatusBadgeClassProtocolo(currentProtocoloData.statusProtocolo);
            
            let tipoProtocoloHtml = currentProtocoloData.tipoProtocolo || 'Não especificado';
            if (currentProtocoloData.tipoProtocoloId) {
                try {
                    const tipo = await dbRef.getItemById(PROTOCOL_TYPES_STORE_NAME, currentProtocoloData.tipoProtocoloId);
                    if (tipo) tipoProtocoloHtml = tipo.name;
                } catch(e) { console.warn("Erro ao buscar nome do tipo de protocolo:", e); }
            }

            let servidorResponsavelHtml = '<p class="text-sm text-gray-500 dark:text-gray-400">Nenhum servidor responsável.</p>';
            if (currentProtocoloData.servidorResponsavelId) {
                try {
                    const servidor = await dbRef.getItemById(SERVIDORES_STORE_NAME, currentProtocoloData.servidorResponsavelId);
                    if (servidor && !servidor.isDeleted) {
                         servidorResponsavelHtml = `<a href="#" class="link-view-related-servidor-from-protocolo text-blue-600 hover:underline dark:text-blue-400" data-id="${servidor.id}">${servidor.nome} (${servidor.matricula || 'N/A'})</a>`;
                    } else if (servidor && servidor.isDeleted) {
                        servidorResponsavelHtml = `<span class="text-sm text-gray-400 dark:text-gray-500" title="Este servidor está na lixeira.">${servidor.nome} (Na Lixeira)</span>`;
                    } else {
                        servidorResponsavelHtml = `<p class="text-sm text-orange-500 dark:text-orange-400">Servidor responsável (ID: ${currentProtocoloData.servidorResponsavelId}) não encontrado.</p>`;
                    }
                } catch (e) { console.warn("ProtocolosView.JS: Erro ao buscar servidor responsável:", e); }
            } else if (currentProtocoloData.servidorResponsavel) { 
                servidorResponsavelHtml = `<p class="text-sm">${currentProtocoloData.servidorResponsavel}</p>`;
            }


            let andamentosHtml = '<p class="text-sm text-gray-500 dark:text-gray-400">Nenhum andamento registrado.</p>';
            if (currentProtocoloData.historicoAndamentoProtocolo && currentProtocoloData.historicoAndamentoProtocolo.length > 0) {
                andamentosHtml = '<ul class="list-disc list-inside space-y-2 pl-1 text-sm">';
                currentProtocoloData.historicoAndamentoProtocolo.sort((a, b) => new Date(b.data) - new Date(a.data)).forEach(item => {
                    andamentosHtml += `
                        <li class="historico-item border-b border-gray-200 dark:border-slate-700 pb-1.5 mb-1.5 last:border-b-0 last:pb-0 last:mb-0">
                            <strong class="font-medium">${new Date(item.data).toLocaleString()}:</strong>
                            <p class="ml-4 my-0.5 whitespace-pre-wrap">${item.descricao ? item.descricao.replace(/\n/g, '<br>') : 'Sem descrição.'}</p>
                            ${item.tipoAndamento ? `<span class="text-xs text-gray-500 dark:text-gray-400 ml-4">Tipo: ${item.tipoAndamento}</span>` : ''}
                            ${item.responsavel ? `<br><span class="text-xs text-gray-500 dark:text-gray-400 ml-4">Responsável: ${item.responsavel}</span>` : ''}
                        </li>`;
                });
                andamentosHtml += '</ul>';
            }

            let anexosHtml = '<p class="text-sm text-gray-500 dark:text-gray-400">Nenhum anexo.</p>';
            if (currentProtocoloData.anexos && currentProtocoloData.anexos.length > 0) {
                anexosHtml = '<ul class="list-none p-0">';
                 currentProtocoloData.anexos.forEach(anexo => {
                     if (anexo && anexo.fileName && typeof anexo.fileSize === 'number') {
                        anexosHtml += `
                            <li class="anexo-preview-item">
                                <span>${anexo.fileName} (${(anexo.fileSize / 1024).toFixed(1)} KB)</span>
                                <button class="btn-link btn-download-anexo-protocolo text-xs" data-anexo-path="${anexo.filePath || ''}" data-anexo-name="${anexo.fileName}" title="Baixar/Abrir Anexo">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-download inline-block" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
                                    Abrir
                                </button>
                            </li>`;
                     }
                });
                anexosHtml += '</ul>';
            }
            
            let linkedItemsHtml = await renderLinkedItemsSectionProtocolo(currentProtocoloData);


            const viewHtml = `
                <div id="${feedbackAreaId}" class="mb-4"></div>
                <h2 class="text-2xl font-semibold mb-1">${currentProtocoloData.assunto || "Protocolo Sem Assunto"}</h2>
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-4">Nº Protocolo: ${currentProtocoloData.numeroProtocolo || 'N/A'} (ID: ${currentProtocoloData.id})</p>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Status:</label>
                        <span class="badge-status ${statusBadgeClass}">${currentProtocoloData.statusProtocolo || 'Não definido'}</span>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Data de Protocolo:</label>
                        <p class="text-sm">${currentProtocoloData.dataProtocolo ? new Date(currentProtocoloData.dataProtocolo).toLocaleDateString() : 'Não definida'}</p>
                    </div>
                     <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de Protocolo:</label>
                        <p class="text-sm">${tipoProtocoloHtml}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Interessado Principal:</label>
                        <p class="text-sm">${currentProtocoloData.interessadoPrincipal || 'Não informado'}</p>
                    </div>
                     <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Servidor Responsável:</label>
                        ${servidorResponsavelHtml}
                    </div>
                </div>

                <div class="protocolo-view-section">
                    <h3 class="text-lg font-semibold mb-2">Descrição Detalhada</h3>
                    <div class="prose dark:prose-invert max-w-none text-sm">${currentProtocoloData.descricaoDetalhada ? currentProtocoloData.descricaoDetalhada.replace(/\n/g, '<br>') : '<p class="text-gray-500 dark:text-gray-400">Nenhuma descrição detalhada.</p>'}</div>
                </div>

                <div class="protocolo-view-section mt-4">
                    <h3 class="text-lg font-semibold mb-2">Histórico de Andamento</h3>
                    ${andamentosHtml}
                </div>
                
                <div class="protocolo-view-section mt-4 section-not-for-print">
                    <h3 class="text-lg font-semibold mb-2">Itens Vinculados e Gerados</h3>
                    ${linkedItemsHtml}
                </div>

                <div class="protocolo-view-section mt-4 section-not-for-print">
                    <h3 class="text-lg font-semibold mb-2">Anexos</h3>
                    ${anexosHtml}
                </div>

                <div class="protocolo-view-actions mt-8 flex flex-wrap gap-2 section-not-for-print">
                    <button id="btn-voltar-view-protocolo" class="btn-secondary">Voltar</button>
                    ${!currentProtocoloData.isDeleted ? `<button id="btn-editar-protocolo-view" class="btn-primary">Editar Protocolo</button>` : ''}
                    ${!currentProtocoloData.isDeleted ? `<button id="btn-share-protocolo-view" class="btn-secondary bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white" title="Compartilhar este protocolo"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-share-fill inline-block mr-1" viewBox="0 0 16 16"><path d="M11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5z"/></svg> Compartilhar</button>` : ''}
                    ${!currentProtocoloData.isDeleted ? `<button id="btn-add-andamento-protocolo-view" class="btn-secondary">Adicionar Andamento</button>` : ''}
                    ${!currentProtocoloData.isDeleted ? `<button id="btn-criar-pta-deste-protocolo" class="btn-primary bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600">Criar PTA deste Protocolo</button>` : ''}
                    ${!currentProtocoloData.isDeleted ? `<button id="btn-criar-autuacao-deste-protocolo" class="btn-primary bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600">Criar Autuação deste Protocolo</button>` : ''}
                    <button id="btn-enviar-email-protocolo-view" class="btn-secondary">Enviar por Email</button> ${!currentProtocoloData.isDeleted ? `<button id="btn-excluir-protocolo-view" class="btn-delete">Mover para Lixeira</button>` : 
                        (originatingView === 'lixeira-global' || originatingView === 'lixeira' ?
                            `<button id="btn-restaurar-protocolo-view" class="btn-secondary">Restaurar</button>
                             <button id="btn-excluir-permanente-protocolo-view" class="btn-delete">Excluir Permanentemente</button>`
                             : '')
                    }
                </div>
            `;
            viewContainer.innerHTML = viewHtml;
            addEventListenersToProtocoloView(currentProtocoloData, originatingView, document.getElementById(feedbackAreaId));

        } catch (error) {
            console.error("ProtocolosView.JS: Erro ao renderizar protocolo:", error);
            if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao carregar protocolo: ${error.message}`, "error", viewContainer);
        }
    }
    
    async function renderLinkedItemsSectionProtocolo(protocolo) {
        if (!protocolo) return '<p class="text-sm text-gray-500 dark:text-gray-400">Dados do protocolo indisponíveis.</p>';
        
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
                            if (singularName === "PTA" && item.numeroPTA) displayName = `PTA ${item.numeroPTA}`;
                            else if (singularName === "Autuação" && item.numeroAutuacao) displayName = `Autuação ${item.numeroAutuacao}`;
                            
                            html += `<li class="mb-1"><a href="#" class="link-view-related-${singularName.toLowerCase().replace(' ', '')}-from-protocolo text-blue-600 hover:underline dark:text-blue-400" data-id="${id}" data-type="${linkType}">${singularName}${linkType === "gerado" ? " Gerado" : ""}: ${displayName}</a></li>`;
                        }
                    } catch (e) { console.warn(`Erro ao buscar ${singularName} ID ${id} (de Protocolo):`, e); }
                }
            }
        };

        html += '<h4 class="text-xs font-semibold mt-2 mb-0.5">Outros Vínculos:</h4>';
        await processLinks(protocolo.documentosVinculadosIds, DOCUMENTS_STORE_NAME, 'Documento', 'documento', 'docId');
        await processLinks(protocolo.contribuintesVinculadosIds, CONTRIBUINTES_STORE_NAME, 'Contribuinte', 'contribuinte', 'contribuinteId');
        await processLinks(protocolo.tarefasVinculadasIds, TAREFAS_STORE_NAME, 'Tarefa', 'tarefa', 'tarefaId');
        await processLinks(protocolo.notasRapidasRelacionadasIds, NOTAS_RAPIDAS_STORE_NAME, 'Nota Rápida', 'nota', 'notaId');
        await processLinks(protocolo.servidoresVinculadosIds, SERVIDORES_STORE_NAME, 'Servidor', 'servidor', 'servidorId');

        if (protocolo.ptasGeradosIds && protocolo.ptasGeradosIds.length > 0) {
            html += '<h4 class="text-xs font-semibold mt-2 mb-0.5">PTAs Gerados:</h4>';
            await processLinks(protocolo.ptasGeradosIds, PTAS_STORE_NAME, 'PTA', 'pta', 'ptaId', "gerado");
        }

        if (protocolo.autuacoesGeradasIds && protocolo.autuacoesGeradasIds.length > 0) {
            html += '<h4 class="text-xs font-semibold mt-2 mb-0.5">Autuações Geradas:</h4>';
            await processLinks(protocolo.autuacoesGeradasIds, AUTUACOES_STORE_NAME, 'Autuação', 'autuacao', 'autuacaoId', "gerado");
        }
        
        if (!hasLinks) {
            html += '<li><p class="text-sm text-gray-500 dark:text-gray-400">Nenhum item vinculado ou gerado a partir deste protocolo.</p></li>';
        }
        html += '</ul>';
        return html;
    }

    function addEventListenersToProtocoloView(protocoloData, originatingView, localFeedbackArea) {
        const viewContainer = document.getElementById(`protocolo-view-container-${protocoloData.id}`);
        if (!viewContainer) return;

        viewContainer.querySelector('#btn-voltar-view-protocolo')?.addEventListener('click', () => {
            if (appModuleRef && appModuleRef.navigateBack) {
                appModuleRef.navigateBack();
            } else {
                 if (appModuleRef && appModuleRef.handleMenuAction) {
                    appModuleRef.handleMenuAction(originatingView || 'gerir-protocolos');
                }
            }
        });

        viewContainer.querySelector('#btn-editar-protocolo-view')?.addEventListener('click', () => {
            if (navigateToFormCallback) {
                navigateToFormCallback(protocoloData, originatingView);
            }
        });

        viewContainer.querySelector('#btn-add-andamento-protocolo-view')?.addEventListener('click', () => {
            if (uiModuleRef && uiModuleRef.showModal) {
                const modalId = `modal-add-andamento-${protocoloData.id}`;
                const modalHtml = `
                    <div id="feedback-modal-andamento" class="mb-3"></div>
                    <form id="form-novo-andamento">
                        <div class="mb-3">
                            <label for="andamento-descricao" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição do Andamento/Encaminhamento:</label>
                            <textarea id="andamento-descricao" rows="4" class="form-input-text mt-1 block w-full" required></textarea>
                        </div>
                        <div class="mb-3">
                             <label for="andamento-tipo" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo (Opcional):</label>
                            <input type="text" id="andamento-tipo" class="form-input-text mt-1 block w-full" placeholder="Ex: Despacho, Encaminhamento, Informação">
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
                            const descricaoAndamento = document.getElementById('andamento-descricao').value.trim();
                            const tipoAndamento = document.getElementById('andamento-tipo').value.trim();
                            const responsavelAndamento = document.getElementById('andamento-responsavel').value.trim();
                            const feedbackModalEl = document.getElementById('feedback-modal-andamento');

                            if (!descricaoAndamento) {
                                if (globalShowFeedbackRef && feedbackModalEl) globalShowFeedbackRef("A descrição do andamento é obrigatória.", "error", feedbackModalEl, 3000);
                                return false; 
                            }
                            try {
                                const protocoloAtual = await dbRef.getItemById(PROTOCOLOS_STORE_NAME, protocoloData.id);
                                if (!protocoloAtual) {
                                    if (globalShowFeedbackRef && feedbackModalEl) globalShowFeedbackRef("Protocolo não encontrado para adicionar andamento.", "error", feedbackModalEl, 0);
                                    return true; 
                                }
                                protocoloAtual.historicoAndamentoProtocolo = protocoloAtual.historicoAndamentoProtocolo || [];
                                protocoloAtual.historicoAndamentoProtocolo.push({
                                    data: new Date().toISOString(),
                                    descricao: descricaoAndamento, 
                                    tipoAndamento: tipoAndamento || 'Andamento Manual',
                                    responsavel: responsavelAndamento || (appModuleRef && appModuleRef.getUserPreference ? appModuleRef.getUserPreference('userName') || 'Usuário Atual' : 'Usuário Atual')
                                });
                                protocoloAtual.dataModificacao = new Date().toISOString();
                                await dbRef.updateItem(PROTOCOLOS_STORE_NAME, protocoloAtual);
                                if (globalShowFeedbackRef && localFeedbackArea) globalShowFeedbackRef("Novo andamento adicionado com sucesso!", "success", localFeedbackArea);
                                await renderVisualizarProtocoloPage(protocoloData.id, originatingView); 
                                return true; 
                            } catch (error) {
                                console.error("Erro ao salvar andamento:", error);
                                if (globalShowFeedbackRef && feedbackModalEl) globalShowFeedbackRef("Erro ao salvar andamento: " + error.message, "error", feedbackModalEl, 0);
                                return false; 
                            }
                        } 
                    }
                ];
                uiModuleRef.showModal("Adicionar Andamento ao Protocolo", modalHtml, modalButtons, 'max-w-lg', modalId);
            } else {
                if (globalShowFeedbackRef && localFeedbackArea) globalShowFeedbackRef("Funcionalidade de modal não disponível.", "error", localFeedbackArea);
            }
        });
        
        viewContainer.querySelector('#btn-criar-pta-deste-protocolo')?.addEventListener('click', () => {
            if (appModuleRef && typeof appModuleRef.handleMenuAction === 'function') {
                appModuleRef.handleMenuAction('cadastrar-pta', { 
                    originatingView: 'view-protocolo', 
                    preSelectedLink: { type: 'protocolo', id: protocoloData.id }
                });
            } else {
                 if(globalShowFeedbackRef && localFeedbackArea) globalShowFeedbackRef("Funcionalidade de Formulário de PTA não disponível.", "error", localFeedbackArea);
                 console.error("ProtocolosView.JS: appModuleRef.handleMenuAction não disponível para criar PTA.");
            }
        });
        
        viewContainer.querySelector('#btn-criar-autuacao-deste-protocolo')?.addEventListener('click', () => {
            if (appModuleRef && typeof appModuleRef.handleMenuAction === 'function') {
                appModuleRef.handleMenuAction('cadastrar-autuacao', {
                    originatingView: 'view-protocolo',
                    preSelectedLink: { type: 'protocolo', id: protocoloData.id }
                });
            } else {
                if(globalShowFeedbackRef && localFeedbackArea) globalShowFeedbackRef("Funcionalidade de Formulário de Autuação não disponível.", "error", localFeedbackArea);
                console.error("ProtocolosView.JS: appModuleRef.handleMenuAction não disponível para criar Autuação.");
            }
        });
        
        // CORREÇÃO APLICADA AQUI
        viewContainer.querySelector('#btn-share-protocolo-view')?.addEventListener('click', () => {
            abrirModalCompartilhamento(protocoloData, localFeedbackArea, PROTOCOLOS_STORE_NAME);
        });
        
        viewContainer.querySelector('#btn-enviar-email-protocolo-view')?.addEventListener('click', () => {
            if (!appModuleRef || typeof appModuleRef.handleMenuAction !== 'function') {
                if (globalShowFeedbackRef && localFeedbackArea) globalShowFeedbackRef("Erro: Funcionalidade de navegação não disponível.", "error", localFeedbackArea);
                return;
            }
            if (!currentProtocoloData) {
                if (globalShowFeedbackRef && localFeedbackArea) globalShowFeedbackRef("Erro: Dados do protocolo não carregados.", "error", localFeedbackArea);
                return;
            }

            const anexosParaCompositor = (currentProtocoloData.anexos || []).map(anexo => ({
                fileName: anexo.fileName,
                filePath: anexo.filePath, 
                fileSize: anexo.fileSize,
                id: anexo.id || anexo.fileName,
                ownerType: 'protocolo',
                ownerId: currentProtocoloData.id
            }));
            
            const corpoHtmlProtocolo = currentProtocoloData.descricaoDetalhada 
                ? `<p>${currentProtocoloData.descricaoDetalhada.replace(/\n/g, '<br>')}</p>` 
                : "";

            const dadosParaCompositor = {
                assunto: `Protocolo Nº ${currentProtocoloData.numeroProtocolo || currentProtocoloData.id}${currentProtocoloData.assunto ? ` - ${currentProtocoloData.assunto}` : ''}`,
                corpoHtml: corpoHtmlProtocolo,
                anexos: anexosParaCompositor,
                origem: "protocolo",
                idEntidadeOrigem: currentProtocoloData.id,
                originatingView: 'view-protocolo'
            };
            appModuleRef.handleMenuAction('escrever-email', dadosParaCompositor);
        });

        viewContainer.querySelector('#btn-excluir-protocolo-view')?.addEventListener('click', async () => {
            if (confirm(`Tem certeza que deseja mover o protocolo "${currentProtocoloData.numeroProtocolo || 'ID ' + currentProtocoloData.id}" para a lixeira?`)) {
                const protocoloParaLixeira = await dbRef.getItemById(PROTOCOLOS_STORE_NAME, currentProtocoloData.id);
                if (protocoloParaLixeira) {
                    protocoloParaLixeira.isDeleted = true;
                    protocoloParaLixeira.dataModificacao = new Date().toISOString();
                    await dbRef.updateItem(PROTOCOLOS_STORE_NAME, protocoloParaLixeira);
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Protocolo movido para a lixeira.", "success", localFeedbackArea);
                    if (refreshApplicationStateRef) await refreshApplicationStateRef();
                    
                    if (appModuleRef && appModuleRef.navigateBack) appModuleRef.navigateBack();
                    else if (appModuleRef && appModuleRef.handleMenuAction) appModuleRef.handleMenuAction(originatingView || 'gerir-protocolos');
                }
            }
        });
        
        viewContainer.querySelector('#btn-restaurar-protocolo-view')?.addEventListener('click', async () => {
            currentProtocoloData.isDeleted = false;
            currentProtocoloData.dataModificacao = new Date().toISOString();
            await dbRef.updateItem(PROTOCOLOS_STORE_NAME, currentProtocoloData);
            if (globalShowFeedbackRef) globalShowFeedbackRef("Protocolo restaurado da lixeira.", "success", localFeedbackArea);
            if (refreshApplicationStateRef) await refreshApplicationStateRef();
            renderVisualizarProtocoloPage(currentProtocoloData.id, originatingView); 
        });

        viewContainer.querySelector('#btn-excluir-permanente-protocolo-view')?.addEventListener('click', async () => {
            if (confirm(`EXCLUSÃO PERMANENTE: Tem certeza que deseja excluir permanentemente o protocolo "${currentProtocoloData.numeroProtocolo || 'ID ' + currentProtocoloData.id}"? Esta ação NÃO PODE ser desfeita e os anexos serão apagados.`)) {
                if (window.SEFWorkStation && window.SEFWorkStation.SharedUtils && typeof window.SEFWorkStation.SharedUtils.tryDeleteEntityAttachmentFolder === 'function') {
                   await window.SEFWorkStation.SharedUtils.tryDeleteEntityAttachmentFolder('processos/protocolos', currentProtocoloData.id, globalShowFeedbackRef, localFeedbackArea);
                }
                
                if (window.SEFWorkStation.SharedUtils && typeof window.SEFWorkStation.SharedUtils.desvincularEntidadeDeTodasAsOutras === 'function') {
                    await window.SEFWorkStation.SharedUtils.desvincularEntidadeDeTodasAsOutras(currentProtocoloData.id, PROTOCOLOS_STORE_NAME, dbRef);
                }

                await dbRef.deleteItem(PROTOCOLOS_STORE_NAME, currentProtocoloData.id);
                if (globalShowFeedbackRef) globalShowFeedbackRef("Protocolo excluído permanentemente.", "success", localFeedbackArea);
                if (refreshApplicationStateRef) await refreshApplicationStateRef();
                
                if (appModuleRef && appModuleRef.navigateBack) appModuleRef.navigateBack();
                else if (appModuleRef && appModuleRef.handleMenuAction) appModuleRef.handleMenuAction(originatingView || 'lixeira-global');
            }
        });

        viewContainer.querySelectorAll('.link-view-related-documento-from-protocolo').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const docId = e.currentTarget.dataset.id;
                if (SEFWorkStation.DocumentosView && SEFWorkStation.DocumentosView.renderVisualizarDocumentoPage) {
                    SEFWorkStation.DocumentosView.renderVisualizarDocumentoPage(docId, 'view-protocolo');
                }
            });
        });
        viewContainer.querySelectorAll('.link-view-related-contribuinte-from-protocolo').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const contribId = e.currentTarget.dataset.id;
                 if (SEFWorkStation.ContribuintesView && SEFWorkStation.ContribuintesView.renderVisualizarContribuintePage) {
                    SEFWorkStation.ContribuintesView.renderVisualizarContribuintePage(contribId, 'view-protocolo');
                }
            });
        });
        viewContainer.querySelectorAll('.link-view-related-tarefa-from-protocolo').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tarefaId = e.currentTarget.dataset.id;
                if (SEFWorkStation.TarefasView && SEFWorkStation.TarefasView.renderVisualizarTarefaPage) {
                    SEFWorkStation.TarefasView.renderVisualizarTarefaPage(tarefaId, 'view-protocolo');
                }
            });
        });
        viewContainer.querySelectorAll('.link-view-related-nota-from-protocolo').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const notaId = e.currentTarget.dataset.id;
                if (SEFWorkStation.NotasRapidasView && SEFWorkStation.NotasRapidasView.renderVisualizarNotaPage) {
                    SEFWorkStation.NotasRapidasView.renderVisualizarNotaPage(notaId, 'view-protocolo');
                }
            });
        });
         viewContainer.querySelectorAll('.link-view-related-servidor-from-protocolo').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const servidorId = e.currentTarget.dataset.id;
                if (SEFWorkStation.ServidoresView && SEFWorkStation.ServidoresView.renderVisualizarServidorPage) {
                    SEFWorkStation.ServidoresView.renderVisualizarServidorPage(servidorId, 'view-protocolo');
                }
            });
        });
        
        viewContainer.querySelectorAll('.link-view-related-pta-from-protocolo').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const ptaId = e.currentTarget.dataset.id;
                if (SEFWorkStation.PTAView && SEFWorkStation.PTAView.renderVisualizarPTAPage) {
                    SEFWorkStation.PTAView.renderVisualizarPTAPage(ptaId, 'view-protocolo');
                } else { console.warn("Módulo PTAView não encontrado para navegação."); }
            });
        });
        viewContainer.querySelectorAll('.link-view-related-autuacao-from-protocolo').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const autuacaoId = e.currentTarget.dataset.id;
                if (SEFWorkStation.AutuacaoView && SEFWorkStation.AutuacaoView.renderVisualizarAutuacaoPage) {
                    SEFWorkStation.AutuacaoView.renderVisualizarAutuacaoPage(autuacaoId, 'view-protocolo');
                } else { console.warn("Módulo AutuacaoView não encontrado para navegação."); }
            });
        });
        

        viewContainer.querySelectorAll('.btn-download-anexo-protocolo').forEach(button => {
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
    
    function getStatusBadgeClassProtocolo(status) {
        switch (status) {
            case 'Recebido': return 'bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-200';
            case 'Enviado': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-700 dark:text-indigo-200';
            case 'Em Análise': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-600 dark:text-yellow-100';
            case 'Respondido': return 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-200';
            case 'Arquivado': return 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200';
            case 'Cancelado': return 'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-200';
            default: return 'bg-gray-200 text-gray-700 dark:bg-gray-500 dark:text-gray-100';
        }
    }

    return {
        init,
        renderVisualizarProtocoloPage,
        getStatusBadgeClassProtocolo
    };
})();