// js/servidoresCalendario.js - Lógica para Visualização de Ausências de Servidores em Calendário
// v1.2.1 - CORREÇÃO: Adiciona o nome do servidor ao tooltip do evento para maior clareza.
// v1.2.0 - CORREÇÃO: Utiliza EntityConfig.filterActiveItems para filtrar servidores arquivados da visualização e filtros.
// (Histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.ServidoresCalendario = (function() {
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let dbRef;
    let appModuleRef;
    let calendarInstance = null;
    let calendarioEl = null; 

    let currentCalendarFilters = { 
        servidorId: '',
        tipoAusencia: ''
    };
    let todosServidoresCache = []; 

    const SERVIDORES_STORE_NAME = 'servidoresStore';
    const AUSENCIA_TIPOS_OPTIONS_CALENDARIO = ["Férias Regulamentares", "Férias Prêmio", "Licença", "Afastado", "Outro"];

    function init(mainWrapper, showFeedbackFunc, dbModuleRef, applicationModuleRef) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedbackFunc;
        dbRef = dbModuleRef;
        appModuleRef = applicationModuleRef;
        console.log("ServidoresCalendario.JS: Módulo inicializado (v1.2.1).");
    }

    function formatarAusenciaParaEvento(servidor, periodo) {
        if (!periodo.dataInicio) return null;

        const dataInicioObj = new Date(periodo.dataInicio + 'T00:00:00');
        const dataFimEvento = periodo.dataFim ? new Date(periodo.dataFim + 'T00:00:00') : new Date(dataInicioObj);
        if (periodo.dataFim) {
            dataFimEvento.setDate(dataFimEvento.getDate() + 1);
        } else { 
             dataFimEvento.setDate(dataInicioObj.getDate() + 1);
        }


        let corEvento = '#718096';
        switch (periodo.tipo) {
            case 'Férias Regulamentares': corEvento = '#4299e1'; break;
            case 'Férias Prêmio': corEvento = '#38b2ac'; break;
            case 'Licença': corEvento = '#f56565'; break;
            case 'Afastado': corEvento = '#ed8936'; break;
        }

        return {
            id: `${servidor.id}_${periodo.id || periodo.dataInicio}`,
            title: servidor.nome,
            start: periodo.dataInicio,
            end: dataFimEvento.toISOString().split('T')[0],
            allDay: true,
            backgroundColor: corEvento,
            borderColor: corEvento,
            extendedProps: {
                servidorId: servidor.id,
                tipoAusencia: periodo.tipo,
                observacao: periodo.observacao,
                matricula: servidor.matricula
            }
        };
    }

    async function aplicarFiltrosECarregarCalendario() {
        const feedbackAreaEl = document.getElementById("feedback-calendario-servidores");
        if (!calendarInstance || !calendarioEl) { 
             if(globalShowFeedbackRef && feedbackAreaEl) globalShowFeedbackRef("Instância do calendário ou elemento não encontrado. Não é possível aplicar filtros.", "warning", feedbackAreaEl);
            console.warn("ServidoresCalendario.JS: aplicarFiltrosECarregarCalendario - Instância do calendário ou elemento não encontrado.");
            return;
        }

        try {
            if (todosServidoresCache.length === 0) {
                 todosServidoresCache = window.SEFWorkStation.EntityConfig.filterActiveItems(await dbRef.getAllItems(SERVIDORES_STORE_NAME), SERVIDORES_STORE_NAME);
            }
            
            let servidoresFiltrados = todosServidoresCache;

            if (currentCalendarFilters.servidorId) {
                servidoresFiltrados = servidoresFiltrados.filter(s => s.id === currentCalendarFilters.servidorId);
            }

            let eventos = [];
            servidoresFiltrados.forEach(servidor => {
                if (servidor.periodosAusencia && Array.isArray(servidor.periodosAusencia)) {
                    servidor.periodosAusencia.forEach(periodo => {
                        if (!currentCalendarFilters.tipoAusencia || periodo.tipo === currentCalendarFilters.tipoAusencia) {
                            const evento = formatarAusenciaParaEvento(servidor, periodo);
                            if (evento) eventos.push(evento);
                        }
                    });
                }
            });

            calendarInstance.removeAllEvents();
            calendarInstance.addEventSource(eventos);

        } catch (error) {
            console.error("ServidoresCalendario.JS: Erro ao aplicar filtros:", error);
            if(globalShowFeedbackRef && feedbackAreaEl) globalShowFeedbackRef("Erro ao aplicar filtros no calendário.", "error", feedbackAreaEl);
        }
    }

    async function renderCalendarioServidoresPage() {
        if (!mainContentWrapperRef) {
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico ao renderizar página.", "error");
            return;
        }

        if (appModuleRef && typeof appModuleRef.setCurrentViewTarget === 'function') {
            appModuleRef.setCurrentViewTarget('calendario-servidores');
        }
        
        const feedbackAreaId = "feedback-calendario-servidores";
        todosServidoresCache = []; 

        const todosServidoresDB = await dbRef.getAllItems(SERVIDORES_STORE_NAME);
        const todosServidoresParaFiltro = window.SEFWorkStation.EntityConfig.filterActiveItems(todosServidoresDB, SERVIDORES_STORE_NAME);

        mainContentWrapperRef.innerHTML = `
            <div id="calendario-servidores-container"> 
                <div id="${feedbackAreaId}" class="mb-4"></div>
                <div class="flex justify-between items-center mb-4 flex-wrap gap-2">
                    <h2 class="text-xl font-semibold">Calendário de Ausências de Servidores</h2>
                    <button id="btn-voltar-calendario-servidores" class="btn-secondary btn-sm">Voltar para Lista</button>
                </div>

                <div class="filtros-calendario p-3 mb-4 border dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
                        <div>
                            <label for="filter-cal-servidor" class="block text-xs font-medium text-gray-700 dark:text-gray-300">Servidor:</label>
                            <select id="filter-cal-servidor" class="form-input-text mt-1 block w-full text-sm">
                                <option value="">Todos</option>
                                ${todosServidoresParaFiltro.sort((a,b) => a.nome.localeCompare(b.nome)).map(s => `<option value="${s.id}" ${currentCalendarFilters.servidorId === s.id ? 'selected' : ''}>${s.nome}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label for="filter-cal-tipo-ausencia" class="block text-xs font-medium text-gray-700 dark:text-gray-300">Tipo de Ausência:</label>
                            <select id="filter-cal-tipo-ausencia" class="form-input-text mt-1 block w-full text-sm">
                                <option value="">Todos</option>
                                ${AUSENCIA_TIPOS_OPTIONS_CALENDARIO.map(t => `<option value="${t}" ${currentCalendarFilters.tipoAusencia === t ? 'selected' : ''}>${t}</option>`).join('')}
                            </select>
                        </div>
                        <div class="md:col-span-2 flex gap-2">
                            <button id="btn-aplicar-filtros-calendario-serv" class="btn-primary btn-sm w-full">Aplicar Filtros</button>
                            <button id="btn-limpar-filtros-calendario-serv" class="btn-secondary btn-sm w-full">Limpar</button>
                        </div>
                    </div>
                </div>

                <div id="calendario-servidores-wrapper" class="bg-white dark:bg-slate-800 p-2 sm:p-4 rounded-lg shadow-md" style="min-height: 650px;">
                    <div id="calendario-servidores-inner"> <p class="loading-text p-4">Carregando calendário...</p></div>
                </div>
            </div>
        `;
        
        calendarioEl = document.getElementById('calendario-servidores-inner'); 

        const btnVoltar = document.getElementById('btn-voltar-calendario-servidores');
        if (btnVoltar && appModuleRef && appModuleRef.handleMenuAction) {
            btnVoltar.addEventListener('click', () => {
                if (calendarInstance) { calendarInstance.destroy(); calendarInstance = null; }
                calendarioEl = null; 
                appModuleRef.handleMenuAction('gerir-servidores');
            });
        }
        
        const btnAplicarFiltrosCal = document.getElementById('btn-aplicar-filtros-calendario-serv');
        const btnLimparFiltrosCal = document.getElementById('btn-limpar-filtros-calendario-serv');
        const servidorSelectCal = document.getElementById('filter-cal-servidor');
        const tipoAusenciaSelectCal = document.getElementById('filter-cal-tipo-ausencia');

        if(btnAplicarFiltrosCal) {
            btnAplicarFiltrosCal.addEventListener('click', () => {
                currentCalendarFilters.servidorId = servidorSelectCal.value;
                currentCalendarFilters.tipoAusencia = tipoAusenciaSelectCal.value;
                aplicarFiltrosECarregarCalendario();
            });
        }
        if(btnLimparFiltrosCal) {
            btnLimparFiltrosCal.addEventListener('click', () => {
                currentCalendarFilters.servidorId = '';
                currentCalendarFilters.tipoAusencia = '';
                servidorSelectCal.value = '';
                tipoAusenciaSelectCal.value = '';
                aplicarFiltrosECarregarCalendario();
            });
        }

        try {
            todosServidoresCache = todosServidoresParaFiltro; 
            
            if (!calendarioEl) {
                console.error("ServidoresCalendario.JS: calendarioEl ainda é nulo antes de inicializar FullCalendar.");
                if(globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico: Contêiner do calendário não encontrado.", "error", document.getElementById(feedbackAreaId));
                return;
            }
            
            const eventosIniciais = [];
            todosServidoresCache.forEach(servidor => {
                 if (servidor.periodosAusencia && Array.isArray(servidor.periodosAusencia)) {
                    servidor.periodosAusencia.forEach(periodo => {
                        const evento = formatarAusenciaParaEvento(servidor, periodo);
                        if(evento) eventosIniciais.push(evento);
                    });
                 }
            });

            if (calendarInstance) { calendarInstance.destroy(); }
            calendarInstance = new FullCalendar.Calendar(calendarioEl, {
                initialView: 'dayGridMonth',
                locale: 'pt-br',
                headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,listWeek' },
                buttonText: { today: 'Hoje', month: 'Mês', week: 'Semana', day: 'Dia', list: 'Lista' },
                events: eventosIniciais, 
                editable: false, 
                selectable: false,
                eventClick: function(info) {
                    const servidorId = info.event.extendedProps.servidorId;
                    if (servidorId && appModuleRef && typeof appModuleRef.handleMenuAction === 'function') {
                        appModuleRef.handleMenuAction('visualizar-servidor', { servidorId: servidorId, originatingView: 'calendario-servidores' });
                    }
                },
                eventMouseEnter: function(info) {
                    const existingTooltips = document.querySelectorAll('.fc-tooltip');
                    existingTooltips.forEach(tt => tt.remove());

                    const props = info.event.extendedProps;
                    
                    // CORREÇÃO: Adicionado o nome do servidor (info.event.title) ao tooltip.
                    const tooltipContent = `
                        <div class="text-sm p-2">
                            <p><strong>Servidor:</strong> ${info.event.title}</p>
                            <p><strong>Tipo:</strong> ${props.tipoAusencia || 'N/D'}</p>
                            <p><strong>Matrícula:</strong> ${props.matricula || 'N/A'}</p>
                            ${props.observacao ? `<hr class="my-1 border-gray-500 dark:border-gray-600"><p class="text-xs"><strong>Obs:</strong> ${props.observacao}</p>` : ''}
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
            console.error("ServidoresCalendario.JS: Erro ao carregar calendário:", error);
            if (calendarioEl) calendarioEl.innerHTML = '<p class="feedback-message error p-4">Falha ao carregar o calendário de ausências.</p>';
        }
    }
    
    return {
        init,
        renderCalendarioServidoresPage
    };
})();