// js/servidoresGrupos.js
// v1.1.3 - CORREÇÃO: Corrigido erro de inicialização que impedia submódulos de serem carregados corretamente.
// v1.1.2 - CORREÇÃO: Remove chamadas obsoletas para appModuleRef.setCurrentViewTarget.
// v1.1.1 (CORRIGIDO) - Remove chamadas obsoletas para appModuleRefInternal.setCurrentViewTarget.
// v1.1.0 - Integra o submódulo ComunicacaoGrupos.View.
// v1.0.3 - Garante que o objeto ComunicacaoGrupos é criado antes de ser usado pelos submódulos.
// v1.0.2 - Garante que recebe e usa corretamente os submódulos Form e Listagens.
// v1.0.1 - Garante estrutura correta de módulo aninhado e init.
// v1.0 - Módulo Agregador para Grupos de Servidores (Comunicação)

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.Comunicacao = window.SEFWorkStation.Comunicacao || {};
window.SEFWorkStation.ServidoresGrupos = window.SEFWorkStation.ServidoresGrupos || {};

(function(ServidoresGruposPrincipal) { 
    let formModuleRef;    
    let listagensModuleRef; 
    let viewModuleRef; // NOVO: Referência para o submódulo de Visualização de Grupos

    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let navigateToAppViewRef;
    let refreshApplicationStateRef;
    let dbRef;
    let appModuleRefInternal;
    let uiModuleRef;

    const SERVIDORES_GRUPOS_STORE_NAME = 'servidoresGruposStore';

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

        formModuleRef = formSubModule; 
        listagensModuleRef = listSubModule;  
        viewModuleRef = viewSubModule; // NOVO: Atribui o submódulo de visualização

        // CORREÇÃO CRÍTICA APLICADA AQUI
        if (formSubModule && typeof formSubModule.init === 'function') {
            formSubModule.init(
                mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef,
                navigateToAppViewRef, 
                refreshApplicationStateRef, dbRef, appModuleRefInternal, uiModuleRef
            );
        } else {
            console.error("ServidoresGrupos.JS: Submódulo Form (SEFWorkStation.ServidoresGrupos.Form) não foi passado corretamente ou não possui init.");
        }

        // CORREÇÃO CRÍTICA APLICADA AQUI
        if (listSubModule && typeof listSubModule.init === 'function') {
            listSubModule.init(
                mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef,
                navigateToAppViewRef, 
                refreshApplicationStateRef, dbRef, appModuleRefInternal, uiModuleRef,
                formModuleRef 
            );
        } else {
            console.error("ServidoresGrupos.JS: Submódulo Listagens (SEFWorkStation.ServidoresGrupos.Listagens) não foi passado corretamente ou não possui init.");
        }

        // CORREÇÃO CRÍTICA APLICADA AQUI
        if (viewSubModule && typeof viewSubModule.init === 'function') { 
            viewSubModule.init(
                mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef,
                navigateToAppViewRef, 
                refreshApplicationStateRef, dbRef, appModuleRefInternal, uiModuleRef
            );
        } else {
             console.warn("ServidoresGrupos.JS: Módulo ServidoresGruposView não fornecido ou não possui init.");
        }
        
        console.log("ServidoresGrupos.JS: Módulo Agregador de Grupos de Servidores inicializado (v1.1.3).");
    }

    async function handleMenuAction(action, data = null) { // Tornar a função async
        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (uiModuleRef && typeof uiModuleRef.closeAllDropdowns === 'function') {
            uiModuleRef.closeAllDropdowns();
        }

        switch (action) {
            case 'form-grupo-servidores': 
                 if (formModuleRef && typeof formModuleRef.renderFormularioGrupoServidores === 'function') {
                    let grupoParaEditar = null;
                    if (data && data.grupoId && data.action === 'edit') { // Verifica se é uma edição e se tem grupoId
                        try {
                            grupoParaEditar = await dbRef.getItemById(SERVIDORES_GRUPOS_STORE_NAME, data.grupoId);
                            if (!grupoParaEditar) {
                                if (globalShowFeedbackRef) globalShowFeedbackRef(`Grupo com ID ${data.grupoId} não encontrado para edição.`, "error");
                                if (listagensModuleRef && typeof listagensModuleRef.renderGerirGruposPage === 'function') {
                                    listagensModuleRef.renderGerirGruposPage();
                                }
                                return;
                            }
                        } catch (error) {
                            console.error("Erro ao buscar grupo para edição:", error);
                            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro ao carregar dados do grupo para edição.", "error");
                            return; 
                        }
                    } else if (data && data.grupo) { 
                        grupoParaEditar = data.grupo;
                    }
                    formModuleRef.renderFormularioGrupoServidores(grupoParaEditar, data?.originatingView || 'gerir-grupos-servidores');
                }
                break;
            case 'novo-grupo-servidores': 
                 if (formModuleRef && typeof formModuleRef.renderFormularioGrupoServidores === 'function') {
                    formModuleRef.renderFormularioGrupoServidores(null, 'gerir-grupos-servidores');
                }
                break;
            case 'gerir-grupos-servidores':
                if (listagensModuleRef && typeof listagensModuleRef.renderGerirGruposPage === 'function') {
                    listagensModuleRef.renderGerirGruposPage();
                }
                break;
            case 'visualizar-grupo-servidores': 
                if (data && data.grupoId && viewModuleRef && typeof viewModuleRef.renderVisualizarGrupoServidoresPage === 'function') {
                    viewModuleRef.renderVisualizarGrupoServidoresPage(data.grupoId, data.originatingView || 'gerir-grupos-servidores');
                } else {
                     if (globalShowFeedbackRef) globalShowFeedbackRef("ID do grupo não fornecido para visualização.", "warning");
                     if (listagensModuleRef && typeof listagensModuleRef.renderGerirGruposPage === 'function') listagensModuleRef.renderGerirGruposPage();
                }
                break;
            default:
                console.warn(`ServidoresGrupos.JS: Ação desconhecida: ${action}`);
                if (navigateToAppViewRef) navigateToAppViewRef('gerir-servidores'); 
                break;
        }
    }

    ServidoresGruposPrincipal.init = init;
    ServidoresGruposPrincipal.handleMenuAction = handleMenuAction;

})(window.SEFWorkStation.ServidoresGrupos);