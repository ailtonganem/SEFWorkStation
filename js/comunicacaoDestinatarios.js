// js/comunicacaoDestinatarios.js - Módulo Agregador para Destinatários Individuais
// v1.1.2 - CORREÇÃO: Usa a variável correta 'viewModuleLocalRef' na verificação typeof, resolvendo ReferenceError na inicialização.
// v1.1.1 (CORRIGIDO) - Remove chamadas obsoletas para appModuleRefInternal.setCurrentViewTarget.
// v1.1.0 - Integra o submódulo ComunicacaoDestinatarios.View.
// v1.0.1 - Garante que recebe e usa corretamente os submódulos Form e Listagens.
// v1.0 - Estrutura inicial, init e handleMenuAction.

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.Comunicacao = window.SEFWorkStation.Comunicacao || {};
window.SEFWorkStation.ComunicacaoDestinatarios = window.SEFWorkStation.ComunicacaoDestinatarios || {}; // Garante o namespace

(function(ComunicacaoDestinatariosPrincipal) {
    let formModuleLocalRef;    
    let listagensModuleLocalRef; 
    let viewModuleLocalRef; // NOVO: Referência para o submódulo de Visualização

    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let navigateToAppViewRef; 
    let refreshApplicationStateRef;
    let dbRef;
    let appModuleRefInternal; 
    let uiModuleRef;

    function init(
        mainWrapper, showFeedback, clearFeedback, navigateToFunc, refreshState,
        db, applicationModule, ui, 
        formSubModule, listSubModule, 
        viewSubModule // NOVO: Parâmetro para o submódulo de visualização
    ) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedback;
        globalClearFeedbackRef = clearFeedback;
        navigateToAppViewRef = navigateToFunc;
        refreshApplicationStateRef = refreshState;
        dbRef = db;
        appModuleRefInternal = applicationModule;
        uiModuleRef = ui;

        formModuleLocalRef = formSubModule; 
        listagensModuleLocalRef = listSubModule; 
        viewModuleLocalRef = viewSubModule; // NOVO: Atribui o submódulo de visualização

        if (formModuleLocalRef && typeof formModuleLocalRef.init === 'function') {
            formModuleLocalRef.init(
                mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef,
                navigateToAppViewRef, 
                refreshApplicationStateRef, dbRef, appModuleRefInternal, uiModuleRef
            );
        } else {
            console.error("ComunicacaoDestinatarios.JS: Submódulo Form (ComunicacaoDestinatariosForm) não inicializado ou não possui init.");
        }

        if (listagensModuleLocalRef && typeof listagensModuleLocalRef.init === 'function') {
            listagensModuleLocalRef.init(
                mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef,
                navigateToAppViewRef, 
                refreshApplicationStateRef, dbRef, appModuleRefInternal, uiModuleRef,
                formModuleLocalRef 
            );
        } else {
            console.error("ComunicacaoDestinatarios.JS: Submódulo Listagens (ComunicacaoDestinatariosListagens) não inicializado ou não possui init.");
        }

        // NOVO: Inicializa o submódulo de Visualização
        if (viewModuleLocalRef && typeof viewModuleLocalRef.init === 'function') { // CORRIGIDO AQUI: de viewModuleRef.init para viewModuleLocalRef.init
            viewModuleLocalRef.init(
                mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef,
                navigateToAppViewRef, // Passa a função de navegação principal do app
                refreshApplicationStateRef, dbRef, appModuleRefInternal, uiModuleRef
            );
        } else {
            console.warn("ComunicacaoDestinatarios.JS: Submódulo View (ComunicacaoDestinatarios.View) não fornecido ou não possui init.");
        }
        
        console.log("ComunicacaoDestinatarios.JS: Módulo Agregador de Destinatários inicializado (v1.1.2).");
    }

    function handleMenuAction(action, data = null) {
        switch (action) {
            case 'novo-destinatario':
            case 'form-destinatario': 
                if (formModuleLocalRef && typeof formModuleLocalRef.renderFormularioDestinatario === 'function') {
                    const destinatarioParaEditar = (data && data.destinatarioId) ? data.destinatario : (data && data.destinatario ? data.destinatario : null);
                    formModuleLocalRef.renderFormularioDestinatario(destinatarioParaEditar, data?.originatingView || 'gerir-destinatarios');
                } else {
                     console.error("ComunicacaoDestinatarios.JS: renderFormularioDestinatario não encontrado no formModuleLocalRef.");
                     if(globalShowFeedbackRef) globalShowFeedbackRef("Erro ao abrir formulário de destinatário.", "error");
                }
                break;
            case 'gerir-destinatarios':
                if (listagensModuleLocalRef && typeof listagensModuleLocalRef.renderGerirDestinatariosPage === 'function') {
                    listagensModuleLocalRef.renderGerirDestinatariosPage();
                } else {
                    console.error("ComunicacaoDestinatarios.JS: renderGerirDestinatariosPage não encontrado no listagensModuleLocalRef.");
                    if(globalShowFeedbackRef) globalShowFeedbackRef("Erro ao carregar lista de destinatários.", "error");
                }
                break;
            case 'visualizar-destinatario':
                if (data && data.destinatarioId) {
                    if (viewModuleLocalRef && typeof viewModuleLocalRef.renderVisualizarDestinatarioPage === 'function') {
                        viewModuleLocalRef.renderVisualizarDestinatarioPage(data.destinatarioId, data.originatingView || 'gerir-destinatarios');
                    } else {
                        console.error("ComunicacaoDestinatarios.JS: renderVisualizarDestinatarioPage não encontrado no viewModuleLocalRef.");
                        if(globalShowFeedbackRef) globalShowFeedbackRef("Erro ao abrir visualização do destinatário.", "error");
                    }
                } else {
                    if(globalShowFeedbackRef) globalShowFeedbackRef("ID do destinatário não fornecido para visualização.", "warning");
                    if (navigateToAppViewRef) navigateToAppViewRef('gerir-destinatarios'); // Volta para a lista
                }
                break;
            default:
                console.warn(`ComunicacaoDestinatarios.JS: Ação desconhecida: ${action}`);
                if (appModuleRefInternal && appModuleRefInternal.irParaHome) appModuleRefInternal.irParaHome();
                break;
        }
    }

    ComunicacaoDestinatariosPrincipal.init = init;
    ComunicacaoDestinatariosPrincipal.handleMenuAction = handleMenuAction;

})(window.SEFWorkStation.ComunicacaoDestinatarios);