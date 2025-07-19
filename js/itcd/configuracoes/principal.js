// js/itcd/configuracoes/principal.js - Módulo para a aba Principal das Configurações do ITCD
// v4.0.0 - UNIFICADO: Removida a funcionalidade de backup geral do ITCD. Adicionada funcionalidade específica para importar/exportar apenas as CONFIGURAÇÕES de pautas e valores do ITCD.
// v3.3.0 - ADICIONADO: Inclui dados da UFEMG e SELIC no backup de configurações.
// v3.2.0 - CORRIGIDO: Garante que todos os campos e botões de edição/adição sejam desabilitados quando as configurações estão bloqueadas (isLocked=true).
// v3.1.0 - IMPLEMENTADO: Exportação de configurações para e-mail com salvamento de arquivo local e corpo de texto padronizado.
// v3.1.0 - CORRIGIDO: Substituída a chamada a `prompt` nativo por `uiModuleRef.showPromptModal` para edição de nomes.
// v3.0.0 - ADICIONADO: Função de exportar configurações por e-mail e desabilita campos se as configurações estiverem bloqueadas.
// v2.0.0 - Adiciona as regras de Partilha Legal ao backup/restauração geral.
// v1.5.1 - CORRIGIDO: Garante que o fundo dos cards de SRF aplique o tema escuro corretamente.
// ... (histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ITCD = window.SEFWorkStation.ITCD || {};
window.SEFWorkStation.ITCD.Configuracoes = window.SEFWorkStation.ITCD.Configuracoes || {};

window.SEFWorkStation.ITCD.Configuracoes.Principal = (function() {

    let dbRef;
    let appModuleRef;
    let uiModuleRef;

    const ITCD_CONFIG_STORE = 'itcdConfiguracoesStore';
    const SRF_CIDADES_KEY = 'srfCidades';
    const UFS_KEY = 'unidadesFazendarias';
    // Lista de todas as chaves de configuração a serem exportadas/importadas
    const CONFIG_KEYS_TO_MANAGE = [
        SRF_CIDADES_KEY, UFS_KEY, 'partilhaLegalRegras', 'valoresUfemg',
        'urbanoLocalizacoes', 'urbanoDepreciacao', 'urbanoTipoTerreno', 'urbanoGeral',
        'valoresCUB', 'ruralGeralConfig', 'urbanoConservacao', 'urbanoApartamentoFatores'
    ];
    const CONFIG_FILENAME = 'sefworkstation_itcd_configuracoes.json';


    function init(db, app, ui) {
        dbRef = db;
        appModuleRef = app;
        uiModuleRef = ui;
    }

    async function renderTabContent(containerEl, isLocked = true) {
        const tabHtml = `
            <div class="space-y-6">
                <fieldset class="section-box p-4 border dark:border-slate-700 rounded-lg itcd-config-fieldset">
                     <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100 config-section-title">Gerenciar Superintendências e Cidades</h3>
                     <div class="flex items-center gap-2 mb-4">
                        <input type="text" id="input-nova-superintendencia" class="form-input-text flex-grow text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200" placeholder="Nome da nova Superintendência" ${isLocked ? 'disabled' : ''}>
                        <button id="btn-adicionar-superintendencia" class="btn-primary btn-sm text-sm py-1.5 px-3" ${isLocked ? 'disabled' : ''}>Adicionar SRF</button>
                    </div>
                    <div id="lista-superintendencias" class="space-y-4">
                        <p class="text-sm text-gray-500 dark:text-gray-400">Carregando...</p>
                    </div>
                </fieldset>
                <fieldset class="section-box p-4 border dark:border-slate-700 rounded-lg itcd-config-fieldset">
                    <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100 config-section-title">Gerenciar Unidades Fazendárias</h3>
                    <div class="mb-4">
                        <label for="srf-para-uf-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Selecione uma Superintendência para gerenciar as UFs:</label>
                        <select id="srf-para-uf-select" class="form-input-text mt-1 block w-full md:w-1/2" ${isLocked ? 'disabled' : ''}></select>
                    </div>
                    <div id="container-gerenciamento-uf" class="hidden">
                        <div class="flex flex-col md:flex-row items-end gap-2 mb-4">
                            <div class="flex-grow w-full">
                                <label for="input-nova-uf" class="block text-xs font-medium text-gray-600 dark:text-gray-400">Nome da nova Unidade Fazendária:</label>
                                <input type="text" id="input-nova-uf" class="form-input-text w-full text-sm mt-1 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200" placeholder="Ex: AF Governador Valadares" ${isLocked ? 'disabled' : ''}>
                            </div>
                            <div class="flex-shrink-0">
                                <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Tipo:</label>
                                <div class="flex items-center space-x-3 dark:text-gray-300">
                                    <label class="inline-flex items-center"><input type="radio" name="uf-type-add" value="AF" class="form-radio h-4 w-4" checked ${isLocked ? 'disabled' : ''}><span class="ml-1.5 text-sm">AF</span></label>
                                    <label class="inline-flex items-center"><input type="radio" name="uf-type-add" value="DF" class="form-radio h-4 w-4" ${isLocked ? 'disabled' : ''}><span class="ml-1.5 text-sm">DF</span></label>
                                    <label class="inline-flex items-center"><input type="radio" name="uf-type-add" value="SIAT" class="form-radio h-4 w-4" ${isLocked ? 'disabled' : ''}><span class="ml-1.5 text-sm">SIAT</span></label>
                                </div>
                            </div>
                            <div class="flex-shrink-0">
                                <button id="btn-adicionar-uf" class="btn-primary btn-sm text-sm py-1.5 px-3" ${isLocked ? 'disabled' : ''}>Adicionar UF</button>
                            </div>
                        </div>
                        <div id="lista-unidades-fazendarias" class="space-y-2"></div>
                    </div>
                </fieldset>

                <div class="section-box p-4 border dark:border-slate-700 rounded-lg">
                    <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100">Importar/Exportar Configurações de Pauta</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
                        Exporte as configurações de SRF, cidades, UFs e valores de pauta para um arquivo .json. Você pode compartilhar este arquivo com outros usuários ou usá-lo como backup.
                    </p>
                    <div class="flex flex-wrap gap-4">
                        <button id="btn-export-itcd-config-pautas" class="btn-secondary" ${isLocked ? 'disabled' : ''}>Exportar Configurações (.json)</button>
                        <div>
                            <input type="file" id="input-import-itcd-config-pautas" class="hidden" accept=".json">
                            <button onclick="document.getElementById('input-import-itcd-config-pautas').click()" class="btn-primary" ${isLocked ? 'disabled' : ''}>Importar Configurações (.json)</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        containerEl.innerHTML = tabHtml;
        await carregarERenderizarSRFeCidades(isLocked);
        await popularDropdownSRFparaUF();
    }
    
    async function carregarERenderizarSRFeCidades(isLocked = true) {
        const containerEl = document.getElementById('lista-superintendencias');
        if (!containerEl) return;

        try {
            const configSrf = await dbRef.getItemById(ITCD_CONFIG_STORE, SRF_CIDADES_KEY);
            const superintendencias = configSrf?.value || [];
            superintendencias.sort((a, b) => a.nome.localeCompare(b.nome));

            containerEl.innerHTML = '';
            if (superintendencias.length === 0) {
                containerEl.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400">Nenhuma superintendência cadastrada.</p>';
                return;
            }

            superintendencias.forEach(srf => {
                const srfCard = document.createElement('div');
                srfCard.className = 'p-3 bg-gray-50 dark:bg-slate-800 rounded-md border dark:border-slate-700';
                
                const botoesHtml = isLocked ? '' : `
                    <div class="space-x-2">
                        <button class="btn-secondary btn-sm text-xs py-1 px-2 btn-editar-srf" data-id="${srf.id}" data-nome="${srf.nome.replace(/"/g, '\"')}">Editar SRF</button>
                        <button class="btn-delete btn-sm text-xs py-1 px-2 btn-excluir-srf" data-id="${srf.id}" data-nome="${srf.nome.replace(/"/g, '\"')}">Excluir SRF</button>
                    </div>`;

                let cidadesHtml = '<p class="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-4">Nenhuma cidade cadastrada para esta SRF.</p>';
                if (srf.cidades && srf.cidades.length > 0) {
                    cidadesHtml = '<ul class="list-disc list-inside ml-4 mt-2 space-y-1">';
                    srf.cidades.sort((a, b) => a.nome.localeCompare(b.nome)).forEach(cidade => {
                        const botoesCidadeHtml = isLocked ? '' : `
                            <span class="space-x-2">
                                <button class="text-xs text-blue-600 hover:underline btn-editar-cidade" data-srf-id="${srf.id}" data-cidade-id="${cidade.id}">Editar</button>
                                <button class="text-xs text-red-600 hover:underline btn-excluir-cidade" data-srf-id="${srf.id}" data-cidade-id="${cidade.id}">Excluir</button>
                            </span>`;
                        cidadesHtml += `<li class="text-sm flex justify-between items-center text-gray-800 dark:text-gray-200"><span>${cidade.nome}</span>${botoesCidadeHtml}</li>`;
                    });
                    cidadesHtml += '</ul>';
                }

                srfCard.innerHTML = `
                    <div class="flex justify-between items-center">
                        <h4 class="font-semibold text-gray-800 dark:text-gray-200">${srf.nome}</h4>
                        ${botoesHtml}
                    </div>
                    <div class="mt-3 pt-3 border-t dark:border-slate-700">
                        <h5 class="text-sm font-medium text-gray-600 dark:text-gray-300">Cidades Pertencentes:</h5>
                        ${cidadesHtml}
                        <div class="flex items-center gap-2 mt-3">
                           <input type="text" class="form-input-text flex-grow text-xs dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200" placeholder="Nome da nova cidade" ${isLocked ? 'disabled' : ''}>
                           <button class="btn-primary btn-sm text-xs py-1 px-2 btn-adicionar-cidade" data-srf-id="${srf.id}" ${isLocked ? 'disabled' : ''}>Adicionar Cidade</button>
                        </div>
                    </div>
                `;
                containerEl.appendChild(srfCard);
            });

        } catch (error) {
            console.error("Erro ao carregar superintendências e cidades:", error);
            containerEl.innerHTML = '<p class="text-sm text-red-500">Erro ao carregar dados.</p>';
        }
    }
    
    async function popularDropdownSRFparaUF() {
        const selectEl = document.getElementById('srf-para-uf-select');
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

    async function carregarERenderizarUFs(srfId) {
        const containerEl = document.getElementById('lista-unidades-fazendarias');
        if (!containerEl) return;
        containerEl.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400">Carregando Unidades Fazendárias...</p>';
        try {
            const config = await dbRef.getItemById(ITCD_CONFIG_STORE, UFS_KEY);
            const todasUFs = config?.value || [];
            const ufsDaSrf = todasUFs.filter(uf => uf.srfId === srfId).sort((a,b) => a.nome.localeCompare(b.nome));
            
            containerEl.innerHTML = '';
            if (ufsDaSrf.length === 0) {
                containerEl.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400">Nenhuma Unidade Fazendária cadastrada para esta SRF.</p>';
                return;
            }

            ufsDaSrf.forEach(uf => {
                const ufItem = document.createElement('div');
                ufItem.className = 'p-2 border-b dark:border-slate-600 flex justify-between items-center';
                ufItem.innerHTML = `
                    <div class="dark:text-white">
                        <span class="font-medium">${uf.nome}</span>
                        <span class="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-slate-700 font-semibold dark:text-gray-200">${uf.tipo}</span>
                    </div>
                    <div class="space-x-2">
                        <button class="text-xs text-blue-600 hover:underline btn-editar-uf" data-uf-id="${uf.id}">Editar</button>
                        <button class="text-xs text-red-600 hover:underline btn-excluir-uf" data-uf-id="${uf.id}">Excluir</button>
                    </div>
                `;
                containerEl.appendChild(ufItem);
            });
        } catch (e) {
             containerEl.innerHTML = '<p class="text-sm text-red-500">Erro ao carregar UFs.</p>';
        }
    }

    async function handleAcoesSRFeCidade(e) {
        const config = await dbRef.getItemById(ITCD_CONFIG_STORE, SRF_CIDADES_KEY) || { key: SRF_CIDADES_KEY, value: [] };
        let configChanged = false;

        if (e.target.classList.contains('btn-editar-srf')) {
            const id = e.target.dataset.id;
            const nomeAtual = e.target.dataset.nome;
            const novoNome = await uiModuleRef.showPromptModal("Editar Superintendência", "Novo nome:", 'text', nomeAtual);
            if (novoNome && novoNome.trim() && novoNome.trim() !== nomeAtual) {
                const item = config.value.find(s => s.id === id);
                if (item) { item.nome = novoNome.trim(); configChanged = true; }
            }
        } else if (e.target.classList.contains('btn-excluir-srf')) {
            const id = e.target.dataset.id;
            const nome = e.target.dataset.nome;
            if (await uiModuleRef.showConfirmationModal('Confirmar Exclusão', `Tem certeza que deseja excluir a superintendência "${nome}" e todas as suas cidades e valores de referência?`)) {
                config.value = config.value.filter(s => s.id !== id);
                configChanged = true;
            }
        } else if (e.target.classList.contains('btn-adicionar-cidade')) {
            const srfId = e.target.dataset.srfId;
            const inputCidade = e.target.previousElementSibling;
            const nomeCidade = inputCidade.value.trim();
            if (!nomeCidade) return;
            const srf = config.value.find(s => s.id === srfId);
            if (srf) {
                srf.cidades = srf.cidades || [];
                srf.cidades.push({ id: appModuleRef.generateUUID(), nome: nomeCidade, valoresUrbanos: {}, valoresRurais: {} });
                inputCidade.value = '';
                configChanged = true;
            }
        } else if (e.target.classList.contains('btn-editar-cidade')) {
            const srfId = e.target.dataset.srfId;
            const cidadeId = e.target.dataset.cidadeId;
            const srf = config.value.find(s => s.id === srfId);
            const cidade = srf?.cidades.find(u => u.id === cidadeId);
            if (cidade) {
                const novoNome = await uiModuleRef.showPromptModal("Editar Cidade", "Novo nome:", 'text', cidade.nome);
                if (novoNome && novoNome.trim()) {
                    cidade.nome = novoNome.trim();
                    configChanged = true;
                }
            }
        } else if (e.target.classList.contains('btn-excluir-cidade')) {
             const srfId = e.target.dataset.srfId;
             const cidadeId = e.target.dataset.cidadeId;
             const srf = config.value.find(s => s.id === srfId);
             if (srf) {
                srf.cidades = srf.cidades.filter(u => u.id !== cidadeId);
                configChanged = true;
             }
        }

        if (configChanged) {
            try {
                await dbRef.updateItem(ITCD_CONFIG_STORE, config);
                await carregarERenderizarSRFeCidades(false); // Manter desbloqueado
                await popularDropdownSRFparaUF();
            } catch (error) {
                uiModuleRef.showToastNotification(`Erro ao salvar alterações: ${error.message}`, "error");
            }
        }
    }
    
    async function handleAcoesUF(e) {
        const selectSRF = document.getElementById('srf-para-uf-select');
        const srfIdSelecionada = selectSRF.value;
        if (!srfIdSelecionada) return;

        const config = await dbRef.getItemById(ITCD_CONFIG_STORE, UFS_KEY) || { key: UFS_KEY, value: [] };
        let configChanged = false;

        if (e.target.id === 'btn-adicionar-uf') {
            const inputUF = document.getElementById('input-nova-uf');
            const nomeUF = inputUF.value.trim();
            const tipoUF = document.querySelector('input[name="uf-type-add"]:checked').value;
            if (!nomeUF) return;

            config.value.push({ id: appModuleRef.generateUUID(), nome: nomeUF, tipo: tipoUF, srfId: srfIdSelecionada });
            inputUF.value = '';
            configChanged = true;

        } else if (e.target.classList.contains('btn-editar-uf')) {
            const ufId = e.target.dataset.ufId;
            const uf = config.value.find(u => u.id === ufId);
            if (uf) {
                const novoNome = await uiModuleRef.showPromptModal("Editar Unidade Fazendária", "Novo nome:", 'text', uf.nome);
                if (novoNome && novoNome.trim()) {
                    uf.nome = novoNome.trim();
                    configChanged = true;
                }
            }
        } else if (e.target.classList.contains('btn-excluir-uf')) {
            const ufId = e.target.dataset.ufId;
            config.value = config.value.filter(u => u.id !== ufId);
            configChanged = true;
        }

        if (configChanged) {
            try {
                await dbRef.updateItem(ITCD_CONFIG_STORE, config);
                await carregarERenderizarUFs(srfIdSelecionada);
            } catch (error) {
                uiModuleRef.showToastNotification(`Erro ao salvar alterações na UF: ${error.message}`, "error");
            }
        }
    }
    
    async function _exportarConfiguracoesItcd() {
        uiModuleRef.showLoading(true, "Exportando configurações do ITCD...");
        try {
            const configData = {};
            for (const key of CONFIG_KEYS_TO_MANAGE) {
                const item = await dbRef.getItemById(ITCD_CONFIG_STORE, key);
                if (item) configData[key] = item.value;
            }
            
            const jsonDataString = JSON.stringify(configData, null, 2);
            const blob = new Blob([jsonDataString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = CONFIG_FILENAME;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            uiModuleRef.showToastNotification("Arquivo de configurações do ITCD exportado com sucesso!", "success");
        } catch (error) {
            console.error("Erro ao exportar configurações do ITCD:", error);
            uiModuleRef.showToastNotification(`Falha na exportação: ${error.message}`, "error");
        } finally {
            uiModuleRef.showLoading(false);
        }
    }

    async function _importarConfiguracoesItcd(file) {
        if (!file) {
            uiModuleRef.showToastNotification("Nenhum arquivo selecionado.", "warning");
            return;
        }
        const userConfirmed = await uiModuleRef.showConfirmationModal(
            'Confirmar Importação de Configurações',
            'Isto irá <strong>sobrescrever TODAS as suas configurações de pauta do ITCD</strong>. Esta ação não pode ser desfeita. Deseja continuar?',
            'Sim, Importar e Substituir', 'Cancelar'
        );
        if (!userConfirmed) return;

        uiModuleRef.showLoading(true, "Importando configurações...");
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const jsonData = JSON.parse(event.target.result);
                
                for (const key of CONFIG_KEYS_TO_MANAGE) {
                    if (jsonData.hasOwnProperty(key)) {
                        await dbRef.updateItem(ITCD_CONFIG_STORE, { key, value: jsonData[key] });
                    }
                }
                
                uiModuleRef.showToastNotification("Configurações importadas com sucesso. A página será recarregada.", "success");
                setTimeout(() => window.location.reload(), 2000);
            } catch (error) {
                console.error("Erro ao importar configurações do ITCD:", error);
                uiModuleRef.showToastNotification(`Falha na importação: ${error.message}`, "error", 0);
            } finally {
                uiModuleRef.showLoading(false);
            }
        };
        reader.readAsText(file);
    }
    
    function addEventListeners(containerEl) {
        containerEl.addEventListener('click', (e) => {
            const target = e.target;
            const targetIsDisabled = target.disabled || target.closest(':disabled');
            
            if (targetIsDisabled) return;

            if (target.closest('#lista-superintendencias')) handleAcoesSRFeCidade(e);
            if (target.closest('#container-gerenciamento-uf')) handleAcoesUF(e);

            if (target.id === 'btn-adicionar-superintendencia') {
                const inputEl = document.getElementById('input-nova-superintendencia');
                const nome = inputEl.value.trim();
                if (!nome) { uiModuleRef.showToastNotification("O nome da superintendência não pode ser vazio.", "warning"); return; }
                
                (async () => {
                    try {
                        const config = await dbRef.getItemById(ITCD_CONFIG_STORE, SRF_CIDADES_KEY) || { key: SRF_CIDADES_KEY, value: [] };
                        if (config.value.some(s => s.nome.toLowerCase() === nome.toLowerCase())) {
                            uiModuleRef.showToastNotification("Esta superintendência já existe.", "info"); return;
                        }
                        config.value.push({ id: appModuleRef.generateUUID(), nome: nome, cidades: [] });
                        await dbRef.updateItem(ITCD_CONFIG_STORE, config);
                        inputEl.value = '';
                        uiModuleRef.showToastNotification("Superintendência adicionada.", "success");
                        await carregarERenderizarSRFeCidades(false);
                        await popularDropdownSRFparaUF();
                    } catch (error) { uiModuleRef.showToastNotification(`Erro ao adicionar: ${error.message}`, "error"); }
                })();
            }
            if (target.id === 'btn-export-itcd-config-pautas') {
                _exportarConfiguracoesItcd();
            }
        });

        const srfSelect = containerEl.querySelector('#srf-para-uf-select');
        srfSelect?.addEventListener('change', (e) => {
            const srfId = e.target.value;
            const containerUf = document.getElementById('container-gerenciamento-uf');
            if (srfId) {
                containerUf.classList.remove('hidden');
                carregarERenderizarUFs(srfId);
            } else {
                containerUf.classList.add('hidden');
            }
        });
        
        const importInput = containerEl.querySelector('#input-import-itcd-config-pautas');
        if(importInput) {
            importInput.addEventListener('change', (e) => {
                if(e.target.files.length > 0) {
                    _importarConfiguracoesItcd(e.target.files[0]);
                }
            });
        }
    }

    return {
        init,
        renderTabContent,
        addEventListeners
    };
})();
