// js/documentosCategorias.js - Lógica para Gerir Categorias de Documento (CRUD Completo)
// v2.4.0 - Remove classe page-section para expandir a largura da visualização.
// v2.3.3 - Garante que todas as funções utilitárias necessárias sejam exportadas corretamente.
// v2.3.2 - Garante a exportação correta das funções utilitárias para o escopo global do módulo.
// v2.3.1 - Corrige a exportação das funções utilitárias para o escopo global do módulo.
// v2.3 - Garante a exportação correta das funções utilitárias.
// v2.2 - Adiciona funcionalidade de Edição de Categorias e atualização em documentos.
// v2.1 - Exporta isValidCategoryName para uso externo.
// v2.0 - Adicionada funcionalidade de Edição de Categorias

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.DocumentosCategorias = (function() {
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let refreshApplicationStateRef;
    let dbRef;
    const DOCUMENT_CATEGORIES_STORE_NAME = 'documentCategories';
    const DOCUMENTS_STORE_NAME = 'documents'; // Para atualizar documentos

    /**
     * Inicializa o módulo de Categorias de Documento.
     */
    function init(mainWrapper, showFeedbackFunc, clearFeedbackFunc, refreshFunc, dbModuleRef) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedbackFunc;
        globalClearFeedbackRef = clearFeedbackFunc;
        refreshApplicationStateRef = refreshFunc;
        dbRef = dbModuleRef;

        if (!dbRef) console.error("DocumentosCategorias.JS: init - Referência ao DB não fornecida!");
        console.log("DocumentosCategorias.JS: Módulo inicializado (v2.4.0).");
    }

    /**
     * Valida o nome da categoria.
     * Permite nomes com "/" para subcategorias, mas não podem começar ou terminar com "/".
     * Não permite "//" consecutivos.
     * Permite letras, números, espaços, hífens, underscores e a barra para hierarquia.
     * @param {string} name - O nome da categoria a ser validado.
     * @returns {boolean} - True se válido, false caso contrário.
     */
    function isValidCategoryName(name) {
        if (!name || typeof name !== 'string' || name.trim() === '') return false;
        const trimmedName = name.trim(); 
        if (trimmedName.startsWith('/') || trimmedName.endsWith('/')) return false;
        if (trimmedName.includes('//')) return false;
        const pattern = /^[a-zA-Z0-9À-ú\s\-_/]+$/;
        return pattern.test(trimmedName) && trimmedName.length > 0 && trimmedName.length <= 100;
    }
    
    /**
     * Formata o nome da categoria para exibição (ex: "Nivel1 / Nivel2" -> "Nivel1 › Nivel2").
     * @param {string} categoryName - O nome da categoria como armazenado.
     * @returns {string} - O nome formatado para exibição.
     */
    function formatCategoryNameForDisplay(categoryName) {
        if (!categoryName) return '';
        return categoryName.split('/').map(s => s.trim()).join(' › ');
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
     * Carrega e renderiza a lista de categorias de documento.
     * @param {HTMLElement} listaCategoriasEl - O elemento UL onde as categorias serão renderizadas.
     * @param {HTMLElement} feedbackAreaLocal - O elemento para exibir feedback específico.
     */
    async function carregarERenderizarCategorias(listaCategoriasEl, feedbackAreaLocal) {
        if (!listaCategoriasEl) return;
        listaCategoriasEl.innerHTML = '<li class="text-sm text-gray-500 dark:text-gray-400">A carregar categorias...</li>';
        try {
            const categorias = await dbRef.getAllItems(DOCUMENT_CATEGORIES_STORE_NAME);
            categorias.sort((a, b) => a.name.localeCompare(b.name));

            if (categorias.length === 0) {
                listaCategoriasEl.innerHTML = '<li class="text-sm text-gray-500 dark:text-gray-400">Nenhuma categoria de documento registada.</li>';
                return;
            }

            listaCategoriasEl.innerHTML = ''; 
            categorias.forEach(categoria => {
                const li = document.createElement('li');
                li.className = 'flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-700 rounded-md shadow-sm';
                li.dataset.categoriaId = categoria.id; 

                const nomeSpan = document.createElement('span');
                nomeSpan.className = 'text-sm text-gray-700 dark:text-gray-200 categoria-nome-display';
                nomeSpan.textContent = formatCategoryNameForDisplay(categoria.name); 
                li.appendChild(nomeSpan);

                const editContainer = document.createElement('div');
                editContainer.className = 'edit-categoria-container hidden flex items-center gap-2';
                li.appendChild(editContainer);

                const buttonsDiv = document.createElement('div');
                buttonsDiv.className = 'categoria-actions-display';

                const btnEditar = document.createElement('button');
                btnEditar.className = 'btn-secondary btn-sm text-xs py-1 px-2 mr-2 btn-editar-categoria';
                btnEditar.textContent = 'Editar';
                btnEditar.title = `Editar categoria "${formatCategoryNameForDisplay(categoria.name)}"`;
                btnEditar.addEventListener('click', () => habilitarEdicaoCategoria(categoria.id, categoria.name, li, feedbackAreaLocal, listaCategoriasEl));
                buttonsDiv.appendChild(btnEditar);

                const btnExcluir = document.createElement('button');
                btnExcluir.className = 'btn-delete btn-sm text-xs py-1 px-2 btn-excluir-categoria';
                btnExcluir.textContent = 'Excluir';
                btnExcluir.title = `Excluir categoria "${formatCategoryNameForDisplay(categoria.name)}"`;
                btnExcluir.addEventListener('click', async () => {
                    const nomeFormatado = formatCategoryNameForDisplay(categoria.name);
                    if (confirm(`Tem certeza que deseja excluir a categoria "${nomeFormatado}"? Esta ação não pode ser desfeita e a categoria será removida de todos os documentos associados.`)) {
                        try {
                            const documentosAfetados = await dbRef.getAllItems(DOCUMENTS_STORE_NAME);
                            for (const doc of documentosAfetados) {
                                if (doc.categories && doc.categories.includes(categoria.name)) {
                                    doc.categories = doc.categories.filter(cat => cat !== categoria.name);
                                    doc.modificationDate = new Date().toISOString();
                                    await dbRef.updateItem(DOCUMENTS_STORE_NAME, doc);
                                }
                            }
                            await dbRef.deleteItem(DOCUMENT_CATEGORIES_STORE_NAME, categoria.id);
                            if (globalShowFeedbackRef) globalShowFeedbackRef(`Categoria "${nomeFormatado}" excluída e removida dos documentos.`, 'success', feedbackAreaLocal);
                            await carregarERenderizarCategorias(listaCategoriasEl, feedbackAreaLocal); 
                            if (refreshApplicationStateRef) await refreshApplicationStateRef(); 
                        } catch (error) {
                            console.error("DocumentosCategorias.JS: Erro ao excluir categoria:", error);
                            if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao excluir categoria: ${error.message}`, 'error', feedbackAreaLocal);
                        }
                    }
                });
                buttonsDiv.appendChild(btnExcluir);
                li.appendChild(buttonsDiv);
                listaCategoriasEl.appendChild(li);
            });
        } catch (error) {
            console.error("DocumentosCategorias.JS: Erro ao carregar categorias:", error);
            listaCategoriasEl.innerHTML = '<li class="text-sm text-red-500 dark:text-red-400">Erro ao carregar categorias.</li>';
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro ao carregar categorias.", 'error', feedbackAreaLocal);
        }
    }
    
    /**
     * Habilita a edição para uma categoria específica.
     * @param {number} categoriaId - O ID da categoria a ser editada.
     * @param {string} nomeAtual - O nome atual da categoria (como armazenado).
     * @param {HTMLElement} liElement - O elemento <li> da categoria.
     * @param {HTMLElement} feedbackAreaLocal - O elemento para exibir feedback.
     * @param {HTMLElement} listaCategoriasEl - O elemento UL da lista de categorias.
     */
    function habilitarEdicaoCategoria(categoriaId, nomeAtual, liElement, feedbackAreaLocal, listaCategoriasEl) {
        const nomeSpan = liElement.querySelector('.categoria-nome-display');
        const actionsDiv = liElement.querySelector('.categoria-actions-display');
        const editContainer = liElement.querySelector('.edit-categoria-container');

        nomeSpan.classList.add('hidden');
        actionsDiv.classList.add('hidden');
        editContainer.classList.remove('hidden');
        editContainer.innerHTML = ''; 

        const inputNome = document.createElement('input');
        inputNome.type = 'text';
        inputNome.value = nomeAtual; 
        inputNome.className = 'form-input-text text-sm py-1 px-2 flex-grow';
        inputNome.placeholder = "Nível 1 / Nível 2";
        inputNome.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                salvarEdicaoCategoria(categoriaId, inputNome.value, liElement, feedbackAreaLocal, listaCategoriasEl);
            }
        });
        editContainer.appendChild(inputNome);

        const btnSalvar = document.createElement('button');
        btnSalvar.textContent = 'Salvar';
        btnSalvar.className = 'btn-primary btn-sm text-xs py-1 px-2';
        btnSalvar.addEventListener('click', () => salvarEdicaoCategoria(categoriaId, inputNome.value, liElement, feedbackAreaLocal, listaCategoriasEl));
        editContainer.appendChild(btnSalvar);

        const btnCancelar = document.createElement('button');
        btnCancelar.textContent = 'Cancelar';
        btnCancelar.className = 'btn-secondary btn-sm text-xs py-1 px-2';
        btnCancelar.addEventListener('click', () => cancelarEdicaoCategoria(liElement, feedbackAreaLocal, listaCategoriasEl));
        editContainer.appendChild(btnCancelar);

        inputNome.focus();
        inputNome.select();
    }

    /**
     * Salva o nome editado de uma categoria.
     * @param {number} categoriaId - O ID da categoria.
     * @param {string} novoNomeInput - O novo nome da categoria vindo do input.
     * @param {HTMLElement} liElement - O elemento <li> da categoria.
     * @param {HTMLElement} feedbackAreaLocal - O elemento para exibir feedback.
     * @param {HTMLElement} listaCategoriasEl - O elemento UL da lista de categorias.
     */
    async function salvarEdicaoCategoria(categoriaId, novoNomeInput, liElement, feedbackAreaLocal, listaCategoriasEl) {
        const novoNomeNormalizado = normalizeCategoryNameForStorage(novoNomeInput);

        if (!isValidCategoryName(novoNomeNormalizado)) {
            if (globalShowFeedbackRef) globalShowFeedbackRef("Nome da categoria inválido. Use '/' para subníveis. Não pode começar/terminar com '/' nem ter '//'.", 'error', feedbackAreaLocal);
            return;
        }

        try {
            const categoriasExistentes = await dbRef.getAllItems(DOCUMENT_CATEGORIES_STORE_NAME);
            if (categoriasExistentes.some(cat => cat.name.toLowerCase() === novoNomeNormalizado.toLowerCase() && cat.id !== categoriaId)) {
                if (globalShowFeedbackRef) globalShowFeedbackRef(`A categoria "${formatCategoryNameForDisplay(novoNomeNormalizado)}" já existe.`, 'error', feedbackAreaLocal);
                return;
            }

            const categoriaParaAtualizar = await dbRef.getItemById(DOCUMENT_CATEGORIES_STORE_NAME, categoriaId);
            if (!categoriaParaAtualizar) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("Categoria não encontrada para atualização.", 'error', feedbackAreaLocal);
                await carregarERenderizarCategorias(listaCategoriasEl, feedbackAreaLocal);
                return;
            }

            const nomeAntigo = categoriaParaAtualizar.name;
            categoriaParaAtualizar.name = novoNomeNormalizado;
            await dbRef.updateItem(DOCUMENT_CATEGORIES_STORE_NAME, categoriaParaAtualizar);

            const documentosAfetados = await dbRef.getAllItems(DOCUMENTS_STORE_NAME); 
            for (const doc of documentosAfetados) {
                if (doc.categories && Array.isArray(doc.categories)) {
                    const index = doc.categories.indexOf(nomeAntigo);
                    if (index !== -1) {
                        doc.categories[index] = novoNomeNormalizado;
                        doc.modificationDate = new Date().toISOString();
                        await dbRef.updateItem(DOCUMENTS_STORE_NAME, doc);
                    }
                }
            }

            if (globalShowFeedbackRef) globalShowFeedbackRef(`Categoria "${formatCategoryNameForDisplay(novoNomeNormalizado)}" atualizada. Documentos associados também foram atualizados.`, 'success', feedbackAreaLocal);
            await carregarERenderizarCategorias(listaCategoriasEl, feedbackAreaLocal);
            if (refreshApplicationStateRef) await refreshApplicationStateRef();
        } catch (error) {
            console.error("DocumentosCategorias.JS: Erro ao salvar edição da categoria:", error);
            if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao salvar edição: ${error.message}`, 'error', feedbackAreaLocal);
            cancelarEdicaoCategoria(liElement, feedbackAreaLocal, listaCategoriasEl); 
        }
    }
    
    /**
     * Cancela o modo de edição para uma categoria.
     * @param {HTMLElement} liElement - O elemento <li> da categoria.
     * @param {HTMLElement} feedbackAreaLocal - O elemento para exibir feedback.
     * @param {HTMLElement} listaCategoriasEl - O elemento UL da lista de categorias.
     */
    function cancelarEdicaoCategoria(liElement, feedbackAreaLocal, listaCategoriasEl) {
        carregarERenderizarCategorias(listaCategoriasEl, feedbackAreaLocal); // Simplesmente recarrega a lista para reverter
    }

    /**
     * Renderiza a página de gerenciamento de categorias de documento.
     */
    async function renderGerenciarCategoriasPage() {
        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (!mainContentWrapperRef) {
            console.error("DocumentosCategorias.JS: renderGerenciarCategoriasPage - mainContentWrapperRef não definido.");
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico ao renderizar a página de gerenciamento de categorias.", "error");
            return;
        }
        if (SEFWorkStation.App && typeof SEFWorkStation.App.setCurrentViewTarget === 'function') {
            SEFWorkStation.App.setCurrentViewTarget('categorias');
        }

        const feedbackAreaId = "feedback-gerenciar-categorias";
        mainContentWrapperRef.innerHTML = `
            <div id="gerenciar-categorias-container"> 
                <h2 class="text-xl font-semibold mb-4">Gerir Categorias de Documento</h2>
                <div id="${feedbackAreaId}" class="mb-4"></div>

                <div class="form-section mb-6 p-4 border dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800">
                    <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100">Adicionar Nova Categoria</h3>
                    <div class="flex items-center gap-2">
                        <input type="text" id="input-nova-categoria-nome" class="form-input-text flex-grow text-sm" placeholder="Nome da categoria (ex: Fiscal / ICMS / ST)">
                        <button id="btn-adicionar-nova-categoria" class="btn-primary btn-sm text-sm py-1.5 px-3">Adicionar Categoria</button>
                    </div>
                     <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Use "/" para criar subníveis (ex: Nível 1 / Nível 2).</p>
                </div>

                <div class="section-box p-4 rounded-lg">
                    <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100">Categorias Existentes</h3>
                    <ul id="lista-categorias-documento" class="space-y-2">
                        <li class="text-sm text-gray-500 dark:text-gray-400">A carregar categorias...</li>
                    </ul>
                </div>
            </div>
        `;

        const listaCategoriasEl = document.getElementById('lista-categorias-documento');
        const inputNovaCategoriaNome = document.getElementById('input-nova-categoria-nome');
        const btnAdicionarNovaCategoria = document.getElementById('btn-adicionar-nova-categoria');
        const feedbackAreaLocal = document.getElementById(feedbackAreaId);

        btnAdicionarNovaCategoria.addEventListener('click', async () => {
            const nomeNovaCategoriaInput = inputNovaCategoriaNome.value;
            const nomeNovaCategoriaNormalizado = normalizeCategoryNameForStorage(nomeNovaCategoriaInput);

            if (!isValidCategoryName(nomeNovaCategoriaNormalizado)) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("Nome da categoria inválido. Use '/' para subníveis. Não pode começar/terminar com '/' nem ter '//'.", 'error', feedbackAreaLocal);
                inputNovaCategoriaNome.focus();
                return;
            }

            try {
                const categoriasExistentes = await dbRef.getAllItems(DOCUMENT_CATEGORIES_STORE_NAME);
                if (categoriasExistentes.some(cat => cat.name.toLowerCase() === nomeNovaCategoriaNormalizado.toLowerCase())) {
                    if (globalShowFeedbackRef) globalShowFeedbackRef(`A categoria "${formatCategoryNameForDisplay(nomeNovaCategoriaNormalizado)}" já existe.`, 'error', feedbackAreaLocal);
                    return;
                }

                await dbRef.addItem(DOCUMENT_CATEGORIES_STORE_NAME, { name: nomeNovaCategoriaNormalizado });
                if (globalShowFeedbackRef) globalShowFeedbackRef(`Categoria "${formatCategoryNameForDisplay(nomeNovaCategoriaNormalizado)}" adicionada com sucesso.`, 'success', feedbackAreaLocal);
                inputNovaCategoriaNome.value = '';
                await carregarERenderizarCategorias(listaCategoriasEl, feedbackAreaLocal);
                if (refreshApplicationStateRef) await refreshApplicationStateRef();
            } catch (error) {
                console.error("DocumentosCategorias.JS: Erro ao adicionar nova categoria:", error);
                if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao adicionar categoria: ${error.message}`, 'error', feedbackAreaLocal);
            }
        });

        await carregarERenderizarCategorias(listaCategoriasEl, feedbackAreaLocal);
    }

    // API pública do módulo
    return {
        init,
        renderGerenciarCategoriasPage,
        isValidCategoryName,
        formatCategoryNameForDisplay,
        normalizeCategoryNameForStorage
    };
})();