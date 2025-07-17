// js/filtros.js - Módulo para Lógica de Filtros do SEFWorkStation
// v12 - Corrige filterDocuments para aplicar showDeleted e showTemplates corretamente.
// v11 - Recebe allDocs como parâmetro nas funções de popular dropdowns.

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.Filtros = (function() {

    let tipoSelectEl;
    let categoriaSelectEl;
    let tagSelectEl;
    let ordenacaoSelectEl;
    let infoFiltrosAtivosEl;
    let localActiveDocumentFiltersRef;

    const DOCUMENT_CATEGORIES_STORE_NAME = 'documentCategories';
    const DOCUMENT_TAGS_STORE_NAME = 'documentTags';


    function initFiltros(
        tipoSelect,
        categoriaSelect,
        tagSelect,
        ordenacaoSelect,
        infoFiltrosAtivosHeaderEl,
        activeFiltersObject,
        applyFiltersCb
    ) {
        tipoSelectEl = tipoSelect;
        categoriaSelectEl = categoriaSelect;
        tagSelectEl = tagSelect;
        ordenacaoSelectEl = ordenacaoSelect;
        infoFiltrosAtivosEl = infoFiltrosAtivosHeaderEl;
        localActiveDocumentFiltersRef = activeFiltersObject;

        if (!tipoSelectEl) console.error("FILTROS.JS: initFiltros - tipoSelectEl não fornecido.");
        if (!categoriaSelectEl) console.error("FILTROS.JS: initFiltros - categoriaSelectEl não fornecido.");
        if (!tagSelectEl) console.warn("FILTROS.JS: initFiltros - tagSelectEl não fornecido (filtro de tag opcional).");
        if (!ordenacaoSelectEl) console.error("FILTROS.JS: initFiltros - ordenacaoSelectEl não fornecido.");
        if (!infoFiltrosAtivosEl) console.error("FILTROS.JS: initFiltros - infoFiltrosAtivosHeaderEl não fornecido.");
        if (!localActiveDocumentFiltersRef) console.error("FILTROS.JS: initFiltros - activeFiltersObject não fornecido.");

        if (localActiveDocumentFiltersRef && localActiveDocumentFiltersRef.ordenacao && ordenacaoSelectEl) {
            ordenacaoSelectEl.value = localActiveDocumentFiltersRef.ordenacao;
        }
        console.log("FILTROS.JS: Módulo de Filtros inicializado (v12).");
    }

    async function populateTipoFilterDropdown(allDocs = []) {
        if (!tipoSelectEl) return;
        const previousValue = tipoSelectEl.value;
        tipoSelectEl.innerHTML = '<option value="">Todos os Tipos</option>';

        try {
            const docsConsiderados = localActiveDocumentFiltersRef && localActiveDocumentFiltersRef.showDeleted ?
                                     allDocs.filter(doc => doc.isDeleted) :
                                     allDocs.filter(doc => !doc.isDeleted && !doc.isTemplate);

            const tipos = new Set();
            docsConsiderados.forEach(doc => {
                if (doc.docType && typeof doc.docType === 'string' && doc.docType.trim() !== '') {
                    tipos.add(doc.docType.trim());
                }
            });
            const sortedTipos = Array.from(tipos).sort((a, b) => a.localeCompare(b));
            sortedTipos.forEach(tipo => {
                const option = document.createElement('option');
                option.value = tipo; option.textContent = tipo;
                tipoSelectEl.appendChild(option);
            });

            if (localActiveDocumentFiltersRef && localActiveDocumentFiltersRef.tipo && tipoSelectEl.querySelector(`option[value="${localActiveDocumentFiltersRef.tipo}"]`)) {
                tipoSelectEl.value = localActiveDocumentFiltersRef.tipo;
            } else if (previousValue && tipoSelectEl.querySelector(`option[value="${previousValue}"]`)) {
                 tipoSelectEl.value = previousValue;
            } else {
                tipoSelectEl.value = "";
            }
        } catch (error) {
            console.error("FILTROS.JS: Erro ao popular filtro de Tipos:", error);
        }
    }

    async function populateCategoriaFilterDropdown(allDocs = []) {
        if (!categoriaSelectEl) return;
        const previousValue = categoriaSelectEl.value;
        categoriaSelectEl.innerHTML = '<option value="">Todas as Categorias</option>';
        const combinedCategorias = new Set();

        try {
            if (window.SEFWorkStation && window.SEFWorkStation.DB && window.SEFWorkStation.DB.getAllItems) {
                const categoriasDaStore = await window.SEFWorkStation.DB.getAllItems(DOCUMENT_CATEGORIES_STORE_NAME);
                if (Array.isArray(categoriasDaStore)) {
                    categoriasDaStore.forEach(cat => {
                        if (cat.name && typeof cat.name === 'string' && cat.name.trim() !== '') {
                            combinedCategorias.add(cat.name.trim());
                        }
                    });
                }
            }

            const docsConsiderados = localActiveDocumentFiltersRef && localActiveDocumentFiltersRef.showDeleted ?
                                     allDocs.filter(doc => doc.isDeleted) :
                                     allDocs.filter(doc => !doc.isDeleted);

            docsConsiderados.forEach(doc => {
                if (doc.categories && Array.isArray(doc.categories)) {
                    doc.categories.forEach(catName => {
                        if (typeof catName === 'string' && catName.trim() !== '') {
                            combinedCategorias.add(catName.trim());
                        }
                    });
                }
            });

            const sortedCategorias = Array.from(combinedCategorias).sort((a, b) => a.localeCompare(b));
            sortedCategorias.forEach(categoriaNome => {
                const option = document.createElement('option');
                option.value = categoriaNome;
                option.textContent = categoriaNome.split('/').map(c => c.trim()).join(' › ');
                categoriaSelectEl.appendChild(option);
            });

            if (localActiveDocumentFiltersRef && localActiveDocumentFiltersRef.categoria && categoriaSelectEl.querySelector(`option[value="${localActiveDocumentFiltersRef.categoria}"]`)) {
                categoriaSelectEl.value = localActiveDocumentFiltersRef.categoria;
            } else if (previousValue && categoriaSelectEl.querySelector(`option[value="${previousValue}"]`)) {
                categoriaSelectEl.value = previousValue;
            } else {
                categoriaSelectEl.value = "";
            }
        } catch (error) {
            console.error("FILTROS.JS: Erro ao popular filtro de Categorias:", error);
        }
    }

    async function populateTagFilterDropdown(allDocs = []) {
        if (!tagSelectEl) return;
        const previousValue = tagSelectEl.value;
        tagSelectEl.innerHTML = '<option value="">Todas as Tags</option>';
        const combinedTags = new Set();

        try {
            if (window.SEFWorkStation && window.SEFWorkStation.DB && window.SEFWorkStation.DB.getAllItems) {
                const tagsDaStore = await window.SEFWorkStation.DB.getAllItems(DOCUMENT_TAGS_STORE_NAME);
                if (Array.isArray(tagsDaStore)) {
                    tagsDaStore.forEach(tag => {
                        if (tag.name && typeof tag.name === 'string' && tag.name.trim() !== '') {
                            combinedTags.add(tag.name.trim());
                        }
                    });
                }
            }

             const docsConsiderados = localActiveDocumentFiltersRef && localActiveDocumentFiltersRef.showDeleted ?
                                     allDocs.filter(doc => doc.isDeleted) :
                                     allDocs.filter(doc => !doc.isDeleted);

            docsConsiderados.forEach(doc => {
                if (doc.tags && Array.isArray(doc.tags)) {
                    doc.tags.forEach(tagName => {
                        if (typeof tagName === 'string' && tagName.trim() !== '') {
                            combinedTags.add(tagName.trim());
                        }
                    });
                }
            });

            const sortedTags = Array.from(combinedTags).sort((a, b) => a.localeCompare(b));
            sortedTags.forEach(tagName => {
                const option = document.createElement('option');
                option.value = tagName;
                option.textContent = tagName;
                tagSelectEl.appendChild(option);
            });

            if (localActiveDocumentFiltersRef && localActiveDocumentFiltersRef.tag && tagSelectEl.querySelector(`option[value="${localActiveDocumentFiltersRef.tag}"]`)) {
                tagSelectEl.value = localActiveDocumentFiltersRef.tag;
            } else if (previousValue && tagSelectEl.querySelector(`option[value="${previousValue}"]`)) {
                tagSelectEl.value = previousValue;
            } else {
                tagSelectEl.value = "";
            }
        } catch (error) {
            console.error("FILTROS.JS: Erro ao popular filtro de Tags:", error);
        }
    }

    function updateActiveFiltersDisplayOnHeader(activeFilters) {
        if (!infoFiltrosAtivosEl) {
            infoFiltrosAtivosEl = document.getElementById('info-filtros-ativos');
            if (!infoFiltrosAtivosEl) return;
        }
        if (!activeFilters) {
            infoFiltrosAtivosEl.textContent = "Filtros: Erro"; return;
        }

        const parts = [];
        if (activeFilters.showDeleted) {
            parts.push("Visualizando: Lixeira");
        }
        if (activeFilters.searchTerm) { parts.push(`Busca: "${activeFilters.searchTerm}"`); }
        if (activeFilters.tipo) { parts.push(`Tipo: ${activeFilters.tipo}`); }
        if (activeFilters.categoria) { parts.push(`Categoria: ${activeFilters.categoria.split('/').map(c => c.trim()).join(' › ')}`); }
        if (activeFilters.tag) { parts.push(`Tag: ${activeFilters.tag}`); }

        if (activeFilters.ordenacao && !(activeFilters.showDeleted && parts.length === 1 && parts[0] === "Visualizando: Lixeira")) {
            parts.push(`Ordem: ${activeFilters.ordenacao === 'recentes' ? 'Mais Recentes' : 'Mais Antigos'}`);
        }

        if (parts.length === 2 && parts[0] === "Visualizando: Lixeira" && parts[1].startsWith("Ordem:")) {
            infoFiltrosAtivosEl.textContent = `Filtros: ${parts[0]}`;
        } else if (parts.length > 0) {
            infoFiltrosAtivosEl.textContent = `Filtros: ${parts.join('; ')}`;
        } else {
            infoFiltrosAtivosEl.textContent = "Filtros: Nenhum";
        }
    }

    /**
     * Filtra e ordena uma lista de documentos com base nos filtros ativos.
     * @param {Array<object>} allDocsToFilter - Lista de documentos a serem filtrados.
     * @param {object} activeFiltersToApply - Objeto com os filtros ativos.
     * @param {boolean} [shouldSort=true] - Se deve ordenar os resultados.
     * @returns {Array<object>} - Lista de documentos filtrados e ordenados.
     */
    function filterDocuments(allDocsToFilter, activeFiltersToApply, shouldSort = true) {
        if (!Array.isArray(allDocsToFilter)) {
            console.warn("FILTROS.JS: filterDocuments - 'allDocsToFilter' não é um array. Retornando [].");
            return [];
        }
        if (!activeFiltersToApply) {
            console.warn("FILTROS.JS: filterDocuments - 'activeFiltersToApply' não fornecido. Retornando todos não deletados e não modelos.");
            return allDocsToFilter.filter(doc => !doc.isDeleted && !doc.isTemplate);
        }

        let filtered = [...allDocsToFilter];

        // Filtro de Lixeira (isDeleted)
        // Se showDeleted é true (lixeira), mostra apenas os deletados.
        // Se showDeleted é false (views normais), mostra apenas os não deletados.
        if (activeFiltersToApply.hasOwnProperty('showDeleted')) {
            filtered = filtered.filter(doc => doc.isDeleted === activeFiltersToApply.showDeleted);
        }

        // Filtro de Modelo (isTemplate)
        // Se showTemplates é true (view de modelos), mostra apenas templates.
        // Se showTemplates é false (view 'gerir'), mostra apenas não templates.
        // Se showTemplates é undefined/null (ex: lixeira, busca global), não filtra por template aqui,
        // permitindo que a view de origem decida ou que a busca seja mais ampla.
        if (activeFiltersToApply.showTemplates === true) {
            filtered = filtered.filter(doc => doc.isTemplate === true);
        } else if (activeFiltersToApply.showTemplates === false) {
            filtered = filtered.filter(doc => doc.isTemplate === false);
        }
        // Se activeFiltersToApply.showTemplates for undefined/null, nenhum filtro de template é aplicado aqui.

        // Filtro de Termo de Busca
        const searchTermLower = activeFiltersToApply.searchTerm ? activeFiltersToApply.searchTerm.toLowerCase().trim() : '';
        if (searchTermLower) {
            filtered = filtered.filter(doc =>
                (doc.title && doc.title.toLowerCase().includes(searchTermLower)) ||
                (doc.reference && doc.reference.toLowerCase().includes(searchTermLower)) ||
                (doc.categories && Array.isArray(doc.categories) && doc.categories.some(cat => cat.toLowerCase().includes(searchTermLower))) ||
                (doc.tags && Array.isArray(doc.tags) && doc.tags.some(tag => tag.toLowerCase().includes(searchTermLower))) ||
                (doc.content && (()=>{const d=document.createElement('div');d.innerHTML=doc.content;return (d.textContent||d.innerText||"").toLowerCase().includes(searchTermLower);})()) ||
                (doc.internalNotes && doc.internalNotes.toLowerCase().includes(searchTermLower))
            );
        }

        // Filtro de Tipo
        if (activeFiltersToApply.tipo) {
            filtered = filtered.filter(doc => doc.docType === activeFiltersToApply.tipo);
        }

        // Filtro de Categoria
        if (activeFiltersToApply.categoria) {
            filtered = filtered.filter(doc => doc.categories && Array.isArray(doc.categories) && doc.categories.includes(activeFiltersToApply.categoria));
        }

        // Filtro de Tag
        if (activeFiltersToApply.tag) {
            filtered = filtered.filter(doc => doc.tags && Array.isArray(doc.tags) && doc.tags.includes(activeFiltersToApply.tag));
        }

        // Ordenação
        if (shouldSort && activeFiltersToApply.ordenacao) {
            filtered.sort((a, b) => {
                const dateA = new Date(a.modificationDate || a.creationDate || 0);
                const dateB = new Date(b.modificationDate || b.creationDate || 0);
                if (activeFiltersToApply.ordenacao === 'recentes') {
                    return dateB - dateA;
                } else { // 'antigos'
                    return dateA - dateB;
                }
            });
        }
        return filtered;
    }

    return {
        initFiltros,
        populateTipoFilterDropdown,
        populateCategoriaFilterDropdown,
        populateTagFilterDropdown,
        updateActiveFiltersDisplayOnHeader,
        filterDocuments
    };
})();