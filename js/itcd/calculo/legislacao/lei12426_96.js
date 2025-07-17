// js/itcd/calculo/legislacao/lei12426_96.js
// Módulo de cálculo para a Lei 12.426/96
// v7.4.0 - CORRIGIDO: Lógica de isenção para atos inter vivos (doação, usufruto) agora usa a base de cálculo individual recebida, sem dividi-la novamente pelo número de beneficiários, corrigindo a aplicação indevida de isenção.
// v7.3.0 - MELHORIA: As mensagens de isenção agora incluem a fundamentação legal explícita (Lei e artigo), conforme solicitado.
// v7.2.0 - CORRIGIDO: Exibição da alíquota agora mostra o valor numérico em vez da string 'Progressiva'.
// v7.1.0 - ALTERADO: Implementada regra de juros e UFEMG para Causa Mortis, conforme especificação (judicial com trânsito em julgado vs. outros casos).
// v7.0.0 - CORRIGIDO: Removida a cobrança de multa por atraso, mantendo apenas os juros, conforme especificação.
// ... (histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ITCD = window.SEFWorkStation.ITCD || {};
window.SEFWorkStation.ITCD.Calculo = window.SEFWorkStation.ITCD.Calculo || {};
window.SEFWorkStation.ITCD.Calculo.Legislacao = window.SEFWorkStation.ITCD.Calculo.Legislacao || {};

window.SEFWorkStation.ITCD.Calculo.Legislacao.Lei12426_96 = (function() {

    // Tabela A (Causa Mortis) com parcela a deduzir, conforme imagem.
    const TABELA_A_CAUSA_MORTIS = [
        { ate: 20000, aliquota: 1.00, parcela: 0 },
        { ate: 40000, aliquota: 1.50, parcela: 100 },
        { ate: 80000, aliquota: 2.00, parcela: 300 },
        { ate: 160000, aliquota: 3.00, parcela: 1100 },
        { ate: 350000, aliquota: 4.00, parcela: 2700 },
        { ate: 650000, aliquota: 5.00, parcela: 12700 },
        { ate: 1000000, aliquota: 6.00, parcela: 22700 },
        { ate: Infinity, aliquota: 7.00, parcela: 32700 } // Parcela corrigida conforme interpretação comum da tabela
    ];

    // Tabela B (Inter Vivos - Doação/Usufruto) com parcela a deduzir, conforme imagem.
    const TABELA_B_INTER_VIVOS = [
        { ate: 10000, aliquota: 1.50, parcela: 0 },
        { ate: 20000, aliquota: 2.00, parcela: 50 },
        { ate: 40000, aliquota: 3.00, parcela: 250 },
        { ate: 100000, aliquota: 4.00, parcela: 650 },
        { ate: Infinity, aliquota: 5.00, parcela: 1650 }
    ];
    
    const LIMITE_ISENCAO_CAUSA_MORTIS_UFEMG = 25000;
    const LIMITE_ISENCAO_DOACAO_UFEMG = 10000;


    function init() {
        console.log("Módulo de Cálculo (Lei 12.426/96) inicializado (v7.4.0).");
    }

    /**
     * Calcula o imposto em UFEMG usando a fórmula (Base * Alíquota) - (Parcela a Deduzir).
     * @param {number} baseCalculoUfemg - A base de cálculo do quinhão/bem em UFEMG.
     * @param {Array} tabela - A tabela de alíquotas a ser usada (Causa Mortis ou Inter Vivos).
     * @returns {object} - Objeto contendo o imposto em UFEMG e a alíquota aplicada.
     */
    function _calcularImpostoComParcela(baseCalculoUfemg, tabela) {
        if (baseCalculoUfemg <= 0) {
            return { impostoUfemg: 0, aliquota: 0 };
        }

        const faixa = tabela.find(f => baseCalculoUfemg <= f.ate);
        if (!faixa) {
            // Fallback para a última faixa, caso algo dê errado
            const ultimaFaixa = tabela[tabela.length - 1];
            const impostoUfemg = (baseCalculoUfemg * (ultimaFaixa.aliquota / 100)) - ultimaFaixa.parcela;
            return { impostoUfemg, aliquota: ultimaFaixa.aliquota };
        }
        
        const impostoUfemg = (baseCalculoUfemg * (faixa.aliquota / 100)) - faixa.parcela;
        return { impostoUfemg, aliquota: faixa.aliquota };
    }

    /**
     * Realiza o cálculo do ITCD com base nas regras da Lei 12.426/96.
     * @param {object} dadosCalculo - Objeto contendo os dados do cálculo.
     * @returns {object} Um objeto com os resultados do cálculo.
     */
    async function calcular(dadosCalculo) {
        console.log("Executando cálculo com base na Lei 12.426/96, com parcela a deduzir.");
        
        const {
            baseCalculoUfemg,
            herdeiros,
            dataFatoGerador,
            dataPagamento,
            vencimento,
            justificativas,
            diferencaPartilha,
            recolhimentoPrevio,
            tipoDoacao,
            valorUfemgDoVencimento,
            tipoInventario,
            houveTransitoJulgado,
            dataTransitoJulgado
        } = dadosCalculo;
        
        const erros = [];
        if (typeof baseCalculoUfemg === 'undefined' || !valorUfemgDoVencimento || !dataPagamento) {
            erros.push("Dados insuficientes para o cálculo (base de cálculo, valor da UFEMG ou data de pagamento ausentes).");
            return { legislacaoAplicada: 'Lei 12.426/96', valores: null, erros, justificativaCalculo: justificativas || [], diferencaPartilha: null };
        }
        
        let totalItcdPrincipal = 0;
        let totalDesconto = 0;
        let aliquotaDisplay = 0;
        let valorUfemgReferencia = valorUfemgDoVencimento;
        let impostoTotalEmUfemg = 0;
        
        const tabelaDeAliquotas = tipoDoacao ? TABELA_B_INTER_VIVOS : TABELA_A_CAUSA_MORTIS;
        
        if (tipoDoacao) {
            // CORRIGIDO: A base de cálculo para atos inter vivos (doação, usufruto) já vem individualizada por beneficiário.
            // Não é necessário dividi-la novamente.
            const baseIndividualBeneficiarioUfemg = baseCalculoUfemg;

            if (baseIndividualBeneficiarioUfemg <= LIMITE_ISENCAO_DOACAO_UFEMG) {
                 return {
                    legislacaoAplicada: 'Lei 12.426/96',
                    valores: { baseCalculoUfemg, baseCalculoReais: baseCalculoUfemg * valorUfemgReferencia, aliquota: 0, itcdPrincipal: 0, desconto: 0, multa: 0, juros: 0, percentualJuros: 0, recolhimentoPrevio: 0, impostoARecolher: 0 },
                    diferencaPartilha: null, erros: [],
                    justificativaCalculo: [`Isenção aplicada: Quinhão individual não ultrapassa ${LIMITE_ISENCAO_DOACAO_UFEMG} UFEMG (Art. 3º, IV, da Lei 12.426/96).`]
                };
            }
            const { impostoUfemg, aliquota } = _calcularImpostoComParcela(baseIndividualBeneficiarioUfemg, tabelaDeAliquotas);
            // CORRIGIDO: O imposto é sobre a base individual, não precisa multiplicar pelo número de beneficiários, pois a função é chamada em loop.
            impostoTotalEmUfemg = impostoUfemg;
            aliquotaDisplay = aliquota;

        } else { // Causa Mortis
            if (baseCalculoUfemg <= LIMITE_ISENCAO_CAUSA_MORTIS_UFEMG) {
                return {
                    legislacaoAplicada: 'Lei 12.426/96',
                    valores: { baseCalculoUfemg, baseCalculoReais: baseCalculoUfemg * valorUfemgReferencia, aliquota: 0, itcdPrincipal: 0, desconto: 0, multa: 0, juros: 0, percentualJuros: 0, recolhimentoPrevio: 0, impostoARecolher: 0 },
                    diferencaPartilha: null, erros: [],
                    justificativaCalculo: [`Isenção aplicada: Valor total do monte-mor não ultrapassa 25.000 UFEMG (Art. 3º, V, da Lei 12.426/96).`]
                };
            }

            const quinhoes = window.SEFWorkStation.ITCD.Calculo.Sucessao.definirNumeroDeQuinhoes(herdeiros);
            const valorQuinhaoMedioUfemg = quinhoes > 0 ? baseCalculoUfemg / quinhoes : 0;
            const { impostoUfemg, aliquota } = _calcularImpostoComParcela(valorQuinhaoMedioUfemg, tabelaDeAliquotas);
            aliquotaDisplay = aliquota;
            impostoTotalEmUfemg = impostoUfemg * quinhoes;

            if (tipoInventario === 'judicial' && houveTransitoJulgado && dataTransitoJulgado) {
                const anoTransito = new Date(dataTransitoJulgado + "T00:00:00").getFullYear();
                valorUfemgReferencia = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(anoTransito);
            } else {
                const anoPagamento = new Date(dataPagamento + "T00:00:00").getFullYear();
                valorUfemgReferencia = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(anoPagamento);
            }
        }
        
        totalItcdPrincipal = impostoTotalEmUfemg * valorUfemgReferencia;

        if (!tipoDoacao && dataPagamento && dataFatoGerador) {
            const dataObito = new Date(dataFatoGerador + "T00:00:00");
            const dataPagamentoObj = new Date(dataPagamento + "T00:00:00");
            const diffTime = dataPagamentoObj - dataObito;
            const diasCorridos = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            let coeficienteReducao = 1.0;
            if (diasCorridos <= 90) coeficienteReducao = 0.75;
            else if (diasCorridos <= 120) coeficienteReducao = 0.80;
            else if (diasCorridos <= 150) coeficienteReducao = 0.85;
            else if (diasCorridos <= 180) coeficienteReducao = 0.90;
            
            if (coeficienteReducao < 1.0) {
                const impostoReduzido = totalItcdPrincipal * coeficienteReducao;
                totalDesconto = totalItcdPrincipal - impostoReduzido;
            }
        }
        
        let multa = 0;
        let juros = 0;
        let percentualJuros = 0;
        let justificativaJuros = '';
        const valorDevidoAposDesconto = totalItcdPrincipal - totalDesconto;

        const dataReferenciaAtraso = (!tipoDoacao && tipoInventario === 'judicial' && houveTransitoJulgado && dataTransitoJulgado)
                                     ? dataTransitoJulgado
                                     : vencimento;

        if (dataPagamento && dataReferenciaAtraso && dataPagamento > dataReferenciaAtraso) {
            if (valorDevidoAposDesconto > 0) {
                const resultadoJuros = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorSelicAcumulado(dataReferenciaAtraso, dataPagamento);
                juros = valorDevidoAposDesconto * resultadoJuros.taxa;
                percentualJuros = resultadoJuros.percentual;
                justificativaJuros = resultadoJuros.justificativa;
            }
        }
        
        const valorRecolhido = recolhimentoPrevio?.valor || 0;
        const impostoARecolher = valorDevidoAposDesconto + multa + juros - valorRecolhido;
        const baseCalculoReaisFinal = baseCalculoUfemg * valorUfemgReferencia;
        
        return {
            legislacaoAplicada: 'Lei 12.426/96',
            valores: {
                baseCalculoUfemg,
                baseCalculoReais: baseCalculoReaisFinal,
                aliquota: aliquotaDisplay,
                itcdPrincipal: totalItcdPrincipal,
                desconto: totalDesconto,
                multa,
                juros,
                percentualJuros,
                recolhimentoPrevio: valorRecolhido,
                impostoARecolher: Math.max(0, impostoARecolher)
            },
            diferencaPartilha: diferencaPartilha,
            erros: erros,
            justificativaCalculo: (justificativas || []).concat(justificativaJuros ? [justificativaJuros] : [])
        };
    }

    return {
        init,
        calcular,
        name: 'Lei 12.426/96'
    };

})();