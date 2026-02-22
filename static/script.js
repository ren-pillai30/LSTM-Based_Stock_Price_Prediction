let chart;

async function runComparison() {
    const t1 = document.getElementById('t1').value;
    const t2 = document.getElementById('t2').value;
    const loader = document.getElementById('loader');

    try {
        loader.classList.remove('loader-hidden');
        const res = await fetch(`/api/analyze?t1=${t1}&t2=${t2}`);
        const data = await res.json();

        // 1. Populate Forecast Table
        const tbody = document.querySelector('#forecastTable tbody');
        tbody.innerHTML = data.prediction_only.map(row => 
            `<tr><td>${row.date}</td><td style="color:#00ff88">$${row.val}</td></tr>`
        ).join('');

        // 2. Render Prediction Chart
        renderFocusedChart(data, t1);
    } catch (err) { alert(err.message); }
    finally { loader.classList.add('loader-hidden'); }
}

function renderFocusedChart(data, name) {
    const ctx = document.getElementById('comparisonChart').getContext('2d');
    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.dates,
            datasets: [
                {
                    label: 'Historical',
                    data: data.primary_history,
                    borderColor: '#fff',
                    borderWidth: 2,
                    pointRadius: 0
                },
                {
                    label: 'LSTM Prediction',
                    data: data.primary_prediction,
                    borderColor: '#00ff88',
                    borderDash: [5, 5], // DASHED FOR VISIBILITY
                    fill: { target: 'origin', above: 'rgba(0, 255, 136, 0.05)' },
                    pointRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { x: { grid: { display: false } }, y: { grid: { color: '#222' } } }
        }
    });
}