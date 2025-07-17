// js/itcd/calculo/diferencaPartilha.js - Módulo para Cálculo do ITCD sobre Diferença de Partilha
// v9.5.0 - CORREÇÃO CRÍTICA: Corrigido ReferenceError para a variável `partilhaLegalRemanescente` movendo sua declaração para um escopo superior.
// v9.4.0 - CORREÇÃO CRÍTICA: Ajustada a lógica de apuração do excedente do cônjuge. O quinhão devido é a soma da meação + herança nos particulares, e o excedente é a diferença entre o total recebido e esse direito consolidado. Identificação do cônjuge robustecida para usar o tipo.
// v9.3.0 - CORREÇÃO CRÍTICA: O quinhão devido original do cônjuge agora é a soma de sua meação e de sua herança por concorrência nos bens particulares, garantindo que o excedente seja calculado corretamente apenas sobre o valor recebido a mais.
// v9.2.0 - ALTERADO: O quinhão devido original do cônjuge agora é a soma de sua meação e de sua herança por concorrência.
// v9.1.0 - CORRIGIDO: A função `calcular` agora recebe e repassa o parâmetro `conjugeAscendenteFilhos`.
// ... (histórico anterior)

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ITCD = window.SEFWorkStation.ITCD || {};
window.SEFWorkStation.ITCD.Calculo = window.SEFWorkStation.ITCD.Calculo || {};

window.SEFWorkStation.ITCD.Calculo.DiferencaPartilha = (function() {

    let dbRef;
    
    const Sucessao = window.SEFWorkStation.ITCD.Calculo.Sucessao;

    function init(db) {
        dbRef = db;
        if (Sucessao && typeof Sucessao.init === 'function') {
            Sucessao.init(db);
        }
        console.log("Módulo de Cálculo (Diferença de Partilha) inicializado (v9.5.0).");
    }
    
    // Função interna para converter bens para UFEMG e calcular totais em UFEMG
    async function _calcularTotaisEmUfemg(bens, regimeBens) {
        const totaisUfemg = { bensComuns: 0, bensParticulares: 0, herancaLiquida: 0, meacao: 0 };
        const bensEmUfemg = [];

        for (const bem of bens) {
            const valorBaseDoBem = bem.valorAvaliacao || 0;
            const percentualTransmitido = (bem.percentualTransmissao !== undefined && bem.percentualTransmissao !== null) ? bem.percentualTransmissao : 100;
            const valorRealConsiderado = valorBaseDoBem * (percentualTransmitido / 100);
            
            const valorUfemgAno = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(bem.anoReferenciaUfemg);
            const valorEmUfemg = valorUfemgAno > 0 ? (valorRealConsiderado / valorUfemgAno) : 0;
            
            bensEmUfemg.push({ ...bem, valorEmUfemg });

            const naturezaEfetiva = regimeBens === 'comunhao_universal' ? 'comum' : bem.natureza;
            if (naturezaEfetiva === 'comum') {
                totaisUfemg.bensComuns += valorEmUfemg;
            } else {
                totaisUfemg.bensParticulares += valorEmUfemg;
            }
        }

        totaisUfemg.meacao = totaisUfemg.bensComuns / 2;
        totaisUfemg.herancaLiquida = totaisUfemg.meacao + totaisUfemg.bensParticulares;

        return { totaisUfemg, bensEmUfemg };
    }


    async function calcular(bens, herdeiros, renunciasDeterminacao, valorUfemgVencimento, vencimentoPartilha, dataPagamento, haHerdeirosNecessarios, estadoCivil, regimeBens, conjugeAscendenteFilhos) {
        if (!bens || bens.length === 0) {
            return { valores: { baseCalculoReais: 0, baseCalculoUfemg: 0 }, detalhesPorHerdeiro: [], erros: [] };
        }
        if (!Sucessao) {
             return { valores: null, detalhesPorHerdeiro: [], erros: ["Módulo de Sucessão não encontrado."] };
        }
        
        const { totaisUfemg, bensEmUfemg } = await _calcularTotaisEmUfemg(bens, regimeBens);

        const herdeirosAtivos = herdeiros.filter(h => !h.renunciouMonte);
        const herdeirosLegitimos = herdeirosAtivos.filter(h => h.tipo !== 'legatario');
        const legatarios = herdeirosAtivos.filter(h => h.tipo === 'legatario');
        
        let participantesParaCalculoLegal = [...herdeirosLegitimos];
        if (estadoCivil === 'casado' && !participantesParaCalculoLegal.some(p => p.tipo === 'conjuge')) {
            participantesParaCalculoLegal.push({ id: 'conjuge-meacao', nome: 'Cônjuge (Meeiro)', tipo: 'conjuge' });
        }

        const participantes = new Map();
        participantesParaCalculoLegal.forEach(h => {
            participantes.set(h.id, { 
                ...h,
                quinhaoDevidoOriginalUfemg: 0,
                legadoDevidoUfemg: 0,
                quinhaoRecebidoUfemg: 0,
                excedenteUfemg: 0, 
                excessoLiberalidadeUfemg: 0
            });
        });

        bensEmUfemg.forEach(bem => {
            if (!bem.partilha) return;
            for (const id in bem.partilha) {
                if (participantes.has(id)) {
                    const participante = participantes.get(id);
                    const percentualPartilhado = (parseFloat(bem.partilha[id]) || 0) / 100;
                    participante.quinhaoRecebidoUfemg += bem.valorEmUfemg * percentualPartilhado;
                }
            }
        });

        if (haHerdeirosNecessarios) {
            const parteDisponivelUfemg = totaisUfemg.herancaLiquida / 2;
            const parteLegitimaUfemg = totaisUfemg.herancaLiquida - parteDisponivelUfemg;
            const legadoDevidoPorLegatarioUfemg = legatarios.length > 0 ? parteDisponivelUfemg / legatarios.length : 0;
            const totaisParaLegitima = { ...totaisUfemg, herancaLiquida: parteLegitimaUfemg };
            
            const partilhaLegal = await Sucessao.determinarPartilhaLegitima(participantesParaCalculoLegal, totaisParaLegitima, estadoCivil, regimeBens, conjugeAscendenteFilhos);
            
            participantes.forEach(p => {
                const quinhaoDevidoLegal = partilhaLegal.heranca.get(p.id) || { total: 0, fromParticulares: 0, fromComuns: 0 };

                if (p.tipo === 'legatario') {
                    p.legadoDevidoUfemg = legadoDevidoPorLegatarioUfemg;
                    p.excessoLiberalidadeUfemg = Math.max(0, p.quinhaoRecebidoUfemg - p.legadoDevidoUfemg);
                } else if (p.tipo === 'conjuge') {
                    const direitoHerancaUfemg = quinhaoDevidoLegal.total;
                    p.quinhaoDevidoOriginalUfemg = totaisUfemg.meacao + direitoHerancaUfemg;
                    p.excedenteUfemg = Math.max(0, p.quinhaoRecebidoUfemg - p.quinhaoDevidoOriginalUfemg);
                } else {
                    p.quinhaoDevidoOriginalUfemg = quinhaoDevidoLegal.total;
                    p.excedenteUfemg = Math.max(0, p.quinhaoRecebidoUfemg - p.quinhaoDevidoOriginalUfemg);
                }
            });
        } else {
            let totalRecebidoPelosLegatariosUfemg = 0;
            legatarios.forEach(legatario => {
                const p = participantes.get(legatario.id);
                totalRecebidoPelosLegatariosUfemg += p.quinhaoRecebidoUfemg;
                p.legadoDevidoUfemg = p.quinhaoRecebidoUfemg;
                p.excessoLiberalidadeUfemg = 0;
            });

            // **INÍCIO DA CORREÇÃO**
            let partilhaLegalRemanescente = null; 
            // **FIM DA CORREÇÃO**

            const herancaRemanescenteUfemg = totaisUfemg.herancaLiquida - totalRecebidoPelosLegatariosUfemg;
            if (herancaRemanescenteUfemg > 0 && herdeirosLegitimos.length > 0) {
                const totaisParaRemanescente = { ...totaisUfemg, herancaLiquida: herancaRemanescenteUfemg };
                // **INÍCIO DA CORREÇÃO**
                partilhaLegalRemanescente = await Sucessao.determinarPartilhaLegitima(participantesParaCalculoLegal, totaisParaRemanescente, estadoCivil, regimeBens, conjugeAscendenteFilhos);
                // **FIM DA CORREÇÃO**
                
                herdeirosLegitimos.forEach(herdeiro => {
                    const p = participantes.get(herdeiro.id);
                    if (p.tipo !== 'conjuge') {
                        const quinhaoDevidoLegal = partilhaLegalRemanescente.heranca.get(p.id) || { total: 0 };
                        p.quinhaoDevidoOriginalUfemg = quinhaoDevidoLegal.total;
                        p.excedenteUfemg = Math.max(0, p.quinhaoRecebidoUfemg - p.quinhaoDevidoOriginalUfemg);
                    }
                });
            }
            
            const meeiro = Array.from(participantes.values()).find(p => p.tipo === 'conjuge');
            if (meeiro) {
                // **INÍCIO DA CORREÇÃO**
                const quinhaoHerancaMeeiro = (partilhaLegalRemanescente?.heranca.get(meeiro.id) || { total: 0 }).total;
                // **FIM DA CORREÇÃO**
                meeiro.quinhaoDevidoOriginalUfemg = totaisUfemg.meacao + quinhaoHerancaMeeiro;
                meeiro.excedenteUfemg = Math.max(0, meeiro.quinhaoRecebidoUfemg - meeiro.quinhaoDevidoOriginalUfemg);
            }
        }

        let baseCalculoTotalUfemg = 0;
        participantes.forEach(p => {
            const valorTributavelUfemg = (p.excedenteUfemg || 0) + (p.excessoLiberalidadeUfemg || 0);
            if (valorTributavelUfemg > 0) {
                 baseCalculoTotalUfemg += valorTributavelUfemg;
            }
        });
        
        const baseCalculoTotalReais = baseCalculoTotalUfemg * valorUfemgVencimento;
        
        const detalhesParaRetorno = Array.from(participantes.values());
        
        return {
            valores: {
                baseCalculoReais: baseCalculoTotalReais,
                baseCalculoUfemg: baseCalculoTotalUfemg,
                itcdPrincipal: 0, desconto: 0, multa: 0, juros: 0,
                percentualJuros: 0, impostoARecolher: 0
            },
            detalhesPorHerdeiro: detalhesParaRetorno,
            erros: []
        };
    }

    return {
        init,
        calcular
    };
})();