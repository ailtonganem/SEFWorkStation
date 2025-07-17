// js/processos.js - Módulo Principal de Processos
// v1.4.0 - CORREÇÃO: Recebe e propaga as dependências de compartilhamento para os submódulos de visualização.
// v1.3.2 - CORREÇÃO: Remove chamadas obsoletas para appModuleRef.setCurrentViewTarget.
// v1.3.1 (CORRIGIDO) - Remove chamadas obsoletas para appModuleRef.setCurrentViewTarget.
// v1.3 - Garante passagem correta de preSelectedLink tipo 'pta' para formulário de autuação.
// ... (histórico anterior omitido para brevidade)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.Processos = (function() {
    let protocolosFormModuleRef;
    let protocolosViewModuleRef;
    let protocolosListagensModuleRef; 

    let ptaFormModuleRef;
    let ptaViewModuleRef;
    let ptaListagensModuleRef;

    let autuacaoFormModuleRef;
    let autuacaoViewModuleRef;
    let autuacaoListagensModuleRef;

    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let dbRef;
    let uiModuleRef;
    let appModuleRef;
    let sharingModuleRef; // NOVO
    let sharedUtilsRef;   // NOVO

    /**
     * Inicializa o módulo principal de Processos.
     */
    function init(
        mainWrapper,
        showFeedbackFunc,
        clearFeedbackFunc,
        dbModuleRef,
        uiRef,
        applicationModuleRef,
        protoFormModule,        
        protoListagensModule,   
        protoViewModule,
        pFormModule,
        pListagensModule,
        pViewModule,
        autFormModule, 
        autListagensModule, 
        autViewModule,
        sharingMod,   // NOVO
        utilsMod      // NOVO
    ) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedbackFunc;
        globalClearFeedbackRef = clearFeedbackFunc;
        dbRef = dbModuleRef;
        uiModuleRef = uiRef;
        appModuleRef = applicationModuleRef;
        sharingModuleRef = sharingMod; // NOVO
        sharedUtilsRef = utilsMod;     // NOVO

        protocolosFormModuleRef = protoFormModule;
        protocolosListagensModuleRef = protoListagensModule;
        protocolosViewModuleRef = protoViewModule;

        ptaFormModuleRef = pFormModule;
        ptaListagensModuleRef = pListagensModule;
        ptaViewModuleRef = pViewModule;

        autuacaoFormModuleRef = autFormModule;
        autuacaoListagensModuleRef = autListagensModule;
        autuacaoViewModuleRef = autViewModule;


        // Inicializar submódulos de Protocolos
        if (protocolosFormModuleRef && typeof protocolosFormModuleRef.init === 'function') {
            protocolosFormModuleRef.init(mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef, 
                (targetView, data) => { if (appModuleRef && appModuleRef.handleMenuAction) appModuleRef.handleMenuAction(targetView, data); },
                appModuleRef.refreshApplicationState, dbRef, appModuleRef, uiModuleRef, protocolosViewModuleRef);
        } else { console.error("Processos.JS: Submódulo ProtocolosForm não pôde ser inicializado."); }

        if (protocolosListagensModuleRef && typeof protocolosListagensModuleRef.init === 'function') {
            protocolosListagensModuleRef.init(mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef, 
                dbRef, appModuleRef, protocolosViewModuleRef, protocolosFormModuleRef, appModuleRef.refreshApplicationState, uiModuleRef); 
        } else { console.error("Processos.JS: Submódulo ProtocolosListagens não pôde ser inicializado."); }
        
        if (protocolosViewModuleRef && typeof protocolosViewModuleRef.init === 'function') {
            protocolosViewModuleRef.init(mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef, 
                (originView) => { if (appModuleRef && appModuleRef.handleMenuAction) appModuleRef.handleMenuAction(originView || 'gerir-protocolos'); },
                (protocoloData, originatingView) => { if (protocolosFormModuleRef && protocolosFormModuleRef.renderFormularioProtocolo) protocolosFormModuleRef.renderFormularioProtocolo(protocoloData, originatingView || 'view-protocolo'); },
                appModuleRef.refreshApplicationState, dbRef, appModuleRef, uiModuleRef,
                sharingModuleRef, sharedUtilsRef // PASSANDO DEPENDÊNCIAS
            );
        } else { console.error("Processos.JS: Submódulo ProtocolosView não pôde ser inicializado."); }

        // Inicializar submódulos de PTA
        if (ptaFormModuleRef && typeof ptaFormModuleRef.init === 'function') {
            ptaFormModuleRef.init(mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef,
                (targetView, data) => { if (appModuleRef && appModuleRef.handleMenuAction) appModuleRef.handleMenuAction(targetView, data); },
                appModuleRef.refreshApplicationState, dbRef, appModuleRef, uiModuleRef, ptaViewModuleRef);
        } else { console.error("Processos.JS: Submódulo PTAForm não pôde ser inicializado."); }

        if (ptaListagensModuleRef && typeof ptaListagensModuleRef.init === 'function') {
            ptaListagensModuleRef.init(mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef,
                dbRef, appModuleRef, ptaViewModuleRef, ptaFormModuleRef, appModuleRef.refreshApplicationState, uiModuleRef);
        } else { console.error("Processos.JS: Submódulo PTAListagens não pôde ser inicializado."); }

        if (ptaViewModuleRef && typeof ptaViewModuleRef.init === 'function') {
            ptaViewModuleRef.init(mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef,
                (originView) => { if (appModuleRef && appModuleRef.handleMenuAction) appModuleRef.handleMenuAction(originView || 'gerir-ptas'); },
                (ptaData, originatingView) => { if (ptaFormModuleRef && ptaFormModuleRef.renderFormularioPTA) ptaFormModuleRef.renderFormularioPTA(ptaData, originatingView || 'view-pta'); },
                appModuleRef.refreshApplicationState, dbRef, appModuleRef, uiModuleRef, autuacaoFormModuleRef,
                sharingModuleRef, sharedUtilsRef // PASSANDO DEPENDÊNCIAS
            );
        } else { console.error("Processos.JS: Submódulo PTAView não pôde ser inicializado."); }

        // Inicializar submódulos de Autuação
        if (autuacaoFormModuleRef && typeof autuacaoFormModuleRef.init === 'function') {
            autuacaoFormModuleRef.init(mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef,
                (targetView, data) => { if (appModuleRef && appModuleRef.handleMenuAction) appModuleRef.handleMenuAction(targetView, data); },
                appModuleRef.refreshApplicationState, dbRef, appModuleRef, uiModuleRef, autuacaoViewModuleRef);
        } else { console.error("Processos.JS: Submódulo AutuacaoForm não pôde ser inicializado."); }

        if (autuacaoListagensModuleRef && typeof autuacaoListagensModuleRef.init === 'function') {
            autuacaoListagensModuleRef.init(mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef,
                dbRef, appModuleRef, autuacaoViewModuleRef, autuacaoFormModuleRef, appModuleRef.refreshApplicationState, uiModuleRef);
        } else { console.error("Processos.JS: Submódulo AutuacaoListagens não pôde ser inicializado."); }

        if (autuacaoViewModuleRef && typeof autuacaoViewModuleRef.init === 'function') {
            autuacaoViewModuleRef.init(mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef,
                (originView) => { if (appModuleRef && appModuleRef.handleMenuAction) appModuleRef.handleMenuAction(originView || 'gerir-autuacoes'); },
                (autuacaoData, originatingView) => { if (autuacaoFormModuleRef && autuacaoFormModuleRef.renderFormularioAutuacao) autuacaoFormModuleRef.renderFormularioAutuacao(autuacaoData, originatingView || 'view-autuacao'); },
                appModuleRef.refreshApplicationState, dbRef, appModuleRef, uiModuleRef,
                sharingModuleRef, sharedUtilsRef // PASSANDO DEPENDÊNCIAS
            );
        } else { console.error("Processos.JS: Submódulo AutuacaoView não pôde ser inicializado."); }


        console.log("Processos.JS: Módulo Principal de Processos inicializado (v1.4.0).");
    }

    function renderPlaceholderPage(tituloPagina, mensagemAdicional = "") {
        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (!mainContentWrapperRef) {
            console.error(`Processos.JS: renderPlaceholderPage - mainContentWrapperRef não definido para ${tituloPagina}.`);
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico ao tentar renderizar a página.", "error");
            return;
        }

        const pageHtml = `
            <div class="page-section">
                <h2 class="text-xl font-semibold mb-4">${tituloPagina}</h2>
                <div class="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
                    <p class="text-gray-700 dark:text-gray-300">
                        Esta funcionalidade (${tituloPagina}) está em desenvolvimento ou o módulo correspondente não foi carregado corretamente.
                    </p>
                    ${mensagemAdicional ? `<p class="text-gray-600 dark:text-gray-400 mt-2 text-sm">${mensagemAdicional}</p>` : ''}
                </div>
            </div>
        `;
        mainContentWrapperRef.innerHTML = pageHtml;
    }

    function handleMenuAction(action, data = null) {
        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (uiModuleRef && uiModuleRef.closeAllDropdowns) uiModuleRef.closeAllDropdowns();
        const originatingView = data?.originatingView || null; 
        const preSelectedLink = data?.preSelectedLink || null; 

        switch (action) {
            // Protocolos
            case 'cadastrar-protocolo':
                if (protocolosFormModuleRef && protocolosFormModuleRef.renderFormularioProtocolo) {
                    protocolosFormModuleRef.renderFormularioProtocolo(null, originatingView || 'gerir-protocolos', preSelectedLink);
                } else { renderPlaceholderPage("Cadastrar Novo Protocolo", "Módulo de formulário de protocolos não carregado."); }
                break;
            case 'gerir-protocolos':
                if (protocolosListagensModuleRef && protocolosListagensModuleRef.renderGerirProtocolosPage) {
                    protocolosListagensModuleRef.renderGerirProtocolosPage();
                } else { renderPlaceholderPage("Gerir Protocolos", "Módulo de listagem de protocolos não carregado."); }
                break;
            case 'visualizar-protocolo': 
                if (data && data.protocoloId && protocolosViewModuleRef && protocolosViewModuleRef.renderVisualizarProtocoloPage) {
                    protocolosViewModuleRef.renderVisualizarProtocoloPage(data.protocoloId, originatingView || 'gerir-protocolos');
                } else { handleMenuAction('gerir-protocolos'); }
                break;
            
            // PTAs
            case 'cadastrar-pta':
                if (ptaFormModuleRef && ptaFormModuleRef.renderFormularioPTA) {
                    ptaFormModuleRef.renderFormularioPTA(null, originatingView || 'gerir-ptas', false, preSelectedLink);
                } else { renderPlaceholderPage("Cadastrar Novo PTA", "Módulo de formulário de PTA não carregado."); }
                break;
            case 'gerir-ptas':
                if (ptaListagensModuleRef && ptaListagensModuleRef.renderGerirPTAsPage) {
                    ptaListagensModuleRef.renderGerirPTAsPage();
                } else { renderPlaceholderPage("Gerir PTAs", "Módulo de listagem de PTA não carregado."); }
                break;
            case 'visualizar-pta':
                if (data && data.ptaId && ptaViewModuleRef && ptaViewModuleRef.renderVisualizarPTAPage) {
                     ptaViewModuleRef.renderVisualizarPTAPage(data.ptaId, originatingView || 'gerir-ptas');
                } else { handleMenuAction('gerir-ptas'); }
                break;

            // Autuações
            case 'cadastrar-autuacao':
                if (autuacaoFormModuleRef && autuacaoFormModuleRef.renderFormularioAutuacao) {
                    autuacaoFormModuleRef.renderFormularioAutuacao(null, originatingView || 'gerir-autuacoes', false, preSelectedLink);
                } else { renderPlaceholderPage("Cadastrar Nova Autuação", "Módulo de formulário de Autuação não carregado."); }
                break;
            case 'gerir-autuacoes':
                if (autuacaoListagensModuleRef && autuacaoListagensModuleRef.renderGerirAutuacoesPage) {
                    autuacaoListagensModuleRef.renderGerirAutuacoesPage();
                } else { renderPlaceholderPage("Gerir Autuações", "Módulo de listagem de Autuação não carregado."); }
                break;
            case 'visualizar-autuacao':
                if (data && data.autuacaoId && autuacaoViewModuleRef && autuacaoViewModuleRef.renderVisualizarAutuacaoPage) {
                     autuacaoViewModuleRef.renderVisualizarAutuacaoPage(data.autuacaoId, originatingView || 'gerir-autuacoes');
                } else { handleMenuAction('gerir-autuacoes'); }
                break;

            default:
                console.warn(`Processos.JS: Ação de menu desconhecida ou não totalmente implementada: ${action}`);
                if (appModuleRef && appModuleRef.irParaHome) appModuleRef.irParaHome();
                break;
        }
    }

    return {
        init,
        handleMenuAction
    };
})();