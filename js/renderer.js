// ─────────────────────────────────────────────────────
//  js/renderer.js  –  Three.js scene setup & per-frame render
//
//  Responsibilities
//  ─────────────────────────────────────────────────────
//  • Scene / camera / renderer bootstrap
//  • Build maze geometry for each level (walls, floor, goal)
//  • Multicolour spinning ball that looks like it rolls
//  • Per-level colour themes & graffiti text on walls
//  • Minimap (2-D canvas overlay)
//  • Camera modes: Follow / Top / Side / First-Person
// ─────────────────────────────────────────────────────

import * as THREE from 'three';
import { BALL_RADIUS, ballState } from './physics.js';
import { THEMES }                 from './levels.js';

// ── Module-level scene objects ─────────────────────
let renderer, scene, camera;
let ballMesh, goalMesh, wallGroup, floorMesh;
let currentTheme, currentGrid, currentCols, currentRows;

// Minimap
const miniCanvas = document.getElementById('mini');
const mctx       = miniCanvas.getContext('2d');

// Camera yaw for first-person mode
let fpYaw = 0;
export function getFPYaw() { return fpYaw; }
export function rotateFPYaw(delta) { fpYaw -= delta; }

// ── Init ──────────────────────────────────────────

export function initRenderer() {
  const canvas = document.getElementById('game');

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene  = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// ── Build level ────────────────────────────────────

export function buildLevel(grid, levelIndex) {
  // Clear previous objects
  while (scene.children.length) scene.remove(scene.children[0]);

  currentGrid  = grid;
  currentRows  = grid.length;
  currentCols  = grid[0].length;
  currentTheme = THEMES[levelIndex] || THEMES[THEMES.length - 1];
  fpYaw = 0;

  const T = currentTheme;

  // ── Scene background & fog ─────────────────────
  scene.background = new THREE.Color(T.bg);
  if (T.fogColor != null) {
    scene.fog = new THREE.Fog(T.fogColor, T.fogNear, T.fogFar);
  } else {
    scene.fog = null;
  }

  // ── Lights ────────────────────────────────────
  const ambient = new THREE.AmbientLight(T.ambient[0], T.ambient[1]);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(T.sunColor, 1.1);
  sun.position.set(12, 18, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far  = 80;
  sun.shadow.camera.left  = -currentCols;
  sun.shadow.camera.right =  currentCols;
  sun.shadow.camera.top   =  currentRows;
  sun.shadow.camera.bottom = -currentRows;
  scene.add(sun);

  // ── Floor ─────────────────────────────────────
  const floorGeo = new THREE.PlaneGeometry(currentCols, currentRows);
  const floorMat = new THREE.MeshStandardMaterial({ color: T.floorColor, roughness: 0.95 });
  floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.set(currentCols / 2 - 0.5, 0, currentRows / 2 - 0.5);
  floorMesh.receiveShadow = true;
  scene.add(floorMesh);

  // ── Walls ─────────────────────────────────────
  wallGroup = new THREE.Group();
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);

  // Seed random graffiti assignments per-wall
  const graffitiMap = new Map();
  if (T.graffiti && T.graffiti.length > 0) {
    for (let row = 0; row < currentRows; row++) {
      for (let col = 0; col < currentCols; col++) {
        if (grid[row][col] === 1 && Math.random() < 0.28) {
          graffitiMap.set(`${col},${row}`, T.graffiti[Math.floor(Math.random() * T.graffiti.length)]);
        }
      }
    }
  }

  for (let row = 0; row < currentRows; row++) {
    for (let col = 0; col < currentCols; col++) {
      if (grid[row][col] !== 1) continue;

      // Cycle through wall colour palette
      const paletteIdx = (col * 3 + row * 7) % T.wallColors.length;
      const wallColor   = new THREE.Color(T.wallColors[paletteIdx]);
      const wallMat     = new THREE.MeshStandardMaterial({
        color:     wallColor,
        metalness: T.wallMetal,
        roughness: T.wallRough,
      });

      // Graffiti: create a canvas texture painted on the front face
      const grafKey = `${col},${row}`;
      if (graffitiMap.has(grafKey)) {
        const glyph = graffitiMap.get(grafKey);
        const tex   = makeGraffitiTexture(glyph, T.wallColors[paletteIdx]);

        // Build 6-material array: graffiti on front (+z face = index 4), base on rest
        const mats = Array.from({ length: 6 }, (_, i) =>
          i === 4 ? new THREE.MeshStandardMaterial({
            map: tex, metalness: T.wallMetal, roughness: T.wallRough
          }) : wallMat
        );
        const mesh = new THREE.Mesh(boxGeo, mats);
        mesh.position.set(col, 0.5, row);
        mesh.castShadow = mesh.receiveShadow = true;
        wallGroup.add(mesh);
      } else {
        const mesh = new THREE.Mesh(boxGeo, wallMat);
        mesh.position.set(col, 0.5, row);
        mesh.castShadow = mesh.receiveShadow = true;
        wallGroup.add(mesh);
      }
    }
  }
  scene.add(wallGroup);

  // ── Goal puck ─────────────────────────────────
  const goalGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.12, 24);
  const goalMat = new THREE.MeshStandardMaterial({
    color: T.goalColor,
    emissive: T.goalColor,
    emissiveIntensity: 0.6,
    metalness: 0.5, roughness: 0.3,
  });
  goalMesh = new THREE.Mesh(goalGeo, goalMat);

  // Find goal position
  for (let row = 0; row < currentRows; row++) {
    for (let col = 0; col < currentCols; col++) {
      if (grid[row][col] === 3) {
        goalMesh.position.set(col, 0.06, row);
      }
    }
  }
  scene.add(goalMesh);

  // ── Ball ──────────────────────────────────────
  ballMesh = buildBallMesh(T.ballColors);
  ballMesh.castShadow = true;
  scene.add(ballMesh);
}

// ── Graffiti texture helper ────────────────────────

function makeGraffitiTexture(glyph, bgHex) {
  const SIZE = 128;
  const oc   = document.createElement('canvas');
  oc.width = oc.height = SIZE;
  const oc2 = oc.getContext('2d');

  // Background matches wall colour
  oc2.fillStyle = bgHex;
  oc2.fillRect(0, 0, SIZE, SIZE);

  // Random spray-paint drip lines for that graffiti look
  oc2.globalAlpha = 0.18;
  for (let i = 0; i < 5; i++) {
    const x = Math.random() * SIZE;
    oc2.strokeStyle = '#fff';
    oc2.lineWidth   = 1 + Math.random() * 2;
    oc2.beginPath();
    oc2.moveTo(x, 0);
    oc2.lineTo(x + (Math.random() - 0.5) * 20, SIZE);
    oc2.stroke();
  }
  oc2.globalAlpha = 1;

  // Glyph
  oc2.font         = `bold ${Math.floor(SIZE * 0.58)}px Segoe UI, Arial`;
  oc2.textAlign    = 'center';
  oc2.textBaseline = 'middle';
  // Outer "spray" blur
  oc2.shadowColor  = '#fff';
  oc2.shadowBlur   = 8;
  oc2.fillStyle    = 'rgba(255,255,255,0.9)';
  oc2.fillText(glyph, SIZE / 2, SIZE / 2);
  oc2.shadowBlur   = 0;

  const tex = new THREE.CanvasTexture(oc);
  tex.needsUpdate = true;
  return tex;
}

// ── Multicolour ball ──────────────────────────────

function buildBallMesh(colors) {
  const geo  = new THREE.SphereGeometry(BALL_RADIUS, 32, 32);
  // We'll paint stripes via a canvas texture so they visibly spin
  const SIZE = 256;
  const bc   = document.createElement('canvas');
  bc.width = bc.height = SIZE;
  const bctx = bc.getContext('2d');

  const stripeW = SIZE / colors.length;
  colors.forEach((col, i) => {
    bctx.fillStyle = col;
    bctx.fillRect(i * stripeW, 0, stripeW, SIZE);
  });

  // Fade edges to simulate sphere curvature
  const grad = bctx.createRadialGradient(SIZE/2, SIZE/2, SIZE*0.1, SIZE/2, SIZE/2, SIZE/2);
  grad.addColorStop(0,   'rgba(255,255,255,0.18)');
  grad.addColorStop(0.7, 'rgba(0,0,0,0)');
  grad.addColorStop(1,   'rgba(0,0,0,0.35)');
  bctx.fillStyle = grad;
  bctx.fillRect(0, 0, SIZE, SIZE);

  const ballTex = new THREE.CanvasTexture(bc);
  ballTex.wrapS = ballTex.wrapT = THREE.RepeatWrapping;

  const mat = new THREE.MeshStandardMaterial({
    map:       ballTex,
    metalness: 0.7,
    roughness: 0.25,
  });

  return new THREE.Mesh(geo, mat);
}

// ── Per-frame render ───────────────────────────────

export function renderFrame(dt, camMode, pointerHeld) {
  if (!renderer) return;

  const bx = ballState.x, bz = ballState.z;

  // ── Animate ball ────────────────────────────────
  ballMesh.position.set(bx, BALL_RADIUS, bz);
  // Rolling rotation derived from velocity + spin angle
  ballMesh.rotation.x += ballState.vz * dt * 4;
  ballMesh.rotation.z -= ballState.vx * dt * 4;
  // Extra texture spin so stripes visibly rotate
  if (ballMesh.material.map) {
    ballMesh.material.map.offset.x = (ballState.spin * 0.08) % 1;
    ballMesh.material.map.needsUpdate = true;
  }

  // ── Animate goal ────────────────────────────────
  if (goalMesh) goalMesh.rotation.y += dt * 1.4;

  // ── Camera ──────────────────────────────────────
  updateCamera(camMode, bx, bz, dt, pointerHeld);

  // ── Minimap ──────────────────────────────────────
  drawMinimap(bx, bz);

  // ── Render ──────────────────────────────────────
  renderer.render(scene, camera);
}

function updateCamera(mode, bx, bz, dt, pointerHeld) {
  const size = Math.max(currentCols, currentRows);

  if (mode === 'top') {
    camera.position.set(bx, size * 1.1, bz + 0.001);
    camera.lookAt(bx, 0, bz);

  } else if (mode === 'side') {
    camera.position.set(bx + size * 0.7, 5, bz);
    camera.lookAt(bx, 0, bz);

  } else if (mode === 'follow') {
    // Smooth follow with slight lag
    const tx = bx - ballState.vx * 2;
    const tz = bz - ballState.vz * 2;
    camera.position.lerp(new THREE.Vector3(tx, 4.5, tz + 4.5), 0.09);
    camera.lookAt(bx, 0, bz);

  } else {
    // First-person
    camera.position.set(bx, BALL_RADIUS * 1.7, bz);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = fpYaw;
    camera.rotation.x = 0;
    ballMesh.visible = false;
    return;
  }

  ballMesh.visible = true;
}

// ── 2-D minimap ───────────────────────────────────

function drawMinimap(bx, bz) {
  const W = miniCanvas.width, H = miniCanvas.height;
  const sx = W / currentCols, sy = H / currentRows;

  mctx.clearRect(0, 0, W, H);

  // Draw walls
  mctx.fillStyle = '#0a2';
  for (let row = 0; row < currentRows; row++) {
    for (let col = 0; col < currentCols; col++) {
      if (currentGrid[row][col] === 1) mctx.fillRect(col*sx, row*sy, sx, sy);
    }
  }

  // Goal marker
  mctx.fillStyle = '#ffd700';
  for (let row = 0; row < currentRows; row++) {
    for (let col = 0; col < currentCols; col++) {
      if (currentGrid[row][col] === 3) {
        mctx.beginPath();
        mctx.arc(col*sx + sx/2, row*sy + sy/2, 3, 0, Math.PI * 2);
        mctx.fill();
      }
    }
  }

  // Ball marker
  mctx.fillStyle = '#fff';
  mctx.beginPath();
  mctx.arc(bx * sx, bz * sy, 3.5, 0, Math.PI * 2);
  mctx.fill();
}

export { scene, camera };
