// js/configuracoes.js
// v17.0.1 - ADICIONADO: Inclusão da store 'ITCD_SELIC_INDICES' na configuração do backup automático.
// v17.0.0 - ADICIONADO: Seção para personalizar os itens do menu de Acesso Rápido.
// v16.0.0 - ADICIONADO: Seção 'Identidade' para permitir a seleção do servidor que será o usuário atual da aplicação. Esta seleção é salva como preferência e usada globalmente.
// v15.1.0 - CORRIGIDO: Adiciona verificações de segurança para garantir que o dbModuleRef esteja inicializado antes de ser usado, prevenindo o erro 'Cannot read properties of undefined'.
// v15.0.0 - REFATORADO: As preferências do usuário e temas agora são lidas e salvas no IndexedDB ('userPreferencesStore') em vez do localStorage, para permitir o backup completo.
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

    const DEFAULT_MAX_AUTO_BACKUPS = 5;
    const DEFAULT_AUTO_BACKUP_INTERVAL = 3600000; // 1 hora em ms
    const DEFAULT_AUTO_BACKUP_INCLUDE_ATTACHMENTS = true;
    
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

    const EXPORTABLE_STORES_CONFIG = [
        { value: 'DOCUMENTS', label: 'Documentos (metadados)' },
        { value: 'CONTRIBUINTES', label: 'Contribuintes (metadados)' },
        { value: 'RECURSOS', label: 'Recursos (metadados)' },
        { value: 'TAREFAS', label: 'Tarefas (metadados)' },
        { value: 'NOTAS_RAPIDAS', label: 'Notas Rápidas' },
        { value: 'LOTES_DE_DOCUMENTOS', label: 'Registros de Lotes de Documentos' },
        { value: 'PROTOCOLOS', label: 'Protocolos (metadados)' },
        { value: 'PTAS', label: 'PTAs (metadados)' },
        { value: 'AUTUACOES', label: 'Autuações (metadados)' },
        { value: 'SERVIDORES', label: 'Servidores (metadados)' },
        { value: 'SERVIDORES_GRUPOS', label: 'Grupos de Servidores' },
        { value: 'ITCD_AVALIACOES', label: 'Avaliações de ITCD (dados)' },
        { value: 'ITCD_CALCULOS', label: 'Cálculos de ITCD (dados)' },
        { value: 'ITCD_SEMOVENTES_PAUTAS', label: 'Pautas de Valores de Semoventes (ITCD)' },
        { value: 'ITCD_SELIC_INDICES', label: 'Índices da Taxa SELIC (ITCD)' },
        { value: 'DOCUMENT_TYPES', label: 'Tipos de Documento (Configuração)' },
        { value: 'DOCUMENT_CATEGORIES', label: 'Categorias de Documento (Configuração)' },
        { value: 'DOCUMENT_TAGS', label: 'Tags de Documento (Configuração)' },
        { value: 'CONTRIBUINTE_CATEGORIES', label: 'Categorias de Contribuinte (Configuração)' },
        { value: 'CONTRIBUINTE_TAGS', label: 'Tags de Contribuinte (Configuração)' },
        { value: 'CONTRIBUINTES_PLACEHOLDERS', label: 'Placeholders de Contribuinte (Configuração)' },
        { value: 'NOTAS_RAPIDAS_TAGS', label: 'Tags de Notas Rápidas (Configuração)' },
        { value: 'PROTOCOL_TYPES', label: 'Tipos de Protocolo (Configuração)' },
        { value: 'PTA_TYPES', label: 'Tipos de PTA (Configuração)' },
        { value: 'AUTUACAO_TYPES', label: 'Tipos de Autuação (Configuração)' },
        { value: 'COMUNICACAO_DESTINATARIOS', label: 'Destinatários de E-mail (Comunicação)' },
        { value: 'COMUNICACAO_GRUPOS', label: 'Grupos de Destinatários (Comunicação)' },
        { value: 'COMUNICACAO_EMAILS_GERADOS', label: 'Registros de E-mails Gerados (Comunicação)'},
        { value: 'ITCD_CONFIGURACOES', label: 'Configurações de Avaliação ITCD' }
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
            maxAutoBackups: DEFAULT_MAX_AUTO_BACKUPS,
            documentColumnVisibility: { ...DEFAULT_DOCUMENT_COLUMN_VISIBILITY },
            userDefaultEmail: '',
            autoBackupInterval: DEFAULT_AUTO_BACKUP_INTERVAL,
            autoBackupStores: EXPORTABLE_STORES_CONFIG.map(s => s.value),
            autoBackupIncludeAttachments: DEFAULT_AUTO_BACKUP_INCLUDE_ATTACHMENTS,
            currentUserServerId: null,
            lastUsedSrfId: null,
            lastUsedUfId: null,
            quickAccessItems: [...DEFAULT_QUICK_ACCESS_ITEMS] // Adicionado valor padrão
        };
        if (!dbModuleRef || typeof dbModuleRef.getItemById !== 'function') {
            console.error("Configuracoes.JS: Módulo de DB não inicializado ao tentar carregar preferências do usuário.");
            return prefs;
        }
        try {
            const prefsConfig = await dbModuleRef.getItemById('userPreferencesStore', 'general');
            if (prefsConfig && prefsConfig.value) {
                const storedPrefs = prefsConfig.value;
                if (storedPrefs.hasOwnProperty('maxAutoBackups')) {
                    let numBackups = parseInt(storedPrefs.maxAutoBackups, 10);
                    prefs.maxAutoBackups = (isNaN(numBackups) || numBackups < 0) ? DEFAULT_MAX_AUTO_BACKUPS : numBackups;
                }
                if (storedPrefs.hasOwnProperty('documentColumnVisibility')) {
                    prefs.documentColumnVisibility = { ...DEFAULT_DOCUMENT_COLUMN_VISIBILITY, ...storedPrefs.documentColumnVisibility };
                }
                if (storedPrefs.hasOwnProperty('userDefaultEmail')) {
                    prefs.userDefaultEmail = typeof storedPrefs.userDefaultEmail === 'string' ? storedPrefs.userDefaultEmail : '';
                }
                if (storedPrefs.hasOwnProperty('autoBackupInterval')) {
                    const interval = parseInt(storedPrefs.autoBackupInterval, 10);
                    prefs.autoBackupInterval = (typeof interval === 'number' && !isNaN(interval)) ? interval : DEFAULT_AUTO_BACKUP_INTERVAL;
                }
                if (storedPrefs.hasOwnProperty('autoBackupStores') && Array.isArray(storedPrefs.autoBackupStores)) {
                    prefs.autoBackupStores = storedPrefs.autoBackupStores;
                } else {
                    prefs.autoBackupStores = EXPORTABLE_STORES_CONFIG.map(s => s.value);
                }
                if (storedPrefs.hasOwnProperty('autoBackupIncludeAttachments')) {
                    prefs.autoBackupIncludeAttachments = typeof storedPrefs.autoBackupIncludeAttachments === 'boolean' ? storedPrefs.autoBackupIncludeAttachments : DEFAULT_AUTO_BACKUP_INCLUDE_ATTACHMENTS;
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
                // Adicionado: Carregar preferências de acesso rápido
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

        let storesCheckboxesHtml = '';
        EXPORTABLE_STORES_CONFIG.forEach(storeInfo => {
            const isChecked = userPrefs.autoBackupStores.includes(storeInfo.value);
            storesCheckboxesHtml += `
                <label class="checkbox-label inline-flex items-center w-full sm:w-1/2 md:w-full lg:w-1/2">
                    <input type="checkbox" name="autoBackupStores" value="${storeInfo.value}" class="form-checkbox auto-backup-store-checkbox rounded text-blue-600" ${isChecked ? 'checked' : ''}>
                    <span class="ml-2 text-sm">${storeInfo.label}</span>
                </label>
            `;
        });

        // NOVO: HTML para os checkboxes do Acesso Rápido
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
                            <div class="mb-2">
                                <label class="block text-sm font-medium">Pasta Compartilhada (OneDrive):</label>
                                <div class="mt-1 flex items-center gap-2">
                                    <input type="text" id="config-shared-folder-name" class="form-input-text bg-gray-100 dark:bg-slate-700 flex-grow text-sm" readonly placeholder="Nenhuma pasta selecionada">
                                    <button type="button" id="btn-config-select-shared-folder" class="btn-secondary btn-sm text-xs">Selecionar</button>
                                </div>
                                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Selecione sua pasta 'SEFWorkStation_Compartilhado' sincronizada.</p>
                            </div>
                        </div>

                        <!-- NOVO: Seção de Acesso Rápido -->
                        <div class="section-box p-4 border dark:border-slate-700 rounded-lg" id="acesso-rapido-section">
                            <h3>Menu de Acesso Rápido</h3>
                            <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">Selecione os atalhos que aparecerão no botão <code class="text-xs p-1 bg-gray-200 dark:bg-slate-600 rounded">+</code> no cabeçalho.</p>
                            <div class="form-checkbox-group max-h-48 overflow-y-auto p-2 border dark:border-slate-600 rounded">
                                ${quickAccessCheckboxesHtml}
                            </div>
                        </div>

                        <div class="section-box p-4 border dark:border-slate-700 rounded-lg" id="gerenciamento-backups-section">
                            <h3>Backup Automático</h3>
                            <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">Backup e restauração manual estão em "Utilidades".</p>
                            <div class="mb-4">
                                <label for="max-auto-backups" class="block text-sm font-medium">Máx. de Backups Automáticos:</label>
                                <input type="number" id="max-auto-backups" value="${userPrefs.maxAutoBackups}" min="0" max="100" class="form-input-text mt-1 block w-full sm:w-1/2 text-sm">
                                <p id="feedback-max-auto-backups" class="text-xs mt-1"></p> 
                            </div>
                            <div class="mb-4">
                                <label for="auto-backup-interval" class="block text-sm font-medium">Intervalo:</label>
                                <select id="auto-backup-interval" class="form-input-text mt-1 block w-full text-sm">
                                    <option value="0" ${userPrefs.autoBackupInterval === 0 ? 'selected' : ''}>Desativado</option>
                                    <option value="3600000" ${userPrefs.autoBackupInterval === 3600000 ? 'selected' : ''}>A cada 1 hora</option>
                                    <option value="10800000" ${userPrefs.autoBackupInterval === 10800000 ? 'selected' : ''}>A cada 3 horas</option>
                                    <option value="21600000" ${userPrefs.autoBackupInterval === 21600000 ? 'selected' : ''}>A cada 6 horas</option>
                                    <option value="43200000" ${userPrefs.autoBackupInterval === 43200000 ? 'selected' : ''}>A cada 12 horas</option>
                                    <option value="86400000" ${userPrefs.autoBackupInterval === 86400000 ? 'selected' : ''}>Diariamente (24h)</option>
                                </select>
                            </div>
                            <div class="mb-4 mt-3">
                                <label class="checkbox-label inline-flex items-center">
                                    <input type="checkbox" id="auto-backup-include-attachments" class="form-checkbox rounded text-blue-600" ${userPrefs.autoBackupIncludeAttachments ? 'checked' : ''}>
                                    <span class="ml-2 text-sm font-medium">Incluir Anexos</span>
                                </label>
                            </div>
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
                    
                    <!-- Coluna 3 (e outras seções) -->
                    <div class="flex flex-col gap-6 lg:col-span-2 xl:col-span-1">
                         <div class="section-box p-4 border dark:border-slate-700 rounded-lg" id="dados-backup-section">
                            <h3>Dados do Backup Automático</h3>
                            <div class="form-checkbox-group flex flex-wrap gap-x-4 gap-y-2 max-h-60 overflow-y-auto p-2 border dark:border-slate-600 rounded" id="auto-backup-stores-selection">
                                ${storesCheckboxesHtml}
                            </div>
                            <label class="inline-flex items-center mt-2">
                                <input type="checkbox" id="select-all-auto-backup-stores" class="form-checkbox rounded text-blue-600">
                                <span class="ml-2 text-sm font-medium">Selecionar/Desmarcar Tudo</span>
                            </label>
                        </div>

                        <div class="section-box p-4 border dark:border-slate-700 rounded-lg" id="privacidade-dados-section">
                            <h3>Privacidade e Dados</h3>
                            <button type="button" id="btn-limpar-dados-app" class="btn-delete text-sm py-2 px-4">Limpar Todos os Dados</button>
                            <p class="text-xs text-red-500 dark:text-red-400 mt-1">
                                <strong>Atenção:</strong> Ação irreversível.
                            </p>
                        </div>
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

        document.getElementById('btn-config-select-shared-folder')?.addEventListener('click', async () => {
            const sharedFolderHandle = await window.SEFWorkStation.SharedUtils.getSharedFolderHandle(true);
            if (sharedFolderHandle) {
                const nameInput = document.getElementById('config-shared-folder-name');
                if(nameInput) nameInput.value = sharedFolderHandle.name;
                if(globalShowFeedbackRef) globalShowFeedbackRef('Pasta compartilhada definida para esta sessão.', 'success');
            }
        });

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
                const feedbackMaxAutoBackupsEl = document.getElementById('feedback-max-auto-backups');
                const feedbackUserDefaultEmailEl = document.getElementById('feedback-user-default-email');

                if(globalClearFeedbackRef && feedbackGeralConfig) globalClearFeedbackRef(feedbackGeralConfig);
                if(feedbackMaxAutoBackupsEl) {
                    feedbackMaxAutoBackupsEl.textContent = '';
                    feedbackMaxAutoBackupsEl.className = 'text-xs mt-1';
                }
                if(feedbackUserDefaultEmailEl) {
                    feedbackUserDefaultEmailEl.textContent = '';
                    feedbackUserDefaultEmailEl.className = 'text-xs mt-1';
                }

                const maxBackupsInput = document.getElementById('max-auto-backups');
                const userDefaultEmailInput = document.getElementById('user-default-email'); 
                const autoBackupIntervalInput = document.getElementById('auto-backup-interval');
                const autoBackupIncludeAttachmentsInput = document.getElementById('auto-backup-include-attachments');
                const currentUserServerSelect = document.getElementById('config-current-user-server');

                const autoBackupStoresSelecionadas = Array.from(document.querySelectorAll('input[name="autoBackupStores"]:checked')).map(cb => cb.value);
                // NOVO: Coletar preferências de Acesso Rápido
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

                const numBackupsValor = parseInt(maxBackupsInput.value, 10);
                if (isNaN(numBackupsValor) || numBackupsValor < 0) {
                    const errorMsg = "Quantidade de backups deve ser um número >= 0.";
                    if (feedbackMaxAutoBackupsEl) { 
                        feedbackMaxAutoBackupsEl.textContent = errorMsg;
                        feedbackMaxAutoBackupsEl.className = 'text-xs mt-1 text-red-500 dark:text-red-400';
                    }
                    maxBackupsInput.focus();
                    maxBackupsInput.classList.add('border-red-500', 'dark:border-red-400');
                    warningMessages.push("Preferência de quantidade de backups não salva (inválida).");
                    allValidationsPass = false; 
                } else {
                     maxBackupsInput.classList.remove('border-red-500', 'dark:border-red-400');
                     if(feedbackMaxAutoBackupsEl) feedbackMaxAutoBackupsEl.textContent = ''; 
                }

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
                        autoBackupInterval: parseInt(autoBackupIntervalInput.value, 10),
                        autoBackupStores: autoBackupStoresSelecionadas,
                        autoBackupIncludeAttachments: autoBackupIncludeAttachmentsInput.checked,
                        currentUserServerId: currentUserServerSelect.value || null,
                        quickAccessItems: quickAccessItemsSelecionados // Adicionado para salvar
                    };
                    if (!(isNaN(numBackupsValor) || numBackupsValor < 0)) {
                        prefsParaSalvar.maxAutoBackups = numBackupsValor;
                    }
                    if (!emailValor || /.+@.+\..+/.test(emailValor)) {
                         prefsParaSalvar.userDefaultEmail = emailValor;
                    }
                    
                    await salvarUserPreferences(prefsParaSalvar);
                    successMessages.push("Preferências gerais e de usuário salvas.");
                    
                    if (window.SEFWorkStation.State && typeof window.SEFWorkStation.State.setUserPreferences === 'function') {
                        window.SEFWorkStation.State.setUserPreferences(await carregarUserPreferences());
                    }

                    // NOVO: Chama a função para atualizar o dropdown imediatamente
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
        
        const selectAllAutoBackupStoresCheckbox = document.getElementById('select-all-auto-backup-stores');
        if (selectAllAutoBackupStoresCheckbox) {
            const allStoresCheckboxes = document.querySelectorAll('input[name="autoBackupStores"]');
            selectAllAutoBackupStoresCheckbox.addEventListener('change', (event) => {
                allStoresCheckboxes.forEach(checkbox => {
                    checkbox.checked = event.target.checked;
                });
            });
            const allChecked = Array.from(allStoresCheckboxes).every(cb => cb.checked);
            selectAllAutoBackupStoresCheckbox.checked = allChecked;
            
            allStoresCheckboxes.forEach(checkbox => {
                checkbox.addEventListener('change', () => {
                    const allCurrentlyChecked = Array.from(allStoresCheckboxes).every(cb => cb.checked);
                    selectAllAutoBackupStoresCheckbox.checked = allCurrentlyChecked;
                });
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
                     <p class="text-sm text-gray-600 dark:text-gray-300 mt-2">Preferências de interface e pasta da aplicação serão mantidas.</p>
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

        const sharedFolderHandle = window.SEFWorkStation.State.getSharedFolderHandle();
        if (sharedFolderHandle && sharedFolderHandle.name) {
            const nameInput = document.getElementById('config-shared-folder-name');
            if(nameInput) nameInput.value = sharedFolderHandle.name;
        }
    }


    async function executarLimpezaDeDados(feedbackArea) {
        if (uiModuleRef && uiModuleRef.showToastNotification) uiModuleRef.showToastNotification("Limpando dados da aplicação...", "info");
        try {
            if (!dbModuleRef || typeof dbModuleRef.clearAllStores !== 'function') {
                 throw new Error("Funcionalidade de limpeza de banco de dados não está disponível.");
            }
            await dbModuleRef.clearAllStores();

            const dirName = localStorage.getItem('sefWorkstationDirName');
            localStorage.clear();
            if (dirName) {
                localStorage.setItem('sefWorkstationDirName', dirName);
            }

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