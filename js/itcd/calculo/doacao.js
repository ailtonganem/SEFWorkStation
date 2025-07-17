// js/itcd/calculo/doacao.js - Módulo para Cálculo de ITCD por Doação
// v3.6.0 - CORRIGIDO: Garante que o valor da UFEMG do vencimento seja corretamente calculado e passado para o motor de legislação, alinhando com a Lei 12.426/96.
// v3.5.0 - ALTERADO: Adapta a chamada ao motor de cálculo para passar os novos parâmetros (`baseCalculoTotalUfemg`, `impostoPagoAnteriorUfemg`) exigidos pela nova regra de isenção/desconto.
// v3.4.1 - CORRIGIDO: Corrige o erro de sintaxe e refatora completamente a lógica de cálculo para operar primariamente em UFEMG, conforme especificação.
// ... (histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ITCD = window.SEFWorkStation.ITCD || {};
window.SEFWorkStation.ITCD.Calculo = window.SEFWorkStation.ITCD.Calculo || {};

window.SEFWorkStation.ITCD.Calculo.Doacao = (function() {

    let mainContentWrapperRef;
    let appModuleRef;
    let uiModuleRef;
    let dbRef;
    let ultimoResultadoCalculado = null;
    let bensDaDoacao = [];
    let doadores = [];
    let donatarios = [];
    let calculoAtualId = null;
    let isEditMode = true;

    function init(app, ui, db) {
        appModuleRef = app;
        uiModuleRef = ui;
        dbRef = db;
        mainContentWrapperRef = document.querySelector('.main-content-wrapper');
    }

    function formatBRL(value) {
        if (isNaN(value) || value === null || value === undefined) return 'R$ 0,00';
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function parseFromBRL(value) {
        if (!value || typeof value !== 'string') return 0;
        return parseFloat(value.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    }

    function renderFormDoacao(calculoExistente = null, startInEditMode = true) {
        calculoAtualId = calculoExistente?.id || null;
        bensDaDoacao = JSON.parse(JSON.stringify(calculoExistente?.bens || []));
        doadores = JSON.parse(JSON.stringify(calculoExistente?.doadores || []));
        donatarios = JSON.parse(JSON.stringify(calculoExistente?.donatarios || []));
        ultimoResultadoCalculado = calculoExistente?.resultadoFinal || null;
        isEditMode = startInEditMode;
        
        const hoje = new Date().toISOString().split('T')[0];
        const titulo = calculoExistente ? 'Editar Cálculo de Doação' : 'Cálculo do ITCD - Doação';

        const actionButtonsHtml = `
            <button id="btn-voltar-calculo-hub" class="btn-secondary btn-sm">Voltar</button>
            ${!isEditMode ? `<button id="btn-habilitar-edicao-doacao" class="btn-primary btn-sm">Habilitar Edição</button>` : ''}
        `;
        
        const pageHtml = `
            <div id="itcd-calculo-doacao-container" class="page-section max-w-none px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center mb-6">
                    <div>
                         <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-100">${titulo}</h2>
                         <p class="text-sm text-gray-600 dark:text-gray-300">${isEditMode ? 'Preencha os dados para apurar o imposto.' : 'Modo de visualização.'}</p>
                    </div>
                    <div class="flex gap-2">${actionButtonsHtml}</div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div class="lg:col-span-2 space-y-6">
                        <fieldset id="fieldset-doacao-dados" class="section-box p-4 border dark:border-slate-700 rounded-lg">
                            <h3 class="text-lg font-medium mb-3">Dados Gerais da Doação</h3>
                            <div class="space-y-4">
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label for="doacao-declaracao" class="block text-sm font-medium">Nº da Declaração (opcional):</label>
                                        <input type="text" id="doacao-declaracao" class="form-input-text mt-1" placeholder="Número da DBD, se houver" value="${calculoExistente?.declaracaoNumero || ''}">
                                    </div>
                                     <div class="md:col-span-1">
                                        <label class="block text-sm font-medium">Tipo de Doação:</label>
                                        <div class="flex items-center gap-4 mt-2">
                                            <label class="inline-flex items-center"><input type="radio" name="doacao-tipo-global" value="plena" class="form-radio" ${!calculoExistente || calculoExistente.tipoDoacaoGlobal !== 'nua_propriedade' ? 'checked' : ''}><span class="ml-1.5 text-sm">Propriedade Plena</span></label>
                                            <label class="inline-flex items-center"><input type="radio" name="doacao-tipo-global" value="nua_propriedade" class="form-radio" ${calculoExistente?.tipoDoacaoGlobal === 'nua_propriedade' ? 'checked' : ''}><span class="ml-1.5 text-sm">Nua-Propriedade</span></label>
                                        </div>
                                    </div>
                                    <div class="md:col-span-2 border-t pt-4 dark:border-slate-600">
                                        <label class="block text-sm font-medium">A doação foi efetivada?</label>
                                        <div class="flex items-center gap-4 mt-2">
                                            <label class="inline-flex items-center"><input type="radio" name="doacao-efetivada" value="sim" class="form-radio" ${calculoExistente?.efetivada !== false ? 'checked' : ''}><span class="ml-1.5 text-sm">Sim</span></label>
                                            <label class="inline-flex items-center"><input type="radio" name="doacao-efetivada" value="nao" class="form-radio" ${calculoExistente?.efetivada === false ? 'checked' : ''}><span class="ml-1.5 text-sm">Não</span></label>
                                        </div>
                                    </div>
                                    <div id="container-doacao-efetivada-sim" class="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 hidden">
                                        <div>
                                            <label for="doacao-fato-gerador" class="block text-sm font-medium">Data do Fato Gerador (ato/contrato):</label>
                                            <input type="date" id="doacao-fato-gerador" class="form-input-text mt-1" value="${calculoExistente?.dataFatoGerador || hoje}">
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium">Formalização da Doação:</label>
                                            <div class="flex items-center gap-4 mt-2">
                                                <label class="inline-flex items-center"><input type="radio" name="doacao-formalizacao" value="escritura" class="form-radio" ${calculoExistente?.formalizada === 'escritura' ? 'checked' : ''}><span class="ml-1.5 text-sm">Escritura Pública</span></label>
                                                <label class="inline-flex items-center"><input type="radio" name="doacao-formalizacao" value="outros" class="form-radio" ${!calculoExistente || calculoExistente.formalizada !== 'escritura' ? 'checked' : ''}><span class="ml-1.5 text-sm">Demais Casos</span></label>
                                            </div>
                                        </div>
                                    </div>
                                    <div id="container-doacao-efetivada-nao" class="md:col-span-2 hidden">
                                        <p class="text-sm p-3 bg-blue-50 dark:bg-blue-900/40 border-l-4 border-blue-500 rounded">A doação não foi efetivada. O vencimento será no último dia útil do ano corrente.</p>
                                    </div>
                                </div>
                                <div id="display-legislacao-aplicavel-doacao" class="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-2"></div>
                            </div>
                        </fieldset>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <fieldset id="fieldset-doacao-doadores" class="section-box p-4 border dark:border-slate-700 rounded-lg">
                                <div class="flex justify-between items-center mb-3">
                                    <h3 class="text-lg font-medium">Doador(es)</h3>
                                    <button id="btn-adicionar-doador" class="btn-secondary btn-sm">Adicionar</button>
                                </div>
                                <div id="lista-doadores" class="space-y-2"></div>
                            </fieldset>
                            <fieldset id="fieldset-doacao-donatarios" class="section-box p-4 border dark:border-slate-700 rounded-lg">
                                <div class="flex justify-between items-center mb-3">
                                    <h3 class="text-lg font-medium">Donatário(s)</h3>
                                    <button id="btn-adicionar-donatario" class="btn-secondary btn-sm">Adicionar</button>
                                </div>
                                <div id="lista-donatarios" class="space-y-2"></div>
                            </fieldset>
                        </div>

                        <fieldset id="fieldset-doacao-bens" class="section-box p-4 border dark:border-slate-700 rounded-lg">
                            <h3 class="text-lg font-medium mb-3">Bens e Direitos Doados</h3>
                            <div class="flex justify-between items-center mb-4">
                                <div id="total-avaliado-container" class="text-sm">
                                    <span class="font-semibold">Total Avaliado:</span> 
                                    <span id="total-avaliado-reais" class="font-bold text-gray-800 dark:text-gray-100">R$ 0,00</span>
                                    <span id="total-avaliado-ufemg" class="ml-2 text-blue-600 dark:text-blue-400"></span>
                                </div>
                                <div id="acoes-partilha-bens" class="hidden flex items-center gap-2">
                                    <label class="inline-flex items-center text-sm">
                                        <input type="checkbox" id="selecionar-todos-bens-partilha-doacao" class="form-checkbox h-4 w-4">
                                        <span class="ml-2">Todos</span>
                                    </label>
                                    <button id="btn-aplicar-partilha-igualitaria" class="btn-secondary btn-sm text-xs">Partilha Igualitária</button>
                                    <button id="btn-abrir-partilha-seletiva" class="btn-secondary btn-sm text-xs">Partilha Seletiva</button>
                                </div>
                                <button id="btn-adicionar-bem-doacao" class="btn-secondary btn-sm">Adicionar Bem</button>
                            </div>
                            <div id="lista-bens-doados" class="space-y-3"></div>
                        </fieldset>
                    </div>

                    <div class="lg:col-span-1">
                         <fieldset id="fieldset-doacao-resultado" class="section-box p-4 border dark:border-slate-700 rounded-lg sticky top-24">
                            <h3 class="text-lg font-medium mb-3">Resultado do Cálculo</h3>
                             <div class="flex justify-between text-sm"><span class="text-gray-600 dark:text-gray-400">Vencimento:</span> <input type="date" id="doacao-vencimento-itcd" class="form-input-text text-sm p-1 ml-2 flex-grow bg-gray-200 dark:bg-slate-700" readonly></div>
                             <div class="flex justify-between text-sm mt-1"><span class="text-gray-600 dark:text-gray-400">Valor da UFEMG:</span> <span id="doacao-valor-ufemg" class="font-semibold"></span></div>
                            <div id="resultado-calculo-doacao" class="mt-4 pt-3 border-t dark:border-slate-600 space-y-2 text-sm"></div>
                             <div class="mt-4 pt-3 border-t dark:border-slate-600">
                                <label for="doacao-data-pagamento" class="block text-sm font-medium">Data do Pagamento:</label>
                                <input type="date" id="doacao-data-pagamento" class="form-input-text mt-1 text-sm" value="${calculoExistente?.dataPagamento || hoje}">
                            </div>
                            <button id="btn-executar-calculo-doacao" class="btn-primary w-full mt-4">Calcular Imposto</button>
                            <button id="btn-salvar-calculo-doacao" class="btn-primary w-full mt-2">Salvar Cálculo</button>
                        </fieldset>
                    </div>
                </div>
            </div>
        `;
        mainContentWrapperRef.innerHTML = pageHtml;
        addEventListenersDoacao();
        renderListaDoadores();
        renderListaDonatarios();
        renderListaBensDoacao();
        toggleEditModeDoacao(isEditMode);
        renderResultadosDoacao(calculoExistente ? calculoExistente.resultadoFinal : null);
        
        document.querySelector('input[name="doacao-efetivada"]:checked').dispatchEvent(new Event('change'));
    }
    
    function toggleEditModeDoacao(enable) {
        isEditMode = enable;
        const fieldsets = ['#fieldset-doacao-dados', '#fieldset-doacao-doadores', '#fieldset-doacao-donatarios', '#fieldset-doacao-bens', '#fieldset-doacao-resultado'];
        fieldsets.forEach(selector => {
            const fieldset = document.querySelector(selector);
            if(fieldset) fieldset.disabled = !enable;
        });

        document.getElementById('btn-habilitar-edicao-doacao')?.classList.toggle('hidden', enable);
        document.getElementById('btn-salvar-calculo-doacao')?.classList.toggle('hidden', !enable);
    }
    
    function addEventListenersDoacao() {
        document.getElementById('btn-voltar-calculo-hub').addEventListener('click', () => appModuleRef.handleMenuAction('itcd-gerir-calculos'));
        document.getElementById('btn-adicionar-doador').addEventListener('click', () => abrirModalPessoa('doador'));
        document.getElementById('btn-adicionar-donatario').addEventListener('click', () => abrirModalPessoa('donatario'));
        document.getElementById('btn-adicionar-bem-doacao').addEventListener('click', () => abrirModalAdicionarBemDoacao(null));
        document.getElementById('btn-executar-calculo-doacao').addEventListener('click', executarCalculoDoacao);
        document.getElementById('btn-salvar-calculo-doacao').addEventListener('click', salvarCalculoDoacao);
        document.getElementById('btn-aplicar-partilha-igualitaria').addEventListener('click', _handleAplicarPartilhaIgualitaria);
        document.getElementById('btn-abrir-partilha-seletiva').addEventListener('click', _abrirModalPartilhaSeletiva);
        
        document.getElementById('lista-bens-doados').addEventListener('click', e => {
            const bemId = e.target.closest('.bem-doado-card')?.dataset.id;
            if(!bemId) return;
            if (e.target.classList.contains('btn-editar-bem-doacao')) {
                const bem = bensDaDoacao.find(b => b.id === bemId);
                if (bem) abrirModalAdicionarBemDoacao(bem);
            }
            if (e.target.classList.contains('btn-excluir-bem-doacao')) {
                bensDaDoacao = bensDaDoacao.filter(b => b.id !== bemId);
                renderListaBensDoacao();
            }
        });
        
        const btnHabilitarEdicao = document.getElementById('btn-habilitar-edicao-doacao');
        if (btnHabilitarEdicao) {
            btnHabilitarEdicao.addEventListener('click', () => toggleEditModeDoacao(true));
        }

        document.querySelectorAll('input[name="doacao-efetivada"]').forEach(radio => radio.addEventListener('change', verificarLegislacaoAplicavelDoacao));
        document.getElementById('doacao-fato-gerador')?.addEventListener('change', verificarLegislacaoAplicavelDoacao);
        document.querySelectorAll('input[name="doacao-formalizacao"]').forEach(radio => radio.addEventListener('change', verificarLegislacaoAplicavelDoacao));

        document.getElementById('lista-doadores').addEventListener('click', (e) => handlePessoaListAction(e, 'doador'));
        document.getElementById('lista-donatarios').addEventListener('click', (e) => handlePessoaListAction(e, 'donatario'));

        const selecionarTodosCheckbox = document.getElementById('selecionar-todos-bens-partilha-doacao');
        if (selecionarTodosCheckbox) {
            selecionarTodosCheckbox.addEventListener('change', (e) => {
                document.querySelectorAll('.bem-selecao-checkbox').forEach(checkbox => {
                    checkbox.checked = e.target.checked;
                });
            });
        }
    }

    function handlePessoaListAction(e, tipoPessoa) {
        const pessoaId = e.target.closest('.pessoa-card')?.dataset.id;
        if (!pessoaId) return;

        if (e.target.classList.contains('btn-excluir-pessoa')) {
            if (tipoPessoa === 'doador') {
                doadores = doadores.filter(d => d.id !== pessoaId);
                renderListaDoadores();
            } else {
                donatarios = donatarios.filter(d => d.id !== pessoaId);
                renderListaDonatarios();
                renderListaBensDoacao();
            }
        }
    }

    function abrirModalPessoa(tipo) { // tipo = 'doador' ou 'donatario'
        const titulo = tipo === 'doador' ? 'Adicionar Doador' : 'Adicionar Donatário';
        const modalContent = `
            <form id="form-add-pessoa" class="space-y-4">
                <div>
                    <label for="pessoa-nome-modal" class="block text-sm font-medium">Nome:</label>
                    <input type="text" id="pessoa-nome-modal" class="form-input-text mt-1" placeholder="Nome completo">
                </div>
            </form>
        `;
        uiModuleRef.showModal(titulo, modalContent, [
            {text: "Cancelar", class: "btn-secondary", closesModal: true},
            {text: "Adicionar", class: "btn-primary", callback: () => {
                const nome = document.getElementById('pessoa-nome-modal').value.trim();
                if (!nome) {
                    uiModuleRef.showToastNotification("O nome é obrigatório.", "warning");
                    return false;
                }
                const pessoa = { id: `pessoa_${Date.now()}`, nome };
                if (tipo === 'doador') {
                    doadores.push(pessoa);
                    renderListaDoadores();
                } else {
                    donatarios.push(pessoa);
                    renderListaDonatarios();
                    renderListaBensDoacao();
                }
                return true;
            }}
        ]);
    }

    function renderListaPessoas(tipo) {
        const [lista, containerId] = tipo === 'doador' ? [doadores, 'lista-doadores'] : [donatarios, 'lista-donatarios'];
        const container = document.getElementById(containerId);
        if(!container) return;

        if (lista.length === 0) {
            container.innerHTML = `<p class="text-sm text-center text-gray-500 dark:text-gray-400 p-2">Nenhum ${tipo} adicionado.</p>`;
            return;
        }

        container.innerHTML = '';
        lista.forEach(pessoa => {
            const card = document.createElement('div');
            card.className = 'pessoa-card card p-2 flex justify-between items-center';
            card.dataset.id = pessoa.id;
            card.innerHTML = `
                <p class="font-medium text-sm text-gray-800 dark:text-gray-100">${pessoa.nome}</p>
                <button class="btn-link btn-excluir-pessoa text-xs text-red-500">Excluir</button>
            `;
            container.appendChild(card);
        });
    }

    function renderListaDoadores() { renderListaPessoas('doador'); }
    function renderListaDonatarios() { renderListaPessoas('donatario'); }

    async function updateModalUI() {
        const modal = document.querySelector('#form-adicionar-bem-doacao');
        if (!modal) return;
    
        const valorInput = modal.querySelector('#bem-valor-modal');
        const dataAvaliacaoInput = modal.querySelector('#bem-data-avaliacao-modal');
        const displayUfemg = modal.querySelector('#display-valor-ufemg-modal');
        
        if (valorInput && dataAvaliacaoInput && displayUfemg) {
            const valor = parseFromBRL(valorInput.value);
            const dataAvaliacao = dataAvaliacaoInput.value;
            const anoReferencia = dataAvaliacao ? new Date(dataAvaliacao + 'T00:00:00').getFullYear() : null;
    
            if(valor > 0 && anoReferencia && window.SEFWorkStation?.ITCD?.TabelasReferencia?.buscarValorUfemgPorAno) {
                try {
                    const valorUfemgAno = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(anoReferencia);
                    if(valorUfemgAno > 0) {
                        const valorEmUfemg = valor / valorUfemgAno;
                        displayUfemg.textContent = `Valor em UFEMG (ref. ${anoReferencia}): ${valorEmUfemg.toLocaleString('pt-BR', {minimumFractionDigits: 4, maximumFractionDigits: 4})}`;
                    } else {
                        displayUfemg.textContent = `Valor da UFEMG para ${anoReferencia} não encontrado.`;
                    }
                } catch(e) { 
                    displayUfemg.textContent = "Erro ao buscar valor da UFEMG.";
                }
            } else {
                displayUfemg.textContent = '';
            }
        }
    }

    function abrirModalAdicionarBemDoacao(bemExistente = null) {
        const isEditing = bemExistente !== null;
        const tituloModal = isEditing ? 'Editar Bem Doador' : 'Adicionar Bem Doador';
        const hoje = new Date().toISOString().split('T')[0];

        const modalContent = `
            <form id="form-adicionar-bem-doacao" class="space-y-4">
                <input type="hidden" id="bem-id-modal" value="${bemExistente?.id || ''}">
                <div>
                    <label for="bem-descricao-modal" class="block text-sm font-medium">Descrição do Bem:</label>
                    <input type="text" id="bem-descricao-modal" class="form-input-text mt-1" placeholder="Ex: Imóvel matrícula 123, Veículo Placa ABC-1234" value="${bemExistente?.descricao || ''}">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label for="bem-valor-modal" class="block text-sm font-medium">Valor de Mercado:</label>
                        <input type="text" id="bem-valor-modal" class="form-input-text mt-1 currency-input" value="${formatBRL(bemExistente?.valor || 0)}">
                    </div>
                     <div>
                        <label for="bem-percentual-transmissao-modal" class="block text-sm font-medium">% Transmitido:</label>
                        <input type="number" id="bem-percentual-transmissao-modal" class="form-input-text mt-1" min="0" max="100" step="0.01" value="${bemExistente?.percentualTransmissao || 100}">
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                     <div>
                        <label for="bem-data-avaliacao-modal" class="block text-sm font-medium">Data da Avaliação:</label>
                        <input type="date" id="bem-data-avaliacao-modal" class="form-input-text mt-1" value="${bemExistente?.dataAvaliacao || hoje}">
                    </div>
                    <div>
                        <p id="display-valor-ufemg-modal" class="text-xs text-gray-600 dark:text-gray-400 h-6"></p>
                    </div>
                 </div>
            </form>
        `;
        const modal = uiModuleRef.showModal(tituloModal, modalContent, [
            { text: "Cancelar", class: "btn-secondary", closesModal: true },
            { text: isEditing ? "Salvar Alterações" : "Adicionar", class: "btn-primary", callback: () => {
                const id = modal.querySelector('#bem-id-modal').value;
                const descricao = modal.querySelector('#bem-descricao-modal').value.trim();
                const valor = parseFromBRL(modal.querySelector('#bem-valor-modal').value);
                const percentual = parseFloat(modal.querySelector('#bem-percentual-transmissao-modal').value) || 100;
                const dataAvaliacao = modal.querySelector('#bem-data-avaliacao-modal').value;
                
                if (!descricao || valor <= 0 || !dataAvaliacao) {
                    uiModuleRef.showToastNotification("Descrição, valor e data da avaliação são obrigatórios.", "warning");
                    return false;
                }
                
                if (isEditing) {
                    const index = bensDaDoacao.findIndex(b => b.id === id);
                    if (index > -1) {
                        bensDaDoacao[index] = { ...bensDaDoacao[index], descricao, valor, percentualTransmissao: percentual, dataAvaliacao };
                    }
                } else {
                    bensDaDoacao.push({ id: `bem_${Date.now()}`, descricao, valor, percentualTransmissao: percentual, dataAvaliacao, partilha: {} });
                }
                
                renderListaBensDoacao();
                return true;
            }}
        ]);
        
        modal.querySelectorAll('.currency-input').forEach(input => {
            input.addEventListener('blur', e => { e.target.value = formatBRL(parseFromBRL(e.target.value)); });
        });
        
        modal.querySelector('#bem-valor-modal').addEventListener('input', updateModalUI);
        modal.querySelector('#bem-data-avaliacao-modal').addEventListener('change', updateModalUI);

        updateModalUI();
    }

    async function renderListaBensDoacao() {
        const container = document.getElementById('lista-bens-doados');
        const acoesPartilhaContainer = document.getElementById('acoes-partilha-bens');
        
        if (!container) return;
        
        if (bensDaDoacao.length === 0) {
             container.innerHTML = '<p class="text-sm text-center text-gray-500 dark:text-gray-400 p-4">Nenhum bem adicionado.</p>';
             acoesPartilhaContainer.classList.add('hidden');
             document.getElementById('total-avaliado-reais').textContent = formatBRL(0);
             document.getElementById('total-avaliado-ufemg').textContent = '';
             return;
        }
        acoesPartilhaContainer.classList.remove('hidden');
    
        container.innerHTML = '';
        let totalAvaliadoReais = 0;
        let totalAvaliadoUfemg = 0;
        
        for (const bem of bensDaDoacao) {
            const card = document.createElement('div');
            card.className = 'bem-doado-card card p-3';
            card.dataset.id = bem.id;

            const valorTotalBem = (bem.valor || 0) * ((bem.percentualTransmissao || 100) / 100);
            totalAvaliadoReais += valorTotalBem;
            
            const anoReferenciaUfemg = bem.dataAvaliacao ? new Date(bem.dataAvaliacao + 'T00:00:00').getFullYear() : new Date().getFullYear();
            const valorUfemgAno = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(anoReferenciaUfemg);
            
            const valorEmUfemg = valorUfemgAno > 0 ? valorTotalBem / valorUfemgAno : 0;
            totalAvaliadoUfemg += valorEmUfemg;
            
            const ufemgDisplay = valorEmUfemg > 0 ? `<span class="text-xs text-gray-500 dark:text-gray-400">(${valorEmUfemg.toLocaleString('pt-BR', {minimumFractionDigits: 4})} UFEMG)</span>` : '';

            const partilhaHtml = donatarios.length > 0 ? donatarios.map(d => `
                <div class="flex items-center gap-2">
                    <label for="partilha-donatario-${d.id}-bem-${bem.id}" class="flex-grow text-xs text-gray-700 dark:text-gray-300">${d.nome}:</label>
                    <input type="number" id="partilha-donatario-${d.id}-bem-${bem.id}" data-donatario-id="${d.id}" data-bem-id="${bem.id}" 
                           class="form-input-text w-24 text-xs p-1 partilha-percent-input-card" placeholder="%" min="0" max="100" step="0.01" value="${bem.partilha?.[d.id] || 0}">
                </div>
            `).join('') : '<p class="text-xs text-gray-500 dark:text-gray-400">Adicione donatários para definir a partilha.</p>';

            const totalPartilhado = Object.values(bem.partilha || {}).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);

            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <div class="flex items-center">
                        <input type="checkbox" class="form-checkbox h-4 w-4 mr-3 bem-selecao-checkbox" data-bem-id="${bem.id}">
                        <div>
                            <p class="font-semibold text-gray-800 dark:text-gray-100">${bem.descricao}</p>
                            <p class="text-xs text-gray-600 dark:text-gray-400">
                                Valor: ${formatBRL(bem.valor)} (${bem.percentualTransmissao}%) ${ufemgDisplay}
                            </p>
                        </div>
                    </div>
                    <div class="space-x-2">
                        <button class="btn-link btn-editar-bem-doacao text-sm">Editar</button>
                        <button class="btn-link btn-excluir-bem-doacao text-sm text-red-500">Excluir</button>
                    </div>
                </div>
                 <details class="mt-2 ml-7">
                    <summary class="text-xs text-blue-600 dark:text-blue-400 cursor-pointer">Definir Partilha</summary>
                    <div class="mt-2 p-2 border rounded-md bg-white dark:bg-slate-900/50 space-y-1">
                        ${partilhaHtml}
                        <div class="text-xs font-semibold mt-2 pt-1 border-t dark:border-slate-700">Total Partilhado: 
                            <span class="partilha-total-display-card ${Math.abs(totalPartilhado - 100) > 0.01 ? 'text-red-500' : 'text-green-500'}">${totalPartilhado.toFixed(2)}</span>%
                        </div>
                    </div>
                </details>`;
            container.appendChild(card);
        }
        
        document.getElementById('total-avaliado-reais').textContent = formatBRL(totalAvaliadoReais);
        document.getElementById('total-avaliado-ufemg').textContent = `(${totalAvaliadoUfemg.toLocaleString('pt-BR', {minimumFractionDigits: 4})} UFEMG)`;

        container.querySelectorAll('.partilha-percent-input-card').forEach(input => {
            input.addEventListener('input', e => {
                const bemId = e.target.dataset.bemId;
                const donatarioId = e.target.dataset.donatarioId;
                const percentual = parseFloat(e.target.value) || 0;
                const bem = bensDaDoacao.find(b => b.id === bemId);
                if (bem) {
                    if (!bem.partilha) bem.partilha = {};
                    bem.partilha[donatarioId] = percentual;
                    
                    const card = e.target.closest('.bem-doado-card');
                    const totalDisplay = card.querySelector('.partilha-total-display-card');
                    const totalPartilhado = Object.values(bem.partilha).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
                    totalDisplay.textContent = totalPartilhado.toFixed(2);
                    totalDisplay.classList.toggle('text-red-500', Math.abs(totalPartilhado - 100) > 0.01);
                    totalDisplay.classList.toggle('text-green-500', Math.abs(totalPartilhado - 100) <= 0.01);
                }
            });
        });
    }
    
    function _handleAplicarPartilhaIgualitaria() {
        const selectedBemIds = Array.from(document.querySelectorAll('.bem-selecao-checkbox:checked')).map(cb => cb.dataset.bemId);
        if (selectedBemIds.length === 0) {
            uiModuleRef.showToastNotification("Nenhum bem selecionado.", "warning"); return;
        }
        if (donatarios.length === 0) {
            uiModuleRef.showToastNotification("Nenhum donatário adicionado para a partilha.", "warning"); return;
        }

        const percentualIgual = 100 / donatarios.length;
        bensDaDoacao.forEach(bem => {
            if (selectedBemIds.includes(bem.id)) {
                bem.partilha = {};
                donatarios.forEach(donatario => {
                    bem.partilha[donatario.id] = percentualIgual;
                });
            }
        });
        renderListaBensDoacao();
    }
    
    function _abrirModalPartilhaSeletiva() {
        const selectedBemIds = Array.from(document.querySelectorAll('.bem-selecao-checkbox:checked')).map(cb => cb.dataset.bemId);
        if (selectedBemIds.length === 0) {
            uiModuleRef.showToastNotification("Nenhum bem selecionado.", "warning"); return;
        }
        if (donatarios.length === 0) {
            uiModuleRef.showToastNotification("Nenhum donatário adicionado.", "warning"); return;
        }

        let modalContent = `
            <div id="feedback-partilha-seletiva-modal"></div>
            <p class="text-sm mb-4">Defina as porcentagens para os donatários. A soma deve ser 100%.</p>
            <div class="space-y-2">
                ${donatarios.map(d => `
                    <div class="flex items-center gap-4">
                        <label class="w-1/2">${d.nome}:</label>
                        <input type="number" data-donatario-id="${d.id}" class="form-input-text w-1/2 partilha-seletiva-input" placeholder="%">
                    </div>
                `).join('')}
            </div>
            <div class="mt-4 pt-2 border-t font-semibold">
                Total: <span id="total-partilha-seletiva">0.00</span>%
            </div>
        `;

        const modal = uiModuleRef.showModal("Definir Partilha Seletiva", modalContent, [
            { text: 'Cancelar', class: 'btn-secondary', closesModal: true },
            { text: 'Aplicar aos Selecionados', class: 'btn-primary', callback: () => {
                return _handleConfirmarPartilhaSeletiva(selectedBemIds);
            }}
        ]);
        
        modal.querySelector('#modal-content').addEventListener('input', e => {
            if(e.target.classList.contains('partilha-seletiva-input')) {
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
            if (percentual > 0) partilhaDefinida[input.dataset.donatarioId] = percentual;
        });

        if (Math.abs(total - 100) > 0.01) {
            feedbackEl.innerHTML = `<p class="text-red-500 text-sm">A soma das porcentagens deve ser exatamente 100%.</p>`;
            return false;
        }

        bensDaDoacao.forEach(bem => {
            if (selectedBemIds.includes(bem.id)) {
                bem.partilha = {};
                for (const id in partilhaDefinida) bem.partilha[id] = partilhaDefinida[id];
            }
        });
        renderListaBensDoacao();
        return true;
    }

    function getModuloCalculoPorData(data) {
        if (data >= '2007-12-29') return window.SEFWorkStation.ITCD.Calculo.Legislacao.Lei14941_03_apos2008;
        if (data >= '2004-03-29') return window.SEFWorkStation.ITCD.Calculo.Legislacao.Lei14941_03_ate2007;
        if (data >= '1997-01-01') return window.SEFWorkStation.ITCD.Calculo.Legislacao.Lei12426_96;
        if (data >= '1989-03-01') return window.SEFWorkStation.ITCD.Calculo.Legislacao.Lei9752_89;
        if (data >= '1976-01-01') return window.SEFWorkStation.ITCD.Calculo.Legislacao.Lei6763_75;
        return null;
    }

    async function verificarLegislacaoAplicavelDoacao() {
        const efetivada = document.querySelector('input[name="doacao-efetivada"]:checked')?.value;
        const containerSim = document.getElementById('container-doacao-efetivada-sim');
        const containerNao = document.getElementById('container-doacao-efetivada-nao');
        const dataInput = document.getElementById('doacao-fato-gerador');
        const formalizacao = document.querySelector('input[name="doacao-formalizacao"]:checked')?.value;
        const displayEl = document.getElementById('display-legislacao-aplicavel-doacao');
        const vencimentoInput = document.getElementById('doacao-vencimento-itcd');
        const ufermgDisplay = document.getElementById('doacao-valor-ufemg');

        containerSim.classList.toggle('hidden', efetivada !== 'sim');
        containerNao.classList.toggle('hidden', efetivada !== 'nao');

        displayEl.textContent = '';
        vencimentoInput.value = '';
        ufermgDisplay.textContent = 'N/A';
        
        const dataFatoGerador = dataInput.value;
        let dataObjeto;
        
        if (efetivada === 'sim' && dataFatoGerador) {
            dataObjeto = new Date(dataFatoGerador + "T00:00:00");
        } else if (efetivada === 'nao') {
            dataObjeto = new Date();
        } else {
            return;
        }
        
        let dataVencimento;
        if (efetivada === 'sim') {
            if (formalizacao === 'escritura') {
                dataVencimento = dataObjeto;
            } else {
                dataVencimento = new Date(dataObjeto);
                dataVencimento.setDate(dataVencimento.getDate() + 15);
            }
        } else {
            const anoCorrente = new Date().getFullYear();
            dataVencimento = new Date(anoCorrente, 11, 31);
        }

        vencimentoInput.value = dataVencimento.toISOString().split('T')[0];
        
        const anoVencimento = dataVencimento.getFullYear();
        const valorUfemg = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(anoVencimento);
        ufermgDisplay.textContent = valorUfemg > 0 ? valorUfemg.toLocaleString('pt-BR', {minimumFractionDigits: 4, maximumFractionDigits: 4}) : 'N/A';

        let legislacao = 'Legislação não identificada.';
        if (dataFatoGerador) {
            if (dataFatoGerador >= '2007-12-29') legislacao = 'Lei 14.941/03 (após 2008)';
            else if (dataFatoGerador >= '2004-03-29') legislacao = 'Lei 14.941/03 (até 2007)';
            else if (dataFatoGerador >= '1997-01-01') legislacao = 'Lei 12.426/96';
            else if (dataFatoGerador >= '1989-03-01') legislacao = 'Lei 9.752/89';
            else if (dataFatoGerador >= '1976-01-01') legislacao = 'Lei 6.763/75';
        }
        displayEl.innerHTML = `<strong>Legislação Aplicável:</strong> ${legislacao}`;
    }

    async function executarCalculoDoacao() {
        const dataFatoGerador = document.getElementById('doacao-fato-gerador').value;
        const dataPagamento = document.getElementById('doacao-data-pagamento').value;
        const vencimento = document.getElementById('doacao-vencimento-itcd').value;

        if (document.querySelector('input[name="doacao-efetivada"]:checked').value === 'sim' && !dataFatoGerador) {
             uiModuleRef.showToastNotification("A data do fato gerador é obrigatória para doações efetivadas.", "error"); return;
        }
        if (bensDaDoacao.length === 0) { uiModuleRef.showToastNotification("Adicione pelo menos um bem.", "warning"); return; }
        if (donatarios.length === 0) { uiModuleRef.showToastNotification("Adicione pelo menos um donatário.", "warning"); return; }

        for (const bem of bensDaDoacao) {
            const totalPartilhado = Object.values(bem.partilha || {}).reduce((acc, v) => acc + (parseFloat(v) || 0), 0);
            if (Math.abs(totalPartilhado - 100) > 0.01) {
                uiModuleRef.showToastNotification(`O bem "${bem.descricao}" não foi partilhado em 100%.`, "error", 0); return;
            }
        }

        const moduloCalculo = getModuloCalculoPorData(dataFatoGerador || new Date().toISOString().split('T')[0]);
        if (!moduloCalculo) {
            renderResultadosDoacao({ erros: ["Legislação para esta data não implementada."] }); return;
        }

        let calculosPorDonatario = {};
        for (const donatario of donatarios) {
            let baseCalculoUfemgDonatario = 0;
            for (const bem of bensDaDoacao) {
                const percentualRecebido = (bem.partilha?.[donatario.id] || 0) / 100;
                if(percentualRecebido > 0) {
                    const valorDoBemReais = (bem.valor || 0) * (bem.percentualTransmissao / 100);
                    const anoRef = new Date(bem.dataAvaliacao + 'T00:00:00').getFullYear();
                    const valorUfemgAnoAvaliacao = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(anoRef);
                    const valorDoBemUfemg = valorUfemgAnoAvaliacao > 0 ? valorDoBemReais / valorUfemgAnoAvaliacao : 0;
                    baseCalculoUfemgDonatario += valorDoBemUfemg * percentualRecebido;
                }
            }
            calculosPorDonatario[donatario.id] = { id: donatario.id, nome: donatario.nome, baseCalculoUfemg: baseCalculoUfemgDonatario };
        }
        
        let resultadoFinal = { total: { impostoARecolher: 0 }, porDonatario: [] };
        let justificativasGlobais = new Set();
        // CORREÇÃO: Busca o valor da UFEMG para o vencimento corretamente.
        const valorUfemgVencimento = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(new Date(vencimento).getFullYear());

        for (const id in calculosPorDonatario) {
            const dadosDonatario = calculosPorDonatario[id];
            const baseCalculoReaisFinal = dadosDonatario.baseCalculoUfemg * valorUfemgVencimento;
            
            const dadosParaCalculo = {
                baseCalculoReais: baseCalculoReaisFinal,
                baseCalculoUfemg: dadosDonatario.baseCalculoUfemg, 
                dataFatoGerador: dataFatoGerador || null, 
                dataPagamento, 
                vencimento,
                recolhimentoPrevio: { houve: false }, 
                justificativas: [],
                tipoDoacao: true,
                baseCalculoTotalUfemg: dadosDonatario.baseCalculoUfemg,
                impostoPagoAnteriorUfemg: 0,
                valorUfemgDoVencimento: valorUfemgVencimento // CORREÇÃO: Passa o valor da UFEMG para o motor.
            };
            const resultado = await moduloCalculo.calcular(dadosParaCalculo);
            resultado.nome = dadosDonatario.nome;
            resultado.id = dadosDonatario.id; 
            resultadoFinal.porDonatario.push(resultado);
            resultadoFinal.total.impostoARecolher += resultado.valores.impostoARecolher;
            if (resultado.justificativaCalculo) {
                resultado.justificativaCalculo.forEach(j => justificativasGlobais.add(j));
            }
        }
        resultadoFinal.total.justificativas = Array.from(justificativasGlobais);

        ultimoResultadoCalculado = resultadoFinal;
        renderResultadosDoacao(resultadoFinal);
    }
    
    function renderResultadosDoacao(resultado) {
        const container = document.getElementById('resultado-calculo-doacao');
        if (!container) return;
        if (!resultado) {
            container.innerHTML = '<p class="text-sm text-center text-gray-500">Aguardando cálculo...</p>';
            return;
        }
        if(resultado.erros) {
            container.innerHTML = `<p class="feedback-message error">${resultado.erros[0]}</p>`;
            return;
        }
        
        let html = '<div class="space-y-4">';
        resultado.porDonatario.forEach(res => {
            const { valores, nome } = res;
             html += `
                <div class="p-2 border rounded-md dark:border-slate-600">
                    <p class="font-semibold text-sm mb-1">${nome}</p>
                    <div class="space-y-1 text-xs">
                         <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Base (R$):</span> <span>${formatBRL(valores.baseCalculoReais)}</span></div>
                         <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Base (UFEMG):</span> <span>${(valores.baseCalculoUfemg || 0).toLocaleString('pt-BR', {minimumFractionDigits:4})}</span></div>
                         <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Alíquota:</span> <span>${typeof valores.aliquota === 'string' ? valores.aliquota : `${(valores.aliquota || 0).toLocaleString('pt-BR')}%`}</span></div>
                         <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">ITCD:</span> <span>${formatBRL(valores.itcdPrincipal)}</span></div>
                         <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Desconto:</span> <span>${formatBRL(valores.desconto)}</span></div>
                         <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Multa:</span> <span>${formatBRL(valores.multa)}</span></div>
                         <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Juros (${(valores.percentualJuros || 0).toFixed(2)}%):</span> <span>${formatBRL(valores.juros)}</span></div>
                         <div class="flex justify-between font-bold"><span class="dark:text-gray-300">A Recolher:</span> <span>${formatBRL(valores.impostoARecolher)}</span></div>
                    </div>
                </div>
            `;
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

        container.innerHTML = html;
    }
    
    async function salvarCalculoDoacao() {
        if (!ultimoResultadoCalculado) {
            uiModuleRef.showToastNotification("Por favor, execute o cálculo antes de salvar.", "warning"); return;
        }
        if (!dbRef) {
            uiModuleRef.showToastNotification("Erro: A conexão com o banco de dados não está disponível.", "error"); return;
        }

        const nomesDoadores = doadores.map(d => d.nome).join(', ');
        const nomesDonatarios = donatarios.map(d => d.nome).join(', ');

        const calculoData = {
            id: calculoAtualId || appModuleRef.generateUUID(),
            tipoCalculo: 'doacao',
            declaracaoNumero: document.getElementById('doacao-declaracao')?.value || '',
            deCujusNome: `Doação de ${nomesDoadores || 'N/A'} para ${nomesDonatarios || 'N/A'}`,
            doadores: doadores,
            donatarios: donatarios,
            tipoDoacaoGlobal: document.querySelector('input[name="doacao-tipo-global"]:checked').value,
            efetivada: document.querySelector('input[name="doacao-efetivada"]:checked').value === 'sim',
            dataFatoGerador: document.getElementById('doacao-fato-gerador')?.value,
            dataPagamento: document.getElementById('doacao-data-pagamento')?.value,
            formalizada: document.querySelector('input[name="doacao-formalizacao"]:checked').value,
            bens: bensDaDoacao,
            dataSalvamento: new Date().toISOString(),
            resultadoFinal: ultimoResultadoCalculado
        };
        
        try {
            await dbRef.updateItem(dbRef.STORES.ITCD_CALCULOS, calculoData);
            calculoAtualId = calculoData.id;
            uiModuleRef.showToastNotification("Cálculo de doação salvo com sucesso!", "success");
            appModuleRef.handleMenuAction('itcd-visualizar-calculo', { calculoId: calculoData.id });
        } catch(e) {
            uiModuleRef.showToastNotification(`Falha ao salvar cálculo: ${e.message}`, "error");
        }
    }

    return {
        init,
        renderFormDoacao
    };

})();