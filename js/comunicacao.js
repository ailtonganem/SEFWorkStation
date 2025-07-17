// js/comunicacao.js - Módulo Principal de Comunicação
// v1.4.0 - REFATORADO: Elimina módulos agregadores intermediários (Destinatarios, Grupos) e assume o controle direto de todos os submódulos, corrigindo a cadeia de dependências e bugs de inicialização.
// v1.3.3 - CORREÇÃO: Remove chamadas obsoletas para setCurrentViewTarget.
// v1.3.2 (CORRIGIDO) - Remove chamadas obsoletas para setCurrentViewTarget.
// v1.3.1 - Passa o submódulo ComunicacaoGrupos.View para o init do agregador de grupos.
// v1.3.0 - Passa o submódulo ComunicacaoDestinatarios.View para o init do agregador de destinatários.
// ... (histórico anterior)

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.Comunicacao = window.SEFWorkStation.Comunicacao || {}; 

(function(ComunicacaoPrincipal) { 
    let _comunicacaoInternalAppModuleRef;
    let mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef, navigateToAppViewRef, refreshApplicationStateRef, dbRef, uiModuleRef;
    
    // Referências diretas para todos os submódulos
    let destinatariosFormModuleRef;
    let destinatariosListagensModuleRef;
    let destinatariosViewModuleRef;
    let gruposFormModuleRef;
    let gruposListagensModuleRef;
    let gruposViewModuleRef;
    let emailCompositorModuleRef;
    let emailVisualizacaoModuleRef;
    let emailsGeradosListagensModuleRef;

    function init(
        mainWrapper, showFeedbackFunc, clearFeedbackFunc, navigateToFunc, refreshFunc, dbModuleRef, uiRef,
        destFormModule, destListagensModule, destViewModule,
        grupFormModule, grupListagensModule, grupViewModule,
        compModule, visModule, geradosListagensModule,
        applicationModuleRefParam
    ) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedbackFunc;
        globalClearFeedbackRef = clearFeedbackFunc;
        navigateToAppViewRef = navigateToFunc; 
        refreshApplicationStateRef = refreshFunc;
        dbRef = dbModuleRef;
        uiModuleRef = uiRef;
        _comunicacaoInternalAppModuleRef = applicationModuleRefParam;

        // Atribuição direta dos submódulos
        destinatariosFormModuleRef = destFormModule;
        destinatariosListagensModuleRef = destListagensModule;
        destinatariosViewModuleRef = destViewModule;
        gruposFormModuleRef = grupFormModule;
        gruposListagensModuleRef = grupListagensModule;
        gruposViewModuleRef = grupViewModule;
        emailCompositorModuleRef = compModule;
        emailVisualizacaoModuleRef = visModule;
        emailsGeradosListagensModuleRef = geradosListagensModule;
        
        if (!dbRef) console.error("Comunicacao.JS (Principal): init - dbRef não fornecido.");
        if (!_comunicacaoInternalAppModuleRef) console.error("Comunicacao.JS (Principal): init - _comunicacaoInternalAppModuleRef (applicationModuleRef) não fornecido.");
        
        // Inicialização de cada submódulo
        destinatariosFormModuleRef?.init(mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef, navigateToAppViewRef, refreshApplicationStateRef, dbRef, _comunicacaoInternalAppModuleRef, uiModuleRef);
        destinatariosListagensModuleRef?.init(mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef, navigateToAppViewRef, refreshApplicationStateRef, dbRef, _comunicacaoInternalAppModuleRef, uiModuleRef, destinatariosFormModuleRef);
        destinatariosViewModuleRef?.init(mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef, navigateToAppViewRef, refreshApplicationStateRef, dbRef, _comunicacaoInternalAppModuleRef, uiModuleRef);

        gruposFormModuleRef?.init(mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef, navigateToAppViewRef, refreshApplicationStateRef, dbRef, _comunicacaoInternalAppModuleRef, uiModuleRef);
        gruposListagensModuleRef?.init(mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef, navigateToAppViewRef, refreshApplicationStateRef, dbRef, _comunicacaoInternalAppModuleRef, uiModuleRef, gruposFormModuleRef);
        gruposViewModuleRef?.init(mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef, navigateToAppViewRef, refreshApplicationStateRef, dbRef, _comunicacaoInternalAppModuleRef, uiModuleRef);
        
        emailCompositorModuleRef?.init(mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef, navigateToAppViewRef, refreshApplicationStateRef, dbRef, _comunicacaoInternalAppModuleRef, uiModuleRef);
        emailVisualizacaoModuleRef?.init(mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef, navigateToAppViewRef, dbRef, _comunicacaoInternalAppModuleRef, uiModuleRef);
        emailsGeradosListagensModuleRef?.init(mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef, navigateToAppViewRef, refreshApplicationStateRef, dbRef, _comunicacaoInternalAppModuleRef, uiModuleRef);
        
        console.log("Comunicacao.JS: Módulo Principal de Comunicação inicializado (v1.4.0).");
    }

    function handleMenuAction(action, data = null) {
        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (uiModuleRef && typeof uiModuleRef.closeAllDropdowns === 'function') {
            uiModuleRef.closeAllDropdowns();
        }

        const destinatariosActions = ['novo-destinatario', 'gerir-destinatarios', 'visualizar-destinatario', 'form-destinatario'];
        const gruposActions = ['novo-grupo-destinatarios', 'gerir-grupos-destinatarios', 'visualizar-grupo-destinatarios', 'form-grupo-destinatarios'];
        const emailActions = ['escrever-email', 'gerir-emails-criados', 'visualizar-email-gerado'];

        if (destinatariosActions.includes(action)) {
            switch (action) {
                case 'novo-destinatario':
                case 'form-destinatario':
                    destinatariosFormModuleRef?.renderFormularioDestinatario(data?.destinatario, data?.originatingView);
                    break;
                case 'gerir-destinatarios':
                    destinatariosListagensModuleRef?.renderGerirDestinatariosPage();
                    break;
                case 'visualizar-destinatario':
                    destinatariosViewModuleRef?.renderVisualizarDestinatarioPage(data?.destinatarioId, data?.originatingView);
                    break;
            }
            return;
        }

        if (gruposActions.includes(action)) {
            switch (action) {
                case 'novo-grupo-destinatarios':
                case 'form-grupo-destinatarios':
                    gruposFormModuleRef?.renderFormularioGrupoDestinatarios(data?.grupo, data?.originatingView);
                    break;
                case 'gerir-grupos-destinatarios':
                    gruposListagensModuleRef?.renderGerirGruposDestinatariosPage();
                    break;
                case 'visualizar-grupo-destinatarios':
                    gruposViewModuleRef?.renderVisualizarGrupoDestinatariosPage(data?.grupoId, data?.originatingView);
                    break;
            }
            return;
        }
        
        if(emailActions.includes(action)) {
            switch (action) {
                case 'escrever-email':
                    emailCompositorModuleRef?.renderCompositorEmailPage(data);
                    break;
                case 'gerir-emails-criados':
                    emailsGeradosListagensModuleRef?.renderGerirEmailsGeradosPage();
                    break;
                case 'visualizar-email-gerado':
                    emailVisualizacaoModuleRef?.renderVisualizarEmailGeradoPage(data?.emailId, data?.originatingView);
                    break;
            }
            return;
        }

        console.warn(`Comunicacao.JS: Ação de menu desconhecida ou não tratada diretamente: ${action}`);
        if (_comunicacaoInternalAppModuleRef && _comunicacaoInternalAppModuleRef.irParaHome) _comunicacaoInternalAppModuleRef.irParaHome();
    }

    ComunicacaoPrincipal.init = init;
    ComunicacaoPrincipal.handleMenuAction = handleMenuAction;

})(window.SEFWorkStation.Comunicacao);