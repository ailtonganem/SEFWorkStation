// js/sharedUtils.js - Funções Utilitárias Compartilhadas
// v3.1.0 - CORRIGIDO: Adicionada a função 'adicionarItemChipContainer' que estava ausente, resolvendo o TypeError.
// v3.0.0 - ADICIONADO: Função criarPacoteDeCompartilhamento para coletar recursivamente dados para exportação.
// v2.1.0 - CORRIGIDO: Altera o padrão do módulo para uma IIFE não-destrutiva, resolvendo o erro de inicialização.
// v2.0.0 - ADICIONADO: Função `getCurrentUser` para obter de forma centralizada os dados do servidor definido como usuário atual da aplicação.
// v1.0.0 - Módulo inicial com funções para manipulação de anexos e UUID.

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.SharedUtils = window.SEFWorkStation.SharedUtils || {};

(function(SharedUtils) {
    let dbRef = null;
    let configuracoesRef = null;

    /**
     * Inicializa o módulo de utilitários compartilhados com as dependências necessárias.
     * @param {object} db - A referência ao módulo do banco de dados (db.js).
     * @param {object} configs - A referência ao módulo de configurações (configuracoes.js).
     */
    SharedUtils.init = function(db, configs) {
        dbRef = db;
        configuracoesRef = configs;
        console.log("SharedUtils.JS: Módulo inicializado (v3.1.0).");
    };

    /**
     * Obtém os dados do servidor definido como o usuário atual da aplicação.
     * @returns {Promise<object|null>} Uma promessa que resolve para o objeto do servidor ou um objeto padrão se não for encontrado.
     */
    SharedUtils.getCurrentUser = async function() {
        const defaultUser = { id: null, nome: 'N/A', matricula: 'N/A', email: null };
        if (!configuracoesRef || !dbRef) {
            console.error("SharedUtils: Módulos de configuração ou DB não inicializados.");
            return defaultUser;
        }

        try {
            const userPrefs = await configuracoesRef.carregarUserPreferences();
            if (userPrefs && userPrefs.currentUserServerId) {
                const user = await dbRef.getItemById('servidoresStore', userPrefs.currentUserServerId);
                return user || defaultUser;
            }
            return defaultUser;
        } catch (error) {
            console.error("Erro ao obter o usuário atual:", error);
            return defaultUser;
        }
    };

    /**
     * Gera um UUID (Universally Unique Identifier) v4.
     * @returns {string} O UUID gerado.
     */
    SharedUtils.generateUUID = function() {
        if (crypto && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        console.warn("UTILS.JS: crypto.randomUUID() não está disponível. Usando fallback.");
        return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[xy]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    };
    
    /**
     * Obtém o handle para a pasta compartilhada, solicitando ao usuário se necessário.
     * @param {boolean} [forceSelection=false] - Se true, força a exibição do seletor de pastas.
     * @returns {Promise<FileSystemDirectoryHandle|null>}
     */
    SharedUtils.getSharedFolderHandle = async function(forceSelection = false) {
        let handle = window.SEFWorkStation.State.getSharedFolderHandle();
        if (handle && !forceSelection) {
            if (await handle.queryPermission({ mode: 'readwrite' }) === 'granted') {
                return handle;
            }
        }
        try {
            const newHandle = await window.showDirectoryPicker({ id: 'sef-shared-folder', mode: 'readwrite' });
            if (await newHandle.requestPermission({ mode: 'readwrite' }) === 'granted') {
                window.SEFWorkStation.State.setSharedFolderHandle(newHandle);
                return newHandle;
            }
            return null;
        } catch (err) {
            if (err.name !== 'AbortError') console.error("Erro ao selecionar a pasta compartilhada:", err);
            return null;
        }
    };
    
    /**
     * Cria um pacote de dados para compartilhamento, coletando a entidade principal e suas vinculadas.
     * @param {Array<{entityId: string, storeName: string}>} itemsToShare - A lista de itens principais.
     * @param {object} db - Referência ao módulo do banco de dados.
     * @param {object} options - Opções de coleta.
     * @returns {Promise<object>} Um objeto contendo a lista de entidades e os caminhos dos anexos.
     */
    SharedUtils.criarPacoteDeCompartilhamento = async function(itemsToShare, db, options) {
        const { incluirVinculos = true, incluirAnexos = true } = options;
        
        const pacoteEntidades = [];
        const attachmentPaths = new Set();
        const entidadesProcessadas = new Set(); // Evita loops infinitos (ex: doc A -> doc B -> doc A)

        const allEntityConfigs = window.SEFWorkStation.EntityConfig.getAllConfigs();

        const processarEntidade = async (entityId, storeName, isMainItem) => {
            const uniqueKey = `${storeName}-${entityId}`;
            if (entidadesProcessadas.has(uniqueKey)) return;

            const item = await db.getItemById(storeName, entityId);
            if (!item) {
                console.warn(`Item com ID ${entityId} não encontrado na store ${storeName}.`);
                return;
            }
            entidadesProcessadas.add(uniqueKey);

            const itemCopy = JSON.parse(JSON.stringify(item));
            itemCopy._storeName = storeName;
            itemCopy._isMain = isMainItem;
            pacoteEntidades.push(itemCopy);

            // Adiciona caminhos de anexos para este item
            if (incluirAnexos && itemCopy.anexos && Array.isArray(itemCopy.anexos)) {
                itemCopy.anexos.forEach(anexo => {
                    if (anexo.filePath) attachmentPaths.add(anexo.filePath);
                });
            }
            if(incluirAnexos && itemCopy.anexoDecisaoFinalPath) {
                attachmentPaths.add(itemCopy.anexoDecisaoFinalPath);
            }

            // Se for para incluir vínculos, processa recursivamente
            if (incluirVinculos) {
                for (const prop in itemCopy) {
                    // Procura por propriedades que indicam um link para outra entidade (ex: 'documentosVinculadosIds')
                    if (prop.endsWith('Ids') && Array.isArray(itemCopy[prop])) {
                        const linkedIds = itemCopy[prop];
                        // Encontra a configuração da entidade vinculada baseado no nome da propriedade
                        const linkedEntityConfig = allEntityConfigs.find(config => config.targetLinkField === prop);
                        if (linkedEntityConfig) {
                            for (const linkedId of linkedIds) {
                                await processarEntidade(linkedId, linkedEntityConfig.storeName, false);
                            }
                        }
                    } else if (prop === 'relatedDocuments' || prop === 'relatedContribuintes') { // Casos especiais
                         const linkedEntityStore = prop === 'relatedDocuments' ? 'documents' : 'contribuintes';
                         for (const linkedId of itemCopy[prop]) {
                             await processarEntidade(linkedId, linkedEntityStore, false);
                         }
                    }
                }
            }
        };

        for (const item of itemsToShare) {
            await processarEntidade(item.entityId, item.storeName, true);
        }

        return {
            entidades: pacoteEntidades,
            attachmentPaths: Array.from(attachmentPaths)
        };
    };


    /**
     * Obtém ou cria o handle para a pasta de anexos de uma entidade específica.
     * @param {string} entityRootPath - O caminho raiz para a entidade (ex: 'documents', 'itcd/avaliacoes').
     * @param {string} entityId - O ID da entidade.
     * @returns {Promise<FileSystemDirectoryHandle|null>} O handle do diretório ou null em caso de erro.
     */
    SharedUtils.getOrCreateAttachmentDirHandle = async function(entityRootPath, entityId) {
        try {
            const rootDirHandle = SEFWorkStation.State.getDirectoryHandle();
            if (!rootDirHandle) {
                console.warn("Pasta raiz da aplicação não definida. Anexos não serão salvos no sistema de arquivos.");
                return null;
            }
            const attachmentsSefDir = await rootDirHandle.getDirectoryHandle('attachments_sef', { create: true });
            
            let currentDir = attachmentsSefDir;
            const pathParts = entityRootPath.split('/');
            for (const part of pathParts) {
                currentDir = await currentDir.getDirectoryHandle(part, { create: true });
            }
            
            const entityDirHandle = await currentDir.getDirectoryHandle(String(entityId), { create: true });
            return entityDirHandle;
        } catch (error) {
            console.error(`Erro ao obter/criar pasta de anexos para '${entityRootPath}/${entityId}':`, error);
            SEFWorkStation.App.showGlobalFeedback("Não foi possível acessar a pasta de anexos. Verifique as permissões.", "error");
            return null;
        }
    };

    /**
     * Tenta excluir a pasta de anexos de uma entidade. Falha silenciosamente se a pasta não existir.
     * @param {string} entityRootPath - O caminho raiz para a entidade.
     * @param {string} entityId - O ID da entidade.
     */
    SharedUtils.tryDeleteEntityAttachmentFolder = async function(entityRootPath, entityId) {
        try {
            const rootDirHandle = SEFWorkStation.State.getDirectoryHandle();
            if (!rootDirHandle) return;

            let currentDir = await rootDirHandle.getDirectoryHandle('attachments_sef');
            const pathParts = entityRootPath.split('/');
            for (const part of pathParts) {
                currentDir = await currentDir.getDirectoryHandle(part);
            }
            
            await currentDir.removeEntry(String(entityId), { recursive: true });
            console.log(`Pasta de anexos para ${entityId} removida com sucesso.`);
        } catch (error) {
            if (error.name !== 'NotFoundError') {
                console.warn(`Não foi possível remover a pasta de anexos para ${entityId}:`, error);
            }
        }
    };
    
    SharedUtils.downloadAttachment = async function(filePath, fileName) {
        const rootDirHandle = SEFWorkStation.State.getDirectoryHandle();
        if (!rootDirHandle) {
            appModuleRef.showGlobalFeedback("Pasta da aplicação não definida.", "error");
            return;
        }
        if (!filePath) {
            appModuleRef.showGlobalFeedback(`Caminho do anexo "${fileName}" não definido.`, "error");
            return;
        }
        try {
            const fileHandle = await rootDirHandle.getFileHandle(filePath, { create: false });
            const file = await fileHandle.getFile();
            const url = URL.createObjectURL(file);
            const a = document.createElement('a');
            a.href = url; a.download = fileName;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error(`SharedUtils: Erro ao acessar anexo "${fileName}" em "${filePath}":`, error);
            appModuleRef.showGlobalFeedback(`Erro ao abrir/baixar anexo "${fileName}": ${error.message}. Verifique se o arquivo existe.`, 'error');
        }
    };
    
    /**
     * Desvincula uma entidade de todas as outras entidades que possam estar relacionadas a ela.
     * @param {string} entityId - O ID da entidade a ser desvinculada.
     * @param {string} entityStoreName - O nome da store da entidade a ser desvinculada.
     * @param {object} db - A referência ao módulo do banco de dados.
     */
    SharedUtils.desvincularEntidadeDeTodasAsOutras = async function(entityId, entityStoreName, db) {
        const todasStores = Object.values(db.STORES);
        for (const storeName of todasStores) {
            if (storeName === entityStoreName) continue; 
            try {
                const todosItens = await db.getAllItems(storeName);
                for (const item of todosItens) {
                    let foiModificado = false;
                    for (const key in item) {
                        if (key.endsWith('Ids') && Array.isArray(item[key]) && item[key].includes(entityId)) {
                            item[key] = item[key].filter(id => id !== entityId);
                            foiModificado = true;
                        }
                    }
                    if (foiModificado) {
                        if(item.modificationDate) item.modificationDate = new Date().toISOString();
                        if(item.dataModificacao) item.dataModificacao = new Date().toISOString();
                        await db.updateItem(storeName, item);
                    }
                }
            } catch (error) {
                console.warn(`Erro ao processar desvinculação na store '${storeName}':`, error);
            }
        }
    };
    
    SharedUtils.atualizarRelacionamentosBidirecionais = async function(entidadePrincipalId, storeAlvo, campoAlvo, idsAtuais, idsAnteriores, db) {
        const idsAdicionados = idsAtuais.filter(id => !idsAnteriores.includes(id));
        const idsRemovidos = idsAnteriores.filter(id => !idsAtuais.includes(id));

        // Adiciona o link na entidade alvo
        for (const id of idsAdicionados) {
            try {
                const itemAlvo = await db.getItemById(storeAlvo, id);
                if (itemAlvo) {
                    itemAlvo[campoAlvo] = itemAlvo[campoAlvo] || [];
                    if (!itemAlvo[campoAlvo].includes(entidadePrincipalId)) {
                        itemAlvo[campoAlvo].push(entidadePrincipalId);
                        if(itemAlvo.modificationDate) itemAlvo.modificationDate = new Date().toISOString();
                        if(itemAlvo.dataModificacao) itemAlvo.dataModificacao = new Date().toISOString();
                        await db.updateItem(storeAlvo, itemAlvo);
                    }
                }
            } catch (e) { console.error(`Erro ao adicionar link reverso para ${id} em ${storeAlvo}:`, e); }
        }

        // Remove o link da entidade alvo
        for (const id of idsRemovidos) {
             try {
                const itemAlvo = await db.getItemById(storeAlvo, id);
                if (itemAlvo && itemAlvo[campoAlvo] && Array.isArray(itemAlvo[campoAlvo])) {
                    const index = itemAlvo[campoAlvo].indexOf(entidadePrincipalId);
                    if (index > -1) {
                        itemAlvo[campoAlvo].splice(index, 1);
                        if(itemAlvo.modificationDate) itemAlvo.modificationDate = new Date().toISOString();
                        if(itemAlvo.dataModificacao) itemAlvo.dataModificacao = new Date().toISOString();
                        await db.updateItem(storeAlvo, itemAlvo);
                    }
                }
            } catch (e) { console.error(`Erro ao remover link reverso de ${id} em ${storeAlvo}:`, e); }
        }
    };

    /**
     * Atualiza um container de "chips" (pills/etiquetas) com base em uma lista de nomes.
     * @param {string} containerId - O ID do elemento que conterá os chips.
     * @param {Array<string>} items - A lista de nomes/identificadores dos itens.
     * @param {Array<object>} todasOpcoesCache - Cache das opções disponíveis para evitar buscas repetidas no DB.
     * @param {string} storeName - O nome da store no DB para validação.
     * @param {string} tipo - O tipo do item ('categoria' ou 'tag') para estilização.
     */
    SharedUtils.preencherChips = function(containerId, items, todasOpcoesCache, storeName, tipo) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        if (items && items.length > 0) {
            items.forEach(itemName => {
                const pill = document.createElement('span');
                pill.className = `inline-flex items-center px-2 py-1 mr-1 mt-1 ${tipo === 'categoria' ? 'bg-blue-100 dark:bg-blue-700 text-blue-800 dark:text-blue-200' : 'bg-green-100 dark:bg-green-700 text-green-800 dark:text-green-200'} text-xs font-medium rounded-full`;
                const displayName = (tipo === 'categoria' && SEFWorkStation.DocumentosCategorias) 
                    ? SEFWorkStation.DocumentosCategorias.formatCategoryNameForDisplay(itemName) 
                    : itemName;
                pill.textContent = displayName;
                pill.dataset.itemName = itemName;
                container.appendChild(pill);
            });
        } else {
            container.innerHTML = `<p class="text-xs text-gray-400 dark:text-gray-500 italic p-1">Nenhum(a) ${tipo} selecionado(a).</p>`;
        }
    };

    /**
     * Obtém os nomes dos itens a partir dos chips exibidos no container.
     * @param {string} containerId - O ID do elemento que contém os chips.
     * @returns {Array<string>} Uma lista com os nomes dos itens.
     */
    SharedUtils.obterItensDosChips = function(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return [];
        return Array.from(container.querySelectorAll('span[data-item-name]')).map(span => span.dataset.itemName);
    };
    
    /**
     * Adiciona um novo chip a um container. Se o item não existir na store, ele é criado.
     * @param {string} containerId - ID do container dos chips.
     * @param {string} itemName - Nome do item a ser adicionado.
     * @param {string} storeName - Nome da store para verificar/adicionar o item.
     * @param {string} tipo - Tipo para estilização ('categoria' ou 'tag').
     * @param {object} db - Referência ao módulo do DB.
     * @param {Function} showFeedback - Função para exibir feedback.
     * @param {object} app - Referência ao módulo principal do app.
     */
    SharedUtils.adicionarItemChipContainer = async function(containerId, itemName, storeName, tipo, db, showFeedback, app) {
        // Validação básica
        if (!itemName || !itemName.trim()) return;

        // Verifica se o chip já existe no container para evitar duplicatas visuais
        const container = document.getElementById(containerId);
        const existingItems = SharedUtils.obterItensDosChips(containerId);
        if (existingItems.map(item => item.toLowerCase()).includes(itemName.toLowerCase())) {
            return;
        }

        try {
            // Verifica se o item já existe no banco de dados
            const todosItens = await db.getAllItems(storeName);
            const itemExiste = todosItens.some(i => i.name.toLowerCase() === itemName.toLowerCase());

            // Se não existir, cria um novo
            if (!itemExiste) {
                const novoItem = { id: app.generateUUID(), name: itemName };
                await db.addItem(storeName, novoItem);
                if (showFeedback) showFeedback(`Nova(o) ${tipo} "${itemName}" criada(o).`, 'success');
                if (window.SEFWorkStation && window.SEFWorkStation.App && typeof window.SEFWorkStation.App.refreshApplicationState === 'function') {
                    await window.SEFWorkStation.App.refreshApplicationState();
                }
            }

            // Atualiza a UI, adicionando o novo chip
            // Remove a mensagem "Nenhum item" se for o primeiro
            const placeholder = container.querySelector('p.italic');
            if (placeholder) placeholder.remove();
            
            const pill = document.createElement('span');
            pill.className = `inline-flex items-center px-2 py-1 mr-1 mt-1 ${tipo === 'categoria' ? 'bg-blue-100 dark:bg-blue-700 text-blue-800 dark:text-blue-200' : 'bg-green-100 dark:bg-green-700 text-green-800 dark:text-green-200'} text-xs font-medium rounded-full`;
            const displayName = tipo === 'categoria' ? (window.SEFWorkStation.DocumentosCategorias.formatCategoryNameForDisplay(itemName) || itemName) : itemName;
            pill.innerHTML = `${displayName} <button type="button" class="ml-1.5 inline-flex" data-item-name="${itemName.replace(/"/g, '\"')}">×</button>`;
            pill.dataset.itemName = itemName;
            container.appendChild(pill);

            // Adiciona evento de remoção ao novo chip
            pill.querySelector('button').addEventListener('click', (e) => {
                e.stopPropagation();
                e.currentTarget.parentElement.remove();
                 if (container.children.length === 0) {
                     container.innerHTML = `<p class="text-xs text-gray-400 dark:text-gray-500 italic p-1">Nenhum(a) ${tipo} selecionado(a).</p>`;
                 }
            });

        } catch (error) {
            console.error(`Erro ao adicionar ${tipo} "${itemName}":`, error);
            if (showFeedback) showFeedback(`Erro ao processar ${tipo}.`, 'error');
        }
    };


})(window.SEFWorkStation.SharedUtils);