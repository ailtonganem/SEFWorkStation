// js/autuacoesForm.js - Lógica para Formulários de Autuações
// v0.10.0 - REFATORADO: Utiliza EntityConfig.filterActiveItems para filtrar itens vinculáveis, corrigindo o bug de versionamento.
// v0.9.2 - CORRIGIDO: Adiciona a seção "Protocolos de Origem" que estava faltando na UI do formulário, permitindo o vínculo.
// v0.9.1 - Remove classe page-section para expandir a largura da visualização.
// ... (histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.AutuacaoForm = (function() {
    // ... (variáveis de módulo e init mantidos) ...
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let navigateAfterSaveOrCancelCallback;
    let refreshApplicationStateRef;
    let dbRef;
    let appModuleRef;
    let uiModuleRef;
    let autuacoesViewModuleRef;

    const AUTUACOES_STORE_NAME = 'autuacoesStore';
    const AUTUACAO_TYPES_STORE_NAME = 'autuacaoTypesStore';
    const DOCUMENTS_STORE_NAME = 'documents';
    const CONTRIBUINTES_STORE_NAME = 'contribuintes';
    const TAREFAS_STORE_NAME = 'tarefasStore';
    const NOTAS_RAPIDAS_STORE_NAME = 'notasRapidasStore';
    const PTAS_STORE_NAME = 'ptasStore'; 
    const SERVIDORES_STORE_NAME = 'servidoresStore';
    const PROTOCOLOS_STORE_NAME = 'protocolosStore'; // Para Protocolos de Origem

    const STATUS_AUTUACAO_OPTIONS = ["Em Elaboração", "Lavrado", "Enviado ao Sujeito Passivo", "Impugnado", "Em Análise", "Julgado Procedente", "Julgado Improcedente", "Julgado Parcialmente Procedente", "Recurso Voluntário", "Recurso de Ofício", "Inscrito em Dívida Ativa", "Extinto", "Anulado", "Encerrado", "Arquivado", "Cancelado", "Outro"];

    let currentAutuacaoId = null;
    let originalAutuacaoData = null;

    let currentFilesToAttachAutuacao = [];
    let existingAttachmentsAutuacao = [];

    let currentRelatedDocIds = [];
    let currentRelatedContribIds = [];
    let currentRelatedTarefaIds = [];
    let currentRelatedNotaRapidaIds = [];
    let currentRelatedPTAOriginarioIds = [];
    let currentRelatedProtocoloOriginarioIds = [];
    let currentRelatedServidorIds = [];
    let tempSelectedIdsModal = [];

    function init(
        mainWrapper,
        showFeedbackFunc,
        clearFeedbackFunc,
        navigateCb,
        refreshFunc,
        dbModuleRef,
        applicationModuleRef,
        uiRefModule,
        viewModule
    ) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedbackFunc;
        globalClearFeedbackRef = clearFeedbackFunc;
        navigateAfterSaveOrCancelCallback = navigateCb;
        refreshApplicationStateRef = refreshFunc;
        dbRef = dbModuleRef;
        appModuleRef = applicationModuleRef;
        uiModuleRef = uiRefModule;
        autuacoesViewModuleRef = viewModule;

        if (!dbRef) console.error("AutuacaoForm.JS: init - Referência ao DB não fornecida!");
        if (!uiModuleRef) console.warn("AutuacaoForm.JS: init - Módulo UI não disponível, modais podem não funcionar.");
        if (!appModuleRef) console.error("AutuacaoForm.JS: init - appModuleRef não fornecido.");
        console.log("AutuacaoForm.JS: Módulo inicializado (v0.10.0).");
    }

    async function renderFormularioAutuacao(autuacaoData = null, originatingView = 'gerir-autuacoes', usarComoBase = false, preSelectedLink = null) {
        // ... (código existente da função renderFormularioAutuacao mantido)
        if (globalClearFeedbackRef) globalClearFeedbackRef();
        
        const isEditing = autuacaoData && autuacaoData.id && !usarComoBase; 
        currentAutuacaoId = isEditing ? autuacaoData.id : null;
        originalAutuacaoData = isEditing ? JSON.parse(JSON.stringify(autuacaoData)) : null;

        currentFilesToAttachAutuacao = [];
        existingAttachmentsAutuacao = (isEditing && Array.isArray(autuacaoData.anexos)) ? [...autuacaoData.anexos] : [];

        currentRelatedDocIds = (isEditing && Array.isArray(autuacaoData.documentosVinculadosIds)) ? [...autuacaoData.documentosVinculadosIds] : [];
        currentRelatedContribIds = (isEditing && Array.isArray(autuacaoData.contribuintesVinculadosIds)) ? [...autuacaoData.contribuintesVinculadosIds] : [];
        currentRelatedTarefaIds = (isEditing && Array.isArray(autuacaoData.tarefasVinculadasIds)) ? [...autuacaoData.tarefasVinculadasIds] : [];
        currentRelatedNotaRapidaIds = (isEditing && Array.isArray(autuacaoData.notasRapidasRelacionadasIds)) ? [...autuacaoData.notasRapidasRelacionadasIds] : [];
        currentRelatedServidorIds = (isEditing && Array.isArray(autuacaoData.servidoresVinculadosIds)) ? [...autuacaoData.servidoresVinculadosIds] : [];

        if (preSelectedLink && preSelectedLink.type === 'pta' && preSelectedLink.id && !isEditing) {
            currentRelatedPTAOriginarioIds = [preSelectedLink.id];
        } else if (isEditing && Array.isArray(autuacaoData.ptasOriginariosIds)) {
            currentRelatedPTAOriginarioIds = [...autuacaoData.ptasOriginariosIds];
        } else {
            currentRelatedPTAOriginarioIds = [];
        }

        if (preSelectedLink && preSelectedLink.type === 'protocolo' && preSelectedLink.id && !isEditing) {
            currentRelatedProtocoloOriginarioIds = [preSelectedLink.id];
        } else if (isEditing && Array.isArray(autuacaoData.protocolosOriginariosIds)) {
            currentRelatedProtocoloOriginarioIds = [...autuacaoData.protocolosOriginariosIds];
        } else {
            currentRelatedProtocoloOriginarioIds = [];
        }


        const formTitle = isEditing ? "Editar Autuação" : "Cadastrar Nova Autuação";
        const numeroAutuacaoDisplay = isEditing && autuacaoData.numeroAutuacao ? autuacaoData.numeroAutuacao : (isEditing ? 'N/A' : 'Será gerado ao salvar');
        const feedbackAreaId = `feedback-form-autuacao-${currentAutuacaoId || 'novo'}`;

        let tiposDeAutuacaoExistentes = [];
        try {
            tiposDeAutuacaoExistentes = await dbRef.getAllItems(AUTUACAO_TYPES_STORE_NAME);
            tiposDeAutuacaoExistentes.sort((a, b) => a.name.localeCompare(b.name));
        } catch (e) {
            console.warn("AutuacaoForm.JS: Não foi possível carregar tipos de autuação existentes.", e);
        }
        const datalistOptionsHtml = tiposDeAutuacaoExistentes.map(tipo => `<option value="${tipo.name.replace(/"/g, '"')}">`).join('');

        const formHtml = `
            <div class="form-section"> 
                <h2 class="text-xl font-semibold mb-2">${formTitle}</h2>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">Número da Autuação: ${numeroAutuacaoDisplay}</p>
                <div id="${feedbackAreaId}" class="mb-4"></div>

                <form id="form-autuacao">
                    <input type="hidden" id="autuacao-id-hidden" value="${currentAutuacaoId || ''}">
                    <input type="hidden" id="autuacao-creation-date" value="${(isEditing && autuacaoData?.dataCriacao) ? autuacaoData.dataCriacao : new Date().toISOString()}">
                    <input type="hidden" id="autuacao-numero-original-hidden" value="${(isEditing && autuacaoData?.numeroAutuacao) ? autuacaoData.numeroAutuacao.replace(/"/g, '"') : ''}">

                    <div class="mb-4">
                        <label for="autuacao-numero" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Número da Autuação (Manual, se houver):</label>
                        <input type="text" id="autuacao-numero" name="numeroAutuacaoInput" class="form-input-text mt-1 block w-full"
                               value="${(autuacaoData?.numeroAutuacao && isEditing) ? autuacaoData.numeroAutuacao.replace(/"/g, '"') : ''}" 
                               placeholder="Deixar em branco para geração automática" ${isEditing ? 'disabled' : ''}>
                        ${isEditing && autuacaoData?.numeroAutuacao ? '<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">O número da Autuação não pode ser alterado após o cadastro.</p>' : ''}
                    </div>

                    <div class="form-grid">
                        <div>
                            <label for="autuacao-data" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Data da Autuação: <span class="text-red-500">*</span></label>
                            <input type="date" id="autuacao-data" name="dataAutuacao" class="form-input-text mt-1 block w-full" required value="${(autuacaoData?.dataAutuacao) ? autuacaoData.dataAutuacao.substring(0,10) : new Date().toISOString().substring(0,10)}">
                        </div>
                        <div>
                            <label for="autuacao-tipo" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de Autuação: <span class="text-red-500">*</span></label>
                            <input type="text" list="tipos-autuacao-datalist" id="autuacao-tipo" name="tipoAutuacao" class="form-input-text mt-1 block w-full" required value="${(autuacaoData?.tipoAutuacao) ? autuacaoData.tipoAutuacao.replace(/"/g, '"') : ''}">
                            <datalist id="tipos-autuacao-datalist">
                                ${datalistOptionsHtml}
                            </datalist>
                        </div>
                    </div>

                    <div class="mb-4">
                        <label for="autuacao-assunto" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Assunto/Matéria: <span class="text-red-500">*</span></label>
                        <input type="text" id="autuacao-assunto" name="assuntoAutuacao" class="form-input-text mt-1 block w-full" required value="${(autuacaoData?.assuntoAutuacao) ? autuacaoData.assuntoAutuacao.replace(/"/g, '"') : ''}">
                    </div>

                    <div class="mb-4">
                        <label for="autuacao-descricao" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição Detalhada:</label>
                        <textarea id="autuacao-descricao" name="descricaoDetalhadaAutuacao" rows="4" class="form-input-text mt-1 block w-full">${(autuacaoData?.descricaoDetalhadaAutuacao) || ''}</textarea>
                    </div>

                     <div class="form-grid mt-4">
                        <div>
                            <label for="autuacao-responsavel" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Servidor Responsável:</label>
                            <input type="text" id="autuacao-responsavel" name="servidorResponsavelAutuacao" class="form-input-text mt-1 block w-full" value="${(autuacaoData?.servidorResponsavelAutuacao) ? autuacaoData.servidorResponsavelAutuacao.replace(/"/g, '"') : ''}" placeholder="Matrícula ou Nome do servidor">
                        </div>
                        <div>
                            <label for="autuacao-status" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Status da Autuação:</label>
                            <select id="autuacao-status" name="statusAutuacao" class="form-input-text mt-1 block w-full">
                                ${STATUS_AUTUACAO_OPTIONS.map(s => `<option value="${s}" ${autuacaoData?.statusAutuacao === s || (!isEditing && s === 'Em Elaboração') ? 'selected' : ''}>${s}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <div class="mb-4 mt-4">
                        <label for="autuacao-primeiro-andamento" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Primeiro Andamento/Despacho:</label>
                        <textarea id="autuacao-primeiro-andamento" name="primeiroAndamentoAutuacao" rows="3" class="form-input-text mt-1 block w-full" placeholder="Registre o primeiro andamento ou despacho aqui. Outros podem ser adicionados na visualização.">${(autuacaoData?.historicoAndamentoAutuacao && autuacaoData.historicoAndamentoAutuacao.length > 0 && !isEditing) ? autuacaoData.historicoAndamentoAutuacao[0].descricao : ''}</textarea>
                         ${isEditing ? '<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Para adicionar novos andamentos a uma autuação existente, utilize a tela de visualização da autuação.</p>' : ''}
                    </div>

                    <h3 class="text-md font-semibold my-4 pt-2 border-t dark:border-slate-600">Vínculos</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">PTAs de Origem:</label>
                            <div id="lista-ptas-vinculados-autuacao" class="form-vinculos-lista"></div>
                            <button type="button" id="btn-gerenciar-ptas-vinculados-autuacao" class="btn-secondary btn-sm text-xs">Gerenciar Vínculos com PTAs</button>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Protocolos de Origem:</label>
                            <div id="lista-protocolos-originarios-autuacao" class="form-vinculos-lista"></div>
                            <button type="button" id="btn-gerenciar-protocolos-originarios-autuacao" class="btn-secondary btn-sm text-xs">Gerenciar Vínculos com Protocolos</button>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Documentos Vinculados:</label>
                            <div id="lista-docs-vinculados-autuacao" class="form-vinculos-lista"></div>
                            <button type="button" id="btn-gerenciar-docs-vinculados-autuacao" class="btn-secondary btn-sm text-xs">Gerenciar Vínculos com Documentos</button>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Contribuintes Vinculados:</label>
                            <div id="lista-contribs-vinculados-autuacao" class="form-vinculos-lista"></div>
                            <button type="button" id="btn-gerenciar-contribs-vinculados-autuacao" class="btn-secondary btn-sm text-xs">Gerenciar Vínculos com Contribuintes</button>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Servidores Vinculados:</label>
                            <div id="lista-servidores-vinculados-autuacao" class="form-vinculos-lista"></div>
                            <button type="button" id="btn-gerenciar-servidores-vinculados-autuacao" class="btn-secondary btn-sm text-xs">Gerenciar Vínculos com Servidores</button>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Tarefas Vinculadas:</label>
                            <div id="lista-tarefas-vinculadas-autuacao" class="form-vinculos-lista"></div>
                            <button type="button" id="btn-gerenciar-tarefas-vinculados-autuacao" class="btn-secondary btn-sm text-xs">Gerenciar Vínculos com Tarefas</button>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Notas Rápidas Vinculadas:</label>
                            <div id="lista-notas-vinculadas-autuacao" class="form-vinculos-lista"></div>
                            <button type="button" id="btn-gerenciar-notas-vinculadas-autuacao" class="btn-secondary btn-sm text-xs">Gerenciar Vínculos com Notas Rápidas</button>
                        </div>
                    </div>

                    <div class="mb-6">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Anexos:</label>
                        <div id="anexos-existentes-autuacao-list" class="mb-2"></div>
                        <input type="file" id="autuacao-anexos-input" name="anexos" class="form-input-file mt-1 block w-full" multiple>
                        <div id="anexos-preview-autuacao-list" class="mt-2"></div>
                    </div>

                    <div class="mb-4">
                        <label for="autuacao-notas-internas" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Notas Internas:</label>
                        <textarea id="autuacao-notas-internas" name="notasInternasAutuacao" rows="3" class="form-input-text mt-1 block w-full">${(autuacaoData?.notasInternasAutuacao) || ''}</textarea>
                    </div>

                    <div class="form-actions">
                        <button type="button" id="btn-cancelar-autuacao" class="btn-secondary">Cancelar</button>
                        <button type="submit" id="btn-salvar-autuacao" class="btn-primary">${isEditing ? 'Atualizar Autuação' : 'Salvar Autuação'}</button>
                    </div>
                </form>
            </div>
        `;
        mainContentWrapperRef.innerHTML = formHtml;

        renderExistingAttachmentsAutuacao();
        await renderSelectedRelatedItemsAutuacao(); 
        await renderSelectedServidoresNoFormAutuacao();

        addFormEventListenersAutuacao(feedbackAreaId, originatingView, isEditing);
    }

    async function abrirModalSelecaoAutuacao(tipoEntidade) {
        if (!uiModuleRef || !uiModuleRef.showModal) {
            globalShowFeedbackRef("Erro: Funcionalidade de modal não está disponível.", "error", document.getElementById(`feedback-form-autuacao-${currentAutuacaoId || 'nova'}`));
            return;
        }
    
        let storeName, tituloModal, placeholderBusca, currentSelectionArrayRef, renderListCallback, displayField, subInfoCallback;
        let labelSingular = tipoEntidade.toLowerCase();
    
        // ... (código do switch mantido) ...
        switch (tipoEntidade) {
            case 'ptaOriginario':
                storeName = PTAS_STORE_NAME;
                tituloModal = 'Selecionar PTAs de Origem para a Autuação';
                placeholderBusca = 'Buscar por número, assunto...';
                tempSelectedIdsModal = [...currentRelatedPTAOriginarioIds];
                currentSelectionArrayRef = currentRelatedPTAOriginarioIds;
                renderListCallback = () => renderSelectedItemsListAutuacao(currentRelatedPTAOriginarioIds, 'lista-ptas-vinculados-autuacao', PTAS_STORE_NAME, 'ptaOriginario', 'numeroPTA');
                displayField = 'numeroPTA';
                labelSingular = 'PTA';
                subInfoCallback = (item) => `(Assunto: ${item.assuntoPTA ? item.assuntoPTA.substring(0,30) + '...' : 'N/A'})`;
                break;
            case 'protocoloOriginario':
                storeName = PROTOCOLOS_STORE_NAME;
                tituloModal = 'Selecionar Protocolos de Origem para a Autuação';
                placeholderBusca = 'Buscar por número, assunto...';
                tempSelectedIdsModal = [...currentRelatedProtocoloOriginarioIds];
                currentSelectionArrayRef = currentRelatedProtocoloOriginarioIds;
                renderListCallback = () => renderSelectedItemsListAutuacao(currentRelatedProtocoloOriginarioIds, 'lista-protocolos-originarios-autuacao', PROTOCOLOS_STORE_NAME, 'protocoloOriginario', 'numeroProtocolo');
                displayField = 'numeroProtocolo';
                labelSingular = 'Protocolo';
                subInfoCallback = (item) => `(Assunto: ${item.assunto ? item.assunto.substring(0,30) + '...' : 'N/A'})`;
                break;
            case 'documento':
                storeName = DOCUMENTS_STORE_NAME;
                tituloModal = 'Selecionar Documentos para Vincular à Autuação';
                placeholderBusca = 'Buscar por título, tipo, referência...';
                tempSelectedIdsModal = [...currentRelatedDocIds];
                currentSelectionArrayRef = currentRelatedDocIds;
                renderListCallback = () => renderSelectedItemsListAutuacao(currentRelatedDocIds, 'lista-docs-vinculados-autuacao', DOCUMENTS_STORE_NAME, 'documento', 'title');
                displayField = 'title';
                subInfoCallback = (item) => `(${item.docType || 'N/D'} - Ref: ${item.reference || 'N/A'})`;
                break;
            case 'contribuinte':
                storeName = CONTRIBUINTES_STORE_NAME;
                tituloModal = 'Selecionar Contribuintes para Vincular à Autuação';
                placeholderBusca = 'Buscar por nome, CPF/CNPJ, ID interno...';
                tempSelectedIdsModal = [...currentRelatedContribIds];
                currentSelectionArrayRef = currentRelatedContribIds;
                displayField = 'nome';
                renderListCallback = () => renderSelectedItemsListAutuacao(currentRelatedContribIds, 'lista-contribs-vinculados-autuacao', CONTRIBUINTES_STORE_NAME, 'contribuinte', 'nome');
                subInfoCallback = (item) => `(${item.numeroIdentificacao || item.cpfCnpj || 'N/A'})`;
                break;
            case 'tarefa':
                storeName = TAREFAS_STORE_NAME;
                tituloModal = 'Selecionar Tarefas para Vincular à Autuação';
                placeholderBusca = 'Buscar por título, ID, status...';
                tempSelectedIdsModal = [...currentRelatedTarefaIds];
                currentSelectionArrayRef = currentRelatedTarefaIds;
                renderListCallback = () => renderSelectedItemsListAutuacao(currentRelatedTarefaIds, 'lista-tarefas-vinculadas-autuacao', TAREFAS_STORE_NAME, 'tarefa', 'titulo');
                displayField = 'titulo';
                subInfoCallback = (item) => `(Status: ${item.status || 'N/D'}, Prazo: ${item.dataVencimento ? new Date(item.dataVencimento+'T00:00:00').toLocaleDateString() : 'N/A'})`;
                break;
            case 'notaRapida':
                storeName = NOTAS_RAPIDAS_STORE_NAME;
                tituloModal = 'Selecionar Notas Rápidas para Vincular à Autuação';
                placeholderBusca = 'Buscar por título, conteúdo...';
                tempSelectedIdsModal = [...currentRelatedNotaRapidaIds];
                currentSelectionArrayRef = currentRelatedNotaRapidaIds;
                renderListCallback = () => renderSelectedItemsListAutuacao(currentRelatedNotaRapidaIds, 'lista-notas-vinculadas-autuacao', NOTAS_RAPIDAS_STORE_NAME, 'notaRapida', 'titulo');
                displayField = 'titulo';
                subInfoCallback = (item) => `(Modif.: ${new Date(item.dataModificacao).toLocaleDateString()})`;
                break;
            default: return;
        }
    
        const modalId = `modal-selecionar-${tipoEntidade}-autuacao`;
        const modalContentHtml = `
            <div class="bg-gray-100 dark:bg-slate-700 p-4 rounded-md">
                <input type="search" id="filtro-modal-${tipoEntidade}-autuacao" class="form-input-text w-full mb-3 text-sm" placeholder="${placeholderBusca}">
                <div id="lista-${tipoEntidade}s-modal-autuacao"
                     class="overflow-y-auto flex-grow border dark:border-slate-500 rounded-md p-2 min-h-[200px] max-h-[40vh]
                            bg-gray-50 dark:bg-slate-600">
                    <p class="text-sm text-gray-500 dark:text-gray-300">Carregando...</p>
                </div>
            </div>
        `;
    
        const carregarItensNoModal = async (termoBusca = '') => {
            const listaModalEl = document.getElementById(`lista-${tipoEntidade}s-modal-autuacao`);
            if (!listaModalEl) return;
            listaModalEl.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-300">Carregando...</p>';
            try {
                let todosItens = await dbRef.getAllItems(storeName);
                
                // CORREÇÃO: Utiliza a função centralizada para filtrar itens ativos.
                let itensAtivos = window.SEFWorkStation.EntityConfig.filterActiveItems(todosItens, storeName);
    
                if (termoBusca) {
                    const termo = termoBusca.toLowerCase();
                    itensAtivos = itensAtivos.filter(item => {
                        if (tipoEntidade === 'ptaOriginario') return (item.numeroPTA && item.numeroPTA.toLowerCase().includes(termo)) || (item.assuntoPTA && item.assuntoPTA.toLowerCase().includes(termo));
                        if (tipoEntidade === 'protocoloOriginario') return (item.numeroProtocolo && item.numeroProtocolo.toLowerCase().includes(termo)) || (item.assunto && item.assunto.toLowerCase().includes(termo));
                        if (tipoEntidade === 'documento') return (item.title && item.title.toLowerCase().includes(termo)) || (item.reference && item.reference.toLowerCase().includes(termo));
                        if (tipoEntidade === 'contribuinte') return (item.nome && item.nome.toLowerCase().includes(termo)) || (item.cpfCnpj && item.cpfCnpj.toLowerCase().includes(termo)) || (item.numeroIdentificacao && item.numeroIdentificacao.toLowerCase().includes(termo));
                        if (tipoEntidade === 'tarefa' || tipoEntidade === 'notaRapida') return (item.titulo && item.titulo.toLowerCase().includes(termo)) || (item.conteudo && item.conteudo.toLowerCase().includes(termo));
                        return false;
                    });
                }
                itensAtivos.sort((a, b) => ((a[displayField] || a.nome || a.titulo) || "").localeCompare((b[displayField] || b.nome || b.titulo) || ""));
    
                if (itensAtivos.length === 0) {
                    listaModalEl.innerHTML = `<p class="text-sm text-gray-500 dark:text-gray-300">${termoBusca ? 'Nenhum item encontrado.' : `Nenhum ${labelSingular} disponível.`}</p>`;
                    return;
                }
    
                let itemsHtml = '<ul class="space-y-2">';
                itensAtivos.forEach(item => {
                    const isChecked = tempSelectedIdsModal.includes(item.id);
                    let displayName = `ID ${item.id.toString().substring(0,8)}`;
                    if (tipoEntidade === 'ptaOriginario' && item.numeroPTA) { displayName = `PTA ${item.numeroPTA}`; }
                    else if (tipoEntidade === 'protocoloOriginario' && item.numeroProtocolo) { displayName = `Protocolo ${item.numeroProtocolo}`; }
                    else { displayName = item[displayField] || item.nome || item.titulo || `ID ${item.id.toString().substring(0,8)}`;}
    
                    const subInfo = subInfoCallback(item);
                    itemsHtml += `
                        <li class="p-2 rounded hover:bg-gray-200 dark:hover:bg-slate-500">
                            <label class="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" value="${item.id}" class="form-checkbox rounded text-blue-600 modal-${tipoEntidade}-autuacao-checkbox" ${isChecked ? 'checked' : ''}>
                                <span class="text-sm text-gray-700 dark:text-gray-200">
                                    ${displayName} <span class="text-xs text-gray-500 dark:text-gray-400 ml-1">${subInfo}</span>
                                </span>
                            </label>
                        </li>`;
                });
                itemsHtml += '</ul>';
                listaModalEl.innerHTML = itemsHtml;
    
                listaModalEl.querySelectorAll(`.modal-${tipoEntidade}-autuacao-checkbox`).forEach(cb => {
                    cb.addEventListener('change', (e) => {
                        const itemId = e.target.value;
                        if (e.target.checked) {
                            if (!tempSelectedIdsModal.includes(itemId)) tempSelectedIdsModal.push(itemId);
                        } else {
                            tempSelectedIdsModal = tempSelectedIdsModal.filter(id => id !== itemId);
                        }
                    });
                });
            } catch (error) { console.error(`Erro ao carregar ${labelSingular}s no modal para Autuação:`, error); if (listaModalEl) listaModalEl.innerHTML = `<p class="text-sm text-red-500 dark:text-red-400">Erro ao carregar ${labelSingular}s.</p>`; }
        };
    
        const modalButtons = [
            { text: 'Cancelar', class: 'btn-secondary text-sm', callback: () => uiModuleRef.closeModal() },
            {
                text: 'Confirmar Seleção',
                class: 'btn-primary text-sm',
                callback: () => {
                    if (tipoEntidade === 'ptaOriginario') currentRelatedPTAOriginarioIds = [...tempSelectedIdsModal];
                    else if (tipoEntidade === 'protocoloOriginario') currentRelatedProtocoloOriginarioIds = [...tempSelectedIdsModal];
                    else if (tipoEntidade === 'documento') currentRelatedDocIds = [...tempSelectedIdsModal];
                    else if (tipoEntidade === 'contribuinte') currentRelatedContribIds = [...tempSelectedIdsModal];
                    else if (tipoEntidade === 'tarefa') currentRelatedTarefaIds = [...tempSelectedIdsModal];
                    else if (tipoEntidade === 'notaRapida') currentRelatedNotaRapidaIds = [...tempSelectedIdsModal];
                    renderListCallback();
                    uiModuleRef.closeModal();
                }
            }
        ];
        uiModuleRef.showModal(tituloModal, modalContentHtml, modalButtons, 'max-w-2xl', modalId);
        const filtroInput = document.getElementById(`filtro-modal-${tipoEntidade}-autuacao`);
        if (filtroInput) filtroInput.addEventListener('input', () => carregarItensNoModal(filtroInput.value));
        await carregarItensNoModal();
    }
    
    // ... (restante do arquivo `autuacoesForm.js` sem modificações)
    // ... (renderExistingAttachmentsAutuacao, renderSelectedServidoresNoFormAutuacao, etc.)
    function renderExistingAttachmentsAutuacao() {
        const listContainer = document.getElementById('anexos-existentes-autuacao-list');
        if (!listContainer) return;

        listContainer.innerHTML = '';
        if (existingAttachmentsAutuacao.length > 0) {
            const ul = document.createElement('ul');
            ul.className = 'list-none p-0 mb-2';
            existingAttachmentsAutuacao.forEach((anexo, index) => {
                const li = document.createElement('li');
                li.className = 'anexo-preview-item flex justify-between items-center text-sm p-2 bg-gray-100 dark:bg-slate-600 rounded mb-1';
                li.innerHTML = `
                    <span>${anexo.fileName.replace(/"/g, '"')} (${(anexo.fileSize / 1024).toFixed(1)} KB)</span>
                    <button type="button" data-index="${index}" class="btn-remove-anexo-preview-autuacao text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300" title="Remover anexo existente">
                        ×
                    </button>
                `;
                ul.appendChild(li);
            });
            listContainer.appendChild(ul);

            listContainer.querySelectorAll('.btn-remove-anexo-preview-autuacao').forEach(button => {
                button.addEventListener('click', (event) => {
                    const indexToRemove = parseInt(event.currentTarget.dataset.index);
                    existingAttachmentsAutuacao.splice(indexToRemove, 1);
                    renderExistingAttachmentsAutuacao();
                });
            });
        }
    }
    
    async function renderSelectedServidoresNoFormAutuacao() { 
        const container = document.getElementById('lista-servidores-vinculados-autuacao');
        if (!container) return;
        container.innerHTML = '';
        if (!currentRelatedServidorIds || currentRelatedServidorIds.length === 0) {
            container.innerHTML = '<p class="text-xs text-gray-500 dark:text-gray-300">Nenhum servidor vinculado.</p>';
            return;
        }
        const ul = document.createElement('ul');
        ul.className = 'list-none p-0 space-y-1';
        for (const servidorId of currentRelatedServidorIds) {
            try {
                const servidor = await dbRef.getItemById(SERVIDORES_STORE_NAME, servidorId);
                const li = document.createElement('li');
                li.className = 'flex justify-between items-center text-xs p-1.5 bg-blue-100 dark:bg-blue-700 rounded';
                const displayName = servidor ? `${servidor.nome} (${servidor.matricula || 'S/Matr.'})` : `ID ${servidorId.substring(0, 8)} (Não encontrado)`;
                li.innerHTML = `<span class="truncate text-blue-800 dark:text-blue-200" title="${displayName.replace(/"/g, '"')}">${displayName}</span>
                                <button type="button" data-id="${servidorId}" class="btn-remove-related-servidor-autuacao text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm leading-none p-0.5" title="Remover vínculo com este servidor">×</button>`;
                li.querySelector('.btn-remove-related-servidor-autuacao').addEventListener('click', (e) => {
                    const idToRemove = e.currentTarget.dataset.id;
                    currentRelatedServidorIds = currentRelatedServidorIds.filter(id => id.toString() !== idToRemove.toString());
                    renderSelectedServidoresNoFormAutuacao();
                });
                ul.appendChild(li);
            } catch (error) {
                console.warn(`Erro ao renderizar servidor vinculado ID ${servidorId} para autuação:`, error);
            }
        }
        container.appendChild(ul);
    }

    async function abrirModalSelecaoServidoresParaAutuacao() { 
        if (!uiModuleRef || !uiModuleRef.showModal) {
            if(globalShowFeedbackRef) globalShowFeedbackRef("Erro: Funcionalidade de modal não está disponível.", "error", document.getElementById(`feedback-form-autuacao-${currentAutuacaoId || 'novo'}`));
            return;
        }
        const modalId = `modal-selecionar-servidores-autuacao-${currentAutuacaoId || Date.now()}`;
        tempSelectedIdsModal = [...currentRelatedServidorIds]; 

        const modalContentHtml = `
            <div class="bg-gray-100 dark:bg-slate-700 p-3 rounded-md">
                <input type="search" id="filtro-modal-servidores-autuacao" class="form-input-text w-full mb-3 text-sm" placeholder="Buscar por nome, matrícula, e-mail...">
                <div id="lista-servidores-modal-autuacao" class="overflow-y-auto flex-grow border dark:border-slate-500 rounded-md p-2 min-h-[200px] max-h-[50vh] bg-white dark:bg-slate-600">
                    <p class="text-sm text-gray-500 dark:text-gray-300">Carregando servidores...</p>
                </div>
            </div>
        `;

        const carregarServidoresNoModal = async (termoBusca = '') => {
            const listaModalEl = document.getElementById(`lista-servidores-modal-autuacao`);
            if (!listaModalEl) return;
            listaModalEl.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-300">Carregando...</p>';
            try {
                let servidores = await dbRef.getAllItems(SERVIDORES_STORE_NAME);
                servidores = servidores.filter(s => !s.isDeleted && s.status === 'Ativo');

                if (termoBusca) {
                    const t = termoBusca.toLowerCase();
                    servidores = servidores.filter(s =>
                        (s.nome && s.nome.toLowerCase().includes(t)) ||
                        (s.matricula && s.matricula.toLowerCase().includes(t)) ||
                        (s.email && s.email.toLowerCase().includes(t))
                    );
                }
                servidores.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));

                if (servidores.length === 0) {
                    listaModalEl.innerHTML = `<p class="text-sm text-gray-500 dark:text-gray-300">${termoBusca ? 'Nenhum servidor encontrado.' : 'Nenhum servidor ativo cadastrado.'}</p>`;
                    return;
                }

                let itemsHtml = '<ul class="space-y-1.5">';
                servidores.forEach(servidor => {
                    const isChecked = tempSelectedIdsModal.includes(servidor.id);
                    itemsHtml += `
                        <li class="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-500">
                            <label class="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" value="${servidor.id}" class="form-checkbox rounded text-blue-600 modal-servidor-autuacao-checkbox h-4 w-4" ${isChecked ? 'checked' : ''}>
                                <span class="text-sm text-gray-700 dark:text-gray-200">
                                    ${servidor.nome} <span class="text-xs text-gray-500 dark:text-gray-400">(${servidor.matricula || 'S/Matr.'} - ${servidor.localExercicio || 'S/Local'})</span>
                                </span>
                            </label>
                        </li>`;
                });
                itemsHtml += '</ul>';
                listaModalEl.innerHTML = itemsHtml;

                listaModalEl.querySelectorAll('.modal-servidor-autuacao-checkbox').forEach(cb => {
                    cb.addEventListener('change', (e) => {
                        const servidorId = e.target.value;
                        if (e.target.checked) {
                            if (!tempSelectedIdsModal.includes(servidorId)) tempSelectedIdsModal.push(servidorId);
                        } else {
                            tempSelectedIdsModal = tempSelectedIdsModal.filter(id => id !== servidorId);
                        }
                    });
                });
            } catch (error) {
                if (listaModalEl) listaModalEl.innerHTML = `<p class="text-sm text-red-500 dark:text-red-400">Erro ao carregar servidores.</p>`;
            }
        };

        const modalButtons = [
            { text: 'Cancelar', class: 'btn-secondary text-sm', callback: () => uiModuleRef.closeModal(), closesModal: true },
            {
                text: 'Confirmar Seleção',
                class: 'btn-primary text-sm',
                callback: async () => {
                    currentRelatedServidorIds = [...tempSelectedIdsModal];
                    await renderSelectedServidoresNoFormAutuacao();
                    uiModuleRef.closeModal();
                }
            }
        ];
        uiModuleRef.showModal('Selecionar Servidores Vinculados à Autuação', modalContentHtml, modalButtons, 'max-w-xl', modalId);
        const filtroInput = document.getElementById(`filtro-modal-servidores-autuacao`);
        if (filtroInput) filtroInput.addEventListener('input', () => carregarServidoresNoModal(filtroInput.value));
        await carregarServidoresNoModal();
    }


    async function renderSelectedRelatedItemsAutuacao() {
        await renderSelectedItemsListAutuacao(currentRelatedPTAOriginarioIds, 'lista-ptas-vinculados-autuacao', PTAS_STORE_NAME, 'ptaOriginario', 'numeroPTA');
        await renderSelectedItemsListAutuacao(currentRelatedProtocoloOriginarioIds, 'lista-protocolos-originarios-autuacao', PROTOCOLOS_STORE_NAME, 'protocoloOriginario', 'numeroProtocolo');
        await renderSelectedItemsListAutuacao(currentRelatedDocIds, 'lista-docs-vinculados-autuacao', DOCUMENTS_STORE_NAME, 'documento', 'title');
        await renderSelectedItemsListAutuacao(currentRelatedContribIds, 'lista-contribs-vinculados-autuacao', CONTRIBUINTES_STORE_NAME, 'contribuinte', 'nome');
        await renderSelectedItemsListAutuacao(currentRelatedTarefaIds, 'lista-tarefas-vinculadas-autuacao', TAREFAS_STORE_NAME, 'tarefa', 'titulo');
        await renderSelectedItemsListAutuacao(currentRelatedNotaRapidaIds, 'lista-notas-vinculadas-autuacao', NOTAS_RAPIDAS_STORE_NAME, 'notaRapida', 'titulo');
    }

    async function renderSelectedItemsListAutuacao(ids, containerId, storeName, tipoEntidade, displayField = 'title') {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`Container ${containerId} não encontrado para tipo ${tipoEntidade}`);
            return;
        }

        container.innerHTML = '';
        let labelSingular = tipoEntidade.toLowerCase();
        if (tipoEntidade === 'ptaOriginario') labelSingular = 'PTA de origem';
        else if (tipoEntidade === 'protocoloOriginario') labelSingular = 'protocolo de origem';
        else if (tipoEntidade === 'notaRapida') labelSingular = 'nota rápida';


        if (!ids || ids.length === 0) {
            container.innerHTML = `<p class="text-xs text-gray-500 dark:text-gray-300">Nenhum ${labelSingular} vinculado.</p>`;
            return;
        }

        const ul = document.createElement('ul');
        ul.className = 'list-none p-0 space-y-1';
        for (const id of ids) {
            try {
                const item = await dbRef.getItemById(storeName, id);
                const li = document.createElement('li');
                li.className = 'flex justify-between items-center text-xs p-1.5 bg-gray-200 dark:bg-slate-600 rounded';
                let displayName = `ID ${id.toString().substring(0,8)} (não encontrado)`;
                if (item) {
                    displayName = item[displayField] || item.nome || item.titulo || `ID ${id.toString().substring(0,8)}`;
                     if ((tipoEntidade === 'ptaOriginario' || tipoEntidade === 'protocoloOriginario') && item[displayField]) {
                        displayName = `${labelSingular.split(' ')[0].toUpperCase()} ${item[displayField]}`;
                    }
                }

                li.innerHTML = `
                    <span class="truncate text-gray-700 dark:text-gray-200" title="${displayName.replace(/"/g, '"')}">${displayName}</span>
                    <button type="button" data-id="${id}" data-type="${tipoEntidade}" class="btn-remove-related-item-autuacao text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm leading-none p-0.5" title="Remover vínculo">×</button>
                `;
                li.querySelector('.btn-remove-related-item-autuacao').addEventListener('click', (e) => {
                    const idToRemove = e.currentTarget.dataset.id;
                    const typeToRemove = e.currentTarget.dataset.type;
                    if (typeToRemove === 'ptaOriginario') currentRelatedPTAOriginarioIds = currentRelatedPTAOriginarioIds.filter(i => i.toString() !== idToRemove.toString());
                    else if (typeToRemove === 'protocoloOriginario') currentRelatedProtocoloOriginarioIds = currentRelatedProtocoloOriginarioIds.filter(i => i.toString() !== idToRemove.toString());
                    else if (typeToRemove === 'documento') currentRelatedDocIds = currentRelatedDocIds.filter(i => i.toString() !== idToRemove.toString());
                    else if (typeToRemove === 'contribuinte') currentRelatedContribIds = currentRelatedContribIds.filter(i => i.toString() !== idToRemove.toString());
                    else if (typeToRemove === 'tarefa') currentRelatedTarefaIds = currentRelatedTarefaIds.filter(i => i.toString() !== idToRemove.toString());
                    else if (typeToRemove === 'notaRapida') currentRelatedNotaRapidaIds = currentRelatedNotaRapidaIds.filter(i => i.toString() !== idToRemove.toString());
                    renderSelectedRelatedItemsAutuacao();
                });
                ul.appendChild(li);
            } catch (error) {
                console.warn(`Erro ao renderizar item relacionado ${tipoEntidade} ID ${id} para Autuação:`, error);
            }
        }
        container.appendChild(ul);
    }
    
    function addFormEventListenersAutuacao(feedbackAreaId, originatingView, isEditing) {
        // ... (código da função mantido, pois não precisa de alterações para esta correção)
        const form = document.getElementById('form-autuacao');
        const feedbackAreaForm = document.getElementById(feedbackAreaId);
        const hiddenAutuacaoIdInput = document.getElementById('autuacao-id-hidden');
        const numeroAutuacaoInput = document.getElementById('autuacao-numero');
        const anexoInput = document.getElementById('autuacao-anexos-input');
        const anexoPreviewList = document.getElementById('anexos-preview-autuacao-list');

        document.getElementById('btn-gerenciar-ptas-vinculados-autuacao')?.addEventListener('click', () => abrirModalSelecaoAutuacao('ptaOriginario'));
        document.getElementById('btn-gerenciar-protocolos-originarios-autuacao')?.addEventListener('click', () => abrirModalSelecaoAutuacao('protocoloOriginario'));
        document.getElementById('btn-gerenciar-docs-vinculados-autuacao')?.addEventListener('click', () => abrirModalSelecaoAutuacao('documento'));
        document.getElementById('btn-gerenciar-contribs-vinculados-autuacao')?.addEventListener('click', () => abrirModalSelecaoAutuacao('contribuinte'));
        document.getElementById('btn-gerenciar-servidores-vinculados-autuacao')?.addEventListener('click', () => abrirModalSelecaoServidoresParaAutuacao());
        document.getElementById('btn-gerenciar-tarefas-vinculados-autuacao')?.addEventListener('click', () => abrirModalSelecaoAutuacao('tarefa'));
        document.getElementById('btn-gerenciar-notas-vinculadas-autuacao')?.addEventListener('click', () => abrirModalSelecaoAutuacao('notaRapida'));


        if (anexoInput) {
            anexoInput.addEventListener('change', (event) => {
                currentFilesToAttachAutuacao = Array.from(event.target.files);
                anexoPreviewList.innerHTML = '';
                if (currentFilesToAttachAutuacao.length > 0) {
                    const ul = document.createElement('ul');
                    ul.className = 'list-disc pl-5 text-sm text-gray-600 dark:text-gray-400';
                    currentFilesToAttachAutuacao.forEach(file => {
                        const li = document.createElement('li');
                        li.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
                        ul.appendChild(li);
                    });
                    anexoPreviewList.appendChild(ul);
                }
            });
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const btnSalvar = document.getElementById('btn-salvar-autuacao');
            if (btnSalvar) btnSalvar.disabled = true;
            if (globalClearFeedbackRef) globalClearFeedbackRef(feedbackAreaForm);

            const dataAutuacaoInput = document.getElementById('autuacao-data');
            const tipoAutuacaoInput = document.getElementById('autuacao-tipo');
            const assuntoInput = document.getElementById('autuacao-assunto');

            if (!dataAutuacaoInput.value) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("A 'Data da Autuação' é obrigatória.", "error", feedbackAreaForm);
                dataAutuacaoInput.focus(); if(btnSalvar) btnSalvar.disabled = false; return;
            }
             if (!tipoAutuacaoInput.value.trim()) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("O 'Tipo de Autuação' é obrigatório.", "error", feedbackAreaForm);
                tipoAutuacaoInput.focus(); if(btnSalvar) btnSalvar.disabled = false; return;
            }
            if (!assuntoInput.value.trim()) {
                if (globalShowFeedbackRef) globalShowFeedbackRef("O 'Assunto/Matéria' é obrigatório.", "error", feedbackAreaForm);
                assuntoInput.focus(); if(btnSalvar) btnSalvar.disabled = false; return;
            }

            let finalAutuacaoId = hiddenAutuacaoIdInput.value || appModuleRef.generateUUID();
            let numeroAutuacaoInformado = numeroAutuacaoInput.value.trim();
            
            if (!isEditing && !numeroAutuacaoInformado) { 
                numeroAutuacaoInformado = await appModuleRef.generateAutuacaoNumeroIdentificacao();
            } else if (isEditing) { 
                numeroAutuacaoInformado = document.getElementById('autuacao-numero-original-hidden').value || (originalAutuacaoData && originalAutuacaoData.numeroAutuacao ? originalAutuacaoData.numeroAutuacao : await appModuleRef.generateAutuacaoNumeroIdentificacao());
            }
            
            if (!isEditing || (isEditing && numeroAutuacaoInput.value.trim() && numeroAutuacaoInput.value.trim() !== originalAutuacaoData.numeroAutuacao)) {
                 try {
                    const todasAutuacoes = await dbRef.getAllItems(AUTUACOES_STORE_NAME);
                    if (todasAutuacoes.some(a => a.numeroAutuacao === numeroAutuacaoInformado && a.id !== finalAutuacaoId)) {
                        if (globalShowFeedbackRef) globalShowFeedbackRef(`O número de autuação "${numeroAutuacaoInformado}" já existe.`, "error", feedbackAreaForm);
                        numeroAutuacaoInput.focus(); if(btnSalvar) btnSalvar.disabled = false;
                        return;
                    }
                } catch (dbError) { 
                    console.error("Erro ao verificar duplicidade de número de autuação:", dbError);
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Erro ao verificar número da autuação. Tente novamente.", "error", feedbackAreaForm);
                    if(btnSalvar) btnSalvar.disabled = false; return;
                }
            }
            
            const tipoAutuacaoInformado = tipoAutuacaoInput.value.trim();
            try {
                const tiposExistentes = await dbRef.getAllItems(AUTUACAO_TYPES_STORE_NAME);
                if (!tiposExistentes.some(t => t.name.toLowerCase() === tipoAutuacaoInformado.toLowerCase())) {
                    const novoTipo = { id: appModuleRef.generateUUID(), name: tipoAutuacaoInformado };
                    await dbRef.addItem(AUTUACAO_TYPES_STORE_NAME, novoTipo);
                    if (globalShowFeedbackRef) globalShowFeedbackRef(`Novo tipo de autuação "${tipoAutuacaoInformado}" cadastrado.`, "info", feedbackAreaForm);
                    if (refreshApplicationStateRef) await refreshApplicationStateRef();
                }
            } catch (e) {
                console.error("AutuacaoForm.JS: Erro ao salvar novo tipo de autuação:", e);
            }

            const primeiroAndamentoTextoInput = document.getElementById('autuacao-primeiro-andamento');
            const primeiroAndamentoTexto = primeiroAndamentoTextoInput ? primeiroAndamentoTextoInput.value.trim() : "";
            let historicoAndamentoArray = (isEditing && originalAutuacaoData?.historicoAndamentoAutuacao) ? [...originalAutuacaoData.historicoAndamentoAutuacao] : [];

            if (!isEditing && primeiroAndamentoTexto) {
                historicoAndamentoArray.unshift({
                    data: new Date().toISOString(),
                    descricao: primeiroAndamentoTexto,
                    responsavel: document.getElementById('autuacao-responsavel').value.trim() || "Sistema",
                    tipoAndamento: "Registro Inicial"
                });
            }

            const autuacaoPayload = {
                id: finalAutuacaoId,
                numeroAutuacao: numeroAutuacaoInformado,
                dataAutuacao: new Date(dataAutuacaoInput.value + "T00:00:00").toISOString(),
                tipoAutuacao: tipoAutuacaoInformado,
                assuntoAutuacao: assuntoInput.value.trim(),
                descricaoDetalhadaAutuacao: document.getElementById('autuacao-descricao').value.trim(),
                servidorResponsavelAutuacao: document.getElementById('autuacao-responsavel').value.trim(),
                statusAutuacao: document.getElementById('autuacao-status').value,
                historicoAndamentoAutuacao: historicoAndamentoArray,
                anexos: [...existingAttachmentsAutuacao.map(a=>({...a, ownerId: finalAutuacaoId, ownerType: 'autuacao' })), 
                         ...currentFilesToAttachAutuacao.map(f => ({ ownerId: finalAutuacaoId, ownerType: 'autuacao', fileName: f.name, fileSize: f.size, fileType: f.type, filePath: '' } ))],
                ptasOriginariosIds: [...currentRelatedPTAOriginarioIds],
                protocolosOriginariosIds: [...currentRelatedProtocoloOriginarioIds],
                documentosVinculadosIds: [...currentRelatedDocIds],
                contribuintesVinculadosIds: [...currentRelatedContribIds],
                tarefasVinculadasIds: [...currentRelatedTarefaIds],
                notasRapidasRelacionadasIds: [...currentRelatedNotaRapidaIds], 
                servidoresVinculadosIds: [...currentRelatedServidorIds],
                notasInternasAutuacao: document.getElementById('autuacao-notas-internas').value.trim(),
                dataCriacao: document.getElementById('autuacao-creation-date').value,
                dataModificacao: new Date().toISOString(),
                isDeleted: (isEditing && originalAutuacaoData) ? (originalAutuacaoData.isDeleted || false) : false
            };

            if (currentFilesToAttachAutuacao.length > 0 && window.SEFWorkStation.SharedUtils && typeof window.SEFWorkStation.SharedUtils.getOrCreateAttachmentDirHandle === 'function') {
                const dirHandle = await window.SEFWorkStation.SharedUtils.getOrCreateAttachmentDirHandle('processos/autuacoes', finalAutuacaoId);
                if (dirHandle) {
                    let anexoPayloadIndexBase = existingAttachmentsAutuacao.length;
                    for (let i = 0; i < currentFilesToAttachAutuacao.length; i++) {
                        const file = currentFilesToAttachAutuacao[i];
                        const anexoPayloadIndex = anexoPayloadIndexBase + i;
                        const newFileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
                        const fileHandle = await dirHandle.getFileHandle(newFileName, { create: true });
                        const writable = await fileHandle.createWritable();
                        await writable.write(file);
                        await writable.close();
                         if (autuacaoPayload.anexos[anexoPayloadIndex]) {
                            autuacaoPayload.anexos[anexoPayloadIndex].filePath = `processos/autuacoes/${finalAutuacaoId}/${newFileName}`;
                        }
                    }
                } else { throw new Error("Não foi possível acessar a pasta de anexos para Autuações."); }
            }

            try {
                const idsAnterioresPTAs = originalAutuacaoData?.ptasOriginariosIds || [];
                const idsAnterioresProtocolos = originalAutuacaoData?.protocolosOriginariosIds || [];
                const idsAnterioresDocs = originalAutuacaoData?.documentosVinculadosIds || [];
                const idsAnterioresContribs = originalAutuacaoData?.contribuintesVinculadosIds || [];
                const idsAnterioresTarefas = originalAutuacaoData?.tarefasVinculadasIds || [];
                const idsAnterioresNotas = originalAutuacaoData?.notasRapidasRelacionadasIds || [];
                const idsAnterioresServidores = originalAutuacaoData?.servidoresVinculadosIds || [];

                if (isEditing) {
                    await dbRef.updateItem(AUTUACOES_STORE_NAME, autuacaoPayload);
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Autuação atualizada com sucesso!", "success", feedbackAreaForm);
                } else {
                    await dbRef.addItem(AUTUACOES_STORE_NAME, autuacaoPayload);
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Autuação salva com sucesso!", "success", feedbackAreaForm);
                }

                if (window.SEFWorkStation.SharedUtils && typeof window.SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais === 'function') {
                    await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(finalAutuacaoId, PTAS_STORE_NAME, 'autuacoesGeradasIds', currentRelatedPTAOriginarioIds, idsAnterioresPTAs, dbRef);
                    await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(finalAutuacaoId, PROTOCOLOS_STORE_NAME, 'autuacoesGeradasIds', currentRelatedProtocoloOriginarioIds, idsAnterioresProtocolos, dbRef);
                    await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(finalAutuacaoId, DOCUMENTS_STORE_NAME, 'autuacoesVinculadasIds', currentRelatedDocIds, idsAnterioresDocs, dbRef);
                    await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(finalAutuacaoId, CONTRIBUINTES_STORE_NAME, 'autuacoesRelacionadasIds', currentRelatedContribIds, idsAnterioresContribs, dbRef);
                    await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(finalAutuacaoId, TAREFAS_STORE_NAME, 'autuacoesVinculadasIds', currentRelatedTarefaIds, idsAnterioresTarefas, dbRef);
                    await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(finalAutuacaoId, NOTAS_RAPIDAS_STORE_NAME, 'autuacoesRelacionadasIds', currentRelatedNotaRapidaIds, idsAnterioresNotas, dbRef);
                    await SEFWorkStation.SharedUtils.atualizarRelacionamentosBidirecionais(finalAutuacaoId, SERVIDORES_STORE_NAME, 'autuacoesVinculadasIds', currentRelatedServidorIds, idsAnterioresServidores, dbRef);
                }

                if (refreshApplicationStateRef) await refreshApplicationStateRef();

                if (navigateAfterSaveOrCancelCallback) {
                    if (autuacoesViewModuleRef && typeof autuacoesViewModuleRef.renderVisualizarAutuacaoPage === 'function') {
                        navigateAfterSaveOrCancelCallback('visualizar-autuacao', { autuacaoId: finalAutuacaoId, originatingView: originatingView });
                    } else {
                        navigateAfterSaveOrCancelCallback('gerir-autuacoes');
                    }
                }

            } catch (error) {
                console.error("AutuacaoForm.JS: Erro ao salvar Autuação no DB:", error);
                if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao salvar Autuação: ${error.message}`, "error", feedbackAreaForm);
            } finally {
                 if (btnSalvar) btnSalvar.disabled = false;
            }
        });

        document.getElementById('btn-cancelar-autuacao').addEventListener('click', () => {
            if (appModuleRef && appModuleRef.navigateBack) {
                appModuleRef.navigateBack();
            } else {
                console.warn("AutuacaoForm.JS: appModuleRef.navigateBack não disponível. Usando fallback para navigateAfterSaveOrCancelCallback.");
                if (navigateAfterSaveOrCancelCallback) {
                    if (isEditing && currentAutuacaoId && autuacoesViewModuleRef && typeof autuacoesViewModuleRef.renderVisualizarAutuacaoPage === 'function') {
                         navigateAfterSaveOrCancelCallback('visualizar-autuacao', { autuacaoId: currentAutuacaoId, originatingView: originatingView });
                    } else {
                        navigateAfterSaveOrCancelCallback(originatingView || 'gerir-autuacoes');
                    }
                }
            }
        });
    }

    return {
        init,
        renderFormularioAutuacao
    };
})();