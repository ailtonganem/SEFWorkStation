// js/servidoresListagens.js - Lógica para Listagens de Servidores
// v1.6.0 - ADICIONADO: Opção "Definir como Usuário Atual" no menu de contexto da listagem para maior agilidade.
// v1.5.0 - CORREÇÃO: Utiliza EntityConfig.filterActiveItems para filtrar versões arquivadas da listagem principal.
// v1.4.0 - Adiciona menu de contexto (botão direito) nas linhas da listagem.
// (Histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.ServidoresListagens = (function() {
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let navigateToAppViewRef;
    let refreshApplicationStateRef;
    let dbRef;
    let appModuleRef;
    let servidoresFormModuleRef;
    let servidoresViewModuleRef;
    let uiModuleRef;

    const SERVIDORES_STORE_NAME = 'servidoresStore';
    const DOCUMENTS_STORE_NAME = 'documents';
    const TAREFAS_STORE_NAME = 'tarefasStore';
    const NOTAS_RAPIDAS_STORE_NAME = 'notasRapidasStore';
    const PROTOCOLOS_STORE_NAME = 'protocolosStore';
    const PTAS_STORE_NAME = 'ptasStore';
    const AUTUACOES_STORE_NAME = 'autuacoesStore';


    const STATUS_SERVIDOR_OPTIONS_FILTER = ["Ativo", "Inativo", "Férias Regulamentares", "Férias Prêmio", "Licença", "Afastado", "Desligado", "Outro"]; 

    let currentServidoresFilters = {
        searchTerm: '',
        status: '',
        areaAtuacao: '',
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
        navigateToAppViewRef = navigateToAppViewFunc;
        refreshApplicationStateRef = refreshFunc;
        dbRef = dbModuleRef;
        appModuleRef = applicationModuleRef;
        servidoresFormModuleRef = formModule;
        servidoresViewModuleRef = viewModule;
        uiModuleRef = uiRef;

        if (!dbRef) console.error("ServidoresListagens.JS: init - Referência ao DB não fornecida!");
        console.log("ServidoresListagens.JS: Módulo inicializado (v1.6.0).");
    }

    async function filterAndSortServidores(servidores, filters) {
        let processados = [...servidores];
        // O filtro principal de 'isDeleted' e 'isArchivedVersion' já foi feito antes de chamar esta função.

        if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase().trim();
            processados = processados.filter(s =>
                (s.nome && s.nome.toLowerCase().includes(term)) ||
                (s.matricula && s.matricula.toLowerCase().includes(term)) ||
                (s.email && s.email.toLowerCase().includes(term)) ||
                (s.setorLotacao && s.setorLotacao.toLowerCase().includes(term)) ||
                (s.areaAtuacao && s.areaAtuacao.toLowerCase().includes(term)) ||
                (s.cargoFuncao && s.cargoFuncao.toLowerCase().includes(term))
            );
        }
        if (filters.status) {
            processados = processados.filter(s => {
                let displayStatus = s.status;
                if (s.status === 'Ativo' && s.periodosAusencia && s.periodosAusencia.length > 0) {
                    const hoje = new Date(); hoje.setHours(0,0,0,0);
                    const ausenciaAtual = s.periodosAusencia.find(p => {
                        const inicio = new Date(p.dataInicio + 'T00:00:00');
                        const fim = p.dataFim ? new Date(p.dataFim + 'T23:59:59') : new Date(p.dataInicio + 'T23:59:59');
                        return hoje >= inicio && hoje <= fim;
                    });
                    if (ausenciaAtual) {
                        displayStatus = ausenciaAtual.tipo;
                    }
                }
                return displayStatus === filters.status;
            });
        }
        if (filters.areaAtuacao) {
            const areaTerm = filters.areaAtuacao.toLowerCase().trim();
            processados = processados.filter(s => s.areaAtuacao && s.areaAtuacao.toLowerCase().includes(areaTerm));
        }

        processados.sort((a, b) => {
            let valA, valB;
            switch (filters.sortField) {
                case 'nome':
                    valA = a.nome || ''; valB = b.nome || '';
                    break;
                case 'matricula':
                    valA = a.matricula || ''; valB = b.matricula || '';
                    break;
                case 'setorLotacao':
                    valA = a.setorLotacao || ''; valB = b.setorLotacao || '';
                    break;
                case 'email':
                    valA = a.email || ''; valB = b.email || '';
                    break;
                case 'status': 
                    valA = a.status || ''; valB = b.status || ''; 
                    break;
                case 'dataModificacao':
                default:
                    valA = new Date(a.dataModificacao || a.dataCriacao || 0);
                    valB = new Date(b.dataModificacao || b.dataCriacao || 0);
                    return filters.sortOrder === 'desc' ? valB - valA : valA - valB;
            }
            return filters.sortOrder === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
        });
        return processados;
    }

    function getStatusBadgeClassServidor(status) { 
        switch (status) {
            case 'Ativo': return 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-200';
            case 'Inativo': return 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-300';
            case 'Férias Regulamentares':
            case 'Férias Prêmio':
            case 'Licença':
            case 'Afastado':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-600 dark:text-yellow-200';
            case 'Desligado': return 'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-200';
            default: return 'bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-200';
        }
    }

    async function renderGerirServidoresPage() {
        const feedbackAreaId = "feedback-list-servidores";
        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (!mainContentWrapperRef) {
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico ao renderizar lista de servidores.", "error");
            return;
        }
        mainContentWrapperRef.innerHTML = '<p class="loading-text p-4">Carregando lista de servidores...</p>';

        if (appModuleRef && typeof appModuleRef.setCurrentViewTarget === 'function') {
            appModuleRef.setCurrentViewTarget('gerir-servidores');
        }

        try {
            const todosServidoresDoDB = await dbRef.getAllItems(SERVIDORES_STORE_NAME);
            // CORREÇÃO: Utiliza a função centralizada para filtrar itens ativos, incluindo versões.
            const servidoresAtivos = window.SEFWorkStation.EntityConfig.filterActiveItems(todosServidoresDoDB, SERVIDORES_STORE_NAME);
            const servidoresProcessados = await filterAndSortServidores(servidoresAtivos, currentServidoresFilters);

            let listHtml = `
                <div> 
                    <div id="${feedbackAreaId}" class="mb-4"></div>
                    <div class="gerir-documentos-toolbar mb-2 flex justify-between items-center">
                        <h2 class="text-xl font-semibold">Gerir Servidores</h2>
                        <div class="actions-group">
                            <button id="btn-novo-servidor-listagem" class="btn-primary ml-2 text-sm py-1.5 px-3">Novo Servidor</button>
                        </div>
                    </div>

                    <div class="filtros-avancados-recursos p-4 mb-6 border dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800">
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                            <div>
                                <label for="search-servidores-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Buscar por Termo:</label>
                                <input type="search" id="search-servidores-input" class="form-input-text mt-1 block w-full text-sm" placeholder="Nome, Matrícula, E-mail..." value="${currentServidoresFilters.searchTerm}">
                            </div>
                            <div>
                                <label for="filter-servidor-status" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Status:</label>
                                <select id="filter-servidor-status" class="form-input-text mt-1 block w-full text-sm">
                                    <option value="">Todos</option>
                                    ${STATUS_SERVIDOR_OPTIONS_FILTER.map(s => `<option value="${s}" ${currentServidoresFilters.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label for="filter-servidor-area" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Área de Atuação:</label>
                                <input type="text" id="filter-servidor-area" class="form-input-text mt-1 block w-full text-sm" placeholder="Filtrar por área..." value="${currentServidoresFilters.areaAtuacao}">
                            </div>
                            <div class="flex items-end">
                                <button id="btn-aplicar-filtros-servidores" class="btn-primary btn-sm text-sm py-1.5 px-3 w-full">Aplicar Filtros</button>
                            </div>
                        </div>
                    </div>
            `;

            if (servidoresProcessados.length === 0) {
                listHtml += `<p class="text-center text-gray-500 dark:text-gray-400 py-8">
                    ${Object.values(currentServidoresFilters).some(v => v && v !== currentServidoresFilters.sortField && v !== currentServidoresFilters.sortOrder) ?
                    'Nenhum servidor encontrado com os filtros aplicados.' :
                    'Nenhum servidor cadastrado ainda.'}
                </p>`;
            } else {
                const tableRows = servidoresProcessados.map(servidor => {
                    const modificationDate = new Date(servidor.dataModificacao || servidor.dataCriacao);
                    const formattedDate = modificationDate.toLocaleDateString() + ' ' + modificationDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    
                    let displayStatus = servidor.status || 'N/D';
                    let effectiveStatusForClass = servidor.status; 
                    const hoje = new Date();
                    hoje.setHours(0, 0, 0, 0);

                    if (servidor.status === 'Ativo' && Array.isArray(servidor.periodosAusencia) && servidor.periodosAusencia.length > 0) {
                        const ausenciaAtual = servidor.periodosAusencia.find(p => {
                            const inicio = new Date(p.dataInicio + 'T00:00:00');
                            const fim = p.dataFim ? new Date(p.dataFim + 'T23:59:59') : new Date(p.dataInicio + 'T23:59:59');
                            return hoje >= inicio && hoje <= fim;
                        });
                        if (ausenciaAtual) {
                            displayStatus = `Ativo (${ausenciaAtual.tipo})`;
                            effectiveStatusForClass = ausenciaAtual.tipo;
                        }
                    }
                    else if (servidor.status === 'Ativo' && servidor.diasTrabalhoRemoto && servidor.diasTrabalhoRemoto.length > 0) {
                         displayStatus = `Ativo (Remoto: ${servidor.diasTrabalhoRemoto.map(d => d.substring(0,3)).join(', ')})`;
                    }
                    
                    return `
                        <tr data-id="${servidor.id}" data-nome="${(servidor.nome || 'Sem Nome').replace(/"/g, '"')}">
                            <td>
                                <a href="#" class="link-visualizar-servidor font-medium hover:underline" data-id="${servidor.id}">
                                    ${servidor.nome || "Servidor Sem Nome"}
                                </a>
                            </td>
                            <td>${servidor.matricula || 'N/A'}</td>
                            <td>${servidor.setorLotacao || 'N/D'}</td>
                            <td>${servidor.email || 'N/D'}</td>
                            <td><span class="px-2 py-0.5 text-xs font-medium rounded-full ${getStatusBadgeClassServidor(effectiveStatusForClass)}">${displayStatus}</span></td>
                            <td>${formattedDate}</td>
                            <td class="actions-cell text-center">
                                <button class="btn-link btn-visualizar-servidor-lista" data-id="${servidor.id}" title="Visualizar">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye-fill inline-block" viewBox="0 0 16 16"><path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/><path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/></svg>
                                </button>
                                <button class="btn-link btn-editar-servidor-lista" data-id="${servidor.id}" title="Editar">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square inline-block" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg>
                                </button>
                                <button class="btn-link btn-excluir-servidor-lista" data-id="${servidor.id}" data-nome="${(servidor.nome || "Sem Nome").replace(/"/g, '"')}" title="Mover para Lixeira">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash-fill inline-block" viewBox="0 0 16 16"><path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1H2.5zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5zM8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5zm3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0z"/></svg>
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('');
                
                listHtml += `
                    <div class="table-list-container">
                        <table id="tabela-servidores" class="documentos-table">
                            <thead>
                                <tr>
                                    <th data-sort-servidores="nome" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700">Nome <span class="sort-arrow"></span></th>
                                    <th data-sort-servidores="matricula" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700">Matrícula <span class="sort-arrow"></span></th>
                                    <th data-sort-servidores="setorLotacao" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700">Setor/Lotação <span class="sort-arrow"></span></th>
                                    <th data-sort-servidores="email" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700">E-mail <span class="sort-arrow"></span></th>
                                    <th data-sort-servidores="status" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700">Status <span class="sort-arrow"></span></th>
                                    <th data-sort-servidores="dataModificacao" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700">Modificado em <span class="sort-arrow"></span></th>
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
            updateSortArrowsServidores();
            addEventListenersToListagemServidores(document.getElementById(feedbackAreaId));

        } catch (error) {
            console.error("ServidoresListagens.JS: Erro ao renderizar página de gestão de servidores:", error);
            mainContentWrapperRef.innerHTML = `<p class="feedback-message error p-4">Erro ao carregar lista de servidores: ${error.message}</p>`;
        }
    }

    function updateSortArrowsServidores() {
        const table = document.getElementById('tabela-servidores');
        if (!table) return;
        table.querySelectorAll('th[data-sort-servidores]').forEach(th => {
            const arrowSpan = th.querySelector('.sort-arrow');
             if (!arrowSpan) {
                const newSpan = document.createElement('span');
                newSpan.className = 'sort-arrow';
                th.appendChild(newSpan);
            }
            const currentArrowSpan = th.querySelector('.sort-arrow');
            if (th.dataset.sortServidores === currentServidoresFilters.sortField) {
                currentArrowSpan.textContent = currentServidoresFilters.sortOrder === 'asc' ? ' ▲' : ' ▼';
            } else {
                currentArrowSpan.textContent = '';
            }
        });
    }

    async function desvincularServidorDeEntidades(servidorId, dbRef) {
        if (!dbRef || !servidorId) return;
        
        console.log(`ServidoresListagens.JS: Iniciando desvinculação para servidor ID ${servidorId}.`);
        if (window.SEFWorkStation.SharedUtils && typeof window.SEFWorkStation.SharedUtils.desvincularEntidadeDeTodasAsOutras === 'function') {
            await window.SEFWorkStation.SharedUtils.desvincularEntidadeDeTodasAsOutras(servidorId, SERVIDORES_STORE_NAME, dbRef);
        } else {
            console.warn("ServidoresListagens.JS: SharedUtils.desvincularEntidadeDeTodasAsOutras não disponível.");
        }
    }

    function addEventListenersToListagemServidores(feedbackDisplayArea) {
        const btnNovoServidor = document.getElementById('btn-novo-servidor-listagem');
        if (btnNovoServidor) {
            btnNovoServidor.addEventListener('click', () => {
                if (appModuleRef && appModuleRef.handleMenuAction) {
                    appModuleRef.handleMenuAction('novo-servidor');
                }
            });
        }

        const searchInput = document.getElementById('search-servidores-input');
        const statusFilter = document.getElementById('filter-servidor-status');
        const areaFilter = document.getElementById('filter-servidor-area');
        const btnAplicarFiltros = document.getElementById('btn-aplicar-filtros-servidores');
        const btnLimparFiltros = document.getElementById('btn-limpar-filtros-servidores');

        const applyFilters = () => {
            currentServidoresFilters.searchTerm = searchInput ? searchInput.value : '';
            currentServidoresFilters.status = statusFilter ? statusFilter.value : '';
            currentServidoresFilters.areaAtuacao = areaFilter ? areaFilter.value : '';
            renderGerirServidoresPage();
        };

        if (btnAplicarFiltros) btnAplicarFiltros.addEventListener('click', applyFilters);
        if (searchInput) searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') applyFilters(); });
        
        if (btnLimparFiltros) { 
            btnLimparFiltros.addEventListener('click', () => {
                 currentServidoresFilters.searchTerm = '';
                 currentServidoresFilters.status = '';
                 currentServidoresFilters.areaAtuacao = '';
                 if (searchInput) searchInput.value = '';
                 if (statusFilter) statusFilter.value = '';
                 if (areaFilter) areaFilter.value = '';
                 renderGerirServidoresPage();
            });
        }


        document.querySelectorAll('#tabela-servidores th[data-sort-servidores]').forEach(th => {
            th.addEventListener('click', () => {
                const field = th.dataset.sortServidores;
                if (currentServidoresFilters.sortField === field) {
                    currentServidoresFilters.sortOrder = currentServidoresFilters.sortOrder === 'asc' ? 'desc' : 'asc';
                } else {
                    currentServidoresFilters.sortField = field;
                    currentServidoresFilters.sortOrder = 'asc';
                }
                renderGerirServidoresPage();
            });
        });
        
        mainContentWrapperRef.querySelectorAll('#tabela-servidores tbody tr').forEach(row => {
            row.addEventListener('contextmenu', (event) => {
                event.preventDefault();
                const servidorId = row.dataset.id;
                const servidorNome = row.dataset.nome;

                const menuItems = [
                    { label: 'Visualizar', action: () => servidoresViewModuleRef.renderVisualizarServidorPage(servidorId, 'gerir-servidores') },
                    { label: 'Editar', action: async () => {
                        const servidor = await dbRef.getItemById(SERVIDORES_STORE_NAME, servidorId);
                        if(servidor) servidoresFormModuleRef.renderNovoServidorForm(servidor, 'gerir-servidores');
                    }},
                    { 
                        label: 'Definir como Usuário Atual', 
                        action: async () => {
                            const userPrefs = await window.SEFWorkStation.Configuracoes.carregarUserPreferences();
                            userPrefs.currentUserServerId = servidorId;
                            await window.SEFWorkStation.Configuracoes.salvarUserPreferences(userPrefs);
                            if (globalShowFeedbackRef) globalShowFeedbackRef(`"${servidorNome}" definido como o usuário atual.`, "success");
                            if (appModuleRef && appModuleRef.checkUserIdentity) {
                                await appModuleRef.checkUserIdentity();
                            }
                        }
                    },
                    { isSeparator: true },
                    { label: 'Mover para Lixeira', action: async () => {
                        if (await uiModuleRef.showConfirmationModal('Mover para Lixeira', `Tem certeza que deseja mover o servidor "${servidorNome}" para a lixeira?`)) {
                            try {
                                const servidor = await dbRef.getItemById(SERVIDORES_STORE_NAME, servidorId);
                                if (servidor) {
                                    servidor.isDeleted = true;
                                    servidor.dataModificacao = new Date().toISOString();
                                    await dbRef.updateItem(SERVIDORES_STORE_NAME, servidor);
                                    if (globalShowFeedbackRef) globalShowFeedbackRef(`Servidor "${servidorNome}" movido para a lixeira.`, "success");
                                    if (refreshApplicationStateRef) await refreshApplicationStateRef();
                                    renderGerirServidoresPage();
                                }
                            } catch (error) {
                                if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao mover servidor: ${error.message}`, "error");
                            }
                        }
                    }}
                ];

                if (uiModuleRef && uiModuleRef.showContextMenu) {
                    uiModuleRef.showContextMenu(event.currentTarget, menuItems);
                }
            });
        });

        mainContentWrapperRef.querySelectorAll('.btn-visualizar-servidor-lista').forEach(button => {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                const servidorId = event.currentTarget.dataset.id;
                if (servidoresViewModuleRef && typeof servidoresViewModuleRef.renderVisualizarServidorPage === 'function') {
                    servidoresViewModuleRef.renderVisualizarServidorPage(servidorId, 'gerir-servidores');
                }
            });
        });


        mainContentWrapperRef.querySelectorAll('.btn-editar-servidor-lista').forEach(button => {
            button.addEventListener('click', async (event) => {
                const servidorId = event.currentTarget.dataset.id;
                try {
                    const servidor = await dbRef.getItemById(SERVIDORES_STORE_NAME, servidorId);
                    if (servidor && servidoresFormModuleRef && typeof servidoresFormModuleRef.renderNovoServidorForm === 'function') {
                        servidoresFormModuleRef.renderNovoServidorForm(servidor, 'gerir-servidores');
                    }
                } catch (error) { console.error("Erro ao buscar servidor para edição:", error); }
            });
        });

        mainContentWrapperRef.querySelectorAll('.btn-excluir-servidor-lista').forEach(button => {
            button.addEventListener('click', async (event) => {
                const servidorId = event.currentTarget.dataset.id;
                const servidorNome = event.currentTarget.dataset.nome;
                if (confirm(`Tem certeza que deseja mover o servidor "${servidorNome}" para a lixeira?`)) {
                    try {
                        const servidor = await dbRef.getItemById(SERVIDORES_STORE_NAME, servidorId);
                        if (servidor) {
                            servidor.isDeleted = true;
                            servidor.dataModificacao = new Date().toISOString();
                            await dbRef.updateItem(SERVIDORES_STORE_NAME, servidor);
                            if (globalShowFeedbackRef) globalShowFeedbackRef(`Servidor "${servidorNome}" movido para a lixeira.`, "success", feedbackDisplayArea);
                            if (refreshApplicationStateRef) await refreshApplicationStateRef();
                            renderGerirServidoresPage();
                        }
                    } catch (error) {
                        console.error("Erro ao mover servidor para a lixeira:", error);
                        if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao mover servidor para a lixeira: ${error.message}`, "error", feedbackDisplayArea);
                    }
                }
            });
        });
    }

    return {
        init,
        renderGerirServidoresPage,
        desvincularServidorDeEntidades, 
        getStatusBadgeClassServidor 
    };
})();