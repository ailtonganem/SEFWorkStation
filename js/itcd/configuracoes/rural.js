// js/itcd/configuracoes/rural.js - Módulo para a aba de Configurações de Imóvel Rural (ITCD)
// v2.1.0 - CORRIGIDO: Garante que todos os campos e botões de edição/adição sejam desabilitados quando as configurações estão bloqueadas (isLocked=true).
// v2.0.0 - ADICIONADO: Respeita o estado de bloqueio do administrador, desabilitando campos e botões quando travado.
// v1.8.0 - Adiciona funcionalidade de reajuste em lote para valores de referência por cidade.
// v1.7.0 - CORRIGIDO: Adiciona classes de cor para texto no tema escuro, resolvendo problemas de contraste.
// v1.6.0 - REMOVIDO: Seção de Valor do m² por Padrão de Construção.
// v1.5.1 - CORRIGIDO: Adiciona tratamento para dados legados no formato de objeto em `renderValorConstrucao`.
// v1.5.0 - Torna os Padrões de Construção e seus valores totalmente editáveis.
// v1.4.0 - Adiciona seções para configurar percentuais de ajuste para Tipo de Imóvel e Localização.
// v1.3.0 - Adiciona configuração de percentual para Recursos Hídricos e padroniza lista de Qualidade da Terra.
// v1.2.0 - REFATORADO: Adiciona seção para definir valores de hectare por cidade.
// v1.1.0 - Adiciona seção para definir valores de hectare por cidade.
// v1.0.0 - Criação do módulo.

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ITCD = window.SEFWorkStation.ITCD || {};
window.SEFWorkStation.ITCD.Configuracoes = window.SEFWorkStation.ITCD.Configuracoes || {};

window.SEFWorkStation.ITCD.Configuracoes.Rural = (function() {

    let dbRef;
    let appModuleRef;
    let uiModuleRef;

    const ITCD_CONFIG_STORE = 'itcdConfiguracoesStore';
    const SRF_CIDADES_KEY = 'srfCidades';
    const RURAL_GERAL_KEY = 'ruralGeralConfig';

    const QUALIDADES_PADRAO = [
        { nome: 'Classe A', desc: 'Terras que não apresentam limitações significativas para a produção de lavouras.' },
        { nome: 'Classe B', desc: 'Terras que apresentam limitações moderadas para a produção de lavouras.' },
        { nome: 'Classe C', desc: 'Terras que apresentam limitações fortes para a produção de lavouras, sendo aptas para pastagens.' },
        { nome: 'Classe D', desc: 'Terras inaptas para a produção de lavouras, mas aptas para silvicultura ou pastagem natural.' },
        { nome: 'Classe E', desc: 'Terras com restrições muito fortes, inaptas para uso agrosilvopastoril (matas, preservação, etc.).' }
    ];

    function init(db, app, ui) {
        dbRef = db;
        appModuleRef = app;
        uiModuleRef = ui;
    }

    function formatBRL(value) {
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
                        <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100 config-section-title">Parâmetros Gerais Rurais</h3>
                        <div class="space-y-4" id="form-rural-geral">
                            <div>
                                <label for="percentual-recursos-hidricos" class="block text-sm font-medium dark:text-gray-300">Majoração por Recursos Hídricos (%):</label>
                                <input type="number" id="percentual-recursos-hidricos" step="0.1" class="form-input-text mt-1 text-sm w-full md:w-1/2" ${isLocked ? 'disabled' : ''}>
                                <p class="text-xs text-gray-500 mt-1 dark:text-gray-400">Percentual de acréscimo no valor do hectare. Padrão: 10%.</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="section-box p-4 border dark:border-slate-700 rounded-lg">
                        <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100 config-section-title">Tipos de Qualidade de Hectare (Padrão)</h3>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">Esta é a lista padrão utilizada no formulário de avaliação. Não é editável.</p>
                        <div id="lista-qualidade-ha" class="space-y-1"></div>
                    </div>
                 </fieldset>

                <fieldset class="grid grid-cols-1 lg:grid-cols-2 gap-6 itcd-config-fieldset">
                    <div class="section-box p-4 border dark:border-slate-700 rounded-lg">
                        <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100 config-section-title">Ajuste por Tipo de Imóvel</h3>
                        <div id="container-tipo-imovel" class="space-y-3"></div>
                    </div>
                     <div class="section-box p-4 border dark:border-slate-700 rounded-lg">
                        <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100 config-section-title">Ajuste por Localização</h3>
                        <div id="container-localizacao" class="space-y-3"></div>
                    </div>
                </fieldset>

                <fieldset class="section-box p-4 border dark:border-slate-700 rounded-lg itcd-config-fieldset">
                    <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100 config-section-title">Valores de Referência por Cidade (hectare)</h3>
                    <div class="flex flex-col md:flex-row items-end gap-4 mb-4">
                        <div class="w-full md:w-1/3">
                             <label for="srf-cidade-select-rural" class="block text-sm font-medium dark:text-gray-300">Superintendência:</label>
                             <select id="srf-cidade-select-rural" class="form-input-text mt-1 text-sm" ${isLocked ? 'disabled' : ''}></select>
                        </div>
                        <div class="w-full md:w-1/3">
                            <label for="cidade-valor-select-rural" class="block text-sm font-medium dark:text-gray-300">Cidade:</label>
                            <select id="cidade-valor-select-rural" class="form-input-text mt-1 text-sm" disabled><option>Selecione uma SRF</option></select>
                        </div>
                        <div class="w-full md:w-auto">
                            <button id="btn-reajustar-valores-rural" class="btn-secondary w-full" disabled ${isLocked ? 'disabled' : ''}>Reajustar Valores</button>
                        </div>
                    </div>
                    <div id="container-valores-cidade-rural" class="hidden p-4 mt-4 border dark:border-slate-600 rounded-md bg-white dark:bg-slate-800"></div>
                </fieldset>
                 <div class="mt-6 flex justify-end">
                    <button id="btn-salvar-configuracoes-rurais" class="btn-primary" ${isLocked ? 'disabled' : ''}>Salvar Todas as Configurações Rurais</button>
                </div>
            </div>
        `;
        containerEl.innerHTML = tabHtml;
        await preencherFormularioGeral(isLocked);
        await renderizarListaQualidade();
        await popularDropdownSrfParaValores();
    }
    
    async function preencherFormularioGeral(isLocked) {
        const config = await dbRef.getItemById(ITCD_CONFIG_STORE, RURAL_GERAL_KEY);
        const configData = config?.value || {};
        
        document.getElementById('percentual-recursos-hidricos').value = configData.recursosHidricos || 10;
        
        const tipoImovelContainer = document.getElementById('container-tipo-imovel');
        const tiposPadrao = { 'CHÁCARA/GLEBA': 100, 'FAZENDA': 0, 'SÍTIO': 50 };
        const tiposSalvos = configData.tipoImovel || tiposPadrao;
        tipoImovelContainer.innerHTML = Object.keys(tiposSalvos).map(key => `
            <div>
                <label for="percentual-tipo-${key.replace(/[/ ]/g, '')}" class="block text-sm font-medium dark:text-gray-300">${key} (%):</label>
                <input type="number" id="percentual-tipo-${key.replace(/[/ ]/g, '')}" data-key="${key}" class="form-input-text mt-1 text-sm w-full md:w-1/2 rural-geral-field tipo-imovel-field" value="${tiposSalvos[key]}" ${isLocked ? 'disabled' : ''}>
            </div>
        `).join('');

        const localizacaoContainer = document.getElementById('container-localizacao');
        const localizacaoPadrao = { 'BOA': 25, 'MÉDIA': 0, 'RUIM': -25 };
        const localizacaoSalva = configData.localizacao || localizacaoPadrao;
        localizacaoContainer.innerHTML = Object.keys(localizacaoSalva).map(key => `
            <div>
                <label for="percentual-loc-${key}" class="block text-sm font-medium dark:text-gray-300">${key} (%):</label>
                <input type="number" id="percentual-loc-${key}" data-key="${key}" class="form-input-text mt-1 text-sm w-full md:w-1/2 rural-geral-field localizacao-field" value="${localizacaoSalva[key]}" ${isLocked ? 'disabled' : ''}>
            </div>
        `).join('');
    }

    async function renderizarListaQualidade() {
        const containerEl = document.getElementById('lista-qualidade-ha');
        if(!containerEl) return;
        
        containerEl.innerHTML = '';
        QUALIDADES_PADRAO.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'p-1.5 border-b dark:border-slate-700/50 flex items-center text-sm';
            itemEl.innerHTML = `<span class="font-medium w-24 dark:text-gray-200">${item.nome}:</span> <span class="text-gray-600 dark:text-gray-300">${item.desc}</span>`;
            containerEl.appendChild(itemEl);
        });
    }

    async function popularDropdownSrfParaValores() {
        const selectEl = document.getElementById('srf-cidade-select-rural');
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
        const selectEl = document.getElementById('cidade-valor-select-rural');
        const containerValores = document.getElementById('container-valores-cidade-rural');
        const btnReajuste = document.getElementById('btn-reajustar-valores-rural');

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
        const container = document.getElementById('container-valores-cidade-rural');
        if (!srfId || !cidadeId) {
            container.classList.add('hidden');
            container.innerHTML = '';
            return;
        }

        container.classList.remove('hidden');
        container.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400">Carregando campos...</p>';

        try {
            const configSrf = await dbRef.getItemById(ITCD_CONFIG_STORE, SRF_CIDADES_KEY);
            const cidade = configSrf?.value?.find(s => s.id === srfId)?.cidades.find(c => c.id === cidadeId);

            if (!cidade) {
                container.innerHTML = '<p class="text-sm text-red-500">Cidade não encontrada.</p>';
                return;
            }

            const valoresRuraisHtml = QUALIDADES_PADRAO.map(qual => `
                <div class="flex items-center gap-2">
                    <label class="text-sm w-32 truncate dark:text-gray-300" title="${qual.desc}">${qual.nome}:</label>
                    <input type="text" class="form-input-text text-sm city-value-input currency-input" 
                           data-chave-valor="${qual.nome}" 
                           value="${formatBRL(cidade.valoresRurais?.[qual.nome] || 0)}">
                </div>
            `).join('');

            container.innerHTML = `
                <div class="space-y-2">${valoresRuraisHtml}</div>
                <div class="mt-4">
                    <button id="btn-salvar-valores-cidade-rural" class="btn-primary" data-srf-id="${srfId}" data-cidade-id="${cidadeId}">Salvar Valores para esta Cidade</button>
                </div>
            `;
            
            container.querySelectorAll('.currency-input').forEach(input => {
                input.addEventListener('focus', (e) => {
                     const value = parseFromBRL(e.target.value);
                     e.target.value = (value !== 0) ? value.toFixed(2).replace('.', ',') : '';
                });
                input.addEventListener('blur', (e) => {
                    e.target.value = formatBRL(parseFromBRL(e.target.value));
                });
            });

        } catch (error) {
            container.innerHTML = '<p class="text-sm text-red-500">Erro ao renderizar campos.</p>';
        }
    }

    async function handleSalvarValoresDaCidade(srfId, cidadeId) {
        const container = document.getElementById('container-valores-cidade-rural');
        const novosValores = {};
        container.querySelectorAll('.city-value-input').forEach(input => {
            const chave = input.dataset.chaveValor;
            const valor = parseFromBRL(input.value);
            novosValores[chave] = valor;
        });

        try {
            const config = await dbRef.getItemById(ITCD_CONFIG_STORE, SRF_CIDADES_KEY);
            const srf = config?.value?.find(s => s.id === srfId);
            const cidade = srf?.cidades.find(c => c.id === cidadeId);
            if (cidade) {
                cidade.valoresRurais = novosValores;
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

    async function abrirModalReajusteRural() {
        const srfSelect = document.getElementById('srf-cidade-select-rural');
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
                <input type="checkbox" value="${cidade.id}" class="form-checkbox modal-cidade-checkbox-rural">
                <span class="ml-2 text-sm">${cidade.nome}</span>
            </label>
        `).join('');

        const modalContent = `
            <div id="feedback-reajuste-modal-rural"></div>
            <p class="text-sm mb-3 dark:text-gray-300">Selecione as cidades e informe o percentual de reajuste para os valores do hectare.</p>
            <div class="mb-3">
                <input type="search" id="modal-cidade-search-rural" class="form-input-text w-full text-sm" placeholder="Pesquisar cidades...">
            </div>
            <div class="max-h-60 overflow-y-auto border p-2 rounded-md mb-3 dark:border-slate-600" id="modal-cidade-list-rural">
                ${cidadesHtml || '<p class="text-sm text-center text-gray-500">Nenhuma cidade nesta SRF.</p>'}
            </div>
            <div class="mb-4">
                <label class="flex items-center dark:text-gray-300">
                    <input type="checkbox" id="modal-select-all-cidades-rural" class="form-checkbox">
                    <span class="ml-2 text-sm">Selecionar Todas / Nenhuma</span>
                </label>
            </div>
            <div>
                <label for="modal-reajuste-percent-rural" class="block text-sm font-medium dark:text-gray-300">Percentual de Reajuste (%):</label>
                <input type="number" id="modal-reajuste-percent-rural" step="0.1" class="form-input-text mt-1 w-full md:w-1/2" placeholder="Ex: 10 ou -5">
            </div>
        `;
        
        uiModuleRef.showModal(`Reajuste de Valores Rurais - ${srf.nome}`, modalContent, [
            { text: 'Cancelar', class: 'btn-secondary', closesModal: true },
            { text: 'Aplicar Reajuste', class: 'btn-primary', callback: () => {
                handleAplicarReajusteRural(srfId);
                return false; 
            }}
        ]);
        
        const modal = document.querySelector('.fixed.inset-0');
        modal.querySelector('#modal-cidade-search-rural').addEventListener('input', e => {
            const searchTerm = e.target.value.toLowerCase();
            modal.querySelectorAll('#modal-cidade-list-rural label').forEach(label => {
                const cityName = label.textContent.toLowerCase();
                label.style.display = cityName.includes(searchTerm) ? 'block' : 'none';
            });
        });
        modal.querySelector('#modal-select-all-cidades-rural').addEventListener('change', e => {
            modal.querySelectorAll('.modal-cidade-checkbox-rural').forEach(cb => {
                if(cb.closest('label').style.display !== 'none') {
                    cb.checked = e.target.checked;
                }
            });
        });
    }

    async function handleAplicarReajusteRural(srfId) {
        const feedbackEl = document.getElementById('feedback-reajuste-modal-rural');
        const percentualInput = document.getElementById('modal-reajuste-percent-rural');
        const percentual = parseFloat(percentualInput.value);

        if (isNaN(percentual)) {
            feedbackEl.innerHTML = '<p class="text-sm text-red-500">Por favor, insira um percentual válido.</p>';
            return;
        }

        const selectedCidadesIds = Array.from(document.querySelectorAll('.modal-cidade-checkbox-rural:checked')).map(cb => cb.value);
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
                    Object.keys(cidade.valoresRurais).forEach(qualidade => {
                        const valorAntigo = cidade.valoresRurais[qualidade] || 0;
                        cidade.valoresRurais[qualidade] = valorAntigo * fatorReajuste;
                    });
                }
            });

            await dbRef.updateItem(ITCD_CONFIG_STORE, config);
            uiModuleRef.showToastNotification("Reajuste aplicado com sucesso!", "success");
            uiModuleRef.closeModal();

            const cidadeSelect = document.getElementById('cidade-valor-select-rural');
            if(cidadeSelect.value) {
                renderCamposDeValores(srfId, cidadeSelect.value);
            }

        } catch (error) {
            console.error("Erro ao aplicar reajuste rural:", error);
            uiModuleRef.showToastNotification(`Falha ao aplicar reajuste: ${error.message}`, "error");
        } finally {
            uiModuleRef.showLoading(false);
        }
    }


    function addEventListeners(containerEl) {
        containerEl.addEventListener('click', (e) => {
            const target = e.target;
            const targetIsDisabled = target.disabled || target.closest(':disabled');
            if (targetIsDisabled) return;

            if (target.id === 'btn-salvar-valores-cidade-rural') {
                const { srfId, cidadeId } = e.target.dataset;
                handleSalvarValoresDaCidade(srfId, cidadeId);
            } else if (target.id === 'btn-reajustar-valores-rural') {
                abrirModalReajusteRural();
            } else if (target.id === 'btn-salvar-configuracoes-rurais') {
                const newConfig = {
                    recursosHidricos: parseFloat(document.getElementById('percentual-recursos-hidricos').value) || 10,
                    tipoImovel: {},
                    localizacao: {}
                };
                
                document.querySelectorAll('.tipo-imovel-field').forEach(input => {
                    newConfig.tipoImovel[input.dataset.key] = parseFloat(input.value) || 0;
                });
                 document.querySelectorAll('.localizacao-field').forEach(input => {
                    newConfig.localizacao[input.dataset.key] = parseFloat(input.value) || 0;
                });

                dbRef.updateItem(ITCD_CONFIG_STORE, { key: RURAL_GERAL_KEY, value: newConfig }).then(() => {
                    uiModuleRef.showToastNotification('Configurações rurais salvas com sucesso.', 'success');
                }).catch(err => {
                    uiModuleRef.showToastNotification(`Erro ao salvar: ${err.message}`, 'error');
                });
            }
        });

        const srfSelect = containerEl.querySelector('#srf-cidade-select-rural');
        srfSelect?.addEventListener('change', () => popularDropdownCidadesParaValores(srfSelect.value));

        const cidadeSelect = containerEl.querySelector('#cidade-valor-select-rural');
        cidadeSelect?.addEventListener('change', () => renderCamposDeValores(srfSelect.value, cidadeSelect.value));
    }

    return {
        init,
        renderTabContent,
        addEventListeners
    };
})();