// js/itcd/calculo/legislacao/lei9752_89.js
// Módulo de cálculo para a Lei 9.752/89
// v4.5.2 - MELHORIA: As mensagens de isenção agora incluem a fundamentação legal explícita (Lei e artigo), conforme solicitado.
// v4.5.1 - REVISADO: Lógica de acréscimos legais confirmada para consistência com outras legislações.
// v4.5.0 - ALTERADO: Multa ajustada para 12% e adicionada a cobrança de juros SELIC.
// v4.4.0 - ALTERADO: Recebe dados de inventário/trânsito em julgado para garantir consistência com o cálculo de vencimento e UFEMG.
// v4.3.0 - CORREÇÃO CRÍTICA: Base de cálculo em Reais agora é recalculada internamente usando a UFEMG do vencimento, garantindo precisão no cálculo do imposto final.
// ... (histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ITCD = window.SEFWorkStation.ITCD || {};
window.SEFWorkStation.ITCD.Calculo = window.SEFWorkStation.ITCD.Calculo || {};
window.SEFWorkStation.ITCD.Calculo.Legislacao = window.SEFWorkStation.ITCD.Calculo.Legislacao || {};

window.SEFWorkStation.ITCD.Calculo.Legislacao.Lei9752_89 = (function() {

    const LIMITE_ISENCAO_UPFMG = 500;
    const LIMITE_FAIXA_1_UPFMG_CAUSA_MORTIS = 1000;
    const LIMITE_ALIQUOTA_2_PORCENTO_USUFRUTO = 48980;
    const ALIQUOTA_FAIXA_1 = 2;
    const ALIQUOTA_FAIXA_2 = 4;
    const MULTA_ATRASO_PERCENTUAL = 12; // CORRIGIDO de 50 para 12

    /**
     * Inicializa o módulo de cálculo para a Lei 9.752/89.
     */
    function init() {
        console.log("Módulo de Cálculo (Lei 9.752/89) inicializado (v4.5.2).");
    }

    /**
     * Realiza o cálculo do ITCD com base nas regras da Lei 9.752/89.
     * @param {object} dadosCalculo - Objeto contendo os dados do cálculo.
     * @returns {object} Um objeto com os resultados do cálculo.
     */
    async function calcular(dadosCalculo) {
        console.log("Executando cálculo com base na Lei 9.752/89.");

        const {
            baseCalculoUfemg,
            vencimento,
            dataPagamento,
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
        if (typeof baseCalculoUfemg === 'undefined' || !valorUfemgDoVencimento) {
            erros.push("Dados insuficientes para o cálculo: base de cálculo em UFEMG ou valor da UFEMG do vencimento ausentes.");
            return { legislacaoAplicada: 'Lei 9.752/89', valores: null, erros: erros, justificativaCalculo: justificativas || [], diferencaPartilha: null };
        }
        
        const baseCalculoReais = baseCalculoUfemg * valorUfemgDoVencimento;

        if (!tipoDoacao && baseCalculoUfemg <= LIMITE_ISENCAO_UPFMG) {
            return {
                legislacaoAplicada: 'Lei 9.752/89',
                valores: { baseCalculoUfemg, baseCalculoReais, aliquota: 0, itcdPrincipal: 0, desconto: 0, multa: 0, juros: 0, percentualJuros: 0, recolhimentoPrevio: 0, impostoARecolher: 0 },
                diferencaPartilha: null,
                erros: [],
                justificativaCalculo: [`Isenção aplicada: Valor total do monte-mor não ultrapassa ${LIMITE_ISENCAO_UPFMG} UPFMG (Art. 4º, I, da Lei 9.752/89).`]
            };
        }

        let aliquotaAplicada = 0;
        if (baseCalculoReais > 0) {
            if (tipoDoacao) { 
                if (baseCalculoUfemg <= LIMITE_ALIQUOTA_2_PORCENTO_USUFRUTO) {
                    aliquotaAplicada = 2;
                } else {
                    aliquotaAplicada = 4;
                }
            } else { 
                if (baseCalculoUfemg <= LIMITE_FAIXA_1_UPFMG_CAUSA_MORTIS) {
                    aliquotaAplicada = ALIQUOTA_FAIXA_1;
                } else {
                    aliquotaAplicada = ALIQUOTA_FAIXA_2;
                }
            }
        }

        const itcdPrincipal = baseCalculoReais * (aliquotaAplicada / 100);
        
        const desconto = 0;
        let multa = 0;
        let juros = 0;
        let percentualJuros = 0;
        let justificativaJuros = '';

        // ALTERADO: Lógica de acréscimos (multa e juros)
        const dataReferenciaAtraso = (!tipoDoacao && tipoInventario === 'judicial' && houveTransitoJulgado && dataTransitoJulgado)
                                     ? dataTransitoJulgado
                                     : vencimento;

        if (dataPagamento && dataReferenciaAtraso && dataPagamento > dataReferenciaAtraso) {
            multa = itcdPrincipal * (MULTA_ATRASO_PERCENTUAL / 100);
            
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
            legislacaoAplicada: 'Lei 9.752/89',
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
        name: 'Lei 9.752/89'
    };

})();