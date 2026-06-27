import requests, os
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

NEWS_API_KEY = _get_env("NEWS_API_KEY")

def get_newsapi_articles():
    try:
        url = f"https://newsapi.org/v2/top-headlines?category=technology&country=us&apiKey={NEWS_API_KEY}"
        res = requests.get(url).json()
        if res.get("status") != "ok":
            raise Exception("NewsAPI error")
        articles = []
        for item in res["articles"][:5]:
            articles.append({"title": item["title"], "source": item["source"]["name"]})
        return articles
    except:
        raise Exception("NewsAPI failed")

def get_hackernews_articles():
    try:
        ids = requests.get("https://hacker-news.firebaseio.com/v0/topstories.json").json()
        articles = []
        for story_id in ids[:5]:
            story = requests.get(f"https://hacker-news.firebaseio.com/v0/item/{story_id}.json").json()
            articles.append({"title": story.get("title", "No title"), "source": "HackerNews"})
        return articles
    except:
        return [{"title": "Couldn't load backup news", "source": "Error"}]
