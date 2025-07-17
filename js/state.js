// js/state.js - Gerenciador de Estado Global da Aplicação
// v1.1.0 - Adiciona gestão do sharedFolderHandle para a funcionalidade de compartilhamento.
// v1.0.0.0 - Criação do módulo a partir da refatoração do app.js. Centraliza o estado da aplicação.

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.State = (function() {

    // --- Variáveis de Estado Privadas ---
    let rawAllDocumentsFromDB = [];
    let activeDocumentFilters = {};
    let currentMainListViewTarget = 'welcome';
    let navigationHistory = [];
    let userPreferencesCache = null;
    let directoryHandle = null;
    let sharedFolderHandle = null; // NOVO: Handle para a pasta compartilhada
    let dbRef = null;

    /**
     * Inicializa ou reseta o estado para seus valores padrão.
     */
    function init() {
        // Define o estado inicial dos filtros
        activeDocumentFilters = {
            searchTerm: '',
            tipo: '',
            categoria: '',
            tag: '',
            ordenacao: 'recentes',
            showDeleted: false,
            showTemplates: false
        };
        currentMainListViewTarget = 'welcome';
        navigationHistory = [];
        console.log("STATE.JS: Módulo de Estado inicializado.");
    }

    // --- Getters e Setters ---

    function getRawDocs() { return rawAllDocumentsFromDB; }
    function setRawDocs(docs) { rawAllDocumentsFromDB = Array.isArray(docs) ? docs : []; }

    function getActiveFilters() { return { ...activeDocumentFilters }; }
    function setActiveFilters(filters) { activeDocumentFilters = { ...filters }; }

    function updateActiveFilter(key, value) {
        if (activeDocumentFilters.hasOwnProperty(key)) {
            activeDocumentFilters[key] = value;
        } else {
            console.warn(`STATE.JS: Tentativa de atualizar filtro inexistente: ${key}`);
        }
    }

    function resetActiveFilters(options = {}) {
        const searchTermToKeep = options.keepSearchTerm ? activeDocumentFilters.searchTerm : '';
        init(); // Reseta para os padrões
        activeDocumentFilters.searchTerm = searchTermToKeep;
    }

    function getCurrentView() { return currentMainListViewTarget; }
    function setCurrentView(view) { currentMainListViewTarget = view; }

    function getNavigationHistory() { return [...navigationHistory]; }
    function clearNavigationHistory() { navigationHistory = []; }

    function pushToNavigationHistory(stateObject) {
        const lastHistoryItem = navigationHistory.length > 0 ? navigationHistory[navigationHistory.length - 1] : null;
        // Evita adicionar o mesmo estado consecutivamente
        if (!lastHistoryItem ||
            lastHistoryItem.view !== stateObject.view ||
            JSON.stringify(lastHistoryItem.data) !== JSON.stringify(stateObject.data) ||
            (stateObject.filters && JSON.stringify(lastHistoryItem.filters) !== JSON.stringify(stateObject.filters)) ||
            (!stateObject.filters && lastHistoryItem.filters !== null)
        ) {
            navigationHistory.push(stateObject);
        }
    }

    function popFromNavigationHistory() {
        return navigationHistory.pop();
    }

    function getUserPreferences() { return userPreferencesCache; }
    function setUserPreferences(prefs) { userPreferencesCache = prefs; }

    function getDirectoryHandle() { return directoryHandle; }
    function setDirectoryHandle(handle) { directoryHandle = handle; }
    
    // NOVAS FUNÇÕES PARA A PASTA COMPARTILHADA
    function getSharedFolderHandle() { return sharedFolderHandle; }
    function setSharedFolderHandle(handle) { sharedFolderHandle = handle; }

    function getDbRef() { return dbRef; }
    function setDbRef(ref) { dbRef = ref; }


    // Expõe a API pública do módulo de estado
    return {
        init,
        getRawDocs,
        setRawDocs,
        getActiveFilters,
        setActiveFilters,
        updateActiveFilter,
        resetActiveFilters,
        getCurrentView,
        setCurrentView,
        getNavigationHistory,
        clearNavigationHistory,
        pushToNavigationHistory,
        popFromNavigationHistory,
        getUserPreferences,
        setUserPreferences,
        getDirectoryHandle,
        setDirectoryHandle,
        getSharedFolderHandle, // EXPOSTO
        setSharedFolderHandle, // EXPOSTO
        getDbRef,
        setDbRef
    };

})();