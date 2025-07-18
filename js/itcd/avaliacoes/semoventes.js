// js/itcd/avaliacoes/semoventes.js
// v2.1.0 - CORREÇÃO (WEB): Corrige o caminho do fetch para o arquivo de pautas para funcionar no GitHub Pages (./data/).
// v2.0.0 - Integração com o novo sistema de armazenamento de arquivos para pautas.
// ... (histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ITCD = window.SEFWorkStation.ITCD || {};
window.SEFWorkStation.ITCD.AvaliacoesSemoventes = (function() {

    const PAUTAS_STORE_KEY = 'pautasSemoventes';
    const PAUTAS_STORE_DB_NAME = 'itcdSemoventesPautasStore';

    let dbRef;
    let appModuleRef;
    let uiModuleRef;
    let sharedUtilsRef;
    let mainContentWrapperRef;

    function init(db, app, ui, utils, mainWrapper) {
        dbRef = db;
        appModuleRef = app;
        uiModuleRef = ui;
        sharedUtilsRef = utils;
        mainContentWrapperRef = mainWrapper;
        console.log("ITCD.AvaliacoesSemoventes.JS: Módulo inicializado (v2.1.0).");
    }

    async function seedPautasIniciaisSeNecessario() {
        if (!dbRef) {
            console.error("ITCD.AvaliacoesSemoventes: Módulo DB não inicializado.");
            return false;
        }

        try {
            const pautasExistentes = await dbRef.getItemById(PAUTAS_STORE_DB_NAME, PAUTAS_STORE_KEY);
            if (pautasExistentes && pautasExistentes.dados) {
                console.log("ITCD.AvaliacoesSemoventes: Pautas de semoventes já existem no IndexedDB.");
                return true;
            }

            console.log("ITCD.AvaliacoesSemoventes: Pautas não encontradas no DB. Tentando carregar do arquivo JSON padrão...");
            // CORREÇÃO: O caminho agora é relativo à raiz do site.
            const response = await fetch('./data/m_semoventes.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const pautasDoArquivo = await response.json();

            if (pautasDoArquivo && typeof pautasDoArquivo === 'object') {
                const itemParaSalvar = {
                    key: PAUTAS_STORE_KEY,
                    dados: pautasDoArquivo,
                    ultimaModificacao: new Date().toISOString()
                };
                await dbRef.addItem(PAUTAS_STORE_DB_NAME, itemParaSalvar);
                console.log("ITCD.AvaliacoesSemoventes: Pautas de semoventes iniciais carregadas com sucesso no IndexedDB.");
                return true;
            } else {
                throw new Error("O arquivo JSON de pautas está vazio ou em formato inválido.");
            }
        } catch (error) {
            console.error("ITCD.AvaliacoesSemoventes: Erro crítico ao carregar as pautas de semoventes:", error);
            uiModuleRef.showToastNotification("Falha ao carregar as pautas de valores de semoventes. A funcionalidade pode ser limitada.", "error");
            return false;
        }
    }
    
    // ... (restante do arquivo `semoventes.js` sem modificações)
    // ... (renderFormAvaliacaoSemovente, carregarPautas, calcularValorTotal, etc)

    async function carregarPautas() {
        try {
            const pautasItem = await dbRef.getItemById(PAUTAS_STORE_DB_NAME, PAUTAS_STORE_KEY);
            if (!pautasItem || !pautasItem.dados) {
                const seeded = await seedPautasIniciaisSeNecessario();
                if(seeded) {
                    const pautasNovas = await dbRef.getItemById(PAUTAS_STORE_DB_NAME, PAUTAS_STORE_KEY);
                    return pautasNovas.dados;
                }
                return {};
            }
            return pautasItem.dados;
        } catch (error) {
            console.error("Erro ao carregar pautas de semoventes:", error);
            uiModuleRef.showToastNotification("Erro ao carregar as pautas. Verifique o console.", "error");
            return {};
        }
    }

    function renderFormAvaliacaoSemovente(avaliacaoData = null, isDuplicating = false) {
        mainContentWrapperRef.innerHTML = '<p class="loading-text">Carregando formulário de avaliação de semovente...</p>';
        const isEditing = avaliacaoData && avaliacaoData.id && !isDuplicating;
        const formTitle = isEditing ? "Editar Avaliação de Semovente" : (isDuplicating ? "Duplicar Avaliação de Semovente" : "Nova Avaliação de Semovente");

        const formHtml = `
            <div id="form-avaliacao-semovente-container" class="page-section">
                <h2 class="text-2xl font-semibold mb-6">${formTitle}</h2>
                <form id="avaliacao-semovente-form">
                    <!-- ... campos do formulário ... -->
                </form>
            </div>
        `;
        // Simulação do restante do formulário para manter a estrutura
        mainContentWrapperRef.innerHTML = formHtml.replace('<!-- ... campos do formulário ... -->', `
            <div class="form-grid">
                 <div>
                    <label for="declaracao" class="block text-sm font-medium">Declaração (DBD):</label>
                    <input type="text" id="declaracao" name="declaracao" class="form-input-text mt-1 block w-full" value="${avaliacaoData?.declaracao || ''}">
                </div>
                <div>
                    <label for="data-fato-gerador" class="block text-sm font-medium">Data do Fato Gerador:</label>
                    <input type="date" id="data-fato-gerador" name="data-fato-gerador" class="form-input-text mt-1 block w-full" value="${avaliacaoData?.dataFatoGerador || new Date().toISOString().split('T')[0]}" required>
                </div>
            </div>
            <div id="itens-semoventes-container" class="mt-4">
                <h3 class="text-lg font-medium mb-2">Itens da Avaliação</h3>
                <!-- Itens serão adicionados aqui -->
            </div>
            <div class="mt-4">
                <button type="button" id="btn-adicionar-item-semovente" class="btn-secondary btn-sm">Adicionar Item</button>
            </div>
            <div class="mt-6 text-right">
                <strong>Valor Total da Avaliação: <span id="valor-total-avaliacao" class="text-xl">R$ 0,00</span></strong>
            </div>
            <div class="form-actions mt-6">
                <button type="button" id="btn-cancelar-avaliacao" class="btn-secondary">Cancelar</button>
                <button type="submit" class="btn-primary">Salvar Avaliação</button>
            </div>
        `);

        if (avaliacaoData && avaliacaoData.itens) {
            avaliacaoData.itens.forEach(item => adicionarLinhaItem(item));
        } else {
            adicionarLinhaItem();
        }

        document.getElementById('btn-adicionar-item-semovente').addEventListener('click', () => adicionarLinhaItem());
        document.getElementById('btn-cancelar-avaliacao').addEventListener('click', () => appModuleRef.handleMenuAction('itcd-gerir-avaliacoes'));
        document.getElementById('avaliacao-semovente-form').addEventListener('submit', (e) => {
            e.preventDefault();
            salvarAvaliacao(isEditing ? avaliacaoData.id : null);
        });
        
        document.getElementById('data-fato-gerador').addEventListener('change', calcularValorTotal);
    }

    async function adicionarLinhaItem(itemData = {}) {
        const pautas = await carregarPautas();
        const anoFatoGerador = new Date(document.getElementById('data-fato-gerador').value + 'T00:00:00').getFullYear();
        const pautaDoAno = pautas[anoFatoGerador] || {};

        const categorias = Object.keys(pautaDoAno);
        const categoriaOptions = categorias.map(cat => `<option value="${cat}" ${itemData.categoria === cat ? 'selected' : ''}>${cat}</option>`).join('');

        const container = document.getElementById('itens-semoventes-container');
        const itemDiv = document.createElement('div');
        itemDiv.className = 'grid grid-cols-12 gap-2 border-t pt-3 mt-3 item-semovente-row';
        itemDiv.innerHTML = `
            <div class="col-span-12 sm:col-span-4">
                <label class="block text-xs">Categoria:</label>
                <select class="form-input-text semovente-categoria text-sm">${categoriaOptions}</select>
            </div>
            <div class="col-span-12 sm:col-span-3">
                <label class="block text-xs">Especificação:</label>
                <select class="form-input-text semovente-especificacao text-sm"></select>
            </div>
            <div class="col-span-4 sm:col-span-1">
                <label class="block text-xs">Qtd.:</label>
                <input type="number" class="form-input-text semovente-quantidade text-sm" value="${itemData.quantidade || 1}" min="1">
            </div>
            <div class="col-span-8 sm:col-span-3">
                <label class="block text-xs">Valor Unitário (R$):</label>
                <input type="text" class="form-input-text semovente-valor-unitario text-sm" value="${itemData.valorUnitario || '0,00'}" readonly>
            </div>
            <div class="col-span-12 sm:col-span-1 flex items-end">
                <button type="button" class="btn-delete btn-remover-item-semovente btn-sm w-full">X</button>
            </div>
        `;
        container.appendChild(itemDiv);

        const categoriaSelect = itemDiv.querySelector('.semovente-categoria');
        const especificacaoSelect = itemDiv.querySelector('.semovente-especificacao');
        const quantidadeInput = itemDiv.querySelector('.semovente-quantidade');

        const updateEspecificacoes = () => {
            const categoriaSelecionada = categoriaSelect.value;
            const especificacoes = pautaDoAno[categoriaSelecionada] ? Object.keys(pautaDoAno[categoriaSelecionada]) : [];
            especificacaoSelect.innerHTML = especificacoes.map(esp => `<option value="${esp}">${esp}</option>`).join('');
            
            if (itemData.especificacao && especificacoes.includes(itemData.especificacao)) {
                especificacaoSelect.value = itemData.especificacao;
            }
            updateValorUnitario();
        };
        
        const updateValorUnitario = () => {
            const categoria = categoriaSelect.value;
            const especificacao = especificacaoSelect.value;
            const valor = (pautaDoAno[categoria] && pautaDoAno[categoria][especificacao]) || 0;
            itemDiv.querySelector('.semovente-valor-unitario').value = valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
            calcularValorTotal();
        };

        categoriaSelect.addEventListener('change', updateEspecificacoes);
        especificacaoSelect.addEventListener('change', updateValorUnitario);
        quantidadeInput.addEventListener('input', calcularValorTotal);
        itemDiv.querySelector('.btn-remover-item-semovente').addEventListener('click', () => {
            itemDiv.remove();
            calcularValorTotal();
        });

        updateEspecificacoes();
    }

    function calcularValorTotal() {
        let total = 0;
        document.querySelectorAll('.item-semovente-row').forEach(row => {
            const qtd = parseFloat(row.querySelector('.semovente-quantidade').value) || 0;
            const valorUnitarioStr = row.querySelector('.semovente-valor-unitario').value.replace(/\./g, '').replace(',', '.');
            const valorUnitario = parseFloat(valorUnitarioStr) || 0;
            total += qtd * valorUnitario;
        });
        document.getElementById('valor-total-avaliacao').textContent = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    async function salvarAvaliacao(idExistente = null) {
        const declaracao = document.getElementById('declaracao').value.trim();
        const dataFatoGerador = document.getElementById('data-fato-gerador').value;
        const itens = [];
        let formValido = true;

        document.querySelectorAll('.item-semovente-row').forEach(row => {
            const categoria = row.querySelector('.semovente-categoria').value;
            const especificacao = row.querySelector('.semovente-especificacao').value;
            const quantidade = parseInt(row.querySelector('.semovente-quantidade').value, 10);
            const valorUnitarioStr = row.querySelector('.semovente-valor-unitario').value.replace(/\./g, '').replace(',', '.');
            const valorUnitario = parseFloat(valorUnitarioStr);

            if (!categoria || !especificacao || isNaN(quantidade) || quantidade <= 0) {
                formValido = false;
            }
            itens.push({ categoria, especificacao, quantidade, valorUnitario });
        });

        if (!formValido || !dataFatoGerador) {
            uiModuleRef.showToastNotification("Preencha todos os campos obrigatórios e adicione pelo menos um item válido.", "error");
            return;
        }

        const valorTotalStr = document.getElementById('valor-total-avaliacao').textContent.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
        const valorTotal = parseFloat(valorTotalStr);

        const currentUser = await sharedUtilsRef.getCurrentUser();

        const avaliacao = {
            id: idExistente || sharedUtilsRef.generateUUID(),
            tipo: 'semovente',
            declaracao: declaracao,
            dataFatoGerador: dataFatoGerador,
            dataAvaliacao: new Date().toISOString().split('T')[0],
            responsavelMasp: currentUser.matricula,
            responsavelNome: currentUser.nome,
            itens: itens,
            valorTotal: valorTotal,
            modificationDate: new Date().toISOString(),
            creationDate: idExistente ? (await dbRef.getItemById('itcdAvaliacoesStore', idExistente)).creationDate : new Date().toISOString(),
        };

        try {
            if (idExistente) {
                await dbRef.updateItem('itcdAvaliacoesStore', avaliacao);
                uiModuleRef.showToastNotification("Avaliação de semovente atualizada com sucesso!", "success");
            } else {
                await dbRef.addItem('itcdAvaliacoesStore', avaliacao);
                uiModuleRef.showToastNotification("Avaliação de semovente salva com sucesso!", "success");
            }
            appModuleRef.handleMenuAction('itcd-gerir-avaliacoes');
        } catch (error) {
            console.error("Erro ao salvar avaliação de semovente:", error);
            uiModuleRef.showToastNotification(`Erro ao salvar: ${error.message}`, "error");
        }
    }

    return {
        init,
        renderFormAvaliacaoSemovente
    };

})();
