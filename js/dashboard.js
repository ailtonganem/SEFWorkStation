// js/dashboard.js - Lógica para o Dashboard Informativo da Página Principal
// v2.6.0 - REMOVIDO: Lógica de verificação de pasta (directoryHandle) para alinhar com a migração web. A aplicação agora sempre renderiza o dashboard.
// v2.5.8 - CORREÇÃO: Utiliza o State Manager (SEFWorkStation.State.getDirectoryHandle) para verificar se a pasta foi definida, corrigindo o loop da tela de boas-vindas.
// ... (histórico anterior)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.Dashboard = (function() {
    let mainContentWrapperRef;
    let dbRef;
    let appModuleRef;
    let servidoresWidgetsModuleRef;

    const MAX_ITEMS_WIDGET = 5;
    const DIAS_ANTECEDENCIA_PRAZOS = 7; 

    function init(dbModule, applicationModule, servidoresWidgetsMod) {
        dbRef = dbModule;
        appModuleRef = applicationModule;
        servidoresWidgetsModuleRef = servidoresWidgetsMod;
        mainContentWrapperRef = document.querySelector('.main-content-wrapper');
        console.log("Dashboard.JS: Módulo reativado (v2.6.0).");
    }

    function criarWidgetCard(titulo, colSpanClass = 'md:col-span-1', id = '') {
        const widget = document.createElement('div');
        widget.className = `dashboard-widget bg-white dark:bg-slate-800 p-4 rounded-lg shadow h-full flex flex-col ${colSpanClass}`;
        if(id) widget.id = id;

        const header = document.createElement('h3');
        // REMOVIDAS classes de cor de texto hardcoded. Agora a cor será herdada ou definida pela regra CSS.
        header.className = "";
        header.textContent = titulo;
        widget.appendChild(header);

        const contentDiv = document.createElement('div');
        contentDiv.className = 'widget-content text-sm flex-grow overflow-y-auto pr-1';
        widget.appendChild(contentDiv);
        return { widget, contentDiv };
    }

    function criarWidgetLinksRapidos() {
        const { widget, contentDiv } = criarWidgetCard('Ações Rápidas', 'md:col-span-1');
        contentDiv.className = 'grid grid-cols-2 gap-2'; 

        const links = [
            { label: 'Novo Documento', action: 'novo-documento', icon: '📄', colorClass: 'btn-documentos' },
            { label: 'Novo Contribuinte', action: 'novo-contribuinte', icon: '👥', colorClass: 'btn-contribuintes' },
            { label: 'Nova Tarefa', action: 'nova-tarefa', icon: '📝', colorClass: 'btn-tarefas' },
            { label: 'Nova Nota Rápida', action: 'nova-nota-rapida', icon: '🗒️', colorClass: 'btn-notas' },
            { label: 'Cadastrar Protocolo', action: 'cadastrar-protocolo', icon: '📂', colorClass: 'btn-processos' },
            { label: 'Escrever E-mail', action: 'escrever-email', icon: '✉️', colorClass: 'btn-comunicacoes' }
        ];

        links.forEach(link => {
            const button = document.createElement('button');
            button.className = `header-button ${link.colorClass} w-full text-xs py-2 px-2.5 flex-col h-auto`; 
            button.dataset.action = link.action;
            button.innerHTML = `
                <span class="text-xl">${link.icon}</span>
                <span class="mt-1">${link.label}</span>
            `;
            button.title = link.label;
            contentDiv.appendChild(button);
        });
        
        return widget;
    }


    async function criarWidgetPrazosProximos() {
        const { widget, contentDiv } = criarWidgetCard('Prazos Importantes Próximos/Vencidos', 'md:col-span-1');
        if (!dbRef || !dbRef.STORES) {
            contentDiv.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-xs">Banco de dados não disponível.</p>';
            return widget;
        }

        try {
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            const dataLimiteAntecedencia = new Date();
            dataLimiteAntecedencia.setDate(hoje.getDate() + DIAS_ANTECEDENCIA_PRAZOS);
            dataLimiteAntecedencia.setHours(23, 59, 59, 999);

            let itensComPrazo = [];

            const tarefas = await dbRef.getAllItems(dbRef.STORES.TAREFAS);
            tarefas.filter(t => !t.isExcluida && t.status !== 'Concluída' && t.status !== 'Cancelada' && t.dataVencimento)
                .forEach(t => {
                    const dataVenc = new Date(t.dataVencimento + 'T00:00:00');
                    if (dataVenc <= dataLimiteAntecedencia) {
                        itensComPrazo.push({
                            id: t.id,
                            titulo: t.titulo || 'Tarefa sem título',
                            prazo: dataVenc,
                            tipo: 'Tarefa',
                            action: 'visualizar-tarefa',
                            dataKey: 'tarefaId',
                            isVencido: dataVenc < hoje
                        });
                    }
                });

            const recursos = await dbRef.getAllItems(dbRef.STORES.RECURSOS);
            recursos.filter(r => !r.isDeleted && !['Deferido', 'Indeferido', 'Arquivado'].includes(r.status) && r.dataLimiteResposta)
                .forEach(r => {
                    const dataLimite = new Date(r.dataLimiteResposta + 'T00:00:00');
                    if (dataLimite <= dataLimiteAntecedencia) {
                        itensComPrazo.push({
                            id: r.id,
                            titulo: r.titulo || 'Recurso sem título',
                            prazo: dataLimite,
                            tipo: 'Recurso',
                            action: 'visualizar-recurso',
                            dataKey: 'recursoId',
                            isVencido: dataLimite < hoje
                        });
                    }
                });

            itensComPrazo.sort((a, b) => a.prazo - b.prazo); 

            if (itensComPrazo.length > 0) {
                let ul = '<ul class="space-y-1.5">';
                itensComPrazo.slice(0, MAX_ITEMS_WIDGET * 2).forEach(item => {
                    const prazoFormatado = item.prazo.toLocaleDateString();
                    const classePrazo = item.isVencido ? 'prazo-vencido' : (item.prazo <= new Date(hoje.getTime() + 3 * 24 * 60 * 60 * 1000) ? 'prazo-proximo' : '');
                    const sufixoPrazo = item.isVencido ? '(Vencido!)' : (item.prazo.getTime() === hoje.getTime() ? '(Hoje!)' : '');

                    ul += `<li class="flex justify-between items-center py-0.5">
                             <span class="truncate mr-2">
                               <span class="text-xs text-gray-500 dark:text-gray-400">[${item.tipo}]</span>
                               <a href="#" class="link-dashboard hover:underline ${classePrazo}" data-action="${item.action}" data-id="${item.id}" title="${item.titulo}">${item.titulo}</a>
                             </span>
                             <span class="text-xs whitespace-nowrap ${classePrazo}">${prazoFormatado} ${sufixoPrazo}</span>
                           </li>`;
                });
                ul += '</ul>';
                contentDiv.innerHTML = ul;
            } else {
                contentDiv.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-xs italic">Nenhum prazo importante próximo ou vencido.</p>';
            }

        } catch (e) {
            console.error("Dashboard.JS: Erro ao criar widget de prazos próximos:", e);
            contentDiv.innerHTML = '<p class="text-red-500 dark:text-red-400 text-xs">Erro ao carregar prazos.</p>';
        }
        return widget;
    }


    async function criarWidgetTarefasPendentes() {
        const { widget, contentDiv } = criarWidgetCard('Tarefas Pendentes/Em Andamento');
        if (!dbRef) { contentDiv.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-xs">Banco de dados não disponível.</p>'; return widget;}
        try {
            const tarefas = await dbRef.getAllItems(dbRef.STORES.TAREFAS);
            const pendentes = tarefas.filter(t => !t.isExcluida && (t.status === 'Pendente' || t.status === 'Em Andamento')).sort((a, b) => (a.dataVencimento ? new Date(a.dataVencimento) : Infinity) - (b.dataVencimento ? new Date(b.dataVencimento) : Infinity)).slice(0, MAX_ITEMS_WIDGET);
            if (pendentes.length > 0) {
                let ul = '<ul class="space-y-1">';
                pendentes.forEach(t => {
                    const prazo = t.dataVencimento ? new Date(t.dataVencimento + 'T00:00:00').toLocaleDateString() : 'Sem prazo';
                    const hoje = new Date(); hoje.setHours(0,0,0,0);
                    const dataVencObj = t.dataVencimento ? new Date(t.dataVencimento + 'T00:00:00') : null;
                    const isVencida = dataVencObj && dataVencObj < hoje;
                    ul += `<li class="flex justify-between items-center py-1"><a href="#" class="link-dashboard hover:underline truncate ${isVencida ? 'prazo-vencido' : ''}" data-action="visualizar-tarefa" data-id="${t.id}" title="${t.titulo}">${t.titulo}</a><span class="text-xs whitespace-nowrap ml-2 ${isVencida ? 'prazo-vencido' : 'text-gray-400 dark:text-gray-500'}">${prazo} ${isVencida ? '(Vencida!)':''}</span></li>`;
                });
                ul += '</ul>'; contentDiv.innerHTML = ul;
            } else { contentDiv.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-xs italic">Nenhuma tarefa pendente ou em andamento.</p>'; }
        } catch (e) { contentDiv.innerHTML = '<p class="text-red-500 dark:text-red-400 text-xs">Erro ao carregar tarefas.</p>'; }
        return widget;
    }

    async function criarWidgetDocumentosRecentes() {
        const { widget, contentDiv } = criarWidgetCard('Documentos Modificados Recentemente');
        if (!dbRef) { contentDiv.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-xs">Banco de dados não disponível.</p>'; return widget;}
        try {
            const documentos = await dbRef.getAllItems(dbRef.STORES.DOCUMENTS);
            const recentes = documentos.filter(d => !d.isTemplate && !d.isDeleted).sort((a, b) => new Date(b.modificationDate) - new Date(a.modificationDate)).slice(0, MAX_ITEMS_WIDGET);
            if (recentes.length > 0) {
                let ul = '<ul class="space-y-1">';
                recentes.forEach(d => { ul += `<li class="py-1"><a href="#" class="link-dashboard hover:underline truncate" data-action="visualizar-documento" data-id="${d.id}" title="${d.title}">${d.title}</a><span class="text-xs text-gray-400 dark:text-gray-500"> (${new Date(d.modificationDate).toLocaleDateString()})</span></li>`; });
                ul += '</ul>'; contentDiv.innerHTML = ul;
            } else { contentDiv.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-xs italic">Nenhum documento modificado recentemente.</p>'; }
        } catch (e) { contentDiv.innerHTML = '<p class="text-red-500 dark:text-red-400 text-xs">Erro ao carregar documentos.</p>'; }
        return widget;
    }

    async function criarWidgetEstatisticasBasicas() {
        const { widget, contentDiv } = criarWidgetCard('Estatísticas Gerais', 'md:col-span-2 lg:col-span-3');
        contentDiv.className = 'grid grid-cols-2 sm:grid-cols-3 gap-4 text-center';
        if (!dbRef) { contentDiv.innerHTML = '<p class="text-gray-500 dark:text-gray-400 col-span-full text-xs">Banco de dados não disponível.</p>'; return widget;}
        try {
            const totalDocs = (await dbRef.getAllItems(dbRef.STORES.DOCUMENTS)).filter(d => !d.isDeleted && !d.isTemplate).length;
            const totalContribs = (await dbRef.getAllItems(dbRef.STORES.CONTRIBUINTES)).filter(c => !c.isDeleted).length;
            const todasTarefas = (await dbRef.getAllItems(dbRef.STORES.TAREFAS)).filter(t => !t.isExcluida);
            const tarefasPendentes = todasTarefas.filter(t => t.status === 'Pendente' || t.status === 'Em Andamento').length;
            const totalServidores = (await dbRef.getAllItems(dbRef.STORES.SERVIDORES)).filter(s => !s.isDeleted).length;
            const totalProcessos = (await dbRef.getAllItems(dbRef.STORES.PROTOCOLOS)).filter(p => !p.isDeleted && !['Arquivado', 'Cancelado', 'Respondido'].includes(p.statusProtocolo)).length + (await dbRef.getAllItems(dbRef.STORES.PTAS)).filter(p => !p.isDeleted && !['Deferido', 'Indeferido', 'Arquivado', 'Cancelado', 'Convertido em Autuação'].includes(p.statusPTA)).length + (await dbRef.getAllItems(dbRef.STORES.AUTUACOES)).filter(a => !a.isDeleted && !['Extinta', 'Anulada', 'Encerrada', 'Arquivada', 'Cancelada'].includes(a.statusAutuacao)).length;
            
            const stats = [
                { label: 'Documentos Ativos', value: totalDocs, icon: '📄' }, 
                { label: 'Contribuintes', value: totalContribs, icon: '👥' }, 
                { label: 'Servidores Ativos', value: totalServidores, icon: '🧑‍💼' },
                { label: 'Tarefas Ativas', value: todasTarefas.length, icon: '📝' },
                { label: 'Tarefas Pendentes', value: tarefasPendentes, icon: '⏳' },
                { label: 'Processos em Aberto', value: totalProcessos, icon: '📂' }
            ];
            stats.forEach(stat => { const statDiv = document.createElement('div'); statDiv.className = 'p-3 bg-gray-100 dark:bg-slate-700/50 rounded dashboard-stat-item'; statDiv.innerHTML = `<div class="text-3xl font-bold text-blue-600 dark:text-blue-400 stat-value">${stat.icon} ${stat.value}</div><div class="text-xs text-gray-500 dark:text-gray-400 mt-1 stat-label">${stat.label}</div>`; contentDiv.appendChild(statDiv); });
        } catch (e) { contentDiv.innerHTML = '<p class="text-red-500 dark:text-red-400 col-span-full text-xs">Erro ao carregar estatísticas.</p>'; }
        return widget;
    }

    async function renderDashboard() {
        if (!mainContentWrapperRef) return;
        
        mainContentWrapperRef.innerHTML = ''; 

        const dashboardWrapper = document.createElement('div');
        dashboardWrapper.id = 'dashboard-informativo';
        dashboardWrapper.className = 'p-2 md:p-0';
        
        const headerDashboard = document.createElement('div');
        headerDashboard.className = 'mb-6 flex justify-between items-center';
        headerDashboard.innerHTML = `
            <div>
                <h2 class="text-2xl font-semibold">Dashboard Informativo</h2>
                <p class="text-sm text-gray-500 dark:text-gray-400">Visão geral das suas atividades.</p>
            </div>
            <button id="ajuda-dashboard" class="p-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-300" title="Ajuda sobre o Dashboard">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-question-circle-fill" viewBox="0 0 16 16">
                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.496 6.033h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286a.237.237 0 0 0 .241.247zm2.325 6.443c.61 0 1.029-.394 1.029-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94 0 .533.425.927 1.01.927z"/>
                </svg>
            </button>
        `;
        dashboardWrapper.appendChild(headerDashboard);

        const widgetsContainer = document.createElement('div');
        widgetsContainer.id = 'dashboard-widgets-container';
        widgetsContainer.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
        dashboardWrapper.appendChild(widgetsContainer);

        mainContentWrapperRef.appendChild(dashboardWrapper);

        widgetsContainer.appendChild(criarWidgetLinksRapidos()); 
        widgetsContainer.appendChild(await criarWidgetPrazosProximos());
        widgetsContainer.appendChild(await criarWidgetTarefasPendentes());
        widgetsContainer.appendChild(await criarWidgetDocumentosRecentes());
        
        if (servidoresWidgetsModuleRef && typeof servidoresWidgetsModuleRef.renderWidgetServidoresAusentes === 'function') {
            const widgetElementoAusentes = await servidoresWidgetsModuleRef.renderWidgetServidoresAusentes();
            if (widgetElementoAusentes) { 
                 widgetsContainer.appendChild(widgetElementoAusentes); 
            }
        }
        
        if (servidoresWidgetsModuleRef && typeof servidoresWidgetsModuleRef.renderWidgetServidoresTrabalhoRemotoHoje === 'function') {
            const widgetElementoRemoto = await servidoresWidgetsModuleRef.renderWidgetServidoresTrabalhoRemotoHoje();
            if (widgetElementoRemoto) { 
                 widgetsContainer.appendChild(widgetElementoRemoto); 
            }
        }
        
        widgetsContainer.appendChild(await criarWidgetEstatisticasBasicas());

        dashboardWrapper.querySelectorAll('.link-dashboard, .header-button[data-action]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const action = e.currentTarget.dataset.action;
                const id = e.currentTarget.dataset.id;
                
                if (appModuleRef && appModuleRef.handleMenuAction) {
                    let navData = {};
                    if(action.includes('documento')) navData = { docId: id };
                    else if(action.includes('tarefa')) navData = { tarefaId: id };
                    else if(action.includes('recurso')) navData = { recursoId: id };
                    else if(action.includes('servidor')) navData = { servidorId: id }; 
                    
                    appModuleRef.handleMenuAction(action, { ...navData, originatingView: 'dashboard' });
                }
            });
        });
        
        const btnAjudaDashboard = document.getElementById('ajuda-dashboard');
        if(btnAjudaDashboard && window.SEFWorkStation.Ajuda && window.SEFWorkStation.Ajuda.mostrarTopicoDeAjuda) {
            btnAjudaDashboard.addEventListener('click', (e) => {
                e.preventDefault();
                window.SEFWorkStation.Ajuda.mostrarTopicoDeAjuda('manual-intro-config', 'manual-intro-interface');
            });
        }
    }

    return {
        init,
        renderDashboard
    };
})();
