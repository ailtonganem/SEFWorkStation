// js/itcd.js - Módulo Principal para Avaliações ITCD
// v1.20.0 - CORRIGIDO: Adiciona a rota 'itcd-editar-calculo' no handleMenuAction para permitir a edição de cálculos salvos.
// v1.19.0 - CORRIGIDO: Adiciona a inicialização dos submódulos de legislação (Lei 6.763/75, etc.), que estava ausente e causava erros de referência no cálculo do ITCD.
// v1.18.0 - ADICIONADO: Inicialização do novo módulo de cálculo de Diferença de Partilha para corrigir erro de referência.
// v1.17.0 - ALTERADO: Renomeia a rota de configurações para 'itcd-configuracoes' para maior consistência.
// v1.16.0 - Adiciona a rota para a nova consulta da taxa SELIC.
// v1.15.2 - CORRIGIDO: Restaura o 'case' para itcd-gerir-calculos que foi removido acidentalmente.
// v1.15.1 - CORRIGIDO: Adiciona as chamadas de init para os submódulos de listagem e visualização de cálculos.
// v1.15.0 - Adiciona e inicializa o novo submódulo de Visualização de Cálculos.
// v1.14.0 - Adiciona e inicializa o novo submódulo de Listagem de Cálculos.
// v1.13.0 - Adiciona e inicializa o novo submódulo de Cálculo Causa Mortis.
// v1.12.0 - Adiciona e inicializa o novo submódulo de Cálculo do ITCD.
// ... (histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ITCD = window.SEFWorkStation.ITCD || {};

window.SEFWorkStation.ITCD = (function() {

    let mainContentWrapperRef;
    let dbRef;
    let appModuleRef;
    let uiModuleRef;
    let sharedUtilsRef;

    let avaliacoesUrbanoRef;
    let avaliacoesRuralRef;
    let avaliacoesSemoventesRef;
    let configuracoesRef;
    let tabelasReferenciaRef; 
    let listagensRef;
    let viewRef;
    let calculoHubRef;
    let calculoCausaMortisRef;
    let calculoListagensRef;
    let calculoViewRef;
    let calculoDiferencaPartilhaRef;
    // NOVO: Referências para os módulos de legislação
    let lei6763_75Ref;
    let lei9752_89Ref;
    let lei12426_96Ref;
    let lei14941_03_ate2007Ref;
    let lei14941_03_apos2008Ref;

    /**
     * Função auxiliar para preparar o container do módulo com a classe CSS correta,
     * garantindo a aplicação dos estilos de fonte específicos do ITCD.
     */
    function prepareModuleContainer() {
        if (mainContentWrapperRef) {
            // Remove outras classes de módulo para evitar conflitos de estilo.
            // Ex: mainContentWrapperRef.classList.remove('ajuda-module-content');
            mainContentWrapperRef.classList.add('itcd-module-content');
        }
    }

    function init(db, app, ui, utils) {
        dbRef = db;
        appModuleRef = app;
        uiModuleRef = ui;
        sharedUtilsRef = utils;
        mainContentWrapperRef = document.querySelector('.main-content-wrapper');

        avaliacoesUrbanoRef = window.SEFWorkStation.ITCD.AvaliacoesUrbano;
        avaliacoesRuralRef = window.SEFWorkStation.ITCD.AvaliacoesRural;
        avaliacoesSemoventesRef = window.SEFWorkStation.ITCD.AvaliacoesSemoventes;
        configuracoesRef = window.SEFWorkStation.ITCD.Configuracoes;
        tabelasReferenciaRef = window.SEFWorkStation.ITCD.TabelasReferencia; 
        listagensRef = window.SEFWorkStation.ITCD.Listagens;
        viewRef = window.SEFWorkStation.ITCD.View;
        calculoHubRef = window.SEFWorkStation.ITCD.Calculo.Hub; 
        calculoCausaMortisRef = window.SEFWorkStation.ITCD.Calculo.CausaMortis;
        calculoListagensRef = window.SEFWorkStation.ITCD.Calculo.Listagens;
        calculoViewRef = window.SEFWorkStation.ITCD.Calculo.View;
        calculoDiferencaPartilhaRef = window.SEFWorkStation.ITCD.Calculo.DiferencaPartilha;
        // NOVO: Atribuição dos módulos de legislação
        lei6763_75Ref = window.SEFWorkStation.ITCD.Calculo.Legislacao.Lei6763_75;
        lei9752_89Ref = window.SEFWorkStation.ITCD.Calculo.Legislacao.Lei9752_89;
        lei12426_96Ref = window.SEFWorkStation.ITCD.Calculo.Legislacao.Lei12426_96;
        lei14941_03_ate2007Ref = window.SEFWorkStation.ITCD.Calculo.Legislacao.Lei14941_03_ate2007;
        lei14941_03_apos2008Ref = window.SEFWorkStation.ITCD.Calculo.Legislacao.Lei14941_03_apos2008;

        if (configuracoesRef && typeof configuracoesRef.init === 'function') {
            configuracoesRef.init(db, app, ui, utils, mainContentWrapperRef);
        }
        if (avaliacoesUrbanoRef && typeof avaliacoesUrbanoRef.init === 'function') {
            avaliacoesUrbanoRef.init(db, app, ui, utils, mainContentWrapperRef);
        }
        if (avaliacoesRuralRef && typeof avaliacoesRuralRef.init === 'function') {
            avaliacoesRuralRef.init(db, app, ui, utils, mainContentWrapperRef);
        }
        if (avaliacoesSemoventesRef && typeof avaliacoesSemoventesRef.init === 'function') {
            avaliacoesSemoventesRef.init(db, app, ui, utils, mainContentWrapperRef);
        }
        if (tabelasReferenciaRef && typeof tabelasReferenciaRef.init === 'function') {
            tabelasReferenciaRef.init(db, app, ui, utils, mainContentWrapperRef);
        }
        if (listagensRef && typeof listagensRef.init === 'function') {
            listagensRef.init(db, app, ui, mainContentWrapperRef);
        }
        if (viewRef && typeof viewRef.init === 'function') {
            viewRef.init(db, app, ui, mainContentWrapperRef);
        }
        if (calculoHubRef && typeof calculoHubRef.init === 'function') {
            calculoHubRef.init(app, ui);
        }
        if (calculoCausaMortisRef && typeof calculoCausaMortisRef.init === 'function') {
            calculoCausaMortisRef.init(app, ui, db);
        }
        if (calculoListagensRef && typeof calculoListagensRef.init === 'function') {
            calculoListagensRef.init(db, app, ui, mainContentWrapperRef);
        }
        if (calculoViewRef && typeof calculoViewRef.init === 'function') {
            calculoViewRef.init(db, app, ui, mainContentWrapperRef);
        }
        if (calculoDiferencaPartilhaRef && typeof calculoDiferencaPartilhaRef.init === 'function') {
            calculoDiferencaPartilhaRef.init();
        }
        // NOVO: Inicialização dos módulos de legislação
        if (lei6763_75Ref && typeof lei6763_75Ref.init === 'function') { lei6763_75Ref.init(); }
        if (lei9752_89Ref && typeof lei9752_89Ref.init === 'function') { lei9752_89Ref.init(); }
        if (lei12426_96Ref && typeof lei12426_96Ref.init === 'function') { lei12426_96Ref.init(); }
        if (lei14941_03_ate2007Ref && typeof lei14941_03_ate2007Ref.init === 'function') { lei14941_03_ate2007Ref.init(); }
        if (lei14941_03_apos2008Ref && typeof lei14941_03_apos2008Ref.init === 'function') { lei14941_03_apos2008Ref.init(); }
        
        console.log("ITCD.JS: Módulo de ITCD inicializado e submódulos conectados (v1.20.0).");
    }

    function handleMenuAction(action, data = null) {
        if (!mainContentWrapperRef) {
            console.error("ITCD.JS: O contêiner de conteúdo principal não está definido.");
            return;
        }
        
        prepareModuleContainer();

        switch (action) {
            // ROTAS DE CÁLCULO
            case 'itcd-calculo-hub':
                if (calculoHubRef) {
                    calculoHubRef.renderCalculoHubPage();
                } else {
                    mainContentWrapperRef.innerHTML = `<h2>Erro</h2><p>O módulo de Cálculo de ITCD não foi carregado corretamente.</p>`;
                }
                break;
            case 'itcd-calculo-causa-mortis':
                if (calculoCausaMortisRef) {
                    calculoCausaMortisRef.renderFormCausaMortis(data?.calculoData);
                } else {
                    mainContentWrapperRef.innerHTML = `<h2>Erro</h2><p>O módulo de Cálculo Causa Mortis não foi carregado corretamente.</p>`;
                }
                break;
            case 'itcd-gerir-calculos':
                if (calculoListagensRef) {
                    calculoListagensRef.renderGerirCalculosPage();
                } else {
                    mainContentWrapperRef.innerHTML = `<h2>Erro</h2><p>O módulo para Gerir Cálculos não foi carregado corretamente.</p>`;
                }
                break;
            case 'itcd-visualizar-calculo':
                if (calculoViewRef && data && data.calculoId) {
                    calculoViewRef.renderVisualizarCalculoPage(data.calculoId);
                } else {
                    mainContentWrapperRef.innerHTML = `<h2>Erro</h2><p>Não foi possível visualizar o cálculo. ID não fornecido ou módulo de visualização indisponível.</p>`;
                }
                break;
            case 'itcd-editar-calculo':
                if (data && data.calculoData) {
                    const calculo = data.calculoData;
                    if (calculo.tipoCalculo === 'causaMortis' && calculoCausaMortisRef) {
                        // Abre o formulário em modo de visualização por padrão, que pode ser habilitado para edição.
                        calculoCausaMortisRef.renderFormCausaMortis(calculo, false); 
                    } else {
                        uiModuleRef.showToastNotification(`Edição para tipo '${calculo.tipoCalculo}' ainda não implementada.`, 'warning');
                    }
                } else {
                    mainContentWrapperRef.innerHTML = `<h2>Erro</h2><p>Dados do cálculo para edição não fornecidos.</p>`;
                }
                break;

            // ROTAS DE AVALIAÇÃO (EXISTENTES)
            case 'itcd-avaliar-imovel-urbano':
                if (avaliacoesUrbanoRef) {
                    avaliacoesUrbanoRef.renderFormAvaliacaoUrbana(data?.avaliacaoData, data?.isDuplicating);
                } else {
                     mainContentWrapperRef.innerHTML = `<h2>Erro</h2><p>O módulo de Avaliação de Imóvel Urbano não foi carregado corretamente.</p>`;
                }
                break;
            
            case 'itcd-avaliar-imovel-rural':
                if (avaliacoesRuralRef) {
                    avaliacoesRuralRef.renderFormAvaliacaoRural(data?.avaliacaoData, data?.isDuplicating);
                } else {
                    mainContentWrapperRef.innerHTML = `<h2>Erro</h2><p>O módulo de Avaliação de Imóvel Rural não foi carregado corretamente.</p>`;
                }
                break;

            case 'itcd-avaliar-semovente':
                if (avaliacoesSemoventesRef) {
                    avaliacoesSemoventesRef.renderFormAvaliacaoSemovente(data?.avaliacaoData, data?.isDuplicating);
                } else {
                    mainContentWrapperRef.innerHTML = `<h2>Erro</h2><p>O módulo de Avaliação de Semoventes não foi carregado corretamente.</p>`;
                }
                break;

            case 'itcd-editar-avaliacao':
            case 'itcd-duplicar-avaliacao':
                 if (data && data.avaliacaoData) {
                    const avaliacao = data.avaliacaoData;
                    const isDuplicating = action === 'itcd-duplicar-avaliacao';
                    
                    if (isDuplicating) {
                        delete avaliacao.id;
                        delete avaliacao.creationDate;
                        delete avaliacao.modificationDate;
                        if(avaliacao.dadosFormulario) {
                            avaliacao.declaracao = ''; // Limpa a DBD
                        }
                    }

                    if (avaliacao.tipo === 'imovel-rural') {
                        avaliacoesRuralRef.renderFormAvaliacaoRural(avaliacao, isDuplicating);
                    } else if (avaliacao.tipo === 'semovente') {
                        avaliacoesSemoventesRef.renderFormAvaliacaoSemovente(avaliacao, isDuplicating);
                    } else { // Padrão é urbano
                        avaliacoesUrbanoRef.renderFormAvaliacaoUrbana(avaliacao, isDuplicating);
                    }
                 } else {
                    mainContentWrapperRef.innerHTML = `<h2>Erro</h2><p>Dados da avaliação para ${action} não fornecidos.</p>`;
                 }
                break;
            
            // DEMAIS ROTAS (EXISTENTES E NOVAS)
            case 'itcd-pesquisar-veiculo-fipe':
                mainContentWrapperRef.innerHTML = `<h2>Pesquisa de Veículos (FIPE)</h2><p>Funcionalidade em desenvolvimento.</p>`;
                break;

            case 'itcd-consultar-ufemg':
                if (tabelasReferenciaRef) {
                    tabelasReferenciaRef.renderTabelaUfemg();
                } else {
                     mainContentWrapperRef.innerHTML = `<h2>Erro</h2><p>O módulo de Tabelas de Referência não foi carregado corretamente.</p>`;
                }
                break;

            case 'itcd-consultar-selic':
                if (tabelasReferenciaRef) {
                    tabelasReferenciaRef.renderTabelaSelic();
                } else {
                     mainContentWrapperRef.innerHTML = `<h2>Erro</h2><p>O módulo de Tabelas de Referência não foi carregado corretamente.</p>`;
                }
                break;

            case 'itcd-configuracoes':
                if (configuracoesRef) {
                    configuracoesRef.renderConfiguracoesPage();
                } else {
                     mainContentWrapperRef.innerHTML = `<h2>Erro</h2><p>O módulo de Configurações ITCD não foi carregado corretamente.</p>`;
                }
                break;

            case 'itcd-gerir-avaliacoes':
                if (listagensRef) {
                    listagensRef.renderGerirAvaliacoesPage();
                } else {
                    mainContentWrapperRef.innerHTML = `<h2>Erro</h2><p>O módulo de Listagem de Avaliações não foi carregado corretamente.</p>`;
                }
                break;

            case 'itcd-visualizar-avaliacao':
                if (viewRef && data && data.avaliacaoId) {
                    viewRef.renderVisualizarAvaliacaoPage(data.avaliacaoId, data.originatingView);
                } else {
                    mainContentWrapperRef.innerHTML = `<h2>Erro</h2><p>Não foi possível visualizar a avaliação. ID não fornecido ou módulo de visualização indisponível.</p>`;
                }
                break;

            default:
                console.warn(`ITCD.JS: Ação desconhecida: ${action}`);
                mainContentWrapperRef.innerHTML = `<h2>Módulo ITCD</h2><p>Ação não reconhecida.</p>`;
                break;
        }
    }

    return {
        init,
        handleMenuAction
    };

})();