// js/contribuintes.js - Módulo Principal de Contribuintes
// v2.5.0 - Adiciona e propaga a dependência do dossieGeneratorModuleRef.
// v2.4.3 - CORREÇÃO: Recebe e propaga as dependências de compartilhamento para o submódulo de visualização.
// v2.4.2 - CORREÇÃO: Remove chamadas obsoletas para appModuleRef.setCurrentViewTarget.
// ... (histórico anterior)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.Contribuintes = (function() {
    let contribuintesFormModuleRef;
    let contribuintesViewModuleRef;
    let contribuintesListagensModuleRef;
    let contribuintesCategoriasModuleRef;
    let contribuintesTagsModuleRef;
    let contribuintesPlaceholdersModuleRef; 
    let dossieGeneratorModuleRef; // NOVO

    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let globalIrParaHomeRef;
    let refreshApplicationStateRef;
    let dbRef;
    let uiModuleRef; 
    let appModuleRef;
    let sharingModuleRef; 
    let sharedUtilsRef;

    function init(
        mainWrapper,
        showFeedbackFunc,
        clearFeedbackFunc,
        irParaHomeFunc,
        refreshFunc,
        dbModuleRef,
        uiRef, 
        formModule, 
        viewModule, 
        listagensModule,
        categoriasModule,
        tagsModule,
        placeholdersModule, 
        applicationModuleRef,
        sharingMod,
        utilsMod,
        dossieGeneratorMod // NOVO PARÂMETRO
    ) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedbackFunc;
        globalClearFeedbackRef = clearFeedbackFunc;
        globalIrParaHomeRef = irParaHomeFunc;
        refreshApplicationStateRef = refreshFunc;
        dbRef = dbModuleRef;
        uiModuleRef = uiRef; 
        appModuleRef = applicationModuleRef;
        sharingModuleRef = sharingMod;
        sharedUtilsRef = utilsMod;
        dossieGeneratorModuleRef = dossieGeneratorMod; // NOVO

        contribuintesFormModuleRef = formModule;
        contribuintesViewModuleRef = viewModule;
        contribuintesListagensModuleRef = listagensModule;
        contribuintesCategoriasModuleRef = categoriasModule;
        contribuintesTagsModuleRef = tagsModule;
        contribuintesPlaceholdersModuleRef = placeholdersModule;

        if (!mainContentWrapperRef) console.error("Contribuintes.JS: init - mainContentWrapperRef não fornecido.");
        if (!globalShowFeedbackRef) console.error("Contribuintes.JS: init - globalShowFeedbackRef não fornecido.");
        if (!dbRef) console.error("Contribuintes.JS: init - dbRef não fornecido.");
        if (!uiModuleRef) console.warn("Contribuintes.JS: init - uiRef (SEFWorkStation.UI) é undefined ao inicializar Contribuintes!");
        if (!appModuleRef) console.error("Contribuintes.JS: init - appModuleRef (applicationModuleRef) não fornecido.");
        if (!contribuintesFormModuleRef) console.error("Contribuintes.JS: init - Módulo de Formulário de Contribuintes não fornecido.");
        if (!contribuintesViewModuleRef) console.error("Contribuintes.JS: init - Módulo de Visualização de Contribuintes não fornecido.");
        if (!contribuintesListagensModuleRef) console.error("Contribuintes.JS: init - Módulo de Listagens de Contribuintes não fornecido.");
        if (!contribuintesCategoriasModuleRef) console.error("Contribuintes.JS: init - Módulo de Categorias de Contribuintes não fornecido.");
        if (!contribuintesTagsModuleRef) console.error("Contribuintes.JS: init - Módulo de Tags de Contribuintes não fornecido.");
        if (!contribuintesPlaceholdersModuleRef) console.error("Contribuintes.JS: init - Módulo de Placeholders de Contribuintes não fornecido.");


        if (contribuintesFormModuleRef && contribuintesFormModuleRef.init) {
            contribuintesFormModuleRef.init(
                mainContentWrapperRef,
                globalShowFeedbackRef,
                globalClearFeedbackRef,
                globalIrParaHomeRef, 
                refreshApplicationStateRef, 
                dbRef,
                appModuleRef, 
                uiModuleRef,
                contribuintesViewModuleRef 
            );
        }

        if (contribuintesViewModuleRef && typeof contribuintesViewModuleRef.init === 'function') {
            contribuintesViewModuleRef.init(
                mainContentWrapperRef,        
                globalShowFeedbackRef,      
                globalClearFeedbackRef,     
                globalIrParaHomeRef,        
                (contribuinteDataToEdit, originatingViewFromView) => { 
                    if (contribuintesFormModuleRef && typeof contribuintesFormModuleRef.renderNovoContribuinteForm === 'function') {
                        contribuintesFormModuleRef.renderNovoContribuinteForm(contribuinteDataToEdit, originatingViewFromView || 'view-contribuinte');
                    }
                },
                refreshApplicationStateRef, 
                dbRef,                      
                appModuleRef,               
                uiModuleRef,
                sharingModuleRef,
                sharedUtilsRef,
                dossieGeneratorModuleRef // NOVO PARÂMETRO PASSADO
            );
        }

        if (contribuintesListagensModuleRef && contribuintesListagensModuleRef.init) {
            contribuintesListagensModuleRef.init(
                mainContentWrapperRef,
                globalShowFeedbackRef,
                globalClearFeedbackRef,
                (action, data) => handleMenuAction(action, data),
                refreshApplicationStateRef,
                dbRef,
                appModuleRef, 
                contribuintesFormModuleRef, 
                contribuintesViewModuleRef, 
                uiModuleRef
            );
        }

        if (contribuintesCategoriasModuleRef && contribuintesCategoriasModuleRef.init) {
            contribuintesCategoriasModuleRef.init(
                mainContentWrapperRef,
                globalShowFeedbackRef,
                globalClearFeedbackRef,
                refreshApplicationStateRef, 
                dbRef,
                appModuleRef 
            );
        }
        if (contribuintesTagsModuleRef && contribuintesTagsModuleRef.init) {
            contribuintesTagsModuleRef.init(
                mainContentWrapperRef,
                globalShowFeedbackRef,
                globalClearFeedbackRef,
                refreshApplicationStateRef, 
                dbRef,
                appModuleRef 
            );
        }
        if (contribuintesPlaceholdersModuleRef && contribuintesPlaceholdersModuleRef.init) {
            contribuintesPlaceholdersModuleRef.init(
                mainContentWrapperRef,
                globalShowFeedbackRef,
                globalClearFeedbackRef,
                refreshApplicationStateRef, 
                dbRef,
                appModuleRef
            );
        }

        console.log("Contribuintes.JS: Módulo Principal de Contribuintes inicializado (v2.5.0).");
    }

    function handleMenuAction(action, data = null) {
        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (uiModuleRef && uiModuleRef.closeAllDropdowns) uiModuleRef.closeAllDropdowns();

        switch (action) {
            case 'novo-contribuinte':
                if (contribuintesFormModuleRef && contribuintesFormModuleRef.renderNovoContribuinteForm) {
                    contribuintesFormModuleRef.renderNovoContribuinteForm(null, 'gerir-contribuintes', data?.preSelectedLink || null);
                } else {
                    console.error("Contribuintes.JS: Ação 'novo-contribuinte' chamada, mas módulo de formulário ou função não encontrados.");
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Erro ao tentar abrir o formulário de novo contribuinte.", "error");
                }
                break;
            case 'gerir-contribuintes':
                if (contribuintesListagensModuleRef && contribuintesListagensModuleRef.renderGerirContribuintesPage) {
                    contribuintesListagensModuleRef.renderGerirContribuintesPage();
                } else {
                    console.error("Contribuintes.JS: Ação 'gerir-contribuintes' chamada, mas módulo de listagens ou função não encontrados.");
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Erro ao tentar abrir a gestão de contribuintes.", "error");
                }
                break;
            case 'visualizar-contribuinte': 
                if (data && data.contribuinteId && contribuintesViewModuleRef && contribuintesViewModuleRef.renderVisualizarContribuintePage) {
                    contribuintesViewModuleRef.renderVisualizarContribuintePage(data.contribuinteId, data.originatingView || 'gerir-contribuintes');
                } else {
                    console.error("Contribuintes.JS: 'visualizar-contribuinte' chamado sem contribuinteId ou módulo de view indisponível.");
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Erro ao tentar visualizar o contribuinte.", "error");
                }
                break;
            case 'gerir-categorias-contribuintes':
                if (contribuintesCategoriasModuleRef && contribuintesCategoriasModuleRef.renderGerenciarCategoriasContribuintesPage) {
                    contribuintesCategoriasModuleRef.renderGerenciarCategoriasContribuintesPage();
                } else {
                    console.error("Contribuintes.JS: Ação 'gerir-categorias-contribuintes' chamada, mas módulo ou função não encontrados.");
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Erro ao tentar abrir a gestão de categorias de contribuintes.", "error");
                }
                break;
            case 'gerir-tags-contribuintes':
                if (contribuintesTagsModuleRef && contribuintesTagsModuleRef.renderGerenciarTagsContribuintesPage) {
                    contribuintesTagsModuleRef.renderGerenciarTagsContribuintesPage();
                } else {
                    console.error("Contribuintes.JS: Ação 'gerir-tags-contribuintes' chamada, mas módulo ou função não encontrados.");
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Erro ao tentar abrir a gestão de tags de contribuintes.", "error");
                }
                break;
            case 'gerir-contribuintes-placeholders': 
                if (window.SEFWorkStation.ContribuintesPlaceholders && window.SEFWorkStation.ContribuintesPlaceholders.renderGerenciarPlaceholdersPage) {
                    window.SEFWorkStation.ContribuintesPlaceholders.renderGerenciarPlaceholdersPage();
                } else {
                    console.error("Contribuintes.JS: Ação 'gerir-contribuintes-placeholders' chamada, mas módulo ou função não encontrados.");
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Erro: Funcionalidade de Placeholders de Contribuinte não está pronta.", "error");
                }
                break;
            default:
                console.warn(`Contribuintes.JS: Ação de menu desconhecida: ${action}`);
                if (appModuleRef && appModuleRef.irParaHome) appModuleRef.irParaHome();
                break;
        }
    }

    return {
        init,
        handleMenuAction
    };
})();