from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import yfinance as yf
import pandas as pd
import numpy as np

# FIX: Define app before using decorators
app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_index():
    return FileResponse('static/index.html')

@app.get("/api/predict/{ticker}")
async def get_analytics(ticker: str):
    try:
        stock = yf.Ticker(ticker)
        # Fetch 60 days to calculate technical metrics like Volatility
        df = stock.history(period="60d")
        
        if df.empty:
            return {"error": "Invalid Ticker"}

        curr_price = round(df['Close'].iloc[-1], 2)
        
        # Professional Nomenclature Calculations
        # Volatility (Annualized Standard Deviation)
        vol = round(df['Close'].pct_change().std() * np.sqrt(252) * 100, 1)
        # Support/Resistance based on 20-day window
        support = round(df['Close'].tail(20).min(), 2)
        resistance = round(df['Close'].tail(20).max(), 2)

        # Generate Candlestick OHLC Data
        ohlc = []
        for index, row in df.tail(30).iterrows():
            ohlc.append({
                "time": index.strftime('%Y-%m-%d'),
                "open": round(row['Open'], 2),
                "high": round(row['High'], 2),
                "low": round(row['Low'], 2),
                "close": round(row['Close'], 2)
            })

        return {
            "price": f"{curr_price:,}",
            "prediction": f"{round(curr_price * 1.02, 2):,}",
            "volatility": f"{vol}%",
            "support": f"${support}",
            "resistance": f"${resistance}",
            "ohlc": ohlc
        }
    except Exception as e:
        return {"error": str(e)}