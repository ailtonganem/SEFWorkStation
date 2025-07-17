// js/itcd/calculo/legislacao/lei14941_03_ate2007.js
// Módulo de cálculo para a Lei 14.941/03 (regras até 2007)
// v5.5.0 - ALTERADO: Lógica de abatimento de pagamentos anteriores agora converte o valor pago para UFEMG da data do pagamento e o reconverte para Reais na data do vencimento do imposto atual, garantindo a correção monetária. Filtra pagamentos por tipo 'causaMortis'.
// v5.4.0 - CORRIGIDO: A verificação de isenção de imóvel único (residencial ou não) agora usa o valor total (100%) do imóvel para a verificação, conforme especificação. ALTERADO: Função de cálculo agora processa um array de pagamentos anteriores, abatendo a soma do tipo 'causaMortis'.
// v5.3.0 - CORRIGIDO: Cálculo para doação/usufruto (inter vivos) agora usa a base de cálculo individual diretamente, sem dividi-la pelo número de beneficiários, corrigindo a aplicação indevida de isenção.
// v5.2.0 - MELHORIA: As mensagens de isenção agora incluem a fundamentação legal explícita (Lei e artigo), conforme solicitado.
// v5.1.0 - CORREÇÃO CRÍTICA: A lógica de isenção de imóvel foi dividida para tratar corretamente as duas hipóteses da lei. A isenção de imóvel residencial agora depende de uma flag de confirmação específica (`isencaoImovelAte2007Confirmada`).
// v5.0.0 - REATORADO: Adicionada lógica de isenção de imóvel único (residencial ou não), que antes estava incorretamente no módulo causaMortis.js.
// v4.3.3 - CORRIGIDO: Alíquota exibida agora mostra o valor percentual efetivamente aplicado em vez da string estática 'Progressiva'.
// v4.3.2 - CORREÇÃO CRÍTICA: Lógica de cálculo refeita para operar com a base de cálculo e a lista de herdeiros recebidas, sem depender da estrutura 'diferencaPartilha', resolvendo a falha de cálculo para doação/usufruto.
// ... (histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ITCD = window.SEFWorkStation.ITCD || {};
window.SEFWorkStation.ITCD.Calculo = window.SEFWorkStation.ITCD.Calculo || {};
window.SEFWorkStation.ITCD.Calculo.Legislacao = window.SEFWorkStation.ITCD.Calculo.Legislacao || {};

window.SEFWorkStation.ITCD.Calculo.Legislacao.Lei14941_03_ate2007 = (function() {

    const LIMITE_ISENCAO_INDIVIDUAL_UFEMG = 10000;
    const ISENCAO_LIMITE_IMOVEL_RESIDENCIAL_UFEMG = 45000;
    const ISENCAO_LIMITE_UNICO_BEM_IMOVEL_UFEMG = 20000;


    function init() {
        console.log("Módulo de Cálculo (Lei 14.941/03 - até 2007) inicializado (v5.5.0).");
    }

    // --- Funções Utilitárias ---
    function formatUFEMG(value) {
        if (isNaN(value) || value === null || value === undefined) return 'N/A';
        return value.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    }

    /**
     * Realiza o cálculo do ITCD com base nas regras da Lei 14.941/03 (regras de 2004 a 2007).
     * @param {object} dadosCalculo - Objeto contendo os dados do cálculo.
     * @returns {object} Um objeto com os resultados do cálculo.
     */
    async function calcular(dadosCalculo) {
        console.log("Executando cálculo com base na Lei 14.941/03 (até 2007).");

        const {
            baseCalculoUfemg, // Base de cálculo total (Causa Mortis) ou individual (Inter Vivos) em UFEMG
            tipoDoacao, // Flag que indica se é doação/usufruto
            herdeiros,
            bens,
            vencimento,
            dataPagamento,
            justificativas,
            diferencaPartilha,
            recolhimentoPrevio,
            valorUfemgDoVencimento,
            isencaoImovelAte2007Confirmada,
            pagamentosAnteriores = []
        } = dadosCalculo;

        const erros = [];
        if (!valorUfemgDoVencimento) {
             erros.push("Valor da UFEMG do vencimento é necessário para o cálculo.");
        }
        if (erros.length > 0) {
            return { legislacaoAplicada: 'Lei 14.941/03 (até 2007)', valores: null, erros };
        }
        
        let justificativasCalculo = [...(justificativas || [])];
        let totalItcdPrincipal = 0;
        let aliquotaDisplay = 0;
        const baseCalculoReais = baseCalculoUfemg * valorUfemgDoVencimento;

        // --- LÓGICA DE ISENÇÃO (Aplica-se antes do cálculo do imposto) ---

        // Isenção de imóvel único (só para Causa Mortis)
        if (!tipoDoacao && bens && bens.length > 0) {
            const imoveis = bens.filter(b => b.tipo === 'imovel');
            if (imoveis.length === 1) {
                const unicoImovel = imoveis[0];
                const valorUfemgAnoImovel = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(unicoImovel.anoReferenciaUfemg);
                if (valorUfemgAnoImovel > 0) {
                    const valorTotalImovelUfemg = unicoImovel.valorAvaliacao / valorUfemgAnoImovel;

                    if (unicoImovel.imovelTipo === 'residencial' && valorTotalImovelUfemg <= ISENCAO_LIMITE_IMOVEL_RESIDENCIAL_UFEMG && isencaoImovelAte2007Confirmada) {
                        justificativasCalculo.push(`Isenção aplicada: Transmissão de único bem imóvel residencial de até ${formatUFEMG(ISENCAO_LIMITE_IMOVEL_RESIDENCIAL_UFEMG)} UFEMG, com beneficiários sem outros imóveis (Art. 3º, I, "a" ou "b" da Lei 14.941/03).`);
                        return { legislacaoAplicada: 'Lei 14.941/03 (até 2007)', valores: { baseCalculoUfemg, baseCalculoReais, aliquota: 0, itcdPrincipal: 0, desconto: 0, multa: 0, juros: 0, percentualJuros: 0, recolhimentoPrevio: 0, pagamentoAnterior: 0, impostoARecolher: 0 }, diferencaPartilha, erros, justificativaCalculo };
                    } else if (valorTotalImovelUfemg <= ISENCAO_LIMITE_UNICO_BEM_IMOVEL_UFEMG) {
                         justificativasCalculo.push(`Isenção aplicada: Transmissão de único bem imóvel de até ${formatUFEMG(ISENCAO_LIMITE_UNICO_BEM_IMOVEL_UFEMG)} UFEMG (Art. 3º, I, "c" da Lei 14.941/03).`);
                         return { legislacaoAplicada: 'Lei 14.941/03 (até 2007)', valores: { baseCalculoUfemg, baseCalculoReais, aliquota: 0, itcdPrincipal: 0, desconto: 0, multa: 0, juros: 0, percentualJuros: 0, recolhimentoPrevio: 0, pagamentoAnterior: 0, impostoARecolher: 0 }, diferencaPartilha, erros, justificativaCalculo };
                    }
                }
            }
        }
        
        // --- CÁLCULO DO IMPOSTO (Lógica dividida) ---
        
        if (tipoDoacao) {
            const baseIndividualUfemg = baseCalculoUfemg;

            if (baseIndividualUfemg <= LIMITE_ISENCAO_INDIVIDUAL_UFEMG) {
                justificativasCalculo.push(`Isenção aplicada: quinhão de ${formatUFEMG(baseIndividualUfemg)} UFEMG é inferior a ${formatUFEMG(LIMITE_ISENCAO_INDIVIDUAL_UFEMG)} (Art. 3º, II, "a", da Lei 14.941/03).`);
                aliquotaDisplay = 0;
                totalItcdPrincipal = 0;
            } else {
                if (baseIndividualUfemg <= 90000) aliquotaDisplay = 3;
                else if (baseIndividualUfemg <= 450000) aliquotaDisplay = 4;
                else if (baseIndividualUfemg <= 900000) aliquotaDisplay = 5;
                else aliquotaDisplay = 6;
                
                totalItcdPrincipal = baseCalculoReais * (aliquotaDisplay / 100);
            }
        } else {
            if (!herdeiros || herdeiros.length === 0) {
                 erros.push("A lista de herdeiros/beneficiários é necessária para o cálculo de causa mortis.");
                 return { legislacaoAplicada: 'Lei 14.941/03 (até 2007)', valores: null, erros };
            }

            const numBeneficiarios = herdeiros.length;
            const quinhaoMedioUfemg = numBeneficiarios > 0 ? baseCalculoUfemg / numBeneficiarios : 0;
            const quinhaoMedioReais = quinhaoMedioUfemg * valorUfemgDoVencimento;

            for (const herdeiro of herdeiros) {
                if (quinhaoMedioUfemg <= LIMITE_ISENCAO_INDIVIDUAL_UFEMG) {
                    justificativasCalculo.push(`Isenção aplicada para ${herdeiro.nome || 'beneficiário'}: quinhão de ${formatUFEMG(quinhaoMedioUfemg)} UFEMG é inferior a ${formatUFEMG(LIMITE_ISENCAO_INDIVIDUAL_UFEMG)} (Art. 3º, II, "a", da Lei 14.941/03).`);
                    continue;
                }

                let aliquotaAplicadaIndividual = 0;
                if (quinhaoMedioUfemg <= 90000) aliquotaAplicadaIndividual = 3;
                else if (quinhaoMedioUfemg <= 450000) aliquotaAplicadaIndividual = 4;
                else if (quinhaoMedioUfemg <= 900000) aliquotaAplicadaIndividual = 5;
                else aliquotaAplicadaIndividual = 6;
                
                aliquotaDisplay = aliquotaAplicadaIndividual;
                totalItcdPrincipal += quinhaoMedioReais * (aliquotaAplicadaIndividual / 100);
            }
        }

        // --- CÁLCULO DE ACRÉSCIMOS LEGAIS (Comum a ambos) ---
        const desconto = 0;
        let multa = 0;
        let juros = 0;
        let percentualJuros = 0;
        let justificativaJuros = '';

        if (dataPagamento && vencimento && dataPagamento > vencimento) {
            const diasAtraso = (new Date(dataPagamento + "T00:00:00") - new Date(vencimento + "T00:00:00")) / (1000 * 60 * 60 * 24);
            let percentualMulta = 0;

            if (diasAtraso > 0) {
                if (diasAtraso <= 30) percentualMulta = 0.15 * diasAtraso;
                else if (diasAtraso <= 60) percentualMulta = 9;
                else percentualMulta = 12;
            }
            multa = totalItcdPrincipal * (percentualMulta / 100);

            const baseJuros = totalItcdPrincipal + multa;
            if (baseJuros > 0) {
                const resultadoJuros = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorSelicAcumulado(vencimento, dataPagamento);
                juros = baseJuros * resultadoJuros.taxa;
                percentualJuros = resultadoJuros.percentual;
                justificativaJuros = resultadoJuros.justificativa;
            }
        }
        
        let deducaoPagamentoAnterior = 0;
        for (const pag of pagamentosAnteriores.filter(p => p.tipo === 'causaMortis')) {
            const ufemgAnoPagamento = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(new Date(pag.data).getFullYear());
            if (ufemgAnoPagamento > 0) {
                const valorPagamentoEmUfemg = pag.valor / ufemgAnoPagamento;
                deducaoPagamentoAnterior += valorPagamentoEmUfemg * valorUfemgDoVencimento;
            }
        }
            
        const valorRecolhido = recolhimentoPrevio?.valor || 0;
        const impostoARecolher = totalItcdPrincipal + multa + juros - valorRecolhido - deducaoPagamentoAnterior;

        return {
            legislacaoAplicada: 'Lei 14.941/03 (até 2007)',
            valores: {
                baseCalculoUfemg: baseCalculoUfemg,
                baseCalculoReais: baseCalculoReais,
                aliquota: aliquotaDisplay,
                itcdPrincipal: totalItcdPrincipal,
                desconto,
                multa,
                juros,
                percentualJuros,
                recolhimentoPrevio: valorRecolhido,
                pagamentoAnterior: deducaoPagamentoAnterior,
                impostoARecolher: Math.max(0, impostoARecolher)
            },
            diferencaPartilha: diferencaPartilha,
            erros: erros,
            justificativaCalculo: justificativasCalculo.concat(justificativaJuros ? [justificativaJuros] : [])
        };
    }

    return {
        init,
        calcular,
        name: 'Lei 14.941/03 (até 2007)'
    };

})();