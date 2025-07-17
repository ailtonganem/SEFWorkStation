// js/recursos.js - Módulo Principal de Recursos
// v1.5.0 - CORREÇÃO: Garante a injeção explícita da dependência uiModuleRef para todos os submódulos (Form, Listagens e View), resolvendo bugs de botões inoperantes e inconsistências.
// v1.4.0 - CORREÇÃO: Garante que o submódulo de formulário (recursosFormModuleRef) receba todas as dependências necessárias.
// v1.3.2 - CORREÇÃO: Garante que o submódulo de formulário (recursosFormModuleRef) receba todas as dependências necessárias.
// v1.3.1 - CORREÇÃO: Recebe e propaga corretamente as dependências de compartilhamento para o submódulo de visualização.

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.Recursos = (function() {
    let recursosFormModuleRef;
    let recursosViewModuleRef;
    let recursosListagensModuleRef;

    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let globalIrParaHomeRef;
    let refreshApplicationStateRef;
    let dbRef;
    let uiModuleRef;
    let appModuleRefLocal;
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
        applicationModuleRef,
        sharingMod, 
        utilsMod    
    ) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedbackFunc;
        globalClearFeedbackRef = clearFeedbackFunc;
        globalIrParaHomeRef = irParaHomeFunc;
        refreshApplicationStateRef = refreshFunc;
        dbRef = dbModuleRef;
        uiModuleRef = uiRef;
        appModuleRefLocal = applicationModuleRef;
        sharingModuleRef = sharingMod; 
        sharedUtilsRef = utilsMod;     

        recursosFormModuleRef = formModule;
        recursosViewModuleRef = viewModule;
        recursosListagensModuleRef = listagensModule;

        if (!mainContentWrapperRef) console.error("Recursos.JS: init - mainContentWrapperRef não fornecido.");
        if (!dbRef) console.error("Recursos.JS: init - dbRef não fornecido.");
        if (!uiModuleRef) console.error("Recursos.JS: init - uiModuleRef não fornecido.");
        if (!appModuleRefLocal) console.error("Recursos.JS: init - applicationModuleRef (appModuleRefLocal) não fornecido!");
        if (!recursosFormModuleRef) console.error("Recursos.JS: init - Módulo de Formulário de Recursos não fornecido.");
        if (!recursosViewModuleRef) console.error("Recursos.JS: init - Módulo de Visualização de Recursos não fornecido.");
        if (!recursosListagensModuleRef) console.error("Recursos.JS: init - Módulo de Listagens de Recursos não fornecido.");

        // CORREÇÃO: Passando a referência do módulo de UI para todos os submódulos que o necessitam.
        if (recursosFormModuleRef && recursosFormModuleRef.init) {
            recursosFormModuleRef.init(
                mainContentWrapperRef,
                globalShowFeedbackRef,
                globalClearFeedbackRef,
                globalIrParaHomeRef,
                refreshApplicationStateRef,
                dbRef,
                recursosViewModuleRef, 
                appModuleRefLocal,
                uiModuleRef 
            );
        }

        if (recursosViewModuleRef && typeof recursosViewModuleRef.init === 'function') {
            recursosViewModuleRef.init(
                mainContentWrapperRef,        
                globalShowFeedbackRef,      
                globalClearFeedbackRef,     
                globalIrParaHomeRef,
                (recursoData, originatingView) => { 
                    if (recursosFormModuleRef && recursosFormModuleRef.renderNovoRecursoForm) {
                        recursosFormModuleRef.renderNovoRecursoForm(recursoData, originatingView || 'view-recurso');
                    }
                },
                refreshApplicationStateRef, 
                dbRef,                      
                appModuleRefLocal,               
                uiModuleRef, // Passando a dependência
                sharingModuleRef,
                sharedUtilsRef
            );
        }

        if (recursosListagensModuleRef && recursosListagensModuleRef.init) {
            recursosListagensModuleRef.init(
                mainContentWrapperRef,
                globalShowFeedbackRef,
                globalClearFeedbackRef,
                globalIrParaHomeRef,
                refreshApplicationStateRef,
                dbRef,
                recursosFormModuleRef, 
                recursosViewModuleRef, 
                uiModuleRef,
                appModuleRefLocal
            );
        }

        console.log("Recursos.JS: Módulo Principal de Recursos inicializado (v1.5.0).");
    }

    function handleMenuAction(action, data = null) { 
        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (uiModuleRef && uiModuleRef.closeAllDropdowns) uiModuleRef.closeAllDropdowns();

        switch (action) {
            case 'novo-recurso':
                if (recursosFormModuleRef && recursosFormModuleRef.renderNovoRecursoForm) {
                    recursosFormModuleRef.renderNovoRecursoForm(null, 'gerir-recursos', data ? data.preSelectedLink : null);
                } else {
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Erro ao tentar abrir o formulário de novo recurso.", "error");
                }
                break;
            case 'gerir-recursos':
                if (recursosListagensModuleRef && recursosListagensModuleRef.renderGerirRecursosPage) {
                    recursosListagensModuleRef.renderGerirRecursosPage();
                } else {
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Erro ao tentar abrir a gestão de recursos.", "error");
                }
                break;
            // A ação 'visualizar-recurso' é roteada para RecursosListagens e tratada lá.
            default:
                if (globalIrParaHomeRef) globalIrParaHomeRef();
                break;
        }
    }

    return {
        init,
        handleMenuAction
    };
})();