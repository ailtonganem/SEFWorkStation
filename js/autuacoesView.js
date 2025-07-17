// js/autuacoesView.js - Lógica para Visualização de Autuações
// v1.2.0 - CORREÇÃO: Adiciona verificação para não mostrar itens vinculados que sejam versões arquivadas.
// v1.1.0 - Adiciona botão e lógica para compartilhar Autuação.
// v1.0.1 - Remove classe page-section para expandir a largura da visualização.
// ... (histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.AutuacaoView = (function() {
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

    const AUTUACOES_STORE_NAME = 'autuacoesStore';
    const AUTUACAO_TYPES_STORE_NAME = 'autuacaoTypesStore';
    const DOCUMENTS_STORE_NAME = 'documents';
    const CONTRIBUINTES_STORE_NAME = 'contribuintes';
    const TAREFAS_STORE_NAME = 'tarefasStore';
    const NOTAS_RAPIDAS_STORE_NAME = 'notasRapidasStore';
    const PTAS_STORE_NAME = 'ptasStore';
    const SERVIDORES_STORE_NAME = 'servidoresStore';
    const SERVIDORES_GRUPOS_STORE_NAME = 'servidoresGruposStore';
    const PROTOCOLOS_STORE_NAME = 'protocolosStore'; 


    let currentAutuacaoId = null;
    let currentAutuacaoData = null;

    function init(
        mainWrapper,
        showFeedbackFunc,
        clearFeedbackFunc,
        navigateToListCb,
        navigateToFormCbFunc,
        refreshFunc,
        dbModuleRef,
        applicationModuleRef,
        uiRefModule
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
        
        // Injeta dependências de compartilhamento
        sharingModuleRef = window.SEFWorkStation.Sharing;
        sharedUtilsRef = window.SEFWorkStation.SharedUtils;
        console.log("AutuacaoView.JS: Módulo inicializado (v1.2.0).");
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

    async function renderVisualizarAutuacaoPage(autuacaoId, originatingView = 'gerir-autuacoes') {
        currentAutuacaoId = autuacaoId;
        const feedbackAreaId = `feedback-autuacao-view-${autuacaoId}`;

        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (!mainContentWrapperRef) {
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico ao renderizar visualização da Autuação.", "error");
            return;
        }
        mainContentWrapperRef.innerHTML = `<div id="autuacao-view-container-${autuacaoId}"><p class="loading-text p-4">A carregar Autuação...</p></div>`;
        const viewContainer = document.getElementById(`autuacao-view-container-${autuacaoId}`);

        try {
            currentAutuacaoData = await dbRef.getItemById(AUTUACOES_STORE_NAME, autuacaoId);

            if (!currentAutuacaoData) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("Autuação não encontrada.", "error", viewContainer);
                return;
            }
            
            if (currentAutuacaoData.isDeleted && originatingView !== 'lixeira-global' && originatingView !== 'lixeira') {
                 if (globalShowFeedbackRef) globalShowFeedbackRef("Esta Autuação está na lixeira.", "info", viewContainer);
                 viewContainer.innerHTML = `<p class="feedback-message info p-4">Esta Autuação (ID: ${autuacaoId}) encontra-se na lixeira. Para visualizá-la ou restaurá-la, acesse a Lixeira.</p>
                                           <button id="btn-voltar-view-autuacao" class="btn-secondary mt-4">Voltar</button>`;
                document.getElementById('btn-voltar-view-autuacao')?.addEventListener('click', () => {
                    if (appModuleRef && appModuleRef.navigateBack) appModuleRef.navigateBack();
                });
                return;
            }


            const statusBadgeClass = getStatusBadgeClassAutuacao(currentAutuacaoData.statusAutuacao);
            
            let tipoAutuacaoHtml = currentAutuacaoData.tipoAutuacao || 'Não especificado';
            if (currentAutuacaoData.tipoAutuacaoId) {
                try {
                    const tipo = await dbRef.getItemById(AUTUACAO_TYPES_STORE_NAME, currentAutuacaoData.tipoAutuacaoId);
                    if (tipo) tipoAutuacaoHtml = tipo.name;
                } catch(e) { console.warn("Erro ao buscar nome do tipo de Autuação:", e); }
            }

            let servidorResponsavelHtml = '<p class="text-sm text-gray-500 dark:text-gray-400">Nenhum servidor responsável.</p>';
            if (currentAutuacaoData.servidorResponsavelId) { 
                try {
                    const servidor = await dbRef.getItemById(SERVIDORES_STORE_NAME, currentAutuacaoData.servidorResponsavelId);
                    if (servidor && !servidor.isDeleted) {
                         servidorResponsavelHtml = `<a href="#" class="link-view-related-servidor-from-autuacao text-blue-600 hover:underline dark:text-blue-400" data-id="${servidor.id}">${servidor.nome} (${servidor.matricula || 'N/A'})</a>`;
                    } else if (servidor && servidor.isDeleted) {
                        servidorResponsavelHtml = `<span class="text-sm text-gray-400 dark:text-gray-500" title="Este servidor está na lixeira.">${servidor.nome} (Na Lixeira)</span>`;
                    } else {
                        servidorResponsavelHtml = `<p class="text-sm text-orange-500 dark:text-orange-400">Servidor responsável (ID: ${currentAutuacaoData.servidorResponsavelId}) não encontrado.</p>`;
                    }
                } catch (e) { console.warn("AutuacaoView.JS: Erro ao buscar servidor responsável:", e); }
            } else if (currentAutuacaoData.servidorResponsavelAutuacao) { 
                 servidorResponsavelHtml = `<p class="text-sm">${currentAutuacaoData.servidorResponsavelAutuacao}</p>`;
            }


            let andamentosHtml = '<p class="text-sm text-gray-500 dark:text-gray-400">Nenhum andamento registrado.</p>';
            if (currentAutuacaoData.historicoAndamentoAutuacao && currentAutuacaoData.historicoAndamentoAutuacao.length > 0) {
                andamentosHtml = '<ul class="list-disc list-inside space-y-2 pl-1 text-sm">';
                currentAutuacaoData.historicoAndamentoAutuacao.sort((a, b) => new Date(b.data) - new Date(a.data)).forEach(item => {
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
            if (currentAutuacaoData.anexos && currentAutuacaoData.anexos.length > 0) {
                anexosHtml = '<ul class="list-none p-0">';
                 currentAutuacaoData.anexos.forEach(anexo => {
                     if (anexo && anexo.fileName && typeof anexo.fileSize === 'number') {
                        anexosHtml += `
                            <li class="anexo-preview-item">
                                <span>${anexo.fileName} (${(anexo.fileSize / 1024).toFixed(1)} KB)</span>
                                <button class="btn-link btn-download-anexo-autuacao text-xs" data-anexo-path="${anexo.filePath || ''}" data-anexo-name="${anexo.fileName}" title="Baixar/Abrir Anexo">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-download inline-block" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
                                    Abrir
                                </button>
                            </li>`;
                     }
                });
                anexosHtml += '</ul>';
            }
            
            let linkedItemsHtml = await renderLinkedItemsSectionAutuacao(currentAutuacaoData);


            const viewHtml = `
                <div id="${feedbackAreaId}" class="mb-4"></div>
                <h2 class="text-2xl font-semibold mb-1">${currentAutuacaoData.assuntoAutuacao || "Autuação Sem Assunto"}</h2>
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-4">Nº Autuação: ${currentAutuacaoData.numeroAutuacao || 'N/A'} (ID: ${currentAutuacaoData.id})</p>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Status:</label>
                        <span class="badge-status ${statusBadgeClass}">${currentAutuacaoData.statusAutuacao || 'Não definido'}</span>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Data da Autuação:</label>
                        <p class="text-sm">${currentAutuacaoData.dataAutuacao ? new Date(currentAutuacaoData.dataAutuacao).toLocaleDateString() : 'Não definida'}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de Autuação:</label>
                        <p class="text-sm">${tipoAutuacaoHtml}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Autuado Principal:</label>
                        <p class="text-sm">${currentAutuacaoData.autuadoPrincipal || 'Não informado'}</p>
                    </div>
                     <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Servidor Responsável:</label>
                        ${servidorResponsavelHtml}
                    </div>
                </div>

                <div class="autuacao-view-section">
                    <h3 class="text-lg font-semibold mb-2">Descrição Detalhada</h3>
                    <div class="prose dark:prose-invert max-w-none text-sm">${currentAutuacaoData.descricaoDetalhadaAutuacao ? currentAutuacaoData.descricaoDetalhadaAutuacao.replace(/\n/g, '<br>') : '<p class="text-gray-500 dark:text-gray-400">Nenhuma descrição detalhada.</p>'}</div>
                </div>

                <div class="autuacao-view-section mt-4">
                    <h3 class="text-lg font-semibold mb-2">Histórico de Andamento</h3>
                    ${andamentosHtml}
                </div>
                
                <div class="autuacao-view-section mt-4 section-not-for-print">
                    <h3 class="text-lg font-semibold mb-2">Processos de Origem e Outros Vínculos</h3>
                    ${linkedItemsHtml}
                </div>

                <div class="autuacao-view-section mt-4 section-not-for-print">
                    <h3 class="text-lg font-semibold mb-2">Anexos</h3>
                    ${anexosHtml}
                </div>

                <div class="autuacao-view-actions mt-8 flex flex-wrap gap-2 section-not-for-print">
                    <button id="btn-voltar-view-autuacao" class="btn-secondary">Voltar</button>
                    ${!currentAutuacaoData.isDeleted ? `<button id="btn-editar-autuacao-view" class="btn-primary">Editar Autuação</button>` : ''}
                    ${!currentAutuacaoData.isDeleted ? `<button id="btn-share-autuacao-view" class="btn-secondary bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white" title="Compartilhar esta autuação"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-share-fill inline-block mr-1" viewBox="0 0 16 16"><path d="M11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5z"/></svg> Compartilhar</button>` : ''}
                    ${!currentAutuacaoData.isDeleted ? `<button id="btn-add-andamento-autuacao-view" class="btn-secondary">Adicionar Andamento</button>` : ''}
                    <button id="btn-enviar-email-autuacao-view" class="btn-secondary">Enviar por Email</button> ${!currentAutuacaoData.isDeleted ? `<button id="btn-excluir-autuacao-view" class="btn-delete">Mover para Lixeira</button>` : 
                        (originatingView === 'lixeira-global' || originatingView === 'lixeira' ?
                            `<button id="btn-restaurar-autuacao-view" class="btn-secondary">Restaurar</button>
                             <button id="btn-excluir-permanente-autuacao-view" class="btn-delete">Excluir Permanentemente</button>`
                             : '')
                    }
                </div>
            `;
            viewContainer.innerHTML = viewHtml;
            addEventListenersToAutuacaoView(currentAutuacaoData, originatingView, document.getElementById(feedbackAreaId));

        } catch (error) {
            console.error("AutuacaoView.JS: Erro ao renderizar Autuação:", error);
            if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao carregar Autuação: ${error.message}`, "error", viewContainer);
        }
    }
    
    async function renderLinkedItemsSectionAutuacao(autuacao) {
        if (!autuacao) return '<p class="text-sm text-gray-500 dark:text-gray-400">Dados da Autuação indisponíveis.</p>';
        
        let html = '<ul class="list-none p-0 text-xs">';
        let hasLinks = false;

        const processLinks = async (ids, storeName, singularName, viewActionPrefix, dataKey, linkType = "vinculado") => {
            if (ids && ids.length > 0) {
                for (const id of ids) {
                    try {
                        const item = await dbRef.getItemById(storeName, id);
                        // CORREÇÃO: Adiciona verificação de isArchivedVersion
                        if (item && !item.isDeleted && !item.isExcluida && !item.isArchivedVersion) { 
                            hasLinks = true;
                            let displayName = item.title || item.nome || `ID ${id.substring(0,8)}`;
                            if (singularName === "Protocolo" && item.numeroProtocolo) displayName = `Protocolo ${item.numeroProtocolo}`;
                            else if (singularName === "PTA" && item.numeroPTA) displayName = `PTA ${item.numeroPTA}`;
                            
                            html += `<li class="mb-1"><a href="#" class="link-view-related-${singularName.toLowerCase().replace(' ', '')}-from-autuacao text-blue-600 hover:underline dark:text-blue-400" data-id="${id}" data-type="${linkType}">${singularName}${linkType === "originario" ? " de Origem" : ""}: ${displayName}</a></li>`;
                        }
                    } catch (e) { console.warn(`Erro ao buscar ${singularName} ID ${id} (de Autuação):`, e); }
                }
            }
        };
        
        let hasOrigem = false;
        if (autuacao.protocolosOriginariosIds && autuacao.protocolosOriginariosIds.length > 0) {
            html += '<h4 class="text-xs font-semibold mt-2 mb-0.5">Protocolo(s) de Origem:</h4>';
            await processLinks(autuacao.protocolosOriginariosIds, PROTOCOLOS_STORE_NAME, 'Protocolo', 'protocolo', 'protocoloId', "originario");
            hasOrigem = true;
        }
        if (autuacao.ptasOriginariosIds && autuacao.ptasOriginariosIds.length > 0) {
            html += '<h4 class="text-xs font-semibold mt-2 mb-0.5">PTA(s) de Origem:</h4>';
            await processLinks(autuacao.ptasOriginariosIds, PTAS_STORE_NAME, 'PTA', 'pta', 'ptaId', "originario");
            hasOrigem = true;
        }
        if (hasOrigem) hasLinks = true;


        html += '<h4 class="text-xs font-semibold mt-2 mb-0.5">Outros Vínculos:</h4>';
        await processLinks(autuacao.documentosVinculadosIds, DOCUMENTS_STORE_NAME, 'Documento', 'documento', 'docId');
        await processLinks(autuacao.contribuintesVinculadosIds, CONTRIBUINTES_STORE_NAME, 'Contribuinte', 'contribuinte', 'contribuinteId');
        await processLinks(autuacao.tarefasVinculadasIds, TAREFAS_STORE_NAME, 'Tarefa', 'tarefa', 'tarefaId');
        await processLinks(autuacao.notasRapidasRelacionadasIds, NOTAS_RAPIDAS_STORE_NAME, 'Nota Rápida', 'nota', 'notaId'); 
        await processLinks(autuacao.servidoresVinculadosIds, SERVIDORES_STORE_NAME, 'Servidor', 'servidor', 'servidorId');
        
        if (!hasLinks) {
            html += '<li><p class="text-sm text-gray-500 dark:text-gray-400">Nenhum item vinculado a esta autuação.</p></li>';
        }
        html += '</ul>';
        return html;
    }
    
    function addEventListenersToAutuacaoView(autuacaoData, originatingView, localFeedbackArea) {
        const viewContainer = document.getElementById(`autuacao-view-container-${autuacaoData.id}`);
        if (!viewContainer) return;

        viewContainer.querySelector('#btn-voltar-view-autuacao')?.addEventListener('click', () => {
            if (appModuleRef && appModuleRef.navigateBack) {
                appModuleRef.navigateBack();
            } else {
                 if (appModuleRef && appModuleRef.handleMenuAction) {
                    appModuleRef.handleMenuAction(originatingView || 'gerir-autuacoes');
                }
            }
        });

        viewContainer.querySelector('#btn-editar-autuacao-view')?.addEventListener('click', () => {
            if (navigateToFormCallback) {
                navigateToFormCallback(autuacaoData, originatingView);
            }
        });
        
        // CORREÇÃO APLICADA AQUI
        viewContainer.querySelector('#btn-share-autuacao-view')?.addEventListener('click', () => {
            abrirModalCompartilhamento(autuacaoData, localFeedbackArea, AUTUACOES_STORE_NAME);
        });

        viewContainer.querySelector('#btn-add-andamento-autuacao-view')?.addEventListener('click', () => {
             if (uiModuleRef && uiModuleRef.showModal) {
                const modalId = `modal-add-andamento-autuacao-${autuacaoData.id}`;
                const modalHtml = `
                    <div id="feedback-modal-andamento-autuacao" class="mb-3"></div>
                    <form id="form-novo-andamento-autuacao">
                        <div class="mb-3">
                            <label for="andamento-descricao-autuacao" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição do Andamento/Despacho:</label>
                            <textarea id="andamento-descricao-autuacao" rows="4" class="form-input-text mt-1 block w-full" required></textarea>
                        </div>
                        <div class="mb-3">
                             <label for="andamento-tipo-autuacao" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo (Opcional):</label>
                            <input type="text" id="andamento-tipo-autuacao" class="form-input-text mt-1 block w-full" placeholder="Ex: Despacho, Juntada, Decisão">
                        </div>
                        <div class="mb-3">
                             <label for="andamento-responsavel-autuacao" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Responsável (Opcional):</label>
                            <input type="text" id="andamento-responsavel-autuacao" class="form-input-text mt-1 block w-full">
                        </div>
                    </form>
                `;
                const modalButtons = [
                    { text: 'Cancelar', class: 'btn-secondary', callback: () => uiModuleRef.closeModal() },
                    { 
                        text: 'Salvar Andamento', 
                        class: 'btn-primary', 
                        callback: async () => {
                            const descricaoAndamento = document.getElementById('andamento-descricao-autuacao').value.trim();
                            const tipoAndamento = document.getElementById('andamento-tipo-autuacao').value.trim();
                            const responsavelAndamento = document.getElementById('andamento-responsavel-autuacao').value.trim();
                            const feedbackModalEl = document.getElementById('feedback-modal-andamento-autuacao');

                            if (!descricaoAndamento) {
                                if (globalShowFeedbackRef && feedbackModalEl) globalShowFeedbackRef("A descrição do andamento é obrigatória.", "error", feedbackModalEl, 3000);
                                return false; 
                            }
                            try {
                                const autuacaoAtual = await dbRef.getItemById(AUTUACOES_STORE_NAME, autuacaoData.id);
                                if (!autuacaoAtual) {
                                    if (globalShowFeedbackRef && feedbackModalEl) globalShowFeedbackRef("Autuação não encontrada para adicionar andamento.", "error", feedbackModalEl, 0);
                                    return true; 
                                }
                                autuacaoAtual.historicoAndamentoAutuacao = autuacaoAtual.historicoAndamentoAutuacao || [];
                                autuacaoAtual.historicoAndamentoAutuacao.push({
                                    data: new Date().toISOString(),
                                    descricao: descricaoAndamento, 
                                    tipoAndamento: tipoAndamento || 'Andamento Manual',
                                    responsavel: responsavelAndamento || (appModuleRef && appModuleRef.getUserPreference ? appModuleRef.getUserPreference('userName') || 'Usuário Atual' : 'Usuário Atual')
                                });
                                autuacaoAtual.dataModificacao = new Date().toISOString();
                                await dbRef.updateItem(AUTUACOES_STORE_NAME, autuacaoAtual);
                                if (globalShowFeedbackRef && localFeedbackArea) globalShowFeedbackRef("Novo andamento adicionado com sucesso!", "success", localFeedbackArea);
                                await renderVisualizarAutuacaoPage(autuacaoData.id, originatingView); 
                                return true; 
                            } catch (error) {
                                console.error("Erro ao salvar andamento da Autuação:", error);
                                if (globalShowFeedbackRef && feedbackModalEl) globalShowFeedbackRef("Erro ao salvar andamento: " + error.message, "error", feedbackModalEl, 0);
                                return false; 
                            }
                        } 
                    }
                ];
                uiModuleRef.showModal("Adicionar Andamento à Autuação", modalHtml, modalButtons, 'max-w-lg', modalId);
            } else {
                if (globalShowFeedbackRef && localFeedbackArea) globalShowFeedbackRef("Funcionalidade de modal não disponível.", "error", localFeedbackArea);
            }
        });
        
        viewContainer.querySelector('#btn-enviar-email-autuacao-view')?.addEventListener('click', () => {
            if (!appModuleRef || typeof appModuleRef.handleMenuAction !== 'function') {
                if (globalShowFeedbackRef && localFeedbackArea) globalShowFeedbackRef("Erro: Funcionalidade de navegação não disponível.", "error", localFeedbackArea);
                return;
            }
            if (!currentAutuacaoData) {
                if (globalShowFeedbackRef && localFeedbackArea) globalShowFeedbackRef("Erro: Dados da autuação não carregados.", "error", localFeedbackArea);
                return;
            }

            const anexosParaCompositor = (currentAutuacaoData.anexos || []).map(anexo => ({
                fileName: anexo.fileName,
                filePath: anexo.filePath,
                fileSize: anexo.fileSize,
                id: anexo.id || anexo.fileName,
                ownerType: 'autuacao',
                ownerId: currentAutuacaoData.id
            }));
            
            const corpoHtmlAutuacao = currentAutuacaoData.descricaoDetalhadaAutuacao 
                ? `<p>${currentAutuacaoData.descricaoDetalhadaAutuacao.replace(/\n/g, '<br>')}</p>` 
                : "";

            const dadosParaCompositor = {
                assunto: `Autuação Nº ${currentAutuacaoData.numeroAutuacao || currentAutuacaoData.id}${currentAutuacaoData.assuntoAutuacao ? ` - ${currentAutuacaoData.assuntoAutuacao}` : ''}`,
                corpoHtml: corpoHtmlAutuacao,
                anexos: anexosParaCompositor,
                origem: "autuacao",
                idEntidadeOrigem: currentAutuacaoData.id,
                originatingView: 'view-autuacao'
            };
            appModuleRef.handleMenuAction('escrever-email', dadosParaCompositor);
        });

        viewContainer.querySelector('#btn-excluir-autuacao-view')?.addEventListener('click', async () => {
            if (confirm(`Tem certeza que deseja mover a Autuação "${currentAutuacaoData.numeroAutuacao || 'ID ' + currentAutuacaoData.id}" para a lixeira?`)) {
                const autuacaoParaLixeira = await dbRef.getItemById(AUTUACOES_STORE_NAME, currentAutuacaoData.id);
                if (autuacaoParaLixeira) {
                    autuacaoParaLixeira.isDeleted = true;
                    autuacaoParaLixeira.dataModificacao = new Date().toISOString();
                    await dbRef.updateItem(AUTUACOES_STORE_NAME, autuacaoParaLixeira);
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Autuação movida para a lixeira.", "success", localFeedbackArea);
                    if (refreshApplicationStateRef) await refreshApplicationStateRef();
                    
                    if (appModuleRef && appModuleRef.navigateBack) appModuleRef.navigateBack();
                    else if (appModuleRef && appModuleRef.handleMenuAction) appModuleRef.handleMenuAction(originatingView || 'gerir-autuacoes');
                }
            }
        });
        
        viewContainer.querySelector('#btn-restaurar-autuacao-view')?.addEventListener('click', async () => {
            currentAutuacaoData.isDeleted = false;
            currentAutuacaoData.dataModificacao = new Date().toISOString();
            await dbRef.updateItem(AUTUACOES_STORE_NAME, currentAutuacaoData);
            if (globalShowFeedbackRef) globalShowFeedbackRef("Autuação restaurada da lixeira.", "success", localFeedbackArea);
            if (refreshApplicationStateRef) await refreshApplicationStateRef();
            renderVisualizarAutuacaoPage(currentAutuacaoData.id, originatingView); 
        });

        viewContainer.querySelector('#btn-excluir-permanente-autuacao-view')?.addEventListener('click', async () => {
            if (confirm(`EXCLUSÃO PERMANENTE: Tem certeza que deseja excluir permanentemente a Autuação "${currentAutuacaoData.numeroAutuacao || 'ID ' + currentAutuacaoData.id}"? Esta ação NÃO PODE ser desfeita e os anexos serão apagados.`)) {
                if (window.SEFWorkStation && window.SEFWorkStation.SharedUtils && typeof window.SEFWorkStation.SharedUtils.tryDeleteEntityAttachmentFolder === 'function') {
                   await window.SEFWorkStation.SharedUtils.tryDeleteEntityAttachmentFolder('processos/autuacoes', currentAutuacaoData.id, globalShowFeedbackRef, localFeedbackArea);
                }
                
                if (window.SEFWorkStation.SharedUtils && typeof window.SEFWorkStation.SharedUtils.desvincularEntidadeDeTodasAsOutras === 'function') {
                    await window.SEFWorkStation.SharedUtils.desvincularEntidadeDeTodasAsOutras(currentAutuacaoData.id, AUTUACOES_STORE_NAME, dbRef);
                }

                await dbRef.deleteItem(AUTUACOES_STORE_NAME, currentAutuacaoData.id);
                if (globalShowFeedbackRef) globalShowFeedbackRef("Autuação excluída permanentemente.", "success", localFeedbackArea);
                if (refreshApplicationStateRef) await refreshApplicationStateRef();
                
                if (appModuleRef && appModuleRef.navigateBack) appModuleRef.navigateBack();
                else if (appModuleRef && appModuleRef.handleMenuAction) appModuleRef.handleMenuAction(originatingView || 'lixeira-global');
            }
        });

        viewContainer.querySelectorAll('.link-view-related-protocolo-from-autuacao').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const protocoloId = e.currentTarget.dataset.id;
                if (SEFWorkStation.ProtocolosView && SEFWorkStation.ProtocolosView.renderVisualizarProtocoloPage) {
                    SEFWorkStation.ProtocolosView.renderVisualizarProtocoloPage(protocoloId, 'view-autuacao');
                }
            });
        });
        viewContainer.querySelectorAll('.link-view-related-pta-from-autuacao').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const ptaId = e.currentTarget.dataset.id;
                if (SEFWorkStation.PTAView && SEFWorkStation.PTAView.renderVisualizarPTAPage) {
                    SEFWorkStation.PTAView.renderVisualizarPTAPage(ptaId, 'view-autuacao');
                }
            });
        });
        viewContainer.querySelectorAll('.link-view-related-documento-from-autuacao').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const docId = e.currentTarget.dataset.id;
                if (SEFWorkStation.DocumentosView && SEFWorkStation.DocumentosView.renderVisualizarDocumentoPage) {
                    SEFWorkStation.DocumentosView.renderVisualizarDocumentoPage(docId, 'view-autuacao');
                }
            });
        });
        viewContainer.querySelectorAll('.link-view-related-contribuinte-from-autuacao').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const contribId = e.currentTarget.dataset.id;
                 if (SEFWorkStation.ContribuintesView && SEFWorkStation.ContribuintesView.renderVisualizarContribuintePage) {
                    SEFWorkStation.ContribuintesView.renderVisualizarContribuintePage(contribId, 'view-autuacao');
                }
            });
        });
        viewContainer.querySelectorAll('.link-view-related-tarefa-from-autuacao').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tarefaId = e.currentTarget.dataset.id;
                if (SEFWorkStation.TarefasView && SEFWorkStation.TarefasView.renderVisualizarTarefaPage) {
                    SEFWorkStation.TarefasView.renderVisualizarTarefaPage(tarefaId, 'view-autuacao');
                }
            });
        });
        viewContainer.querySelectorAll('.link-view-related-nota-from-autuacao').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const notaId = e.currentTarget.dataset.id;
                if (SEFWorkStation.NotasRapidasView && SEFWorkStation.NotasRapidasView.renderVisualizarNotaPage) {
                    SEFWorkStation.NotasRapidasView.renderVisualizarNotaPage(notaId, 'view-autuacao');
                }
            });
        });
         viewContainer.querySelectorAll('.link-view-related-servidor-from-autuacao').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const servidorId = e.currentTarget.dataset.id;
                if (SEFWorkStation.ServidoresView && SEFWorkStation.ServidoresView.renderVisualizarServidorPage) {
                    SEFWorkStation.ServidoresView.renderVisualizarServidorPage(servidorId, 'view-autuacao');
                }
            });
        });

        viewContainer.querySelectorAll('.btn-download-anexo-autuacao').forEach(button => {
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
                    console.error(`AutuacaoView.JS: Erro ao acessar anexo "${anexoFileName}" em "attachments_sef/${anexoPath}":`, error);
                    if (globalShowFeedbackRef && feedbackElLocal) globalShowFeedbackRef(`Erro ao abrir/baixar anexo "${anexoFileName}": ${error.message}. Verifique se o arquivo existe.`, 'error', feedbackElLocal);
                 }
            });
        });
    }
    
    function getStatusBadgeClassAutuacao(status) {
        if (SEFWorkStation.ProtocolosView && typeof SEFWorkStation.ProtocolosView.getStatusBadgeClassProtocolo === 'function') {
            return SEFWorkStation.ProtocolosView.getStatusBadgeClassProtocolo(status); 
        }
        switch (status) {
            case 'Em Elaboração': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
            case 'Lavrado': return 'bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-200';
            case 'Impugnado': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-600 dark:text-yellow-100';
            case 'Julgado Procedente': return 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-200';
            case 'Inscrito em Dívida Ativa': return 'bg-orange-100 text-orange-800 dark:bg-orange-700 dark:text-orange-200';
            case 'Extinto': case 'Anulado': case 'Cancelado': return 'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-200';
            default: return 'bg-gray-200 text-gray-700 dark:bg-gray-500 dark:text-gray-100';
        }
    }


    return {
        init,
        renderVisualizarAutuacaoPage,
        getStatusBadgeClassAutuacao
    };
})();