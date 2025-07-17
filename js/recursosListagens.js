// js/recursosListagens.js - Lógica para Listagens de Recursos
// v3.7.0 - REFATORADO: Utiliza EntityConfig.filterActiveItems para filtrar a lista principal, corrigindo o bug de versionamento.
// v3.6.0 - Adiciona menu de contexto (botão direito) nas linhas da listagem.
// v3.5 - Modifica exclusão para mover para lixeira (isDeleted = true). Ajusta renderização para não exibir deletados.
// (Histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.RecursosListagens = (function() {
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let globalIrParaHomeRef;
    let refreshApplicationStateRef;
    let dbRef;
    let recursosFormModuleRef;
    let recursosViewModuleRef;
    let uiModuleRef;
    let appModuleRef;

    const RECURSOS_STORE_NAME = 'recursos';
    const CONTRIBUINTES_STORE_NAME = 'contribuintes';
    const DOCUMENTS_STORE_NAME = 'documents';
    const NOTAS_RAPIDAS_STORE_NAME = 'notasRapidasStore';
    const TAREFAS_STORE_NAME = 'tarefasStore';
    const PROTOCOLOS_STORE_NAME = 'protocolosStore';
    const PTAS_STORE_NAME = 'ptasStore';
    const AUTUACOES_STORE_NAME = 'autuacoesStore';


    let currentRecursosFilters = {
        searchTerm: '',
        status: '',
        prioridade: '',
        contribuinteId: '',
        sortField: 'dataApresentacao',
        sortOrder: 'desc'
    };

    function init(
        mainWrapper,
        showFeedbackFunc,
        clearFeedbackFunc,
        irParaHomeFunc,
        refreshFunc,
        dbModuleRef,
        formModuleRef,
        viewModuleRef,
        uiRef,
        applicationModuleRef
    ) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedbackFunc;
        globalClearFeedbackRef = clearFeedbackFunc;
        globalIrParaHomeRef = irParaHomeFunc;
        refreshApplicationStateRef = refreshFunc;
        dbRef = dbModuleRef;
        recursosFormModuleRef = formModuleRef;
        recursosViewModuleRef = viewModuleRef;
        uiModuleRef = uiRef;
        appModuleRef = applicationModuleRef;

        if (!dbRef) console.error("RecursosListagens.JS: init - Referência ao DB não fornecida!");
        if (!mainContentWrapperRef) console.error("RecursosListagens.JS: init - mainContentWrapperRef não fornecido.");
        console.log("RecursosListagens.JS: Módulo inicializado (v3.7.0).");
    }

    async function filterAndSortRecursos(recursos, filters) {
        // CORREÇÃO: A filtragem principal (isDeleted/isArchived) já foi feita.
        let processados = [...recursos];
        
        const contribuintesMap = new Map();
        if (dbRef && typeof dbRef.getAllItems === 'function') {
            const todosContribuintes = await dbRef.getAllItems(CONTRIBUINTES_STORE_NAME);
            todosContribuintes.forEach(c => contribuintesMap.set(c.id, c.nome ? c.nome.toLowerCase() : ''));
        }

        if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase().trim();
            processados = processados.filter(r =>
                (r.titulo && r.titulo.toLowerCase().includes(term)) ||
                (r.numeroIdentificacao && r.numeroIdentificacao.toLowerCase().includes(term)) ||
                (r.tipoRecurso && r.tipoRecurso.toLowerCase().includes(term)) ||
                (r.descricao && r.descricao.toLowerCase().includes(term)) ||
                (r.observacoes && r.observacoes.toLowerCase().includes(term)) ||
                (r.contribuintePrincipalId && contribuintesMap.get(r.contribuintePrincipalId)?.includes(term))
            );
        }
        if (filters.status) {
            processados = processados.filter(r => r.status === filters.status);
        }
        if (filters.prioridade) {
            processados = processados.filter(r => r.prioridade === filters.prioridade);
        }
        if (filters.contribuinteId) {
            const filterContribId = parseIdCorrectly(filters.contribuinteId);
            processados = processados.filter(r => parseIdCorrectly(r.contribuintePrincipalId) === filterContribId);
        }

        processados.sort((a, b) => {
            let valA, valB;
            switch (filters.sortField) {
                case 'titulo':
                    valA = a.titulo || ''; valB = b.titulo || '';
                    return filters.sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                case 'dataApresentacao':
                    valA = new Date(a.dataApresentacao || 0); valB = new Date(b.dataApresentacao || 0);
                    break;
                case 'dataLimiteResposta':
                    valA = a.dataLimiteResposta ? new Date(a.dataLimiteResposta) : (filters.sortOrder === 'asc' ? new Date(8640000000000000) : new Date(-8640000000000000));
                    valB = b.dataLimiteResposta ? new Date(b.dataLimiteResposta) : (filters.sortOrder === 'asc' ? new Date(8640000000000000) : new Date(-8640000000000000));
                    break;
                case 'status':
                    valA = a.status || ''; valB = b.status || '';
                    return filters.sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                case 'prioridade':
                    const prioridadeOrder = { 'Urgente': 4, 'Alta': 3, 'Média': 2, 'Baixa': 1 };
                    valA = prioridadeOrder[a.prioridade] || 0;
                    valB = prioridadeOrder[b.prioridade] || 0;
                    break;
                case 'contribuintePrincipalId':
                    const nomeA = contribuintesMap.get(a.contribuintePrincipalId) || '';
                    const nomeB = contribuintesMap.get(b.contribuintePrincipalId) || '';
                    return filters.sortOrder === 'asc' ? nomeA.localeCompare(nomeB) : nomeB.localeCompare(nomeA);
                default:
                    valA = new Date(a.dataApresentacao || 0); valB = new Date(b.dataApresentacao || 0);
            }
            return filters.sortOrder === 'asc' ? valA - valB : valB - valA;
        });
        return processados;
    }

    function getStatusBadgeClass(status) {
        switch (status) {
            case 'Em Análise': return 'bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-200';
            case 'Deferido': return 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-200';
            case 'Indeferido': return 'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-200';
            case 'Pendente de Documentação': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-600 dark:text-yellow-100';
            case 'Arquivado': return 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200';
            default: return 'bg-gray-200 text-gray-700 dark:bg-gray-500 dark:text-gray-100';
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

    async function renderGerirRecursosPage() {
        const feedbackAreaId = "feedback-list-recursos";
        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (!mainContentWrapperRef) {
            console.error("RecursosListagens.JS: renderGerirRecursosPage - mainContentWrapperRef não definido.");
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico ao tentar renderizar a lista de recursos.", "error");
            return;
        }
        mainContentWrapperRef.innerHTML = '<p class="loading-text p-4">Carregando lista de recursos...</p>';

        try {
            let todosRecursosDoDB = await dbRef.getAllItems(RECURSOS_STORE_NAME);
            const contribuintesMap = new Map();
            const todosContribuintes = await dbRef.getAllItems(CONTRIBUINTES_STORE_NAME);
            todosContribuintes.forEach(c => contribuintesMap.set(c.id, c.nome || `ID ${c.id.toString().substring(0,8)}`));

            // CORREÇÃO: Utiliza a função centralizada para filtrar itens ativos.
            const recursosAtivos = window.SEFWorkStation.EntityConfig.filterActiveItems(todosRecursosDoDB, RECURSOS_STORE_NAME);
            
            const recursosProcessados = await filterAndSortRecursos(recursosAtivos, currentRecursosFilters);

            let listHtml = `
                <div class="page-section">
                    <div id="${feedbackAreaId}" class="mb-4"></div>
                    <div class="gerir-documentos-toolbar mb-2 flex justify-between items-center"> <h2 class="text-xl font-semibold">Gerir Recursos</h2>
                        <div class="actions-group">
                            <button id="btn-novo-recurso-listagem" class="btn-primary ml-2 text-sm py-1.5 px-3">Novo Recurso</button>
                        </div>
                    </div>

                    <div class="filtros-avancados-recursos p-4 mb-6 border dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800">
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label for="search-recursos-input-avancado" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Buscar por Termo:</label>
                                <input type="search" id="search-recursos-input-avancado" class="form-input-text mt-1 block w-full text-sm" placeholder="Título, número, tipo..." value="${currentRecursosFilters.searchTerm}">
                            </div>
                            <div>
                                <label for="filter-recurso-status" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Status:</label>
                                <select id="filter-recurso-status" class="form-input-text mt-1 block w-full text-sm">
                                    <option value="">Todos</option>
                                    <option value="Em Análise" ${currentRecursosFilters.status === 'Em Análise' ? 'selected' : ''}>Em Análise</option>
                                    <option value="Deferido" ${currentRecursosFilters.status === 'Deferido' ? 'selected' : ''}>Deferido</option>
                                    <option value="Indeferido" ${currentRecursosFilters.status === 'Indeferido' ? 'selected' : ''}>Indeferido</option>
                                    <option value="Pendente de Documentação" ${currentRecursosFilters.status === 'Pendente de Documentação' ? 'selected' : ''}>Pendente de Documentação</option>
                                    <option value="Arquivado" ${currentRecursosFilters.status === 'Arquivado' ? 'selected' : ''}>Arquivado</option>
                                    <option value="Outro" ${currentRecursosFilters.status === 'Outro' ? 'selected' : ''}>Outro</option>
                                </select>
                            </div>
                            <div>
                                <label for="filter-recurso-prioridade" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Prioridade:</label>
                                <select id="filter-recurso-prioridade" class="form-input-text mt-1 block w-full text-sm">
                                    <option value="">Todas</option>
                                    <option value="Urgente" ${currentRecursosFilters.prioridade === 'Urgente' ? 'selected' : ''}>Urgente</option>
                                    <option value="Alta" ${currentRecursosFilters.prioridade === 'Alta' ? 'selected' : ''}>Alta</option>
                                    <option value="Média" ${currentRecursosFilters.prioridade === 'Média' ? 'selected' : ''}>Média</option>
                                    <option value="Baixa" ${currentRecursosFilters.prioridade === 'Baixa' ? 'selected' : ''}>Baixa</option>
                                </select>
                            </div>
                            <div>
                                <label for="filter-recurso-contribuinte" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Contribuinte:</label>
                                <select id="filter-recurso-contribuinte" class="form-input-text mt-1 block w-full text-sm">
                                    <option value="">Todos</option>
                                    ${todosContribuintes.map(c => `<option value="${c.id}" ${currentRecursosFilters.contribuinteId === c.id ? 'selected' : ''}>${c.nome} (${c.numeroIdentificacao || c.cpfCnpj || 'ID ' + c.id.toString().substring(0,8)})</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="mt-4 flex justify-end">
                            <button id="btn-limpar-filtros-recursos" class="btn-secondary text-sm py-1.5 px-3 mr-2">Limpar Filtros</button>
                            <button id="btn-aplicar-filtros-recursos" class="btn-primary text-sm py-1.5 px-3">Aplicar Filtros</button>
                        </div>
                    </div>
            `;

            if (recursosProcessados.length === 0) {
                listHtml += `<p class="text-center text-gray-500 dark:text-gray-400 py-8">
                    ${Object.values(currentRecursosFilters).some(v => v && v !== currentRecursosFilters.sortField && v !== currentRecursosFilters.sortOrder) ? 'Nenhum recurso encontrado com os filtros aplicados.' : 'Nenhum recurso cadastrado ainda.'}
                </p>`;
            } else {
                const tableRows = await Promise.all(recursosProcessados.map(async recurso => {
                    const nomeContribuinte = recurso.contribuintePrincipalId ? (contribuintesMap.get(recurso.contribuintePrincipalId) || 'N/D') : 'N/D';
                    const dataLimiteFormatada = recurso.dataLimiteResposta ? new Date(recurso.dataLimiteResposta + 'T00:00:00').toLocaleDateString() : 'N/A';
                    const isPrazoVencido = recurso.dataLimiteResposta && new Date(recurso.dataLimiteResposta) < new Date() && !['Deferido', 'Indeferido', 'Arquivado'].includes(recurso.status);
                    const isPrazoProximo = recurso.dataLimiteResposta && !isPrazoVencido && (new Date(recurso.dataLimiteResposta) - new Date()) / (1000 * 60 * 60 * 24) <= 7 && !['Deferido', 'Indeferido', 'Arquivado'].includes(recurso.status);

                    let notasCount = 0;
                    if (recurso.notasRapidasRelacionadasIds && recurso.notasRapidasRelacionadasIds.length > 0) {
                        for (const notaId of recurso.notasRapidasRelacionadasIds) {
                            try {
                                const nota = await dbRef.getItemById(NOTAS_RAPIDAS_STORE_NAME, notaId);
                                if (nota && !nota.isExcluida) {
                                    notasCount++;
                                }
                            } catch (e) {
                                console.warn(`Erro ao buscar nota ID ${notaId} para contagem no recurso ID ${recurso.id}`, e);
                            }
                        }
                    }
                    const notasBadgeHtml = notasCount > 0 ? `<span class="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-200" title="${notasCount} nota(s) rápida(s) vinculada(s)">${notasCount} <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" class="bi bi-sticky-fill ml-1" viewBox="0 0 16 16"><path d="M2.5 1A1.5 1.5 0 0 0 1 2.5v11A1.5 1.5 0 0 0 2.5 15h6.086a1.5 1.5 0 0 0 1.06-.44l4.915-4.914A1.5 1.5 0 0 0 15 8.586V2.5A1.5 1.5 0 0 0 13.5 1h-11zm6 8.5a1 1 0 0 1 1-1h4.396a.25.25 0 0 1 .177.427l-5.146 5.146a.25.25 0 0 1-.427-.177V9.5z"/></svg></span>` : '';

                    return `
                        <tr data-id="${recurso.id}" data-titulo="${(recurso.titulo || "Sem Título").replace(/"/g, '"')}">
                            <td>
                                <a href="#" class="link-visualizar-recurso font-medium hover:underline" data-id="${recurso.id}">
                                    ${recurso.titulo || "Sem Título"}
                                </a>
                                ${notasBadgeHtml}
                                <span class="block text-xs text-gray-500 dark:text-gray-400">${recurso.numeroIdentificacao || ''}</span>
                            </td>
                            <td>${nomeContribuinte}</td>
                            <td>${recurso.dataApresentacao ? new Date(recurso.dataApresentacao + 'T00:00:00').toLocaleDateString() : 'N/D'}</td>
                            <td class="${isPrazoVencido ? 'text-red-500 dark:text-red-400 font-bold' : (isPrazoProximo ? 'text-orange-500 dark:text-orange-400 font-semibold' : '')}">${dataLimiteFormatada} ${isPrazoVencido ? ' (Vencido!)': (isPrazoProximo ? ' (Próximo!)':'')}</td>
                            <td><span class="px-2 py-0.5 text-xs rounded-full ${getPrioridadeBadgeClass(recurso.prioridade)}">${recurso.prioridade || 'N/D'}</span></td>
                            <td><span class="px-2 py-0.5 text-xs font-medium rounded-full ${getStatusBadgeClass(recurso.status)}">${recurso.status || 'N/D'}</span></td>
                            <td class="actions-cell text-center">
                                <button class="btn-link btn-visualizar-recurso-lista" data-id="${recurso.id}" title="Visualizar">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye-fill inline-block" viewBox="0 0 16 16"><path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/><path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/></svg>
                                </button>
                                <button class="btn-link btn-editar-recurso-lista" data-id="${recurso.id}" title="Editar">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square inline-block" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg>
                                </button>
                                <button class="btn-link btn-excluir-recurso-lista" data-id="${recurso.id}" data-titulo="${(recurso.titulo || "Sem Título").replace(/"/g, '"')}" title="Mover para Lixeira">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash-fill inline-block" viewBox="0 0 16 16"><path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1H2.5zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5zM8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5zm3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0z"/></svg>
                                </button>
                            </td>
                        </tr>
                    `;
                }));

                listHtml += `
                    <div class="table-list-container">
                        <table class="documentos-table">
                            <thead>
                                <tr>
                                    <th data-sort="titulo" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700">Título <span class="sort-arrow"></span></th>
                                    <th data-sort="contribuintePrincipalId" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700">Contribuinte <span class="sort-arrow"></span></th>
                                    <th data-sort="dataApresentacao" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700">Data Apres. <span class="sort-arrow"></span></th>
                                    <th data-sort="dataLimiteResposta" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700">Data Limite <span class="sort-arrow"></span></th>
                                    <th data-sort="prioridade" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700">Prioridade <span class="sort-arrow"></span></th>
                                    <th data-sort="status" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700">Status <span class="sort-arrow"></span></th>
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
            updateSortArrowsRecursos();
            addEventListenersToListagemRecursos(document.getElementById(feedbackAreaId));

        } catch (error) {
            console.error("RecursosListagens.JS: Erro ao renderizar página de gestão de recursos:", error);
            mainContentWrapperRef.innerHTML = `<p class="feedback-message error p-4">Erro ao carregar lista de recursos: ${error.message}</p>`;
            if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao carregar recursos: ${error.message}`, "error");
        }
    }

    function updateSortArrowsRecursos() {
        document.querySelectorAll('th[data-sort]').forEach(th => {
            const arrowSpan = th.querySelector('.sort-arrow');
            if (!arrowSpan) return;
            if (th.dataset.sort === currentRecursosFilters.sortField) {
                arrowSpan.textContent = currentRecursosFilters.sortOrder === 'asc' ? ' ▲' : ' ▼';
            } else {
                arrowSpan.textContent = '';
            }
        });
    }

    async function desvincularRecursoDeEntidades(recursoId, recursoOriginal) {
        if (!dbRef || !recursoId || !recursoOriginal) return;

        const entidadesParaDesvincular = [
            { store: DOCUMENTS_STORE_NAME, campo: 'recursosVinculados', ids: recursoOriginal.documentosVinculadosIds || [] },
            { store: CONTRIBUINTES_STORE_NAME, campo: 'recursosRelacionados', ids: [recursoOriginal.contribuintePrincipalId, ...(recursoOriginal.contribuintesVinculadosIds || [])].filter(Boolean) },
            { store: NOTAS_RAPIDAS_STORE_NAME, campo: 'recursosRelacionadosIds', ids: recursoOriginal.notasRapidasRelacionadasIds || [] },
            { store: TAREFAS_STORE_NAME, campo: 'recursosVinculadosIds', ids: recursoOriginal.tarefasVinculadasIds || [] },
            { store: PROTOCOLOS_STORE_NAME, campo: 'recursosVinculadosIds', ids: recursoOriginal.protocolosVinculadosIds || [] },
            { store: PTAS_STORE_NAME, campo: 'recursosVinculadosIds', ids: recursoOriginal.ptasVinculadosIds || [] },
            { store: AUTUACOES_STORE_NAME, campo: 'recursosVinculadosIds', ids: recursoOriginal.autuacoesVinculadasIds || [] }
        ];

        for (const entidade of entidadesParaDesvincular) {
            if (entidade.ids.length > 0) {
                 await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(recursoId, entidade.store, entidade.campo, [], entidade.ids, dbRef);
            }
        }
    }


    function parseIdCorrectly(idString) {
        const numericId = parseInt(idString);
        if (!isNaN(numericId) && numericId.toString() === idString) {
            return numericId;
        }
        return idString; 
    }


    function addEventListenersToListagemRecursos(feedbackDisplayArea) {
        document.getElementById('btn-novo-recurso-listagem').addEventListener('click', () => {
            if (recursosFormModuleRef && recursosFormModuleRef.renderNovoRecursoForm) {
                recursosFormModuleRef.renderNovoRecursoForm(null, 'gerir-recursos');
            } else {
                if (globalShowFeedbackRef && feedbackDisplayArea) globalShowFeedbackRef("Erro: Módulo de formulário de recursos não encontrado.", "error", feedbackDisplayArea);
            }
        });

        const searchInputAvancado = document.getElementById('search-recursos-input-avancado');
        const statusFilterSelect = document.getElementById('filter-recurso-status');
        const prioridadeFilterSelect = document.getElementById('filter-recurso-prioridade');
        const contribuinteFilterSelect = document.getElementById('filter-recurso-contribuinte');
        const btnAplicarFiltros = document.getElementById('btn-aplicar-filtros-recursos');
        const btnLimparFiltros = document.getElementById('btn-limpar-filtros-recursos');

        if (btnAplicarFiltros) {
            btnAplicarFiltros.addEventListener('click', () => {
                currentRecursosFilters.searchTerm = searchInputAvancado.value;
                currentRecursosFilters.status = statusFilterSelect.value;
                currentRecursosFilters.prioridade = prioridadeFilterSelect.value;
                currentRecursosFilters.contribuinteId = contribuinteFilterSelect.value;
                renderGerirRecursosPage();
            });
        }
        if (searchInputAvancado) {
             searchInputAvancado.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    currentRecursosFilters.searchTerm = searchInputAvancado.value;
                    renderGerirRecursosPage();
                }
            });
        }

        if (btnLimparFiltros) {
            btnLimparFiltros.addEventListener('click', () => {
                currentRecursosFilters.searchTerm = '';
                currentRecursosFilters.status = '';
                currentRecursosFilters.prioridade = '';
                currentRecursosFilters.contribuinteId = '';
                if(searchInputAvancado) searchInputAvancado.value = '';
                if(statusFilterSelect) statusFilterSelect.value = '';
                if(prioridadeFilterSelect) prioridadeFilterSelect.value = '';
                if(contribuinteFilterSelect) contribuinteFilterSelect.value = '';
                renderGerirRecursosPage();
            });
        }

        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const field = th.dataset.sort;
                if (currentRecursosFilters.sortField === field) {
                    currentRecursosFilters.sortOrder = currentRecursosFilters.sortOrder === 'asc' ? 'desc' : 'asc';
                } else {
                    currentRecursosFilters.sortField = field;
                    currentRecursosFilters.sortOrder = 'asc';
                }
                renderGerirRecursosPage();
            });
        });

        mainContentWrapperRef.querySelectorAll('.documentos-table tbody tr').forEach(row => {
            row.addEventListener('contextmenu', (event) => {
                event.preventDefault();
                const recursoId = parseIdCorrectly(row.dataset.id);
                const recursoTitulo = row.dataset.titulo;

                const menuItems = [
                    { label: 'Visualizar', action: () => recursosViewModuleRef.renderVisualizarRecursoPage(recursoId, 'gerir-recursos') },
                    { label: 'Editar', action: async () => {
                        const recurso = await dbRef.getItemById(RECURSOS_STORE_NAME, recursoId);
                        if(recurso) recursosFormModuleRef.renderNovoRecursoForm(recurso, 'gerir-recursos');
                    }},
                    { isSeparator: true },
                    { label: 'Mover para Lixeira', action: async () => {
                        if (await uiModuleRef.showConfirmationModal('Mover para Lixeira', `Tem certeza que deseja mover o recurso "${recursoTitulo}" para a lixeira?`)) {
                             try {
                                const recurso = await dbRef.getItemById(RECURSOS_STORE_NAME, recursoId);
                                if (recurso) {
                                    recurso.isDeleted = true;
                                    recurso.modificationDate = new Date().toISOString();
                                    await dbRef.updateItem(RECURSOS_STORE_NAME, recurso);
                                    if (globalShowFeedbackRef) globalShowFeedbackRef(`Recurso "${recursoTitulo}" movido para a lixeira.`, "success");
                                    if (refreshApplicationStateRef) await refreshApplicationStateRef();
                                    renderGerirRecursosPage();
                                }
                            } catch (error) {
                                console.error("RecursosListagens.JS: Erro ao mover recurso para a lixeira:", error);
                                if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao mover recurso: ${error.message}`, "error");
                            }
                        }
                    }}
                ];

                if (uiModuleRef && uiModuleRef.showContextMenu) {
                    uiModuleRef.showContextMenu(event.currentTarget, menuItems);
                }
            });
        });

        mainContentWrapperRef.querySelectorAll('.btn-visualizar-recurso-lista').forEach(button => {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                const recursoId = parseIdCorrectly(event.currentTarget.dataset.id);
                if (recursosViewModuleRef && recursosViewModuleRef.renderVisualizarRecursoPage) {
                    recursosViewModuleRef.renderVisualizarRecursoPage(recursoId, 'gerir-recursos');
                } else {
                     if (globalShowFeedbackRef && feedbackDisplayArea) globalShowFeedbackRef("Erro: Módulo de visualização de recursos não encontrado.", "error", feedbackDisplayArea);
                }
            });
        });

        mainContentWrapperRef.querySelectorAll('.btn-editar-recurso-lista').forEach(button => {
            button.addEventListener('click', async (event) => {
                const recursoId = parseIdCorrectly(event.currentTarget.dataset.id);
                try {
                    const recurso = await dbRef.getItemById(RECURSOS_STORE_NAME, recursoId);
                    if (recurso && recursosFormModuleRef && recursosFormModuleRef.renderNovoRecursoForm) {
                        recursosFormModuleRef.renderNovoRecursoForm(recurso, 'gerir-recursos');
                    } else {
                        if (globalShowFeedbackRef && feedbackDisplayArea) globalShowFeedbackRef("Recurso não encontrado para edição ou módulo de formulário indisponível.", "error", feedbackDisplayArea);
                    }
                } catch (error) {
                    console.error("RecursosListagens.JS: Erro ao buscar recurso para edição:", error);
                    if (globalShowFeedbackRef && feedbackDisplayArea) globalShowFeedbackRef("Erro ao carregar dados do recurso para edição.", "error", feedbackDisplayArea);
                }
            });
        });

        mainContentWrapperRef.querySelectorAll('.btn-excluir-recurso-lista').forEach(button => {
            button.addEventListener('click', async (event) => {
                const recursoId = parseIdCorrectly(event.currentTarget.dataset.id);
                const recursoTitulo = event.currentTarget.dataset.titulo;

                if (confirm(`Tem certeza que deseja mover o recurso "${recursoTitulo}" para a lixeira?`)) {
                    try {
                        const recurso = await dbRef.getItemById(RECURSOS_STORE_NAME, recursoId);
                        if (recurso) {
                            recurso.isDeleted = true;
                            recurso.modificationDate = new Date().toISOString();
                            await dbRef.updateItem(RECURSOS_STORE_NAME, recurso);
                            
                            if (globalShowFeedbackRef) globalShowFeedbackRef(`Recurso "${recursoTitulo}" movido para a lixeira.`, "success", feedbackDisplayArea);
                            if (refreshApplicationStateRef) await refreshApplicationStateRef();
                            renderGerirRecursosPage();
                        } else {
                             if (globalShowFeedbackRef) globalShowFeedbackRef(`Recurso "${recursoTitulo}" não encontrado.`, "error", feedbackDisplayArea);
                        }
                    } catch (error) {
                        console.error("RecursosListagens.JS: Erro ao mover recurso para a lixeira:", error);
                        if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao mover recurso para a lixeira: ${error.message}`, "error", feedbackDisplayArea);
                    }
                }
            });
        });
    }

    return {
        init,
        renderGerirRecursosPage,
        desvincularRecursoDeEntidades
    };
})();