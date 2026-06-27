import os, json

CONFIG_FILE = os.path.join("DATA", "config.json")

# 🔁 Load config from file
def load_config():
    if not os.path.exists(CONFIG_FILE):
        return {} # Create empty config if file doesn't exist
    with open(CONFIG_FILE, "r") as f:
        return json.load(f)

# 💾 Save config to file
def save_config(config):
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)

# ✅ Get TTS status
def is_tts_enabled():
    config = load_config()

    return config.get("tts_enabled", True)  # Default = True

# 🔄 Toggle TTS status
def toggle_tts():
    config = load_config()
    current = config.get("tts_enabled", True)
    config["tts_enabled"] = not current
    save_config(config)
    print(f"TTS is now {'enabled' if config['tts_enabled'] else 'disabled'}")#Debugging output
    
    return config["tts_enabled"]  # Return new state
