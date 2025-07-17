// js/configuracoes.js
// v18.0.0 - REATORADO PARA WEB: Removida a seção de configuração de Backup Automático, pois a funcionalidade não é mais suportada.
// v17.0.1 - ADICIONADO: Inclusão da store 'ITCD_SELIC_INDICES' na configuração do backup automático.
// v17.0.0 - ADICIONADO: Seção para personalizar os itens do menu de Acesso Rápido.
// ... (histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.Configuracoes = (function() {
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let appModuleRef;
    let dbModuleRef;
    let uiModuleRef;
    let ajudaModuleRef;

    // Lista mestre de todas as ações que podem ser adicionadas ao Acesso Rápido
    const QUICK_ACCESS_OPTIONS = [
        { action: 'novo-documento', label: 'Novo Documento' },
        { action: 'nova-tarefa', label: 'Nova Tarefa' },
        { action: 'novo-contribuinte', label: 'Novo Contribuinte' },
        { action: 'nova-nota-rapida', label: 'Nova Nota Rápida' },
        { action: 'cadastrar-protocolo', label: 'Cadastrar Protocolo' },
        { action: 'cadastrar-pta', label: 'Cadastrar PTA' },
        { action: 'cadastrar-autuacao', label: 'Cadastrar Autuação' },
        { action: 'itcd-calculo-hub', label: 'Cálculo de ITCD' },
        { action: 'escrever-email', label: 'Escrever Novo E-mail' }
    ];

    // Lista padrão de itens no Acesso Rápido
    const DEFAULT_QUICK_ACCESS_ITEMS = [
        'novo-documento', 'nova-tarefa', 'novo-contribuinte', 'nova-nota-rapida', 'cadastrar-protocolo', 'escrever-email'
    ];

    const DEFAULT_THEME_COLORS = {
        light: {
            '--body-bg-light': '#f4f7f9',
            '--text-color-light': '#2d3748',
            '--main-content-bg-light': '#ffffff',
        },
        dark: {
            '--body-bg-dark': '#0f172a',
            '--text-color-dark': '#e2e8f0',
            '--main-content-bg-dark': '#1e293b',
        }
    };

    const DEFAULT_DOCUMENT_COLUMN_VISIBILITY = {
        tipo: true,
        categoriasTags: true,
        modificadoEm: true
    };

    function init(mainWrapper, showFeedbackFunc, clearFeedbackFunc, applicationModuleRef) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedbackFunc;
        globalClearFeedbackRef = clearFeedbackFunc;
        appModuleRef = applicationModuleRef;
        dbModuleRef = SEFWorkStation.DB;
        uiModuleRef = SEFWorkStation.UI;
        ajudaModuleRef = SEFWorkStation.Ajuda;

        if (!mainContentWrapperRef) console.error("Configuracoes.JS: init - mainContentWrapperRef não fornecido.");
        if (!appModuleRef) console.error("Configuracoes.JS: init - appModuleRef (applicationModuleRef) não fornecido.");
        if (!dbModuleRef) console.error("Configuracoes.JS: init - dbModuleRef não disponível.");
        if (!uiModuleRef) console.warn("Configuracoes.JS: init - uiModuleRef não disponível, modais podem não funcionar.");
        if (!ajudaModuleRef) console.warn("Configuracoes.JS: init - ajudaModuleRef não disponível.");
    }

    async function carregarThemeColors() {
        let themeColors = {
            light: { ...DEFAULT_THEME_COLORS.light },
            dark: { ...DEFAULT_THEME_COLORS.dark }
        };
        if (!dbModuleRef || typeof dbModuleRef.getItemById !== 'function') {
            console.error("Configuracoes.JS: Módulo de DB não inicializado ao tentar carregar cores do tema.");
            return themeColors;
        }
        try {
            const storedColorsConfig = await dbModuleRef.getItemById('userPreferencesStore', 'themeColors');
            if (storedColorsConfig && storedColorsConfig.value) {
                const storedColors = storedColorsConfig.value;
                if (storedColors.light) {
                    themeColors.light = { ...themeColors.light, ...storedColors.light };
                }
                if (storedColors.dark) {
                    themeColors.dark = { ...themeColors.dark, ...storedColors.dark };
                }
            }
        } catch (e) {
            console.error("Configuracoes.JS: Erro ao carregar cores do tema do DB:", e);
        }
        return themeColors;
    }

    async function salvarThemeColors(themeColors) {
        if (!dbModuleRef) return;
        try {
            await dbModuleRef.updateItem('userPreferencesStore', { key: 'themeColors', value: themeColors });
            if (SEFWorkStation.Preferences && typeof SEFWorkStation.Preferences.applyCustomThemeColors === 'function') {
                SEFWorkStation.Preferences.applyCustomThemeColors(themeColors);
            }
        } catch (e) {
            console.error("Configuracoes.JS: Erro ao salvar cores do tema no DB:", e);
            if (uiModuleRef && uiModuleRef.showToastNotification) {
                uiModuleRef.showToastNotification("Erro ao salvar cores do tema.", "error");
            }
        }
    }

    async function carregarUserPreferences() {
        let prefs = {
            documentColumnVisibility: { ...DEFAULT_DOCUMENT_COLUMN_VISIBILITY },
            userDefaultEmail: '',
            currentUserServerId: null,
            lastUsedSrfId: null,
            lastUsedUfId: null,
            quickAccessItems: [...DEFAULT_QUICK_ACCESS_ITEMS]
        };
        if (!dbModuleRef || typeof dbModuleRef.getItemById !== 'function') {
            console.error("Configuracoes.JS: Módulo de DB não inicializado ao tentar carregar preferências do usuário.");
            return prefs;
        }
        try {
            const prefsConfig = await dbModuleRef.getItemById('userPreferencesStore', 'general');
            if (prefsConfig && prefsConfig.value) {
                const storedPrefs = prefsConfig.value;
                if (storedPrefs.hasOwnProperty('documentColumnVisibility')) {
                    prefs.documentColumnVisibility = { ...DEFAULT_DOCUMENT_COLUMN_VISIBILITY, ...storedPrefs.documentColumnVisibility };
                }
                if (storedPrefs.hasOwnProperty('userDefaultEmail')) {
                    prefs.userDefaultEmail = typeof storedPrefs.userDefaultEmail === 'string' ? storedPrefs.userDefaultEmail : '';
                }
                if (storedPrefs.hasOwnProperty('currentUserServerId')) {
                    prefs.currentUserServerId = storedPrefs.currentUserServerId;
                }
                if (storedPrefs.hasOwnProperty('lastUsedSrfId')) {
                    prefs.lastUsedSrfId = storedPrefs.lastUsedSrfId;
                }
                 if (storedPrefs.hasOwnProperty('lastUsedUfId')) {
                    prefs.lastUsedUfId = storedPrefs.lastUsedUfId;
                }
                if (storedPrefs.hasOwnProperty('quickAccessItems') && Array.isArray(storedPrefs.quickAccessItems)) {
                    prefs.quickAccessItems = storedPrefs.quickAccessItems;
                }
            }
        } catch (e) {
            console.error("Configuracoes.JS: Erro ao carregar USER preferences do DB:", e);
        }
        return prefs;
    }

    async function salvarUserPreferences(prefsToSave) {
        if (!dbModuleRef) return;
        try {
            const currentOverallPrefs = await carregarUserPreferences();
            let combinedPrefs = { ...currentOverallPrefs, ...prefsToSave };
            await dbModuleRef.updateItem('userPreferencesStore', { key: 'general', value: combinedPrefs });
            console.log("Configuracoes.JS: UserPreferences salvas no IndexedDB:", JSON.stringify(combinedPrefs));
        } catch (e) {
            console.error("Configuracoes.JS: Erro ao salvar USER preferences no DB:", e);
            if (uiModuleRef && uiModuleRef.showToastNotification) {
                uiModuleRef.showToastNotification("Erro ao salvar preferências gerais.", "error");
            }
        }
    }
    
    async function renderConfiguracoesPage() {
        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (!mainContentWrapperRef) {
            console.error("Configuracoes.JS: renderConfiguracoesPage - mainContentWrapperRef não definido.");
            if (uiModuleRef && uiModuleRef.showToastNotification) uiModuleRef.showToastNotification("Erro crítico ao renderizar página de configurações.", "error");
            return;
        }

        const userPrefs = await carregarUserPreferences();
        const themeColors = await carregarThemeColors();
        const appVersion = (appModuleRef && appModuleRef.APP_VERSION_DISPLAY) ? appModuleRef.APP_VERSION_DISPLAY : "Não disponível";
        
        let servidoresOptionsHtml = '<option value="">-- Selecione seu usuário --</option>';
        try {
            const servidores = await dbModuleRef.getAllItems(dbModuleRef.STORES.SERVIDORES);
            const servidoresAtivos = servidores.filter(s => !s.isDeleted && s.status === 'Ativo');
            servidoresAtivos.sort((a,b) => (a.nome || '').localeCompare(b.nome || ''));
            servidoresAtivos.forEach(s => {
                servidoresOptionsHtml += `<option value="${s.id}" ${userPrefs.currentUserServerId === s.id ? 'selected' : ''}>${s.nome} (${s.matricula || 'N/A'})</option>`;
            });
        } catch (e) {
            console.error("Configuracoes.JS: Erro ao carregar servidores para dropdown de usuário.", e);
            servidoresOptionsHtml = '<option value="">Erro ao carregar servidores</option>';
        }

        const quickAccessCheckboxesHtml = QUICK_ACCESS_OPTIONS.map(opt => `
            <label class="inline-flex items-center">
                <input type="checkbox" name="quickAccessItems" value="${opt.action}" class="form-checkbox quick-access-checkbox rounded text-blue-600" 
                       ${userPrefs.quickAccessItems.includes(opt.action) ? 'checked' : ''}>
                <span class="ml-2 text-sm">${opt.label}</span>
            </label>
        `).join('');
        
        const pageHtml = ` 
            <div class="page-section max-w-none px-4 sm:px-6 lg:px-8" id="configuracoes-container">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-semibold">Configurações</h2>
                     <button type="button" id="ajuda-configuracoes" class="p-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-300" title="Ajuda sobre Configurações">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-question-circle-fill" viewBox="0 0 16 16">
                            <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.496 6.033h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286a.237.237 0 0 0 .241.247zm2.325 6.443c.61 0 1.029-.394 1.029-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94 0 .533.425.927 1.01.927z"/>
                        </svg>
                    </button>
                </div>
                <div id="feedback-config-geral" class="mb-4"></div>

                <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    
                    <!-- Coluna 1 -->
                    <div class="flex flex-col gap-6">
                        <div class="section-box p-4 border dark:border-slate-700 rounded-lg" id="identidade-compartilhamento-section">
                            <h3>Identidade e Compartilhamento</h3>
                            <div class="mb-4">
                                <label for="config-current-user-server" class="block text-sm font-medium">Usuário Atual da Aplicação:</label>
                                <select id="config-current-user-server" class="form-input-text mt-1 block w-full text-sm">
                                    ${servidoresOptionsHtml}
                                </select>
                                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Define quem você é no sistema para compartilhamento e rastreabilidade.</p>
                            </div>
                        </div>

                        <div class="section-box p-4 border dark:border-slate-700 rounded-lg" id="acesso-rapido-section">
                            <h3>Menu de Acesso Rápido</h3>
                            <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">Selecione os atalhos que aparecerão no botão <code class="text-xs p-1 bg-gray-200 dark:bg-slate-600 rounded">+</code> no cabeçalho.</p>
                            <div class="form-checkbox-group max-h-48 overflow-y-auto p-2 border dark:border-slate-600 rounded">
                                ${quickAccessCheckboxesHtml}
                            </div>
                        </div>

                         <div class="section-box p-4 border dark:border-slate-700 rounded-lg" id="privacidade-dados-section">
                            <h3>Privacidade e Dados</h3>
                            <button type="button" id="btn-limpar-dados-app" class="btn-delete text-sm py-2 px-4">Limpar Todos os Dados</button>
                            <p class="text-xs text-red-500 dark:text-red-400 mt-1">
                                <strong>Atenção:</strong> Ação irreversível. Apaga todos os dados do navegador.
                            </p>
                        </div>
                    </div>

                    <!-- Coluna 2 -->
                    <div class="flex flex-col gap-6">
                        <div class="section-box p-4 border dark:border-slate-700 rounded-lg" id="info-app-section">
                            <h3>Informações e Suporte</h3>
                            <p class="text-sm text-gray-600 dark:text-gray-300"><strong>Versão Atual:</strong> ${appVersion}</p>
                            <p class="mt-1"><a href="#" id="link-changelog-config" class="link">Ver Histórico de Versões</a></p>
                            <p class="mt-1"><a href="#" id="link-manual-usuario-config" class="link">Manual do Usuário / Ajuda</a></p>
                            <div class="mt-3 pt-3 border-t dark:border-slate-600">
                                <h4 class="text-md font-semibold mb-2">Comunidade</h4>
                                <p class="text-sm text-gray-600 dark:text-gray-300 mb-2">Participe do nosso Grupo de E-mail.</p>
                                <a href="https://outlook.office365.com/owa/sefworkstation@sefazmg.onmicrosoft.com/groupsubscription.ashx?action=join&source=LokiServer&guid=13d4f542-6c6f-4830-bd60-0e810f3f2787" target="_blank" rel="noopener noreferrer" class="link">
                                    Clique aqui para solicitar participação
                                </a>
                            </div>
                        </div>

                        <div class="section-box p-4 border dark:border-slate-700 rounded-lg" id="preferencias-usuario-section">
                            <h3>Preferências do Usuário</h3>
                            <div class="mb-4">
                                <label for="user-default-email" class="block text-sm font-medium">Email Padrão (para envio):</label>
                                <input type="email" id="user-default-email" value="${userPrefs.userDefaultEmail || ''}" class="form-input-text mt-1 block w-full text-sm" placeholder="seu.email@exemplo.com">
                                <p id="feedback-user-default-email" class="text-xs mt-1"></p>
                            </div>
                        </div>

                        <div id="preferencias-listagem-section-placeholder"></div>
                    </div>
                </div> <!-- Fim do Grid Principal -->

                <div class="mt-8 flex justify-end">
                    <button type="button" id="btn-salvar-todas-preferencias" class="btn-primary text-lg py-2 px-6">Salvar Todas as Preferências</button>
                </div>
            </div>
        `;

        mainContentWrapperRef.innerHTML = pageHtml;
        
        const preferenciasListagemPlaceholder = document.getElementById('preferencias-listagem-section-placeholder');
        if(preferenciasListagemPlaceholder){
            preferenciasListagemPlaceholder.innerHTML = renderSecaoPreferenciasListagemHTML(userPrefs);
        }
        
        const configContainer = document.getElementById('configuracoes-container');
        if (configContainer) {
            const gridContainer = configContainer.querySelector('.grid');
            if(gridContainer) {
                const colorsSection = document.createElement('div');
                colorsSection.className = 'lg:col-span-2 xl:col-span-3'; 
                colorsSection.innerHTML = renderSecaoPersonalizarCoresHTML(themeColors);
                gridContainer.appendChild(colorsSection);
                addEventListenersPersonalizacaoCores(colorsSection);
            }
        }

        addEventListenersConfiguracoesGerais(userPrefs);
    }

    function renderSecaoPersonalizarCoresHTML(themeColors) {
        const feedbackAreaId = 'feedback-theme-colors';
        let colorsHtml = `
            <div class="section-box p-4 border dark:border-slate-700 rounded-lg mt-6">
                <h3>Personalizar Cores do Tema</h3>
                <div id="${feedbackAreaId}" class="mb-4 text-sm"></div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Escolha as cores para os temas claro e escuro. As alterações são aplicadas ao salvar as preferências.
                </p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        `;
        colorsHtml += `
            <div>
                <h4 class="text-md font-semibold mb-2">Tema Claro</h4>
                <div class="space-y-3">
                    <div>
                        <label for="color-body-bg-light" class="block text-xs font-medium text-gray-600 dark:text-gray-400">Fundo Principal:</label>
                        <input type="color" id="color-body-bg-light" data-theme="light" data-var="--body-bg-light" value="${themeColors.light['--body-bg-light']}" class="h-8 w-16 p-0 border-gray-300 rounded shadow-sm color-input">
                    </div>
                    <div>
                        <label for="color-text-color-light" class="block text-xs font-medium text-gray-600 dark:text-gray-400">Texto Principal:</label>
                        <input type="color" id="color-text-color-light" data-theme="light" data-var="--text-color-light" value="${themeColors.light['--text-color-light']}" class="h-8 w-16 p-0 border-gray-300 rounded shadow-sm color-input">
                    </div>
                    <div>
                        <label for="color-main-content-bg-light" class="block text-xs font-medium text-gray-600 dark:text-gray-400">Fundo do Conteúdo:</label>
                        <input type="color" id="color-main-content-bg-light" data-theme="light" data-var="--main-content-bg-light" value="${themeColors.light['--main-content-bg-light']}" class="h-8 w-16 p-0 border-gray-300 rounded shadow-sm color-input">
                    </div>
                    <button type="button" data-theme-target="light" class="btn-restaurar-cores-padrao btn-secondary btn-sm text-xs mt-2">Restaurar Padrões (Claro)</button>
                </div>
            </div>
        `;
        colorsHtml += `
            <div>
                <h4 class="text-md font-semibold mb-2">Tema Escuro</h4>
                <div class="space-y-3">
                    <div>
                        <label for="color-body-bg-dark" class="block text-xs font-medium text-gray-600 dark:text-gray-400">Fundo Principal:</label>
                        <input type="color" id="color-body-bg-dark" data-theme="dark" data-var="--body-bg-dark" value="${themeColors.dark['--body-bg-dark']}" class="h-8 w-16 p-0 border-gray-300 rounded shadow-sm color-input">
                    </div>
                    <div>
                        <label for="color-text-color-dark" class="block text-xs font-medium text-gray-600 dark:text-gray-400">Texto Principal:</label>
                        <input type="color" id="color-text-color-dark" data-theme="dark" data-var="--text-color-dark" value="${themeColors.dark['--text-color-dark']}" class="h-8 w-16 p-0 border-gray-300 rounded shadow-sm color-input">
                    </div>
                    <div>
                        <label for="color-main-content-bg-dark" class="block text-xs font-medium text-gray-600 dark:text-gray-400">Fundo do Conteúdo:</label>
                        <input type="color" id="color-main-content-bg-dark" data-theme="dark" data-var="--main-content-bg-dark" value="${themeColors.dark['--main-content-bg-dark']}" class="h-8 w-16 p-0 border-gray-300 rounded shadow-sm color-input">
                    </div>
                    <button type="button" data-theme-target="dark" class="btn-restaurar-cores-padrao btn-secondary btn-sm text-xs mt-2">Restaurar Padrões (Escuro)</button>
                </div>
            </div>
        `;
        colorsHtml += `</div></div>`;
        return colorsHtml;
    }

    function renderSecaoPreferenciasListagemHTML(userPrefs) {
        const docColVisibility = userPrefs.documentColumnVisibility || { ...DEFAULT_DOCUMENT_COLUMN_VISIBILITY };
        let listagemHtml = `
            <div class="section-box p-4 border dark:border-slate-700 rounded-lg">
                <h3>Preferências de Listagem</h3>
                <div class="mb-4">
                    <h4 class="text-md font-semibold mb-2">Colunas Visíveis na Lista de Documentos:</h4>
                    <div class="form-checkbox-group">
                        <label class="checkbox-label inline-flex items-center">
                            <input type="checkbox" id="col-doc-tipo" data-col-key="tipo" class="form-checkbox doc-col-visibility" ${docColVisibility.tipo ? 'checked' : ''}>
                            <span class="ml-2 text-sm">Tipo</span>
                        </label>
                        <label class="checkbox-label inline-flex items-center">
                            <input type="checkbox" id="col-doc-cat-tags" data-col-key="categoriasTags" class="form-checkbox doc-col-visibility" ${docColVisibility.categoriasTags ? 'checked' : ''}>
                            <span class="ml-2 text-sm">Categorias/Tags</span>
                        </label>
                        <label class="checkbox-label inline-flex items-center">
                            <input type="checkbox" id="col-doc-modificado" data-col-key="modificadoEm" class="form-checkbox doc-col-visibility" ${docColVisibility.modificadoEm ? 'checked' : ''}>
                            <span class="ml-2 text-sm">Modificado em</span>
                        </label>
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">As colunas "Título" e "Ações" são sempre visíveis.</p>
                </div>
            </div>
        `;
        return listagemHtml;
    }
    
    async function addEventListenersPersonalizacaoCores(container) {
        if (!container) return;
        container.querySelectorAll('.btn-restaurar-cores-padrao').forEach(button => {
            button.addEventListener('click', async (e) => {
                const themeToRestore = e.target.dataset.themeTarget;
                const currentThemeColors = await carregarThemeColors();
                currentThemeColors[themeToRestore] = { ...DEFAULT_THEME_COLORS[themeToRestore] };
                await salvarThemeColors(currentThemeColors);
                const themeSection = e.target.closest('div').parentElement;
                if (themeSection) {
                    if (themeToRestore === 'light') {
                        themeSection.querySelector('#color-body-bg-light').value = DEFAULT_THEME_COLORS.light['--body-bg-light'];
                        themeSection.querySelector('#color-text-color-light').value = DEFAULT_THEME_COLORS.light['--text-color-light'];
                        themeSection.querySelector('#color-main-content-bg-light').value = DEFAULT_THEME_COLORS.light['--main-content-bg-light'];
                    } else {
                        themeSection.querySelector('#color-body-bg-dark').value = DEFAULT_THEME_COLORS.dark['--body-bg-dark'];
                        themeSection.querySelector('#color-text-color-dark').value = DEFAULT_THEME_COLORS.dark['--text-color-dark'];
                        themeSection.querySelector('#color-main-content-bg-dark').value = DEFAULT_THEME_COLORS.dark['--main-content-bg-dark'];
                    }
                }
                if (uiModuleRef && uiModuleRef.showToastNotification) {
                    uiModuleRef.showToastNotification(`Cores padrão do tema ${themeToRestore === 'light' ? 'claro' : 'escuro'} carregadas. Salve as preferências para aplicar.`, "success");
                }
            });
        });
    }


    function addEventListenersConfiguracoesGerais(userPrefs) {
        const linkChangelog = document.getElementById('link-changelog-config');
        if (linkChangelog && ajudaModuleRef && ajudaModuleRef.mostrarTopicoDeAjuda) {
            linkChangelog.addEventListener('click', (e) => {
                e.preventDefault();
                if (window.SEFWorkStation.AjudaConteudo && window.SEFWorkStation.AjudaConteudo.notasVersao) {
                     ajudaModuleRef.mostrarTopicoDeAjuda('notas-versao-principal', null);
                } else {
                    console.warn("Configuracoes.JS: Conteúdo das notas de versão não disponível para linkagem.")
                    ajudaModuleRef.mostrarTopicoDeAjuda('notas-versao');
                }
            });
        }

        const linkManualUsuario = document.getElementById('link-manual-usuario-config');
        if (linkManualUsuario && appModuleRef && appModuleRef.handleMenuAction) {
            linkManualUsuario.addEventListener('click', (e) => {
                e.preventDefault();
                appModuleRef.handleMenuAction('ajuda'); 
            });
        }
        
        const btnAjudaConfig = document.getElementById('ajuda-configuracoes');
        if(btnAjudaConfig && ajudaModuleRef && ajudaModuleRef.mostrarTopicoDeAjuda) {
            btnAjudaConfig.addEventListener('click', (e) => {
                e.preventDefault();
                ajudaModuleRef.mostrarTopicoDeAjuda('manual-modulo-configuracoes');
            });
        }

        const btnSalvarTodasPrefs = document.getElementById('btn-salvar-todas-preferencias');
        if (btnSalvarTodasPrefs) {
            btnSalvarTodasPrefs.addEventListener('click', async () => {
                const feedbackGeralConfig = document.getElementById('feedback-config-geral');
                const feedbackUserDefaultEmailEl = document.getElementById('feedback-user-default-email');

                if(globalClearFeedbackRef && feedbackGeralConfig) globalClearFeedbackRef(feedbackGeralConfig);
                if(feedbackUserDefaultEmailEl) {
                    feedbackUserDefaultEmailEl.textContent = '';
                    feedbackUserDefaultEmailEl.className = 'text-xs mt-1';
                }

                const userDefaultEmailInput = document.getElementById('user-default-email'); 
                const currentUserServerSelect = document.getElementById('config-current-user-server');
                const quickAccessItemsSelecionados = Array.from(document.querySelectorAll('input[name="quickAccessItems"]:checked')).map(cb => cb.value);

                const docColVisibilityPrefs = {};
                const prefsListagemContainer = document.getElementById('preferencias-listagem-section-placeholder');
                if (prefsListagemContainer) {
                    prefsListagemContainer.querySelectorAll('.doc-col-visibility').forEach(cb => {
                        docColVisibilityPrefs[cb.dataset.colKey] = cb.checked;
                    });
                }
                
                let allValidationsPass = true;
                let successMessages = [];
                let warningMessages = [];
                
                const emailValor = userDefaultEmailInput.value.trim();
                let existingEmailFeedback = feedbackUserDefaultEmailEl;
                if (existingEmailFeedback) existingEmailFeedback.textContent = ''; 

                if (emailValor && !/.+@.+\..+/.test(emailValor)) { 
                    const errorMsgEmail = "Formato de email padrão inválido.";
                    if (feedbackUserDefaultEmailEl) {
                        feedbackUserDefaultEmailEl.textContent = errorMsgEmail;
                        feedbackUserDefaultEmailEl.className = 'text-xs mt-1 text-red-500 dark:text-red-400 feedback-text-validation';
                    }
                    userDefaultEmailInput.classList.add('border-red-500', 'dark:border-red-400');
                    userDefaultEmailInput.focus();
                    warningMessages.push("Preferência de email não salva (inválida).");
                    allValidationsPass = false; 
                } else {
                    userDefaultEmailInput.classList.remove('border-red-500', 'dark:border-red-400');
                    if(feedbackUserDefaultEmailEl) feedbackUserDefaultEmailEl.textContent = '';
                }

                if (allValidationsPass) {
                    const prefsParaSalvar = {
                        documentColumnVisibility: docColVisibilityPrefs,
                        currentUserServerId: currentUserServerSelect.value || null,
                        quickAccessItems: quickAccessItemsSelecionados
                    };
                    if (!emailValor || /.+@.+\..+/.test(emailValor)) {
                         prefsParaSalvar.userDefaultEmail = emailValor;
                    }
                    
                    await salvarUserPreferences(prefsParaSalvar);
                    successMessages.push("Preferências gerais e de usuário salvas.");
                    
                    if (window.SEFWorkStation.State && typeof window.SEFWorkStation.State.setUserPreferences === 'function') {
                        window.SEFWorkStation.State.setUserPreferences(await carregarUserPreferences());
                    }

                    if (window.SEFWorkStation.App && typeof window.SEFWorkStation.App.populateQuickAccessDropdown === 'function') {
                        await window.SEFWorkStation.App.populateQuickAccessDropdown();
                    }

                    if (window.SEFWorkStation.App && typeof window.SEFWorkStation.App.checkUserIdentity === 'function') {
                        await window.SEFWorkStation.App.checkUserIdentity();
                    }


                    const themeColorsToSave = { light: {}, dark: {} };
                    const coresContainer = document.querySelector('#configuracoes-container .lg\\:col-span-2.xl\\:col-span-3'); 
                    if (coresContainer) {
                        coresContainer.querySelectorAll('input[type="color"].color-input').forEach(input => {
                            const theme = input.dataset.theme;
                            const cssVar = input.dataset.var;
                            if (theme && cssVar) {
                                themeColorsToSave[theme][cssVar] = input.value;
                            }
                        });
                    }
                    await salvarThemeColors(themeColorsToSave);
                    successMessages.push("Cores do tema salvas.");
                }
                
                let finalToastMessage = "";
                let finalToastType = "info";

                if (successMessages.length > 0 && warningMessages.length === 0) {
                    finalToastMessage = "Todas as preferências foram salvas com sucesso!";
                    finalToastType = "success";
                } else if (successMessages.length > 0 && warningMessages.length > 0) {
                    finalToastMessage = successMessages.join(" ") + " " + warningMessages.join(" ");
                    finalToastType = "warning";
                } else if (successMessages.length === 0 && warningMessages.length > 0) {
                    finalToastMessage = warningMessages.join(" ");
                    finalToastType = "error"; 
                } else { 
                    finalToastMessage = "Nenhuma alteração detectada ou erro inesperado.";
                    finalToastType = "info";
                }
                
                if (uiModuleRef && uiModuleRef.showToastNotification) {
                     uiModuleRef.showToastNotification(finalToastMessage, finalToastType, (finalToastType === 'success' || finalToastType === 'info' ? 4000 : 0) );
                }
                if (globalShowFeedbackRef && feedbackGeralConfig) {
                    globalShowFeedbackRef(finalToastMessage, finalToastType, feedbackGeralConfig, (finalToastType === 'success' || finalToastType === 'info' ? 4000 : 0));
                }

                if (window.SEFWorkStation && window.SEFWorkStation.App && typeof window.SEFWorkStation.App.refreshApplicationState === 'function') {
                    window.SEFWorkStation.App.refreshApplicationState();
                }
            });
        }
        
        const btnLimparDadosApp = document.getElementById('btn-limpar-dados-app');
        const feedbackGeralArea = document.getElementById('feedback-config-geral');
        if (btnLimparDadosApp) {
            btnLimparDadosApp.addEventListener('click', async () => {
                if (!uiModuleRef || typeof uiModuleRef.showModal !== 'function') {
                    if (confirm("ATENÇÃO: Tem certeza que deseja apagar TODOS os dados da aplicação? Esta ação é IRREVERSÍVEL.")) {
                        await executarLimpezaDeDados(feedbackGeralArea);
                    }
                    return;
                }
                uiModuleRef.showModal(
                    'Confirmar Limpeza Total de Dados',
                    `<p class="text-base">Tem certeza absoluta que deseja apagar <strong>TODOS OS DADOS</strong> da aplicação (documentos, contribuintes, tarefas, notas, etc.)?</p>
                     <p class="text-red-600 dark:text-red-400 mt-3 font-semibold">ESTA AÇÃO É IRREVERSÍVEL E NÃO PODERÁ SER DESFEITA.</p>
                     <p class="text-sm text-gray-600 dark:text-gray-300 mt-2">Recomenda-se fazer um backup completo antes de prosseguir.</p>`,
                    [
                        { text: 'Cancelar', class: 'btn-secondary', callback: () => { return true; } },
                        {
                            text: 'Sim, Apagar Todos os Dados',
                            class: 'btn-delete',
                            callback: async () => {
                                await executarLimpezaDeDados(feedbackGeralArea);
                                return true;
                            }
                        }
                    ],
                    'max-w-lg'
                );
            });
        }
    }


    async function executarLimpezaDeDados(feedbackArea) {
        if (uiModuleRef && uiModuleRef.showToastNotification) uiModuleRef.showToastNotification("Limpando dados da aplicação...", "info");
        try {
            if (!dbModuleRef || typeof dbModuleRef.clearAllStores !== 'function') {
                 throw new Error("Funcionalidade de limpeza de banco de dados não está disponível.");
            }
            await dbModuleRef.clearAllStores();

            localStorage.clear();
            
            if (uiModuleRef && uiModuleRef.showToastNotification) uiModuleRef.showToastNotification("Dados da aplicação limpos. A página será recarregada.", "success", 7000);

            setTimeout(() => {
                window.location.reload();
            }, 3000);

        } catch (error) {
            console.error("Configuracoes.JS: Erro ao limpar dados da aplicação:", error);
            if (uiModuleRef && uiModuleRef.showToastNotification) uiModuleRef.showToastNotification(`Erro ao limpar dados: ${error.message}`, "error", 0);
        }
    }
    
    const publicAPI = {
        init,
        renderConfiguracoesPage,
        carregarUserPreferences, 
        salvarUserPreferences,
        carregarThemeColors,     
        DEFAULT_THEME_COLORS,    
        DEFAULT_DOCUMENT_COLUMN_VISIBILITY 
    };

    if (window.SEFWorkStation && !window.SEFWorkStation.Configuracoes) {
        window.SEFWorkStation.Configuracoes = {}; 
    }
    if (window.SEFWorkStation && window.SEFWorkStation.Configuracoes) {
         window.SEFWorkStation.Configuracoes.DEFAULT_THEME_COLORS = DEFAULT_THEME_COLORS;
         window.SEFWorkStation.Configuracoes.DEFAULT_DOCUMENT_COLUMN_VISIBILITY = DEFAULT_DOCUMENT_COLUMN_VISIBILITY;
    }

    return publicAPI;
})();
