// js/comunicacaoGruposForm.js
// v1.0.1 - Remove classe page-section para expandir a largura da visualização.
// v1.0.0 (SEFWorkStation.ComunicacaoGrupos.Form) - Versão inicial para Grupos de Destinatários (Comunicação).
// Baseado no antigo servidoresGruposForm.js, adaptado para o contexto de comunicação.

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.Comunicacao = window.SEFWorkStation.Comunicacao || {};
window.SEFWorkStation.ComunicacaoGrupos = window.SEFWorkStation.ComunicacaoGrupos || {}; 

window.SEFWorkStation.ComunicacaoGrupos.Form = (function() { 
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let navigateAfterSaveOrCancelCallback; 
    let refreshApplicationStateRef;
    let dbRef;
    let appModuleRef;
    let uiModuleRef;

    const GRUPOS_COMUNICACAO_STORE_NAME = 'comunicacaoGruposStore'; // Alterado de GRUPOS_SERVIDORES_STORE_NAME
    const DESTINATARIOS_STORE_NAME = 'comunicacaoDestinatariosStore'; // Alterado de SERVIDORES_STORE_NAME

    let currentGrupoId = null;
    let originalGrupoData = null;
    
    let tempSelectedDestinatarioIds = []; // Alterado de tempSelectedServidorIds
    let tempEmailsAvulsos = [];

    function init(
        mainWrapper, showFeedback, clearFeedback, navigateCb, refreshState,
        db, applicationModule, ui
    ) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedback;
        globalClearFeedbackRef = clearFeedback;
        navigateAfterSaveOrCancelCallback = navigateCb;
        refreshApplicationStateRef = refreshState;
        dbRef = db;
        appModuleRef = applicationModule;
        uiModuleRef = ui;

        if (!dbRef) console.error("ComunicacaoGruposForm.JS: init - Referência ao DB não fornecida!");
        if (!appModuleRef) console.error("ComunicacaoGruposForm.JS: init - appModuleRef não fornecido.");
        if (!uiModuleRef) console.warn("ComunicacaoGruposForm.JS: init - uiModuleRef não fornecido, modais podem não funcionar.");
        console.log("ComunicacaoGruposForm.JS: Módulo inicializado (v1.0.1).");
    }

    function isValidEmailLocal(email) { 
        if (!email || email.trim() === '') return false;
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    }

    async function renderFormularioGrupoDestinatarios(grupoData = null, originatingView = 'gerir-grupos-destinatarios') { // Nome da função alterado
        if (globalClearFeedbackRef) globalClearFeedbackRef();

        const isEditing = grupoData && grupoData.id;
        currentGrupoId = isEditing ? grupoData.id : null;
        originalGrupoData = isEditing ? JSON.parse(JSON.stringify(grupoData)) : null;

        tempSelectedDestinatarioIds = (isEditing && Array.isArray(grupoData.idsDestinatariosMembros)) ? [...grupoData.idsDestinatariosMembros] : []; // Alterado
        tempEmailsAvulsos = (isEditing && Array.isArray(grupoData.emailsAvulsosMembros)) ? [...grupoData.emailsAvulsosMembros] : []; // Alterado (nome da propriedade no grupoData)

        const formTitle = isEditing ? "Editar Grupo de Destinatários" : "Novo Grupo de Destinatários"; // Alterado
        const feedbackAreaId = `feedback-form-grupo-comunicacao-${currentGrupoId || 'novo'}`; // Alterado

        mainContentWrapperRef.innerHTML = '';
        
        if (appModuleRef && typeof appModuleRef.setCurrentViewTarget === 'function') {
            appModuleRef.setCurrentViewTarget('form-grupo-destinatarios', !isEditing); // Alterado
        }

        // REMOVIDA CLASSE page-section do div mais externo
        const formHtml = `
            <div class="form-section"> 
                <h2 class="text-xl font-semibold mb-6">${formTitle}</h2>
                <div id="${feedbackAreaId}" class="mb-4"></div>

                <form id="form-grupo-comunicacao">
                    <input type="hidden" id="grupo-com-id-hidden" value="${currentGrupoId || ''}">
                    <input type="hidden" id="grupo-com-dataCriacao-hidden" value="${(isEditing && grupoData?.dataCriacao) ? grupoData.dataCriacao : new Date().toISOString()}">

                    <div class="mb-4">
                        <label for="grupo-com-nome" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome do Grupo: <span class="text-red-500">*</span></label>
                        <input type="text" id="grupo-com-nome" name="nomeGrupo" class="form-input-text mt-1 block w-full" required value="${grupoData?.nomeGrupo?.replace(/"/g, '"') || ''}">
                    </div>
                    
                    <div class="mb-4">
                        <label for="grupo-com-descricao" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição (Opcional):</label>
                        <textarea id="grupo-com-descricao" name="descricaoGrupo" rows="3" class="form-input-text mt-1 block w-full">${grupoData?.descricaoGrupo || ''}</textarea>
                    </div>

                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Membros do Grupo:</label>
                        <div id="lista-membros-grupo-comunicacao-form" class="mt-1 mb-2 p-2 border dark:border-slate-500 rounded-md bg-gray-100 dark:bg-slate-700 min-h-[60px] max-h-40 overflow-y-auto">
                            </div>
                        <button type="button" id="btn-gerenciar-membros-grupo-com" class="btn-secondary btn-sm text-xs">Adicionar/Remover Membros</button>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" id="btn-cancelar-grupo-com" class="btn-secondary">Cancelar</button>
                        <button type="submit" id="btn-salvar-grupo-com" class="btn-primary">${isEditing ? 'Atualizar Grupo' : 'Salvar Grupo'}</button>
                    </div>
                </form>
            </div>
        `;
        mainContentWrapperRef.innerHTML = formHtml;
        await renderSelectedMembrosGrupoNoFormCom(); // Nome da função alterado
        addFormEventListenersGrupoComunicacao(feedbackAreaId, originatingView, isEditing); // Nome da função alterado
    }

    async function renderSelectedMembrosGrupoNoFormCom() { // Nome da função alterado
        const container = document.getElementById('lista-membros-grupo-comunicacao-form'); // ID alterado
        if (!container) return;
        container.innerHTML = '';
        
        let hasMembros = false;
        const ul = document.createElement('ul');
        ul.className = 'list-none p-0 space-y-1';

        for (const destinatarioId of tempSelectedDestinatarioIds) { // Variável alterada
            try {
                const destinatario = await dbRef.getItemById(DESTINATARIOS_STORE_NAME, destinatarioId); // Store alterada
                const li = document.createElement('li');
                li.className = 'flex justify-between items-center text-xs p-1 bg-blue-100 dark:bg-blue-700 rounded';
                const displayName = destinatario ? `${destinatario.nome} (${destinatario.email || 'S/Email'})` : `ID ${destinatarioId.substring(0,8)} (Não encontrado)`; // Lógica de display adaptada
                li.innerHTML = `<span class="truncate text-blue-800 dark:text-blue-200" title="${displayName.replace(/"/g, '"')}">${displayName}</span>
                                <button type="button" data-id="${destinatarioId}" data-type="destinatario" class="btn-remove-membro-grupo-com-form text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm leading-none p-0.5" title="Remover Destinatário">×</button>`; // Tipo e título alterados
                ul.appendChild(li);
                hasMembros = true;
            } catch (error) { console.warn("Erro ao renderizar membro destinatário no formulário:", error); }
        }

        for (const email of tempEmailsAvulsos) {
            const li = document.createElement('li');
            li.className = 'flex justify-between items-center text-xs p-1 bg-green-100 dark:bg-green-700 rounded';
            li.innerHTML = `<span class="truncate text-green-800 dark:text-green-200" title="${email.replace(/"/g, '"')}">${email} (Avulso)</span>
                            <button type="button" data-email="${email}" data-type="email" class="btn-remove-membro-grupo-com-form text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm leading-none p-0.5" title="Remover E-mail Avulso">×</button>`;
            ul.appendChild(li);
            hasMembros = true;
        }

        if (!hasMembros) {
            container.innerHTML = `<p class="text-xs text-gray-500 dark:text-gray-400">Nenhum membro adicionado.</p>`;
        } else {
            container.appendChild(ul);
            container.querySelectorAll('.btn-remove-membro-grupo-com-form').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const type = e.currentTarget.dataset.type;
                    if (type === 'destinatario') { // Alterado
                        const idToRemove = e.currentTarget.dataset.id;
                        tempSelectedDestinatarioIds = tempSelectedDestinatarioIds.filter(id => id !== idToRemove); // Alterado
                    } else if (type === 'email') {
                        const emailToRemove = e.currentTarget.dataset.email;
                        tempEmailsAvulsos = tempEmailsAvulsos.filter(email => email !== emailToRemove);
                    }
                    renderSelectedMembrosGrupoNoFormCom(); // Alterado
                });
            });
        }
    }
    
    async function abrirModalSelecaoMembrosComunicacao(feedbackAreaEl) { // Nome da função alterado
        if (!uiModuleRef || !uiModuleRef.showModal) {
            if(globalShowFeedbackRef) globalShowFeedbackRef("Erro: Funcionalidade de modal não está disponível.", "error", feedbackAreaEl);
            return;
        }
        const modalId = `modal-selecionar-membros-comunicacao-${Date.now()}`;
        let modalSelectedDestinatarioIdsCopy = [...tempSelectedDestinatarioIds]; // Variável alterada
        let modalEmailsAvulsosCopy = [...tempEmailsAvulsos];

        const modalContentHtml = `
            <div class="space-y-3">
                <div>
                    <label for="filtro-modal-destinatarios-grupo" class="block text-xs font-medium text-gray-700 dark:text-gray-300">Buscar Destinatários Cadastrados (Ativos):</label>
                    <input type="search" id="filtro-modal-destinatarios-grupo" class="form-input-text w-full text-sm mt-1" placeholder="Nome ou e-mail...">
                    <div id="lista-destinatarios-modal-grupo" class="mt-2 max-h-32 overflow-y-auto border dark:border-slate-600 p-2 rounded-md bg-gray-50 dark:bg-slate-700/50">
                        <p class="text-xs text-gray-500 dark:text-gray-400">Carregando...</p>
                    </div>
                </div>
                <hr class="dark:border-slate-600"/>
                <div>
                    <label for="input-email-avulso-grupo-com" class="block text-xs font-medium text-gray-700 dark:text-gray-300">Adicionar E-mail Avulso:</label>
                    <div class="flex items-center gap-2 mt-1">
                        <input type="email" id="input-email-avulso-grupo-com" class="form-input-text flex-grow text-sm" placeholder="exemplo@dominio.com">
                        <button type="button" id="btn-add-email-avulso-grupo-com" class="btn-secondary btn-xs whitespace-nowrap">Adicionar E-mail</button>
                    </div>
                     <p id="feedback-email-avulso-grupo-com" class="text-xs mt-1"></p>
                </div>
                <hr class="dark:border-slate-600"/>
                <div>
                    <h4 class="text-xs font-medium text-gray-700 dark:text-gray-300">Membros Selecionados para o Grupo:</h4>
                    <div id="membros-selecionados-modal-grupo-com" class="mt-1 p-2 border dark:border-slate-500 rounded-md bg-gray-100 dark:bg-slate-700 min-h-[40px] max-h-24 overflow-y-auto">
                        </div>
                </div>
            </div>
        `;
        
        const renderizarMembrosSelecionadosNoModalCom = async () => { // Nome da função alterado
            const container = document.getElementById('membros-selecionados-modal-grupo-com'); // ID alterado
            if(!container) return;
            container.innerHTML = '';
            let hasAnyMember = false;
            const ul = document.createElement('ul'); ul.className = 'space-y-0.5';

            for(const id of modalSelectedDestinatarioIdsCopy) { // Variável alterada
                try {
                    const destinatario = await dbRef.getItemById(DESTINATARIOS_STORE_NAME, id); // Store alterada
                    if (destinatario) {
                        const li = document.createElement('li'); li.className = 'text-xs text-blue-700 dark:text-blue-300';
                        li.textContent = `${destinatario.nome} (${destinatario.email || 'S/Email'})`; ul.appendChild(li); hasAnyMember = true; // Lógica de display adaptada
                    }
                } catch(e) {/* */}
            }
            modalEmailsAvulsosCopy.forEach(email => {
                const li = document.createElement('li'); li.className = 'text-xs text-green-700 dark:text-green-400';
                li.textContent = `${email} (Avulso)`; ul.appendChild(li); hasAnyMember = true;
            });

            if(!hasAnyMember) container.innerHTML = '<p class="text-xs text-gray-500 dark:text-gray-400">Nenhum membro adicionado.</p>';
            else container.appendChild(ul);
        };

        const carregarDestinatariosNoModal = async (termoBusca = '') => { // Nome da função alterado
            const listaModalEl = document.getElementById('lista-destinatarios-modal-grupo'); // ID alterado
            if (!listaModalEl) return;
            listaModalEl.innerHTML = '<p class="text-xs text-gray-500 dark:text-gray-400">Carregando...</p>';
            try {
                let destinatarios = await dbRef.getAllItems(DESTINATARIOS_STORE_NAME); // Store alterada
                destinatarios = destinatarios.filter(d => !d.isDeleted && d.email); // Filtro adaptado
                if (termoBusca) {
                    const t = termoBusca.toLowerCase();
                    destinatarios = destinatarios.filter(d => (d.nome && d.nome.toLowerCase().includes(t)) || (d.email && d.email.toLowerCase().includes(t))); // Filtro adaptado
                }
                destinatarios.sort((a,b) => (a.nome || "").localeCompare(b.nome || ""));
                if (destinatarios.length === 0) {
                    listaModalEl.innerHTML = `<p class="text-xs text-gray-500 dark:text-gray-400">${termoBusca ? 'Nenhum destinatário encontrado.' : 'Nenhum destinatário com e-mail cadastrado.'}</p>`; // Mensagem adaptada
                    return;
                }
                let itemsHtml = '<ul class="space-y-1">';
                destinatarios.forEach(dest => {
                    const isChecked = modalSelectedDestinatarioIdsCopy.includes(dest.id); // Variável alterada
                    itemsHtml += `<li><label class="flex items-center text-xs cursor-pointer"><input type="checkbox" value="${dest.id}" class="form-checkbox rounded h-3.5 w-3.5 mr-1.5 modal-destinatario-grupo-checkbox" ${isChecked ? 'checked' : ''}> ${dest.nome} - ${dest.email}</label></li>`; // Display adaptado
                });
                itemsHtml += '</ul>';
                listaModalEl.innerHTML = itemsHtml;
                listaModalEl.querySelectorAll('.modal-destinatario-grupo-checkbox').forEach(cb => { // Classe alterada
                    cb.addEventListener('change', (e) => {
                        const destinatarioId = e.target.value; // Variável alterada
                        if (e.target.checked) { if (!modalSelectedDestinatarioIdsCopy.includes(destinatarioId)) modalSelectedDestinatarioIdsCopy.push(destinatarioId); } // Variável alterada
                        else { modalSelectedDestinatarioIdsCopy = modalSelectedDestinatarioIdsCopy.filter(id => id !== destinatarioId); } // Variável alterada
                        renderizarMembrosSelecionadosNoModalCom(); // Alterado
                    });
                });
            } catch(e) { if(listaModalEl) listaModalEl.innerHTML = '<p class="text-xs text-red-500 dark:text-red-400">Erro ao carregar destinatários.</p>'; } // Mensagem adaptada
        };

        const modalButtons = [
            { text: 'Cancelar', class: 'btn-secondary text-sm', callback: () => uiModuleRef.closeModal() },
            { text: 'Confirmar Membros', class: 'btn-primary text-sm', callback: async () => {
                tempSelectedDestinatarioIds = [...modalSelectedDestinatarioIdsCopy]; // Variável alterada
                tempEmailsAvulsos = [...modalEmailsAvulsosCopy];
                await renderSelectedMembrosGrupoNoFormCom(); // Alterado
                uiModuleRef.closeModal();
            }}
        ];
        uiModuleRef.showModal('Adicionar/Remover Membros do Grupo de Destinatários', modalContentHtml, modalButtons, 'max-w-lg', modalId); // Título do modal alterado

        document.getElementById('filtro-modal-destinatarios-grupo')?.addEventListener('input', (e) => carregarDestinatariosNoModal(e.target.value)); // ID alterado
        
        document.getElementById('btn-add-email-avulso-grupo-com')?.addEventListener('click', async () => { 
            const inputAvulso = document.getElementById('input-email-avulso-grupo-com'); // ID alterado
            const feedbackAvulsoEl = document.getElementById('feedback-email-avulso-grupo-com'); // ID alterado
            const email = inputAvulso.value.trim();

            if (email && isValidEmailLocal(email)) {
                let emailExistsInSelectedDestinatarios = false; // Variável alterada
                if (modalSelectedDestinatarioIdsCopy.length > 0) { // Variável alterada
                    const checks = modalSelectedDestinatarioIdsCopy.map(async id => { // Variável alterada
                        try {
                            const destinatario = await dbRef.getItemById(DESTINATARIOS_STORE_NAME, id); // Store alterada
                            return destinatario && destinatario.email && destinatario.email.toLowerCase() === email.toLowerCase(); // Lógica adaptada
                        } catch (e) {
                            console.warn("Erro ao buscar destinatário para verificação de duplicidade:", e);
                            return false;
                        }
                    });
                    const results = await Promise.all(checks); 
                    emailExistsInSelectedDestinatarios = results.some(result => result); // Variável alterada
                }
                
                if (!modalEmailsAvulsosCopy.some(e => e.toLowerCase() === email.toLowerCase()) && !emailExistsInSelectedDestinatarios) { // Variável alterada
                    modalEmailsAvulsosCopy.push(email);
                    inputAvulso.value = '';
                    if(feedbackAvulsoEl) feedbackAvulsoEl.textContent = '';
                    renderizarMembrosSelecionadosNoModalCom(); // Alterado
                } else { 
                    if(feedbackAvulsoEl) feedbackAvulsoEl.textContent = 'E-mail já adicionado (seja como avulso ou de um destinatário já selecionado).'; 
                    feedbackAvulsoEl.className = 'text-xs text-yellow-600 dark:text-yellow-400'; 
                }
            } else { 
                if(feedbackAvulsoEl) feedbackAvulsoEl.textContent = 'E-mail inválido.'; 
                feedbackAvulsoEl.className = 'text-xs text-red-600 dark:text-red-400'; 
            }
        });

        await carregarDestinatariosNoModal(); // Alterado
        await renderizarMembrosSelecionadosNoModalCom(); // Alterado
    }


    function addFormEventListenersGrupoComunicacao(feedbackAreaId, originatingView, isEditing) { // Nome da função alterado
        const form = document.getElementById('form-grupo-comunicacao'); // ID alterado
        const feedbackAreaForm = document.getElementById(feedbackAreaId);

        document.getElementById('btn-gerenciar-membros-grupo-com')?.addEventListener('click', () => abrirModalSelecaoMembrosComunicacao(feedbackAreaForm)); // ID e função alterados
        
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (globalClearFeedbackRef && feedbackAreaForm) globalClearFeedbackRef(feedbackAreaForm);

            const nomeGrupoInput = document.getElementById('grupo-com-nome'); // ID alterado
            const nomeGrupo = nomeGrupoInput.value.trim();
            if (!nomeGrupo) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("O 'Nome do Grupo' é obrigatório.", "error", feedbackAreaForm);
                nomeGrupoInput.focus(); return;
            }
            
            try {
                const gruposExistentes = await dbRef.getAllItems(GRUPOS_COMUNICACAO_STORE_NAME); // Store alterada
                if (gruposExistentes.some(g => g.nomeGrupo.toLowerCase() === nomeGrupo.toLowerCase() && g.id !== currentGrupoId)) {
                    if (globalShowFeedbackRef) globalShowFeedbackRef(`Um grupo com o nome "${nomeGrupo}" já existe.`, "error", feedbackAreaForm);
                    nomeGrupoInput.focus(); return;
                }

                const finalGrupoId = currentGrupoId || appModuleRef.generateUUID();
                const grupoPayload = {
                    id: finalGrupoId,
                    nomeGrupo: nomeGrupo,
                    descricaoGrupo: document.getElementById('grupo-com-descricao').value.trim(), // ID alterado
                    idsDestinatariosMembros: [...new Set(tempSelectedDestinatarioIds)],  // Variável e propriedade alteradas
                    emailsAvulsosMembros: [...new Set(tempEmailsAvulsos)],  // Propriedade alterada
                    dataCriacao: document.getElementById('grupo-com-dataCriacao-hidden').value, // ID alterado
                    dataModificacao: new Date().toISOString(),
                    isDeleted: (isEditing && originalGrupoData) ? (originalGrupoData.isDeleted || false) : false
                };

                if (isEditing) {
                    await dbRef.updateItem(GRUPOS_COMUNICACAO_STORE_NAME, grupoPayload); // Store alterada
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Grupo de Destinatários atualizado com sucesso!", "success", feedbackAreaForm); // Mensagem alterada
                } else {
                    await dbRef.addItem(GRUPOS_COMUNICACAO_STORE_NAME, grupoPayload); // Store alterada
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Grupo de Destinatários salvo com sucesso!", "success", feedbackAreaForm); // Mensagem alterada
                }

                if (refreshApplicationStateRef) await refreshApplicationStateRef();
                if (appModuleRef && appModuleRef.handleMenuAction) {
                     appModuleRef.handleMenuAction('gerir-grupos-destinatarios'); // Ação alterada
                } else if (navigateAfterSaveOrCancelCallback) {
                    navigateAfterSaveOrCancelCallback('gerir-grupos-destinatarios'); // Ação alterada
                }

            } catch (error) {
                console.error("ComunicacaoGruposForm.JS: Erro ao salvar grupo de destinatários:", error); // Contexto da mensagem alterado
                if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao salvar grupo: ${error.message}`, "error", feedbackAreaForm);
            }
        });

        document.getElementById('btn-cancelar-grupo-com').addEventListener('click', () => { // ID alterado
             if (appModuleRef && appModuleRef.navigateBack) {
                appModuleRef.navigateBack();
            } else {
                if (navigateAfterSaveOrCancelCallback) navigateAfterSaveOrCancelCallback(originatingView || 'gerir-grupos-destinatarios'); // Ação alterada
            }
        });
    }

    return {
        init,
        renderFormularioGrupoDestinatarios // Nome da função exportada alterado
    };
})();