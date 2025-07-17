// js/backup.js - Lógica para Backup e Restauração
// v19.12.1 - ADICIONADO: Inclusão da store 'itcdSelicIndicesStore' no backup manual.
// v19.12.0 - Adicionada a store 'itcdCalculosStore' na lista de exportáveis para backup manual.
// v19.11.0 - ADICIONADO: A store 'USER_PREFERENCES' foi incluída na lista de dados exportáveis para garantir o backup completo das configurações do usuário.
// v19.10.0 - ATUALIZADO: Processo de restauração agora lê a pasta ITCD_DATA/ e mescla os dados no momento da importação do ZIP.
// ... (histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.Backup = (function() {
    let mainContentWrapperRef;
    let showGlobalFeedbackRef;
    let dbRef;
    let ajudaModuleRef;

    const EXPORTABLE_STORES = [
        { value: 'DOCUMENTS', label: 'Documentos (metadados)' },
        { value: 'CONTRIBUINTES', label: 'Contribuintes (metadados)' },
        { value: 'RECURSOS', label: 'Recursos (metadados)' },
        { value: 'TAREFAS', label: 'Tarefas (metadados)' },
        { value: 'NOTAS_RAPIDAS', label: 'Notas Rápidas' },
        { value: 'LOTES_DE_DOCUMENTOS', label: 'Registros de Lotes de Documentos' },
        { value: 'PROTOCOLOS', label: 'Protocolos (metadados)' },
        { value: 'PTAS', label: 'PTAs (metadados)' },
        { value: 'AUTUACOES', label: 'Autuações (metadados)' },
        { value: 'SERVIDORES', label: 'Servidores (metadados)' },
        { value: 'SERVIDORES_GRUPOS', label: 'Grupos de Servidores' },
        { value: 'ITCD_AVALIACOES', label: 'Avaliações de ITCD (dados)' },
        { value: 'ITCD_CALCULOS', label: 'Cálculos de ITCD (dados)' },
        { value: 'USER_PREFERENCES', label: 'Preferências do Usuário' },
        { value: 'DOCUMENT_TYPES', label: 'Tipos de Documento (Configuração)' },
        { value: 'DOCUMENT_CATEGORIES', label: 'Categorias de Documento (Configuração)' },
        { value: 'DOCUMENT_TAGS', label: 'Tags de Documento (Configuração)' },
        { value: 'CONTRIBUINTE_CATEGORIES', label: 'Categorias de Contribuinte (Configuração)' },
        { value: 'CONTRIBUINTE_TAGS', label: 'Tags de Contribuinte (Configuração)' },
        { value: 'CONTRIBUINTES_PLACEHOLDERS', label: 'Placeholders de Contribuinte (Configuração)' },
        { value: 'NOTAS_RAPIDAS_TAGS', label: 'Tags de Notas Rápidas (Configuração)' },
        { value: 'PROTOCOL_TYPES', label: 'Tipos de Protocolo (Configuração)' },
        { value: 'PTA_TYPES', label: 'Tipos de PTA (Configuração)' },
        { value: 'AUTUACAO_TYPES', label: 'Tipos de Autuação (Configuração)' },
        { value: 'ITCD_CONFIGURACOES', label: 'Configurações de Avaliação ITCD' },
        { value: 'ITCD_SEMOVENTES_PAUTAS', label: 'Pautas de Valores de Semoventes (ITCD)' },
        { value: 'ITCD_SELIC_INDICES', label: 'Índices da Taxa SELIC (ITCD)' }
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
        console.log("Backup.JS: Módulo de Backup inicializado (v19.12.1). dbRef definido:", !!dbRef);
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
     * Renderiza a página de Backup e Restauração.
     */
    function renderBackupPage() {
        if (!mainContentWrapperRef) {
            console.error("Backup.JS: renderBackupPage - mainContentWrapperRef não definido.");
            if (showGlobalFeedbackRef) showGlobalFeedbackRef("Erro crítico ao tentar renderizar a página de backup.", "error");
            return;
        }
        console.log("Backup.JS: Renderizando página de Backup/Restauração.");

        const feedbackAreaId = "feedback-backup-page";

        let storesCheckboxesHtml = '';
        EXPORTABLE_STORES.forEach(storeInfo => {
            const label = storeInfo.label.includes('(metadados)') || storeInfo.label.includes('(Configuração)') || storeInfo.label.includes('(dados)') || storeInfo.label.includes('Preferências') ? storeInfo.label : `${storeInfo.label} (dados)`;
            storesCheckboxesHtml += `
                <label class="checkbox-label inline-flex items-center w-full md:w-1/2 lg:w-1/3">
                    <input type="checkbox" name="exportStores" value="${storeInfo.value}" class="form-checkbox store-export-checkbox rounded text-blue-600" checked>
                    <span class="ml-2 text-sm">${label}</span>
                </label>
            `;
        });

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
                        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-gray-100">Exportar Dados (Backup Manual)</h3>
                        <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">
                            Selecione os tipos de dados que deseja incluir no arquivo de backup.
                            Opcionalmente, inclua os arquivos físicos anexados. Guarde o arquivo ZIP em um local seguro.
                        </p>

                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Selecionar Tipos de Dados para Exportar:</label>
                            <div class="form-checkbox-group max-h-60 overflow-y-auto p-2 border dark:border-slate-600 rounded">
                                ${storesCheckboxesHtml}
                            </div>
                            <label class="inline-flex items-center mt-2">
                                <input type="checkbox" id="select-all-stores-export" class="form-checkbox rounded text-blue-600" checked>
                                <span class="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Selecionar Tudo / Desmarcar Tudo</span>
                            </label>
                        </div>

                        <div class="mb-4 mt-3">
                            <label class="checkbox-label inline-flex items-center">
                                <input type="checkbox" id="include-physical-attachments-export" class="form-checkbox rounded text-blue-600" checked>
                                <span class="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Incluir Anexos Físicos</span>
                            </label>
                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Requer acesso à pasta da aplicação.
                            </p>
                        </div>

                        <div class="mt-auto">
                            <button id="btn-export-selected-zip" class="btn-primary">Exportar Dados (ZIP)</button>
                        </div>
                    </div>

                    <!-- Coluna de Restauração -->
                    <div class="section-box p-4 border dark:border-slate-700 rounded-lg flex flex-col">
                        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-gray-100">Restaurar Dados de Backup</h3>
                        <div class="mb-3">
                            <label for="backup-file-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Selecione o arquivo (.json ou .zip):
                            </label>
                            <input type="file" id="backup-file-input" accept=".json,.zip" class="form-input-file w-full max-w-md">
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
        const btnExportSelectedZip = document.getElementById('btn-export-selected-zip');
        const backupFileInput = document.getElementById('backup-file-input');
        const selectedFileNameEl = document.getElementById('selected-backup-file-name');
        const btnRestoreFromFile = document.getElementById('btn-restore-from-file');
        const selectAllStoresCheckbox = document.getElementById('select-all-stores-export');
        const storeCheckboxes = document.querySelectorAll('.store-export-checkbox');
        const includeAttachmentsCheckbox = document.getElementById('include-physical-attachments-export');
        const btnAjuda = document.getElementById('ajuda-backup-restore');

        if (selectAllStoresCheckbox) {
            selectAllStoresCheckbox.addEventListener('change', (event) => {
                storeCheckboxes.forEach(checkbox => {
                    checkbox.checked = event.target.checked;
                });
            });
        }

        storeCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                if (!checkbox.checked) {
                    selectAllStoresCheckbox.checked = false;
                } else {
                    const allChecked = Array.from(storeCheckboxes).every(cb => cb.checked);
                    selectAllStoresCheckbox.checked = allChecked;
                }
            });
        });


        if (btnExportSelectedZip) {
            btnExportSelectedZip.addEventListener('click', async () => {
                const dirHandle = SEFWorkStation.State.getDirectoryHandle();
                if (!dirHandle) {
                    if (showGlobalFeedbackRef) showGlobalFeedbackRef("Por favor, selecione primeiro a pasta raiz da aplicação.", "warning", feedbackDisplayArea);
                    return;
                }
                if (!dbRef || typeof dbRef.performSelectiveZipBackup !== 'function') {
                     if (showGlobalFeedbackRef) showGlobalFeedbackRef("Funcionalidade de backup seletivo não disponível ou DB não inicializado.", "error", feedbackDisplayArea);
                     console.error("Backup.JS: dbRef ou dbRef.performSelectiveZipBackup não está definido. dbRef:", dbRef);
                     return;
                }

                const selectedStoreValues = Array.from(document.querySelectorAll('input[name="exportStores"]:checked'))
                                             .map(cb => cb.value);

                const selectedStoreNames = selectedStoreValues.map(value => {
                    return window.SEFWorkStation.DB.STORES[value] || value;
                }).filter(name => name); 


                const includeAttachments = includeAttachmentsCheckbox ? includeAttachmentsCheckbox.checked : true;

                if (selectedStoreNames.length === 0) {
                    if (showGlobalFeedbackRef) showGlobalFeedbackRef("Nenhum tipo de dado selecionado para exportação.", "warning", feedbackDisplayArea);
                    return;
                }

                if (showGlobalFeedbackRef) showGlobalFeedbackRef("Iniciando exportação...", "info", feedbackDisplayArea);
                try {
                    const zipFileNameInFS = await dbRef.performSelectiveZipBackup(dirHandle, selectedStoreNames, includeAttachments, showGlobalFeedbackRef, feedbackDisplayArea);
                    if (zipFileNameInFS) {
                         if (showGlobalFeedbackRef) showGlobalFeedbackRef(`Backup "${zipFileNameInFS}" criado na pasta 'backups'.`, "success", feedbackDisplayArea);
                        try {
                            const backupsDir = await dirHandle.getDirectoryHandle('backups');
                            const fileHandle = await backupsDir.getFileHandle(zipFileNameInFS.replace('backups/', ''));
                            triggerDownload(await fileHandle.getFile(), zipFileNameInFS.replace('backups/', ''));
                        } catch (downloadError) {
                            console.warn("Backup.JS: Download direto falhou:", downloadError);
                            if (showGlobalFeedbackRef) showGlobalFeedbackRef("Download direto falhou. Backup salvo na pasta 'backups'.", "warning", feedbackDisplayArea);
                        }
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
                    const dirHandle = SEFWorkStation.State.getDirectoryHandle();
                    let jsonData;
                    if (file.name.endsWith('.zip')) {
                        if (typeof JSZip === 'undefined') throw new Error("JSZip não carregado.");
                        const jszip = new JSZip();
                        const zipContent = await jszip.loadAsync(file);
                        const jsonFileInZip = zipContent.file('sefworkstation_data.json') || Object.values(zipContent.files).find(f => f.name.endsWith('.json') && !f.dir);
                        if (!jsonFileInZip) throw new Error("Arquivo JSON de dados ('sefworkstation_data.json') não encontrado no ZIP.");
                        jsonData = JSON.parse(await jsonFileInZip.async('string'));

                        // NOVO: Lógica para ler a pasta ITCD_DATA
                        const itcdDataFolder = zipContent.folder("ITCD_DATA");
                        if (itcdDataFolder) {
                            if (showGlobalFeedbackRef) showGlobalFeedbackRef("Encontrada pasta ITCD_DATA. Mesclando dados...", "info", feedbackDisplayArea);
                            
                            // Garante que as stores existam no objeto JSON principal
                            if (!jsonData[dbRef.STORES.ITCD_AVALIACOES]) jsonData[dbRef.STORES.ITCD_AVALIACOES] = [];
                            if (!jsonData[dbRef.STORES.ITCD_CALCULOS]) jsonData[dbRef.STORES.ITCD_CALCULOS] = [];

                            const itcdFilePromises = [];
                            itcdDataFolder.forEach((relativePath, file) => {
                                if (!file.dir && relativePath.endsWith('.json')) {
                                    itcdFilePromises.push(file.async('string'));
                                }
                            });

                            const fileContents = await Promise.all(itcdFilePromises);
                            for (const content of fileContents) {
                                try {
                                    const item = JSON.parse(content);
                                    if (item.tipo && ['imovel-urbano', 'imovel-rural', 'semovente'].includes(item.tipo)) {
                                        // Evita duplicatas se o item já estiver no JSON principal
                                        if (!jsonData[dbRef.STORES.ITCD_AVALIACOES].some(a => a.id === item.id)) {
                                            jsonData[dbRef.STORES.ITCD_AVALIACOES].push(item);
                                        }
                                    } else if (item.tipoCalculo && item.tipoCalculo === 'causaMortis') {
                                        if (!jsonData[dbRef.STORES.ITCD_CALCULOS].some(c => c.id === item.id)) {
                                            jsonData[dbRef.STORES.ITCD_CALCULOS].push(item);
                                        }
                                    }
                                } catch(e) { console.warn("Não foi possível processar um arquivo da pasta ITCD_DATA:", e); }
                            }
                        }

                        if (dirHandle) {
                            const attachmentsRootSefDir = await dirHandle.getDirectoryHandle('attachments_sef', { create: true });
                            let restoredCount = 0;
                            for (const relativePathInZip in zipContent.files) {
                                if (relativePathInZip.startsWith('attachments_sef/') && !zipContent.files[relativePathInZip].dir) {
                                    const fileInZip = zipContent.files[relativePathInZip];
                                    const pathParts = relativePathInZip.split('/');
                                    let currentDirHandle = attachmentsRootSefDir;
                                    for (let i = 1; i < pathParts.length - 1; i++) {
                                        currentDirHandle = await currentDirHandle.getDirectoryHandle(pathParts[i], { create: true });
                                    }
                                    const fileNameOnly = pathParts[pathParts.length - 1];
                                    const fileHandle = await currentDirHandle.getFileHandle(fileNameOnly, { create: true });
                                    const writable = await fileHandle.createWritable();
                                    await writable.write(await fileInZip.async('blob'));
                                    await writable.close();
                                    restoredCount++;
                                }
                            }
                            if (restoredCount > 0 && showGlobalFeedbackRef) showGlobalFeedbackRef(`${restoredCount} anexo(s) restaurado(s) do ZIP.`, "info", feedbackDisplayArea);
                        } else if (showGlobalFeedbackRef) {
                            showGlobalFeedbackRef("Pasta da aplicação não definida. Anexos do ZIP não restaurados no FS.", "warning", feedbackDisplayArea);
                        }
                    } else if (file.name.endsWith('.json')) {
                        jsonData = JSON.parse(await file.text());
                    } else {
                        throw new Error("Formato de arquivo não suportado. Selecione .json ou .zip.");
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
        try {
            if (!dbRef || !dbRef.getAllItems) {
                 container.innerHTML = `<p class="feedback-message error">Erro: Funcionalidade de banco de dados não disponível.</p>`;
                 return;
            }
            const backups = await dbRef.getAllItems(dbRef.STORES.BACKUPS);
            backups.sort((a, b) => new Date(b.backupDate) - new Date(a, b.backupDate));
            let contentHtml = `<h2 class="text-2xl font-semibold mb-6">Gerenciar Backups Registrados</h2><div id="${feedbackAreaId}" class="mb-6"></div>`;
            if (backups.length === 0) {
                contentHtml += '<p class="text-center text-gray-500 dark:text-gray-400 py-8">Nenhum backup registrado.</p>';
            } else {
                contentHtml += `<div class="table-list-container">
                                <table class="documentos-table" style="table-layout: fixed; width: 100%;">
                                    <thead>
                                        <tr>
                                            <th style="width: 18%;">Data</th>
                                            <th style="width: 12%;">Tipo</th>
                                            <th style="width: 28%;">Arquivo/Status</th>
                                            <th style="width: 22%;">Descrição</th>
                                            <th style="width: 20%;" class="text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>`;
                backups.forEach(backup => {
                    let tipoDisplay = 'N/D';
                    if (backup.type === 'automatic_zip') tipoDisplay = 'Automático (ZIP)';
                    else if (backup.type === 'manual_zip_selective') tipoDisplay = 'Manual Seletivo (ZIP)';
                    else if (backup.type === 'manual_json') tipoDisplay = 'Manual (JSON)';
                    else if (backup.type) tipoDisplay = backup.type;

                    contentHtml += `<tr data-id="${backup.id}">
                            <td>${new Date(backup.backupDate).toLocaleString()}</td>
                            <td>${tipoDisplay}</td>
                            <td class="text-sm ${backup.status === 'failed' ? 'text-red-500' : ''}" style="overflow-wrap: break-word; word-wrap: break-word; word-break: break-word; white-space: normal;">${backup.fileName || backup.status || 'N/A'}</td>
                            <td class="text-xs" style="overflow-wrap: break-word; word-wrap: break-word; word-break: break-word; white-space: normal;">${backup.description || ''}</td>
                            <td class="actions-cell text-center" style="white-space: nowrap;">
                                ${backup.fileName && backup.status === 'success' ? `<button class="btn-secondary btn-download-backup-registrado text-xs py-1 px-2 rounded mr-1" data-filename="${backup.fileName}" title="Baixar"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-download inline-block" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg></button>` : ''}
                                ${backup.fileName && backup.status === 'success' && backup.fileName.toLowerCase().endsWith('.zip') ? `<button class="btn-primary btn-restaurar-backup-registrado text-xs py-1 px-2 rounded mr-1" data-filename="${backup.fileName}" title="Restaurar Backup"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-upload inline-block" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/></svg></button>` : ''}
                                <button class="btn-delete btn-excluir-backup-registrado text-xs py-1 px-2 rounded" data-id="${backup.id}" data-filename="${backup.fileName || ''}" title="Excluir"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-trash3-fill inline-block" viewBox="0 0 16 16"><path d="M11 1.5v1h3.5a.5.5 0 0 1 0 1h-.538l-.853 10.66A2 2 0 0 1 11.115 16h-6.23a2 2 0 0 1-1.994-1.84L2.038 3.5H1.5a.5.5 0 0 1 0-1H5v-1A1.5 1.5 0 0 1 6.5 0h3A1.5 1.5 0 0 1 11 1.5Zm-5 0v1h4v-1a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5ZM4.5 5.029l.5 8.5a.5.5 0 1 0 .998-.06l-.5-8.5a.5.5 0 1 0-.998.06Zm6.53-.528a.5.5 0 0 0-.528.47l-.5 8.5a.5.5 0 0 0 .998.058l.5-8.5a.5.5 0 0 0-.47-.528ZM8 4.5a.5.5 0 0 0-.5.5v8.5a.5.5 0 0 0 1 0V5a.5.5 0 0 0-.5-.5Z"/></svg></button>
                            </td></tr>`;
                });
                contentHtml += '</tbody></table></div>';
            }
            container.innerHTML = contentHtml;
            addGerenciarBackupsEventListeners(document.getElementById(feedbackAreaId), renderGerenciarBackupsPage);
        } catch (error) {
            container.innerHTML = `<p class="feedback-message error">Erro ao carregar backups: ${error.message}</p>`;
        }
    }

    function addGerenciarBackupsEventListeners(feedbackDisplayArea, refreshListCallback) {
        document.querySelectorAll('.btn-download-backup-registrado').forEach(button => {
            button.addEventListener('click', async (event) => {
                const relativeFileName = event.currentTarget.dataset.filename;
                const dirHandle = SEFWorkStation.State.getDirectoryHandle();
                if (!dirHandle) {
                    if (showGlobalFeedbackRef) showGlobalFeedbackRef("Pasta raiz não acessível.", "error", feedbackDisplayArea);
                    return;
                }
                try {
                    const actualFileName = relativeFileName.startsWith('backups/') ? relativeFileName.substring(8) : relativeFileName;
                    const backupsDir = await dirHandle.getDirectoryHandle('backups', { create: false });
                    const fileHandle = await backupsDir.getFileHandle(actualFileName, { create: false });
                    triggerDownload(await fileHandle.getFile(), actualFileName);
                    if (showGlobalFeedbackRef) showGlobalFeedbackRef(`Download de "${actualFileName}" iniciado.`, "success", feedbackDisplayArea);
                } catch (error) {
                    if (showGlobalFeedbackRef) showGlobalFeedbackRef(`Erro ao baixar: ${error.message}.`, "error", feedbackDisplayArea);
                }
            });
        });

        document.querySelectorAll('.btn-restaurar-backup-registrado').forEach(button => {
            button.addEventListener('click', async (event) => {
                const relativeFileName = event.currentTarget.dataset.filename;
                const dirHandle = SEFWorkStation.State.getDirectoryHandle();
                if (!dirHandle) {
                    if (showGlobalFeedbackRef) showGlobalFeedbackRef("Pasta raiz da aplicação não acessível. Não é possível restaurar.", "error", feedbackDisplayArea);
                    return;
                }
                if (!dbRef || typeof dbRef.importAllDataFromJson !== 'function') {
                    if (showGlobalFeedbackRef) showGlobalFeedbackRef("ERRO CRÍTICO: Funcionalidade de importação não disponível.", "error", feedbackDisplayArea);
                    return;
                }
                if (typeof JSZip === 'undefined') {
                    if (showGlobalFeedbackRef) showGlobalFeedbackRef("Biblioteca JSZip não carregada, necessária para restaurar de ZIP.", "error", feedbackDisplayArea);
                    return;
                }
        
                const actualFileName = relativeFileName.startsWith('backups/') ? relativeFileName.substring(8) : relativeFileName;
        
                let importMode = 'replace'; 
                if (window.SEFWorkStation && window.SEFWorkStation.UI && window.SEFWorkStation.UI.showModal) {
                    const modalPromise = new Promise((resolveModal) => {
                        window.SEFWorkStation.UI.showModal(
                            'Modo de Restauração',
                            `
                                <p class="text-sm mb-2">Como deseja restaurar os dados do arquivo "${actualFileName}"?</p>
                                <div class="flex items-center gap-4 mb-3">
                                    <label class="inline-flex items-center">
                                        <input type="radio" name="import-mode-modal" value="replace" class="form-radio" checked>
                                        <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Substituir Tudo</span>
                                    </label>
                                    <label class="inline-flex items-center">
                                        <input type="radio" name="import-mode-modal" value="merge" class="form-radio">
                                        <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Mesclar com Existentes</span>
                                    </label>
                                </div>
                                <p class="text-xs text-red-600 dark:text-red-400">
                                    <strong>Atenção:</strong> No modo "Substituir Tudo", todos os dados atuais nas stores afetadas pelo backup serão <strong>apagados</strong>.
                                    No modo "Mesclar", os dados do backup serão adicionados; se um item com o mesmo ID já existir, o item do backup <strong>sobrescreverá</strong> o existente.
                                </p>
                            `,
                            [
                                { text: 'Cancelar', class: 'btn-secondary', callback: () => { resolveModal(null); return true; } },
                                { text: 'Prosseguir com Restauração', class: 'btn-primary', callback: () => {
                                    const selectedModeElement = document.querySelector('input[name="import-mode-modal"]:checked');
                                    resolveModal(selectedModeElement ? selectedModeElement.value : 'replace');
                                    return true;
                                }}
                            ],
                            'max-w-lg'
                        );
                    });
                    const selectedMode = await modalPromise;
                    if (!selectedMode) { 
                        if (showGlobalFeedbackRef) showGlobalFeedbackRef("Restauração cancelada pelo usuário.", "info", feedbackDisplayArea, 3000);
                        return;
                    }
                    importMode = selectedMode;
                } else {
                    if (!confirm(`Deseja restaurar o backup "${actualFileName}"?\n\nMODO DE IMPORTAÇÃO:\nOK = Substituir Tudo\nCancelar = Mesclar com Existentes\n\nATENÇÃO: Verifique o modo escolhido com cuidado!`)) {
                        importMode = 'merge'; 
                        if (!confirm(`Modo "Mesclar com Existentes" selecionado para "${actualFileName}". Confirma?`)) {
                            if (showGlobalFeedbackRef) showGlobalFeedbackRef("Restauração cancelada.", "info", feedbackDisplayArea, 3000);
                            return;
                        }
                    }
                }
        
                if (showGlobalFeedbackRef) showGlobalFeedbackRef(`Iniciando restauração de "${actualFileName}" (Modo: ${importMode})...`, "info", feedbackDisplayArea, 0);
        
                try {
                    const backupsDir = await dirHandle.getDirectoryHandle('backups', { create: false });
                    const fileHandle = await backupsDir.getFileHandle(actualFileName, { create: false });
                    const file = await fileHandle.getFile();
        
                    let jsonData;
                    const jszip = new JSZip();
                    const zipContent = await jszip.loadAsync(file);
                    const jsonFileInZip = zipContent.file('sefworkstation_data.json') || Object.values(zipContent.files).find(f => f.name.endsWith('.json') && !f.dir);
                    if (!jsonFileInZip) throw new Error("Arquivo JSON de dados ('sefworkstation_data.json') não encontrado no ZIP.");
                    jsonData = JSON.parse(await jsonFileInZip.async('string'));
        
                    const attachmentsRootSefDir = await dirHandle.getDirectoryHandle('attachments_sef', { create: true });
                    let restoredCount = 0;
                    for (const relativePathInZip in zipContent.files) {
                        if (relativePathInZip.startsWith('attachments_sef/') && !zipContent.files[relativePathInZip].dir) {
                            const fileInZip = zipContent.files[relativePathInZip];
                            const pathParts = relativePathInZip.split('/');
                            let currentDirHandle = attachmentsRootSefDir;
                            for (let i = 1; i < pathParts.length - 1; i++) { 
                                currentDirHandle = await currentDirHandle.getDirectoryHandle(pathParts[i], { create: true });
                            }
                            const fileNameOnly = pathParts[pathParts.length - 1];
                            const attachmentFileHandle = await currentDirHandle.getFileHandle(fileNameOnly, { create: true });
                            const writable = await attachmentFileHandle.createWritable();
                            await writable.write(await fileInZip.async('blob'));
                            await writable.close();
                            restoredCount++;
                        }
                    }
                    if (restoredCount > 0 && showGlobalFeedbackRef) showGlobalFeedbackRef(`${restoredCount} anexo(s) físico(s) restaurado(s) do ZIP.`, "info", feedbackDisplayArea, 4000);
        
                    if (!jsonData) throw new Error("Não foi possível obter dados JSON do backup.");
        
                    const importResult = await dbRef.importAllDataFromJson(jsonData, importMode);
        
                    if (importResult && importResult.success) {
                        if (showGlobalFeedbackRef) showGlobalFeedbackRef(`Restauração de "${actualFileName}" (Modo: ${importMode}) concluída! ${importResult.message || ''} Atualizando aplicação...`, "success", feedbackDisplayArea, 5000);
                        if (window.SEFWorkStation && window.SEFWorkStation.App) {
                            await window.SEFWorkStation.App.refreshApplicationState(); 
                            window.SEFWorkStation.App.handleMenuAction('gerir-documentos');
                        } else {
                            window.location.reload();
                        }
                    } else {
                        const errorMsg = importResult && importResult.message ? importResult.message : (importResult && importResult.errors && importResult.errors.length > 0
                                        ? `Restauração de "${actualFileName}" (Modo: ${importMode}) com ${importResult.errors.length} erro(s). Ver console.`
                                        : `Falha na restauração de "${actualFileName}" (Modo: ${importMode}). Ver console.`);
                        if (showGlobalFeedbackRef) showGlobalFeedbackRef(errorMsg, "error", feedbackDisplayArea, 0);
                    }
        
                } catch (error) {
                    console.error(`Backup.JS: Erro CRÍTICO ao restaurar backup "${actualFileName}":`, error);
                    if (showGlobalFeedbackRef) showGlobalFeedbackRef(`Erro CRÍTICO ao restaurar "${actualFileName}": ${error.message}. Ver console.`, "error", feedbackDisplayArea, 0);
                }
            });
        });


        document.querySelectorAll('.btn-excluir-backup-registrado').forEach(button => {
            button.addEventListener('click', async (event) => {
                const backupId = parseInt(event.currentTarget.dataset.id);
                const relativeFileName = event.currentTarget.dataset.filename;
                const isAutoOrManualZip = relativeFileName && (relativeFileName.includes('_autobackup_') || relativeFileName.includes('_manual_selective_')) && relativeFileName.endsWith('.zip');
                let confirmMessage = `Excluir REGISTRO deste backup?`;
                if (isAutoOrManualZip) confirmMessage = `Excluir registro E TENTAR EXCLUIR ARQUIVO FÍSICO "${relativeFileName.replace('backups/', '')}"?`;

                if (confirm(confirmMessage)) {
                    try {
                        const dirHandle = SEFWorkStation.State.getDirectoryHandle();
                        if (isAutoOrManualZip && dirHandle) {
                            const actualFileName = relativeFileName.startsWith('backups/') ? relativeFileName.substring(8) : relativeFileName;
                            try {
                                const backupsDirHandle = await dirHandle.getDirectoryHandle('backups', { create: false });
                                await backupsDirHandle.removeEntry(actualFileName);
                                if (showGlobalFeedbackRef) showGlobalFeedbackRef(`Arquivo físico "${actualFileName}" excluído.`, "info", feedbackDisplayArea);
                            } catch (fileError) {
                                if (fileError.name !== 'NotFoundError' && showGlobalFeedbackRef) {
                                    showGlobalFeedbackRef(`Aviso: Não foi possível excluir arquivo físico: ${fileError.message}`, "warning", feedbackDisplayArea);
                                }
                            }
                        }
                        await dbRef.deleteItem(dbRef.STORES.BACKUPS, backupId);
                        if (showGlobalFeedbackRef) showGlobalFeedbackRef("Registro de backup excluído.", "success", feedbackDisplayArea);
                        await refreshListCallback();
                    } catch (dbError) {
                        if (showGlobalFeedbackRef) showGlobalFeedbackRef(`Erro ao excluir registro: ${dbError.message}`, "error", feedbackDisplayArea);
                    }
                }
            });
        });
    }

    /**
     * Adiciona dados estruturados do ITCD (avaliações, cálculos) ao arquivo ZIP de backup.
     * Os dados são organizados em uma pasta raiz 'ITCD_DATA', com subpastas por DBD.
     * @param {JSZip} zip - A instância do objeto JSZip.
     * @param {object} db - A referência ao módulo do banco de dados (dbRef).
     */
    async function addItcdDataToZip(zip, db) {
        const ITCD_DATA_FOLDER = 'ITCD_DATA';
        const itcdDataFolder = zip.folder(ITCD_DATA_FOLDER);
        if (!itcdDataFolder) return;

        try {
            const avaliacoes = await db.getAllItems(db.STORES.ITCD_AVALIACOES);
            const calculos = await db.getAllItems(db.STORES.ITCD_CALCULOS);

            // Processa as Avaliações
            for (const avaliacao of avaliacoes) {
                const dbd = avaliacao.declaracao || 'SEM_DBD';
                const sanitizedDbd = dbd.replace(/[\\/:*?"<>|]/g, '_');
                const dbdFolder = itcdDataFolder.folder(sanitizedDbd);
                const fileName = `avaliacao_${avaliacao.id}.json`;
                dbdFolder.file(fileName, JSON.stringify(avaliacao, null, 2));
            }

            // Processa os Cálculos
            for (const calculo of calculos) {
                const dbd = calculo.declaracaoNumero || 'SEM_DBD';
                const sanitizedDbd = dbd.replace(/[\\/:*?"<>|]/g, '_');
                const dbdFolder = itcdDataFolder.folder(sanitizedDbd);
                const fileName = `calculo_${calculo.id}.json`;
                dbdFolder.file(fileName, JSON.stringify(calculo, null, 2));
            }
            console.log("Backup.JS: Dados do ITCD adicionados ao backup ZIP na pasta ITCD_DATA.");
        } catch (error) {
            console.error("Backup.JS: Erro ao adicionar dados do ITCD ao backup ZIP:", error);
            // Não relança o erro para não interromper o resto do processo de backup.
        }
    }
    
    async function performSelectiveZipBackup(appDirectoryHandle, storeNamesToExport, includePhysicalAttachments = true, showGlobalFeedbackRef, feedbackDisplayArea) {
         if (!appDirectoryHandle) {
            console.error("Backup.JS: Pasta da aplicação não fornecida para backup seletivo.");
            return null;
        }
        if (typeof JSZip === 'undefined') {
            console.error("Backup.JS: Biblioteca JSZip não está carregada.");
            return null;
        }
        if (!dbRef) await init(null, null, window.SEFWorkStation.DB);

        try {
            const data = await dbRef.exportAllDataToJson(storeNamesToExport); 
            const zip = new JSZip();
            zip.file("sefworkstation_data.json", JSON.stringify(data));

            const attachmentOwnerStoresMap = {
                [dbRef.STORES.DOCUMENTS]: 'documents',
                [dbRef.STORES.CONTRIBUINTES]: 'contribuintes',
                [dbRef.STORES.RECURSOS]: 'recursos',
                [dbRef.STORES.NOTAS_RAPIDAS]: 'notasRapidas',
                [dbRef.STORES.TAREFAS]: 'tarefas',
                [dbRef.STORES.PROTOCOLOS]: 'processos/protocolos',
                [dbRef.STORES.PTAS]: 'processos/ptas',
                [dbRef.STORES.AUTUACOES]: 'processos/autuacoes',
            };

            if (includePhysicalAttachments) {
                let shouldIncludeAnyAttachments = storeNamesToExport.some(storeName => attachmentOwnerStoresMap[storeName]);

                if (shouldIncludeAnyAttachments) {
                    try {
                        const attachmentsRootSefDir = await appDirectoryHandle.getDirectoryHandle('attachments_sef', { create: false });
                        const attachmentsZipFolder = zip.folder('attachments_sef');

                        for (const storeKeyToBackup in attachmentOwnerStoresMap) {
                            if (storeNamesToExport.includes(storeKeyToBackup)) { 
                                const subFolderPath = attachmentOwnerStoresMap[storeKeyToBackup];
                                try {
                                    let currentDirHandle = attachmentsRootSefDir;
                                    const pathParts = subFolderPath.split('/');
                                    for (const part of pathParts) {
                                         currentDirHandle = await currentDirHandle.getDirectoryHandle(part, { create: false });
                                    }
                                    
                                    let zipTargetFolder = attachmentsZipFolder;
                                    pathParts.forEach(part => { zipTargetFolder = zipTargetFolder.folder(part); });
                                    
                                    for await (const entry of currentDirHandle.values()) {
                                         if (entry.kind === 'directory') { 
                                            const idFolderInZip = zipTargetFolder.folder(entry.name);
                                            for await (const fileEntry of entry.values()) { 
                                                if (fileEntry.kind === 'file') {
                                                    try { idFolderInZip.file(fileEntry.name, await fileEntry.getFile()); } 
                                                    catch (fileError) { console.warn(`Erro ao adicionar arquivo ${fileEntry.name} ao ZIP:`, fileError); }
                                                }
                                            }
                                        } else if (entry.kind === 'file') { 
                                             try { zipTargetFolder.file(entry.name, await entry.getFile()); } 
                                             catch (fileError) { console.warn(`Erro ao adicionar arquivo ${entry.name} ao ZIP:`, fileError); }
                                        }
                                    }
                                } catch (dirError) {
                                    if (dirError.name !== 'NotFoundError') console.warn(`Erro ao acessar subpasta de anexos '${subFolderPath}':`, dirError);
                                }
                            }
                        }
                    } catch (e) {
                        if (e.name !== 'NotFoundError') console.warn("Erro ao acessar pasta 'attachments_sef':", e);
                    }
                }
            }

            const itcdStoresSelected = storeNamesToExport.includes(dbRef.STORES.ITCD_AVALIACOES) || storeNamesToExport.includes(dbRef.STORES.ITCD_CALCULOS);
            if (itcdStoresSelected) {
                if (showGlobalFeedbackRef) showGlobalFeedbackRef("Adicionando dados estruturados do ITCD ao backup...", "info", feedbackDisplayArea);
                await addItcdDataToZip(zip, dbRef);
            }

            const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const zipFileName = `sefworkstation_manual_selective_backup_${timestamp}.zip`;

            const backupsDirHandle = await appDirectoryHandle.getDirectoryHandle('backups', { create: true });
            const fileHandle = await backupsDirHandle.getFileHandle(zipFileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(zipBlob);
            await writable.close();

            await dbRef.addItem(dbRef.STORES.BACKUPS, { 
                backupDate: new Date().toISOString(), type: 'manual_zip_selective', fileName: `backups/${zipFileName}`,
                description: `Backup manual seletivo contendo: ${storeNamesToExport.join(', ')}. Anexos físicos: ${includePhysicalAttachments ? 'Sim' : 'Não'}.`, status: 'success'
            });

            return `backups/${zipFileName}`;
        } catch (error) {
            console.error("Erro crítico durante o backup manual seletivo:", error);
            await dbRef.addItem(dbRef.STORES.BACKUPS, { 
                backupDate: new Date().toISOString(), type: 'manual_zip_selective', fileName: null, status: 'failed',
                description: `Falha no backup manual seletivo ZIP: ${error.message || error}`
            });
            return null;
        }
    }

    async function performAutoZipBackup(appDirectoryHandle, storeValuesToInclude = null, includePhysicalAttachments = true) {
         if (!appDirectoryHandle) return null;
        if (typeof JSZip === 'undefined') {
            console.error("Backup.JS: JSZip não está carregado para backup automático.");
            return null;
        }
        if (!dbRef) await init(null, null, window.SEFWorkStation.DB);

        let maxBackupsToKeep = 5; 
        const userPrefs = await window.SEFWorkStation.Configuracoes.carregarUserPreferences();
        if (userPrefs && typeof userPrefs.maxAutoBackups === 'number' && userPrefs.maxAutoBackups >= 0) {
            maxBackupsToKeep = userPrefs.maxAutoBackups;
        }
        
        const storeNamesForBackup = (Array.isArray(storeValuesToInclude) && storeValuesToInclude.length > 0)
            ? storeValuesToInclude.map(val => (window.SEFWorkStation.DB.STORES[val] || val) ).filter(name => name && dbRef.objectStoreNames.contains(name))
            : Array.from(dbRef.objectStoreNames).filter(name => name !== dbRef.STORES.SEQUENCES);

        try {
            const data = await dbRef.exportAllDataToJson(storeNamesForBackup); 
            const zip = new JSZip();
            zip.file("sefworkstation_data.json", JSON.stringify(data));

            const attachmentOwnerStoresMap = {
                [dbRef.STORES.DOCUMENTS]: 'documents', [dbRef.STORES.CONTRIBUINTES]: 'contribuintes', [dbRef.STORES.RECURSOS]: 'recursos',
                [dbRef.STORES.NOTAS_RAPIDAS]: 'notasRapidas', [dbRef.STORES.TAREFAS]: 'tarefas', [dbRef.STORES.PROTOCOLOS]: 'processos/protocolos',
                [dbRef.STORES.PTAS]: 'processos/ptas', [dbRef.STORES.AUTUACOES]: 'processos/autuacoes',
            };

            if (includePhysicalAttachments) {
                if (storeNamesForBackup.some(storeName => attachmentOwnerStoresMap[storeName])) {
                    try {
                        const attachmentsRootSefDir = await appDirectoryHandle.getDirectoryHandle('attachments_sef', { create: false });
                        const attachmentsZipFolder = zip.folder('attachments_sef');
                        for (const storeKeyToBackup in attachmentOwnerStoresMap) {
                            if (storeNamesForBackup.includes(storeKeyToBackup)) {
                                const subFolderPath = attachmentOwnerStoresMap[storeKeyToBackup];
                                try {
                                    let currentDirHandle = attachmentsRootSefDir;
                                    const pathParts = subFolderPath.split('/');
                                    for (const part of pathParts) currentDirHandle = await currentDirHandle.getDirectoryHandle(part, { create: false });
                                    
                                    let zipTargetFolder = attachmentsZipFolder;
                                    pathParts.forEach(part => { zipTargetFolder = zipTargetFolder.folder(part); });
                                    
                                    for await (const entry of currentDirHandle.values()) {
                                         if (entry.kind === 'directory') { 
                                            const idFolderInZip = zipTargetFolder.folder(entry.name);
                                            for await (const fileEntry of entry.values()) { 
                                                if (fileEntry.kind === 'file') {
                                                    try { idFolderInZip.file(fileEntry.name, await fileEntry.getFile()); }
                                                    catch (fileError) { console.warn(`Erro ao adicionar arquivo ${fileEntry.name} ao ZIP:`, fileError); }
                                                }
                                            }
                                        } else if (entry.kind === 'file') { 
                                             try { zipTargetFolder.file(entry.name, await entry.getFile()); }
                                             catch (fileError) { console.warn(`Erro ao adicionar arquivo ${entry.name} ao ZIP:`, fileError); }
                                        }
                                    }
                                } catch (dirError) {
                                    if (dirError.name !== 'NotFoundError') console.warn(`Erro ao acessar subpasta de anexos '${subFolderPath}':`, dirError);
                                }
                            }
                        }
                    } catch (e) {
                        if (e.name !== 'NotFoundError') console.warn("Erro ao acessar pasta 'attachments_sef':", e);
                    }
                }
            }
            
            const itcdStoresIncluded = storeNamesForBackup.includes(dbRef.STORES.ITCD_AVALIACOES) || storeNamesForBackup.includes(dbRef.STORES.ITCD_CALCULOS);
            if(itcdStoresIncluded) {
                await addItcdDataToZip(zip, dbRef);
            }

            const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const zipFileName = `sefworkstation_autobackup_${timestamp}.zip`;

            const backupsDirHandle = await appDirectoryHandle.getDirectoryHandle('backups', { create: true });
            const fileHandle = await backupsDirHandle.getFileHandle(zipFileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(zipBlob);
            await writable.close();

            const includedStoresFriendlyNames = storeValuesToInclude ? storeValuesToInclude.join(', ') : 'Todas';

            await dbRef.addItem(dbRef.STORES.BACKUPS, { 
                backupDate: new Date().toISOString(), type: 'automatic_zip', fileName: `backups/${zipFileName}`, 
                description: `Backup automático ZIP. Stores: ${includedStoresFriendlyNames}. Anexos: ${includePhysicalAttachments ? 'Sim' : 'Não'}.`, status: 'success'
            });

            if (maxBackupsToKeep > 0) {
                const allBackups = await dbRef.getAllItems(dbRef.STORES.BACKUPS); 
                const autoZips = allBackups.filter(b => b.type === 'automatic_zip' && b.status === 'success' && b.fileName?.endsWith('.zip'))
                                         .sort((a, b) => new Date(b.backupDate) - new Date(a, b.backupDate));

                if (autoZips.length > maxBackupsToKeep) {
                    const backupsToDelete = autoZips.slice(maxBackupsToKeep);
                    for (const oldBackup of backupsToDelete) {
                        try {
                            const actualFileName = oldBackup.fileName.startsWith('backups/') ? oldBackup.fileName.substring(8) : oldBackup.fileName;
                            if (actualFileName.endsWith('.zip')) { await backupsDirHandle.removeEntry(actualFileName); }
                        } catch (fileError) {
                            if (fileError.name !== 'NotFoundError') console.warn(`Não foi possível excluir arquivo antigo de backup:`, fileError.message);
                        }
                        await dbRef.deleteItem(dbRef.STORES.BACKUPS, oldBackup.id);
                    }
                }
            }
            return `backups/${zipFileName}`;
        } catch (error) {
            console.error("Erro crítico durante o backup automático:", error);
            await dbRef.addItem(dbRef.STORES.BACKUPS, {
                backupDate: new Date().toISOString(), type: 'automatic_zip', fileName: null, status: 'failed',
                description: `Falha no backup automático ZIP: ${error.message || error}`
            });
            return null;
        }
    }

    return {
        init,
        renderBackupPage,
        renderGerenciarBackupsPage
    };
})();