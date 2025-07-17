// js/tarefasCalendario.js - Lógica para Visualização de Tarefas em Calendário
// v1.6.0 - CORREÇÃO: Utiliza EntityConfig.filterActiveItems para filtrar tarefas arquivadas do calendário.
// v1.5.2 - Remove classe page-section para expandir a largura da visualização.
// (Histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.TarefasCalendario = (function() {
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let dbRef;
    let appModuleRef;
    let calendarInstance = null;
    let calendarioEl = null; 
    let currentCalendarFilters = { 
        status: '',
        prioridade: '',
        responsavel: ''
    };
    let todasTarefasCache = []; 

    const TAREFAS_STORE_NAME = 'tarefasStore';
    const STATUS_TAREFA_OPTIONS_CAL = ['Pendente', 'Em Andamento', 'Concluída', 'Cancelada', 'Aguardando Terceiros']; 
    const PRIORIDADES_TAREFA_OPTIONS_CAL = ['Baixa', 'Média', 'Alta', 'Urgente']; 

    function init(mainWrapper, showFeedbackFunc, dbModuleRef, applicationModuleRef) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedbackFunc;
        dbRef = dbModuleRef;
        appModuleRef = applicationModuleRef;

        if (!dbRef) console.error("TarefasCalendario.JS: init - Referência ao DB não fornecida!");
        if (!mainContentWrapperRef) console.error("TarefasCalendario.JS: init - mainContentWrapperRef não fornecido.");
        if (!appModuleRef) console.error("TarefasCalendario.JS: init - appModuleRef não fornecido.");
        console.log("TarefasCalendario.JS: Módulo inicializado (v1.6.0).");
    }

    function formatarTarefaParaEvento(tarefa) {
        if (!tarefa.dataVencimento) {
            return null;
        }
        const dataVencimentoObj = new Date(tarefa.dataVencimento + 'T00:00:00'); 
        const dataFimEvento = new Date(dataVencimentoObj);
        dataFimEvento.setDate(dataVencimentoObj.getDate() + 1);

        let corEvento = '#3788d8'; 
        let corTextoEvento = '#ffffff';
        let classeAdicional = '';
        let tituloEvento = tarefa.titulo || 'Tarefa Sem Título';

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0); 

        if (tarefa.status === 'Concluída') {
            tituloEvento = `✅ ${tituloEvento}`;
            corEvento = '#a0aec0'; 
            corTextoEvento = '#ffffff';
        } else if (tarefa.status === 'Cancelada') {
            tituloEvento = `❌ ${tituloEvento}`;
            corEvento = '#cbd5e0'; 
            corTextoEvento = '#4a5568'; 
        } else if (dataVencimentoObj < hoje) {
            tituloEvento = `❗ ${tituloEvento} (Vencida)`;
            corEvento = 'hsl(0, 65%, 55%)'; 
            corTextoEvento = '#ffffff';
            classeAdicional = 'evento-vencido fc-event-vencido'; 
        } else {
            switch (tarefa.prioridade) {
                case 'Urgente':
                    corEvento = 'hsl(0, 75%, 60%)'; 
                    break;
                case 'Alta':
                    corEvento = 'hsl(30, 80%, 55%)'; 
                    break;
                case 'Média':
                    corEvento = 'hsl(50, 85%, 60%)'; 
                    corTextoEvento = '#333333';
                    break;
                case 'Baixa':
                    corEvento = 'hsl(200, 70%, 55%)'; 
                    break;
            }
        }

        return {
            id: tarefa.id, 
            title: tituloEvento,
            start: tarefa.dataVencimento, 
            end: dataFimEvento.toISOString().split('T')[0], 
            allDay: true, 
            backgroundColor: corEvento,
            borderColor: corEvento, 
            textColor: corTextoEvento,
            classNames: classeAdicional ? [classeAdicional] : [],
            extendedProps: { 
                descricao: tarefa.descricaoDetalhada,
                status: tarefa.status,
                prioridade: tarefa.prioridade,
                responsavel: tarefa.responsavel,
                numeroIdentificacao: tarefa.numeroIdentificacao,
                dataCriacao: tarefa.dataCriacao,
                tags: tarefa.tags || []
            }
        };
    }

    async function aplicarFiltrosECarregarCalendario() {
        const feedbackAreaEl = document.getElementById("feedback-calendario-tarefas"); 
        if (!calendarInstance || !calendarioEl) { 
             if(globalShowFeedbackRef && feedbackAreaEl) globalShowFeedbackRef("Instância do calendário ou elemento não encontrado. Não é possível aplicar filtros.", "warning", feedbackAreaEl);
            console.warn("TarefasCalendario.JS: aplicarFiltrosECarregarCalendario - Instância do calendário ou elemento não encontrado.");
            return;
        }

        try {
            if (todasTarefasCache.length === 0) {
                // CORREÇÃO: Utiliza EntityConfig para garantir que apenas tarefas ativas sejam cacheadas.
                const todasTarefasDB = await dbRef.getAllItems(TAREFAS_STORE_NAME);
                todasTarefasCache = window.SEFWorkStation.EntityConfig.filterActiveItems(todasTarefasDB, TAREFAS_STORE_NAME);
            }
            
            let tarefasFiltradas = todasTarefasCache; // Já está filtrado de deletados/arquivados

            if (currentCalendarFilters.status) {
                tarefasFiltradas = tarefasFiltradas.filter(t => t.status === currentCalendarFilters.status);
            }
            if (currentCalendarFilters.prioridade) {
                tarefasFiltradas = tarefasFiltradas.filter(t => t.prioridade === currentCalendarFilters.prioridade);
            }
            if (currentCalendarFilters.responsavel) {
                const respTerm = currentCalendarFilters.responsavel.toLowerCase().trim();
                tarefasFiltradas = tarefasFiltradas.filter(t => t.responsavel && t.responsavel.toLowerCase().includes(respTerm));
            }

            const eventos = tarefasFiltradas.map(formatarTarefaParaEvento).filter(e => e !== null);
            calendarInstance.removeAllEvents();
            calendarInstance.addEventSource(eventos);

        } catch (error) {
            console.error("TarefasCalendario.JS: Erro ao aplicar filtros e recarregar calendário:", error);
            if(globalShowFeedbackRef && feedbackAreaEl) globalShowFeedbackRef("Erro ao aplicar filtros no calendário.", "error", feedbackAreaEl);
        }
    }

    async function renderCalendarioTarefasPage() {
        if (!mainContentWrapperRef) {
            console.error("TarefasCalendario.JS: renderCalendarioTarefasPage - mainContentWrapperRef não definido.");
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico ao tentar renderizar a página do calendário de tarefas.", "error");
            return;
        }

        if (appModuleRef && typeof appModuleRef.setCurrentViewTarget === 'function') {
            appModuleRef.setCurrentViewTarget('calendario-tarefas');
        }
        
        const feedbackAreaId = "feedback-calendario-tarefas";
        todasTarefasCache = []; 

        const todasTarefasDB = await dbRef.getAllItems(TAREFAS_STORE_NAME);
        const tarefasAtivas = window.SEFWorkStation.EntityConfig.filterActiveItems(todasTarefasDB, TAREFAS_STORE_NAME);
        const responsaveisUnicos = [...new Set(tarefasAtivas.map(t => t.responsavel).filter(r => r).sort())];

        mainContentWrapperRef.innerHTML = `
            <div id="calendario-tarefas-container"> 
                <div id="${feedbackAreaId}" class="mb-4"></div>
                <div class="flex justify-between items-center mb-4 flex-wrap gap-2">
                    <h2 class="text-xl font-semibold">Calendário de Tarefas</h2>
                    <button id="btn-voltar-calendario-tarefas" class="btn-secondary btn-sm">Voltar para Lista</button>
                </div>

                <div class="filtros-calendario p-3 mb-4 border dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
                        <div>
                            <label for="filter-cal-status" class="block text-xs font-medium text-gray-700 dark:text-gray-300">Status:</label>
                            <select id="filter-cal-status" class="form-input-text mt-1 block w-full text-sm">
                                <option value="">Todos</option>
                                ${STATUS_TAREFA_OPTIONS_CAL.map(s => `<option value="${s}" ${currentCalendarFilters.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label for="filter-cal-prioridade" class="block text-xs font-medium text-gray-700 dark:text-gray-300">Prioridade:</label>
                            <select id="filter-cal-prioridade" class="form-input-text mt-1 block w-full text-sm">
                                <option value="">Todas</option>
                                ${PRIORIDADES_TAREFA_OPTIONS_CAL.map(p => `<option value="${p}" ${currentCalendarFilters.prioridade === p ? 'selected' : ''}>${p}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label for="filter-cal-responsavel" class="block text-xs font-medium text-gray-700 dark:text-gray-300">Responsável:</label>
                            <select id="filter-cal-responsavel" class="form-input-text mt-1 block w-full text-sm">
                                <option value="">Todos</option>
                                ${responsaveisUnicos.map(r => `<option value="${r.replace(/"/g, '"')}" ${currentCalendarFilters.responsavel === r ? 'selected' : ''}>${r}</option>`).join('')}
                            </select>
                        </div>
                        <div class="flex gap-2">
                            <button id="btn-aplicar-filtros-calendario" class="btn-primary btn-sm w-full">Aplicar Filtros</button>
                            <button id="btn-limpar-filtros-calendario" class="btn-secondary btn-sm w-full">Limpar</button>
                        </div>
                    </div>
                </div>

                <div id="calendario-container-wrapper" class="bg-white dark:bg-slate-800 p-2 sm:p-4 rounded-lg shadow-md" style="min-height: 650px;">
                    <div id="calendario-container-inner"> <p class="loading-text p-4">Carregando calendário...</p>
                    </div>
                </div>
            </div>
        `;
        
        calendarioEl = document.getElementById('calendario-container-inner'); 

        const btnVoltar = document.getElementById('btn-voltar-calendario-tarefas');
        if (btnVoltar && appModuleRef && appModuleRef.handleMenuAction) {
            btnVoltar.addEventListener('click', () => {
                if (calendarInstance) {
                    calendarInstance.destroy();
                    calendarInstance = null;
                }
                calendarioEl = null; 
                appModuleRef.handleMenuAction('gerir-tarefas');
            });
        }
        
        const btnAplicarFiltrosCal = document.getElementById('btn-aplicar-filtros-calendario');
        const btnLimparFiltrosCal = document.getElementById('btn-limpar-filtros-calendario');
        const statusSelectCal = document.getElementById('filter-cal-status');
        const prioridadeSelectCal = document.getElementById('filter-cal-prioridade');
        const responsavelSelectCal = document.getElementById('filter-cal-responsavel');

        if(btnAplicarFiltrosCal) {
            btnAplicarFiltrosCal.addEventListener('click', () => {
                currentCalendarFilters.status = statusSelectCal.value;
                currentCalendarFilters.prioridade = prioridadeSelectCal.value;
                currentCalendarFilters.responsavel = responsavelSelectCal.value;
                aplicarFiltrosECarregarCalendario();
            });
        }
        if(btnLimparFiltrosCal) {
            btnLimparFiltrosCal.addEventListener('click', () => {
                currentCalendarFilters.status = '';
                currentCalendarFilters.prioridade = '';
                currentCalendarFilters.responsavel = '';
                statusSelectCal.value = '';
                prioridadeSelectCal.value = '';
                responsavelSelectCal.value = '';
                aplicarFiltrosECarregarCalendario();
            });
        }

        try {
            todasTarefasCache = tarefasAtivas;
            
            if (!calendarioEl) {
                console.error("TarefasCalendario.JS: calendarioEl ainda é nulo antes de inicializar FullCalendar.");
                if(globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico: Contêiner do calendário não encontrado.", "error", document.getElementById(feedbackAreaId));
                return;
            }
            
            const eventosIniciais = (await filterAndSortTarefasCalendario(todasTarefasCache, currentCalendarFilters))
                                     .map(formatarTarefaParaEvento).filter(e => e !== null);

            if (calendarInstance) { 
                calendarInstance.destroy();
            }

            calendarInstance = new FullCalendar.Calendar(calendarioEl, {
                initialView: 'dayGridMonth',
                locale: 'pt-br',
                headerToolbar: {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
                },
                buttonText: { 
                    today: 'Hoje', month: 'Mês', week: 'Semana', day: 'Dia', list: 'Lista'
                },
                events: eventosIniciais, 
                editable: true, 
                selectable: false,
                eventDrop: async function(info) {
                    const tarefaId = info.event.id;
                    const novaDataVencimento = info.event.startStr; 

                    try {
                        const tarefa = await dbRef.getItemById(TAREFAS_STORE_NAME, tarefaId);
                        if (!tarefa) {
                            if (globalShowFeedbackRef) globalShowFeedbackRef("Tarefa não encontrada para atualização.", "error", document.getElementById(feedbackAreaId));
                            info.revert(); 
                            return;
                        }
                        
                        if (tarefa.status === 'Concluída' || tarefa.status === 'Cancelada') {
                            if (globalShowFeedbackRef) globalShowFeedbackRef(`Não é possível alterar o prazo de tarefas ${tarefa.status.toLowerCase()}s.`, "warning", document.getElementById(feedbackAreaId));
                            info.revert();
                            return;
                        }

                        tarefa.dataVencimento = novaDataVencimento;
                        tarefa.dataModificacao = new Date().toISOString();
                        await dbRef.updateItem(TAREFAS_STORE_NAME, tarefa);

                        const indexCache = todasTarefasCache.findIndex(t => t.id === tarefaId);
                        if (indexCache !== -1) {
                            todasTarefasCache[indexCache] = tarefa;
                        }
                        
                        const eventoAtualizado = formatarTarefaParaEvento(tarefa);
                        if (eventoAtualizado) {
                            info.event.setProp('title', eventoAtualizado.title);
                            info.event.setProp('backgroundColor', eventoAtualizado.backgroundColor);
                            info.event.setProp('borderColor', eventoAtualizado.borderColor);
                            info.event.setProp('textColor', eventoAtualizado.textColor);
                            info.event.setExtendedProp('status', eventoAtualizado.extendedProps.status);
                            info.event.setProp('classNames', eventoAtualizado.classNames || []);
                        }
                        
                        if (globalShowFeedbackRef) globalShowFeedbackRef(`Prazo da tarefa "${tarefa.titulo || 'ID ' + tarefaId}" atualizado para ${new Date(novaDataVencimento + 'T00:00:00').toLocaleDateString()}.`, "success", document.getElementById(feedbackAreaId));
                        if (refreshApplicationStateRef) await refreshApplicationStateRef(); 

                    } catch (error) {
                        console.error("Erro ao atualizar prazo da tarefa via drag and drop:", error);
                        if (globalShowFeedbackRef) globalShowFeedbackRef("Erro ao atualizar prazo da tarefa.", "error", document.getElementById(feedbackAreaId));
                        info.revert(); 
                    }
                },
                eventClick: function(info) {
                    if (appModuleRef && typeof appModuleRef.handleMenuAction === 'function') {
                        appModuleRef.handleMenuAction('visualizar-tarefa', { tarefaId: info.event.id, originatingView: 'calendario-tarefas' });
                    }
                },
                eventMouseEnter: function(info) {
                    const existingTooltips = document.querySelectorAll('.fc-tooltip');
                    existingTooltips.forEach(tt => tt.remove());

                    const props = info.event.extendedProps;
                    const tooltipContent = `
                        <div class="text-sm p-2">
                            <p><strong>ID:</strong> ${props.numeroIdentificacao || 'N/A'}</p>
                            <p><strong>Status:</strong> ${props.status || 'N/D'}</p>
                            <p><strong>Prioridade:</strong> ${props.prioridade || 'N/D'}</p>
                            ${props.responsavel ? `<p><strong>Responsável:</strong> ${props.responsavel}</p>` : ''}
                            ${props.tags && props.tags.length > 0 ? `<p><strong>Tags:</strong> ${props.tags.join(', ')}</p>` : ''}
                            <hr class="my-1 border-gray-500 dark:border-gray-600">
                            <p class="text-xs">${(props.descricao || 'Sem descrição detalhada.').substring(0, 100)}...</p>
                        </div>
                    `;
                    
                    const tooltip = document.createElement('div');
                    tooltip.id = `tooltip-${info.event.id}`;
                    tooltip.className = 'fc-tooltip absolute z-[10001] max-w-xs w-auto p-2 -mt-2 text-xs leading-tight text-white bg-gray-700 dark:bg-black rounded-lg shadow-xl opacity-0 transition-opacity duration-300';
                    tooltip.innerHTML = tooltipContent;
                    document.body.appendChild(tooltip);

                    const eventRect = info.el.getBoundingClientRect();
                    tooltip.style.left = `${eventRect.left + window.scrollX + eventRect.width / 2 - tooltip.offsetWidth / 2}px`;
                    tooltip.style.top = `${eventRect.top + window.scrollY - tooltip.offsetHeight - 6}px`; 
                    
                    if (tooltip.offsetLeft < 0) tooltip.style.left = '5px';
                    if (tooltip.offsetTop < 0) tooltip.style.top = `${eventRect.bottom + window.scrollY + 6}px`;

                    void tooltip.offsetWidth; 
                    tooltip.style.opacity = '1';
                },
                eventMouseLeave: function(info) {
                    const tooltipId = `tooltip-${info.event.id}`;
                    const tooltip = document.getElementById(tooltipId);
                    if (tooltip) {
                        tooltip.style.opacity = '0';
                        setTimeout(() => {
                            const currentTooltip = document.getElementById(tooltipId);
                            if (currentTooltip) {
                                currentTooltip.remove();
                            }
                        }, 300);
                    }
                },
                eventDidMount: function(info) {
                    if (document.body.classList.contains('theme-dark')) {
                        info.el.style.borderColor = 'rgba(255,255,255,0.3)';
                        if (info.event.textColor === '#333333' && SEFWorkStation.UI.isColorDark(info.event.backgroundColor)) {
                           info.el.style.color = '#ffffff';
                        }
                    }
                    if (info.event.extendedProps.status === 'Concluída' || info.event.extendedProps.status === 'Cancelada') {
                        info.el.classList.add('fc-event-completed-or-cancelled');
                    }
                },
                datesSet: function() { 
                    if (calendarInstance) {
                        setTimeout(() => calendarInstance.render(), 0);
                    }
                }
            });

            calendarInstance.render();
            const loadingTextEl = calendarioEl.querySelector('.loading-text');
            if (loadingTextEl) loadingTextEl.remove();

        } catch (error) {
            console.error("TarefasCalendario.JS: Erro ao carregar tarefas para o calendário:", error);
            if (calendarioEl) calendarioEl.innerHTML = '<p class="feedback-message error p-4">Falha ao carregar o calendário de tarefas.</p>';
            if(globalShowFeedbackRef) globalShowFeedbackRef("Erro ao carregar o calendário.", "error", document.getElementById(feedbackAreaId));
        }
    }
    
    async function filterAndSortTarefasCalendario(tarefas, filters) {
        let processadas = [...tarefas]; 

        if (filters.status) {
            processadas = processadas.filter(t => t.status === filters.status);
        }
        if (filters.prioridade) {
            processadas = processadas.filter(t => t.prioridade === filters.prioridade);
        }
        if (filters.responsavel) {
            const respTerm = filters.responsavel.toLowerCase().trim();
            processadas = processadas.filter(t => t.responsavel && t.responsavel.toLowerCase().includes(respTerm));
        }
        return processadas;
    }

    return {
        init,
        renderCalendarioTarefasPage
    };
})();