// js/tarefasView.js
// v2.2.0 - CORREÇÃO: Implementa a função handleStatusChange para salvar alterações de status feitas na lista.
// v2.1.0 - CORREÇÃO: Adiciona verificação para não mostrar itens vinculados que sejam versões arquivadas.
// (Histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.TarefasView = (function() {
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

    const TAREFAS_STORE_NAME = 'tarefasStore';
    const DOCUMENTS_STORE_NAME = 'documents';
    const CONTRIBUINTES_STORE_NAME = 'contribuintes';
    const RECURSOS_STORE_NAME = 'recursos';
    const NOTAS_RAPIDAS_STORE_NAME = 'notasRapidasStore';
    const PROTOCOLOS_STORE_NAME = 'protocolosStore';
    const PTAS_STORE_NAME = 'ptasStore';
    const AUTUACOES_STORE_NAME = 'autuacoesStore';
    const SERVIDORES_STORE_NAME = 'servidoresStore';
    const SERVIDORES_GRUPOS_STORE_NAME = 'servidoresGruposStore';
    const EMAILS_GERADOS_STORE_NAME = 'comunicacaoEmailsGeradosStore';

    const AUSENCIA_TIPOS_OPTIONS_VIEW = ["Férias Regulamentares", "Férias Prêmio", "Licença", "Afastado", "Outro"];

    let currentTarefaId = null; 

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
        console.log("TarefasView.JS: Módulo inicializado (v2.2.0).");
    }

    async function handleSubtarefaCheckChange(event, feedbackAreaLocal) {
        const checkbox = event.target;
        const tarefaId = checkbox.closest('div[data-tarefa-id-view]').dataset.tarefaIdView;
        const subtarefaIndex = parseInt(checkbox.dataset.index);

        try {
            const tarefa = await dbRef.getItemById(TAREFAS_STORE_NAME, tarefaId);
            if (tarefa && tarefa.subtarefas && tarefa.subtarefas[subtarefaIndex]) {
                tarefa.subtarefas[subtarefaIndex].concluida = checkbox.checked;
                tarefa.dataModificacao = new Date().toISOString();
                await dbRef.updateItem(TAREFAS_STORE_NAME, tarefa);

                const label = checkbox.nextElementSibling;
                if (label) {
                    label.classList.toggle('line-through', checkbox.checked);
                    label.classList.toggle('text-gray-500', checkbox.checked);
                    label.classList.toggle('dark:text-gray-400', checkbox.checked);
                }
                if (globalShowFeedbackRef && feedbackAreaLocal) globalShowFeedbackRef(`Subtarefa '${tarefa.subtarefas[subtarefaIndex].descricao.substring(0,20)}...' ${checkbox.checked ? 'marcada como concluída' : 'desmarcada'}.`, "success", feedbackAreaLocal);
                 if (refreshApplicationStateRef) await refreshApplicationStateRef(); 
            }
        } catch (error) {
            console.error("TarefasView.JS: Erro ao atualizar status da subtarefa:", error);
            if (globalShowFeedbackRef && feedbackAreaLocal) globalShowFeedbackRef("Erro ao atualizar subtarefa.", "error", feedbackAreaLocal);
            checkbox.checked = !checkbox.checked;
        }
    }

    // CORREÇÃO: Função implementada para salvar mudanças de status
    async function handleStatusChange(tarefaId, novoStatus, feedbackAreaLocal) {
        try {
            const tarefa = await dbRef.getItemById(TAREFAS_STORE_NAME, tarefaId);
            if (tarefa) {
                tarefa.status = novoStatus;
                tarefa.dataModificacao = new Date().toISOString();

                // Adiciona a lógica para o histórico de status, se necessário
                // Ex: tarefa.historicoStatus.push({ status: novoStatus, data: new Date().toISOString() });
                
                if (novoStatus === 'Concluída' && !tarefa.dataConclusao) {
                    tarefa.dataConclusao = new Date().toISOString();
                } else if (novoStatus !== 'Concluída' && tarefa.dataConclusao) {
                    tarefa.dataConclusao = null; 
                }

                await dbRef.updateItem(TAREFAS_STORE_NAME, tarefa);
                if (globalShowFeedbackRef) globalShowFeedbackRef(`Status da tarefa atualizado para "${novoStatus}".`, 'success', feedbackAreaLocal);
                if (refreshApplicationStateRef) await refreshApplicationStateRef();
                
                // Recarrega a view para refletir a mudança
                await renderVisualizarTarefaPage(tarefaId, 'gerir-tarefas');
            }
        } catch (error) {
            console.error('Erro ao atualizar status da tarefa:', error);
            if (globalShowFeedbackRef) globalShowFeedbackRef('Erro ao atualizar o status.', 'error', feedbackAreaLocal);
        }
    }

    async function renderRelatedItemsSectionTarefaView(tarefa) {
        let html = '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">';
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
                        if (['protocolo', 'pta', 'autuacao'].includes(singularName.toLowerCase())) {
                            displayName = `${singularName.toUpperCase()} ${item.numeroProtocolo || item.numeroPTA || item.numeroAutuacao || `ID ${id.substring(0,8)}`}`;
                        } else if (displayField2 && item[displayField2]) {
                            displayName += ` (${item[displayField2]})`;
                        } else if (displayField2 === 'id_short') {
                            displayName += ` (ID: ${item.id.substring(0,8)})`;
                        }
                        itemsHtml += `<li class="p-1 border-b border-gray-200 dark:border-slate-700 last:border-b-0"><a href="#" class="${linkClassPrefix} text-blue-600 hover:underline dark:text-blue-400 text-xs" data-id="${id}">${displayName}</a></li>`;
                    }
                } catch (e) { console.warn(`Erro ao buscar item vinculado ${singularName} ID ${id} para tarefa:`, e); }
            }
            if (count > 0) {
                return `<div><h4 class="text-sm font-semibold mb-1 text-gray-700 dark:text-gray-200">${pluralName}:</h4><ul class="list-none space-y-1">${itemsHtml}</ul></div>`;
            }
            return '';
        };
        
        let allSectionsHtml = '';
        allSectionsHtml += await processLinksForEntity(tarefa.documentosVinculadosIds, DOCUMENTS_STORE_NAME, 'Documento', 'Documentos', 'link-view-related-doc-from-tarefa', 'title', 'reference');
        allSectionsHtml += await processLinksForEntity(tarefa.contribuintesVinculadosIds, CONTRIBUINTES_STORE_NAME, 'Contribuinte', 'Contribuintes', 'link-view-related-contrib-from-tarefa', 'nome', 'cpfCnpj');
        allSectionsHtml += await processLinksForEntity(tarefa.recursosVinculadosIds, RECURSOS_STORE_NAME, 'Recurso', 'Recursos', 'link-view-related-recurso-from-tarefa', 'titulo', 'numeroIdentificacao');
        allSectionsHtml += await processLinksForEntity(tarefa.notasRapidasRelacionadasIds, NOTAS_RAPIDAS_STORE_NAME, 'Nota Rápida', 'Notas Rápidas', 'link-view-related-nota-from-tarefa', 'titulo', 'id_short');
        
        const processosVinculados = tarefa.processosVinculadosIds || {};
        allSectionsHtml += await processLinksForEntity(processosVinculados.protocolos, PROTOCOLOS_STORE_NAME, 'Protocolo', 'Protocolos', 'link-view-related-protocolo-from-tarefa', 'numeroProtocolo');
        allSectionsHtml += await processLinksForEntity(processosVinculados.ptas, PTAS_STORE_NAME, 'PTA', 'PTAs', 'link-view-related-pta-from-tarefa', 'numeroPTA');
        allSectionsHtml += await processLinksForEntity(processosVinculados.autuacoes, AUTUACOES_STORE_NAME, 'Autuação', 'Autuações', 'link-view-related-autuacao-from-tarefa', 'numeroAutuacao');

        html += allSectionsHtml;
        html += '</div>';

        if (!hasAnyLink) {
            return '<p class="text-sm text-gray-500 dark:text-gray-400">Nenhum item ativo vinculado a esta tarefa.</p>';
        }
        return html;
    }

    async function renderVisualizarTarefaPage(tarefaId, originatingView = 'gerir-tarefas') {
        const feedbackAreaId = `feedback-view-tarefa-${tarefaId}`;
        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (!mainContentWrapperRef) {
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico ao renderizar visualização da tarefa.", "error");
            return;
        }
        mainContentWrapperRef.innerHTML = `<div class="documento-view" id="view-tarefa-container-${tarefaId}" data-tarefa-id-view="${tarefaId}"><p class="loading-text p-4">Carregando dados da tarefa...</p></div>`;
        const viewContainer = document.getElementById(`view-tarefa-container-${tarefaId}`);
        currentTarefaId = tarefaId; 

        try {
            const tarefa = await dbRef.getItemById(TAREFAS_STORE_NAME, tarefaId);

            if (!tarefa) {
                if(viewContainer) viewContainer.innerHTML = '<p class="feedback-message error p-4">Tarefa não encontrada.</p>';
                if (globalShowFeedbackRef && viewContainer) globalShowFeedbackRef("Tarefa não encontrada.", "error", viewContainer);
                return;
            }
            
            if (tarefa.isExcluida && originatingView !== 'lixeira-global' && originatingView !== 'lixeira') {
                 if (globalShowFeedbackRef && viewContainer) globalShowFeedbackRef("Esta tarefa está na lixeira.", "info", viewContainer);
                 viewContainer.innerHTML = `<p class="feedback-message info p-4">Esta tarefa (ID: ${tarefaId}) encontra-se na lixeira. Para visualizá-la ou restaurá-la, acesse a Lixeira Global.</p>
                                           <button id="btn-voltar-view-tarefa" class="btn-secondary mt-4">Voltar</button>`;
                document.getElementById('btn-voltar-view-tarefa').addEventListener('click', () => {
                    if (appModuleRef && appModuleRef.navigateBack) {
                        appModuleRef.navigateBack();
                    }
                });
                return;
            }

            const relatedItemsHtmlContent = await renderRelatedItemsSectionTarefaView(tarefa);
            const statusBadgeClass = SEFWorkStation.TarefasListagens ? SEFWorkStation.TarefasListagens.getStatusBadgeClass(tarefa.status) : 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-300';
            const prioridadeBadgeClass = SEFWorkStation.TarefasListagens ? SEFWorkStation.TarefasListagens.getPrioridadeBadgeClass(tarefa.prioridade) : 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-300';
            const dataVencimentoFormatada = tarefa.dataVencimento ? new Date(tarefa.dataVencimento + 'T00:00:00').toLocaleDateString() : 'Não definida';
            const dataConclusaoFormatada = tarefa.dataConclusao ? new Date(tarefa.dataConclusao).toLocaleString() : 'Não concluída';

            let anexosHtml = '<p class="text-sm text-gray-500 dark:text-gray-400">Nenhum anexo.</p>';
            let anexoNomesParaEmail = [];
            if (tarefa.anexos && tarefa.anexos.length > 0) {
                anexosHtml = '<ul class="list-none p-0">';
                tarefa.anexos.forEach(anexo => {
                    anexoNomesParaEmail.push(anexo.fileName);
                    anexosHtml += `
                        <li class="anexo-preview-item">
                            <span>${anexo.fileName} (${(anexo.fileSize / 1024).toFixed(1)} KB)</span>
                            <button class="btn-link btn-download-anexo-tarefa text-xs" data-anexo-path="${anexo.filePath}" data-anexo-owner-type="tarefa" data-anexo-owner-id="${tarefa.id}" data-anexo-name="${anexo.fileName}" title="Baixar/Abrir Anexo">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-download inline-block" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
                                Abrir
                            </button>
                        </li>`;
                });
                anexosHtml += '</ul>';
            }

            let subtarefasHtml = '';
            if (tarefa.subtarefas && tarefa.subtarefas.length > 0) {
                subtarefasHtml = '<ul class="list-none space-y-1 mt-2">';
                tarefa.subtarefas.forEach((sub, index) => {
                    const isConcluida = sub.concluida || false;
                    subtarefasHtml += `
                        <li class="flex items-center text-sm">
                            <input type="checkbox" id="subtarefa-view-${tarefa.id}-${index}" data-index="${index}" class="form-checkbox rounded h-4 w-4 mr-2 subtarefa-view-checkbox" ${isConcluida ? 'checked' : ''}>
                            <label for="subtarefa-view-${tarefa.id}-${index}" class="cursor-pointer ${isConcluida ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-700 dark:text-gray-200'}">${sub.descricao}</label>
                        </li>`;
                });
                subtarefasHtml += '</ul>';
            } else {
                subtarefasHtml = '<p class="text-sm text-gray-500 dark:text-gray-400">Nenhuma subtarefa.</p>';
            }

            const viewHtml = `
                <div id="${feedbackAreaId}" class="mb-4"></div>
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                    <h2 class="documento-view-title">${tarefa.titulo || "Tarefa Sem Título"}</h2>
                    <div class="actions-group flex flex-wrap gap-2 section-not-for-print">
                        <button id="btn-voltar-view-tarefa" class="btn-secondary btn-sm">Voltar</button>
                        ${!tarefa.isExcluida ? `<button id="btn-editar-tarefa-view" class="btn-primary btn-sm">Editar</button>` : ''}
                        ${!tarefa.isExcluida ? `<button id="btn-share-tarefa-view" class="btn-secondary bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white btn-sm" title="Compartilhar esta tarefa"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-share-fill inline-block mr-1" viewBox="0 0 16 16"><path d="M11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5z"/></svg> Compartilhar</button>` : ''}
                        ${!tarefa.isExcluida ? `<button id="btn-enviar-email-tarefa-view" class="btn-secondary btn-sm">Enviar por Email</button>` : ''} 
                        ${!tarefa.isExcluida ?
                            `<button id="btn-excluir-tarefa-view" class="btn-delete btn-sm">Mover para Lixeira</button>` :
                            (originatingView === 'lixeira-global' || originatingView === 'lixeira-tarefas' ?
                                `<button id="btn-restaurar-tarefa-view" class="btn-secondary btn-sm">Restaurar</button>
                                 <button id="btn-excluir-permanente-tarefa-view" class="btn-delete btn-sm">Excluir Permanentemente</button>`
                                 : '')
                        }
                    </div>
                </div>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">ID da Tarefa: ${tarefa.numeroIdentificacao || tarefa.id}</p>
                
                <div class="space-y-6">
                    <div class="card">
                        <h3 class="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-200 border-b pb-2 dark:border-slate-700">Detalhes da Tarefa</h3>
                        <dl class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                            <div class="info-item"><dt>Status:</dt><dd><span class="px-2 py-0.5 text-xs font-medium rounded-full ${statusBadgeClass}">${tarefa.status || 'N/D'}</span></dd></div>
                            <div class="info-item"><dt>Prioridade:</dt><dd><span class="px-2 py-0.5 text-xs font-medium rounded-full ${prioridadeBadgeClass}">${tarefa.prioridade || 'N/D'}</span></dd></div>
                            <div class="info-item"><dt>Prazo:</dt><dd>${dataVencimentoFormatada}</dd></div>
                            <div class="info-item"><dt>Conclusão:</dt><dd>${dataConclusaoFormatada}</dd></div>
                            <div class="md:col-span-2 info-item"><dt>Responsável:</dt><dd>${tarefa.servidorResponsavelNome || 'Não atribuído'}</dd></div>
                            <div class="md:col-span-3 info-item"><dt>Tags:</dt><dd class="flex flex-wrap gap-1 mt-1">${tarefa.tags && tarefa.tags.length > 0 ? tarefa.tags.map(t => `<span class="doc-tag-view">${t}</span>`).join('') : 'Nenhuma tag'}</dd></div>
                        </dl>
                    </div>

                    ${tarefa.descricaoDetalhada ? `
                    <div class="card section-for-print">
                        <h3 class="text-lg font-semibold mb-2">Descrição Detalhada</h3>
                        <div id="tarefa-view-corpo-printable-wrapper">
                            <div class="documento-view-corpo prose dark:prose-invert max-w-none">${tarefa.descricaoDetalhada}</div>
                        </div>
                    </div>` : ''}

                    <div class="card">
                        <h3 class="text-lg font-semibold mb-2">Subtarefas</h3>
                        ${subtarefasHtml}
                    </div>

                    <div class="card section-not-for-print"><h3 class="text-lg font-semibold mb-2">Itens Vinculados</h3>${relatedItemsHtmlContent}</div>
                    
                    <div class="card section-not-for-print"><h3 class="text-lg font-semibold mb-2">Anexos</h3>${anexosHtml}</div>
                </div>
            `;
            if(viewContainer) viewContainer.innerHTML = viewHtml;
            addEventListenersToViewTarefa(tarefa, originatingView, document.getElementById(feedbackAreaId), anexoNomesParaEmail);

        } catch (error) {
            console.error(`TarefasView.JS: Erro ao renderizar visualização da tarefa (ID: ${tarefaId}):`, error);
            if (viewContainer) viewContainer.innerHTML = `<p class="feedback-message error p-4">Erro ao carregar dados da tarefa: ${error.message}</p>`;
        }
    }
    
    async function abrirModalCompartilhamento(item, feedbackAreaEl, storeName) {
        if (!uiModuleRef || !sharingModuleRef || !sharedUtilsRef) {
            globalShowFeedbackRef("Funcionalidade de compartilhamento não está pronta.", "error", feedbackAreaEl, 0);
            return;
        }

        let tempSelectedRecipients = [];
        const STORE_MAP = { 'tarefasStore': 'Tarefa' };
        const tipoItem = STORE_MAP[storeName] || 'Item';
        const tituloItem = item.titulo || `Tarefa ID ${item.numeroIdentificacao || item.id}`;

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

    function addEventListenersToViewTarefa(tarefa, originatingView, feedbackAreaLocal, anexoNomesParaEmail) {
        const viewContainer = document.getElementById(`view-tarefa-container-${tarefa.id}`);
        if (!viewContainer) return;

        viewContainer.querySelector('#btn-voltar-view-tarefa')?.addEventListener('click', () => {
            if (appModuleRef && appModuleRef.navigateBack) {
                appModuleRef.navigateBack();
            } else if (navigateToListCallback) {
                navigateToListCallback(originatingView || 'gerir-tarefas');
            }
        });

        viewContainer.querySelector('#btn-editar-tarefa-view')?.addEventListener('click', () => {
            if (navigateToFormCallback) navigateToFormCallback(tarefa, originatingView);
        });
        
        viewContainer.querySelector('#btn-enviar-email-tarefa-view')?.addEventListener('click', () => {
            if (!appModuleRef || typeof appModuleRef.handleMenuAction !== 'function') {
                if (globalShowFeedbackRef && feedbackAreaLocal) globalShowFeedbackRef("Erro: Funcionalidade de navegação não disponível.", "error", localFeedbackArea);
                return;
            }
            if (!tarefa) {
                if (globalShowFeedbackRef && feedbackAreaLocal) globalShowFeedbackRef("Erro: Tarefa não carregada para envio.", "error", localFeedbackArea);
                return;
            }
            
            const anexosParaCompositor = (tarefa.anexos || []).map(anexo => ({
                fileName: anexo.fileName,
                filePath: anexo.filePath,
                fileSize: anexo.fileSize,
                id: anexo.id || anexo.fileName,
                ownerType: 'tarefa',
                ownerId: tarefa.id
            }));

            const dadosParaCompositor = {
                assunto: `Tarefa: ${tarefa.titulo || 'Sem Título'}`,
                corpoHtml: tarefa.descricaoDetalhada || "",
                anexos: anexosParaCompositor,
                origem: "tarefa",
                idEntidadeOrigem: tarefa.id,
                originatingView: 'visualizar-tarefa'
            };
            appModuleRef.handleMenuAction('escrever-email', dadosParaCompositor);
        });
        
        viewContainer.querySelector('#btn-share-tarefa-view')?.addEventListener('click', () => {
            abrirModalCompartilhamento(tarefa, feedbackAreaLocal, TAREFAS_STORE_NAME);
        });

        viewContainer.querySelector('#btn-excluir-tarefa-view')?.addEventListener('click', async () => {
            if (confirm(`Tem certeza que deseja mover a tarefa "${tarefa.titulo || 'ID ' + tarefa.id}" para a lixeira?`)) {
                try {
                    const task = await dbRef.getItemById(TAREFAS_STORE_NAME, tarefa.id);
                    if (task) {
                        task.isExcluida = true;
                        task.dataModificacao = new Date().toISOString();
                        await dbRef.updateItem(TAREFAS_STORE_NAME, task);
                        if (globalShowFeedbackRef) globalShowFeedbackRef("Tarefa movida para a lixeira.", "success", feedbackAreaLocal);
                        if (refreshApplicationStateRef) await refreshApplicationStateRef();
                        if (appModuleRef && appModuleRef.handleMenuAction) appModuleRef.handleMenuAction(originatingView || 'gerir-tarefas');
                    }
                } catch (error) { if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao mover tarefa para a lixeira: ${error.message}`, "error", feedbackAreaLocal); }
            }
        });
        
        viewContainer.querySelector('#btn-restaurar-tarefa-view')?.addEventListener('click', async () => {
            tarefa.isExcluida = false;
            tarefa.dataModificacao = new Date().toISOString();
            await dbRef.updateItem(TAREFAS_STORE_NAME, tarefa);
            if (globalShowFeedbackRef) globalShowFeedbackRef("Tarefa restaurada.", "success", localFeedbackArea);
            if (refreshApplicationStateRef) await refreshApplicationStateRef();
            renderVisualizarTarefaPage(tarefa.id, originatingView);
        });

        viewContainer.querySelector('#btn-excluir-permanente-tarefa-view')?.addEventListener('click', async () => {
             if (confirm(`EXCLUSÃO PERMANENTE: Tem certeza que deseja excluir permanentemente a tarefa "${tarefa.titulo}"? Esta ação NÃO PODE ser desfeita.`)) {
                if (window.SEFWorkStation && window.SEFWorkStation.SharedUtils && typeof window.SEFWorkStation.SharedUtils.tryDeleteEntityAttachmentFolder === 'function') {
                   await window.SEFWorkStation.SharedUtils.tryDeleteEntityAttachmentFolder('tarefas', tarefa.id, feedbackAreaLocal);
                }
                if (window.SEFWorkStation.TarefasListagens && typeof window.SEFWorkStation.TarefasListagens.desvincularTarefaDeEntidades === 'function') {
                    await window.SEFWorkStation.TarefasListagens.desvincularTarefaDeEntidades(tarefa.id, tarefa);
                }
                await dbRef.deleteItem(TAREFAS_STORE_NAME, tarefa.id);
                if (globalShowFeedbackRef) globalShowFeedbackRef("Tarefa excluída permanentemente.", "success", localFeedbackArea);
                if (refreshApplicationStateRef) await refreshApplicationStateRef();
                if (appModuleRef && appModuleRef.handleMenuAction) appModuleRef.handleMenuAction('lixeira-global');
            }
        });

        viewContainer.querySelectorAll('.btn-download-anexo-tarefa').forEach(button => {
            button.addEventListener('click', async (event) => {
                const anexoPath = event.currentTarget.dataset.anexoPath;
                const anexoFileName = event.currentTarget.dataset.anexoName;
                if (!window.directoryHandle) {
                    if (globalShowFeedbackRef && feedbackAreaLocal) globalShowFeedbackRef("Pasta da aplicação não definida.", "error", feedbackAreaLocal); return;
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
                } catch (error) {
                    if (globalShowFeedbackRef && feedbackAreaLocal) globalShowFeedbackRef(`Erro ao abrir/baixar anexo: ${error.message}.`, 'error', feedbackAreaLocal);
                }
            });
        });

        viewContainer.querySelectorAll('.subtarefa-view-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (event) => handleSubtarefaCheckChange(event, feedbackAreaLocal));
        });

        viewContainer.querySelectorAll('.link-view-related-doc-from-tarefa, .link-view-related-contrib-from-tarefa, .link-view-related-recurso-from-tarefa, .link-view-related-nota-from-tarefa, .link-view-related-protocolo-from-tarefa, .link-view-related-pta-from-tarefa, .link-view-related-autuacao-from-tarefa').forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                const id = e.currentTarget.dataset.id;
                let action = '';
                const classList = e.currentTarget.classList;
                if (classList.contains('link-view-related-doc-from-tarefa')) action = 'visualizar-documento';
                else if (classList.contains('link-view-related-contrib-from-tarefa')) action = 'visualizar-contribuinte';
                else if (classList.contains('link-view-related-recurso-from-tarefa')) action = 'visualizar-recurso';
                else if (classList.contains('link-view-related-nota-from-tarefa')) action = 'visualizar-nota-rapida';
                else if (classList.contains('link-view-related-protocolo-from-tarefa')) action = 'visualizar-protocolo';
                else if (classList.contains('link-view-related-pta-from-tarefa')) action = 'visualizar-pta';
                else if (classList.contains('link-view-related-autuacao-from-tarefa')) action = 'visualizar-autuacao';
                
                if (action && appModuleRef && appModuleRef.handleMenuAction) {
                    const dataKey = action.split('-')[1] + 'Id';
                    appModuleRef.handleMenuAction(action, { [dataKey]: id, originatingView: 'visualizar-tarefa' });
                }
            });
        });
    }

    return {
        init,
        renderVisualizarTarefaPage,
        handleStatusChange // Exportando a nova função
    };
})();