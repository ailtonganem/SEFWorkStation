// js/documentosView.js - Lógica para Visualização de Documentos
// v7.2.0 - CORRIGIDO: Padroniza a leitura das propriedades de relacionamento para exibir os vínculos corretamente, incluindo retrocompatibilidade com nomes antigos.
// v7.1.0 - REFATORADO: Utiliza o módulo centralizado EntityConfig para renderizar itens relacionados e seus eventos.
// v7.0.1 - CORRIGIDO: Adiciona classes 'section-for-print' e 'section-not-for-print' para corrigir a funcionalidade de impressão.
// v7.0.0 - Implementa exibição do histórico de versões e funcionalidade para visualizar e restaurar versões antigas.
// v6.4.0 - REFATORADO: Adota novo layout de visualização em cards para melhor clareza.
// ... (histórico anterior)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.DocumentosView = (function() {
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let refreshApplicationStateRef;
    let dbRef;
    let documentosFormModuleRef;
    let appModuleRef;
    let uiModuleRef;
    let sharingModuleRef;
    let sharedUtilsRef;

    const CONTRIBUINTES_PLACEHOLDERS_STORE_NAME = 'contribuintesPlaceholdersStore';
    const PLACEHOLDER_CLASS_HIGHLIGHT = 'placeholder-highlight';
    const DOCUMENTS_STORE_NAME = 'documents';
    const CONTRIBUINTES_STORE_NAME = 'contribuintes';
    const RECURSOS_STORE_NAME = 'recursos';
    const TAREFAS_STORE_NAME = 'tarefasStore';
    const NOTAS_RAPIDAS_STORE_NAME = 'notasRapidasStore';
    const PROTOCOLOS_STORE_NAME = 'protocolosStore';
    const PTAS_STORE_NAME = 'ptasStore';
    const AUTUACOES_STORE_NAME = 'autuacoesStore';
    const SERVIDORES_STORE_NAME = 'servidoresStore';
    const SERVIDORES_GRUPOS_STORE_NAME = 'servidoresGruposStore';

    const NOMES_PLACEHOLDERS_PADRAO_SISTEMA = ['NOME', 'CPF_CNPJ', 'INSCRICAO_ESTADUAL', 'EMAIL', 'TELEFONE', 'ENDERECO', 'NUMERO_IDENTIFICACAO'];

    function init(
        mainWrapper, showFeedbackFunc, clearFeedbackFunc, irParaHomeFunc, refreshFunc, 
        dbModuleRef, formModuleRef, docsPrincipalRef, applicationModuleRef,
        uiMod, sharingMod, utilsMod
    ) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedbackFunc;
        globalClearFeedbackRef = clearFeedbackFunc;
        refreshApplicationStateRef = refreshFunc;
        dbRef = dbModuleRef;
        documentosFormModuleRef = formModuleRef;
        appModuleRef = applicationModuleRef;
        uiModuleRef = uiMod;
        sharingModuleRef = sharingMod;
        sharedUtilsRef = utilsMod;
        console.log("DocumentosView.JS: Módulo inicializado (v7.2.0).");
    }

    function highlightContribPlaceholders(contentHTML, contribPlaceholdersPersonalizados, contribPlaceholdersSistema) {
        if (!contentHTML) return contentHTML;
        let highlightedContent = contentHTML;

        if (contribPlaceholdersSistema && Array.isArray(contribPlaceholdersSistema)) {
            contribPlaceholdersSistema.forEach(phNome => {
                const escapedPlaceholderName = phNome.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                const placeholderRegex = new RegExp(`\\{\\{${escapedPlaceholderName}\\}\\}`, 'g');
                const tooltip = `Placeholder Padrão: Mapeado para o campo '${phNome.toLowerCase().replace('_',' ')}' do contribuinte.`;
                highlightedContent = highlightedContent.replace(placeholderRegex,
                    `<span class="${PLACEHOLDER_CLASS_HIGHLIGHT}" title="${tooltip.replace(/"/g, '"')}">$&</span>`
                );
            });
        }

        if (contribPlaceholdersPersonalizados && Array.isArray(contribPlaceholdersPersonalizados)) {
            contribPlaceholdersPersonalizados.forEach(ph => {
                if (!NOMES_PLACEHOLDERS_PADRAO_SISTEMA.includes(ph.nomePlaceholderNormalizado)) {
                    const escapedPlaceholderName = ph.nomePlaceholderNormalizado.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    const placeholderRegex = new RegExp(`\\{\\{${escapedPlaceholderName}\\}\\}`, 'g');
                    const tooltip = `Placeholder Personalizado: Mapeado para '${ph.campoContribuinte || 'N/A'}'. (Configurado em Gerir Placeholders)`;
                    highlightedContent = highlightedContent.replace(placeholderRegex,
                        `<span class="${PLACEHOLDER_CLASS_HIGHLIGHT}" title="${tooltip.replace(/"/g, '"')}">$&</span>`
                    );
                }
            });
        }
        return highlightedContent;
    }

    async function renderRelatedItemsSection(doc) {
        if (!doc) {
            return '<p class="text-sm text-gray-500 dark:text-gray-400">Erro: Documento não fornecido para relacionamentos.</p>';
        }
        if (!dbRef || !window.SEFWorkStation.EntityConfig) {
             return '<p class="text-sm text-gray-500 dark:text-gray-400">Erro: Configuração de entidades ou DB não acessível para relacionamentos.</p>';
        }

        let relatedHtml = '<div class="space-y-4">';
        let hasAnyLink = false;
        
        const allEntityConfigs = window.SEFWorkStation.EntityConfig.getAllConfigs();

        const processLinksForType = async (ids, config) => {
            if (!ids || ids.length === 0) return ''; 

            let itemsHtml = `<ul class="list-disc list-inside ml-4 space-y-1">`;
            let count = 0;
            for (const id of ids) {
                try {
                    const item = await dbRef.getItemById(config.storeName, id);
                     if (item && !item.isDeleted && !item.isExcluida && !item.isArchivedVersion) { 
                        hasAnyLink = true;
                        count++;
                        let displayName = item[config.displayField] || `ID ${id.toString().substring(0,8)}`;
                        itemsHtml += `<li class="p-1 border-b border-gray-200 dark:border-slate-700 last:border-b-0">
                                        <a href="#" class="link-view-related-item text-blue-600 hover:underline dark:text-blue-400 text-sm" 
                                           data-id="${id}" 
                                           data-view-action="${config.viewAction}" 
                                           data-datakey="${config.dataKey}">
                                           ${displayName}
                                        </a>
                                     </li>`;
                    }
                } catch (e) { console.warn(`Erro ao buscar item vinculado ${config.labelSingular} ID ${id}:`, e); }
            }
            itemsHtml += '</ul>';
            if (count > 0) {
                return `<div><h4 class="text-md font-semibold mb-1 text-gray-700 dark:text-gray-200">${config.labelPlural}:</h4>${itemsHtml}</div>`;
            }
            return '';
        };
        
        for (const config of allEntityConfigs) {
            if (!config.isLinkable) continue;

            // CORREÇÃO: Verifica múltiplos nomes de propriedade (novo padrão e legados)
            const propNameStandard = `${config.storeName}VinculadosIds`;
            const propNameLegacyMap = {
                'documents': ['documentosVinculadosIds', 'relatedDocuments'],
                'contribuintes': ['contribuintesVinculadosIds', 'relatedContribuintes'],
                'notasRapidasStore': ['notasRapidasRelacionadasIds'],
                'recursos': ['recursosVinculadosIds'],
                'tarefasStore': ['tarefasVinculadasIds'],
                'protocolosStore': ['protocolosVinculadosIds'],
                'ptasStore': ['ptasVinculadosIds'],
                'autuacoesStore': ['autuacoesVinculadosIds'],
                'servidoresStore': ['servidoresVinculadosIds'],
            };
            
            const possiblePropNames = propNameLegacyMap[config.storeName] || [propNameStandard];
            let ids = [];
            for (const propName of possiblePropNames) {
                if (doc[propName] && Array.isArray(doc[propName])) {
                    ids = doc[propName];
                    break; 
                }
            }
            
            if (ids.length > 0) {
                relatedHtml += await processLinksForType(ids, config);
            }
        }
        
        relatedHtml += '</div>';

        if (!hasAnyLink) {
            return '<p class="text-sm text-gray-500 dark:text-gray-400">Nenhum item ativo vinculado a este documento.</p>';
        }

        return relatedHtml;
    }

    async function renderVersionHistorySection(doc, containerEl) {
        if (!doc || !containerEl) return;

        const historyContainer = containerEl.querySelector('#version-history-container');
        if (!historyContainer) return;

        historyContainer.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400">Carregando histórico...</p>';

        try {
            const versions = await dbRef.getItemsByIndex(DOCUMENTS_STORE_NAME, 'versionOf', doc.id);
            versions.sort((a, b) => new Date(b.modificationDate) - new Date(a.modificationDate));

            if (versions.length === 0) {
                historyContainer.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400">Nenhuma versão anterior encontrada.</p>';
                return;
            }

            let historyHtml = '<ul class="space-y-2">';
            versions.forEach(version => {
                const modDate = new Date(version.modificationDate).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
                historyHtml += `
                    <li class="flex justify-between items-center p-2 bg-gray-100 dark:bg-slate-700/50 rounded-md text-sm">
                        <span>Versão salva em: <strong>${modDate}</strong></span>
                        <div class="space-x-2">
                            <button class="btn-secondary btn-sm text-xs btn-view-version" data-version-id="${version.id}">Visualizar</button>
                            <button class="btn-primary btn-sm text-xs btn-restore-version" data-version-id="${version.id}">Restaurar</button>
                        </div>
                    </li>
                `;
            });
            historyHtml += '</ul>';
            historyContainer.innerHTML = historyHtml;

        } catch (error) {
            console.error("Erro ao carregar histórico de versões:", error);
            historyContainer.innerHTML = '<p class="text-sm text-red-500 dark:text-red-400">Erro ao carregar histórico.</p>';
        }
    }

    async function renderVisualizarDocumentoPage(docId, originatingView = 'gerir') {
        const viewContainerId = `doc-view-container-${docId}`;
        const feedbackAreaId = `feedback-doc-view-${docId}`;

        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (!mainContentWrapperRef) {
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico ao tentar renderizar a visualização.", "error");
            return;
        }
        
        mainContentWrapperRef.innerHTML = `<div id="${viewContainerId}" class="documento-view"><p class="loading-text p-4">A carregar documento...</p></div>`;
        const viewContainer = document.getElementById(viewContainerId);

        if (!viewContainer) {
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico: Contêiner de visualização do documento não encontrado no DOM.", "error");
            console.error(`DocumentosView.JS: Contêiner de visualização (ID: ${viewContainerId}) não encontrado.`);
            return;
        }

        try {
            if (!dbRef) throw new Error("dbRef não está inicializado.");
            const doc = await dbRef.getItemById(DOCUMENTS_STORE_NAME, docId);

            if (!doc) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("Documento não encontrado.", "error", viewContainer);
                return;
            }
            
            if (doc.isDeleted && originatingView !== 'lixeira-global' && originatingView !== 'lixeira' ) {
                 if (globalShowFeedbackRef) globalShowFeedbackRef("Este documento está na lixeira.", "info", viewContainer);
                 viewContainer.innerHTML = `<p class="feedback-message info p-4">Este documento (ID: ${docId}) encontra-se na lixeira. Para visualizá-lo ou restaurá-lo, acesse a Lixeira.</p>
                                           <button id="btn-voltar-view-doc" class="btn-secondary mt-4">Voltar</button>`;
                document.getElementById('btn-voltar-view-doc')?.addEventListener('click', () => {
                    if (appModuleRef && appModuleRef.navigateBack) {
                        appModuleRef.navigateBack();
                    }
                });
                return;
            }
            
            const renderChips = (items, baseClass) => {
                if (!items || items.length === 0) return '<span class="text-sm text-gray-500 dark:text-gray-400">Nenhum(a).</span>';
                return items.map(item => `<span class="${baseClass}">${item.split('/').map(c => c.trim()).join(' › ')}</span>`).join('');
            };

            const tagsHtml = renderChips(doc.tags, 'doc-tag-view');
            const categoriesHtml = renderChips(doc.categories, 'doc-category-tag');

            const anexoHtml = (anexos) => {
                if (!anexos || anexos.length === 0) return '<p class="text-sm text-gray-500 dark:text-gray-400">Nenhum anexo.</p>';
                return `<ul class="list-none p-0 space-y-2">${anexos.map(anexo => {
                    if (anexo && anexo.fileName && typeof anexo.fileSize === 'number') {
                        return `<li class="anexo-preview-item"><span>${anexo.fileName} (${(anexo.fileSize / 1024).toFixed(1)} KB)</span>
                                <button class="btn-link btn-download-anexo text-xs" data-anexo-path="${anexo.filePath || ''}" data-anexo-owner-type="${anexo.ownerType || 'document'}" data-anexo-owner-id="${anexo.ownerId || doc.id}" data-anexo-name="${anexo.fileName}" title="Baixar/Abrir Anexo">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-download inline-block" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg> Abrir</button>
                                </li>`;
                    } return '';
                }).join('')}</ul>`;
            };

            let conteudoFinalDoc = doc.content || '<p class="text-gray-500 dark:text-gray-400"><em>Documento sem conteúdo.</em></p>';
            if (doc.isTemplate && dbRef) {
                try {
                    const placeholdersPersonalizados = await dbRef.getAllItems(CONTRIBUINTES_PLACEHOLDERS_STORE_NAME);
                    conteudoFinalDoc = highlightContribPlaceholders(conteudoFinalDoc, placeholdersPersonalizados, NOMES_PLACEHOLDERS_PADRAO_SISTEMA);
                } catch (e) { console.warn("DocumentosView.JS: Erro ao buscar placeholders personalizados para highlight:", e); }
            }

            const relatedItemsHtmlContent = await renderRelatedItemsSection(doc);
            
            let notasVinculadasHtml = '';
            if (doc.notasRapidasRelacionadasIds && doc.notasRapidasRelacionadasIds.length > 0 && dbRef && uiModuleRef) {
                const converter = (typeof showdown !== 'undefined') ? new showdown.Converter({ simplifiedAutoLink: true, strikethrough: true, tables: true, tasklists: true, openLinksInNewWindow: true, emoji: true, ghCompatibleHeaderId: true, requireSpaceBeforeHeadingText: true }) : null;
                const notasGridContainer = document.createElement('div');
                notasGridContainer.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2';
                let notasRenderizadasCount = 0;
                for (const notaId of doc.notasRapidasRelacionadasIds) {
                    try {
                        const nota = await dbRef.getItemById(NOTAS_RAPIDAS_STORE_NAME, notaId);
                        if (nota && !nota.isExcluida) {
                            const conteudoNotaHtml = converter ? converter.makeHtml(nota.conteudo || '') : (nota.conteudo || '').replace(/\n/g, '<br>');
                            const corDeFundoNota = nota.cor || '#FFFFE0';
                            const isDarkBgNota = uiModuleRef.isColorDark(corDeFundoNota);
                            const textColorClassNota = isDarkBgNota ? 'text-gray-100' : 'text-gray-800';
                            const borderColorClassNota = isDarkBgNota ? 'border-gray-600' : 'border-gray-300';
                            const notaCard = document.createElement('div');
                            notaCard.className = 'nota-post-it-vinculada p-3 rounded-md shadow-sm cursor-pointer';
                            notaCard.style.backgroundColor = corDeFundoNota;
                            notaCard.style.border = `1px solid ${isDarkBgNota ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`;
                            notaCard.dataset.notaId = nota.id;
                            notaCard.title = "Clique para editar esta nota";
                            notaCard.innerHTML = `${nota.titulo ? `<h5 class="font-semibold ${textColorClassNota} mb-1 pb-1 border-b ${borderColorClassNota} text-xs truncate">${nota.titulo}</h5>` : ''}
                                                <div class="text-xs ${textColorClassNota} prose prose-sm dark:prose-invert max-w-none max-h-20 overflow-y-auto">${conteudoNotaHtml.substring(0,150)}${conteudoNotaHtml.length > 150 ? '...' : ''}</div>
                                                <div class="mt-2 text-right text-[10px] ${isDarkBgNota ? 'text-gray-400' : 'text-gray-500'}">${nota.isFavorita ? '⭐ ' : ''}Modif.: ${new Date(nota.dataModificacao).toLocaleDateString()}</div>`;
                            notasGridContainer.appendChild(notaCard);
                            notasRenderizadasCount++;
                        }
                    } catch (e) { console.warn("DocumentosView.JS: Erro ao buscar nota rápida vinculada:", e); }
                }
                notasVinculadasHtml = notasGridContainer.outerHTML;
                if (notasRenderizadasCount === 0) notasVinculadasHtml = '<p class="text-sm text-gray-500 dark:text-gray-400">Nenhuma nota rápida ativa vinculada.</p>';
            }

            const viewHtml = `
                <div id="${feedbackAreaId}" class="mb-4"></div>
                
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2 section-not-for-print">
                    <h2 class="documento-view-title">${doc.title || "Documento Sem Título"}</h2>
                     <div class="actions-group flex flex-wrap gap-2">
                        <button id="btn-voltar-view-doc" class="btn-secondary btn-sm">Voltar</button>
                        ${!doc.isDeleted ? `<button id="btn-editar-doc-view" class="btn-primary btn-sm">Editar</button>` : ''}
                        ${!doc.isDeleted ? `<button id="btn-share-doc-view" class="btn-secondary bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white btn-sm" title="Compartilhar este documento"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-share-fill inline-block mr-1" viewBox="0 0 16 16"><path d="M11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5z"/></svg> Compartilhar</button>` : ''}
                    </div>
                </div>

                <div id="printable-document-content">
                    <div class="card mb-6 section-for-print">
                        <h3 class="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-200 border-b pb-2 dark:border-slate-700">Detalhes Principais</h3>
                        <dl class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                            <div class="info-item"><dt>Tipo:</dt><dd>${doc.docType || 'Não especificado'}</dd></div>
                            <div class="info-item"><dt>Referência:</dt><dd>${doc.reference || 'N/A'}</dd></div>
                            <div class="info-item"><dt>Criado em:</dt><dd>${new Date(doc.creationDate).toLocaleString()}</dd></div>
                            <div class="info-item"><dt>Modificado em:</dt><dd>${new Date(doc.modificationDate).toLocaleString()}</dd></div>
                            <div class="md:col-span-2 info-item"><dt>Categorias:</dt><dd class="flex flex-wrap gap-1 mt-1">${categoriesHtml}</dd></div>
                            <div class="md:col-span-2 info-item"><dt>Tags:</dt><dd class="flex flex-wrap gap-1 mt-1">${tagsHtml}</dd></div>
                        </dl>
                    </div>
                    
                    <div class="card mb-6 section-for-print">
                        <h3 class="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-200 border-b pb-2 dark:border-slate-700">Conteúdo do Documento</h3>
                        <div id="doc-view-corpo-content-printable-wrapper">
                             <div class="documento-view-corpo prose dark:prose-invert max-w-none" id="doc-view-corpo-content">${conteudoFinalDoc}</div>
                        </div>
                    </div>
                </div>

                <div class="space-y-6 section-not-for-print">
                    ${doc.internalNotes ? `<div class="card"><h3 class="text-lg font-semibold mb-2">Notas Internas</h3><div class="documento-view-notas-content">${doc.internalNotes.replace(/\n/g, '<br>')}</div></div>` : ''}
                    <div class="card"><h3 class="text-lg font-semibold mb-2">Relacionamentos</h3>${relatedItemsHtmlContent}</div>
                    <div class="card">
                        <div class="flex justify-between items-center mb-2"><h3 class="text-lg font-semibold">Notas Rápidas Vinculadas</h3><button id="btn-nova-nota-para-documento" data-doc-id="${doc.id}" class="btn-secondary btn-sm text-xs">Adicionar Nota</button></div>
                        <div id="related-notas-rapidas-display">${notasVinculadasHtml}</div>
                    </div>
                    <div class="card"><h3 class="text-lg font-semibold mb-2">Anexos</h3>${anexoHtml(doc.anexos)}</div>
                </div>

                <div class="documento-view-actions mt-8 flex flex-wrap gap-2 section-not-for-print">
                     ${doc.isTemplate && !doc.isDeleted ? `<button id="btn-usar-modelo-view" class="btn-primary bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600">Usar este Modelo</button>` : ''}
                    <button id="btn-copiar-conteudo-doc-view" class="btn-secondary">Copiar Conteúdo</button>
                    <button id="btn-enviar-email-doc-view" class="btn-secondary">Enviar por Email</button>
                    <button id="btn-imprimir-doc-view" class="btn-secondary">Imprimir Conteúdo</button>
                    ${!doc.isDeleted ? `<button id="btn-excluir-doc-view" class="btn-delete">Mover para Lixeira</button>` :
                        (originatingView === 'lixeira-global' || originatingView === 'lixeira' ?
                            `<button id="btn-restaurar-doc-view" class="btn-secondary">Restaurar</button>
                             <button id="btn-excluir-permanente-doc-view" class="btn-delete">Excluir Permanentemente</button>`
                             : '')
                    }
                </div>
                <div class="navigation-buttons-view mt-4 flex justify-between section-not-for-print">
                    <button id="btn-anterior-doc-view" class="btn-secondary btn-sm" disabled>< Anterior</button>
                    <button id="btn-proximo-doc-view" class="btn-secondary btn-sm" disabled>Próximo ></button>
                </div>
            `;
            if(viewContainer) viewContainer.innerHTML = viewHtml;
            
            addEventListenersToViewPage(doc, originatingView, document.getElementById(feedbackAreaId), viewContainer);

        } catch (error) { 
            console.error(`DocumentosView.JS: Erro ao renderizar visualização do documento (ID: ${docId}):`, error);
            if (viewContainer) viewContainer.innerHTML = `<p class="feedback-message error p-4">Erro ao carregar dados do documento: ${error.message}</p>`;
        }
    }
    
    async function abrirModalCompartilhamento(item, feedbackAreaEl, storeName) {
        if (!uiModuleRef || !sharingModuleRef || !sharedUtilsRef) {
            globalShowFeedbackRef("Funcionalidade de compartilhamento não está pronta ou suas dependências não foram carregadas.", "error", feedbackAreaEl, 0);
            return;
        }

        let tempSelectedRecipients = [];
        const STORE_MAP = {
            'documents': 'Documento',
            'contribuintes': 'Contribuinte',
        };
        const tipoItem = STORE_MAP[storeName] || 'Item';
        const tituloItem = item.title || item.nome || `ID ${item.id}`;
    
        const modalId = `modal-share-item-${item.id}`;
        const modalContentHtml = `
            <div id="feedback-modal-share-${item.id}" class="mb-3 text-sm"></div>
            <p class="text-sm text-gray-600 dark:text-gray-300 mb-2">Você está compartilhando o item: <strong>${tituloItem}</strong>.</p>
            
            <div class="mb-4">
                <label for="search-share-recipients-${item.id}" class="block text-sm font-medium">Buscar Servidores ou Grupos:</label>
                <input type="search" id="search-share-recipients-${item.id}" class="form-input-text w-full mt-1" placeholder="Digite para buscar...">
                <div id="suggestions-share-recipients-${item.id}" class="max-h-40 overflow-y-auto border dark:border-slate-600 rounded-md mt-1"></div>
            </div>
            
            <div>
                <h4 class="text-sm font-medium">Destinatários Selecionados:</h4>
                <div id="selected-share-recipients-${item.id}" class="mt-1 p-2 border dark:border-slate-500 rounded-md bg-gray-100 dark:bg-slate-700 min-h-[40px] max-h-24 overflow-y-auto">
                    <p class="text-xs text-gray-500">Nenhum destinatário selecionado.</p>
                </div>
            </div>
    
            <div class="mt-4 space-y-2">
                <label class="flex items-center text-sm">
                    <input type="checkbox" id="share-include-vinculos" class="form-checkbox rounded text-blue-600" checked>
                    <span class="ml-2 text-gray-700 dark:text-gray-200">Incluir todos os itens vinculados</span>
                </label>
                <label class="flex items-center text-sm">
                    <input type="checkbox" id="share-include-anexos" class="form-checkbox rounded text-blue-600" checked>
                    <span class="ml-2 text-gray-700 dark:text-gray-200">Incluir anexos físicos (gera arquivo .zip)</span>
                </label>
            </div>
        `;
    
        const modal = uiModuleRef.showModal(`Compartilhar ${tipoItem}`, modalContentHtml, [
            { text: 'Cancelar', class: 'btn-secondary', closesModal: true },
            { 
                text: 'Compartilhar e Notificar', 
                class: 'btn-primary', 
                callback: async () => {
                    if (tempSelectedRecipients.length === 0) {
                        globalShowFeedbackRef("Selecione ao menos um destinatário.", "warning", document.getElementById(`feedback-modal-share-${item.id}`));
                        return false; 
                    }
                    const incluirVinculos = document.getElementById('share-include-vinculos').checked;
                    const incluirAnexos = document.getElementById('share-include-anexos').checked;
    
                    const metaData = await sharingModuleRef.shareItem([{ entityId: item.id, storeName: storeName }], tempSelectedRecipients, { incluirVinculos, incluirAnexos });
                    if (metaData) {
                        sharingModuleRef.prepareNotificationEmail(metaData);
                    }
                    return true;
                },
                closesModal: true
            }
        ], 'max-w-lg', modalId);
        
        const searchInput = modal.querySelector(`#search-share-recipients-${item.id}`);
        const suggestionsContainer = modal.querySelector(`#suggestions-share-recipients-${item.id}`);
        const selectedContainer = modal.querySelector(`#selected-share-recipients-${item.id}`);
        
        const allServers = await dbRef.getAllItems(SERVIDORES_STORE_NAME);
        const allGroups = await dbRef.getAllItems(SERVIDORES_GRUPOS_STORE_NAME);
        
        const allPossibleRecipients = [
            ...allServers.filter(s => !s.isDeleted && s.email).map(s => ({ id: s.id, nome: s.nome, email: s.email, tipo: 'Servidor' })),
            ...allGroups.filter(g => !g.isDeleted).map(g => ({ id: g.id, nome: g.nomeGrupo, tipo: 'Grupo' }))
        ].sort((a,b) => a.nome.localeCompare(b.nome));
    
        const updateSelectedList = () => {
            selectedContainer.innerHTML = tempSelectedRecipients.length > 0 ? '' : '<p class="text-xs text-gray-500">Nenhum destinatário selecionado.</p>';
            tempSelectedRecipients.forEach(rec => {
                const pill = document.createElement('span');
                pill.className = 'inline-flex items-center px-2 py-1 mr-1 mt-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-700 text-blue-800 dark:text-blue-200';
                pill.innerHTML = `<span>${rec.nome} (${rec.tipo})</span> <button data-id="${rec.id}" class="ml-1.5">×</button>`;
                pill.querySelector('button').addEventListener('click', (e) => {
                    tempSelectedRecipients = tempSelectedRecipients.filter(r => r.id !== e.currentTarget.dataset.id);
                    updateSelectedList();
                });
                selectedContainer.appendChild(pill);
            });
        };
    
        searchInput.addEventListener('input', () => {
            const termo = searchInput.value.toLowerCase();
            suggestionsContainer.innerHTML = '';
            if(!termo) return;
    
            const filtered = allPossibleRecipients.filter(r => r.nome.toLowerCase().includes(termo) && !tempSelectedRecipients.some(s => s.id === r.id));
            
            filtered.slice(0, 10).forEach(rec => {
                const itemEl = document.createElement('div');
                itemEl.className = 'p-2 hover:bg-gray-100 dark:hover:bg-slate-600 cursor-pointer text-sm';
                itemEl.textContent = `${rec.nome} (${rec.tipo})`;
                itemEl.addEventListener('click', () => {
                    tempSelectedRecipients.push(rec);
                    searchInput.value = '';
                    suggestionsContainer.innerHTML = '';
                    updateSelectedList();
                });
                suggestionsContainer.appendChild(itemEl);
            });
        });
    }

    function addEventListenersToViewPage(doc, originatingView, feedbackAreaLocal, viewContainerEl) {
        if (!viewContainerEl) return;
        
        viewContainerEl.querySelectorAll('.link-view-related-item').forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                const { id, viewAction, datakey } = e.currentTarget.dataset;

                if (viewAction && appModuleRef && appModuleRef.handleMenuAction) {
                    if (SEFWorkStation.Navigation) {
                        const navData = { [datakey]: id, originatingView: 'visualizar-documento' };
                        SEFWorkStation.Navigation.handleMenuAction(viewAction, navData);
                    }
                }
            });
        });

        viewContainerEl.querySelector('#btn-voltar-view-doc')?.addEventListener('click', () => {
            if (appModuleRef && appModuleRef.navigateBack) {
                appModuleRef.navigateBack();
            } else if (appModuleRef && appModuleRef.handleMenuAction) {
                appModuleRef.handleMenuAction(originatingView || (doc.isTemplate ? 'modelos' : 'gerir-documentos'));
            }
        });

        viewContainerEl.querySelector('#btn-editar-doc-view')?.addEventListener('click', () => {
            if (documentosFormModuleRef && documentosFormModuleRef.renderNovoDocumentoForm) {
                documentosFormModuleRef.renderNovoDocumentoForm(doc, originatingView);
            }
        });
        
        viewContainerEl.querySelector('#btn-usar-modelo-view')?.addEventListener('click', () => {
            if (documentosFormModuleRef && documentosFormModuleRef.renderNovoDocumentoForm) {
                documentosFormModuleRef.renderNovoDocumentoForm(doc, originatingView, true);
            }
        });

        viewContainerEl.querySelector('#btn-share-doc-view')?.addEventListener('click', () => {
            abrirModalCompartilhamento(doc, feedbackAreaLocal, DOCUMENTS_STORE_NAME);
        });

        viewContainerEl.querySelector('#btn-excluir-doc-view')?.addEventListener('click', async () => {
            if (confirm(`Tem certeza que deseja mover o documento "${doc.title || 'ID ' + doc.id}" para a lixeira?`)) {
                const docParaLixeira = await dbRef.getItemById(DOCUMENTS_STORE_NAME, doc.id);
                if (docParaLixeira) {
                    docParaLixeira.isDeleted = true;
                    docParaLixeira.modificationDate = new Date().toISOString();
                    await dbRef.updateItem(DOCUMENTS_STORE_NAME, docParaLixeira);
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Documento movido para a lixeira.", "success", feedbackAreaLocal);
                    if (refreshApplicationStateRef) await refreshApplicationStateRef();
                    if (appModuleRef && appModuleRef.navigateBack) appModuleRef.navigateBack();
                    else if (appModuleRef && appModuleRef.handleMenuAction) appModuleRef.handleMenuAction(originatingView || (doc.isTemplate ? 'modelos' : 'gerir-documentos'));
                }
            }
        });
        
        viewContainerEl.querySelector('#btn-restaurar-doc-view')?.addEventListener('click', async () => {
            doc.isDeleted = false;
            doc.modificationDate = new Date().toISOString();
            await dbRef.updateItem(DOCUMENTS_STORE_NAME, doc);
            if (globalShowFeedbackRef) globalShowFeedbackRef("Documento restaurado da lixeira.", "success", feedbackAreaLocal);
            if (refreshApplicationStateRef) await refreshApplicationStateRef();
            renderVisualizarDocumentoPage(doc.id, originatingView);
        });

        viewContainerEl.querySelector('#btn-excluir-permanente-doc-view')?.addEventListener('click', async () => {
             if (confirm(`EXCLUSÃO PERMANENTE: Tem certeza que deseja excluir permanentemente o documento "${doc.title || 'ID ' + doc.id}"? Esta ação NÃO PODE ser desfeita e os anexos serão apagados.`)) {
                if (window.SEFWorkStation && window.SEFWorkStation.SharedUtils && typeof window.SEFWorkStation.SharedUtils.tryDeleteEntityAttachmentFolder === 'function') {
                   await window.SEFWorkStation.SharedUtils.tryDeleteEntityAttachmentFolder('documents', doc.id, globalShowFeedbackRef, feedbackAreaLocal);
                }

                if (window.SEFWorkStation && window.SEFWorkStation.SharedUtils && typeof window.SEFWorkStation.SharedUtils.desvincularEntidadeDeTodasAsOutras === 'function') {
                    await window.SEFWorkStation.SharedUtils.desvincularEntidadeDeTodasAsOutras(doc.id, DOCUMENTS_STORE_NAME, dbRef);
                }

                await dbRef.deleteItem(DOCUMENTS_STORE_NAME, doc.id);
                if (globalShowFeedbackRef) globalShowFeedbackRef("Documento excluído permanentemente.", "success", feedbackAreaLocal);
                if (refreshApplicationStateRef) await refreshApplicationStateRef();
                
                if (appModuleRef && appModuleRef.navigateBack) appModuleRef.navigateBack();
                else if (appModuleRef && appModuleRef.handleMenuAction) appModuleRef.handleMenuAction(originatingView || 'lixeira-global');
            }
        });

        viewContainerEl.querySelector('#btn-imprimir-doc-view')?.addEventListener('click', () => {
            document.body.classList.add('sef-printing-content');
            window.print();
            document.body.classList.remove('sef-printing-content');
        });

        viewContainerEl.querySelector('#btn-copiar-conteudo-doc-view')?.addEventListener('click', async () => {
            const conteudoEl = viewContainerEl.querySelector('#doc-view-corpo-content');
            if (conteudoEl) {
                const tempEl = document.createElement('div');
                tempEl.innerHTML = conteudoEl.innerHTML;
                try {
                    const blobHtml = new Blob([tempEl.innerHTML], { type: 'text/html' });
                    const blobText = new Blob([tempEl.innerText || tempEl.textContent], { type: 'text/plain' });
                    await navigator.clipboard.write([
                        new ClipboardItem({
                            'text/html': blobHtml,
                            'text/plain': blobText
                        })
                    ]);
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Conteúdo copiado para a área de transferência!", "success", feedbackAreaLocal);
                } catch (err) {
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Falha ao copiar conteúdo.", "error", feedbackAreaLocal);
                 }
            } else {
                if (globalShowFeedbackRef) globalShowFeedbackRef("Elemento de conteúdo não encontrado.", "error", feedbackAreaLocal);
             }
        });

        viewContainerEl.querySelector('#btn-enviar-email-doc-view')?.addEventListener('click', () => {
            if (!appModuleRef || typeof appModuleRef.handleMenuAction !== 'function') {
                if (globalShowFeedbackRef && feedbackAreaLocal) globalShowFeedbackRef("Erro: Funcionalidade de navegação da aplicação não está disponível.", "error", localFeedbackArea);
                return;
            }
            if (!doc) {
                if (globalShowFeedbackRef && feedbackAreaLocal) globalShowFeedbackRef("Erro: Documento não carregado para envio.", "error", localFeedbackArea);
                return;
            }

            const anexosParaCompositor = (doc.anexos || []).map(anexo => ({
                fileName: anexo.fileName,
                filePath: anexo.filePath,
                fileSize: anexo.fileSize,
                id: anexo.id || anexo.fileName,
                ownerType: 'documento',
                ownerId: doc.id
            }));

            const dadosParaCompositor = {
                assunto: doc.title || "Documento Sem Título",
                corpoHtml: doc.content || "",
                anexos: anexosParaCompositor,
                origem: "documento",
                idEntidadeOrigem: doc.id,
                originatingView: 'view-documento'
            };
            appModuleRef.handleMenuAction('escrever-email', dadosParaCompositor);
        });

        const btnAnterior = viewContainerEl.querySelector('#btn-anterior-doc-view');
        const btnProximo = viewContainerEl.querySelector('#btn-proximo-doc-view');

        if (SEFWorkStation.Documentos && typeof SEFWorkStation.Documentos.getLastRenderedDocListIds === 'function') {
            const cachedDocIds = SEFWorkStation.Documentos.getLastRenderedDocListIds();
            const originatingListOfThisView = SEFWorkStation.Documentos.getLastRenderedOriginatingView();

            if (cachedDocIds && cachedDocIds.length > 0 && (originatingView === originatingListOfThisView || originatingView === 'acesso-rapido')) {
                const currentIndex = cachedDocIds.indexOf(String(doc.id));

                if (btnAnterior) {
                    if (currentIndex > 0) {
                        btnAnterior.disabled = false;
                        btnAnterior.onclick = () => {
                            renderVisualizarDocumentoPage(cachedDocIds[currentIndex - 1], originatingView);
                        }
                    } else {
                        btnAnterior.disabled = true;
                    }
                }
                if (btnProximo) {
                    if (currentIndex !== -1 && currentIndex < cachedDocIds.length - 1) {
                        btnProximo.disabled = false;
                        btnProximo.onclick = () => {
                            renderVisualizarDocumentoPage(cachedDocIds[currentIndex + 1], originatingView);
                        }
                    } else {
                        btnProximo.disabled = true;
                    }
                }
            } else {
                if(btnAnterior) btnAnterior.disabled = true;
                if(btnProximo) btnProximo.disabled = true;
            }
        } else {
             if(btnAnterior) btnAnterior.disabled = true;
             if(btnProximo) btnProximo.disabled = true;
        }

        viewContainerEl.querySelector('#btn-nova-nota-para-documento')?.addEventListener('click', () => {
            if (appModuleRef && typeof appModuleRef.handleMenuAction === 'function') {
                appModuleRef.handleMenuAction('nova-nota-rapida', {
                    originatingView: 'view-documento',
                    preSelectedLink: { type: 'documento', id: doc.id }
                });
            } else {
                if (globalShowFeedbackRef && feedbackAreaLocal) globalShowFeedbackRef("Funcionalidade de Notas Rápidas não disponível.", "error", feedbackAreaLocal);
                console.error("DocumentosView.JS: appModuleRef.handleMenuAction não está disponível para criar nova nota.");
            }
        });

        viewContainerEl.querySelectorAll('.nota-post-it-vinculada').forEach(notaCard => {
            notaCard.addEventListener('click', async () => {
                const notaId = notaCard.dataset.notaId;
                if (SEFWorkStation.NotasRapidasView && SEFWorkStation.NotasRapidasView.renderVisualizarNotaPage) {
                     SEFWorkStation.NotasRapidasView.renderVisualizarNotaPage(notaId, 'view-documento');
                }
            });
        });

        viewContainerEl.querySelectorAll('.btn-download-anexo').forEach(button => {
            button.addEventListener('click', async (event) => {
                const anexoPath = event.currentTarget.dataset.anexoPath;
                const anexoFileName = event.currentTarget.dataset.anexoName;
                const feedbackElLocal = document.getElementById(feedbackAreaId);
                
                if (!sharedUtilsRef || !sharedUtilsRef.downloadAttachment) {
                    if (globalShowFeedbackRef && feedbackElLocal) globalShowFeedbackRef("Função de download não disponível.", "error", feedbackElLocal);
                    return;
                }
                
                sharedUtilsRef.downloadAttachment(anexoPath, anexoFileName);
            });
        });
    }

    return {
        init,
        renderVisualizarDocumentoPage,
        abrirModalCompartilhamento 
    };
})();