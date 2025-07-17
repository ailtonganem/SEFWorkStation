// js/servidores.js - Módulo Principal de Servidores
// v1.5.0 - REFATORADO: Remove o módulo agregador `servidoresGrupos.js` e assume o roteamento direto para os submódulos de Form, Listagens e View de grupos, corrigindo a cadeia de dependências e erros de inicialização.
// v1.4.4 - CORREÇÃO: Recebe e propaga as dependências de compartilhamento para o submódulo de visualização.
// v1.4.3 - CORREÇÃO: Remove chamadas obsoletas para appModuleRef.setCurrentViewTarget.
// ... (histórico anterior)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.Servidores = (function() {
    // Módulos para Servidores Individuais
    let servidoresFormModuleRef;
    let servidoresViewModuleRef;
    let servidoresListagensModuleRef;
    let servidoresCalendarioModuleRef;

    // Módulos para Grupos de Servidores
    let servidoresGruposFormModuleRef;
    let servidoresGruposListagensModuleRef;
    let servidoresGruposViewModuleRef;

    // Dependências Globais
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let navigateToAppViewRef;
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
        navigateToFunc,
        refreshFunc,
        dbModuleRef,
        uiRef,
        // Módulos de Servidores
        formModule,
        viewModule,
        listagensModule,
        // Módulo de Grupos (agora passando os componentes individuais)
        gruposFormMod,
        gruposListagensMod,
        gruposViewMod,
        calendarioModule,
        applicationModuleRef,
        sharingMod,
        utilsMod
    ) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedbackFunc;
        globalClearFeedbackRef = clearFeedbackFunc;
        navigateToAppViewRef = navigateToFunc;
        refreshApplicationStateRef = refreshFunc;
        dbRef = dbModuleRef;
        uiModuleRef = uiRef;
        appModuleRefLocal = applicationModuleRef;
        sharingModuleRef = sharingMod;
        sharedUtilsRef = utilsMod;

        // Atribuição dos submódulos de Servidores
        servidoresFormModuleRef = formModule;
        servidoresViewModuleRef = viewModule;
        servidoresListagensModuleRef = listagensModule;
        servidoresCalendarioModuleRef = calendarioModule;

        // Atribuição dos submódulos de Grupos de Servidores
        servidoresGruposFormModuleRef = gruposFormMod;
        servidoresGruposListagensModuleRef = gruposListagensMod;
        servidoresGruposViewModuleRef = gruposViewMod;

        // --- Inicialização dos submódulos de Servidores ---
        if (servidoresFormModuleRef && servidoresFormModuleRef.init) {
            servidoresFormModuleRef.init(mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef, navigateToAppViewRef, refreshApplicationStateRef, dbRef, appModuleRefLocal, uiModuleRef, servidoresViewModuleRef);
        } else { console.error("Servidores.JS: Submódulo ServidoresForm não pôde ser inicializado."); }

        if (servidoresViewModuleRef && servidoresViewModuleRef.init) {
            servidoresViewModuleRef.init(mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef, navigateToAppViewRef, (servidorData, originatingView) => { handleMenuAction('editar-servidor', { servidorId: servidorData.id, originatingView: originatingView || 'view-servidor' }); }, refreshApplicationStateRef, dbRef, appModuleRefLocal, uiModuleRef, sharingModuleRef, sharedUtilsRef);
        } else { console.error("Servidores.JS: Submódulo ServidoresView não pôde ser inicializado."); }
        
        if (servidoresListagensModuleRef && servidoresListagensModuleRef.init) {
            servidoresListagensModuleRef.init(mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef, navigateToAppViewRef, refreshApplicationStateRef, dbRef, appModuleRefLocal, servidoresFormModuleRef, servidoresViewModuleRef, uiModuleRef);
        } else { console.error("Servidores.JS: Submódulo ServidoresListagens não pôde ser inicializado."); }
        
        // --- Inicialização dos submódulos de Grupos de Servidores ---
        if (servidoresGruposFormModuleRef && typeof servidoresGruposFormModuleRef.init === 'function') {
            servidoresGruposFormModuleRef.init(mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef, navigateToAppViewRef, refreshApplicationStateRef, dbRef, appModuleRefLocal, uiModuleRef);
        } else { console.error("Servidores.JS: Submódulo ServidoresGrupos.Form não pôde ser inicializado."); }
        
        if (servidoresGruposListagensModuleRef && typeof servidoresGruposListagensModuleRef.init === 'function') {
            servidoresGruposListagensModuleRef.init(mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef, navigateToAppViewRef, refreshApplicationStateRef, dbRef, appModuleRefLocal, uiModuleRef, servidoresGruposFormModuleRef);
        } else { console.error("Servidores.JS: Submódulo ServidoresGrupos.Listagens não pôde ser inicializado."); }
        
        if (servidoresGruposViewModuleRef && typeof servidoresGruposViewModuleRef.init === 'function') {
            servidoresGruposViewModuleRef.init(mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef, navigateToAppViewRef, dbRef, appModuleRefLocal);
        } else { console.error("Servidores.JS: Submódulo ServidoresGrupos.View não pôde ser inicializado."); }
        
        // --- Inicialização de outros submódulos ---
        if (servidoresCalendarioModuleRef && typeof servidoresCalendarioModuleRef.init === 'function') {
            servidoresCalendarioModuleRef.init(mainContentWrapperRef, globalShowFeedbackRef, dbRef, appModuleRefLocal);
        } else { console.warn("Servidores.JS: Módulo ServidoresCalendario não fornecido ou não possui init."); }

        console.log("Servidores.JS: Módulo Principal de Servidores inicializado (v1.5.0).");
    }

    async function handleMenuAction(action, data = null) {
        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (uiModuleRef && uiModuleRef.closeAllDropdowns) uiModuleRef.closeAllDropdowns();

        switch (action) {
            case 'novo-servidor':
                if (servidoresFormModuleRef?.renderNovoServidorForm) {
                    servidoresFormModuleRef.renderNovoServidorForm(null, 'gerir-servidores');
                }
                break;
            case 'editar-servidor': // Ação para edição
                if (data?.servidorId && servidoresFormModuleRef?.renderNovoServidorForm) {
                    const servidor = await dbRef.getItemById(dbRef.STORES.SERVIDORES, data.servidorId);
                    if (servidor) {
                        servidoresFormModuleRef.renderNovoServidorForm(servidor, data.originatingView || 'gerir-servidores');
                    }
                }
                break;
            case 'gerir-servidores':
                if (servidoresListagensModuleRef?.renderGerirServidoresPage) {
                    servidoresListagensModuleRef.renderGerirServidoresPage();
                }
                break;
            case 'visualizar-servidor':
                if (data?.servidorId && servidoresViewModuleRef?.renderVisualizarServidorPage) {
                    servidoresViewModuleRef.renderVisualizarServidorPage(data.servidorId, data.originatingView || 'gerir-servidores');
                } else {
                    handleMenuAction('gerir-servidores');
                }
                break;
            case 'calendario-servidores':
                 if (servidoresCalendarioModuleRef?.renderCalendarioServidoresPage) {
                    servidoresCalendarioModuleRef.renderCalendarioServidoresPage();
                 }
                 break;
            
            // Roteamento para Grupos de Servidores
            case 'gerir-grupos-servidores':
                if (servidoresGruposListagensModuleRef?.renderGerirGruposPage) {
                    servidoresGruposListagensModuleRef.renderGerirGruposPage();
                } else { console.error("Ação 'gerir-grupos-servidores' chamada, mas o módulo não está disponível."); }
                break;
            case 'novo-grupo-servidores':
            case 'form-grupo-servidores':
                if (servidoresGruposFormModuleRef?.renderFormularioGrupoServidores) {
                    let grupoParaEditar = null;
                    if (data?.grupoId) {
                        grupoParaEditar = await dbRef.getItemById(dbRef.STORES.SERVIDORES_GRUPOS, data.grupoId);
                    } else if (data?.grupo) {
                        grupoParaEditar = data.grupo;
                    }
                    servidoresGruposFormModuleRef.renderFormularioGrupoServidores(grupoParaEditar, data?.originatingView || 'gerir-grupos-servidores');
                } else { console.error("Ação 'form-grupo-servidores' chamada, mas o módulo não está disponível."); }
                break;
            case 'visualizar-grupo-servidores':
                if (data?.grupoId && servidoresGruposViewModuleRef?.renderVisualizarGrupoServidoresPage) {
                    servidoresGruposViewModuleRef.renderVisualizarGrupoServidoresPage(data.grupoId, data.originatingView || 'gerir-grupos-servidores');
                } else { 
                    console.error("Ação 'visualizar-grupo-servidores' chamada sem ID ou módulo não disponível.");
                    handleMenuAction('gerir-grupos-servidores');
                }
                break;
                
            default:
                console.warn(`Servidores.JS: Ação de menu desconhecida: ${action}`);
                if (navigateToAppViewRef) navigateToAppViewRef('home');
                break;
        }
    }

    return {
        init,
        handleMenuAction
    };
})();