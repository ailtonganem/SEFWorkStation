// js/itcd/avaliacoes/semoventes.js - Módulo para Avaliação de Semoventes (ITCD)
// v4.3.0 - ADICIONADO: Exibição da quantidade total de semoventes no formulário para facilitar a conferência.
// v4.2.0 - ALTERADO: O responsável pela avaliação agora é sempre o usuário atual (definido nas configurações), tanto na criação quanto na edição, garantindo a correta atribuição da autoria.
// v4.1.0 - CORRIGIDO: Garante que o responsável e o MASP sejam corretamente preenchidos, usando os dados da avaliação em modo de edição ou os do usuário atual em um novo formulário.
// v4.0.0 - REATORADO: Implementa salvamento e carregamento via fileStorage, exibe dados calculados salvos sem recalcular, e adiciona lógica de versionamento ao salvar.
// v3.5.0 - ADICIONADO: Botão "Nova Avaliação Vinculada" no formulário para criar uma nova avaliação (de qualquer tipo) vinculada à atual.
// v3.4.0 - ALTERADO: A lógica de renderização agora pré-preenche o formulário sempre que dados de uma avaliação são fornecidos, suportando a criação de novas avaliações vinculadas.
// ... (histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ITCD = window.SEFWorkStation.ITCD || {};
window.SEFWorkStation.ITCD.AvaliacoesSemoventes = (function() {

    let mainContentWrapperRef;
    let dbRef;
    let appModuleRef;
    let uiModuleRef;
    let sharedUtilsRef;
    
    let srfCache = [];
    let ufCache = [];

    // Estado do formulário
    let temporaryAttachments = [];
    let existingAttachments = [];
    let linkedEntities = {
        documents: new Map(),
        contribuintes: new Map(),
        recursos: new Map(),
        itcdAvaliacoesStore: new Map()
    };

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
    
    const TIPOS_AVALIACAO = [
        { id: 'urbano', title: 'Imóvel Urbano', description: 'Para apartamentos, casas, lotes, salas comerciais e outros imóveis em área urbana.', action: 'itcd-avaliar-imovel-urbano', type: 'imovel', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-building" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M14.763.075A.5.5 0 0 1 15 .5v15a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5V14h-1v1.5a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5V14h-1v1.5a.5.5 0 0 1-.5.5H.5a.5.5 0 0 1-.5-.5v-15a.5.5 0 0 1 .237-.425l4.5-3a.5.5 0 0 1 .526 0l4.5 3 .474.316zM12 13.5V3.75l-4-2.667-4 2.667V13.5h8zM8 11h1v1H8v-1zm-2 0h1v1H6v-1zm-2 0h1v1H4v-1zm0-3h1v1H4v-1zm2 0h1v1H6v-1zm2 0h1v1H8v-1zm2 0h1v1h-1v-1zm-2-3h1v1H8V5zm-2 0h1v1H6V5z"/></svg>`},
        { id: 'rural', title: 'Imóvel Rural', description: 'Para fazendas, sítios, chácaras e terrenos localizados em área rural.', action: 'itcd-avaliar-imovel-rural', type: 'imovel', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-house-door" viewBox="0 0 16 16"><path d="M8.354 1.146a.5.5 0 0 0-.708 0l-6 6A.5.5 0 0 0 1.5 7.5v7a.5.5 0 0 0 .5.5h4.5a.5.5 0 0 0 .5-.5v-4h2v4a.5.5 0 0 0 .5.5H14a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.146-.354L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293L8.354 1.146zM2.5 14V7.707l5.5-5.5 5.5 5.5V14H10v-4a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5v4H2.5z"/></svg>`},
        { id: 'semovente', title: 'Semovente', description: 'Para avaliação de gado, equinos e outros tipos de rebanhos.', action: 'itcd-avaliar-semovente', type: 'semovente', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 16c0-2.2 1.8-4 4-4M5 10V4H3.5a2.5 2.5 0 1 0 0 5H5m0-5v2m0 3v2m1.1-4.8c-.2 1.3-1.3 2.3-2.6 2.3H5m0-5a2.5 2.5 0 1 1 5 0V10M12 4h2a2 2 0 1 1 0 4h-2v2a2 2 0 1 0 0 4h2a2 2 0 1 0 0 4h-2v2a2 2 0 1 1-4 0v-2a2 2 0 1 0-4 0v2H2"></path></svg>`}
    ];

    function formatToBRL(value) {
        if (isNaN(value) || value === null) return '';
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    
    function parseFromBRL(value) {
        if (!value || typeof value !== 'string') return 0;
        return parseFloat(value.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
    }


    function init(db, app, ui, utils, mainWrapper) {
        dbRef = db;
        appModuleRef = app;
        uiModuleRef = ui;
        sharedUtilsRef = utils;
        mainContentWrapperRef = mainWrapper;
        console.log("Módulo ITCD.AvaliacoesSemoventes inicializado (v4.3.0).");
    }

    async function renderFormAvaliacaoSemovente(data = null, isDuplicating = false) {
        const isEditing = data && data.id && !isDuplicating;
        const feedbackAreaId = "feedback-avaliacao-semovente";
        const currentUser = await sharedUtilsRef.getCurrentUser();
        
        temporaryAttachments = [];
        existingAttachments = isEditing ? [...(data.anexos || [])] : [];
        linkedEntities = {
            documents: new Map(), contribuintes: new Map(),
            recursos: new Map(), itcdAvaliacoesStore: new Map()
        };

        try {
            const [configSrf, configUf] = await Promise.all([
                dbRef.getItemById('itcdConfiguracoesStore', 'srfCidades'),
                dbRef.getItemById('itcdConfiguracoesStore', 'unidadesFazendarias')
            ]);
            
            srfCache = configSrf?.value || [];
            ufCache = configUf?.value || [];
            srfCache.sort((a,b) => a.nome.localeCompare(b.nome));

            let srfOptionsHtml = '<option value="">Selecione...</option>' + srfCache.map(srf => `<option value="${srf.nome}">${srf.nome}</option>`).join('');
            
            const hoje = new Date();
            const anoAtual = hoje.getFullYear();
            const anosOptions = Array.from({ length: 20 }, (_, i) => anoAtual - i).map(ano => `<option value="${ano}">${ano}</option>`).join('');
            const mesesOptions = Array.from({ length: 12 }, (_, i) => `<option value="${i+1}">${new Date(0, i).toLocaleString('pt-BR', {month:'long'})}</option>`).join('');

            const formTitle = isEditing ? 'Editar Avaliação de Semoventes' : (isDuplicating ? 'Nova Avaliação de Semoventes (Duplicada)' : 'Nova Avaliação de Semoventes');

            const pageHtml = `
            <div id="avaliacao-semovente-container" class="page-section max-w-none px-4 sm:px-6 lg:px-8">
                <h2 class="text-2xl font-semibold mb-4">${formTitle}</h2>
                <div id="${feedbackAreaId}" class="mb-6"></div>

                <form id="form-avaliacao-semovente" class="space-y-6">
                    <div class="section-box p-4 border dark:border-slate-700 rounded-lg">
                        <h3 class="section-header">Identificação</h3>
                        <div class="form-grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                            <div class="lg:col-span-1">
                                <label for="aval-semov-srf" class="dark:text-gray-300">Superintendência (SRF):</label>
                                <select id="aval-semov-srf" class="form-input-text mt-1">${srfOptionsHtml}</select>
                            </div>
                            <div class="lg:col-span-2">
                                <label for="aval-semov-uf" class="dark:text-gray-300">Unidade Fazendária (UF):</label>
                                <select id="aval-semov-uf" class="form-input-text mt-1" disabled><option>Selecione a SRF</option></select>
                            </div>
                            <div>
                                <label for="aval-semov-responsavel" class="dark:text-gray-300">Responsável:</label>
                                <input type="text" id="aval-semov-responsavel" class="form-input-text mt-1" value="${currentUser?.nome || 'N/A'}" readonly>
                            </div>
                            <div>
                                <label for="aval-semov-masp" class="dark:text-gray-300">MASP:</label>
                                <input type="text" id="aval-semov-masp" class="form-input-text mt-1" value="${currentUser?.matricula || 'N/A'}" readonly>
                            </div>
                            <div><label for="aval-semov-data-aval" class="dark:text-gray-300">Data da Avaliação:</label><input type="date" id="aval-semov-data-aval" class="form-input-text mt-1" value="${new Date().toISOString().substring(0, 10)}"></div>
                            <div><label for="aval-semov-declaracao" class="dark:text-gray-300">Declaração (DBD):</label><input type="text" id="aval-semov-declaracao" class="form-input-text mt-1" placeholder="Nº da DBD"></div>
                            <div><label for="aval-semov-cpf-produtor" class="dark:text-gray-300">CPF do Produtor:</label><input type="text" id="aval-semov-cpf-produtor" class="form-input-text mt-1" placeholder="___.___.___-__"></div>
                            <div><label for="aval-semov-insc-produtor" class="dark:text-gray-300">Inscrição de Produtor Rural:</label><input type="text" id="aval-semov-insc-produtor" class="form-input-text mt-1"></div>
                        </div>
                    </div>

                    <div class="section-box p-4 border dark:border-slate-700 rounded-lg">
                        <h3 class="section-header">Avaliação dos Semoventes</h3>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div>
                                <label for="aval-semov-mes-fato" class="dark:text-gray-300">Mês do Fato Gerador:</label>
                                <select id="aval-semov-mes-fato" class="form-input-text mt-1">${mesesOptions}</select>
                            </div>
                             <div>
                                <label for="aval-semov-ano-fato" class="dark:text-gray-300">Ano do Fato Gerador:</label>
                                <select id="aval-semov-ano-fato" class="form-input-text mt-1">${anosOptions}</select>
                            </div>
                        </div>
                        <div id="grid-semoventes-container" class="space-y-2">
                            ${CATEGORIAS_SEMOVENTES.map(cat => `
                                <div class="grid grid-cols-12 gap-x-4 items-center p-1.5 border-b dark:border-slate-700/50">
                                    <label class="col-span-12 sm:col-span-4 text-sm font-medium dark:text-gray-300" for="qte-${cat.key}">${cat.label}:</label>
                                    <div class="col-span-4 sm:col-span-2"><input type="number" id="qte-${cat.key}" data-key="${cat.key}" class="form-input-text text-sm semov-qte-input" placeholder="Qte"></div>
                                    <div class="col-span-4 sm:col-span-3"><input type="text" id="pauta-${cat.key}" class="form-input-text text-sm bg-gray-100 dark:bg-slate-700" readonly placeholder="Valor Pauta"></div>
                                    <div class="col-span-4 sm:col-span-3"><input type="text" id="total-${cat.key}" class="form-input-text text-sm bg-gray-200 dark:bg-slate-600 font-semibold" readonly placeholder="Total"></div>
                                </div>
                            `).join('')}
                        </div>
                        <div class="mt-6 p-4 bg-gray-100 dark:bg-slate-800 rounded-lg flex justify-end items-center gap-6">
                            <div class="text-right">
                                <label class="text-md font-bold dark:text-gray-200">QUANTIDADE TOTAL:</label>
                                <p id="semov-qte-total" class="text-2xl font-bold text-gray-800 dark:text-gray-100">0</p>
                            </div>
                            <div class="text-right">
                                <label class="text-md font-bold dark:text-gray-200">VALOR TOTAL DA AVALIAÇÃO:</label>
                                <p id="semov-total-geral" class="text-2xl font-bold text-red-600 dark:text-red-400">R$ 0,00</p>
                            </div>
                        </div>
                    </div>

                    <div class="section-box p-4 border dark:border-slate-700 rounded-lg">
                        <h3 class="section-header">Anexos</h3>
                        <div id="existing-attachments-container" class="space-y-2 mb-3"></div>
                        <input type="file" id="avaliacao-anexos-input" class="form-input-file" multiple>
                        <div id="avaliacao-anexos-container" class="mt-2 space-y-2"><p class="text-xs text-gray-500 dark:text-gray-400">Nenhum anexo novo.</p></div>
                    </div>

                    <div class="section-box p-4 border dark:border-slate-700 rounded-lg">
                        <h3 class="section-header">Vincular a Outras Entidades</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label class="block text-sm font-medium dark:text-gray-300">Documentos:</label><div id="vinculos-documents-container" class="p-2 border rounded-md min-h-[40px] mt-1"></div><button type="button" class="btn-link mt-1 btn-gerenciar-vinculos" data-entity-store="documents">Gerenciar</button></div>
                            <div><label class="block text-sm font-medium dark:text-gray-300">Contribuintes:</label><div id="vinculos-contribuintes-container" class="p-2 border rounded-md min-h-[40px] mt-1"></div><button type="button" class="btn-link mt-1 btn-gerenciar-vinculos" data-entity-store="contribuintes">Gerenciar</button></div>
                            <div><label class="block text-sm font-medium dark:text-gray-300">Recursos:</label><div id="vinculos-recursos-container" class="p-2 border rounded-md min-h-[40px] mt-1"></div><button type="button" class="btn-link mt-1 btn-gerenciar-vinculos" data-entity-store="recursos">Gerenciar</button></div>
                            <div><label class="block text-sm font-medium dark:text-gray-300">Outras Avaliações:</label><div id="vinculos-itcdAvaliacoesStore-container" class="p-2 border rounded-md min-h-[40px] mt-1"></div><button type="button" class="btn-link mt-1 btn-gerenciar-vinculos" data-entity-store="itcdAvaliacoesStore">Gerenciar</button></div>
                        </div>
                    </div>
                     <div class="section-box p-4 border dark:border-slate-700 rounded-lg">
                        <h3 class="section-header">Observação do Avaliador</h3>
                        <textarea id="aval-semov-observacao" rows="3" class="form-input-text mt-1">Avaliação realizada com base na pauta de valores de semoventes da SEAPA, conforme documentação apresentada.</textarea>
                    </div>

                    <div class="form-actions mt-6 flex justify-end items-center gap-3">
                        <button type="button" id="btn-salvar-avaliacao-semovente" class="btn-secondary">${isEditing ? 'Salvar Alterações' : 'Salvar e Visualizar'}</button>
                        <button type="button" id="btn-nova-avaliacao-vinculada-semovente" class="btn-primary">Nova Avaliação Vinculada</button>
                    </div>
                </form>
            </div>
            `;

            mainContentWrapperRef.innerHTML = pageHtml;
            addEventListenersAvaliacaoSemovente(isEditing ? data : null);

            if (data) {
                await populateFormForEditing(data);
            }

        } catch (error) {
            console.error("Erro ao renderizar formulário de avaliação de semoventes:", error);
            mainContentWrapperRef.innerHTML = `<p class="feedback-message error">Erro ao renderizar formulário: ${error.message}</p>`;
        }
    }

    function addEventListenersAvaliacaoSemovente(originalData = null) {
        document.getElementById('btn-salvar-avaliacao-semovente')?.addEventListener('click', async () => {
             const savedData = await handleSalvarAvaliacaoCore(originalData);
            if (savedData) {
                appModuleRef.handleMenuAction('itcd-visualizar-avaliacao', { avaliacaoId: savedData.id });
            }
        });

        document.getElementById('btn-nova-avaliacao-vinculada-semovente')?.addEventListener('click', () => handleNovaAvaliacaoVinculada(originalData));
        
        const srfSelect = document.getElementById('aval-semov-srf');
        const ufSelect = document.getElementById('aval-semov-uf');
        
        srfSelect.addEventListener('change', () => {
            const srfNomeSelecionado = srfSelect.value;
            const srfSelecionada = srfCache.find(s => s.nome === srfNomeSelecionado);
            
            ufSelect.innerHTML = '<option value="">Selecione...</option>';
            ufSelect.disabled = true;

            if (srfSelecionada) {
                const srfId = srfSelecionada.id;
                const ufsDaSrf = ufCache.filter(uf => uf.srfId === srfId);
                
                if (ufsDaSrf.length > 0) {
                    ufsDaSrf.sort((a,b) => a.nome.localeCompare(b.nome)).forEach(uf => {
                        ufSelect.innerHTML += `<option value="${uf.id}">${uf.nome} (${uf.tipo})</option>`;
                    });
                    ufSelect.disabled = false;
                } else {
                    ufSelect.innerHTML = '<option value="">Nenhuma UF para esta SRF</option>';
                }
            }
        });
        
        document.getElementById('aval-semov-mes-fato').addEventListener('change', carregarPautaEAtualizarFormulario);
        document.getElementById('aval-semov-ano-fato').addEventListener('change', carregarPautaEAtualizarFormulario);

        document.getElementById('grid-semoventes-container').addEventListener('input', (e) => {
            if (e.target.classList.contains('semov-qte-input')) {
                calcularTotaisSemoventes();
            }
        });

        document.getElementById('avaliacao-anexos-input')?.addEventListener('change', handleAttachmentSelection);
        mainContentWrapperRef.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-remove-attachment')) {
                const tempId = e.target.dataset.tempId;
                temporaryAttachments = temporaryAttachments.filter(att => att.tempId !== tempId);
                renderAttachmentChips();
            } else if (e.target.matches('.btn-gerenciar-vinculos')) {
                abrirModalSelecaoVinculos(e.target.dataset.entityStore);
            } else if (e.target.classList.contains('btn-remove-vinculo')) {
                handleRemoverVinculo(e);
            } else if (e.target.classList.contains('btn-remove-existing-attachment')) {
                const anexoId = e.target.dataset.id;
                existingAttachments = existingAttachments.filter(a => a.id.toString() !== anexoId);
                renderExistingAttachments();
                uiModuleRef.showToastNotification("Anexo marcado para remoção. Salve para confirmar.", "info");
            }
        });
    }
    
    async function carregarPautaEAtualizarFormulario() {
        const mesSelect = document.getElementById('aval-semov-mes-fato');
        const anoSelect = document.getElementById('aval-semov-ano-fato');
        
        if (!mesSelect.value || !anoSelect.value) {
            CATEGORIAS_SEMOVENTES.forEach(cat => {
                const pautaInput = document.getElementById(`pauta-${cat.key}`);
                pautaInput.value = '';
                pautaInput.dataset.valorPauta = '0';
            });
            calcularTotaisSemoventes();
            return;
        }

        const mes = mesSelect.value.padStart(2, '0');
        const ano = anoSelect.value;
        const pautaKey = `${ano}-${mes}`;
        
        try {
            let pautaData = await dbRef.getItemById('itcdSemoventesPautasStore', pautaKey);
            
            if (!pautaData) {
                console.warn(`Pauta para ${pautaKey} não encontrada no DB. Tentando fallback para JSON.`);
                try {
                    const response = await fetch('data/pautas_semoventes.json');
                    const todasPautas = await response.json();
                    pautaData = todasPautas.find(p => p.key === pautaKey);
                } catch (error) {
                    console.error("Erro ao fazer fallback para pautas_semoventes.json:", error);
                    pautaData = null;
                }
            }
            
            if (pautaData && pautaData.valores) {
                CATEGORIAS_SEMOVENTES.forEach(cat => {
                    const valor = pautaData.valores[cat.key] || 0;
                    const pautaInput = document.getElementById(`pauta-${cat.key}`);
                    pautaInput.value = formatToBRL(valor);
                    pautaInput.dataset.valorPauta = valor;
                });
                uiModuleRef.showToastNotification(`Pauta de ${mes}/${ano} carregada.`, 'success');
            } else {
                 CATEGORIAS_SEMOVENTES.forEach(cat => {
                    const pautaInput = document.getElementById(`pauta-${cat.key}`);
                    pautaInput.value = '';
                    pautaInput.dataset.valorPauta = '0';
                });
                uiModuleRef.showToastNotification(`Pauta de valores para ${mes}/${ano} não encontrada.`, 'warning');
            }
        } catch (error) {
            console.error("Erro ao carregar pauta:", error);
            uiModuleRef.showToastNotification(`Falha ao carregar pauta de valores.`, 'error');
        }
        
        calcularTotaisSemoventes();
    }

    function calcularTotaisSemoventes() {
        let totalGeral = 0;
        let quantidadeTotal = 0;
        document.querySelectorAll('.semov-qte-input').forEach(qteInput => {
            const key = qteInput.dataset.key;
            const quantidade = parseInt(qteInput.value, 10) || 0;
            quantidadeTotal += quantidade;
            const pautaInput = document.getElementById(`pauta-${key}`);
            const valorPauta = parseFloat(pautaInput.dataset.valorPauta) || 0;
            const totalLinha = quantidade * valorPauta;
            document.getElementById(`total-${key}`).value = formatToBRL(totalLinha);
            totalGeral += totalLinha;
        });
        document.getElementById('semov-total-geral').textContent = formatToBRL(totalGeral);
        document.getElementById('semov-qte-total').textContent = quantidadeTotal;
    }
    
    async function handleSalvarAvaliacaoCore(originalData = null) {
        const isEditing = originalData && originalData.id;
        const currentUser = await sharedUtilsRef.getCurrentUser();
        const srfSelecionada = srfCache.find(s => s.nome === document.getElementById('aval-semov-srf').value);

        const mes = document.getElementById('aval-semov-mes-fato').value;
        const ano = document.getElementById('aval-semov-ano-fato').value;
        const pautaKey = `${ano}-${mes.padStart(2, '0')}`;
        const pautaDb = await dbRef.getItemById('itcdSemoventesPautasStore', pautaKey);
        const pautaParaSalvar = pautaDb ? pautaDb.valores : {};
        if (Object.keys(pautaParaSalvar).length === 0) {
            console.warn(`Pauta para ${pautaKey} não encontrada no momento do salvamento. Os valores de pauta serão salvos como zero.`);
        }
        
        const dadosFormulario = {
            srfId: srfSelecionada ? srfSelecionada.id : null,
            srfNome: srfSelecionada ? srfSelecionada.nome : document.getElementById('aval-semov-srf').value,
            ufId: document.getElementById('aval-semov-uf').value,
            declaracao: document.getElementById('aval-semov-declaracao').value.trim(),
            cpfProdutor: document.getElementById('aval-semov-cpf-produtor').value.trim(),
            inscricaoProdutor: document.getElementById('aval-semov-insc-produtor').value.trim(),
            fatoGeradorMes: mes,
            fatoGeradorAno: ano,
            quantidades: {},
            pautaUtilizada: pautaParaSalvar,
            observacao: document.getElementById('aval-semov-observacao').value
        };

        document.querySelectorAll('.semov-qte-input').forEach(input => {
            dadosFormulario.quantidades[input.dataset.key] = parseInt(input.value) || 0;
        });
        
        const valorTotalAvaliado = parseFromBRL(document.getElementById('semov-total-geral').textContent);

        const avaliacaoData = {
            id: isEditing ? originalData.id : appModuleRef.generateUUID(),
            creationDate: isEditing ? originalData.creationDate : new Date().toISOString(),
            modificationDate: new Date().toISOString(),
            tipo: 'semovente',
            responsavelMasp: currentUser.matricula,
            responsavelNome: currentUser.nome,
            declaracao: dadosFormulario.declaracao,
            dataAvaliacao: document.getElementById('aval-semov-data-aval').value,
            dadosFormulario,
            dadosCalculados: { valorTotal: valorTotalAvaliado },
            documentosVinculadosIds: Array.from(linkedEntities.documents.keys()),
            contribuintesVinculadosIds: Array.from(linkedEntities.contribuintes.keys()),
            recursosVinculadosIds: Array.from(linkedEntities.recursos.keys()),
            vinculosAvaliacoesIds: Array.from(linkedEntities.itcdAvaliacoesStore.keys()),
            anexos: existingAttachments,
            _versions: isEditing ? (originalData._versions || []) : []
        };

        if (isEditing) {
            const versaoAnterior = {
                versionDate: originalData.modificationDate,
                modifiedBy: originalData.responsavelNome || 'N/A',
                dadosFormulario: originalData.dadosFormulario,
                dadosCalculados: originalData.dadosCalculados
            };
            avaliacaoData._versions.push(versaoAnterior);
        }

        if (!avaliacaoData.declaracao) {
            uiModuleRef.showToastNotification("O campo 'Declaração (DBD)' é obrigatório.", "error");
            return null;
        }

        try {
            uiModuleRef.showLoading(true, "Salvando avaliação...");
            
            const pastaAnexos = await sharedUtilsRef.getOrCreateAttachmentDirHandle('itcd/avaliacoes', avaliacaoData.id);
            if (pastaAnexos) {
                for (const anexo of temporaryAttachments) {
                    const fileHandle = await pastaAnexos.getFileHandle(anexo.file.name, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(anexo.file);
                    await writable.close();
                    avaliacaoData.anexos.push({
                        id: appModuleRef.generateUUID(), fileName: anexo.file.name, fileSize: anexo.file.size,
                        fileType: anexo.file.type, uploadDate: new Date().toISOString(),
                        filePath: `attachments_sef/itcd/avaliacoes/${avaliacaoData.id}/${anexo.file.name}`
                    });
                }
            }
            
            await dbRef.updateItem(dbRef.STORES.ITCD_AVALIACOES, avaliacaoData);
            uiModuleRef.showToastNotification(`Avaliação de semoventes salva com sucesso!`, "success");
            return avaliacaoData;
        } catch (error) {
            console.error("Erro ao salvar avaliação de semoventes:", error);
            uiModuleRef.showToastNotification(`Falha ao salvar: ${error.message}`, "error", 0);
            return null;
        } finally {
            uiModuleRef.showLoading(false);
        }
    }

    async function populateFormForEditing(data) {
        if (!data) return;
        const form = data.dadosFormulario || {};
        const calc = data.dadosCalculados || {};

        const srfSelect = document.getElementById('aval-semov-srf');
        srfSelect.value = form.srfNome || '';
        srfSelect.dispatchEvent(new Event('change'));

        setTimeout(async () => {
            document.getElementById('aval-semov-uf').value = form.ufId || '';
            document.getElementById('aval-semov-mes-fato').value = form.fatoGeradorMes || '';
            document.getElementById('aval-semov-ano-fato').value = form.fatoGeradorAno || '';
            await carregarPautaEAtualizarFormulario();
            
            if (form.quantidades) {
                for (const key in form.quantidades) {
                    const input = document.getElementById(`qte-${key}`);
                    if (input) input.value = form.quantidades[key];
                }
            }
            calcularTotaisSemoventes();
            
        }, 200);

        document.getElementById('aval-semov-data-aval').value = data.dataAvaliacao || '';
        document.getElementById('aval-semov-declaracao').value = data.declaracao || '';
        document.getElementById('aval-semov-cpf-produtor').value = form.cpfProdutor || '';
        document.getElementById('aval-semov-insc-produtor').value = form.inscricaoProdutor || '';
        document.getElementById('aval-semov-observacao').value = form.observacao || '';

        if (data.documentosVinculadosIds) data.documentosVinculadosIds.forEach(id => linkedEntities.documents.set(id, null));
        if (data.contribuintesVinculadosIds) data.contribuintesVinculadosIds.forEach(id => linkedEntities.contribuintes.set(id, null));
        if (data.recursosVinculadosIds) data.recursosVinculadosIds.forEach(id => linkedEntities.recursos.set(id, null));
        if (data.vinculosAvaliacoesIds) data.vinculosAvaliacoesIds.forEach(id => linkedEntities.itcdAvaliacoesStore.set(id, null));
        
        await renderizarChipsDeVinculos();
        renderExistingAttachments();
    }
    
    function renderExistingAttachments() {
        const container = document.getElementById('existing-attachments-container');
        if (!container) return;
        container.innerHTML = '';
        if (existingAttachments.length > 0) {
            container.innerHTML += '<h4 class="text-sm font-medium mb-1 dark:text-gray-200">Anexos existentes:</h4>';
            existingAttachments.forEach(anexo => {
                const chip = document.createElement('div');
                chip.className = 'chip-item-existing flex items-center justify-between p-1.5 bg-gray-100 dark:bg-slate-700 rounded';
                chip.innerHTML = `<span class="text-xs truncate dark:text-gray-300">${anexo.fileName}</span>
                                  <button type="button" class="btn-remove-existing-attachment text-red-500 hover:text-red-700 ml-2" data-id="${anexo.id}" title="Remover este anexo ao salvar">×</button>`;
                container.appendChild(chip);
            });
        }
    }

    function handleAttachmentSelection(event) {
        const files = Array.from(event.target.files);
        files.forEach(file => {
            const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            temporaryAttachments.push({ tempId, file });
        });
        renderAttachmentChips();
        event.target.value = '';
    }

    function renderAttachmentChips() {
        const container = document.getElementById('avaliacao-anexos-container');
        if (!container) return;
        if (temporaryAttachments.length === 0) {
            container.innerHTML = '<p class="text-xs text-gray-500 dark:text-gray-400">Nenhum anexo novo.</p>';
        } else {
            container.innerHTML = temporaryAttachments.map(att => `
                <span class="chip-item inline-flex items-center px-2 py-1 mr-1 mt-1 text-xs font-medium bg-blue-100 dark:bg-blue-700 text-blue-800 dark:text-blue-200 rounded-full">
                    <span class="dark:text-gray-200">${att.file.name}</span>
                    <button type="button" class="ml-1.5 btn-remove-attachment" data-temp-id="${att.tempId}">×</button>
                </span>`).join('');
        }
    }
    
    async function abrirModalSelecaoVinculos(entityStoreName) {
        const config = window.SEFWorkStation.EntityConfig.getConfigByStoreName(entityStoreName);
        if (!config) return;
        
        uiModuleRef.showLoading(true, `Carregando ${config.labelPlural}...`);
        
        const allItems = await dbRef.getAllItems(entityStoreName);
        const activeItems = window.SEFWorkStation.EntityConfig.filterActiveItems(allItems, entityStoreName);
        
        let modalContent = `
            <div class="mb-3">
                <input type="search" id="modal-vinculo-search" class="form-input-text w-full text-sm" placeholder="Pesquisar por nome ou ID...">
            </div>
            <div id="modal-vinculo-list" class="space-y-2 max-h-80 overflow-y-auto">
        `;
        activeItems.forEach(item => {
            const displayName = item[config.displayField] || `ID: ${item.id}`;
            const secondaryInfo = item[config.secondaryField] ? `(${item[config.secondaryField]})` : '';
            const isChecked = linkedEntities[entityStoreName].has(item.id);
            const searchText = `${displayName} ${secondaryInfo} ${item.id} ${item.declaracao || ''}`.toLowerCase();
            modalContent += `
                <label class="block p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700 dark:text-gray-300" data-search-text="${searchText}">
                    <input type="checkbox" value="${item.id}" class="form-checkbox modal-vinculo-checkbox" ${isChecked ? 'checked' : ''}>
                    <span class="ml-2 text-sm">${displayName} ${secondaryInfo}</span>
                </label>`;
        });
        modalContent += `</div>`;
        
        uiModuleRef.showLoading(false);

        const modal = uiModuleRef.showModal(`Selecionar ${config.labelPlural}`, modalContent, [
            { text: 'Cancelar', class: 'btn-secondary', closesModal: true },
            { text: 'Confirmar Seleção', class: 'btn-primary', closesModal: true, callback: () => {
                const selectedIds = Array.from(document.querySelectorAll('.modal-vinculo-checkbox:checked')).map(cb => cb.value);
                linkedEntities[entityStoreName].clear();
                selectedIds.forEach(id => linkedEntities[entityStoreName].set(id, null));
                renderizarChipsDeVinculos();
            }}
        ]);

        if(modal) {
            const searchInput = modal.querySelector('#modal-vinculo-search');
            const listContainer = modal.querySelector('#modal-vinculo-list');
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                listContainer.querySelectorAll('label').forEach(label => {
                    const searchableText = label.dataset.searchText;
                    if (searchableText.includes(searchTerm)) {
                        label.classList.remove('hidden');
                    } else {
                        label.classList.add('hidden');
                    }
                });
            });
        }
    }

    async function renderizarChipsDeVinculos() {
        for (const storeName in linkedEntities) {
            const container = document.getElementById(`vinculos-${storeName}-container`);
            const map = linkedEntities[storeName];
            if (!container) continue;
            
            container.innerHTML = '';
            if (map.size === 0) {
                container.innerHTML = `<p class="text-xs text-gray-500 dark:text-gray-400">Nenhum item vinculado.</p>`;
                continue;
            }

            const config = window.SEFWorkStation.EntityConfig.getConfigByStoreName(storeName);
            if (!config) continue;
            
            for (const id of map.keys()) {
                const item = await dbRef.getItemById(storeName, id);
                if (item) {
                    const chip = document.createElement('span');
                    chip.className = 'chip-item inline-flex items-center px-2 py-1 mr-1 mt-1 text-xs font-medium bg-gray-200 dark:bg-gray-600 rounded-full';
                    chip.innerHTML = `<span class="dark:text-gray-200">${item[config.displayField] || 'ID:'+id}</span> <button type="button" class="ml-1.5 inline-flex text-current opacity-75 hover:opacity-100 btn-remove-vinculo" data-entity-store="${storeName}" data-id="${id}">×</button>`;
                    container.appendChild(chip);
                }
            }
        }
    }
    
    function handleRemoverVinculo(event) {
        const storeName = event.target.dataset.entityStore;
        const id = event.target.dataset.id;
        if (linkedEntities[storeName] && linkedEntities[storeName].has(id)) {
            linkedEntities[storeName].delete(id);
            renderizarChipsDeVinculos();
        }
    }

    function renderizarOpcoesAvaliacao(opcoes) {
        if (opcoes.length === 0) {
            return '<p class="text-center text-gray-500 p-4">Nenhum tipo de avaliação encontrado.</p>';
        }
        return opcoes.map(opt => `
            <div class="p-3 border dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer flex items-start gap-4 transition-colors duration-150 modal-avaliacao-option" data-action="${opt.action}">
                <div class="text-blue-500 dark:text-blue-400 mt-1">${opt.icon}</div>
                <div>
                    <h4 class="font-semibold text-gray-800 dark:text-gray-100">${opt.title}</h4>
                    <p class="text-xs text-gray-600 dark:text-gray-400">${opt.description}</p>
                </div>
            </div>
        `).join('');
    }

    function abrirModalNovaAvaliacaoVinculada(avaliacaoOriginal) {
        const modalId = 'modal-nova-avaliacao-vinculada-form';
        const modalContentHtml = `
            <div class="p-1">
                <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">Selecione o tipo de avaliação a ser criada. Ela será automaticamente vinculada à DBD <strong>${avaliacaoOriginal.declaracao}</strong>.</p>
                <div id="modal-options-container" class="space-y-3 max-h-80 overflow-y-auto">
                    ${renderizarOpcoesAvaliacao(TIPOS_AVALIACAO)}
                </div>
            </div>
        `;

        const modal = uiModuleRef.showModal('Nova Avaliação Vinculada', modalContentHtml, [], 'max-w-xl', modalId);

        if (modal) {
            modal.addEventListener('click', function(e) {
                const card = e.target.closest('.modal-avaliacao-option');
                if (card) {
                    const action = card.dataset.action;
                    if (action) {
                        const dadosParaNovaAvaliacao = {
                            declaracao: avaliacaoOriginal.declaracao,
                            vinculosAvaliacoesIds: [avaliacaoOriginal.id],
                            dadosFormulario: {
                                srfId: avaliacaoOriginal.dadosFormulario?.srfId,
                                ufId: avaliacaoOriginal.dadosFormulario?.ufId,
                            }
                        };
                        
                        appModuleRef.handleMenuAction(action, { avaliacaoData: dadosParaNovaAvaliacao });
                        uiModuleRef.closeModal();
                    }
                }
            });
        }
    }

    async function handleNovaAvaliacaoVinculada(originalData) {
        uiModuleRef.showLoading(true, "Salvando avaliação atual...");
        const savedData = await handleSalvarAvaliacaoCore(originalData);
        uiModuleRef.showLoading(false);

        if (savedData) {
            abrirModalNovaAvaliacaoVinculada(savedData);
        } else {
            uiModuleRef.showToastNotification("Falha ao salvar a avaliação atual. Não é possível criar uma nova avaliação vinculada.", "error");
        }
    }


    return {
        init,
        renderFormAvaliacaoSemovente
    };
})();