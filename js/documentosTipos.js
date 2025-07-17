// js/documentosTipos.js
// v2.5 - Remove classe page-section para expandir a largura da visualização.
// v2.4 - Corrige exportação das funções formatTypeNameForDisplay e normalizeTypeNameForStorage.
// v2.3 - Permite hierarquia em nomes de tipo (com '/').
// ... (histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.DocumentosTipos = (function() {
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let refreshApplicationStateRef;
    let dbRef;
    let appModuleRef; 
    const DOCUMENT_TYPES_STORE_NAME = 'documentTypes';
    const DOCUMENTS_STORE_NAME = 'documents'; 

    function init(mainWrapper, showFeedbackFunc, clearFeedbackFunc, refreshFunc, dbModuleRef, applicationModuleRef) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedbackFunc;
        globalClearFeedbackRef = clearFeedbackFunc;
        refreshApplicationStateRef = refreshFunc;
        dbRef = dbModuleRef;
        appModuleRef = applicationModuleRef; 

        if (!dbRef) console.error("DocumentosTipos.JS: init - Referência ao DB não fornecida!");
        if (!appModuleRef) console.error("DocumentosTipos.JS: init - Referência ao App Module não fornecida!");
        console.log("DocumentosTipos.JS: Módulo inicializado (v2.5).");
    }

    function isValidTypeName(name) {
        if (!name || typeof name !== 'string' || name.trim() === '') return false;
        const trimmedName = name.trim();
        if (trimmedName.startsWith('/') || trimmedName.endsWith('/') || trimmedName.includes('//')) return false;
        const pattern = /^[a-zA-Z0-9À-ú\s\-_/]+$/;
        return pattern.test(trimmedName) && trimmedName.length > 0 && trimmedName.length <= 100;
    }

    function formatTypeNameForDisplay(typeName) {
        if (!typeName) return '';
        return typeName.split('/').map(s => s.trim()).join(' › ');
    }

    function normalizeTypeNameForStorage(typeNameInput) {
        if (!typeNameInput) return '';
        return typeNameInput.split('/')
            .map(s => s.trim())
            .filter(s => s)
            .join('/');
    }
    
    async function carregarERenderizarTipos(listaTiposEl, feedbackAreaLocal) {
        if (!listaTiposEl) return;
        listaTiposEl.innerHTML = '<li class="text-sm text-gray-500 dark:text-gray-400">A carregar tipos...</li>';
        try {
            const tipos = await dbRef.getAllItems(DOCUMENT_TYPES_STORE_NAME);
            tipos.sort((a, b) => a.name.localeCompare(b.name));

            if (tipos.length === 0) {
                listaTiposEl.innerHTML = '<li class="text-sm text-gray-500 dark:text-gray-400">Nenhum tipo de documento registado.</li>';
                return;
            }

            listaTiposEl.innerHTML = ''; 
            tipos.forEach(tipo => {
                const li = document.createElement('li');
                li.className = 'flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-700 rounded-md shadow-sm';
                li.dataset.tipoId = tipo.id; 

                const nomeSpan = document.createElement('span');
                nomeSpan.className = 'text-sm text-gray-700 dark:text-gray-200 tipo-nome-display';
                nomeSpan.textContent = formatTypeNameForDisplay(tipo.name);
                li.appendChild(nomeSpan);
                
                const editContainer = document.createElement('div');
                editContainer.className = 'edit-tipo-container hidden flex items-center gap-2';
                li.appendChild(editContainer);

                const buttonsDiv = document.createElement('div');
                buttonsDiv.className = 'tipo-actions-display';

                const btnEditar = document.createElement('button');
                btnEditar.className = 'btn-secondary btn-sm text-xs py-1 px-2 mr-2 btn-editar-tipo';
                btnEditar.textContent = 'Editar';
                btnEditar.title = `Editar tipo "${formatTypeNameForDisplay(tipo.name)}"`;
                btnEditar.addEventListener('click', () => habilitarEdicaoTipo(tipo.id, tipo.name, li, feedbackAreaLocal, listaTiposEl));
                buttonsDiv.appendChild(btnEditar);

                const btnExcluir = document.createElement('button');
                btnExcluir.className = 'btn-delete btn-sm text-xs py-1 px-2 btn-excluir-tipo';
                btnExcluir.textContent = 'Excluir';
                btnExcluir.title = `Excluir tipo "${formatTypeNameForDisplay(tipo.name)}"`;
                btnExcluir.addEventListener('click', async () => {
                    const nomeFormatado = formatTypeNameForDisplay(tipo.name);
                    if (confirm(`Tem certeza que deseja excluir o tipo "${nomeFormatado}"? Esta ação não pode ser desfeita e o tipo será removido de todos os documentos associados.`)) {
                        try {
                            const documentosComEsteTipo = await dbRef.getAllItems(DOCUMENTS_STORE_NAME);
                            const emUso = documentosComEsteTipo.some(doc => doc.docType === tipo.name);

                            if (emUso) {
                                if (globalShowFeedbackRef) globalShowFeedbackRef(`O tipo "${nomeFormatado}" está em uso e não pode ser excluído. Remova-o dos documentos primeiro.`, 'warning', feedbackAreaLocal, 5000);
                                return;
                            }

                            await dbRef.deleteItem(DOCUMENT_TYPES_STORE_NAME, tipo.id);
                            if (globalShowFeedbackRef) globalShowFeedbackRef(`Tipo "${nomeFormatado}" excluído com sucesso.`, 'success', feedbackAreaLocal);
                            await carregarERenderizarTipos(listaTiposEl, feedbackAreaLocal); 
                            if (refreshApplicationStateRef) await refreshApplicationStateRef(); 
                        } catch (error) {
                            console.error("DocumentosTipos.JS: Erro ao excluir tipo:", error);
                            if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao excluir tipo: ${error.message}`, 'error', feedbackAreaLocal);
                        }
                    }
                });
                buttonsDiv.appendChild(btnExcluir);
                li.appendChild(buttonsDiv);
                listaTiposEl.appendChild(li);
            });
        } catch (error) {
            console.error("DocumentosTipos.JS: Erro ao carregar tipos:", error);
            listaTiposEl.innerHTML = '<li class="text-sm text-red-500 dark:text-red-400">Erro ao carregar tipos.</li>';
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro ao carregar tipos.", 'error', feedbackAreaLocal);
        }
    }
        
    function habilitarEdicaoTipo(tipoId, nomeAtualStorage, liElement, feedbackAreaLocal, listaTiposEl) {
        const nomeSpan = liElement.querySelector('.tipo-nome-display');
        const actionsDiv = liElement.querySelector('.tipo-actions-display');
        const editContainer = liElement.querySelector('.edit-tipo-container');

        nomeSpan.classList.add('hidden');
        actionsDiv.classList.add('hidden');
        editContainer.classList.remove('hidden');
        editContainer.innerHTML = ''; 

        const inputNome = document.createElement('input');
        inputNome.type = 'text';
        inputNome.value = nomeAtualStorage; 
        inputNome.className = 'form-input-text text-sm py-1 px-2 flex-grow';
        inputNome.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                salvarEdicaoTipo(tipoId, nomeAtualStorage, inputNome.value, liElement, feedbackAreaLocal, listaTiposEl);
            }
        });
        editContainer.appendChild(inputNome);

        const btnSalvar = document.createElement('button');
        btnSalvar.textContent = 'Salvar';
        btnSalvar.className = 'btn-primary btn-sm text-xs py-1 px-2';
        btnSalvar.addEventListener('click', () => salvarEdicaoTipo(tipoId, nomeAtualStorage, inputNome.value, liElement, feedbackAreaLocal, listaTiposEl));
        editContainer.appendChild(btnSalvar);

        const btnCancelar = document.createElement('button');
        btnCancelar.textContent = 'Cancelar';
        btnCancelar.className = 'btn-secondary btn-sm text-xs py-1 px-2';
        btnCancelar.addEventListener('click', () => cancelarEdicaoTipo(liElement, feedbackAreaLocal, listaTiposEl));
        editContainer.appendChild(btnCancelar);

        inputNome.focus();
        inputNome.select();
    }

    async function salvarEdicaoTipo(tipoId, nomeAntigoStorage, novoNomeInput, liElement, feedbackAreaLocal, listaTiposEl) {
        const novoNomeNormalizado = normalizeTypeNameForStorage(novoNomeInput);

        if (!isValidTypeName(novoNomeNormalizado)) {
            if (globalShowFeedbackRef) globalShowFeedbackRef("Nome do tipo inválido. Use '/' para subníveis, sem iniciar/terminar com '/' ou ter '//'.", 'error', feedbackAreaLocal);
            return;
        }

        try {
            const tiposExistentes = await dbRef.getAllItems(DOCUMENT_TYPES_STORE_NAME);
            if (tiposExistentes.some(t => t.name.toLowerCase() === novoNomeNormalizado.toLowerCase() && t.id !== tipoId)) {
                if (globalShowFeedbackRef) globalShowFeedbackRef(`O tipo "${formatTypeNameForDisplay(novoNomeNormalizado)}" já existe.`, 'error', feedbackAreaLocal);
                return;
            }

            const tipoParaAtualizar = await dbRef.getItemById(DOCUMENT_TYPES_STORE_NAME, tipoId);
            if (!tipoParaAtualizar) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("Tipo não encontrado para atualização.", 'error', feedbackAreaLocal);
                await carregarERenderizarTipos(listaTiposEl, feedbackAreaLocal);
                return;
            }

            tipoParaAtualizar.name = novoNomeNormalizado;
            await dbRef.updateItem(DOCUMENT_TYPES_STORE_NAME, tipoParaAtualizar);

            if (nomeAntigoStorage !== novoNomeNormalizado) {
                const documentos = await dbRef.getAllItems(DOCUMENTS_STORE_NAME);
                for (const doc of documentos) {
                    if (doc.docType === nomeAntigoStorage) {
                        doc.docType = novoNomeNormalizado;
                        doc.modificationDate = new Date().toISOString();
                        await dbRef.updateItem(DOCUMENTS_STORE_NAME, doc);
                    }
                }
            }

            if (globalShowFeedbackRef) globalShowFeedbackRef(`Tipo "${formatTypeNameForDisplay(novoNomeNormalizado)}" atualizado. Documentos associados também foram atualizados.`, 'success', feedbackAreaLocal);
            await carregarERenderizarTipos(listaTiposEl, feedbackAreaLocal);
            if (refreshApplicationStateRef) await refreshApplicationStateRef();
        } catch (error) {
            console.error("DocumentosTipos.JS: Erro ao salvar edição do tipo:", error);
            if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao salvar edição: ${error.message}`, 'error', feedbackAreaLocal);
            cancelarEdicaoTipo(liElement, feedbackAreaLocal, listaTiposEl); 
        }
    }
        
    function cancelarEdicaoTipo(liElement, feedbackAreaLocal, listaTiposEl) {
        carregarERenderizarTipos(listaTiposEl, feedbackAreaLocal);
    }

    async function renderGerenciarTiposDocumentoPage() {
        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (!mainContentWrapperRef) {
            console.error("DocumentosTipos.JS: renderGerenciarTiposDocumentoPage - mainContentWrapperRef não definido.");
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico ao renderizar a página de gerenciamento de tipos.", "error");
            return;
        }
         if (appModuleRef && typeof appModuleRef.setCurrentViewTarget === 'function') {
            appModuleRef.setCurrentViewTarget('tipos');
        }

        const feedbackAreaId = "feedback-gerenciar-tipos";
        mainContentWrapperRef.innerHTML = `
            <div id="gerenciar-tipos-container">
                <h2 class="text-xl font-semibold mb-4">Gerir Tipos de Documento</h2>
                <div id="${feedbackAreaId}" class="mb-4"></div>

                <div class="form-section mb-6 p-4 border dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800">
                    <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100">Adicionar Novo Tipo</h3>
                    <div class="flex items-center gap-2">
                        <input type="text" id="input-novo-tipo-nome" class="form-input-text flex-grow text-sm" placeholder="Nome do tipo de documento">
                        <button id="btn-adicionar-novo-tipo" class="btn-primary btn-sm text-sm py-1.5 px-3">Adicionar Tipo</button>
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Use "/" para criar subníveis (ex: Nível 1 / Nível 2).</p>
                </div>

                <div class="section-box p-4 rounded-lg">
                    <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100">Tipos Existentes</h3>
                    <ul id="lista-tipos-documento" class="space-y-2">
                        <li class="text-sm text-gray-500 dark:text-gray-400">A carregar tipos...</li>
                    </ul>
                </div>
            </div>
        `;

        const listaTiposEl = document.getElementById('lista-tipos-documento');
        const inputNovaTipoNome = document.getElementById('input-novo-tipo-nome');
        const btnAdicionarNovoTipo = document.getElementById('btn-adicionar-novo-tipo');
        const feedbackAreaLocal = document.getElementById(feedbackAreaId);

        btnAdicionarNovoTipo.addEventListener('click', async () => {
            const nomeNovoTipoInput = inputNovaTipoNome.value;
            const nomeNovoTipoNormalizado = normalizeTypeNameForStorage(nomeNovoTipoInput);

            if (!isValidTypeName(nomeNovoTipoNormalizado)) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("Nome do tipo inválido. Use '/' para subníveis. Não pode começar/terminar com '/' nem ter '//'.", 'error', feedbackAreaLocal);
                inputNovaTipoNome.focus();
                return;
            }

            try {
                const tiposExistentes = await dbRef.getAllItems(DOCUMENT_TYPES_STORE_NAME);
                if (tiposExistentes.some(t => t.name.toLowerCase() === nomeNovoTipoNormalizado.toLowerCase())) {
                    if (globalShowFeedbackRef) globalShowFeedbackRef(`O tipo \"${formatTypeNameForDisplay(nomeNovoTipoNormalizado)}\" já existe.`, 'error', feedbackAreaLocal);
                    return;
                }
                
                const novoTipo = {
                    id: appModuleRef.generateUUID(), 
                    name: nomeNovoTipoNormalizado
                };

                await dbRef.addItem(DOCUMENT_TYPES_STORE_NAME, novoTipo);
                if (globalShowFeedbackRef) globalShowFeedbackRef(`Tipo \"${formatTypeNameForDisplay(nomeNovoTipoNormalizado)}\" adicionado com sucesso.`, 'success', feedbackAreaLocal);
                inputNovaTipoNome.value = '';
                await carregarERenderizarTipos(listaTiposEl, feedbackAreaLocal);
                if (refreshApplicationStateRef) await refreshApplicationStateRef(); 
            } catch (error) {
                console.error("DocumentosTipos.JS: Erro ao adicionar novo tipo:", error);
                if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao adicionar tipo: ${error.message}`, 'error', feedbackAreaLocal);
            }
        });

        await carregarERenderizarTipos(listaTiposEl, feedbackAreaLocal);
    }

    return {
        init,
        renderGerenciarTiposDocumentoPage,
        isValidTypeName,
        formatTypeNameForDisplay: formatTypeNameForDisplay,       // CORRIGIDO
        normalizeTypeNameForStorage: normalizeTypeNameForStorage // CORRIGIDO
    };
})();