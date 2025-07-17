// js/servidoresGruposView.js - Lógica para Visualização de Grupos de Servidores
// v1.1.0 - CORREÇÃO: Verifica se um membro servidor está arquivado antes de exibi-lo.
// v1.0.2 - Remove classe page-section para expandir a largura da visualização.
// v1.0.1 - CORREÇÃO: Exporta o módulo como SEFWorkStation.ServidoresGrupos.View
// v1.0 - Estrutura inicial, renderização de detalhes do grupo e membros.

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ServidoresGrupos = window.SEFWorkStation.ServidoresGrupos || {};

window.SEFWorkStation.ServidoresGrupos.View = (function() {
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let navigateToAppViewRef; 
    let dbRef;
    let appModuleRef; 

    const SERVIDORES_GRUPOS_STORE_NAME = 'servidoresGruposStore';
    const SERVIDORES_STORE_NAME = 'servidoresStore';

    let currentGrupoVisualizadoId = null;
    let currentGrupoVisualizadoData = null;
    let feedbackAreaIdVisualizacao = "feedback-visualizacao-grupo-servidores";

    function init(
        mainWrapper, showFeedback, clearFeedback, navigateTo,
        db, applicationModule
    ) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedback;
        globalClearFeedbackRef = clearFeedback;
        navigateToAppViewRef = navigateTo; 
        dbRef = db;
        appModuleRef = applicationModule;
        console.log("ServidoresGruposView.JS: Módulo inicializado (v1.1.0).");
    }

    async function renderVisualizarGrupoServidoresPage(grupoId, originatingView = 'gerir-grupos-servidores') {
        currentGrupoVisualizadoId = grupoId;
        if (globalClearFeedbackRef) globalClearFeedbackRef();
        feedbackAreaIdVisualizacao = `feedback-visualizacao-grupo-servidores-${grupoId}`;

        if (!mainContentWrapperRef) {
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico: Contêiner principal não definido.", "error");
            return;
        }
        mainContentWrapperRef.innerHTML = `<p class="loading-text p-4">Carregando dados do grupo...</p>`;

        try {
            currentGrupoVisualizadoData = await dbRef.getItemById(SERVIDORES_GRUPOS_STORE_NAME, grupoId);

            if (!currentGrupoVisualizadoData) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("Grupo de Servidores não encontrado.", "error", mainContentWrapperRef.querySelector('.loading-text') || mainContentWrapperRef);
                return;
            }
             if (currentGrupoVisualizadoData.isDeleted && originatingView !== 'lixeira-global') {
                if (globalShowFeedbackRef) globalShowFeedbackRef("Este grupo de servidores está na lixeira.", "info", mainContentWrapperRef.querySelector('.loading-text') || mainContentWrapperRef);
                return;
            }


            let membrosHtml = '<p class="text-sm text-gray-500 dark:text-gray-400">Nenhum membro servidor cadastrado neste grupo.</p>';
            if (currentGrupoVisualizadoData.idsServidoresMembros && currentGrupoVisualizadoData.idsServidoresMembros.length > 0) {
                membrosHtml = '<ul class="list-disc list-inside space-y-1">';
                for (const servidorId of currentGrupoVisualizadoData.idsServidoresMembros) {
                    try {
                        const servidor = await dbRef.getItemById(SERVIDORES_STORE_NAME, servidorId);
                        // CORREÇÃO: Adiciona verificação para isArchivedVersion
                        if (servidor && !servidor.isDeleted && !servidor.isArchivedVersion) {
                            membrosHtml += `<li class="text-sm text-gray-700 dark:text-gray-200">${servidor.nome} (${servidor.matricula || 'S/ Matrícula'})</li>`;
                        } else if (servidor && (servidor.isDeleted || servidor.isArchivedVersion)) {
                            membrosHtml += `<li class="text-sm text-gray-400 dark:text-gray-500 line-through" title="Servidor na lixeira ou arquivado">${servidor.nome} (Inativo)</li>`;
                        } else {
                             membrosHtml += `<li class="text-sm text-orange-500 dark:text-orange-400">Servidor ID ${servidorId.substring(0,8)}... (Não encontrado ou inválido)</li>`;
                        }
                    } catch (e) {
                        console.warn("Erro ao buscar membro servidor do grupo:", e);
                         membrosHtml += `<li class="text-sm text-red-500 dark:text-red-400">Erro ao carregar membro ID ${servidorId.substring(0,8)}...</li>`;
                    }
                }
                membrosHtml += '</ul>';
            }
            
            let outrosDestinatariosHtml = '<p class="text-sm text-gray-500 dark:text-gray-400">Nenhum e-mail avulso neste grupo.</p>';
            if (currentGrupoVisualizadoData.outrosDestinatarios && currentGrupoVisualizadoData.outrosDestinatarios.length > 0) {
                outrosDestinatariosHtml = '<ul class="list-disc list-inside space-y-1">';
                currentGrupoVisualizadoData.outrosDestinatarios.forEach(email => {
                    outrosDestinatariosHtml += `<li class="text-sm text-gray-700 dark:text-gray-200">${email}</li>`;
                });
                outrosDestinatariosHtml += '</ul>';
            }

            const pageHtml = `
                <div id="visualizacao-grupo-servidores-container-${grupoId}"> 
                    <div id="${feedbackAreaIdVisualizacao}" class="mb-4"></div>
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                        <h2 class="text-xl font-semibold truncate" title="Grupo: ${currentGrupoVisualizadoData.nomeGrupo.replace(/"/g, '"')}">
                            Grupo: ${currentGrupoVisualizadoData.nomeGrupo}
                        </h2>
                        <div class="actions-group flex flex-wrap gap-2">
                            <button id="btn-voltar-view-grupo-serv" class="btn-secondary btn-sm">Voltar</button>
                            ${!currentGrupoVisualizadoData.isDeleted ? `<button id="btn-editar-grupo-serv-view" class="btn-edit btn-sm" title="Editar este Grupo">Editar Grupo</button>` : ''}
                        </div>
                    </div>

                    <div class="card mb-6 bg-white dark:bg-slate-800 shadow rounded-lg p-4 md:p-6">
                        <h3 class="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-200 border-b pb-2 dark:border-slate-700">Detalhes do Grupo</h3>
                        <dl class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                            <div class="info-item md:col-span-2"><dt class="font-medium text-gray-500 dark:text-gray-400">Nome do Grupo:</dt><dd class="text-gray-800 dark:text-gray-100">${currentGrupoVisualizadoData.nomeGrupo}</dd></div>
                            <div class="info-item md:col-span-2"><dt class="font-medium text-gray-500 dark:text-gray-400">Descrição:</dt><dd class="text-gray-800 dark:text-gray-100 prose prose-sm dark:prose-invert max-w-none">${currentGrupoVisualizadoData.descricaoGrupo ? currentGrupoVisualizadoData.descricaoGrupo.replace(/\n/g, '<br>') : 'Nenhuma descrição.'}</dd></div>
                            <div class="info-item md:col-span-2"><dt class="font-medium text-gray-500 dark:text-gray-400">Data de Criação:</dt><dd class="text-gray-800 dark:text-gray-100">${new Date(currentGrupoVisualizadoData.dataCriacao).toLocaleString()}</dd></div>
                            <div class="info-item md:col-span-2"><dt class="font-medium text-gray-500 dark:text-gray-400">Última Modificação:</dt><dd class="text-gray-800 dark:text-gray-100">${new Date(currentGrupoVisualizadoData.dataModificacao).toLocaleString()}</dd></div>
                        </dl>
                    </div>
                    
                    <div class="card mb-6 bg-white dark:bg-slate-800 shadow rounded-lg p-4 md:p-6">
                        <h3 class="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-200 border-b pb-2 dark:border-slate-700">Membros Servidores</h3>
                        ${membrosHtml}
                    </div>
                     <div class="card mb-6 bg-white dark:bg-slate-800 shadow rounded-lg p-4 md:p-6">
                        <h3 class="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-200 border-b pb-2 dark:border-slate-700">Outros Destinatários (E-mails Avulsos)</h3>
                        ${outrosDestinatariosHtml}
                    </div>
                </div>
            `;
            mainContentWrapperRef.innerHTML = pageHtml;
            addVisualizacaoEventListenersGrupoServidores(grupoId, originatingView);

        } catch (error) {
            console.error("ServidoresGruposView.JS: Erro ao renderizar página de visualização do grupo:", error);
            mainContentWrapperRef.innerHTML = `<p class="feedback-message error p-4">Erro ao carregar detalhes do grupo: ${error.message}</p>`;
            const feedbackEl = document.getElementById(feedbackAreaIdVisualizacao) || mainContentWrapperRef;
            if (globalShowFeedbackRef && feedbackEl) globalShowFeedbackRef(`Erro ao carregar grupo: ${error.message}`, "error", feedbackEl, 0);
        }
    }

    function addVisualizacaoEventListenersGrupoServidores(grupoId, originatingView) {
        const feedbackEl = document.getElementById(feedbackAreaIdVisualizacao);

        document.getElementById('btn-voltar-view-grupo-serv')?.addEventListener('click', () => {
            if (navigateToAppViewRef) {
                navigateToAppViewRef(originatingView || 'gerir-grupos-servidores');
            } else if (appModuleRef && appModuleRef.navigateBack) {
                appModuleRef.navigateBack();
            }
        });

        document.getElementById('btn-editar-grupo-serv-view')?.addEventListener('click', () => {
            if (navigateToAppViewRef && currentGrupoVisualizadoData) {
                 navigateToAppViewRef('form-grupo-servidores', { grupo: currentGrupoVisualizadoData, originatingView: `visualizar-grupo-servidores&id=${grupoId}` });
            } else {
                if (globalShowFeedbackRef && feedbackEl) globalShowFeedbackRef("Erro ao tentar editar: dados do grupo ou função de navegação ausentes.", "error", feedbackEl);
            }
        });
    }

    return {
        init,
        renderVisualizarGrupoServidoresPage
    };
})();