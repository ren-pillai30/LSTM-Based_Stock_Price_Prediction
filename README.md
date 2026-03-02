# QuantPulse PRO — LSTM Fixed

A TradingView-inspired stock analysis dashboard powered by a real Keras LSTM model.

## Features
- **Real LSTM forecasting** — trained live on 2 years of data, cached as `.h5`
- **Candlestick & Line charts** — toggle between modes using TradingView Lightweight Charts
- **Autocomplete search** — type any ticker or company name
- **Stock comparison** — overlay a benchmark (e.g. SPY) normalized to % change
- **AI Recommendation** — composite score from RSI + MACD + LSTM trend + news sentiment
- **News feed** — color-coded by sentiment (green/red/yellow)
- **5-day LSTM forecast** — displayed as dashed overlay on the chart

## Setup & Run

### 1. Create and activate a virtual environment
```bash
cd lstm_fixed
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```
> ⚠️ TensorFlow is ~600MB. First install takes a few minutes.

### 3. Run the server
```bash
python app.py
```

### 4. Open in browser
```
http://localhost:5000
```

## Usage
1. Type a ticker (e.g. `AAPL`) in the search bar → select from dropdown
2. Optionally click **Compare** to add a benchmark ticker
3. Choose a period (1M / 6M / 1Y / 2Y)
4. Click **Run Analysis**
5. Toggle between **Candle** and **Line** chart modes
6. View AI recommendation, LSTM forecast, and news in the bottom panel

> **Note:** The first Run Analysis for a new ticker trains the LSTM model (~20–30 seconds). Subsequent runs load the cached `.h5` model instantly.

## Project Structure
```
lstm_fixed/
├── app.py           ← Flask server + API routes
├── lstm_model.py    ← Keras LSTM training & prediction
├── requirements.txt
├── data/
│   └── tickers.csv  ← 200+ tickers for autocomplete
├── models/          ← Cached .h5 model files (auto-created)
└── static/
    ├── index.html
    ├── style.css
    └── script.js
```
