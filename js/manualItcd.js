// js/manualItcd.js - Conteúdo do Manual do Usuário para o Módulo de ITCD
// v2.0 - Incorpora a documentação detalhada de configurações como uma subseção do manual principal do ITCD.
// v1.0 - Criação do módulo com documentação detalhada sobre Avaliações e Cálculos.

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ManualConteudo = window.SEFWorkStation.ManualConteudo || {};

window.SEFWorkStation.ManualConteudo.Itcd = {
    idSecaoDOM: "manual-modulo-itcd",
    tituloSecaoDisplay: "6. Módulo ITCD", // Renumerado para a ordem correta
    anchorText: "Módulo ITCD",
    subsecoes: [
        {
            idSubSecaoDOM: "itcd-visao-geral",
            tituloSubsecaoDisplay: "6.1. Visão Geral do Módulo ITCD",
            conteudoMarkdown: `
O Módulo de Imposto sobre Transmissão Causa Mortis e Doação (ITCD) é uma ferramenta poderosa e completa, projetada para auxiliar na avaliação de bens e na apuração do imposto devido em diversas situações, de acordo com as diferentes legislações estaduais vigentes ao longo do tempo.

**Principais Funcionalidades Detalhadas:**

*   **Avaliações de Bens Detalhadas:**
    *   **Imóveis Urbanos:** Avaliação baseada em pauta de valores de m², CUB (Custo Unitário Básico), padrão construtivo, localização, depreciação e outros fatores.
    *   **Imóveis Rurais:** Avaliação baseada no Valor da Terra Nua (VTN), culturas e benfeitorias, conforme valores de referência e ITR.
    *   **Semoventes:** Avaliação de rebanhos com base em pautas de valores mensais para diferentes categorias de animais.
    *   As avaliações podem ser salvas, editadas, duplicadas e vinculadas a outros itens do sistema.

*   **Motor de Cálculo Flexível:**
    *   **Legislação Histórica:** O sistema aplica automaticamente as regras da legislação correta (Lei 14.941/03, Lei 12.426/96, etc.) com base na **data do fato gerador** informada.
    *   **Diversos Fatos Geradores:** Suporta cálculos para:
        *   **Causa Mortis:** Transmissões por herança.
        *   **Doação:** Transmissões por liberalidade.
        *   **Excedente de Meação:** Apuração do imposto sobre a diferença na partilha em divórcios ou dissoluções.
        *   **Instituição e Extinção de Usufruto.**
        *   **Doações Sucessivas:** Cálculo que considera doações anteriores.
    *   O motor calcula não apenas o imposto principal, mas também descontos, multas e juros de mora.

*   **Configurações Centralizadas:**
    *   Uma seção dedicada permite que o administrador do sistema configure todas as pautas de valores, fatores, alíquotas e regras que alimentam os módulos de avaliação e cálculo. A precisão dos resultados depende da correta configuração destes parâmetros.

*   **Geração de Documentos:**
    *   A partir de uma avaliação salva, é possível gerar um **Parecer de Avaliação** em HTML, formatado e pronto para impressão ou para salvar como PDF.

**Acesso às Funcionalidades do Módulo ITCD (Menu Principal "ITCD"):**
*   **Cálculo de ITCD:** Abre o "Hub de Cálculo", o ponto de partida para todos os tipos de apuração do imposto.
*   **Gerir Cálculos Salvos:** Lista todos os cálculos (de qualquer tipo) que foram salvos no sistema.
*   **Avaliações:**
    *   **Gerir Avaliações:** Exibe a lista de todas as avaliações de bens salvas.
    *   **Avaliar Imóvel Urbano / Rural / Semovente:** Atalhos para os formulários de avaliação.
*   **Tabelas de Referência:**
    *   **Consultar UFEMG / SELIC:** Permite visualizar e gerenciar os valores históricos da UFEMG e da taxa SELIC.
*   **Configurações ITCD:** Leva à área administrativa para configurar as pautas e regras do módulo.
`
        },
        {
            idSubSecaoDOM: "itcd-hub-calculo",
            tituloSubsecaoDisplay: "6.2. O Hub de Cálculo",
            conteudoMarkdown: `
O Hub de Cálculo é a tela inicial para qualquer apuração de imposto.

**Acesso:** Menu **ITCD > Cálculo de ITCD**.

A partir daqui, você escolhe o tipo de cálculo que deseja realizar, e o sistema o direcionará para o formulário específico. As opções são:
*   **Causa Mortis:** Para apurar o imposto de heranças.
*   **Doação:** Para doações simples de bens.
*   **Doações Sucessivas:** Para o cálculo consolidado de múltiplas doações para o mesmo beneficiário ao longo do tempo.
*   **Dissolução de Sociedade Conjugal:** Para apurar o imposto sobre o excedente de meação.
*   **Instituição de Usufruto:** Para o cálculo na criação do usufruto.
*   **Extinção de Usufruto:** Para o cálculo na consolidação da propriedade.
`
        },
        {
            idSubSecaoDOM: "itcd-avaliacoes",
            tituloSubsecaoDisplay: "6.3. Realizando Avaliações de Bens",
            conteudoMarkdown: `
Antes de realizar um cálculo, muitas vezes é necessário avaliar os bens envolvidos. O SEFWorkStation fornece formulários detalhados para isso.

**Imóvel Urbano:**
*   **Acesso:** Menu **ITCD > Avaliações > Avaliar Imóvel Urbano**.
*   **Como Usar:**
    1.  Preencha os dados de **Identificação** (SRF, UF, Responsável, DBD, Data).
    2.  Insira os **Dados do Imóvel** (endereço, inscrição, áreas, etc.).
    3.  Na seção **Avaliação**, informe a localização e o **Valor do m² do Terreno** para aquela região (consulte a pauta de valores da sua regional).
    4.  Informe a **Utilização**, **Padrão** e **Classificação** da construção. O sistema buscará o valor do CUB correspondente nas configurações. Se não encontrar, você pode informá-lo manually.
    5.  O sistema calculará automaticamente o valor da construção (considerando depreciação e conservação), o valor do terreno (considerando esquina e tipo), e o **Valor Total da Avaliação**.
    6.  Informe também os valores **Declarado** e de **IPTU** para que o sistema possa compará-los e determinar o maior valor em UFEMG, que será a base de cálculo.
    7.  Salve a avaliação. Você pode então gerar um parecer ou vinculá-la a um cálculo.

**Imóvel Rural:**
*   **Acesso:** Menu **ITCD > Avaliações > Avaliar Imóvel Rural**.
*   **Como Usar:**
    1.  Preencha os dados de **Identificação** e **Dados do Imóvel**.
    2.  Na seção **Avaliação**, selecione a **Qualidade da Terra**. O sistema buscará o valor de referência do hectare para a cidade e qualidade selecionadas.
    3.  Fatores como **Recursos Hídricos**, **Tipo de Imóvel** e **Localização** aplicarão ajustes percentuais (configuráveis) sobre o valor do hectare.
    4.  Informe os valores de **Culturas** e **Benfeitorias** conforme o ITR.
    5.  O sistema calculará o valor final, que será comparado com o valor declarado.

**Semoventes:**
*   **Acesso:** Menu **ITCD > Avaliações > Avaliar Semoventes**.
*   **Como Usar:**
    1.  Preencha os dados de **Identificação** do produtor.
    2.  Selecione o **Mês e Ano do Fato Gerador**. O sistema tentará carregar a pauta de valores de semoventes correspondente daquele período.
    3.  Preencha a **quantidade** de animais para cada categoria.
    4.  O sistema multiplicará a quantidade pelo valor da pauta para cada categoria e somará tudo, chegando ao valor total da avaliação.
`
        },
        {
            idSubSecaoDOM: "itcd-calculo-causa-mortis",
            tituloSubsecaoDisplay: "6.4. Como Realizar um Cálculo Causa Mortis",
            conteudoMarkdown: `
Este é o cálculo mais comum, utilizado em inventários.

**Acesso:** Menu **ITCD > Cálculo de ITCD > Causa Mortis**.

**Passo a Passo:**
1.  **Dados da Declaração:**
    *   Informe a **Data do Fato Gerador (óbito)**. Esta data é crucial, pois define qual legislação será aplicada.
    *   Preencha o nome do falecido, seu estado civil e o regime de bens (se casado). Esta informação é fundamental para o sistema determinar corretamente a meação e a herança.
    *   Informe se o inventário é judicial ou extrajudicial e, se for o caso, a data do trânsito em julgado.
2.  **Herdeiros e Legatários:**
    *   Clique em "Adicionar" para cadastrar cada herdeiro (filhos, cônjuge, pais, etc.) e legatário (se houver testamento).
    *   Selecione o **tipo de herdeiro** corretamente (ex: Filho, Cônjuge, Pai/Mãe). A ordem de vocação hereditária (quem herda primeiro) é aplicada automaticamente com base nisso.
3.  **Bens e Direitos:**
    *   Clique em "Adicionar Bem" para cada item do espólio.
    *   **Descrição:** Seja claro (ex: "Imóvel matrícula 123", "Veículo placa ABC-1234").
    *   **Valor:** Informe o valor de mercado ou da avaliação já realizada.
    *   **Natureza:** Indique se o bem era **Particular** do falecido ou **Comum** do casal. Isso é essencial para o cálculo da meação.
4.  **Partilha dos Bens:**
    *   Para cada bem, você pode definir manualmente a partilha, informando a porcentagem que cada herdeiro receberá daquele bem específico. A soma deve ser 100%.
    *   **Ações em Lote:** Selecione múltiplos bens e use o botão "**Aplicar Partilha Legal**". O sistema calculará o quinhão devido a cada herdeiro com base nas regras de sucessão e distribuirá esse percentual entre os bens selecionados.
5.  **Cálculo:**
    *   Preencha a **Data do Pagamento** pretendida.
    *   Clique em "**Confirmar Partilhas e Calcular**".
    *   O sistema exibirá o resultado detalhado, incluindo o cálculo do imposto devido sobre a herança e, se for o caso, sobre a **Diferença de Partilha** (se um herdeiro recebeu mais do que seu quinhão devido, caracterizando uma doação).
6.  **Salvar:** Clique em "Salvar Cálculo" para guardar todo o cenário para consulta futura ou edição.
`
        },
        {
            idSubSecaoDOM: "itcd-configuracoes-detalhado",
            tituloSubsecaoDisplay: "6.5. Entendendo as Configurações do ITCD",
            conteudoMarkdown: `
A precisão de todas as avaliações e cálculos depende diretamente da correta configuração dos parâmetros do módulo. Esta é uma tarefa de grande responsabilidade e deve ser realizada com atenção.

**Acesso:** Menu **ITCD > Configurações ITCD**.

A página é dividida em abas, cada uma dedicada a um aspecto específico da configuração:

#### 6.5.1. Aba Principal: Estrutura e Backup
*   **Gerenciar Superintendências (SRF) e Cidades:**
    *   **Adicionar SRF:** Digite o nome da Superintendência e clique em "Adicionar SRF".
    *   **Adicionar Cidade:** Para cada SRF listada, há um campo para adicionar cidades. Digite o nome da cidade e clique em "Adicionar Cidade". É aqui que você constrói a relação de quais municípios pertencem a qual regional.
    *   **Editar/Excluir:** Use os botões ao lado de cada SRF ou cidade para renomeá-la ou removê-la.
*   **Gerenciar Unidades Fazendárias (UF):**
    *   Selecione uma SRF no menu suspenso para ver e gerenciar as UFs (AF, DF, SIAT) vinculadas a ela.
    *   Adicione novas UFs, definindo seu nome e tipo.
*   **Salvar/Carregar Configurações do ITCD:**
    *   Esta seção permite que você salve todo o conjunto de configurações do ITCD (todas as abas) em um único arquivo \`.json\`, ou que carregue um conjunto de configurações a partir de um arquivo.
    *   **Uso Recomendado:**
        1.  Após configurar tudo corretamente, **salve** as configurações para ter um backup.
        2.  Você pode **compartilhar** este arquivo com outros colegas para que todos usem os mesmos parâmetros.
        3.  Ao receber um arquivo de configuração atualizado, use a opção de **carregar** para aplicar as novas pautas e valores ao seu sistema. **Atenção:** Carregar um arquivo substituirá suas configurações atuais.

#### 6.5.2. Aba Imóvel Urbano: Valores e Fatores
Esta aba controla todos os parâmetros para avaliação de imóveis urbanos.
*   **Valores de Referência por Cidade (m²):**
    *   Esta é a seção mais crítica. Selecione uma SRF e uma Cidade.
    *   O sistema exibirá campos para você inserir o valor do metro quadrado do terreno para cada tipo de **Localização** (Central, Boa, Média, etc.) naquela cidade específica. Este é o valor base para a avaliação de terrenos.
*   **Custos Unitários Básicos de Construção (CUB):**
    *   Esta tabela deve ser preenchida com os valores do CUB/m² divulgados pelo SINDUSCON-MG.
    *   Preencha os valores para cada padrão construtivo (Residencial, Comercial, Galpão) e suas classificações. Estes valores são usados para calcular o valor da construção.
*   **Outros Parâmetros:**
    *   Você também pode gerenciar as listas e os percentuais de ajuste para: **Localização do Imóvel**, **Tipos de Terreno** (Plano, Aclive, etc.), **Estado de Conservação** (Novo, Regular, etc.) e **Fatores de Depreciação** (por idade do imóvel).

#### 6.5.3. Aba Imóvel Rural: Valores e Ajustes
Esta aba controla os parâmetros para avaliação de imóveis rurais.
*   **Valores de Referência por Cidade (hectare):**
    *   Similar ao urbano, selecione uma SRF e uma Cidade.
    *   Insira o valor do hectare para cada **Qualidade da Terra** (Classe A, B, C, etc.) naquela cidade.
*   **Ajustes Percentuais:**
    *   **Recursos Hídricos:** Defina o percentual de acréscimo no valor do hectare se o imóvel possuir recursos hídricos.
    *   **Tipo de Imóvel:** Defina os percentuais de ajuste para Fazenda, Sítio e Chácara.
    *   **Localização:** Defina os percentuais de ajuste para localização Boa, Média ou Ruim.

#### 6.5.4. Aba Semoventes: Pautas de Valores
Esta aba é usada para gerenciar as pautas de valores para semoventes, que são tipicamente atualizadas mensalmente.
*   **Adicionar Nova Pauta:**
    1.  Selecione o **Mês** e o **Ano** de referência da pauta.
    2.  Clique em "Definir Valores".
    3.  Um formulário aparecerá com todas as categorias de animais (Bezerros, Novilhas, Touros, etc.).
    4.  Preencha o valor em Reais (R$) para cada categoria.
    5.  Clique em "Salvar Nova Pauta".
*   **Pautas Existentes:**
    *   As pautas já salvas são listadas abaixo. Você pode expandir cada pauta para ver os valores, editá-los ou excluir a pauta inteira.

#### 6.5.5. Abas de Legislação e Regras
*   As abas "Regras de Sucessão", "Lei 14.941/03", etc., são **informativas**. Elas mostram um resumo das regras legais que o sistema utiliza internamente para realizar os cálculos, garantindo transparência ao processo. Estas seções não são editáveis.
`
        }
    ]
};