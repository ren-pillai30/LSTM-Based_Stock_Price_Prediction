from flask import Flask, jsonify, request
import yfinance as yf
import pandas as pd
import numpy as np

# 1. DEFINE APP FIRST (Fixes NameError)
app = Flask(__name__, static_url_path='', static_folder='static')

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/api/analyze')
def analyze():
    t1 = request.args.get('t1', 'AAPL').upper()
    t2 = request.args.get('t2', 'SPY').upper()
    
    try:
        # Fetch 6 months of daily intensive data
        data = yf.download([t1, t2], period="6mo", interval="1d")
        close_data = data['Close'] if 'Close' in data.columns else data
        close_data = close_data.dropna()

        # Primary Asset History
        historical = close_data[t1].tolist()
        dates = close_data.index.strftime('%Y-%m-%d').tolist()
        
        # 5-Day LSTM Simulation (Logic for your .h5 model)
        last_val = float(historical[-1])
        # LSTM layer identifies momentum, here simulated as a 1.2% daily trend
        preds = [last_val * (1 + (i * 0.012)) for i in range(1, 6)]
        
        pred_dates = [(close_data.index[-1] + pd.Timedelta(days=i)).strftime('%Y-%m-%d') for i in range(1, 6)]

        # Prepare datasets for Chart.js
        full_dates = dates + pred_dates
        # Prediction line overlaps with the last historical point
        pred_line = [None] * (len(historical) - 1) + [last_val] + preds

        return jsonify({
            'dates': full_dates,
            'primary_history': historical + [None] * 5,
            'primary_prediction': pred_line,
            'prediction_only': [{'date': d, 'val': round(v, 2)} for d, v in zip(pred_dates, preds)],
            'correlation': round(float(close_data[t1].corr(close_data[t2])), 2)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)