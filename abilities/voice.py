import asyncio
import io
import logging
import os
import tempfile
import wave
from pathlib import Path

from abilities.base import Ability

logger = logging.getLogger("jarvis.voice")


class RecordAudio(Ability):
    @property
    def name(self):
        return "record_audio"

    @property
    def description(self):
        return "Record audio from the microphone and transcribe it to text using speech recognition."

    def parameters(self):
        return {
            "type": "object",
            "properties": {
                "duration": {
                    "type": "integer",
                    "description": "Recording duration in seconds (default: 5, max: 30)",
                    "default": 5,
                },
                "language": {
                    "type": "string",
                    "description": "Language code (default: en-US)",
                    "default": "en-US",
                },
            },
            "required": [],
        }

    async def run(self, duration: int = 5, language: str = "en-US") -> str:
        try:
            import sounddevice as sd
            import numpy as np
            import speech_recognition as sr
        except ImportError as e:
            return f"Voice input unavailable: missing dependency ({e}). Install: pip install sounddevice SpeechRecognition numpy"

        duration = max(1, min(duration, 30))
        logger.info("Recording for %ds...", duration)

        try:
            sample_rate = 16000
            recording = sd.rec(
                int(duration * sample_rate),
                samplerate=sample_rate,
                channels=1,
                dtype="int16",
            )
            sd.wait()
        except Exception as e:
            return f"Microphone error: {e}. Check that your mic is connected and not in use."

        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            wf.writeframes(recording.tobytes())
        buffer.seek(0)

        recognizer = sr.Recognizer()
        with sr.AudioFile(buffer) as source:
            audio = recognizer.record(source)

        try:
            text = recognizer.recognize_google(audio, language=language)
            logger.info("Transcribed: %s", text)
            return text
        except sr.UnknownValueError:
            return "[No speech detected]"
        except sr.RequestError as e:
            return f"Speech recognition service error: {e}"


class SpeakText(Ability):
    @property
    def name(self):
        return "speak_text"

    @property
    def description(self):
        return "Speak text aloud through the system speakers using text-to-speech."

    def parameters(self):
        return {
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "The text to speak aloud",
                },
            },
            "required": ["text"],
        }

    async def run(self, text: str) -> str:
        if not text or not text.strip():
            return "Nothing to speak."

        try:
            import pyttsx3

            def _speak():
                engine = pyttsx3.init()
                engine.say(text)
                engine.runAndWait()

            await asyncio.to_thread(_speak)
            return f"Spoken: {text[:100]}{'...' if len(text) > 100 else ''}"
        except ImportError:
            pass
        except Exception as e:
            logger.warning("pyttsx3 failed: %s", e)

        try:
            import edge_tts
            import pygame

            tmp = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
            tmp_path = tmp.name
            tmp.close()

            communicate = edge_tts.Communicate(text=text, voice="en-US-JennyNeural")
            await communicate.save(tmp_path)

            def _play():
                pygame.mixer.init()
                pygame.mixer.music.load(tmp_path)
                pygame.mixer.music.play()
                while pygame.mixer.music.get_busy():
                    import time
                    time.sleep(0.1)
                pygame.mixer.quit()
                os.unlink(tmp_path)

            await asyncio.to_thread(_play)
            return f"Spoken: {text[:100]}{'...' if len(text) > 100 else ''}"
        except ImportError:
            return "TTS unavailable: install pyttsx3 or edge-tts + pygame"
        except Exception as e:
            return f"TTS error: {e}"
