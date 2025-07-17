// js/itcd/configuracoes/urbano.js - Módulo para a aba de Configurações de Imóvel Urbano (ITCD)
// v2.1.0 - CORRIGIDO: Garante que todos os campos e botões de edição/adição sejam desabilitados quando as configurações estão bloqueadas (isLocked=true).
// v2.0.0 - ADICIONADO: Respeita o estado de bloqueio do administrador, desabilitando campos e botões quando travado.
// v1.8.1 - CORRIGIDO: Refatorada a função addEventListeners para usar múltiplos `if` em vez de `if/else if`, garantindo que todos os botões, incluindo os dinâmicos de editar/excluir, sejam funcionais.
// v1.8.0 - CORRIGIDO: Refatorada a função addEventListeners para garantir que os cliques nos botões de adicionar, editar e excluir sejam corretamente capturados e processados.
// ... (histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ITCD = window.SEFWorkStation.ITCD || {};
window.SEFWorkStation.ITCD.Configuracoes = window.SEFWorkStation.ITCD.Configuracoes || {};

window.SEFWorkStation.ITCD.Configuracoes.Urbano = (function() {

    let dbRef;
    let appModuleRef;
    let uiModuleRef;

    const ITCD_CONFIG_STORE = 'itcdConfiguracoesStore';
    const CUB_KEY = 'valoresCUB';
    const LOCALIZACOES_KEY = 'urbanoLocalizacoes';
    const DEPRECIACAO_KEY = 'urbanoDepreciacao';
    const TIPO_TERRENO_KEY = 'urbanoTipoTerreno';
    const URBANO_GERAL_KEY = 'urbanoGeral';
    const SRF_CIDADES_KEY = 'srfCidades';
    const URBANO_CONSERVACAO_KEY = 'urbanoConservacao';
    const URBANO_APARTAMENTO_FATORES_KEY = 'urbanoApartamentoFatores';

    function init(db, app, ui) {
        dbRef = db;
        appModuleRef = app;
        uiModuleRef = ui;
    }

    function formatToBRL(value) {
        if (isNaN(value) || value === null) return '';
        return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function parseFromBRL(value) {
        if (!value || typeof value !== 'string') return 0;
        return parseFloat(value.replace(/\./g, '').replace(',', '.').trim()) || 0;
    }

    async function renderTabContent(containerEl, isLocked = true) {
        const tabHtml = `
            <div class="space-y-6">
                <fieldset class="grid grid-cols-1 md:grid-cols-2 gap-6 itcd-config-fieldset">
                    <div class="section-box p-4 border dark:border-slate-700 rounded-lg">
                        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-gray-100 config-section-title">Parâmetros Gerais de Avaliação Urbana</h3>
                        <form id="form-urbano-geral" class="space-y-4">
                            <div>
                                <label for="percentual-edicula" class="block text-sm font-medium dark:text-gray-300">Percentual Valor Edícula (%):</label>
                                <input type="number" id="percentual-edicula" step="0.1" class="form-input-text mt-1 text-sm" ${isLocked ? 'disabled' : ''}>
                                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Percentual do valor do m² da construção principal. Padrão: 30%.</p>
                            </div>
                            <div>
                                <label for="percentual-esquina" class="block text-sm font-medium dark:text-gray-300">Acréscimo Terreno Esquina (%):</label>
                                <input type="number" id="percentual-esquina" step="0.1" class="form-input-text mt-1 text-sm" ${isLocked ? 'disabled' : ''}>
                                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Acréscimo sobre o valor total do terreno. Padrão: 25%.</p>
                            </div>
                            <div class="mt-2">
                                <button type="button" id="btn-salvar-urbano-geral" class="btn-primary" ${isLocked ? 'disabled' : ''}>Salvar Parâmetros Gerais</button>
                            </div>
                        </form>
                    </div>

                    <div class="section-box p-4 border dark:border-slate-700 rounded-lg">
                        <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-gray-100 config-section-title">Fatores de Multiplicação para Apartamento</h3>
                         <form id="form-urbano-apartamento" class="space-y-4">
                            <div>
                                <label for="fator-apto-baixo" class="block text-sm font-medium dark:text-gray-300">Padrão Baixo:</label>
                                <input type="number" id="fator-apto-baixo" step="0.01" class="form-input-text mt-1 text-sm" ${isLocked ? 'disabled' : ''}>
                                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Multiplicador para o CUB de padrão baixo. Padrão: 1,5.</p>
                            </div>
                            <div>
                                <label for="fator-apto-normal" class="block text-sm font-medium dark:text-gray-300">Padrão Normal/Médio:</label>
                                <input type="number" id="fator-apto-normal" step="0.01" class="form-input-text mt-1 text-sm" ${isLocked ? 'disabled' : ''}>
                                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Multiplicador para o CUB de padrão normal. Padrão: 2,0.</p>
                            </div>
                             <div>
                                <label for="fator-apto-alto" class="block text-sm font-medium dark:text-gray-300">Padrão Alto:</label>
                                <input type="number" id="fator-apto-alto" step="0.01" class="form-input-text mt-1 text-sm" ${isLocked ? 'disabled' : ''}>
                                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Multiplicador para o CUB de padrão alto. Padrão: 2,5.</p>
                            </div>
                            <div class="mt-2">
                                <button type="button" id="btn-salvar-urbano-apto" class="btn-primary" ${isLocked ? 'disabled' : ''}>Salvar Fatores de Apartamento</button>
                            </div>
                         </form>
                    </div>
                </fieldset>
                
                <fieldset class="section-box p-4 border dark:border-slate-700 rounded-lg itcd-config-fieldset">
                    <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100 config-section-title">Valores de Referência por Cidade (m²)</h3>
                    <div class="flex flex-col md:flex-row items-end gap-4 mb-4">
                        <div class="w-full md:w-1/3">
                             <label for="srf-cidade-select" class="block text-sm font-medium dark:text-gray-300">Superintendência:</label>
                             <select id="srf-cidade-select" class="form-input-text mt-1 text-sm" ${isLocked ? 'disabled' : ''}></select>
                        </div>
                        <div class="w-full md:w-1/3">
                            <label for="cidade-valor-select" class="block text-sm font-medium dark:text-gray-300">Cidade:</label>
                            <select id="cidade-valor-select" class="form-input-text mt-1 text-sm" disabled><option>Selecione uma SRF</option></select>
                        </div>
                        <div class="w-full md:w-auto">
                            <button id="btn-reajustar-valores-urbano" class="btn-secondary w-full" disabled ${isLocked ? 'disabled' : ''}>Reajustar Valores</button>
                        </div>
                    </div>
                    <div id="container-valores-cidade" class="hidden p-4 mt-4 border dark:border-slate-600 rounded-md bg-white dark:bg-slate-800">
                    </div>
                </fieldset>

                <fieldset class="grid grid-cols-1 lg:grid-cols-2 gap-6 itcd-config-fieldset">
                    <div class="section-box p-4 border dark:border-slate-700 rounded-lg">
                        <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100 config-section-title">Opções de Localização do Imóvel</h3>
                        <div class="flex items-center gap-2 mb-4">
                            <input type="text" id="input-nova-localizacao" class="form-input-text flex-grow text-sm" placeholder="Nome da nova Localização" ${isLocked ? 'disabled' : ''}>
                            <button id="btn-adicionar-localizacao" class="btn-primary btn-sm text-sm py-1.5 px-3" ${isLocked ? 'disabled' : ''}>Adicionar</button>
                        </div>
                        <div id="lista-localizacoes" class="space-y-2"></div>
                    </div>

                    <div class="section-box p-4 border dark:border-slate-700 rounded-lg">
                        <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100 config-section-title">Tipos de Terreno</h3>
                        <div class="flex items-center gap-2 mb-4">
                            <input type="text" id="input-novo-tipo-terreno-nome" class="form-input-text flex-grow text-sm" placeholder="Descrição (ex: Em Aclive)" ${isLocked ? 'disabled' : ''}>
                            <input type="number" id="input-novo-tipo-terreno-percent" step="0.01" class="form-input-text w-32 text-sm" placeholder="Percentual (%)" ${isLocked ? 'disabled' : ''}>
                            <button id="btn-adicionar-tipo-terreno" class="btn-primary btn-sm text-sm py-1.5 px-3" ${isLocked ? 'disabled' : ''}>Adicionar</button>
                        </div>
                        <div id="lista-tipos-terreno" class="space-y-2"></div>
                    </div>
                </fieldset>
                
                <fieldset class="grid grid-cols-1 lg:grid-cols-2 gap-6 itcd-config-fieldset">
                    <div class="section-box p-4 border dark:border-slate-700 rounded-lg">
                        <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100 config-section-title">Estado de Conservação</h3>
                        <div class="flex items-center gap-2 mb-4">
                            <input type="text" id="input-nova-conservacao-nome" class="form-input-text flex-grow text-sm" placeholder="Descrição (ex: REPAROS SIMPLES)" ${isLocked ? 'disabled' : ''}>
                            <input type="number" id="input-nova-conservacao-percent" step="0.01" class="form-input-text w-32 text-sm" placeholder="Percentual (%)" ${isLocked ? 'disabled' : ''}>
                            <button id="btn-adicionar-conservacao" class="btn-primary btn-sm text-sm py-1.5 px-3" ${isLocked ? 'disabled' : ''}>Adicionar</button>
                        </div>
                        <div id="lista-conservacao" class="space-y-2"></div>
                    </div>

                    <div class="section-box p-4 border dark:border-slate-700 rounded-lg">
                        <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100 config-section-title">Fatores de Depreciação (Idade)</h3>
                        <div class="flex items-center gap-2 mb-4">
                            <input type="text" id="input-nova-depreciacao-nome" class="form-input-text flex-grow text-sm" placeholder="Descrição (ex: 21 a 25 anos)" ${isLocked ? 'disabled' : ''}>
                            <input type="number" id="input-nova-depreciacao-percent" step="0.01" class="form-input-text w-32 text-sm" placeholder="Percentual (%)" ${isLocked ? 'disabled' : ''}>
                            <button id="btn-adicionar-depreciacao" class="btn-primary btn-sm text-sm py-1.5 px-3" ${isLocked ? 'disabled' : ''}>Adicionar</button>
                        </div>
                        <div id="lista-depreciacao" class="space-y-2"></div>
                    </div>
                </fieldset>

                <fieldset class="section-box p-4 border dark:border-slate-700 rounded-lg itcd-config-fieldset">
                    <h3 class="text-lg font-medium mb-2 text-gray-800 dark:text-gray-100 config-section-title">Custos Unitários Básicos de Construção (CUB)</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
                        Fonte oficial: 
                        <a href="https://sinduscon-mg.org.br/cub/tabela-do-cub/" target="_blank" rel="noopener noreferrer" class="link">
                           SINDUSCON-MG - Tabela do CUB
                        </a>
                    </p>
                    <form id="form-valores-cub">
                        <div class="mb-4">
                             <label for="cub-reference-date" class="block text-sm font-medium dark:text-gray-300">Período de Referência:</label>
                             <input type="text" id="cub-reference-date" class="form-input-text mt-1 text-sm md:w-1/3" placeholder="Ex: Janeiro/2024" ${isLocked ? 'disabled' : ''}>
                        </div>
                        <fieldset class="border dark:border-slate-600 p-3 rounded-md mb-4">
                            <legend class="text-md font-semibold px-2 dark:text-gray-200">Projetos - Padrão Residenciais</legend>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4 mt-2">
                                <div class="space-y-2">
                                    <h4 class="font-medium text-sm col-span-full mb-1 border-b pb-1 dark:border-slate-600 dark:text-gray-200">Padrão Baixo</h4>
                                    <label class="flex items-center justify-between dark:text-gray-300"><span>R-1:</span><input type="text" class="form-input-text text-sm w-32 cub-input currency-input" data-cub-key="residencial_baixo_r1" ${isLocked ? 'disabled' : ''}></label>
                                    <label class="flex items-center justify-between dark:text-gray-300"><span>PP-4:</span><input type="text" class="form-input-text text-sm w-32 cub-input currency-input" data-cub-key="residencial_baixo_pp4" ${isLocked ? 'disabled' : ''}></label>
                                    <label class="flex items-center justify-between dark:text-gray-300"><span>R-8:</span><input type="text" class="form-input-text text-sm w-32 cub-input currency-input" data-cub-key="residencial_baixo_r8" ${isLocked ? 'disabled' : ''}></label>
                                    <label class="flex items-center justify-between dark:text-gray-300"><span>PIS:</span><input type="text" class="form-input-text text-sm w-32 cub-input currency-input" data-cub-key="residencial_baixo_pis" ${isLocked ? 'disabled' : ''}></label>
                                </div>
                                <div class="space-y-2">
                                    <h4 class="font-medium text-sm col-span-full mb-1 border-b pb-1 dark:border-slate-600 dark:text-gray-200">Padrão Normal</h4>
                                    <label class="flex items-center justify-between dark:text-gray-300"><span>R-1:</span><input type="text" class="form-input-text text-sm w-32 cub-input currency-input" data-cub-key="residencial_normal_r1" ${isLocked ? 'disabled' : ''}></label>
                                    <label class="flex items-center justify-between dark:text-gray-300"><span>PP-4:</span><input type="text" class="form-input-text text-sm w-32 cub-input currency-input" data-cub-key="residencial_normal_pp4" ${isLocked ? 'disabled' : ''}></label>
                                    <label class="flex items-center justify-between dark:text-gray-300"><span>R-8:</span><input type="text" class="form-input-text text-sm w-32 cub-input currency-input" data-cub-key="residencial_normal_r8" ${isLocked ? 'disabled' : ''}></label>
                                    <label class="flex items-center justify-between dark:text-gray-300"><span>R-16:</span><input type="text" class="form-input-text text-sm w-32 cub-input currency-input" data-cub-key="residencial_normal_r16" ${isLocked ? 'disabled' : ''}></label>
                                </div>
                                <div class="space-y-2">
                                    <h4 class="font-medium text-sm col-span-full mb-1 border-b pb-1 dark:border-slate-600 dark:text-gray-200">Padrão Alto</h4>
                                    <label class="flex items-center justify-between dark:text-gray-300"><span>R-1:</span><input type="text" class="form-input-text text-sm w-32 cub-input currency-input" data-cub-key="residencial_alto_r1" ${isLocked ? 'disabled' : ''}></label>
                                    <label class="flex items-center justify-between dark:text-gray-300"><span>R-8:</span><input type="text" class="form-input-text text-sm w-32 cub-input currency-input" data-cub-key="residencial_alto_r8" ${isLocked ? 'disabled' : ''}></label>
                                    <label class="flex items-center justify-between dark:text-gray-300"><span>R-16:</span><input type="text" class="form-input-text text-sm w-32 cub-input currency-input" data-cub-key="residencial_alto_r16" ${isLocked ? 'disabled' : ''}></label>
                                </div>
                            </div>
                        </fieldset>
                        <fieldset class="border dark:border-slate-600 p-3 rounded-md mb-4">
                            <legend class="text-md font-semibold px-2 dark:text-gray-200">Projetos - Padrão Comerciais CAL e CSL</legend>
                             <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mt-2">
                                <div class="space-y-2">
                                    <h4 class="font-medium text-sm col-span-full mb-1 border-b pb-1 dark:border-slate-600 dark:text-gray-200">Padrão Normal</h4>
                                    <label class="flex items-center justify-between dark:text-gray-300"><span>CAL-8:</span><input type="text" class="form-input-text text-sm w-32 cub-input currency-input" data-cub-key="comercial_normal_cal8" ${isLocked ? 'disabled' : ''}></label>
                                    <label class="flex items-center justify-between dark:text-gray-300"><span>CSL-8:</span><input type="text" class="form-input-text text-sm w-32 cub-input currency-input" data-cub-key="comercial_normal_csl8" ${isLocked ? 'disabled' : ''}></label>
                                    <label class="flex items-center justify-between dark:text-gray-300"><span>CSL-16:</span><input type="text" class="form-input-text text-sm w-32 cub-input currency-input" data-cub-key="comercial_normal_csl16" ${isLocked ? 'disabled' : ''}></label>
                                </div>
                                <div class="space-y-2">
                                    <h4 class="font-medium text-sm col-span-full mb-1 border-b pb-1 dark:border-slate-600 dark:text-gray-200">Padrão Alto</h4>
                                    <label class="flex items-center justify-between dark:text-gray-300"><span>CAL-8:</span><input type="text" class="form-input-text text-sm w-32 cub-input currency-input" data-cub-key="comercial_alto_cal8" ${isLocked ? 'disabled' : ''}></label>
                                    <label class="flex items-center justify-between dark:text-gray-300"><span>CSL-8:</span><input type="text" class="form-input-text text-sm w-32 cub-input currency-input" data-cub-key="comercial_alto_csl8" ${isLocked ? 'disabled' : ''}></label>
                                    <label class="flex items-center justify-between dark:text-gray-300"><span>CSL-16:</span><input type="text" class="form-input-text text-sm w-32 cub-input currency-input" data-cub-key="comercial_alto_csl16" ${isLocked ? 'disabled' : ''}></label>
                                </div>
                            </div>
                        </fieldset>
                         <fieldset class="border dark:border-slate-600 p-3 rounded-md mb-4">
                            <legend class="text-md font-semibold px-2 dark:text-gray-200">Projetos - Padrão Galpão Industrial (GI) e Residência Popular (RP1Q)</legend>
                             <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mt-2">
                                 <div class="space-y-2">
                                    <label class="flex items-center justify-between dark:text-gray-300"><span>RP1Q:</span><input type="text" id="cub-galpao-rp1q" class="form-input-text text-sm w-32 cub-input currency-input" data-cub-key="galpao_rp1q" ${isLocked ? 'disabled' : ''}></label>
                                    <label class="flex items-center justify-between dark:text-gray-300"><span>GI:</span><input type="text" id="cub-galpao-gi" class="form-input-text text-sm w-32 cub-input currency-input" data-cub-key="galpao_gi" ${isLocked ? 'disabled' : ''}></label>
                                </div>
                             </div>
                        </fieldset>
                        <button type="button" id="btn-salvar-cub" class="btn-primary" ${isLocked ? 'disabled' : ''}>Salvar Valores CUB</button>
                    </form>
                </fieldset>
            </div>
        `;
        containerEl.innerHTML = tabHtml;
        await preencherFormularioGeral();
        await preencherFormularioApartamento();
        await renderizarLista(LOCALIZACOES_KEY, 'lista-localizacoes', 'Localização', false, isLocked);
        await renderizarLista(DEPRECIACAO_KEY, 'lista-depreciacao', 'Depreciação', true, isLocked);
        await renderizarLista(TIPO_TERRENO_KEY, 'lista-tipos-terreno', 'Tipo de Terreno', true, isLocked);
        await renderizarLista(URBANO_CONSERVACAO_KEY, 'lista-conservacao', 'Estado de Conservação', true, isLocked);
        await popularDropdownSrfParaValores();
        await carregarValoresCUB();
    }
    
    async function preencherFormularioGeral() {
        const config = await dbRef.getItemById(ITCD_CONFIG_STORE, URBANO_GERAL_KEY);
        const ediculaInput = document.getElementById('percentual-edicula');
        const esquinaInput = document.getElementById('percentual-esquina');
        if (ediculaInput) ediculaInput.value = config?.value?.edicula || 30;
        if (esquinaInput) esquinaInput.value = config?.value?.esquina || 25;
    }
    
    async function preencherFormularioApartamento() {
        const config = await dbRef.getItemById(ITCD_CONFIG_STORE, URBANO_APARTAMENTO_FATORES_KEY);
        const fatores = config?.value || { baixo: 1.5, normal: 2.0, alto: 2.5 };
        const baixoInput = document.getElementById('fator-apto-baixo');
        const normalInput = document.getElementById('fator-apto-normal');
        const altoInput = document.getElementById('fator-apto-alto');
        if (baixoInput) baixoInput.value = fatores.baixo;
        if (normalInput) normalInput.value = fatores.normal;
        if (altoInput) altoInput.value = fatores.alto;
    }

    async function renderizarLista(configKey, containerId, itemNameSingular, hasValue = false, isLocked = true) {
        const containerEl = document.getElementById(containerId);
        if(!containerEl) return;
        
        let defaults = [];
        if (configKey === LOCALIZACOES_KEY) {
            defaults = ['CENTRAL', 'EXCELENTE', 'BOA', 'MÉDIA', 'POPULAR', 'CHÁCARA URBANA', 'PERIFÉRICOS'].map(nome => ({ id: appModuleRef.generateUUID(), nome }));
        } else if (configKey === TIPO_TERRENO_KEY) {
            defaults = [
                { id: appModuleRef.generateUUID(), nome: 'Plano', valor: 100 }, { id: appModuleRef.generateUUID(), nome: 'Em Aclive', valor: 95 },
                { id: appModuleRef.generateUUID(), nome: 'Em Declive', valor: 90 }, { id: appModuleRef.generateUUID(), nome: 'Inundável', valor: 70 }
            ];
        } else if (configKey === DEPRECIACAO_KEY) {
            defaults = [
                { id: appModuleRef.generateUUID(), nome: 'ATÉ 5 ANOS', valor: 100 }, { id: appModuleRef.generateUUID(), nome: '6 A 10 ANOS', valor: 94.50 },
                { id: appModuleRef.generateUUID(), nome: '11 A 15 ANOS', valor: 90.72 }, { id: appModuleRef.generateUUID(), nome: '16 A 20 ANOS', valor: 88.00 },
                { id: appModuleRef.generateUUID(), nome: 'ACIMA DE 20 ANOS', valor: 85.10 }
            ];
        } else if (configKey === URBANO_CONSERVACAO_KEY) {
            defaults = [
                { id: appModuleRef.generateUUID(), nome: 'NOVO', valor: 100.00 },
                { id: appModuleRef.generateUUID(), nome: 'ENTRE NOVO E REGULAR', valor: 99.68 },
                { id: appModuleRef.generateUUID(), nome: 'REGULAR', valor: 97.48 },
                { id: appModuleRef.generateUUID(), nome: 'ENTRE REGULAR E REPAROS SIMPLES', valor: 91.91 },
                { id: appModuleRef.generateUUID(), nome: 'REPAROS SIMPLES', valor: 81.90 },
                { id: appModuleRef.generateUUID(), nome: 'ENTRE REP. SIMPLES E REP. IMPORTANTES', valor: 66.80 },
                { id: appModuleRef.generateUUID(), nome: 'REPAROS IMPORTANTES', valor: 47.40 },
                { id: appModuleRef.generateUUID(), nome: 'ENTRE REP. IMPORTANTES E SEM VALOR', valor: 24.80 },
                { id: appModuleRef.generateUUID(), nome: 'SEM VALOR', valor: 0.00 }
            ];
        }

        const config = await dbRef.getItemById(ITCD_CONFIG_STORE, configKey);
        const items = (config && config.value && config.value.length > 0) ? config.value : defaults;
        items.sort((a,b) => (a.nome || '').localeCompare(b.nome || ''));

        containerEl.innerHTML = '';
        items.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'p-2 border-b dark:border-slate-600 flex justify-between items-center text-sm';
            
            const actionButtonsHtml = isLocked ? '' : `
                <div class="space-x-2 ml-4">
                    <button class="text-xs text-blue-600 hover:underline btn-edit-generic" data-key="${configKey}" data-id="${item.id}">Editar</button>
                    <button class="text-xs text-red-600 hover:underline btn-delete-generic" data-key="${configKey}" data-id="${item.id}">Excluir</button>
                </div>
            `;
            
            itemEl.innerHTML = `
                <div class="flex-grow dark:text-gray-200">${item.nome} ${hasValue ? `<span class="text-xs text-gray-500 dark:text-gray-400">(${item.valor}%)</span>` : ''}</div>
                ${actionButtonsHtml}
            `;
            containerEl.appendChild(itemEl);
        });
    }
    
    async function popularDropdownSrfParaValores() {
        const selectEl = document.getElementById('srf-cidade-select');
        if (!selectEl) return;
        try {
            const config = await dbRef.getItemById(ITCD_CONFIG_STORE, SRF_CIDADES_KEY);
            const superintendencias = config?.value || [];
            selectEl.innerHTML = '<option value="">-- Selecione uma SRF --</option>';
            superintendencias.sort((a,b) => a.nome.localeCompare(b.nome)).forEach(srf => {
                selectEl.innerHTML += `<option value="${srf.id}">${srf.nome}</option>`;
            });
        } catch(e) {
            selectEl.innerHTML = '<option value="">Erro ao carregar SRFs</option>';
        }
    }

    async function popularDropdownCidadesParaValores(srfId) {
        const selectEl = document.getElementById('cidade-valor-select');
        const containerValores = document.getElementById('container-valores-cidade');
        const btnReajuste = document.getElementById('btn-reajustar-valores-urbano');
        
        if (!selectEl) return;
        
        containerValores.classList.add('hidden');
        selectEl.innerHTML = '<option value="">-- Selecione uma cidade --</option>';

        if (!srfId) {
            selectEl.disabled = true;
            btnReajuste.disabled = true;
            return;
        }

        try {
            const config = await dbRef.getItemById(ITCD_CONFIG_STORE, SRF_CIDADES_KEY);
            const srf = config?.value?.find(s => s.id === srfId);
            if (srf && srf.cidades && srf.cidades.length > 0) {
                srf.cidades.sort((a,b) => a.nome.localeCompare(b.nome)).forEach(cidade => {
                    selectEl.innerHTML += `<option value="${cidade.id}">${cidade.nome}</option>`;
                });
                selectEl.disabled = false;
                btnReajuste.disabled = false;
            } else {
                selectEl.innerHTML = '<option value="">Nenhuma cidade cadastrada</option>';
                selectEl.disabled = true;
                btnReajuste.disabled = true;
            }
        } catch(e) {
            selectEl.innerHTML = '<option value="">Erro ao carregar cidades</option>';
            btnReajuste.disabled = true;
        }
    }

    async function renderCamposDeValores(srfId, cidadeId) {
        const container = document.getElementById('container-valores-cidade');
        if (!srfId || !cidadeId) {
            container.classList.add('hidden');
            container.innerHTML = '';
            return;
        }

        container.classList.remove('hidden');
        container.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400">Carregando campos...</p>';

        try {
            const [configSrf, configLocalizacoes] = await Promise.all([
                dbRef.getItemById(ITCD_CONFIG_STORE, SRF_CIDADES_KEY),
                dbRef.getItemById(ITCD_CONFIG_STORE, LOCALIZACOES_KEY)
            ]);
            
            const cidade = configSrf?.value?.find(s => s.id === srfId)?.cidades.find(c => c.id === cidadeId);
            const localizacoesDefault = ['CENTRAL', 'EXCELENTE', 'BOA', 'MÉDIA', 'POPULAR', 'CHÁCARA URBANA', 'PERIFÉRICOS'].map(nome => ({ id: appModuleRef.generateUUID(), nome }));
            const localizacoes = (configLocalizacoes && configLocalizacoes.value && configLocalizacoes.value.length > 0) ? configLocalizacoes.value : localizacoesDefault;

            if (!cidade) {
                container.innerHTML = '<p class="text-sm text-red-500">Cidade não encontrada.</p>';
                return;
            }

            const valoresHtml = localizacoes.map(loc => `
                <div class="flex items-center gap-2">
                    <label class="text-sm w-32 truncate dark:text-gray-300" title="${loc.nome}">${loc.nome}:</label>
                    <input type="text" class="form-input-text text-sm city-value-input currency-input" 
                           data-localizacao-nome="${loc.nome}" 
                           value="${formatToBRL(cidade.valoresUrbanos?.[loc.nome] || 0)}">
                </div>
            `).join('');

            container.innerHTML = `
                <div class="space-y-2">${valoresHtml}</div>
                <div class="mt-4">
                    <button id="btn-salvar-valores-cidade" class="btn-primary" data-srf-id="${srfId}" data-cidade-id="${cidadeId}">Salvar Valores para esta Cidade</button>
                </div>
            `;
            
            container.querySelectorAll('.currency-input').forEach(input => {
                input.addEventListener('focus', (e) => {
                     const value = parseFromBRL(e.target.value);
                     e.target.value = (value !== 0) ? value.toFixed(2).replace('.', ',') : '';
                });
                input.addEventListener('blur', (e) => {
                    e.target.value = formatToBRL(parseFromBRL(e.target.value));
                });
            });

        } catch (error) {
            container.innerHTML = '<p class="text-sm text-red-500">Erro ao renderizar campos.</p>';
        }
    }

    async function handleSalvarValoresDaCidade(srfId, cidadeId) {
        const container = document.getElementById('container-valores-cidade');
        const novosValores = {};
        container.querySelectorAll('.city-value-input').forEach(input => {
            const nomeLocalizacao = input.dataset.localizacaoNome;
            const valor = parseFromBRL(input.value);
            novosValores[nomeLocalizacao] = valor;
        });

        try {
            const config = await dbRef.getItemById(ITCD_CONFIG_STORE, SRF_CIDADES_KEY);
            const srf = config?.value?.find(s => s.id === srfId);
            const cidade = srf?.cidades.find(c => c.id === cidadeId);
            if (cidade) {
                cidade.valoresUrbanos = novosValores;
                await dbRef.updateItem(ITCD_CONFIG_STORE, config);
                uiModuleRef.showToastNotification('Valores de referência para a cidade salvos com sucesso!', 'success');
            } else {
                throw new Error("Cidade não encontrada para salvar os valores.");
            }
        } catch (error) {
             console.error("Erro ao salvar valores da cidade:", error);
            uiModuleRef.showToastNotification("Falha ao salvar valores.", "error");
        }
    }
    
    async function abrirModalReajusteUrbano() {
        const srfSelect = document.getElementById('srf-cidade-select');
        const srfId = srfSelect.value;
        if (!srfId) {
            uiModuleRef.showToastNotification("Selecione uma SRF para reajustar valores.", "warning");
            return;
        }

        const config = await dbRef.getItemById(ITCD_CONFIG_STORE, SRF_CIDADES_KEY);
        const srf = config?.value?.find(s => s.id === srfId);
        const cidades = srf?.cidades || [];
        cidades.sort((a, b) => a.nome.localeCompare(b.nome));

        const cidadesHtml = cidades.map(cidade => `
            <label class="block p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-600 dark:text-gray-300">
                <input type="checkbox" value="${cidade.id}" class="form-checkbox modal-cidade-checkbox">
                <span class="ml-2 text-sm">${cidade.nome}</span>
            </label>
        `).join('');

        const modalContent = `
            <div id="feedback-reajuste-modal"></div>
            <p class="text-sm mb-3 dark:text-gray-300">Selecione as cidades e informe o percentual de reajuste. Use valores negativos para redução (ex: -5 para reduzir 5%).</p>
            <div class="mb-3">
                <input type="search" id="modal-cidade-search" class="form-input-text w-full text-sm" placeholder="Pesquisar cidades...">
            </div>
            <div class="max-h-60 overflow-y-auto border p-2 rounded-md mb-3 dark:border-slate-600" id="modal-cidade-list">
                ${cidadesHtml || '<p class="text-sm text-center text-gray-500">Nenhuma cidade nesta SRF.</p>'}
            </div>
            <div class="mb-4">
                <label class="flex items-center dark:text-gray-300">
                    <input type="checkbox" id="modal-select-all-cidades" class="form-checkbox">
                    <span class="ml-2 text-sm">Selecionar Todas / Nenhuma</span>
                </label>
            </div>
            <div>
                <label for="modal-reajuste-percent" class="block text-sm font-medium dark:text-gray-300">Percentual de Reajuste (%):</label>
                <input type="number" id="modal-reajuste-percent" step="0.1" class="form-input-text mt-1 w-full md:w-1/2" placeholder="Ex: 10 ou -5">
            </div>
        `;
        
        uiModuleRef.showModal(`Reajuste de Valores Urbanos - ${srf.nome}`, modalContent, [
            { text: 'Cancelar', class: 'btn-secondary', closesModal: true },
            { text: 'Aplicar Reajuste', class: 'btn-primary', callback: () => {
                handleAplicarReajusteUrbano(srfId);
                return false;
            }}
        ]);
        
        const modal = document.querySelector('.fixed.inset-0');
        modal.querySelector('#modal-cidade-search').addEventListener('input', e => {
            const searchTerm = e.target.value.toLowerCase();
            modal.querySelectorAll('#modal-cidade-list label').forEach(label => {
                const cityName = label.textContent.toLowerCase();
                label.style.display = cityName.includes(searchTerm) ? 'block' : 'none';
            });
        });
        modal.querySelector('#modal-select-all-cidades').addEventListener('change', e => {
            modal.querySelectorAll('.modal-cidade-checkbox').forEach(cb => {
                if(cb.closest('label').style.display !== 'none') {
                    cb.checked = e.target.checked;
                }
            });
        });
    }

    async function handleAplicarReajusteUrbano(srfId) {
        const feedbackEl = document.getElementById('feedback-reajuste-modal');
        const percentualInput = document.getElementById('modal-reajuste-percent');
        const percentual = parseFloat(percentualInput.value);

        if (isNaN(percentual)) {
            feedbackEl.innerHTML = '<p class="text-sm text-red-500">Por favor, insira um percentual válido.</p>';
            return;
        }

        const selectedCidadesIds = Array.from(document.querySelectorAll('.modal-cidade-checkbox:checked')).map(cb => cb.value);
        if (selectedCidadesIds.length === 0) {
            feedbackEl.innerHTML = '<p class="text-sm text-red-500">Selecione ao menos uma cidade.</p>';
            return;
        }

        uiModuleRef.showLoading(true, "Aplicando reajuste...");
        try {
            const config = await dbRef.getItemById(ITCD_CONFIG_STORE, SRF_CIDADES_KEY);
            const srf = config?.value?.find(s => s.id === srfId);
            if (!srf) throw new Error("SRF não encontrada no banco de dados.");

            const fatorReajuste = 1 + (percentual / 100);
            
            srf.cidades.forEach(cidade => {
                if (selectedCidadesIds.includes(cidade.id)) {
                    Object.keys(cidade.valoresUrbanos).forEach(localizacao => {
                        const valorAntigo = cidade.valoresUrbanos[localizacao] || 0;
                        cidade.valoresUrbanos[localizacao] = valorAntigo * fatorReajuste;
                    });
                }
            });

            await dbRef.updateItem(ITCD_CONFIG_STORE, config);
            uiModuleRef.showToastNotification("Reajuste aplicado com sucesso!", "success");
            uiModuleRef.closeModal();

            const cidadeSelect = document.getElementById('cidade-valor-select');
            if(cidadeSelect.value) {
                renderCamposDeValores(srfId, cidadeSelect.value);
            }

        } catch (error) {
            console.error("Erro ao aplicar reajuste:", error);
            uiModuleRef.showToastNotification(`Falha ao aplicar reajuste: ${error.message}`, "error");
        } finally {
            uiModuleRef.showLoading(false);
        }
    }

    async function handleGenericListActions(button) {
        if (!button) return;

        const { key, id } = button.dataset;
        const config = await dbRef.getItemById(ITCD_CONFIG_STORE, key);
        
        let defaults = [];
        if (key === LOCALIZACOES_KEY) defaults = ['CENTRAL', 'EXCELENTE', 'BOA', 'MÉDIA', 'POPULAR', 'CHÁCARA URBANA', 'PERIFÉRICOS'].map(nome => ({ id: appModuleRef.generateUUID(), nome }));
        else if (key === TIPO_TERRENO_KEY) defaults = [{ id: appModuleRef.generateUUID(), nome: 'Plano', valor: 100 }, { id: appModuleRef.generateUUID(), nome: 'Em Aclive', valor: 95 }, { id: appModuleRef.generateUUID(), nome: 'Em Declive', valor: 90 }, { id: appModuleRef.generateUUID(), nome: 'Inundável', valor: 70 }];
        else if (key === DEPRECIACAO_KEY) defaults = [{ id: appModuleRef.generateUUID(), nome: 'ATÉ 5 ANOS', valor: 100 }, { id: appModuleRef.generateUUID(), nome: '6 A 10 ANOS', valor: 94.50 }, { id: appModuleRef.generateUUID(), nome: '11 A 15 ANOS', valor: 90.72 }, { id: appModuleRef.generateUUID(), nome: '16 A 20 ANOS', valor: 88.00 }, { id: appModuleRef.generateUUID(), nome: 'ACIMA DE 20 ANOS', valor: 85.10 }];
        else if (key === URBANO_CONSERVACAO_KEY) defaults = [{id:appModuleRef.generateUUID(),nome:"NOVO",valor:100},{id:appModuleRef.generateUUID(),nome:"ENTRE NOVO E REGULAR",valor:99.68},{id:appModuleRef.generateUUID(),nome:"REGULAR",valor:97.48},{id:appModuleRef.generateUUID(),nome:"ENTRE REGULAR E REPAROS SIMPLES",valor:91.91},{id:appModuleRef.generateUUID(),nome:"REPAROS SIMPLES",valor:81.9},{id:appModuleRef.generateUUID(),nome:"ENTRE REP. SIMPLES E REP. IMPORTANTES",valor:66.8},{id:appModuleRef.generateUUID(),nome:"REPAROS IMPORTANTES",valor:47.4},{id:appModuleRef.generateUUID(),nome:"ENTRE REP. IMPORTANTES E SEM VALOR",valor:24.8},{id:appModuleRef.generateUUID(),nome:"SEM VALOR",valor:0}];
        
        let currentItems = (config && config.value && config.value.length > 0) ? config.value : defaults;
        let configChanged = false;

        const itemIndex = currentItems.findIndex(i => i.id === id);
        if (itemIndex > -1) {
            const item = currentItems[itemIndex];
            if (button.classList.contains('btn-edit-generic')) {
                const novoNome = await uiModuleRef.showPromptModal(`Editar Nome`, "Novo nome:", 'text', item.nome);
                if (novoNome && novoNome.trim() !== item.nome) {
                    item.nome = novoNome.trim();
                    configChanged = true;
                }
                if (item.hasOwnProperty('valor')) {
                    const novoValorStr = await uiModuleRef.showPromptModal(`Editar Valor (%)`, "Novo valor:", 'number', item.valor);
                    const novoValor = parseFloat(novoValorStr);
                    if (novoValorStr !== null && !isNaN(novoValor) && novoValor !== item.valor) {
                        item.valor = novoValor;
                        configChanged = true;
                    }
                }
            } else if (button.classList.contains('btn-delete-generic')) {
                currentItems.splice(itemIndex, 1);
                configChanged = true;
            }
        }

        if (configChanged) {
            await dbRef.updateItem(ITCD_CONFIG_STORE, { key, value: currentItems });
            await renderizarLista(key, button.closest('.section-box').querySelector('[id^="lista-"]').id, '', 'valor' in (currentItems[0] || {}), false);
        }
    }

    async function addNovoItemGenerico(configKey, nomeInputId, valorInputId, containerId, itemName, hasValue) {
        const nomeInput = document.getElementById(nomeInputId);
        const nome = nomeInput.value.trim();
        if (!nome) return;

        let valor = null;
        if (hasValue) {
            const valorInput = document.getElementById(valorInputId);
            valor = parseFloat(valorInput.value);
            if (isNaN(valor)) {
                uiModuleRef.showToastNotification(`Valor de ${itemName} inválido.`, 'error');
                return;
            }
            valorInput.value = '';
        }
        
        let defaults = [];
        if (configKey === LOCALIZACOES_KEY) defaults = ['CENTRAL', 'EXCELENTE', 'BOA', 'MÉDIA', 'POPULAR', 'CHÁCARA URBANA', 'PERIFÉRICOS'].map(n => ({ id: appModuleRef.generateUUID(), nome: n }));
        else if (configKey === TIPO_TERRENO_KEY) defaults = [{ id: appModuleRef.generateUUID(), nome: 'Plano', valor: 100 }, { id: appModuleRef.generateUUID(), nome: 'Em Aclive', valor: 95 }, { id: appModuleRef.generateUUID(), nome: 'Em Declive', valor: 90 }, { id: appModuleRef.generateUUID(), nome: 'Inundável', valor: 70 }];
        else if (configKey === DEPRECIACAO_KEY) defaults = [{ id: appModuleRef.generateUUID(), nome: 'ATÉ 5 ANOS', valor: 100 }, { id: appModuleRef.generateUUID(), nome: '6 A 10 ANOS', valor: 94.50 }, { id: appModuleRef.generateUUID(), nome: '11 A 15 ANOS', valor: 90.72 }, { id: appModuleRef.generateUUID(), nome: '16 A 20 ANOS', valor: 88.00 }, { id: appModuleRef.generateUUID(), nome: 'ACIMA DE 20 ANOS', valor: 85.10 }];
        else if (configKey === URBANO_CONSERVACAO_KEY) defaults = [{id:appModuleRef.generateUUID(),nome:"NOVO",valor:100},{id:appModuleRef.generateUUID(),nome:"ENTRE NOVO E REGULAR",valor:99.68},{id:appModuleRef.generateUUID(),nome:"REGULAR",valor:97.48},{id:appModuleRef.generateUUID(),nome:"ENTRE REGULAR E REPAROS SIMPLES",valor:91.91},{id:appModuleRef.generateUUID(),nome:"REPAROS SIMPLES",valor:81.9},{id:appModuleRef.generateUUID(),nome:"ENTRE REP. SIMPLES E REP. IMPORTANTES",valor:66.8},{id:appModuleRef.generateUUID(),nome:"REPAROS IMPORTANTES",valor:47.4},{id:appModuleRef.generateUUID(),nome:"ENTRE REP. IMPORTANTES E SEM VALOR",valor:24.8},{id:appModuleRef.generateUUID(),nome:"SEM VALOR",valor:0}];
        
        const config = await dbRef.getItemById(ITCD_CONFIG_STORE, configKey);
        let currentItems = (config && config.value && config.value.length > 0) ? config.value : defaults;

        const newItem = { id: appModuleRef.generateUUID(), nome };
        if (hasValue) newItem.valor = valor;
        currentItems.push(newItem);

        await dbRef.updateItem(ITCD_CONFIG_STORE, { key: configKey, value: currentItems });
        nomeInput.value = '';
        await renderizarLista(configKey, containerId, itemName, hasValue, false);
    }
    
    async function carregarValoresCUB() {
        try {
            const config = await dbRef.getItemById(ITCD_CONFIG_STORE, CUB_KEY);
            if (config && config.value) {
                document.getElementById('cub-reference-date').value = config.value.referenceDate || '';
                document.querySelectorAll('.cub-input').forEach(input => {
                    const key = input.dataset.cubKey;
                    if (config.value[key] !== undefined) {
                        input.value = formatToBRL(config.value[key]);
                    }
                });
            }
        } catch (error) {
            console.error("Erro ao carregar valores CUB:", error);
            uiModuleRef.showToastNotification("Falha ao carregar os valores CUB salvos.", "error");
        }
    }

    function addEventListeners(containerEl) {
        containerEl.addEventListener('click', (e) => {
            const target = e.target;
            const targetIsDisabled = target.disabled || target.closest(':disabled');
            
            if (targetIsDisabled) return;
            
            if (target.id === 'btn-salvar-urbano-geral') {
                const edicula = parseFloat(document.getElementById('percentual-edicula').value) || 30;
                const esquina = parseFloat(document.getElementById('percentual-esquina').value) || 25;
                const config = { key: URBANO_GERAL_KEY, value: { edicula, esquina } };
                dbRef.updateItem(ITCD_CONFIG_STORE, config).then(() => uiModuleRef.showToastNotification('Parâmetros gerais salvos.', 'success'));
            }
            if (target.id === 'btn-salvar-urbano-apto') { 
                const baixo = parseFloat(document.getElementById('fator-apto-baixo').value) || 1.5;
                const normal = parseFloat(document.getElementById('fator-apto-normal').value) || 2.0;
                const alto = parseFloat(document.getElementById('fator-apto-alto').value) || 2.5;
                const config = { key: URBANO_APARTAMENTO_FATORES_KEY, value: { baixo, normal, alto } };
                dbRef.updateItem(ITCD_CONFIG_STORE, config).then(() => uiModuleRef.showToastNotification('Fatores de apartamento salvos.', 'success'));
            }
            if (target.id === 'btn-adicionar-localizacao') {
                addNovoItemGenerico(LOCALIZACOES_KEY, 'input-nova-localizacao', null, 'lista-localizacoes', 'Localização', false);
            }
            if (target.id === 'btn-adicionar-tipo-terreno') {
                addNovoItemGenerico(TIPO_TERRENO_KEY, 'input-novo-tipo-terreno-nome', 'input-novo-tipo-terreno-percent', 'lista-tipos-terreno', 'Tipo de Terreno', true);
            }
            if (target.id === 'btn-adicionar-depreciacao') {
                addNovoItemGenerico(DEPRECIACAO_KEY, 'input-nova-depreciacao-nome', 'input-nova-depreciacao-percent', 'lista-depreciacao', 'Depreciação', true);
            }
            if (target.id === 'btn-adicionar-conservacao') {
                addNovoItemGenerico(URBANO_CONSERVACAO_KEY, 'input-nova-conservacao-nome', 'input-nova-conservacao-percent', 'lista-conservacao', 'Estado de Conservação', true);
            }
            if (target.id === 'btn-salvar-valores-cidade') {
                const { srfId, cidadeId } = target.dataset;
                handleSalvarValoresDaCidade(srfId, cidadeId);
            }
            if (target.id === 'btn-reajustar-valores-urbano') {
                abrirModalReajusteUrbano();
            }
            if (target.id === 'btn-salvar-cub') {
                 const valores = {
                    referenceDate: document.getElementById('cub-reference-date').value
                 };
                 document.querySelectorAll('.cub-input').forEach(input => {
                    valores[input.dataset.cubKey] = parseFromBRL(input.value);
                 });
                 dbRef.updateItem(ITCD_CONFIG_STORE, { key: CUB_KEY, value: valores }).then(() => uiModuleRef.showToastNotification('Valores CUB salvos com sucesso.', 'success'));
            }
            
            const genericButton = target.closest('.btn-edit-generic, .btn-delete-generic');
            if (genericButton) {
                handleGenericListActions(genericButton);
            }
        });
        
        const srfSelect = containerEl.querySelector('#srf-cidade-select');
        srfSelect?.addEventListener('change', () => popularDropdownCidadesParaValores(srfSelect.value));

        const cidadeSelect = containerEl.querySelector('#cidade-valor-select');
        cidadeSelect?.addEventListener('change', () => renderCamposDeValores(srfSelect.value, cidadeSelect.value));

        containerEl.querySelectorAll('.cub-input.currency-input').forEach(input => {
            input.addEventListener('blur', (e) => { e.target.value = formatToBRL(parseFromBRL(e.target.value)); });
            input.addEventListener('focus', (e) => {
                const value = parseFromBRL(e.target.value);
                e.target.value = (value !== 0) ? value.toFixed(2).replace('.', ',') : '';
            });
        });
    }

    return {
        init,
        renderTabContent,
        addEventListeners
    };
})();