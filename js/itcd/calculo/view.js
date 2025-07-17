// js/itcd/calculo/view.js - Módulo para Visualização de Cálculos de ITCD
// v5.5.0 - ALTERADO: O botão "Editar" agora envia um parâmetro para que o formulário de cálculo abra em modo de visualização, aguardando a ação do usuário para habilitar a edição.
// v5.4.0 - REATORADO: A exibição do demonstrativo final foi completamente refeita para se alinhar com a nova estrutura de cálculo e exibir corretamente os valores do imposto principal (Causa Mortis) e da Diferença de Partilha, incluindo o abatimento de pagamentos anteriores em ambas as seções.
// v5.3.0 - ALTERADO: Refatorada a exibição para mostrar uma lista detalhada de múltiplos pagamentos anteriores, com valor, data e tipo. O demonstrativo final agora soma e exibe os pagamentos corretamente.
// ... (histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ITCD = window.SEFWorkStation.ITCD || {};
window.SEFWorkStation.ITCD.Calculo = window.SEFWorkStation.ITCD.Calculo || {};

window.SEFWorkStation.ITCD.Calculo.View = (function() {

    let mainContentWrapperRef;
    let dbRef;
    let appModuleRef;
    let uiModuleRef;
    
    const ITCD_CALCULOS_STORE = 'itcdCalculosStore';

    function init(db, app, ui, mainWrapper) {
        dbRef = db;
        appModuleRef = app;
        uiModuleRef = ui;
        mainContentWrapperRef = mainWrapper;
        console.log("Módulo ITCD.Calculo.View inicializado (v5.5.0).");
    }

    function formatBRL(value) {
        if (isNaN(value) || value === null || value === undefined) return 'R$ 0,00';
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    
    function formatUFEMG(value) {
        if (isNaN(value) || value === null || value === undefined) return 'N/A';
        return value.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    }

    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        // Adiciona o timezone offset para corrigir a data (problema comum em JS)
        return new Date(date.getTime() + date.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR');
    }

    async function _getValorUfemgDoacao(valor, data) {
         if (!valor || !data || valor <= 0) return 0;
         const ano = new Date(data + "T00:00:00").getFullYear();
         const ufemgAno = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(ano);
         return ufemgAno > 0 ? valor / ufemgAno : 0;
    }
    
    async function renderVisualizarCalculoPage(calculoId) {
        if (!mainContentWrapperRef) return;
        mainContentWrapperRef.innerHTML = `<p class="loading-text p-4">Carregando detalhes do cálculo...</p>`;
        
        try {
            const calculo = await dbRef.getItemById(ITCD_CALCULOS_STORE, calculoId);
            if (!calculo) throw new Error(`Cálculo com ID ${calculoId} não encontrado.`);

            let detalhesHtml = '';
            switch(calculo.tipoCalculo) {
                case 'causaMortis':
                    detalhesHtml = await _renderVisualizacaoCausaMortis(calculo);
                    break;
                case 'doacao':
                    detalhesHtml = _renderVisualizacaoDoacao(calculo);
                    break;
                case 'excedenteMeacao':
                    detalhesHtml = await _renderVisualizacaoExcedente(calculo);
                    break;
                case 'usufruto_instituicao':
                case 'usufruto_extincao':
                    detalhesHtml = _renderVisualizacaoUsufruto(calculo);
                    break;
                case 'doacoesSucessivas':
                    detalhesHtml = await _renderVisualizacaoDoacoesSucessivas(calculo);
                    break;
                default:
                    detalhesHtml = `<p class="feedback-message warning">Tipo de cálculo "${calculo.tipoCalculo}" não reconhecido.</p>`;
            }
            
            mainContentWrapperRef.innerHTML = `
                <div id="view-calculo-container" class="page-section max-w-none px-4 sm:px-6 lg:px-8">
                    <div class="flex justify-between items-center mb-4 section-not-for-print">
                        <div>
                            <h2 class="text-2xl font-semibold dark:text-gray-100">Demonstrativo de Cálculo de ITCD</h2>
                            <p class="text-sm text-gray-500 dark:text-gray-400">ID: ${calculo.id}</p>
                        </div>
                        <div class="actions-group flex flex-wrap gap-2">
                            <button id="btn-voltar-calculo-lista" class="btn-secondary btn-sm">Voltar</button>
                            <button id="btn-editar-calculo-view" class="btn-primary btn-sm">Editar Cálculo</button>
                            <button id="btn-imprimir-calculo-view" class="btn-primary bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 btn-sm">Imprimir</button>
                        </div>
                    </div>

                    <div id="calculo-view-content-wrapper" class="space-y-6">
                        ${detalhesHtml}
                        <div class="card">
                            <h3 class="card-header dark:text-gray-200">Demonstrativo Final do Cálculo</h3>
                            <div id="demonstrativo-final-container" class="p-3">
                                <!-- Conteúdo será renderizado dinamicamente -->
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            await _renderDemonstrativoFinal(calculo); 
            addEventListenersToView(calculo);

        } catch (error) {
            console.error("Erro ao carregar cálculo para visualização:", error);
            mainContentWrapperRef.innerHTML = `<p class="feedback-message error">Falha ao carregar os detalhes do cálculo: ${error.message}</p>`;
        }
    }

    async function _renderVisualizacaoCausaMortis(calculo) {
        let pagamentosAnterioresHtml = '';
        if (calculo.pagamentosAnteriores && calculo.pagamentosAnteriores.length > 0) {
            const pagamentosRows = calculo.pagamentosAnteriores.map(p => `
                <tr>
                    <td class="py-2 px-3 dark:text-gray-200">${formatDate(p.data)}</td>
                    <td class="py-2 px-3 text-right dark:text-gray-200">${formatBRL(p.valor)}</td>
                    <td class="py-2 px-3 dark:text-gray-200">${p.tipo === 'causaMortis' ? 'Causa Mortis' : 'Diferença de Partilha'}</td>
                </tr>
            `).join('');

            pagamentosAnterioresHtml = `
                <div class="info-item col-span-full">
                    <dt>Pagamentos Anteriores:</dt>
                    <dd>
                        <div class="table-list-container mt-1">
                            <table class="documentos-table">
                                <thead><tr><th>Data</th><th class="text-right">Valor</th><th>Referente a</th></tr></thead>
                                <tbody>${pagamentosRows}</tbody>
                            </table>
                        </div>
                    </dd>
                </div>`;
        } else {
             pagamentosAnterioresHtml = `<div class="info-item"><dt>Houve Pagamento Anterior:</dt><dd>Não</dd></div>`;
        }

        const dadosDeclaracaoHtml = `
            <div class="card">
                <h3 class="card-header dark:text-gray-200">Dados da Declaração</h3>
                <dl class="card-dl-grid">
                    <div class="info-item"><dt>Nº da Declaração (DBD):</dt><dd>${calculo.declaracaoNumero || 'N/A'}</dd></div>
                    <div class="info-item"><dt>De Cujus:</dt><dd>${calculo.deCujusNome || 'N/A'}</dd></div>
                    <div class="info-item"><dt>Data do Fato Gerador:</dt><dd>${formatDate(calculo.dataFatoGerador)}</dd></div>
                    <div class="info-item"><dt>Data de Pagamento (Base):</dt><dd>${formatDate(calculo.dataPagamento)}</dd></div>
                    <div class="info-item"><dt>Estado Civil:</dt><dd>${calculo.estadoCivil || 'N/A'}</dd></div>
                    <div class="info-item"><dt>Regime de Bens:</dt><dd>${calculo.regimeBens || 'N/A'}</dd></div>
                    <div class="info-item"><dt>Tipo de Inventário:</dt><dd>${calculo.tipoInventario || 'N/A'}</dd></div>
                    <div class="info-item"><dt>Houve Testamento:</dt><dd>${calculo.houveTestamento ? 'Sim' : 'Não'}</dd></div>
                    <div class="info-item"><dt>Data do Salvamento:</dt><dd>${new Date(calculo.dataSalvamento).toLocaleString('pt-BR')}</dd></div>
                    ${pagamentosAnterioresHtml}
                </dl>
            </div>
        `;

        const herdeiros = calculo.herdeiros || [];
        const listaHerdeirosHtml = herdeiros.length > 0 ? `
            <div class="card">
                <h3 class="card-header dark:text-gray-200">Herdeiros e Legatários</h3>
                <div class="table-list-container">
                    <table class="documentos-table">
                        <thead><tr><th>Nome</th><th>Tipo</th><th>Renunciou ao Monte</th></tr></thead>
                        <tbody>${herdeiros.map(h => `<tr><td class="py-2 px-3 dark:text-gray-200">${h.nome}</td><td class="py-2 px-3 dark:text-gray-200">${h.tipo}</td><td class="py-2 px-3 dark:text-gray-200">${h.renunciouMonte ? 'Sim' : 'Não'}</td></tr>`).join('')}</tbody>
                    </table>
                </div>
            </div>` : '';
        
        const bens = calculo.bens || [];
        let listaBensHtml = '';
        if (bens.length > 0) {
            let bensRows = '';
            for(const b of bens) {
                const valorUfemgAno = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(b.anoReferenciaUfemg);
                const valorEmUfemg = valorUfemgAno > 0 ? (b.valorAvaliacao / valorUfemgAno) : 0;
                const ufemgDisplay = valorEmUfemg > 0 ? `<span class="text-xs text-gray-500 dark:text-gray-400">(${formatUFEMG(valorEmUfemg)} UFEMG/${b.anoReferenciaUfemg})</span>` : '';
                bensRows += `<tr><td class="py-2 px-3 dark:text-gray-200">${b.descricao || b.tipo} ${b.foraDeMG ? '<span class="text-xs font-bold text-yellow-600 dark:text-yellow-400">[FORA DE MG]</span>' : ''}</td><td class="py-2 px-3 dark:text-gray-200">${b.natureza}</td><td class="py-2 px-3 text-right dark:text-gray-200"><div>${formatBRL(b.valorAvaliacao)}</div>${ufemgDisplay}</td><td class="py-2 px-3 text-right dark:text-gray-200">${b.percentualTransmissao}%</td></tr>`;
            }
            listaBensHtml = `<div class="card"><h3 class="card-header dark:text-gray-200">Bens e Direitos</h3><div class="table-list-container"><table class="documentos-table"><thead><tr><th>Descrição</th><th>Natureza</th><th class="text-right">Valor</th><th class="text-right">% Transmitido</th></tr></thead><tbody>${bensRows}</tbody></table></div></div>`;
        }

        return dadosDeclaracaoHtml + listaHerdeirosHtml + listaBensHtml;
    }

    function _renderVisualizacaoDoacao(calculo) {
        const doadoresHtml = (calculo.doadores || []).map(d => `<span class="block">${d.nome}</span>`).join('');
        const donatariosHtml = (calculo.donatarios || []).map(d => `<span class="block">${d.nome}</span>`).join('');

        const bensHtml = (calculo.bens || []).map(b => `
            <tr>
                <td class="py-2 px-3 dark:text-gray-200">${b.descricao}</td>
                <td class="py-2 px-3 text-right dark:text-gray-200">${formatBRL(b.valor)}</td>
                <td class="py-2 px-3 dark:text-gray-200">${calculo.tipoDoacaoGlobal === 'nua_propriedade' ? 'Nua-Propriedade' : 'Plena'}</td>
            </tr>
        `).join('');

        return `
            <div class="card">
                <h3 class="card-header dark:text-gray-200">Dados da Doação</h3>
                 <dl class="card-dl-grid">
                    <div class="info-item"><dt>Doador(es):</dt><dd>${doadoresHtml || 'N/A'}</dd></div>
                    <div class="info-item"><dt>Donatário(s):</dt><dd>${donatariosHtml || 'N/A'}</dd></div>
                    <div class="info-item"><dt>Data do Fato Gerador:</dt><dd>${formatDate(calculo.dataFatoGerador)}</dd></div>
                    <div class="info-item"><dt>Tipo de Propriedade:</dt><dd>${calculo.tipoDoacaoGlobal === 'nua_propriedade' ? 'Nua-Propriedade' : 'Plena'}</dd></div>
                </dl>
            </div>
            <div class="card">
                <h3 class="card-header dark:text-gray-200">Bens Doados</h3>
                <div class="table-list-container"><table class="documentos-table"><thead><tr><th>Descrição</th><th class="text-right">Valor</th><th>Tipo</th></tr></thead><tbody>${bensHtml}</tbody></table></div>
            </div>
        `;
    }
    
    async function _renderVisualizacaoExcedente(calculo) {
        const dados = calculo.dadosPartilha || {};
        const bensHtml = (calculo.bens || []).map(b => `
            <tr>
                <td class="py-2 px-3 dark:text-gray-200">${b.descricao}</td>
                <td class="py-2 px-3 dark:text-gray-200">${b.natureza}</td>
                <td class="py-2 px-3 text-right dark:text-gray-200">${formatBRL(b.valor)}</td>
                <td class="py-2 px-3 text-right dark:text-gray-200">${b.partilha1}%</td>
                <td class="py-2 px-3 text-right dark:text-gray-200">${b.partilha2}%</td>
            </tr>
        `).join('');

        return `
            <div class="card">
                <h3 class="card-header dark:text-gray-200">Dados da Partilha (Excedente de Meação)</h3>
                 <dl class="card-dl-grid">
                    <div class="info-item"><dt>Nº da Declaração (DBD):</dt><dd>${calculo.declaracaoNumero || 'N/A'}</dd></div>
                    <div class="info-item"><dt>Cônjuge 1 (Favorecido):</dt><dd>${dados.conjuge1 || 'N/A'}</dd></div>
                    <div class="info-item"><dt>Cônjuge 2:</dt><dd>${dados.conjuge2 || 'N/A'}</dd></div>
                    <div class="info-item"><dt>Data do Fato Gerador:</dt><dd>${calculo.dataFatoGerador ? formatDate(calculo.dataFatoGerador) : 'Não ocorrido'}</dd></div>
                    <div class="info-item"><dt>Regime de Bens:</dt><dd>${(dados.regimeBens || '').replace(/_/g, ' ').replace(/(^\w|\s\w)/g, m => m.toUpperCase()) || 'N/A'}</dd></div>
                </dl>
            </div>
            <div class="card">
                <h3 class="card-header dark:text-gray-200">Bens Partilhados</h3>
                <div class="table-list-container">
                    <table class="documentos-table">
                        <thead><tr><th>Descrição</th><th>Natureza</th><th class="text-right">Valor</th><th class="text-right">Partilha C1 (%)</th><th class="text-right">Partilha C2 (%)</th></tr></thead>
                        <tbody>${bensHtml}</tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    function _renderVisualizacaoUsufruto(calculo) {
        const isInstituicao = calculo.tipoCalculo === 'usufruto_instituicao';
        const dados = calculo.dadosUsufruto || {};
        const instituidores = (dados.instituidores || []).map(p => p.nome).join(', ');
        const antigosUsufrutuarios = (dados.antigosUsufrutuarios || []).map(p => p.nome).join(', ');
        const beneficiarios = (dados.beneficiarios || []).map(p => p.nome).join(', ');

        const bensHtml = (calculo.bens || []).map(b => `
            <tr>
                <td class="py-2 px-3 dark:text-gray-200">${b.descricao}</td>
                <td class="py-2 px-3 text-right dark:text-gray-200">${formatBRL(b.valor)}</td>
                <td class="py-2 px-3 text-right dark:text-gray-200">${b.percentual}%</td>
            </tr>
        `).join('');

        return `
            <div class="card">
                <h3 class="card-header dark:text-gray-200">Dados da ${isInstituicao ? 'Instituição' : 'Extinção'} de Usufruto</h3>
                <dl class="card-dl-grid">
                    <div class="info-item"><dt>${isInstituicao ? 'Instituidor(es)' : 'Antigo(s) Usufrutuário(s)'}:</dt><dd>${isInstituicao ? instituidores : antigosUsufrutuarios || 'N/A'}</dd></div>
                    <div class="info-item"><dt>${isInstituicao ? 'Beneficiário(s) (Usufrutuário)' : 'Beneficiário(s) (Nu-Proprietário)'}:</dt><dd>${beneficiarios || 'N/A'}</dd></div>
                    <div class="info-item"><dt>Data do Fato Gerador:</dt><dd>${formatDate(calculo.dataFatoGerador)}</dd></div>
                    ${isInstituicao ? `<div class="info-item"><dt>Efetivada?</dt><dd>${dados.efetivada ? 'Sim' : 'Não'}</dd></div>` : `<div class="info-item"><dt>Motivo:</dt><dd>${dados.motivoExtincao || 'N/A'}</dd></div>`}
                </dl>
            </div>
            <div class="card">
                <h3 class="card-header dark:text-gray-200">Bens Objeto do Usufruto</h3>
                <div class="table-list-container"><table class="documentos-table"><thead><tr><th>Descrição</th><th class="text-right">Valor</th><th class="text-right">%</th></tr></thead><tbody>${bensHtml}</tbody></table></div>
            </div>
        `;
    }

    async function _renderVisualizacaoDoacoesSucessivas(calculo) {
        let bensRows = '';
        if(calculo.bens && calculo.bens.length > 0) {
            for (const doacao of calculo.bens) {
                const valorEmUfemg = await _getValorUfemgDoacao(doacao.valor, doacao.data);
                const ufemgDisplay = valorEmUfemg > 0 ? `<span class="text-xs text-gray-500 dark:text-gray-400">(${formatUFEMG(valorEmUfemg)} UFEMG)</span>` : '';

                let pagoEmUfemgDisplay = '';
                if (doacao.valorPago > 0 && doacao.dataPago) {
                    const pagoEmUfemg = await _getValorUfemgDoacao(doacao.valorPago, doacao.dataPago);
                    if (pagoEmUfemg > 0) {
                        pagoEmUfemgDisplay = `<span class="text-xs text-green-600 dark:text-green-400">(${formatUFEMG(pagoEmUfemg)} UFEMG)</span>`;
                    }
                }
                bensRows += `
                    <tr>
                        <td class="py-2 px-3 dark:text-gray-200">${doacao.doador || 'N/A'}</td>
                        <td class="py-2 px-3 dark:text-gray-200">${formatDate(doacao.data)}</td>
                        <td class="py-2 px-3 text-right dark:text-gray-200">${formatBRL(doacao.valor)} ${ufemgDisplay}</td>
                        <td class="py-2 px-3 text-right dark:text-gray-200">${formatBRL(doacao.valorPago)} ${pagoEmUfemgDisplay}</td>
                    </tr>
                `;
            }
        }

        return `
            <div class="card">
                <h3 class="card-header dark:text-gray-200">Dados Gerais - Doações Sucessivas</h3>
                 <dl class="card-dl-grid">
                    <div class="info-item"><dt>Nº da Declaração:</dt><dd>${calculo.declaracaoNumero || 'N/A'}</dd></div>
                    <div class="info-item"><dt>Donatário:</dt><dd>${calculo.donatario || 'N/A'}</dd></div>
                    <div class="info-item"><dt>Data de Pagamento (Base):</dt><dd>${formatDate(calculo.dataPagamento)}</dd></div>
                </dl>
            </div>
            <div class="card">
                <h3 class="card-header dark:text-gray-200">Lista de Doações Consideradas</h3>
                <div class="table-list-container"><table class="documentos-table">
                    <thead><tr><th>Doador</th><th>Data</th><th class="text-right">Valor</th><th class="text-right">ITCD Recolhido</th></tr></thead>
                    <tbody>${bensRows}</tbody>
                </table></div>
            </div>
        `;
    }
    
    async function _renderDemonstrativoFinal(calculo) {
        const container = document.getElementById('demonstrativo-final-container');
        if (!container || !calculo || !calculo.resultadoFinal) {
            container.innerHTML = `<p class="feedback-message warning">Não há um resultado de cálculo salvo para exibir.</p>`;
            return;
        }

        const resultado = calculo.resultadoFinal;

        if (resultado.erros?.length > 0) {
            container.innerHTML = `<p class="feedback-message error">${resultado.erros[0]}</p>`;
            return;
        }
        
        let html = '';
        let totalGeralARecolher = 0;

        // Lógica de Renderização para Causa Mortis e seus sub-cálculos
        if (calculo.tipoCalculo === 'causaMortis' && resultado.valores) {
            const { valores, legislacaoAplicada } = resultado;
            totalGeralARecolher += valores.impostoARecolher || 0;

            let justificativasHtml = (resultado.justificativaCalculo || []).join('<br>');
            let valorARecolherPrincipalTexto = formatBRL(valores.impostoARecolher < 0 ? 0 : valores.impostoARecolher);
            
            if (valores.impostoARecolher < 0) {
                 justificativasHtml += `<br><b>Aviso:</b> Identificado recolhimento a maior no valor de ${formatBRL(Math.abs(valores.impostoARecolher))}.`;
            }

            html += `
                <div class="mb-6">
                    <h4 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Cálculo Principal (${legislacaoAplicada || 'N/A'})</h4>
                    <dl class="card-dl-grid text-sm">
                        <div class="info-item"><dt>Base de Cálculo (R$):</dt><dd>${formatBRL(valores.baseCalculoReais)}</dd></div>
                        <div class="info-item"><dt>Alíquota:</dt><dd>${typeof valores.aliquota === 'string' ? valores.aliquota : `${(valores.aliquota || 0).toLocaleString('pt-BR')}%`}</dd></div>
                        <div class="info-item"><dt>ITCD Principal:</dt><dd>${formatBRL(valores.itcdPrincipal)}</dd></div>
                        <div class="info-item"><dt>Desconto:</dt><dd>${formatBRL(valores.desconto)}</dd></div>
                        <div class="info-item"><dt>Pagamento(s) Anterior(es):</dt><dd>${formatBRL(valores.pagamentoAnterior)}</dd></div>
                        <div class="info-item"><dt>Recolhimento Prévio:</dt><dd>${formatBRL(valores.recolhimentoPrevio)}</dd></div>
                        <div class="info-item"><dt>Multa:</dt><dd>${formatBRL(valores.multa)}</dd></div>
                        <div class="info-item"><dt>Juros (${(valores.percentualJuros || 0).toFixed(2)}%):</dt><dd>${formatBRL(valores.juros)}</dd></div>
                        <div class="info-item col-span-full font-bold text-base"><dt>Imposto a Recolher (Principal):</dt><dd>${valorARecolherPrincipalTexto}</dd></div>
                    </dl>
                    <div class="mt-2 text-xs text-green-700 dark:text-green-300 p-2 bg-green-50 dark:bg-green-900/50 rounded-md">${justificativasHtml}</div>
                </div>
            `;
            
            // Renderiza o card da diferença de partilha, se houver
            if (resultado.diferencaPartilha && resultado.diferencaPartilha.valores.baseCalculoUfemg > 0) {
                 const partilha = resultado.diferencaPartilha.valores;
                 totalGeralARecolher += partilha.impostoARecolher || 0;
                 let justificativaPartilhaHtml = (resultado.diferencaPartilha.justificativaCalculo || []).join('<br>');
                 if (partilha.percentualAbatimentoForaMG > 0) {
                    justificativaPartilhaHtml += `<br>Abatimento de ${formatBRL(partilha.valorAbatidoForaMG)} aplicado (${partilha.percentualAbatimentoForaMG.toFixed(2)}% de bens fora de MG).`;
                 }

                 html += `
                    <div class="mb-6 pt-4 border-t dark:border-slate-600">
                        <h4 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Cálculo da Diferença de Partilha</h4>
                         <dl class="card-dl-grid text-sm">
                            <div class="info-item"><dt>Base de Cálculo (R$):</dt><dd>${formatBRL(partilha.baseCalculoReais)}</dd></div>
                            <div class="info-item"><dt>Alíquota:</dt><dd>${partilha.aliquota}%</dd></div>
                            <div class="info-item"><dt>ITCD Principal:</dt><dd>${formatBRL(partilha.itcdPrincipal)}</dd></div>
                            <div class="info-item"><dt>Desconto:</dt><dd>${formatBRL(partilha.desconto)}</dd></div>
                            <div class="info-item"><dt>Pagamento Anterior:</dt><dd>${formatBRL(partilha.pagamentoAnterior)}</dd></div>
                            <div class="info-item"><dt>Multa:</dt><dd>${formatBRL(partilha.multa)}</dd></div>
                            <div class="info-item"><dt>Juros:</dt><dd>${formatBRL(partilha.juros)}</dd></div>
                            <div class="info-item col-span-full font-bold text-base"><dt>Imposto a Recolher (Partilha):</dt><dd>${formatBRL(partilha.impostoARecolher)}</dd></div>
                        </dl>
                        <div class="mt-2 text-xs text-blue-700 dark:text-blue-300 p-2 bg-blue-50 dark:bg-blue-900/50 rounded-md">${justificativaPartilhaHtml}</div>
                    </div>
                 `;
            }
        } 
        // Outros tipos de cálculo, como doações, etc.
        else if(resultado.porDonatario || resultado.porBeneficiario || resultado.porPeriodo) {
            const listaResultados = resultado.porDonatario || resultado.porBeneficiario || [];
            if(calculo.tipoCalculo === 'doacoesSucessivas') {
                // Lógica de renderização específica para Doações Sucessivas
                const periodos = resultado.porPeriodo || [];
                 if (periodos.length > 0) {
                     let consolidado = { totalRecolher: 0, multa: 0, juros: 0, itcdPrincipalTotalUfemg: 0, itcdPagoTotalUfemg: 0, baseCalculoTotalUfemg: 0 };
                     const ufemgVencimentoFinal = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(new Date().getFullYear());

                     for(const res of periodos) {
                        const doacaoRefData = formatDate(res.doacaoReferencia.data);
                        if(res.isento) {
                            html += `<div class="p-2 border rounded-md dark:border-slate-600 mb-2 bg-green-50 dark:bg-green-900/30">
                                <h4 class="font-semibold text-sm mb-1 text-green-800 dark:text-green-300">Apuração (Ref. Doação de ${doacaoRefData}) - ISENTO</h4>
                            </div>`;
                        } else {
                            html += `<div class="p-3 border rounded-md dark:border-slate-600 mb-4">
                                <h4 class="font-semibold mb-2">Apuração (Ref. Doação de ${doacaoRefData})</h4>
                                <div class="text-xs space-y-1">
                                    <div class="flex justify-between font-bold border-t pt-1 mt-1 dark:border-slate-500"><span class="dark:text-gray-200">Total a Recolher:</span> <span class="text-red-600 dark:text-red-400">${formatBRL(res.reais.totalARecolher)}</span></div>
                                </div>
                            </div>`;
                        }
                     }
                    totalGeralARecolher = periodos.reduce((acc, res) => acc + (res.reais?.totalARecolher || 0), 0);
                 }
            } else { // Doação, Usufruto, etc.
                listaResultados.forEach(res => {
                    const { valores, nome } = res;
                    html += `<div class="mb-4">
                                <h4 class="font-semibold text-gray-800 dark:text-gray-100 mb-1">${nome}</h4>
                                <dl class="card-dl-grid text-sm">
                                    <div class="info-item"><dt>Base de Cálculo (R$):</dt><dd>${formatBRL(valores.baseCalculoReais)}</dd></div>
                                    <div class="info-item"><dt>Imposto a Recolher:</dt><dd>${formatBRL(valores.impostoARecolher)}</dd></div>
                                </dl>
                             </div>`;
                });
                totalGeralARecolher = resultado.total?.impostoARecolher || 0;
            }
        }
        
        html += `
             <div class="mt-6 pt-4 border-t-2 border-gray-400 dark:border-gray-500 text-right">
                <span class="text-lg font-bold text-gray-800 dark:text-gray-100 mr-4">TOTAL GERAL A RECOLHER:</span>
                <span class="text-xl font-bold text-red-600 dark:text-red-400">${formatBRL(totalGeralARecolher < 0 ? 0 : totalGeralARecolher)}</span>
             </div>
        `;

        container.innerHTML = html;
    }

    function addEventListenersToView(calculo) {
        document.getElementById('btn-voltar-calculo-lista')?.addEventListener('click', () => {
            appModuleRef.handleMenuAction('itcd-gerir-calculos');
        });
        
        document.getElementById('btn-editar-calculo-view')?.addEventListener('click', () => {
             const acoesEdicao = {
                'causaMortis': 'itcd-calculo-causa-mortis',
                'doacao': 'itcd-calculo-doacao',
                'doacoesSucessivas': 'itcd-calculo-doacoes-sucessivas',
                'excedenteMeacao': 'itcd-calculo-excedente-meacao',
                'usufruto_instituicao': 'itcd-calculo-instituicao-usufruto',
                'usufruto_extincao': 'itcd-calculo-extincao-usufruto'
             };
             const acao = acoesEdicao[calculo.tipoCalculo];

             if(acao) {
                // Passa o dado e a flag para iniciar em modo de visualização (edição desabilitada)
                appModuleRef.handleMenuAction('itcd-editar-calculo', { calculoData: calculo, startInEditMode: false });
             } else {
                 uiModuleRef.showToastNotification(`Edição para '${calculo.tipoCalculo}' ainda não implementada.`, 'warning');
             }
        });
        
        document.getElementById('btn-imprimir-calculo-view')?.addEventListener('click', async () => {
             uiModuleRef.showLoading(true, "Gerando declaração para impressão...");
             try {
                const htmlImpressao = await gerarHtmlImpressaoCalculo(calculo);
                const printWindow = window.open('', '_blank');
                printWindow.document.write(htmlImpressao);
                printWindow.document.close();
                setTimeout(() => {
                    try { printWindow.print(); } 
                    catch (e) {
                         console.error("Erro ao imprimir:", e);
                         uiModuleRef.showToastNotification("Falha ao abrir janela de impressão. Verifique o bloqueador de pop-ups.", "error");
                    }
                }, 500);
             } catch(e) {
                uiModuleRef.showToastNotification(`Erro ao gerar documento para impressão: ${e.message}`, "error");
             } finally {
                uiModuleRef.showLoading(false);
             }
        });
    }

    async function gerarHtmlImpressaoCalculo(calculo) {
        const contentWrapper = document.getElementById('calculo-view-content-wrapper');
        const conteudoParaImpressao = contentWrapper.cloneNode(true);
        
        conteudoParaImpressao.querySelectorAll('.section-not-for-print').forEach(el => el.remove());
        conteudoParaImpressao.querySelectorAll('button').forEach(el => el.remove());

        // Transformar partilhas de inputs para texto estático
        conteudoParaImpressao.querySelectorAll('.bem-doado-card details, .bem-excedente-card details, .bem-card details, #itcd-calculo-causa-mortis-container .card details').forEach(detail => {
            const summary = detail.querySelector('summary');
            if (summary) summary.remove();
            
            const partilhaContainer = detail.querySelector('.p-2.border');
            if (partilhaContainer) {
                let partilhaText = '<div class="partilha-print-container">';
                partilhaContainer.querySelectorAll('.flex.items-center.gap-2').forEach(item => {
                    const label = item.querySelector('label')?.textContent || '';
                    const value = item.querySelector('input')?.value || '0';
                    partilhaText += `<div class="partilha-print-item"><span>${label}</span><span>${value}%</span></div>`;
                });
                partilhaText += '</div>';
                partilhaContainer.innerHTML = partilhaText;
            }
            detail.setAttribute('open', '');
        });

        // Expande todas as seções de detalhes para a impressão
        conteudoParaImpressao.querySelectorAll('details').forEach(d => d.setAttribute('open', ''));

        const html = `
            <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Demonstrativo de Cálculo ITCD - ${calculo.declaracaoNumero || calculo.id}</title>
            <style>
                @media print {
                    @page { size: A4; margin: 1.5cm; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 10pt; line-height: 1.4; color: #333; }
                h1, h2, h3, h4 { color: #000; margin: 1.5em 0 0.5em 0; border-bottom: 1px solid #ccc; padding-bottom: 0.2em; page-break-after: avoid; }
                h1 { font-size: 18pt; text-align: center; border-bottom: 2px solid #000; } 
                h2 { font-size: 16pt; } h3 { font-size: 14pt; } h4 { font-size: 12pt; }
                .card { border: 1px solid #ddd; border-radius: 4px; padding: 10px; margin-bottom: 15px; page-break-inside: avoid; }
                .card-header { font-size: 13pt; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
                dl { margin-left: 1em; }
                dt { font-weight: bold; color: #444; margin-top: 0.8em; }
                dd { margin-left: 1.5em; margin-bottom: 0.5em; padding-left: 5px; }
                .card-dl-grid { display: block; }
                .info-item { display: block; margin-bottom: 5px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9pt; }
                th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }
                th { background-color: #f2f2f2 !important; font-weight: bold; }
                .text-right { text-align: right; }
                .text-xs { font-size: 8pt; }
                .text-gray-500 { color: #666; }
                details { border-top: 1px dotted #ccc; padding-top: 8px; margin-top: 8px; }
                details > summary { display: none; }
                .partilha-print-container { margin-top: 5px; padding-left: 15px; }
                .partilha-print-item { display: flex; justify-content: space-between; font-size: 9pt; }
            </style>
            </head><body>
            <h1>Demonstrativo de Cálculo de ITCD</h1>
            ${conteudoParaImpressao.innerHTML}
            </body></html>
        `;
        return html;
    }


    return {
        init,
        renderVisualizarCalculoPage
    };

})();