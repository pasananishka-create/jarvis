import json
from abilities.base import Ability


class WebSearch(Ability):
    @property
    def name(self):
        return "web_search"

    @property
    def description(self):
        return "Search the web for current information. Use this for news, facts, recent events, or any question about the outside world."

    def parameters(self):
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query string",
                },
                "num_results": {
                    "type": "integer",
                    "description": "Number of results to return (default 5)",
                    "default": 5,
                },
            },
            "required": ["query"],
        }

    async def run(self, query: str, num_results: int = 5) -> str:
        try:
            from duckduckgo_search import DDGS
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=num_results))
            if not results:
                return "No results found."
            lines = []
            for i, r in enumerate(results[:num_results], 1):
                title = r.get("title", "No title")
                href = r.get("href", "")
                snippet = r.get("body", "")
                lines.append(f"{i}. {title}\n   {href}\n   {snippet}")
            return "\n\n".join(lines)
        except ImportError:
            return "DuckDuckGo search not available. Install: pip install duckduckgo-search"
        except Exception as e:
            return f"Search error: {e}"
