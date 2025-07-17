// js/tarefas.js
// v1.6.0 - REFATORADO: Remove a lógica de edição em modal. A edição agora sempre abre em página inteira, seguindo o padrão do sistema.
// v1.5.0 - Confirma que a lógica de versionamento é tratada pelos submódulos.
// (Histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.Tarefas = (function() {
    // Referências para os submódulos
    let tarefasFormModuleRef;
    let tarefasViewModuleRef;
    let tarefasListagensModuleRef;
    let tarefasCalendarioModuleRef;

    // Referências globais
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

    const TAREFAS_STORE_NAME = 'tarefasStore';

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
        calendarioModule,
        applicationModuleRefParam,
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
        appModuleRef = applicationModuleRefParam; 
        sharingModuleRef = sharingMod;
        sharedUtilsRef = utilsMod;

        if (!appModuleRef) {
            console.error("Tarefas.JS: init - appModuleRef (após atribuição) é undefined/null! Isso causará problemas nos submódulos.");
        }

        tarefasFormModuleRef = formModule;
        tarefasViewModuleRef = viewModule;
        tarefasListagensModuleRef = listagensModule;
        tarefasCalendarioModuleRef = calendarioModule;
        
        if (tarefasFormModuleRef && typeof tarefasFormModuleRef.init === 'function') {
            tarefasFormModuleRef.init(
                mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef,
                // Função de callback para navegação após salvar
                (originViewTarget, tarefaIdSalva) => { 
                    if (appModuleRef && appModuleRef.handleMenuAction) {
                        appModuleRef.handleMenuAction(originViewTarget || 'gerir-tarefas');
                    }
                },
                refreshApplicationStateRef, dbRef, appModuleRef, uiModuleRef
            );
        } else { console.error("Tarefas.JS: Submódulo TarefasForm não pôde ser inicializado."); }

        if (tarefasViewModuleRef && tarefasViewModuleRef.init) {
            tarefasViewModuleRef.init(
                mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef,
                // Callback para voltar
                (originView) => handleMenuAction(originView || 'gerir-tarefas'),
                // Callback para editar
                (tarefaData, originatingViewFromView) => { 
                    handleMenuAction('editar-tarefa', { tarefaId: tarefaData.id, originatingView: originatingViewFromView || 'view-tarefa' });
                },
                refreshApplicationStateRef, dbRef, appModuleRef, uiModuleRef,
                sharingModuleRef, sharedUtilsRef
            );
        } else { console.error("Tarefas.JS: Submódulo TarefasView não pôde ser inicializado."); }

        if (tarefasListagensModuleRef && typeof tarefasListagensModuleRef.init === 'function') {
            tarefasListagensModuleRef.init(
                mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef,
                // Callback para quando um item é clicado na lista
                (tarefaData) => {
                    if (appModuleRef && appModuleRef.handleMenuAction) {
                        appModuleRef.handleMenuAction('visualizar-tarefa', { tarefaId: tarefaData.id, originatingView: 'gerir-tarefas' });
                    }
                },
                refreshApplicationStateRef, dbRef, appModuleRef, tarefasFormModuleRef, uiModuleRef
            );
        } else { console.error("Tarefas.JS: Submódulo TarefasListagens não pôde ser inicializado.");}

        if (tarefasCalendarioModuleRef && tarefasCalendarioModuleRef.init) {
            tarefasCalendarioModuleRef.init(
                mainContentWrapperRef,
                globalShowFeedbackRef,
                dbRef,
                appModuleRef
            );
        }
        
        console.log("Tarefas.JS: Módulo Principal de Tarefas inicializado (v1.6.0).");
    }
    
    async function handleMenuAction(action, data = null) {
        const feedbackAreaListagem = document.getElementById('feedback-area-notas-rapidas-listagem');
        if (globalClearFeedbackRef && feedbackAreaListagem) globalClearFeedbackRef(feedbackAreaListagem);
        else if (globalClearFeedbackRef) globalClearFeedbackRef();
        
        if (uiModuleRef && uiModuleRef.closeAllDropdowns) uiModuleRef.closeAllDropdowns();

        switch (action) {
            case 'nova-tarefa':
                if (tarefasFormModuleRef && tarefasFormModuleRef.renderNovaTarefaFormPaginaPrincipal) {
                    tarefasFormModuleRef.renderNovaTarefaFormPaginaPrincipal(null, data?.originatingView || 'gerir-tarefas', data?.preSelectedLink || null);
                }
                break;
            case 'editar-tarefa': 
                if (data && data.tarefaId) {
                    try {
                        const tarefaParaEditar = await dbRef.getItemById(TAREFAS_STORE_NAME, data.tarefaId);
                        if (tarefaParaEditar && tarefasFormModuleRef && tarefasFormModuleRef.renderNovaTarefaFormPaginaPrincipal) {
                            tarefasFormModuleRef.renderNovaTarefaFormPaginaPrincipal(tarefaParaEditar, data.originatingView || 'gerir-tarefas');
                        } else {
                            if (globalShowFeedbackRef) globalShowFeedbackRef("Tarefa não encontrada para edição.", "error");
                        }
                    } catch (error) {
                        console.error("Erro ao buscar tarefa para edição:", error);
                        if (globalShowFeedbackRef) globalShowFeedbackRef("Erro ao carregar dados da tarefa para edição.", "error");
                    }
                } else {
                    console.warn("Tarefas.JS: 'editar-tarefa' chamado sem o ID da tarefa.");
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Não foi possível identificar a tarefa para edição.", "error");
                }
                break;
            case 'gerir-tarefas':
                if (tarefasListagensModuleRef && tarefasListagensModuleRef.renderGerirTarefasPage) {
                    tarefasListagensModuleRef.renderGerirTarefasPage();
                }
                break;
            case 'minhas-tarefas': 
                if (tarefasListagensModuleRef && tarefasListagensModuleRef.renderGerirTarefasPage) {
                    tarefasListagensModuleRef.renderGerirTarefasPage(false, { isMyTasksView: true });
                }
                break;
            case 'visualizar-tarefa':
                if (data && data.tarefaId && tarefasViewModuleRef && tarefasViewModuleRef.renderVisualizarTarefaPage) {
                    tarefasViewModuleRef.renderVisualizarTarefaPage(data.tarefaId, data.originatingView || 'gerir-tarefas');
                }
                break;
            case 'calendario-tarefas':
                if (tarefasCalendarioModuleRef && tarefasCalendarioModuleRef.renderCalendarioTarefasPage) {
                    tarefasCalendarioModuleRef.renderCalendarioTarefasPage();
                }
                break;
            default:
                console.warn(`Tarefas.JS: Ação de menu desconhecida: ${action}`);
                if (globalIrParaHomeRef) globalIrParaHomeRef();
                break;
        }
    }

    return {
        init,
        handleMenuAction
    };
})();