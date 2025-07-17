// js/comunicacaoEmailVisualizacao.js - Lógica para Visualização de E-mails Gerados
// v1.1.1 - Remove classe page-section para expandir a largura da visualização.
// v1.1 - Utiliza o campo 'remetente' do registro do e-mail para exibição.
// v1.0 - Estrutura inicial, renderização de detalhes, link para .eml e ações básicas.

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.Comunicacao = window.SEFWorkStation.Comunicacao || {};

window.SEFWorkStation.ComunicacaoEmailVisualizacao = (function() {
    // ... (variáveis de módulo e init mantidos) ...
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let navigateToAppViewRef;
    let dbRef;
    let appModuleRef;
    let uiModuleRef;

    const EMAILS_GERADOS_STORE_NAME = 'comunicacaoEmailsGeradosStore';
    let currentEmailVisualizadoId = null;
    let currentEmailVisualizadoData = null;
    let feedbackAreaIdVisualizacao = "feedback-visualizacao-email";

    function init( /* ... parâmetros ... */ ) {
        // ... (código init mantido) ...
        mainContentWrapperRef = arguments[0];
        globalShowFeedbackRef = arguments[1];
        globalClearFeedbackRef = arguments[2];
        navigateToAppViewRef = arguments[3];
        dbRef = arguments[4];
        appModuleRef = arguments[5];
        uiModuleRef = arguments[6];
        console.log("ComunicacaoEmailVisualizacao.JS: Módulo inicializado (v1.1.1).");
    }


    async function renderVisualizarEmailGeradoPage(emailId, originatingView = 'gerir-emails-criados') {
        // ... (lógica de busca e tratamento de erro mantida) ...
        currentEmailVisualizadoId = emailId;
        if (globalClearFeedbackRef) globalClearFeedbackRef();
        feedbackAreaIdVisualizacao = `feedback-visualizacao-email-${emailId}`;

        if (!mainContentWrapperRef) { /* ... */ return; }
        mainContentWrapperRef.innerHTML = `<p class="loading-text p-4">Carregando dados do e-mail...</p>`;

        try {
            currentEmailVisualizadoData = await dbRef.getItemById(EMAILS_GERADOS_STORE_NAME, emailId);
            if (!currentEmailVisualizadoData) { /* ... */ return; }
            
            // Determina o remetente a ser exibido
            let remetenteDisplay = currentEmailVisualizadoData.remetente; // Prioriza o remetente salvo com o email
            if (!remetenteDisplay) { // Fallback se não estiver salvo (deveria estar a partir de agora)
                if (appModuleRef && typeof appModuleRef.getUserPreference === 'function') {
                    remetenteDisplay = appModuleRef.getUserPreference('emailPadraoUsuario') || "SEFWorkStation <noreply@sefworkstation.local>";
                } else if (SEFWorkStation.Configuracoes && typeof SEFWorkStation.Configuracoes.carregarUserPreferences === 'function') {
                    const prefs = SEFWorkStation.Configuracoes.carregarUserPreferences();
                    remetenteDisplay = (prefs && prefs.emailPadraoUsuario) ? prefs.emailPadraoUsuario : "SEFWorkStation <noreply@sefworkstation.local>";
                } else {
                    remetenteDisplay = "SEFWorkStation <noreply@sefworkstation.local>";
                }
            }

            // Montagem do HTML (a parte relevante para "De:" é atualizada)
            // REMOVIDA CLASSE page-section
            let pageHtml = `
                <div id="visualizacao-email-container-${emailId}"> 
                    <div id="${feedbackAreaIdVisualizacao}" class="mb-4"></div>
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                        <h2 class="text-xl font-semibold truncate" title="Assunto: ${currentEmailVisualizadoData.assunto.replace(/"/g, '"')}">
                            E-mail Gerado: ${currentEmailVisualizadoData.assunto}
                        </h2>
                        <div class="actions-group flex flex-wrap gap-2">
                            <button id="btn-voltar-view-email" class="btn-secondary btn-sm">Voltar</button>
                            <button id="btn-editar-email-gerado" class="btn-edit btn-sm" title="Editar este e-mail (reabre no compositor)">Editar</button>
                            <button id="btn-marcar-status-email" class="btn-action btn-sm" data-status-atual="${currentEmailVisualizadoData.status}">
                                ${currentEmailVisualizadoData.status === "Enviado Manualmente" ? "Marcar como Não Enviado" : "Marcar como Enviado"}
                            </button>
                            <button id="btn-excluir-email-gerado" class="btn-delete btn-sm" title="Excluir este registro de e-mail">Excluir Registro</button>
                        </div>
                    </div>

                    <div class="card mb-6 bg-white dark:bg-slate-800 shadow rounded-lg p-4 md:p-6">
                        <h3 class="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-200 border-b pb-2 dark:border-slate-700">Informações do E-mail</h3>
                        <dl class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                            <div class="info-item"><dt class="font-medium text-gray-500 dark:text-gray-400">De:</dt><dd class="text-gray-800 dark:text-gray-100">${remetenteDisplay}</dd></div>
                            <div class="info-item"><dt class="font-medium text-gray-500 dark:text-gray-400">Data de Geração:</dt><dd class="text-gray-800 dark:text-gray-100">${new Date(currentEmailVisualizadoData.dataGeracao).toLocaleString()}</dd></div>
                            <div class="info-item md:col-span-2"><dt class="font-medium text-gray-500 dark:text-gray-400">Para:</dt><dd class="text-gray-800 dark:text-gray-100">${currentEmailVisualizadoData.para ? currentEmailVisualizadoData.para.join(', ') : 'N/D'}</dd></div>
                            ${currentEmailVisualizadoData.cc && currentEmailVisualizadoData.cc.length > 0 ? `<div class="info-item md:col-span-2"><dt class="font-medium text-gray-500 dark:text-gray-400">CC:</dt><dd class="text-gray-800 dark:text-gray-100">${currentEmailVisualizadoData.cc.join(', ')}</dd></div>` : ''}
                            ${currentEmailVisualizadoData.cco && currentEmailVisualizadoData.cco.length > 0 ? `<div class="info-item md:col-span-2"><dt class="font-medium text-gray-500 dark:text-gray-400">CCO:</dt><dd class="text-gray-800 dark:text-gray-100">${currentEmailVisualizadoData.cco.join(', ')} (Cópia Oculta)</dd></div>` : ''}
                            <div class="info-item md:col-span-2"><dt class="font-medium text-gray-500 dark:text-gray-400">Assunto:</dt><dd class="text-gray-800 dark:text-gray-100">${currentEmailVisualizadoData.assunto}</dd></div>
                            <div class="info-item"><dt class="font-medium text-gray-500 dark:text-gray-400">Status:</dt><dd class="font-semibold ${currentEmailVisualizadoData.status === 'Enviado Manualmente' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}">${currentEmailVisualizadoData.status}</dd></div>
                            ${currentEmailVisualizadoData.dataEnvioManual ? `<div class="info-item"><dt class="font-medium text-gray-500 dark:text-gray-400">Data Envio Manual:</dt><dd class="text-gray-800 dark:text-gray-100">${new Date(currentEmailVisualizadoData.dataEnvioManual).toLocaleString()}</dd></div>` : ''}
                            ${currentEmailVisualizadoData.idEntidadeOrigem ? `<div class="info-item md:col-span-2"><dt class="font-medium text-gray-500 dark:text-gray-400">Origem:</dt><dd class="text-gray-800 dark:text-gray-100">${currentEmailVisualizadoData.tipoEntidadeOrigem || 'N/D'} (ID: ${currentEmailVisualizadoData.idEntidadeOrigem.substring(0,8)}...)</dd></div>` : ''}
                        </dl>
                    </div>
                    
                    <div class="card mb-6 bg-yellow-50 dark:bg-yellow-800/30 border border-yellow-300 dark:border-yellow-600 shadow rounded-lg p-4 text-center">
                        <h3 class="text-md font-semibold mb-2 text-yellow-700 dark:text-yellow-100">Ação Principal</h3>
                        <p class="text-sm text-yellow-600 dark:text-yellow-200 mb-3">Este e-mail foi preparado e salvo como um arquivo .eml. Para enviá-lo, clique no link abaixo para abri-lo em seu programa de e-mail padrão.</p>
                        <button id="btn-abrir-eml-view" class="btn-primary">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-envelope-arrow-up-fill inline-block mr-2" viewBox="0 0 16 16"><path d="M.05 3.555A2 2 0 0 1 2 2h12a2 2 0 0 1 1.95 1.555L8 8.414.05 3.555ZM0 4.697v7.104l5.803-3.558L0 4.697ZM6.761 8.83l-6.57 4.026A2 2 0 0 0 2 14h12a2 2 0 0 0 1.808-1.144l-6.57-4.025L8 9.586l-1.239-.757Zm3.436-.586L16 11.803V4.697l-5.803 3.558Z"/><path d="M12.5 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm.354-5.354a.5.5 0 0 0-.708-.708L11.5 10.586V7.5a.5.5 0 0 0-1 0v3.086l-.646-.647a.5.5 0 0 0-.708.708l1.5 1.5a.5.5 0 0 0 .708 0l1.5-1.5Z"/></svg>
                            Abrir Arquivo .eml (${currentEmailVisualizadoData.nomeArquivoEML})
                        </button>
                    </div>

                    <div class="card mb-6 bg-white dark:bg-slate-800 shadow rounded-lg p-4 md:p-6">
                        <h3 class="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-200 border-b pb-2 dark:border-slate-700">Corpo do E-mail</h3>
                        <div class="prose dark:prose-invert max-w-none p-3 border dark:border-slate-700 rounded bg-gray-50 dark:bg-slate-900/70 overflow-auto max-h-[60vh]">
                            ${currentEmailVisualizadoData.corpoHtml || '<p class="italic text-gray-500 dark:text-gray-400">Corpo do e-mail não disponível ou vazio.</p>'}
                        </div>
                    </div>

                    ${currentEmailVisualizadoData.anexosRegistrados && currentEmailVisualizadoData.anexosRegistrados.length > 0 ? `
                    <div class="card bg-white dark:bg-slate-800 shadow rounded-lg p-4 md:p-6">
                        <h3 class="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-200 border-b pb-2 dark:border-slate-700">Anexos Registrados</h3>
                        <ul class="list-disc list-inside text-sm space-y-1.5 pl-5">
                            ${currentEmailVisualizadoData.anexosRegistrados.map(anexo => `<li class="text-gray-700 dark:text-gray-200">${anexo.fileName} <span class="text-gray-500 dark:text-gray-400 text-xs">(${(anexo.fileSize ? (anexo.fileSize / 1024).toFixed(1) : 0)} KB)</span></li>`).join('')}
                        </ul>
                        <p class="text-xs mt-2 text-gray-500 dark:text-gray-400">Nota: Estes são os nomes dos arquivos que foram incluídos no arquivo .eml. O download individual não é suportado nesta visualização; abra o arquivo .eml para acessá-los.</p>
                    </div>
                    ` : ''}
                </div>
            `;
            mainContentWrapperRef.innerHTML = pageHtml;
            addVisualizacaoEventListeners(emailId, originatingView, currentEmailVisualizadoData.nomeArquivoEML);

        } catch (error) {
            // ... (tratamento de erro mantido) ...
            console.error("ComunicacaoEmailVisualizacao.JS: Erro ao renderizar página de visualização:", error);
            mainContentWrapperRef.innerHTML = `<p class="feedback-message error p-4">Erro ao carregar detalhes do e-mail: ${error.message}</p>`;
            const feedbackEl = document.getElementById(feedbackAreaIdVisualizacao) || mainContentWrapperRef;
            if (globalShowFeedbackRef && feedbackEl) globalShowFeedbackRef(`Erro ao carregar e-mail: ${error.message}`, "error", feedbackEl, 0);
        }
    }

    function addVisualizacaoEventListeners(emailId, originatingView, nomeArquivoEML) {
        // ... (código mantido, incluindo as lógicas de "Voltar", "Abrir .eml", "Editar", "Marcar Status", "Excluir") ...
        const feedbackEl = document.getElementById(feedbackAreaIdVisualizacao);

        document.getElementById('btn-voltar-view-email')?.addEventListener('click', () => {
            if (appModuleRef && appModuleRef.navigateBack) {
                appModuleRef.navigateBack();
            } else {
                navigateToAppViewRef(originatingView || 'gerir-emails-criados');
            }
        });

        document.getElementById('btn-abrir-eml-view')?.addEventListener('click', async () => {
            // CORREÇÃO APLICADA AQUI: Utiliza State Manager
            const directoryHandle = SEFWorkStation.State.getDirectoryHandle();
            if (!directoryHandle) {
                if(globalShowFeedbackRef && feedbackEl) globalShowFeedbackRef("Pasta da aplicação não selecionada. Não é possível abrir o arquivo .eml.", "error", feedbackEl);
                return;
            }
            try {
                const emailDirHandle = await directoryHandle.getDirectoryHandle('email', { create: false });
                const fileHandle = await emailDirHandle.getFileHandle(nomeArquivoEML, { create: false });
                const file = await fileHandle.getFile();
                
                const url = URL.createObjectURL(file);
                const a = document.createElement('a');
                a.href = url;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 100); 
                if(globalShowFeedbackRef && feedbackEl) globalShowFeedbackRef(`Tentando abrir "${nomeArquivoEML}" no seu cliente de e-mail...`, "success", feedbackEl, 4000);
            } catch (error) {
                console.error("Erro ao tentar abrir arquivo .eml:", error);
                if(globalShowFeedbackRef && feedbackEl) globalShowFeedbackRef(`Erro ao abrir arquivo .eml "${nomeArquivoEML}": ${error.message}. Verifique se o arquivo existe na pasta 'email' da aplicação.`, "error", feedbackEl, 0);
            }
        });

        document.getElementById('btn-editar-email-gerado')?.addEventListener('click', () => {
            if (SEFWorkStation.ComunicacaoEmailCompositor && SEFWorkStation.ComunicacaoEmailCompositor.renderCompositorEmailPage) {
                const dadosParaEdicao = {
                    ...currentEmailVisualizadoData,
                    isEditingEmailGerado: true, 
                    idEmailGeradoOriginal: currentEmailVisualizadoData.id, 
                    originatingView: `visualizar-email-gerado&emailId=${emailId}`,
                    // corpoHtml já está em currentEmailVisualizadoData
                    // anexosRegistrados já está em currentEmailVisualizadoData
                };
                navigateToAppViewRef('escrever-email', dadosParaEdicao);
            } else {
                if (globalShowFeedbackRef && feedbackEl) globalShowFeedbackRef("Funcionalidade 'Editar E-mail' indisponível no momento.", "error", feedbackEl);
            }
        });

        document.getElementById('btn-marcar-status-email')?.addEventListener('click', async (e) => {
            const statusAtual = currentEmailVisualizadoData.status;
            const novoStatus = statusAtual === "Enviado Manualmente" ? "Gerado" : "Enviado Manualmente";
            try {
                const emailParaAtualizar = { ...currentEmailVisualizadoData };
                emailParaAtualizar.status = novoStatus;
                if (novoStatus === "Enviado Manualmente") {
                    emailParaAtualizar.dataEnvioManual = new Date().toISOString();
                } else {
                    emailParaAtualizar.dataEnvioManual = null;
                }
                emailParaAtualizar.dataModificacao = new Date().toISOString();
                
                await dbRef.updateItem(EMAILS_GERADOS_STORE_NAME, emailParaAtualizar);
                if (globalShowFeedbackRef && feedbackEl) globalShowFeedbackRef(`Status do e-mail atualizado para "${novoStatus}".`, "success", feedbackEl);
                await renderVisualizarEmailGeradoPage(emailId, originatingView); 
            } catch (error) {
                if (globalShowFeedbackRef && feedbackEl) globalShowFeedbackRef(`Erro ao atualizar status: ${error.message}`, "error", feedbackEl);
            }
        });

        document.getElementById('btn-excluir-email-gerado')?.addEventListener('click', async () => {
            const feedbackElLocal = document.getElementById(feedbackAreaIdVisualizacao);
            if (confirm(`Tem certeza que deseja excluir o REGISTRO deste e-mail gerado (${currentEmailVisualizadoData.assunto})?`)) {
                
                const deveExcluirArquivoFisico = confirm(`Deseja também tentar excluir o arquivo físico "${currentEmailVisualizadoData.nomeArquivoEML}" da pasta "email"? Esta ação não pode ser desfeita se o arquivo for excluído.`);

                try {
                    // CORREÇÃO APLICADA AQUI: Utiliza State Manager
                    const directoryHandle = SEFWorkStation.State.getDirectoryHandle();
                    if (deveExcluirArquivoFisico && directoryHandle && currentEmailVisualizadoData.nomeArquivoEML) {
                        try {
                            const emailDirHandle = await directoryHandle.getDirectoryHandle('email', { create: false });
                            await emailDirHandle.removeEntry(currentEmailVisualizadoData.nomeArquivoEML);
                            if(globalShowFeedbackRef && feedbackElLocal) globalShowFeedbackRef(`Arquivo físico "${currentEmailVisualizadoData.nomeArquivoEML}" excluído com sucesso.`, "info", feedbackElLocal);
                        } catch (fileError) {
                            if (fileError.name !== 'NotFoundError') {
                                console.warn(`Erro ao excluir arquivo físico .eml:`, fileError);
                                if(globalShowFeedbackRef && feedbackElLocal) globalShowFeedbackRef(`Não foi possível excluir o arquivo físico "${currentEmailVisualizadoData.nomeArquivoEML}": ${fileError.message}. Você pode precisar removê-lo manualmente.`, "warning", feedbackElLocal);
                            } else {
                                if(globalShowFeedbackRef && feedbackElLocal) globalShowFeedbackRef(`Arquivo físico "${currentEmailVisualizadoData.nomeArquivoEML}" não encontrado para exclusão.`, "info", feedbackElLocal);
                            }
                        }
                    }
                    
                    await dbRef.deleteItem(EMAILS_GERADOS_STORE_NAME, emailId);
                    if(globalShowFeedbackRef && feedbackElLocal) globalShowFeedbackRef(`Registro do e-mail "${currentEmailVisualizadoData.assunto}" excluído com sucesso.`, "success", feedbackElLocal, 5000);
                    
                    navigateToAppViewRef(originatingView || 'gerir-emails-criados');

                } catch (error) {
                    console.error("Erro ao excluir registro do e-mail:", error);
                    if(globalShowFeedbackRef && feedbackElLocal) globalShowFeedbackRef(`Erro ao excluir registro do e-mail: ${error.message}`, "error", feedbackElLocal);
                }
            }
        });
    }

    return {
        init,
        renderVisualizarEmailGeradoPage
    };
})();