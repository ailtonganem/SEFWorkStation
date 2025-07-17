// js/notasRapidasView.js
// v3.1.1 - CORRIGIDO: ReferenceError na chamada da função renderRelatedItemsSection.
// v3.1.0 - Implementa exibição do histórico de versões e funcionalidade para visualizar e restaurar versões antigas.
// v3.0.0 - REFATORADO: Adota novo layout de visualização em cards para melhor clareza.
// v2.1.2 - Remove classe page-section para expandir a largura da visualização.
// ... (histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.NotasRapidasView = (function() {
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
    
    const NOTAS_RAPIDAS_STORE_NAME = 'notasRapidasStore';
    const DOCUMENTS_STORE_NAME = 'documents';
    const CONTRIBUINTES_STORE_NAME = 'contribuintes';
    const RECURSOS_STORE_NAME = 'recursos';
    const TAREFAS_STORE_NAME = 'tarefasStore';
    const PROTOCOLOS_STORE_NAME = 'protocolosStore';
    const PTAS_STORE_NAME = 'ptasStore';
    const AUTUACOES_STORE_NAME = 'autuacoesStore';
    const SERVIDORES_STORE_NAME = 'servidoresStore';
    const SERVIDORES_GRUPOS_STORE_NAME = 'servidoresGruposStore';

    let currentNotaId = null; 
    let currentNotaData = null; 

    function init(
        mainWrapper, showFeedbackFunc, clearFeedbackFunc, navigateToListCb, openEditModalCb,
        refreshFunc, dbModule, applicationModule, uiModule,
        sharingMod,
        utilsMod
    ) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedbackFunc;
        globalClearFeedbackRef = clearFeedbackFunc;
        navigateToListCallback = navigateToListCb; 
        navigateToFormCallback = openEditModalCb;   
        refreshApplicationStateRef = refreshFunc;
        dbRef = dbModule;
        appModuleRef = applicationModule;
        uiModuleRef = uiModule;
        sharingModuleRef = sharingMod;
        sharedUtilsRef = utilsMod;
        console.log("NotasRapidasView.JS: Módulo inicializado (v3.1.1).");
    }

    async function handleSubtarefaCheckChange(event, feedbackAreaLocal) {
        const checkbox = event.target;
        const notaId = checkbox.closest('div[data-nota-id-view]').dataset.notaIdView;
        const subtarefaIndex = parseInt(checkbox.dataset.index);

        try {
            const nota = await dbRef.getItemById(NOTAS_RAPIDAS_STORE_NAME, notaId);
            if (nota && nota.subtarefas && nota.subtarefas[subtarefaIndex]) {
                nota.subtarefas[subtarefaIndex].concluida = checkbox.checked;
                nota.dataModificacao = new Date().toISOString();
                await dbRef.updateItem(NOTAS_RAPIDAS_STORE_NAME, nota);

                const label = checkbox.nextElementSibling;
                if (label) {
                    label.classList.toggle('line-through', checkbox.checked);
                    label.classList.toggle('text-gray-500', checkbox.checked);
                    label.classList.toggle('dark:text-gray-400', checkbox.checked);
                }
                if (globalShowFeedbackRef && feedbackAreaLocal) globalShowFeedbackRef(`Subtarefa '${nota.subtarefas[subtarefaIndex].descricao.substring(0,20)}...' ${checkbox.checked ? 'marcada como concluída' : 'desmarcada'}.`, "success", feedbackAreaLocal);
                 if (refreshApplicationStateRef) await refreshApplicationStateRef(); 
            }
        } catch (error) {
            console.error("NotasRapidasView.JS: Erro ao atualizar status da subtarefa:", error);
            if (globalShowFeedbackRef && feedbackAreaLocal) globalShowFeedbackRef("Erro ao atualizar subtarefa.", "error", feedbackAreaLocal);
            checkbox.checked = !checkbox.checked;
        }
    }

    async function renderRelatedItemsSection(nota) {
        if (!nota) {
            return '<p class="text-sm text-gray-500 dark:text-gray-400">Dados da nota indisponíveis.</p>';
        }
        let html = '<div class="space-y-3">';
        let hasAnyLink = false;

        const processLinks = async (ids, storeName, singularName, pluralName, linkClassPrefix, displayField1, displayField2) => {
            if (!ids || ids.length === 0) return '';
            let itemsHtml = '';
            let count = 0;
            for (const id of ids) {
                try {
                    const item = await dbRef.getItemById(storeName, id);
                    if (item && !item.isDeleted && !item.isExcluida) {
                        hasAnyLink = true;
                        let displayName = item[displayField1] || item.nome || `ID ${id.substring(0,8)}`;
                        if (displayField2 && item[displayField2]) displayName += ` (${item[displayField2]})`;
                        itemsHtml += `<li class="p-1"><a href="#" class="${linkClassPrefix} text-blue-600 hover:underline dark:text-blue-400 text-sm" data-id="${id}">${displayName}</a></li>`;
                        count++;
                    }
                } catch (e) { console.warn(`Erro ao buscar ${singularName} ID ${id} (de Nota Rápida):`, e); }
            }
            if (count > 0) {
                return `<div><h4 class="text-sm font-semibold mb-1 text-gray-700 dark:text-gray-200">${pluralName}:</h4><ul class="list-disc list-inside ml-4">${itemsHtml}</ul></div>`;
            }
            return '';
        };
        
        let allSectionsHtml = '';
        allSectionsHtml += await processLinks(nota.documentosRelacionadosIds, DOCUMENTS_STORE_NAME, 'Documento', 'Documentos', 'link-view-related-doc-from-nota', 'title', 'reference');
        allSectionsHtml += await processLinks(nota.contribuintesRelacionadosIds, CONTRIBUINTES_STORE_NAME, 'Contribuinte', 'Contribuintes', 'link-view-related-contrib-from-nota', 'nome', 'cpfCnpj');
        allSectionsHtml += await processLinks(nota.recursosRelacionadosIds, RECURSOS_STORE_NAME, 'Recurso', 'Recursos', 'link-view-related-recurso-from-nota', 'titulo', 'numeroIdentificacao');
        allSectionsHtml += await processLinks(nota.tarefasRelacionadasIds, TAREFAS_STORE_NAME, 'Tarefa', 'Tarefas', 'link-view-related-tarefa-from-nota', 'titulo', 'numeroIdentificacao');

        if (!hasAnyLink) {
            html += '<p class="text-sm text-gray-500 dark:text-gray-400">Nenhum item vinculado a esta nota.</p>';
        } else {
            html += allSectionsHtml;
        }

        html += '</div>';
        return html;
    }
    
    async function renderVersionHistorySectionNota(nota, containerEl) {
        if (!nota || !containerEl) return;
        const historyContainer = containerEl.querySelector('#version-history-container');
        if (!historyContainer) return;

        historyContainer.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400">Carregando histórico...</p>';

        try {
            const versions = await dbRef.getItemsByIndex(NOTAS_RAPIDAS_STORE_NAME, 'versionOf', nota.id);
            versions.sort((a, b) => new Date(b.dataModificacao) - new Date(a.dataModificacao));

            if (versions.length === 0) {
                historyContainer.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400">Nenhuma versão anterior encontrada.</p>';
                return;
            }

            let historyHtml = '<ul class="space-y-2">';
            versions.forEach(version => {
                const modDate = new Date(version.dataModificacao).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
                historyHtml += `
                    <li class="flex justify-between items-center p-2 bg-gray-100 dark:bg-slate-700/50 rounded-md text-sm">
                        <span>Versão salva em: <strong>${modDate}</strong></span>
                        <div class="space-x-2">
                            <button class="btn-secondary btn-sm text-xs btn-view-version-nota" data-version-id="${version.id}">Visualizar</button>
                            <button class="btn-primary btn-sm text-xs btn-restore-version-nota" data-version-id="${version.id}">Restaurar</button>
                        </div>
                    </li>
                `;
            });
            historyHtml += '</ul>';
            historyContainer.innerHTML = historyHtml;

        } catch (error) {
            console.error("Erro ao carregar histórico de versões da nota:", error);
            historyContainer.innerHTML = '<p class="text-sm text-red-500 dark:text-red-400">Erro ao carregar histórico.</p>';
        }
    }

    async function renderVisualizarNotaPage(notaId, originatingView = 'gerir-notas-rapidas') {
        currentNotaId = notaId;
        const feedbackAreaId = `feedback-nota-view-${notaId}`;

        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (!mainContentWrapperRef) {
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico ao renderizar visualização da nota.", "error");
            return;
        }
        mainContentWrapperRef.innerHTML = `<div id="nota-view-container-${notaId}" class="view-nota-rapida-container"><p class="loading-text p-4">A carregar nota...</p></div>`;
        const viewContainer = document.getElementById(`nota-view-container-${notaId}`);

        try {
            currentNotaData = await dbRef.getItemById(NOTAS_RAPIDAS_STORE_NAME, notaId); 

            if (!currentNotaData || currentNotaData.isArchivedVersion) { // Adicionado: Não mostra versões arquivadas diretamente
                if(globalShowFeedbackRef && viewContainer) globalShowFeedbackRef("Nota rápida não encontrada ou é uma versão arquivada.", "error", viewContainer);
                if(navigateToListCallback) navigateToListCallback(originatingView);
                return;
            }

            if (currentNotaData.isExcluida && originatingView !== 'lixeira-global' && originatingView !== 'lixeira') {
                 if (globalShowFeedbackRef && viewContainer) globalShowFeedbackRef("Esta nota rápida está na lixeira.", "info", viewContainer);
                 viewContainer.innerHTML = `<p class="feedback-message info p-4">Esta nota rápida (ID: ${notaId}) encontra-se na lixeira. Para visualizá-la ou restaurá-la, acesse a Lixeira Global.</p>
                                           <button id="btn-voltar-view-nota" class="btn-secondary mt-4">Voltar</button>`;
                document.getElementById('btn-voltar-view-nota')?.addEventListener('click', () => {
                    if (appModuleRef && appModuleRef.navigateBack) {
                        appModuleRef.navigateBack();
                    } else if (navigateToListCallback) { 
                        navigateToListCallback(originatingView);
                    }
                });
                return;
            }

            const converter = (typeof showdown !== 'undefined') ? new showdown.Converter({ simplifiedAutoLink: true, strikethrough: true, tables: true, tasklists: true, openLinksInNewWindow: true, emoji: true, ghCompatibleHeaderId: true, requireSpaceBeforeHeadingText: true }) : null;
            const conteudoHtml = converter ? converter.makeHtml(currentNotaData.conteudo || '') : (currentNotaData.conteudo || '').replace(/\n/g, '<br>');

            let anexosHtml = '<p class="text-sm text-gray-500 dark:text-gray-400">Nenhum anexo direto à nota.</p>';
            if (currentNotaData.anexos && currentNotaData.anexos.length > 0) {
                anexosHtml = '<ul class="list-none p-0">';
                currentNotaData.anexos.forEach(anexo => {
                     if (anexo && anexo.fileName && typeof anexo.fileSize === 'number') { 
                        anexosHtml += `
                            <li class="anexo-preview-item">
                                <span>${anexo.fileName} (${(anexo.fileSize / 1024).toFixed(1)} KB)</span>
                                <button class="btn-link btn-download-anexo-nota text-xs" data-anexo-path="${anexo.filePath || ''}" data-anexo-name="${anexo.fileName}" title="Baixar/Abrir Anexo">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-download inline-block" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
                                    Abrir
                                </button>
                            </li>`;
                     }
                });
                anexosHtml += '</ul>';
            }

            const corDeFundo = currentNotaData.cor || '#FFFFE0';
            const isDarkBg = uiModuleRef && typeof uiModuleRef.isColorDark === 'function' ? uiModuleRef.isColorDark(corDeFundo) : false;
            const textColorClass = isDarkBg ? 'text-gray-100 dark:text-gray-50' : 'text-gray-800 dark:text-gray-800'; 
            const metaTextColorClass = isDarkBg ? 'text-gray-300 dark:text-gray-200' : 'text-gray-600 dark:text-gray-500';

            const linkedItemsHtml = await renderRelatedItemsSection(currentNotaData);

            const viewHtml = `
                <div id="${feedbackAreaId}" class="mb-4"></div>
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                    <h2 class="text-2xl font-bold break-words" style="color: ${isDarkBg ? '#FFF' : '#000'};">${currentNotaData.titulo || "Nota Rápida Sem Título"}</h2>
                     <div class="actions-group flex flex-wrap gap-2 section-not-for-print">
                        <button id="btn-voltar-view-nota" class="btn-secondary btn-sm">Voltar</button>
                        ${!currentNotaData.isExcluida ? `<button id="btn-editar-nota-view" class="btn-primary btn-sm">Editar</button>` : ''}
                        ${!currentNotaData.isExcluida ? `<button id="btn-share-nota-view" class="btn-secondary bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white btn-sm" title="Compartilhar esta nota rápida"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-share-fill inline-block mr-1" viewBox="0 0 16 16"><path d="M11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5z"/></svg> Compartilhar</button>` : ''}
                        ${!currentNotaData.isExcluida ? `<button id="btn-enviar-email-nota" class="btn-secondary btn-sm">Enviar por Email</button>` : ''}
                        ${!currentNotaData.isExcluida ? `<button id="btn-excluir-nota-view" class="btn-delete btn-sm">Mover para Lixeira</button>` : 
                            (originatingView === 'lixeira-global' || originatingView === 'lixeira' ?
                                `<button id="btn-restaurar-nota-view" class="btn-secondary btn-sm">Restaurar</button>
                                 <button id="btn-excluir-permanente-nota-view" class="btn-delete btn-sm">Excluir Permanentemente</button>`
                                 : '')
                        }
                    </div>
                </div>
                
                <div class="space-y-6">
                    <div class="card p-4 md:p-6 rounded-lg shadow-lg" style="background-color: ${corDeFundo}; border: 1px solid ${isDarkBg ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'};">
                        <div class="nota-view-meta-infos mb-4 text-xs ${metaTextColorClass}">
                            <p><strong>ID da Nota:</strong> ${currentNotaData.numeroIdentificacao || currentNotaData.id.substring(0,8)} ${currentNotaData.isFavorita ? '⭐' : ''}</p>
                            <p><strong>Criada em:</strong> ${new Date(currentNotaData.dataCriacao).toLocaleString()}</p>
                            <p><strong>Última Modificação:</strong> ${new Date(currentNotaData.dataModificacao).toLocaleString()}</p>
                        </div>
                        <div class="nota-view-conteudo prose prose-sm ${textColorClass} ${isDarkBg ? 'prose-dark-override' : ''} max-w-none break-words" style="word-break: break-word;">
                            ${conteudoHtml}
                        </div>
                    </div>
                    
                    <div class="card section-not-for-print"><h3 class="text-lg font-semibold mb-2">Anexos da Nota</h3>${anexosHtml}</div>
                    <div class="card section-not-for-print"><h3 class="text-lg font-semibold mb-2">Itens Vinculados</h3>${linkedItemsHtml}</div>
                    
                    <!-- NOVO: Seção Histórico de Versões -->
                    <div class="card section-not-for-print"><h3 class="text-lg font-semibold mb-2">Histórico de Versões</h3><div id="version-history-container"></div></div>

                </div>
            `;
            if(viewContainer) viewContainer.innerHTML = viewHtml;
            
            // NOVO: Renderiza a seção de histórico após a renderização principal
            await renderVersionHistorySectionNota(currentNotaData, viewContainer);

            addEventListenersToNotaView(currentNotaData, originatingView, document.getElementById(feedbackAreaId));

        } catch (error) {
            console.error("NotasRapidasView.JS: Erro ao renderizar nota rápida:", error);
            if (globalShowFeedbackRef && viewContainer) globalShowFeedbackRef(`Erro ao carregar nota: ${error.message}`, "error", viewContainer);
        }
    }
    
    async function abrirModalCompartilhamento(item, feedbackAreaEl, storeName) {
        if (!uiModuleRef || !sharingModuleRef || !sharedUtilsRef) {
            globalShowFeedbackRef("Funcionalidade de compartilhamento não está pronta.", "error", feedbackAreaEl, 0);
            return;
        }

        let tempSelectedRecipients = [];
        const STORE_MAP = { 'notasRapidasStore': 'Nota Rápida' };
        const tipoItem = STORE_MAP[storeName] || 'Item';
        const tituloItem = item.titulo || `Nota ID ${item.numeroIdentificacao || item.id}`;

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

    function addEventListenersToNotaView(notaData, originatingView, feedbackAreaLocal) {
        const viewContainer = document.getElementById(`nota-view-container-${notaData.id}`);
        if (!viewContainer) return;

        // Listeners para Visualizar e Restaurar Versões
        viewContainer.querySelectorAll('.btn-view-version-nota').forEach(button => {
            button.addEventListener('click', async (e) => {
                const versionId = e.currentTarget.dataset.versionId;
                try {
                    const versionDoc = await dbRef.getItemById(NOTAS_RAPIDAS_STORE_NAME, versionId);
                    if (versionDoc && uiModuleRef) {
                        const converter = new showdown.Converter();
                        const contentHtml = converter.makeHtml(versionDoc.conteudo);
                        const modalTitle = `Visualizando Versão de ${new Date(versionDoc.dataModificacao).toLocaleString()}`;
                        const modalContent = `<div class="prose dark:prose-invert max-w-none">${contentHtml}</div>`;
                        uiModuleRef.showModal(modalTitle, modalContent, [{ text: 'Fechar', class: 'btn-secondary', closesModal: true }], 'max-w-2xl');
                    }
                } catch (error) {
                    globalShowFeedbackRef("Erro ao carregar versão para visualização.", "error", feedbackAreaLocal);
                }
            });
        });

        viewContainer.querySelectorAll('.btn-restore-version-nota').forEach(button => {
            button.addEventListener('click', async (e) => {
                const versionId = e.currentTarget.dataset.versionId;
                const userConfirmed = await uiModuleRef.showConfirmationModal(
                    'Confirmar Restauração',
                    'Tem certeza que deseja restaurar esta versão da nota? A versão atual será arquivada para segurança.',
                    'Sim, Restaurar', 'Cancelar'
                );
                if (userConfirmed) {
                    try {
                        const versionToRestore = await dbRef.getItemById(NOTAS_RAPIDAS_STORE_NAME, versionId);
                        const currentNota = await dbRef.getItemById(NOTAS_RAPIDAS_STORE_NAME, notaData.id);

                        const archiveOfCurrent = { ...currentNota };
                        archiveOfCurrent.id = appModuleRef.generateUUID();
                        archiveOfCurrent.isArchivedVersion = true;
                        archiveOfCurrent.versionOf = currentNota.id;
                        await dbRef.addItem(NOTAS_RAPIDAS_STORE_NAME, archiveOfCurrent);

                        currentNota.titulo = versionToRestore.titulo;
                        currentNota.conteudo = versionToRestore.conteudo;
                        currentNota.dataModificacao = new Date().toISOString();
                        await dbRef.updateItem(NOTAS_RAPIDAS_STORE_NAME, currentNota);

                        globalShowFeedbackRef("Nota restaurada com sucesso!", "success", feedbackAreaLocal);
                        await renderVisualizarNotaPage(notaData.id, originatingView);
                    } catch (error) {
                        globalShowFeedbackRef(`Erro ao restaurar versão: ${error.message}`, "error", feedbackAreaLocal);
                    }
                }
            });
        });
        
        // Listeners existentes
        viewContainer.querySelector('#btn-voltar-view-nota')?.addEventListener('click', () => {
            if (appModuleRef && appModuleRef.navigateBack) {
                appModuleRef.navigateBack();
            } else if (navigateToListCallback) {
                navigateToListCallback(originatingView || 'gerir-notas-rapidas');
            }
        });

        viewContainer.querySelector('#btn-editar-nota-view')?.addEventListener('click', () => {
            if (navigateToFormCallback) navigateToFormCallback(notaData, originatingView);
        });
        
        viewContainer.querySelector('#btn-share-nota-view')?.addEventListener('click', () => {
            abrirModalCompartilhamento(notaData, feedbackAreaLocal, NOTAS_RAPIDAS_STORE_NAME);
        });

        viewContainer.querySelectorAll('.subtarefa-view-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (event) => handleSubtarefaCheckChange(event, feedbackAreaLocal));
        });
        
        viewContainer.querySelectorAll('.link-view-related-doc-from-nota, .link-view-related-contrib-from-nota, .link-view-related-recurso-from-nota, .link-view-related-tarefa-from-nota').forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                const id = e.currentTarget.dataset.id;
                let action = '';
                if(e.currentTarget.classList.contains('link-view-related-doc-from-nota')) action = 'visualizar-documento';
                else if(e.currentTarget.classList.contains('link-view-related-contrib-from-nota')) action = 'visualizar-contribuinte';
                else if(e.currentTarget.classList.contains('link-view-related-recurso-from-nota')) action = 'visualizar-recurso';
                else if(e.currentTarget.classList.contains('link-view-related-tarefa-from-nota')) action = 'visualizar-tarefa';

                if (action && appModuleRef && appModuleRef.handleMenuAction) {
                    const dataKey = action.split('-')[1] + 'Id';
                    appModuleRef.handleMenuAction(action, { [dataKey]: id, originatingView: 'visualizar-nota-rapida' });
                }
            });
        });

        viewContainer.querySelector('#btn-excluir-nota-view')?.addEventListener('click', async () => {
            if (confirm(`Tem certeza que deseja mover a nota "${notaData.titulo || 'ID ' + notaData.id}" para a lixeira?`)) {
                try {
                    const nota = await dbRef.getItemById(NOTAS_RAPIDAS_STORE_NAME, notaData.id);
                    if (nota) {
                        nota.isExcluida = true;
                        nota.dataModificacao = new Date().toISOString();
                        await dbRef.updateItem(NOTAS_RAPIDAS_STORE_NAME, nota);
                        if (globalShowFeedbackRef) globalShowFeedbackRef("Nota movida para a lixeira.", "success", feedbackAreaLocal);
                        if (refreshApplicationStateRef) await refreshApplicationStateRef();
                        if (appModuleRef && appModuleRef.handleMenuAction) appModuleRef.handleMenuAction(originatingView || 'gerir-notas-rapidas');
                    }
                } catch (error) { if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao mover nota para a lixeira: ${error.message}`, "error", feedbackAreaLocal); }
            }
        });
        
        viewContainer.querySelector('#btn-restaurar-nota-view')?.addEventListener('click', async () => {
            notaData.isExcluida = false;
            notaData.dataModificacao = new Date().toISOString();
            await dbRef.updateItem(NOTAS_RAPIDAS_STORE_NAME, notaData);
            if (globalShowFeedbackRef) globalShowFeedbackRef("Nota restaurada.", "success", localFeedbackArea);
            if (refreshApplicationStateRef) await refreshApplicationStateRef();
            renderVisualizarNotaPage(notaData.id, originatingView);
        });

        viewContainer.querySelector('#btn-excluir-permanente-nota-view')?.addEventListener('click', async () => {
             if (confirm(`EXCLUSÃO PERMANENTE: Tem certeza que deseja excluir permanentemente a nota "${notaData.titulo || 'ID ' + notaData.id}"? Esta ação NÃO PODE ser desfeita.`)) {
                if (window.SEFWorkStation && window.SEFWorkStation.SharedUtils && typeof window.SEFWorkStation.SharedUtils.tryDeleteEntityAttachmentFolder === 'function') {
                   await window.SEFWorkStation.SharedUtils.tryDeleteEntityAttachmentFolder('notasRapidas', notaData.id, feedbackAreaLocal);
                }
                if (window.SEFWorkStation.TarefasListagens && typeof window.SEFWorkStation.TarefasListagens.desvincularTarefaDeEntidades === 'function') {
                    // Aqui seria 'desvincularNotaDeEntidades', que teria que ser criada se notas tivessem vínculos fortes
                }
                await dbRef.deleteItem(NOTAS_RAPIDAS_STORE_NAME, notaData.id);
                if (globalShowFeedbackRef) globalShowFeedbackRef("Nota excluída permanentemente.", "success", localFeedbackArea);
                if (refreshApplicationStateRef) await refreshApplicationStateRef();
                if (appModuleRef && appModuleRef.handleMenuAction) appModuleRef.handleMenuAction('lixeira-global');
            }
        });
        
        viewContainer.querySelector('#btn-enviar-email-nota-view')?.addEventListener('click', () => {
             if (!appModuleRef || typeof appModuleRef.handleMenuAction !== 'function') { return; }
             if (!currentNotaData) { return; }
            
             const dadosParaCompositor = {
                assunto: `Nota Rápida: ${currentNotaData.titulo || 'Sem Título'}`,
                corpoHtml: currentNotaData.conteudo || "",
                anexos: currentNotaData.anexos || [],
                origem: "notaRapida",
                idEntidadeOrigem: currentNotaData.id,
                originatingView: 'view-nota-rapida'
            };
            appModuleRef.handleMenuAction('escrever-email', dadosParaCompositor);
        });

    }
    
    return {
        init,
        renderVisualizarNotaPage
    };
})();