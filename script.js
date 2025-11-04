// =================================================================
// 1. DADOS DO PORTFÓLIO (Você deve atualizar este array manualmente)
// Importante: use o 'id' exato da CoinGecko (ex: 'ethereum', 'usd-coin')
// Adicione um campo 'apiId' para mapear o token para a API.
// =================================================================

const portfolioData = [
    {
        plataforma: 'Lido',
        tokenStaked: 'ETH',
        apiId: 'ethereum', // ID da CoinGecko
        qtdeStaked: 1.5,
        tokenLSD: 'stETH',
        taxaPaga: 0.05, // Em %
        porcentagemGanho: 3.5, // APR/APY
        tipoRetorno: 'APY',
        bloqueio: 'Não',
        retirada: '7-14 dias',
        carteira: 'MetaMask',
        observacoes: 'Liquid Staking'
    },
    {
        plataforma: 'Aave V3',
        tokenStaked: 'USDC',
        apiId: 'usd-coin', // ID da CoinGecko
        qtdeStaked: 1000.00,
        tokenLSD: 'aUSDC',
        taxaPaga: 0.10,
        porcentagemGanho: 2.15,
        tipoRetorno: 'APR',
        bloqueio: 'Não',
        retirada: 'Imediata',
        carteira: 'Trust Wallet',
        observacoes: 'Empréstimo'
    }
    // Adicione mais objetos. Certifique-se de incluir 'apiId'.
];

// Objeto para armazenar os preços dinamicamente
let cryptoPrices = {};
const fiatCurrency = 'eur'; // Usaremos sempre EUR, conforme solicitado

// =================================================================
// 2. FUNÇÃO DE BUSCA DE PREÇOS (API CoinGecko)
// =================================================================

async function fetchPrices() {
    // 1. Coleta todos os IDs únicos necessários
    const coinIds = [...new Set(portfolioData.map(item => item.apiId))].join(',');
    
    // Endpoint da CoinGecko para cotações simples
    const apiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=${fiatCurrency}`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`Erro de rede ou limite de API excedido: ${response.status}`);
        }
        const data = await response.json();
        
        // Formata os dados no objeto global
        for (const [id, prices] of Object.entries(data)) {
            cryptoPrices[id] = prices[fiatCurrency];
        }

        console.log("Cotações atualizadas:", cryptoPrices);
        return true;
    } catch (error) {
        console.error("Falha ao buscar cotações da CoinGecko:", error);
        // Em caso de falha, os cálculos serão feitos com um preço default (0), ou com valores fixos se existirem.
        return false;
    }
}


// =================================================================
// 3. FUNÇÕES DE CÁLCULO E EXIBIÇÃO
// Estas funções AGORA utilizam o objeto 'cryptoPrices'
// =================================================================

function calcularEExibirResumo() {
    let totalStakeEUR = 0;
    let totalAPR = 0;
    let totalItens = 0;
    let totalGanhosEstimadosEUR = 0;

    portfolioData.forEach(item => {
        const precoAtualEUR = cryptoPrices[item.apiId] || 0; // Pega o preço atual
        const valorAtualEUR = item.qtdeStaked * precoAtualEUR;
        
        // Soma o valor total em EUR (usando o preço atual)
        totalStakeEUR += valorAtualEUR;
        totalAPR += item.porcentagemGanho;
        totalItens++;

        // Estima o ganho anual simples: Valor Atual * (APR/100)
        const ganhoAnualEstimado = valorAtualEUR * (item.porcentagemGanho / 100);
        totalGanhosEstimadosEUR += ganhoAnualEstimado;
    });

    const aprMedio = totalItens > 0 ? totalAPR / totalItens : 0;

    // Atualiza os elementos no HTML
    document.getElementById('total-stake-eur').textContent = totalStakeEUR.toFixed(2);
    document.getElementById('apr-medio').textContent = aprMedio.toFixed(2);
    document.getElementById('total-ganhos-eur').textContent = totalGanhosEstimadosEUR.toFixed(2);
    
    // Adiciona a nota de rodapé sobre a atualização (EXTRA!)
    document.getElementById('dados-resumo').innerHTML += `<p class="atualizacao">Última atualização de preço: ${new Date().toLocaleTimeString()} (Fonte: CoinGecko)</p>`;
}

function popularTabela() {
    const tableBody = document.querySelector('#portfolio-table tbody');
    tableBody.innerHTML = ''; 

    portfolioData.forEach(item => {
        const precoAtualEUR = cryptoPrices[item.apiId] || 0;
        const valorAtualEUR = item.qtdeStaked * precoAtualEUR;

        const row = tableBody.insertRow();
        
        // Células na ordem da tabela
        row.insertCell().textContent = item.plataforma;
        row.insertCell().textContent = `${item.qtdeStaked.toFixed(4)} ${item.tokenStaked}`;
        row.insertCell().textContent = item.qtdeStaked.toFixed(4);
        // Valor agora é dinâmico!
        row.insertCell().innerHTML = `<strong>${valorAtualEUR.toFixed(2)} €</strong>`; 
        row.insertCell().textContent = item.tokenLSD || 'N/A';
        row.insertCell().textContent = `${item.taxaPaga.toFixed(2)}%`;
        row.insertCell().textContent = `${item.porcentagemGanho.toFixed(2)}%`;
        row.insertCell().textContent = item.tipoRetorno;
        row.insertCell().textContent = item.bloqueio + (item.retirada ? ` (${item.retirada})` : '');
        row.insertCell().textContent = item.carteira;
        row.insertCell().textContent = item.observacoes;
    });
}

// =================================================================
// 4. INICIALIZAÇÃO
// =================================================================

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Primeiro, busca os preços da API
    await fetchPrices();
    
    // 2. Depois, preenche a tabela e calcula o resumo com os preços atuais
    popularTabela();
    calcularEExibirResumo();
});
