// js/manualProcessos.js - Conteúdo do Manual do Usuário para o Módulo de Processos
// v1.1 - Adiciona vínculo com Módulo de Servidores e menção a e-mails vinculados.
// v1.0 - Conteúdo detalhado para Protocolos, PTAs e Autuações.

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ManualConteudo = window.SEFWorkStation.ManualConteudo || {};

window.SEFWorkStation.ManualConteudo.Processos = {
    idSecaoDOM: "manual-modulo-processos",
    tituloSecaoDisplay: "4. Módulo de Processos (Protocolos, PTAs, Autuações)",
    anchorText: "Módulo Processos",
    subsecoes: [
        {
            idSubSecaoDOM: "proc-visao-geral",
            tituloSubsecaoDisplay: "4.1. Visão Geral do Módulo de Processos",
            conteudoMarkdown: `
O Módulo de Processos é uma ferramenta robusta para o registro, acompanhamento e gerenciamento de diversos tipos de trâmites formais que ocorrem em um ambiente administrativo ou fiscal. Ele é estruturado para lidar com diferentes naturezas de processos, desde simples protocolos de recebimento até complexos processos tributários e autuações.

**Estrutura do Módulo:**
O módulo é organizado em três submódulos principais, cada um com suas particularidades, mas compartilhando funcionalidades comuns de vinculação e histórico:
1.  **Protocolos:** Para o registro inicial de qualquer documento, solicitação ou comunicação formal que precise de acompanhamento. Um protocolo pode ser um ponto de partida para um PTA ou uma Autuação, ou pode ser resolvido em si mesmo.
2.  **PTAs (Processos Tributários Administrativos):** Destinado ao gerenciamento de processos mais formais, tipicamente de natureza contenciosa (onde há uma disputa ou questionamento sobre uma obrigação tributária) ou consultiva (onde se busca um esclarecimento formal sobre a legislação).
3.  **Autuações (Autos de Infração / Notificações de Lançamento):** Focado no registro e acompanhamento de autos de infração, notificações de lançamento de tributos, e todo o seu ciclo de vida, incluindo impugnações, recursos e decisões.

**Principais Funcionalidades Comuns e Detalhadas:**

*   **Cadastro Específico por Tipo de Processo:**
    *   Cada submódulo (Protocolos, PTAs, Autuações) possui um formulário de cadastro com campos relevantes para sua natureza.
    *   **Número do Processo:** Identificador único (obrigatório para PTAs e Autuações, opcional para Protocolos se não houver um número formal, sendo gerado um interno). O sistema verifica a duplicidade do número informado.
    *   **Data:** Data de instauração, protocolização ou lavratura.
    *   **Tipo de Processo:** Campos como "Tipo de Protocolo", "Tipo de PTA", "Tipo de Autuação" permitem classificar o processo (ex: "Protocolo - Pedido de Certidão", "PTA - Contencioso ICMS", "Autuação - Omissão de Receita"). Novos tipos são criados dinamicamente se não existirem.
    *   **Assunto/Matéria:** Uma descrição concisa do objeto do processo.
    *   **Descrição Detalhada:** Um campo de texto rico (com suporte a Markdown para Protocolos e PTAs, e editor rico para o conteúdo principal de Autuações no futuro, se aplicável) para detalhar o escopo, fundamentos, ou informações relevantes do processo.
    *   **Status:** Cada tipo de processo tem uma lista de status predefinida para indicar seu estado atual (ex: "Em Análise", "Deferido", "Impugnado").
    *   **Servidor Responsável:** Permite atribuir o processo a um servidor ou setor para acompanhamento.

*   **Histórico de Andamento Detalhado:**
    *   Uma funcionalidade central em todos os submódulos. Permite registrar cada etapa, despacho, decisão, juntada de documentos, ou qualquer evento relevante na tramitação do processo.
    *   Cada entrada de andamento inclui:
        *   **Data e Hora:** Do evento.
        *   **Descrição (Markdown):** Detalhamento do ocorrido.
        *   **Responsável pelo Andamento:** Quem realizou a ação.
        *   **Tipo de Andamento (Opcional):** Para classificar a natureza do andamento (ex: "Despacho de Mero Expediente", "Decisão de 1ª Instância", "Juntada de Provas").
    *   O histórico é exibido em ordem cronológica (geralmente o mais recente primeiro) na tela de visualização do processo.

*   **Gerenciamento de Anexos:**
    *   Cada protocolo, PTA ou autuação pode ter múltiplos arquivos anexados (PDFs, planilhas, imagens, etc.).
    *   Os arquivos são armazenados na pasta da aplicação, em subdiretórios específicos:
        *   \`attachments_sef/processos/protocolos/[ID_DO_PROTOCOLO]/\`
        *   \`attachments_sef/processos/ptas/[ID_DO_PTA]/\`
        *   \`attachments_sef/processos/autuacoes/[ID_DA_AUTUACAO]/\`

*   **Vínculos Abrangentes e Contextuais:**
    *   **Contribuintes:** Associe um ou mais contribuintes (partes interessadas, autuados, requerentes).
    *   **Documentos:** Vincule documentos do sistema que sejam petições, provas, pareceres, decisões digitalizadas, etc.
    *   **Tarefas:** Crie ou relacione tarefas para gerenciar o trabalho a ser feito em cada processo (ex: "Analisar defesa do PTA X", "Elaborar minuta de decisão para Protocolo Y").
    *   **Notas Rápidas:** Adicione notas com informações contextuais, rascunhos de ideias, ou lembretes rápidos sobre o processo.
    *   **Servidores:** Vincule o servidor responsável principal e outros servidores que possam estar envolvidos ou que precisem ter conhecimento do processo.
    *   **E-mails Gerados:** Quando um e-mail é composto a partir de um processo, ele é automaticamente vinculado.
    *   **Relacionamento entre Processos:**
        *   Um Protocolo pode originar um ou mais PTAs.
        *   Um Protocolo pode originar uma ou mais Autuações (diretamente ou via PTA).
        *   Um PTA pode originar uma ou mais Autuações.
        *   Esses vínculos são gerenciáveis e visíveis nas telas de cada processo, permitindo rastrear a "árvore" processual. Por exemplo, ao visualizar um PTA, você pode ver de qual Protocolo ele se originou e quais Autuações ele gerou.

*   **Busca e Filtragem nas Listagens:**
    *   As telas "Gerir Protocolos", "Gerir PTAs" e "Gerir Autuações" possuem campos de busca por termo (número, assunto, etc.) e filtros específicos por Tipo de Processo e Status.

*   **Lixeira Global:**
    *   Protocolos, PTAs e Autuações excluídos são movidos para a Lixeira Global. A partir de lá, podem ser restaurados para suas respectivas listagens ou excluídos permanentemente.
    *   Ao restaurar, os vínculos existentes são geralmente mantidos.
    *   Ao excluir permanentemente, o sistema tenta desvincular o processo de outras entidades para manter a consistência referencial.

**Fluxo Típico de Trabalho (Exemplo):**
1.  Um contribuinte protocola um pedido de restituição. Um **Protocolo** é cadastrado no SEFWorkStation.
2.  O Protocolo é analisado e, se necessário, uma **Tarefa** é criada para um servidor "Analisar documentação do Protocolo X".
3.  Documentos enviados pelo contribuinte são **anexados** ao Protocolo.
4.  Após análise, decide-se que o caso é complexo e precisa de uma análise formal mais aprofundada. A partir da tela do Protocolo, clica-se em "Criar PTA deste Protocolo".
5.  Um novo **PTA** é cadastrado, já vindo com o Protocolo de origem vinculado. O status do Protocolo pode ser atualizado para "Encaminhado para PTA" ou "Arquivado".
6.  O PTA tramita, com novos **andamentos** sendo registrados (defesa, pareceres, diligências). Novos **documentos** são vinculados.
7.  Se, ao final do PTA, for constatada uma infração ou a necessidade de um lançamento, a partir da tela do PTA, clica-se em "Criar Autuação deste PTA".
8.  Uma nova **Autuação** é cadastrada, vinculada ao PTA de origem. O status do PTA pode ser atualizado para "Convertido em Autuação" ou "Encerrado".
9.  A Autuação segue seu próprio fluxo, com impugnações, recursos, e seu próprio histórico de andamentos e documentos.

Este fluxo demonstra como os submódulos se interconectam, mantendo a rastreabilidade e o contexto das informações.
`
        },
        {
            idSubSecaoDOM: "proc-protocolos",
            tituloSubsecaoDisplay: "4.2. Gerenciando Protocolos",
            conteudoMarkdown: `
Protocolos são o ponto de entrada para muitas interações formais. Eles podem ser usados para registrar uma ampla gama de solicitações, comunicações ou documentos que necessitam de um acompanhamento formal.

#### 4.2.1. Cadastrar Novo Protocolo
1.  **Acesso:** No menu principal, navegue até **Processos > Cadastrar Protocolo**.
2.  **Preenchimento do Formulário:**
    *   **Número do Protocolo (Manual):** \`[Obrigatório]\` Insira o número ou código que identifica este protocolo no sistema de origem ou como ele será referenciado. Este campo deve ser único. O sistema irá alertar se o número informado já existir.
    *   **Data do Protocolo:** \`[Obrigatório]\` Selecione a data em que o protocolo foi formalmente recebido ou criado.
    *   **Tipo de Protocolo:** \`[Obrigatório]\` Descreva a natureza geral do protocolo. Novos tipos são criados dinamicamente se não existirem.
    *   **Assunto:** \`[Obrigatório]\` Um título ou resumo conciso do que se trata o protocolo.
    *   **Descrição Detalhada:** (Opcional) Detalhes sobre o protocolo. Suporta Markdown.
    *   **Servidor Responsável:** (Opcional) Comece a digitar o nome ou matrícula do servidor. O sistema buscará nos servidores cadastrados.
    *   **Status do Protocolo:** (Padrão: "Recebido") Selecione o estado atual do protocolo.
    *   **Primeiro Andamento/Encaminhamento:** (Opcional, apenas na criação) Andamentos subsequentes são adicionados na tela de visualização do protocolo.
    *   **Vínculos:** Associe documentos, contribuintes, servidores, tarefas e notas rápidas.
    *   **Anexos:** Anexe cópias digitalizadas do protocolo físico, documentos de suporte, etc.
3.  **Salvar:** Clique em "Salvar Protocolo".

#### 4.2.2. Gerir Protocolos
*   **Acesso:** Menu **Processos > Gerir Protocolos**.
*   **Listagem:** Exibe uma tabela com todos os protocolos cadastrados.
*   **Filtros:** Busque por termo, tipo de protocolo e status.
*   **Ações na Lista:** Visualizar, Editar, Excluir, e alterar o status rapidamente.

#### 4.2.3. Visualizar Protocolo
A tela de visualização de um protocolo exibe todas as suas informações de forma organizada e permite:
*   **Adicionar Andamento:** Registre novos eventos no histórico.
*   **Criar PTA/Autuação:** Inicie um processo mais complexo a partir do protocolo, mantendo o vínculo de origem.
*   Gerenciar todos os vínculos e anexos.
                    `
        },
        {
            idSubSecaoDOM: "proc-ptas",
            tituloSubsecaoDisplay: "4.3. Gerenciando PTAs (Processos Tributários Administrativos)",
            conteudoMarkdown: `
PTAs representam processos formais, frequentemente relacionados a questões tributárias que exigem análise, defesa, e decisão administrativa.

#### 4.3.1. Cadastrar Novo PTA
1.  **Acesso:**
    *   Menu **Processos > Cadastrar PTA**.
    *   Ou, a partir da tela de visualização de um **Protocolo** existente, clicando no botão "**Criar PTA deste Protocolo**".
2.  **Preenchimento do Formulário:**
    *   **Número do PTA (Manual, se houver):** Se o PTA já possui um número oficial, informe-o. Caso contrário, um número interno será gerado.
    *   **Data do PTA (Autuação/Início):** \`[Obrigatório]\` A data de instauração formal do PTA.
    *   **Tipo de PTA:** \`[Obrigatório]\` Classifique o PTA (ex: "Contencioso Fiscal", "Consulta Tributária").
    *   **Assunto do PTA:** \`[Obrigatório]\` Descrição concisa da matéria.
    *   **Servidor Responsável pelo PTA:** (Opcional) Busque e selecione um servidor cadastrado.
    *   **Status do PTA:** (Padrão: "Em Elaboração") Selecione o estado atual.
    *   **Vínculos:** Associe Protocolos de Origem, documentos, contribuintes, servidores, tarefas e notas.
3.  **Salvar:** Clique em "Salvar PTA".

#### 4.3.2. Gerir PTAs
*   **Acesso:** Menu **Processos > Gerir PTAs**.
*   **Listagem:** Tabela com todos os PTAs ativos, com filtros por termo, tipo e status.
*   **Ações na Lista:** Visualizar, Editar, Excluir, Alteração Rápida de Status.

#### 4.3.3. Visualizar PTA
A tela de visualização do PTA exibe todos os seus detalhes e permite:
*   Adicionar andamentos.
*   Criar Autuações a partir do PTA.
*   Gerenciar todos os vínculos e anexos.
                    `
        },
        {
            idSubSecaoDOM: "proc-autuacoes",
            tituloSubsecaoDisplay: "4.4. Gerenciando Autuações",
            conteudoMarkdown: `
As Autuações (Autos de Infração, Notificações de Lançamento) representam a formalização de uma exigência fiscal ou a constatação de uma infração.

#### 4.4.1. Cadastrar Nova Autuação
1.  **Acesso:**
    *   Menu **Processos > Cadastrar Autuação**.
    *   Ou, a partir da tela de um **PTA** ou **Protocolo** existente.
2.  **Preenchimento do Formulário:**
    *   **Número da Autuação (Manual, se houver):** Informe o número oficial ou deixe em branco para geração automática.
    *   **Data da Autuação:** \`[Obrigatório]\` Data de lavratura do auto.
    *   **Tipo de Autuação:** \`[Obrigatório]\` Natureza da autuação (ex: "Omissão de Receita", "Crédito Indevido de ICMS").
    *   **Assunto/Matéria:** \`[Obrigatório]\` Breve descrição da infração.
    *   **Servidor Responsável:** (Opcional) Selecione o servidor responsável.
    *   **Status da Autuação:** (Padrão: "Em Elaboração") Acompanhe o ciclo de vida (ex: "Lavrado", "Impugnado", "Inscrito em Dívida Ativa").
    *   **Vínculos:** Associe PTAs/Protocolos de Origem, documentos, contribuintes, servidores, tarefas e notas.
3.  **Salvar:** Clique em "Salvar Autuação".

#### 4.4.2. Gerir Autuações
*   **Acesso:** Menu **Processos > Gerir Autuações**.
*   **Listagem:** Tabela com todas as autuações ativas, com filtros por termo, tipo e status.
*   **Ações na Lista:** Visualizar, Editar, Excluir, Alteração Rápida de Status.

#### 4.4.3. Visualizar Autuação
A tela de visualização da Autuação exibe todos os seus detalhes e permite:
*   Adicionar andamentos ao histórico.
*   Gerenciar todos os vínculos e anexos.
`
        }
    ]
};