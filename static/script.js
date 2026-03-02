/* ═══════════════════════════════════════════════
   QuantPulse PRO — script.js
   Handles: autocomplete, charting (LW Charts),
   analysis rendering, LSTM forecast display
   ═══════════════════════════════════════════════ */

'use strict';

// ── State ──────────────────────────────────────────────────────────────────
let lwChart = null;   // LightweightCharts chart instance
let mainSeries = null;   // primary candle/line series
let compareSeries = null;  // comparison line series
let forecastSeries = null; // LSTM forecast line series

let currentTicker = 'NVDA';
let compareTicker = null;
let currentChartType = 'candlestick';  // 'candlestick' | 'line'
let currentPeriod = '6mo';
let compareEnabled = false;
let lastAnalysisData = null;

// ── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initChart();
  bindSearch('searchInput', 'searchDropdown', (sym, name) => {
    currentTicker = sym;
    document.getElementById('primarySymbol').textContent = sym;
    document.getElementById('primaryName').textContent = name;
    document.getElementById('searchInput').value = sym;
  });
  bindSearch('compareInput', 'compareDropdown', (sym, name) => {
    compareTicker = sym;
    document.getElementById('compareSymbol').textContent = sym;
    document.getElementById('compareName').textContent = name;
    document.getElementById('compareDisplay').style.display = 'block';
  });
});

// ── Chart Initialisation ───────────────────────────────────────────────────
function initChart() {
  const container = document.getElementById('chartContainer');
  lwChart = LightweightCharts.createChart(container, {
    width: container.clientWidth,
    height: container.clientHeight,
    layout: {
      background: { color: '#131722' },
      textColor: '#787b86',
    },
    grid: {
      vertLines: { color: '#1e222d' },
      horzLines: { color: '#1e222d' },
    },
    crosshair: {
      mode: LightweightCharts.CrosshairMode.Normal,
    },
    rightPriceScale: {
      borderColor: '#2a2e39',
      scaleMargins: { top: 0.1, bottom: 0.1 },
    },
    timeScale: {
      borderColor: '#2a2e39',
      timeVisible: true,
      secondsVisible: false,
    },
  });

  // Resize observer
  const ro = new ResizeObserver(entries => {
    for (const e of entries) {
      const { width, height } = e.contentRect;
      lwChart.resize(width, height);
    }
  });
  ro.observe(container);
}

// ── Chart Type Toggle ──────────────────────────────────────────────────────
function setChartType(type) {
  currentChartType = type;
  document.getElementById('btnCandle').classList.toggle('active', type === 'candlestick');
  document.getElementById('btnLine').classList.toggle('active', type === 'line');
  // Re-render if we have data
  if (lastAnalysisData) renderChart(lastAnalysisData);
}

function resetZoom() {
  if (lwChart) lwChart.timeScale().fitContent();
}

// ── Period Selector ────────────────────────────────────────────────────────
function setPeriod(btn) {
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  currentPeriod = btn.dataset.period;
}

// ── Toggle Compare Panel ───────────────────────────────────────────────────
function toggleCompare() {
  compareEnabled = !compareEnabled;
  const section = document.getElementById('compareSection');
  const btn = document.getElementById('compareToggleBtn');
  section.classList.toggle('hidden', !compareEnabled);
  btn.classList.toggle('active', compareEnabled);
  if (!compareEnabled) {
    compareTicker = null;
    if (compareSeries) { lwChart.removeSeries(compareSeries); compareSeries = null; }
    document.getElementById('compareDisplay').style.display = 'none';
  }
}

// ── Autocomplete Search ─────────────────────────────────────────────────────
function bindSearch(inputId, dropdownId, onSelect) {
  const input = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);
  let debounce = null;

  input.addEventListener('input', () => {
    clearTimeout(debounce);
    const q = input.value.trim();
    if (q.length < 1) { closeDropdown(dropdown); return; }
    debounce = setTimeout(() => fetchSuggestions(q, dropdown, input, onSelect), 200);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeDropdown(dropdown);
    if (e.key === 'Enter') {
      const firstItem = dropdown.querySelector('.dd-item');
      if (firstItem) {
        firstItem.click();
      } else {
        // Fallback: handle the current input directly
        const sym = input.value.trim().toUpperCase();
        if (sym) {
          onSelect(sym, sym);
          closeDropdown(dropdown);
        }
      }
    }
  });

  // Close on outside click
  document.addEventListener('click', e => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) closeDropdown(dropdown);
  });
}

async function fetchSuggestions(q, dropdown, input, onSelect) {
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) { closeDropdown(dropdown); return; }
    renderDropdown(data, dropdown, input, onSelect);
  } catch { closeDropdown(dropdown); }
}

function renderDropdown(items, dropdown, input, onSelect) {
  dropdown.innerHTML = items.map(item => `
    <div class="dd-item" data-sym="${item.symbol}" data-name="${escHtml(item.name)}">
      <span class="dd-symbol">${escHtml(item.symbol)}</span>
      <span class="dd-name">${escHtml(item.name)}</span>
    </div>
  `).join('');
  dropdown.classList.add('open');
  dropdown.querySelectorAll('.dd-item').forEach(el => {
    el.addEventListener('click', () => {
      const sym = el.dataset.sym;
      const name = el.dataset.name;
      input.value = sym;
      onSelect(sym, name);
      closeDropdown(dropdown);
    });
  });
}

function closeDropdown(dropdown) {
  dropdown.classList.remove('open');
  dropdown.innerHTML = '';
}

// ── Run Analysis ────────────────────────────────────────────────────────────
async function runAnalysis() {
  setLoading(true, 'Fetching market data…');
  document.getElementById('chartPlaceholder').style.display = 'none';

  try {
    // Step 1: fetch candlestick OHLCV data for chart
    setLoading(true, 'Loading candlestick data…');
    const chartRes = await fetch(`/api/chart?t=${currentTicker}&period=${currentPeriod}`);
    const chartData = await chartRes.json();
    if (chartData.error) throw new Error(chartData.error);

    // Step 2: full analysis (LSTM trains here — may take ~20s first time)
    setLoading(true, 'Running LSTM model & AI analysis… (first run may take ~30s)');
    const t2Param = (compareEnabled && compareTicker) ? `&t2=${compareTicker}` : `&t2=SPY`;
    const anaRes = await fetch(`/api/analyze?t1=${currentTicker}${t2Param}`);
    const anaData = await anaRes.json();
    if (anaData.error) throw new Error(anaData.error);

    lastAnalysisData = { chart: chartData, ana: anaData };

    // Render everything
    renderChart(lastAnalysisData);
    renderSidebar(anaData);
    renderBottomPanel(anaData);

    // Update navbar badge
    document.getElementById('navSymbol').textContent = currentTicker;
    document.getElementById('navPrice').textContent = `$${anaData.ticker.current}`;

    // Toolbar title
    const pct = (((anaData.ticker.predicted - anaData.ticker.current) / anaData.ticker.current) * 100).toFixed(2);
    const sign = pct >= 0 ? '+' : '';
    document.getElementById('ctSymbol').textContent = currentTicker;
    const ctc = document.getElementById('ctChange');
    ctc.textContent = `${sign}${pct}% (5D LSTM)`;
    ctc.className = `ct-change ${pct >= 0 ? 'pos' : 'neg'}`;

  } catch (err) {
    alert('Error: ' + err.message);
    document.getElementById('chartPlaceholder').style.display = 'flex';
  } finally {
    setLoading(false);
  }
}

// ── Chart Rendering ─────────────────────────────────────────────────────────
function renderChart({ chart: chartData, ana }) {
  // Clear existing series
  if (mainSeries) { try { lwChart.removeSeries(mainSeries); } catch { } mainSeries = null; }
  if (compareSeries) { try { lwChart.removeSeries(compareSeries); } catch { } compareSeries = null; }

  const ohlcv = [...chartData.ohlcv];

  // Inject the LSTM forecast directly as a continuation of the real graph
  if (ana && ana.ticker && ana.ticker.forecast) {
    const forecastPrices = ana.ticker.forecast;
    const forecastDates = ana.dates.slice(ana.dates.length - 5);

    forecastDates.forEach((d, i) => {
      const p = forecastPrices[i];
      // Use an accent color (e.g., gold) for the forecast continuation
      const fColor = '#ffcc00';
      ohlcv.push({
        time: d,
        open: p,
        high: p,
        low: p,
        close: p,
        color: fColor,
        borderColor: fColor,
        wickColor: fColor
      });
    });
  }

  if (currentChartType === 'candlestick') {
    mainSeries = lwChart.addCandlestickSeries({
      upColor: '#26a69a', downColor: '#ef5350',
      borderUpColor: '#26a69a', borderDownColor: '#ef5350',
      wickUpColor: '#26a69a', wickDownColor: '#ef5350',
    });
    mainSeries.setData(ohlcv);
  } else {
    mainSeries = lwChart.addLineSeries({
      color: '#26a69a', lineWidth: 2,
      crosshairMarkerVisible: true,
      lastValueVisible: true,
    });
    mainSeries.setData(ohlcv.map(d => ({
      time: d.time,
      value: d.close,
      color: d.color // use the injected forecast color if present
    })));
  }

  // ── Comparison series (normalized % change, right axis) ──
  if (compareEnabled && compareTicker && ana && ana.t2_compare) {
    const t2Data = ana.t2_compare;
    const t2Dates = ana.dates.slice(0, t2Data.filter(v => v !== null).length);
    const t2ChartData = t2Dates
      .map((d, i) => t2Data[i] != null ? { time: d, value: t2Data[i] } : null)
      .filter(Boolean);

    if (t2ChartData.length > 0) {
      compareSeries = lwChart.addLineSeries({
        color: 'rgba(255,255,255,0.35)',
        lineWidth: 1,
        lineStyle: LightweightCharts.LineStyle.Dotted,
        title: compareTicker,
        lastValueVisible: true,
        priceLineVisible: false,
        priceScaleId: 'compare',
      });
      lwChart.priceScale('compare').applyOptions({ scaleMargins: { top: 0.1, bottom: 0.1 } });
      compareSeries.setData(t2ChartData);
    }
  }

  lwChart.timeScale().fitContent();
}

// ── Sidebar Stats & Recommendation ─────────────────────────────────────────
function renderSidebar(ana) {
  const { ticker, indicators, ai } = ana;

  document.getElementById('statCurrent').textContent = `$${ticker.current}`;
  document.getElementById('statTarget').textContent = `$${ticker.predicted}`;
  document.getElementById('statRSI').textContent = `${indicators.rsi}`;
  document.getElementById('statMACD').textContent = `${indicators.macd > 0 ? '+' : ''}${indicators.macd}`;
  document.getElementById('statSentiment').textContent = `${indicators.sentiment > 0 ? '+' : ''}${indicators.sentiment}`;
  document.getElementById('statsSection').style.display = 'block';

  // Recommendation badge
  const label = ai.recommendation;         // e.g. "Strongly Buy"
  const cssClass = label.toLowerCase().replace(' ', '-');  // "strongly-buy"
  const badge = document.getElementById('recBadge');
  badge.textContent = label;
  badge.className = `rec-badge ${cssClass}`;

  // Score thumb position: composite is -1 to +1, map to 0%–100%
  const pct = Math.round(((ai.composite + 1) / 2) * 100);
  document.getElementById('rsbThumb').style.left = `${pct}%`;
  document.getElementById('recSection').style.display = 'block';
}

// ── Bottom Panel ────────────────────────────────────────────────────────────
function renderBottomPanel(ana) {
  document.getElementById('bottomPanel').style.display = 'flex';

  // AI Summary tab
  document.getElementById('aiSummaryText').textContent = ana.ai.summary;

  // Signal items
  const rsi = ana.indicators.rsi;
  setSignal('sigRSI', rsi < 35 ? 'Oversold — Bullish' : (rsi > 65 ? 'Overbought — Bearish' : 'Neutral'), rsi < 35 ? 'bull' : (rsi > 65 ? 'bear' : 'neu'));
  const macd = ana.indicators.macd;
  const msig = ana.indicators.macd_signal;
  setSignal('sigMACD', macd > msig ? 'Bullish Crossover' : 'Bearish Crossover', macd > msig ? 'bull' : 'bear');
  const curr = ana.ticker.current, pred = ana.ticker.predicted;
  setSignal('sigLSTM', `${curr < pred ? '▲' : '▼'} $${pred} (5D)`, curr < pred ? 'bull' : 'bear');
  const sent = ana.indicators.sentiment;
  setSignal('sigSent', sent > 0.05 ? 'Positive' : (sent < -0.05 ? 'Negative' : 'Neutral'), sent > 0.05 ? 'bull' : (sent < -0.05 ? 'bear' : 'neu'));

  // News tab
  const newsList = document.getElementById('newsList');
  newsList.innerHTML = ana.news.map(n => {
    const cls = n.score > 0.05 ? 'pos' : (n.score < -0.05 ? 'neg' : 'neu');
    return `
      <div class="news-card ${cls}" onclick="window.open('${escHtml(n.link)}','_blank','noopener')">
        <div class="news-title">${escHtml(n.title)}</div>
        <div class="news-meta">
          <span>${escHtml(n.pub)}</span>
          <span class="news-score ${cls}">Sentiment: ${n.score > 0 ? '+' : ''}${n.score}</span>
        </div>
      </div>`;
  }).join('') || '<p style="color:var(--text-muted)">No news available.</p>';

  // Forecast tab
  const grid = document.getElementById('forecastGrid');
  const forecasts = ana.ticker.forecast;
  const curr2 = ana.ticker.current;
  const futureDates = ana.dates.slice(-5);
  grid.innerHTML = forecasts.map((price, i) => {
    const chg = (((price - curr2) / curr2) * 100).toFixed(2);
    const isUp = price >= curr2;
    const cls = isUp ? 'up' : 'dn';
    const arrow = isUp ? '▲' : '▼';
    return `
      <div class="forecast-card">
        <div class="fc-day">Day ${i + 1} · ${futureDates[i] || ''}</div>
        <div class="fc-price ${cls}">$${price.toFixed(2)}</div>
        <div class="fc-chg ${cls}">${arrow} ${chg > 0 ? '+' : ''}${chg}%</div>
      </div>`;
  }).join('');
}

// ── Tab Switching ────────────────────────────────────────────────────────────
function switchTab(tabId, btn) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(`tab-${tabId}`).classList.add('active');
}

// ── Utilities ────────────────────────────────────────────────────────────────
function setLoading(show, text = '') {
  const overlay = document.getElementById('loadingOverlay');
  overlay.classList.toggle('hidden', !show);
  if (text) document.getElementById('loadingText').textContent = text;
}

function setSignal(elId, text, mood) {
  const el = document.getElementById(elId);
  el.textContent = text;
  el.className = `sig-val ${mood}`;
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
