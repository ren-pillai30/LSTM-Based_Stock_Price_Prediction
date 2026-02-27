let proChart;

function toggleIntelligence() {
    const drawer = document.getElementById('intel-drawer');
    drawer.classList.toggle('drawer-closed');
}

function openNewsLink(url) {
    if (!url || url === '#') return;
    window.open(url, '_blank', 'noopener,noreferrer');
}

async function analyzeMarket() {
    const t1 = document.getElementById('t1').value;
    const t2 = document.getElementById('t2').value;

    try {
        const res = await fetch(`/api/analyze?t1=${t1}&t2=${t2}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        
        const ticker = document.getElementById('price-ticker');
        ticker.innerHTML = `<span>${data.ticker.symbol} PRESENT: $${data.ticker.current}</span><span>${data.ticker.symbol} 5D TARGET: $${data.ticker.predicted}</span><span>SENTIMENT: ${data.indicators.sentiment}</span>`.repeat(5);

        const score = data.indicators.sentiment;
        document.getElementById('sent-val').innerText = score;
        document.getElementById('sentiment-fill').style.width = `${((score + 1) / 2) * 100}%`;

        const container = document.getElementById('news-feed');
        container.innerHTML = data.news.map(n => `
            <div class="news-item" style="padding:15px 0; border-bottom:1px solid #222; cursor:pointer;" onclick="openNewsLink('${n.link}')">
                <strong style="color:var(--accent);">${n.title}</strong><br><small style="color:#666;">Source: ${n.pub}</small>
            </div>
        `).join('');

        renderChart(data, t1, t2);
    } catch (err) { alert(err.message); }
}

function renderChart(data, n1, n2) {
    const ctx = document.getElementById('proChart').getContext('2d');
    if (proChart) proChart.destroy();
    proChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.dates,
            datasets: [
                { label: n1 + ' History', data: data.t1_history, borderColor: '#00ff88', pointRadius: 0 },
                { label: n1 + ' Forecast', data: data.t1_predict, borderColor: '#00ff88', borderDash: [5, 5], fill: {target: 'origin', above: 'rgba(0, 255, 136, 0.1)'} },
                { label: n2 + ' Comparison', data: data.t2_compare, borderColor: 'rgba(255,255,255,0.3)', pointRadius: 0 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { zoom: { zoom: { wheel: { enabled: true }, mode: 'x' }, pan: { enabled: true, mode: 'x' } } }
        }
    });
}