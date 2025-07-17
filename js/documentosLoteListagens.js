// js/documentosLoteListagens.js
// v1.1.0 - Remove classe page-section para expandir a largura da visualização.
// v1.0.0 - Versão inicial

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.DocumentosLoteListagens = (function() {
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let dbRef;
    let appModuleRef;
    let uiModuleRef; 

    const LOTES_DE_DOCUMENTOS_STORE_NAME = 'lotesDeDocumentosStore';
    const DOCUMENTS_STORE_NAME = 'documents'; 
    const CONTRIBUINTES_STORE_NAME = 'contribuintes'; 
    const DOCUMENT_CATEGORIES_STORE_NAME = 'documentCategories';
    const DOCUMENT_TAGS_STORE_NAME = 'documentTags';


    function init(mainWrapper, showFeedbackFunc, clearFeedbackFunc, dbModuleRef, applicationModuleRef) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedbackFunc;
        globalClearFeedbackRef = clearFeedbackFunc;
        dbRef = dbModuleRef;
        appModuleRef = applicationModuleRef;
        uiModuleRef = window.SEFWorkStation.UI;

        if (!dbRef) console.error("DocumentosLoteListagens.JS: init - Referência ao DB não fornecida!");
        if (!mainContentWrapperRef) console.error("DocumentosLoteListagens.JS: init - mainContentWrapperRef não fornecido.");
        if (!appModuleRef) console.error("DocumentosLoteListagens.JS: init - appModuleRef não fornecido.");
        if (!uiModuleRef) console.warn("DocumentosLoteListagens.JS: init - Módulo UI não disponível.");
        console.log("DocumentosLoteListagens.JS: Módulo inicializado (v1.1.0).");
    }

    async function imprimirDocumentosDoLote(loteId, feedbackAreaEl) {
        if (globalClearFeedbackRef && feedbackAreaEl) globalClearFeedbackRef(feedbackAreaEl);
        if (globalShowFeedbackRef && feedbackAreaEl) globalShowFeedbackRef("Preparando documentos do lote para impressão...", "info", feedbackAreaEl, 0);

        try {
            const lote = await dbRef.getItemById(LOTES_DE_DOCUMENTOS_STORE_NAME, loteId);
            if (!lote || !lote.idsDocumentosGerados || lote.idsDocumentosGerados.length === 0) {
                if (globalShowFeedbackRef && feedbackAreaEl) globalShowFeedbackRef("Nenhum documento encontrado neste lote para impressão.", "warning", feedbackAreaEl);
                return;
            }

            let htmlImpressaoConcatenado = `
                <html>
                <head>
                    <title>Impressão do Lote: ${lote.nomeLote || `ID ${lote.id}`}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 15mm; line-height: 1.5; color: #000000 !important; }
                        .documento-para-impressao { page-break-after: always; border-bottom: 1px dashed #ccc; padding-bottom: 15mm; margin-bottom:15mm; }
                        .documento-para-impressao:last-child { page-break-after: auto; border-bottom: none; margin-bottom:0; padding-bottom:0;}
                        h1, h2, h3, h4, h5, h6 { page-break-after: avoid; margin-top: 0.5em; color: #000000 !important; }
                        table, figure { page-break-inside: avoid; }
                        img { max-width: 100% !important; height: auto !important; }
                        .prose { max-width: none; color: #000000 !important; }
                        .prose p, .prose li, .prose div, .prose span, .prose table, .prose tr, .prose td, .prose th,
                        .prose strong, .prose em, .prose b, .prose i, .prose u, .prose s, .prose a, .prose code, .prose pre {
                            color: #000000 !important; 
                        }
                        @media print {
                            body { margin: 15mm !important; font-size: 12pt; }
                            .documento-para-impressao { margin-bottom: 15mm; padding-bottom: 15mm; }
                            .documento-para-impressao h2 { font-size: 1.5em !important; margin-bottom: 1em !important; border-bottom: 1px solid #ccc !important; padding-bottom: 0.5em !important; color: #000000 !important;}
                        }
                    </style>
                </head>
                <body>
            `;

            for (let i = 0; i < lote.idsDocumentosGerados.length; i++) {
                const docId = lote.idsDocumentosGerados[i];
                const doc = await dbRef.getItemById(DOCUMENTS_STORE_NAME, docId);
                if (doc && !doc.isDeleted) { 
                    htmlImpressaoConcatenado += `<div class="documento-para-impressao">`;
                    htmlImpressaoConcatenado += `<h2 style="font-size: 1.5em; margin-bottom: 1em; border-bottom: 1px solid #ccc; padding-bottom: 0.5em; color: #000000 !important;">${doc.title || 'Documento Sem Título'}</h2>`;
                    htmlImpressaoConcatenado += `<div class="prose">${doc.content || '<p><em>Documento sem conteúdo.</em></p>'}</div>`;
                    htmlImpressaoConcatenado += `</div>`;
                }
            }
            htmlImpressaoConcatenado += `</body></html>`;

            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.width = '1px';
            iframe.style.height = '1px';
            iframe.style.left = '-9999px'; 
            document.body.appendChild(iframe);

            iframe.contentDocument.open();
            iframe.contentDocument.write(htmlImpressaoConcatenado);
            iframe.contentDocument.close();

            const printPromise = new Promise((resolve) => {
                let printed = false;
                iframe.contentWindow.onbeforeprint = () => {
                    if (globalShowFeedbackRef && feedbackAreaEl) globalShowFeedbackRef("Enviando para impressora...", "info", feedbackAreaEl, 0);
                };
                iframe.contentWindow.onafterprint = () => {
                    if (globalShowFeedbackRef && feedbackAreaEl) globalShowFeedbackRef("Impressão concluída ou cancelada.", "success", feedbackAreaEl);
                    document.body.removeChild(iframe);
                    printed = true;
                    resolve();
                };

                iframe.contentWindow.focus();
                const printResult = iframe.contentWindow.print();
                
                if (printResult === undefined) { 
                    setTimeout(() => {
                        if (!printed) {
                           if (globalShowFeedbackRef && feedbackAreaEl) globalShowFeedbackRef("A janela de impressão pode ter sido fechada ou bloqueada.", "warning", feedbackAreaEl, 7000);
                            document.body.removeChild(iframe);
                            resolve(); 
                        }
                    }, 2000);
                }
            });
            await printPromise;

        } catch (error) {
            if (globalShowFeedbackRef && feedbackAreaEl) globalShowFeedbackRef(`Erro ao imprimir lote: ${error.message}`, "error", feedbackAreaEl);
        } finally {
             if (globalClearFeedbackRef && feedbackAreaEl && globalShowFeedbackRef) {
                 setTimeout(() => {
                     const currentFeedbackEl = document.getElementById(feedbackAreaEl.id);
                     if (currentFeedbackEl) { 
                        globalClearFeedbackRef(currentFeedbackEl);
                     }
                 }, 7000);
            }
        }
    }

    async function renderGerenciarLotesPage() {
        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (!mainContentWrapperRef) {
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico ao tentar renderizar a página de gerenciamento de lotes.", "error");
            return;
        }
        // REMOVIDA CLASSE page-section
        mainContentWrapperRef.innerHTML = `<div id="gerenciar-lotes-container"><p class="loading-text p-4">Carregando histórico de lotes...</p></div>`;

        const feedbackAreaId = "feedback-gerenciar-lotes";
        const container = document.getElementById('gerenciar-lotes-container');

        try {
            const lotes = await dbRef.getAllItems(LOTES_DE_DOCUMENTOS_STORE_NAME);
            lotes.sort((a, b) => new Date(b.dataGeracao) - new Date(a.dataGeracao));

            let pageHtml = `
                <h2 class="text-xl font-semibold mb-4">Gerenciar Lotes de Documentos Gerados</h2>
                <p class="text-sm text-gray-600 dark:text-gray-300 mb-6">
                    Aqui você pode visualizar o histórico de todas as operações de geração de documentos em lote.
                </p>
                <div id="${feedbackAreaId}" class="mb-4"></div>
            `;

            if (lotes.length === 0) {
                pageHtml += '<p class="text-center text-gray-500 dark:text-gray-400 py-8">Nenhum lote de documentos foi gerado ainda.</p>';
            } else {
                pageHtml += `
                    <div class="table-list-container">
                        <table class="documentos-table">
                            <thead>
                                <tr>
                                    <th>Nome do Lote</th>
                                    <th>Data da Geração</th>
                                    <th>Modelo Utilizado</th>
                                    <th class="text-center">Docs Gerados</th>
                                    <th class="text-center">Status</th>
                                    <th class="text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
                for (const lote of lotes) {
                    const statusClass = lote.statusDaGeracao === "Concluído com sucesso"
                        ? "bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-200"
                        : (lote.statusDaGeracao === "Concluído com erros" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-600 dark:text-yellow-200" : "bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-200");
                    
                    let modeloTitulo = `ID ${lote.modeloUsadoId}`;
                    try {
                        const modelo = await dbRef.getItemById(DOCUMENTS_STORE_NAME, lote.modeloUsadoId);
                        if (modelo && modelo.title) {
                            modeloTitulo = modelo.title;
                        }
                    } catch(e) { /* ignora */ }


                    pageHtml += `
                        <tr data-lote-id="${lote.id}">
                            <td class="py-2 px-3">${lote.nomeLote || 'Lote Sem Nome'}</td>
                            <td class="py-2 px-3">${new Date(lote.dataGeracao).toLocaleString()}</td>
                            <td class="py-2 px-3">${modeloTitulo}</td>
                            <td class="py-2 px-3 text-center">${lote.idsDocumentosGerados ? lote.idsDocumentosGerados.length : 0} / ${lote.totalDocumentosTentados || 0}</td>
                            <td class="py-2 px-3 text-center"><span class="px-2 py-0.5 text-xs font-medium rounded-full ${statusClass}">${lote.statusDaGeracao}</span></td>
                            <td class="actions-cell text-center py-2 px-3">
                                <button class="btn-secondary btn-visualizar-detalhes-lote text-xs py-1 px-2 rounded mr-1" data-lote-id="${lote.id}" title="Visualizar Detalhes do Lote">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-card-list inline-block" viewBox="0 0 16 16"><path d="M14.5 3a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h13zm-13-1A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-13z"/><path d="M5 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 5 8zm0-2.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm0 5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-1-5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0zM4 8a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0zm0 2.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z"/></svg> Detalhes
                                </button>
                                <button class="btn-primary btn-imprimir-lote text-xs py-1 px-2 rounded mr-1" data-lote-id="${lote.id}" title="Imprimir Documentos do Lote">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-printer-fill inline-block" viewBox="0 0 16 16"><path d="M5 1a2 2 0 0 0-2 2v1h10V3a2 2 0 0 0-2-2H5zm6 8H5a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1z"/><path d="M0 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1v-2a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2H2a2 2 0 0 1-2-2V7zm2.5 1a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z"/></svg> Imprimir Lote
                                </button>
                                <button class="btn-delete btn-excluir-registro-lote text-xs py-1 px-2 rounded" data-lote-id="${lote.id}" title="Excluir Registro do Lote">
                                     <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-trash3-fill inline-block" viewBox="0 0 16 16"><path d="M11 1.5v1h3.5a.5.5 0 0 1 0 1h-.538l-.853 10.66A2 2 0 0 1 11.115 16h-6.23a2 2 0 0 1-1.994-1.84L2.038 3.5H1.5a.5.5 0 0 1 0-1H5v-1A1.5 1.5 0 0 1 6.5 0h3A1.5 1.5 0 0 1 11 1.5Zm-5 0v1h4v-1a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5ZM4.5 5.029l.5 8.5a.5.5 0 1 0 .998-.06l-.5-8.5a.5.5 0 1 0-.998.06Zm6.53-.528a.5.5 0 0 0-.528.47l-.5 8.5a.5.5 0 0 0 .998.058l.5-8.5a.5.5 0 0 0-.47-.528ZM8 4.5a.5.5 0 0 0-.5.5v8.5a.5.5 0 0 0 1 0V5a.5.5 0 0 0-.5-.5Z"/></svg> Excluir
                                </button>
                            </td>
                        </tr>
                    `;
                }
                pageHtml += '</tbody></table></div>';
            }
            container.innerHTML = pageHtml;
            addEventListenersGerenciarLotes(document.getElementById(feedbackAreaId));

        } catch (error) {
            container.innerHTML = `<p class="feedback-message error p-4">Erro ao carregar histórico de lotes: ${error.message}</p>`;
            if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao carregar lotes: ${error.message}`, "error");
        }
    }

    async function construirDetalhesLoteHtml(lote) {
        let modeloTitulo = `ID ${lote.modeloUsadoId}`;
        try {
            const modelo = await dbRef.getItemById(DOCUMENTS_STORE_NAME, lote.modeloUsadoId);
            if (modelo && modelo.title) {
                modeloTitulo = modelo.title;
            }
        } catch(e) { /* ignora */ }

        let detalhesHtml = `
            <div class="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <p><strong>Data da Geração:</strong> ${new Date(lote.dataGeracao).toLocaleString()}</p>
                <p><strong>Modelo Utilizado:</strong> ${modeloTitulo}</p>
                <p><strong>Status:</strong> <span class="font-semibold ${lote.statusDaGeracao === "Concluído com sucesso" ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}">${lote.statusDaGeracao}</span></p>
                <p><strong>Documentos Gerados:</strong> ${lote.idsDocumentosGerados ? lote.idsDocumentosGerados.length : 0} de ${lote.totalDocumentosTentados || 0} tentativas.</p>
                ${lote.configuracoesLote && lote.configuracoesLote.padraoTitulo ? `<p><strong>Padrão de Título Usado:</strong> ${lote.configuracoesLote.padraoTitulo}</p>` : ''}
                ${lote.configuracoesLote && lote.configuracoesLote.categoriasPadrao && lote.configuracoesLote.categoriasPadrao.length > 0 ? `<p><strong>Categorias Padrão Aplicadas:</strong> ${lote.configuracoesLote.categoriasPadrao.join(', ')}</p>` : ''}
                ${lote.configuracoesLote && lote.configuracoesLote.tagsPadrao && lote.configuracoesLote.tagsPadrao.length > 0 ? `<p><strong>Tags Padrão Aplicadas:</strong> ${lote.configuracoesLote.tagsPadrao.join(', ')}</p>` : ''}
            </div>
        `;

        if (lote.idsDocumentosGerados && lote.idsDocumentosGerados.length > 0) {
            detalhesHtml += `<h5 class="text-sm font-semibold mt-3 mb-1 text-gray-800 dark:text-gray-100">Documentos Gerados com Sucesso:</h5>
                             <ul class="list-disc list-inside text-xs max-h-32 overflow-y-auto bg-gray-50 dark:bg-slate-700 p-2 rounded space-y-1">`;
            for (const docId of lote.idsDocumentosGerados) {
                try {
                    const doc = await dbRef.getItemById(DOCUMENTS_STORE_NAME, docId);
                    const docTitle = doc ? doc.title : `ID ${docId}`;
                    let nomeContribuinteParaDoc = "Contribuinte não identificado";

                    if (doc && doc.relatedContribuintes && doc.relatedContribuintes.length > 0) {
                        const contribId = doc.relatedContribuintes[0];
                        const contrib = await dbRef.getItemById(CONTRIBUINTES_STORE_NAME, contribId);
                        if (contrib) nomeContribuinteParaDoc = contrib.nome || `ID ${contribId}`;
                    } else {
                        const indexDoc = lote.idsDocumentosGerados.indexOf(docId);
                        if (lote.idsContribuintesProcessados && lote.idsContribuintesProcessados[indexDoc]) {
                            const contribId = lote.idsContribuintesProcessados[indexDoc];
                            const contrib = await dbRef.getItemById(CONTRIBUINTES_STORE_NAME, contribId);
                            if (contrib) nomeContribuinteParaDoc = contrib.nome || `ID ${contribId}`;
                        }
                    }
                    detalhesHtml += `<li><a href="#" class="link-visualizar-doc-lote-detalhe text-blue-600 hover:underline dark:text-blue-400" data-doc-id="${docId}">${docTitle}</a> (Para: ${nomeContribuinteParaDoc})</li>`;
                } catch (e) {
                    detalhesHtml += `<li>Documento ID ${docId} (Erro ao buscar detalhes)</li>`;
                }
            }
            detalhesHtml += `</ul>`;
        }

        if (lote.idsContribuintesProcessados && lote.idsContribuintesProcessados.length > 0 && (!lote.idsDocumentosGerados || lote.idsDocumentosGerados.length === 0)) {
            detalhesHtml += `<h5 class="text-sm font-semibold mt-3 mb-1 text-gray-800 dark:text-gray-100">Contribuintes Processados (Tentativas):</h5>
                             <ul class="list-disc list-inside text-xs max-h-32 overflow-y-auto bg-gray-50 dark:bg-slate-700 p-2 rounded space-y-1">`;
            for (const contribId of lote.idsContribuintesProcessados) {
                 try {
                    const contrib = await dbRef.getItemById(CONTRIBUINTES_STORE_NAME, contribId);
                    const nomeContribuinte = contrib ? contrib.nome : `ID ${contribId}`;
                    detalhesHtml += `<li><a href="#" class="link-visualizar-contrib-lote-detalhe text-blue-600 hover:underline dark:text-blue-400" data-contrib-id="${contribId}">${nomeContribuinte}</a></li>`;
                } catch (e) {
                    detalhesHtml += `<li>Contribuinte ID ${contribId} (Erro ao buscar nome)</li>`;
                }
            }
            detalhesHtml += `</ul>`;
        }

        if (lote.detalhesErros && lote.detalhesErros.length > 0) {
            detalhesHtml += `<h5 class="text-sm font-semibold mt-3 mb-1 text-red-600 dark:text-red-400">Detalhes dos Erros:</h5>
                             <ul class="list-disc list-inside text-xs max-h-32 overflow-y-auto bg-red-50 dark:bg-red-900/30 p-2 rounded text-red-700 dark:text-red-300 space-y-1">`;
            for (const err of lote.detalhesErros) {
                 let nomeContribuinteParaErro = `ID ${err.contribuinteId}`;
                if (err.contribuinteNome) {
                    nomeContribuinteParaErro = err.contribuinteNome;
                } else if (err.contribuinteId) {
                    try {
                        const contrib = await dbRef.getItemById(CONTRIBUINTES_STORE_NAME, err.contribuinteId);
                        if(contrib) nomeContribuinteParaErro = contrib.nome || `ID ${err.contribuinteId}`;
                    } catch(e) { /* Mantém o ID */ }
                }
                detalhesHtml += `<li>Contribuinte: ${nomeContribuinteParaErro} - Erro: ${err.erro}</li>`;
            }
            detalhesHtml += `</ul>`;
        }
        
        detalhesHtml += `<hr class="my-4 dark:border-slate-600">
                         <h5 class="text-sm font-semibold mb-2 text-gray-800 dark:text-gray-100">Ações em Lote para Documentos Gerados:</h5>
                         <div class="space-y-3">
                            <div>
                                <label for="acao-em-lote-docs-select" class="block text-xs font-medium text-gray-700 dark:text-gray-300">Ação:</label>
                                <select id="acao-em-lote-docs-select" class="form-input-text mt-1 block w-full text-sm">
                                    <option value="">Selecione uma ação...</option>
                                    <option value="add_categoria">Adicionar Categoria</option>
                                    <option value="remove_categoria">Remover Categoria</option>
                                    <option value="add_tag">Adicionar Tag</option>
                                    <option value="remove_tag">Remover Tag</option>
                                    <option value="mover_lixeira">Mover para Lixeira</option>
                                </select>
                            </div>
                            <div id="container-valor-acao-lote-docs" class="hidden">
                                <label for="valor-acao-em-lote-docs-select" class="block text-xs font-medium text-gray-700 dark:text-gray-300">Valor:</label>
                                <select id="valor-acao-em-lote-docs-select" class="form-input-text mt-1 block w-full text-sm"></select>
                                <input type="text" id="valor-acao-em-lote-docs-input" class="form-input-text mt-1 block w-full text-sm hidden" placeholder="Nova tag...">
                            </div>
                            <button id="btn-executar-acao-em-lote-docs" class="btn-primary btn-sm w-full text-sm">Executar Ação nos Documentos do Lote</button>
                         </div>
                         <div id="feedback-acao-lote-docs" class="text-xs mt-2"></div>
                         `;

        return detalhesHtml;
    }

    function addEventListenersAcoesLoteNoModal(modalElement, lote, feedbackAreaPrincipal) {
        const acaoSelect = modalElement.querySelector('#acao-em-lote-docs-select');
        const valorContainer = modalElement.querySelector('#container-valor-acao-lote-docs');
        const valorSelect = modalElement.querySelector('#valor-acao-em-lote-docs-select');
        const valorInput = modalElement.querySelector('#valor-acao-em-lote-docs-input');
        const btnExecutarAcao = modalElement.querySelector('#btn-executar-acao-em-lote-docs');
        const feedbackAcaoLoteEl = modalElement.querySelector('#feedback-acao-lote-docs');

        if (!acaoSelect || !valorContainer || !valorSelect || !valorInput || !btnExecutarAcao || !feedbackAcaoLoteEl) {
             console.error("DocumentosLoteListagens.JS: Erro ao encontrar elementos de ações em lote no modal.");
             return;
        }

        acaoSelect.addEventListener('change', async () => {
            const acao = acaoSelect.value;
            valorContainer.classList.add('hidden');
            valorSelect.classList.add('hidden');
            valorInput.classList.add('hidden');
            valorSelect.innerHTML = '';
            valorInput.value = '';

            if (acao === 'add_categoria' || acao === 'remove_categoria') {
                const categorias = await dbRef.getAllItems(DOCUMENT_CATEGORIES_STORE_NAME);
                valorSelect.innerHTML = '<option value="">Selecione uma categoria...</option>' + categorias.sort((a,b)=>a.name.localeCompare(b.name)).map(c => `<option value="${c.name}">${SEFWorkStation.DocumentosCategorias.formatCategoryNameForDisplay(c.name)}</option>`).join('');
                valorContainer.classList.remove('hidden');
                valorSelect.classList.remove('hidden');
            } else if (acao === 'add_tag' || acao === 'remove_tag') {
                const tags = await dbRef.getAllItems(DOCUMENT_TAGS_STORE_NAME);
                valorSelect.innerHTML = '<option value="">Selecione uma tag...</option>' + tags.sort((a,b)=>a.name.localeCompare(b.name)).map(t => `<option value="${t.name}">${t.name}</option>`).join('');
                if (acao === 'add_tag') {
                    valorSelect.innerHTML += '<option value="__nova_tag__">(Criar Nova Tag)</option>';
                }
                valorContainer.classList.remove('hidden');
                valorSelect.classList.remove('hidden');
            }
        });

        valorSelect.addEventListener('change', () => {
            if (valorSelect.value === '__nova_tag__') {
                valorInput.classList.remove('hidden');
                valorInput.placeholder = "Nome da nova tag";
                valorInput.focus();
            } else {
                valorInput.classList.add('hidden');
                valorInput.value = '';
            }
        });
        
        btnExecutarAcao.addEventListener('click', async () => {
            const acao = acaoSelect.value;
            let valor = valorSelect.value === '__nova_tag__' ? valorInput.value.trim() : valorSelect.value;
            
            if (!acao) {
                feedbackAcaoLoteEl.textContent = 'Por favor, selecione uma ação.';
                feedbackAcaoLoteEl.className = 'text-xs text-red-500 dark:text-red-300'; return;
            }
            if ((acao.includes('categoria') || (acao.includes('tag') && valorSelect.value !== '__nova_tag__')) && !valor) {
                feedbackAcaoLoteEl.textContent = 'Por favor, selecione/insira um valor para a ação.';
                feedbackAcaoLoteEl.className = 'text-xs text-red-500 dark:text-red-300'; return;
            }
            if (acao === 'add_tag' && valorSelect.value === '__nova_tag__' && !valor) {
                 feedbackAcaoLoteEl.textContent = 'Por favor, digite o nome da nova tag.';
                 feedbackAcaoLoteEl.className = 'text-xs text-red-500 dark:text-red-300'; return;
            }

            feedbackAcaoLoteEl.textContent = 'Processando...';
            feedbackAcaoLoteEl.className = 'text-xs text-blue-600 dark:text-blue-400';
            btnExecutarAcao.disabled = true;

            let processedCount = 0;
            let errorCount = 0;

            if (acao === 'add_tag' && valorSelect.value === '__nova_tag__') {
                if (!SEFWorkStation.DocumentosTags.isValidTagName(valor)) {
                    feedbackAcaoLoteEl.textContent = `Nome de tag inválido: "${valor}".`;
                    feedbackAcaoLoteEl.className = 'text-xs text-red-500 dark:text-red-300';
                    btnExecutarAcao.disabled = false;
                    return;
                }
                const tagsExistentes = await dbRef.getAllItems(DOCUMENT_TAGS_STORE_NAME);
                if (!tagsExistentes.some(t => t.name.toLowerCase() === valor.toLowerCase())) {
                    await dbRef.addItem(DOCUMENT_TAGS_STORE_NAME, {id: appModuleRef.generateUUID(), name: valor });
                    if (appModuleRef && appModuleRef.refreshApplicationState) await appModuleRef.refreshApplicationState();
                }
            }

            for (const docId of lote.idsDocumentosGerados) {
                try {
                    const doc = await dbRef.getItemById(DOCUMENTS_STORE_NAME, docId);
                    if (!doc || (acao !== 'mover_lixeira' && doc.isDeleted) ) continue;

                    let changed = false;
                    doc.categories = doc.categories || [];
                    doc.tags = doc.tags || [];

                    if (acao === 'add_categoria' && !doc.categories.includes(valor)) {
                        doc.categories.push(valor); changed = true;
                    } else if (acao === 'remove_categoria' && doc.categories.includes(valor)) {
                        doc.categories = doc.categories.filter(c => c !== valor); changed = true;
                    } else if (acao === 'add_tag' && !doc.tags.includes(valor)) {
                        doc.tags.push(valor); changed = true;
                    } else if (acao === 'remove_tag' && doc.tags.includes(valor)) {
                        doc.tags = doc.tags.filter(t => t !== valor); changed = true;
                    } else if (acao === 'mover_lixeira' && !doc.isDeleted) {
                        doc.isDeleted = true;
                        if (window.SEFWorkStation.SharedUtils && typeof window.SEFWorkStation.SharedUtils.desvincularEntidadeDeTodasAsOutras === 'function') {
                            await window.SEFWorkStation.SharedUtils.desvincularEntidadeDeTodasAsOutras(doc.id, DOCUMENTS_STORE_NAME, dbRef);
                        }
                        changed = true;
                    }

                    if (changed) {
                        doc.modificationDate = new Date().toISOString();
                        await dbRef.updateItem(DOCUMENTS_STORE_NAME, doc);
                        processedCount++;
                    }
                } catch (err) { errorCount++; console.error(`Erro ao processar doc ID ${docId} na ação em lote:`, err); }
            }
            feedbackAcaoLoteEl.textContent = `${processedCount} documento(s) afetado(s). ${errorCount > 0 ? errorCount + ' erro(s).' : ''}`;
            feedbackAcaoLoteEl.className = `text-xs ${errorCount > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`;
            btnExecutarAcao.disabled = false;
            if (appModuleRef && appModuleRef.refreshApplicationState) await appModuleRef.refreshApplicationState();
            
            await renderGerenciarLotesPage(); 
            uiModuleRef.closeModal(); 
        });
    }


    function addEventListenersGerenciarLotes(feedbackAreaEl) {
        document.querySelectorAll('.btn-visualizar-detalhes-lote').forEach(button => {
            button.addEventListener('click', async (event) => {
                const loteId = event.currentTarget.dataset.loteId;
                const lote = await dbRef.getItemById(LOTES_DE_DOCUMENTOS_STORE_NAME, loteId);

                if (lote && uiModuleRef && uiModuleRef.showModal) {
                    const detalhesHtml = await construirDetalhesLoteHtml(lote);
                    uiModuleRef.showModal(
                        `Detalhes do Lote: ${lote.nomeLote || `ID ${lote.id}`}`,
                        detalhesHtml,
                        [{ text: 'Fechar', class: 'btn-primary', closesModal: true }],
                        'max-w-lg'
                    );

                    const modalElement = document.querySelector('.fixed.inset-0[role="dialog"]');
                    if (modalElement) {
                        addEventListenersAcoesLoteNoModal(modalElement, lote, feedbackAreaEl);

                        modalElement.querySelectorAll('.link-visualizar-doc-lote-detalhe').forEach(link => {
                            link.addEventListener('click', (e) => {
                                e.preventDefault();
                                const docIdToView = e.currentTarget.dataset.docId;
                                if (appModuleRef && SEFWorkStation.DocumentosView) {
                                    uiModuleRef.closeModal();
                                    SEFWorkStation.DocumentosView.renderVisualizarDocumentoPage(docIdToView, 'gerenciar-lotes-documentos');
                                }
                            });
                        });
                        modalElement.querySelectorAll('.link-visualizar-contrib-lote-detalhe').forEach(link => {
                            link.addEventListener('click', (e) => {
                                e.preventDefault();
                                const contribIdToView = e.currentTarget.dataset.contribId;
                                if (appModuleRef && SEFWorkStation.ContribuintesView) {
                                    uiModuleRef.closeModal();
                                    SEFWorkStation.ContribuintesView.renderVisualizarContribuintePage(contribIdToView, 'gerenciar-lotes-documentos');
                                }
                            });
                        });
                    }

                } else if (lote) {
                    if(globalShowFeedbackRef) globalShowFeedbackRef(`Detalhes do Lote ID ${loteId}: ${lote.nomeLote}, Modelo: ${lote.modeloUsadoTitulo || lote.modeloUsadoId}, Gerados: ${lote.idsDocumentosGerados ? lote.idsDocumentosGerados.length : 0}/${lote.totalDocumentosTentados}, Status: ${lote.statusDaGeracao}`, 'info', feedbackAreaEl);
                } else {
                    if(globalShowFeedbackRef) globalShowFeedbackRef("Registro do lote não encontrado.", "error", feedbackAreaEl);
                }
            });
        });
        
        document.querySelectorAll('.btn-imprimir-lote').forEach(button => {
            button.addEventListener('click', (event) => {
                const loteId = event.currentTarget.dataset.loteId; 
                imprimirDocumentosDoLote(loteId, feedbackAreaEl);
            });
        });

        document.querySelectorAll('.btn-excluir-registro-lote').forEach(button => {
            button.addEventListener('click', async (event) => {
                const loteId = event.currentTarget.dataset.loteId; 
                if (confirm(`Tem certeza que deseja excluir o REGISTRO deste lote? Os documentos já gerados NÃO serão excluídos.`)) {
                    try {
                        await dbRef.deleteItem(LOTES_DE_DOCUMENTOS_STORE_NAME, loteId);
                        if (globalShowFeedbackRef) globalShowFeedbackRef("Registro do lote excluído com sucesso.", "success", feedbackAreaEl);
                        await renderGerenciarLotesPage();
                    } catch (error) {
                        if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao excluir registro do lote: ${error.message}`, "error", feedbackAreaEl);
                    }
                }
            });
        });
    }

    return {
        init,
        renderGerenciarLotesPage
    };
})();