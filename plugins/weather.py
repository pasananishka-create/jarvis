"""Example plugin: Weather ability for Jarvis.

Register it in main.py or import it into the assistant.
Usage: pip install requests
"""

from abilities.base import Ability


class GetWeather(Ability):
    @property
    def name(self):
        return "get_weather"

    @property
    def description(self):
        return "Get current weather for a city. Example: 'What's the weather in London?'"

    def parameters(self):
        return {
            "type": "object",
            "properties": {
                "city": {
                    "type": "string",
                    "description": "City name (e.g., 'Tokyo', 'New York')",
                },
            },
            "required": ["city"],
        }

    async def run(self, city: str) -> str:
        try:
            import requests
            url = f"https://wttr.in/{city}?format=%C+%t+%w+%h"
            resp = requests.get(url, timeout=10)
            if resp.status_code == 200:
                return f"Weather in {city}: {resp.text.strip()}"
            return f"Could not fetch weather for {city}."
        except ImportError:
            return "requests library not installed. Run: pip install requests"
        except Exception as e:
            return f"Weather error: {e}"
