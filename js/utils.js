// js/utils.js - Funções Utilitárias Globais
// v1.0.0.0 - Criação do módulo a partir da refatoração do app.js. Contém os geradores de ID.

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.Utils = (function() {

    let db = null; // Referência para o banco de dados, será injetada via init()

    // Constantes para nomes de sequências no banco de dados
    const DOC_REFERENCE_SEQ_KEY_PREFIX = 'docRefSeq_';
    const CONTRIB_NUM_ID_SEQ_KEY = 'contribNumIdSeq';
    const RECURSO_NUM_ID_SEQ_KEY = 'recursoNumIdSeq';
    const NOTA_RAPIDA_NUM_ID_SEQ_KEY = 'notaRapidaNumIdSeq';
    const TAREFA_NUM_ID_SEQ_KEY = 'tarefaNumIdSeq'; 
    const PROTOCOLO_NUM_ID_SEQ_KEY = 'protocoloNumIdSeq';
    const PTA_NUM_ID_SEQ_KEY = 'ptaNumIdSeq';
    const AUTUACAO_NUM_ID_SEQ_KEY = 'autuacaoNumIdSeq';
    const SERVIDOR_MATRICULA_SEQ_KEY = 'servidorMatriculaSeq';

    /**
     * Inicializa o módulo de utilitários, injetando dependências essenciais.
     * @param {object} dbRef - A referência para o módulo do banco de dados (SEFWorkStation.DB).
     */
    function init(dbRef) {
        db = dbRef;
        console.log("UTILS.JS: Módulo de Utilitários inicializado.");
    }

    /**
     * Gera um Identificador Único Universal (UUID) v4.
     * Utiliza o método nativo crypto.randomUUID() quando disponível, que é mais seguro e eficiente.
     * @returns {string} O UUID gerado.
     */
    function generateUUID() {
        if (crypto && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        // Fallback para ambientes onde crypto.randomUUID não está disponível.
        console.warn("UTILS.JS: crypto.randomUUID() não está disponível. Usando fallback.");
        return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    }

    /**
     * Gera um número de referência sequencial para um documento, baseado em seu tipo.
     * @param {string} docType - O tipo do documento (e.g., 'Ofício', 'Memorando').
     * @returns {Promise<string>} Uma promessa que resolve com o número de referência gerado.
     */
    async function generateDocumentReference(docType) {
        if (!db) throw new Error("UTILS.JS: O módulo DB não foi inicializado.");
        const prefix = (docType ? docType.substring(0, 3).toUpperCase() : "DOC") + "-";
        const sequenceKey = DOC_REFERENCE_SEQ_KEY_PREFIX + (docType || "default");
        let nextNumber = 1;

        try {
            const sequenceRecord = await db.getItemById(db.STORES.SEQUENCES, sequenceKey);
            if (sequenceRecord) {
                nextNumber = sequenceRecord.currentValue + 1;
                sequenceRecord.currentValue = nextNumber;
                await db.updateItem(db.STORES.SEQUENCES, sequenceRecord);
            } else {
                await db.addItem(db.STORES.SEQUENCES, { sequenceName: sequenceKey, currentValue: nextNumber });
            }
        } catch (error) {
            console.error(`Erro ao gerar referência para ${docType}:`, error);
            return `${prefix}${Date.now().toString().slice(-5)}`; // Fallback
        }
        return `${prefix}${String(nextNumber).padStart(3, '0')}`;
    }

    /**
     * Gera um número de identificação sequencial para um Contribuinte.
     * @returns {Promise<string>} Uma promessa que resolve com o número de identificação gerado.
     */
    async function generateContribuinteNumeroIdentificacao() {
        if (!db) throw new Error("UTILS.JS: O módulo DB não foi inicializado.");
        let nextIdNum = 1; 
        try {
            const seq = await db.getItemById(db.STORES.SEQUENCES, CONTRIB_NUM_ID_SEQ_KEY);
            if (seq) {
                const currentValueNumber = Number(seq.currentValue);
                if (!isNaN(currentValueNumber)) {
                    nextIdNum = currentValueNumber + 1;
                } else {
                    nextIdNum = 1;
                    console.warn(`Sequência ${CONTRIB_NUM_ID_SEQ_KEY} tinha um currentValue inválido (${seq.currentValue}). Resetando para 1.`);
                }
                seq.currentValue = nextIdNum;
                await db.updateItem(db.STORES.SEQUENCES, seq);
            } else {
                nextIdNum = 1;
                await db.addItem(db.STORES.SEQUENCES, { sequenceName: CONTRIB_NUM_ID_SEQ_KEY, currentValue: nextIdNum });
            }
        } catch (error) {
            console.error("Erro ao gerar ID de contribuinte:", error);
            nextIdNum = Date.now() % 100000;
            return `CONTRIB-ERR${String(nextIdNum).padStart(5, '0')}`; // Fallback
        }
        return `CONTRIB-${String(nextIdNum).padStart(5, '0')}`;
    }

    /**
     * Gera um número de identificação sequencial para um Recurso, com verificação de colisão e retentativas.
     * @param {number} retryCount - Contador interno para retentativas.
     * @returns {Promise<string>} Uma promessa que resolve com o número de identificação gerado.
     */
    async function generateRecursoNumeroIdentificacao(retryCount = 0) {
        if (!db) throw new Error("UTILS.JS: O módulo DB não foi inicializado.");
        const MAX_RETRIES = 3;
        let nextIdNum;
        let proposedNumeroIdentificacao;

        try {
            const seq = await db.getItemById(db.STORES.SEQUENCES, RECURSO_NUM_ID_SEQ_KEY);
            if (seq && typeof seq.currentValue === 'number') {
                nextIdNum = seq.currentValue + 1;
            } else {
                const todosRecursos = await db.getAllItems(db.STORES.RECURSOS);
                let maxIdExistente = 0;
                todosRecursos.forEach(rec => {
                    if (rec.numeroIdentificacao && typeof rec.numeroIdentificacao === 'string' && rec.numeroIdentificacao.startsWith('REC-')) {
                        const numParte = parseInt(rec.numeroIdentificacao.substring(4), 10);
                        if (!isNaN(numParte) && numParte > maxIdExistente) {
                            maxIdExistente = numParte;
                        }
                    }
                });
                nextIdNum = maxIdExistente + 1;
                console.warn(`Sequência '${RECURSO_NUM_ID_SEQ_KEY}' não encontrada ou inválida. Próximo ID calculado: ${nextIdNum}`);
            }
            
            proposedNumeroIdentificacao = `REC-${String(nextIdNum).padStart(5, '0')}`;

            const recursosExistentes = await db.getItemsByIndex(db.STORES.RECURSOS, 'numeroIdentificacao', proposedNumeroIdentificacao);
            if (recursosExistentes && recursosExistentes.length > 0) {
                console.warn(`Colisão detectada para numeroIdentificacao de Recurso: ${proposedNumeroIdentificacao}. Tentativa ${retryCount + 1}.`);
                if (retryCount < MAX_RETRIES) {
                    if (seq) {
                        seq.currentValue = nextIdNum;
                        await db.updateItem(db.STORES.SEQUENCES, seq);
                    } else {
                        await db.addItem(db.STORES.SEQUENCES, { sequenceName: RECURSO_NUM_ID_SEQ_KEY, currentValue: nextIdNum });
                    }
                    return await generateRecursoNumeroIdentificacao(retryCount + 1); 
                } else {
                    throw new Error(`Falha ao gerar numeroIdentificacao único para Recurso após ${MAX_RETRIES + 1} tentativas.`);
                }
            }

            if (seq) {
                seq.currentValue = nextIdNum;
                await db.updateItem(db.STORES.SEQUENCES, seq);
            } else {
                await db.addItem(db.STORES.SEQUENCES, { sequenceName: RECURSO_NUM_ID_SEQ_KEY, currentValue: nextIdNum });
            }

        } catch (error) {
            console.error("Erro crítico em generateRecursoNumeroIdentificacao:", error);
            const timestampFallback = Date.now().toString().slice(-5);
            proposedNumeroIdentificacao = `REC-ERR${timestampFallback}`;
        }
        return proposedNumeroIdentificacao;
    }

    /**
     * Gera um número de identificação sequencial para uma Nota Rápida.
     * @returns {Promise<string>} Uma promessa que resolve com o número de identificação gerado.
     */
    async function generateNotaRapidaNumeroIdentificacao() {
        if (!db) throw new Error("UTILS.JS: O módulo DB não foi inicializado.");
        let nextIdNum = 1;
        try {
            const seq = await db.getItemById(db.STORES.SEQUENCES, NOTA_RAPIDA_NUM_ID_SEQ_KEY);
            if (seq) {
                nextIdNum = seq.currentValue + 1;
                seq.currentValue = nextIdNum;
                await db.updateItem(db.STORES.SEQUENCES, seq);
            } else {
                await db.addItem(db.STORES.SEQUENCES, { sequenceName: NOTA_RAPIDA_NUM_ID_SEQ_KEY, currentValue: nextIdNum });
            }
        } catch (e) { return `NOTA-ERR${Date.now().toString().slice(-4)}`; }
        return `NOTA-${String(nextIdNum).padStart(5, '0')}`;
    }

    /**
     * Gera um número de identificação sequencial para uma Tarefa, com recuperação de sequência.
     * @returns {Promise<string>} Uma promessa que resolve com o número de identificação gerado.
     */
    async function generateTarefaNumeroIdentificacao() {
        if (!db) throw new Error("UTILS.JS: O módulo DB não foi inicializado.");
        let nextIdNum = 1; 

        try {
            const seq = await db.getItemById(db.STORES.SEQUENCES, TAREFA_NUM_ID_SEQ_KEY);

            if (seq && seq.currentValue !== undefined && seq.currentValue !== null) {
                const currentValueAsNumber = Number(seq.currentValue);
                if (!isNaN(currentValueAsNumber)) {
                    nextIdNum = currentValueAsNumber + 1;
                } else {
                    console.warn(`Sequência de Tarefa '${TAREFA_NUM_ID_SEQ_KEY}' inválida. Recuperando...`);
                    const todasTarefas = await db.getAllItems(db.STORES.TAREFAS);
                    let maxIdExistente = 0;
                    todasTarefas.forEach(tarefa => {
                        if (tarefa.numeroIdentificacao && tarefa.numeroIdentificacao.startsWith('TAR-')) {
                            const numParte = parseInt(tarefa.numeroIdentificacao.substring(4), 10);
                            if (!isNaN(numParte) && numParte > maxIdExistente) maxIdExistente = numParte;
                        }
                    });
                    nextIdNum = maxIdExistente + 1;
                }
                seq.currentValue = nextIdNum;
                await db.updateItem(db.STORES.SEQUENCES, seq);
            } else {
                console.warn(`Sequência de Tarefa '${TAREFA_NUM_ID_SEQ_KEY}' não encontrada. Calculando...`);
                const todasTarefas = await db.getAllItems(db.STORES.TAREFAS);
                let maxIdExistente = 0;
                todasTarefas.forEach(tarefa => {
                    if (tarefa.numeroIdentificacao && tarefa.numeroIdentificacao.startsWith('TAR-')) {
                        const numParte = parseInt(tarefa.numeroIdentificacao.substring(4), 10);
                        if (!isNaN(numParte) && numParte > maxIdExistente) maxIdExistente = numParte;
                    }
                });
                nextIdNum = maxIdExistente + 1;
                await db.addItem(db.STORES.SEQUENCES, { sequenceName: TAREFA_NUM_ID_SEQ_KEY, currentValue: nextIdNum });
            }
        } catch (error) {
            console.error("Erro crítico em generateTarefaNumeroIdentificacao:", error);
            const timestampFallback = Date.now().toString().slice(-5);
            return `TAR-ERR${timestampFallback}`; 
        }
        return `TAR-${String(nextIdNum).padStart(5, '0')}`;
    }

    /**
     * Gera um número de identificação sequencial para um Protocolo.
     * @returns {Promise<string>} Uma promessa que resolve com o número de identificação gerado.
     */
    async function generateProtocoloNumeroIdentificacao() {
        if (!db) throw new Error("UTILS.JS: O módulo DB não foi inicializado.");
        let nextIdNum = 1;
        try {
            const seq = await db.getItemById(db.STORES.SEQUENCES, PROTOCOLO_NUM_ID_SEQ_KEY);
            if (seq) {
                nextIdNum = seq.currentValue + 1;
                seq.currentValue = nextIdNum;
                await db.updateItem(db.STORES.SEQUENCES, seq);
            } else {
                await db.addItem(db.STORES.SEQUENCES, { sequenceName: PROTOCOLO_NUM_ID_SEQ_KEY, currentValue: nextIdNum });
            }
        } catch (e) { return `PROT-ERR${Date.now().toString().slice(-4)}`; }
        return `PROT-${String(nextIdNum).padStart(7, '0')}`;
    }

    /**
     * Gera um número de identificação sequencial para um PTA.
     * @returns {Promise<string>} Uma promessa que resolve com o número de identificação gerado.
     */
    async function generatePTANumeroIdentificacao() {
        if (!db) throw new Error("UTILS.JS: O módulo DB não foi inicializado.");
        let nextIdNum = 1;
        try {
            const seq = await db.getItemById(db.STORES.SEQUENCES, PTA_NUM_ID_SEQ_KEY);
            if (seq) {
                nextIdNum = seq.currentValue + 1;
                seq.currentValue = nextIdNum;
                await db.updateItem(db.STORES.SEQUENCES, seq);
            } else {
                await db.addItem(db.STORES.SEQUENCES, { sequenceName: PTA_NUM_ID_SEQ_KEY, currentValue: nextIdNum });
            }
        } catch (e) { return `PTA-ERR${Date.now().toString().slice(-4)}`; }
        return `PTA-${String(nextIdNum).padStart(7, '0')}`;
    }

    /**
     * Gera um número de identificação sequencial para uma Autuação.
     * @returns {Promise<string>} Uma promessa que resolve com o número de identificação gerado.
     */
    async function generateAutuacaoNumeroIdentificacao() {
        if (!db) throw new Error("UTILS.JS: O módulo DB não foi inicializado.");
        let nextIdNum = 1;
        try {
            const seq = await db.getItemById(db.STORES.SEQUENCES, AUTUACAO_NUM_ID_SEQ_KEY);
            if (seq) {
                nextIdNum = seq.currentValue + 1;
                seq.currentValue = nextIdNum;
                await db.updateItem(db.STORES.SEQUENCES, seq);
            } else {
                await db.addItem(db.STORES.SEQUENCES, { sequenceName: AUTUACAO_NUM_ID_SEQ_KEY, currentValue: nextIdNum });
            }
        } catch (e) { return `AUT-ERR${Date.now().toString().slice(-4)}`; }
        return `AUT-${String(nextIdNum).padStart(7, '0')}`;
    }

    /**
     * Gera um número de matrícula sequencial para um Servidor.
     * @returns {Promise<string>} Uma promessa que resolve com o número de matrícula gerado.
     */
    async function generateServidorMatricula() {
        if (!db) throw new Error("UTILS.JS: O módulo DB não foi inicializado.");
        let nextIdNum = 1;
        try {
            const seq = await db.getItemById(db.STORES.SEQUENCES, SERVIDOR_MATRICULA_SEQ_KEY);
            if (seq) {
                nextIdNum = seq.currentValue + 1;
                seq.currentValue = nextIdNum;
                await db.updateItem(db.STORES.SEQUENCES, seq);
            } else {
                await db.addItem(db.STORES.SEQUENCES, { sequenceName: SERVIDOR_MATRICULA_SEQ_KEY, currentValue: nextIdNum });
            }
        } catch (e) { return `SERV-ERR${Date.now().toString().slice(-4)}`; }
        return `SERV-${String(nextIdNum).padStart(5, '0')}`;
    }


    // Expõe as funções publicamente
    return {
        init,
        generateUUID,
        generateDocumentReference,
        generateContribuinteNumeroIdentificacao,
        generateRecursoNumeroIdentificacao,
        generateNotaRapidaNumeroIdentificacao,
        generateTarefaNumeroIdentificacao,
        generateProtocoloNumeroIdentificacao,
        generatePTANumeroIdentificacao,
        generateAutuacaoNumeroIdentificacao,
        generateServidorMatricula
    };
})();