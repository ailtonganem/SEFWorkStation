// js/notasRapidas.js
// v3.0.3 - ALTERADO: Edição de notas agora abre em página inteira em vez de modal, para consistência com o restante do sistema.
// v3.0.2 - CORRIGIDO: Lista de notas não era atualizada automaticamente após edição em modal.
// v3.0.1 - CORRIGIDO: Refatora a função init para garantir a correta atribuição e inicialização dos submódulos, resolvendo o problema de inoperância do módulo.
// v3.0.0 - REATORADO: Módulo principal agora atua como um agregador e roteador de ações para os submódulos de Notas Rápidas. Corrige erro crítico de inicialização.
// (Histórico anterior refatorado)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.NotasRapidas = (function() {
    let notasRapidasFormModuleRef;
    let notasRapidasListagensModuleRef;
    let notasRapidasViewModuleRef;

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

    const NOTAS_RAPIDAS_STORE_NAME = 'notasRapidasStore';

    function init(
        mainWrapper,
        showFeedbackFunc,
        clearFeedbackFunc,
        irParaHomeFunc,
        refreshFunc,
        dbModuleRef,
        uiRef,
        formModule,
        listagensModule,
        viewModule,
        // Tags e Categorias não são usadas em Notas Rápidas, parâmetros removidos
        tagsManagementModule,
        categoriasManagementModule,
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
            console.error("NotasRapidas.JS: init - appModuleRef (após atribuição) é undefined/null! Isso causará problemas nos submódulos.");
        }

        // Atribui as referências aos submódulos PRIMEIRO.
        notasRapidasFormModuleRef = formModule;
        notasRapidasListagensModuleRef = listagensModule;
        notasRapidasViewModuleRef = viewModule;
        
        // AGORA, inicializa cada submódulo usando a referência correta.
        if (notasRapidasFormModuleRef && typeof notasRapidasFormModuleRef.init === 'function') {
            notasRapidasFormModuleRef.init(
                mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef,
                // Função de callback para navegação após salvar
                (originViewTarget, notaIdSalva) => {
                    if (uiModuleRef && uiModuleRef.closeModal) uiModuleRef.closeModal();
                    if (originViewTarget === 'view-nota-rapida' && notaIdSalva && notasRapidasViewModuleRef && notasRapidasViewModuleRef.renderVisualizarNotaPage) {
                         if (appModuleRef && appModuleRef.handleMenuAction) {
                             appModuleRef.handleMenuAction('visualizar-nota-rapida', { notaId: notaIdSalva, originatingView: 'form-nota-rapida-modal'});
                        } else {
                            // Fallback se appModuleRef não estiver disponível para navegação
                            notasRapidasViewModuleRef.renderVisualizarNotaPage(notaIdSalva, 'form-nota-rapida-modal');
                        }
                    } else if (appModuleRef && appModuleRef.handleMenuAction) {
                        appModuleRef.handleMenuAction(originViewTarget || 'gerir-notas-rapidas');
                    }
                },
                refreshApplicationStateRef, dbRef, appModuleRef, uiModuleRef, notasRapidasViewModuleRef
            );
        } else { console.error("NotasRapidas.JS: Submódulo NotasRapidasForm não pôde ser inicializado."); }

        if (notasRapidasListagensModuleRef && typeof notasRapidasListagensModuleRef.init === 'function') {
            notasRapidasListagensModuleRef.init(
                mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef,
                // Callback para quando um item é clicado na lista
                (notaData) => {
                    if (appModuleRef && appModuleRef.handleMenuAction) {
                        appModuleRef.handleMenuAction('visualizar-nota-rapida', { notaId: notaData.id, originatingView: 'gerir-notas-rapidas' });
                    }
                },
                refreshApplicationStateRef, dbRef, appModuleRef, notasRapidasFormModuleRef, uiModuleRef
            );
        } else { console.error("NotasRapidas.JS: Submódulo NotasRapidasListagens não pôde ser inicializado.");}

        if (notasRapidasViewModuleRef && notasRapidasViewModuleRef.init) {
            notasRapidasViewModuleRef.init(
                mainContentWrapperRef, globalShowFeedbackRef, globalClearFeedbackRef,
                // Callback para voltar
                (originView) => handleMenuAction(originView || 'gerir-notas-rapidas'),
                // Callback para editar
                (notaData, originatingViewFromView) => {
                     handleMenuAction('editar-nota-rapida', { nota: notaData, originatingView: originatingViewFromView || 'view-nota-rapida' });
                },
                refreshApplicationStateRef, dbRef, appModuleRef, uiModuleRef,
                sharingModuleRef, sharedUtilsRef // Dependências de compartilhamento
            );
        } else { console.error("NotasRapidas.JS: Submódulo NotasRapidasView não pôde ser inicializado."); }
        
        console.log("NotasRapidas.JS: Módulo Principal de Notas Rápidas inicializado (v3.0.3).");
    }
    
    async function handleMenuAction(action, data = null) {
        const feedbackAreaListagem = document.getElementById('feedback-area-notas-rapidas-listagem');
        if (globalClearFeedbackRef && feedbackAreaListagem) globalClearFeedbackRef(feedbackAreaListagem);
        else if (globalClearFeedbackRef) globalClearFeedbackRef();
        
        if (uiModuleRef && uiModuleRef.closeAllDropdowns) uiModuleRef.closeAllDropdowns();

        switch (action) {
            case 'nova-nota-rapida':
                if (data?.originatingView) {
                    abrirFormularioNotaEmModal(null, data.originatingView, data.preSelectedLink);
                } else if (notasRapidasFormModuleRef && notasRapidasFormModuleRef.renderNovaNotaFormPaginaPrincipal) {
                    notasRapidasFormModuleRef.renderNovaNotaFormPaginaPrincipal(null, 'gerir-notas-rapidas', null);
                }
                break;
            case 'editar-nota-rapida': 
                // ALTERADO: Em vez de abrir modal, abre a página de edição completa.
                if (data && data.nota && notasRapidasFormModuleRef && notasRapidasFormModuleRef.renderNovaNotaFormPaginaPrincipal) {
                    notasRapidasFormModuleRef.renderNovaNotaFormPaginaPrincipal(data.nota, data.originatingView || 'visualizar-nota-rapida');
                } else {
                    console.warn("NotasRapidas.JS: 'editar-nota-rapida' chamado sem dados da nota ou módulo de formulário indisponível.");
                    if(globalShowFeedbackRef) globalShowFeedbackRef("Erro ao tentar abrir a edição da nota.", "error");
                }
                break;
            case 'gerir-notas-rapidas':
                if (notasRapidasListagensModuleRef && notasRapidasListagensModuleRef.renderNotasRapidasPage) {
                    notasRapidasListagensModuleRef.renderNotasRapidasPage();
                } else {
                    console.error("NotasRapidas.JS: Função renderNotasRapidasPage não encontrada no submódulo de listagens.");
                    if(globalShowFeedbackRef) globalShowFeedbackRef("Erro ao tentar abrir a gestão de notas.", "error");
                }
                break;
            case 'visualizar-nota-rapida':
                if (data && data.notaId && notasRapidasViewModuleRef && notasRapidasViewModuleRef.renderVisualizarNotaPage) {
                    notasRapidasViewModuleRef.renderVisualizarNotaPage(data.notaId, data.originatingView || 'gerir-notas-rapidas');
                }
                break;
            default:
                console.warn(`NotasRapidas.JS: Ação de menu desconhecida: ${action}`);
                if (globalIrParaHomeRef) globalIrParaHomeRef();
                break;
        }
    }

    async function abrirFormularioNotaEmModal(notaData = null, originatingView = 'gerir-notas-rapidas', preSelectedLink = null) {
        const feedbackAreaParaModal = mainContentWrapperRef.querySelector('#feedback-area') || mainContentWrapperRef;

        if (!uiModuleRef || !uiModuleRef.showModal) {
            if (globalShowFeedbackRef) globalShowFeedbackRef("Funcionalidade de modal não está disponível.", "error", feedbackAreaParaModal);
            return;
        }
        if (!notasRapidasFormModuleRef || !notasRapidasFormModuleRef.getFormHtml || !notasRapidasFormModuleRef.attachFormEventListenersToModal || !notasRapidasFormModuleRef.handleModalFormSubmit) {
            if (globalShowFeedbackRef) globalShowFeedbackRef("Módulo de formulário de notas rápidas não está pronto para operar em modais.", "error", feedbackAreaParaModal);
            console.error("NotasRapidas.JS: Funções necessárias do notasRapidasFormModuleRef estão faltando.");
            return;
        }

        const isEditingModal = notaData && notaData.id;
        const formTitle = isEditingModal ? "Editar Nota Rápida" : "Nova Nota Rápida";
        const feedbackAreaIdNoFormulario = `feedback-area-no-form-nota-${isEditingModal ? notaData.id : 'nova'}-${Date.now()}`;

        try {
            const formHtmlParaModal = await notasRapidasFormModuleRef.getFormHtml(notaData, originatingView, preSelectedLink, true);

            const buttonsConfig = [
                {
                    text: 'Cancelar',
                    class: 'btn-secondary',
                    callback: () => {
                        if (SEFWorkStation.EditorTexto.getInstancia(notasRapidasFormModuleRef.getEditorId(true))) {
                            SEFWorkStation.EditorTexto.destruirEditor(notasRapidasFormModuleRef.getEditorId(true));
                        }
                        if (uiModuleRef && uiModuleRef.closeModal) uiModuleRef.closeModal();
                        return true;
                    }
                },
                {
                    text: isEditingModal ? 'Atualizar Nota' : 'Salvar Nota',
                    class: 'btn-primary',
                    callback: async () => {
                        const modalParaSubmeter = document.querySelector('.fixed.inset-0[role="dialog"][aria-modal="true"]');
                        const modalContentEl = modalParaSubmeter ? modalParaSubmeter.querySelector('.modal-content-scrollable') : null;

                        if (!modalContentEl) {
                             console.error("NotasRapidas.JS: Elemento de conteúdo do modal ativo não encontrado para submissão.");
                             if (globalShowFeedbackRef) globalShowFeedbackRef("Erro interno ao salvar a nota do modal.", "error", feedbackAreaParaModal);
                             return false;
                        }
                        const success = await notasRapidasFormModuleRef.handleModalFormSubmit(
                            modalContentEl,
                            notaData,
                            originatingView,
                            feedbackAreaIdNoFormulario,
                            true
                        );
                        if (success) {
                            if (SEFWorkStation.EditorTexto.getInstancia(notasRapidasFormModuleRef.getEditorId(true))) {
                                SEFWorkStation.EditorTexto.destruirEditor(notasRapidasFormModuleRef.getEditorId(true));
                            }
                            // CORREÇÃO: Adicionado para recarregar a visão de origem
                            if (appModuleRef && appModuleRef.handleMenuAction) {
                                appModuleRef.handleMenuAction(originatingView || 'gerir-notas-rapidas');
                            }
                        }
                        return success;
                    }
                }
            ];
            const modalContentComFeedback = `<div id="${feedbackAreaIdNoFormulario}" class="mb-3 text-sm"></div>${formHtmlParaModal}`;
            const modalElement = uiModuleRef.showModal(formTitle, modalContentComFeedback, buttonsConfig, 'max-w-xl');

            if (modalElement) {
                const modalContentFoundEl = modalElement.querySelector('.modal-content-scrollable');
                if (modalContentFoundEl) {
                     await notasRapidasFormModuleRef.attachFormEventListenersToModal(modalContentFoundEl, notaData, originatingView, isEditingModal, feedbackAreaIdNoFormulario, true);
                } else {
                    console.error("NotasRapidas.JS: Não foi possível encontrar o elemento de conteúdo do modal para anexar listeners após a criação.");
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Erro interno ao configurar o formulário da nota.", "error", feedbackAreaParaModal);
                }
            } else {
                console.error("NotasRapidas.JS: Falha ao obter o elemento do modal após showModal.");
                if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico ao abrir o formulário da nota em modal.", "error", feedbackAreaParaModal);
            }
        } catch (error) {
            console.error("NotasRapidas.JS: Erro ao preparar ou mostrar formulário de nota em modal:", error);
             if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao abrir formulário: ${error.message}`, "error", feedbackAreaParaModal);
        }
    }

    return {
        init,
        handleMenuAction
    };
})();