// js/notasRapidasForm.js
// v2.28.1 - CORREÇÃO: Adiciona as funções de modal de seleção de entidades que estavam ausentes, corrigindo ReferenceError.
// v2.28.0 - REFATORADO: Utiliza EntityConfig.filterActiveItems para filtrar itens vinculáveis, corrigindo o bug de versionamento.
// v2.27.1 - CORREÇÃO: Garante que os metadados dos anexos sejam salvos/removidos da store central 'attachments'.
// v2.27.0 - Implementa sistema de versionamento com botão "Salvar como Nova Versão".
// ... (histórico anterior)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.NotasRapidasForm = (function() {
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let navigateAfterSaveOrCancelCallback;
    let navigateToAppViewCallback;
    let refreshApplicationStateRef;
    let dbRef;
    let appModuleRef;
    let uiModuleRef;
    let notasRapidasViewModuleRef;

    const NOTAS_RAPIDAS_STORE_NAME = 'notasRapidasStore';
    const DOCUMENTS_STORE_NAME = 'documents';
    const CONTRIBUINTES_STORE_NAME = 'contribuintes';
    const RECURSOS_STORE_NAME = 'recursos';
    const TAREFAS_STORE_NAME = 'tarefasStore';
    const PROTOCOLOS_STORE_NAME = 'protocolosStore';
    const PTAS_STORE_NAME = 'ptasStore';
    const AUTUACOES_STORE_NAME = 'autuacoesStore';
    const SERVIDORES_STORE_NAME = 'servidoresStore';

    let currentNotaId = null;
    let originalNotaData = null;
    let currentFilesToAttachNota = [];
    let existingAttachmentsNota = [];
    
    let currentRelatedDocIds = [];
    let currentRelatedContribIds = [];
    let currentRelatedRecursoIds = [];
    let currentRelatedTarefaIds = [];
    let currentRelatedProtocoloIds = [];
    let currentRelatedPTAIds = [];
    let currentRelatedAutuacaoIds = [];
    let currentRelatedServidorIds = [];

    let tempSelectedIdsModal = [];
    let currentOriginatingViewParaForm = 'gerir-notas-rapidas';

    const EDITOR_CONTEUDO_NOTA_ID_PAGINA = 'nota-conteudo-editor-pagina';
    const EDITOR_CONTEUDO_NOTA_ID_MODAL = 'nota-conteudo-editor-modal';

    const CORES_NOTAS_FORM_PREDEFINIDAS = [
        { nome: 'Amarelo Padrão', valor: '#FFFFE0' },
        { nome: 'Pêssego', valor: '#FFDAB9' },
        { nome: 'Azul Claro', valor: '#E0FFFF' },
        { nome: 'Verde Claro', valor: '#F0FFF0' },
        { nome: 'Rosa Claro', valor: '#FFF0F5' },
        { nome: 'Verde Menta', valor: '#D3FFD3'},
        { nome: 'Coral Claro', valor: '#FFD3D3'},
        { nome: 'Azul Aço Claro', valor: '#D3D3FF'}
    ];

    function init(
        mainWrapper, showFeedbackFunc, clearFeedbackFunc, navigateCb, refreshFunc,
        dbModuleRef, applicationModuleRef, uiRefModule, viewModule
    ) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedbackFunc;
        globalClearFeedbackRef = clearFeedbackFunc;
        navigateAfterSaveOrCancelCallback = navigateCb;
        
        if (applicationModuleRef && typeof applicationModuleRef.handleMenuAction === 'function') {
            navigateToAppViewCallback = applicationModuleRef.handleMenuAction;
        } else {
            console.error("NotasRapidasForm.JS: applicationModuleRef.handleMenuAction não é uma função!");
            navigateToAppViewCallback = () => { console.error("Função de navegação não definida em NotasRapidasForm!"); };
        }
        
        refreshApplicationStateRef = refreshFunc;
        dbRef = dbModuleRef;
        appModuleRef = applicationModuleRef;
        uiModuleRef = uiRefModule;
        notasRapidasViewModuleRef = viewModule;
        console.log("NotasRapidasForm.JS: Módulo inicializado (v2.28.1).");
    }

    function getEditorId(isModal) {
        return isModal ? EDITOR_CONTEUDO_NOTA_ID_MODAL : EDITOR_CONTEUDO_NOTA_ID_PAGINA;
    }

    const relatedEntityConfigNota = () => ({
        documentos: { label: 'Documentos', storeName: DOCUMENTS_STORE_NAME, singularName: 'Documento', pluralName: 'documentos', currentIds: () => currentRelatedDocIds, displayField: 'title', idPrefix: 'DOC-', targetLinkField: 'notasRapidasRelacionadasIds' },
        contribuintes: { label: 'Contribuintes', storeName: CONTRIBUINTES_STORE_NAME, singularName: 'Contribuinte', pluralName: 'contribuintes', currentIds: () => currentRelatedContribIds, displayField: 'nome', refField: 'cpfCnpj', targetLinkField: 'notasRapidasRelacionadasIds' },
        recursos: { label: 'Recursos', storeName: RECURSOS_STORE_NAME, singularName: 'Recurso', pluralName: 'recursos', currentIds: () => currentRelatedRecursoIds, displayField: 'titulo', refField: 'numeroIdentificacao', targetLinkField: 'notasRapidasRelacionadasIds' },
        servidores: { label: 'Servidores', storeName: SERVIDORES_STORE_NAME, singularName: 'Servidor', pluralName: 'servidores', currentIds: () => currentRelatedServidorIds, displayField: 'nome', refField: 'matricula', targetLinkField: 'notasRapidasVinculadasIds' },
        tarefas: { label: 'Tarefas', storeName: TAREFAS_STORE_NAME, singularName: 'Tarefa', pluralName: 'tarefas', currentIds: () => currentRelatedTarefaIds, displayField: 'titulo', refField: 'numeroIdentificacao', targetLinkField: 'notasRapidasRelacionadasIds' },
        protocolos: { label: 'Protocolos', storeName: PROTOCOLOS_STORE_NAME, singularName: 'Protocolo', pluralName: 'protocolos', currentIds: () => currentRelatedProtocoloIds, displayField: 'numeroProtocolo', refField: 'assuntoProtocolo', targetLinkField: 'notasRapidasVinculadasIds' },
        ptas: { label: 'PTAs', storeName: PTAS_STORE_NAME, singularName: 'PTA', pluralName: 'ptas', currentIds: () => currentRelatedPTAIds, displayField: 'numeroPTA', refField: 'assuntoPTA', targetLinkField: 'notasRapidasVinculadasIds' },
        autuacoes: { label: 'Autuações', storeName: AUTUACOES_STORE_NAME, singularName: 'Autuação', pluralName: 'autuacoes', currentIds: () => currentRelatedAutuacaoIds, displayField: 'numeroAutuacao', refField: 'assuntoAutuacao', targetLinkField: 'notasRapidasVinculadasIds' }
    });

    async function getFormHtml(notaData = null, originatingView = 'gerir-notas-rapidas', preSelectedLink = null, isModal = false) {
        const idSuffix = isModal ? '-modal' : '-pagina';
        const isEditing = notaData && notaData.id;
        const editorContainerId = getEditorId(isModal);

        let numeroIdentificacaoDisplay = '';
        if(isEditing && notaData && notaData.numeroIdentificacao) {
            numeroIdentificacaoDisplay = notaData.numeroIdentificacao;
        } else if (isEditing && notaData && !notaData.numeroIdentificacao) {
            numeroIdentificacaoDisplay = 'N/A (Antiga)';
        }

        let vinculosHtml = '';
        const entityConfig = relatedEntityConfigNota();
        for (const key in entityConfig) {
            const entity = entityConfig[key];
            vinculosHtml += `
                <div class="md:col-span-1">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">${entity.label}:</label>
                    <div id="lista-${entity.pluralName}-vinculados-nota${idSuffix}" class="form-vinculos-lista mt-1"></div>
                    <button type="button" id="btn-gerenciar-${entity.pluralName}-vinculados-nota${idSuffix}"
                            class="btn-secondary btn-xs mt-1" data-entity-type="${key}">Gerenciar Vínculos</button>
                </div>
            `;
        }

        const formHtml = `
            <form id="form-nota-rapida${idSuffix}" class="space-y-4">
                <input type="hidden" id="nota-id-hidden${idSuffix}" value="${isEditing ? notaData.id : ''}">
                <input type="hidden" id="nota-creation-date${idSuffix}" value="${(isEditing && notaData?.dataCriacao) ? notaData.dataCriacao : new Date().toISOString()}">
                <input type="hidden" id="nota-numero-identificacao-hidden${idSuffix}" value="${numeroIdentificacaoDisplay}">

                <div>
                    <label for="nota-titulo${idSuffix}" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Título (Opcional):</label>
                    <input type="text" id="nota-titulo${idSuffix}" name="titulo" class="form-input-text mt-1 block w-full" value="${notaData?.titulo?.replace(/"/g, '"') || ''}">
                </div>

                <div>
                    <label for="${editorContainerId}" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Conteúdo (Markdown suportado): <span class="text-red-500">*</span></label>
                    <div id="${editorContainerId}" style="min-height: ${isModal ? '250px' : '350px'}; border: 1px solid var(--input-border-light);" class="mt-1 bg-white dark:bg-slate-800/60 text-gray-800 dark:text-gray-100 quill-editor-styles">
                    </div>
                     <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Use as ferramentas do editor para formatação. Markdown básico também é suportado na visualização.</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label for="nota-cor-select${idSuffix}" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Cor da Nota:</label>
                        <div class="flex items-center mt-1">
                            <select id="nota-cor-select${idSuffix}" name="cor-select" class="form-input-text block w-full rounded-r-none">
                                ${CORES_NOTAS_FORM_PREDEFINIDAS.map(cor => `<option value="${cor.valor}" ${notaData?.cor === cor.valor || (!isEditing && cor.valor === '#FFFFE0') ? 'selected' : ''}>${cor.nome}</option>`).join('')}
                            </select>
                            <input type="color" id="nota-cor-picker${idSuffix}" name="cor-picker" class="h-8 w-10 p-0 border-l-0 border-gray-300 dark:border-slate-500 rounded-r-md" value="${notaData?.cor || '#FFFFE0'}">
                            <input type="text" id="nota-cor-hex${idSuffix}" name="cor-hex" class="form-input-text ml-2 w-24 text-sm" value="${notaData?.cor || '#FFFFE0'}" placeholder="#RRGGBB">
                        </div>
                    </div>
                    <div>
                         <label for="nota-isFavorita${idSuffix}" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Favorita:</label>
                        <input type="checkbox" id="nota-isFavorita${idSuffix}" name="isFavorita" class="form-checkbox rounded text-blue-600" ${notaData?.isFavorita ? 'checked' : ''}>
                        <span class="ml-2 text-sm text-gray-600 dark:text-gray-300">Marcar como favorita</span>
                    </div>
                </div>

                <h3 class="text-md font-semibold my-3 pt-3 border-t dark:border-slate-600">Vincular Entidades:</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border dark:border-slate-600 rounded-md p-3">
                    ${vinculosHtml}
                </div>

                <div class="mt-4">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Anexos:</label>
                    <div id="lista-anexos-existentes-nota${idSuffix}" class="mt-2"></div>
                    <input type="file" id="nota-anexos${idSuffix}" name="anexos" multiple class="form-input-file mt-1 block w-full">
                    <div id="lista-novos-anexos-nota${idSuffix}" class="mt-2"></div>
                </div>
                ${isModal ? `<div class="feedback-form-modal-area-specific mb-3 text-sm" id="feedback-form-nota-modal-${currentNotaId || 'nova-modal'}"></div>` : ''}
            </form>
        `;
        return formHtml;
    }

    async function renderNovaNotaFormPaginaPrincipal(notaData = null, originatingView = 'gerir-notas-rapidas', preSelectedLink = null) {
        if (globalClearFeedbackRef) globalClearFeedbackRef();
        mainContentWrapperRef.innerHTML = '';

        currentOriginatingViewParaForm = originatingView;
        const isEditing = notaData && notaData.id;
        currentNotaId = isEditing ? notaData.id : null;
        originalNotaData = isEditing ? JSON.parse(JSON.stringify(notaData)) : null;
        
        currentRelatedDocIds = (isEditing && Array.isArray(notaData.documentosRelacionadosIds)) ? [...notaData.documentosRelacionadosIds] : (preSelectedLink?.type === 'documento' ? [preSelectedLink.id] : []);
        currentRelatedContribIds = (isEditing && Array.isArray(notaData.contribuintesRelacionadosIds)) ? [...notaData.contribuintesRelacionadosIds] : (preSelectedLink?.type === 'contribuinte' ? [preSelectedLink.id] : []);
        currentRelatedRecursoIds = (isEditing && Array.isArray(notaData.recursosRelacionadosIds)) ? [...notaData.recursosRelacionadosIds] : (preSelectedLink?.type === 'recurso' ? [preSelectedLink.id] : []);
        currentRelatedTarefaIds = (isEditing && Array.isArray(notaData.tarefasRelacionadasIds)) ? [...notaData.tarefasRelacionadasIds] : (preSelectedLink?.type === 'tarefa' ? [preSelectedLink.id] : []);
        currentRelatedProtocoloIds = (isEditing && Array.isArray(notaData.protocolosRelacionadosIds)) ? [...notaData.protocolosRelacionadosIds] : (preSelectedLink?.type === 'protocolo' ? [preSelectedLink.id] : []);
        currentRelatedPTAIds = (isEditing && Array.isArray(notaData.ptasRelacionadosIds)) ? [...notaData.ptasRelacionadosIds] : (preSelectedLink?.type === 'pta' ? [preSelectedLink.id] : []);
        currentRelatedAutuacaoIds = (isEditing && Array.isArray(notaData.autuacoesRelacionadasIds)) ? [...notaData.autuacoesRelacionadasIds] : (preSelectedLink?.type === 'autuacao' ? [preSelectedLink.id] : []);
        currentRelatedServidorIds = (isEditing && Array.isArray(notaData.servidoresVinculadosIds)) ? [...notaData.servidoresVinculadosIds] : (preSelectedLink?.type === 'servidor' ? [preSelectedLink.id] : []);
        currentFilesToAttachNota = [];
        existingAttachmentsNota = (isEditing && Array.isArray(notaData.anexos)) ? [...notaData.anexos] : [];
        
        const formTitle = isEditing ? "Editar Nota Rápida" : "Nova Nota Rápida";
        const feedbackAreaId = `feedback-form-nota-pagina-${currentNotaId || 'nova'}-${Date.now()}`;
        const idSuffix = '-pagina';
        let numeroIdentificacaoDisplay = isEditing ? (notaData?.numeroIdentificacao || 'N/A (Antiga)') : '(Será gerado ao salvar)';
        if (!isEditing) {
            if (appModuleRef && typeof appModuleRef.generateNotaRapidaNumeroIdentificacao === 'function') {
                 numeroIdentificacaoDisplay = await appModuleRef.generateNotaRapidaNumeroIdentificacao();
            } else {
                numeroIdentificacaoDisplay = `NR-TEMP-${Date.now().toString().slice(-5)}`;
                 if (globalShowFeedbackRef && document.getElementById(feedbackAreaId)) globalShowFeedbackRef("Erro ao gerar ID para nova nota.", "warning", document.getElementById(feedbackAreaId));
            }
        }

        const formHtmlContent = await getFormHtml(notaData, originatingView, preSelectedLink, false);

        mainContentWrapperRef.innerHTML = ` 
            <div>
                <div class="flex justify-between items-center mb-2">
                    <h2 class="text-xl font-semibold">${formTitle}</h2>
                    <p class="text-xs text-gray-500 dark:text-gray-400">ID da Nota: ${numeroIdentificacaoDisplay}</p>
                </div>
                <div id="${feedbackAreaId}" class="mb-4"></div>
                ${formHtmlContent}
                 <div class="form-actions mt-6 flex justify-end space-x-3">
                    <button type="button" id="btn-cancelar-nota${idSuffix}" class="btn-secondary">Cancelar</button>
                    ${isEditing ? `<button type="button" id="btn-salvar-nova-versao-nota${idSuffix}" class="btn-secondary">Salvar como Nova Versão</button>` : ''}
                    <button type="submit" form="form-nota-rapida${idSuffix}" id="btn-salvar-nota${idSuffix}" class="btn-primary">${isEditing ? 'Atualizar Nota' : 'Salvar Nota'}</button>
                </div>
            </div>
        `;

        const formElement = mainContentWrapperRef.querySelector(`#form-nota-rapida${idSuffix}`);
        const editorContainer = mainContentWrapperRef.querySelector(`#${EDITOR_CONTEUDO_NOTA_ID_PAGINA}`);
        if (formElement && editorContainer) {
            if (SEFWorkStation.EditorTexto && typeof SEFWorkStation.EditorTexto.criarEditorQuill === 'function') {
                const quill = SEFWorkStation.EditorTexto.criarEditorQuill(EDITOR_CONTEUDO_NOTA_ID_PAGINA, {
                    placeholder: 'Digite sua nota aqui...'
                });
                if (quill && notaData?.conteudo) {
                    setTimeout(() => SEFWorkStation.EditorTexto.setConteudoHtml(EDITOR_CONTEUDO_NOTA_ID_PAGINA, notaData.conteudo), 100);
                }
            } else {
                editorContainer.innerHTML = "<p class='text-red-500'>Erro ao carregar editor.</p>";
            }
            attachFormEventListenersPaginaPrincipal(formElement, notaData, originatingView, isEditing, feedbackAreaId);
        } else {
            console.error("NotasRapidasForm.JS: Elemento do formulário de página principal (#form-nota-rapida-pagina) ou editor não encontrado após renderização.");
            if (globalShowFeedbackRef && document.getElementById(feedbackAreaId)) globalShowFeedbackRef("Erro interno ao montar o formulário de nota.", "error", document.getElementById(feedbackAreaId));
        }
    }
    
    async function handlePaginaPrincipalFormSubmit(form, notaDataOriginal, originatingViewContext, feedbackAreaId, saveAsNewVersion = false) {
        const idSuffix = '-pagina';
        const feedbackAreaEl = document.getElementById(feedbackAreaId);
        
        if (globalClearFeedbackRef) globalClearFeedbackRef(feedbackAreaEl);
        
        const isEditing = !!(notaDataOriginal && notaDataOriginal.id);
        const conteudoEditor = SEFWorkStation.EditorTexto.getConteudoHtml(getEditorId(false));

        if (!conteudoEditor || conteudoEditor.trim() === '' || conteudoEditor === '<p><br></p>') {
            if (globalShowFeedbackRef) globalShowFeedbackRef("O 'Conteúdo' da nota é obrigatório.", "error", feedbackAreaEl);
            SEFWorkStation.EditorTexto.focarEditor(getEditorId(false));
            return;
        }

        if (isEditing && saveAsNewVersion && originalNotaData) {
            const archivedVersion = { ...originalNotaData };
            archivedVersion.id = appModuleRef.generateUUID();
            archivedVersion.isArchivedVersion = true;
            archivedVersion.versionOf = currentNotaId;
            await dbRef.addItem(NOTAS_RAPIDAS_STORE_NAME, archivedVersion);
        }

        let finalNotaId = isEditing ? notaDataOriginal.id : appModuleRef.generateUUID();
        let numeroIdentificacaoFinal = document.getElementById(`nota-numero-identificacao-hidden${idSuffix}`).value;
        if (!isEditing || numeroIdentificacaoFinal.startsWith('NR-TEMP-') || numeroIdentificacaoFinal === 'N/A (Antiga)' || numeroIdentificacaoFinal === '(Será gerado ao salvar)') {
            numeroIdentificacaoFinal = await appModuleRef.generateNotaRapidaNumeroIdentificacao();
        }
        
        const notaPayload = {
            id: finalNotaId,
            numeroIdentificacao: numeroIdentificacaoFinal,
            titulo: document.getElementById(`nota-titulo${idSuffix}`).value.trim(),
            conteudo: conteudoEditor,
            cor: document.getElementById(`nota-cor-hex${idSuffix}`).value || '#FFFFE0',
            isFavorita: document.getElementById(`nota-isFavorita${idSuffix}`).checked,
            dataCriacao: isEditing && notaDataOriginal ? notaDataOriginal.dataCriacao : new Date().toISOString(),
            dataModificacao: new Date().toISOString(),
            anexos: [], // Será preenchido abaixo
            isExcluida: (isEditing && notaDataOriginal) ? (notaDataOriginal.isExcluida || false) : false,
            isArchivedVersion: false,
            versionOf: null,
            documentosRelacionadosIds: [...currentRelatedDocIds],
            contribuintesRelacionadosIds: [...currentRelatedContribIds],
            recursosRelacionadosIds: [...currentRelatedRecursoIds],
            tarefasRelacionadasIds: [...currentRelatedTarefaIds],
            protocolosRelacionadosIds: [...currentRelatedProtocoloIds],
            ptasRelacionadosIds: [...currentRelatedPTAIds],
            autuacoesRelacionadasIds: [...currentRelatedAutuacaoIds],
            servidoresVinculadosIds: [...currentRelatedServidorIds]
        };

        try {
            let savedAttachments = [...existingAttachmentsNota];
            if (currentFilesToAttachNota.length > 0 && window.SEFWorkStation.SharedUtils) {
                const dirHandle = await window.SEFWorkStation.SharedUtils.getOrCreateAttachmentDirHandle('notasRapidas', finalNotaId);
                if (dirHandle) {
                    for (const file of currentFilesToAttachNota) {
                        const newFileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
                        const fileHandle = await dirHandle.getFileHandle(newFileName, { create: true });
                        const writable = await fileHandle.createWritable();
                        await writable.write(file);
                        await writable.close();

                        const anexoPayload = {
                            id: await appModuleRef.generateUUID(),
                            ownerId: finalNotaId, ownerType: 'notaRapida',
                            fileName: file.name, filePath: `attachments_sef/notasRapidas/${finalNotaId}/${newFileName}`,
                            fileType: file.type, fileSize: file.size,
                            uploadDate: new Date().toISOString()
                        };
                        await dbRef.addItem(dbRef.STORES.ATTACHMENTS, anexoPayload);
                        savedAttachments.push({id: anexoPayload.id, fileName: file.name, filePath: anexoPayload.filePath, fileSize: file.size, fileType: file.type});
                    }
                }
            }
            notaPayload.anexos = savedAttachments;

            const idsAnterioresDocs = originalNotaData?.documentosRelacionadosIds || [];
            const idsAnterioresContribs = originalNotaData?.contribuintesRelacionadosIds || [];
            const idsAnterioresRecursos = originalNotaData?.recursosRelacionadosIds || [];
            const idsAnterioresTarefas = originalNotaData?.tarefasRelacionadasIds || [];
            const idsAnterioresProtocolos = originalNotaData?.protocolosRelacionadosIds || [];
            const idsAnterioresPTAs = originalNotaData?.ptasRelacionadosIds || [];
            const idsAnterioresAutuacoes = originalNotaData?.autuacoesRelacionadasIds || [];
            const idsAnterioresServidores = originalNotaData?.servidoresVinculadosIds || [];

            if (isEditing) {
                await dbRef.updateItem(NOTAS_RAPIDAS_STORE_NAME, notaPayload);
            } else {
                await dbRef.addItem(NOTAS_RAPIDAS_STORE_NAME, notaPayload);
            }
            
            if (window.SEFWorkStation.SharedUtils && typeof window.SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais === 'function') {
                await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(finalNotaId, DOCUMENTS_STORE_NAME, 'notasRapidasRelacionadasIds', currentRelatedDocIds, idsAnterioresDocs, dbRef);
                await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(finalNotaId, CONTRIBUINTES_STORE_NAME, 'notasRapidasRelacionadasIds', currentRelatedContribIds, idsAnterioresContribs, dbRef);
                await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(finalNotaId, RECURSOS_STORE_NAME, 'notasRapidasRelacionadasIds', currentRelatedRecursoIds, idsAnterioresRecursos, dbRef);
                await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(finalNotaId, TAREFAS_STORE_NAME, 'notasRapidasRelacionadasIds', currentRelatedTarefaIds, idsAnterioresTarefas, dbRef);
                await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(finalNotaId, PROTOCOLOS_STORE_NAME, 'notasRapidasVinculadasIds', currentRelatedProtocoloIds, idsAnterioresProtocolos, dbRef);
                await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(finalNotaId, PTAS_STORE_NAME, 'notasRapidasVinculadasIds', currentRelatedPTAIds, idsAnterioresPTAs, dbRef);
                await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(finalNotaId, AUTUACOES_STORE_NAME, 'notasRapidasVinculadasIds', currentRelatedAutuacaoIds, idsAnterioresAutuacoes, dbRef);
                await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(finalNotaId, SERVIDORES_STORE_NAME, 'notasRapidasVinculadasIds', currentRelatedServidorIds, idsAnterioresServidores, dbRef);
            }

            if (SEFWorkStation.EditorTexto.getInstancia(getEditorId(false))) {
                SEFWorkStation.EditorTexto.destruirEditor(getEditorId(false));
            }
            if (refreshApplicationStateRef) await refreshApplicationStateRef();
            let feedbackMsg = isEditing ? 'Nota atualizada com sucesso!' : 'Nota salva com sucesso!';
            if(saveAsNewVersion) feedbackMsg += " Nova versão criada.";
            if (globalShowFeedbackRef) globalShowFeedbackRef(feedbackMsg, 'success');
            
            if (navigateToAppViewCallback) { 
                navigateToAppViewCallback('visualizar-nota-rapida', { notaId: finalNotaId, originatingView: originatingViewContext });
            }
        } catch (error) {
            console.error("NotasRapidasForm.JS: Erro ao salvar nota no DB via página principal:", error);
            if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao salvar nota: ${error.message}`, "error", feedbackAreaEl);
        }
    }
    
    function attachFormEventListenersPaginaPrincipal(form, notaData, originatingView, isEditing, feedbackAreaId) {
        const idSuffix = '-pagina';
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            handlePaginaPrincipalFormSubmit(form, notaData, originatingView, feedbackAreaId, false);
        });
        
        document.getElementById(`btn-salvar-nova-versao-nota${idSuffix}`)?.addEventListener('click', (e) => {
            e.preventDefault();
            handlePaginaPrincipalFormSubmit(form, notaData, originatingView, feedbackAreaId, true);
        });

        document.getElementById(`btn-cancelar-nota${idSuffix}`).addEventListener('click', () => {
            if (SEFWorkStation.EditorTexto.getInstancia(getEditorId(false))) {
                SEFWorkStation.EditorTexto.destruirEditor(getEditorId(false));
            }
            if (appModuleRef && typeof appModuleRef.navigateBack === 'function') { 
                appModuleRef.navigateBack();
            } else if (navigateToAppViewCallback) { 
                navigateToAppViewCallback(originatingView, currentNotaId);
            }
        });

        setupColorPickerNota(idSuffix, form);
        renderAnexosExistentesENovosNota(idSuffix, form);
        renderSelectedRelatedItemsNota(idSuffix, form);
        renderSelectedServidoresNoFormNota(idSuffix, form);


        const anexosInput = document.getElementById(`nota-anexos${idSuffix}`);
        if (anexosInput) {
            anexosInput.addEventListener('change', (event) => {
                currentFilesToAttachNota = Array.from(event.target.files);
                renderAnexosExistentesENovosNota(idSuffix, form);
            });
        }
        
        const entityConfig = relatedEntityConfigNota();
        for (const key in entityConfig) {
            const entity = entityConfig[key];
            const btnGerenciar = form.querySelector(`#btn-gerenciar-${entity.pluralName}-vinculados-nota${idSuffix}`);
            if (btnGerenciar) {
                btnGerenciar.addEventListener('click', (e) => {
                    const entityTypeClicked = e.currentTarget.dataset.entityType;
                    const entityDefinition = entityConfig[entityTypeClicked];
                    if (entityDefinition.pluralName === 'servidores') {
                        abrirModalSelecaoServidoresParaNota(idSuffix, form);
                    } else {
                        abrirModalSelecaoEntidadeNota(entityTypeClicked, `Vincular ${entity.label} à Nota`, entity.storeName, entity.currentIds, () => renderSelectedRelatedItemsNota(idSuffix, form), entity.displayField, entity.refField, idSuffix, form);
                    }
                });
            }
        }
    }


    async function handleModalFormSubmit(modalContentElement, notaDataOriginal, originatingViewContext, feedbackAreaIdNoFormulario, saveAsNewVersion = false) {
        const idSuffix = '-modal';
        const feedbackAreaModal = modalContentElement.querySelector('.feedback-form-modal-area-specific') || document.getElementById(feedbackAreaIdNoFormulario);

        if (globalClearFeedbackRef && feedbackAreaModal) globalClearFeedbackRef(feedbackAreaModal);

        const isEditing = !!(notaDataOriginal && notaDataOriginal.id);
        const conteudoEditorModal = SEFWorkStation.EditorTexto.getConteudoHtml(getEditorId(true));


        if (!conteudoEditorModal || conteudoEditorModal.trim() === '' || conteudoEditorModal === '<p><br></p>') {
            if (globalShowFeedbackRef && feedbackAreaModal) globalShowFeedbackRef("O 'Conteúdo' da nota é obrigatório.", "error", feedbackAreaModal);
            SEFWorkStation.EditorTexto.focarEditor(getEditorId(true));
            return false;
        }
        
        if (isEditing && saveAsNewVersion && notaDataOriginal) {
            const archivedVersion = { ...notaDataOriginal };
            archivedVersion.id = appModuleRef.generateUUID();
            archivedVersion.isArchivedVersion = true;
            archivedVersion.versionOf = notaDataOriginal.id;
            await dbRef.addItem(NOTAS_RAPIDAS_STORE_NAME, archivedVersion);
        }

        let finalNotaId = isEditing ? notaDataOriginal.id : appModuleRef.generateUUID();
        let numeroIdentificacaoFinal = modalContentElement.querySelector(`#nota-numero-identificacao-hidden${idSuffix}`).value;
         if (!numeroIdentificacaoFinal || numeroIdentificacaoFinal.startsWith('NR-TEMP-') || numeroIdentificacaoFinal === 'N/A (Antiga)') {
            numeroIdentificacaoFinal = await appModuleRef.generateNotaRapidaNumeroIdentificacao();
        }

        const notaPayload = {
            id: finalNotaId,
            numeroIdentificacao: numeroIdentificacaoFinal,
            titulo: modalContentElement.querySelector(`#nota-titulo${idSuffix}`).value.trim(),
            conteudo: conteudoEditorModal,
            cor: modalContentElement.querySelector(`#nota-cor-hex${idSuffix}`).value || '#FFFFE0',
            isFavorita: modalContentElement.querySelector(`#nota-isFavorita${idSuffix}`).checked,
            dataCriacao: isEditing && notaDataOriginal ? notaDataOriginal.dataCriacao : new Date().toISOString(),
            dataModificacao: new Date().toISOString(),
            anexos: [], // Será preenchido abaixo
            isExcluida: (isEditing && notaDataOriginal) ? (notaDataOriginal.isExcluida || false) : false,
            isArchivedVersion: false,
            versionOf: null,
            documentosRelacionadosIds: [...currentRelatedDocIds],
            contribuintesRelacionadosIds: [...currentRelatedContribIds],
            recursosRelacionadosIds: [...currentRelatedRecursoIds],
            tarefasRelacionadasIds: [...currentRelatedTarefaIds],
            protocolosRelacionadosIds: [...currentRelatedProtocoloIds],
            ptasRelacionadosIds: [...currentRelatedPTAIds],
            autuacoesRelacionadasIds: [...currentRelatedAutuacaoIds],
            servidoresVinculadosIds: [...currentRelatedServidorIds]
        };

        try {
            let savedAttachments = [...existingAttachmentsNota];
            if (currentFilesToAttachNota.length > 0 && window.SEFWorkStation.SharedUtils) {
                const dirHandle = await window.SEFWorkStation.SharedUtils.getOrCreateAttachmentDirHandle('notasRapidas', finalNotaId);
                if (dirHandle) {
                    for (const file of currentFilesToAttachNota) {
                        const newFileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
                        const fileHandle = await dirHandle.getFileHandle(newFileName, { create: true });
                        const writable = await fileHandle.createWritable();
                        await writable.write(file);
                        await writable.close();

                        const anexoPayload = {
                            id: await appModuleRef.generateUUID(),
                            ownerId: finalNotaId, ownerType: 'notaRapida',
                            fileName: file.name, filePath: `attachments_sef/notasRapidas/${finalNotaId}/${newFileName}`,
                            fileType: file.type, fileSize: file.size,
                            uploadDate: new Date().toISOString()
                        };
                        await dbRef.addItem(dbRef.STORES.ATTACHMENTS, anexoPayload);
                        savedAttachments.push({id: anexoPayload.id, fileName: file.name, filePath: anexoPayload.filePath, fileSize: file.size, fileType: file.type});
                    }
                }
            }
            notaPayload.anexos = savedAttachments;

            const idsAnterioresDocs = notaDataOriginal?.documentosRelacionadosIds || [];
            const idsAnterioresContribs = notaDataOriginal?.contribuintesRelacionadosIds || [];
            const idsAnterioresRecursos = notaDataOriginal?.recursosRelacionadosIds || [];
            const idsAnterioresTarefas = notaDataOriginal?.tarefasRelacionadasIds || [];
            const idsAnterioresProtocolos = notaDataOriginal?.protocolosRelacionadosIds || [];
            const idsAnterioresPTAs = notaDataOriginal?.ptasRelacionadosIds || [];
            const idsAnterioresAutuacoes = notaDataOriginal?.autuacoesRelacionadasIds || [];
            const idsAnterioresServidores = notaDataOriginal?.servidoresVinculadosIds || [];

            if (isEditing) {
                await dbRef.updateItem(NOTAS_RAPIDAS_STORE_NAME, notaPayload);
            } else {
                await dbRef.addItem(NOTAS_RAPIDAS_STORE_NAME, notaPayload);
            }
            
            if (window.SEFWorkStation.SharedUtils && typeof window.SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais === 'function') {
                await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(finalNotaId, DOCUMENTS_STORE_NAME, 'notasRapidasRelacionadasIds', currentRelatedDocIds, idsAnterioresDocs, dbRef);
                await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(finalNotaId, CONTRIBUINTES_STORE_NAME, 'notasRapidasRelacionadasIds', currentRelatedContribIds, idsAnterioresContribs, dbRef);
                await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(finalNotaId, RECURSOS_STORE_NAME, 'notasRapidasRelacionadasIds', currentRelatedRecursoIds, idsAnterioresRecursos, dbRef);
                await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(finalNotaId, TAREFAS_STORE_NAME, 'notasRapidasRelacionadasIds', currentRelatedTarefaIds, idsAnterioresTarefas, dbRef);
                await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(finalNotaId, PROTOCOLOS_STORE_NAME, 'notasRapidasVinculadasIds', currentRelatedProtocoloIds, idsAnterioresProtocolos, dbRef);
                await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(finalNotaId, PTAS_STORE_NAME, 'notasRapidasVinculadasIds', currentRelatedPTAIds, idsAnterioresPTAs, dbRef);
                await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(finalNotaId, AUTUACOES_STORE_NAME, 'notasRapidasVinculadasIds', currentRelatedAutuacaoIds, idsAnterioresAutuacoes, dbRef);
                await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(finalNotaId, SERVIDORES_STORE_NAME, 'notasRapidasVinculadasIds', currentRelatedServidorIds, idsAnterioresServidores, dbRef);
            }

             if (SEFWorkStation.EditorTexto.getInstancia(getEditorId(true))) {
                SEFWorkStation.EditorTexto.destruirEditor(getEditorId(true));
            }
            
            if (refreshApplicationStateRef) await refreshApplicationStateRef();
            return true;
        } catch (error) {
            console.error("NotasRapidasForm.JS: Erro ao salvar nota no DB via modal:", error);
            if (globalShowFeedbackRef && feedbackAreaModal) globalShowFeedbackRef(`Erro ao salvar nota: ${error.message}`, "error", feedbackAreaModal);
            return false;
        }
    }
    
    function attachFormEventListenersToModal(modalContentElement, notaData, originatingView, isEditingModal, feedbackAreaIdNoFormulario, isModal) {
        const idSuffix = '-modal';

        const form = modalContentElement.querySelector(`#form-nota-rapida${idSuffix}`);
        if(form) {
            if (form._submitListenerModal) form.removeEventListener('submit', form._submitListenerModal);
            form._submitListenerModal = async (event) => { event.preventDefault(); };
            form.addEventListener('submit', form._submitListenerModal);
        }

        const btnSalvarNovaVersao = modalContentElement.querySelector(`#btn-salvar-nova-versao-nota${idSuffix}`);
        if(btnSalvarNovaVersao) {
            btnSalvarNovaVersao.addEventListener('click', async () => {
                 const success = await handleModalFormSubmit(modalContentElement, notaData, originatingView, feedbackAreaIdNoFormulario, true);
                 if (success && uiModuleRef.closeModal) uiModuleRef.closeModal();
            });
        }

        currentRelatedDocIds = (isEditingModal && Array.isArray(notaData.documentosRelacionadosIds)) ? [...notaData.documentosRelacionadosIds] : [];
        currentRelatedContribIds = (isEditingModal && Array.isArray(notaData.contribuintesRelacionadosIds)) ? [...notaData.contribuintesRelacionadosIds] : [];
        currentRelatedRecursoIds = (isEditingModal && Array.isArray(notaData.recursosRelacionadosIds)) ? [...notaData.recursosRelacionadosIds] : [];
        currentRelatedTarefaIds = (isEditingModal && Array.isArray(notaData.tarefasRelacionadasIds)) ? [...notaData.tarefasRelacionadasIds] : [];
        currentRelatedProtocoloIds = (isEditingModal && Array.isArray(notaData.protocolosRelacionadosIds)) ? [...notaData.protocolosRelacionadosIds] : [];
        currentRelatedPTAIds = (isEditingModal && Array.isArray(notaData.ptasRelacionadosIds)) ? [...notaData.ptasRelacionadosIds] : [];
        currentRelatedAutuacaoIds = (isEditingModal && Array.isArray(notaData.autuacoesRelacionadasIds)) ? [...notaData.autuacoesRelacionadasIds] : [];
        currentRelatedServidorIds = (isEditingModal && Array.isArray(notaData.servidoresVinculadosIds)) ? [...notaData.servidoresVinculadosIds] : [];
        existingAttachmentsNota = (isEditingModal && Array.isArray(notaData.anexos)) ? [...notaData.anexos] : [];
        currentFilesToAttachNota = [];

        setupColorPickerNota(idSuffix, modalContentElement);
        renderAnexosExistentesENovosNota(idSuffix, modalContentElement); 
        renderSelectedRelatedItemsNota(idSuffix, modalContentElement); 
        renderSelectedServidoresNoFormNota(idSuffix, modalContentElement);

        const editorContainerModal = modalContentElement.querySelector(`#${getEditorId(true)}`);
        if (editorContainerModal) {
             if (SEFWorkStation.EditorTexto && typeof SEFWorkStation.EditorTexto.criarEditorQuill === 'function') {
                const quillModal = SEFWorkStation.EditorTexto.criarEditorQuill(getEditorId(true), { placeholder: 'Digite sua nota aqui...' });
                if (quillModal && notaData?.conteudo) {
                    setTimeout(() => SEFWorkStation.EditorTexto.setConteudoHtml(getEditorId(true), notaData.conteudo), 100);
                }
            } else {
                editorContainerModal.innerHTML = "<p class='text-red-500'>Erro ao carregar editor.</p>";
            }
        }

        const anexosInputModal = modalContentElement.querySelector(`#nota-anexos${idSuffix}`);
        if (anexosInputModal) {
            anexosInputModal.addEventListener('change', (event) => {
                currentFilesToAttachNota = Array.from(event.target.files);
                renderAnexosExistentesENovosNota(idSuffix, modalContentElement);
            });
        }
        
        const entityConfig = relatedEntityConfigNota();
        for (const key in entityConfig) {
            const entity = entityConfig[key];
            const btnGerenciar = modalContentElement.querySelector(`#btn-gerenciar-${entity.pluralName}-vinculados-nota${idSuffix}`);
            if (btnGerenciar) {
                btnGerenciar.addEventListener('click', (e) => {
                    const entityTypeClicked = e.currentTarget.dataset.entityType;
                    const entityDefinition = entityConfig[entityTypeClicked];
                    if (entityDefinition.pluralName === 'servidores') {
                        abrirModalSelecaoServidoresParaNota(idSuffix, modalContentElement);
                    } else {
                        abrirModalSelecaoEntidadeNota(entityTypeClicked, `Vincular ${entity.label} à Nota`, entity.storeName, entity.currentIds, () => renderSelectedRelatedItemsNota(idSuffix, modalContentElement), entity.displayField, entity.refField, idSuffix, modalContentElement);
                    }
                });
            }
        }
    }
    
    function setupColorPickerNota(idSuffix, container) {
        const select = container.querySelector(`#nota-cor-select${idSuffix}`);
        const picker = container.querySelector(`#nota-cor-picker${idSuffix}`);
        const hexInput = container.querySelector(`#nota-cor-hex${idSuffix}`);

        if (!select || !picker || !hexInput) return;

        select.addEventListener('change', () => {
            picker.value = select.value;
            hexInput.value = select.value;
        });
        picker.addEventListener('input', () => {
            hexInput.value = picker.value;
            const correspondingOption = Array.from(select.options).find(opt => opt.value.toUpperCase() === picker.value.toUpperCase());
            select.value = correspondingOption ? correspondingOption.value : '';
        });
        hexInput.addEventListener('input', () => {
            const hexValue = hexInput.value.trim();
            if (/^#[0-9A-F]{6}$/i.test(hexValue)) {
                picker.value = hexValue;
                const correspondingOption = Array.from(select.options).find(opt => opt.value.toUpperCase() === hexValue.toUpperCase());
                select.value = correspondingOption ? correspondingOption.value : '';
            }
        });
    }

    function renderAnexosExistentesENovosNota(idSuffix, container) {
        const existingContainer = container.querySelector(`#lista-anexos-existentes-nota${idSuffix}`);
        const newContainer = container.querySelector(`#lista-novos-anexos-nota${idSuffix}`);

        if (existingContainer) {
            existingContainer.innerHTML = '<h6>Anexos Atuais:</h6>';
            if (existingAttachmentsNota.length === 0) {
                existingContainer.innerHTML += '<p class="text-xs text-gray-500">Nenhum anexo existente.</p>';
            } else {
                const list = document.createElement('ul');
                list.className = 'list-disc list-inside';
                existingAttachmentsNota.forEach((anexo, index) => {
                    const item = document.createElement('li');
                    item.className = 'text-sm';
                    item.innerHTML = `
                        <span>${anexo.fileName}</span>
                        <button type="button" class="btn-danger-xs ml-2" data-anexo-index="${index}">Remover</button>
                    `;
                    item.querySelector('button').addEventListener('click', () => {
                        existingAttachmentsNota.splice(index, 1);
                        renderAnexosExistentesENovosNota(idSuffix, container);
                    });
                    list.appendChild(item);
                });
                existingContainer.appendChild(list);
            }
        }

        if (newContainer) {
            newContainer.innerHTML = '<h6>Novos Anexos:</h6>';
            if (currentFilesToAttachNota.length === 0) {
                newContainer.innerHTML += '<p class="text-xs text-gray-500">Nenhum novo anexo selecionado.</p>';
            } else {
                const list = document.createElement('ul');
                list.className = 'list-disc list-inside';
                currentFilesToAttachNota.forEach(file => {
                    const item = document.createElement('li');
                    item.className = 'text-sm';
                    item.textContent = file.name;
                    list.appendChild(item);
                });
                newContainer.appendChild(list);
            }
        }
    }

    async function renderSelectedRelatedItemsNota(idSuffix, container) {
        const entityConfig = relatedEntityConfigNota();
        for (const key in entityConfig) {
            const entity = entityConfig[key];
            if (key !== 'servidores') { 
                await renderSelectedItemsListNota(idSuffix, container, entity.pluralName, entity.currentIds, entity.storeName, entity.displayField, entity.refField);
            }
        }
    }

    async function renderSelectedItemsListNota(idSuffix, container, entityPluralName, getCurrentIdsFunc, storeName, displayField, refField = null) {
        const listContainer = container.querySelector(`#lista-${entityPluralName}-vinculados-nota${idSuffix}`);
        if (!listContainer) {
            console.warn(`Container de lista para ${entityPluralName} não encontrado com sufixo ${idSuffix}`);
            return;
        }

        listContainer.innerHTML = '';
        if (typeof getCurrentIdsFunc !== 'function') { 
            console.error(`Erro em renderSelectedItemsListNota: getCurrentIdsFunc para ${entityPluralName} não é uma função.`);
            listContainer.innerHTML = `<p class="text-xs text-red-500 dark:text-red-400">Erro ao carregar vínculos.</p>`;
            return;
        }
        
        const ids = getCurrentIdsFunc();
        
        if (!Array.isArray(ids) || ids.length === 0) {
            listContainer.innerHTML = `<p class="text-xs text-gray-500 dark:text-gray-400">Nenhum vinculado.</p>`;
            return;
        }

        const items = [];
        for (const id of ids) {
            try {
                const item = await dbRef.getItemById(storeName, id);
                if (item) items.push(item);
            } catch (e) {
                console.warn(`Erro ao buscar item ${id} da store ${storeName}:`, e);
            }
        }

        items.forEach(item => {
            const pill = document.createElement('div');
            pill.className = 'badge-sm-blue';
            pill.innerHTML = `
                <span>${item[displayField] || (refField ? item[refField] : 'ID ' + item.id.substring(0,4))}</span>
                <button type="button" class="ml-1 font-bold" data-id="${item.id}" data-entity-plural="${entityPluralName}">×</button>
            `;
            pill.querySelector('button').addEventListener('click', (e) => {
                const idToRemove = e.currentTarget.dataset.id;
                const entityPluralNameToRemove = e.currentTarget.dataset.entityPlural;
                const entityConfigLocal = relatedEntityConfigNota(); 
                
                for(const key in entityConfigLocal) {
                    if (entityConfigLocal[key].pluralName === entityPluralNameToRemove) {
                        let currentArray = entityConfigLocal[key].currentIds(); 
                        const index = currentArray.indexOf(idToRemove);
                        if (index > -1) {
                            currentArray.splice(index, 1);
                        }
                        break; 
                    }
                }
                renderSelectedItemsListNota(idSuffix, container, entityPluralNameToRemove, getCurrentIdsFunc, storeName, displayField, refField);
                renderSelectedRelatedItemsNota(idSuffix, container); 
            });
            listContainer.appendChild(pill);
        });
    }

    async function renderSelectedServidoresNoFormNota(idSuffix, container) {
        const listContainer = container.querySelector('#lista-servidores-vinculados-nota' + idSuffix);
        if (!listContainer) return;

        listContainer.innerHTML = '';
        if (currentRelatedServidorIds.length === 0) {
            listContainer.innerHTML = '<p class="text-xs text-gray-500 dark:text-gray-400">Nenhum servidor vinculado.</p>';
            return;
        }
        
        const servidores = [];
        for (const id of currentRelatedServidorIds) {
            try {
                const servidor = await dbRef.getItemById(SERVIDORES_STORE_NAME, id);
                if (servidor) servidores.push(servidor);
            } catch (e) {
                console.warn(`Erro ao buscar servidor ID ${id}:`, e);
            }
        }

        servidores.forEach(servidor => {
            const pill = document.createElement('div');
            pill.className = 'badge-sm-green';
            pill.textContent = `${servidor.nome} (${servidor.matricula})`;
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'ml-2 font-bold';
            removeBtn.innerHTML = '×';
            removeBtn.onclick = () => {
                const index = currentRelatedServidorIds.indexOf(servidor.id);
                if (index > -1) {
                    currentRelatedServidorIds.splice(index, 1);
                }
                renderSelectedServidoresNoFormNota(idSuffix, container);
            };
            pill.appendChild(removeBtn);
            listContainer.appendChild(pill);
        });
    }

    // *** INÍCIO DA CORREÇÃO: Funções de Modal Adicionadas ***
    
    async function abrirModalSelecaoEntidadeNota(entityType, modalTitle, storeName, getCurrentIdsFunc, callbackOnConfirm, displayField, refField, idSuffix, containerElement) {
        if (!uiModuleRef || !uiModuleRef.showModal) {
            globalShowFeedbackRef("Funcionalidade de modal não está disponível.", "error");
            return;
        }

        const allItemsRaw = await dbRef.getAllItems(storeName);
        const allItems = window.SEFWorkStation.EntityConfig.filterActiveItems(allItemsRaw, storeName);
        tempSelectedIdsModal = [...getCurrentIdsFunc()];

        let listHtml = allItems.length > 0 ? allItems.map(item => {
            let labelText = item[displayField] || `ID: ${item.id.substring(0,8)}`;
            if(refField && item[refField]) {
                labelText += ` (${item[refField]})`;
            }
            return `
                <label class="flex items-center p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md cursor-pointer">
                    <input type="checkbox" class="form-checkbox rounded text-blue-600 modal-select-item" value="${item.id}" ${tempSelectedIdsModal.includes(item.id) ? 'checked' : ''}>
                    <span class="ml-3 text-sm">${labelText}</span>
                </label>
            `;
        }).join('') : '<p class="p-4 text-center text-sm text-gray-500">Nenhum item disponível para vincular.</p>';

        const modalContentHtml = `
            <div class="mb-3">
                <input type="text" id="modal-search-entity" class="form-input-text w-full" placeholder="Pesquisar...">
            </div>
            <div id="modal-entity-list" class="max-h-60 overflow-y-auto border dark:border-slate-600 rounded-md p-2 space-y-1">
                ${listHtml}
            </div>
        `;
        
        const modal = uiModuleRef.showModal(modalTitle, modalContentHtml, [
            { text: 'Cancelar', class: 'btn-secondary', closesModal: true },
            { 
                text: 'Confirmar',
                class: 'btn-primary',
                callback: () => {
                    const entityConfig = relatedEntityConfigNota();
                    const currentArray = entityConfig[entityType].currentIds();
                    currentArray.length = 0;
                    currentArray.push(...tempSelectedIdsModal);
                    callbackOnConfirm();
                    return true;
                }
            }
        ], 'max-w-lg');
        
        const searchInput = modal.querySelector('#modal-search-entity');
        const listContainer = modal.querySelector('#modal-entity-list');

        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            listContainer.querySelectorAll('label').forEach(label => {
                const text = label.textContent.toLowerCase();
                label.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });

        listContainer.querySelectorAll('.modal-select-item').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    if (!tempSelectedIdsModal.includes(checkbox.value)) {
                        tempSelectedIdsModal.push(checkbox.value);
                    }
                } else {
                    tempSelectedIdsModal = tempSelectedIdsModal.filter(id => id !== checkbox.value);
                }
            });
        });
    }

    async function abrirModalSelecaoServidoresParaNota(idSuffix, container) {
        if (!uiModuleRef || !uiModuleRef.showModal) {
            globalShowFeedbackRef("Funcionalidade de modal não está disponível.", "error");
            return;
        }

        const allServersRaw = await dbRef.getAllItems(SERVIDORES_STORE_NAME);
        const allServers = window.SEFWorkStation.EntityConfig.filterActiveItems(allServersRaw, SERVIDORES_STORE_NAME);
        
        tempSelectedIdsModal = [...currentRelatedServidorIds];
        
        let listHtml = allServers.map(server => `
            <label class="flex items-center p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md cursor-pointer">
                <input type="checkbox" class="form-checkbox rounded text-blue-600 modal-select-item" value="${server.id}" ${tempSelectedIdsModal.includes(server.id) ? 'checked' : ''}>
                <span class="ml-3 text-sm">${server.nome} (${server.matricula})</span>
            </label>
        `).join('');

        const modalContentHtml = `
            <div class="mb-3">
                <input type="text" id="modal-search-server" class="form-input-text w-full" placeholder="Pesquisar por nome ou matrícula...">
            </div>
            <div id="modal-server-list" class="max-h-60 overflow-y-auto border dark:border-slate-600 rounded-md p-2 space-y-1">
                ${listHtml}
            </div>
        `;
        
        const modal = uiModuleRef.showModal("Vincular Servidores", modalContentHtml, [
            { text: 'Cancelar', class: 'btn-secondary', closesModal: true },
            { 
                text: 'Confirmar',
                class: 'btn-primary',
                callback: () => {
                    currentRelatedServidorIds = [...tempSelectedIdsModal];
                    renderSelectedServidoresNoFormNota(idSuffix, container);
                    return true;
                }
            }
        ], 'max-w-lg');
        
        const searchInput = modal.querySelector('#modal-search-server');
        const listContainer = modal.querySelector('#modal-server-list');

        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            listContainer.querySelectorAll('label').forEach(label => {
                const text = label.textContent.toLowerCase();
                label.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });

        listContainer.querySelectorAll('.modal-select-item').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    if (!tempSelectedIdsModal.includes(checkbox.value)) {
                        tempSelectedIdsModal.push(checkbox.value);
                    }
                } else {
                    tempSelectedIdsModal = tempSelectedIdsModal.filter(id => id !== checkbox.value);
                }
            });
        });
    }

    // *** FIM DA CORREÇÃO ***


    return {
        init,
        getFormHtml,
        handleModalFormSubmit,
        attachFormEventListenersToModal,
        renderNovaNotaFormPaginaPrincipal,
        getEditorId,
        CORES_NOTAS: CORES_NOTAS_FORM_PREDEFINIDAS
    };
})();