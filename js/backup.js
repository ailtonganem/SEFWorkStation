// js/backup.js - Lógica para Backup e Restauração
// v21.0.0 - NOVO: Implementada a pré-visualização de restauração. Ao selecionar um arquivo, um modal exibe os metadados (versão, data) e a contagem de itens antes da confirmação final, aumentando a segurança da operação.
// v20.0.0 - REATORADO PARA WEB: Removida a lógica de acesso ao sistema de arquivos. O backup agora gera um ZIP em memória com TODOS os dados do IndexedDB e o oferece para download. A interface foi simplificada para um backup completo. O backup automático foi desativado.
// ... (histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.Backup = (function() {
    let mainContentWrapperRef;
    let showGlobalFeedbackRef;
    let dbRef;
    let ajudaModuleRef;
    let uiModuleRef; // Adicionando referência ao módulo de UI

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
        uiModuleRef = window.SEFWorkStation.UI;
        
        if (!dbRef) console.error("Backup.JS: init - ERRO CRÍTICO: Referência ao módulo DB (dbRef) não fornecida ou é inválida!");
        if (!uiModuleRef) console.warn("Backup.JS: init - Módulo de UI não encontrado.");
        if (!ajudaModuleRef) console.warn("Backup.JS: init - Módulo de Ajuda não encontrado.");

        console.log("Backup.JS: Módulo de Backup inicializado (v21.0.0).");
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
                        <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">
                            Selecione um arquivo de backup (.zip ou .json) para iniciar o processo de restauração.
                        </p>
                        <input type="file" id="backup-file-input" class="hidden" accept=".zip,.json">
                        <div class="mt-auto">
                           <button id="btn-select-restore-file" class="btn-primary bg-green-600 hover:bg-green-700">Selecionar Arquivo de Backup</button>
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
        const btnSelectRestoreFile = document.getElementById('btn-select-restore-file');
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
                    const zipFileName = await dbRef.performSelectiveZipBackup(null); // Passar null para usar todas as stores dinamicamente
                    
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
        
        if (btnSelectRestoreFile && backupFileInput) {
            btnSelectRestoreFile.addEventListener('click', () => backupFileInput.click());
            
            backupFileInput.addEventListener('change', async (event) => {
                const file = event.target.files[0];
                if (!file) return;

                uiModuleRef.showLoading(true, "Analisando arquivo de backup...");
                try {
                    let jsonData;
                    if (file.name.endsWith('.zip')) {
                        if (typeof JSZip === 'undefined') throw new Error("JSZip não carregado.");
                        const jszip = new JSZip();
                        const zipContent = await jszip.loadAsync(file);
                        const jsonFileInZip = zipContent.file('sefworkstation_data.json');
                        if (!jsonFileInZip) throw new Error("Arquivo 'sefworkstation_data.json' não encontrado no ZIP.");
                        jsonData = JSON.parse(await jsonFileInZip.async('string'));
                    } else if (file.name.endsWith('.json')) {
                        jsonData = JSON.parse(await file.text());
                    } else {
                        throw new Error("Formato de arquivo não suportado. Selecione um .zip ou .json.");
                    }

                    if (!jsonData) throw new Error("Não foi possível obter dados do backup.");

                    _showRestorePreviewModal(jsonData, file.name);

                } catch (error) {
                    console.error("Backup.JS: Erro ao analisar o arquivo de backup:", error);
                    showGlobalFeedbackRef(`Erro ao analisar o arquivo: ${error.message}`, 'error', feedbackDisplayArea, 0);
                } finally {
                    uiModuleRef.showLoading(false);
                    event.target.value = ''; // Limpa o input para permitir selecionar o mesmo arquivo novamente
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

    async function _showRestorePreviewModal(jsonData, fileName) {
        const metadata = jsonData.metadata || {};
        const data = jsonData.data || jsonData; // Compatibilidade com formato antigo

        const counts = {
            Documentos: data.documents?.length || 0,
            Contribuintes: data.contribuintes?.length || 0,
            Tarefas: data.tarefasStore?.length || 0,
            Notas: data.notasRapidasStore?.length || 0,
            Avaliações: data.itcdAvaliacoesStore?.length || 0,
            Cálculos: data.itcdCalculosStore?.length || 0
        };

        const countsHtml = Object.entries(counts)
            .filter(([, count]) => count > 0)
            .map(([name, count]) => `<div class="info-item"><dt>${name}:</dt><dd>${count}</dd></div>`)
            .join('');

        const modalContentHtml = `
            <div id="feedback-restore-modal"></div>
            <div class="mb-4">
                <p class="text-sm text-gray-600 dark:text-gray-300">Você está prestes a restaurar os dados do arquivo:</p>
                <p class="font-semibold text-gray-800 dark:text-gray-100">${fileName}</p>
            </div>
            <div class="card p-3 mb-4">
                <h4 class="text-md font-medium mb-2">Resumo do Backup</h4>
                <dl class="card-dl-grid">
                    <div class="info-item"><dt>Versão do App:</dt><dd>${metadata.appVersion || 'Desconhecida (formato antigo)'}</dd></div>
                    <div class="info-item"><dt>Data de Criação:</dt><dd>${metadata.exportDate ? new Date(metadata.exportDate).toLocaleString() : 'Desconhecida'}</dd></div>
                    <div class="info-item"><dt>Validação:</dt><dd class="${metadata.dataHash ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}">${metadata.dataHash ? 'Verificável' : 'Não Verificável'}</dd></div>
                </dl>
                ${countsHtml ? `<h5 class="text-sm font-medium mt-3 pt-2 border-t dark:border-slate-600">Itens Principais:</h5><dl class="card-dl-grid">${countsHtml}</dl>` : ''}
            </div>

            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Modo de Importação:</label>
                <div class="flex items-center gap-4">
                    <label class="inline-flex items-center"><input type="radio" name="import-mode-modal" value="replace" class="form-radio" checked><span class="ml-2 text-sm">Substituir Dados Atuais</span></label>
                    <label class="inline-flex items-center"><input type="radio" name="import-mode-modal" value="merge" class="form-radio"><span class="ml-2 text-sm">Mesclar com Dados Atuais</span></label>
                </div>
            </div>
            <p class="text-xs text-red-600 dark:text-red-400">
                <strong>Atenção:</strong> "Substituir" apagará os dados existentes. "Mesclar" sobrescreverá itens com o mesmo ID. Esta ação não pode ser desfeita.
            </p>
        `;

        uiModuleRef.showModal("Revisão de Restauração", modalContentHtml, [
            { text: 'Cancelar', class: 'btn-secondary', closesModal: true },
            {
                text: 'Confirmar e Restaurar',
                class: 'btn-delete',
                callback: async () => {
                    const importMode = document.querySelector('input[name="import-mode-modal"]:checked')?.value || 'replace';
                    uiModuleRef.showLoading(true, `Restaurando (Modo: ${importMode})...`);
                    
                    try {
                        const importResult = await dbRef.importAllDataFromJson(jsonData, importMode);

                        if (importResult && importResult.success) {
                            showGlobalFeedbackRef(`Restauração concluída! ${importResult.message || ''} A aplicação será recarregada.`, "success", null, 5000);
                            setTimeout(() => window.location.reload(), 2500);
                        } else {
                            const errorMsg = importResult.message || `Falha na restauração. Verifique o console.`;
                            const feedbackEl = document.getElementById('feedback-restore-modal');
                            if (feedbackEl) {
                                feedbackEl.innerHTML = `<div class="feedback-message error">${errorMsg}</div>`;
                            } else {
                                showGlobalFeedbackRef(errorMsg, "error", null, 0);
                            }
                            return false; // Não fechar o modal em caso de erro
                        }
                    } catch (error) {
                         const feedbackEl = document.getElementById('feedback-restore-modal');
                         if (feedbackEl) {
                             feedbackEl.innerHTML = `<div class="feedback-message error">Erro crítico: ${error.message}</div>`;
                         } else {
                            showGlobalFeedbackRef(`Erro crítico na restauração: ${error.message}`, "error", null, 0);
                         }
                         return false;
                    } finally {
                        uiModuleRef.showLoading(false);
                    }
                    return true; // Fechar modal em caso de sucesso
                }
            }
        ], 'max-w-lg');
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
    };
})();
