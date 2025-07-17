// js/itcd/calculo/legislacao/lei6763_75.js
// Módulo de cálculo para a Lei 6.763/75
// v5.3.1 - MELHORIA: As mensagens de isenção agora incluem a fundamentação legal explícita (Lei e artigo), conforme solicitado.
// v5.3.0 - ALTERADO: Multa por atraso ajustada para 12% e adicionada a cobrança de juros SELIC.
// v5.2.0 - ALTERADO: Recebe dados de inventário/trânsito em julgado para garantir consistência com o cálculo de vencimento e UFEMG.
// v5.1.0 - ADICIONADO: Propriedade 'name' para identificação explícita do módulo.
// v5.0.0 - REFATORADO: Módulo agora recebe a base de cálculo pré-calculada, para padronização e correção da exibição no demonstrativo da view.
// ... (histórico anterior)

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ITCD = window.SEFWorkStation.ITCD || {};
window.SEFWorkStation.ITCD.Calculo = window.SEFWorkStation.ITCD.Calculo || {};
window.SEFWorkStation.ITCD.Calculo.Legislacao = window.SEFWorkStation.ITCD.Calculo.Legislacao || {};

window.SEFWorkStation.ITCD.Calculo.Legislacao.Lei6763_75 = (function() {

    const ALIQUOTA_PERCENTUAL = 4;
    const LIMITE_ISENCAO_UPFMG = 80;
    const MULTA_ATRASO_PAGAMENTO_PERCENTUAL = 12; // CORRIGIDO de 50 para 12
    const MULTA_ATRASO_ABERTURA_INVENTARIO_PERCENTUAL = 20;

    /**
     * Inicializa o módulo de cálculo para a Lei 6.763/75.
     */
    function init() {
        console.log("Módulo de Cálculo (Lei 6.763/75) inicializado (v5.3.1).");
    }

    /**
     * Realiza o cálculo do ITCD com base nas regras da Lei 6.763/75.
     * @param {object} dadosCalculo - Objeto contendo os dados do cálculo.
     * @returns {object} Um objeto com os resultados do cálculo.
     */
    async function calcular(dadosCalculo) {
        console.log("Executando cálculo com base na Lei 6.763/75.");

        const {
            baseCalculoReais,
            baseCalculoUfemg,
            vencimento,
            dataPagamento,
            dataFatoGerador,
            justificativas,
            diferencaPartilha,
            recolhimentoPrevio,
            valorUfemgDoVencimento, // Adicionado para consistência
            tipoInventario,
            houveTransitoJulgado,
            dataTransitoJulgado
        } = dadosCalculo;
        
        const erros = [];
        if (typeof baseCalculoReais === 'undefined' || typeof baseCalculoUfemg === 'undefined' || !valorUfemgDoVencimento) {
            erros.push("A base de cálculo ou valor da UFEMG não foi fornecida ao módulo de legislação (Lei 6.763/75).");
            return { legislacaoAplicada: 'Lei 6.763/75', valores: null, erros: erros, justificativaCalculo: justificativas || [], diferencaPartilha: null };
        }

        // 1. Isenção (Art. 63, II)
        if (baseCalculoUfemg <= LIMITE_ISENCAO_UPFMG) {
            return {
                legislacaoAplicada: 'Lei 6.763/75',
                valores: { baseCalculoUfemg, baseCalculoReais, aliquota: 0, itcdPrincipal: 0, desconto: 0, multa: 0, juros: 0, percentualJuros: 0, recolhimentoPrevio: 0, impostoARecolher: 0 },
                diferencaPartilha: null,
                erros: [],
                justificativaCalculo: [`Isenção aplicada: Valor da herança não ultrapassa ${LIMITE_ISENCAO_UPFMG} UPFMG (Art. 63, II, da Lei 6.763/75).`]
            };
        }

        // 2. Alíquota (Art. 64, III)
        const aliquotaAplicada = baseCalculoReais > 0 ? ALIQUOTA_PERCENTUAL : 0;
        const itcdPrincipal = baseCalculoReais * (aliquotaAplicada / 100);
        
        const desconto = 0;
        let multa = 0;
        let juros = 0;
        let percentualJuros = 0;
        let justificativaJuros = '';
        
        // 3. Multas por atraso (Art. 82) e Juros (NOVO)
        const dataReferenciaAtraso = (tipoInventario === 'judicial' && houveTransitoJulgado && dataTransitoJulgado)
                                     ? dataTransitoJulgado
                                     : vencimento;

        if (dataPagamento && dataReferenciaAtraso && dataPagamento > dataReferenciaAtraso) {
            // Multa de revalidação (atraso no pagamento)
            let multaAtrasoPagamento = itcdPrincipal * (MULTA_ATRASO_PAGAMENTO_PERCENTUAL / 100);

            // Multa por abertura tardia de inventário
            const dataObito = new Date(dataFatoGerador + "T00:00:00");
            const dataPagamentoObj = new Date(dataPagamento + "T00:00:00");
            const diffTime = dataPagamentoObj - dataObito;
            const diasCorridos = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            let multaAberturaTardia = 0;
            if(diasCorridos > 180) {
                multaAberturaTardia = itcdPrincipal * (MULTA_ATRASO_ABERTURA_INVENTARIO_PERCENTUAL / 100);
            }
            
            multa = Math.min(itcdPrincipal, multaAtrasoPagamento + multaAberturaTardia);

            // Cálculo de Juros SELIC
            const baseJuros = itcdPrincipal + multa;
            if (baseJuros > 0) {
                 const resultadoJuros = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorSelicAcumulado(dataReferenciaAtraso, dataPagamento);
                 juros = baseJuros * resultadoJuros.taxa;
                 percentualJuros = resultadoJuros.percentual;
                 if(resultadoJuros.justificativa) justificativaJuros = resultadoJuros.justificativa;
            }
        }
        
        const valorRecolhido = recolhimentoPrevio?.valor || 0;
        const impostoARecolher = itcdPrincipal + multa + juros - valorRecolhido;

        return {
            legislacaoAplicada: 'Lei 6.763/75',
            valores: {
                baseCalculoUfemg,
                baseCalculoReais,
                aliquota: aliquotaAplicada,
                itcdPrincipal,
                desconto,
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
        name: 'Lei 6.763/75'
    };

})();