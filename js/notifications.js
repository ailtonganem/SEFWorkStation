// js/notifications.js - Módulo para Sistema de Notificações Internas
// v1.0 - Implementação inicial do sistema de notificações para Tarefas e Recursos.

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.Notifications = (function() {
    let dbRef;
    let appModuleRef;
    let uiModuleRef;

    let notificationButtonEl;
    let notificationBadgeEl;
    let notificationDropdownEl;

    const DIAS_AVISO_PROXIMO = 7; // Notificar quando faltarem 7 dias ou menos

    function init(db, app, ui) {
        dbRef = db;
        appModuleRef = app;
        uiModuleRef = ui;
        
        notificationButtonEl = document.getElementById('btn-notifications');
        notificationBadgeEl = document.getElementById('notification-badge');
        notificationDropdownEl = document.getElementById('notifications-dropdown');

        if (notificationButtonEl) {
            console.log("Notifications.JS: Módulo inicializado (v1.0).");
        } else {
            console.error("Notifications.JS: Elementos da UI de notificação não encontrados no DOM.");
        }
    }

    /**
     * Busca por tarefas e recursos com prazos relevantes e atualiza a UI.
     */
    async function checkAndDisplayNotifications() {
        if (!dbRef) {
            console.warn("Notifications.JS: DB não está pronto. Verificação de notificações adiada.");
            return;
        }

        try {
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            const dataLimiteAviso = new Date();
            dataLimiteAviso.setDate(hoje.getDate() + DIAS_AVISO_PROXIMO);

            let notifications = [];

            // 1. Verificar Tarefas
            const tarefas = await dbRef.getAllItems(dbRef.STORES.TAREFAS);
            const tarefasRelevantes = tarefas.filter(t => 
                !t.isExcluida && t.dataVencimento &&
                !['Concluída', 'Cancelada'].includes(t.status)
            );

            tarefasRelevantes.forEach(t => {
                const dataVenc = new Date(t.dataVencimento + 'T00:00:00');
                const diffDias = Math.ceil((dataVenc - hoje) / (1000 * 60 * 60 * 24));

                if (dataVenc < hoje) {
                    notifications.push({
                        id: t.id,
                        title: t.titulo,
                        type: 'Tarefa',
                        message: `Venceu há ${Math.abs(diffDias)} dia(s)`,
                        level: 'vencido',
                        timestamp: dataVenc,
                        action: 'visualizar-tarefa',
                        dataKey: 'tarefaId'
                    });
                } else if (dataVenc <= dataLimiteAviso) {
                     notifications.push({
                        id: t.id,
                        title: t.titulo,
                        type: 'Tarefa',
                        message: `Vence em ${diffDias} dia(s)`,
                        level: 'proximo',
                        timestamp: dataVenc,
                        action: 'visualizar-tarefa',
                        dataKey: 'tarefaId'
                    });
                }
            });

            // 2. Verificar Recursos
            const recursos = await dbRef.getAllItems(dbRef.STORES.RECURSOS);
            const recursosRelevantes = recursos.filter(r => 
                !r.isDeleted && r.dataLimiteResposta && 
                !['Deferido', 'Indeferido', 'Arquivado'].includes(r.status)
            );
            
            recursosRelevantes.forEach(r => {
                const dataLimite = new Date(r.dataLimiteResposta + 'T00:00:00');
                const diffDias = Math.ceil((dataLimite - hoje) / (1000 * 60 * 60 * 24));
                
                 if (dataLimite < hoje) {
                    notifications.push({
                        id: r.id,
                        title: r.titulo,
                        type: 'Recurso',
                        message: `Prazo de resposta venceu há ${Math.abs(diffDias)} dia(s)`,
                        level: 'vencido',
                        timestamp: dataLimite,
                        action: 'visualizar-recurso',
                        dataKey: 'recursoId'
                    });
                } else if (dataLimite <= dataLimiteAviso) {
                     notifications.push({
                        id: r.id,
                        title: r.titulo,
                        type: 'Recurso',
                        message: `Prazo de resposta vence em ${diffDias} dia(s)`,
                        level: 'proximo',
                        timestamp: dataLimite,
                        action: 'visualizar-recurso',
                        dataKey: 'recursoId'
                    });
                }
            });
            
            // Ordenar por urgência (vencidos primeiro, depois os mais próximos)
            notifications.sort((a, b) => a.timestamp - b.timestamp);

            renderNotifications(notifications);

        } catch (error) {
            console.error("Notifications.JS: Erro ao verificar notificações:", error);
        }
    }

    /**
     * Renderiza as notificações no painel do cabeçalho.
     * @param {Array<object>} notifications - A lista de notificações a serem exibidas.
     */
    function renderNotifications(notifications) {
        if (!notificationDropdownEl || !notificationBadgeEl) return;

        notificationDropdownEl.innerHTML = ''; 

        if (notifications.length > 0) {
            notificationBadgeEl.textContent = notifications.length;
            notificationBadgeEl.classList.remove('hidden');
            
            notifications.forEach(notif => {
                const itemEl = document.createElement('a');
                itemEl.href = '#';
                itemEl.className = 'notification-item';
                itemEl.dataset.action = notif.action;
                itemEl.dataset[notif.dataKey] = notif.id;

                const levelClass = notif.level === 'vencido' ? 'text-red-500 dark:text-red-400 font-bold' : 'text-yellow-600 dark:text-yellow-400';

                itemEl.innerHTML = `
                    <div class="font-semibold">${notif.title}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">
                        <span class="font-medium">[${notif.type}]</span> - <span class="${levelClass}">${notif.message}</span>
                    </div>
                `;
                notificationDropdownEl.appendChild(itemEl);
            });

        } else {
            notificationBadgeEl.classList.add('hidden');
            notificationBadgeEl.textContent = '0';
            notificationDropdownEl.innerHTML = '<div class="px-4 py-2 text-sm text-center text-gray-500 dark:text-gray-400">Nenhuma notificação nova.</div>';
        }
    }

    return {
        init,
        checkAndDisplayNotifications
    };
})();