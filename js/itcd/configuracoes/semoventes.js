// js/itcd/configuracoes/semoventes.js - Módulo para a aba de Configurações de Semoventes (ITCD)
// v7.0.0 - UNIFICADO: Adicionada funcionalidade específica para importar e exportar apenas os dados das pautas de semoventes.
// v6.0.0 - ALTERADO: Conteúdo da aba não é mais afetado pelo bloqueio de administrador, permanecendo sempre editável.
// v5.3.0 - CORRIGIDO: Adiciona classes de cor para texto no tema escuro, resolvendo problemas de contraste.
// ... (histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ITCD = window.SEFWorkStation.ITCD || {};
window.SEFWorkStation.ITCD.Configuracoes = window.SEFWorkStation.ITCD.Configuracoes || {};

window.SEFWorkStation.ITCD.Configuracoes.Semoventes = (function() {

    let dbRef;
    let uiModuleRef;
    let appModuleRef;
    const PAUTAS_STORE_KEY = 'pautasSemoventes';
    const PAUTAS_STORE_DB_NAME = 'itcdSemoventesPautasStore';
    const PAUTAS_FILENAME = 'sefworkstation_itcd_pautas_semoventes.json';

    const CATEGORIAS_SEMOVENTES = [
        { key: 'bezerros0a12', label: 'Bezerros 0 a 12 meses' },
        { key: 'bezerras0a12', label: 'Bezerras 0 a 12 meses' },
        { key: 'novilhas12a24', label: 'Novilhas 12 a 24 meses' },
        { key: 'novilhasMais24', label: 'Novilhas + de 24 meses' },
        { key: 'novilhos12a24', label: 'Novilhos 12 a 24 meses' },
        { key: 'novilhosMais24', label: 'Novilhos + de 24 meses' },
        { key: 'vacas', label: 'Vacas' },
        { key: 'touros', label: 'Touros' },
        { key: 'vacaComCria', label: 'Vaca com cria' },
        { key: 'burroOuMula', label: 'Burro ou Mula' },
        { key: 'cavalo', label: 'Cavalo' },
        { key: 'egua', label: 'Égua' },
        { key: 'novilhosMais36', label: 'Novilhos + de 36 meses' }
    ];

    function init(db, app, ui) {
        dbRef = db;
        uiModuleRef = ui;
        appModuleRef = app;
        seedPautasIniciaisSeNecessario();
    }
    
    function formatToBRL(value) {
        if (isNaN(value) || value === null) return '';
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function parseFromBRL(value) {
        if (!value || typeof value !== 'string') return 0;
        return parseFloat(value.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
    }

    async function renderTabContent(containerEl, isLocked = true) {
        const hoje = new Date();
        const anoAtual = hoje.getFullYear();
        const mesAtual = hoje.getMonth() + 1;

        const mesesOptions = Array.from({ length: 12 }, (_, i) => {
            const mesValue = i + 1;
            const mesNome = new Date(0, i).toLocaleString('pt-BR', { month: 'long' });
            return `<option value="${mesValue}">${mesNome.charAt(0).toUpperCase() + mesNome.slice(1)}</option>`;
        }).join('');

        const tabHtml = `
            <div class="space-y-6">
                <div class="section-box p-4 border dark:border-slate-700 rounded-lg">
                    <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100">Gerenciar Pautas de Semoventes</h3>
                     <div class="flex flex-wrap gap-4 mb-4">
                        <button id="btn-exportar-pautas" class="btn-secondary">Exportar Pautas (.json)</button>
                        <div>
                            <input type="file" id="input-importar-pautas" class="hidden" accept=".json">
                            <button onclick="document.getElementById('input-importar-pautas').click()" class="btn-primary">Importar Pautas (.json)</button>
                        </div>
                    </div>
                </div>

                <div class="section-box p-4 border dark:border-slate-700 rounded-lg">
                    <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100">Adicionar Nova Pauta</h3>
                     <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div>
                            <label for="pauta-mes-select" class="block text-sm font-medium dark:text-gray-300">Mês:</label>
                            <select id="pauta-mes-select" class="form-input-text mt-1 text-sm">${mesesOptions}</select>
                        </div>
                        <div>
                            <label for="pauta-ano-input" class="block text-sm font-medium dark:text-gray-300">Ano:</label>
                            <input type="number" id="pauta-ano-input" class="form-input-text mt-1 text-sm" value="${anoAtual}" placeholder="AAAA">
                        </div>
                        <div class="pt-5">
                            <button id="btn-show-add-form" class="btn-secondary w-full">Definir Valores</button>
                        </div>
                    </div>
                     <div id="container-nova-pauta-valores" class="p-4 mt-4 border dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 hidden">
                        <!-- Formulário de valores para nova pauta será renderizado aqui -->
                     </div>
                </div>

                <div class="section-box p-4 border dark:border-slate-700 rounded-lg">
                    <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100">Pautas Existentes</h3>
                    <div id="lista-pautas-existentes" class="space-y-2 max-h-[80vh] overflow-y-auto">
                        <p class="text-sm text-gray-500 dark:text-gray-400">Carregando pautas salvas...</p>
                    </div>
                </div>
            </div>
        `;
        containerEl.innerHTML = tabHtml;
        await carregarERenderizarPautasExistentes();
        addEventListeners(containerEl);
    }
    
    async function carregarERenderizarPautasExistentes() {
        const container = document.getElementById('lista-pautas-existentes');
        if (!container) return;
        
        const todasPautas = await dbRef.getAllItems(PAUTAS_STORE_DB_NAME);
        
        todasPautas.sort((a,b) => b.key.localeCompare(a.key));

        if(todasPautas.length === 0) {
            container.innerHTML = `<p class="text-sm text-center text-gray-500 dark:text-gray-400 p-4">Nenhuma pauta encontrada no banco de dados.</p>`;
            return;
        }

        container.innerHTML = todasPautas.map(pauta => {
            const [ano, mes] = pauta.key.split('-');
            const mesNome = new Date(ano, parseInt(mes) - 1).toLocaleString('pt-BR', { month: 'long' });
            return `
                <details class="bg-gray-50 dark:bg-slate-800/50 rounded-md border dark:border-slate-700">
                    <summary class="p-3 cursor-pointer flex justify-between items-center text-sm font-medium text-gray-700 dark:text-gray-200">
                        <div>
                            <span>Pauta de ${mesNome.charAt(0).toUpperCase() + mesNome.slice(1)} / ${ano}</span>
                        </div>
                        <div class="space-x-2">
                             <button class="btn-secondary btn-sm text-xs py-1 px-2 btn-editar-pauta" data-pauta-key="${pauta.key}">Editar</button>
                             <button class="btn-delete btn-sm text-xs py-1 px-2 btn-excluir-pauta" data-pauta-key="${pauta.key}">Excluir</button>
                        </div>
                    </summary>
                    <div class="p-3 border-t dark:border-slate-600 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
                        ${CATEGORIAS_SEMOVENTES.map(cat => `
                            <div class="flex justify-between items-center">
                                <span class="text-gray-600 dark:text-gray-300">${cat.label}:</span>
                                <span class="font-semibold text-gray-900 dark:text-gray-100">${formatToBRL(pauta.valores[cat.key] || 0)}</span>
                            </div>
                        `).join('')}
                    </div>
                </details>
            `;
        }).join('');
    }

    function renderFormularioNovaPauta() {
        const container = document.getElementById('container-nova-pauta-valores');
        const ano = document.getElementById('pauta-ano-input').value;
        const mesNum = document.getElementById('pauta-mes-select').value;
        const mesNome = new Date(0, mesNum - 1).toLocaleString('pt-BR', { month: 'long' });
        
        let camposHtml = CATEGORIAS_SEMOVENTES.map(cat => `
            <div class="grid grid-cols-12 gap-x-4 items-center p-1.5 border-b dark:border-slate-700/50">
                <label class="col-span-12 sm:col-span-4 text-sm font-medium dark:text-gray-300">${cat.label}:</label>
                <div class="col-span-4 sm:col-span-3 sm:col-start-9"><input type="text" class="form-input-text text-sm pauta-valor-input-novo currency-input" data-key="${cat.key}" placeholder="R$ 0,00"></div>
            </div>
        `).join('');

        container.innerHTML = `
            <h4 class="text-md font-semibold mb-3 dark:text-gray-200">Valores para ${mesNome.charAt(0).toUpperCase() + mesNome.slice(1)} / ${ano}</h4>
            <div class="space-y-2">${camposHtml}</div>
            <div class="mt-6 flex justify-end">
                <button id="btn-salvar-nova-pauta" class="btn-primary">Salvar Nova Pauta</button>
            </div>
        `;

        container.classList.remove('hidden');
        container.querySelectorAll('.currency-input').forEach(input => {
            input.addEventListener('focus', e => {
                const value = parseFromBRL(e.target.value);
                e.target.value = (value !== 0) ? value.toFixed(2).replace('.', ',') : '';
            });
            input.addEventListener('blur', e => { e.target.value = formatToBRL(parseFromBRL(e.target.value)); });
        });

        document.getElementById('btn-salvar-nova-pauta').addEventListener('click', handleSalvarNovaPauta);
    }

    async function handleSalvarNovaPauta() {
        const mes = document.getElementById('pauta-mes-select').value.padStart(2, '0');
        const ano = document.getElementById('pauta-ano-input').value;
        const pautaKey = `${ano}-${mes}`;
        
        const pautaExistente = await dbRef.getItemById(PAUTAS_STORE_DB_NAME, pautaKey);
        if (pautaExistente) {
            uiModuleRef.showToastNotification(`Pauta para ${mes}/${ano} já existe. Edite a pauta na lista abaixo.`, "warning", 0);
            return;
        }

        const novosValores = {};
        document.querySelectorAll('.pauta-valor-input-novo').forEach(input => {
            novosValores[input.dataset.key] = parseFromBRL(input.value);
        });

        const pautaData = {
            key: pautaKey,
            valores: novosValores
        };
        
        try {
            await dbRef.updateItem(PAUTAS_STORE_DB_NAME, pautaData);
            uiModuleRef.showToastNotification(`Nova pauta para ${mes}/${ano} salva com sucesso!`, 'success');
            await carregarERenderizarPautasExistentes();
            document.getElementById('container-nova-pauta-valores').classList.add('hidden');
        } catch (error) {
            uiModuleRef.showToastNotification(`Falha ao salvar nova pauta: ${error.message}`, 'error');
        }
    }

    async function handleEditarPauta(pautaKey) {
        const pautaParaEditar = await dbRef.getItemById(PAUTAS_STORE_DB_NAME, pautaKey);
        if (!pautaParaEditar) {
            uiModuleRef.showToastNotification("Pauta não encontrada para edição.", "error");
            return;
        }

        let modalContent = `<div class="space-y-2">`;
        CATEGORIAS_SEMOVENTES.forEach(cat => {
             modalContent += `
                <div class="grid grid-cols-2 gap-x-4 items-center">
                    <label class="text-sm font-medium dark:text-gray-300">${cat.label}:</label>
                    <input type="text" class="form-input-text text-sm pauta-valor-input-edit currency-input" data-key="${cat.key}" value="${formatToBRL(pautaParaEditar.valores[cat.key] || 0)}">
                </div>
            `;
        });
        modalContent += `</div>`;

        uiModuleRef.showModal(`Editar Pauta: ${pautaParaEditar.key}`, modalContent, [
            { text: "Cancelar", class: "btn-secondary", closesModal: true },
            { text: "Salvar Alterações", class: "btn-primary", closesModal: true, callback: async () => {
                const valoresEditados = {};
                document.querySelectorAll('.pauta-valor-input-edit').forEach(input => {
                    valoresEditados[input.dataset.key] = parseFromBRL(input.value);
                });
                pautaParaEditar.valores = valoresEditados;
                await dbRef.updateItem(PAUTAS_STORE_DB_NAME, pautaParaEditar);
                uiModuleRef.showToastNotification("Pauta atualizada com sucesso!", "success");
                await carregarERenderizarPautasExistentes();
            }}
        ]);
        
        document.querySelectorAll('.pauta-valor-input-edit.currency-input').forEach(input => {
            input.addEventListener('focus', e => {
                const value = parseFromBRL(e.target.value);
                e.target.value = (value !== 0) ? value.toFixed(2).replace('.', ',') : '';
            });
            input.addEventListener('blur', e => { e.target.value = formatToBRL(parseFromBRL(e.target.value)); });
        });
    }
    
    async function handleExcluirPauta(pautaKey) {
        const confirmou = await uiModuleRef.showConfirmationModal('Confirmar Exclusão', `Tem certeza que deseja excluir permanentemente a pauta "${pautaKey}"?`);
        if (confirmou) {
            await dbRef.deleteItem(PAUTAS_STORE_DB_NAME, pautaKey);
            uiModuleRef.showToastNotification("Pauta excluída com sucesso.", "success");
            await carregarERenderizarPautasExistentes();
        }
    }
    
    async function seedPautasIniciaisSeNecessario() {
        try {
            const pautasDb = await dbRef.getAllItems(PAUTAS_STORE_DB_NAME);
            if (pautasDb && pautasDb.length > 0) return;
            
            uiModuleRef.showLoading(true, "Carregando pautas iniciais de semoventes...");
            
            const response = await fetch('./data/pautas_semoventes.json');
            if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
            const pautasParaSalvar = await response.json();

            if (!pautasParaSalvar || pautasParaSalvar.length === 0) {
                 uiModuleRef.showToastNotification("Arquivo de pautas está vazio ou não foi encontrado.", "warning");
                 return;
            }

            for(const pauta of pautasParaSalvar) {
                await dbRef.addItem(PAUTAS_STORE_DB_NAME, pauta);
            }
            
            uiModuleRef.showToastNotification(`${pautasParaSalvar.length} pautas iniciais foram carregadas e salvas no banco de dados.`, "success");
            
        } catch(e) {
            console.error("Erro ao popular pautas de semoventes a partir do JSON:", e);
            uiModuleRef.showToastNotification(`Falha ao carregar dados da pauta: ${e.message}`, "error", 0);
        } finally {
            uiModuleRef.showLoading(false);
        }
    }

    async function _exportarPautas() {
        uiModuleRef.showLoading(true, "Exportando pautas de semoventes...");
        try {
            const pautas = await dbRef.getAllItems(PAUTAS_STORE_DB_NAME);
            const exportData = { [PAUTAS_STORE_DB_NAME]: pautas };
            
            const jsonDataString = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonDataString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = PAUTAS_FILENAME;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            uiModuleRef.showToastNotification("Arquivo de pautas exportado com sucesso!", "success");
        } catch (error) {
            console.error("Erro ao exportar pautas:", error);
            uiModuleRef.showToastNotification(`Falha na exportação: ${error.message}`, "error");
        } finally {
            uiModuleRef.showLoading(false);
        }
    }

    async function _importarPautas(file) {
        if (!file) return;
        const userConfirmed = await uiModuleRef.showConfirmationModal(
            'Confirmar Importação de Pautas',
            'Isto irá <strong>substituir TODAS as pautas de semoventes atuais</strong>. Deseja continuar?',
            'Sim, Importar e Substituir', 'Cancelar'
        );
        if (!userConfirmed) return;

        uiModuleRef.showLoading(true, "Importando pautas...");
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const jsonData = JSON.parse(event.target.result);
                const pautasParaImportar = jsonData[PAUTAS_STORE_DB_NAME];
                if (!pautasParaImportar || !Array.isArray(pautasParaImportar)) {
                    throw new Error(`Arquivo JSON inválido. A chave '${PAUTAS_STORE_DB_NAME}' contendo um array de pautas não foi encontrada.`);
                }

                await dbRef.clearStore(PAUTAS_STORE_DB_NAME);
                for (const pauta of pautasParaImportar) {
                    if (pauta.key && pauta.valores) {
                       await dbRef.addItem(PAUTAS_STORE_DB_NAME, pauta);
                    }
                }
                
                uiModuleRef.showToastNotification("Pautas de semoventes importadas com sucesso!", "success");
                await carregarERenderizarPautasExistentes();
            } catch(err) {
                uiModuleRef.showToastNotification(`Falha na importação: ${err.message}`, "error", 0);
            } finally {
                uiModuleRef.showLoading(false);
            }
        };
        reader.readAsText(file);
    }

    function addEventListeners(containerEl) {
        containerEl.addEventListener('click', (e) => {
            const target = e.target;
            if (target.id === 'btn-show-add-form') renderFormularioNovaPauta();
            if (target.id === 'btn-exportar-pautas') _exportarPautas();
            
            const editBtn = target.closest('.btn-editar-pauta');
            if (editBtn) handleEditarPauta(editBtn.dataset.pautaKey);
            
            const deleteBtn = target.closest('.btn-excluir-pauta');
            if (deleteBtn) handleExcluirPauta(deleteBtn.dataset.pautaKey);
        });

        const importInput = containerEl.querySelector('#input-importar-pautas');
        if (importInput) {
            importInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    _importarPautas(e.target.files[0]);
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
