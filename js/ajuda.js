// js/ajuda.js - Lógica do Módulo de Ajuda do SEFWorkStation
// v3.14.0 - CORRIGIDO: Refatora `renderSecaoPrincipal` para buscar conteúdo de forma robusta, corrigindo erros de carregamento para 'Visão Geral' e 'Manual do Usuário'.
// v3.13.0 - CORRIGIDO: Refatora a construção do menu para ser dinâmica a partir do ManualUsuario. Remove lógica de busca de seções inexistentes (FAQ, etc).
// v3.12.11 - Ajusta posicionamento sticky do menu lateral e altura máxima para scroll.
// v3.12.10 - Remove item de menu "Visão Geral" e ajusta seção inicial padrão para "Visão Geral dos Módulos".
// v3.12.9 - Remove blocos de busca para FAQ, Tutoriais e Glossário em realizarBuscaAjuda.
// v3.12.8 - Refina lógica de renderização de seções do manual e adiciona logs finais.
// v3.12.7 - Garante renderização de subseções mesmo sem conteúdoMarkdown raiz na seção do manual.
// ... (histórico anterior)

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.Ajuda = (function() {
    let mainContentWrapperRef;
    let uiModuleRef;
    let appModuleRef;
    let ajudaConteudoRef;
    let manualUsuarioRef;

    const ID_CONTAINER_AJUDA = 'sef-ajuda-container';
    const ID_CONTEUDO_AJUDA_ESPECIFICO = 'sef-ajuda-conteudo-especifico';
    const ID_PESQUISA_AJUDA_INPUT = 'sef-ajuda-pesquisa-input';
    const ID_RESULTADOS_PESQUISA_AJUDA = 'sef-ajuda-resultados-pesquisa';
    const ID_TITULO_PAGINA_AJUDA = 'sef-ajuda-titulo-pagina';
    const ID_MENU_LATERAL_AJUDA_LISTA = 'sef-ajuda-menu-lateral-lista';


    function initAjuda(mainWrapper, uiMod, appMod, conteudoMod) {
        mainContentWrapperRef = mainWrapper;
        uiModuleRef = uiMod;
        appModuleRef = appMod;
        ajudaConteudoRef = conteudoMod;
        manualUsuarioRef = window.SEFWorkStation.ManualUsuario;

        if (!mainContentWrapperRef) console.error("Ajuda.JS: init - mainContentWrapperRef não fornecido.");
        if (!uiModuleRef) console.warn("Ajuda.JS: init - uiModuleRef não disponível.");
        if (!appModuleRef) console.error("Ajuda.JS: init - appModuleRef não fornecido.");
        if (!ajudaConteudoRef) console.error("Ajuda.JS: init - ajudaConteudoRef não fornecido.");
        if (!manualUsuarioRef) console.error("Ajuda.JS: init - manualUsuarioRef (Manual do Usuário) não encontrado ou não carregado antes de ajuda.js.");
    }

    function limparConteudoPrincipal() {
        if (mainContentWrapperRef) {
            mainContentWrapperRef.innerHTML = '';
        }
        const clearFeedbackFunction = (uiModuleRef && uiModuleRef.clearGlobalFeedback) ? uiModuleRef.clearGlobalFeedback : (appModuleRef ? appModuleRef.clearGlobalFeedback : null);

        if (clearFeedbackFunction) {
            clearFeedbackFunction();
        }
    }

    function converterMarkdownParaHtml(markdownTexto) {
        if (typeof showdown !== 'undefined' && typeof markdownTexto === 'string') {
            const converter = new showdown.Converter({
                simplifiedAutoLink: true, strikethrough: true, tables: true, tasklists: true,
                openLinksInNewWindow: true, emoji: true, ghCompatibleHeaderId: true,
                requireSpaceBeforeHeadingText: true, completeHTMLDocument: false,
                parseImgDimensions: true,
                headerLevelStart: 2
            });
            return converter.makeHtml(markdownTexto);
        }
        return markdownTexto || '';
    }

    const htmlToText = (html) => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        return tempDiv.textContent || tempDiv.innerText || "";
    };

    const markdownToTextForSearch = (md) => {
        if (typeof showdown !== 'undefined' && typeof md === 'string') {
             return htmlToText(converterMarkdownParaHtml(md));
        }
        return md || '';
    };

    function realizarBuscaAjuda(termo) {
        const secaoEspecificaContainer = document.getElementById(ID_CONTEUDO_AJUDA_ESPECIFICO);
        const resultadosContainer = document.getElementById(ID_RESULTADOS_PESQUISA_AJUDA);
        const tituloPaginaEl = document.getElementById(ID_TITULO_PAGINA_AJUDA);
        const menuListaEl = document.getElementById(ID_MENU_LATERAL_AJUDA_LISTA);

        if (!resultadosContainer || !ajudaConteudoRef) {
            console.error("Ajuda.JS: Elementos de resultado de busca ou dados de ajuda não encontrados.");
            return;
        }
        if (secaoEspecificaContainer) secaoEspecificaContainer.innerHTML = '';
        resultadosContainer.innerHTML = '';

        if (tituloPaginaEl) tituloPaginaEl.textContent = `Resultados da Busca por: "${termo}"`;
        if(menuListaEl) menuListaEl.querySelectorAll('a[data-secao-ajuda]').forEach(el => el.classList.remove('font-semibold', 'bg-blue-100', 'dark:bg-blue-800', 'text-blue-700', 'dark:text-blue-100', 'border-blue-500'));


        const termoLower = termo.toLowerCase().trim();
        if (!termoLower) {
            resultadosContainer.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400">Digite um termo para pesquisar.</p>';
            const activeMenuItem = menuListaEl ? menuListaEl.querySelector('a.font-semibold') : null;
            const secaoAtivaAnterior = activeMenuItem ? activeMenuItem.dataset.secaoAjuda : 'modulos';
            renderSecaoPrincipal(secaoAtivaAnterior);
            return;
        }

        let encontrados = [];

        // MODIFICADO: Removidos loops para 'faq', 'tutoriais', 'glossario'
        for (const key in ajudaConteudoRef) {
            if (ajudaConteudoRef.hasOwnProperty(key) && key !== 'manualUsuario') {
                const secaoAtual = ajudaConteudoRef[key];
                if (secaoAtual.titulo && secaoAtual.titulo.toLowerCase().includes(termoLower)) {
                    encontrados.push({ titulo: secaoAtual.titulo, linkSecao: secaoAtual.idInterno, subId: secaoAtual.idInterno, tipo: 'Seção de Ajuda' });
                }
                if (secaoAtual.conteudo && htmlToText(secaoAtual.conteudo).toLowerCase().includes(termoLower)) {
                    if (!encontrados.some(e => e.subId === secaoAtual.idInterno)) {
                        encontrados.push({ titulo: secaoAtual.titulo, linkSecao: secaoAtual.idInterno, subId: secaoAtual.idInterno, tipo: 'Seção de Ajuda' });
                    }
                }
                if (secaoAtual.lista && Array.isArray(secaoAtual.lista)) {
                    secaoAtual.lista.forEach(item => {
                        let itemTextContent = (item && (item.nome || "")) + " " + (item && (item.titulo || "")) + " " + (item && (item.descricao || "")) + " " + (item && (item.dica || "")) + markdownToTextForSearch(item && (item.conteudo || ""));
                        if (itemTextContent.toLowerCase().includes(termoLower)) {
                             const subIdParaItem = key === 'dicas' ? `ajuda-dica-${item.id}` : (item.idInterno || item.id);
                             if (!encontrados.some(e => e.subId === subIdParaItem)) {
                                encontrados.push({ titulo: item.nome || item.titulo || (item.dica ? item.dica.substring(0,50)+'...' : 'Tópico'), linkSecao: key, subId: subIdParaItem, tipo: key === 'modulos' ? 'Módulo' : (key === 'dicas' ? 'Dica' : 'Tópico') });
                             }
                        }
                    });
                }

                if (secaoAtual.versoes && Array.isArray(secaoAtual.versoes)) {
                    secaoAtual.versoes.forEach(versao => {
                        const textoVersao = `Versão ${versao.versao} (${versao.data}) ${(versao.novidades || []).join(' ')} ${(versao.correcoes || []).join(' ')}`;
                        const idVersao = `ajuda-versao-${versao.versao.replace(/\./g, '-')}`;
                        if (versao && textoVersao.toLowerCase().includes(termoLower)) {
                             if (!encontrados.some(e => e.subId === idVersao)) {
                                encontrados.push({ titulo: `Versão ${versao.versao}`, linkSecao: 'notas-versao-principal', subId: idVersao, tipo: 'Nota de Versão' });
                             }
                        }
                    });
                }
            }
        }

        if (manualUsuarioRef && manualUsuarioRef.secoes) {
            const manualIdBase = manualUsuarioRef.idInterno || 'manual-usuario-app';
            if (manualUsuarioRef.tituloPrincipal && manualUsuarioRef.tituloPrincipal.toLowerCase().includes(termoLower)) {
                if (!encontrados.some(e => e.linkSecao === 'manual-usuario' && e.subId === manualIdBase)) {
                     encontrados.push({ titulo: manualUsuarioRef.tituloPrincipal, linkSecao: 'manual-usuario', subId: manualIdBase, tipo: 'Manual do Usuário (Principal)' });
                }
            }
            if (manualUsuarioRef.introducao && markdownToTextForSearch(manualUsuarioRef.introducao).toLowerCase().includes(termoLower)) {
                 if (!encontrados.some(e => e.linkSecao === 'manual-usuario' && e.subId === manualIdBase && e.titulo.includes("Introdução"))) {
                    encontrados.push({ titulo: `${manualUsuarioRef.tituloPrincipal} (Introdução)`, linkSecao: 'manual-usuario', subId: manualIdBase, tipo: 'Manual do Usuário' });
                 }
            }
            manualUsuarioRef.secoes.forEach(secao => {
                if (secao && secao.tituloSecaoDisplay && secao.tituloSecaoDisplay.toLowerCase().includes(termoLower)) {
                    const secaoIdDOM = secao.idSecaoDOM;
                    if (!encontrados.some(e => e.subId === secaoIdDOM)) {
                         encontrados.push({ titulo: secao.tituloSecaoDisplay, linkSecao: 'manual-usuario', subId: secaoIdDOM, tipo: 'Manual - Seção Principal' });
                    }
                }
                if (secao && secao.conteudoMarkdown && markdownToTextForSearch(secao.conteudoMarkdown).toLowerCase().includes(termoLower)) {
                    const secaoIdDOM = secao.idSecaoDOM;
                    if (!encontrados.some(e => e.subId === secaoIdDOM && e.tipo.includes('(conteúdo)'))) {
                        encontrados.push({ titulo: `${secao.tituloSecaoDisplay} (Conteúdo)`, linkSecao: 'manual-usuario', subId: secaoIdDOM, tipo: 'Manual - Seção Principal (conteúdo)' });
                    }
                }
                if (secao && secao.subsecoes && Array.isArray(secao.subsecoes)) {
                    secao.subsecoes.forEach(sub => {
                        const subSecaoIdDOM = sub.idSubSecaoDOM;
                        const tituloCompletoSub = `${secao.tituloSecaoDisplay} > ${sub.tituloSubsecaoDisplay}`;
                        if (sub && sub.tituloSubsecaoDisplay && sub.tituloSubsecaoDisplay.toLowerCase().includes(termoLower)) {
                             if (!encontrados.some(e => e.subId === subSecaoIdDOM)) {
                                encontrados.push({ titulo: tituloCompletoSub, linkSecao: 'manual-usuario', subId: subSecaoIdDOM, tipo: 'Manual - Subseção' });
                             }
                        }
                        if (sub && sub.conteudoMarkdown && markdownToTextForSearch(sub.conteudoMarkdown).toLowerCase().includes(termoLower)) {
                             if (!encontrados.some(e => e.subId === subSecaoIdDOM && e.tipo.includes('(conteúdo)'))) {
                                encontrados.push({ titulo: `${tituloCompletoSub} (Conteúdo)`, linkSecao: 'manual-usuario', subId: subSecaoIdDOM, tipo: 'Manual - Subseção (conteúdo)' });
                             }
                        }
                    });
                }
            });
        }

        const unicosFinais = [];
        const mapFinais = new Map();
        for (const item of encontrados) {
            const chave = `${item.linkSecao}-${item.subId}`;
            if (!mapFinais.has(chave)) {
                mapFinais.set(chave, true);
                unicosFinais.push(item);
            }
        }
        encontrados = unicosFinais;


        if (encontrados.length > 0) {
            let resultadosHtml = '<ul class="space-y-3">';
            encontrados.forEach(res => {
                const subIdParaLink = res.subId || res.linkSecao;
                resultadosHtml += `
                    <li class="p-3 border dark:border-slate-600 rounded-md bg-white dark:bg-slate-700/80 hover:bg-gray-50 dark:hover:bg-slate-700">
                        <a href="#" data-secao-ajuda-resultado="${res.linkSecao}" data-sub-id-resultado="${subIdParaLink}" class="font-medium text-blue-600 dark:text-blue-400 hover:underline">${res.titulo}</a>
                        <p class="text-xs text-gray-500 dark:text-gray-400">Em: ${res.tipo}</p>
                    </li>
                `;
            });
            resultadosHtml += '</ul>';
            resultadosContainer.innerHTML = resultadosHtml;

            resultadosContainer.querySelectorAll('a[data-secao-ajuda-resultado]').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const secao = e.currentTarget.dataset.secaoAjudaResultado;
                    const subId = e.currentTarget.dataset.subIdResultado;
                    renderSecaoPrincipal(secao, subId);
                });
            });

        } else {
            resultadosContainer.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400">Nenhum resultado encontrado para sua busca.</p>';
        }
    }

    function renderSecaoPrincipal(idSecao, subIdParaScroll = null) {
        const secaoEspecificaContainer = document.getElementById(ID_CONTEUDO_AJUDA_ESPECIFICO);
        const resultadosPesquisaContainer = document.getElementById(ID_RESULTADOS_PESQUISA_AJUDA);
        const pesquisaInput = document.getElementById(ID_PESQUISA_AJUDA_INPUT);
        const tituloPaginaEl = document.getElementById(ID_TITULO_PAGINA_AJUDA);
        const menuListaEl = document.getElementById(ID_MENU_LATERAL_AJUDA_LISTA);

        if (pesquisaInput && !subIdParaScroll) pesquisaInput.value = '';
        if (resultadosPesquisaContainer && !subIdParaScroll) resultadosPesquisaContainer.innerHTML = '';

        if (!secaoEspecificaContainer || !ajudaConteudoRef) {
            console.error("Ajuda.JS: Elemento de conteúdo específico (ID: " + ID_CONTEUDO_AJUDA_ESPECIFICO + ") ou dados de ajuda não encontrados.");
            return;
        }
        secaoEspecificaContainer.innerHTML = '';

        let htmlConteudoSeccao = '';
        let tituloSecaoPrincipalPagina = "Ajuda";
        let idSecaoParaDOMBase = '';
        const classeBaseConteudo = "prose dark:prose-invert max-w-none";

        // CORREÇÃO: Lógica de busca de dados da seção foi refatorada.
        let secaoDataEncontrada = null;
        if (idSecao === (manualUsuarioRef?.idInterno) || idSecao === 'manual-usuario') {
            secaoDataEncontrada = manualUsuarioRef;
        } else {
            // Procura primeiro por idInterno nas seções de ajudaConteudoRef
            for (const key in ajudaConteudoRef) {
                if (ajudaConteudoRef.hasOwnProperty(key)) {
                    const secao = ajudaConteudoRef[key];
                    if (secao && secao.idInterno === idSecao) {
                        secaoDataEncontrada = secao;
                        break;
                    }
                }
            }
            // Se não encontrou, procura por idSecaoDOM nas seções do manual do usuário
            if (!secaoDataEncontrada && manualUsuarioRef && manualUsuarioRef.secoes) {
                secaoDataEncontrada = manualUsuarioRef.secoes.find(s => s && s.idSecaoDOM === idSecao);
            }
        }
        
        if (idSecao === 'notas-versao-principal') {
            secaoDataEncontrada = ajudaConteudoRef.notasVersao;
        }

        if (secaoDataEncontrada) {
            const secaoData = secaoDataEncontrada;
            tituloSecaoPrincipalPagina = secaoData.titulo || secaoData.tituloPrincipal || secaoData.tituloSecaoDisplay || "Detalhes da Ajuda";
            idSecaoParaDOMBase = secaoData.idInterno || secaoData.idSecaoDOM || idSecao;

            if (secaoData.isManualCompleto) {
                let manualHtmlTemp = `<div id="${manualUsuarioRef.idInterno || 'manual-principal-render'}" class="${classeBaseConteudo} leading-relaxed">`;
                if (manualUsuarioRef.introducao) {
                    manualHtmlTemp += converterMarkdownParaHtml(manualUsuarioRef.introducao);
                }
                if (manualUsuarioRef.secoes && manualUsuarioRef.secoes.length > 0) {
                    manualUsuarioRef.secoes.forEach(secaoManual => {
                        if (secaoManual && secaoManual.idSecaoDOM) {
                            const secaoIdDOM = secaoManual.idSecaoDOM;
                            manualHtmlTemp += `<section id="${secaoIdDOM}" class="mt-8 mb-6">`;
                            manualHtmlTemp += `<h2 class="text-2xl font-bold border-b dark:border-slate-600 pb-2 mb-4 !mt-8">${secaoManual.tituloSecaoDisplay}</h2>`;
                            if (secaoManual.conteudoMarkdown) {
                                manualHtmlTemp += converterMarkdownParaHtml(secaoManual.conteudoMarkdown);
                            }
                            if (secaoManual.subsecoes && Array.isArray(secaoManual.subsecoes)) {
                                secaoManual.subsecoes.forEach(sub => {
                                    if (sub && sub.tituloSubsecaoDisplay && sub.idSubSecaoDOM) {
                                        manualHtmlTemp += `<article id="${sub.idSubSecaoDOM}" class="mt-6 mb-4 ml-2 md:ml-4">`;
                                        manualHtmlTemp += `<h3 class="text-xl font-semibold mb-2 !mt-6">${sub.tituloSubsecaoDisplay}</h3>`;
                                        if (sub.conteudoMarkdown) manualHtmlTemp += converterMarkdownParaHtml(sub.conteudoMarkdown);
                                        manualHtmlTemp += `</article>`;
                                    }
                                });
                            }
                            manualHtmlTemp += `</section>`;
                        }
                    });
                }
                 if (appModuleRef && appModuleRef.handleMenuAction) {
                    manualHtmlTemp += `<div class="mt-8 pt-4 border-t dark:border-slate-600 text-center not-prose"><button id="btn-enviar-manual-email" class="btn-secondary text-sm py-1.5 px-3"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-envelope-arrow-up-fill inline-block mr-1.5 align-text-bottom" viewBox="0 0 16 16"><path d="M.05 3.555A2 2 0 0 1 2 2h12a2 2 0 0 1 1.95 1.555L8 8.414.05 3.555ZM0 4.697v7.104l5.803-3.558L0 4.697ZM6.761 8.83l-6.57 4.026A2 2 0 0 0 2 14h12a2 2 0 0 0 1.808-1.144l-6.57-4.025L8 9.586l-1.239-.757Zm3.436-.586L16 11.803V4.697l-5.803 3.558Z"/><path d="M12.5 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm.354-5.354a.5.5 0 0 0-.708-.708L11.5 10.586V7.5a.5.5 0 0 0-1 0v3.086l-.646-.647a.5.5 0 0 0-.708.708l1.5 1.5a.5.5 0 0 0 .708 0l1.5-1.5Z"/></svg> Enviar Manual por Email</button></div>`;
                }
                manualHtmlTemp += `</div>`;
                htmlConteudoSeccao = manualHtmlTemp;
            } else if (secaoData.idSecaoDOM && Array.isArray(secaoData.subsecoes)) {
                tituloSecaoPrincipalPagina = secaoData.tituloSecaoDisplay || "Detalhes da Ajuda";
                idSecaoParaDOMBase = secaoData.idSecaoDOM || idSecao;
                let secaoRenderizadaHtml = `<div id="${idSecaoParaDOMBase}" class="${classeBaseConteudo} leading-relaxed">`;
                secaoRenderizadaHtml += `<h2 class="text-2xl font-bold border-b dark:border-slate-600 pb-2 mb-4 !mt-8">${secaoData.tituloSecaoDisplay}</h2>`;

                if (secaoData.conteudoMarkdown) {
                    secaoRenderizadaHtml += converterMarkdownParaHtml(secaoData.conteudoMarkdown);
                }

                if (secaoData.subsecoes.length > 0) {
                    secaoData.subsecoes.forEach(sub => {
                        if (sub && sub.tituloSubsecaoDisplay && sub.idSubSecaoDOM) {
                            secaoRenderizadaHtml += `<article id="${sub.idSubSecaoDOM}" class="mt-6 mb-4 ml-2 md:ml-4">`;
                            secaoRenderizadaHtml += `<h3 class="text-xl font-semibold mb-2 !mt-6">${sub.tituloSubsecaoDisplay}</h3>`;
                            if (sub.conteudoMarkdown) secaoRenderizadaHtml += converterMarkdownParaHtml(sub.conteudoMarkdown);
                            secaoRenderizadaHtml += `</article>`;
                        }
                    });
                } else if (!secaoData.conteudoMarkdown) {
                     secaoRenderizadaHtml += "<p class='text-gray-500 dark:text-gray-400'>Nenhum conteúdo disponível para esta seção do manual.</p>";
                }
                secaoRenderizadaHtml += `</div>`;
                htmlConteudoSeccao = secaoRenderizadaHtml;
            }
            else if (secaoData.conteudo) {
                htmlConteudoSeccao = `<div class="${classeBaseConteudo}">${secaoData.conteudo}</div>`;
            } else if (secaoData.lista) {
                 const baseIdItem = idSecao === 'dicas' ? 'ajuda-dica-' : `ajuda-${idSecaoParaDOMBase}-`;
                 const wrapperIdParaLista = idSecaoParaDOMBase;
                 htmlConteudoSeccao = `<div id="${wrapperIdParaLista}" class="${(idSecao === 'dicas' || idSecao === 'glossario') ? 'not-prose' : 'prose dark:prose-invert max-w-none'}"><ul class="space-y-3">`;
                 secaoData.lista.forEach(item => {
                    const itemIdCompleto = `${baseIdItem}${(item.id || item.idInterno || '').toString().replace(/\s+/g, '-')}`;
                    htmlConteudoSeccao += `<li id="${itemIdCompleto}" class="p-3 border dark:border-slate-600 rounded-md ${idSecao === 'dicas' ? 'bg-yellow-50 dark:bg-yellow-700/20 text-yellow-800 dark:text-yellow-200 flex items-start' : 'bg-gray-50 dark:bg-slate-700/50'}">`;
                    if(idSecao === 'dicas') htmlConteudoSeccao += `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-lightbulb-fill mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 16 16"><path d="M2 6a6 6 0 1 1 10.174 4.31c-.203.196-.359.4-.453.619l-.762 1.769A.5.5 0 0 1 10.5 13h-5a.5.5 0 0 1-.46-.802l-.762-1.77a1.964 1.964 0 0 0-.453-.618A5.984 5.984 0 0 1 2 6zm3 8.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1l-.224.447a1 1 0 0 1-.894.553H6.618a1 1 0 0 1-.894-.553L5.5 15a.5.5 0 0 1-.5-.5z"/></svg><span>`;
                    else htmlConteudoSeccao += `<h4 class="font-semibold text-md text-gray-800 dark:text-gray-100">${item.nome}</h4>`;
                    if(item.descricao) htmlConteudoSeccao += `<p class="text-sm text-gray-600 dark:text-gray-300">${item.descricao}</p>`;
                    else if (item.dica) htmlConteudoSeccao += item.dica;
                    else if (item.conteudo) htmlConteudoSeccao += `<div class="text-sm text-gray-600 dark:text-gray-300 prose dark:prose-invert max-w-none">${converterMarkdownParaHtml(item.conteudo)}</div>`;
                    if(idSecao === 'dicas') htmlConteudoSeccao += `</span>`;
                    htmlConteudoSeccao += `</li>`;
                 });
                 htmlConteudoSeccao += `</ul></div>`;
            } else if (idSecao === 'notas-versao-principal' && secaoData.versoes && secaoData.versoes.length > 0) {
                htmlConteudoSeccao = `<div class="space-y-4 not-prose">`;
                [...secaoData.versoes].sort((a,b) => b.versao.localeCompare(a.versao, undefined, {numeric: true})).forEach(versaoInfo => {
                    const versaoIdCompleto = `ajuda-versao-${versaoInfo.versao.replace(/\./g, '-')}`;
                    htmlConteudoSeccao += `<div id="${versaoIdCompleto}" class="p-4 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700/50 shadow"><h4 class="font-semibold text-lg text-gray-800 dark:text-gray-100">Versão ${versaoInfo.versao} <span class="text-sm font-normal text-gray-500 dark:text-gray-400">(${versaoInfo.data})</span></h4>${versaoInfo.novidades && versaoInfo.novidades.length > 0 ? `<h5 class="font-medium text-md mt-3 mb-1 text-green-700 dark:text-green-400">Novidades:</h5><ul class="list-disc list-inside ml-4 text-sm text-gray-600 dark:text-gray-300 space-y-0.5">${versaoInfo.novidades.map(n => `<li>${n}</li>`).join('')}</ul>` : ''}${versaoInfo.correcoes && versaoInfo.correcoes.length > 0 ? `<h5 class="font-medium text-md mt-3 mb-1 text-blue-700 dark:text-blue-400">Correções e Melhorias:</h5><ul class="list-disc list-inside ml-4 text-sm text-gray-600 dark:text-gray-300 space-y-0.5">${versaoInfo.correcoes.map(c => `<li>${c}</li>`).join('')}</ul>` : ''}</div>`;
                });
                htmlConteudoSeccao += `</div>`;
            }
             else {
                htmlConteudoSeccao = "<p class=\"text-gray-600 dark:text-gray-300\">Conteúdo para esta seção não encontrado ou formato não reconhecido.</p>";
            }
        } else {
            htmlConteudoSeccao = "<p class=\"text-red-500\">O conteúdo para esta seção da ajuda não pôde ser carregado. Verifique o console para mais detalhes.</p>";
            idSecaoParaDOMBase = 'erro-ajuda';
            if (tituloPaginaEl) tituloPaginaEl.textContent = "Erro na Ajuda";
        }

        if (tituloPaginaEl && secaoDataEncontrada) tituloPaginaEl.textContent = tituloSecaoPrincipalPagina;

        if(htmlConteudoSeccao.trim() === '') {
             htmlConteudoSeccao = "<p class=\"text-orange-500\">O conteúdo foi encontrado, mas a renderização resultou em vazio. Verifique a lógica de renderização para este tipo de seção.</p>";
        }
        secaoEspecificaContainer.innerHTML = htmlConteudoSeccao;

        if (!secaoDataEncontrada) {
            return;
        }

        let elementoAlvoParaScroll = null;
        if (subIdParaScroll) {
            elementoAlvoParaScroll = document.getElementById(subIdParaScroll);
        } else {
            elementoAlvoParaScroll = document.getElementById(idSecaoParaDOMBase);
            if (!elementoAlvoParaScroll && (idSecao === 'manual-usuario' || idSecao.startsWith('manual-modulo-')) && manualUsuarioRef) {
                elementoAlvoParaScroll = document.getElementById(manualUsuarioRef.idInterno);
            }
        }

        setTimeout(() => {
            if (elementoAlvoParaScroll) {
                const parentDetails = elementoAlvoParaScroll.closest('details');
                if (parentDetails && !parentDetails.open) { parentDetails.open = true; }

                const headerHeight = document.getElementById('app-header')?.offsetHeight || 70;
                const elementoRect = elementoAlvoParaScroll.getBoundingClientRect();
                const absoluteElementTop = elementoRect.top + window.pageYOffset;
                const offsetPosition = absoluteElementTop - headerHeight - 20;

                window.scrollTo({ top: offsetPosition, behavior: 'smooth' });

                elementoAlvoParaScroll.classList.add('anchor-highlight');
                setTimeout(() => elementoAlvoParaScroll.classList.remove('anchor-highlight'), 2500);
            } else {
                const ajudaContainerPrincipal = document.getElementById(ID_CONTAINER_AJUDA);
                if (ajudaContainerPrincipal) ajudaContainerPrincipal.scrollTop = 0;
                else if (secaoEspecificaContainer) secaoEspecificaContainer.parentElement.scrollTop = 0;
            }
        }, 150);

        if (idSecao === 'faq' || idSecao === 'tutoriais' || idSecao === 'glossario') {
            const detailsContentDivs = secaoEspecificaContainer.querySelectorAll('details > div, dl dd');
            detailsContentDivs.forEach(div => {
                if(!div.closest('.not-prose')) {
                    div.classList.remove('prose', 'dark:prose-invert', 'max-w-none');
                    div.classList.add('prose', 'dark:prose-invert', 'max-w-none');
                }
            });
        }

        if (menuListaEl) {
             menuListaEl.querySelectorAll('a[data-secao-ajuda]').forEach(el => el.classList.remove('font-semibold', 'bg-blue-100', 'dark:bg-blue-800', 'text-blue-700', 'dark:text-blue-100', 'border-blue-500', 'border-l-blue-500'));
            const linkAtivo = menuListaEl.querySelector(`a[data-secao-ajuda="${idSecao === 'manual-usuario' && subIdParaScroll && subIdParaScroll !== (manualUsuarioRef ? manualUsuarioRef.idInterno : '') ? subIdParaScroll : idSecao}"]`) || menuListaEl.querySelector(`a[data-secao-ajuda="${idSecao}"]`);

            if (linkAtivo) {
                linkAtivo.classList.add('font-semibold', 'bg-blue-100', 'dark:bg-blue-800', 'text-blue-700', 'dark:text-blue-100', 'border-l-blue-500');
            }
        }

        const btnEnviarEmailManual = document.getElementById('btn-enviar-manual-email');
        if (btnEnviarEmailManual && appModuleRef && appModuleRef.handleMenuAction && manualUsuarioRef) {
             const manualCompletoHtmlParaEmail = secaoEspecificaContainer.querySelector(`#${manualUsuarioRef.idInterno || 'manual-principal-render'}`)?.innerHTML || "Conteúdo do manual não encontrado para e-mail.";
             btnEnviarEmailManual.addEventListener('click', () => {
                const dadosParaCompositor = {
                    assunto: `SEFWorkStation - Manual do Usuário Completo`,
                    corpoHtml: manualCompletoHtmlParaEmail,
                    anexos: [],
                    origem: "manual_usuario_completo",
                    idEntidadeOrigem: manualUsuarioRef.idInterno || "manual-geral",
                    originatingView: `ajuda&secao=manual-usuario`
                };
                appModuleRef.handleMenuAction('escrever-email', dadosParaCompositor);
            });
        }

        const conteudoRenderizado = document.getElementById(ID_CONTEUDO_AJUDA_ESPECIFICO);
        if(conteudoRenderizado) {
            conteudoRenderizado.querySelectorAll('a[href^="#"]').forEach(anchorLink => {
                const href = anchorLink.getAttribute('href');
                if (href && href.length > 1 && href.startsWith('#')) {
                    const targetId = href.substring(1);
                    let isManualAnchor = false;
                    if (manualUsuarioRef && manualUsuarioRef.secoes) {
                        isManualAnchor = manualUsuarioRef.secoes.some(sec =>
                            (sec && sec.idSecaoDOM === targetId) ||
                            (sec && sec.subsecoes && sec.subsecoes.some(sub => sub && sub.idSubSecaoDOM === targetId))
                        );
                    }

                    if (document.getElementById(targetId) || isManualAnchor) {
                        anchorLink.addEventListener('click', (e) => {
                            e.preventDefault();
                            if (isManualAnchor) {
                                mostrarTopicoDeAjuda('manual-usuario', targetId);
                            } else {
                                const targetElement = document.getElementById(targetId);
                                if (targetElement) {
                                    const headerHeight = document.getElementById('app-header')?.offsetHeight || 70;
                                    const elementoRect = targetElement.getBoundingClientRect();
                                    const absoluteElementTop = elementoRect.top + window.pageYOffset;
                                    const offsetPosition = absoluteElementTop - headerHeight - 20;
                                    window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                                    targetElement.classList.add('anchor-highlight');
                                    setTimeout(() => targetElement.classList.remove('anchor-highlight'), 2000);
                                }
                            }
                        });
                    }
                }
            });
        }
    }

    function renderPaginaPrincipalAjuda(dados = null) {
        limparConteudoPrincipal();
        if (!mainContentWrapperRef || !ajudaConteudoRef) {
            console.error("Ajuda.JS: renderPaginaPrincipalAjuda - mainContentWrapperRef ou ajudaConteudoRef não definido.");
            return;
        }
        
        // MODIFICADO: Lógica de construção do menu refeita para ser dinâmica.
        const menuAjudaItens = [];

        // Adiciona o item principal de Módulos se existir
        if (ajudaConteudoRef.modulos && ajudaConteudoRef.modulos.idInterno && ajudaConteudoRef.modulos.titulo) {
            menuAjudaItens.push({ 
                id: ajudaConteudoRef.modulos.idInterno, 
                texto: ajudaConteudoRef.modulos.titulo 
            });
        }
        
        // Adiciona o cabeçalho do Manual do Usuário
        if (manualUsuarioRef && manualUsuarioRef.tituloPrincipal) {
             menuAjudaItens.push({ 
                id: manualUsuarioRef.idInterno || 'manual-usuario', 
                texto: manualUsuarioRef.tituloPrincipal, 
                isSubHeader: true 
            });
        }

        // Adiciona as seções do manual dinamicamente
        if (manualUsuarioRef && Array.isArray(manualUsuarioRef.secoes)) {
            manualUsuarioRef.secoes.forEach(secao => {
                if (secao && secao.idSecaoDOM && secao.tituloSecaoDisplay) {
                    menuAjudaItens.push({ 
                        id: secao.idSecaoDOM, 
                        texto: secao.anchorText || secao.tituloSecaoDisplay 
                    });
                }
            });
        }
        
        // Adiciona outros itens, como Notas de Versão
        if (ajudaConteudoRef.notasVersao && ajudaConteudoRef.notasVersao.idInterno && ajudaConteudoRef.notasVersao.titulo) {
            menuAjudaItens.push({ id: ajudaConteudoRef.notasVersao.idInterno, texto: ajudaConteudoRef.notasVersao.titulo });
        }


        let menuHtml = '';
        menuAjudaItens.forEach(item => {
            if (item && item.texto && item.id) {
                const isSubHeader = item.isSubHeader || false;
                const linkClass = `block p-2 rounded hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 ${isSubHeader ? 'font-bold mt-3 pt-2 text-md border-t dark:border-slate-600' : 'text-sm'}`;

                menuHtml += `<li><a href="#" data-secao-ajuda="${item.id}"
                                   class="${linkClass}">
                                   ${item.texto}
                               </a></li>`;
            }
        });


        const ajudaLayoutHtml = `
            <div id="${ID_CONTAINER_AJUDA}" class="p-4 md:p-6">
                <div class="flex justify-between items-center mb-6">
                    <h1 id="${ID_TITULO_PAGINA_AJUDA}" class="text-2xl font-semibold text-gray-800 dark:text-gray-100">Central de Ajuda SEFWorkStation</h1>
                </div>
                <div class="md:flex md:space-x-6">
                    <aside class="md:w-1/4 mb-6 md:mb-0">
                        
                        <div class="p-3 bg-gray-100 dark:bg-slate-800 rounded-lg shadow sticky top-40">
                            <h3 class="font-semibold text-md mb-3 text-gray-700 dark:text-gray-200">Tópicos de Ajuda</h3>
                            <input type="search" id="${ID_PESQUISA_AJUDA_INPUT}" class="form-input-text w-full mb-3 text-sm" placeholder="Pesquisar na ajuda...">
                            <ul id="${ID_MENU_LATERAL_AJUDA_LISTA}" class="space-y-1 max-h-[calc(100vh-17rem)] overflow-y-auto">
                                ${menuHtml}
                            </ul>
                        </div>
                    </aside>
                    <section class="md:w-3/4">
                        <div id="${ID_RESULTADOS_PESQUISA_AJUDA}" class="mb-4"></div>
                        <div id="${ID_CONTEUDO_AJUDA_ESPECIFICO}" class="p-4 bg-white dark:bg-slate-800 rounded-lg shadow min-h-[300px]">
                            <p class="text-gray-600 dark:text-gray-300">Selecione um tópico no menu à esquerda ou utilize a busca para encontrar informações.</p>
                        </div>
                    </section>
                </div>
            </div>
        `;
        mainContentWrapperRef.innerHTML = ajudaLayoutHtml;

        document.querySelectorAll(`a[data-secao-ajuda]`).forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                if (e.currentTarget && e.currentTarget.dataset) {
                    const secaoId = e.currentTarget.dataset.secaoAjuda;
                    const subId = e.currentTarget.dataset.subIdMenu || null;
                    renderSecaoPrincipal(secaoId, subId);
                }
            });
        });

        const pesquisaInputEl = document.getElementById(ID_PESQUISA_AJUDA_INPUT);
        if (pesquisaInputEl) {
            pesquisaInputEl.addEventListener('input', () => {
                realizarBuscaAjuda(pesquisaInputEl.value);
            });
            pesquisaInputEl.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') e.preventDefault();
            });
        }

        const secaoInicial = dados?.secaoId || 'visao-geral-modulos';
        const subSecaoInicial = dados?.subSecaoId || null;
        renderSecaoPrincipal(secaoInicial, subSecaoInicial);
    }

    function mostrarTopicoDeAjuda(idSecao, subIdParaScroll = null) {
        if (!mainContentWrapperRef) {
            console.error("Ajuda.JS: mostrarTopicoDeAjuda - mainContentWrapperRef não está definido.");
            return;
        }

        const containerAjudaEl = document.getElementById(ID_CONTAINER_AJUDA);
        const isPaginaAjudaJaRenderizada = containerAjudaEl && mainContentWrapperRef.contains(containerAjudaEl);

        let secaoPrincipalParaRenderizar = idSecao;
        let subIdFinal = subIdParaScroll;

        if (idSecao.startsWith('manual-modulo-') || idSecao === 'manual-solucao-problemas' || idSecao === 'manual-dicas-avancadas') {
            secaoPrincipalParaRenderizar = idSecao;
            subIdFinal = subIdParaScroll;
        }
        else if (idSecao === 'manual-usuario' && manualUsuarioRef) {
            secaoPrincipalParaRenderizar = manualUsuarioRef.idInterno || 'manual-usuario-app';
            subIdFinal = subIdParaScroll;
        }

        if (!isPaginaAjudaJaRenderizada) {
            if (appModuleRef && appModuleRef.handleMenuAction) {
                const secaoDestino = secaoPrincipalParaRenderizar === 'visao-geral-modulos' ? 'modulos' : secaoPrincipalParaRenderizar;
                appModuleRef.handleMenuAction('ajuda', { secaoId: secaoDestino, subSecaoId: subIdFinal }, false);
            } else {
                console.error("Ajuda.JS: mostrarTopicoDeAjuda - appModuleRef.handleMenuAction não disponível para renderizar a página de ajuda.");
            }
        } else {
            const secaoDestino = secaoPrincipalParaRenderizar === 'visao-geral-modulos' ? 'modulos' : secaoPrincipalParaRenderizar;
            renderSecaoPrincipal(secaoDestino, subIdFinal);
        }
    }

    return {
        initAjuda,
        renderPaginaPrincipalAjuda,
        mostrarTopicoDeAjuda
    };
})();