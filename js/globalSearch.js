// js/globalSearch.js - Módulo para exibir resultados da Pesquisa Global
// v1.0.0 - Criação do módulo, com lógica para renderizar resultados agrupados.

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.GlobalSearch = (function() {
    let mainContentWrapperRef;
    let showFeedbackRef;
    let dbRef;
    let appModuleRef;
    let uiModuleRef;

    // Mapeamento de tipo de entidade para um nome amigável
    const ENTITY_TYPE_NAMES = {
        documents: "Documentos",
        contribuintes: "Contribuintes",
        tarefas: "Tarefas",
        notasRapidas: "Notas Rápidas",
        recursos: "Recursos",
        protocolos: "Protocolos",
        ptas: "PTAs",
        autuacoes: "Autuações",
        servidores: "Servidores"
    };

    function init(mainWrapper, showFeedback, db, app, ui) {
        mainContentWrapperRef = mainWrapper;
        showFeedbackRef = showFeedback;
        dbRef = db;
        appModuleRef = app;
        uiModuleRef = ui;
        console.log("GlobalSearch.JS: Módulo inicializado (v1.0.0).");
    }

    /**
     * Renderiza a página unificada de resultados da busca global.
     * @param {string} searchTerm - O termo que foi pesquisado.
     * @param {object} results - Um objeto com os resultados, onde cada chave é um tipo de entidade.
     */
    function renderGlobalSearchResultsPage(searchTerm, results) {
        if (!mainContentWrapperRef) {
            console.error("GlobalSearch.js: Referência ao container principal não encontrada.");
            return;
        }

        let totalResultsCount = 0;
        let resultsHtml = '';

        for (const entityType in results) {
            if (Object.hasOwnProperty.call(results, entityType)) {
                const items = results[entityType];
                totalResultsCount += items.length;
                if (items.length > 0) {
                    resultsHtml += renderResultGroup(entityType, items, searchTerm);
                }
            }
        }

        const pageTitle = `Resultados da Busca Global por: <span class="search-term-highlight">${searchTerm}</span>`;
        const pageSubtitle = `<p class="text-sm text-gray-600 dark:text-gray-400 mb-6">${totalResultsCount} item(ns) encontrado(s) no total.</p>`;
        
        mainContentWrapperRef.innerHTML = `
            <div class="global-search-results-page">
                <h2 class="text-2xl font-bold mb-2">${pageTitle}</h2>
                ${pageSubtitle}
                <div class="space-y-8">
                    ${resultsHtml || '<p class="text-center text-gray-500 dark:text-gray-400 py-8">Nenhum resultado encontrado em nenhuma entidade.</p>'}
                </div>
            </div>
        `;

        addEventListenersToResults();
    }

    /**
     * Renderiza um grupo de resultados para um tipo de entidade específico.
     * @param {string} entityType - A chave do tipo de entidade (ex: 'documentos').
     * @param {Array<object>} items - A lista de itens encontrados para este tipo.
     * @param {string} searchTerm - O termo de busca para destacar.
     * @returns {string} O HTML para o grupo de resultados.
     */
    function renderResultGroup(entityType, items, searchTerm) {
        const groupTitle = ENTITY_TYPE_NAMES[entityType] || entityType.charAt(0).toUpperCase() + entityType.slice(1);
        
        let itemsHtml = items.map(item => renderResultCard(item, entityType, searchTerm)).join('');

        return `
            <div class="search-result-group">
                <h3 class="text-xl font-semibold border-b-2 border-blue-500 pb-2 mb-4 text-gray-800 dark:text-gray-200">
                    ${groupTitle} <span class="text-base font-normal text-gray-500 dark:text-gray-400">(${items.length})</span>
                </h3>
                <ul class="space-y-4">
                    ${itemsHtml}
                </ul>
            </div>
        `;
    }

    /**
     * Renderiza um card individual para um item de resultado.
     * @param {object} item - O objeto do item.
     * @param {string} entityType - A chave do tipo de entidade.
     * @param {string} searchTerm - O termo de busca para destacar.
     * @returns {string} O HTML para o card do resultado.
     */
    function renderResultCard(item, entityType, searchTerm) {
        const highlight = (text) => text ? text.replace(new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), (match) => `<mark class="bg-yellow-300 dark:bg-yellow-500 dark:text-black px-0.5 rounded">${match}</mark>`) : '';

        let title = 'Item sem título';
        let details = [];
        let viewAction = '#';
        let dataAttributes = `data-id="${item.id}"`;

        switch (entityType) {
            case 'documents':
                title = item.title || 'Documento sem título';
                details.push(`Tipo: ${item.docType || 'N/D'}`);
                details.push(`Modificado em: ${new Date(item.modificationDate || item.creationDate).toLocaleDateString()}`);
                viewAction = 'visualizar-documento';
                break;
            case 'contribuintes':
                title = item.nome || 'Contribuinte sem nome';
                details.push(`CPF/CNPJ: ${item.cpfCnpj || 'N/D'}`);
                details.push(`ID Interno: ${item.numeroIdentificacao || 'N/D'}`);
                viewAction = 'visualizar-contribuinte';
                break;
            case 'tarefas':
                title = item.titulo || 'Tarefa sem título';
                details.push(`Status: ${item.status || 'N/D'}`);
                details.push(`Prazo: ${item.dataVencimento ? new Date(item.dataVencimento + 'T00:00:00').toLocaleDateString() : 'N/D'}`);
                viewAction = 'visualizar-tarefa';
                break;
            case 'notasRapidas':
                title = item.titulo || 'Nota sem título';
                const snippet = item.conteudo ? (item.conteudo.length > 100 ? item.conteudo.substring(0, 100) + '...' : item.conteudo) : '';
                details.push(`Conteúdo: ${snippet}`);
                viewAction = 'visualizar-nota-rapida';
                break;
            case 'recursos':
                title = item.titulo || 'Recurso sem título';
                details.push(`Status: ${item.status || 'N/D'}`);
                details.push(`ID: ${item.numeroIdentificacao || 'N/D'}`);
                viewAction = 'visualizar-recurso';
                break;
            case 'protocolos':
                title = item.numeroProtocolo || 'Protocolo sem número';
                details.push(`Assunto: ${item.assunto || 'N/D'}`);
                details.push(`Data: ${item.dataHoraProtocolo ? new Date(item.dataHoraProtocolo).toLocaleDateString() : 'N/D'}`);
                viewAction = 'visualizar-protocolo';
                break;
            case 'ptas':
                title = item.numeroPTA || 'PTA sem número';
                details.push(`Assunto: ${item.assuntoPTA || 'N/D'}`);
                details.push(`Data: ${item.dataPTA ? new Date(item.dataPTA + 'T00:00:00').toLocaleDateString() : 'N/D'}`);
                viewAction = 'visualizar-pta';
                break;
            case 'autuacoes':
                title = item.numeroAutuacao || 'Autuação sem número';
                details.push(`Assunto: ${item.assuntoAutuacao || 'N/D'}`);
                details.push(`Data: ${item.dataAutuacao ? new Date(item.dataAutuacao + 'T00:00:00').toLocaleDateString() : 'N/D'}`);
                viewAction = 'visualizar-autuacao';
                break;
            case 'servidores':
                title = item.nome || 'Servidor sem nome';
                details.push(`Matrícula: ${item.matricula || 'N/D'}`);
                details.push(`Setor: ${item.setorLotacao || 'N/D'}`);
                viewAction = 'visualizar-servidor';
                break;
        }

        return `
            <li class="result-card bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
                <h4 class="text-md font-bold mb-1">
                    <a href="#" class="result-link text-blue-700 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-200" data-action="${viewAction}" ${dataAttributes}>
                        ${highlight(title)}
                    </a>
                </h4>
                <div class="text-xs text-gray-600 dark:text-gray-400 space-x-2">
                    ${details.map(detail => `<span>${highlight(detail)}</span>`).join('<span class="mx-1">|</span>')}
                </div>
            </li>
        `;
    }

    /**
     * Adiciona os event listeners aos links de resultado.
     */
    function addEventListenersToResults() {
        mainContentWrapperRef.querySelectorAll('.result-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const action = e.currentTarget.dataset.action;
                const id = e.currentTarget.dataset.id;
                
                let dataPayload = {};
                switch(action) {
                    case 'visualizar-documento': dataPayload = { docId: id, originatingView: 'search' }; break;
                    case 'visualizar-contribuinte': dataPayload = { contribuinteId: id, originatingView: 'search' }; break;
                    case 'visualizar-tarefa': dataPayload = { id: id, originatingView: 'search' }; break;
                    case 'visualizar-nota-rapida': dataPayload = { id: id, originatingView: 'search' }; break;
                    case 'visualizar-recurso': dataPayload = { recursoId: id, originatingView: 'search' }; break;
                    case 'visualizar-protocolo': dataPayload = { protocoloId: id, originatingView: 'search' }; break;
                    case 'visualizar-pta': dataPayload = { ptaId: id, originatingView: 'search' }; break;
                    case 'visualizar-autuacao': dataPayload = { autuacaoId: id, originatingView: 'search' }; break;
                    case 'visualizar-servidor': dataPayload = { servidorId: id, originatingView: 'search' }; break;
                    default: dataPayload = { id: id, originatingView: 'search' };
                }

                if (appModuleRef && appModuleRef.handleMenuAction) {
                    appModuleRef.handleMenuAction(action, dataPayload);
                }
            });
        });
    }

    return {
        init,
        renderGlobalSearchResultsPage
    };
})();