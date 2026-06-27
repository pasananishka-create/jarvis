import requests

def get_city_by_ip():
    try:
        response = requests.get("http://ip-api.com/json/", timeout=5)
        data = response.json()
        return data.get("city", "New York")
    except:
        return "New York"
