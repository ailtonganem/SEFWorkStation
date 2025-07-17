// js/relatorios.js - Módulo para Geração de Relatórios
// v2.10 - Adiciona botão de ajuda contextual.
// v2.9 - Ajusta o layout para ocupar toda a largura da página.
// v2.8 - Melhora layout do relatório "Visão Geral de Entidade" para usar colunas.
// v2.7 - ETAPA 2: Adiciona Relatório "Servidores com Dias de Trabalho Remoto".
// v2.6 - ETAPA 1: Sincroniza AUSENCIA_TIPOS_OPTIONS_REL com servidoresForm.js. Garante que "Trabalho Remoto" não seja listado como tipo de ausência.
// ... (histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.Relatorios = (function() {
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let dbRef;
    let appModuleRef;
    let uiModuleRef;
    let ajudaModuleRef; // Adicionado

    const SERVIDORES_STORE_NAME = 'servidoresStore';
    const SERVIDORES_GRUPOS_STORE_NAME = 'servidoresGruposStore';
    const DOCUMENTS_STORE_NAME = 'documents';
    const DOCUMENT_TYPES_STORE_NAME = 'documentTypes';
    const DOCUMENT_CATEGORIES_STORE_NAME = 'documentCategories';
    const DOCUMENT_TAGS_STORE_NAME = 'documentTags';
    const TAREFAS_STORE_NAME = 'tarefasStore';
    const PROTOCOLOS_STORE_NAME = 'protocolosStore';
    const PTAS_STORE_NAME = 'ptasStore';
    const AUTUACOES_STORE_NAME = 'autuacoesStore';
    const CONTRIBUINTES_STORE_NAME = 'contribuintes';
    const CONTRIBUINTE_CATEGORIES_STORE_NAME = 'contribuinteCategories';
    const RECURSOS_STORE_NAME = 'recursos';
    const NOTAS_RAPIDAS_STORE_NAME = 'notasRapidasStore';


    const STATUS_TAREFA_OPTIONS_REL = ['Pendente', 'Em Andamento', 'Concluída', 'Cancelada', 'Aguardando Terceiros'];
    const STATUS_PROTOCOLO_OPTIONS_REL = ['Recebido', 'Enviado', 'Em Análise', 'Respondido', 'Arquivado', 'Cancelado', 'Outro'];
    const STATUS_PTA_OPTIONS_REL = ["Em Elaboração", "Submetido", "Em Análise", "Deferido", "Indeferido", "Arquivado", "Recurso Pendente", "Cancelado", "Convertido em Autuação", "Outro"];
    const STATUS_AUTUACAO_OPTIONS_REL = ["Em Elaboração", "Lavrada", "Ciente", "Impugnada", "Em Cobrança", "Suspensa", "Extinta", "Anulada", "Encerrada", "Arquivada", "Cancelado", "Outro"];
    const AUSENCIA_TIPOS_OPTIONS_REL = ["Férias Regulamentares", "Férias Prêmio", "Licença", "Afastado", "Outro"];


    const TIPOS_RELATORIOS_DISPONIVEIS = [
        { value: "", label: "-- Escolha um tipo de relatório --", modulo: "" },
        { value: "ausenciasServidores", label: "Ausências de Servidores por Período", modulo: "Servidores" },
        { value: "servidoresTrabalhoRemoto", label: "Servidores com Dias de Trabalho Remoto", modulo: "Servidores" },
        { value: "documentosPorTipo", label: "Documentos por Tipo (filtros avançados)", modulo: "Documentos" }, 
        { value: "documentosPorCategoriaTag", label: "Documentos por Categoria(s) e/ou Tag(s)", modulo: "Documentos" },
        { value: "documentosPorPeriodoModificacao", label: "Documentos por Período de Modificação", modulo: "Documentos" },
        { value: "modelosMaisUtilizados", label: "Modelos de Documentos Mais Utilizados", modulo: "Documentos" },
        { value: "contribuintesPorCategoria", label: "Contribuintes por Categoria", modulo: "Contribuintes" },
        { value: "tarefasPorStatus", label: "Tarefas por Status (com filtro de período)", modulo: "Tarefas" },
        { value: "tarefasPorResponsavel", label: "Tarefas por Responsável", modulo: "Tarefas" },
        { value: "processosPorStatusTipo", label: "Processos por Status e Tipo (com filtro de período)", modulo: "Processos" },
        { value: "visaoGeralEntidade", label: "Visão Geral de Entidade", modulo: "Geral" },
    ];

    const ENTIDADES_PARA_VISAO_GERAL = [
        { value: DOCUMENTS_STORE_NAME, label: "Documento", displayField: "title", secondaryField: "reference" },
        { value: CONTRIBUINTES_STORE_NAME, label: "Contribuinte", displayField: "nome", secondaryField: "cpfCnpj" },
        { value: TAREFAS_STORE_NAME, label: "Tarefa", displayField: "titulo", secondaryField: "numeroIdentificacao" },
        { value: RECURSOS_STORE_NAME, label: "Recurso", displayField: "titulo", secondaryField: "numeroIdentificacao" },
        { value: PROTOCOLOS_STORE_NAME, label: "Protocolo", displayField: "numeroProtocolo", secondaryField: "assunto" },
        { value: PTAS_STORE_NAME, label: "PTA", displayField: "numeroPTA", secondaryField: "assuntoPTA" },
        { value: AUTUACOES_STORE_NAME, label: "Autuação", displayField: "numeroAutuacao", secondaryField: "assuntoAutuacao" },
        { value: SERVIDORES_STORE_NAME, label: "Servidor", displayField: "nome", secondaryField: "matricula" },
        { value: NOTAS_RAPIDAS_STORE_NAME, label: "Nota Rápida", displayField: "titulo", secondaryField: "numeroIdentificacao" }
    ];


    function init(mainWrapper, showFeedbackFunc, dbModuleRef, applicationModuleRef, uiRefModule) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedbackFunc;
        dbRef = dbModuleRef;
        appModuleRef = applicationModuleRef;
        uiModuleRef = uiRefModule;
        ajudaModuleRef = window.SEFWorkStation.Ajuda; // Adicionado
        console.log("Relatorios.JS: Módulo inicializado (v2.10).");
    }

    function getNomeModulo(valorRelatorio) {
        const rel = TIPOS_RELATORIOS_DISPONIVEIS.find(r => r.value === valorRelatorio);
        return rel ? rel.modulo : "Desconhecido";
    }

    function renderPaginaRelatorios() {
        if (!mainContentWrapperRef) {
            console.error("Relatorios.JS: renderPaginaRelatorios - mainContentWrapperRef não definido.");
            return;
        }
        if (window.SEFWorkStation.App && typeof window.SEFWorkStation.App.clearGlobalFeedback === 'function') {
            window.SEFWorkStation.App.clearGlobalFeedback();
        }

        const feedbackAreaId = "feedback-relatorios-page";

        const optionsHtml = TIPOS_RELATORIOS_DISPONIVEIS.map(rel => {
            if (rel.value === "") {
                return `<option value="">${rel.label}</option>`;
            }
            return `<option value="${rel.value}" data-modulo="${rel.modulo}">${rel.modulo} - ${rel.label}</option>`;
        }).join('');

        const pageHtml = `
            <div class="page-section max-w-none px-4 sm:px-6 lg:px-8" id="relatorios-container">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-100">Central de Relatórios</h2>
                    <button id="btn-ajuda-relatorios" class="p-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-300" title="Ajuda sobre Relatórios">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-question-circle-fill" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.496 6.033h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286a.237.237 0 0 0 .241.247zm2.325 6.443c.61 0 1.029-.394 1.029-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94 0 .533.425.927 1.01.927z"/></svg>
                    </button>
                </div>
                <div id="${feedbackAreaId}" class="mb-4"></div>

                <div class="section-box p-4 mb-6 border dark:border-slate-700 rounded-lg">
                    <h3 class="text-lg font-medium mb-3 text-gray-800 dark:text-gray-100">1. Selecionar Relatório</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                        <div>
                            <label for="relatorio-tipo-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de Relatório:</label>
                            <select id="relatorio-tipo-select" class="form-input-text mt-1 block w-full text-sm">
                                ${optionsHtml}
                            </select>
                        </div>
                    </div>
                </div>

                <div id="relatorio-parametros-container" class="hidden section-box p-4 mb-6 border dark:border-slate-700 rounded-lg">
                    </div>

                <div id="relatorio-resultados-container" class="mt-6">
                    </div>
            </div>
        `;
        mainContentWrapperRef.innerHTML = pageHtml;
        addEventListenersPaginaRelatorios(feedbackAreaId);
    }

    async function addEventListenersPaginaRelatorios(feedbackAreaId) {
        const tipoRelatorioSelect = document.getElementById('relatorio-tipo-select');
        const parametrosContainer = document.getElementById('relatorio-parametros-container');
        const resultadosContainer = document.getElementById('relatorio-resultados-container');
        const btnAjuda = document.getElementById('btn-ajuda-relatorios');

        if (tipoRelatorioSelect) {
            tipoRelatorioSelect.addEventListener('change', async () => {
                const tipoSelecionado = tipoRelatorioSelect.value;
                parametrosContainer.innerHTML = '';
                resultadosContainer.innerHTML = '';
                parametrosContainer.classList.add('hidden');

                switch (tipoSelecionado) {
                    case 'ausenciasServidores':
                        parametrosContainer.innerHTML = await getHtmlParametrosAusenciasServidores();
                        parametrosContainer.classList.remove('hidden');
                        document.getElementById('btn-gerar-relatorio-ausencias')?.addEventListener('click', () => {
                            gerarRelatorioAusenciasServidores(feedbackAreaId, resultadosContainer);
                        });
                        break;
                    case 'servidoresTrabalhoRemoto': 
                        parametrosContainer.innerHTML = await getHtmlParametrosServidoresTrabalhoRemoto();
                        parametrosContainer.classList.remove('hidden');
                        document.getElementById('btn-gerar-relatorio-serv-remoto')?.addEventListener('click', () => {
                            gerarRelatorioServidoresTrabalhoRemoto(feedbackAreaId, resultadosContainer);
                        });
                        break;
                    case 'documentosPorTipo':
                        parametrosContainer.innerHTML = await getHtmlParametrosDocumentosPorTipo();
                        parametrosContainer.classList.remove('hidden');
                        document.getElementById('btn-gerar-relatorio-doc-tipo')?.addEventListener('click', () => {
                            gerarRelatorioDocumentosPorTipo(feedbackAreaId, resultadosContainer);
                        });
                        break;
                    case 'documentosPorCategoriaTag':
                        parametrosContainer.innerHTML = await getHtmlParametrosDocumentosPorCategoriaTag(feedbackAreaId);
                        parametrosContainer.classList.remove('hidden');
                        document.getElementById('btn-gerar-relatorio-doc-cat-tag')?.addEventListener('click', () => {
                            gerarRelatorioDocumentosPorCategoriaTag(feedbackAreaId, resultadosContainer);
                        });
                        break;
                    case 'documentosPorPeriodoModificacao':
                        parametrosContainer.innerHTML = getHtmlParametrosDocumentosPorPeriodo();
                        parametrosContainer.classList.remove('hidden');
                        document.getElementById('btn-gerar-relatorio-doc-periodo')?.addEventListener('click', () => {
                            gerarRelatorioDocumentosPorPeriodo(feedbackAreaId, resultadosContainer);
                        });
                        break;
                    case 'modelosMaisUtilizados':
                        parametrosContainer.innerHTML = getHtmlParametrosModelosMaisUtilizados();
                        parametrosContainer.classList.remove('hidden');
                        document.getElementById('btn-gerar-relatorio-modelos-usados')?.addEventListener('click', () => {
                            gerarRelatorioModelosMaisUtilizados(feedbackAreaId, resultadosContainer);
                        });
                        break;
                    case 'contribuintesPorCategoria':
                        parametrosContainer.innerHTML = await getHtmlParametrosContribuintesPorCategoria();
                        parametrosContainer.classList.remove('hidden');
                        document.getElementById('btn-gerar-relatorio-contrib-categoria')?.addEventListener('click', () => {
                            gerarRelatorioContribuintesPorCategoria(feedbackAreaId, resultadosContainer);
                        });
                        break;
                    case 'tarefasPorStatus':
                        parametrosContainer.innerHTML = getHtmlParametrosTarefasPorStatus();
                        parametrosContainer.classList.remove('hidden');
                        document.getElementById('btn-gerar-relatorio-tarefas-status')?.addEventListener('click', () => {
                            gerarRelatorioTarefasPorStatus(feedbackAreaId, resultadosContainer);
                        });
                        break;
                    case 'tarefasPorResponsavel':
                        parametrosContainer.innerHTML = getHtmlParametrosTarefasPorResponsavel();
                        parametrosContainer.classList.remove('hidden');
                        document.getElementById('btn-gerar-relatorio-tarefas-responsavel')?.addEventListener('click', () => {
                            gerarRelatorioTarefasPorResponsavel(feedbackAreaId, resultadosContainer);
                        });
                        break;
                    case 'processosPorStatusTipo':
                        parametrosContainer.innerHTML = getHtmlParametrosProcessosPorStatusTipo();
                        parametrosContainer.classList.remove('hidden');
                        document.getElementById('btn-gerar-relatorio-processos-status-tipo')?.addEventListener('click', () => {
                            gerarRelatorioProcessosPorStatusTipo(feedbackAreaId, resultadosContainer);
                        });
                        break;
                    case 'visaoGeralEntidade':
                        parametrosContainer.innerHTML = await getHtmlParametrosVisaoGeralEntidade();
                        parametrosContainer.classList.remove('hidden');
                        addEventListenersParametrosVisaoGeralEntidade();
                        document.getElementById('btn-gerar-relatorio-visao-geral')?.addEventListener('click', () => {
                            gerarRelatorioVisaoGeralEntidade(feedbackAreaId, resultadosContainer);
                        });
                        break;
                    default:
                        parametrosContainer.classList.add('hidden');
                        break;
                }
            });
        }
        
        if (btnAjuda) {
            btnAjuda.addEventListener('click', (e) => {
                e.preventDefault();
                if(ajudaModuleRef && ajudaModuleRef.mostrarTopicoDeAjuda) {
                    ajudaModuleRef.mostrarTopicoDeAjuda('manual-modulo-utilidades', 'util-relatorios');
                }
            });
        }
    }

    async function getHtmlParametrosAusenciasServidores() {
        let servidoresOptions = '<option value="">Todos os Servidores</option>';
        const tiposAusenciaOptions = AUSENCIA_TIPOS_OPTIONS_REL.map(tipo => `<option value="${tipo}">${tipo}</option>`).join('');
        try {
            const servidores = await dbRef.getAllItems(SERVIDORES_STORE_NAME);
            servidores.filter(s => !s.isDeleted && s.status === 'Ativo')
                      .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""))
                      .forEach(s => { servidoresOptions += `<option value="${s.id}">${s.nome} (${s.matricula || 'N/A'})</option>`; });
        } catch (e) { console.error("Relatorios.JS: Erro ao carregar servidores para filtro de ausências:", e); servidoresOptions = '<option value="">Erro ao carregar servidores</option>'; }
        return `
            <h4 class="text-md font-semibold mb-2 text-gray-700 dark:text-gray-200">2. Parâmetros para Ausências de Servidores</h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
                <div><label for="relatorio-servidor-select-ausencias" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Servidor:</label><select id="relatorio-servidor-select-ausencias" class="form-input-text mt-1 block w-full text-sm">${servidoresOptions}</select></div>
                <div><label for="relatorio-tipo-ausencia-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de Ausência:</label><select id="relatorio-tipo-ausencia-select" class="form-input-text mt-1 block w-full text-sm"><option value="">Todos os Tipos</option>${tiposAusenciaOptions}</select></div>
                <div><label for="relatorio-data-inicio-ausencias" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Data de Início:</label><input type="date" id="relatorio-data-inicio-ausencias" class="form-input-text mt-1 block w-full text-sm"></div>
                <div><label for="relatorio-data-fim-ausencias" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Data de Fim:</label><input type="date" id="relatorio-data-fim-ausencias" class="form-input-text mt-1 block w-full text-sm"></div>
                <div><button id="btn-gerar-relatorio-ausencias" class="btn-primary w-full">Gerar Relatório</button></div>
            </div>`;
    }
    async function gerarRelatorioAusenciasServidores(feedbackAreaId, resultadosContainer) {
        const dataInicioInput = document.getElementById('relatorio-data-inicio-ausencias').value;
        const dataFimInput = document.getElementById('relatorio-data-fim-ausencias').value;
        const servidorIdSelecionado = document.getElementById('relatorio-servidor-select-ausencias').value;
        const tipoAusenciaSelecionado = document.getElementById('relatorio-tipo-ausencia-select').value;
        const feedbackEl = document.getElementById(feedbackAreaId);
        if (!dataInicioInput || !dataFimInput) { if (globalShowFeedbackRef) globalShowFeedbackRef("Por favor, selecione as datas de início e fim.", "warning", feedbackEl); return; }
        const dataInicio = new Date(dataInicioInput + "T00:00:00"); const dataFim = new Date(dataFimInput + "T23:59:59");
        if (dataInicio > dataFim) { if (globalShowFeedbackRef) globalShowFeedbackRef("A data de início não pode ser posterior à data de fim.", "warning", feedbackEl); return; }
        resultadosContainer.innerHTML = '<p class="loading-text p-4">Gerando relatório de ausências...</p>';
        try {
            const todosServidores = await dbRef.getAllItems(SERVIDORES_STORE_NAME); let servidoresFiltrados = todosServidores.filter(s => !s.isDeleted);
            if (servidorIdSelecionado) { servidoresFiltrados = servidoresFiltrados.filter(s => s.id === servidorIdSelecionado); }
            let resultados = [];
            servidoresFiltrados.forEach(servidor => {
                if (servidor.periodosAusencia && Array.isArray(servidor.periodosAusencia)) {
                    servidor.periodosAusencia.forEach(periodo => {
                        const inicioPeriodo = new Date(periodo.dataInicio + 'T00:00:00'); const fimPeriodo = periodo.dataFim ? new Date(periodo.dataFim + 'T23:59:59') : new Date(periodo.dataInicio + 'T23:59:59'); 
                        const sobrepoePeriodo = inicioPeriodo <= dataFim && fimPeriodo >= dataInicio; const tipoCorresponde = !tipoAusenciaSelecionado || periodo.tipo === tipoAusenciaSelecionado;
                        if (sobrepoePeriodo && tipoCorresponde) { resultados.push({ nomeServidor: servidor.nome, matriculaServidor: servidor.matricula, tipoAusencia: periodo.tipo, dataInicioAusencia: inicioPeriodo, dataFimAusencia: fimPeriodo, observacao: periodo.observacao }); }
                    });
                }
            });
            resultados.sort((a, b) => a.dataInicioAusencia - b.dataInicioAusencia || a.nomeServidor.localeCompare(b.nomeServidor));
            let tituloRelatorio = `Ausências de Servidores de ${dataInicio.toLocaleDateString()} a ${dataFim.toLocaleDateString()}`;
            if (servidorIdSelecionado && resultados.length > 0 && servidoresFiltrados.length === 1) { tituloRelatorio += ` (Servidor: ${servidoresFiltrados[0].nome})`; } 
            else if (servidorIdSelecionado) { tituloRelatorio += ` (Servidor ID: ${servidorIdSelecionado})`;}
            if (tipoAusenciaSelecionado) { tituloRelatorio += ` (Tipo: ${tipoAusenciaSelecionado})`; }
            renderTabelaResultados(resultados, resultadosContainer, tituloRelatorio, ['Servidor', 'Matrícula', 'Tipo de Ausência', 'Data Início', 'Data Fim', 'Observação'], (res) => [res.nomeServidor, res.matriculaServidor || 'N/A', res.tipoAusencia, res.dataInicioAusencia.toLocaleDateString(), res.dataFimAusencia.getFullYear() === 9999 || (res.dataInicioAusencia.getTime() === res.dataFimAusencia.getTime() && !res.dataFim) ? 'Indefinida/Dia Único' : res.dataFimAusencia.toLocaleDateString(), res.observacao || '']);
        } catch (error) { console.error("Erro ao gerar relatório de ausências:", error); resultadosContainer.innerHTML = `<p class="feedback-message error">Erro ao gerar relatório: ${error.message}</p>`; }
    }

    async function getHtmlParametrosServidoresTrabalhoRemoto() {
        let servidoresOptions = '<option value="">Todos os Servidores Ativos</option>';
        let gruposOptions = '<option value="">Todos os Grupos</option>';
        try {
            const servidoresDb = await dbRef.getAllItems(SERVIDORES_STORE_NAME);
            servidoresDb.filter(s => !s.isDeleted && s.status === 'Ativo')
                        .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""))
                        .forEach(s => { servidoresOptions += `<option value="${s.id}">${s.nome} (${s.matricula || 'N/A'})</option>`; });

            const gruposDb = await dbRef.getAllItems(SERVIDORES_GRUPOS_STORE_NAME);
            gruposDb.filter(g => !g.isDeleted)
                    .sort((a, b) => (a.nomeGrupo || "").localeCompare(b.nomeGrupo || ""))
                    .forEach(g => { gruposOptions += `<option value="${g.id}">${g.nomeGrupo}</option>`; });
        } catch (e) {
            console.error("Relatorios.JS: Erro ao carregar servidores/grupos para filtro de trabalho remoto:", e);
            servidoresOptions = '<option value="">Erro ao carregar</option>';
            gruposOptions = '<option value="">Erro ao carregar</option>';
        }
        return `
            <h4 class="text-md font-semibold mb-2 text-gray-700 dark:text-gray-200">2. Parâmetros para Servidores com Trabalho Remoto</h4>
            <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">Liste servidores ativos e seus dias de trabalho remoto configurados. Filtre por servidor específico ou grupo de servidores (opcional).</p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                    <label for="relatorio-servidor-remoto-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Servidor Específico:</label>
                    <select id="relatorio-servidor-remoto-select" class="form-input-text mt-1 block w-full text-sm">${servidoresOptions}</select>
                </div>
                <div>
                    <label for="relatorio-grupo-remoto-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Grupo de Servidores:</label>
                    <select id="relatorio-grupo-remoto-select" class="form-input-text mt-1 block w-full text-sm">${gruposOptions}</select>
                </div>
                <div>
                    <button id="btn-gerar-relatorio-serv-remoto" class="btn-primary w-full">Gerar Relatório</button>
                </div>
            </div>
             <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Se ambos os filtros (servidor e grupo) forem deixados em "Todos", o relatório incluirá todos os servidores com dias de trabalho remoto configurados.</p>`;
    }
    async function gerarRelatorioServidoresTrabalhoRemoto(feedbackAreaId, resultadosContainer) {
        const servidorIdSelecionado = document.getElementById('relatorio-servidor-remoto-select').value;
        const grupoIdSelecionado = document.getElementById('relatorio-grupo-remoto-select').value;
        const feedbackEl = document.getElementById(feedbackAreaId);
        resultadosContainer.innerHTML = '<p class="loading-text p-4">Gerando relatório de trabalho remoto...</p>';

        try {
            const todosServidores = await dbRef.getAllItems(SERVIDORES_STORE_NAME);
            let servidoresParaRelatorio = todosServidores.filter(s => !s.isDeleted && s.status === 'Ativo' && s.diasTrabalhoRemoto && s.diasTrabalhoRemoto.length > 0);

            let tituloRelatorio = "Servidores com Dias de Trabalho Remoto Configurados";

            if (servidorIdSelecionado) {
                servidoresParaRelatorio = servidoresParaRelatorio.filter(s => s.id === servidorIdSelecionado);
                const servidorInfo = todosServidores.find(s => s.id === servidorIdSelecionado);
                if (servidorInfo) tituloRelatorio += ` (Servidor: ${servidorInfo.nome})`;
            } else if (grupoIdSelecionado) {
                const grupo = await dbRef.getItemById(SERVIDORES_GRUPOS_STORE_NAME, grupoIdSelecionado);
                if (grupo && grupo.idsServidoresMembros) {
                    servidoresParaRelatorio = servidoresParaRelatorio.filter(s => grupo.idsServidoresMembros.includes(s.id));
                    tituloRelatorio += ` (Grupo: ${grupo.nomeGrupo})`;
                } else {
                     if (globalShowFeedbackRef) globalShowFeedbackRef("Grupo de servidores não encontrado ou sem membros.", "warning", feedbackEl);
                }
            }
            
            const resultados = servidoresParaRelatorio.map(s => ({
                nome: s.nome,
                matricula: s.matricula || 'N/A',
                setor: s.setorLotacao || 'N/D',
                diasRemoto: s.diasTrabalhoRemoto.join(', ')
            }));
            resultados.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));

            renderTabelaResultados(resultados, resultadosContainer, tituloRelatorio,
                ['Nome do Servidor', 'Matrícula', 'Setor/Lotação', 'Dias de Trabalho Remoto'],
                (res) => [res.nome, res.matricula, res.setor, res.diasRemoto]);

        } catch (error) {
            console.error("Erro ao gerar relatório de servidores com trabalho remoto:", error);
            resultadosContainer.innerHTML = `<p class="feedback-message error">Erro ao gerar relatório: ${error.message}</p>`;
            if (globalShowFeedbackRef && feedbackEl) globalShowFeedbackRef(`Erro ao gerar relatório: ${error.message}`, "error", feedbackEl);
        }
    }

    async function getHtmlParametrosDocumentosPorTipo() {
        let tiposOptions = '';
        let servidoresOptions = '<option value="">Todos os Servidores</option>';
        try {
            const tiposDb = await dbRef.getAllItems(DOCUMENT_TYPES_STORE_NAME);
            tiposDb.sort((a,b) => a.name.localeCompare(b.name)).forEach(tipo => {
                tiposOptions += `<option value="${tipo.name.replace(/"/g, '"')}">${tipo.name}</option>`;
            });
            const servidoresDb = await dbRef.getAllItems(SERVIDORES_STORE_NAME);
            servidoresDb.filter(s => !s.isDeleted && s.status === 'Ativo')
                        .sort((a,b) => (a.nome || "").localeCompare(b.nome || ""))
                        .forEach(s => { servidoresOptions += `<option value="${s.id}">${s.nome} (${s.matricula || 'N/A'})</option>`; });

        } catch (error) { 
            console.error("Relatorios.JS: Erro ao carregar tipos/servidores para filtro:", error);
            tiposOptions = '<option value="">Erro ao carregar tipos</option>';
            servidoresOptions = '<option value="">Erro ao carregar servidores</option>';
        }
        return `
            <h4 class="text-md font-semibold mb-2 text-gray-700 dark:text-gray-200">2. Parâmetros para Documentos por Tipo</h4>
            <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">Liste documentos ativos agrupados por tipo. Filtre por período de criação, tipos específicos e/ou servidor vinculado (opcional).</p>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div>
                    <label for="relatorio-doc-tipo-select-multi" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipos (múltiplos):</label>
                    <select id="relatorio-doc-tipo-select-multi" class="form-input-text mt-1 block w-full text-sm" multiple size="4">${tiposOptions}</select>
                </div>
                <div>
                    <label for="relatorio-doc-servidor-vinculado" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Servidor Vinculado:</label>
                    <select id="relatorio-doc-servidor-vinculado" class="form-input-text mt-1 block w-full text-sm">${servidoresOptions}</select>
                </div>
                <div>
                    <label for="relatorio-doc-tipo-data-inicio" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Data Início (Criação):</label>
                    <input type="date" id="relatorio-doc-tipo-data-inicio" class="form-input-text mt-1 block w-full text-sm">
                </div>
                <div>
                    <label for="relatorio-doc-tipo-data-fim" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Data Fim (Criação):</label>
                    <input type="date" id="relatorio-doc-tipo-data-fim" class="form-input-text mt-1 block w-full text-sm">
                </div>
                <div class="lg:col-span-4">
                    <button id="btn-gerar-relatorio-doc-tipo" class="btn-primary w-full md:w-auto">Gerar Relatório</button>
                </div>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Segure Ctrl/Cmd para selecionar múltiplos tipos. Se nenhum tipo for selecionado, todos serão considerados (respeitando outros filtros).</p>
        `;
    }
    async function gerarRelatorioDocumentosPorTipo(feedbackAreaId, resultadosContainer) {
        const feedbackEl = document.getElementById(feedbackAreaId);
        const tiposSelecionados = Array.from(document.getElementById('relatorio-doc-tipo-select-multi').selectedOptions).map(opt => opt.value);
        const servidorVinculadoId = document.getElementById('relatorio-doc-servidor-vinculado').value;
        const dataInicioInput = document.getElementById('relatorio-doc-tipo-data-inicio').value; 
        const dataFimInput = document.getElementById('relatorio-doc-tipo-data-fim').value;
        
        let dataInicio = null; let dataFim = null; let tituloPeriodo = ""; let tituloTipos = tiposSelecionados.length > 0 ? ` (Tipos: ${tiposSelecionados.join(', ')})` : "";
        let tituloServidor = "";

        if (dataInicioInput && dataFimInput) {
            dataInicio = new Date(dataInicioInput + "T00:00:00"); dataFim = new Date(dataFimInput + "T23:59:59");
            if (dataInicio > dataFim) { if (globalShowFeedbackRef) globalShowFeedbackRef("A data de início não pode ser posterior à data de fim.", "warning", feedbackEl); return; }
            tituloPeriodo = ` (Criados de ${dataInicio.toLocaleDateString()} a ${dataFim.toLocaleDateString()})`;
        } else if (dataInicioInput || dataFimInput) { if (globalShowFeedbackRef) globalShowFeedbackRef("Por favor, selecione ambas as datas (início e fim) para filtrar por período, ou deixe ambas vazias.", "warning", feedbackEl); return; }
        
        resultadosContainer.innerHTML = '<p class="loading-text p-4">Gerando relatório de documentos por tipo...</p>';
        
        try {
            const todosDocumentos = await dbRef.getAllItems(DOCUMENTS_STORE_NAME); 
            let documentosFiltrados = todosDocumentos.filter(doc => !doc.isDeleted && !doc.isTemplate);

            if (servidorVinculadoId) {
                documentosFiltrados = documentosFiltrados.filter(doc => doc.servidoresVinculadosIds && doc.servidoresVinculadosIds.includes(servidorVinculadoId));
                const servidor = await dbRef.getItemById(SERVIDORES_STORE_NAME, servidorVinculadoId);
                if(servidor) tituloServidor = ` (Vinculados a: ${servidor.nome})`;
            }

            if (tiposSelecionados.length > 0) { 
                documentosFiltrados = documentosFiltrados.filter(doc => tiposSelecionados.includes(doc.docType)); 
            }
            if (dataInicio && dataFim) { 
                documentosFiltrados = documentosFiltrados.filter(doc => { const creationDate = new Date(doc.creationDate); return creationDate >= dataInicio && creationDate <= dataFim; }); 
            }
            
            const contagemPorTipo = documentosFiltrados.reduce((acc, doc) => { const tipo = doc.docType || "Não Especificado"; acc[tipo] = (acc[tipo] || 0) + 1; return acc; }, {});
            const resultados = Object.entries(contagemPorTipo).map(([tipo, quantidade]) => ({ tipo, quantidade })); 
            resultados.sort((a, b) => b.quantidade - a.quantidade); 
            
            renderTabelaResultados(resultados, resultadosContainer, `Documentos por Tipo${tituloTipos}${tituloServidor}${tituloPeriodo}`, 
                ['Tipo de Documento', 'Quantidade'], (res) => [res.tipo, res.quantidade]);
        } catch (error) {
            console.error("Erro ao gerar relatório de documentos por tipo:", error); 
            resultadosContainer.innerHTML = `<p class="feedback-message error">Erro ao gerar relatório: ${error.message}</p>`;
            if (globalShowFeedbackRef && feedbackEl) globalShowFeedbackRef(`Erro ao gerar relatório: ${error.message}`, "error", feedbackEl);
        }
    }
    async function getHtmlParametrosDocumentosPorCategoriaTag(feedbackAreaId) {
        let categoriasOptions = ''; let tagsOptions = '';
        try {
            const categoriasDb = await dbRef.getAllItems(DOCUMENT_CATEGORIES_STORE_NAME); const tagsDb = await dbRef.getAllItems(DOCUMENT_TAGS_STORE_NAME);
            if (SEFWorkStation.DocumentosCategorias && typeof SEFWorkStation.DocumentosCategorias.formatCategoryNameForDisplay === 'function') {
                categoriasDb.sort((a,b) => a.name.localeCompare(b.name)).forEach(cat => { categoriasOptions += `<option value="${cat.name.replace(/"/g, '"')}">${SEFWorkStation.DocumentosCategorias.formatCategoryNameForDisplay(cat.name)}</option>`; });
            } else { categoriasDb.sort((a,b) => a.name.localeCompare(b.name)).forEach(cat => { categoriasOptions += `<option value="${cat.name.replace(/"/g, '"')}">${cat.name}</option>`; }); }
            tagsDb.sort((a,b) => a.name.localeCompare(b.name)).forEach(tag => { tagsOptions += `<option value="${tag.name.replace(/"/g, '"')}">${tag.name}</option>`; });
        } catch (error) {
            console.error("Relatorios.JS: Erro ao carregar categorias/tags para parâmetros (doc-cat-tag):", error);
            if (globalShowFeedbackRef && document.getElementById(feedbackAreaId)) { globalShowFeedbackRef("Erro ao carregar opções de filtro.", "error", document.getElementById(feedbackAreaId)); }
        }
        return `
            <h4 class="text-md font-semibold mb-2 text-gray-700 dark:text-gray-200">2. Parâmetros para Documentos por Categoria(s) e/ou Tag(s)</h4>
            <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">Filtre documentos que possuam QUALQUER UMA das categorias selecionadas E TODAS as tags selecionadas.</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div><label for="relatorio-doc-categoria-multiselect" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Categorias (selecione uma ou mais):</label><select id="relatorio-doc-categoria-multiselect" class="form-input-text mt-1 block w-full text-sm" multiple size="5">${categoriasOptions}</select></div>
                <div><label for="relatorio-doc-tag-multiselect" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Tags (selecione uma ou mais):</label><select id="relatorio-doc-tag-multiselect" class="form-input-text mt-1 block w-full text-sm" multiple size="5">${tagsOptions}</select></div>
            </div>
            <div class="mt-4"><button id="btn-gerar-relatorio-doc-cat-tag" class="btn-primary w-full md:w-auto">Gerar Relatório</button></div>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">Nota: Se nenhuma categoria e nenhuma tag forem selecionadas, listará todos os documentos ativos.</p>`;
    }
    async function gerarRelatorioDocumentosPorCategoriaTag(feedbackAreaId, resultadosContainer) {
        const feedbackEl = document.getElementById(feedbackAreaId);
        const categoriasSelecionadas = Array.from(document.getElementById('relatorio-doc-categoria-multiselect')?.selectedOptions || []).map(opt => opt.value);
        const tagsSelecionadas = Array.from(document.getElementById('relatorio-doc-tag-multiselect')?.selectedOptions || []).map(opt => opt.value);
        resultadosContainer.innerHTML = '<p class="loading-text p-4">Gerando relatório de documentos...</p>'; let tituloRelatorio = "Documentos";
        let filtrosAplicados = [];
        if (categoriasSelecionadas.length > 0) filtrosAplicados.push(`Categorias: ${categoriasSelecionadas.map(c => SEFWorkStation.DocumentosCategorias.formatCategoryNameForDisplay(c)).join(' OU ')}`);
        if (tagsSelecionadas.length > 0) filtrosAplicados.push(`Tags: ${tagsSelecionadas.join(' E ')}`);
        if (filtrosAplicados.length > 0) tituloRelatorio += ` Filtrados por ${filtrosAplicados.join('; ')}`; else tituloRelatorio += " (Todos Ativos)";
        try {
            const todosDocumentos = await dbRef.getAllItems(DOCUMENTS_STORE_NAME); let documentosFiltrados = todosDocumentos.filter(doc => !doc.isDeleted && !doc.isTemplate);
            if (categoriasSelecionadas.length > 0) { documentosFiltrados = documentosFiltrados.filter(doc => doc.categories && doc.categories.some(catDoc => categoriasSelecionadas.includes(catDoc))); }
            if (tagsSelecionadas.length > 0) { documentosFiltrados = documentosFiltrados.filter(doc => doc.tags && tagsSelecionadas.every(tagSel => doc.tags.includes(tagSel))); }
            documentosFiltrados.sort((a, b) => new Date(b.modificationDate) - new Date(a.modificationDate));
            renderTabelaResultados(documentosFiltrados, resultadosContainer, tituloRelatorio, ['Título', 'Tipo', 'Referência', 'Modificado em', 'Categorias', 'Tags'], (doc) => [ doc.title || 'Sem Título', doc.docType || 'N/D', doc.reference || 'N/A', new Date(doc.modificationDate).toLocaleDateString(), (doc.categories && doc.categories.length > 0) ? doc.categories.map(c => (SEFWorkStation.DocumentosCategorias && SEFWorkStation.DocumentosCategorias.formatCategoryNameForDisplay) ? SEFWorkStation.DocumentosCategorias.formatCategoryNameForDisplay(c) : c).join('; ') : 'Nenhuma', (doc.tags && doc.tags.length > 0) ? doc.tags.join('; ') : 'Nenhuma' ]);
        } catch (error) {
            console.error("Erro ao gerar relatório de documentos por categoria/tag:", error); resultadosContainer.innerHTML = `<p class="feedback-message error">Erro ao gerar relatório: ${error.message}</p>`;
            if (globalShowFeedbackRef && feedbackEl) globalShowFeedbackRef(`Erro ao gerar relatório: ${error.message}`, "error", feedbackEl);
        }
    }
    function getHtmlParametrosDocumentosPorPeriodo() {
        return `
            <h4 class="text-md font-semibold mb-2 text-gray-700 dark:text-gray-200">2. Parâmetros para Documentos por Período de Modificação</h4>
            <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">Liste todos os documentos ativos modificados dentro do período especificado.</p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div><label for="relatorio-doc-periodo-data-inicio" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Data de Início (Modificação):</label><input type="date" id="relatorio-doc-periodo-data-inicio" class="form-input-text mt-1 block w-full text-sm" required></div>
                <div><label for="relatorio-doc-periodo-data-fim" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Data de Fim (Modificação):</label><input type="date" id="relatorio-doc-periodo-data-fim" class="form-input-text mt-1 block w-full text-sm" required></div>
                <div><button id="btn-gerar-relatorio-doc-periodo" class="btn-primary w-full">Gerar Relatório</button></div>
            </div>`;
    }
    async function gerarRelatorioDocumentosPorPeriodo(feedbackAreaId, resultadosContainer) {
        const feedbackEl = document.getElementById(feedbackAreaId); const dataInicioInput = document.getElementById('relatorio-doc-periodo-data-inicio').value; const dataFimInput = document.getElementById('relatorio-doc-periodo-data-fim').value;
        if (!dataInicioInput || !dataFimInput) { if (globalShowFeedbackRef) globalShowFeedbackRef("Por favor, selecione as datas de início e fim.", "warning", feedbackEl); return; }
        const dataInicio = new Date(dataInicioInput + "T00:00:00"); const dataFim = new Date(dataFimInput + "T23:59:59");
        if (dataInicio > dataFim) { if (globalShowFeedbackRef) globalShowFeedbackRef("A data de início não pode ser posterior à data de fim.", "warning", feedbackEl); return; }
        resultadosContainer.innerHTML = '<p class="loading-text p-4">Gerando relatório de documentos por período de modificação...</p>'; let tituloRelatorio = `Documentos Modificados de ${dataInicio.toLocaleDateString()} a ${dataFim.toLocaleDateString()}`;
        try {
            const todosDocumentos = await dbRef.getAllItems(DOCUMENTS_STORE_NAME); const documentosFiltrados = todosDocumentos.filter(doc => { if (doc.isDeleted || doc.isTemplate) return false; const modificationDate = new Date(doc.modificationDate); return modificationDate >= dataInicio && modificationDate <= dataFim; });
            documentosFiltrados.sort((a, b) => new Date(b.modificationDate) - new Date(a.modificationDate));
            renderTabelaResultados(documentosFiltrados, resultadosContainer, tituloRelatorio, ['Título', 'Tipo', 'Referência', 'Modificado em', 'Categorias', 'Tags'], (doc) => [ doc.title || 'Sem Título', doc.docType || 'N/D', doc.reference || 'N/A', new Date(doc.modificationDate).toLocaleString(), (doc.categories && doc.categories.length > 0) ? doc.categories.map(c => (SEFWorkStation.DocumentosCategorias && SEFWorkStation.DocumentosCategorias.formatCategoryNameForDisplay) ? SEFWorkStation.DocumentosCategorias.formatCategoryNameForDisplay(c) : c).join(', ') : 'Nenhuma', (doc.tags && doc.tags.length > 0) ? doc.tags.join(', ') : 'Nenhuma' ]);
        } catch (error) { console.error("Erro ao gerar relatório de documentos por período de modificação:", error); resultadosContainer.innerHTML = `<p class="feedback-message error">Erro ao gerar relatório: ${error.message}</p>`; }
    }
    function getHtmlParametrosModelosMaisUtilizados() {
        return `
            <h4 class="text-md font-semibold mb-2 text-gray-700 dark:text-gray-200">2. Parâmetros para Modelos Mais Utilizados</h4>
            <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">Este relatório lista os modelos de documento e quantas vezes foram utilizados para criar novos documentos.</p>
            <div class="flex items-end"><button id="btn-gerar-relatorio-modelos-usados" class="btn-primary w-full sm:w-auto">Gerar Relatório</button></div>`;
    }
    async function gerarRelatorioModelosMaisUtilizados(feedbackAreaId, resultadosContainer) {
        const feedbackEl = document.getElementById(feedbackAreaId); resultadosContainer.innerHTML = '<p class="loading-text p-4">Gerando relatório de modelos mais utilizados...</p>';
        try {
            const todosDocumentos = await dbRef.getAllItems(DOCUMENTS_STORE_NAME); const documentosGeradosDeModelos = todosDocumentos.filter(doc => !doc.isDeleted && !doc.isTemplate && doc.sourceModelId);
            const contagemUsoModelo = documentosGeradosDeModelos.reduce((acc, doc) => { acc[doc.sourceModelId] = (acc[doc.sourceModelId] || 0) + 1; return acc; }, {});
            const resultadosPromises = Object.entries(contagemUsoModelo).map(async ([modeloId, quantidade]) => { let tituloModelo = `Modelo ID ${modeloId} (Não encontrado/Excluído)`; try { const modelo = await dbRef.getItemById(DOCUMENTS_STORE_NAME, modeloId); if (modelo && modelo.isTemplate) { tituloModelo = modelo.title || `Modelo Sem Título (ID: ${modeloId})`; } } catch (e) { /* Mantém o título padrão de erro */ } return { tituloModelo, quantidade }; });
            const resultados = await Promise.all(resultadosPromises); resultados.sort((a, b) => b.quantidade - a.quantidade);
            renderTabelaResultados(resultados, resultadosContainer, "Modelos de Documentos Mais Utilizados", ['Título do Modelo', 'Quantidade de Usos'], (res) => [res.tituloModelo, res.quantidade]);
        } catch (error) { console.error("Erro ao gerar relatório de modelos mais utilizados:", error); resultadosContainer.innerHTML = `<p class="feedback-message error">Erro ao gerar relatório: ${error.message}</p>`; }
    }
    async function getHtmlParametrosContribuintesPorCategoria() {
        return `
            <h4 class="text-md font-semibold mb-2 text-gray-700 dark:text-gray-200">2. Parâmetros para Contribuintes por Categoria</h4>
            <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">Este relatório exibe a quantidade de contribuintes ativos agrupados por cada categoria.</p>
            <div class="flex items-end"><button id="btn-gerar-relatorio-contrib-categoria" class="btn-primary w-full sm:w-auto">Gerar Relatório</button></div>`;
    }
    async function gerarRelatorioContribuintesPorCategoria(feedbackAreaId, resultadosContainer) {
        const feedbackEl = document.getElementById(feedbackAreaId); resultadosContainer.innerHTML = '<p class="loading-text p-4">Gerando relatório de contribuintes por categoria...</p>';
        try {
            const todosContribuintes = await dbRef.getAllItems(CONTRIBUINTES_STORE_NAME); const contribuintesAtivos = todosContribuintes.filter(c => !c.isDeleted);
            const contagemPorCategoria = {};
            contribuintesAtivos.forEach(contrib => { if (contrib.categories && Array.isArray(contrib.categories)) { contrib.categories.forEach(catNome => { contagemPorCategoria[catNome] = (contagemPorCategoria[catNome] || 0) + 1; }); } else { contagemPorCategoria["Sem Categoria"] = (contagemPorCategoria["Sem Categoria"] || 0) + 1; } });
            const resultados = Object.entries(contagemPorCategoria).map(([categoriaNome, quantidade]) => { let categoriaDisplay = categoriaNome; if (SEFWorkStation.ContribuintesCategorias && SEFWorkStation.ContribuintesCategorias.formatCategoryNameForDisplay) { categoriaDisplay = SEFWorkStation.ContribuintesCategorias.formatCategoryNameForDisplay(categoriaNome); } return { categoria: categoriaDisplay, quantidade }; });
            resultados.sort((a, b) => b.quantidade - a.quantidade);
            renderTabelaResultados(resultados, resultadosContainer, "Contribuintes por Categoria", ['Categoria do Contribuinte', 'Quantidade'], (res) => [res.categoria, res.quantidade]);
        } catch (error) { console.error("Erro ao gerar relatório de contribuintes por categoria:", error); resultadosContainer.innerHTML = `<p class="feedback-message error">Erro ao gerar relatório: ${error.message}</p>`; }
    }
    function getHtmlParametrosTarefasPorStatus() {
        return `
            <h4 class="text-md font-semibold mb-2 text-gray-700 dark:text-gray-200">2. Parâmetros para Tarefas por Status</h4>
            <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">Exibe a contagem de tarefas ativas agrupadas por status. Filtre por período de criação (opcional).</p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div><label for="relatorio-tarefa-status-data-inicio" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Data de Início (Criação):</label><input type="date" id="relatorio-tarefa-status-data-inicio" class="form-input-text mt-1 block w-full text-sm"></div>
                <div><label for="relatorio-tarefa-status-data-fim" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Data de Fim (Criação):</label><input type="date" id="relatorio-tarefa-status-data-fim" class="form-input-text mt-1 block w-full text-sm"></div>
                <div><button id="btn-gerar-relatorio-tarefas-status" class="btn-primary w-full">Gerar Relatório</button></div>
            </div>`;
    }
    async function gerarRelatorioTarefasPorStatus(feedbackAreaId, resultadosContainer) {
        const feedbackEl = document.getElementById(feedbackAreaId); const dataInicioInput = document.getElementById('relatorio-tarefa-status-data-inicio').value; const dataFimInput = document.getElementById('relatorio-tarefa-status-data-fim').value;
        let dataInicio = null; let dataFim = null; let tituloPeriodo = "";
        if (dataInicioInput && dataFimInput) { dataInicio = new Date(dataInicioInput + "T00:00:00"); dataFim = new Date(dataFimInput + "T23:59:59"); if (dataInicio > dataFim) { if (globalShowFeedbackRef) globalShowFeedbackRef("A data de início não pode ser posterior à data de fim.", "warning", feedbackEl); return; } tituloPeriodo = ` (Criadas de ${dataInicio.toLocaleDateString()} a ${dataFim.toLocaleDateString()})`; } 
        else if (dataInicioInput || dataFimInput) { if (globalShowFeedbackRef) globalShowFeedbackRef("Por favor, selecione ambas as datas (início e fim) para filtrar por período, ou deixe ambas vazias.", "warning", feedbackEl); return; }
        resultadosContainer.innerHTML = '<p class="loading-text p-4">Gerando relatório de tarefas por status...</p>';
        try {
            const todasTarefas = await dbRef.getAllItems(TAREFAS_STORE_NAME); let tarefasFiltradas = todasTarefas.filter(tarefa => !tarefa.isExcluida);
            if (dataInicio && dataFim) { tarefasFiltradas = tarefasFiltradas.filter(tarefa => { const creationDate = new Date(tarefa.dataCriacao); return creationDate >= dataInicio && creationDate <= dataFim; }); }
            const contagemPorStatus = tarefasFiltradas.reduce((acc, tarefa) => { const status = tarefa.status || "Não Especificado"; acc[status] = (acc[status] || 0) + 1; return acc; }, {});
            STATUS_TAREFA_OPTIONS_REL.forEach(statusOption => { if (!contagemPorStatus.hasOwnProperty(statusOption)) { contagemPorStatus[statusOption] = 0; } });
            const resultados = Object.entries(contagemPorStatus).map(([status, quantidade]) => ({ status, quantidade }));
            resultados.sort((a, b) => { const indexA = STATUS_TAREFA_OPTIONS_REL.indexOf(a.status); const indexB = STATUS_TAREFA_OPTIONS_REL.indexOf(b.status); if (indexA !== -1 && indexB !== -1) return indexA - indexB; if (indexA !== -1) return -1; if (indexB !== -1) return 1; return a.status.localeCompare(b.status); });
            renderTabelaResultados(resultados, resultadosContainer, `Tarefas por Status${tituloPeriodo}`, ['Status da Tarefa', 'Quantidade'], (res) => [res.status, res.quantidade]);
        } catch (error) {
            console.error("Erro ao gerar relatório de tarefas por status:", error); resultadosContainer.innerHTML = `<p class="feedback-message error">Erro ao gerar relatório: ${error.message}</p>`;
            if (globalShowFeedbackRef && feedbackEl) globalShowFeedbackRef(`Erro ao gerar relatório: ${error.message}`, "error", feedbackEl);
        }
    }
    function getHtmlParametrosTarefasPorResponsavel() {
        return `
            <h4 class="text-md font-semibold mb-2 text-gray-700 dark:text-gray-200">2. Parâmetros para Tarefas por Responsável</h4>
            <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">Este relatório exibe a contagem de tarefas ativas agrupadas por servidor responsável.</p>
            <div class="flex items-end"><button id="btn-gerar-relatorio-tarefas-responsavel" class="btn-primary w-full sm:w-auto">Gerar Relatório</button></div>`;
    }
    async function gerarRelatorioTarefasPorResponsavel(feedbackAreaId, resultadosContainer) {
        const feedbackEl = document.getElementById(feedbackAreaId); resultadosContainer.innerHTML = '<p class="loading-text p-4">Gerando relatório de tarefas por responsável...</p>';
        try {
            const todasTarefas = await dbRef.getAllItems(TAREFAS_STORE_NAME); const todosServidores = await dbRef.getAllItems(SERVIDORES_STORE_NAME);
            const mapaServidores = todosServidores.reduce((map, servidor) => { map[servidor.id] = servidor.nome; return map; }, {});
            const tarefasAtivas = todasTarefas.filter(tarefa => !tarefa.isExcluida);
            const contagemPorResponsavel = tarefasAtivas.reduce((acc, tarefa) => { const idResponsavel = tarefa.servidorResponsavelId || "Não Atribuído"; acc[idResponsavel] = (acc[idResponsavel] || 0) + 1; return acc; }, {});
            const resultados = Object.entries(contagemPorResponsavel).map(([idServidor, quantidade]) => { const nomeServidor = mapaServidores[idServidor] || idServidor; return { responsavel: nomeServidor, quantidade: quantidade }; });
            resultados.sort((a, b) => b.quantidade - a.quantidade);
            renderTabelaResultados(resultados, resultadosContainer, "Tarefas por Responsável", ['Servidor Responsável', 'Quantidade de Tarefas'], (res) => [res.responsavel, res.quantidade]);
        } catch (error) {
            console.error("Erro ao gerar relatório de tarefas por responsável:", error); resultadosContainer.innerHTML = `<p class="feedback-message error">Erro ao gerar relatório: ${error.message}</p>`;
            if (globalShowFeedbackRef && feedbackEl) globalShowFeedbackRef(`Erro ao gerar relatório: ${error.message}`, "error", feedbackEl);
        }
    }
    function getHtmlParametrosProcessosPorStatusTipo() {
        return `
            <h4 class="text-md font-semibold mb-2 text-gray-700 dark:text-gray-200">2. Parâmetros para Processos por Status e Tipo</h4>
            <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">Exibe a contagem de processos ativos (Protocolos, PTAs, Autuações) agrupados por tipo e status. Filtre por período de criação/entrada (opcional).</p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div><label for="relatorio-processo-data-inicio" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Data de Início (Criação/Entrada):</label><input type="date" id="relatorio-processo-data-inicio" class="form-input-text mt-1 block w-full text-sm"></div>
                <div><label for="relatorio-processo-data-fim" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Data de Fim (Criação/Entrada):</label><input type="date" id="relatorio-processo-data-fim" class="form-input-text mt-1 block w-full text-sm"></div>
                <div><button id="btn-gerar-relatorio-processos-status-tipo" class="btn-primary w-full">Gerar Relatório de Processos</button></div>
            </div>`;
    }
    async function gerarRelatorioProcessosPorStatusTipo(feedbackAreaId, resultadosContainer) {
        const feedbackEl = document.getElementById(feedbackAreaId); const dataInicioInput = document.getElementById('relatorio-processo-data-inicio').value; const dataFimInput = document.getElementById('relatorio-processo-data-fim').value;
        let dataInicio = null; let dataFim = null; let tituloPeriodo = "";
        if (dataInicioInput && dataFimInput) { dataInicio = new Date(dataInicioInput + "T00:00:00"); dataFim = new Date(dataFimInput + "T23:59:59"); if (dataInicio > dataFim) { if (globalShowFeedbackRef) globalShowFeedbackRef("A data de início não pode ser posterior à data de fim.", "warning", feedbackEl); return; } tituloPeriodo = ` (Criados/Entrada de ${dataInicio.toLocaleDateString()} a ${dataFim.toLocaleDateString()})`; } 
        else if (dataInicioInput || dataFimInput) { if (globalShowFeedbackRef) globalShowFeedbackRef("Por favor, selecione ambas as datas (início e fim) para filtrar por período, ou deixe ambas vazias.", "warning", feedbackEl); return; }
        resultadosContainer.innerHTML = '<p class="loading-text p-4">Gerando relatório de processos...</p>';
        try {
            let protocolos = await dbRef.getAllItems(PROTOCOLOS_STORE_NAME); let ptas = await dbRef.getAllItems(PTAS_STORE_NAME); let autuacoes = await dbRef.getAllItems(AUTUACOES_STORE_NAME);
            if (dataInicio && dataFim) {
                protocolos = protocolos.filter(p => { const d = new Date(p.dataHoraProtocolo); return d >= dataInicio && d <= dataFim; });
                ptas = ptas.filter(p => { const d = new Date(p.dataPTA + "T00:00:00"); return d >= dataInicio && d <= dataFim; });
                autuacoes = autuacoes.filter(a => { const d = new Date(a.dataAutuacao); return d >= dataInicio && d <= dataFim; });
            }
            const contagem = {};
            protocolos.filter(p => !p.isDeleted).forEach(p => { const status = p.statusProtocolo || 'Não Especificado'; const tipo = 'Protocolo'; contagem[tipo] = contagem[tipo] || {}; contagem[tipo][status] = (contagem[tipo][status] || 0) + 1; });
            ptas.filter(p => !p.isDeleted).forEach(p => { const status = p.statusPTA || 'Não Especificado'; const tipo = 'PTA'; contagem[tipo] = contagem[tipo] || {}; contagem[tipo][status] = (contagem[tipo][status] || 0) + 1; });
            autuacoes.filter(a => !a.isDeleted).forEach(a => { const status = a.statusAutuacao || 'Não Especificado'; const tipo = 'Autuação'; contagem[tipo] = contagem[tipo] || {}; contagem[tipo][status] = (contagem[tipo][status] || 0) + 1; });
            const resultados = []; const tiposDeProcessoOrdem = ['Protocolo', 'PTA', 'Autuação'];
            tiposDeProcessoOrdem.forEach(tipo => {
                if (contagem[tipo]) {
                    let statusOptions; if (tipo === 'Protocolo') statusOptions = STATUS_PROTOCOLO_OPTIONS_REL; else if (tipo === 'PTA') statusOptions = STATUS_PTA_OPTIONS_REL; else if (tipo === 'Autuação') statusOptions = STATUS_AUTUACAO_OPTIONS_REL; else statusOptions = Object.keys(contagem[tipo]);
                    statusOptions.forEach(status => { resultados.push({ tipoProcesso: tipo, statusProcesso: status, quantidade: contagem[tipo][status] || 0 }); });
                    Object.keys(contagem[tipo]).forEach(statusExistente => { if (!statusOptions.includes(statusExistente)) { resultados.push({ tipoProcesso: tipo, statusProcesso: statusExistente, quantidade: contagem[tipo][statusExistente] }); } });
                }
            });
            resultados.sort((a, b) => {
                const indexTipoA = tiposDeProcessoOrdem.indexOf(a.tipoProcesso); const indexTipoB = tiposDeProcessoOrdem.indexOf(b.tipoProcesso); if (indexTipoA !== indexTipoB) return indexTipoA - indexTipoB;
                let statusOptionsOrdem; if (a.tipoProcesso === 'Protocolo') statusOptionsOrdem = STATUS_PROTOCOLO_OPTIONS_REL; else if (a.tipoProcesso === 'PTA') statusOptionsOrdem = STATUS_PTA_OPTIONS_REL; else if (a.tipoProcesso === 'Autuação') statusOptionsOrdem = STATUS_AUTUACAO_OPTIONS_REL; else return a.statusProcesso.localeCompare(b.statusProcesso);
                const indexStatusA = statusOptionsOrdem.indexOf(a.statusProcesso); const indexStatusB = statusOptionsOrdem.indexOf(b.statusProcesso);
                if (indexStatusA !== -1 && indexStatusB !== -1) return indexStatusA - indexStatusB; if (indexStatusA !== -1) return -1; if (indexStatusB !== -1) return 1; return a.statusProcesso.localeCompare(b.statusProcesso);
            });
            renderTabelaResultados(resultados, resultadosContainer, `Processos por Status e Tipo${tituloPeriodo}`, ['Tipo de Processo', 'Status', 'Quantidade'], (res) => [res.tipoProcesso, res.statusProcesso, res.quantidade]);
        } catch (error) {
            console.error("Erro ao gerar relatório de Processos por Status e Tipo:", error); resultadosContainer.innerHTML = `<p class="feedback-message error">Erro ao gerar relatório: ${error.message}</p>`;
            if (globalShowFeedbackRef && feedbackEl) globalShowFeedbackRef(`Erro ao gerar relatório: ${error.message}`, "error", feedbackEl);
        }
    }
    async function getHtmlParametrosVisaoGeralEntidade() {
        const tiposEntidadeOptions = ENTIDADES_PARA_VISAO_GERAL.map(ent => `<option value="${ent.value}">${ent.label}</option>`).join('');
        return `
            <h4 class="text-md font-semibold mb-2 text-gray-700 dark:text-gray-200">2. Parâmetros para Visão Geral de Entidade</h4>
            <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">Selecione um tipo de entidade e, em seguida, a entidade específica para ver seus detalhes e vínculos.</p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div><label for="relatorio-visao-geral-tipo-entidade" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de Entidade:</label><select id="relatorio-visao-geral-tipo-entidade" class="form-input-text mt-1 block w-full text-sm"><option value="">-- Selecione o Tipo --</option>${tiposEntidadeOptions}</select></div>
                <div class="md:col-span-2"><label for="relatorio-visao-geral-entidade-especifica" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Entidade Específica:</label><select id="relatorio-visao-geral-entidade-especifica" class="form-input-text mt-1 block w-full text-sm" disabled><option value="">-- Selecione um tipo primeiro --</option></select></div>
                <div class="md:col-span-3"><button id="btn-gerar-relatorio-visao-geral" class="btn-primary w-full md:w-auto" disabled>Gerar Visão Geral</button></div>
            </div>`;
    }
    async function addEventListenersParametrosVisaoGeralEntidade() {
        const tipoEntidadeSelect = document.getElementById('relatorio-visao-geral-tipo-entidade');
        const entidadeEspecificaSelect = document.getElementById('relatorio-visao-geral-entidade-especifica');
        const btnGerar = document.getElementById('btn-gerar-relatorio-visao-geral');
        tipoEntidadeSelect.addEventListener('change', async () => {
            const storeNameSelecionada = tipoEntidadeSelect.value;
            entidadeEspecificaSelect.innerHTML = '<option value="">Carregando...</option>'; entidadeEspecificaSelect.disabled = true; btnGerar.disabled = true;
            if (!storeNameSelecionada) { entidadeEspecificaSelect.innerHTML = '<option value="">-- Selecione um tipo primeiro --</option>'; return; }
            try {
                const itens = await dbRef.getAllItems(storeNameSelecionada); const configEntidade = ENTIDADES_PARA_VISAO_GERAL.find(e => e.value === storeNameSelecionada);
                if (!configEntidade) { entidadeEspecificaSelect.innerHTML = '<option value="">Erro ao carregar</option>'; return; }
                itens.sort((a,b) => (a[configEntidade.displayField] || a.nome || "").localeCompare(b[configEntidade.displayField] || b.nome || ""));
                entidadeEspecificaSelect.innerHTML = '<option value="">-- Selecione a Entidade --</option>';
                itens.filter(item => !(item.isDeleted || item.isExcluida || (storeNameSelecionada === DOCUMENTS_STORE_NAME && item.isTemplate))).forEach(item => { let displayText = item[configEntidade.displayField] || `ID: ${item.id.substring(0, 8)}`; if (configEntidade.secondaryField && item[configEntidade.secondaryField]) { displayText += ` (${item[configEntidade.secondaryField]})`; } entidadeEspecificaSelect.add(new Option(displayText, item.id)); });
                entidadeEspecificaSelect.disabled = false;
            } catch (error) { console.error("Erro ao popular select de entidade específica:", error); entidadeEspecificaSelect.innerHTML = '<option value="">Erro ao carregar entidades</option>'; }
        });
        entidadeEspecificaSelect.addEventListener('change', () => { btnGerar.disabled = !entidadeEspecificaSelect.value; });
    }
    async function gerarRelatorioVisaoGeralEntidade(feedbackAreaId, resultadosContainer) {
        const feedbackEl = document.getElementById(feedbackAreaId); const storeNameSelecionada = document.getElementById('relatorio-visao-geral-tipo-entidade').value; const entidadeIdSelecionada = document.getElementById('relatorio-visao-geral-entidade-especifica').value;
        if (!storeNameSelecionada || !entidadeIdSelecionada) { if (globalShowFeedbackRef) globalShowFeedbackRef("Por favor, selecione o tipo de entidade e a entidade específica.", "warning", feedbackEl); return; }
        resultadosContainer.innerHTML = '<p class="loading-text p-4">Gerando visão geral da entidade...</p>';
        try {
            const entidadePrincipal = await dbRef.getItemById(storeNameSelecionada, entidadeIdSelecionada);
            if (!entidadePrincipal) { resultadosContainer.innerHTML = '<p class="feedback-message error">Entidade principal não encontrada.</p>'; return; }
            const configEntidadePrincipal = ENTIDADES_PARA_VISAO_GERAL.find(e => e.value === storeNameSelecionada);
            let tituloRelatorio = `Visão Geral de ${configEntidadePrincipal.label}: ${entidadePrincipal[configEntidadePrincipal.displayField] || entidadePrincipal.nome || entidadePrincipal.id}`;
            const todosVinculos = await SEFWorkStation.SharedUtils.buscarTodosVinculosDeUmaEntidade(entidadeIdSelecionada, storeNameSelecionada, dbRef);
            renderResultadoVisaoGeralEntidade(entidadePrincipal, todosVinculos, resultadosContainer, tituloRelatorio);
        } catch (error) { console.error("Erro ao gerar visão geral da entidade:", error); resultadosContainer.innerHTML = `<p class="feedback-message error">Erro ao gerar relatório: ${error.message}</p>`; }
    }
    function renderResultadoVisaoGeralEntidade(entidadePrincipal, vinculos, container, tituloRelatorio) {
        let html = `<div class="mt-4 section-box p-4 border dark:border-slate-700 rounded-lg">`;
        html += `<div class="flex justify-between items-center mb-3"><h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100">${tituloRelatorio}</h3><div class="flex space-x-2"><button class="btn-imprimir-relatorio-especifico btn-secondary btn-sm text-xs">Imprimir</button></div></div>`;
        
        html += `<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">`;

        // Coluna Esquerda: Detalhes
        html += `<div class="p-3 border dark:border-slate-600 rounded-md">
                    <h4 class="text-md font-semibold mb-2">Detalhes da Entidade Principal:</h4>
                    <dl class="grid grid-cols-1 gap-x-4 gap-y-1 text-sm">`;
        for (const key in entidadePrincipal) {
            if (Object.hasOwnProperty.call(entidadePrincipal, key) && typeof entidadePrincipal[key] !== 'object' && key !== 'content' && key !== 'descricaoDetalhada' && key !== 'historicoAndamento') {
                html += `<div class="flex"><dt class="font-medium text-gray-500 dark:text-gray-400 w-1/3 truncate" title="${key}:">${key.charAt(0).toUpperCase() + key.slice(1)}:</dt><dd class="text-gray-700 dark:text-gray-200 w-2/3 break-words">${entidadePrincipal[key] || 'N/A'}</dd></div>`;
            }
        }
        html += `</dl></div>`;

        // Coluna Direita: Vínculos
        html += `<div class="p-3 border dark:border-slate-600 rounded-md">
                    <h4 class="text-md font-semibold mb-2">Itens Vinculados:</h4>`;
        if (vinculos && Object.values(vinculos).some(v => v.length > 0)) {
            for (const tipoVinculo in vinculos) {
                if (vinculos[tipoVinculo].length > 0) {
                    const configVinculo = ENTIDADES_PARA_VISAO_GERAL.find(e => e.value === tipoVinculo) || {label: tipoVinculo, displayField: 'id'};
                    html += `<div class="mb-3"><h5 class="text-sm font-semibold text-gray-600 dark:text-gray-300">${configVinculo.label} (${vinculos[tipoVinculo].length}):</h5><ul class="list-disc list-inside ml-4 text-xs">`;
                    vinculos[tipoVinculo].forEach(item => { 
                        let displayText = item[configVinculo.displayField] || item.nome || item.titulo || `ID: ${item.id.substring(0,8)}`;
                        if(configVinculo.secondaryField && item[configVinculo.secondaryField]) displayText += ` (${item[configVinculo.secondaryField]})`;
                        let viewAction = ''; 
                        const entidadeConfig = ENTIDADES_PARA_VISAO_GERAL.find(e => e.value === item._storeName); 
                        if (entidadeConfig && SEFWorkStation[entidadeConfig.label + 'View'] && SEFWorkStation[entidadeConfig.label + 'View'].renderVisualizarPage) { 
                            viewAction = `visualizar-${entidadeConfig.label.toLowerCase().replace(' ', '-')}`; 
                        } else if (item._storeName === DOCUMENTS_STORE_NAME) viewAction = 'visualizar-documento'; 
                        else if (item._storeName === CONTRIBUINTES_STORE_NAME) viewAction = 'visualizar-contribuinte';
                        html += `<li><a href="#" class="link-visualizar-item-relacionado text-blue-500 hover:underline dark:text-blue-400" data-store-name="${item._storeName}" data-id="${item.id}" data-view-action="${viewAction}">${displayText}</a></li>`;
                    });
                    html += '</ul></div>';
                }
            }
        } else {
            html += '<p class="text-sm text-gray-500 dark:text-gray-400">Nenhum item vinculado encontrado.</p>';
        }
        html += `</div>`; // Fim da Coluna Direita
        html += `</div>`; // Fim do Grid
        html += '</div>'; // Fim do section-box

        container.innerHTML = html;
        container.querySelectorAll('.link-visualizar-item-relacionado').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault(); const id = e.currentTarget.dataset.id; const storeName = e.currentTarget.dataset.storeName; let action = e.currentTarget.dataset.viewAction;
                if(!action) { const config = ENTIDADES_PARA_VISAO_GERAL.find(cfg => cfg.value === storeName); if (config) action = `visualizar-${config.label.toLowerCase().replace(/\s+/g, '-')}`; }
                if (action && appModuleRef && appModuleRef.handleMenuAction) { const dataKey = ENTIDADES_PARA_VISAO_GERAL.find(cfg => cfg.value === storeName)?.dataKey || 'id'; appModuleRef.handleMenuAction(action, { [dataKey]: id, originatingView: 'relatorio-visao-geral' }); }
                else { if(globalShowFeedbackRef) globalShowFeedbackRef("Não foi possível navegar para o item vinculado.", "warning"); }
            });
        });
        container.querySelector('.btn-imprimir-relatorio-especifico')?.addEventListener('click', (e) => {
            const conteudoParaImprimir = container.innerHTML; const printWindow = window.open('', '_blank');
            printWindow.document.write('<html><head><title>Relatório SEFWorkStation - Visão Geral</title>'); printWindow.document.write('<link rel="stylesheet" href="style.css">'); printWindow.document.write('<style>body{font-family:sans-serif;margin:20px;} .section-box{border:none!important; box-shadow:none!important;} .btn-imprimir-relatorio-especifico, .btn-exportar-csv-relatorio, #btn-ajuda-relatorios {display:none!important;} </style>');
            printWindow.document.write('</head><body class="bg-white text-black">'); printWindow.document.write(conteudoParaImprimir.replace(/dark:[^ ]+/g, '')); printWindow.document.write('</body></html>'); printWindow.document.close();
            setTimeout(() => { const printContent = printWindow.document.querySelector('#relatorio-resultados-container div.section-box'); if (printContent) { printWindow.document.body.innerHTML = `<h2>${tituloRelatorio}</h2>` + printContent.innerHTML; } printWindow.print(); }, 500);
        });
    }

    function criarNomeArquivoRelatorio(tituloRelatorio) {
        const sanitizedTitle = tituloRelatorio.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/^-+|-+$/g, ''); 
        const date = new Date().toISOString().slice(0, 10);
        return `relatorio-${sanitizedTitle || 'geral'}-${date}.csv`;
    }
    function exportDataToCsv(headers, rows, filename) {
        const columnDelimiter = ';'; const lineDelimiter = '\n';
        const sanitizeCell = (cell) => { let cellString = String(cell === null || cell === undefined ? '' : cell); cellString = cellString.replace(/"/g, '""'); if (cellString.includes(columnDelimiter) || cellString.includes(lineDelimiter) || cellString.includes('"')) { cellString = `"${cellString}"`; } return cellString; };
        const csvHeaders = headers.map(sanitizeCell).join(columnDelimiter); const csvRows = rows.map(row => row.map(sanitizeCell).join(columnDelimiter)).join(lineDelimiter); const csvString = csvHeaders + lineDelimiter + csvRows;
        const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement("a");
        if (link.download !== undefined) { const url = URL.createObjectURL(blob); link.setAttribute("href", url); link.setAttribute("download", filename); link.style.visibility = 'hidden'; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url); } 
        else { if(globalShowFeedbackRef) globalShowFeedbackRef("Seu navegador não suporta o download automático de arquivos.", "warning"); }
    }
    function renderTabelaResultados(resultados, container, tituloRelatorio, colunasHeaders, mapRowDataFn) {
        if (resultados.length === 0) { container.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400 py-8">Nenhum dado encontrado para este relatório.</p>`; return; }
        let tabelaHtml = `
            <div class="mt-4 section-box p-4 border dark:border-slate-700 rounded-lg">
                 <div class="flex justify-between items-center mb-3">
                    <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100">${tituloRelatorio}</h3>
                    <div class="flex space-x-2"><button class="btn-exportar-csv-relatorio btn-secondary btn-sm text-xs">Exportar CSV</button><button class="btn-imprimir-relatorio-especifico btn-secondary btn-sm text-xs">Imprimir</button></div>
                </div>
                <div class="table-list-container"><table class="documentos-table"><thead><tr>${colunasHeaders.map(header => `<th>${header}</th>`).join('')}</tr></thead><tbody>${resultados.map(res => { const rowData = mapRowDataFn(res); return `<tr>${rowData.map(cell => `<td>${cell}</td>`).join('')}</tr>`; }).join('')}</tbody></table></div>
            </div>`;
        container.innerHTML = tabelaHtml;
        container.querySelector('.btn-imprimir-relatorio-especifico')?.addEventListener('click', (e) => {
            const tabelaParaImprimir = e.target.closest('.section-box').querySelector('.table-list-container').innerHTML;
            const printWindow = window.open('', '_blank'); printWindow.document.write('<html><head><title>Relatório SEFWorkStation</title>');
            printWindow.document.write('<style>body{font-family:sans-serif;margin:20px;} table{width:100%;border-collapse:collapse;} th,td{border:1px solid #ccc;padding:8px;text-align:left;} th{background-color:#f2f2f2;}</style>');
            printWindow.document.write('</head><body>'); printWindow.document.write(`<h2>${tituloRelatorio}</h2>`); printWindow.document.write(tabelaParaImprimir); printWindow.document.write('</body></html>'); printWindow.document.close(); printWindow.print();
        });
        container.querySelector('.btn-exportar-csv-relatorio')?.addEventListener('click', () => {
            try { const rowsForCsv = resultados.map(res => mapRowDataFn(res)); const filename = criarNomeArquivoRelatorio(tituloRelatorio); exportDataToCsv(colunasHeaders, rowsForCsv, filename); if(globalShowFeedbackRef) globalShowFeedbackRef("Exportação para CSV iniciada.", "success"); } 
            catch (error) { console.error("Erro ao exportar para CSV:", error); if(globalShowFeedbackRef) globalShowFeedbackRef("Falha ao exportar para CSV.", "error"); }
        });
    }

    return {
        init,
        renderPaginaRelatorios
    };
})();