// =================================================================
// 1. VARIÁVEIS GLOBAIS
// =================================================================

let portfolioData = []; // Inicialmente vazio, será preenchido pelo LocalStorage
let cryptoPrices = {};
const fiatCurrency = 'eur'; // Moeda de referência
const localStorageKey = 'defiPortfolioData';

// =================================================================
// 2. GERENCIAMENTO DE DADOS (LocalStorage)
// =================================================================

function loadData() {
    const data = localStorage.getItem(localStorageKey);
    try {
        portfolioData = data ? JSON.parse(data) : [];
    } catch (e) {
        console.error("Erro ao carregar dados do LocalStorage:", e);
        portfolioData = [];
    }
}

function saveData() {
    localStorage.setItem(localStorageKey, JSON.stringify(portfolioData));
}

function clearData() {
    if (confirm("ATENÇÃO: Você tem certeza que deseja APAGAR TODOS os dados do seu portfólio? Essa ação não pode ser desfeita.")) {
        localStorage.removeItem(localStorageKey);
        portfolioData = [];
        
        // Recarrega a visualização (incluindo o resumo)
        popularTabela();
        calcularEExibirResumo();
        alert("Todos os dados foram limpos! Recarregue a página se houver problemas.");
    }
}

// =================================================================
// 3. FUNÇÃO DE BUSCA DE PREÇOS (API CoinGecko)
// =================================================================

async function fetchPrices() {
    if (portfolioData.length === 0) return;

    // 1. Coleta todos os IDs únicos (e válidos) necessários
    const uniqueApiIds = [...new Set(portfolioData.map(item => item.apiId).filter(id => id))];
    if (uniqueApiIds.length === 0) return;
    
    const coinIds = uniqueApiIds.join(',');
    
    // Endpoint da CoinGecko (versão gratuita)
    const apiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=${fiatCurrency}`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`Erro de rede ou limite de API excedido: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        
        // Formata os dados no objeto global cryptoPrices
        for (const [id, prices] of Object.entries(data)) {
            cryptoPrices[id] = prices[fiatCurrency];
        }
        console.log("Cotações atualizadas:", cryptoPrices);
    } catch (error) {
        console.error("Falha ao buscar cotações da CoinGecko. Usando 0 para cálculo.", error);
    }
}

// =================================================================
// 4. FUNÇÕES DE CÁLCULO E EXIBIÇÃO
// =================================================================

function calcularEExibirResumo() {
    let totalStakeEUR = 0;
    let totalTaxaPaga = 0;
    let totalGanhosEstimadosEUR = 0;
    let aprTotal = 0;
    let totalItens = 0;

    portfolioData.forEach(item => {
        const precoAtualEUR = cryptoPrices[item.apiId] || 0;
        const valorAtualEUR = item.qtdeStaked * precoAtualEUR;
        
        // Somatória
        totalStakeEUR += valorAtualEUR;
        totalTaxaPaga += parseFloat(item.taxaPaga) || 0; // Garante que a taxa é um número
        aprTotal += parseFloat(item.porcentagemGanho) || 0;
        totalItens++;

        // Estimativa de Ganho (simplificada, anual)
        const ganhoAnualEstimado = valorAtualEUR * ((parseFloat(item.porcentagemGanho) || 0) / 100);
        totalGanhosEstimadosEUR += ganhoAnualEstimado;
    });

    const aprMedio = totalItens > 0 ? aprTotal / totalItens : 0;
    const valorLiquidoAtual = totalStakeEUR - totalTaxaPaga;

    const resumoDiv = document.getElementById('dados-resumo');
    resumoDiv.innerHTML = `
        <p><strong>Valor Total em Stake:</strong> <span>${totalStakeEUR.toFixed(2)} €</span></p>
        <p><strong>Taxas de Gás Pagas:</strong> <span class="taxas">${totalTaxaPaga.toFixed(2)} €</span></p>
        <p><strong>Valor Líquido Atual:</strong> <strong>${valorLiquidoAtual.toFixed(2)} €</strong></p>
        <p><strong>Retorno Médio (APR/APY):</strong> <span>${aprMedio.toFixed(2)} %</span></p>
        <p><strong>Ganhos Anuais Estimados:</strong> <span>${totalGanhosEstimadosEUR.toFixed(2)} €</span></p>
        <p class="atualizacao">Última atualização de preço: ${new Date().toLocaleTimeString()} (Fonte: CoinGecko)</p>
    `;
}

function popularTabela() {
    const tableBody = document.querySelector('#portfolio-table tbody');
    tableBody.innerHTML = ''; 

    if (portfolioData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="11" style="text-align: center;">Seu portfólio está vazio. Adicione um novo stake acima!</td></tr>';
        return;
    }

    portfolioData.forEach((item, index) => {
        const precoAtualEUR = cryptoPrices[item.apiId] || 0;
        const valorAtualEUR = item.qtdeStaked * precoAtualEUR;

        const row = tableBody.insertRow();
        
        const acoesCell = `<button onclick="removerStake(${index})" class="delete-btn">Excluir</button>`;

        row.insertCell().textContent = item.plataforma;
        row.insertCell().textContent = `${item.qtdeStaked.toFixed(4)} ${item.tokenStaked}`;
        row.insertCell().textContent = item.qtdeStaked.toFixed(4);
        row.insertCell().innerHTML = `<strong>${valorAtualEUR.toFixed(2)} €</strong>`; 
        row.insertCell().textContent = item.tokenLSD || 'N/A';
        row.insertCell().textContent = `${parseFloat(item.taxaPaga).toFixed(2)} €`;
        row.insertCell().textContent = `${parseFloat(item.porcentagemGanho).toFixed(2)}%`;
        row.insertCell().textContent = item.tipoRetorno;
        row.insertCell().textContent = item.bloqueio;
        row.insertCell().textContent = item.carteira;
        row.insertCell().innerHTML = acoesCell; 
    });
}

// Função para excluir um item
window.removerStake = async function(index) {
    // Confirmação simples
    if (!confirm(`Tem certeza que deseja remover o stake de ${portfolioData[index].tokenStaked} na plataforma ${portfolioData[index].plataforma}?`)) {
        return;
    }

    portfolioData.splice(index, 1);
    saveData();
    
    // Reexecuta o processo após a exclusão
    await initPortfolio(); 
}


// =================================================================
// 5. MANUSEIO DO FORMULÁRIO
// =================================================================

function handleFormSubmit(event) {
    event.preventDefault();

    const newStake = {
        plataforma: document.getElementById('plataforma').value,
        tokenStaked: document.getElementById('tokenStaked').value.toUpperCase(),
        apiId: document.getElementById('apiId').value.toLowerCase(),
        qtdeStaked: parseFloat(document.getElementById('qtdeStaked').value),
        tokenLSD: document.getElementById('tokenLSD').value,
        taxaPaga: parseFloat(document.getElementById('taxaPaga').value) || 0,
        porcentagemGanho: parseFloat(document.getElementById('porcentagemGanho').value),
        tipoRetorno: document.getElementById('tipoRetorno').value,
        bloqueio: document.getElementById('bloqueio').value,
        carteira: document.getElementById('carteira').value,
        observacoes: document.getElementById('observacoes').value,
        id: Date.now() 
    };

    // Validação básica
    if (!newStake.apiId || newStake.qtdeStaked <= 0 || newStake.porcentagemGanho < 0) {
        alert("Por favor, preencha todos os campos obrigatórios e verifique se a quantidade e o APR/APY são números válidos.");
        return;
    }

    portfolioData.push(newStake);
    saveData();
    
    // Limpa o formulário e re-renderiza
    document.getElementById('stake-form').reset();
    initPortfolio(); // Reinicia o portfólio para atualizar preços e a tabela
}

// =================================================================
// 6. INICIALIZAÇÃO E LISTENERS
// =================================================================

async function initPortfolio() {
    loadData();
    await fetchPrices(); // Busca os preços antes de renderizar
    popularTabela();
    calcularEExibirResumo();
}

document.addEventListener('DOMContentLoaded', () => {
    // Adiciona os Listeners
    const form = document.getElementById('stake-form');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
    
    const clearBtn = document.getElementById('limpar-data-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearData);
    }

    // Inicia o portfólio ao carregar a página
    initPortfolio();
});
