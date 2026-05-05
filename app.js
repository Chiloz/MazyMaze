// Marble Maze - 10 levels, keyboard + tilt, sound + haptics
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const levelEl = document.getElementById('level');
const timeEl = document.getElementById('time');
const resetBtn = document.getElementById('resetBtn');
const nextBtn = document.getElementById('nextBtn');
const tiltBtn = document.getElementById('tiltBtn');
const winScreen = document.getElementById('winScreen');
const winText = document.getElementById('winText');
const continueBtn = document.getElementById('continueBtn');

let audioCtx;
function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}
function playBump(intensity=1) {
  initAudio();
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(180 + Math.random()*40, audioCtx.currentTime);
  o.frequency.exponentialRampToValueAtTime(60, audioCtx.currentTime + 0.08);
  g.gain.setValueAtTime(0.3*intensity, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
  o.connect(g).connect(audioCtx.destination);
  o.start(); o.stop(audioCtx.currentTime + 0.09);
  if (navigator.vibrate) navigator.vibrate(20 + intensity*30);
}
let rollNode, rollGain;
function startRoll() {
  initAudio();
  if (rollNode) return;
  const bufferSize = 2 * audioCtx.sampleRate;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const output = buffer.getChannelData(0);
  for (let i=0;i<bufferSize;i++) output[i] = Math.random()*2-1;
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 300;
  rollGain = audioCtx.createGain();
  rollGain.gain.value = 0;
  noise.connect(filter).connect(rollGain).connect(audioCtx.destination);
  noise.start();
  rollNode = noise;
}
function setRollVolume(v) {
  if (rollGain) rollGain.gain.value = Math.min(0.15, v*0.15);
}
function stopRoll() {
  if (rollNode) { try { rollNode.stop(); } catch{} rollNode = null; }
}

// Levels: 1=wall,0=path,2=start,3=goal
const LEVELS = [
  // 1
  [
    [1,1,1,1,1,1,1,1],
    [1,2,0,0,1,0,3,1],
    [1,0,1,0,1,0,1,1],
    [1,0,1,0,0,0,0,1],
    [1,0,1,1,1,1,0,1],
    [1,0,0,0,0,1,0,1],
    [1,1,1,0,0,0,0,1],
    [1,1,1,1,1,1,1,1],
  ],
  // 2
  [
    [1,1,1,1,1,1,1,1,1],
    [1,2,0,1,0,0,0,0,1],
    [1,0,0,1,0,1,1,0,1],
    [1,0,1,1,0,1,3,0,1],
    [1,0,0,0,0,1,1,0,1],
    [1,1,1,1,0,0,0,0,1],
    [1,0,0,0,0,1,1,1,1],
    [1,0,1,1,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1],
  ],
  // 3
  [
    [1,1,1,1,1,1,1,1,1,1],
    [1,2,0,0,0,1,0,0,0,1],
    [1,1,1,1,0,1,0,1,0,1],
    [1,0,0,0,0,1,0,1,0,1],
    [1,0,1,1,1,1,0,1,0,1],
    [1,0,0,0,0,0,0,1,0,1],
    [1,1,1,1,1,1,0,1,0,1],
    [1,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,1,1,3,1],
    [1,1,1,1,1,1,1,1,1,1],
  ],
  // 4
  [
    [1,1,1,1,1,1,1,1,1,1,1],
    [1,2,0,0,1,0,0,0,1,0,1],
    [1,0,1,0,1,0,1,0,1,0,1],
    [1,0,1,0,0,0,1,0,0,0,1],
    [1,0,1,1,1,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,1,0,1],
    [1,1,1,1,1,0,1,0,1,0,1],
    [1,0,0,0,1,0,1,0,1,0,1],
    [1,0,1,0,1,0,1,0,1,3,1],
    [1,0,1,0,0,0,1,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1],
  ],
  // 5
  [
    [1,1,1,1,1,1,1,1,1,1,1,1],
    [1,2,0,1,0,0,0,1,0,0,0,1],
    [1,0,0,1,0,1,0,1,0,1,0,1],
    [1,1,0,1,0,1,0,0,0,1,0,1],
    [1,0,0,0,0,1,1,1,1,1,0,1],
    [1,0,1,1,1,1,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,1,1,1,1,1],
    [1,1,1,1,1,1,0,1,0,0,3,1],
    [1,0,0,0,0,1,0,1,0,1,1,1],
    [1,0,1,1,0,1,0,0,0,0,0,1],
    [1,0,0,1,0,1,1,1,1,1,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1],
  ],
  // 6-10 progressively harder (generated variations)
];
while (LEVELS.length < 10) {
  const size = 12 + LEVELS.length;
  const m = Array.from({length:size}, (_,y)=>Array.from({length:size}, (_,x)=> (x===0||y===0||x===size-1||y===size-1)?1:0));
  for (let i=0;i<size*1.5;i++){ const x=2+Math.floor(Math.random()*(size-4)); const y=2+Math.floor(Math.random()*(size-4)); m[y][x]=1; }
  m[1][1]=2; m[size-2][size-2]=3;
  LEVELS.push(m);
}

let currentLevel = 0;
let grid, cols, rows, cell;
let ball = {x:0,y:0,vx:0,vy:0,r:0};
let keys = {};
let tilt = {x:0,y:0};
let startTime = 0;
let running = false;

function loadLevel(n) {
  grid = LEVELS[n].map(r=>[...r]);
  rows = grid.length; cols = grid[0].length;
  const size = Math.min(canvas.width, canvas.height);
  cell = Math.floor(size / Math.max(cols, rows));
  canvas.width = cell*cols; canvas.height = cell*rows;
  for (let y=0;y<rows;y++) for (let x=0;x<cols;x++) if (grid[y][x]===2){ ball.x = x+0.5; ball.y = y+0.5; }
  ball.vx=0; ball.vy=0; ball.r = cell*0.35;
  levelEl.textContent = n+1;
  startTime = performance.now();
  running = true;
  nextBtn.hidden = true;
}

function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  // maze
  for (let y=0;y<rows;y++) for (let x=0;x<cols;x++) {
    const v = grid[y][x];
    if (v===1) { ctx.fillStyle='#1a7f37'; ctx.fillRect(x*cell,y*cell,cell,cell); }
    else if (v===3) { ctx.fillStyle='#ffd700'; ctx.beginPath(); ctx.arc((x+0.5)*cell,(y+0.5)*cell,cell*0.3,0,Math.PI*2); ctx.fill(); }
  }
  // ball shadow
  ctx.fillStyle='rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.arc(ball.x*cell+2, ball.y*cell+3, ball.r,0,Math.PI*2); ctx.fill();
  // ball
  const grad = ctx.createRadialGradient(ball.x*cell-3, ball.y*cell-4, 2, ball.x*cell, ball.y*cell, ball.r);
  grad.addColorStop(0,'#f0f0f0'); grad.addColorStop(1,'#888');
  ctx.fillStyle=grad;
  ctx.beginPath(); ctx.arc(ball.x*cell, ball.y*cell, ball.r,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.stroke();
}

function update(dt) {
  if (!running) return;
  const ax = (keys.ArrowLeft?-1:0)+(keys.ArrowRight?1:0)+tilt.x;
  const ay = (keys.ArrowUp?-1:0)+(keys.ArrowDown?1:0)+tilt.y;
  ball.vx += ax * dt * 6;
  ball.vy += ay * dt * 6;
  ball.vx *= 0.92; ball.vy *= 0.92;
  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed>0.02) { startRoll(); setRollVolume(speed); } else { setRollVolume(0); }
  
  let nx = ball.x + ball.vx*dt;
  let ny = ball.y + ball.vy*dt;
  
  // collision
  const check = (x,y) => {
    const gx = Math.floor(x), gy = Math.floor(y);
    return gx<0||gy<0||gx>=cols||gy>=rows || grid[gy][gx]===1;
  };
  if (check(nx, ball.y)) { ball.vx *= -0.4; nx = ball.x; playBump(Math.min(1, Math.abs(ball.vx))); }
  if (check(ball.x, ny)) { ball.vy *= -0.4; ny = ball.y; playBump(Math.min(1, Math.abs(ball.vy))); }
  ball.x = nx; ball.y = ny;
  
  const gx = Math.floor(ball.x), gy = Math.floor(ball.y);
  if (grid[gy] && grid[gy][gx]===3) winLevel();
  
  timeEl.textContent = ((performance.now()-startTime)/1000).toFixed(1);
}

function winLevel() {
  running = false; stopRoll(); playBump(1.2);
  if (currentLevel === 9) {
    winScreen.hidden = false;
    winText.textContent = `You completed all 10 levels in ${timeEl.textContent}s!`;
    continueBtn.textContent = 'Play Again';
  } else {
    nextBtn.hidden = false;
  }
}

let last=0;
function loop(t) {
  const dt = Math.min(0.033, (t-last)/1000); last=t;
  update(dt); draw(); requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

window.addEventListener('keydown', e=>{ if(e.key.startsWith('Arrow')){ keys[e.key]=true; e.preventDefault(); initAudio(); }});
window.addEventListener('keyup', e=>{ keys[e.key]=false; });

resetBtn.onclick = ()=> loadLevel(currentLevel);
nextBtn.onclick = ()=> { currentLevel++; loadLevel(currentLevel); };
continueBtn.onclick = ()=> { winScreen.hidden=true; currentLevel=0; loadLevel(0); };

// Tilt
function enableTilt() {
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission().then(p=>{ if(p==='granted'){ window.addEventListener('deviceorientation', handleTilt); tiltBtn.style.display='none'; }});
  } else {
    window.addEventListener('deviceorientation', handleTilt);
    tiltBtn.style.display='none';
  }
}
function handleTilt(e) {
  initAudio();
  const gamma = e.gamma || 0; // left-right
  const beta = e.beta || 0;   // front-back
  tilt.x = Math.max(-1, Math.min(1, gamma/20));
  tilt.y = Math.max(-1, Math.min(1, beta/20));
}
if ('ondeviceorientation' in window) tiltBtn.style.display='inline-block';
tiltBtn.onclick = enableTilt;

// PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', ()=> navigator.serviceWorker.register('./sw.js'));
}

// start
loadLevel(0);
