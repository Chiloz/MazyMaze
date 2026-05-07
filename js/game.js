// ─────────────────────────────────────────────────────
//  js/game.js  –  Game loop, state machine, level flow
//
//  This is the top-level module that wires everything
//  together.  Import order handled by index.html.
// ─────────────────────────────────────────────────────

import { initRenderer, buildLevel, renderFrame } from './renderer.js';
import { ballState, updatePhysics, resetBall }   from './physics.js';
import { pollInput, inputState }                  from './input.js';
import { LEVELS, THEMES }                         from './levels.js';

// ── DOM references ─────────────────────────────────
const levelEl    = document.getElementById('level');
const timeEl     = document.getElementById('time');
const winEl      = document.getElementById('win');
const winStats   = document.getElementById('win-stats');
const continueBtn = document.getElementById('continueBtn');
const resetBtn   = document.getElementById('resetBtn');
const nextBtn    = document.getElementById('nextBtn');
const camSel     = document.getElementById('cam');
const themeLabel = document.getElementById('theme-label');

// ── Game state ─────────────────────────────────────
let currentLevel = 0;
let grid, cols, rows;
let startX = 0, startZ = 0;

let running     = false;   // physics active
let timerActive = false;   // only starts on first ball movement
let timerStart  = 0;
let timerElapsed = 0;

// ── Audio ──────────────────────────────────────────
let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playBump(intensity = 0.7) {
  ensureAudio();
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(200, audioCtx.currentTime);
  o.frequency.exponentialRampToValueAtTime(70, audioCtx.currentTime + 0.07);
  g.gain.setValueAtTime(0.22 * intensity, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.07);
  o.connect(g).connect(audioCtx.destination);
  o.start();
  o.stop(audioCtx.currentTime + 0.08);
  if (navigator.vibrate) navigator.vibrate(20);
}

function playWin() {
  ensureAudio();
  [523, 659, 784, 1047].forEach((freq, i) => {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.18, audioCtx.currentTime + i * 0.12);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.12 + 0.25);
    o.connect(g).connect(audioCtx.destination);
    o.start(audioCtx.currentTime + i * 0.12);
    o.stop(audioCtx.currentTime + i * 0.12 + 0.26);
  });
}

// ── Level management ───────────────────────────────

function loadLevel(index) {
  currentLevel = index;
  grid = LEVELS[index];
  rows = grid.length;
  cols = grid[0].length;

  // Find start position
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 2) { startX = c; startZ = r; }
    }
  }

  // Reset ball to start
  resetBall(startX + 0.5, startZ + 0.5);

  // Build Three.js scene
  buildLevel(grid, index);

  // Update HUD
  levelEl.textContent = index + 1;
  const theme = THEMES[index] || THEMES[THEMES.length - 1];
  themeLabel.textContent = theme.name;

  // Reset timer (starts only on first movement)
  timerActive  = false;
  timerElapsed = 0;
  timeEl.textContent = '0.0';

  // Hide win screen & next button
  winEl.hidden = true;
  nextBtn.hidden = true;

  running = true;
}

// ── Win detection ──────────────────────────────────

function checkWin() {
  const gx = Math.floor(ballState.x);
  const gz = Math.floor(ballState.z);
  if (gx < 0 || gz < 0 || gx >= cols || gz >= rows) return;
  if (grid[gz][gx] === 3) {
    running = false;
    if (timerActive) timerElapsed = (performance.now() - timerStart) / 1000;
    playWin();
    winStats.textContent = `Time: ${timerElapsed.toFixed(1)}s  ·  Level ${currentLevel + 1}`;
    winEl.hidden = false;
    if (currentLevel < LEVELS.length - 1) nextBtn.hidden = false;
  }
}

// ── Main loop ──────────────────────────────────────

let lastTimestamp = 0;

function loop(timestamp) {
  requestAnimationFrame(loop);

  const dt = Math.min(0.033, (timestamp - lastTimestamp) / 1000);
  lastTimestamp = timestamp;

  // Input
  pollInput();

  if (running) {
    // Start timer on first actual movement
    if (!timerActive && inputState.anyKey) {
      timerActive = true;
      timerStart  = performance.now();
    }

    // Update elapsed display
    if (timerActive) {
      timerElapsed = (performance.now() - timerStart) / 1000;
      timeEl.textContent = timerElapsed.toFixed(1);
    }

    // Physics (returns true if ball bounced this frame)
    const bounced = updatePhysics(
      dt,
      { x: inputState.fx, z: inputState.fz },
      inputState.boost,
      grid, cols, rows
    );
    if (bounced) playBump(0.7);

    // Win check
    checkWin();
  }

  // Render (always runs so camera still responds when paused)
  renderFrame(dt, camSel.value, false);
}

// ── Button handlers ────────────────────────────────

resetBtn.onclick = () => {
  ensureAudio();
  loadLevel(currentLevel);
};

nextBtn.onclick = () => {
  ensureAudio();
  winEl.hidden = true;
  loadLevel(currentLevel + 1);
};

continueBtn.onclick = () => {
  ensureAudio();
  const next = currentLevel < LEVELS.length - 1 ? currentLevel + 1 : 0;
  loadLevel(next);
};

// Allow clicking game canvas to unlock audio
document.getElementById('game').addEventListener('pointerdown', ensureAudio);

// ── Boot ───────────────────────────────────────────

export function initGame() {
  initRenderer();
  loadLevel(0);
  requestAnimationFrame(loop);
}
