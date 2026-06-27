# Plugin Base Format (every plugin should have this)

#def run_calculator(command_text, output_widget):
   # output_widget.insert("end", "🧮 Calculator plugin coming soon!\n")
   # output_widget.see("end")

# plugins/calculator.py

import re
from voice.tts import speak

def register():
    return {
        "trigger": "calculator",
        "description": "Performs math calculations",
        "run": run_calculator
    }

def run_calculator(command, output_widget):
    result = perform_calculation(command)

    if result is not None:
        response = f"Result: {result}"
    else:
        response = "⚠️ Sorry, I couldn’t calculate that."

    output_widget.insert("end", response + "\n")
    output_widget.see("end")
    speak(response)


def perform_calculation(command):
    expression = command.lower()

    # Handle specific English phrases manually
    if "subtract" in expression and "from" in expression:
        try:
            parts = re.findall(r'\d+', expression)
            if len(parts) == 2:
                return int(parts[1]) - int(parts[0])
        except:
            return None

    if "divide" in expression and "by" in expression:
        try:
            parts = re.findall(r'\d+', expression)
            if len(parts) == 2:
                return int(parts[0]) / int(parts[1])
        except:
            return None


    # 1️⃣ Handle: "increase A by B%"
    inc_match = re.search(r'increase (\d+(?:\.\d+)?) by (\d+(?:\.\d+)?)%', expression)
    if inc_match:
        base = float(inc_match.group(1))
        percent = float(inc_match.group(2))
        return base + (base * percent / 100)

    # 2️⃣ Handle: "decrease A by B%"
    dec_match = re.search(r'decrease (\d+(?:\.\d+)?) by (\d+(?:\.\d+)?)%', expression)
    if dec_match:
        base = float(dec_match.group(1))
        percent = float(dec_match.group(2))
        return base - (base * percent / 100)

    # 3️⃣ Handle: "X% of Y"
    of_match = re.search(r'(\d+(?:\.\d+)?)% of (\d+(?:\.\d+)?)', expression)
    if of_match:
        percent = float(of_match.group(1))
        base = float(of_match.group(2))
        return (percent / 100) * base

    # 4️⃣ Handle: "A plus B%" → 100 + 10% = 110
    plus_percent = re.search(r'(\d+(?:\.\d+)?) plus (\d+(?:\.\d+)?)%', expression)
    if plus_percent:
        base = float(plus_percent.group(1))
        percent = float(plus_percent.group(2))
        return base + (base * percent / 100)

    # 5️⃣ Replace keyword math
    replacements = {
        "plus": "+", "add": "+",
        "minus": "-", "subtract": "-",
        "times": "*", "multiply": "*",
        "divided by": "/", "divide": "/",
        "mod": "%", "modulus": "%",
        "power": "**"
    }
    for word, symbol in replacements.items():
        expression = expression.replace(word, symbol)

    # 6️⃣ Extract standard math expressions
    match = re.findall(r'[-+*/%()0-9.\s]+', expression)
    if match:
        try:
            clean_expr = "".join(match).strip()
            return eval(clean_expr)
        except:
            return None
    return None
