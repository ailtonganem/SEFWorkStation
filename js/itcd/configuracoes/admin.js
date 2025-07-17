// js/itcd/configuracoes/admin.js - Módulo para a aba de Administrador (Configurações ITCD)
// v2.1.0 - ALTERADO: Configuração de bloqueio de abas agora vem desabilitada por padrão.
// v2.0.0 - ADICIONADO: Seção para gerenciamento granular de bloqueio de abas.
// v1.0.0 - Criação do módulo

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ITCD = window.SEFWorkStation.ITCD || {};
window.SEFWorkStation.ITCD.Configuracoes = window.SEFWorkStation.ITCD.Configuracoes || {};

window.SEFWorkStation.ITCD.Configuracoes.Admin = (function() {

    let dbRef;
    let uiModuleRef;
    let _sha256;
    let _getAdminPasswordHash;
    let _isUnlocked;
    let _tabsConfig; 

    const LOCKED_TABS_KEY = 'itcdLockedTabs';

    function init(db, app, ui, sha256Func, getHashFunc, isUnlockedFunc, tabsArray) {
        dbRef = db;
        uiModuleRef = ui;
        _sha256 = sha256Func;
        _getAdminPasswordHash = getHashFunc;
        _isUnlocked = isUnlockedFunc;
        _tabsConfig = tabsArray; 
    }

    async function _loadAndRenderLockConfig() {
        const lockConfig = await dbRef.getItemById('userPreferencesStore', LOCKED_TABS_KEY);
        const lockedTabIds = lockConfig ? lockConfig.value : null;

        const container = document.getElementById('tab-lock-management-container');
        if (!container) return;

        container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            // Se não houver configuração salva, todas as abas configuráveis vêm desmarcadas por padrão.
            // Se houver configuração salva, marcamos apenas as que estão na lista.
            if (lockedTabIds === null) {
                checkbox.checked = false; // ALTERAÇÃO: Padrão agora é desbloqueado
            } else {
                checkbox.checked = lockedTabIds.includes(checkbox.dataset.tabId);
            }
        });
    }

    async function _handleSaveLockConfig() {
        const container = document.getElementById('tab-lock-management-container');
        const lockedTabIds = [];
        container.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
            lockedTabIds.push(checkbox.dataset.tabId);
        });

        try {
            await dbRef.updateItem('userPreferencesStore', { key: LOCKED_TABS_KEY, value: lockedTabIds });
            uiModuleRef.showToastNotification("Configuração de bloqueio das abas salva com sucesso!", "success");
        } catch (error) {
            console.error("Erro ao salvar configuração de bloqueio:", error);
            uiModuleRef.showToastNotification("Ocorreu um erro ao salvar a configuração de bloqueio.", "error");
        }
    }

    async function renderTabContent(containerEl) {
        if (!_isUnlocked()) {
            containerEl.innerHTML = `<p class="text-center p-4">Acesso restrito. Por favor, desbloqueie as configurações para acessar esta área.</p>`;
            return;
        }

        // Filtra as abas que podem ser bloqueadas (exclui as de legislação e a própria de admin)
        const lockableTabs = _tabsConfig.filter(tab => tab.moduleKey && tab.id !== 'admin');

        const tabLockManagementHtml = lockableTabs.map(tab => `
            <label class="flex items-center space-x-3 p-2 rounded hover:bg-gray-100 dark:hover:bg-slate-700">
                <input type="checkbox" data-tab-id="${tab.id}" class="form-checkbox h-5 w-5 text-blue-600 rounded">
                <span class="text-sm text-gray-800 dark:text-gray-200">${tab.label}</span>
            </label>
        `).join('');

        const tabHtml = `
            <div class="space-y-8">
                <fieldset class="section-box p-4 border dark:border-slate-700 rounded-lg itcd-config-fieldset">
                    <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100 config-section-title">Alterar Senha de Administrador</h3>
                    <div id="feedback-change-password" class="mb-4"></div>
                    <form id="form-change-password" class="space-y-4">
                        <div>
                            <label for="current-password" class="block text-sm font-medium dark:text-gray-300">Senha Atual:</label>
                            <input type="password" id="current-password" class="form-input-text mt-1 text-sm" required>
                        </div>
                        <div>
                            <label for="new-password" class="block text-sm font-medium dark:text-gray-300">Nova Senha:</label>
                            <input type="password" id="new-password" class="form-input-text mt-1 text-sm" required>
                        </div>
                        <div>
                            <label for="confirm-new-password" class="block text-sm font-medium dark:text-gray-300">Confirmar Nova Senha:</label>
                            <input type="password" id="confirm-new-password" class="form-input-text mt-1 text-sm" required>
                        </div>
                        <div class="mt-4">
                            <button type="submit" class="btn-primary">Salvar Nova Senha</button>
                        </div>
                    </form>
                </fieldset>

                <fieldset class="section-box p-4 border dark:border-slate-700 rounded-lg itcd-config-fieldset">
                    <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100 config-section-title">Gerenciar Bloqueio de Abas</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">Selecione quais abas de configuração devem ser protegidas pela senha de administrador. As alterações aqui são salvas imediatamente.</p>
                    <div id="tab-lock-management-container" class="grid grid-cols-2 md:grid-cols-3 gap-4">
                        ${tabLockManagementHtml}
                    </div>
                     <div class="mt-5 flex justify-end">
                        <button id="btn-save-lock-config" class="btn-primary">Salvar Configuração de Bloqueio</button>
                    </div>
                </fieldset>
            </div>
        `;
        containerEl.innerHTML = tabHtml;
        await _loadAndRenderLockConfig();
    }

    async function handleChangePassword(e) {
        e.preventDefault();
        const feedbackEl = document.getElementById('feedback-change-password');
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-new-password').value;

        feedbackEl.innerHTML = '';

        if (!currentPassword || !newPassword || !confirmPassword) {
            uiModuleRef.showToastNotification("Todos os campos são obrigatórios.", "warning");
            return;
        }

        if (newPassword !== confirmPassword) {
            uiModuleRef.showToastNotification("A nova senha e a confirmação não correspondem.", "error");
            return;
        }

        if (newPassword.length < 6) {
            uiModuleRef.showToastNotification("A nova senha deve ter pelo menos 6 caracteres.", "warning");
            return;
        }

        const currentHash = await _sha256(currentPassword);
        const storedHash = await _getAdminPasswordHash();

        if (currentHash !== storedHash) {
            uiModuleRef.showToastNotification("A senha atual está incorreta.", "error");
            return;
        }

        try {
            const newHash = await _sha256(newPassword);
            await dbRef.updateItem('userPreferencesStore', { key: 'itcdAdminPasswordHash', value: newHash });
            uiModuleRef.showToastNotification("Senha alterada com sucesso!", "success");
            e.target.reset(); // Limpa o formulário
        } catch (error) {
            console.error("Erro ao salvar nova senha:", error);
            uiModuleRef.showToastNotification("Ocorreu um erro ao alterar a senha.", "error");
        }
    }

    function addEventListeners(containerEl) {
        const form = containerEl.querySelector('#form-change-password');
        form?.addEventListener('submit', handleChangePassword);

        const saveLockBtn = containerEl.querySelector('#btn-save-lock-config');
        saveLockBtn?.addEventListener('click', _handleSaveLockConfig);
    }

    return {
        init,
        renderTabContent,
        addEventListeners
    };
})();