// ─────────────────────────────────────────────────────
//  js/input.js  –  All input handling
//
//  Exports a single `inputState` object that game.js reads
//  each frame to determine force direction and boost.
//
//  Supported input sources
//  ─────────────────────────────────────────────────────
//  • Keyboard  – Arrow keys / WASD
//  • Touch drag – smooth proportional tilt up to maxDrag px
//  • Mouse drag – same as touch (for desktop testing)
//  • Device orientation (gyroscope) – tilt to roll
//  • Double-tap / double-click + hold → speed boost
//  • First-person pointer-move → camera yaw
// ─────────────────────────────────────────────────────

import { rotateFPYaw } from './renderer.js';

export const inputState = {
  fx:    0,   // total force X  (-1 .. 1)
  fz:    0,   // total force Z  (-1 .. 1)
  boost: false,
  // Raw booleans exposed for game.js sound/timer logic
  anyKey: false,
};

// ── Internal state ─────────────────────────────────
const keys = {};

let tiltX = 0, tiltZ = 0;         // from gyro or drag

let isDragging   = false;
let dragStartX   = 0, dragStartY = 0;

let lastTapTime  = 0;
let boostHeld    = false;
const DOUBLE_TAP_MS = 350;
const MAX_DRAG_PX   = 75;

// ── Keyboard ───────────────────────────────────────
window.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (e.key.startsWith('Arrow') || 'wasdWASD'.includes(e.key)) e.preventDefault();
});
window.addEventListener('keyup',   e => { keys[e.key] = false; });

// ── Drag helpers ───────────────────────────────────
function startDrag(cx, cy) {
  isDragging = true;
  dragStartX = cx; dragStartY = cy;

  const now = Date.now();
  if (now - lastTapTime < DOUBLE_TAP_MS) { boostHeld = true; }
  lastTapTime = now;
}
function moveDrag(cx, cy) {
  if (!isDragging) return;
  const dx = cx - dragStartX;
  const dy = cy - dragStartY;
  tiltX = Math.max(-1, Math.min(1, dx / MAX_DRAG_PX));
  tiltZ = Math.max(-1, Math.min(1, dy / MAX_DRAG_PX));
}
function endDrag() {
  isDragging = false;
  tiltX = 0; tiltZ = 0;
  boostHeld = false;
}

// ── Touch ──────────────────────────────────────────
const gc = document.getElementById('game');

gc.addEventListener('touchstart', e => {
  e.preventDefault();
  startDrag(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });

gc.addEventListener('touchmove', e => {
  e.preventDefault();
  moveDrag(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });

gc.addEventListener('touchend', e => {
  e.preventDefault();
  if (e.touches.length === 0) endDrag();
}, { passive: false });

// ── Mouse ──────────────────────────────────────────
gc.addEventListener('mousedown', e => {
  startDrag(e.clientX, e.clientY);
  // First-person drag yaw starts here – handled in mousemove
});
window.addEventListener('mousemove', e => {
  moveDrag(e.clientX, e.clientY);
  // First-person: rotate camera yaw while dragging
  if (e.buttons && document.getElementById('cam').value === 'first') {
    rotateFPYaw(e.movementX * 0.004);
  }
});
window.addEventListener('mouseup',    () => endDrag());
window.addEventListener('mouseleave', () => endDrag());

// ── Gyroscope ──────────────────────────────────────
function handleOrientation(e) {
  if (isDragging) return;              // drag takes priority
  tiltX = Math.max(-1, Math.min(1, (e.gamma || 0) / 25));
  tiltZ = Math.max(-1, Math.min(1, (e.beta  || 0) / 25));
}

const tiltBtn = document.getElementById('tiltBtn');
if ('ondeviceorientation' in window) tiltBtn.style.display = 'inline-block';

function enableTilt() {
  if (typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission().then(p => {
      if (p === 'granted') {
        window.addEventListener('deviceorientation', handleOrientation);
        tiltBtn.style.display = 'none';
      }
    });
  } else {
    window.addEventListener('deviceorientation', handleOrientation);
    tiltBtn.style.display = 'none';
  }
}
tiltBtn.onclick = enableTilt;

// ── Per-frame update (called by game.js) ───────────
export function pollInput() {
  let fx = tiltX, fz = tiltZ;

  if (keys['ArrowLeft']  || keys['a'] || keys['A']) fx -= 1;
  if (keys['ArrowRight'] || keys['d'] || keys['D']) fx += 1;
  if (keys['ArrowUp']    || keys['w'] || keys['W']) fz -= 1;
  if (keys['ArrowDown']  || keys['s'] || keys['S']) fz += 1;

  // Normalise diagonal
  const mag = Math.sqrt(fx * fx + fz * fz);
  if (mag > 1) { fx /= mag; fz /= mag; }

  inputState.fx    = fx;
  inputState.fz    = fz;
  inputState.boost = boostHeld;
  inputState.anyKey = mag > 0.05;

  // Sync boost badge visibility
  document.getElementById('boost-badge').classList.toggle('hidden', !boostHeld);
}
