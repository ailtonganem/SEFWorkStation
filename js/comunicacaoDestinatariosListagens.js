// js/comunicacaoDestinatariosListagens.js - Listagens de Destinatários Individuais
// v1.2.0 - Adiciona menu de contexto (botão direito) nas linhas da listagem.
// v1.1.1 - Remove classe page-section para expandir a largura da visualização.
// v1.1 - Adiciona botão "Visualizar" na listagem.
// (Histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.Comunicacao = window.SEFWorkStation.Comunicacao || {};

window.SEFWorkStation.ComunicacaoDestinatariosListagens = (function() {
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let navigateToAppViewRef;
    let refreshApplicationStateRef;
    let dbRef;
    let appModuleRef;
    let uiModuleRef;
    let formModuleRef;
    // let viewModuleRef; // Ainda não temos um viewModule específico para destinatários, será criado

    const DESTINATARIOS_STORE_NAME = 'comunicacaoDestinatariosStore';

    let currentDestinatariosFilters = {
        searchTerm: '',
        sortField: 'nome',
        sortOrder: 'asc'
    };

    function init(
        mainWrapper, showFeedback, clearFeedback, navigateTo, refreshState,
        db, applicationModule, ui, formMod
        // , viewMod // Será adicionado quando o View existir
    ) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedback;
        globalClearFeedbackRef = clearFeedback;
        navigateToAppViewRef = navigateTo; // Esta é a função principal handleMenuAction do app
        refreshApplicationStateRef = refreshState;
        dbRef = db;
        appModuleRef = applicationModule;
        uiModuleRef = ui;
        formModuleRef = formMod;
        // viewModuleRef = viewMod; 

        console.log("ComunicacaoDestinatariosListagens.JS: Módulo inicializado (v1.2.0).");
    }

    async function filterAndSortDestinatarios(destinatarios, filters) {
        let processados = destinatarios.filter(d => !d.isDeleted);

        if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase().trim();
            processados = processados.filter(d =>
                (d.nome && d.nome.toLowerCase().includes(term)) ||
                (d.email && d.email.toLowerCase().includes(term)) ||
                (d.empresa && d.empresa.toLowerCase().includes(term))
            );
        }

        processados.sort((a, b) => {
            const valA = (a[filters.sortField] || '').toLowerCase();
            const valB = (b[filters.sortField] || '').toLowerCase();
            return filters.sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        });
        return processados;
    }

    async function renderGerirDestinatariosPage() {
        const feedbackAreaId = "feedback-list-destinatarios";
        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (!mainContentWrapperRef) {
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico ao renderizar lista de destinatários.", "error");
            return;
        }
        mainContentWrapperRef.innerHTML = '<p class="loading-text p-4">Carregando destinatários...</p>';

        try {
            const todosDestinatarios = await dbRef.getAllItems(DESTINATARIOS_STORE_NAME);
            const destinatariosProcessados = await filterAndSortDestinatarios(todosDestinatarios, currentDestinatariosFilters);

            let listHtml = `
                <div> 
                    <div id="${feedbackAreaId}" class="mb-4"></div>
                    <div class="gerir-documentos-toolbar mb-2 flex justify-between items-center">
                        <h2 class="text-xl font-semibold">Gerir Destinatários</h2>
                        <button id="btn-novo-destinatario-lista" class="btn-primary ml-2 text-sm py-1.5 px-3">Novo Destinatário</button>
                    </div>

                    <div class="filtros-avancados-recursos p-4 mb-6 border dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                            <div>
                                <label for="search-destinatarios-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Buscar por Nome, E-mail ou Empresa:</label>
                                <input type="search" id="search-destinatarios-input" class="form-input-text mt-1 block w-full text-sm" value="${currentDestinatariosFilters.searchTerm}">
                            </div>
                            <div class="flex items-end">
                                <button id="btn-aplicar-filtros-dest" class="btn-primary btn-sm text-sm py-1.5 px-3 w-full md:w-auto">Aplicar Filtros</button>
                                <button id="btn-limpar-filtros-dest" class="btn-secondary btn-sm text-sm py-1.5 px-3 ml-2">Limpar</button>
                            </div>
                        </div>
                    </div>
            `;

            if (destinatariosProcessados.length === 0) {
                listHtml += `<p class="text-center text-gray-500 dark:text-gray-400 py-8">
                    ${currentDestinatariosFilters.searchTerm ? 'Nenhum destinatário encontrado com o filtro aplicado.' : 'Nenhum destinatário cadastrado ainda.'}
                </p>`;
            } else {
                const tableRows = destinatariosProcessados.map(dest => `
                    <tr data-id="${dest.id}" data-nome="${dest.nome.replace(/"/g, '"')}">
                        <td>${dest.nome}</td>
                        <td>${dest.email}</td>
                        <td>${dest.empresa || 'N/A'}</td>
                        <td class="actions-cell text-center whitespace-nowrap">
                            <button class="btn-link btn-visualizar-destinatario-lista p-1 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-300" data-id="${dest.id}" title="Visualizar Destinatário">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye-fill inline-block" viewBox="0 0 16 16"><path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/><path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/></svg>
                            </button>
                            <button class="btn-link btn-editar-destinatario-lista p-1 text-gray-600 hover:text-yellow-600 dark:text-gray-400 dark:hover:text-yellow-300" data-id="${dest.id}" title="Editar Destinatário">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square inline-block" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg>
                            </button>
                            <button class="btn-link btn-excluir-destinatario-lista p-1 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-300" data-id="${dest.id}" data-nome="${dest.nome.replace(/"/g, '"')}" title="Mover para Lixeira">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash-fill inline-block" viewBox="0 0 16 16"><path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1H2.5zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5zM8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5zm3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0z"/></svg>
                            </button>
                        </td>
                    </tr>`).join('');

                listHtml += `
                    <div class="table-list-container">
                        <table id="tabela-destinatarios" class="documentos-table">
                            <thead>
                                <tr>
                                    <th data-sort-dest="nome" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700">Nome <span class="sort-arrow-dest"></span></th>
                                    <th data-sort-dest="email" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700">E-mail <span class="sort-arrow-dest"></span></th>
                                    <th data-sort-dest="empresa" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700">Empresa/Organização <span class="sort-arrow-dest"></span></th>
                                    <th class="w-1/6 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody>${tableRows}</tbody>
                        </table>
                    </div>
                `;
            }
            listHtml += '</div>';
            mainContentWrapperRef.innerHTML = listHtml;
            updateSortArrowsDestinatarios();
            addEventListenersToListagemDestinatarios(document.getElementById(feedbackAreaId));
        } catch (error) {
            mainContentWrapperRef.innerHTML = `<p class="feedback-message error p-4">Erro ao carregar destinatários: ${error.message}</p>`;
        }
    }

    function updateSortArrowsDestinatarios() {
        const table = document.getElementById('tabela-destinatarios');
        if (!table) return;
        table.querySelectorAll('th[data-sort-dest]').forEach(th => {
            const arrowSpan = th.querySelector('.sort-arrow-dest');
             if (!arrowSpan) {
                const newSpan = document.createElement('span');
                newSpan.className = 'sort-arrow-dest';
                th.appendChild(newSpan);
            }
            const currentArrowSpan = th.querySelector('.sort-arrow-dest');
            if (th.dataset.sortDest === currentDestinatariosFilters.sortField) {
                currentArrowSpan.textContent = currentDestinatariosFilters.sortOrder === 'asc' ? ' ▲' : ' ▼';
            } else {
                currentArrowSpan.textContent = '';
            }
        });
    }

    function addEventListenersToListagemDestinatarios(feedbackDisplayArea) {
        document.getElementById('btn-novo-destinatario-lista')?.addEventListener('click', () => {
            if (navigateToAppViewRef) { // Usa a função de navegação do app
                navigateToAppViewRef('novo-destinatario');
            }
        });

        // ... (resto dos listeners para filtros e ordenação mantidos) ...
        const searchInput = document.getElementById('search-destinatarios-input');
        const btnAplicarFiltros = document.getElementById('btn-aplicar-filtros-dest');
        const btnLimparFiltros = document.getElementById('btn-limpar-filtros-dest');

        if (btnAplicarFiltros) {
            btnAplicarFiltros.addEventListener('click', () => {
                currentDestinatariosFilters.searchTerm = searchInput ? searchInput.value : '';
                renderGerirDestinatariosPage();
            });
        }
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') btnAplicarFiltros.click(); });
        }
        if (btnLimparFiltros) {
            btnLimparFiltros.addEventListener('click', () => {
                currentDestinatariosFilters.searchTerm = '';
                if (searchInput) searchInput.value = '';
                renderGerirDestinatariosPage();
            });
        }

        document.querySelectorAll('#tabela-destinatarios th[data-sort-dest]').forEach(th => {
            th.addEventListener('click', () => {
                const field = th.dataset.sortDest;
                if (currentDestinatariosFilters.sortField === field) {
                    currentDestinatariosFilters.sortOrder = currentDestinatariosFilters.sortOrder === 'asc' ? 'desc' : 'asc';
                } else {
                    currentDestinatariosFilters.sortField = field;
                    currentDestinatariosFilters.sortOrder = 'asc';
                }
                renderGerirDestinatariosPage();
            });
        });
        
        // NOVO: Adiciona listener de contexto às linhas da tabela
        mainContentWrapperRef.querySelectorAll('#tabela-destinatarios tbody tr').forEach(row => {
            row.addEventListener('contextmenu', (event) => {
                event.preventDefault();
                const destId = row.dataset.id;
                const destNome = row.dataset.nome;

                const menuItems = [
                    { label: 'Visualizar', action: () => navigateToAppViewRef('visualizar-destinatario', { destinatarioId: destId, originatingView: 'gerir-destinatarios' }) },
                    { label: 'Editar', action: async () => {
                        const destinatario = await dbRef.getItemById(DESTINATARIOS_STORE_NAME, destId);
                        navigateToAppViewRef('form-destinatario', { destinatario: destinatario, originatingView: 'gerir-destinatarios' });
                    }},
                    { isSeparator: true },
                    { label: 'Mover para Lixeira', action: async () => {
                        if (await uiModuleRef.showConfirmationModal('Mover para Lixeira', `Tem certeza que deseja mover o destinatário "${destNome}" para a lixeira?`)) {
                             try {
                                const destinatario = await dbRef.getItemById(DESTINATARIOS_STORE_NAME, destId);
                                if (destinatario) {
                                    destinatario.isDeleted = true;
                                    destinatario.dataModificacao = new Date().toISOString();
                                    await dbRef.updateItem(DESTINATARIOS_STORE_NAME, destinatario);
                                    
                                    if (SEFWorkStation.DB && SEFWorkStation.DB.STORES && SEFWorkStation.DB.STORES.COMUNICACAO_GRUPOS) {
                                        const grupos = await dbRef.getAllItems(SEFWorkStation.DB.STORES.COMUNICACAO_GRUPOS);
                                        for (const grupo of grupos) {
                                            if (grupo.idsDestinatariosMembros && grupo.idsDestinatariosMembros.includes(destId)) {
                                                grupo.idsDestinatariosMembros = grupo.idsDestinatariosMembros.filter(id => id !== destId);
                                                grupo.dataModificacao = new Date().toISOString();
                                                await dbRef.updateItem(SEFWorkStation.DB.STORES.COMUNICACAO_GRUPOS, grupo);
                                            }
                                        }
                                    }

                                    if (globalShowFeedbackRef) globalShowFeedbackRef(`Destinatário "${destNome}" movido para a lixeira.`, "success");
                                    if (refreshApplicationStateRef) await refreshApplicationStateRef();
                                    renderGerirDestinatariosPage();
                                }
                            } catch (error) {
                                if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao mover destinatário: ${error.message}`, "error");
                            }
                        }
                    }}
                ];
                
                if (uiModuleRef && uiModuleRef.showContextMenu) {
                    uiModuleRef.showContextMenu(event.currentTarget, menuItems);
                }
            });
        });

        mainContentWrapperRef.querySelectorAll('.btn-visualizar-destinatario-lista').forEach(button => {
            button.addEventListener('click', (event) => {
                const destId = event.currentTarget.dataset.id;
                if (navigateToAppViewRef) {
                    navigateToAppViewRef('visualizar-destinatario', { destinatarioId: destId, originatingView: 'gerir-destinatarios' });
                }
            });
        });

        mainContentWrapperRef.querySelectorAll('.btn-editar-destinatario-lista').forEach(button => {
            button.addEventListener('click', async (event) => {
                const destId = event.currentTarget.dataset.id;
                 if (navigateToAppViewRef) {
                    const destinatario = await dbRef.getItemById(DESTINATARIOS_STORE_NAME, destId);
                    navigateToAppViewRef('form-destinatario', { destinatario: destinatario, originatingView: 'gerir-destinatarios' });
                }
            });
        });

        mainContentWrapperRef.querySelectorAll('.btn-excluir-destinatario-lista').forEach(button => {
            button.addEventListener('click', async (event) => {
                const destId = event.currentTarget.dataset.id;
                const destNome = event.currentTarget.dataset.nome;
                if (confirm(`Tem certeza que deseja mover o destinatário "${destNome}" para a lixeira?`)) {
                    try {
                        const destinatario = await dbRef.getItemById(DESTINATARIOS_STORE_NAME, destId);
                        if (destinatario) {
                            destinatario.isDeleted = true;
                            destinatario.dataModificacao = new Date().toISOString();
                            await dbRef.updateItem(DESTINATARIOS_STORE_NAME, destinatario);
                            
                            if (SEFWorkStation.DB && SEFWorkStation.DB.STORES && SEFWorkStation.DB.STORES.COMUNICACAO_GRUPOS) {
                                const grupos = await dbRef.getAllItems(SEFWorkStation.DB.STORES.COMUNICACAO_GRUPOS);
                                for (const grupo of grupos) {
                                    if (grupo.idsDestinatariosMembros && grupo.idsDestinatariosMembros.includes(destId)) {
                                        grupo.idsDestinatariosMembros = grupo.idsDestinatariosMembros.filter(id => id !== destId);
                                        grupo.dataModificacao = new Date().toISOString();
                                        await dbRef.updateItem(SEFWorkStation.DB.STORES.COMUNICACAO_GRUPOS, grupo);
                                    }
                                }
                            }

                            if (globalShowFeedbackRef) globalShowFeedbackRef(`Destinatário "${destNome}" movido para a lixeira.`, "success", feedbackDisplayArea);
                            if (refreshApplicationStateRef) await refreshApplicationStateRef();
                            renderGerirDestinatariosPage();
                        }
                    } catch (error) {
                        if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao mover destinatário: ${error.message}`, "error", feedbackDisplayArea);
                    }
                }
            });
        });
    }

    return {
        init,
        renderGerirDestinatariosPage
    };
})();