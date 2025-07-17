// js/servidoresView.js - Lógica para Visualização de Servidores
// v2.4.0 - ADICIONADO: Botão "Definir como Usuário Atual" para salvar o servidor visualizado como o usuário principal da aplicação.
// v2.3.1 - CORREÇÃO: Adiciona a função 'renderLinkedItemsSectionServidor' que estava ausente, resolvendo o ReferenceError.
// v2.3.0 - REFATORADO: Adota novo layout de visualização em cards para melhor clareza.
// v2.2.1 - CORREÇÃO: Injeta dependências (sharing, utils, ui) e implementa modal de compartilhamento para corrigir ReferenceError.
// ... (histórico anterior)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.ServidoresView = (function() {
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let navigateToAppViewRef; 
    let navigateToFormCallback;
    let refreshApplicationStateRef;
    let dbRef;
    let appModuleRef;
    let uiModuleRef;
    let sharingModuleRef;
    let sharedUtilsRef;

    const SERVIDORES_STORE_NAME = 'servidoresStore';
    const SERVIDORES_GRUPOS_STORE_NAME = 'servidoresGruposStore';
    const DOCUMENTS_STORE_NAME = 'documents';
    const TAREFAS_STORE_NAME = 'tarefasStore';
    const NOTAS_RAPIDAS_STORE_NAME = 'notasRapidasStore';
    const PROTOCOLOS_STORE_NAME = 'protocolosStore';
    const PTAS_STORE_NAME = 'ptasStore';
    const AUTUACOES_STORE_NAME = 'autuacoesStore';
    const EMAILS_GERADOS_STORE_NAME = 'comunicacaoEmailsGeradosStore';

    const AUSENCIA_TIPOS_OPTIONS_VIEW = ["Férias Regulamentares", "Férias Prêmio", "Licença", "Afastado", "Outro"];

    let currentServidorId = null;
    let currentServidorData = null;

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
        utilsMod
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
        console.log("ServidoresView.JS: Módulo inicializado (v2.4.0).");
    }

    async function renderEmailsRelacionadosServidor(containerId, servidorId, feedbackArea) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `<p class="text-sm text-gray-500 dark:text-gray-400">Carregando e-mails...</p>`;

        try {
            const todosEmails = await dbRef.getAllItems(EMAILS_GERADOS_STORE_NAME);
            const emailsRelacionados = todosEmails.filter(email =>
                !email.isDeleted &&
                email.relatedEntities &&
                email.relatedEntities.some(entity => entity.id === servidorId && entity.type === 'servidor')
            ).sort((a, b) => new Date(b.dataGeracao) - new Date(a.dataGeracao));

            if (emailsRelacionados.length === 0) {
                container.innerHTML = `<p class="text-sm text-gray-500 dark:text-gray-400">Nenhum e-mail relacionado a este servidor encontrado.</p>`;
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
                            originatingView: 'visualizar-servidor',
                            originatingViewData: { servidorId: servidorId }
                        });
                    }
                });
            });

        } catch (error) {
            console.error("Erro ao renderizar e-mails relacionados ao servidor:", error);
            container.innerHTML = `<p class="feedback-message error">Erro ao carregar e-mails: ${error.message}</p>`;
        }
    }
    
    async function renderHistoricoAusenciasSection(servidor) {
        if (!servidor || !Array.isArray(servidor.periodosAusencia) || servidor.periodosAusencia.length === 0) {
            return '<p class="text-sm text-gray-500 dark:text-gray-400">Nenhum período de ausência registrado.</p>';
        }

        const historicoOrdenado = servidor.periodosAusencia.sort((a, b) => new Date(b.dataInicio) - new Date(a.dataInicio));

        let html = '<ul class="list-disc list-inside space-y-2 pl-1 text-sm">';
        historicoOrdenado.forEach(periodo => {
            const dataInicioFmt = periodo.dataInicio ? new Date(periodo.dataInicio + 'T00:00:00').toLocaleDateString() : 'N/D';
            const dataFimFmt = periodo.dataFim ? new Date(periodo.dataFim + 'T00:00:00').toLocaleDateString() : 'N/D';
            const observacaoHtml = periodo.observacao ? `<p class="ml-4 my-0.5 text-xs text-gray-500 dark:text-gray-400 italic">Obs: ${periodo.observacao}</p>` : '';

            html += `
                <li class="historico-item border-b border-gray-200 dark:border-slate-700 pb-1.5 mb-1.5 last:border-b-0 last:pb-0 last:mb-0">
                    <strong class="font-medium">${periodo.tipo || 'Evento'}</strong> de
                    <span class="font-semibold text-blue-600 dark:text-blue-400">${dataInicioFmt}</span> até
                    <span class="font-semibold text-blue-600 dark:text-blue-400">${dataFimFmt}</span>
                    ${observacaoHtml}
                </li>`;
        });
        html += '</ul>';
        return html;
    }

    async function renderLinkedItemsSectionServidor(servidor) {
        if (!servidor) return '<p class="text-sm text-gray-500 dark:text-gray-400">Dados do servidor indisponíveis.</p>';

        let html = '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">';
        let hasAnyLink = false;

        const processLinksForEntity = async (storeName, singularName, pluralName, queryField, idServidor, displayField1, displayField2 = null) => {
            let itemsHtml = '';
            try {
                const items = await dbRef.getItemsByIndex(storeName, queryField, idServidor);
                const activeItems = items.filter(item => !item.isDeleted && !item.isExcluida);
                if (activeItems.length > 0) {
                    hasAnyLink = true;
                    itemsHtml += `<div class="mb-3"><h4 class="text-md font-semibold mb-1 text-gray-700 dark:text-gray-200">${pluralName}:</h4><ul class="list-disc list-inside ml-4 space-y-1">`;
                    activeItems.forEach(item => {
                        let displayName = item[displayField1] || item.nome || `ID ${item.id.substring(0,8)}`;
                        if (displayField2 && item[displayField2]) { displayName += ` (${item[displayField2]})`; }
                        else if (displayField2 === 'id_short') { displayName += ` (ID: ${item.id.substring(0,8)})`; }
                        itemsHtml += `<li class="p-1"><a href="#" class="link-view-related-${singularName.toLowerCase()}-from-servidor text-blue-600 hover:underline dark:text-blue-400 text-xs" data-id="${item.id}">${displayName}</a></li>`;
                    });
                    itemsHtml += '</ul></div>';
                }
            } catch (e) { console.warn(`ServidoresView.JS: Erro ao buscar ${pluralName} vinculados ao servidor ID ${idServidor} usando índice ${queryField}:`, e); }
            return itemsHtml;
        };
        
        // Tarefas onde o servidor é o responsável principal
        html += await processLinksForEntity(TAREFAS_STORE_NAME, 'Tarefa', 'Tarefas Responsáveis', 'servidorResponsavelId', servidor.id, 'titulo', 'dataVencimento');
        
        // Entidades onde o servidor é um dos vinculados (não principal)
        html += await processLinksForEntity(DOCUMENTS_STORE_NAME, 'Documento', 'Documentos Envolvidos', 'servidoresVinculadosIds', servidor.id, 'title', 'reference');
        html += await processLinksForEntity(TAREFAS_STORE_NAME, 'Tarefa', 'Outras Tarefas Envolvidas', 'servidoresVinculadosIds', servidor.id, 'titulo', 'dataVencimento');
        html += await processLinksForEntity(NOTAS_RAPIDAS_STORE_NAME, 'Nota Rápida', 'Notas Rápidas Vinculadas', 'servidoresVinculadosIds', servidor.id, 'titulo', 'id_short');
        html += await processLinksForEntity(PROTOCOLOS_STORE_NAME, 'Protocolo', 'Protocolos Envolvidos', 'servidoresVinculadosIds', servidor.id, 'numeroProtocolo', 'assunto');
        html += await processLinksForEntity(PTAS_STORE_NAME, 'PTA', 'PTAs Envolvidos', 'servidoresVinculadosIds', servidor.id, 'numeroPTA', 'assuntoPTA');
        html += await processLinksForEntity(AUTUACOES_STORE_NAME, 'Autuação', 'Autuações Envolvidas', 'servidoresVinculadosIds', servidor.id, 'numeroAutuacao', 'assuntoAutuacao');

        if (!hasAnyLink) {
            html += '<div class="col-span-full"><p class="text-sm text-gray-500 dark:text-gray-400">Nenhum item diretamente vinculado a este servidor.</p></div>';
        }
        html += '</div>';
        return html;
    }


    async function renderVisualizarServidorPage(servidorId, originatingView = 'gerir-servidores') {
        currentServidorId = servidorId;
        const feedbackAreaId = `feedback-servidor-view-${servidorId}`;

        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (!mainContentWrapperRef) {
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico ao renderizar visualização do servidor.", "error");
            return;
        }
        mainContentWrapperRef.innerHTML = `<div id="servidor-view-container-${servidorId}" class="view-servidor-container"><p class="loading-text p-4">A carregar servidor...</p></div>`;
        const viewContainer = document.getElementById(`servidor-view-container-${servidorId}`);
        
        try {
            currentServidorData = await dbRef.getItemById(SERVIDORES_STORE_NAME, servidorId);

            if (!currentServidorData) {
                if (globalShowFeedbackRef && viewContainer) globalShowFeedbackRef("Servidor não encontrado.", "error", viewContainer);
                return;
            }
             if (currentServidorData.isDeleted && originatingView !== 'lixeira-global' && originatingView !== 'lixeira') {
                 if (globalShowFeedbackRef && viewContainer) globalShowFeedbackRef("Este servidor está na lixeira.", "info", viewContainer);
                 viewContainer.innerHTML = `<p class="feedback-message info p-4">Este servidor (ID: ${servidorId}) encontra-se na lixeira. Para visualizá-lo ou restaurá-lo, acesse a Lixeira.</p>
                                           <button id="btn-voltar-view-servidor" class="btn-secondary mt-4">Voltar</button>`;
                document.getElementById('btn-voltar-view-servidor')?.addEventListener('click', () => {
                    if (appModuleRef && appModuleRef.navigateBack) appModuleRef.navigateBack();
                });
                return;
            }

            let displayStatus = currentServidorData.status || 'N/D';
            let effectiveStatusForClass = currentServidorData.status;
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            if (currentServidorData.status === 'Ativo' && Array.isArray(currentServidorData.periodosAusencia) && currentServidorData.periodosAusencia.length > 0) {
                const ausenciaAtual = currentServidorData.periodosAusencia.find(p => {
                    const inicio = new Date(p.dataInicio + 'T00:00:00');
                    const fim = p.dataFim ? new Date(p.dataFim + 'T23:59:59') : new Date(p.dataInicio + 'T23:59:59');
                    return hoje >= inicio && hoje <= fim;
                });
                if (ausenciaAtual) {
                    displayStatus = `Ativo (${ausenciaAtual.tipo})`;
                    effectiveStatusForClass = ausenciaAtual.tipo;
                }
            }
            const statusBadgeClass = getStatusBadgeClassServidor(effectiveStatusForClass);

            let gruposHtml = '<p class="text-sm text-gray-500 dark:text-gray-400">Nenhum grupo associado.</p>';
            if (currentServidorData.gruposIds && currentServidorData.gruposIds.length > 0) {
                const nomesGrupos = [];
                for (const grupoId of currentServidorData.gruposIds) {
                    try {
                        const grupo = await dbRef.getItemById(SERVIDORES_GRUPOS_STORE_NAME, grupoId);
                        if (grupo && !grupo.isDeleted) nomesGrupos.push(grupo.nomeGrupo);
                    } catch (e) { console.warn("Erro ao buscar nome do grupo de servidor:", e); }
                }
                if (nomesGrupos.length > 0) {
                    gruposHtml = nomesGrupos.map(nome => `<span class="doc-tag-view">${nome}</span>`).join('');
                }
            }
            
            let diasTrabalhoRemotoHtml = '<p class="text-sm text-gray-500 dark:text-gray-400">Não configurado.</p>';
            if (currentServidorData.diasTrabalhoRemoto && currentServidorData.diasTrabalhoRemoto.length > 0) {
                diasTrabalhoRemotoHtml = `<p class="text-sm">${currentServidorData.diasTrabalhoRemoto.join(', ')}</p>`;
            }

            const historicoHtml = await renderHistoricoAusenciasSection(currentServidorData);
            const outrosItensHtml = await renderLinkedItemsSectionServidor(currentServidorData);
            
            // Verifica se este servidor é o usuário atual
            const userPrefs = await window.SEFWorkStation.Configuracoes.carregarUserPreferences();
            const isCurrentUser = userPrefs.currentUserServerId === servidorId;

            const viewHtml = `
                <div id="${feedbackAreaId}" class="mb-4"></div>
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                    <h2 class="text-2xl font-semibold mb-1">${currentServidorData.nome || "Servidor Sem Nome"}</h2>
                     <div class="actions-group flex flex-wrap gap-2 section-not-for-print">
                        <button id="btn-voltar-view-servidor" class="btn-secondary btn-sm">Voltar</button>
                        ${isCurrentUser ? `<span class="badge-status bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-200">Usuário Atual</span>` : `<button id="btn-set-current-user" class="btn-secondary btn-sm">Definir como Usuário Atual</button>`}
                        ${!currentServidorData.isDeleted ? `<button id="btn-editar-servidor-view" class="btn-primary btn-sm">Editar</button>` : ''}
                        ${!currentServidorData.isDeleted ? `<button id="btn-share-servidor-view" class="btn-secondary bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white btn-sm" title="Compartilhar este servidor"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-share-fill inline-block mr-1" viewBox="0 0 16 16"><path d="M11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5z"/></svg> Compartilhar</button>` : ''}
                        <button id="btn-enviar-email-servidor-view" class="btn-secondary btn-sm">Enviar por Email</button>
                        ${!currentServidorData.isDeleted ? `<button id="btn-excluir-servidor-view" class="btn-delete btn-sm">Mover para Lixeira</button>` : 
                            (originatingView === 'lixeira-global' || originatingView === 'lixeira' ?
                                `<button id="btn-restaurar-servidor-view" class="btn-secondary btn-sm">Restaurar</button>
                                 <button id="btn-excluir-permanente-servidor-view" class="btn-delete btn-sm">Excluir Permanentemente</button>`
                                 : '')
                        }
                    </div>
                </div>

                <div class="mt-4">
                    <div class="border-b border-gray-200 dark:border-gray-700">
                        <nav id="servidor-view-tabs" class="-mb-px flex space-x-6" aria-label="Tabs">
                            <a href="#" class="tab-item active-tab" data-tab-target="tab-detalhes-servidor">Detalhes e Ausências</a>
                            <a href="#" class="tab-item" data-tab-target="tab-emails-servidor">E-mails Relacionados</a>
                            <a href="#" class="tab-item" data-tab-target="tab-vinculos-servidor">Outros Itens Vinculados</a>
                        </nav>
                    </div>
                    <div class="tab-content mt-5">
                        <div id="tab-detalhes-servidor" class="tab-panel space-y-6">
                            <div class="card">
                                <h3 class="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-200 border-b pb-2 dark:border-slate-700">Informações Funcionais</h3>
                                <dl class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                                    <div class="info-item"><dt>Matrícula:</dt><dd>${currentServidorData.matricula || 'N/A'}</dd></div>
                                    <div class="info-item"><dt>Status:</dt><dd><span class="badge-status ${statusBadgeClass}">${displayStatus}</span></dd></div>
                                    <div class="info-item"><dt>Setor/Lotação:</dt><dd>${currentServidorData.setorLotacao || 'Não informado'}</dd></div>
                                    <div class="info-item"><dt>Cargo/Função:</dt><dd>${currentServidorData.cargoFuncao || 'Não informado'}</dd></div>
                                    <div class="info-item"><dt>Grupos:</dt><dd class="flex flex-wrap gap-1 mt-1">${gruposHtml}</dd></div>
                                    <div class="info-item"><dt>Área de Atuação:</dt><dd>${currentServidorData.areaAtuacao || 'Não informada'}</dd></div>
                                </dl>
                            </div>
                            <div class="card">
                                <h3 class="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-200 border-b pb-2 dark:border-slate-700">Contato e Outros</h3>
                                <dl class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                                    <div class="info-item"><dt>Email:</dt><dd>${currentServidorData.email || 'Não informado'}</dd></div>
                                    <div class="info-item"><dt>Telefone:</dt><dd>${currentServidorData.telefone || 'Não informado'}</dd></div>
                                    <div class="md:col-span-2 info-item"><dt>Dias de Trabalho Remoto:</dt><dd>${diasTrabalhoRemotoHtml}</dd></div>
                                    <div class="md:col-span-2 info-item"><dt>Observações:</dt><dd class="prose prose-sm dark:prose-invert max-w-none">${currentServidorData.observacoes ? currentServidorData.observacoes.replace(/\n/g, '<br>') : 'Nenhuma observação.'}</dd></div>
                                </dl>
                            </div>
                            <div class="card">
                                <div class="flex justify-between items-center mb-2"><h3 class="text-lg font-semibold">Histórico de Ausências</h3>${!currentServidorData.isDeleted ? `<button id="btn-add-periodo-ausencia-servidor-view" class="btn-action btn-sm text-xs">Adicionar Período</button>` : ''}</div>
                                <div id="historico-ausencias-container">${historicoHtml}</div>
                            </div>
                        </div>
                        <div id="tab-emails-servidor" class="tab-panel hidden card"></div>
                        <div id="tab-vinculos-servidor" class="tab-panel hidden card">${outrosItensHtml}</div>
                    </div>
                </div>
            `;
            viewContainer.innerHTML = viewHtml;
            addEventListenersToServidorView(currentServidorData, originatingView, document.getElementById(feedbackAreaId));
            
            const tabsContainer = viewContainer.querySelector('#servidor-view-tabs');
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
            
            addEventListenersToLinkedItemsServidor(viewContainer);
            await renderEmailsRelacionadosServidor('tab-emails-servidor', currentServidorData.id, document.getElementById(feedbackAreaId));

        } catch (error) {
            console.error("ServidoresView.JS: Erro ao renderizar servidor:", error);
            if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao carregar servidor: ${error.message}`, "error", viewContainer);
        }
    }
    
    async function abrirModalCompartilhamento(item, feedbackAreaEl, storeName) {
        if (!uiModuleRef || !sharingModuleRef || !sharedUtilsRef) {
            globalShowFeedbackRef("Funcionalidade de compartilhamento não está pronta.", "error", feedbackAreaEl, 0);
            return;
        }

        let tempSelectedRecipients = [];
        const STORE_MAP = { 'servidoresStore': 'Servidor' };
        const tipoItem = STORE_MAP[storeName] || 'Item';
        const tituloItem = item.nome || `Servidor Mat. ${item.matricula}`;

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
                    const metaData = await sharingModuleRef.shareItem([{ entityId: item.id, storeName: storeName }], tempSelectedRecipients, { incluirVinculos: false, incluirAnexos: false });
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
            ...allServers.filter(s => !s.isDeleted && s.email && s.id !== item.id).map(s => ({ id: s.id, nome: s.nome, email: s.email, tipo: 'Servidor' })),
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

    function addEventListenersToLinkedItemsServidor(viewContainer) {
        const originatingViewData = { servidorId: currentServidorId };
        viewContainer.querySelectorAll('.link-view-related-documento-from-servidor').forEach(link => {
            link.addEventListener('click', e => { e.preventDefault(); appModuleRef.handleMenuAction('visualizar-documento', { docId: e.currentTarget.dataset.id, originatingView: 'visualizar-servidor', originatingViewData }); });
        });
        viewContainer.querySelectorAll('.link-view-related-tarefa-from-servidor').forEach(link => {
            link.addEventListener('click', e => { e.preventDefault(); appModuleRef.handleMenuAction('visualizar-tarefa', { tarefaId: e.currentTarget.dataset.id, originatingView: 'visualizar-servidor', originatingViewData }); });
        });
        viewContainer.querySelectorAll('.link-view-related-nota-from-servidor').forEach(link => {
            link.addEventListener('click', e => { e.preventDefault(); appModuleRef.handleMenuAction('visualizar-nota-rapida', { notaId: e.currentTarget.dataset.id, originatingView: 'visualizar-servidor', originatingViewData }); });
        });
        viewContainer.querySelectorAll('.link-view-related-protocolo-from-servidor').forEach(link => {
            link.addEventListener('click', e => { e.preventDefault(); appModuleRef.handleMenuAction('visualizar-protocolo', { protocoloId: e.currentTarget.dataset.id, originatingView: 'visualizar-servidor', originatingViewData }); });
        });
        viewContainer.querySelectorAll('.link-view-related-pta-from-servidor').forEach(link => {
            link.addEventListener('click', e => { e.preventDefault(); appModuleRef.handleMenuAction('visualizar-pta', { ptaId: e.currentTarget.dataset.id, originatingView: 'visualizar-servidor', originatingViewData }); });
        });
        viewContainer.querySelectorAll('.link-view-related-autuacao-from-servidor').forEach(link => {
            link.addEventListener('click', e => { e.preventDefault(); appModuleRef.handleMenuAction('visualizar-autuacao', { autuacaoId: e.currentTarget.dataset.id, originatingView: 'visualizar-servidor', originatingViewData }); });
        });
    }

    function addEventListenersToServidorView(servidorData, originatingView, localFeedbackArea) {
        const viewContainer = document.getElementById(`servidor-view-container-${servidorData.id}`);
        if (!viewContainer) return;

        viewContainer.querySelector('#btn-voltar-view-servidor')?.addEventListener('click', () => {
            if (appModuleRef && appModuleRef.navigateBack) {
                appModuleRef.navigateBack();
            } else if (navigateToListCallback) {
                navigateToListCallback(originatingView || 'gerir-servidores');
            }
        });

        viewContainer.querySelector('#btn-editar-servidor-view')?.addEventListener('click', () => {
            if (navigateToFormCallback) {
                navigateToFormCallback(servidorData, 'visualizar-servidor');
            }
        });

        viewContainer.querySelector('#btn-set-current-user')?.addEventListener('click', async () => {
            const userPrefs = await window.SEFWorkStation.Configuracoes.carregarUserPreferences();
            userPrefs.currentUserServerId = servidorData.id;
            await window.SEFWorkStation.Configuracoes.salvarUserPreferences(userPrefs);
            if (globalShowFeedbackRef) globalShowFeedbackRef(`"${servidorData.nome}" foi definido como o usuário atual da aplicação.`, "success", localFeedbackArea);
            if (appModuleRef && appModuleRef.checkUserIdentity) {
                await appModuleRef.checkUserIdentity();
            }
            renderVisualizarServidorPage(servidorData.id, originatingView); // Rerender a página para atualizar o botão
        });

        viewContainer.querySelector('#btn-add-periodo-ausencia-servidor-view')?.addEventListener('click', () => {
            if (uiModuleRef && typeof uiModuleRef.showModal === 'function') {
                const modalId = `modal-add-ausencia-servidor-${servidorData.id}`;
                const tipoOptions = AUSENCIA_TIPOS_OPTIONS_VIEW.map(opt => `<option value="${opt}">${opt}</option>`).join('');
                const modalHtml = `
                    <div id="feedback-modal-ausencia" class="mb-3"></div>
                    <form id="form-nova-ausencia">
                        <div class="mb-3">
                            <label for="ausencia-inicio" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Data de Início:</label>
                            <input type="date" id="ausencia-inicio" class="form-input-text mt-1 block w-full" required>
                        </div>
                        <div class="mb-3">
                             <label for="ausencia-fim" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Data de Fim (Opcional):</label>
                            <input type="date" id="ausencia-fim" class="form-input-text mt-1 block w-full">
                        </div>
                         <div class="mb-3">
                             <label for="ausencia-tipo" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de Ausência:</label>
                             <select id="ausencia-tipo" class="form-input-text mt-1 block w-full" required>${tipoOptions}</select>
                        </div>
                        <div class="mb-3">
                             <label for="ausencia-obs" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Observação (Opcional):</label>
                             <input type="text" id="ausencia-obs" class="form-input-text mt-1 block w-full">
                        </div>
                    </form>
                `;
                const modalButtons = [
                    { text: 'Cancelar', class: 'btn-secondary', callback: () => uiModuleRef.closeModal() },
                    { 
                        text: 'Salvar Período', 
                        class: 'btn-primary', 
                        callback: async () => {
                            const dataInicio = document.getElementById('ausencia-inicio').value;
                            const dataFim = document.getElementById('ausencia-fim').value;
                            const tipo = document.getElementById('ausencia-tipo').value;
                            const observacao = document.getElementById('ausencia-obs').value;
                            const feedbackModalEl = document.getElementById('feedback-modal-ausencia');

                            if (!dataInicio || !tipo) {
                                if (globalShowFeedbackRef && feedbackModalEl) globalShowFeedbackRef("Data de início e tipo são obrigatórios.", "error", feedbackModalEl, 3000);
                                return false; 
                            }
                            try {
                                const servidorAtual = await dbRef.getItemById(SERVIDORES_STORE_NAME, servidorData.id);
                                if (!servidorAtual) {
                                    if (globalShowFeedbackRef && feedbackModalEl) globalShowFeedbackRef("Servidor não encontrado para adicionar período.", "error", feedbackModalEl, 0);
                                    return true; 
                                }
                                servidorAtual.periodosAusencia = servidorAtual.periodosAusencia || [];
                                servidorAtual.periodosAusencia.push({ id: appModuleRef.generateUUID(), dataInicio, dataFim: dataFim || null, tipo, observacao });
                                servidorAtual.dataModificacao = new Date().toISOString();
                                await dbRef.updateItem(SERVIDORES_STORE_NAME, servidorAtual);
                                if (globalShowFeedbackRef && localFeedbackArea) globalShowFeedbackRef("Novo período de ausência adicionado.", "success", localFeedbackArea);
                                await renderVisualizarServidorPage(servidorData.id, originatingView); 
                                return true; 
                            } catch (error) {
                                console.error("Erro ao salvar período de ausência:", error);
                                if (globalShowFeedbackRef && feedbackModalEl) globalShowFeedbackRef("Erro ao salvar período: " + error.message, "error", feedbackModalEl, 0);
                                return false; 
                            }
                        } 
                    }
                ];
                uiModuleRef.showModal("Adicionar Período de Ausência", modalHtml, modalButtons, 'max-w-md', modalId);
            }
        });
        
        viewContainer.querySelector('#btn-enviar-email-servidor-view')?.addEventListener('click', () => {
            if (!appModuleRef || typeof appModuleRef.handleMenuAction !== 'function') {
                if (globalShowFeedbackRef && localFeedbackArea) globalShowFeedbackRef("Erro: Funcionalidade de navegação não disponível.", "error", localFeedbackArea);
                return;
            }
            if (!currentServidorData) {
                if (globalShowFeedbackRef && localFeedbackArea) globalShowFeedbackRef("Erro: Dados do servidor não carregados.", "error", localFeedbackArea);
                return;
            }
            const corpoHtmlServidor = `<p>Seguem informações sobre o servidor:</p><ul><li><strong>Nome:</strong> ${currentServidorData.nome || 'N/A'}</li><li><strong>Matrícula:</strong> ${currentServidorData.matricula || 'N/A'}</li><li><strong>Email:</strong> ${currentServidorData.email || 'N/A'}</li><li><strong>Telefone:</strong> ${currentServidorData.telefone || 'N/A'}</li><li><strong>Setor/Lotação:</strong> ${currentServidorData.setorLotacao || 'N/A'}</li><li><strong>Cargo/Função:</strong> ${currentServidorData.cargoFuncao || 'N/A'}</li><li><strong>Status:</strong> ${currentServidorData.status || 'N/A'}</li></ul>`;
            const dadosParaCompositor = { 
                servidorNome: currentServidorData.nome,
                servidorEmail: currentServidorData.email,
                assunto: `Informações sobre Servidor: ${currentServidorData.nome || currentServidorData.id}`, 
                corpoHtml: corpoHtmlServidor, 
                anexos: [], 
                origem: "servidor", 
                idEntidadeOrigem: currentServidorData.id, 
                originatingView: 'visualizar-servidor',
                originatingViewData: { servidorId: currentServidorData.id }
            };
            appModuleRef.handleMenuAction('escrever-email', dadosParaCompositor);
        });

        viewContainer.querySelector('#btn-excluir-servidor-view')?.addEventListener('click', async () => {
            if (confirm(`Tem certeza que deseja mover o servidor "${currentServidorData.nome || 'ID ' + currentServidorData.id}" para a lixeira?`)) {
                const servidorParaLixeira = await dbRef.getItemById(SERVIDORES_STORE_NAME, currentServidorData.id);
                if (servidorParaLixeira) {
                    servidorParaLixeira.isDeleted = true;
                    servidorParaLixeira.dataModificacao = new Date().toISOString();
                    await dbRef.updateItem(SERVIDORES_STORE_NAME, servidorParaLixeira);
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Servidor movido para a lixeira.", "success");
                    if (refreshApplicationStateRef) await refreshApplicationStateRef();
                    if (appModuleRef && appModuleRef.navigateBack) appModuleRef.navigateBack();
                    else if (appModuleRef && appModuleRef.handleMenuAction) appModuleRef.handleMenuAction(originatingView || 'gerir-servidores');
                }
            }
        });
        
        viewContainer.querySelector('#btn-restaurar-servidor-view')?.addEventListener('click', async () => {
            currentServidorData.isDeleted = false;
            currentServidorData.dataModificacao = new Date().toISOString();
            await dbRef.updateItem(SERVIDORES_STORE_NAME, currentServidorData);
            if (globalShowFeedbackRef) globalShowFeedbackRef("Servidor restaurado da lixeira.", "success", localFeedbackArea);
            if (refreshApplicationStateRef) await refreshApplicationStateRef();
            renderVisualizarServidorPage(currentServidorData.id, originatingView);
        });

        viewContainer.querySelector('#btn-excluir-permanente-servidor-view')?.addEventListener('click', async () => {
            if (confirm(`EXCLUSÃO PERMANENTE: Tem certeza que deseja excluir permanentemente o servidor "${currentServidorData.nome || 'ID ' + currentServidorData.id}"? Esta ação NÃO PODE ser desfeita.`)) {
                if (SEFWorkStation.ServidoresListagens && typeof SEFWorkStation.ServidoresListagens.desvincularServidorDeEntidades === 'function') {
                     await SEFWorkStation.ServidoresListagens.desvincularServidorDeEntidades(currentServidorData.id, dbRef);
                }
                await dbRef.deleteItem(SERVIDORES_STORE_NAME, currentServidorData.id);
                if (globalShowFeedbackRef) globalShowFeedbackRef("Servidor excluído permanentemente.", "success");
                if (refreshApplicationStateRef) await refreshApplicationStateRef();
                if (appModuleRef && appModuleRef.navigateBack) appModuleRef.navigateBack();
                else if (appModuleRef && appModuleRef.handleMenuAction) appModuleRef.handleMenuAction(originatingView || 'lixeira-global');
            }
        });
        
        viewContainer.querySelector('#btn-share-servidor-view')?.addEventListener('click', () => {
            abrirModalCompartilhamento(currentServidorData, localFeedbackArea, SERVIDORES_STORE_NAME);
        });
    }

    function getStatusBadgeClassServidor(status) {
        if (window.SEFWorkStation && SEFWorkStation.ServidoresListagens && typeof SEFWorkStation.ServidoresListagens.getStatusBadgeClassServidor === 'function') {
            return SEFWorkStation.ServidoresListagens.getStatusBadgeClassServidor(status);
        }
        // Fallback
        switch (status) {
            case 'Ativo': return 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-200';
            case 'Inativo': return 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-300';
            case 'Férias Regulamentares':
            case 'Férias Prêmio':
            case 'Licença':
            case 'Afastado':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-600 dark:text-yellow-100';
            case 'Desligado': return 'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-200';
            default: return 'bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-200';
        }
    }

    return {
        init,
        renderVisualizarServidorPage
    };
})();