from rich.console import Console
from rich.panel import Panel
from rich.text import Text

BANNER = r"""
   ___                 _     _   ___                 _
  |_  |               (_)   | | / (_)               | |
    | | __ ___  __   ___  __| |/ / _ _ __   ___  ___| |_
    | |/ _` \ \/ /  | \ \/ /' |\ \| | '_ \ / _ \/ __| __|
/\__/ / (_| |>  <   | |>  <| |_\ \ | | | | (_) \__ \ |_
\____/ \__,_/_/\_\  |_/_/\_\\__,_/_/_|_| |_|\___/|___/\__|
"""

TAGLINE = "Your Personal AI Assistant"
VERSION = "1.0.0"


def print_banner(console: Console | None = None):
    c = console or Console()
    logo = Text(BANNER, style="bold cyan")
    tagline = Text(f"  {TAGLINE}  v{VERSION}", style="dim white")
    c.print(Panel(logo, subtitle=tagline, border_style="bright_blue"))
