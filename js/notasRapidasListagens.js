// js/notasRapidasListagens.js
// v3.5.1 - CORREÇÃO: ReferenceError em `loadAndRenderNotas` devido à variável `isTrashView` fora de escopo. Usa `currentFilters.isExcluida` para a lógica correta.
// v3.5.0 - REFATORADO: Utiliza EntityConfig.filterActiveItems para filtrar a lista principal, corrigindo o bug de versionamento.
// v3.4.2 - CORRIGIDO: Erro de referência 'listHtml is not defined' na renderização da página.
// ... (histórico anterior)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.NotasRapidasListagens = (function() {
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let navigateToViewCallback;
    let refreshApplicationStateRef;
    let dbRef;
    let appModuleRef;
    let formModuleRef;
    let uiModuleRef;

    const STORE_NAME = 'notasRapidasStore';
    
    let allNotasCache = [];
    let currentFilters = {
        searchTerm: '',
        isFavorita: null,
        isExcluida: false 
    };
    let currentLayout = 'grid'; 
    let selectedNotas = new Set();

    function init(
        mainWrapper, showFeedbackFunc, clearFeedbackFunc, navigateCb,
        refreshFunc, dbModule, appModule, formModule, uiModule
    ) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedbackFunc;
        globalClearFeedbackRef = clearFeedbackFunc;
        navigateToViewCallback = navigateCb;
        refreshApplicationStateRef = refreshFunc;
        dbRef = dbModule;
        appModuleRef = appModule;
        formModuleRef = formModule;
        uiModuleRef = uiModule;
        console.log("NotasRapidasListagens.JS: Módulo inicializado (v3.5.1).");
    }

    async function filterAndSortNotas(notas, filters) {
        // A filtragem principal (isDeleted/isArchived) já foi feita em loadAndRenderNotas.
        let processados = [...notas];

        if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase();
            processados = processados.filter(nota => 
                (nota.titulo && nota.titulo.toLowerCase().includes(term)) ||
                (nota.conteudo && nota.conteudo.toLowerCase().includes(term))
            );
        }

        if (filters.isFavorita !== null) {
            processados = processados.filter(nota => nota.isFavorita === filters.isFavorita);
        }
        
        processados.sort((a, b) => new Date(b.dataModificacao) - new Date(a.dataModificacao));
        return processados;
    }

    async function loadAndRenderNotas() {
        try {
            const allItems = await dbRef.getAllItems(STORE_NAME);

            // CORREÇÃO: Usa a variável de estado `currentFilters.isExcluida` em vez de `isTrashView`
            if (currentFilters.isExcluida) {
                // Na lixeira, mostramos tudo que está marcado como excluído, incluindo versões arquivadas de notas que foram excluídas.
                allNotasCache = allItems.filter(nota => nota.isExcluida);
            } else {
                // Na visão normal, filtramos para mostrar apenas os itens ativos (não excluídos, não arquivados)
                allNotasCache = window.SEFWorkStation.EntityConfig.filterActiveItems(allItems, STORE_NAME);
            }
            
            applyFiltersAndRenderNotas();
        } catch (error) {
            console.error("NotasRapidasListagens.JS: Erro ao carregar notas.", error);
            if(globalShowFeedbackRef) globalShowFeedbackRef("Falha ao carregar notas do banco de dados.", "error");
        }
    }

    async function applyFiltersAndRenderNotas() {
        let filteredNotas = await filterAndSortNotas(allNotasCache, currentFilters);

        const container = document.getElementById('notas-rapidas-list-container');
        if (container) {
            if (currentLayout === 'grid') {
                renderGridDeNotas(container, filteredNotas);
            } else {
                renderListaDeNotas(container, filteredNotas);
            }
        }
        updateSelectAllCheckboxState();
    }
    
    function renderGridDeNotas(container, notas) {
        container.className = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'; 
        if (notas.length === 0) {
            container.innerHTML = `<p class="col-span-full text-center text-gray-500 dark:text-gray-400 py-6">${currentFilters.isExcluida ? 'A lixeira está vazia.' : 'Nenhuma nota encontrada.'}</p>`;
            return;
        }
        container.innerHTML = notas.map(nota => renderNotaCard(nota, false)).join('');
        attachCardEventListeners(container);
    }
    
    function renderListaDeNotas(container, notas) {
        container.className = 'space-y-3'; 
        if (notas.length === 0) {
            container.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400 py-6">${currentFilters.isExcluida ? 'A lixeira está vazia.' : 'Nenhuma nota encontrada.'}</p>`;
            return;
        }
        container.innerHTML = notas.map(nota => renderNotaCard(nota, true)).join('');
        attachCardEventListeners(container);
    }

    function isColorDark(hexColor) {
        if (!hexColor || typeof hexColor !== 'string' || hexColor.toLowerCase() === 'transparent' || hexColor.startsWith('rgba')) {
            return document.body.classList.contains('theme-dark');
        }
        let hex = hexColor.replace('#', '');
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        if (hex.length !== 6) return document.body.classList.contains('theme-dark');

        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const luminance = (r * 299 + g * 587 + b * 114) / 1000;
        return luminance < 128;
    }

    function renderNotaCard(nota, isListView = false) {
        const title = nota.titulo || 'Nota sem título';
        
        let conteudoHtml;
        if (typeof showdown !== 'undefined' && typeof showdown.Converter === 'function') {
            const converter = new showdown.Converter({ simplifiedAutoLink: true, strikethrough: true, tables: true, tasklists: true });
            try {
                const contentForShowdown = isListView ? (nota.conteudo || '') : (nota.conteudo ? nota.conteudo.substring(0, 150) + (nota.conteudo.length > 150 ? '...' : '') : '');
                conteudoHtml = converter.makeHtml(contentForShowdown);
            } catch (e) { 
                conteudoHtml = isListView ? (nota.conteudo || '').replace(/\n/g, '<br>') : (nota.conteudo ? nota.conteudo.substring(0, 150) + (nota.conteudo.length > 150 ? '...' : '') : '');
            }
        } else {
             conteudoHtml = isListView ? (nota.conteudo || '').replace(/\n/g, '<br>') : (nota.conteudo ? nota.conteudo.substring(0, 150) + (nota.conteudo.length > 150 ? '...' : '') : '');
        }

        const dataModificacao = new Date(nota.dataModificacao).toLocaleDateString('pt-BR');

        const cardBaseClasses = `nota-card transition-all duration-200 border-2 
            ${selectedNotas.has(nota.id) ? 
                'border-blue-500 ring-2 ring-blue-500 dark:border-blue-400 dark:ring-blue-400' : 
                'border-transparent hover:border-gray-300 dark:hover:border-slate-600'}`;
        
        const layoutSpecificClasses = isListView 
            ? 'flex flex-col sm:flex-row items-start justify-between p-3 rounded-lg shadow-sm w-full bg-white dark:bg-slate-800/80 hover:shadow-md'
            : 'flex flex-col h-full p-3 rounded-lg shadow-md hover:shadow-lg';
        
        const bgColor = isListView ? (document.body.classList.contains('theme-dark') ? 'var(--main-content-bg-dark)' : 'var(--main-content-bg-light)') : (nota.cor || '#FFFFE0'); 
        const textColorClass = isListView ? 'text-gray-800 dark:text-gray-100' : (isColorDark(nota.cor) ? 'text-gray-100' : 'text-gray-800');
        const borderColorClass = isListView ? 'border-gray-200 dark:border-slate-700' : (isColorDark(nota.cor) ? 'border-gray-500/50' : 'border-gray-400/50');

        return `
            <div id="nota-card-${nota.id}" data-nota-id="${nota.id}" 
                 class="${cardBaseClasses} ${layoutSpecificClasses}" 
                 style="background-color: ${bgColor};">
                 
                <div class="flex-grow w-full ${isListView ? 'sm:mr-3' : ''} overflow-hidden"> 
                    <div class="flex justify-between items-start mb-1.5">
                        <h5 class="font-semibold ${isListView ? 'text-base' : 'text-md'} ${textColorClass} break-words cursor-pointer nota-clickable-area" title="${title.replace(/"/g, '"')}">${title}</h5>
                        <div class="flex items-center flex-shrink-0 ml-2"> 
                            ${nota.isFavorita ? '<span class="text-yellow-500 dark:text-yellow-400 text-lg mr-2" title="Favorita">★</span>' : ''}
                            <input type="checkbox" class="form-checkbox nota-select-checkbox rounded text-blue-600 dark:bg-slate-700 dark:border-slate-500" data-nota-id="${nota.id}" ${selectedNotas.has(nota.id) ? 'checked' : ''} onclick="event.stopPropagation();">
                        </div>
                    </div>
                    <div class="text-xs ${textColorClass} mb-2 markdown-content-preview nota-clickable-area ${isListView ? 'prose prose-sm dark:prose-invert max-w-none' : 'max-h-24 overflow-y-auto scrollbar-thin'}">
                        ${conteudoHtml} 
                    </div>
                </div>

                <div class="flex-shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center w-full mt-auto pt-1.5 border-t ${borderColorClass} ${isListView ? 'sm:mt-0 sm:pt-0 sm:border-t-0 sm:pl-3 sm:border-l' : ''}"> 
                    <span class="text-[11px] ${isListView ? 'text-gray-500 dark:text-gray-400 mb-1 sm:mb-0' : (isColorDark(nota.cor) ? 'text-gray-300/80' : 'text-gray-500/90')}">${isListView ? 'Modif. em: ' : ''}${dataModificacao}</span>
                    <div class="relative mt-1 sm:mt-0">
                        <button class="btn-icon btn-context-menu p-0.5 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-300" data-nota-id="${nota.id}" onclick="event.stopPropagation();" title="Mais ações">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/></svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    async function renderNotasRapidasPage(isTrashView = false) {
        currentFilters.isExcluida = isTrashView; 
        
        if (!mainContentWrapperRef) return;
        if (globalClearFeedbackRef) globalClearFeedbackRef();
        selectedNotas.clear(); 
        
        mainContentWrapperRef.innerHTML = '<p class="loading-text p-4">Carregando...</p>';

        let pageHtml = ` 
            <div id="notas-rapidas-container">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-2xl font-semibold">${isTrashView ? 'Lixeira de Notas Rápidas' : 'Notas Rápidas'}</h2>
                    ${!isTrashView ? '<button id="btn-nova-nota-rapida-listagem" class="btn-primary">Nova Nota Rápida</button>' : ''}
                </div>
                
                <div id="feedback-area-notas-rapidas-listagem" class="mb-4"></div>
                
                <div class="flex flex-col md:flex-row justify-between items-center mb-4 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg shadow-sm gap-3">
                    <div class="w-full md:w-1/3">
                        <input type="text" id="search-notas-rapidas" class="form-input-text w-full" placeholder="Pesquisar no título ou conteúdo..." value="${currentFilters.searchTerm}">
                    </div>
                    
                    <div class="flex items-center space-x-4">
                        <label class="flex items-center">
                            <input type="checkbox" id="filter-favoritas-notas" class="form-checkbox" ${currentFilters.isFavorita ? 'checked' : ''}>
                            <span class="ml-2 text-sm">Apenas Favoritas</span>
                        </label>
                        ${!isTrashView 
                            ? `<button id="btn-ver-lixeira-notas" class="btn-secondary btn-sm text-xs">Ver Lixeira</button>`
                            : `<button id="btn-voltar-para-notas" class="btn-secondary btn-sm text-xs">Voltar para Notas</button>`
                        }
                    </div>

                    <div class="flex items-center space-x-2">
                        <span class="text-sm">Exibir como:</span>
                        <button id="btn-layout-grid-notas" class="btn-icon ${currentLayout === 'grid' ? 'bg-blue-200 dark:bg-blue-700' : 'hover:bg-gray-200 dark:hover:bg-slate-700'}" title="Grade">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3A1.5 1.5 0 0 1 15 10.5v3A1.5 1.5 0 0 1 13.5 15h-3A1.5 1.5 0 0 1 9 13.5v-3z"/></svg>
                        </button>
                        <button id="btn-layout-list-notas" class="btn-icon ${currentLayout === 'list' ? 'bg-blue-200 dark:bg-blue-700' : 'hover:bg-gray-200 dark:hover:bg-slate-700'}" title="Lista">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/></svg>
                        </button>
                    </div>
                </div>
                
                <div id="notas-rapidas-actions-bar" class="hidden flex flex-col sm:flex-row justify-between items-center mb-4 p-3 bg-blue-100 dark:bg-blue-800 rounded-lg shadow-md gap-2">
                    <div class="flex items-center">
                        <input type="checkbox" id="checkbox-selecionar-todas-notas" class="form-checkbox mr-3">
                        <span id="notas-selecionadas-count" class="text-sm font-medium text-blue-700 dark:text-blue-200">0 notas selecionadas</span>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        ${!isTrashView ? `
                            <button id="btn-favoritar-notas-selecionadas" class="btn-secondary btn-sm text-xs">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-star-fill inline-block mr-1" viewBox="0 0 16 16"><path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/></svg>
                                Favoritar
                            </button>
                            <button id="btn-desfavoritar-notas-selecionadas" class="btn-secondary btn-sm text-xs">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-star inline-block mr-1" viewBox="0 0 16 16"><path d="M2.866 14.85c-.078.444.36.791.746.593l4.39-2.256 4.389 2.256c.386.198.824-.149.746-.592l-.83-4.73 3.522-3.356c.33-.314.16-.888-.282-.95l-4.898-.696L8.465.792a.513.513 0 0 0-.927 0L5.35 5.12 2.48.835a.5.5 0 0 0-.004-.001zM8 12.027a.5.5 0 0 1 .232.056l3.686 1.894-.694-3.957a.565.565 0 0 1 .162-.505l2.907-2.77-4.052-.576a.525.525 0 0 1-.393-.288L8 2.223l-1.847 3.658a.525.525 0 0 1-.393.288l-4.052.575 2.906 2.77a.565.565 0 0 1 .162.505l-.694 3.957 3.686-1.894A.5.5 0 0 1 8 12.027z"/></svg>
                                Desfavoritar
                            </button>
                            <button id="btn-excluir-notas-selecionadas" class="btn-danger btn-sm text-xs">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-trash3-fill inline-block mr-1" viewBox="0 0 16 16"><path d="M11 1.5v1h3.5a.5.5 0 0 1 0 1h-.538l-.853 10.66A2 2 0 0 1 11.115 16h-6.23a2 2 0 0 1-1.994-1.84L2.038 3.5H1.5a.5.5 0 0 1 0-1H5v-1A1.5 1.5 0 0 1 6.5 0h3A1.5 1.5 0 0 1 11 1.5Zm-5 0v1h4v-1a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5ZM4.5 5.029l.5 8.5a.5.5 0 1 0 .998-.06l-.5-8.5a.5.5 0 1 0-.998.06Zm6.53-.528a.5.5 0 0 0-.528.47l-.5 8.5a.5.5 0 0 0 .998.058l.5-8.5a.5.5 0 0 0-.47-.528ZM8 4.5a.5.5 0 0 0-.5.5v8.5a.5.5 0 0 0 1 0V5a.5.5 0 0 0-.5-.5Z"/></svg>
                                Mover para Lixeira
                            </button>
                        ` : `
                            <button id="btn-restaurar-notas-selecionadas" class="btn-secondary btn-sm text-xs">Restaurar Selecionadas</button>
                            <button id="btn-excluir-perm-notas-selecionadas" class="btn-danger btn-sm text-xs">Excluir Permanentemente</button>
                        `}
                    </div>
                </div>

                <div id="notas-rapidas-list-container">
                    </div>
            </div>
        `;
        
        mainContentWrapperRef.innerHTML = pageHtml;
        await loadAndRenderNotas();
        attachEventListenersNotasRapidas(isTrashView);
        updateSelectionBar();
    }

    async function handleLoteAction(action, ids, feedbackAreaEl, isLixeira) {
        if (!ids || ids.length === 0) return;
        uiModuleRef.showLoading(true, "Processando notas...");
        let successCount = 0, errorCount = 0;

        for (const id of ids) {
            try {
                const nota = await dbRef.getItemById(STORE_NAME, id);
                if (!nota) { errorCount++; continue; }
                let modified = false;

                switch (action) {
                    case 'excluir':
                        if (!nota.isExcluida) {
                            nota.isExcluida = true; modified = true;
                        }
                        break;
                    case 'favoritar':
                        if (!nota.isFavorita) {
                            nota.isFavorita = true; modified = true;
                        }
                        break;
                    case 'desfavoritar':
                        if (nota.isFavorita) {
                            nota.isFavorita = false; modified = true;
                        }
                        break;
                    case 'restaurar':
                        if (nota.isExcluida) {
                            nota.isExcluida = false; modified = true;
                        }
                        break;
                    case 'excluir-perm':
                        if (nota.isExcluida) {
                            if (window.SEFWorkStation.SharedUtils?.tryDeleteEntityAttachmentFolder) {
                                await window.SEFWorkStation.SharedUtils.tryDeleteEntityAttachmentFolder('notasRapidas', nota.id, null, null);
                            }
                            await desvincularNotaRapidaDeEntidades(id, nota);
                            await dbRef.deleteItem(STORE_NAME, id);
                            successCount++;
                        }
                        continue; 
                }

                if (modified) {
                    nota.dataModificacao = new Date().toISOString();
                    await dbRef.updateItem(STORE_NAME, nota);
                    successCount++;
                }

            } catch (e) {
                errorCount++;
                console.error(`Erro ao processar nota ${id} em lote para ação ${action}:`, e);
            }
        }
        uiModuleRef.showLoading(false);
        const actionTextMap = {
            'excluir': 'movida(s) para a lixeira', 'favoritar': 'marcada(s) como favorita',
            'desfavoritar': 'desmarcada(s) como favorita', 'restaurar': 'restaurada(s)', 'excluir-perm': 'excluída(s) permanentemente'
        };
        const message = `${successCount} nota(s) ${actionTextMap[action]}. ${errorCount > 0 ? errorCount + ' erro(s).' : ''}`;
        if(globalShowFeedbackRef) globalShowFeedbackRef(message, errorCount > 0 ? "warning" : "success", feedbackAreaEl);

        if (successCount > 0) {
            if (refreshApplicationStateRef) await refreshApplicationStateRef();
            await renderNotasRapidasPage(isLixeira);
        }
    }
    
    function attachEventListenersNotasRapidas(isTrashView) {
        document.getElementById('btn-nova-nota-rapida-listagem')?.addEventListener('click', () => {
            if(appModuleRef && appModuleRef.handleMenuAction) {
                appModuleRef.handleMenuAction('nova-nota-rapida');
            }
        });
        
        document.getElementById('btn-ver-lixeira-notas')?.addEventListener('click', () => renderNotasRapidasPage(true));
        document.getElementById('btn-voltar-para-notas')?.addEventListener('click', () => renderNotasRapidasPage(false));
        
        const feedbackAreaEl = document.getElementById('feedback-area-notas-rapidas-listagem');
        
        const searchInput = document.getElementById('search-notas-rapidas');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                currentFilters.searchTerm = e.target.value;
                applyFiltersAndRenderNotas();
            });
        }
        
        const favoritasCheckbox = document.getElementById('filter-favoritas-notas');
        if (favoritasCheckbox) {
            favoritasCheckbox.addEventListener('change', (e) => {
                currentFilters.isFavorita = e.target.checked ? true : null;
                applyFiltersAndRenderNotas();
            });
        }

        const btnGrid = document.getElementById('btn-layout-grid-notas');
        const btnList = document.getElementById('btn-layout-list-notas');
        if (btnGrid && btnList) {
            btnGrid.addEventListener('click', () => {
                if (currentLayout !== 'grid') {
                    currentLayout = 'grid';
                    btnGrid.classList.add('bg-blue-200', 'dark:bg-blue-700');
                    btnList.classList.remove('bg-blue-200', 'dark:bg-blue-700');
                    applyFiltersAndRenderNotas();
                }
            });
            btnList.addEventListener('click', () => {
                if (currentLayout !== 'list') {
                    currentLayout = 'list';
                    btnList.classList.add('bg-blue-200', 'dark:bg-blue-700');
                    btnGrid.classList.remove('bg-blue-200', 'dark:bg-blue-700');
                    applyFiltersAndRenderNotas();
                }
            });
        }
        
        const checkboxSelecionarTodas = document.getElementById('checkbox-selecionar-todas-notas');
        if (checkboxSelecionarTodas) {
            checkboxSelecionarTodas.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                document.querySelectorAll('.nota-select-checkbox').forEach(cb => {
                    const notaId = cb.dataset.notaId;
                    if (cb.checked !== isChecked) {
                        cb.checked = isChecked;
                        toggleNotaSelection(notaId);
                    }
                });
            });
        }
        
        document.getElementById('btn-favoritar-notas-selecionadas')?.addEventListener('click', () => handleLoteAction('favoritar', Array.from(selectedNotas), feedbackAreaEl, false));
        document.getElementById('btn-desfavoritar-notas-selecionadas')?.addEventListener('click', () => handleLoteAction('desfavoritar', Array.from(selectedNotas), feedbackAreaEl, false));
        document.getElementById('btn-excluir-notas-selecionadas')?.addEventListener('click', async () => {
            const ids = Array.from(selectedNotas);
            const confirmar = await uiModuleRef.showConfirmationModal('Confirmar Exclusão', `Mover ${ids.length} nota(s) para a lixeira?`);
            if (confirmar) handleLoteAction('excluir', ids, feedbackAreaEl, false);
        });
        document.getElementById('btn-restaurar-notas-selecionadas')?.addEventListener('click', () => handleLoteAction('restaurar', Array.from(selectedNotas), feedbackAreaEl, true));
        document.getElementById('btn-excluir-perm-notas-selecionadas')?.addEventListener('click', async () => {
            const ids = Array.from(selectedNotas);
            const confirmar = await uiModuleRef.showConfirmationModal('Exclusão Permanente', `Excluir permanentemente ${ids.length} nota(s)? Esta ação é irreversível.`);
            if (confirmar) handleLoteAction('excluir-perm', ids, feedbackAreaEl, true);
        });
    }

    function toggleNotaSelection(notaId) {
        const card = document.getElementById(`nota-card-${notaId}`);
        if (selectedNotas.has(notaId)) {
            selectedNotas.delete(notaId);
            if(card) card.classList.remove('border-blue-500', 'ring-2', 'ring-blue-500', 'dark:border-blue-400', 'dark:ring-blue-400');
        } else {
            selectedNotas.add(notaId);
            if(card) card.classList.add('border-blue-500', 'ring-2', 'ring-blue-500', 'dark:border-blue-400', 'dark:ring-blue-400');
        }
        updateSelectionBar();
        updateSelectAllCheckboxState();
    }

    function updateSelectionBar() {
        const bar = document.getElementById('notas-rapidas-actions-bar');
        const countSpan = document.getElementById('notas-selecionadas-count');
        if (bar && countSpan) {
            if (selectedNotas.size > 0) {
                bar.classList.remove('hidden');
                bar.classList.add('flex');
                countSpan.textContent = `${selectedNotas.size} nota(s) selecionada(s)`;
            } else {
                bar.classList.add('hidden');
                bar.classList.remove('flex');
            }
        }
    }

    function updateSelectAllCheckboxState() {
        const checkboxSelecionarTodas = document.getElementById('checkbox-selecionar-todas-notas');
        if (checkboxSelecionarTodas) {
            const totalVisivel = document.querySelectorAll('.nota-card').length; 
            checkboxSelecionarTodas.checked = totalVisivel > 0 && selectedNotas.size === totalVisivel;
            checkboxSelecionarTodas.indeterminate = selectedNotas.size > 0 && selectedNotas.size < totalVisivel;
        }
    }
    
    function attachCardEventListeners(container) {
        container.querySelectorAll('.nota-clickable-area').forEach(area => {
            area.addEventListener('click', (e) => {
                const card = e.currentTarget.closest('.nota-card');
                if (card) {
                    const notaId = card.dataset.notaId;
                    if (navigateToViewCallback) navigateToViewCallback({id: notaId});
                }
            });
        });
    
        container.querySelectorAll('.nota-card').forEach(card => {
            card.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const notaId = card.dataset.notaId;
                const nota = allNotasCache.find(n => n.id === notaId);
                const isLixeira = currentFilters.isExcluida;

                if (!nota) return;

                const menuItems = isLixeira
                    ? [
                        { label: 'Restaurar', action: () => handleLoteAction('restaurar', [notaId], document.getElementById('feedback-area-notas-rapidas-listagem'), true) },
                        { label: 'Excluir Permanentemente', action: async () => {
                            if (await uiModuleRef.showConfirmationModal('Exclusão Permanente', `Excluir permanentemente a nota "${nota.titulo}"? Esta ação é irreversível.`)) {
                                handleLoteAction('excluir-perm', [notaId], document.getElementById('feedback-area-notas-rapidas-listagem'), true);
                            }
                        }}
                    ]
                    : [
                        { label: 'Visualizar', action: () => navigateToViewCallback({id: notaId}) },
                        { label: 'Editar', action: () => { if (appModuleRef.handleMenuAction) appModuleRef.handleMenuAction('editar-nota-rapida', { nota: nota }); } },
                        { label: nota.isFavorita ? 'Desfavoritar' : 'Favoritar', action: () => handleLoteAction(nota.isFavorita ? 'desfavoritar' : 'favoritar', [notaId], document.getElementById('feedback-area-notas-rapidas-listagem'), false) },
                        { isSeparator: true },
                        { label: 'Mover para Lixeira', action: () => handleLoteAction('excluir', [notaId], document.getElementById('feedback-area-notas-rapidas-listagem'), false) }
                    ];
                
                if (uiModuleRef && uiModuleRef.showContextMenu) {
                    uiModuleRef.showContextMenu(e.currentTarget, menuItems);
                }
            });
        });
        
        container.querySelectorAll('.btn-context-menu').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation(); 
                const notaId = e.currentTarget.dataset.notaId;
                const nota = allNotasCache.find(n => n.id === notaId);
                const isLixeira = currentFilters.isExcluida;
                
                if (!nota) return;

                const menuItems = isLixeira ? [
                    { label: 'Restaurar', action: () => handleLoteAction('restaurar', [notaId], document.getElementById('feedback-area-notas-rapidas-listagem'), true) },
                    { label: 'Excluir Permanentemente', action: () => handleLoteAction('excluir-perm', [notaId], document.getElementById('feedback-area-notas-rapidas-listagem'), true) }
                ] : [
                    { label: 'Visualizar', action: () => navigateToViewCallback({id: notaId}) },
                    { label: 'Editar', action: () => { if (appModuleRef.handleMenuAction) appModuleRef.handleMenuAction('editar-nota-rapida', { nota: nota }); } },
                    { label: nota.isFavorita ? 'Desfavoritar' : 'Favoritar', action: () => handleLoteAction(nota.isFavorita ? 'desfavoritar' : 'favoritar', [notaId], document.getElementById('feedback-area-notas-rapidas-listagem'), false) },
                    { isSeparator: true },
                    { label: 'Mover para Lixeira', action: () => handleLoteAction('excluir', [notaId], document.getElementById('feedback-area-notas-rapidas-listagem'), false) }
                ];
                
                if (uiModuleRef && uiModuleRef.showContextMenu) uiModuleRef.showContextMenu(e.currentTarget, menuItems);
            });
        });
    
        container.querySelectorAll('.nota-select-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const notaId = e.target.dataset.notaId;
                toggleNotaSelection(notaId);
            });
        });
    }

    async function desvincularNotaRapidaDeEntidades(notaId, notaOriginal) {
        if (!notaId || !notaOriginal || !dbRef) {
            console.warn("Desvinculação de nota rápida não pôde ser concluída: dados insuficientes.");
            return;
        }

        const storesVinculadas = [
            { store: 'documents', ids: notaOriginal.documentosRelacionadosIds, campo: 'notasRapidasRelacionadasIds' },
            { store: 'contribuintes', ids: notaOriginal.contribuintesRelacionadosIds, campo: 'notasRapidasRelacionadasIds' },
            { store: 'recursos', ids: notaOriginal.recursosRelacionadosIds, campo: 'notasRapidasRelacionadasIds' },
            { store: 'tarefasStore', ids: notaOriginal.tarefasRelacionadasIds, campo: 'notasRapidasRelacionadasIds' },
            { store: 'protocolosStore', ids: notaOriginal.protocolosRelacionadosIds, campo: 'notasRapidasRelacionadasIds' },
            { store: 'ptasStore', ids: notaOriginal.ptasRelacionadosIds, campo: 'notasRapidasRelacionadasIds' },
            { store: 'autuacoesStore', ids: notaOriginal.autuacoesRelacionadasIds, campo: 'notasRapidasRelacionadasIds' },
            { store: 'servidoresStore', ids: notaOriginal.servidoresVinculadosIds, campo: 'notasRapidasVinculadasIds' },
        ];

        for (const vinculo of storesVinculadas) {
            if (vinculo.ids && vinculo.ids.length > 0) {
                for (const idEntidade of vinculo.ids) {
                    try {
                        const entidade = await dbRef.getItemById(vinculo.store, idEntidade);
                        if (entidade && Array.isArray(entidade[vinculo.campo])) {
                            const index = entidade[vinculo.campo].indexOf(notaId);
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
                        console.error(`Erro ao desvincular nota ${notaId} da entidade ${idEntidade} na store ${vinculo.store}:`, error);
                    }
                }
            }
        }
    }


    return {
        init,
        renderNotasRapidasPage
    };
})();