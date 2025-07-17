// js/itcd/calculo/doacoesSucessivas.js - Módulo para Cálculo de ITCD em Doações Sucessivas
// v8.0.0 - REATORADO: Lógica de cálculo refeita para seguir nova especificação detalhada. Introduzido o campo "ITCD Devido" como base para acréscimos. A dedução de "Recolhimento Anterior" agora usa o ITCD Principal da etapa anterior, não o valor pago. Lógica de multa e juros ajustada. Demonstrativo de resultados completamente refeito.
// v7.0.1 - CORRIGIDO: O campo "UFEMG da data" no demonstrativo de resultados agora exibe corretamente o valor nominal da UFEMG para o ano da doação.
// v7.0.0 - REATORADO: Lógica de cálculo e exibição completamente refeita para atender às novas especificações.
// ... (histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ITCD = window.SEFWorkStation.ITCD || {};
window.SEFWorkStation.ITCD.Calculo = window.SEFWorkStation.ITCD.Calculo || {};

window.SEFWorkStation.ITCD.Calculo.DoacoesSucessivas = (function() {

    let mainContentWrapperRef;
    let appModuleRef;
    let uiModuleRef;
    let dbRef;
    let listaDeDoacoes = [];
    let ultimoResultadoCalculado = null;
    let calculoAtualId = null;

    const LIMITE_ISENCAO_UFEMG = 10000;
    const LIMITE_DESCONTO_UFEMG = 90000;
    const ALIQUOTA_PERCENTUAL = 0.05;
    const MULTA_PERCENTUAL = 0.12;

    function init(app, ui, db) {
        appModuleRef = app;
        uiModuleRef = ui;
        dbRef = db;
        mainContentWrapperRef = document.querySelector('.main-content-wrapper');
    }

    function formatBRL(value) {
        if (isNaN(value) || value === null) return 'R$ 0,00';
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

    function renderFormDoacoesSucessivas(calculoExistente = null) {
        if (calculoExistente) {
            calculoAtualId = calculoExistente.id;
            listaDeDoacoes = JSON.parse(JSON.stringify(calculoExistente.bens || []));
            ultimoResultadoCalculado = calculoExistente.resultadoFinal || null;
        } else {
            calculoAtualId = null;
            listaDeDoacoes = [];
            ultimoResultadoCalculado = null;
        }

        const hoje = new Date();
        const hojeStr = hoje.toISOString().split('T')[0];

        const pageHtml = `
            <div id="itcd-calculo-sucessivas-container" class="page-section max-w-none px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-100">Cálculo - Doações Sucessivas</h2>
                    <button id="btn-voltar-calculo-hub" class="btn-secondary btn-sm">Voltar ao Hub</button>
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    Este cálculo acumula a base de doações recebidas pelo mesmo <b>donatário</b> nos últimos 3 anos civis (ano atual e os 2 anteriores).
                </p>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div class="lg:col-span-2 space-y-6">
                        <fieldset class="section-box p-4 border dark:border-slate-700 rounded-lg">
                            <h3 class="text-lg font-medium mb-3">1. Dados do Beneficiário</h3>
                             <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label for="ds-declaracao" class="block text-sm font-medium">Nº da Declaração (opcional):</label>
                                    <input type="text" id="ds-declaracao" class="form-input-text mt-1" placeholder="Número da DBD" value="${calculoExistente?.declaracaoNumero || ''}">
                                </div>
                                <div>
                                    <label for="ds-donatario" class="block text-sm font-medium">Donatário (Beneficiário):</label>
                                    <input type="text" id="ds-donatario" class="form-input-text mt-1" placeholder="Nome do donatário" value="${calculoExistente?.donatario || ''}">
                                </div>
                            </div>
                        </fieldset>

                        <fieldset class="section-box p-4 border dark:border-slate-700 rounded-lg">
                             <div class="flex justify-between items-center mb-3">
                                <h3 class="text-lg font-medium">2. Lista de Doações Recebidas</h3>
                                <button id="btn-adicionar-doacao" class="btn-secondary btn-sm">Adicionar Doação</button>
                            </div>
                            <div id="lista-de-doacoes" class="space-y-3">
                               <p class="text-sm text-center text-gray-500 dark:text-gray-400 p-4">Nenhuma doação adicionada.</p>
                            </div>
                        </fieldset>
                    </div>

                    <div class="lg:col-span-1">
                         <fieldset class="section-box p-4 border dark:border-slate-700 rounded-lg sticky top-24">
                            <h3 class="text-lg font-medium mb-3">Resultado Consolidado</h3>
                            <div class="mb-4">
                                <label for="ds-data-pagamento" class="block text-sm font-medium">Data do Pagamento (para cálculo de juros):</label>
                                <input type="date" id="ds-data-pagamento" class="form-input-text mt-1" value="${calculoExistente?.dataPagamento || hojeStr}">
                            </div>
                            <div id="resultado-calculo-sucessivas" class="space-y-4 text-sm"></div>
                            <div class="flex gap-2 mt-4">
                                <button id="btn-executar-calculo-sucessivas" class="btn-primary w-full">Calcular Imposto</button>
                                <button id="btn-salvar-calculo-sucessivas" class="btn-primary w-full">Salvar Cálculo</button>
                            </div>
                        </fieldset>
                    </div>
                </div>
            </div>
        `;
        mainContentWrapperRef.innerHTML = pageHtml;
        addEventListenersSucessivas();
        renderListaDeDoacoes();
        renderResultadosSucessivas(ultimoResultadoCalculado);
    }
    
    function addEventListenersSucessivas() {
        document.getElementById('btn-voltar-calculo-hub').addEventListener('click', () => appModuleRef.handleMenuAction('itcd-calculo-hub'));
        document.getElementById('btn-executar-calculo-sucessivas').addEventListener('click', executarCalculoSucessivas);
        document.getElementById('btn-adicionar-doacao').addEventListener('click', abrirModalAdicionarDoacao);
        document.getElementById('btn-salvar-calculo-sucessivas').addEventListener('click', salvarCalculoSucessivas);
        
        document.getElementById('lista-de-doacoes').addEventListener('click', e => {
            if (e.target.classList.contains('btn-excluir-doacao')) {
                const id = e.target.dataset.id;
                listaDeDoacoes = listaDeDoacoes.filter(d => d.id !== id);
                renderListaDeDoacoes();
                executarCalculoSucessivas();
            }
        });
    }

    async function abrirModalAdicionarDoacao() {
        const modalContent = `
            <form id="form-doacao" class="space-y-4">
                <div>
                    <label for="doacao-doador-nome" class="block text-sm">Nome do Doador:</label>
                    <input type="text" id="doacao-doador-nome" class="form-input-text mt-1" placeholder="Nome do doador">
                </div>
                <div>
                    <label for="doacao-data" class="block text-sm">Data da Doação (Fato Gerador):</label>
                    <input type="date" id="doacao-data" class="form-input-text mt-1">
                </div>
                <div>
                    <label for="doacao-valor" class="block text-sm">Valor da Doação (R$):</label>
                    <input type="text" id="doacao-valor" class="form-input-text mt-1 currency-input">
                    <p id="doacao-valor-ufemg" class="text-xs text-gray-500 dark:text-gray-400 h-4 mt-1"></p>
                </div>
                <div>
                    <label for="doacao-valor-pago" class="block text-sm">Pagamento Efetuado (ITCD) (R$):</label>
                    <input type="text" id="doacao-valor-pago" class="form-input-text mt-1 currency-input" value="R$ 0,00">
                    <p id="doacao-valor-pago-ufemg" class="text-xs text-gray-500 dark:text-gray-400 h-4 mt-1"></p>
                </div>
                <div>
                    <label for="doacao-data-pago" class="block text-sm">Data do Pagamento Efetuado:</label>
                    <input type="date" id="doacao-data-pago" class="form-input-text mt-1">
                </div>
            </form>
        `;
        const modal = uiModuleRef.showModal("Adicionar Doação", modalContent, [
            { text: "Cancelar", closesModal: true, class: "btn-secondary" },
            { text: "Adicionar", class: "btn-primary", callback: () => {
                const doador = document.getElementById('doacao-doador-nome').value.trim();
                const valor = parseFromBRL(document.getElementById('doacao-valor').value);
                const data = document.getElementById('doacao-data').value;
                const valorPago = parseFromBRL(document.getElementById('doacao-valor-pago').value);
                const dataPago = document.getElementById('doacao-data-pago').value;
                if (valor > 0 && data) {
                    listaDeDoacoes.push({ id: `doacao_${Date.now()}`, doador, valor, data, valorPago, dataPago });
                    renderListaDeDoacoes();
                    return true;
                }
                uiModuleRef.showToastNotification("Valor e Data da Doação são obrigatórios.", "warning");
                return false;
            }}
        ]);
        
        const valorInput = modal.querySelector('#doacao-valor');
        const dataInput = modal.querySelector('#doacao-data');
        const valorPagoInput = modal.querySelector('#doacao-valor-pago');
        const dataPagoInput = modal.querySelector('#doacao-data-pago');

        const updateUfemg = async () => {
            await _updateModalUfemgDisplay(valorInput, dataInput, '#doacao-valor-ufemg');
            await _updateModalUfemgDisplay(valorPagoInput, dataPagoInput, '#doacao-valor-pago-ufemg');
        };
        [valorInput, dataInput, valorPagoInput, dataPagoInput].forEach(el => el.addEventListener('input', updateUfemg));
        modal.querySelectorAll('.currency-input').forEach(input => {
            input.addEventListener('blur', e => { e.target.value = formatBRL(parseFromBRL(e.target.value)); });
        });
    }

    async function _updateModalUfemgDisplay(valorInput, dataInput, displaySelector) {
        const displayEl = document.querySelector(displaySelector);
        if (!valorInput || !dataInput || !displayEl) return;
        
        const valor = parseFromBRL(valorInput.value);
        const data = dataInput.value;
        if (!data) {
            displayEl.textContent = ''; return;
        }
        const ano = new Date(data + 'T00:00:00').getFullYear();

        if (valor > 0 && ano) {
            const valorUfemgAno = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(ano);
            if(valorUfemgAno > 0) {
                displayEl.textContent = `(aprox. ${formatUFEMG(valor / valorUfemgAno)} UFEMG de ${ano})`;
            } else {
                displayEl.textContent = `(UFEMG de ${ano} não encontrada)`;
            }
        } else {
            displayEl.textContent = '';
        }
    }

    async function renderListaDeDoacoes() {
        const container = document.getElementById('lista-de-doacoes');
        if (listaDeDoacoes.length === 0) {
            container.innerHTML = '<p class="text-sm text-center text-gray-500 dark:text-gray-400 p-4">Nenhuma doação adicionada.</p>';
            return;
        }
        listaDeDoacoes.sort((a, b) => new Date(a.data) - new Date(b.data));
        let html = '<ul class="divide-y dark:divide-slate-700">';
        for (const doacao of listaDeDoacoes) {
            const valorEmUfemg = await _getValorUfemg(doacao.valor, doacao.data);
            const ufemgDisplay = valorEmUfemg > 0 ? `<span class="text-xs text-blue-600 dark:text-blue-400">(${formatUFEMG(valorEmUfemg)} UFEMG)</span>` : '';
            let pagoEmUfemgDisplay = '';
            if (doacao.valorPago > 0 && doacao.dataPago) {
                const pagoEmUfemg = await _getValorUfemg(doacao.valorPago, doacao.dataPago);
                if (pagoEmUfemg > 0) {
                    pagoEmUfemgDisplay = `<span class="text-xs text-green-600 dark:text-green-400">(${formatUFEMG(pagoEmUfemg)} UFEMG)</span>`;
                }
            }
            html += `
                <li class="p-2 flex justify-between items-center">
                    <div>
                        <p class="font-semibold text-sm">${formatBRL(doacao.valor)} ${ufemgDisplay} em ${new Date(doacao.data + "T00:00:00").toLocaleDateString()} (Doador: ${doacao.doador || 'N/A'})</p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">Pagamento: ${formatBRL(doacao.valorPago)} ${pagoEmUfemgDisplay} em ${doacao.dataPago ? new Date(doacao.dataPago + "T00:00:00").toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <button class="btn-link text-red-500 btn-excluir-doacao" data-id="${doacao.id}">×</button>
                </li>
            `;
        }
        html += '</ul>';
        container.innerHTML = html;
    }
    
    function getPeriodoRelevante(data) {
        const anoAtual = new Date(data + 'T00:00:00').getFullYear();
        return { inicio: anoAtual - 2, fim: anoAtual };
    }

    async function executarCalculoSucessivas() {
        if (listaDeDoacoes.length === 0) {
            uiModuleRef.showToastNotification("Adicione pelo menos uma doação.", "warning");
            renderResultadosSucessivas(null);
            return;
        }

        listaDeDoacoes.sort((a, b) => new Date(a.data) - new Date(b.data));
        
        const dataPagamentoFinal = document.getElementById('ds-data-pagamento').value;
        let resultadosPorPeriodo = [];
        
        let recolhimentoAnteriorUfemg = 0;
        let descontoAnteriorUfemg = 0;
        let tinhaDescontoAnterior = false;

        for (const doacaoAtual of listaDeDoacoes) {
            const periodo = getPeriodoRelevante(doacaoAtual.data);
            const doacoesNoPeriodo = listaDeDoacoes.filter(d => {
                const anoDoacao = new Date(d.data + 'T00:00:00').getFullYear();
                return anoDoacao >= periodo.inicio && anoDoacao <= periodo.fim && new Date(d.data) <= new Date(doacaoAtual.data);
            });
            
            let baseCalculoAcumuladaUfemg = 0;
            for (const d of doacoesNoPeriodo) {
                baseCalculoAcumuladaUfemg += await _getValorUfemg(d.valor, d.data);
            }

            const temDescontoAtual = baseCalculoAcumuladaUfemg < LIMITE_DESCONTO_UFEMG;

            // Isenção
            if (baseCalculoAcumuladaUfemg <= LIMITE_ISENCAO_UFEMG) {
                resultadosPorPeriodo.push({ doacaoReferencia: doacaoAtual, isento: true, baseCalculoAcumuladaUfemg });
                // recolhimentoAnteriorUfemg não é atualizado pois o ITCD Principal desta etapa é 0.
                tinhaDescontoAnterior = false; // Isenção não conta como desconto
                continue;
            }

            // Cálculo em UFEMG
            const itcdPrincipalUfemg = baseCalculoAcumuladaUfemg * ALIQUOTA_PERCENTUAL;
            const descontoAtualUfemg = temDescontoAtual ? itcdPrincipalUfemg * 0.50 : 0;
            
            const clawbackDescontoUfemg = (!temDescontoAtual && tinhaDescontoAnterior) ? descontoAnteriorUfemg : 0;
            const pagamentoEfetuadoUfemg = await _getValorUfemg(doacaoAtual.valorPago, doacaoAtual.dataPago);
            
            const itcdDevidoUfemg = (itcdPrincipalUfemg - descontoAtualUfemg - recolhimentoAnteriorUfemg) + clawbackDescontoUfemg - pagamentoEfetuadoUfemg;

            // Cálculo em Reais
            const vencimentoObj = new Date(doacaoAtual.data + "T00:00:00");
            vencimentoObj.setDate(vencimentoObj.getDate() + 15);
            const vencimentoStr = vencimentoObj.toISOString().split('T')[0];
            const ufemgVencimento = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(vencimentoObj.getFullYear());

            const itcdDevidoReais = itcdDevidoUfemg * ufemgVencimento;
            const multaReais = Math.max(0, itcdDevidoReais) * MULTA_PERCENTUAL;
            
            let jurosReais = 0;
            if (dataPagamentoFinal > vencimentoStr) {
                 const jurosBaseReais = Math.max(0, itcdDevidoReais) + multaReais;
                 if (jurosBaseReais > 0) {
                    const resultadoJuros = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorSelicAcumulado(vencimentoStr, dataPagamentoFinal);
                    jurosReais = jurosBaseReais * resultadoJuros.taxa;
                 }
            }

            const totalARecolherReais = Math.max(0, itcdDevidoReais) + multaReais + jurosReais;
            const anoDoacao = new Date(doacaoAtual.data + "T00:00:00").getFullYear();
            const ufemgDaData = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(anoDoacao);
            
            resultadosPorPeriodo.push({
                doacaoReferencia: doacaoAtual, isento: false, ufemgData: ufemgDaData,
                ufemg: {
                    baseCalculo: baseCalculoAcumuladaUfemg, itcdPrincipal: itcdPrincipalUfemg,
                    desconto: descontoAtualUfemg, recolhimentoAnterior: recolhimentoAnteriorUfemg,
                    pagamentoEfetuado: pagamentoEfetuadoUfemg, itcdDevido: itcdDevidoUfemg,
                    multa: (multaReais / ufemgVencimento), juros: (jurosReais / ufemgVencimento),
                    totalARecolher: (totalARecolherReais / ufemgVencimento), clawback: clawbackDescontoUfemg
                },
                reais: {
                    baseCalculo: baseCalculoAcumuladaUfemg * ufemgVencimento, itcdPrincipal: itcdPrincipalUfemg * ufemgVencimento,
                    desconto: descontoAtualUfemg * ufemgVencimento, recolhimentoAnterior: recolhimentoAnteriorUfemg * ufemgVencimento,
                    pagamentoEfetuado: pagamentoEfetuadoUfemg * ufemgVencimento, itcdDevido: itcdDevidoReais,
                    multa: multaReais, juros: jurosReais, totalARecolher: totalARecolherReais,
                    clawback: clawbackDescontoUfemg * ufemgVencimento
                }
            });

            recolhimentoAnteriorUfemg = itcdPrincipalUfemg;
            descontoAnteriorUfemg = descontoAtualUfemg;
            tinhaDescontoAnterior = temDescontoAtual;
        }
        
        ultimoResultadoCalculado = resultadosPorPeriodo;
        renderResultadosSucessivas(resultadosPorPeriodo);
    }

    async function _getValorUfemg(valor, data) {
         if (!valor || !data || valor <= 0) return 0;
         const ano = new Date(data + "T00:00:00").getFullYear();
         const ufemgAno = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(ano);
         return ufemgAno > 0 ? valor / ufemgAno : 0;
    }
    
    async function renderResultadosSucessivas(resultados) {
        const container = document.getElementById('resultado-calculo-sucessivas');
        if(!container) return;

        const periodos = Array.isArray(resultados) ? resultados : (resultados?.porPeriodo || []);

        if (!periodos || periodos.length === 0) {
            container.innerHTML = '<p class="text-sm text-center text-gray-500">Aguardando cálculo...</p>';
            return;
        }
        
        let html = '';
        let consolidado = { baseCalculoTotalUfemg: 0, itcdPrincipalTotalUfemg: 0, itcdPagoTotalUfemg: 0, multaTotalReais: 0, jurosTotalReais: 0, totalARecolherGeralReais: 0 };
        const ufemgAtual = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(new Date().getFullYear());

        for (const [index, res] of periodos.entries()) {
            const doacaoRefData = new Date(res.doacaoReferencia.data + 'T00:00:00').toLocaleDateString();

            if (res.isento) {
                html += `<div class="p-3 border rounded-md dark:border-slate-600 mb-4 bg-green-50 dark:bg-green-900/30">
                    <h4 class="font-semibold mb-2 text-green-800 dark:text-green-300">Apuração (Ref. Doação de ${doacaoRefData}) - ISENTO</h4>
                    <p class="text-xs mt-1">Base acumulada (${formatUFEMG(res.baseCalculoAcumuladaUfemg)}) não ultrapassa o limite de isenção de ${formatUFEMG(LIMITE_ISENCAO_UFEMG)} UFEMG.</p>
                </div>`;
                consolidado.itcdPagoTotalUfemg += await _getValorUfemg(res.doacaoReferencia.valorPago, res.doacaoReferencia.dataPago);
                continue;
            }

            consolidado.multaTotalReais += res.reais.multa;
            consolidado.jurosTotalReais += res.reais.juros;
            consolidado.totalARecolherGeralReais += res.reais.totalARecolher;
            consolidado.itcdPagoTotalUfemg += res.ufemg.pagamentoEfetuado;
            
            html += `
                <div class="p-3 border rounded-md dark:border-slate-600 mb-4">
                    <h4 class="font-semibold mb-2">Apuração (Ref. Doação de ${doacaoRefData})</h4>
                    <p class="text-xs text-gray-500 dark:text-gray-400 -mt-2 mb-2">UFEMG da data: R$ ${formatUFEMG(res.ufemgData)}</p>
                    
                    <div class="grid grid-cols-2 gap-x-4">
                        <div>
                            <strong class="block text-xs dark:text-gray-200">Cálculo em UFEMG</strong>
                            <dl class="text-xs space-y-px">
                                <div class="flex justify-between"><span>Base de Cálculo:</span> <span>${formatUFEMG(res.ufemg.baseCalculo)}</span></div>
                                <div class="flex justify-between"><span>ITCD Principal (5%):</span> <span>${formatUFEMG(res.ufemg.itcdPrincipal)}</span></div>
                                <div class="flex justify-between"><span>(-) Desconto:</span> <span>-${formatUFEMG(res.ufemg.desconto)}</span></div>
                                <div class="flex justify-between"><span>(-) Recolhido Ant.:</span> <span>-${formatUFEMG(res.ufemg.recolhimentoAnterior)}</span></div>
                                ${res.ufemg.clawback > 0 ? `<div class="flex justify-between text-red-500"><span>(+) Devol. Desconto:</span> <span>+${formatUFEMG(res.ufemg.clawback)}</span></div>` : ''}
                                <div class="flex justify-between"><span>(-) Pagto. Efetuado:</span> <span>-${formatUFEMG(res.ufemg.pagamentoEfetuado)}</span></div>
                                <div class="flex justify-between font-bold border-t pt-1 mt-1"><span>(=) ITCD Devido:</span> <span>${formatUFEMG(res.ufemg.itcdDevido)}</span></div>
                                <div class="flex justify-between"><span>(+) Multa:</span> <span>+${formatUFEMG(res.ufemg.multa)}</span></div>
                                <div class="flex justify-between"><span>(+) Juros:</span> <span>+${formatUFEMG(res.ufemg.juros)}</span></div>
                                <div class="flex justify-between font-bold border-t pt-1 mt-1 border-blue-500 text-blue-700 dark:text-blue-400"><span>Total:</span> <span>${formatUFEMG(res.ufemg.totalARecolher)}</span></div>
                            </dl>
                        </div>
                        <div>
                            <strong class="block text-xs dark:text-gray-200">Cálculo em Reais (R$)</strong>
                             <dl class="text-xs space-y-px">
                                <div class="flex justify-between"><span>Base de Cálculo:</span> <span>${formatBRL(res.reais.baseCalculo)}</span></div>
                                <div class="flex justify-between"><span>ITCD Principal (5%):</span> <span>${formatBRL(res.reais.itcdPrincipal)}</span></div>
                                <div class="flex justify-between"><span>(-) Desconto:</span> <span>-${formatBRL(res.reais.desconto)}</span></div>
                                <div class="flex justify-between"><span>(-) Recolhido Ant.:</span> <span>-${formatBRL(res.reais.recolhimentoAnterior)}</span></div>
                                ${res.reais.clawback > 0 ? `<div class="flex justify-between text-red-500"><span>(+) Devol. Desconto:</span> <span>+${formatBRL(res.reais.clawback)}</span></div>` : ''}
                                <div class="flex justify-between"><span>(-) Pagto. Efetuado:</span> <span>-${formatBRL(res.reais.pagamentoEfetuado)}</span></div>
                                <div class="flex justify-between font-bold border-t pt-1 mt-1"><span>(=) ITCD Devido:</span> <span>${formatBRL(res.reais.itcdDevido)}</span></div>
                                <div class="flex justify-between"><span>(+) Multa:</span> <span>+${formatBRL(res.reais.multa)}</span></div>
                                <div class="flex justify-between"><span>(+) Juros:</span> <span>+${formatBRL(res.reais.juros)}</span></div>
                                <div class="flex justify-between font-bold border-t pt-1 mt-1 border-blue-500 text-blue-700 dark:text-blue-400"><span>Total:</span> <span>${formatBRL(res.reais.totalARecolher)}</span></div>
                            </dl>
                        </div>
                    </div>
                </div>
            `;
        }

        const ultimoCalculo = periodos.filter(p => !p.isento).pop();
        if (ultimoCalculo) {
            consolidado.baseCalculoTotalUfemg = ultimoCalculo.ufemg.baseCalculo;
            consolidado.itcdPrincipalTotalUfemg = ultimoCalculo.ufemg.itcdPrincipal;
        }

        const difPrincipalUfemg = consolidado.itcdPrincipalTotalUfemg - consolidado.itcdPagoTotalUfemg;
        
        html += `
            <div class="p-3 border-2 rounded-lg dark:border-blue-400 border-blue-500 mt-6">
                 <h4 class="font-bold text-lg mb-2 text-center dark:text-gray-100">Consolidado Final</h4>
                 <div class="text-xs space-y-1">
                     <div class="flex justify-between"><span>Base de Cálculo Total:</span> <span>${formatUFEMG(consolidado.baseCalculoTotalUfemg)} UFEMG (${formatBRL(consolidado.baseCalculoTotalUfemg * ufemgAtual)})</span></div>
                     <div class="flex justify-between"><span>ITCD Principal Total:</span> <span>${formatUFEMG(consolidado.itcdPrincipalTotalUfemg)} UFEMG (${formatBRL(consolidado.itcdPrincipalTotalUfemg * ufemgAtual)})</span></div>
                     <div class="flex justify-between"><span>ITCD Pago Total:</span> <span>${formatUFEMG(consolidado.itcdPagoTotalUfemg)} UFEMG (${formatBRL(consolidado.itcdPagoTotalUfemg * ufemgAtual)})</span></div>
                     <div class="flex justify-between font-semibold"><span>Diferença Principal:</span> <span>${formatUFEMG(difPrincipalUfemg)} UFEMG (${formatBRL(difPrincipalUfemg * ufemgAtual)})</span></div>
                     <div class="flex justify-between border-t pt-1 mt-1"><span>(+) Multa Total:</span> <span>${formatBRL(consolidado.multaTotalReais)}</span></div>
                     <div class="flex justify-between"><span>(+) Juros Total:</span> <span>${formatBRL(consolidado.jurosTotalReais)}</span></div>
                 </div>
                 <div class="flex justify-between font-bold text-xl pt-2 mt-2 border-t dark:border-slate-500"><span class="dark:text-gray-200">TOTAL GERAL A RECOLHER:</span><span class="text-red-600 dark:text-red-400">${formatBRL(consolidado.totalARecolherGeralReais)}</span></div>
            </div>
        `;
        
        container.innerHTML = html;
    }
    
    async function salvarCalculoSucessivas() {
        if (!ultimoResultadoCalculado || ultimoResultadoCalculado.length === 0) {
            uiModuleRef.showToastNotification("Execute o cálculo antes de salvar.", "warning"); return;
        }

        const donatarioNome = document.getElementById('ds-donatario').value.trim();
        if (!donatarioNome) {
            uiModuleRef.showToastNotification("O nome do donatário é obrigatório para salvar.", "warning"); return;
        }
        
        const doacaoPrincipal = listaDeDoacoes[listaDeDoacoes.length - 1];
        const totalARecolherFinal = ultimoResultadoCalculado.reduce((acc, res) => acc + (res.reais?.totalARecolher || 0), 0);

        const calculoData = {
            id: calculoAtualId || `sucessivas_${Date.now()}`,
            tipoCalculo: 'doacoesSucessivas',
            deCujusNome: `Doações para ${donatarioNome}`,
            declaracaoNumero: document.getElementById('ds-declaracao').value.trim(),
            donatario: donatarioNome,
            bens: listaDeDoacoes,
            dataFatoGerador: doacaoPrincipal.data,
            dataPagamento: document.getElementById('ds-data-pagamento').value,
            dataSalvamento: new Date().toISOString(),
            resultadoFinal: { 
                porPeriodo: ultimoResultadoCalculado,
                total: { impostoARecolher: totalARecolherFinal }
            }
        };

        try {
            await dbRef.updateItem(dbRef.STORES.ITCD_CALCULOS, calculoData);
            calculoAtualId = calculoData.id;
            uiModuleRef.showToastNotification("Cálculo de doações sucessivas salvo com sucesso!", "success");
            appModuleRef.handleMenuAction('itcd-visualizar-calculo', { calculoId: calculoData.id });
        } catch(e) {
            uiModuleRef.showToastNotification(`Falha ao salvar cálculo: ${e.message}`, "error");
        }
    }

    return {
        init,
        renderFormDoacoesSucessivas
    };

})();