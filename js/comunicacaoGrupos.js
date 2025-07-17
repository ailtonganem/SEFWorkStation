// js/comunicacaoGrupos.js
// v1.1.2 - CORREÇÃO: Usa a variável correta 'viewModuleLocalRef' na verificação typeof, resolvendo ReferenceError na inicialização.
// v1.1.1 (CORRIGIDO) - Remove chamadas obsoletas para appModuleRefInternal.setCurrentViewTarget.
// v1.1.0 - Integra o submódulo ComunicacaoGrupos.View.
// v1.0.3 - Garante que o objeto ComunicacaoGrupos é criado antes de ser usado pelos submódulos.
// v1.0.2 - Garante que recebe e usa corretamente os submódulos Form e Listagens.
// v1.0.1 - Garante estrutura correta de módulo aninhado e init.
// v1.0 - Módulo Agregador para Grupos de Destinatários (Comunicação)

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.Comunicacao = window.SEFWorkStation.Comunicacao || {};
window.SEFWorkStation.ComunicacaoGrupos = window.SEFWorkStation.ComunicacaoGrupos || {};

(function(ComunicacaoGruposPrincipal) { 
    let formModuleLocalRef;    
    let listagensModuleLocalRef; 
    let viewModuleLocalRef; // NOVO: Referência para o submódulo de Visualização de Grupos

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
        viewSubModule // NOVO: Parâmetro para o submódulo de visualização de grupos
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
            console.error("ComunicacaoGrupos.JS: Submódulo Form (SEFWorkStation.ComunicacaoGrupos.Form) não foi passado corretamente ou não possui init.");
        }

        if (listagensModuleLocalRef && typeof listagensModuleLocalRef.init === 'function') {
            listagensModuleLocalRef.init(
                mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef,
                navigateToAppViewRef, 
                refreshApplicationStateRef, dbRef, appModuleRefInternal, uiModuleRef,
                formModuleLocalRef 
            );
        } else {
            console.error("ComunicacaoGrupos.JS: Submódulo Listagens (SEFWorkStation.ComunicacaoGrupos.Listagens) não foi passado corretamente ou não possui init.");
        }

        // NOVO: Inicializa o submódulo de Visualização de Grupos
        if (viewModuleLocalRef && typeof viewModuleLocalRef.init === 'function') { // CORRIGIDO AQUI: de viewModuleRef.init para viewModuleLocalRef.init
            viewModuleLocalRef.init(
                mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef,
                navigateToAppViewRef, 
                refreshApplicationStateRef, dbRef, appModuleRefInternal, uiModuleRef
            );
        } else {
            console.warn("ComunicacaoGrupos.JS: Submódulo View (ComunicacaoGrupos.View) não fornecido ou não possui init.");
        }
        
        console.log("ComunicacaoGrupos.JS: Módulo Agregador de Grupos de Destinatários inicializado (v1.1.2).");
    }

    function handleMenuAction(action, data = null) {
        switch (action) {
            case 'novo-grupo-destinatarios':
            case 'form-grupo-destinatarios': 
                 if (formModuleLocalRef && typeof formModuleLocalRef.renderFormularioGrupoDestinatarios === 'function') {
                    const grupoParaEditar = (data && data.grupoId) ? data.grupo : (data && data.grupo ? data.grupo : null); 
                    formModuleLocalRef.renderFormularioGrupoDestinatarios(grupoParaEditar, data?.originatingView || 'gerir-grupos-destinatarios');
                 } else {
                    console.error("ComunicacaoGrupos.JS: renderFormularioGrupoDestinatarios não encontrado no formModuleLocalRef.");
                    if(globalShowFeedbackRef) globalShowFeedbackRef("Erro ao abrir formulário de grupo.", "error");
                 }
                 break;
            case 'gerir-grupos-destinatarios':
                if (listagensModuleLocalRef && typeof listagensModuleLocalRef.renderGerirGruposDestinatariosPage === 'function') {
                    listagensModuleLocalRef.renderGerirGruposDestinatariosPage();
                } else {
                    console.error("ComunicacaoGrupos.JS: renderGerirGruposDestinatariosPage não encontrado no listagensModuleLocalRef.");
                    if(globalShowFeedbackRef) globalShowFeedbackRef("Erro ao carregar lista de grupos.", "error");
                }
                break;
            case 'visualizar-grupo-destinatarios':
                if (data && data.grupoId) {
                    if (viewModuleLocalRef && typeof viewModuleLocalRef.renderVisualizarGrupoDestinatariosPage === 'function') {
                        viewModuleLocalRef.renderVisualizarGrupoDestinatariosPage(data.grupoId, data.originatingView || 'gerir-grupos-destinatarios');
                    } else {
                        console.error("ComunicacaoGrupos.JS: renderVisualizarGrupoDestinatariosPage não encontrado no viewModuleLocalRef.");
                        if(globalShowFeedbackRef) globalShowFeedbackRef("Erro ao abrir visualização do grupo.", "error");
                    }
                } else {
                    if(globalShowFeedbackRef) globalShowFeedbackRef("ID do grupo não fornecido para visualização.", "warning");
                    if (navigateToAppViewRef) navigateToAppViewRef('gerir-grupos-destinatarios');
                }
                break;
            default:
                console.warn(`ComunicacaoGrupos.JS: Ação desconhecida: ${action}`);
                if (appModuleRefInternal && appModuleRefInternal.irParaHome) appModuleRefInternal.irParaHome();
                break;
        }
    }

    ComunicacaoGruposPrincipal.init = init;
    ComunicacaoGruposPrincipal.handleMenuAction = handleMenuAction;

})(window.SEFWorkStation.ComunicacaoGrupos);