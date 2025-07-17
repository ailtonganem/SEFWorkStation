// js/tarefasListagens.js
// v3.7.1 - CORREÇÃO: Passa o elemento correto (event.currentTarget) para showContextMenu, consertando o TypeError.
// v3.7.0 - ADICIONADO: Menu de contexto (clique direito) nas linhas da tabela para acesso rápido às ações.
// v3.6.1 - CORREÇÃO: Ajusta o payload do evento do botão de editar para passar tarefaId, consertando o redirecionamento incorreto.
// v3.6.0 - CORREÇÃO: Adiciona listener para o dropdown de status rápido e corrige o evento do botão de editar.
// (Histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.TarefasListagens = (function() {
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let navigateToViewCallback;
    let refreshApplicationStateRef;
    let dbRef;
    let appModuleRef;
    let tarefasFormModuleRef;
    let uiModuleRef;

    const TAREFAS_STORE_NAME = 'tarefasStore';
    const DOCUMENTS_STORE_NAME = 'documents';
    const CONTRIBUINTES_STORE_NAME = 'contribuintes';
    const RECURSOS_STORE_NAME = 'recursos';
    const NOTAS_RAPIDAS_STORE_NAME = 'notasRapidasStore';
    const PROTOCOLOS_STORE_NAME = 'protocolosStore';
    const PTAS_STORE_NAME = 'ptasStore';
    const AUTUACOES_STORE_NAME = 'autuacoesStore';


    const STATUS_TAREFA_OPTIONS = ['Pendente', 'Em Andamento', 'Concluída', 'Cancelada', 'Aguardando Terceiros'];
    const PRIORIDADES_TAREFA_OPTIONS = ['Baixa', 'Média', 'Alta', 'Urgente'];

    let currentTarefasFilters = {
        searchTerm: '',
        status: '',
        prioridade: '',
        responsavel: '',
        tag: '',
        isExcluida: false,
        sortField: 'dataModificacao',
        sortOrder: 'desc'
    };
    
    // Cache de tarefas para evitar múltiplas leituras do DB na mesma visualização
    let tarefasProcessadasCache = [];
    let selectedTarefas = new Set();


    async function desvincularTarefaDeEntidades(tarefaId, tarefaOriginal) {
        if (!tarefaId || !tarefaOriginal || !dbRef) {
            console.warn("Desvinculação de tarefa não pôde ser concluída: dados insuficientes.");
            return;
        }

        const storesVinculadas = [
            { store: 'documents', ids: tarefaOriginal.documentosVinculadosIds, campo: 'tarefasVinculadasIds' },
            { store: 'contribuintes', ids: tarefaOriginal.contribuintesVinculadosIds, campo: 'tarefasRelacionadasIds' },
            { store: 'recursos', ids: tarefaOriginal.recursosVinculadosIds, campo: 'tarefasVinculadasIds' },
            { store: 'notasRapidasStore', ids: tarefaOriginal.notasRapidasRelacionadasIds, campo: 'tarefasRelacionadasIds' },
            { store: 'protocolosStore', ids: tarefaOriginal.protocolosVinculadosIds, campo: 'tarefasVinculadasIds' },
            { store: 'ptasStore', ids: tarefaOriginal.ptasVinculadosIds, campo: 'tarefasVinculadasIds' },
            { store: 'autuacoesStore', ids: tarefaOriginal.autuacoesVinculadosIds, campo: 'tarefasVinculadasIds' },
        ];

        for (const vinculo of storesVinculadas) {
            if (vinculo.ids && vinculo.ids.length > 0) {
                for (const idEntidade of vinculo.ids) {
                    try {
                        const entidade = await dbRef.getItemById(vinculo.store, idEntidade);
                        if (entidade && Array.isArray(entidade[vinculo.campo])) {
                            const index = entidade[vinculo.campo].indexOf(tarefaId);
                            if (index > -1) {
                                entidade[vinculo.campo].splice(index, 1);
                                if (entidade.modificationDate) {
                                    entidade.modificationDate = new Date().toISOString();
                                }
                                if (entidade.dataModificacao) {
                                    entidade.dataModificacao = new Date().toISOString();
                                }
                                await dbRef.updateItem(vinculo.store, entidade);
                            }
                        }
                    } catch (error) {
                        console.error(`Erro ao desvincular tarefa ${tarefaId} da entidade ${idEntidade} na store ${vinculo.store}:`, error);
                    }
                }
            }
        }
    }

    function init(
        mainWrapper,
        showFeedbackFunc,
        clearFeedbackFunc,
        navigateToViewCb,
        refreshFunc,
        dbModuleRef,
        applicationModuleRef,
        formModuleRef,
        uiRefModule
    ) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedbackFunc;
        globalClearFeedbackRef = clearFeedbackFunc;
        navigateToViewCallback = navigateToViewCb;
        refreshApplicationStateRef = refreshFunc;
        dbRef = dbModuleRef;
        appModuleRef = applicationModuleRef;
        tarefasFormModuleRef = formModuleRef;
        uiModuleRef = uiRefModule;
        console.log("TarefasListagens.JS: Módulo inicializado (v3.7.1).");
    }

    async function filterAndSortTarefas(tarefas, filters) {
        let processados = [...tarefas];

        if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase().trim();
            processados = processados.filter(t =>
                (t.titulo && t.titulo.toLowerCase().includes(term)) ||
                (t.descricaoDetalhada && t.descricaoDetalhada.toLowerCase().includes(term)) ||
                (t.numeroIdentificacao && t.numeroIdentificacao.toLowerCase().includes(term)) ||
                (t.responsavel && t.responsavel.toLowerCase().includes(term)) ||
                (t.tags && t.tags.some(tag => tag.toLowerCase().includes(term)))
            );
        }
        if (filters.status) {
            processados = processados.filter(t => t.status === filters.status);
        }
        if (filters.prioridade) {
            processados = processados.filter(t => t.prioridade === filters.prioridade);
        }
        if (filters.responsavel) {
            const respTerm = filters.responsavel.toLowerCase().trim();
            processados = processados.filter(t => t.servidorResponsavelNome && t.servidorResponsavelNome.toLowerCase().includes(respTerm));
        }
        if (filters.tag) {
             processados = processados.filter(t => t.tags && t.tags.some(tagItem => tagItem.toLowerCase() === filters.tag.toLowerCase()));
        }

        processados.sort((a, b) => {
            let valA, valB;
            switch (filters.sortField) {
                case 'titulo':
                    valA = a.titulo || ''; valB = b.titulo || '';
                    return filters.sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                case 'status':
                    valA = a.status || ''; valB = b.status || '';
                    return filters.sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                case 'prioridade':
                    const prioridadeOrder = { 'Baixa': 1, 'Média': 2, 'Alta': 3, 'Urgente': 4 };
                    valA = prioridadeOrder[a.prioridade] || 0;
                    valB = prioridadeOrder[b.prioridade] || 0;
                    break;
                case 'dataVencimento':
                    valA = a.dataVencimento ? new Date(a.dataVencimento) : (filters.sortOrder === 'asc' ? new Date(8640000000000000) : new Date(-8640000000000000));
                    valB = b.dataVencimento ? new Date(b.dataVencimento) : (filters.sortOrder === 'asc' ? new Date(8640000000000000) : new Date(-8640000000000000));
                    break;
                case 'dataModificacao':
                default:
                    valA = new Date(a.dataModificacao || a.dataCriacao || 0);
                    valB = new Date(b.dataModificacao || b.dataCriacao || 0);
                    break;
            }
            return filters.sortOrder === 'asc' ? valA - valB : valB - valA;
        });
        return processados;
    }

    function getStatusBadgeClass(status) {
        switch (status) {
            case 'Pendente': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-200';
            case 'Em Andamento': return 'bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-200';
            case 'Concluída': return 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-200';
            case 'Cancelada': return 'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-200';
            case 'Aguardando Terceiros': return 'bg-purple-100 text-purple-800 dark:bg-purple-700 dark:text-purple-200';
            default: return 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200';
        }
    }

    function getPrioridadeBadgeClass(prioridade) {
        switch (prioridade) {
            case 'Urgente': return 'bg-red-500 text-white';
            case 'Alta': return 'bg-orange-400 text-white dark:text-gray-900';
            case 'Média': return 'bg-yellow-400 text-gray-800 dark:text-gray-900';
            case 'Baixa': return 'bg-blue-400 text-white';
            default: return 'bg-gray-400 text-white';
        }
    }
    
    function parseTarefaIdFromDataset(datasetId) {
        return datasetId;
    }


    async function renderGerirTarefasPage(isTrashView = false, options = {}) {
        currentTarefasFilters.isExcluida = isTrashView;
        
        let responsavelPredefinido = '';
        if (options.isMyTasksView) {
            const userPrefs = SEFWorkStation.Configuracoes.carregarUserPreferences();
            if (userPrefs && userPrefs.currentUserServerId) {
                try {
                    const servidor = await dbRef.getItemById(dbRef.STORES.SERVIDORES, userPrefs.currentUserServerId);
                    if (servidor && servidor.nome) {
                        responsavelPredefinido = servidor.nome;
                        currentTarefasFilters.responsavel = servidor.nome;
                    }
                } catch(e) { console.error("Erro ao buscar dados do usuário para filtro 'Minhas Tarefas':", e); }
            }
        } else if (!isTrashView) {
            currentTarefasFilters.responsavel = '';
        }
        
        const feedbackAreaId = "feedback-list-tarefas";
        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (!mainContentWrapperRef) {
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico ao renderizar lista de tarefas.", "error");
            return;
        }
        mainContentWrapperRef.innerHTML = '<p class="loading-text p-4">Carregando tarefas...</p>';

        try {
            const todasTarefas = await dbRef.getAllItems(TAREFAS_STORE_NAME);
            
            let tarefasParaExibir;
            if (isTrashView) {
                tarefasParaExibir = todasTarefas.filter(t => t.isExcluida);
            } else {
                tarefasParaExibir = window.SEFWorkStation.EntityConfig.filterActiveItems(todasTarefas, TAREFAS_STORE_NAME);
            }

            // Atualiza o cache de tarefas processadas
            tarefasProcessadasCache = await filterAndSortTarefas(tarefasParaExibir, currentTarefasFilters);
            selectedTarefas = new Set();
            
            const todasTagsUsadas = [...new Set(todasTarefas.filter(n => !n.isExcluida && n.tags).flatMap(n => n.tags))].filter(t => t).sort();

            let listHtml = `
                <div id="tarefas-container"> 
                    <div id="${feedbackAreaId}" class="mb-4"></div>
                    <div class="gerir-documentos-toolbar mb-2 flex justify-between items-center flex-wrap gap-2">
                        <h2 class="text-xl font-semibold">${isTrashView ? 'Lixeira de Tarefas' : (options.isMyTasksView ? 'Minhas Tarefas' : 'Gerir Tarefas')}</h2>
                        <div class="actions-group flex flex-wrap gap-2">
                            ${!isTrashView ? `
                                <button id="btn-calendario-tarefas" class="btn-secondary text-sm py-1.5 px-3">Visão Calendário</button>
                                <button id="btn-acoes-em-lote-tarefas" class="btn-secondary text-sm py-1.5 px-3">Ações em Lote</button>
                                <button id="btn-ver-lixeira-tarefas" class="btn-secondary text-sm py-1.5 px-3">Ver Lixeira</button>
                                <button id="btn-nova-tarefa-listagem" class="btn-primary text-sm py-1.5 px-3">Nova Tarefa</button>
                            ` : `
                                <button id="btn-voltar-para-tarefas" class="btn-secondary text-sm py-1.5 px-3">Voltar para Tarefas</button>
                                ${tarefasProcessadasCache.length > 0 ? `<button id="btn-esvaziar-lixeira-tarefas" class="btn-delete text-sm py-1.5 px-3">Esvaziar Lixeira</button>` : ''}
                            `}
                        </div>
                    </div>

                    ${!isTrashView ? `
                    <div class="filtros-avancados-recursos p-4 mb-6 border dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800">
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-end">
                            <div>
                                <label for="search-tarefas-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Buscar por Termo:</label>
                                <input type="search" id="search-tarefas-input" class="form-input-text mt-1 block w-full text-sm" placeholder="Título, descrição, ID..." value="${currentTarefasFilters.searchTerm}">
                            </div>
                            <div>
                                <label for="filter-tarefa-status" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Status:</label>
                                <select id="filter-tarefa-status" class="form-input-text mt-1 block w-full text-sm">
                                    <option value="">Todos</option>
                                    ${STATUS_TAREFA_OPTIONS.map(s => `<option value="${s}" ${currentTarefasFilters.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label for="filter-tarefa-prioridade" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Prioridade:</label>
                                <select id="filter-tarefa-prioridade" class="form-input-text mt-1 block w-full text-sm">
                                    <option value="">Todas</option>
                                    ${PRIORIDADES_TAREFA_OPTIONS.map(p => `<option value="${p}" ${currentTarefasFilters.prioridade === p ? 'selected' : ''}>${p}</option>`).join('')}
                                </select>
                            </div>
                             <div>
                                <label for="filter-tarefa-responsavel" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Responsável:</label>
                                <input type="text" id="filter-tarefa-responsavel" class="form-input-text mt-1 block w-full text-sm" placeholder="Nome do responsável" value="${currentTarefasFilters.responsavel}" ${options.isMyTasksView ? 'disabled' : ''}>
                            </div>
                            <div>
                                <label for="filter-tarefa-tag-lista" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Tag:</label>
                                <select id="filter-tarefa-tag-lista" class="form-input-text mt-1 block w-full text-sm">
                                     <option value="">Todas as Tags</option>
                                     ${todasTagsUsadas.map(tag => `<option value="${tag}" ${currentTarefasFilters.tag === tag ? 'selected' : ''}>${tag}</option>`).join('')}
                                 </select>
                            </div>
                            <div>
                                <label for="sort-tarefas" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Ordenar por:</label>
                                <select id="sort-tarefas" class="form-input-text mt-1 block w-full text-sm">
                                    <option value="dataModificacao-desc" ${currentTarefasFilters.sortField === 'dataModificacao' && currentTarefasFilters.sortOrder === 'desc' ? 'selected' : ''}>Mais Recentes</option>
                                    <option value="dataModificacao-asc" ${currentTarefasFilters.sortField === 'dataModificacao' && currentTarefasFilters.sortOrder === 'asc' ? 'selected' : ''}>Mais Antigas</option>
                                    <option value="dataVencimento-asc" ${currentTarefasFilters.sortField === 'dataVencimento' && currentTarefasFilters.sortOrder === 'asc' ? 'selected' : ''}>Prazo (Mais Próximo)</option>
                                    <option value="dataVencimento-desc" ${currentTarefasFilters.sortField === 'dataVencimento' && currentTarefasFilters.sortOrder === 'desc' ? 'selected' : ''}>Prazo (Mais Distante)</option>
                                    <option value="prioridade-desc" ${currentTarefasFilters.sortField === 'prioridade' && currentTarefasFilters.sortOrder === 'desc' ? 'selected' : ''}>Prioridade (Maior)</option>
                                    <option value="prioridade-asc" ${currentTarefasFilters.sortField === 'prioridade' && currentTarefasFilters.sortOrder === 'asc' ? 'selected' : ''}>Prioridade (Menor)</option>
                                    <option value="titulo-asc" ${currentTarefasFilters.sortField === 'titulo' && currentTarefasFilters.sortOrder === 'asc' ? 'selected' : ''}>Título (A-Z)</option>
                                    <option value="status-asc" ${currentTarefasFilters.sortField === 'status' && currentTarefasFilters.sortOrder === 'asc' ? 'selected' : ''}>Status</option>
                                </select>
                            </div>
                        </div>
                        <div class="mt-4 flex justify-end">
                            <button id="btn-limpar-filtros-tarefas" class="btn-secondary text-sm py-1.5 px-3 mr-2" ${options.isMyTasksView ? 'disabled' : ''}>Limpar Filtros</button>
                            <button id="btn-aplicar-filtros-tarefas" class="btn-primary text-sm py-1.5 px-3">Aplicar Filtros</button>
                        </div>
                    </div>` : ''}
            `;

            if (tarefasProcessadasCache.length === 0) {
                listHtml += `<p class="text-center text-gray-500 dark:text-gray-400 py-8">
                    ${Object.values(currentTarefasFilters).some(v => v && v !== currentTarefasFilters.isExcluida && v !== currentTarefasFilters.sortField && v !== currentTarefasFilters.sortOrder) ?
                        'Nenhuma tarefa encontrada com os filtros aplicados.' :
                        (isTrashView ? 'A lixeira de tarefas está vazia.' : 'Nenhuma tarefa cadastrada ainda.')}
                </p>`;
            } else {
                const tableRows = tarefasProcessadasCache.map(tarefa => {
                    const dataVencimentoFormatada = tarefa.dataVencimento ? new Date(tarefa.dataVencimento + 'T00:00:00').toLocaleDateString() : 'N/D';
                    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
                    const isPrazoVencido = tarefa.dataVencimento && new Date(tarefa.dataVencimento + 'T23:59:59') < hoje && tarefa.status !== 'Concluída' && tarefa.status !== 'Cancelada';
                    const isPrazoProximo = tarefa.dataVencimento && !isPrazoVencido && (new Date(tarefa.dataVencimento) - hoje) / (1000 * 60 * 60 * 24) <= 7 && tarefa.status !== 'Concluída' && tarefa.status !== 'Cancelada';
                    
                    return `
                        <tr data-id="${tarefa.id}" data-titulo="${(tarefa.titulo || 'Tarefa Sem Título').replace(/"/g, '"')}">
                            ${!isTrashView ? `<td class="text-center"><input type="checkbox" class="checkbox-item-tarefa" data-id="${tarefa.id}"></td>` : ''}
                            <td>
                                <a href="#" class="link-visualizar-tarefa font-medium hover:underline" data-id="${tarefa.id}">${tarefa.titulo || "Tarefa Sem Título"}</a>
                                <span class="block text-xs text-gray-500 dark:text-gray-400">${tarefa.numeroIdentificacao || ''}</span>
                            </td>
                            <td>
                                ${!isTrashView ? `
                                <select class="quick-status-change form-input-text text-xs p-1 w-full rounded-md border-gray-300 dark:bg-slate-600 dark:border-slate-500 dark:text-gray-200 focus:border-blue-500 focus:ring-blue-500" data-id="${tarefa.id}" ${tarefa.status === 'Concluída' || tarefa.status === 'Cancelada' ? 'disabled' : ''}>
                                    ${STATUS_TAREFA_OPTIONS.map(s => `<option value="${s}" ${tarefa.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                                </select>
                                ` : `<span class="px-2 py-0.5 text-xs font-medium rounded-full ${getStatusBadgeClass(tarefa.status)}">${tarefa.status || 'N/D'}</span>`}
                            </td>
                            <td><span class="px-2 py-0.5 text-xs rounded-full ${getPrioridadeBadgeClass(tarefa.prioridade)}">${tarefa.prioridade || 'N/D'}</span></td>
                            <td class="${isPrazoVencido ? 'text-red-500 dark:text-red-400 font-bold' : (isPrazoProximo ? 'text-orange-500 dark:text-orange-400 font-semibold' : '')}">${dataVencimentoFormatada} ${isPrazoVencido ? ' (Vencida!)': (isPrazoProximo ? ' (Próximo!)':'')}</td>
                            <td>${tarefa.servidorResponsavelNome || tarefa.responsavel || 'N/D'}</td>
                            <td class="actions-cell text-center">
                                ${isTrashView ? `
                                    <button class="btn-link btn-restaurar-tarefa text-green-600 dark:text-green-400" data-id="${tarefa.id}" title="Restaurar Tarefa">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-counterclockwise inline-block" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2v1z"/><path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466z"/></svg>
                                    </button>
                                    <button class="btn-link btn-excluir-perm-tarefa text-red-600 dark:text-red-400" data-id="${tarefa.id}" data-titulo="${(tarefa.titulo || "Tarefa Sem Título").replace(/"/g, '"')}" title="Excluir Permanentemente">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash3-fill inline-block" viewBox="0 0 16 16"><path d="M11 1.5v1h3.5a.5.5 0 0 1 0 1h-.538l-.853 10.66A2 2 0 0 1 11.115 16h-6.23a2 2 0 0 1-1.994-1.84L2.038 3.5H1.5a.5.5 0 0 1 0-1H5v-1A1.5 1.5 0 0 1 6.5 0h3A1.5 1.5 0 0 1 11 1.5Zm-5 0v1h4v-1a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5ZM4.5 5.029l.5 8.5a.5.5 0 1 0 .998-.06l-.5-8.5a.5.5 0 1 0-.998.06Zm6.53-.528a.5.5 0 0 0-.528.47l-.5 8.5a.5.5 0 0 0 .998.058l.5-8.5a.5.5 0 0 0-.47-.528ZM8 4.5a.5.5 0 0 0-.5.5v8.5a.5.5 0 0 0 1 0V5a.5.5 0 0 0-.5-.5Z"/></svg>
                                    </button>
                                ` : `
                                    <button class="btn-link btn-visualizar-tarefa-lista" data-id="${tarefa.id}" title="Visualizar">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye-fill inline-block" viewBox="0 0 16 16"><path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/><path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/></svg>
                                    </button>
                                    <button class="btn-link btn-editar-tarefa-lista" data-id="${tarefa.id}" title="Editar">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square inline-block" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg>
                                    </button>
                                    <button class="btn-link btn-excluir-tarefa-lista text-red-600 dark:text-red-400" data-id="${tarefa.id}" data-titulo="${(tarefa.titulo || "Tarefa Sem Título").replace(/"/g, '"')}" title="Mover para Lixeira">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash-fill inline-block" viewBox="0 0 16 16"><path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1H2.5zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5zM8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5zm3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0z"/></svg>
                                    </button>
                                `}
                            </td>
                        </tr>
                    `;
                }).join('');
                
                listHtml += `
                    <div class="table-list-container">
                        <table id="tabela-tarefas" class="documentos-table">
                            <thead>
                                <tr>
                                    ${!isTrashView ? '<th class="w-1/12 text-center"><input type="checkbox" id="checkbox-selecionar-todas-tarefas" title="Selecionar Todas"></th>' : ''}
                                    <th data-sort-tarefas="titulo" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700">Título <span class="sort-arrow"></span></th>
                                    <th data-sort-tarefas="status" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700">Status <span class="sort-arrow"></span></th>
                                    <th data-sort-tarefas="prioridade" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700">Prioridade <span class="sort-arrow"></span></th>
                                    <th data-sort-tarefas="dataVencimento" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700">Prazo <span class="sort-arrow"></span></th>
                                    <th>Responsável</th>
                                    <th class="w-1/6 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody>${tableRows}</tbody>
                        </table>
                    </div>
                `;
            }
            listHtml += `</div>`;
            mainContentWrapperRef.innerHTML = listHtml;
            updateSortArrowsTarefas();
            addEventListenersToListagemTarefas(document.getElementById(feedbackAreaId), options);

        } catch (error) {
            mainContentWrapperRef.innerHTML = `<p class="feedback-message error p-4">Erro ao carregar tarefas: ${error.message}</p>`;
        }
    }
    
    function updateSortArrowsTarefas() {
        document.querySelectorAll('#tabela-tarefas th[data-sort-tarefas]').forEach(th => {
            const field = th.dataset.sortTarefas;
            const arrowSpan = th.querySelector('.sort-arrow');
            if (arrowSpan) {
                if (currentTarefasFilters.sortField === field) {
                    arrowSpan.textContent = currentTarefasFilters.sortOrder === 'asc' ? ' ▲' : ' ▼';
                } else {
                    arrowSpan.textContent = '';
                }
            }
        });
    }

    // Ações para os botões e links
    const handleVisualizar = (tarefaId) => navigateToViewCallback({ id: tarefaId });
    const handleEditar = (tarefaId) => appModuleRef.handleMenuAction('editar-tarefa', { tarefaId: tarefaId, originatingView: 'gerir-tarefas' });
    const handleExcluir = async (tarefaId, tarefaTitulo, feedbackArea) => {
        if (await uiModuleRef.showConfirmationModal('Mover para a Lixeira', `Tem certeza que deseja mover a tarefa "${tarefaTitulo}" para a lixeira?`)) {
            const tarefa = await dbRef.getItemById(TAREFAS_STORE_NAME, tarefaId);
            if (tarefa) {
                tarefa.isExcluida = true;
                tarefa.dataModificacao = new Date().toISOString();
                await dbRef.updateItem(TAREFAS_STORE_NAME, tarefa);
                globalShowFeedbackRef(`Tarefa "${tarefaTitulo}" movida para a lixeira.`, "info", feedbackArea);
                await renderGerirTarefasPage(false);
                if (refreshApplicationStateRef) await refreshApplicationStateRef();
            }
        }
    };
    const handleRestaurar = async (tarefaId, feedbackArea) => {
        const tarefa = await dbRef.getItemById(TAREFAS_STORE_NAME, tarefaId);
        if (tarefa) {
            tarefa.isExcluida = false;
            tarefa.dataModificacao = new Date().toISOString();
            await dbRef.updateItem(TAREFAS_STORE_NAME, tarefa);
            globalShowFeedbackRef(`Tarefa "${tarefa.titulo}" restaurada.`, "success", feedbackArea);
            await renderGerirTarefasPage(true);
            if (refreshApplicationStateRef) await refreshApplicationStateRef();
        }
    };
    const handleExcluirPerm = async (tarefaId, tarefaTitulo, feedbackArea) => {
        if (await uiModuleRef.showConfirmationModal('Exclusão Permanente', `Excluir permanentemente a tarefa "${tarefaTitulo}"? Esta ação é irreversível.`)) {
            await dbRef.deleteItem(TAREFAS_STORE_NAME, tarefaId);
            globalShowFeedbackRef(`Tarefa "${tarefaTitulo}" excluída permanentemente.`, "success", feedbackArea);
            await renderGerirTarefasPage(true);
            if (refreshApplicationStateRef) await refreshApplicationStateRef();
        }
    };
    
    // CORREÇÃO: Implementação das Ações em Lote
    async function abrirModalAcoesEmLoteTarefas(ids, feedbackAreaEl) {
        if (!uiModuleRef) {
            globalShowFeedbackRef("Interface de Modal não disponível.", "error", feedbackAreaEl);
            return;
        }

        const modalHtml = `
            <div id="feedback-modal-lote-tarefas" class="mb-4"></div>
            <p class="text-sm mb-3">A ação selecionada será aplicada a <strong>${ids.length} tarefa(s)</strong>.</p>
            <select id="acao-lote-tarefa-select" class="form-input-text w-full mb-3">
                <option value="">-- Escolha uma ação --</option>
                <option value="mudar_status">Mudar Status</option>
                <option value="mudar_prioridade">Mudar Prioridade</option>
                <option value="excluir">Mover para Lixeira</option>
            </select>
            <div id="container-valor-acao-lote-tarefa" class="hidden">
                <select id="valor-acao-lote-tarefa-select" class="form-input-text w-full"></select>
            </div>
        `;

        const modal = uiModuleRef.showModal("Ações em Lote para Tarefas", modalHtml, [
            { text: 'Cancelar', class: 'btn-secondary', closesModal: true },
            {
                text: 'Executar Ação',
                class: 'btn-primary',
                callback: async () => {
                    const acao = document.getElementById('acao-lote-tarefa-select').value;
                    const valor = document.getElementById('valor-acao-lote-tarefa-select').value;
                    if (!acao) {
                        globalShowFeedbackRef("Selecione uma ação.", "warning", document.getElementById('feedback-modal-lote-tarefas'));
                        return false; 
                    }
                    if ((acao === 'mudar_status' || acao === 'mudar_prioridade') && !valor) {
                        globalShowFeedbackRef("Selecione um valor para a ação.", "warning", document.getElementById('feedback-modal-lote-tarefas'));
                        return false;
                    }
                    await handleLoteAction(acao, valor, ids, feedbackAreaEl);
                    return true;
                }
            }
        ]);

        const acaoSelect = modal.querySelector('#acao-lote-tarefa-select');
        const valorContainer = modal.querySelector('#container-valor-acao-lote-tarefa');
        const valorSelect = modal.querySelector('#valor-acao-lote-tarefa-select');

        acaoSelect.addEventListener('change', () => {
            const acao = acaoSelect.value;
            valorContainer.classList.add('hidden');
            if (acao === 'mudar_status') {
                valorSelect.innerHTML = STATUS_TAREFA_OPTIONS.map(s => `<option value="${s}">${s}</option>`).join('');
                valorContainer.classList.remove('hidden');
            } else if (acao === 'mudar_prioridade') {
                valorSelect.innerHTML = PRIORIDADES_TAREFA_OPTIONS.map(p => `<option value="${p}">${p}</option>`).join('');
                valorContainer.classList.remove('hidden');
            }
        });
    }

    async function handleLoteAction(acao, valor, ids, feedbackAreaEl) {
        let successCount = 0, errorCount = 0;
        for (const id of ids) {
            try {
                const tarefa = await dbRef.getItemById(TAREFAS_STORE_NAME, id);
                if (!tarefa) continue;
                let modified = false;

                switch (acao) {
                    case 'mudar_status': if (tarefa.status !== valor) { tarefa.status = valor; modified = true; } break;
                    case 'mudar_prioridade': if (tarefa.prioridade !== valor) { tarefa.prioridade = valor; modified = true; } break;
                    case 'excluir': if (!tarefa.isExcluida) { tarefa.isExcluida = true; modified = true; } break;
                }

                if (modified) {
                    tarefa.dataModificacao = new Date().toISOString();
                    await dbRef.updateItem(TAREFAS_STORE_NAME, tarefa);
                    successCount++;
                }
            } catch (e) { errorCount++; }
        }
        globalShowFeedbackRef(`${successCount} tarefa(s) processada(s) com sucesso. ${errorCount > 0 ? errorCount + ' erro(s).' : ''}`, errorCount > 0 ? 'warning' : 'success', feedbackAreaEl);
        if (successCount > 0) {
            await renderGerirTarefasPage(currentTarefasFilters.isExcluida);
            if (refreshApplicationStateRef) await refreshApplicationStateRef();
        }
    }


    function addEventListenersToListagemTarefas(feedbackDisplayArea, options = {}) {
        const tabela = mainContentWrapperRef.querySelector('#tabela-tarefas');
        if (!tabela) return;

        // Listener para toda a tabela (delegação de eventos)
        tabela.addEventListener('click', (event) => {
            const target = event.target.closest('button, a, input[type="checkbox"]');
            if (!target) return;
    
            const tr = target.closest('tr');
            if (!tr) return;
    
            const tarefaId = tr.dataset.id;
            const tarefaTitulo = tr.dataset.titulo;

            if (target.matches('.btn-visualizar-tarefa-lista, .link-visualizar-tarefa')) {
                event.preventDefault();
                handleVisualizar(tarefaId);
            } else if (target.matches('.btn-editar-tarefa-lista')) {
                event.preventDefault();
                handleEditar(tarefaId); // CORREÇÃO: Chama a função de roteamento correta
            } else if (target.matches('.btn-excluir-tarefa-lista')) {
                event.preventDefault();
                handleExcluir(tarefaId, tarefaTitulo, feedbackDisplayArea);
            } else if (target.matches('.btn-restaurar-tarefa')) {
                event.preventDefault();
                handleRestaurar(tarefaId, feedbackDisplayArea);
            } else if (target.matches('.btn-excluir-perm-tarefa')) {
                event.preventDefault();
                handleExcluirPerm(tarefaId, tarefaTitulo, feedbackDisplayArea);
            } else if (target.matches('.checkbox-item-tarefa')) {
                 if (target.checked) selectedTarefas.add(tarefaId);
                 else selectedTarefas.delete(tarefaId);
                 updateSelectionBar();
            }
        });
        
        mainContentWrapperRef.querySelectorAll('.quick-status-change').forEach(select => {
            select.addEventListener('change', async (event) => {
                const tarefaId = event.target.dataset.id;
                const novoStatus = event.target.value;
                if (window.SEFWorkStation.TarefasView && typeof window.SEFWorkStation.TarefasView.handleStatusChange === 'function') {
                    await window.SEFWorkStation.TarefasView.handleStatusChange(tarefaId, novoStatus, feedbackDisplayArea);
                }
            });
        });


        // Listener de menu de contexto para as linhas da tabela
        tabela.querySelectorAll('tbody tr').forEach(row => {
            row.addEventListener('contextmenu', (event) => {
                event.preventDefault();
                if (!uiModuleRef || !uiModuleRef.showContextMenu) return;

                const tarefaId = row.dataset.id;
                const tarefa = tarefasProcessadasCache.find(t => t.id === tarefaId);
                if (!tarefa) return;

                const isTrashView = currentTarefasFilters.isExcluida;

                const menuItems = isTrashView
                    ? [
                        { label: 'Restaurar Tarefa', icon: 'bi-arrow-counterclockwise', action: () => handleRestaurar(tarefa.id, feedbackDisplayArea) },
                        { label: 'Excluir Permanentemente', icon: 'bi-trash3-fill', action: () => handleExcluirPerm(tarefa.id, tarefa.titulo, feedbackDisplayArea) }
                      ]
                    : [
                        { label: 'Visualizar Detalhes', icon: 'bi-eye-fill', action: () => handleVisualizar(tarefa.id) },
                        { label: 'Editar Tarefa', icon: 'bi-pencil-square', action: () => handleEditar(tarefa.id) },
                        { isSeparator: true },
                        { label: 'Mover para Lixeira', icon: 'bi-trash-fill', action: () => handleExcluir(tarefa.id, tarefa.titulo, feedbackDisplayArea) }
                      ];
                
                uiModuleRef.showContextMenu(event.currentTarget, menuItems);
            });
        });

        // Listeners dos filtros e botões do cabeçalho
        document.getElementById('btn-nova-tarefa-listagem')?.addEventListener('click', () => appModuleRef.handleMenuAction('nova-tarefa'));
        document.getElementById('btn-calendario-tarefas')?.addEventListener('click', () => appModuleRef.handleMenuAction('calendario-tarefas'));
        document.getElementById('btn-ver-lixeira-tarefas')?.addEventListener('click', () => renderGerirTarefasPage(true, options));
        document.getElementById('btn-voltar-para-tarefas')?.addEventListener('click', () => renderGerirTarefasPage(false, options));
        
        document.getElementById('btn-acoes-em-lote-tarefas')?.addEventListener('click', () => {
             if (selectedTarefas.size === 0) {
                globalShowFeedbackRef("Nenhuma tarefa selecionada.", "info", feedbackDisplayArea);
                return;
            }
            abrirModalAcoesEmLoteTarefas(Array.from(selectedTarefas), feedbackDisplayArea);
        });

        const applyFiltersAndRender = () => {
            const searchInput = document.getElementById('search-tarefas-input');
            const statusFilter = document.getElementById('filter-tarefa-status');
            const prioridadeFilter = document.getElementById('filter-tarefa-prioridade');
            const responsavelFilter = document.getElementById('filter-tarefa-responsavel');
            const tagFilterLista = document.getElementById('filter-tarefa-tag-lista');
            const sortSelect = document.getElementById('sort-tarefas');
            
            if (searchInput) currentTarefasFilters.searchTerm = searchInput.value;
            if (statusFilter) currentTarefasFilters.status = statusFilter.value;
            if (prioridadeFilter) currentTarefasFilters.prioridade = prioridadeFilter.value;
            if (responsavelFilter && !responsavelFilter.disabled) currentTarefasFilters.responsavel = responsavelFilter.value;
            if (tagFilterLista) currentTarefasFilters.tag = tagFilterLista.value;
            if (sortSelect) {
                const [field, order] = sortSelect.value.split('-');
                currentTarefasFilters.sortField = field;
                currentTarefasFilters.sortOrder = order;
            }
            renderGerirTarefasPage(currentTarefasFilters.isExcluida, options);
        };
        
        document.getElementById('btn-aplicar-filtros-tarefas')?.addEventListener('click', applyFiltersAndRender);
        document.getElementById('search-tarefas-input')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') applyFiltersAndRender(); });
        document.getElementById('sort-tarefas')?.addEventListener('change', applyFiltersAndRender);
        document.getElementById('filter-tarefa-status')?.addEventListener('change', applyFiltersAndRender);
        document.getElementById('filter-tarefa-prioridade')?.addEventListener('change', applyFiltersAndRender);

        document.getElementById('btn-limpar-filtros-tarefas')?.addEventListener('click', () => {
            currentTarefasFilters = { searchTerm: '', status: '', prioridade: '', responsavel: '', tag: '', isExcluida: currentTarefasFilters.isExcluida, sortField: 'dataModificacao', sortOrder: 'desc' };
            renderGerirTarefasPage(currentTarefasFilters.isExcluida, options);
        });

        const checkboxSelecionarTodas = document.getElementById('checkbox-selecionar-todas-tarefas');
        if(checkboxSelecionarTodas){
            checkboxSelecionarTodas.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                document.querySelectorAll('.checkbox-item-tarefa').forEach(cb => {
                    if (cb.checked !== isChecked) {
                        cb.checked = isChecked;
                        if(isChecked) selectedTarefas.add(cb.dataset.id);
                        else selectedTarefas.delete(cb.dataset.id);
                    }
                });
                updateSelectionBar();
            });
        }
    }
    
    function updateSelectionBar() {
        const bar = document.getElementById('notas-rapidas-actions-bar'); // Reutilizando ID; Idealmente teria um ID próprio
        const countSpan = document.getElementById('notas-selecionadas-count'); // Reutilizando ID
        if (!bar || !countSpan) return;

        const actionBarHtmlId = 'tarefas-actions-bar';
        let actionBar = document.getElementById(actionBarHtmlId);
        if (!actionBar) {
            actionBar = document.createElement('div');
            actionBar.id = actionBarHtmlId;
            actionBar.className = 'hidden flex flex-col sm:flex-row justify-between items-center mb-4 p-3 bg-blue-100 dark:bg-blue-800 rounded-lg shadow-md gap-2';
            const containerFiltros = document.querySelector('.filtros-avancados-recursos');
            if (containerFiltros) containerFiltros.insertAdjacentElement('afterend', actionBar);
        }

        if (selectedTarefas.size > 0) {
            actionBar.innerHTML = `
                <div class="flex items-center">
                    <input type="checkbox" id="checkbox-selecionar-todas-tarefas" class="form-checkbox mr-3" checked>
                    <span id="tarefas-selecionadas-count" class="text-sm font-medium text-blue-700 dark:text-blue-200">${selectedTarefas.size} tarefa(s) selecionada(s)</span>
                </div>
                <div class="flex flex-wrap gap-2">
                    <button id="btn-favoritar-tarefas-selecionadas" class="btn-secondary btn-sm text-xs">Favoritar</button>
                    <button id="btn-excluir-tarefas-selecionadas" class="btn-danger btn-sm text-xs">Mover para Lixeira</button>
                </div>
            `;
            actionBar.classList.remove('hidden');
            actionBar.classList.add('flex');
            actionBar.querySelector('#checkbox-selecionar-todas-tarefas').addEventListener('change', (e) => {
                 document.querySelectorAll('.checkbox-item-tarefa').forEach(cb => cb.checked = e.target.checked);
                 selectedTarefas.clear();
                 if(e.target.checked) document.querySelectorAll('.checkbox-item-tarefa').forEach(cb => selectedTarefas.add(cb.dataset.id));
                 updateSelectionBar();
            });
            actionBar.querySelector('#btn-excluir-tarefas-selecionadas').addEventListener('click', () => {
                abrirModalAcoesEmLoteTarefas(Array.from(selectedTarefas), document.getElementById('feedback-list-tarefas'));
            });

        } else {
            actionBar.classList.add('hidden');
            actionBar.classList.remove('flex');
        }
    }

    return {
        init,
        renderGerirTarefasPage,
        desvincularTarefaDeEntidades, 
        getStatusBadgeClass, 
        getPrioridadeBadgeClass 
    };
})();