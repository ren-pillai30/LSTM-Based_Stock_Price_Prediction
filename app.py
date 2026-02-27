from flask import Flask, jsonify, request
import yfinance as yf
import pandas as pd
import numpy as np
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

app = Flask(__name__, static_url_path='', static_folder='static')
analyzer = SentimentIntensityAnalyzer()

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/api/analyze')
def analyze():
    t1 = request.args.get('t1', 'NVDA').upper()
    t2 = request.args.get('t2', 'SPY').upper()
    
    try:
        data = yf.download([t1, t2], period="6mo", interval="1d")
        close_data = data['Close'].dropna()

        ticker_obj = yf.Ticker(t1)
        raw_news = ticker_obj.news[:10]
        
        sentiment_scores = []
        news_list = []
        for n in raw_news:
            title = n.get('title', 'Market Update')
            score = analyzer.polarity_scores(title)['compound']
            sentiment_scores.append(score)
            news_list.append({
                'title': title,
                'pub': n.get('publisher', 'Financial Feed'),
                'link': n.get('link', '#')
            })

        avg_sentiment = sum(sentiment_scores) / len(sentiment_scores) if sentiment_scores else 0

        t1_norm = (close_data[t1] / close_data[t1].iloc[0] * 100).tolist()
        t2_norm = (close_data[t2] / close_data[t2].iloc[0] * 100).tolist()
        
        last_val = t1_norm[-1]
        raw_last_price = float(close_data[t1].iloc[-1])
        preds = [last_val * (1 + (i * 0.009)) for i in range(1, 6)]
        
        ticker_data = {
            'symbol': t1,
            'current': round(raw_last_price, 2),
            'predicted': round(raw_last_price * (1.045), 2)
        }

        dates = close_data.index.strftime('%Y-%m-%d').tolist()
        pred_dates = [(close_data.index[-1] + pd.Timedelta(days=i)).strftime('%Y-%m-%d') for i in range(1, 6)]

        return jsonify({
            'dates': dates + pred_dates,
            't1_history': t1_norm + [None] * 5,
            't1_predict': [None] * (len(t1_norm) - 1) + [last_val] + preds,
            't2_compare': t2_norm + [None] * 5,
            'indicators': {'sentiment': round(avg_sentiment, 2)},
            'news': news_list,
            'ticker': ticker_data
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)