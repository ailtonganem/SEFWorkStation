// js/autuacoesListagens.js - Lógica para Listagens de Autuações
// v0.8.0 - REFATORADO: Utiliza EntityConfig.filterActiveItems para filtrar a lista principal, corrigindo o bug de versionamento.
// v0.7.0 - Adiciona menu de contexto (botão direito) nas linhas da listagem.
// v0.5.1 - Remove classe page-section para expandir a largura da visualização.
// ... (histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.AutuacaoListagens = (function() {
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let dbRef;
    let appModuleRef;
    let autuacoesViewModuleRef;
    let autuacoesFormModuleRef;
    let refreshApplicationStateRef;
    let uiModuleRef;

    const AUTUACOES_STORE_NAME = 'autuacoesStore';
    const AUTUACAO_TYPES_STORE_NAME = 'autuacaoTypesStore';
    const DOCUMENTS_STORE_NAME = 'documents';
    const CONTRIBUINTES_STORE_NAME = 'contribuintes';
    const TAREFAS_STORE_NAME = 'tarefasStore';
    const NOTAS_RAPIDAS_STORE_NAME = 'notasRapidasStore';
    const PTAS_STORE_NAME = 'ptasStore';
    const PROTOCOLOS_STORE_NAME = 'protocolosStore';


    const STATUS_AUTUACAO_OPTIONS_LIST = ["Em Elaboração", "Lavrada", "Ciente", "Impugnada", "Em Cobrança", "Suspensa", "Extinta", "Anulada", "Encerrada", "Outro"];
    const DEFAULT_AUTUACAO_TYPES_FOR_FILTER = [
        "Omissão de Receita", "Crédito Indevido", "Falta de Emissão de Documento Fiscal", "Obrigações Acessórias", "OUTROS"
    ];

    let currentAutuacaoFilters = {
        searchTerm: '',
        tipoAutuacao: '',
        statusAutuacao: '',
        sortField: 'dataAutuacao',
        sortOrder: 'desc'
    };

    function init(
        mainWrapper,
        showFeedbackFunc,
        clearFeedbackFunc,
        dbModuleRef,
        applicationModuleRef,
        viewModule,
        formModule,
        refreshFunc,
        uiRefModule
    ) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedbackFunc;
        globalClearFeedbackRef = clearFeedbackFunc;
        dbRef = dbModuleRef;
        appModuleRef = applicationModuleRef;
        autuacoesViewModuleRef = viewModule;
        autuacoesFormModuleRef = formModule;
        refreshApplicationStateRef = refreshFunc;
        uiModuleRef = uiRefModule;

        if (!dbRef) console.error("AutuacaoListagens.JS: init - Referência ao DB não fornecida!");
        if (!refreshApplicationStateRef) console.warn("AutuacaoListagens.JS: init - refreshApplicationStateRef não fornecido.");
        console.log("AutuacaoListagens.JS: Módulo inicializado (v0.8.0).");
    }

    async function filterAndSortAutuacoes(autuacoes, filters) {
        // CORREÇÃO: A filtragem inicial de isDeleted/isArchivedVersion já foi feita.
        // O array 'autuacoes' recebido já contém apenas itens ativos.
        let processados = [...autuacoes];

        if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase().trim();
            processados = processados.filter(a =>
                (a.numeroAutuacao && a.numeroAutuacao.toLowerCase().includes(term)) ||
                (a.assuntoAutuacao && a.assuntoAutuacao.toLowerCase().includes(term)) ||
                (a.servidorResponsavelAutuacao && a.servidorResponsavelAutuacao.toLowerCase().includes(term)) ||
                (a.tipoAutuacao && a.tipoAutuacao.toLowerCase().includes(term)) ||
                (a.descricaoDetalhadaAutuacao && a.descricaoDetalhadaAutuacao.toLowerCase().includes(term))
            );
        }
        if (filters.tipoAutuacao) {
            processados = processados.filter(a => a.tipoAutuacao === filters.tipoAutuacao);
        }
        if (filters.statusAutuacao) {
            processados = processados.filter(a => a.statusAutuacao === filters.statusAutuacao);
        }

        processados.sort((a, b) => {
            let valA, valB;
            switch (filters.sortField) {
                case 'numeroAutuacao':
                    valA = a.numeroAutuacao || ''; valB = b.numeroAutuacao || '';
                    break;
                case 'assuntoAutuacao':
                    valA = a.assuntoAutuacao || ''; valB = b.assuntoAutuacao || '';
                    break;
                case 'statusAutuacao':
                    valA = a.statusAutuacao || ''; valB = b.statusAutuacao || '';
                    break;
                case 'tipoAutuacao':
                    valA = a.tipoAutuacao || ''; valB = b.tipoAutuacao || '';
                    break;
                case 'dataAutuacao':
                default:
                    valA = new Date(a.dataAutuacao || 0);
                    valB = new Date(b.dataAutuacao || 0);
                    return filters.sortOrder === 'desc' ? valB - valA : valA - valB;
            }
            return filters.sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        });
        return processados;
    }

    async function renderGerirAutuacoesPage() {
        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (!mainContentWrapperRef) {
            console.error("AutuacaoListagens.JS: renderGerirAutuacoesPage - mainContentWrapperRef não definido.");
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico ao renderizar lista de Autuações.", "error");
            return;
        }
        mainContentWrapperRef.innerHTML = '<p class="loading-text p-4">A carregar lista de Autuações...</p>';
        const feedbackAreaId = "feedback-gerir-autuacoes";

        try {
            const todasAutuacoesDoDB = await dbRef.getAllItems(AUTUACOES_STORE_NAME);
            // CORREÇÃO: Utiliza a função centralizada para filtrar itens ativos.
            const autuacoesAtivas = window.SEFWorkStation.EntityConfig.filterActiveItems(todasAutuacoesDoDB, AUTUACOES_STORE_NAME);
            const autuacoesProcessadas = await filterAndSortAutuacoes(autuacoesAtivas, currentAutuacaoFilters);

            // ... (restante da função mantido, pois a lógica de renderização HTML não muda) ...
            let tiposDeAutuacaoParaFiltro = [...DEFAULT_AUTUACAO_TYPES_FOR_FILTER];
            try {
                const tiposCadastrados = await dbRef.getAllItems(AUTUACAO_TYPES_STORE_NAME);
                tiposCadastrados.forEach(tipoDb => {
                    if (!tiposDeAutuacaoParaFiltro.includes(tipoDb.name)) {
                        tiposDeAutuacaoParaFiltro.push(tipoDb.name);
                    }
                });
                tiposDeAutuacaoParaFiltro.sort((a,b) => a.localeCompare(b));
            } catch (e) { console.warn("Erro ao buscar tipos de Autuação para filtro:", e); }

            const tiposAutuacaoOptionsHtml = tiposDeAutuacaoParaFiltro.map(tipo =>
                `<option value="${tipo.replace(/"/g, '"')}" ${currentAutuacaoFilters.tipoAutuacao === tipo ? 'selected' : ''}>${tipo}</option>`
            ).join('');

            let listHtml = `
                <div> 
                    <div id="${feedbackAreaId}" class="mb-4"></div>
                    <div class="gerir-documentos-toolbar mb-2 flex justify-between items-center">
                        <h2 class="text-xl font-semibold">Gerir Autuações</h2>
                        <div class="actions-group">
                            <button id="btn-nova-autuacao-listagem" class="btn-primary ml-2 text-sm py-1.5 px-3">Nova Autuação</button>
                        </div>
                    </div>

                    <div class="filtros-avancados-recursos p-4 mb-6 border dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800">
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                            <div>
                                <label for="search-autuacoes-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Buscar por Termo:</label>
                                <input type="search" id="search-autuacoes-input" class="form-input-text mt-1 block w-full text-sm" placeholder="Número, Assunto, Responsável..." value="${currentAutuacaoFilters.searchTerm}">
                            </div>
                            <div>
                                <label for="filter-autuacao-tipo" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de Autuação:</label>
                                <select id="filter-autuacao-tipo" class="form-input-text mt-1 block w-full text-sm">
                                    <option value="">Todos</option>
                                    ${tiposAutuacaoOptionsHtml}
                                </select>
                            </div>
                            <div>
                                <label for="filter-autuacao-status" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Status:</label>
                                <select id="filter-autuacao-status" class="form-input-text mt-1 block w-full text-sm">
                                    <option value="">Todos</option>
                                    ${STATUS_AUTUACAO_OPTIONS_LIST.map(s => `<option value="${s}" ${currentAutuacaoFilters.statusAutuacao === s ? 'selected' : ''}>${s}</option>`).join('')}
                                </select>
                            </div>
                             <div class="flex items-end">
                                <button id="btn-aplicar-filtros-autuacoes" class="btn-primary btn-sm text-sm py-1.5 px-3 w-full">Aplicar Filtros</button>
                            </div>
                        </div>
                    </div>
            `;

            if (autuacoesProcessadas.length === 0) {
                listHtml += `<p class="text-center text-gray-500 dark:text-gray-400 py-8">
                    ${Object.values(currentAutuacaoFilters).some(v => v && v !== currentAutuacaoFilters.sortField && v !== currentAutuacaoFilters.sortOrder) ?
                    'Nenhuma autuação encontrada com os filtros aplicados.' :
                    'Nenhuma autuação cadastrada ainda.'}
                </p>`;
            } else {
                const tableRows = autuacoesProcessadas.map(autuacao => {
                    const dataFormatada = new Date(autuacao.dataAutuacao).toLocaleDateString();
                    return `
                        <tr data-id="${autuacao.id}" data-numero="${autuacao.numeroAutuacao || ''}">
                            <td>${autuacao.numeroAutuacao || 'N/A'}</td>
                            <td>
                                <a href="#" class="link-visualizar-autuacao font-medium hover:underline" data-id="${autuacao.id}">
                                    ${autuacao.assuntoAutuacao || "Sem Assunto"}
                                </a>
                            </td>
                            <td>${dataFormatada}</td>
                            <td>${autuacao.tipoAutuacao || 'N/D'}</td>
                            <td class="status-column-cell">
                                <select class="quick-status-change-autuacao form-input-text text-xs p-1 rounded-md border-gray-300 dark:bg-slate-600 dark:border-slate-500 dark:text-gray-200 focus:border-blue-500 focus:ring-blue-500" data-id="${autuacao.id}">
                                    ${STATUS_AUTUACAO_OPTIONS_LIST.map(s => `<option value="${s}" ${autuacao.statusAutuacao === s ? 'selected' : ''}>${s}</option>`).join('')}
                                </select>
                            </td>
                            <td>${autuacao.servidorResponsavelAutuacao || 'N/D'}</td>
                            <td class="actions-cell text-center">
                                <button class="btn-link btn-visualizar-autuacao-lista" data-id="${autuacao.id}" title="Visualizar">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye-fill inline-block" viewBox="0 0 16 16"><path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/><path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/></svg>
                                </button>
                                <button class="btn-link btn-editar-autuacao-lista" data-id="${autuacao.id}" title="Editar">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square inline-block" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg>
                                </button>
                                <button class="btn-link btn-excluir-autuacao-lista" data-id="${autuacao.id}" data-numero="${autuacao.numeroAutuacao || 'ID ' + autuacao.id}" title="Mover para Lixeira">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash-fill inline-block" viewBox="0 0 16 16"><path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1H2.5zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5zM8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5zm3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0z"/></svg>
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('');

                listHtml += `
                    <div class="table-list-container">
                        <table id="tabela-autuacoes" class="documentos-table">
                            <thead>
                                <tr>
                                    <th data-sort-autuacoes="numeroAutuacao" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700">Número Autuação <span class="sort-arrow"></span></th>
                                    <th data-sort-autuacoes="assuntoAutuacao" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700">Assunto <span class="sort-arrow"></span></th>
                                    <th data-sort-autuacoes="dataAutuacao" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700">Data <span class="sort-arrow"></span></th>
                                    <th data-sort-autuacoes="tipoAutuacao" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700">Tipo <span class="sort-arrow"></span></th>
                                    <th data-sort-autuacoes="statusAutuacao" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700 status-column">Status <span class="sort-arrow"></span></th>
                                    <th>Responsável</th>
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
            updateSortArrowsAutuacoes();
            addEventListenersToListagemAutuacoes(document.getElementById(feedbackAreaId));
        } catch (error) {
            console.error("AutuacaoListagens.JS: Erro ao renderizar página de gestão de Autuações:", error);
            mainContentWrapperRef.innerHTML = `<p class="feedback-message error p-4">Erro ao carregar lista de Autuações: ${error.message}</p>`;
        }
    }
    
    // ... (restante do arquivo `autuacoesListagens.js` sem modificações)
    // ... (updateSortArrowsAutuacoes, desvincularAutuacaoDeEntidades, addEventListenersToListagemAutuacoes)
    function updateSortArrowsAutuacoes() {
        document.querySelectorAll('#tabela-autuacoes th[data-sort-autuacoes]').forEach(th => {
            const arrowSpan = th.querySelector('.sort-arrow');
             if (!arrowSpan) {
                const newSpan = document.createElement('span');
                newSpan.className = 'sort-arrow';
                th.appendChild(newSpan);
            }
            const currentArrowSpan = th.querySelector('.sort-arrow');
            if (th.dataset.sortAutuacoes === currentAutuacaoFilters.sortField) {
                currentArrowSpan.textContent = currentAutuacaoFilters.sortOrder === 'asc' ? ' ▲' : ' ▼';
            } else {
                currentArrowSpan.textContent = '';
            }
        });
    }

    async function desvincularAutuacaoDeEntidades(autuacaoId, autuacaoOriginal) {
        if (!dbRef || !autuacaoId || !autuacaoOriginal) return;
        console.warn("AutuacaoListagens.JS: desvincularAutuacaoDeEntidades foi chamada. Esta função pode ser redundante se a desvinculação já é tratada por SharedUtils.desvincularEntidadeDeTodasAsOutras em outro local (ex: view ou lixeira).");

        const entidadesParaDesvincular = [
            { store: DOCUMENTS_STORE_NAME, campo: 'autuacoesVinculadasIds', ids: autuacaoOriginal.documentosVinculadosIds || [] },
            { store: CONTRIBUINTES_STORE_NAME, campo: 'autuacoesRelacionadasIds', ids: autuacaoOriginal.contribuintesVinculadosIds || [] },
            { store: TAREFAS_STORE_NAME, campo: 'autuacoesVinculadasIds', ids: autuacaoOriginal.tarefasVinculadasIds || [] },
            { store: NOTAS_RAPIDAS_STORE_NAME, campo: 'autuacoesRelacionadasIds', ids: autuacaoOriginal.notasRapidasRelacionadasIds || [] }, // Corrigido
            { store: PTAS_STORE_NAME, campo: 'autuacoesGeradasIds', ids: autuacaoOriginal.ptasOriginariosIds || [] }, // Autuação originou de PTAs
            { store: PROTOCOLOS_STORE_NAME, campo: 'autuacoesGeradasIds', ids: autuacaoOriginal.protocolosOriginariosIds || [] } // Autuação originou de Protocolos
        ];

        for (const entidade of entidadesParaDesvincular) {
            if (entidade.ids.length > 0) {
                 await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(autuacaoId, entidade.store, entidade.campo, [], entidade.ids, dbRef);
            }
        }
    }

    function addEventListenersToListagemAutuacoes(feedbackDisplayArea) {
        // ... (event listeners para botões de filtro e cabeçalhos de tabela mantidos)
        const btnNovaAutuacao = document.getElementById('btn-nova-autuacao-listagem');
        if (btnNovaAutuacao) {
            btnNovaAutuacao.addEventListener('click', () => {
                if (appModuleRef && appModuleRef.handleMenuAction) {
                    appModuleRef.handleMenuAction('cadastrar-autuacao');
                }
            });
        }
        
        // ... (resto dos listeners mantidos como antes) ...
        const searchInput = document.getElementById('search-autuacoes-input');
        const tipoFilter = document.getElementById('filter-autuacao-tipo');
        const statusFilter = document.getElementById('filter-autuacao-status');
        const btnAplicarFiltros = document.getElementById('btn-aplicar-filtros-autuacoes');

        const applyFilters = () => {
            currentAutuacaoFilters.searchTerm = searchInput ? searchInput.value : '';
            currentAutuacaoFilters.tipoAutuacao = tipoFilter ? tipoFilter.value : '';
            currentAutuacaoFilters.statusAutuacao = statusFilter ? statusFilter.value : '';
            renderGerirAutuacoesPage();
        };

        if (btnAplicarFiltros) btnAplicarFiltros.addEventListener('click', applyFilters);
        if (searchInput) searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') applyFilters(); });

        document.querySelectorAll('#tabela-autuacoes th[data-sort-autuacoes]').forEach(th => {
            th.addEventListener('click', () => {
                const field = th.dataset.sortAutuacoes;
                if (currentAutuacaoFilters.sortField === field) {
                    currentAutuacaoFilters.sortOrder = currentAutuacaoFilters.sortOrder === 'asc' ? 'desc' : 'asc';
                } else {
                    currentAutuacaoFilters.sortField = field;
                    currentAutuacaoFilters.sortOrder = 'asc';
                }
                renderGerirAutuacoesPage();
            });
        });

        // Adiciona listener de contexto às linhas da tabela
        mainContentWrapperRef.querySelectorAll('#tabela-autuacoes tbody tr').forEach(row => {
            row.addEventListener('contextmenu', (event) => {
                event.preventDefault();
                const autuacaoId = row.dataset.id;
                const autuacaoNumero = row.dataset.numero;

                const menuItems = [
                    { label: 'Visualizar', action: () => autuacoesViewModuleRef.renderVisualizarAutuacaoPage(autuacaoId, 'gerir-autuacoes') },
                    { label: 'Editar', action: async () => {
                        const autuacao = await dbRef.getItemById(AUTUACOES_STORE_NAME, autuacaoId);
                        if (autuacao) autuacoesFormModuleRef.renderFormularioAutuacao(autuacao, 'gerir-autuacoes');
                    }},
                    { isSeparator: true },
                    { label: 'Mover para Lixeira', action: async () => {
                        if (await uiModuleRef.showConfirmationModal('Mover para Lixeira', `Tem certeza que deseja mover a Autuação "${autuacaoNumero}" para a lixeira?`)) {
                            try {
                                const autuacao = await dbRef.getItemById(AUTUACOES_STORE_NAME, autuacaoId);
                                if (autuacao) {
                                    autuacao.isDeleted = true;
                                    autuacao.dataModificacao = new Date().toISOString();
                                    await dbRef.updateItem(AUTUACOES_STORE_NAME, autuacao);
                                    if (globalShowFeedbackRef) globalShowFeedbackRef(`Autuação "${autuacaoNumero}" movida para a lixeira.`, "success");
                                    if (refreshApplicationStateRef) await refreshApplicationStateRef();
                                    renderGerirAutuacoesPage();
                                }
                            } catch (error) {
                                console.error("Erro ao mover Autuação para a lixeira:", error);
                                if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao mover Autuação: ${error.message}`, "error");
                            }
                        }
                    }}
                ];

                if (uiModuleRef && uiModuleRef.showContextMenu) {
                    uiModuleRef.showContextMenu(event.currentTarget, menuItems);
                }
            });
        });

        mainContentWrapperRef.querySelectorAll('.btn-visualizar-autuacao-lista').forEach(button => {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                const autuacaoId = event.currentTarget.dataset.id;
                if (autuacoesViewModuleRef && typeof autuacoesViewModuleRef.renderVisualizarAutuacaoPage === 'function') {
                    autuacoesViewModuleRef.renderVisualizarAutuacaoPage(autuacaoId, 'gerir-autuacoes');
                }
            });
        });

        mainContentWrapperRef.querySelectorAll('.btn-editar-autuacao-lista').forEach(button => {
            button.addEventListener('click', async (event) => {
                const autuacaoId = event.currentTarget.dataset.id;
                try {
                    const autuacao = await dbRef.getItemById(AUTUACOES_STORE_NAME, autuacaoId);
                    if (autuacao && autuacoesFormModuleRef && typeof autuacoesFormModuleRef.renderFormularioAutuacao === 'function') {
                        autuacoesFormModuleRef.renderFormularioAutuacao(autuacao, 'gerir-autuacoes');
                    }
                } catch (error) { console.error("Erro ao buscar Autuação para edição:", error); }
            });
        });

        mainContentWrapperRef.querySelectorAll('.btn-excluir-autuacao-lista').forEach(button => {
            button.addEventListener('click', async (event) => {
                const autuacaoId = event.currentTarget.dataset.id;
                const autuacaoNumero = event.currentTarget.dataset.numero;
                if (confirm(`Tem certeza que deseja mover a Autuação "${autuacaoNumero}" para a lixeira?`)) {
                    try {
                        const autuacao = await dbRef.getItemById(AUTUACOES_STORE_NAME, autuacaoId);
                        if (autuacao) {
                            autuacao.isDeleted = true; 
                            autuacao.dataModificacao = new Date().toISOString();
                            await dbRef.updateItem(AUTUACOES_STORE_NAME, autuacao);
                            
                            if (globalShowFeedbackRef) globalShowFeedbackRef(`Autuação "${autuacaoNumero}" movida para a lixeira.`, "success", feedbackDisplayArea);

                            if (typeof refreshApplicationStateRef === 'function') {
                                await refreshApplicationStateRef();
                            }
                            renderGerirAutuacoesPage(); 
                        } else {
                             if (globalShowFeedbackRef) globalShowFeedbackRef(`Autuação "${autuacaoNumero}" não encontrada.`, "error", feedbackDisplayArea);
                        }
                    } catch (error) {
                        console.error("Erro ao mover Autuação para a lixeira:", error);
                        if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao mover Autuação para a lixeira: ${error.message}`, "error", feedbackDisplayArea);
                    }
                }
            });
        });

        mainContentWrapperRef.querySelectorAll('.quick-status-change-autuacao').forEach(select => {
            select.addEventListener('change', async (event) => {
                const autuacaoId = event.target.dataset.id;
                const novoStatus = event.target.value;
                try {
                    const autuacao = await dbRef.getItemById(AUTUACOES_STORE_NAME, autuacaoId);
                    if (autuacao) {
                        const statusAntigo = autuacao.statusAutuacao;
                        autuacao.statusAutuacao = novoStatus;
                        autuacao.dataModificacao = new Date().toISOString();

                        if (['Extinta', 'Anulada', 'Encerrada', 'Arquivada', 'Cancelada'].includes(novoStatus) && !autuacao.dataConclusaoAutuacao) { 
                             autuacao.dataConclusaoAutuacao = new Date().toISOString();
                        } else if (!['Extinta', 'Anulada', 'Encerrada', 'Arquivada', 'Cancelada'].includes(novoStatus) && autuacao.dataConclusaoAutuacao) {
                            autuacao.dataConclusaoAutuacao = null;
                        }

                        autuacao.historicoAndamentoAutuacao = autuacao.historicoAndamentoAutuacao || [];
                        autuacao.historicoAndamentoAutuacao.push({
                            data: new Date().toISOString(),
                            descricao: `Status alterado de "${statusAntigo}" para "${novoStatus}".`,
                            responsavel: "Sistema (Alteração Rápida na Lista)",
                            tipoAndamento: "Mudança de Status"
                        });

                        await dbRef.updateItem(AUTUACOES_STORE_NAME, autuacao);
                        if (globalShowFeedbackRef) globalShowFeedbackRef(`Status da Autuação "${autuacao.numeroAutuacao}" alterado para "${novoStatus}".`, "success", feedbackDisplayArea);

                        if (typeof refreshApplicationStateRef === 'function') {
                            await refreshApplicationStateRef();
                        }
                        renderGerirAutuacoesPage();
                    }
                } catch (error) {
                    console.error("Erro ao alterar status rápido da Autuação:", error);
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Erro ao alterar status da Autuação.", "error", feedbackDisplayArea);
                    const autuacaoOriginal = await dbRef.getItemById(AUTUACOES_STORE_NAME, autuacaoId);
                    if (autuacaoOriginal) event.target.value = autuacaoOriginal.statusAutuacao;
                }
            });
        });
    }

    return {
        init,
        renderGerirAutuacoesPage,
        desvincularAutuacaoDeEntidades 
    };
})();