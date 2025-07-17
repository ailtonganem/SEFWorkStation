// js/documentosTags.js - Lógica para Gerir Tags de Documento (CRUD Completo)
// v2.3.0 - Remove classe page-section para expandir a largura da visualização.
// v2.2 - Adiciona funcionalidade de Edição de Tags e atualização em documentos.
// v2.1 - Exporta isValidTagName para uso externo.
// v2.0 - Adicionada funcionalidade de Edição de Tags

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.DocumentosTags = (function() {
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let refreshApplicationStateRef;
    let dbRef;
    const DOCUMENT_TAGS_STORE_NAME = 'documentTags';
    const DOCUMENTS_STORE_NAME = 'documents'; // Para atualizar documentos

    /**
     * Inicializa o módulo de Tags de Documento.
     */
    function init(mainWrapper, showFeedbackFunc, clearFeedbackFunc, refreshFunc, dbModuleRef) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedbackFunc;
        globalClearFeedbackRef = clearFeedbackFunc;
        refreshApplicationStateRef = refreshFunc;
        dbRef = dbModuleRef;

        if (!dbRef) console.error("DocumentosTags.JS: init - Referência ao DB não fornecida!");
        console.log("DocumentosTags.JS: Módulo inicializado (v2.3.0).");
    }

    /**
     * Valida o nome da tag.
     * @param {string} tagName - O nome da tag a ser validado.
     * @returns {boolean} - True se o nome for válido, false caso contrário.
     */
    function isValidTagName(tagName) {
        if (!tagName || tagName.trim() === '') {
            return false;
        }
        if (tagName.includes('/')) { // Tags não devem ser hierárquicas como categorias
            return false;
        }
        // Adicionar outras validações se necessário (ex: caracteres especiais, comprimento)
        return true;
    }

    /**
     * Carrega e renderiza a lista de tags de documento.
     */
    async function carregarERenderizarTags(listaTagsEl, feedbackAreaLocal) {
        if (!listaTagsEl) return;
        listaTagsEl.innerHTML = '<li class="text-sm text-gray-500 dark:text-gray-400">A carregar tags...</li>';
        try {
            const tags = await dbRef.getAllItems(DOCUMENT_TAGS_STORE_NAME);
            tags.sort((a, b) => a.name.localeCompare(b.name)); // Ordena alfabeticamente

            if (tags.length === 0) {
                listaTagsEl.innerHTML = '<li class="text-sm text-gray-500 dark:text-gray-400">Nenhuma tag de documento registada.</li>';
                return;
            }

            listaTagsEl.innerHTML = ''; 
            tags.forEach(tag => {
                const li = document.createElement('li');
                li.className = 'flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-700 rounded-md shadow-sm';
                li.dataset.tagId = tag.id; 

                const nomeSpan = document.createElement('span');
                nomeSpan.className = 'text-sm text-gray-700 dark:text-gray-200 tag-nome-display';
                nomeSpan.textContent = tag.name;
                li.appendChild(nomeSpan);

                const editContainer = document.createElement('div');
                editContainer.className = 'edit-tag-container hidden flex items-center gap-2';
                li.appendChild(editContainer);

                const buttonsDiv = document.createElement('div');
                buttonsDiv.className = 'tag-actions-display';

                const btnEditar = document.createElement('button');
                btnEditar.className = 'btn-secondary btn-sm text-xs py-1 px-2 mr-2 btn-editar-tag';
                btnEditar.textContent = 'Editar';
                btnEditar.title = `Editar tag "${tag.name}"`;
                btnEditar.addEventListener('click', () => habilitarEdicaoTag(tag.id, tag.name, li, feedbackAreaLocal, listaTagsEl));
                buttonsDiv.appendChild(btnEditar);

                const btnExcluir = document.createElement('button');
                btnExcluir.className = 'btn-delete btn-sm text-xs py-1 px-2 btn-excluir-tag';
                btnExcluir.textContent = 'Excluir';
                btnExcluir.title = `Excluir tag "${tag.name}"`;
                btnExcluir.addEventListener('click', async () => {
                    if (confirm(`Tem certeza que deseja excluir a tag "${tag.name}"? Esta ação não pode ser desfeita e a tag será removida de todos os documentos associados.`)) {
                        try {
                            // Remover a tag de todos os documentos que a utilizam
                            const documentosAfetados = await dbRef.getAllItems(DOCUMENTS_STORE_NAME);
                            for (const doc of documentosAfetados) {
                                if (doc.tags && doc.tags.includes(tag.name)) {
                                    doc.tags = doc.tags.filter(t => t !== tag.name);
                                    doc.modificationDate = new Date().toISOString();
                                    await dbRef.updateItem(DOCUMENTS_STORE_NAME, doc);
                                }
                            }
                            await dbRef.deleteItem(DOCUMENT_TAGS_STORE_NAME, tag.id);
                            if (globalShowFeedbackRef) globalShowFeedbackRef(`Tag "${tag.name}" excluída e removida dos documentos.`, 'success', feedbackAreaLocal);
                            await carregarERenderizarTags(listaTagsEl, feedbackAreaLocal); 
                            if (refreshApplicationStateRef) await refreshApplicationStateRef(); 
                        } catch (error) {
                            console.error("DocumentosTags.JS: Erro ao excluir tag:", error);
                            if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao excluir tag: ${error.message}`, 'error', feedbackAreaLocal);
                        }
                    }
                });
                buttonsDiv.appendChild(btnExcluir);
                li.appendChild(buttonsDiv);
                listaTagsEl.appendChild(li);
            });
        } catch (error) {
            console.error("DocumentosTags.JS: Erro ao carregar tags:", error);
            listaTagsEl.innerHTML = '<li class="text-sm text-red-500 dark:text-red-400">Erro ao carregar tags.</li>';
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro ao carregar tags.", 'error', feedbackAreaLocal);
        }
    }
    
    /**
     * Habilita a edição para uma tag específica.
     */
    function habilitarEdicaoTag(tagId, nomeAtual, liElement, feedbackAreaLocal, listaTagsEl) {
        const nomeSpan = liElement.querySelector('.tag-nome-display');
        const actionsDiv = liElement.querySelector('.tag-actions-display');
        const editContainer = liElement.querySelector('.edit-tag-container');

        nomeSpan.classList.add('hidden');
        actionsDiv.classList.add('hidden');
        editContainer.classList.remove('hidden');
        editContainer.innerHTML = ''; 

        const inputNome = document.createElement('input');
        inputNome.type = 'text';
        inputNome.value = nomeAtual;
        inputNome.className = 'form-input-text text-sm py-1 px-2 flex-grow';
        inputNome.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                salvarEdicaoTag(tagId, inputNome.value.trim(), liElement, feedbackAreaLocal, listaTagsEl);
            }
        });
        editContainer.appendChild(inputNome);

        const btnSalvar = document.createElement('button');
        btnSalvar.textContent = 'Salvar';
        btnSalvar.className = 'btn-primary btn-sm text-xs py-1 px-2';
        btnSalvar.addEventListener('click', () => salvarEdicaoTag(tagId, inputNome.value.trim(), liElement, feedbackAreaLocal, listaTagsEl));
        editContainer.appendChild(btnSalvar);

        const btnCancelar = document.createElement('button');
        btnCancelar.textContent = 'Cancelar';
        btnCancelar.className = 'btn-secondary btn-sm text-xs py-1 px-2';
        btnCancelar.addEventListener('click', () => cancelarEdicaoTag(liElement, feedbackAreaLocal, listaTagsEl));
        editContainer.appendChild(btnCancelar);

        inputNome.focus();
        inputNome.select();
    }

    /**
     * Salva o nome editado de uma tag.
     */
    async function salvarEdicaoTag(tagId, novoNome, liElement, feedbackAreaLocal, listaTagsEl) {
        if (!isValidTagName(novoNome)) {
            if (globalShowFeedbackRef) globalShowFeedbackRef("Nome da tag inválido ou vazio. Não pode conter '/'.", 'error', feedbackAreaLocal);
            return;
        }

        try {
            const tagsExistentes = await dbRef.getAllItems(DOCUMENT_TAGS_STORE_NAME);
            if (tagsExistentes.some(t => t.name.toLowerCase() === novoNome.toLowerCase() && t.id !== tagId)) {
                if (globalShowFeedbackRef) globalShowFeedbackRef(`A tag "${novoNome}" já existe.`, 'error', feedbackAreaLocal);
                return;
            }

            const tagParaAtualizar = await dbRef.getItemById(DOCUMENT_TAGS_STORE_NAME, tagId);
            if (!tagParaAtualizar) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("Tag não encontrada para atualização.", 'error', feedbackAreaLocal);
                await carregarERenderizarTags(listaTagsEl, feedbackAreaLocal);
                return;
            }

            const nomeAntigo = tagParaAtualizar.name;
            tagParaAtualizar.name = novoNome;
            await dbRef.updateItem(DOCUMENT_TAGS_STORE_NAME, tagParaAtualizar);

            // Atualizar documentos que usavam o nome antigo da tag
            const documentosAfetados = await dbRef.getAllItems(DOCUMENTS_STORE_NAME);
            for (const doc of documentosAfetados) {
                if (doc.tags && Array.isArray(doc.tags)) {
                    const index = doc.tags.indexOf(nomeAntigo);
                    if (index !== -1) {
                        doc.tags[index] = novoNome;
                        doc.modificationDate = new Date().toISOString();
                        await dbRef.updateItem(DOCUMENTS_STORE_NAME, doc);
                    }
                }
            }

            if (globalShowFeedbackRef) globalShowFeedbackRef(`Tag "${novoNome}" atualizada com sucesso. Documentos associados também foram atualizados.`, 'success', feedbackAreaLocal);
            await carregarERenderizarTags(listaTagsEl, feedbackAreaLocal);
            if (refreshApplicationStateRef) await refreshApplicationStateRef();
        } catch (error) {
            console.error("DocumentosTags.JS: Erro ao salvar edição da tag:", error);
            if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao salvar edição: ${error.message}`, 'error', feedbackAreaLocal);
            cancelarEdicaoTag(liElement, feedbackAreaLocal, listaTagsEl);
        }
    }
    
    /**
     * Cancela o modo de edição para uma tag.
     */
    function cancelarEdicaoTag(liElement, feedbackAreaLocal, listaTagsEl) {
        carregarERenderizarTags(listaTagsEl, feedbackAreaLocal);
    }

    /**
     * Renderiza a página de gerenciamento de tags de documento.
     */
    async function renderGerenciarTagsPage() {
        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (!mainContentWrapperRef) {
            console.error("DocumentosTags.JS: renderGerenciarTagsPage - mainContentWrapperRef não definido.");
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico ao renderizar a página de gerenciamento de tags.", "error");
            return;
        }
        if (SEFWorkStation.App && typeof SEFWorkStation.App.setCurrentViewTarget === 'function') {
            SEFWorkStation.App.setCurrentViewTarget('tags');
        }

        const feedbackAreaId = "feedback-gerenciar-tags";
        mainContentWrapperRef.innerHTML = `
            <div id="gerenciar-tags-container"> 
                <h2 class="text-xl font-semibold mb-4">Gerir Tags de Documento</h2>
                <div id="${feedbackAreaId}" class="mb-4"></div>

                <div class="form-section mb-6 p-4 border dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800">
                    <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100">Adicionar Nova Tag</h3>
                    <div class="flex items-center gap-2">
                        <input type="text" id="input-nova-tag-nome" class="form-input-text flex-grow text-sm" placeholder="Nome da nova tag">
                        <button id="btn-adicionar-nova-tag" class="btn-primary btn-sm text-sm py-1.5 px-3">Adicionar Tag</button>
                    </div>
                </div>

                <div class="section-box p-4 rounded-lg">
                    <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100">Tags Existentes</h3>
                    <ul id="lista-tags-documento" class="space-y-2">
                        <li class="text-sm text-gray-500 dark:text-gray-400">A carregar tags...</li>
                    </ul>
                </div>
            </div>
        `;

        const listaTagsEl = document.getElementById('lista-tags-documento');
        const inputNovaTagNome = document.getElementById('input-nova-tag-nome');
        const btnAdicionarNovaTag = document.getElementById('btn-adicionar-nova-tag');
        const feedbackAreaLocal = document.getElementById(feedbackAreaId);

        btnAdicionarNovaTag.addEventListener('click', async () => {
            const nomeNovaTag = inputNovaTagNome.value.trim();
            if (!isValidTagName(nomeNovaTag)) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("Nome da tag inválido ou vazio. Não pode conter '/'.", 'error', feedbackAreaLocal);
                inputNovaTagNome.focus();
                return;
            }

            try {
                const tagsExistentes = await dbRef.getAllItems(DOCUMENT_TAGS_STORE_NAME);
                if (tagsExistentes.some(t => t.name.toLowerCase() === nomeNovaTag.toLowerCase())) {
                    if (globalShowFeedbackRef) globalShowFeedbackRef(`A tag "${nomeNovaTag}" já existe.`, 'error', feedbackAreaLocal);
                    return;
                }

                await dbRef.addItem(DOCUMENT_TAGS_STORE_NAME, { name: nomeNovaTag });
                if (globalShowFeedbackRef) globalShowFeedbackRef(`Tag "${nomeNovaTag}" adicionada com sucesso.`, 'success', feedbackAreaLocal);
                inputNovaTagNome.value = '';
                await carregarERenderizarTags(listaTagsEl, feedbackAreaLocal);
                if (refreshApplicationStateRef) await refreshApplicationStateRef();
            } catch (error) {
                console.error("DocumentosTags.JS: Erro ao adicionar nova tag:", error);
                if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao adicionar tag: ${error.message}`, 'error', feedbackAreaLocal);
            }
        });

        await carregarERenderizarTags(listaTagsEl, feedbackAreaLocal);
    }

    // API pública do módulo
    return {
        init,
        renderGerenciarTagsPage,
        isValidTagName 
    };
})();