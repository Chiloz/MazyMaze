// ─────────────────────────────────────────────────────
//  js/levels.js  –  Level maps + per-level visual themes
//
//  Map values:  0 = open floor   1 = wall   2 = start   3 = goal
//
//  Theme fields
//  ─────────────────────────────────────────────────────
//  name         Display name shown in theme-label
//  bg           THREE.Color hex  – scene background
//  ambient      [hex, intensity] – ambient light
//  sunColor     hex              – directional light colour
//  floorColor   hex              – floor mesh colour
//  wallColors   array of hex     – cycled per-wall (enables multi-colour walls)
//  wallMetal    0–1 metalness
//  wallRough    0–1 roughness
//  goalColor    hex              – goal puck colour
//  ballColors   array of hex     – stripe colours on the rolling ball
//  graffiti     array of strings – emoji / text painted on walls (null = none)
//  fogColor     hex | null       – THREE.Fog colour (null = no fog)
//  fogNear/Far  numbers          – fog distances
// ─────────────────────────────────────────────────────

export const THEMES = [
  /* 0 – Dungeon ──────────────────────────────────── */
  {
    name: 'Dungeon',
    bg: 0x041008, ambient: [0xafffC0, 0.55], sunColor: 0xffffff,
    floorColor: 0x0c2e18,
    wallColors: ['#1c8c3e'],
    wallMetal: 0.15, wallRough: 0.6,
    goalColor: 0xffd700,
    ballColors: ['#ff4757','#ffa502','#2ed573','#1e90ff','#a29bfe','#fd79a8'],
    graffiti: null,
    fogColor: null,
  },
  /* 1 – Forest ───────────────────────────────────── */
  {
    name: 'Forest',
    bg: 0x020d04, ambient: [0x88ffaa, 0.6], sunColor: 0xd4ff99,
    floorColor: 0x071a0a,
    wallColors: ['#2d6a4f','#1b4332','#40916c'],
    wallMetal: 0.05, wallRough: 0.9,
    goalColor: 0x95d5b2,
    ballColors: ['#74c69d','#52b788','#40916c','#2d6a4f','#95d5b2','#b7e4c7'],
    graffiti: ['🌿','🍃','🌱','🍀'],
    fogColor: 0x020d04, fogNear: 8, fogFar: 22,
  },
  /* 2 – Lava ─────────────────────────────────────── */
  {
    name: 'Lava',
    bg: 0x1a0500, ambient: [0xff6030, 0.5], sunColor: 0xff4400,
    floorColor: 0x1a0500,
    wallColors: ['#7a1f02','#c1440e','#4a1000','#e85d04'],
    wallMetal: 0.3, wallRough: 0.5,
    goalColor: 0xff6b35,
    ballColors: ['#ff4500','#ff6b35','#ff9f1c','#ffbf69','#ff4500','#cc3200'],
    graffiti: ['🔥','💥','♨'],
    fogColor: 0x1a0500, fogNear: 6, fogFar: 18,
  },
  /* 3 – Neon City ─────────────────────────────────── */
  {
    name: 'Neon City',
    bg: 0x0d0020, ambient: [0xcc88ff, 0.4], sunColor: 0xff00ff,
    floorColor: 0x0d0020,
    wallColors: ['#6a0dad','#9b5de5','#3d0070','#c77dff','#e040fb'],
    wallMetal: 0.7, wallRough: 0.2,
    goalColor: 0xff00ff,
    ballColors: ['#ff00ff','#c77dff','#9b5de5','#7b2fff','#00f5ff','#ff006e'],
    graffiti: ['★','◆','▲','✦','⬟'],
    fogColor: null,
  },
  /* 4 – Arctic ────────────────────────────────────── */
  {
    name: 'Arctic',
    bg: 0x1a2e3d, ambient: [0xc8ecff, 0.75], sunColor: 0xd4eeff,
    floorColor: 0x1e3a50,
    wallColors: ['#5ba4cf','#a8d8ea','#2d7db3','#bee9fb'],
    wallMetal: 0.1, wallRough: 0.3,
    goalColor: 0x00bfff,
    ballColors: ['#ffffff','#a8d8ea','#00bfff','#90e0ef','#caf0f8','#0077b6'],
    graffiti: ['❄','✦','❅','☃'],
    fogColor: 0x1a2e3d, fogNear: 10, fogFar: 28,
  },
  /* 5 – Graffiti Alley ────────────────────────────── */
  {
    name: 'Graffiti Alley',
    bg: 0x111111, ambient: [0xffffff, 0.5], sunColor: 0xffffff,
    floorColor: 0x1c1c1c,
    wallColors: ['#e63946','#2a9d8f','#e9c46a','#6930c3','#f72585','#4cc9f0'],
    wallMetal: 0.0, wallRough: 1.0,
    goalColor: 0xffe600,
    ballColors: ['#e63946','#f72585','#4cc9f0','#7bf1a8','#ffe600','#ff9f1c'],
    graffiti: ['✊','⚡','💣','🎨','👊','🔴','💀','🖌'],
    fogColor: null,
  },
  /* 6 – Sunset ────────────────────────────────────── */
  {
    name: 'Sunset',
    bg: 0x1a0b05, ambient: [0xff9966, 0.6], sunColor: 0xff6030,
    floorColor: 0x2c1810,
    wallColors: ['#ff6b6b','#c0392b','#ff9f43','#ee5a24','#fd7272'],
    wallMetal: 0.1, wallRough: 0.7,
    goalColor: 0xff9f43,
    ballColors: ['#ff6b6b','#ff9f43','#ffd32a','#ff4757','#eccc68','#ff6348'],
    graffiti: ['🌅','☀','🌇','🌤'],
    fogColor: 0x1a0b05, fogNear: 9, fogFar: 24,
  },
  /* 7 – Cyber ─────────────────────────────────────── */
  {
    name: 'Cyber',
    bg: 0x001a0e, ambient: [0x00ff9f, 0.45], sunColor: 0x00ff9f,
    floorColor: 0x001a0e,
    wallColors: ['#00ff9f','#00a86b','#006644','#00ffcc','#39ff14'],
    wallMetal: 0.8, wallRough: 0.15,
    goalColor: 0x00ff9f,
    ballColors: ['#00ff9f','#39ff14','#00ffcc','#00f5ff','#7fff00','#00ff9f'],
    graffiti: ['01','//','>>','{}','</>','404'],
    fogColor: null,
  },
  /* 8 – Sky Garden ────────────────────────────────── */
  {
    name: 'Sky Garden',
    bg: 0x0a1f30, ambient: [0xffeeaa, 0.65], sunColor: 0xfff176,
    floorColor: 0x1a2e0a,
    wallColors: ['#f9c74f','#f3722c','#f8961e','#90be6d','#43aa8b'],
    wallMetal: 0.05, wallRough: 0.8,
    goalColor: 0xf9c74f,
    ballColors: ['#f9c74f','#f8961e','#f3722c','#90be6d','#43aa8b','#577590'],
    graffiti: ['🌸','🦋','🌺','🌻','🌼'],
    fogColor: 0x0a1f30, fogNear: 11, fogFar: 26,
  },
  /* 9 – Final: The Void ───────────────────────────── */
  {
    name: 'The Void',
    bg: 0x0a000f, ambient: [0xcc00ff, 0.35], sunColor: 0xff80ff,
    floorColor: 0x0a000f,
    wallColors: ['#e040fb','#6a0080','#b300ff','#ff00de','#7b00ff','#c000ff'],
    wallMetal: 0.9, wallRough: 0.1,
    goalColor: 0xff80ff,
    ballColors: ['#e040fb','#ff80ff','#b300ff','#ff00de','#ffffff','#7b00ff'],
    graffiti: ['∞','Ω','✦','◉','⟁','⬡'],
    fogColor: 0x0a000f, fogNear: 5, fogFar: 16,
  },
];

// ── Hand-crafted maps for levels 1–4, auto-generated for 5–10 ──

function genMaze(w, h) {
  const g = Array.from({ length: h }, () => Array(w).fill(1));
  function carve(x, y) {
    g[y][x] = 0;
    [[ 2,0],[-2,0],[0, 2],[0,-2]]
      .sort(() => Math.random() - .5)
      .forEach(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        if (nx > 0 && nx < w-1 && ny > 0 && ny < h-1 && g[ny][nx] === 1) {
          g[y + dy/2][x + dx/2] = 0;
          carve(nx, ny);
        }
      });
  }
  carve(1, 1);
  g[1][1] = 2;
  g[h-2][w-2] = 3;
  return g;
}

const HAND_CRAFTED = [
  // Level 1 – simple intro
  [[1,1,1,1,1,1,1,1],
   [1,2,0,0,1,0,3,1],
   [1,0,1,0,1,0,1,1],
   [1,0,1,0,0,0,0,1],
   [1,0,1,1,1,1,0,1],
   [1,0,0,0,0,1,0,1],
   [1,1,1,0,0,0,0,1],
   [1,1,1,1,1,1,1,1]],

  // Level 2
  [[1,1,1,1,1,1,1,1,1],
   [1,2,0,1,0,0,0,0,1],
   [1,0,0,1,0,1,1,0,1],
   [1,0,1,1,0,1,3,0,1],
   [1,0,0,0,0,1,1,0,1],
   [1,1,1,1,0,0,0,0,1],
   [1,0,0,0,0,1,1,1,1],
   [1,0,1,1,0,0,0,0,1],
   [1,1,1,1,1,1,1,1,1]],

  // Level 3
  [[1,1,1,1,1,1,1,1,1,1],
   [1,2,0,0,0,1,0,0,0,1],
   [1,1,1,1,0,1,0,1,0,1],
   [1,0,0,0,0,1,0,1,0,1],
   [1,0,1,1,1,1,0,1,0,1],
   [1,0,0,0,0,0,0,1,0,1],
   [1,1,1,1,1,1,0,1,0,1],
   [1,0,0,0,0,0,0,0,0,1],
   [1,0,1,1,1,1,1,1,3,1],
   [1,1,1,1,1,1,1,1,1,1]],

  // Level 4
  [[1,1,1,1,1,1,1,1,1,1,1],
   [1,2,0,0,1,0,0,0,1,0,1],
   [1,0,1,0,1,0,1,0,1,0,1],
   [1,0,1,0,0,0,1,0,0,0,1],
   [1,0,1,1,1,1,1,1,1,0,1],
   [1,0,0,0,0,0,0,0,1,0,1],
   [1,1,1,1,1,0,1,0,1,0,1],
   [1,0,0,0,1,0,1,0,1,0,1],
   [1,0,1,0,1,0,1,0,1,3,1],
   [1,0,1,0,0,0,1,0,0,0,1],
   [1,1,1,1,1,1,1,1,1,1,1]],
];

// Build full LEVELS array (hand-crafted + generated)
export const LEVELS = [...HAND_CRAFTED];
while (LEVELS.length < 10) {
  const s = 13 + (LEVELS.length - 4) * 2;
  LEVELS.push(genMaze(s, s));
}
