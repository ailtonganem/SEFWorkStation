// js/itcd/avaliacoes/rural.js - Módulo para Avaliação de Imóveis Rurais (ITCD)
// v2.7.0 - CORRIGIDO: O valor final da avaliação agora corresponde ao item de maior valor em UFEMG (avaliação ou declarado), e sua origem é exibida na interface.
// v2.6.0 - ALTERADO: O responsável pela avaliação agora é sempre o usuário atual (definido nas configurações), tanto na criação quanto na edição.
// v2.5.0 - CORRIGIDO: Garante que o responsável e o MASP sejam corretamente preenchidos, usando os dados da avaliação em modo de edição ou os do usuário atual em um novo formulário.
// ... (histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ITCD = window.SEFWorkStation.ITCD || {};
window.SEFWorkStation.ITCD.AvaliacoesRural = (function() {

    let mainContentWrapperRef;
    let dbRef;
    let appModuleRef;
    let uiModuleRef;
    let sharedUtilsRef;
    
    // Caches de configuração
    let srfCache = [];
    let ufCache = [];
    let ruralConfigCache = {};

    // Estado do formulário
    let temporaryAttachments = [];
    let existingAttachments = [];
    let linkedEntities = {
        documents: new Map(),
        contribuintes: new Map(),
        recursos: new Map(),
        itcdAvaliacoesStore: new Map()
    };
    
    const QUALIDADES_PADRAO = [
        { nome: 'Classe A', desc: 'Terras que não apresentam limitações significativas para a produção de lavouras.' },
        { nome: 'Classe B', desc: 'Terras que apresentam limitações moderadas para a produção de lavouras.' },
        { nome: 'Classe C', desc: 'Terras que apresentam limitações fortes para a produção de lavouras, sendo aptas para pastagens.' },
        { nome: 'Classe D', desc: 'Terras inaptas para a produção de lavouras, mas aptas para silvicultura ou pastagem natural.' },
        { nome: 'Classe E', desc: 'Terras com restrições muito fortes, inaptas para uso agrosilvopastoril (matas, preservação, etc.).' }
    ];

    const TIPOS_AVALIACAO = [
        { id: 'urbano', title: 'Imóvel Urbano', description: 'Para apartamentos, casas, lotes, salas comerciais e outros imóveis em área urbana.', action: 'itcd-avaliar-imovel-urbano', type: 'imovel', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-building" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M14.763.075A.5.5 0 0 1 15 .5v15a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5V14h-1v1.5a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5V14h-1v1.5a.5.5 0 0 1-.5.5H.5a.5.5 0 0 1-.5-.5v-15a.5.5 0 0 1 .237-.425l4.5-3a.5.5 0 0 1 .526 0l4.5 3 .474.316zM12 13.5V3.75l-4-2.667-4 2.667V13.5h8zM8 11h1v1H8v-1zm-2 0h1v1H6v-1zm-2 0h1v1H4v-1zm0-3h1v1H4v-1zm2 0h1v1H6v-1zm2 0h1v1H8v-1zm2 0h1v1h-1v-1zm-2-3h1v1H8V5zm-2 0h1v1H6V5z"/></svg>`},
        { id: 'rural', title: 'Imóvel Rural', description: 'Para fazendas, sítios, chácaras e terrenos localizados em área rural.', action: 'itcd-avaliar-imovel-rural', type: 'imovel', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-house-door" viewBox="0 0 16 16"><path d="M8.354 1.146a.5.5 0 0 0-.708 0l-6 6A.5.5 0 0 0 1.5 7.5v7a.5.5 0 0 0 .5.5h4.5a.5.5 0 0 0 .5-.5v-4h2v4a.5.5 0 0 0 .5.5H14a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.146-.354L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293L8.354 1.146zM2.5 14V7.707l5.5-5.5 5.5 5.5V14H10v-4a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5v4H2.5z"/></svg>`},
        { id: 'semovente', title: 'Semovente', description: 'Para avaliação de gado, equinos e outros tipos de rebanhos.', action: 'itcd-avaliar-semovente', type: 'semovente', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 16c0-2.2 1.8-4 4-4M5 10V4H3.5a2.5 2.5 0 1 0 0 5H5m0-5v2m0 3v2m1.1-4.8c-.2 1.3-1.3 2.3-2.6 2.3H5m0-5a2.5 2.5 0 1 1 5 0V10M12 4h2a2 2 0 1 1 0 4h-2v2a2 2 0 1 0 0 4h2a2 2 0 1 0 0 4h-2v2a2 2 0 1 1-4 0v-2a2 2 0 1 0-4 0v2H2"></path></svg>`}
    ];

    // --- Funções Auxiliares de Formatação e Parsing ---
    function formatToBRL(value) {
        if (isNaN(value) || value === null) return '';
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    
    function formatNumber(value, decimalPlaces = 2) {
        if (isNaN(value) || value === null) return '';
        return value.toLocaleString('pt-BR', { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces });
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
        console.log("Módulo ITCD.AvaliacoesRural inicializado (v2.7.0).");
    }

    async function renderFormAvaliacaoRural(data = null, isDuplicating = false) {
        const isEditing = data && data.id && !isDuplicating;
        const feedbackAreaId = "feedback-avaliacao-rural";
        const currentUser = await sharedUtilsRef.getCurrentUser();
        
        temporaryAttachments = [];
        existingAttachments = isEditing ? [...(data.anexos || [])] : [];
        linkedEntities = {
            documents: new Map(),
            contribuintes: new Map(),
            recursos: new Map(),
            itcdAvaliacoesStore: new Map()
        };

        try {
            const [configSrf, configUf, todosDocumentos] = await Promise.all([
                dbRef.getItemById('itcdConfiguracoesStore', 'srfCidades'),
                dbRef.getItemById('itcdConfiguracoesStore', 'unidadesFazendarias'),
                dbRef.getAllItems(dbRef.STORES.DOCUMENTS)
            ]);
            
            srfCache = configSrf?.value || [];
            ufCache = configUf?.value || [];
            srfCache.sort((a,b) => a.nome.localeCompare(b.nome));

            let srfOptionsHtml = '<option value="">Selecione...</option>' + srfCache.map(srf => `<option value="${srf.id}">${srf.nome}</option>`).join('');
            
            let qualidadeHaOptionsHtml = QUALIDADES_PADRAO.map(q => `<option value="${q.nome}" title="${q.desc}">${q.nome}</option>`).join('');

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
            modelosMetodologia.forEach(doc => { metodologiaOptionsHtml += `<option value="${doc.id}">${doc.title}</option>`; });
            
            const formTitle = isEditing ? 'Editar Parecer de Avaliação Rural' : (isDuplicating ? 'Novo Parecer Rural (Duplicado)' : 'Novo Parecer de Avaliação Rural');

            const pageHtml = `
            <div id="avaliacao-rural-container" class="page-section max-w-none px-4 sm:px-6 lg:px-8">
                <h2 class="text-2xl font-semibold mb-4">${formTitle}</h2>
                <div id="${feedbackAreaId}" class="mb-6"></div>

                <form id="form-avaliacao-rural" class="space-y-6">
                    
                    <div class="section-box p-4 border dark:border-slate-700 rounded-lg">
                        <h3 class="section-header">Identificação</h3>
                        <div class="form-grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                            <div class="lg:col-span-1">
                                <label for="aval-rural-srf" class="dark:text-gray-300">Superintendência (SRF):</label>
                                <select id="aval-rural-srf" class="form-input-text mt-1">${srfOptionsHtml}</select>
                            </div>
                            <div class="lg:col-span-2">
                                <label for="aval-rural-uf" class="dark:text-gray-300">Unidade Fazendária (UF):</label>
                                <select id="aval-rural-uf" class="form-input-text mt-1" disabled><option>Selecione a SRF</option></select>
                            </div>
                            <div>
                                <label for="aval-rural-responsavel" class="dark:text-gray-300">Responsável:</label>
                                <input type="text" id="aval-rural-responsavel" class="form-input-text mt-1" value="${currentUser?.nome || 'N/A'}" readonly>
                            </div>
                             <div>
                                <label for="aval-rural-masp" class="dark:text-gray-300">MASP:</label>
                                <input type="text" id="aval-rural-masp" class="form-input-text mt-1" value="${currentUser?.matricula || 'N/A'}" readonly>
                            </div>
                             <div>
                                <label for="aval-rural-data" class="dark:text-gray-300">Data da Avaliação:</label>
                                <input type="date" id="aval-rural-data" class="form-input-text mt-1" value="${new Date().toISOString().substring(0, 10)}">
                            </div>
                             <div class="lg:col-span-2">
                                <label for="aval-rural-declaracao" class="dark:text-gray-300">Declaração (DBD):</label>
                                <input type="text" id="aval-rural-declaracao" class="form-input-text mt-1" placeholder="Nº da DBD">
                            </div>
                             <div class="lg:col-span-3">
                                <label for="aval-rural-metodologia-select" class="block text-sm font-medium dark:text-gray-300">Modelo de Metodologia:</label>
                                <select id="aval-rural-metodologia-select" class="form-input-text mt-1">${metodologiaOptionsHtml}</select>
                            </div>
                            <div class="lg:col-span-3">
                                <label for="aval-rural-metodologia" class="dark:text-gray-300">Metodologia Aplicada:</label>
                                <textarea id="aval-rural-metodologia" rows="3" class="form-input-text mt-1">Em conformidade com a pauta de valores, sem visita in loco e considerando o preço médio, em virtude da localização, área do terreno e construído, de acordo com as características do imóvel, através de ferramentas como google maps.</textarea>
                            </div>
                        </div>
                    </div>

                    <div class="section-box p-4 border dark:border-slate-700 rounded-lg">
                        <h3 class="section-header">Dados do Imóvel Rural</h3>
                        <div class="grid grid-cols-1 md:grid-cols-6 gap-4">
                            <div class="md:col-span-3">
                                <label for="aval-rural-nome" class="dark:text-gray-300">Nome do Imóvel:</label>
                                <input type="text" id="aval-rural-nome" class="form-input-text mt-1">
                            </div>
                             <div class="md:col-span-3">
                                <label for="aval-rural-municipio" class="dark:text-gray-300">Município:</label>
                                <input type="text" id="aval-rural-municipio" list="aval-rural-municipio-datalist" class="form-input-text mt-1" disabled>
                                <datalist id="aval-rural-municipio-datalist"></datalist>
                            </div>

                            <div class="md:col-span-4">
                                <label for="aval-rural-coordenadas" class="dark:text-gray-300">Coordenadas Geográficas:</label>
                                <div class="flex items-center gap-2 mt-1">
                                    <input type="text" id="aval-rural-coordenadas" class="form-input-text flex-grow" placeholder="-19.888, -43.999">
                                    <button type="button" id="btn-google-maps-rural" class="btn-secondary flex-shrink-0">Ver no Mapa</button>
                                </div>
                            </div>
                             <div class="md:col-span-2 flex items-end">
                                <a href="https://mapa.onr.org.br/" target="_blank" class="btn-secondary w-full">Pesquisar CAR</a>
                            </div>

                            <div class="md:col-span-2">
                                <label for="aval-rural-area-ha" class="dark:text-gray-300">Área do Imóvel (ha):</label>
                                <input type="text" id="aval-rural-area-ha" class="form-input-text mt-1">
                            </div>
                             <div class="md:col-span-2">
                                <label for="aval-rural-area-alqueire" class="dark:text-gray-300">Área em Alqueires (4,84ha):</label>
                                <input type="text" id="aval-rural-area-alqueire" class="form-input-text mt-1 bg-gray-100 dark:bg-slate-700" readonly>
                            </div>
                             <div class="md:col-span-2">
                                <label for="aval-rural-tipo" class="dark:text-gray-300">Tipo de Imóvel:</label>
                                <select id="aval-rural-tipo" class="form-input-text mt-1">
                                    <option>CHÁCARA/GLEBA</option>
                                    <option>FAZENDA</option>
                                    <option>SÍTIO</option>
                                </select>
                            </div>
                            <div class="md:col-span-3">
                                <label for="aval-rural-localizacao" class="dark:text-gray-300">Localização:</label>
                                <select id="aval-rural-localizacao" class="form-input-text mt-1">
                                    <option>BOA</option>
                                    <option>MÉDIA</option>
                                    <option>RUIM</option>
                                </select>
                            </div>
                             <div class="md:col-span-3">
                                <label for="aval-rural-recursos-hidricos" class="dark:text-gray-300">Recursos Hídricos?</label>
                                <select id="aval-rural-recursos-hidricos" class="form-input-text mt-1">
                                    <option value="nao">NÃO</option>
                                    <option value="sim">SIM</option>
                                </select>
                            </div>
                        </div>
                        <hr class="my-4 dark:border-slate-600">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label for="aval-rural-valor-declarado" class="dark:text-gray-300">Valor Declarado:</label>
                                <input type="text" id="aval-rural-valor-declarado" class="form-input-text mt-1 currency-input">
                             </div>
                             <div>
                                <label for="aval-rural-ano-declarado" class="dark:text-gray-300">Ano Declarado:</label>
                                <input type="number" id="aval-rural-ano-declarado" class="form-input-text mt-1" placeholder="AAAA">
                             </div>
                        </div>
                        <hr class="my-4 dark:border-slate-600">
                        <h4 class="text-md font-semibold mb-2 dark:text-gray-200">Valores Conforme ITR</h4>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <div>
                                <label for="aval-rural-vtn-itr" class="dark:text-gray-300">Terra Nua (R$):</label>
                                <input type="text" id="aval-rural-vtn-itr" class="form-input-text mt-1 currency-input itr-field">
                             </div>
                             <div>
                                <label for="aval-rural-culturas-itr" class="dark:text-gray-300">Culturas (R$):</label>
                                <input type="text" id="aval-rural-culturas-itr" class="form-input-text mt-1 currency-input itr-field">
                             </div>
                             <div>
                                <label for="aval-rural-benfeitorias-itr" class="dark:text-gray-300">Benfeitorias (R$):</label>
                                <input type="text" id="aval-rural-benfeitorias-itr" class="form-input-text mt-1 currency-input itr-field">
                             </div>
                        </div>
                    </div>
                    
                     <!-- Seção de Avaliação -->
                    <div class="section-box p-4 border dark:border-slate-700 rounded-lg">
                        <h3 class="section-header">Avaliação</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div class="lg:col-span-2">
                                <label for="aval-rural-qualidade-terra" class="flex items-center dark:text-gray-300">
                                    Qualidade da Terra Nua:
                                    <button type="button" id="btn-ajuda-qualidade-terra" class="ml-2 text-gray-400 hover:text-blue-500" title="Ver descrição das classes">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-question-circle" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286a.237.237 0 0 0 .241.247zm2.325 6.443c.61 0 1.029-.394 1.029-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94 0 .533.425.927 1.01.927z"/></svg>
                                    </button>
                                </label>
                                <select id="aval-rural-qualidade-terra" class="form-input-text mt-1">${qualidadeHaOptionsHtml}</select>
                            </div>
                            <div class="lg:col-span-2">
                                <label for="aval-rural-valor-hectare" class="dark:text-gray-300">Valor Ajustado por Hectare (R$):</label>
                                <input type="text" id="aval-rural-valor-hectare" class="form-input-text mt-1 bg-gray-100 dark:bg-slate-700 font-semibold" readonly placeholder="Selecione cidade e qualidade...">
                            </div>

                            <div class="lg:col-span-2">
                                <label for="aval-rural-valor-alqueire" class="dark:text-gray-300">Valor Ajustado por Alqueire (R$):</label>
                                <input type="text" id="aval-rural-valor-alqueire" class="form-input-text mt-1 bg-gray-100 dark:bg-slate-700" readonly>
                            </div>
                        </div>

                        <div class="mt-6 p-4 bg-gray-100 dark:bg-slate-800 rounded-lg">
                            <h4 class="text-lg font-semibold mb-2 text-center dark:text-gray-200">Resultados</h4>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="md:col-span-2 text-center mt-2">
                                    <label class="text-lg font-bold dark:text-gray-200">Avaliação Final do Imóvel:
                                        <span id="aval-rural-origem-valor-final" class="block text-xs font-normal text-gray-500 dark:text-gray-400">Origem do valor: N/A</span>
                                    </label>
                                    <p id="aval-rural-avaliacao-imovel-final" class="text-2xl font-bold text-red-600 dark:text-red-400">R$ 0,00</p>
                                </div>
                                <div>
                                    <label class="dark:text-gray-300">Valor da Avaliação (UFEMG):</label>
                                    <input type="text" id="aval-rural-valor-ufemg-final" class="form-input-text mt-1 bg-gray-200 dark:bg-slate-700" readonly>
                                </div>
                                 <div>
                                    <label class="dark:text-gray-300">Valor Declarado (UFEMG):</label>
                                    <input type="text" id="aval-rural-valor-declarado-ufemg-final" class="form-input-text mt-1 bg-gray-200 dark:bg-slate-700" readonly>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="section-box p-4 border dark:border-slate-700 rounded-lg">
                        <h3 class="section-header">Anexos</h3>
                        <div id="existing-attachments-container" class="space-y-2 mb-3"></div>
                        <div class="mb-2">
                            <label for="avaliacao-anexos-input" class="sr-only">Adicionar novos anexos</label>
                            <input type="file" id="avaliacao-anexos-input" class="form-input-file" multiple>
                        </div>
                        <div id="avaliacao-anexos-container" class="space-y-2">
                            <p class="text-xs text-gray-500 dark:text-gray-400">Nenhum anexo novo adicionado.</p>
                        </div>
                    </div>
                    
                    <div class="section-box p-4 border dark:border-slate-700 rounded-lg">
                        <h3 class="section-header">Vincular a Outras Entidades</h3>
                         <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label class="block text-sm font-medium dark:text-gray-300">Documentos Relacionados:</label><div id="vinculos-documents-container" class="p-2 border rounded-md min-h-[40px] bg-gray-50 dark:bg-slate-800/50 mt-1"></div><button type="button" class="btn-link mt-1 btn-gerenciar-vinculos" data-entity-store="documents">Gerenciar Vínculos</button></div>
                            <div><label class="block text-sm font-medium dark:text-gray-300">Contribuintes Relacionados:</label><div id="vinculos-contribuintes-container" class="p-2 border rounded-md min-h-[40px] bg-gray-50 dark:bg-slate-800/50 mt-1"></div><button type="button" class="btn-link mt-1 btn-gerenciar-vinculos" data-entity-store="contribuintes">Gerenciar Vínculos</button></div>
                            <div><label class="block text-sm font-medium dark:text-gray-300">Recursos Relacionados:</label><div id="vinculos-recursos-container" class="p-2 border rounded-md min-h-[40px] bg-gray-50 dark:bg-slate-800/50 mt-1"></div><button type="button" class="btn-link mt-1 btn-gerenciar-vinculos" data-entity-store="recursos">Gerenciar Vínculos</button></div>
                            <div><label class="block text-sm font-medium dark:text-gray-300">Outras Avaliações Vinculadas:</label><div id="vinculos-itcdAvaliacoesStore-container" class="p-2 border rounded-md min-h-[40px] bg-gray-50 dark:bg-slate-800/50 mt-1"></div><button type="button" class="btn-link mt-1 btn-gerenciar-vinculos" data-entity-store="itcdAvaliacoesStore">Gerenciar Vínculos</button></div>
                        </div>
                    </div>

                    <div class="section-box p-4 border dark:border-slate-700 rounded-lg">
                        <h3 class="section-header">Observação do Avaliador</h3>
                        <textarea id="aval-rural-observacao" rows="3" class="form-input-text mt-1">Avaliação realizada em conformidade com a pauta de valores da SRF/Goval, sem visita in loco e considerando o preço médio, conforme documentação apresentada e verificado através de ferramentas como google maps.</textarea>
                    </div>

                    <div class="form-actions mt-6 flex justify-end items-center gap-3">
                        <button type="button" id="btn-salvar-avaliacao-rural" class="btn-secondary">${isEditing ? 'Salvar Alterações' : 'Salvar e Visualizar'}</button>
                        <button type="button" id="btn-nova-avaliacao-vinculada-rural" class="btn-primary">Nova Avaliação Vinculada</button>
                    </div>
                </form>
            </div>
            `;

            mainContentWrapperRef.innerHTML = pageHtml;
            addEventListenersAvaliacaoRural(isEditing ? data : null);
            
            if (data) {
                await populateFormForEditing(data);
            } else {
                 document.getElementById('aval-rural-data').value = new Date().toISOString().substring(0, 10);
                 document.getElementById('aval-rural-srf').dispatchEvent(new Event('change'));
            }

        } catch (error) {
            console.error("Erro ao renderizar formulário de avaliação rural:", error);
            mainContentWrapperRef.innerHTML = `<p class="feedback-message error">Erro ao renderizar formulário: ${error.message}</p>`;
        }
    }
    
    // ... (O restante do arquivo, a partir de addEventListenersAvaliacaoRural, permanece o mesmo, exceto a função de cálculo) ...
    async function calcularAvaliacaoRural(returnOnly = false) {
        const areaHa = getFloatVal('aval-rural-area-ha');
        const valorHectareAjustado = parseFromBRL(document.getElementById('aval-rural-valor-hectare').value);
        
        const areaAlqueire = areaHa > 0 ? areaHa / 4.84 : 0;
        const valorAlqueire = valorHectareAjustado * 4.84;
        const valorTerra = areaHa * valorHectareAjustado;
        
        const dataAvaliacao = document.getElementById('aval-rural-data').value;
        const anoAvaliacao = dataAvaliacao ? new Date(dataAvaliacao + 'T00:00:00').getFullYear() : new Date().getFullYear();
        const ufemgAnoAvaliacao = await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(anoAvaliacao) || 1;
        
        const valorDeclarado = parseFromBRL(document.getElementById('aval-rural-valor-declarado').value);
        const anoDeclaradoInput = document.getElementById('aval-rural-ano-declarado');
        const anoDeclarado = anoDeclaradoInput ? parseInt(anoDeclaradoInput.value) : null;
        const ufemgAnoDeclarado = anoDeclarado ? await window.SEFWorkStation.ITCD.TabelasReferencia.buscarValorUfemgPorAno(anoDeclarado) || 1 : 1;
        const valorDeclaradoUfemg = (ufemgAnoDeclarado > 0 && valorDeclarado > 0) ? (valorDeclarado / ufemgAnoDeclarado) : 0;
        
        const culturasITR = parseFromBRL(document.getElementById('aval-rural-culturas-itr').value);
        const benfeitoriasITR = parseFromBRL(document.getElementById('aval-rural-benfeitorias-itr').value);
        
        const avaliacaoImovel = valorTerra + culturasITR + benfeitoriasITR;
        const avaliacaoUfemg = (ufemgAnoAvaliacao > 0) ? avaliacaoImovel / ufemgAnoAvaliacao : 0;

        // **NOVA LÓGICA PARA ESCOLHER O VALOR FINAL**
        let valorFinalAvaliacao = 0;
        let origemValorFinal = 'N/A';
        const maiorValorUfemg = Math.max(avaliacaoUfemg, valorDeclaradoUfemg);
        
        if (maiorValorUfemg > 0 && Math.abs(maiorValorUfemg - valorDeclaradoUfemg) < 0.0001) {
            valorFinalAvaliacao = valorDeclarado;
            origemValorFinal = 'Valor Declarado';
        } else {
            valorFinalAvaliacao = avaliacaoImovel;
            origemValorFinal = 'Avaliação do Sistema';
        }

        const dadosCalculados = {
            avaliacaoImovel, avaliacaoUfemg, valorDeclaradoUfemg, valorTerra,
            culturasITR, benfeitoriasITR, valorHectareAjustado,
            valorFinalAvaliacao, origemValorFinal // **NOVOS DADOS SALVOS**
        };
        
        if (returnOnly) return dadosCalculados;
        
        document.getElementById('aval-rural-area-alqueire').value = formatNumber(areaAlqueire, 4);
        document.getElementById('aval-rural-valor-alqueire').value = formatToBRL(valorAlqueire);
        
        // **ATUALIZAÇÃO DA EXIBIÇÃO DO RESULTADO FINAL**
        document.getElementById('aval-rural-avaliacao-imovel-final').textContent = formatToBRL(valorFinalAvaliacao);
        document.getElementById('aval-rural-origem-valor-final').textContent = `Origem do valor: ${origemValorFinal}`;
        
        document.getElementById('aval-rural-valor-ufemg-final').value = formatNumber(avaliacaoUfemg, 4);
        document.getElementById('aval-rural-valor-declarado-ufemg-final').value = formatNumber(valorDeclaradoUfemg, 4);
    }

    async function handleSalvarAvaliacaoCore(originalData = null) {
        const isEditing = originalData && originalData.id;
        const currentUser = await sharedUtilsRef.getCurrentUser();
        const srfSelecionada = srfCache.find(s => s.id === document.getElementById('aval-rural-srf').value);

        const dadosFormulario = {
            srfId: srfSelecionada ? srfSelecionada.id : null,
            srfNome: srfSelecionada ? srfSelecionada.nome : document.getElementById('aval-rural-srf').value,
            ufId: document.getElementById('aval-rural-uf').value,
            metodologiaTexto: document.getElementById('aval-rural-metodologia').value,
            nomeImovel: document.getElementById('aval-rural-nome').value,
            municipio: document.getElementById('aval-rural-municipio').value,
            coordenadas: document.getElementById('aval-rural-coordenadas').value,
            areaHa: getFloatVal('aval-rural-area-ha'),
            tipoImovel: document.getElementById('aval-rural-tipo').value,
            localizacao: document.getElementById('aval-rural-localizacao').value,
            recursosHidricos: document.getElementById('aval-rural-recursos-hidricos').value === 'sim',
            valorDeclarado: parseFromBRL(document.getElementById('aval-rural-valor-declarado').value),
            anoDeclarado: getFloatVal('aval-rural-ano-declarado'),
            vtnITR: parseFromBRL(document.getElementById('aval-rural-vtn-itr').value),
            culturasITR: parseFromBRL(document.getElementById('aval-rural-culturas-itr').value),
            benfeitoriasITR: parseFromBRL(document.getElementById('aval-rural-benfeitorias-itr').value),
            qualidadeTerra: document.getElementById('aval-rural-qualidade-terra').value,
            observacao: document.getElementById('aval-rural-observacao').value
        };

        const dadosCalculados = await calcularAvaliacaoRural(true);

        const avaliacaoData = {
            id: isEditing ? originalData.id : appModuleRef.generateUUID(),
            creationDate: isEditing ? originalData.creationDate : new Date().toISOString(),
            modificationDate: new Date().toISOString(),
            tipo: 'imovel-rural',
            responsavelMasp: currentUser.matricula,
            responsavelNome: currentUser.nome,
            declaracao: document.getElementById('aval-rural-declaracao').value.trim(),
            dataAvaliacao: document.getElementById('aval-rural-data').value,
            dadosFormulario,
            dadosCalculados,
            documentosVinculadosIds: Array.from(linkedEntities.documents.keys()),
            contribuintesVinculadosIds: Array.from(linkedEntities.contribuintes.keys()),
            recursosVinculadosIds: Array.from(linkedEntities.recursos.keys()),
            vinculosAvaliacoesIds: Array.from(linkedEntities.itcdAvaliacoesStore.keys()),
            anexos: existingAttachments
        };

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
            uiModuleRef.showToastNotification(`Avaliação rural ${isEditing ? 'atualizada' : 'salva'} com sucesso!`, "success");
            return avaliacaoData;
        } catch (error) {
            console.error("Erro ao salvar avaliação rural:", error);
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

        document.getElementById('aval-rural-srf').value = form.srfId || '';
        document.getElementById('aval-rural-srf').dispatchEvent(new Event('change'));
        
        setTimeout(async () => { 
            document.getElementById('aval-rural-uf').value = form.ufId || ''; 
            document.getElementById('aval-rural-municipio').value = form.municipio || '';
            document.getElementById('aval-rural-municipio').dispatchEvent(new Event('input')); 
            
            setTimeout(async() => {
                 document.getElementById('aval-rural-qualidade-terra').value = form.qualidadeTerra || '';
                 await updateValorHectare();
            }, 250);

        }, 200);

        document.getElementById('aval-rural-data').value = data.dataAvaliacao || '';
        document.getElementById('aval-rural-declaracao').value = data.declaracao || '';
        document.getElementById('aval-rural-metodologia').value = form.metodologiaTexto || '';
        document.getElementById('aval-rural-nome').value = form.nomeImovel || '';
        document.getElementById('aval-rural-coordenadas').value = form.coordenadas || '';
        document.getElementById('aval-rural-area-ha').value = formatNumber(form.areaHa, 4) || '';
        document.getElementById('aval-rural-tipo').value = form.tipoImovel || 'CHÁCARA/GLEBA';
        document.getElementById('aval-rural-localizacao').value = form.localizacao || 'BOA';
        document.getElementById('aval-rural-recursos-hidricos').value = form.recursosHidricos ? 'sim' : 'nao';
        document.getElementById('aval-rural-valor-declarado').value = formatToBRL(form.valorDeclarado);
        document.getElementById('aval-rural-ano-declarado').value = form.anoDeclarado || '';
        document.getElementById('aval-rural-vtn-itr').value = formatToBRL(form.vtnITR);
        document.getElementById('aval-rural-culturas-itr').value = formatToBRL(form.culturasITR);
        document.getElementById('aval-rural-benfeitorias-itr').value = formatToBRL(form.benfeitoriasITR);
        document.getElementById('aval-rural-observacao').value = form.observacao || '';

        if (data.documentosVinculadosIds) data.documentosVinculadosIds.forEach(id => linkedEntities.documents.set(id, null));
        if (data.contribuintesVinculadosIds) data.contribuintesVinculadosIds.forEach(id => linkedEntities.contribuintes.set(id, null));
        if (data.recursosVinculadosIds) data.recursosVinculadosIds.forEach(id => linkedEntities.recursos.set(id, null));
        if (data.vinculosAvaliacoesIds) data.vinculosAvaliacoesIds.forEach(id => linkedEntities.itcdAvaliacoesStore.set(id, null));
        
        await renderizarChipsDeVinculos();
        renderExistingAttachments();
        
        setTimeout(calcularAvaliacaoRural, 500);
    }

    // ... (O restante do código, como addEventListeners, helpers de anexo e vínculo, permanece igual) ...

    function addEventListenersAvaliacaoRural(originalData = null) {
        document.getElementById('btn-salvar-avaliacao-rural')?.addEventListener('click', async () => {
            const savedData = await handleSalvarAvaliacaoCore(originalData);
            if (savedData) {
                appModuleRef.handleMenuAction('itcd-visualizar-avaliacao', { avaliacaoId: savedData.id });
            }
        });

        document.getElementById('btn-nova-avaliacao-vinculada-rural')?.addEventListener('click', () => handleNovaAvaliacaoVinculada(originalData));
        
        const fieldsToRecalculate = [
            'aval-rural-valor-declarado', 'aval-rural-ano-declarado', 'aval-rural-data', 
            'aval-rural-vtn-itr', 'aval-rural-culturas-itr', 'aval-rural-benfeitorias-itr'
        ];
        fieldsToRecalculate.forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                const eventType = el.tagName === 'SELECT' ? 'change' : 'input';
                el.addEventListener(eventType, calcularAvaliacaoRural);
            }
        });

        const fieldsForHectareUpdate = ['aval-rural-srf', 'aval-rural-municipio', 'aval-rural-qualidade-terra', 'aval-rural-recursos-hidricos', 'aval-rural-tipo', 'aval-rural-localizacao'];
        fieldsForHectareUpdate.forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                const eventType = el.tagName === 'SELECT' ? 'change' : 'input';
                el.addEventListener(eventType, updateValorHectare);
            }
        });
        
        document.getElementById('aval-rural-area-ha')?.addEventListener('input', updateValorHectare);
        
        const srfSelect = document.getElementById('aval-rural-srf');
        const municipioInput = document.getElementById('aval-rural-municipio');
        
        srfSelect.addEventListener('change', async () => {
            const srfId = srfSelect.value;
            const municipioDatalist = document.getElementById('aval-rural-municipio-datalist');
            const ufSelect = document.getElementById('aval-rural-uf');

            municipioDatalist.innerHTML = '';
            municipioInput.value = '';
            ufSelect.innerHTML = '<option value="">Selecione...</option>';

            if (srfId) {
                const srf = srfCache.find(s => s.id === srfId);
                if (srf && srf.cidades) {
                    srf.cidades.sort((a, b) => a.nome.localeCompare(b.nome)).forEach(c => {
                        municipioDatalist.innerHTML += `<option value="${c.nome}"></option>`;
                    });
                    municipioInput.disabled = false;
                }
                const ufsDaSrf = ufCache.filter(uf => uf.srfId === srfId);
                if(ufsDaSrf.length > 0) {
                    ufsDaSrf.forEach(uf => { ufSelect.innerHTML += `<option value="${uf.id}">${uf.nome} (${uf.tipo})</option>`; });
                    ufSelect.disabled = false;
                } else {
                     ufSelect.disabled = true;
                }
            } else {
                 municipioInput.disabled = true;
                 ufSelect.disabled = true;
            }
            await updateValorHectare();
        });
        
        async function updateValorHectare() {
            const srfId = document.getElementById('aval-rural-srf').value;
            const nomeCidade = document.getElementById('aval-rural-municipio').value;
            const qualidade = document.getElementById('aval-rural-qualidade-terra').value;
            const valorInput = document.getElementById('aval-rural-valor-hectare');
            
            valorInput.value = '';
            
            if (srfId && nomeCidade && qualidade) {
                const configSrf = await dbRef.getItemById('itcdConfiguracoesStore', 'srfCidades');
                const srf = configSrf?.value?.find(s => s.id === srfId);
                const cidade = srf?.cidades?.find(c => c.nome === nomeCidade);
                
                if(cidade && cidade.valoresRurais && cidade.valoresRurais[qualidade]) {
                    let valorHectareBase = cidade.valoresRurais[qualidade];
                    
                    const configGeral = await dbRef.getItemById('itcdConfiguracoesStore', 'ruralGeralConfig');
                    const config = configGeral?.value || {};
                    
                    const temRecursosHidricos = document.getElementById('aval-rural-recursos-hidricos').value === 'sim';
                    const percRecursosHidricos = temRecursosHidricos ? (config.recursosHidricos || 10) / 100 : 0;

                    const tipoImovel = document.getElementById('aval-rural-tipo').value;
                    const percTipoImovel = (config.tipoImovel?.[tipoImovel] || 0) / 100;

                    const localizacao = document.getElementById('aval-rural-localizacao').value;
                    const percLocalizacao = (config.localizacao?.[localizacao] || 0) / 100;

                    const valorHectareAjustado = valorHectareBase * (1 + percRecursosHidricos + percTipoImovel + percLocalizacao);
                    
                    valorInput.value = formatToBRL(valorHectareAjustado);
                }
            }
            await calcularAvaliacaoRural();
        };

        document.querySelectorAll('#form-avaliacao-rural .currency-input').forEach(input => {
            input.addEventListener('blur', async (e) => {
                e.target.value = formatToBRL(parseFromBRL(e.target.value));
                await calcularAvaliacaoRural();
            });
            input.addEventListener('focus', (e) => {
                const val = parseFromBRL(e.target.value);
                e.target.value = val !== 0 ? val.toFixed(2).replace('.', ',') : '';
            });
        });
        
        document.getElementById('btn-google-maps-rural')?.addEventListener('click', () => {
            const coordenadas = document.getElementById('aval-rural-coordenadas')?.value.trim();
            if (coordenadas && coordenadas.includes(',')) {
                const query = encodeURIComponent(coordenadas);
                window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
            } else {
                const nome = document.getElementById('aval-rural-nome')?.value;
                const municipio = document.getElementById('aval-rural-municipio')?.value;
                if (nome && municipio) {
                    const query = encodeURIComponent(`${nome}, ${municipio}`);
                    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
                } else {
                    uiModuleRef.showToastNotification('Preencha as Coordenadas, ou o Nome e Município do imóvel.', 'info');
                }
            }
        });

        document.getElementById('aval-rural-metodologia-select').addEventListener('change', async (e) => {
            const docId = e.target.value;
            const textarea = document.getElementById('aval-rural-metodologia');
            if (docId) {
                const doc = await dbRef.getItemById(dbRef.STORES.DOCUMENTS, docId);
                if (doc && doc.content) {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = doc.content;
                    textarea.value = tempDiv.textContent || tempDiv.innerText || '';
                }
            } else {
                textarea.value = 'Em conformidade com a pauta de valores, sem visita in loco e considerando o preço médio, em virtude da localização, área do terreno e construído, de acordo com as características do imóvel, através de ferramentas como google maps.';
            }
        });

        document.getElementById('btn-ajuda-qualidade-terra')?.addEventListener('click', () => {
            const modalTitle = "Descrição das Classes de Qualidade da Terra";
            let modalContent = '<dl class="space-y-3">';
            QUALIDADES_PADRAO.forEach(q => {
                modalContent += `
                    <div>
                        <dt class="font-semibold text-gray-800 dark:text-gray-100">${q.nome}</dt>
                        <dd class="text-sm text-gray-600 dark:text-gray-300 ml-4">${q.desc}</dd>
                    </div>`;
            });
            modalContent += '</dl>';
            uiModuleRef.showModal(modalTitle, modalContent, [{ text: 'Fechar', class: 'btn-secondary', closesModal: true }]);
        });

        document.getElementById('avaliacao-anexos-input')?.addEventListener('change', handleAttachmentSelection);
        mainContentWrapperRef.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-remove-attachment')) {
                const tempId = e.target.dataset.tempId;
                temporaryAttachments = temporaryAttachments.filter(att => att.tempId !== tempId);
                renderAttachmentChips();
            } else if (e.target.classList.contains('btn-remove-vinculo')) {
                handleRemoverVinculo(e);
            } else if (e.target.classList.contains('btn-remove-existing-attachment')) {
                const anexoId = e.target.dataset.id;
                existingAttachments = existingAttachments.filter(a => a.id.toString() !== anexoId);
                renderExistingAttachments();
                uiModuleRef.showToastNotification("Anexo marcado para remoção. Salve para confirmar.", "info");
            } else if (e.target.matches('.btn-gerenciar-vinculos')) {
                abrirModalSelecaoVinculos(e.target.dataset.entityStore);
            }
        });

        document.getElementById('aval-rural-declaracao')?.addEventListener('blur', async (e) => {
            await verificarVinculoAutomaticoDBD(e.target.value, originalData?.id);
        });
    }

    async function verificarVinculoAutomaticoDBD(dbd, idAtual) {
        if (!dbd) return;
        const todasAvaliacoes = await dbRef.getAllItems(dbRef.STORES.ITCD_AVALIACOES);
        const avaliacaoExistente = todasAvaliacoes.find(a => a.declaracao === dbd && a.id !== idAtual);

        if (avaliacaoExistente) {
            const containerId = 'vinculos-itcdAvaliacoesStore-container';
            const jaVinculado = linkedEntities.itcdAvaliacoesStore.has(avaliacaoExistente.id);
            if (!jaVinculado) {
                linkedEntities.itcdAvaliacoesStore.set(avaliacaoExistente.id, null);
                await renderizarChipsDeVinculos();
                uiModuleRef.showToastNotification(`Avaliação encontrada com a mesma DBD (${avaliacaoExistente.tipo}) e vinculada automaticamente.`, "info");
            }
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
        renderFormAvaliacaoRural,
    };
})();