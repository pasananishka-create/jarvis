import logging
import os
import tempfile
from pathlib import Path

from abilities.base import Ability

logger = logging.getLogger("jarvis.screen")


class ScreenCapture(Ability):
    @property
    def name(self):
        return "screen_capture"

    @property
    def description(self):
        return "Capture the screen contents. Returns a description of the captured image (path, dimensions, size). Useful for understanding what the user sees."

    def parameters(self):
        return {
            "type": "object",
            "properties": {
                "monitor": {
                    "type": "integer",
                    "description": "Monitor index to capture (0 = primary, default: 0)",
                    "default": 0,
                },
            },
            "required": [],
        }

    async def run(self, monitor: int = 0) -> str:
        try:
            import mss
            from PIL import Image
        except ImportError as e:
            return f"Screen capture unavailable: missing dependency ({e}). Install: pip install mss Pillow"

        try:
            with mss.mss() as sct:
                monitors = sct.monitors
                if monitor < 0 or monitor >= len(monitors):
                    return f"Monitor {monitor} not found. Available: 0-{len(monitors) - 1}"
                mon = monitors[monitor]

                screenshot = sct.grab(mon)
                img = Image.frombytes("RGB", screenshot.size, screenshot.rgb)

                tmp_dir = Path(tempfile.gettempdir()) / "jarvis"
                tmp_dir.mkdir(parents=True, exist_ok=True)
                tmp_path = tmp_dir / f"screenshot_{monitor}.png"
                img.save(tmp_path)

                width, height = img.size
                file_size = tmp_path.stat().st_size

                logger.info("Screen captured: %dx%d, %d bytes -> %s", width, height, file_size, tmp_path)
                return f"Screen captured: {width}x{height}px, {file_size // 1024}KB, saved to {tmp_path}"
        except Exception as e:
            return f"Screen capture error: {e}"
