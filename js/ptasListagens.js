// js/ptasListagens.js - Lógica para Listagens de PTAs
// v0.7.0 - REFATORADO: Utiliza EntityConfig.filterActiveItems para filtrar a lista principal, corrigindo o bug de versionamento.
// v0.6.1 - Remove classe page-section para expandir a largura da visualização.
// v0.6 - Restaura select para status e ajusta visibilidade via CSS.
// ... (histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.PTAListagens = (function() {
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let dbRef;
    let appModuleRef;
    let ptasViewModuleRef;
    let ptasFormModuleRef;
    let refreshApplicationStateRef;
    let uiModuleRef;

    const PTAS_STORE_NAME = 'ptasStore';
    const PTA_TYPES_STORE_NAME = 'ptaTypesStore';
    const CONTRIBUINTES_STORE_NAME = 'contribuintes';
    const DOCUMENTS_STORE_NAME = 'documents';
    const TAREFAS_STORE_NAME = 'tarefasStore';
    const NOTAS_RAPIDAS_STORE_NAME = 'notasRapidasStore';
    const PROTOCOLOS_STORE_NAME = 'protocolosStore';
    const AUTUACOES_STORE_NAME = 'autuacoesStore';


    const STATUS_PTA_OPTIONS_LIST = ["Em Elaboração", "Submetido", "Em Análise", "Deferido", "Indeferido", "Arquivado", "Recurso Pendente", "Cancelado", "Convertido em Autuação", "Outro"];
    const DEFAULT_PTA_TYPES_FOR_FILTER = [
        "Contencioso Fiscal", "Consulta Tributária", "Regime Especial", "Restituição Indébito", "Compensação", "OUTROS"
    ];

    let currentPTAFilters = {
        searchTerm: '',
        tipoPTA: '',
        statusPTA: '',
        sortField: 'dataPTA',
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
        ptasViewModuleRef = viewModule;
        ptasFormModuleRef = formModule;
        refreshApplicationStateRef = refreshFunc;
        uiModuleRef = uiRefModule;

        if (!dbRef) console.error("PTAListagens.JS: init - Referência ao DB não fornecida!");
        if (!refreshApplicationStateRef) console.warn("PTAListagens.JS: init - refreshApplicationStateRef não fornecido.");
        console.log("PTAListagens.JS: Módulo inicializado (v0.7.0).");
    }

    async function filterAndSortPTAs(ptas, filters) {
        // CORREÇÃO: A filtragem principal (isDeleted/isArchived) já foi feita.
        let processados = [...ptas];

        if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase().trim();
            processados = processados.filter(p =>
                (p.numeroPTA && p.numeroPTA.toLowerCase().includes(term)) ||
                (p.assuntoPTA && p.assuntoPTA.toLowerCase().includes(term)) ||
                (p.servidorResponsavelPTA && p.servidorResponsavelPTA.toLowerCase().includes(term)) ||
                (p.tipoPTA && p.tipoPTA.toLowerCase().includes(term)) ||
                (p.descricaoDetalhadaPTA && p.descricaoDetalhadaPTA.toLowerCase().includes(term))
            );
        }
        if (filters.tipoPTA) {
            processados = processados.filter(p => p.tipoPTA === filters.tipoPTA);
        }
        if (filters.statusPTA) {
            processados = processados.filter(p => p.statusPTA === filters.statusPTA);
        }

        processados.sort((a, b) => {
            let valA, valB;
            switch (filters.sortField) {
                case 'numeroPTA':
                    valA = a.numeroPTA || ''; valB = b.numeroPTA || '';
                    break;
                case 'assuntoPTA':
                    valA = a.assuntoPTA || ''; valB = b.assuntoPTA || '';
                    break;
                case 'statusPTA':
                    valA = a.statusPTA || ''; valB = b.statusPTA || '';
                    break;
                case 'tipoPTA':
                    valA = a.tipoPTA || ''; valB = b.tipoPTA || '';
                    break;
                case 'dataPTA':
                default:
                    valA = new Date(a.dataPTA || 0);
                    valB = new Date(b.dataPTA || 0);
                    return filters.sortOrder === 'desc' ? valB - valA : valA - valB;
            }
            return filters.sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        });
        return processados;
    }

    async function renderGerirPTAsPage() {
        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (!mainContentWrapperRef) {
            console.error("PTAListagens.JS: renderGerirPTAsPage - mainContentWrapperRef não definido.");
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico ao renderizar lista de PTAs.", "error");
            return;
        }
        mainContentWrapperRef.innerHTML = '<p class="loading-text p-4">A carregar lista de PTAs...</p>';
        const feedbackAreaId = "feedback-gerir-ptas";

        try {
            const todosPTAsDoDB = await dbRef.getAllItems(PTAS_STORE_NAME);
            
            // CORREÇÃO: Utiliza a função centralizada para filtrar itens ativos.
            const ptasAtivos = window.SEFWorkStation.EntityConfig.filterActiveItems(todosPTAsDoDB, PTAS_STORE_NAME);
            
            const ptasProcessados = await filterAndSortPTAs(ptasAtivos, currentPTAFilters);

            let tiposDePTAParaFiltro = [...DEFAULT_PTA_TYPES_FOR_FILTER];
            try {
                const tiposCadastrados = await dbRef.getAllItems(PTA_TYPES_STORE_NAME);
                tiposCadastrados.forEach(tipoDb => {
                    if (!tiposDePTAParaFiltro.includes(tipoDb.name)) {
                        tiposDePTAParaFiltro.push(tipoDb.name);
                    }
                });
                tiposDePTAParaFiltro.sort((a,b) => a.localeCompare(b));
            } catch (e) { console.warn("Erro ao buscar tipos de PTA para filtro:", e); }

            const tiposPTAOptionsHtml = tiposDePTAParaFiltro.map(tipo =>
                `<option value="${tipo.replace(/"/g, '"')}" ${currentPTAFilters.tipoPTA === tipo ? 'selected' : ''}>${tipo}</option>`
            ).join('');

            let listHtml = `
                <div> 
                    <div id="${feedbackAreaId}" class="mb-4"></div>
                    <div class="gerir-documentos-toolbar mb-2 flex justify-between items-center">
                        <h2 class="text-xl font-semibold">Gerir PTAs (Processos Tributários Administrativos)</h2>
                        <div class="actions-group">
                            <button id="btn-novo-pta-listagem" class="btn-primary ml-2 text-sm py-1.5 px-3">Novo PTA</button>
                        </div>
                    </div>

                    <div class="filtros-avancados-recursos p-4 mb-6 border dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800">
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                            <div>
                                <label for="search-ptas-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Buscar por Termo:</label>
                                <input type="search" id="search-ptas-input" class="form-input-text mt-1 block w-full text-sm" placeholder="Número, Assunto, Responsável..." value="${currentPTAFilters.searchTerm}">
                            </div>
                            <div>
                                <label for="filter-pta-tipo" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de PTA:</label>
                                <select id="filter-pta-tipo" class="form-input-text mt-1 block w-full text-sm">
                                    <option value="">Todos</option>
                                    ${tiposPTAOptionsHtml}
                                </select>
                            </div>
                            <div>
                                <label for="filter-pta-status" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Status:</label>
                                <select id="filter-pta-status" class="form-input-text mt-1 block w-full text-sm">
                                    <option value="">Todos</option>
                                    ${STATUS_PTA_OPTIONS_LIST.map(s => `<option value="${s}" ${currentPTAFilters.statusPTA === s ? 'selected' : ''}>${s}</option>`).join('')}
                                </select>
                            </div>
                             <div class="flex items-end">
                                <button id="btn-aplicar-filtros-ptas" class="btn-primary btn-sm text-sm py-1.5 px-3 w-full">Aplicar Filtros</button>
                            </div>
                        </div>
                    </div>
            `;

            if (ptasProcessados.length === 0) {
                listHtml += `<p class="text-center text-gray-500 dark:text-gray-400 py-8">
                    ${Object.values(currentPTAFilters).some(v => v && v !== currentPTAFilters.sortField && v !== currentPTAFilters.sortOrder) ?
                    'Nenhum PTA encontrado com os filtros aplicados.' :
                    'Nenhum PTA cadastrado ainda.'}
                </p>`;
            } else {
                listHtml += `
                    <div class="table-list-container">
                        <table id="tabela-ptas" class="documentos-table">
                            <thead>
                                <tr>
                                    <th data-sort-ptas="numeroPTA" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700">Número PTA <span class="sort-arrow"></span></th>
                                    <th data-sort-ptas="assuntoPTA" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700">Assunto <span class="sort-arrow"></span></th>
                                    <th data-sort-ptas="dataPTA" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700">Data <span class="sort-arrow"></span></th>
                                    <th data-sort-ptas="tipoPTA" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700">Tipo <span class="sort-arrow"></span></th>
                                    <th data-sort-ptas="statusPTA" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700 status-column">Status <span class="sort-arrow"></span></th>
                                    <th>Responsável</th>
                                    <th class="w-1/6 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
                for (const pta of ptasProcessados) {
                    const dataFormatada = new Date(pta.dataPTA).toLocaleDateString();
                    listHtml += `
                        <tr data-id="${pta.id}">
                            <td>${pta.numeroPTA || 'N/A'}</td>
                            <td>
                                <a href="#" class="link-visualizar-pta font-medium hover:underline" data-id="${pta.id}">
                                    ${pta.assuntoPTA || "Sem Assunto"}
                                </a>
                            </td>
                            <td>${dataFormatada}</td>
                            <td>${pta.tipoPTA || 'N/D'}</td>
                            <td class="status-column-cell">
                                <select class="quick-status-change-pta form-input-text text-xs p-1 rounded-md border-gray-300 dark:bg-slate-600 dark:border-slate-500 dark:text-gray-200 focus:border-blue-500 focus:ring-blue-500" data-id="${pta.id}">
                                    ${STATUS_PTA_OPTIONS_LIST.map(s => `<option value="${s}" ${pta.statusPTA === s ? 'selected' : ''}>${s}</option>`).join('')}
                                </select>
                            </td>
                            <td>${pta.servidorResponsavelPTA || 'N/D'}</td>
                            <td class="actions-cell text-center">
                                <button class="btn-link btn-visualizar-pta-lista" data-id="${pta.id}" title="Visualizar">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye-fill inline-block" viewBox="0 0 16 16"><path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/><path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/></svg>
                                </button>
                                <button class="btn-link btn-editar-pta-lista" data-id="${pta.id}" title="Editar">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square inline-block" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg>
                                </button>
                                <button class="btn-link btn-excluir-pta-lista" data-id="${pta.id}" data-numero="${pta.numeroPTA || 'ID ' + pta.id}" title="Mover para Lixeira">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash-fill inline-block" viewBox="0 0 16 16"><path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1H2.5zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5zM8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5zm3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0z"/></svg>
                                </button>
                            </td>
                        </tr>
                    `;
                }
                listHtml += '</tbody></table></div>';
            }
            listHtml += '</div>';
            mainContentWrapperRef.innerHTML = listHtml;
            updateSortArrowsPTAs();
            addEventListenersToListagemPTAs(document.getElementById(feedbackAreaId));

        } catch (error) {
            console.error("PTAListagens.JS: Erro ao renderizar página de gestão de PTAs:", error);
            mainContentWrapperRef.innerHTML = `<p class="feedback-message error p-4">Erro ao carregar lista de PTAs: ${error.message}</p>`;
        }
    }

    function updateSortArrowsPTAs() {
        document.querySelectorAll('#tabela-ptas th[data-sort-ptas]').forEach(th => {
            const arrowSpan = th.querySelector('.sort-arrow');
             if (!arrowSpan) {
                const newSpan = document.createElement('span');
                newSpan.className = 'sort-arrow';
                th.appendChild(newSpan);
            }
            const currentArrowSpan = th.querySelector('.sort-arrow');
            if (th.dataset.sortPtas === currentPTAFilters.sortField) {
                currentArrowSpan.textContent = currentPTAFilters.sortOrder === 'asc' ? ' ▲' : ' ▼';
            } else {
                currentArrowSpan.textContent = '';
            }
        });
    }
    
    async function desvincularPTADeEntidades(ptaId, ptaOriginal) {
        if (!dbRef || !ptaId || !ptaOriginal) return;
        console.warn("PTAListagens.JS: desvincularPTADeEntidades foi chamada. Esta função pode ser redundante se a desvinculação já é tratada por SharedUtils.desvincularEntidadeDeTodasAsOutras em outro local (ex: view ou lixeira).");

        const entidadesParaDesvincular = [
            { store: DOCUMENTS_STORE_NAME, campo: 'ptasVinculadosIds', ids: ptaOriginal.documentosVinculadosIds || [] },
            { store: CONTRIBUINTES_STORE_NAME, campo: 'ptasRelacionadosIds', ids: ptaOriginal.contribuintesVinculadosIds || [] },
            { store: TAREFAS_STORE_NAME, campo: 'ptasVinculadosIds', ids: ptaOriginal.tarefasVinculadasIds || [] },
            { store: NOTAS_RAPIDAS_STORE_NAME, campo: 'ptasRelacionadosIds', ids: ptaOriginal.notasRapidasRelacionadasIds || [] }, // Corrigido
            { store: PROTOCOLOS_STORE_NAME, campo: 'ptasGeradosIds', ids: ptaOriginal.protocolosOriginariosIds || [] }, // PTA originou de Protocolos
            { store: AUTUACOES_STORE_NAME, campo: 'ptasOriginariosIds', ids: ptaOriginal.autuacoesGeradasIds || [] } // Autuações que este PTA gerou
        ];

        for (const entidade of entidadesParaDesvincular) {
            if (entidade.ids.length > 0) {
                 await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(ptaId, entidade.store, entidade.campo, [], entidade.ids, dbRef);
            }
        }
    }


    function addEventListenersToListagemPTAs(feedbackDisplayArea) {
        const btnNovoPTA = document.getElementById('btn-novo-pta-listagem');
        if (btnNovoPTA) {
            btnNovoPTA.addEventListener('click', () => {
                if (appModuleRef && appModuleRef.handleMenuAction) {
                    appModuleRef.handleMenuAction('cadastrar-pta');
                }
            });
        }

        const searchInput = document.getElementById('search-ptas-input');
        const tipoFilter = document.getElementById('filter-pta-tipo');
        const statusFilter = document.getElementById('filter-pta-status');
        const btnAplicarFiltros = document.getElementById('btn-aplicar-filtros-ptas');

        const applyFilters = () => {
            currentPTAFilters.searchTerm = searchInput ? searchInput.value : '';
            currentPTAFilters.tipoPTA = tipoFilter ? tipoFilter.value : '';
            currentPTAFilters.statusPTA = statusFilter ? statusFilter.value : '';
            renderGerirPTAsPage();
        };

        if (btnAplicarFiltros) btnAplicarFiltros.addEventListener('click', applyFilters);
        if (searchInput) searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') applyFilters(); });

        document.querySelectorAll('#tabela-ptas th[data-sort-ptas]').forEach(th => {
            th.addEventListener('click', () => {
                const field = th.dataset.sortPtas;
                if (currentPTAFilters.sortField === field) {
                    currentPTAFilters.sortOrder = currentPTAFilters.sortOrder === 'asc' ? 'desc' : 'asc';
                } else {
                    currentPTAFilters.sortField = field;
                    currentPTAFilters.sortOrder = 'asc';
                }
                renderGerirPTAsPage();
            });
        });

        mainContentWrapperRef.querySelectorAll('.link-visualizar-pta, .btn-visualizar-pta-lista').forEach(button => {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                const ptaId = event.currentTarget.dataset.id;
                if (ptasViewModuleRef && typeof ptasViewModuleRef.renderVisualizarPTAPage === 'function') {
                    ptasViewModuleRef.renderVisualizarPTAPage(ptaId, 'gerir-ptas');
                }
            });
        });

        mainContentWrapperRef.querySelectorAll('.btn-editar-pta-lista').forEach(button => {
            button.addEventListener('click', async (event) => {
                const ptaId = event.currentTarget.dataset.id;
                try {
                    const pta = await dbRef.getItemById(PTAS_STORE_NAME, ptaId);
                    if (pta && ptasFormModuleRef && typeof ptasFormModuleRef.renderFormularioPTA === 'function') {
                        ptasFormModuleRef.renderFormularioPTA(pta, 'gerir-ptas');
                    }
                } catch (error) { console.error("Erro ao buscar PTA para edição:", error); }
            });
        });

        mainContentWrapperRef.querySelectorAll('.btn-excluir-pta-lista').forEach(button => {
            button.addEventListener('click', async (event) => {
                const ptaId = event.currentTarget.dataset.id;
                const ptaNumero = event.currentTarget.dataset.numero;
                if (confirm(`Tem certeza que deseja mover o PTA "${ptaNumero}" para a lixeira?`)) {
                    try {
                        const pta = await dbRef.getItemById(PTAS_STORE_NAME, ptaId);
                        if (pta) {
                            pta.isDeleted = true; 
                            pta.dataModificacao = new Date().toISOString();
                            await dbRef.updateItem(PTAS_STORE_NAME, pta);
                            
                            if (globalShowFeedbackRef) globalShowFeedbackRef(`PTA "${ptaNumero}" movido para a lixeira.`, "success", feedbackDisplayArea);

                            if (typeof refreshApplicationStateRef === 'function') {
                                await refreshApplicationStateRef();
                            }
                            renderGerirPTAsPage(); 
                        } else {
                             if (globalShowFeedbackRef) globalShowFeedbackRef(`PTA "${ptaNumero}" não encontrado.`, "error", feedbackDisplayArea);
                        }
                    } catch (error) {
                        console.error("Erro ao mover PTA para a lixeira:", error);
                        if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao mover PTA para a lixeira: ${error.message}`, "error", feedbackDisplayArea);
                    }
                }
            });
        });
        
        mainContentWrapperRef.querySelectorAll('.quick-status-change-pta').forEach(select => {
            select.addEventListener('change', async (event) => {
                const ptaId = event.target.dataset.id;
                const novoStatus = event.target.value;
                try {
                    const pta = await dbRef.getItemById(PTAS_STORE_NAME, ptaId);
                    if (pta) {
                        const statusAntigo = pta.statusPTA;
                        pta.statusPTA = novoStatus;
                        pta.dataModificacao = new Date().toISOString();

                        if (['Deferido', 'Indeferido', 'Arquivado', 'Cancelado', 'Convertido em Autuação'].includes(novoStatus) && !pta.dataConclusaoPTA) {
                             pta.dataConclusaoPTA = new Date().toISOString();
                        } else if (!['Deferido', 'Indeferido', 'Arquivado', 'Cancelado', 'Convertido em Autuação'].includes(novoStatus) && pta.dataConclusaoPTA) {
                            pta.dataConclusaoPTA = null;
                        }

                        pta.historicoAndamentoPTA = pta.historicoAndamentoPTA || [];
                        pta.historicoAndamentoPTA.push({
                            data: new Date().toISOString(),
                            descricao: `Status alterado de "${statusAntigo}" para "${novoStatus}".`,
                            responsavel: "Sistema (Alteração Rápida na Lista)",
                            tipoAndamento: "Mudança de Status"
                        });

                        await dbRef.updateItem(PTAS_STORE_NAME, pta);
                        if (globalShowFeedbackRef) globalShowFeedbackRef(`Status do PTA "${pta.numeroPTA}" alterado para "${novoStatus}".`, "success", feedbackDisplayArea);

                        if (typeof refreshApplicationStateRef === 'function') {
                            await refreshApplicationStateRef();
                        }
                        renderGerirPTAsPage();
                    }
                } catch (error) {
                    console.error("Erro ao alterar status rápido do PTA:", error);
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Erro ao alterar status do PTA.", "error", feedbackDisplayArea);
                    const ptaOriginal = await dbRef.getItemById(PTAS_STORE_NAME, ptaId);
                    if (ptaOriginal) event.target.value = ptaOriginal.statusPTA;
                }
            });
        });
    }

    return {
        init,
        renderGerirPTAsPage,
        desvincularPTADeEntidades
    };
})();