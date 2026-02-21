const chartContainer = document.getElementById('chartContainer');
const chart = LightweightCharts.createChart(chartContainer, {
    layout: { backgroundColor: '#020617', textColor: '#94a3b8' },
    grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
    priceScale: { borderColor: '#1e293b' },
    timeScale: { borderColor: '#1e293b' },
});

const candleSeries = chart.addCandlestickSeries({
    upColor: '#10b981', downColor: '#ef4444',
    borderDownColor: '#ef4444', borderUpColor: '#10b981',
    wickDownColor: '#ef4444', wickUpColor: '#10b981',
});

async function updateDashboard() {
    const ticker = document.getElementById('stockSelector').value;
    try {
        const response = await fetch(`/api/predict/${ticker}`);
        const data = await response.json();

        if (data.error) return console.error(data.error);

        // Update UI Text
        document.getElementById('currPrice').innerText = `$${data.price}`;
        document.getElementById('predPrice').innerText = `$${data.prediction}`;
        document.getElementById('vol').innerText = data.volatility;
        document.getElementById('supp').innerText = data.support;
        document.getElementById('res').innerText = data.resistance;

        // Set Candlestick Data
        candleSeries.setData(data.ohlc);
        chart.timeScale().fitContent();
    } catch (e) {
        console.error("Fetch failed", e);
    }
}

document.getElementById('stockSelector').addEventListener('change', updateDashboard);
updateDashboard();