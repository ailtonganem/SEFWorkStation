// js/itcd/calculo/causaMortis.js - Módulo para Cálculo de ITCD Causa Mortis
// v20.3.0 - ALTERADO: O campo "Particulares (Concorrência)" no resumo agora exibe o valor total do quinhão do cônjuge sobre os bens particulares, conforme o direito sucessório legal.
// v20.2.0 - CORREÇÃO CRÍTICA: A função _handleAplicarPartilhaFinal agora adiciona um participante 'Cônjuge' implícito.
// v20.1.0 - CORREÇÃO CRÍTICA: Refeita a lógica da função `_handleAplicarPartilhaFinal` para partilha distinta de bens comuns e particulares.
// ... (histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ITCD = window.SEFWorkStation.ITCD || {};
window.SEFWorkStation.ITCD.Calculo = window.SEFWorkStation.ITCD.Calculo || {};

window.SEFWorkStation.ITCD.Calculo.CausaMortis = (function() {

    let mainContentWrapperRef;
    let appModuleRef;
    let uiModuleRef;
    let dbRef;

    let bensDoCalculo = [];
    let herdeirosDoCalculo = [];
    let renunciasPorDeterminacao = [];
    let pagamentosAnterioresDoCalculo = [];
    let calculoAtualId = null;
    let isEditMode = true;
    let ultimoResultadoCalculado = null; 

    const TIPOS_DE_BENS_PRINCIPAIS = [
        { key: 'imovel', label: 'Imóveis', isDeducao: false, isNaoTributavel: false },
        { key: 'movel', label: 'Bens Móveis', isDeducao: false, isNaoTributavel: false },
        { key: 'divida', label: 'Dívidas', isDeducao: true, isNaoTributavel: true },
        { key: 'despesa_funeraria', label: 'Despesas Funerárias', isDeducao: true, isNaoTributavel: true },
        { key: 'adiantamento_legitima', label: 'Adiantamento da Legítima', isDeducao: false, isNaoTributavel: true },
        { key: 'isento_nao_incidencia', label: 'Isento / Não Incidência', isDeducao: false, isNaoTributavel: true }
    ];
    
    function formatBRL(value) {
        if (isNaN(value) || value === null || value === undefined) return 'R$ 0,00';
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    
    function formatUFEMG(value) {
        if (isNaN(value) || value === null || value === undefined) return 'N/A';
        return value.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    }

    function parseFromBRL(value) {
        if (!value || typeof value !== 'string') return 0;
        return parseFloat(value.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    }

    function init(app, ui, db) {
        appModuleRef = app;
        uiModuleRef = ui;
        dbRef = db;
        mainContentWrapperRef = document.querySelector('.main-content-wrapper');
        if (window.SEFWorkStation.ITCD.Calculo.DiferencaPartilha && typeof window.SEFWorkStation.ITCD.Calculo.DiferencaPartilha.init === 'function') {
            window.SEFWorkStation.ITCD.Calculo.DiferencaPartilha.init(db);
        }
        console.log("Módulo ITCD.Calculo.CausaMortis inicializado (v20.3.0).");
    }

    function _validarDadosParaSalvar() {
        const erros = [];
        if (!document.getElementById('calc-de-cujus')?.value.trim()) {
            erros.push("O nome do 'De Cujus' é obrigatório.");
        }
        if (!document.getElementById('calc-fato-gerador')?.value) {
            erros.push("A 'Data do Fato Gerador (óbito)' é obrigatória.");
        }
        if (herdeirosDoCalculo.length === 0) {
            erros.push("É necessário adicionar pelo menos um herdeiro.");
        }
        if (bensDoCalculo.length === 0) {
            erros.push("É necessário adicionar pelo menos um bem/direito.");
        }

        if (erros.length > 0) {
            uiModuleRef.showToastNotification(erros.join('\n'), "error", 0);
            return false;
        }
        return true;
    }
    
    async function salvarCalculoAtual() {
        if (!dbRef) {
            uiModuleRef.showToastNotification("Erro: A conexão com o banco de dados não está disponível.", "error");
            return;
        }

        if (!_validarDadosParaSalvar()) {
            return;
        }
        
        try {
            await executarCalculoCompleto(); 

            const calculoData = {
                id: calculoAtualId || appModuleRef.generateUUID(),
                tipoCalculo: 'causaMortis',
                declaracaoNumero: document.getElementById('calc-dbd-numero')?.value || '',
                dataFatoGerador: document.getElementById('calc-fato-gerador')?.value || '',
                dataPagamento: document.getElementById('calc-data-pagamento')?.value || '',
                deCujusNome: document.getElementById('calc-de-cujus')?.value || '',
                estadoCivil: document.getElementById('calc-estado-civil')?.value || '',
                regimeBens: document.getElementById('calc-regime-bens')?.value || '',
                concorrenciaUE: document.getElementById('calc-concorrencia-ue')?.value || '',
                conjugeAscendenteFilhos: document.querySelector('input[name="conjuge-ascendente-filhos"]:checked')?.value || null,
                tipoInventario: document.querySelector('input[name="tipo-inventario"]:checked')?.value || null,
                transitoJulgado: document.getElementById('calc-transito-julgado')?.value === 'sim',
                dataTransitoJulgado: document.getElementById('calc-data-transito-julgado')?.value || '',
                dataVencimentoPartilha: document.getElementById('calc-vencimento-partilha')?.value || '',
                houveTestamento: document.getElementById('check-testamento')?.checked || false,
                haHerdeirosNecessarios: document.querySelector('input[name="herdeiros-necessarios"]:checked')?.value === 'sim',
                houveRenunciaMonte: document.getElementById('check-renuncia-monte')?.checked || false,
                houveRenunciaDeterminacao: document.getElementById('check-renuncia-determinacao')?.checked || false,
                renunciaFormalizadaAutos: document.querySelector('input[name="renuncia-formalizada-autos"]:checked')?.value || 'nao',
                renunciasPorDeterminacao: renunciasPorDeterminacao,
                houvePagamentoAnterior: document.getElementById('check-pagamento-anterior')?.checked || false,
                pagamentosAnteriores: pagamentosAnterioresDoCalculo,
                houveRecolhimentoPrevio: document.getElementById('check-recolhimento-previo')?.checked || false,
                valorRecolhido: parseFromBRL(document.getElementById('calc-valor-recolhido')?.value || '0'),
                dataRecolhimentoPrevio: document.getElementById('calc-data-recolhimento')?.value || '',
                calcularDescontoSobreRecolhido: document.getElementById('check-desconto-sobre-recolhido')?.checked || false,
                isencaoImovelAte2007Confirmada: document.getElementById('check-isencao-imovel-ate2007')?.checked || false,
                bens: bensDoCalculo,
                herdeiros: herdeirosDoCalculo,
                dataSalvamento: new Date().toISOString(),
                resultadoFinal: ultimoResultadoCalculado
            };

            await dbRef.updateItem(dbRef.STORES.ITCD_CALCULOS, calculoData);
            calculoAtualId = calculoData.id;
            uiModuleRef.showToastNotification("Cálculo salvo com sucesso!", "success");
            appModuleRef.handleMenuAction('itcd-visualizar-calculo', { calculoId: calculoData.id });
        } catch (error) {
            console.error("Erro ao salvar o cálculo:", error);
            uiModuleRef.showToastNotification(`Falha ao salvar o cálculo: ${error.message}`, "error", 0);
        }
    }

    function resetarPartilhas() {
        if (bensDoCalculo.length > 0) {
            bensDoCalculo.forEach(bem => {
                bem.partilha = {};
            });
            uiModuleRef.showToastNotification("A partilha dos bens foi reiniciada devido à mudança no cenário da sucessão.", "info", 3500);
        }
    }

    function renderFormCausaMortis(calculoExistente = null, startInEditMode = true) {
        if (!mainContentWrapperRef) {
            console.error("ITCD.Calculo.CausaMortis: O contêiner de conteúdo principal não está definido.");
            return;
        }
        
        isEditMode = startInEditMode;

        if (calculoExistente && typeof calculoExistente === 'object') {
            calculoAtualId = calculoExistente.id;
            bensDoCalculo = JSON.parse(JSON.stringify(calculoExistente.bens || [])); 
            herdeirosDoCalculo = JSON.parse(JSON.stringify(calculoExistente.herdeiros || []));
            renunciasPorDeterminacao = JSON.parse(JSON.stringify(calculoExistente.renunciasPorDeterminacao || []));
            pagamentosAnterioresDoCalculo = JSON.parse(JSON.stringify(calculoExistente.pagamentosAnteriores || []));
            ultimoResultadoCalculado = calculoExistente.resultadoFinal || null;
        } else {
            calculoAtualId = null;
            bensDoCalculo = [];
            herdeirosDoCalculo = [];
            renunciasPorDeterminacao = [];
            pagamentosAnterioresDoCalculo = [];
            ultimoResultadoCalculado = null;
        }
        
        const hoje = new Date().toISOString().split('T')[0];
        const lastDayOfYear = new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0];

        const actionButtonsHtml = `
            <button id="btn-voltar-calculo-hub" class="btn-secondary btn-sm">Voltar</button>
            ${!isEditMode ? `<button id="btn-habilitar-edicao" class="btn-primary btn-sm">Habilitar Edição</button>` : ''}
        `;
        
        const pagamentosAnterioresHtml = `
            <div id="container-pagamento-anterior" class="hidden mt-2 border-l-2 pl-4 border-indigo-200 dark:border-indigo-800">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div>
                        <label for="pag-ant-valor" class="block text-xs font-medium">Valor (R$):</label>
                        <input type="text" id="pag-ant-valor" class="form-input-text mt-1 text-sm currency-input" placeholder="R$ 0,00">
                    </div>
                    <div>
                        <label for="pag-ant-data" class="block text-xs font-medium">Data do Pagamento:</label>
                        <input type="date" id="pag-ant-data" class="form-input-text mt-1 text-sm">
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-xs font-medium">Referente a:</label>
                        <div class="flex items-center gap-4 mt-1">
                            <label class="inline-flex items-center"><input type="radio" name="pag-ant-tipo" value="causaMortis" class="form-radio h-4 w-4" checked><span class="ml-1.5 text-sm">Causa Mortis</span></label>
                            <label class="inline-flex items-center"><input type="radio" name="pag-ant-tipo" value="diferencaPartilha" class="form-radio h-4 w-4"><span class="ml-1.5 text-sm">Diferença de Partilha</span></label>
                        </div>
                    </div>
                </div>
                <button type="button" id="btn-adicionar-pagamento-anterior" class="btn-secondary btn-sm mt-3">Adicionar Pagamento</button>
                <div class="mt-4">
                    <h5 class="text-sm font-semibold">Pagamentos Adicionados:</h5>
                    <ul id="lista-pagamentos-anteriores" class="mt-2 space-y-1 text-sm"></ul>
                </div>
            </div>
        `;

        const pageHtml = `
            <div id="itcd-calculo-causa-mortis-container" class="page-section max-w-none px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-100">Cálculo do ITCD - Causa Mortis</h2>
                        <p class="text-sm text-gray-600 dark:text-gray-300">${isEditMode ? 'Preencha os dados abaixo para apurar o imposto.' : 'Modo de visualização. Habilite a edição para alterar os dados.'}</p>
                    </div>
                    <div class="flex gap-2">${actionButtonsHtml}</div>
                </div>
                <div id="feedback-calculo-causa-mortis" class="mb-4"></div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div class="lg:col-span-2 space-y-6">
                        <!-- Seção de Dados da Declaração e Herdeiros -->
                        <fieldset id="fieldset-declaracao-herdeiros" class="section-box p-4 border dark:border-slate-700 rounded-lg">
                            <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100">Dados da Declaração</h3>
                            <div class="space-y-4">
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label for="calc-dbd-numero" class="block text-sm font-medium">Nº da Declaração (DBD):</label>
                                        <input type="text" id="calc-dbd-numero" class="form-input-text mt-1" placeholder="Número da DBD" value="${calculoExistente?.declaracaoNumero || ''}">
                                    </div>
                                    <div>
                                        <label for="calc-fato-gerador" class="block text-sm font-medium">Data do Fato Gerador (óbito):</label>
                                        <input type="date" id="calc-fato-gerador" class="form-input-text mt-1" value="${calculoExistente?.dataFatoGerador || ''}">
                                    </div>
                                    <div class="md:col-span-2">
                                         <div id="display-legislacao-aplicavel" class="text-xs text-blue-600 dark:text-blue-400 font-semibold"></div>
                                    </div>
                                    <div class="md:col-span-2">
                                        <label for="calc-de-cujus" class="block text-sm font-medium">De Cujus (falecido):</label>
                                        <input type="text" id="calc-de-cujus" class="form-input-text mt-1" placeholder="Nome completo do falecido" value="${calculoExistente?.deCujusNome || ''}">
                                    </div>
                                    <div>
                                        <label for="calc-estado-civil" class="block text-sm font-medium">Estado Civil:</label>
                                        <select id="calc-estado-civil" class="form-input-text mt-1">
                                            <option value="">Selecione...</option>
                                            <option value="solteiro" ${calculoExistente?.estadoCivil === 'solteiro' ? 'selected' : ''}>Solteiro(a)</option>
                                            <option value="casado" ${calculoExistente?.estadoCivil === 'casado' ? 'selected' : ''}>Casado(a)</option>
                                            <option value="viuvo" ${calculoExistente?.estadoCivil === 'viuvo' ? 'selected' : ''}>Viúvo(a)</option>
                                            <option value="separado" ${calculoExistente?.estadoCivil === 'separado' ? 'selected' : ''}>Separado(a)/Divorciado(a)</option>
                                        </select>
                                    </div>
                                    <div id="container-regime-bens" class="hidden">
                                         <label for="calc-regime-bens" class="block text-sm font-medium">Regime de Bens:</label>
                                         <select id="calc-regime-bens" class="form-input-text mt-1">
                                            <option value="">Selecione...</option>
                                            <option value="comunhao_universal" ${calculoExistente?.regimeBens === 'comunhao_universal' ? 'selected' : ''}>Comunhão Universal de Bens</option>
                                            <option value="comunhao_parcial" ${calculoExistente?.regimeBens === 'comunhao_parcial' ? 'selected' : ''}>Comunhão Parcial de Bens</option>
                                            <option value="separacao_obrigatoria" ${calculoExistente?.regimeBens === 'separacao_obrigatoria' ? 'selected' : ''}>Separação Obrigatória de Bens</option>
                                            <option value="separacao_convencional" ${calculoExistente?.regimeBens === 'separacao_convencional' ? 'selected' : ''}>Separação Convencional de Bens</option>
                                            <option value="uniao_estavel_parcial" ${calculoExistente?.regimeBens === 'uniao_estavel_parcial' ? 'selected' : ''}>União Estável (Comunhão Parcial)</option>
                                            <option value="uniao_estavel_cc1790" ${calculoExistente?.regimeBens === 'uniao_estavel_cc1790' ? 'selected' : ''}>União Estável (Art. 1.790 CC/02)</option>
                                         </select>
                                    </div>
                                    <div id="container-concorrencia-ue" class="hidden md:col-span-2">
                                        <label for="calc-concorrencia-ue" class="block text-sm font-medium">Tipo de Concorrência na União Estável (Art. 1.790):</label>
                                        <select id="calc-concorrencia-ue" class="form-input-text mt-1">
                                            <option value="filhos_comuns" ${calculoExistente?.concorrenciaUE === 'filhos_comuns' ? 'selected' : ''}>Com filhos comuns</option>
                                            <option value="descendentes_transmitente" ${calculoExistente?.concorrenciaUE === 'descendentes_transmitente' ? 'selected' : ''}>Com descendentes só do transmitente</option>
                                            <option value="outros_parentes" ${calculoExistente?.concorrenciaUE === 'outros_parentes' ? 'selected' : ''}>Com outros parentes sucessíveis</option>
                                            <option value="sem_parentes" ${calculoExistente?.concorrenciaUE === 'sem_parentes' ? 'selected' : ''}>Sem parentes sucessíveis</option>
                                        </select>
                                    </div>
                                     <div id="container-conjuge-ascendente-filhos" class="hidden md:col-span-2 p-3 border-l-2 pl-4 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 rounded-r-md">
                                        <label class="block text-sm font-medium">O cônjuge/companheiro(a) é ascendente de todos os herdeiros descendentes?</label>
                                        <div class="flex items-center gap-4 mt-2">
                                            <label class="inline-flex items-center"><input type="radio" name="conjuge-ascendente-filhos" value="sim" class="form-radio h-4 w-4" ${calculoExistente?.conjugeAscendenteFilhos === 'sim' ? 'checked' : ''}><span class="ml-1.5 text-sm">Sim</span></label>
                                            <label class="inline-flex items-center"><input type="radio" name="conjuge-ascendente-filhos" value="nao" class="form-radio h-4 w-4" ${calculoExistente?.conjugeAscendenteFilhos === 'nao' ? 'checked' : ''}><span class="ml-1.5 text-sm">Não</span></label>
                                        </div>
                                        <p class="text-xs text-gray-500 mt-1">Esta informação é usada para aplicar a regra da reserva de 1/4 da herança para o cônjuge.</p>
                                    </div>
                                    <div class="md:col-span-2">
                                        <label class="block text-sm font-medium">Tipo de Inventário:</label>
                                        <div class="flex items-center gap-4 mt-2">
                                            <label class="inline-flex items-center"><input type="radio" name="tipo-inventario" value="judicial" class="form-radio h-4 w-4" ${calculoExistente?.tipoInventario === 'judicial' || !calculoExistente ? 'checked' : ''}><span class="ml-1.5 text-sm">Judicial</span></label>
                                            <label class="inline-flex items-center"><input type="radio" name="tipo-inventario" value="extrajudicial" class="form-radio h-4 w-4" ${calculoExistente?.tipoInventario === 'extrajudicial' ? 'checked' : ''}><span class="ml-1.5 text-sm">Extrajudicial</span></label>
                                        </div>
                                    </div>
                                    <div id="container-transito-julgado" class="hidden">
                                        <label for="calc-transito-julgado" class="block text-sm font-medium">Houve Trânsito em Julgado?</label>
                                        <select id="calc-transito-julgado" class="form-input-text mt-1">
                                            <option value="nao" ${calculoExistente?.transitoJulgado === false ? 'selected' : ''}>Não</option>
                                            <option value="sim" ${calculoExistente?.transitoJulgado === true ? 'selected' : ''}>Sim</option>
                                        </select>
                                    </div>
                                    <div id="container-data-transito-julgado" class="hidden">
                                        <label for="calc-data-transito-julgado" class="block text-sm font-medium">Data do Trânsito em Julgado:</label>
                                        <input type="date" id="calc-data-transito-julgado" class="form-input-text mt-1" value="${calculoExistente?.dataTransitoJulgado || ''}">
                                    </div>
                                    <div class="md:col-span-2 border-t pt-3 dark:border-slate-600">
                                        <label class="block text-sm font-medium mb-2">Opções Adicionais:</label>
                                        <div class="flex flex-col flex-wrap gap-y-2">
                                            <div class="flex flex-wrap gap-x-4 gap-y-2 items-center">
                                                <label class="inline-flex items-center"><input type="checkbox" id="check-testamento" class="form-checkbox h-4 w-4" ${calculoExistente?.houveTestamento ? 'checked' : ''}><span class="ml-1.5 text-sm">Houve Testamento</span></label>
                                                <label class="inline-flex items-center"><input type="checkbox" id="check-renuncia-monte" class="form-checkbox h-4 w-4" ${calculoExistente?.houveRenunciaMonte ? 'checked' : ''}><span class="ml-1.5 text-sm">Renúncia ao monte-mor</span></label>
                                                <div class="inline-flex items-center">
                                                    <label class="inline-flex items-center">
                                                        <input type="checkbox" id="check-renuncia-determinacao" class="form-checkbox h-4 w-4" ${calculoExistente?.houveRenunciaDeterminacao ? 'checked' : ''}>
                                                        <span class="ml-1.5 text-sm">Renúncia com determinação</span>
                                                    </label>
                                                    <button type="button" id="tooltip-renuncia-determinacao" class="ml-1 p-0.5 text-gray-400 hover:text-blue-500 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400" title="Informação sobre Renúncia com Determinação">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-question-circle-fill" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M5.496 6.033h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286a.237.237 0 0 0 .241.247zm2.325 6.443c.61 0 1.029-.394 1.029-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94 0 .533.425.927 1.01.927z"/></svg>
                                                    </button>
                                                </div>
                                                <label class="inline-flex items-center"><input type="checkbox" id="check-pagamento-anterior" class="form-checkbox h-4 w-4" ${calculoExistente?.houvePagamentoAnterior ? 'checked' : ''}><span class="ml-1.5 text-sm">Houve pagamento anterior</span></label>
                                                <label class="inline-flex items-center"><input type="checkbox" id="check-recolhimento-previo" class="form-checkbox h-4 w-4" ${calculoExistente?.houveRecolhimentoPrevio ? 'checked' : ''}><span class="ml-1.5 text-sm">Houve recolhimento prévio</span></label>
                                            </div>
                                            <div id="container-herdeiros-necessarios" class="hidden mt-2 p-3 border-l-2 pl-4 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/40 rounded-r-md">
                                                <label class="block text-sm font-medium">Há herdeiros necessários (descendentes, ascendentes, cônjuge)?</label>
                                                <div class="flex items-center gap-4 mt-2">
                                                    <label class="inline-flex items-center"><input type="radio" name="herdeiros-necessarios" value="sim" class="form-radio h-4 w-4" ${calculoExistente?.haHerdeirosNecessarios === true ? 'checked' : ''}><span class="ml-1.5 text-sm">Sim</span></label>
                                                    <label class="inline-flex items-center"><input type="radio" name="herdeiros-necessarios" value="nao" class="form-radio h-4 w-4" ${calculoExistente?.haHerdeirosNecessarios === false ? 'checked' : ''}><span class="ml-1.5 text-sm">Não</span></label>
                                                </div>
                                            </div>
                                            <div id="container-isencao-imovel-ate2007" class="hidden mt-2 p-3 border-l-2 pl-4 border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/40 rounded-r-md">
                                                <label class="block text-sm font-medium mb-2">Confirmação de Isenção do Imóvel Residencial (Lei 14.941/03, até 2007)</label>
                                                <p class="text-xs text-gray-700 dark:text-gray-300">O sistema detectou que este espólio pode ter direito à isenção do único imóvel residencial (alínea "a" do Art. 3º, I). Para aplicar, confirme a condição:</p>
                                                <label class="inline-flex items-center mt-2">
                                                    <input type="checkbox" id="check-isencao-imovel-ate2007" class="form-checkbox h-4 w-4" ${calculoExistente?.isencaoImovelAte2007Confirmada ? 'checked' : ''}>
                                                    <span class="ml-2 text-sm text-gray-800 dark:text-gray-200">Confirmo que os familiares beneficiados não possuem outro imóvel.</span>
                                                </label>
                                            </div>
                                            ${pagamentosAnterioresHtml}
                                            <div id="container-recolhimento-previo" class="hidden mt-2 space-y-2 border-l-2 pl-4 border-blue-200 dark:border-blue-800">
                                                <div class="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label for="calc-valor-recolhido" class="block text-xs font-medium">Valor Recolhido:</label>
                                                        <input type="text" id="calc-valor-recolhido" class="form-input-text mt-1 text-sm currency-input" placeholder="R$ 0,00" value="${calculoExistente?.valorRecolhido ? formatBRL(calculoExistente.valorRecolhido) : ''}">
                                                    </div>
                                                    <div>
                                                        <label for="calc-data-recolhimento" class="block text-xs font-medium">Data do Recolhimento:</label>
                                                        <input type="date" id="calc-data-recolhimento" class="form-input-text mt-1 text-sm" value="${calculoExistente?.dataRecolhimentoPrevio || ''}">
                                                    </div>
                                                </div>
                                                <div id="container-tipo-desconto" class="hidden">
                                                    <label class="inline-flex items-center text-xs">
                                                        <input type="checkbox" id="check-desconto-sobre-recolhido" class="form-checkbox h-3 w-3" ${calculoExistente?.calcularDescontoSobreRecolhido ? 'checked' : ''}>
                                                        <span class="ml-1.5">Calcular desconto de 15% sobre o valor recolhido</span>
                                                    </label>
                                                    <p class="text-xs text-gray-500 ml-5">Use se o recolhimento prévio corresponde a 85% do imposto devido.</p>
                                                </div>
                                            </div>
                                            <div id="container-renuncia-determinacao" class="hidden mt-2 p-3 border-l-2 pl-4 border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/40 rounded-r-md">
                                                <h4 class="text-sm font-semibold mb-2">Configurar Renúncia com Determinação</h4>
                                                <div class="grid grid-cols-1 md:grid-cols-2 gap-2 items-end">
                                                    <div>
                                                        <label for="renuncia-de" class="block text-xs font-medium">De (Renunciante):</label>
                                                        <select id="renuncia-de" class="form-input-text text-sm"></select>
                                                    </div>
                                                    <div>
                                                        <label for="renuncia-para" class="block text-xs font-medium">Para (Beneficiário):</label>
                                                        <select id="renuncia-para" class="form-input-text text-sm"></select>
                                                    </div>
                                                </div>
                                                <div class="mt-2 text-sm flex flex-wrap gap-x-4 gap-y-2">
                                                    <div>
                                                        <label class="block text-xs font-medium mb-1">Tipo de Renúncia/Cessão:</label>
                                                        <div class="flex items-center gap-4">
                                                            <label class="inline-flex items-center"><input type="radio" name="tipo-renuncia-determinacao" value="total" class="form-radio h-4 w-4" checked><span class="ml-1.5">Total</span></label>
                                                            <label class="inline-flex items-center"><input type="radio" name="tipo-renuncia-determinacao" value="parcial" class="form-radio h-4 w-4"><span class="ml-1.5">Parcial</span></label>
                                                        </div>
                                                    </div>
                                                    <div id="container-percentual-renuncia" class="hidden">
                                                        <label for="percentual-renuncia" class="block text-xs font-medium">Percentual (%):</label>
                                                        <input type="number" id="percentual-renuncia" class="form-input-text text-sm w-28" min="0.01" max="100" step="0.01" placeholder="Ex: 50">
                                                    </div>
                                                    <div class="self-end">
                                                        <button type="button" id="btn-adicionar-renuncia" class="btn-secondary btn-sm">Adicionar</button>
                                                    </div>
                                                </div>
                                                <ul id="lista-renuncias-configuradas" class="mt-3 space-y-1 text-sm"></ul>
                                                <div id="container-renuncia-formalizada-autos" class="mt-2 text-sm border-t pt-2 dark:border-slate-600">
                                                    <label class="block text-xs font-medium mb-1">A renúncia/cessão será formalizada nos autos do inventário?</label>
                                                    <div class="flex items-center gap-4">
                                                        <label class="inline-flex items-center"><input type="radio" name="renuncia-formalizada-autos" value="sim" class="form-radio h-4 w-4" ${calculoExistente?.renunciaFormalizadaAutos === 'sim' ? 'checked' : ''}><span class="ml-1.5">Sim</span></label>
                                                        <label class="inline-flex items-center"><input type="radio" name="renuncia-formalizada-autos" value="nao" class="form-radio h-4 w-4" ${!calculoExistente || calculoExistente.renunciaFormalizadaAutos !== 'sim' ? 'checked' : ''}><span class="ml-1.5">Não</span></label>
                                                    </div>
                                                    <p class="text-xs text-gray-500 mt-1">Se 'Sim', o vencimento do imposto sobre a doação será o mesmo do causa mortis.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="md:col-span-2 border-t pt-4 dark:border-slate-600">
                                     <div class="flex justify-between items-center mb-3">
                                        <h3 class="text-lg font-medium text-gray-800 dark:text-gray-100">Herdeiros e Legatários</h3>
                                        <button id="btn-adicionar-herdeiro" class="btn-secondary btn-sm">Adicionar</button>
                                    </div>
                                     <div id="lista-herdeiros" class="space-y-2">
                                        <p class="text-sm text-center text-gray-500 dark:text-gray-400 p-4">Nenhum herdeiro adicionado.</p>
                                    </div>
                                </div>
                            </div>
                        </fieldset>

                        <fieldset id="fieldset-bens" class="section-box p-4 border dark:border-slate-700 rounded-lg">
                            <div class="flex justify-between items-center mb-3">
                                <h3 class="text-lg font-medium text-gray-800 dark:text-gray-100">Bens e Direitos do Espólio</h3>
                                <button id="btn-adicionar-bem" class="btn-primary btn-sm">Adicionar Bem/Direito</button>
                            </div>
                            <!-- Ações de Partilha em Lote -->
                            <div id="container-acoes-partilha" class="hidden my-4 p-3 bg-gray-100 dark:bg-slate-800 rounded-md">
                                <div class="flex flex-wrap items-center justify-between gap-2">
                                    <label class="inline-flex items-center text-sm">
                                        <input type="checkbox" id="selecionar-todos-bens-partilha" class="form-checkbox h-4 w-4">
                                        <span class="ml-2">Selecionar Todos</span>
                                    </label>
                                    <div class="flex items-center gap-2">
                                        <button id="btn-aplicar-partilha-legal" class="btn-secondary btn-sm text-xs">Aplicar Partilha Final (nos selecionados)</button>
                                        <button id="btn-abrir-partilha-seletiva" class="btn-secondary btn-sm text-xs">Definir Partilha Manual (nos selecionados)</button>
                                    </div>
                                </div>
                            </div>
                            <div id="lista-bens-direitos" class="space-y-3">
                                <p class="text-sm text-center text-gray-500 dark:text-gray-400 p-4">Nenhum bem adicionado.</p>
                            </div>
                        </fieldset>
                    </div>

                    <div class="lg:col-span-1">
                        <fieldset id="fieldset-resumo" class="section-box p-4 border dark:border-slate-700 rounded-lg sticky top-24">
                            <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100">Resumo do Cálculo</h3>
                            <div id="resumo-calculo-container" class="space-y-2 text-sm">
                                <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">TOTAL DE BENS AVALIADOS:</span> <span id="resumo-total-bens" class="font-semibold text-gray-800 dark:text-gray-100">0,0000</span></div>
                                <div class="text-right -mt-1"><span id="resumo-total-bens-real" class="text-xs text-gray-500 dark:text-gray-400">R$ 0,00</span></div>
                                <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">TOTAL BENS TRANSMITIDOS:</span> <span id="resumo-total-bens-transmitidos" class="font-semibold text-gray-800 dark:text-gray-100">0,0000</span></div>
                                <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Total Isentos/Não Trib.:</span> <span id="resumo-total-isentos" class="font-semibold text-gray-800 dark:text-gray-100">0,0000</span></div>
                                <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Bens Comuns:</span> <span id="resumo-bens-comuns" class="font-semibold text-gray-800 dark:text-gray-100">0,0000</span></div>
                                <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Bens Particulares:</span> <span id="resumo-bens-particulares" class="font-semibold text-gray-800 dark:text-gray-100">0,0000</span></div>
                                <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Meação:</span> <span id="resumo-meacao" class="font-semibold text-gray-800 dark:text-gray-100">0,0000</span></div>
                                <div class="flex justify-between text-blue-700 dark:text-blue-300"><span class="font-semibold">Particulares (Concorrência):</span> <span id="resumo-concorrencia-particulares" class="font-bold">0,0000</span></div>
                                <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Herança Líquida:</span> <span id="resumo-quinhao-hereditario" class="font-semibold text-gray-800 dark:text-gray-100">0,0000</span></div>
                                <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Qtde. Herdeiros (p/ partilha):</span> <span id="resumo-qtde-herdeiros" class="font-semibold text-gray-800 dark:text-gray-100">0</span></div>
                                <div id="container-resumo-testamento" class="hidden space-y-1 pt-2 mt-1 border-t dark:border-slate-600">
                                    <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Total Legado (UFEMG):</span> <span id="resumo-total-legado" class="font-semibold text-gray-800 dark:text-gray-100">0,0000</span></div>
                                    <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Limite Disponível (UFEMG):</span> <span id="resumo-limite-disponivel" class="font-semibold text-gray-800 dark:text-gray-100">0,0000</span></div>
                                </div>
                                <div class="flex justify-between pt-2 border-t dark:border-slate-600"><span class="text-gray-600 dark:text-gray-400">Valor da UFEMG (venc.):</span> <span id="resumo-valor-ufemg" class="font-semibold text-gray-800 dark:text-gray-100">0,0000</span></div>
                                <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Vencimento:</span> <input type="date" id="calc-vencimento-itcd" class="form-input-text text-sm p-1 ml-2 flex-grow bg-gray-200 dark:bg-slate-700" readonly></div>
                            </div>
                            
                            <div id="calculo-causa-mortis-detalhes" class="mt-4 pt-3 border-t dark:border-slate-600">
                                <h4 class="font-semibold mb-2 text-gray-800 dark:text-gray-100">Dados do Cálculo Causa Mortis</h4>
                                <div class="space-y-1 text-sm">
                                    <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Base de Cálculo (UFEMG):</span> <span class="font-medium text-gray-800 dark:text-gray-100" id="res-base-ufemg">0,0000</span></div>
                                    <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Base de Cálculo (R$):</span> <span class="font-medium text-gray-800 dark:text-gray-100" id="res-base-reais">R$ 0,00</span></div>
                                    <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Alíquota:</span> <span class="font-medium text-gray-800 dark:text-gray-100" id="res-aliquota">0%</span></div>
                                    <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">ITCD Principal:</span> <span class="font-medium text-gray-800 dark:text-gray-100" id="res-itcd-principal">R$ 0,00</span></div>
                                    <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Pagamento Anterior:</span> <span class="font-medium text-gray-800 dark:text-gray-100" id="res-pagamento-anterior">R$ 0,00</span></div>
                                    <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Desconto:</span> <span class="font-medium text-gray-800 dark:text-gray-100" id="res-desconto">R$ 0,00</span></div>
                                    <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Multa:</span> <span class="font-medium text-gray-800 dark:text-gray-100" id="res-multa">R$ 0,00</span></div>
                                    <div class="flex justify-between items-center"><span class="text-gray-600 dark:text-gray-400">Juros (<span id="res-percentual-juros">0.00</span>%):</span> <span class="font-medium text-gray-800 dark:text-gray-100" id="res-juros">R$ 0,00</span></div>
                                    <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Recolhimento Prévio:</span> <span class="font-medium text-gray-800 dark:text-gray-100" id="res-recolhimento-previo">R$ 0,00</span></div>
                                    <div class="flex justify-between font-bold"><span class="dark:text-gray-300">Imposto a Recolher:</span> <span class="text-gray-900 dark:text-gray-100" id="res-imposto-a-recolher">R$ 0,00</span></div>
                                </div>
                                <div id="justificativa-calculo-container" class="mt-3"></div>
                                <div class="mt-3 pt-2 border-t dark:border-slate-600">
                                    <label for="calc-data-pagamento" class="block text-sm font-medium">Data do Pagamento:</label>
                                    <input type="date" id="calc-data-pagamento" class="form-input-text mt-1 text-sm" value="${calculoExistente?.dataPagamento || hoje}">
                                </div>
                            </div>
                            
                            <div id="calculo-diferenca-partilha-detalhes" class="mt-4 pt-3 border-t dark:border-slate-600">
                                <h4 class="font-semibold mb-2 text-gray-800 dark:text-gray-100">Diferença na Partilha</h4>
                                <div class="space-y-1 text-sm">
                                     <div class="flex justify-between items-center mb-2">
                                        <label for="calc-vencimento-partilha" class="text-gray-600 dark:text-gray-400">Vencimento:</label>
                                        <input type="date" id="calc-vencimento-partilha" class="form-input-text text-sm p-1 ml-2 flex-grow" value="${calculoExistente?.dataVencimentoPartilha || lastDayOfYear}">
                                     </div>
                                     <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Base de Cálculo (UFEMG):</span> <span class="font-medium text-gray-800 dark:text-gray-100" id="res-partilha-base-ufemg">0,0000</span></div>
                                     <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Base de Cálculo (R$):</span> <span class="font-medium text-gray-800 dark:text-gray-100" id="res-partilha-base-reais">R$ 0,00</span></div>
                                     <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Alíquota:</span> <span class="font-medium text-gray-800 dark:text-gray-100" id="res-partilha-aliquota">0%</span></div>
                                     <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">ITCD Principal:</span> <span class="font-medium text-gray-800 dark:text-gray-100" id="res-partilha-itcd-principal">R$ 0,00</span></div>
                                     <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Desconto:</span> <span class="font-medium text-gray-800 dark:text-gray-100" id="res-partilha-desconto">R$ 0,00</span></div>
                                     <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Pagamento Anterior:</span> <span class="font-medium text-gray-800 dark:text-gray-100" id="res-partilha-pagamento-anterior">R$ 0,00</span></div>
                                     <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Multa:</span> <span class="font-medium text-gray-800 dark:text-gray-100" id="res-partilha-multa">R$ 0,00</span></div>
                                     <div class="flex justify-between items-center"><span class="text-gray-600 dark:text-gray-400">Juros (<span id="res-partilha-percentual-juros">0.00</span>%):</span> <span class="font-medium text-gray-800 dark:text-gray-100" id="res-partilha-juros">R$ 0,00</span></div>
                                     <div class="flex justify-between font-bold"><span class="dark:text-gray-300">Imposto a Recolher (Partilha):</span> <span class="text-gray-900 dark:text-gray-100" id="res-partilha-imposto-a-recolher">R$ 0,00</span></div>
                                     <div id="justificativa-partilha-container" class="mt-2"></div>
                                </div>
                                <details class="mt-2">
                                    <summary class="text-xs text-blue-600 dark:text-blue-400 cursor-pointer">Ver detalhes por herdeiro</summary>
                                    <div id="partilha-detalhes-herdeiros" class="mt-2 p-2 border rounded-md bg-gray-50 dark:bg-slate-800/50 space-y-2">
                                    </div>
                                </details>
                            </div>

                            <div class="mt-6 pt-4 border-t dark:border-slate-600 text-center">
                                <span class="text-lg font-bold text-gray-800 dark:text-gray-100">TOTAL A RECOLHER</span>
                                <p class="text-2xl font-bold text-red-600 dark:text-red-400" id="valor-total-recolher">R$ 0,00</p>
                            </div>

                            <div class="mt-6 flex flex-col space-y-2">
                                <button id="btn-executar-calculo-principal" class="btn-primary w-full ${!isEditMode ? 'hidden' : ''}">Calcular Imposto Total</button>
                                <button id="btn-salvar-calculo" class="btn-primary w-full ${!isEditMode ? 'hidden' : ''}">Salvar Cálculo</button>
                            </div>
                        </fieldset>
                    </div>
                </div>
            </div>
        `;
        
        mainContentWrapperRef.innerHTML = pageHtml;
        
        addEventListeners();
        toggleEditMode(isEditMode);

        document.getElementById('calc-fato-gerador')?.dispatchEvent(new Event('change'));
        document.getElementById('calc-estado-civil')?.dispatchEvent(new Event('change'));
        
        ['check-testamento', 'check-renuncia-monte', 'check-recolhimento-previo', 'check-renuncia-determinacao', 'check-pagamento-anterior'].forEach(id => {
            const el = document.getElementById(id);
            if (el && el.checked) el.dispatchEvent(new Event('change'));
        });
        document.querySelector('input[name="tipo-inventario"]:checked')?.dispatchEvent(new Event('change'));
        
        renderListaBens();
        renderListaHerdeiros();
        renderListaRenuncias();
        renderListaPagamentosAnteriores();
        
        atualizarResumoEExecutarCalculo();

        document.querySelectorAll('.currency-input').forEach(input => {
            input.addEventListener('blur', e => { e.target.value = formatBRL(parseFromBRL(e.target.value)); });
        });
    }
    
    function toggleEditMode(enable) {
        isEditMode = enable;
        
        const fieldsets = ['#fieldset-declaracao-herdeiros', '#fieldset-bens', '#fieldset-resumo'];
        fieldsets.forEach(selector => {
            const fieldset = document.querySelector(selector);
            if(fieldset) fieldset.disabled = !enable;
        });

        const btnHabilitarEdicao = document.getElementById('btn-habilitar-edicao');
        const btnSalvarCalculo = document.getElementById('btn-salvar-calculo');
        const btnCalcular = document.getElementById('btn-executar-calculo-principal');

        if (btnHabilitarEdicao) btnHabilitarEdicao.classList.toggle('hidden', enable);
        if (btnSalvarCalculo) btnSalvarCalculo.classList.toggle('hidden', !enable);
        if (btnCalcular) btnCalcular.classList.toggle('hidden', !enable);
        
        const helpText = document.querySelector('#itcd-calculo-causa-mortis-container .text-sm.text-gray-600');
        if (helpText) {
            helpText.textContent = enable ? 'Preencha os dados abaixo para apurar o imposto devido.' : 'Modo de visualização. Habilite a edição para alterar os dados.';
        }
    }

    async function renderListaBens() {
        const container = document.getElementById('lista-bens-direitos');
        const acoesPartilhaContainer = document.getElementById('container-acoes-partilha');
        if (!container) return;
    
        if (bensDoCalculo.length === 0) {
            container.innerHTML = `<p class="text-sm text-center text-gray-500 dark:text-gray-400 p-4">Nenhum bem adicionado.</p>`;
            acoesPartilhaContainer.classList.add('hidden');
            return;
        }
        acoesPartilhaContainer.classList.remove('hidden');
    
        container.innerHTML = '';
        const renunciantesMonteIds = new Set(herdeirosDoCalculo.filter(h => h.renunciouMonte).map(h => h.id));
        const renunciantesDeterminacaoIds = new Set(renunciasPorDeterminacao.map(r => r.de));

        for (const bem of bensDoCalculo) {
            const tipoInfo = TIPOS_DE_BENS_PRINCIPAIS.find(t => t.key === bem.tipo);
            const card = document.createElement('div');
            card.className = `card p-3 ${tipoInfo?.isDeducao ? 'bg-orange-50 dark:bg-orange-900/40' : (tipoInfo?.isNaoTributavel ? 'bg-blue-50 dark:bg-blue-900/40' : 'bg-gray-50 dark:bg-slate-800/50')}`;
            
            const valorTransmitidoReais = (bem.valorAvaliacao || 0) * ((bem.percentualTransmissao || 100) / 100);
            const valorUfemgAnoAvaliacao = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(bem.anoReferenciaUfemg);
            const valorEmUfemg = (valorUfemgAnoAvaliacao > 0) ? (valorTransmitidoReais / valorUfemgAnoAvaliacao) : 0;
            const ufermgDisplay = valorEmUfemg.toLocaleString('pt-BR', {minimumFractionDigits: 4, maximumFractionDigits: 4});
            
            let herdeirosParaPartilha = herdeirosDoCalculo.filter(h => !h.renunciouMonte);
            const estadoCivil = document.getElementById('calc-estado-civil').value;
            const regime = document.getElementById('calc-regime-bens').value;
            const regimesComMeeiro = ['comunhao_universal', 'comunhao_parcial', 'uniao_estavel_parcial', 'uniao_estavel_cc1790', 'separacao_convencional'];
            
            const temConjugeNoArray = herdeirosParaPartilha.some(h => h.tipo === 'conjuge');
            
            if (estadoCivil === 'casado' && regimesComMeeiro.includes(regime) && !temConjugeNoArray) {
                const conjugePlaceholder = { id: 'conjuge-meacao', nome: 'Cônjuge (Meeiro)', tipo: 'conjuge' };
                herdeirosParaPartilha.push(conjugePlaceholder);
            }

            const partilhaHtml = herdeirosParaPartilha.length > 0 ? herdeirosParaPartilha.map(h => {
                const percentualSalvo = bem.partilha?.[h.id] || 0;
                const valorPartilhaUfemg = (valorEmUfemg * (percentualSalvo / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
                const isRenunciante = renunciantesDeterminacaoIds.has(h.id);

                return `
                    <div class="flex items-center gap-2">
                        <label for="partilha-herdeiro-${h.id}-bem-${bem.id}" class="flex-grow text-xs text-gray-700 dark:text-gray-300">${h.nome}:</label>
                        <input type="number" id="partilha-herdeiro-${h.id}-bem-${bem.id}" data-herdeiro-id="${h.id}" data-bem-id="${bem.id}" 
                               class="form-input-text w-20 text-xs p-1 partilha-percent-input-card" placeholder="%" min="0" max="100" step="0.01" value="${percentualSalvo}" ${isRenunciante ? 'disabled' : ''}>
                        <span class="text-xs text-blue-600 dark:text-blue-400 w-28 text-right partilha-ufemg-display-card">(${valorPartilhaUfemg} Ufemg)</span>
                    </div>
                `;
            }).join('') : '<p class="text-xs text-gray-500 dark:text-gray-400">Adicione herdeiros para definir a partilha.</p>';
    
            const totalPartilhado = Object.values(bem.partilha || {}).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
    
            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <div class="flex items-center">
                        <input type="checkbox" class="form-checkbox h-4 w-4 mr-3 bem-selecao-checkbox" data-bem-id="${bem.id}">
                        <div>
                            <p class="font-semibold text-gray-800 dark:text-gray-100">${bem.descricao || 'Sem descrição'}</p>
                            <p class="text-xs text-gray-600 dark:text-gray-400">
                                ${tipoInfo?.label || 'Desconhecido'} (${bem.natureza}) - 
                                Valor: ${formatBRL(bem.valorAvaliacao)} (${bem.percentualTransmissao}%) - 
                                <span class="font-semibold text-blue-700 dark:text-blue-300">${ufermgDisplay} UFEMG (ref. ${bem.anoReferenciaUfemg})</span>
                                ${bem.destinadoTestamento ? '<span class="ml-2 text-xs font-bold text-purple-600 dark:text-purple-400">[LEGADO]</span>' : ''}
                                ${bem.foraDeMG ? '<span class="ml-2 font-bold text-yellow-600 dark:text-yellow-400">[FORA DE MG]</span>' : ''}
                            </p>
                        </div>
                    </div>
                    <div class="space-x-2 flex-shrink-0">
                        <button class="btn-link btn-editar-bem text-sm" data-bem-id="${bem.id}">Editar</button>
                        <button class="btn-link btn-excluir-bem text-sm text-red-500" data-bem-id="${bem.id}">Excluir</button>
                    </div>
                </div>
                <details class="mt-2 ml-7">
                    <summary class="text-xs text-blue-600 dark:text-blue-400 cursor-pointer">Partilha deste Bem</summary>
                    <div class="mt-2 p-2 border rounded-md bg-white dark:bg-slate-900/50 space-y-1">
                        ${partilhaHtml}
                        <div class="text-xs font-semibold mt-2 pt-1 border-t dark:border-slate-700">Total Partilhado: 
                            <span class="partilha-total-display-card ${Math.abs(totalPartilhado - 100) > 0.01 ? 'text-red-500' : 'text-green-500'}">${totalPartilhado.toFixed(2)}</span>%
                        </div>
                    </div>
                </details>
            `;
            container.appendChild(card);
        }
        
        _atualizarVisibilidadeCamposCondicionais();
    }

    async function _calcularTotaisResumo() {
        const totais = {
            bensAvaliadosUfemg: 0, bensAvaliadosReais: 0,
            isentosNaoTributaveisUfemg: 0, deducoesUfemg: 0,
            bensComunsUfemg: 0, bensParticularesUfemg: 0,
            meacaoUfemg: 0, concorrenciaParticularesUfemg: 0, 
            totalBensTransmitidosUfemg: 0, herancaLiquidaTributavelUfemg: 0
        };
    
        const regimeBens = document.getElementById('calc-regime-bens')?.value;

        for (const bem of bensDoCalculo) {
            const valorRealConsiderado = (bem.valorAvaliacao || 0) * ((bem.percentualTransmissao || 100) / 100);
            const valorUfemgAnoAvaliacao = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(bem.anoReferenciaUfemg);
            const valorEmUfemg = (valorUfemgAnoAvaliacao > 0) ? (valorRealConsiderado / valorUfemgAnoAvaliacao) : 0;
            const tipoInfo = TIPOS_DE_BENS_PRINCIPAIS.find(t => t.key === bem.tipo);

            totais.bensAvaliadosUfemg += valorEmUfemg;
            totais.bensAvaliadosReais += valorRealConsiderado;

            const naturezaEfetiva = regimeBens === 'comunhao_universal' ? 'comum' : bem.natureza;
            if (naturezaEfetiva === 'comum') totais.bensComunsUfemg += valorEmUfemg;
            else totais.bensParticularesUfemg += valorEmUfemg;

            if (tipoInfo?.isDeducao) totais.deducoesUfemg += valorEmUfemg;
            else if (tipoInfo?.isNaoTributavel) totais.isentosNaoTributaveisUfemg += valorEmUfemg;

            if (!tipoInfo?.isDeducao && !tipoInfo?.isNaoTributavel && !bem.foraDeMG) {
                 if (naturezaEfetiva === 'comum') totais.herancaLiquidaTributavelUfemg += valorEmUfemg / 2;
                 else totais.herancaLiquidaTributavelUfemg += valorEmUfemg;
            }
        }
        
        totais.meacaoUfemg = totais.bensComunsUfemg / 2;
        totais.totalBensTransmitidosUfemg = totais.bensAvaliadosUfemg - totais.isentosNaoTributaveisUfemg - totais.deducoesUfemg - totais.meacaoUfemg;
        totais.herancaLiquidaTributavelUfemg -= totais.deducoesUfemg;
        totais.herancaLiquidaTributavelUfemg = Math.max(0, totais.herancaLiquidaTributavelUfemg);
        
        // CORREÇÃO: Calcular o quinhão total do cônjuge na concorrência
        const estadoCivil = document.getElementById('calc-estado-civil').value;
        const haConjuge = estadoCivil === 'casado';
        
        if(haConjuge) {
            const sucessaoModule = window.SEFWorkStation.ITCD.Calculo.Sucessao;
            const conjugeAscendenteFilhos = document.querySelector('input[name="conjuge-ascendente-filhos"]:checked')?.value;
            
            let participantesCalculo = [...herdeirosDoCalculo.filter(h => !h.renunciouMonte && h.tipo !== 'legatario')];
            if (!participantesCalculo.some(p => p.tipo === 'conjuge')) {
                 participantesCalculo.push({ id: 'conjuge-meacao', nome: 'Cônjuge (Meeiro)', tipo: 'conjuge' });
            }
            
            const totaisParaPartilha = sucessaoModule.calcularTotaisIniciais(bensDoCalculo, regimeBens);
            const partilhaLegal = await sucessaoModule.determinarPartilhaLegitima(participantesCalculo, totaisParaPartilha, estadoCivil, regimeBens, conjugeAscendenteFilhos);
            
            const quinhaoConjuge = partilhaLegal.heranca.get('conjuge-meacao');
            
            if(quinhaoConjuge) {
                 const vencimento = document.getElementById('calc-vencimento-itcd').value || new Date().toISOString().split('T')[0];
                 const anoVencimento = new Date(vencimento + 'T00:00:00').getFullYear();
                 const valorUfemgAno = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(anoVencimento);
                 if(valorUfemgAno > 0) {
                     // Converte o valor em R$ do quinhão para UFEMG da data do vencimento
                     totais.concorrenciaParticularesUfemg = quinhaoConjuge.fromParticulares / valorUfemgAno;
                 }
            }
        }
        
        return totais;
    }

    async function _atualizarUIResumo(totais) {
        const vencimentoInput = document.getElementById('calc-vencimento-itcd');
        const anoVencimento = vencimentoInput.value ? new Date(vencimentoInput.value + 'T00:00:00').getFullYear() : null;
        let valorUfemgVencimento = 0;
        
        if (anoVencimento) {
             valorUfemgVencimento = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(anoVencimento);
        }
        
        const quantidadeHerdeirosParaPartilha = herdeirosDoCalculo.filter(h => h.tipo !== 'legatario' && !h.renunciouMonte).length;
        const baseCalculoReais = totais.herancaLiquidaTributavelUfemg * valorUfemgVencimento;
    
        const formatUfemgLocal = (val) => (val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    
        const elementsToUpdate = {
            'resumo-total-bens': formatUfemgLocal(totais.bensAvaliadosUfemg),
            'resumo-total-bens-real': formatBRL(totais.bensAvaliadosReais),
            'resumo-total-bens-transmitidos': formatUfemgLocal(totais.totalBensTransmitidosUfemg),
            'resumo-total-isentos': formatUfemgLocal(totais.isentosNaoTributaveisUfemg + totais.deducoesUfemg),
            'resumo-bens-comuns': formatUfemgLocal(totais.bensComunsUfemg),
            'resumo-bens-particulares': formatUfemgLocal(totais.bensParticularesUfemg),
            'resumo-meacao': formatUfemgLocal(totais.meacaoUfemg),
            'resumo-concorrencia-particulares': formatUfemgLocal(totais.concorrenciaParticularesUfemg),
            'resumo-quinhao-hereditario': formatUfemgLocal(totais.herancaLiquidaTributavelUfemg),
            'resumo-qtde-herdeiros': quantidadeHerdeirosParaPartilha,
            'resumo-valor-ufemg': formatUfemgLocal(valorUfemgVencimento),
            'res-base-ufemg': formatUfemgLocal(totais.herancaLiquidaTributavelUfemg),
            'res-base-reais': formatBRL(baseCalculoReais)
        };
    
        for (const [id, value] of Object.entries(elementsToUpdate)) {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        }

        const houveTestamento = document.getElementById('check-testamento').checked;
        const containerResumoTestamento = document.getElementById('container-resumo-testamento');
        containerResumoTestamento.classList.toggle('hidden', !houveTestamento);

        if (houveTestamento) {
            let totalLegadoUfemg = 0;
            const legatariosIds = herdeirosDoCalculo.filter(h => h.tipo === 'legatario').map(h => h.id);

            if (legatariosIds.length > 0) {
                for (const bem of bensDoCalculo) {
                    if (bem.partilha) {
                        for (const herdeiroId in bem.partilha) {
                            if (legatariosIds.includes(herdeiroId)) {
                                const percentual = parseFloat(bem.partilha[herdeiroId]) || 0;
                                const valorUfemgAnoBem = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(bem.anoReferenciaUfemg);
                                if (valorUfemgAnoBem > 0) {
                                    const valorReal = (bem.valorAvaliacao || 0) * ((bem.percentualTransmissao || 100) / 100);
                                    totalLegadoUfemg += (valorReal / valorUfemgAnoBem) * (percentual / 100);
                                }
                            }
                        }
                    }
                }
            }
            
            const haHerdeirosNecessarios = document.querySelector('input[name="herdeiros-necessarios"]:checked')?.value === 'sim';
            const limiteDisponivelUfemg = haHerdeirosNecessarios ? (totais.totalBensTransmitidosUfemg * 0.5) : totais.totalBensTransmitidosUfemg;
            
            document.getElementById('resumo-total-legado').textContent = formatUfemgLocal(totalLegadoUfemg);
            document.getElementById('resumo-limite-disponivel').textContent = formatUfemgLocal(limiteDisponivelUfemg);
        }
    }

    async function atualizarResumoEExecutarCalculo() {
        const totais = await _calcularTotaisResumo();
        await _atualizarUIResumo(totais);
        await executarCalculoCompleto();
    }
    
    async function executarCalculoPrincipal() {
        for (const bem of bensDoCalculo) {
            const tipoInfo = TIPOS_DE_BENS_PRINCIPAIS.find(t => t.key === bem.tipo);
            if (tipoInfo && !tipoInfo.isDeducao && !tipoInfo.isNaoTributavel) {
                const totalPartilhado = Object.values(bem.partilha || {}).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
                if (Math.abs(totalPartilhado - 100) > 0.01) {
                    uiModuleRef.showToastNotification(`O bem "${bem.descricao}" não foi partilhado em 100%. Por favor, ajuste a partilha.`, "error", 0);
                    return; 
                }
            }
        }
        await atualizarResumoEExecutarCalculo();
    }

    async function getTiposHerdeirosDisponiveis() {
        const sucessaoModule = window.SEFWorkStation.ITCD.Calculo.Sucessao;
        const tiposHerdeirosSistema = sucessaoModule.TIPOS_DE_HERDEIROS || [];
        const houveTestamento = document.getElementById('check-testamento').checked;
        const estadoCivil = document.getElementById('calc-estado-civil').value;
    
        let tiposFiltradosPorEstadoCivil = tiposHerdeirosSistema.filter(h => {
            const eColateral = ['irmao_bilateral', 'irmao_unilateral', 'colaterais_outros'].includes(h.key);
            const eConjuge = h.classe === 'conjuge';
            if ((estadoCivil === 'casado' || estadoCivil === 'uniao_estavel') && eColateral) return false;
            return true;
        });
    
        let classePresente = null;
        const classes = ['descendentes', 'ascendentes', 'conjuge', 'colaterais'];
        for (const classe of classes) {
            if (herdeirosDoCalculo.some(h => tiposHerdeirosSistema.find(t => t.key === h.tipo)?.classe === classe)) {
                classePresente = classe;
                break;
            }
        }
        
        let tiposPermitidos = [];
        if (classePresente === 'descendentes') {
            tiposPermitidos = tiposFiltradosPorEstadoCivil.filter(h => h.classe === 'descendentes' || h.classe === 'conjuge');
        } else if (classePresente === 'ascendentes') {
            tiposPermitidos = tiposFiltradosPorEstadoCivil.filter(h => h.classe === 'ascendentes' || h.classe === 'conjuge');
        } else if (classePresente === 'conjuge') {
            tiposPermitidos = tiposFiltradosPorEstadoCivil.filter(h => h.classe === 'colaterais' || h.classe === 'conjuge');
        } else if (classePresente === 'colaterais') {
            tiposPermitidos = tiposFiltradosPorEstadoCivil.filter(h => h.classe === 'colaterais');
        } else {
            tiposPermitidos = tiposFiltradosPorEstadoCivil.filter(h => classes.includes(h.classe));
        }
    
        if (houveTestamento) {
            const legatarioInfo = tiposFiltradosPorEstadoCivil.find(h => h.classe === 'legatario');
            if (legatarioInfo && !tiposPermitidos.some(t => t.key === legatarioInfo.key)) {
                tiposPermitidos.push(legatarioInfo);
            }
        }
        
        if (herdeirosDoCalculo.some(h => h.tipo === 'conjuge')) {
            tiposPermitidos = tiposPermitidos.filter(h => h.classe !== 'conjuge');
        }
        
        return tiposPermitidos;
    }

    async function abrirModalAdicionarHerdeiro(herdeiroExistente = null) {
        const isEditing = herdeiroExistente !== null;
        const tituloModal = isEditing ? "Editar Herdeiro/Legatário" : "Adicionar Herdeiro/Legatário";
        const sucessaoModule = window.SEFWorkStation.ITCD.Calculo.Sucessao;
        
        const tiposDisponiveis = await getTiposHerdeirosDisponiveis();
        if (tiposDisponiveis.length === 0 && !isEditing) {
            uiModuleRef.showToastNotification("Não há tipos de herdeiros válidos para adicionar, com base nas regras de sucessão e nos herdeiros já inclusos.", "warning", 8000);
            return;
        }

        const optionsHtml = tiposDisponiveis.map(h => `<option value="${h.key}" ${herdeiroExistente?.tipo === h.key ? 'selected' : ''}>${h.label}</option>`).join('');

        const modalContent = `
             <form id="form-adicionar-herdeiro" class="space-y-4">
                <input type="hidden" id="herdeiro-id-modal" value="${herdeiroExistente?.id || ''}">
                <div>
                    <label for="herdeiro-tipo-modal" class="block text-sm font-medium">Tipo:</label>
                    <select id="herdeiro-tipo-modal" class="form-input-text mt-1">${optionsHtml}</select>
                </div>
                <div id="container-representado-modal" class="hidden">
                    <label for="herdeiro-representado-modal" class="block text-sm font-medium">Herdeiro Pré-morto Representado:</label>
                    <input type="text" id="herdeiro-representado-modal" class="form-input-text mt-1" placeholder="Nome do filho(a) do falecido" value="${herdeiroExistente?.representadoPor || ''}">
                </div>
                <div>
                    <label for="herdeiro-nome-modal" class="block text-sm font-medium">Nome:</label>
                    <input type="text" id="herdeiro-nome-modal" class="form-input-text mt-1" placeholder="Nome completo" value="${herdeiroExistente?.nome || ''}">
                </div>
             </form>
        `;
        const modal = uiModuleRef.showModal(tituloModal, modalContent, [
            { text: "Cancelar", class: "btn-secondary", closesModal: true },
            { text: isEditing ? "Salvar Alterações" : "Adicionar", class: "btn-primary", callback: () => {
                const id = modal.querySelector('#herdeiro-id-modal').value;
                const tipo = modal.querySelector('#herdeiro-tipo-modal').value;
                const nome = modal.querySelector('#herdeiro-nome-modal').value.trim();
                
                const representadoPor = modal.querySelector('#herdeiro-representado-modal').value.trim();

                if(nome && tipo) {
                    const herdeiroData = {
                        id: id || appModuleRef.generateUUID(),
                        nome,
                        tipo,
                        representadoPor: tipo === 'neto' ? representadoPor : null,
                        grupo: (sucessaoModule.TIPOS_DE_HERDEIROS || []).find(h => h.key === tipo)?.grupo || 0,
                        renunciouMonte: isEditing ? (herdeiroExistente.renunciouMonte || false) : false,
                    };

                    if(id) {
                        const index = herdeirosDoCalculo.findIndex(h => h.id === id);
                        if(index > -1) herdeirosDoCalculo[index] = herdeiroData;
                    } else {
                        herdeirosDoCalculo.push(herdeiroData);
                    }
                    
                    renderListaHerdeiros();
                    atualizarResumoEExecutarCalculo();
                    return true;
                }
                uiModuleRef.showToastNotification("Nome e Tipo do herdeiro são obrigatórios.", "warning");
                return false;
            }}
        ], 'max-w-lg');
        
        if(modal) {
            const tipoSelect = modal.querySelector('#herdeiro-tipo-modal');
            const toggleFields = () => {
                modal.querySelector('#container-representado-modal').classList.toggle('hidden', tipoSelect.value !== 'neto');
            };
            tipoSelect.addEventListener('change', toggleFields);
            toggleFields();
        }
    }
    
    function renderListaHerdeiros() {
        const container = document.getElementById('lista-herdeiros');
        const sucessaoModule = window.SEFWorkStation.ITCD.Calculo.Sucessao;
        if (!container) return;

        if (herdeirosDoCalculo.length === 0) {
            container.innerHTML = `<p class="text-sm text-center text-gray-500 dark:text-gray-400 p-4">Nenhum herdeiro adicionado.</p>`;
            _atualizarVisibilidadeCamposCondicionais();
            return;
        }
        
        container.innerHTML = '';
        herdeirosDoCalculo.forEach(herdeiro => {
            const tipoLabel = (sucessaoModule.TIPOS_DE_HERDEIROS || []).find(t => t.key === herdeiro.tipo)?.label || 'Desconhecido';
            let extraInfo = '';
            if (herdeiro.tipo.startsWith('irmao')) extraInfo = ` (${herdeiro.tipo.includes('unilateral') ? 'Unilateral' : 'Bilateral'})`;
            if (herdeiro.tipo === 'neto' && herdeiro.representadoPor) extraInfo = ` (repr. de ${herdeiro.representadoPor})`;
            
            const renunciaCheckboxHtml = herdeiro.tipo !== 'legatario' && document.getElementById('check-renuncia-monte').checked ? `
                <div class="mt-2">
                    <label class="inline-flex items-center text-xs">
                        <input type="checkbox" class="form-checkbox h-3 w-3 renuncia-monte-checkbox" data-herdeiro-id="${herdeiro.id}" ${herdeiro.renunciouMonte ? 'checked' : ''}>
                        <span class="ml-1.5">Renuncia ao monte</span>
                    </label>
                </div>
            ` : '';

            const card = document.createElement('div');
            card.className = 'card p-3 flex justify-between items-start';
            card.innerHTML = `
                <div>
                    <p class="font-semibold text-gray-800 dark:text-gray-100">${herdeiro.nome}</p>
                    <p class="text-xs text-gray-600 dark:text-gray-400">${tipoLabel}${extraInfo}</p>
                    ${renunciaCheckboxHtml}
                </div>
                <div class="space-x-2 flex-shrink-0">
                    <button class="btn-link btn-editar-herdeiro text-sm" data-herdeiro-id="${herdeiro.id}">Editar</button>
                    <button class="btn-link btn-excluir-herdeiro text-sm text-red-500" data-herdeiro-id="${herdeiro.id}">Excluir</button>
                </div>`;
            container.appendChild(card);
        });

        _atualizarVisibilidadeCamposCondicionais();
        atualizarDropdownsRenuncia();
    }

    function renderListaPagamentosAnteriores() {
        const container = document.getElementById('lista-pagamentos-anteriores');
        if (!container) return;

        if (pagamentosAnterioresDoCalculo.length === 0) {
            container.innerHTML = '<li class="text-xs text-gray-500">Nenhum pagamento adicionado.</li>';
            return;
        }

        container.innerHTML = pagamentosAnterioresDoCalculo.map(pag => `
            <li class="flex justify-between items-center bg-indigo-100 dark:bg-indigo-900/50 p-1.5 rounded-md text-xs" data-id="${pag.id}">
                <span>
                    ${formatBRL(pag.valor)} em ${new Date(pag.data + 'T00:00:00').toLocaleDateString('pt-BR')} 
                    (${pag.tipo === 'causaMortis' ? 'C. Mortis' : 'Partilha'})
                </span>
                <button type="button" class="btn-link text-red-500 btn-remover-pagamento-anterior">×</button>
            </li>
        `).join('');
    }

    async function addEventListeners() {
        document.getElementById('btn-voltar-calculo-hub')?.addEventListener('click', () => appModuleRef.handleMenuAction('itcd-calculo-hub'));
        document.getElementById('btn-adicionar-bem')?.addEventListener('click', () => abrirModalAdicionarBem(null));
        document.getElementById('btn-adicionar-herdeiro')?.addEventListener('click', () => abrirModalAdicionarHerdeiro(null));
        document.getElementById('btn-salvar-calculo')?.addEventListener('click', salvarCalculoAtual);
        document.getElementById('btn-executar-calculo-principal')?.addEventListener('click', executarCalculoPrincipal);

        document.getElementById('btn-adicionar-pagamento-anterior')?.addEventListener('click', () => {
            const valorInput = document.getElementById('pag-ant-valor');
            const dataInput = document.getElementById('pag-ant-data');
            const tipoInput = document.querySelector('input[name="pag-ant-tipo"]:checked');

            const valor = parseFromBRL(valorInput.value);
            const data = dataInput.value;
            const tipo = tipoInput.value;

            if (!valor || !data || !tipo) {
                uiModuleRef.showToastNotification("Valor, data e tipo do pagamento são obrigatórios.", "warning");
                return;
            }

            pagamentosAnterioresDoCalculo.push({
                id: `pag_${Date.now()}`,
                valor,
                data,
                tipo
            });

            valorInput.value = '';
            dataInput.value = '';
            renderListaPagamentosAnteriores();
            atualizarResumoEExecutarCalculo();
        });

        document.getElementById('lista-pagamentos-anteriores')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-remover-pagamento-anterior')) {
                const idParaRemover = e.target.closest('li').dataset.id;
                pagamentosAnterioresDoCalculo = pagamentosAnterioresDoCalculo.filter(p => p.id !== idParaRemover);
                renderListaPagamentosAnteriores();
                atualizarResumoEExecutarCalculo();
            }
        });

        document.getElementById('check-recolhimento-previo')?.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            document.getElementById('container-recolhimento-previo')?.classList.toggle('hidden', !isChecked);
            document.getElementById('container-tipo-desconto')?.classList.toggle('hidden', !isChecked);
            if (!isChecked) {
                document.getElementById('calc-valor-recolhido').value = '';
                document.getElementById('calc-data-recolhimento').value = '';
                document.getElementById('check-desconto-sobre-recolhido').checked = false;
            }
            atualizarResumoEExecutarCalculo();
        });

        document.getElementById('check-pagamento-anterior')?.addEventListener('change', (e) => {
            document.getElementById('container-pagamento-anterior')?.classList.toggle('hidden', !e.target.checked);
            if (!e.target.checked) {
                pagamentosAnterioresDoCalculo = [];
                renderListaPagamentosAnteriores();
            }
            atualizarResumoEExecutarCalculo();
        });
        
        document.getElementById('check-testamento')?.addEventListener('change', (e) => {
            _atualizarVisibilidadeCamposCondicionais();
            if (!e.target.checked) document.querySelectorAll('input[name="herdeiros-necessarios"]').forEach(r => r.checked = false);
            if (e.isTrusted) {
                resetarPartilhas();
                renderListaHerdeiros();
                atualizarResumoEExecutarCalculo();
            }
        });

        document.getElementById('check-renuncia-monte')?.addEventListener('change', (e) => {
            if (e.isTrusted) {
                resetarPartilhas();
            }
            if (!document.getElementById('check-renuncia-monte').checked) {
                herdeirosDoCalculo.forEach(h => h.renunciouMonte = false);
            }
            renderListaHerdeiros();
            atualizarResumoEExecutarCalculo();
        });

        document.getElementById('check-renuncia-determinacao')?.addEventListener('change', (e) => {
            document.getElementById('container-renuncia-determinacao').classList.toggle('hidden', !e.target.checked);
            if (!e.target.checked) {
                renunciasPorDeterminacao = [];
                renderListaRenuncias();
            }
            if (e.isTrusted) {
                resetarPartilhas();
            }
            atualizarDropdownsRenuncia();
            atualizarResumoEExecutarCalculo();
        });

        document.getElementById('calc-estado-civil')?.addEventListener('change', (e) => {
            _atualizarVisibilidadeCamposCondicionais();
            if (e.isTrusted) {
                resetarPartilhas();
                renderListaHerdeiros();
                atualizarResumoEExecutarCalculo();
            }
        });
        
        const updateTransitoFields = () => {
            const tipoSelecionado = document.querySelector('input[name="tipo-inventario"]:checked')?.value;
            const isJudicial = tipoSelecionado === 'judicial';
            document.getElementById('container-transito-julgado').classList.toggle('hidden', !isJudicial);
            const dataContainer = document.getElementById('container-data-transito-julgado');
            if(dataContainer) dataContainer.classList.toggle('hidden', !isJudicial || document.getElementById('calc-transito-julgado').value !== 'sim');
            verificarLegislacaoAplicavel();
        };
        document.querySelectorAll('input[name="tipo-inventario"]').forEach(radio => radio.addEventListener('change', updateTransitoFields));
        document.getElementById('calc-transito-julgado')?.addEventListener('change', updateTransitoFields);

        const idsParaRecalculo = [
            'calc-regime-bens', 'calc-data-pagamento', 'calc-valor-recolhido', 'calc-data-recolhimento',
            'calc-vencimento-partilha', 'check-isencao-imovel-ate2007',
            'check-desconto-sobre-recolhido', 'calc-data-transito-julgado'
        ];
        idsParaRecalculo.forEach(id => {
            document.getElementById(id)?.addEventListener('change', atualizarResumoEExecutarCalculo);
        });
        document.querySelectorAll('input[name="conjuge-ascendente-filhos"]').forEach(radio => radio.addEventListener('change', atualizarResumoEExecutarCalculo));
        document.querySelectorAll('input[name="herdeiros-necessarios"]').forEach(radio => radio.addEventListener('change', atualizarResumoEExecutarCalculo));
        document.querySelectorAll('input[name="renuncia-formalizada-autos"]').forEach(radio => radio.addEventListener('change', atualizarResumoEExecutarCalculo));
        document.getElementById('calc-fato-gerador')?.addEventListener('change', verificarLegislacaoAplicavel);

        document.getElementById('lista-bens-direitos')?.addEventListener('input', async (e) => {
            if (e.target.classList.contains('partilha-percent-input-card')) {
                const bemId = e.target.dataset.bemId;
                const herdeiroId = e.target.dataset.herdeiroId;
                const percentual = parseFloat(e.target.value) || 0;
        
                const bem = bensDoCalculo.find(b => b.id === bemId);
                if (bem) {
                    if (!bem.partilha) bem.partilha = {};
                    bem.partilha[herdeiroId] = percentual;
                    
                    const inputRow = e.target.closest('.flex.items-center.gap-2');
                    const ufemgDisplay = inputRow.querySelector('.partilha-ufemg-display-card');
                    
                    const valorUfemgAnoAvaliacao = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(bem.anoReferenciaUfemg);
                    const valorReal = (bem.valorAvaliacao || 0) * ((bem.percentualTransmissao || 100) / 100);
                    const valorEmUfemg = (valorUfemgAnoAvaliacao > 0) ? (valorReal / valorUfemgAnoAvaliacao) : 0;
                    const valorPartilhaUfemg = (valorEmUfemg * (percentual / 100));
                    
                    if(ufemgDisplay) ufemgDisplay.textContent = `(${(valorPartilhaUfemg || 0).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} Ufemg)`;
        
                    const card = e.target.closest('.card');
                    const totalDisplay = card.querySelector('.partilha-total-display-card');
                    const totalPartilhado = Object.values(bem.partilha).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
                    totalDisplay.textContent = totalPartilhado.toFixed(2);
                    totalDisplay.classList.toggle('text-red-500', Math.abs(totalPartilhado - 100) > 0.01);
                    totalDisplay.classList.toggle('text-green-500', Math.abs(totalPartilhado - 100) <= 0.01);
                }
            }
        });

        document.getElementById('lista-bens-direitos')?.addEventListener('click', async (e) => {
            if (e.target.classList.contains('btn-editar-bem')) { const bem = bensDoCalculo.find(b => b.id === e.target.dataset.bemId); if (bem) abrirModalAdicionarBem(bem); }
            if (e.target.classList.contains('btn-excluir-bem')) { bensDoCalculo = bensDoCalculo.filter(b => b.id !== e.target.dataset.bemId); await renderListaBens(); await atualizarResumoEExecutarCalculo(); }
        });

        document.getElementById('lista-herdeiros')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-editar-herdeiro')) {
                 const herdeiro = herdeirosDoCalculo.find(h => h.id === e.target.dataset.herdeiroId);
                 if (herdeiro) abrirModalAdicionarHerdeiro(herdeiro);
            } else if(e.target.classList.contains('btn-excluir-herdeiro')) {
                resetarPartilhas();
                const herdeiroId = e.target.dataset.herdeiroId;
                herdeirosDoCalculo = herdeirosDoCalculo.filter(h => h.id !== herdeiroId);
                renunciasPorDeterminacao = renunciasPorDeterminacao.filter(r => r.de !== herdeiroId && r.para !== herdeiroId);
                renderListaHerdeiros();
                renderListaRenuncias();
                atualizarDropdownsRenuncia();
                atualizarResumoEExecutarCalculo();
            } else if(e.target.classList.contains('renuncia-monte-checkbox')) {
                resetarPartilhas();
                const herdeiroId = e.target.dataset.herdeiroId;
                const herdeiro = herdeirosDoCalculo.find(h => h.id === herdeiroId);
                if(herdeiro) {
                    herdeiro.renunciouMonte = e.target.checked;
                    renderListaBens(); 
                    atualizarResumoEExecutarCalculo();
                }
            }
        });

        document.getElementById('tooltip-renuncia-determinacao')?.addEventListener('click', () => {
            uiModuleRef.showModal(
                'Informação sobre Renúncia com Determinação',
                `<p class="text-sm">Nesta modalidade (que configura uma cessão/doação), o sistema calcula o imposto sobre o valor cedido.</p>
                 <p class="text-sm mt-2">Use o botão <strong>"Aplicar Partilha Final"</strong> para que o sistema preencha automaticamente os percentuais nos bens de acordo com a cessão informada. A partilha poderá ser ajustada manually depois.</p>
                 <p class="text-sm mt-2">O cálculo da "Diferença na Partilha" considerará o valor cedido como base de cálculo.</p>`,
                [{ text: 'Entendi', class: 'btn-primary', closesModal: true }]
            );
        });

        document.querySelectorAll('input[name="tipo-renuncia-determinacao"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                document.getElementById('container-percentual-renuncia').classList.toggle('hidden', e.target.value !== 'parcial');
            });
        });

        document.getElementById('btn-adicionar-renuncia')?.addEventListener('click', () => {
            const renuncianteId = document.getElementById('renuncia-de').value;
            const beneficiarioId = document.getElementById('renuncia-para').value;
            const tipoRenuncia = document.querySelector('input[name="tipo-renuncia-determinacao"]:checked').value;
            const percentualEl = document.getElementById('percentual-renuncia');
            const percentual = parseFloat(percentualEl.value);

            if (!renuncianteId || !beneficiarioId) { uiModuleRef.showToastNotification("Selecione o renunciante e o beneficiário.", "warning"); return; }
            if (renuncianteId === beneficiarioId) { uiModuleRef.showToastNotification("O renunciante não pode ser o mesmo que o beneficiário.", "warning"); return; }
            if (renunciasPorDeterminacao.some(r => r.de === renuncianteId)) { uiModuleRef.showToastNotification("Este herdeiro já renunciou.", "info"); return; }
            if (tipoRenuncia === 'parcial' && (isNaN(percentual) || percentual <= 0 || percentual > 100)) {
                uiModuleRef.showToastNotification("Para renúncia parcial, o percentual deve ser entre 0,01 e 100.", "warning");
                return;
            }
            
            resetarPartilhas();
            renunciasPorDeterminacao.push({ 
                de: renuncianteId, 
                para: beneficiarioId,
                tipoRenuncia: tipoRenuncia,
                percentual: tipoRenuncia === 'parcial' ? percentual : 100
            });
            renderListaRenuncias();
            atualizarDropdownsRenuncia();
            renderListaBens();
        });

        document.getElementById('lista-renuncias-configuradas')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-excluir-renuncia-det')) {
                resetarPartilhas();
                const renuncianteId = e.target.dataset.renuncianteId;
                renunciasPorDeterminacao = renunciasPorDeterminacao.filter(r => r.de !== renuncianteId);
                renderListaRenuncias();
                atualizarDropdownsRenuncia();
                renderListaBens();
            }
        });
        
        document.getElementById('btn-habilitar-edicao')?.addEventListener('click', () => toggleEditMode(true));
        document.getElementById('btn-aplicar-partilha-legal')?.addEventListener('click', _handleAplicarPartilhaFinal);
        document.getElementById('btn-abrir-partilha-seletiva')?.addEventListener('click', _abrirModalPartilhaSeletiva);
        document.getElementById('selecionar-todos-bens-partilha')?.addEventListener('change', (e) => {
            document.querySelectorAll('.bem-selecao-checkbox').forEach(checkbox => { checkbox.checked = e.target.checked; });
        });
    }

    async function updateModalUI() {
        const modal = document.querySelector('#form-adicionar-bem');
        if (!modal) return;
    
        const tipoBemSelect = modal.querySelector('#bem-tipo-modal');
        const tipoImovelContainer = modal.querySelector('#container-tipo-imovel-modal');
        const naturezaBemSelect = modal.querySelector('#bem-natureza-modal');
        const foraDeMgContainer = modal.querySelector('#container-bem-fora-mg-modal');
        
        if (tipoImovelContainer && tipoBemSelect) {
            const isImovel = tipoBemSelect.value === 'imovel';
            tipoImovelContainer.classList.toggle('hidden', !isImovel);
            if(foraDeMgContainer) foraDeMgContainer.classList.toggle('hidden', !isImovel);
        }
    
        const estadoCivil = document.getElementById('calc-estado-civil').value;
        const regimeBensSelectEl = document.getElementById('calc-regime-bens');
        const regimeBens = regimeBensSelectEl ? regimeBensSelectEl.value : '';
        const regimesComuns = ['comunhao_universal', 'comunhao_parcial', 'uniao_estavel_parcial'];
        const podeSerComum = (estadoCivil === 'casado' && regimesComuns.includes(regimeBens));
        
        if(naturezaBemSelect){
            naturezaBemSelect.querySelector('option[value="comum"]').disabled = !podeSerComum;
            if (!podeSerComum && naturezaBemSelect.value === 'comum') naturezaBemSelect.value = 'particular';
        }
    
        const valorInput = modal.querySelector('#bem-valor-avaliacao-modal');
        const anoInput = modal.querySelector('#bem-ano-avaliacao-modal');
        const displayUfemg = modal.querySelector('#display-valor-ufemg-modal');
        
        if (valorInput && anoInput && displayUfemg) {
            const valor = parseFromBRL(valorInput.value);
            const anoReferenciaUfemg = parseInt(anoInput.value, 10);
    
            if(valor > 0 && anoReferenciaUfemg && window.SEFWorkStation?.ITCD?.TabelasReferencia?.buscarValorUfemgPorAno) {
                try {
                    const valorUfemgAno = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(anoReferenciaUfemg);
                    if(valorUfemgAno > 0) {
                        displayUfemg.textContent = `Valor em UFEMG (ref. ${anoReferenciaUfemg}): ${(valor / valorUfemgAno).toLocaleString('pt-BR', {minimumFractionDigits: 4, maximumFractionDigits: 4})}`;
                    } else {
                        displayUfemg.textContent = `Valor da UFEMG para ${anoReferenciaUfemg} não encontrado.`;
                    }
                } catch(e) { 
                    displayUfemg.textContent = "Erro ao buscar valor da UFEMG.";
                }
            } else {
                displayUfemg.textContent = '';
            }
        }
    }
    
    function verificarLegislacaoAplicavel() {
        const dataInput = document.getElementById('calc-fato-gerador');
        const displayEl = document.getElementById('display-legislacao-aplicavel');
        const vencimentoInput = document.getElementById('calc-vencimento-itcd');
        if (!dataInput || !displayEl || !vencimentoInput) return;
    
        const dataFatoGerador = dataInput.value;
        displayEl.textContent = '';
        vencimentoInput.value = '';
    
        if (!dataFatoGerador || dataFatoGerador.length < 10) { 
            atualizarResumoEExecutarCalculo();
            return;
        }
    
        let dataVencimento;
        const isLei14941 = dataFatoGerador >= '2004-03-29';
    
        if (isLei14941) { 
            dataVencimento = new Date(dataFatoGerador + 'T00:00:00');
            dataVencimento.setDate(dataVencimento.getDate() + 180);

        } else { 
            const tipoInventario = document.querySelector('input[name="tipo-inventario"]:checked')?.value;
            const houveTransito = document.getElementById('calc-transito-julgado')?.value === 'sim';
            const dataTransito = document.getElementById('calc-data-transito-julgado')?.value;

            if (tipoInventario === 'judicial' && houveTransito && dataTransito) {
                const dataTransitoObj = new Date(dataTransito + 'T00:00:00');
                if (dataFatoGerador >= '1997-01-01') { 
                    dataVencimento = dataTransitoObj;
                } else { 
                    dataTransitoObj.setDate(dataTransitoObj.getDate() + 15);
                    dataVencimento = dataTransitoObj;
                }
            } else {
                const dataPagamento = document.getElementById('calc-data-pagamento').value || new Date().toISOString().split('T')[0];
                const anoPagamento = new Date(dataPagamento + 'T00:00:00').getFullYear();
                dataVencimento = new Date(anoPagamento, 11, 31); 
            }
        }
    
        vencimentoInput.value = dataVencimento.toISOString().split('T')[0];
    
        let legislacao = 'Legislação não identificada.';
        if (dataFatoGerador >= '2007-12-29') {
            legislacao = 'Lei 14.941/03 (após 2008)';
        } else if (dataFatoGerador >= '2004-03-29') {
            legislacao = 'Lei 14.941/03 (até 2007)';
        } else if (dataFatoGerador >= '1997-01-01') {
            legislacao = 'Lei 12.426/96';
        } else if (dataFatoGerador >= '1989-03-01') {
            legislacao = 'Lei 9.752/89';
        } else if (dataFatoGerador >= '1976-01-01') {
            legislacao = 'Lei 6.763/75';
        }
        
        displayEl.innerHTML = `<strong>Legislação Aplicável:</strong> ${legislacao}`;
    
        atualizarValorUfemgReferencia();
        _atualizarVisibilidadeCamposCondicionais();
    }
    
    async function _atualizarVisibilidadeCamposCondicionais() {
        const estadoCivil = document.getElementById('calc-estado-civil').value;
        const regimeBensContainer = document.getElementById('container-regime-bens');
        const regimeBens = document.getElementById('calc-regime-bens')?.value;
        const containerConjugeAscendente = document.getElementById('container-conjuge-ascendente-filhos');
        const containerTestamento = document.getElementById('container-herdeiros-necessarios');
        const containerIsencao = document.getElementById('container-isencao-imovel-ate2007');

        if(regimeBensContainer) regimeBensContainer.classList.toggle('hidden', estadoCivil !== 'casado');
    
        if (containerIsencao) {
            const dataFatoGerador = document.getElementById('calc-fato-gerador').value;
            const isLeiAte2007 = dataFatoGerador && dataFatoGerador >= '2004-03-29' && dataFatoGerador < '2007-12-29';
            containerIsencao.classList.add('hidden');
    
            if (isLeiAte2007) {
                const imoveisResidenciais = bensDoCalculo.filter(b => b.tipo === 'imovel' && b.imovelTipo === 'residencial');
                if (imoveisResidenciais.length === 1) {
                    const unicoImovel = imoveisResidenciais[0];
                    const valorUfemgAnoImovel = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(unicoImovel.anoReferenciaUfemg);
                    if (valorUfemgAnoImovel > 0) {
                        const valorImovelUfemg = (unicoImovel.valorAvaliacao / valorUfemgAnoImovel) * (unicoImovel.percentualTransmissao / 100);
                        const ISENCAO_LIMITE_IMOVEL_RESIDENCIAL_UFEMG = 45000;
                        if (valorImovelUfemg <= ISENCAO_LIMITE_IMOVEL_RESIDENCIAL_UFEMG) {
                            containerIsencao.classList.remove('hidden');
                        }
                    }
                }
            }
        }
    
        if (containerConjugeAscendente) {
            const haConjuge = herdeirosDoCalculo.some(h => h.tipo === 'conjuge');
            const haDescendente = herdeirosDoCalculo.some(h => ['filho', 'filho_unilateral', 'neto'].includes(h.tipo));
            const regimesComConcorrencia = ['comunhao_parcial', 'uniao_estavel_parcial', 'separacao_convencional'];
    
            const deveMostrar = estadoCivil === 'casado' && haConjuge && haDescendente && regimesComConcorrencia.includes(regimeBens);
            containerConjugeAscendente.classList.toggle('hidden', !deveMostrar);
        }

        if (containerTestamento) {
            containerTestamento.classList.toggle('hidden', !document.getElementById('check-testamento').checked);
        }
    }
    
    async function atualizarValorUfemgReferencia() {
        const vencimentoInput = document.getElementById('calc-vencimento-itcd');
        const displayUfemgResumo = document.getElementById('resumo-valor-ufemg');
        const dataFatoGerador = document.getElementById('calc-fato-gerador').value;
        const dataPagamento = document.getElementById('calc-data-pagamento').value;
        
        if (!vencimentoInput || !displayUfemgResumo || !dataFatoGerador || !dataPagamento) return;

        let anoReferenciaUfemg = new Date(vencimentoInput.value + 'T00:00:00').getFullYear();
        const isLei14941 = dataFatoGerador >= '2004-03-29';

        if (isLei14941) {
            const anoPagamento = new Date(dataPagamento + 'T00:00:00').getFullYear();
            if (anoPagamento < anoReferenciaUfemg) {
                anoReferenciaUfemg = anoPagamento;
            }
        }

        if (anoReferenciaUfemg && window.SEFWorkStation?.ITCD?.TabelasReferencia?.buscarValorUfemgPorAno) {
            const valor = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(anoReferenciaUfemg);
            displayUfemgResumo.textContent = valor > 0 ? valor.toLocaleString('pt-BR', {minimumFractionDigits: 4, maximumFractionDigits: 4}) : "Não encontrado";
        } else {
            displayUfemgResumo.textContent = "0,0000";
        }
        await atualizarResumoEExecutarCalculo();
    }
    
    function getModuloCalculoPorData(data) {
        if (data >= '2007-12-29') {
            return window.SEFWorkStation.ITCD.Calculo.Legislacao.Lei14941_03_apos2008;
        } else if (data >= '2004-03-29') {
            return window.SEFWorkStation.ITCD.Calculo.Legislacao.Lei14941_03_ate2007;
        } else if (data >= '1997-01-01') {
            return window.SEFWorkStation.ITCD.Calculo.Legislacao.Lei12426_96;
        } else if (data >= '1989-03-01') {
            return window.SEFWorkStation.ITCD.Calculo.Legislacao.Lei9752_89;
        } else if (data >= '1976-01-01') {
            return window.SEFWorkStation.ITCD.Calculo.Legislacao.Lei6763_75;
        }
        return null;
    }

    async function executarCalculoCompleto(justificativaIsencao = '') {
        const dataFatoGeradorEl = document.getElementById('calc-fato-gerador');
        if (!dataFatoGeradorEl || !dataFatoGeradorEl.value) {
            renderizarResultadosCalculo(null);
            return;
        }
        const dataFatoGerador = dataFatoGeradorEl.value;
        const dataPagamento = document.getElementById('calc-data-pagamento').value;
        if (dataPagamento < dataFatoGerador) {
            uiModuleRef.showToastNotification("A data de pagamento não pode ser anterior à data do fato gerador.", "error", 0);
            renderizarResultadosCalculo(null);
            return;
        }

        const moduloCalculo = getModuloCalculoPorData(dataFatoGerador);
        if (!moduloCalculo) {
            renderizarResultadosCalculo({ legislacaoAplicada: "Indefinida", erros: ["Legislação para esta data não implementada."] });
            return;
        }

        const totaisResumo = await _calcularTotaisResumo();
        const vencimento = document.getElementById('calc-vencimento-itcd').value;
        const anoVencimento = new Date(vencimento + 'T00:00:00').getFullYear();
        const valorUfemgDoVencimento = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(anoVencimento);
        
        const baseCalculoCausaMortisUfemg = totaisResumo.herancaLiquidaTributavelUfemg;
        const baseCalculoReais = baseCalculoCausaMortisUfemg * valorUfemgDoVencimento;
        
        let vencimentoPartilhaInput = document.getElementById('calc-vencimento-partilha');
        let vencimentoPartilha = vencimentoPartilhaInput.value;
        const renunciaComDeterminacao = document.getElementById('check-renuncia-determinacao').checked;
        const renunciaNosAutos = document.querySelector('input[name="renuncia-formalizada-autos"]:checked')?.value === 'sim';
        
        vencimentoPartilhaInput.readOnly = renunciaComDeterminacao && renunciaNosAutos;
        if (renunciaComDeterminacao && renunciaNosAutos) {
            vencimentoPartilha = vencimento;
            vencimentoPartilhaInput.value = vencimento;
        }
        
        const anoVencimentoPartilha = new Date(vencimentoPartilha + 'T00:00:00').getFullYear();
        const valorUfemgVencimentoPartilha = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(anoVencimentoPartilha);

        const haHerdeirosNecessarios = document.querySelector('input[name="herdeiros-necessarios"]:checked')?.value === 'sim';
        const estadoCivil = document.getElementById('calc-estado-civil').value;
        const regimeBens = document.getElementById('calc-regime-bens').value;
        const conjugeAscendenteFilhos = document.querySelector('input[name="conjuge-ascendente-filhos"]:checked')?.value;
        
        const partilhaBase = await window.SEFWorkStation.ITCD.Calculo.DiferencaPartilha.calcular(
            bensDoCalculo, herdeirosDoCalculo, renunciasPorDeterminacao, valorUfemgVencimentoPartilha, 
            vencimentoPartilha, dataPagamento, haHerdeirosNecessarios, estadoCivil, regimeBens, conjugeAscendenteFilhos
        );

        const moduloCalculoPartilha = window.SEFWorkStation.ITCD.Calculo.Legislacao.Lei14941_03_apos2008;
        let resultadoAgregadoPartilha = {
            valores: { impostoARecolher: 0, itcdPrincipal: 0, desconto: 0, multa: 0, juros: 0, percentualJuros: 0, baseCalculoReais: partilhaBase.valores.baseCalculoReais, baseCalculoUfemg: partilhaBase.valores.baseCalculoUfemg, aliquota: 0, pagamentoAnterior: 0 },
            justificativaCalculo: new Set()
        };
        
        let deducaoPagamentoPartilha = 0;
        for (const pag of pagamentosAnterioresDoCalculo.filter(p => p.tipo === 'diferencaPartilha')) {
            const ufemgAnoPagamento = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(new Date(pag.data).getFullYear());
            if (ufemgAnoPagamento > 0) {
                const valorPagamentoEmUfemg = pag.valor / ufemgAnoPagamento;
                deducaoPagamentoPartilha += valorPagamentoEmUfemg * valorUfemgVencimentoPartilha;
            }
        }
        resultadoAgregadoPartilha.valores.pagamentoAnterior = deducaoPagamentoPartilha;

        for (const detalhe of partilhaBase.detalhesPorHerdeiro) {
            const baseIndividualUfemg = (detalhe.excedenteUfemg || 0) + (detalhe.excessoLiberalidadeUfemg || 0);
            if (baseIndividualUfemg <= 0) continue;

            const resultadoIndividual = await moduloCalculoPartilha.calcular({
                baseCalculoUfemg: baseIndividualUfemg,
                dataFatoGerador: dataFatoGerador,
                dataPagamento: dataPagamento,
                vencimento: vencimentoPartilha,
                valorUfemgDoVencimento: valorUfemgVencimentoPartilha,
                tipoDoacao: true, justificativas: [], bens: [], herdeiros: []
            });
            
            detalhe.calculoImposto = resultadoIndividual.valores;
            
            resultadoAgregadoPartilha.valores.itcdPrincipal += resultadoIndividual.valores.itcdPrincipal;
            resultadoAgregadoPartilha.valores.desconto += resultadoIndividual.valores.desconto;
            resultadoAgregadoPartilha.valores.multa += resultadoIndividual.valores.multa;
            resultadoAgregadoPartilha.valores.juros += resultadoIndividual.valores.juros;
            
            if (resultadoIndividual.valores.aliquota > 0) {
                resultadoAgregadoPartilha.valores.aliquota = resultadoIndividual.valores.aliquota;
            }

            if (resultadoIndividual.justificativaCalculo) {
                resultadoIndividual.justificativaCalculo.forEach(j => resultadoAgregadoPartilha.justificativaCalculo.add(`${detalhe.nome}: ${j}`));
            }
        }
        
        const valorTotalEspolio = bensDoCalculo.reduce((acc, bem) => acc + (bem.valorAvaliacao || 0), 0);
        const valorBensForaMG = bensDoCalculo.filter(b => b.foraDeMG).reduce((acc, bem) => acc + (bem.valorAvaliacao || 0), 0);
        const percentualAbatimentoForaMG = valorTotalEspolio > 0 ? (valorBensForaMG / valorTotalEspolio) * 100 : 0;
        
        partilhaBase.valores.valorAbatidoForaMG = 0;
        partilhaBase.valores.percentualAbatimentoForaMG = 0;

        let impostoPartilhaBruto = resultadoAgregadoPartilha.valores.itcdPrincipal - resultadoAgregadoPartilha.valores.desconto;
        let acrescimosPartilha = resultadoAgregadoPartilha.valores.multa + resultadoAgregadoPartilha.valores.juros;
        let impostoPartilhaComAcrecimos = impostoPartilhaBruto + acrescimosPartilha;
        let impostoPartilhaARecolher = Math.max(0, impostoPartilhaComAcrecimos - deducaoPagamentoPartilha);
        
        if (percentualAbatimentoForaMG > 0) {
            const valorAbatido = impostoPartilhaARecolher * (percentualAbatimentoForaMG / 100);
            impostoPartilhaARecolher -= valorAbatido;
            partilhaBase.valores.valorAbatidoForaMG = valorAbatido;
            partilhaBase.valores.percentualAbatimentoForaMG = percentualAbatimentoForaMG;
        }

        resultadoAgregadoPartilha.valores.impostoARecolher = Math.max(0, impostoPartilhaARecolher);
        partilhaBase.valores = { ...partilhaBase.valores, ...resultadoAgregadoPartilha.valores };
        partilhaBase.justificativaCalculo = Array.from(resultadoAgregadoPartilha.justificativaCalculo);

        const houveRecolhimentoPrevio = document.getElementById('check-recolhimento-previo').checked;
        const recolhimentoPrevio = {
            houve: houveRecolhimentoPrevio,
            valor: houveRecolhimentoPrevio ? parseFromBRL(document.getElementById('calc-valor-recolhido').value) : 0,
            data: houveRecolhimentoPrevio ? document.getElementById('calc-data-recolhimento').value : null
        };
        
        const calcularDescontoSobreRecolhido = document.getElementById('check-desconto-sobre-recolhido')?.checked || false;
        
        const isencaoImovelAte2007Confirmada = document.getElementById('check-isencao-imovel-ate2007')?.checked || false;
        
        const dadosParaCalculoFiscal = {
            baseCalculoReais,
            baseCalculoUfemg: baseCalculoCausaMortisUfemg,
            dataFatoGerador,
            dataPagamento,
            vencimento,
            recolhimentoPrevio,
            herdeiros: herdeirosDoCalculo,
            bens: bensDoCalculo,
            justificativas: justificativaIsencao ? [justificativaIsencao] : [],
            diferencaPartilha: partilhaBase, 
            isencaoImovelAte2007Confirmada,
            pagamentosAnteriores: pagamentosAnterioresDoCalculo,
            calcularDescontoSobreRecolhido,
            valorUfemgDoVencimento,
            tipoInventario: document.querySelector('input[name="tipo-inventario"]:checked')?.value || null,
            houveTransitoJulgado: document.getElementById('calc-transito-julgado')?.value === 'sim',
            dataTransitoJulgado: document.getElementById('calc-data-transito-julgado')?.value || '',
        };

        const resultadoFiscal = await moduloCalculo.calcular(dadosParaCalculoFiscal);
        ultimoResultadoCalculado = resultadoFiscal; 
        renderizarResultadosCalculo(resultadoFiscal, valorUfemgVencimentoPartilha);
    }
    
    function renderizarResultadosCalculo(resultado, valorUfemgVencimentoPartilha = 0) {
        let totalGeralARecolher = 0;

        const elsPrincipal = {
            baseUfemg: document.getElementById('res-base-ufemg'), baseReais: document.getElementById('res-base-reais'),
            aliquota: document.getElementById('res-aliquota'), itcdPrincipal: document.getElementById('res-itcd-principal'),
            pagamentoAnterior: document.getElementById('res-pagamento-anterior'),
            desconto: document.getElementById('res-desconto'), multa: document.getElementById('res-multa'),
            juros: document.getElementById('res-juros'), percentualJuros: document.getElementById('res-percentual-juros'),
            recolhimentoPrevio: document.getElementById('res-recolhimento-previo'),
            impostoARecolher: document.getElementById('res-imposto-a-recolher'), totalARecolher: document.getElementById('valor-total-recolher'),
            justificativa: document.getElementById('justificativa-calculo-container')
        };
        const elsPartilha = {
            baseUfemg: document.getElementById('res-partilha-base-ufemg'),
            baseReais: document.getElementById('res-partilha-base-reais'), aliquota: document.getElementById('res-partilha-aliquota'),
            itcdPrincipal: document.getElementById('res-partilha-itcd-principal'), desconto: document.getElementById('res-partilha-desconto'),
            pagamentoAnterior: document.getElementById('res-partilha-pagamento-anterior'),
            multa: document.getElementById('res-partilha-multa'), juros: document.getElementById('res-partilha-juros'),
            percentualJuros: document.getElementById('res-partilha-percentual-juros'),
            impostoARecolher: document.getElementById('res-partilha-imposto-a-recolher'),
            detalhesHerdeiros: document.getElementById('partilha-detalhes-herdeiros'),
            justificativa: document.getElementById('justificativa-partilha-container')
        };
        
        const resetarCampos = (els) => {
            Object.values(els).forEach(el => {
                if (el) {
                    if (el.id?.includes('aliquota')) el.textContent = "0%";
                    else if (el.id?.includes('percentual-juros')) el.textContent = "0.00";
                    else if (el.id?.includes('ufemg') || el.id?.includes('resumo')) el.textContent = "0,0000";
                    else if (el.id === 'justificativa-calculo-container' || el.id === 'partilha-detalhes-herdeiros' || el.id === 'justificativa-partilha-container') { el.innerHTML = ''; el.closest('details')?.removeAttribute('open'); }
                    else el.textContent = "R$ 0,00";
                }
            });
        };

        resetarCampos(elsPrincipal);
        resetarCampos(elsPartilha);

        if (!resultado || (resultado.erros && resultado.erros.length > 0)) {
            if (resultado?.erros?.[0] && !resultado.erros[0].includes("ainda não foi implementada")) {
                 uiModuleRef.showToastNotification(resultado.erros[0], 'warning');
            }
            return;
        }
        
        let justificativasHtml = (resultado.justificativaCalculo || []).map(j => `<p class="text-xs text-green-700 dark:text-green-300 font-semibold p-2 bg-green-50 dark:bg-green-900/50 rounded-md">${j}</p>`).join('');

        if (resultado.diferencaPartilha?.justificativaCalculo && resultado.diferencaPartilha.justificativaCalculo.length > 0) {
             justificativasHtml += Array.from(resultado.diferencaPartilha.justificativaCalculo).map(j => `<p class="text-xs text-blue-700 dark:text-blue-300 font-semibold p-2 mt-1 bg-blue-50 dark:bg-blue-900/50 rounded-md">${j}</p>`).join('');
        }
        
        if (resultado.valores) {
            const { valores } = resultado;
            const formatUfemgLocal = (val) => (val || 0).toLocaleString('pt-BR', {minimumFractionDigits: 4, maximumFractionDigits: 4});

            if (elsPrincipal.baseUfemg) elsPrincipal.baseUfemg.textContent = formatUfemgLocal(valores.baseCalculoUfemg);
            if (elsPrincipal.baseReais) elsPrincipal.baseReais.textContent = formatBRL(valores.baseCalculoReais);
            if (elsPrincipal.aliquota) elsPrincipal.aliquota.textContent = `${(typeof valores.aliquota === 'string' ? valores.aliquota : (valores.aliquota || 0).toLocaleString('pt-BR'))}%`;
            if (elsPrincipal.itcdPrincipal) elsPrincipal.itcdPrincipal.textContent = formatBRL(valores.itcdPrincipal);
            if (elsPrincipal.pagamentoAnterior) elsPrincipal.pagamentoAnterior.textContent = formatBRL(valores.pagamentoAnterior);
            if (elsPrincipal.desconto) elsPrincipal.desconto.textContent = formatBRL(valores.desconto);
            if (elsPrincipal.recolhimentoPrevio) elsPrincipal.recolhimentoPrevio.textContent = formatBRL(valores.recolhimentoPrevio);
            if (elsPrincipal.multa) elsPrincipal.multa.textContent = formatBRL(valores.multa);
            if (elsPrincipal.juros) elsPrincipal.juros.textContent = formatBRL(valores.juros);
            if (elsPrincipal.percentualJuros) elsPrincipal.percentualJuros.textContent = (valores.percentualJuros || 0).toFixed(2);
            
            if (valores.impostoARecolher < 0) {
                const valorMaior = Math.abs(valores.impostoARecolher);
                justificativasHtml += `<p class="feedback-message info mt-2"><b>Atenção:</b> Foi identificado um recolhimento a maior no valor de ${formatBRL(valorMaior)}.</p>`;
                if (elsPrincipal.impostoARecolher) elsPrincipal.impostoARecolher.textContent = formatBRL(0);
                totalGeralARecolher += 0;
            } else {
                if (elsPrincipal.impostoARecolher) elsPrincipal.impostoARecolher.textContent = formatBRL(valores.impostoARecolher);
                totalGeralARecolher += valores.impostoARecolher || 0;
            }
        }

        elsPrincipal.justificativa.innerHTML = justificativasHtml;

        if (resultado.diferencaPartilha?.valores?.baseCalculoUfemg > 0) {
             const { valores, detalhesPorHerdeiro } = resultado.diferencaPartilha;
             totalGeralARecolher += valores.impostoARecolher || 0;
             let detalhesHtml = '';

             if (detalhesPorHerdeiro && detalhesPorHerdeiro.length > 0) {
                 const detalhesFiltrados = detalhesPorHerdeiro.filter(det => (det.excedenteUfemg || 0) > 0.0001 || (det.excessoLiberalidadeUfemg || 0) > 0.0001);
                 if (detalhesFiltrados.length > 0) {
                    detalhesHtml = `
                        <details class="mt-2" open>
                            <summary class="text-xs text-blue-600 dark:text-blue-400 cursor-pointer">Ver detalhes por herdeiro</summary>
                            <div class="mt-2 p-2 border rounded-md bg-gray-50 dark:bg-slate-800/50 space-y-2">
                                ${detalhesFiltrados.map(det => {
                                    const quinhaoDevidoBRL = (det.quinhaoDevidoOriginalUfemg || det.legadoDevidoUfemg || 0) * valorUfemgVencimentoPartilha;
                                    const recebidoBRL = (det.quinhaoRecebidoUfemg || 0) * valorUfemgVencimentoPartilha;
                                    const excedenteBRL = (det.excedenteUfemg || 0) * valorUfemgVencimentoPartilha;
                                    const excessoLiberalidadeBRL = (det.excessoLiberalidadeUfemg || 0) * valorUfemgVencimentoPartilha;

                                    if (det.tipo === 'legatario') {
                                        return `
                                        <div class="text-xs p-1.5 border-t dark:border-slate-700">
                                            <p class="font-bold dark:text-gray-200">${det.nome} (Legatário)</p>
                                            <p class="dark:text-gray-300">Quinhão Devido: ${formatBRL(quinhaoDevidoBRL)} (${formatUFEMG(det.legadoDevidoUfemg)} UFEMG)</p>
                                            <p class="dark:text-gray-300">Recebido (de Fato): ${formatBRL(recebidoBRL)} (${formatUFEMG(det.quinhaoRecebidoUfemg)} UFEMG)</p>
                                            <p class="font-semibold text-purple-600 dark:text-purple-400">Excesso de Liberalidade: ${formatBRL(excessoLiberalidadeBRL)} (${formatUFEMG(det.excessoLiberalidadeUfemg)} UFEMG)</p>
                                        </div>`;
                                    } else if (det.tipo === 'meeiro') {
                                         return `
                                        <div class="text-xs p-1.5 border-t dark:border-slate-700">
                                            <p class="font-bold dark:text-gray-200">${det.nome}</p>
                                            <p class="dark:text-gray-300">Quinhão Devido (Meação): ${formatBRL(quinhaoDevidoBRL)} (${formatUFEMG(det.quinhaoDevidoOriginalUfemg)} UFEMG)</p>
                                            <p class="dark:text-gray-300">Recebido (de Fato): ${formatBRL(recebidoBRL)} (${formatUFEMG(det.quinhaoRecebidoUfemg)} UFEMG)</p>
                                            <p class="font-semibold text-blue-600 dark:text-blue-400">Excedente (Base de Cálculo): ${formatBRL(excedenteBRL)} (${formatUFEMG(det.excedenteUfemg)} UFEMG)</p>
                                        </div>`;
                                    }
                                    return `
                                    <div class="text-xs p-1.5 border-t dark:border-slate-700">
                                        <p class="font-bold dark:text-gray-200">${det.nome}</p>
                                        <p class="dark:text-gray-300">Quinhão Devido (Original): ${formatBRL(quinhaoDevidoBRL)} (${formatUFEMG(det.quinhaoDevidoOriginalUfemg)} UFEMG)</p>
                                        <p class="dark:text-gray-300">Recebido (de Fato): ${formatBRL(recebidoBRL)} (${formatUFEMG(det.quinhaoRecebidoUfemg)} UFEMG)</p>
                                        <p class="font-semibold text-blue-600 dark:text-blue-400">Excedente (Base de Cálculo): ${formatBRL(excedenteBRL)} (${formatUFEMG(det.excedenteUfemg)} UFEMG)</p>
                                    </div>
                                    `;
                                }).join('')}
                            </div>
                        </details>
                    `;
                }
             }

            elsPartilha.detalhesHerdeiros.innerHTML = detalhesHtml;
            elsPartilha.baseUfemg.textContent = formatUFEMG(valores.baseCalculoUfemg);
            elsPartilha.baseReais.textContent = formatBRL(valores.baseCalculoReais);
            elsPartilha.aliquota.textContent = `${valores.aliquota}%`;
            elsPartilha.itcdPrincipal.textContent = formatBRL(valores.itcdPrincipal);
            elsPartilha.desconto.textContent = formatBRL(valores.desconto);
            elsPartilha.pagamentoAnterior.textContent = formatBRL(valores.pagamentoAnterior);
            elsPartilha.multa.textContent = formatBRL(valores.multa);
            elsPartilha.juros.textContent = formatBRL(valores.juros);
            elsPartilha.percentualJuros.textContent = (valores.percentualJuros || 0).toFixed(2);
            elsPartilha.impostoARecolher.textContent = formatBRL(valores.impostoARecolher);
            
            let justificativaPartilhaHtml = '';
            if (valores.percentualAbatimentoForaMG > 0) {
                 justificativaPartilhaHtml = `<p class="text-xs text-green-700 dark:text-green-300 p-2 bg-green-50 dark:bg-green-900/50 rounded">Abatimento de ${formatBRL(valores.valorAbatidoForaMG)} aplicado (${valores.percentualAbatimentoForaMG.toFixed(2)}% de bens fora de MG).</p>`;
            }
            if (elsPartilha.justificativa) {
                elsPartilha.justificativa.innerHTML = justificativaPartilhaHtml;
            }
        }
        
        totalGeralARecolher = resultado.total?.impostoARecolher ?? totalGeralARecolher;
        if (totalGeralARecolher < 0) totalGeralARecolher = 0;

        if (elsPrincipal.totalARecolher) elsPrincipal.totalARecolher.textContent = formatBRL(totalGeralARecolher);
    }
    
    function renderListaRenuncias() {
        const container = document.getElementById('lista-renuncias-configuradas');
        if (!container) return;

        if (renunciasPorDeterminacao.length === 0) {
            container.innerHTML = '<p class="text-xs text-gray-500">Nenhuma renúncia direcionada adicionada.</p>';
            return;
        }
        
        container.innerHTML = renunciasPorDeterminacao.map(renuncia => {
            const renunciante = herdeirosDoCalculo.find(h => h.id === renuncia.de);
            const beneficiario = herdeirosDoCalculo.find(h => h.id === renuncia.para) || (renuncia.para === 'conjuge-meacao' ? { nome: 'Cônjuge (Meeiro)' } : null);
            if (!renunciante || !beneficiario) return '';

            let detalhesRenuncia = 'renunciou totalmente';
            if (renuncia.tipoRenuncia === 'parcial') {
                detalhesRenuncia = `renunciou parcialmente (${renuncia.percentual}%)`;
            }

            return `
                <li class="flex justify-between items-center bg-yellow-100 dark:bg-yellow-800/50 p-1.5 rounded-md">
                    <span><strong>${renunciante.nome}</strong> ${detalhesRenuncia} para <strong>${beneficiario.nome}</strong>.</span>
                    <button type="button" class="btn-link text-red-500 btn-excluir-renuncia-det" data-renunciante-id="${renuncia.de}">×</button>
                </li>
            `;
        }).join('');
    }

    function atualizarDropdownsRenuncia() {
        const deSelect = document.getElementById('renuncia-de');
        const paraSelect = document.getElementById('renuncia-para');
        if (!deSelect || !paraSelect) return;
        
        const renunciantesIds = renunciasPorDeterminacao.map(r => r.de);
        const herdeirosNaoRenunciantes = herdeirosDoCalculo.filter(h => !renunciantesIds.includes(h.id));
        
        let beneficiarios = [...herdeirosDoCalculo];
        const estadoCivil = document.getElementById('calc-estado-civil').value;
        const regimesComMeeiro = ['comunhao_universal', 'comunhao_parcial', 'uniao_estavel_parcial'];
        const regime = document.getElementById('calc-regime-bens').value;

        if (estadoCivil === 'casado' && regimesComMeeiro.includes(regime) && !beneficiarios.some(h => h.tipo === 'conjuge')) {
            beneficiarios.push({ id: 'conjuge-meacao', nome: 'Cônjuge (Meeiro)', tipo: 'conjuge' });
        }

        deSelect.innerHTML = '<option value="">Selecione...</option>' + herdeirosNaoRenunciantes.map(h => `<option value="${h.id}">${h.nome}</option>`).join('');
        paraSelect.innerHTML = '<option value="">Selecione...</option>' + beneficiarios.map(h => `<option value="${h.id}">${h.nome}</option>`).join('');
    }
    
    async function _handleAplicarPartilhaFinal() {
        const selectedBemIds = Array.from(document.querySelectorAll('.bem-selecao-checkbox:checked')).map(cb => cb.dataset.bemId);
    
        if (selectedBemIds.length === 0) {
            uiModuleRef.showToastNotification("Nenhum bem selecionado para aplicar a partilha.", "warning");
            return;
        }
    
        try {
            const sucessaoModule = window.SEFWorkStation.ITCD.Calculo.Sucessao;
            const estadoCivil = document.getElementById('calc-estado-civil').value;
            const regimeBens = document.getElementById('calc-regime-bens').value;
            const conjugeAscendenteFilhos = document.querySelector('input[name="conjuge-ascendente-filhos"]:checked')?.value;
            
            let participantesCalculo = [...herdeirosDoCalculo.filter(h => !h.renunciouMonte && h.tipo !== 'legatario')];
            const temConjugeCadastrado = participantesCalculo.some(h => h.tipo === 'conjuge');
            const regimesComMeeiro = ['comunhao_universal', 'comunhao_parcial', 'uniao_estavel_parcial', 'separacao_convencional'];
            
            if (estadoCivil === 'casado' && regimesComMeeiro.includes(regimeBens) && !temConjugeCadastrado) {
                 participantesCalculo.push({ id: 'conjuge-meacao', nome: 'Cônjuge (Meeiro)', tipo: 'conjuge' });
            }

            const totais = sucessaoModule.calcularTotaisIniciais(bensDoCalculo, regimeBens);
            const partilhaLegal = await sucessaoModule.determinarPartilhaLegitima(participantesCalculo, totais, estadoCivil, regimeBens, conjugeAscendenteFilhos);
    
            const percentuaisComuns = new Map();
            const percentuaisParticulares = new Map();
    
            if (totais.meacao > 0) {
                partilhaLegal.heranca.forEach((valorQuinhao, herdeiroId) => {
                    const percentual = (valorQuinhao.fromComuns / totais.meacao) * 100;
                    if(percentual > 0) percentuaisComuns.set(herdeiroId, percentual);
                });
            }
            if (totais.bensParticulares > 0) {
                partilhaLegal.heranca.forEach((valorQuinhao, herdeiroId) => {
                    const percentual = (valorQuinhao.fromParticulares / totais.bensParticulares) * 100;
                    if(percentual > 0) percentuaisParticulares.set(herdeiroId, percentual);
                });
            }
    
            bensDoCalculo.forEach(bem => {
                if (!selectedBemIds.includes(bem.id) || bem.destinadoTestamento) return;
                
                bem.partilha = {};
                const naturezaEfetiva = regimeBens === 'comunhao_universal' ? 'comum' : bem.natureza;
    
                if (naturezaEfetiva === 'comum') {
                    if (partilhaLegal.meacao > 0) {
                        bem.partilha['conjuge-meacao'] = 50;
                    }
                    percentuaisComuns.forEach((percentual, herdeiroId) => {
                        const percentualAplicadoAoBem = percentual * 0.5;
                        bem.partilha[herdeiroId] = parseFloat(percentualAplicadoAoBem.toFixed(6));
                    });
                } else {
                    percentuaisParticulares.forEach((percentual, herdeiroId) => {
                        bem.partilha[herdeiroId] = parseFloat(percentual.toFixed(6));
                    });
                }
            });
    
            await renderListaBens();
            uiModuleRef.showToastNotification("Partilha legal aplicada aos bens selecionados.", "success");
        } catch (error) {
            console.error("Erro ao aplicar partilha final:", error);
            uiModuleRef.showToastNotification(error.message, 'error', 0);
        }
    }

    async function _abrirModalPartilhaSeletiva() {
        const selectedBemIds = Array.from(document.querySelectorAll('.bem-selecao-checkbox:checked')).map(cb => cb.dataset.bemId);

        if (selectedBemIds.length === 0) {
            uiModuleRef.showToastNotification("Nenhum bem selecionado para a partilha manual.", "warning");
            return;
        }

        let herdeirosParaPartilha = herdeirosDoCalculo.filter(h => !h.renunciouMonte);
        const estadoCivil = document.getElementById('calc-estado-civil').value;
        const regimesComMeeiro = ['comunhao_universal', 'comunhao_parcial', 'uniao_estavel_parcial'];
        const regime = document.getElementById('calc-regime-bens').value;

        if (estadoCivil === 'casado' && regimesComMeeiro.includes(regime) && !herdeirosParaPartilha.some(h => h.tipo === 'conjuge')) {
            herdeirosParaPartilha.push({ id: 'conjuge-meacao', nome: 'Cônjuge (Meeiro)', tipo: 'conjuge' });
        }

        let modalContent = `
            <div id="feedback-partilha-seletiva-modal"></div>
            <p class="text-sm mb-4">Defina as porcentagens para os herdeiros abaixo. A soma deve ser 100%.</p>
            <div class="space-y-2">
                ${herdeirosParaPartilha.map(h => `
                    <div class="flex items-center gap-2">
                        <label class="w-1/2">${h.nome}:</label>
                        <input type="number" data-herdeiro-id="${h.id}" class="form-input-text w-1/2 partilha-seletiva-input" placeholder="%">
                    </div>
                `).join('')}
            </div>
            <div class="mt-4 pt-2 border-t font-semibold">
                Total: <span id="total-partilha-seletiva">0.00</span>%
            </div>
        `;

        const modal = uiModuleRef.showModal("Definir Partilha Manual", modalContent, [
            { text: 'Cancelar', class: 'btn-secondary', closesModal: true },
            { text: 'Aplicar aos Selecionados', class: 'btn-primary', callback: () => {
                return _handleConfirmarPartilhaSeletiva(selectedBemIds);
            }}
        ]);
        
        modal.querySelector('#modal-content').addEventListener('input', e => {
            if(e.target.classList.contains('partilha-seletiva-input')) {
                let total = 0;
                modal.querySelectorAll('.partilha-seletiva-input').forEach(input => {
                    total += parseFloat(input.value) || 0;
                });
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
            if (percentual > 0) {
                partilhaDefinida[input.dataset.herdeiroId] = percentual;
            }
        });

        if (Math.abs(total - 100) > 0.01) {
            feedbackEl.innerHTML = `<p class="text-red-500 text-sm">A soma das porcentagens deve ser exatamente 100%.</p>`;
            return false;
        }

        bensDoCalculo.forEach(bem => {
            if (selectedBemIds.includes(bem.id)) {
                bem.partilha = {};
                for (const herdeiroId in partilhaDefinida) {
                    bem.partilha[herdeiroId] = parseFloat(partilhaDefinida[herdeiroId].toFixed(6));
                }
            }
        });

        renderListaBens();
        uiModuleRef.showToastNotification("Partilha manual aplicada com sucesso.", "success");
        return true;
    }
    
    async function _handleConfirmarAdicaoBem(modal) {
        const id = modal.querySelector('#bem-id-modal').value;
        const bemExistente = bensDoCalculo.find(b => b.id === id);
        const isEditing = !!bemExistente;

        const novoBem = {
            id: id || appModuleRef.generateUUID(),
            tipo: modal.querySelector('#bem-tipo-modal').value,
            imovelTipo: modal.querySelector('#bem-imovel-tipo-modal').value,
            foraDeMG: modal.querySelector('#bem-fora-mg-modal')?.checked || false,
            descricao: modal.querySelector('#bem-descricao-modal').value.trim(),
            valorAvaliacao: parseFromBRL(modal.querySelector('#bem-valor-avaliacao-modal').value),
            percentualTransmissao: parseFloat(modal.querySelector('#bem-percentual-transmissao-modal').value) || 100,
            natureza: modal.querySelector('#bem-natureza-modal').value,
            partilha: isEditing ? (bemExistente.partilha || {}) : {},
            anoReferenciaUfemg: parseInt(modal.querySelector('#bem-ano-avaliacao-modal').value),
            destinadoTestamento: modal.querySelector('#bem-destinado-testamento-modal') ? modal.querySelector('#bem-destinado-testamento-modal').checked : false
        };

        if (isEditing) {
            const index = bensDoCalculo.findIndex(b => b.id === id);
            if (index > -1) {
                bensDoCalculo[index] = novoBem;
            }
        } else {
            bensDoCalculo.push(novoBem);
            await _handleAplicarPartilhaFinal(); // Aplica a partilha final, considerando renúncias
        }
        
        await renderListaBens();
        await atualizarResumoEExecutarCalculo();
        return true; 
    }

    async function abrirModalAdicionarBem(bemExistente = null) {
        const isEditing = bemExistente !== null;
        const tituloModal = isEditing ? 'Editar Bem ou Direito' : 'Adicionar Bem ou Direito';
    
        let tiposBensOptions = TIPOS_DE_BENS_PRINCIPAIS.map(t => `<option value="${t.key}" ${bemExistente?.tipo === t.key ? 'selected' : ''}>${t.label}</option>`).join('');
        
        const houveTestamento = document.getElementById('check-testamento').checked;
        const testamentoCheckboxHtml = houveTestamento ? `
            <div id="container-bem-testamento-modal" class="mt-3">
                <label class="inline-flex items-center">
                    <input type="checkbox" id="bem-destinado-testamento-modal" class="form-checkbox h-4 w-4" ${bemExistente?.destinadoTestamento ? 'checked' : ''}>
                    <span class="ml-2 text-sm">Bem destinado por Testamento (Legado)</span>
                </label>
            </div>
        ` : '';

        const modalContent = `
            <form id="form-adicionar-bem" class="space-y-4">
                <input type="hidden" id="bem-id-modal" value="${bemExistente?.id || ''}">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label for="bem-tipo-modal" class="block text-sm font-medium">Tipo do Bem:</label>
                        <select id="bem-tipo-modal" class="form-input-text mt-1">${tiposBensOptions}</select>
                    </div>
                    <div id="container-tipo-imovel-modal" class="hidden">
                         <label for="bem-imovel-tipo-modal" class="block text-sm font-medium">Tipo do Imóvel:</label>
                         <select id="bem-imovel-tipo-modal" class="form-input-text mt-1">
                            <option value="residencial" ${bemExistente?.imovelTipo === 'residencial' ? 'selected' : ''}>Residencial</option>
                            <option value="nao_residencial" ${bemExistente?.imovelTipo === 'nao_residencial' ? 'selected' : ''}>Não Residencial</option>
                         </select>
                    </div>
                </div>
                <div>
                    <label for="bem-descricao-modal" class="block text-sm font-medium">Descrição:</label>
                    <input type="text" id="bem-descricao-modal" class="form-input-text mt-1" placeholder="Descrição detalhada do bem" value="${bemExistente?.descricao || ''}">
                </div>
                 <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label for="bem-valor-avaliacao-modal" class="block text-sm font-medium">Valor de Avaliação:</label>
                        <input type="text" id="bem-valor-avaliacao-modal" class="form-input-text mt-1 currency-input" value="${formatBRL(bemExistente?.valorAvaliacao || 0)}">
                     </div>
                     <div>
                         <label for="bem-percentual-transmissao-modal" class="block text-sm font-medium">% Transmitido:</label>
                         <input type="number" id="bem-percentual-transmissao-modal" class="form-input-text mt-1" min="0" max="100" step="0.01" value="${bemExistente?.percentualTransmissao || 100}">
                     </div>
                      <div>
                        <label for="bem-ano-avaliacao-modal" class="block text-sm font-medium">Ano da Avaliação (p/ UFEMG):</label>
                        <input type="number" id="bem-ano-avaliacao-modal" class="form-input-text mt-1" placeholder="AAAA" value="${bemExistente?.anoReferenciaUfemg || new Date().getFullYear()}">
                      </div>
                      <div class="flex items-end">
                        <p id="display-valor-ufemg-modal" class="text-xs text-gray-600 dark:text-gray-400"></p>
                      </div>
                 </div>
                 <div>
                    <label for="bem-natureza-modal" class="block text-sm font-medium">Natureza do Bem:</label>
                    <select id="bem-natureza-modal" class="form-input-text mt-1">
                        <option value="particular" ${bemExistente?.natureza === 'particular' ? 'selected' : ''}>Particular</option>
                        <option value="comum" ${bemExistente?.natureza === 'comum' ? 'selected' : ''}>Comum (do casal)</option>
                    </select>
                 </div>
                 <div id="container-bem-fora-mg-modal" class="hidden mt-2">
                    <label class="inline-flex items-center">
                        <input type="checkbox" id="bem-fora-mg-modal" class="form-checkbox h-4 w-4" ${bemExistente?.foraDeMG ? 'checked' : ''}>
                        <span class="ml-2 text-sm">Bem localizado fora de MG (não tributável)</span>
                    </label>
                </div>
                 ${testamentoCheckboxHtml}
            </form>
        `;
    
        const modal = uiModuleRef.showModal(tituloModal, modalContent, [
            { text: "Cancelar", class: "btn-secondary", closesModal: true },
            { text: isEditing ? "Salvar Alterações" : "Adicionar", class: "btn-primary", callback: () => _handleConfirmarAdicaoBem(modal) }
        ]);
    
        if (modal) {
            const valorInput = modal.querySelector('#bem-valor-avaliacao-modal');
            const anoInput = modal.querySelector('#bem-ano-avaliacao-modal');
            if (valorInput) valorInput.addEventListener('input', updateModalUI);
            if (anoInput) anoInput.addEventListener('input', updateModalUI);
    
            modal.querySelector('#bem-tipo-modal').addEventListener('change', updateModalUI);
            
            modal.querySelectorAll('.currency-input').forEach(input => {
                input.addEventListener('blur', e => { e.target.value = formatBRL(parseFromBRL(e.target.value)); });
            });
    
            updateModalUI();
        }
    }

    return {
        init,
        renderFormCausaMortis,
        salvarCalculoAtual,
        TIPOS_DE_BENS_PRINCIPAIS
    };
})();