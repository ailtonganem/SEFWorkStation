// js/comunicacaoEmailsGeradosListagens.js - Lógica para Listagem de E-mails Gerados
// v1.0.1 - Remove classe page-section para expandir a largura da visualização.
// v1.0 - Estrutura inicial, listagem, filtros básicos, ordenação e ações.

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.Comunicacao = window.SEFWorkStation.Comunicacao || {};

window.SEFWorkStation.ComunicacaoEmailsGeradosListagens = (function() {
    let mainContentWrapperRef;
    let globalShowFeedbackRef;
    let globalClearFeedbackRef;
    let navigateToAppViewRef;
    let refreshApplicationStateRef;
    let dbRef;
    let appModuleRef;
    let uiModuleRef;

    const EMAILS_GERADOS_STORE_NAME = 'comunicacaoEmailsGeradosStore';
    let feedbackAreaIdListagem = "feedback-listagem-emails-gerados";

    let currentEmailsGeradosFilters = {
        searchTerm: '',
        status: '', // "Gerado", "Enviado Manualmente"
        dataInicio: '',
        dataFim: '',
        sortField: 'dataGeracao', // 'dataGeracao', 'assunto', 'status'
        sortOrder: 'desc' // 'asc', 'desc'
    };

    function init(
        mainWrapper, showFeedback, clearFeedback, navigateTo, refreshState,
        db, applicationModule, ui
    ) {
        mainContentWrapperRef = mainWrapper;
        globalShowFeedbackRef = showFeedback;
        globalClearFeedbackRef = clearFeedback;
        navigateToAppViewRef = navigateTo;
        refreshApplicationStateRef = refreshState;
        dbRef = db;
        appModuleRef = applicationModule;
        uiModuleRef = ui;

        console.log("ComunicacaoEmailsGeradosListagens.JS: Módulo inicializado (v1.0.1).");
    }

    async function filterAndSortEmailsGerados(emails, filters) {
        let processados = emails.filter(e => !e.isDeleted); // Futuramente, se houver 'isDeleted'

        if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase().trim();
            processados = processados.filter(e =>
                (e.assunto && e.assunto.toLowerCase().includes(term)) ||
                (e.para && e.para.some(dest => dest.toLowerCase().includes(term))) ||
                (e.nomeArquivoEML && e.nomeArquivoEML.toLowerCase().includes(term))
            );
        }
        if (filters.status) {
            processados = processados.filter(e => e.status === filters.status);
        }
        if (filters.dataInicio) {
            try {
                const dataInicioFiltro = new Date(filters.dataInicio + "T00:00:00.000Z").getTime();
                processados = processados.filter(e => new Date(e.dataGeracao).getTime() >= dataInicioFiltro);
            } catch (e) { console.warn("Data de início inválida:", filters.dataInicio); }
        }
        if (filters.dataFim) {
             try {
                const dataFimFiltro = new Date(filters.dataFim + "T23:59:59.999Z").getTime();
                processados = processados.filter(e => new Date(e.dataGeracao).getTime() <= dataFimFiltro);
            } catch (e) { console.warn("Data de fim inválida:", filters.dataFim); }
        }

        processados.sort((a, b) => {
            let valA, valB;
            switch (filters.sortField) {
                case 'dataGeracao':
                    valA = new Date(a.dataGeracao).getTime();
                    valB = new Date(b.dataGeracao).getTime();
                    break;
                case 'assunto':
                    valA = (a.assunto || '').toLowerCase();
                    valB = (b.assunto || '').toLowerCase();
                    break;
                case 'status':
                    valA = (a.status || '').toLowerCase();
                    valB = (b.status || '').toLowerCase();
                    break;
                default:
                    valA = 0; valB = 0;
            }
            return filters.sortOrder === 'asc' ? (valA > valB ? 1 : (valA < valB ? -1 : 0)) 
                                               : (valB > valA ? 1 : (valB < valA ? -1 : 0));
        });
        return processados;
    }

    async function renderGerirEmailsGeradosPage() {
        if (globalClearFeedbackRef) globalClearFeedbackRef();
        feedbackAreaIdListagem = `feedback-listagem-emails-gerados-${Date.now()}`;

        if (!mainContentWrapperRef) {
            if (globalShowFeedbackRef) globalShowFeedbackRef("Erro crítico: Contêiner principal não definido.", "error");
            return;
        }
        mainContentWrapperRef.innerHTML = `<p class="loading-text p-4">Carregando e-mails gerados...</p>`;

        try {
            const todosEmails = await dbRef.getAllItems(EMAILS_GERADOS_STORE_NAME);
            const emailsProcessados = await filterAndSortEmailsGerados(todosEmails, currentEmailsGeradosFilters);

            // REMOVIDA CLASSE page-section
            let pageHtml = `
                <div id="gerir-emails-gerados-container"> 
                    <div id="${feedbackAreaIdListagem}" class="mb-4"></div>
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                        <h2 class="text-xl font-semibold">E-mails Gerados</h2>
                        <button id="btn-novo-email-compositor-da-lista" class="btn-primary btn-sm whitespace-nowrap">
                           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square inline-block mr-1 align-text-bottom" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293z"/><path d="m10.964.936.992.991-3.131 3.132-1.482-1.482L10.964.936z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg>
                            Escrever Novo E-mail
                        </button>
                    </div>

                    <div class="filtros-avancados-recursos p-4 mb-6 border dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800 shadow">
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                            <div>
                                <label for="search-emails-gerados-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Buscar Assunto/Dest./Arquivo:</label>
                                <input type="search" id="search-emails-gerados-input" class="form-input-text mt-1 block w-full text-sm" value="${currentEmailsGeradosFilters.searchTerm}">
                            </div>
                            <div>
                                <label for="filtro-status-email-gerado" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Status:</label>
                                <select id="filtro-status-email-gerado" class="form-select mt-1 block w-full text-sm">
                                    <option value="">Todos</option>
                                    <option value="Gerado" ${currentEmailsGeradosFilters.status === 'Gerado' ? 'selected' : ''}>Gerado</option>
                                    <option value="Enviado Manualmente" ${currentEmailsGeradosFilters.status === 'Enviado Manualmente' ? 'selected' : ''}>Enviado Manualmente</option>
                                </select>
                            </div>
                            <div>
                                <label for="filtro-data-inicio-email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Data Geração (Início):</label>
                                <input type="date" id="filtro-data-inicio-email" class="form-input-text mt-1 block w-full text-sm" value="${currentEmailsGeradosFilters.dataInicio}">
                            </div>
                            <div>
                                <label for="filtro-data-fim-email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Data Geração (Fim):</label>
                                <input type="date" id="filtro-data-fim-email" class="form-input-text mt-1 block w-full text-sm" value="${currentEmailsGeradosFilters.dataFim}">
                            </div>
                            <div class="lg:col-span-4 flex flex-col sm:flex-row items-end gap-2 mt-2">
                                <button id="btn-aplicar-filtros-emails-gerados" class="btn-primary btn-sm text-sm py-1.5 px-3 w-full sm:w-auto">Aplicar Filtros</button>
                                <button id="btn-limpar-filtros-emails-gerados" class="btn-secondary btn-sm text-sm py-1.5 px-3 w-full sm:w-auto">Limpar Filtros</button>
                            </div>
                        </div>
                    </div>`;

            if (emailsProcessados.length === 0) {
                pageHtml += `<p class="text-center text-gray-500 dark:text-gray-400 py-8">
                    ${currentEmailsGeradosFilters.searchTerm || currentEmailsGeradosFilters.status || currentEmailsGeradosFilters.dataInicio || currentEmailsGeradosFilters.dataFim ? 'Nenhum e-mail encontrado com os filtros aplicados.' : 'Nenhum e-mail gerado encontrado.'}
                </p>`;
            } else {
                pageHtml += `
                    <div class="table-list-container overflow-x-auto">
                        <table id="tabela-emails-gerados" class="documentos-table min-w-full">
                            <thead>
                                <tr>
                                    <th data-sort-email="assunto" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700 px-4 py-2 text-left">Assunto <span class="sort-arrow-email ml-1"></span></th>
                                    <th class="px-4 py-2 text-left">Para (Principal)</th>
                                    <th data-sort-email="dataGeracao" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700 px-4 py-2 text-left">Data Geração <span class="sort-arrow-email ml-1"></span></th>
                                    <th data-sort-email="status" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700 px-4 py-2 text-left">Status <span class="sort-arrow-email ml-1"></span></th>
                                    <th class="px-4 py-2 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody>`;
                for (const email of emailsProcessados) {
                    const paraPrincipal = email.para && email.para.length > 0 ? email.para[0] : 'N/D';
                    const statusClass = email.status === 'Enviado Manualmente' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400';
                    pageHtml += `
                        <tr data-id="${email.id}" class="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                            <td class="px-4 py-2 truncate" title="${email.assunto.replace(/"/g, '"')}">
                                <a href="#" class="link-visualizar-email-gerado hover:underline text-blue-600 dark:text-blue-400" data-email-id="${email.id}">${email.assunto}</a>
                            </td>
                            <td class="px-4 py-2 truncate" title="${(email.para || []).join(', ')}">${paraPrincipal} ${email.para && email.para.length > 1 ? ` (+${email.para.length - 1})` : ''}</td>
                            <td class="px-4 py-2">${new Date(email.dataGeracao).toLocaleDateString()}</td>
                            <td class="px-4 py-2"><span class="${statusClass} font-medium">${email.status}</span></td>
                            <td class="actions-cell text-center px-4 py-2 whitespace-nowrap">
                                <button class="btn-link btn-visualizar-email-lista p-1 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-300" data-email-id="${email.id}" title="Visualizar Detalhes">
                                   <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi bi-eye-fill inline-block" viewBox="0 0 16 16"><path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/><path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/></svg>
                                </button>
                                <button class="btn-link btn-abrir-eml-lista p-1 text-gray-600 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-300" data-filename="${email.nomeArquivoEML}" title="Abrir .eml">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi bi-envelope-arrow-up inline-block" viewBox="0 0 16 16"><path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4.5a.5.5 0 0 1-1 0V5.37a2.03 2.03 0 0 0-.64-.06L8 8.91 1.64.31A2.03 2.03 0 0 0 1 5.37V12a2 2 0 0 0 2 2h5.5a.5.5 0 0 1 0 1H3a3 3 0 0 1-3-3V4Zm16-1.37a3.02 3.02 0 0 0-2.35-.94L8 7.09 1.35 2.69A3.02 3.02 0 0 0 0 4.625V5.37l7.69 4.47L16 5.37v-.74ZM16 12.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Zm-3.5-2a.5.5 0 0 0-1 0V12h-1.5a.5.5 0 0 0 0 1H11v1.5a.5.5 0 0 0 1 0V13h1.5a.5.5 0 0 0 0-1H12v-1.5Z"/></svg>
                                </button>
                                <button class="btn-link btn-excluir-email-lista p-1 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-300" data-email-id="${email.id}" data-assunto="${email.assunto.replace(/"/g, '"')}" title="Excluir Registro">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi bi-trash-fill inline-block" viewBox="0 0 16 16"><path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1H2.5zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5zM8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5zm3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0z"/></svg>
                                </button>
                            </td>
                        </tr>`;
                }
                pageHtml += '</tbody></table></div>';
            }
            pageHtml += '</div>'; 
            mainContentWrapperRef.innerHTML = pageHtml;
            updateSortArrowsEmailsGerados();
            addEventListenersToListagemEmailsGerados(document.getElementById(feedbackAreaIdListagem));
        } catch (error) {
            console.error("Erro ao renderizar lista de emails gerados:", error);
            mainContentWrapperRef.innerHTML = `<p class="feedback-message error p-4">Erro ao carregar e-mails gerados: ${error.message}</p>`;
             if(globalShowFeedbackRef) globalShowFeedbackRef(`Erro ao carregar e-mails gerados: ${error.message}`, "error");
        }
    }

    function updateSortArrowsEmailsGerados() {
        const table = document.getElementById('tabela-emails-gerados');
        if (!table) return;
        table.querySelectorAll('th[data-sort-email]').forEach(th => {
            const arrowSpan = th.querySelector('.sort-arrow-email');
             if (!arrowSpan) { 
                const newSpan = document.createElement('span');
                newSpan.className = 'sort-arrow-email ml-1';
                th.appendChild(newSpan);
            }
            const currentArrowSpan = th.querySelector('.sort-arrow-email'); 
            if (th.dataset.sortEmail === currentEmailsGeradosFilters.sortField) {
                currentArrowSpan.textContent = currentEmailsGeradosFilters.sortOrder === 'asc' ? '▲' : '▼';
            } else {
                currentArrowSpan.textContent = '';
            }
        });
    }

    function addEventListenersToListagemEmailsGerados(feedbackDisplayArea) {
        document.getElementById('btn-novo-email-compositor-da-lista')?.addEventListener('click', () => {
            if (navigateToAppViewRef) navigateToAppViewRef('escrever-email');
        });

        const searchInput = document.getElementById('search-emails-gerados-input');
        const statusSelect = document.getElementById('filtro-status-email-gerado');
        const dataInicioInput = document.getElementById('filtro-data-inicio-email');
        const dataFimInput = document.getElementById('filtro-data-fim-email');
        const btnAplicarFiltros = document.getElementById('btn-aplicar-filtros-emails-gerados');
        const btnLimparFiltros = document.getElementById('btn-limpar-filtros-emails-gerados');

        if (btnAplicarFiltros) {
            btnAplicarFiltros.addEventListener('click', () => {
                currentEmailsGeradosFilters.searchTerm = searchInput ? searchInput.value : '';
                currentEmailsGeradosFilters.status = statusSelect ? statusSelect.value : '';
                currentEmailsGeradosFilters.dataInicio = dataInicioInput ? dataInicioInput.value : '';
                currentEmailsGeradosFilters.dataFim = dataFimInput ? dataFimInput.value : '';
                renderGerirEmailsGeradosPage();
            });
        }
        if (btnLimparFiltros) {
            btnLimparFiltros.addEventListener('click', () => {
                currentEmailsGeradosFilters = { searchTerm: '', status: '', dataInicio: '', dataFim: '', sortField: 'dataGeracao', sortOrder: 'desc' };
                if (searchInput) searchInput.value = '';
                if (statusSelect) statusSelect.value = '';
                if (dataInicioInput) dataInicioInput.value = '';
                if (dataFimInput) dataFimInput.value = '';
                renderGerirEmailsGeradosPage();
            });
        }

        document.querySelectorAll('#tabela-emails-gerados th[data-sort-email]').forEach(th => {
            th.addEventListener('click', () => {
                const field = th.dataset.sortEmail;
                if (currentEmailsGeradosFilters.sortField === field) {
                    currentEmailsGeradosFilters.sortOrder = currentEmailsGeradosFilters.sortOrder === 'asc' ? 'desc' : 'asc';
                } else {
                    currentEmailsGeradosFilters.sortField = field;
                    currentEmailsGeradosFilters.sortOrder = 'asc'; 
                }
                renderGerirEmailsGeradosPage();
            });
        });

        mainContentWrapperRef.querySelectorAll('.link-visualizar-email-gerado, .btn-visualizar-email-lista').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const emailId = e.currentTarget.dataset.emailId;
                if (navigateToAppViewRef) navigateToAppViewRef('visualizar-email-gerado', { emailId: emailId, originatingView: 'gerir-emails-criados' });
            });
        });
        
        mainContentWrapperRef.querySelectorAll('.btn-abrir-eml-lista').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                const fileName = e.currentTarget.dataset.filename;
                // CORREÇÃO APLICADA AQUI: Utiliza State Manager
                const directoryHandle = SEFWorkStation.State.getDirectoryHandle();
                if (!directoryHandle) {
                    if(globalShowFeedbackRef && feedbackDisplayArea) globalShowFeedbackRef("Pasta da aplicação não selecionada. Não é possível abrir o arquivo .eml.", "error", feedbackDisplayArea);
                    return;
                }
                try {
                    const emailDirHandle = await directoryHandle.getDirectoryHandle('email', { create: false });
                    const fileHandle = await emailDirHandle.getFileHandle(fileName, { create: false });
                    const file = await fileHandle.getFile();
                    const url = URL.createObjectURL(file);
                    const a = document.createElement('a');
                    a.href = url;
                    document.body.appendChild(a); a.click(); document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 100);
                    if(globalShowFeedbackRef && feedbackDisplayArea) globalShowFeedbackRef(`Tentando abrir "${fileName}"...`, "success", feedbackDisplayArea, 4000);
                } catch (error) {
                    if(globalShowFeedbackRef && feedbackDisplayArea) globalShowFeedbackRef(`Erro ao abrir arquivo .eml "${fileName}": ${error.message}`, "error", feedbackDisplayArea, 0);
                }
            });
        });

        mainContentWrapperRef.querySelectorAll('.btn-excluir-email-lista').forEach(button => {
            button.addEventListener('click', async (event) => {
                event.stopPropagation();
                const emailId = event.currentTarget.dataset.emailId;
                const emailAssunto = event.currentTarget.dataset.assunto;
                
                if (confirm(`Tem certeza que deseja excluir o REGISTRO do e-mail "${emailAssunto}"?`)) {
                    const emailData = await dbRef.getItemById(EMAILS_GERADOS_STORE_NAME, emailId);
                    if (!emailData) {
                        if(globalShowFeedbackRef && feedbackDisplayArea) globalShowFeedbackRef("Registro de e-mail não encontrado.", "error", feedbackDisplayArea);
                        return;
                    }
                    const deveExcluirArquivoFisico = confirm(`Deseja também tentar excluir o arquivo físico "${emailData.nomeArquivoEML}" da pasta "email"?`);
                    try {
                        // CORREÇÃO APLICADA AQUI: Utiliza State Manager
                        const directoryHandle = SEFWorkStation.State.getDirectoryHandle();
                        if (deveExcluirArquivoFisico && directoryHandle && emailData.nomeArquivoEML) {
                            try {
                                const emailDirHandle = await directoryHandle.getDirectoryHandle('email', { create: false });
                                await emailDirHandle.removeEntry(emailData.nomeArquivoEML);
                                if(globalShowFeedbackRef && feedbackDisplayArea) globalShowFeedbackRef(`Arquivo físico "${emailData.nomeArquivoEML}" excluído.`, "info", feedbackDisplayArea, 3000);
                            } catch (fileError) { 
                                if (fileError.name !== 'NotFoundError') {
                                     console.warn("Erro ao excluir arquivo .eml da lista:", fileError);
                                     if(globalShowFeedbackRef && feedbackDisplayArea) globalShowFeedbackRef(`Não foi possível excluir arquivo físico: ${fileError.message}`, "warning", feedbackDisplayArea, 0);
                                } else {
                                     if(globalShowFeedbackRef && feedbackDisplayArea) globalShowFeedbackRef(`Arquivo físico "${emailData.nomeArquivoEML}" não encontrado para exclusão.`, "info", feedbackDisplayArea, 3000);
                                }
                            }
                        }
                        await dbRef.deleteItem(EMAILS_GERADOS_STORE_NAME, emailId);
                        if(globalShowFeedbackRef && feedbackDisplayArea) globalShowFeedbackRef(`Registro do e-mail "${emailAssunto}" excluído.`, "success", feedbackDisplayArea, 4000);
                        await renderGerirEmailsGeradosPage(); 
                        if (refreshApplicationStateRef) await refreshApplicationStateRef();
                    } catch (error) {
                        if(globalShowFeedbackRef && feedbackDisplayArea) globalShowFeedbackRef(`Erro ao excluir registro do e-mail: ${error.message}`, "error", feedbackDisplayArea, 0);
                    }
                }
            });
        });
    }

    return {
        init,
        renderGerirEmailsGeradosPage
    };
})();