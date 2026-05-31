# 🎰 NeonSlots — Flask Casino Web App

A professional casino-style slot machine game converted from a Python terminal app to a full Flask web application.

---

## 📁 Project Structure

```
slot_machine/
│
├── app.py                   ← Flask backend (game logic lives here)
│
├── templates/
│   └── index.html           ← Single-page frontend (Jinja2 template)
│
├── static/
│   ├── css/
│   │   └── style.css        ← Dark neon casino theme
│   └── js/
│       └── script.js        ← Spin animations, confetti, sound effects
│
├── requirements.txt         ← Python dependencies
└── README.md                ← This file
```

---

## ⚙️ How to Run Locally

### 1. Create and activate a virtual environment (recommended)

```bash
python -m venv venv

# On Windows:
venv\Scripts\activate

# On macOS/Linux:
source venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Run the Flask development server

```bash
python app.py
```

### 4. Open in your browser

```
http://127.0.0.1:5000
```

---

## 🎮 How to Play

1. **Deposit** — Enter a starting balance on the welcome screen.
2. **Choose lines** — Bet on 1, 2, or 3 lines using the stepper controls.
3. **Choose bet** — Set your bet per line ($1–$100).
4. **SPIN** — Hit the glowing spin button!
5. **Win** — Match symbols across any active line to win. Multipliers:
   - 💎 Diamond = ×5
   - 🔔 Bell = ×4
   - 🍋 Lemon = ×3
   - 🍒 Cherry = ×2

---

## 🧠 Code Architecture

| File | Purpose |
|------|---------|
| `app.py` | Flask routes + original Python game logic (100% unchanged) |
| `index.html` | Two-screen UI (deposit → game). Jinja2 injects config constants |
| `style.css` | Dark neon theme using CSS variables, Orbitron font, keyframe animations |
| `script.js` | Fetches `/spin` and `/deposit` via JSON API. Handles spin animation, confetti, Web Audio |

### API Endpoints

| Route | Method | Description |
|-------|--------|-------------|
| `/` | GET | Renders the main page |
| `/deposit` | POST | `{ amount }` → sets session balance |
| `/spin` | POST | `{ lines, bet }` → runs a spin, returns grid + winnings |
| `/stats` | GET | Returns session stats (spins, won, RTP) |

---

## ✨ Features

- ⚡ Dark neon UI with Orbitron font
- 🎰 Animated reel shuffle on every spin
- 🏆 Win banner with random celebration messages
- 🎊 Confetti burst on wins
- 🔊 Web Audio API sound effects (win jingle / lose tone)
- 📊 Live stats: spins, total won, RTP %
- 💡 Line indicators that light up on wins
- 📱 Fully responsive (mobile-friendly)
- 🌌 Animated background particles

---

## 🔧 Original Game Logic (Preserved)

The following functions from the terminal app are used **unchanged** in `app.py`:
- `get_slot_machine_spin()` — random symbol generation
- `check_winnings()` — line-by-line win checking
- `symbol_count` / `symbol_value` — probability & payout tables

Only the input/output layer changed: `input()` → HTTP JSON request, `print()` → JSON response.
