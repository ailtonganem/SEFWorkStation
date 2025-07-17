// js/dossieGenerator.js - Módulo unificado para Geração de Dossiês (Contribuinte e ITCD)
// v2.0.0 - UNIFICADO: Incorpora a funcionalidade de gerar dossiês de dados brutos do ITCD por DBD. Refatora a estrutura para lidar com múltiplos tipos de dossiê.
// v1.2.0 - Adiciona Linha do Tempo, Página de Rosto e estrutura de impressão profissional.
// v1.1.0 - Adiciona modal com seleção de seções, filtro de período e opção para incluir conteúdo completo.
// v1.0.0 - Implementação inicial

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.DossieGenerator = (function() {
    let dbRef;
    let appModuleRef;
    let uiModuleRef;

    // Configuração para o Dossiê do Contribuinte
    const ENTITY_CONFIG_CONTRIBUINTE = {
        documents: { label: "Documentos", displayField: "title", dateField: "modificationDate", contentField: "content" },
        tarefasStore: { label: "Tarefas", displayField: "titulo", dateField: "dataModificacao", statusField: "status", contentField: "descricaoDetalhada" },
        recursos: { label: "Recursos", displayField: "titulo", dateField: "dataApresentacao", statusField: "status", contentField: "descricao" },
        protocolosStore: { label: "Protocolos", displayField: "numeroProtocolo", dateField: "dataHoraProtocolo", statusField: "statusProtocolo", contentField: "descricaoDetalhada" },
        ptasStore: { label: "PTAs", displayField: "numeroPTA", dateField: "dataPTA", statusField: "statusPTA", contentField: "descricaoDetalhadaPTA" },
        autuacoesStore: { label: "Autuações", displayField: "numeroAutuacao", dateField: "dataAutuacao", statusField: "statusAutuacao", contentField: "descricaoDetalhadaAutuacao" },
        notasRapidasStore: { label: "Notas Rápidas", displayField: "titulo", dateField: "dataModificacao", contentField: "conteudo" }
    };


    function init(db, app, ui) {
        dbRef = db;
        appModuleRef = app;
        uiModuleRef = ui;
        console.log("DossieGenerator.JS: Módulo unificado inicializado (v2.0.0).");
    }

    /**
     * Ponto de entrada público para gerar um dossiê.
     * @param {string} type - O tipo de dossiê a ser gerado ('contribuinte' ou 'itcd').
     * @param {object} data - Os dados necessários para a geração (ex: { contribuinte: obj } ou { declaracaoNumero: '123' }).
     */
    function abrirModalGeracao(type, data) {
        if (type === 'contribuinte' && data && data.contribuinte) {
            _abrirModalDossieContribuinte(data.contribuinte);
        } else if (type === 'itcd' && data && data.declaracaoNumero) {
            _abrirModalDossieITCD(data.declaracaoNumero);
        } else {
            console.error("DossieGenerator: Tipo de dossiê inválido ou dados insuficientes.", { type, data });
            uiModuleRef.showToastNotification("Não foi possível iniciar a geração do dossiê. Informações inválidas.", "error");
        }
    }

    // --- Lógica para Dossiê do Contribuinte ---

    function _abrirModalDossieContribuinte(contribuinte) {
        const modalId = `modal-dossie-${contribuinte.id}`;
        
        let secoesCheckboxHtml = Object.values(ENTITY_CONFIG_CONTRIBUINTE).map(config => `
            <label class="inline-flex items-center">
                <input type="checkbox" name="dossie-secoes" value="${Object.keys(ENTITY_CONFIG_CONTRIBUINTE).find(key => ENTITY_CONFIG_CONTRIBUINTE[key] === config)}" class="form-checkbox" checked>
                <span class="ml-2 text-sm">${config.label}</span>
            </label>
        `).join('');

        secoesCheckboxHtml += `
            <label class="inline-flex items-center font-semibold">
                <input type="checkbox" name="dossie-secoes" value="timeline" class="form-checkbox" checked>
                <span class="ml-2 text-sm">Linha do Tempo de Eventos</span>
            </label>
        `;

        const modalContentHtml = `
            <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">Personalize o dossiê para <strong>${contribuinte.nome}</strong> selecionando as opções abaixo.</p>
            <div class="space-y-4">
                <div>
                    <h4 class="text-md font-semibold mb-2">Seções a Incluir:</h4>
                    <div class="dossie-options-grid form-checkbox-group">${secoesCheckboxHtml}</div>
                </div>
                <div>
                    <h4 class="text-md font-semibold mb-2">Filtro de Período (Opcional):</h4>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div><label for="dossie-data-inicio" class="block text-xs font-medium">Data de Início:</label><input type="date" id="dossie-data-inicio" class="form-input-text mt-1 block w-full text-sm"></div>
                        <div><label for="dossie-data-fim" class="block text-xs font-medium">Data de Fim:</label><input type="date" id="dossie-data-fim" class="form-input-text mt-1 block w-full text-sm"></div>
                    </div>
                </div>
                <div>
                    <label class="flex items-center"><input type="checkbox" id="dossie-incluir-conteudo" class="form-checkbox"><span class="ml-2 text-sm">Incluir conteúdo completo</span></label>
                </div>
            </div>
        `;

        const modalButtons = [
            { text: 'Cancelar', class: 'btn-secondary', closesModal: true },
            { 
                text: 'Gerar Dossiê HTML', 
                class: 'btn-primary', 
                callback: () => {
                    const secoes = Array.from(document.querySelectorAll('input[name="dossie-secoes"]:checked')).map(cb => cb.value);
                    const dataInicio = document.getElementById('dossie-data-inicio').value;
                    const dataFim = document.getElementById('dossie-data-fim').value;
                    const incluirConteudo = document.getElementById('dossie-incluir-conteudo').checked;
                    _generateDossieContribuinte(contribuinte.id, { secoes, dataInicio, dataFim, incluirConteudo });
                    return true;
                }
            }
        ];
        uiModuleRef.showModal('Opções do Dossiê do Contribuinte', modalContentHtml, modalButtons, 'max-w-2xl', modalId);
    }

    async function _generateDossieContribuinte(contribuinteId, options = {}) {
        uiModuleRef.showLoading(true, "Gerando dossiê do contribuinte...");
        try {
            const contribuinte = await dbRef.getItemById(dbRef.STORES.CONTRIBUINTES, contribuinteId);
            if (!contribuinte) throw new Error("Contribuinte não encontrado.");
            const todosVinculos = await window.SEFWorkStation.SharedUtils.buscarTodosVinculosDeUmaEntidade(contribuinteId, dbRef.STORES.CONTRIBUINTES, dbRef);
            const dossieHtml = await _buildDossieContribuinteHtml(contribuinte, todosVinculos, options);
            const printWindow = window.open('', '_blank');
            printWindow.document.write(dossieHtml);
            printWindow.document.close();
            setTimeout(() => { printWindow.focus(); printWindow.print(); }, 500);
        } catch (error) {
            console.error("DossieGenerator.JS: Erro ao gerar dossiê do contribuinte:", error);
            appModuleRef.showGlobalFeedback(`Falha ao gerar dossiê: ${error.message}`, "error");
        } finally {
            uiModuleRef.showLoading(false);
        }
    }
    
    // --- Lógica para Dossiê do ITCD ---

    function _abrirModalDossieITCD(declaracaoNumero) {
        const modalId = `modal-dossie-itcd-${declaracaoNumero.replace(/[^a-zA-Z0-9]/g, "")}`;
        const modalContentHtml = `
            <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Você está prestes a gerar um dossiê de dados para a DBD <strong>${declaracaoNumero}</strong>.
                Isto criará um arquivo .zip com todas as avaliações e cálculos em formato JSON.
            </p>
            <label class="flex items-center">
                <input type="checkbox" id="dossie-itcd-incluir-anexos" class="form-checkbox" checked>
                <span class="ml-2 text-sm">Incluir anexos físicos (se houver)</span>
            </label>
        `;

        const modalButtons = [
            { text: 'Cancelar', class: 'btn-secondary', closesModal: true },
            { 
                text: 'Gerar Dossiê (.zip)', 
                class: 'btn-primary', 
                callback: () => {
                    const incluirAnexos = document.getElementById('dossie-itcd-incluir-anexos').checked;
                    _generateDossieITCD(declaracaoNumero, { incluirAnexosFisicos: incluirAnexos });
                    return true;
                }
            }
        ];
        uiModuleRef.showModal(`Gerar Dossiê de Dados ITCD`, modalContentHtml, modalButtons, 'max-w-lg', modalId);
    }
    
    async function _generateDossieITCD(declaracaoNumero, options = {}) {
        const { incluirAnexosFisicos = true } = options;
        if (typeof JSZip === 'undefined') {
            uiModuleRef.showToastNotification("Biblioteca de compactação (JSZip) não está disponível.", "error");
            return;
        }

        uiModuleRef.showLoading(true, `Gerando dossiê para a DBD ${declaracaoNumero}...`);
        try {
            const [avaliacoes, calculos] = await Promise.all([
                dbRef.getItemsByIndex('itcdAvaliacoesStore', 'declaracao', declaracaoNumero),
                dbRef.getItemsByIndex('itcdCalculosStore', 'declaracaoNumero', declaracaoNumero)
            ]);

            if (avaliacoes.length === 0 && calculos.length === 0) {
                uiModuleRef.showToastNotification(`Nenhum dado encontrado para a DBD ${declaracaoNumero}.`, "info");
                return;
            }

            const zip = new JSZip();
            const sanitizedDbd = declaracaoNumero.replace(/[\\/:*?"<>|]/g, '_');
            const dossieFolder = zip.folder(`DOSSIE_ITCD_${sanitizedDbd}`);
            const attachmentPaths = new Set();
            
            avaliacoes.forEach(a => {
                dossieFolder.file(`avaliacao_${a.id}.json`, JSON.stringify(a, null, 2));
                if (incluirAnexosFisicos && a.anexos) a.anexos.forEach(anexo => anexo.filePath && attachmentPaths.add(anexo.filePath));
            });
            calculos.forEach(c => {
                dossieFolder.file(`calculo_${c.id}.json`, JSON.stringify(c, null, 2));
            });

            if (incluirAnexosFisicos && attachmentPaths.size > 0) {
                const appDirHandle = window.SEFWorkStation.State.getDirectoryHandle();
                if (appDirHandle) {
                    const attachmentsFolder = dossieFolder.folder('anexos');
                    for (const path of attachmentPaths) {
                        try {
                            const fileHandle = await appDirHandle.getFileHandle(path, { create: false });
                            attachmentsFolder.file(path.split('/').pop(), await fileHandle.getFile());
                        } catch (e) { console.warn(`Anexo "${path}" não incluído no dossiê: ${e.message}`); }
                    }
                }
            }
            
            const zipBlob = await zip.generateAsync({ type: "blob" });
            const zipFileName = `Dossie_ITCD_${sanitizedDbd}_${new Date().toISOString().split('T')[0]}.zip`;

            const a = document.createElement('a'); a.href = URL.createObjectURL(zipBlob); a.download = zipFileName;
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href);
            
            uiModuleRef.showToastNotification(`Dossiê "${zipFileName}" gerado com sucesso!`, "success");
        } catch (error) {
            console.error("Erro ao gerar dossiê do ITCD:", error);
            uiModuleRef.showToastNotification(`Falha ao gerar dossiê: ${error.message}`, "error", 0);
        } finally {
            uiModuleRef.showLoading(false);
        }
    }


    // --- Funções Privadas para Construção do HTML do Dossiê do Contribuinte ---

    async function _buildTimelineHtml(vinculos, options) {
        let events = [];
        const dataInicio = options.dataInicio ? new Date(options.dataInicio + "T00:00:00") : null;
        const dataFim = options.dataFim ? new Date(options.dataFim + "T23:59:59") : null;
        for (const storeKey in vinculos) {
            if (ENTITY_CONFIG_CONTRIBUINTE[storeKey]) {
                const config = ENTITY_CONFIG_CONTRIBUINTE[storeKey];
                vinculos[storeKey].forEach(item => {
                    const eventDate = new Date(item[config.dateField]);
                    if ((!dataInicio || eventDate >= dataInicio) && (!dataFim || eventDate <= dataFim)) {
                        events.push({ date: eventDate, type: config.label, title: item[config.displayField] });
                    }
                });
            }
        }
        if (events.length === 0) return '';
        events.sort((a, b) => b.date - a.date);
        let html = `<section class="section"><h2>Linha do Tempo de Eventos</h2><div class="timeline-container">`;
        events.forEach(event => {
            html += `<div class="timeline-item"><div class="timeline-dot"></div><div class="timeline-content"><div class="timeline-date">${event.date.toLocaleDateString('pt-BR')}</div><div class="timeline-body"><strong>${event.type}:</strong> ${event.title}</div></div></div>`;
        });
        html += `</div></section>`;
        return html;
    }

    function _renderVinculosSecao(config, items, options) {
        let itensFiltrados = [...items];
        if (options.dataInicio && options.dataFim) {
            const inicio = new Date(options.dataInicio + "T00:00:00");
            const fim = new Date(options.dataFim + "T23:59:59");
            itensFiltrados = itensFiltrados.filter(item => {
                const dataItem = new Date(item[config.dateField]);
                return dataItem >= inicio && dataItem <= fim;
            });
        }
        if (itensFiltrados.length === 0) return '';
        itensFiltrados.sort((a, b) => new Date(b[config.dateField]) - new Date(a[config.dateField]));
        const showdownConverter = (typeof showdown !== 'undefined') ? new showdown.Converter({ simplifiedAutoLink: true, openLinksInNewWindow: true }) : null;
        let html = `<section class="section"><h2>${config.label} Vinculados (${itensFiltrados.length})</h2><table><thead><tr><th>${config.displayField}</th><th>Data</th>${config.statusField ? '<th>Status</th>' : ''}</tr></thead><tbody>`;
        itensFiltrados.forEach(item => {
            html += `<tr><td>${item[config.displayField] || 'N/D'}</td><td>${item[config.dateField] ? new Date(item[config.dateField]).toLocaleDateString('pt-BR') : 'N/A'}</td>${config.statusField ? `<td>${item[config.statusField] || 'N/A'}</td>` : ''}</tr>`;
            if (options.incluirConteudo && item[config.contentField]) {
                html += `<tr><td colspan="${config.statusField ? 3 : 2}"><div class="dossie-embedded-content">${showdownConverter ? showdownConverter.makeHtml(item[config.contentField]) : item[config.contentField].replace(/\n/g, '<br>')}</div></td></tr>`;
            }
        });
        html += `</tbody></table></section>`;
        return html;
    }

    async function _buildDossieContribuinteHtml(contribuinte, vinculos, options) {
        const dataGeracao = new Date().toLocaleString('pt-BR');
        let html = `<!DOCTYPE html><html lang="pt-BR"><head><title>Dossiê: ${contribuinte.nome}</title><style>
            body{font-family:sans-serif;line-height:1.6;margin:0;font-size:10pt;color:#333;background:#fff;}
            .page{width:210mm;min-height:297mm;padding:20mm;margin:10mm auto;border:1px solid #d1d1d1;background:white;box-shadow:0 0 5px rgba(0,0,0,0.1);page-break-after:always;}
            .page:last-child{page-break-after:auto;}
            .dossie-cover-page{display:flex;flex-direction:column;justify-content:center;align-items:center;height:calc(297mm - 40mm);text-align:center;}
            h1{font-size:2.2em;margin:0;} h2{font-size:1.6em;margin:10px 0;}
            .section{margin-bottom:25px;page-break-inside:avoid;} .section h2{font-size:1.4em;color:#1e40af;border-bottom:1px solid #93c5fd;padding-bottom:5px;margin-bottom:15px;}
            dl{display:grid;grid-template-columns:180px 1fr;gap:5px 15px;} dt{font-weight:bold;} dd{margin:0;}
            table{width:100%;border-collapse:collapse;font-size:9pt;margin-top:10px;} th,td{border:1px solid #ccc;padding:6px;text-align:left;vertical-align:top;} th{background-color:#f2f2f2;}
            .dossie-embedded-content{border-top:1px dashed #ccc;padding:8px;margin-top:5px;background:#f9f9f9;}
            .timeline-container{position:relative;padding-left:25px;border-left:2px solid #cbd5e1;}
            .timeline-item{position:relative;margin-bottom:20px;}
            .timeline-dot{position:absolute;left:-32px;top:5px;width:10px;height:10px;background-color:#4299e1;border-radius:50%;}
            .timeline-date{font-size:0.8em;color:#64748b;margin-bottom:4px;}
            .timeline-body{background:#f8fafc;border:1px solid #e2e8f0;padding:10px;border-radius:6px;}
            @media print{body{margin:0;} .page{border:none;box-shadow:none;margin:0;padding:20mm;}}
            </style></head><body>
            <div class="page dossie-cover-page"><h1>Dossiê do Contribuinte</h1><h2>${contribuinte.nome}</h2><p>CPF/CNPJ: ${contribuinte.cpfCnpj||'N/A'}</p><p>Gerado em: ${dataGeracao}</p></div>
            <div class="page">
                <section class="section"><h2>Dados de Identificação</h2><dl><dt>Nome:</dt><dd>${contribuinte.nome||'N/A'}</dd><dt>CPF/CNPJ:</dt><dd>${contribuinte.cpfCnpj||'N/A'}</dd><dt>Categorias:</dt><dd>${(contribuinte.categories||[]).join(', ')||'Nenhuma'}</dd></dl></section>
                ${(options.secoes && options.secoes.includes('timeline')) ? await _buildTimelineHtml(vinculos, options) : ''}
        `;
        if (options.secoes) {
            for (const storeKey of options.secoes) {
                if (vinculos[storeKey] && ENTITY_CONFIG_CONTRIBUINTE[storeKey]) {
                    html += _renderVinculosSecao(ENTITY_CONFIG_CONTRIBUINTE[storeKey], vinculos[storeKey], options);
                }
            }
        }
        html += `</div></body></html>`;
        return html;
    }

    return {
        init,
        abrirModalGeracao
    };
})();