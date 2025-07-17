// js/itcd.js - Módulo Principal para Avaliações e Cálculos ITCD
// v1.26.1 - CORRIGIDO: Rota 'itcd-editar-calculo' agora passa o parâmetro 'startInEditMode' para o módulo de cálculo correspondente, permitindo que a tela seja aberta em modo de visualização.
// v1.26.0 - ADICIONADO: Roteamento para a edição do cálculo de Doações Sucessivas no handleMenuAction.
// v1.25.0 - CORRIGIDO: Refatorada a função 'init' para inicializar os submódulos de forma mais explícita, corrigindo falha na delegação de ações como 'itcd-visualizar-calculo'.
// ... (histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ITCD = window.SEFWorkStation.ITCD || {};

(function(ITCDPrincipal) {

    let mainContentWrapperRef;
    let dbRef;
    let appModuleRef;
    let uiModuleRef;
    let sharedUtilsRef;

    // Referências movidas para o escopo do módulo para persistirem após a inicialização
    let avaliacoesUrbanoRef, avaliacoesRuralRef, avaliacoesSemoventesRef, configuracoesRef, tabelasReferenciaRef, listagensRef, viewRef;
    let calculoHubRef, calculoCausaMortisRef, calculoListagensRef, calculoViewRef, calculoDiferencaPartilhaRef, sucessaoRef;
    let lei6763_75Ref, lei9752_89Ref, lei12426_96Ref, lei14941_03_ate2007Ref, lei14941_03_apos2008Ref;
    let calculoDoacaoRef, calculoExcedenteMeacaoRef, calculoInstituicaoUsufrutoRef, calculoExtincaoUsufrutoRef, calculoDoacoesSucessivasRef;

    function prepareModuleContainer() {
        if (mainContentWrapperRef) {
            mainContentWrapperRef.classList.add('itcd-module-content');
        }
    }

    function init(db, app, ui, utils) {
        dbRef = db;
        appModuleRef = app;
        uiModuleRef = ui;
        sharedUtilsRef = utils;
        mainContentWrapperRef = document.querySelector('.main-content-wrapper');

        // Carregar referências para todos os submódulos
        configuracoesRef = window.SEFWorkStation.ITCD.Configuracoes;
        tabelasReferenciaRef = window.SEFWorkStation.ITCD.TabelasReferencia;
        
        // Avaliações
        avaliacoesUrbanoRef = window.SEFWorkStation.ITCD.AvaliacoesUrbano;
        avaliacoesRuralRef = window.SEFWorkStation.ITCD.AvaliacoesRural;
        avaliacoesSemoventesRef = window.SEFWorkStation.ITCD.AvaliacoesSemoventes;
        listagensRef = window.SEFWorkStation.ITCD.Listagens;
        viewRef = window.SEFWorkStation.ITCD.View;
        
        // Cálculo - Geral e Legislação
        calculoHubRef = window.SEFWorkStation.ITCD.Calculo.Hub; 
        sucessaoRef = window.SEFWorkStation.ITCD.Calculo.Sucessao;
        lei6763_75Ref = window.SEFWorkStation.ITCD.Calculo.Legislacao.Lei6763_75;
        lei9752_89Ref = window.SEFWorkStation.ITCD.Calculo.Legislacao.Lei9752_89;
        lei12426_96Ref = window.SEFWorkStation.ITCD.Calculo.Legislacao.Lei12426_96;
        lei14941_03_ate2007Ref = window.SEFWorkStation.ITCD.Calculo.Legislacao.Lei14941_03_ate2007;
        lei14941_03_apos2008Ref = window.SEFWorkStation.ITCD.Calculo.Legislacao.Lei14941_03_apos2008;

        // Cálculo - Tipos específicos
        calculoCausaMortisRef = window.SEFWorkStation.ITCD.Calculo.CausaMortis;
        calculoDiferencaPartilhaRef = window.SEFWorkStation.ITCD.Calculo.DiferencaPartilha;
        calculoDoacaoRef = window.SEFWorkStation.ITCD.Calculo.Doacao;
        calculoExcedenteMeacaoRef = window.SEFWorkStation.ITCD.Calculo.ExcedenteMeacao;
        calculoInstituicaoUsufrutoRef = window.SEFWorkStation.ITCD.Calculo.InstituicaoUsufruto;
        calculoExtincaoUsufrutoRef = window.SEFWorkStation.ITCD.Calculo.ExtincaoUsufruto;
        calculoDoacoesSucessivasRef = window.SEFWorkStation.ITCD.Calculo.DoacoesSucessivas;

        // Cálculo - Listagem e Visualização
        calculoListagensRef = window.SEFWorkStation.ITCD.Calculo.Listagens;
        calculoViewRef = window.SEFWorkStation.ITCD.Calculo.View;

        // Inicializar todos os submódulos de forma explícita
        if (configuracoesRef?.init) configuracoesRef.init(db, app, ui, utils, mainContentWrapperRef);
        if (tabelasReferenciaRef?.init) tabelasReferenciaRef.init(db, app, ui, utils, mainContentWrapperRef);
        
        if (avaliacoesUrbanoRef?.init) avaliacoesUrbanoRef.init(db, app, ui, utils, mainContentWrapperRef);
        if (avaliacoesRuralRef?.init) avaliacoesRuralRef.init(db, app, ui, utils, mainContentWrapperRef);
        if (avaliacoesSemoventesRef?.init) avaliacoesSemoventesRef.init(db, app, ui, utils, mainContentWrapperRef);
        if (listagensRef?.init) listagensRef.init(db, app, ui, mainContentWrapperRef);
        if (viewRef?.init) viewRef.init(db, app, ui, mainContentWrapperRef);
        
        if (calculoHubRef?.init) calculoHubRef.init(app, ui);
        if (sucessaoRef?.init) sucessaoRef.init(db);
        if (lei6763_75Ref?.init) lei6763_75Ref.init();
        if (lei9752_89Ref?.init) lei9752_89Ref.init();
        if (lei12426_96Ref?.init) lei12426_96Ref.init();
        if (lei14941_03_ate2007Ref?.init) lei14941_03_ate2007Ref.init();
        if (lei14941_03_apos2008Ref?.init) lei14941_03_apos2008Ref.init();
        
        if (calculoCausaMortisRef?.init) calculoCausaMortisRef.init(app, ui, db);
        if (calculoDiferencaPartilhaRef?.init) calculoDiferencaPartilhaRef.init(db);
        if (calculoDoacaoRef?.init) calculoDoacaoRef.init(app, ui, db);
        if (calculoExcedenteMeacaoRef?.init) calculoExcedenteMeacaoRef.init(app, ui, db);
        if (calculoInstituicaoUsufrutoRef?.init) calculoInstituicaoUsufrutoRef.init(app, ui, db);
        if (calculoExtincaoUsufrutoRef?.init) calculoExtincaoUsufrutoRef.init(app, ui, db);
        if (calculoDoacoesSucessivasRef?.init) calculoDoacoesSucessivasRef.init(app, ui, db);

        if (calculoListagensRef?.init) calculoListagensRef.init(db, app, ui, mainContentWrapperRef);
        if (calculoViewRef?.init) calculoViewRef.init(db, app, ui, mainContentWrapperRef);
        
        console.log("ITCD.JS: Módulo de ITCD inicializado e submódulos conectados (v1.26.1).");
    }

    function handleMenuAction(action, data = null) {
        if (!mainContentWrapperRef) {
            console.error("ITCD.JS: O contêiner de conteúdo principal não está definido.");
            return;
        }
        
        prepareModuleContainer();

        switch (action) {
            case 'itcd-calculo-hub':
                calculoHubRef?.renderCalculoHubPage();
                break;
            case 'itcd-calculo-causa-mortis':
                calculoCausaMortisRef?.renderFormCausaMortis(data?.calculoData);
                break;
            case 'itcd-gerir-calculos':
                calculoListagensRef?.renderGerirCalculosPage();
                break;
            case 'itcd-visualizar-calculo':
                calculoViewRef?.renderVisualizarCalculoPage(data?.calculoId);
                break;
            case 'itcd-editar-calculo':
                if (data?.calculoData) {
                    const tipo = data.calculoData.tipoCalculo;
                    const startInEditMode = data.startInEditMode === false ? false : true; // Garante o padrão true
                    
                    if (tipo === 'causaMortis') {
                        calculoCausaMortisRef?.renderFormCausaMortis(data.calculoData, startInEditMode); 
                    } else if (tipo === 'doacao') {
                        calculoDoacaoRef?.renderFormDoacao(data.calculoData, startInEditMode);
                    } else if (tipo === 'excedenteMeacao') {
                        calculoExcedenteMeacaoRef?.renderFormExcedenteMeacao(data.calculoData, startInEditMode);
                    } else if (tipo === 'usufruto_instituicao') {
                         calculoInstituicaoUsufrutoRef?.renderForm(data.calculoData, startInEditMode);
                    } else if (tipo === 'usufruto_extincao') {
                         calculoExtincaoUsufrutoRef?.renderForm(data.calculoData, startInEditMode);
                    } else if (tipo === 'doacoesSucessivas') {
                         calculoDoacoesSucessivasRef?.renderFormDoacoesSucessivas(data.calculoData);
                    } else {
                         uiModuleRef?.showToastNotification(`Edição para tipo '${tipo}' ainda não implementada.`, 'warning');
                         appModuleRef.handleMenuAction('itcd-gerir-calculos');
                    }
                } else {
                     uiModuleRef?.showToastNotification("Dados do cálculo para edição não fornecidos.", "error");
                     appModuleRef.handleMenuAction('itcd-gerir-calculos');
                }
                break;

            case 'itcd-calculo-doacao':
                calculoDoacaoRef?.renderFormDoacao();
                break;
            case 'itcd-calculo-doacoes-sucessivas':
                calculoDoacoesSucessivasRef?.renderFormDoacoesSucessivas();
                break;
            case 'itcd-calculo-excedente-meacao':
                calculoExcedenteMeacaoRef?.renderFormExcedenteMeacao();
                break;
            case 'itcd-calculo-instituicao-usufruto':
                calculoInstituicaoUsufrutoRef?.renderForm();
                break;
            case 'itcd-calculo-extincao-usufruto':
                calculoExtincaoUsufrutoRef?.renderForm();
                break;

            // ROTAS DE AVALIAÇÃO E OUTRAS (EXISTENTES)
            case 'itcd-avaliar-imovel-urbano':
                avaliacoesUrbanoRef?.renderFormAvaliacaoUrbana(data?.avaliacaoData, data?.isDuplicating);
                break;
            case 'itcd-avaliar-imovel-rural':
                avaliacoesRuralRef?.renderFormAvaliacaoRural(data?.avaliacaoData, data?.isDuplicating);
                break;
            case 'itcd-avaliar-semovente':
                avaliacoesSemoventesRef?.renderFormAvaliacaoSemovente(data?.avaliacaoData, data?.isDuplicating);
                break;
            case 'itcd-editar-avaliacao':
            case 'itcd-duplicar-avaliacao':
                if (data?.avaliacaoData) {
                    const avaliacao = data.avaliacaoData;
                    const isDuplicating = action === 'itcd-duplicar-avaliacao';
                    if (isDuplicating) {
                        delete avaliacao.id;
                        delete avaliacao.creationDate;
                        delete avaliacao.modificationDate;
                        if(avaliacao.dadosFormulario) avaliacao.declaracao = '';
                    }
                    if (avaliacao.tipo === 'imovel-rural') avaliacoesRuralRef?.renderFormAvaliacaoRural(avaliacao, isDuplicating);
                    else if (avaliacao.tipo === 'semovente') avaliacoesSemoventesRef?.renderFormAvaliacaoSemovente(avaliacao, isDuplicating);
                    else avaliacoesUrbanoRef?.renderFormAvaliacaoUrbana(avaliacao, isDuplicating);
                }
                break;
            case 'itcd-pesquisar-veiculo-fipe':
                mainContentWrapperRef.innerHTML = `<h2>Pesquisa de Veículos (FIPE)</h2><p>Funcionalidade em desenvolvimento.</p>`;
                break;
            case 'itcd-consultar-ufemg':
                tabelasReferenciaRef?.renderTabelaUfemg();
                break;
            case 'itcd-consultar-selic':
                tabelasReferenciaRef?.renderTabelaSelic();
                break;
            case 'itcd-configuracoes':
                configuracoesRef?.renderConfiguracoesPage();
                break;
            case 'itcd-gerir-avaliacoes':
                listagensRef?.renderGerirAvaliacoesPage();
                break;
            case 'itcd-visualizar-avaliacao':
                viewRef?.renderVisualizarAvaliacaoPage(data?.avaliacaoId, data?.originatingView);
                break;
            default:
                console.warn(`ITCD.JS: Ação desconhecida: ${action}`);
                mainContentWrapperRef.innerHTML = `<h2>Módulo ITCD</h2><p>Ação não reconhecida.</p>`;
                break;
        }
    }
    
    // Anexa as funções ao namespace ITCDPrincipal existente
    ITCDPrincipal.init = init;
    ITCDPrincipal.handleMenuAction = handleMenuAction;

})(window.SEFWorkStation.ITCD);