// js/itcd/configuracoes.js - Módulo Orquestrador para Configurações de Avaliações ITCD
// v4.2.0 - ADICIONADO: Sistema de bloqueio granular por abas, configurável pelo administrador.
// v4.1.0 - CORRIGIDO: Substituída a chamada à função inexistente `showPromptModal` pela implementação correta usando `showModal`.
// v4.0.0 - ADICIONADO: Sistema de bloqueio de configurações com senha de administrador e nova aba de gerenciamento.
// v3.1.0 - ALTERADO: Atualiza a descrição na aba informativa da Lei 14.941/03 (pós-2008) para incluir a nova regra de desconto de 50%.
// v3.0.0 - ADICIONADO: Novas abas somente leitura com as regras de cada legislação (Lei 14.941/03, Lei 12.426/96, etc.).
// ... (histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ITCD = window.SEFWorkStation.ITCD || {};
window.SEFWorkStation.ITCD.Configuracoes = window.SEFWorkStation.ITCD.Configuracoes || {};

(function(Configuracoes) {

    let mainContentWrapperRef;
    let dbRef;
    let appModuleRef;
    let uiModuleRef;
    let sharedUtilsRef;

    let isConfigUnlocked = false;
    let lockedTabIds = null; // Cache para a lista de IDs de abas bloqueadas

    const LOCKED_TABS_KEY = 'itcdLockedTabs';

    const TABS = [
        { id: 'principal', label: 'Principal', moduleKey: 'Principal', renderFunc: 'renderTabContent' },
        { id: 'imovel-urbano', label: 'Imóvel Urbano', moduleKey: 'Urbano', renderFunc: 'renderTabContent' },
        { id: 'imovel-rural', label: 'Imóvel Rural', moduleKey: 'Rural', renderFunc: 'renderTabContent' },
        { id: 'semoventes', label: 'Semoventes', moduleKey: 'Semoventes', renderFunc: 'renderTabContent' },
        { id: 'regras-sucessao', label: 'Regras de Sucessão', moduleKey: 'Partilha', renderFunc: 'renderTabContent' },
        { id: 'admin', label: 'Administrador', moduleKey: 'Admin', renderFunc: 'renderTabContent' },
        // Abas de Legislação (somente leitura)
        { id: 'lei-14941-apos-2008', label: 'Lei 14.941/03 (pós-2008)', renderFunc: '_renderLei14941Apos2008Content' },
        { id: 'lei-14941-ate-2007', label: 'Lei 14.941/03 (até 2007)', renderFunc: '_renderLei14941Ate2007Content' },
        { id: 'lei-12426-96', label: 'Lei 12.426/96', renderFunc: '_renderLei12426Content' },
        { id: 'lei-9752-89', label: 'Lei 9.752/89', renderFunc: '_renderLei9752Content' },
        { id: 'lei-6763-75', label: 'Lei 6.763/75', renderFunc: '_renderLei6763Content' }
    ];
    let activeTabId = TABS[0].id;

    // --- Funções de Segurança ---
    async function _sha256(message) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async function _getAdminPasswordHash() {
        const storedHash = await dbRef.getItemById('userPreferencesStore', 'itcdAdminPasswordHash');
        if (storedHash && storedHash.value) {
            return storedHash.value;
        } else {
            const defaultHash = await _sha256('Admin');
            await dbRef.updateItem('userPreferencesStore', { key: 'itcdAdminPasswordHash', value: defaultHash });
            return defaultHash;
        }
    }

    async function _getLockedTabIds() {
        if (lockedTabIds !== null) {
            return lockedTabIds;
        }

        const storedConfig = await dbRef.getItemById('userPreferencesStore', LOCKED_TABS_KEY);
        if (storedConfig && storedConfig.value) {
            lockedTabIds = storedConfig.value;
            return lockedTabIds;
        }

        // Se não houver configuração, bloqueia todas as abas configuráveis por padrão
        const defaultLockedTabs = TABS.filter(tab => tab.moduleKey && tab.id !== 'admin').map(tab => tab.id);
        await dbRef.updateItem('userPreferencesStore', { key: LOCKED_TABS_KEY, value: defaultLockedTabs });
        lockedTabIds = defaultLockedTabs;
        return lockedTabIds;
    }

    async function _handleUnlockClick() {
        const password = await new Promise(resolve => {
            const modalId = 'prompt-password-modal';
            const modalContent = `
                <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">Digite a senha de administrador para editar as configurações do ITCD.</p>
                <input type="password" id="admin-password-input" class="form-input-text w-full" autofocus>
            `;

            uiModuleRef.showModal(
                'Desbloquear Configurações',
                modalContent,
                [
                    { text: 'Cancelar', class: 'btn-secondary', callback: () => { resolve(null); return true; } },
                    {
                        text: 'Desbloquear',
                        class: 'btn-primary',
                        callback: () => {
                            const input = document.getElementById('admin-password-input');
                            resolve(input.value);
                            return true;
                        }
                    }
                ],
                'max-w-md',
                modalId
            );

            const inputField = document.getElementById('admin-password-input');
            if (inputField) {
                inputField.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        const unlockButton = document.querySelector(`#${modalId} .btn-primary`);
                        unlockButton?.click();
                    }
                });
            }
        });

        if (password === null) return;

        const enteredHash = await _sha256(password);
        const storedHash = await _getAdminPasswordHash();

        if (enteredHash === storedHash) {
            isConfigUnlocked = true;
            await renderActiveTabContent();
            uiModuleRef.showToastNotification("Configurações desbloqueadas para esta sessão.", "success");
        } else {
            uiModuleRef.showToastNotification("Senha incorreta.", "error");
        }
    }

    async function _renderLockStateUI(isCurrentTabLockable) {
        const lockContainer = document.getElementById('lock-state-container');
        if (!lockContainer) return;

        lockContainer.innerHTML = ''; // Limpa o container por padrão

        if (!isCurrentTabLockable && activeTabId !== 'admin') {
            return; // Não mostra UI de bloqueio para abas que não são bloqueáveis
        }

        if (isConfigUnlocked) {
            lockContainer.innerHTML = `
                <div class="feedback-message warning text-center">
                    ⚠️ <strong>Modo de Edição Ativado:</strong> As configurações do ITCD estão desbloqueadas. As alterações serão salvas para todos os usuários.
                </div>
            `;
        } else {
            // Mostra o botão de desbloqueio se a aba atual for bloqueável ou for a aba de admin
            if (isCurrentTabLockable || activeTabId === 'admin') {
                lockContainer.innerHTML = `
                    <div class="text-center">
                        <button id="btn-unlock-config" class="btn-primary">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-lock-fill inline-block mr-2" viewBox="0 0 16 16"><path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/></svg>
                            Desbloquear para Editar
                        </button>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">As configurações estão protegidas contra alterações acidentais.</p>
                    </div>
                `;
                document.getElementById('btn-unlock-config')?.addEventListener('click', _handleUnlockClick);
            }
        }
    }


    function getModuleRefByKey(key) {
        return Configuracoes[key];
    }

    Configuracoes.init = function(db, app, ui, utils, mainWrapper) {
        dbRef = db;
        appModuleRef = app;
        uiModuleRef = ui;
        sharedUtilsRef = utils;
        mainContentWrapperRef = mainWrapper;
        isConfigUnlocked = false; // Reseta o estado ao (re)inicializar
        lockedTabIds = null;      // Limpa o cache

        TABS.forEach(tab => {
            if (tab.moduleKey) {
                const moduleRef = getModuleRefByKey(tab.moduleKey);
                if (moduleRef && typeof moduleRef.init === 'function') {
                    // Passa a lista de abas para o módulo Admin
                    if (tab.moduleKey === 'Admin') {
                        moduleRef.init(db, app, ui, _sha256, _getAdminPasswordHash, () => isConfigUnlocked, TABS);
                    } else {
                        moduleRef.init(db, app, ui);
                    }
                } else {
                     console.warn(`ITCD.Configuracoes: Submódulo '${tab.moduleKey}' não encontrado ou não possui a função init.`);
                }
            }
        });

        console.log("ITCD.Configuracoes: Módulo Orquestrador inicializado (v4.2.0).");
    }

    async function renderConfiguracoesPage() {
        if (!mainContentWrapperRef) {
            console.error("ITCD.Configuracoes: O contêiner de conteúdo principal não está definido.");
            return;
        }

        let abasHtml = '<div class="mb-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap -mb-px" id="itcd-config-tabs">';
        TABS.forEach(tab => {
            const isActive = tab.id === activeTabId;
            abasHtml += `
                <button class="tab-item ${isActive ? 'active-tab' : ''}" data-tab-target="${tab.id}">
                    ${tab.label}
                </button>
            `;
        });
        abasHtml += '</div>';

        const pageHtml = `
            <div class="page-section max-w-none px-4 sm:px-6 lg:px-8" id="itcd-configuracoes-container">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-100">Configurações ITCD</h2>
                </div>
                <div id="lock-state-container" class="mb-5"></div>
                <div id="feedback-itcd-config" class="mb-4"></div>
                ${abasHtml}
                <div id="itcd-config-tab-content" class="mt-5">
                    <p class="loading-text">Carregando conteúdo da aba...</p>
                </div>
            </div>
        `;

        mainContentWrapperRef.innerHTML = pageHtml;
        addEventListeners();
        await renderActiveTabContent();
    }

    Configuracoes.renderConfiguracoesPage = renderConfiguracoesPage;

    async function renderActiveTabContent() {
        const contentContainer = document.getElementById('itcd-config-tab-content');
        if (!contentContainer) return;

        const activeTabConfig = TABS.find(t => t.id === activeTabId);
        if (!activeTabConfig) return;

        const currentLockedIds = await _getLockedTabIds();
        const isTabLockable = currentLockedIds.includes(activeTabId);
        const isEffectivelyLocked = isTabLockable && !isConfigUnlocked;

        // Lógica especial para a aba Admin: precisa ser desbloqueada para ser acessada.
        if (activeTabConfig.id === 'admin' && !isConfigUnlocked) {
            contentContainer.innerHTML = '<p class="text-center p-4">Acesso restrito. Por favor, desbloqueie as configurações para acessar esta área.</p>';
            await _renderLockStateUI(true); // Aba admin é sempre "bloqueável"
            return;
        }

        if (activeTabConfig.moduleKey) {
            const moduleRef = getModuleRefByKey(activeTabConfig.moduleKey);
            const renderFunctionName = activeTabConfig.renderFunc || 'renderTabContent';

            if (moduleRef && typeof moduleRef[renderFunctionName] === 'function') {
                // Passa o estado de bloqueio efetivo para a função de renderização do submódulo
                await moduleRef[renderFunctionName](contentContainer, isEffectivelyLocked);

                if (typeof moduleRef.addEventListeners === 'function') {
                    moduleRef.addEventListeners(contentContainer);
                }
            } else {
                contentContainer.innerHTML = `<p class="feedback-message warning">O submódulo para "${activeTabConfig.label}" não foi encontrado ou não está implementado corretamente.</p>`;
            }
        } else if (typeof Configuracoes[activeTabConfig.renderFunc] === 'function') {
            await Configuracoes[activeTabConfig.renderFunc](contentContainer);
        } else {
             contentContainer.innerHTML = `<p class="feedback-message warning">Função de renderização para "${activeTabConfig.label}" não encontrada.</p>`;
        }

        // Renderiza a UI de bloqueio (cadeado/aviso) com base se a aba atual é configurada para ser bloqueável
        await _renderLockStateUI(isTabLockable);
    }

    function addEventListeners() {
        const tabsContainer = document.getElementById('itcd-config-tabs');
        if (tabsContainer) {
            tabsContainer.addEventListener('click', e => {
                if (e.target.matches('.tab-item')) {
                    const targetId = e.target.dataset.tabTarget;
                    if (targetId && targetId !== activeTabId) {
                        activeTabId = targetId;
                        tabsContainer.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active-tab'));
                        e.target.classList.add('active-tab');
                        renderActiveTabContent();
                    }
                }
            });
        }
    }

    // --- Funções de Renderização para Abas de Legislação ---
    function _renderLei14941Apos2008Content(containerEl) {
        const html = `
            <div class="space-y-6">
                <h3 class="text-xl font-semibold mb-2">Regras Implementadas - Lei 14.941/03 (vigência a partir de 29/12/2007)</h3>
                <div class="section-box-info">
                    <h4>Regras Gerais</h4>
                    <dl class="card-dl">
                        <dt>Alíquota</dt><dd>5% sobre o valor total da base de cálculo.</dd>
                    </dl>
                </div>
                <div class="section-box-info">
                    <h4>Causa Mortis</h4>
                    <dl class="card-dl">
                        <dt>Desconto de Pontualidade</dt><dd>15% se o imposto for recolhido no prazo de 90 dias a contar da data de abertura da sucessão (óbito).</dd>
                        <dt>Multa por Atraso</dt><dd>Aplicada se não houver direito ao desconto. 0,15% ao dia (até 30 dias), 9% (de 31 a 60 dias) e 12% (após 60 dias).</dd>
                        <dt>Juros</dt><dd>Taxa SELIC acumulada mensalmente a partir do mês seguinte ao vencimento.</dd>
                        <dt>Isenção (Único Imóvel Residencial)</dt><dd>Isenção sobre a transmissão de imóvel residencial com valor de até 40.000 UFEMG, desde que seja o único bem do monte e o monte-mor total não exceda 48.000 UFEMG.</dd>
                    </dl>
                </div>
                <div class="section-box-info">
                    <h4>Doação, Excedente de Meação e Instituição de Usufruto</h4>
                    <dl class="card-dl">
                        <dt>Isenção</dt><dd>Até 10.000 UFEMG por ano civil, somando todas as doações recebidas pelo <b>mesmo donatário</b>.</dd>
                        <dt>Desconto por Valor</dt><dd>Desconto de 50% do valor do imposto se a soma das doações recebidas pelo donatário, no período de 3 anos civis, não ultrapassar 90.000 UFEMG.</dd>
                        <dt>Acréscimos Legais</dt><dd>Seguem as mesmas regras de multa e juros da transmissão Causa Mortis.</dd>
                    </dl>
                </div>
                 <div class="section-box-info">
                    <h4>Doações Sucessivas</h4>
                    <dl class="card-dl">
                        <dt>Período de Apuração</dt><dd>São somadas as doações recebidas pelo mesmo donatário nos últimos 3 anos civis (ano da doação atual e os 2 anteriores).</dd>
                        <dt>Cálculo</dt><dd>A isenção e o desconto são calculados sobre a soma das bases de cálculo convertidas para UFEMG. O imposto já pago nas doações anteriores (também em UFEMG) é deduzido do imposto total apurado.</dd>
                    </dl>
                </div>
                 <div class="section-box-info">
                    <h4>Extinção de Usufruto</h4>
                    <dl class="card-dl">
                        <dt>Extinção</dt><dd>Não há incidência de ITCD. A consolidação da propriedade plena não é fato gerador nesta legislação.</dd>
                    </dl>
                </div>
            </div>
        `;
        containerEl.innerHTML = html;
    }

    function _renderLei14941Ate2007Content(containerEl) {
        const html = `
            <div class="space-y-6">
                <h3 class="text-xl font-semibold mb-2">Regras Implementadas - Lei 14.941/03 (vigência de 29/03/2004 a 28/12/2007)</h3>
                 <div class="section-box-info">
                    <h4>Causa Mortis</h4>
                    <dl class="card-dl">
                        <dt>Alíquotas Progressivas</dt><dd>3% (até 90.000 UFEMG), 4% (de 90.000 a 450.000), 5% (de 450.000 a 900.000) e 6% (acima de 900.000).</dd>
                        <dt>Isenção (Imóvel)</dt><dd>Isenção para único imóvel residencial com valor de até 45.000 UFEMG (se os beneficiários não tiverem outro imóvel) ou para único bem imóvel de até 20.000 UFEMG (independente de ser residencial).</dd>
                        <dt>Acréscimos Legais</dt><dd>Seguem as mesmas regras de multa e juros da legislação pós-2008.</dd>
                    </dl>
                </div>
                 <div class="section-box-info">
                    <h4>Usufruto</h4>
                    <dl class="card-dl">
                        <dt>Instituição</dt><dd>Base de cálculo é 1/3 do valor total do bem.</dd>
                        <dt>Extinção</dt><dd>Base de cálculo é 1/3 do valor total do bem.</dd>
                    </dl>
                </div>
            </div>
        `;
        containerEl.innerHTML = html;
    }

    function _renderLei12426Content(containerEl) {
        const html = `
            <div class="space-y-6">
                <h3 class="text-xl font-semibold mb-2">Regras Implementadas - Lei 12.426/96 (vigência de 01/01/1997 a 28/03/2004)</h3>
                <div class="section-box-info">
                    <h4>Causa Mortis</h4>
                    <dl class="card-dl">
                        <dt>Alíquotas Progressivas (UFIR)</dt><dd>Alíquotas de 1% a 7% aplicadas de forma progressiva sobre o valor do quinhão médio em UFIR.</dd>
                        <dt>Isenção</dt><dd>Isenção para monte-mor com valor total de até 25.000 UFIRs.</dd>
                        <dt>Desconto por Prazo</dt><dd>Redução do imposto de 10% a 25% para pagamento em até 180 dias do óbito.</dd>
                        <dt>Multa e Juros</dt><dd>Multa de 20% e juros (SELIC) aplicados após o vencimento legal (180 dias da abertura da sucessão).</dd>
                    </dl>
                </div>
                <div class="section-box-info">
                    <h4>Doação</h4>
                     <dl class="card-dl">
                        <dt>Alíquotas Progressivas (UFIR)</dt><dd>Alíquotas de 1.5% a 5% aplicadas sobre o valor do bem em UFIR.</dd>
                     </dl>
                </div>
            </div>
        `;
        containerEl.innerHTML = html;
    }

    function _renderLei9752Content(containerEl) {
        const html = `
            <div class="space-y-6">
                <h3 class="text-xl font-semibold mb-2">Regras Implementadas - Lei 9.752/89 (vigência de 01/03/1989 a 31/12/1996)</h3>
                 <div class="section-box-info">
                    <h4>Causa Mortis e Doação</h4>
                    <dl class="card-dl">
                        <dt>Alíquotas (UPFMG)</dt><dd>2% para bases de cálculo de até 1.000 UPFMG e 4% para valores acima disso.</dd>
                        <dt>Isenção</dt><dd>Isenção para monte-mor com valor total de até 500 UPFMG.</dd>
                        <dt>Multa</dt><dd>Multa de 50% sobre o imposto devido em caso de atraso no pagamento.</dd>
                        <dt>Juros</dt><dd>Não há previsão de juros SELIC nesta legislação.</dd>
                    </dl>
                </div>
                 <div class="section-box-info">
                    <h4>Extinção de Usufruto</h4>
                     <dl class="card-dl">
                        <dt>Fato Gerador</dt><dd>Apenas a extinção por renúncia do usufrutuário é tributada. Extinção por morte não é fato gerador.</dd>
                     </dl>
                </div>
            </div>
        `;
        containerEl.innerHTML = html;
    }

    function _renderLei6763Content(containerEl) {
        const html = `
            <div class="space-y-6">
                <h3 class="text-xl font-semibold mb-2">Regras Implementadas - Lei 6.763/75 (vigência de 01/01/1976 a 28/02/1989)</h3>
                 <div class="section-box-info">
                    <h4>Causa Mortis e Doação</h4>
                    <dl class="card-dl">
                        <dt>Alíquota</dt><dd>Alíquota única de 4%.</dd>
                        <dt>Isenção (UPFMG)</dt><dd>Isenção para herança cujo valor não ultrapasse 80 UPFMG.</dd>
                        <dt>Multa por Atraso no Pagamento</dt><dd>50% sobre o valor do imposto devido.</dd>
                        <dt>Multa por Abertura Tardia de Inventário</dt><dd>20% sobre o valor do imposto, se o inventário não for iniciado em 180 dias do óbito.</dd>
                        <dt>Juros</dt><dd>Não há previsão de juros SELIC nesta legislação.</dd>
                    </dl>
                </div>
            </div>
        `;
        containerEl.innerHTML = html;
    }

    Configuracoes._renderLei14941Apos2008Content = _renderLei14941Apos2008Content;
    Configuracoes._renderLei14941Ate2007Content = _renderLei14941Ate2007Content;
    Configuracoes._renderLei12426Content = _renderLei12426Content;
    Configuracoes._renderLei9752Content = _renderLei9752Content;
    Configuracoes._renderLei6763Content = _renderLei6763Content;
    Configuracoes._sha256 = _sha256;

})(window.SEFWorkStation.ITCD.Configuracoes);