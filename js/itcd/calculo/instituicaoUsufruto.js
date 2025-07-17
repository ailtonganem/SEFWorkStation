// js/itcd/calculo/instituicaoUsufruto.js - Módulo para Cálculo de ITCD sobre Instituição de Usufruto
// v2.4.1 - CORREÇÃO CRÍTICA FINAL: A lógica de cálculo do resumo e do imposto foi refeita para converter cada bem para UFEMG individualmente, usando a cotação do ano de sua avaliação, antes de somar os totais. Isso resolve a inconsistência fundamental nos valores apresentados.
// v2.4.0 - CORREÇÃO CRÍTICA: Lógica de conversão de R$ para UFEMG refeita. Agora, cada bem é convertido individualmente usando a cotação do seu próprio ano de avaliação, tanto no resumo quanto no cálculo final, resolvendo a instabilidade e a inconsistência de valores.
// v2.3.3 - CORRIGIDO: Removida chamada recursiva em `verificarLegislacaoAplicavel` que causava instabilidade ao adicionar bens.
// v2.3.2 - CORRIGIDO: Conversão do valor do bem para UFEMG na lista agora usa a data de avaliação do próprio bem, garantindo consistência visual.
// v2.3.1 - CORRIGIDO: Exibição do valor em UFEMG na lista de bens agora usa a data do fato gerador, garantindo consistência visual com o resumo do cálculo.
// v2.3.0 - CORRIGIDO: Padronizada a conversão de valores para UFEMG no resumo, garantindo consistência com o motor de cálculo e resolvendo a exibição de bases de cálculo discrepantes.
// v2.2.2 - CORRIGIDO: Adiciona checagem de nulidade (optional chaining) para evitar 'TypeError' ao ler valor de input de rádio.
// v2.2.1 - CORRIGIDO: Adiciona o redirecionamento para a tela de visualização após salvar o cálculo.
// v2.2.0 - MELHORIA: Exibe o valor da UFEMG do vencimento e enriquece o demonstrativo final com mais detalhes sobre a base de cálculo em R$ e UFEMG, tanto no total quanto por beneficiário.
// v2.1.0 - IMPLEMENTADO: Exibição de totais, cálculo individual por beneficiário, partilha e acréscimos legais.
// v2.0.0 - REFATORADO: Adiciona cálculo individual por beneficiário, partilha detalhada de bens, campo de efetivação e cálculo completo de acréscimos legais.
// v1.0.0 - Módulo criado a partir da refatoração de usufruto.js. Lógica exclusiva para instituição.

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ITCD = window.SEFWorkStation.ITCD || {};
window.SEFWorkStation.ITCD.Calculo = window.SEFWorkStation.ITCD.Calculo || {};

window.SEFWorkStation.ITCD.Calculo.InstituicaoUsufruto = (function() {

    let mainContentWrapperRef;
    let appModuleRef;
    let uiModuleRef;
    let dbRef;

    // Estado do Módulo
    let ultimoResultadoCalculado = null;
    let calculoAtualId = null;
    let isEditMode = true;
    let bensDoCalculo = [];
    let instituidores = [];
    let beneficiarios = [];

    const FATOR_INSTITUICAO = 1 / 3;

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
        const fieldsets = document.querySelectorAll('#itcd-calculo-instituicao-container fieldset');
        fieldsets.forEach(fs => { fs.disabled = !enable; });
        document.getElementById('btn-habilitar-edicao-instituicao')?.classList.toggle('hidden', enable);
        document.getElementById('btn-salvar-calculo-instituicao')?.classList.toggle('hidden', !enable);
        const helpText = document.querySelector('#itcd-calculo-instituicao-container .text-sm.text-gray-600');
        if (helpText) helpText.textContent = enable ? 'Preencha os dados para apurar o imposto.' : 'Modo de visualização.';
    }

    // --- Renderização Principal ---
    function renderForm(calculoExistente = null, startInEditMode = true) {
        calculoAtualId = calculoExistente?.id || null;
        ultimoResultadoCalculado = calculoExistente?.resultadoFinal || null;
        bensDoCalculo = JSON.parse(JSON.stringify(calculoExistente?.bens || []));
        instituidores = JSON.parse(JSON.stringify(calculoExistente?.dadosUsufruto?.instituidores || []));
        beneficiarios = JSON.parse(JSON.stringify(calculoExistente?.dadosUsufruto?.beneficiarios || []));
        isEditMode = startInEditMode;

        const hoje = new Date().toISOString().split('T')[0];
        const titulo = calculoExistente ? 'Editar Cálculo de Instituição de Usufruto' : 'Cálculo do ITCD - Instituição de Usufruto';

        const actionButtonsHtml = `
            <button id="btn-voltar-calculo-hub" class="btn-secondary btn-sm">Voltar</button>
            ${!isEditMode ? `<button id="btn-habilitar-edicao-instituicao" class="btn-primary btn-sm">Habilitar Edição</button>` : ''}
        `;

        const pageHtml = `
            <div id="itcd-calculo-instituicao-container" class="page-section max-w-none px-4 sm:px-6 lg:px-8">
                 <div class="flex justify-between items-center mb-6">
                    <div>
                        <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-100">${titulo}</h2>
                        <p class="text-sm text-gray-600 dark:text-gray-300">${isEditMode ? 'Preencha os dados para apurar o imposto.' : 'Modo de visualização.'}</p>
                    </div>
                    <div class="flex gap-2">${actionButtonsHtml}</div>
                </div>
                <div id="aviso-legislacao-instituicao" class="mb-4"></div>
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div class="lg:col-span-2 space-y-6">
                        <fieldset id="fieldset-instituicao-dados" class="section-box p-4 border dark:border-slate-700 rounded-lg">
                            <h3 class="text-lg font-medium mb-3">Dados da Operação</h3>
                            <div class="space-y-4">
                                <div>
                                    <label for="instituicao-declaracao" class="block text-sm font-medium">Nº da Declaração (opcional):</label>
                                    <input type="text" id="instituicao-declaracao" class="form-input-text mt-1 w-full md:w-1/2" placeholder="Número da DBD, se houver" value="${calculoExistente?.declaracaoNumero || ''}">
                                </div>
                                <div class="md:col-span-2 pt-2">
                                    <label class="block text-sm font-medium">A instituição foi efetivada?</label>
                                    <div class="flex items-center gap-4 mt-2">
                                        <label class="inline-flex items-center"><input type="radio" name="instituicao-efetivada" value="sim" class="form-radio" ${calculoExistente?.dadosUsufruto?.efetivada !== false ? 'checked' : ''}><span class="ml-1.5 text-sm">Sim</span></label>
                                        <label class="inline-flex items-center"><input type="radio" name="instituicao-efetivada" value="nao" class="form-radio" ${calculoExistente?.dadosUsufruto?.efetivada === false || !calculoExistente ? 'checked' : ''}><span class="ml-1.5 text-sm">Não</span></label>
                                    </div>
                                </div>
                                <div id="container-instituicao-efetivada-sim" class="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 hidden">
                                    <div>
                                        <label for="instituicao-data-fato-gerador" class="block text-sm font-medium">Data do Fato Gerador (ato/contrato):</label>
                                        <input type="date" id="instituicao-data-fato-gerador" class="form-input-text mt-1" value="${calculoExistente?.dataFatoGerador || hoje}">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium">Formalização da Instituição:</label>
                                        <div class="flex items-center gap-4 mt-2">
                                            <label class="inline-flex items-center"><input type="radio" name="instituicao-formalizacao" value="escritura" class="form-radio" ${calculoExistente?.dadosUsufruto?.formalizada === 'escritura' ? 'checked' : ''}><span class="ml-1.5 text-sm">Escritura Pública</span></label>
                                            <label class="inline-flex items-center"><input type="radio" name="instituicao-formalizacao" value="outros" class="form-radio" ${!calculoExistente || calculoExistente.dadosUsufruto?.formalizada !== 'escritura' ? 'checked' : ''}><span class="ml-1.5 text-sm">Demais Casos</span></label>
                                        </div>
                                    </div>
                                </div>
                                <div id="container-instituicao-efetivada-nao" class="md:col-span-2 hidden">
                                    <p class="text-sm p-3 bg-blue-50 dark:bg-blue-900/40 border-l-4 border-blue-500 rounded">A instituição não foi efetivada. O vencimento será no último dia útil do ano corrente.</p>
                                </div>
                            </div>
                        </fieldset>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <fieldset class="section-box p-4 border dark:border-slate-700 rounded-lg">
                                <div class="flex justify-between items-center mb-3"><h3 class="text-lg font-medium">Instituidor(es) (Nu-proprietário)</h3><button id="btn-adicionar-instituidor" class="btn-secondary btn-sm">Adicionar</button></div>
                                <div id="lista-instituidores" class="space-y-2"></div>
                            </fieldset>
                             <fieldset class="section-box p-4 border dark:border-slate-700 rounded-lg">
                                <div class="flex justify-between items-center mb-3"><h3 class="text-lg font-medium">Beneficiário(s) (Usufrutuário)</h3><button id="btn-adicionar-beneficiario" class="btn-secondary btn-sm">Adicionar</button></div>
                                <div id="lista-beneficiarios" class="space-y-2"></div>
                            </fieldset>
                        </div>
                        <fieldset class="section-box p-4 border dark:border-slate-700 rounded-lg">
                             <div class="flex justify-between items-center mb-3">
                                <h3 class="text-lg font-medium">Bens e Direitos Objeto do Usufruto</h3>
                                <div id="acoes-partilha-bens-instituicao" class="hidden flex items-center gap-2">
                                     <label class="inline-flex items-center text-sm">
                                        <input type="checkbox" id="selecionar-todos-bens-partilha-instituicao" class="form-checkbox h-4 w-4">
                                        <span class="ml-2">Todos</span>
                                    </label>
                                    <button id="btn-aplicar-partilha-igualitaria" class="btn-secondary btn-sm text-xs">Partilha Igualitária</button>
                                    <button id="btn-abrir-partilha-seletiva" class="btn-secondary btn-sm text-xs">Partilha Seletiva</button>
                                </div>
                                <button id="btn-adicionar-bem-instituicao" class="btn-secondary btn-sm">Adicionar Bem</button>
                            </div>
                            <div id="lista-bens-instituicao" class="space-y-3"></div>
                        </fieldset>
                    </div>
                    <div class="lg:col-span-1">
                        <fieldset id="fieldset-resultado-instituicao" class="section-box p-4 border dark:border-slate-700 rounded-lg sticky top-24">
                            <h3 class="text-lg font-medium mb-3">Resultado do Cálculo</h3>
                            <div class="mb-4 pb-4 border-b dark:border-slate-600 space-y-2 text-sm">
                                <div class="flex justify-between items-center"><span class="text-gray-600 dark:text-gray-400">Vencimento:</span><input type="date" id="instituicao-vencimento-display" class="form-input-text text-xs p-0.5 ml-2 flex-grow bg-gray-200 dark:bg-slate-700 w-auto" readonly></div>
                                <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Valor da UFEMG (Venc.):</span> <span id="instituicao-ufemg-vencimento-display" class="font-semibold">N/A</span></div>
                                <hr class="my-2 dark:border-slate-600">
                                <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Total Bens (100%):</span> <span id="resumo-total-bens-ufemg" class="font-semibold">0,0000</span></div>
                                <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Base de Cálculo Total (1/3 em UFEMG):</span> <span id="resumo-base-calculo-total-ufemg" class="font-semibold text-blue-600 dark:text-blue-400">0,0000</span></div>
                                <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Base de Cálculo Total (R$):</span> <span id="resumo-base-calculo-total-reais" class="font-semibold text-blue-600 dark:text-blue-400">R$ 0,00</span></div>
                            </div>
                            <div id="resultado-calculo-instituicao" class="space-y-4 text-sm"></div>
                            <div class="mt-4 pt-3 border-t dark:border-slate-600">
                                <label for="instituicao-data-pagamento" class="block text-sm font-medium">Data do Pagamento:</label>
                                <input type="date" id="instituicao-data-pagamento" class="form-input-text mt-1 text-sm" value="${calculoExistente?.dataPagamento || hoje}">
                            </div>
                            <button id="btn-executar-calculo-instituicao" class="btn-primary w-full mt-4">Calcular Imposto</button>
                            <button id="btn-salvar-calculo-instituicao" class="btn-primary w-full mt-2">Salvar Cálculo</button>
                        </fieldset>
                    </div>
                </div>
            </div>
        `;
        mainContentWrapperRef.innerHTML = pageHtml;
        addEventListeners();
        renderListaPessoas('instituidor');
        renderListaPessoas('beneficiario');
        renderListaBens();
        renderResultados(ultimoResultadoCalculado);
        verificarLegislacaoAplicavel();
        document.querySelector('input[name="instituicao-efetivada"]:checked')?.dispatchEvent(new Event('change'));
        toggleEditMode(isEditMode);
    }
    
    // ... (restante do código completo e integral)
    function renderListaPessoas(tipo) {
        const [lista, containerId, label] = tipo === 'instituidor' 
            ? [instituidores, 'lista-instituidores', 'instituidor'] 
            : [beneficiarios, 'lista-beneficiarios', 'beneficiário'];
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = lista.length > 0 ? lista.map(p => `
            <div class="pessoa-card card p-2 flex justify-between items-center" data-id="${p.id}">
                <p class="font-medium text-sm text-gray-800 dark:text-gray-100">${p.nome}</p>
                <button class="btn-link btn-excluir-pessoa text-xs text-red-500" data-tipo="${tipo}">Excluir</button>
            </div>`).join('') : `<p class="text-sm text-center text-gray-500 dark:text-gray-400 p-2">Nenhum ${label} adicionado.</p>`;
    }

    async function renderListaBens() {
        const container = document.getElementById('lista-bens-instituicao');
        const acoesPartilhaContainer = document.getElementById('acoes-partilha-bens-instituicao');
        if (!container) return;

        if (bensDoCalculo.length === 0) {
            container.innerHTML = '<p class="text-sm text-center text-gray-500 dark:text-gray-400 p-4">Nenhum bem adicionado.</p>';
            if(acoesPartilhaContainer) acoesPartilhaContainer.classList.add('hidden');
            await _atualizarDadosDependentes();
            return;
        }

        if(acoesPartilhaContainer) acoesPartilhaContainer.classList.remove('hidden');
        container.innerHTML = '';
        
        for (const bem of bensDoCalculo) {
            const card = document.createElement('div');
            card.className = `bem-card card p-3`;
            card.dataset.id = bem.id;

            const valorTotalBem = (bem.valor || 0) * ((bem.percentual || 100) / 100);
            
            // CORREÇÃO: Usa o ano da avaliação do bem para buscar a UFEMG para a exibição na lista
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
                        <input type="checkbox" id="bem-check-${bem.id}" class="form-checkbox h-4 w-4 mr-3 bem-selecao-checkbox" data-bem-id="${bem.id}">
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
        document.getElementById('btn-executar-calculo-instituicao').addEventListener('click', executarCalculo);
        document.getElementById('btn-salvar-calculo-instituicao').addEventListener('click', salvarCalculo);
        document.getElementById('btn-adicionar-instituidor').addEventListener('click', () => abrirModalPessoa('instituidor'));
        document.getElementById('btn-adicionar-beneficiario').addEventListener('click', () => abrirModalPessoa('beneficiario'));
        document.getElementById('btn-adicionar-bem-instituicao').addEventListener('click', () => abrirModalAdicionarBem());

        document.querySelectorAll('input[name="instituicao-efetivada"], input[name="instituicao-formalizacao"]').forEach(radio => radio.addEventListener('change', verificarLegislacaoAplicavel));
        
        const dataFatoGeradorInput = document.getElementById('instituicao-data-fato-gerador');
        if (dataFatoGeradorInput) {
            dataFatoGeradorInput.addEventListener('change', async () => {
                await verificarLegislacaoAplicavel();
                // A chamada para renderListaBens aqui foi removida para evitar o loop
            });
        }
        
        const habilitarBtn = document.getElementById('btn-habilitar-edicao-instituicao');
        if (habilitarBtn) habilitarBtn.addEventListener('click', () => toggleEditMode(true));
        
        const container = document.getElementById('itcd-calculo-instituicao-container');
        if (container) {
            container.addEventListener('click', e => {
                if (e.target.classList.contains('btn-excluir-pessoa')) {
                    const tipo = e.target.dataset.tipo;
                    const id = e.target.closest('.pessoa-card').dataset.id;
                    if (tipo === 'instituidor') instituidores = instituidores.filter(p => p.id !== id);
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
        const selecionarTodosCheckbox = document.getElementById('selecionar-todos-bens-partilha-instituicao');
        if (selecionarTodosCheckbox) {
            selecionarTodosCheckbox.addEventListener('change', (e) => {
                document.querySelectorAll('.bem-selecao-checkbox').forEach(checkbox => {
                    checkbox.checked = e.target.checked;
                });
            });
        }
    }

    function abrirModalPessoa(tipo) {
        const titulo = tipo === 'instituidor' ? 'Adicionar Instituidor' : 'Adicionar Beneficiário';
        const modalContent = `
            <form id="form-add-pessoa-instituicao" class="space-y-4">
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
                if (tipo === 'instituidor') instituidores.push(pessoa);
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
            <form id="form-add-bem-instituicao" class="space-y-4">
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
        const selectedBemIds = Array.from(document.querySelectorAll('#lista-bens-instituicao .bem-selecao-checkbox:checked')).map(cb => cb.dataset.bemId);
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
        const selectedBemIds = Array.from(document.querySelectorAll('#lista-bens-instituicao .bem-selecao-checkbox:checked')).map(cb => cb.dataset.bemId);
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

        const dataFatoGerador = document.getElementById('instituicao-data-fato-gerador').value;
        const dataPagamento = document.getElementById('instituicao-data-pagamento').value;
        
        const vencimento = document.getElementById('instituicao-vencimento-display').value;
        if (!vencimento) {
            uiModuleRef.showToastNotification("Data de vencimento não pôde ser calculada. Verifique os dados.", "error");
            return;
        }
        
        let resultadoFinal = { total: { impostoARecolher: 0 }, porBeneficiario: [] };
        let justificativasGlobais = new Set();
        
        const { resumo } = await _atualizarDadosDependentes();
        resultadoFinal.resumo = resumo;

        for (const beneficiario of beneficiarios) {
            let valorTotalBemEmReaisParaBeneficiario = 0;
            let valorTotalBemEmUfemgParaBeneficiario = 0;
            
            for (const bem of bensDoCalculo) {
                const percentualRecebido = (bem.partilha?.[beneficiario.id] || 0) / 100;
                if (percentualRecebido > 0) {
                    const valorBaseReais = (bem.valor || 0) * (bem.percentual / 100);
                    valorTotalBemEmReaisParaBeneficiario += valorBaseReais * percentualRecebido;
                    
                    const anoAvaliacao = new Date(bem.dataAvaliacao).getFullYear();
                    const ufemgAnoAvaliacao = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(anoAvaliacao);
                    if(ufemgAnoAvaliacao > 0) {
                        valorTotalBemEmUfemgParaBeneficiario += (valorBaseReais / ufemgAnoAvaliacao) * percentualRecebido;
                    }
                }
            }
            
            const baseCalculoUfemgBeneficiario = valorTotalBemEmUfemgParaBeneficiario * FATOR_INSTITUICAO;
            const baseCalculoReaisBeneficiario = valorTotalBemEmReaisParaBeneficiario * FATOR_INSTITUICAO;

            if(baseCalculoReaisBeneficiario > 0) {
                const moduloCalculo = getModuloCalculoPorData(dataFatoGerador);
                if (!moduloCalculo) continue;
                
                const dadosParaCalculo = {
                    baseCalculoReais: baseCalculoReaisBeneficiario,
                    baseCalculoUfemg: baseCalculoUfemgBeneficiario,
                    dataFatoGerador, dataPagamento, vencimento,
                    recolhimentoPrevio: { houve: false },
                    justificativas: [],
                    tipoDoacao: true, 
                    herdeiros: beneficiarios,
                    valorUfemgDoVencimento: resumo.valorUfemgDoVencimento,
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
        const container = document.getElementById('resultado-calculo-instituicao');
        const resumoTotalBensEl = document.getElementById('resumo-total-bens-ufemg');
        const resumoBaseTotalUfemgEl = document.getElementById('resumo-base-calculo-total-ufemg');
        const resumoBaseTotalReaisEl = document.getElementById('resumo-base-calculo-total-reais');
        
        if (!container) return;
        if (!resultado) {
            container.innerHTML = '<p class="text-sm text-center text-gray-500">Aguardando cálculo...</p>';
            return;
        }

        if(resultado.resumo) {
            resumoTotalBensEl.textContent = formatUFEMG(resultado.resumo.totalBensUfemg);
            resumoBaseTotalUfemgEl.textContent = formatUFEMG(resultado.resumo.baseCalculoTotalUfemg);
            resumoBaseTotalReaisEl.textContent = formatBRL(resultado.resumo.baseCalculoTotalReais);
        }

        if(resultado.erros) {
            container.innerHTML = `<p class="feedback-message warning">${resultado.erros[0]}</p>`;
            return;
        }
        
        let html = '<div class="space-y-4">';
        resultado.porBeneficiario.forEach(res => {
            const { valores, nome } = res;
            if (valores) {
                html += `
                    <div class="p-2 border rounded-md dark:border-slate-600">
                        <p class="font-semibold text-sm mb-1">${nome}</p>
                        <div class="space-y-1 text-xs">
                            <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Base (UFEMG):</span> <span>${formatUFEMG(valores.baseCalculoUfemg)}</span></div>
                            <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Base (R$):</span> <span>${formatBRL(valores.baseCalculoReais)}</span></div>
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
        container.innerHTML = html;
    }
    
    async function salvarCalculo() {
        if (!ultimoResultadoCalculado) { uiModuleRef.showToastNotification("Execute o cálculo antes de salvar.", "warning"); return; }
        if (!dbRef) { uiModuleRef.showToastNotification("Erro de conexão com o banco de dados.", "error"); return; }
        
        const insts = instituidores.map(i => i.nome).join(', ');
        const benefs = beneficiarios.map(b => b.nome).join(', ');
        const efetivada = document.querySelector('input[name="instituicao-efetivada"]:checked')?.value === 'sim';

        const calculoData = {
            id: calculoAtualId || appModuleRef.generateUUID(),
            tipoCalculo: 'usufruto_instituicao',
            deCujusNome: `Usufruto de ${insts || 'N/A'} para ${benefs || 'N/A'}`,
            declaracaoNumero: document.getElementById('instituicao-declaracao').value,
            dataFatoGerador: efetivada ? document.getElementById('instituicao-data-fato-gerador').value : null,
            dataPagamento: document.getElementById('instituicao-data-pagamento').value,
            bens: bensDoCalculo,
            dadosUsufruto: {
                instituidores: instituidores,
                beneficiarios: beneficiarios,
                efetivada: efetivada,
                formalizada: efetivada ? document.querySelector('input[name="instituicao-formalizacao"]:checked')?.value : null
            },
            dataSalvamento: new Date().toISOString(),
            resultadoFinal: ultimoResultadoCalculado
        };
        
        try {
            await dbRef.updateItem(dbRef.STORES.ITCD_CALCULOS, calculoData);
            calculoAtualId = calculoData.id;
            uiModuleRef.showToastNotification(`Cálculo de instituição de usufruto salvo com sucesso!`, "success");
            appModuleRef.handleMenuAction('itcd-visualizar-calculo', { calculoId: calculoData.id });
        } catch(e) {
            uiModuleRef.showToastNotification(`Falha ao salvar cálculo: ${e.message}`, "error");
        }
    }
    
    async function verificarLegislacaoAplicavel() {
        const efetivada = document.querySelector('input[name="instituicao-efetivada"]:checked')?.value === 'sim';
        const formalizacao = document.querySelector('input[name="instituicao-formalizacao"]')?.value;
        const dataFatoGeradorInput = document.getElementById('instituicao-data-fato-gerador');
        const dataFatoGerador = dataFatoGeradorInput?.value || null;

        document.getElementById('container-instituicao-efetivada-sim').classList.toggle('hidden', !efetivada);
        document.getElementById('container-instituicao-efetivada-nao').classList.toggle('hidden', efetivada);

        const avisoEl = document.getElementById('aviso-legislacao-instituicao');
        const vencimentoInput = document.getElementById('instituicao-vencimento-display');
        const ufemgDisplay = document.getElementById('instituicao-ufemg-vencimento-display');
        
        avisoEl.innerHTML = '';
        vencimentoInput.value = '';
        ufemgDisplay.textContent = 'N/A';
        
        let dataBaseParaCalculo;

        if (efetivada) {
            if(!dataFatoGerador) return;
            dataBaseParaCalculo = dataFatoGerador;
        } else {
            dataBaseParaCalculo = new Date().toISOString().split('T')[0];
        }
        
        const modulo = getModuloCalculoPorData(dataBaseParaCalculo);
        avisoEl.innerHTML = `<p class="text-sm text-blue-600 dark:text-blue-400 font-semibold">Legislação Aplicável: ${modulo?.name || 'Não definida'}</p>`;
        
        let dataVencimentoObj;
        if(efetivada) {
            dataVencimentoObj = new Date(dataFatoGerador + "T00:00:00");
            if(formalizacao === 'outros'){
                 dataVencimentoObj.setDate(dataVencimentoObj.getDate() + 15);
            }
        } else {
            const anoCorrente = new Date().getFullYear();
            dataVencimentoObj = new Date(anoCorrente, 11, 31);
        }
        vencimentoInput.value = dataVencimentoObj.toISOString().split('T')[0];
        const valorUfemg = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(dataVencimentoObj.getFullYear());
        ufemgDisplay.textContent = valorUfemg > 0 ? formatUFEMG(valorUfemg) : 'N/A';
    }

    async function _atualizarDadosDependentes() {
        const { vencimento, valorUfemgDoVencimento } = await _atualizarValoresVencimento();

        let totalBensUfemg = 0;
        for (const bem of bensDoCalculo) {
            const valorConsiderado = (bem.valor || 0) * (bem.percentual / 100);
            const anoAvaliacao = bem.dataAvaliacao ? new Date(bem.dataAvaliacao).getFullYear() : new Date().getFullYear();
            const ufemgAnoAvaliacao = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(anoAvaliacao);
            if (ufemgAnoAvaliacao > 0) {
                totalBensUfemg += valorConsiderado / ufemgAnoAvaliacao;
            }
        }

        const baseCalculoTotalUfemg = totalBensUfemg * FATOR_INSTITUICAO;
        const baseCalculoTotalReais = baseCalculoTotalUfemg * valorUfemgDoVencimento;

        document.getElementById('resumo-total-bens-ufemg').textContent = formatUFEMG(totalBensUfemg);
        document.getElementById('resumo-base-calculo-total-ufemg').textContent = formatUFEMG(baseCalculoTotalUfemg);
        document.getElementById('resumo-base-calculo-total-reais').textContent = formatBRL(baseCalculoTotalReais);
        
        return { vencimento, valorUfemgDoVencimento, resumo: { totalBensUfemg, baseCalculoTotalUfemg, baseCalculoTotalReais, valorUfemgDoVencimento } };
    }
    
    async function _atualizarValoresVencimento() {
        await verificarLegislacaoAplicavel();
        const vencimentoInput = document.getElementById('instituicao-vencimento-display');
        const ufemgDisplay = document.getElementById('instituicao-ufemg-vencimento-display');
        
        const vencimento = vencimentoInput.value;
        const valorUfemgDoVencimento = parseFloat(ufemgDisplay.textContent.replace(/\./g, '').replace(',', '.')) || 0;
        
        return { vencimento, valorUfemgDoVencimento };
    }


    return {
        init,
        renderForm
    };

})();