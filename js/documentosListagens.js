// js/documentosListagens.js - Lógica para Renderização de Listagens de Documentos e Ações em Lote
// v8.3.0 - CORREÇÃO: Botões de navegação Próximo/Anterior na visualização de documentos não funcionavam por falta de cache da lista de IDs.
// v8.2.1 - CORREÇÃO: Remove a linha do documento da tabela imediatamente após a exclusão para feedback visual instantâneo.
// v8.2.0 - Filtra versões arquivadas das listagens principais.
// v8.1.0 - Adiciona menu de contexto (botão direito) nas linhas da listagem.
// v8.0.0 - Remove renderSearchResultsPage, que foi substituída pela Busca Global.
// (Histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.DocumentosListagens = (function() {
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let globalIrParaHomeRef;
    let refreshApplicationStateRef;
    let dbRef;
    let documentosFormModuleRef;
    let documentosViewModuleRef;
    let uiModuleRef;
    let configuracoesModuleRef;
    let docsPrincipalModuleRef; // Referência ao módulo principal de documentos

    const DOCUMENTS_STORE_NAME = 'documents';
    const CONTRIBUINTES_STORE_NAME = 'contribuintes';
    const RECURSOS_STORE_NAME = 'recursos';
    const NOTAS_RAPIDAS_STORE_NAME = 'notasRapidasStore';
    const TAREFAS_STORE_NAME = 'tarefasStore';
    const PROTOCOLOS_STORE_NAME = 'protocolosStore';
    const PTAS_STORE_NAME = 'ptasStore';
    const AUTUACOES_STORE_NAME = 'autuacoesStore';


    let currentEscListener = null;

    /**
     * Inicializa o módulo de Listagens de Documentos.
     */
    function init(mainWrapper, showFeedbackFunc, clearFeedbackFunc, irParaHomeFunc, refreshFunc, dbModuleRef, formModuleRef, viewModuleRef, docsPrincipalRef, uiRef) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedbackFunc;
        globalClearFeedbackRef = clearFeedbackFunc;
        globalIrParaHomeRef = irParaHomeFunc;
        refreshApplicationStateRef = refreshFunc;
        dbRef = dbModuleRef;
        documentosFormModuleRef = formModuleRef;
        documentosViewModuleRef = viewModuleRef;
        docsPrincipalModuleRef = docsPrincipalRef; // Armazena a referência
        uiModuleRef = uiRef;
        configuracoesModuleRef = SEFWorkStation.Configuracoes;

        if (!dbRef) console.error("DocumentosListagens.JS: init - Referência ao DB não fornecida!");
        if (!mainContentWrapperRef) console.error("DocumentosListagens.JS: init - mainContentWrapperRef não fornecido.");
        if (!configuracoesModuleRef) console.warn("DocumentosListagens.JS: init - Módulo de Configurações não encontrado. Visibilidade de colunas usará padrão.");
        console.log("DocumentosListagens.JS: Módulo inicializado (v8.3.0).");
    }

    /**
     * Atualiza o cache de IDs de documentos no módulo principal.
     */
    function cacheRenderedDocIds(documentos, originatingView) {
        if (docsPrincipalModuleRef && typeof docsPrincipalModuleRef.updateLastRenderedDocListIds === 'function' && typeof docsPrincipalModuleRef.setLastRenderedOriginatingView === 'function') {
            const ids = documentos.map(d => String(d.id));
            docsPrincipalModuleRef.updateLastRenderedDocListIds(ids);
            docsPrincipalModuleRef.setLastRenderedOriginatingView(originatingView);
        }
    }


    /**
     * Renderiza a página para gerenciar (listar) todos os documentos.
     * @param {Array<object>} documentos - Lista de documentos a serem exibidos.
     * @param {object} activeFilters - Filtros ativos para referência.
     */
    async function renderGerirDocumentosPage(documentos, activeFilters) {
        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (!mainContentWrapperRef) {
            console.error("DocumentosListagens.JS: renderGerirDocumentosPage - mainContentWrapperRef não definido.");
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico ao tentar renderizar a lista de documentos.", "error");
            return;
        }
        mainContentWrapperRef.innerHTML = '<p class="loading-text p-4">Carregando lista de documentos...</p>';

        const documentosAtivos = documentos.filter(doc => !doc.isArchivedVersion);
        
        // Cacheia os IDs dos documentos que serão renderizados
        cacheRenderedDocIds(documentosAtivos, 'gerir');

        let docColVisibility = (SEFWorkStation.Configuracoes && SEFWorkStation.Configuracoes.DEFAULT_DOCUMENT_COLUMN_VISIBILITY)
                                ? { ...SEFWorkStation.Configuracoes.DEFAULT_DOCUMENT_COLUMN_VISIBILITY }
                                : { tipo: true, categoriasTags: true, modificadoEm: true }; 

        if (configuracoesModuleRef && typeof configuracoesModuleRef.carregarUserPreferences === 'function') {
            const userPrefs = configuracoesModuleRef.carregarUserPreferences();
            if (userPrefs && userPrefs.documentColumnVisibility) {
                docColVisibility = { ...docColVisibility, ...userPrefs.documentColumnVisibility };
            }
        }


        const feedbackAreaId = "feedback-gerir-documentos";
        
        let listHtml = `
            <div>
                <div id="${feedbackAreaId}" class="mb-4"></div>
                <div class="gerir-documentos-toolbar mb-6">
                    <h2 class="text-xl font-semibold">Gerir Documentos</h2>
                    <div class="actions-group">
                        <button id="btn-novo-documento-listagem" class="btn-primary">Novo Documento</button>
                        <button id="btn-acoes-em-lote" class="btn-secondary ml-2">Ações em Lote</button>
                    </div>
                </div>
        `;

        if (!documentosAtivos || documentosAtivos.length === 0) {
            listHtml += `<p class="text-center text-gray-500 dark:text-gray-400 py-8">
                ${activeFilters && (activeFilters.searchTerm || activeFilters.tipo || activeFilters.categoria || activeFilters.tag) ?
                'Nenhum documento encontrado com os filtros aplicados.' :
                'Nenhum documento cadastrado ainda.'}
            </p>`;
        } else {
            const tableRows = await Promise.all(documentosAtivos.map(async doc => {
                 if (doc.isTemplate) return '';

                const modificationDate = new Date(doc.modificationDate || doc.creationDate);
                const formattedDate = modificationDate.toLocaleDateString() + ' ' + modificationDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                let flagsHtml = '';
                if (doc.isFavorite) {
                    flagsHtml += '<span class="doc-flag favorito-flag" title="Favorito">⭐</span> ';
                }

                let notasCount = 0;
                if (doc.notasRapidasRelacionadasIds && doc.notasRapidasRelacionadasIds.length > 0) {
                    for (const notaId of doc.notasRapidasRelacionadasIds) {
                        try {
                            const nota = await dbRef.getItemById(NOTAS_RAPIDAS_STORE_NAME, notaId);
                            if (nota && !nota.isExcluida) {
                                notasCount++;
                            }
                        } catch (e) {
                            console.warn(`Erro ao buscar nota ID ${notaId} para contagem no documento ID ${doc.id}`, e);
                        }
                    }
                }
                const notasBadgeHtml = notasCount > 0 ? `<span class="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-200" title="${notasCount} nota(s) rápida(s) vinculada(s)">${notasCount} <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" class="bi bi-sticky-fill ml-1" viewBox="0 0 16 16"><path d="M2.5 1A1.5 1.5 0 0 0 1 2.5v11A1.5 1.5 0 0 0 2.5 15h6.086a1.5 1.5 0 0 0 1.06-.44l4.915-4.914A1.5 1.5 0 0 0 15 8.586V2.5A1.5 1.5 0 0 0 13.5 1h-11zm6 8.5a1 1 0 0 1 1-1h4.396a.25.25 0 0 1 .177.427l-5.146 5.146a.25.25 0 0 1-.427-.177V9.5z"/></svg></span>` : '';

                return `
                    <tr data-id="${doc.id}" data-title="${(doc.title || "Sem Título").replace(/"/g, '"')}">
                        <td class="text-center"><input type="checkbox" class="checkbox-item-documento" data-id="${doc.id}"></td>
                        <td>
                            ${flagsHtml}
                            <a href="#" class="link-visualizar-doc font-medium hover:underline" data-doc-id="${doc.id}">${doc.title || "Sem Título"}</a>
                            ${notasBadgeHtml}
                            ${doc.reference ? `<span class="block text-xs text-gray-500 dark:text-gray-400">${doc.reference}</span>` : ''}
                        </td>
                        ${docColVisibility.tipo ? `<td>${doc.docType || 'N/D'}</td>` : ''}
                        ${docColVisibility.categoriasTags ? `<td>
                            <div class="tags-categories-cell">
                                ${doc.categories && doc.categories.map(cat => `<span class="doc-category-tag-list">${cat.split('/').pop().trim()}</span>`).join('')}
                                ${doc.tags && doc.tags.map(tag => `<span class="doc-tag-list">${tag}</span>`).join('')}
                            </div>
                        </td>` : ''}
                        ${docColVisibility.modificadoEm ? `<td>${formattedDate}</td>` : ''}
                        <td class="actions-cell text-center">
                            <button class="btn-link btn-visualizar-doc" data-id="${doc.id}" title="Visualizar">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye-fill inline-block" viewBox="0 0 16 16"><path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/><path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/></svg>
                            </button>
                            <button class="btn-link btn-editar-doc" data-id="${doc.id}" title="Editar">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square inline-block" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg>
                            </button>
                            <button class="btn-link btn-excluir-doc" data-id="${doc.id}" data-title="${(doc.title || "Sem Título").replace(/"/g, '"')}" title="Mover para Lixeira">
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
                                <th class="w-1/12 text-center"><input type="checkbox" id="checkbox-selecionar-todos" title="Selecionar Todos"></th>
                                <th>Título</th>
                                ${docColVisibility.tipo ? '<th class="w-1/6">Tipo</th>' : ''}
                                ${docColVisibility.categoriasTags ? '<th class="w-1/6">Categorias/Tags</th>' : ''}
                                ${docColVisibility.modificadoEm ? '<th class="w-1/6">Modificado em</th>' : ''}
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
        addEventListenersToListagem(document.getElementById(feedbackAreaId), 'gerir');
    }

    async function renderGerenciarModelosPage(todosDocumentos, activeFilters) {
        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (!mainContentWrapperRef) {
            console.error("DocumentosListagens.JS: renderGerenciarModelosPage - mainContentWrapperRef não definido.");
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico ao tentar renderizar a lista de modelos.", "error");
            return;
        }
        mainContentWrapperRef.innerHTML = '<p class="loading-text p-4">Carregando lista de modelos...</p>';
        const feedbackAreaId = "feedback-gerir-modelos";
        
        const modelos = todosDocumentos.filter(doc => doc.isTemplate && !doc.isDeleted && !doc.isArchivedVersion);
        
        // Cacheia os IDs dos modelos que serão renderizados
        cacheRenderedDocIds(modelos, 'modelos');

        let listHtml = `
            <div>
                <div id="${feedbackAreaId}" class="mb-4"></div>
                <div class="gerir-documentos-toolbar mb-6">
                    <h2 class="text-xl font-semibold">Gerenciar Modelos de Documento</h2>
                    <div class="actions-group">
                        <button id="btn-novo-modelo-listagem" class="btn-primary">Criar Novo Modelo</button>
                    </div>
                </div>
        `;

        if (modelos.length === 0) {
            listHtml += '<p class="text-center text-gray-500 dark:text-gray-400 py-8">Nenhum modelo de documento cadastrado ainda.</p>';
        } else {
            const tableRows = await Promise.all(modelos.map(async modelo => {
                const modificationDate = new Date(modelo.modificationDate || modelo.creationDate);
                const formattedDate = modificationDate.toLocaleDateString() + ' ' + modificationDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                let flagsHtml = '';
                 if (modelo.isFavorite) {
                    flagsHtml += '<span class="doc-flag favorito-flag" title="Favorito">⭐</span> ';
                }
                flagsHtml += '<span class="doc-flag modelo-flag" title="Modelo">📄</span> ';

                let notasCount = 0;
                if (modelo.notasRapidasRelacionadasIds && modelo.notasRapidasRelacionadasIds.length > 0) {
                     for (const notaId of modelo.notasRapidasRelacionadasIds) {
                        try {
                            const nota = await dbRef.getItemById(NOTAS_RAPIDAS_STORE_NAME, notaId);
                            if (nota && !nota.isExcluida) {
                                notasCount++;
                            }
                        } catch (e) {
                            console.warn(`Erro ao buscar nota ID ${notaId} para contagem no modelo ID ${modelo.id}`, e);
                        }
                    }
                }
                const notasBadgeHtml = notasCount > 0 ? `<span class="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-200" title="${notasCount} nota(s) rápida(s) vinculada(s)">${notasCount} <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" class="bi bi-sticky-fill ml-1" viewBox="0 0 16 16"><path d="M2.5 1A1.5 1.5 0 0 0 1 2.5v11A1.5 1.5 0 0 0 2.5 15h6.086a1.5 1.5 0 0 0 1.06-.44l4.915-4.914A1.5 1.5 0 0 0 15 8.586V2.5A1.5 1.5 0 0 0 13.5 1h-11zm6 8.5a1 1 0 0 1 1-1h4.396a.25.25 0 0 1 .177.427l-5.146 5.146a.25.25 0 0 1-.427-.177V9.5z"/></svg></span>` : '';

                return `
                    <tr data-id="${modelo.id}" data-title="${(modelo.title || "Modelo Sem Título").replace(/"/g, '"')}">
                        <td>
                            ${flagsHtml}
                            <a href="#" class="link-visualizar-doc font-medium hover:underline" data-doc-id="${modelo.id}">${modelo.title || "Modelo Sem Título"}</a>
                            ${notasBadgeHtml}
                            ${modelo.reference ? `<span class="block text-xs text-gray-500 dark:text-gray-400">${modelo.reference}</span>` : ''}
                        </td>
                        <td>${modelo.docType || 'N/D'}</td>
                        <td>${formattedDate}</td>
                        <td class="actions-cell text-center">
                            <button class="btn-primary btn-usar-modelo text-xs py-1 px-2 rounded mr-1" data-id="${modelo.id}" title="Usar este Modelo">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-file-earmark-plus-fill inline-block mr-1" viewBox="0 0 16 16"><path d="M9.293 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.707A1 1 0 0 0 13.707 4L10 .293A1 1 0 0 0 9.293 0zM9.5 3.5v-2l3 3h-2a1 1 0 0 1-1-1zM8.5 7v1.5H10a.5.5 0 0 1 0 1H8.5V11a.5.5 0 0 1-1 0V9.5H6a.5.5 0 0 1 0-1h1.5V7a.5.5 0 0 1 1 0z"/></svg>
                                Usar
                            </button>
                            <button class="btn-link btn-visualizar-doc" data-id="${modelo.id}" title="Visualizar Modelo">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye-fill inline-block" viewBox="0 0 16 16"><path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/><path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/></svg>
                            </button>
                            <button class="btn-link btn-editar-doc" data-id="${modelo.id}" title="Editar Modelo">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square inline-block" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg>
                            </button>
                            <button class="btn-link btn-excluir-doc" data-id="${modelo.id}" data-title="${(modelo.title || "Modelo Sem Título").replace(/"/g, '"')}" title="Mover Modelo para Lixeira">
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
                                <th>Título do Modelo</th>
                                <th class="w-1/5">Tipo</th>
                                <th class="w-1/5">Modificado em</th>
                                <th class="w-1/4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody>${tableRows.join('')}</tbody>
                    </table>
                </div>
            `;
        }
        listHtml += '</div>';
        mainContentWrapperRef.innerHTML = listHtml;
        addEventListenersToListagem(document.getElementById(feedbackAreaId), 'modelos');

        document.getElementById('btn-novo-modelo-listagem').addEventListener('click', () => {
            if (documentosFormModuleRef && documentosFormModuleRef.renderNovoDocumentoForm) {
                documentosFormModuleRef.renderNovoDocumentoForm({ isTemplate: true }, 'modelos');
            } else {
                if (globalShowFeedbackRef) globalShowFeedbackRef("Erro: Módulo de formulário não encontrado.", "error", document.getElementById(feedbackAreaId));
            }
        });
    }

    async function renderLixeiraPage(documentosDeletados, activeFilters) {
        if (globalClearFeedbackRef) globalClearFeedbackRef();
         if (!mainContentWrapperRef) {
            console.error("DocumentosListagens.JS: renderLixeiraPage - mainContentWrapperRef não definido.");
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico ao tentar renderizar a lixeira.", "error");
            return;
        }
        mainContentWrapperRef.innerHTML = '<p class="loading-text p-4">Carregando lixeira...</p>';
        const feedbackAreaId = "feedback-lixeira";

        let listHtml = `
            <div>
                <div id="${feedbackAreaId}" class="mb-4"></div>
                <div class="gerir-documentos-toolbar mb-6">
                    <h2 class="text-xl font-semibold">Lixeira de Documentos</h2>
                    ${documentosDeletados.length > 0 ? `
                        <div class="actions-group">
                            <button id="btn-esvaziar-lixeira" class="btn-delete">Esvaziar Lixeira</button>
                        </div>` : ''
                    }
                </div>
        `;

        if (documentosDeletados.length === 0) {
            listHtml += '<p class="text-center text-gray-500 dark:text-gray-400 py-8">A lixeira está vazia.</p>';
        } else {
            const tableRows = await Promise.all(documentosDeletados.map(async doc => {
                const deletionDate = new Date(doc.modificationDate);
                const formattedDate = deletionDate.toLocaleDateString() + ' ' + deletionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                let flagsHtml = '';
                if (doc.isTemplate) {
                    flagsHtml += '<span class="doc-flag modelo-flag" title="Modelo">📄</span> ';
                }
                 if (doc.isFavorite) {
                    flagsHtml += '<span class="doc-flag favorito-flag" title="Favorito">⭐</span> ';
                }

                let notasCount = 0;
                if (doc.notasRapidasRelacionadasIds && doc.notasRapidasRelacionadasIds.length > 0) {
                     for (const notaId of doc.notasRapidasRelacionadasIds) {
                        try {
                            const nota = await dbRef.getItemById(NOTAS_RAPIDAS_STORE_NAME, notaId);
                            if (nota && !nota.isExcluida) { 
                                notasCount++;
                            }
                        } catch (e) { /* Ignora erro na contagem para lixeira */ }
                    }
                }
                const notasBadgeHtml = notasCount > 0 ? `<span class="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200" title="${notasCount} nota(s) rápida(s) ainda referenciada(s)">${notasCount} <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" class="bi bi-sticky-fill ml-1" viewBox="0 0 16 16"><path d="M2.5 1A1.5 1.5 0 0 0 1 2.5v11A1.5 1.5 0 0 0 2.5 15h6.086a1.5 1.5 0 0 0 1.06-.44l4.915-4.914A1.5 1.5 0 0 0 15 8.586V2.5A1.5 1.5 0 0 0 13.5 1h-11zm6 8.5a1 1 0 0 1 1-1h4.396a.25.25 0 0 1 .177.427l-5.146 5.146a.25.25 0 0 1-.427-.177V9.5z"/></svg></span>` : '';

                return `
                    <tr data-id="${doc.id}" data-title="${(doc.title || "Sem Título").replace(/"/g, '"')}">
                        <td>
                            ${flagsHtml}
                            ${doc.title || "Sem Título"}
                            ${notasBadgeHtml}
                            ${doc.reference ? `<span class="block text-xs text-gray-500 dark:text-gray-400">${doc.reference}</span>` : ''}
                        </td>
                        <td>${doc.docType || 'N/D'}</td>
                        <td>${formattedDate}</td>
                        <td class="actions-cell text-center">
                            <button class="btn-secondary btn-restaurar-doc text-xs py-1 px-2 rounded mr-1" data-id="${doc.id}" title="Restaurar Documento">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-arrow-counterclockwise inline-block mr-1" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2v1z"/><path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466z"/></svg>
                                Restaurar
                            </button>
                            <button class="btn-delete btn-excluir-permanente-doc text-xs py-1 px-2 rounded" data-id="${doc.id}" data-title="${(doc.title || "Sem Título").replace(/"/g, '"')}" title="Excluir Permanentemente">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-trash3-fill inline-block mr-1" viewBox="0 0 16 16"><path d="M11 1.5v1h3.5a.5.5 0 0 1 0 1h-.538l-.853 10.66A2 2 0 0 1 11.115 16h-6.23a2 2 0 0 1-1.994-1.84L2.038 3.5H1.5a.5.5 0 0 1 0-1H5v-1A1.5 1.5 0 0 1 6.5 0h3A1.5 1.5 0 0 1 11 1.5Zm-5 0v1h4v-1a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5ZM4.5 5.029l.5 8.5a.5.5 0 1 0 .998-.06l-.5-8.5a.5.5 0 1 0-.998.06Zm6.53-.528a.5.5 0 0 0-.528.47l-.5 8.5a.5.5 0 0 0 .998.058l.5-8.5a.5.5 0 0 0-.47-.528ZM8 4.5a.5.5 0 0 0-.5.5v8.5a.5.5 0 0 0 1 0V5a.5.5 0 0 0-.5-.5Z"/></svg>
                                Excluir Perm.
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
                                <th>Título</th>
                                <th class="w-1/5">Tipo</th>
                                <th class="w-1/5">Excluído em</th>
                                <th class="w-1/4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody>${tableRows.join('')}</tbody>
                    </table>
                </div>
            `;
        }
        listHtml += '</div>';
        mainContentWrapperRef.innerHTML = listHtml;
        addEventListenersToListagem(document.getElementById(feedbackAreaId), 'lixeira');
    }

    async function desvincularDocumentoDeContribuintes(docIdParaDesvincular) {
        if (!dbRef || !docIdParaDesvincular) return;
        try {
            const docOriginal = await dbRef.getItemById(DOCUMENTS_STORE_NAME, docIdParaDesvincular);
            if (docOriginal && docOriginal.relatedContribuintes && docOriginal.relatedContribuintes.length > 0) {
                for (const contribId of docOriginal.relatedContribuintes) {
                    try {
                        const contribuinte = await dbRef.getItemById(CONTRIBUINTES_STORE_NAME, contribId);
                        if (contribuinte && contribuinte.documentosRelacionadosIds && contribuinte.documentosRelacionadosIds.includes(docIdParaDesvincular)) {
                            contribuinte.documentosRelacionadosIds = contribuinte.documentosRelacionadosIds.filter(id => id !== docIdParaDesvincular);
                            contribuinte.modificationDate = new Date().toISOString();
                            await dbRef.updateItem(CONTRIBUINTES_STORE_NAME, contribuinte);
                            console.log(`Documento ${docIdParaDesvincular} desvinculado do contribuinte ${contribId}.`);
                        }
                    } catch (errorDesvinculo) {
                        console.warn(`Erro ao tentar desvincular doc ${docIdParaDesvincular} do contribuinte ${contribId}:`, errorDesvinculo);
                    }
                }
            }
        } catch (error) {
            console.error(`Erro ao buscar documento ${docIdParaDesvincular} para desvinculação de contribuintes:`, error);
        }
    }

    async function desvincularDocumentoDeRecursos(docIdParaDesvincular) {
        if (!dbRef || !docIdParaDesvincular) return;
        try {
            const todosRecursos = await dbRef.getAllItems(RECURSOS_STORE_NAME);
            for (const recurso of todosRecursos) {
                if (recurso.documentosVinculadosIds && recurso.documentosVinculadosIds.includes(docIdParaDesvincular)) {
                    recurso.documentosVinculadosIds = recurso.documentosVinculadosIds.filter(id => id !== docIdParaDesvincular);
                    recurso.modificationDate = new Date().toISOString();
                    await dbRef.updateItem(RECURSOS_STORE_NAME, recurso);
                    console.log(`Documento ${docIdParaDesvincular} desvinculado do recurso ${recurso.id}.`);
                }
            }
        } catch (error) {
            console.error(`Erro ao desvincular documento ${docIdParaDesvincular} de recursos:`, error);
        }
    }

    async function desvincularNotasDoDocumentoListagem(docId) {
        if (!dbRef || !docId) return;
        try {
            const todasNotas = await dbRef.getAllItems(NOTAS_RAPIDAS_STORE_NAME);
            for (const nota of todasNotas) {
                if (nota.documentosRelacionadosIds && nota.documentosRelacionadosIds.includes(docId)) {
                    nota.documentosRelacionadosIds = nota.documentosRelacionadosIds.filter(id => id !== docId);
                    nota.dataModificacao = new Date().toISOString();
                    await dbRef.updateItem(NOTAS_RAPIDAS_STORE_NAME, nota);
                }
            }
        } catch (error) {
            console.error(`Erro ao tentar desvincular notas do Documento ID ${docId} (Listagem):`, error);
        }
    }

    async function desvincularDocumentoDeTarefas(docIdParaDesvincular) {
        if (!dbRef || !docIdParaDesvincular) return;
        try {
            const todasTarefas = await dbRef.getAllItems(TAREFAS_STORE_NAME);
            for (const tarefa of todasTarefas) {
                if (tarefa.documentosVinculadosIds && tarefa.documentosVinculadosIds.includes(docIdParaDesvincular)) {
                    tarefa.documentosVinculadosIds = tarefa.documentosVinculadosIds.filter(id => id !== docIdParaDesvincular);
                    tarefa.dataModificacao = new Date().toISOString();
                    await dbRef.updateItem(TAREFAS_STORE_NAME, tarefa);
                    console.log(`Documento ${docIdParaDesvincular} desvinculado da tarefa ${tarefa.id}.`);
                }
            }
        } catch (error) {
            console.error(`Erro ao desvincular documento ${docIdParaDesvincular} de tarefas:`, error);
        }
    }

    async function desvincularDocumentoDeProcessos(docIdParaDesvincular) {
        if (!dbRef || !docIdParaDesvincular) return;
        const storesProcessos = [
            { store: PROTOCOLOS_STORE_NAME, campo: 'documentosVinculadosIds' },
            { store: PTAS_STORE_NAME, campo: 'documentosVinculadosIds' },
            { store: AUTUACOES_STORE_NAME, campo: 'documentosVinculadosIds' }
        ];

        for (const { store, campo } of storesProcessos) {
            try {
                const todosProcessos = await dbRef.getAllItems(store);
                for (const processo of todosProcessos) {
                    if (processo[campo] && processo[campo].includes(docIdParaDesvincular)) {
                        processo[campo] = processo[campo].filter(id => id !== docIdParaDesvincular);
                        processo.dataModificacao = new Date().toISOString();
                        await dbRef.updateItem(store, processo);
                        console.log(`Documento ${docIdParaDesvincular} desvinculado do processo (${store}) ${processo.id}.`);
                    }
                }
            } catch (error) {
                console.error(`Erro ao desvincular documento ${docIdParaDesvincular} de processos (${store}):`, error);
            }
        }
    }


    function parseDocIdFromDataset(datasetId) {
        const numericId = parseInt(datasetId);
        if (!isNaN(numericId) && numericId.toString() === datasetId) {
            return numericId;
        }
        return datasetId;
    }


    function addEventListenersToListagem(feedbackDisplayArea, currentView) {
        const btnNovoDocumento = document.getElementById('btn-novo-documento-listagem');
        if (btnNovoDocumento) {
            btnNovoDocumento.addEventListener('click', () => {
                if (documentosFormModuleRef && documentosFormModuleRef.renderNovoDocumentoForm) {
                    documentosFormModuleRef.renderNovoDocumentoForm(null, currentView);
                } else {
                    if (globalShowFeedbackRef && feedbackDisplayArea) globalShowFeedbackRef("Erro: Módulo de formulário não encontrado.", "error", feedbackDisplayArea);
                }
            });
        }
        
        const tabela = document.querySelector('.documentos-table');
        if (tabela) {
            tabela.querySelectorAll('tbody tr').forEach(row => {
                row.addEventListener('contextmenu', (event) => {
                    event.preventDefault();
                    const docId = parseDocIdFromDataset(row.dataset.id);
                    const docTitle = row.dataset.title;

                    let menuItems = [];
                    if (currentView === 'lixeira') {
                         menuItems = [
                            { label: 'Restaurar', action: async () => {
                                const doc = await dbRef.getItemById(DOCUMENTS_STORE_NAME, docId);
                                if (doc) {
                                    doc.isDeleted = false;
                                    doc.modificationDate = new Date().toISOString();
                                    await dbRef.updateItem(DOCUMENTS_STORE_NAME, doc);
                                    if (globalShowFeedbackRef) globalShowFeedbackRef(`Documento "${docTitle}" restaurado.`, "success");
                                    if (refreshApplicationStateRef) await refreshApplicationStateRef();
                                }
                            }},
                            { label: 'Excluir Permanentemente', action: async () => {
                                if (await uiModuleRef.showConfirmationModal('Exclusão Permanente', `Excluir permanentemente "${docTitle}"? Esta ação não pode ser desfeita.`)) {
                                     // Lógica de exclusão permanente aqui...
                                    if (globalShowFeedbackRef) globalShowFeedbackRef(`Documento "${docTitle}" excluído permanentemente.`, "success");
                                    if (refreshApplicationStateRef) await refreshApplicationStateRef();
                                }
                            }}
                        ];
                    } else if (currentView === 'modelos') {
                         menuItems = [
                            { label: 'Usar Modelo', action: async () => {
                                const modelo = await dbRef.getItemById(DOCUMENTS_STORE_NAME, docId);
                                if (modelo) documentosFormModuleRef.renderNovoDocumentoForm(modelo, 'modelos', true);
                            }},
                            { label: 'Visualizar', action: () => documentosViewModuleRef.renderVisualizarDocumentoPage(docId, currentView) },
                            { label: 'Editar', action: async () => {
                                const doc = await dbRef.getItemById(DOCUMENTS_STORE_NAME, docId);
                                if (doc) documentosFormModuleRef.renderNovoDocumentoForm(doc, currentView);
                            }},
                            { isSeparator: true },
                            { label: 'Mover para Lixeira', action: async () => {
                                const tr = event.currentTarget; 
                                if (await uiModuleRef.showConfirmationModal('Mover para Lixeira', `Mover o modelo "${docTitle}" para a lixeira?`)) {
                                    const doc = await dbRef.getItemById(DOCUMENTS_STORE_NAME, docId);
                                    if (doc) {
                                        doc.isDeleted = true;
                                        doc.modificationDate = new Date().toISOString();
                                        await dbRef.updateItem(DOCUMENTS_STORE_NAME, doc);
                                        if (globalShowFeedbackRef) globalShowFeedbackRef(`Modelo "${docTitle}" movido para a lixeira.`, "success");
                                        if (tr) {
                                            tr.style.transition = 'opacity 0.3s ease-out';
                                            tr.style.opacity = '0';
                                            setTimeout(() => {
                                                tr.remove();
                                                const tbody = tabela.querySelector('tbody');
                                                if (tbody && tbody.childElementCount === 0) {
                                                    renderGerenciarModelosPage([], SEFWorkStation.State.getActiveFilters());
                                                }
                                            }, 300);
                                        }
                                        const currentDocs = SEFWorkStation.State.getRawDocs();
                                        const updatedDocs = currentDocs.filter(d => d.id !== docId);
                                        SEFWorkStation.State.setRawDocs(updatedDocs);
                                        if(window.SEFWorkStation.App) {
                                            const totalBaseModelosCount = updatedDocs.filter(d => d.isTemplate && !d.isDeleted).length;
                                            const filteredCount = SEFWorkStation.Filtros.filterDocuments(updatedDocs, SEFWorkStation.State.getActiveFilters()).length;
                                            window.SEFWorkStation.App.updateTotalDocumentsDisplay(filteredCount, totalBaseModelosCount, true);
                                            window.SEFWorkStation.App.updateQuickSelectDropdown();
                                        }
                                    }
                                }
                            }}
                        ];
                    } else { // gerir
                         menuItems = [
                            { label: 'Visualizar', action: () => documentosViewModuleRef.renderVisualizarDocumentoPage(docId, currentView) },
                            { label: 'Editar', action: async () => {
                                const doc = await dbRef.getItemById(DOCUMENTS_STORE_NAME, docId);
                                if (doc) documentosFormModuleRef.renderNovoDocumentoForm(doc, currentView);
                            }},
                            { isSeparator: true },
                            { label: 'Mover para Lixeira', action: async () => {
                                const tr = event.currentTarget; 
                                if (await uiModuleRef.showConfirmationModal('Mover para Lixeira', `Mover o documento "${docTitle}" para a lixeira?`)) {
                                    const doc = await dbRef.getItemById(DOCUMENTS_STORE_NAME, docId);
                                    if (doc) {
                                        doc.isDeleted = true;
                                        doc.modificationDate = new Date().toISOString();
                                        await dbRef.updateItem(DOCUMENTS_STORE_NAME, doc);
                                        if (globalShowFeedbackRef) globalShowFeedbackRef(`Documento "${docTitle}" movido para a lixeira.`, "success");
                                        if (tr) {
                                            tr.style.transition = 'opacity 0.3s ease-out';
                                            tr.style.opacity = '0';
                                            setTimeout(() => {
                                                tr.remove();
                                                const tbody = tabela.querySelector('tbody');
                                                if (tbody && tbody.childElementCount === 0) {
                                                    renderGerirDocumentosPage([], SEFWorkStation.State.getActiveFilters());
                                                }
                                            }, 300);
                                        }
                                        const currentDocs = SEFWorkStation.State.getRawDocs();
                                        const updatedDocs = currentDocs.filter(d => d.id !== docId);
                                        SEFWorkStation.State.setRawDocs(updatedDocs);
                                        if(window.SEFWorkStation.App) {
                                            const totalBaseDocsCount = updatedDocs.filter(d => !d.isDeleted && !d.isTemplate).length;
                                            const filteredCount = SEFWorkStation.Filtros.filterDocuments(updatedDocs, SEFWorkStation.State.getActiveFilters()).length;
                                            window.SEFWorkStation.App.updateTotalDocumentsDisplay(filteredCount, totalBaseDocsCount, false);
                                            window.SEFWorkStation.App.updateQuickSelectDropdown();
                                        }
                                    }
                                }
                            }}
                        ];
                    }

                    if (uiModuleRef && uiModuleRef.showContextMenu) {
                        uiModuleRef.showContextMenu(event.currentTarget, menuItems);
                    }
                });
            });
        }


        document.querySelectorAll('.btn-visualizar-doc, .link-visualizar-doc').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const docId = parseDocIdFromDataset(e.currentTarget.dataset.id || e.currentTarget.dataset.docId);
                if (documentosViewModuleRef && documentosViewModuleRef.renderVisualizarDocumentoPage) {
                    documentosViewModuleRef.renderVisualizarDocumentoPage(docId, currentView);
                } else {
                     if (globalShowFeedbackRef && feedbackDisplayArea) globalShowFeedbackRef("Erro: Módulo de visualização não encontrado.", "error", feedbackDisplayArea);
                }
            });
        });

        document.querySelectorAll('.btn-editar-doc').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const docId = parseDocIdFromDataset(e.currentTarget.dataset.id);
                try {
                    const doc = await dbRef.getItemById(DOCUMENTS_STORE_NAME, docId);
                    if (doc && documentosFormModuleRef && documentosFormModuleRef.renderNovoDocumentoForm) {
                        documentosFormModuleRef.renderNovoDocumentoForm(doc, currentView);
                    } else {
                        if (globalShowFeedbackRef && feedbackDisplayArea) globalShowFeedbackRef("Documento não encontrado para edição ou módulo de formulário indisponível.", "error", feedbackDisplayArea);
                    }
                } catch (error) {
                    console.error(`DocumentosListagens.JS: Erro ao buscar doc ${docId} para edição:`, error);
                    if (globalShowFeedbackRef && feedbackDisplayArea) globalShowFeedbackRef("Erro ao carregar dados do documento para edição.", "error", feedbackDisplayArea);
                }
            });
        });

        document.querySelectorAll('.btn-excluir-doc').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const docId = parseDocIdFromDataset(e.currentTarget.dataset.id);
                const docTitle = e.currentTarget.dataset.title;
                const tr = e.currentTarget.closest('tr');

                if (confirm(`Tem certeza que deseja mover o documento "${docTitle}" para a lixeira?`)) {
                    try {
                        const doc = await dbRef.getItemById(DOCUMENTS_STORE_NAME, docId);
                        if (doc) {
                            doc.isDeleted = true;
                            doc.modificationDate = new Date().toISOString();
                            await dbRef.updateItem(DOCUMENTS_STORE_NAME, doc);

                            if (globalShowFeedbackRef && feedbackDisplayArea) {
                                globalShowFeedbackRef(`Documento "${docTitle}" movido para a lixeira.`, "success", feedbackDisplayArea);
                            }

                            if (tr) {
                                tr.style.transition = 'opacity 0.3s ease-out';
                                tr.style.opacity = '0';
                                setTimeout(() => {
                                    tr.remove();
                                    const tabela = document.querySelector('.documentos-table tbody');
                                    if (tabela && tabela.childElementCount === 0) {
                                        renderGerirDocumentosPage([], SEFWorkStation.State.getActiveFilters());
                                    }
                                }, 300);
                            }

                            const currentDocs = SEFWorkStation.State.getRawDocs();
                            const updatedDocs = currentDocs.filter(d => d.id !== docId);
                            SEFWorkStation.State.setRawDocs(updatedDocs);
                            
                            if(window.SEFWorkStation.App) {
                                const activeFilters = SEFWorkStation.State.getActiveFilters();
                                const totalBaseDocsCount = updatedDocs.filter(d => !d.isDeleted && !d.isTemplate).length;
                                const filteredCount = SEFWorkStation.Filtros.filterDocuments(updatedDocs, activeFilters).length;

                                window.SEFWorkStation.App.updateTotalDocumentsDisplay(filteredCount, totalBaseDocsCount, doc.isTemplate);
                                window.SEFWorkStation.App.updateQuickSelectDropdown();
                            }
                        }
                    } catch (error) {
                        console.error(`DocumentosListagens.JS: Erro ao mover doc ${docId} para lixeira:`, error);
                        if (globalShowFeedbackRef && feedbackDisplayArea) globalShowFeedbackRef("Erro ao mover documento para a lixeira.", "error", feedbackDisplayArea);
                    }
                }
            });
        });


        document.querySelectorAll('.btn-usar-modelo').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const modeloId = parseDocIdFromDataset(e.currentTarget.dataset.id);
                try {
                    const modelo = await dbRef.getItemById(DOCUMENTS_STORE_NAME, modeloId);
                    if (modelo && documentosFormModuleRef && documentosFormModuleRef.renderNovoDocumentoForm) {
                        documentosFormModuleRef.renderNovoDocumentoForm(modelo, 'modelos', true);
                    } else {
                        if (globalShowFeedbackRef && feedbackDisplayArea) globalShowFeedbackRef("Modelo não encontrado ou módulo de formulário indisponível.", "error", feedbackDisplayArea);
                    }
                } catch (error) {
                    console.error(`DocumentosListagens.JS: Erro ao buscar modelo ${modeloId} para uso:`, error);
                    if (globalShowFeedbackRef && feedbackDisplayArea) globalShowFeedbackRef("Erro ao carregar dados do modelo.", "error", feedbackDisplayArea);
                }
            });
        });


        if (currentView === 'lixeira') {
            document.querySelectorAll('.btn-restaurar-doc').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const docId = parseDocIdFromDataset(e.currentTarget.dataset.id);
                    try {
                        const doc = await dbRef.getItemById(DOCUMENTS_STORE_NAME, docId);
                        if (doc) {
                            doc.isDeleted = false;
                            doc.modificationDate = new Date().toISOString();
                            await dbRef.updateItem(DOCUMENTS_STORE_NAME, doc);
                            if (globalShowFeedbackRef && feedbackDisplayArea) globalShowFeedbackRef(`Documento "${doc.title || 'ID ' + doc.id}" restaurado.`, "success", feedbackDisplayArea);
                            if (refreshApplicationStateRef) await refreshApplicationStateRef();
                        }
                    } catch (error) {
                        console.error(`DocumentosListagens.JS: Erro ao restaurar doc ${docId}:`, error);
                        if (globalShowFeedbackRef && feedbackDisplayArea) globalShowFeedbackRef("Erro ao restaurar documento.", "error", feedbackDisplayArea);
                    }
                });
            });

            document.querySelectorAll('.btn-excluir-permanente-doc').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const docId = parseDocIdFromDataset(e.currentTarget.dataset.id);
                    const docTitle = e.currentTarget.dataset.title;
                    if (confirm(`EXCLUSÃO PERMANENTE: Tem certeza que deseja excluir permanentemente o documento "${docTitle}"? Esta ação NÃO PODE ser desfeita e os anexos serão apagados.`)) {
                        try {
                            if (window.SEFWorkStation && window.SEFWorkStation.SharedUtils && typeof window.SEFWorkStation.SharedUtils.tryDeleteEntityAttachmentFolder === 'function') {
                               await window.SEFWorkStation.SharedUtils.tryDeleteEntityAttachmentFolder('documents', docId, feedbackDisplayArea);
                            } else {
                                console.warn("SharedUtils.tryDeleteEntityAttachmentFolder não está disponível.");
                            }
                            
                            await desvincularDocumentoDeContribuintes(docId);
                            await desvincularDocumentoDeRecursos(docId); 
                            await desvincularNotasDoDocumentoListagem(docId);
                            await desvincularDocumentoDeTarefas(docId);
                            await desvincularDocumentoDeProcessos(docId);

                            await dbRef.deleteItem(DOCUMENTS_STORE_NAME, docId);
                            if (globalShowFeedbackRef && feedbackDisplayArea) globalShowFeedbackRef(`Documento "${docTitle}" excluído permanentemente.`, "success", feedbackDisplayArea);
                            if (refreshApplicationStateRef) await refreshApplicationStateRef();
                        } catch (error) {
                            console.error(`DocumentosListagens.JS: Erro ao excluir permanentemente doc ${docId}:`, error);
                            if (globalShowFeedbackRef && feedbackDisplayArea) globalShowFeedbackRef("Erro ao excluir documento permanentemente.", "error", feedbackDisplayArea);
                        }
                    }
                });
            });

            const btnEsvaziarLixeira = document.getElementById('btn-esvaziar-lixeira');
            if (btnEsvaziarLixeira) {
                btnEsvaziarLixeira.addEventListener('click', async () => {
                    if (confirm("ESVAZIAR LIXEIRA: Tem certeza que deseja excluir PERMANENTEMENTE TODOS os documentos da lixeira? Esta ação NÃO PODE ser desfeita e os anexos serão apagados.")) {
                        try {
                            const lixeiraDocs = await dbRef.getAllItems(DOCUMENTS_STORE_NAME);
                            const deletados = lixeiraDocs.filter(d => d.isDeleted);
                            let count = 0;
                            for (const doc of deletados) {
                                if (window.SEFWorkStation && window.SEFWorkStation.SharedUtils && typeof window.SEFWorkStation.SharedUtils.tryDeleteEntityAttachmentFolder === 'function') {
                                   await window.SEFWorkStation.SharedUtils.tryDeleteEntityAttachmentFolder('documents', doc.id, feedbackDisplayArea);
                                }
                                await desvincularDocumentoDeContribuintes(doc.id);
                                await desvincularDocumentoDeRecursos(doc.id); 
                                await desvincularNotasDoDocumentoListagem(doc.id);
                                await desvincularDocumentoDeTarefas(doc.id);
                                await desvincularDocumentoDeProcessos(doc.id);

                                await dbRef.deleteItem(DOCUMENTS_STORE_NAME, doc.id);
                                count++;
                            }
                            if (globalShowFeedbackRef && feedbackDisplayArea) globalShowFeedbackRef(`${count} documento(s) excluído(s) permanentemente. Lixeira esvaziada.`, "success", feedbackDisplayArea);
                            if (refreshApplicationStateRef) await refreshApplicationStateRef();
                        } catch (error) {
                            console.error("DocumentosListagens.JS: Erro ao esvaziar lixeira:", error);
                            if (globalShowFeedbackRef && feedbackDisplayArea) globalShowFeedbackRef("Erro ao esvaziar a lixeira.", "error", feedbackDisplayArea);
                        }
                    }
                });
            }
        }

        const btnAcoesEmLote = document.getElementById('btn-acoes-em-lote');
        if (btnAcoesEmLote && currentView !== 'lixeira' && currentView !== 'search') {
            btnAcoesEmLote.addEventListener('click', () => {
                const selecionados = Array.from(document.querySelectorAll('.checkbox-item-documento:checked')).map(cb => parseDocIdFromDataset(cb.dataset.id));
                if (selecionados.length === 0) {
                    if (globalShowFeedbackRef && feedbackDisplayArea) globalShowFeedbackRef("Nenhum documento selecionado para ações em lote.", "info", feedbackDisplayArea);
                    return;
                }
                abrirModalAcoesEmLote(selecionados, feedbackDisplayArea, currentView);
            });

            const checkboxSelecionarTodos = document.getElementById('checkbox-selecionar-todos');
            if (checkboxSelecionarTodos) {
                checkboxSelecionarTodos.addEventListener('change', (e) => {
                    document.querySelectorAll('.checkbox-item-documento').forEach(cb => {
                        cb.checked = e.target.checked;
                    });
                });
            }
        }
    }

    function abrirModalAcoesEmLote(idsSelecionados, feedbackDisplayArea, currentView) {
        if (globalClearFeedbackRef) globalClearFeedbackRef(feedbackDisplayArea);

        const modalId = "modal-acoes-em-lote";
        let modalHtml = `
            <div id="${modalId}" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
                <div class="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-slate-800">
                    <div class="mt-3 text-center">
                        <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100 mb-4">Ações em Lote (${idsSelecionados.length} selecionados)</h3>
                        <div id="feedback-modal-acoes" class="mb-4 text-sm"></div>

                        <div class="mb-4">
                            <label for="acao-lote-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Selecione a Ação:</label>
                            <select id="acao-lote-select" class="form-input-text w-full text-sm">
                                <option value="">-- Escolha uma ação --</option>
                                <option value="excluir">Mover para Lixeira</option>
                                <option value="adicionar_categoria">Adicionar Categoria</option>
                                <option value="remover_categoria">Remover Categoria</option>
                                <option value="adicionar_tag">Adicionar Tag</option>
                                <option value="remover_tag">Remover Tag</option>
                                ${currentView !== 'modelos' ? '<option value="marcar_modelo">Marcar como Modelo</option>' : ''}
                                ${currentView === 'modelos' ? '<option value="desmarcar_modelo">Desmarcar como Modelo</option>' : ''}
                                <option value="marcar_favorito">Marcar como Favorito</option>
                                <option value="desmarcar_favorito">Desmarcar como Favorito</option>
                            </select>
                        </div>

                        <div id="container-valor-acao-lote" class="mb-4 hidden">
                            <label for="valor-acao-lote-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Selecione o Valor:</label>
                            <select id="valor-acao-lote-select" class="form-input-text w-full text-sm"></select>
                            <input type="text" id="valor-acao-lote-input" class="form-input-text w-full text-sm mt-1 hidden" placeholder="Nova tag/categoria...">
                        </div>

                        <div class="items-center px-4 py-3">
                            <button id="btn-executar-acao-lote" class="btn-primary w-full mb-2 text-sm">Executar Ação</button>
                            <button id="btn-cancelar-acao-lote" class="btn-secondary w-full text-sm">Cancelar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modalElement = document.getElementById(modalId);
        const feedbackModal = document.getElementById('feedback-modal-acoes');
        const acaoSelect = document.getElementById('acao-lote-select');
        const containerValor = document.getElementById('container-valor-acao-lote');
        const valorSelect = document.getElementById('valor-acao-lote-select');
        const valorInput = document.getElementById('valor-acao-lote-input');

        const closeFn = () => {
            if (modalElement) modalElement.remove();
            if (currentEscListener) {
                document.removeEventListener('keydown', currentEscListener);
                currentEscListener = null;
            }
        };

        currentEscListener = (event) => { if (event.key === "Escape") closeFn(); };
        document.addEventListener('keydown', currentEscListener);
        document.getElementById('btn-cancelar-acao-lote').addEventListener('click', closeFn);

        acaoSelect.addEventListener('change', async (e) => {
            const acao = e.target.value;
            containerValor.classList.add('hidden');
            valorSelect.classList.add('hidden');
            valorInput.classList.add('hidden');
            valorSelect.innerHTML = '';
            valorInput.value = '';

            if (['adicionar_categoria', 'remover_categoria'].includes(acao)) {
                const categorias = await dbRef.getAllItems(dbRef.STORES.DOCUMENT_CATEGORIES);
                categorias.sort((a, b) => a.name.localeCompare(b.name));
                valorSelect.innerHTML = '<option value="">-- Selecione uma categoria --</option>' + categorias.map(c => `<option value="${c.name}">${c.name.split('/').map(s => s.trim()).join(' › ')}</option>`).join('');
                containerValor.classList.remove('hidden');
                valorSelect.classList.remove('hidden');
            } else if (['adicionar_tag', 'remover_tag'].includes(acao)) {
                const tags = await dbRef.getAllItems(dbRef.STORES.DOCUMENT_TAGS);
                tags.sort((a,b) => a.name.localeCompare(b.name));
                valorSelect.innerHTML = '<option value="">-- Selecione uma tag --</option>' + tags.map(t => `<option value="${t.name}">${t.name}</option>`).join('');
                if (acao === 'adicionar_tag') {
                    valorSelect.innerHTML += '<option value="__nova_tag__">(Criar Nova Tag)</option>';
                }
                containerValor.classList.remove('hidden');
                valorSelect.classList.remove('hidden');
            }
        });

        valorSelect.addEventListener('change', (e) => {
            if (e.target.value === '__nova_tag__') {
                valorInput.classList.remove('hidden');
                valorInput.placeholder = "Nome da nova tag";
                valorInput.focus();
            } else {
                valorInput.classList.add('hidden');
                valorInput.value = '';
            }
        });


        document.getElementById('btn-executar-acao-lote').addEventListener('click', async () => {
            const acao = acaoSelect.value;
            let valor = valorSelect.value === '__nova_tag__' ? valorInput.value.trim() : valorSelect.value;

            if (!acao) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("Nenhuma ação selecionada.", "error", feedbackModal);
                return;
            }
            if ((acao.includes('categoria') || acao.includes('tag')) && !valor && acao !== 'adicionar_tag' && valorSelect.value !== '__nova_tag__') {
                 if (globalShowFeedbackRef) globalShowFeedbackRef("Nenhum valor selecionado para a ação.", "error", feedbackModal);
                return;
            }

            if (acao === 'add_tag' && valorSelect.value === '__nova_tag__' && !valor) {
                 if (globalShowFeedbackRef) globalShowFeedbackRef("Por favor, digite o nome da nova tag.", "error", feedbackModal);
                 return;
            }

            let processedCount = 0;
            let errorCount = 0;

            if (acao === 'add_tag' && valorSelect.value === '__nova_tag__') {
                if (!SEFWorkStation.DocumentosTags || !SEFWorkStation.DocumentosTags.isValidTagName || !SEFWorkStation.DocumentosTags.addTagFromModal) {
                     if (globalShowFeedbackRef) globalShowFeedbackRef("Funcionalidade de tags indisponível para criação no modal.", "error", feedbackModal); return;
                }
                if (!SEFWorkStation.DocumentosTags.isValidTagName(valor)) {
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Nome de tag inválido.", "error", feedbackModal); return;
                }
                try {
                    const tagsExistentes = await dbRef.getAllItems(dbRef.STORES.DOCUMENT_TAGS);
                    if (tagsExistentes.some(t => t.name.toLowerCase() === valor.toLowerCase())) {
                         if (globalShowFeedbackRef) globalShowFeedbackRef(`A tag "${valor}" já existe.`, "info", feedbackModal);
                    } else {
                        await dbRef.addItem(dbRef.STORES.DOCUMENT_TAGS, { name: valor });
                        if (globalShowFeedbackRef) globalShowFeedbackRef(`Nova tag "${valor}" criada.`, "success", feedbackModal);
                        if (refreshApplicationStateRef) await refreshApplicationStateRef();
                    }
                } catch (tagError) {
                     if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao criar nova tag: ${tagError.message}`, "error", feedbackModal); return;
                }
            }

            for (const id of idsSelecionados) {
                try {
                    const doc = await dbRef.getItemById(DOCUMENTS_STORE_NAME, id);
                    if (!doc) continue;

                    let changed = false;
                    switch (acao) {
                        case 'excluir':
                            doc.isDeleted = true; changed = true;
                            break;
                        case 'adicionar_categoria':
                            if (!doc.categories) doc.categories = [];
                            if (!doc.categories.includes(valor)) { doc.categories.push(valor); changed = true; }
                            break;
                        case 'remover_categoria':
                            if (doc.categories && doc.categories.includes(valor)) {
                                doc.categories = doc.categories.filter(c => c !== valor); changed = true;
                            }
                            break;
                        case 'adicionar_tag':
                            if (!doc.tags) doc.tags = [];
                            if (!doc.tags.includes(valor)) { doc.tags.push(valor); changed = true; }
                            break;
                        case 'remover_tag':
                            if (doc.tags && doc.tags.includes(valor)) {
                                doc.tags = doc.tags.filter(t => t !== valor); changed = true;
                            }
                            break;
                        case 'marcar_modelo':
                            if (!doc.isTemplate) { doc.isTemplate = true; changed = true; }
                            break;
                        case 'desmarcar_modelo':
                             if (doc.isTemplate) { doc.isTemplate = false; changed = true; }
                            break;
                        case 'marcar_favorito':
                            if (!doc.isFavorite) { doc.isFavorite = true; changed = true; }
                            break;
                        case 'desmarcar_favorito':
                            if (doc.isFavorite) { doc.isFavorite = false; changed = true; }
                            break;
                    }

                    if (changed) {
                        doc.modificationDate = new Date().toISOString();
                        await dbRef.updateItem(DOCUMENTS_STORE_NAME, doc);
                        processedCount++;
                    }
                } catch (err) {
                    console.error(`DocumentosListagens.JS: Erro ao processar doc ID ${id} em lote:`, err);
                    errorCount++;
                }
            }
            if (globalShowFeedbackRef) globalShowFeedbackRef(`${processedCount} documento(s) processado(s) com sucesso. ${errorCount > 0 ? errorCount + ' erro(s).' : ''}`, errorCount > 0 ? "warning" : "success", feedbackModal);
            if (processedCount > 0 && refreshApplicationStateRef) {
                await refreshApplicationStateRef();
            }
            if (errorCount === 0) setTimeout(closeFn, 1500);
        });
    }

    return {
        init,
        renderGerirDocumentosPage,
        renderGerenciarModelosPage,
        renderLixeiraPage
    };
})();