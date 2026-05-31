import random
from flask import Flask, render_template, jsonify, request, session

app = Flask(__name__)
app.secret_key = "slot_machine_secret_key_2024"

# ─── Game Constants (unchanged from original) ───────────────────────────────
MAX_LINES = 3
MIN_BET = 1
MAX_BET = 100
ROWS = 3
COLS = 3

symbol_count = {
    "A": 2,
    "B": 4,
    "C": 6,
    "D": 8
}

symbol_value = {
    "A": 5,
    "B": 4,
    "C": 3,
    "D": 2
}

# Symbol display mapping for the frontend
symbol_display = {
    "A": "💎",
    "B": "🔔",
    "C": "🍋",
    "D": "🍒"
}

# ─── Original Game Logic (100% unchanged) ───────────────────────────────────

def check_winnings(columns, lines, bet, values):
    winnings = 0
    winning_lines = []
    for line in range(lines):
        symbol = columns[0][line]
        for column in columns:
            symbol_to_check = column[line]
            if symbol != symbol_to_check:
                break
        else:
            winnings += values[symbol] * bet
            winning_lines.append(line + 1)
    return winnings, winning_lines


def get_slot_machine_spin(rows, cols, symbols):
    all_symbols = []
    for symbol, symbol_count in symbols.items():
        for _ in range(symbol_count):
            all_symbols.append(symbol)

    columns = []
    for _ in range(cols):
        column = []
        current_symbols = all_symbols[:]
        for _ in range(rows):
            value = random.choice(current_symbols)
            current_symbols.remove(value)
            column.append(value)
        columns.append(column)
    return columns


# ─── Flask Routes ────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html",
                           min_bet=MIN_BET,
                           max_bet=MAX_BET,
                           max_lines=MAX_LINES)


@app.route("/deposit", methods=["POST"])
def deposit():
    data = request.get_json()
    amount = data.get("amount", 0)
    try:
        amount = int(amount)
        if amount <= 0:
            return jsonify({"success": False, "error": "Amount must be greater than 0."})
    except (ValueError, TypeError):
        return jsonify({"success": False, "error": "Please enter a valid number."})

    session["balance"] = amount
    session["stats"] = {
        "spins": 0,
        "total_won": 0,
        "total_bet": 0,
        "biggest_win": 0
    }
    return jsonify({"success": True, "balance": amount})


@app.route("/spin", methods=["POST"])
def spin():
    if "balance" not in session:
        return jsonify({"success": False, "error": "Please deposit funds first."})

    data = request.get_json()
    try:
        lines = int(data.get("lines", 1))
        bet = int(data.get("bet", MIN_BET))
    except (ValueError, TypeError):
        return jsonify({"success": False, "error": "Invalid bet or lines value."})

    # Validation (mirrors original logic)
    if not (1 <= lines <= MAX_LINES):
        return jsonify({"success": False, "error": f"Lines must be between 1 and {MAX_LINES}."})
    if not (MIN_BET <= bet <= MAX_BET):
        return jsonify({"success": False, "error": f"Bet must be between ${MIN_BET} and ${MAX_BET}."})

    balance = session["balance"]
    total_bet = bet * lines

    if total_bet > balance:
        return jsonify({"success": False,
                        "error": f"Not enough balance. You have ${balance} but need ${total_bet}."})

    # Run the spin (original logic)
    slots = get_slot_machine_spin(ROWS, COLS, symbol_count)
    winnings, winning_lines = check_winnings(slots, lines, bet, symbol_value)

    balance -= total_bet
    balance += winnings
    session["balance"] = balance

    # Update stats
    stats = session.get("stats", {"spins": 0, "total_won": 0, "total_bet": 0, "biggest_win": 0})
    stats["spins"] += 1
    stats["total_bet"] += total_bet
    stats["total_won"] += winnings
    if winnings > stats["biggest_win"]:
        stats["biggest_win"] = winnings
    session["stats"] = stats

    # Convert columns to emoji grid for frontend
    grid = []
    for row in range(ROWS):
        grid_row = []
        for col in range(COLS):
            sym = slots[col][row]
            grid_row.append({
                "symbol": sym,
                "emoji": symbol_display[sym],
                "value": symbol_value[sym]
            })
        grid.append(grid_row)

    net = winnings - total_bet
    return jsonify({
        "success": True,
        "grid": grid,
        "winnings": winnings,
        "winning_lines": winning_lines,
        "total_bet": total_bet,
        "net": net,
        "balance": balance,
        "stats": stats
    })


@app.route("/stats")
def get_stats():
    stats = session.get("stats", None)
    balance = session.get("balance", None)
    if stats is None:
        return jsonify({"success": False})
    rtp = round((stats["total_won"] / stats["total_bet"] * 100), 1) if stats["total_bet"] > 0 else 0
    return jsonify({"success": True, "stats": stats, "balance": balance, "rtp": rtp})


if __name__ == "__main__":
    app.run(debug=True)
