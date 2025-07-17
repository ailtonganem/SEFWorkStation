// js/contribuintesView.js - Lógica para Visualização de Contribuintes
// v3.1.0 - Adiciona botão "Gerar Dossiê" e integração com dossieGenerator.js.
// v3.0.0 - REFATORADO: Adota novo layout de visualização em cards para melhor clareza.
// v2.12.1 - CORREÇÃO: Injeta dependências para compartilhamento e torna o módulo autossuficiente.
// ... (histórico anterior mantido)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.ContribuintesView = (function() {
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let navigateToListCallback;
    let navigateToFormCallback;
    let refreshApplicationStateRef;
    let dbRef;
    let appModuleRef;
    let uiModuleRef;
    let sharingModuleRef;
    let sharedUtilsRef;
    let dossieGeneratorModuleRef; 

    const CONTRIBUINTES_STORE_NAME = 'contribuintes';
    const DOCUMENTS_STORE_NAME = 'documents';
    const RECURSOS_STORE_NAME = 'recursos';
    const NOTAS_RAPIDAS_STORE_NAME = 'notasRapidasStore';
    const TAREFAS_STORE_NAME = 'tarefasStore';
    const PROTOCOLOS_STORE_NAME = 'protocolosStore';
    const PTAS_STORE_NAME = 'ptasStore';
    const AUTUACOES_STORE_NAME = 'autuacoesStore';
    const EMAILS_GERADOS_STORE_NAME = 'comunicacaoEmailsGeradosStore'; 
    const SERVIDORES_STORE_NAME = 'servidoresStore';
    const SERVIDORES_GRUPOS_STORE_NAME = 'servidoresGruposStore';

    function init(
        mainWrapper,
        showFeedbackFunc,
        clearFeedbackFunc,
        navigateToListCb,
        navigateToFormCbFunc,
        refreshFunc,
        dbModuleRef,
        applicationModuleRef,
        uiRefModule,
        sharingMod,
        utilsMod,
        dossieGeneratorMod 
    ) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedbackFunc;
        globalClearFeedbackRef = clearFeedbackFunc;
        navigateToListCallback = navigateToListCb;
        navigateToFormCallback = navigateToFormCbFunc;
        refreshApplicationStateRef = refreshFunc;
        dbRef = dbModuleRef;
        appModuleRef = applicationModuleRef;
        uiModuleRef = uiRefModule;
        sharingModuleRef = sharingMod;
        sharedUtilsRef = utilsMod;
        dossieGeneratorModuleRef = dossieGeneratorMod; 
        console.log("ContribuintesView.JS: Módulo inicializado (v3.1.0).");
    }

    async function renderEmailsRelacionadosContribuinte(containerId, contribuinteId, feedbackArea) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `<p class="text-sm text-gray-500 dark:text-gray-400">Carregando e-mails...</p>`;

        try {
            const todosEmails = await dbRef.getAllItems(EMAILS_GERADOS_STORE_NAME);
            const emailsRelacionados = todosEmails.filter(email =>
                !email.isDeleted &&
                email.relatedEntities &&
                email.relatedEntities.some(entity => entity.id === contribuinteId && entity.type === 'contribuinte')
            ).sort((a, b) => new Date(b.dataGeracao) - new Date(a.dataGeracao));

            if (emailsRelacionados.length === 0) {
                container.innerHTML = `<p class="text-sm text-gray-500 dark:text-gray-400">Nenhum e-mail relacionado a este contribuinte encontrado.</p>`;
                return;
            }

            let tableHtml = `
                <div class="table-list-container">
                    <table class="documentos-table">
                        <thead>
                            <tr>
                                <th>Assunto</th>
                                <th>Para</th>
                                <th>Data</th>
                                <th class="text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${emailsRelacionados.map(email => `
                                <tr>
                                    <td class="truncate" title="${(email.assunto || '').replace(/"/g, '"')}">${email.assunto || 'Sem Assunto'}</td>
                                    <td class="truncate" title="${(email.para || []).join(', ')}">${(email.para || [])[0] || ''}${(email.para || []).length > 1 ? ` (+${email.para.length - 1})` : ''}</td>
                                    <td>${new Date(email.dataGeracao).toLocaleDateString()}</td>
                                    <td class="actions-cell text-center">
                                        <button class="btn-link btn-visualizar-email-relacionado p-1 text-gray-600 hover:text-blue-600" data-email-id="${email.id}" title="Visualizar E-mail">
                                             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye-fill inline-block" viewBox="0 0 16 16"><path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/><path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/></svg>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>`;
            container.innerHTML = tableHtml;
            
            container.querySelectorAll('.btn-visualizar-email-relacionado').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const emailId = e.currentTarget.dataset.emailId;
                    if(appModuleRef && appModuleRef.handleMenuAction) {
                         appModuleRef.handleMenuAction('visualizar-email-gerado', { 
                             emailId: emailId, 
                             originatingView: 'visualizar-contribuinte',
                             originatingViewData: { contribuinteId: contribuinteId }
                         });
                    }
                });
            });

        } catch (error) {
            console.error("Erro ao renderizar e-mails relacionados ao contribuinte:", error);
            container.innerHTML = `<p class="feedback-message error">Erro ao carregar e-mails: ${error.message}</p>`;
        }
    }
    
    async function renderEstruturaOrganizacional(containerId, contribuinte, feedbackArea) {
        const container = document.getElementById(containerId);
        if (!container) return;

        let html = '';

        if (contribuinte.isMatriz) {
            html += '<h3 class="text-lg font-semibold mb-2">Filiais Vinculadas</h3>';
            try {
                const todasFiliais = await dbRef.getItemsByIndex(CONTRIBUINTES_STORE_NAME, 'matrizId', contribuinte.id);
                const filiaisAtivas = todasFiliais.filter(f => !f.isDeleted);
                if (filiaisAtivas.length > 0) {
                    html += '<ul class="list-disc list-inside space-y-1 pl-2">';
                    filiaisAtivas.forEach(filial => {
                        html += `<li class="text-sm">
                                    <a href="#" class="link-visualizar-contribuinte-relacionado text-blue-600 hover:underline dark:text-blue-400" data-id="${filial.id}">
                                        ${filial.nome} (${filial.cpfCnpj || `ID: ${filial.id.substring(0,8)}...`})
                                    </a>
                                 </li>`;
                    });
                    html += '</ul>';
                } else {
                    html += '<p class="text-sm text-gray-500 dark:text-gray-400">Nenhuma filial vinculada a esta matriz.</p>';
                }
            } catch (e) {
                html += '<p class="feedback-message error">Erro ao carregar filiais.</p>';
                console.error("Erro ao buscar filiais:", e);
            }
        } 
        else if (contribuinte.matrizId) {
            html += '<h3 class="text-lg font-semibold mb-2">Vinculado à Matriz</h3>';
            try {
                const matriz = await dbRef.getItemById(CONTRIBUINTES_STORE_NAME, contribuinte.matrizId);
                if (matriz) {
                    html += `<p class="text-sm">
                                <a href="#" class="link-visualizar-contribuinte-relacionado text-blue-600 hover:underline dark:text-blue-400" data-id="${matriz.id}">
                                    ${matriz.nome} (${matriz.cpfCnpj || `ID: ${matriz.id.substring(0,8)}...`})
                                </a>
                             </p>`;
                } else {
                    html += '<p class="text-sm text-gray-500 dark:text-gray-400">Matriz não encontrada (ID: ' + contribuinte.matrizId + ').</p>';
                }
            } catch (e) {
                 html += '<p class="feedback-message error">Erro ao carregar matriz.</p>';
                 console.error("Erro ao buscar matriz:", e);
            }
        } else {
            html += '<p class="text-sm text-gray-500 dark:text-gray-400">Este contribuinte não está marcado como Matriz nem vinculado a uma.</p>';
        }

        container.innerHTML = html;

        container.querySelectorAll('.link-visualizar-contribuinte-relacionado').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const id = e.currentTarget.dataset.id;
                renderVisualizarContribuintePage(id, 'visualizar-contribuinte');
            });
        });
    }

    async function renderVisualizarContribuintePage(contribuinteId, originatingView = 'gerir-contribuintes') {
        currentContribuinteId = contribuinteId;
        const feedbackAreaId = `feedback-contrib-view-${contribuinteId}`;

        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (!mainContentWrapperRef) {
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico ao renderizar visualização do contribuinte.", "error");
            return;
        }
        mainContentWrapperRef.innerHTML = `<div id="contrib-view-container-${contribuinteId}" class="view-contribuinte-container"><p class="loading-text p-4">A carregar contribuinte...</p></div>`;
        const viewContainer = document.getElementById(`contrib-view-container-${contribuinteId}`);
        
        try {
            currentContribuinteData = await dbRef.getItemById(CONTRIBUINTES_STORE_NAME, contribuinteId);

            if (!currentContribuinteData) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("Contribuinte não encontrado.", "error", viewContainer);
                return;
            }
            
            if (currentContribuinteData.isDeleted && originatingView !== 'lixeira-global' && originatingView !== 'lixeira') {
                 if (globalShowFeedbackRef) globalShowFeedbackRef("Este contribuinte está na lixeira.", "info", viewContainer);
                 viewContainer.innerHTML = `<p class="feedback-message info p-4">Este contribuinte (ID: ${contribuinteId}) encontra-se na lixeira. Para visualizá-lo ou restaurá-lo, acesse a Lixeira.</p>
                                           <button id="btn-voltar-view-contrib" class="btn-secondary mt-4">Voltar</button>`;
                document.getElementById('btn-voltar-view-contrib')?.addEventListener('click', () => {
                    if (appModuleRef && appModuleRef.navigateBack) appModuleRef.navigateBack();
                    else if (navigateToListCallback) navigateToListCallback(originatingView || 'gerir-contribuintes');
                });
                return;
            }

            const renderChips = (items, baseClass) => {
                if (!items || items.length === 0) return '<span class="text-sm text-gray-500 dark:text-gray-400">Nenhum(a).</span>';
                return items.map(item => `<span class="${baseClass}">${item.split('/').map(c => c.trim()).join(' › ')}</span>`).join('');
            };

            const categoriesHtml = renderChips(currentContribuinteData.categories, 'doc-category-tag');
            const tagsHtml = renderChips(currentContribuinteData.tags, 'doc-tag-view');
            
            let camposPersonalizadosHtml = '<p class="text-sm text-gray-500 dark:text-gray-400">Nenhum campo personalizado preenchido.</p>';
            if (currentContribuinteData.customFields && Array.isArray(currentContribuinteData.customFields) && currentContribuinteData.customFields.length > 0) {
                const camposValidos = currentContribuinteData.customFields.filter(cf => cf.key && cf.key.trim() !== '');
                if (camposValidos.length > 0) {
                    camposPersonalizadosHtml = '<ul class="list-disc list-inside text-sm space-y-1">';
                    camposValidos.forEach(field => {
                        camposPersonalizadosHtml += `<li><strong>${field.key}:</strong> ${field.value || 'N/A'}</li>`;
                    });
                    camposPersonalizadosHtml += '</ul>';
                }
            }

            const anexoHtml = (anexos) => {
                if (!anexos || anexos.length === 0) return '<p class="text-sm text-gray-500 dark:text-gray-400">Nenhum anexo.</p>';
                return `<ul class="list-none p-0 space-y-2">${anexos.map(anexo => {
                    if (anexo && anexo.fileName && typeof anexo.fileSize === 'number') {
                        return `<li class="anexo-preview-item"><span>${anexo.fileName} (${(anexo.fileSize / 1024).toFixed(1)} KB)</span>
                                <button class="btn-link btn-download-anexo-contrib text-xs" data-anexo-path="${anexo.filePath || ''}" data-anexo-name="${anexo.fileName}" title="Baixar/Abrir Anexo">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-download inline-block" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg> Abrir</button>
                                </li>`;
                    } return '';
                }).join('')}</ul>`;
            };
            
            const viewHtml = `
                <div id="${feedbackAreaId}" class="mb-4"></div>
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                    <h2 class="text-2xl font-semibold mb-1">${currentContribuinteData.nome || "Contribuinte Sem Nome"}</h2>
                     <div class="actions-group flex flex-wrap gap-2 section-not-for-print">
                        <button id="btn-voltar-view-contrib" class="btn-secondary btn-sm">Voltar</button>
                        ${!currentContribuinteData.isDeleted ? `<button id="btn-editar-contrib-view" class="btn-primary btn-sm">Editar</button>` : ''}
                        ${!currentContribuinteData.isDeleted ? `<button id="btn-share-contrib-view" class="btn-secondary bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white btn-sm" title="Compartilhar este contribuinte"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-share-fill inline-block mr-1" viewBox="0 0 16 16"><path d="M11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5z"/></svg> Compartilhar</button>` : ''}
                        ${!currentContribuinteData.isDeleted ? `<button id="btn-gerar-dossie-contrib" class="btn-secondary btn-sm"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-file-earmark-text-fill inline-block mr-1" viewBox="0 0 16 16"><path d="M9.293 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.707A1 1 0 0 0 13.707 4L10 .293A1 1 0 0 0 9.293 0zM9.5 3.5v-2l3 3h-2a1 1 0 0 1-1-1zM4.5 8.5A.5.5 0 0 1 5 8h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5z"/></svg>Gerar Dossiê</button>` : ''}
                        <button id="btn-enviar-email-contrib-view" class="btn-secondary btn-sm">Enviar por Email</button>
                        ${!currentContribuinteData.isDeleted ? `<button id="btn-excluir-contrib-view" class="btn-delete btn-sm">Mover para Lixeira</button>` : 
                            (originatingView === 'lixeira-global' || originatingView === 'lixeira' ?
                                `<button id="btn-restaurar-contrib-view" class="btn-secondary btn-sm">Restaurar</button>
                                 <button id="btn-excluir-permanente-contrib-view" class="btn-delete btn-sm">Excluir Permanentemente</button>`
                                 : '')
                        }
                    </div>
                </div>

                <div class="mt-4">
                    <div class="border-b border-gray-200 dark:border-gray-700">
                        <nav id="contribuinte-view-tabs" class="-mb-px flex space-x-6" aria-label="Tabs">
                            <a href="#" class="tab-item active-tab" data-tab-target="tab-detalhes-contribuinte">Detalhes</a>
                            <a href="#" class="tab-item" data-tab-target="tab-estrutura-contribuinte">Estrutura Organizacional</a>
                            <a href="#" class="tab-item" data-tab-target="tab-emails-contribuinte">E-mails Relacionados</a>
                        </nav>
                    </div>
                    <div class="tab-content mt-5">
                        <div id="tab-detalhes-contribuinte" class="tab-panel space-y-6">
                            <div class="card">
                                <h3 class="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-200 border-b pb-2 dark:border-slate-700">Informações de Identificação</h3>
                                <dl class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                                    <div class="info-item"><dt>CPF/CNPJ:</dt><dd>${currentContribuinteData.cpfCnpj || 'N/A'}</dd></div>
                                    <div class="info-item"><dt>Inscrição Estadual:</dt><dd>${currentContribuinteData.inscricaoEstadual || 'N/A'}</dd></div>
                                    <div class="info-item"><dt>ID Interno:</dt><dd>${currentContribuinteData.numeroIdentificacao || 'N/A'}</dd></div>
                                </dl>
                            </div>
                             <div class="card">
                                <h3 class="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-200 border-b pb-2 dark:border-slate-700">Informações de Contato</h3>
                                <dl class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                                    <div class="info-item"><dt>Email:</dt><dd>${currentContribuinteData.email || 'Não informado'}</dd></div>
                                    <div class="info-item"><dt>Telefone:</dt><dd>${currentContribuinteData.telefone || 'Não informado'}</dd></div>
                                    <div class="md:col-span-2 info-item"><dt>Endereço:</dt><dd>${currentContribuinteData.endereco || 'Não informado'}</dd></div>
                                </dl>
                            </div>
                             <div class="card">
                                <h3 class="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-200 border-b pb-2 dark:border-slate-700">Organização</h3>
                                <dl class="grid grid-cols-1 gap-x-6 gap-y-3 text-sm">
                                    <div class="info-item"><dt>Categorias:</dt><dd class="flex flex-wrap gap-1 mt-1">${categoriesHtml}</dd></div>
                                    <div class="info-item"><dt>Tags:</dt><dd class="flex flex-wrap gap-1 mt-1">${tagsHtml}</dd></div>
                                </dl>
                            </div>
                            <div class="card"><h3 class="text-lg font-semibold mb-2">Campos Personalizados</h3>${camposPersonalizadosHtml}</div>
                            <div class="card"><h3 class="text-lg font-semibold mb-2">Observações</h3><div class="prose dark:prose-invert max-w-none text-sm">${currentContribuinteData.observacoes ? currentContribuinteData.observacoes.replace(/\n/g, '<br>') : '<p class="text-gray-500 dark:text-gray-400">Nenhuma observação.</p>'}</div></div>
                            <div class="card section-not-for-print"><h3 class="text-lg font-semibold mb-2">Anexos</h3>${anexoHtml(currentContribuinteData.anexos)}</div>
                        </div>

                        <div id="tab-estrutura-contribuinte" class="tab-panel hidden card"></div>
                        <div id="tab-emails-contribuinte" class="tab-panel hidden card"></div>
                    </div>
                </div>
            `;
            viewContainer.innerHTML = viewHtml;
            addEventListenersToContribuinteView(currentContribuinteData, originatingView, document.getElementById(feedbackAreaId));
            
            const tabsContainer = viewContainer.querySelector('#contribuinte-view-tabs');
            const tabPanels = viewContainer.querySelectorAll('.tab-panel');
            tabsContainer.addEventListener('click', e => {
                if (e.target.matches('.tab-item')) {
                    e.preventDefault();
                    tabsContainer.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active-tab'));
                    e.target.classList.add('active-tab');

                    const targetId = e.target.dataset.tabTarget;
                    tabPanels.forEach(panel => {
                        panel.classList.toggle('hidden', panel.id !== targetId);
                    });
                }
            });
            
            await renderEmailsRelacionadosContribuinte('tab-emails-contribuinte', currentContribuinteData.id, document.getElementById(feedbackAreaId));
            await renderEstruturaOrganizacional('tab-estrutura-contribuinte', currentContribuinteData, document.getElementById(feedbackAreaId));

        } catch (error) { 
            console.error("ContribuintesView.JS: Erro ao renderizar contribuinte:", error); 
            if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao carregar contribuinte: ${error.message}`, "error", viewContainer); 
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

    function addEventListenersToContribuinteView(contribuinteData, originatingView, localFeedbackArea) {
        const viewContainer = document.getElementById(`contrib-view-container-${contribuinteData.id}`);
        if (!viewContainer) return;

        viewContainer.querySelector('#btn-gerar-dossie-contrib')?.addEventListener('click', () => {
            if (dossieGeneratorModuleRef && dossieGeneratorModuleRef.abrirModalGeracaoDossie) {
                dossieGeneratorModuleRef.abrirModalGeracaoDossie(contribuinteData);
            } else {
                globalShowFeedbackRef("Funcionalidade de Geração de Dossiê não está disponível.", "error", localFeedbackArea);
            }
        });

        viewContainer.querySelector('#btn-voltar-view-contrib')?.addEventListener('click', () => {
            if (appModuleRef && appModuleRef.navigateBack) {
                appModuleRef.navigateBack();
            } else if (navigateToListCallback) {
                navigateToListCallback(originatingView || 'gerir-contribuintes');
            }
        });

        viewContainer.querySelector('#btn-editar-contrib-view')?.addEventListener('click', () => {
            if (navigateToFormCallback) {
                navigateToFormCallback(contribuinteData, 'visualizar-contribuinte');
            }
        });
        
        viewContainer.querySelector('#btn-share-contrib-view')?.addEventListener('click', () => {
            abrirModalCompartilhamento(contribuinteData, localFeedbackArea, CONTRIBUINTES_STORE_NAME);
        });

        viewContainer.querySelector('#btn-enviar-email-contrib-view')?.addEventListener('click', () => {
            if (!appModuleRef || typeof appModuleRef.handleMenuAction !== 'function') {
                if (globalShowFeedbackRef && localFeedbackArea) globalShowFeedbackRef("Erro: Funcionalidade de navegação não disponível.", "error", localFeedbackArea);
                return;
            }
            if (!currentContribuinteData) {
                if (globalShowFeedbackRef && localFeedbackArea) globalShowFeedbackRef("Erro: Dados do contribuinte não carregados.", "error", localFeedbackArea);
                return;
            }

            const anexosParaCompositor = (currentContribuinteData.anexos || []).map(anexo => ({
                fileName: anexo.fileName,
                filePath: anexo.filePath,
                fileSize: anexo.fileSize,
                id: anexo.id || anexo.fileName,
                ownerType: 'contribuinte',
                ownerId: currentContribuinteData.id
            }));
            
            const corpoHtmlContribuinte = `<p>Seguem informações sobre o contribuinte:</p>
                <ul>
                    <li><strong>Nome/Razão Social:</strong> ${currentContribuinteData.nome || 'N/A'}</li>
                    <li><strong>CPF/CNPJ:</strong> ${currentContribuinteData.cpfCnpj || 'N/A'}</li>
                    <li><strong>Email:</strong> ${currentContribuinteData.email || 'N/A'}</li>
                    <li><strong>Telefone:</strong> ${currentContribuinteData.telefone || 'N/A'}</li>
                    <li><strong>Endereço:</strong> ${currentContribuinteData.endereco || 'N/A'}</li>
                </ul>
            `;

            const dadosParaCompositor = {
                destinatarioNome: currentContribuinteData.nome,
                destinatarioEmail: currentContribuinteData.email,
                assunto: `Informações sobre Contribuinte: ${currentContribuinteData.nome || currentContribuinteData.id}`,
                corpoHtml: corpoHtmlContribuinte,
                anexos: anexosParaCompositor,
                origem: "contribuinte",
                idEntidadeOrigem: currentContribuinteData.id,
                originatingView: 'visualizar-contribuinte',
                originatingViewData: { contribuinteId: currentContribuinteData.id }
            };
            appModuleRef.handleMenuAction('escrever-email', dadosParaCompositor);
        });

        viewContainer.querySelector('#btn-excluir-contrib-view')?.addEventListener('click', async () => {
            if (confirm(`Tem certeza que deseja mover o contribuinte "${currentContribuinteData.nome || 'ID ' + currentContribuinteData.id}" para a lixeira?`)) {
                const contribParaLixeira = await dbRef.getItemById(CONTRIBUINTES_STORE_NAME, currentContribuinteData.id);
                if (contribParaLixeira) {
                    contribParaLixeira.isDeleted = true;
                    contribParaLixeira.dataModificacao = new Date().toISOString(); 
                    await dbRef.updateItem(CONTRIBUINTES_STORE_NAME, contribParaLixeira);
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Contribuinte movido para a lixeira.", "success");
                    if (refreshApplicationStateRef) await refreshApplicationStateRef(true);
                    
                    if (appModuleRef && appModuleRef.navigateBack) appModuleRef.navigateBack();
                    else if (appModuleRef && appModuleRef.handleMenuAction) appModuleRef.handleMenuAction(originatingView || 'gerir-contribuintes');
                }
            }
        });
        
        viewContainer.querySelector('#btn-restaurar-contrib-view')?.addEventListener('click', async () => {
            currentContribuinteData.isDeleted = false;
            currentContribuinteData.dataModificacao = new Date().toISOString();
            await dbRef.updateItem(CONTRIBUINTES_STORE_NAME, currentContribuinteData);
            if (globalShowFeedbackRef) globalShowFeedbackRef("Contribuinte restaurado da lixeira.", "success", localFeedbackArea);
            if (refreshApplicationStateRef) await refreshApplicationStateRef(true);
            renderVisualizarContribuintePage(currentContribuinteData.id, originatingView); 
        });

        viewContainer.querySelector('#btn-excluir-permanente-contrib-view')?.addEventListener('click', async () => {
            if (confirm(`EXCLUSÃO PERMANENTE: Tem certeza que deseja excluir permanentemente o contribuinte "${currentContribuinteData.nome || 'ID ' + currentContribuinteData.id}"? Esta ação NÃO PODE ser desfeita e os anexos serão apagados.`)) {
                if (window.SEFWorkStation && window.SEFWorkStation.SharedUtils && typeof window.SEFWorkStation.SharedUtils.tryDeleteEntityAttachmentFolder === 'function') {
                   await window.SEFWorkStation.SharedUtils.tryDeleteEntityAttachmentFolder('contribuintes', currentContribuinteData.id, globalShowFeedbackRef, localFeedbackArea);
                }
                
                 if (window.SEFWorkStation && window.SEFWorkStation.SharedUtils && typeof window.SEFWorkStation.SharedUtils.desvincularEntidadeDeTodasAsOutras === 'function') {
                    await window.SEFWorkStation.SharedUtils.desvincularEntidadeDeTodasAsOutras(currentContribuinteData.id, CONTRIBUINTES_STORE_NAME, dbRef);
                }

                await dbRef.deleteItem(CONTRIBUINTES_STORE_NAME, currentContribuinteData.id);
                if (globalShowFeedbackRef) globalShowFeedbackRef("Contribuinte excluído permanentemente.", "success");
                if (refreshApplicationStateRef) await refreshApplicationStateRef(true);
                
                if (appModuleRef && appModuleRef.navigateBack) appModuleRef.navigateBack();
                else if (appModuleRef && appModuleRef.handleMenuAction) appModuleRef.handleMenuAction(originatingView || 'lixeira-global');
            }
        });

        viewContainer.querySelectorAll('.btn-download-anexo-contrib').forEach(button => {
            button.addEventListener('click', async (event) => {
                const anexoPath = event.currentTarget.dataset.anexoPath;
                const anexoFileName = event.currentTarget.dataset.anexoName;
                const feedbackElLocal = document.getElementById(feedbackAreaId);

                if (!window.directoryHandle) {
                    if (globalShowFeedbackRef && feedbackElLocal) globalShowFeedbackRef("Pasta da aplicação não definida.", "error", feedbackElLocal);
                    return;
                }
                if (!anexoPath) {
                    if (globalShowFeedbackRef && feedbackElLocal) globalShowFeedbackRef(`Caminho do anexo "${anexoFileName}" não definido.`, "error", feedbackElLocal);
                    return;
                }
                try {
                    const attachmentsRootSefDir = await window.directoryHandle.getDirectoryHandle('attachments_sef', { create: false });
                    
                    const pathParts = anexoPath.split('/'); 
                    let currentHandle = attachmentsRootSefDir;
                    for (let i = 0; i < pathParts.length - 1; i++) {
                        currentHandle = await currentHandle.getDirectoryHandle(pathParts[i], { create: false });
                    }
                    const fileNameToGet = pathParts[pathParts.length - 1];

                    const fileHandle = await currentHandle.getFileHandle(fileNameToGet, { create: false });
                    const file = await fileHandle.getFile();

                    const url = URL.createObjectURL(file);
                    const a = document.createElement('a');
                    a.href = url; a.download = anexoFileName;
                    document.body.appendChild(a); a.click(); document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    if (globalShowFeedbackRef && feedbackElLocal) globalShowFeedbackRef(`Anexo "${anexoFileName}" pronto para download/abertura.`, 'success', feedbackElLocal);

                } catch (error) {
                    console.error(`ContribuintesView.JS: Erro ao aceder anexo "${anexoFileName}" (path: ${anexoPath}):`, error);
                    if (localFeedbackArea && globalShowFeedbackRef) { 
                        globalShowFeedbackRef(`Erro ao abrir/baixar anexo "${anexoFileName}": ${error.message}. Verifique se o arquivo existe na pasta da aplicação.`, 'error', localFeedbackArea);
                    } else if (globalShowFeedbackRef) {
                        globalShowFeedbackRef(`Erro ao abrir/baixar anexo "${anexoFileName}": ${error.message}.`, 'error');
                    }
                }
            });
        });
    }

    return {
        init,
        renderVisualizarContribuintePage
    };
})();