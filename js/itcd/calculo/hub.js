// js/itcd/calculo/hub.js - Módulo para a página central de Cálculo do ITCD
// v1.2.0 - Adiciona as novas opções de cálculo: Doação, Excedente de Meação, Usufruto e Doações Sucessivas.
// v1.1.1 - CORRIGIDO: Ajusta a ação do botão de configurações para a rota correta 'itcd-configuracoes'.
// v1.1.0 - CORRIGIDO: Ajusta a ação do botão de configurações para a rota correta.
// v1.0.0 - Criação do módulo.

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ITCD = window.SEFWorkStation.ITCD || {};
window.SEFWorkStation.ITCD.Calculo = window.SEFWorkStation.ITCD.Calculo || {};

window.SEFWorkStation.ITCD.Calculo.Hub = (function() {

    let mainContentWrapperRef;
    let appModuleRef;
    let uiModuleRef;

    const TIPOS_DE_CALCULO = [
        {
            titulo: 'Causa Mortis',
            descricao: 'Apuração do ITCD para bens e direitos recebidos por herança ou legado.',
            action: 'itcd-calculo-causa-mortis',
            icon: '📜'
        },
        {
            titulo: 'Doação',
            descricao: 'Apuração do ITCD para bens e direitos recebidos por doação.',
            action: 'itcd-calculo-doacao',
            icon: '🎁'
        },
        {
            titulo: 'Doações Sucessivas',
            descricao: 'Apuração de doação considerando doações anteriores entre as mesmas partes.',
            action: 'itcd-calculo-doacoes-sucessivas',
            icon: '📚'
        },
        {
            titulo: 'Dissolução de Sociedade Conjugal',
            descricao: 'Apuração do ITCD sobre o valor que exceder a meação na partilha de bens.',
            action: 'itcd-calculo-excedente-meacao',
            icon: '💔'
        },
        {
            titulo: 'Instituição de Usufruto',
            descricao: 'Apuração do ITCD na instituição de usufruto por ato não oneroso.',
            action: 'itcd-calculo-instituicao-usufruto',
            icon: '➕'
        },
        {
            titulo: 'Extinção de Usufruto',
            descricao: 'Apuração do ITCD na extinção do usufruto com a consolidação da propriedade plena.',
            action: 'itcd-calculo-extincao-usufruto',
            icon: '➖'
        }
    ];

    function init(app, ui) {
        appModuleRef = app;
        uiModuleRef = ui;
        mainContentWrapperRef = document.querySelector('.main-content-wrapper');
        console.log("Módulo ITCD.Calculo.Hub inicializado (v1.2.0).");
    }

    function renderCalculoHubPage() {
        if (!mainContentWrapperRef) {
            console.error("ITCD.Calculo.Hub: O contêiner de conteúdo principal não está definido.");
            return;
        }

        let optionsHtml = TIPOS_DE_CALCULO.map(calc => `
            <div class="card p-4 hover:shadow-lg transition-shadow duration-200 cursor-pointer" data-action="${calc.action}">
                <div class="flex items-start gap-4">
                    <div class="text-3xl">${calc.icon}</div>
                    <div>
                        <h4 class="font-semibold text-lg text-gray-800 dark:text-gray-100">${calc.titulo}</h4>
                        <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">${calc.descricao}</p>
                    </div>
                </div>
            </div>
        `).join('');

        const pageHtml = `
            <div id="itcd-calculo-hub-container" class="page-section max-w-none px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-100">Cálculo do ITCD</h2>
                    <div class="space-x-2">
                        <button id="btn-gerir-calculos-salvos" class="btn-secondary btn-sm">Gerir Cálculos Salvos</button>
                        <button id="btn-configuracoes-calculo-itcd" class="btn-secondary btn-sm">Configurações</button>
                    </div>
                </div>
                <p class="text-base text-gray-700 dark:text-gray-200 mb-6">Selecione uma das opções abaixo para iniciar a apuração do imposto.</p>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    ${optionsHtml}
                </div>
            </div>
        `;

        mainContentWrapperRef.innerHTML = pageHtml;
        addEventListeners();
    }
    
    function addEventListeners() {
        document.getElementById('itcd-calculo-hub-container')?.addEventListener('click', (e) => {
            const card = e.target.closest('[data-action]');
            if (card) {
                const action = card.dataset.action;
                if (appModuleRef && appModuleRef.handleMenuAction) {
                    appModuleRef.handleMenuAction(action);
                }
            }
        });
        
        document.getElementById('btn-configuracoes-calculo-itcd')?.addEventListener('click', () => {
             if (appModuleRef && appModuleRef.handleMenuAction) {
                appModuleRef.handleMenuAction('itcd-configuracoes');
            }
        });

        document.getElementById('btn-gerir-calculos-salvos')?.addEventListener('click', () => {
             if (appModuleRef && appModuleRef.handleMenuAction) {
                appModuleRef.handleMenuAction('itcd-gerir-calculos');
            }
        });
    }

    return {
        init,
        renderCalculoHubPage
    };

})();