// js/itcd/calculo/listagens.js - Módulo para Listagem de Cálculos de ITCD
// v2.1.0 - MELHORIA: Exibição de partes envolvidas e valor do imposto na listagem de cálculos.
// v2.0.0 - REFATORADO: Página agora exibe e busca em todos os tipos de cálculos salvos (Causa Mortis, Doação, etc.).
// v1.2.0 - CORRIGIDO: O botão "Editar" agora chama a ação correta 'itcd-editar-calculo' para evitar bugs de duplicação de dados.
// v1.1.0 - Conecta o botão de visualizar à nova tela de visualização do cálculo.
// v1.0.1 - CORRIGIDO: Utiliza a referência da store do DB (dbRef.STORES) em vez de constante local.
// v1.0.0 - Implementação inicial da listagem, pesquisa e ações para cálculos salvos.

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ITCD = window.SEFWorkStation.ITCD || {};
window.SEFWorkStation.ITCD.Calculo = window.SEFWorkStation.ITCD.Calculo || {};

window.SEFWorkStation.ITCD.Calculo.Listagens = (function() {

    let mainContentWrapperRef;
    let dbRef;
    let appModuleRef;
    let uiModuleRef;
    
    function init(db, app, ui, mainWrapper) {
        dbRef = db;
        appModuleRef = app;
        uiModuleRef = ui;
        mainContentWrapperRef = mainWrapper;
        console.log("Módulo ITCD.Calculo.Listagens inicializado (v2.1.0).");
    }

    function _getTipoCalculoDisplay(tipo) {
        switch(tipo) {
            case 'causaMortis': return 'Causa Mortis';
            case 'doacao': return 'Doação';
            case 'doacoesSucessivas': return 'Doações Sucessivas';
            case 'excedenteMeacao': return 'Excedente de Meação';
            case 'usufruto_instituicao': return 'Instituição de Usufruto';
            case 'usufruto_extincao': return 'Extinção de Usufruto';
            default: return tipo || 'Desconhecido';
        }
    }

    async function renderGerirCalculosPage() {
        if (!mainContentWrapperRef) {
            console.error("ITCD.Calculo.Listagens: O contêiner de conteúdo principal não está definido.");
            return;
        }

        const pageHtml = `
            <div id="gerir-calculos-container" class="page-section max-w-none px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-100">Gerenciar Cálculos de ITCD Salvos</h2>
                    <button id="btn-novo-calculo" class="btn-primary">Novo Cálculo</button>
                </div>
                
                <div class="filtros-container mb-4">
                     <input type="search" id="filtro-calculo" class="form-input-text w-full md:w-1/2" placeholder="Pesquisar por DBD, Partes Envolvidas...">
                </div>
                <div id="results-count-calculos" class="mb-2 text-sm text-gray-600 dark:text-gray-400"></div>

                <div id="lista-calculos-salvos" class="table-list-container">
                    <table class="documentos-table">
                        <thead>
                            <tr>
                                <th>Tipo de Cálculo</th>
                                <th class="w-1/3">Partes Envolvidas / Descrição</th>
                                <th>Data do Fato Gerador</th>
                                <th class="text-right">Valor (Base)</th>
                                <th class="text-right">Imposto Devido</th>
                                <th>Data do Salvamento</th>
                                <th class="text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Conteúdo será preenchido dinamicamente -->
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        mainContentWrapperRef.innerHTML = pageHtml;
        addEventListenersToListagemPage();
        await carregarECalculos();
    }

    async function carregarECalculos() {
        const tbody = document.querySelector('#lista-calculos-salvos tbody');
        const countContainer = document.getElementById('results-count-calculos');
        const searchTerm = document.getElementById('filtro-calculo')?.value.toLowerCase() || '';

        if (!tbody || !countContainer) return;

        tbody.innerHTML = '<tr><td colspan="7" class="text-center p-4">Carregando...</td></tr>';

        try {
            const allCalculos = await dbRef.getAllItems(dbRef.STORES.ITCD_CALCULOS);
            const totalCount = allCalculos.length;

            let calculosFiltrados = allCalculos;
            if (searchTerm) {
                calculosFiltrados = allCalculos.filter(calc => {
                    const tipoMatch = _getTipoCalculoDisplay(calc.tipoCalculo).toLowerCase().includes(searchTerm);
                    const declaracaoMatch = calc.declaracaoNumero?.toLowerCase().includes(searchTerm);
                    const deCujusMatch = calc.deCujusNome?.toLowerCase().includes(searchTerm);
                    // Adicionando busca por múltiplos tipos de partes envolvidas
                    const doadoresMatch = (calc.doadores || []).some(d => d.nome.toLowerCase().includes(searchTerm));
                    const donatariosMatch = (calc.donatarios || []).some(d => d.nome.toLowerCase().includes(searchTerm));
                    const donatarioSucessivasMatch = calc.donatario?.toLowerCase().includes(searchTerm);
                    const partesExcedenteMatch = (calc.dadosPartilha?.conjuge1?.toLowerCase().includes(searchTerm) || calc.dadosPartilha?.conjuge2?.toLowerCase().includes(searchTerm));
                    const partesUsufrutoInstMatch = (calc.dadosUsufruto?.instituidores || []).some(i => i.nome.toLowerCase().includes(searchTerm));
                    const partesUsufrutoBenefMatch = (calc.dadosUsufruto?.beneficiarios || []).some(b => b.nome.toLowerCase().includes(searchTerm));
                    return tipoMatch || declaracaoMatch || deCujusMatch || doadoresMatch || donatariosMatch || donatarioSucessivasMatch || partesExcedenteMatch || partesUsufrutoInstMatch || partesUsufrutoBenefMatch;
                });
            }

            countContainer.textContent = `Exibindo ${calculosFiltrados.length} de ${totalCount} cálculos salvos.`;

            if (calculosFiltrados.length === 0) {
                const message = searchTerm ? 'Nenhum cálculo encontrado com os filtros aplicados.' : 'Nenhum cálculo foi salvo ainda.';
                tbody.innerHTML = `<tr><td colspan="7" class="text-center p-8">${message}</td></tr>`;
                return;
            }

            calculosFiltrados.sort((a, b) => new Date(b.dataSalvamento) - new Date(a.dataSalvamento));
            
            tbody.innerHTML = '';
            for (const calculo of calculosFiltrados) {
                const tr = document.createElement('tr');
                tr.dataset.id = calculo.id;

                let tipoDisplay = _getTipoCalculoDisplay(calculo.tipoCalculo);
                let partesEnvolvidasDisplay = calculo.deCujusNome || 'N/A';
                let valorBaseDisplay = 'R$ 0,00';
                let valorImpostoDisplay = 'R$ 0,00';
                
                if (calculo.resultadoFinal) {
                     if(calculo.resultadoFinal.valores) {
                        valorBaseDisplay = (calculo.resultadoFinal.valores.baseCalculoReais || 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
                     }
                     if(calculo.resultadoFinal.total) {
                        valorImpostoDisplay = (calculo.resultadoFinal.total.impostoARecolher || 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
                     } else if (calculo.resultadoFinal.valores) {
                        // Fallback para cálculos mais antigos ou simples
                        valorImpostoDisplay = (calculo.resultadoFinal.valores.impostoARecolher || 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
                     }
                }

                switch(calculo.tipoCalculo) {
                    case 'doacao':
                        const nomesDoadores = (calculo.doadores || []).map(d => d.nome).join(', ');
                        const nomesDonatarios = (calculo.donatarios || []).map(d => d.nome).join(', ');
                        partesEnvolvidasDisplay = `Doação de ${nomesDoadores || 'N/A'} para ${nomesDonatarios || 'N/A'}`;
                        break;
                    case 'doacoesSucessivas':
                        partesEnvolvidasDisplay = `Doações Sucessivas para ${calculo.donatario || 'N/A'}`;
                        break;
                    case 'excedenteMeacao':
                        partesEnvolvidasDisplay = `Partilha entre ${calculo.dadosPartilha?.conjuge1 || 'N/A'} e ${calculo.dadosPartilha?.conjuge2 || 'N/A'}`;
                        break;
                    case 'usufruto_instituicao':
                        const nomesInstituidores = (calculo.dadosUsufruto?.instituidores || []).map(p => p.nome).join(', ');
                        const nomesBenefsInst = (calculo.dadosUsufruto?.beneficiarios || []).map(p => p.nome).join(', ');
                        partesEnvolvidasDisplay = `Instituição de ${nomesInstituidores || 'N/A'} p/ ${nomesBenefsInst || 'N/A'}`;
                        break;
                    case 'usufruto_extincao':
                         const nomesAntigosUsufrutuarios = (calculo.dadosUsufruto?.antigosUsufrutuarios || []).map(p => p.nome).join(', ');
                         const nomesBenefsExt = (calculo.dadosUsufruto?.beneficiarios || []).map(p => p.nome).join(', ');
                         partesEnvolvidasDisplay = `Extinção de ${nomesAntigosUsufrutuarios || 'N/A'} p/ ${nomesBenefsExt || 'N/A'}`;
                        break;
                    case 'causaMortis':
                        if (calculo.declaracaoNumero) partesEnvolvidasDisplay += `<br><span class="text-xs text-gray-500">DBD: ${calculo.declaracaoNumero}</span>`;
                        break;
                }

                tr.innerHTML = `
                    <td class="py-2 px-3 font-semibold">${tipoDisplay}</td>
                    <td class="py-2 px-3">${partesEnvolvidasDisplay}</td>
                    <td class="py-2 px-3">${calculo.dataFatoGerador ? new Date(calculo.dataFatoGerador + 'T00:00:00').toLocaleDateString() : 'N/A'}</td>
                    <td class="py-2 px-3 text-right">${valorBaseDisplay}</td>
                    <td class="py-2 px-3 text-right font-semibold">${valorImpostoDisplay}</td>
                    <td class="py-2 px-3">${calculo.dataSalvamento ? new Date(calculo.dataSalvamento).toLocaleString('pt-BR') : 'N/A'}</td>
                    <td class="actions-cell text-center py-2 px-3 space-x-1">
                        <button class="btn-link btn-visualizar-calculo p-1" data-id="${calculo.id}" title="Visualizar Cálculo"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye-fill inline-block" viewBox="0 0 16 16"><path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/><path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/></svg></button>
                        <button class="btn-link btn-editar-calculo p-1" data-id="${calculo.id}" title="Editar Cálculo"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square inline-block" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg></button>
                        <button class="btn-link btn-excluir-calculo p-1" data-id="${calculo.id}" title="Excluir Cálculo"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash-fill inline-block" viewBox="0 0 16 16"><path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1H2.5zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5zM8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5zm3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0z"/></svg></button>
                    </td>`;
                tbody.appendChild(tr);
            }
            addListagemActionListeners();
        } catch (error) {
            console.error("Erro ao carregar e filtrar cálculos:", error);
            tbody.innerHTML = '<tr><td colspan="7" class="text-center p-4">Falha ao carregar a lista de cálculos.</td></tr>';
        }
    }

    function addEventListenersToListagemPage() {
        document.getElementById('filtro-calculo')?.addEventListener('input', carregarECalculos);
        document.getElementById('btn-novo-calculo')?.addEventListener('click', () => {
            appModuleRef.handleMenuAction('itcd-calculo-hub');
        });
    }

    function addListagemActionListeners() {
        document.querySelectorAll('.btn-visualizar-calculo').forEach(btn => {
            btn.addEventListener('click', () => {
                const calculoId = btn.dataset.id;
                appModuleRef.handleMenuAction('itcd-visualizar-calculo', { calculoId: calculoId });
            });
        });

        document.querySelectorAll('.btn-editar-calculo').forEach(btn => {
            btn.addEventListener('click', async () => {
                const calculoId = btn.dataset.id;
                try {
                    const calculo = await dbRef.getItemById(dbRef.STORES.ITCD_CALCULOS, calculoId);
                    if (calculo) {
                        // A navegação agora decide qual formulário abrir com base no tipo
                        appModuleRef.handleMenuAction('itcd-editar-calculo', { calculoData: calculo });
                    } else {
                        uiModuleRef.showToastNotification("Cálculo não encontrado para edição.", "error");
                    }
                } catch (e) {
                    uiModuleRef.showToastNotification("Erro ao carregar dados do cálculo para edição.", "error");
                }
            });
        });

        document.querySelectorAll('.btn-excluir-calculo').forEach(btn => {
            btn.addEventListener('click', async () => {
                const calculoId = btn.dataset.id;
                if (await uiModuleRef.showConfirmationModal('Confirmar Exclusão', 'Tem certeza que deseja excluir este cálculo salvo? Esta ação não pode ser desfeita.')) {
                    try {
                        await dbRef.deleteItem(dbRef.STORES.ITCD_CALCULOS, calculoId);
                        uiModuleRef.showToastNotification("Cálculo excluído com sucesso.", "success");
                        await carregarECalculos();
                    } catch (error) {
                        console.error("Erro ao excluir cálculo:", error);
                        uiModuleRef.showToastNotification(`Falha ao excluir cálculo: ${error.message}`, "error");
                    }
                }
            });
        });
    }

    return {
        init,
        renderGerirCalculosPage
    };
})();