// js/comunicacaoDestinatariosView.js - Visualização de Destinatários Individuais
// v1.0.1 - Remove classe page-section para expandir a largura da visualização.
// v1.0 - Estrutura inicial, renderização de detalhes e ações.

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.Comunicacao = window.SEFWorkStation.Comunicacao || {};
window.SEFWorkStation.ComunicacaoDestinatarios = window.SEFWorkStation.ComunicacaoDestinatarios || {};

window.SEFWorkStation.ComunicacaoDestinatarios.View = (function() {
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let navigateToAppViewRef; // Será app.handleMenuAction
    let refreshApplicationStateRef;
    let dbRef;
    let appModuleRef;
    let uiModuleRef;

    const DESTINATARIOS_STORE_NAME = 'comunicacaoDestinatariosStore';
    let currentDestinatarioIdVisualizado = null;
    let currentDestinatarioDataVisualizado = null;

    function init(
        mainWrapper, showFeedback, clearFeedback, navigateToFunc, refreshState,
        db, applicationModule, ui
    ) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedback;
        globalClearFeedbackRef = clearFeedback;
        navigateToAppViewRef = navigateToFunc;
        refreshApplicationStateRef = refreshState;
        dbRef = db;
        appModuleRef = applicationModule;
        uiModuleRef = ui;

        console.log("ComunicacaoDestinatariosView.JS: Módulo inicializado (v1.0.1).");
    }

    async function renderVisualizarDestinatarioPage(destinatarioId, originatingView = 'gerir-destinatarios') {
        currentDestinatarioIdVisualizado = destinatarioId;
        const feedbackAreaId = `feedback-view-destinatario-${destinatarioId}`;

        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (!mainContentWrapperRef) {
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico ao renderizar visualização do destinatário.", "error");
            return;
        }
        // REMOVIDA CLASSE page-section
        mainContentWrapperRef.innerHTML = `<div id="destinatario-view-container-${destinatarioId}"><p class="loading-text p-4">Carregando dados do destinatário...</p></div>`;
        const viewContainer = document.getElementById(`destinatario-view-container-${destinatarioId}`);

        if (appModuleRef && typeof appModuleRef.setCurrentViewTarget === 'function') {
            appModuleRef.setCurrentViewTarget('visualizar-destinatario');
        }

        try {
            currentDestinatarioDataVisualizado = await dbRef.getItemById(DESTINATARIOS_STORE_NAME, destinatarioId);

            if (!currentDestinatarioDataVisualizado) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("Destinatário não encontrado.", "error", viewContainer);
                return;
            }

            if (currentDestinatarioDataVisualizado.isDeleted && originatingView !== 'lixeira-global' && originatingView !== 'lixeira-comunicacao') {
                 if (globalShowFeedbackRef) globalShowFeedbackRef("Este destinatário está na lixeira.", "info", viewContainer);
                 viewContainer.innerHTML = `<p class="feedback-message info p-4">Este destinatário (ID: ${destinatarioId}) encontra-se na lixeira. Para visualizá-lo ou restaurá-lo, acesse a Lixeira.</p>
                                           <button id="btn-voltar-view-dest" class="btn-secondary mt-4">Voltar</button>`;
                document.getElementById('btn-voltar-view-dest')?.addEventListener('click', () => {
                    if (appModuleRef && appModuleRef.navigateBack) appModuleRef.navigateBack();
                    else if (navigateToAppViewRef) navigateToAppViewRef(originatingView || 'gerir-destinatarios');
                });
                return;
            }
            
            const dataCriacaoFmt = currentDestinatarioDataVisualizado.dataCriacao ? new Date(currentDestinatarioDataVisualizado.dataCriacao).toLocaleString() : 'N/D';
            const dataModificacaoFmt = currentDestinatarioDataVisualizado.dataModificacao ? new Date(currentDestinatarioDataVisualizado.dataModificacao).toLocaleString() : 'N/D';

            const viewHtml = `
                <div id="${feedbackAreaId}" class="mb-4"></div>
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                    <h2 class="text-2xl font-semibold mb-1">${currentDestinatarioDataVisualizado.nome || "Destinatário Sem Nome"}</h2>
                     <div class="actions-group flex flex-wrap gap-2">
                        <button id="btn-voltar-view-dest" class="btn-secondary btn-sm">Voltar</button>
                        ${!currentDestinatarioDataVisualizado.isDeleted ? `<button id="btn-editar-destinatario-view" class="btn-primary btn-sm">Editar</button>` : ''}
                        ${!currentDestinatarioDataVisualizado.isDeleted ? `<button id="btn-excluir-destinatario-view" class="btn-delete btn-sm">Mover para Lixeira</button>` : 
                            (originatingView === 'lixeira-global' || originatingView === 'lixeira-comunicacao' ?
                                `<button id="btn-restaurar-destinatario-view" class="btn-secondary btn-sm">Restaurar</button>
                                 <button id="btn-excluir-permanente-destinatario-view" class="btn-delete btn-sm">Excluir Permanentemente</button>`
                                 : '')
                        }
                    </div>
                </div>

                <div class="card bg-white dark:bg-slate-800 shadow rounded-lg p-4 md:p-6">
                    <h3 class="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-200 border-b pb-2 dark:border-slate-700">Detalhes do Destinatário</h3>
                    <dl class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                        <div class="info-item"><dt class="font-medium text-gray-500 dark:text-gray-400">Nome:</dt><dd class="text-gray-800 dark:text-gray-100">${currentDestinatarioDataVisualizado.nome}</dd></div>
                        <div class="info-item"><dt class="font-medium text-gray-500 dark:text-gray-400">E-mail:</dt><dd class="text-gray-800 dark:text-gray-100">${currentDestinatarioDataVisualizado.email}</dd></div>
                        <div class="info-item"><dt class="font-medium text-gray-500 dark:text-gray-400">Empresa/Organização:</dt><dd class="text-gray-800 dark:text-gray-100">${currentDestinatarioDataVisualizado.empresa || 'N/A'}</dd></div>
                        <div class="info-item"><dt class="font-medium text-gray-500 dark:text-gray-400">Telefone:</dt><dd class="text-gray-800 dark:text-gray-100">${currentDestinatarioDataVisualizado.telefone || 'N/A'}</dd></div>
                        <div class="info-item md:col-span-2"><dt class="font-medium text-gray-500 dark:text-gray-400">Observações:</dt><dd class="text-gray-800 dark:text-gray-100 whitespace-pre-wrap">${currentDestinatarioDataVisualizado.observacoes || 'Nenhuma observação.'}</dd></div>
                        <div class="info-item"><dt class="font-medium text-gray-500 dark:text-gray-400">Data de Criação:</dt><dd class="text-gray-800 dark:text-gray-100">${dataCriacaoFmt}</dd></div>
                        <div class="info-item"><dt class="font-medium text-gray-500 dark:text-gray-400">Última Modificação:</dt><dd class="text-gray-800 dark:text-gray-100">${dataModificacaoFmt}</dd></div>
                    </dl>
                </div>
            `;
            viewContainer.innerHTML = viewHtml;
            addEventListenersToDestinatarioView(destinatarioId, originatingView, document.getElementById(feedbackAreaId));

        } catch (error) {
            console.error("ComunicacaoDestinatariosView.JS: Erro ao renderizar destinatário:", error);
            const feedbackEl = document.getElementById(feedbackAreaId) || mainContentWrapperRef;
            if (globalShowFeedbackRef && feedbackEl) globalShowFeedbackRef(`Erro ao carregar destinatário: ${error.message}`, "error", feedbackEl, 0);
        }
    }

    function addEventListenersToDestinatarioView(destinatarioId, originatingView, localFeedbackArea) {
        document.getElementById('btn-voltar-view-dest')?.addEventListener('click', () => {
            if (appModuleRef && appModuleRef.navigateBack) {
                appModuleRef.navigateBack();
            } else if (navigateToAppViewRef) {
                navigateToAppViewRef(originatingView || 'gerir-destinatarios');
            }
        });

        document.getElementById('btn-editar-destinatario-view')?.addEventListener('click', () => {
            if (navigateToAppViewRef) {
                // A ação 'form-destinatario' será tratada pelo Comunicacao.js -> ComunicacaoDestinatarios.js
                navigateToAppViewRef('form-destinatario', { destinatario: currentDestinatarioDataVisualizado, originatingView: 'visualizar-destinatario' });
            }
        });

        document.getElementById('btn-excluir-destinatario-view')?.addEventListener('click', async () => {
            if (confirm(`Tem certeza que deseja mover o destinatário "${currentDestinatarioDataVisualizado.nome}" para a lixeira?`)) {
                const destParaLixeira = await dbRef.getItemById(DESTINATARIOS_STORE_NAME, destinatarioId);
                if (destParaLixeira) {
                    destParaLixeira.isDeleted = true;
                    destParaLixeira.dataModificacao = new Date().toISOString();
                    await dbRef.updateItem(DESTINATARIOS_STORE_NAME, destParaLixeira);
                    
                    // Desvincular de Grupos de Destinatários
                    if (SEFWorkStation.DB && SEFWorkStation.DB.STORES && SEFWorkStation.DB.STORES.COMUNICACAO_GRUPOS) {
                        const grupos = await dbRef.getAllItems(SEFWorkStation.DB.STORES.COMUNICACAO_GRUPOS);
                        for (const grupo of grupos) {
                            if (grupo.idsDestinatariosMembros && grupo.idsDestinatariosMembros.includes(destinatarioId)) {
                                grupo.idsDestinatariosMembros = grupo.idsDestinatariosMembros.filter(id => id !== destinatarioId);
                                grupo.dataModificacao = new Date().toISOString();
                                await dbRef.updateItem(SEFWorkStation.DB.STORES.COMUNICACAO_GRUPOS, grupo);
                            }
                        }
                    }

                    if (globalShowFeedbackRef) globalShowFeedbackRef("Destinatário movido para a lixeira.", "success", localFeedbackArea);
                    if (refreshApplicationStateRef) await refreshApplicationStateRef();
                    if (navigateToAppViewRef) navigateToAppViewRef(originatingView || 'gerir-destinatarios');
                }
            }
        });
        
        document.getElementById('btn-restaurar-destinatario-view')?.addEventListener('click', async () => {
            currentDestinatarioDataVisualizado.isDeleted = false;
            currentDestinatarioDataVisualizado.dataModificacao = new Date().toISOString();
            await dbRef.updateItem(DESTINATARIOS_STORE_NAME, currentDestinatarioDataVisualizado);
            if (globalShowFeedbackRef) globalShowFeedbackRef("Destinatário restaurado da lixeira.", "success", localFeedbackArea);
            if (refreshApplicationStateRef) await refreshApplicationStateRef();
            renderVisualizarDestinatarioPage(destinatarioId, originatingView); 
        });

        document.getElementById('btn-excluir-permanente-destinatario-view')?.addEventListener('click', async () => {
            if (confirm(`EXCLUSÃO PERMANENTE: Tem certeza que deseja excluir permanentemente o destinatário "${currentDestinatarioDataVisualizado.nome}"? Esta ação NÃO PODE ser desfeita.`)) {
                // A desvinculação de grupos já ocorre ao mover para a lixeira,
                // mas podemos garantir aqui chamando uma função genérica de desvinculação se necessário.
                // Por ora, a lógica de desvinculação ao mover para lixeira é suficiente.
                
                await dbRef.deleteItem(DESTINATARIOS_STORE_NAME, destinatarioId);
                if (globalShowFeedbackRef) globalShowFeedbackRef("Destinatário excluído permanentemente.", "success", localFeedbackArea);
                if (refreshApplicationStateRef) await refreshApplicationStateRef();
                if (navigateToAppViewRef) navigateToAppViewRef(originatingView || 'lixeira-global');
            }
        });
    }

    return {
        init,
        renderVisualizarDestinatarioPage
    };
})();