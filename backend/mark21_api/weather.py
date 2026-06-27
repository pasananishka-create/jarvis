from mark21_api.location import get_city_by_ip
import os, requests
from pathlib import Path

BASE = Path(__file__).parent.parent
ENV_FILE = BASE / ".env"

def _get_api_key():
    try:
        with open(ENV_FILE) as f:
            for line in f:
                if line.startswith("WEATHER_API_KEY="):
                    return line.strip().split("=", 1)[1]
    except:
        pass
    return os.getenv("WEATHER_API_KEY") or ""

API_KEY = _get_api_key()

def get_weather():
    city = get_city_by_ip()
    try:
        url = f"https://api.openweathermap.org/data/2.5/weather?q={city}&appid={API_KEY}&units=metric"
        res = requests.get(url).json()
        if res.get("cod") != 200:
            return "Weather unavailable"
        temp = res["main"]["temp"]
        feels = res["main"]["feels_like"]
        hum = res["main"]["humidity"]
        desc = res["weather"][0]["description"].title()
        if "rain" in desc.lower():
            desc = "🌧️ " + desc
        elif "cloud" in desc.lower():
            desc = "☁️ " + desc
        elif "sun" in desc.lower():
            desc = "☀️ " + desc
        else:
            desc = "🌤️ " + desc
        return f"🌡️{city}: {temp}°C\nFeels:{feels}, Humid:{hum}\n{desc}"
    except Exception as e:
        print(f"Weather API error: {e}")
        return "Weather unavailable"
