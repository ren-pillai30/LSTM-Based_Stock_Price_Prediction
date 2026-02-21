from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI()

# Mount the static directory
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_index():
    return FileResponse('static/index.html')

@app.get("/api/predict/{ticker}")
async def predict(ticker: str):
    # This is where your actual LSTM logic will integrate later
    return {"ticker": ticker, "status": "Ready for model integration"}
