// js/contribuintesTags.js - Lógica para Gerir Tags de Contribuinte (CRUD Completo)
// v1.1.1 - Remove classe page-section para expandir a largura da visualização.
// v1.1 - Adota UUIDs para IDs primários na criação de novas tags.
// v1.0 - Versão inicial baseada em documentosTags.js

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.ContribuintesTags = (function() {
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let refreshApplicationStateRef;
    let dbRef;
    let appModuleRef; // Adicionado para gerar UUIDs
    // Utiliza a constante da store de tags de contribuinte definida em db.js
    const CONTRIBUINTE_TAGS_STORE_NAME = window.SEFWorkStation.DB.STORES.CONTRIBUINTE_TAGS;
    const CONTRIBUINTES_STORE_NAME = 'contribuintes'; // Para atualizar contribuintes

    /**
     * Inicializa o módulo de Tags de Contribuinte.
     * @param {HTMLElement} mainWrapper - O contêiner principal.
     * @param {Function} showFeedbackFunc - Função para exibir feedback global.
     * @param {Function} clearFeedbackFunc - Função para limpar feedback global.
     * @param {Function} refreshFunc - Função para atualizar o estado da aplicação.
     * @param {object} dbModuleRef - Referência ao módulo SEFWorkStation.DB.
     * @param {object} applicationModuleRef - Referência ao módulo SEFWorkStation.App.
     */
    function init(mainWrapper, showFeedbackFunc, clearFeedbackFunc, refreshFunc, dbModuleRef, applicationModuleRef) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedbackFunc;
        globalClearFeedbackRef = clearFeedbackFunc;
        refreshApplicationStateRef = refreshFunc;
        dbRef = dbModuleRef;
        appModuleRef = applicationModuleRef; // Armazena a referência do App

        if (!dbRef) console.error("ContribuintesTags.JS: init - Referência ao DB não fornecida!");
        if (!mainContentWrapperRef) console.error("ContribuintesTags.JS: init - mainContentWrapperRef não fornecido.");
        if (!appModuleRef) console.error("ContribuintesTags.JS: init - appModuleRef (applicationModuleRef) não fornecido.");
        console.log("ContribuintesTags.JS: Módulo inicializado (v1.1.1).");
    }

    /**
     * Valida o nome da tag.
     * @param {string} tagName - O nome da tag a ser validado.
     * @returns {boolean} - True se válido, false caso contrário.
     */
    function isValidTagName(tagName) {
        if (!tagName || typeof tagName !== 'string') return false;
        const trimmedName = tagName.trim();
        // Tags não devem conter '/', ';', ',', '.', '#', ':' ou serem muito longas.
        // Permite letras, números, espaços (que serão trimados), hífens e underscores.
        const pattern = /^[a-zA-Z0-9À-ú\s\-_]+$/;
        if (!pattern.test(trimmedName) || trimmedName.length > 50 || trimmedName.length === 0) {
            return false;
        }
        return true;
    }

    /**
     * Carrega e renderiza a lista de tags de contribuintes.
     * @param {HTMLElement} listaTagsEl - O elemento UL onde as tags serão renderizadas.
     * @param {HTMLElement} feedbackAreaEl - O elemento para exibir feedback específico.
     */
    async function carregarERenderizarTags(listaTagsEl, feedbackAreaEl) {
        if (!dbRef || !listaTagsEl) return;
        try {
            const tags = await dbRef.getAllItems(CONTRIBUINTE_TAGS_STORE_NAME);
            tags.sort((a, b) => a.name.localeCompare(b.name)); // Ordena alfabeticamente

            listaTagsEl.innerHTML = '';
            if (tags.length === 0) {
                listaTagsEl.innerHTML = '<li class="text-center text-gray-500 dark:text-gray-400 py-4">Nenhuma tag de contribuinte cadastrada.</li>';
                return;
            }

            tags.forEach(tag => {
                const li = document.createElement('li');
                li.className = 'flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-700 rounded-md shadow-sm mb-2';
                li.dataset.tagId = tag.id;

                const spanNome = document.createElement('span');
                spanNome.className = 'tag-nome text-sm text-gray-700 dark:text-gray-200';
                spanNome.textContent = tag.name;
                li.appendChild(spanNome);

                const divAcoes = document.createElement('div');
                divAcoes.className = 'tag-acoes';

                const btnEditar = document.createElement('button');
                btnEditar.className = 'btn-edit text-xs py-1 px-2 rounded mr-2';
                btnEditar.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-pencil-square inline-block" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg> Editar';
                btnEditar.onclick = () => habilitarEdicaoTag(li, tag, feedbackAreaEl);
                divAcoes.appendChild(btnEditar);

                const btnExcluir = document.createElement('button');
                btnExcluir.className = 'btn-delete text-xs py-1 px-2 rounded';
                btnExcluir.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-trash3-fill inline-block" viewBox="0 0 16 16"><path d="M11 1.5v1h3.5a.5.5 0 0 1 0 1h-.538l-.853 10.66A2 2 0 0 1 11.115 16h-6.23a2 2 0 0 1-1.994-1.84L2.038 3.5H1.5a.5.5 0 0 1 0-1H5v-1A1.5 1.5 0 0 1 6.5 0h3A1.5 1.5 0 0 1 11 1.5Zm-5 0v1h4v-1a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5ZM4.5 5.029l.5 8.5a.5.5 0 1 0 .998-.06l-.5-8.5a.5.5 0 1 0-.998.06Zm6.53-.528a.5.5 0 0 0-.528.47l-.5 8.5a.5.5 0 0 0 .998.058l.5-8.5a.5.5 0 0 0-.47-.528ZM8 4.5a.5.5 0 0 0-.5.5v8.5a.5.5 0 0 0 1 0V5a.5.5 0 0 0-.5-.5Z"/></svg> Excluir';
                btnExcluir.onclick = async () => {
                    if (confirm(`Tem certeza que deseja excluir a tag "${tag.name}"? Esta ação não pode ser desfeita e a tag será removida de todos os contribuintes associados.`)) {
                        try {
                            // Remover a tag de todos os contribuintes que a utilizam
                            const contribuintesAfetados = await dbRef.getAllItems(CONTRIBUINTES_STORE_NAME);
                            for (const contrib of contribuintesAfetados) {
                                if (contrib.tags && contrib.tags.includes(tag.name)) {
                                    contrib.tags = contrib.tags.filter(t => t !== tag.name);
                                    contrib.modificationDate = new Date().toISOString();
                                    await dbRef.updateItem(CONTRIBUINTES_STORE_NAME, contrib);
                                }
                            }
                            await dbRef.deleteItem(CONTRIBUINTE_TAGS_STORE_NAME, tag.id);
                            if (globalShowFeedbackRef) globalShowFeedbackRef(`Tag "${tag.name}" excluída e removida dos contribuintes.`, 'success', feedbackAreaEl);
                            await carregarERenderizarTags(listaTagsEl, feedbackAreaEl);
                            if (refreshApplicationStateRef) await refreshApplicationStateRef();
                        } catch (error) {
                            console.error("ContribuintesTags.JS: Erro ao excluir tag:", error);
                            if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao excluir tag: ${error.message}`, 'error', feedbackAreaEl);
                        }
                    }
                };
                divAcoes.appendChild(btnExcluir);
                li.appendChild(divAcoes);
                listaTagsEl.appendChild(li);
            });

        } catch (error) {
            console.error("ContribuintesTags.JS: Erro ao carregar tags:", error);
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro ao carregar a lista de tags.", 'error', feedbackAreaEl);
            listaTagsEl.innerHTML = '<li class="text-center text-red-500 dark:text-gray-200 py-4">Falha ao carregar tags.</li>';
        }
    }

    /**
     * Habilita a edição para um item de tag específico.
     * @param {HTMLElement} liElement - O elemento <li> da tag.
     * @param {object} tag - O objeto da tag.
     * @param {HTMLElement} feedbackAreaEl - O elemento para exibir feedback.
     */
    function habilitarEdicaoTag(liElement, tag, feedbackAreaEl) {
        const nomeAtual = tag.name;
        const spanNome = liElement.querySelector('.tag-nome');
        const divAcoes = liElement.querySelector('.tag-acoes');

        spanNome.style.display = 'none';
        divAcoes.style.display = 'none';

        const inputEdicao = document.createElement('input');
        inputEdicao.type = 'text';
        inputEdicao.value = nomeAtual;
        inputEdicao.className = 'form-input-text text-sm py-1 px-2 rounded-l-md border-gray-300 dark:bg-slate-600 dark:border-slate-500 dark:text-gray-200 focus:border-blue-500 focus:ring-blue-500';
        inputEdicao.style.flexGrow = '1';

        const btnSalvar = document.createElement('button');
        btnSalvar.textContent = 'Salvar';
        btnSalvar.className = 'btn-primary text-xs py-1 px-2 rounded-r-md';
        btnSalvar.onclick = async () => {
            const novoNome = inputEdicao.value.trim();
            if (!novoNome) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("O nome da tag não pode ser vazio.", 'error', feedbackAreaEl);
                inputEdicao.focus();
                return;
            }
            if (!isValidTagName(novoNome)) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("Nome de tag inválido. Use letras, números, espaços, '-' ou '_'. Máximo 50 caracteres.", 'error', feedbackAreaEl);
                inputEdicao.focus();
                return;
            }
            if (novoNome.toLowerCase() === nomeAtual.toLowerCase()) {
                cancelarEdicaoTag(liElement, nomeAtual);
                return;
            }

            try {
                const tagsExistentes = await dbRef.getAllItems(CONTRIBUINTE_TAGS_STORE_NAME);
                if (tagsExistentes.some(t => t.id !== tag.id && t.name.toLowerCase() === novoNome.toLowerCase())) {
                    if (globalShowFeedbackRef) globalShowFeedbackRef(`A tag "${novoNome}" já existe.`, 'error', feedbackAreaEl);
                    inputEdicao.focus();
                    return;
                }

                const tagParaAtualizar = await dbRef.getItemById(CONTRIBUINTE_TAGS_STORE_NAME, tag.id);
                if (!tagParaAtualizar) {
                   if (globalShowFeedbackRef) globalShowFeedbackRef("Tag não encontrada para atualização.", 'error', feedbackAreaEl);
                   await carregarERenderizarTags(liElement.parentElement, feedbackAreaEl);
                   return;
               }

                tagParaAtualizar.name = novoNome;
                await dbRef.updateItem(CONTRIBUINTE_TAGS_STORE_NAME, tagParaAtualizar);

                const contribuintesAfetados = await dbRef.getAllItems(CONTRIBUINTES_STORE_NAME);
                for (const contrib of contribuintesAfetados) {
                    if (contrib.tags && Array.isArray(contrib.tags)) {
                        const index = contrib.tags.indexOf(nomeAtual);
                        if (index !== -1) {
                            contrib.tags[index] = novoNome;
                            contrib.modificationDate = new Date().toISOString();
                            await dbRef.updateItem(CONTRIBUINTES_STORE_NAME, contrib);
                        }
                    }
                }

                if (globalShowFeedbackRef) globalShowFeedbackRef(`Tag atualizada para "${novoNome}". Contribuintes associados também foram atualizados.`, 'success', feedbackAreaEl);
                await carregarERenderizarTags(liElement.parentElement, feedbackAreaEl);
                if (refreshApplicationStateRef) await refreshApplicationStateRef();
            } catch (error) {
                console.error("ContribuintesTags.JS: Erro ao atualizar tag:", error);
                if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao atualizar tag: ${error.message}`, 'error', feedbackAreaEl);
                cancelarEdicaoTag(liElement, nomeAtual);
            }
        };

        const btnCancelar = document.createElement('button');
        btnCancelar.textContent = 'Cancelar';
        btnCancelar.className = 'btn-secondary text-xs py-1 px-2 rounded-md ml-2';
        btnCancelar.onclick = () => cancelarEdicaoTag(liElement, nomeAtual);

        const divEdicao = document.createElement('div');
        divEdicao.className = 'flex items-center w-full';
        divEdicao.appendChild(inputEdicao);

        const divBotoesEdicao = document.createElement('div');
        divBotoesEdicao.className = 'ml-2 flex-shrink-0';
        divBotoesEdicao.appendChild(btnSalvar);
        divBotoesEdicao.appendChild(btnCancelar);
        divEdicao.appendChild(divBotoesEdicao);

        liElement.insertBefore(divEdicao, divAcoes);
        inputEdicao.focus();
        inputEdicao.select();
    }

    /**
     * Cancela o modo de edição, restaurando a visualização normal da tag.
     * @param {HTMLElement} liElement - O elemento <li> da tag.
     * @param {string} nomeOriginal - O nome original da tag.
     */
    function cancelarEdicaoTag(liElement, nomeOriginal) {
        const divEdicao = liElement.querySelector('.flex.items-center.w-full');
        if (divEdicao) {
            liElement.removeChild(divEdicao);
        }

        const spanNome = liElement.querySelector('.tag-nome');
        const divAcoes = liElement.querySelector('.tag-acoes');
        spanNome.textContent = nomeOriginal;
        spanNome.style.display = '';
        divAcoes.style.display = '';
    }

    /**
     * Renderiza a página para gerenciar as tags de contribuinte.
     */
    async function renderGerenciarTagsContribuintesPage() {
        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (!mainContentWrapperRef) {
            console.error("ContribuintesTags.JS: renderGerenciarTagsContribuintesPage - mainContentWrapperRef não definido.");
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico ao tentar renderizar a página de tags de contribuintes.", "error");
            return;
        }

        // Atualiza o target da view no App
        if (appModuleRef && typeof appModuleRef.setCurrentViewTarget === 'function') {
            appModuleRef.setCurrentViewTarget('gerir-tags-contribuintes');
        }

        // REMOVIDA CLASSE page-section
        const pageHtml = `
            <div id="gerenciar-tags-contrib-container">
                <h2 class="text-xl font-semibold mb-4">Gerenciar Tags de Contribuintes</h2>
                <div id="feedback-tags-contrib" class="mb-4"></div>

                <div class="mb-6 p-4 border dark:border-slate-600 rounded-lg shadow bg-white dark:bg-slate-800">
                    <h3 class="text-md font-semibold mb-2 text-gray-700 dark:text-gray-200">Adicionar Nova Tag de Contribuinte</h3>
                    <div class="flex items-center gap-2">
                        <input type="text" id="input-nova-tag-contrib-nome" placeholder="Nome da nova tag" class="form-input-text flex-grow text-sm py-2 px-3">
                        <button id="btn-adicionar-tag-contrib" class="btn-primary py-2 px-4 text-sm">Adicionar</button>
                    </div>
                </div>

                <h3 class="text-md font-semibold mb-3 text-gray-700 dark:text-gray-200">Tags de Contribuintes Existentes</h3>
                <ul id="lista-tags-contrib" class="space-y-2">
                    <li class="text-center text-gray-500 dark:text-gray-400 py-4">Carregando tags...</li>
                </ul>
            </div>
        `;
        mainContentWrapperRef.innerHTML = pageHtml;

        const listaTagsEl = document.getElementById('lista-tags-contrib');
        const inputNovaTagNome = document.getElementById('input-nova-tag-contrib-nome');
        const btnAdicionarTag = document.getElementById('btn-adicionar-tag-contrib');
        const feedbackAreaLocal = document.getElementById('feedback-tags-contrib');

        btnAdicionarTag.addEventListener('click', async () => {
            const nomeNovaTag = inputNovaTagNome.value.trim();
            if (!nomeNovaTag) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("O nome da tag não pode estar vazio.", 'error', feedbackAreaLocal);
                inputNovaTagNome.focus();
                return;
            }
            if (!isValidTagName(nomeNovaTag)) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("Nome de tag inválido. Use letras, números, espaços, '-' ou '_'. Máximo 50 caracteres.", 'error', feedbackAreaLocal);
                inputNovaTagNome.focus();
                return;
            }

            try {
                const tagsExistentes = await dbRef.getAllItems(CONTRIBUINTE_TAGS_STORE_NAME);
                if (tagsExistentes.some(t => t.name.toLowerCase() === nomeNovaTag.toLowerCase())) {
                    if (globalShowFeedbackRef) globalShowFeedbackRef(`A tag "${nomeNovaTag}" já existe.`, 'error', feedbackAreaLocal);
                    return;
                }

                const novaTag = {
                    id: appModuleRef.generateUUID(), // Gera UUID para o ID
                    name: nomeNovaTag
                };

                await dbRef.addItem(CONTRIBUINTE_TAGS_STORE_NAME, novaTag);
                if (globalShowFeedbackRef) globalShowFeedbackRef(`Tag "${nomeNovaTag}" adicionada com sucesso.`, 'success', feedbackAreaLocal);
                inputNovaTagNome.value = '';
                await carregarERenderizarTags(listaTagsEl, feedbackAreaLocal);
                if (refreshApplicationStateRef) await refreshApplicationStateRef();
            } catch (error) {
                console.error("ContribuintesTags.JS: Erro ao adicionar nova tag:", error);
                if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao adicionar tag: ${error.message}`, 'error', feedbackAreaLocal);
            }
        });

        await carregarERenderizarTags(listaTagsEl, feedbackAreaLocal);
    }

    // API pública do módulo
    return {
        init,
        renderGerenciarTagsContribuintesPage, // Nome da função principal exportada
        isValidTagName
    };
})();