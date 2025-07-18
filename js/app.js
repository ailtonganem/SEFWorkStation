// js/app.js - Orquestrador Principal e Inicialização da Aplicação SEFWorkStation
// v7.0.0 - NOVO: Implementado backup "inteligente". O sistema agora calcula um hash dos dados e compara com o do último backup, notificando visualmente o usuário se o backup estiver desatualizado.
// v6.0.0 - REATORADO: Removida toda a dependência da File System Access API. A aplicação agora funciona como uma PWA web padrão, usando apenas IndexedDB. Removidas as funções selectAppDirectory, scanAndSyncItcdData, checkAndRunAutoSave e a lógica de verificação de pasta.
// ... (histórico anterior)

const APP_CURRENT_VERSION = "1.5.0"; // Versão incrementada
const LOCAL_STORAGE_LAST_AUTO_BACKUP_KEY = 'sefWorkstationLastAutoBackup';
const LOCAL_STORAGE_LAST_BACKUP_HASH_KEY = 'sefWorkstationLastBackupHash'; // NOVA CHAVE
const NOVA_VERSAO_INFO_KEY = 'sefWorkstationNovaVersaoInfo';
const LIXEIRA_GLOBAL_MODULE_NAME = 'lixeira-global';

// Mapeamento das ações para seus rótulos de exibição
const QUICK_ACCESS_ACTION_MAP = {
    'novo-documento': 'Novo Documento',
    'nova-tarefa': 'Nova Tarefa',
    'novo-contribuinte': 'Novo Contribuinte',
    'nova-nota-rapida': 'Nova Nota Rápida',
    'cadastrar-protocolo': 'Cadastrar Protocolo',
    'cadastrar-pta': 'Cadastrar PTA',
    'cadastrar-autuacao': 'Cadastrar Autuação',
    'itcd-calculo-hub': 'Cálculo de ITCD',
    'escrever-email': 'Escrever Novo E-mail'
};

// Referências de elementos DOM do "shell" da aplicação
let statusArea;
let feedbackArea;
let mainContentWrapperRef;
let updateNotificationAreaEl;
let infoFiltrosAtivosEl, infoTotalDocumentosEl, infoBackupStatusEl, infoSyncStatusEl, infoDbStatusEl, infoLocalStorageStatusEl;
let quickSelectDocumentEl;
let globalSearchInputEl, tipoFilterSelectEl, categoriaFilterSelectEl, tagFilterSelectEl, ordenacaoFilterSelectEl;
let btnQuickSaveDbEl, btnQuickRestoreDbEl;
let userIdentityDisplayEl;
let quickAccessDropdownEl;

// Referências de módulos para orquestração
let ajudaModuleRef;
let servidoresModuleRef;
let comunicacaoModuleRef;
let dashboardModuleRef;
let dashboardWidgetsServidoresModuleRef;
let relatoriosModuleRef;
let sharingModuleRef;
let sharingManagerModuleRef;
let globalSearchModuleRef;
let notificationsModuleRef;
let anexosCentralModuleRef;
let dossieGeneratorModuleRef; 
let itcdModuleRef; 
let itcdListagensModuleRef;
let itcdViewModuleRef;

function showGlobalFeedback(message, type = 'info', targetArea = feedbackArea, duration = 4000) {
    if (window.SEFWorkStation && window.SEFWorkStation.UI && window.SEFWorkStation.UI.showToastNotification) {
        window.SEFWorkStation.UI.showToastNotification(message, type, (type === 'error' || type === 'warning' ? 0 : duration));
        return;
    }
    const feedbackDiv = document.getElementById('feedback-area-global-app') ||
                        (mainContentWrapperRef ? mainContentWrapperRef.querySelector('#feedback-area') : null) ||
                        document.body.appendChild(document.createElement('div'));

    if (!feedbackDiv.id) feedbackDiv.id = 'feedback-area-global-app-fallback';

    feedbackDiv.innerHTML = `<div class="feedback-message ${type}">${message}</div>`;
    feedbackDiv.style.display = 'block';
    if (!feedbackDiv.classList.contains('feedback-message-container-fallback')) {
        feedbackDiv.classList.add('feedback-message-container-fallback');
        feedbackDiv.style.position = 'fixed';
        feedbackDiv.style.top = '20px';
        feedbackDiv.style.left = '50%';
        feedbackDiv.style.transform = 'translateX(-50%)';
        feedbackDiv.style.zIndex = '10002';
        feedbackDiv.style.padding = '1rem';
        feedbackDiv.style.borderRadius = '0.5rem';
        feedbackDiv.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        if (type === 'error') feedbackDiv.style.backgroundColor = '#fff5f5';
        else if (type === 'success') feedbackDiv.style.backgroundColor = '#f0fff4';
        else feedbackDiv.style.backgroundColor = '#ebf8ff';
    }

    if (duration > 0) {
        setTimeout(() => {
            feedbackDiv.innerHTML = '';
            feedbackDiv.style.display = 'none';
        }, duration);
    }
}

function clearGlobalFeedback(targetArea = feedbackArea) {
    const fallbackFeedbackDiv = document.getElementById('feedback-area-global-app-fallback');
    if (fallbackFeedbackDiv) {
        fallbackFeedbackDiv.innerHTML = '';
        fallbackFeedbackDiv.style.display = 'none';
    }
    const legacyFeedbackArea1 = document.getElementById('feedback-area');
    if(legacyFeedbackArea1) {
        legacyFeedbackArea1.innerHTML = '';
        legacyFeedbackArea1.style.display = 'none';
    }
    const legacyFeedbackArea2 = document.getElementById('feedback-area-welcome');
     if(legacyFeedbackArea2) {
        legacyFeedbackArea2.innerHTML = '';
        legacyFeedbackArea2.style.display = 'none';
    }
}

function applyAllFiltersAndRefreshViews(targetView = null, isNavigationAction = true, navData = null) {
    if (!SEFWorkStation.Filtros || !SEFWorkStation.DocumentosListagens) {
        if (quickSelectDocumentEl) updateQuickSelectDropdown();
        return;
    }
    
    const viewToRender = targetView || SEFWorkStation.State.getCurrentView();
    if (mainContentWrapperRef) mainContentWrapperRef.setAttribute('data-current-view', viewToRender);

    const renderLogic = {
        'welcome': () => {
            const rawAllDocs = SEFWorkStation.State.getRawDocs();
            const totalBaseDocsCount = rawAllDocs.filter(doc => !doc.isDeleted && !doc.isTemplate).length;
            updateTotalDocumentsDisplay(undefined, totalBaseDocsCount, false);
            updateQuickSelectDropdown();
            if (dashboardModuleRef?.renderDashboard) dashboardModuleRef.renderDashboard(); else renderWelcomePage();
        },
        'search': () => {
             SEFWorkStation.Documentos.handleMenuAction('gerir-documentos');
        }
    };

    if (renderLogic[viewToRender]) {
        renderLogic[viewToRender]();
    }
}

async function loadAndPrepareAllDocuments(attemptLoadBaseJson = false) {
    const dbRef = SEFWorkStation.State.getDbRef();
    if (!dbRef || typeof db === 'undefined' || !db) {
        showGlobalFeedback("Banco de dados não está pronto.", "error");
        return;
    }
    try {
        let allDocs = await dbRef.getAllItems(dbRef.STORES.DOCUMENTS);
        if (!Array.isArray(allDocs)) allDocs = [];
        
        SEFWorkStation.State.setRawDocs(allDocs);

        if (SEFWorkStation.Filtros) {
            await SEFWorkStation.Filtros.populateTipoFilterDropdown(allDocs);
            await SEFWorkStation.Filtros.populateCategoriaFilterDropdown(allDocs);
            await SEFWorkStation.Filtros.populateTagFilterDropdown(allDocs);
        }
        applyAllFiltersAndRefreshViews(SEFWorkStation.State.getCurrentView(), false);
    } catch (error) {
        showGlobalFeedback("Falha crítica ao carregar documentos.", "error", null, 0);
        console.error("Erro ao carregar e preparar documentos:", error);
        SEFWorkStation.State.setRawDocs([]);
        updateTotalDocumentsDisplay();
        updateQuickSelectDropdown();
    }
}

function updateFilterUI(filters) {
    if(globalSearchInputEl) globalSearchInputEl.value = filters.searchTerm;
    if(tipoFilterSelectEl) tipoFilterSelectEl.value = filters.tipo;
    if(categoriaFilterSelectEl) categoriaFilterSelectEl.value = filters.categoria;
    if(tagFilterSelectEl) tagFilterSelectEl.value = filters.tag;
    if(ordenacaoFilterSelectEl) ordenacaoFilterSelectEl.value = filters.ordenacao;
    if(SEFWorkStation.Filtros) SEFWorkStation.Filtros.updateActiveFiltersDisplayOnHeader(filters);
}

function updateTotalDocumentsDisplay(filteredCount, totalActiveBaseDocsCount, isModelosView = false) {
    if (!infoTotalDocumentosEl) return;
    let text = "";
    const currentView = SEFWorkStation.State.getCurrentView();
    const activeFilters = SEFWorkStation.State.getActiveFilters();

    const eUmaViewDeNaoDocumento = [
        LIXEIRA_GLOBAL_MODULE_NAME, 'configuracoes', 'ajuda', 'backup', 'gerir-backups', 'conversor-json-v2', 'itens-recebidos', 'central-compartilhamento', 'historico-compartilhamento', 'visualizar-detalhes-compartilhamento', 'gerenciar-anexos-central',
        'gerir-servidores', 'calendario-servidores', 'gerir-grupos-servidores', 'visualizar-grupo-servidores', 'form-grupo-servidores',
        'gerir-destinatarios', 'gerir-grupos-destinatarios', 'escrever-email', 'gerir-emails-criados', 'visualizar-email-gerado',
        'relatorios', 'exibir-resultados-globais'
    ].some(v => currentView.startsWith(v));

    if (currentView === 'modelos' || isModelosView) {
        text = `Modelos (Docs): ${filteredCount !== undefined ? filteredCount : totalActiveBaseDocsCount}`;
    } else if (eUmaViewDeNaoDocumento) {
        infoTotalDocumentosEl.textContent = '';
        return;
    } else {
        const hasActiveSearchOrFilter = activeFilters.searchTerm || activeFilters.tipo || activeFilters.categoria || activeFilters.tag;
        const documentListViews = ['gerir', 'search', 'form', 'view', 'tipos', 'categorias', 'tags', 'criar-documentos-lote', 'gerenciar-lotes-documentos'];

        if (documentListViews.includes(currentView) && hasActiveSearchOrFilter) {
             text = `Documentos: ${filteredCount} de ${totalActiveBaseDocsCount}`;
        } else {
             text = `Documentos: ${totalActiveBaseDocsCount}`;
        }
    }
    infoTotalDocumentosEl.textContent = text;
}

function updateQuickSelectDropdown() {
    if (!quickSelectDocumentEl) return;
    const previousValue = quickSelectDocumentEl.value;
    quickSelectDocumentEl.innerHTML = '<option value="">Selecione um documento para acesso rápido...</option>';

    const activeFilters = SEFWorkStation.State.getActiveFilters();
    const currentView = SEFWorkStation.State.getCurrentView();
    const rawAllDocs = SEFWorkStation.State.getRawDocs();

    const filtersForQuickSelect = { ...activeFilters, showDeleted: false, showTemplates: currentView === 'modelos' };

    let docsParaAcessoRapido = SEFWorkStation.Filtros.filterDocuments(rawAllDocs, filtersForQuickSelect, true);

    docsParaAcessoRapido.sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        const dateA = new Date(a.modificationDate || a.creationDate || 0).getTime();
        const dateB = new Date(b.modificationDate || b.creationDate || 0).getTime();
        if (dateA !== dateB) return dateB - dateA;
        return (a.title || "Sem Título").localeCompare(b.title || "Sem Título");
    });

    docsParaAcessoRapido.forEach(doc => {
        const option = document.createElement('option');
        option.value = doc.id;
        option.textContent = doc.isFavorite ? `⭐ ${doc.title || `Ref ${doc.reference || doc.id.toString().substring(0,8)}`}` : (doc.title || `Ref ${doc.reference || doc.id.toString().substring(0,8)}`);
        quickSelectDocumentEl.appendChild(option);
    });

    if (previousValue && quickSelectDocumentEl.querySelector(`option[value="${previousValue}"]`)) {
        quickSelectDocumentEl.value = previousValue;
    } else {
        quickSelectDocumentEl.value = "";
    }
}

/**
 * NOVO: Calcula um hash de todo o banco de dados e compara com o do último backup.
 * Atualiza o indicador visual no cabeçalho da aplicação.
 */
async function updateBackupStatusDisplay() {
    if (!infoBackupStatusEl) return;

    try {
        const dbRef = SEFWorkStation.State.getDbRef();
        if (!dbRef) {
            infoBackupStatusEl.textContent = "Backup: DB não disponível";
            infoBackupStatusEl.style.color = "orange";
            return;
        }

        // Esta função agora está em db.js e retorna o objeto completo com metadata e data.
        const fullDbData = await dbRef.exportAllDataToJson(); 
        
        // O hash é calculado sobre o bloco 'data'.
        const currentDataString = JSON.stringify(fullDbData.data);
        const currentHash = await dbRef._calculateDataHash(currentDataString);
        
        const lastBackupHash = localStorage.getItem(LOCAL_STORAGE_LAST_BACKUP_HASH_KEY);

        if (!lastBackupHash) {
            infoBackupStatusEl.textContent = "Backup: Nunca realizado";
            infoBackupStatusEl.style.color = "orange";
            infoBackupStatusEl.title = "Nenhum backup foi realizado nesta sessão. É recomendável criar um.";
        } else if (currentHash === lastBackupHash) {
            infoBackupStatusEl.textContent = "Backup: Atualizado";
            infoBackupStatusEl.style.color = "lightgreen";
            infoBackupStatusEl.title = "Seus dados estão sincronizados com o último backup.";
        } else {
            infoBackupStatusEl.textContent = "Backup: Desatualizado";
            infoBackupStatusEl.style.color = "yellow";
            infoBackupStatusEl.title = "Existem alterações não salvas. Crie um novo backup.";
        }
    } catch (error) {
        console.error("Erro ao verificar status do backup:", error);
        infoBackupStatusEl.textContent = "Backup: Erro na verificação";
        infoBackupStatusEl.style.color = "red";
    }
}


async function checkAndRunAutoBackup() {
    // A funcionalidade de backup automático é desativada na versão web, conforme plano.
    // Esta função é mantida vazia para evitar erros, mas pode ser removida no futuro.
    await updateBackupStatusDisplay(); 
}

async function refreshApplicationState(fullReload = false) {
    await loadAndPrepareAllDocuments();
    await updateBackupStatusDisplay();
    updateStorageStatusIndicators();
    updateVersionRepositoryLink();
    await populateQuickAccessDropdown(); 

    if (notificationsModuleRef) {
        await notificationsModuleRef.checkAndDisplayNotifications();
    }

    if (SEFWorkStation.Configuracoes?.carregarUserPreferences) {
        SEFWorkStation.State.setUserPreferences(await SEFWorkStation.Configuracoes.carregarUserPreferences());
    }
    
    await checkUserIdentity();

    if (fullReload) {
        window.location.reload();
    } else {
        const currentView = SEFWorkStation.State.getCurrentView();
        applyAllFiltersAndRefreshViews(currentView, false);
    }
}


async function handleGlobalSearch() {
    const searchTerm = globalSearchInputEl.value.trim();
    if (searchTerm.length < 2) {
        showGlobalFeedback("Por favor, digite pelo menos 2 caracteres para buscar.", "info");
        return;
    }
    
    SEFWorkStation.UI.showLoading(true, "Buscando...");

    const dbRef = SEFWorkStation.DB;
    const searchConfig = {
        documents: { store: dbRef.STORES.DOCUMENTS, fields: ['title', 'content', 'reference', 'docType'], flag: 'isDeleted' },
        contribuintes: { store: dbRef.STORES.CONTRIBUINTES, fields: ['nome', 'cpfCnpj', 'numeroIdentificacao', 'email'], flag: 'isDeleted' },
        tarefas: { store: dbRef.STORES.TAREFAS, fields: ['titulo', 'descricaoDetalhada', 'numeroIdentificacao', 'responsavel'], flag: 'isExcluida' },
        notasRapidas: { store: dbRef.STORES.NOTAS_RAPIDAS, fields: ['titulo', 'conteudo'], flag: 'isExcluida' },
        recursos: { store: dbRef.STORES.RECURSOS, fields: ['titulo', 'numeroIdentificacao', 'descricao', 'observacoes'], flag: 'isDeleted' },
        protocolos: { store: dbRef.STORES.PROTOCOLOS, fields: ['numeroProtocolo', 'assunto'], flag: 'isDeleted' },
        ptas: { store: dbRef.STORES.PTAS, fields: ['numeroPTA', 'assuntoPTA'], flag: 'isDeleted' },
        autuacoes: { store: dbRef.STORES.AUTUACOES, fields: ['numeroAutuacao', 'assuntoAutuacao'], flag: 'isDeleted' },
        servidores: { store: dbRef.STORES.SERVIDORES, fields: ['nome', 'matricula', 'email', 'setorLotacao'], flag: 'isDeleted' }
    };
    
    const termLower = searchTerm.toLowerCase();
    const searchPromises = Object.entries(searchConfig).map(async ([key, config]) => {
        try {
            const allItems = await dbRef.getAllItems(config.store);
            const results = allItems.filter(item => 
                !item[config.flag] && 
                config.fields.some(field => 
                    item[field] && String(item[field]).toLowerCase().includes(termLower)
                )
            );
            return { [key]: results };
        } catch (error) {
            console.error(`Erro ao buscar em ${config.store}:`, error);
            return { [key]: [] };
        }
    });

    try {
        const resultsArray = await Promise.all(searchPromises);
        const aggregatedResults = resultsArray.reduce((acc, res) => ({ ...acc, ...res }), {});

        SEFWorkStation.State.resetActiveFilters({ keepSearchTerm: true }); 
        SEFWorkStation.State.updateActiveFilter('searchTerm', searchTerm);
        updateFilterUI(SEFWorkStation.State.getActiveFilters()); 

        updateQuickSelectDropdown(); 

        SEFWorkStation.Navigation.handleMenuAction('exibir-resultados-globais', { searchTerm, results: aggregatedResults });
    } catch (error) {
        showGlobalFeedback("Ocorreu uma falha durante a busca.", "error");
        console.error("Erro na busca global:", error);
    } finally {
        SEFWorkStation.UI.showLoading(false);
    }
}

async function handleQuickRestoreDb() {
    const userConfirmed = await SEFWorkStation.UI.showConfirmationModal(
        'Confirmar Restauração de Base de Dados',
        '<strong>AVISO:</strong> Esta ação substituirá <strong>TODOS</strong> os dados atuais da aplicação. Esta ação é irreversível.',
        'Restaurar Agora', 'Cancelar'
    );
    if (!userConfirmed) {
        showGlobalFeedback("Restauração cancelada.", "info"); return;
    }

    try {
        const [fileHandle] = await window.showOpenFilePicker({ types: [{ description: 'JSON do SEFWorkStation', accept: { 'application/json': ['.json'] } }] });
        showGlobalFeedback("Restaurando dados...", "info", null, 0);
        
        const file = await fileHandle.getFile();
        const jsonData = JSON.parse(await file.text());
        const importResult = await SEFWorkStation.State.getDbRef().importAllDataFromJson(jsonData, 'replace');

        if (importResult.success) {
            showGlobalFeedback("Restauração concluída! Recarregando...", "success", null, 5000);
            setTimeout(() => window.location.reload(), 2000);
        } else {
            throw new Error(importResult.message || "Falha na importação.");
        }
    } catch (error) {
        if (error.name !== 'AbortError') {
            showGlobalFeedback(`Erro na restauração: ${error.message}`, "error", null, 0);
            console.error("Erro na restauração de DB:", error);
        }
    }
}

async function populateQuickAccessDropdown() {
    if (!quickAccessDropdownEl || !SEFWorkStation.Configuracoes) return;

    try {
        const userPrefs = await SEFWorkStation.Configuracoes.carregarUserPreferences();
        const quickAccessItems = userPrefs.quickAccessItems || [];

        quickAccessDropdownEl.innerHTML = ''; // Limpa o menu

        if (quickAccessItems.length === 0) {
            quickAccessDropdownEl.innerHTML = '<div class="px-3 py-2 text-xs text-gray-500">Nenhum atalho configurado.</div>';
            return;
        }

        let needsSeparator1 = false;
        let needsSeparator2 = false;

        quickAccessItems.forEach(actionKey => {
            const label = QUICK_ACCESS_ACTION_MAP[actionKey];
            if (label) {
                // Adiciona o primeiro separador se necessário
                if (actionKey === 'cadastrar-protocolo' && !needsSeparator1) {
                    const firstItemsExist = quickAccessItems.some(item => ['novo-documento', 'nova-tarefa', 'novo-contribuinte', 'nova-nota-rapida'].includes(item));
                    if (firstItemsExist) {
                        const hr = document.createElement('hr');
                        hr.className = 'my-1 border-gray-200 dark:border-slate-600';
                        quickAccessDropdownEl.appendChild(hr);
                        needsSeparator1 = true;
                    }
                }

                // Cria o link da ação
                const link = document.createElement('a');
                link.href = '#';
                link.dataset.action = actionKey;
                link.textContent = label;
                quickAccessDropdownEl.appendChild(link);
            }
        });
        
    } catch (error) {
        console.error("Erro ao popular o menu de Acesso Rápido:", error);
        quickAccessDropdownEl.innerHTML = '<div class="px-3 py-2 text-xs text-red-500">Erro ao carregar atalhos.</div>';
    }
}


function initGlobalKeydownListener() {
    document.addEventListener('keydown', (event) => {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const isCtrlOrCmd = isMac ? event.metaKey : event.ctrlKey;
        const activeElement = document.activeElement;
        const isTyping = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable);

        if ((event.key === '/' && !isTyping) || (isCtrlOrCmd && event.key.toLowerCase() === 'k')) {
            event.preventDefault();
            if (globalSearchInputEl) {
                globalSearchInputEl.focus();
                globalSearchInputEl.select();
            }
        }
        if (isCtrlOrCmd && event.key.toLowerCase() === 's') {
            event.preventDefault();
            const formSaveButton = document.querySelector('.main-content-wrapper form .form-actions .btn-primary');
            const configSaveButton = document.getElementById('btn-salvar-todas-preferencias');
            
            if (formSaveButton && formSaveButton.offsetParent !== null) { 
                formSaveButton.click();
            } else if (configSaveButton && configSaveButton.offsetParent !== null) {
                configSaveButton.click();
            }
        }
        if (event.ctrlKey && event.key === 'Enter') {
            const formSaveButton = document.querySelector('.main-content-wrapper form .form-actions .btn-primary');
             if (formSaveButton && formSaveButton.offsetParent !== null) {
                event.preventDefault();
                formSaveButton.click();
            }
        }
        if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 'n') {
            event.preventDefault();
            SEFWorkStation.Navigation.handleMenuAction('novo-documento');
        }
        if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 't') {
            event.preventDefault();
            SEFWorkStation.Navigation.handleMenuAction('nova-tarefa');
        }
    });
}

function initEventListeners() {
    document.getElementById('home-button').addEventListener('click', SEFWorkStation.Navigation.irParaHome);
    
    document.body.addEventListener('click', (e) => {
        const targetElement = e.target.closest('[data-action]');
        if (targetElement) {
            e.preventDefault();
            const action = targetElement.dataset.action;
            const data = {};
            if(targetElement.dataset.docId) data.docId = targetElement.dataset.docId;
            if(targetElement.dataset.tarefaId) data.tarefaId = targetElement.dataset.tarefaId;
            if(targetElement.dataset.recursoId) data.recursoId = targetElement.dataset.recursoId;

            SEFWorkStation.Navigation.handleMenuAction(action, Object.keys(data).length > 0 ? data : null);
        }
    });

    if (globalSearchInputEl) {
        globalSearchInputEl.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleGlobalSearch(); });
        document.getElementById('global-search-button').addEventListener('click', handleGlobalSearch);
    }
    
    if (tipoFilterSelectEl) tipoFilterSelectEl.addEventListener('change', (e) => { SEFWorkStation.State.updateActiveFilter('tipo', e.target.value); SEFWorkStation.Documentos.handleMenuAction('gerir-documentos'); });
    if (categoriaFilterSelectEl) categoriaFilterSelectEl.addEventListener('change', (e) => { SEFWorkStation.State.updateActiveFilter('categoria', e.target.value); SEFWorkStation.Documentos.handleMenuAction('gerir-documentos'); });
    if (tagFilterSelectEl) tagFilterSelectEl.addEventListener('change', (e) => { SEFWorkStation.State.updateActiveFilter('tag', e.target.value); SEFWorkStation.Documentos.handleMenuAction('gerir-documentos'); });
    if (ordenacaoFilterSelectEl) ordenacaoFilterSelectEl.addEventListener('change', (e) => { SEFWorkStation.State.updateActiveFilter('ordenacao', e.target.value); SEFWorkStation.Documentos.handleMenuAction('gerir-documentos'); });

    if (quickSelectDocumentEl) {
        quickSelectDocumentEl.addEventListener('change', (e) => {
            if (e.target.value) SEFWorkStation.DocumentosView.renderVisualizarDocumentoPage(e.target.value, 'acesso-rapido');
        });
    }
    
    if (btnQuickSaveDbEl) btnQuickSaveDbEl.addEventListener('click', () => {
        SEFWorkStation.State.getDbRef().saveDatabaseToFile(showGlobalFeedback);
    });
    if (btnQuickRestoreDbEl) btnQuickRestoreDbEl.addEventListener('click', handleQuickRestoreDb);

    window.addEventListener('popstate', () => SEFWorkStation.Navigation.navigateBack());
    
    initGlobalKeydownListener();
}

function renderWelcomePage() {
    if (!mainContentWrapperRef) return;
    mainContentWrapperRef.innerHTML = '';

    if (dashboardModuleRef?.renderDashboard) {
        dashboardModuleRef.renderDashboard();
    } else {
        mainContentWrapperRef.innerHTML = `<div class="p-8 text-center"><h1 class="text-2xl font-bold">Bem-vindo ao <span class="text-red-600 font-bold">SEF</span>WorkStation!</h1></div>`;
    }
}

function updateStorageStatusIndicators() {
    if (infoLocalStorageStatusEl) {
        try {
            localStorage.setItem('sefWorkstationTestLS', 'test');
            localStorage.removeItem('sefWorkstationTestLS');
            infoLocalStorageStatusEl.textContent = "LocalStorage: Ativo";
            infoLocalStorageStatusEl.style.color = 'lightgreen';
        } catch (e) {
            infoLocalStorageStatusEl.textContent = "LocalStorage: Erro";
            infoLocalStorageStatusEl.style.color = 'orange';
        }
    }
    if (infoDbStatusEl) {
        if (typeof db !== 'undefined' && db && db.name) {
            infoDbStatusEl.textContent = "IndexedDB: Conectado";
            infoDbStatusEl.style.color = 'lightgreen';
        } else {
            infoDbStatusEl.textContent = "IndexedDB: Verificando...";
            infoDbStatusEl.style.color = '';
        }
    }
}

async function checkVersion(isManual = false) {
    if (!SEFWorkStation.Configuracoes?.carregarDevSettings) return;
    const devSettings = SEFWorkStation.Configuracoes.carregarDevSettings();
    const versionCheckUrl = devSettings.urlVerificacaoVersao;

    if (!versionCheckUrl) {
        if (isManual) showGlobalFeedback("URL de verificação de versão não configurada.", "warning");
        return;
    }

    try {
        const response = await fetch(`${versionCheckUrl}?t=${Date.now()}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const versionInfo = await response.json();
        const currentV = APP_CURRENT_VERSION.split('.').map(Number);
        const remoteV = versionInfo.versao.split('.').map(Number);
        let isNewer = remoteV.some((v, i) => v > (currentV[i] || 0));

        if (isNewer) {
            localStorage.setItem(NOVA_VERSAO_INFO_KEY, JSON.stringify(versionInfo));
            updateNotificationAreaEl.innerHTML = `<a href="#" data-action="configuracoes" class="font-semibold hover:underline">Nova versão ${versionInfo.versao} disponível! Clique para ver.</a>`;
            updateNotificationAreaEl.classList.remove('hidden');
        } else {
            localStorage.removeItem(NOVA_VERSAO_INFO_KEY);
            if (isManual) showGlobalFeedback("Você já está com a versão mais recente.", "info");
        }
    } catch (error) {
        if (isManual) showGlobalFeedback("Erro ao verificar atualizações.", "error");
        console.warn("Erro ao verificar versão:", error);
    }
}

function updateVersionRepositoryLink() {
    const linkElement = document.getElementById('link-repositorio-versoes');
    if (!linkElement || !SEFWorkStation.Configuracoes?.carregarDevSettings) return;
    const repoUrl = SEFWorkStation.Configuracoes.carregarDevSettings().urlRepositorioVersoes;
    linkElement.href = repoUrl || "#";
    linkElement.classList.toggle('opacity-50', !repoUrl);
}

async function checkUserIdentity() {
    if (!updateNotificationAreaEl || !SEFWorkStation.Configuracoes) return;

    const userPrefs = await SEFWorkStation.Configuracoes.carregarUserPreferences();
    if (userIdentityDisplayEl) userIdentityDisplayEl.style.display = 'none';

    if (!userPrefs.currentUserServerId) {
        if(userIdentityDisplayEl) userIdentityDisplayEl.style.display = 'none';
        
        const notificationHtml = `
            <div class="flex items-center text-sm font-semibold text-yellow-800 dark:text-yellow-200 bg-yellow-100 dark:bg-yellow-900/50 px-3 py-1.5 rounded-md">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-exclamation-triangle-fill flex-shrink-0 mr-2" viewBox="0 0 16 16">
                    <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                </svg>
                <span>Nenhum usuário definido. Por favor, vá para <a href="#" data-action="configuracoes" class="font-bold underline hover:text-yellow-600 dark:hover:text-yellow-300">Configurações</a> para selecionar seu perfil.</span>
            </div>
        `;
        updateNotificationAreaEl.innerHTML = notificationHtml;
        updateNotificationAreaEl.classList.remove('hidden');
    } else {
        if(userIdentityDisplayEl) userIdentityDisplayEl.style.display = 'block';

        const novaVersaoInfo = localStorage.getItem(NOVA_VERSAO_INFO_KEY);
        if (!novaVersaoInfo) {
             updateNotificationAreaEl.innerHTML = '';
             updateNotificationAreaEl.classList.add('hidden');
        }

        const userMenuNameEl = document.getElementById('user-menu-name');
        const userDropdownFullnameEl = document.getElementById('user-dropdown-fullname');
        const userDropdownEmailEl = document.getElementById('user-dropdown-email');

        if(userMenuNameEl && userDropdownFullnameEl && userDropdownEmailEl) {
            try {
                const user = await SEFWorkStation.DB.getItemById('servidoresStore', userPrefs.currentUserServerId);
                if (user) {
                    const primeiroNome = user.nome ? user.nome.split(' ')[0] : 'Usuário';
                    userMenuNameEl.textContent = primeiroNome;
                    userMenuNameEl.parentElement.title = `Usuário atual: ${user.nome}`;
                    userDropdownFullnameEl.textContent = user.nome;
                    userDropdownEmailEl.textContent = user.email;
                } else {
                    userMenuNameEl.textContent = 'Usuário não encontrado';
                    userDropdownFullnameEl.textContent = 'Erro';
                    userDropdownEmailEl.textContent = 'Usuário não encontrado no DB.';
                }
            } catch (e) {
                console.error("app.js: Erro ao buscar dados do usuário atual:", e);
                if(userMenuNameEl) userMenuNameEl.textContent = 'Erro ao carregar';
            }
        }
    }
}


async function initApp() {
    mainContentWrapperRef = document.querySelector('.main-content-wrapper');
    statusArea = document.getElementById('status-area');
    feedbackArea = document.getElementById('feedback-area') || document.getElementById('feedback-area-welcome');
    updateNotificationAreaEl = document.getElementById('update-notification-area');
    infoFiltrosAtivosEl = document.getElementById('info-filtros-ativos');
    infoTotalDocumentosEl = document.getElementById('info-total-documentos');
    infoBackupStatusEl = document.getElementById('info-backup-status');
    infoSyncStatusEl = document.getElementById('info-sync-status');
    infoDbStatusEl = document.getElementById('info-db-status');
    infoLocalStorageStatusEl = document.getElementById('info-ls-status');
    quickSelectDocumentEl = document.getElementById('quick-select-document');
    globalSearchInputEl = document.getElementById('global-search-input');
    tipoFilterSelectEl = document.getElementById('filter-tipo-select');
    categoriaFilterSelectEl = document.getElementById('filter-categoria-select');
    tagFilterSelectEl = document.getElementById('filter-tag-select');
    ordenacaoFilterSelectEl = document.getElementById('filter-ordenacao-select');
    btnQuickSaveDbEl = document.getElementById('btn-quick-save-db');
    btnQuickRestoreDbEl = document.getElementById('btn-quick-restore-db');
    userIdentityDisplayEl = document.getElementById('user-identity-display');
    quickAccessDropdownEl = document.getElementById('quick-access-dropdown');
    document.getElementById('app-version-display').textContent = `v${APP_CURRENT_VERSION}`;

    updateStorageStatusIndicators();

    try {
        SEFWorkStation.State.init();
        await SEFWorkStation.DB.initDB();
        SEFWorkStation.State.setDbRef(SEFWorkStation.DB);
        updateStorageStatusIndicators();
        
        SEFWorkStation.Utils.init(SEFWorkStation.DB); 
        
        SEFWorkStation.Configuracoes.init(mainContentWrapperRef, showGlobalFeedback, clearGlobalFeedback, SEFWorkStation.App);
        
        SEFWorkStation.SharedUtils.init(SEFWorkStation.DB, SEFWorkStation.Configuracoes);

        SEFWorkStation.UI.initUI();
        await SEFWorkStation.Preferences.loadAndApplyAllPreferences();
        await populateQuickAccessDropdown(); 

        sharingModuleRef = SEFWorkStation.Sharing; 
        sharingManagerModuleRef = SEFWorkStation.SharingManager; 
        globalSearchModuleRef = SEFWorkStation.GlobalSearch;
        notificationsModuleRef = SEFWorkStation.Notifications;
        anexosCentralModuleRef = SEFWorkStation.AnexosCentral;
        dossieGeneratorModuleRef = SEFWorkStation.DossieGenerator;
        itcdModuleRef = SEFWorkStation.ITCD; 
        itcdListagensModuleRef = SEFWorkStation.ITCD.Listagens;
        itcdViewModuleRef = SEFWorkStation.ITCD.View;
        
        const dbRef = SEFWorkStation.State.getDbRef();

        SEFWorkStation.Backup.init(mainContentWrapperRef, showGlobalFeedback, dbRef);
        SEFWorkStation.ConversorJson.init(mainContentWrapperRef, showGlobalFeedback, clearGlobalFeedback, dbRef, refreshApplicationState);
        dashboardWidgetsServidoresModuleRef = SEFWorkStation.DashboardWidgetsServidores;
        dashboardWidgetsServidoresModuleRef.init(dbRef, SEFWorkStation.App);
        dashboardModuleRef = SEFWorkStation.Dashboard;
        dashboardModuleRef.init(dbRef, SEFWorkStation.App, dashboardWidgetsServidoresModuleRef);
        relatoriosModuleRef = SEFWorkStation.Relatorios;
        relatoriosModuleRef.init(mainContentWrapperRef, showGlobalFeedback, dbRef, SEFWorkStation.App, SEFWorkStation.UI);
        SEFWorkStation.LixeiraGlobal.init(mainContentWrapperRef, dbRef, SEFWorkStation.App, SEFWorkStation.UI, showGlobalFeedback, refreshApplicationState);
        ajudaModuleRef = SEFWorkStation.Ajuda;
        ajudaModuleRef.initAjuda(mainContentWrapperRef, SEFWorkStation.UI, SEFWorkStation.App, SEFWorkStation.AjudaConteudo);
        SEFWorkStation.ItensCompartilhados.init(mainContentWrapperRef, SEFWorkStation.DB, SEFWorkStation.App, SEFWorkStation.SharedUtils, SEFWorkStation.UI);
        sharingModuleRef.init(dbRef, SEFWorkStation.App, SEFWorkStation.SharedUtils, SEFWorkStation.UI);
        sharingManagerModuleRef.init(dbRef, SEFWorkStation.App, SEFWorkStation.SharedUtils, SEFWorkStation.UI, sharingModuleRef);
        globalSearchModuleRef.init(mainContentWrapperRef, showGlobalFeedback, dbRef, SEFWorkStation.App, SEFWorkStation.UI);
        notificationsModuleRef.init(dbRef, SEFWorkStation.App, SEFWorkStation.UI);
        anexosCentralModuleRef.init(mainContentWrapperRef, dbRef, SEFWorkStation.App, SEFWorkStation.UI, showGlobalFeedback);
        dossieGeneratorModuleRef.init(dbRef, SEFWorkStation.App, SEFWorkStation.UI);
        
        if (SEFWorkStation.ITCD.Configuracoes) {
            SEFWorkStation.ITCD.Configuracoes.init(dbRef, SEFWorkStation.App, SEFWorkStation.UI, SEFWorkStation.SharedUtils, mainContentWrapperRef);
        }
        itcdModuleRef.init(dbRef, SEFWorkStation.App, SEFWorkStation.UI, SEFWorkStation.SharedUtils);
        
        if (itcdListagensModuleRef) itcdListagensModuleRef.init(dbRef, SEFWorkStation.App, SEFWorkStation.UI, mainContentWrapperRef);
        if (itcdViewModuleRef) itcdViewModuleRef.init(dbRef, SEFWorkStation.App, SEFWorkStation.UI, mainContentWrapperRef);


        SEFWorkStation.Documentos.init(
            mainContentWrapperRef, showGlobalFeedback, clearGlobalFeedback, 
            SEFWorkStation.Navigation.irParaHome, refreshApplicationState, dbRef,
            SEFWorkStation.DocumentosForm, SEFWorkStation.DocumentosView, SEFWorkStation.DocumentosListagens,
            SEFWorkStation.DocumentosLote, SEFWorkStation.DocumentosLoteListagens,
            SEFWorkStation.DocumentosTipos, SEFWorkStation.DocumentosCategorias, SEFWorkStation.DocumentosTags,
            SEFWorkStation.App, SEFWorkStation.UI,
            sharingModuleRef, SEFWorkStation.SharedUtils
        );
        SEFWorkStation.Contribuintes.init(
            mainContentWrapperRef, showGlobalFeedback, clearGlobalFeedback, SEFWorkStation.Navigation.irParaHome, 
            refreshApplicationState, dbRef, SEFWorkStation.UI, 
            SEFWorkStation.ContribuintesForm, SEFWorkStation.ContribuintesView, SEFWorkStation.ContribuintesListagens, 
            SEFWorkStation.ContribuintesCategorias, SEFWorkStation.ContribuintesTags, SEFWorkStation.ContribuintesPlaceholders, 
            SEFWorkStation.App, sharingModuleRef, SEFWorkStation.SharedUtils,
            dossieGeneratorModuleRef
        );
        servidoresModuleRef = SEFWorkStation.Servidores;
        servidoresModuleRef.init(
            mainContentWrapperRef, showGlobalFeedback, clearGlobalFeedback, 
            (target, dataNav) => SEFWorkStation.Navigation.handleMenuAction(target, dataNav, false), 
            refreshApplicationState, dbRef, SEFWorkStation.UI, 
            SEFWorkStation.ServidoresForm, SEFWorkStation.ServidoresView, SEFWorkStation.ServidoresListagens,
            SEFWorkStation.ServidoresGrupos.Form,       
            SEFWorkStation.ServidoresGrupos.Listagens,  
            SEFWorkStation.ServidoresGrupos.View,       
            SEFWorkStation.ServidoresCalendario, 
            SEFWorkStation.App, 
            sharingModuleRef, 
            SEFWorkStation.SharedUtils
        );
        comunicacaoModuleRef = SEFWorkStation.Comunicacao;
        comunicacaoModuleRef.init(
            mainContentWrapperRef, showGlobalFeedback, clearGlobalFeedback, SEFWorkStation.Navigation.handleMenuAction, 
            refreshApplicationState, dbRef, SEFWorkStation.UI,
            SEFWorkStation.ComunicacaoDestinatariosForm,
            SEFWorkStation.ComunicacaoDestinatariosListagens,
            SEFWorkStation.ComunicacaoDestinatarios.View,
            SEFWorkStation.ComunicacaoGrupos.Form,
            SEFWorkStation.ComunicacaoGrupos.Listagens,
            SEFWorkStation.ComunicacaoGrupos.View,
            SEFWorkStation.ComunicacaoEmailCompositor,
            SEFWorkStation.ComunicacaoEmailVisualizacao, 
            SEFWorkStation.ComunicacaoEmailsGeradosListagens,
            SEFWorkStation.App
        );
        SEFWorkStation.Recursos.init(
            mainContentWrapperRef, showGlobalFeedback, clearGlobalFeedback, SEFWorkStation.Navigation.irParaHome, 
            refreshApplicationState, dbRef, SEFWorkStation.UI, 
            SEFWorkStation.RecursosForm, SEFWorkStation.RecursosView, SEFWorkStation.RecursosListagens, 
            SEFWorkStation.App,
            sharingModuleRef, SEFWorkStation.SharedUtils
        );
        SEFWorkStation.Tarefas.init(
            mainContentWrapperRef, showGlobalFeedback, clearGlobalFeedback, SEFWorkStation.Navigation.irParaHome, 
            refreshApplicationState, dbRef, SEFWorkStation.UI, 
            SEFWorkStation.TarefasForm, SEFWorkStation.TarefasView, SEFWorkStation.TarefasListagens, 
            SEFWorkStation.TarefasCalendario, SEFWorkStation.App, sharingModuleRef, SEFWorkStation.SharedUtils
        );
        SEFWorkStation.NotasRapidas.init(
            mainContentWrapperRef, showGlobalFeedback, clearGlobalFeedback, SEFWorkStation.Navigation.irParaHome, 
            refreshApplicationState, dbRef, SEFWorkStation.UI, 
            SEFWorkStation.NotasRapidasForm, SEFWorkStation.NotasRapidasListagens, SEFWorkStation.NotasRapidasView, 
            null, null, SEFWorkStation.App, sharingModuleRef, SEFWorkStation.SharedUtils
        );
        SEFWorkStation.Processos.init(
            mainContentWrapperRef, showGlobalFeedback, clearGlobalFeedback, dbRef, 
            SEFWorkStation.UI, SEFWorkStation.App, 
            SEFWorkStation.ProtocolosForm, SEFWorkStation.ProtocolosListagens, SEFWorkStation.ProtocolosView, 
            SEFWorkStation.PTAForm, SEFWorkStation.PTAListagens, SEFWorkStation.PTAView, 
            SEFWorkStation.AutuacaoForm, SEFWorkStation.AutuacaoListagens, SEFWorkStation.AutuacaoView,
            sharingModuleRef, SEFWorkStation.SharedUtils
        );
        
        SEFWorkStation.State.setUserPreferences(await SEFWorkStation.Configuracoes.carregarUserPreferences());
        updateVersionRepositoryLink();
        await checkVersion();
        await checkUserIdentity();
        SEFWorkStation.Filtros.initFiltros(tipoFilterSelectEl, categoriaFilterSelectEl, tagFilterSelectEl, ordenacaoFilterSelectEl, infoFiltrosAtivosEl, SEFWorkStation.State.getActiveFilters, applyAllFiltersAndRefreshViews); 

        const moduleMap = {
            'documentos': SEFWorkStation.Documentos,
            'contribuintes': SEFWorkStation.Contribuintes,
            'tarefas': SEFWorkStation.Tarefas,
            'notasRapidas': SEFWorkStation.NotasRapidas,
            'processos': SEFWorkStation.Processos,
            'recursos': SEFWorkStation.Recursos,
            'servidores': servidoresModuleRef,
            'comunicacao': comunicacaoModuleRef,
            'ajuda': ajudaModuleRef,
            'sharing': sharingModuleRef,
            'sharingManager': sharingManagerModuleRef,
            'relatorios': relatoriosModuleRef,
            'globalSearch': globalSearchModuleRef,
            'anexosCentral': anexosCentralModuleRef,
            'dossieGenerator': dossieGeneratorModuleRef,
            'itcd': itcdModuleRef
        };

        SEFWorkStation.Navigation.init({
            applyFiltersAndRefreshViews: applyAllFiltersAndRefreshViews, 
            clearGlobalFeedback,
            updateFilterUI,
            getModuleRef: (name) => moduleMap[name]
        });

        if (dbRef) await loadAndPrepareAllDocuments();
        
        SEFWorkStation.Navigation.irParaHome();
        initEventListeners();
        
        await notificationsModuleRef.checkAndDisplayNotifications();

        console.log("APP.JS: initApp concluído com sucesso.");

    } catch (error) {
        showGlobalFeedback(`Erro fatal na inicialização: ${error.message}.`, "error", null, 0);
        console.error("Erro fatal na inicialização do App:", error, error.stack);
    }
}

async function getUserPreference(key) {
    const userPrefs = SEFWorkStation.State.getUserPreferences();
    if (!userPrefs) {
        if (SEFWorkStation.Configuracoes && typeof SEFWorkStation.Configuracoes.carregarUserPreferences === 'function') {
            const loadedPrefs = await SEFWorkStation.Configuracoes.carregarUserPreferences();
            SEFWorkStation.State.setUserPreferences(loadedPrefs);
            return loadedPrefs[key];
        } else {
            return undefined;
        }
    }
    return userPrefs[key];
}

window.SEFWorkStation.App = {
    refreshApplicationState,
    showGlobalFeedback,
    clearGlobalFeedback,
    updateBackupStatusDisplay,
    updateTotalDocumentsDisplay,
    updateQuickSelectDropdown,
    populateQuickAccessDropdown,
    getUserPreference,
    checkUserIdentity,
    APP_VERSION_DISPLAY: APP_CURRENT_VERSION,
    LOCAL_STORAGE_LAST_BACKUP_HASH_KEY, // Expondo a chave para o db.js
    
    handleMenuAction: (...args) => SEFWorkStation.Navigation.handleMenuAction(...args),
    irParaHome: () => SEFWorkStation.Navigation.irParaHome(),
    navigateBack: () => SEFWorkStation.Navigation.navigateBack(),
    
    generateUUID: () => SEFWorkStation.Utils.generateUUID(),
    generateDocumentReference: (docType) => SEFWorkStation.Utils.generateDocumentReference(docType),
    generateContribuinteNumeroIdentificacao: () => SEFWorkStation.Utils.generateContribuinteNumeroIdentificacao(),
    generateRecursoNumeroIdentificacao: () => SEFWorkStation.Utils.generateRecursoNumeroIdentificacao(),
    generateNotaRapidaNumeroIdentificacao: () => SEFWorkStation.Utils.generateNotaRapidaNumeroIdentificacao(),
    generateTarefaNumeroIdentificacao: () => SEFWorkStation.Utils.generateTarefaNumeroIdentificacao(),
    generateProtocoloNumeroIdentificacao: () => SEFWorkStation.Utils.generateProtocoloNumeroIdentificacao(),
    generatePTANumeroIdentificacao: () => SEFWorkStation.Utils.generatePTANumeroIdentificacao(),
    generateAutuacaoNumeroIdentificacao: () => SEFWorkStation.Utils.generateAutuacaoNumeroIdentificacao(),
    generateServidorMatricula: () => SEFWorkStation.Utils.generateServidorMatricula(),
};

document.addEventListener('DOMContentLoaded', initApp);
