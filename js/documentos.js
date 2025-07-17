// js/documentos.js - Módulo Principal de Documentos
// v22.3.0 - CORREÇÃO: Injeta sharedUtilsRef no documentosFormModuleRef para corrigir ReferenceError.
// v22.2.0 - DEBUG CORRIGIDO: Assume a responsabilidade de renderizar suas próprias listagens, chamando funções de UI expostas pelo app.js.
// ... (histórico anterior)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.Documentos = (function() {
    // Referências para os submódulos
    let documentosFormModuleRef;
    let documentosViewModuleRef;
    let documentosListagensModuleRef;
    let documentosLoteModuleRef;
    let documentosLoteListagensModuleRef;
    let documentosTiposModuleRef;
    let documentosCategoriasModuleRef;
    let documentosTagsModuleRef;

    // Referências globais injetadas
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let dbRef;
    let uiModuleRef;
    let appModuleRef;
    let sharedUtilsRef;
    let sharingModuleRef;


    // Cache para navegação
    let lastRenderedDocListIds = [];
    let lastRenderedOriginatingView = 'gerir'; 

    function init(
        mainWrapper, showFeedbackFunc, clearFeedbackFunc, irParaHomeFunc, refreshFunc, dbModuleRef,
        formModule, viewModule, listagensModule, loteModule, loteListagensModule,
        tiposModule, categoriasModule, tagsModule,
        applicationModuleRef, uiRef, 
        sharingMod, utilsMod 
    ) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedbackFunc;
        globalClearFeedbackRef = clearFeedbackFunc;
        dbRef = dbModuleRef;
        appModuleRef = applicationModuleRef;
        uiModuleRef = uiRef;
        sharingModuleRef = sharingMod;
        sharedUtilsRef = utilsMod;

        documentosFormModuleRef = formModule;
        documentosViewModuleRef = viewModule;
        documentosListagensModuleRef = listagensModule;
        documentosLoteModuleRef = loteModule;
        documentosLoteListagensModuleRef = loteListagensModule;
        documentosTiposModuleRef = tiposModule;
        documentosCategoriasModuleRef = categoriasModule;
        documentosTagsModuleRef = tagsModule;
        
        // Inicializa cada submódulo, passando as dependências necessárias.
        if(documentosFormModuleRef?.init) {
            documentosFormModuleRef.init(
                mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef, irParaHomeFunc, 
                refreshFunc, dbRef, viewModule, appModuleRef, uiModuleRef, sharedUtilsRef // CORREÇÃO: Passando sharedUtilsRef
            );
        }
        if(documentosViewModuleRef?.init) documentosViewModuleRef.init(mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef, irParaHomeFunc, refreshFunc, dbRef, formModule, this, appModuleRef, uiModuleRef, sharingModuleRef, sharedUtilsRef);
        if(documentosListagensModuleRef?.init) documentosListagensModuleRef.init(mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef, irParaHomeFunc, refreshFunc, dbRef, formModule, viewModule, this, uiModuleRef);
        if(documentosLoteModuleRef?.init) documentosLoteModuleRef.init(mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef, refreshFunc, dbRef, appModuleRef);
        if(documentosLoteListagensModuleRef?.init) documentosLoteListagensModuleRef.init(mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef, dbRef, appModuleRef);
        if(documentosTiposModuleRef?.init) documentosTiposModuleRef.init(mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef, refreshFunc, dbRef, appModuleRef);
        if(documentosCategoriasModuleRef?.init) documentosCategoriasModuleRef.init(mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef, refreshFunc, dbRef);
        if(documentosTagsModuleRef?.init) documentosTagsModuleRef.init(mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef, refreshFunc, dbRef);

        console.log("DOCUMENTOS.JS: Módulo Documentos (agregador) inicializado (v22.3.0).");
    }

    // Função de roteamento para as ações do módulo de documentos
    function handleMenuAction(action, data = null) {
        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (uiModuleRef && uiModuleRef.closeAllDropdowns) uiModuleRef.closeAllDropdowns();

        switch (action) {
            case 'novo-documento':
                if (documentosFormModuleRef?.renderNovoDocumentoForm) {
                    documentosFormModuleRef.renderNovoDocumentoForm(null, 'gerir', false, data?.preSelectedLink);
                }
                break;
            
            case 'gerir-documentos':
                if (documentosListagensModuleRef?.renderGerirDocumentosPage) {
                    SEFWorkStation.State.updateActiveFilter('showTemplates', false);
                    SEFWorkStation.State.updateActiveFilter('showDeleted', false);
                    const activeFilters = SEFWorkStation.State.getActiveFilters();
                    const rawAllDocs = SEFWorkStation.State.getRawDocs();
                    const docsParaListagem = SEFWorkStation.Filtros.filterDocuments(rawAllDocs, activeFilters);
                    const totalBaseDocsCount = rawAllDocs.filter(doc => !doc.isDeleted && !doc.isTemplate).length;
                    
                    appModuleRef.updateTotalDocumentsDisplay(docsParaListagem.length, totalBaseDocsCount, false);
                    appModuleRef.updateQuickSelectDropdown();
                    
                    documentosListagensModuleRef.renderGerirDocumentosPage(docsParaListagem, activeFilters);
                }
                break;

            case 'gerenciar-modelos':
                if (documentosListagensModuleRef?.renderGerenciarModelosPage) {
                    SEFWorkStation.State.updateActiveFilter('showTemplates', true);
                    SEFWorkStation.State.updateActiveFilter('showDeleted', false);
                    const activeFilters = SEFWorkStation.State.getActiveFilters();
                    const rawAllDocs = SEFWorkStation.State.getRawDocs();
                    const docsParaModelos = SEFWorkStation.Filtros.filterDocuments(rawAllDocs, activeFilters);
                    const totalBaseModelosCount = rawAllDocs.filter(doc => doc.isTemplate && !doc.isDeleted).length;
                    
                    appModuleRef.updateTotalDocumentsDisplay(docsParaModelos.length, totalBaseModelosCount, true);
                    appModuleRef.updateQuickSelectDropdown();

                    documentosListagensModuleRef.renderGerenciarModelosPage(docsParaModelos, activeFilters);
                }
                break;

            case 'visualizar-documento':
                if (data && data.docId && documentosViewModuleRef?.renderVisualizarDocumentoPage) {
                    documentosViewModuleRef.renderVisualizarDocumentoPage(data.docId, data.originatingView || 'gerir');
                }
                break;
            case 'criar-documentos-lote':
                if (documentosLoteModuleRef?.renderPaginaCriarDocumentosLote) {
                    documentosLoteModuleRef.renderPaginaCriarDocumentosLote();
                }
                break;
            case 'gerenciar-lotes-documentos':
                if (documentosLoteListagensModuleRef?.renderGerenciarLotesPage) {
                    documentosLoteListagensModuleRef.renderGerenciarLotesPage();
                }
                break;
            case 'gerenciar-tipos-documento':
                 if (documentosTiposModuleRef?.renderGerenciarTiposDocumentoPage) {
                    documentosTiposModuleRef.renderGerenciarTiposDocumentoPage();
                }
                break;
            case 'gerenciar-categorias-documento':
                 if (documentosCategoriasModuleRef?.renderGerenciarCategoriasPage) {
                    documentosCategoriasModuleRef.renderGerenciarCategoriasPage();
                }
                break;
            case 'gerenciar-tags-documento':
                 if (documentosTagsModuleRef?.renderGerenciarTagsPage) {
                    documentosTagsModuleRef.renderGerenciarTagsPage();
                }
                break;
            default:
                console.warn(`Documentos.JS: Ação de menu desconhecida: ${action}`);
                if (appModuleRef?.irParaHome) appModuleRef.irParaHome();
                break;
        }
    }

    return {
        init,
        handleMenuAction, // Exporta a função de roteamento
        getLastRenderedOriginatingView: () => lastRenderedOriginatingView,
        setLastRenderedOriginatingView: (view) => { lastRenderedOriginatingView = view; },
        getLastRenderedDocListIds: () => [...lastRenderedDocListIds],
        updateLastRenderedDocListIds: (ids) => { lastRenderedDocListIds = [...(ids || [])]; }
    };
})();