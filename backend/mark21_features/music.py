import os
import pygame
import random

MUSIC_FOLDER = r"C:\Users\akhil\Music"  # Update path if needed
music_files = []

def load_music_from(folder=MUSIC_FOLDER):
    global music_files
    if not os.path.exists(folder):
        return False
    pygame.mixer.init()
    music_files.clear()
    for file in os.listdir(folder):
        if file.endswith(".mp3"):
            music_files.append(os.path.join(folder, file))
    return bool(music_files)

def play_music():
    if music_files:
        pygame.mixer.music.load(music_files[0])
        pygame.mixer.music.play()

def pause_music():
    pygame.mixer.music.pause()

def resume_music():
    pygame.mixer.music.unpause()

def stop_music():
    pygame.mixer.music.stop()

def next_song():
    if music_files:
        current = music_files.pop(0)
        music_files.append(current)
        pygame.mixer.music.load(music_files[0])
        pygame.mixer.music.play()

def shuffle_music():
    random.shuffle(music_files)
    play_music()
