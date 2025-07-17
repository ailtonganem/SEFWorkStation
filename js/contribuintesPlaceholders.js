// js/contribuintesPlaceholders.js - Lógica para Gerir Placeholders de Contribuinte
// v1.4.0 - Adiciona placeholder para Inscrição Estadual.
// v1.3.2 - Adiciona botão de ajuda contextual.
// v1.3.1 - Remove classe page-section para expandir a largura da visualização.
// v1.3 - Adiciona ícone de ajuda contextual.
// v1.2 - Impede criação de placeholders com nomes reservados pelo sistema.
// v1.1 - Adota UUIDs para IDs primários na criação de novos placeholders.
// v1.0 - Estrutura inicial do CRUD de placeholders

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.ContribuintesPlaceholders = (function() {
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let refreshApplicationStateRef; 
    let dbRef;
    let appModuleRef;
    let ajudaModuleRef; 

    const PLACEHOLDERS_STORE_NAME = 'contribuintesPlaceholdersStore'; 
    // ATUALIZADO: Adicionado 'INSCRICAO_ESTADUAL'
    const NOMES_PLACEHOLDERS_PADRAO_SISTEMA = ['NOME', 'CPF_CNPJ', 'INSCRICAO_ESTADUAL', 'EMAIL', 'TELEFONE', 'ENDERECO', 'NUMERO_IDENTIFICACAO'];

    // ATUALIZADO: Adicionado 'inscricaoEstadual'
    const CAMPOS_CONTRIBUINTE_MAPEAVEIS = [
        { value: 'nome', text: 'Nome Completo / Razão Social' },
        { value: 'cpfCnpj', text: 'CPF / CNPJ' },
        { value: 'inscricaoEstadual', text: 'Inscrição Estadual'},
        { value: 'email', text: 'Email' },
        { value: 'telefone', text: 'Telefone' },
        { value: 'endereco', text: 'Endereço' },
        { value: 'numeroIdentificacao', text: 'Número de Identificação (Interno)' },
        // Os campos personalizados serão adicionados dinamicamente
    ];

    function init(mainWrapper, showFeedbackFunc, clearFeedbackFunc, refreshFunc, dbModuleRef, applicationModuleRef) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedbackFunc;
        globalClearFeedbackRef = clearFeedbackFunc;
        refreshApplicationStateRef = refreshFunc;
        dbRef = dbModuleRef;
        appModuleRef = applicationModuleRef;
        ajudaModuleRef = SEFWorkStation.Ajuda; 

        if (!dbRef) console.error("ContribuintesPlaceholders.JS: init - Referência ao DB não fornecida!");
        if (!mainContentWrapperRef) console.error("ContribuintesPlaceholders.JS: init - mainContentWrapperRef não fornecido.");
        if (!appModuleRef) console.error("ContribuintesPlaceholders.JS: init - appModuleRef (applicationModuleRef) não fornecido.");
        if (!ajudaModuleRef) console.warn("ContribuintesPlaceholders.JS: init - ajudaModuleRef não disponível.");
        console.log("ContribuintesPlaceholders.JS: Módulo inicializado (v1.4.0).");
    }

    function isValidPlaceholderNameInternal(nomePlaceholder) {
        if (!nomePlaceholder || typeof nomePlaceholder !== 'string') return false;
        const trimmedName = nomePlaceholder.trim();
        const pattern = /^[A-Z0-9](?:[A-Z0-9_]*[A-Z0-9])?$/; 
        return pattern.test(trimmedName) && trimmedName.length > 0 && trimmedName.length <= 50;
    }

    async function getCamposMapeaveisComPersonalizados() {
        let camposMapeaveis = [...CAMPOS_CONTRIBUINTE_MAPEAVEIS];
        try {
            // Busca por chaves únicas de campos personalizados em todos os contribuintes
            const todosContribuintes = await dbRef.getAllItems(window.SEFWorkStation.DB.STORES.CONTRIBUINTES);
            const chavesCustomizadasUnicas = new Set();
            todosContribuintes.forEach(contrib => {
                if (contrib.customFields && Array.isArray(contrib.customFields)) {
                    contrib.customFields.forEach(cf => {
                        if (cf.key && cf.key.trim() !== '') {
                            chavesCustomizadasUnicas.add(cf.key.trim());
                        }
                    });
                }
            });
            chavesCustomizadasUnicas.forEach(chave => {
                camposMapeaveis.push({ value: `customFields.${chave}`, text: `Campo Personalizado: ${chave}` });
            });
        } catch (e) {
            console.warn("ContribuintesPlaceholders.JS: Erro ao buscar campos personalizados para mapeamento:", e);
        }
        return camposMapeaveis.sort((a,b) => a.text.localeCompare(b.text));
    }


    async function carregarERenderizarPlaceholders(listaPlaceholdersEl, feedbackAreaEl) {
        if (!dbRef || !listaPlaceholdersEl) return;
        try {
            const placeholders = await dbRef.getAllItems(PLACEHOLDERS_STORE_NAME);
            placeholders.sort((a, b) => (a.nomeExibicao || "").localeCompare(b.nomeExibicao || ""));

            listaPlaceholdersEl.innerHTML = '';
            
            const infoPadraoHtml = `
                <li class="p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-md mb-3 text-xs text-blue-700 dark:text-blue-300">
                    <strong class="block mb-1">Placeholders Padrão do Sistema (Automáticos):</strong>
                    <ul class="list-disc list-inside pl-2">
                        ${NOMES_PLACEHOLDERS_PADRAO_SISTEMA.map(ph => `<li><code>{{${ph}}}</code></li>`).join('')}
                    </ul>
                    <p class="mt-1">Estes placeholders são preenchidos automaticamente com os campos correspondentes do contribuinte e não precisam ser cadastrados aqui.</p>
                </li>
            `;
            listaPlaceholdersEl.insertAdjacentHTML('beforeend', infoPadraoHtml);


            if (placeholders.length === 0) {
                listaPlaceholdersEl.insertAdjacentHTML('beforeend', '<li class="text-center text-gray-500 dark:text-gray-400 py-4">Nenhum placeholder personalizado cadastrado.</li>');
                return;
            }

            const todosCamposMapeaveis = await getCamposMapeaveisComPersonalizados();

            placeholders.forEach(ph => {
                const li = document.createElement('li');
                li.className = 'flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-700 rounded-md shadow-sm mb-2';
                li.dataset.placeholderId = ph.id;

                const campoMapeadoInfo = todosCamposMapeaveis.find(campo => campo.value === ph.campoContribuinte);
                const nomeCampoMapeadoDisplay = campoMapeadoInfo ? campoMapeadoInfo.text : ph.campoContribuinte;


                li.innerHTML = `
                    <div class="flex-grow">
                        <span class="block font-semibold text-sm text-gray-800 dark:text-gray-100">${ph.nomeExibicao || 'Placeholder Sem Nome de Exibição'}</span>
                        <span class="block text-xs text-blue-600 dark:text-blue-400">{{${ph.nomePlaceholderNormalizado}}}</span>
                        <span class="block text-xs text-gray-500 dark:text-gray-400">Mapeado para: ${nomeCampoMapeadoDisplay}</span>
                        ${ph.descricao ? `<p class="text-xs text-gray-600 dark:text-gray-300 mt-1 italic">${ph.descricao.replace(/"/g, '"')}</p>` : ''}
                    </div>
                    <div class="placeholder-acoes flex-shrink-0 ml-4">
                        <button class="btn-edit text-xs py-1 px-2 rounded mr-2" data-action="editar" title="Editar Placeholder">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-pencil-square inline-block" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg>
                        </button>
                        <button class="btn-delete text-xs py-1 px-2 rounded" data-action="excluir" title="Excluir Placeholder">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-trash3-fill inline-block" viewBox="0 0 16 16"><path d="M11 1.5v1h3.5a.5.5 0 0 1 0 1h-.538l-.853 10.66A2 2 0 0 1 11.115 16h-6.23a2 2 0 0 1-1.994-1.84L2.038 3.5H1.5a.5.5 0 0 1 0-1H5v-1A1.5 1.5 0 0 1 6.5 0h3A1.5 1.5 0 0 1 11 1.5Zm-5 0v1h4v-1a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5ZM4.5 5.029l.5 8.5a.5.5 0 1 0 .998-.06l-.5-8.5a.5.5 0 1 0-.998.06Zm6.53-.528a.5.5 0 0 0-.528.47l-.5 8.5a.5.5 0 0 0 .998.058l.5-8.5a.5.5 0 0 0-.47-.528ZM8 4.5a.5.5 0 0 0-.5.5v8.5a.5.5 0 0 0 1 0V5a.5.5 0 0 0-.5-.5Z"/></svg>
                        </button>
                    </div>
                `;
                listaPlaceholdersEl.appendChild(li);

                li.querySelector('button[data-action="editar"]').addEventListener('click', async () => { 
                    await renderFormularioPlaceholder(ph, feedbackAreaEl, listaPlaceholdersEl);
                });
                li.querySelector('button[data-action="excluir"]').addEventListener('click', async () => {
                    if (confirm(`Tem certeza que deseja excluir o placeholder "{{${ph.nomePlaceholderNormalizado}}}" (${ph.nomeExibicao})? Esta ação não pode ser desfeita.`)) {
                        try {
                            await dbRef.deleteItem(PLACEHOLDERS_STORE_NAME, ph.id);
                            if (globalShowFeedbackRef) globalShowFeedbackRef(`Placeholder "{{${ph.nomePlaceholderNormalizado}}}" excluído.`, 'success', feedbackAreaEl);
                            await carregarERenderizarPlaceholders(listaPlaceholdersEl, feedbackAreaEl);
                        } catch (error) {
                            console.error("ContribuintesPlaceholders.JS: Erro ao excluir placeholder:", error);
                            if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao excluir placeholder: ${error.message}`, 'error', feedbackAreaEl);
                        }
                    }
                });
            });

        } catch (error) {
            console.error("ContribuintesPlaceholders.JS: Erro ao carregar placeholders:", error);
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro ao carregar a lista de placeholders.", 'error', feedbackAreaEl);
            listaPlaceholdersEl.innerHTML = '<li class="text-center text-red-500 dark:text-gray-200 py-4">Falha ao carregar placeholders.</li>';
        }
    }

    async function renderFormularioPlaceholder(placeholderToEdit = null, feedbackAreaEl, listaPlaceholdersEl) {
        const isEditing = placeholderToEdit !== null;
        const formContainerId = 'form-placeholder-container';
        let formContainer = document.getElementById(formContainerId);
        if (!formContainer) {
            formContainer = document.createElement('div');
            formContainer.id = formContainerId;
            formContainer.className = "mb-6 p-4 border dark:border-slate-600 rounded-lg shadow bg-white dark:bg-slate-800";
            const tituloLista = document.getElementById('gerenciar-placeholders-container').querySelector('h3.text-md.font-semibold.mb-3');
            if (tituloLista) {
                tituloLista.parentNode.insertBefore(formContainer, tituloLista);
            } else {
                document.getElementById('gerenciar-placeholders-container').prepend(formContainer);
            }
        }

        if (globalClearFeedbackRef && feedbackAreaEl) globalClearFeedbackRef(feedbackAreaEl);

        const todosCamposMapeaveis = await getCamposMapeaveisComPersonalizados();
        const camposMapeaveisOptionsHtml = todosCamposMapeaveis.map(campo =>
            `<option value="${campo.value}" ${isEditing && placeholderToEdit.campoContribuinte === campo.value ? 'selected' : ''}>${campo.text}</option>`
        ).join('');

        formContainer.innerHTML = `
            <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100">${isEditing ? 'Editar Placeholder' : 'Adicionar Novo Placeholder'}</h3>
            <div id="feedback-form-placeholder" class="mb-3"></div>
            <form id="form-add-edit-placeholder">
                <div class="mb-3">
                    <label for="ph-nome-exibicao" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome de Exibição:</label>
                    <input type="text" id="ph-nome-exibicao" value="${isEditing ? (placeholderToEdit.nomeExibicao || '') : ''}" class="form-input-text mt-1 block w-full text-sm" placeholder="Ex: Nome Completo do Cliente" required>
                </div>
                <div class="mb-3">
                    <label for="ph-nome-interno" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome Interno do Placeholder (sem {{}}):</label>
                    <input type="text" id="ph-nome-interno" value="${isEditing ? (placeholderToEdit.nomePlaceholderNormalizado || '') : ''}" class="form-input-text mt-1 block w-full text-sm" placeholder="Ex: NOME_CLIENTE (A-Z, 0-9, _)" required ${isEditing ? 'disabled' : ''}>
                    ${isEditing ? '<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">O nome interno não pode ser alterado após a criação.</p>' : '<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Será usado como {{NOME_INTERNO}} nos modelos.</p>'}
                </div>
                <div class="mb-3">
                    <label for="ph-campo-contribuinte" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Mapear para Campo do Contribuinte:</label>
                    <select id="ph-campo-contribuinte" class="form-input-text mt-1 block w-full text-sm" required>
                        <option value="">-- Selecione um campo --</option>
                        ${camposMapeaveisOptionsHtml}
                    </select>
                </div>
                <div class="mb-4">
                    <label for="ph-descricao" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição (Opcional):</label>
                    <textarea id="ph-descricao" rows="2" class="form-input-text mt-1 block w-full text-sm" placeholder="Para que serve este placeholder?">${isEditing ? (placeholderToEdit.descricao || '') : ''}</textarea>
                </div>
                <div class="flex items-center gap-2">
                    <button type="submit" class="btn-primary py-2 px-4 text-sm">${isEditing ? 'Salvar Alterações' : 'Adicionar Placeholder'}</button>
                    <button type="button" id="btn-cancelar-form-placeholder" class="btn-secondary py-2 px-4 text-sm">Cancelar</button>
                </div>
            </form>
        `;

        const feedbackFormArea = formContainer.querySelector('#feedback-form-placeholder');

        formContainer.querySelector('#form-add-edit-placeholder').addEventListener('submit', async (event) => {
            event.preventDefault();
            const nomeExibicao = document.getElementById('ph-nome-exibicao').value.trim();
            const nomeInterno = document.getElementById('ph-nome-interno').value.trim().toUpperCase();
            const campoContribuinte = document.getElementById('ph-campo-contribuinte').value;
            const descricao = document.getElementById('ph-descricao').value.trim();

            if (!nomeExibicao || !nomeInterno || !campoContribuinte) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("Nome de exibição, nome interno e campo mapeado são obrigatórios.", 'error', feedbackFormArea);
                return;
            }
            if (!isValidPlaceholderNameInternal(nomeInterno)) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("Nome interno do placeholder inválido. Use apenas letras maiúsculas, números e underscores (sem começar/terminar com underscore, nem ter underscores duplos). Ex: MEU_CAMPO_EXEMPLO.", 'error', feedbackFormArea);
                return;
            }

            if (NOMES_PLACEHOLDERS_PADRAO_SISTEMA.includes(nomeInterno)) {
                if (globalShowFeedbackRef) globalShowFeedbackRef(`O nome interno "${nomeInterno}" é reservado para um placeholder padrão do sistema e não pode ser usado para placeholders personalizados.`, 'error', feedbackFormArea);
                return;
            }

            try {
                const placeholdersExistentes = await dbRef.getAllItems(PLACEHOLDERS_STORE_NAME);
                if (placeholdersExistentes.some(ph =>
                    ph.nomePlaceholderNormalizado.toLowerCase() === nomeInterno.toLowerCase() &&
                    (!isEditing || ph.id !== placeholderToEdit.id)
                )) {
                    if (globalShowFeedbackRef) globalShowFeedbackRef(`O nome interno de placeholder "{{${nomeInterno}}}" já existe.`, 'error', feedbackFormArea);
                    return;
                }

                const placeholderData = {
                    nomeExibicao,
                    nomePlaceholderNormalizado: nomeInterno,
                    campoContribuinte,
                    descricao
                };

                if (isEditing) {
                    placeholderData.id = placeholderToEdit.id; 
                    await dbRef.updateItem(PLACEHOLDERS_STORE_NAME, placeholderData);
                    if (globalShowFeedbackRef) globalShowFeedbackRef(`Placeholder "{{${nomeInterno}}}" atualizado.`, 'success', feedbackFormArea);
                } else {
                    placeholderData.id = appModuleRef.generateUUID(); 
                    await dbRef.addItem(PLACEHOLDERS_STORE_NAME, placeholderData);
                    if (globalShowFeedbackRef) globalShowFeedbackRef(`Placeholder "{{${nomeInterno}}}" adicionado.`, 'success', feedbackFormArea);
                }
                formContainer.innerHTML = '';
                formContainer.remove();
                await carregarERenderizarPlaceholders(listaPlaceholdersEl, feedbackAreaEl);
            } catch (error) {
                console.error("ContribuintesPlaceholders.JS: Erro ao salvar placeholder:", error);
                if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao salvar placeholder: ${error.message}`, 'error', feedbackFormArea);
            }
        });

        formContainer.querySelector('#btn-cancelar-form-placeholder').addEventListener('click', () => {
            formContainer.innerHTML = '';
            formContainer.remove();
            if(globalClearFeedbackRef && feedbackFormArea) globalClearFeedbackRef(feedbackFormArea);
        });

        document.getElementById('ph-nome-exibicao').focus();
    }


    async function renderGerenciarPlaceholdersPage() {
        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (!mainContentWrapperRef) {
            console.error("ContribuintesPlaceholders.JS: renderGerenciarPlaceholdersPage - mainContentWrapperRef não definido.");
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico ao tentar renderizar a página de placeholders.", "error");
            return;
        }

        if (appModuleRef && typeof appModuleRef.setCurrentViewTarget === 'function') {
            appModuleRef.setCurrentViewTarget('gerir-contribuintes-placeholders');
        }

        const pageHtml = `
            <div id="gerenciar-placeholders-container" class="page-section max-w-none px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-xl font-semibold">Gerenciar Placeholders de Contribuinte</h2>
                    <button type="button" id="ajuda-placeholders-contrib" class="p-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-300" title="Ajuda sobre Placeholders de Contribuinte">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-question-circle-fill" viewBox="0 0 16 16">
                            <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.496 6.033h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286a.237.237 0 0 0 .241.247zm2.325 6.443c.61 0 1.029-.394 1.029-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94 0 .533.425.927 1.01.927z"/>
                        </svg>
                    </button>
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    Placeholders permitem que você crie modelos de documentos que são preenchidos automaticamente com dados dos contribuintes.
                    Defina um "Nome de Exibição" para fácil identificação, um "Nome Interno" (ex: <code>NOME_CLIENTE</code>, que será usado como <code>{{NOME_CLIENTE}}</code> nos modelos),
                    e mapeie-o para um campo específico do cadastro do contribuinte. O nome interno deve conter apenas letras maiúsculas, números e underscores (não pode começar ou terminar com underscore, nem ter underscores duplicados).
                </p>
                <div id="feedback-placeholders-page" class="mb-4"></div>

                <button id="btn-mostrar-form-novo-placeholder" class="btn-primary mb-6 py-2 px-4 text-sm">Adicionar Novo Placeholder Personalizado</button>

                <h3 class="text-md font-semibold mb-3 text-gray-700 dark:text-gray-200">Placeholders de Contribuinte Cadastrados</h3>
                <ul id="lista-placeholders-contribuinte" class="space-y-2">
                    <li class="text-center text-gray-500 dark:text-gray-400 py-4">Carregando placeholders...</li>
                </ul>
            </div>
        `;
        mainContentWrapperRef.innerHTML = pageHtml;

        const listaPlaceholdersEl = document.getElementById('lista-placeholders-contribuinte');
        const feedbackAreaLocal = document.getElementById('feedback-placeholders-page');
        const btnMostrarForm = document.getElementById('btn-mostrar-form-novo-placeholder');
        const btnAjudaPlaceholders = document.getElementById('ajuda-placeholders-contrib');

        if (btnMostrarForm) {
            btnMostrarForm.addEventListener('click', async () => {
                if (!document.getElementById('form-placeholder-container')) {
                    await renderFormularioPlaceholder(null, feedbackAreaLocal, listaPlaceholdersEl);
                }
                btnMostrarForm.classList.add('hidden');
            });
        }
        
        if (btnAjudaPlaceholders && ajudaModuleRef && ajudaModuleRef.mostrarTopicoDeAjuda) {
            btnAjudaPlaceholders.addEventListener('click', (e) => {
                e.preventDefault();
                // O ID "tutorial-placeholders-contrib" será criado no arquivo de manual dos contribuintes
                ajudaModuleRef.mostrarTopicoDeAjuda('manual-modulo-contribuintes', 'contrib-placeholders');
            });
        }

        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.removedNodes) {
                    for (let node of mutation.removedNodes) {
                        if (node.id === 'form-placeholder-container') {
                            if(btnMostrarForm) btnMostrarForm.classList.remove('hidden');
                            break;
                        }
                    }
                }
            });
        });
        observer.observe(document.getElementById('gerenciar-placeholders-container'), { childList: true });

        await carregarERenderizarPlaceholders(listaPlaceholdersEl, feedbackAreaLocal);
    }

    return {
        init,
        renderGerenciarPlaceholdersPage
    };
})();