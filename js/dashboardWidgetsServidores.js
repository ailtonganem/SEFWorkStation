// js/dashboardWidgetsServidores.js - Lógica para Widgets de Servidores no Dashboard
// v1.6 - ETAPA 3.6 (Correção): Corrige interpolação de datas no widget de ausências.
// v1.5 - ETAPA 3.5 (Diagnóstico): Restaura conteúdo original dos widgets.
// v1.4 - ETAPA 3.3 (Diagnóstico): Funções de renderização retornam o elemento do widget.
// v1.3 - ETAPA 3.2 (Diagnóstico): Simplifica renderização para teste.
// v1.2 - ETAPA 3.2 (Melhorias Dashboard): Adiciona logs de diagnóstico.
// v1.1 - ETAPA 3 (Melhorias Dashboard): Implementa widget "Servidores em Trabalho Remoto Hoje".
// v1.0 - Implementa widget "Servidores Ausentes Hoje/Esta Semana"

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.DashboardWidgetsServidores = (function() {
    let dbRef;
    let appModuleRef;

    const SERVIDORES_STORE_NAME = 'servidoresStore';

    function init(dbModuleRef, applicationModuleRef) {
        dbRef = dbModuleRef;
        appModuleRef = applicationModuleRef;
        console.log("DashboardWidgetsServidores.JS: Módulo inicializado (v1.6).");
    }

    function getWeekRange(date) {
        const d = new Date(date);
        const day = d.getDay(); 
        const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1); 
        const startOfWeek = new Date(d.setDate(diffToMonday));
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        return { startOfWeek, endOfWeek };
    }

    async function renderWidgetServidoresAusentes() { 
        // console.log("DashboardWidgetsServidores.JS: renderWidgetServidoresAusentes INICIADO (Conteúdo Original)."); // Log de diagnóstico pode ser removido
        const widgetWrapper = document.createElement('div'); 
        widgetWrapper.className = "dashboard-widget bg-white dark:bg-slate-800 p-4 rounded-lg shadow h-full flex flex-col md:col-span-1";

        const header = document.createElement('h3');
        header.className = "text-md font-semibold text-gray-700 dark:text-slate-200 mb-3 border-b pb-2 dark:border-slate-700";
        header.textContent = "Servidores Ausentes";
        widgetWrapper.appendChild(header);

        const contentDiv = document.createElement('div');
        contentDiv.className = 'widget-content text-sm flex-grow overflow-y-auto pr-1';
        widgetWrapper.appendChild(contentDiv);

        if (!dbRef) {
            // console.error("DashboardWidgetsServidores: dbRef não inicializado em renderWidgetServidoresAusentes."); // Log de diagnóstico pode ser removido
            contentDiv.innerHTML = '<p class="text-red-500 text-xs">Erro: DB não pronto (Ausentes).</p>';
            return widgetWrapper;
        }

        try {
            const todosServidores = await dbRef.getAllItems(SERVIDORES_STORE_NAME);
            const servidoresAtivos = todosServidores.filter(s => !s.isDeleted);

            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0); 
            const { startOfWeek, endOfWeek } = getWeekRange(new Date());
            let ausentesHoje = [];
            let ausentesEstaSemana = [];

            for (const servidor of servidoresAtivos) {
                if (servidor.periodosAusencia && Array.isArray(servidor.periodosAusencia)) {
                    for (const periodo of servidor.periodosAusencia) {
                        if (!periodo.dataInicio) continue;
                        const inicioPeriodo = new Date(periodo.dataInicio + 'T00:00:00');
                        const fimPeriodo = periodo.dataFim ? new Date(periodo.dataFim + 'T23:59:59') : new Date(periodo.dataInicio + 'T23:59:59');
                        if (hoje >= inicioPeriodo && hoje <= fimPeriodo) {
                            if (!ausentesHoje.find(s => s.id === servidor.id)) { 
                                ausentesHoje.push({ nome: servidor.nome, matricula: servidor.matricula, tipoAusencia: periodo.tipo, id: servidor.id });
                            }
                        }
                        if (inicioPeriodo <= endOfWeek && fimPeriodo >= startOfWeek) {
                             if (!ausentesEstaSemana.find(s => s.id === servidor.id)) { 
                                ausentesEstaSemana.push({ nome: servidor.nome, matricula: servidor.matricula, tipoAusencia: periodo.tipo, id: servidor.id, dataInicioPeriodo: inicioPeriodo, dataFimPeriodo: fimPeriodo });
                            }
                        }
                    }
                }
            }
            ausentesEstaSemana.sort((a,b) => a.dataInicioPeriodo - b.dataInicioPeriodo);

            let htmlInterno = '<h4 class="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 mt-2 uppercase">Hoje:</h4>';
            if (ausentesHoje.length > 0) {
                htmlInterno += '<ul class="list-none space-y-1">';
                ausentesHoje.forEach(s => {
                    htmlInterno += `<li class="text-xs text-gray-600 dark:text-slate-300"><a href="#" class="link-view-servidor-dashboard" data-servidor-id="${s.id}">${s.nome || 'Servidor sem nome'}</a> (${s.tipoAusencia || 'Ausente'})</li>`;
                });
                htmlInterno += '</ul>';
            } else {
                htmlInterno += '<p class="text-xs text-gray-500 dark:text-slate-400 italic">Nenhum servidor ausente hoje.</p>';
            }
            // CORREÇÃO DA INTERPOLAÇÃO AQUI:
            htmlInterno += `<h4 class="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 mt-3 uppercase">Esta Semana (${startOfWeek.toLocaleDateString()} - ${endOfWeek.toLocaleDateString()}):</h4>`;
            if (ausentesEstaSemana.length > 0) {
                htmlInterno += '<ul class="list-none space-y-1">';
                ausentesEstaSemana.forEach(s => {
                     const inicioFmt = s.dataInicioPeriodo.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit'});
                     const fimFmt = (s.dataFimPeriodo.getFullYear() === 9999) ? 'Indef.' : s.dataFimPeriodo.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit'});
                    htmlInterno += `<li class="text-xs text-gray-600 dark:text-slate-300"><a href="#" class="link-view-servidor-dashboard" data-servidor-id="${s.id}">${s.nome || 'Servidor sem nome'}</a> (${s.tipoAusencia || 'Ausente'}) - ${inicioFmt} a ${fimFmt}</li>`;
                });
                htmlInterno += '</ul>';
            } else {
                htmlInterno += '<p class="text-xs text-gray-500 dark:text-slate-400 italic">Nenhum servidor ausente esta semana.</p>';
            }
            contentDiv.innerHTML = htmlInterno;
            
            widgetWrapper.querySelectorAll('.link-view-servidor-dashboard').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const servidorId = e.currentTarget.dataset.servidorId;
                    if (appModuleRef && appModuleRef.handleMenuAction) {
                         appModuleRef.handleMenuAction('visualizar-servidor', { servidorId: servidorId, originatingView: 'dashboard' });
                    }
                });
            });
        } catch (error) {
            console.error("DashboardWidgetsServidores: Erro ao renderizar widget de servidores ausentes (original):", error);
            contentDiv.innerHTML = '<p class="text-red-500 text-xs">Erro ao carregar widget (Ausentes).</p>';
        }
        // console.log("DashboardWidgetsServidores.JS: renderWidgetServidoresAusentes (Conteúdo Original) CONCLUÍDO."); // Log pode ser removido
        return widgetWrapper;
    }

    async function renderWidgetServidoresTrabalhoRemotoHoje() {
        // console.log("DashboardWidgetsServidores.JS: renderWidgetServidoresTrabalhoRemotoHoje INICIADO (Conteúdo Original)."); // Log pode ser removido
        const widgetWrapper = document.createElement('div');
        widgetWrapper.className = "dashboard-widget bg-white dark:bg-slate-800 p-4 rounded-lg shadow h-full flex flex-col md:col-span-1";
        
        const header = document.createElement('h3');
        header.className = "text-md font-semibold text-gray-700 dark:text-slate-200 mb-3 border-b pb-2 dark:border-slate-700";
        header.textContent = "Servidores em Trabalho Remoto Hoje";
        widgetWrapper.appendChild(header);

        const contentDiv = document.createElement('div');
        contentDiv.className = 'widget-content text-sm flex-grow overflow-y-auto pr-1';
        widgetWrapper.appendChild(contentDiv);

        if (!dbRef) {
            // console.error("DashboardWidgetsServidores: dbRef não inicializado em renderWidgetServidoresTrabalhoRemotoHoje."); // Log pode ser removido
            contentDiv.innerHTML = '<p class="text-red-500 text-xs">Erro: DB não pronto (Remoto).</p>';
            return widgetWrapper;
        }

        try {
            const todosServidores = await dbRef.getAllItems(SERVIDORES_STORE_NAME);
            const servidoresAtivos = todosServidores.filter(s => !s.isDeleted && s.status === 'Ativo');

            const hoje = new Date();
            const diasDaSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
            const nomeDiaHoje = diasDaSemana[hoje.getDay()];
            let servidoresEmRemotoHoje = [];

            for (const servidor of servidoresAtivos) {
                if (servidor.diasTrabalhoRemoto && Array.isArray(servidor.diasTrabalhoRemoto) && servidor.diasTrabalhoRemoto.includes(nomeDiaHoje)) {
                    let estaAusente = false;
                    if (servidor.periodosAusencia && Array.isArray(servidor.periodosAusencia)) {
                        const ausenciaNoDia = servidor.periodosAusencia.find(p => {
                            if (!p.dataInicio) return false;
                            const inicioP = new Date(p.dataInicio + 'T00:00:00');
                            const fimP = p.dataFim ? new Date(p.dataFim + 'T23:59:59') : new Date(p.dataInicio + 'T23:59:59');
                            return hoje >= inicioP && hoje <= fimP;
                        });
                        if (ausenciaNoDia) estaAusente = true;
                    }
                    if (!estaAusente) {
                        servidoresEmRemotoHoje.push({ id: servidor.id, nome: servidor.nome, matricula: servidor.matricula, setor: servidor.setorLotacao });
                    }
                }
            }
            servidoresEmRemotoHoje.sort((a,b) => (a.nome || "").localeCompare(b.nome || ""));
            
            let htmlInterno = '';
            if (servidoresEmRemotoHoje.length > 0) {
                htmlInterno += '<ul class="list-none space-y-1">';
                servidoresEmRemotoHoje.forEach(s => {
                    htmlInterno += `<li class="text-xs text-gray-600 dark:text-slate-300"><a href="#" class="link-view-servidor-dashboard" data-servidor-id="${s.id}">${s.nome || 'Servidor sem nome'}</a> ${s.setor ? `(${s.setor})` : ''}</li>`;
                });
                htmlInterno += '</ul>';
            } else {
                htmlInterno += '<p class="text-xs text-gray-500 dark:text-slate-400 italic">Nenhum servidor em trabalho remoto configurado para hoje (que não esteja ausente por outro motivo).</p>';
            }
            contentDiv.innerHTML = htmlInterno;
            
             widgetWrapper.querySelectorAll('.link-view-servidor-dashboard').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const servidorId = e.currentTarget.dataset.servidorId;
                    if (appModuleRef && appModuleRef.handleMenuAction) {
                         appModuleRef.handleMenuAction('visualizar-servidor', { servidorId: servidorId, originatingView: 'dashboard' });
                    }
                });
            });
        } catch (error) {
            console.error("DashboardWidgetsServidores: Erro ao renderizar widget de servidores em trabalho remoto (original):", error);
            contentDiv.innerHTML = '<p class="text-red-500 text-xs">Erro ao carregar widget (Remoto).</p>';
        }
        // console.log("DashboardWidgetsServidores.JS: renderWidgetServidoresTrabalhoRemotoHoje (Conteúdo Original) CONCLUÍDO."); // Log pode ser removido
        return widgetWrapper;
    }

    return {
        init,
        renderWidgetServidoresAusentes,
        renderWidgetServidoresTrabalhoRemotoHoje 
    };
})();