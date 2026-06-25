from abc import ABC, abstractmethod
from typing import Any


class Ability(ABC):
    """Base class for all Jarvis abilities (plugins)."""

    @property
    @abstractmethod
    def name(self) -> str:
        ...

    @property
    @abstractmethod
    def description(self) -> str:
        ...

    @abstractmethod
    def parameters(self) -> dict:
        """Return the JSON schema for this ability's parameters."""
        ...

    async def execute(self, **kwargs) -> str:
        """Execute the ability with given parameters. Return a string response."""
        return await self.run(**kwargs)

    @abstractmethod
    async def run(self, **kwargs) -> str:
        ...

    def to_tool_definition(self) -> dict:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters(),
            },
        }
