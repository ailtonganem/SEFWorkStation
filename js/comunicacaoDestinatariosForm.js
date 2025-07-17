// js/comunicacaoDestinatariosForm.js - Formulário para Destinatários Individuais
// v1.0.1 - Remove classe page-section para expandir a largura da visualização.
// v1.0 - CRUD básico para Destinatários.

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.Comunicacao = window.SEFWorkStation.Comunicacao || {};

window.SEFWorkStation.ComunicacaoDestinatariosForm = (function() {
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let navigateAfterSaveOrCancelCallback;
    let refreshApplicationStateRef;
    let dbRef;
    let appModuleRef;
    let uiModuleRef;
    // let viewModuleRef; // Para navegação para a view após salvar, se existir

    const DESTINATARIOS_STORE_NAME = 'comunicacaoDestinatariosStore';
    let currentDestinatarioId = null;
    let originalDestinatarioData = null;

    function init(
        mainWrapper, showFeedback, clearFeedback, navigateCb, refreshState,
        db, applicationModule, ui
        // , viewMod // Para o futuro
    ) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedback;
        globalClearFeedbackRef = clearFeedback;
        navigateAfterSaveOrCancelCallback = navigateCb;
        refreshApplicationStateRef = refreshState;
        dbRef = db;
        appModuleRef = applicationModule;
        uiModuleRef = ui;
        // viewModuleRef = viewMod; // Para o futuro

        console.log("ComunicacaoDestinatariosForm.JS: Módulo inicializado (v1.0.1).");
    }

    function isValidEmailLocal(email) {
        if (!email || email.trim() === '') return false;
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    }

    async function renderFormularioDestinatario(destinatarioData = null, originatingView = 'gerir-destinatarios') {
        if (globalClearFeedbackRef) globalClearFeedbackRef();

        const isEditing = destinatarioData && destinatarioData.id;
        currentDestinatarioId = isEditing ? destinatarioData.id : null;
        originalDestinatarioData = isEditing ? JSON.parse(JSON.stringify(destinatarioData)) : null;

        const formTitle = isEditing ? "Editar Destinatário" : "Novo Destinatário";
        const feedbackAreaId = `feedback-form-destinatario-${currentDestinatarioId || 'novo'}`;

        mainContentWrapperRef.innerHTML = ''; // Limpa o conteúdo principal
        // if (appModuleRef && typeof appModuleRef.setCurrentViewTarget === 'function') {
        //     appModuleRef.setCurrentViewTarget('form-destinatario', !isEditing);
        // }

        // REMOVIDA CLASSE page-section do div mais externo
        const formHtml = `
            <div class="form-section"> 
                <h2 class="text-xl font-semibold mb-6">${formTitle}</h2>
                <div id="${feedbackAreaId}" class="mb-4"></div>

                <form id="form-destinatario-comunicacao">
                    <input type="hidden" id="dest-id-hidden" value="${currentDestinatarioId || ''}">
                    <input type="hidden" id="dest-dataCriacao-hidden" value="${(isEditing && destinatarioData?.dataCriacao) ? destinatarioData.dataCriacao : new Date().toISOString()}">

                    <div class="form-grid">
                        <div>
                            <label for="dest-nome" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome: <span class="text-red-500">*</span></label>
                            <input type="text" id="dest-nome" name="nome" class="form-input-text mt-1 block w-full" required value="${destinatarioData?.nome?.replace(/"/g, '"') || ''}">
                        </div>
                        <div>
                            <label for="dest-email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">E-mail: <span class="text-red-500">*</span></label>
                            <input type="email" id="dest-email" name="email" class="form-input-text mt-1 block w-full" required value="${destinatarioData?.email?.replace(/"/g, '"') || ''}">
                            <p id="feedback-dest-email" class="text-xs mt-1"></p>
                        </div>
                    </div>

                    <div class="form-grid mt-4">
                        <div>
                            <label for="dest-empresa" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Empresa/Organização:</label>
                            <input type="text" id="dest-empresa" name="empresa" class="form-input-text mt-1 block w-full" value="${destinatarioData?.empresa?.replace(/"/g, '"') || ''}">
                        </div>
                        <div>
                            <label for="dest-telefone" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Telefone:</label>
                            <input type="tel" id="dest-telefone" name="telefone" class="form-input-text mt-1 block w-full" value="${destinatarioData?.telefone?.replace(/"/g, '"') || ''}" placeholder="(XX) XXXXX-XXXX">
                        </div>
                    </div>
                    
                    <div class="mb-4 mt-4">
                        <label for="dest-observacoes" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Observações:</label>
                        <textarea id="dest-observacoes" name="observacoes" rows="3" class="form-input-text mt-1 block w-full">${destinatarioData?.observacoes || ''}</textarea>
                    </div>

                    <div class="form-actions">
                        <button type="button" id="btn-cancelar-destinatario" class="btn-secondary">Cancelar</button>
                        <button type="submit" id="btn-salvar-destinatario" class="btn-primary">${isEditing ? 'Atualizar Destinatário' : 'Salvar Destinatário'}</button>
                    </div>
                </form>
            </div>
        `;
        mainContentWrapperRef.innerHTML = formHtml;
        addFormEventListenersDestinatario(feedbackAreaId, originatingView, isEditing);
    }

    function addFormEventListenersDestinatario(feedbackAreaId, originatingView, isEditing) {
        const form = document.getElementById('form-destinatario-comunicacao');
        const feedbackAreaForm = document.getElementById(feedbackAreaId);
        const emailInput = document.getElementById('dest-email');
        const feedbackEmailEl = document.getElementById('feedback-dest-email');

        if (emailInput && feedbackEmailEl) {
            emailInput.addEventListener('blur', () => {
                const valor = emailInput.value.trim();
                feedbackEmailEl.textContent = '';
                feedbackEmailEl.className = 'text-xs mt-1';
                if (!valor) {
                    feedbackEmailEl.textContent = 'E-mail é obrigatório.';
                    feedbackEmailEl.classList.add('text-red-600', 'dark:text-red-400');
                    return;
                }
                if (!isValidEmailLocal(valor)) {
                    feedbackEmailEl.textContent = 'Formato de e-mail inválido.';
                    feedbackEmailEl.classList.add('text-red-600', 'dark:text-red-400');
                } else {
                    feedbackEmailEl.textContent = 'E-mail válido.';
                    feedbackEmailEl.classList.add('text-green-600', 'dark:text-green-400');
                }
            });
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (globalClearFeedbackRef && feedbackAreaForm) globalClearFeedbackRef(feedbackAreaForm);

            const nomeInput = document.getElementById('dest-nome');
            const emailVal = emailInput.value.trim();

            if (!nomeInput.value.trim()) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("O 'Nome' do destinatário é obrigatório.", "error", feedbackAreaForm);
                nomeInput.focus(); return;
            }
            if (!emailVal) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("O 'E-mail' do destinatário é obrigatório.", "error", feedbackAreaForm);
                emailInput.focus(); return;
            }
            if (!isValidEmailLocal(emailVal)) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("Formato de e-mail inválido.", "error", feedbackAreaForm);
                emailInput.focus(); return;
            }

            try {
                const todosDestinatarios = await dbRef.getAllItems(DESTINATARIOS_STORE_NAME);
                if (todosDestinatarios.some(d => d.email.toLowerCase() === emailVal.toLowerCase() && d.id !== currentDestinatarioId)) {
                    if (globalShowFeedbackRef) globalShowFeedbackRef(`O e-mail "${emailVal}" já está cadastrado para outro destinatário.`, "error", feedbackAreaForm);
                    emailInput.focus(); return;
                }

                const finalDestinatarioId = currentDestinatarioId || appModuleRef.generateUUID();
                const destinatarioPayload = {
                    id: finalDestinatarioId,
                    nome: nomeInput.value.trim(),
                    email: emailVal,
                    empresa: document.getElementById('dest-empresa').value.trim(),
                    telefone: document.getElementById('dest-telefone').value.trim(),
                    observacoes: document.getElementById('dest-observacoes').value.trim(),
                    dataCriacao: document.getElementById('dest-dataCriacao-hidden').value,
                    dataModificacao: new Date().toISOString(),
                    isDeleted: (isEditing && originalDestinatarioData) ? (originalDestinatarioData.isDeleted || false) : false
                };

                if (isEditing) {
                    await dbRef.updateItem(DESTINATARIOS_STORE_NAME, destinatarioPayload);
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Destinatário atualizado com sucesso!", "success", feedbackAreaForm);
                } else {
                    await dbRef.addItem(DESTINATARIOS_STORE_NAME, destinatarioPayload);
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Destinatário salvo com sucesso!", "success", feedbackAreaForm);
                }

                if (refreshApplicationStateRef) await refreshApplicationStateRef();

                if (navigateAfterSaveOrCancelCallback) {
                     // Por enquanto, sempre volta para a lista. View individual será Fase 2 ou posterior.
                    navigateAfterSaveOrCancelCallback('gerir-destinatarios');
                }

            } catch (error) {
                console.error("ComunicacaoDestinatariosForm.JS: Erro ao salvar destinatário:", error);
                if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao salvar destinatário: ${error.message}`, "error", feedbackAreaForm);
            }
        });

        document.getElementById('btn-cancelar-destinatario').addEventListener('click', () => {
            if (appModuleRef && appModuleRef.navigateBack) {
                appModuleRef.navigateBack();
            } else {
                 if (navigateAfterSaveOrCancelCallback) navigateAfterSaveOrCancelCallback(originatingView || 'gerir-destinatarios');
            }
        });
    }

    return {
        init,
        renderFormularioDestinatario
    };
})();