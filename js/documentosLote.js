// js/documentosLote.js - Lógica para Criação de Documentos em Lote
// v1.3.3 - CORREÇÃO: Adiciona placeholders de Inscrição Estadual e Telefone na função de substituição.
// v1.3.2 - REFATORADO: Utiliza a constante centralizada de placeholders de EntityConfig.
// v1.3.1 - Adiciona ícone de ajuda contextual.
// v1.3.0 - Remove classe page-section para expandir a largura da visualização.
// v1.2.1 - CORREÇÃO: Simplifica busca do placeholder de endereço para usar dadosContribuinte.endereco.
// v1.2 - CORREÇÃO: Adiciona EMAIL e ENDERECO aos placeholders padrão do sistema e ajusta substituição.
// v1.1 - Adiciona ícone de ajuda contextual.
// v1.0 - Estrutura inicial e funcionalidade básica.

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.DocumentosLote = (function() {
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let refreshApplicationStateRef;
    let dbRef;
    let appModuleRef;
    let ajudaModuleRef; 

    const DOCUMENTS_STORE_NAME = 'documents';
    const CONTRIBUINTES_STORE_NAME = 'contribuintes';
    const CONTRIBUINTES_PLACEHOLDERS_STORE_NAME = 'contribuintesPlaceholdersStore';
    const LOTES_DE_DOCUMENTOS_STORE_NAME = 'lotesDeDocumentosStore';
    const DOCUMENT_CATEGORIES_STORE_NAME = 'documentCategories';
    const DOCUMENT_TAGS_STORE_NAME = 'documentTags';
    const CONTRIBUINTE_CATEGORIES_STORE_NAME = 'contribuinteCategories';
    const CONTRIBUINTE_TAGS_STORE_NAME = 'contribuinteTags';

    const PLACEHOLDER_DETECTION_REGEX = /\{\{([A-Z0-9_]+)\}\}/g;
    let placeholdersDeContribuinteMapeadosCache = [];
    let placeholdersDetectadosNoModeloCache = [];
    let placeholdersMarcadosComoVariaveis = new Set();
    let dadosVariaveisColetados = {};

    let todasCategoriasDocSistemaCache = [];
    let todasTagsDocSistemaCache = [];
    let currentSelectedCategoriasPadraoLote = [];
    let currentSelectedTagsPadraoLote = [];


    function init(mainWrapper, showFeedbackFunc, clearFeedbackFunc, refreshFunc, dbModuleRef, applicationModuleRef) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedbackFunc;
        globalClearFeedbackRef = clearFeedbackFunc;
        refreshApplicationStateRef = refreshFunc;
        dbRef = dbModuleRef;
        appModuleRef = applicationModuleRef;
        ajudaModuleRef = SEFWorkStation.Ajuda; 


        if (!dbRef) console.error("DocumentosLote.JS: init - Referência ao DB não fornecida!");
        if (!mainContentWrapperRef) console.error("DocumentosLote.JS: init - mainContentWrapperRef não fornecido.");
        if (!appModuleRef) console.error("DocumentosLote.JS: init - appModuleRef não fornecido.");
        if (!ajudaModuleRef) console.warn("DocumentosLote.JS: init - ajudaModuleRef não disponível.");
        console.log("DocumentosLote.JS: Módulo inicializado (v1.3.3).");
    }

    async function buscarModelosElegiveis() {
        if (!dbRef) return [];
        try {
            const todosDocumentos = await dbRef.getAllItems(DOCUMENTS_STORE_NAME);
            placeholdersDeContribuinteMapeadosCache = await dbRef.getAllItems(CONTRIBUINTES_PLACEHOLDERS_STORE_NAME);
            
            return todosDocumentos.filter(doc => doc.isTemplate && !doc.isDeleted).sort((a,b) => (a.title || "").localeCompare(b.title || ""));
        } catch (error) {
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro ao carregar modelos para geração em lote.", "error");
            return [];
        }
    }

    async function buscarContribuintesFiltrados(filtros) {
        if (!dbRef) return [];
        try {
            let contribuintes = await dbRef.getAllItems(CONTRIBUINTES_STORE_NAME);
            contribuintes = contribuintes.filter(c => !c.isDeleted);

            if (filtros.termo) {
                const termoLower = filtros.termo.toLowerCase();
                contribuintes = contribuintes.filter(c => 
                    (c.nome && c.nome.toLowerCase().includes(termoLower)) ||
                    (c.numeroIdentificacao && c.numeroIdentificacao.toLowerCase().includes(termoLower)) ||
                    (c.cpfCnpj && c.cpfCnpj.includes(termoLower))
                );
            }
            if (filtros.categoria) {
                contribuintes = contribuintes.filter(c => c.categories && c.categories.includes(filtros.categoria));
            }
            if (filtros.tag) {
                contribuintes = contribuintes.filter(c => c.tags && c.tags.includes(filtros.tag));
            }
            return contribuintes.sort((a,b) => (a.nome || "").localeCompare(b.nome || ""));
        } catch (error) {
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro ao carregar lista de contribuintes.", "error");
            return [];
        }
    }
    
    function getNestedValue(obj, path) {
        if (!obj || !path) return '';
        const parts = path.split('.');
        let current = obj;
        for (let i = 0; i < parts.length; i++) {
            if (current && typeof current === 'object' && parts[i] in current) {
                current = current[parts[i]];
            } else {
                return ''; 
            }
        }
        return current !== null && current !== undefined ? String(current) : '';
    }

    function substituirPlaceholders(texto, dadosContribuinte, placeholdersMapeadosContrib, dadosVariaveisLote = {}, placeholdersVariaveisDefinidos = new Set()) {
        if (texto === null || texto === undefined) return '';
        let textoProcessado = String(texto);
    
        if (dadosContribuinte) {
            const placeholdersPadraoSistemaValores = {
                'NOME': dadosContribuinte.nome || `{{NOME}}`,
                'CPF_CNPJ': dadosContribuinte.cpfCnpj || `{{CPF_CNPJ}}`,
                'EMAIL': dadosContribuinte.email || `{{EMAIL}}`,
                'ENDERECO': dadosContribuinte.endereco || `{{ENDERECO}}`,
                'NUMERO_IDENTIFICACAO': dadosContribuinte.numeroIdentificacao || `{{NUMERO_IDENTIFICACAO}}`,
                'INSCRICAO_ESTADUAL': dadosContribuinte.inscricaoEstadual || `{{INSCRICAO_ESTADUAL}}`, // CORREÇÃO ADICIONADA
                'TELEFONE': dadosContribuinte.telefone || `{{TELEFONE}}`,                         // CORREÇÃO ADICIONADA
                'CONTATO': dadosContribuinte.contatoPrincipal?.valor || dadosContribuinte.telefone || `{{CONTATO}}`
            };
    
            for (const phNomePadrao in placeholdersPadraoSistemaValores) {
                const phRegex = new RegExp(`\\{\\{${phNomePadrao}\\}\\}`, 'g');
                textoProcessado = textoProcessado.replace(phRegex, placeholdersPadraoSistemaValores[phNomePadrao]);
            }
        }
    
        if (dadosContribuinte && placeholdersMapeadosContrib) {
            placeholdersMapeadosContrib.forEach(ph => {
                if (!window.SEFWorkStation.EntityConfig.PLACEHOLDERS_PADRAO_SISTEMA.includes(ph.nomePlaceholderNormalizado) && !placeholdersVariaveisDefinidos.has(ph.nomePlaceholderNormalizado)) {
                    const placeholderRegex = new RegExp(`\\{\\{${ph.nomePlaceholderNormalizado}\\}\\}`, 'g');
                    const valorCampo = getNestedValue(dadosContribuinte, ph.campoContribuinte);
                    const valorSubstituicao = valorCampo !== null && valorCampo !== undefined && String(valorCampo).trim() !== '' ? String(valorCampo) : `{{${ph.nomePlaceholderNormalizado}}}`;
                    textoProcessado = textoProcessado.replace(placeholderRegex, valorSubstituicao);
                }
            });
        }
    
        placeholdersVariaveisDefinidos.forEach(phNomeVariavel => {
            const placeholderRegexVariavel = new RegExp(`\\{\\{${phNomeVariavel}\\}\\}`, 'g');
            if (dadosVariaveisLote && dadosVariaveisColetados.hasOwnProperty(phNomeVariavel)) {
                const valorVariavel = dadosVariaveisColetados[phNomeVariavel];
                if (valorVariavel !== undefined && valorVariavel !== null && String(valorVariavel).trim() !== '') {
                    textoProcessado = textoProcessado.replace(placeholderRegexVariavel, String(valorVariavel));
                }
            }
        });
        return textoProcessado;
    }
    
    async function analisarEMostrarPlaceholdersDoModelo(modeloId) {
        const container = document.getElementById('placeholders-variaveis-container');
        const tabelaVariaveisContainer = document.getElementById('tabela-dados-variaveis-lote-container');
        placeholdersDetectadosNoModeloCache = [];

        if (!container) return;
        container.innerHTML = '<p class="text-xs text-gray-500 dark:text-gray-400">Analisando modelo...</p>';
        if (tabelaVariaveisContainer) tabelaVariaveisContainer.classList.add('hidden');

        if (!modeloId) {
            container.innerHTML = '<p class="text-xs text-gray-500 dark:text-gray-400">Selecione um modelo para ver os placeholders.</p>';
            renderizarTabelaDadosVariaveis([]); 
            return;
        }
    
        try {
            const modelo = await dbRef.getItemById(DOCUMENTS_STORE_NAME, modeloId);
            if (!modelo) {
                container.innerHTML = '<p class="text-xs text-red-500 dark:text-red-400">Modelo não encontrado.</p>';
                return;
            }
    
            const textoCompletoModelo = `${modelo.title || ''} ${modelo.content || ''}`;
            const matches = new Set();
            let match;
            PLACEHOLDER_DETECTION_REGEX.lastIndex = 0;
            while ((match = PLACEHOLDER_DETECTION_REGEX.exec(textoCompletoModelo)) !== null) {
                matches.add(match[1]);
            }
    
            placeholdersDetectadosNoModeloCache = Array.from(matches);
    
            if (placeholdersDetectadosNoModeloCache.length === 0) {
                container.innerHTML = '<p class="text-xs text-gray-500 dark:text-gray-400">Nenhum placeholder (ex: {{NOME}}) encontrado neste modelo.</p>';
                renderizarTabelaDadosVariaveis([]);
                return;
            }
    
            let htmlPlaceholders = '<h4 class="text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Placeholders Encontrados no Modelo:</h4>';
            htmlPlaceholders += '<div class="space-y-1 max-h-32 overflow-y-auto border dark:border-slate-600 p-2 rounded-md">';
            let algumPlaceholderDisponivelParaVariar = false;
            
            placeholdersDetectadosNoModeloCache.forEach(phNome => {
                const isPadrao = window.SEFWorkStation.EntityConfig.PLACEHOLDERS_PADRAO_SISTEMA.includes(phNome);
                const phMapeadoComoContribPersonalizado = !isPadrao ? placeholdersDeContribuinteMapeadosCache.find(p => p.nomePlaceholderNormalizado === phNome) : null;
                const isCheckedComoVariavel = placeholdersMarcadosComoVariaveis.has(phNome);

                if (isPadrao) {
                    htmlPlaceholders += `
                        <div class="flex items-center text-xs text-blue-700 dark:text-blue-400 py-0.5" title="Preenchido automaticamente pelo sistema (campo '${phNome.toLowerCase().replace('_', '')}' do contribuinte).">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-gear-fill mr-1.5 flex-shrink-0" viewBox="0 0 16 16"><path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311a1.464 1.464 0 0 1-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698-2.686-.705-1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872 2.105l-.34-.1c1.4-.413-1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872l-.1-.34zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z"/></svg>
                            <span class="ml-1 font-medium">{{${phNome}}}</span>
                            <span class="text-gray-500 dark:text-gray-400 ml-1">(Automático: Sistema)</span>
                        </div>
                    `;
                } else if (phMapeadoComoContribPersonalizado) {
                    htmlPlaceholders += `
                        <div class="flex items-center text-xs text-green-700 dark:text-green-400 py-0.5" title="Preenchido automaticamente pelo campo '${phMapeadoComoContribPersonalizado.campoContribuinte || 'N/A'}' do contribuinte (configurado em 'Gerir Placeholders').">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-check-circle-fill mr-1.5 flex-shrink-0" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/></svg>
                            <span class="ml-1 font-medium">{{${phNome}}}</span>
                            <span class="text-gray-500 dark:text-gray-400 ml-1">(Automático: Contribuinte - ${phMapeadoComoContribPersonalizado.campoContribuinte})</span>
                        </div>
                    `;
                } else {
                    algumPlaceholderDisponivelParaVariar = true;
                    htmlPlaceholders += `
                        <label class="flex items-center text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 p-0.5 rounded" title="Marcar para fornecer dados específicos para este placeholder para cada contribuinte na tabela abaixo.">
                            <input type="checkbox" class="form-checkbox rounded text-blue-600 h-3.5 w-3.5 placeholder-variavel-checkbox" value="${phNome}" ${isCheckedComoVariavel ? 'checked' : ''}>
                            <span class="ml-2 text-gray-700 dark:text-gray-300">{{${phNome}}}</span>
                             <span class="text-amber-600 dark:text-amber-400 ml-1">(Não mapeado - pode ser variável)</span>
                        </label>
                    `;
                }
            });
            htmlPlaceholders += '</div>';

            const placeholdersQueSeraoMantidos = placeholdersDetectadosNoModeloCache.filter(phNome =>
                !window.SEFWorkStation.EntityConfig.PLACEHOLDERS_PADRAO_SISTEMA.includes(phNome) &&
                !placeholdersDeContribuinteMapeadosCache.find(p => p.nomePlaceholderNormalizado === phNome) &&
                !placeholdersMarcadosComoVariaveis.has(phNome)
            );

            if (placeholdersQueSeraoMantidos.length > 0) {
                 htmlPlaceholders += `<p class="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-start">
                                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-exclamation-triangle-fill mr-1 flex-shrink-0 mt-0.5" viewBox="0 0 16 16">
                                            <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                                          </svg>
                                          <span>Os seguintes placeholders podem não ser substituídos automaticamente e não foram marcados como variáveis: 
                                            ${placeholdersQueSeraoMantidos.map(ph => `<code>{{${ph}}}</code>`).join(', ')}. 
                                            Eles permanecerão como estão nos documentos gerados, a menos que você os marque como variáveis e forneça dados para eles.
                                          </span>
                                       </p>`;
            }

            if (!algumPlaceholderDisponivelParaVariar && placeholdersDetectadosNoModeloCache.every(ph => window.SEFWorkStation.EntityConfig.PLACEHOLDERS_PADRAO_SISTEMA.includes(ph) || placeholdersDeContribuinteMapeadosCache.find(p => p.nomePlaceholderNormalizado === ph))) {
                container.innerHTML = '<p class="text-xs text-gray-500 dark:text-gray-400">Todos os placeholders neste modelo são preenchidos automaticamente (pelo sistema ou por placeholders de contribuinte já mapeados).</p>';
            } else {
                container.innerHTML = htmlPlaceholders;
                container.querySelectorAll('.placeholder-variavel-checkbox').forEach(cb => {
                    cb.addEventListener('change', (e) => {
                        if (e.target.checked) {
                            placeholdersMarcadosComoVariaveis.add(e.target.value);
                        } else {
                            placeholdersMarcadosComoVariaveis.delete(e.target.value);
                            for (const contribId in dadosVariaveisColetados) {
                                if (dadosVariaveisColetados[contribId]) {
                                    delete dadosVariaveisColetados[contribId][e.target.value];
                                }
                            }
                        }
                        analisarEMostrarPlaceholdersDoModelo(modeloId); 
                    });
                });
            }
            const contribsSelecionados = Array.from(document.querySelectorAll('.contrib-checkbox-lote:checked')).map(c => c.value);
            renderizarTabelaDadosVariaveis(contribsSelecionados);
            document.getElementById('form-criar-lote').dispatchEvent(new Event('change', { bubbles: true }));
        } catch (error) {
            container.innerHTML = '<p class="text-xs text-red-500 dark:text-red-400">Erro ao analisar placeholders do modelo.</p>';
        }
    }

    async function renderizarTabelaDadosVariaveis(contribuintesSelecionadosIds) {
        const tabelaContainer = document.getElementById('tabela-dados-variaveis-lote-container');
        if (!tabelaContainer) return;
    
        tabelaContainer.innerHTML = '';
        if (placeholdersMarcadosComoVariaveis.size === 0 || contribuintesSelecionadosIds.length === 0) {
            tabelaContainer.classList.add('hidden');
            return;
        }
    
        tabelaContainer.classList.remove('hidden');
        let tabelaHtml = '<h4 class="text-sm font-medium mt-3 mb-2 text-gray-700 dark:text-gray-300">Insira os Dados Variáveis por Contribuinte:</h4>';
        tabelaHtml += '<div class="overflow-x-auto">';
        tabelaHtml += '<table class="min-w-full text-xs border dark:border-slate-600">';
        tabelaHtml += '<thead class="bg-gray-100 dark:bg-slate-700"><tr>';
        tabelaHtml += '<th class="p-1.5 border-b dark:border-slate-600 text-left text-gray-600 dark:text-gray-300 sticky left-0 bg-gray-100 dark:bg-slate-700 z-10">Contribuinte</th>';
        placeholdersMarcadosComoVariaveis.forEach(phNome => {
            tabelaHtml += `<th class="p-1.5 border-b dark:border-slate-600 text-left text-gray-600 dark:text-gray-300 min-w-[150px]">{{${phNome}}}</th>`;
        });
        tabelaHtml += '</tr></thead><tbody>';
    
        for (const contribId of contribuintesSelecionadosIds) {
            try {
                const contribuinte = await dbRef.getItemById(CONTRIBUINTES_STORE_NAME, contribId);
                if (contribuinte) {
                    tabelaHtml += `<tr class="border-b dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700/30 group">`;
                    tabelaHtml += `<td class="p-1.5 whitespace-nowrap text-gray-700 dark:text-gray-200 sticky left-0 bg-white dark:bg-slate-800 group-hover:bg-gray-50 dark:group-hover:bg-slate-700/30 z-10">${contribuinte.nome || `ID ${contribId}`}</td>`;
                    placeholdersMarcadosComoVariaveis.forEach(phNome => {
                        const valorSalvo = (dadosVariaveisColetados[contribId] && dadosVariaveisColetados[contribId][phNome]) ? dadosVariaveisColetados[contribId][phNome] : '';
                        tabelaHtml += `<td class="p-1"><input type="text" class="form-input-text w-full text-xs p-1 dado-variavel-input" data-contrib-id="${contribId}" data-ph-nome="${phNome}" value="${valorSalvo.replace(/"/g, '"')}"></td>`;
                    });
                    tabelaHtml += `</tr>`;
                }
            } catch(e) { /* ignora */ }
        }
        tabelaHtml += '</tbody></table></div>';
        tabelaContainer.innerHTML = tabelaHtml;
    
        tabelaContainer.querySelectorAll('.dado-variavel-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const cId = e.target.dataset.contribId;
                const ph = e.target.dataset.phNome;
                if (!dadosVariaveisColetados[cId]) {
                    dadosVariaveisColetados[cId] = {};
                }
                dadosVariaveisColetados[cId][ph] = e.target.value;
            });
             input.addEventListener('input', (e) => { 
                const cId = e.target.dataset.contribId;
                const ph = e.target.dataset.phNome;
                if (!dadosVariaveisColetados[cId]) {
                    dadosVariaveisColetados[cId] = {};
                }
                dadosVariaveisColetados[cId][ph] = e.target.value;
            });
        });
    }
    
    // O restante do arquivo (funções renderPaginaCriarDocumentosLote e addEventListenersPaginaCriarLote) foi omitido por não ter sido alterado.
    // Cole aqui o restante do conteúdo original do arquivo 'documentosLote.js'.
    async function renderPaginaCriarDocumentosLote() {
        if (globalClearFeedbackRef) globalClearFeedbackRef();
        if (!mainContentWrapperRef) {
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico ao tentar renderizar a página de criação em lote.", "error");
            return;
        }
        mainContentWrapperRef.innerHTML = `<div id="criar-documentos-lote-container"><p class="loading-text p-4">Carregando interface de criação em lote...</p></div>`;
        
        const feedbackAreaId = "feedback-criar-lote";
        const container = document.getElementById('criar-documentos-lote-container');
        placeholdersMarcadosComoVariaveis.clear();
        dadosVariaveisColetados = {};
        currentSelectedCategoriasPadraoLote = [];
        currentSelectedTagsPadraoLote = [];

        const [modelosElegiveis, todosContribuintes, todasCatDocDB, todasTagsDocDB, todasCategoriasContrib, todasTagsContrib] = await Promise.all([
            buscarModelosElegiveis(),
            buscarContribuintesFiltrados({}),
            dbRef.getAllItems(DOCUMENT_CATEGORIES_STORE_NAME),
            dbRef.getAllItems(DOCUMENT_TAGS_STORE_NAME),
            dbRef.getAllItems(CONTRIBUINTE_CATEGORIES_STORE_NAME),
            dbRef.getAllItems(CONTRIBUINTE_TAGS_STORE_NAME)
        ]);
        todasCategoriasDocSistemaCache = todasCatDocDB.sort((a,b) => a.name.localeCompare(b.name));
        todasTagsDocSistemaCache = todasTagsDocDB.sort((a,b) => a.name.localeCompare(b.name));

        let modelosOptionsHtml = '<option value="">Selecione um modelo...</option>';
        if (modelosElegiveis.length > 0) {
            modelosOptionsHtml += modelosElegiveis.map(m => `<option value="${m.id}">${m.title || `Modelo ID ${m.id}`}</option>`).join('');
        } else {
            modelosOptionsHtml = '<option value="">Nenhum modelo elegível encontrado</option>';
        }

        const categoriasContribOptionsHtml = todasCategoriasContrib.sort((a,b) => a.name.localeCompare(b.name)).map(c => `<option value="${c.name}">${SEFWorkStation.ContribuintesCategorias.formatCategoryNameForDisplay(c.name)}</option>`).join('');
        const tagsContribOptionsHtml = todasTagsContrib.sort((a,b) => a.name.localeCompare(b.name)).map(t => `<option value="${t.name}">${t.name}</option>`).join('');
        
        const pageHtml = `
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-semibold">Criar Documentos em Lote</h2>
                <button type="button" id="ajuda-documentos-lote" class="p-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-300" title="Ajuda sobre Criação de Documentos em Lote">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-question-circle-fill" viewBox="0 0 16 16">
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.496 6.033h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286a.237.237 0 0 0 .241.247zm2.325 6.443c.61 0 1.029-.394 1.029-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94 0 .533.425.927 1.01.927z"/>
                    </svg>
                </button>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-300 mb-6">
                Selecione um modelo, configure os documentos, escolha os contribuintes e forneça dados variáveis se necessário.
            </p>
            <div id="${feedbackAreaId}" class="mb-4"></div>

            <form id="form-criar-lote">
                <div class="section-box p-4 mb-6 border dark:border-slate-700 rounded-lg">
                    <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100">1. Seleção do Modelo e Placeholders Variáveis</h3>
                    <label for="modelo-lote-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Modelo de Documento:</label>
                    <select id="modelo-lote-select" name="modeloId" class="form-input-text mt-1 block w-full" required ${modelosElegiveis.length === 0 ? 'disabled' : ''}>
                        ${modelosOptionsHtml}
                    </select>
                    ${modelosElegiveis.length === 0 ? '<p class="text-xs text-red-500 dark:text-red-400 mt-1">Crie modelos com placeholders (ex: {{NOME_CLIENTE}}, {{QUALQUER_COISA_LOTE}}) para usá-los aqui. Placeholders de contribuinte são gerenciados em "Contribuintes > Gerir Placeholders".</p>' : ''}
                    <div id="placeholders-variaveis-container" class="mt-3 text-sm"></div>
                </div>

                <div id="tabela-dados-variaveis-lote-container" class="mb-6 section-box p-4 border dark:border-slate-700 rounded-lg hidden"></div>

                <div class="section-box p-4 mb-6 border dark:border-slate-700 rounded-lg">
                    <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100">2. Configurações dos Documentos Gerados</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label for="lote-padrao-titulo" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Padrão para Título:</label>
                            <select id="lote-padrao-titulo" name="padraoTitulo" class="form-input-text mt-1 block w-full">
                                <option value="MODELO_CONTRIBUINTE">[Título do Modelo] - [Nome do Contribuinte]</option>
                                <option value="CONTRIBUINTE_MODELO">[Nome do Contribuinte] - [Título do Modelo]</option>
                                <option value="MODELO_DATA">[Título do Modelo] - {{DATA_ATUAL}}</option>
                                <option value="CONTRIBUINTE_DATA">[Nome do Contribuinte] - {{DATA_ATUAL}}</option>
                                <option value="REFERENCIA_CONTRIBUINTE_MODELO">[Ref. Contribuinte] - [Título do Modelo]</option>
                                <option value="MODELO_REFERENCIA_CONTRIBUINTE">[Título do Modelo] - [Ref. Contribuinte]</option>
                            </select>
                        </div>
                        <div>
                            <label for="nome-lote-opcional" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome para este Lote (Opcional):</label>
                            <input type="text" id="nome-lote-opcional" name="nomeLote" class="form-input-text mt-1 block w-full" placeholder="Ex: Contratos Maio 2025">
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div class="mb-4 relative">
                            <label for="lote-categorias-padrao-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Categorias Padrão (Documentos):</label>
                            <input type="text" id="lote-categorias-padrao-input" class="form-input-text mt-1 block w-full" placeholder="Digite para filtrar ou criar nova categoria">
                            <div id="lote-categorias-padrao-sugestoes" class="absolute z-10 w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-500 rounded-md shadow-lg mt-1 hidden max-h-40 overflow-y-auto"></div>
                            <div id="lote-categorias-padrao-selecionadas" class="mt-2 flex flex-wrap gap-2"></div>
                        </div>
                        <div class="mb-4 relative">
                            <label for="lote-tags-padrao-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Tags Padrão (Documentos):</label>
                            <input type="text" id="lote-tags-padrao-input" class="form-input-text mt-1 block w-full" placeholder="Digite tags (Enter ou vírgula para adicionar/criar nova)">
                            <div id="lote-tags-padrao-sugestoes" class="absolute z-10 w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-500 rounded-md shadow-lg mt-1 hidden max-h-40 overflow-y-auto"></div>
                            <div id="lote-tags-padrao-selecionadas" class="mt-2 flex flex-wrap gap-2"></div>
                        </div>
                    </div>
                </div>

                <div class="section-box p-4 mb-6 border dark:border-slate-700 rounded-lg">
                    <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100">3. Seleção de Contribuintes</h3>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        <div>
                            <label for="filtro-contrib-texto-lote" class="block text-xs font-medium text-gray-700 dark:text-gray-300">Buscar por Nome/ID/CPF-CNPJ:</label>
                            <input type="search" id="filtro-contrib-texto-lote" class="form-input-text mt-1 block w-full text-sm" placeholder="Filtrar...">
                        </div>
                        <div>
                            <label for="filtro-contrib-categoria-lote" class="block text-xs font-medium text-gray-700 dark:text-gray-300">Filtrar por Categoria:</label>
                            <select id="filtro-contrib-categoria-lote" class="form-input-text mt-1 block w-full text-sm">
                                <option value="">Todas as Categorias</option>
                                ${categoriasContribOptionsHtml}
                            </select>
                        </div>
                        <div>
                            <label for="filtro-contrib-tag-lote" class="block text-xs font-medium text-gray-700 dark:text-gray-300">Filtrar por Tag:</label>
                            <select id="filtro-contrib-tag-lote" class="form-input-text mt-1 block w-full text-sm">
                                <option value="">Todas as Tags</option>
                                ${tagsContribOptionsHtml}
                            </select>
                        </div>
                    </div>
                    <div id="container-lista-contribuintes-lote" class="form-checkbox-group max-h-60 overflow-y-auto">
                        ${todosContribuintes.length === 0 ? '<p class="text-sm text-gray-500 dark:text-gray-400 p-2">Nenhum contribuinte cadastrado.</p>' : ''}
                    </div>
                    <label class="inline-flex items-center mt-2">
                        <input type="checkbox" id="selecionar-todos-contribuintes" class="form-checkbox rounded text-blue-600">
                        <span class="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Selecionar Todos Visíveis / Desmarcar Todos</span>
                    </label>
                </div>
                
                <div class="section-box p-4 mb-6 border dark:border-slate-700 rounded-lg">
                    <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100">4. Opções Finais</h3>
                     <label class="flex items-center text-sm">
                        <input type="checkbox" id="lote-exibir-links" class="form-checkbox rounded text-blue-600 h-4 w-4">
                        <span class="ml-2 text-gray-700 dark:text-gray-300">Exibir links para os documentos gerados após a conclusão.</span>
                    </label>
                </div>

                <div id="resumo-geracao-lote" class="mb-4 p-3 bg-blue-50 dark:bg-slate-700/60 border border-blue-200 dark:border-slate-600 rounded-md hidden">
                    <h4 class="font-semibold text-sm mb-1 text-blue-700 dark:text-blue-300">Resumo da Geração:</h4>
                    <p class="text-xs text-gray-700 dark:text-gray-200">Modelo: <span id="resumo-modelo" class="font-medium"></span></p>
                    <p class="text-xs text-gray-700 dark:text-gray-200">Contribuintes selecionados: <span id="resumo-contrib-count" class="font-medium">0</span></p>
                    <p class="text-xs text-gray-700 dark:text-gray-200">Total de documentos a serem gerados: <span id="resumo-docs-count" class="font-medium">0</span></p>
                </div>

                <div class="form-actions">
                    <button type="button" id="btn-cancelar-lote" class="btn-secondary">Cancelar</button>
                    <button type="submit" id="btn-gerar-lote" class="btn-primary" ${modelosElegiveis.length === 0 || todosContribuintes.length === 0 ? 'disabled' : ''}>
                        Gerar Documentos em Lote
                    </button>
                </div>
            </form>
            <div id="progresso-lote-container" class="mt-6 hidden">
                <h3 class="text-md font-semibold mb-2">Progresso da Geração:</h3>
                <div class="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
                    <div id="barra-progresso-lote" class="bg-blue-600 h-2.5 rounded-full" style="width: 0%"></div>
                </div>
                <p id="status-progresso-lote" class="text-sm text-gray-600 dark:text-gray-300 mt-2"></p>
                <ul id="log-geracao-lote" class="list-disc list-inside text-xs mt-2 max-h-40 overflow-y-auto bg-gray-100 dark:bg-slate-700 p-2 rounded"></ul>
            </div>
        `;
        container.innerHTML = pageHtml;

        addEventListenersPaginaCriarLote(document.getElementById(feedbackAreaId), todosContribuintes);
        setupCategorySelectionForLotePadrao(feedbackAreaId);
        setupTagSelectionForLotePadrao(feedbackAreaId);
    }
    
    function addEventListenersPaginaCriarLote(feedbackAreaEl, contribuintesParaFiltrar) {
        const form = document.getElementById('form-criar-lote');
        const btnCancelar = document.getElementById('btn-cancelar-lote');
        const btnGerarLote = document.getElementById('btn-gerar-lote');
        
        const filtroTextoContrib = document.getElementById('filtro-contrib-texto-lote');
        const filtroCategoriaContrib = document.getElementById('filtro-contrib-categoria-lote');
        const filtroTagContrib = document.getElementById('filtro-contrib-tag-lote');
        const containerListaContrib = document.getElementById('container-lista-contribuintes-lote');
        const checkboxSelecionarTodos = document.getElementById('selecionar-todos-contribuintes');

        const resumoContainer = document.getElementById('resumo-geracao-lote');
        const resumoModeloEl = document.getElementById('resumo-modelo');
        const resumoContribCountEl = document.getElementById('resumo-contrib-count');
        const resumoDocsCountEl = document.getElementById('resumo-docs-count');
        const modeloSelectEl = document.getElementById('modelo-lote-select');
        const btnAjudaLote = document.getElementById('ajuda-documentos-lote'); 


        function atualizarListaContribuintesVisiveis() {
            const termoFiltro = filtroTextoContrib.value.toLowerCase().trim();
            const categoriaFiltro = filtroCategoriaContrib.value;
            const tagFiltro = filtroTagContrib.value;
            let contribuintesFiltrados = [...contribuintesParaFiltrar];

            if (termoFiltro) {
                contribuintesFiltrados = contribuintesFiltrados.filter(c => 
                    (c.nome && c.nome.toLowerCase().includes(termoFiltro)) ||
                    (c.numeroIdentificacao && c.numeroIdentificacao.toLowerCase().includes(termoFiltro)) ||
                    (c.cpfCnpj && c.cpfCnpj.includes(termoFiltro))
                );
            }
            if (categoriaFiltro) {
                contribuintesFiltrados = contribuintesFiltrados.filter(c => c.categories && c.categories.includes(categoriaFiltro));
            }
            if (tagFiltro) {
                contribuintesFiltrados = contribuintesFiltrados.filter(c => c.tags && c.tags.includes(tagFiltro));
            }

            containerListaContrib.innerHTML = '';
            if (contribuintesFiltrados.length === 0) {
                containerListaContrib.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400 p-2">Nenhum contribuinte corresponde aos filtros.</p>';
            } else {
                contribuintesFiltrados.forEach(c => {
                    const label = document.createElement('label');
                    label.className = 'checkbox-label inline-flex items-center w-full sm:w-1/2 md:w-1/3';
                    label.innerHTML = `
                        <input type="checkbox" name="contribuintesSelecionados" value="${c.id}" class="form-checkbox rounded text-blue-600 contrib-checkbox-lote">
                        <span class="ml-2 text-sm">${c.nome || `Contribuinte ID ${c.id}`} (${c.numeroIdentificacao || c.cpfCnpj || 'N/A'})</span>
                    `;
                    containerListaContrib.appendChild(label);
                });
            }
            const contribsSelecionados = Array.from(document.querySelectorAll('.contrib-checkbox-lote:checked')).map(c => c.value);
            renderizarTabelaDadosVariaveis(contribsSelecionados);
            atualizarResumoGeracao();
        }
        
        function atualizarResumoGeracao() {
            const modeloSelecionado = modeloSelectEl && modeloSelectEl.options && modeloSelectEl.selectedIndex !== -1 && modeloSelectEl.options[modeloSelectEl.selectedIndex]
                                   ? modeloSelectEl.options[modeloSelectEl.selectedIndex] 
                                   : null;
            const modeloSelecionadoText = modeloSelecionado ? modeloSelecionado.text : "Nenhum";
            const contribsSelecionadosCount = document.querySelectorAll('.contrib-checkbox-lote:checked').length;

            if (modeloSelectEl && modeloSelectEl.value && contribsSelecionadosCount > 0) {
                if(resumoModeloEl) resumoModeloEl.textContent = modeloSelecionadoText;
                if(resumoContribCountEl) resumoContribCountEl.textContent = contribsSelecionadosCount;
                if(resumoDocsCountEl) resumoDocsCountEl.textContent = contribsSelecionadosCount;
                if(resumoContainer) resumoContainer.classList.remove('hidden');
            } else {
                if(resumoContainer) resumoContainer.classList.add('hidden');
            }
            if(btnGerarLote) btnGerarLote.disabled = !(modeloSelectEl && modeloSelectEl.value && contribsSelecionadosCount > 0);
        }

        if (modeloSelectEl) {
            modeloSelectEl.addEventListener('change', async (e) => {
                await analisarEMostrarPlaceholdersDoModelo(e.target.value);
                atualizarResumoGeracao();
            });
            if(modeloSelectEl.value) analisarEMostrarPlaceholdersDoModelo(modeloSelectEl.value);
        }

        if (filtroTextoContrib) filtroTextoContrib.addEventListener('input', atualizarListaContribuintesVisiveis);
        if (filtroCategoriaContrib) filtroCategoriaContrib.addEventListener('change', atualizarListaContribuintesVisiveis);
        if (filtroTagContrib) filtroTagContrib.addEventListener('change', atualizarListaContribuintesVisiveis);
        if (containerListaContrib) {
            containerListaContrib.addEventListener('change', (e) => {
                if (e.target.classList.contains('contrib-checkbox-lote')) {
                    const contribsSelecionados = Array.from(document.querySelectorAll('.contrib-checkbox-lote:checked')).map(c => c.value);
                    renderizarTabelaDadosVariaveis(contribsSelecionados);
                    atualizarResumoGeracao();
                }
            });
        }

        if (checkboxSelecionarTodos) {
            checkboxSelecionarTodos.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                containerListaContrib.querySelectorAll('input[type="checkbox"].contrib-checkbox-lote').forEach(checkbox => {
                    if (checkbox.closest('label').style.display !== 'none') { 
                        checkbox.checked = isChecked;
                    }
                });
                const contribsSelecionados = Array.from(document.querySelectorAll('.contrib-checkbox-lote:checked')).map(c => c.value);
                renderizarTabelaDadosVariaveis(contribsSelecionados);
                atualizarResumoGeracao();
            });
        }
        
        atualizarListaContribuintesVisiveis();

        if (btnCancelar) {
            btnCancelar.addEventListener('click', () => {
                if (appModuleRef && appModuleRef.handleMenuAction) {
                    appModuleRef.handleMenuAction('gerir-documentos'); 
                }
            });
        }
        
        if (btnAjudaLote && ajudaModuleRef && ajudaModuleRef.mostrarTopicoDeAjuda) {
            btnAjudaLote.addEventListener('click', (e) => {
                e.preventDefault();
                ajudaModuleRef.mostrarTopicoDeAjuda('manual-modulo-documentos', 'doc-lote');
            });
        }


        if (form && btnGerarLote) {
            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                if (globalClearFeedbackRef) globalClearFeedbackRef(feedbackAreaEl);

                const modeloId = document.getElementById('modelo-lote-select').value;
                const contribuintesSelecionadosIds = Array.from(document.querySelectorAll('input[name="contribuintesSelecionados"]:checked')).map(cb => cb.value);
                const nomeLoteInput = document.getElementById('nome-lote-opcional').value.trim();
                const padraoTitulo = document.getElementById('lote-padrao-titulo').value;
                
                const exibirLinksCheckbox = document.getElementById('lote-exibir-links');

                const categoriasPadraoParaLote = [...currentSelectedCategoriasPadraoLote];
                const tagsPadraoParaLote = [...currentSelectedTagsPadraoLote];
                const exibirLinksAposGeracao = exibirLinksCheckbox.checked;


                if (!modeloId) {
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Por favor, selecione um modelo.", 'warning', feedbackAreaEl);
                    return;
                }
                if (contribuintesSelecionadosIds.length === 0) {
                    if (globalShowFeedbackRef) globalShowFeedbackRef("Por favor, selecione pelo menos um contribuinte.", 'warning', feedbackAreaEl);
                    return;
                }
                
                dadosVariaveisColetados = {};
                document.querySelectorAll('.dado-variavel-input').forEach(input => {
                    const cId = input.dataset.contribId;
                    const ph = input.dataset.phNome;
                    if (!dadosVariaveisColetados[cId]) {
                        dadosVariaveisColetados[cId] = {};
                    }
                    dadosVariaveisColetados[cId][ph] = input.value;
                });

                btnGerarLote.disabled = true;
                document.getElementById('progresso-lote-container').classList.remove('hidden');
                const barraProgresso = document.getElementById('barra-progresso-lote');
                const statusProgresso = document.getElementById('status-progresso-lote');
                const logGeracao = document.getElementById('log-geracao-lote');
                logGeracao.innerHTML = ''; 
                statusProgresso.textContent = "Iniciando geração...";
                barraProgresso.style.width = "0%";
                
                let documentosGeradosComSucessoIds = [];
                let detalhesErrosGeracao = [];
                let modeloOriginal = null;

                try {
                    modeloOriginal = await dbRef.getItemById(DOCUMENTS_STORE_NAME, modeloId);
                    if (!modeloOriginal) throw new Error(`Modelo com ID ${modeloId} não encontrado.`);
                    if (!modeloOriginal.isTemplate) throw new Error(`O documento selecionado (ID ${modeloId}) não é um modelo.`);
                    
                    const totalContribuintes = contribuintesSelecionadosIds.length;
                    for (let i = 0; i < totalContribuintes; i++) {
                        const contribuinteId = contribuintesSelecionadosIds[i];
                        const logItem = document.createElement('li');
                        let contribuinte = null; 
                        try {
                            contribuinte = await dbRef.getItemById(CONTRIBUINTES_STORE_NAME, contribuinteId);
                            if (!contribuinte) throw new Error(`Contribuinte com ID ${contribuinteId} não encontrado.`);

                            const contribuinteNomeDisplay = contribuinte.nome || `ID ${contribuinteId}`;
                            statusProgresso.textContent = `Processando ${contribuinteNomeDisplay} (${i + 1} de ${totalContribuintes})...`;

                            let novoTitulo = modeloOriginal.title || 'Documento Gerado';
                            const dataAtualFormatada = new Date().toLocaleDateString('pt-BR'); 
                            
                            let tituloBase = modeloOriginal.title || 'Documento';
                            let nomeContrib = contribuinte.nome || 'Contribuinte';
                            let refContrib = contribuinte.numeroIdentificacao || contribuinte.cpfCnpj || 'REF';


                            switch(padraoTitulo) {
                                case 'MODELO_CONTRIBUINTE': novoTitulo = `${tituloBase} - ${nomeContrib}`; break;
                                case 'CONTRIBUINTE_MODELO': novoTitulo = `${nomeContrib} - ${tituloBase}`; break;
                                case 'MODELO_DATA': novoTitulo = `${tituloBase} - ${dataAtualFormatada}`; break;
                                case 'CONTRIBUINTE_DATA': novoTitulo = `${nomeContrib} - ${dataAtualFormatada}`; break;
                                case 'REFERENCIA_CONTRIBUINTE_MODELO': novoTitulo = `${refContrib} - ${tituloBase}`; break;
                                case 'MODELO_REFERENCIA_CONTRIBUINTE': novoTitulo = `${tituloBase} - ${refContrib}`; break;
                            }
                            novoTitulo = substituirPlaceholders(novoTitulo, contribuinte, placeholdersDeContribuinteMapeadosCache, dadosVariaveisColetados[contribuinteId], placeholdersMarcadosComoVariaveis);

                            const novoConteudo = substituirPlaceholders(modeloOriginal.content, contribuinte, placeholdersDeContribuinteMapeadosCache, dadosVariaveisColetados[contribuinteId], placeholdersMarcadosComoVariaveis);
                            
                            let novaReferencia = modeloOriginal.reference || '';
                            if (novaReferencia) { 
                                novaReferencia = substituirPlaceholders(novaReferencia, contribuinte, placeholdersDeContribuinteMapeadosCache, dadosVariaveisColetados[contribuinteId], placeholdersMarcadosComoVariaveis);
                            } else if (appModuleRef && appModuleRef.generateDocumentReference && modeloOriginal.docType) {
                                novaReferencia = await appModuleRef.generateDocumentReference(modeloOriginal.docType);
                            }

                            const categoriasFinais = [...new Set([...(modeloOriginal.categories || []), ...categoriasPadraoParaLote])];
                            const tagsFinais = [...new Set([...(modeloOriginal.tags || []), ...tagsPadraoParaLote])];

                            const novoDocumento = {
                                id: appModuleRef.generateUUID(),
                                title: novoTitulo,
                                content: novoConteudo,
                                docType: modeloOriginal.docType,
                                categories: categoriasFinais,
                                tags: tagsFinais,
                                reference: novaReferencia,
                                creationDate: new Date().toISOString(),
                                modificationDate: new Date().toISOString(),
                                isTemplate: false,
                                isDeleted: false,
                                isFavorite: modeloOriginal.isFavorite || false, 
                                relatedDocuments: [...(modeloOriginal.relatedDocuments || [])], 
                                relatedContribuintes: [contribuinteId], 
                                anexos: [], 
                                generatedInBatchName: nomeLoteInput || `Lote de ${new Date().toLocaleDateString('pt-BR')}`,
                                sourceModelId: modeloId
                            };

                            const novoDocId = await dbRef.addItem(DOCUMENTS_STORE_NAME, novoDocumento);
                            documentosGeradosComSucessoIds.push(novoDocId); 

                            contribuinte.documentosRelacionados = contribuinte.documentosRelacionados || [];
                            if (!contribuinte.documentosRelacionados.includes(novoDocId)) {
                                contribuinte.documentosRelacionados.push(novoDocId);
                                await dbRef.updateItem(CONTRIBUINTES_STORE_NAME, contribuinte);
                            }
                            
                            logItem.textContent = `Sucesso: Documento "${novoTitulo.substring(0,50)}..." (ID: ${novoDocId.substring(0,8)}) gerado para ${contribuinteNomeDisplay}.`;
                            logItem.classList.add('text-green-600', 'dark:text-green-400');

                        } catch (errorDoc) {
                            const contribuinteNomeDisplayOnError = contribuinte ? (contribuinte.nome || `ID ${contribuinteId}`) : `ID ${contribuinteId}`;
                            const errorMsg = `Falha para ${contribuinteNomeDisplayOnError}: ${errorDoc.message}`;
                            logItem.textContent = errorMsg;
                            logItem.classList.add('text-red-600', 'dark:text-red-400');
                            detalhesErrosGeracao.push({ contribuinteId: contribuinteId, contribuinteNome: contribuinteNomeDisplayOnError, erro: errorDoc.message });
                        }
                        logGeracao.appendChild(logItem);
                        logGeracao.scrollTop = logGeracao.scrollHeight; 
                        barraProgresso.style.width = `${Math.round(((i + 1) / totalContribuintes) * 100)}%`;
                        if ((i + 1) % 5 === 0) { 
                            await new Promise(resolve => setTimeout(resolve, 20)); 
                        }
                    }

                    const loteRecord = {
                        id: appModuleRef.generateUUID(),
                        nomeLote: nomeLoteInput || `Lote Gerado em ${new Date().toLocaleString('pt-BR')}`,
                        modeloUsadoId: modeloId,
                        modeloUsadoTitulo: modeloOriginal.title || "Modelo sem título",
                        dataGeracao: new Date().toISOString(),
                        idsContribuintesProcessados: contribuintesSelecionadosIds,
                        idsDocumentosGerados: documentosGeradosComSucessoIds,
                        statusDaGeracao: detalhesErrosGeracao.length > 0 ? "Concluído com erros" : "Concluído com sucesso",
                        detalhesErros: detalhesErrosGeracao,
                        totalDocumentosTentados: totalContribuintes,
                        totalDocumentosSucesso: documentosGeradosComSucessoIds.length, 
                        totalDocumentosFalha: detalhesErrosGeracao.length,
                        configuracoesLote: {
                            padraoTitulo: padraoTitulo,
                            categoriasPadrao: categoriasPadraoParaLote,
                            tagsPadrao: tagsPadraoParaLote,
                            placeholdersVariaveisUtilizados: Array.from(placeholdersMarcadosComoVariaveis),
                            placeholdersDetectadosNoModelo: placeholdersDetectadosNoModeloCache 
                        }
                    };
                    await dbRef.addItem(LOTES_DE_DOCUMENTOS_STORE_NAME, loteRecord);

                    const msgFinal = `Geração concluída! ${documentosGeradosComSucessoIds.length} documento(s) gerado(s). ${detalhesErrosGeracao.length > 0 ? detalhesErrosGeracao.length + ' erro(s).' : ''}`;
                    statusProgresso.textContent = msgFinal;
                    
                    if (globalShowFeedbackRef) globalShowFeedbackRef(msgFinal, detalhesErrosGeracao.length > 0 ? "warning" : "success", feedbackAreaEl);
                    
                    if (exibirLinksAposGeracao && documentosGeradosComSucessoIds.length > 0) {
                        const logArea = document.getElementById('log-geracao-lote');
                        const headerLinks = document.createElement('p');
                        headerLinks.className = 'mt-2 font-semibold text-sm text-gray-700 dark:text-gray-200';
                        headerLinks.textContent = `Links para os documentos gerados:`;
                        
                        logGeracao.appendChild(headerLinks);
                        const ulLinks = document.createElement('ul');
                        ulLinks.className = 'list-disc list-inside text-xs';
                        for(const docId of documentosGeradosComSucessoIds) { 
                            const docGerado = await dbRef.getItemById(DOCUMENTS_STORE_NAME, docId);
                            const liLink = document.createElement('li');
                            const aLink = document.createElement('a');
                            aLink.href = '#';
                            aLink.textContent = docGerado ? docGerado.title : `Documento ID ${docId.substring(0,8)}`;
                            aLink.className = 'text-blue-600 hover:underline dark:text-blue-400';
                            aLink.onclick = (e) => {
                                e.preventDefault();
                                if (appModuleRef && SEFWorkStation.DocumentosView && SEFWorkStation.DocumentosView.renderVisualizarDocumentoPage) {
                                    SEFWorkStation.DocumentosView.renderVisualizarDocumentoPage(docId, 'criar-documentos-lote');
                                }
                            };
                            liLink.appendChild(aLink);
                            ulLinks.appendChild(liLink);
                        }
                        logGeracao.appendChild(ulLinks);
                        logGeracao.scrollTop = logGeracao.scrollHeight;
                    }

                    if (refreshApplicationStateRef) await refreshApplicationStateRef(); 

                    if (appModuleRef && appModuleRef.handleMenuAction) {
                        setTimeout(() => {
                            appModuleRef.handleMenuAction('gerenciar-lotes-documentos');
                        }, 1500 + (exibirLinksAposGeracao ? 1500 : 0) ); 
                    }

                } catch (errorGlobal) {
                    const msgErroGlobal = `Erro crítico durante a geração: ${errorGlobal.message}`;
                    statusProgresso.textContent = msgErroGlobal;
                    if (globalShowFeedbackRef) globalShowFeedbackRef(msgErroGlobal, "error", feedbackAreaEl);
                    btnGerarLote.disabled = false;
                }
            });
        }
    }
    
    function setupCategorySelectionForLotePadrao(feedbackAreaEl) {
        const filterInput = document.getElementById('lote-categorias-padrao-input');
        const suggestionsDropdown = document.getElementById('lote-categorias-padrao-sugestoes');

        if (!filterInput || !suggestionsDropdown) return;
        renderSelectedCategoriesPillsLotePadrao(); 

        filterInput.addEventListener('input', () => {
            const filterText = filterInput.value.toLowerCase().trim();
            suggestionsDropdown.innerHTML = '';
            if (filterText.length > 0) {
                const filteredCategorias = todasCategoriasDocSistemaCache.filter(cat =>
                    (SEFWorkStation.DocumentosCategorias.formatCategoryNameForDisplay(cat.name)).toLowerCase().includes(filterText) ||
                    cat.name.toLowerCase().includes(filterText)
                );
                if (filteredCategorias.length > 0) {
                    filteredCategorias.forEach(cat => {
                        if (!currentSelectedCategoriasPadraoLote.includes(cat.name)) { 
                            const item = document.createElement('div');
                            item.className = 'p-2 hover:bg-gray-100 dark:hover:bg-slate-600 cursor-pointer text-sm';
                            item.textContent = SEFWorkStation.DocumentosCategorias.formatCategoryNameForDisplay(cat.name);
                            item.addEventListener('click', () => {
                                if (!currentSelectedCategoriasPadraoLote.includes(cat.name)) currentSelectedCategoriasPadraoLote.push(cat.name);
                                renderSelectedCategoriesPillsLotePadrao();
                                filterInput.value = '';
                                suggestionsDropdown.classList.add('hidden');
                            });
                            suggestionsDropdown.appendChild(item);
                        }
                    });
                     if (suggestionsDropdown.childElementCount > 0) suggestionsDropdown.classList.remove('hidden'); else suggestionsDropdown.classList.add('hidden');
                } else { suggestionsDropdown.classList.add('hidden'); }
            } else { suggestionsDropdown.classList.add('hidden'); }
        });
        filterInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') { 
                e.preventDefault(); 
                const newCategoryNameRaw = filterInput.value.trim();
                if (!newCategoryNameRaw) return;

                if (!SEFWorkStation.DocumentosCategorias || !SEFWorkStation.DocumentosCategorias.isValidCategoryName || !SEFWorkStation.DocumentosCategorias.normalizeCategoryNameForStorage) {
                     if (globalShowFeedbackRef) globalShowFeedbackRef("Erro: Módulo de categorias de documento não carregado corretamente.", 'error', feedbackAreaEl);
                    return;
                }
                if (!SEFWorkStation.DocumentosCategorias.isValidCategoryName(newCategoryNameRaw)) {
                     if (globalShowFeedbackRef) globalShowFeedbackRef("Nome de categoria inválido. Use '/' para subníveis. Não pode começar/terminar com '/' nem ter '//'.", 'error', feedbackAreaEl);
                    return;
                }
                const newCategoryNameNormalized = SEFWorkStation.DocumentosCategorias.normalizeCategoryNameForStorage(newCategoryNameRaw);
                const existingCategory = todasCategoriasDocSistemaCache.find(cat => cat.name.toLowerCase() === newCategoryNameNormalized.toLowerCase());

                if (existingCategory) {
                    if (!currentSelectedCategoriasPadraoLote.includes(existingCategory.name)) {
                        currentSelectedCategoriasPadraoLote.push(existingCategory.name);
                        renderSelectedCategoriesPillsLotePadrao();
                    }
                } else {
                    try {
                        const novaCategoria = { id: appModuleRef.generateUUID(), name: newCategoryNameNormalized };
                        await dbRef.addItem(DOCUMENT_CATEGORIES_STORE_NAME, novaCategoria);
                        if (globalShowFeedbackRef) globalShowFeedbackRef(`Nova categoria "${SEFWorkStation.DocumentosCategorias.formatCategoryNameForDisplay(newCategoryNameNormalized)}" criada e selecionada.`, 'success', feedbackAreaEl);
                        todasCategoriasDocSistemaCache = await dbRef.getAllItems(DOCUMENT_CATEGORIES_STORE_NAME);
                        todasCategoriasDocSistemaCache.sort((a, b) => a.name.localeCompare(b.name));
                        if (!currentSelectedCategoriasPadraoLote.includes(newCategoryNameNormalized)) currentSelectedCategoriasPadraoLote.push(newCategoryNameNormalized);
                        renderSelectedCategoriesPillsLotePadrao();
                        if (refreshApplicationStateRef) await refreshApplicationStateRef();
                    } catch (err) { if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao criar categoria: ${err.message}`, 'error', feedbackAreaEl); }
                }
                filterInput.value = '';
                suggestionsDropdown.classList.add('hidden');
            }
        });
        filterInput.addEventListener('blur', () => setTimeout(() => suggestionsDropdown.classList.add('hidden'), 150));
    }
    function renderSelectedCategoriesPillsLotePadrao() {
        const container = document.getElementById('lote-categorias-padrao-selecionadas');
        if (!container) return;
        container.innerHTML = '';
        if (currentSelectedCategoriasPadraoLote.length === 0) {
            container.innerHTML = '<p class="text-xs text-gray-500 dark:text-gray-400">Nenhuma categoria padrão selecionada.</p>';
            return;
        }
        currentSelectedCategoriasPadraoLote.forEach(categoryName => {
            const pill = document.createElement('span');
            pill.className = 'inline-flex items-center px-2 py-1 mr-1 mt-1 bg-blue-100 dark:bg-blue-700 text-blue-800 dark:text-blue-200 text-xs font-medium rounded-full';
            const displayName = SEFWorkStation.DocumentosCategorias && SEFWorkStation.DocumentosCategorias.formatCategoryNameForDisplay ? SEFWorkStation.DocumentosCategorias.formatCategoryNameForDisplay(categoryName) : categoryName;
            pill.innerHTML = `${displayName} <button type="button" class="ml-1.5 inline-flex text-blue-500 dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-100" data-category-name="${categoryName.replace(/"/g, '"')}"><svg class="h-3 w-3" stroke="currentColor" fill="none" viewBox="0 0 8 8"><path stroke-linecap="round" stroke-width="1.5" d="M1 1l6 6m0-6L1 7" /></svg></button>`;
            pill.querySelector('button').addEventListener('click', (e) => {
                e.stopPropagation();
                currentSelectedCategoriasPadraoLote = currentSelectedCategoriasPadraoLote.filter(cat => cat !== e.currentTarget.dataset.categoryName);
                renderSelectedCategoriesPillsLotePadrao();
            });
            container.appendChild(pill);
        });
    }

    function setupTagSelectionForLotePadrao(feedbackAreaEl) {
        const tagsInputEl = document.getElementById('lote-tags-padrao-input');
        const autocompleteListEl = document.getElementById('lote-tags-padrao-sugestoes');
        if (!tagsInputEl || !autocompleteListEl) return;
        renderSelectedTagsPillsLotePadrao();
        let currentTagInputLote = "";

        tagsInputEl.addEventListener('input', () => {
            const rawValue = tagsInputEl.value;
            const parts = rawValue.split(','); 
            currentTagInputLote = parts[parts.length - 1].trim().toLowerCase(); 
            autocompleteListEl.innerHTML = '';
            if (currentTagInputLote.length > 0) {
                const suggestions = todasTagsDocSistemaCache.filter(tag => tag.name.toLowerCase().startsWith(currentTagInputLote) && !currentSelectedTagsPadraoLote.map(t => t.toLowerCase()).includes(tag.name.toLowerCase()));
                if (suggestions.length > 0) {
                    suggestions.forEach(tag => {
                        const item = document.createElement('div');
                        item.className = 'p-2 hover:bg-gray-100 dark:hover:bg-slate-600 cursor-pointer text-sm';
                        item.textContent = tag.name;
                        item.addEventListener('click', () => {
                            addTagToSelectedListLotePadrao(tag.name);
                            autocompleteListEl.classList.add('hidden');
                            tagsInputEl.value = '';
                        });
                        autocompleteListEl.appendChild(item);
                    });
                    autocompleteListEl.classList.remove('hidden');
                } else { autocompleteListEl.classList.add('hidden'); }
            } else { autocompleteListEl.classList.add('hidden'); }
        });
        tagsInputEl.addEventListener('blur', () => setTimeout(() => autocompleteListEl.classList.add('hidden'), 150));
        tagsInputEl.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                const tagToProcess = (e.key === 'Enter' ? tagsInputEl.value.trim() : currentTagInputLote).trim();
                if (tagToProcess) {
                    if (!SEFWorkStation.DocumentosTags || !SEFWorkStation.DocumentosTags.isValidTagName) {
                        if (globalShowFeedbackRef) globalShowFeedbackRef("Erro: Módulo de tags de documento não carregado corretamente.", 'error', feedbackAreaEl);
                        return;
                    }
                    if (!SEFWorkStation.DocumentosTags.isValidTagName(tagToProcess)) {
                        if (globalShowFeedbackRef) globalShowFeedbackRef(`Nome de tag inválido: "${tagToProcess}".`, 'error', feedbackAreaEl); return;
                    }
                    const existingTag = todasTagsDocSistemaCache.find(t => t.name.toLowerCase() === tagToProcess.toLowerCase());
                    if (!existingTag) {
                        try {
                            const newTag = { id: appModuleRef.generateUUID(), name: tagToProcess };
                            await dbRef.addItem(DOCUMENT_TAGS_STORE_NAME, newTag);
                            if (globalShowFeedbackRef) globalShowFeedbackRef(`Nova tag "${tagToProcess}" criada.`, 'success', feedbackAreaEl);
                            todasTagsDocSistemaCache = await dbRef.getAllItems(DOCUMENT_TAGS_STORE_NAME);
                            todasTagsDocSistemaCache.sort((a,b) => a.name.localeCompare(b.name));
                            if(refreshApplicationStateRef) await refreshApplicationStateRef();
                        } catch (err) { if (globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao criar tag: ${err.message}`, 'error', feedbackAreaEl); return; }
                    }
                    addTagToSelectedListLotePadrao(tagToProcess);
                    tagsInputEl.value = ''; 
                }
            }
        });
    }
    function renderSelectedTagsPillsLotePadrao() {
        const container = document.getElementById('lote-tags-padrao-selecionadas');
        if (!container) return;
        container.innerHTML = '';
        if (currentSelectedTagsPadraoLote.length === 0) {
            container.innerHTML = '<p class="text-xs text-gray-500 dark:text-gray-400">Nenhuma tag padrão selecionada.</p>';
            return;
        }
        currentSelectedTagsPadraoLote.forEach(tagName => {
            const pill = document.createElement('span');
            pill.className = 'inline-flex items-center px-2 py-1 mr-1 mt-1 bg-green-100 dark:bg-green-700 text-green-800 dark:text-green-200 text-xs font-medium rounded-full';
            pill.innerHTML = `${tagName} <button type="button" class="ml-1.5 inline-flex text-green-500 dark:text-green-300 hover:text-green-700 dark:hover:text-green-100" data-tag-name="${tagName.replace(/"/g, '"')}"><svg class="h-3 w-3" stroke="currentColor" fill="none" viewBox="0 0 8 8"><path stroke-linecap="round" stroke-width="1.5" d="M1 1l6 6m0-6L1 7" /></svg></button>`;
            pill.querySelector('button').addEventListener('click', (e) => {
                e.stopPropagation();
                currentSelectedTagsPadraoLote = currentSelectedTagsPadraoLote.filter(tag => tag !== e.currentTarget.dataset.tagName);
                renderSelectedTagsPillsLotePadrao();
            });
            container.appendChild(pill);
        });
    }
    function addTagToSelectedListLotePadrao(tagName) {
        if (!currentSelectedTagsPadraoLote.map(t => t.toLowerCase()).includes(tagName.toLowerCase())) {
            currentSelectedTagsPadraoLote.push(tagName);
            renderSelectedTagsPillsLotePadrao();
        }
    }

    return {
        init,
        renderPaginaCriarDocumentosLote
    };
})();