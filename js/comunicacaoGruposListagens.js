// js/comunicacaoGruposListagens.js - Listagens de Grupos de Destinatários
// v1.2.0 - Adiciona menu de contexto (botão direito) nas linhas da listagem.
// v1.1.1 - Remove classe page-section para expandir a largura da visualização.
// v1.1.0 - Adiciona botão "Visualizar" na listagem.
// (Histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.Comunicacao = window.SEFWorkStation.Comunicacao || {};
window.SEFWorkStation.ComunicacaoGrupos = window.SEFWorkStation.ComunicacaoGrupos || {};

window.SEFWorkStation.ComunicacaoGrupos.Listagens = (function() {
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let navigateToAppViewRef;
    let refreshApplicationStateRef;
    let dbRef;
    let appModuleRef;
    let uiModuleRef;
    let formModuleRef; 

    const SERVIDORES_GRUPOS_STORE_NAME = 'comunicacaoGruposStore';

    let currentGruposFilters = {
        searchTerm: '',
        sortField: 'nomeGrupo',
        sortOrder: 'asc'
    };

    function init(
        mainWrapper, showFeedback, clearFeedback, navigateTo, refreshState,
        db, applicationModule, ui, formMod
    ) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedback;
        globalClearFeedbackRef = clearFeedback;
        navigateToAppViewRef = navigateTo;
        refreshApplicationStateRef = refreshState;
        dbRef = db;
        appModuleRef = applicationModule;
        uiModuleRef = ui;
        formModuleRef = formMod; 

        console.log("ComunicacaoGruposListagens.JS: Módulo inicializado (v1.2.0).");
    }

    async function filterAndSortGrupos(grupos, filters) {
        let processados = grupos.filter(g => !g.isDeleted);

        if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase().trim();
            processados = processados.filter(g =>
                (g.nomeGrupo && g.nomeGrupo.toLowerCase().includes(term)) ||
                (g.descricaoGrupo && g.descricaoGrupo.toLowerCase().includes(term))
            );
        }

        processados.sort((a, b) => {
            const valA = (a[filters.sortField] || '').toLowerCase();
            const valB = (b[filters.sortField] || '').toLowerCase();
            return filters.sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        });
        return processados;
    }

    async function renderGerirGruposDestinatariosPage() {
        const feedbackAreaId = "feedback-list-grupos-comunicacao";
        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (!mainContentWrapperRef) {
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico ao renderizar lista de grupos.", "error");
            return;
        }
        mainContentWrapperRef.innerHTML = '<p class="loading-text p-4">Carregando grupos de destinatários...</p>';

        try {
            const todosGrupos = await dbRef.getAllItems(SERVIDORES_GRUPOS_STORE_NAME);
            const gruposProcessados = await filterAndSortGrupos(todosGrupos, currentGruposFilters);

            let listHtml = `
                <div> 
                    <div id="${feedbackAreaId}" class="mb-4"></div>
                    <div class="gerir-documentos-toolbar mb-2 flex justify-between items-center">
                        <h2 class="text-xl font-semibold">Gerir Grupos de Destinatários</h2>
                        <button id="btn-novo-grupo-comunicacao-lista" class="btn-primary ml-2 text-sm py-1.5 px-3">Novo Grupo</button>
                    </div>

                    <div class="filtros-avancados-recursos p-4 mb-6 border dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                            <div>
                                <label for="search-grupos-comunicacao-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Buscar por Nome ou Descrição:</label>
                                <input type="search" id="search-grupos-comunicacao-input" class="form-input-text mt-1 block w-full text-sm" value="${currentGruposFilters.searchTerm}">
                            </div>
                            <div class="flex items-end">
                                <button id="btn-aplicar-filtros-grupos-com" class="btn-primary btn-sm text-sm py-1.5 px-3 w-full md:w-auto">Aplicar Filtros</button>
                                <button id="btn-limpar-filtros-grupos-com" class="btn-secondary btn-sm text-sm py-1.5 px-3 ml-2">Limpar</button>
                            </div>
                        </div>
                    </div>
            `;

            if (gruposProcessados.length === 0) {
                listHtml += `<p class="text-center text-gray-500 dark:text-gray-400 py-8">
                    ${currentGruposFilters.searchTerm ? 'Nenhum grupo encontrado com o filtro aplicado.' : 'Nenhum grupo de destinatários cadastrado ainda.'}
                </p>`;
            } else {
                const tableRows = gruposProcessados.map(grupo => {
                    const membrosCount = (grupo.idsDestinatariosMembros || []).length;
                    const emailsAvulsosCount = (grupo.emailsAvulsosMembros || []).length;
                    return `
                        <tr data-id="${grupo.id}" data-nome="${grupo.nomeGrupo.replace(/"/g, '"')}">
                            <td>${grupo.nomeGrupo}</td>
                            <td class="text-sm text-gray-600 dark:text-gray-400">${(grupo.descricaoGrupo || '').substring(0,70)}${(grupo.descricaoGrupo || '').length > 70 ? '...' : ''}</td>
                            <td class="text-center">${membrosCount}</td>
                            <td class="text-center">${emailsAvulsosCount}</td>
                            <td class="actions-cell text-center whitespace-nowrap">
                                <button class="btn-link btn-visualizar-grupo-comunicacao-lista p-1 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-300" data-id="${grupo.id}" title="Visualizar Grupo">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye-fill inline-block" viewBox="0 0 16 16"><path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/><path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/></svg>
                                </button>
                                <button class="btn-link btn-editar-grupo-comunicacao-lista p-1 text-gray-600 hover:text-yellow-600 dark:text-gray-400 dark:hover:text-yellow-300" data-id="${grupo.id}" title="Editar Grupo">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square inline-block" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg>
                                </button>
                                <button class="btn-link btn-excluir-grupo-comunicacao-lista p-1 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-300" data-id="${grupo.id}" data-nome="${grupo.nomeGrupo.replace(/"/g, '"')}" title="Mover Grupo para Lixeira">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash-fill inline-block" viewBox="0 0 16 16"><path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1H2.5zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5zM8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5zm3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0z"/></svg>
                                </button>
                            </td>
                        </tr>`;
                }).join('');

                listHtml += `
                    <div class="table-list-container">
                        <table id="tabela-grupos-comunicacao" class="documentos-table">
                            <thead>
                                <tr>
                                    <th data-sort-grupo-com="nomeGrupo" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700">Nome do Grupo <span class="sort-arrow-grupo-com"></span></th>
                                    <th data-sort-grupo-com="descricaoGrupo" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700">Descrição <span class="sort-arrow-grupo-com"></span></th>
                                    <th class="text-center">Membros (Dest. Cadastrados)</th>
                                    <th class="text-center">Membros (E-mails Avulsos)</th>
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
            updateSortArrowsGruposComunicacao();
            addEventListenersToListagemGruposComunicacao(document.getElementById(feedbackAreaId));
        } catch (error) {
            mainContentWrapperRef.innerHTML = `<p class="feedback-message error p-4">Erro ao carregar grupos: ${error.message}</p>`;
        }
    }

    function updateSortArrowsGruposComunicacao() {
        const table = document.getElementById('tabela-grupos-comunicacao');
        if (!table) return;
        table.querySelectorAll('th[data-sort-grupo-com]').forEach(th => {
            const arrowSpan = th.querySelector('.sort-arrow-grupo-com');
             if (!arrowSpan) {
                const newSpan = document.createElement('span');
                newSpan.className = 'sort-arrow-grupo-com';
                th.appendChild(newSpan);
            }
            const currentArrowSpan = th.querySelector('.sort-arrow-grupo-com');
            if (th.dataset.sortGrupoCom === currentGruposFilters.sortField) {
                currentArrowSpan.textContent = currentGruposFilters.sortOrder === 'asc' ? ' ▲' : ' ▼';
            } else {
                currentArrowSpan.textContent = '';
            }
        });
    }

    function addEventListenersToListagemGruposComunicacao(feedbackDisplayArea) {
        document.getElementById('btn-novo-grupo-comunicacao-lista')?.addEventListener('click', () => {
            if (navigateToAppViewRef) {
                navigateToAppViewRef('novo-grupo-destinatarios');
            }
        });

        // ... (resto dos listeners para filtros e ordenação mantidos) ...
        const searchInput = document.getElementById('search-grupos-comunicacao-input');
        const btnAplicarFiltros = document.getElementById('btn-aplicar-filtros-grupos-com');
        const btnLimparFiltros = document.getElementById('btn-limpar-filtros-grupos-com');

        if (btnAplicarFiltros) {
            btnAplicarFiltros.addEventListener('click', () => {
                currentGruposFilters.searchTerm = searchInput ? searchInput.value : '';
                renderGerirGruposDestinatariosPage();
            });
        }
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') btnAplicarFiltros.click(); });
        }
        if (btnLimparFiltros) {
            btnLimparFiltros.addEventListener('click', () => {
                currentGruposFilters.searchTerm = '';
                if (searchInput) searchInput.value = '';
                renderGerirGruposDestinatariosPage();
            });
        }

        document.querySelectorAll('#tabela-grupos-comunicacao th[data-sort-grupo-com]').forEach(th => {
            th.addEventListener('click', () => {
                const field = th.dataset.sortGrupoCom;
                if (currentGruposFilters.sortField === field) {
                    currentGruposFilters.sortOrder = currentGruposFilters.sortOrder === 'asc' ? 'desc' : 'asc';
                } else {
                    currentGruposFilters.sortField = field;
                    currentGruposFilters.sortOrder = 'asc';
                }
                renderGerirGruposDestinatariosPage();
            });
        });

        // NOVO: Adiciona listener de contexto às linhas da tabela
        mainContentWrapperRef.querySelectorAll('#tabela-grupos-comunicacao tbody tr').forEach(row => {
            row.addEventListener('contextmenu', (event) => {
                event.preventDefault();
                const grupoId = row.dataset.id;
                const grupoNome = row.dataset.nome;

                const menuItems = [
                    { label: 'Visualizar', action: () => navigateToAppViewRef('visualizar-grupo-destinatarios', { grupoId: grupoId, originatingView: 'gerir-grupos-destinatarios' }) },
                    { label: 'Editar', action: async () => {
                        const grupo = await dbRef.getItemById(SERVIDORES_GRUPOS_STORE_NAME, grupoId);
                        navigateToAppViewRef('form-grupo-destinatarios', { grupo: grupo, originatingView: 'gerir-grupos-destinatarios' });
                    }},
                    { isSeparator: true },
                    { label: 'Mover para Lixeira', action: async () => {
                        if (await uiModuleRef.showConfirmationModal('Mover para Lixeira', `Tem certeza que deseja mover o grupo "${grupoNome}" para a lixeira? (Os membros não serão excluídos).`)) {
                            try {
                                const grupo = await dbRef.getItemById(SERVIDORES_GRUPOS_STORE_NAME, grupoId);
                                if (grupo) {
                                    grupo.isDeleted = true;
                                    grupo.dataModificacao = new Date().toISOString();
                                    await dbRef.updateItem(SERVIDORES_GRUPOS_STORE_NAME, grupo);
                                    if (globalShowFeedbackRef) globalShowFeedbackRef(`Grupo "${grupoNome}" movido para a lixeira.`, "success");
                                    if (refreshApplicationStateRef) await refreshApplicationStateRef();
                                    renderGerirGruposDestinatariosPage();
                                }
                            } catch (error) {
                                if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao mover grupo: ${error.message}`, "error");
                            }
                        }
                    }}
                ];

                if (uiModuleRef && uiModuleRef.showContextMenu) {
                    uiModuleRef.showContextMenu(event.currentTarget, menuItems);
                }
            });
        });

        mainContentWrapperRef.querySelectorAll('.btn-visualizar-grupo-comunicacao-lista').forEach(button => {
            button.addEventListener('click', (event) => {
                const grupoId = event.currentTarget.dataset.id;
                if (navigateToAppViewRef) {
                    navigateToAppViewRef('visualizar-grupo-destinatarios', { grupoId: grupoId, originatingView: 'gerir-grupos-destinatarios' });
                }
            });
        });

        mainContentWrapperRef.querySelectorAll('.btn-editar-grupo-comunicacao-lista').forEach(button => {
            button.addEventListener('click', async (event) => {
                const grupoId = event.currentTarget.dataset.id;
                if (navigateToAppViewRef) {
                     const grupo = await dbRef.getItemById(SERVIDORES_GRUPOS_STORE_NAME, grupoId);
                    navigateToAppViewRef('form-grupo-destinatarios', { grupo: grupo, originatingView: 'gerir-grupos-destinatarios' });
                }
            });
        });

        mainContentWrapperRef.querySelectorAll('.btn-excluir-grupo-comunicacao-lista').forEach(button => {
            button.addEventListener('click', async (event) => {
                const grupoId = event.currentTarget.dataset.id;
                const grupoNome = event.currentTarget.dataset.nome;
                if (confirm(`Tem certeza que deseja mover o grupo "${grupoNome}" para a lixeira? (Os membros não serão excluídos, apenas o grupo).`)) {
                    try {
                        const grupo = await dbRef.getItemById(SERVIDORES_GRUPOS_STORE_NAME, grupoId);
                        if (grupo) {
                            grupo.isDeleted = true;
                            grupo.dataModificacao = new Date().toISOString();
                            await dbRef.updateItem(SERVIDORES_GRUPOS_STORE_NAME, grupo);
                            if (globalShowFeedbackRef) globalShowFeedbackRef(`Grupo "${grupoNome}" movido para a lixeira.`, "success", feedbackDisplayArea);
                            if (refreshApplicationStateRef) await refreshApplicationStateRef();
                            renderGerirGruposDestinatariosPage();
                        }
                    } catch (error) {
                        if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao mover grupo: ${error.message}`, "error", feedbackDisplayArea);
                    }
                }
            });
        });
    }

    return {
        init,
        renderGerirGruposDestinatariosPage
    };
})();