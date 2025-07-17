// js/itcd/avaliacoes/urbano.js - Módulo para Avaliação de Imóveis Urbanos (ITCD)
// v2.5.0 - MELHORIA: Adicionado campo "Fonte do Maior Valor" para indicar a origem do maior valor em UFEMG (Avaliação, Declarado ou IPTU). A lógica de cálculo foi ajustada para identificar e salvar esta informação, garantindo que os pareceres utilizem o valor em BRL correspondente.
// v2.4.1 - CORREÇÃO: Corrige erro 'ReferenceError' ao buscar valor do m² do terreno, ajustando a referência para a store de configurações.
// v2.4.0 - ALTERADO: O responsável pela avaliação agora é sempre o usuário atual (definido nas configurações), tanto na criação quanto na edição, garantindo a correta atribuição da autoria da alteração.
// v2.3.0 - CORRIGIDO: Garante que o responsável e o MASP sejam corretamente preenchidos, usando os dados da avaliação em modo de edição ou os do usuário atual em um novo formulário.
// v2.2.0 - CORRIGIDO: Popula os campos de responsável com os dados do usuário atual ao criar nova avaliação.
// v2.1.0 - CORRIGIDO: Adicionada a função 'updateValorM2Terreno' que estava faltando, resolvendo o erro fatal 'ReferenceError'.
// ... (histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ITCD = window.SEFWorkStation.ITCD || {};
window.SEFWorkStation.ITCD.AvaliacoesUrbano = (function() {

    let mainContentWrapperRef;
    let dbRef;
    let appModuleRef;
    let uiModuleRef;
    let sharedUtilsRef;
    let srfCache = [];
    let ufCache = [];
    let urbanoConfigCache = {};
    let temporaryAttachments = [];
    let existingAttachments = [];
    
    let isFraçãoIdealManuallySet = false;

    let linkedEntities = {
        documents: new Map(),
        contribuintes: new Map(),
        recursos: new Map(),
        itcdAvaliacoesStore: new Map()
    };
    let tempSelectedIdsModal = [];

    const CLASSIFICACAO_CONSTRUTIVA_MAP = {
        'Residencial': {
            'Baixo': ['R-1', 'PP-4', 'R-8', 'PIS'],
            'Normal': ['R-1', 'PP-4', 'R-8', 'R-16'],
            'Alto': ['R-1', 'R-8', 'R-16']
        },
        'Comercial': {
            'Normal': ['CAL-8', 'CSL-8', 'CSL-16'],
            'Alto': ['CAL-8', 'CSL-8', 'CSL-16']
        },
        'Galpão': {
            'Padrão Único': ['GI', 'RP1Q']
        }
    };

    const TIPOS_AVALIACAO = [
        { id: 'urbano', title: 'Imóvel Urbano', description: 'Para apartamentos, casas, lotes, salas comerciais e outros imóveis em área urbana.', action: 'itcd-avaliar-imovel-urbano', type: 'imovel', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-building" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M14.763.075A.5.5 0 0 1 15 .5v15a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5V14h-1v1.5a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5V14h-1v1.5a.5.5 0 0 1-.5.5H.5a.5.5 0 0 1-.5-.5v-15a.5.5 0 0 1 .237-.425l4.5-3a.5.5 0 0 1 .526 0l4.5 3 .474.316zM12 13.5V3.75l-4-2.667-4 2.667V13.5h8zM8 11h1v1H8v-1zm-2 0h1v1H6v-1zm-2 0h1v1H4v-1zm0-3h1v1H4v-1zm2 0h1v1H6v-1zm2 0h1v1H8v-1zm2 0h1v1h-1v-1zm-2-3h1v1H8V5zm-2 0h1v1H6V5z"/></svg>`},
        { id: 'rural', title: 'Imóvel Rural', description: 'Para fazendas, sítios, chácaras e terrenos localizados em área rural.', action: 'itcd-avaliar-imovel-rural', type: 'imovel', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-house-door" viewBox="0 0 16 16"><path d="M8.354 1.146a.5.5 0 0 0-.708 0l-6 6A.5.5 0 0 0 1.5 7.5v7a.5.5 0 0 0 .5.5h4.5a.5.5 0 0 0 .5-.5v-4h2v4a.5.5 0 0 0 .5.5H14a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.146-.354L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293L8.354 1.146zM2.5 14V7.707l5.5-5.5 5.5 5.5V14H10v-4a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5v4H2.5z"/></svg>`},
        { id: 'semovente', title: 'Semovente', description: 'Para avaliação de gado, equinos e outros tipos de rebanhos.', action: 'itcd-avaliar-semovente', type: 'semovente', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 16c0-2.2 1.8-4 4-4M5 10V4H3.5a2.5 2.5 0 1 0 0 5H5m0-5v2m0 3v2m1.1-4.8c-.2 1.3-1.3 2.3-2.6 2.3H5m0-5a2.5 2.5 0 1 1 5 0V10M12 4h2a2 2 0 1 1 0 4h-2v2a2 2 0 1 0 0 4h2a2 2 0 1 0 0 4h-2v2a2 2 0 1 1-4 0v-2a2 2 0 1 0-4 0v2H2"></path></svg>`}
    ];

    function getCubKey(utilizacao, padrao, classificacao) {
        if (!utilizacao || !padrao || !classificacao) return null;
        
        const utilKey = utilizacao.toLowerCase().replace('ã', 'a');
        let padraoKey = padrao.toLowerCase().replace('ú', 'u').replace(' ', '_');
        if (padraoKey === 'padrão_unico') padraoKey = '';
        
        const classKey = classificacao.toLowerCase().replace('-', '');

        const finalKey = [utilKey, padraoKey, classKey].filter(Boolean).join('_');
        return finalKey;
    }

    function formatToBRL(value) {
        if (isNaN(value) || value === null) return '';
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    
    function parseFromBRL(value) {
        if (!value || typeof value !== 'string') return 0;
        return parseFloat(value.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
    }

    function getFloatVal(id) {
        const el = document.getElementById(id);
        if (!el) return 0;
        const valueStr = el.value.replace(/\./g, '').replace(',', '.').trim();
        return parseFloat(valueStr) || 0;
    }

    function init(db, app, ui, utils, mainWrapper) {
        dbRef = db;
        appModuleRef = app;
        uiModuleRef = ui;
        sharedUtilsRef = utils;
        mainContentWrapperRef = mainWrapper;
        console.log("Módulo ITCD.AvaliacoesUrbano inicializado (v2.5.0).");
    }

    async function renderFormAvaliacaoUrbana(data = null, isDuplicating = false) {
        isFraçãoIdealManuallySet = false;
        const isEditing = data && data.id && !isDuplicating;
        const feedbackAreaId = "feedback-avaliacao-urbana";
        const currentUser = await sharedUtilsRef.getCurrentUser();
        const userPrefs = SEFWorkStation.Configuracoes.carregarUserPreferences();
        temporaryAttachments = [];
        existingAttachments = isEditing ? [...(data.anexos || [])] : [];
        linkedEntities = {
            documents: new Map(),
            contribuintes: new Map(),
            recursos: new Map(),
            itcdAvaliacoesStore: new Map()
        };
        
        try {
            const [
                configSrf, configUf, todosDocumentos, configLocalizacoes, 
                configDepreciacao, configGeral, configTipoTerreno, configConservacao,
                configAptoFatores
            ] = await Promise.all([
                dbRef.getItemById('itcdConfiguracoesStore', 'srfCidades'),
                dbRef.getItemById('itcdConfiguracoesStore', 'unidadesFazendarias'),
                dbRef.getAllItems(dbRef.STORES.DOCUMENTS),
                dbRef.getItemById('itcdConfiguracoesStore', 'urbanoLocalizacoes'),
                dbRef.getItemById('itcdConfiguracoesStore', 'urbanoDepreciacao'),
                dbRef.getItemById('itcdConfiguracoesStore', 'urbanoGeral'),
                dbRef.getItemById('itcdConfiguracoesStore', 'urbanoTipoTerreno'),
                dbRef.getItemById('itcdConfiguracoesStore', 'urbanoConservacao'),
                dbRef.getItemById('itcdConfiguracoesStore', 'urbanoApartamentoFatores')
            ]);
            
            srfCache = configSrf?.value || [];
            ufCache = configUf?.value || [];
            srfCache.sort((a,b) => a.nome.localeCompare(b.nome));
            urbanoConfigCache.localizacoes = (configLocalizacoes?.value && configLocalizacoes.value.length > 0) ? configLocalizacoes.value : ['CENTRAL', 'EXCELENTE', 'BOA', 'MÉDIA', 'POPULAR', 'CHÁCARA URBANA', 'PERIFÉRICOS'].map(nome => ({ id: appModuleRef.generateUUID(), nome }));
            urbanoConfigCache.depreciacao = (configDepreciacao?.value && configDepreciacao.value.length > 0) ? configDepreciacao.value : [{ id: appModuleRef.generateUUID(), nome: 'ATÉ 5 ANOS', valor: 100 }, { id: appModuleRef.generateUUID(), nome: '6 A 10 ANOS', valor: 94.50 }, { id: appModuleRef.generateUUID(), nome: '11 A 15 ANOS', valor: 90.72 }, { id: appModuleRef.generateUUID(), nome: '16 A 20 ANOS', valor: 88.00 }, { id: appModuleRef.generateUUID(), nome: 'ACIMA DE 20 ANOS', valor: 85.10 }];
            urbanoConfigCache.tipoTerreno = (configTipoTerreno?.value && configTipoTerreno.value.length > 0) ? configTipoTerreno.value : [{ id: appModuleRef.generateUUID(), nome: 'Plano', valor: 100 }, { id: appModuleRef.generateUUID(), nome: 'Em Aclive', valor: 95 }, { id: appModuleRef.generateUUID(), nome: 'Em Declive', valor: 90 }, { id: appModuleRef.generateUUID(), nome: 'Inundável', valor: 70 }];
            urbanoConfigCache.conservacao = (configConservacao?.value && configConservacao.value.length > 0) ? configConservacao.value : [{id:appModuleRef.generateUUID(),nome:"NOVO",valor:100},{id:appModuleRef.generateUUID(),nome:"ENTRE NOVO E REGULAR",valor:99.68},{id:appModuleRef.generateUUID(),nome:"REGULAR",valor:97.48},{id:appModuleRef.generateUUID(),nome:"ENTRE REGULAR E REPAROS SIMPLES",valor:91.91},{id:appModuleRef.generateUUID(),nome:"REPAROS SIMPLES",valor:81.9},{id:appModuleRef.generateUUID(),nome:"ENTRE REP. SIMPLES E REP. IMPORTANTES",valor:66.8},{id:appModuleRef.generateUUID(),nome:"REPAROS IMPORTANTES",valor:47.4},{id:appModuleRef.generateUUID(),nome:"ENTRE REP. IMPORTANTES E SEM VALOR",valor:24.8},{id:appModuleRef.generateUUID(),nome:"SEM VALOR",valor:0}];
            urbanoConfigCache.geral = configGeral?.value || { edicula: 30, esquina: 25 };
            urbanoConfigCache.apartamento = configAptoFatores?.value || { baixo: 1.5, normal: 2.0, alto: 2.5 };


            let metodologiaOptionsHtml = '<option value="">Selecione um modelo de metodologia...</option>';
            const validasCategoriasNormalizadas = ["avaliacao", "itcd/avaliacao"];
            const tipoAlvoNormalizado = "itcd";
            const modelosMetodologia = todosDocumentos.filter(doc => {
                if (doc.isDeleted) return false;
                const tipoDocNormalizado = doc.docType ? doc.docType.trim().toLowerCase() : '';
                if (tipoDocNormalizado !== tipoAlvoNormalizado) return false;
                if (Array.isArray(doc.categories)) {
                    return doc.categories.some(catString => {
                        if (!catString) return false;
                        const catNormalizada = catString.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split('/').map(s => s.trim()).join('/');
                        return validasCategoriasNormalizadas.includes(catNormalizada);
                    });
                }
                return false;
            }).sort((a, b) => (a.title || '').localeCompare(b.title || ''));
            modelosMetodologia.forEach(doc => {
                metodologiaOptionsHtml += `<option value="${doc.id}">${doc.title}</option>`;
            });

            let srfOptionsHtml = '<option value="">Selecione uma SRF...</option>';
            srfCache.forEach(srf => {
                const selected = (isEditing || isDuplicating) && data.dadosFormulario ? srf.id === data.dadosFormulario.srfId : srf.id === userPrefs.lastUsedSrfId;
                srfOptionsHtml += `<option value="${srf.id}" ${selected ? 'selected' : ''}>${srf.nome}</option>`;
            });

            let localizacaoOptionsHtml = urbanoConfigCache.localizacoes.map(loc => `<option value="${loc.nome}">${loc.nome}</option>`).join('');
            let depreciacaoOptionsHtml = urbanoConfigCache.depreciacao.map(dep => `<option value="${dep.nome}" data-percent="${dep.valor / 100}">${dep.nome}</option>`).join('');
            let tipoTerrenoOptionsHtml = urbanoConfigCache.tipoTerreno.map(tipo => `<option value="${tipo.nome}" data-percent="${tipo.valor / 100}">${tipo.nome}</option>`).join('');
            let conservacaoOptionsHtml = urbanoConfigCache.conservacao.map(item => `<option value="${item.nome}" data-percent="${item.valor / 100}">${item.nome}</option>`).join('');


            const vinculosHtml = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium dark:text-gray-300">Documentos Relacionados:</label>
                        <div id="vinculos-documents-container" class="p-2 border rounded-md min-h-[40px] bg-gray-50 dark:bg-slate-800/50 mt-1"></div>
                        <button type="button" class="btn-link mt-1 btn-gerenciar-vinculos" data-entity-store="documents">Gerenciar Vínculos</button>
                    </div>
                     <div>
                        <label class="block text-sm font-medium dark:text-gray-300">Contribuintes Relacionados:</label>
                        <div id="vinculos-contribuintes-container" class="p-2 border rounded-md min-h-[40px] bg-gray-50 dark:bg-slate-800/50 mt-1"></div>
                        <button type="button" class="btn-link mt-1 btn-gerenciar-vinculos" data-entity-store="contribuintes">Gerenciar Vínculos</button>
                    </div>
                    <div>
                        <label class="block text-sm font-medium dark:text-gray-300">Recursos Relacionados:</label>
                        <div id="vinculos-recursos-container" class="p-2 border rounded-md min-h-[40px] bg-gray-50 dark:bg-slate-800/50 mt-1"></div>
                        <button type="button" class="btn-link mt-1 btn-gerenciar-vinculos" data-entity-store="recursos">Gerenciar Vínculos</button>
                    </div>
                     <div>
                        <label class="block text-sm font-medium dark:text-gray-300">Outras Avaliações Vinculadas:</label>
                        <div id="vinculos-itcdAvaliacoesStore-container" class="p-2 border rounded-md min-h-[40px] bg-gray-50 dark:bg-slate-800/50 mt-1"></div>
                        <button type="button" class="btn-link mt-1 btn-gerenciar-vinculos" data-entity-store="itcdAvaliacoesStore">Gerenciar Vínculos</button>
                    </div>
                </div>
            `;
            
            const formTitle = isEditing ? 'Editar Parecer de Avaliação' : (isDuplicating ? 'Novo Parecer (Duplicado)' : 'Novo Parecer de Avaliação');
            
            const pageHtml = `
            <div id="avaliacao-urbana-container" class="page-section max-w-none px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-100">${formTitle}</h2>
                </div>
                <div id="${feedbackAreaId}" class="mb-6"></div>

                <form id="form-avaliacao-urbana">
                    
                    <div class="section-box p-4 border dark:border-slate-700 rounded-lg mb-6">
                        <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100">Identificação da Administração Fazendária</h3>
                         <div class="form-grid grid-cols-1 md:grid-cols-2">
                            <div>
                                <label for="aval-urb-srf" class="block text-sm font-medium dark:text-gray-300">Superintendência Regional da Fazenda:</label>
                                <select id="aval-urb-srf" class="form-input-text mt-1">${srfOptionsHtml}</select>
                            </div>
                            <div>
                                <label for="aval-urb-uf" class="block text-sm font-medium dark:text-gray-300">Unidade Fazendária Responsável:</label>
                                <select id="aval-urb-uf" class="form-input-text mt-1" disabled>
                                    <option value="">Selecione uma SRF primeiro...</option>
                                </select>
                            </div>
                         </div>
                    </div>

                    <div class="section-box p-4 border dark:border-slate-700 rounded-lg mb-6">
                        <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100">Dados Gerais do Parecer</h3>
                        <div class="form-grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                            <div>
                                <label for="aval-urb-responsavel" class="block text-sm font-medium dark:text-gray-300">Responsável:</label>
                                <input type="text" id="aval-urb-responsavel" class="form-input-text mt-1" readonly value="${currentUser?.nome || 'Usuário não definido'}">
                            </div>
                            <div>
                                <label for="aval-urb-masp" class="block text-sm font-medium dark:text-gray-300">MASP:</label>
                                <input type="text" id="aval-urb-masp" class="form-input-text mt-1" readonly value="${currentUser?.matricula || 'N/A'}">
                            </div>
                             <div>
                                <label for="aval-urb-data" class="block text-sm font-medium dark:text-gray-300">Data da Avaliação:</label>
                                <input type="date" id="aval-urb-data" class="form-input-text mt-1">
                            </div>
                            <div class="lg:col-span-2">
                                <label for="aval-urb-declaracao" class="block text-sm font-medium dark:text-gray-300">Declaração (DBD):</label>
                                <input type="text" id="aval-urb-declaracao" class="form-input-text mt-1" placeholder="Ex: 25.003.0015026-7">
                            </div>
                            <div class="lg:col-span-3">
                                <div class="flex items-center">
                                    <label for="aval-urb-metodologia-select" class="block text-sm font-medium dark:text-gray-300">Modelo de Metodologia:</label>
                                    <span id="btn-ajuda-metodologia" class="ml-2 cursor-pointer" title="Clique para ver a ajuda">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-question-circle text-gray-400 dark:text-gray-500" viewBox="0 0 16 16">
                                          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                                          <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286a.237.237 0 0 0 .241.247zm2.325 6.443c.61 0 1.029-.394 1.029-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94 0 .533.425.927 1.01.927z"/>
                                        </svg>
                                    </span>
                                </div>
                                <select id="aval-urb-metodologia-select" class="form-input-text mt-1">
                                    ${metodologiaOptionsHtml}
                                </select>
                            </div>
                            <div class="md:col-span-2 lg:col-span-3">
                                <label for="aval-urb-metodologia" class="block text-sm font-medium dark:text-gray-300">Metodologia Aplicada:</label>
                                <textarea id="aval-urb-metodologia" rows="5" class="form-input-text mt-1"></textarea>
                            </div>
                        </div>
                    </div>

                    <div class="section-box p-4 border dark:border-slate-700 rounded-lg mb-6">
                        <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100">Dados do Imóvel</h3>
                        <div class="form-grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                            <div class="lg:col-span-2">
                                <label for="aval-urb-municipio" class="block text-sm font-medium dark:text-gray-300">Município:</label>
                                <input type="text" id="aval-urb-municipio" list="aval-urb-municipio-datalist" class="form-input-text mt-1" disabled placeholder="Selecione uma SRF acima...">
                                <datalist id="aval-urb-municipio-datalist"></datalist>
                            </div>
                             <div class="lg:col-span-2">
                                <label for="aval-urb-inscricao" class="block text-sm font-medium dark:text-gray-300">Inscrição Imobiliária:</label>
                                <input type="text" id="aval-urb-inscricao" class="form-input-text mt-1">
                            </div>
                            
                            <div class="lg:col-span-4 grid grid-cols-1 md:grid-cols-6 gap-4">
                                <div class="md:col-span-3">
                                    <label for="aval-urb-logradouro" class="block text-sm font-medium dark:text-gray-300">Logradouro:</label>
                                    <input type="text" id="aval-urb-logradouro" class="form-input-text mt-1" placeholder="Ex: Av. Afonso Pena">
                                </div>
                                <div class="md:col-span-1">
                                    <label for="aval-urb-numero" class="block text-sm font-medium dark:text-gray-300">Número:</label>
                                    <input type="text" id="aval-urb-numero" class="form-input-text mt-1" placeholder="Ex: 123">
                                </div>
                                <div class="md:col-span-2">
                                    <label for="aval-urb-bairro" class="block text-sm font-medium dark:text-gray-300">Bairro:</label>
                                    <input type="text" id="aval-urb-bairro" class="form-input-text mt-1" placeholder="Ex: Centro">
                                </div>
                                 <div class="md:col-span-3">
                                    <label for="aval-urb-complemento" class="block text-sm font-medium dark:text-gray-300">Complemento:</label>
                                    <input type="text" id="aval-urb-complemento" class="form-input-text mt-1" placeholder="Ex: Apto 101, Bloco B">
                                </div>
                                <div class="md:col-span-3 flex items-end">
                                    <button type="button" id="btn-google-maps" class="btn-secondary w-full md:w-auto" title="Abrir no Google Maps">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="inline-block mr-2" viewBox="0 0 16 16"><path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/></svg>
                                        Ver no Mapa
                                    </button>
                                </div>
                            </div>
                            
                            <div class="lg:col-span-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                                <div>
                                    <label for="aval-urb-valor-iptu" class="block text-sm font-medium dark:text-gray-300">Valor Venal IPTU:</label>
                                    <input type="text" id="aval-urb-valor-iptu" class="form-input-text mt-1 currency-input">
                                </div>
                                 <div>
                                    <label for="aval-urb-ano-iptu" class="block text-sm font-medium dark:text-gray-300">Ano IPTU:</label>
                                    <input type="number" id="aval-urb-ano-iptu" class="form-input-text mt-1" placeholder="AAAA">
                                </div>
                                 <div class="md:col-span-2">
                                    <label for="aval-urb-valor-iptu-ufemg" class="block text-sm font-medium dark:text-gray-300">Valor Venal IPTU (UFEMG):</label>
                                    <input type="text" id="aval-urb-valor-iptu-ufemg" class="form-input-text mt-1 bg-gray-100 dark:bg-slate-700" readonly>
                                </div>
                            </div>
                             <div class="lg:col-span-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                                <div>
                                    <label for="aval-urb-valor-declarado" class="block text-sm font-medium dark:text-gray-300">Valor Declarado:</label>
                                    <input type="text" id="aval-urb-valor-declarado" class="form-input-text mt-1 currency-input">
                                </div>
                                <div>
                                    <label for="aval-urb-ano-declarado" class="block text-sm font-medium dark:text-gray-300">Ano Declarado:</label>
                                    <input type="number" id="aval-urb-ano-declarado" class="form-input-text mt-1" placeholder="AAAA">
                                </div>
                                <div class="md:col-span-2">
                                    <label for="aval-urb-valor-declarado-ufemg" class="block text-sm font-medium dark:text-gray-300">Valor Declarado (UFEMG):</label>
                                    <input type="text" id="aval-urb-valor-declarado-ufemg" class="form-input-text mt-1 bg-gray-100 dark:bg-slate-700" readonly>
                                </div>
                            </div>
                            <div class="lg:col-span-4"><hr class="my-2 dark:border-slate-600"></div>
                            <div>
                                <label for="aval-urb-area-terreno" class="block text-sm font-medium dark:text-gray-300">Área do Terreno (m²):</label>
                                <input type="text" id="aval-urb-area-terreno" class="form-input-text mt-1">
                            </div>
                            <div>
                               <label class="block text-sm font-medium invisible md:visible">Opções</label>
                               <label class="inline-flex items-center mt-2 dark:text-gray-300">
                                   <input type="checkbox" id="aval-urb-esquina" class="form-checkbox rounded text-blue-600">
                                   <span class="ml-2 text-sm">Terreno de Esquina?</span>
                               </label>
                            </div>
                             <div class="lg:col-span-2">
                                <label for="aval-urb-tipo-terreno" class="block text-sm font-medium dark:text-gray-300">Tipo de Terreno:</label>
                                <select id="aval-urb-tipo-terreno" class="form-input-text mt-1">${tipoTerrenoOptionsHtml}</select>
                            </div>
                            <div class="lg:col-span-4"><hr class="my-2 dark:border-slate-600"></div>
                            <div>
                                <label for="aval-urb-area-construida" class="block text-sm font-medium dark:text-gray-300">Área Construída (m²):</label>
                                <input type="text" id="aval-urb-area-construida" class="form-input-text mt-1">
                            </div>
                            <div>
                                <label for="aval-urb-area-edicula" class="block text-sm font-medium dark:text-gray-300">Área Edícula (m²):</label>
                                <input type="text" id="aval-urb-area-edicula" class="form-input-text mt-1">
                            </div>
                             <div>
                                <label for="aval-urb-area-total-unidade" class="block text-sm font-medium dark:text-gray-300">Área Total Construída da Unidade:</label>
                                <input type="text" id="aval-urb-area-total-unidade" class="form-input-text mt-1 bg-gray-100 dark:bg-slate-700" readonly>
                            </div>
                             <div>
                                <label for="aval-urb-area-total-geral" class="block text-sm font-medium dark:text-gray-300">Área Total Construída:</label>
                                <input type="text" id="aval-urb-area-total-geral" class="form-input-text mt-1">
                            </div>
                            <div>
                                <label for="aval-urb-fracao-ideal" class="block text-sm font-medium dark:text-gray-300">Fração Ideal:</label>
                                <input type="text" id="aval-urb-fracao-ideal" class="form-input-text mt-1" placeholder="Calculada...">
                            </div>
                            <div>
                                <label for="aval-urb-depreciacao" class="block text-sm font-medium dark:text-gray-300">Depreciação (Idade):</label>
                                <select id="aval-urb-depreciacao" class="form-input-text mt-1">${depreciacaoOptionsHtml}</select>
                            </div>
                             <div>
                                <label for="aval-urb-conservacao" class="block text-sm font-medium dark:text-gray-300">Conservação:</label>
                                <select id="aval-urb-conservacao" class="form-input-text mt-1">${conservacaoOptionsHtml}</select>
                            </div>
                             <div>
                                <label for="aval-urb-is-apartamento" class="block text-sm font-medium dark:text-gray-300">É Apartamento?</label>
                                <select id="aval-urb-is-apartamento" class="form-input-text mt-1">
                                    <option value="nao" selected>Não</option>
                                    <option value="sim">Sim</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="section-box p-4 border dark:border-slate-700 rounded-lg mb-6">
                        <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100">Avaliação</h3>
                        <div class="form-grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                            <div>
                                <label for="aval-urb-localizacao" class="block text-sm font-medium dark:text-gray-300">Localização:</label>
                                <select id="aval-urb-localizacao" class="form-input-text mt-1">${localizacaoOptionsHtml}</select>
                            </div>
                            <div>
                                <label for="aval-urb-valor-m2-terreno" class="block text-sm font-medium dark:text-gray-300">Valor Terreno (m²):</label>
                                <input type="text" id="aval-urb-valor-m2-terreno" class="form-input-text mt-1 currency-input">
                            </div>
                            <div class="lg:col-span-2">
                                <label for="aval-urb-valor-total-terreno" class="block text-sm font-medium dark:text-gray-300">Avaliação Fração Terreno (R$):</label>
                                <input type="text" id="aval-urb-valor-total-terreno" class="form-input-text mt-1 bg-gray-100 dark:bg-slate-700 font-semibold" readonly>
                            </div>
                             <div class="lg:col-span-4"><hr class="my-2 dark:border-slate-600"></div>
                             <div class="lg:col-span-4 grid grid-cols-1 lg:grid-cols-4 gap-4">
                                <div>
                                    <label for="aval-urb-utilizacao" class="block text-sm font-medium dark:text-gray-300">Utilização:</label>
                                    <select id="aval-urb-utilizacao" class="form-input-text mt-1">
                                        <option value="">Selecione...</option>
                                        <option value="Residencial">Residencial</option>
                                        <option value="Comercial">Comercial</option>
                                        <option value="Galpão">Galpão</option>
                                    </select>
                                </div>
                                <div>
                                    <label for="aval-urb-padrao" class="block text-sm font-medium dark:text-gray-300">Padrão Construtivo:</label>
                                    <select id="aval-urb-padrao" class="form-input-text mt-1" disabled><option value="">Selecione a utilização...</option></select>
                                </div>
                                <div>
                                    <label for="aval-urb-classificacao" class="block text-sm font-medium dark:text-gray-300">Classificação:</label>
                                    <select id="aval-urb-classificacao" class="form-input-text mt-1" disabled><option value="">Selecione o padrão...</option></select>
                                </div>
                                <div>
                                    <label for="aval-urb-valor-m2-construido" class="block text-sm font-medium dark:text-gray-300">Valor M² Construído:</label>
                                    <input type="text" id="aval-urb-valor-m2-construido" class="form-input-text mt-1 currency-input">
                                </div>
                            </div>
                            <div class="lg:col-span-4 grid grid-cols-1 lg:grid-cols-3 gap-4 mt-2">
                                <div>
                                    <label for="aval-urb-valor-m2-edicula" class="block text-sm font-medium dark:text-gray-300">Valor M² Edícula:</label>
                                    <input type="text" id="aval-urb-valor-m2-edicula" class="form-input-text mt-1 bg-gray-100 dark:bg-slate-700" readonly>
                                </div>
                                <div>
                                    <label for="aval-urb-valor-total-construido" class="block text-sm font-medium dark:text-gray-300">Valor Construído (R$):</label>
                                    <input type="text" id="aval-urb-valor-total-construido" class="form-input-text mt-1 bg-gray-100 dark:bg-slate-700" readonly>
                                </div>
                                <div>
                                    <label for="aval-urb-valor-total-edicula" class="block text-sm font-medium dark:text-gray-300">Valor Edícula (R$):</label>
                                    <input type="text" id="aval-urb-valor-total-edicula" class="form-input-text mt-1 bg-gray-100 dark:bg-slate-700" readonly>
                                </div>
                            </div>
                             <div class="lg:col-span-4">
                                <label for="aval-urb-valor-total-construcao" class="block text-md font-medium mt-2 dark:text-gray-200">Valor Total da Construção (R$):</label>
                                <input type="text" id="aval-urb-valor-total-construcao" class="form-input-text mt-1 bg-gray-100 dark:bg-slate-700 font-semibold" readonly>
                            </div>

                            <div class="lg:col-span-4"><hr class="my-4 dark:border-slate-600"></div>
                             <div class="lg:col-span-4">
                                <label for="aval-urb-valor-total-avaliacao" class="block text-lg font-medium dark:text-gray-200">VALOR DA AVALIAÇÃO (R$):</label>
                                <input type="text" id="aval-urb-valor-total-avaliacao" class="form-input-text mt-1 bg-blue-100 dark:bg-blue-900/50 text-xl font-bold" readonly>
                            </div>
                            <div class="lg:col-span-4"><hr class="my-4 dark:border-slate-600"></div>
                            
                            <div class="lg:col-span-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                <div>
                                    <label for="aval-urb-valor-avaliacao-ufemg" class="block text-sm font-medium dark:text-gray-300">Valor Avaliação (UFEMG):</label>
                                    <input type="text" id="aval-urb-valor-avaliacao-ufemg" class="form-input-text mt-1 bg-gray-100 dark:bg-slate-700" readonly>
                                </div>
                                <div>
                                    <label for="aval-urb-valor-declarado-ufemg-final" class="block text-sm font-medium dark:text-gray-300">Valor Declarado (UFEMG):</label>
                                    <input type="text" id="aval-urb-valor-declarado-ufemg-final" class="form-input-text mt-1 bg-gray-100 dark:bg-slate-700" readonly>
                                </div>
                                 <div>
                                    <label for="aval-urb-valor-iptu-ufemg-final" class="block text-sm font-medium dark:text-gray-300">Valor IPTU (UFEMG):</label>
                                    <input type="text" id="aval-urb-valor-iptu-ufemg-final" class="form-input-text mt-1 bg-gray-100 dark:bg-slate-700" readonly>
                                </div>
                                <div>
                                    <label for="aval-urb-maior-valor-ufemg" class="block text-sm font-medium dark:text-gray-300">Maior Valor (UFEMG):</label>
                                    <input type="text" id="aval-urb-maior-valor-ufemg" class="form-input-text mt-1 bg-gray-100 dark:bg-slate-700 font-semibold" readonly>
                                </div>
                                <div>
                                    <label for="aval-urb-fonte-maior-valor" class="block text-sm font-medium dark:text-gray-300">Fonte do Maior Valor:</label>
                                    <input type="text" id="aval-urb-fonte-maior-valor" class="form-input-text mt-1 bg-gray-100 dark:bg-slate-700 font-semibold" readonly>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="section-box p-4 border dark:border-slate-700 rounded-lg mb-6">
                        <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100">Anexos</h3>
                        <div id="existing-attachments-container" class="space-y-2 mb-3"></div>
                        <div class="mb-2">
                            <label for="avaliacao-anexos-input" class="sr-only">Adicionar novos anexos</label>
                            <input type="file" id="avaliacao-anexos-input" class="form-input-file" multiple>
                        </div>
                        <div id="avaliacao-anexos-container" class="space-y-2">
                            <p class="text-xs text-gray-500 dark:text-gray-400">Nenhum anexo novo adicionado.</p>
                        </div>
                    </div>
                    
                    <div class="section-box p-4 border dark:border-slate-700 rounded-lg mb-6">
                        <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100">Vincular a Outras Entidades</h3>
                        ${vinculosHtml}
                    </div>

                    <div class="section-box p-4 border dark:border-slate-700 rounded-lg mb-6">
                        <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100">Observação do Avaliador</h3>
                        <textarea id="aval-urb-observacao" rows="3" class="form-input-text mt-1">Avaliação realizada em conformidade com a pauta de valores da SRF/Goval, sem visita in loco e considerando o preço médio, em virtude da localização, área do terreno e construído, de acordo com as características do imóvel, verificado através de ferramentas como google maps.</textarea>
                    </div>

                    <div class="form-actions mt-6 flex justify-end items-center gap-3">
                        <button type="button" id="btn-salvar-avaliacao" class="btn-secondary">${isEditing ? 'Salvar Alterações' : 'Salvar Avaliação'}</button>
                        <button type="button" id="btn-nova-avaliacao-vinculada" class="btn-secondary">Nova Avaliação Vinculada</button>
                        <button type="button" id="btn-salvar-e-gerar-parecer" class="btn-primary">${isEditing ? 'Salvar e Gerar Parecer' : 'Salvar e Gerar Parecer'}</button>
                    </div>
                </form>
            </div>
            `;
            
            mainContentWrapperRef.innerHTML = pageHtml;
            
            addEventListenersAvaliacaoUrbana(isEditing ? data : null);
            
            if (data) {
                await populateFormForEditing(data);
            } else {
                document.getElementById('aval-urb-data').value = new Date().toISOString().substring(0, 10);
                document.getElementById('aval-urb-srf').dispatchEvent(new Event('change'));
            }

            if (isDuplicating) {
                uiModuleRef.showToastNotification("Formulário preenchido com dados da avaliação original. Salve para criar uma nova.", "info", 5000);
            }

            await calcularAvaliacaoUrbana();

        } catch (e) {
            console.error("Erro ao renderizar formulário:", e);
            mainContentWrapperRef.innerHTML = `<p class="feedback-message error">Erro fatal ao renderizar formulário: ${e.message}</p>`;
        }
    }
    
    async function updateValorM2Terreno() {
        const srfId = document.getElementById('aval-urb-srf').value;
        const nomeCidade = document.getElementById('aval-urb-municipio').value;
        const nomeLocalizacao = document.getElementById('aval-urb-localizacao').value;
        const valorM2Input = document.getElementById('aval-urb-valor-m2-terreno');

        if (!srfId || !nomeCidade || !nomeLocalizacao) {
            valorM2Input.value = '';
            await calcularAvaliacaoUrbana();
            return;
        }

        try {
            // CORREÇÃO: Utiliza a constante do dbRef para acessar a store correta.
            const configSrf = await dbRef.getItemById(dbRef.STORES.ITCD_CONFIGURACOES, 'srfCidades');
            const srf = configSrf?.value?.find(s => s.id === srfId);
            const cidade = srf?.cidades?.find(c => c.nome === nomeCidade);
            
            const valorReferencia = cidade?.valoresUrbanos?.[nomeLocalizacao];
            
            if (typeof valorReferencia === 'number') {
                valorM2Input.value = formatToBRL(valorReferencia);
            } else {
                valorM2Input.value = '';
            }
        } catch (error) {
            console.error("Erro ao buscar valor de referência do terreno:", error);
            valorM2Input.value = '';
        }
        
        await calcularAvaliacaoUrbana();
    }
    
    function addEventListenersAvaliacaoUrbana(originalData = null) {
        const isEditing = originalData && originalData.id;
    
        const handleSaveAndNavigate = async () => {
            const savedData = await handleSalvarAvaliacaoCore(isEditing ? originalData : null);
            if (savedData) {
                appModuleRef.handleMenuAction('itcd-visualizar-avaliacao', { avaliacaoId: savedData.id, originatingView: 'itcd-gerir-avaliacoes' });
            }
        };
    
        const handleSaveAndNew = async () => {
            const savedData = await handleSalvarAvaliacaoCore(isEditing ? originalData : null);
            if (savedData) {
                appModuleRef.handleMenuAction('itcd-avaliar-imovel-urbano');
            }
        };
    
        const handleSaveAndGenerateReport = async () => {
            const savedData = await handleSalvarAvaliacaoCore(isEditing ? originalData : null);
            if (savedData) {
                const viewModule = window.SEFWorkStation.ITCD.View;
                if (viewModule && typeof viewModule.gerarHtmlDoParecerUrbano === 'function') {
                    uiModuleRef.showLoading(true, "Gerando parecer...");
                    try {
                        const parecerHtml = await viewModule.gerarHtmlDoParecerUrbano(savedData);
                        const printWindow = window.open('', '_blank');
                        printWindow.document.write(parecerHtml);
                        printWindow.document.close();
                        setTimeout(() => {
                             try { printWindow.print(); } 
                             catch (e) { console.error("Erro ao tentar imprimir:", e); uiModuleRef.showToastNotification("Erro ao iniciar a impressão. Verifique pop-ups.", "error");}
                        }, 500);
                    } catch (e) {
                        uiModuleRef.showToastNotification(`Erro ao gerar parecer: ${e.message}`, "error");
                    } finally {
                        uiModuleRef.showLoading(false);
                    }
                }
                appModuleRef.handleMenuAction('itcd-visualizar-avaliacao', { avaliacaoId: savedData.id, originatingView: 'itcd-gerir-avaliacoes' });
            }
        };
    
        document.getElementById('btn-salvar-avaliacao')?.addEventListener('click', handleSaveAndNavigate);
        document.getElementById('btn-nova-avaliacao-vinculada')?.addEventListener('click', () => handleNovaAvaliacaoVinculada(originalData));
        document.getElementById('btn-salvar-e-gerar-parecer')?.addEventListener('click', handleSaveAndGenerateReport);
    
        document.getElementById('aval-urb-fracao-ideal').addEventListener('input', () => {
            isFraçãoIdealManuallySet = true;
            calcularAvaliacaoUrbana(); 
        });
        
        const fieldsForValorM2Update = ['aval-urb-srf', 'aval-urb-municipio', 'aval-urb-localizacao'];
        fieldsForValorM2Update.forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                const eventType = el.tagName === 'SELECT' ? 'change' : 'input';
                el.addEventListener(eventType, updateValorM2Terreno);
            }
        });
        
        const fieldsToListen = [
            'aval-urb-area-terreno',
            'aval-urb-area-construida', 'aval-urb-area-edicula', 'aval-urb-area-total-geral',
            'aval-urb-valor-iptu', 'aval-urb-valor-declarado',
            'aval-urb-ano-iptu', 'aval-urb-ano-declarado', 'aval-urb-data', 'aval-urb-esquina',
            'aval-urb-tipo-terreno', 'aval-urb-depreciacao', 'aval-urb-conservacao', 'aval-urb-valor-m2-terreno', 'aval-urb-valor-m2-construido',
            'aval-urb-is-apartamento', 'aval-urb-padrao'
        ];
        
        fieldsToListen.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const listener = async () => {
                    if (['aval-urb-area-construida', 'aval-urb-area-edicula', 'aval-urb-area-total-geral'].includes(id)) {
                        isFraçãoIdealManuallySet = false;
                    }
                    await calcularAvaliacaoUrbana();
                };
                el.addEventListener('input', listener);
                if (el.tagName === 'SELECT') {
                    el.addEventListener('change', listener);
                }
            }
        });
        
        document.querySelectorAll('.currency-input').forEach(input => {
            input.addEventListener('blur', async (e) => {
                const value = parseFromBRL(e.target.value);
                e.target.value = formatToBRL(value);
                await calcularAvaliacaoUrbana();
            });
            input.addEventListener('focus', (e) => {
                 const value = parseFromBRL(e.target.value);
                 if (value !== 0) {
                     e.target.value = value.toFixed(2).replace('.', ',');
                 } else {
                     e.target.value = '';
                 }
            });
        });
        
        const metodologiaSelect = document.getElementById('aval-urb-metodologia-select');
        if (metodologiaSelect) {
            metodologiaSelect.addEventListener('change', async (event) => {
                const docId = event.target.value;
                const metodologiaTextarea = document.getElementById('aval-urb-metodologia');
                if (!metodologiaTextarea) return;

                if (!docId) {
                    metodologiaTextarea.value = '';
                    return;
                }

                try {
                    const doc = await dbRef.getItemById(dbRef.STORES.DOCUMENTS, docId);
                    if (doc) {
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = doc.content || '';
                        metodologiaTextarea.value = (tempDiv.textContent || tempDiv.innerText || '').trim();
                    }
                } catch (error) {
                    console.error("Erro ao carregar conteúdo do modelo de metodologia:", error);
                    metodologiaTextarea.value = 'Erro ao carregar o conteúdo do modelo selecionado.';
                }
            });
        }
        
        const btnAjudaMetodologia = document.getElementById('btn-ajuda-metodologia');
        if(btnAjudaMetodologia){
            btnAjudaMetodologia.addEventListener('click', () => {
                const mensagem = "Para listar opções, cadastre documentos com o TIPO 'ITCD' e a CATEGORIA 'Avaliação' ou 'ITCD/Avaliação'.";
                if(uiModuleRef && uiModuleRef.showToastNotification) {
                    uiModuleRef.showToastNotification(mensagem, "info", 8000);
                } else {
                    alert(mensagem);
                }
            });
        }

        const srfSelect = document.getElementById('aval-urb-srf');
        const ufSelect = document.getElementById('aval-urb-uf');
        const municipioInput = document.getElementById('aval-urb-municipio');
        const municipioDatalist = document.getElementById('aval-urb-municipio-datalist');

        if (srfSelect && ufSelect && municipioInput && municipioDatalist) {
            srfSelect.addEventListener('change', () => {
                const srfId = srfSelect.value;
                
                ufSelect.innerHTML = '<option value="">Selecione uma Unidade Fazendária...</option>';
                municipioDatalist.innerHTML = '';
                municipioInput.value = '';
                
                if (srfId) {
                    const srfSelecionada = srfCache.find(s => s.id === srfId);
                    
                    if (ufCache) {
                        const ufsFiltradas = ufCache.filter(uf => uf.srfId === srfId);
                        if(ufsFiltradas.length > 0) {
                            ufsFiltradas.forEach(uf => {
                                ufSelect.innerHTML += `<option value="${uf.id}">${uf.nome} (${uf.tipo})</option>`;
                            });
                            ufSelect.disabled = false;
                        } else {
                            ufSelect.innerHTML = '<option value="">Nenhuma UF cadastrada</option>';
                            ufSelect.disabled = true;
                        }
                    } else {
                         ufSelect.disabled = true;
                    }

                    if (srfSelecionada && srfSelecionada.cidades && srfSelecionada.cidades.length > 0) {
                        srfSelecionada.cidades.forEach(cidade => {
                            municipioDatalist.innerHTML += `<option value="${cidade.nome}"></option>`;
                        });
                        municipioInput.disabled = false;
                        municipioInput.placeholder = 'Digite ou selecione um município';
                    } else {
                         municipioInput.disabled = true;
                         municipioInput.placeholder = 'Nenhuma cidade para esta SRF';
                    }

                    const userPrefs = SEFWorkStation.Configuracoes.carregarUserPreferences();
                    if (userPrefs.lastUsedUfId && !originalData) {
                        const optionExists = Array.from(ufSelect.options).some(opt => opt.value === userPrefs.lastUsedUfId);
                        if (optionExists) {
                            ufSelect.value = userPrefs.lastUsedUfId;
                        }
                    }
                } else {
                     ufSelect.disabled = true;
                     municipioInput.disabled = true;
                     ufSelect.innerHTML = '<option value="">Selecione uma SRF primeiro...</option>';
                     municipioInput.placeholder = 'Selecione uma SRF acima...';
                }
            });
        }
        
        const utilizacaoSelect = document.getElementById('aval-urb-utilizacao');
        const padraoSelect = document.getElementById('aval-urb-padrao');
        const classifSelect = document.getElementById('aval-urb-classificacao');

        utilizacaoSelect?.addEventListener('change', () => {
            const utilizacao = utilizacaoSelect.value;
            padraoSelect.innerHTML = '<option value="">Selecione o padrão...</option>';
            classifSelect.innerHTML = '<option value="">Selecione o padrão...</option>';
            padraoSelect.disabled = true;
            classifSelect.disabled = true;
            document.getElementById('aval-urb-valor-m2-construido').value = '';

            if (utilizacao && CLASSIFICACAO_CONSTRUTIVA_MAP[utilizacao]) {
                const padroes = Object.keys(CLASSIFICACAO_CONSTRUTIVA_MAP[utilizacao]);
                padroes.forEach(padrao => {
                    padraoSelect.innerHTML += `<option value="${padrao}">${padrao}</option>`;
                });
                padraoSelect.disabled = false;
            }
        });

        padraoSelect?.addEventListener('change', () => {
            const utilizacao = utilizacaoSelect.value;
            const padrao = padraoSelect.value;
            classifSelect.innerHTML = '<option value="">Selecione a classificação...</option>';
            classifSelect.disabled = true;
            document.getElementById('aval-urb-valor-m2-construido').value = '';

            if (utilizacao && padrao && CLASSIFICACAO_CONSTRUTIVA_MAP[utilizacao]?.[padrao]) {
                const classificacoes = CLASSIFICACAO_CONSTRUTIVA_MAP[utilizacao][padrao];
                classificacoes.forEach(classif => {
                    classifSelect.innerHTML += `<option value="${classif}">${classif}</option>`;
                });
                classifSelect.disabled = false;
            }
        });

        classifSelect?.addEventListener('change', async () => {
            const utilizacao = utilizacaoSelect.value;
            const padrao = padraoSelect.value;
            const classificacao = classifSelect.value;

            if (utilizacao && padrao && classificacao) {
                const cubKey = getCubKey(utilizacao, padrao, classificacao);
                if (cubKey) {
                    try {
                        const config = await dbRef.getItemById('itcdConfiguracoesStore', 'valoresCUB');
                        
                        if (config && config.value) {
                            const valorCub = config.value[cubKey];
                            const valorM2Input = document.getElementById('aval-urb-valor-m2-construido');
                            if (valorCub) {
                                valorM2Input.value = formatToBRL(valorCub);
                            } else {
                                valorM2Input.value = '';
                                uiModuleRef.showToastNotification(`Valor CUB para '${classificacao}' não encontrado.`, 'warning');
                            }
                            await calcularAvaliacaoUrbana();
                        } else {
                            uiModuleRef.showToastNotification(`Nenhum valor CUB cadastrado nas configurações.`, 'warning');
                        }
                    } catch (error) {
                        console.error("Erro ao buscar valor CUB:", error);
                        uiModuleRef.showToastNotification("Erro ao buscar valor CUB do banco de dados.", 'error');
                    }
                }
            }
        });

        document.getElementById('btn-google-maps')?.addEventListener('click', () => {
            const logradouro = document.getElementById('aval-urb-logradouro')?.value;
            const numero = document.getElementById('aval-urb-numero')?.value;
            const bairro = document.getElementById('aval-urb-bairro')?.value;
            const complemento = document.getElementById('aval-urb-complemento')?.value;
            const municipio = document.getElementById('aval-urb-municipio')?.value;
            
            if(logradouro && municipio){
                const query = encodeURIComponent(`${logradouro}, ${numero}, ${complemento}, ${bairro}, ${municipio}`);
                window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
            } else {
                uiModuleRef.showToastNotification('Preencha pelo menos o logradouro e o município para buscar no mapa.', 'info');
            }
        });
        
        document.getElementById('avaliacao-anexos-input')?.addEventListener('change', handleAttachmentSelection);
        document.getElementById('avaliacao-anexos-container')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-remove-attachment')) {
                const tempId = e.target.dataset.tempId;
                temporaryAttachments = temporaryAttachments.filter(att => att.tempId !== tempId);
                renderAttachmentChips();
            }
        });

        document.querySelectorAll('.btn-gerenciar-vinculos').forEach(button => {
            button.addEventListener('click', (e) => {
                const entityStoreName = e.currentTarget.dataset.entityStore;
                abrirModalSelecaoVinculos(entityStoreName);
            });
        });

        mainContentWrapperRef.addEventListener('click', e => {
            if(e.target.matches('.btn-remove-vinculo')) {
                handleRemoverVinculo(e);
            }
            if (e.target.matches('.btn-remove-existing-attachment')) {
                const anexoId = e.target.dataset.id;
                existingAttachments = existingAttachments.filter(a => a.id !== anexoId);
                renderExistingAttachments();
                uiModuleRef.showToastNotification("Anexo marcado para remoção. Salve para confirmar.", "info");
            }
        });
    }

    async function handleSalvarAvaliacaoCore(originalData = null) {
        const isEditing = originalData && originalData.id;
        const currentUser = await sharedUtilsRef.getCurrentUser();

        const responsavelMasp = document.getElementById('aval-urb-masp')?.value || currentUser?.matricula;
        const responsavelNome = document.getElementById('aval-urb-responsavel')?.value || currentUser?.nome;

        const dadosFormulario = {
            srfId: document.getElementById('aval-urb-srf').value,
            ufId: document.getElementById('aval-urb-uf').value,
            metodologiaTexto: document.getElementById('aval-urb-metodologia').value,
            municipio: document.getElementById('aval-urb-municipio').value,
            inscricao: document.getElementById('aval-urb-inscricao').value,
            logradouro: document.getElementById('aval-urb-logradouro').value,
            numero: document.getElementById('aval-urb-numero').value,
            bairro: document.getElementById('aval-urb-bairro').value,
            complemento: document.getElementById('aval-urb-complemento').value,
            valorIptu: parseFromBRL(document.getElementById('aval-urb-valor-iptu').value),
            anoIptu: getFloatVal('aval-urb-ano-iptu'),
            valorDeclarado: parseFromBRL(document.getElementById('aval-urb-valor-declarado').value),
            anoDeclarado: getFloatVal('aval-urb-ano-declarado'),
            areaTerreno: getFloatVal('aval-urb-area-terreno'),
            esquina: document.getElementById('aval-urb-esquina').checked,
            tipoTerreno: document.getElementById('aval-urb-tipo-terreno').value,
            areaConstruida: getFloatVal('aval-urb-area-construida'),
            areaEdicula: getFloatVal('aval-urb-area-edicula'),
            areaTotalGeral: getFloatVal('aval-urb-area-total-geral'),
            fracaoIdealManual: isFraçãoIdealManuallySet ? getFloatVal('aval-urb-fracao-ideal') : null,
            depreciacao: document.getElementById('aval-urb-depreciacao').value,
            conservacao: document.getElementById('aval-urb-conservacao').value,
            isApartamento: document.getElementById('aval-urb-is-apartamento').value === 'sim',
            utilizacao: document.getElementById('aval-urb-utilizacao').value,
            padrao: document.getElementById('aval-urb-padrao').value,
            classificacao: document.getElementById('aval-urb-classificacao').value,
            valorM2Terreno: parseFromBRL(document.getElementById('aval-urb-valor-m2-terreno').value),
            valorM2Construido: parseFromBRL(document.getElementById('aval-urb-valor-m2-construido').value),
            localizacao: document.getElementById('aval-urb-localizacao').value,
            observacao: document.getElementById('aval-urb-observacao').value
        };
        dadosFormulario.endereco = `${dadosFormulario.logradouro}, ${dadosFormulario.numero} ${dadosFormulario.complemento} - ${dadosFormulario.bairro}`;
        
        const dadosCalculados = await calcularAvaliacaoUrbana(true);
        if (!dadosCalculados) return null;

        const avaliacaoId = isEditing ? originalData.id : appModuleRef.generateUUID();

        const avaliacaoData = {
            id: avaliacaoId,
            creationDate: isEditing ? originalData.creationDate : new Date().toISOString(),
            modificationDate: new Date().toISOString(),
            tipo: 'imovel-urbano',
            responsavelMasp: responsavelMasp,
            responsavelNome: responsavelNome,
            declaracao: document.getElementById('aval-urb-declaracao').value.trim(),
            dataAvaliacao: document.getElementById('aval-urb-data').value,
            dadosFormulario: dadosFormulario,
            dadosCalculados: dadosCalculados,
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
                        id: appModuleRef.generateUUID(),
                        fileName: anexo.file.name,
                        fileSize: anexo.file.size,
                        fileType: anexo.file.type,
                        uploadDate: new Date().toISOString(),
                        filePath: `attachments_sef/itcd/avaliacoes/${avaliacaoData.id}/${anexo.file.name}`
                    });
                }
            }

            await dbRef.updateItem(dbRef.STORES.ITCD_AVALIACOES, avaliacaoData);
            uiModuleRef.showToastNotification(`Avaliação urbana ${isEditing ? 'atualizada' : 'salva'} com sucesso!`, "success");
            
            const userPrefs = SEFWorkStation.Configuracoes.carregarUserPreferences();
            userPrefs.lastUsedSrfId = dadosFormulario.srfId;
            userPrefs.lastUsedUfId = dadosFormulario.ufId;
            SEFWorkStation.Configuracoes.salvarUserPreferences(userPrefs);

            return avaliacaoData;

        } catch (error) {
            console.error("Erro ao salvar avaliação:", error);
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

        document.getElementById('aval-urb-srf').value = form.srfId || '';
        document.getElementById('aval-urb-srf').dispatchEvent(new Event('change'));

        setTimeout(async () => {
            document.getElementById('aval-urb-uf').value = form.ufId || '';
            document.getElementById('aval-urb-data').value = data.dataAvaliacao || '';
            document.getElementById('aval-urb-declaracao').value = data.declaracao || '';
            document.getElementById('aval-urb-metodologia-select').value = form.metodologiaSelectId || '';
            document.getElementById('aval-urb-metodologia').value = form.metodologiaTexto || '';
            document.getElementById('aval-urb-municipio').value = form.municipio || '';
            document.getElementById('aval-urb-inscricao').value = form.inscricao || '';
            document.getElementById('aval-urb-logradouro').value = form.logradouro || '';
            document.getElementById('aval-urb-numero').value = form.numero || '';
            document.getElementById('aval-urb-bairro').value = form.bairro || '';
            document.getElementById('aval-urb-complemento').value = form.complemento || '';
            document.getElementById('aval-urb-valor-iptu').value = formatToBRL(form.valorIptu);
            document.getElementById('aval-urb-ano-iptu').value = form.anoIptu || '';
            document.getElementById('aval-urb-valor-declarado').value = formatToBRL(form.valorDeclarado);
            document.getElementById('aval-urb-ano-declarado').value = form.anoDeclarado || '';
            document.getElementById('aval-urb-area-terreno').value = form.areaTerreno?.toString().replace('.', ',') || '';
            document.getElementById('aval-urb-esquina').checked = form.esquina || false;
            document.getElementById('aval-urb-tipo-terreno').value = form.tipoTerreno || '';
            document.getElementById('aval-urb-area-construida').value = form.areaConstruida?.toString().replace('.', ',') || '';
            document.getElementById('aval-urb-area-edicula').value = form.areaEdicula?.toString().replace('.', ',') || '';
            document.getElementById('aval-urb-area-total-geral').value = form.areaTotalGeral?.toString().replace('.', ',') || '';
            document.getElementById('aval-urb-fracao-ideal').value = form.fracaoIdealManual ? form.fracaoIdealManual.toString().replace('.', ',') : (calc.fracaoIdeal ? calc.fracaoIdeal.toFixed(6).replace('.', ',') : '');
            if (form.fracaoIdealManual) isFraçãoIdealManuallySet = true;
            document.getElementById('aval-urb-depreciacao').value = form.depreciacao || '';
            document.getElementById('aval-urb-conservacao').value = form.conservacao || '';
            document.getElementById('aval-urb-is-apartamento').value = form.isApartamento ? 'sim' : 'nao';
            document.getElementById('aval-urb-localizacao').value = form.localizacao || '';
            document.getElementById('aval-urb-utilizacao').value = form.utilizacao || '';
            document.getElementById('aval-urb-utilizacao').dispatchEvent(new Event('change'));
            setTimeout(() => {
                document.getElementById('aval-urb-padrao').value = form.padrao || '';
                document.getElementById('aval-urb-padrao').dispatchEvent(new Event('change'));
                setTimeout(() => {
                    document.getElementById('aval-urb-classificacao').value = form.classificacao || '';
                    document.getElementById('aval-urb-valor-m2-terreno').value = formatToBRL(form.valorM2Terreno);
                    document.getElementById('aval-urb-valor-m2-construido').value = formatToBRL(form.valorM2Construido);
                    document.getElementById('aval-urb-observacao').value = form.observacao || '';
                    
                    // Exibir resultados salvos
                    document.getElementById('aval-urb-valor-total-terreno').value = formatToBRL(calc.avaliacaoTerreno * calc.fracaoIdeal);
                    document.getElementById('aval-urb-valor-m2-edicula').value = formatToBRL(parseFromBRL(document.getElementById('aval-urb-valor-m2-construido').value) * (urbanoConfigCache.geral.edicula / 100));
                    document.getElementById('aval-urb-valor-total-construido').value = formatToBRL(calc.valorConstruidoDepreciado);
                    document.getElementById('aval-urb-valor-total-edicula').value = formatToBRL(calc.valorEdiculaDepreciado);
                    document.getElementById('aval-urb-valor-total-construcao').value = formatToBRL(calc.valorTotalConstrucao);
                    document.getElementById('aval-urb-area-total-unidade').value = ((form.areaConstruida || 0) + (form.areaEdicula || 0)).toFixed(2).replace('.', ',');
                    document.getElementById('aval-urb-valor-total-avaliacao').value = formatToBRL(calc.valorTotalAvaliacao);
                    document.getElementById('aval-urb-valor-iptu-ufemg').value = calc.valorIptuEmUfemg?.toFixed(4).replace('.', ',');
                    document.getElementById('aval-urb-valor-declarado-ufemg').value = calc.valorDeclaradoEmUfemg?.toFixed(4).replace('.', ',');
                    document.getElementById('aval-urb-valor-iptu-ufemg-final').value = calc.valorIptuEmUfemg?.toFixed(4).replace('.', ',');
                    document.getElementById('aval-urb-valor-declarado-ufemg-final').value = calc.valorDeclaradoEmUfemg?.toFixed(4).replace('.', ',');
                    document.getElementById('aval-urb-valor-avaliacao-ufemg').value = calc.valorAvaliacaoEmUfemg?.toFixed(4).replace('.', ',');
                    document.getElementById('aval-urb-maior-valor-ufemg').value = calc.maiorValorUfemg?.toFixed(4).replace('.', ',');
                    document.getElementById('aval-urb-fonte-maior-valor').value = calc.fonteMaiorValor || '';

                }, 100);
            }, 100);

            if (data.documentosVinculadosIds) data.documentosVinculadosIds.forEach(id => linkedEntities.documents.set(id, null));
            if (data.contribuintesVinculadosIds) data.contribuintesVinculadosIds.forEach(id => linkedEntities.contribuintes.set(id, null));
            if (data.recursosVinculadosIds) data.recursosVinculadosIds.forEach(id => linkedEntities.recursos.set(id, null));
            if (data.vinculosAvaliacoesIds) data.vinculosAvaliacoesIds.forEach(id => linkedEntities.itcdAvaliacoesStore.set(id, null));
            renderizarChipsDeVinculos();
            renderExistingAttachments();
        }, 100);
    }
    
    async function calcularAvaliacaoUrbana(returnOnly = false) {
        // --- 1. Cálculo do Terreno ---
        const areaTerreno = getFloatVal('aval-urb-area-terreno');
        const valorM2Terreno = parseFromBRL(document.getElementById('aval-urb-valor-m2-terreno').value);
        const percentualEsquina = document.getElementById('aval-urb-esquina').checked ? (urbanoConfigCache.geral?.esquina / 100 || 0.25) : 0;
        const tipoTerrenoSelect = document.getElementById('aval-urb-tipo-terreno');
        const percentualTipoTerreno = parseFloat(tipoTerrenoSelect.options[tipoTerrenoSelect.selectedIndex]?.dataset.percent) || 1;

        const avaliacaoTerrenoBruto = areaTerreno * valorM2Terreno;
        const avaliacaoTerreno = avaliacaoTerrenoBruto * (1 + percentualEsquina) * percentualTipoTerreno;
        
        // --- 2. Cálculo da Construção ---
        const areaConstruida = getFloatVal('aval-urb-area-construida');
        const areaEdicula = getFloatVal('aval-urb-area-edicula');
        const valorM2Construido = parseFromBRL(document.getElementById('aval-urb-valor-m2-construido').value);
        const depreciacaoSelect = document.getElementById('aval-urb-depreciacao');
        const percentualDepreciacao = parseFloat(depreciacaoSelect.options[depreciacaoSelect.selectedIndex]?.dataset.percent) || 1;
        const conservacaoSelect = document.getElementById('aval-urb-conservacao');
        const percentualConservacao = parseFloat(conservacaoSelect.options[conservacaoSelect.selectedIndex]?.dataset.percent) || 1;
        const percentualEdicula = (urbanoConfigCache.geral?.edicula / 100 || 0.30);
        
        const isApartamento = document.getElementById('aval-urb-is-apartamento').value === 'sim';
        let fatorApartamento = 1;
        if(isApartamento) {
            const padrao = document.getElementById('aval-urb-padrao').value.toLowerCase();
            fatorApartamento = urbanoConfigCache.apartamento?.[padrao] || (padrao === 'baixo' ? 1.5 : (padrao === 'normal' ? 2.0 : (padrao === 'alto' ? 2.5 : 1)));
        }

        const valorM2Edicula = valorM2Construido * percentualEdicula;
        const valorConstruidoBase = areaConstruida * valorM2Construido;
        const valorEdiculaBase = areaEdicula * valorM2Edicula;
        
        const valorConstruidoDepreciado = valorConstruidoBase * percentualDepreciacao * percentualConservacao * fatorApartamento;
        const valorEdiculaDepreciado = valorEdiculaBase * percentualDepreciacao * percentualConservacao * fatorApartamento;

        const valorTotalConstrucao = valorConstruidoDepreciado + valorEdiculaDepreciado;
        
        // --- 3. Cálculo da Fração Ideal e Valor Total ---
        const areaTotalUnidade = areaConstruida + areaEdicula;
        const areaTotalGeral = getFloatVal('aval-urb-area-total-geral');

        let fracaoIdeal = 1;
        if (!isFraçãoIdealManuallySet) {
             fracaoIdeal = (areaTotalGeral > 0 && areaTotalUnidade > 0) ? (areaTotalUnidade / areaTotalGeral) : 1;
             document.getElementById('aval-urb-fracao-ideal').value = fracaoIdeal > 0 ? fracaoIdeal.toFixed(6).replace('.', ',') : '';
        } else {
            fracaoIdeal = getFloatVal('aval-urb-fracao-ideal');
        }
        
        const valorFracaoTerreno = avaliacaoTerreno * fracaoIdeal;
        const valorTotalAvaliacao = valorFracaoTerreno + valorTotalConstrucao;
        
        // --- 4. Conversão para UFEMG e Comparação de Valores ---
        const dataAvaliacao = document.getElementById('aval-urb-data').value;
        const anoAvaliacao = dataAvaliacao ? new Date(dataAvaliacao + 'T00:00:00').getFullYear() : new Date().getFullYear();
        const ufemgAnoAvaliacao = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(anoAvaliacao) || 1;
        
        const valorDeclarado = parseFromBRL(document.getElementById('aval-urb-valor-declarado').value);
        const anoDeclarado = getFloatVal('aval-urb-ano-declarado');
        const ufemgAnoDeclarado = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(anoDeclarado) || 1;
        
        const valorIptu = parseFromBRL(document.getElementById('aval-urb-valor-iptu').value);
        const anoIptu = getFloatVal('aval-urb-ano-iptu');
        const ufemgAnoIptu = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(anoIptu) || 1;

        const valorAvaliacaoEmUfemg = ufemgAnoAvaliacao > 0 ? valorTotalAvaliacao / ufemgAnoAvaliacao : 0;
        const valorDeclaradoEmUfemg = ufemgAnoDeclarado > 0 ? valorDeclarado / ufemgAnoDeclarado : 0;
        const valorIptuEmUfemg = ufemgAnoIptu > 0 ? valorIptu / ufemgAnoIptu : 0;
        
        const maiorValorUfemg = Math.max(valorAvaliacaoEmUfemg, valorDeclaradoEmUfemg, valorIptuEmUfemg);

        // --- LÓGICA ADICIONADA: Determinar a fonte do maior valor ---
        let fonteMaiorValor = 'N/D';
        let maiorValorBRL = valorTotalAvaliacao; // Padrão

        if (maiorValorUfemg > 0) {
            if (maiorValorUfemg === valorAvaliacaoEmUfemg) {
                fonteMaiorValor = 'Avaliação do Sistema';
                maiorValorBRL = valorTotalAvaliacao;
            } else if (maiorValorUfemg === valorDeclaradoEmUfemg) {
                fonteMaiorValor = 'Valor Declarado';
                maiorValorBRL = valorDeclarado;
            } else {
                fonteMaiorValor = 'Valor do IPTU';
                maiorValorBRL = valorIptu;
            }
        }

        const dadosCalculados = {
            avaliacaoTerreno, valorConstruidoDepreciado, valorEdiculaDepreciado, valorTotalConstrucao,
            fracaoIdeal, valorTotalAvaliacao, valorAvaliacaoEmUfemg, valorDeclaradoEmUfemg,
            valorIptuEmUfemg, maiorValorUfemg, fonteMaiorValor, maiorValorBRL,
            ufemgUsada: { ano: anoAvaliacao, valor: ufemgAnoAvaliacao }
        };

        if(returnOnly) return dadosCalculados;

        // --- 5. Atualização da Interface ---
        document.getElementById('aval-urb-valor-total-terreno').value = formatToBRL(valorFracaoTerreno);
        document.getElementById('aval-urb-valor-m2-edicula').value = formatToBRL(valorM2Edicula);
        document.getElementById('aval-urb-valor-total-construido').value = formatToBRL(valorConstruidoDepreciado);
        document.getElementById('aval-urb-valor-total-edicula').value = formatToBRL(valorEdiculaDepreciado);
        document.getElementById('aval-urb-valor-total-construcao').value = formatToBRL(valorTotalConstrucao);
        document.getElementById('aval-urb-area-total-unidade').value = areaTotalUnidade.toFixed(2).replace('.', ',');
        document.getElementById('aval-urb-valor-total-avaliacao').value = formatToBRL(valorTotalAvaliacao);
        document.getElementById('aval-urb-valor-iptu-ufemg').value = valorIptuEmUfemg.toFixed(4).replace('.', ',');
        document.getElementById('aval-urb-valor-declarado-ufemg').value = valorDeclaradoEmUfemg.toFixed(4).replace('.', ',');
        document.getElementById('aval-urb-valor-iptu-ufemg-final').value = valorIptuEmUfemg.toFixed(4).replace('.', ',');
        document.getElementById('aval-urb-valor-declarado-ufemg-final').value = valorDeclaradoEmUfemg.toFixed(4).replace('.', ',');
        document.getElementById('aval-urb-valor-avaliacao-ufemg').value = valorAvaliacaoEmUfemg.toFixed(4).replace('.', ',');
        document.getElementById('aval-urb-maior-valor-ufemg').value = maiorValorUfemg.toFixed(4).replace('.', ',');
        document.getElementById('aval-urb-fonte-maior-valor').value = fonteMaiorValor;
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
        container.innerHTML = '';
        if (temporaryAttachments.length === 0) {
            container.innerHTML = '<p class="text-xs text-gray-500 dark:text-gray-400">Nenhum anexo novo adicionado.</p>';
        } else {
            temporaryAttachments.forEach(att => {
                const chip = document.createElement('span');
                chip.className = 'chip-item inline-flex items-center px-2 py-1 mr-1 mt-1 text-xs font-medium bg-blue-100 dark:bg-blue-700 text-blue-800 dark:text-blue-200 rounded-full';
                chip.innerHTML = `<span class="dark:text-gray-200">${att.file.name}</span> <button type="button" class="ml-1.5 inline-flex text-current opacity-75 hover:opacity-100 btn-remove-attachment" data-temp-id="${att.tempId}">×</button>`;
                container.appendChild(chip);
            });
        }
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

    async function abrirModalSelecaoVinculos(entityStoreName) {
        const config = window.SEFWorkStation.EntityConfig.getConfigByStoreName(entityStoreName);
        if (!config) return;
        
        uiModuleRef.showLoading(true, `Carregando ${config.labelPlural}...`);
        
        const allItems = await dbRef.getAllItems(entityStoreName);
        const activeItems = allItems.filter(item => !(item.isDeleted || item.isExcluida));
        
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
                    chip.innerHTML = `<span class="dark:text-gray-200">${item[config.displayField]}</span> <button type="button" class="ml-1.5 inline-flex text-current opacity-75 hover:opacity-100 btn-remove-vinculo" data-entity-store="${storeName}" data-id="${id}">×</button>`;
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
        renderFormAvaliacaoUrbana,
    };
})();