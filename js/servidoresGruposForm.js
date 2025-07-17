// js/servidoresGruposForm.js
// v1.2.0 - CORREÇÃO: Utiliza EntityConfig.filterActiveItems para filtrar servidores arquivados do modal de seleção de membros.
// v1.1.1 - Remove classe page-section para expandir a largura da visualização.
// v1.1 - CORREÇÃO: Ajusta verificação de duplicidade de e-mails avulsos.
// (Histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ServidoresGrupos = window.SEFWorkStation.ServidoresGrupos || {}; 

window.SEFWorkStation.ServidoresGrupos.Form = (function() { 
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let navigateAfterSaveOrCancelCallback; 
    let refreshApplicationStateRef;
    let dbRef;
    let appModuleRef;
    let uiModuleRef;

    const GRUPOS_SERVIDORES_STORE_NAME = 'servidoresGruposStore'; // CORRIGIDO
    const SERVIDORES_STORE_NAME = 'servidoresStore';

    let currentGrupoId = null;
    let originalGrupoData = null;
    
    let tempSelectedServidorIds = [];
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

        if (!dbRef) console.error("ServidoresGruposForm.JS: init - Referência ao DB não fornecida!");
        if (!appModuleRef) console.error("ServidoresGruposForm.JS: init - appModuleRef não fornecido.");
        if (!uiModuleRef) console.warn("ServidoresGruposForm.JS: init - uiModuleRef não fornecido, modais podem não funcionar.");
        console.log("ServidoresGruposForm.JS: Módulo inicializado (v1.2.0).");
    }

    function isValidEmailLocal(email) { 
        if (!email || email.trim() === '') return false;
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    }

    async function renderFormularioGrupoServidores(grupoData = null, originatingView = 'gerir-grupos-servidores') {
        if (globalClearFeedbackRef) globalClearFeedbackRef();

        const isEditing = grupoData && grupoData.id;
        currentGrupoId = isEditing ? grupoData.id : null;
        originalGrupoData = isEditing ? JSON.parse(JSON.stringify(grupoData)) : null;

        tempSelectedServidorIds = (isEditing && Array.isArray(grupoData.idsServidoresMembros)) ? [...grupoData.idsServidoresMembros] : [];
        tempEmailsAvulsos = (isEditing && Array.isArray(grupoData.outrosDestinatarios)) ? [...grupoData.outrosDestinatarios] : [];

        const formTitle = isEditing ? "Editar Grupo de Servidores" : "Novo Grupo de Servidores";
        const feedbackAreaId = `feedback-form-grupo-servidores-${currentGrupoId || 'novo'}`;

        mainContentWrapperRef.innerHTML = '';
        
        const formHtml = `
            <div class="form-section"> 
                <h2 class="text-xl font-semibold mb-6">${formTitle}</h2>
                <div id="${feedbackAreaId}" class="mb-4"></div>

                <form id="form-grupo-servidores">
                    <input type="hidden" id="grupo-serv-id-hidden" value="${currentGrupoId || ''}">
                    <input type="hidden" id="grupo-serv-dataCriacao-hidden" value="${(isEditing && grupoData?.dataCriacao) ? grupoData.dataCriacao : new Date().toISOString()}">

                    <div class="mb-4">
                        <label for="grupo-serv-nome" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome do Grupo: <span class="text-red-500">*</span></label>
                        <input type="text" id="grupo-serv-nome" name="nomeGrupo" class="form-input-text mt-1 block w-full" required value="${grupoData?.nomeGrupo?.replace(/"/g, '"') || ''}">
                    </div>
                    
                    <div class="mb-4">
                        <label for="grupo-serv-descricao" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição (Opcional):</label>
                        <textarea id="grupo-serv-descricao" name="descricaoGrupo" rows="3" class="form-input-text mt-1 block w-full">${grupoData?.descricaoGrupo || ''}</textarea>
                    </div>

                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Membros do Grupo:</label>
                        <div id="lista-membros-grupo-servidores-form" class="mt-1 mb-2 p-2 border dark:border-slate-500 rounded-md bg-gray-100 dark:bg-slate-700 min-h-[60px] max-h-40 overflow-y-auto">
                            </div>
                        <button type="button" id="btn-gerenciar-membros-grupo-serv" class="btn-secondary btn-sm text-xs">Adicionar/Remover Membros</button>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" id="btn-cancelar-grupo-serv" class="btn-secondary">Cancelar</button>
                        <button type="submit" id="btn-salvar-grupo-serv" class="btn-primary">${isEditing ? 'Atualizar Grupo' : 'Salvar Grupo'}</button>
                    </div>
                </form>
            </div>
        `;
        mainContentWrapperRef.innerHTML = formHtml;
        await renderSelectedMembrosGrupoNoForm();
        addFormEventListenersGrupoServidores(feedbackAreaId, originatingView, isEditing);
    }

    async function renderSelectedMembrosGrupoNoForm() {
        const container = document.getElementById('lista-membros-grupo-servidores-form');
        if (!container) return;
        container.innerHTML = '';
        
        let hasMembros = false;
        const ul = document.createElement('ul');
        ul.className = 'list-none p-0 space-y-1';

        for (const servidorId of tempSelectedServidorIds) {
            try {
                const servidor = await dbRef.getItemById(SERVIDORES_STORE_NAME, servidorId);
                const li = document.createElement('li');
                li.className = 'flex justify-between items-center text-xs p-1 bg-blue-100 dark:bg-blue-700 rounded';
                const displayName = servidor ? `${servidor.nome} (${servidor.matricula || 'S/Matr.'})` : `ID ${servidorId.substring(0,8)} (Não encontrado)`;
                li.innerHTML = `<span class="truncate text-blue-800 dark:text-blue-200" title="${displayName.replace(/"/g, '"')}">${displayName}</span>
                                <button type="button" data-id="${servidorId}" data-type="servidor" class="btn-remove-membro-grupo-serv-form text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm leading-none p-0.5" title="Remover Servidor">×</button>`;
                ul.appendChild(li);
                hasMembros = true;
            } catch (error) { console.warn("Erro ao renderizar membro servidor no formulário:", error); }
        }

        for (const email of tempEmailsAvulsos) {
            const li = document.createElement('li');
            li.className = 'flex justify-between items-center text-xs p-1 bg-green-100 dark:bg-green-700 rounded';
            li.innerHTML = `<span class="truncate text-green-800 dark:text-green-200" title="${email.replace(/"/g, '"')}">${email} (Avulso)</span>
                            <button type="button" data-email="${email}" data-type="email" class="btn-remove-membro-grupo-serv-form text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm leading-none p-0.5" title="Remover E-mail Avulso">×</button>`;
            ul.appendChild(li);
            hasMembros = true;
        }

        if (!hasMembros) {
            container.innerHTML = `<p class="text-xs text-gray-500 dark:text-gray-400">Nenhum membro adicionado.</p>`;
        } else {
            container.appendChild(ul);
            container.querySelectorAll('.btn-remove-membro-grupo-serv-form').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const type = e.currentTarget.dataset.type;
                    if (type === 'servidor') {
                        const idToRemove = e.currentTarget.dataset.id;
                        tempSelectedServidorIds = tempSelectedServidorIds.filter(id => id !== idToRemove);
                    } else if (type === 'email') {
                        const emailToRemove = e.currentTarget.dataset.email;
                        tempEmailsAvulsos = tempEmailsAvulsos.filter(email => email !== emailToRemove);
                    }
                    renderSelectedMembrosGrupoNoForm();
                });
            });
        }
    }
    
    async function abrirModalSelecaoMembrosServidores(feedbackAreaEl) {
        if (!uiModuleRef || !uiModuleRef.showModal) {
            if(globalShowFeedbackRef) globalShowFeedbackRef("Erro: Funcionalidade de modal não está disponível.", "error", feedbackAreaEl);
            return;
        }
        const modalId = `modal-selecionar-membros-servidores-${Date.now()}`;
        let modalSelectedServidorIdsCopy = [...tempSelectedServidorIds];
        let modalEmailsAvulsosCopy = [...tempEmailsAvulsos];

        const modalContentHtml = `
            <div class="space-y-3">
                <div>
                    <label for="filtro-modal-servidores-grupo" class="block text-xs font-medium text-gray-700 dark:text-gray-300">Buscar Servidores Cadastrados (Ativos):</label>
                    <input type="search" id="filtro-modal-servidores-grupo" class="form-input-text w-full text-sm mt-1" placeholder="Nome, matrícula ou e-mail...">
                    <div id="lista-servidores-modal-grupo" class="mt-2 max-h-32 overflow-y-auto border dark:border-slate-600 p-2 rounded-md bg-gray-50 dark:bg-slate-700/50">
                        <p class="text-xs text-gray-500 dark:text-gray-400">Carregando...</p>
                    </div>
                </div>
                <hr class="dark:border-slate-600"/>
                <div>
                    <label for="input-email-avulso-grupo-serv" class="block text-xs font-medium text-gray-700 dark:text-gray-300">Adicionar E-mail Avulso (não servidor):</label>
                    <div class="flex items-center gap-2 mt-1">
                        <input type="email" id="input-email-avulso-grupo-serv" class="form-input-text flex-grow text-sm" placeholder="exemplo@dominio.com">
                        <button type="button" id="btn-add-email-avulso-grupo-serv" class="btn-secondary btn-xs whitespace-nowrap">Adicionar E-mail</button>
                    </div>
                     <p id="feedback-email-avulso-grupo-serv" class="text-xs mt-1"></p>
                </div>
                <hr class="dark:border-slate-600"/>
                <div>
                    <h4 class="text-xs font-medium text-gray-700 dark:text-gray-300">Membros Selecionados para o Grupo:</h4>
                    <div id="membros-selecionados-modal-grupo-serv" class="mt-1 p-2 border dark:border-slate-500 rounded-md bg-gray-100 dark:bg-slate-700 min-h-[40px] max-h-24 overflow-y-auto">
                        </div>
                </div>
            </div>
        `;
        
        const renderizarMembrosSelecionadosNoModalServ = async () => {
            const container = document.getElementById('membros-selecionados-modal-grupo-serv');
            if(!container) return;
            container.innerHTML = '';
            let hasAnyMember = false;
            const ul = document.createElement('ul'); ul.className = 'space-y-0.5';

            for(const id of modalSelectedServidorIdsCopy) {
                try {
                    const servidor = await dbRef.getItemById(SERVIDORES_STORE_NAME, id);
                    if (servidor) {
                        const li = document.createElement('li'); li.className = 'text-xs text-blue-700 dark:text-blue-300';
                        li.textContent = `${servidor.nome} (${servidor.matricula || 'S/Matr.'})`; ul.appendChild(li); hasAnyMember = true;
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

        const carregarServidoresNoModal = async (termoBusca = '') => {
            const listaModalEl = document.getElementById('lista-servidores-modal-grupo');
            if (!listaModalEl) return;
            listaModalEl.innerHTML = '<p class="text-xs text-gray-500 dark:text-gray-400">Carregando...</p>';
            try {
                const todosServidoresDB = await dbRef.getAllItems(SERVIDORES_STORE_NAME);
                let servidores = window.SEFWorkStation.EntityConfig.filterActiveItems(todosServidoresDB, SERVIDORES_STORE_NAME);
                
                servidores = servidores.filter(s => s.status === 'Ativo' && s.email);

                if (termoBusca) {
                    const t = termoBusca.toLowerCase();
                    servidores = servidores.filter(s => (s.nome && s.nome.toLowerCase().includes(t)) || (s.matricula && s.matricula.toLowerCase().includes(t)) || (s.email && s.email.toLowerCase().includes(t)));
                }
                servidores.sort((a,b) => (a.nome || "").localeCompare(b.nome || ""));
                
                if (servidores.length === 0) {
                    listaModalEl.innerHTML = `<p class="text-xs text-gray-500 dark:text-gray-400">${termoBusca ? 'Nenhum servidor encontrado.' : 'Nenhum servidor ativo com e-mail cadastrado.'}</p>`;
                    return;
                }
                let itemsHtml = '<ul class="space-y-1">';
                servidores.forEach(serv => {
                    const isChecked = modalSelectedServidorIdsCopy.includes(serv.id);
                    itemsHtml += `<li><label class="flex items-center text-xs cursor-pointer"><input type="checkbox" value="${serv.id}" class="form-checkbox rounded h-3.5 w-3.5 mr-1.5 modal-servidor-grupo-checkbox" ${isChecked ? 'checked' : ''}> ${serv.nome} (${serv.matricula || 'S/Matr.'}) - ${serv.email}</label></li>`;
                });
                itemsHtml += '</ul>';
                listaModalEl.innerHTML = itemsHtml;
                listaModalEl.querySelectorAll('.modal-servidor-grupo-checkbox').forEach(cb => {
                    cb.addEventListener('change', (e) => {
                        const servidorId = e.target.value;
                        if (e.target.checked) { if (!modalSelectedServidorIdsCopy.includes(servidorId)) modalSelectedServidorIdsCopy.push(servidorId); }
                        else { modalSelectedServidorIdsCopy = modalSelectedServidorIdsCopy.filter(id => id !== servidorId); }
                        renderizarMembrosSelecionadosNoModalServ();
                    });
                });
            } catch(e) { if(listaModalEl) listaModalEl.innerHTML = '<p class="text-xs text-red-500 dark:text-red-400">Erro ao carregar servidores.</p>'; }
        };

        const modalButtons = [
            { text: 'Cancelar', class: 'btn-secondary text-sm', callback: () => uiModuleRef.closeModal() },
            { text: 'Confirmar Membros', class: 'btn-primary text-sm', callback: async () => {
                tempSelectedServidorIds = [...modalSelectedServidorIdsCopy];
                tempEmailsAvulsos = [...modalEmailsAvulsosCopy];
                await renderSelectedMembrosGrupoNoForm();
                uiModuleRef.closeModal();
            }}
        ];
        uiModuleRef.showModal('Adicionar/Remover Membros do Grupo de Servidores', modalContentHtml, modalButtons, 'max-w-lg', modalId);

        document.getElementById('filtro-modal-servidores-grupo')?.addEventListener('input', (e) => carregarServidoresNoModal(e.target.value));
        
        document.getElementById('btn-add-email-avulso-grupo-serv')?.addEventListener('click', async () => {
            const inputAvulso = document.getElementById('input-email-avulso-grupo-serv');
            const feedbackAvulsoEl = document.getElementById('feedback-email-avulso-grupo-serv');
            const email = inputAvulso.value.trim();

            if (email && isValidEmailLocal(email)) {
                let emailExistsInSelectedServers = false;
                if (modalSelectedServidorIdsCopy.length > 0) {
                    const checks = modalSelectedServidorIdsCopy.map(async id => {
                        try {
                            const servidor = await dbRef.getItemById(SERVIDORES_STORE_NAME, id);
                            return servidor && servidor.email && servidor.email.toLowerCase() === email.toLowerCase();
                        } catch (e) {
                            console.warn("Erro ao buscar servidor para verificação de duplicidade:", e);
                            return false;
                        }
                    });
                    const results = await Promise.all(checks);
                    emailExistsInSelectedServers = results.some(result => result);
                }
                
                if (!modalEmailsAvulsosCopy.some(e => e.toLowerCase() === email.toLowerCase()) && !emailExistsInSelectedServers) {
                    modalEmailsAvulsosCopy.push(email);
                    inputAvulso.value = '';
                    if(feedbackAvulsoEl) feedbackAvulsoEl.textContent = '';
                    renderizarMembrosSelecionadosNoModalServ();
                } else { 
                    if(feedbackAvulsoEl) feedbackAvulsoEl.textContent = 'E-mail já adicionado (seja como avulso ou de um servidor já selecionado).'; 
                    feedbackAvulsoEl.className = 'text-xs text-yellow-600 dark:text-yellow-400'; 
                }
            } else { 
                if(feedbackAvulsoEl) feedbackAvulsoEl.textContent = 'E-mail inválido.'; 
                feedbackAvulsoEl.className = 'text-xs text-red-600 dark:text-red-400'; 
            }
        });

        await carregarServidoresNoModal();
        await renderizarMembrosSelecionadosNoModalServ();
    }


    function addFormEventListenersGrupoServidores(feedbackAreaId, originatingView, isEditing) {
        const form = document.getElementById('form-grupo-servidores');
        const feedbackAreaForm = document.getElementById(feedbackAreaId);

        document.getElementById('btn-gerenciar-membros-grupo-serv')?.addEventListener('click', () => abrirModalSelecaoMembrosServidores(feedbackAreaForm));
        
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (globalClearFeedbackRef && feedbackAreaForm) globalClearFeedbackRef(feedbackAreaForm);

            const nomeGrupoInput = document.getElementById('grupo-serv-nome');
            const nomeGrupo = nomeGrupoInput.value.trim();
            if (!nomeGrupo) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("O 'Nome do Grupo' é obrigatório.", "error", feedbackAreaForm);
                nomeGrupoInput.focus(); return;
            }
            
            try {
                // CORREÇÃO: Usar a constante correta para a store de grupos de servidores.
                const gruposExistentes = await dbRef.getAllItems(GRUPOS_SERVIDORES_STORE_NAME);
                if (gruposExistentes.some(g => g.nomeGrupo.toLowerCase() === nomeGrupo.toLowerCase() && g.id !== currentGrupoId)) {
                    if (globalShowFeedbackRef) globalShowFeedbackRef(`Um grupo com o nome "${nomeGrupo}" já existe.`, "error", feedbackAreaForm);
                    nomeGrupoInput.focus(); return;
                }

                const finalGrupoId = currentGrupoId || appModuleRef.generateUUID();
                const grupoPayload = {
                    id: finalGrupoId,
                    nomeGrupo: nomeGrupo,
                    descricaoGrupo: document.getElementById('grupo-serv-descricao').value.trim(),
                    idsServidoresMembros: [...new Set(tempSelectedServidorIds)], 
                    outrosDestinatarios: [...new Set(tempEmailsAvulsos)], 
                    dataCriacao: document.getElementById('grupo-serv-dataCriacao-hidden').value,
                    dataModificacao: new Date().toISOString(),
                    isDeleted: (isEditing && originalGrupoData) ? (originalGrupoData.isDeleted || false) : false
                };

                if (isEditing) {
                    // CORREÇÃO: Usar a constante correta.
                    await dbRef.updateItem(GRUPOS_SERVIDORES_STORE_NAME, grupoPayload);
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Grupo de Servidores atualizado com sucesso!", "success", feedbackAreaForm);
                } else {
                    // CORREÇÃO: Usar a constante correta.
                    await dbRef.addItem(GRUPOS_SERVIDORES_STORE_NAME, grupoPayload);
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Grupo de Servidores salvo com sucesso!", "success", feedbackAreaForm);
                }

                if (refreshApplicationStateRef) await refreshApplicationStateRef();
                if (appModuleRef && appModuleRef.handleMenuAction) {
                     appModuleRef.handleMenuAction('gerir-grupos-servidores');
                } else if (navigateAfterSaveOrCancelCallback) {
                    navigateAfterSaveOrCancelCallback('gerir-grupos-servidores');
                }

            } catch (error) {
                console.error("ServidoresGruposForm.JS: Erro ao salvar grupo de servidores:", error);
                if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao salvar grupo: ${error.message}`, "error", feedbackAreaForm);
            }
        });

        document.getElementById('btn-cancelar-grupo-serv').addEventListener('click', () => {
             if (appModuleRef && appModuleRef.navigateBack) {
                appModuleRef.navigateBack();
            } else {
                if (navigateAfterSaveOrCancelCallback) navigateAfterSaveOrCancelCallback(originatingView || 'gerir-grupos-servidores');
            }
        });
    }

    return {
        init,
        renderFormularioGrupoServidores
    };
})();