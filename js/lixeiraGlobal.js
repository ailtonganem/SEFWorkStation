// js/lixeiraGlobal.js - Lógica para a Lixeira Global do Sistema
// v0.8.0 - REFATORADO: Utiliza o módulo centralizado EntityConfig para obter a lista de entidades.
// v0.7.0 - Adiciona menu de contexto (botão direito) nas linhas da listagem.
// v0.6 - Adiciona botão de ajuda contextual.
// v0.5 - Ajusta o layout para ocupar toda a largura da página.
// (Histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.LixeiraGlobal = (function() {
    let mainContentWrapperRef;
    let dbRef;
    let appModuleRef;
    let uiModuleRef;
    let globalShowFeedbackRef;
    let refreshApplicationStateRef;
    let ajudaModuleRef; 

    // A lista de entidades agora será carregada do módulo de configuração central.
    let entidadesNaLixeiraConfig = [];
    let currentSelectedEntityType = '';

    function init(mainWrapper, db, app, ui, showFeedback, refreshState) {
        mainContentWrapperRef = mainWrapper;
        dbRef = db;
        appModuleRef = app;
        uiModuleRef = ui;
        globalShowFeedbackRef = showFeedback;
        refreshApplicationStateRef = refreshState;
        ajudaModuleRef = window.SEFWorkStation.Ajuda; 

        // Carrega as configurações das entidades que podem ir para a lixeira.
        if (window.SEFWorkStation.EntityConfig) {
            entidadesNaLixeiraConfig = window.SEFWorkStation.EntityConfig.getAllConfigs().filter(config => config.flagDeletado);
            if (entidadesNaLixeiraConfig.length > 0) {
                currentSelectedEntityType = entidadesNaLixeiraConfig[0].storeName;
            }
        } else {
            console.error("LixeiraGlobal.JS: Módulo EntityConfig não encontrado. A lixeira não funcionará corretamente.");
        }

        if (!dbRef) console.error("LixeiraGlobal.JS: init - Referência ao DB não fornecida!");
        if (!mainContentWrapperRef) console.error("LixeiraGlobal.JS: init - mainContentWrapperRef não fornecido.");
        if (!ajudaModuleRef) console.warn("LixeiraGlobal.JS: init - Módulo de Ajuda não encontrado.");
        console.log("LixeiraGlobal.JS: Módulo inicializado (v0.8.0).");
    }

    async function renderLixeiraGlobalPage() {
        if (window.SEFWorkStation.App && typeof window.SEFWorkStation.App.clearGlobalFeedback === 'function') {
            window.SEFWorkStation.App.clearGlobalFeedback();
        }

        if (!mainContentWrapperRef) {
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico ao tentar renderizar a Lixeira Global.", "error");
            return;
        }
        mainContentWrapperRef.innerHTML = `<div class="page-section max-w-none px-4 sm:px-6 lg:px-8" id="lixeira-global-container"><p class="loading-text p-4">Carregando Lixeira Global...</p></div>`;
        const container = document.getElementById('lixeira-global-container');
        const feedbackAreaId = "feedback-lixeira-global";

        let abasHtml = '<div class="mb-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap -mb-px">';
        entidadesNaLixeiraConfig.forEach(entidade => {
            const isActive = entidade.storeName === currentSelectedEntityType;
            abasHtml += `
                <button class="tab-lixeira-global px-4 py-2 mr-1 text-sm font-medium border-b-2
                             ${isActive ? 'border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-400' : 'border-transparent hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500 text-gray-500 dark:text-gray-400'}"
                        data-store-name="${entidade.storeName}">
                    ${entidade.labelPlural}
                </button>
            `;
        });
        abasHtml += '</div>';

        const entidadeAtualInfo = entidadesNaLixeiraConfig.find(e => e.storeName === currentSelectedEntityType);
        const nomeEntidadeAtualParaBotao = entidadeAtualInfo ? entidadeAtualInfo.labelPlural : 'Tipo Desconhecido';

        let pageHtml = `
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-semibold">Lixeira Global</h2>
                <button type="button" id="ajuda-lixeira-global" class="p-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-300" title="Ajuda sobre a Lixeira Global">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-question-circle-fill" viewBox="0 0 16 16">
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.496 6.033h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286a.237.237 0 0 0 .241.247zm2.325 6.443c.61 0 1.029-.394 1.029-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94 0 .533.425.927 1.01.927z"/>
                    </svg>
                </button>
            </div>
            <div id="${feedbackAreaId}" class="mb-4"></div>
            ${abasHtml}
            <div class="actions-group mb-4 flex justify-end">
                <button id="btn-esvaziar-lixeira-global" class="btn-delete btn-sm text-xs" disabled>Esvaziar Lixeira de ${nomeEntidadeAtualParaBotao}</button>
            </div>
            <div id="lista-itens-lixeira-global" class="table-list-container">
                <p class="loading-text p-4">Selecione um tipo de item para visualizar.</p>
            </div>
        `;
        container.innerHTML = pageHtml;

        document.querySelectorAll('.tab-lixeira-global').forEach(tab => {
            tab.addEventListener('click', (event) => {
                currentSelectedEntityType = event.currentTarget.dataset.storeName;
                renderLixeiraGlobalPage(); 
            });
        });

        document.getElementById('btn-esvaziar-lixeira-global').addEventListener('click', async () => {
            const entidadeInfo = entidadesNaLixeiraConfig.find(e => e.storeName === currentSelectedEntityType);
            if (!entidadeInfo) return;

            if (confirm(`Tem certeza que deseja esvaziar a lixeira para "${entidadeInfo.labelPlural}"? Todos os itens deste tipo na lixeira serão EXCLUÍDOS PERMANENTEMENTE. Esta ação não pode ser desfeita.`)) {
                await esvaziarLixeiraPorTipo(entidadeInfo, feedbackAreaId);
            }
        });
        
        const btnAjuda = document.getElementById('ajuda-lixeira-global');
        if (btnAjuda && ajudaModuleRef) {
            btnAjuda.addEventListener('click', (e) => {
                e.preventDefault();
                ajudaModuleRef.mostrarTopicoDeAjuda('manual-modulo-utilidades', 'util-lixeira');
            });
        }

        await carregarItensNaLixeira(currentSelectedEntityType, feedbackAreaId);
    }

    async function carregarItensNaLixeira(storeName, feedbackAreaId) {
        const listaContainer = document.getElementById('lista-itens-lixeira-global');
        const btnEsvaziar = document.getElementById('btn-esvaziar-lixeira-global');

        if (!listaContainer || !btnEsvaziar) return;
        listaContainer.innerHTML = `<p class="loading-text p-4">Carregando itens de ${storeName}...</p>`;

        const entidadeInfo = entidadesNaLixeiraConfig.find(e => e.storeName === storeName);
        if (!entidadeInfo) {
            listaContainer.innerHTML = '<p class="feedback-message error">Tipo de entidade não reconhecido.</p>';
            btnEsvaziar.disabled = true;
            return;
        }
        btnEsvaziar.textContent = `Esvaziar Lixeira de ${entidadeInfo.labelPlural}`;

        try {
            const todosItens = await dbRef.getAllItems(storeName);
            const itensDeletados = todosItens.filter(item => item[entidadeInfo.flagDeletado] === true);

            btnEsvaziar.disabled = itensDeletados.length === 0;

            if (itensDeletados.length === 0) {
                listaContainer.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400 py-8">A lixeira para "${entidadeInfo.labelPlural}" está vazia.</p>`;
                return;
            }

            let tabelaHtml = `
                <table class="documentos-table">
                    <thead>
                        <tr>
                            <th>Nome / Identificador</th>
                            <th>Tipo de Item</th>
                            <th>Data da Exclusão</th>
                            <th class="text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            itensDeletados.sort((a,b) => new Date(b[entidadeInfo.dateField] || 0) - new Date(a[entidadeInfo.dateField] || 0) );

            for (const item of itensDeletados) {
                const dataExclusao = new Date(item[entidadeInfo.dateField] || item.dataModificacao || item.modificationDate || item.dataCriacao || 0);
                const formattedDate = dataExclusao.toLocaleDateString() + ' ' + dataExclusao.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                let displayName = item[entidadeInfo.displayField] || `ID ${item.id.toString().substring(0,8)}`;
                if (entidadeInfo.secondaryDisplayField && item[entidadeInfo.secondaryDisplayField]) {
                    displayName += ` (${String(item[entidadeInfo.secondaryDisplayField]).substring(0,30)}...)`;
                }

                tabelaHtml += `
                    <tr data-id="${item.id}" data-store="${storeName}" data-nome="${displayName.replace(/"/g, '"')}">
                        <td class="py-2 px-3">${displayName}</td>
                        <td class="py-2 px-3">${entidadeInfo.labelPlural}</td>
                        <td class="py-2 px-3">${formattedDate}</td>
                        <td class="actions-cell text-center py-2 px-3">
                            <button class="btn-secondary btn-restaurar-item-lixeira text-xs py-1 px-2 mr-1" title="Restaurar Item">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-arrow-counterclockwise inline-block mr-1" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2v1z"/><path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466z"/></svg>
                                Restaurar
                            </button>
                            <button class="btn-delete btn-excluir-perm-item-lixeira text-xs py-1 px-2" title="Excluir Permanentemente">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-trash3-fill inline-block mr-1" viewBox="0 0 16 16"><path d="M11 1.5v1h3.5a.5.5 0 0 1 0 1h-.538l-.853 10.66A2 2 0 0 1 11.115 16h-6.23a2 2 0 0 1-1.994-1.84L2.038 3.5H1.5a.5.5 0 0 1 0-1H5v-1A1.5 1.5 0 0 1 6.5 0h3A1.5 1.5 0 0 1 11 1.5Zm-5 0v1h4v-1a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5ZM4.5 5.029l.5 8.5a.5.5 0 1 0 .998-.06l-.5-8.5a.5.5 0 1 0-.998.06Zm6.53-.528a.5.5 0 0 0-.528.47l-.5 8.5a.5.5 0 0 0 .998.058l.5-8.5a.5.5 0 0 0-.47-.528ZM8 4.5a.5.5 0 0 0-.5.5v8.5a.5.5 0 0 0 1 0V5a.5.5 0 0 0-.5-.5Z"/></svg>
                                Excluir Perm.
                            </button>
                        </td>
                    </tr>
                `;
            }
            tabelaHtml += '</tbody></table>';
            listaContainer.innerHTML = tabelaHtml;
            addEventListenersAcoesLixeira(feedbackAreaId);

        } catch (error) {
            console.error(`LixeiraGlobal.JS: Erro ao carregar itens deletados de "${storeName}":`, error);
            listaContainer.innerHTML = `<p class="feedback-message error">Erro ao carregar itens da lixeira para "${entidadeInfo.labelPlural}".</p>`;
            if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao carregar lixeira para ${entidadeInfo.labelPlural}: ${error.message}`, 'error', document.getElementById(feedbackAreaId));
        }
    }

    function addEventListenersAcoesLixeira(feedbackAreaId) {
        document.querySelectorAll('.btn-restaurar-item-lixeira').forEach(button => {
            button.addEventListener('click', async (event) => {
                const tr = event.currentTarget.closest('tr');
                const itemId = tr.dataset.id;
                const storeName = tr.dataset.store;
                await restaurarItemDaLixeira(itemId, storeName, feedbackAreaId);
            });
        });

        document.querySelectorAll('.btn-excluir-perm-item-lixeira').forEach(button => {
            button.addEventListener('click', async (event) => {
                const tr = event.currentTarget.closest('tr');
                const itemId = tr.dataset.id;
                const storeName = tr.dataset.store;
                const displayName = tr.dataset.nome;
                if (confirm(`EXCLUSÃO PERMANENTE: Tem certeza que deseja excluir permanentemente o item "${displayName}"? Esta ação NÃO PODE ser desfeita e os anexos (se houver) podem ser apagados.`)) {
                    await excluirItemPermanentemente(itemId, storeName, feedbackAreaId);
                }
            });
        });

        // NOVO: Adiciona listener de contexto às linhas da tabela
        document.querySelectorAll('#lista-itens-lixeira-global tbody tr').forEach(row => {
            row.addEventListener('contextmenu', (event) => {
                event.preventDefault();
                const itemId = row.dataset.id;
                const storeName = row.dataset.store;
                const displayName = row.dataset.nome;

                const menuItems = [
                    { label: 'Restaurar Item', action: () => restaurarItemDaLixeira(itemId, storeName, feedbackAreaId) },
                    { isSeparator: true },
                    { label: 'Excluir Permanentemente', action: async () => {
                        if (await uiModuleRef.showConfirmationModal('Exclusão Permanente', `Tem certeza que deseja excluir permanentemente o item "${displayName}"? Esta ação é irreversível.`)) {
                            await excluirItemPermanentemente(itemId, storeName, feedbackAreaId);
                        }
                    }}
                ];

                if (uiModuleRef && uiModuleRef.showContextMenu) {
                    uiModuleRef.showContextMenu(event.currentTarget, menuItems);
                }
            });
        });
    }

    async function restaurarItemDaLixeira(itemId, storeName, feedbackAreaId) {
        const entidadeInfo = entidadesNaLixeiraConfig.find(e => e.storeName === storeName);
        if (!entidadeInfo) {
            if (globalShowFeedbackRef) globalShowFeedbackRef("Tipo de entidade desconhecido para restauração.", "error", document.getElementById(feedbackAreaId));
            return;
        }

        try {
            const item = await dbRef.getItemById(storeName, itemId);
            if (item) {
                item[entidadeInfo.flagDeletado] = false;
                const dateFieldToUpdate = entidadeInfo.dateField || 'modificationDate' || 'dataModificacao';
                if (item.hasOwnProperty(dateFieldToUpdate)) {
                    item[dateFieldToUpdate] = new Date().toISOString();
                } else if (item.hasOwnProperty('modificationDate')) { 
                    item.modificationDate = new Date().toISOString();
                } else if (item.hasOwnProperty('dataModificacao')) { 
                    item.dataModificacao = new Date().toISOString();
                }

                await dbRef.updateItem(storeName, item);
                if (globalShowFeedbackRef) globalShowFeedbackRef(`Item "${item[entidadeInfo.displayField] || itemId}" restaurado com sucesso.`, "success", document.getElementById(feedbackAreaId));
                if (refreshApplicationStateRef) await refreshApplicationStateRef();
                await carregarItensNaLixeira(storeName, feedbackAreaId);
            }
        } catch (error) {
            if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao restaurar item: ${error.message}`, "error", document.getElementById(feedbackAreaId));
        }
    }

    async function excluirItemPermanentemente(itemId, storeName, feedbackAreaId) {
        const entidadeInfo = entidadesNaLixeiraConfig.find(e => e.storeName === storeName);
        if (!entidadeInfo) {
            if (globalShowFeedbackRef) globalShowFeedbackRef("Tipo de entidade desconhecido para exclusão.", "error", document.getElementById(feedbackAreaId));
            return;
        }

        try {
            const itemParaExcluir = await dbRef.getItemById(storeName, itemId);
            if (!itemParaExcluir) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("Item não encontrado para exclusão.", "warning", document.getElementById(feedbackAreaId));
                await carregarItensNaLixeira(storeName, feedbackAreaId);
                return;
            }

            if (window.SEFWorkStation.SharedUtils && typeof window.SEFWorkStation.SharedUtils.desvincularEntidadeDeTodasAsOutras === 'function') {
                 await window.SEFWorkStation.SharedUtils.desvincularEntidadeDeTodasAsOutras(itemId, storeName, dbRef);
            } else {
                console.warn(`LixeiraGlobal.JS: SharedUtils.desvincularEntidadeDeTodasAsOutras não disponível.`);
            }
            
            if (storeName === window.SEFWorkStation.DB.STORES.COMUNICACAO_DESTINATARIOS) {
                const todosGruposCom = await dbRef.getAllItems(window.SEFWorkStation.DB.STORES.COMUNICACAO_GRUPOS);
                for (const grupo of todosGruposCom) {
                    if (grupo.idsDestinatariosMembros && grupo.idsDestinatariosMembros.includes(itemId)) {
                        grupo.idsDestinatariosMembros = grupo.idsDestinatariosMembros.filter(idMembro => idMembro !== itemId);
                        grupo.dataModificacao = new Date().toISOString();
                        await dbRef.updateItem(window.SEFWorkStation.DB.STORES.COMUNICACAO_GRUPOS, grupo);
                    }
                }
            }

            let attachmentFolderType = '';
            switch (storeName) {
                case 'documents': attachmentFolderType = 'documents'; break;
                case 'contribuintes': attachmentFolderType = 'contribuintes'; break;
                case 'recursos': attachmentFolderType = 'recursos'; break;
                case 'notasRapidasStore': attachmentFolderType = 'notasRapidas'; break;
                case 'tarefasStore': attachmentFolderType = 'tarefas'; break;
                case 'protocolosStore': attachmentFolderType = 'processos/protocolos'; break;
                case 'ptasStore': attachmentFolderType = 'processos/ptas'; break;
                case 'autuacoesStore': attachmentFolderType = 'processos/autuacoes'; break;
            }

            if (attachmentFolderType && window.SEFWorkStation.SharedUtils && typeof window.SEFWorkStation.SharedUtils.tryDeleteEntityAttachmentFolder === 'function') {
                await window.SEFWorkStation.SharedUtils.tryDeleteEntityAttachmentFolder(attachmentFolderType, itemId, globalShowFeedbackRef, document.getElementById(feedbackAreaId));
            }

            await dbRef.deleteItem(storeName, itemId);

            if (globalShowFeedbackRef) globalShowFeedbackRef(`Item "${itemParaExcluir[entidadeInfo.displayField] || itemId}" excluído permanentemente.`, "success", document.getElementById(feedbackAreaId));
            if (refreshApplicationStateRef) await refreshApplicationStateRef();
            await carregarItensNaLixeira(storeName, feedbackAreaId);
        } catch (error) {
            if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao excluir permanentemente o item: ${error.message}`, "error", document.getElementById(feedbackAreaId));
        }
    }

    async function esvaziarLixeiraPorTipo(entidadeInfo, feedbackAreaId) {
        if (!entidadeInfo) return;
        const { labelPlural, storeName, flagDeletado } = entidadeInfo;
        const feedbackEl = document.getElementById(feedbackAreaId);

        try {
            const todosItens = await dbRef.getAllItems(storeName);
            const itensDeletados = todosItens.filter(item => item[flagDeletado] === true);

            if (itensDeletados.length === 0) {
                if (globalShowFeedbackRef) globalShowFeedbackRef(`A lixeira para "${labelPlural}" já está vazia.`, "info", feedbackEl);
                return;
            }

            let sucessoCount = 0;
            let erroCount = 0;

            for (const item of itensDeletados) {
                try {
                    if (window.SEFWorkStation.SharedUtils && typeof window.SEFWorkStation.SharedUtils.desvincularEntidadeDeTodasAsOutras === 'function') {
                        await window.SEFWorkStation.SharedUtils.desvincularEntidadeDeTodasAsOutras(item.id, storeName, dbRef);
                    }
                    if (storeName === window.SEFWorkStation.DB.STORES.COMUNICACAO_DESTINATARIOS) {
                        const todosGruposCom = await dbRef.getAllItems(window.SEFWorkStation.DB.STORES.COMUNICACAO_GRUPOS);
                        for (const grupo of todosGruposCom) {
                            if (grupo.idsDestinatariosMembros && grupo.idsDestinatariosMembros.includes(item.id)) {
                                grupo.idsDestinatariosMembros = grupo.idsDestinatariosMembros.filter(idMembro => idMembro !== item.id);
                                grupo.dataModificacao = new Date().toISOString();
                                await dbRef.updateItem(window.SEFWorkStation.DB.STORES.COMUNICACAO_GRUPOS, grupo);
                            }
                        }
                    }

                    let attachmentFolderType = '';
                    switch (storeName) {
                        case 'documents': attachmentFolderType = 'documents'; break;
                        case 'contribuintes': attachmentFolderType = 'contribuintes'; break;
                        case 'recursos': attachmentFolderType = 'recursos'; break;
                        case 'notasRapidasStore': attachmentFolderType = 'notasRapidas'; break;
                        case 'tarefasStore': attachmentFolderType = 'tarefas'; break;
                        case 'protocolosStore': attachmentFolderType = 'processos/protocolos'; break;
                        case 'ptasStore': attachmentFolderType = 'processos/ptas'; break;
                        case 'autuacoesStore': attachmentFolderType = 'processos/autuacoes'; break;
                    }
                    if (attachmentFolderType && window.SEFWorkStation.SharedUtils && typeof window.SEFWorkStation.SharedUtils.tryDeleteEntityAttachmentFolder === 'function') {
                        await window.SEFWorkStation.SharedUtils.tryDeleteEntityAttachmentFolder(attachmentFolderType, item.id, null, null);
                    }
                    await dbRef.deleteItem(storeName, item.id);
                    sucessoCount++;
                } catch (errSingle) {
                    erroCount++;
                }
            }

            let feedbackMsg = `Lixeira para "${labelPlural}" esvaziada. ${sucessoCount} item(ns) excluído(s) permanentemente.`;
            if (erroCount > 0) {
                feedbackMsg += ` ${erroCount} item(ns) falharam ao ser excluídos (ver console).`;
            }
            if (globalShowFeedbackRef) globalShowFeedbackRef(feedbackMsg, erroCount > 0 ? "warning" : "success", feedbackEl);

            if (refreshApplicationStateRef) await refreshApplicationStateRef();
            await carregarItensNaLixeira(storeName, feedbackAreaId);

        } catch (error) {
            if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao esvaziar lixeira para "${labelPlural}": ${error.message}`, "error", feedbackEl);
        }
    }

    return {
        init,
        renderLixeiraGlobalPage
    };
})();