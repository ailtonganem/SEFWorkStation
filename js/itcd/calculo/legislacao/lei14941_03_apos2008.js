// js/itcd/calculo/legislacao/lei14941_03_apos2008.js
// Módulo de cálculo para a Lei 14.941/03 (regras a partir de 2008)
// v9.0.1 - CORREÇÃO CRÍTICA: Corrigida a lógica de cálculo para doação/partilha. O 'itcdPrincipal' agora representa o valor bruto (5% da base), e o saldo devedor é calculado subtraindo corretamente o desconto e pagamentos anteriores antes dos acréscimos legais.
// v9.0.0 - CORRIGIDO: O abatimento de pagamentos anteriores da "Diferença de Partilha" agora é considerado corretamente. O valor é corrigido pela UFEMG e deduzido do ITCD devido antes do cálculo de multa e juros.
// v8.9.0 - ALTERADO: Lógica de abatimento de pagamentos anteriores agora converte o valor pago para UFEMG da data do pagamento e o reconverte para Reais na data do vencimento do imposto atual, garantindo a correção monetária. Filtra pagamentos por tipo 'causaMortis'.
// ... (histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ITCD = window.SEFWorkStation.ITCD || {};
window.SEFWorkStation.ITCD.Calculo = window.SEFWorkStation.ITCD.Calculo || {};
window.SEFWorkStation.ITCD.Calculo.Legislacao = window.SEFWorkStation.ITCD.Calculo.Legislacao || {};

window.SEFWorkStation.ITCD.Calculo.Legislacao.Lei14941_03_apos2008 = (function() {

    const ALIQUOTA_PERCENTUAL = 5;
    const DESCONTO_PONTUALIDADE_PERCENTUAL = 15;
    const LIMITE_ISENCAO_DOACAO_UFEMG = 10000;
    const LIMITE_DESCONTO_UFEMG = 90000;
    const DESCONTO_50_PERCENTUAL = 50;

    // CONSTANTES PARA ISENÇÃO PARCIAL DE IMÓVEL RESIDENCIAL
    const ISENCAO_LIMITE_VALOR_IMOVEL_UFEMG = 40000;
    const ISENCAO_LIMITE_MONTE_MOR_UFEMG = 48000;


    function init() {
        console.log("Módulo de Cálculo (Lei 14.941/03 - após 2008) inicializado (v9.0.1).");
    }

    // --- Funções Utilitárias ---
    function formatUFEMG(value) {
        if (isNaN(value) || value === null || value === undefined) return 'N/A';
        return value.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    }
    
    function formatToBRL(value) {
        if (isNaN(value) || value === null || value === undefined) return 'R$ 0,00';
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    // --- Fim das Funções Utilitárias ---

    async function calcular(dadosCalculo) {
        console.log("Executando cálculo com base na Lei 14.941/03 (após 2008).");
        
        let {
            baseCalculoUfemg,
            dataFatoGerador,
            dataPagamento,
            vencimento,
            recolhimentoPrevio,
            justificativas,
            diferencaPartilha,
            tipoDoacao, 
            baseCalculoTotalUfemg, // Usado para doações sucessivas
            impostoPagoAnteriorUfemg, // Usado para doações sucessivas
            pagamentosAnteriores = [],
            calcularDescontoSobreRecolhido = false,
            valorUfemgDoVencimento,
            herdeiros, 
            bens
        } = dadosCalculo;

        const erros = [];
        if (typeof baseCalculoUfemg === 'undefined' || !valorUfemgDoVencimento) {
            erros.push("Dados insuficientes para o cálculo (base de cálculo em UFEMG ou valor da UFEMG do vencimento ausentes).");
            return { legislacaoAplicada: 'Lei 14.941/03 (após 2008)', valores: null, erros, justificativaCalculo: justificativas || [], diferencaPartilha: null };
        }
        
        let justificativasCalculo = [...(justificativas || [])];
        let baseCalculoOriginalUfemg = baseCalculoUfemg;

        // --- LÓGICA DE DOAÇÃO E SIMILARES (INCLUI DIFERENÇA DE PARTILHA E SUCESSIVAS) ---
        if (tipoDoacao) {
            const baseTotalConsideradaUfemg = baseCalculoTotalUfemg || baseCalculoUfemg;
            const baseTotalConsideradaReais = baseTotalConsideradaUfemg * valorUfemgDoVencimento;
            
            if (baseTotalConsideradaUfemg <= LIMITE_ISENCAO_DOACAO_UFEMG) {
                justificativasCalculo.push(`Isenção aplicada: Valor da doação/excedente (${formatUFEMG(baseTotalConsideradaUfemg)} UFEMG) não ultrapassa o limite de ${formatUFEMG(LIMITE_ISENCAO_DOACAO_UFEMG)} UFEMG (Art. 3º, II, "a", da Lei 14.941/03).`);
                return {
                    legislacaoAplicada: 'Lei 14.941/03 (após 2008)',
                    valores: { baseCalculoUfemg: baseTotalConsideradaUfemg, baseCalculoReais: baseTotalConsideradaReais, aliquota: 0, itcdPrincipal: 0, desconto: 0, multa: 0, juros: 0, percentualJuros: 0, recolhimentoPrevio: 0, pagamentoAnterior: 0, impostoARecolher: 0 },
                    erros: [], justificativaCalculo: justificativasCalculo
                };
            }

            const aliquotaAplicada = ALIQUOTA_PERCENTUAL;
            const impostoTotalDevidoUfemg = baseTotalConsideradaUfemg * (aliquotaAplicada / 100);
            
            let descontoTotalUfemg = 0;
            if (baseTotalConsideradaUfemg <= LIMITE_DESCONTO_UFEMG) {
                descontoTotalUfemg = impostoTotalDevidoUfemg * (DESCONTO_50_PERCENTUAL / 100);
                justificativasCalculo.push(`Desconto de 50% aplicado: Valor total (${formatUFEMG(baseTotalConsideradaUfemg)} UFEMG) não ultrapassa ${formatUFEMG(LIMITE_DESCONTO_UFEMG)} UFEMG.`);
            }

            // CORREÇÃO CRÍTICA: Calcular os valores em R$ a partir dos valores brutos em UFEMG
            const itcdPrincipal = impostoTotalDevidoUfemg * valorUfemgDoVencimento;
            const descontoTotalReais = descontoTotalUfemg * valorUfemgDoVencimento;
            const impostoPagoAnteriorReais = (impostoPagoAnteriorUfemg || 0) * valorUfemgDoVencimento;

            let deducaoPagamentoAnteriorPartilha = 0;
            for (const pag of pagamentosAnteriores.filter(p => p.tipo === 'diferencaPartilha')) {
                const ufemgAnoPagamento = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(new Date(pag.data).getFullYear());
                if (ufemgAnoPagamento > 0) {
                    const valorPagamentoEmUfemg = pag.valor / ufemgAnoPagamento;
                    deducaoPagamentoAnteriorPartilha += valorPagamentoEmUfemg * valorUfemgDoVencimento;
                }
            }
            
            const saldoDevedorReais = itcdPrincipal - descontoTotalReais - impostoPagoAnteriorReais - deducaoPagamentoAnteriorPartilha;

            if (saldoDevedorReais <= 0) {
                justificativasCalculo.push(`Não há imposto a recolher nesta operação. O valor devido foi coberto por descontos ou recolhimentos anteriores.`);
                return {
                    legislacaoAplicada: 'Lei 14.941/03 (após 2008)',
                    valores: { baseCalculoUfemg: baseTotalConsideradaUfemg, baseCalculoReais: baseTotalConsideradaReais, aliquota: aliquotaAplicada, itcdPrincipal, desconto: descontoTotalReais, multa: 0, juros: 0, percentualJuros: 0, recolhimentoPrevio: 0, pagamentoAnterior: deducaoPagamentoAnteriorPartilha, impostoARecolher: 0 },
                    erros: [], justificativaCalculo: justificativasCalculo
                };
            }
            
            let multa = 0;
            let juros = 0;
            let percentualJuros = 0;
            let justificativaJuros = '';
            
            const baseParaAcrecimos = saldoDevedorReais;
            
            if (dataPagamento && vencimento && dataPagamento > vencimento) {
                const diasAtraso = (new Date(dataPagamento + "T00:00:00") - new Date(vencimento + "T00:00:00")) / (1000 * 60 * 60 * 24);
                let percentualMulta = 0;
                if (diasAtraso > 0) {
                    if (diasAtraso <= 30) percentualMulta = 0.15 * diasAtraso;
                    else if (diasAtraso <= 60) percentualMulta = 9;
                    else percentualMulta = 12;
                }
                multa = baseParaAcrecimos * (percentualMulta / 100);
                
                const baseJuros = baseParaAcrecimos + multa;
                const resultadoJuros = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorSelicAcumulado(vencimento, dataPagamento);
                juros = baseJuros * resultadoJuros.taxa;
                percentualJuros = resultadoJuros.percentual;
                if (resultadoJuros.justificativa) justificativaJuros = resultadoJuros.justificativa;
            }

            const impostoARecolher = baseParaAcrecimos + multa + juros;

            return {
                legislacaoAplicada: 'Lei 14.941/03 (após 2008)',
                valores: {
                    baseCalculoUfemg: baseTotalConsideradaUfemg,
                    baseCalculoReais: baseTotalConsideradaReais,
                    aliquota: aliquotaAplicada,
                    itcdPrincipal,
                    desconto: descontoTotalReais,
                    multa,
                    juros,
                    percentualJuros,
                    recolhimentoPrevio: 0,
                    pagamentoAnterior: deducaoPagamentoAnteriorPartilha,
                    impostoARecolher: Math.max(0, impostoARecolher)
                },
                diferencaPartilha: diferencaPartilha,
                erros: [],
                justificativaCalculo: justificativasCalculo.concat(justificativaJuros ? [justificativaJuros] : [])
            };
        }
        
        // --- LÓGICA DE CAUSA MORTIS ---
        else {
            if (bens && bens.length > 0) {
                const imoveis = bens.filter(b => b.tipo === 'imovel');
                const bensNaoDeducoes = bens.filter(b => !['divida', 'despesa_funeraria'].includes(b.tipo));
                
                if (bensNaoDeducoes.filter(b => b.tipo === 'imovel').length === 1 && imoveis[0].imovelTipo === 'residencial') {
                    const unicoImovel = imoveis[0];
                    const valorUfemgAnoImovel = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(unicoImovel.anoReferenciaUfemg);
                    
                    if (valorUfemgAnoImovel > 0) {
                        const valorTotalImovelUfemg = unicoImovel.valorAvaliacao / valorUfemgAnoImovel;

                        let monteMorTotalUfemg = 0;
                        for (const bem of bensNaoDeducoes) {
                            const valorUfemgBem = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(bem.anoReferenciaUfemg);
                            if (valorUfemgBem > 0) {
                                monteMorTotalUfemg += bem.valorAvaliacao / valorUfemgBem;
                            }
                        }
                        
                        if (valorTotalImovelUfemg <= ISENCAO_LIMITE_VALOR_IMOVEL_UFEMG && monteMorTotalUfemg <= ISENCAO_LIMITE_MONTE_MOR_UFEMG) {
                            const valorIsencaoUfemg = valorTotalImovelUfemg * (unicoImovel.percentualTransmissao / 100);
                            justificativasCalculo.push(`Isenção parcial aplicada: O valor do imóvel residencial (${formatUFEMG(valorIsencaoUfemg)} UFEMG) foi excluído da base de cálculo (Art. 3º, I, da Lei 14.941/03, c/ redação da Lei 17.272/07). O imposto incidirá sobre os demais bens. (Tetos: ${formatUFEMG(ISENCAO_LIMITE_VALOR_IMOVEL_UFEMG)} para o imóvel e ${formatUFEMG(ISENCAO_LIMITE_MONTE_MOR_UFEMG)} para o monte-mor).`);
                            baseCalculoUfemg -= valorIsencaoUfemg;
                        }
                    }
                }
            }
        }

        const baseCalculoReais = baseCalculoUfemg * valorUfemgDoVencimento;
        const aliquotaAplicada = baseCalculoReais > 0 ? ALIQUOTA_PERCENTUAL : 0;
        let totalItcdPrincipal = baseCalculoReais * (aliquotaAplicada / 100);
        let desconto = 0;

        // Desconto de Pontualidade para Causa Mortis
        const dataObito = new Date(dataFatoGerador + "T00:00:00");
        const dataParaDesconto = recolhimentoPrevio?.data || dataPagamento;

        if (totalItcdPrincipal > 0 && dataParaDesconto) {
            const dataRecolhimento = new Date(dataParaDesconto + "T00:00:00");
            const diffTimeRecolhimento = dataRecolhimento - dataObito;
            const diffDaysRecolhimento = Math.ceil(diffTimeRecolhimento / (1000 * 60 * 60 * 24));
            
            if (diffDaysRecolhimento <= 90) {
                if (calcularDescontoSobreRecolhido && recolhimentoPrevio?.valor > 0) {
                    const impostoTotalTeorico = recolhimentoPrevio.valor / (1 - (DESCONTO_PONTUALIDADE_PERCENTUAL / 100));
                    desconto = impostoTotalTeorico - recolhimentoPrevio.valor;
                    justificativasCalculo.push(`Desconto de 15% calculado sobre o valor recolhido (recolhido=${formatToBRL(recolhimentoPrevio.valor)}, desconto=${formatToBRL(desconto)}).`);
                } else {
                    desconto = totalItcdPrincipal * (DESCONTO_PONTUALIDADE_PERCENTUAL / 100);
                    justificativasCalculo.push(`Desconto de pontualidade de 15% aplicado (pagamento em ${diffDaysRecolhimento} dias).`);
                }
            }
        }

        let multa = 0;
        let juros = 0;
        let percentualJuros = 0;
        let justificativaJuros = '';
        const temDescontoPontualidadeStandard = desconto > 0 && !calcularDescontoSobreRecolhido;
        
        let deducaoPagamentoAnterior = 0;
        for (const pag of pagamentosAnteriores.filter(p => p.tipo === 'causaMortis')) {
            const ufemgAnoPagamento = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(new Date(pag.data).getFullYear());
            if (ufemgAnoPagamento > 0) {
                const valorPagamentoEmUfemg = pag.valor / ufemgAnoPagamento;
                deducaoPagamentoAnterior += valorPagamentoEmUfemg * valorUfemgDoVencimento;
            }
        }

        if (dataPagamento && vencimento && dataPagamento > vencimento && !temDescontoPontualidadeStandard) {
            const valorDevidoAposDesconto = totalItcdPrincipal - desconto;
            const saldoDevedor = Math.max(0, valorDevidoAposDesconto - deducaoPagamentoAnterior - (recolhimentoPrevio?.valor || 0));
            const baseParaAcrecimos = saldoDevedor;

            if (baseParaAcrecimos > 0) {
                const diasAtraso = (new Date(dataPagamento + "T00:00:00") - new Date(vencimento + "T00:00:00")) / (1000 * 60 * 60 * 24);
                
                let percentualMulta = 0;
                if (diasAtraso > 0) {
                    if (diasAtraso <= 30) percentualMulta = 0.15 * diasAtraso;
                    else if (diasAtraso <= 60) percentualMulta = 9;
                    else percentualMulta = 12;
                }
                multa = baseParaAcrecimos * (percentualMulta / 100);
                
                const baseJuros = baseParaAcrecimos + multa;
                const resultadoJuros = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorSelicAcumulado(vencimento, dataPagamento);
                juros = baseJuros * resultadoJuros.taxa;
                percentualJuros = resultadoJuros.percentual;
                if (resultadoJuros.justificativa) justificativaJuros = resultadoJuros.justificativa;
            }
        }

        const valorRecolhido = recolhimentoPrevio?.valor || 0;
        const impostoARecolher = (totalItcdPrincipal - desconto - deducaoPagamentoAnterior - valorRecolhido) + multa + juros;

        return {
            legislacaoAplicada: 'Lei 14.941/03 (após 2008)',
            valores: {
                baseCalculoUfemg: baseCalculoOriginalUfemg,
                baseCalculoReais: baseCalculoOriginalUfemg * valorUfemgDoVencimento,
                aliquota: aliquotaAplicada,
                itcdPrincipal: totalItcdPrincipal,
                desconto: desconto,
                multa: multa,
                juros: juros,
                percentualJuros: percentualJuros,
                recolhimentoPrevio: valorRecolhido,
                pagamentoAnterior: deducaoPagamentoAnterior,
                impostoARecolher: Math.max(0, impostoARecolher)
            },
            diferencaPartilha: diferencaPartilha,
            erros: [],
            justificativaCalculo: justificativasCalculo.concat(justificativaJuros ? [justificativaJuros] : [])
        };
    }

    return {
        init,
        calcular,
        name: 'Lei 14.941/03 (após 2008)'
    };

})();