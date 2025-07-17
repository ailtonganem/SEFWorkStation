// js/contribuintesCategorias.js - Lógica para Gerir Categorias de Contribuinte (CRUD Completo)
// v1.1.1 - Remove classe page-section para expandir a largura da visualização.
// v1.1 - Adota UUIDs para IDs primários na criação de novas categorias.
// v1.0 - Versão inicial baseada em documentosCategorias.js

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.ContribuintesCategorias = (function() {
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let refreshApplicationStateRef;
    let dbRef;
    let appModuleRef; // Adicionado para gerar UUIDs
    // Utiliza a constante da store de categorias de contribuinte definida em db.js
    const CONTRIBUINTE_CATEGORIES_STORE_NAME = window.SEFWorkStation.DB.STORES.CONTRIBUINTE_CATEGORIES;
    const CONTRIBUINTES_STORE_NAME = 'contribuintes'; // Para atualizar contribuintes

    /**
     * Inicializa o módulo de Categorias de Contribuinte.
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

        if (!dbRef) console.error("ContribuintesCategorias.JS: init - Referência ao DB não fornecida!");
        if (!mainContentWrapperRef) console.error("ContribuintesCategorias.JS: init - mainContentWrapperRef não fornecido.");
        if (!appModuleRef) console.error("ContribuintesCategorias.JS: init - appModuleRef (applicationModuleRef) não fornecido.");
        console.log("ContribuintesCategorias.JS: Módulo inicializado (v1.1.1).");
    }

    /**
     * Valida o nome da categoria (não permite / no início ou fim, ou //).
     * @param {string} categoryName - O nome da categoria a ser validado.
     * @returns {boolean} - True se válido, false caso contrário.
     */
    function isValidCategoryName(categoryName) {
        if (!categoryName || typeof categoryName !== 'string') return false;
        const trimmedName = categoryName.trim();
        if (trimmedName.startsWith('/') || trimmedName.endsWith('/') || trimmedName.includes('//')) {
            return false;
        }
        const pattern = /^[a-zA-Z0-9À-ú\s\-_/]+$/;
        return pattern.test(trimmedName) && trimmedName.length > 0 && trimmedName.length <= 100;
    }

    /**
     * Formata o nome da categoria para exibição (ex: 'Nivel1 / Nivel2' -> 'Nivel1 › Nivel2').
     * @param {string} categoryName - O nome da categoria.
     * @returns {string} - O nome formatado.
     */
    function formatCategoryNameForDisplay(categoryName) {
        if (!categoryName) return '';
        return categoryName.split('/').map(c => c.trim()).join(' › ');
    }

    /**
     * Normaliza o nome da categoria para armazenamento (ex: "Nivel1  /  Nivel2" -> "Nivel1/Nivel2").
     * Remove espaços extras ao redor das barras e garante uma única barra como separador.
     * @param {string} categoryNameInput - O nome da categoria do input do usuário.
     * @returns {string} - O nome normalizado para armazenamento.
     */
    function normalizeCategoryNameForStorage(categoryNameInput) {
        if (!categoryNameInput) return '';
        return categoryNameInput.split('/')
                               .map(s => s.trim())
                               .filter(s => s)
                               .join('/');
    }


    /**
     * Carrega e renderiza a lista de categorias de contribuintes.
     * @param {HTMLElement} listaCategoriasEl - O elemento UL onde as categorias serão renderizadas.
     * @param {HTMLElement} feedbackAreaEl - O elemento para exibir feedback específico.
     */
    async function carregarERenderizarCategorias(listaCategoriasEl, feedbackAreaEl) {
        if (!dbRef || !listaCategoriasEl) return;
        try {
            const categorias = await dbRef.getAllItems(CONTRIBUINTE_CATEGORIES_STORE_NAME);
            categorias.sort((a, b) => {
                const depthA = (a.name.match(/\//g) || []).length;
                const depthB = (b.name.match(/\//g) || []).length;
                if (depthA !== depthB) {
                    return depthA - depthB;
                }
                return a.name.localeCompare(b.name);
            });

            listaCategoriasEl.innerHTML = '';
            if (categorias.length === 0) {
                listaCategoriasEl.innerHTML = '<li class="text-center text-gray-500 dark:text-gray-400 py-4">Nenhuma categoria de contribuinte cadastrada.</li>';
                return;
            }

            categorias.forEach(categoria => {
                const li = document.createElement('li');
                li.className = 'flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-700 rounded-md shadow-sm mb-2';
                li.dataset.categoriaId = categoria.id;

                const spanNome = document.createElement('span');
                spanNome.className = 'categoria-nome text-sm text-gray-700 dark:text-gray-200';
                spanNome.textContent = formatCategoryNameForDisplay(categoria.name);
                li.appendChild(spanNome);

                const divAcoes = document.createElement('div');
                divAcoes.className = 'categoria-acoes';

                const btnEditar = document.createElement('button');
                btnEditar.className = 'btn-edit text-xs py-1 px-2 rounded mr-2';
                btnEditar.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-pencil-square inline-block" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg> Editar';
                btnEditar.onclick = () => habilitarEdicaoCategoria(li, categoria, feedbackAreaEl);
                divAcoes.appendChild(btnEditar);

                const btnExcluir = document.createElement('button');
                btnExcluir.className = 'btn-delete text-xs py-1 px-2 rounded';
                btnExcluir.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-trash3-fill inline-block" viewBox="0 0 16 16"><path d="M11 1.5v1h3.5a.5.5 0 0 1 0 1h-.538l-.853 10.66A2 2 0 0 1 11.115 16h-6.23a2 2 0 0 1-1.994-1.84L2.038 3.5H1.5a.5.5 0 0 1 0-1H5v-1A1.5 1.5 0 0 1 6.5 0h3A1.5 1.5 0 0 1 11 1.5Zm-5 0v1h4v-1a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5ZM4.5 5.029l.5 8.5a.5.5 0 1 0 .998-.06l-.5-8.5a.5.5 0 1 0-.998.06Zm6.53-.528a.5.5 0 0 0-.528.47l-.5 8.5a.5.5 0 0 0 .998.058l.5-8.5a.5.5 0 0 0-.47-.528ZM8 4.5a.5.5 0 0 0-.5.5v8.5a.5.5 0 0 0 1 0V5a.5.5 0 0 0-.5-.5Z"/></svg> Excluir';
                btnExcluir.onclick = async () => {
                    if (confirm(`Tem certeza que deseja excluir a categoria "${formatCategoryNameForDisplay(categoria.name)}"? Esta ação não pode ser desfeita e a categoria será removida de todos os contribuintes associados.`)) {
                        try {
                            const contribuintesAfetados = await dbRef.getAllItems(CONTRIBUINTES_STORE_NAME);
                            for (const contrib of contribuintesAfetados) {
                                if (contrib.categories && contrib.categories.includes(categoria.name)) {
                                    contrib.categories = contrib.categories.filter(cat => cat !== categoria.name);
                                    contrib.modificationDate = new Date().toISOString();
                                    await dbRef.updateItem(CONTRIBUINTES_STORE_NAME, contrib);
                                }
                            }
                            await dbRef.deleteItem(CONTRIBUINTE_CATEGORIES_STORE_NAME, categoria.id);
                            if (globalShowFeedbackRef) globalShowFeedbackRef(`Categoria "${formatCategoryNameForDisplay(categoria.name)}" excluída e removida dos contribuintes.`, 'success', feedbackAreaEl);
                            await carregarERenderizarCategorias(listaCategoriasEl, feedbackAreaEl);
                            if (refreshApplicationStateRef) await refreshApplicationStateRef();
                        } catch (error) {
                            console.error("ContribuintesCategorias.JS: Erro ao excluir categoria:", error);
                            if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao excluir categoria: ${error.message}`, 'error', feedbackAreaEl);
                        }
                    }
                };
                divAcoes.appendChild(btnExcluir);
                li.appendChild(divAcoes);
                listaCategoriasEl.appendChild(li);
            });

        } catch (error) {
            console.error("ContribuintesCategorias.JS: Erro ao carregar categorias:", error);
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro ao carregar a lista de categorias.", 'error', feedbackAreaEl);
            listaCategoriasEl.innerHTML = '<li class="text-center text-red-500 dark:text-gray-200 py-4">Falha ao carregar categorias.</li>';
        }
    }

    /**
     * Habilita a edição para um item de categoria específico.
     * @param {HTMLElement} liElement - O elemento <li> da categoria.
     * @param {object} categoria - O objeto da categoria.
     * @param {HTMLElement} feedbackAreaEl - O elemento para exibir feedback.
     */
    function habilitarEdicaoCategoria(liElement, categoria, feedbackAreaEl) {
        const nomeAtual = categoria.name;
        const spanNome = liElement.querySelector('.categoria-nome');
        const divAcoes = liElement.querySelector('.categoria-acoes');

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
            const novoNomeRaw = inputEdicao.value.trim();
            if (!novoNomeRaw) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("O nome da categoria não pode ser vazio.", 'error', feedbackAreaEl);
                inputEdicao.focus();
                return;
            }
            if (!isValidCategoryName(novoNomeRaw)) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("Nome de categoria inválido. Use 'Nivel 1 / Nivel 2'. Evite barras no início/fim ou duplicadas (//).", 'error', feedbackAreaEl);
                inputEdicao.focus();
                return;
            }

            const novoNomeNormalizado = normalizeCategoryNameForStorage(novoNomeRaw);

            if (novoNomeNormalizado.toLowerCase() === nomeAtual.toLowerCase()) {
                cancelarEdicaoCategoria(liElement, nomeAtual);
                return;
            }

            try {
                const categoriasExistentes = await dbRef.getAllItems(CONTRIBUINTE_CATEGORIES_STORE_NAME);
                if (categoriasExistentes.some(cat => cat.id !== categoria.id && cat.name.toLowerCase() === novoNomeNormalizado.toLowerCase())) {
                    if (globalShowFeedbackRef) globalShowFeedbackRef(`A categoria "${formatCategoryNameForDisplay(novoNomeNormalizado)}" já existe.`, 'error', feedbackAreaEl);
                    inputEdicao.focus();
                    return;
                }

                const categoriaParaAtualizar = await dbRef.getItemById(CONTRIBUINTE_CATEGORIES_STORE_NAME, categoria.id);
                 if (!categoriaParaAtualizar) {
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Categoria não encontrada para atualização.", 'error', feedbackAreaEl);
                    await carregarERenderizarCategorias(liElement.parentElement, feedbackAreaEl);
                    return;
                }

                categoriaParaAtualizar.name = novoNomeNormalizado;
                await dbRef.updateItem(CONTRIBUINTE_CATEGORIES_STORE_NAME, categoriaParaAtualizar);

                const contribuintesAfetados = await dbRef.getAllItems(CONTRIBUINTES_STORE_NAME);
                for (const contrib of contribuintesAfetados) {
                    if (contrib.categories && Array.isArray(contrib.categories)) {
                        const index = contrib.categories.indexOf(nomeAtual);
                        if (index !== -1) {
                            contrib.categories[index] = novoNomeNormalizado;
                            contrib.modificationDate = new Date().toISOString();
                            await dbRef.updateItem(CONTRIBUINTES_STORE_NAME, contrib);
                        }
                    }
                }

                if (globalShowFeedbackRef) globalShowFeedbackRef(`Categoria atualizada para "${formatCategoryNameForDisplay(novoNomeNormalizado)}". Contribuintes associados também foram atualizados.`, 'success', feedbackAreaEl);
                await carregarERenderizarCategorias(liElement.parentElement, feedbackAreaEl);
                if (refreshApplicationStateRef) await refreshApplicationStateRef();
            } catch (error) {
                console.error("ContribuintesCategorias.JS: Erro ao atualizar categoria:", error);
                if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao atualizar categoria: ${error.message}`, 'error', feedbackAreaEl);
                cancelarEdicaoCategoria(liElement, nomeAtual);
            }
        };

        const btnCancelar = document.createElement('button');
        btnCancelar.textContent = 'Cancelar';
        btnCancelar.className = 'btn-secondary text-xs py-1 px-2 rounded-md ml-2';
        btnCancelar.onclick = () => cancelarEdicaoCategoria(liElement, nomeAtual);

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
     * Cancela o modo de edição, restaurando a visualização normal da categoria.
     * @param {HTMLElement} liElement - O elemento <li> da categoria.
     * @param {string} nomeOriginal - O nome original da categoria (com barras).
     */
    function cancelarEdicaoCategoria(liElement, nomeOriginal) {
        const divEdicao = liElement.querySelector('.flex.items-center.w-full');
        if (divEdicao) {
            liElement.removeChild(divEdicao);
        }

        const spanNome = liElement.querySelector('.categoria-nome');
        const divAcoes = liElement.querySelector('.categoria-acoes');
        spanNome.textContent = formatCategoryNameForDisplay(nomeOriginal);
        spanNome.style.display = '';
        divAcoes.style.display = '';
    }

    /**
     * Renderiza a página para gerenciar as categorias de contribuinte.
     */
    async function renderGerenciarCategoriasContribuintesPage() {
        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (!mainContentWrapperRef) {
            console.error("ContribuintesCategorias.JS: renderGerenciarCategoriasContribuintesPage - mainContentWrapperRef não definido.");
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico ao tentar renderizar a página de categorias de contribuintes.", "error");
            return;
        }

        // Atualiza o target da view no App
        if (appModuleRef && typeof appModuleRef.setCurrentViewTarget === 'function') {
            appModuleRef.setCurrentViewTarget('gerir-categorias-contribuintes');
        }

        // REMOVIDA CLASSE page-section
        const pageHtml = `
            <div id="gerenciar-categorias-contrib-container"> 
                <h2 class="text-xl font-semibold mb-4">Gerenciar Categorias de Contribuintes</h2>
                <div id="feedback-categorias-contrib" class="mb-4"></div>

                <div class="form-section mb-6 p-4 border dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800">
                    <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">Adicionar Nova Categoria de Contribuinte</h3>
                    <div class="flex items-center gap-2">
                        <input type="text" id="input-nova-categoria-contrib-nome" placeholder="Nome da Categoria (ex: Cliente / Fornecedor)" class="form-input-text flex-grow text-sm py-2 px-3">
                        <button id="btn-adicionar-categoria-contrib" class="btn-primary py-2 px-4 text-sm">Adicionar</button>
                    </div>
                     <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Use "/" para criar subníveis (ex: Clientes / Ativos).</p>
                </div>

                <h3 class="text-md font-semibold mb-3 text-gray-700 dark:text-gray-200">Categorias de Contribuintes Existentes</h3>
                <ul id="lista-categorias-contrib" class="space-y-2">
                    <li class="text-center text-gray-500 dark:text-gray-400 py-4">Carregando categorias...</li>
                </ul>
            </div>
        `;
        mainContentWrapperRef.innerHTML = pageHtml;

        const listaCategoriasEl = document.getElementById('lista-categorias-contrib');
        const inputNovaCategoriaNome = document.getElementById('input-nova-categoria-contrib-nome');
        const btnAdicionarCategoria = document.getElementById('btn-adicionar-categoria-contrib');
        const feedbackAreaLocal = document.getElementById('feedback-categorias-contrib');

        btnAdicionarCategoria.addEventListener('click', async () => {
            const nomeNovaCategoriaRaw = inputNovaCategoriaNome.value.trim();
            if (!nomeNovaCategoriaRaw) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("O nome da categoria não pode estar vazio.", 'error', feedbackAreaLocal);
                inputNovaCategoriaNome.focus();
                return;
            }

            if (!isValidCategoryName(nomeNovaCategoriaRaw)) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("Nome de categoria inválido. Use '/' para subníveis. Não pode começar/terminar com '/' nem ter '//'.", 'error', feedbackAreaLocal);
                inputNovaCategoriaNome.focus();
                return;
            }
            const nomeNovaCategoriaNormalizado = normalizeCategoryNameForStorage(nomeNovaCategoriaRaw);

            try {
                const categoriasExistentes = await dbRef.getAllItems(CONTRIBUINTE_CATEGORIES_STORE_NAME);
                if (categoriasExistentes.some(cat => cat.name.toLowerCase() === nomeNovaCategoriaNormalizado.toLowerCase())) {
                    if (globalShowFeedbackRef) globalShowFeedbackRef(`A categoria "${formatCategoryNameForDisplay(nomeNovaCategoriaNormalizado)}" já existe.`, 'error', feedbackAreaLocal);
                    return;
                }

                const novaCategoria = {
                    id: appModuleRef.generateUUID(), // Gera UUID para o ID
                    name: nomeNovaCategoriaNormalizado
                };

                await dbRef.addItem(CONTRIBUINTE_CATEGORIES_STORE_NAME, novaCategoria);
                if (globalShowFeedbackRef) globalShowFeedbackRef(`Categoria "${formatCategoryNameForDisplay(nomeNovaCategoriaNormalizado)}" adicionada com sucesso.`, 'success', feedbackAreaLocal);
                inputNovaCategoriaNome.value = '';
                await carregarERenderizarCategorias(listaCategoriasEl, feedbackAreaLocal);
                if (refreshApplicationStateRef) await refreshApplicationStateRef();
            } catch (error) {
                console.error("ContribuintesCategorias.JS: Erro ao adicionar nova categoria:", error);
                if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao adicionar categoria: ${error.message}`, 'error', feedbackAreaLocal);
            }
        });

        await carregarERenderizarCategorias(listaCategoriasEl, feedbackAreaLocal);
    }

    // API pública do módulo
    return {
        init,
        renderGerenciarCategoriasContribuintesPage, // Nome da função principal exportada
        isValidCategoryName, // Exporta a função para ser usada externamente, se necessário
        formatCategoryNameForDisplay,
        normalizeCategoryNameForStorage
    };
})();