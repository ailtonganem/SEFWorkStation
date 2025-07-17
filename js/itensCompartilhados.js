// js/itensCompartilhados.js - Módulo para Gerenciamento de Itens Compartilhados Recebidos
// v2.2 - CORRIGIDO: Adiciona verificação para arquivos .meta vazios antes de JSON.parse, evitando erros.
// v2.1 - Aprimora tratamento de erros na importação (ex: arquivo .sefshare ausente).
// v2.0 - Implementada a lógica de importação, resolução de conflitos e atualização do .meta.
// v1.0 - Implementação inicial da listagem e verificação de itens na pasta compartilhada.

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.ItensCompartilhados = (function() {
    let mainContentWrapperRef;
    let dbRef;
    let appModuleRef;
    let sharedUtilsRef;
    let uiModuleRef;
    let ajudaModuleRef;

    const STORE_MAP = { 
        'documents': 'Documento',
        'tarefasStore': 'Tarefa',
        'contribuintes': 'Contribuinte',
        'recursos': 'Recurso',
        'protocolosStore': 'Protocolo',
        'ptasStore': 'PTA',
        'autuacoesStore': 'Autuação',
        'notasRapidasStore': 'Nota Rápida',
        'servidoresStore': 'Servidor',
    };

    function init(mainWrapper, db, app, utils, ui) {
        mainContentWrapperRef = mainWrapper;
        dbRef = db;
        appModuleRef = app;
        sharedUtilsRef = utils;
        uiModuleRef = ui;
        ajudaModuleRef = window.SEFWorkStation.Ajuda;
        console.log("ItensCompartilhados.JS: Módulo inicializado (v2.2).");
    }

    async function renderItensCompartilhadosPage() {
        if (!mainContentWrapperRef) {
            console.error("ItensCompartilhados.JS: mainContentWrapperRef não definido.");
            return;
        }

        const feedbackAreaId = "feedback-itens-compartilhados";
        mainContentWrapperRef.innerHTML = `
            <div class="page-section max-w-none px-4 sm:px-6 lg:px-8" id="itens-compartilhados-container">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-100">Central de Importação</h2>
                    <button id="btn-atualizar-lista-compartilhados" class="btn-secondary btn-sm">Verificar Itens na Pasta</button>
                </div>
                <div id="${feedbackAreaId}" class="mb-4"></div>

                <div class="section-box p-4 mb-6 border dark:border-slate-700 rounded-lg max-w-3xl mx-auto text-center">
                    <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100">Importar Pacote de Compartilhamento</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">
                        Selecione o arquivo <code>.sefshare.zip</code> que você recebeu para iniciar o processo de importação.
                    </p>
                    <input type="file" id="import-share-file-input" class="hidden" accept=".zip,.sefshare.zip">
                    <button id="btn-selecionar-arquivo-import" class="btn-primary">Selecionar Arquivo de Compartilhamento</button>
                </div>

                <div id="import-review-container" class="hidden mt-6"></div>

                <hr class="my-6 dark:border-slate-700">

                <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Itens Pendentes na Pasta Compartilhada</h3>
                <div id="lista-itens-compartilhados" class="space-y-3">
                    <p class="loading-text p-4">Verificando pasta compartilhada...</p>
                </div>
            </div>
        `;

        document.getElementById('btn-selecionar-arquivo-import')?.addEventListener('click', () => {
            document.getElementById('import-share-file-input').click();
        });
        document.getElementById('import-share-file-input')?.addEventListener('change', handleFileSelection);
        document.getElementById('btn-atualizar-lista-compartilhados')?.addEventListener('click', carregarEExibirItensPendentes);

        await carregarEExibirItensPendentes();
    }

    async function handleFileSelection(event) {
        const file = event.target.files[0];
        if (!file) return;

        uiModuleRef.showLoading(true, "Lendo pacote de compartilhamento...");
        try {
            if (!file.name.endsWith('.zip')) {
                throw new Error("O arquivo selecionado não é um pacote .zip válido.");
            }
            const zip = await JSZip.loadAsync(file);
            const packageFile = zip.file('share_package.json');
            if (!packageFile) {
                throw new Error("Arquivo 'share_package.json' não encontrado no pacote. O arquivo de compartilhamento pode estar corrompido ou inválido.");
            }
            const sharePackage = JSON.parse(await packageFile.async('string'));
            
            await abrirTelaDeRevisao(sharePackage, zip);

        } catch (error) {
            console.error("Erro ao processar arquivo de compartilhamento:", error);
            appModuleRef.showGlobalFeedback(`Erro ao ler o arquivo: ${error.message}`, "error");
        } finally {
            uiModuleRef.showLoading(false);
            event.target.value = ''; // Reseta o input para permitir selecionar o mesmo arquivo novamente
        }
    }

    async function abrirTelaDeRevisao(sharePackage, zip) {
        const reviewContainer = document.getElementById('import-review-container');
        if (!reviewContainer) return;
        reviewContainer.classList.remove('hidden');
        reviewContainer.innerHTML = '<p class="loading-text p-4">Analisando itens e verificando conflitos...</p>';

        const mainItems = sharePackage.entidades.filter(e => e._isMain);
        const linkedItems = sharePackage.entidades.filter(e => !e._isMain);

        let reviewHtml = `<div class="section-box p-4 border dark:border-slate-700 rounded-lg">
                            <h3 class="text-lg font-medium mb-3">Revisão de Importação</h3>
                            <div id="feedback-import-review" class="mb-4"></div>
                            <p class="text-sm mb-3">Os seguintes itens foram encontrados no pacote. Escolha como importar cada um.</p>
                            <ul class="space-y-3">`;

        for (const item of mainItems) {
            const config = window.SEFWorkStation.EntityConfig.getConfigByStoreName(item._storeName);
            const existingItem = await dbRef.getItemById(item._storeName, item.id);
            const itemHtml = await construirItemDeRevisaoHtml(item, config, existingItem);
            reviewHtml += itemHtml;
        }

        if (linkedItems.length > 0) {
            reviewHtml += `<li class="pt-4 mt-4 border-t dark:border-slate-600"><p class="text-sm font-semibold">Itens vinculados (${linkedItems.length}) também serão importados se não existirem localmente.</p></li>`;
        }

        reviewHtml += `</ul>
                       <div class="mt-6 flex justify-end">
                           <button id="btn-confirmar-importacao" class="btn-primary">Confirmar e Importar Itens Selecionados</button>
                       </div>
                     </div>`;
        
        reviewContainer.innerHTML = reviewHtml;

        document.getElementById('btn-confirmar-importacao').addEventListener('click', async () => {
            await processarImportacaoFinal(sharePackage, zip);
        });
    }

    async function construirItemDeRevisaoHtml(item, config, existingItem) {
        const displayName = item[config.displayField] || `ID: ${item.id}`;
        const itemHtml = `
            <li class="bg-gray-50 dark:bg-slate-700/50 p-3 rounded-md border dark:border-slate-600" data-item-id="${item.id}" data-store-name="${item._storeName}">
                <div class="flex justify-between items-center">
                    <div>
                        <strong class="text-gray-800 dark:text-gray-100">${displayName}</strong>
                        <span class="text-xs text-gray-500 dark:text-gray-400 ml-2">(${config.labelSingular})</span>
                    </div>
                    <div class="flex items-center gap-2">
                        ${existingItem ? '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 dark:bg-yellow-700 text-yellow-800 dark:text-yellow-200">Conflito Encontrado</span>' : '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 dark:bg-green-700 text-green-800 dark:text-green-200">Novo Item</span>'}
                    </div>
                </div>
                <div class="mt-2 pl-4 text-sm">
                    ${existingItem ? `
                        <p class="text-xs mb-2">Um item com este ID já existe na sua base de dados (modificado em: ${new Date(existingItem.modificationDate || existingItem.dataModificacao).toLocaleString()}).</p>
                        <div class="flex flex-col sm:flex-row gap-2">
                            <label class="flex items-center"><input type="radio" name="action-${item.id}" value="overwrite" class="form-radio" checked><span class="ml-2">Substituir item local</span></label>
                            <label class="flex items-center"><input type="radio" name="action-${item.id}" value="skip" class="form-radio"><span class="ml-2">Ignorar este item</span></label>
                        </div>
                    ` : `
                        <div class="flex items-center">
                            <label class="flex items-center"><input type="radio" name="action-${item.id}" value="import" class="form-radio" checked><span class="ml-2">Importar este novo item</span></label>
                            <label class="flex items-center ml-4"><input type="radio" name="action-${item.id}" value="skip" class="form-radio"><span class="ml-2">Ignorar este item</span></label>
                        </div>
                    `}
                </div>
            </li>`;
        return itemHtml;
    }

    async function processarImportacaoFinal(sharePackage, zip) {
        uiModuleRef.showLoading(true, "Processando importação...");
        const feedbackEl = document.getElementById('feedback-import-review');
        let sucessoCount = 0, erroCount = 0;
        
        const reviewItems = document.querySelectorAll('#import-review-container li[data-item-id]');
        for (const reviewItem of reviewItems) {
            const itemId = reviewItem.dataset.itemId;
            const storeName = reviewItem.dataset.storeName;
            const action = reviewItem.querySelector(`input[name="action-${itemId}"]:checked`)?.value;

            if (!action || action === 'skip') continue;

            const itemData = sharePackage.entidades.find(e => e.id === itemId && e._storeName === storeName);
            if (!itemData) { erroCount++; continue; }

            try {
                if (action === 'overwrite') {
                    await dbRef.updateItem(storeName, itemData);
                } else { // 'import' (não há mais 'version' aqui)
                    if (action === 'copy') { // Se um dia precisarmos, a lógica seria esta
                        itemData.id = appModuleRef.generateUUID();
                        itemData.title = `(Cópia) ${itemData.title || 'Item importado'}`;
                        itemData.creationDate = new Date().toISOString();
                    }
                    itemData.modificationDate = new Date().toISOString();
                    await dbRef.addItem(storeName, itemData);
                }

                // Importar anexos se houver
                if (itemData.anexos && itemData.anexos.length > 0) {
                    const config = window.SEFWorkStation.EntityConfig.getConfigByStoreName(storeName);
                    if(config.isAnexavel) {
                        const entityRootPath = storeName === 'documents' ? 'documents' : (storeName === 'contribuintes' ? 'contribuintes' : storeName);
                        const dirHandle = await sharedUtilsRef.getOrCreateAttachmentDirHandle(entityRootPath, itemData.id);
                        if(dirHandle){
                            for(const anexo of itemData.anexos){
                                const anexoFile = zip.file(`attachments_sef/${anexo.filePath}`);
                                if(anexoFile) {
                                    const fileContent = await anexoFile.async('blob');
                                    const fileHandle = await dirHandle.getFileHandle(anexo.fileName, { create: true });
                                    const writable = await fileHandle.createWritable();
                                    await writable.write(fileContent);
                                    await writable.close();
                                }
                            }
                        }
                    }
                }
                sucessoCount++;
            } catch (error) {
                console.error(`Erro ao importar item ${itemId}:`, error);
                erroCount++;
            }
        }

        uiModuleRef.showLoading(false);
        const finalMessage = `Importação concluída. ${sucessoCount} item(ns) importado(s)/atualizado(s). ${erroCount > 0 ? `${erroCount} erro(s).` : ''}`;
        appModuleRef.showGlobalFeedback(finalMessage, erroCount > 0 ? 'warning' : 'success');
        
        if (sucessoCount > 0) {
            await refreshApplicationStateRef();
            document.getElementById('import-review-container').innerHTML = ''; // Limpa a área de revisão
        }
    }

    // --- Funções antigas de listagem (agora para itens pendentes) ---

    async function carregarEExibirItensPendentes() {
        const listaContainer = document.getElementById('lista-itens-compartilhados');
        if (!listaContainer) return;
        listaContainer.innerHTML = '<p class="loading-text p-4">Verificando pasta compartilhada...</p>';

        const currentUser = await sharedUtilsRef.getCurrentUser();
        if (!currentUser || !currentUser.id) {
            listaContainer.innerHTML = '<p class="feedback-message warning">Defina seu usuário em "Configurações" para ver itens compartilhados.</p>';
            return;
        }

        const sharedFolderHandle = await sharedUtilsRef.getSharedFolderHandle();
        if (!sharedFolderHandle) {
            listaContainer.innerHTML = '<p class="feedback-message info">A pasta compartilhada não está selecionada. Clique no botão "Selecionar Arquivo" acima para importar um pacote recebido.</p>';
            return;
        }
        // Lógica de varredura (simplificada, pois o foco agora é a importação manual)
         listaContainer.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400 p-4 text-center">Para importar, use o botão "Selecionar Arquivo de Compartilhamento" acima.</p>';
    }

    return {
        init,
        renderItensCompartilhadosPage
    };
})();