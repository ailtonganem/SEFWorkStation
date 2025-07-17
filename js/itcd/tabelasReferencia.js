// js/itcd/tabelasReferencia.js - Módulo para Consultas a Tabelas de Referência (UFEMG, SELIC, etc.)
// v7.2.1 - CORRIGIDO: Removida a chamada a seedSelicDataIfNeeded da função init para resolver race condition na inicialização do DB. A migração de dados já é tratada em db.js.
// v7.2.0 - CORRIGIDO: Refatorada toda a manipulação da SELIC para usar a store 'itcdSelicIndicesStore' em vez da 'itcdConfiguracoesStore', alinhando com a nova estrutura do DB.
// v7.1.0 - ADICIONADO: Funcionalidade de conversão de valores entre anos utilizando a UFEMG como indexador.
// ... (histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ITCD = window.SEFWorkStation.ITCD || {};

window.SEFWorkStation.ITCD.TabelasReferencia = (function() {

    let mainContentWrapperRef;
    let dbRef;
    let appModuleRef;
    let uiModuleRef;

    const ITCD_CONFIG_STORE = 'itcdConfiguracoesStore';
    const UFEMG_KEY = 'valoresUfemg';
    const SELIC_CONFIG_FILENAME_LOCAL = 'selic_indices_sefworkstation.json';

    const VALORES_UFEMG_PADRAO = {
        1997: 0.9108, 1998: 0.9611, 1999: 0.9770, 2000: 1.0641, 2001: 1.0641, 
        2002: 1.0641, 2003: 1.2490, 2004: 1.4461, 2005: 1.6175, 2006: 1.6528, 
        2007: 1.7080, 2008: 1.8122, 2009: 2.0349, 2010: 1.9991, 2011: 2.1813, 
        2012: 2.3291, 2013: 2.5016, 2014: 2.6382, 2015: 2.7229, 2016: 3.0109, 
        2017: 3.2514, 2018: 3.2514, 2019: 3.5932, 2020: 3.7116, 2021: 3.9440, 
        2022: 4.7703, 2023: 5.0369, 2024: 5.2797, 2025: 5.5310
    };
    
    const MESES_MAP = {
        "jan": 1, "fev": 2, "mar": 3, "abr": 4, "mai": 5, "jun": 6,
        "jul": 7, "ago": 8, "set": 9, "out": 10, "nov": 11, "dez": 12
    };

    function formatToBRL(value) {
        if (isNaN(value) || value === null || value === undefined) return '';
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function parseFromBRL(value) {
        if (!value || typeof value !== 'string') return 0;
        return parseFloat(value.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
    }

    function formatToPercent(value) {
        if (isNaN(value) || value === null || value === undefined) return '';
        return value.toLocaleString('pt-BR', { minimumFractionDigits: 6, maximumFractionDigits: 6 });
    }

    function parseFromPercent(value) {
        if (!value || typeof value !== 'string') return 0;
        return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
    }


    function init(db, app, ui, utils, mainWrapper) {
        dbRef = db;
        appModuleRef = app;
        uiModuleRef = ui;
        mainContentWrapperRef = mainWrapper;
        // A chamada a seedSelicDataIfNeeded foi removida daqui para evitar a race condition.
        // A lógica de migração em db.js é suficiente para garantir os dados.
        console.log("Módulo ITCD.TabelasReferencia inicializado (v7.2.1).");
    }

    async function getValoresUfemg() {
        try {
            const config = await dbRef.getItemById(ITCD_CONFIG_STORE, UFEMG_KEY);
            const valoresSalvos = config?.value || {};
            return { ...VALORES_UFEMG_PADRAO, ...valoresSalvos };
        } catch (error) {
            console.error("Erro ao carregar valores da UFEMG do DB:", error);
            return { ...VALORES_UFEMG_PADRAO };
        }
    }
    
    async function getValoresSelic() {
        try {
            const indices = await dbRef.getAllItems(dbRef.STORES.ITCD_SELIC_INDICES);
            const selicData = {};
            const mesesAbreviados = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

            indices.forEach(item => {
                const [ano, mesNum] = item.key.split('-');
                if (!selicData[ano]) {
                    selicData[ano] = {};
                }
                const mesAbrev = mesesAbreviados[parseInt(mesNum, 10) - 1];
                if (mesAbrev) {
                    selicData[ano][mesAbrev] = item.valor;
                }
            });
            return selicData;
        } catch (error) {
            console.error("Erro ao carregar e reconstruir valores da SELIC do DB:", error);
            return {};
        }
    }


    async function renderTabelaUfemg() {
        if (!mainContentWrapperRef) {
            console.error("ITCD.TabelasReferencia: O contêiner de conteúdo principal não está definido.");
            return;
        }

        const feedbackAreaId = "feedback-ufemg";
        const valoresUfemg = await getValoresUfemg();
        const anos = Object.keys(valoresUfemg).sort((a,b) => a - b);
        
        let tabelaHtml = '';
        anos.forEach(ano => {
            const isPadrao = VALORES_UFEMG_PADRAO.hasOwnProperty(ano);
            const isEditavel = !isPadrao;

            tabelaHtml += `
                <tr class="border-b dark:border-slate-700">
                    <td class="py-2 px-3 font-semibold">${ano}</td>
                    <td class="py-2 px-3 text-right">${valoresUfemg[ano].toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                    <td class="py-2 px-3 text-center">
                        ${isEditavel ? `
                            <button class="text-blue-600 hover:underline text-xs btn-edit-ufemg" data-ano="${ano}">Editar</button>
                            <button class="text-red-600 hover:underline text-xs ml-2 btn-delete-ufemg" data-ano="${ano}">Excluir</button>
                        ` : `
                            <span class="text-xs text-gray-400 dark:text-gray-500" title="Valor padrão do sistema, não pode ser alterado.">Padrão</span>
                        `}
                    </td>
                </tr>
            `;
        });
        
        mainContentWrapperRef.innerHTML = `
            <div id="ufemg-container" class="page-section max-w-none px-4 sm:px-6 lg:px-8">
                <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-2">Tabela de Valores da UFEMG</h2>
                <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    Fonte oficial: 
                    <a href="https://www.fazenda.mg.gov.br/empresas/legislacao_tributaria/resolucoes/ufemg.html" 
                       target="_blank" rel="noopener noreferrer" class="link">
                       SEF/MG - UFEMG
                    </a>
                </p>
                <div id="${feedbackAreaId}" class="mb-4"></div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="md:col-span-2">
                        <div class="table-list-container max-h-[70vh]">
                            <table class="documentos-table">
                                <thead class="bg-gray-200 dark:bg-slate-700">
                                    <tr>
                                        <th class="w-1/3">Ano</th>
                                        <th class="w-1/3 text-right">Valor (R$)</th>
                                        <th class="w-1/3 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${tabelaHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="space-y-6">
                        <div class="section-box p-4 border dark:border-slate-700 rounded-lg">
                            <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100">Adicionar/Atualizar Valor</h3>
                            <form id="form-add-ufemg">
                                <div class="mb-3">
                                    <label for="ufemg-ano" class="block text-sm font-medium">Ano:</label>
                                    <input type="number" id="ufemg-ano" class="form-input-text mt-1 w-full" placeholder="Ex: ${new Date().getFullYear() + 1}">
                                </div>
                                <div class="mb-3">
                                    <label for="ufemg-valor" class="block text-sm font-medium">Valor (R$):</label>
                                    <input type="number" step="0.0001" id="ufemg-valor" class="form-input-text mt-1 w-full" placeholder="Ex: 5.8000">
                                </div>
                                <button type="submit" class="btn-primary w-full">Salvar Valor</button>
                            </form>
                        </div>

                        <div class="section-box p-4 border dark:border-slate-700 rounded-lg">
                            <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100">Conversor de Valores por UFEMG</h3>
                            <div id="form-converter-ufemg" class="space-y-3">
                                <div>
                                    <label for="ufemg-converter-valor-brl" class="block text-sm font-medium">Valor em R$:</label>
                                    <input type="text" id="ufemg-converter-valor-brl" class="form-input-text mt-1 w-full" placeholder="R$ 1.000,00">
                                </div>
                                <div>
                                    <label for="ufemg-converter-ano-base" class="block text-sm font-medium">Ano do Valor (Base):</label>
                                    <input type="number" id="ufemg-converter-ano-base" class="form-input-text mt-1 w-full" placeholder="Ex: 2020">
                                </div>
                                <div>
                                    <label for="ufemg-converter-ano-destino" class="block text-sm font-medium">Ano para Converter (Destino):</label>
                                    <input type="number" id="ufemg-converter-ano-destino" class="form-input-text mt-1 w-full" placeholder="Ex: ${new Date().getFullYear()}">
                                </div>
                                <button id="btn-calcular-conversao-ufemg" class="btn-primary w-full">Converter Valor</button>
                            </div>
                            <div id="ufemg-converter-resultado" class="mt-4 p-3 bg-gray-100 dark:bg-slate-800 rounded-md text-sm hidden"></div>
                        </div>

                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Nota: Para anos anteriores a 1997, o sistema utilizará o valor de 1997 (R$ 0,9108).
                        </p>
                    </div>
                </div>
            </div>
        `;

        addEventListenersUfemg();
    }
    
    async function renderTabelaSelic() {
        if (!mainContentWrapperRef) return;

        const selicData = await getValoresSelic();
        const anos = Object.keys(selicData).sort((a, b) => b - a);
        const mesesAbreviados = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
        
        let tabelaHtml = '';
        if (anos.length > 0) {
            tabelaHtml = `
                <div class="table-list-container max-h-[70vh]">
                    <table class="documentos-table w-full">
                        <thead class="bg-gray-200 dark:bg-slate-700">
                            <tr>
                                <th class="text-center sticky left-0 bg-gray-200 dark:bg-slate-700 z-10 w-24">Ano</th>
                                ${mesesAbreviados.map(mes => `<th class="text-center">${mes.charAt(0).toUpperCase() + mes.slice(1)}</th>`).join('')}
                                <th class="w-20">Ações</th>
                            </tr>
                        </thead>
                        <tbody id="selic-table-body">
                            ${anos.map(ano => `
                                <tr class="border-b dark:border-slate-700" data-ano-row="${ano}">
                                    <td class="py-2 px-3 font-semibold text-center sticky left-0 bg-white dark:bg-slate-800">${ano}</td>
                                    ${mesesAbreviados.map(mes => `
                                        <td class="py-1 px-1">
                                            <input type="text" class="form-input-text text-sm text-right p-1 selic-input" 
                                                   data-ano="${ano}" data-mes="${mes}" 
                                                   value="${formatToPercent(selicData[ano]?.[mes])}">
                                        </td>
                                    `).join('')}
                                    <td class="text-center">
                                         <button class="btn-delete-selic-year text-red-500 hover:text-red-700" data-ano="${ano}" title="Excluir Ano">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-circle-fill" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/></svg>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            tabelaHtml = `<div class="feedback-message warning">Nenhum dado da SELIC encontrado. Por favor, utilize a função "Importar" para carregar os índices.</div>`;
        }
        
        mainContentWrapperRef.innerHTML = `
            <div id="selic-container" class="page-section max-w-none px-4 sm:px-6 lg:px-8">
                 <div class="flex flex-wrap justify-between items-center mb-2 gap-4">
                    <div>
                        <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-100">Tabela de Índices da Taxa SELIC</h2>
                        <p class="text-sm text-gray-600 dark:text-gray-300">
                            Fonte oficial: 
                            <a href="https://www.fazenda.mg.gov.br/empresas/legislacao_tributaria/comunicados/selic.html" 
                               target="_blank" rel="noopener noreferrer" class="link">
                               SEF/MG - Comunicados SELIC
                            </a>
                        </p>
                    </div>
                    <div class="flex gap-2">
                        <button id="btn-exportar-selic" class="btn-secondary">Exportar</button>
                        <button id="btn-importar-selic" class="btn-secondary">Importar</button>
                        <button id="btn-salvar-selic" class="btn-primary">Salvar Alterações</button>
                    </div>
                 </div>

                 <div class="section-box p-4 border dark:border-slate-700 rounded-lg mb-4">
                     <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100">Calculadora de Juros SELIC</h3>
                     <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div>
                            <label for="selic-calc-inicio" class="block text-sm font-medium">Data de Vencimento:</label>
                            <input type="date" id="selic-calc-inicio" class="form-input-text mt-1 text-sm">
                        </div>
                        <div>
                            <label for="selic-calc-fim" class="block text-sm font-medium">Data do Pagamento:</label>
                            <input type="date" id="selic-calc-fim" class="form-input-text mt-1 text-sm">
                        </div>
                        <button id="btn-calcular-selic" class="btn-primary">Calcular</button>
                     </div>
                     <div id="selic-calc-resultado" class="mt-4 p-3 bg-gray-100 dark:bg-slate-800 rounded-md text-sm"></div>
                 </div>

                <div class="section-box p-4 border dark:border-slate-700 rounded-lg mb-4">
                     <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100">Adicionar Novo Ano</h3>
                     <div class="flex items-end gap-2">
                        <div class="flex-grow">
                            <label for="selic-novo-ano" class="block text-sm font-medium dark:text-gray-300">Ano:</label>
                            <input type="number" id="selic-novo-ano" class="form-input-text mt-1 w-full md:w-1/3" placeholder="Ex: ${new Date().getFullYear() + 1}">
                        </div>
                        <button id="btn-adicionar-ano-selic" class="btn-secondary">Adicionar Ano</button>
                     </div>
                </div>
                ${tabelaHtml}
            </div>
        `;
        addEventListenersSelic();
    }

    async function _handleCalcularConversaoUfemg() {
        const valorBrlInput = document.getElementById('ufemg-converter-valor-brl');
        const anoBaseInput = document.getElementById('ufemg-converter-ano-base');
        const anoDestinoInput = document.getElementById('ufemg-converter-ano-destino');
        const resultadoEl = document.getElementById('ufemg-converter-resultado');

        const valorBrl = parseFromBRL(valorBrlInput.value);
        const anoBase = parseInt(anoBaseInput.value, 10);
        const anoDestino = parseInt(anoDestinoInput.value, 10);

        resultadoEl.classList.remove('hidden');

        if (!valorBrl || !anoBase || !anoDestino) {
            resultadoEl.innerHTML = `<p class="text-red-500">Por favor, preencha todos os campos.</p>`;
            return;
        }

        const valorUfemgBase = await buscarValorUfemgPorAno(anoBase);
        const valorUfemgDestino = await buscarValorUfemgPorAno(anoDestino);
        
        if (valorUfemgBase === 0) {
            resultadoEl.innerHTML = `<p class="text-red-500">Não foi possível encontrar o valor da UFEMG para o ano base ${anoBase}.</p>`;
            return;
        }

        const valorEmUfemg = valorBrl / valorUfemgBase;
        const valorFinalBrl = valorEmUfemg * valorUfemgDestino;

        resultadoEl.innerHTML = `
            <div class="space-y-1">
                <p><strong>Valor original:</strong> ${formatToBRL(valorBrl)} (em ${anoBase})</p>
                <p><strong>UFEMG de ${anoBase}:</strong> R$ ${valorUfemgBase.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</p>
                <p><strong>Valor em UFEMG:</strong> ${valorEmUfemg.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</p>
                <hr class="my-2 border-slate-300 dark:border-slate-600">
                <p><strong>UFEMG de ${anoDestino}:</strong> R$ ${valorUfemgDestino.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</p>
                <p class="font-bold text-lg dark:text-green-400 text-green-600">Valor convertido: ${formatToBRL(valorFinalBrl)} (em ${anoDestino})</p>
            </div>
        `;
    }

    function addEventListenersUfemg() {
        const form = document.getElementById('form-add-ufemg');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const anoInput = document.getElementById('ufemg-ano');
            const valorInput = document.getElementById('ufemg-valor');
            const ano = parseInt(anoInput.value, 10);
            const valor = parseFloat(valorInput.value);

            if (!ano || !valor || ano < 1997) {
                uiModuleRef.showToastNotification('Por favor, insira um ano e valor válidos (ano >= 1997).', 'error');
                return;
            }

            try {
                const config = await dbRef.getItemById(ITCD_CONFIG_STORE, UFEMG_KEY) || { key: UFEMG_KEY, value: {} };
                config.value[ano] = valor;
                await dbRef.updateItem(ITCD_CONFIG_STORE, config);
                uiModuleRef.showToastNotification(`Valor da UFEMG para ${ano} salvo com sucesso!`, 'success');
                anoInput.value = '';
                valorInput.value = '';
                await renderTabelaUfemg();
            } catch (error) {
                uiModuleRef.showToastNotification('Erro ao salvar o valor da UFEMG.', 'error');
            }
        });
        
        document.querySelectorAll('.btn-edit-ufemg').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const ano = e.target.dataset.ano;
                const valores = await getValoresUfemg();
                document.getElementById('ufemg-ano').value = ano;
                document.getElementById('ufemg-valor').value = valores[ano];
                document.getElementById('ufemg-valor').focus();
            });
        });
        
        document.querySelectorAll('.btn-delete-ufemg').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const ano = e.target.dataset.ano;
                if(await uiModuleRef.showConfirmationModal('Excluir Valor', `Tem certeza que deseja excluir o valor da UFEMG para o ano de ${ano}?`)) {
                    const config = await dbRef.getItemById(ITCD_CONFIG_STORE, UFEMG_KEY);
                    if (config && config.value && config.value[ano]) {
                        delete config.value[ano];
                        await dbRef.updateItem(ITCD_CONFIG_STORE, config);
                        uiModuleRef.showToastNotification(`Valor para ${ano} excluído.`, 'success');
                        await renderTabelaUfemg();
                    }
                }
            });
        });

        document.getElementById('btn-calcular-conversao-ufemg')?.addEventListener('click', _handleCalcularConversaoUfemg);
        
        const valorBrlInput = document.getElementById('ufemg-converter-valor-brl');
        if(valorBrlInput) {
            valorBrlInput.addEventListener('blur', (e) => e.target.value = formatToBRL(parseFromBRL(e.target.value)));
            valorBrlInput.addEventListener('focus', (e) => {
                const value = parseFromBRL(e.target.value);
                e.target.value = (value !== 0) ? value.toFixed(2).replace('.', ',') : '';
            });
        }
    }
    
    function addEventListenersSelic() {
        const container = document.getElementById('selic-container');
        if (!container) return;

        container.querySelectorAll('.selic-input').forEach(input => {
            input.addEventListener('blur', e => e.target.value = formatToPercent(parseFromPercent(e.target.value)));
            input.addEventListener('focus', e => {
                const value = parseFromPercent(e.target.value);
                e.target.value = (value !== 0) ? value.toString().replace('.', ',') : '';
            });
        });

        document.getElementById('btn-salvar-selic')?.addEventListener('click', async () => {
            uiModuleRef.showLoading(true, "Salvando índices SELIC...");
            const itemsToSave = [];
            document.querySelectorAll('.selic-input').forEach(input => {
                const ano = input.dataset.ano;
                const mesAbrev = input.dataset.mes;
                const mesNum = MESES_MAP[mesAbrev];
                if (mesNum) {
                    const key = `${ano}-${String(mesNum).padStart(2, '0')}`;
                    const valor = parseFromPercent(input.value);
                    itemsToSave.push({ key, valor });
                }
            });
            try {
                // Limpa a store e insere todos os itens novamente.
                // Isso é mais seguro do que tentar fazer um 'put' para cada um,
                // especialmente se houver itens removidos na UI.
                await dbRef.clearStore(dbRef.STORES.ITCD_SELIC_INDICES);
                for (const item of itemsToSave) {
                    await dbRef.addItem(dbRef.STORES.ITCD_SELIC_INDICES, item);
                }
                uiModuleRef.showToastNotification("Índices da SELIC salvos com sucesso!", "success");
            } catch (error) {
                console.error("Erro ao salvar os índices da SELIC:", error);
                uiModuleRef.showToastNotification(`Erro ao salvar os índices da SELIC: ${error.message}`, "error");
            } finally {
                uiModuleRef.showLoading(false);
            }
        });
        
        document.getElementById('btn-exportar-selic')?.addEventListener('click', handleExportarSelic);
        document.getElementById('btn-importar-selic')?.addEventListener('click', handleImportarSelic);
        
        document.getElementById('btn-calcular-selic')?.addEventListener('click', async () => {
            const inicio = document.getElementById('selic-calc-inicio').value;
            const fim = document.getElementById('selic-calc-fim').value;
            const resultadoEl = document.getElementById('selic-calc-resultado');

            if(!inicio || !fim) {
                resultadoEl.innerHTML = `<p class="text-red-500">Por favor, preencha ambas as datas.</p>`;
                return;
            }
            
            const resultado = await buscarValorSelicAcumulado(inicio, fim);
            
            const dataInicio = new Date(inicio + 'T00:00:00');
            const dataFim = new Date(fim + 'T00:00:00');
            const diffTime = dataFim - dataInicio;
            const diasAtraso = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
            
            resultadoEl.innerHTML = `
                <p><strong>Dias em atraso:</strong> ${diasAtraso}</p>
                <p><strong>Taxa SELIC acumulada + 1%:</strong> ${resultado.percentual.toLocaleString('pt-BR', {minimumFractionDigits: 6, maximumFractionDigits: 6})}%</p>
                <p class="text-xs text-gray-500 mt-2">${resultado.justificativa}</p>
            `;
        });


        document.getElementById('btn-adicionar-ano-selic')?.addEventListener('click', () => {
            const anoInput = document.getElementById('selic-novo-ano');
            const ano = parseInt(anoInput.value, 10);
            if (!ano || ano < 1990 || ano > 2100) {
                uiModuleRef.showToastNotification("Por favor, insira um ano válido.", "warning");
                return;
            }
            if (document.querySelector(`tr[data-ano-row="${ano}"]`)) {
                 uiModuleRef.showToastNotification(`O ano ${ano} já existe na tabela.`, "info");
                 return;
            }

            const mesesAbreviados = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
            const newRow = document.createElement('tr');
            newRow.className = 'border-b dark:border-slate-700';
            newRow.dataset.anoRow = ano;
            newRow.innerHTML = `
                <td class="py-2 px-3 font-semibold text-center sticky left-0 bg-white dark:bg-slate-800">${ano}</td>
                ${mesesAbreviados.map(mes => `
                    <td class="py-1 px-1">
                        <input type="text" class="form-input-text text-sm text-right p-1 selic-input" 
                               data-ano="${ano}" data-mes="${mes}" value="">
                    </td>
                `).join('')}
                <td class="text-center">
                     <button class="btn-delete-selic-year text-red-500 hover:text-red-700" data-ano="${ano}" title="Excluir Ano">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-circle-fill" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/></svg>
                    </button>
                </td>
            `;
            const tbody = document.getElementById('selic-table-body');
            
            if (tbody) {
                tbody.insertBefore(newRow, tbody.firstChild);
            } else {
                renderTabelaSelic().then(() => {
                     document.getElementById('selic-table-body').insertBefore(newRow, document.getElementById('selic-table-body').firstChild);
                });
            }
            
            anoInput.value = '';
            newRow.querySelectorAll('.selic-input').forEach(input => {
                 input.addEventListener('blur', e => e.target.value = formatToPercent(parseFromPercent(e.target.value)));
                 input.addEventListener('focus', e => {
                    const value = parseFromPercent(e.target.value);
                    e.target.value = (value !== 0) ? value.toString().replace('.', ',') : '';
                });
            });
        });
        
        container.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.btn-delete-selic-year');
            if(deleteBtn) {
                const ano = deleteBtn.dataset.ano;
                if(confirm(`Tem certeza que deseja excluir todos os dados do ano ${ano}?`)){
                    document.querySelector(`tr[data-ano-row="${ano}"]`).remove();
                    document.getElementById('btn-salvar-selic').click();
                }
            }
        });
    }

    async function buscarValorUfemgPorAno(ano) {
        if (typeof ano !== 'number' || isNaN(ano)) {
            const todosValores = await getValoresUfemg();
            const anosDisponiveis = Object.keys(todosValores).map(Number).filter(y => !isNaN(y));
            if (anosDisponiveis.length === 0) {
                console.error("Nenhum valor de UFEMG encontrado no sistema.");
                return 0;
            }
            anosDisponiveis.sort((a, b) => b - a);
            const anoMaisRecente = anosDisponiveis[0];
            console.warn(`Ano inválido ou não fornecido para buscarValorUfemgPorAno. Utilizando o valor do ano mais recente disponível: ${anoMaisRecente}.`);
            return todosValores[String(anoMaisRecente)];
        }
    
        const anoComoString = String(ano);
        const todosValores = await getValoresUfemg();
        const valor = todosValores[anoComoString];
    
        if (valor !== undefined) {
            return valor;
        }
        
        if (parseInt(anoComoString, 10) < 1997) {
            return todosValores['1997'] || 0.9108;
        }
    
        const anosDisponiveis = Object.keys(todosValores).map(Number).filter(y => !isNaN(y));
        if (anosDisponiveis.length === 0) {
            console.error("Nenhum valor de UFEMG encontrado no sistema.");
            return 0;
        }
        anosDisponiveis.sort((a, b) => b - a);
        const anoMaisRecente = anosDisponiveis[0];
        const valorMaisRecente = todosValores[String(anoMaisRecente)];
        console.warn(`Valor da UFEMG para o ano ${ano} não encontrado. Utilizando o valor do ano mais recente disponível: ${anoMaisRecente}.`);
        
        return valorMaisRecente;
    }
    
    async function buscarValorSelicAcumulado(dataVencimento, dataPagamento) {
        if (!dataVencimento || !dataPagamento || new Date(dataPagamento) <= new Date(dataVencimento)) {
            return { taxa: 0, percentual: 0, justificativa: 'Sem juros (pagamento em dia ou adiantado).' };
        }
    
        const selicData = await getValoresSelic();
        const vencimento = new Date(dataVencimento + 'T00:00:00');
        const pagamento = new Date(dataPagamento + 'T00:00:00');
        
        const mesSubsequenteVenc = new Date(vencimento.getFullYear(), vencimento.getMonth() + 1, 1);
        if (pagamento.getFullYear() === mesSubsequenteVenc.getFullYear() && pagamento.getMonth() === mesSubsequenteVenc.getMonth()) {
            return { taxa: 0.01, percentual: 1, justificativa: 'Pagamento no mês subsequente ao vencimento. Juros de 1%.' };
        }

        let indicesSomados = 0;
        
        let dataCorrente = new Date(vencimento.getFullYear(), vencimento.getMonth() + 2, 1);
    
        while (dataCorrente <= pagamento) {
            const anoCorr = dataCorrente.getFullYear();
            const mesCorr = dataCorrente.getMonth() + 1;
            const mesCorrAbrev = Object.keys(MESES_MAP).find(key => MESES_MAP[key] === mesCorr);
    
            const taxaMesCorr = selicData[String(anoCorr)]?.[mesCorrAbrev] || 0;
            if (taxaMesCorr === 0) {
                console.warn(`Índice SELIC para ${mesCorrAbrev}/${anoCorr} não encontrado ou é zero. Será usado 0 no cálculo.`);
            }
            indicesSomados += taxaMesCorr;
    
            dataCorrente.setMonth(dataCorrente.getMonth() + 1);
        }
    
        const taxaFinal = indicesSomados + 1;
    
        const mesAnoInicio = new Date(vencimento.getFullYear(), vencimento.getMonth() + 2, 1)
                             .toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
        const mesAnoFim = pagamento.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
        
        let justificativa;
        if (indicesSomados > 0) {
             justificativa = `Soma dos índices SELIC de ${mesAnoInicio} a ${mesAnoFim}, mais 1%. ` +
                           `Total da soma SELIC: ${indicesSomados.toLocaleString('pt-BR', {minimumFractionDigits: 6})}%. ` +
                           `Taxa final: ${taxaFinal.toLocaleString('pt-BR', {minimumFractionDigits: 6})}%.`;
        } else {
            justificativa = 'Juros de 1%. Não foram encontrados índices SELIC no período para somar (início da contagem no 2º mês após vencimento).';
        }
    
        return { taxa: taxaFinal / 100, percentual: taxaFinal, justificativa: justificativa };
    }
    
    async function handleExportarSelic() {
        uiModuleRef.showLoading(true, "Exportando dados da SELIC...");
        try {
            const indices = await dbRef.getAllItems(dbRef.STORES.ITCD_SELIC_INDICES);
            const jsonDataString = JSON.stringify({ 'itcdSelicIndicesStore': indices }, null, 2);
            const dirHandle = window.SEFWorkStation.State.getDirectoryHandle();

            if (dirHandle) {
                const dataDirHandle = await dirHandle.getDirectoryHandle('data', { create: true });
                const fileHandle = await dataDirHandle.getFileHandle(SELIC_CONFIG_FILENAME_LOCAL, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(jsonDataString);
                await writable.close();
                uiModuleRef.showToastNotification(`Dados da SELIC salvos em 'data/${SELIC_CONFIG_FILENAME_LOCAL}'.`, "success");
            } else {
                 uiModuleRef.showToastNotification("Pasta da aplicação não definida. Exportando como download.", "info");
                 const blob = new Blob([jsonDataString], { type: 'application/json' });
                 const url = URL.createObjectURL(blob);
                 const a = document.createElement('a');
                 a.href = url;
                 a.download = SELIC_CONFIG_FILENAME_LOCAL;
                 document.body.appendChild(a);
                 a.click();
                 document.body.removeChild(a);
                 URL.revokeObjectURL(url);
            }
        } catch(e) {
            uiModuleRef.showToastNotification(`Erro ao exportar dados da SELIC: ${e.message}`, "error");
        } finally {
            uiModuleRef.showLoading(false);
        }
    }

    async function handleImportarSelic() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const userConfirmed = await uiModuleRef.showConfirmationModal(
                'Confirmar Importação', 'Isto irá substituir todos os dados da SELIC. Deseja continuar?', 'Sim, Importar'
            );
            if (!userConfirmed) return;

            uiModuleRef.showLoading(true, "Importando dados...");
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const jsonData = JSON.parse(event.target.result);
                    const itemsToSave = jsonData['itcdSelicIndicesStore'];
                    if (!itemsToSave || !Array.isArray(itemsToSave)) {
                         throw new Error("Arquivo JSON inválido ou não contém a chave 'itcdSelicIndicesStore' com um array de dados.");
                    }

                    await dbRef.clearStore(dbRef.STORES.ITCD_SELIC_INDICES);
                    for (const item of itemsToSave) {
                        if (item.key && item.valor !== undefined) {
                           await dbRef.addItem(dbRef.STORES.ITCD_SELIC_INDICES, item);
                        }
                    }
                    
                    uiModuleRef.showToastNotification("Dados da SELIC importados com sucesso!", "success");
                    await renderTabelaSelic();
                } catch(err) {
                    uiModuleRef.showToastNotification(`Falha na importação: ${err.message}`, "error");
                } finally {
                    uiModuleRef.showLoading(false);
                }
            };
            reader.readAsText(file);
        };
        fileInput.click();
    }


    return {
        init,
        renderTabelaUfemg,
        renderTabelaSelic,
        buscarValorUfemgPorAno,
        buscarValorSelicAcumulado
    };

})();