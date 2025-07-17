// js/ui.js - Funções auxiliares de UI, Gerenciamento de Dropdowns e Modais
// v3.11.0 - ADICIONADO: Implementação da função `showPromptModal` que estava faltando, para corrigir o TypeError.
// v3.10.2 - CORREÇÃO: Ajusta cor do texto dos itens de dropdown para melhor contraste nos temas claro/escuro.
// v3.10.1 - CORREÇÃO: Remove referências a navOverflowDropdownEl em setupDropdownEventListeners.
// v3.10.0 - Implementa lógica para itens de menu retráteis (ícone/texto completo). Remove lógica de overflow antiga.
// ... (histórico anterior)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.UI = (function() {
    const dropdownOriginalParents = {};
    let navElementRef;
    let currentModalElement = null;
    let currentModalEscListener = null;
    let toastContainerEl = null;
    let currentContextMenu = null;
    let loadingOverlayElement = null;

    let retractableMenuItems = [];


    function isColorDark(hexColor) {
        if (!hexColor || typeof hexColor !== 'string' || hexColor.toLowerCase() === 'transparent' || hexColor.startsWith('rgba')) {
            return document.body.classList.contains('theme-dark');
        }
        let hex = hexColor.replace('#', '');
        if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        if (hex.length !== 6) return document.body.classList.contains('theme-dark');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const luminance = (r * 299 + g * 587 + b * 114) / 1000;
        return luminance < 128;
    }

    function closeAllDropdowns(exceptButton = null) {
        document.querySelectorAll('.dropdown-content.show').forEach(openDropdown => {
            const triggerId = openDropdown.dataset.triggerButtonId;
            const triggerButton = triggerId ? document.getElementById(triggerId) : null;

            if (!exceptButton || (triggerButton && triggerButton !== exceptButton)) {
                openDropdown.classList.remove('show');
                const arrow = triggerButton ? triggerButton.querySelector('.dropdown-arrow') : null;
                if (arrow) arrow.style.transform = 'rotate(0deg)';

                const retractableMenuItem = triggerButton ? triggerButton.closest('.retractable-menu-item') : null;
                if (retractableMenuItem && retractableMenuItem.classList.contains('expanded')) {
                    // A lógica de mouseleave cuidará da retração se o mouse não estiver sobre o item.
                }

                const dropdownId = openDropdown.id;
                if (dropdownOriginalParents[dropdownId]) {
                    const { parent, nextSibling } = dropdownOriginalParents[dropdownId];
                    parent.insertBefore(openDropdown, nextSibling);
                    openDropdown.style.top = ''; openDropdown.style.left = '';
                    openDropdown.style.minWidth = ''; openDropdown.style.position = '';
                    delete dropdownOriginalParents[dropdownId];
                }
            }
        });
    }

    function setupDropdownEventListeners(parentElement = document) {
        if (!parentElement || typeof parentElement.querySelectorAll !== 'function') {
            console.warn("UI.JS: setupDropdownEventListeners - parentElement inválido:", parentElement);
            return;
        }

        parentElement.querySelectorAll('button[data-dropdown-trigger]').forEach(button => {
            if (button.dataset.dropdownListenerAttached === 'true' && parentElement !== document) return;

            const clickHandler = function(event) {
                event.stopPropagation();
                const dropdownId = this.getAttribute('data-dropdown-trigger');
                const targetDropdown = document.getElementById(dropdownId);
                const arrow = this.querySelector('.dropdown-arrow');
                const retractableMenuItem = this.closest('.retractable-menu-item');

                if (targetDropdown) {
                    const isCurrentlyShown = targetDropdown.classList.contains('show');
                    
                    if (isCurrentlyShown) {
                        closeAllDropdowns(); 
                        return;
                    }
                    
                    closeAllDropdowns(this);

                    if (retractableMenuItem && !retractableMenuItem.classList.contains('expanded')) {
                        expandRetractableItem(retractableMenuItem);
                    }

                    if (targetDropdown.parentElement !== document.body && !dropdownOriginalParents[dropdownId]) {
                        dropdownOriginalParents[dropdownId] = { parent: targetDropdown.parentElement, nextSibling: targetDropdown.nextElementSibling };
                    }
                    
                    document.body.appendChild(targetDropdown);
                    targetDropdown.style.position = 'absolute';
                    
                    const rect = button.getBoundingClientRect();
                    targetDropdown.style.top = `${rect.bottom + window.scrollY + 2}px`;
                    targetDropdown.style.left = `${rect.left + window.scrollX}px`;
                    targetDropdown.style.minWidth = `${rect.width}px`;

                    targetDropdown.classList.add('show');
                    targetDropdown.dataset.triggerButtonId = button.id;
                    if (arrow) arrow.style.transform = 'rotate(180deg)';
                    
                    const isBodyDark = document.body.classList.contains('theme-dark');
                    const itemTextColor = isBodyDark ? 'var(--text-color-dark, #e2e8f0)' : 'var(--text-color-light, #2d3748)';
                    const itemHoverBgColor = isBodyDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';

                    targetDropdown.querySelectorAll('a, button').forEach(item => {
                        item.style.color = itemTextColor;
                        item.onmouseenter = function() { item.style.backgroundColor = itemHoverBgColor; };
                        item.onmouseleave = function() { item.style.backgroundColor = 'transparent'; };
                    });
                }
            };

            if (button._clickHandler) button.removeEventListener('click', button._clickHandler);
            button.addEventListener('click', clickHandler);
            button._clickHandler = clickHandler;
            button.dataset.dropdownListenerAttached = 'true';
        });
    }
    
    function expandRetractableItem(menuItemElement) {
        menuItemElement.classList.add('expanded');
    }

    function retractRetractableItem(menuItemElement) {
        const dropdownId = menuItemElement.dataset.dropdownId;
        const targetDropdown = dropdownId ? document.getElementById(dropdownId) : null;
        
        if (targetDropdown && targetDropdown.classList.contains('show')) {
            return;
        }
        menuItemElement.classList.remove('expanded');
    }

    function setupRetractableMenuEventListeners() {
        retractableMenuItems = document.querySelectorAll('.retractable-menu-item');
        retractableMenuItems.forEach(item => {
            const trigger = item.querySelector('.retractable-trigger');
            if (trigger) {
                item.addEventListener('mouseenter', () => {
                    retractableMenuItems.forEach(otherItem => {
                        if (otherItem !== item && otherItem.classList.contains('expanded')) {
                            const otherDropdownId = otherItem.dataset.dropdownId;
                            const otherTargetDropdown = otherDropdownId ? document.getElementById(otherDropdownId) : null;
                            if (!otherTargetDropdown || !otherTargetDropdown.classList.contains('show')) {
                                retractRetractableItem(otherItem);
                            }
                        }
                    });
                    expandRetractableItem(item);
                });

                item.addEventListener('mouseleave', () => {
                    retractRetractableItem(item);
                });
            }
        });
    }

    function updateOverflowMenu() {
        // Lógica de overflow desativada. O scroll horizontal do nav-scroll-container é o fallback.
    }


    function closeModal() {
        if (currentModalElement) {
            currentModalElement.remove();
            currentModalElement = null;
        }
        if (currentModalEscListener) {
            document.removeEventListener('keydown', currentModalEscListener);
            currentModalEscListener = null;
        }
    }

    function showModal(title, contentHtml, buttonsConfig = [], modalSize = 'max-w-xl', customModalId = null) {
        closeModal(); 

        const modalId = customModalId || `generic-modal-${Date.now()}`;

        let buttonsHtml = '';
        if (buttonsConfig.length > 0) {
            buttonsConfig.forEach((btn, index) => {
                const defaultClasses = btn.isPrimary ? 'btn-primary' : 'btn-secondary';
                const combinedClasses = `${defaultClasses} ${btn.class || ''} text-sm`;
                buttonsHtml += `<button type="button" id="modal-btn-${index}-${modalId}" class="${combinedClasses.trim()}">${btn.text}</button>`;
            });
        } else {
            buttonsHtml = `<button type="button" id="modal-btn-close-${modalId}" class="btn-secondary text-sm">Fechar</button>`;
        }

        const modalTemplate = `
            <div id="${modalId}" class="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full flex items-center justify-center z-[10000] p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title-${modalId}">
                <div class="bg-white dark:bg-slate-800 p-5 border dark:border-slate-700 shadow-lg rounded-lg w-full ${modalSize} max-h-[90vh] flex flex-col">
                    <div class="flex justify-between items-center pb-3 border-b dark:border-slate-600">
                        <h3 id="modal-title-${modalId}" class="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">${title}</h3>
                        <button type="button" id="modal-btn-x-close-${modalId}" class="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100" title="Fechar">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-x-lg" viewBox="0 0 16 16">
                                <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                            </svg>
                        </button>
                    </div>
                    <div id="modal-content" class="mt-4 mb-6 overflow-y-auto flex-grow modal-content-scrollable">
                        ${contentHtml}
                    </div>
                    <div class="pt-3 border-t dark:border-slate-600 flex justify-end space-x-3">
                        ${buttonsHtml}
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalTemplate);
        currentModalElement = document.getElementById(modalId);

        if (!currentModalElement) {
            console.error(`UI.JS: Falha ao criar o modal com ID: ${modalId}`);
            return null;
        }

        if (buttonsConfig.length > 0) {
            buttonsConfig.forEach((btn, index) => {
                const buttonEl = document.getElementById(`modal-btn-${index}-${modalId}`);
                if (buttonEl && btn.callback && typeof btn.callback === 'function') {
                    buttonEl.addEventListener('click', () => {
                        const shouldClose = btn.callback();
                        if (btn.closesModal !== false && shouldClose !== false) { 
                           closeModal();
                        }
                    });
                } else if (buttonEl) {
                     buttonEl.addEventListener('click', closeModal);
                }
            });
        } else {
            const closeButton = document.getElementById(`modal-btn-close-${modalId}`);
            if (closeButton) closeButton.addEventListener('click', closeModal);
        }

        const xCloseButton = document.getElementById(`modal-btn-x-close-${modalId}`);
        if (xCloseButton) xCloseButton.addEventListener('click', closeModal);

        currentModalEscListener = (event) => {
            if (event.key === "Escape") {
                closeModal();
            }
        };
        document.addEventListener('keydown', currentModalEscListener);

        const firstFocusableElement = currentModalElement.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (firstFocusableElement) {
            firstFocusableElement.focus();
        } else {
            const xCloseBtn = document.getElementById(`modal-btn-x-close-${modalId}`);
            if(xCloseBtn) xCloseBtn.focus();
        }
        return currentModalElement; 
    }

    function showConfirmationModal(title, messageHtml, confirmButtonText = 'Sim', cancelButtonText = 'Não') {
        return new Promise((resolve) => {
            const buttons = [
                {
                    text: cancelButtonText,
                    class: 'btn-secondary', 
                    callback: () => { resolve(false); return true; }
                },
                {
                    text: confirmButtonText,
                    class: 'btn-danger', 
                    callback: () => { resolve(true); return true; }
                }
            ];
            showModal(title, `<p class="text-sm text-gray-700 dark:text-gray-300">${messageHtml}</p>`, buttons, 'max-w-md', `confirmation-modal-${Date.now()}`);
        });
    }
    
    // NOVA FUNÇÃO
    function showPromptModal(title, message, inputType = 'text', defaultValue = '') {
        return new Promise(resolve => {
            const inputId = `prompt-input-${Date.now()}`;
            const modalContent = `
                <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">${message}</p>
                <input type="${inputType}" id="${inputId}" class="form-input-text w-full" value="${defaultValue.replace(/"/g, '"')}">
            `;
            
            const modalId = `prompt-modal-${Date.now()}`;

            const buttons = [
                { text: 'Cancelar', class: 'btn-secondary', callback: () => { resolve(null); return true; } },
                { text: 'Confirmar', class: 'btn-primary', callback: () => {
                    const inputEl = document.getElementById(inputId);
                    resolve(inputEl.value);
                    return true;
                }}
            ];
            
            showModal(title, modalContent, buttons, 'max-w-md', modalId);
            
            const inputField = document.getElementById(inputId);
            if (inputField) {
                inputField.focus();
                inputField.select();
                inputField.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        const confirmButton = document.querySelector(`#${modalId} .btn-primary`);
                        confirmButton?.click();
                    }
                });
            }
        });
    }

    function showToastNotification(message, type = 'info', duration = 3000) {
        if (!toastContainerEl) {
            toastContainerEl = document.getElementById('toast-notifications-container');
            if (!toastContainerEl) {
                console.error("UI.JS: Container de toasts (#toast-notifications-container) não encontrado no DOM.");
                console.log(`Toast (${type}): ${message}`);
                return;
            }
        }
        const toastId = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const toastElement = document.createElement('div');
        toastElement.id = toastId;
        toastElement.className = `toast-notification toast-${type}`; 
        let iconHtml = '';
        switch (type) {
            case 'success': iconHtml = `<svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>`; break;
            case 'error': iconHtml = `<svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>`; break;
            case 'warning': iconHtml = `<svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.636-1.174 2.85-1.174 3.486 0l5.58 10.278c.636 1.174-.477 2.623-1.743 2.623H4.42c-1.266 0-2.379-1.449-1.743-2.623l5.58-10.278zM10 14a1 1 0 100-2 1 1 0 000 2zm0-6a1 1 0 011 1v2a1 1 0 11-2 0V9a1 1 0 011-1z" clip-rule="evenodd"></path></svg>`; break;
            default: iconHtml = `<svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>`; break;
        }
        toastElement.innerHTML = `<div class="flex items-center">${iconHtml}<span>${message}</span></div>`;
        if (!duration || duration <= 0) {
            const closeButton = document.createElement('button');
            closeButton.className = 'toast-close-button'; closeButton.innerHTML = '×'; closeButton.title = 'Fechar notificação';
            closeButton.onclick = () => { toastElement.classList.add('toast-fade-out'); setTimeout(() => toastElement.remove(), 300); };
            toastElement.appendChild(closeButton);
        } else {
            setTimeout(() => { toastElement.classList.add('toast-fade-out'); setTimeout(() => toastElement.remove(), 300); }, duration);
        }
        toastContainerEl.appendChild(toastElement);
        void toastElement.offsetWidth;
        toastElement.classList.add('toast-fade-in');
    }

    function closeCurrentContextMenu() {
        if (currentContextMenu) {
            currentContextMenu.remove(); currentContextMenu = null;
            document.removeEventListener('click', closeCurrentContextMenuOnClickOutside, true);
            document.removeEventListener('keydown', closeCurrentContextMenuOnEsc, true);
        }
    }
    function closeCurrentContextMenuOnClickOutside(event) {
        if (currentContextMenu && !currentContextMenu.contains(event.target)) {
            const triggerButton = currentContextMenu.dataset.triggerElementId ? document.getElementById(currentContextMenu.dataset.triggerElementId) : null;
            if (triggerButton && triggerButton.contains(event.target)) return;
            closeCurrentContextMenu();
        }
    }
    function closeCurrentContextMenuOnEsc(event) { if (event.key === "Escape") closeCurrentContextMenu(); }
    function showContextMenu(referenceElement, menuItems) {
        closeCurrentContextMenu(); 
        const menu = document.createElement('div');
        menu.className = 'absolute z-[10002] bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-lg py-1 min-w-[160px]';
        currentContextMenu = menu; 
        if (referenceElement.id) currentContextMenu.dataset.triggerElementId = referenceElement.id;
        menuItems.forEach(itemConfig => {
            if (itemConfig.isSeparator) { const sep = document.createElement('div'); sep.className = 'h-px bg-gray-200 dark:bg-slate-600 my-1'; menu.appendChild(sep); return; }
            const menuItem = document.createElement('button'); menuItem.type = 'button';
            menuItem.className = 'block w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed';
            menuItem.textContent = itemConfig.label; if (itemConfig.disabled) menuItem.disabled = true;
            menuItem.addEventListener('click', (e) => { e.stopPropagation(); if (typeof itemConfig.action === 'function') itemConfig.action(); closeCurrentContextMenu(); });
            menu.appendChild(menuItem);
        });
        document.body.appendChild(menu);
        const refRect = referenceElement.getBoundingClientRect(); const menuRect = menu.getBoundingClientRect(); 
        let top = refRect.bottom + window.scrollY; let left = refRect.left + window.scrollX;
        if (left + menuRect.width > window.innerWidth - 10) left = window.innerWidth - menuRect.width - 10;
        if (top + menuRect.height > window.innerHeight - 10) { top = refRect.top + window.scrollY - menuRect.height; if (top < 0) top = 10; }
        if (left < 0) left = 10; 
        menu.style.top = `${top}px`; menu.style.left = `${left}px`;
        setTimeout(() => { document.addEventListener('click', closeCurrentContextMenuOnClickOutside, true); document.addEventListener('keydown', closeCurrentContextMenuOnEsc, true); }, 0);
        return menu;
    }

    function showLoading(show, message = 'Processando...') {
        if (show) {
            if (!loadingOverlayElement) {
                loadingOverlayElement = document.createElement('div'); loadingOverlayElement.id = 'sef-loading-overlay';
                loadingOverlayElement.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background-color:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10005;color:white;font-size:1.2em;';
                loadingOverlayElement.innerHTML = `<div style="text-align:center;"><div style="border:4px solid #f3f3f3;border-top:4px solid #3498db;border-radius:50%;width:40px;height:40px;animation:spin 1s linear infinite;margin:0 auto 10px auto;"></div><p>${message}</p></div><style>@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}</style>`;
                document.body.appendChild(loadingOverlayElement);
            }
            loadingOverlayElement.style.display = 'flex';
            if (loadingOverlayElement.querySelector('p')) loadingOverlayElement.querySelector('p').textContent = message;
        } else { if (loadingOverlayElement) loadingOverlayElement.style.display = 'none'; }
    }
    function hideLoading() { showLoading(false); }

    function initUI() {
        navElementRef = document.querySelector('#header-line-1 nav');
        toastContainerEl = document.getElementById('toast-notifications-container');
        retractableMenuItems = document.querySelectorAll('.retractable-menu-item');

        if (window.SEFWorkStation && window.SEFWorkStation.Preferences) {
            if (typeof window.SEFWorkStation.Preferences.loadAndApplyAllPreferences === 'function') window.SEFWorkStation.Preferences.loadAndApplyAllPreferences();
            else console.error("UI.JS: SEFWorkStation.Preferences.loadAndApplyAllPreferences não é uma função.");
            if (typeof window.SEFWorkStation.Preferences.initPreferenceControls === 'function') window.SEFWorkStation.Preferences.initPreferenceControls();
            else console.error("UI.JS: SEFWorkStation.Preferences.initPreferenceControls não é uma função.");
        } else console.error("UI.JS: Módulo SEFWorkStation.Preferences não encontrado.");

        setupDropdownEventListeners(document);
        setupRetractableMenuEventListeners(); 

        window.addEventListener('click', function(event) {
            const openDropdowns = document.querySelectorAll('.dropdown-content.show');
            let clickedInsideDropdownOrTrigger = false;
            openDropdowns.forEach(dd => {
                const triggerId = dd.dataset.triggerButtonId;
                const triggerButton = triggerId ? document.getElementById(triggerId) : null;
                if ((triggerButton && triggerButton.contains(event.target)) || dd.contains(event.target)) {
                    clickedInsideDropdownOrTrigger = true;
                }
            });
            if (!clickedInsideDropdownOrTrigger) closeAllDropdowns();
            if (currentModalElement && event.target === currentModalElement) closeModal();
        });
        
        console.log("UI.JS: SEFWorkStation.UI (v3.11.0) inicializado com menu retrátil, correção de cor e showPromptModal.");
    }

    return {
        initUI, closeAllDropdowns, setupDropdownEventListeners, showModal, closeModal, showConfirmationModal, 
        isColorDark, showToastNotification, showContextMenu, closeCurrentContextMenu, showLoading, hideLoading,
        updateOverflowMenu, showPromptModal
    };
})();