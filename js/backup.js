// js/backup.js - Lógica para Backup e Restauração
// v20.0.0 - REATORADO PARA WEB: Removida a lógica de acesso ao sistema de arquivos. O backup agora gera um ZIP em memória com TODOS os dados do IndexedDB e o oferece para download. A interface foi simplificada para um backup completo. O backup automático foi desativado.
// v19.12.1 - ADICIONADO: Inclusão da store 'itcdSelicIndicesStore' no backup manual.
// ... (histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.Backup = (function() {
    let mainContentWrapperRef;
    let showGlobalFeedbackRef;
    let dbRef;
    let ajudaModuleRef;

    // Lista agora é usada internamente para garantir que todas as stores sejam incluídas.
    const ALL_STORES_FOR_BACKUP = [
        'documents', 'contribuintes', 'recursos', 'tarefasStore', 'notasRapidasStore',
        'lotesDeDocumentosStore', 'protocolosStore', 'ptasStore', 'autuacoesStore',
        'servidoresStore', 'servidoresGruposStore', 'itcdAvaliacoesStore', 'itcdCalculosStore',
        'userPreferencesStore', 'documentTypes', 'documentCategories', 'documentTags',
        'contribuinteCategories', 'contribuinteTags', 'contribuintesPlaceholdersStore',
        'notasRapidasTagsStore', 'protocolTypesStore', 'ptaTypesStore', 'autuacaoTypesStore',
        'itcdConfiguracoesStore', 'itcdSemoventesPautasStore', 'itcdSelicIndicesStore',
        'comunicacaoDestinatariosStore', 'comunicacaoGruposStore', 'comunicacaoEmailsGeradosStore',
        'sharingHistoryStore', 'attachments', // Inclui metadados de anexos
        'sequences' // Essencial para a integridade dos IDs
    ];

    /**
     * Inicializa o módulo de Backup.
     */
    function init(mainWrapper, showFeedbackFunc, dbModule) {
        mainContentWrapperRef = mainWrapper;
        showGlobalFeedbackRef = showFeedbackFunc;
        dbRef = dbModule;
        ajudaModuleRef = window.SEFWorkStation.Ajuda; 
        
        if (!dbRef) {
            console.error("Backup.JS: init - ERRO CRÍTICO: Referência ao módulo DB (dbRef) não fornecida ou é inválida!");
        }
        if (!ajudaModuleRef) {
            console.warn("Backup.JS: init - Módulo de Ajuda não encontrado.");
        }
        console.log("Backup.JS: Módulo de Backup inicializado (v20.0.0).");
    }

    /**
     * Função utilitária para disparar o download de um Blob.
     */
    function triggerDownload(blob, fileName) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log(`Backup.JS: Download do arquivo "${fileName}" disparado.`);
    }

    /**
     * Renderiza a página de Backup e Restauração, agora simplificada para o ambiente web.
     */
    function renderBackupPage() {
        if (!mainContentWrapperRef) {
            console.error("Backup.JS: renderBackupPage - mainContentWrapperRef não definido.");
            if (showGlobalFeedbackRef) showGlobalFeedbackRef("Erro crítico ao tentar renderizar a página de backup.", "error");
            return;
        }
        console.log("Backup.JS: Renderizando página de Backup/Restauração (Versão Web).");

        const feedbackAreaId = "feedback-backup-page";

        const pageHtml = `
            <div class="page-section max-w-none px-4 sm:px-6 lg:px-8" id="backup-restore-container">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-100">Backup e Restauração de Dados</h2>
                     <button type="button" id="ajuda-backup-restore" class="p-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-300" title="Ajuda sobre Backup e Restauração">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-question-circle-fill" viewBox="0 0 16 16">
                            <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.496 6.033h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286a.237.237 0 0 0 .241.247zm2.325 6.443c.61 0 1.029-.394 1.029-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94 0 .533.425.927 1.01.927z"/>
                        </svg>
                    </button>
                </div>
                <div id="${feedbackAreaId}" class="mb-6"></div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    <!-- Coluna de Exportação -->
                    <div class="section-box p-4 border dark:border-slate-700 rounded-lg flex flex-col">
                        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-gray-100">Gerar Backup Completo</h3>
                        <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">
                            Clique no botão abaixo para gerar um arquivo ZIP contendo <strong>todos os dados e configurações</strong> da aplicação.
                            Guarde este arquivo em um local seguro.
                        </p>
                         <p class="text-xs text-orange-600 dark:text-orange-400 mb-3">
                            <strong>Aviso:</strong> Anexos de arquivos físicos (PDFs, imagens, etc.) não são incluídos neste backup.
                        </p>
                        <div class="mt-auto">
                            <button id="btn-export-full-zip" class="btn-primary">Gerar e Baixar Backup Completo (ZIP)</button>
                        </div>
                    </div>

                    <!-- Coluna de Restauração -->
                    <div class="section-box p-4 border dark:border-slate-700 rounded-lg flex flex-col">
                        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-gray-100">Restaurar Dados de Backup</h3>
                        <div class="mb-3">
                            <label for="backup-file-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Selecione o arquivo de backup (.zip):
                            </label>
                            <input type="file" id="backup-file-input" accept=".zip" class="form-input-file w-full max-w-md">
                            <p id="selected-backup-file-name" class="text-sm text-gray-500 dark:text-gray-400 mt-1"></p>
                        </div>
                        <div class="mb-3">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Modo de Importação:</label>
                            <div class="flex items-center gap-4">
                                <label class="inline-flex items-center">
                                    <input type="radio" name="import-mode" value="replace" class="form-radio" checked>
                                    <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Substituir Tudo</span>
                                </label>
                                <label class="inline-flex items-center">
                                    <input type="radio" name="import-mode" value="merge" class="form-radio">
                                    <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Mesclar</span>
                                </label>
                            </div>
                        </div>
                        <p class="text-xs text-red-600 dark:text-red-400 mb-3">
                            <strong>Atenção:</strong> No modo "Substituir", dados atuais serão <strong>apagados</strong>. No modo "Mesclar", itens existentes com o mesmo ID serão <strong>sobrescritos</strong>.
                        </p>
                        <div class="mt-auto">
                            <button id="btn-restore-from-file" class="btn-delete" disabled>Restaurar Dados do Arquivo</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        mainContentWrapperRef.innerHTML = pageHtml;
        addBackupPageEventListeners(document.getElementById(feedbackAreaId));
    }

    function addBackupPageEventListeners(feedbackDisplayArea) {
        const btnExportFullZip = document.getElementById('btn-export-full-zip');
        const backupFileInput = document.getElementById('backup-file-input');
        const selectedFileNameEl = document.getElementById('selected-backup-file-name');
        const btnRestoreFromFile = document.getElementById('btn-restore-from-file');
        const btnAjuda = document.getElementById('ajuda-backup-restore');

        if (btnExportFullZip) {
            btnExportFullZip.addEventListener('click', async () => {
                if (!dbRef || typeof dbRef.performSelectiveZipBackup !== 'function') {
                     if (showGlobalFeedbackRef) showGlobalFeedbackRef("Funcionalidade de backup não disponível ou DB não inicializado.", "error", feedbackDisplayArea);
                     console.error("Backup.JS: dbRef ou dbRef.performSelectiveZipBackup não está definido. dbRef:", dbRef);
                     return;
                }

                if (showGlobalFeedbackRef) showGlobalFeedbackRef("Iniciando exportação completa...", "info", feedbackDisplayArea);
                
                try {
                    // Passando false para 'includePhysicalAttachments', pois não é mais suportado
                    const zipFileName = await dbRef.performSelectiveZipBackup(ALL_STORES_FOR_BACKUP, false, showGlobalFeedbackRef, feedbackDisplayArea);
                    
                    if (zipFileName) {
                         if (showGlobalFeedbackRef) showGlobalFeedbackRef(`Backup "${zipFileName}" gerado e download iniciado.`, "success", feedbackDisplayArea);
                    } else {
                        if (showGlobalFeedbackRef) showGlobalFeedbackRef("Falha ao gerar o backup ZIP.", "error", feedbackDisplayArea);
                    }
                } catch (error) {
                    console.error("Backup.JS: Erro na exportação ZIP:", error);
                    if (showGlobalFeedbackRef) showGlobalFeedbackRef(`Erro ao exportar dados: ${error.message}`, "error", feedbackDisplayArea);
                }
            });
        }

        if (backupFileInput) {
            backupFileInput.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (file) {
                    selectedFileNameEl.textContent = `Arquivo: ${file.name}`;
                    btnRestoreFromFile.disabled = false;
                } else {
                    selectedFileNameEl.textContent = '';
                    btnRestoreFromFile.disabled = true;
                }
            });
        }

        if (btnRestoreFromFile) {
            btnRestoreFromFile.addEventListener('click', async () => {
                const file = backupFileInput.files[0];
                const importModeRadio = document.querySelector('input[name="import-mode"]:checked');
                const importMode = importModeRadio ? importModeRadio.value : 'replace';

                if (!file) {
                    if (showGlobalFeedbackRef) showGlobalFeedbackRef("Nenhum arquivo selecionado.", "warning", feedbackDisplayArea);
                    return;
                }

                if (!dbRef || typeof dbRef.importAllDataFromJson !== 'function') {
                     if (showGlobalFeedbackRef) showGlobalFeedbackRef("ERRO CRÍTICO: Função de importação não disponível.", "error", feedbackDisplayArea);
                     return;
                }

                let confirmMessage = `ATENÇÃO: Você selecionou o modo "${importMode === 'replace' ? 'Substituir Tudo' : 'Mesclar com Existentes'}".\n`;
                if (importMode === 'replace') {
                    confirmMessage += "TODOS OS DADOS ATUAIS nas stores afetadas pelo backup serão APAGADOS e substituídos. ";
                } else {
                    confirmMessage += "Os dados do backup serão adicionados. Se itens com o mesmo ID existirem, os do backup SOBRESCREVERÃO os atuais. ";
                }
                confirmMessage += `Continuar com a restauração de "${file.name}"?`;

                if (!confirm(confirmMessage)) {
                    return;
                }

                if (showGlobalFeedbackRef) showGlobalFeedbackRef(`Iniciando restauração de "${file.name}" (Modo: ${importMode})...`, "info", feedbackDisplayArea);

                try {
                    let jsonData;
                    if (file.name.endsWith('.zip')) {
                        if (typeof JSZip === 'undefined') throw new Error("JSZip não carregado.");
                        const jszip = new JSZip();
                        const zipContent = await jszip.loadAsync(file);
                        const jsonFileInZip = zipContent.file('sefworkstation_data.json') || Object.values(zipContent.files).find(f => f.name.endsWith('.json') && !f.dir);
                        if (!jsonFileInZip) throw new Error("Arquivo JSON de dados ('sefworkstation_data.json') não encontrado no ZIP.");
                        jsonData = JSON.parse(await jsonFileInZip.async('string'));
                        if (showGlobalFeedbackRef) showGlobalFeedbackRef(`Anexos físicos no ZIP não são restaurados na versão web. Apenas os dados do JSON serão importados.`, "info", feedbackDisplayArea);
                    } else {
                        throw new Error("Formato de arquivo não suportado. Selecione um arquivo .zip.");
                    }

                    if (!jsonData) throw new Error("Não foi possível obter dados JSON do backup.");

                    const importResult = await dbRef.importAllDataFromJson(jsonData, importMode);

                    if (importResult && importResult.success) {
                        if (showGlobalFeedbackRef) showGlobalFeedbackRef(`Restauração (Modo: ${importMode}) concluída! ${importResult.message || ''} Atualizando aplicação...`, "success", feedbackDisplayArea);
                        if (window.SEFWorkStation && window.SEFWorkStation.App) {
                            await window.SEFWorkStation.App.refreshApplicationState();
                            window.SEFWorkStation.App.handleMenuAction('gerir-documentos');
                        } else { window.location.reload(); }
                    } else {
                        const errorMsg = importResult && importResult.message ? importResult.message : (importResult && importResult.errors && importResult.errors.length > 0
                                        ? `Restauração (Modo: ${importMode}) com ${importResult.errors.length} erro(s). Ver console.`
                                        : `Falha na restauração (Modo: ${importMode}). Ver console.`);
                        if (showGlobalFeedbackRef) showGlobalFeedbackRef(errorMsg, "error", feedbackDisplayArea);
                    }
                    backupFileInput.value = '';
                    selectedFileNameEl.textContent = '';
                    btnRestoreFromFile.disabled = true;
                } catch (error) {
                    console.error("Backup.JS: Erro CRÍTICO ao restaurar dados:", error);
                    if (showGlobalFeedbackRef) showGlobalFeedbackRef(`Erro CRÍTICO: ${error.message}. Ver console.`, "error", feedbackDisplayArea);
                }
            });
        }

        if (btnAjuda) {
            btnAjuda.addEventListener('click', (e) => {
                e.preventDefault();
                if (ajudaModuleRef && ajudaModuleRef.mostrarTopicoDeAjuda) {
                    ajudaModuleRef.mostrarTopicoDeAjuda('manual-modulo-utilidades', 'util-backup');
                }
            });
        }
    }

    async function renderGerenciarBackupsPage() {
        if (!mainContentWrapperRef) {
            console.error("Backup.JS: renderGerenciarBackupsPage - mainContentWrapperRef não definido.");
            if (showGlobalFeedbackRef) showGlobalFeedbackRef("Erro crítico ao tentar renderizar a página de gerenciamento de backups.", "error");
            return;
        }
        const feedbackAreaId = "feedback-gerenciar-backups";
        mainContentWrapperRef.innerHTML = `<div class="page-section max-w-none px-4 sm:px-6 lg:px-8" id="gerenciar-backups-container"><p class="loading-text p-4">Carregando lista de backups...</p></div>`;
        const container = document.getElementById('gerenciar-backups-container');
        
        let contentHtml = `<h2 class="text-2xl font-semibold mb-6">Gerenciar Registros de Backup</h2>`;
        contentHtml += `<p class="text-sm text-gray-600 dark:text-gray-300 mb-4">Esta página lista os registros de backups manuais que foram gerados. Na versão web, os arquivos físicos são baixados por você. Esta lista serve apenas como um histórico das operações.</p>`;
        
        container.innerHTML = contentHtml;
    }
    
    // Função agora desativada na versão web
    async function performAutoZipBackup() {
        // Backup automático não é viável no ambiente web padrão.
        console.log("Backup.JS: Backup automático está desativado na versão web.");
        return null;
    }

    return {
        init,
        renderBackupPage,
        renderGerenciarBackupsPage
    };
})();
