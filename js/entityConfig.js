// js/entityConfig.js - Registro Central de Configurações de Entidades
// v3.2.0 - CORRIGIDO: Adiciona a flag 'isLinkable' a todas as entidades relevantes para corrigir a exibição de vínculos no formulário de documentos.
// v3.1.1 - CORRIGIDO: Adicionada a flag 'isDeleted' para as stores de grupos (Servidores e Comunicação), resolvendo os warnings da inicialização.
// v3.1.0 - CORRIGIDO: Adiciona a função 'filterActiveItems' que estava faltando e causing um TypeError. Adiciona 'flagDeletado' às configs.
// v3.0.0 - Adiciona as configurações para todos os tipos de cálculo de ITCD, marcando-os como compartilháveis.
// v2.0.0 - Adiciona configurações para entidades de Comunicação e Processos.
// v1.0.0 - Módulo inicial com configurações para Documentos, Contribuintes, Tarefas, etc.

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.EntityConfig = (function() {

    const entityConfigurations = {
        // Entidades Principais
        'documents': {
            storeName: 'documents',
            labelSingular: 'Documento',
            labelPlural: 'Documentos',
            displayField: 'title',
            secondaryDisplayField: 'reference',
            dateField: 'modificationDate',
            viewAction: 'visualizar-documento',
            dataKey: 'docId',
            isCompartilhavel: true,
            isAnexavel: true,
            isLinkable: true, // Um documento pode ser vinculado a outro
            flagDeletado: 'isDeleted'
        },
        'contribuintes': {
            storeName: 'contribuintes',
            labelSingular: 'Contribuinte',
            labelPlural: 'Contribuintes',
            displayField: 'nome',
            secondaryDisplayField: 'cpfCnpj',
            dateField: 'modificationDate',
            viewAction: 'visualizar-contribuinte',
            dataKey: 'contribuinteId',
            isCompartilhavel: true,
            isAnexavel: true,
            isLinkable: true,
            flagDeletado: 'isDeleted'
        },
        'servidoresStore': {
            storeName: 'servidoresStore',
            labelSingular: 'Servidor',
            labelPlural: 'Servidores',
            displayField: 'nome',
            secondaryDisplayField: 'matricula',
            dateField: 'dataModificacao',
            viewAction: 'visualizar-servidor',
            dataKey: 'servidorId',
            isCompartilhavel: true,
            isAnexavel: true,
            isLinkable: true,
            flagDeletado: 'isDeleted'
        },
        'servidoresGruposStore': {
            storeName: 'servidoresGruposStore',
            labelSingular: 'Grupo de Servidores',
            labelPlural: 'Grupos de Servidores',
            displayField: 'nomeGrupo',
            secondaryDisplayField: 'descricaoGrupo',
            dateField: 'dataModificacao',
            viewAction: 'visualizar-grupo-servidores',
            dataKey: 'grupoId',
            isCompartilhavel: false, 
            isAnexavel: false,
            isLinkable: false,
            flagDeletado: 'isDeleted'
        },
        'tarefasStore': {
            storeName: 'tarefasStore',
            labelSingular: 'Tarefa',
            labelPlural: 'Tarefas',
            displayField: 'titulo',
            secondaryDisplayField: 'dataVencimento',
            dateField: 'dataModificacao',
            viewAction: 'visualizar-tarefa',
            dataKey: 'tarefaId',
            isCompartilhavel: true,
            isAnexavel: true,
            isLinkable: true,
            flagDeletado: 'isExcluida'
        },
        'notasRapidasStore': {
            storeName: 'notasRapidasStore',
            labelSingular: 'Nota Rápida',
            labelPlural: 'Notas Rápidas',
            displayField: 'titulo',
            secondaryDisplayField: 'dataCriacao',
            dateField: 'dataModificacao',
            viewAction: 'visualizar-nota-rapida',
            dataKey: 'notaId',
            isCompartilhavel: true,
            isAnexavel: true,
            isLinkable: true,
            flagDeletado: 'isExcluida'
        },
        // Processos e Recursos
        'recursos': {
            storeName: 'recursos',
            labelSingular: 'Recurso',
            labelPlural: 'Recursos',
            displayField: 'titulo',
            secondaryDisplayField: 'numeroIdentificacao',
            dateField: 'dataModificacao',
            viewAction: 'visualizar-recurso',
            dataKey: 'recursoId',
            isCompartilhavel: true,
            isAnexavel: true,
            isLinkable: true,
            flagDeletado: 'isDeleted'
        },
        'protocolosStore': {
            storeName: 'protocolosStore',
            labelSingular: 'Protocolo',
            labelPlural: 'Protocolos',
            displayField: 'numeroProtocolo',
            secondaryDisplayField: 'assunto',
            dateField: 'dataModificacao',
            viewAction: 'visualizar-protocolo',
            dataKey: 'protocoloId',
            isCompartilhavel: true,
            isAnexavel: true,
            isLinkable: true,
            flagDeletado: 'isDeleted'
        },
        'ptasStore': {
            storeName: 'ptasStore',
            labelSingular: 'PTA',
            labelPlural: 'PTAs',
            displayField: 'numeroPTA',
            secondaryDisplayField: 'assuntoPTA',
            dateField: 'dataModificacao',
            viewAction: 'visualizar-pta',
            dataKey: 'ptaId',
            isCompartilhavel: true,
            isAnexavel: true,
            isLinkable: true,
            flagDeletado: 'isDeleted'
        },
        'autuacoesStore': {
            storeName: 'autuacoesStore',
            labelSingular: 'Autuação',
            labelPlural: 'Autuações',
            displayField: 'numeroAutuacao',
            secondaryDisplayField: 'assuntoAutuacao',
            dateField: 'dataModificacao',
            viewAction: 'visualizar-autuacao',
            dataKey: 'autuacaoId',
            isCompartilhavel: true,
            isAnexavel: true,
            isLinkable: true,
            flagDeletado: 'isDeleted'
        },
        // Comunicação
        'comunicacaoDestinatariosStore': {
            storeName: 'comunicacaoDestinatariosStore',
            labelSingular: 'Destinatário',
            labelPlural: 'Destinatários',
            displayField: 'nome',
            secondaryDisplayField: 'email',
            dateField: 'dataModificacao',
            viewAction: 'visualizar-destinatario',
            dataKey: 'destinatarioId',
            isCompartilhavel: true,
            isAnexavel: false,
            isLinkable: true,
            flagDeletado: 'isDeleted'
        },
        'comunicacaoGruposStore': {
            storeName: 'comunicacaoGruposStore',
            labelSingular: 'Grupo de Destinatários',
            labelPlural: 'Grupos de Destinatários',
            displayField: 'nomeGrupo',
            secondaryDisplayField: 'descricaoGrupo',
            dateField: 'dataModificacao',
            viewAction: 'visualizar-grupo-destinatarios',
            dataKey: 'grupoId',
            isCompartilhavel: false,
            isAnexavel: false,
            isLinkable: false,
            flagDeletado: 'isDeleted'
        },
         'comunicacaoEmailsGeradosStore': {
            storeName: 'comunicacaoEmailsGeradosStore',
            labelSingular: 'E-mail Gerado',
            labelPlural: 'E-mails Gerados',
            displayField: 'assunto',
            secondaryDisplayField: 'dataEnvio',
            dateField: 'dataGeracao',
            viewAction: 'visualizar-email-gerado',
            dataKey: 'emailId',
            isCompartilhavel: true,
            isAnexavel: false,
            isLinkable: true,
            flagDeletado: 'isDeleted'
        },
        // ITCD
        'itcdAvaliacoesStore': {
            storeName: 'itcdAvaliacoesStore',
            labelSingular: 'Avaliação de ITCD',
            labelPlural: 'Avaliações de ITCD',
            displayField: 'declaracao',
            secondaryDisplayField: 'tipo',
            dateField: 'dataAvaliacao',
            viewAction: 'itcd-visualizar-avaliacao',
            dataKey: 'avaliacaoId',
            isCompartilhavel: true,
            isAnexavel: true,
            isLinkable: true,
            flagDeletado: 'isDeleted'
        },
        'itcdCalculosStore': {
            storeName: 'itcdCalculosStore',
            labelSingular: 'Cálculo de ITCD',
            labelPlural: 'Cálculos de ITCD',
            displayField: 'deCujusNome',
            secondaryDisplayField: 'declaracaoNumero',
            dateField: 'dataSalvamento',
            viewAction: 'itcd-visualizar-calculo',
            dataKey: 'calculoId',
            isCompartilhavel: true,
            isAnexavel: false,
            isLinkable: true,
            flagDeletado: 'isDeleted'
        }
    };

    function getConfigByStoreName(storeName) {
        return Object.values(entityConfigurations).find(config => config.storeName === storeName) || null;
    }

    function getAllConfigs() {
        return Object.values(entityConfigurations);
    }

    function filterActiveItems(items, storeName) {
        if (!Array.isArray(items)) {
            console.warn(`EntityConfig.filterActiveItems: 'items' não é um array para a store ${storeName}.`);
            return [];
        }
        const config = getConfigByStoreName(storeName);
        if (!config || !config.flagDeletado) {
            console.warn(`EntityConfig.filterActiveItems: Nenhuma 'flagDeletado' configurada para a store ${storeName}. Retornando todos os itens.`);
            return items;
        }

        return items.filter(item => !item[config.flagDeletado]);
    }

    return {
        getConfigByStoreName,
        getAllConfigs,
        filterActiveItems,
        PLACEHOLDERS_PADRAO_SISTEMA: ['NOME', 'CPF_CNPJ', 'EMAIL', 'TELEFONE', 'ENDERECO', 'NUMERO_IDENTIFICACAO', 'INSCRICAO_ESTADUAL'],
        ENTITY_CONFIG: entityConfigurations // Expondo para referência direta
    };

})();