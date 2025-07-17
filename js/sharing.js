// js/sharing.js - Módulo de Compartilhamento de Entidades
// v3.2 - CORREÇÃO: Adiciona verificação explícita do shareId antes de salvar no DB para garantir integridade.
// v3.1 - Implementada a lógica completa da função shareItem com dependências.
// v3.0 - Renomeado de itensCompartilhados.js e reestruturado para ser o módulo central de compartilhamento.
// v2.1 - Aprimora tratamento de erros na importação (ex: arquivo .sefshare ausente).
// v2.0 - Implementada a lógica de importação, resolução de conflitos e atualização do .meta.
// v1.0 - Implementação inicial da listagem e verificação de itens na pasta compartilhada.

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.Sharing = (function() {
    let mainContentWrapperRef;
    let dbRef;
    let appModuleRef;
    let sharedUtilsRef;
    let uiModuleRef;
    let ajudaModuleRef;

    const STORE_MAP_SHARING_MANAGER = { 
        'documents': 'Documento', 'contribuintes': 'Contribuinte', 'servidoresStore': 'Servidor',
        'recursos': 'Recurso', 'tarefasStore': 'Tarefa', 'notasRapidasStore': 'Nota Rápida',
        'protocolosStore': 'Protocolo', 'ptasStore': 'PTA', 'autuacoesStore': 'Autuação'
    };

    function init(db, app, utils, ui) {
        dbRef = db;
        appModuleRef = app;
        sharedUtilsRef = utils;
        uiModuleRef = ui;
        mainContentWrapperRef = document.querySelector('.main-content-wrapper');
        ajudaModuleRef = window.SEFWorkStation.Ajuda;
        console.log("Sharing.JS: Módulo de Compartilhamento inicializado (v3.2).");
    }
    
    function handleMenuAction(action, data) {
        if (action === 'itens-recebidos') {
            if (window.SEFWorkStation.ItensCompartilhados && typeof window.SEFWorkStation.ItensCompartilhados.renderItensCompartilhadosPage === 'function') {
                window.SEFWorkStation.ItensCompartilhados.renderItensCompartilhadosPage();
            } else {
                console.error("Módulo ItensCompartilhados não está disponível para renderizar a página.");
            }
        } else {
            console.warn(`Sharing.js: Ação desconhecida recebida: ${action}`);
        }
    }
    
    /**
     * Cria e salva os arquivos de compartilhamento (.meta e .sefshare) para um ou mais itens.
     * @param {Array<{entityId: string, storeName: string}>} itemsToShare - Uma lista de objetos identificando os itens a serem compartilhados.
     * @param {Array<object>} recipients - Lista de destinatários (servidores ou grupos).
     * @param {object} [options={}] - Opções para o compartilhamento.
     * @param {string} [options.customTitle] - Um título personalizado para o lote.
     * @param {boolean} [options.incluirVinculos=true] - Se deve incluir entidades vinculadas.
     * @param {boolean} [options.incluirAnexos=true] - Se deve incluir metadados de anexos.
     * @returns {Promise<object|null>} Uma promessa que resolve com o objeto de metadados do compartilhamento em sucesso, ou null em caso de falha.
     */
    async function shareItem(itemsToShare, recipients, options = {}) {
        const { customTitle, incluirVinculos = true, incluirAnexos = true } = options;

        if (!itemsToShare || itemsToShare.length === 0 || !recipients || recipients.length === 0) {
            appModuleRef.showGlobalFeedback("Informações insuficientes para o compartilhamento (itens ou destinatários ausentes).", "error");
            return null;
        }
        uiModuleRef.showLoading(true, "Iniciando processo de compartilhamento...");
        try {
            const currentUser = await sharedUtilsRef.getCurrentUser();
            if (!currentUser) {
                throw new Error("Usuário atual não definido. Configure seu perfil em 'Configurações' para poder compartilhar.");
            }
            const sharedFolderHandle = await sharedUtilsRef.getSharedFolderHandle();
            if (!sharedFolderHandle) {
                throw new Error("A pasta compartilhada não está selecionada.");
            }

            const pacoteDeDados = await sharedUtilsRef.criarPacoteDeCompartilhamento(itemsToShare, dbRef, { incluirVinculos, incluirAnexos });
            
            if (!pacoteDeDados || !pacoteDeDados.entidades || pacoteDeDados.entidades.length === 0) {
                throw new Error("Falha ao criar o pacote de dados para compartilhamento. Nenhum item principal foi encontrado ou coletado.");
            }
            
            const shareId = SEFWorkStation.Utils.generateUUID();
            if (!shareId) {
                throw new Error("Falha crítica ao gerar ID único para o compartilhamento. A operação foi cancelada.");
            }

            const primeiroItemPrincipal = pacoteDeDados.entidades.find(e => e._isMain);
            if (!primeiroItemPrincipal) {
                throw new Error("Nenhuma entidade principal encontrada no pacote de dados.");
            }

            const tituloDisplay = customTitle || primeiroItemPrincipal.title || primeiroItemPrincipal.nome || primeiroItemPrincipal.assunto || primeiroItemPrincipal.titulo || `Item ${primeiroItemPrincipal.id}`;
            const tituloCompartilhamento = pacoteDeDados.entidades.filter(e=>e._isMain).length > 1 ? (customTitle || `Lote de ${pacoteDeDados.entidades.filter(e=>e._isMain).length} itens`) : tituloDisplay;

            const metaData = {
                shareId: shareId,
                title: tituloCompartilhamento,
                sender: { id: currentUser.id, nome: currentUser.nome, email: currentUser.email },
                recipients: recipients.map(r => ({ id: r.id, nome: r.nome, email: r.email, tipo: r.tipo })),
                timestamp: new Date().toISOString(),
                appVersion: appModuleRef.APP_VERSION_DISPLAY,
                status: {},
                itemCount: pacoteDeDados.entidades.filter(e => e._isMain).length,
                options: { incluirVinculos, incluirAnexos }
            };
            
            const zip = new JSZip();
            zip.file('share_package.json', JSON.stringify(pacoteDeDados));

            if (incluirAnexos && pacoteDeDados.attachmentPaths && pacoteDeDados.attachmentPaths.length > 0) {
                uiModuleRef.showLoading(true, "Compactando anexos...");
                const appDirHandle = SEFWorkStation.State.getDirectoryHandle();
                for (const path of pacoteDeDados.attachmentPaths) {
                    try {
                        const fileHandle = await appDirHandle.getFileHandle(path, { create: false });
                        const file = await fileHandle.getFile();
                        zip.file(path, file);
                    } catch (e) {
                        console.warn(`Não foi possível incluir o anexo "${path}" no ZIP.`, e);
                    }
                }
            }
            
            uiModuleRef.showLoading(true, "Salvando arquivos na pasta compartilhada...");
            const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
            
            const metaFileHandle = await sharedFolderHandle.getFileHandle(`${shareId}.meta`, { create: true });
            const metaWritable = await metaFileHandle.createWritable();
            await metaWritable.write(JSON.stringify(metaData, null, 2));
            await metaWritable.close();
            
            const shareFileHandle = await sharedFolderHandle.getFileHandle(`${shareId}.sefshare.zip`, { create: true });
            const shareWritable = await shareFileHandle.createWritable();
            await shareWritable.write(zipBlob);
            await shareWritable.close();
            
            if (!metaData.shareId) {
                throw new Error("Objeto de metadados está sem 'shareId' antes de salvar no histórico. Operação abortada.");
            }
            await dbRef.addItem(dbRef.STORES.SHARING_HISTORY, metaData);
            
            appModuleRef.showGlobalFeedback("Item compartilhado com sucesso! O registro foi adicionado ao seu histórico de envios.", "success");
            return metaData;

        } catch (error) {
            console.error("Erro no processo de compartilhamento (core):", error);
            appModuleRef.showGlobalFeedback(`Falha no compartilhamento: ${error.message}`, "error", null, 0);
            return null;
        } finally {
            uiModuleRef.showLoading(false);
        }
    }

    function prepareNotificationEmail(metaData) {
        if (!metaData) return;
        
        let recipientEmails = [];
        if (metaData.recipients) {
            metaData.recipients.forEach(r => {
                if (r.email) recipientEmails.push(r.email);
            });
        }
        recipientEmails = [...new Set(recipientEmails)];
        
        if (recipientEmails.length === 0) {
            appModuleRef.showGlobalFeedback("Nenhum destinatário com email válido para notificação. O compartilhamento foi feito, mas o e-mail não pôde ser preparado.", "warning");
            return;
        }

        const subject = `SEFWorkStation: Novo item compartilhado por ${metaData.sender.nome}`;
        const body = `
            Olá,

            ${metaData.sender.nome} compartilhou o seguinte com você no SEFWorkStation:
            
            - **Item(ns):** ${metaData.title}
            - **Tipo:** ${STORE_MAP_SHARING_MANAGER[metaData.storeName] || metaData.storeName}${metaData.itemCount > 1 ? ` (+${metaData.itemCount - 1} outros)` : ''}
            - **Compartilhado em:** ${new Date(metaData.timestamp).toLocaleString()}

            Para acessar este(s) item(ns), abra o SEFWorkStation e navegue até "Compartilhamento > Itens Recebidos". 
            Certifique-se de que sua pasta 'SEFWorkStation_Compartilhado' esteja sincronizada.

            Esta é uma notificação automática.
        `;

        const emailData = {
            para: recipientEmails,
            assunto: subject,
            corpoHtml: body.replace(/\n/g, '<br>'),
            origem: 'sharing',
            idEntidadeOrigem: metaData.shareId
        };
        
        appModuleRef.handleMenuAction('escrever-email', emailData);
    }


    return {
        init,
        handleMenuAction,
        shareItem,
        prepareNotificationEmail
    };
})();