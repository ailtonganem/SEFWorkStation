// js/itcd/view.js - Módulo para Visualização de Avaliações de ITCD
// v3.1.0 - CORRIGIDO: Ajusta os IDs dos botões no addEventListenersToView ('btn-gerar-parecer-view', etc.) para corresponderem aos IDs no HTML, corrigindo a funcionalidade de gerar parecer, editar e voltar.
// v3.0.0 - REMOVIDO: Botão "Nova Avaliação Vinculada" da tela de visualização para simplificar a interface.
// v2.9.0 - ADICIONADO: Botão "Nova Avaliação Vinculada" para criar uma nova avaliação (urbana, rural, semovente) pré-vinculada à avaliação atual.
// ... (histórico anterior omitido)

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ITCD = window.SEFWorkStation.ITCD || {};

window.SEFWorkStation.ITCD.View = (function() {

    let mainContentWrapperRef;
    let dbRef;
    let appModuleRef;
    let uiModuleRef;
    
    const ITCD_AVALIACOES_STORE = 'itcdAvaliacoesStore';

    const CATEGORIAS_SEMOVENTES = [
        { key: 'bezerros0a12', label: 'Bezerros 0 a 12 meses' },
        { key: 'bezerras0a12', label: 'Bezerras 0 a 12 meses' },
        { key: 'novilhas12a24', label: 'Novilhas 12 a 24 meses' },
        { key: 'novilhasMais24', label: 'Novilhas + de 24 meses' },
        { key: 'novilhos12a24', label: 'Novilhos 12 a 24 meses' },
        { key: 'novilhosMais24', label: 'Novilhos + de 24 meses' },
        { key: 'vacas', label: 'Vacas' },
        { key: 'touros', label: 'Touros' },
        { key: 'vacaComCria', label: 'Vaca com cria' },
        { key: 'burroOuMula', label: 'Burro ou Mula' },
        { key: 'cavalo', label: 'Cavalo' },
        { key: 'egua', label: 'Égua' },
        { key: 'novilhosMais36', label: 'Novilhos + de 36 meses' }
    ];
    
    const TIPOS_AVALIACAO = [
        { id: 'urbano', title: 'Imóvel Urbano', description: 'Para apartamentos, casas, lotes, salas comerciais e outros imóveis em área urbana.', action: 'itcd-avaliar-imovel-urbano', type: 'imovel', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-building" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M14.763.075A.5.5 0 0 1 15 .5v15a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5V14h-1v1.5a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5V14h-1v1.5a.5.5 0 0 1-.5.5H.5a.5.5 0 0 1-.5-.5v-15a.5.5 0 0 1 .237-.425l4.5-3a.5.5 0 0 1 .526 0l4.5 3 .474.316zM12 13.5V3.75l-4-2.667-4 2.667V13.5h8zM8 11h1v1H8v-1zm-2 0h1v1H6v-1zm-2 0h1v1H4v-1zm0-3h1v1H4v-1zm2 0h1v1H6v-1zm2 0h1v1H8v-1zm2 0h1v1h-1v-1zm-2-3h1v1H8V5zm-2 0h1v1H6V5z"/></svg>`},
        { id: 'rural', title: 'Imóvel Rural', description: 'Para fazendas, sítios, chácaras e terrenos localizados em área rural.', action: 'itcd-avaliar-imovel-rural', type: 'imovel', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-house-door" viewBox="0 0 16 16"><path d="M8.354 1.146a.5.5 0 0 0-.708 0l-6 6A.5.5 0 0 0 1.5 7.5v7a.5.5 0 0 0 .5.5h4.5a.5.5 0 0 0 .5-.5v-4h2v4a.5.5 0 0 0 .5.5H14a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.146-.354L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293L8.354 1.146zM2.5 14V7.707l5.5-5.5 5.5 5.5V14H10v-4a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5v4H2.5z"/></svg>`},
        { id: 'semovente', title: 'Semovente', description: 'Para avaliação de gado, equinos e outros tipos de rebanhos.', action: 'itcd-avaliar-semovente', type: 'semovente', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 16c0-2.2 1.8-4 4-4M5 10V4H3.5a2.5 2.5 0 1 0 0 5H5m0-5v2m0 3v2m1.1-4.8c-.2 1.3-1.3 2.3-2.6 2.3H5m0-5a2.5 2.5 0 1 1 5 0V10M12 4h2a2 2 0 1 1 0 4h-2v2a2 2 0 1 0 0 4h2a2 2 0 1 0 0 4h-2v2a2 2 0 1 1-4 0v-2a2 2 0 1 0-4 0v2H2"></path></svg>`}
    ];

    function init(db, app, ui, mainWrapper) {
        dbRef = db;
        appModuleRef = app;
        uiModuleRef = ui;
        mainContentWrapperRef = mainWrapper;
        console.log("Módulo ITCD.View inicializado (v3.1.0).");
    }

    function formatBRL(value) {
        if (isNaN(value) || value === null || value === undefined) return 'N/A';
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function formatUfemg(value) {
        if (isNaN(value) || value === null || value === undefined) return 'N/A';
        return value.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    }

    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString + 'T00:00:00').toLocaleDateString();
    }

    function getMonthName(monthNumber) {
        if (!monthNumber) return 'N/A';
        const date = new Date();
        date.setMonth(parseInt(monthNumber, 10) - 1);
        return date.toLocaleString('pt-BR', { month: 'long' });
    }


    async function renderVisualizarAvaliacaoPage(avaliacaoId, originatingView = 'itcd-gerir-avaliacoes') {
        if (!mainContentWrapperRef) {
            console.error("ITCD.View: O contêiner de conteúdo principal não está definido.");
            return;
        }

        mainContentWrapperRef.innerHTML = `<p class="loading-text p-4">Carregando detalhes da avaliação...</p>`;
        
        try {
            const avaliacao = await dbRef.getItemById(ITCD_AVALIACOES_STORE, avaliacaoId);
            if (!avaliacao) {
                mainContentWrapperRef.innerHTML = `<p class="feedback-message error">Avaliação com ID ${avaliacaoId} não encontrada.</p>`;
                return;
            }
            
            const fetchLinkedItems = async (ids, storeName) => {
                if (!ids || ids.length === 0) return [];
                const items = await Promise.all(ids.map(id => dbRef.getItemById(storeName, id)));
                return items.filter(Boolean);
            };

            const [srf, uf, documentos, contribuintes, recursos, outrasAvaliacoes] = await Promise.all([
                dbRef.getItemById('itcdConfiguracoesStore', 'srfCidades').then(c => c?.value.find(s => s.id === avaliacao.dadosFormulario?.srfId)),
                dbRef.getItemById('itcdConfiguracoesStore', 'unidadesFazendarias').then(c => c?.value.find(u => u.id === avaliacao.dadosFormulario?.ufId)),
                fetchLinkedItems(avaliacao.documentosVinculadosIds, dbRef.STORES.DOCUMENTS),
                fetchLinkedItems(avaliacao.contribuintesVinculadosIds, dbRef.STORES.CONTRIBUINTES),
                fetchLinkedItems(avaliacao.recursosVinculadosIds, dbRef.STORES.RECURSOS),
                fetchLinkedItems(avaliacao.vinculosAvaliacoesIds, ITCD_AVALIACOES_STORE)
            ]);

            const renderLinks = (items, storeKey) => {
                if (!items || items.length === 0) return '<p class="text-sm text-gray-500 dark:text-gray-400">Nenhum.</p>';
                const config = window.SEFWorkStation.EntityConfig.getConfigByStoreName(storeKey);
                if (!config) return '<p class="text-sm text-red-500 dark:text-red-400">Erro de configuração para esta entidade.</p>';
                
                return `<ul class="list-disc list-inside">${items.map(item => {
                    const displayName = item[config.displayField] || item.id;
                    const kebabCaseDataKey = config.dataKey.replace(/([A-Z])/g, (g) => `-${g[0].toLowerCase()}`);
                    return `<li><a href="#" class="link" data-action="${config.viewAction}" data-${kebabCaseDataKey}="${item.id}">${displayName}</a></li>`
                }).join('')}</ul>`;
            };
            
            let dadosImovelHtml = '';
            let dadosCalculoHtml = '';
            let tipoAvaliacaoLabel = '';

            if (avaliacao.tipo === 'imovel-rural') {
                dadosImovelHtml = renderDadosImovelRural(avaliacao.dadosFormulario);
                dadosCalculoHtml = renderDadosCalculoRural(avaliacao.dadosCalculados);
                tipoAvaliacaoLabel = 'Imóvel Rural';
            } else if (avaliacao.tipo === 'semovente') {
                dadosImovelHtml = renderDadosSemovente(avaliacao.dadosFormulario);
                dadosCalculoHtml = renderDadosCalculoSemovente(avaliacao.dadosCalculados, avaliacao.dadosFormulario);
                tipoAvaliacaoLabel = 'Semoventes';
            } else { // Padrão para urbano
                dadosImovelHtml = renderDadosImovelUrbano(avaliacao.dadosFormulario);
                dadosCalculoHtml = renderDadosCalculoUrbano(avaliacao.dadosCalculados);
                tipoAvaliacaoLabel = 'Imóvel Urbano';
            }

            mainContentWrapperRef.innerHTML = `
                <div id="view-avaliacao-container" class="page-section max-w-none px-4 sm:px-6 lg:px-8">
                    <div class="flex justify-between items-center mb-4 section-not-for-print">
                        <h2 class="text-2xl font-semibold dark:text-gray-100">Detalhes da Avaliação: ${avaliacao.declaracao || avaliacao.id}</h2>
                         <div class="actions-group flex flex-wrap gap-2">
                            <button id="btn-voltar-view-aval" class="btn-secondary btn-sm">Voltar</button>
                            <button id="btn-duplicar-avaliacao-view" class="btn-secondary btn-sm">Duplicar</button>
                            <button id="btn-editar-avaliacao-view" class="btn-primary btn-sm">Editar</button>
                            <button id="btn-gerar-parecer-view" class="btn-primary bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 btn-sm">Gerar Parecer</button>
                        </div>
                    </div>

                    <div id="parecer-content-wrapper" class="space-y-6">
                        <div class="card">
                            <h3 class="card-header dark:text-gray-200">Identificação</h3>
                            <dl class="card-dl">
                                <div class="info-item"><dt class="dark:text-gray-400">DBD:</dt><dd class="dark:text-gray-200">${avaliacao.declaracao || 'N/A'}</dd></div>
                                <div class="info-item"><dt class="dark:text-gray-400">Data da Avaliação:</dt><dd class="dark:text-gray-200">${formatDate(avaliacao.dataAvaliacao)}</dd></div>
                                <div class="info-item"><dt class="dark:text-gray-400">SRF:</dt><dd class="dark:text-gray-200">${srf?.nome || avaliacao.dadosFormulario?.srfNome || 'N/A'}</dd></div>
                                <div class="info-item"><dt class="dark:text-gray-400">UF:</dt><dd class="dark:text-gray-200">${uf?.nome || 'N/A'}</dd></div>
                                <div class="info-item col-span-2"><dt class="dark:text-gray-400">Responsável:</dt><dd class="dark:text-gray-200">${avaliacao.responsavelNome} (MASP: ${avaliacao.responsavelMasp})</dd></div>
                            </dl>
                        </div>

                         <div class="card">
                            <h3 class="card-header dark:text-gray-200">Dados da Avaliação de ${tipoAvaliacaoLabel}</h3>
                            ${dadosImovelHtml}
                        </div>
                        
                         <div class="card">
                            <h3 class="card-header dark:text-gray-200">Resultados da Avaliação</h3>
                            ${dadosCalculoHtml}
                        </div>

                        <div class="card">
                             <h3 class="card-header dark:text-gray-200">Itens Vinculados</h3>
                             <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><h4 class="font-semibold text-sm dark:text-gray-200">Contribuintes:</h4>${renderLinks(contribuintes, dbRef.STORES.CONTRIBUINTES)}</div>
                                <div><h4 class="font-semibold text-sm dark:text-gray-200">Documentos:</h4>${renderLinks(documentos, dbRef.STORES.DOCUMENTS)}</div>
                                <div><h4 class="font-semibold text-sm dark:text-gray-200">Recursos:</h4>${renderLinks(recursos, dbRef.STORES.RECURSOS)}</div>
                                <div><h4 class="font-semibold text-sm dark:text-gray-200">Outras Avaliações:</h4>${renderLinks(outrasAvaliacoes, ITCD_AVALIACOES_STORE)}</div>
                             </div>
                        </div>
                        <div class="card">
                             <h3 class="card-header dark:text-gray-200">Observação do Avaliador</h3>
                             <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">${avaliacao.dadosFormulario?.observacao || 'Nenhuma observação informada.'}</p>
                        </div>
                    </div>
                </div>
            `;
            
            addEventListenersToView(avaliacao, originatingView);

        } catch (error) {
            console.error("Erro ao carregar avaliação:", error);
            mainContentWrapperRef.innerHTML = `<p class="feedback-message error">Falha ao carregar os detalhes da avaliação: ${error.message}</p>`;
        }
    }

    function renderDadosImovelUrbano(dados) {
        if(!dados) return '<p class="text-sm text-red-500">Dados do formulário não encontrados.</p>';
        return `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                <div class="info-item"><dt class="dark:text-gray-400">Endereço:</dt><dd class="dark:text-gray-200">${dados.endereco || 'N/A'}</dd></div>
                <div class="info-item"><dt class="dark:text-gray-400">Município:</dt><dd class="dark:text-gray-200">${dados.municipio || 'N/A'}</dd></div>
                <div class="info-item"><dt class="dark:text-gray-400">Inscrição:</dt><dd class="dark:text-gray-200">${dados.inscricao || 'N/A'}</dd></div>
                <div class="info-item"><dt class="dark:text-gray-400">Área Terreno:</dt><dd class="dark:text-gray-200">${dados.areaTerreno?.toFixed(2) || '0.00'} m²</dd></div>
                <div class="info-item"><dt class="dark:text-gray-400">Área Construída:</dt><dd class="dark:text-gray-200">${dados.areaConstruida?.toFixed(2) || '0.00'} m²</dd></div>
                <div class="info-item"><dt class="dark:text-gray-400">Área Edícula:</dt><dd class="dark:text-gray-200">${dados.areaEdicula?.toFixed(2) || '0.00'} m²</dd></div>
                <div class="info-item"><dt class="dark:text-gray-400">Tipo Terreno:</dt><dd class="dark:text-gray-200">${dados.tipoTerreno || 'N/A'}</dd></div>
                <div class="info-item"><dt class="dark:text-gray-400">Localização:</dt><dd class="dark:text-gray-200">${dados.localizacao || 'N/A'}</dd></div>
                <div class="info-item"><dt class="dark:text-gray-400">Padrão:</dt><dd class="dark:text-gray-200">${dados.utilizacao} - ${dados.padrao} - ${dados.classificacao}</dd></div>
                <div class="info-item"><dt class="dark:text-gray-400">Conservação:</dt><dd class="dark:text-gray-200">${dados.conservacao || 'N/A'}</dd></div>
                <div class="info-item"><dt class="dark:text-gray-400">Depreciação:</dt><dd class="dark:text-gray-200">${dados.depreciacao || 'N/A'}</dd></div>
                <div class="info-item"><dt class="dark:text-gray-400">É esquina?</dt><dd class="dark:text-gray-200">${dados.esquina ? 'Sim' : 'Não'}</dd></div>
            </div>`;
    }

    function renderDadosImovelRural(dados) {
        if(!dados) return '<p class="text-sm text-red-500">Dados do formulário não encontrados.</p>';
        return `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                <div class="info-item"><dt class="dark:text-gray-400">Nome do Imóvel:</dt><dd class="dark:text-gray-200">${dados.nomeImovel || 'N/A'}</dd></div>
                <div class="info-item"><dt class="dark:text-gray-400">Município:</dt><dd class="dark:text-gray-200">${dados.municipio || 'N/A'}</dd></div>
                <div class="info-item"><dt class="dark:text-gray-400">Coordenadas:</dt><dd class="dark:text-gray-200">${dados.coordenadas || 'N/A'}</dd></div>
                <div class="info-item"><dt class="dark:text-gray-400">Área Total (ha):</dt><dd class="dark:text-gray-200">${dados.areaHa?.toFixed(4) || '0.0000'}</dd></div>
                <div class="info-item"><dt class="dark:text-gray-400">Tipo de Imóvel:</dt><dd class="dark:text-gray-200">${dados.tipoImovel || 'N/A'}</dd></div>
                <div class="info-item"><dt class="dark:text-gray-400">Localização:</dt><dd class="dark:text-gray-200">${dados.localizacao || 'N/A'}</dd></div>
                <div class="info-item"><dt class="dark:text-gray-400">Recursos Hídricos:</dt><dd class="dark:text-gray-200">${dados.recursosHidricos ? 'Sim' : 'Não'}</dd></div>
                <div class="info-item"><dt class="dark:text-gray-400">Qualidade da Terra:</dt><dd class="dark:text-gray-200">${dados.qualidadeTerra || 'N/A'}</dd></div>
            </div>`;
    }

    function renderDadosSemovente(dados) {
        if(!dados) return '<p class="text-sm text-red-500">Dados do formulário não encontrados.</p>';
        const mesNome = getMonthName(dados.fatoGeradorMes);
        return `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                <div class="info-item"><dt class="dark:text-gray-400">CPF do Produtor:</dt><dd class="dark:text-gray-200">${dados.cpfProdutor || 'N/A'}</dd></div>
                <div class="info-item"><dt class="dark:text-gray-400">Inscrição de Produtor:</dt><dd class="dark:text-gray-200">${dados.inscricaoProdutor || 'N/A'}</dd></div>
                <div class="info-item"><dt class="dark:text-gray-400">Mês/Ano da Pauta:</dt><dd class="dark:text-gray-200">${mesNome.charAt(0).toUpperCase() + mesNome.slice(1)} de ${dados.fatoGeradorAno || 'N/A'}</dd></div>
            </div>`;
    }

    function renderDadosCalculoUrbano(dados) {
        if(!dados) return '<p class="text-sm text-red-500">Dados de cálculo não encontrados.</p>';
        return `
             <dl class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                <div class="info-item-lg col-span-full"><dt class="dark:text-gray-200">VALOR TOTAL AVALIADO:</dt><dd class="text-red-600 dark:text-red-400">${formatBRL(dados.maiorValorBRL)}</dd></div>
                <div class="info-item"><dt class="dark:text-gray-400">Avaliação do Terreno:</dt><dd class="dark:text-gray-200">${formatBRL(dados.avaliacaoTerreno * dados.fracaoIdeal)}</dd></div>
                <div class="info-item"><dt class="dark:text-gray-400">Avaliação da Construção:</dt><dd class="dark:text-gray-200">${formatBRL(dados.valorTotalConstrucao)}</dd></div>
                <div class="info-item"><dt class="dark:text-gray-400">Fração Ideal:</dt><dd class="dark:text-gray-200">${dados.fracaoIdeal?.toFixed(6) || '1.000000'}</dd></div>
                <div class="info-item"><dt class="dark:text-gray-400">Valor Avaliação (UFEMG):</dt><dd class="dark:text-gray-200">${formatUfemg(dados.valorAvaliacaoEmUfemg)}</dd></div>
                <div class="info-item"><dt class="dark:text-gray-400">Valor Declarado (UFEMG):</dt><dd class="dark:text-gray-200">${formatUfemg(dados.valorDeclaradoEmUfemg)}</dd></div>
                <div class="info-item"><dt class="dark:text-gray-400">Valor IPTU (UFEMG):</dt><dd class="dark:text-gray-200">${formatUfemg(dados.valorIptuEmUfemg)}</dd></div>
                <div class="info-item font-bold col-span-full"><dt class="dark:text-gray-200">MAIOR VALOR (UFEMG):</dt><dd class="dark:text-gray-200">${formatUfemg(dados.maiorValorUfemg)} (${dados.fonteMaiorValor || 'N/A'})</dd></div>
            </dl>`;
    }

    function renderDadosCalculoRural(dados) {
        if(!dados) return '<p class="text-sm text-red-500">Dados de cálculo não encontrados.</p>';
        return `
             <dl class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                <div class="info-item-lg col-span-full"><dt class="dark:text-gray-200">VALOR FINAL PARA O ITCD:</dt><dd class="text-red-600 dark:text-red-400">${formatBRL(dados.valorFinalAvaliacao)}</dd></div>
                <div class="info-item"><dt class="dark:text-gray-400">Valor Avaliação (UFEMG):</dt><dd class="dark:text-gray-200">${formatUfemg(dados.avaliacaoUfemg)}</dd></div>
                <div class="info-item"><dt class="dark:text-gray-400">Valor Declarado (UFEMG):</dt><dd class="dark:text-gray-200">${formatUfemg(dados.valorDeclaradoUfemg)}</dd></div>
                 <div class="info-item font-bold col-span-full"><dt class="dark:text-gray-200">MAIOR VALOR (UFEMG):</dt><dd class="dark:text-gray-200">${formatUfemg(Math.max(dados.avaliacaoUfemg, dados.valorDeclaradoUfemg))} (${dados.origemValorFinal || 'N/A'})</dd></div>
            </dl>`;
    }

    function renderDadosCalculoSemovente(dadosCalculados, dadosFormulario) {
        if (!dadosCalculados || !dadosFormulario) return '<p class="text-sm text-red-500">Dados de cálculo não encontrados.</p>';
        
        const tableRows = CATEGORIAS_SEMOVENTES.map(cat => {
            const quantidade = dadosFormulario.quantidades?.[cat.key] || 0;
            if (quantidade === 0) return '';
            const valorPauta = dadosFormulario.pautaUtilizada?.[cat.key] || 0;
            const totalLinha = quantidade * valorPauta;
            return `
                <tr>
                    <td class="dark:text-gray-200">${cat.label}</td>
                    <td class="text-right dark:text-gray-200">${quantidade}</td>
                    <td class="text-right dark:text-gray-200">${formatBRL(valorPauta)}</td>
                    <td class="text-right font-semibold dark:text-gray-200">${formatBRL(totalLinha)}</td>
                </tr>
            `;
        }).join('');

        return `
            <div class="table-list-container">
                <table class="documentos-table">
                    <thead>
                        <tr>
                            <th>Descrição</th>
                            <th class="text-right">Quantidade</th>
                            <th class="text-right">Valor Pauta</th>
                            <th class="text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>
            <div class="mt-4 pt-4 border-t dark:border-slate-600 flex justify-end">
                <div class="info-item-lg"><dt class="dark:text-gray-200">VALOR TOTAL AVALIADO:</dt><dd class="text-red-600 dark:text-red-400">${formatBRL(dadosCalculados.valorTotal)}</dd></div>
            </div>
        `;
    }

    async function gerarHtmlDoParecerUrbano(avaliacao) {
        const [servidorResponsavel] = await dbRef.getItemsByIndex(dbRef.STORES.SERVIDORES, 'matricula', avaliacao.responsavelMasp);
        const cargoServidor = servidorResponsavel?.cargoFuncao ? `<p>${servidorResponsavel.cargoFuncao}</p>` : '';
        const dadosCalculados = avaliacao.dadosCalculados || {};
        const valorFinalBRL = formatBRL(dadosCalculados.maiorValorBRL);
        const valorFinalUFEMG = formatUfemg(dadosCalculados.maiorValorUfemg);
        
        let textoFonteValor = "o valor de mercado";
        if (dadosCalculados.fonteMaiorValor === 'Valor Declarado') {
            textoFonteValor = "o valor declarado";
        } else if (dadosCalculados.fonteMaiorValor === 'Valor do IPTU') {
            textoFonteValor = "o valor venal do IPTU";
        }
        
        let parecerHtml = `
            <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Parecer de Avaliação - DBD ${avaliacao.declaracao}</title>
            <style>body{font-family:'Times New Roman',Times,serif;font-size:12pt;margin:2cm}h1,h2,h3{text-align:center;margin:1.5em 0}h1{font-size:16pt}h2{font-size:14pt}p{text-align:justify;text-indent:4em;line-height:1.5;margin-bottom:1em}table{width:100%;border-collapse:collapse;margin:2em 0}th,td{border:1px solid #333;padding:6px;text-align:left}th{background-color:#f2f2f2}.signature{text-align:center;margin-top:5em;page-break-inside:avoid}.signature p{text-align:center;text-indent:0;margin:0;line-height:1.2}.no-indent{text-indent:0}</style>
            </head><body>
            <h1>PARECER DE AVALIAÇÃO DE BEM IMÓVEL URBANO</h1>
            <p class="no-indent"><strong>DBD Nº:</strong> ${avaliacao.declaracao || 'N/A'}</p>
            <p class="no-indent"><strong>Data da Avaliação:</strong> ${formatDate(avaliacao.dataAvaliacao)}</p>
            <h2>1. INTRODUÇÃO</h2>
            <p>${(avaliacao.dadosFormulario?.metodologiaTexto || 'Metodologia não informada.').replace(/\n/g, '<br>')}</p>
            <h2>2. DADOS DO IMÓVEL</h2>
            <table>
                <tr><th>Campo</th><th>Informação</th></tr>
                <tr><td>Endereço</td><td>${avaliacao.dadosFormulario?.endereco || 'N/A'}</td></tr>
                <tr><td>Inscrição Imobiliária</td><td>${avaliacao.dadosFormulario?.inscricao || 'N/A'}</td></tr>
                <tr><td>Área do Terreno</td><td>${avaliacao.dadosFormulario?.areaTerreno?.toFixed(2) || 'N/A'} m²</td></tr>
                <tr><td>Área Construída Total</td><td>${((avaliacao.dadosFormulario?.areaConstruida || 0) + (avaliacao.dadosFormulario?.areaEdicula || 0)).toFixed(2) || 'N/A'} m²</td></tr>
            </table>
            <h2>3. CÁLCULOS E AVALIAÇÃO</h2>
            <table>
                 <tr><th>Componente</th><th>Valor</th></tr>
                 <tr><td>Avaliação do Terreno</td><td>${formatBRL(dadosCalculados.avaliacaoTerreno * dadosCalculados.fracaoIdeal)}</td></tr>
                 <tr><td>Avaliação da Construção</td><td>${formatBRL(dadosCalculados.valorTotalConstrucao)}</td></tr>
                 <tr><td><strong>VALOR TOTAL DA AVALIAÇÃO</strong></td><td><strong>${formatBRL(dadosCalculados.valorTotalAvaliacao)}</strong></td></tr>
            </table>
             <p class="no-indent">Valores em UFEMG (ref. ${new Date(avaliacao.dataAvaliacao).getFullYear()}):<br>
                - Valor Avaliado: ${formatUfemg(dadosCalculados.valorAvaliacaoEmUfemg)}<br>
                - Valor Declarado: ${formatUfemg(dadosCalculados.valorDeclaradoEmUfemg)}<br>
                - Valor IPTU: ${formatUfemg(dadosCalculados.valorIptuEmUfemg)}<br>
                - <strong>Maior Valor: ${valorFinalUFEMG}</strong>
             </p>
            <h2>4. CONCLUSÃO</h2>
            <p>Diante do exposto, e com base na metodologia aplicada e nos dados coletados, conclui-se que o valor do bem imóvel para fins de apuração da base de cálculo do ITCD é de <strong>${valorFinalBRL}</strong> (correspondente a ${valorFinalUFEMG} UFEMG), por ser este <strong>${textoFonteValor}</strong> o maior valor encontrado na comparação entre o valor de mercado, o valor declarado e o valor venal do IPTU, em conformidade com a legislação vigente.</p>
            <div class="signature">
                <p>_________________________________________</p>
                <p>${avaliacao.responsavelNome || 'Nome do Responsável'}</p>${cargoServidor}<p>MASP: ${avaliacao.responsavelMasp || 'MASP não informado'}</p>
            </div>
            </body></html>
        `;
        return parecerHtml;
    }
    
    async function gerarHtmlDoParecerRural(avaliacao) {
        const [servidorResponsavel] = await dbRef.getItemsByIndex(dbRef.STORES.SERVIDORES, 'matricula', avaliacao.responsavelMasp);
        const cargoServidor = servidorResponsavel?.cargoFuncao ? `<p>${servidorResponsavel.cargoFuncao}</p>` : '';
        const dados = avaliacao.dadosFormulario;
        const calc = avaliacao.dadosCalculados || {};
        const valorFinalBRL = formatBRL(calc.valorFinalAvaliacao);
        const maiorValorUfemg = Math.max(calc.avaliacaoUfemg, calc.valorDeclaradoUfemg);
        const valorFinalUFEMG = formatUfemg(maiorValorUfemg);
        
        let textoFonteValor = "o valor de mercado da avaliação";
        if (calc.origemValorFinal === 'Valor Declarado') {
            textoFonteValor = "o valor declarado";
        }
        
        let parecerHtml = `
            <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Parecer de Avaliação - DBD ${avaliacao.declaracao}</title>
            <style>body{font-family:'Times New Roman',Times,serif;font-size:12pt;margin:2cm}h1,h2,h3{text-align:center;margin:1.5em 0}h1{font-size:16pt}h2{font-size:14pt}p{text-align:justify;text-indent:4em;line-height:1.5;margin-bottom:1em}table{width:100%;border-collapse:collapse;margin:2em 0}th,td{border:1px solid #333;padding:6px;text-align:left}th{background-color:#f2f2f2}.signature{text-align:center;margin-top:5em;page-break-inside:avoid}.signature p{text-align:center;text-indent:0;margin:0;line-height:1.2}.no-indent{text-indent:0}</style>
            </head><body>
            <h1>PARECER DE AVALIAÇÃO DE BEM IMÓVEL RURAL</h1>
            <p class="no-indent"><strong>DBD Nº:</strong> ${avaliacao.declaracao || 'N/A'}</p>
            <p class="no-indent"><strong>Data da Avaliação:</strong> ${formatDate(avaliacao.dataAvaliacao)}</p>
            <h2>1. INTRODUÇÃO</h2>
            <p>${(dados?.metodologiaTexto || 'Metodologia não informada.').replace(/\n/g, '<br>')}</p>
            <h2>2. DADOS DO IMÓVEL</h2>
            <table>
                <tr><td>Nome do Imóvel</td><td>${dados.nomeImovel || 'N/A'}</td></tr>
                <tr><td>Município</td><td>${dados.municipio || 'N/A'}</td></tr>
                <tr><td>Área (ha)</td><td>${dados.areaHa?.toFixed(4) || 'N/A'}</td></tr>
                <tr><td>Tipo de Imóvel</td><td>${dados.tipoImovel || 'N/A'}</td></tr>
                <tr><td>Localização</td><td>${dados.localizacao || 'N/A'}</td></tr>
            </table>
            <h2>3. CÁLCULOS E AVALIAÇÃO</h2>
            <table>
                 <tr><th>Componente</th><th>Valor</th></tr>
                 <tr><td>Valor da Terra Nua</td><td>${formatBRL(calc.valorTerra)}</td></tr>
                 <tr><td>Valor de Culturas (ITR)</td><td>${formatBRL(calc.culturasITR)}</td></tr>
                 <tr><td>Valor de Benfeitorias (ITR)</td><td>${formatBRL(calc.benfeitoriasITR)}</td></tr>
                 <tr><td><strong>VALOR TOTAL DA AVALIAÇÃO</strong></td><td><strong>${formatBRL(calc.avaliacaoImovel)}</strong></td></tr>
            </table>
             <p class="no-indent">Valores em UFEMG (ref. ${new Date(avaliacao.dataAvaliacao).getFullYear()}):<br>
                - Valor Avaliado: ${formatUfemg(calc.avaliacaoUfemg)}<br>
                - Valor Declarado: ${formatUfemg(calc.valorDeclaradoUfemg)}<br>
             </p>
            <h2>4. CONCLUSÃO</h2>
            <p>Diante do exposto, conclui-se que o valor do bem imóvel rural para fins de apuração da base de cálculo do ITCD é de <strong>${valorFinalBRL}</strong> (correspondente a ${valorFinalUFEMG} UFEMG), por ser este <strong>${textoFonteValor}</strong> o maior valor encontrado na comparação entre o valor avaliado e o valor declarado, em conformidade com a legislação vigente.</p>
            <div class="signature">
                <p>_________________________________________</p>
                <p>${avaliacao.responsavelNome || 'Nome do Responsável'}</p>${cargoServidor}<p>MASP: ${avaliacao.responsavelMasp || 'MASP não informado'}</p>
            </div>
            </body></html>
        `;
        return parecerHtml;
    }

    async function gerarHtmlDoParecerSemovente(avaliacao) {
        const [servidorResponsavel] = await dbRef.getItemsByIndex(dbRef.STORES.SERVIDORES, 'matricula', avaliacao.responsavelMasp);
        const cargoServidor = servidorResponsavel?.cargoFuncao ? `<p>${servidorResponsavel.cargoFuncao}</p>` : '';
        const form = avaliacao.dadosFormulario;
        const calc = avaliacao.dadosCalculados;
        const pautaMesAno = `${getMonthName(form.fatoGeradorMes)}/${form.fatoGeradorAno}`;

        const tableRows = CATEGORIAS_SEMOVENTES.map(cat => {
            const quantidade = form.quantidades?.[cat.key] || 0;
            if (quantidade === 0) return '';
            const valorPauta = form.pautaUtilizada?.[cat.key] || 0;
            const totalLinha = quantidade * valorPauta;
            return `
                <tr>
                    <td>${cat.label}</td>
                    <td style="text-align:right;">${quantidade}</td>
                    <td style="text-align:right;">${formatBRL(valorPauta)}</td>
                    <td style="text-align:right;">${formatBRL(totalLinha)}</td>
                </tr>
            `;
        }).join('');

        let parecerHtml = `
            <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Parecer de Avaliação - DBD ${avaliacao.declaracao}</title>
            <style>body{font-family:'Times New Roman',Times,serif;font-size:12pt;margin:2cm}h1,h2,h3{text-align:center;margin:1.5em 0}h1{font-size:16pt}h2{font-size:14pt}p{text-align:justify;text-indent:4em;line-height:1.5;margin-bottom:1em}table{width:100%;border-collapse:collapse;margin:2em 0}th,td{border:1px solid #333;padding:6px;text-align:left}th{background-color:#f2f2f2}.signature{text-align:center;margin-top:5em;page-break-inside:avoid}.signature p{text-align:center;text-indent:0;margin:0;line-height:1.2}.no-indent{text-indent:0}</style>
            </head><body>
            <h1>PARECER DE AVALIAÇÃO DE SEMOVENTES</h1>
            <p class="no-indent"><strong>DBD Nº:</strong> ${avaliacao.declaracao || 'N/A'}</p>
            <p class="no-indent"><strong>Data da Avaliação:</strong> ${formatDate(avaliacao.dataAvaliacao)}</p>
            <p class="no-indent"><strong>CPF do Produtor:</strong> ${form.cpfProdutor || 'N/A'}</p>
            <p class="no-indent"><strong>Inscrição de Produtor Rural:</strong> ${form.inscricaoProdutor || 'N/A'}</p>
            <h2>1. DADOS DA AVALIAÇÃO</h2>
            <p>A presente avaliação foi realizada com base na pauta de valores de semoventes vigente para o período de referência <strong>${pautaMesAno}</strong>.</p>
            <h2>2. CÁLCULOS E AVALIAÇÃO</h2>
            <table>
                 <thead>
                    <tr>
                        <th>Descrição</th>
                        <th style="text-align:right;">Quantidade</th>
                        <th style="text-align:right;">Valor Pauta</th>
                        <th style="text-align:right;">Total</th>
                    </tr>
                 </thead>
                 <tbody>${tableRows}</tbody>
                 <tfoot>
                    <tr>
                        <th colspan="3" style="text-align:right;">VALOR TOTAL DA AVALIAÇÃO</th>
                        <th style="text-align:right;">${formatBRL(calc.valorTotal)}</th>
                    </tr>
                 </tfoot>
            </table>
            <h2>3. CONCLUSÃO</h2>
            <p>Diante do exposto, e com base na pauta de valores vigente, conclui-se que o valor total dos semoventes para fins de apuração da base de cálculo do ITCD é de <strong>${formatBRL(calc.valorTotal)}</strong>.</p>
            <div class="signature">
                <p>_________________________________________</p>
                <p>${avaliacao.responsavelNome || 'Nome do Responsável'}</p>${cargoServidor}<p>MASP: ${avaliacao.responsavelMasp || 'MASP não informado'}</p>
            </div>
            </body></html>
        `;
        return parecerHtml;
    }

    async function addEventListenersToView(avaliacao, originatingView) {
        document.getElementById('btn-voltar-view-aval')?.addEventListener('click', () => {
            if(appModuleRef && appModuleRef.handleMenuAction) {
                appModuleRef.handleMenuAction(originatingView || 'itcd-gerir-avaliacoes');
            }
        });
        
        document.getElementById('btn-editar-avaliacao-view')?.addEventListener('click', () => {
            appModuleRef.handleMenuAction('itcd-editar-avaliacao', { avaliacaoData: avaliacao });
        });
        
        document.getElementById('btn-duplicar-avaliacao-view')?.addEventListener('click', () => {
             appModuleRef.handleMenuAction('itcd-duplicar-avaliacao', { avaliacaoData: avaliacao });
        });

        document.getElementById('btn-gerar-parecer-view')?.addEventListener('click', async () => {
             uiModuleRef.showLoading(true, "Gerando parecer...");
             try {
                let parecerHtml = '';
                if (avaliacao.tipo === 'imovel-rural') {
                    parecerHtml = await gerarHtmlDoParecerRural(avaliacao);
                } else if (avaliacao.tipo === 'semovente') {
                    parecerHtml = await gerarHtmlDoParecerSemovente(avaliacao);
                } else {
                    parecerHtml = await gerarHtmlDoParecerUrbano(avaliacao);
                }
                const printWindow = window.open('', '_blank');
                printWindow.document.write(parecerHtml);
                printWindow.document.close();
                setTimeout(() => {
                    try { printWindow.print(); } 
                    catch (e) {
                         console.error("Erro ao tentar imprimir:", e);
                         uiModuleRef.showToastNotification("Falha ao abrir janela de impressão. Verifique se o bloqueador de pop-ups está desativado.", "error");
                    }
                }, 500);
             } catch(e) {
                uiModuleRef.showToastNotification(`Erro ao gerar parecer: ${e.message}`, "error");
             } finally {
                uiModuleRef.showLoading(false);
             }
        });
    }

    return {
        init,
        renderVisualizarAvaliacaoPage,
        gerarHtmlDoParecerUrbano, 
        gerarHtmlDoParecerRural,
        gerarHtmlDoParecerSemovente, 
    };

})();