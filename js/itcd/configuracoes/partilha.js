// js/itcd/configuracoes/partilha.js - Módulo para a aba de Configuração de Regras de Sucessão (ITCD)
// v6.0.0 - REATORADO: Módulo completamente refeito para exibir as regras de sucessão fixas do sistema, conforme a legislação brasileira. A funcionalidade de configuração pelo usuário foi removida.
// v5.0.0 - ADICIONADO: Implementada a funcionalidade para carregar um conjunto de regras de sucessão padrão, baseadas no Código Civil, para facilitar a configuração inicial do usuário.
// ... (histórico anterior)

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ITCD = window.SEFWorkStation.ITCD || {};
window.SEFWorkStation.ITCD.Configuracoes = window.SEFWorkStation.ITCD.Configuracoes || {};

window.SEFWorkStation.ITCD.Configuracoes.Partilha = (function() {

    let uiModuleRef;

    function init(db, app, ui) {
        uiModuleRef = ui;
    }

    async function renderTabContent(containerEl) {
        const tabHtml = `
            <div class="space-y-8" id="partilha-regras-display">
                <p class="text-sm text-gray-600 dark:text-gray-300">
                    Esta seção apresenta um resumo das regras de sucessão e partilha de bens conforme a legislação brasileira vigente, que são aplicadas automaticamente pelo sistema no módulo de cálculo. 
                    Para detalhes sobre um caso específico, consulte sempre a legislação e a jurisprudência aplicável.
                </p>

                <!-- Seção 1: Solteiro ou Viúvo -->
                <div class="section-box p-4 border dark:border-slate-700 rounded-lg">
                    <h3 class="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">1. Transmitente Solteiro, Viúvo ou Divorciado</h3>
                    <div class="table-list-container">
                        <table class="documentos-table">
                            <thead>
                                <tr><th>Situação do Transmitente</th><th>Regra de Partilha</th><th>Observações</th></tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td class="font-semibold">Sem filhos e pais vivos</td>
                                    <td>Bens destinados aos <strong>colaterais até o 4º grau</strong> (irmãos, sobrinhos, tios, primos).</td>
                                    <td>- Irmãos bilaterais herdam o dobro dos unilaterais.<br>- Na ausência de colaterais, a herança é devolvida ao Poder Público.</td>
                                </tr>
                                <tr>
                                    <td class="font-semibold">Com filhos vivos</td>
                                    <td>Os bens são partilhados igualmente entre os <strong>filhos</strong>.</td>
                                    <td>- Filhos são <strong>herdeiros necessários</strong>, excluindo os ascendentes e colaterais.</td>
                                </tr>
                                <tr>
                                    <td class="font-semibold">Com pais vivos (e sem filhos)</td>
                                    <td>Os bens são partilhados igualmente entre os <strong>pais</strong>.</td>
                                    <td>- Pais são <strong>herdeiros necessários</strong>, excluindo os colaterais.<br>- Se apenas um dos pais for vivo, ele herda a totalidade.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Seção 2: Casado - Comunhão Parcial -->
                <div class="section-box p-4 border dark:border-slate-700 rounded-lg">
                    <h3 class="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">2. Transmitente Casado - Regime de Comunhão Parcial</h3>
                    <div class="table-list-container">
                        <table class="documentos-table">
                             <thead>
                                <tr><th>Situação do Transmitente</th><th>Regra de Partilha</th><th>Observações</th></tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td class="font-semibold">Com descendentes</td>
                                    <td>- Cônjuge é <strong>meeiro</strong> nos bens comuns.<br>- Cônjuge <strong>concorre como herdeiro</strong> com os descendentes apenas sobre os bens particulares.</td>
                                    <td>- A jurisprudência majoritária entende que a concorrência se dá somente nos bens particulares.<br>- O cônjuge tem direito a uma quota igual a dos descendentes, com reserva de no mínimo 1/4 da herança se for ascendente de todos.</td>
                                </tr>
                                <tr>
                                    <td class="font-semibold">Com ascendentes (sem descendentes)</td>
                                    <td>- Cônjuge é <strong>meeiro</strong> nos bens comuns.<br>- Cônjuge <strong>concorre como herdeiro</strong> com os ascendentes sobre toda a herança (parte particular e parte do falecido nos comuns).</td>
                                    <td>- Se concorrer com ambos os pais do falecido, o cônjuge recebe 1/3.<br>- Se concorrer com apenas um dos pais ou com avós, o cônjuge recebe 1/2.</td>
                                </tr>
                                 <tr>
                                    <td class="font-semibold">Sem descendentes ou ascendentes</td>
                                    <td>O cônjuge sobrevente <strong>herda a totalidade</strong> da herança (bens comuns e particulares do falecido), excluindo os colaterais.</td>
                                    <td>- O cônjuge torna-se o único herdeiro, além de ser meeiro nos bens comuns.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                 <!-- Seção 3: Casado - Outros Regimes -->
                <div class="section-box p-4 border dark:border-slate-700 rounded-lg">
                    <h3 class="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">3. Transmitente Casado - Outros Regimes de Bens</h3>
                     <div class="table-list-container">
                        <table class="documentos-table">
                             <thead>
                                <tr><th>Regime de Bens</th><th>Regra de Partilha com Descendentes</th><th>Observações</th></tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td class="font-semibold">Comunhão Universal</td>
                                    <td>- Cônjuge é <strong>meeiro</strong> em 50% de todo o patrimônio.<br>- <strong>Não há concorrência</strong> na herança, os 50% restantes são dos descendentes.</td>
                                    <td>- O cônjuge já possui meação sobre todo o patrimônio, por isso não concorre como herdeiro com os descendentes.</td>
                                </tr>
                                <tr>
                                    <td class="font-semibold">Separação Convencional</td>
                                    <td>- Cônjuge <strong>não é meeiro</strong>.<br>- Cônjuge <strong>concorre como herdeiro</strong> com os descendentes sobre a totalidade da herança.</td>
                                    <td>- Entendimento majoritário do STJ (REsp 1.382.170/MG). O cônjuge é considerado herdeiro necessário.</td>
                                </tr>
                                <tr>
                                    <td class="font-semibold">Separação Obrigatória</td>
                                    <td>- Cônjuge é <strong>meeiro apenas nos bens adquiridos onerosamente</strong> na constância do casamento (Súmula 377 do STF).<br>- Cônjuge <strong>não concorre como herdeiro</strong> com os descendentes.</td>
                                    <td>- A herança (bens particulares e a meação do falecido nos bens comuns da Súmula 377) é destinada exclusivamente aos descendentes.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- Seção 4: União Estável -->
                 <div class="section-box p-4 border dark:border-slate-700 rounded-lg">
                    <h3 class="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">4. Transmitente em União Estável</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
                        Conforme decisão do STF (RE 878.694), a sucessão na união estável segue as <strong>mesmas regras do casamento</strong>. O regime de bens aplicável é, por padrão, o da <strong>Comunhão Parcial de Bens</strong>, salvo contrato escrito em contrário. Portanto, as regras do item 2 aplicam-se à união estável.
                    </p>
                    <p class="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/50 p-2 rounded">
                        <strong>Observação:</strong> O antigo Art. 1.790 do Código Civil, que previa regras diferentes para a união estável, foi declarado inconstitucional e <strong>não é mais aplicado</strong> pelo sistema.
                    </p>
                </div>
            </div>
        `;
        containerEl.innerHTML = tabHtml;
    }

    function addEventListeners(containerEl) {
        // Esta aba agora é apenas para exibição, sem listeners de formulário.
    }

    return {
        init,
        renderTabContent,
        addEventListeners
    };
})();