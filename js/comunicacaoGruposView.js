// js/comunicacaoGruposView.js - Visualização de Grupos de Destinatários
// v1.0.1 - Remove classe page-section para expandir a largura da visualização.
// v1.0 - Estrutura inicial, renderização de detalhes e ações.

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.Comunicacao = window.SEFWorkStation.Comunicacao || {};
window.SEFWorkStation.ComunicacaoGrupos = window.SEFWorkStation.ComunicacaoGrupos || {};

window.SEFWorkStation.ComunicacaoGrupos.View = (function() {
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let navigateToAppViewRef; // Será app.handleMenuAction
    let refreshApplicationStateRef;
    let dbRef;
    let appModuleRef;
    let uiModuleRef;

    const GRUPOS_STORE_NAME = 'comunicacaoGruposStore';
    const DESTINATARIOS_STORE_NAME = 'comunicacaoDestinatariosStore'; // Para buscar detalhes dos membros
    let currentGrupoIdVisualizado = null;
    let currentGrupoDataVisualizado = null;

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

        console.log("ComunicacaoGruposView.JS: Módulo inicializado (v1.0.1).");
    }

    async function renderVisualizarGrupoDestinatariosPage(grupoId, originatingView = 'gerir-grupos-destinatarios') {
        currentGrupoIdVisualizado = grupoId;
        const feedbackAreaId = `feedback-view-grupo-comunicacao-${grupoId}`;

        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (!mainContentWrapperRef) {
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico ao renderizar visualização do grupo.", "error");
            return;
        }
        // REMOVIDA CLASSE page-section
        mainContentWrapperRef.innerHTML = `<div id="grupo-comunicacao-view-container-${grupoId}"><p class="loading-text p-4">Carregando dados do grupo...</p></div>`;
        const viewContainer = document.getElementById(`grupo-comunicacao-view-container-${grupoId}`);

        if (appModuleRef && typeof appModuleRef.setCurrentViewTarget === 'function') {
            appModuleRef.setCurrentViewTarget('visualizar-grupo-destinatarios');
        }

        try {
            currentGrupoDataVisualizado = await dbRef.getItemById(GRUPOS_STORE_NAME, grupoId);

            if (!currentGrupoDataVisualizado) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("Grupo de Destinatários não encontrado.", "error", viewContainer);
                return;
            }

            if (currentGrupoDataVisualizado.isDeleted && originatingView !== 'lixeira-global' && originatingView !== 'lixeira-comunicacao') {
                 if (globalShowFeedbackRef) globalShowFeedbackRef("Este grupo está na lixeira.", "info", viewContainer);
                 viewContainer.innerHTML = `<p class="feedback-message info p-4">Este grupo (ID: ${grupoId}) encontra-se na lixeira. Para visualizá-lo ou restaurá-lo, acesse a Lixeira.</p>
                                           <button id="btn-voltar-view-grupo-com" class="btn-secondary mt-4">Voltar</button>`;
                document.getElementById('btn-voltar-view-grupo-com')?.addEventListener('click', () => {
                    if (appModuleRef && appModuleRef.navigateBack) appModuleRef.navigateBack();
                    else if (navigateToAppViewRef) navigateToAppViewRef(originatingView || 'gerir-grupos-destinatarios');
                });
                return;
            }
            
            const dataCriacaoFmt = currentGrupoDataVisualizado.dataCriacao ? new Date(currentGrupoDataVisualizado.dataCriacao).toLocaleString() : 'N/D';
            const dataModificacaoFmt = currentGrupoDataVisualizado.dataModificacao ? new Date(currentGrupoDataVisualizado.dataModificacao).toLocaleString() : 'N/D';

            let membrosDestinatariosHtml = '<p class="text-xs text-gray-500 dark:text-gray-400">Nenhum destinatário cadastrado neste grupo.</p>';
            if (currentGrupoDataVisualizado.idsDestinatariosMembros && currentGrupoDataVisualizado.idsDestinatariosMembros.length > 0) {
                const listaMembrosPromises = currentGrupoDataVisualizado.idsDestinatariosMembros.map(async (idMembro) => {
                    try {
                        const membro = await dbRef.getItemById(DESTINATARIOS_STORE_NAME, idMembro);
                        if (membro && !membro.isDeleted) {
                            return `<li class="text-gray-700 dark:text-gray-200 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 p-1 rounded">
                                        <a href="#" class="link-visualizar-destinatario-membro" data-destinatario-id="${membro.id}">${membro.nome} <${membro.email}></a>
                                    </li>`;
                        }
                        return `<li class="text-gray-400 dark:text-gray-500 text-sm italic p-1">Membro (ID: ${idMembro.substring(0,8)}...) não encontrado ou na lixeira.</li>`;
                    } catch (e) {
                        return `<li class="text-red-500 dark:text-red-400 text-sm p-1">Erro ao carregar membro (ID: ${idMembro.substring(0,8)}...).</li>`;
                    }
                });
                const listaMembrosHtmlArray = await Promise.all(listaMembrosPromises);
                membrosDestinatariosHtml = `<ul class="list-disc list-inside space-y-1 pl-2">${listaMembrosHtmlArray.join('')}</ul>`;
            }

            let emailsAvulsosHtml = '<p class="text-xs text-gray-500 dark:text-gray-400">Nenhum e-mail avulso neste grupo.</p>';
            if (currentGrupoDataVisualizado.emailsAvulsosMembros && currentGrupoDataVisualizado.emailsAvulsosMembros.length > 0) {
                emailsAvulsosHtml = `<ul class="list-disc list-inside space-y-1 pl-2">${currentGrupoDataVisualizado.emailsAvulsosMembros.map(email => `<li class="text-gray-700 dark:text-gray-200 text-sm">${email}</li>`).join('')}</ul>`;
            }


            const viewHtml = `
                <div id="${feedbackAreaId}" class="mb-4"></div>
                 <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                    <h2 class="text-2xl font-semibold mb-1">${currentGrupoDataVisualizado.nomeGrupo || "Grupo Sem Nome"}</h2>
                     <div class="actions-group flex flex-wrap gap-2">
                        <button id="btn-voltar-view-grupo-com" class="btn-secondary btn-sm">Voltar</button>
                        ${!currentGrupoDataVisualizado.isDeleted ? `<button id="btn-editar-grupo-com-view" class="btn-primary btn-sm">Editar Grupo</button>` : ''}
                        ${!currentGrupoDataVisualizado.isDeleted ? `<button id="btn-excluir-grupo-com-view" class="btn-delete btn-sm">Mover para Lixeira</button>` : 
                            (originatingView === 'lixeira-global' || originatingView === 'lixeira-comunicacao' ?
                                `<button id="btn-restaurar-grupo-com-view" class="btn-secondary btn-sm">Restaurar</button>
                                 <button id="btn-excluir-permanente-grupo-com-view" class="btn-delete btn-sm">Excluir Permanentemente</button>`
                                 : '')
                        }
                    </div>
                </div>

                <div class="card bg-white dark:bg-slate-800 shadow rounded-lg p-4 md:p-6">
                    <h3 class="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-200 border-b pb-2 dark:border-slate-700">Detalhes do Grupo</h3>
                    <dl class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                        <div class="info-item md:col-span-2"><dt class="font-medium text-gray-500 dark:text-gray-400">Nome do Grupo:</dt><dd class="text-gray-800 dark:text-gray-100">${currentGrupoDataVisualizado.nomeGrupo}</dd></div>
                        <div class="info-item md:col-span-2"><dt class="font-medium text-gray-500 dark:text-gray-400">Descrição:</dt><dd class="text-gray-800 dark:text-gray-100 whitespace-pre-wrap">${currentGrupoDataVisualizado.descricaoGrupo || 'Nenhuma descrição.'}</dd></div>
                        <div class="info-item"><dt class="font-medium text-gray-500 dark:text-gray-400">Data de Criação:</dt><dd class="text-gray-800 dark:text-gray-100">${dataCriacaoFmt}</dd></div>
                        <div class="info-item"><dt class="font-medium text-gray-500 dark:text-gray-400">Última Modificação:</dt><dd class="text-gray-800 dark:text-gray-100">${dataModificacaoFmt}</dd></div>
                    </dl>

                    <div class="mt-6">
                        <h4 class="text-md font-semibold mb-2 text-gray-700 dark:text-gray-200">Membros (Destinatários Cadastrados):</h4>
                        <div class="p-3 border dark:border-slate-600 rounded bg-gray-50 dark:bg-slate-700/50 max-h-48 overflow-y-auto">
                           ${membrosDestinatariosHtml}
                        </div>
                    </div>
                    <div class="mt-4">
                        <h4 class="text-md font-semibold mb-2 text-gray-700 dark:text-gray-200">Membros (E-mails Avulsos):</h4>
                         <div class="p-3 border dark:border-slate-600 rounded bg-gray-50 dark:bg-slate-700/50 max-h-48 overflow-y-auto">
                            ${emailsAvulsosHtml}
                        </div>
                    </div>
                </div>
            `;
            viewContainer.innerHTML = viewHtml;
            addEventListenersToGrupoView(grupoId, originatingView, document.getElementById(feedbackAreaId));

        } catch (error) {
            console.error("ComunicacaoGruposView.JS: Erro ao renderizar grupo:", error);
            const feedbackEl = document.getElementById(feedbackAreaId) || mainContentWrapperRef;
            if (globalShowFeedbackRef && feedbackEl) globalShowFeedbackRef(`Erro ao carregar grupo: ${error.message}`, "error", feedbackEl, 0);
        }
    }

    function addEventListenersToGrupoView(grupoId, originatingView, localFeedbackArea) {
        document.getElementById('btn-voltar-view-grupo-com')?.addEventListener('click', () => {
            if (appModuleRef && appModuleRef.navigateBack) {
                appModuleRef.navigateBack();
            } else if (navigateToAppViewRef) {
                navigateToAppViewRef(originatingView || 'gerir-grupos-destinatarios');
            }
        });

        document.getElementById('btn-editar-grupo-com-view')?.addEventListener('click', () => {
            if (navigateToAppViewRef) {
                navigateToAppViewRef('form-grupo-destinatarios', { grupo: currentGrupoDataVisualizado, originatingView: 'visualizar-grupo-destinatarios' });
            }
        });

        document.getElementById('btn-excluir-grupo-com-view')?.addEventListener('click', async () => {
            if (confirm(`Tem certeza que deseja mover o grupo "${currentGrupoDataVisualizado.nomeGrupo}" para a lixeira?`)) {
                const grupoParaLixeira = await dbRef.getItemById(GRUPOS_STORE_NAME, grupoId);
                if (grupoParaLixeira) {
                    grupoParaLixeira.isDeleted = true;
                    grupoParaLixeira.dataModificacao = new Date().toISOString();
                    await dbRef.updateItem(GRUPOS_STORE_NAME, grupoParaLixeira);
                    
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Grupo movido para a lixeira.", "success", localFeedbackArea);
                    if (refreshApplicationStateRef) await refreshApplicationStateRef();
                    if (navigateToAppViewRef) navigateToAppViewRef(originatingView || 'gerir-grupos-destinatarios');
                }
            }
        });
        
        document.getElementById('btn-restaurar-grupo-com-view')?.addEventListener('click', async () => {
            currentGrupoDataVisualizado.isDeleted = false;
            currentGrupoDataVisualizado.dataModificacao = new Date().toISOString();
            await dbRef.updateItem(GRUPOS_STORE_NAME, currentGrupoDataVisualizado);
            if (globalShowFeedbackRef) globalShowFeedbackRef("Grupo restaurado da lixeira.", "success", localFeedbackArea);
            if (refreshApplicationStateRef) await refreshApplicationStateRef();
            renderVisualizarGrupoDestinatariosPage(grupoId, originatingView); 
        });

        document.getElementById('btn-excluir-permanente-grupo-com-view')?.addEventListener('click', async () => {
            if (confirm(`EXCLUSÃO PERMANENTE: Tem certeza que deseja excluir permanentemente o grupo "${currentGrupoDataVisualizado.nomeGrupo}"? Esta ação NÃO PODE ser desfeita.`)) {
                await dbRef.deleteItem(GRUPOS_STORE_NAME, grupoId);
                if (globalShowFeedbackRef) globalShowFeedbackRef("Grupo excluído permanentemente.", "success", localFeedbackArea);
                if (refreshApplicationStateRef) await refreshApplicationStateRef();
                if (navigateToAppViewRef) navigateToAppViewRef(originatingView || 'lixeira-global');
            }
        });

        // Event listeners para links de membros (se implementada navegação para view de destinatário)
        document.querySelectorAll('.link-visualizar-destinatario-membro').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const destinatarioId = e.currentTarget.dataset.destinatarioId;
                if (navigateToAppViewRef) {
                    // A ação será 'visualizar-destinatario', que o Comunicacao.js roteará para ComunicacaoDestinatarios.js
                    navigateToAppViewRef('visualizar-destinatario', { destinatarioId: destinatarioId, originatingView: 'visualizar-grupo-destinatarios' });
                }
            });
        });
    }

    return {
        init,
        renderVisualizarGrupoDestinatariosPage
    };
})();