// js/contribuintesListagens.js - Lógica para Listagens de Contribuintes
// v4.9.0 - REFATORADO: Utiliza EntityConfig.filterActiveItems para filtrar a lista principal, corrigindo o bug de versionamento.
// v4.8.0 - Adiciona menu de contexto (botão direito) nas linhas da listagem.
// v4.7.1 - Remove classe page-section para expandir a largura da visualização.
// (Histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.ContribuintesListagens = (function() {
    // ... (variáveis de módulo e init mantidos) ...
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let navigateToAppViewCallback; 
    let refreshApplicationStateRef;
    let dbRef;
    let appModuleRef;
    let contribuintesFormModuleRef;
    let uiModuleRef;

    const CONTRIBUINTES_STORE_NAME = 'contribuintes';
    const DOCUMENTS_STORE_NAME = 'documents';
    const RECURSOS_STORE_NAME = 'recursos';
    const NOTAS_RAPIDAS_STORE_NAME = 'notasRapidasStore';
    const TAREFAS_STORE_NAME = 'tarefasStore';
    const PROTOCOLOS_STORE_NAME = 'protocolosStore';
    const PTAS_STORE_NAME = 'ptasStore';
    const AUTUACOES_STORE_NAME = 'autuacoesStore';

    let CONTRIBUINTE_CATEGORIES_STORE_NAME;
    let CONTRIBUINTE_TAGS_STORE_NAME;

    let currentContribuintesFilters = {
        searchTerm: '',
        category: '',
        tag: '',
        sortField: 'nome',
        sortOrder: 'asc'
    };

    function init(
        mainWrapper,
        showFeedbackFunc,
        clearFeedbackFunc,
        navigateToAppViewFunc, 
        refreshFunc,
        dbModuleRef,
        applicationModuleRef,
        formModule,
        viewModule, 
        uiRef
    ) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedbackFunc;
        globalClearFeedbackRef = clearFeedbackFunc;
        navigateToAppViewCallback = navigateToAppViewFunc; 
        refreshApplicationStateRef = refreshFunc;
        dbRef = dbModuleRef;
        appModuleRef = applicationModuleRef;
        contribuintesFormModuleRef = formModule; 
        uiModuleRef = uiRef;

        if (window.SEFWorkStation && window.SEFWorkStation.DB && window.SEFWorkStation.DB.STORES) {
            CONTRIBUINTE_CATEGORIES_STORE_NAME = window.SEFWorkStation.DB.STORES.CONTRIBUINTE_CATEGORIES;
            CONTRIBUINTE_TAGS_STORE_NAME = window.SEFWorkStation.DB.STORES.CONTRIBUINTE_TAGS;
        } else {
            console.error("ContribuintesListagens.JS: init - Constantes de Stores do DB não encontradas!");
        }

        if (!dbRef) console.error("ContribuintesListagens.JS: init - Referência ao DB não fornecida!");
        if (!mainContentWrapperRef) console.error("ContribuintesListagens.JS: init - mainContentWrapperRef não fornecido.");
        if (!navigateToAppViewCallback) console.warn("ContribuintesListagens.JS: init - navigateToAppViewCallback não fornecido.");
        if (!uiModuleRef) console.warn("ContribuintesListagens.JS: init - Módulo UI não disponível, modais podem não funcionar.");
        console.log("ContribuintesListagens.JS: Módulo inicializado (v4.9.0).");
    }

    async function filterAndSortContribuintes(contribuintes, filters) {
        // CORREÇÃO: A filtragem principal (isDeleted/isArchived) já foi feita.
        let processados = [...contribuintes];

        if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase().trim();
            processados = processados.filter(c =>
                (c.nome && c.nome.toLowerCase().includes(term)) ||
                (c.cpfCnpj && c.cpfCnpj.toLowerCase().includes(term)) ||
                (c.numeroIdentificacao && c.numeroIdentificacao.toLowerCase().includes(term)) ||
                (c.email && c.email.toLowerCase().includes(term)) ||
                (c.telefone && c.telefone.toLowerCase().includes(term)) ||
                (c.endereco && c.endereco.toLowerCase().includes(term)) ||
                (c.customFields && Array.isArray(c.customFields) &&
                 c.customFields.some(cf => cf.value && cf.value.toLowerCase().includes(term)))
            );
        }

        if (filters.category) {
            processados = processados.filter(c => c.categories && Array.isArray(c.categories) && c.categories.includes(filters.category));
        }

        if (filters.tag) {
            processados = processados.filter(c => c.tags && Array.isArray(c.tags) && c.tags.includes(filters.tag));
        }

        processados.sort((a, b) => {
            let valA, valB;
            switch (filters.sortField) {
                case 'nome':
                    valA = a.nome || ''; valB = b.nome || '';
                    return filters.sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                case 'numeroIdentificacao':
                    valA = a.numeroIdentificacao || ''; valB = b.numeroIdentificacao || '';
                    return filters.sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                case 'cpfCnpj':
                    valA = a.cpfCnpj || ''; valB = b.cpfCnpj || '';
                    return filters.sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                case 'modificationDate':
                    valA = new Date(a.modificationDate || a.creationDate || 0);
                    valB = new Date(b.modificationDate || b.creationDate || 0);
                    break;
                default:
                    valA = new Date(a.modificationDate || a.creationDate || 0);
                    valB = new Date(b.modificationDate || b.creationDate || 0);
            }
            return filters.sortOrder === 'asc' ? valA - valB : valB - valA;
        });

        return processados;
    }

    async function renderGerirContribuintesPage() {
        // ... (código inicial da função mantido) ...
        const feedbackAreaId = "feedback-list-contribuintes";
        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (!mainContentWrapperRef) {
            console.error("ContribuintesListagens.JS: renderGerirContribuintesPage - mainContentWrapperRef não definido.");
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico ao tentar renderizar a lista de contribuintes.", "error");
            return;
        }
        mainContentWrapperRef.innerHTML = '<p class="loading-text p-4">A carregar lista de contribuintes...</p>';

        if (window.SEFWorkStation.App && typeof window.SEFWorkStation.App.setCurrentViewTarget === 'function') {
            window.SEFWorkStation.App.setCurrentViewTarget('gerir-contribuintes');
        }

        try {
            let todosContribuintesDoDB = await dbRef.getAllItems(CONTRIBUINTES_STORE_NAME);
            
            // CORREÇÃO: Utiliza a função centralizada para filtrar itens ativos.
            const contribuintesAtivos = window.SEFWorkStation.EntityConfig.filterActiveItems(todosContribuintesDoDB, CONTRIBUINTES_STORE_NAME);
            
            const contribuintesProcessados = await filterAndSortContribuintes(contribuintesAtivos, currentContribuintesFilters);

            // ... (restante da função renderGerirContribuintesPage mantido, pois a lógica de renderização HTML não muda)
            const todasCategorias = await dbRef.getAllItems(CONTRIBUINTE_CATEGORIES_STORE_NAME);
            todasCategorias.sort((a, b) => a.name.localeCompare(b.name));
            const todasTags = await dbRef.getAllItems(CONTRIBUINTE_TAGS_STORE_NAME);
            todasTags.sort((a, b) => a.name.localeCompare(b.name));

            let listHtml = `
                <div>
                    <div id="${feedbackAreaId}" class="mb-4"></div>
                    <div class="gerir-documentos-toolbar mb-2 flex justify-between items-center">
                        <h2 class="text-xl font-semibold">Gerir Contribuintes</h2>
                        <div class="actions-group">
                            <button id="btn-novo-contribuinte-listagem" class="btn-primary ml-2 text-sm py-1.5 px-3">Novo Contribuinte</button>
                        </div>
                    </div>

                    <div class="filtros-avancados-recursos p-4 mb-6 border dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800">
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label for="search-contribuintes-input-avancado" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Buscar por Termo:</label>
                                <input type="search" id="search-contribuintes-input-avancado" class="form-input-text mt-1 block w-full text-sm" placeholder="Nome, CPF/CNPJ, ID..." value="${currentContribuintesFilters.searchTerm}">
                            </div>
                            <div>
                                <label for="filter-contribuinte-categoria" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Categoria:</label>
                                <select id="filter-contribuinte-categoria" class="form-input-text mt-1 block w-full text-sm">
                                    <option value="">Todas</option>
                                    ${todasCategorias.map(c => `<option value="${c.name.replace(/"/g, '"')}" ${currentContribuintesFilters.category === c.name ? 'selected' : ''}>${c.name.split('/').map(s => s.trim()).join(' › ')}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label for="filter-contribuinte-tag" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Tag:</label>
                                <select id="filter-contribuinte-tag" class="form-input-text mt-1 block w-full text-sm">
                                    <option value="">Todas</option>
                                    ${todasTags.map(t => `<option value="${t.name.replace(/"/g, '"')}" ${currentContribuintesFilters.tag === t.name ? 'selected' : ''}>${t.name}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="mt-4 flex justify-end">
                            <button id="btn-limpar-filtros-contrib" class="btn-secondary text-sm py-1.5 px-3 mr-2">Limpar Filtros</button>
                            <button id="btn-aplicar-filtros-contrib" class="btn-primary text-sm py-1.5 px-3">Aplicar Filtros</button>
                        </div>
                    </div>
            `;

            if (contribuintesProcessados.length === 0) {
                listHtml += `<p class="text-center text-gray-500 dark:text-gray-400 py-8">
                    ${Object.values(currentContribuintesFilters).some(v => v && v !== currentContribuintesFilters.sortField && v !== currentContribuintesFilters.sortOrder) ? 'Nenhum contribuinte encontrado com os filtros aplicados.' : 'Nenhum contribuinte cadastrado ainda.'}
                </p>`;
            } else {
                const tableRows = await Promise.all(contribuintesProcessados.map(async contribuinte => {
                    const modificationDate = new Date(contribuinte.modificationDate || contribuinte.creationDate);
                    const formattedDate = modificationDate.toLocaleDateString() + ' ' + modificationDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    let notasCount = 0;
                    if (contribuinte.notasRapidasRelacionadasIds && contribuinte.notasRapidasRelacionadasIds.length > 0) {
                        for (const notaId of contribuinte.notasRapidasRelacionadasIds) {
                            try {
                                const nota = await dbRef.getItemById(NOTAS_RAPIDAS_STORE_NAME, notaId);
                                if (nota && !nota.isExcluida) {
                                    notasCount++;
                                }
                            } catch (e) {
                                console.warn(`Erro ao buscar nota ID ${notaId} para contagem no contribuinte ID ${contribuinte.id}`, e);
                            }
                        }
                    }
                    const notasBadgeHtml = notasCount > 0 ? `<span class="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-200" title="${notasCount} nota(s) rápida(s) vinculada(s)">${notasCount} <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" class="bi bi-sticky-fill ml-1" viewBox="0 0 16 16"><path d="M2.5 1A1.5 1.5 0 0 0 1 2.5v11A1.5 1.5 0 0 0 2.5 15h6.086a1.5 1.5 0 0 0 1.06-.44l4.915-4.914A1.5 1.5 0 0 0 15 8.586V2.5A1.5 1.5 0 0 0 13.5 1h-11zm6 8.5a1 1 0 0 1 1-1h4.396a.25.25 0 0 1 .177.427l-5.146 5.146a.25.25 0 0 1-.427-.177V9.5z"/></svg></span>` : '';

                    return `
                        <tr data-id="${contribuinte.id}" data-nome="${(contribuinte.nome || "Sem Nome").replace(/"/g, '"')}">
                            <td>
                                <a href="#" class="link-visualizar-contribuinte font-medium hover:underline" data-id="${contribuinte.id}">
                                    ${contribuinte.nome || "Sem Nome"}
                                </a>
                                ${notasBadgeHtml}
                            </td>
                            <td>${contribuinte.numeroIdentificacao || 'N/A'}</td>
                            <td>${contribuinte.cpfCnpj || 'N/D'}</td>
                            <td>
                                <div class="tags-categories-cell flex flex-wrap gap-1">
                                    ${(contribuinte.categories || []).map(cat => `<span class="doc-category-tag-list text-xs">${cat.split('/').pop().trim()}</span>`).join('')}
                                    ${(contribuinte.tags || []).map(tag => `<span class="doc-tag-list text-xs">${tag}</span>`).join('')}
                                </div>
                            </td>
                            <td>${formattedDate}</td>
                            <td class="actions-cell text-center">
                                <button class="btn-link btn-visualizar-contribuinte-lista" data-id="${contribuinte.id}" title="Visualizar">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye-fill inline-block" viewBox="0 0 16 16"><path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/><path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/></svg>
                                </button>
                                <button class="btn-link btn-editar-contribuinte-lista" data-id="${contribuinte.id}" title="Editar">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square inline-block" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg>
                                </button>
                                <button class="btn-link btn-excluir-contribuinte-lista" data-id="${contribuinte.id}" data-nome="${(contribuinte.nome || "Sem Nome").replace(/"/g, '"')}" title="Mover para Lixeira">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash-fill inline-block" viewBox="0 0 16 16"><path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1H2.5zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5zM8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5zm3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0z"/></svg>
                                </button>
                            </td>
                        </tr>
                    `;
                }));

                listHtml += `
                    <div class="table-list-container">
                        <table id="tabela-contribuintes" class="documentos-table">
                            <thead>
                                <tr>
                                    <th data-sort-contrib="nome" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700">Nome / Razão Social <span class="sort-arrow"></span></th>
                                    <th data-sort-contrib="numeroIdentificacao" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700">ID Interno <span class="sort-arrow"></span></th>
                                    <th data-sort-contrib="cpfCnpj" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700">CPF / CNPJ <span class="sort-arrow"></span></th>
                                    <th>Categorias/Tags</th>
                                    <th data-sort-contrib="modificationDate" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700">Modificado em <span class="sort-arrow"></span></th>
                                    <th class="w-1/6 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody>${tableRows.join('')}</tbody>
                        </table>
                    </div>
                `;
            }
            listHtml += '</div>';
            mainContentWrapperRef.innerHTML = listHtml;
            updateSortArrowsContribuintes();
            addEventListenersToListagemContribuintes(document.getElementById(feedbackAreaId));
        } catch (error) {
            console.error("ContribuintesListagens.JS: Erro ao renderizar página de gestão de contribuintes:", error);
            mainContentWrapperRef.innerHTML = `<p class="feedback-message error p-4">Erro ao carregar lista de contribuintes: ${error.message}</p>`;
            if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao carregar contribuintes: ${error.message}`, "error");
        }
    }
    
    // ... (restante do arquivo `contribuintesListagens.js` sem modificações)
    // ... (updateSortArrowsContribuintes, parseContribIdFromDataset, addEventListenersToListagemContribuintes)
    function updateSortArrowsContribuintes() {
        const table = document.getElementById('tabela-contribuintes');
        if (!table) return;
        table.querySelectorAll('th[data-sort-contrib]').forEach(th => {
            const arrowSpan = th.querySelector('.sort-arrow');
            if (!arrowSpan) {
                const newArrowSpan = document.createElement('span');
                newArrowSpan.className = 'sort-arrow';
                th.appendChild(newArrowSpan);
            }
            const currentArrowSpan = th.querySelector('.sort-arrow');
            if (th.dataset.sortContrib === currentContribuintesFilters.sortField) {
                currentArrowSpan.textContent = currentContribuintesFilters.sortOrder === 'asc' ? ' ▲' : ' ▼';
            } else {
                currentArrowSpan.textContent = '';
            }
        });
    }

    function parseContribIdFromDataset(datasetId) {
        const numericId = parseInt(datasetId);
        if (!isNaN(numericId) && String(numericId) === datasetId) {
            return numericId;
        }
        return datasetId; 
    }

    function addEventListenersToListagemContribuintes(feedbackDisplayArea) {
        document.getElementById('btn-novo-contribuinte-listagem').addEventListener('click', () => {
            if (navigateToAppViewCallback) {
                 navigateToAppViewCallback('novo-contribuinte');
            } else { 
                if (contribuintesFormModuleRef && contribuintesFormModuleRef.renderNovoContribuinteForm) {
                    contribuintesFormModuleRef.renderNovoContribuinteForm(null, 'gerir-contribuintes');
                } else {
                    if (globalShowFeedbackRef && feedbackDisplayArea) globalShowFeedbackRef("Erro: Módulo de formulário não encontrado.", "error", feedbackDisplayArea);
                }
            }
        });

        const searchInputAvancado = document.getElementById('search-contribuintes-input-avancado');
        const categoriaFilterSelect = document.getElementById('filter-contribuinte-categoria');
        const tagFilterSelect = document.getElementById('filter-contribuinte-tag');
        const btnAplicarFiltros = document.getElementById('btn-aplicar-filtros-contrib');
        const btnLimparFiltros = document.getElementById('btn-limpar-filtros-contrib');

        if (btnAplicarFiltros) {
            btnAplicarFiltros.addEventListener('click', () => {
                currentContribuintesFilters.searchTerm = searchInputAvancado.value;
                currentContribuintesFilters.category = categoriaFilterSelect.value;
                currentContribuintesFilters.tag = tagFilterSelect.value;
                renderGerirContribuintesPage();
            });
        }
        if (searchInputAvancado) {
             searchInputAvancado.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    currentContribuintesFilters.searchTerm = searchInputAvancado.value;
                    renderGerirContribuintesPage();
                }
            });
        }

        if (btnLimparFiltros) {
            btnLimparFiltros.addEventListener('click', () => {
                currentContribuintesFilters.searchTerm = '';
                currentContribuintesFilters.category = '';
                currentContribuintesFilters.tag = '';
                if(searchInputAvancado) searchInputAvancado.value = '';
                if(categoriaFilterSelect) categoriaFilterSelect.value = '';
                if(tagFilterSelect) tagFilterSelect.value = '';
                renderGerirContribuintesPage();
            });
        }

        const tabelaContribuintes = document.getElementById('tabela-contribuintes');
        if (tabelaContribuintes) {
            tabelaContribuintes.querySelectorAll('th[data-sort-contrib]').forEach(th => {
                th.addEventListener('click', () => {
                    const field = th.dataset.sortContrib;
                    if (currentContribuintesFilters.sortField === field) {
                        currentContribuintesFilters.sortOrder = currentContribuintesFilters.sortOrder === 'asc' ? 'desc' : 'asc';
                    } else {
                        currentContribuintesFilters.sortField = field;
                        currentContribuintesFilters.sortOrder = 'asc';
                    }
                    renderGerirContribuintesPage();
                });
            });

            // NOVO: Adiciona listener de contexto às linhas da tabela
            tabelaContribuintes.querySelectorAll('tbody tr').forEach(row => {
                row.addEventListener('contextmenu', (event) => {
                    event.preventDefault();
                    const contribuinteId = parseContribIdFromDataset(row.dataset.id);
                    const contribuinteNome = row.dataset.nome;

                    const menuItems = [
                        { label: 'Visualizar', action: () => navigateToAppViewCallback('visualizar-contribuinte', { contribuinteId: contribuinteId, originatingView: 'gerir-contribuintes' }) },
                        { label: 'Editar', action: async () => {
                            const contribuinte = await dbRef.getItemById(CONTRIBUINTES_STORE_NAME, contribuinteId);
                            if (contribuinte) contribuintesFormModuleRef.renderNovoContribuinteForm(contribuinte, 'gerir-contribuintes');
                        }},
                        { isSeparator: true },
                        { label: 'Mover para Lixeira', action: async () => {
                            if (await uiModuleRef.showConfirmationModal('Mover para Lixeira', `Tem certeza que deseja mover o contribuinte "${contribuinteNome}" para a lixeira?`)) {
                                try {
                                    const contribuinte = await dbRef.getItemById(CONTRIBUINTES_STORE_NAME, contribuinteId);
                                    if (contribuinte) {
                                        contribuinte.isDeleted = true; 
                                        contribuinte.modificationDate = new Date().toISOString();
                                        await dbRef.updateItem(CONTRIBUINTES_STORE_NAME, contribuinte);
                                        if (globalShowFeedbackRef) globalShowFeedbackRef(`Contribuinte "${contribuinteNome}" movido para a lixeira.`, "success");
                                        if (refreshApplicationStateRef) await refreshApplicationStateRef();
                                        renderGerirContribuintesPage(); 
                                    }
                                } catch (error) {
                                    console.error("ContribuintesListagens.JS: Erro ao mover contribuinte para a lixeira:", error);
                                    if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao mover contribuinte: ${error.message}`, "error");
                                }
                            }
                        }}
                    ];

                    if (uiModuleRef && uiModuleRef.showContextMenu) {
                        uiModuleRef.showContextMenu(event.currentTarget, menuItems);
                    }
                });
            });
        }

        mainContentWrapperRef.querySelectorAll('.link-visualizar-contribuinte, .btn-visualizar-contribuinte-lista').forEach(button => {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                const contribuinteId = parseContribIdFromDataset(event.currentTarget.dataset.id);
                if (navigateToAppViewCallback) { 
                    navigateToAppViewCallback('visualizar-contribuinte', { contribuinteId: contribuinteId, originatingView: 'gerir-contribuintes' });
                } else {
                     if (globalShowFeedbackRef && feedbackDisplayArea) globalShowFeedbackRef("Erro: Função de navegação para visualização não configurada.", "error", feedbackDisplayArea);
                }
            });
        });

        mainContentWrapperRef.querySelectorAll('.btn-editar-contribuinte-lista').forEach(button => {
            button.addEventListener('click', async (event) => {
                const contribuinteId = parseContribIdFromDataset(event.currentTarget.dataset.id);
                try {
                    const contribuinte = await dbRef.getItemById(CONTRIBUINTES_STORE_NAME, contribuinteId);
                    if (contribuinte && contribuintesFormModuleRef && typeof contribuintesFormModuleRef.renderNovoContribuinteForm === 'function') {
                        contribuintesFormModuleRef.renderNovoContribuinteForm(contribuinte, 'gerir-contribuintes');
                    } else {
                        if (globalShowFeedbackRef && feedbackDisplayArea) globalShowFeedbackRef("Contribuinte não encontrado para edição ou módulo de formulário indisponível.", "error", feedbackDisplayArea);
                    }
                } catch (error) {
                    console.error("ContribuintesListagens.JS: Erro ao buscar contribuinte para edição:", error);
                    if (globalShowFeedbackRef && feedbackDisplayArea) globalShowFeedbackRef("Erro ao carregar dados para edição.", "error", feedbackDisplayArea);
                }
            });
        });

        mainContentWrapperRef.querySelectorAll('.btn-excluir-contribuinte-lista').forEach(button => {
            button.addEventListener('click', async (event) => {
                const contribuinteId = parseContribIdFromDataset(event.currentTarget.dataset.id);
                const contribuinteNome = event.currentTarget.dataset.nome;
                if (confirm(`Tem certeza que deseja mover o contribuinte "${contribuinteNome}" para a lixeira?`)) {
                    try {
                        const contribuinte = await dbRef.getItemById(CONTRIBUINTES_STORE_NAME, contribuinteId);
                        if (contribuinte) {
                            contribuinte.isDeleted = true; 
                            contribuinte.modificationDate = new Date().toISOString();
                            await dbRef.updateItem(CONTRIBUINTES_STORE_NAME, contribuinte);
                            if (globalShowFeedbackRef) globalShowFeedbackRef(`Contribuinte "${contribuinteNome}" movido para a lixeira.`, "success", feedbackDisplayArea);
                            if (refreshApplicationStateRef) await refreshApplicationStateRef();
                            renderGerirContribuintesPage(); 
                        } else {
                             if (globalShowFeedbackRef) globalShowFeedbackRef(`Contribuinte "${contribuinteNome}" não encontrado.`, "error", feedbackDisplayArea);
                        }
                    } catch (error) {
                        console.error("ContribuintesListagens.JS: Erro ao mover contribuinte para a lixeira:", error);
                        if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao mover contribuinte para a lixeira: ${error.message}`, "error", feedbackDisplayArea);
                    }
                }
            });
        });
    }

    return {
        init,
        renderGerirContribuintesPage
    };
})();