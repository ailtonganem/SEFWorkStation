// js/sharingManager.js - Módulo para a UI da Central de Compartilhamento (Envio em Lote, Histórico)
// v3.0.0 - REFATORADO: Agora usa EntityConfig para exibir todos os tipos de cálculo de ITCD no seletor de compartilhamento em lote.
// v2.3.0 - REFATORADO: Utiliza o módulo centralizado EntityConfig para obter a lista de entidades compartilháveis.
// v2.2 - CORREÇÃO: Move renderHistoricoEnvios para o escopo correto e ajusta chamada de compartilhamento.
// v2.1 - CORREÇÃO: Ajusta lógica de navegação das abas e o fluxo de compartilhamento em lote para evitar erros.
// v2.0 - Implementa histórico de envios e finaliza a funcionalidade.
// v1.0 - Implementação inicial da página e da lógica de compartilhamento em lote.

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.SharingManager = (function() {
    let mainContentWrapperRef;
    let dbRef;
    let appModuleRef;
    let uiModuleRef;
    let sharingModuleRef;
    let ajudaModuleRef;
    let sharedUtilsRef; 

    function init(db, app, utils, ui, sharingMod) {
        dbRef = db;
        appModuleRef = app;
        sharedUtilsRef = utils; 
        uiModuleRef = ui;
        sharingModuleRef = sharingMod;
        mainContentWrapperRef = document.querySelector('.main-content-wrapper');
        ajudaModuleRef = window.SEFWorkStation.Ajuda;
        console.log("SharingManager.JS: Módulo inicializado (v3.0.0).");
    }

    async function renderCentralCompartilhamentoPage() {
        if (!mainContentWrapperRef) return;
        const feedbackAreaId = "feedback-central-compartilhamento";
        
        // Carrega a lista de entidades compartilháveis a partir da configuração central.
        const tiposEntidadeOptions = window.SEFWorkStation.EntityConfig.getAllConfigs()
            .filter(config => config.isCompartilhavel)
            .map(ent => `<option value="${ent.storeName}">${ent.labelPlural}</option>`)
            .join('');

        const pageHtml = `
            <div id="central-compartilhamento-container" class="page-section max-w-none px-4 sm:px-6 lg:px-8">
                <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Central de Compartilhamento</h2>
                <div id="${feedbackAreaId}" class="mb-4"></div>

                <div class="border-b border-gray-200 dark:border-gray-700">
                    <nav id="sharing-manager-tabs" class="-mb-px flex space-x-6" aria-label="Tabs">
                        <button class="tab-item active-tab" data-tab-target="tab-compartilhar-lote">Compartilhar em Lote</button>
                        <button class="tab-item" data-tab-target="tab-historico-envios">Histórico de Envios</button>
                    </nav>
                </div>

                <div class="tab-content mt-5">
                    <div id="tab-compartilhar-lote" class="tab-panel">
                        <div class="section-box p-4 border dark:border-slate-700 rounded-lg">
                            <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100">1. Selecionar Itens para Compartilhar</h3>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                <div>
                                    <label for="tipo-entidade-lote" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de Item:</label>
                                    <select id="tipo-entidade-lote" class="form-input-text mt-1 block w-full text-sm">
                                        <option value="">-- Selecione o tipo --</option>
                                        ${tiposEntidadeOptions}
                                    </select>
                                </div>
                                <div class="md:col-span-2">
                                    <label for="filtro-itens-lote" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Filtrar Itens (por Nome/Título/ID):</label>
                                    <input type="search" id="filtro-itens-lote" class="form-input-text mt-1 block w-full text-sm" disabled>
                                </div>
                            </div>
                            <div id="lista-itens-para-lote" class="mt-4 max-h-80 overflow-y-auto border dark:border-slate-600 rounded-md p-2 bg-gray-50 dark:bg-slate-800/50">
                                <p class="text-sm text-gray-500 dark:text-gray-400 p-4 text-center">Selecione um tipo de item para listar.</p>
                            </div>
                            <div id="lote-actions-container" class="mt-4 hidden">
                                <div class="mb-4 hidden">
                                    <label for="nome-lote-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome do Lote/Compartilhamento:</label>
                                    <input type="text" id="nome-lote-input" class="form-input-text mt-1 block w-full" placeholder="Ex: Documentos do Projeto Alpha">
                                    <p class="text-xs text-gray-500 mt-1">Este nome será exibido para os destinatários e no seu histórico. Obrigatório para mais de 1 item.</p>
                                </div>
                                <div class="flex justify-between items-center">
                                    <label class="inline-flex items-center">
                                        <input type="checkbox" id="selecionar-todos-itens-lote" class="form-checkbox rounded text-blue-600">
                                        <span class="ml-2 text-sm">Selecionar Todos os Itens Visíveis</span>
                                    </label>
                                    <button id="btn-share-lote-selecionados" class="btn-primary">Compartilhar Itens Selecionados</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div id="tab-historico-envios" class="tab-panel hidden">
                        <p class="loading-text p-4">Carregando histórico...</p>
                    </div>
                </div>
            </div>
        `;
        mainContentWrapperRef.innerHTML = pageHtml;
        addEventListenersCentralCompartilhamento();
    }
    
    async function renderDetalhesCompartilhamentoPage(shareId) {
        if (!mainContentWrapperRef) return;
        const feedbackAreaId = `feedback-detalhes-compartilhamento-${shareId}`;
        mainContentWrapperRef.innerHTML = `<div id="detalhes-compartilhamento-container" class="page-section max-w-none px-4 sm:px-6 lg:px-8"><p class="loading-text p-4">Carregando detalhes do compartilhamento...</p></div>`;
        const container = document.getElementById('detalhes-compartilhamento-container');

        try {
            const metaData = await dbRef.getItemById(dbRef.STORES.SHARING_HISTORY, shareId);
            if (!metaData) throw new Error("Registro de compartilhamento não encontrado no histórico local.");

            const sharedFolderHandle = await sharedUtilsRef.getSharedFolderHandle();
            if (!sharedFolderHandle) throw new Error("A pasta compartilhada não está acessível.");
            
            const shareFileHandle = await sharedFolderHandle.getFileHandle(`${shareId}.sefshare.zip`);
            const zipBlob = await shareFileHandle.getFile();
            const zip = await JSZip.loadAsync(zipBlob);
            const packageFile = zip.file('share_package.json');
            if(!packageFile) throw new Error("Arquivo 'share_package.json' não encontrado no pacote de compartilhamento.");
            const sharePackage = JSON.parse(await packageFile.async('string'));

            const recipientStatusHtml = metaData.recipients.map(r => {
                const statusInfo = metaData.status[r.id];
                const statusText = statusInfo?.action === 'imported' ? `Importado em ${new Date(statusInfo.timestamp).toLocaleString()}` : 'Pendente';
                const statusColor = statusInfo?.action === 'imported' ? 'text-green-500 dark:text-green-400' : 'text-yellow-500 dark:text-yellow-400';
                return `<li class="text-sm">${r.nome} - <span class="font-semibold ${statusColor}">${statusText}</span></li>`;
            }).join('');

            const renderItemHtml = (item) => {
                const config = window.SEFWorkStation.EntityConfig.getConfigByStoreName(item._storeName);
                if (!config) return `<li class="text-sm">Item desconhecido (ID: ${item.id})</li>`;

                const displayName = item[config.displayField] || `ID: ${item.id}`;
                const secondaryInfo = item[config.secondaryField] ? `(${item[config.secondaryField]})` : '';
                
                let anexosHtml = '';
                if(item.anexos && item.anexos.length > 0) {
                    anexosHtml = `<ul class="list-disc list-inside ml-4 text-xs text-gray-500 dark:text-gray-400">` +
                                 item.anexos.map(a => `<li>${a.fileName}</li>`).join('') +
                                 `</ul>`;
                }

                return `
                    <div class="p-3 border-l-4 ${item._isMain ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-300 dark:border-slate-600'} rounded-r-lg mb-2">
                        <p class="font-semibold text-gray-800 dark:text-gray-100">
                            ${item._isMain ? 'Principal:' : 'Vinculado:'}
                            <a href="#" class="link-visualizar-item-compartilhado hover:underline" data-store-name="${item._storeName}" data-id="${item.id}" data-view-action="${config.viewAction}" data-datakey="${config.dataKey}">
                                ${displayName} ${secondaryInfo}
                            </a>
                        </p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">Tipo: ${config.labelSingular}</p>
                        ${anexosHtml}
                    </div>
                `;
            };
            
            const mainItemsHtml = sharePackage.entidades.filter(e => e._isMain).map(renderItemHtml).join('');
            const linkedItemsHtml = sharePackage.entidades.filter(e => !e._isMain).map(renderItemHtml).join('');


            const pageHtml = `
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-100 truncate" title="${metaData.title}">Detalhes do Envio: ${metaData.title}</h2>
                    <button id="btn-voltar-detalhes-share" class="btn-secondary btn-sm">Voltar</button>
                </div>
                <div id="${feedbackAreaId}" class="mb-4"></div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div class="lg:col-span-1 space-y-4">
                        <div class="section-box p-4 border dark:border-slate-700 rounded-lg">
                            <h3 class="text-lg font-medium mb-3">Informações Gerais</h3>
                            <dl class="text-sm space-y-1">
                                <div class="flex justify-between"><dt class="font-semibold">De:</dt><dd>${metaData.sender.nome}</dd></div>
                                <div class="flex justify-between"><dt class="font-semibold">Data:</dt><dd>${new Date(metaData.timestamp).toLocaleString()}</dd></div>
                                <div class="flex justify-between"><dt class="font-semibold">ID do Envio:</dt><dd class="text-xs">${metaData.shareId}</dd></div>
                            </dl>
                        </div>
                         <div class="section-box p-4 border dark:border-slate-700 rounded-lg">
                            <h3 class="text-lg font-medium mb-3">Status dos Destinatários</h3>
                            <ul class="list-none space-y-1">${recipientStatusHtml}</ul>
                        </div>
                    </div>
                    <div class="lg:col-span-2 space-y-4">
                        <div class="section-box p-4 border dark:border-slate-700 rounded-lg">
                            <h3 class="text-lg font-medium mb-3">Itens Compartilhados</h3>
                            <div class="max-h-96 overflow-y-auto pr-2">
                                ${mainItemsHtml}
                                ${linkedItemsHtml ? `<hr class="my-3 dark:border-slate-600">${linkedItemsHtml}` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            container.innerHTML = pageHtml;

            container.querySelectorAll('.link-visualizar-item-compartilhado').forEach(link => {
                link.addEventListener('click', e => {
                    e.preventDefault();
                    const { storeName, id, viewAction, datakey } = e.currentTarget.dataset;
                    if(viewAction && appModuleRef.handleMenuAction) {
                        const navData = { [datakey]: id, originatingView: 'historico-compartilhamento' };
                        appModuleRef.handleMenuAction(viewAction, navData);
                    }
                });
            });

            document.getElementById('btn-voltar-detalhes-share').addEventListener('click', () => {
                if(appModuleRef.handleMenuAction) appModuleRef.handleMenuAction('central-compartilhamento');
            });

        } catch (error) {
            console.error("Erro ao renderizar detalhes do compartilhamento:", error);
            container.innerHTML = `<p class="feedback-message error">Falha ao carregar detalhes: ${error.message}</p>`;
        }
    }


    async function renderHistoricoEnvios() {
        const container = document.getElementById('tab-historico-envios');
        if (!container) return;
        container.innerHTML = '<p class="loading-text p-4">Carregando histórico de envios...</p>';
    
        try {
            if (!sharedUtilsRef) throw new Error("Módulo SharedUtils não está inicializado.");
            const currentUser = await sharedUtilsRef.getCurrentUser();
            if (!currentUser) {
                container.innerHTML = '<p class="feedback-message warning">Identidade do usuário não definida. Configure seu perfil para ver o histórico.</p>';
                return;
            }
    
            const historico = await dbRef.getAllItems(dbRef.STORES.SHARING_HISTORY);
            const enviosDoUsuario = historico.filter(item => item.sender.id === currentUser.id)
                                         .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
            if (enviosDoUsuario.length === 0) {
                container.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400 py-8">Nenhum item foi compartilhado por você ainda.</p>';
                return;
            }
    
            let tableHtml = `
                <div class="table-list-container">
                    <table class="documentos-table">
                        <thead>
                            <tr>
                                <th class="w-1/3">Item/Lote Compartilhado</th>
                                <th>Tipo Principal</th>
                                <th class="w-1/4">Enviado Para</th>
                                <th>Data</th>
                                <th class="text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
    
            for (const item of enviosDoUsuario) {
                const config = window.SEFWorkStation.EntityConfig.getConfigByStoreName(item.storeName);
                const tipoDisplay = config ? config.labelSingular : (item.storeName || 'Desconhecido');
                const destinatariosDisplay = item.recipients.map(r => r.nome).join(', ');
                const importedCount = Object.values(item.status || {}).filter(s => s.action === 'imported').length;
                const isFullyImported = importedCount === item.recipients.length;

                tableHtml += `
                    <tr data-share-id="${item.shareId}">
                        <td class="max-w-sm truncate">
                            <a href="#" class="link-visualizar-detalhes-envio font-medium hover:underline" title="${item.title}">${item.title}</a>
                        </td>
                        <td>${tipoDisplay}</td>
                        <td class="truncate" title="${destinatariosDisplay}">${destinatariosDisplay}</td>
                        <td>${new Date(item.timestamp).toLocaleString()}</td>
                        <td class="actions-cell text-center whitespace-nowrap">
                            <button class="btn-link btn-excluir-historico text-red-500 dark:text-red-400" title="Excluir este registro de envio (e arquivos físicos associados)">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash3-fill" viewBox="0 0 16 16"><path d="M11 1.5v1h3.5a.5.5 0 0 1 0 1h-.538l-.853 10.66A2 2 0 0 1 11.115 16h-6.23a2 2 0 0 1-1.994-1.84L2.038 3.5H1.5a.5.5 0 0 1 0-1H5v-1A1.5 1.5 0 0 1 6.5 0h3A1.5 1.5 0 0 1 11 1.5zM4.5 5.029l.5 8.5a.5.5 0 1 0 .998-.06l-.5-8.5a.5.5 0 1 0-.998.06zm6.53-.528a.5.5 0 0 0-.528.47l-.5 8.5a.5.5 0 0 0 .998.058l.5-8.5a.5.5 0 0 0-.47-.528zM8 4.5a.5.5 0 0 0-.5.5v8.5a.5.5 0 0 0 1 0V5a.5.5 0 0 0-.5-.5z"/></svg>
                            </button>
                             <button class="btn-link btn-revogar-compartilhamento text-orange-500 dark:text-orange-400 ${isFullyImported ? 'opacity-50 cursor-not-allowed' : ''}" 
                                     title="${isFullyImported ? 'Não pode ser revogado (todos já importaram)' : 'Revogar compartilhamento (impede novas importações)'}" 
                                     ${isFullyImported ? 'disabled' : ''}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-link-45deg" viewBox="0 0 16 16"><path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1.002 1.002 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4.018 4.018 0 0 1-.128-1.287z"/><path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243L6.586 4.672z"/></svg>
                            </button>
                        </td>
                    </tr>
                `;
            }
            tableHtml += `</tbody></table></div>`;
            container.innerHTML = tableHtml;
    
            container.querySelectorAll('.link-visualizar-detalhes-envio').forEach(link => {
                link.addEventListener('click', e => {
                    e.preventDefault();
                    const shareId = e.currentTarget.closest('tr').dataset.shareId;
                    if(appModuleRef.handleMenuAction) {
                        appModuleRef.handleMenuAction('visualizar-detalhes-compartilhamento', { shareId: shareId });
                    }
                });
            });

            container.querySelectorAll('.btn-excluir-historico').forEach(btn => {
                btn.addEventListener('click', async e => {
                    const tr = e.currentTarget.closest('tr');
                    const shareId = tr.dataset.shareId;
                    const tituloItem = tr.cells[0].textContent.trim();

                    const confirmarExclusao = await uiModuleRef.showConfirmationModal(
                        'Confirmar Exclusão de Envio',
                        `Você tem certeza que deseja excluir o registro do envio "${tituloItem}"? <br><strong class="text-red-500">Isso também tentará apagar os arquivos .meta e .sefshare da pasta compartilhada. Esta ação não pode ser desfeita.</strong>`,
                        'Sim, Excluir', 'Cancelar'
                    );

                    if (confirmarExclusao) {
                        revogarCompartilhamento(shareId, true); // true para também deletar do DB
                    }
                });
            });

            container.querySelectorAll('.btn-revogar-compartilhamento').forEach(btn => {
                btn.addEventListener('click', async e => {
                    const tr = e.currentTarget.closest('tr');
                    const shareId = tr.dataset.shareId;
                    const tituloItem = tr.cells[0].textContent.trim();

                    const confirmarRevogacao = await uiModuleRef.showConfirmationModal(
                        'Confirmar Revogação',
                        `Você tem certeza que deseja revogar o compartilhamento do item/lote "${tituloItem}"? <br>Isso apagará os arquivos da pasta compartilhada, impedindo que destinatários que ainda não importaram o façam. O registro permanecerá no seu histórico.`,
                        'Sim, Revogar', 'Cancelar'
                    );
                    if (confirmarRevogacao) {
                        revogarCompartilhamento(shareId, false); // false para não deletar do DB
                    }
                });
            });
    
        } catch (error) {
            console.error("Erro ao renderizar histórico de envios:", error);
            container.innerHTML = `<p class="feedback-message error">Falha ao carregar o histórico: ${error.message}</p>`;
        }
    }
    
    async function revogarCompartilhamento(shareId, deletarDoHistorico = false) {
        uiModuleRef.showLoading(true, "Revogando compartilhamento...");
        try {
            const sharedFolderHandle = await sharedUtilsRef.getSharedFolderHandle();
            if (sharedFolderHandle) {
                try {
                    await sharedFolderHandle.removeEntry(`${shareId}.meta`);
                } catch (e) { if (e.name !== 'NotFoundError') console.warn(`Não foi possível remover ${shareId}.meta:`, e); }
                 try {
                    await sharedFolderHandle.removeEntry(`${shareId}.sefshare.zip`);
                } catch (e) { if (e.name !== 'NotFoundError') console.warn(`Não foi possível remover ${shareId}.sefshare.zip:`, e); }
            }
            if (deletarDoHistorico) {
                await dbRef.deleteItem(dbRef.STORES.SHARING_HISTORY, shareId);
                appModuleRef.showGlobalFeedback("Registro de envio excluído com sucesso.", "success");
            } else {
                appModuleRef.showGlobalFeedback("Compartilhamento revogado. Os arquivos foram removidos da pasta compartilhada.", "success");
            }
            renderHistoricoEnvios(); 
        } catch (error) {
            console.error(`Erro ao revogar/excluir o envio ${shareId}:`, error);
            appModuleRef.showGlobalFeedback("Falha ao revogar o compartilhamento.", "error");
        } finally {
            uiModuleRef.showLoading(false);
        }
    }

    function addEventListenersCentralCompartilhamento() {
        const tabsContainer = document.getElementById('sharing-manager-tabs');
        const tabPanels = document.querySelectorAll('.tab-panel');
        
        tabsContainer.querySelectorAll('.tab-item').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                tabsContainer.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active-tab'));
                e.currentTarget.classList.add('active-tab');
                
                const targetId = e.currentTarget.dataset.tabTarget;
                tabPanels.forEach(panel => {
                    panel.classList.toggle('hidden', panel.id !== targetId);
                });
                
                if (targetId === 'tab-historico-envios') {
                    renderHistoricoEnvios();
                }
            });
        });

        const tipoEntidadeSelect = document.getElementById('tipo-entidade-lote');
        const filtroInput = document.getElementById('filtro-itens-lote');
        
        const loadItems = async () => {
            const storeName = tipoEntidadeSelect.value;
            const searchTerm = filtroInput.value;
            await renderListaItensParaSelecao(storeName, searchTerm);
        };

        tipoEntidadeSelect.addEventListener('change', () => {
            filtroInput.disabled = !tipoEntidadeSelect.value;
            filtroInput.value = '';
            loadItems();
        });
        filtroInput.addEventListener('input', loadItems);
        
        const loteActionsContainer = document.getElementById('lote-actions-container');
        document.getElementById('lista-itens-para-lote').addEventListener('change', (e) => {
            if(e.target.classList.contains('item-lote-checkbox')) {
                const numSelecionados = document.querySelectorAll('.item-lote-checkbox:checked').length;
                const nomeLoteInputContainer = document.getElementById('nome-lote-input').parentElement;

                if (numSelecionados > 1) {
                    nomeLoteInputContainer.classList.remove('hidden');
                } else {
                    nomeLoteInputContainer.classList.add('hidden');
                }
            }
        });


        document.getElementById('selecionar-todos-itens-lote')?.addEventListener('click', e => {
            document.querySelectorAll('#lista-itens-para-lote input[type="checkbox"]').forEach(cb => {
                cb.checked = e.target.checked;
                cb.dispatchEvent(new Event('change', { bubbles: true }));
            });
        });
        
        document.getElementById('btn-share-lote-selecionados')?.addEventListener('click', handleShareLote);
    }

    async function renderListaItensParaSelecao(storeName, searchTerm) {
        const container = document.getElementById('lista-itens-para-lote');
        const loteActionsContainer = document.getElementById('lote-actions-container');
        
        loteActionsContainer.classList.add('hidden');
        if (!storeName) {
            container.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400 p-4 text-center">Selecione um tipo de item para listar.</p>';
            return;
        }
        container.innerHTML = '<p class="loading-text p-4">Carregando itens...</p>';

        try {
            const config = window.SEFWorkStation.EntityConfig.getConfigByStoreName(storeName);
            let itens = await dbRef.getAllItems(storeName);
            itens = itens.filter(item => !(item.isDeleted || item.isExcluida));

            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                itens = itens.filter(item => 
                    (item[config.displayField] && item[config.displayField].toLowerCase().includes(term)) ||
                    (item[config.secondaryField] && item[config.secondaryField].toLowerCase().includes(term)) ||
                    (item.id.toString().toLowerCase().includes(term))
                );
            }

            if (itens.length === 0) {
                container.innerHTML = `<p class="text-sm text-gray-500 dark:text-gray-400 p-4 text-center">Nenhum item encontrado para "${config.labelPlural}".</p>`;
                return;
            }
            loteActionsContainer.classList.remove('hidden');
            document.getElementById('nome-lote-input').parentElement.classList.add('hidden');


            let itemsHtml = '<ul class="space-y-1">';
            itens.forEach(item => {
                const displayName = item[config.displayField] || `ID: ${item.id}`;
                const secondaryInfo = item[config.secondaryField] ? `(${item[config.secondaryField]})` : '';
                itemsHtml += `<li class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700">
                    <label class="flex items-center text-xs cursor-pointer">
                        <input type="checkbox" value="${item.id}" data-store-name="${storeName}" data-title="${displayName.replace(/"/g, '"')}" class="form-checkbox item-lote-checkbox h-4 w-4 mr-2">
                        <span class="text-gray-800 dark:text-gray-200 truncate" title="${displayName} ${secondaryInfo}">${displayName} <span class="text-gray-500 dark:text-gray-400">${secondaryInfo}</span></span>
                    </label>
                </li>`;
            });
            itemsHtml += '</ul>';
            container.innerHTML = itemsHtml;
        } catch (error) {
            container.innerHTML = `<p class="feedback-message error">Erro ao carregar itens: ${error.message}</p>`;
        }
    }

    async function handleShareLote() {
        const selecionados = Array.from(document.querySelectorAll('.item-lote-checkbox:checked'))
            .map(cb => ({ 
                entityId: cb.value, 
                storeName: cb.dataset.storeName,
                title: cb.dataset.title
            }));

        if (selecionados.length === 0) {
            appModuleRef.showGlobalFeedback("Nenhum item selecionado para compartilhar.", "warning");
            return;
        }

        const nomeLoteInput = document.getElementById('nome-lote-input');
        let customTitle = nomeLoteInput.value.trim();

        if (selecionados.length > 1 && !customTitle) {
             appModuleRef.showGlobalFeedback("O nome do lote é obrigatório ao compartilhar múltiplos itens.", "error");
             nomeLoteInput.focus();
             return;
        }
        
        if (selecionados.length === 1 && !customTitle) {
            customTitle = selecionados[0].title;
        }

        const recipients = await openRecipientSelectionModal();
        if (!recipients) return; 

        uiModuleRef.showLoading(true, `Compartilhando ${selecionados.length} itens...`);
        let firstSuccessfulMetaData = null;
        
        try {
            const metaData = await sharingModuleRef.shareItem(selecionados, recipients, { customTitle });
            if (metaData) {
                firstSuccessfulMetaData = metaData;
                appModuleRef.showGlobalFeedback(`${selecionados.length} item(ns) preparados para compartilhamento.`, "success");
            } else {
                throw new Error("Falha ao gerar o pacote de compartilhamento.");
            }
        } catch (e) {
             console.error(`Erro ao compartilhar o lote de itens:`, e);
             appModuleRef.showGlobalFeedback("Erro ao compartilhar lote.", "error");
        }
        
        uiModuleRef.showLoading(false);
        
        if(firstSuccessfulMetaData) {
            sharingModuleRef.prepareNotificationEmail(firstSuccessfulMetaData);
        }
    }

    async function openRecipientSelectionModal() {
        return await new Promise(async (resolve) => {
             const allServers = await dbRef.getAllItems('servidoresStore');
             const allGroups = await dbRef.getAllItems('servidoresGruposStore');
             const allPossibleRecipients = [
                ...allServers.filter(s => !s.isDeleted && s.email).map(s => ({ id: s.id, nome: s.nome, email: s.email, tipo: 'Servidor' })),
                ...allGroups.filter(g => !g.isDeleted).map(g => ({ id: g.id, nome: g.nomeGrupo, tipo: 'Grupo' }))
            ].sort((a, b) => a.nome.localeCompare(b.nome));

            let modalContent = `
                <div id="feedback-recipient-modal"></div>
                <p class="text-sm mb-3">Selecione os servidores ou grupos que receberão os itens.</p>
                <div id="recipient-selection-container" class="max-h-60 overflow-y-auto border p-2 rounded-md">
                    ${allPossibleRecipients.map(r => `
                        <label class="block p-1 hover:bg-gray-100 dark:hover:bg-slate-600 rounded">
                            <input type="checkbox" value="${r.id}" data-type="${r.tipo}" class="form-checkbox recipient-checkbox">
                            <span class="ml-2 text-sm">${r.nome} (${r.tipo})</span>
                        </label>
                    `).join('')}
                </div>
            `;

            uiModuleRef.showModal("Selecionar Destinatários", modalContent, [
                { text: 'Cancelar', class: 'btn-secondary', callback: () => resolve(null), closesModal: true },
                { text: 'Confirmar e Compartilhar', class: 'btn-primary', callback: async () => {
                    const selectedRecipients = [];
                    document.querySelectorAll('.recipient-checkbox:checked').forEach(cb => {
                        const recipient = allPossibleRecipients.find(r => r.id === cb.value);
                        if (recipient) selectedRecipients.push(recipient);
                    });
                    if (selectedRecipients.length === 0) {
                        document.getElementById('feedback-recipient-modal').innerHTML = '<p class="text-red-500 text-sm">Selecione ao menos um destinatário.</p>';
                        return false; 
                    }
                    resolve(selectedRecipients);
                    return true;
                }, closesModal: true}
            ]);
        });
    }

    return {
        init,
        renderCentralCompartilhamentoPage,
        renderDetalhesCompartilhamentoPage,
        renderHistoricoEnvios
    };
})();