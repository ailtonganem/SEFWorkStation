// js/protocolosListagens.js - Lógica para Listagens de Protocolos
// v0.7.0 - REFATORADO: Utiliza EntityConfig.filterActiveItems para filtrar a lista principal, corrigindo o bug de versionamento.
// v0.6.1 - Remove classe page-section para expandir a largura da visualização.
// v0.6 - Modifica exclusão para mover para lixeira (isDeleted = true). Ajusta renderização.
// ... (histórico anterior)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.ProtocolosListagens = (function() {
    // ... (variáveis de módulo e init mantidos) ...
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let dbRef;
    let appModuleRef;
    let protocolosViewModuleRef;
    let protocolosFormModuleRef;
    let refreshApplicationStateRef;
    let uiModuleRef;

    const PROTOCOLOS_STORE_NAME = 'protocolosStore';
    const PROTOCOL_TYPES_STORE_NAME = 'protocolTypesStore';
    const CONTRIBUINTES_STORE_NAME = 'contribuintes';
    const DOCUMENTS_STORE_NAME = 'documents';
    const TAREFAS_STORE_NAME = 'tarefasStore';
    const NOTAS_RAPIDAS_STORE_NAME = 'notasRapidasStore';
    const PTAS_STORE_NAME = 'ptasStore';
    const AUTUACOES_STORE_NAME = 'autuacoesStore';


    const DEFAULT_PROTOCOL_TYPES_FOR_FILTER = [
        "ITCD", "ICMS", "TAXAS", "IPVA", "ISENÇÃO", "RESTITUIÇÃO", "CDT", "DOCUMENTOS FISCAIS", "OUTROS"
    ];
    const STATUS_PROTOCOLO_OPTIONS = ['Recebido', 'Enviado', 'Em Análise', 'Respondido', 'Arquivado', 'Cancelado'];

    let currentProtocolosFilters = {
        searchTerm: '',
        tipoProtocolo: '',
        statusProtocolo: '',
        sortField: 'dataHoraProtocolo',
        sortOrder: 'desc'
        // isDeleted não é um filtro de usuário aqui, a view sempre mostra !isDeleted
    };

    function init(
        mainWrapper,
        showFeedbackFunc,
        clearFeedbackFunc,
        dbModuleRef,
        applicationModuleRef,
        pViewModule,
        pFormModule,
        refreshFunc,
        uiRefModule
    ) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedbackFunc;
        globalClearFeedbackRef = clearFeedbackFunc;
        dbRef = dbModuleRef;
        appModuleRef = applicationModuleRef;
        protocolosViewModuleRef = pViewModule;
        protocolosFormModuleRef = pFormModule;
        refreshApplicationStateRef = refreshFunc;
        uiModuleRef = uiRefModule;

        if (!dbRef) console.error("ProtocolosListagens.JS: init - Referência ao DB não fornecida!");
        if (!refreshApplicationStateRef) console.warn("ProtocolosListagens.JS: init - refreshApplicationStateRef não fornecido.");
        console.log("ProtocolosListagens.JS: Módulo inicializado (v0.7.0).");
    }

    async function filterAndSortProtocolos(protocolos, filters) {
        // CORREÇÃO: A filtragem principal (isDeleted/isArchived) já foi feita.
        let processados = [...protocolos];

        if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase().trim();
            processados = processados.filter(p =>
                (p.numeroProtocolo && p.numeroProtocolo.toLowerCase().includes(term)) ||
                (p.assunto && p.assunto.toLowerCase().includes(term)) ||
                (p.servidorResponsavel && p.servidorResponsavel.toLowerCase().includes(term)) ||
                (p.tipoProtocolo && p.tipoProtocolo.toLowerCase().includes(term))
            );
        }
        if (filters.tipoProtocolo) {
            processados = processados.filter(p => p.tipoProtocolo === filters.tipoProtocolo);
        }
        if (filters.statusProtocolo) {
            processados = processados.filter(p => p.statusProtocolo === filters.statusProtocolo);
        }

        processados.sort((a, b) => {
            let valA, valB;
            switch (filters.sortField) {
                case 'numeroProtocolo':
                    valA = a.numeroProtocolo || ''; valB = b.numeroProtocolo || '';
                    break;
                case 'assunto':
                    valA = a.assunto || ''; valB = b.assunto || '';
                    break;
                case 'statusProtocolo':
                    valA = a.statusProtocolo || ''; valB = b.statusProtocolo || '';
                    break;
                case 'tipoProtocolo':
                    valA = a.tipoProtocolo || ''; valB = b.tipoProtocolo || '';
                    break;
                case 'dataHoraProtocolo':
                default:
                    valA = new Date(a.dataHoraProtocolo || 0);
                    valB = new Date(b.dataHoraProtocolo || 0);
                    return filters.sortOrder === 'desc' ? valB - valA : valA - valB;
            }
            return filters.sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        });
        return processados;
    }

    async function renderGerirProtocolosPage() {
        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (!mainContentWrapperRef) {
            console.error("ProtocolosListagens.JS: renderGerirProtocolosPage - mainContentWrapperRef não definido.");
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico ao renderizar lista de protocolos.", "error");
            return;
        }
        mainContentWrapperRef.innerHTML = '<p class="loading-text p-4">A carregar lista de protocolos...</p>';
        const feedbackAreaId = "feedback-gerir-protocolos";

        try {
            const todosProtocolosDoDB = await dbRef.getAllItems(PROTOCOLOS_STORE_NAME);
            
            // CORREÇÃO: Utiliza a função centralizada para filtrar itens ativos.
            const protocolosAtivos = window.SEFWorkStation.EntityConfig.filterActiveItems(todosProtocolosDoDB, PROTOCOLOS_STORE_NAME);
            
            const protocolosProcessados = await filterAndSortProtocolos(protocolosAtivos, currentProtocolosFilters);
            
            // ... (restante da função mantido, pois a lógica de renderização HTML não muda)
            let tiposDeProtocoloParaFiltro = [...DEFAULT_PROTOCOL_TYPES_FOR_FILTER];
            try {
                const tiposCadastrados = await dbRef.getAllItems(PROTOCOL_TYPES_STORE_NAME);
                tiposCadastrados.forEach(tipoDb => {
                    if (!tiposDeProtocoloParaFiltro.includes(tipoDb.name)) {
                        tiposDeProtocoloParaFiltro.push(tipoDb.name);
                    }
                });
                tiposDeProtocoloParaFiltro.sort((a,b) => a.localeCompare(b));
            } catch (e) { console.warn("Erro ao buscar tipos de protocolo para filtro:", e); }

            const tiposProtocoloOptionsHtml = tiposDeProtocoloParaFiltro.map(tipo =>
                `<option value="${tipo.replace(/"/g, '"')}" ${currentProtocolosFilters.tipoProtocolo === tipo ? 'selected' : ''}>${tipo}</option>`
            ).join('');

            // REMOVIDA CLASSE page-section
            let listHtml = `
                <div>
                    <div id="${feedbackAreaId}" class="mb-4"></div>
                    <div class="gerir-documentos-toolbar mb-2 flex justify-between items-center">
                        <h2 class="text-xl font-semibold">Gerir Protocolos</h2>
                        <div class="actions-group">
                            <button id="btn-novo-protocolo-listagem" class="btn-primary ml-2 text-sm py-1.5 px-3">Novo Protocolo</button>
                        </div>
                    </div>

                    <div class="filtros-avancados-recursos p-4 mb-6 border dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800">
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                            <div>
                                <label for="search-protocolos-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Buscar por Termo:</label>
                                <input type="search" id="search-protocolos-input" class="form-input-text mt-1 block w-full text-sm" placeholder="Número, Assunto, Responsável..." value="${currentProtocolosFilters.searchTerm}">
                            </div>
                            <div>
                                <label for="filter-protocolo-tipo" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de Protocolo:</label>
                                <select id="filter-protocolo-tipo" class="form-input-text mt-1 block w-full text-sm">
                                    <option value="">Todos</option>
                                    ${tiposProtocoloOptionsHtml}
                                </select>
                            </div>
                            <div>
                                <label for="filter-protocolo-status" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Status:</label>
                                <select id="filter-protocolo-status" class="form-input-text mt-1 block w-full text-sm">
                                    <option value="">Todos</option>
                                    ${STATUS_PROTOCOLO_OPTIONS.map(s => `<option value="${s}" ${currentProtocolosFilters.statusProtocolo === s ? 'selected' : ''}>${s}</option>`).join('')}
                                </select>
                            </div>
                             <div class="flex items-end">
                                <button id="btn-aplicar-filtros-protocolos" class="btn-primary btn-sm text-sm py-1.5 px-3 w-full">Aplicar Filtros</button>
                            </div>
                        </div>
                    </div>
            `;

            if (protocolosProcessados.length === 0) {
                listHtml += `<p class="text-center text-gray-500 dark:text-gray-400 py-8">
                    ${Object.values(currentProtocolosFilters).some(v => v && v !== currentProtocolosFilters.sortField && v !== currentProtocolosFilters.sortOrder) ?
                    'Nenhum protocolo encontrado com os filtros aplicados.' :
                    'Nenhum protocolo cadastrado ainda.'}
                </p>`;
            } else {
                listHtml += `
                    <div class="table-list-container">
                        <table id="tabela-protocolos" class="documentos-table">
                            <thead>
                                <tr>
                                    <th data-sort-protocolos="numeroProtocolo" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700">Número <span class="sort-arrow"></span></th>
                                    <th data-sort-protocolos="assunto" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700">Assunto <span class="sort-arrow"></span></th>
                                    <th data-sort-protocolos="dataHoraProtocolo" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700">Data <span class="sort-arrow"></span></th>
                                    <th data-sort-protocolos="tipoProtocolo" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700">Tipo <span class="sort-arrow"></span></th>
                                    <th data-sort-protocolos="statusProtocolo" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700">Status <span class="sort-arrow"></span></th>
                                    <th>Responsável</th>
                                    <th class="w-1/6 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
                for (const protocolo of protocolosProcessados) {
                    const dataFormatada = new Date(protocolo.dataHoraProtocolo).toLocaleDateString();
                    listHtml += `
                        <tr data-id="${protocolo.id}">
                            <td>${protocolo.numeroProtocolo || 'N/A'}</td>
                            <td>
                                <a href="#" class="link-visualizar-protocolo font-medium hover:underline" data-id="${protocolo.id}">
                                    ${protocolo.assunto || "Sem Assunto"}
                                </a>
                            </td>
                            <td>${dataFormatada}</td>
                            <td>${protocolo.tipoProtocolo || 'N/D'}</td>
                            <td>
                                <select class="quick-status-change-protocolo form-input-text text-xs p-1 w-full rounded-md border-gray-300 dark:bg-slate-600 dark:border-slate-500 dark:text-gray-200 focus:border-blue-500 focus:ring-blue-500" data-id="${protocolo.id}">
                                    ${STATUS_PROTOCOLO_OPTIONS.map(s => `<option value="${s}" ${protocolo.statusProtocolo === s ? 'selected' : ''}>${s}</option>`).join('')}
                                </select>
                            </td>
                            <td>${protocolo.servidorResponsavel || 'N/D'}</td>
                            <td class="actions-cell text-center">
                                <button class="btn-link btn-visualizar-protocolo-lista" data-id="${protocolo.id}" title="Visualizar">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye-fill inline-block" viewBox="0 0 16 16"><path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/><path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/></svg>
                                </button>
                                <button class="btn-link btn-editar-protocolo-lista" data-id="${protocolo.id}" title="Editar">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square inline-block" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg>
                                </button>
                                <button class="btn-link btn-excluir-protocolo-lista" data-id="${protocolo.id}" data-numero="${protocolo.numeroProtocolo || 'ID ' + protocolo.id}" title="Mover para Lixeira">
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
            updateSortArrowsProtocolos();
            addEventListenersToListagemProtocolos(document.getElementById(feedbackAreaId));

        } catch (error) {
            console.error("ProtocolosListagens.JS: Erro ao renderizar página de gestão de protocolos:", error);
            mainContentWrapperRef.innerHTML = `<p class="feedback-message error p-4">Erro ao carregar lista de protocolos: ${error.message}</p>`;
        }
    }

    function updateSortArrowsProtocolos() {
        document.querySelectorAll('#tabela-protocolos th[data-sort-protocolos]').forEach(th => {
            const arrowSpan = th.querySelector('.sort-arrow');
             if (!arrowSpan) {
                const newSpan = document.createElement('span');
                newSpan.className = 'sort-arrow';
                th.appendChild(newSpan);
            }
            const currentArrowSpan = th.querySelector('.sort-arrow');
            if (th.dataset.sortProtocolos === currentProtocolosFilters.sortField) {
                currentArrowSpan.textContent = currentProtocolosFilters.sortOrder === 'asc' ? ' ▲' : ' ▼';
            } else {
                currentArrowSpan.textContent = '';
            }
        });
    }

    async function desvincularProtocoloDeEntidades(protocoloId, protocoloOriginal) {
        if (!dbRef || !protocoloId || !protocoloOriginal) return;
        console.warn("ProtocolosListagens.JS: desvincularProtocoloDeEntidades foi chamada. Esta função pode ser redundante se a desvinculação já é tratada por SharedUtils.desvincularEntidadeDeTodasAsOutras em outro local (ex: view ou lixeira).");

        const entidadesParaDesvincular = [
            { store: DOCUMENTS_STORE_NAME, campo: 'protocolosVinculadosIds', ids: protocoloOriginal.documentosVinculadosIds || [] },
            { store: CONTRIBUINTES_STORE_NAME, campo: 'protocolosRelacionadosIds', ids: protocoloOriginal.contribuintesVinculadosIds || [] },
            { store: TAREFAS_STORE_NAME, campo: 'protocolosVinculadosIds', ids: protocoloOriginal.tarefasVinculadasIds || [] },
            { store: NOTAS_RAPIDAS_STORE_NAME, campo: 'protocolosRelacionadosIds', ids: protocoloOriginal.notasRapidasVinculadasIds || [] },
            { store: PTAS_STORE_NAME, campo: 'protocolosOriginariosIds', ids: protocoloOriginal.ptasGeradosIds || [] }, // Para PTAs que *este protocolo* gerou
            { store: AUTUACOES_STORE_NAME, campo: 'protocolosOriginariosIds', ids: protocoloOriginal.autuacoesGeradasIds || [] } // Para Autuações que *este protocolo* gerou
        ];

        for (const entidade of entidadesParaDesvincular) {
            if (entidade.ids.length > 0) {
                 await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(protocoloId, entidade.store, entidade.campo, [], entidade.ids, dbRef);
            }
        }
    }


    function addEventListenersToListagemProtocolos(feedbackDisplayArea) {
        const btnNovoProtocolo = document.getElementById('btn-novo-protocolo-listagem');
        if (btnNovoProtocolo) {
            btnNovoProtocolo.addEventListener('click', () => {
                if (appModuleRef && appModuleRef.handleMenuAction) {
                    appModuleRef.handleMenuAction('cadastrar-protocolo');
                }
            });
        }

        const searchInput = document.getElementById('search-protocolos-input');
        const tipoFilter = document.getElementById('filter-protocolo-tipo');
        const statusFilter = document.getElementById('filter-protocolo-status');
        const btnAplicarFiltros = document.getElementById('btn-aplicar-filtros-protocolos');

        const applyFilters = () => {
            currentProtocolosFilters.searchTerm = searchInput ? searchInput.value : '';
            currentProtocolosFilters.tipoProtocolo = tipoFilter ? tipoFilter.value : '';
            currentProtocolosFilters.statusProtocolo = statusFilter ? statusFilter.value : '';
            renderGerirProtocolosPage();
        };

        if (btnAplicarFiltros) btnAplicarFiltros.addEventListener('click', applyFilters);
        if (searchInput) searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') applyFilters(); });

        document.querySelectorAll('#tabela-protocolos th[data-sort-protocolos]').forEach(th => {
            th.addEventListener('click', () => {
                const field = th.dataset.sortProtocolos;
                if (currentProtocolosFilters.sortField === field) {
                    currentProtocolosFilters.sortOrder = currentProtocolosFilters.sortOrder === 'asc' ? 'desc' : 'asc';
                } else {
                    currentProtocolosFilters.sortField = field;
                    currentProtocolosFilters.sortOrder = 'asc';
                }
                renderGerirProtocolosPage();
            });
        });

        mainContentWrapperRef.querySelectorAll('.link-visualizar-protocolo, .btn-visualizar-protocolo-lista').forEach(button => {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                const protocoloId = event.currentTarget.dataset.id;
                if (protocolosViewModuleRef && typeof protocolosViewModuleRef.renderVisualizarProtocoloPage === 'function') {
                    protocolosViewModuleRef.renderVisualizarProtocoloPage(protocoloId, 'gerir-protocolos');
                }
            });
        });

        mainContentWrapperRef.querySelectorAll('.btn-editar-protocolo-lista').forEach(button => {
            button.addEventListener('click', async (event) => {
                const protocoloId = event.currentTarget.dataset.id;
                try {
                    const protocolo = await dbRef.getItemById(PROTOCOLOS_STORE_NAME, protocoloId);
                    if (protocolo && protocolosFormModuleRef && typeof protocolosFormModuleRef.renderFormularioProtocolo === 'function') {
                        protocolosFormModuleRef.renderFormularioProtocolo(protocolo, 'gerir-protocolos');
                    }
                } catch (error) { console.error("Erro ao buscar protocolo para edição:", error); }
            });
        });

        mainContentWrapperRef.querySelectorAll('.btn-excluir-protocolo-lista').forEach(button => {
            button.addEventListener('click', async (event) => {
                const protocoloId = event.currentTarget.dataset.id;
                const protocoloNumero = event.currentTarget.dataset.numero;
                if (confirm(`Tem certeza que deseja mover o protocolo "${protocoloNumero}" para a lixeira?`)) {
                    try {
                        const protocolo = await dbRef.getItemById(PROTOCOLOS_STORE_NAME, protocoloId);
                        if (protocolo) {
                            protocolo.isDeleted = true; 
                            protocolo.dataModificacao = new Date().toISOString();
                            await dbRef.updateItem(PROTOCOLOS_STORE_NAME, protocolo);
                            
                            if (globalShowFeedbackRef) globalShowFeedbackRef(`Protocolo "${protocoloNumero}" movido para a lixeira.`, "success", feedbackDisplayArea);

                            if (typeof refreshApplicationStateRef === 'function') {
                                await refreshApplicationStateRef();
                            }
                            renderGerirProtocolosPage(); 
                        } else {
                             if (globalShowFeedbackRef) globalShowFeedbackRef(`Protocolo "${protocoloNumero}" não encontrado.`, "error", feedbackDisplayArea);
                        }
                    } catch (error) {
                        console.error("Erro ao mover protocolo para a lixeira:", error);
                        if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao mover protocolo para a lixeira: ${error.message}`, "error", feedbackDisplayArea);
                    }
                }
            });
        });

        mainContentWrapperRef.querySelectorAll('.quick-status-change-protocolo').forEach(select => {
            select.addEventListener('change', async (event) => {
                const protocoloId = event.target.dataset.id;
                const novoStatus = event.target.value;
                try {
                    const protocolo = await dbRef.getItemById(PROTOCOLOS_STORE_NAME, protocoloId);
                    if (protocolo) {
                        const statusAntigo = protocolo.statusProtocolo;
                        protocolo.statusProtocolo = novoStatus;
                        protocolo.dataModificacao = new Date().toISOString();
                        if (novoStatus === 'Respondido' && !protocolo.dataResposta) {
                            protocolo.dataResposta = new Date().toISOString();
                        }

                        protocolo.historicoAndamentoProtocolo = protocolo.historicoAndamentoProtocolo || [];
                        protocolo.historicoAndamentoProtocolo.push({
                            data: new Date().toISOString(),
                            descricao: `Status alterado de "${statusAntigo}" para "${novoStatus}".`,
                            responsavel: "Sistema (Alteração Rápida na Lista)",
                            tipoAndamento: "Mudança de Status"
                        });

                        await dbRef.updateItem(PROTOCOLOS_STORE_NAME, protocolo);
                        if (globalShowFeedbackRef) globalShowFeedbackRef(`Status do protocolo "${protocolo.numeroProtocolo}" alterado para "${novoStatus}".`, "success", feedbackDisplayArea);

                        if (typeof refreshApplicationStateRef === 'function') {
                            await refreshApplicationStateRef();
                        }
                        renderGerirProtocolosPage();
                    }
                } catch (error) {
                    console.error("Erro ao alterar status rápido do protocolo:", error);
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Erro ao alterar status do protocolo.", "error", feedbackDisplayArea);
                    const protocoloOriginal = await dbRef.getItemById(PROTOCOLOS_STORE_NAME, protocoloId);
                    if (protocoloOriginal) event.target.value = protocoloOriginal.statusProtocolo;
                }
            });
        });
    }

    return {
        init,
        renderGerirProtocolosPage,
        desvincularProtocoloDeEntidades 
    };
})();