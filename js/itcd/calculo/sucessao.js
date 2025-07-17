// js/itcd/calculo/sucessao.js - Módulo de Regras de Sucessão e Partilha
// v8.5.0 - CORREÇÃO CRÍTICA: A lógica de partilha com descendentes foi reescrita para operar por estirpe. Agora, netos representando um filho pré-morto dividem entre si a quota que caberia ao seu ascendente, em vez de receberem uma quota individual cada.
// v8.4.0 - CORREÇÃO CRÍTICA: A lógica de concorrência do cônjuge com descendentes foi refinada.
// v8.3.0 - CORRIGIDO: Refatorada a lógica de partilha com descendentes para tratar corretamente a concorrência do cônjuge nos bens particulares.
// ... (histórico anterior)

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ITCD = window.SEFWorkStation.ITCD || {};
window.SEFWorkStation.ITCD.Calculo = window.SEFWorkStation.ITCD.Calculo || {};

window.SEFWorkStation.ITCD.Calculo.Sucessao = (function() {

    let dbRef;

    const TIPOS_DE_HERDEIROS = [
        { key: 'filho', label: 'Filho(a) Comum', classe: 'descendentes' },
        { key: 'filho_unilateral', label: 'Filho(a) Unilateral (só do falecido)', classe: 'descendentes' },
        { key: 'neto', label: 'Neto(a)', classe: 'descendentes' },
        { key: 'conjuge', label: 'Cônjuge/Companheiro', classe: 'conjuge' },
        { key: 'pai', label: 'Pai/Mãe', classe: 'ascendentes' },
        { key: 'avo', label: 'Avô/Avó', classe: 'ascendentes' },
        { key: 'irmao_bilateral', label: 'Irmão Bilateral', classe: 'colaterais' },
        { key: 'irmao_unilateral', label: 'Irmão Unilateral', classe: 'colaterais' },
        { key: 'colaterais_outros', label: 'Outro Colateral (Tio, Sobrinho)', classe: 'colaterais' },
        { key: 'legatario', label: 'Legatário', classe: 'legatario' }
    ];
    
    function init(db) {
        dbRef = db;
        console.log("Módulo de Sucessão (Regras Fixas) inicializado (v8.5.0).");
    }

    function definirNumeroDeQuinhoes(herdeiros) {
        if (!herdeiros || herdeiros.length === 0) return 1;
    
        const descendentes = herdeiros.filter(h => TIPOS_DE_HERDEIROS.find(t => t.key === h.tipo)?.classe === 'descendentes');
        const conjuge = herdeiros.find(h => h.tipo === 'conjuge');
        
        // CORREÇÃO: Contar por estirpe
        const filhosVivos = descendentes.filter(d => d.tipo === 'filho' || d.tipo === 'filho_unilateral');
        const estirpesDeNetos = new Set(descendentes.filter(d => d.tipo === 'neto').map(n => n.representadoPor));
        const numeroDeEstirpes = filhosVivos.length + estirpesDeNetos.size;

        if (numeroDeEstirpes > 0) {
            let numQuinhoes = numeroDeEstirpes;
            if (conjuge) {
                numQuinhoes++;
            }
            return numQuinhoes;
        }
        
        return herdeiros.length;
    }

    function calcularTotaisIniciais(bens, regimeBens, ignorarBensForaMG = false) {
        let bensComuns = 0;
        let bensParticulares = 0;

        bens.forEach(bem => {
            if (ignorarBensForaMG && bem.foraDeMG) {
                return;
            }

            const valorBaseDoBem = bem.valorAvaliacao || 0;
            const percentualTransmitido = (bem.percentualTransmissao !== undefined && bem.percentualTransmissao !== null) ? bem.percentualTransmissao : 100;
            const valorTotal = valorBaseDoBem * (percentualTransmitido / 100);
            
            if (regimeBens === 'comunhao_universal' || bem.natureza === 'comum') {
                bensComuns += valorTotal;
            } else {
                bensParticulares += valorTotal;
            }
        });

        const meacao = bensComuns / 2;
        const herancaLiquida = meacao + bensParticulares;

        return { meacao, bensParticulares, bensComuns, herancaLiquida };
    }

    async function determinarPartilhaLegitima(herdeiros, totais, estadoCivil, regimeBens, conjugeAscendenteFilhos) {
        const participantes = new Map();
        herdeiros.forEach(h => participantes.set(h.id, { 
            ...h, 
            quinhaoDevido: 0,
            devidoParticulares: 0,
            devidoComuns: 0
        }));

        const herdeirosLegitimos = herdeiros.filter(h => h.tipo !== 'legatario');

        const descendentes = herdeirosLegitimos.filter(h => TIPOS_DE_HERDEIROS.find(t => t.key === h.tipo)?.classe === 'descendentes');
        const ascendentes = herdeirosLegitimos.filter(h => TIPOS_DE_HERDEIROS.find(t => t.key === h.tipo)?.classe === 'ascendentes');
        const conjuge = herdeirosLegitimos.find(h => h.tipo === 'conjuge');
        const colaterais = herdeirosLegitimos.filter(h => TIPOS_DE_HERDEIROS.find(t => t.key === h.tipo)?.classe === 'colaterais');

        if (descendentes.length > 0) {
            _partilharComDescendentes(participantes, totais, descendentes, conjuge, regimeBens, conjugeAscendenteFilhos);
        } else if (ascendentes.length > 0) {
            _partilharComAscendentes(participantes, totais, ascendentes, conjuge);
        } else if (conjuge) {
            const conjugeParticipante = participantes.get(conjuge.id);
            conjugeParticipante.devidoParticulares = totais.bensParticulares;
            conjugeParticipante.devidoComuns = totais.meacao;
            conjugeParticipante.quinhaoDevido = totais.herancaLiquida;
        } else if (colaterais.length > 0) {
            _partilharComColaterais(participantes, totais, colaterais);
        }

        const herancaMap = new Map();
        participantes.forEach((valor, chave) => {
            herancaMap.set(chave, {
                total: valor.quinhaoDevido,
                fromParticulares: valor.devidoParticulares,
                fromComuns: valor.devidoComuns
            });
        });

        return {
            meacao: totais.meacao,
            heranca: herancaMap
        };
    }
    
    function _partilharComDescendentes(participantes, totais, descendentes, conjuge, regimeBens, conjugeAscendenteFilhos) {
        let herancaParticularesParaPartilha = totais.bensParticulares;
        let herancaComunsParaPartilha = totais.meacao;

        // **INÍCIO DA CORREÇÃO POR ESTIRPE**
        const filhosVivos = descendentes.filter(d => d.tipo === 'filho' || d.tipo === 'filho_unilateral');
        const estirpesDeNetos = new Set(descendentes.filter(d => d.tipo === 'neto' && d.representadoPor).map(n => n.representadoPor));
        const numeroDeEstirpes = filhosVivos.length + estirpesDeNetos.size;
        // **FIM DA CORREÇÃO POR ESTIRPE**

        if (conjuge) {
            const conjugeParticipante = participantes.get(conjuge.id);
            const regimesComConcorrencia = ['comunhao_parcial', 'uniao_estavel_parcial', 'separacao_convencional', 'uniao_estavel_cc1790'];

            if (regimesComConcorrencia.includes(regimeBens)) {
                let baseConcorrencia = totais.bensParticulares;
                if (regimeBens === 'separacao_convencional') {
                     baseConcorrencia = totais.bensParticulares + totais.bensComuns; 
                }
                
                let quinhaoConjuge = baseConcorrencia / (numeroDeEstirpes + 1); // Divisão por estirpe

                const haFilhosUnilaterais = descendentes.some(d => d.tipo === 'filho_unilateral');
                if (conjugeAscendenteFilhos === 'sim' && numeroDeEstirpes >= 4 && !haFilhosUnilaterais) {
                    quinhaoConjuge = Math.max(quinhaoConjuge, baseConcorrencia * 0.25);
                }
                
                if (regimeBens === 'separacao_convencional') {
                    const proporcaoParticulares = (totais.bensParticulares + totais.bensComuns) > 0 ? totais.bensParticulares / (totais.bensParticulares + totais.bensComuns) : 0;
                    conjugeParticipante.devidoParticulares = quinhaoConjuge * proporcaoParticulares;
                    conjugeParticipante.devidoComuns = quinhaoConjuge * (1 - proporcaoParticulares);
                    
                    herancaParticularesParaPartilha -= conjugeParticipante.devidoParticulares;
                    herancaComunsParaPartilha -= conjugeParticipante.devidoComuns;
                } else {
                    conjugeParticipante.devidoParticulares = quinhaoConjuge;
                    herancaParticularesParaPartilha -= quinhaoConjuge;
                }

                conjugeParticipante.quinhaoDevido = conjugeParticipante.devidoParticulares + conjugeParticipante.devidoComuns;
            }
        }
        
        _distribuirValorParaClasse(participantes, herancaParticularesParaPartilha, descendentes, 'particulares', numeroDeEstirpes);
        _distribuirValorParaClasse(participantes, herancaComunsParaPartilha, descendentes, 'comuns', numeroDeEstirpes);
    }
    
    function _partilharComAscendentes(participantes, totais, ascendentes, conjuge) {
        let herancaParaAscendentes = totais.herancaLiquida;
        if (conjuge) {
            const conjugeParticipante = participantes.get(conjuge.id);
            const pais = ascendentes.filter(h => h.tipo === 'pai');
            const quinhaoConjuge = (pais.length > 0) ? totais.herancaLiquida / 3 : totais.herancaLiquida / 2;
            
            const proporcaoParticulares = totais.herancaLiquida > 0 ? totais.bensParticulares / totais.herancaLiquida : 0;
            conjugeParticipante.devidoParticulares = quinhaoConjuge * proporcaoParticulares;
            conjugeParticipante.devidoComuns = quinhaoConjuge * (1 - proporcaoParticulares);
            conjugeParticipante.quinhaoDevido = quinhaoConjuge;
            herancaParaAscendentes -= quinhaoConjuge;
        }

        const proporcaoParticularesAsc = herancaParaAscendentes > 0 ? totais.bensParticulares / herancaParaAscendentes : 0;
        _distribuirValorParaClasse(participantes, herancaParaAscendentes * proporcaoParticularesAsc, ascendentes, 'particulares');
        _distribuirValorParaClasse(participantes, herancaParaAscendentes * (1 - proporcaoParticularesAsc), ascendentes, 'comuns');
    }
    
    function _partilharComColaterais(participantes, totais, colaterais) {
        _distribuirValorParaClasse(participantes, totais.bensParticulares, colaterais, 'particulares');
        _distribuirValorParaClasse(participantes, totais.meacao, colaterais, 'comuns');
    }

    function _distribuirValorParaClasse(participantes, valor, herdeiros, tipoBem, numeroDeEstirpes) {
        if (!herdeiros || herdeiros.length === 0 || valor <= 0) return;

        const classe = TIPOS_DE_HERDEIROS.find(t => t.key === herdeiros[0].tipo)?.classe;
        const campoDevido = tipoBem === 'particulares' ? 'devidoParticulares' : 'devidoComuns';

        const distribuir = (participanteId, valorDistribuido) => {
            const p = participantes.get(participanteId);
            if(p) {
                p[campoDevido] += valorDistribuido;
                p.quinhaoDevido += valorDistribuido;
            }
        };

        switch(classe) {
            case 'descendentes':
                if (numeroDeEstirpes === 0) return;
                const valorPorEstirpe = valor / numeroDeEstirpes;
                const filhosVivos = herdeiros.filter(h => h.tipo === 'filho' || h.tipo === 'filho_unilateral');
                const netosPorEstirpe = herdeiros.filter(h => h.tipo === 'neto').reduce((acc, neto) => {
                    const rep = neto.representadoPor;
                    if (!acc[rep]) acc[rep] = [];
                    acc[rep].push(neto);
                    return acc;
                }, {});

                // Distribui para filhos vivos
                filhosVivos.forEach(filho => distribuir(filho.id, valorPorEstirpe));

                // Distribui para netos, dividindo a quota da estirpe
                for(const estirpeId in netosPorEstirpe) {
                    const netosDaEstirpe = netosPorEstirpe[estirpeId];
                    const valorPorNeto = valorPorEstirpe / netosDaEstirpe.length;
                    netosDaEstirpe.forEach(neto => distribuir(neto.id, valorPorNeto));
                }
                break;

            case 'ascendentes':
                const pais = herdeiros.filter(h => h.tipo === 'pai');
                if (pais.length > 0) {
                    const valorPorPai = valor / pais.length;
                    pais.forEach(p => distribuir(p.id, valorPorPai));
                } else {
                    const avos = herdeiros.filter(h => h.tipo === 'avo');
                    if (avos.length > 0) {
                        const valorPorAvo = valor / avos.length;
                        avos.forEach(a => distribuir(a.id, valorPorAvo));
                    }
                }
                break;
            
            case 'colaterais':
                const irmaosBilateral = herdeiros.filter(h => h.tipo === 'irmao_bilateral');
                const irmaosUnilateral = herdeiros.filter(h => h.tipo === 'irmao_unilateral');
                
                if(irmaosBilateral.length > 0 || irmaosUnilateral.length > 0) {
                    const totalQuotas = (irmaosBilateral.length * 2) + irmaosUnilateral.length;
                    if (totalQuotas === 0) return;
                    
                    const valorPorQuota = valor / totalQuotas;
                    irmaosBilateral.forEach(i => distribuir(i.id, valorPorQuota * 2));
                    irmaosUnilateral.forEach(i => distribuir(i.id, valorPorQuota));
                } else {
                     const valorPorHerdeiro = valor / herdeiros.length;
                     herdeiros.forEach(h => distribuir(h.id, valorPorHerdeiro));
                }
                break;

            default:
                const valorPorHerdeiro = valor / herdeiros.length;
                herdeiros.forEach(h => distribuir(h.id, valorPorHerdeiro));
                break;
        }
    }

    return {
        init,
        calcularTotaisIniciais,
        determinarPartilhaLegitima,
        definirNumeroDeQuinhoes,
        TIPOS_DE_HERDEIROS
    };
})();