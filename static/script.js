// 1. Initialize the professional chart
const chartContainer = document.getElementById('chartContainer');
const chart = LightweightCharts.createChart(chartContainer, {
    layout: { backgroundColor: '#020617', textColor: '#94a3b8' },
    grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
});

const candleSeries = chart.addCandlestickSeries({
    upColor: '#10b981', downColor: '#ef4444',
    borderDownColor: '#ef4444', borderUpColor: '#10b981',
    wickDownColor: '#ef4444', wickUpColor: '#10b981',
});

// 2. Data fetching and UI update
async function updateDashboard() {
    const ticker = document.getElementById('stockSelector').value;
    try {
        const response = await fetch(`/api/predict/${ticker}`);
        const data = await response.json();

        if (data.error) return console.error(data.error);

        // Update Text Elements (Matching Python keys exactly)
        document.getElementById('currPrice').innerText = `$${data.price}`;
        document.getElementById('predPrice').innerText = `$${data.prediction}`;
        document.getElementById('volText').innerText = data.volatility;
        document.getElementById('rsiText').innerText = data.rsi;
        document.getElementById('suppText').innerText = data.support;
        document.getElementById('resText').innerText = data.resistance;

        // Set Candlestick Data
        candleSeries.setData(data.ohlc);
        chart.timeScale().fitContent();
    } catch (e) {
        console.error("Dashboard failed to sync:", e);
    }
}

document.getElementById('stockSelector').addEventListener('change', updateDashboard);
updateDashboard();