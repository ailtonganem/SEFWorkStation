// js/preferences.js - Lógica para Temas, Contraste e Cores Personalizadas
// v5 - Ajustes na aplicação de cores padrão e personalizadas para maior robustez.
// v4 - Remove DOMContentLoaded listener interno; initPreferenceControls e loadAndApplyAllPreferences serão chamadas pelo app.js.

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.Preferences = (function() {
    const LOCAL_STORAGE_THEME_KEY = 'sefWorkstationTheme';
    const LOCAL_STORAGE_CONTRAST_KEY = 'sefWorkstationContrast';

    let themeToggleBtn;
    let contrastToggleBtn;
    let bodyEl;

    // Cores padrão internas para fallback caso Configuracoes não esteja pronto
    const FALLBACK_DEFAULT_THEME_COLORS = {
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

    /**
     * Aplica as cores personalizadas ao tema atual.
     * @param {object} [customColorsObj] - Objeto contendo as cores personalizadas. 
     */
    function applyCustomThemeColors(customColorsObj) {
        if (!bodyEl) bodyEl = document.body;
        if (!bodyEl) {
            console.error("Preferences.JS: applyCustomThemeColors - bodyEl não definido.");
            return;
        }

        const currentTheme = bodyEl.classList.contains('theme-dark') ? 'dark' : 'light';
        
        // Tenta obter as cores padrão do módulo Configuracoes, senão usa o fallback interno.
        const systemDefaultColors = (SEFWorkStation.Configuracoes && SEFWorkStation.Configuracoes.DEFAULT_THEME_COLORS)
                                  ? SEFWorkStation.Configuracoes.DEFAULT_THEME_COLORS
                                  : FALLBACK_DEFAULT_THEME_COLORS;

        const defaultColorsForThisTheme = systemDefaultColors[currentTheme] || {};
        const customColorsForThisTheme = customColorsObj && customColorsObj[currentTheme] ? customColorsObj[currentTheme] : {};

        // Itera sobre as chaves de cores padrão para garantir que todas sejam consideradas
        for (const cssVar in defaultColorsForThisTheme) {
            if (Object.prototype.hasOwnProperty.call(defaultColorsForThisTheme, cssVar)) {
                let colorToApply = defaultColorsForThisTheme[cssVar]; // Começa com o padrão do sistema

                // Se houver uma cor personalizada e ela não for uma string vazia, usa a personalizada
                if (customColorsForThisTheme[cssVar] && customColorsForThisTheme[cssVar].trim() !== '') {
                    colorToApply = customColorsForThisTheme[cssVar];
                }
                
                if (colorToApply && colorToApply.trim() !== '') {
                    document.documentElement.style.setProperty(cssVar, colorToApply);
                } else {
                    // Se, após considerar customização, a cor final for vazia, remove a propriedade para usar o CSS base
                    document.documentElement.style.removeProperty(cssVar);
                }
            }
        }

        // Aplica quaisquer cores personalizadas que não estejam nas defaults (menos comum, mas para cobrir)
        for (const cssVar in customColorsForThisTheme) {
            if (Object.prototype.hasOwnProperty.call(customColorsForThisTheme, cssVar) && !defaultColorsForThisTheme[cssVar]) {
                if (customColorsForThisTheme[cssVar] && customColorsForThisTheme[cssVar].trim() !== '') {
                    document.documentElement.style.setProperty(cssVar, customColorsForThisTheme[cssVar]);
                } else {
                    document.documentElement.style.removeProperty(cssVar);
                }
            }
        }
        // console.log(`Preferences.JS: Cores aplicadas para o tema ${currentTheme}.`);
    }

    /**
     * Aplica o tema (claro ou escuro) ao corpo do documento e salva a preferência.
     */
    function applyTheme(theme) {
        if (!bodyEl) bodyEl = document.body;
        if (!bodyEl) return;

        bodyEl.classList.remove('theme-light', 'theme-dark');
        if (theme === 'dark') {
            bodyEl.classList.add('theme-dark');
        } else {
            bodyEl.classList.add('theme-light'); 
        }
        localStorage.setItem(LOCAL_STORAGE_THEME_KEY, theme);
        updateThemeButtonIcons(theme);
        
        let themeColors = null;
        if (SEFWorkStation.Configuracoes && typeof SEFWorkStation.Configuracoes.carregarThemeColors === 'function') {
            themeColors = SEFWorkStation.Configuracoes.carregarThemeColors();
        } else {
            console.warn("Preferences.JS: Módulo de Configurações ou carregarThemeColors não disponível ao trocar tema.");
        }
        applyCustomThemeColors(themeColors); 
    }

    /**
     * Aplica ou remove o modo de alto contraste e salva a preferência.
     */
    function applyContrast(isHighContrast) {
        if (!bodyEl) bodyEl = document.body;
        if (!bodyEl) return;

        if (isHighContrast) {
            bodyEl.classList.add('high-contrast');
        } else {
            bodyEl.classList.remove('high-contrast');
        }
        localStorage.setItem(LOCAL_STORAGE_CONTRAST_KEY, isHighContrast ? 'true' : 'false');
    }

    /**
     * Atualiza os ícones do botão de tema.
     */
    function updateThemeButtonIcons(theme) {
        if (!themeToggleBtn) {
            themeToggleBtn = document.getElementById('btn-theme-toggle');
            if (!themeToggleBtn) return;
        }
        const sunIcon = themeToggleBtn.querySelector('.sun-icon');
        const moonIcon = themeToggleBtn.querySelector('.moon-icon');

        if (!sunIcon || !moonIcon) return;

        if (theme === 'dark') {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'inline-block';
            themeToggleBtn.title = "Alternar para Tema Claro";
        } else {
            sunIcon.style.display = 'inline-block';
            moonIcon.style.display = 'none';
            themeToggleBtn.title = "Alternar para Tema Escuro";
        }
    }

    /**
     * Carrega as preferências salvas e as aplica.
     */
    function loadAndApplyAllPreferences() {
        if (!bodyEl) bodyEl = document.body;
        if (!bodyEl) {
            console.error("Preferences.JS: loadAndApplyAllPreferences - Elemento body não encontrado.");
            return;
        }

        const savedTheme = localStorage.getItem(LOCAL_STORAGE_THEME_KEY) || 'light'; 
        const savedContrast = localStorage.getItem(LOCAL_STORAGE_CONTRAST_KEY) === 'true';
        
        bodyEl.classList.remove('theme-light', 'theme-dark', 'high-contrast'); // Limpa classes antes de aplicar
        
        if (savedTheme === 'dark') {
            bodyEl.classList.add('theme-dark');
        } else {
            bodyEl.classList.add('theme-light');
        }
        updateThemeButtonIcons(savedTheme);

        if (savedContrast) {
            bodyEl.classList.add('high-contrast');
        }
        
        let themeColors = null;
        if (SEFWorkStation.Configuracoes && typeof SEFWorkStation.Configuracoes.carregarThemeColors === 'function') {
            themeColors = SEFWorkStation.Configuracoes.carregarThemeColors();
        } else {
            console.warn("Preferences.JS: Módulo de Configurações ou carregarThemeColors não disponível durante loadAndApplyAllPreferences.");
        }
        applyCustomThemeColors(themeColors); 
        
        console.log("Preferences.JS: Preferências de tema, contraste e cores personalizadas carregadas e aplicadas.");
    }

    /**
     * Inicializa os event listeners para os botões de tema e contraste.
     */
    function initPreferenceControls() {
        themeToggleBtn = document.getElementById('btn-theme-toggle');
        contrastToggleBtn = document.getElementById('btn-contrast-toggle');
        bodyEl = document.body; 

        if (!bodyEl) {
            console.error("Preferences.JS: initPreferenceControls - Elemento body não encontrado.");
            return;
        }

        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', () => {
                if (!bodyEl) bodyEl = document.body; 
                if (!bodyEl) return;
                const currentThemeIsDark = bodyEl.classList.contains('theme-dark');
                applyTheme(currentThemeIsDark ? 'light' : 'dark'); 
            });
        } else {
            console.error("Preferences.JS: initPreferenceControls - Botão de alternância de tema não encontrado.");
        }

        if (contrastToggleBtn) {
            contrastToggleBtn.addEventListener('click', () => {
                if (!bodyEl) bodyEl = document.body; 
                if (!bodyEl) return;
                const isHighContrastEnabled = bodyEl.classList.toggle('high-contrast');
                applyContrast(isHighContrastEnabled); 
            });
        } else {
            console.error("Preferences.JS: initPreferenceControls - Botão de alternância de contraste não encontrado.");
        }
        
        console.log("Preferences.JS: Controles de Preferências (v5) inicializados.");
    }
    
    return {
        initPreferenceControls, 
        loadAndApplyAllPreferences, 
        applyCustomThemeColors 
    };

})();
