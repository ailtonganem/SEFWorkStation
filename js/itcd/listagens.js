// js/itcd/listagens.js - Módulo para Listagem de Avaliações de ITCD
// v2.2.0 - CORRIGIDO: Garante contraste de texto no tema escuro para a contagem de resultados.
// v2.1.0 - Adiciona a aba e a lógica de listagem/pesquisa para avaliações de Semoventes.
// v2.0.0 - REFATORADO: Adiciona estrutura de abas para separar avaliações Urbanas, Rurais e de Semoventes. Cada aba possui colunas e pesquisa específicas.
// v1.5.0 - Adiciona funcionalidade completa de pesquisa e filtro para avaliações.
// v1.4.0 - Adiciona modal completo para criação de novas avaliações com pesquisa e filtro.
// v1.3.0 - Adiciona botão para Duplicar uma avaliação.
// v1.2.0 - Altera colunas da listagem para Endereço/Inscrição e corrige exibição do valor.
// v1.1.0 - Implementação completa da tabela de listagem e ações.
// v1.0.0 - Estrutura inicial do módulo.

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ITCD = window.SEFWorkStation.ITCD || {};

window.SEFWorkStation.ITCD.Listagens = (function() {

    let mainContentWrapperRef;
    let dbRef;
    let appModuleRef;
    let uiModuleRef;
    let activeTab = 'urbano'; // 'urbano', 'rural', 'semovente'
    
    const ITCD_AVALIACOES_STORE = 'itcdAvaliacoesStore';

    const TIPOS_AVALIACAO = [
        { id: 'urbano', title: 'Imóvel Urbano', description: 'Para apartamentos, casas, lotes, salas comerciais e outros imóveis em área urbana.', action: 'itcd-avaliar-imovel-urbano', type: 'imovel', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-building" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M14.763.075A.5.5 0 0 1 15 .5v15a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5V14h-1v1.5a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5V14h-1v1.5a.5.5 0 0 1-.5.5H.5a.5.5 0 0 1-.5-.5v-15a.5.5 0 0 1 .237-.425l4.5-3a.5.5 0 0 1 .526 0l4.5 3 .474.316zM12 13.5V3.75l-4-2.667-4 2.667V13.5h8zM8 11h1v1H8v-1zm-2 0h1v1H6v-1zm-2 0h1v1H4v-1zm0-3h1v1H4v-1zm2 0h1v1H6v-1zm2 0h1v1H8v-1zm2 0h1v1h-1v-1zm-2-3h1v1H8V5zm-2 0h1v1H6V5z"/></svg>`},
        { id: 'rural', title: 'Imóvel Rural', description: 'Para fazendas, sítios, chácaras e terrenos localizados em área rural.', action: 'itcd-avaliar-imovel-rural', type: 'imovel', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-house-door" viewBox="0 0 16 16"><path d="M8.354 1.146a.5.5 0 0 0-.708 0l-6 6A.5.5 0 0 0 1.5 7.5v7a.5.5 0 0 0 .5.5h4.5a.5.5 0 0 0 .5-.5v-4h2v4a.5.5 0 0 0 .5.5H14a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.146-.354L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293L8.354 1.146zM2.5 14V7.707l5.5-5.5 5.5 5.5V14H10v-4a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5v4H2.5z"/></svg>`},
        { id: 'semovente', title: 'Semovente', description: 'Para avaliação de gado, equinos e outros tipos de rebanhos.', action: 'itcd-avaliar-semovente', type: 'semovente', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 16c0-2.2 1.8-4 4-4M5 10V4H3.5a2.5 2.5 0 1 0 0 5H5m0-5v2m0 3v2m1.1-4.8c-.2 1.3-1.3 2.3-2.6 2.3H5m0-5a2.5 2.5 0 1 1 5 0V10M12 4h2a2 2 0 1 1 0 4h-2v2a2 2 0 1 0 0 4h2a2 2 0 1 0 0 4h-2v2a2 2 0 1 1-4 0v-2a2 2 0 1 0-4 0v2H2"></path></svg>`}
    ];

    function init(db, app, ui, mainWrapper) {
        dbRef = db;
        appModuleRef = app;
        uiModuleRef = ui;
        mainContentWrapperRef = mainWrapper;
        console.log("Módulo ITCD.Listagens inicializado (v2.2.0).");
    }

    async function renderGerirAvaliacoesPage() {
        if (!mainContentWrapperRef) return;
        
        mainContentWrapperRef.innerHTML = `
            <div id="gerir-avaliacoes-container" class="page-section max-w-none px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-100">Gerenciar Avaliações de ITCD</h2>
                    <button id="btn-nova-avaliacao-modal" class="btn-primary">Nova Avaliação</button>
                </div>
                
                <div class="border-b border-gray-200 dark:border-gray-700">
                    <nav id="avaliacoes-tabs" class="-mb-px flex space-x-6" aria-label="Tabs">
                        <button class="tab-item active-tab" data-tab="urbano">Imóvel Urbano</button>
                        <button class="tab-item" data-tab="rural">Imóvel Rural</button>
                        <button class="tab-item" data-tab="semovente">Semoventes</button>
                    </nav>
                </div>

                <div id="tab-content-container" class="mt-5">
                    <!-- O conteúdo da aba será renderizado aqui -->
                </div>
            </div>
        `;
        
        addTabEventListeners();
        await renderActiveTabContent();
        document.getElementById('btn-nova-avaliacao-modal')?.addEventListener('click', abrirModalNovaAvaliacao);
    }

    function addTabEventListeners() {
        document.getElementById('avaliacoes-tabs')?.addEventListener('click', (e) => {
            if (e.target.matches('.tab-item')) {
                const newTab = e.target.dataset.tab;
                if (newTab !== activeTab) {
                    activeTab = newTab;
                    document.querySelectorAll('#avaliacoes-tabs .tab-item').forEach(t => t.classList.remove('active-tab'));
                    e.target.classList.add('active-tab');
                    renderActiveTabContent();
                }
            }
        });
    }

    async function renderActiveTabContent() {
        const container = document.getElementById('tab-content-container');
        if (!container) return;

        container.innerHTML = `<p class="loading-text p-4">Carregando avaliações...</p>`;

        let filterHtml = '';
        let tableHeaderHtml = '';
        let tipoAvaliacao = '';

        switch (activeTab) {
            case 'urbano':
                tipoAvaliacao = 'imovel-urbano';
                filterHtml = `<input type="search" id="filtro-aval" class="form-input-text w-full md:w-1/2" placeholder="Pesquisar por DBD, Endereço, Inscrição...">`;
                tableHeaderHtml = `
                    <tr>
                        <th>Declaração (DBD)</th>
                        <th>Endereço do Imóvel</th>
                        <th>Inscrição Municipal</th>
                        <th>Data da Avaliação</th>
                        <th>Valor Avaliado</th>
                        <th class="text-center">Ações</th>
                    </tr>`;
                break;
            case 'rural':
                tipoAvaliacao = 'imovel-rural';
                filterHtml = `<input type="search" id="filtro-aval" class="form-input-text w-full md:w-1/2" placeholder="Pesquisar por DBD, Nome do Imóvel...">`;
                tableHeaderHtml = `
                    <tr>
                        <th>Declaração</th>
                        <th>Nome do Imóvel</th>
                        <th>Área Total (ha)</th>
                        <th>Data de Avaliação</th>
                        <th>Valor da Avaliação</th>
                        <th class="text-center">Ações</th>
                    </tr>`;
                break;
            case 'semovente':
                tipoAvaliacao = 'semovente';
                filterHtml = `<input type="search" id="filtro-aval" class="form-input-text w-full md:w-1/2" placeholder="Pesquisar por DBD, CPF, Inscrição Produtor...">`;
                tableHeaderHtml = `
                    <tr>
                        <th>Declaração</th>
                        <th>CPF Produtor</th>
                        <th>Inscrição Produtor</th>
                        <th>Data da Avaliação</th>
                        <th>Valor Total</th>
                        <th class="text-center">Ações</th>
                    </tr>`;
                break;
        }

        container.innerHTML = `
            <div class="filtros-container mb-4">${filterHtml}</div>
            <div id="results-count-container" class="mb-2 text-sm text-gray-600 dark:text-gray-400"></div>
            <div id="lista-avaliacoes" class="table-list-container">
                <table class="documentos-table">
                    <thead>${tableHeaderHtml}</thead>
                    <tbody></tbody>
                </table>
            </div>
        `;

        document.getElementById('filtro-aval')?.addEventListener('input', () => carregarEExibirAvaliacoes());
        await carregarEExibirAvaliacoes();
    }

    async function carregarEExibirAvaliacoes() {
        const tbody = document.querySelector('#lista-avaliacoes tbody');
        const countContainer = document.getElementById('results-count-container');
        const searchTerm = document.getElementById('filtro-aval')?.value.toLowerCase() || '';
        if (!tbody || !countContainer) return;

        tbody.innerHTML = '<tr><td colspan="6" class="text-center p-4">Carregando...</td></tr>';

        try {
            const allAvaliacoes = await dbRef.getAllItems(ITCD_AVALIACOES_STORE);
            const tipoAvaliacao = activeTab === 'urbano' ? 'imovel-urbano' : (activeTab === 'rural' ? 'imovel-rural' : 'semovente');
            
            let avaliacoesFiltradas = allAvaliacoes.filter(a => a.tipo === tipoAvaliacao && !a.isDeleted);
            const totalCount = avaliacoesFiltradas.length;

            if (searchTerm) {
                avaliacoesFiltradas = avaliacoesFiltradas.filter(a => {
                    switch (tipoAvaliacao) {
                        case 'imovel-urbano':
                            return (a.declaracao?.toLowerCase().includes(searchTerm) ||
                                    a.dadosFormulario?.endereco?.toLowerCase().includes(searchTerm) ||
                                    a.dadosFormulario?.inscricao?.toLowerCase().includes(searchTerm));
                        case 'imovel-rural':
                             return (a.declaracao?.toLowerCase().includes(searchTerm) ||
                                    a.dadosFormulario?.nomeImovel?.toLowerCase().includes(searchTerm));
                        case 'semovente':
                            return (a.declaracao?.toLowerCase().includes(searchTerm) ||
                                    a.dadosFormulario?.cpfProdutor?.toLowerCase().includes(searchTerm) ||
                                    a.dadosFormulario?.inscricaoProdutor?.toLowerCase().includes(searchTerm));
                    }
                    return false;
                });
            }

            countContainer.textContent = `Exibindo ${avaliacoesFiltradas.length} de ${totalCount} avaliações.`;
            
            if (avaliacoesFiltradas.length === 0) {
                const message = searchTerm ? 'Nenhuma avaliação encontrada com os filtros aplicados.' : 'Nenhuma avaliação deste tipo encontrada.';
                tbody.innerHTML = `<tr><td colspan="6" class="text-center p-8">${message}</td></tr>`;
                return;
            }

            avaliacoesFiltradas.sort((a,b) => new Date(b.dataAvaliacao || b.creationDate) - new Date(a.dataAvaliacao || a.creationDate));
            
            tbody.innerHTML = '';
            for (const avaliacao of avaliacoesFiltradas) {
                const tr = document.createElement('tr');
                tr.dataset.id = avaliacao.id;
                
                let rowHtml = '';
                switch (tipoAvaliacao) {
                    case 'imovel-urbano':
                        rowHtml = `
                            <td class="py-2 px-3 font-semibold">${avaliacao.declaracao || 'N/A'}</td>
                            <td class="py-2 px-3">${avaliacao.dadosFormulario?.endereco || 'N/A'}</td>
                            <td class="py-2 px-3">${avaliacao.dadosFormulario?.inscricao || 'N/A'}</td>
                            <td class="py-2 px-3">${new Date(avaliacao.dataAvaliacao + 'T00:00:00').toLocaleDateString()}</td>
                            <td class="py-2 px-3">${(avaliacao.dadosCalculados?.valorTotalAvaliacao || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        `;
                        break;
                    case 'imovel-rural':
                        rowHtml = `
                            <td class="py-2 px-3 font-semibold">${avaliacao.declaracao || 'N/A'}</td>
                            <td class="py-2 px-3">${avaliacao.dadosFormulario?.nomeImovel || 'N/A'}</td>
                            <td class="py-2 px-3">${(avaliacao.dadosFormulario?.areaHa || 0).toLocaleString('pt-BR', { minimumFractionDigits: 4 })}</td>
                            <td class="py-2 px-3">${new Date(avaliacao.dataAvaliacao + 'T00:00:00').toLocaleDateString()}</td>
                            <td class="py-2 px-3">${(avaliacao.dadosCalculados?.avaliacaoImovel || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        `;
                        break;
                    case 'semovente':
                        rowHtml = `
                            <td class="py-2 px-3 font-semibold">${avaliacao.declaracao || 'N/A'}</td>
                            <td class="py-2 px-3">${avaliacao.dadosFormulario?.cpfProdutor || 'N/A'}</td>
                            <td class="py-2 px-3">${avaliacao.dadosFormulario?.inscricaoProdutor || 'N/A'}</td>
                            <td class="py-2 px-3">${new Date(avaliacao.dataAvaliacao + 'T00:00:00').toLocaleDateString()}</td>
                            <td class="py-2 px-3">${(avaliacao.dadosCalculados?.valorTotal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        `;
                        break;
                }
                
                tr.innerHTML = rowHtml + `
                    <td class="actions-cell text-center py-2 px-3 space-x-1">
                        <button class="btn-link btn-visualizar-avaliacao p-1" data-id="${avaliacao.id}" title="Visualizar Avaliação e Gerar Parecer"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye-fill inline-block" viewBox="0 0 16 16"><path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/><path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/></svg></button>
                        <button class="btn-link btn-editar-avaliacao p-1" data-id="${avaliacao.id}" title="Editar Avaliação"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square inline-block" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg></button>
                        <button class="btn-link btn-duplicar-avaliacao p-1" data-id="${avaliacao.id}" title="Duplicar Avaliação"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-copy inline-block" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V2Zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H6ZM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1H2Z"/></svg></button>
                        <button class="btn-link btn-excluir-avaliacao p-1" data-id="${avaliacao.id}" title="Excluir Avaliação"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash-fill inline-block" viewBox="0 0 16 16"><path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1H2.5zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5zM8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5zm3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0z"/></svg></button>
                    </td>`;
                tbody.appendChild(tr);
            }
            addEventListenersToListagem();

        } catch (error) {
            console.error("Erro ao carregar e filtrar avaliações:", error);
            tbody.innerHTML = '<tr><td colspan="6" class="text-center p-4">Falha ao carregar a lista de avaliações.</td></tr>';
        }
    }

    function addEventListenersToListagem() {
        document.querySelectorAll('.btn-visualizar-avaliacao').forEach(btn => {
            btn.addEventListener('click', () => {
                const avaliacaoId = btn.dataset.id;
                appModuleRef.handleMenuAction('itcd-visualizar-avaliacao', { avaliacaoId: avaliacaoId, originatingView: 'itcd-gerir-avaliacoes' });
            });
        });

        document.querySelectorAll('.btn-editar-avaliacao').forEach(btn => {
            btn.addEventListener('click', async () => {
                const avaliacaoId = btn.dataset.id;
                try {
                    const avaliacao = await dbRef.getItemById(ITCD_AVALIACOES_STORE, avaliacaoId);
                    if (avaliacao) {
                        appModuleRef.handleMenuAction('itcd-editar-avaliacao', { avaliacaoData: avaliacao });
                    } else {
                        uiModuleRef.showToastNotification("Avaliação não encontrada para edição.", "error");
                    }
                } catch(e) {
                    uiModuleRef.showToastNotification("Erro ao carregar dados da avaliação para edição.", "error");
                }
            });
        });
        
        document.querySelectorAll('.btn-duplicar-avaliacao').forEach(btn => {
            btn.addEventListener('click', async () => {
                const avaliacaoId = btn.dataset.id;
                try {
                    const avaliacao = await dbRef.getItemById(ITCD_AVALIACOES_STORE, avaliacaoId);
                    if (avaliacao) {
                         appModuleRef.handleMenuAction('itcd-duplicar-avaliacao', { avaliacaoData: avaliacao });
                    } else {
                        uiModuleRef.showToastNotification("Avaliação não encontrada para duplicar.", "error");
                    }
                } catch(e) {
                    uiModuleRef.showToastNotification("Erro ao carregar dados da avaliação para duplicação.", "error");
                }
            });
        });

        document.querySelectorAll('.btn-excluir-avaliacao').forEach(btn => {
            btn.addEventListener('click', async () => {
                const avaliacaoId = btn.dataset.id;
                if (await uiModuleRef.showConfirmationModal('Confirmar Exclusão', 'Tem certeza que deseja excluir permanentemente esta avaliação e seus anexos? Esta ação não pode ser desfeita.')) {
                    try {
                        await window.SEFWorkStation.SharedUtils.desvincularEntidadeDeTodasAsOutras(avaliacaoId, ITCD_AVALIACOES_STORE, dbRef);
                        await window.SEFWorkStation.SharedUtils.tryDeleteEntityAttachmentFolder('itcd/avaliacoes', avaliacaoId);
                        await dbRef.deleteItem(ITCD_AVALIACOES_STORE, avaliacaoId);
                        
                        uiModuleRef.showToastNotification("Avaliação excluída com sucesso.", "success");
                        await carregarEExibirAvaliacoes();
                    } catch (error) {
                        console.error("Erro ao excluir avaliação:", error);
                        uiModuleRef.showToastNotification(`Falha ao excluir avaliação: ${error.message}`, "error");
                    }
                }
            });
        });
    }

    function abrirModalNovaAvaliacao() {
        const modalId = 'modal-nova-avaliacao';
    
        const modalContentHtml = `
            <div class="p-1">
                <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">Selecione o tipo de bem que deseja avaliar para iniciar um novo parecer.</p>
                
                <div class="flex items-center gap-4 mb-4">
                    <input type="search" id="modal-search-avaliacao" class="form-input-text flex-grow text-sm" placeholder="Pesquisar por tipo...">
                    <select id="modal-filter-avaliacao" class="form-input-text w-1/3 text-sm">
                        <option value="all">Todos os Tipos</option>
                        <option value="imovel">Imóvel</option>
                        <option value="semovente">Semovente</option>
                    </select>
                </div>

                <div id="modal-options-container" class="space-y-3 max-h-80 overflow-y-auto">
                    ${renderizarOpcoesAvaliacao(TIPOS_AVALIACAO)}
                </div>
            </div>
        `;

        const modal = uiModuleRef.showModal('Nova Avaliação de ITCD', modalContentHtml, [], 'max-w-2xl', modalId);
    
        if (modal) {
            const container = modal.querySelector('#modal-options-container');
            const searchInput = modal.querySelector('#modal-search-avaliacao');
            const filterSelect = modal.querySelector('#modal-filter-avaliacao');

            const filterHandler = () => {
                const searchTerm = searchInput.value.toLowerCase();
                const filterType = filterSelect.value;
                const filteredOptions = TIPOS_AVALIACAO.filter(opt => {
                    const matchesSearch = opt.title.toLowerCase().includes(searchTerm) || opt.description.toLowerCase().includes(searchTerm);
                    const matchesType = filterType === 'all' || opt.type === filterType;
                    return matchesSearch && matchesType;
                });
                container.innerHTML = renderizarOpcoesAvaliacao(filteredOptions);
            };

            searchInput.addEventListener('input', filterHandler);
            filterSelect.addEventListener('change', filterHandler);
        }
    }

    function renderizarOpcoesAvaliacao(opcoes) {
        if (opcoes.length === 0) {
            return '<p class="text-center text-gray-500 p-4">Nenhum tipo de avaliação encontrado.</p>';
        }
        return opcoes.map(opt => `
            <div class="p-3 border dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer flex items-start gap-4 transition-colors duration-150 modal-avaliacao-option" data-action="${opt.action}">
                <div class="text-blue-500 dark:text-blue-400 mt-1">${opt.icon}</div>
                <div>
                    <h4 class="font-semibold text-gray-800 dark:text-gray-100">${opt.title}</h4>
                    <p class="text-xs text-gray-600 dark:text-gray-400">${opt.description}</p>
                </div>
            </div>
        `).join('');
    }

    document.body.addEventListener('click', function(e) {
        const card = e.target.closest('.modal-avaliacao-option');
        if (card) {
            const action = card.dataset.action;
            if (action) {
                const isEditing = false;
                const isDuplicating = false;
                appModuleRef.handleMenuAction(action, { isEditing, isDuplicating });
                uiModuleRef.closeModal();
            }
        }
    });

    return {
        init,
        renderGerirAvaliacoesPage
    };

})();