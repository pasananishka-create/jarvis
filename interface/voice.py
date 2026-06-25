"""Voice interface for Jarvis.

Requires additional dependencies:
  pip install speechrecognition pyttsx3 pyaudio

For wake word detection (optional):
  pip install pvporcupine
"""

import asyncio
import logging
from config import Config

logger = logging.getLogger("jarvis.voice")


class VoiceInterface:
    def __init__(self, assistant):
        self.assistant = assistant
        self.recognizer = None
        self.engine = None
        self.listening = False
        self._init_engine()

    def _init_engine(self):
        try:
            import speech_recognition as sr
            self.recognizer = sr.Recognizer()
        except ImportError:
            logger.warning("speechrecognition not installed. Voice input disabled.")

        try:
            import pyttsx3
            self.engine = pyttsx3.init()
            self.engine.setProperty("rate", 180)
        except ImportError:
            logger.warning("pyttsx3 not installed. Voice output disabled.")

    def speak(self, text: str):
        if self.engine:
            try:
                self.engine.say(text)
                self.engine.runAndWait()
                return
            except Exception:
                pass
        print(text)

    def listen(self, timeout: int = 5) -> str:
        if not self.recognizer:
            return ""
        try:
            import speech_recognition as sr
            with sr.Microphone() as source:
                self.recognizer.adjust_for_ambient_noise(source, duration=0.5)
                audio = self.recognizer.listen(source, timeout=timeout, phrase_time_limit=10)
                text = self.recognizer.recognize_google(audio)
                return text.lower()
        except sr.WaitTimeoutError:
            return ""
        except sr.UnknownValueError:
            return ""
        except Exception as e:
            logger.debug("Listen error: %s", e)
            return ""

    async def run(self):
        self.speak("Jarvis online and ready.")
        print("Voice mode active. Press Ctrl+C to stop.\n")

        while True:
            try:
                user_input = await asyncio.to_thread(self.listen, timeout=3)
                if not user_input:
                    continue
                print(f"You: {user_input}")
                response = await self.assistant.process_message(user_input)
                print(f"Jarvis: {response}")
                self.speak(response)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Voice loop error: %s", e)
