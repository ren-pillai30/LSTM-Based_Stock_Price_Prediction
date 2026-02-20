const ctx = document.getElementById('mainChart').getContext('2d');

let mainChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Market Price',
            data: [],
            borderColor: '#38bdf8',
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            backgroundColor: 'rgba(56, 189, 248, 0.03)',
            pointRadius: 0
        }, {
            label: 'LSTM Forecast',
            data: [],
            borderColor: '#fbbf24',
            borderWidth: 2,
            borderDash: [6, 4],
            tension: 0.4,
            pointRadius: 5,
            pointBackgroundColor: '#fbbf24'
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b', font: { size: 11 } } },
            x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } }
        }
    }
});

function updateDashboard() {
    const ticker = document.getElementById('stockSelector').value;
    const base = { 'AAPL': 185, 'BTC': 67200, 'NVDA': 910 }[ticker];
    
    // 1. History (20 days)
    const history = Array.from({length: 20}, () => base + (Math.random() - 0.5) * (base * 0.04));
    const lastPrice = history[history.length - 1];
    
    // 2. Prediction (Connect to last history point)
    const prediction = new Array(19).fill(null);
    prediction.push(lastPrice); // The connection point
    const forecastVal = lastPrice + (Math.random() - 0.35) * (base * 0.07);
    prediction.push(forecastVal);

    // Update Text
    document.getElementById('currPrice').innerText = `$${lastPrice.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    document.getElementById('predPrice').innerText = `$${forecastVal.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    
    // Trend Logic
    const diff = (((forecastVal - lastPrice) / lastPrice) * 100).toFixed(2);
    const predTrend = document.getElementById('predTrend');
    predTrend.innerText = `${diff >= 0 ? '▲' : '▼'} ${Math.abs(diff)}% forecast`;
    predTrend.className = `trend ${diff >= 0 ? 'up' : 'down'}`;

    // Update RSI
    document.getElementById('rsiVal').innerText = (Math.random() * 30 + 35).toFixed(1);

    // Update Chart
    mainChart.data.labels = Array.from({length: 21}, (_, i) => i < 20 ? `${20-i}d ago` : 'Target');
    mainChart.data.datasets[0].data = history;
    mainChart.data.datasets[1].data = prediction;
    mainChart.update('active');
}

document.getElementById('stockSelector').addEventListener('change', updateDashboard);
window.onload = updateDashboard;