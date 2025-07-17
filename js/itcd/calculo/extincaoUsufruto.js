// js/itcd/calculo/extincaoUsufruto.js - Módulo para Cálculo de ITCD sobre Extinção de Usufruto
// v2.5.0 - CORREÇÃO: Garante que a extinção de usufruto sempre seja tratada como ato 'inter vivos' para aplicar a regra de isenção correta.
// v2.4.0 - CORRIGIDO: Removida lógica que forçava o uso da tabela de Causa Mortis para extinção por morte.
// v2.3.1 - CORRIGIDO: Formatação do valor da UFEMG do vencimento para 4 casas decimais.
// v2.3.0 - REATORADO: Lógica de vencimento, UFEMG e base de cálculo ajustadas. Exibição detalhada no resultado.
// v2.2.0 - NOVO: Data de vencimento agora é de 15 dias após a data da extinção.
// v2.1.0 - IMPLEMENTADO: Exibição de totais (bens, base de cálculo) e demonstrativo consolidado dos resultados.
// v2.0.0 - REFATORADO: Adiciona cálculo individual por beneficiário, partilha detalhada de bens e cálculo completo de acréscimos legais.
// v1.0.0 - Módulo criado a partir da refatoração de usufruto.js. Lógica exclusiva para extinção.

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ITCD = window.SEFWorkStation.ITCD || {};
window.SEFWorkStation.ITCD.Calculo = window.SEFWorkStation.ITCD.Calculo || {};

window.SEFWorkStation.ITCD.Calculo.ExtincaoUsufruto = (function() {

    let mainContentWrapperRef;
    let appModuleRef;
    let uiModuleRef;
    let dbRef;

    // Estado do Módulo
    let ultimoResultadoCalculado = null;
    let calculoAtualId = null;
    let isEditMode = true;
    let bensDoCalculo = [];
    let antigosUsufrutuarios = [];
    let beneficiarios = [];

    const FATOR_EXTINCAO = 1 / 3;

    function init(app, ui, db) {
        appModuleRef = app;
        uiModuleRef = ui;
        dbRef = db;
        mainContentWrapperRef = document.querySelector('.main-content-wrapper');
    }

    // --- Funções Utilitárias ---
    function formatBRL(value) {
        if (isNaN(value) || value === null || value === undefined) return 'R$ 0,00';
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function parseFromBRL(value) {
        if (!value || typeof value !== 'string') return 0;
        return parseFloat(value.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    }

    function formatUFEMG(value) {
        if (isNaN(value) || value === null) return '0,0000';
        return value.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    }

    function getModuloCalculoPorData(data) {
        if (!data) return null;
        if (data >= '2007-12-29') return window.SEFWorkStation.ITCD.Calculo.Legislacao.Lei14941_03_apos2008;
        if (data >= '2004-03-29') return window.SEFWorkStation.ITCD.Calculo.Legislacao.Lei14941_03_ate2007;
        if (data >= '1997-01-01') return window.SEFWorkStation.ITCD.Calculo.Legislacao.Lei12426_96;
        if (data >= '1989-03-01') return window.SEFWorkStation.ITCD.Calculo.Legislacao.Lei9752_89;
        if (data >= '1976-01-01') return window.SEFWorkStation.ITCD.Calculo.Legislacao.Lei6763_75;
        return null;
    }

    function toggleEditMode(enable) {
        isEditMode = enable;
        const fieldsets = document.querySelectorAll('#itcd-calculo-extincao-container fieldset');
        fieldsets.forEach(fs => { fs.disabled = !enable; });
        document.getElementById('btn-habilitar-edicao-extincao')?.classList.toggle('hidden', enable);
        document.getElementById('btn-salvar-calculo-extincao')?.classList.toggle('hidden', !enable);
        const helpText = document.querySelector('#itcd-calculo-extincao-container .text-sm.text-gray-600');
        if (helpText) helpText.textContent = enable ? 'Preencha os dados para apurar o imposto.' : 'Modo de visualização.';
    }

    // --- Renderização Principal ---
    function renderForm(calculoExistente = null, startInEditMode = true) {
        calculoAtualId = calculoExistente?.id || null;
        ultimoResultadoCalculado = calculoExistente?.resultadoFinal || null;
        bensDoCalculo = JSON.parse(JSON.stringify(calculoExistente?.bens || []));
        antigosUsufrutuarios = JSON.parse(JSON.stringify(calculoExistente?.dadosUsufruto?.antigosUsufrutuarios || []));
        beneficiarios = JSON.parse(JSON.stringify(calculoExistente?.dadosUsufruto?.beneficiarios || []));
        isEditMode = startInEditMode;

        const hoje = new Date().toISOString().split('T')[0];
        const titulo = calculoExistente ? 'Editar Cálculo de Extinção de Usufruto' : 'Cálculo do ITCD - Extinção de Usufruto';

        const actionButtonsHtml = `
            <button id="btn-voltar-calculo-hub" class="btn-secondary btn-sm">Voltar</button>
            ${!isEditMode ? `<button id="btn-habilitar-edicao-extincao" class="btn-primary btn-sm">Habilitar Edição</button>` : ''}
        `;

        const motivoExtincaoHtml = `
            <div id="container-motivo-extincao" class="mt-4">
                 <label class="block text-sm font-medium">Motivo da Extinção:</label>
                 <div class="flex items-center gap-4 mt-2">
                    <label class="inline-flex items-center"><input type="radio" name="motivo-extincao" value="morte" class="form-radio" ${calculoExistente?.dadosUsufruto?.motivoExtincao === 'morte' ? 'checked' : ''}><span class="ml-1.5 text-sm">Morte do Usufrutuário</span></label>
                    <label class="inline-flex items-center"><input type="radio" name="motivo-extincao" value="renuncia" class="form-radio" ${calculoExistente?.dadosUsufruto?.motivoExtincao === 'renuncia' ? 'checked' : ''}><span class="ml-1.5 text-sm">Renúncia do Usufrutuário</span></label>
                 </div>
            </div>
        `;

        const pageHtml = `
            <div id="itcd-calculo-extincao-container" class="page-section max-w-none px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-100">${titulo}</h2>
                        <p class="text-sm text-gray-600 dark:text-gray-300">${isEditMode ? 'Preencha os dados para apurar o imposto.' : 'Modo de visualização.'}</p>
                    </div>
                    <div class="flex gap-2">${actionButtonsHtml}</div>
                </div>
                <div id="aviso-legislacao-extincao" class="mb-4"></div>
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div class="lg:col-span-2 space-y-6">
                        <fieldset id="fieldset-extincao-dados" class="section-box p-4 border dark:border-slate-700 rounded-lg">
                            <h3 class="text-lg font-medium mb-3">Dados da Operação</h3>
                            ${motivoExtincaoHtml}
                            <div class="mt-4">
                                <label for="extincao-fato-gerador" class="block text-sm font-medium">Data da Extinção:</label>
                                <input type="date" id="extincao-fato-gerador" class="form-input-text mt-1 w-full md:w-1/2" value="${calculoExistente?.dataFatoGerador || ''}">
                            </div>
                        </fieldset>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <fieldset class="section-box p-4 border dark:border-slate-700 rounded-lg">
                                <div class="flex justify-between items-center mb-3"><h3 class="text-lg font-medium">Antigo(s) Usufrutuário(s)</h3><button id="btn-adicionar-antigo-usufrutuario" class="btn-secondary btn-sm">Adicionar</button></div>
                                <div id="lista-antigos-usufrutuarios" class="space-y-2"></div>
                            </fieldset>
                            <fieldset class="section-box p-4 border dark:border-slate-700 rounded-lg">
                                <div class="flex justify-between items-center mb-3"><h3 class="text-lg font-medium">Beneficiário(s) (Nu-proprietário)</h3><button id="btn-adicionar-beneficiario-extincao" class="btn-secondary btn-sm">Adicionar</button></div>
                                <div id="lista-beneficiarios-extincao" class="space-y-2"></div>
                            </fieldset>
                        </div>
                        <fieldset class="section-box p-4 border dark:border-slate-700 rounded-lg">
                             <div class="flex justify-between items-center mb-3">
                                <h3 class="text-lg font-medium">Bens e Direitos Objeto do Usufruto</h3>
                                <div id="acoes-partilha-bens" class="hidden flex items-center gap-2">
                                     <label class="inline-flex items-center text-sm">
                                        <input type="checkbox" id="selecionar-todos-bens-partilha" class="form-checkbox h-4 w-4">
                                        <span class="ml-2">Todos</span>
                                    </label>
                                    <button id="btn-aplicar-partilha-igualitaria" class="btn-secondary btn-sm text-xs">Partilha Igualitária</button>
                                    <button id="btn-abrir-partilha-seletiva" class="btn-secondary btn-sm text-xs">Partilha Seletiva</button>
                                </div>
                                <button id="btn-adicionar-bem-extincao" class="btn-secondary btn-sm">Adicionar Bem</button>
                            </div>
                            <div id="lista-bens-extincao" class="space-y-3"></div>
                        </fieldset>
                    </div>
                    <div class="lg:col-span-1">
                        <fieldset id="fieldset-resultado-extincao" class="section-box p-4 border dark:border-slate-700 rounded-lg sticky top-24">
                            <h3 class="text-lg font-medium mb-3">Resumo da Partilha e Cálculo</h3>
                             <div class="mb-4 pb-4 border-b dark:border-slate-600 space-y-2 text-sm">
                                <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Vencimento:</span><input type="date" id="extincao-vencimento-display" class="form-input-text text-xs p-0.5 ml-2 flex-grow bg-gray-200 dark:bg-slate-700 w-auto" readonly></div>
                                <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Valor da UFEMG (Venc.):</span> <span id="extincao-ufemg-vencimento-display" class="font-semibold">N/A</span></div>
                                <hr class="my-2 dark:border-slate-600">
                                <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Total Bens (100%):</span> <span id="resumo-total-bens-ufemg" class="font-semibold">0,0000</span></div>
                                <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Base de Cálculo Total (1/3 em UFEMG):</span> <span id="resumo-base-calculo-total-ufemg" class="font-semibold text-blue-600 dark:text-blue-400">0,0000</span></div>
                                <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Base de Cálculo Total (R$):</span> <span id="resumo-base-calculo-total-reais" class="font-semibold text-blue-600 dark:text-blue-400">R$ 0,00</span></div>
                            </div>
                            <div id="resultado-calculo-extincao" class="space-y-4 text-sm"></div>
                            <div class="mt-4 pt-3 border-t dark:border-slate-600">
                                <label for="extincao-data-pagamento" class="block text-sm font-medium">Data do Pagamento:</label>
                                <input type="date" id="extincao-data-pagamento" class="form-input-text mt-1 text-sm" value="${calculoExistente?.dataPagamento || hoje}">
                            </div>
                            <button id="btn-executar-calculo-extincao" class="btn-primary w-full mt-4">Calcular Imposto</button>
                            <button id="btn-salvar-calculo-extincao" class="btn-primary w-full mt-2">Salvar Cálculo</button>
                        </fieldset>
                    </div>
                </div>
            </div>
        `;
        mainContentWrapperRef.innerHTML = pageHtml;
        addEventListeners();
        renderListaPessoas('antigo-usufrutuario');
        renderListaPessoas('beneficiario');
        renderListaBens();
        renderResultados(ultimoResultadoCalculado);
        verificarLegislacaoAplicavel();
        document.querySelector('input[name="motivo-extincao"]:checked')?.dispatchEvent(new Event('change'));
        toggleEditMode(isEditMode);
    }
    
    function renderListaPessoas(tipo) {
        const [lista, containerId, label] = tipo === 'antigo-usufrutuario' 
            ? [antigosUsufrutuarios, 'lista-antigos-usufrutuarios', 'antigo usufrutuário'] 
            : [beneficiarios, 'lista-beneficiarios-extincao', 'beneficiário'];
        
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = lista.length > 0 ? lista.map(p => `
            <div class="pessoa-card card p-2 flex justify-between items-center" data-id="${p.id}">
                <p class="font-medium text-sm text-gray-800 dark:text-gray-100">${p.nome}</p>
                <button class="btn-link btn-excluir-pessoa text-xs text-red-500" data-tipo="${tipo}">Excluir</button>
            </div>`).join('') : `<p class="text-sm text-center text-gray-500 dark:text-gray-400 p-2">Nenhum ${label} adicionado.</p>`;
    }

    async function renderListaBens() {
        const container = document.getElementById('lista-bens-extincao');
        const acoesPartilhaContainer = document.getElementById('acoes-partilha-bens');
        if (!container) return;

        if (bensDoCalculo.length === 0) {
            container.innerHTML = '<p class="text-sm text-center text-gray-500 dark:text-gray-400 p-4">Nenhum bem adicionado.</p>';
            if(acoesPartilhaContainer) acoesPartilhaContainer.classList.add('hidden');
            return;
        }
        
        if(acoesPartilhaContainer) acoesPartilhaContainer.classList.remove('hidden');
        container.innerHTML = '';
        for (const bem of bensDoCalculo) {
            const card = document.createElement('div');
            card.className = `bem-card card p-3`;
            card.dataset.id = bem.id;

            const valorTotalBem = (bem.valor || 0) * ((bem.percentual || 100) / 100);
            const anoReferenciaUfemg = bem.dataAvaliacao ? new Date(bem.dataAvaliacao + 'T00:00:00').getFullYear() : new Date().getFullYear();
            const valorUfemgAno = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(anoReferenciaUfemg);
            const valorEmUfemg = valorUfemgAno > 0 ? valorTotalBem / valorUfemgAno : 0;
            const ufemgDisplay = valorEmUfemg > 0 ? `<span class="text-xs text-gray-500 dark:text-gray-400">(${formatUFEMG(valorEmUfemg)} UFEMG/${anoReferenciaUfemg})</span>` : '';

            const partilhaHtml = beneficiarios.length > 0 ? beneficiarios.map(d => `
                <div class="flex items-center gap-2">
                    <label for="partilha-beneficiario-${d.id}-bem-${bem.id}" class="flex-grow text-xs text-gray-700 dark:text-gray-300">${d.nome}:</label>
                    <input type="number" id="partilha-beneficiario-${d.id}-bem-${bem.id}" data-beneficiario-id="${d.id}" data-bem-id="${bem.id}" 
                           class="form-input-text w-24 text-xs p-1 partilha-percent-input-card" placeholder="%" min="0" max="100" step="0.01" value="${bem.partilha?.[d.id] || 0}">
                </div>
            `).join('') : '<p class="text-xs text-gray-500 dark:text-gray-400">Adicione beneficiários para definir a partilha.</p>';

            const totalPartilhado = Object.values(bem.partilha || {}).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
            
            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <div class="flex items-center">
                        <input type="checkbox" class="form-checkbox h-4 w-4 mr-3 bem-selecao-checkbox" data-bem-id="${bem.id}">
                        <div>
                            <p class="font-semibold text-gray-800 dark:text-gray-100">${bem.descricao}</p>
                            <p class="text-xs text-gray-600 dark:text-gray-400">Valor: ${formatBRL(bem.valor)} (${bem.percentual}%) ${ufemgDisplay}</p>
                        </div>
                    </div>
                    <div class="space-x-2">
                        <button class="btn-link btn-editar-bem text-sm">Editar</button>
                        <button class="btn-link btn-excluir-bem text-sm text-red-500">Excluir</button>
                    </div>
                </div>
                 <details class="mt-2 ml-7">
                    <summary class="text-xs text-blue-600 dark:text-blue-400 cursor-pointer">Partilha por Beneficiário</summary>
                    <div class="mt-2 p-2 border rounded-md bg-white dark:bg-slate-900/50 space-y-1">
                        ${partilhaHtml}
                        <div class="text-xs font-semibold mt-2 pt-1 border-t dark:border-slate-700">Total: 
                            <span class="partilha-total-display-card ${Math.abs(totalPartilhado - 100) > 0.01 ? 'text-red-500' : 'text-green-500'}">${totalPartilhado.toFixed(2)}</span>%
                        </div>
                    </div>
                </details>`;
            container.appendChild(card);
        }
        await _atualizarDadosDependentes();
    }

    function addEventListeners() {
        document.getElementById('btn-voltar-calculo-hub').addEventListener('click', () => appModuleRef.handleMenuAction('itcd-calculo-hub'));
        document.getElementById('btn-executar-calculo-extincao').addEventListener('click', executarCalculo);
        document.getElementById('btn-salvar-calculo-extincao').addEventListener('click', salvarCalculo);
        document.getElementById('btn-adicionar-antigo-usufrutuario').addEventListener('click', () => abrirModalPessoa('antigo-usufrutuario'));
        document.getElementById('btn-adicionar-beneficiario-extincao').addEventListener('click', () => abrirModalPessoa('beneficiario'));
        document.getElementById('btn-adicionar-bem-extincao').addEventListener('click', () => abrirModalAdicionarBem());

        document.getElementById('extincao-fato-gerador').addEventListener('blur', _atualizarDadosDependentes);
        document.querySelectorAll('input[name="motivo-extincao"]').forEach(radio => radio.addEventListener('change', verificarLegislacaoAplicavel));
        
        const habilitarBtn = document.getElementById('btn-habilitar-edicao-extincao');
        if (habilitarBtn) habilitarBtn.addEventListener('click', () => toggleEditMode(true));
        
        const container = document.getElementById('itcd-calculo-extincao-container');
        if (container) {
            container.addEventListener('click', e => {
                if (e.target.classList.contains('btn-excluir-pessoa')) {
                    const tipo = e.target.dataset.tipo;
                    const id = e.target.closest('.pessoa-card').dataset.id;
                    if (tipo === 'antigo-usufrutuario') antigosUsufrutuarios = antigosUsufrutuarios.filter(p => p.id !== id);
                    else beneficiarios = beneficiarios.filter(p => p.id !== id);
                    renderListaPessoas(tipo);
                    renderListaBens();
                }
                
                const bemCard = e.target.closest('.bem-card');
                if (bemCard) {
                    const id = bemCard.dataset.id;
                    if (e.target.classList.contains('btn-editar-bem')) {
                        const bem = bensDoCalculo.find(b => b.id === id);
                        if (bem) abrirModalAdicionarBem(bem);
                    }
                    if (e.target.classList.contains('btn-excluir-bem')) {
                        bensDoCalculo = bensDoCalculo.filter(b => b.id !== id);
                        renderListaBens();
                    }
                }
            });
             container.addEventListener('input', e => {
                if (e.target.classList.contains('partilha-percent-input-card')) {
                    const bemId = e.target.dataset.bemId;
                    const beneficiarioId = e.target.dataset.beneficiarioId;
                    const percentual = parseFloat(e.target.value) || 0;
                    const bem = bensDoCalculo.find(b => b.id === bemId);
                    if (bem) {
                        if (!bem.partilha) bem.partilha = {};
                        bem.partilha[beneficiarioId] = percentual;
                        
                        const card = e.target.closest('.bem-card');
                        const totalDisplay = card.querySelector('.partilha-total-display-card');
                        const totalPartilhado = Object.values(bem.partilha).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
                        totalDisplay.textContent = totalPartilhado.toFixed(2);
                        totalDisplay.classList.toggle('text-red-500', Math.abs(totalPartilhado - 100) > 0.01);
                        totalDisplay.classList.toggle('text-green-500', Math.abs(totalPartilhado - 100) <= 0.01);
                    }
                }
            });
        }
        
        document.getElementById('btn-aplicar-partilha-igualitaria')?.addEventListener('click', _handleAplicarPartilhaIgualitaria);
        document.getElementById('btn-abrir-partilha-seletiva')?.addEventListener('click', _abrirModalPartilhaSeletiva);

        const selecionarTodosCheckbox = document.getElementById('selecionar-todos-bens-partilha');
        if (selecionarTodosCheckbox) {
            selecionarTodosCheckbox.addEventListener('change', (e) => {
                document.querySelectorAll('.bem-selecao-checkbox').forEach(checkbox => {
                    checkbox.checked = e.target.checked;
                });
            });
        }
    }

    function abrirModalPessoa(tipo) {
        const titulo = tipo === 'antigo-usufrutuario' ? 'Adicionar Antigo Usufrutuário' : 'Adicionar Beneficiário';
        const modalContent = `
            <form id="form-add-pessoa-extincao" class="space-y-4">
                <div>
                    <label for="pessoa-nome-modal" class="block text-sm">Nome:</label>
                    <input type="text" id="pessoa-nome-modal" class="form-input-text mt-1" placeholder="Nome completo">
                </div>
            </form>`;
        uiModuleRef.showModal(titulo, modalContent, [
            { text: "Cancelar", class: "btn-secondary", closesModal: true },
            { text: "Adicionar", class: "btn-primary", callback: () => {
                const nome = document.getElementById('pessoa-nome-modal').value.trim();
                if (!nome) { uiModuleRef.showToastNotification("O nome é obrigatório.", "warning"); return false; }
                const pessoa = { id: `pessoa_${Date.now()}`, nome };
                if (tipo === 'antigo-usufrutuario') antigosUsufrutuarios.push(pessoa);
                else beneficiarios.push(pessoa);
                renderListaPessoas(tipo);
                renderListaBens();
                return true;
            }}
        ]);
    }
    
    function abrirModalAdicionarBem(bemExistente = null) {
        const isEditing = bemExistente !== null;
        const titulo = isEditing ? 'Editar Bem' : 'Adicionar Bem';
        const hoje = new Date().toISOString().split('T')[0];

        const modalContent = `
            <form id="form-add-bem-extincao" class="space-y-4">
                 <input type="hidden" id="bem-id-modal" value="${bemExistente?.id || ''}">
                <div>
                    <label for="bem-descricao-modal" class="block text-sm">Descrição do Bem:</label>
                    <input type="text" id="bem-descricao-modal" class="form-input-text mt-1" placeholder="Ex: Imóvel matrícula 123" value="${bemExistente?.descricao || ''}">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label for="bem-valor-modal" class="block text-sm">Valor de Mercado:</label>
                        <input type="text" id="bem-valor-modal" class="form-input-text mt-1 currency-input" value="${formatBRL(bemExistente?.valor || 0)}">
                    </div>
                     <div>
                        <label for="bem-percentual-modal" class="block text-sm">% da Propriedade:</label>
                        <input type="number" id="bem-percentual-modal" class="form-input-text mt-1" value="${bemExistente?.percentual || 100}" min="0" max="100" step="0.01">
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                     <div>
                        <label for="bem-data-avaliacao-modal" class="block text-sm">Data da Avaliação:</label>
                        <input type="date" id="bem-data-avaliacao-modal" class="form-input-text mt-1" value="${bemExistente?.dataAvaliacao || hoje}">
                    </div>
                    <div>
                        <p id="display-valor-ufemg-modal" class="text-xs text-gray-600 dark:text-gray-400 h-6"></p>
                    </div>
                 </div>
            </form>`;
        const modal = uiModuleRef.showModal(titulo, modalContent, [
            { text: "Cancelar", class: "btn-secondary", closesModal: true },
            { text: isEditing ? "Salvar" : "Adicionar", class: "btn-primary", callback: () => {
                const id = document.getElementById('bem-id-modal').value;
                const bemData = {
                    descricao: document.getElementById('bem-descricao-modal').value.trim(),
                    valor: parseFromBRL(document.getElementById('bem-valor-modal').value),
                    percentual: parseFloat(document.getElementById('bem-percentual-modal').value) || 100,
                    dataAvaliacao: document.getElementById('bem-data-avaliacao-modal').value,
                };
                if (!bemData.descricao || bemData.valor <= 0 || !bemData.dataAvaliacao) {
                    uiModuleRef.showToastNotification("Todos os campos são obrigatórios.", "warning");
                    return false;
                }
                if (isEditing) {
                    const index = bensDoCalculo.findIndex(b => b.id === id);
                    if (index > -1) bensDoCalculo[index] = { ...bensDoCalculo[index], ...bemData };
                } else {
                    bensDoCalculo.push({ id: `bem_${Date.now()}`, ...bemData, partilha: {} });
                }
                renderListaBens();
                return true;
            }}
        ]);
        
        modal.querySelectorAll('.currency-input').forEach(input => {
             input.addEventListener('blur', e => { e.target.value = formatBRL(parseFromBRL(e.target.value)); });
        });
        
        modal.querySelector('#bem-valor-modal').addEventListener('input', updateModalUfemgDisplay);
        modal.querySelector('#bem-data-avaliacao-modal').addEventListener('change', updateModalUfemgDisplay);
    }
    
    async function updateModalUfemgDisplay() {
        const valorInput = document.getElementById('bem-valor-modal');
        const dataInput = document.getElementById('bem-data-avaliacao-modal');
        const displayEl = document.getElementById('display-valor-ufemg-modal');
        if(!valorInput || !dataInput || !displayEl) return;
        
        const valor = parseFromBRL(valorInput.value);
        const ano = dataInput.value ? new Date(dataInput.value).getFullYear() : null;
        if(valor > 0 && ano){
            const valorUfemgAno = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(ano);
            if(valorUfemgAno > 0) displayEl.textContent = `(aprox. ${formatUFEMG(valor/valorUfemgAno)} UFEMG de ${ano})`;
        } else {
            displayEl.textContent = '';
        }
    }

    function _handleAplicarPartilhaIgualitaria() {
        const selectedBemIds = Array.from(document.querySelectorAll('.bem-selecao-checkbox:checked')).map(cb => cb.dataset.bemId);
        if (selectedBemIds.length === 0) { uiModuleRef.showToastNotification("Nenhum bem selecionado.", "warning"); return; }
        if (beneficiarios.length === 0) { uiModuleRef.showToastNotification("Nenhum beneficiário adicionado.", "warning"); return; }

        const percentualIgual = 100 / beneficiarios.length;
        bensDoCalculo.forEach(bem => {
            if (selectedBemIds.includes(bem.id)) {
                bem.partilha = {};
                beneficiarios.forEach(beneficiario => {
                    bem.partilha[beneficiario.id] = percentualIgual;
                });
            }
        });
        renderListaBens();
    }
    
    function _abrirModalPartilhaSeletiva() {
        const selectedBemIds = Array.from(document.querySelectorAll('.bem-selecao-checkbox:checked')).map(cb => cb.dataset.bemId);
        if (selectedBemIds.length === 0) { uiModuleRef.showToastNotification("Nenhum bem selecionado.", "warning"); return; }
        if (beneficiarios.length === 0) { uiModuleRef.showToastNotification("Nenhum beneficiário adicionado.", "warning"); return; }

        let modalContent = `
            <div id="feedback-partilha-seletiva-modal"></div>
            <p class="text-sm mb-4">Defina as porcentagens para os beneficiários. A soma deve ser 100%.</p>
            <div class="space-y-2">
                ${beneficiarios.map(b => `
                    <div class="flex items-center gap-4">
                        <label class="w-1/2">${b.nome}:</label>
                        <input type="number" data-beneficiario-id="${b.id}" class="form-input-text w-1/2 partilha-seletiva-input" placeholder="%">
                    </div>
                `).join('')}
            </div>
            <div class="mt-4 pt-2 border-t font-semibold">Total: <span id="total-partilha-seletiva">0.00</span>%</div>`;

        const modal = uiModuleRef.showModal("Definir Partilha Seletiva", modalContent, [
            { text: 'Cancelar', class: 'btn-secondary', closesModal: true },
            { text: 'Aplicar', class: 'btn-primary', callback: () => _handleConfirmarPartilhaSeletiva(selectedBemIds) }
        ]);
        
        modal.querySelector('#modal-content').addEventListener('input', e => {
            if (e.target.classList.contains('partilha-seletiva-input')) {
                let total = 0;
                modal.querySelectorAll('.partilha-seletiva-input').forEach(input => { total += parseFloat(input.value) || 0; });
                const totalEl = modal.querySelector('#total-partilha-seletiva');
                totalEl.textContent = total.toFixed(2);
                totalEl.classList.toggle('text-red-500', Math.abs(total - 100) > 0.01);
                totalEl.classList.toggle('text-green-500', Math.abs(total - 100) <= 0.01);
            }
        });
    }

    function _handleConfirmarPartilhaSeletiva(selectedBemIds) {
        const feedbackEl = document.getElementById('feedback-partilha-seletiva-modal');
        const inputs = document.querySelectorAll('.partilha-seletiva-input');
        let total = 0;
        const partilhaDefinida = {};

        inputs.forEach(input => {
            const percentual = parseFloat(input.value) || 0;
            total += percentual;
            if (percentual > 0) partilhaDefinida[input.dataset.beneficiarioId] = percentual;
        });

        if (Math.abs(total - 100) > 0.01) {
            if(feedbackEl) feedbackEl.innerHTML = `<p class="text-red-500 text-sm">A soma das porcentagens deve ser exatamente 100%.</p>`;
            return false;
        }

        bensDoCalculo.forEach(bem => {
            if (selectedBemIds.includes(bem.id)) {
                bem.partilha = {};
                for (const id in partilhaDefinida) bem.partilha[id] = partilhaDefinida[id];
            }
        });
        renderListaBens();
        return true;
    }

    // --- Funções de Cálculo e Resultado ---
    async function executarCalculo() {
        if (bensDoCalculo.length === 0 || beneficiarios.length === 0) {
            uiModuleRef.showToastNotification("Adicione bens e beneficiários para calcular.", "warning"); return;
        }

        const { vencimento, valorUfemgDoVencimento } = await _atualizarDadosDependentes();
        const dataFatoGerador = document.getElementById('extincao-fato-gerador').value;
        const dataPagamento = document.getElementById('extincao-data-pagamento').value;
        
        let resultadoFinal = { total: { impostoARecolher: 0 }, porBeneficiario: [] };
        let justificativasGlobais = new Set();
        
        for (const beneficiario of beneficiarios) {
            let baseCalculoReaisBeneficiario = 0;
            let valorTotalBemParaUfemg = 0;
            
            for (const bem of bensDoCalculo) {
                const percentualRecebido = (bem.partilha?.[beneficiario.id] || 0) / 100;
                if (percentualRecebido > 0) {
                    const valorBase = (bem.valor || 0) * (bem.percentual / 100);
                    const valorUfemgAno = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(new Date(bem.dataAvaliacao).getFullYear());
                    const valorEmUfemg = valorUfemgAno > 0 ? valorBase / valorUfemgAno : 0;
                    valorTotalBemParaUfemg += valorEmUfemg * percentualRecebido;
                }
            }

            const baseCalculoUfemgBeneficiario = valorTotalBemParaUfemg * FATOR_EXTINCAO;
            baseCalculoReaisBeneficiario = baseCalculoUfemgBeneficiario * valorUfemgDoVencimento;

            if(baseCalculoReaisBeneficiario > 0) {
                const moduloCalculo = getModuloCalculoPorData(dataFatoGerador);
                if (!moduloCalculo) continue;
                
                // CORREÇÃO: Garante que o flag 'tipoDoacao' seja sempre true para extinção,
                // fazendo o motor de cálculo usar a Tabela B (Inter Vivos) e a isenção correta.
                const dadosParaCalculo = {
                    baseCalculoReais: baseCalculoReaisBeneficiario,
                    baseCalculoUfemg: baseCalculoUfemgBeneficiario,
                    dataFatoGerador, dataPagamento, vencimento,
                    recolhimentoPrevio: { houve: false },
                    justificativas: [],
                    tipoDoacao: true, 
                    herdeiros: beneficiarios,
                    valorUfemgDoVencimento,
                };
                
                const resultado = await moduloCalculo.calcular(dadosParaCalculo);
                resultado.nome = beneficiario.nome;
                resultado.id = beneficiario.id; 
                resultadoFinal.porBeneficiario.push(resultado);
                
                if (resultado && resultado.valores) {
                    resultadoFinal.total.impostoARecolher += resultado.valores.impostoARecolher || 0;
                    if (resultado.justificativaCalculo) resultado.justificativaCalculo.forEach(j => justificativasGlobais.add(j));
                }
            }
        }
        resultadoFinal.total.justificativas = Array.from(justificativasGlobais);
        ultimoResultadoCalculado = resultadoFinal;
        renderResultados(resultadoFinal);
    }
    
    async function renderResultados(resultado) {
        const container = document.getElementById('resultado-calculo-extincao');
        if (!container) return;
        if (!resultado) {
            container.innerHTML = '<p class="text-sm text-center text-gray-500">Aguardando cálculo...</p>';
            return;
        }
        
        let html = '';

        if (resultado.porBeneficiario && resultado.porBeneficiario.length > 0) {
            html += '<div class="space-y-4">';
            resultado.porBeneficiario.forEach(res => {
                const { valores, nome } = res;
                if (valores) {
                    html += `
                        <div class="p-2 border rounded-md dark:border-slate-600">
                            <p class="font-semibold text-sm mb-1">${nome}</p>
                            <div class="space-y-1 text-xs">
                                <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Base (R$):</span> <span>${formatBRL(valores.baseCalculoReais)}</span></div>
                                <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Base (UFEMG):</span> <span>${formatUFEMG(valores.baseCalculoUfemg)}</span></div>
                                <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Alíquota:</span> <span>${typeof valores.aliquota === 'string' ? valores.aliquota : `${(valores.aliquota || 0).toLocaleString('pt-BR')}%`}</span></div>
                                <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">ITCD:</span> <span>${formatBRL(valores.itcdPrincipal)}</span></div>
                                <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Desconto:</span> <span>${formatBRL(valores.desconto)}</span></div>
                                <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Multa:</span> <span>${formatBRL(valores.multa)}</span></div>
                                <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Juros (${(valores.percentualJuros || 0).toFixed(2)}%):</span> <span>${formatBRL(valores.juros)}</span></div>
                                <div class="flex justify-between font-bold"><span class="dark:text-gray-300">A Recolher:</span> <span>${formatBRL(valores.impostoARecolher)}</span></div>
                            </div>
                        </div>`;
                }
            });
            html += '</div>';

            html += `
                <div class="mt-4 pt-4 border-t-2 dark:border-slate-500 flex justify-between font-bold text-lg">
                    <span class="dark:text-gray-200">Total a Recolher:</span> 
                    <span class="text-red-600 dark:text-red-400">${formatBRL(resultado.total.impostoARecolher)}</span>
                </div>`;
                
            if (resultado.total.justificativas?.length > 0) {
                html += `<div class="mt-2 text-xs text-green-700 dark:text-green-300 p-2 bg-green-50 dark:bg-green-900/50 rounded">${resultado.total.justificativas.join('<br>')}</div>`;
            }
        } else {
            container.innerHTML = '<p class="text-sm text-center text-gray-500">Cálculo não gerou resultados.</p>';
        }
        
        container.innerHTML = html;
    }
    
    async function salvarCalculo() {
        if (!ultimoResultadoCalculado) { uiModuleRef.showToastNotification("Execute o cálculo antes de salvar.", "warning"); return; }
        if (!dbRef) { uiModuleRef.showToastNotification("Erro de conexão com o banco de dados.", "error"); return; }
        
        const benefs = beneficiarios.map(b => b.nome).join(', ');

        const calculoData = {
            id: calculoAtualId || appModuleRef.generateUUID(),
            tipoCalculo: 'usufruto_extincao',
            deCujusNome: `Extinção de Usufruto para ${benefs || 'N/A'}`,
            dataFatoGerador: document.getElementById('extincao-fato-gerador').value,
            dataPagamento: document.getElementById('extincao-data-pagamento').value,
            bens: bensDoCalculo,
            dadosUsufruto: {
                antigosUsufrutuarios: antigosUsufrutuarios,
                beneficiarios: beneficiarios,
                motivoExtincao: document.querySelector('input[name="motivo-extincao"]:checked')?.value || null
            },
            dataSalvamento: new Date().toISOString(),
            resultadoFinal: ultimoResultadoCalculado
        };
        
        try {
            await dbRef.updateItem(dbRef.STORES.ITCD_CALCULOS, calculoData);
            calculoAtualId = calculoData.id;
            uiModuleRef.showToastNotification(`Cálculo de extinção de usufruto salvo com sucesso!`, "success");
            appModuleRef.handleMenuAction('itcd-visualizar-calculo', { calculoId: calculoData.id });
        } catch(e) {
            uiModuleRef.showToastNotification(`Falha ao salvar cálculo: ${e.message}`, "error");
        }
    }
    
    async function _atualizarDadosDependentes() {
        verificarLegislacaoAplicavel();
        const dataFatoGerador = document.getElementById('extincao-fato-gerador').value;
        const vencimentoInput = document.getElementById('extincao-vencimento-display');
        const ufemgDisplay = document.getElementById('extincao-ufemg-vencimento-display');
        
        let vencimento = '';
        let valorUfemgDoVencimento = 0;

        if (dataFatoGerador) {
            let dataVencimentoObj = new Date(dataFatoGerador + 'T00:00:00');
            dataVencimentoObj.setDate(dataVencimentoObj.getDate() + 15);
            vencimento = dataVencimentoObj.toISOString().split('T')[0];
            const anoVencimento = dataVencimentoObj.getFullYear();
            valorUfemgDoVencimento = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(anoVencimento);
        }

        vencimentoInput.value = vencimento;
        ufemgDisplay.textContent = valorUfemgDoVencimento > 0 ? formatUFEMG(valorUfemgDoVencimento) : 'N/A';

        let totalBensUfemg = 0;
        for(const bem of bensDoCalculo) {
            const valorConsiderado = bem.valor * (bem.percentual / 100);
            const anoAvaliacao = new Date(bem.dataAvaliacao).getFullYear();
            const ufemgAnoAvaliacao = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(anoAvaliacao);
            totalBensUfemg += ufemgAnoAvaliacao > 0 ? (valorConsiderado / ufemgAnoAvaliacao) : 0;
        }

        const baseCalculoTotalUfemg = totalBensUfemg * FATOR_EXTINCAO;
        const baseCalculoTotalReais = baseCalculoTotalUfemg * valorUfemgDoVencimento;

        document.getElementById('resumo-total-bens-ufemg').textContent = formatUFEMG(totalBensUfemg);
        document.getElementById('resumo-base-calculo-total-ufemg').textContent = formatUFEMG(baseCalculoTotalUfemg);
        document.getElementById('resumo-base-calculo-total-reais').textContent = formatBRL(baseCalculoTotalReais);
        
        return { vencimento, valorUfemgDoVencimento };
    }
    
    function verificarLegislacaoAplicavel() {
        const dataFatoGerador = document.getElementById('extincao-fato-gerador').value;
        const avisoEl = document.getElementById('aviso-legislacao-extincao');
        const fieldsets = document.querySelectorAll('#itcd-calculo-extincao-container fieldset');
        
        avisoEl.innerHTML = '';
        fieldsets.forEach(fs => fs.disabled = false);
        
        if (!dataFatoGerador) {
            fieldsets.forEach(fs => fs.disabled = true);
            document.querySelector('#fieldset-extincao-dados').disabled = false;
            return;
        };
        
        const modulo = getModuloCalculoPorData(dataFatoGerador);
        avisoEl.innerHTML = `<p class="text-sm text-blue-600 dark:text-blue-400 font-semibold">Legislação Aplicável: ${modulo?.name || 'Não definida'}</p>`;
        
        const motivo = document.querySelector('input[name="motivo-extincao"]:checked')?.value;
        let isFatoGerador = false;
        let msgNaoFatoGerador = 'Extinção de usufruto por este motivo não é fato gerador do ITCD na legislação vigente para esta data.';

        if(motivo === 'renuncia') {
            if (dataFatoGerador >= '1989-03-01' && dataFatoGerador < '1997-01-01') {
                isFatoGerador = true;
            }
        } else if (motivo === 'morte') {
            if ((dataFatoGerador >= '1997-01-01' && dataFatoGerador < '2004-03-29') || (dataFatoGerador >= '2004-03-29' && dataFatoGerador <= '2007-12-28')) {
                isFatoGerador = true;
            }
        }

        if (!motivo) {
             fieldsets.forEach(fs => fs.disabled = true);
             document.querySelector('#fieldset-extincao-dados').disabled = false;
        } else if (!isFatoGerador) {
            avisoEl.innerHTML += `<p class="feedback-message warning mt-2">${msgNaoFatoGerador}</p>`;
            fieldsets.forEach(fs => fs.disabled = true);
            document.querySelector('#fieldset-extincao-dados').disabled = false;
        }
    }

    return {
        init,
        renderForm
    };

})();