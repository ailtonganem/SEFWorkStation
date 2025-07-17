// js/itcd/calculo/excedenteMeacao.js - Módulo para Cálculo do ITCD sobre Excedente de Meação
// v3.4.0 - ADICIONADO: Cálculo e abatimento proporcional para bens localizados fora de MG. ADICIONADO: Exibição da base de cálculo em UFEMG no resultado final.
// v3.3.0 - CORRIGIDO: Vencimento do imposto é definido para o último dia do ano corrente quando não há fato gerador informado.
// v3.2.1 - CORRIGIDO: Cálculo do excedente em `_atualizarResumo` agora considera ambos os cônjuges para determinar o valor excedente, em vez de fixar no Cônjuge 1.
// v3.2.0 - CORRIGIDO: Refatorada a lógica de cálculo de vencimento em `_atualizarDadosDependentes` para usar comparação de objetos em vez de strings, garantindo a correta apuração do vencimento e UFEMG.
// v3.1.0 - CORRIGIDO: Recálculo do vencimento e UFEMG. Adicionado campo de declaração e exibição de UFEMG por bem.
// v3.0.0 - REATORADO: Implementa lógica de fato gerador (ou ausência dele), cálculo de vencimento dinâmico por legislação, e UI aprimorada para partilha e totais em UFEMG.
// ... (histórico anterior)

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ITCD = window.SEFWorkStation.ITCD || {};
window.SEFWorkStation.ITCD.Calculo = window.SEFWorkStation.ITCD.Calculo || {};

window.SEFWorkStation.ITCD.Calculo.ExcedenteMeacao = (function() {

    let mainContentWrapperRef;
    let appModuleRef;
    let uiModuleRef;
    let dbRef;

    let ultimoResultadoCalculado = null;
    let calculoAtualId = null;
    let isEditMode = true;
    let bensDoCalculo = [];

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

    function formatUFEMG(value) {
        if (isNaN(value) || value === null) return '0,0000';
        return value.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    }

    function getModuloCalculoPorData(data) {
        if (!data) return getModuloCalculoPorData(new Date().toISOString().split('T')[0]); // Legislação corrente
        if (data >= '2007-12-29') return window.SEFWorkStation.ITCD.Calculo.Legislacao.Lei14941_03_apos2008;
        if (data >= '2004-03-29') return window.SEFWorkStation.ITCD.Calculo.Legislacao.Lei14941_03_ate2007;
        if (data >= '1997-01-01') return window.SEFWorkStation.ITCD.Calculo.Legislacao.Lei12426_96;
        if (data >= '1989-03-01') return window.SEFWorkStation.ITCD.Calculo.Legislacao.Lei9752_89;
        if (data >= '1976-01-01') return window.SEFWorkStation.ITCD.Calculo.Legislacao.Lei6763_75;
        return null;
    }
    
    function toggleEditModeExcedente(enable) {
        isEditMode = enable;
        const fieldsets = document.querySelectorAll('#itcd-calculo-excedente-meacao-container fieldset');
        fieldsets.forEach(fs => { fs.disabled = !enable; });

        document.getElementById('btn-habilitar-edicao-excedente')?.classList.toggle('hidden', enable);
        document.getElementById('btn-salvar-calculo-excedente')?.classList.toggle('hidden', !enable);
        const helpText = document.querySelector('#itcd-calculo-excedente-meacao-container .text-sm.text-gray-600');
        if (helpText) helpText.textContent = enable ? 'Preencha os dados para apurar o imposto.' : 'Modo de visualização.';
    }

    function renderFormExcedenteMeacao(calculoExistente = null, startInEditMode = true) {
        calculoAtualId = calculoExistente?.id || null;
        ultimoResultadoCalculado = calculoExistente?.resultadoFinal || null;
        bensDoCalculo = JSON.parse(JSON.stringify(calculoExistente?.bens || []));
        isEditMode = startInEditMode;

        const hoje = new Date().toISOString().split('T')[0];
        const titulo = calculoExistente ? 'Editar Cálculo de Excedente de Meação' : 'Cálculo do ITCD - Excedente de Meação';

        const actionButtonsHtml = `
            <button id="btn-voltar-calculo-hub" class="btn-secondary btn-sm">Voltar</button>
            ${!isEditMode ? `<button id="btn-habilitar-edicao-excedente" class="btn-primary btn-sm">Habilitar Edição</button>` : ''}
        `;
        
        const pageHtml = `
            <div id="itcd-calculo-excedente-meacao-container" class="page-section max-w-none px-4 sm:px-6 lg:px-8">
                 <div class="flex justify-between items-center mb-6">
                    <div>
                        <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-100">${titulo}</h2>
                        <p class="text-sm text-gray-600 dark:text-gray-300">${isEditMode ? 'Preencha os dados para apurar o imposto.' : 'Modo de visualização.'}</p>
                    </div>
                    <div class="flex gap-2">${actionButtonsHtml}</div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div class="lg:col-span-2 space-y-6">
                        <fieldset id="fieldset-excedente-dados" class="section-box p-4 border dark:border-slate-700 rounded-lg">
                            <h3 class="text-lg font-medium mb-3">Dados da Partilha</h3>
                            <div class="space-y-4">
                                <div>
                                    <label for="exm-declaracao" class="block text-sm font-medium">Nº da Declaração (opcional):</label>
                                    <input type="text" id="exm-declaracao" class="form-input-text mt-1" placeholder="Número da DBD, se houver" value="${calculoExistente?.declaracaoNumero || ''}">
                                </div>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div>
                                        <label class="block text-sm font-medium">Houve o fato gerador (partilha/ato)?</label>
                                        <div class="flex items-center gap-4 mt-2">
                                            <label class="inline-flex items-center"><input type="radio" name="exm-tem-fato-gerador" value="sim" class="form-radio" ${calculoExistente?.dataFatoGerador ? 'checked' : ''}><span class="ml-1.5 text-sm">Sim</span></label>
                                            <label class="inline-flex items-center"><input type="radio" name="exm-tem-fato-gerador" value="nao" class="form-radio" ${!calculoExistente || !calculoExistente.dataFatoGerador ? 'checked' : ''}><span class="ml-1.5 text-sm">Não</span></label>
                                        </div>
                                    </div>
                                    <div id="container-exm-fato-gerador-data" class="hidden">
                                        <label for="exm-fato-gerador" class="block text-sm font-medium">Data do Fato Gerador:</label>
                                        <input type="date" id="exm-fato-gerador" class="form-input-text mt-1" value="${calculoExistente?.dataFatoGerador || ''}">
                                    </div>
                                </div>
                                <div id="display-legislacao-aplicavel" class="text-xs text-blue-600 dark:text-blue-400 font-semibold"></div>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label for="exm-conjuge1" class="block text-sm font-medium">Cônjuge 1 (Favorecido):</label>
                                        <input type="text" id="exm-conjuge1" class="form-input-text mt-1" placeholder="Nome do cônjuge que recebeu o excedente" value="${calculoExistente?.dadosPartilha?.conjuge1 || ''}">
                                    </div>
                                    <div>
                                        <label for="exm-conjuge2" class="block text-sm font-medium">Cônjuge 2:</label>
                                        <input type="text" id="exm-conjuge2" class="form-input-text mt-1" placeholder="Nome do outro cônjuge" value="${calculoExistente?.dadosPartilha?.conjuge2 || ''}">
                                    </div>
                                </div>
                                <div>
                                    <label for="exm-regime-casamento" class="block text-sm font-medium">Regime de Casamento:</label>
                                    <select id="exm-regime-casamento" class="form-input-text mt-1">
                                        <option value="comunhao_parcial" ${calculoExistente?.dadosPartilha?.regimeBens === 'comunhao_parcial' ? 'selected' : ''}>Comunhão Parcial de Bens</option>
                                        <option value="comunhao_universal" ${calculoExistente?.dadosPartilha?.regimeBens === 'comunhao_universal' ? 'selected' : ''}>Comunhão Universal de Bens</option>
                                        <option value="separacao_convencional" ${calculoExistente?.dadosPartilha?.regimeBens === 'separacao_convencional' ? 'selected' : ''}>Separação Convencional de Bens</option>
                                        <option value="separacao_obrigatoria" ${calculoExistente?.dadosPartilha?.regimeBens === 'separacao_obrigatoria' ? 'selected' : ''}>Separação Obrigatória de Bens</option>
                                        <option value="participacao_final_aquestos" ${calculoExistente?.dadosPartilha?.regimeBens === 'participacao_final_aquestos' ? 'selected' : ''}>Participação Final nos Aquestos</option>
                                        <option value="uniao_estavel_cc1790" ${calculoExistente?.dadosPartilha?.regimeBens === 'uniao_estavel_cc1790' ? 'selected' : ''}>União Estável (Art. 1.790 CC)</option>
                                    </select>
                                </div>
                            </div>
                        </fieldset>

                        <fieldset id="fieldset-excedente-bens" class="section-box p-4 border dark:border-slate-700 rounded-lg">
                             <div class="flex justify-between items-center mb-3">
                                <h3 class="text-lg font-medium">Bens e Direitos a Partilhar</h3>
                                <button id="btn-adicionar-bem-excedente" class="btn-secondary btn-sm">Adicionar Bem</button>
                            </div>
                            <div class="flex justify-between items-center mb-4 border-t pt-3 dark:border-slate-600">
                                <div id="total-avaliado-container" class="text-sm">
                                    <span class="font-semibold">Total Avaliado:</span> 
                                    <span id="total-avaliado-reais" class="font-bold text-gray-800 dark:text-gray-100">R$ 0,00</span>
                                    <span id="total-avaliado-ufemg" class="ml-2 text-blue-600 dark:text-blue-400"></span>
                                </div>
                                <div id="acoes-partilha-bens" class="hidden flex items-center gap-2">
                                    <label class="inline-flex items-center text-sm">
                                        <input type="checkbox" id="selecionar-todos-bens-partilha" class="form-checkbox h-4 w-4">
                                        <span class="ml-2">Todos</span>
                                    </label>
                                    <button id="btn-aplicar-partilha-igualitaria" class="btn-secondary btn-sm text-xs">Partilha Igualitária</button>
                                    <button id="btn-abrir-partilha-seletiva" class="btn-secondary btn-sm text-xs">Partilha Seletiva</button>
                                </div>
                            </div>
                            <div id="lista-bens-excedente" class="space-y-3"></div>
                        </fieldset>
                    </div>

                    <div class="lg:col-span-1">
                         <fieldset id="fieldset-excedente-resultado" class="section-box p-4 border dark:border-slate-700 rounded-lg sticky top-24">
                            <h3 class="text-lg font-medium mb-3">Resumo da Partilha e Cálculo</h3>
                            <div id="resumo-partilha" class="space-y-2 text-sm mb-4 pb-4 border-b dark:border-slate-600">
                                <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Vencimento do Imposto:</span> <span id="resumo-vencimento" class="font-semibold">N/A</span></div>
                                <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Valor da UFEMG (Venc.):</span> <span id="resumo-ufemg-vencimento" class="font-semibold">N/A</span></div>
                                <hr class="my-1 dark:border-slate-600">
                                <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Total Bens Comuns (UFEMG):</span> <span id="resumo-total-comuns" class="font-semibold">0,0000</span></div>
                                <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Total Particulares C1 (UFEMG):</span> <span id="resumo-total-part1" class="font-semibold">0,0000</span></div>
                                <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Total Particulares C2 (UFEMG):</span> <span id="resumo-total-part2" class="font-semibold">0,0000</span></div>
                                <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Bens Fora de MG (UFEMG):</span> <span id="resumo-bens-fora-mg" class="font-semibold text-yellow-600 dark:text-yellow-400">0,0000</span></div>
                                <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">% Bens Fora de MG:</span> <span id="resumo-percentual-fora-mg" class="font-semibold text-yellow-600 dark:text-yellow-400">0,00%</span></div>
                                <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Meação (UFEMG):</span> <span id="resumo-meacao" class="font-semibold">0,0000</span></div>
                                <hr class="my-1 dark:border-slate-600">
                                <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Quinhão Devido C1 (UFEMG):</span> <span id="resumo-quinhao-devido1" class="font-semibold">0,0000</span></div>
                                <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Quinhão Devido C2 (UFEMG):</span> <span id="resumo-quinhao-devido2" class="font-semibold">0,0000</span></div>
                                <hr class="my-1 dark:border-slate-600">
                                <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Total Recebido C1 (UFEMG):</span> <span id="resumo-total-recebido1" class="font-semibold">0,0000</span></div>
                                <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Total Recebido C2 (UFEMG):</span> <span id="resumo-total-recebido2" class="font-semibold">0,0000</span></div>
                                <hr class="my-1 dark:border-slate-600">
                                <div class="flex justify-between font-bold text-lg"><span class="dark:text-gray-200">Excedente (UFEMG):</span> <span id="resumo-excedente" class="text-blue-600 dark:text-blue-400">0,0000</span></div>
                            </div>

                            <div id="resultado-calculo-excedente" class="space-y-2 text-sm"></div>
                            
                             <div class="mt-4 pt-3 border-t dark:border-slate-600">
                                <label for="exm-data-pagamento" class="block text-sm font-medium">Data do Pagamento:</label>
                                <input type="date" id="exm-data-pagamento" class="form-input-text mt-1 text-sm" value="${calculoExistente?.dataPagamento || hoje}">
                            </div>
                            <button id="btn-executar-calculo-excedente" class="btn-primary w-full mt-4">Calcular Imposto</button>
                            <button id="btn-salvar-calculo-excedente" class="btn-primary w-full mt-2">Salvar Cálculo</button>
                        </fieldset>
                    </div>
                </div>
            </div>
        `;
        mainContentWrapperRef.innerHTML = pageHtml;
        addEventListenersExcedente();
        renderListaBens();
        _atualizarDadosDependentes();
        renderResultadosExcedente(ultimoResultadoCalculado);
        toggleEditModeExcedente(isEditMode);
        document.querySelector('input[name="exm-tem-fato-gerador"]:checked')?.dispatchEvent(new Event('change'));
    }
    
    function addEventListenersExcedente() {
        document.getElementById('btn-voltar-calculo-hub')?.addEventListener('click', () => appModuleRef.handleMenuAction('itcd-calculo-hub'));
        document.getElementById('btn-adicionar-bem-excedente')?.addEventListener('click', () => _abrirModalAdicionarBem());
        document.getElementById('btn-executar-calculo-excedente')?.addEventListener('click', executarCalculoExcedente);
        document.getElementById('btn-salvar-calculo-excedente')?.addEventListener('click', salvarCalculoExcedente);
        document.getElementById('btn-aplicar-partilha-igualitaria')?.addEventListener('click', _handleAplicarPartilhaIgualitaria);
        document.getElementById('btn-abrir-partilha-seletiva')?.addEventListener('click', _abrirModalPartilhaSeletiva);

        document.querySelectorAll('input[name="exm-tem-fato-gerador"]').forEach(radio => {
            radio.addEventListener('change', _atualizarDadosDependentes);
        });
        
        document.getElementById('exm-fato-gerador')?.addEventListener('change', _atualizarDadosDependentes);
        document.getElementById('exm-regime-casamento')?.addEventListener('change', _atualizarDadosDependentes);
        
        document.getElementById('lista-bens-excedente')?.addEventListener('click', e => {
            const bemId = e.target.closest('.bem-excedente-card')?.dataset.id;
            if(!bemId) return;

            if (e.target.classList.contains('btn-excluir-bem-excedente')) {
                bensDoCalculo = bensDoCalculo.filter(b => b.id !== bemId);
                renderListaBens();
            }
            if (e.target.classList.contains('btn-editar-bem-excedente')) {
                const bem = bensDoCalculo.find(b => b.id === bemId);
                if (bem) _abrirModalAdicionarBem(bem);
            }
        });

        document.getElementById('lista-bens-excedente')?.addEventListener('input', e => {
            if (e.target.classList.contains('partilha-input')) {
                const bemId = e.target.dataset.bemId;
                const conjuge = e.target.dataset.conjuge;
                const bem = bensDoCalculo.find(b => b.id === bemId);
                const outroConjugeInput = e.target.closest('.grid').querySelector(`.partilha-input[data-conjuge="${conjuge === 'partilha1' ? 'partilha2' : 'partilha1'}"]`);
                
                if (bem) {
                    let valor = parseFloat(e.target.value) || 0;
                    if (valor < 0) valor = 0;
                    if (valor > 100) valor = 100;
                    
                    e.target.value = valor;
                    bem[conjuge] = valor;
                    
                    if (outroConjugeInput) {
                        const valorOutro = 100 - valor;
                        outroConjugeInput.value = valorOutro;
                        bem[conjuge === 'partilha1' ? 'partilha2' : 'partilha1'] = valorOutro;
                    }
                    _atualizarResumo();
                }
            }
        });
        
        const habilitarBtn = document.getElementById('btn-habilitar-edicao-excedente');
        if (habilitarBtn) habilitarBtn.addEventListener('click', () => toggleEditModeExcedente(true));

        const selecionarTodosCheckbox = document.getElementById('selecionar-todos-bens-partilha');
        if (selecionarTodosCheckbox) {
            selecionarTodosCheckbox.addEventListener('change', (e) => {
                document.querySelectorAll('#lista-bens-excedente .bem-selecao-checkbox').forEach(checkbox => {
                    checkbox.checked = e.target.checked;
                });
            });
        }
    }
    
    function _abrirModalAdicionarBem(bemExistente = null) {
        const isEditing = bemExistente !== null;
        const titulo = isEditing ? 'Editar Bem a Partilhar' : 'Adicionar Bem a Partilhar';
        const hoje = new Date().toISOString().split('T')[0];

        const modalContent = `
            <form id="form-add-bem-excedente" class="space-y-4">
                <input type="hidden" id="bem-id-modal" value="${bemExistente?.id || ''}">
                <div>
                    <label for="bem-descricao-modal" class="block text-sm font-medium">Descrição do Bem:</label>
                    <input type="text" id="bem-descricao-modal" class="form-input-text mt-1" placeholder="Ex: Imóvel matrícula 123, Veículo Placa ABC-1234" value="${bemExistente?.descricao || ''}">
                </div>
                <div>
                    <label for="bem-valor-modal" class="block text-sm font-medium">Valor de Mercado:</label>
                    <input type="text" id="bem-valor-modal" class="form-input-text mt-1 currency-input" value="${formatBRL(bemExistente?.valor || 0)}">
                </div>
                <div>
                    <label for="bem-percentual-modal" class="block text-sm font-medium">% do Bem na Partilha:</label>
                    <input type="number" id="bem-percentual-modal" class="form-input-text mt-1" value="${bemExistente?.percentual || 100}" min="0" max="100" step="0.01">
                </div>
                <div>
                    <label for="bem-data-avaliacao-modal" class="block text-sm font-medium">Data da Avaliação:</label>
                    <input type="date" id="bem-data-avaliacao-modal" class="form-input-text mt-1" value="${bemExistente?.dataAvaliacao || hoje}">
                </div>
                <div>
                    <label for="bem-natureza-modal" class="block text-sm font-medium">Natureza do Bem:</label>
                    <select id="bem-natureza-modal" class="form-input-text mt-1">
                        <option value="comum" ${bemExistente?.natureza === 'comum' ? 'selected' : ''}>Comum (do casal)</option>
                        <option value="particular1" ${bemExistente?.natureza === 'particular1' ? 'selected' : ''}>Particular do Cônjuge 1</option>
                        <option value="particular2" ${bemExistente?.natureza === 'particular2' ? 'selected' : ''}>Particular do Cônjuge 2</option>
                    </select>
                </div>
                <div>
                    <label class="inline-flex items-center">
                         <input type="checkbox" id="bem-localizacao-modal" class="form-checkbox h-4 w-4" ${bemExistente?.foraDeMG ? 'checked' : ''}>
                         <span class="ml-2 text-sm">Localizado Fora de MG?</span>
                    </label>
                </div>
            </form>
        `;
        uiModuleRef.showModal(titulo, modalContent, [
            { text: "Cancelar", closesModal: true, class: "btn-secondary" },
            { text: isEditing ? "Salvar Alterações" : "Adicionar Bem", class: "btn-primary", callback: () => {
                const id = document.getElementById('bem-id-modal').value;
                const bemData = {
                    descricao: document.getElementById('bem-descricao-modal').value.trim(),
                    valor: parseFromBRL(document.getElementById('bem-valor-modal').value),
                    natureza: document.getElementById('bem-natureza-modal').value,
                    percentual: parseFloat(document.getElementById('bem-percentual-modal').value) || 100,
                    dataAvaliacao: document.getElementById('bem-data-avaliacao-modal').value,
                    foraDeMG: document.getElementById('bem-localizacao-modal').checked
                };
                
                if(!bemData.descricao || bemData.valor <= 0 || !bemData.dataAvaliacao) {
                    uiModuleRef.showToastNotification("Descrição, Valor e Data da Avaliação são obrigatórios.", "warning");
                    return false;
                }

                if (isEditing) {
                    const index = bensDoCalculo.findIndex(b => b.id === id);
                    if (index > -1) {
                        bensDoCalculo[index] = { ...bensDoCalculo[index], ...bemData };
                    }
                } else {
                    bensDoCalculo.push({
                        id: `bem_${Date.now()}`, ...bemData, partilha1: 0, partilha2: 0
                    });
                }
                renderListaBens();
                _atualizarResumo();
                return true;
            }}
        ]);
        
        document.querySelectorAll('#form-add-bem-excedente .currency-input').forEach(input => {
             input.addEventListener('blur', e => { e.target.value = formatBRL(parseFromBRL(e.target.value)); });
        });
    }

    async function renderListaBens() {
        const container = document.getElementById('lista-bens-excedente');
        const acoesPartilhaContainer = document.getElementById('acoes-partilha-bens');
        
        if (!container) return;
        
        if (bensDoCalculo.length === 0) {
            container.innerHTML = '<p class="text-sm text-center text-gray-500 dark:text-gray-400 p-4">Nenhum bem adicionado.</p>';
            if(acoesPartilhaContainer) acoesPartilhaContainer.classList.add('hidden');
            await _atualizarResumo();
            return;
        }

        if(acoesPartilhaContainer) acoesPartilhaContainer.classList.remove('hidden');
        container.innerHTML = '';
        for (const bem of bensDoCalculo) {
            const card = document.createElement('div');
            card.className = 'bem-excedente-card card p-3';
            card.dataset.id = bem.id;
            
            const valorConsiderado = bem.valor * (bem.percentual / 100);
            const anoAvaliacao = bem.dataAvaliacao ? new Date(bem.dataAvaliacao).getFullYear() : new Date().getFullYear();
            const valorUfemgAno = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(anoAvaliacao);
            const valorEmUfemg = valorUfemgAno > 0 ? (valorConsiderado / valorUfemgAno) : 0;
            const ufemgDisplay = valorEmUfemg > 0 ? `<span class="text-xs text-gray-500 dark:text-gray-400">(${formatUFEMG(valorEmUfemg)} UFEMG/${anoAvaliacao})</span>` : '';

            card.innerHTML = `
                <div class="flex justify-between items-start">
                     <div class="flex items-center">
                         <input type="checkbox" class="form-checkbox h-4 w-4 mr-3 bem-selecao-checkbox" data-bem-id="${bem.id}">
                        <div>
                            <p class="font-semibold text-gray-800 dark:text-gray-100">${bem.descricao}</p>
                            <p class="text-xs text-gray-600 dark:text-gray-400">
                                Valor: ${formatBRL(bem.valor)} (${bem.percentual}%) | Natureza: ${bem.natureza} ${ufemgDisplay}
                                ${bem.foraDeMG ? '<span class="ml-2 font-bold text-yellow-600 dark:text-yellow-400">[FORA DE MG]</span>' : ''}
                            </p>
                        </div>
                    </div>
                    <div class="space-x-2">
                        <button class="btn-link btn-editar-bem-excedente text-xs text-blue-600">Editar</button>
                        <button class="btn-link btn-excluir-bem-excedente text-xs text-red-500">Excluir</button>
                    </div>
                </div>
                <div class="mt-2 grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-medium">Partilha Cônjuge 1 (%):</label>
                        <input type="number" class="form-input-text text-sm partilha-input" data-bem-id="${bem.id}" data-conjuge="partilha1" value="${bem.partilha1}" min="0" max="100">
                    </div>
                    <div>
                        <label class="block text-xs font-medium">Partilha Cônjuge 2 (%):</label>
                        <input type="number" class="form-input-text text-sm partilha-input" data-bem-id="${bem.id}" data-conjuge="partilha2" value="${bem.partilha2}" min="0" max="100">
                    </div>
                </div>
            `;
            container.appendChild(card);
        }
        await _atualizarResumo();
    }

    async function _atualizarDadosDependentes() {
        const temFatoGerador = document.querySelector('input[name="exm-tem-fato-gerador"]:checked')?.value === 'sim';
        document.getElementById('container-exm-fato-gerador-data').classList.toggle('hidden', !temFatoGerador);
        
        const dataFatoGerador = temFatoGerador ? document.getElementById('exm-fato-gerador').value : null;
        
        const displayLegislacao = document.getElementById('display-legislacao-aplicavel');
        const displayVencimento = document.getElementById('resumo-vencimento');
        const displayUfemgVencimento = document.getElementById('resumo-ufemg-vencimento');

        displayVencimento.textContent = 'N/A';
        displayUfemgVencimento.textContent = 'N/A';
        displayLegislacao.textContent = '';
        
        let vencimento = null;
        let valorUfemgDoVencimento = 0;

        if (temFatoGerador && dataFatoGerador) {
            const modulo = getModuloCalculoPorData(dataFatoGerador);
            displayLegislacao.textContent = `Legislação Aplicável: ${modulo?.name || 'Não definida'}`;
            
            let vencimentoObj;
            const fgDate = new Date(dataFatoGerador + 'T00:00:00');

            if (modulo === window.SEFWorkStation.ITCD.Calculo.Legislacao.Lei14941_03_apos2008) {
                fgDate.setDate(fgDate.getDate() + 30);
                vencimentoObj = fgDate;
            } else if (modulo === window.SEFWorkStation.ITCD.Calculo.Legislacao.Lei14941_03_ate2007 || modulo === window.SEFWorkStation.ITCD.Calculo.Legislacao.Lei12426_96) {
                fgDate.setDate(fgDate.getDate() + 15);
                vencimentoObj = fgDate;
            } else if (modulo === window.SEFWorkStation.ITCD.Calculo.Legislacao.Lei9752_89) {
                vencimentoObj = fgDate;
            } else if (modulo === window.SEFWorkStation.ITCD.Calculo.Legislacao.Lei6763_75) {
                fgDate.setDate(fgDate.getDate() + 30);
                vencimentoObj = fgDate;
            }
            if (vencimentoObj) {
                vencimento = vencimentoObj.toISOString().split('T')[0];
                displayVencimento.textContent = vencimentoObj.toLocaleDateString('pt-BR');
                valorUfemgDoVencimento = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(vencimentoObj.getFullYear());
            }

        } else if (!temFatoGerador) {
            const anoCorrente = new Date().getFullYear();
            const dataVencimentoObj = new Date(anoCorrente, 11, 31);
            vencimento = dataVencimentoObj.toISOString().split('T')[0];
            displayVencimento.textContent = dataVencimentoObj.toLocaleDateString('pt-BR');
            valorUfemgDoVencimento = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(anoCorrente);
            displayLegislacao.textContent = "Legislação Corrente (data do pagamento)";
        }
        
        displayUfemgVencimento.textContent = valorUfemgDoVencimento > 0 ? formatUFEMG(valorUfemgDoVencimento) : 'N/A';
        await _atualizarResumo();
        return { vencimento, valorUfemgDoVencimento };
    }
    
    async function _atualizarResumo() {
        let totais = { comuns: 0, part1: 0, part2: 0, recebido1: 0, recebido2: 0 };
        let totalReais = 0;
        let totalUfemg = 0;
        let totalForaMGUfemg = 0;

        for (const bem of bensDoCalculo) {
            const valorConsiderado = bem.valor * (bem.percentual / 100);
            totalReais += valorConsiderado;

            const anoAvaliacao = bem.dataAvaliacao ? new Date(bem.dataAvaliacao).getFullYear() : new Date().getFullYear();
            const valorUfemgAno = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(anoAvaliacao);
            const valorEmUfemg = valorUfemgAno > 0 ? (valorConsiderado / valorUfemgAno) : 0;
            totalUfemg += valorEmUfemg;

            if (bem.natureza === 'comum') totais.comuns += valorEmUfemg;
            else if (bem.natureza === 'particular1') totais.part1 += valorEmUfemg;
            else if (bem.natureza === 'particular2') totais.part2 += valorEmUfemg;

            totais.recebido1 += valorEmUfemg * (bem.partilha1 / 100);
            totais.recebido2 += valorEmUfemg * (bem.partilha2 / 100);

            if (bem.foraDeMG) {
                totalForaMGUfemg += valorEmUfemg;
            }
        }

        document.getElementById('total-avaliado-reais').textContent = formatBRL(totalReais);
        document.getElementById('total-avaliado-ufemg').textContent = `(${formatUFEMG(totalUfemg)} UFEMG)`;

        const meacao = totais.comuns / 2;
        const quinhaoDevido1 = meacao + totais.part1;
        const quinhaoDevido2 = meacao + totais.part2;

        const excedente = Math.max(0, totais.recebido1 - quinhaoDevido1, totais.recebido2 - quinhaoDevido2);
        const percentualForaMG = totalUfemg > 0 ? (totalForaMGUfemg / totalUfemg) * 100 : 0;

        document.getElementById('resumo-total-comuns').textContent = formatUFEMG(totais.comuns);
        document.getElementById('resumo-total-part1').textContent = formatUFEMG(totais.part1);
        document.getElementById('resumo-total-part2').textContent = formatUFEMG(totais.part2);
        document.getElementById('resumo-bens-fora-mg').textContent = formatUFEMG(totalForaMGUfemg);
        document.getElementById('resumo-percentual-fora-mg').textContent = `${percentualForaMG.toFixed(2)}%`;
        document.getElementById('resumo-meacao').textContent = formatUFEMG(meacao);
        document.getElementById('resumo-quinhao-devido1').textContent = formatUFEMG(quinhaoDevido1);
        document.getElementById('resumo-quinhao-devido2').textContent = formatUFEMG(quinhaoDevido2);
        document.getElementById('resumo-total-recebido1').textContent = formatUFEMG(totais.recebido1);
        document.getElementById('resumo-total-recebido2').textContent = formatUFEMG(totais.recebido2);
        document.getElementById('resumo-excedente').textContent = formatUFEMG(excedente);
    }
    
    async function executarCalculoExcedente() {
        await _atualizarDadosDependentes();
        
        const excedenteUfemg = parseFloat(document.getElementById('resumo-excedente').textContent.replace(/\./g, '').replace(',', '.')) || 0;
        const ufemgVencimentoStr = document.getElementById('resumo-ufemg-vencimento').textContent;
        const ufemgVencimento = parseFloat(ufemgVencimentoStr.replace(/\./g, '').replace(',', '.')) || 0;
        
        const baseCalculoReais = excedenteUfemg * ufemgVencimento;

        const dataPagamento = document.getElementById('exm-data-pagamento').value;
        const temFatoGerador = document.querySelector('input[name="exm-tem-fato-gerador"]:checked')?.value === 'sim';
        const dataFatoGerador = temFatoGerador ? document.getElementById('exm-fato-gerador').value : dataPagamento;
        
        const vencimentoStr = document.getElementById('resumo-vencimento').textContent;
        const vencimento = vencimentoStr !== 'N/A' ? vencimentoStr.split('/').reverse().join('-') : null;

        const moduloCalculo = getModuloCalculoPorData(dataFatoGerador);
        
        const dadosParaCalculo = {
            baseCalculoReais,
            baseCalculoUfemg: excedenteUfemg,
            dataFatoGerador,
            dataPagamento,
            vencimento,
            tipoDoacao: true,
            recolhimentoPrevio: { houve: false },
            justificativas: [],
            valorUfemgDoVencimento: ufemgVencimento
        };

        const resultado = await moduloCalculo.calcular(dadosParaCalculo);

        // Aplicar abatimento de bens fora de MG
        let totalUfemg = 0;
        let totalForaMGUfemg = 0;
        for (const bem of bensDoCalculo) {
            const valorConsiderado = bem.valor * (bem.percentual / 100);
            const anoAvaliacao = bem.dataAvaliacao ? new Date(bem.dataAvaliacao).getFullYear() : new Date().getFullYear();
            const valorUfemgAno = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(anoAvaliacao);
            const valorEmUfemg = valorUfemgAno > 0 ? (valorConsiderado / valorUfemgAno) : 0;
            totalUfemg += valorEmUfemg;
            if (bem.foraDeMG) {
                totalForaMGUfemg += valorEmUfemg;
            }
        }
        
        const percentualAbatimento = totalUfemg > 0 ? (totalForaMGUfemg / totalUfemg) : 0;
        if (percentualAbatimento > 0 && resultado.valores) {
            const impostoOriginal = resultado.valores.impostoARecolher;
            const valorAbatimento = impostoOriginal * percentualAbatimento;
            resultado.valores.impostoARecolher = impostoOriginal - valorAbatimento;
            resultado.abatimento = {
                percentual: percentualAbatimento * 100,
                valor: valorAbatimento
            };
        }

        ultimoResultadoCalculado = resultado;
        renderResultadosExcedente(resultado);
    }

    function renderResultadosExcedente(resultado) {
        const container = document.getElementById('resultado-calculo-excedente');
        if (!container || !resultado) {
            container.innerHTML = '<p class="text-sm text-center text-gray-500">Aguardando cálculo...</p>';
            return;
        }

        if(resultado.erros && resultado.erros.length > 0) {
            container.innerHTML = `<p class="feedback-message warning">${resultado.erros[0]}</p>`;
            return;
        }
        
        const { valores } = resultado;
        let justificativasHtml = (resultado.justificativaCalculo || []).map(j => `<p class="text-xs text-green-700 dark:text-green-300 p-2 bg-green-50 dark:bg-green-900/50 rounded">${j}</p>`).join('');
        
        if (resultado.abatimento && resultado.abatimento.valor > 0) {
            justificativasHtml += `<p class="text-xs text-yellow-700 dark:text-yellow-300 p-2 bg-yellow-50 dark:bg-yellow-900/50 rounded mt-2">Abatimento de ${formatBRL(resultado.abatimento.valor)} aplicado (${resultado.abatimento.percentual.toFixed(2)}% de bens fora de MG).</p>`;
        }

        container.innerHTML = `
            <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Base de Cálculo (UFEMG):</span> <span class="font-semibold">${formatUFEMG(valores.baseCalculoUfemg)}</span></div>
            <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Base de Cálculo (R$):</span> <span class="font-semibold">${formatBRL(valores.baseCalculoReais)}</span></div>
            <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Alíquota:</span> <span class="font-semibold">${typeof valores.aliquota === 'string' ? valores.aliquota : `${valores.aliquota}%`}</span></div>
            <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">ITCD Principal:</span> <span class="font-semibold">${formatBRL(valores.itcdPrincipal)}</span></div>
            <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Desconto:</span> <span class="font-semibold">${formatBRL(valores.desconto)}</span></div>
            <hr class="my-2 dark:border-slate-600">
            <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Multa:</span> <span class="font-semibold">${formatBRL(valores.multa)}</span></div>
            <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Juros (${(valores.percentualJuros || 0).toFixed(2)}%):</span> <span class="font-semibold">${formatBRL(valores.juros)}</span></div>
            <div class="flex justify-between pt-2 border-t font-bold text-lg"><span class="dark:text-gray-200">Total a Recolher:</span> <span class="text-red-600 dark:text-red-400">${formatBRL(valores.impostoARecolher)}</span></div>
            ${justificativasHtml}
        `;
    }
    
    async function salvarCalculoExcedente() {
        if (!ultimoResultadoCalculado) {
            uiModuleRef.showToastNotification("Por favor, execute o cálculo antes de salvar.", "warning"); return;
        }
        if (!dbRef) {
            uiModuleRef.showToastNotification("Erro: A conexão com o banco de dados não está disponível.", "error"); return;
        }
        const temFatoGerador = document.querySelector('input[name="exm-tem-fato-gerador"]:checked')?.value === 'sim';

        const calculoData = {
            id: calculoAtualId || appModuleRef.generateUUID(),
            tipoCalculo: 'excedenteMeacao',
            declaracaoNumero: document.getElementById('exm-declaracao').value,
            deCujusNome: `Partilha entre ${document.getElementById('exm-conjuge1').value || 'N/A'} e ${document.getElementById('exm-conjuge2').value || 'N/A'}`,
            dataFatoGerador: temFatoGerador ? document.getElementById('exm-fato-gerador').value : null,
            dataPagamento: document.getElementById('exm-data-pagamento').value,
            bens: bensDoCalculo,
            dadosPartilha: {
                conjuge1: document.getElementById('exm-conjuge1').value,
                conjuge2: document.getElementById('exm-conjuge2').value,
                regimeBens: document.getElementById('exm-regime-casamento').value,
            },
            dataSalvamento: new Date().toISOString(),
            resultadoFinal: ultimoResultadoCalculado
        };
        
        try {
            await dbRef.updateItem(dbRef.STORES.ITCD_CALCULOS, calculoData);
            calculoAtualId = calculoData.id;
            uiModuleRef.showToastNotification("Cálculo salvo com sucesso!", "success");
            appModuleRef.handleMenuAction('itcd-visualizar-calculo', { calculoId: calculoData.id });
        } catch(e) {
            uiModuleRef.showToastNotification(`Falha ao salvar cálculo: ${e.message}`, "error");
        }
    }
    
    function _handleAplicarPartilhaIgualitaria() {
        const selectedBemIds = Array.from(document.querySelectorAll('.bem-selecao-checkbox:checked')).map(cb => cb.dataset.bemId);
        if (selectedBemIds.length === 0) {
            uiModuleRef.showToastNotification("Nenhum bem selecionado.", "warning"); return;
        }

        bensDoCalculo.forEach(bem => {
            if (selectedBemIds.includes(bem.id)) {
                bem.partilha1 = 50;
                bem.partilha2 = 50;
            }
        });
        renderListaBens();
    }
    
    function _abrirModalPartilhaSeletiva() {
        const selectedBemIds = Array.from(document.querySelectorAll('.bem-selecao-checkbox:checked')).map(cb => cb.dataset.bemId);
        if (selectedBemIds.length === 0) {
            uiModuleRef.showToastNotification("Nenhum bem selecionado.", "warning"); return;
        }

        const nomeC1 = document.getElementById('exm-conjuge1').value || 'Cônjuge 1';
        const nomeC2 = document.getElementById('exm-conjuge2').value || 'Cônjuge 2';

        let modalContent = `
            <div id="feedback-partilha-seletiva-modal"></div>
            <p class="text-sm mb-4">Defina as porcentagens para os cônjuges. A soma deve ser 100%.</p>
            <div class="space-y-2">
                <div class="flex items-center gap-4">
                    <label class="w-1/2">${nomeC1}:</label>
                    <input type="number" data-conjuge-id="1" class="form-input-text w-1/2 partilha-seletiva-input" placeholder="%">
                </div>
                <div class="flex items-center gap-4">
                    <label class="w-1/2">${nomeC2}:</label>
                    <input type="number" data-conjuge-id="2" class="form-input-text w-1/2 partilha-seletiva-input" placeholder="%">
                </div>
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
        const input1 = document.querySelector('.partilha-seletiva-input[data-conjuge-id="1"]');
        const input2 = document.querySelector('.partilha-seletiva-input[data-conjuge-id="2"]');
        const p1 = parseFloat(input1.value) || 0;
        const p2 = parseFloat(input2.value) || 0;

        if (Math.abs(p1 + p2 - 100) > 0.01) {
            if(feedbackEl) feedbackEl.innerHTML = `<p class="text-red-500 text-sm">A soma das porcentagens deve ser exatamente 100%.</p>`;
            return false;
        }

        bensDoCalculo.forEach(bem => {
            if (selectedBemIds.includes(bem.id)) {
                bem.partilha1 = p1;
                bem.partilha2 = p2;
            }
        });
        renderListaBens();
        return true;
    }

    return {
        init,
        renderFormExcedenteMeacao
    };

})();