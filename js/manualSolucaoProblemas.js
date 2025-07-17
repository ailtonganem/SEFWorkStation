// js/manualSolucaoProblemas.js - Conteúdo do Manual do Usuário para Solução de Problemas Comuns
// v2.0 - Adicionada seção de solução de problemas específica para o Módulo ITCD.
// v1.2.0 - Conteúdo expandido com mais detalhes e adição de uma seção sobre problemas de compartilhamento.
// v1.1 - Remove numeração do título principal da seção.
// v1.0 - Estrutura inicial e conteúdo de exemplo.

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ManualConteudo = window.SEFWorkStation.ManualConteudo || {};

window.SEFWorkStation.ManualConteudo.SolucaoProblemas = {
    idSecaoDOM: "manual-solucao-problemas",
    tituloSecaoDisplay: "12. Solução de Problemas Comuns",
    anchorText: "Solução de Problemas",
    subsecoes: [
        {
            idSubSecaoDOM: "sp-visao-geral",
            tituloSubsecaoDisplay: "12.1. Diagnósticos Gerais",
            conteudoMarkdown: `
Esta seção visa ajudar a resolver problemas comuns que podem surgir ao usar o SEFWorkStation. Antes de contatar o suporte, verifique se seu problema está listado aqui.

**Procedimentos Gerais de Diagnóstico:**
*   **Recarregue a Aplicação:** Um simples recarregamento da página (pressione F5 ou Ctrl+R / Cmd+R) pode resolver problemas temporários de carregamento ou de estado da interface.
*   **Verifique o Console do Navegador:** Muitos erros ou avisos são registrados no console de desenvolvedor do seu navegador (geralmente acessível pressionando **F12** e clicando na aba "Console"). Essas mensagens podem fornecer pistas importantes sobre a causa raiz de um problema.
*   **Verifique as Permissões da Pasta:** Certifique-se de que a aplicação ainda tem as permissões necessárias para ler e escrever na pasta raiz que você selecionou no primeiro uso.
*   **Verifique o Status no Rodapé:** A linha inferior do cabeçalho mostra o status do Backup, LocalStorage e IndexedDB. Se algum deles indicar um problema, foque a investigação nesse ponto.
*   **Consulte as Notas de Versão:** Verifique se o problema é conhecido e se já foi abordado em uma atualização recente. Isso pode ser feito em **Configurações**.
`
        },
        {
            idSubSecaoDOM: "sp-itcd",
            tituloSubsecaoDisplay: "12.2. Problemas Específicos do Módulo ITCD",
            conteudoMarkdown: `
**Sintoma: Os valores de referência (pauta de m², hectare, CUB) não aparecem ou estão zerados.**
*   **Causa:** Os valores de referência não foram cadastrados para a cidade ou período selecionado.
*   **Solução:**
    1.  Vá em **ITCD > Configurações ITCD**.
    2.  Navegue até a aba correspondente ("Imóvel Urbano", "Imóvel Rural" ou "Semoventes").
    3.  Certifique-se de que os valores de referência para a cidade e/ou período de tempo que você está tentando avaliar foram devidamente preenchidos e salvos. Para Semoventes, cada pauta mensal deve ser cadastrada.

**Sintoma: Não consigo editar as configurações do ITCD (campos desabilitados).**
*   **Causa:** Para proteger os parâmetros de cálculo contra alterações acidentais, as configurações do ITCD são bloqueadas por padrão.
*   **Solução:**
    1.  Na página de **Configurações ITCD**, no topo, clique no botão **"Desbloquear para Editar"**.
    2.  O sistema solicitará uma senha. A edição será habilitada para a sessão atual.

**Sintoma: O resultado do cálculo do imposto parece incorreto.**
*   **Causa Provável 1: Data do Fato Gerador.** O sistema aplica legislações diferentes com base na data do fato gerador. Uma data incorreta levará a um cálculo incorreto.
*   **Solução 1:** Verifique se a **Data do Fato Gerador** (data do óbito, do ato da doação, etc.) está correta no formulário de cálculo.
*   **Causa Provável 2: Parâmetros Desatualizados.** O cálculo depende dos valores da UFEMG, SELIC e pautas de valores.
*   **Solução 2:** Verifique em **ITCD > Tabelas de Referência** e **ITCD > Configurações ITCD** se os valores para o período do cálculo estão corretos e atualizados.
`
        },
        {
            idSubSecaoDOM: "sp-dados-nao-salvam",
            tituloSubsecaoDisplay: "12.3. Problemas ao Salvar Dados (Geral)",
            conteudoMarkdown: `
**Sintoma:** Você preenche um formulário (novo documento, tarefa, etc.), clica em "Salvar" ou "Atualizar", mas os dados não são salvos, ou você recebe uma mensagem de erro genérica.

**Possíveis Causas e Soluções:**
*   **Campos Obrigatórios Não Preenchidos:** Revise o formulário cuidadosamente. Campos marcados com um asterisco vermelho (\`*\`) devem ser preenchidos.
*   **Erro de Validação de Campo:** Alguns campos (como CPF/CNPJ, e-mail) possuem validações. Procure por mensagens de erro próximas ao campo problemático e corrija o formato.
*   **Problemas com IndexedDB:** Verifique o console do navegador (F12) por erros como "QuotaExceededError". Isso pode significar que o espaço de armazenamento do navegador está cheio. Tente excluir dados antigos através da Lixeira.
`
        },
        {
            idSubSecaoDOM: "sp-anexos-backups-falham",
            tituloSubsecaoDisplay: "12.4. Anexos ou Backups Falham",
            conteudoMarkdown: `
**Sintoma:** Ao tentar adicionar um anexo ou realizar um backup ZIP, a operação falha.

**Possíveis Causas e Soluções:**
*   **Permissões da Pasta Negadas:** O SEFWorkStation precisa de permissão para ler e escrever na pasta raiz que você selecionou. Recarregue a aplicação (F5); o navegador deve solicitar a permissão novamente.
*   **Caminho da Pasta Inválido:** Se a pasta raiz da aplicação foi movida ou renomeada, a aplicação não conseguirá mais acessá-la.
*   **Espaço em Disco Insuficiente:** Verifique se há espaço livre suficiente no disco onde a pasta da aplicação está localizada.
`
        },
        {
            idSubSecaoDOM: "sp-compartilhamento",
            tituloSubsecaoDisplay: "12.5. Problemas com Compartilhamento",
            conteudoMarkdown: `
**Sintoma:** Itens enviados não chegam, ou a lista de "Itens Recebidos" está sempre vazia.

**Possíveis Causas e Soluções:**
*   **Configuração Incompleta (causa mais comum):**
    *   Verifique se **ambos os usuários** (remetente e destinatário) realizaram todos os passos de configuração:
        1.  Todos têm um cadastro como **Servidor**?
        2.  Todos foram em **Configurações** e selecionaram seu próprio nome em "**Usuário Atual da Aplicação**"?
        3.  Todos selecionaram em **Configurações** a **mesma pasta** \`SEFWorkStation_Compartilhado\`?
*   **Problema de Sincronização do Serviço de Nuvem (OneDrive, etc.):**
    *   Verifique se o seu cliente de OneDrive (ou similar) está ativo e sincronizando os arquivos. A solução para este problema está fora do SEFWorkStation e depende do seu serviço de nuvem.
*   **Permissão Incorreta na Pasta Compartilhada:**
    *   A pasta compartilhada precisa da permissão "**Pode editar**" para que o sistema possa atualizar o status dos arquivos.
`
        }
    ]
};