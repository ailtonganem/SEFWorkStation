// js/comunicacaoEmailCompositor.js - Lógica para o Compositor de E-mail
// v2.2.1 - CORRIGIDO: Corrige o TypeError 'replace is not a function' ao tornar a função de renderização assíncrona e aguardar a busca de preferências do usuário. Garante que a variável do remetente seja sempre uma string.
// v2.2.0 - CORREÇÃO: Utiliza a função centralizada EntityConfig.filterActiveItems para garantir que apenas as versões ativas de contatos (Contribuintes, Servidores, etc.) sejam listadas no seletor de destinatários.
// v2.1.2 - CORRIGIDO: Corrige o caminho de acesso aos anexos de origem, evitando o erro 'NotFoundError'.
// v2.1.1 - CORREÇÃO: Utiliza SEFWorkStation.State.getDirectoryHandle() para verificar a pasta da aplicação ao gerar .eml.
// v2.1.0 - Adiciona lógica para vincular e-mails a registros de Servidores e Contribuintes.
// ... (histórico anterior)

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.Comunicacao = window.SEFWorkStation.Comunicacao || {};

window.SEFWorkStation.ComunicacaoEmailCompositor = (function() {
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let navigateToAppViewRef;
    let dbRef;
    let appModuleRef;
    let uiModuleRef;
    let ajudaModuleRef; 

    let compositor_DESTINATARIOS_STORE_NAME;
    let compositor_CONTRIBUINTES_STORE_NAME; 
    let compositor_GRUPOS_DESTINATARIOS_STORE_NAME;
    let compositor_SERVIDORES_STORE_NAME;
    let compositor_GRUPOS_SERVIDORES_STORE_NAME;
    let compositor_EMAILS_GERADOS_STORE_NAME;

    let currentParaPills = [];
    let currentCcPills = [];
    let currentCcoPills = [];
    let todosOsContatosDisponiveisCache = [];

    let feedbackAreaIdCompositor = "feedback-compositor-email";
    const EDITOR_CORPO_EMAIL_ID = 'sef-quill-editor-corpo-email';
    let quillInstance = null;

    let currentDadosOrigem = null;
    let _gerarSalvarEML_func;

    function isValidEmailLocal(email) {
        if (!email || email.trim() === '') return false;
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    }

    function lerArquivoComoBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    }

    function init(
        mainWrapper, showFeedback, clearFeedback, navigateTo, refreshState,
        dbModule, applicationModule, uiModule
    ) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedback;
        globalClearFeedbackRef = clearFeedback;
        navigateToAppViewRef = navigateTo;
        dbRef = dbModule;
        appModuleRef = applicationModule;
        uiModuleRef = uiModule;
        ajudaModuleRef = window.SEFWorkStation.Ajuda; 

        if (dbRef && dbRef.STORES) {
            compositor_DESTINATARIOS_STORE_NAME = dbRef.STORES.COMUNICACAO_DESTINATARIOS;
            compositor_CONTRIBUINTES_STORE_NAME = dbRef.STORES.CONTRIBUINTES;
            compositor_GRUPOS_DESTINATARIOS_STORE_NAME = dbRef.STORES.COMUNICACAO_GRUPOS;
            compositor_SERVIDORES_STORE_NAME = dbRef.STORES.SERVIDORES;
            compositor_GRUPOS_SERVIDORES_STORE_NAME = dbRef.STORES.SERVIDORES_GRUPOS;
            compositor_EMAILS_GERADOS_STORE_NAME = dbRef.STORES.COMUNICACAO_EMAILS_GERADOS;
        } else {
            console.error("ComunicacaoEmailCompositor.JS: Erro crítico - Módulo DB ou suas STORES não estão disponíveis.");
        }
        console.log("ComunicacaoEmailCompositor.JS: Módulo inicializado (v2.2.1).");
    }

    async function resolveRelatedEntities(pillsArrays) {
        const relatedEntitiesMap = new Map();
        const allPills = [].concat(...pillsArrays);
    
        for (const pill of allPills) {
            let type = (pill.tipo || '').toLowerCase();
            let entityId = pill.id;
    
            if ((type === 'servidor' || type === 'contribuinte') && entityId) {
                const key = `${type}-${entityId}`;
                if (!relatedEntitiesMap.has(key)) {
                    relatedEntitiesMap.set(key, { id: entityId, type: type });
                }
                continue; 
            }
    
            if (type === 'grupo serv.' && entityId) {
                try {
                    const grupo = await dbRef.getItemById(compositor_GRUPOS_SERVIDORES_STORE_NAME, entityId);
                    if (grupo && grupo.idsServidoresMembros) {
                        for (const membroId of grupo.idsServidoresMembros) {
                            const key = `servidor-${membroId}`;
                            if (!relatedEntitiesMap.has(key)) {
                                relatedEntitiesMap.set(key, { id: membroId, type: 'servidor' });
                            }
                        }
                    }
                } catch (e) {
                    console.warn(`Erro ao resolver membros do grupo de servidores ID ${entityId}:`, e);
                }
            }
            
            if ((type === 'destinatário' || type === 'manual' || type === 'origem') && pill.email) {
                const emailToFind = pill.email.toLowerCase();
    
                const todosServidores = await dbRef.getAllItems(compositor_SERVIDORES_STORE_NAME);
                const servidoresAtivos = window.SEFWorkStation.EntityConfig.filterActiveItems(todosServidores, compositor_SERVIDORES_STORE_NAME);
                const servidorEncontrado = servidoresAtivos.find(s => s.email && s.email.toLowerCase() === emailToFind);
                if (servidorEncontrado) {
                    const key = `servidor-${servidorEncontrado.id}`;
                    if (!relatedEntitiesMap.has(key)) {
                        relatedEntitiesMap.set(key, { id: servidorEncontrado.id, type: 'servidor' });
                    }
                }
    
                const todosContribuintes = await dbRef.getAllItems(compositor_CONTRIBUINTES_STORE_NAME);
                const contribuintesAtivos = window.SEFWorkStation.EntityConfig.filterActiveItems(todosContribuintes, compositor_CONTRIBUINTES_STORE_NAME);
                const contribuinteEncontrado = contribuintesAtivos.find(c => c.email && c.email.toLowerCase() === emailToFind);
                if (contribuinteEncontrado) {
                    const key = `contribuinte-${contribuinteEncontrado.id}`;
                    if (!relatedEntitiesMap.has(key)) {
                        relatedEntitiesMap.set(key, { id: contribuinteEncontrado.id, type: 'contribuinte' });
                    }
                }
            }
        }
    
        return Array.from(relatedEntitiesMap.values());
    }

    async function carregarTodosOsContatosParaBusca() {
        const contatos = [];
        if (!dbRef || !window.SEFWorkStation.EntityConfig) {
             console.error("ComunicacaoEmailCompositor.JS: dbRef ou EntityConfig não definido ao carregar contatos.");
             return contatos;
        }
        try {
            const allContribuintes = await dbRef.getAllItems(compositor_CONTRIBUINTES_STORE_NAME);
            const contribuintes = window.SEFWorkStation.EntityConfig.filterActiveItems(allContribuintes, compositor_CONTRIBUINTES_STORE_NAME);
            contribuintes.filter(c => c.email && c.email.trim() !== '').forEach(c => contatos.push({ id: c.id, nome: c.nome, email: c.email, tipo: 'Contribuinte', label: `${c.nome} <${c.email}> (Contribuinte)` }));
            
            const allDestinatarios = await dbRef.getAllItems(compositor_DESTINATARIOS_STORE_NAME);
            const destinatarios = window.SEFWorkStation.EntityConfig.filterActiveItems(allDestinatarios, compositor_DESTINATARIOS_STORE_NAME);
            destinatarios.forEach(d => contatos.push({ id: d.id, nome: d.nome, email: d.email, tipo: 'Destinatário', label: `${d.nome} <${d.email}> (Dest.)` }));

            const allGruposDest = await dbRef.getAllItems(compositor_GRUPOS_DESTINATARIOS_STORE_NAME);
            const gruposDest = window.SEFWorkStation.EntityConfig.filterActiveItems(allGruposDest, compositor_GRUPOS_DESTINATARIOS_STORE_NAME);
            gruposDest.forEach(g => contatos.push({ id: g.id, nome: g.nomeGrupo, tipo: 'Grupo Dest.', label: `${g.nomeGrupo} (Grupo Dest.)`, isGrupo: true, membrosDestinatariosIds: g.idsDestinatariosMembros || [], emailsAvulsosMembros: g.emailsAvulsosMembros || [] }));

            const allServidores = await dbRef.getAllItems(compositor_SERVIDORES_STORE_NAME);
            const servidores = window.SEFWorkStation.EntityConfig.filterActiveItems(allServidores, compositor_SERVIDORES_STORE_NAME);
            servidores.filter(s => s.email && s.email.trim() !== '').forEach(s => contatos.push({ id: s.id, nome: s.nome, email: s.email, tipo: 'Servidor', label: `${s.nome} <${s.email}> (Servidor)` }));

            const allGruposServ = await dbRef.getAllItems(compositor_GRUPOS_SERVIDORES_STORE_NAME);
            const gruposServ = window.SEFWorkStation.EntityConfig.filterActiveItems(allGruposServ, compositor_GRUPOS_SERVIDORES_STORE_NAME);
            gruposServ.forEach(g => { 
                contatos.push({
                    id: g.id,
                    nome: g.nomeGrupo,
                    tipo: 'Grupo Serv.',
                    label: `${g.nomeGrupo} (Grupo Serv.)`,
                    isGrupo: true,
                    membrosServidoresIds: g.idsServidoresMembros || [],
                    outrosDestinatarios: g.outrosDestinatarios || [] 
                });
            });
            todosOsContatosDisponiveisCache = contatos.sort((a,b) => (a.label || "").localeCompare(b.label || ""));
        } catch (error) {
            console.error("Erro ao carregar contatos para busca:", error);
            const feedbackEl = document.getElementById(feedbackAreaIdCompositor);
            if (globalShowFeedbackRef && feedbackEl) globalShowFeedbackRef("Falha ao carregar lista de contatos para busca.", "error", feedbackEl);
        }
        return todosOsContatosDisponiveisCache;
    }
    
    function renderPills(containerId, pillsArrayRef, fieldName) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        pillsArrayRef.forEach((pill, index) => {
            const pillEl = document.createElement('span');
            pillEl.className = 'inline-flex items-center px-2 py-0.5 mr-1 mt-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-700 text-blue-800 dark:text-blue-200 pill-item';
            let displayLabel = pill.label || pill.email;
            if (pill.tipo === 'Manual' && !(pill.label || "").includes('@')) {
                 displayLabel = pill.email;
            }
            pillEl.innerHTML = `${displayLabel} <button type="button" class="ml-1.5 inline-flex text-blue-500 dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-100 focus:outline-none" data-index="${index}" data-field="${fieldName}" aria-label="Remover ${displayLabel}">×</button>`;
            pillEl.querySelector('button').addEventListener('click', (e) => {
                const idxToRemove = parseInt(e.currentTarget.dataset.index, 10);
                pillsArrayRef.splice(idxToRemove, 1);
                renderPills(containerId, pillsArrayRef, fieldName);
            });
            container.appendChild(pillEl);
        });
    }

    function addPill(pillData, pillsArrayRef, pillsContainerId, fieldName) {
         const isDuplicate = pillsArrayRef.some(p =>
            (p.id && pillData.id && p.id === pillData.id && p.tipo === pillData.tipo) ||
            (p.tipo === 'Manual' && pillData.tipo === 'Manual' && p.email && pillData.email && p.email.toLowerCase() === pillData.email.toLowerCase())
        );
        if (!isDuplicate) {
            pillsArrayRef.push(pillData);
            renderPills(pillsContainerId, pillsArrayRef, fieldName);
        }
    }

    function setupDestinatarioInput(inputId, pillsContainerId, pillsArrayRef, fieldName) {
        const inputEl = document.getElementById(inputId);
        const suggestionsElId = `${inputId}-suggestions`;
        let suggestionsEl = document.getElementById(suggestionsElId);
        if (!inputEl) { console.error(`Elemento de input ${inputId} não encontrado.`); return; }
        if (!suggestionsEl) {
            suggestionsEl = document.createElement('div');
            suggestionsEl.id = suggestionsElId;
            suggestionsEl.className = 'absolute z-20 w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-lg max-h-48 overflow-y-auto hidden suggestions-dropdown';
            if (inputEl.parentNode) { inputEl.parentNode.style.position = 'relative'; inputEl.parentNode.appendChild(suggestionsEl); }
            else { console.error(`Elemento pai do input ${inputId} não encontrado.`); return; }
        }
        const handleSelection = (contato) => { addPill(contato, pillsArrayRef, pillsContainerId, fieldName); inputEl.value = ''; suggestionsEl.classList.add('hidden'); suggestionsEl.innerHTML = ''; inputEl.focus(); };
        inputEl.addEventListener('input', async () => {
            const termo = inputEl.value.toLowerCase().trim();
            suggestionsEl.innerHTML = '';
            if (termo.length < 1 && !termo.includes('@')) { suggestionsEl.classList.add('hidden'); return; }
            const contatosFiltrados = todosOsContatosDisponiveisCache.filter(c => (c.label && c.label.toLowerCase().includes(termo)) || (c.email && c.email.toLowerCase().includes(termo)));
            if (contatosFiltrados.length > 0) {
                contatosFiltrados.slice(0, 10).forEach(contato => {
                    const itemEl = document.createElement('div');
                    itemEl.className = 'p-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-600 cursor-pointer suggestion-item';
                    itemEl.textContent = contato.label;
                    itemEl.setAttribute('role', 'option'); itemEl.tabIndex = -1;
                    itemEl.addEventListener('mousedown', (e) => { e.preventDefault(); handleSelection(contato); });
                    suggestionsEl.appendChild(itemEl);
                });
                suggestionsEl.classList.remove('hidden');
            } else { suggestionsEl.classList.add('hidden'); }
        });
        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && inputEl.value.trim() !== '') {
                e.preventDefault();
                const emailDigitado = inputEl.value.trim();
                if (isValidEmailLocal(emailDigitado)) {
                    handleSelection({ id: emailDigitado, nome: emailDigitado, email: emailDigitado, tipo: 'Manual', label: emailDigitado });
                } else {
                    const feedbackEl = document.getElementById(feedbackAreaIdCompositor);
                    if (globalShowFeedbackRef && feedbackEl) globalShowFeedbackRef(`"${emailDigitado}" não é um e-mail válido.`, "warning", feedbackEl, 3000);
                    inputEl.value = '';
                    suggestionsEl.classList.add('hidden');
                }
            } else if (e.key === 'Escape') { suggestionsEl.classList.add('hidden'); }
        });
        inputEl.addEventListener('blur', () => { setTimeout(() => { if (!suggestionsEl.matches(':hover')) { suggestionsEl.classList.add('hidden');}}, 150);});
    }


    // ALTERADO: Função agora é async
    async function renderCompositorEmailPage(dadosOrigemParam = null) {
        currentDadosOrigem = dadosOrigemParam ? JSON.parse(JSON.stringify(dadosOrigemParam)) : null;
        currentParaPills = [];
        currentCcPills = [];
        currentCcoPills = [];
        await carregarTodosOsContatosParaBusca();

        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (!mainContentWrapperRef) {
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico ao renderizar compositor de e-mail.", "error");
            return;
        }

        feedbackAreaIdCompositor = `feedback-compositor-email-${Date.now()}`;

        const isEditingEmailGerado = currentDadosOrigem?.isEditingEmailGerado === true;
        let assuntoPreenchido = "";
        if (isEditingEmailGerado) {
            assuntoPreenchido = currentDadosOrigem.assunto || '';
        } else if (currentDadosOrigem) {
            assuntoPreenchido = currentDadosOrigem.assunto ||
                               (currentDadosOrigem.titulo ? `Ref: ${currentDadosOrigem.titulo}` : '') ||
                               (currentDadosOrigem.nome ? `Contato: ${currentDadosOrigem.nome}` : '') ||
                               (currentDadosOrigem.numeroProtocolo ? `Protocolo: ${currentDadosOrigem.numeroProtocolo}` : '') ||
                               (currentDadosOrigem.numeroPTA ? `PTA: ${currentDadosOrigem.numeroPTA}` : '') ||
                               (currentDadosOrigem.numeroAutuacao ? `Autuação: ${currentDadosOrigem.numeroAutuacao}` : '');
        }

        let corpoPreenchido = "";
        if (isEditingEmailGerado) {
            corpoPreenchido = currentDadosOrigem.corpoHtml || '';
        } else if (currentDadosOrigem) {
            if (currentDadosOrigem.corpoHtml) {
                corpoPreenchido = currentDadosOrigem.corpoHtml;
            } else if (currentDadosOrigem.conteudoMarkdown && typeof showdown !== 'undefined') {
                const converter = new showdown.Converter({
                    simplifiedAutoLink: true, strikethrough: true, tables: true, tasklists: true,
                    openLinksInNewWindow: true, emoji: true, ghCompatibleHeaderId: true
                });
                corpoPreenchido = converter.makeHtml(currentDadosOrigem.conteudoMarkdown);
            } else if (currentDadosOrigem.conteudo) {
                corpoPreenchido = `<p>${(currentDadosOrigem.conteudo || '').replace(/\n/g, '<br>')}</p>`;
            } else if (currentDadosOrigem.descricaoDetalhada) {
                corpoPreenchido = `<p>${currentDadosOrigem.descricaoDetalhada.replace(/\n/g, '<br>')}</p>`;
            } else if (currentDadosOrigem.descricao) {
                corpoPreenchido = `<p>${currentDadosOrigem.descricao.replace(/\n/g, '<br>')}</p>`;
            }
        }

        let anexosOrigemListados = [];
         if (isEditingEmailGerado && currentDadosOrigem.anexosRegistrados && Array.isArray(currentDadosOrigem.anexosRegistrados)) {
            anexosOrigemListados = currentDadosOrigem.anexosRegistrados.map(anexo => ({...anexo, selecionado: true }));
        } else if (!isEditingEmailGerado && currentDadosOrigem?.anexos && Array.isArray(currentDadosOrigem.anexos)) {
            anexosOrigemListados = currentDadosOrigem.anexos.map(anexo => ({
                fileName: anexo.fileName,
                filePath: anexo.filePath,
                fileSize: anexo.fileSize,
                id: anexo.id || anexo.fileName,
                ownerType: currentDadosOrigem.origem,
                ownerId: currentDadosOrigem.idEntidadeOrigem,
                selecionado: true
            }));
        }

        // ALTERADO: Busca assíncrona do e-mail padrão.
        let emailRemetentePadrao = "";
        if (appModuleRef && typeof appModuleRef.getUserPreference === 'function') {
            emailRemetentePadrao = (await appModuleRef.getUserPreference('userDefaultEmail')) || "";
        }
        
        const remetentePreenchido = isEditingEmailGerado ? (currentDadosOrigem.remetente || emailRemetentePadrao) : emailRemetentePadrao;

        // CORRIGIDO: Garante que a variável é uma string antes de chamar .replace()
        const valorRemetenteInput = String(remetentePreenchido || '').replace(/"/g, '"');
        
        const pageHtml = `
            <div id="compositor-email-container">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-xl font-semibold">${isEditingEmailGerado ? 'Editar E-mail Gerado' : 'Escrever Novo E-mail'}</h2>
                     <button id="btn-ajuda-compositor-email" class="p-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-300" title="Ajuda sobre o Compositor de E-mail">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-question-circle-fill" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.496 6.033h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286a.237.237 0 0 0 .241.247zm2.325 6.443c.61 0 1.029-.394 1.029-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94 0 .533.425.927 1.01.927z"/></svg>
                    </button>
                </div>
                <div id="${feedbackAreaIdCompositor}" class="mb-4"></div>

                <form id="form-compositor-email" novalidate>
                    <input type="hidden" id="email-gerado-id-hidden" value="${isEditingEmailGerado ? (currentDadosOrigem.idEmailGeradoOriginal || currentDadosOrigem.id) : ''}">

                    <div class="mb-3">
                        <label for="email-remetente" class="block text-sm font-medium text-gray-700 dark:text-gray-300">De (Remetente):</label>
                        <input type="email" id="email-remetente" name="emailRemetente" class="form-input-text mt-1 block w-full" placeholder="seu.email@exemplo.com" value="${valorRemetenteInput}" required>
                    </div>

                    <div class="mb-3">
                        <label for="email-para" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Para:</label>
                        <div id="email-para-selecionados" class="mt-1 mb-1 flex flex-wrap gap-x-1 gap-y-0.5 min-h-[26px] p-1 border border-gray-300 dark:border-slate-500 rounded-md bg-white dark:bg-slate-800/50 focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500"></div>
                        <input type="text" id="email-para" autocomplete="off" class="form-input-text block w-full mt-1" placeholder="Digite e-mail ou nome para buscar...">
                    </div>
                    <div class="mb-3">
                        <label for="email-cc" class="block text-sm font-medium text-gray-700 dark:text-gray-300">CC:</label>
                        <div id="email-cc-selecionados" class="mt-1 mb-1 flex flex-wrap gap-x-1 gap-y-0.5 min-h-[26px] p-1 border border-gray-300 dark:border-slate-500 rounded-md bg-white dark:bg-slate-800/50 focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500"></div>
                        <input type="text" id="email-cc" autocomplete="off" class="form-input-text block w-full mt-1" placeholder="Digite e-mail ou nome para buscar...">
                    </div>
                    <div class="mb-3">
                        <label for="email-cco" class="block text-sm font-medium text-gray-700 dark:text-gray-300">CCO:</label>
                        <div id="email-cco-selecionados" class="mt-1 mb-1 flex flex-wrap gap-x-1 gap-y-0.5 min-h-[26px] p-1 border border-gray-300 dark:border-slate-500 rounded-md bg-white dark:bg-slate-800/50 focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500"></div>
                        <input type="text" id="email-cco" autocomplete="off" class="form-input-text block w-full mt-1" placeholder="Digite e-mail ou nome para buscar...">
                    </div>

                    <div class="mb-3">
                        <label for="email-assunto" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Assunto:</label>
                        <input type="text" id="email-assunto" name="emailAssunto" class="form-input-text mt-1 block w-full" value="${assuntoPreenchido.replace(/"/g, '"')}">
                    </div>
                    
                    <div class="mb-3">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Corpo do E-mail:</label>
                        <div id="${EDITOR_CORPO_EMAIL_ID}" style="min-height: 300px; border: 1px solid var(--input-border-light);" class="mt-1 bg-white dark:bg-slate-800/60 text-gray-800 dark:text-gray-100 quill-editor-styles">
                           </div>
                    </div>
                    
                    <div class="mb-4 p-3 border dark:border-slate-600 rounded-md bg-gray-50 dark:bg-slate-800/70">
                        <label class="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Anexos:</label>
                        <div id="email-anexos-origem-lista" class="space-y-1.5">
                            ${anexosOrigemListados.map((anexo, index) => `
                                <div class="flex items-center justify-between text-xs py-1 px-2 bg-gray-100 dark:bg-slate-700 rounded hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors duration-150">
                                    <label for="anexo-origem-${index}" class="flex items-center cursor-pointer select-none text-gray-700 dark:text-gray-200 truncate" title="${(anexo.fileName || 'Anexo sem nome').replace(/"/g, '"')}">
                                        <input type="checkbox" id="anexo-origem-${index}" name="anexosOrigemSelecionados" 
                                               value="${(anexo.fileName || '').replace(/"/g, '"')}" 
                                               data-path="${(anexo.filePath || '').replace(/"/g, '"')}" 
                                               data-id="${(anexo.id || anexo.filePath || anexo.fileName).replace(/"/g, '"')}" 
                                               data-size="${anexo.fileSize || 0}" 
                                               data-owner-type="${(anexo.ownerType || '').replace(/"/g, '"')}" 
                                               data-owner-id="${(anexo.ownerId || '').replace(/"/g, '"')}" 
                                               class="form-checkbox rounded h-3.5 w-3.5 mr-2 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-slate-800" 
                                               ${anexo.selecionado !== false ? 'checked' : ''}>
                                        <span class="truncate">${anexo.fileName || 'Anexo sem nome'}</span>
                                    </label>
                                    <span class="text-gray-500 dark:text-gray-400 ml-2 whitespace-nowrap">${(anexo.fileSize ? (anexo.fileSize / 1024) : 0).toFixed(1)} KB</span>
                                </div>
                            `).join('') || '<p class="text-xs text-gray-500 dark:text-gray-400 italic">Nenhum anexo da origem.</p>'}
                        </div>
                        <hr class="my-3 dark:border-slate-500">
                        <div>
                            <label for="email-novos-anexos-input" class="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Adicionar novos anexos do seu computador:</label>
                            <input type="file" id="email-novos-anexos-input" multiple class="form-input-file text-sm w-full">
                            <div id="email-novos-anexos-preview" class="mt-2 text-xs space-y-1"></div>
                        </div>
                    </div>

                    <div class="form-actions mt-6">
                        <button type="button" id="btn-cancelar-compositor" class="btn-secondary">Cancelar</button>
                        <button type="submit" id="btn-gerar-email-eml" class="btn-primary">${isEditingEmailGerado ? 'Atualizar e Gerar Novo .eml' : 'Gerar E-mail (.eml)'}</button>
                    </div>
                </form>
            </div>
        `;
        mainContentWrapperRef.innerHTML = pageHtml;

        if (SEFWorkStation.EditorTexto && typeof SEFWorkStation.EditorTexto.criarEditorQuill === 'function') {
            quillInstance = SEFWorkStation.EditorTexto.criarEditorQuill(EDITOR_CORPO_EMAIL_ID, {});
            if (quillInstance && corpoPreenchido) {
                setTimeout(() => {
                    SEFWorkStation.EditorTexto.setConteudoHtml(EDITOR_CORPO_EMAIL_ID, corpoPreenchido);
                }, 100);
            } else if (!quillInstance) {
                 console.error("ComunicacaoEmailCompositor.JS: Falha ao inicializar o editor Quill para o corpo do e-mail.");
                 const editorDiv = document.getElementById(EDITOR_CORPO_EMAIL_ID);
                 if (editorDiv) editorDiv.innerHTML = '<p class="text-red-500 dark:text-red-400">Erro ao carregar editor de texto.</p>';
            }
        } else {
            console.error("ComunicacaoEmailCompositor.JS: Módulo EditorTexto ou sua função criarEditorQuill não encontrados.");
            const editorDiv = document.getElementById(EDITOR_CORPO_EMAIL_ID);
            if (editorDiv) editorDiv.innerHTML = '<p class="text-red-500 dark:text-red-400">Módulo de Editor não carregado corretamente.</p>';
        }

        if (isEditingEmailGerado) {
            (currentDadosOrigem.para || []).forEach(email => addPill({ email, tipo: 'Manual', label: email }, currentParaPills, 'email-para-selecionados', 'para'));
            (currentDadosOrigem.cc || []).forEach(email => addPill({ email, tipo: 'Manual', label: email }, currentCcPills, 'email-cc-selecionados', 'cc'));
            (currentDadosOrigem.cco || []).forEach(email => addPill({ email, tipo: 'Manual', label: email }, currentCcoPills, 'email-cco-selecionados', 'cco'));
        } else {
            if (currentDadosOrigem?.destinatarioEmail) {
                const contribuinteEncontrado = todosOsContatosDisponiveisCache.find(c => c.tipo === 'Contribuinte' && c.email.toLowerCase() === currentDadosOrigem.destinatarioEmail.toLowerCase());
                if (contribuinteEncontrado) {
                    addPill(contribuinteEncontrado, currentParaPills, 'email-para-selecionados', 'para');
                } else {
                    const destLabel = currentDadosOrigem.destinatarioNome ? `${currentDadosOrigem.destinatarioNome} <${currentDadosOrigem.destinatarioEmail}>` : currentDadosOrigem.destinatarioEmail;
                    addPill({ id: currentDadosOrigem.destinatarioEmail, nome: currentDadosOrigem.destinatarioNome || currentDadosOrigem.destinatarioEmail, email: currentDadosOrigem.destinatarioEmail, tipo: 'Origem', label: destLabel }, currentParaPills, 'email-para-selecionados', 'para');
                }
            }
            if (currentDadosOrigem?.servidorEmail) {
                 const servLabel = currentDadosOrigem.servidorNome ? `${currentDadosOrigem.servidorNome} <${currentDadosOrigem.servidorEmail}> (Servidor)` : currentDadosOrigem.servidorEmail;
                 addPill({ id: currentDadosOrigem.servidorId || currentDadosOrigem.servidorEmail, nome: currentDadosOrigem.servidorNome || currentDadosOrigem.servidorEmail, email: currentDadosOrigem.servidorEmail, tipo: 'Servidor', label: servLabel }, currentParaPills, 'email-para-selecionados', 'para');
            }
        }

        addCompositorEventListeners(feedbackAreaIdCompositor, currentDadosOrigem);
    }

    _gerarSalvarEML_func = async function gerarSalvarEML(remetenteEmail, destinatariosParaPills, destinatariosCcPills, destinatariosCcoPills, assunto, corpoHtmlDoQuill, anexosOrigemSelecionados, novosAnexosFiles) {
        const feedbackEl = document.getElementById(feedbackAreaIdCompositor);
        if(globalClearFeedbackRef && feedbackEl) globalClearFeedbackRef(feedbackEl);

        if (!remetenteEmail || !isValidEmailLocal(remetenteEmail)) {
            if(globalShowFeedbackRef && feedbackEl) globalShowFeedbackRef("O campo 'De (Remetente)' deve ser um e-mail válido.", "error", feedbackEl);
            document.getElementById('email-remetente')?.focus();
            return;
        }
        if(globalShowFeedbackRef && feedbackEl) globalShowFeedbackRef("Gerando arquivo .eml...", "info", feedbackEl, 0);

        const idOriginalEmailGerado = document.getElementById('email-gerado-id-hidden')?.value || null;
        const isUpdatingEmailGerado = !!idOriginalEmailGerado;

        try {
            const resolverEmailsPills = async (pillsArray) => {
                const emailsResolvidos = new Set();
                for (const pill of pillsArray) {
                    if (pill.tipo === 'Manual' || pill.tipo === 'Origem' || pill.tipo === 'Servidor' || pill.tipo === 'Destinatário' || pill.tipo === 'Contribuinte') {
                        if (pill.email) emailsResolvidos.add(pill.email.toLowerCase());
                    } else if (pill.isGrupo) {
                        if (pill.tipo === 'Grupo Dest.') {
                            if (pill.membrosDestinatariosIds) { 
                                for (const membroId of pill.membrosDestinatariosIds) { 
                                    const dest = await dbRef.getItemById(compositor_DESTINATARIOS_STORE_NAME, membroId);
                                    if (dest && dest.email && !dest.isDeleted) emailsResolvidos.add(dest.email.toLowerCase());
                                }
                            }
                            if (pill.emailsAvulsosMembros) { 
                                pill.emailsAvulsosMembros.forEach(email => emailsResolvidos.add(email.toLowerCase()));
                            }
                        } else if (pill.tipo === 'Grupo Serv.') {
                           if (pill.membrosServidoresIds) {
                               for (const servidorId of pill.membrosServidoresIds) {
                                   const serv = await dbRef.getItemById(compositor_SERVIDORES_STORE_NAME, servidorId);
                                   if (serv && serv.email && !serv.isDeleted) emailsResolvidos.add(serv.email.toLowerCase());
                               }
                           }
                           if (pill.outrosDestinatarios) {
                                pill.outrosDestinatarios.forEach(email => {
                                    if (isValidEmailLocal(email)) {
                                        emailsResolvidos.add(email.toLowerCase());
                                    }
                                });
                           }
                        }
                    }
                }
                return emailsResolvidos;
            };

            const paraFinaisSet = await resolverEmailsPills(destinatariosParaPills);
            const ccFinaisSet = await resolverEmailsPills(destinatariosCcPills);
            const ccoFinaisSet = await resolverEmailsPills(destinatariosCcoPills);

            if (paraFinaisSet.size === 0 && ccFinaisSet.size === 0 && ccoFinaisSet.size === 0) {
                if(globalShowFeedbackRef && feedbackEl) globalShowFeedbackRef("Pelo menos um destinatário (Para, CC ou CCO) deve ser informado.", "error", feedbackEl);
                return;
            }
            
            const relatedEntities = await resolveRelatedEntities([destinatariosParaPills, destinatariosCcPills, destinatariosCcoPills]);

            const boundary = `----=_Part_SEFWorkStation_${Date.now().toString(36)}`;
            const boundaryAlternative = `----=_AltPart_SEFWorkStation_${Date.now().toString(36)}`;
            let emlContent = `MIME-Version: 1.0\n`;
            emlContent += `X-Unsent: 1\n`;
            emlContent += `From: ${remetenteEmail}\n`;
            const paraHeader = Array.from(paraFinaisSet).join(", ");
            const ccHeader = Array.from(ccFinaisSet).join(", ");
            if (paraHeader) emlContent += `To: ${paraHeader}\n`;
            if (ccHeader) emlContent += `Cc: ${ccHeader}\n`;
            emlContent += `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(assunto)))}?=\n`;
            emlContent += `Date: ${new Date().toUTCString()}\n`;
            emlContent += `Content-Type: multipart/mixed; boundary="${boundary}"\n\n`;
            emlContent += `--${boundary}\nContent-Type: multipart/alternative; boundary="${boundaryAlternative}"\n\n`;
            emlContent += `--${boundaryAlternative}\nContent-Type: text/plain; charset=utf-8\nContent-Transfer-Encoding: base64\n\n`;

            const plainTextBody = (SEFWorkStation.EditorTexto && SEFWorkStation.EditorTexto.getTextoPuro(EDITOR_CORPO_EMAIL_ID))
                                  || corpoHtmlDoQuill.replace(/<[^>]+>/g, '');
            emlContent += `${btoa(unescape(encodeURIComponent(plainTextBody)))}\n\n`;

            emlContent += `--${boundaryAlternative}\nContent-Type: text/html; charset=utf-8\nContent-Transfer-Encoding: base64\n\n`;
            emlContent += `${btoa(unescape(encodeURIComponent(corpoHtmlDoQuill)))}\n\n--${boundaryAlternative}--\n`;

            const anexosParaRegistro = [];
            for (const anexoInfo of anexosOrigemSelecionados) {
                try {
                    const directoryHandle = SEFWorkStation.State.getDirectoryHandle();
                    if (!directoryHandle) throw new Error("Pasta da aplicação não definida para ler anexos da origem.");
                    
                    if (!anexoInfo.filePath) throw new Error(`Caminho do arquivo para "${anexoInfo.fileName}" não definido.`);
                    
                    const pathParts = anexoInfo.filePath.split('/');
                    let currentHandle = directoryHandle; 
                    for (let i = 0; i < pathParts.length - 1; i++) {
                        currentHandle = await currentHandle.getDirectoryHandle(pathParts[i], { create: false });
                    }
                    const fileHandle = await currentHandle.getFileHandle(pathParts[pathParts.length - 1], { create: false });

                    const file = await fileHandle.getFile();
                    const base64Data = await lerArquivoComoBase64(file);
                    emlContent += `\n--${boundary}\n`;
                    emlContent += `Content-Type: ${file.type || 'application/octet-stream'}; name="=?utf-8?B?${btoa(unescape(encodeURIComponent(anexoInfo.fileName)))}?="\n`;
                    emlContent += `Content-Transfer-Encoding: base64\n`;
                    emlContent += `Content-Disposition: attachment; filename="=?utf-8?B?${btoa(unescape(encodeURIComponent(anexoInfo.fileName)))}?="\n\n`;
                    emlContent += `${base64Data.match(/.{1,76}/g)?.join("\n") || ""}\n`;
                    anexosParaRegistro.push({ fileName: anexoInfo.fileName, fileSize: file.size, filePath: anexoInfo.filePath });
                } catch (e) {
                    console.error(`Erro ao processar anexo da origem "${anexoInfo.fileName}":`, e);
                    if(globalShowFeedbackRef && feedbackEl) globalShowFeedbackRef(`Erro ao incluir anexo da origem "${anexoInfo.fileName}": ${e.message}`, "warning", feedbackEl);
                }
            }

            for (const file of novosAnexosFiles) {
                 try {
                    const base64Data = await lerArquivoComoBase64(file);
                    emlContent += `\n--${boundary}\n`;
                    emlContent += `Content-Type: ${file.type || 'application/octet-stream'}; name="=?utf-8?B?${btoa(unescape(encodeURIComponent(file.name)))}?="\n`;
                    emlContent += `Content-Transfer-Encoding: base64\n`;
                    emlContent += `Content-Disposition: attachment; filename="=?utf-8?B?${btoa(unescape(encodeURIComponent(file.name)))}?="\n\n`;
                    emlContent += `${base64Data.match(/.{1,76}/g)?.join("\n") || ""}\n`;
                    anexosParaRegistro.push({ fileName: file.name, fileSize: file.size, filePath: `novo_upload/${file.name}` });
                } catch (e) {
                    console.error(`Erro ao processar novo anexo "${file.name}":`, e);
                     if(globalShowFeedbackRef && feedbackEl) globalShowFeedbackRef(`Erro ao incluir novo anexo "${file.name}": ${e.message}`, "warning", feedbackEl);
                }
            }
            emlContent += `\n--${boundary}--\n`;

            const directoryHandle = SEFWorkStation.State.getDirectoryHandle();
            if (!directoryHandle) { throw new Error("Pasta da aplicação não está selecionada."); }
            const emailDirHandle = await directoryHandle.getDirectoryHandle('email', { create: true });
            const sanitizedAssunto = (assunto || "sem_assunto").replace(/[\\/:*?"<>|#%&{}]/g, '_').substring(0, 100);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const emlFileName = `${sanitizedAssunto}_${timestamp}.eml`;
            const fileHandle = await emailDirHandle.getFileHandle(emlFileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(emlContent);
            await writable.close();

            const emailGeradoRecord = {
                id: isUpdatingEmailGerado ? idOriginalEmailGerado : appModuleRef.generateUUID(),
                remetente: remetenteEmail,
                assunto: assunto,
                dataGeracao: isUpdatingEmailGerado ? (currentDadosOrigem?.dataGeracao || new Date().toISOString()) : new Date().toISOString(),
                dataModificacao: new Date().toISOString(),
                dataEnvioManual: isUpdatingEmailGerado ? currentDadosOrigem?.dataEnvioManual : null,
                para: Array.from(paraFinaisSet),
                cc: Array.from(ccFinaisSet),
                cco: Array.from(ccoFinaisSet),
                corpoHtml: corpoHtmlDoQuill,
                anexosRegistrados: anexosParaRegistro,
                nomeArquivoEML: emlFileName,
                caminhoCompletoEML: `email/${emlFileName}`,
                status: isUpdatingEmailGerado ? currentDadosOrigem?.status : "Gerado",
                idEntidadeOrigem: isUpdatingEmailGerado ? currentDadosOrigem?.idEntidadeOrigem : (currentDadosOrigem?.idEntidadeOrigem || null),
                tipoEntidadeOrigem: isUpdatingEmailGerado ? currentDadosOrigem?.tipoEntidadeOrigem : (currentDadosOrigem?.origem || null),
                previewCorpo: plainTextBody.substring(0, 200) + (plainTextBody.length > 200 ? "..." : ""),
                isDeleted: false,
                relatedEntities: relatedEntities
            };

            let emailGeradoIdParaNavegacao = emailGeradoRecord.id;

            if (isUpdatingEmailGerado) {
                await dbRef.updateItem(compositor_EMAILS_GERADOS_STORE_NAME, emailGeradoRecord);
            } else {
                await dbRef.addItem(compositor_EMAILS_GERADOS_STORE_NAME, emailGeradoRecord);
            }

            const mensagemSucesso = isUpdatingEmailGerado ?
                `E-mail atualizado. Novo arquivo "${emlFileName}" gerado.` :
                `Arquivo "${emlFileName}" gerado. Registro do e-mail criado.`;

            if(globalShowFeedbackRef && feedbackEl) {
                globalClearFeedbackRef(feedbackEl);
                globalShowFeedbackRef(mensagemSucesso, "success", feedbackEl, 4000);
            }

            if (!isUpdatingEmailGerado) {
                document.getElementById('email-assunto').value = '';
                SEFWorkStation.EditorTexto.limparConteudo(EDITOR_CORPO_EMAIL_ID);
                currentParaPills = []; currentCcPills = []; currentCcoPills = [];
                renderPills('email-para-selecionados', currentParaPills, 'para');
                renderPills('email-cc-selecionados', currentCcPills, 'cc');
                renderPills('email-cco-selecionados', currentCcoPills, 'cco');
                document.getElementById('email-novos-anexos-input').value = '';
                document.getElementById('email-novos-anexos-preview').innerHTML = '';
                document.querySelectorAll('input[name="anexosOrigemSelecionados"]').forEach(cb => cb.checked = true);
                currentDadosOrigem = null;
            }
            document.getElementById('email-gerado-id-hidden').value = '';

            if (navigateToAppViewRef && typeof emailGeradoIdParaNavegacao === 'string') {
                navigateToAppViewRef('visualizar-email-gerado', { emailId: emailGeradoIdParaNavegacao });
            }

        } catch (error) {
            console.error("Erro ao gerar/salvar .eml:", error);
            if(globalShowFeedbackRef && feedbackEl) globalShowFeedbackRef(`Erro ao gerar e-mail: ${error.message}`, "error", feedbackEl, 0);
        }
    };


    function addCompositorEventListeners(feedbackAreaIdLocal, dadosOrigemParam) {
        currentDadosOrigem = dadosOrigemParam ? JSON.parse(JSON.stringify(dadosOrigemParam)) : null;
        const form = document.getElementById('form-compositor-email');
        const btnCancelar = document.getElementById('btn-cancelar-compositor');
        const btnAjuda = document.getElementById('btn-ajuda-compositor-email');

        setupDestinatarioInput('email-para', 'email-para-selecionados', currentParaPills, 'para');
        setupDestinatarioInput('email-cc', 'email-cc-selecionados', currentCcPills, 'cc');
        setupDestinatarioInput('email-cco', 'email-cco-selecionados', currentCcoPills, 'cco');

        if (btnCancelar) {
            btnCancelar.addEventListener('click', () => {
                if (quillInstance && SEFWorkStation.EditorTexto.destruirEditor) {
                     SEFWorkStation.EditorTexto.destruirEditor(EDITOR_CORPO_EMAIL_ID);
                }
                quillInstance = null;

                if (currentDadosOrigem?.isEditingEmailGerado && navigateToAppViewRef) {
                    navigateToAppViewRef('visualizar-email-gerado', { emailId: currentDadosOrigem.idEmailGeradoOriginal || currentDadosOrigem.id });
                }
                else if (currentDadosOrigem?.originatingView && navigateToAppViewRef) {
                    let navDataOrigem = {};
                    if (currentDadosOrigem.origem === 'documento') navDataOrigem.docId = currentDadosOrigem.idEntidadeOrigem;
                    else if (currentDadosOrigem.origem === 'contribuinte') navDataOrigem.contribuinteId = currentDadosOrigem.idEntidadeOrigem;
                    else if (currentDadosOrigem.origem === 'recurso') navDataOrigem.recursoId = currentDadosOrigem.idEntidadeOrigem;
                    else if (currentDadosOrigem.origem === 'servidor') navDataOrigem.servidorId = currentDadosOrigem.idEntidadeOrigem;
                    else if (currentDadosOrigem.origem === 'tarefa') navDataOrigem.tarefaId = currentDadosOrigem.idEntidadeOrigem;
                    else if (currentDadosOrigem.origem === 'protocolo') navDataOrigem.protocoloId = currentDadosOrigem.idEntidadeOrigem;
                    else if (currentDadosOrigem.origem === 'pta') navDataOrigem.ptaId = currentDadosOrigem.idEntidadeOrigem;
                    else if (currentDadosOrigem.origem === 'autuacao') navDataOrigem.autuacaoId = currentDadosOrigem.idEntidadeOrigem;
                    else if (currentDadosOrigem.origem === 'notaRapida') navDataOrigem.notaId = currentDadosOrigem.idEntidadeOrigem;
                    else navDataOrigem.id = currentDadosOrigem.idEntidadeOrigem;
                    navigateToAppViewRef(currentDadosOrigem.originatingView, navDataOrigem);
                }
                else if (appModuleRef && appModuleRef.navigateBack) { appModuleRef.navigateBack(); }
                else if (navigateToAppViewRef) { navigateToAppViewRef('gerir-emails-criados'); }
            });
        }

        if (form) {
            form.addEventListener('submit', async (event) => {
                event.preventDefault();

                const remetente = document.getElementById('email-remetente').value.trim();
                const assunto = document.getElementById('email-assunto').value.trim();
                const corpoHtmlDoQuill = SEFWorkStation.EditorTexto.getConteudoHtml(EDITOR_CORPO_EMAIL_ID) || '';

                const feedbackEl = document.getElementById(feedbackAreaIdCompositor);
                if (!remetente || !isValidEmailLocal(remetente)) {
                    if(globalShowFeedbackRef && feedbackEl) globalShowFeedbackRef("O campo 'De (Remetente)' deve ser um e-mail válido.", "error", feedbackEl);
                    document.getElementById('email-remetente')?.focus();
                    return;
                }
                if (currentParaPills.length === 0 && currentCcPills.length === 0 && currentCcoPills.length === 0) {
                    if(globalShowFeedbackRef && feedbackEl) globalShowFeedbackRef("Pelo menos um destinatário (Para, CC ou CCO) deve ser informado.", "error", feedbackEl);
                    document.getElementById('email-para')?.focus();
                    return;
                }
                 if (!assunto) {
                    if(globalShowFeedbackRef && feedbackEl) globalShowFeedbackRef("O campo 'Assunto' é obrigatório.", "warning", feedbackEl);
                    document.getElementById('email-assunto')?.focus();
                    return;
                }
                if (!corpoHtmlDoQuill.trim() || corpoHtmlDoQuill === '<p><br></p>') {
                    if(globalShowFeedbackRef && feedbackEl) globalShowFeedbackRef("O 'Corpo do E-mail' não pode estar vazio.", "warning", feedbackEl);
                    if (quillInstance) SEFWorkStation.EditorTexto.focarEditor(EDITOR_CORPO_EMAIL_ID);
                    return;
                }

                const anexosOrigemSelecionadosInputs = document.querySelectorAll('input[name="anexosOrigemSelecionados"]:checked');
                const anexosOrigemParaGerar = Array.from(anexosOrigemSelecionadosInputs).map(cb => ({
                    fileName: cb.value,
                    filePath: cb.dataset.path,
                    fileSize: parseInt(cb.dataset.size) || 0,
                    id: cb.dataset.id,
                    ownerType: cb.dataset.ownerType,
                    ownerId: cb.dataset.ownerId
                }));

                const novosAnexosInputEl = document.getElementById('email-novos-anexos-input');
                const novosAnexosFiles = novosAnexosInputEl ? Array.from(novosAnexosInputEl.files) : [];

                await _gerarSalvarEML_func(remetente, currentParaPills, currentCcPills, currentCcoPills, assunto, corpoHtmlDoQuill, anexosOrigemParaGerar, novosAnexosFiles);
            });
        }

        const novosAnexosInput = document.getElementById('email-novos-anexos-input');
        const novosAnexosPreview = document.getElementById('email-novos-anexos-preview');
        if(novosAnexosInput && novosAnexosPreview) {
            novosAnexosInput.addEventListener('change', (e) => {
                novosAnexosPreview.innerHTML = '';
                if (e.target.files.length > 0) {
                    const ul = document.createElement('ul');
                    ul.className = 'list-disc list-inside space-y-0.5 text-gray-600 dark:text-gray-300';
                    Array.from(e.target.files).forEach(file => {
                        const li = document.createElement('li');
                        li.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
                        ul.appendChild(li);
                    });
                    novosAnexosPreview.appendChild(ul);
                } else {
                    novosAnexosPreview.innerHTML = '<p class="italic text-gray-500 dark:text-gray-400">Nenhum novo anexo selecionado.</p>';
                }
            });
        }
        
        if (btnAjuda) {
            btnAjuda.addEventListener('click', (e) => {
                e.preventDefault();
                if (ajudaModuleRef && ajudaModuleRef.mostrarTopicoDeAjuda) {
                    ajudaModuleRef.mostrarTopicoDeAjuda('manual-modulo-comunicacao', 'comunic-compositor');
                }
            });
        }
    }


    return {
        init,
        renderCompositorEmailPage
    };
})();