/* ═══════════════════════════════════════════════════════════
   NeonSlots — Frontend JS
   Handles: spin animation · confetti · sound · UI state
═══════════════════════════════════════════════════════════ */

// ─── State ───────────────────────────────────────────────
let lines = 1;
let bet = 1;
const MIN_BET = 1;
const MAX_BET = 100;
const MAX_LINES = 3;

const SYMBOLS = ['💎', '🔔', '🍋', '🍒', '❓'];
const SPIN_DURATION = 1600; // ms

// ─── DOM refs ────────────────────────────────────────────
const depositScreen  = document.getElementById('depositScreen');
const gameScreen     = document.getElementById('gameScreen');
const depositAmtEl   = document.getElementById('depositAmount');
const depositErrEl   = document.getElementById('depositError');
const depositBtn     = document.getElementById('depositBtn');

const balanceDisplay = document.getElementById('balanceDisplay');
const headerBalance  = document.getElementById('headerBalance');
const headerBalAmt   = document.getElementById('headerBalanceAmt');
const lastWinEl      = document.getElementById('lastWin');
const netDisplayEl   = document.getElementById('netDisplay');

const linesDisplay   = document.getElementById('linesDisplay');
const betDisplay     = document.getElementById('betDisplay');
const totalBetEl     = document.getElementById('totalBetDisplay');

const linesDownBtn   = document.getElementById('linesDown');
const linesUpBtn     = document.getElementById('linesUp');
const betDownBtn     = document.getElementById('betDown');
const betUpBtn       = document.getElementById('betUp');
const spinBtn        = document.getElementById('spinBtn');
const resetBtn       = document.getElementById('resetBtn');

const reelsEl        = document.getElementById('reels');
const winBanner      = document.getElementById('winBanner');
const winText        = document.getElementById('winText');
const errorMsg       = document.getElementById('errorMsg');

const statSpins      = document.getElementById('statSpins');
const statWon        = document.getElementById('statWon');
const statRTP        = document.getElementById('statRTP');

// ─── Build background particles ──────────────────────────
(function buildParticles() {
  const container = document.getElementById('bgParticles');
  for (let i = 0; i < 60; i++) {
    const span = document.createElement('span');
    const size = Math.random() * 3 + 1;
    const colors = ['#00c8ff','#00ff88','#ff00cc','#ffd700','#9b59f4'];
    span.style.cssText = `
      left: ${Math.random() * 100}%;
      width: ${size}px; height: ${size}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      animation-duration: ${6 + Math.random() * 10}s;
      animation-delay: ${Math.random() * 8}s;
    `;
    container.appendChild(span);
  }
})();

// ─── Build initial reel grid ──────────────────────────────
function buildGrid() {
  reelsEl.innerHTML = '';
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const cell = document.createElement('div');
      cell.classList.add('reel-cell');
      cell.id = `cell-${r}-${c}`;
      cell.textContent = '❓';
      reelsEl.appendChild(cell);
    }
  }
}
buildGrid();

// ─── Update total bet display ─────────────────────────────
function updateTotals() {
  linesDisplay.textContent = lines;
  betDisplay.textContent   = `$${bet}`;
  totalBetEl.textContent   = `$${bet * lines}`;
  updateLineIndicators();
}
updateTotals();

function updateLineIndicators() {
  for (let i = 1; i <= MAX_LINES; i++) {
    const el = document.getElementById(`lineIndicator${i}`);
    if (!el) continue;
    el.classList.toggle('active', i <= lines);
    el.classList.remove('win-line');
  }
}

// ─── Stepper controls ────────────────────────────────────
linesDownBtn.addEventListener('click', () => { if (lines > 1) { lines--; updateTotals(); } });
linesUpBtn.addEventListener('click',   () => { if (lines < MAX_LINES) { lines++; updateTotals(); } });
betDownBtn.addEventListener('click',   () => { if (bet > MIN_BET) { bet = Math.max(MIN_BET, bet - 1); updateTotals(); } });
betUpBtn.addEventListener('click',     () => { if (bet < MAX_BET) { bet = Math.min(MAX_BET, bet + 1); updateTotals(); } });

// ─── Deposit ─────────────────────────────────────────────
depositBtn.addEventListener('click', async () => {
  const amount = parseInt(depositAmtEl.value, 10);
  depositErrEl.textContent = '';

  const res  = await fetch('/deposit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount })
  });
  const data = await res.json();

  if (!data.success) {
    depositErrEl.textContent = data.error;
    return;
  }

  updateBalanceDisplay(data.balance);
  depositScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  headerBalance.style.display = 'flex';
});

depositAmtEl.addEventListener('keydown', e => {
  if (e.key === 'Enter') depositBtn.click();
});

// ─── Spin ─────────────────────────────────────────────────
spinBtn.addEventListener('click', async () => {
  hideError();
  hideWin();
  spinBtn.disabled = true;

  // Animate reels
  startSpinAnimation();

  const res  = await fetch('/spin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lines, bet })
  });
  const data = await res.json();

  // Wait for visual spin to finish
  await sleep(SPIN_DURATION);
  stopSpinAnimation();

  if (!data.success) {
    showError(data.error);
    spinBtn.disabled = false;
    return;
  }

  renderGrid(data.grid);
  await sleep(120);
  highlightWinLines(data.winning_lines, data.grid);

  updateBalanceDisplay(data.balance);
  updateStats(data.stats);

  const net = data.net;
  netDisplayEl.textContent = (net >= 0 ? '+' : '') + `$${net}`;
  netDisplayEl.style.color = net > 0 ? 'var(--neon-green)' : net < 0 ? 'var(--neon-red)' : '';
  lastWinEl.textContent = `$${data.winnings}`;

  if (data.winnings > 0) {
    showWin(data.winnings, data.winning_lines);
    launchConfetti();
    playWinSound();
  } else {
    playLoseSound();
  }

  spinBtn.disabled = false;
});

// ─── Grid rendering ───────────────────────────────────────
function renderGrid(grid) {
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const cell = document.getElementById(`cell-${r}-${c}`);
      cell.classList.remove('win', 'spinning', 'highlight');
      cell.textContent = grid[r][c].emoji;
    }
  }
}

function highlightWinLines(winningLines, grid) {
  winningLines.forEach(lineNum => {
    const row = lineNum - 1; // 0-indexed
    for (let c = 0; c < 3; c++) {
      const cell = document.getElementById(`cell-${row}-${c}`);
      cell.classList.add('win');
    }
    const ind = document.getElementById(`lineIndicator${lineNum}`);
    if (ind) ind.classList.add('win-line');
  });
}

// ─── Spin animation ──────────────────────────────────────
function startSpinAnimation() {
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const cell = document.getElementById(`cell-${r}-${c}`);
      cell.classList.add('spinning');
      cell.classList.remove('win');
      animateCellShuffle(cell, c * 80); // stagger by column
    }
  }
}

function animateCellShuffle(cell, delay) {
  const interval = setInterval(() => {
    if (!cell.classList.contains('spinning')) {
      clearInterval(interval);
      return;
    }
    cell.textContent = SYMBOLS[Math.floor(Math.random() * (SYMBOLS.length - 1))];
  }, 80);
  cell._spinInterval = interval;
}

function stopSpinAnimation() {
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const cell = document.getElementById(`cell-${r}-${c}`);
      cell.classList.remove('spinning');
      clearInterval(cell._spinInterval);
    }
  }
}

// ─── Win / Error UI ──────────────────────────────────────
function showWin(amount, lines) {
  const msgs = [
    `🏆 YOU WIN $${amount}!`,
    `💰 WINNER! +$${amount}`,
    `🎰 JACKPOT! $${amount}`,
    `✨ BIG WIN $${amount}`
  ];
  winText.textContent = msgs[Math.floor(Math.random() * msgs.length)];
  winBanner.classList.remove('hidden');
}
function hideWin() { winBanner.classList.add('hidden'); }

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.remove('hidden');
}
function hideError() { errorMsg.classList.add('hidden'); }

// ─── Balance display ─────────────────────────────────────
function updateBalanceDisplay(amount) {
  const fmt = `$${amount}`;
  balanceDisplay.textContent  = fmt;
  headerBalAmt.textContent    = fmt;
  balanceDisplay.classList.remove('neon-green');
  void balanceDisplay.offsetWidth; // reflow
  balanceDisplay.classList.add('neon-green');
}

function updateStats(stats) {
  statSpins.textContent = stats.spins;
  statWon.textContent   = `$${stats.total_won}`;
  const rtp = stats.total_bet > 0
    ? Math.round(stats.total_won / stats.total_bet * 100)
    : 0;
  statRTP.textContent = `${rtp}%`;
}

// ─── Reset ───────────────────────────────────────────────
resetBtn.addEventListener('click', () => {
  hideWin();
  hideError();
  buildGrid();
  gameScreen.classList.add('hidden');
  depositScreen.classList.remove('hidden');
  headerBalance.style.display = 'none';
  depositAmtEl.value = '';
  lines = 1; bet = 1;
  updateTotals();
  updateLineIndicators();
  statSpins.textContent = '0';
  statWon.textContent   = '$0';
  statRTP.textContent   = '0%';
  lastWinEl.textContent = '$0';
  netDisplayEl.textContent = '$0';
});

// ─── Confetti ─────────────────────────────────────────────
const canvas = document.getElementById('confettiCanvas');
const ctx    = canvas.getContext('2d');
let confettiParticles = [];
let confettiRunning   = false;

function launchConfetti() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  confettiParticles = [];
  const colors = ['#00ff88','#00c8ff','#ff00cc','#ffd700','#9b59f4','#ff3366'];
  for (let i = 0; i < 140; i++) {
    confettiParticles.push({
      x: Math.random() * canvas.width,
      y: -10,
      r: Math.random() * 7 + 3,
      d: Math.random() * 6 + 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 30 - 15,
      tiltInc: (Math.random() * 0.1) - 0.05
    });
  }
  if (!confettiRunning) {
    confettiRunning = true;
    drawConfetti();
  }
  setTimeout(() => { confettiRunning = false; ctx.clearRect(0, 0, canvas.width, canvas.height); }, 3500);
}

function drawConfetti() {
  if (!confettiRunning) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  confettiParticles.forEach(p => {
    ctx.beginPath();
    ctx.fillStyle = p.color;
    ctx.ellipse(p.x, p.y, p.r / 2, p.r, p.tilt * Math.PI / 180, 0, 2 * Math.PI);
    ctx.fill();

    p.y += p.d * 3.5;
    p.x += Math.sin(p.y * 0.04) * 2;
    p.tilt += p.tiltInc;
    if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width; }
  });
  requestAnimationFrame(drawConfetti);
}

// ─── Sound effects (Web Audio API) ───────────────────────
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new AudioCtx();
  return audioCtx;
}

function playWinSound() {
  try {
    const ac  = getAudioCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type = 'sine';
    const now = ac.currentTime;
    osc.frequency.setValueAtTime(523, now);
    osc.frequency.setValueAtTime(659, now + 0.1);
    osc.frequency.setValueAtTime(784, now + 0.2);
    osc.frequency.setValueAtTime(1047, now + 0.3);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc.start(now); osc.stop(now + 0.8);
  } catch (e) { /* silent fail */ }
}

function playLoseSound() {
  try {
    const ac  = getAudioCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type = 'sawtooth';
    const now = ac.currentTime;
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.start(now); osc.stop(now + 0.4);
  } catch (e) { /* silent fail */ }
}

// ─── Utility ─────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
