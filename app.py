from flask import Flask, jsonify, send_from_directory
import yfinance as yf
import pandas as pd
import numpy as np
import os

# Define the app first to prevent NameErrors
app = Flask(__name__)

# Serve the main dashboard
@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

# Serve CSS and JS files
@app.route('/static/<path:path>')
def send_static(path):
    return send_from_directory('static', path)

@app.get("/api/predict/<ticker>")
def get_analytics(ticker):
    try:
        stock = yf.Ticker(ticker)
        # Fetch 60 days of data
        df = stock.history(period="60d")
        
        if df.empty:
            return jsonify({"error": "Invalid Ticker"}), 404

        curr_price = round(df['Close'].iloc[-1], 2)
        
        # Professional Nomenclature (Volatility & Support/Resistance)
        vol = round(df['Close'].pct_change().std() * np.sqrt(252) * 100, 1)
        support = round(df['Close'].tail(20).min(), 2)
        resistance = round(df['Close'].tail(20).max(), 2)

        # Generate OHLC data for the Lightweight Charts library
        ohlc = []
        for index, row in df.tail(30).iterrows():
            ohlc.append({
                "time": index.strftime('%Y-%m-%d'),
                "open": round(row['Open'], 2),
                "high": round(row['High'], 2),
                "low": round(row['Low'], 2),
                "close": round(row['Close'], 2)
            })

        return jsonify({
            "price": f"{curr_price:,}",
            "prediction": f"{round(curr_price * 1.02, 2):,}",
            "volatility": f"{vol}%",
            "support": f"${support}",
            "resistance": f"${resistance}",
            "ohlc": ohlc
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=8000, debug=True)
