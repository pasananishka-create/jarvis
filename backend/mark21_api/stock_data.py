import os, requests
from pathlib import Path

BASE = Path(__file__).parent.parent
ENV_FILE = BASE / ".env"

def _get_env(key):
    try:
        with open(ENV_FILE) as f:
            for line in f:
                if line.startswith(key + "="):
                    return line.strip().split("=", 1)[1]
    except:
        pass
    return os.getenv(key) or ""

AV_KEY = _get_env("ALPHA_VANTAGE_KEY")
FINNHUB_KEY = _get_env("FINNHUB_API_KEY")

STOCKS = {
    "RELIANCE": "RELIANCE",
    "TCS": "TCS",
    "HDFC": "HDFCBANK",
    "ICICI": "ICICIBANK",
    "SBIN": "SBIN"
}

def get_stock_price(symbol):
    try:
        url = f"https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={symbol}&apikey={AV_KEY}"
        data = requests.get(url).json()
        quote = data["Global Quote"]
        price = float(quote["05. price"])
        change = float(quote["09. change"])
        pct = float(quote["10. change percent"].replace('%', ''))
        emoji = "▲" if change > 0 else "▼" if change < 0 else "➖"
        return {"symbol": symbol.split(':')[-1], "price": price, "change": change, "pct": pct, "emoji": emoji}
    except Exception as e:
        print(f"AlphaVantage error for {symbol}: {e}")
        return get_stock_price_finnhub(symbol.replace("NSE:", "") + ".NS")

def get_stock_price_finnhub(symbol):
    try:
        url = f"https://finnhub.io/api/v1/quote?symbol={symbol}&token={FINNHUB_KEY}"
        data = requests.get(url).json()
        price = float(data["c"])
        change = float(data["d"])
        pct = float(data["dp"])
        emoji = "▲" if change > 0 else "▼" if change < 0 else "➖"
        return {"symbol": symbol.replace('.NS',''), "price": price, "change": change, "pct": pct, "emoji": emoji}
    except Exception as e:
        print(f"Finnhub error for {symbol}: {e}")
        return {"symbol": symbol.replace('.NS',''), "price": 0, "change": 0, "pct": 0, "emoji": "❌"}

def get_gold_price_inr():
    try:
        url = f"https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=XAU&to_currency=INR&apikey={AV_KEY}"
        data = requests.get(url).json()
        rate = float(data["Realtime Currency Exchange Rate"]["5. Exchange Rate"])
        return {"name": "Gold (24k)", "price": rate, "unit": "INR/gm"}
    except Exception as e:
        print(f"Gold price error: {e}")
        return {"name": "Gold (24k)", "price": 0, "unit": "INR/gm", "error": True}

def get_market_data():
    stocks = []
    for name, symbol in STOCKS.items():
        stocks.append(get_stock_price(symbol))
    gold = get_gold_price_inr()
    return {"stocks": stocks, "gold": gold}
