// js/manualItcdConfiguracoes.js - Conteúdo do Manual do Usuário para as Configurações do Módulo ITCD
// v1.0 - Criação do módulo com documentação detalhada para cada aba de configuração.

window.SEFWorkStation = window.SEFWorkStation || {};
window.SEFWorkStation.ManualConteudo = window.SEFWorkStation.ManualConteudo || {};

window.SEFWorkStation.ManualConteudo.ItcdConfiguracoes = {
    idSecaoDOM: "manual-modulo-itcd-config",
    tituloSecaoDisplay: "11. Configurações Específicas do Módulo ITCD",
    anchorText: "Configurações ITCD",
    subsecoes: [
        {
            idSubSecaoDOM: "itcd-config-visao-geral",
            tituloSubsecaoDisplay: "11.1. Visão Geral das Configurações do ITCD",
            conteudoMarkdown: `
A tela de Configurações do ITCD é o coração do módulo, onde você define todos os parâmetros, pautas e valores de referência que serão utilizados nos cálculos de avaliação e apuração do imposto. A precisão dos resultados gerados pelo sistema depende diretamente da correta e atualizada configuração desta área.

**Acesso:** Menu **ITCD > Configurações ITCD**.

**Estrutura da Página:**
A página é dividida em abas, cada uma dedicada a um aspecto específico da configuração:

*   **Principal:** Gerencia a estrutura administrativa (Superintendências, Cidades, Unidades Fazendárias) e permite salvar/carregar todo o conjunto de configurações.
*   **Imóvel Urbano:** Define os valores de referência para m² de terreno, CUB, fatores de depreciação, conservação, etc.
*   **Imóvel Rural:** Define os valores de referência para hectare e os percentuais de ajuste por localização, tipo de imóvel, etc.
*   **Semoventes:** Gerencia as pautas de valores mensais para o gado e outros animais.
*   **Regras de Sucessão e Legislação:** Abas informativas que descrevem as regras legais aplicadas pelo sistema. **Não são editáveis.**

**Importante:** A edição destas configurações é uma tarefa de grande responsabilidade. Alterações incorretas podem levar a cálculos de imposto errados. Recomenda-se que apenas usuários com conhecimento técnico e da legislação tributária realizem modificações.
`
        },
        {
            idSubSecaoDOM: "itcd-config-principal",
            tituloSubsecaoDisplay: "11.2. Aba Principal: Estrutura e Backup",
            conteudoMarkdown: `
A aba "Principal" é o ponto de partida para organizar a estrutura administrativa e gerenciar o conjunto completo de configurações.

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
`
        },
        {
            idSubSecaoDOM: "itcd-config-urbano",
            tituloSubsecaoDisplay: "11.3. Aba Imóvel Urbano: Valores e Fatores",
            conteudoMarkdown: `
Esta aba controla todos os parâmetros para avaliação de imóveis urbanos.

*   **Valores de Referência por Cidade (m²):**
    *   Esta é a seção mais crítica. Selecione uma SRF e uma Cidade.
    *   O sistema exibirá campos para você inserir o valor do metro quadrado do terreno para cada tipo de **Localização** (Central, Boa, Média, etc.) naquela cidade específica.
    *   Estes valores são a base principal para o cálculo do valor do terreno.

*   **Custos Unitários Básicos de Construção (CUB):**
    *   Esta tabela deve ser preenchida com os valores do CUB/m² divulgados pelo SINDUSCON-MG.
    *   Preencha os valores para cada padrão construtivo (Residencial, Comercial, Galpão) e suas classificações. Estes valores são usados para calcular o valor da construção.

*   **Parâmetros Editáveis:**
    *   Você também pode gerenciar as listas e os percentuais de ajuste para:
        *   **Localização do Imóvel**
        *   **Tipos de Terreno** (Plano, Aclive, etc.)
        *   **Estado de Conservação** (Novo, Regular, etc.)
        *   **Fatores de Depreciação** (por idade do imóvel)
`
        },
        {
            idSubSecaoDOM: "itcd-config-rural",
            tituloSubsecaoDisplay: "11.4. Aba Imóvel Rural: Valores e Ajustes",
            conteudoMarkdown: `
Esta aba controla os parâmetros para avaliação de imóveis rurais.

*   **Valores de Referência por Cidade (hectare):**
    *   Similar ao urbano, selecione uma SRF e uma Cidade.
    *   Insira o valor do hectare para cada **Qualidade da Terra** (Classe A, B, C, etc.) naquela cidade.

*   **Ajustes Percentuais:**
    *   **Recursos Hídricos:** Defina o percentual de acréscimo no valor do hectare se o imóvel possuir recursos hídricos.
    *   **Tipo de Imóvel:** Defina os percentuais de ajuste para Fazenda, Sítio e Chácara.
    *   **Localização:** Defina os percentuais de ajuste para localização Boa, Média ou Ruim.
`
        },
        {
            idSubSecaoDOM: "itcd-config-semoventes",
            tituloSubsecaoDisplay: "11.5. Aba Semoventes: Pautas de Valores",
            conteudoMarkdown: `
Esta aba é usada para gerenciar as pautas de valores para semoventes, que são tipicamente atualizadas mensalmente.

*   **Adicionar Nova Pauta:**
    1.  Selecione o **Mês** e o **Ano** de referência da pauta.
    2.  Clique em "Definir Valores".
    3.  Um formulário aparecerá com todas as categorias de animais (Bezerros, Novilhas, Touros, etc.).
    4.  Preencha o valor em Reais (R$) para cada categoria.
    5.  Clique em "Salvar Nova Pauta".

*   **Pautas Existentes:**
    *   As pautas já salvas são listadas abaixo, ordenadas da mais recente para a mais antiga.
    *   Você pode expandir cada pauta para ver os valores, editá-los ou excluir a pauta inteira.
`
        }
    ]
};