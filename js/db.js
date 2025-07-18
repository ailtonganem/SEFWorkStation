// js/db.js - Lógica de interação com o IndexedDB
// v66.0 - NOVO: Backup agora inclui um bloco de metadados com versão, data e hash SHA-256 para validação de integridade. A exportação de dados agora é dinâmica, lendo todas as stores do DB por padrão.
// v65.0 - REATORADO: Removida toda a lógica de armazenamento em sistema de arquivos (File System Access API). A aplicação agora utiliza exclusivamente o IndexedDB para persistência de dados, alinhado com a migração para a web.
// ... (histórico anterior omitido)

const DB_NAME = 'SEFWorkStationDB';
const DB_VERSION = 61; 
const METADATA_STORE_NAME = 'metadata';
const DOCUMENTS_STORE_NAME = 'documents';
const ATTACHMENTS_STORE_NAME = 'attachments';
const DOCUMENT_TYPES_STORE_NAME = 'documentTypes';
const DOCUMENT_CATEGORIES_STORE_NAME = 'documentCategories';
const DOCUMENT_TAGS_STORE_NAME = 'documentTags';
const CONTRIBUINTES_STORE_NAME = 'contribuintes';
const CONTRIBUINTES_PLACEHOLDERS_STORE_NAME = 'contribuintesPlaceholdersStore';
const RECURSOS_STORE_NAME = 'recursos';
const BACKUPS_STORE_NAME = 'backups';
const LOTES_DE_DOCUMENTOS_STORE_NAME = 'lotesDeDocumentosStore';
const CONTRIBUINTE_CATEGORIES_STORE_NAME = 'contribuinteCategories';
const CONTRIBUINTE_TAGS_STORE_NAME = 'contribuinteTags';
const NOTAS_RAPIDAS_STORE_NAME = 'notasRapidasStore';
const NOTAS_RAPIDAS_TAGS_STORE_NAME = 'notasRapidasTagsStore';
const NOTAS_RAPIDAS_CATEGORIES_STORE_NAME = 'notasRapidasCategoriesStore';
const TAREFAS_STORE_NAME = 'tarefasStore';
const PROTOCOLOS_STORE_NAME = 'protocolosStore';
const PROTOCOL_TYPES_STORE_NAME = 'protocolTypesStore';
const PTAS_STORE_NAME = 'ptasStore';
const PTA_TYPES_STORE_NAME = 'ptaTypesStore';
const AUTUACOES_STORE_NAME = 'autuacoesStore';
const AUTUACAO_TYPES_STORE_NAME = 'autuacaoTypesStore';
const SERVIDORES_STORE_NAME = 'servidoresStore';
const SERVIDORES_GRUPOS_STORE_NAME = 'servidoresGruposStore';
const COMUNICACAO_DESTINATARIOS_STORE_NAME = 'comunicacaoDestinatariosStore';
const COMUNICACAO_GRUPOS_STORE_NAME = 'comunicacaoGruposStore';
const COMUNICACAO_EMAILS_GERADOS_STORE_NAME = 'comunicacaoEmailsGeradosStore';
const SHARING_HISTORY_STORE_NAME = 'sharingHistoryStore';
const SEQUENCES_STORE_NAME = 'sequences';
const ITCD_CONFIGURACOES_STORE_NAME = 'itcdConfiguracoesStore';
const ITCD_AVALIACOES_STORE_NAME = 'itcdAvaliacoesStore';
const ITCD_SEMOVENTES_PAUTAS_STORE_NAME = 'itcdSemoventesPautasStore';
const ITCD_VEICULOS_FIPE_MARCAS_STORE_NAME = 'itcdVeiculosFipeMarcas';
const ITCD_VEICULOS_FIPE_MODELOS_STORE_NAME = 'itcdVeiculosFipeModelos';
const ITCD_VEICULOS_FIPE_ANOS_STORE_NAME = 'itcdVeiculosFipeAnos';
const ITCD_VEICULOS_FIPE_VALORES_STORE_NAME = 'itcdVeiculosFipeValores';
const ITCD_CALCULOS_STORE_NAME = 'itcdCalculosStore';
const ITCD_SELIC_INDICES_STORE_NAME = 'itcdSelicIndicesStore';
const USER_PREFERENCES_STORE_NAME = 'userPreferencesStore'; 

const APP_DATA_FILE_NAME = 'SEFWorkStation_base_de_dados.json';
const LOCAL_STORAGE_LAST_DATA_MODIFICATION_KEY = 'sefWorkstationLastDataModification';
const FALLBACK_MAX_AUTO_BACKUPS = 5;

let db;
let dbInitializationPromise = null;

// --- FUNÇÕES HELPER ---

/**
 * Calcula o hash SHA-256 de uma string de dados.
 * @param {string} dataString - A string a ser hasheada.
 * @returns {Promise<string>} O hash em formato hexadecimal.
 */
async function _calculateDataHash(dataString) {
    if (!crypto.subtle) {
        console.warn("Crypto API não disponível. Não foi possível gerar o hash de integridade.");
        return null;
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(dataString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}


async function updateLastDataModificationTimestamp() {
    try {
        localStorage.setItem(LOCAL_STORAGE_LAST_DATA_MODIFICATION_KEY, Date.now().toString());
        if (window.SEFWorkStation && window.SEFWorkStation.App && typeof window.SEFWorkStation.App.updateBackupStatusDisplay === 'function') {
            await window.SEFWorkStation.App.updateBackupStatusDisplay();
        }
    } catch (e) { /* ignora */ }
}

function initDB() {
    if (dbInitializationPromise) {
        return dbInitializationPromise;
    }

    const TIMEOUT_DURATION = 15000; 

    dbInitializationPromise = new Promise((resolve, reject) => {
        let request;
        const timeoutId = setTimeout(() => {
            dbInitializationPromise = null; 
            console.warn("DB.JS: Timeout ao inicializar o IndexedDB.");
            const errorMsg = "Timeout na inicialização do banco de dados. O banco de dados não respondeu em " + (TIMEOUT_DURATION / 1000) + " segundos. Verifique as permissões, tente limpar os dados do site ou feche outras abas da aplicação.";
            if (window.SEFWorkStation && window.SEFWorkStation.App && typeof window.SEFWorkStation.App.showGlobalFeedback === 'function') {
                 window.SEFWorkStation.App.showGlobalFeedback(errorMsg, "error", null, 0);
            }
            reject(new Error(errorMsg));
        }, TIMEOUT_DURATION);

        try {
            request = indexedDB.open(DB_NAME, DB_VERSION);
        } catch (e) {
            clearTimeout(timeoutId);
            dbInitializationPromise = null;
            reject(e);
            return;
        }

        request.onupgradeneeded = function(event) {
            db = event.target.result;
            const transaction = event.target.transaction;
            
            // --- CRIAÇÃO DE STORES ---
            if (!db.objectStoreNames.contains(USER_PREFERENCES_STORE_NAME)) {
                console.log("DB.JS: Criando a object store 'userPreferencesStore'.");
                db.createObjectStore(USER_PREFERENCES_STORE_NAME, { keyPath: 'key' });
            }
            if (!db.objectStoreNames.contains(ITCD_CONFIGURACOES_STORE_NAME)) {
                console.log("DB.JS: Criando a object store 'itcdConfiguracoesStore'.");
                db.createObjectStore(ITCD_CONFIGURACOES_STORE_NAME, { keyPath: 'key' });
            }
            if (!db.objectStoreNames.contains(ITCD_SELIC_INDICES_STORE_NAME)) {
                console.log("DB.JS: Criando a object store 'itcdSelicIndicesStore'.");
                db.createObjectStore(ITCD_SELIC_INDICES_STORE_NAME, { keyPath: 'key' });
            }
            if (!db.objectStoreNames.contains(ITCD_SEMOVENTES_PAUTAS_STORE_NAME)) {
                db.createObjectStore(ITCD_SEMOVENTES_PAUTAS_STORE_NAME, { keyPath: 'key' });
            }
            if (!db.objectStoreNames.contains(ITCD_VEICULOS_FIPE_MARCAS_STORE_NAME)) {
                const marcasStore = db.createObjectStore(ITCD_VEICULOS_FIPE_MARCAS_STORE_NAME, { keyPath: 'codigo' });
                marcasStore.createIndex('nome', 'nome', { unique: false });
            }
            if (!db.objectStoreNames.contains(ITCD_VEICULOS_FIPE_MODELOS_STORE_NAME)) {
                const modelosStore = db.createObjectStore(ITCD_VEICULOS_FIPE_MODELOS_STORE_NAME, { keyPath: 'codigo' });
                modelosStore.createIndex('nome', 'nome', { unique: false });
                modelosStore.createIndex('marcaCodigo', 'marcaCodigo', { unique: false });
            }
            if (!db.objectStoreNames.contains(ITCD_VEICULOS_FIPE_ANOS_STORE_NAME)) {
                const anosStore = db.createObjectStore(ITCD_VEICULOS_FIPE_ANOS_STORE_NAME, { keyPath: 'codigo' });
                anosStore.createIndex('nome', 'nome', { unique: false });
                anosStore.createIndex('modeloCodigo', 'modeloCodigo', { unique: false });
            }
            if (!db.objectStoreNames.contains(ITCD_VEICULOS_FIPE_VALORES_STORE_NAME)) {
                const valoresStore = db.createObjectStore(ITCD_VEICULOS_FIPE_VALORES_STORE_NAME, { keyPath: 'fipeId' });
                valoresStore.createIndex('marcaCodigo', 'marcaCodigo', { unique: false });
                valoresStore.createIndex('modeloCodigo', 'modeloCodigo', { unique: false });
                valoresStore.createIndex('anoCodigo', 'anoCodigo', { unique: false });
            }

            let avaliacoesStore;
            if (!db.objectStoreNames.contains(ITCD_AVALIACOES_STORE_NAME)) {
                avaliacoesStore = db.createObjectStore(ITCD_AVALIACOES_STORE_NAME, { keyPath: 'id' });
            } else {
                avaliacoesStore = transaction.objectStore(ITCD_AVALIACOES_STORE_NAME);
            }
            const avaliacoesIndices = [{ name: 'declaracao', unique: false }, { name: 'dataAvaliacao', unique: false }, { name: 'municipio', unique: false }, { name: 'responsavelMasp', unique: false }, { name: 'vinculosAvaliacoesIds', unique: false, multiEntry: true }, { name: 'documentosVinculadosIds', unique: false, multiEntry: true }, { name: 'contribuintesVinculadosIds', unique: false, multiEntry: true }, { name: 'recursosVinculadosIds', unique: false, multiEntry: true }];
            avaliacoesIndices.forEach(idx => { if (!avaliacoesStore.indexNames.contains(idx.name)) avaliacoesStore.createIndex(idx.name, idx.name, { unique: idx.unique, multiEntry: !!idx.multiEntry }); });

            let calculosStore;
            if (!db.objectStoreNames.contains(ITCD_CALCULOS_STORE_NAME)) {
                calculosStore = db.createObjectStore(ITCD_CALCULOS_STORE_NAME, { keyPath: 'id', autoIncrement: false });
            } else {
                calculosStore = transaction.objectStore(ITCD_CALCULOS_STORE_NAME);
            }
            const calculosIndices = [{ name: 'tipoCalculo', unique: false }, { name: 'declaracaoNumero', unique: false }, { name: 'deCujusNome', unique: false }, { name: 'dataFatoGerador', unique: false }, { name: 'dataSalvamento', unique: false }];
            calculosIndices.forEach(idx => { if (!calculosStore.indexNames.contains(idx.name)) calculosStore.createIndex(idx.name, idx.name, { unique: idx.unique }); });

            if (db.objectStoreNames.contains(SHARING_HISTORY_STORE_NAME)) {
                const store = transaction.objectStore(SHARING_HISTORY_STORE_NAME);
                if (store.keyPath !== 'shareId') db.deleteObjectStore(SHARING_HISTORY_STORE_NAME);
            }
            if (!db.objectStoreNames.contains(SHARING_HISTORY_STORE_NAME)) {
                const sharingHistoryStore = db.createObjectStore(SHARING_HISTORY_STORE_NAME, { keyPath: 'shareId' });
                sharingHistoryStore.createIndex('timestamp', 'timestamp', { unique: false });
                sharingHistoryStore.createIndex('senderId', 'sender.id', { unique: false });
                sharingHistoryStore.createIndex('entityId', 'entityId', { unique: false });
            }
            if (!db.objectStoreNames.contains(METADATA_STORE_NAME)) { db.createObjectStore(METADATA_STORE_NAME, { keyPath: 'key' }); }
            if (!db.objectStoreNames.contains(SEQUENCES_STORE_NAME)) { db.createObjectStore(SEQUENCES_STORE_NAME, { keyPath: 'sequenceName' }); }
            if (!db.objectStoreNames.contains(BACKUPS_STORE_NAME)) {
                const backupStore = db.createObjectStore(BACKUPS_STORE_NAME, { keyPath: 'id', autoIncrement: true });
                backupStore.createIndex('backupDate', 'backupDate', { unique: false });
                backupStore.createIndex('type', 'type', { unique: false });
            }
            let docStore;
            if (!db.objectStoreNames.contains(DOCUMENTS_STORE_NAME)) { docStore = db.createObjectStore(DOCUMENTS_STORE_NAME, { keyPath: 'id', autoIncrement: false }); } else { docStore = transaction.objectStore(DOCUMENTS_STORE_NAME); }
            const docIndices = [{ name: 'title', unique: false }, { name: 'docType', unique: false }, { name: 'categories', unique: false, multiEntry: true }, { name: 'tags', unique: false, multiEntry: true }, { name: 'creationDate', unique: false }, { name: 'modificationDate', unique: false }, { name: 'isDeleted', unique: false }, { name: 'isTemplate', unique: false }, { name: 'isFavorite', unique: false }, { name: 'reference', unique: false }, { name: 'contribuintesVinculadosIds', unique: false, multiEntry: true }, { name: 'recursosVinculadosIds', unique: false, multiEntry: true }, { name: 'notasRapidasRelacionadasIds', unique: false, multiEntry: true }, { name: 'tarefasVinculadasIds', unique: false, multiEntry: true }, { name: 'protocolosOriginariosIds', unique: false, multiEntry: true }, { name: 'ptasOriginariosIds', unique: false, multiEntry: true }, { name: 'autuacoesOriginariasIds', unique: false, multiEntry: true }, { name: 'servidoresVinculadosIds', unique: false, multiEntry: true }, { name: 'isArchivedVersion', unique: false }, { name: 'versionOf', unique: false }, { name: 'avaliacoesVinculadasIds', unique: false, multiEntry: true }];
            docIndices.forEach(idx => { if (!docStore.indexNames.contains(idx.name)) docStore.createIndex(idx.name, idx.name, { unique: idx.unique, multiEntry: !!idx.multiEntry }); });
            const configStoresDoc = [{ name: DOCUMENT_TYPES_STORE_NAME, indexField: 'name', unique: true }, { name: DOCUMENT_CATEGORIES_STORE_NAME, indexField: 'name', unique: true }, { name: DOCUMENT_TAGS_STORE_NAME, indexField: 'name', unique: true }];
            configStoresDoc.forEach(storeConfig => { let store; if (!db.objectStoreNames.contains(storeConfig.name)) { store = db.createObjectStore(storeConfig.name, { keyPath: 'id', autoIncrement: false }); } else { store = transaction.objectStore(storeConfig.name); } if (!store.indexNames.contains(storeConfig.indexField)) { store.createIndex(storeConfig.indexField, storeConfig.indexField, { unique: storeConfig.unique }); } });
            if (!db.objectStoreNames.contains(LOTES_DE_DOCUMENTOS_STORE_NAME)){ const lotesStore = db.createObjectStore(LOTES_DE_DOCUMENTOS_STORE_NAME, { keyPath: 'id', autoIncrement: false }); lotesStore.createIndex('nomeLote', 'nomeLote', { unique: false }); lotesStore.createIndex('dataGeracao', 'dataGeracao', { unique: false }); lotesStore.createIndex('modeloUsadoId', 'modeloUsadoId', { unique: false }); lotesStore.createIndex('statusDaGeracao', 'statusDaGeracao', { unique: false }); }
            let attachmentsStore; if (!db.objectStoreNames.contains(ATTACHMENTS_STORE_NAME)) { attachmentsStore = db.createObjectStore(ATTACHMENTS_STORE_NAME, { keyPath: 'id', autoIncrement: true }); } else { attachmentsStore = transaction.objectStore(ATTACHMENTS_STORE_NAME); } if (!attachmentsStore.indexNames.contains('ownerId_type_fileName')) attachmentsStore.createIndex('ownerId_type_fileName', ['ownerId', 'ownerType', 'fileName'], { unique: true }); if (!attachmentsStore.indexNames.contains('ownerId_type')) attachmentsStore.createIndex('ownerId_type', ['ownerId', 'ownerType'], { unique: false });
            let contribuintesStore; if (!db.objectStoreNames.contains(CONTRIBUINTES_STORE_NAME)) { contribuintesStore = db.createObjectStore(CONTRIBUINTES_STORE_NAME, { keyPath: 'id', autoIncrement: false }); } else { contribuintesStore = transaction.objectStore(CONTRIBUINTES_STORE_NAME); } const contribIndices = [{ name: 'nome', unique: false }, { name: 'cpfCnpj', unique: false }, { name: 'numeroIdentificacao', unique: true }, { name: 'categories', unique: false, multiEntry: true }, { name: 'tags', unique: false, multiEntry: true }, { name: 'documentosRelacionadosIds', unique: false, multiEntry: true }, { name: 'recursosRelacionadosIds', unique: false, multiEntry: true }, { name: 'notasRapidasRelacionadasIds', unique: false, multiEntry: true }, { name: 'tarefasRelacionadasIds', unique: false, multiEntry: true }, { name: 'protocolosRelacionadosIds', unique: false, multiEntry: true }, { name: 'ptasRelacionadosIds', unique: false, multiEntry: true }, { name: 'autuacoesRelacionadasIds', unique: false, multiEntry: true }, { name: 'isDeleted', unique: false }, { name: 'matrizId', unique: false, multiEntry: false }, { name: 'avaliacoesVinculadasIds', unique: false, multiEntry: true }]; contribIndices.forEach(idx => { if (!contribuintesStore.indexNames.contains(idx.name)) contribuintesStore.createIndex(idx.name, idx.name, { unique: idx.unique, multiEntry: !!idx.multiEntry }); });
            const configStoresContrib = [{ name: CONTRIBUINTE_CATEGORIES_STORE_NAME, indexField: 'name', unique: true }, { name: CONTRIBUINTE_TAGS_STORE_NAME, indexField: 'name', unique: true }, { name: CONTRIBUINTES_PLACEHOLDERS_STORE_NAME, indexField: 'nomePlaceholderNormalizado', unique: true }]; configStoresContrib.forEach(storeConfig => { let store; if (!db.objectStoreNames.contains(storeConfig.name)) { store = db.createObjectStore(storeConfig.name, { keyPath: 'id', autoIncrement: false }); } else { store = transaction.objectStore(storeConfig.name); } if (!store.indexNames.contains(storeConfig.indexField)) { store.createIndex(storeConfig.indexField, storeConfig.indexField, { unique: storeConfig.unique }); } });
            let recursosStore; if (!db.objectStoreNames.contains(RECURSOS_STORE_NAME)) { recursosStore = db.createObjectStore(RECURSOS_STORE_NAME, { keyPath: 'id', autoIncrement: false }); } else { recursosStore = transaction.objectStore(RECURSOS_STORE_NAME); } const recursosIndices = [{ name: 'titulo', unique: false }, { name: 'numeroIdentificacao', unique: true }, { name: 'contribuintePrincipalId', unique: false }, { name: 'dataEntrada', unique: false }, { name: 'statusRecurso', unique: false }, { name: 'tipoRecurso', unique: false }, { name: 'dataCriacao', unique: false }, { name: 'dataModificacao', unique: false }, { name: 'documentosVinculadosIds', unique: false, multiEntry: true }, { name: 'dataPrazo', unique: false }, { name: 'prioridade', unique: false }, { name: 'responsavelId', unique: false }, { name: 'tarefasVinculadasIds', unique: false, multiEntry: true }, { name: 'contribuintesVinculadosIds', unique: false, multiEntry: true }, { name: 'notasRapidasVinculadasIds', unique: false, multiEntry: true }, { name: 'protocolosVinculadosIds', unique: false, multiEntry: true }, { name: 'ptasVinculadosIds', unique: false, multiEntry: true }, { name: 'autuacoesVinculadosIds', unique: false, multiEntry: true }, { name: 'isDeleted', unique: false }, { name: 'avaliacoesVinculadasIds', unique: false, multiEntry: true }]; recursosIndices.forEach(idx => { if (!recursosStore.indexNames.contains(idx.name)) recursosStore.createIndex(idx.name, idx.name, { unique: idx.unique, multiEntry: !!idx.multiEntry }); });
            let notasRapidasStore; if (!db.objectStoreNames.contains(NOTAS_RAPIDAS_STORE_NAME)) { notasRapidasStore = db.createObjectStore(NOTAS_RAPIDAS_STORE_NAME, { keyPath: 'id', autoIncrement: false }); } else { notasRapidasStore = transaction.objectStore(NOTAS_RAPIDAS_STORE_NAME); } const notasIndices = [{ name: 'titulo', unique: false}, { name: 'dataCriacao', unique: false}, { name: 'dataModificacao', unique: false }, { name: 'isFavorita', unique: false }, { name: 'tags', unique: false, multiEntry: true }, { name: 'categories', unique: false, multiEntry: true }, { name: 'isExcluida', unique: false }, { name: 'documentosRelacionadosIds', unique: false, multiEntry: true }, { name: 'contribuintesRelacionadosIds', unique: false, multiEntry: true }, { name: 'recursosRelacionadosIds', unique: false, multiEntry: true }, { name: 'tarefasRelacionadasIds', unique: false, multiEntry: true }, { name: 'protocolosRelacionadosIds', unique: false, multiEntry: true }, { name: 'ptasRelacionadosIds', unique: false, multiEntry: true }, { name: 'autuacoesRelacionadasIds', unique: false, multiEntry: true }, { name: 'servidoresVinculadosIds', unique: false, multiEntry: true }, { name: 'isArchivedVersion', unique: false }, { name: 'versionOf', unique: false }, { name: 'avaliacoesVinculadasIds', unique: false, multiEntry: true }]; notasIndices.forEach(idx => { if (!notasRapidasStore.indexNames.contains(idx.name)) notasRapidasStore.createIndex(idx.name, idx.name, { unique: idx.unique, multiEntry: !!idx.multiEntry }); }); if (!db.objectStoreNames.contains(NOTAS_RAPIDAS_TAGS_STORE_NAME)) { const storeTags = db.createObjectStore(NOTAS_RAPIDAS_TAGS_STORE_NAME, { keyPath: 'id', autoIncrement: false }); if (!storeTags.indexNames.contains('name')) storeTags.createIndex('name', 'name', { unique: true }); } if (!db.objectStoreNames.contains(NOTAS_RAPIDAS_CATEGORIES_STORE_NAME)) { const storeCategorias = db.createObjectStore(NOTAS_RAPIDAS_CATEGORIES_STORE_NAME, { keyPath: 'id', autoIncrement: false }); if (!storeCategorias.indexNames.contains('name')) storeCategorias.createIndex('name', 'name', { unique: true }); }
            let tarefasStore; if (!db.objectStoreNames.contains(TAREFAS_STORE_NAME)) { tarefasStore = db.createObjectStore(TAREFAS_STORE_NAME, { keyPath: 'id', autoIncrement: false }); } else { tarefasStore = transaction.objectStore(TAREFAS_STORE_NAME); } const tarefasIndices = [{ name: 'numeroIdentificacao', unique: true }, { name: 'titulo', unique: false }, { name: 'status', unique: false }, { name: 'prioridade', unique: false }, { name: 'dataCriacao', unique: false }, { name: 'dataModificacao', unique: false }, { name: 'dataVencimento', unique: false }, { name: 'dataConclusao', unique: false }, { name: 'servidorResponsavelId', unique: false }, { name: 'tags', unique: false, multiEntry: true }, { name: 'isExcluida', unique: false }, { name: 'documentosVinculadosIds', unique: false, multiEntry: true }, { name: 'contribuintesVinculadosIds', unique: false, multiEntry: true }, { name: 'recursosVinculadosIds', unique: false, multiEntry: true }, { name: 'notasRapidasVinculadasIds', unique: false, multiEntry: true }, { name: 'protocolosVinculadosIds', unique: false, multiEntry: true }, { name: 'ptasVinculadosIds', unique: false, multiEntry: true }, { name: 'autuacoesVinculadosIds', unique: false, multiEntry: true }, { name: 'servidoresVinculadosIds', unique: false, multiEntry: true }, { name: 'avaliacoesVinculadasIds', unique: false, multiEntry: true }]; tarefasIndices.forEach(idx => { if (idx.name === 'servidorResponsavelId' && tarefasStore.indexNames.contains('responsavelId')) { tarefasStore.deleteIndex('responsavelId'); } if (!tarefasStore.indexNames.contains(idx.name)) tarefasStore.createIndex(idx.name, idx.name, { unique: idx.unique, multiEntry: !!idx.multiEntry }); });
            const storesProcessosConfig = [{ name: PROTOCOLOS_STORE_NAME, keyPath: 'id', autoIncrement: false, indices: [{ name: 'numeroProtocolo', unique: true }, { name: 'dataProtocolo', unique: false }, { name: 'assuntoProtocolo', unique: false }, { name: 'statusProtocolo', unique: false }, { name: 'tipoProtocoloId', unique: false}, { name: 'dataCriacao', unique: false }, { name: 'dataModificacao', unique: false }, { name: 'servidorResponsavelId', unique: false }, { name: 'documentosVinculadosIds', unique: false, multiEntry: true }, { name: 'contribuintesVinculadosIds', unique: false, multiEntry: true }, { name: 'tarefasVinculadasIds', unique: false, multiEntry: true }, { name: 'notasRapidasRelacionadasIds', unique: false, multiEntry: true }, { name: 'ptasGeradosIds', unique: false, multiEntry: true }, { name: 'autuacoesGeradasIds', unique: false, multiEntry: true }, { name: 'isDeleted', unique: false }, { name: 'servidoresVinculadosIds', unique: false, multiEntry: true }, { name: 'avaliacoesVinculadasIds', unique: false, multiEntry: true }]}, { name: PTAS_STORE_NAME, keyPath: 'id', autoIncrement: false, indices: [{ name: 'numeroPTA', unique: true }, { name: 'dataPTA', unique: false }, { name: 'assuntoPTA', unique: false }, { name: 'statusPTA', unique: false }, { name: 'tipoPTAId', unique: false}, { name: 'dataCriacao', unique: false }, { name: 'dataModificacao', unique: false }, { name: 'servidorResponsavelId', unique: false }, { name: 'documentosVinculadosIds', unique: false, multiEntry: true }, { name: 'contribuintesVinculadosIds', unique: false, multiEntry: true }, { name: 'tarefasVinculadasIds', unique: false, multiEntry: true }, { name: 'notasRapidasRelacionadasIds', unique: false, multiEntry: true }, { name: 'protocolosOriginariosIds', unique: false, multiEntry: true }, { name: 'autuacoesGeradasIds', unique: false, multiEntry: true }, { name: 'isDeleted', unique: false }, { name: 'servidoresVinculadosIds', unique: false, multiEntry: true }, { name: 'avaliacoesVinculadasIds', unique: false, multiEntry: true }]}, { name: AUTUACOES_STORE_NAME, keyPath: 'id', autoIncrement: false, indices: [{ name: 'numeroAutuacao', unique: true }, { name: 'dataAutuacao', unique: false }, { name: 'assuntoAutuacao', unique: false }, { name: 'statusAutuacao', unique: false }, { name: 'tipoAutuacaoId', unique: false}, { name: 'dataCriacao', unique: false }, { name: 'dataModificacao', unique: false }, { name: 'servidorResponsavelId', unique: false }, { name: 'documentosVinculadosIds', unique: false, multiEntry: true }, { name: 'contribuintesVinculadosIds', unique: false, multiEntry: true }, { name: 'tarefasVinculadasIds', unique: false, multiEntry: true }, { name: 'notasRapidasRelacionadasIds', unique: false, multiEntry: true }, { name: 'ptasOriginariosIds', unique: false, multiEntry: true }, { name: 'isDeleted', unique: false }, { name: 'servidoresVinculadosIds', unique: false, multiEntry: true }, { name: 'avaliacoesVinculadasIds', unique: false, multiEntry: true }] }]; storesProcessosConfig.forEach(storeConfig => { let store; if (!db.objectStoreNames.contains(storeConfig.name)) { store = db.createObjectStore(storeConfig.name, { keyPath: storeConfig.keyPath, autoIncrement: storeConfig.autoIncrement }); } else { store = transaction.objectStore(storeConfig.name); } storeConfig.indices.forEach(idx => { if (!store.indexNames.contains(idx.name)) { store.createIndex(idx.name, idx.name, { unique: idx.unique, multiEntry: !!idx.multiEntry }); } }); }); const configStoresProcessosTipos = [{ name: PROTOCOL_TYPES_STORE_NAME, indexField: 'name', unique: true }, { name: PTA_TYPES_STORE_NAME, indexField: 'name', unique: true }, { name: AUTUACAO_TYPES_STORE_NAME, indexField: 'name', unique: true }]; configStoresProcessosTipos.forEach(storeConfig => { let store; if (!db.objectStoreNames.contains(storeConfig.name)) { store = db.createObjectStore(storeConfig.name, { keyPath: 'id', autoIncrement: false }); } else { store = transaction.objectStore(storeConfig.name); } if (!store.indexNames.contains(storeConfig.indexField)) { store.createIndex(storeConfig.indexField, storeConfig.indexField, { unique: storeConfig.unique }); } });
            let servidoresStore; if (!db.objectStoreNames.contains(SERVIDORES_STORE_NAME)) { servidoresStore = db.createObjectStore(SERVIDORES_STORE_NAME, { keyPath: 'id', autoIncrement: false }); } else { servidoresStore = transaction.objectStore(SERVIDORES_STORE_NAME); } const servidoresIndices = [{ name: 'nome', unique: false }, { name: 'matricula', unique: true }, { name: 'email', unique: false }, { name: 'status', unique: false }, { name: 'setorLotacao', unique: false }, { name: 'isDeleted', unique: false }, { name: 'documentosVinculadosIds', unique: false, multiEntry: true }, { name: 'tarefasVinculadasIds', unique: false, multiEntry: true }, { name: 'notasRapidasVinculadasIds', unique: false, multiEntry: true }, { name: 'protocolosVinculadosIds', unique: false, multiEntry: true}, { name: 'ptasVinculadosIds', unique: false, multiEntry: true}, { name: 'autuacoesVinculadosIds', unique: false, multiEntry: true}, { name: 'avaliacoesVinculadasIds', unique: false, multiEntry: true }]; servidoresIndices.forEach(idx => { if (!servidoresStore.indexNames.contains(idx.name)) servidoresStore.createIndex(idx.name, idx.name, { unique: idx.unique, multiEntry: !!idx.multiEntry }); });
            if (!db.objectStoreNames.contains(SERVIDORES_GRUPOS_STORE_NAME)) { const servidoresGruposStore = db.createObjectStore(SERVIDORES_GRUPOS_STORE_NAME, { keyPath: 'id', autoIncrement: false }); servidoresGruposStore.createIndex('nomeGrupo', 'nomeGrupo', { unique: true }); servidoresGruposStore.createIndex('idsServidoresMembros', 'idsServidoresMembros', { unique: false, multiEntry: true }); servidoresGruposStore.createIndex('isDeleted', 'isDeleted', { unique: false }); }
            if (!db.objectStoreNames.contains(COMUNICACAO_DESTINATARIOS_STORE_NAME)) { const destinatariosStore = db.createObjectStore(COMUNICACAO_DESTINATARIOS_STORE_NAME, { keyPath: 'id', autoIncrement: false }); destinatariosStore.createIndex('nome', 'nome', { unique: false }); destinatariosStore.createIndex('email', 'email', { unique: true }); destinatariosStore.createIndex('empresa', 'empresa', { unique: false }); destinatariosStore.createIndex('isDeleted', 'isDeleted', { unique: false }); } if (!db.objectStoreNames.contains(COMUNICACAO_GRUPOS_STORE_NAME)) { const gruposComStore = db.createObjectStore(COMUNICACAO_GRUPOS_STORE_NAME, { keyPath: 'id', autoIncrement: false }); gruposComStore.createIndex('nomeGrupo', 'nomeGrupo', { unique: true }); gruposComStore.createIndex('idsDestinatariosMembros', 'idsDestinatariosMembros', { unique: false, multiEntry: true }); gruposComStore.createIndex('emailsAvulsosMembros', 'emailsAvulsosMembros', { unique: false, multiEntry: true }); gruposComStore.createIndex('isDeleted', 'isDeleted', { unique: false }); } if (!db.objectStoreNames.contains(COMUNICACAO_EMAILS_GERADOS_STORE_NAME)) { const emailsGeradosStore = db.createObjectStore(COMUNICACAO_EMAILS_GERADOS_STORE_NAME, { keyPath: 'id', autoIncrement: false }); emailsGeradosStore.createIndex('assunto', 'assunto', { unique: false }); emailsGeradosStore.createIndex('dataGeracao', 'dataGeracao', { unique: false }); emailsGeradosStore.createIndex('status', 'status', { unique: false }); emailsGeradosStore.createIndex('nomeArquivoEML', 'nomeArquivoEML', { unique: false }); emailsGeradosStore.createIndex('idEntidadeOrigem', 'idEntidadeOrigem', { unique: false }); emailsGeradosStore.createIndex('tipoEntidadeOrigem', 'tipoEntidadeOrigem', { unique: false }); emailsGeradosStore.createIndex('isDeleted', 'isDeleted', { unique: false }); }
            
            // --- LÓGICA DE MIGRAÇÃO ---
            const configStoreSelic = transaction.objectStore(ITCD_CONFIGURACOES_STORE_NAME);
            const selicStoreNew = transaction.objectStore(ITCD_SELIC_INDICES_STORE_NAME);
            const getReqSelic = configStoreSelic.get('selicIndices');
            getReqSelic.onsuccess = () => {
                const oldSelicData = getReqSelic.result;
                if (oldSelicData && oldSelicData.value && typeof oldSelicData.value === 'object') {
                    console.log("DB.JS: Migrando dados da SELIC para a nova estrutura...");
                    const mesesMap = {"jan": 1, "fev": 2, "mar": 3, "abr": 4, "mai": 5, "jun": 6, "jul": 7, "ago": 8, "set": 9, "out": 10, "nov": 11, "dez": 12};
                    for (const ano in oldSelicData.value) {
                        for (const mesAbrev in oldSelicData.value[ano]) {
                            const mesNum = mesesMap[mesAbrev];
                            if (mesNum) {
                                const key = `${ano}-${String(mesNum).padStart(2, '0')}`;
                                const valor = oldSelicData.value[ano][mesAbrev];
                                selicStoreNew.put({ key: key, valor: valor });
                            }
                        }
                    }
                    console.log("DB.JS: Migração da SELIC concluída.");
                }
            };
            getReqSelic.onerror = (e) => console.error("DB.JS: Erro ao ler dados antigos da SELIC para migração.", e);

            const prefsStoreNew = transaction.objectStore(USER_PREFERENCES_STORE_NAME);
            const USER_PREFERENCES_KEY_LS = 'sefWorkstationUserPreferences';
            const USER_THEME_COLORS_KEY_LS = 'sefWorkstationUserThemeColors';

            try {
                const generalPrefsString = localStorage.getItem(USER_PREFERENCES_KEY_LS);
                if (generalPrefsString) {
                    const generalPrefs = JSON.parse(generalPrefsString);
                    prefsStoreNew.put({ key: 'general', value: generalPrefs });
                    console.log("DB.JS: Preferências gerais migradas do localStorage para o IndexedDB.");
                }
            } catch (e) { console.error("DB.JS: Erro ao migrar preferências gerais:", e); }
            
            try {
                const themeColorsString = localStorage.getItem(USER_THEME_COLORS_KEY_LS);
                if (themeColorsString) {
                    const themeColors = JSON.parse(themeColorsString);
                    prefsStoreNew.put({ key: 'themeColors', value: themeColors });
                    console.log("DB.JS: Cores do tema migradas do localStorage para o IndexedDB.");
                }
            } catch (e) { console.error("DB.JS: Erro ao migrar cores do tema:", e); }
        };

        request.onsuccess = function(event) {
            clearTimeout(timeoutId);
            db = event.target.result;
            resolve(db);
        };
        request.onerror = function(event) {
            clearTimeout(timeoutId);
            dbInitializationPromise = null;
            console.error("DB.JS: Erro crítico ao abrir/atualizar banco de dados:", event.target.error);
            reject(event.target.error);
        };
        request.onblocked = function(event) {
            clearTimeout(timeoutId);
            dbInitializationPromise = null;
            alert("A inicialização do SEFWorkStation foi bloqueada. Feche outras abas que possam estar usando a aplicação e recarregue a página.");
            reject(new Error("Abertura do banco de dados bloqueada."));
        };
    });
    return dbInitializationPromise;
}

async function addItem(storeName, item) {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(item);
            request.onsuccess = async () => {
                await updateLastDataModificationTimestamp();
                resolve(request.result);
            };
            request.onerror = (event) => reject(event.target.error);
        } catch (e) { reject(e); }
    });
}

async function getItemById(storeName, id) {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        } catch (e) { reject(e); }
    });
}

async function getAllItems(storeName) {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        } catch (e) { reject(e); }
    });
}

async function updateItem(storeName, item) {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(item);
            request.onsuccess = async () => {
                await updateLastDataModificationTimestamp();
                resolve(request.result);
            };
            request.onerror = (event) => reject(event.target.error);
        } catch (e) { reject(e); }
    });
}

async function deleteItem(storeName, id) {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);
            request.onsuccess = async () => {
                await updateLastDataModificationTimestamp();
                resolve(); 
            };
            request.onerror = (event) => reject(event.target.error);
        } catch (e) { reject(e); }
    });
}

async function getItemsByIndex(storeName, indexName, query) {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction([storeName], "readonly");
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(query); 

            request.onsuccess = function() {
                resolve(request.result);
            };
            request.onerror = function(event) {
                reject(event.target.error);
            };
        } catch (e) { reject(e); }
    });
}

async function clearStore(storeName) {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();
            request.onsuccess = async () => {
                await updateLastDataModificationTimestamp();
                resolve();
            };
            request.onerror = (event) => reject(event.target.error);
        } catch (e) { reject(e); }
    });
}

async function clearAllStores() {
    if (!db) await initDB();
    const storeNames = Array.from(db.objectStoreNames);

    return new Promise((resolve, reject) => {
        if (storeNames.length === 0) {
            resolve();
            return;
        }
        const transaction = db.transaction(storeNames, 'readwrite');
        let clearPromises = [];
        storeNames.forEach(storeName => {
            const store = transaction.objectStore(storeName);
            const request = store.clear();
            clearPromises.push(new Promise((resolveClear, rejectClear) => {
                request.onsuccess = () => resolveClear();
                request.onerror = (event) => rejectClear(event.target.error);
            }));
        });
        Promise.all(clearPromises)
            .then(async () => {
                await updateLastDataModificationTimestamp();
                resolve();
            })
            .catch(reject);
        transaction.onerror = (event) => reject(event.target.error);
        transaction.onabort = (event) => reject(new Error("Transação de limpeza abortada: " + (event.target.error ? event.target.error.message : "Erro desconhecido")));
    });
}

async function exportAllDataToJson(storeNamesToInclude = null) {
    if (!db) await initDB();

    const dataToExport = {};
    let storesToProcess = (storeNamesToInclude && storeNamesToInclude.length > 0)
        ? storeNamesToInclude.filter(name => db.objectStoreNames.contains(name))
        : Array.from(db.objectStoreNames);

    if (storesToProcess.length === 0) {
        console.warn("DB.JS: exportAllDataToJson - Nenhuma store válida para exportar.");
        return {}; // Retorna um objeto vazio se não houver stores a processar
    }

    const transaction = db.transaction(storesToProcess, 'readonly');
    const promises = storesToProcess.map(storeName => {
        return new Promise((resolve, reject) => {
            const request = transaction.objectStore(storeName).getAll();
            request.onsuccess = () => resolve({ storeName, data: request.result });
            request.onerror = (event) => reject({ storeName, error: event.target.error });
        });
    });

    const results = await Promise.all(promises);
    results.forEach(result => {
        dataToExport[result.storeName] = result.data;
    });

    const dataString = JSON.stringify(dataToExport);
    const dataHash = await _calculateDataHash(dataString);

    const fullExportObject = {
        metadata: {
            appVersion: window.SEFWorkStation.App.APP_VERSION_DISPLAY || "N/A",
            exportDate: new Date().toISOString(),
            dataHash: dataHash
        },
        data: dataToExport
    };

    return fullExportObject;
}


async function importAllDataFromJson(jsonData, mode = 'replace') { 
    if (!db) await initDB();

    const storeNamesInJson = Object.keys(jsonData);
    const validStoreNames = storeNamesInJson.filter(name => db.objectStoreNames.contains(name));

    if (validStoreNames.length === 0) {
        return { success: true, errors: [], message: "Nenhuma store válida encontrada no JSON para importar." };
    }

    const transaction = db.transaction(validStoreNames, 'readwrite');
    let importErrors = [];
    let itemsAdded = 0;
    let itemsUpdated = 0; 

    for (const storeName of validStoreNames) {
        try {
            const store = transaction.objectStore(storeName);
            const itemsToImport = jsonData[storeName];

            if (mode === 'replace') {
                await new Promise((resolveClear, rejectClear) => {
                    const clearRequest = store.clear();
                    clearRequest.onsuccess = () => resolveClear();
                    clearRequest.onerror = (event) => {
                        importErrors.push({ store: storeName, action: 'clear', error: event.target.error.name });
                        rejectClear(event.target.error); 
                    };
                });
            }

            if (Array.isArray(itemsToImport)) {
                for (const item of itemsToImport) {
                    await new Promise(async (resolveOp) => { 
                        if (store.autoIncrement === false && storeName !== SEQUENCES_STORE_NAME && typeof item.id !== 'string') {
                             if (typeof item.id === 'number') { 
                                item.id = window.SEFWorkStation.App.generateUUID();
                            } else if (item.id === undefined || item.id === null) { 
                                item.id = window.SEFWorkStation.App.generateUUID();
                            }
                        }
                        
                        let itemToStore = item;
                        
                        if (mode === 'merge') {
                            try {
                                const putRequest = store.put(itemToStore);
                                putRequest.onsuccess = () => { itemsUpdated++; resolveOp(); };
                                putRequest.onerror = (event) => {
                                    importErrors.push({ store: storeName, action: 'merge_put', itemId: item.id || item.sequenceName || item.key, error: event.target.error.name });
                                    resolveOp(); 
                                };
                            } catch (e) { 
                                importErrors.push({ store: storeName, action: 'merge_put_exception', itemId: item.id || item.sequenceName || item.key, error: e.name || e.message });
                                resolveOp();
                            }
                        } else { 
                            const addRequest = store.add(itemToStore);
                            addRequest.onsuccess = () => { itemsAdded++; resolveOp(); };
                            addRequest.onerror = (event) => {
                                importErrors.push({ store: storeName, action: 'add', itemId: item.id || item.sequenceName || item.key, error: event.target.error.name });
                                resolveOp(); 
                            };
                        }
                    });
                }
            }
        } catch (error) {
            importErrors.push({ store: storeName, action: 'process_store', error: error.name || error.message });
        }
    }

    return new Promise(async (resolve, reject) => { 
        transaction.oncomplete = async () => { 
            await updateLastDataModificationTimestamp();
            const message = mode === 'merge' ?
                `Mesclagem concluída. Itens processados/atualizados: ${itemsUpdated}.` :
                `Importação (substituição) concluída. Itens adicionados: ${itemsAdded}.`;
            if (importErrors.length > 0) {
                resolve({ success: false, errors: importErrors, message: `${message} Erros: ${importErrors.length}` });
            } else {
                resolve({ success: true, errors: [], message: message });
            }
        };
        transaction.onerror = (event) => {
            importErrors.push({ store: 'transaction', action: 'commit', error: event.target.error.name });
            reject({ success: false, errors: importErrors, message: "Erro fatal na transação de importação." });
        };
    });
}


async function saveDatabaseToFile(showFeedbackCallback) {
    if (!db) await initDB();
    try {
        const dataToSave = await exportAllDataToJson(); 
        const jsonDataString = JSON.stringify(dataToSave, null, 2); 
        const blob = new Blob([jsonDataString], { type: 'application/json' });
        
        const triggerDownload = (blob, fileName) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        };
        
        triggerDownload(blob, APP_DATA_FILE_NAME);

        if (showFeedbackCallback) showFeedbackCallback(`Download da base de dados "${APP_DATA_FILE_NAME}" iniciado.`, "success");
        return APP_DATA_FILE_NAME;
    } catch (error) {
        if (showFeedbackCallback) showFeedbackCallback(`Erro ao exportar base de dados: ${error.message}`, "error");
        return null;
    }
}

async function performSelectiveZipBackup(storeNamesToExport) {
    if (typeof JSZip === 'undefined') {
        console.error("DB.JS: Biblioteca JSZip não está carregada.");
        return null;
    }
    if (!db) await initDB();

    try {
        const data = await exportAllDataToJson(storeNamesToExport);
        const zip = new JSZip();
        zip.file("sefworkstation_data.json", JSON.stringify(data, null, 2));

        console.warn("DB.JS: A inclusão de anexos físicos no backup ZIP não é suportada na versão web. Apenas os metadados dos anexos (no JSON) serão incluídos.");

        const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const zipFileName = `sefworkstation_manual_backup_${timestamp}.zip`;

        const triggerDownload = (blob, fileName) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        };
        triggerDownload(zipBlob, zipFileName);

        await addItem(BACKUPS_STORE_NAME, { 
            backupDate: new Date().toISOString(),
            type: 'manual_zip_selective',
            fileName: zipFileName,
            description: `Backup manual seletivo contendo: ${(storeNamesToExport && storeNamesToExport.length > 0) ? storeNamesToExport.join(', ') : 'Todas as stores'}. Anexos físicos: Não (Versão Web).`,
            status: 'success'
        });

        return zipFileName;
    } catch (error) {
        console.error("DB.JS: Erro crítico durante o backup manual seletivo:", error);
        await addItem(BACKUPS_STORE_NAME, { 
            backupDate: new Date().toISOString(),
            type: 'manual_zip_selective',
            fileName: null,
            status: 'failed',
            description: `Falha no backup manual seletivo ZIP: ${error.message || error}`
        });
        return null;
    }
}

async function performAutoZipBackup() {
    console.warn("DB.JS: O backup automático em ZIP foi desativado na versão web da aplicação.");
    return null;
}

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.DB = {
    initDB,
    addItem,
    getItemById,
    getAllItems,
    updateItem,
    deleteItem,
    getItemsByIndex,
    clearStore,
    clearAllStores,
    exportAllDataToJson,
    importAllDataFromJson,
    performAutoZipBackup,
    performSelectiveZipBackup,
    saveDatabaseToFile,
    APP_DATA_FILE_NAME, 
    LOCAL_STORAGE_LAST_DATA_MODIFICATION_KEY,
    STORES: { 
        METADATA: METADATA_STORE_NAME,
        DOCUMENTS: DOCUMENTS_STORE_NAME,
        ATTACHMENTS: ATTACHMENTS_STORE_NAME,
        DOCUMENT_TYPES: DOCUMENT_TYPES_STORE_NAME,
        DOCUMENT_CATEGORIES: DOCUMENT_CATEGORIES_STORE_NAME,
        DOCUMENT_TAGS: DOCUMENT_TAGS_STORE_NAME,
        CONTRIBUINTES: CONTRIBUINTES_STORE_NAME,
        CONTRIBUINTES_PLACEHOLDERS: CONTRIBUINTES_PLACEHOLDERS_STORE_NAME,
        RECURSOS: RECURSOS_STORE_NAME,
        BACKUPS: BACKUPS_STORE_NAME,
        LOTES_DE_DOCUMENTOS: LOTES_DE_DOCUMENTOS_STORE_NAME,
        CONTRIBUINTE_CATEGORIES: CONTRIBUINTE_CATEGORIES_STORE_NAME,
        CONTRIBUINTE_TAGS: CONTRIBUINTE_TAGS_STORE_NAME,
        NOTAS_RAPIDAS: NOTAS_RAPIDAS_STORE_NAME,
        NOTAS_RAPIDAS_TAGS: NOTAS_RAPIDAS_TAGS_STORE_NAME,
        NOTAS_RAPIDAS_CATEGORIES: NOTAS_RAPIDAS_CATEGORIES_STORE_NAME,
        TAREFAS: TAREFAS_STORE_NAME,
        PROTOCOLOS: PROTOCOLOS_STORE_NAME,
        PROTOCOL_TYPES: PROTOCOL_TYPES_STORE_NAME,
        PTAS: PTAS_STORE_NAME,
        PTA_TYPES: PTA_TYPES_STORE_NAME,
        AUTUACOES: AUTUACOES_STORE_NAME,
        AUTUACAO_TYPES: AUTUACAO_TYPES_STORE_NAME,
        SERVIDORES: SERVIDORES_STORE_NAME,
        SERVIDORES_GRUPOS: SERVIDORES_GRUPOS_STORE_NAME,
        COMUNICACAO_DESTINATARIOS: COMUNICACAO_DESTINATARIOS_STORE_NAME,
        COMUNICACAO_GRUPOS: COMUNICACAO_GRUPOS_STORE_NAME,
        COMUNICACAO_EMAILS_GERADOS: COMUNICACAO_EMAILS_GERADOS_STORE_NAME,
        SHARING_HISTORY: SHARING_HISTORY_STORE_NAME,
        SEQUENCES: SEQUENCES_STORE_NAME,
        ITCD_CONFIGURACOES: ITCD_CONFIGURACOES_STORE_NAME,
        ITCD_AVALIACOES: ITCD_AVALIACOES_STORE_NAME,
        ITCD_SEMOVENTES_PAUTAS: ITCD_SEMOVENTES_PAUTAS_STORE_NAME,
        ITCD_VEICULOS_FIPE_MARCAS: ITCD_VEICULOS_FIPE_MARCAS_STORE_NAME,
        ITCD_VEICULOS_FIPE_MODELOS: ITCD_VEICULOS_FIPE_MODELOS_STORE_NAME,
        ITCD_VEICULOS_FIPE_ANOS: ITCD_VEICULOS_FIPE_ANOS_STORE_NAME,
        ITCD_VEICULOS_FIPE_VALORES: ITCD_VEICULOS_FIPE_VALORES_STORE_NAME,
        ITCD_CALCULOS: ITCD_CALCULOS_STORE_NAME,
        ITCD_SELIC_INDICES: ITCD_SELIC_INDICES_STORE_NAME,
        USER_PREFERENCES: USER_PREFERENCES_STORE_NAME 
    }
};
