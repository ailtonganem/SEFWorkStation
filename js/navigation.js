// js/navigation.js - Gerenciador de Navegação e Roteamento da Aplicação
// v1.22.0 - ADICIONADO: Rota para a nova página de Backup/Restauração do ITCD.
// v1.21.0 - REFATORADO: Remove a rota genérica de usufruto e adiciona as rotas específicas 'itcd-calculo-instituicao-usufruto' e 'itcd-calculo-extincao-usufruto'.
// v1.20.0 - Adiciona roteamento para edição dos novos tipos de cálculo (Doação, etc.)
// v1.19.0 - Adiciona rotas para os novos cálculos de ITCD: Doação, Excedente, Usufruto e Doações Sucessivas.
// ... (histórico anterior)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.Navigation = (function() {
    const LIXEIRA_GLOBAL_MODULE_NAME = 'lixeira-global';

    let dependencies = {
        applyFiltersAndRefreshViews: () => {},
        clearGlobalFeedback: () => {},
        updateFilterUI: () => {},
        getModuleRef: (moduleName) => null
    };
    
    function init(deps) {
        dependencies = { ...dependencies, ...deps };
        console.log("NAVIGATION.JS: Módulo de Navegação inicializado (v1.22.0).");
    }

    function setCurrentViewTarget(target, isNavigationAction = true, dataForHistory = null) {
        const State = window.SEFWorkStation.State;
        const currentView = State.getCurrentView();

        if (isNavigationAction && target && target !== currentView && !target.startsWith('filter-') && !target.startsWith('sort-')) {
            const viewsConsideradasNavegaveisParaHistorico = [
                'welcome', 'gerir', 'modelos', 'search', 'form', 'view',
                'tipos', 'categorias', 'tags', 'backup', 'gerir-backups', 'conversor-json-v2', 'configuracoes', 'ajuda', 'itens-recebidos', 'central-compartilhamento', 'historico-compartilhamento', 'visualizar-detalhes-compartilhamento',
                'form-contribuinte', 'view-contribuinte', 'gerir-contribuintes', 'gerir-contribuintes-placeholders',
                'gerir-categorias-contribuintes', 'gerir-tags-contribuintes',
                'form-servidor', 'view-servidor', 'gerir-servidores', 'calendario-servidores', 'meu-perfil', 
                'form-grupo-servidores', 'view-grupo-servidores', 'gerir-grupos-servidores', 
                'form-recurso', 'view-recurso', 'gerir-recursos',
                'criar-documentos-lote', 'gerenciar-lotes-documentos',
                'form-nota-rapida', 'view-nota-rapida', 'gerir-notas-rapidas',
                'form-tarefa', 'view-tarefa', 'gerir-tarefas', 'calendario-tarefas', 'minhas-tarefas', 
                'cadastrar-protocolo', 'gerir-protocolos', 'view-protocolo',
                'cadastrar-pta', 'gerir-ptas', 'view-pta',
                'cadastrar-autuacao', 'gerir-autuacoes', 'view-autuacao',
                LIXEIRA_GLOBAL_MODULE_NAME, 'relatorios', 'gerenciar-anexos-central',
                'form-destinatario', 'gerir-destinatarios', 'visualizar-destinatario',
                'form-grupo-destinatarios', 'gerir-grupos-destinatarios', 'visualizar-grupo-destinatarios',
                'escrever-email', 'gerir-emails-criados', 'visualizar-email-gerado',
                'exibir-resultados-globais',
                // VISUALIZAÇÕES DO ITCD
                'itcd-calculo-hub',
                'itcd-calculo-causa-mortis',
                'itcd-gerir-calculos',
                'itcd-visualizar-calculo',
                'itcd-editar-calculo',
                'itcd-avaliar-imovel-urbano', 'itcd-avaliar-imovel-rural', 'itcd-avaliar-semovente', 'itcd-avaliar-acoes',
                'itcd-consultar-ufemg', 'itcd-consultar-selic', 'itcd-gerir-avaliacoes',
                'itcd-configuracoes', 'itcd-editar-avaliacao', 'itcd-visualizar-avaliacao',
                'itcd-duplicar-avaliacao',
                'itcd-calculo-doacao',
                'itcd-calculo-doacoes-sucessivas',
                'itcd-calculo-excedente-meacao',
                'itcd-calculo-instituicao-usufruto',
                'itcd-calculo-extincao-usufruto',
                'backup-restauracao-itcd' // Rota para nova página de backup
            ];
    
            if (viewsConsideradasNavegaveisParaHistorico.includes(currentView) && currentView !== target) {
                const eUmaViewDeNaoDocumento = [
                    LIXEIRA_GLOBAL_MODULE_NAME, 'ajuda', 'configuracoes', 'backup', 'gerir-backups', 'conversor-json-v2', 'itens-recebidos', 'central-compartilhamento', 'historico-compartilhamento', 'visualizar-detalhes-compartilhamento', 'gerenciar-anexos-central',
                    'gerir-servidores', 'calendario-servidores', 'gerir-grupos-servidores', 'visualizar-grupo-servidores', 'form-grupo-servidores', 'meu-perfil',
                    'gerir-destinatarios', 'gerir-grupos-destinatarios', 'escrever-email', 'gerir-emails-criados', 'visualizar-email-gerado',
                    'visualizar-destinatario', 'visualizar-grupo-destinatarios', 'relatorios', 'exibir-resultados-globais',
                    'backup-restauracao-itcd'
                ].some(v => currentView.startsWith(v));
                
                const filtersToSaveForHistory = eUmaViewDeNaoDocumento ? null : State.getActiveFilters();
    
                State.pushToNavigationHistory({ 
                    view: currentView, 
                    data: dataForHistory, 
                    filters: filtersToSaveForHistory 
                });
            }
        }
        
        State.setCurrentView(target);
    
        if (SEFWorkStation.Documentos?.setLastRenderedOriginatingView) {
            if (['gerir', 'modelos', 'search', 'welcome'].includes(target)) {
                SEFWorkStation.Documentos.setLastRenderedOriginatingView(target);
            }
        }
    }

    function handleMenuAction(action, data = null, isNavigatingBack = false) {
        console.log(`[DEBUG LOG] NAVIGATION.JS: handleMenuAction recebida com action='${action}' e data=`, data);
        dependencies.clearGlobalFeedback();
        if (window.SEFWorkStation.UI?.closeAllDropdowns) {
            window.SEFWorkStation.UI.closeAllDropdowns();
        }
        
        const State = window.SEFWorkStation.State;
        
        if (action === 'itcd-pesquisar-veiculo-fipe') {
            window.open('https://veiculos.fipe.org.br/#carro', '_blank', 'noopener,noreferrer');
            return; 
        }
        
        if (!isNavigatingBack) {
            setCurrentViewTarget(action, true, data);
        } else {
            State.setCurrentView(action);
        }
    
        const nonDocViews = [ LIXEIRA_GLOBAL_MODULE_NAME, 'configuracoes', 'fazer-backup', 'gerenciar-backups', 'conversor-json-v2', 'ajuda', 'itens-recebidos', 'central-compartilhamento', 'historico-compartilhamento', 'visualizar-detalhes-compartilhamento', 'gerenciar-anexos-central', 'gerir-servidores', 'calendario-servidores', 'gerir-grupos-servidores', 'visualizar-grupo-servidores', 'form-grupo-servidores', 'gerir-destinatarios', 'gerir-grupos-destinatarios', 'escrever-email', 'gerir-emails-criados', 'visualizar-email-gerado', 'visualizar-destinatario', 'visualizar-grupo-destinatarios', 'relatorios', 'exibir-resultados-globais', 'backup-restauracao-itcd' ];
        if (nonDocViews.some(v => action.startsWith(v)) || action.startsWith('gerir-tarefas') || action.startsWith('minhas-tarefas')) {
            State.resetActiveFilters({ keepSearchTerm: (action === 'exibir-resultados-globais') });
            dependencies.updateFilterUI(State.getActiveFilters());
        } else if (action === 'gerir-documentos') {
            State.updateActiveFilter('searchTerm', '');
            dependencies.updateFilterUI(State.getActiveFilters());
        }

        const renderMap = {
            'gerir': () => dependencies.applyFiltersAndRefreshViews('gerir', !isNavigatingBack),
            'modelos': () => dependencies.applyFiltersAndRefreshViews('modelos', !isNavigatingBack),
            'search': () => { 
                dependencies.getModuleRef('documentos').handleMenuAction('gerir-documentos');
            },
            'exibir-resultados-globais': () => {
                if (data && data.searchTerm && data.results) {
                    dependencies.getModuleRef('globalSearch').renderGlobalSearchResultsPage(data.searchTerm, data.results);
                } else {
                    console.error("Navigation.js: 'exibir-resultados-globais' chamado sem dados de resultado.");
                    irParaHome();
                }
            },
            [LIXEIRA_GLOBAL_MODULE_NAME]: () => SEFWorkStation.LixeiraGlobal?.renderLixeiraGlobalPage(),
            'fazer-backup': () => SEFWorkStation.Backup?.renderBackupPage(),
            'gerenciar-backups': () => SEFWorkStation.Backup?.renderGerenciarBackupsPage(),
            'gerenciar-anexos-central': () => dependencies.getModuleRef('anexosCentral')?.renderGerenciarAnexosPage(),
            'salvar-base-dados': () => {
                const dirHandle = State.getDirectoryHandle();
                const dbRef = State.getDbRef();
                if (dirHandle && dbRef?.saveDatabaseToFile) {
                    dbRef.saveDatabaseToFile(dirHandle, window.SEFWorkStation.App.showGlobalFeedback);
                } else {
                    window.SEFWorkStation.App.showGlobalFeedback("Selecione a pasta da aplicação primeiro.", "warning");
                }
            },
            'conversor-json-v2': () => SEFWorkStation.ConversorJson?.renderConversorPage(),
            'configuracoes': () => SEFWorkStation.Configuracoes?.renderConfiguracoesPage(),
            'gerar-relatorios': () => dependencies.getModuleRef('relatorios')?.renderPaginaRelatorios(),
            'ajuda': () => dependencies.getModuleRef('ajuda')?.renderPaginaPrincipalAjuda(data),
            'central-compartilhamento': () => dependencies.getModuleRef('sharingManager')?.renderCentralCompartilhamentoPage(),
            'historico-compartilhamento': () => {
                const sharingManager = dependencies.getModuleRef('sharingManager');
                if (sharingManager && sharingManager.renderHistoricoPage) {
                    sharingManager.renderHistoricoPage();
                } else {
                    console.error("Módulo SharingManager ou função renderHistoricoPage não encontrados.");
                }
            },
            'visualizar-detalhes-compartilhamento': () => {
                if (data && data.shareId) {
                    dependencies.getModuleRef('sharingManager')?.renderDetalhesCompartilhamentoPage(data.shareId);
                } else {
                    console.error("Navigation.js: 'visualizar-detalhes-compartilhamento' chamado sem shareId.");
                    handleMenuAction('central-compartilhamento');
                }
            },
        };
        
        const actionToModuleKeyMap = {
            'novo-documento': 'documentos', 'gerir-documentos': 'documentos', 'visualizar-documento': 'documentos', 'criar-documentos-lote': 'documentos', 'gerenciar-lotes-documentos': 'documentos', 'gerenciar-modelos': 'documentos', 'gerenciar-tipos-documento': 'documentos', 'gerenciar-categorias-documento': 'documentos', 'gerenciar-tags-documento': 'documentos',
            'novo-contribuinte': 'contribuintes', 'gerir-contribuintes': 'contribuintes', 'visualizar-contribuinte': 'contribuintes', 'gerir-categorias-contribuintes': 'contribuintes', 'gerir-tags-contribuintes': 'contribuintes', 'gerir-contribuintes-placeholders': 'contribuintes',
            'novo-recurso': 'recursos', 'gerir-recursos': 'recursos', 'visualizar-recurso': 'recursos',
            'novo-servidor': 'servidores', 'gerir-servidores': 'servidores', 'visualizar-servidor': 'servidores', 'gerir-grupos-servidores': 'servidores', 'visualizar-grupo-servidores': 'servidores', 'form-grupo-servidores': 'servidores', 'novo-grupo-servidores': 'servidores', 'calendario-servidores': 'servidores',
            'cadastrar-protocolo': 'processos', 'gerir-protocolos': 'processos', 'visualizar-protocolo': 'processos',
            'cadastrar-pta': 'processos', 'gerir-ptas': 'processos', 'visualizar-pta': 'processos',
            'cadastrar-autuacao': 'processos', 'gerir-autuacoes': 'processos', 'visualizar-autuacao': 'processos',
            'escrever-email': 'comunicacao', 'gerir-emails-criados': 'comunicacao', 'visualizar-email-gerado': 'comunicacao', 'novo-destinatario': 'comunicacao', 'gerir-destinatarios': 'comunicacao', 'visualizar-destinatario': 'comunicacao', 'novo-grupo-destinatarios': 'comunicacao', 'gerir-grupos-destinatarios': 'comunicacao', 'visualizar-grupo-destinatarios': 'comunicacao', 'form-destinatario': 'comunicacao', 'form-grupo-destinatarios': 'comunicacao',
            'nova-tarefa': 'tarefas', 'gerir-tarefas': 'tarefas', 'visualizar-tarefa': 'tarefas', 'calendario-tarefas': 'tarefas', 'minhas-tarefas': 'tarefas',
            'nova-nota-rapida': 'notasRapidas', 'gerir-notas-rapidas': 'notasRapidas', 'visualizar-nota-rapida': 'notasRapidas', 'editar-nota-rapida': 'notasRapidas',
            'itens-recebidos': 'sharing',
            // ROTAS ITCD
            'itcd-calculo-hub': 'itcd',
            'itcd-calculo-causa-mortis': 'itcd',
            'itcd-gerir-calculos': 'itcd',
            'itcd-visualizar-calculo': 'itcd',
            'itcd-editar-calculo': (data) => {
                const itcdModule = dependencies.getModuleRef('itcd');
                if (data?.calculoData?.tipoCalculo) {
                    itcdModule.handleMenuAction('itcd-editar-calculo', data);
                } else {
                    itcdModule.handleMenuAction('itcd-gerir-calculos');
                }
            },
            'itcd-avaliar-imovel-urbano': 'itcd',
            'itcd-avaliar-imovel-rural': 'itcd',
            'itcd-avaliar-semovente': 'itcd',
            'itcd-avaliar-acoes': 'itcd',
            'itcd-consultar-ufemg': 'itcd',
            'itcd-consultar-selic': 'itcd',
            'itcd-gerir-avaliacoes': 'itcd',
            'itcd-visualizar-avaliacao': 'itcd',
            'itcd-editar-avaliacao': 'itcd',
            'itcd-duplicar-avaliacao': 'itcd',
            'itcd-configuracoes': 'itcd',
            'itcd-calculo-doacao': 'itcd',
            'itcd-calculo-doacoes-sucessivas': 'itcd',
            'itcd-calculo-excedente-meacao': 'itcd',
            'itcd-calculo-instituicao-usufruto': 'itcd',
            'itcd-calculo-extincao-usufruto': 'itcd',
            'backup-restauracao-itcd': 'backup', // Delega para o módulo de backup
            'meu-perfil': () => {
                const userPrefs = State.getUserPreferences();
                if (userPrefs && userPrefs.currentUserServerId) {
                    handleMenuAction('visualizar-servidor', { servidorId: userPrefs.currentUserServerId, originatingView: 'user-menu' });
                } else {
                    window.SEFWorkStation.App.showGlobalFeedback("Usuário atual não definido. Não é possível mostrar o perfil.", "warning");
                }
            },
            'mudar-usuario': () => {
                if (window.SEFWorkStation.Configuracoes) {
                     handleMenuAction('configuracoes');
                     setTimeout(() => {
                        const userSelect = document.getElementById('config-current-user-server');
                        if (userSelect) {
                            userSelect.focus();
                            userSelect.style.outline = '2px solid var(--input-focus-border-dark)';
                            setTimeout(() => { userSelect.style.outline = ''; }, 2000);
                        }
                     }, 200);
                }
            }
        };
        
        let handled = false;
        
        const moduleKeyOrFunc = actionToModuleKeyMap[action];
        if (typeof moduleKeyOrFunc === 'string') {
            const module = dependencies.getModuleRef(moduleKeyOrFunc);
            if (module && typeof module.handleMenuAction === 'function') {
                module.handleMenuAction(action, data);
                handled = true;
            }
        } else if (typeof moduleKeyOrFunc === 'function') {
            moduleKeyOrFunc(data);
            handled = true;
        }

        if (!handled) {
            if (renderMap[action]) {
                renderMap[action]();
            } else {
                console.log(`[DEBUG LOG] NAVIGATION.JS: Nenhuma ação correspondente encontrada para '${action}'. Navegando para home.`);
                irParaHome();
            }
        }
    }

    function irParaHome() {
        dependencies.clearGlobalFeedback();
        const State = window.SEFWorkStation.State;
        State.resetActiveFilters();
        dependencies.updateFilterUI(State.getActiveFilters());
        State.clearNavigationHistory();
        setCurrentViewTarget('welcome', true);
        dependencies.applyFiltersAndRefreshViews('welcome');
    }
    
    function navigateBack() {
        const State = window.SEFWorkStation.State;
        const previousNavState = State.popFromNavigationHistory();
        if (previousNavState) {
            const { view, data: navData, filters } = previousNavState;
    
            const eUmaViewDeNaoDocumento = [
                LIXEIRA_GLOBAL_MODULE_NAME, 'ajuda', 'configuracoes', 'backup', 'gerir-backups', 'conversor-json-v2', 'itens-recebidos', 'central-compartilhamento', 'historico-compartilhamento', 'visualizar-detalhes-compartilhamento', 'gerenciar-anexos-central',
                'gerir-servidores', 'calendario-servidores', 'gerir-grupos-servidores', 'visualizar-grupo-servidores', 'form-grupo-servidores', 'meu-perfil',
                'gerir-destinatarios', 'gerir-grupos-destinatarios', 'escrever-email', 'gerir-emails-criados', 'visualizar-email-gerado',
                'visualizar-destinatario', 'visualizar-grupo-destinatarios', 'relatorios', 'exibir-resultados-globais',
                'backup-restauracao-itcd'
            ].some(v => view.startsWith(v));
    
            if (filters && !eUmaViewDeNaoDocumento) {
                State.setActiveFilters(filters);
            } else if (!eUmaViewDeNaoDocumento) {
                State.resetActiveFilters();
            }
            if (view === 'welcome') {
                State.resetActiveFilters();
            }
            
            dependencies.updateFilterUI(State.getActiveFilters());
            handleMenuAction(view, navData, true);
        } else {
            irParaHome();
        }
    }

    return {
        init,
        handleMenuAction,
        irParaHome,
        navigateBack,
    };

})();